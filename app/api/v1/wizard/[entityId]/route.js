/**
 * `GET /api/v1/wizard/{entityId}` — the wizard's complete state, in one call.
 *
 * This route is the answer to bug #25928: the read-only and
 * frozen state of **every** step is computed server-side, from a single
 * `becpg/security/entitylists/check` call, and returned whole. The UI renders
 * that state and never re-derives step validity — not from loading order, not
 * from the DOM, not from a second call.
 *
 * Query parameters:
 *   - `wizardId` — force a wizard instead of deriving it from the entity type;
 *   - `siteId`   — Share site scoping the configuration cascade;
 *   - `locale`   — user locale, forwarded to beCPG for the labels.
 *
 * Response: see `lib/adapters/wizard.js` → `getWizardState`.
 */

import { NextResponse } from 'next/server';
import { toApiResponse } from '@/lib/errors';
import { requireSession, upstreamLang } from '@/lib/becpg';
import { getWizardState, withoutStepDefinitions } from '@/lib/adapters/wizard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * @param {Request} request
 * @param {{ params: Promise<{ entityId: string }> }} context
 * @returns {Promise<Response>}
 */
export async function GET(request, context) {
    const { entityId } = await context.params;
    try {
        const session = await requireSession();
        const url = new URL(request.url);

        const state = await getWizardState(entityId, {
            wizardId: url.searchParams.get('wizardId') || undefined,
            siteId: url.searchParams.get('siteId') || undefined,
            // The step names and the form definitions come back in this
            // language — see `upstreamLang` for why it is not `Accept-Language`.
            locale: url.searchParams.get('locale') || await upstreamLang(),
            session,
        });

        // The per-step field definitions belong to `…/step/{stepId}`, not here.
        const response = NextResponse.json(withoutStepDefinitions(state));
        // Per-user, permission-dependent state: never cached anywhere.
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'wizard', method: 'GET', entityId });
    }
}
