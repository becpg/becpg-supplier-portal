/**
 * `POST /api/v1/suggestions/apply` — apply an AI suggestion.
 *
 * The body is the `suggestedChanges` (`RemoteEntity` patch) carried by the
 * suggestion, or a `plan` for a `CreationPlan`-typed suggestion:
 *
 * ```json
 * { "suggestedChanges": { "id": "…", "type": "bcpg:rawMaterial",
 *                         "attributes": { "bcpg:legalName": "ACME" } } }
 * { "plan": [ { … }, { … } ] }
 * ```
 *
 * becpg-ai writes the patch into beCPG through the remote API. The portal does
 * **not** write it itself: the repository stays the only writer, so every
 * business rule, formulation and policy applies exactly as if a human had typed
 * the value (architecture rule R2).
 *
 * A suggestion is only ever applied on explicit user action — including a
 * high-confidence one, which the UI applies optimistically but always leaves
 * revocable (spec §4.4).
 */

import { NextResponse } from 'next/server';
import { BadRequestError, toApiResponse } from '@/lib/errors';
import { requireSession } from '@/lib/becpg';
import { applyPlan, applySuggestion } from '@/lib/adapters/suggestions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function POST(request) {
    try {
        const session = await requireSession();

        let body;
        try {
            body = await request.json();
        }
        catch {
            throw new BadRequestError('Expected a JSON body');
        }
        if (!body || typeof body !== 'object') {
            throw new BadRequestError('Expected a JSON object');
        }

        if (Array.isArray(body.plan)) {
            const created = await applyPlan({ plan: body.plan, session });
            const response = NextResponse.json({ applied: true, created, appliedAt: new Date().toISOString() });
            response.headers.set('Cache-Control', 'no-store');
            return response;
        }

        // `suggestedChanges` is the documented field; a bare RemoteEntity body is
        // accepted too, because that is what becpg-ai's own controller takes.
        const patch = body.suggestedChanges || (body.id ? body : null);
        const entity = await applySuggestion({ suggestedChanges: patch, session });

        const response = NextResponse.json({
            applied: true,
            entity,
            appliedAt: new Date().toISOString(),
        });
        response.headers.set('Cache-Control', 'no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'suggestions.apply', method: 'POST' });
    }
}
