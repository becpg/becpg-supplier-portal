/**
 * `PATCH /api/v1/documents/{id}` — the validity window of one document.
 *
 * The only property of a document the portal writes. It exists because
 * `DocumentAspectPolicy` deliberately writes none for a document type whose
 * `bcpg:docTypeEffectivityType` is `MANUAL` or unset: the dates are printed on
 * the certificate the supplier holds, and until now nothing in the portal could
 * carry them. See `setDocumentValidity` for the rule and for the refusal on a
 * type whose dates beCPG computes.
 *
 * `{id}` is the document nodeRef in any of its usual forms. The perimeter is
 * checked first, so a nodeRef outside the session's suppliers is a 404
 * (spec §6.3), with beCPG's own ACL on top.
 *
 * @example
 * fetch('/api/v1/documents/9f2c…', {
 *     method: 'PATCH',
 *     body: JSON.stringify({ validFrom: '2026-01-01', validTo: '2027-01-01' }),
 * });
 */

import { NextResponse } from 'next/server';
import { setDocumentValidity } from '@/lib/adapters/documents';
import { invalidateApproval } from '@/lib/adapters/approval';
import { AuthError, BadRequestError, toApiResponse } from '@/lib/errors';
import { getLiveSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, private' };

/**
 * @param {Request} request
 * @param {{ params: Promise<{ id: string }> }} context
 * @returns {Promise<Response>}
 */
export async function PATCH(request, context) {
    const { id } = await context.params;
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }

        let body;
        try {
            body = await request.json();
        }
        catch {
            throw new BadRequestError('Expected a JSON body');
        }
        if (!body || typeof body !== 'object') {
            throw new BadRequestError('Expected a JSON object');
        }

        const document = await setDocumentValidity({
            session,
            nodeRef: id,
            ...('validFrom' in body ? { validFrom: body.validFrom } : {}),
            ...('validTo' in body ? { validTo: body.validTo } : {}),
        });

        // An expiring certificate is one of the facts an approval verdict rests
        // on (spec §5.4.3): moving its end of validity invalidates the cache.
        invalidateApproval(session);

        return NextResponse.json(document, { status: 200, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, {
            route: '/api/v1/documents/[id]',
            method: 'PATCH',
            document: String(id || '').slice(0, 80),
        });
    }
}
