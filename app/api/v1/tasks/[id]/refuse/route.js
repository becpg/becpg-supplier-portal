/**
 * `POST /api/v1/tasks/{id}/refuse` — refuse a task.
 *
 * The mirror of `…/complete`, and the same division of labour: the portal adds
 * the session and nothing else. beCPG owns the refusal branch — which tasks
 * reopen, in which order, what the project state becomes — through
 * `ProjectListPolicy` → `ProjectService.refusedTask()`, fired by the state
 * change this route writes (see `refuseTask()` for why it is a property write
 * and not a webscript call).
 *
 * A task whose workflow declares no refusal path is reported by beCPG as
 * `isRefusedEnabled: false`; the UI hides the action, and a caller that posts
 * anyway gets beCPG's own answer, unmodified.
 *
 * Returns the refreshed task so the screen can re-render without a second call.
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, toApiResponse } from '@/lib/errors';
import { createBecpgClient } from '@/lib/adapters/session';
import { getTask, refuseTask } from '@/lib/adapters/tasks';
import { BadRequestError } from '@/lib/errors';

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

        /*
         * LE MOTIF EST OBLIGATOIRE.
         *
         * Un refus renvoie la fiche au fournisseur : sans raison, il ne peut que
         * la redéposer à l'identique. La contrainte est posée ici, côté serveur,
         * et pas seulement dans la boîte de dialogue — une action qui engage
         * quelqu'un d'autre ne se valide pas sur la seule bonne volonté du client.
         */
        let comment = '';
        try {
            const body = await request.json();
            comment = typeof body?.comment === 'string' ? body.comment.trim() : '';
        }
        catch {
            comment = '';
        }
        if (!comment) {
            throw new BadRequestError('A refusal must carry a reason');
        }

        const client = createBecpgClient(session);

        // La tâche d'abord : c'est elle qui porte l'identifiant de tâche Activiti,
        // seul chemin par lequel le motif parvient au moteur.
        const before = await getTask(client, id).catch(() => null);
        const result = await refuseTask(client, id, {
            comment,
            workflowTaskId: before && before.workflowTaskId,
        });

        // Best effort, exactly as on completion: the refusal is what matters, and
        // the task may already have moved on.
        let task = null;
        try {
            task = await getTask(client, result.nodeRef);
        }
        catch {
            task = null;
        }

        const response = NextResponse.json({
            nodeRef: result.nodeRef,
            refused: result.refused,
            task,
        }, { status: 200 });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/tasks/[id]/refuse', method: 'POST', id });
    }
}
