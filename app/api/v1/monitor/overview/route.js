/**
 * `GET /api/v1/monitor/overview` — the supplier park at a glance (spec §4.6.1).
 *
 * **This is the screen Tracklab and Specright sell first** (spec §2.2, §2.3).
 * beCPG holds every number below and restitutes none of them today: a quality
 * officer has to open project after project in Share to know where the park
 * stands. Nothing here is new data — it is the same repository, read once.
 *
 * | Card                                   | How it is obtained                  |
 * |----------------------------------------|-------------------------------------|
 * | approved / in progress / to renew / suspended | derived approval (spec §5.4.3), 7 park queries |
 * | documentary compliance of the park     | 4 count queries on `bcpg:documentAspect` |
 * | documents expiring at 30 / 60 / 90 days| 1 count query per bucket            |
 * | open campaigns and response rate       | 1 query on `pjt:project` + `pjt:completionPercent` |
 * | late supplier tasks                    | 1 count query on `pjt:taskList`     |
 * | open non-conformities                  | 2 count queries on `qa:nc`          |
 *
 * Under the cards, the **top 10 suppliers at risk** with the reason (expired
 * documents, open NC, campaign without answer, score dropping) and the direct
 * action offered on each — `remind`, `escalate`, `suspend`, executed by
 * `POST /api/v1/monitor/actions`.
 *
 * Access: internal monitoring groups only. An `ExternalUser` gets **403** — the
 * check lives in the adapter (`requireMonitorAccess`), so it holds for every
 * caller and not only for this handler. Beyond the gate nothing runs as system:
 * the queries carry the caller's own ticket, so a buyer sees their perimeter and
 * nothing else (spec §4.6.7).
 *
 * Cost: ~19 upstream queries, **fixed** whatever the size of the park; memoised
 * 30 s per user and filter set. Every query actually run is echoed in `queries`
 * so a reviewer can replay it.
 *
 * Query: `family`, `subFamily`, `site`, `subsidiary`, `buyer`, `market`,
 * `state`, `q`, `refresh=true`.
 *
 * @example
 * fetch('/api/v1/monitor/overview');
 * fetch('/api/v1/monitor/overview?family=workspace://SpacesStore/…&buyer=jdoe');
 */

import { NextResponse } from 'next/server';
import { buildOverview, parseMonitorFilters } from '@/lib/adapters/monitor';
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
        const payload = await buildOverview({
            session,
            filters: parseMonitorFilters(params),
            lang: await resolveLang(session),
            refresh: params.get('refresh') === 'true',
        });

        return NextResponse.json(payload, { status: 200, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/monitor/overview', method: 'GET' });
    }
}
