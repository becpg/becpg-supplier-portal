/**
 * `GET /api/v1/tasks` — my tasks (filters, sort, pagination).
 *
 * Merges the Alfresco workflow tasks and the `pjt:taskList` items assigned to
 * the connected user, and normalises them into the documented `Task` shape
 * (see `lib/adapters/tasks.js`).
 *
 * Each item carries its **verbatim** deliverable URL plus the parsed `type`,
 * `wizardId` and `entityNodeRef`, so the UI routes straight to
 * `/tasks/{id}` → wizard / signature / document / review without a second call
 * and without ever rewriting the URL (spec §7.2, invariant I1).
 *
 * Query:
 *   - `page`      1-based, default 1
 *   - `pageSize`  default 25, max 100
 *   - `type`      `wizard` | `signature` | `document` | `review`
 *   - `state`     `in_progress` (default) | `completed`
 *   - `late`      `true` | `false`
 *   - `entity`    nodeRef or uuid — only the tasks of that entity
 *   - `q`         free text on the task / product name / code
 *   - `sort`      `due` (default) | `priority` | `name` | `type`
 *   - `withEntities` `0` to skip resolving the product name/code (on by default;
 *                    it costs one extra db-afts query for the whole page)
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, toApiResponse } from '@/lib/errors';
import { createBecpgClient } from '@/lib/adapters/session';
import { listMyTasks, TASK_TYPES, toNodeRef } from '@/lib/adapters/tasks';
import { buildEntityIndex } from '@/lib/adapters/entities';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PAGE_SIZE = 100;
const SORTS = ['due', 'priority', 'name', 'type'];
const STATES = ['in_progress', 'completed'];

function booleanParam(value) {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }
    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
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
        const rawType = searchParams.get('type');
        const rawState = searchParams.get('state');
        const rawSort = searchParams.get('sort');
        const entity = searchParams.get('entity');
        const withEntities = booleanParam(searchParams.get('withEntities')) !== false;

        const client = createBecpgClient(session);

        const options = {
            page,
            pageSize,
            type: rawType && Object.values(TASK_TYPES).includes(rawType) ? rawType : undefined,
            state: rawState && STATES.includes(rawState) ? rawState : 'in_progress',
            late: booleanParam(searchParams.get('late')),
            entityNodeRef: entity ? toNodeRef(entity) : undefined,
            q: searchParams.get('q') || undefined,
            sort: rawSort && SORTS.includes(rawSort) ? rawSort : 'due',
        };

        let result = await listMyTasks(client, options);

        // Second pass: resolve the product name/code of the page being returned,
        // so the list shows "MP001 — Farine T55" and not a bare nodeRef.
        if (withEntities && result.items.length > 0) {
            const entityIndex = await buildEntityIndex(
                client,
                result.items.map((task) => task.entityNodeRef),
            );
            result = {
                ...result,
                items: result.items.map((task) => {
                    const meta = task.entityNodeRef ? entityIndex[task.entityNodeRef] : null;
                    return meta
                        ? { ...task, entity: { ...task.entity, name: meta.name, code: meta.code, type: meta.type } }
                        : task;
                }),
            };
        }

        const response = NextResponse.json(result, { status: 200 });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/tasks', method: 'GET' });
    }
}
