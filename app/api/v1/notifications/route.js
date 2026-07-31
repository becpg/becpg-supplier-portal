/**
 * `GET /api/v1/notifications` — in-app notifications (spec §4.3, §5.4 line
 * "composition", weakness F4).
 *
 * A thin handler: the composition rule, the scope and the counting contract live in
 * `lib/adapters/notifications.js`, which is where the reasoning about **what a supplier
 * is legitimately notified about** belongs (defect B4 — the bell used to count every
 * node the account could read, 456 of them on the local supplier account).
 *
 * Query: `limit` (bounded by `NOTIFICATION_CONFIG.limit`), `noticeDays`.
 *
 * @example
 * fetch('/api/v1/notifications?noticeDays=90&limit=20');
 */

import { NextResponse } from 'next/server';
import { AuthError, toApiResponse } from '@/lib/errors';
import { getLiveSession } from '@/lib/session';
import { NOTIFICATION_CONFIG, listNotifications } from '@/lib/adapters/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, private' };

/** Re-exported so a reader of the route still finds the vocabulary it applies. */
export { NOTIFICATION_CONFIG };

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
        const payload = await listNotifications({
            session,
            limit: Number(params.get('limit')) || undefined,
            noticeDays: Number(params.get('noticeDays')) || undefined,
        });

        return NextResponse.json(payload, { status: 200, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/notifications', method: 'GET' });
    }
}
