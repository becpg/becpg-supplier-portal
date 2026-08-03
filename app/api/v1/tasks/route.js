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
 * ## What this endpoint actually costs — measured, do not tune the wrong knob
 *
 * `pageSize` is **not** the cost driver here, unlike `/api/v1/entities`. `listMyTasks`
 * reads both sources, scans up to `MAX_TASK_SCAN` (200) candidates, enriches every one
 * of them (`becpg/project/task`, one call each, six at a time) and only then slices the
 * requested page out of the result in memory. Measured on dev.becpg.fr,
 * `supplier-test@becpg.fr`, 15 open tasks, median of four runs:
 *
 * ```
 * pageSize=10 -> 994 ms      pageSize=25 -> 998 ms      pageSize=100 -> 1010 ms
 * ```
 *
 * One call breaks down as 21 upstream requests: 1 × `api/task-instances` (428 ms),
 * 15 × `becpg/project/task` (1201 ms of wall time, overlapped) and 5 × `entity/list`
 * (507 ms). **Shrinking the page saves nothing and only throws away rows the
 * repository has already been paid to produce.** The scan is the thing to attack, and
 * it lives in `lib/adapters/tasks.js`.
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
        //
        // Only for the entities `listMyTasks` could NOT name. It already runs
        // `resolveEntityIndex()` over every scanned task — db-afts first, an index-path
        // retry for what that missed — so asking again for the ones it resolved was a
        // third query for a set already in hand. Measured on dev.becpg.fr, one call to
        // this route logged three `entity/list` lookups of the SAME 15 uuids: 85 ms
        // (`=sys:node-uuid:`), 118 ms (`ID:` retry) and 88 ms here. The name is still
        // resolved for the rows the adapter left blank, so nothing degrades — what
        // disappears is the duplicate.
        const unresolved = withEntities
            ? result.items
                .filter((task) => task.entityNodeRef && !(task.entity && task.entity.name))
                .map((task) => task.entityNodeRef)
            : [];

        if (unresolved.length > 0) {
            const entityIndex = await buildEntityIndex(client, unresolved);
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
