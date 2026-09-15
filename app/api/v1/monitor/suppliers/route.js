/**
 * `GET /api/v1/monitor/suppliers` — the supplier monitoring list (spec §4.6.2).
 *
 * Columns: approval status, score, completion, expiring documents, open
 * non-conformities, last activity, referring buyer. Multi-criteria filters,
 * sorting, pagination — and the **CSV export variant** on the same URL with
 * `format=csv`, so the export can never drift from the screen: it is literally
 * the same rows.
 *
 * ## Why the sorting happens here and not in the search engine
 *
 * Approval status, expiry counts and risk are **derived, never persisted**
 * (spec §5.4.3): there is no `bcpg:approvalStatus` to sort on, by design. The
 * park is therefore selected by one db-afts query, the derived columns are
 * computed with the 7 park queries of the approval adapter, and only then can
 * the rows be ordered. beCPG clamps a listing to
 * `beCPG.remote.maxResults.limit` (default 256), so above that the ordering is
 * over the scanned window: the payload says so with
 * `pagination.sortScope = 'window'` and `truncated: true` rather than pretending
 * otherwise. Narrow with a filter to get an exact ordering.
 *
 * Access: monitoring groups only, `ExternalUser` gets 403 (adapter-enforced).
 * Cost: 1 park query + 7 approval queries ≈ 8, independent of the park.
 *
 * Query:
 *   - filters — `family`, `subFamily`, `site`, `subsidiary`, `buyer`, `market`,
 *     `state`, `q`
 *   - `status` — one or more approval statuses, comma-separated
 *     (`suspended,toRenew,inProgress,approved`)
 *   - `sort` — `risk` (default), `name`, `code`, `status`, `score`,
 *     `completion`, `expiring`, `expired`, `nc`, `lastActivity`, `buyer`
 *   - `direction` — `desc` (default) or `asc`
 *   - `page`, `pageSize` (≤ 100)
 *   - `format=csv` — the export; `pageSize` is ignored, every scanned row is
 *     written
 *   - `refresh=true` — bypass the 30 s memo
 *
 * @example
 * fetch('/api/v1/monitor/suppliers?status=suspended&sort=risk');
 * fetch('/api/v1/monitor/suppliers?family=workspace://SpacesStore/…&format=csv');
 */

import { NextResponse } from 'next/server';
import {
    listMonitoredSuppliers,
    parseMonitorFilters,
    supplierCsvColumns,
    toCsv,
} from '@/lib/adapters/monitor';
import { cookies } from 'next/headers';
import { LANG_COOKIE, normalizeLang } from '@/config/messages';
import { AuthError, toApiResponse } from '@/lib/errors';
import { getLiveSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, private' };

/** Rows a CSV export may contain — the scan limit of one park query. */
const CSV_MAX_ROWS = 1000;

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
        const isCsv = String(params.get('format') || '').toLowerCase() === 'csv';

        const payload = await listMonitoredSuppliers({
            session,
            filters: parseMonitorFilters(params),
            status: params.get('status') || undefined,
            sort: params.get('sort') || undefined,
            direction: params.get('direction') || undefined,
            page: isCsv ? 1 : params.get('page'),
            // The export is the list, not a page of it.
            pageSize: isCsv ? CSV_MAX_ROWS : params.get('pageSize'),
            refresh: params.get('refresh') === 'true',
        });

        if (!isCsv) {
            return NextResponse.json(payload, { status: 200, headers: NO_STORE });
        }

        const cookieStore = await cookies();
        const lang = normalizeLang(cookieStore.get(LANG_COOKIE)?.value);
        const csv = toCsv(supplierCsvColumns(lang), payload.items);
        const stamp = payload.generatedAt.slice(0, 10);
        return new NextResponse(csv, {
            status: 200,
            headers: {
                ...NO_STORE,
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="suppliers-${stamp}.csv"`,
                // Tells the UI the export was cut, so it can warn instead of
                // handing an auditor a silently incomplete file.
                'X-Portal-Truncated': String(payload.pagination.truncated),
            },
        });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/monitor/suppliers', method: 'GET' });
    }
}
