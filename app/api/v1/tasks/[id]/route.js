/**
 * `GET /api/v1/tasks/{id}` — one task, with everything needed to route on it.
 *
 * `{id}` is the `pjt:taskList` nodeRef (or just its uuid). The response is the
 * documented `Task` shape of `lib/adapters/tasks.js`, always with its full
 * `deliverables[]`, so `/tasks/[id]` can dispatch to the wizard, the signature
 * viewer, the document deposit or the read-only review with no extra call.
 *
 * The deliverable URL is returned **verbatim** — never rewritten (spec §7.2, I1).
 *
 * ## `?withWizard=1` — why this route can render the wizard
 *
 * Opening a task took three browser round trips in single file: this route, then
 * `/api/v1/wizard/{entityId}` — which cannot start until this one has come back,
 * since it is the one naming the record — then the step. Each one carries the full
 * browser → portal → beCPG latency.
 *
 * With `withWizard=1` both resolutions are started together on the server: the
 * entity is known as soon as the first deliverable is read (`peekTaskEntity`,
 * 0.23 s), the wizard starts from there, and the task enrichment
 * (`api/task-instances`, 0.53 s) runs in parallel. One browser round trip
 * disappears, and the second no longer waits for the first.
 *
 * The wizard is added under `wizard`, never in place of anything else: a caller
 * that does not ask for the flag gets exactly the same payload as before. A failed
 * wizard resolution does not fail the task — the screen falls back on the separate
 * call, which is the previous behaviour.
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, NotFoundError, toApiResponse } from '@/lib/errors';
import { createBecpgClient } from '@/lib/adapters/session';
import { getTask, peekTaskEntity } from '@/lib/adapters/tasks';
import { buildEntityIndex } from '@/lib/adapters/entities';
import { getWizardState } from '@/lib/adapters/wizard';

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
        const withWizard = ['1', 'true', 'yes'].includes(
            String(new URL(request.url).searchParams.get('withWizard') || '').toLowerCase(),
        );

        // The entity first, from the memoized payload that `getTask` will read
        // again: this is what lets the wizard start without waiting for the task.
        const entityNodeRef = withWizard ? await peekTaskEntity(client, id) : null;

        const [task, wizard] = await Promise.all([
            getTask(client, id),
            entityNodeRef
                ? getWizardState(entityNodeRef, { session }).catch(() => null)
                : Promise.resolve(null),
        ]);

        if (!task) {
            throw new NotFoundError('Task not found');
        }
        if (wizard) {
            task.wizard = wizard;
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
