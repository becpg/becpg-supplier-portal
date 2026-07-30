/**
 * `GET /api/v1/dashboard` — the counters of spec §4.3.
 *
 * Composition of `/tasks`, `/entities` and the document requirements already
 * materialised on the entities (spec §5.4.2). Everything is memoised on the
 * per-request client, so the four cards cost one round of upstream calls, not
 * four.
 *
 * Query:
 *   - `noticeDays`  window of the "expiring soon" counter (default 60, spec §4.3)
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, toApiResponse } from '@/lib/errors';
import { buildDashboard, createBecpgClient, EXPIRY_NOTICE_DAYS } from '@/lib/adapters/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

        const { searchParams } = new URL(request.url);
        const noticeDays = Math.max(1, Math.min(
            Number(searchParams.get('noticeDays')) || EXPIRY_NOTICE_DAYS,
            365,
        ));

        const payload = await buildDashboard(createBecpgClient(session), { noticeDays });

        const response = NextResponse.json(payload, { status: 200 });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/dashboard', method: 'GET' });
    }
}
