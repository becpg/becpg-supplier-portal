/**
 * `GET /api/v1/entities/{id}/workflows` — the active workflows of an entity and
 * their tasks, open and done (`{ workflows, openCount }`), as Share's workflow
 * view lists them.
 *
 * Monitoring space only: a supplier account gets a 403 (`requireMonitorAccess`).
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, toApiResponse } from '@/lib/errors';
import { listEntityWorkflows } from '@/lib/adapters/workflows';

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
        const response = NextResponse.json(await listEntityWorkflows({ session, entity: id }), { status: 200 });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/entities/[id]/workflows', method: 'GET', id });
    }
}
