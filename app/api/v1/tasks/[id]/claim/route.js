/**
 * `POST /api/v1/tasks/{id}/claim` — takes a pooled workflow step (`activiti$…`);
 * `{ release: true }` hands it back to the pool.
 *
 * Monitoring space only: a supplier account gets a 403 (`requireMonitorAccess`).
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, BadRequestError, toApiResponse } from '@/lib/errors';
import { claimWorkflowTask } from '@/lib/adapters/workflowTasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * @param {Request} request
 * @param {{params: Promise<{id: string}>}} context
 * @returns {Promise<Response>}
 */
export async function POST(request, context) {
    const { id } = await context.params;
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }
        // No body at all means "claim"; a body that is not JSON is refused, not read as
        // an empty one: that would turn a release request into a claim.
        const raw = await request.text();
        let body = {};
        if (raw.trim()) {
            try {
                body = JSON.parse(raw);
            }
            catch {
                throw new BadRequestError('The request body is not valid JSON');
            }
        }
        return NextResponse.json(await claimWorkflowTask(session, id, { release: body?.release === true }), { status: 200 });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/tasks/[id]/claim', method: 'POST', id });
    }
}
