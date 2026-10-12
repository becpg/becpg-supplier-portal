/**
 * `GET /api/v1/entities/{id}/specs` — applicable product specifications
 * (cahiers des charges), read-only.
 *
 * The specifications exist in beCPG
 * (`bcpg:productSpecification` + the `bcpg:productSpecifications` association)
 * but are never shown to the supplier, who therefore discovers the requirements
 * when validation fails. They are exposed here in read-only, with a download
 * URL that goes through the portal proxy — the Alfresco ticket never reaches the
 * browser (spec §6.1).
 *
 * The portal exposes no write path on a specification, by design.
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, toApiResponse } from '@/lib/errors';
import { createBecpgClient } from '@/lib/adapters/session';
import { getEntitySpecifications } from '@/lib/adapters/entities';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

        const payload = await getEntitySpecifications(createBecpgClient(session), id);

        const response = NextResponse.json(payload, { status: 200 });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/entities/[id]/specs', method: 'GET', id });
    }
}
