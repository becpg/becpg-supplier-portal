/**
 * `POST /api/v1/config/refresh` — drop this caller's cached wizard configuration.
 *
 * ## Why this endpoint exists
 *
 * `lib/adapters/wizardConfig.js` caches wizard structures and resolved column sets
 * for `WIZARD_CACHE_TTL` seconds (300 by default). That is right for data that does
 * not move — and wrong the moment it does: **every instance has its own wizards and
 * they get refreshed** (Upfield versions its assistants by year). An administrator
 * who edits a wizard in Share, or who reloads the repository form configuration
 * with `POST /becpg/form?reload=true`, has no way to tell the portal — measured on
 * a live 26.1 instance, neither the columns endpoint nor `becpg/portal/wizard`
 * publishes an `ETag`, a `Last-Modified` or a reload counter, so the portal cannot
 * notice on its own (the measurements are in the header of `wizardConfig.js`).
 *
 * Until beCPG publishes such a version — `BECPG_CONFIG_VERSION_ENDPOINT` is the
 * client, already written and gated — this route is the way out: it costs one
 * re-resolution to the caller who asks for it, and nothing to anybody else.
 *
 * ## Scope
 *
 * `(tenant, user)` by default, because resolved columns are per-user: Share reads
 * `fr.becpg.formulation.dashlet.custom.datagrid-prefs.*` to decide which columns
 * are shown, so one user's entries are the unit that means something. A supplier
 * therefore cannot make the whole tenant pay for a re-resolution.
 *
 * `{"scope": "tenant"}` widens it to the tenant and also drops the memoised
 * version token, which is what an administrator wants after a configuration
 * reload. It is reserved to accounts that hold monitoring access — the same gate
 * `/monitor` uses — because that is the portal's existing definition of "an
 * internal account, not a supplier".
 *
 * ## What it cannot do, and why the beCPG addition still matters
 *
 * The cache lives in the Node process. **This route clears the replica that
 * served it, and only that one** — with several pods behind a service, an
 * administrator would have to hit it until every replica has answered, which is
 * not a procedure anybody should be given. A version token published by beCPG has
 * no such flaw: every replica reads the same upstream value and converges without
 * being told anything. That is the argument for
 * `BECPG_CONFIG_VERSION_ENDPOINT`; this route is the stopgap, not the design.
 *
 * Body (optional): `{"scope": "user" | "tenant"}`.
 * Answer: `{"refreshed": true, "scope": "user", "entries": 12}`.
 */

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/becpg';
import { toApiResponse } from '@/lib/errors';
import { invalidateWizardConfig } from '@/lib/adapters/wizardConfig';
import { requireMonitorAccess } from '@/lib/adapters/monitor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function POST(request) {
    try {
        const session = await requireSession();

        let scope = 'user';
        try {
            const body = await request.json();
            if (body && typeof body === 'object' && body.scope === 'tenant') {
                scope = 'tenant';
            }
        }
        catch {
            // No body, or not JSON: the default scope is the right one.
        }

        const tenantId = session.tenantId || session.becpgInstance || 'default';
        const username = session.username || session.sub || '';

        if (scope === 'tenant') {
            // The gate is never re-implemented — it is called (AGENTS.md). It throws a
            // typed ForbiddenError, which `toApiResponse` renders as the portal's 403.
            await requireMonitorAccess(session);
        }

        const entries = invalidateWizardConfig(
            scope === 'tenant'
                ? { tenantId, version: true }
                : { tenantId, username },
        );

        const response = NextResponse.json({ refreshed: true, scope, entries });
        response.headers.set('Cache-Control', 'no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'config.refresh', method: 'POST' });
    }
}
