/**
 * `GET /api/v1/monitor/cockpit` - every aggregate of the monitoring cockpit
 * (`/monitor`, its Quality, Purchasing, R&D, CSR and Assistant tabs) in one call.
 *
 * The payload is composed from the adapters of the other monitoring routes - the
 * overview, the supplier list, the quality list, the document matrix and the OLAP
 * catalogue - so a figure here and the same figure on the screen it drills into
 * come from one computation. Each block carries `available` and `reason` and
 * degrades on its own; see `buildCockpit()` for the shape.
 *
 * Access: internal monitoring groups only, through `requireMonitorAccess()`.
 *
 * Query: the filters of `/api/v1/monitor/overview` (`family`, `subFamily`, `site`,
 * `subsidiary`, `buyer`, `market`, `state`, `q`) and `refresh=true`.
 */

import { NextResponse } from 'next/server';
import { buildCockpit } from '@/lib/adapters/cockpit';
import { parseMonitorFilters } from '@/lib/adapters/monitor';
import { AuthError, toApiResponse } from '@/lib/errors';
import { resolveLang } from '@/lib/lang';
import { getLiveSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/v1/monitor/cockpit';
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
        const payload = await buildCockpit({
            session,
            filters: parseMonitorFilters(params),
            lang: await resolveLang(session),
            refresh: params.get('refresh') === 'true',
        });
        return NextResponse.json(payload, { status: 200, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, { route: ROUTE, method: 'GET' });
    }
}
