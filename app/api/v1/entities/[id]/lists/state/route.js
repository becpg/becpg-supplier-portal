/**
 * `POST /api/v1/entities/{id}/lists/state` — accepts (locks) or reopens one
 * datalist of a sheet under review. Body: `{ list: <list nodeRef>, state:
 * "Valid" | "ToValidate" }`. Internal accounts only.
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, BadRequestError, toApiResponse } from '@/lib/errors';
import { setListState } from '@/lib/adapters/reviewDiff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * @param {Request} request
 * @param {{params: Promise<{id: string}>}} context
 * @returns {Promise<Response>}
 */
export async function POST(request, context) {
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
        const payload = await setListState({ session, entity: id, list: body?.list, state: body?.state });
        return NextResponse.json(payload, { status: 200, headers: { 'Cache-Control': 'no-store, private' } });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/entities/[id]/lists/state', method: 'POST', id });
    }
}
