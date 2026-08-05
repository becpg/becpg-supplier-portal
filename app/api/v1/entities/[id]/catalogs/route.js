/**
 * `GET /api/v1/entities/{id}/catalogs` — completion and missing fields.
 *
 * Feeds two screens: the wizard's compliance step (spec §4.4, "Étape n+1 ·
 * Conformité") and the dashboard completion gauge (spec §4.3).
 *
 * Straight over `becpg/entity/catalog/node/{store_type}/{store_id}/{id}`.
 * Without `catalogId`, beCPG returns the stored `bcpg:entityScore` — formulating
 * the entity first when it is stale, which is reported as `formulated: true`.
 * With one, it formulates that single catalog on the spot.
 *
 * Query:
 *   - `catalogId`  formulate and return one catalog only
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, toApiResponse } from '@/lib/errors';
import { createBecpgClient } from '@/lib/adapters/session';
import { getEntity, getEntityCatalogs } from '@/lib/adapters/entities';

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

        const { searchParams } = new URL(request.url);
        const catalogId = searchParams.get('catalogId') || undefined;

        // Read the entity FIRST, and let beCPG refuse it.
        //
        // `becpg/entity/catalog/node/…` answers on a node the caller may not read:
        // measured against dev with a real supplier session, a product belonging to
        // another supplier returned `score: 100` with its catalog label and its
        // protected fields, while `/api/v1/entities/{id}` on the same node answered
        // 403. A compliance score is business information about someone else's
        // product — the catalogue endpoint simply is not the place where the
        // permission is enforced, so it is enforced here, by asking the authority.
        const client = createBecpgClient(session);
        await getEntity(client, id, { lists: 'none' });

        const payload = await getEntityCatalogs(client, id, { catalogId });

        const response = NextResponse.json(payload, { status: 200 });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/entities/[id]/catalogs', method: 'GET', id });
    }
}
