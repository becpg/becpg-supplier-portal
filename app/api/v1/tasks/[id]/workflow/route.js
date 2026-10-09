/**
 * `POST /api/v1/tasks/{id}/workflow` — answers a workflow step (`activiti$…`):
 * `{ values: { prop_x: value, assoc_y: [nodeRef] }, transition?: string }`.
 * Without `transition` the answers are saved and the task stays open; with one,
 * the task ends on it and the workflow moves on.
 *
 * Monitoring space only: a supplier account gets a 403 (`requireMonitorAccess`).
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, BadRequestError, toApiResponse } from '@/lib/errors';
import { submitWorkflowTask } from '@/lib/adapters/workflowTasks';

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
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            throw new BadRequestError('A JSON body is required');
        }
        const values = body.values && typeof body.values === 'object' && !Array.isArray(body.values) ? body.values : {};
        const transition = typeof body.transition === 'string' && body.transition ? body.transition : null;
        return NextResponse.json(await submitWorkflowTask(session, id, { values, transition }), { status: 200 });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/tasks/[id]/workflow', method: 'POST', id });
    }
}
