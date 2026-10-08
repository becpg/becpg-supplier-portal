/**
 * `GET /api/v1/documents/signed` — the documents the supplier has signed.
 *
 * A signature screen offers the download once; this is where the signed copy
 * is found again afterwards.
 *
 * @example
 * fetch('/api/v1/documents/signed?supplier=workspace://SpacesStore/…');
 */

import { NextResponse } from 'next/server';
import { listSignedDocuments } from '@/lib/adapters/documents';
import { AuthError, toApiResponse } from '@/lib/errors';
import { getLiveSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, private' };

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function GET(request) {
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }
        const params = new URL(request.url).searchParams;
        const payload = await listSignedDocuments({ session, supplier: params.getAll('supplier') });
        return NextResponse.json(payload, { status: 200, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/documents/signed', method: 'GET' });
    }
}
