/**
 * `GET /api/v1/monitor/campaigns` — open referencing and renewal campaigns
 * (spec §4.2 `/monitor/campaigns`, §4.6.1 "campagnes en cours et taux de
 * réponse").
 *
 * A campaign **is** a beCPG project (`pjt:project`): the portal adds no second
 * notion of campaign, it reads the projects that are `Planned`, `InProgress` or
 * `OnHold` and presents them as the referencing / renewal pipeline.
 *
 * | Figure                | Where it comes from                                |
 * |-----------------------|----------------------------------------------------|
 * | response rate         | `pjt:completionPercent`, the progress beCPG already maintains from the task graph |
 * | campaign without answer | still at 0 % more than `campaignNoAnswerAfterDays` after its start |
 * | pending reminders     | overdue `pjt:taskList` rows of the campaign (the very rows the notification rules act on) |
 * | escalations           | campaigns silent past three notice windows          |
 *
 * `suggestedAction` on each row is the graduated follow-up of spec §4.5 —
 * `remind` first, `escalate` once the silence lasts — and it is executed by
 * `POST /api/v1/monitor/actions`, which reuses the existing mechanisms
 * (forum notification, `sendToSupplier`) and never a parallel one.
 *
 * Access: monitoring groups only, `ExternalUser` gets 403 (adapter-enforced).
 * Cost: 1 campaign scan + 1 task read (+ 1 park query when filtered) ≈ 2–3.
 *
 * Query:
 *   - filters — `family`, `subFamily`, `site`, `subsidiary`, `buyer`, `market`,
 *     `state`, `q` (park filters; a campaign is kept when one of its
 *     `bcpg:suppliers` is in the filtered park)
 *   - `states` — comma-separated project states, defaults to the open ones
 *   - `sort` — `dueDate` (default), `completion`, `age`, `name`
 *   - `page`, `pageSize` (≤ 100), `refresh=true`
 *
 * @example
 * fetch('/api/v1/monitor/campaigns?sort=age');
 * fetch('/api/v1/monitor/campaigns?states=InProgress,OnHold&buyer=jdoe');
 */

import { NextResponse } from 'next/server';
import { listCampaigns, parseMonitorFilters } from '@/lib/adapters/monitor';
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
        const states = (params.get('states') || '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);

        const payload = await listCampaigns({
            session,
            filters: parseMonitorFilters(params),
            states,
            sort: params.get('sort') || undefined,
            focus: params.get('focus') || undefined,
            page: params.get('page'),
            pageSize: params.get('pageSize'),
            lang: await resolveLang(session),
            refresh: params.get('refresh') === 'true',
        });

        return NextResponse.json(payload, { status: 200, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/monitor/campaigns', method: 'GET' });
    }
}
