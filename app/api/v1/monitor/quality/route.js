/**
 * `GET /api/v1/monitor/quality` — supplier non-conformities, corrective actions
 * and processing delay (spec §4.2 `/monitor/quality`, §4.6.5 quality view).
 *
 * A non-conformity is a `qa:nc` entity: `qa:ncState` (`new`, `analysis`,
 * `treatment`, `response`, `classification`, `closing`, `closed`), `qa:ncType`,
 * `qa:ncPriority` (1 = blocking) and `qa:ncCost`. All of them are indexed and
 * facetable, so the counters are **count queries**, never a page scanned and
 * counted in JavaScript.
 *
 * **Corrective actions** are the `pjt:taskList` rows that live under the NC —
 * which is how beCPG models them. The portal introduces no parallel notion of
 * "action" (spec rule R2: business logic stays in beCPG).
 *
 * **Processing delay** is `now − cm:created` while the NC is open, and
 * `cm:modified − cm:created` once it is closed. beCPG stores no dedicated
 * closure date; inventing one would be inventing data. The exact per-state
 * transition history is one of the things the OLAP cube would bring
 * (`history.available: false`, spec §4.6.6).
 *
 * A blocking NC (`qa:ncPriority = 1`, still open) is also what makes the derived
 * approval status of its supplier `suspended` (spec §5.4.3) — the same fact,
 * read from the same rows, on two screens.
 *
 * Access: monitoring groups only, `ExternalUser` gets 403 (adapter-enforced).
 * Cost: 4 count queries + 1 project scan + 1 task read ≈ 6.
 *
 * Query:
 *   - filters — `family`, `subFamily`, `site`, `subsidiary`, `market`,
 *     `state` (supplier state), `q`
 *   - `ncState` — one `qa:ncState`
 *   - `ncType` — one `qa:ncType`
 *   - `includeClosed=true` — closed NCs too (excluded by default)
 *   - `page`, `pageSize` (≤ 100), `refresh=true`
 *
 * @example
 * fetch('/api/v1/monitor/quality');
 * fetch('/api/v1/monitor/quality?ncState=treatment&includeClosed=true');
 */

import { NextResponse } from 'next/server';
import { listQuality, parseMonitorFilters } from '@/lib/adapters/monitor';
import { AuthError, toApiResponse } from '@/lib/errors';
import { resolveLang } from '@/lib/lang';
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
        const payload = await listQuality({
            session,
            filters: parseMonitorFilters(params),
            state: params.get('ncState') || undefined,
            ncType: params.get('ncType') || undefined,
            includeClosed: params.get('includeClosed') === 'true',
            focus: params.get('focus') || undefined,
            page: params.get('page'),
            pageSize: params.get('pageSize'),
            lang: await resolveLang(session),
            refresh: params.get('refresh') === 'true',
        });

        return NextResponse.json(payload, { status: 200, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/monitor/quality', method: 'GET' });
    }
}
