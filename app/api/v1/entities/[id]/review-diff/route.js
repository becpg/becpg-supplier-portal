/**
 * `GET /api/v1/entities/{id}/review-diff` — what changed on a sheet under review
 * since what the customer last validated: its update branch's origin, or its
 * latest version. Properties and datalist rows, with the repository's labels.
 *
 * Internal accounts only (`requireMonitorAccess`): a supplier never reads the
 * validated reference.
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { resolveLang } from '@/lib/lang';
import { AuthError, toApiResponse } from '@/lib/errors';
import { getReviewDiff } from '@/lib/adapters/reviewDiff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
        const payload = await getReviewDiff({ session, entity: id, lang: await resolveLang(session) });
        const response = NextResponse.json(payload, { status: 200 });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/entities/[id]/review-diff', method: 'GET', id });
    }
}
