/**
 * `GET /api/v1/wizard/{entityId}` — the wizard's complete state, in one call.
 *
 * This route is the answer to bug #25928 (spec §2ter.3): the read-only and
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
import { requireSession } from '@/lib/becpg';
import { getWizardState } from '@/lib/adapters/wizard';

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
            locale: url.searchParams.get('locale') || request.headers.get('accept-language') || undefined,
            session,
        });

        const response = NextResponse.json(state);
        // Per-user, permission-dependent state: never cached anywhere.
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'wizard', method: 'GET', entityId });
    }
}
