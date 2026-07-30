/**
 * `GET /api/v1/signature/{taskId}` — where to sign, and what to sign.
 *
 * ## What beCPG already does, and what is left to the client
 *
 * Signature is applied **server-side** (spec §9.2):
 * `SignatureService.prepareForSignature()` positions the signature and initials,
 * `PDFBoxServiceImpl.signDocument()` performs the cryptographic signature, and
 * the DocuSign / YouSign implementations do the same remotely. The client only
 * **displays** the document and **collects consent**.
 *
 * `beCPG/signature/prepare-signature.js` stores the result of
 * `bSign.getSignatureView(document, recipient, task)` on the task's URL
 * deliverable. This route reads the task, finds that deliverable, and returns
 * both halves the portal needs:
 *
 *   - `signature.url` — the signature view beCPG computed. Absolute (DocuSign,
 *     YouSign) it is opened as-is; relative (a Share page) it is exposed through
 *     the portal's own Share proxy, since Alfresco is never reachable from the
 *     browser;
 *   - `document` — the node to render, with a **portal** content URL, so the
 *     light viewer of spec §9.2 (`pdf.js` / `react-pdf`) can display it without
 *     ever seeing an Alfresco URL or a ticket.
 *
 * The heavy PDFTron/Apryse viewer is deliberately not involved: it is
 * oversized for display-and-consent, it is licensed, and it is what makes
 * Firefox crawl (#35696).
 *
 * Response:
 * ```json
 * { "taskId": "workspace://SpacesStore/…",
 *   "task": { "nodeRef", "name", "description", "state", "entityNodeRef" },
 *   "signature": { "url": "https://…", "external": true, "deliverableNodeRef": "…" },
 *   "document": { "nodeRef", "name", "mimetype", "contentUrl", "downloadUrl" },
 *   "documents": [ … ] }
 * ```
 */

import { NextResponse } from 'next/server';
import { BadRequestError, NotFoundError, toApiResponse } from '@/lib/errors';
import { getJson, isNodeRef, nodeRefToPath, pathToNodeRef, requireSession } from '@/lib/becpg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Deliverable states that mean "nothing to sign any more". */
const CLOSED_STATES = new Set(['Completed', 'Cancelled']);

/**
 * Accepts a nodeRef, a node path or a bare UUID.
 *
 * @param {string} taskId
 * @returns {string} a nodeRef
 */
function toTaskNodeRef(taskId) {
    const value = String(taskId || '').trim();
    if (!value) {
        throw new BadRequestError('Missing task id');
    }
    if (isNodeRef(value)) {
        return value;
    }
    if (value.includes('/')) {
        return pathToNodeRef(value);
    }
    if (/^[A-Za-z0-9-]{8,}$/.test(value)) {
        return `workspace://SpacesStore/${value}`;
    }
    throw new BadRequestError('Invalid task id');
}

/**
 * Turns the URL beCPG stored on the deliverable into something the browser can
 * open.
 *
 * @param {string} url raw deliverable URL
 * @returns {{url: string, external: boolean}|null}
 */
function toSignatureUrl(url) {
    const value = String(url || '').trim();
    if (!value) {
        return null;
    }
    if (/^https?:\/\//i.test(value)) {
        // DocuSign / YouSign: an absolute, already-authenticated URL.
        return { url: value, external: true };
    }
    // A Share page (e.g. `artworks-viewer?nodeRef=…`): reachable only through the
    // portal's Share proxy — the browser never talks to Alfresco directly.
    const path = value.replace(/^\/+/, '').replace(/^share\//, '');
    const prefixed = path.startsWith('page/') || path.startsWith('service/') ? path : `page/${path}`;
    return { url: `/api/v1/share/${prefixed}`, external: false };
}

/**
 * Portal URLs for a document node. Nothing here exposes Alfresco or the ticket.
 *
 * @param {Object} content one entry of the deliverable's `contents`
 * @returns {Object|null}
 */
function toDocument(content) {
    if (!content?.nodeRef || !isNodeRef(content.nodeRef)) {
        return null;
    }
    const path = nodeRefToPath(content.nodeRef);
    const name = content.name || 'document';
    const encoded = encodeURIComponent(name);
    return {
        nodeRef: content.nodeRef,
        name,
        type: content.type || null,
        path: content.path || null,
        siteId: content.siteId || null,
        // Inline rendering for the light viewer…
        contentUrl: `/api/v1/becpg/api/node/content/${path}/${encoded}`,
        // …and an explicit download for "keep a copy".
        downloadUrl: `/api/v1/becpg/api/node/content/${path}/${encoded}?a=true`,
    };
}

/**
 * @param {Request} request
 * @param {{ params: Promise<{ taskId: string }> }} context
 * @returns {Promise<Response>}
 */
export async function GET(request, context) {
    const { taskId } = await context.params;
    try {
        const session = await requireSession();
        const nodeRef = toTaskNodeRef(taskId);

        // `projectTaskInfo` is mounted on `becpg/project/task` (see its
        // .desc.xml); it returns the task with its deliverables, their URL and
        // their contents.
        const payload = await getJson('becpg/project/task', {
            query: { nodeRef },
            session,
        });

        const task = payload?.task;
        if (!task) {
            throw new NotFoundError('Task not found', { details: { taskId } });
        }

        const deliverables = Array.isArray(task.deliverables) ? task.deliverables : [];
        // The signature deliverable is the one carrying the URL
        // `bSign.getSignatureView()` produced, and still open.
        const signatureDeliverable = deliverables.find((deliverable) => deliverable?.url
            && !CLOSED_STATES.has(deliverable.state))
            || deliverables.find((deliverable) => deliverable?.url)
            || null;

        const documents = deliverables
            .flatMap((deliverable) => (Array.isArray(deliverable.contents) ? deliverable.contents : []))
            .map(toDocument)
            .filter(Boolean);

        const signature = toSignatureUrl(signatureDeliverable?.url);
        const primary = (signatureDeliverable?.contents || []).map(toDocument).find(Boolean)
            || documents[0]
            || null;

        if (!signature && !primary) {
            throw new NotFoundError('This task carries nothing to sign', { details: { taskId } });
        }

        const response = NextResponse.json({
            taskId: nodeRef,
            task: {
                nodeRef: task.nodeRef || nodeRef,
                name: task.name || '',
                description: task.description || '',
                state: task.state || null,
                completionPercent: task.completionPercent || null,
                entityNodeRef: task.entityNodeRef && task.entityNodeRef !== '#access_forbidden'
                    ? task.entityNodeRef
                    : null,
            },
            signature: signature
                ? { ...signature, deliverableNodeRef: signatureDeliverable?.nodeRef || null,
                    state: signatureDeliverable?.state || null }
                : null,
            document: primary,
            documents,
        });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'signature', method: 'GET', taskId });
    }
}
