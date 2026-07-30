/**
 * `/api/v1/documents`
 *
 * - `GET`  — my documents: type, scope, validity dates (`cm:effectivity`),
 *   derived status, AI verdict (`bcpg:aiValidationState`) and a download URL
 *   that points at the portal, never at Alfresco (spec §4.3, §5.4).
 * - `POST` — deposit a document or a new version (multipart).
 *
 * Everything is scoped to the supplier(s) of the session: a nodeRef that is not
 * in the session's perimeter is a 404, in addition to beCPG's own ACL check
 * (spec §6.3).
 *
 * @example
 * fetch('/api/v1/documents?status=expiring,expired&page=1');
 *
 * const body = new FormData();
 * body.append('file', file);
 * body.append('documentRef', 'workspace://SpacesStore/…');  // renew a requirement
 * fetch('/api/v1/documents', { method: 'POST', body });
 */

import { NextResponse } from 'next/server';
import { listDocuments, uploadDocument } from '@/lib/adapters/documents';
import { invalidateApproval } from '@/lib/adapters/approval';
import { AuthError, BadRequestError, toApiResponse } from '@/lib/errors';
import { getLiveSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, private' };

/**
 * @returns {Promise<Object>} a session with a live Alfresco ticket
 * @throws {AuthError}
 */
async function requireLiveSession() {
    const session = await getLiveSession();
    if (!session) {
        throw new AuthError('No portal session');
    }
    return session;
}

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function GET(request) {
    try {
        const session = await requireLiveSession();
        const params = new URL(request.url).searchParams;

        const payload = await listDocuments({
            session,
            supplier: params.getAll('supplier'),
            entity: params.get('entity') || undefined,
            status: params.get('status') || undefined,
            mandatoryOnly: params.get('mandatory') === 'true',
            page: Number(params.get('page')) || 1,
            pageSize: Number(params.get('pageSize')) || undefined,
            config: params.get('noticeDays')
                ? { noticeDays: Number(params.get('noticeDays')) }
                : undefined,
        });

        return NextResponse.json(payload, { status: 200, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/documents', method: 'GET' });
    }
}

/**
 * Deposit / new version.
 *
 * The portal writes **no** document metadata: uploading onto the placeholder
 * created by `DocumentFormulationHandler` is enough for `DocumentAspectPolicy`
 * to move `bcpg:documentState` to `ToValidate` and to fill `cm:from` / `cm:to`
 * from the document type. Business logic stays in beCPG (rule R2).
 *
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function POST(request) {
    try {
        const session = await requireLiveSession();

        const contentType = request.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('multipart/form-data')) {
            throw new BadRequestError('Expected a multipart/form-data body');
        }

        const form = await request.formData();
        const file = form.get('file') || form.get('filedata');
        const documentRef = form.get('documentRef') || form.get('updateNodeRef');
        const entityRef = form.get('entityRef') || form.get('entity');

        if (!documentRef && !entityRef) {
            throw new BadRequestError('Either documentRef or entityRef is required');
        }

        const result = await uploadDocument({
            session,
            file,
            filename: form.get('filename') ? String(form.get('filename')) : undefined,
            documentRef: documentRef ? String(documentRef) : undefined,
            entityRef: entityRef ? String(entityRef) : undefined,
            majorVersion: form.get('majorVersion') !== 'false',
            description: form.get('description') ? String(form.get('description')) : undefined,
        });

        // A deposit is one of the two events that can change an approval status
        // (spec §5.4.3) — drop the cached verdicts of this tenant.
        invalidateApproval(session);

        return NextResponse.json(result, { status: 201, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/documents', method: 'POST' });
    }
}
