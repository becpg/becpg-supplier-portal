/**
 * `GET /api/v1/entities/{id}` — one product (spec §4.2 `/products/[id]`).
 *
 * `{id}` is the entity nodeRef or its uuid. Datalists are **excluded by
 * default** (`lists=none`): the product sheet shows properties, completion and
 * documents, and the wizard loads each list on its own step through
 * `becpg/entity/datalists/...`. Pass `lists=ingList,nutList` (or `lists=all`)
 * when a caller really needs them inline.
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, NotFoundError, toApiResponse } from '@/lib/errors';
import { createBecpgClient } from '@/lib/adapters/session';
import { getEntity } from '@/lib/adapters/entities';

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
        const requested = searchParams.get('lists');
        let lists = 'none';
        if (requested === 'all') {
            lists = null;
        }
        else if (requested && requested !== 'none') {
            lists = requested;
        }

        const entity = await getEntity(createBecpgClient(session), id, { lists });
        if (!entity) {
            throw new NotFoundError('Entity not found');
        }

        const response = NextResponse.json(entity, { status: 200 });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/entities/[id]', method: 'GET', id });
    }
}
