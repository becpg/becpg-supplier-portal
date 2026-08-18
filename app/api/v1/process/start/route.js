/**
 * `POST /api/v1/process/start` — start an **authorised** process.
 *
 * ## Which templates may be started
 *
 * The upstream webscript instantiates whatever template it is handed. Left
 * open, a supplier could start *any* project template of the repository — an
 * internal audit, a change-control workflow, anything. beCPG would let them: the
 * template is readable and starting a project is a legitimate operation for an
 * authenticated user. The restriction is a **portal** decision, so it belongs
 * here (spec §6.2: the portal may narrow beCPG's verdict, never widen it).
 *
 * The list itself is no longer a nodeRef pasted into configuration. It is
 * resolved by `lib/adapters/processTemplates.js`, which asks beCPG for the
 * templates carrying the product's own supplier marker — type `pjt:project` +
 * aspect `bcpg:entityTplAspect` + aspect `bcpg:suppliersAspect`, enabled — the
 * exact datasource Share's "envoyer au fournisseur" dialog uses. **Precedence:
 * `PORTAL_PROCESS_TEMPLATES` wins whenever it is set** (and then no discovery
 * query is issued at all, so a pinned installation behaves byte for byte as
 * before); discovery fills the list only when the variable is absent.
 *
 * Deny-by-default is unchanged either way: an empty resolved list starts
 * nothing, and a request naming a template that is not in the list is a 403 —
 * whether the list came from the environment or from discovery.
 *
 * ## Which webscript actually starts it
 *
 * `becpg/supplier/send-to-supplier` (`SupplierPortalWebScript`) is **broken in
 * the product**: the class is not declared as a Spring bean, so Alfresco answers
 * 500 on every call. The working entry point — the one Share's own dialog
 * submits to — is
 *
 *     POST becpg/workflow/start-process?script=create-supplier-project.js&nodeRefs=…
 *
 * whose body is the Share form data. Two of its fields cannot be invented by the
 * portal: the project name and the supplier accounts to assign. They are
 * **computed by beCPG**, not here: `GET …start-process?defs=true&nodeRefs=…`
 * evaluates the `formFields` expressions of `process.json`
 * (`bSupplier.extractSupplierProjectName`, `bSupplier.extractSupplierAccountRefs`)
 * for those very items and returns the result. The portal composes the two calls
 * and adds nothing of its own but the template — rule R1, and no business logic
 * migrates out of beCPG (rule R2).
 *
 * That `defs=true` call is also a **second gate for free**: beCPG only returns
 * the definition when its `condition` matches the items and the caller passes
 * its `permissionGroup`. An entity beCPG refuses to send to a supplier produces
 * no definition, and the portal answers 403 instead of starting anything.
 *
 * Body:
 * ```json
 * { "process": "supplier-referencing",       // or "tplNodeRef": "workspace://…"
 *   "entityNodeRef": "workspace://SpacesStore/…",
 *   "nodeRefs": ["workspace://…"] }          // batch, mutually exclusive with entityNodeRef
 * ```
 */

import { NextResponse } from 'next/server';
import { BadRequestError, PortalError, toApiResponse } from '@/lib/errors';
import { isNodeRef, requireSession } from '@/lib/becpg';
import { resolveProcessTemplates } from '@/lib/adapters/processTemplates';
import { resolveTemplate, startSupplierProject } from '@/lib/adapters/supplierProcess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Most entities a single call may push to a supplier. */
const MAX_BATCH = 50;

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

        const resolution = await resolveProcessTemplates({ session });
        const tplNodeRef = resolveTemplate(resolution, body.process || body.tplNodeRef || body.projectTpl);

        const nodeRefs = Array.isArray(body.nodeRefs)
            ? [...new Set(body.nodeRefs.filter((value) => isNodeRef(value)).map(String))]
            : [];
        const entityNodeRef = isNodeRef(body.entityNodeRef) ? body.entityNodeRef : null;

        if (nodeRefs.length === 0 && !entityNodeRef) {
            throw new BadRequestError('Provide entityNodeRef, or a non-empty nodeRefs array');
        }
        if (nodeRefs.length > MAX_BATCH) {
            throw new BadRequestError(`At most ${MAX_BATCH} entities can be sent in one call`);
        }

        // One project per entity — the semantics `send-to-supplier` had, which
        // looped over `nodeRefs`. `create-supplier-project.js` only ever reads
        // `items[0]`, so the loop lives here rather than upstream.
        const targets = nodeRefs.length > 0 ? nodeRefs : [entityNodeRef];
        const results = [];
        // The error objects, kept apart from `results`: those are serialised into
        // the response and must carry a code and a message, nothing more.
        const failures = [];
        for (const target of targets) {
            try {
                results.push({
                    entityNodeRef: target,
                    ok: true,
                    projectNodeRef: await startSupplierProject({ session, entityNodeRef: target, tplNodeRef }),
                });
            }
            catch (error) {
                // A batch never rolls back: report per target, like the
                // monitoring actions do.
                failures.push(error);
                results.push({
                    entityNodeRef: target,
                    ok: false,
                    error: error?.code || 'upstream',
                    message: error?.message || 'Could not start the process',
                });
            }
        }

        const started = results.filter((entry) => entry.ok);
        // A single-entity request that failed is a failure, not a 200 with a
        // silent `ok: false` the dialog would render as success.
        if (started.length === 0) {
            const first = failures[0];
            const details = { process: body.process || tplNodeRef, results };
            // A refusal is a settled answer, not a transient upstream failure.
            // Wrapping it in an UpstreamError answered 502 `error.network` — "the
            // connection failed, try again" — for something no retry can fix.
            // Measured on the reference instance the 03/08/2026: the test supplier account
            // starting a referencing gets "Accès refusé" out of
            // `create-supplier-project.js`, i.e. a 403, and the dialog told the
            // supplier it was a network problem.
            if (first instanceof PortalError && first.status >= 400 && first.status < 500) {
                throw new PortalError(first.message, {
                    status: first.status,
                    code: first.code,
                    messageKey: first.messageKey,
                    details,
                });
            }
            throw new UpstreamError(first?.message || results[0]?.message || 'Could not start the process', {
                details,
            });
        }

        const response = NextResponse.json({
            started: true,
            process: body.process || tplNodeRef,
            tplNodeRef,
            projectNodeRef: started[0].projectNodeRef,
            results,
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
 * Always 200 with a state, never a 500: `source` says where the list came from
 * and `discovery` says what happened when it was resolved, so the dialog can
 * tell "nothing is open here" (`reason: 'none'`) from "we could not ask beCPG"
 * (`available: false`) instead of showing an empty select in both cases.
 *
 * @returns {Promise<Response>}
 */
export async function GET() {
    try {
        const session = await requireSession();
        const { processes, source, discovery } = await resolveProcessTemplates({ session });

        const response = NextResponse.json({ processes, source, discovery });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'process.start', method: 'GET' });
    }
}
