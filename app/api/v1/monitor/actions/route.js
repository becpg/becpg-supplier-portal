/**
 * `POST /api/v1/monitor/actions` — bulk reminder, escalation, suspension
 * (spec §4.6.1 "l'action directe — relancer, escalader, suspendre").
 *
 * ## The rule that shapes this endpoint
 *
 * The monitoring space **writes nothing of its own** (spec §4.6.7): it triggers
 * actions that go through mechanisms beCPG already owns. So there is no new
 * notification engine, no `bcpg:approvalStatus` property, no portal-side state —
 * which is also what keeps the two portals interchangeable (spec §7.1).
 *
 * | Action     | Mechanism reused                                              |
 * |------------|---------------------------------------------------------------|
 * | `remind`   | the Alfresco **forum** of the supplier node — the exact thread `GET/POST /api/v1/messages` reads and Share renders. The message lands in the supplier's portal, and Alfresco's own subscriptions mail it out. |
 * | `escalate` | the forum of the supplier's **open project**, never the supplier's own thread (the supplier reads it), with the internal referent named in the message (`pjt:projectManager`, `cm:owner` otherwise) and a `monitor:escalate` marker in the title. A supplier with no open project gets `ok: false`, `error: "noOpenProject"`, and nothing is posted. |
 * | `suspend`  | **unavailable**. The approval status is derived and never persisted (spec §5.4.3), so a suspension can only start a process, and beCPG evaluates no supplier account on a `bcpg:supplier` record. `GET` declares it `available: false` with its reason, and `POST` answers each target with that same reason. |
 *
 * ## Semantics
 *
 * Bulk: every target is attempted, the outcome is reported per target, and one
 * failure never rolls back the others. Each nodeRef is checked against the
 * caller's perimeter with **one** db-afts query before any write — a supplier
 * the session cannot read is rejected, not written to.
 *
 * Access: monitoring groups only, an `ExternalUser` gets 403 (adapter-enforced).
 * Cost: 1 guard query + 1 write per target.
 *
 * Body:
 * ```json
 * { "action": "remind",
 *   "suppliers": ["workspace://SpacesStore/…", "workspace://SpacesStore/…"],
 *   "message": "Merci de déposer votre certificat IFS avant le 30/09." }
 * ```
 *
 * Answer:
 * ```json
 * { "action": "remind",
 *   "results": [{ "supplier": "workspace://…", "name": "…", "ok": true, "mechanism": "forum" }],
 *   "summary": { "requested": 2, "succeeded": 2, "failed": 0 },
 *   "executedAt": "2026-07-29T09:12:00.000Z" }
 * ```
 *
 * @example
 * fetch('/api/v1/monitor/actions', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ action: 'remind', suppliers: [ref], message: '…' }),
 * });
 */

import { NextResponse } from 'next/server';
import {
    MONITOR_ACTIONS,
    SUSPEND_UNAVAILABLE,
    requireMonitorAccess,
    runMonitorActions,
} from '@/lib/adapters/monitor';
import { AuthError, BadRequestError, toApiResponse } from '@/lib/errors';
import { getLiveSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, private' };

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function POST(request) {
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }

        let body;
        try {
            body = await request.json();
        }
        catch {
            throw new BadRequestError('Expected a JSON body');
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            throw new BadRequestError('Expected a JSON object');
        }

        const payload = await runMonitorActions({
            session,
            action: body.action,
            suppliers: Array.isArray(body.suppliers) ? body.suppliers : [],
            message: body.message,
        });

        return NextResponse.json(payload, { status: 200, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/monitor/actions', method: 'POST' });
    }
}

/**
 * `GET /api/v1/monitor/actions` — the actions this instance actually offers.
 *
 * Lets the UI render exactly the buttons that will work: `suspend` is declared
 * unavailable, with the reason, instead of failing on click.
 *
 * @returns {Promise<Response>}
 */
export async function GET() {
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }

        // The adapter's own gate: an ExternalUser must not even learn the shape
        // of the monitoring actions.
        await requireMonitorAccess(session);

        return NextResponse.json({
            actions: [
                { id: MONITOR_ACTIONS.REMIND, available: true, mechanism: 'forum', needsMessage: true },
                {
                    id: MONITOR_ACTIONS.ESCALATE,
                    available: true,
                    mechanism: 'projectForum',
                    needsMessage: true,
                },
                {
                    id: MONITOR_ACTIONS.SUSPEND,
                    available: false,
                    reason: SUSPEND_UNAVAILABLE.reason,
                    message: SUSPEND_UNAVAILABLE.message,
                    mechanism: null,
                    needsMessage: false,
                    processes: [],
                },
            ],
        }, { status: 200, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/monitor/actions', method: 'GET' });
    }
}
