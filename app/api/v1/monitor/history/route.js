/**
 * `GET /api/v1/monitor/history` — the historical series of the monitoring space
 * (spec §4.6.6), read from the OLAP cube through beCPG's own proxy.
 *
 * Query:
 *   - `series`   `taskTrend` | `taskStates` | `completion` | `incidents` (default: `taskTrend`)
 *   - `supplier` a supplier nodeRef, to restrict the series to it; anything that
 *     is not a nodeRef answers 400
 *
 * ## What this route deliberately does not accept
 *
 * **No MDX, no cube name, no dimension.** `series` selects one entry of a closed
 * catalogue (`lib/adapters/olap.js`), and the statement is built server-side.
 * The repository webscript behind it (`becpg/olap/chart`) executes arbitrary MDX
 * against a cube that has no row-level security, so accepting a caller's query —
 * or adding `becpg/olap/` to `ALLOWED_BECPG_PATH_PREFIXES` — would hand any
 * authenticated supplier the whole park. It is left out of that allow-list on
 * purpose; this route is the only way in.
 *
 * ## Access
 *
 * Reserved to the monitoring space, like every other `/api/v1/monitor/*` route:
 * the historical series describe the *customer's* supplier park and have no
 * business being read from a supplier session.
 *
 * The cube has no row-level security either, so a series with one row per
 * supplier (`incidents` without `supplier`) is cut down to the caller's own park
 * before it is answered; `perimeter` in the payload says it was.
 *
 * ## No cube is a normal answer
 *
 * `becpg.olap.enabled` is false by default and most instances run without Saiku.
 * The route answers **200** with `available: false` and a `reason`, never an
 * error: the screens show their real-time values and simply omit the history.
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, BadRequestError, toApiResponse } from '@/lib/errors';
import { isNodeRef } from '@/lib/becpg';
import { parkSupplierNames, requireMonitorAccess } from '@/lib/adapters/monitor';
import { OLAP_QUERIES, runOlapQuery } from '@/lib/adapters/olap';
import { resolveLang } from '@/lib/lang';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** `series` → the catalogued query it selects. Anything else is a 400. */
const SERIES = {
    taskTrend: 'taskTrend',
    taskStates: 'taskStates',
    completion: 'completion',
    incidents: 'supplierIncidents',
};

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
        await requireMonitorAccess(session);

        const params = new URL(request.url).searchParams;
        const series = params.get('series') || 'taskTrend';
        const queryId = SERIES[series];
        if (!queryId) {
            throw new BadRequestError(`Unknown series: ${series}`);
        }

        // A malformed supplier is refused, never dropped: dropping it would turn
        // a request about one supplier into the unsliced, park-wide series.
        const requested = params.get('supplier');
        if (requested !== null && !isNodeRef(requested)) {
            throw new BadRequestError('supplier must be a nodeRef');
        }
        const supplierNodeRef = requested || null;

        const perimeter = OLAP_QUERIES[queryId].supplierRows && !supplierNodeRef
            ? await parkSupplierNames({ session, lang: await resolveLang(session) })
            : null;
        const result = await runOlapQuery({
            session, queryId, supplierNodeRef, perimeter,
        });

        const response = NextResponse.json({
            series,
            supplier: supplierNodeRef,
            ...result,
            generatedAt: new Date().toISOString(),
        }, { status: 200 });
        // The cube is refreshed by a batch, not live: a minute of caching spares
        // the repository a Saiku round-trip per screen without ever showing a
        // figure the underlying data has already moved past.
        response.headers.set('Cache-Control', 'private, max-age=60');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/monitor/history', method: 'GET' });
    }
}
