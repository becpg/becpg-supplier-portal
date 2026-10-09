/**
 * `GET /api/v1/entities/{id}/documents` — **what is actually in the entity's
 * supplier-documents folder**.
 *
 * ## Why this exists next to `/api/v1/documents`
 *
 * The two answer different questions and both are needed.
 *
 * `/api/v1/documents` (and `…/requirements`) is the **check-list**: it searches
 * `TYPE:"cm:content" AND ASPECT:"bcpg:documentAspect"`, which is the model
 * `DocumentFormulationHandler` maintains — one row per *expected* document type,
 * satisfied or not. That is the right source for "what does my customer still
 * expect", and it is what the wizard's documents step renders.
 *
 * It is **not** a listing of the folder. A file with no `bcpg:documentAspect`
 * is invisible to it — and the signed technical sheet is exactly that: the
 * signature flow writes it with `sign:signatureAspect`, no document type. So a
 * supplier-documents folder holding two files showed one row in the portal, and
 * the signed sheet could not be found on any screen. Measured on dev, MP96843:
 * `Halal.pdf` + `… - Fiche Technique - fr - 2026-08-03.pdf` in the folder, a
 * single `Halal` requirement in `/api/v1/documents`.
 *
 * This route returns the folder as it is, through the same `getDocuments()` the
 * wizard's documents step already uses — `becpg/project/path` to find
 * *Documents fournisseur*, then the doclist of that folder. It adds a
 * `downloadUrl` per file, pointing at the portal, so the browser never talks to
 * Alfresco directly.
 *
 * The two lists are complementary and the screens show both: the check-list says
 * what is missing, this one says what is there.
 */

import { NextResponse } from 'next/server';
import { withBasePath } from '@/lib/basePath';
import { getLiveSession } from '@/lib/session';
import { AuthError, toApiResponse } from '@/lib/errors';
import { toNodeRef } from '@/lib/adapters/tasks';
import { getDocuments, getEntity } from '@/lib/adapters/wizard';

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

        const nodeRef = toNodeRef(id);

        // Same rule as the catalogs route: `getDocuments` degrades to an empty list
        // when the folder cannot be read, so an out-of-scope node answered 200 with
        // `items: []` — no data, but a usable "this node exists" oracle. Reading the
        // entity first turns that into the 403 beCPG already returns for it.
        await getEntity(nodeRef, { session });

        const { folderNodeRef, documents } = await getDocuments(nodeRef, { session });

        const items = documents
            // `expected` is a placeholder row beCPG keeps for a document type that
            // has not been supplied: it names no content. The check-list is where
            // it belongs; listing it here as a file would show an entry nothing
            // can open.
            .filter((document) => !document.expected && document.nodeRef)
            .map((document) => ({
                ...document,
                // The generic node-content proxy, NOT `/api/v1/documents/{id}/content`:
                // that route serves the *requirement* documents, the ones the search on
                // `bcpg:documentAspect` knows about, and answers 404 for anything else —
                // starting with the signed technical sheet, which is exactly the file
                // this listing exists to surface. Measured: 404 on the signed sheet of
                // MP96843, 200 through the proxy below.
                //
                // `api/node/` is on the proxy allow-list and the session cookie
                // authenticates it, so the ticket still never reaches the browser.
                // Under the portal's base path, or the browser asks another application.
                downloadUrl: withBasePath(`/api/v1/becpg/api/node/content/workspace/SpacesStore/${
                    encodeURIComponent(String(document.nodeRef).split('/').pop())
                }/${encodeURIComponent(document.name || 'document')}`),
            }));

        const response = NextResponse.json({
            entityNodeRef: nodeRef,
            folderNodeRef,
            items,
            total: items.length,
        }, { status: 200 });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/entities/[id]/documents', method: 'GET', id });
    }
}
