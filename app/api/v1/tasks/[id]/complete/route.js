/**
 * `POST /api/v1/tasks/{id}/complete` — validate a task.
 *
 * Thin composition over `becpg/project/complete/task`: the portal adds nothing
 * but the session and the normalised answer. Every rule that decides whether the
 * task *can* be completed — assigned wizard task, frozen lists, blocking
 * catalog, refusal branch — stays in beCPG, which remains the authority
 * (spec §6.2, rule R2). A 403 from `SupplierSecurityPlugin` is passed through
 * unchanged by `toApiResponse()`.
 *
 * Returns the refreshed task so the UI can re-render without a second call.
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, toApiResponse } from '@/lib/errors';
import { createBecpgClient } from '@/lib/adapters/session';
import { completeTask, getTask } from '@/lib/adapters/tasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * @param {Request} request
 * @param {{ params: Promise<{ id: string }> }} context
 * @returns {Promise<Response>}
 */
export async function POST(request, context) {
    const { id } = await context.params;
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }

        const client = createBecpgClient(session);
        const result = await completeTask(client, id);

        // Best effort: the task may already have moved on (or become unreadable
        // once completed) — the completion itself is what matters.
        let task = null;
        try {
            task = await getTask(client, result.nodeRef);
        }
        catch {
            task = null;
        }

        const response = NextResponse.json({
            nodeRef: result.nodeRef,
            completed: result.completed,
            task,
        }, { status: 200 });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/tasks/[id]/complete', method: 'POST', id });
    }
}
