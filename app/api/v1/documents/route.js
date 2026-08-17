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
import { listDocuments, setDocumentValidity, uploadDocument } from '@/lib/adapters/documents';
import { invalidateApproval } from '@/lib/adapters/approval';
import { AuthError, BadRequestError, toApiResponse } from '@/lib/errors';
import { logError } from '@/lib/http';
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
 * Applies the validity window carried by an upload, if it carries one.
 *
 * @param {Object} session
 * @param {FormData} form the multipart body
 * @param {string|null} nodeRef the document the file landed on
 * @returns {Promise<Object|null>} `{ applied, validFrom, validTo }`, `{ applied: false, reason }`,
 *          or `null` when the caller sent no date at all
 */
async function applyValidity(session, form, nodeRef) {
    const validFrom = form.get('validFrom');
    const validTo = form.get('validTo');
    if ((validFrom === null && validTo === null) || !nodeRef) {
        return null;
    }
    try {
        const document = await setDocumentValidity({
            session,
            nodeRef: String(nodeRef),
            ...(validFrom === null ? {} : { validFrom: String(validFrom) || null }),
            ...(validTo === null ? {} : { validTo: String(validTo) || null }),
        });
        return {
            applied: true,
            validFrom: document.validFrom,
            validTo: document.validTo,
        };
    }
    catch (error) {
        // Never silent: the deposit is reported as the success it is, and the
        // reason the dates did not follow goes to the pod's logs.
        logError('documents.validity.failed', {
            route: '/api/v1/documents',
            document: String(nodeRef).slice(0, 80),
            message: error.message,
        });
        return { applied: false, reason: error.message };
    }
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
 * Uploading onto the placeholder created by `DocumentFormulationHandler` is
 * enough for `DocumentAspectPolicy` to move `bcpg:documentState` to `ToValidate`
 * and to fill `cm:from` / `cm:to` from the document type. Business logic stays
 * in beCPG (rule R2).
 *
 * ## `validFrom` / `validTo`, when the supplier is the one who knows them
 *
 * On a document type whose `bcpg:docTypeEffectivityType` is `MANUAL` — or which
 * declares none — that policy writes **no date at all**, and the certificate's
 * validity is printed on the file the supplier is uploading. The two optional
 * multipart fields carry it, and are applied **after** the upload so the
 * policy's own write cannot overwrite them.
 *
 * A failure there does not fail the deposit: the file has landed, and telling a
 * supplier "the upload failed" because a date could not be written would be a
 * lie. The response then carries `validity.applied = false` with the reason —
 * the row stays flagged as missing its validity, which is exactly what is true.
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

        const validity = await applyValidity(session, form, documentRef || result.nodeRef);

        return NextResponse.json(
            validity ? { ...result, validity } : result,
            { status: 201, headers: NO_STORE },
        );
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/documents', method: 'POST' });
    }
}
