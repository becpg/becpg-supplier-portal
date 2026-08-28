/**
 * `/api/v1/signature/{taskId}` — **what to sign, where it lands, and the one
 * POST that signs it** (spec §9.2, ticket #35696).
 *
 * ## The design decision, restated because the code only makes sense with it
 *
 * In beCPG the signature is applied **server-side**:
 * `SignatureService.prepareForSignature()` positions the signature and the
 * initials, `PDFBoxServiceImpl.signDocument()` performs the cryptographic
 * signature (PDFBox + BouncyCastle, in the Alfresco JVM — no external service),
 * and DocuSign / YouSign do the same remotely. **The client only displays and
 * collects consent.** That is why there is no PDFTron here, and no annotation
 * SDK of any kind: they solve a problem the portal does not have, they cost a
 * licence, and Apryse's WebViewer is what makes Firefox crawl (#35696).
 *
 * ## GET
 *
 * ```json
 * { "taskId": "workspace://SpacesStore/…",
 *   "task": { "nodeRef", "name", "state", "entityNodeRef", … },
 *   "outcome": "open | signed | cancelled | closed",
 *   "signature": { "external": false, "state": "InProgress", "status": "Prepared",
 *                  "zones": [ { "page": 2, "type": "signature", "x": 0.6, "y": 0.805,
 *                               "width": 0.327, "height": 0.095,
 *                               "unit": "ratio", "origin": "top-left" } ],
 *                  "zonesSource": "acroform", "zonesReason": null },
 *   "document": { "nodeRef", "name", "signStatus", "pageCount", "available": true,
 *                 "contentUrl": "/api/v1/documents/{id}/content?task={taskId}" },
 *   "originals": [ … ] }
 * ```
 *
 * Three things in there are load-bearing:
 *
 * - `document` is the node named by the **signature view URL** — the prepared
 *   *working copy* — not `deliverable.contents[0]`, which is the untouched
 *   original with no signature field in it (see `lib/adapters/signature.js`);
 * - `signature.zones` are read out of that document's AcroForm, i.e. out of the
 *   very rectangles `prepareForSignature()` wrote. An empty array means the
 *   overlay draws nothing. `zonesReason` says why, so a missing overlay is
 *   diagnosable instead of mysterious;
 * - **`available: false` means beCPG will not serve those bytes** — the working
 *   copy was deleted by the check-in that followed the signature, or the
 *   supplier has lost read access to it. `contentUrl` and `downloadUrl` are then
 *   `null`, and an unreadable original is dropped from `originals` altogether:
 *   the screen must never offer a link that answers 404 (defect F4). It is
 *   measured, not assumed — `api/metadata` answers `200 {}` for such a node.
 *
 * ## POST — the single call that signs
 *
 * One POST, and it carries the consent:
 *
 * ```json
 * { "requestId": "sign-…", "consent": { "accepted": true, "text": "…", "at": "…" },
 *   "signature": { "kind": "drawn|typed", "name": "…", "image": "data:image/png;…" },
 *   "initials": { "kind": "drawn|typed", "name": "…", "image": "data:image/png;…" },
 *   "reading": { "pages": 12, "seenPages": 12, "complete": true } }
 * ```
 *
 * It does **not** invent a signing endpoint: signing *is* completing the task,
 * because `beCPG/signature/sign-document.js` is that task's post-deliverable
 * script. The portal proxies `becpg/project/complete/task` and lets beCPG run
 * `bSign.signDocument()` (rule R2, spec §6.2).
 *
 * **The two images are what ends up on the page.** `signDocument()` signs and
 * draws nothing — Share's Apryse viewer is what fills the boxes, in the browser,
 * before uploading. The portal does the same server-side (`lib/pdfStamp.js`):
 * the signature goes into the `<user>-signature` widget, the initials into every
 * `<user>` widget. They were being posted and dropped, which is how a sheet
 * signed from the portal came back with eleven empty frames.
 *
 * ### The three production failures it answers
 *
 * | failure | answer |
 * |---|---|
 * | already signed (second tab, reload after success, #34523) | `200 { "signed": true, "alreadySigned": true }` — read from `sign:status`, no second signature is attempted |
 * | cancelled document / refused task | `409 signature/cancelled`, no signature attempted |
 * | network dies mid-submit | the retry re-reads beCPG *before* doing anything; a POST that landed but whose answer was lost resolves as `alreadySigned`, not as an error. `requestId` is echoed for log correlation only — the idempotency comes from beCPG's state, which is the only place that cannot lie |
 *
 * `consent.accepted !== true` is a 400: this endpoint exists to record a
 * consent, and a signature without one is not a thing the portal will do.
 */

import { NextResponse } from 'next/server';
import { AuthError, BadRequestError, ConflictError, toApiResponse } from '@/lib/errors';
import { getLiveSession } from '@/lib/session';
import { createBecpgClient } from '@/lib/adapters/session';
import { getSignatureView, signSignatureTask } from '@/lib/adapters/signature';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Reading the request body must never be the thing that 500s. */
async function readBody(request) {
    try {
        const text = await request.text();
        return text ? JSON.parse(text) : {};
    }
    catch {
        throw new BadRequestError('Malformed signature payload');
    }
}

/**
 * @param {Request} request
 * @param {{ params: Promise<{ taskId: string }> }} context
 * @returns {Promise<Response>}
 */
export async function GET(request, context) {
    const { taskId } = await context.params;
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }
        const client = createBecpgClient(session);

        // `?zones=0` is the escape hatch for the polling the client does after a
        // lost answer: it must not re-download the PDF just to ask "is it signed".
        const withZones = new URL(request.url).searchParams.get('zones') !== '0';

        const payload = await getSignatureView({ client, taskId, withZones });

        const response = NextResponse.json(payload);
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/signature/[taskId]', method: 'GET', taskId });
    }
}

/**
 * The two marks to draw, as the browser sent them.
 *
 * Nothing is validated here beyond "it is a string": `markBytes()` is what
 * decides whether those characters are a PNG, and it runs where the bytes are
 * actually decoded. Initials that were not captured fall back to the signature
 * in `stampSignatureMarks()`, so a document whose only widget is a signature
 * never demands a second drawing.
 *
 * @param {Object} body
 * @returns {{signature: string|null, initials: string|null}}
 */
function marksOf(body) {
    const image = (mark) => (mark && typeof mark.image === 'string' ? mark.image : null);
    return { signature: image(body.signature), initials: image(body.initials) };
}

/**
 * @param {Request} request
 * @param {{ params: Promise<{ taskId: string }> }} context
 * @returns {Promise<Response>}
 */
export async function POST(request, context) {
    const { taskId } = await context.params;
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }
        const client = createBecpgClient(session);
        const body = await readBody(request);

        const consent = body && body.consent;
        if (!consent || consent.accepted !== true) {
            throw new BadRequestError('Signature refused: no consent recorded');
        }

        const requestId = typeof body.requestId === 'string' && body.requestId
            ? body.requestId.slice(0, 120)
            : request.headers.get('x-portal-request-id');

        const result = await signSignatureTask({ client, taskId, requestId, marks: marksOf(body) });

        if (result.cancelled) {
            throw new ConflictError('This signature request was cancelled', {
                details: { reason: 'signature-cancelled', outcome: result.outcome },
            });
        }

        const response = NextResponse.json({
            ...result,
            // Echoed so the UI can state, truthfully, that nothing was signed
            // twice — and so a support log can be matched to a browser session.
            consentRecordedAt: consent.at || new Date().toISOString(),
        }, { status: 200 });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/signature/[taskId]', method: 'POST', taskId });
    }
}
