/**
 * `GET /api/v1/approval` — supplier approval status (spec §4.5, §5.4.3).
 *
 * **Derived on demand, never persisted.** The status is not a beCPG property: it
 * is deduced from data that already exists, which is why this project needs no
 * data model evolution at all. The ERP connector calls this endpoint instead of
 * reading a field, so the displayed status and the exported status can never
 * drift apart.
 *
 * | Status       | Condition                                                       |
 * |--------------|-----------------------------------------------------------------|
 * | `suspended`  | ≥ 1 mandatory document expired, or an open blocking NC          |
 * | `toRenew`    | ≥ 1 mandatory document expiring within the notice period        |
 * | `inProgress` | open referencing project, or mandatory document expected and    |
 * |              | not provided, or an unsatisfied blocking catalog                |
 * | `approved`   | none of the above                                               |
 *
 * Each condition is **one db-afts query over the park**, not N per-supplier
 * computations — that is what makes the monitoring screens of spec §4.6 viable.
 * The queries actually run are echoed in `queries` for auditability.
 *
 * Two shapes:
 *   - `?supplier=<nodeRef>` (repeatable) — those suppliers only;
 *   - no parameter — every supplier the session can see, i.e. its own supplier
 *     for an external account, the whole park for a monitoring user.
 *
 * @example
 * fetch('/api/v1/approval');                                  // my status
 * fetch('/api/v1/approval?supplier=workspace://SpacesStore/…');
 * fetch('/api/v1/approval?noticeDays=90&catalogs=true');
 */

import { NextResponse } from 'next/server';
import { computeApproval, computeApprovalForPark } from '@/lib/adapters/approval';
import { AuthError, toApiResponse } from '@/lib/errors';
import { getLiveSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, private' };

/**
 * Builds the configuration override from the query string. Only the knobs that
 * are safe to expose are readable this way; everything else stays in
 * `DEFAULT_APPROVAL_CONFIG`.
 *
 * @param {URLSearchParams} params
 * @returns {Object|undefined}
 */
function configFromQuery(params) {
    const overrides = {};
    if (params.get('noticeDays')) {
        const noticeDays = Number(params.get('noticeDays'));
        if (Number.isFinite(noticeDays) && noticeDays >= 0 && noticeDays <= 365) {
            overrides.noticeDays = noticeDays;
        }
    }
    if (params.get('catalogs') === 'true') {
        overrides.catalogs = { enabled: true };
    }
    return Object.keys(overrides).length > 0 ? overrides : undefined;
}

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
        const suppliers = params.getAll('supplier').filter(Boolean);
        const config = configFromQuery(params);
        const refresh = params.get('refresh') === 'true';

        // Single supplier: the cached, per-supplier path (short TTL, invalidated
        // on document upload). It delegates to the very same park evaluation, so
        // a status can never depend on which screen asked for it.
        if (suppliers.length === 1) {
            const approval = await computeApproval(suppliers[0], { session, config, refresh });
            return NextResponse.json(approval, { status: 200, headers: NO_STORE });
        }

        const payload = await computeApprovalForPark({
            session,
            supplier: suppliers.length > 0 ? suppliers : undefined,
            config,
        });

        return NextResponse.json(payload, { status: 200, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/approval', method: 'GET' });
    }
}
