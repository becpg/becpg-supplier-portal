/**
 * `GET /api/v1/tasks/{id}` — one task, with everything needed to route on it.
 *
 * `{id}` is the `pjt:taskList` nodeRef (or just its uuid), or a workflow task id
 * (`activiti$1234`) for a step no project task stands behind — then the payload
 * is the `WorkflowTaskSheet` of `lib/adapters/workflowTasks.js`. The response is the
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
import { getWizardState, stepForRemarks, withoutStepDefinitions } from '@/lib/adapters/wizard';
import { getWorkflowTask, isWorkflowTaskId } from '@/lib/adapters/workflowTasks';

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

        if (isWorkflowTaskId(id)) {
            // A workflow step with no project task behind it: its own sheet.
            const response = NextResponse.json(await getWorkflowTask(session, id), { status: 200 });
            response.headers.set('Cache-Control', 'private, no-store');
            return response;
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
        // The deliverable names the wizard (invariant I1); the state read ahead
        // was resolved from the entity type, and is dropped when they differ —
        // painting it showed the steps of another wizard, whose step ids the
        // right one does not have.
        if (wizard && (!task.wizardId || wizard.wizardId === task.wizardId)) {
            // Same rule as the wizard route: the per-step field definitions are
            // large, per-step and fetched one at a time as the supplier advances.
            task.wizard = withoutStepDefinitions(wizard);
            // Read here, while the definitions are still at hand: the wizard
            // opens a task sent back on the step its refusal names.
            task.refusalStepId = stepForRemarks(wizard, task.refusals);
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
