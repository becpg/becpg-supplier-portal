/**
 * `POST /api/v1/process/start` — start an **authorised** process.
 *
 * Proxy onto `becpg/supplier/send-to-supplier` (`SupplierPortalWebScript`,
 * contracts §7), which creates a supplier project from a project template and
 * an entity.
 *
 * ## Why there is an allow-list here
 *
 * The webscript takes an arbitrary `tplNodeRef` and instantiates it. Left open,
 * a supplier could start *any* project template of the repository — an internal
 * audit, a change-control workflow, anything. beCPG would let them: the template
 * is readable, and starting a project is a legitimate operation for an
 * authenticated user. The restriction is a **portal** decision, so it belongs
 * here (spec §6.2: the portal may narrow beCPG's verdict, never widen it).
 *
 * The allow-list is configuration, not code, so a tenant can open a template
 * without a release:
 *
 * ```
 * # Comma-separated. Each entry is a nodeRef, or `name=nodeRef` to give the
 * # template a stable id the UI can send instead of a nodeRef.
 * PORTAL_PROCESS_TEMPLATES=supplier-referencing=workspace://SpacesStore/1234-…,\
 *                          supplier-renewal=workspace://SpacesStore/5678-…
 * ```
 *
 * An empty variable means **no process may be started** — deny by default. A
 * blocked request answers 403 and lists the ids that *are* allowed, so the UI
 * can render the right buttons instead of guessing.
 *
 * Body:
 * ```json
 * { "process": "supplier-referencing",       // or "tplNodeRef": "workspace://…"
 *   "entityNodeRef": "workspace://SpacesStore/…",
 *   "nodeRefs": ["workspace://…"] }          // batch, mutually exclusive with entityNodeRef
 * ```
 */

import { NextResponse } from 'next/server';
import { BadRequestError, ForbiddenError, toApiResponse } from '@/lib/errors';
import { becpgJson, isNodeRef, requireSession } from '@/lib/becpg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Most entities a single call may push to a supplier. */
const MAX_BATCH = 50;

/**
 * Parses `PORTAL_PROCESS_TEMPLATES` into `{ id -> nodeRef }`.
 *
 * @returns {Map<string, string>} empty when nothing is configured (deny by default)
 */
export function allowedProcessTemplates() {
    const raw = String(process.env.PORTAL_PROCESS_TEMPLATES || '').trim();
    const templates = new Map();
    if (!raw) {
        return templates;
    }
    for (const entry of raw.split(',')) {
        const value = entry.trim();
        if (!value) {
            continue;
        }
        const separator = value.indexOf('=');
        const id = separator > 0 ? value.slice(0, separator).trim() : null;
        const nodeRef = separator > 0 ? value.slice(separator + 1).trim() : value;
        if (!isNodeRef(nodeRef)) {
            continue;
        }
        templates.set(id || nodeRef, nodeRef);
        // A caller may always send the nodeRef itself, provided it is listed.
        templates.set(nodeRef, nodeRef);
    }
    return templates;
}

/**
 * Resolves the requested process against the allow-list.
 *
 * @param {string} requested a configured id, or a nodeRef
 * @returns {string} the template nodeRef
 * @throws {ForbiddenError} when the template is not allowed
 */
function resolveTemplate(requested) {
    const templates = allowedProcessTemplates();
    // Only the human-readable ids are worth showing back.
    const ids = [...templates.keys()].filter((key) => !isNodeRef(key));

    if (templates.size === 0) {
        throw new ForbiddenError('No process may be started from the supplier portal on this instance', {
            details: { allowed: [] },
        });
    }
    const nodeRef = templates.get(String(requested || '').trim());
    if (!nodeRef) {
        throw new ForbiddenError('This process is not open to suppliers', {
            details: { allowed: ids },
        });
    }
    return nodeRef;
}

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function POST(request) {
    try {
        const session = await requireSession();

        let body;
        try {
            body = await request.json();
        }
        catch {
            throw new BadRequestError('Expected a JSON body');
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            throw new BadRequestError('Expected a JSON object');
        }

        const tplNodeRef = resolveTemplate(body.process || body.tplNodeRef || body.projectTpl);

        const nodeRefs = Array.isArray(body.nodeRefs)
            ? body.nodeRefs.filter((value) => isNodeRef(value))
            : [];
        const entityNodeRef = isNodeRef(body.entityNodeRef) ? body.entityNodeRef : null;

        if (nodeRefs.length === 0 && !entityNodeRef) {
            throw new BadRequestError('Provide entityNodeRef, or a non-empty nodeRefs array');
        }
        if (nodeRefs.length > MAX_BATCH) {
            throw new BadRequestError(`At most ${MAX_BATCH} entities can be sent in one call`);
        }

        const result = await becpgJson('becpg/supplier/send-to-supplier', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            query: {
                tplNodeRef,
                ...(entityNodeRef ? { entityNodeRef } : {}),
                ...(nodeRefs.length > 0 ? { nodeRefs: nodeRefs.join(',') } : {}),
            },
            body: JSON.stringify({ projectTpl: tplNodeRef }),
            session,
            // Starting a project is not idempotent: never replay it.
            retries: 0,
        });

        const response = NextResponse.json({
            started: true,
            process: body.process || tplNodeRef,
            projectNodeRef: result?.persistedObject || null,
            startedAt: new Date().toISOString(),
        });
        response.headers.set('Cache-Control', 'no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'process.start', method: 'POST' });
    }
}

/**
 * `GET /api/v1/process/start` — the processes this instance lets a supplier
 * start. Lets the UI render exactly the buttons that will work.
 *
 * @returns {Promise<Response>}
 */
export async function GET() {
    try {
        await requireSession();
        const templates = allowedProcessTemplates();
        const processes = [...templates.entries()]
            .filter(([id]) => !isNodeRef(id))
            .map(([id, nodeRef]) => ({ id, nodeRef }));

        const response = NextResponse.json({ processes });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'process.start', method: 'GET' });
    }
}
