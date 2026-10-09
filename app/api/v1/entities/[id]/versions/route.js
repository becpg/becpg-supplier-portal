/**
 * `GET /api/v1/entities/{id}/versions` — the version history of an entity,
 * newest first (`{ entity, versions }`).
 *
 * `GET /api/v1/entities/{id}/versions?version=<version nodeRef>` — one version,
 * read-only: `{ version, name, attributes, lists }`, the properties and datalists
 * as beCPG froze them. A nodeRef that is not in the entity's own history is a 404.
 *
 * Monitoring space only: a supplier account gets a 403 (`requireMonitorAccess`).
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, toApiResponse } from '@/lib/errors';
import { getEntityVersion, listEntityVersions } from '@/lib/adapters/versions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * @param {Request} request
 * @param {{params: Promise<{id: string}>}} context
 * @returns {Promise<Response>}
 */
export async function GET(request, context) {
    const { id } = await context.params;
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }
        const version = new URL(request.url).searchParams.get('version');
        const payload = version
            ? await getEntityVersion({ session, entity: id, version })
            : await listEntityVersions({ session, entity: id });
        const response = NextResponse.json(payload, { status: 200 });
        // A version never changes once frozen; the history does, with the next one.
        response.headers.set('Cache-Control', version ? 'private, max-age=300' : 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/entities/[id]/versions', method: 'GET', id });
    }
}
