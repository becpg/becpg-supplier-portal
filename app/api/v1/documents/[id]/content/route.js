/**
 * `GET /api/v1/documents/{id}/content` — streams a document through the proxy.
 *
 * **The browser never receives an Alfresco URL** (spec §6.1): it asks the
 * portal, the portal holds the ticket, and the bytes are piped straight through
 * without ever being buffered — a 200 MB technical sheet costs no memory.
 *
 * `{id}` is the document nodeRef in any of its usual forms
 * (`workspace://SpacesStore/<uuid>`, `workspace/SpacesStore/<uuid>` or the bare
 * `<uuid>` returned in `downloadUrl`).
 *
 * Before streaming, the document is resolved with one db-afts query restricted
 * to the session's supplier perimeter: a nodeRef that does not belong to it is a
 * 404, never a passthrough (spec §6.3). beCPG remains the authority on
 * permissions on top of that.
 *
 * ## `?task={taskId}` — the signature exception, stated instead of smuggled
 *
 * A signature document is **not** in that perimeter and never will be: beCPG
 * signs a checked-out *working copy* that lives in the signature project, carries
 * no `bcpg:documentAspect` and sits under no supplier folder (spec §9.2; the
 * measurement is in `lib/adapters/signature.js`). Relaxing the document query to
 * let it through would relax it for everything else too.
 *
 * So the caller states which task it is streaming for, and the route checks that
 * claim against beCPG: the node must be a deliverable of that task — the node in
 * its signature view (`pjt:dlUrl` → `nodeRef=`) or one of its `pjt:dlContent`
 * nodes — and the task is read with the **user's own ticket**, so naming someone
 * else's task answers 404. This is a second authorisation rule, not a hole in
 * the first: without `?task`, or with a task that does not carry the node, the
 * perimeter check still decides.
 *
 * @example
 * <a href="/api/v1/documents/9f2c…/content?download=1">Télécharger</a>
 * <a href="/api/v1/documents/cb1c…/content?task=89e8…">the PDF to sign</a>
 */

import { getDocument, streamDocument } from '@/lib/adapters/documents';
import { authorizeTaskDocument } from '@/lib/adapters/signature';
import { createBecpgClient } from '@/lib/adapters/session';
import { AuthError, toApiResponse } from '@/lib/errors';
import { getLiveSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * @param {Request} request
 * @param {{ params: Promise<{ id: string }> }} context
 * @returns {Promise<Response>}
 */
export async function GET(request, context) {
    const { id } = await context.params;
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }

        const params = new URL(request.url).searchParams;
        const taskId = params.get('task');

        // Perimeter check + name resolution, in one query — unless the caller
        // named a task, in which case the task's deliverables are the rule.
        // The task path is tried first only when it is claimed; a node it does
        // not cover still has to satisfy the perimeter.
        const document = (taskId
            ? await authorizeTaskDocument(createBecpgClient(session), taskId, id)
            : null)
            || await getDocument({ session, nodeRef: id });

        return await streamDocument({
            session,
            nodeRef: document.nodeRef,
            filename: document.name,
            attachment: params.get('download') === '1' || params.get('attachment') === 'true',
        });
    }
    catch (error) {
        return toApiResponse(error, {
            route: '/api/v1/documents/[id]/content',
            method: 'GET',
            document: String(id || '').slice(0, 80),
        });
    }
}
