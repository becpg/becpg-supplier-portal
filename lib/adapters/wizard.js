/**
 * Wizard state — **computed once, server-side, returned whole**.
 *
 * ## The bug this module exists to close (#25928, spec §2ter.3)
 *
 * Share's `wizard-mgr.js` calls `becpg/security/entitylists/check` **per step**,
 * as the step is opened, and re-derives that step's validity from the answer.
 * The consequences are exactly what the ticket describes: the read-only state of
 * a step depends on the order in which steps were loaded, a list frozen by the
 * client can appear editable, and the "task assigned" flag is memoised in a DOM
 * component that a re-render resets.
 *
 * The portal does the opposite, and this is the single rule of the module:
 *
 * > `GET /api/v1/wizard/{entityId}` performs **one** security call, computes
 * > **every** step's `frozen` / `readOnly` from it, and returns the complete
 * > state in one response. The UI renders that state. **The UI never re-derives
 * > step validity**, from loading order or from anything else.
 *
 * ## Where each field comes from
 *
 * | Field | Source |
 * |---|---|
 * | `wizardId`, `draft`, `comments`, `enforceTask`, `skipSecurityRules`, step list | `lib/adapters/wizardConfig.js` (Share endpoint, or DEFAULT_WIZARDS) |
 * | `accessMode`, `hasAssignedTask`, `datalists[].state` | `becpg/security/entitylists/check/{entity}` (§4) |
 * | `entity` | `becpg/remote/entity?nodeRef=` (§6) |
 * | `frozen` per step | `datalists[].state === "Valid"`, looked up by the step's pseudo-list name: `View-properties` for a `form` step, `View-documents` for a `documents` step, `listId` otherwise |
 *
 * `accessMode` is beCPG's verdict: `1` = READ, `2` = WRITE. The portal never
 * overrides it — beCPG stays the authority on permissions (spec §6.2).
 *
 * Server only.
 */

import {
    getJson,
    isNodeRef,
    nodeRefToPath,
    pathToNodeRef,
    requireSession,
} from '@/lib/becpg';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import {
    createContext,
    getWizard,
    parseListId,
    wizardIdForType,
} from '@/lib/adapters/wizardConfig';
import { applyValues, getFormDefinition, saveForm } from '@/lib/adapters/forms';
import {
    columnsFromDefinition,
    createItem,
    deleteItem,
    getColumns,
    getEntityListsState,
    getRows,
    requestFields,
    resolveDataList,
    sortItem,
    updateItem,
} from '@/lib/adapters/datalists';

/** `accessMode` values returned by `becpg/security/entitylists/check`. */
export const ACCESS_MODE = { NONE: 0, READ: 1, WRITE: 2 };

/** A datalist in this state has been validated by the client and is frozen. */
export const FROZEN_STATE = 'Valid';

/** Folder holding the documents a supplier must deposit. */
export const SUPPLIER_DOCUMENTS_PATH = 'SupplierDocuments';

/* -------------------------------------------------------------------------- */
/* Entity                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Accepts a nodeRef, a `workspace/SpacesStore/<uuid>` path or a bare UUID and
 * returns a nodeRef.
 *
 * @param {string} entityId
 * @returns {string} `workspace://SpacesStore/<uuid>`
 * @throws {BadRequestError}
 */
export function toEntityNodeRef(entityId) {
    const value = String(entityId || '').trim();
    if (!value) {
        throw new BadRequestError('Missing entity id');
    }
    if (isNodeRef(value)) {
        return value;
    }
    if (value.includes('/')) {
        return pathToNodeRef(value);
    }
    if (/^[A-Za-z0-9-]{8,}$/.test(value)) {
        return `workspace://SpacesStore/${value}`;
    }
    throw new BadRequestError('Invalid entity id');
}

/**
 * Reads the entity and keeps the summary the wizard header needs.
 *
 * @param {string} nodeRef
 * @param {Object} [options]
 * @param {Object} [options.session]
 * @returns {Promise<{nodeRef: string, id: string, type: string, name: string, code: ?string, erpCode: ?string, state: ?string, siteId: ?string, attributes: Object, raw: Object}>}
 */
export async function getEntity(nodeRef, options = {}) {
    const payload = await getJson('becpg/remote/entity', {
        query: { nodeRef },
        session: options.session,
    });
    const entity = payload?.entity || payload;
    if (!entity || !entity.type) {
        throw new NotFoundError('Entity not found', { details: { nodeRef } });
    }

    const attributes = entity.attributes || {};
    return {
        nodeRef,
        id: entity.id || nodeRef.split('/').pop(),
        type: entity.type,
        name: entity.name || attributes['cm:name'] || '',
        code: entity.code || attributes['bcpg:code'] || null,
        erpCode: entity.erpCode || attributes['bcpg:erpCode'] || null,
        state: attributes['bcpg:productState'] || attributes['pjt:projectState'] || null,
        siteId: entity.site?.id || null,
        attributes,
        raw: entity,
    };
}

/* -------------------------------------------------------------------------- */
/* State computation                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Indexes the security payload by list name.
 *
 * @param {Object[]} datalists
 * @returns {Map<string, Object>}
 */
function indexDataLists(datalists) {
    const index = new Map();
    for (const list of datalists || []) {
        if (list?.name) {
            index.set(list.name, list);
        }
    }
    return index;
}

/**
 * Computes the read-only state of the whole wizard, once.
 *
 * Reproduces the decision tree of `wizard-mgr.js` — minus its per-step
 * re-evaluation:
 *
 *   1. the wizard is configured read-only → everything is read-only;
 *   2. `accessMode === READ` → everything is read-only;
 *   3. `enforceTask` is on and the user holds no task on this entity →
 *      everything is read-only (a supplier may only write while a task is open);
 *   4. otherwise the wizard is writable and only the frozen steps are read-only.
 *
 * @param {Object} wizard normalised wizard attributes
 * @param {{accessMode: number, hasAssignedTask: boolean}} security
 * @returns {{readOnly: boolean, reason: string|null}}
 */
export function computeReadOnly(wizard, security) {
    if (wizard.readOnly) {
        return { readOnly: true, reason: 'wizardReadOnly' };
    }
    if (security.accessMode === ACCESS_MODE.READ) {
        return { readOnly: true, reason: 'readAccess' };
    }
    if (wizard.enforceTask && !security.hasAssignedTask) {
        return { readOnly: true, reason: 'noAssignedTask' };
    }
    return { readOnly: false, reason: null };
}

/**
 * Decorates the steps with their computed state.
 *
 * @param {Object[]} steps normalised steps
 * @param {Map<string, Object>} listsByName
 * @param {boolean} wizardReadOnly
 * @returns {Object[]} the UI-facing steps
 */
export function decorateSteps(steps, listsByName, wizardReadOnly) {
    return steps.map((step) => {
        const list = step.securityListName ? listsByName.get(step.securityListName) : null;
        const frozen = list?.state === FROZEN_STATE;
        return {
            id: step.id,
            label: step.label,
            labelId: step.labelId,
            title: step.title,
            titleId: step.titleId,
            type: step.type,
            formId: step.formId,
            itemId: step.itemId || list?.itemType || null,
            listId: step.listId,
            listName: step.listName,
            listIndex: step.listIndex,
            listNodeRef: list?.nodeRef || null,
            nextStepWebScript: step.nextStepWebScript,
            nodeRefStepIndex: step.nodeRefStepIndex,
            // Frozen = the client validated this list; it can be read, never written.
            frozen,
            // The single, authoritative read-only flag for this step.
            readOnly: wizardReadOnly || step.readOnly || frozen,
            // The field definition Share resolved, when it came from the Share
            // endpoint. Carried because `getStepData` needs it: re-asking
            // `module/entity-datagrid/config/columns` for fields we already hold
            // fails with 401 (`share_session_required`) — see `stepColumns`.
            // `GET /api/v1/wizard/{entityId}` strips it again before answering,
            // so the index payload stays small and its shape unchanged.
            definition: step.definition || null,
        };
    });
}

/**
 * The step list as the browser sees it: everything {@link decorateSteps}
 * computed, minus the resolved field definitions.
 *
 * Those are per-step and large (28 KB for the ten steps of `supplier-rawMaterial`),
 * and the UI fetches them one at a time from
 * `GET /api/v1/wizard/{entityId}/step/{stepId}` as the user advances. Sending
 * all ten up front would multiply the index payload for data nine tenths of
 * which is never read.
 *
 * @param {Object} state result of {@link getWizardState}
 * @returns {Object} the same state with lightweight steps
 */
export function withoutStepDefinitions(state) {
    return {
        ...state,
        steps: state.steps.map(({ definition, ...step }) => step),
    };
}

/**
 * The full wizard state — the payload of `GET /api/v1/wizard/{entityId}`.
 *
 * ```
 * { wizardId, source, draft, comments, allSteps, enforceTask, skipSecurityRules,
 *   readOnly, readOnlyReason, accessMode, hasAssignedTask,
 *   entity: { nodeRef, id, type, name, code, erpCode, state, siteId },
 *   steps: [ { id, label, title, type, formId, itemId, listId, listName,
 *              listIndex, listNodeRef, frozen, readOnly } ] }
 * ```
 *
 * @param {string} entityId nodeRef, node path or UUID
 * @param {Object} [options]
 * @param {string} [options.wizardId] force a wizard instead of deriving it from the type
 * @param {string} [options.siteId]
 * @param {string} [options.locale]
 * @param {Object} [options.session]
 * @returns {Promise<Object>}
 *
 * @example
 * const state = await getWizardState(entityId, { locale: 'fr' });
 * // state.steps[3].readOnly is final: the UI must not recompute it.
 */
export async function getWizardState(entityId, options = {}) {
    const session = options.session || await requireSession();
    const nodeRef = toEntityNodeRef(entityId);

    const entity = await getEntity(nodeRef, { session });
    const wizardId = options.wizardId || wizardIdForType(entity.type);

    const ctx = createContext(session, {
        entityType: entity.type,
        entityNodeRef: nodeRef,
        siteId: options.siteId || entity.siteId,
        locale: options.locale,
    });

    const { wizard, steps, source } = await getWizard(ctx, wizardId);

    // THE single security call. Everything below is derived from it.
    const security = await getEntityListsState(nodeRef, {
        checkTaskAssignment: wizard.enforceTask,
        skipSecurityRules: wizard.skipSecurityRules,
        session,
    });

    const { readOnly, reason } = computeReadOnly(wizard, security);
    const listsByName = indexDataLists(security.datalists);

    return {
        wizardId,
        source,
        draft: wizard.draft,
        comments: wizard.comments,
        allSteps: wizard.allSteps,
        enforceTask: wizard.enforceTask,
        skipSecurityRules: wizard.skipSecurityRules,
        readOnly,
        readOnlyReason: reason,
        accessMode: security.accessMode,
        hasAssignedTask: security.hasAssignedTask,
        entity: {
            nodeRef: entity.nodeRef,
            id: entity.id,
            type: entity.type,
            name: entity.name,
            code: entity.code,
            erpCode: entity.erpCode,
            state: entity.state,
            siteId: entity.siteId,
        },
        steps: decorateSteps(steps, listsByName, readOnly),
        // Kept so a caller composing more calls does not fetch it twice.
        datalists: security.datalists.map((list) => ({
            name: list.name,
            nodeRef: list.nodeRef,
            itemType: list.itemType || null,
            title: list.title || list.name,
            state: list.state || null,
            frozen: list.state === FROZEN_STATE,
        })),
    };
}

/* -------------------------------------------------------------------------- */
/* Step data                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Finds a step in a computed state.
 *
 * @param {Object} state result of {@link getWizardState}
 * @param {string} stepId
 * @returns {Object}
 * @throws {NotFoundError}
 */
export function findStep(state, stepId) {
    const step = state.steps.find((candidate) => candidate.id === stepId);
    if (!step) {
        throw new NotFoundError(`Wizard "${state.wizardId}" has no step "${stepId}"`, {
            details: { wizardId: state.wizardId, stepId },
        });
    }
    return step;
}

/**
 * Reads the documents of the entity — the payload of a `documents` step.
 *
 * No dedicated API is needed (spec §5.4.2): `DocumentFormulationHandler` already
 * materialises the expected documents on the entity, `bcpg:documentState`
 * distinguishing `Simulation` (expected, not supplied) from a real deposit. The
 * folder is resolved by the same webscript the Share wizard uses between steps,
 * `becpg/project/path?path=SupplierDocuments`, with a fallback on the entity
 * itself when the project layout does not have that folder.
 *
 * @param {string} entityNodeRef
 * @param {Object} [options]
 * @param {Object} [options.session]
 * @returns {Promise<{folderNodeRef: string|null, documents: Object[]}>}
 */
export async function getDocuments(entityNodeRef, options = {}) {
    const session = options.session;
    let folderNodeRef = null;
    try {
        const resolved = await getJson('becpg/project/path', {
            query: { nodeRef: entityNodeRef, path: SUPPLIER_DOCUMENTS_PATH },
            session,
        });
        folderNodeRef = resolved?.nodeRef || null;
    }
    catch {
        // No SupplierDocuments folder on this entity: fall back on its children.
        folderNodeRef = null;
    }

    const target = folderNodeRef || entityNodeRef;
    const payload = await getJson(
        `slingshot/doclib2/doclist/documents/node/${nodeRefToPath(target)}`,
        { query: { max: 250 }, session },
    ).catch(() => null);

    const items = Array.isArray(payload?.items) ? payload.items : [];
    return {
        folderNodeRef,
        documents: items.map((item) => {
            const node = item?.node || {};
            const properties = node.properties || {};
            return {
                nodeRef: node.nodeRef || null,
                name: properties['cm:name'] || node.properties?.name || '',
                title: properties['cm:title'] || null,
                mimetype: node.mimetype || null,
                size: node.size || null,
                modified: node.modified || properties['cm:modified'] || null,
                documentType: properties['bcpg:documentTypeRef'] || null,
                mandatory: properties['bcpg:documentIsMandatory'] === true,
                // `Simulation` = expected but not supplied yet (contracts §9).
                state: properties['bcpg:documentState'] || null,
                expected: properties['bcpg:documentState'] === 'Simulation',
                validFrom: properties['cm:from'] || null,
                validTo: properties['cm:to'] || null,
                aiValidationState: properties['bcpg:aiValidationState'] || null,
                aiValidationHints: properties['bcpg:aiValidationHints'] || null,
            };
        }),
    };
}

/**
 * Everything one step needs to render, in one call.
 *
 * The shape depends on the step type, and always echoes the step's computed
 * `readOnly` / `frozen` so the UI has no reason to recompute anything:
 *
 * - `form` → `{ step, definition }` — the definition carries the values;
 * - `entityDataList` / `survey` → `{ step, columns, rows, total, page, pageSize }`;
 * - `documents` → `{ step, folderNodeRef, documents }`.
 *
 * @param {Object} state result of {@link getWizardState}
 * @param {string} stepId
 * @param {Object} [options]
 * @param {number} [options.page=1]
 * @param {number} [options.pageSize]
 * @param {string} [options.sort]
 * @param {string} [options.locale]
 * @param {Object} [options.session]
 * @returns {Promise<Object>}
 */
/**
 * Columns of a datalist / survey step — from the definition Share already
 * resolved when there is one, otherwise from the columns endpoint.
 *
 * The order matters and is not an optimisation: `module/entity-datagrid/config/columns`
 * runs as a Share *user* and answers 401 without a Share session, which the portal
 * server has no way to obtain (contracts §8). When the wizard came from Share it
 * already carries the resolved fields, so asking again can only turn a working step
 * into `share_session_required`. See {@link columnsFromDefinition}.
 *
 * @param {Object} ctx wizard context
 * @param {Object} step a normalised step
 * @param {string} itemType prefixed item type
 * @param {'view'|'edit'} mode
 * @returns {Promise<Object[]>}
 */
async function stepColumns(ctx, step, itemType, mode) {
    const resolved = columnsFromDefinition(step, mode);
    if (resolved) {
        return resolved;
    }
    return getColumns(ctx, {
        itemType,
        listId: step.listId,
        formId: step.formId,
        mode,
    });
}

export async function getStepData(state, stepId, options = {}) {
    const session = options.session || await requireSession();
    const step = findStep(state, stepId);
    const entityNodeRef = state.entity.nodeRef;
    const mode = step.readOnly ? 'view' : 'edit';

    const ctx = createContext(session, {
        entityType: state.entity.type,
        entityNodeRef,
        siteId: state.entity.siteId,
        locale: options.locale,
    });

    if (step.type === 'documents') {
        const documents = await getDocuments(entityNodeRef, { session });
        return { step, ...documents };
    }

    if (step.type === 'form') {
        const entity = await getEntity(entityNodeRef, { session });
        const definition = await getFormDefinition(ctx, {
            itemType: step.itemId || state.entity.type,
            formId: step.formId,
            mode,
        });
        return { step, definition: applyValues(definition, entity.attributes) };
    }

    // entityDataList and survey are both datalists; survey only differs by the
    // widget the UI picks, not by the data contract.
    const list = await resolveDataList(entityNodeRef, step.listId, {
        datalists: state.datalists,
        session,
    });
    const itemType = step.itemId || list.itemType;
    const columns = await stepColumns(ctx, step, itemType, mode);
    const data = await getRows({
        listNodeRef: list.nodeRef,
        itemType,
        listId: step.listId,
        entityNodeRef,
        fields: requestFields(columns),
        page: options.page,
        pageSize: options.pageSize,
        sort: options.sort,
        locale: options.locale,
        session,
    });

    return { step, listNodeRef: list.nodeRef, itemType, columns, ...data };
}

/* -------------------------------------------------------------------------- */
/* Between steps                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Reformulates the entity — `becpg/remote/formulate`.
 *
 * Kept from the existing wizard, but the caller is expected to run it
 * **asynchronously and without blocking the UI** (spec §4.4).
 *
 * @param {string} entityNodeRef
 * @param {Object} [options]
 * @param {Object} [options.session]
 * @param {number} [options.timeout] overrides the default upstream timeout
 * @returns {Promise<Object>} the reformulated entity
 */
export async function formulate(entityNodeRef, options = {}) {
    const nodeRef = toEntityNodeRef(entityNodeRef);
    return getJson('becpg/remote/formulate', {
        query: { nodeRef },
        session: options.session,
        timeout: options.timeout,
        // Formulation is expensive and not idempotent-cheap: never replay it.
        retries: 0,
    });
}

/**
 * Runs a step's `nextStepWebScript`, if it declares one.
 *
 * The configuration stores a template such as
 * `becpg/remote/formulate?nodeRef={nodeRef}&format=json` or
 * `becpg/project/path?nodeRef={nodeRef}&path=SupplierDocuments`. Only
 * `{nodeRef}` is substituted, and the resulting path still goes through the
 * proxy allow-list — a configuration error cannot open an arbitrary webscript.
 *
 * @param {Object} step a decorated step
 * @param {string} entityNodeRef
 * @param {Object} [options]
 * @param {Object} [options.session]
 * @returns {Promise<Object|null>} the webscript answer, or null when there is none
 */
export async function runNextStepWebScript(step, entityNodeRef, options = {}) {
    if (!step?.nextStepWebScript) {
        return null;
    }
    const nodeRef = toEntityNodeRef(entityNodeRef);
    const resolved = String(step.nextStepWebScript).replace(/\{nodeRef\}/g, encodeURIComponent(nodeRef));
    const [path, search = ''] = resolved.replace(/^\/+/, '').split('?');

    const query = {};
    for (const [name, value] of new URLSearchParams(search)) {
        if (name !== 'format') {
            query[name] = value;
        }
    }

    return getJson(path, { query, session: options.session, retries: 0 });
}

/**
 * **The single write gate of the wizard.**
 *
 * Every mutation of a step — a form save, a row create/update, a row delete, a
 * reorder — goes through this check first. It is what makes the frozen state a
 * *server-side* rule rather than a UI convention: `curl -X DELETE` from a
 * console is refused here, before any Alfresco call is made.
 *
 * The verdict is never recomputed (bug #25928): `step.readOnly` / `step.frozen`
 * come from the single `becpg/security/entitylists/check` call that produced the
 * state, and this function only reads them.
 *
 * @param {Object} state result of {@link getWizardState}
 * @param {string} stepId
 * @returns {Object} the step, when it may be written to
 * @throws {BadRequestError} naming the reason, rather than an opaque 403 from
 *         three layers down
 */
export function assertStepWritable(state, stepId) {
    const step = findStep(state, stepId);
    if (step.readOnly) {
        throw new BadRequestError(
            step.frozen
                ? `Step "${stepId}" has been validated by the client and can no longer be modified`
                : `Step "${stepId}" is read-only`,
            { details: { stepId, frozen: step.frozen, reason: state.readOnlyReason } },
        );
    }
    return step;
}

/**
 * Resolves the datalist a step edits, and the columns to write it with.
 *
 * @param {Object} state
 * @param {Object} step
 * @param {Object} session
 * @param {Object} [options]
 * @returns {Promise<{list: Object, itemType: string, columns: Object[], ctx: Object}>}
 */
async function stepDataListContext(state, step, session, options = {}) {
    const ctx = createContext(session, {
        entityType: state.entity.type,
        entityNodeRef: state.entity.nodeRef,
        siteId: state.entity.siteId,
        locale: options.locale,
    });
    const list = await resolveDataList(state.entity.nodeRef, step.listId, {
        datalists: state.datalists,
        session,
    });
    const itemType = step.itemId || list.itemType;
    const columns = await stepColumns(ctx, step, itemType, 'edit');
    return { ctx, list, itemType, columns };
}

/**
 * Deletes rows of a datalist step.
 *
 * Refused on a frozen or read-only step, exactly like {@link saveStep} — this is
 * the endpoint the grid calls, so a frozen list is unmodifiable whether the
 * request comes from the UI or from a hand-written `fetch`.
 *
 * @param {Object} state result of {@link getWizardState}
 * @param {string} stepId
 * @param {Object} payload
 * @param {string|string[]} payload.nodeRefs the rows to delete
 * @param {Object} [options]
 * @param {Object} [options.session]
 * @returns {Promise<{step: string, deleted: string[], failed: Object[]}>}
 */
export async function deleteStepRows(state, stepId, payload = {}, options = {}) {
    const session = options.session || await requireSession();
    const step = assertStepWritable(state, stepId);

    if (step.type === 'form' || step.type === 'documents') {
        throw new BadRequestError(`Step "${stepId}" has no rows to delete`);
    }

    // The list is resolved so the answer names it, and so a step pointing at a
    // list the entity does not carry fails here rather than half-way through the
    // delete. It is NOT a membership check: `slingshot/datalists/action/items`
    // takes bare nodeRefs, and Alfresco's own permission check on each node is
    // what stops a caller from naming a row of somebody else's list.
    const { list } = await stepDataListContext(state, step, session, options);
    const asked = Array.isArray(payload.nodeRefs) ? payload.nodeRefs : [payload.nodeRefs];
    const result = await deleteItem({ nodeRefs: asked, session });

    return { step: step.id, listNodeRef: list.nodeRef, ...result };
}

/**
 * Moves a row of a datalist step up or down.
 *
 * @param {Object} state result of {@link getWizardState}
 * @param {string} stepId
 * @param {Object} payload
 * @param {string|string[]} payload.nodeRefs the row(s) to move
 * @param {'up'|'down'} payload.direction
 * @param {Object} [options]
 * @param {Object} [options.session]
 * @returns {Promise<Object>}
 */
export async function reorderStepRows(state, stepId, payload = {}, options = {}) {
    const session = options.session || await requireSession();
    const step = assertStepWritable(state, stepId);

    if (step.type === 'form' || step.type === 'documents') {
        throw new BadRequestError(`Step "${stepId}" has no rows to reorder`);
    }

    const { list } = await stepDataListContext(state, step, session, options);
    await sortItem({
        listNodeRef: list.nodeRef,
        nodeRefs: payload.nodeRefs,
        direction: payload.direction,
        session,
    });

    return { step: step.id, listNodeRef: list.nodeRef, sortedAt: new Date().toISOString() };
}

/**
 * Saves a step.
 *
 * - `form` steps go through the Alfresco form processor on the entity;
 * - datalist steps create or update one row.
 *
 * The write is refused up front when the computed state says the step is
 * read-only: beCPG would refuse too, but a 409 that names the reason is a much
 * better answer than a 403 from three layers down.
 *
 * @param {Object} state result of {@link getWizardState}
 * @param {string} stepId
 * @param {Object} payload
 * @param {Object} [payload.values] values to write
 * @param {string} [payload.nodeRef] the row to update (datalist steps)
 * @param {Object} [options]
 * @param {Object} [options.session]
 * @returns {Promise<Object>}
 */
export async function saveStep(state, stepId, payload = {}, options = {}) {
    const session = options.session || await requireSession();
    const step = assertStepWritable(state, stepId);

    if (step.type === 'form') {
        const ctx = createContext(session, {
            entityType: state.entity.type,
            entityNodeRef: state.entity.nodeRef,
            siteId: state.entity.siteId,
            locale: options.locale,
        });
        const definition = await getFormDefinition(ctx, {
            itemType: step.itemId || state.entity.type,
            formId: step.formId,
            mode: 'edit',
        });
        const result = await saveForm(state.entity.nodeRef, payload.values || {}, {
            fields: definition.fields,
            entityNodeRef: state.entity.nodeRef,
            skipSecurityRules: state.skipSecurityRules,
            session,
        });
        return { step: step.id, ...result, savedAt: new Date().toISOString() };
    }

    if (step.type === 'documents') {
        throw new BadRequestError('Documents are deposited through /api/v1/documents, not through the step endpoint');
    }

    const { list, itemType, columns } = await stepDataListContext(state, step, session, options);

    const result = payload.nodeRef
        ? await updateItem({
            nodeRef: payload.nodeRef,
            values: payload.values || {},
            columns,
            itemType,
            entityNodeRef: state.entity.nodeRef,
            skipSecurityRules: state.skipSecurityRules,
            session,
        })
        : await createItem({
            listNodeRef: list.nodeRef,
            itemType,
            values: payload.values || {},
            columns,
            entityNodeRef: state.entity.nodeRef,
            skipSecurityRules: state.skipSecurityRules,
            session,
        });

    return { step: step.id, ...result, savedAt: new Date().toISOString() };
}

export { parseListId };
