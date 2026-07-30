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
import { getEntityCatalogs } from '@/lib/adapters/entities';

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

        const payload = await getEntityCatalogs(createBecpgClient(session), id, { catalogId });

        const response = NextResponse.json(payload, { status: 200 });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/entities/[id]/catalogs', method: 'GET', id });
    }
}
