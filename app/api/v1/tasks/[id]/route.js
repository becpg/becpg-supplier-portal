/**
 * `GET /api/v1/tasks/{id}` — one task, with everything needed to route on it.
 *
 * `{id}` is the `pjt:taskList` nodeRef (or just its uuid). The response is the
 * documented `Task` shape of `lib/adapters/tasks.js`, always with its full
 * `deliverables[]`, so `/tasks/[id]` can dispatch to the wizard, the signature
 * viewer, the document deposit or the read-only review with no extra call.
 *
 * The deliverable URL is returned **verbatim** — never rewritten (spec §7.2, I1).
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, NotFoundError, toApiResponse } from '@/lib/errors';
import { createBecpgClient } from '@/lib/adapters/session';
import { getTask } from '@/lib/adapters/tasks';
import { buildEntityIndex } from '@/lib/adapters/entities';

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

        const client = createBecpgClient(session);
        const task = await getTask(client, id);
        if (!task) {
            throw new NotFoundError('Task not found');
        }

        if (task.entityNodeRef) {
            const index = await buildEntityIndex(client, [task.entityNodeRef]);
            const meta = index[task.entityNodeRef];
            if (meta) {
                task.entity = { ...task.entity, name: meta.name, code: meta.code, type: meta.type };
            }
        }

        const response = NextResponse.json(task, { status: 200 });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/tasks/[id]', method: 'GET', id });
    }
}
