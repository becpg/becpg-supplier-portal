/**
 * `GET|PUT|POST|DELETE /api/v1/wizard/{entityId}/step/{stepId}` — one step's
 * data, and every mutation of it.
 *
 * **GET** returns everything the step needs to render. The shape depends on the
 * step type (`lib/adapters/wizard.js` → `getStepData`):
 *
 * ```
 * form            { step, definition: { tabs, sets, fields } }   // values included
 * entityDataList  { step, columns, rowForm, rows, total, page, pageSize }
 * survey          { step, listId, questions, answers, disabled } // NOT a datalist
 * documents       { step, folderNodeRef, documents }
 * ```
 *
 * A `survey` step used to be served as one more `entityDataList`, one row per
 * question. It is now the decision tree `becpg/survey` returns: the questions
 * carry their own ordering and their `survey:nextQuestion` gates, which a flat
 * row list cannot express. It therefore has no `columns`, `rows` or `total`.
 *
 * The `step` object is the one computed by `GET /api/v1/wizard/{entityId}`, with
 * the same `frozen` / `readOnly` values. It is echoed here so a deep link
 * straight to a step is as safe as arriving through the wizard: the state is
 * still computed from the single server-side security call, never inferred.
 *
 * **PUT** is the autosave (spec §4.4, F2): it writes one step and answers with
 * `savedAt`, which the UI shows as "saved at HH:MM". A frozen or read-only step
 * is refused with a 400 that names the reason, rather than letting the write
 * fail three layers down with an opaque 403.
 *
 * Body of PUT:
 * ```json
 * { "values": { "bcpg:legalName": "ACME" },
 *   "nodeRef": "workspace://SpacesStore/…",   // datalist row being updated
 *   "formulate": true }                        // run the step's nextStepWebScript
 * ```
 *
 * **DELETE** removes datalist rows (`{ "nodeRefs": ["workspace://…"] }`) and
 * **POST** reorders them (`{ "action": "reorder", "nodeRefs": […], "direction":
 * "up"|"down" }`).
 *
 * Those two used to be issued by the browser straight onto the generic beCPG
 * proxy (`DELETE /api/v1/becpg/slingshot/datalists/action/items` and
 * `POST /api/v1/becpg/becpg/entity/datalists/sort/node/…`), the way Share's own
 * datagrid does. That left the **frozen state enforced by the UI only**: a
 * supplier with a console could delete a row of a list their customer had
 * validated, because `SupplierSecurityPlugin` grants write access per *entity*,
 * not per list, and knows nothing about `datalists[].state === "Valid"`.
 * Routing them through the step means all four verbs share the same gate,
 * `assertStepWritable()` — the UI is no longer the only guard.
 */

import { NextResponse } from 'next/server';
import { BadRequestError, toApiResponse } from '@/lib/errors';
import { requireSession, upstreamLang } from '@/lib/becpg';
import {
    deleteStepRows,
    findStep,
    getStepData,
    getWizardState,
    reorderStepRows,
    runNextStepWebScript,
    bulkEditStepRows,
    saveStep,
    invalidateWizardState,
} from '@/lib/adapters/wizard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Reads the shared query parameters.
 *
 * Async because the locale is one of them and it comes from the portal's own
 * language cookie, which Next.js hands over asynchronously.
 *
 * @param {Request} request
 * @returns {Promise<Object>}
 */
async function readOptions(request) {
    const url = new URL(request.url);
    return {
        wizardId: url.searchParams.get('wizardId') || undefined,
        siteId: url.searchParams.get('siteId') || undefined,
        // The field labels of this step. See `upstreamLang`.
        locale: url.searchParams.get('locale') || await upstreamLang(),
        page: url.searchParams.get('page') || undefined,
        pageSize: url.searchParams.get('pageSize') || undefined,
        sort: url.searchParams.get('sort') || undefined,
        // What the screen already knows about the assignment: asking again costs 5 s
        // per tab (see `getWizardState`). Same mechanism as Share.
        knownTaskAssigned: url.searchParams.get('taskAssigned') === '1' ? true
            : url.searchParams.get('taskAssigned') === '0' ? false : undefined,
    };
}

/**
 * @param {Request} request
 * @param {{ params: Promise<{ entityId: string, stepId: string }> }} context
 * @returns {Promise<Response>}
 */
export async function GET(request, context) {
    const { entityId, stepId } = await context.params;
    try {
        const session = await requireSession();
        const options = await readOptions(request);

        const state = await getWizardState(entityId, { ...options, session });
        const data = await getStepData(state, stepId, { ...options, session });

        const response = NextResponse.json({
            wizardId: state.wizardId,
            entity: state.entity,
            readOnly: state.readOnly,
            readOnlyReason: state.readOnlyReason,
            ...data,
        });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'wizard.step', method: 'GET', entityId, stepId });
    }
}

/**
 * Reads the request body as a JSON object.
 *
 * @param {Request} request
 * @returns {Promise<Object>}
 */
async function readJsonObject(request) {
    let body;
    try {
        body = await request.json();
    }
    catch {
        throw new BadRequestError('Expected a JSON body');
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new BadRequestError('Expected a JSON object');
    }
    return body;
}

/**
 * Autosave of one step.
 *
 * @param {Request} request
 * @param {{ params: Promise<{ entityId: string, stepId: string }> }} context
 * @returns {Promise<Response>}
 */
export async function PUT(request, context) {
    const { entityId, stepId } = await context.params;
    try {
        const session = await requireSession();
        const options = await readOptions(request);

        const body = await readJsonObject(request);

        const state = await getWizardState(entityId, { ...options, session });
        const result = await saveStep(state, stepId, body, { ...options, session });

        // The write changed the entity and the state of its lists: purge AFTER,
        // otherwise the `getWizardState` above has just re-memoized the previous state.
        invalidateWizardState(entityId);

        // The configuration can ask for a reformulation (or a folder resolution)
        // between two steps. It stays opt-in and is never allowed to fail the
        // save the user just made: the value is persisted either way.
        let nextStep = null;
        if (body.formulate !== false) {
            try {
                nextStep = await runNextStepWebScript(findStep(state, stepId), state.entity.nodeRef, { session });
            }
            catch (error) {
                nextStep = { error: error?.code || 'upstream' };
            }
        }

        const response = NextResponse.json({ ...result, nextStep });
        response.headers.set('Cache-Control', 'no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'wizard.step', method: 'PUT', entityId, stepId });
    }
}

/**
 * Actions on a step: `reorder` (datalist rows) and `nextStep`.
 *
 * **Why `nextStep` exists.** A step can declare a `nextStepWebScript` that beCPG
 * expects to run when the supplier leaves it — either
 * `becpg/remote/formulate?…` or `becpg/project/path?…&path=SupplierDocuments`,
 * which resolves (and creates) the folder the *documents* step then writes into.
 * `PUT` already runs it, but only when something was saved; a supplier who reads
 * a step and moves on saves nothing, and the script never ran. The wizard filled
 * that hole client-side by calling `POST …/formulate` on every step change —
 * which runs a formulation *whatever the step declared*, so the folder resolution
 * never happened and every navigation cost an extra formulation it had not been
 * asked for.
 *
 * This action runs **the script the configuration declared**, and nothing else.
 *
 * @param {Request} request
 * @param {{ params: Promise<{ entityId: string, stepId: string }> }} context
 * @returns {Promise<Response>}
 */
export async function POST(request, context) {
    const { entityId, stepId } = await context.params;
    try {
        const session = await requireSession();
        const options = await readOptions(request);
        const body = await readJsonObject(request);

        if (body.action === 'nextStep') {
            const state = await getWizardState(entityId, { ...options, session });
            // A read-only wizard triggers nothing: both templates write to the
            // repository (a formulation recomputes and stores, a path resolution
            // creates the folder), and neither belongs on a sheet the supplier is
            // only allowed to read.
            if (state.readOnly) {
                const denied = NextResponse.json({ nextStep: null, skipped: 'readOnly' });
                denied.headers.set('Cache-Control', 'no-store');
                return denied;
            }
            let nextStep = null;
            try {
                nextStep = await runNextStepWebScript(findStep(state, stepId), state.entity.nodeRef, { session });
            }
            catch (error) {
                // Same rule as on save: a background step hook must never be the
                // reason a supplier cannot move to the next step.
                nextStep = { error: error?.code || 'upstream' };
            }
            const response = NextResponse.json({ nextStep });
            response.headers.set('Cache-Control', 'no-store');
            return response;
        }

        if (body.action === 'bulkEdit') {
            const state = await getWizardState(entityId, { ...options, session });
            const result = await bulkEditStepRows(
                state,
                stepId,
                { nodeRefs: body.nodeRefs || body.nodeRef, values: body.values },
                { ...options, session },
            );
            invalidateWizardState(entityId);

            const response = NextResponse.json(result);
            response.headers.set('Cache-Control', 'no-store');
            return response;
        }

        if (body.action !== 'reorder') {
            throw new BadRequestError('Unsupported action', { details: { action: body.action || null } });
        }

        const state = await getWizardState(entityId, { ...options, session });
        const result = await reorderStepRows(
            state,
            stepId,
            { nodeRefs: body.nodeRefs || body.nodeRef, direction: body.direction },
            { ...options, session },
        );

        // The write changed the entity and the state of its lists: purge AFTER,
        // otherwise the `getWizardState` above has just re-memoized the previous state.
        invalidateWizardState(entityId);

        const response = NextResponse.json(result);
        response.headers.set('Cache-Control', 'no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'wizard.step', method: 'POST', entityId, stepId });
    }
}

/**
 * Deletes rows of a datalist step.
 *
 * @param {Request} request
 * @param {{ params: Promise<{ entityId: string, stepId: string }> }} context
 * @returns {Promise<Response>}
 */
export async function DELETE(request, context) {
    const { entityId, stepId } = await context.params;
    try {
        const session = await requireSession();
        const options = await readOptions(request);
        const body = await readJsonObject(request);

        const state = await getWizardState(entityId, { ...options, session });
        const result = await deleteStepRows(
            state,
            stepId,
            { nodeRefs: body.nodeRefs || body.nodeRef },
            { ...options, session },
        );

        // The write changed the entity and the state of its lists: purge AFTER,
        // otherwise the `getWizardState` above has just re-memoized the previous state.
        invalidateWizardState(entityId);

        const response = NextResponse.json(result);
        response.headers.set('Cache-Control', 'no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'wizard.step', method: 'DELETE', entityId, stepId });
    }
}
