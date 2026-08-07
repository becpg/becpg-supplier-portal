/**
 * `GET /api/v1/monitor/campaigns/{id}` — one referencing campaign, opened.
 *
 * `{id}` is the project's nodeRef, url-encoded — the same identifier
 * `/api/v1/monitor/campaigns` already publishes on every row as `href`.
 *
 * ```json
 * { "campaign": { "nodeRef", "name", "code", "state", "completion",
 *                 "startedAt", "dueDate", "isLate", "manager", "suppliers" },
 *   "tasks":    [ { "nodeRef", "name", "state", "dueDate", "late", "assignees" } ],
 *   "entities": [ { "nodeRef", "name", "code", "type", "href", "readable" } ] }
 * ```
 *
 * The `campaign` block is the **same row** the list renders (`toCampaignRow`), so
 * a completion rate can never differ between the two screens. What the detail
 * adds is what a list cannot carry: the current tasks with their assignees, and
 * the entities the project is about — each with the portal route that opens it,
 * chosen from the entity's type rather than assumed to be a product.
 *
 * Access: monitoring groups only, `ExternalUser` gets 403. The gate is
 * `requireMonitorAccess()` inside the adapter, so this handler cannot forget it.
 * A `pjt:project` that is not a *supplier* campaign answers 404: the aspect
 * clause is part of the lookup, exactly as it is on the list.
 *
 * Cost: 3 db-afts queries (the project, its current tasks, its entities).
 *
 * @example
 * fetch(`/api/v1/monitor/campaigns/${encodeURIComponent(nodeRef)}`);
 */

import { NextResponse } from 'next/server';
import { getCampaign } from '@/lib/adapters/monitor';
import { AuthError, toApiResponse } from '@/lib/errors';
import { getLiveSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, private' };

/**
 * @param {Request} request
 * @param {{ params: Promise<{ id: string }> }} context
 * @returns {Promise<Response>}
 */
export async function GET(request, context) {
    const { id } = await context.params;
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }

        const payload = await getCampaign({ session, campaignRef: decodeURIComponent(id) });
        return NextResponse.json(payload, { status: 200, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/monitor/campaigns/[id]', method: 'GET' });
    }
}
