/**
 * `GET /api/v1/documents/{id}/signature` — who signed a document, and when
 * (`sign:signatureAspect`). Read with the caller's ticket: a node beCPG will not
 * serve answers as unsigned, never as someone else's signature.
 */

import { NextResponse } from 'next/server';
import { getDocumentSignature } from '@/lib/adapters/documents';
import { AuthError, toApiResponse } from '@/lib/errors';
import { getLiveSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, private' };

/**
 * @param {Request} request
 * @param {{params: Promise<{id: string}>}} context
 * @returns {Promise<Response>}
 */
export async function GET(request, context) {
    const { id } = await context.params;
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }
        const signature = await getDocumentSignature({ session, nodeRef: id });
        return NextResponse.json(signature, { status: 200, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/documents/[id]/signature', method: 'GET' });
    }
}
