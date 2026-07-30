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
 * | `escalate` | the same forum, with the internal referent named in the message (`pjt:projectManager` of the open project, `cm:owner` otherwise) and a `monitor:escalate` marker in the title so both front ends can filter on it. |
 * | `suspend`  | the approval status is derived and **never persisted** (spec §5.4.3), so it cannot be written. Suspension starts the client's suspension / non-conformity process through `becpg/supplier/send-to-supplier` — the same webscript as `/api/v1/process/start`, behind the **same** `PORTAL_PROCESS_TEMPLATES` allow-list. Once beCPG holds the blocking NC, the derived status becomes `suspended` on its own. |
 *
 * The allow-list is imported from the `/process/start` handler on purpose:
 * there must be exactly one list of templates a portal user may instantiate,
 * and `deny by default` must hold for the monitoring space too. With nothing
 * configured, `suspend` answers **403** and tells the UI which ids exist.
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
 * ```json
 * { "action": "suspend",
 *   "suppliers": ["workspace://SpacesStore/…"],
 *   "process": "supplier-suspension" }
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
import { MONITOR_ACTIONS, requireMonitorAccess, runMonitorActions } from '@/lib/adapters/monitor';
import { allowedProcessTemplates } from '@/app/api/v1/process/start/route';
import { isNodeRef } from '@/lib/becpg';
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
            process: body.process,
            // One allow-list for the whole portal — the very one `/process/start`
            // enforces, so nothing can be started here that could not be started
            // there (deny by default when the variable is unset).
            templates: allowedProcessTemplates(),
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
 * Lets the UI render exactly the buttons that will work: `suspend` disappears
 * when no suspension template is allow-listed, instead of failing on click.
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

        const templates = allowedProcessTemplates();
        // The allow-list holds each template twice — under its id and under its
        // nodeRef; only the human-readable ids are worth showing back.
        const processes = [...templates.keys()].filter((key) => !isNodeRef(key));

        return NextResponse.json({
            actions: [
                { id: MONITOR_ACTIONS.REMIND, available: true, mechanism: 'forum', needsMessage: true },
                { id: MONITOR_ACTIONS.ESCALATE, available: true, mechanism: 'forum', needsMessage: true },
                {
                    id: MONITOR_ACTIONS.SUSPEND,
                    available: templates.size > 0,
                    mechanism: 'sendToSupplier',
                    needsMessage: false,
                    processes,
                },
            ],
        }, { status: 200, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/monitor/actions', method: 'GET' });
    }
}
