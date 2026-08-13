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
 * ## `?withWizard=1` — pourquoi cette route peut rendre l'assistant
 *
 * Ouvrir une tâche demandait trois allers-retours navigateur en file indienne :
 * cette route, puis `/api/v1/wizard/{entityId}` — qui ne peut partir qu'une fois
 * celle-ci revenue, puisque c'est elle qui nomme la fiche — puis l'étape. Chacun
 * porte la latence complète navigateur → portail → beCPG.
 *
 * Avec `withWizard=1` les deux résolutions sont lancées **ensemble** côté
 * serveur : l'entité est connue dès le premier livrable lu (`peekTaskEntity`,
 * 0,23 s), l'assistant part là, et l'enrichissement de la tâche
 * (`api/task-instances`, 0,53 s) court en parallèle. Un aller-retour navigateur
 * disparaît, et le second n'attend plus le premier.
 *
 * L'assistant est ajouté sous `wizard`, jamais à la place de quoi que ce soit :
 * un appelant qui ne demande pas le drapeau reçoit exactement la même charge
 * utile qu'avant. Un échec de la résolution de l'assistant ne fait pas échouer la
 * tâche — l'écran retombe sur l'appel séparé, qui est le comportement d'avant.
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

        // L'entité d'abord, sur la charge utile mémoïsée que `getTask` relira :
        // c'est ce qui permet de lancer l'assistant sans attendre la tâche.
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
