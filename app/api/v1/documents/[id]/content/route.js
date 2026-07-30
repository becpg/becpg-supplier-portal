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
 * @example
 * <a href="/api/v1/documents/9f2c…/content?download=1">Télécharger</a>
 */

import { getDocument, streamDocument } from '@/lib/adapters/documents';
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

        // Perimeter check + name resolution, in one query.
        const document = await getDocument({ session, nodeRef: id });

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
