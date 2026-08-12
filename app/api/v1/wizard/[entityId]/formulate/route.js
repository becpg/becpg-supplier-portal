/**
 * `POST /api/v1/wizard/{entityId}/formulate` — reformulation.
 *
 * Straight proxy onto `becpg/remote/formulate` (doc/becpg-api-contracts.md §6).
 * The business logic stays in beCPG; the portal only holds the credential and
 * scopes the call to an entity the user may actually write (architecture rule
 * R2).
 *
 * Two things the UI must know:
 *
 *   - formulation is **slow** — the caller is expected to run it in the
 *     background and to keep the form usable meanwhile (spec §4.4);
 *   - it is **never retried** by the portal: replaying a formulation is not free
 *     and not obviously idempotent from the user's point of view.
 *
 * A read-only wizard refuses the call: reformulating an entity the supplier may
 * not write would rewrite computed characteristics behind their back.
 */

import { NextResponse } from 'next/server';
import { ForbiddenError, toApiResponse } from '@/lib/errors';
import { requireSession } from '@/lib/becpg';
import { formulate, getWizardState, invalidateWizardState } from '@/lib/adapters/wizard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Formulation can legitimately take a while; give it its own budget. */
const FORMULATE_TIMEOUT = Number(process.env.BECPG_FORMULATE_TIMEOUT || 120000);

/**
 * @param {Request} request
 * @param {{ params: Promise<{ entityId: string }> }} context
 * @returns {Promise<Response>}
 */
export async function POST(request, context) {
    const { entityId } = await context.params;
    try {
        // L'ecriture change l'etat des listes : l'etat memorise doit tomber.
        const session = await requireSession();
        const url = new URL(request.url);

        const state = await getWizardState(entityId, {
            wizardId: url.searchParams.get('wizardId') || undefined,
            siteId: url.searchParams.get('siteId') || undefined,
            locale: url.searchParams.get('locale') || undefined,
            session,
        });

        if (state.readOnly) {
            throw new ForbiddenError('This entity is read-only: it cannot be reformulated', {
                details: { reason: state.readOnlyReason },
            });
        }

        const started = Date.now();
        const result = await formulate(state.entity.nodeRef, { session, timeout: FORMULATE_TIMEOUT });

        // La formulation recalcule les scores et l'état des listes : purger APRÈS.
        invalidateWizardState(entityId);

        const response = NextResponse.json({
            entity: state.entity,
            duration: Date.now() - started,
            formulatedAt: new Date().toISOString(),
            result,
        });
        response.headers.set('Cache-Control', 'no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'wizard.formulate', method: 'POST', entityId });
    }
}
