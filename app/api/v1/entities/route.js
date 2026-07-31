/**
 * `GET /api/v1/entities` — my products (spec §4.3 "Mes produits", §5.4).
 *
 * db-afts through `becpg/remote/entity/list` (real time, no indexation lag —
 * spec §4.6.6), normalised to the documented `Entity` shape of
 * `lib/adapters/entities.js`: code, name, state, type, completion, modified,
 * supplier, and — on demand — the referencing project.
 *
 * Query:
 *   - `page`      1-based, default 1
 *   - `pageSize`  default 25, max 100
 *   - `type`      repeatable, e.g. `type=bcpg:rawMaterial&type=bcpg:finishedProduct`
 *   - `state`     repeatable, `bcpg:productState` value
 *   - `q`         free text on name / code / legal name / ERP code
 *   - `supplier`  nodeRef or uuid — delegated entry, scoped with `ANCESTOR:` on the
 *                 supplier's own space; **404** when this session cannot read that
 *                 supplier, never an empty list
 *   - `withProjects` `1` to attach the referencing project of each product
 *
 * `withProjects` costs one extra pass over my tasks: `pjt:projectEntity` is a
 * *source* association, so there is no query that goes from a product to its
 * project — the link is rebuilt from the tasks the user is assigned to.
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, toApiResponse } from '@/lib/errors';
import { createBecpgClient } from '@/lib/adapters/session';
import { listMyTasks, toNodeRef } from '@/lib/adapters/tasks';
import { ENTITY_STATES, listMyEntities, SUPPLIER_ENTITY_TYPES } from '@/lib/adapters/entities';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PAGE_SIZE = 100;

function repeatable(searchParams, name) {
    const values = searchParams.getAll(name)
        .flatMap((value) => String(value).split(','))
        .map((value) => value.trim())
        .filter(Boolean);
    return values.length > 0 ? values : undefined;
}

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function GET(request) {
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, Number(searchParams.get('page')) || 1);
        const pageSize = Math.max(1, Math.min(Number(searchParams.get('pageSize')) || 25, MAX_PAGE_SIZE));

        const requestedTypes = repeatable(searchParams, 'type');
        const requestedStates = repeatable(searchParams, 'state');
        const supplier = searchParams.get('supplier');
        const withProjects = ['1', 'true', 'yes'].includes(String(searchParams.get('withProjects') || '').toLowerCase());

        const client = createBecpgClient(session);

        let projectsByEntity;
        if (withProjects) {
            const { items } = await client.memo('tasks', () => listMyTasks(client, { pageSize: 50 }));
            projectsByEntity = items.reduce((accumulator, task) => {
                if (task.entityNodeRef && task.project.nodeRef && !accumulator[task.entityNodeRef]) {
                    accumulator[task.entityNodeRef] = {
                        nodeRef: task.project.nodeRef,
                        name: task.project.name,
                        state: task.state,
                    };
                }
                return accumulator;
            }, {});
        }

        const result = await listMyEntities(client, {
            page,
            pageSize,
            types: requestedTypes
                ? requestedTypes.filter((type) => SUPPLIER_ENTITY_TYPES.includes(type))
                : undefined,
            states: requestedStates
                ? requestedStates.filter((state) => ENTITY_STATES.includes(state))
                : undefined,
            q: searchParams.get('q') || undefined,
            supplierNodeRef: supplier ? toNodeRef(supplier) : undefined,
            projectsByEntity,
        });

        const response = NextResponse.json(result, { status: 200 });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/entities', method: 'GET' });
    }
}
