/**
 * Datalists — columns from Share, rows from the repository.
 *
 * The split is the one described in doc/becpg-api-contracts.md §1 and §2, and it
 * is not negotiable:
 *
 *   - **columns** come from `GET /share/service/module/entity-datagrid/config/columns`.
 *     That endpoint already exists, already runs the beCPG cascade
 *     (`formId + entityType + siteId + list`) and already returns translated
 *     labels — including for the supplier-dedicated form ids
 *     (`datagrid-supplier-nut` at Aryzta, `supplier` at Bridor). The portal
 *     resolves nothing itself and parses no XML.
 *   - **rows** come from `GET|POST becpg/entity/datalists/data/node/{store}/{id}`,
 *     whose `{id}` is the **datalist node**, not the entity.
 *
 * ## Resolving the datalist node — and why the `@N` suffix matters
 *
 * `listId` may carry an `@N` suffix (`surveyList@1`). That is not portal
 * notation: `InitEntityListPolicy.createName()` literally names the second
 * instance of a list `surveyList@1` in the repository, which is how an entity
 * can carry several questionnaires (spec §2ter.1). So:
 *
 *   - towards beCPG we always pass the **raw** `listId`, suffix included;
 *   - `parseListId()` is only used to expose `listName` / `listIndex` to the UI.
 *
 * The datalist node itself is resolved from
 * `becpg/security/entitylists/check/{entity}`, which returns every list of the
 * entity with its `nodeRef`, `itemType`, `title` **and** its `state` — the same
 * single call that drives the wizard's read-only state (§4). Resolving by name
 * is mandatory: the repository's `guessContainer` shortcut matches on the item
 * *type* and would happily return `surveyList` when asked for `surveyList@1`.
 *
 * ## Value keys
 *
 * A row's `itemData` is keyed by `formsName` (`prop_bcpg_nutListValue`,
 * `assoc_…`, `dt_…` for a nested list) — see
 * `AttributeExtractorServiceImpl.readExtractStructure`. Each cell is
 * `{ value, displayValue }`, `displayValue` being already localised: it is the
 * one to display, never the raw value.
 *
 * Server only.
 */

import {
    becpgJson,
    getJson,
    isNodeRef,
    nodeRefToPath,
    requireSession,
} from '@/lib/becpg';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import { getColumnsConfig, parseListId } from '@/lib/adapters/wizardConfig';
import { normalizeField, saveForm, toFormPayload, toFormsName } from '@/lib/adapters/forms';

/** Rows per page when the caller does not say. */
export const DEFAULT_PAGE_SIZE = 25;

/** Hard ceiling, so a crafted request cannot ask the repository for everything. */
export const MAX_PAGE_SIZE = 200;

/** Column types the columns endpoint can return. */
export const COLUMN_TYPES = ['property', 'association', 'dataList', 'entity'];

/* -------------------------------------------------------------------------- */
/* Columns                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A normalised datalist column.
 *
 * @typedef {Object} DataListColumn
 * @property {string} name prefixed property/association name
 * @property {string} formsName `prop_x` / `assoc_x` / `dt_x` — the `itemData` key
 * @property {string} label already translated
 * @property {string|null} help
 * @property {string} type `property` | `association` | `dataList` | `entity`
 * @property {string} dataType Alfresco data type, or `nested` / `nested_column`
 * @property {{template: string|null, name: string, params: Object}} control
 * @property {boolean} readOnly
 * @property {boolean} mandatory
 * @property {boolean} protectedField
 * @property {boolean} repeating
 * @property {Object[]} constraints
 * @property {DataListColumn[]|null} columns nested columns (sub-list / linked entity)
 */

/**
 * Normalises one column of the Share columns endpoint.
 *
 * Nested columns (`type: "dataList"` and `type: "entity"`) keep their children:
 * the datagrid renders them as a sub-table or as a set of extra cells, and
 * `dataType` tells which (`nested` vs `nested_column`).
 *
 * @param {Object} raw
 * @returns {DataListColumn}
 */
export function normalizeColumn(raw) {
    const nested = raw?.type === 'dataList' || raw?.type === 'entity';
    // `normalizeField` already handles `options`, `formsName`, constraints and
    // the control mapping; a column is a field rendered in a grid cell.
    const field = normalizeField(raw || {});

    return {
        name: field.name,
        formsName: nested ? `dt_${String(field.name).replace(/:/g, '_')}` : field.formsName,
        label: field.label,
        help: field.help,
        type: COLUMN_TYPES.includes(raw?.type) ? raw.type : 'property',
        dataType: field.dataType || (nested ? 'nested' : null),
        control: field.control,
        readOnly: field.readOnly,
        mandatory: field.mandatory,
        protectedField: field.protectedField,
        repeating: field.repeating,
        constraints: field.constraints,
        columns: Array.isArray(raw?.columns) && raw.columns.length > 0
            ? raw.columns.map(normalizeColumn)
            : null,
    };
}

/**
 * Columns of a datalist, resolved by Share and normalised.
 *
 * @param {Object} ctx a {@link import('./wizardConfig').WizardContext}
 * @param {Object} params
 * @param {string} params.itemType prefixed item type, e.g. `bcpg:nutList`
 * @param {string} [params.listId] datalist name, `@N` suffix included
 * @param {string} [params.formId] dedicated form id
 * @param {'view'|'edit'|'create'} [params.mode='edit']
 * @param {boolean} [params.noCache=false]
 * @returns {Promise<DataListColumn[]>}
 */
export async function getColumns(ctx, params = {}) {
    const { itemType, listId = null, formId = null, mode = 'edit', noCache = false } = params;
    if (!itemType) {
        throw new BadRequestError('getColumns requires an itemType');
    }
    const columns = await getColumnsConfig(ctx, { itemType, list: listId, formId, mode, noCache });
    const normalized = columns.map(normalizeColumn);
    return mode === 'view'
        ? normalized.map((column) => ({ ...column, readOnly: true }))
        : normalized;
}

/**
 * The `fields` list the datalist data webscript expects: the column names with
 * `:` replaced by `_`, nested columns expressed as `parent|child|child`.
 *
 * @param {DataListColumn[]} columns
 * @returns {string[]}
 */
export function requestFields(columns) {
    return (columns || []).map((column) => {
        const name = String(column.name).replace(/:/g, '_');
        if (column.columns && column.columns.length > 0) {
            return [name, ...column.columns.map((child) => String(child.name).replace(/:/g, '_'))].join('|');
        }
        return name;
    });
}

/* -------------------------------------------------------------------------- */
/* Resolving the datalist node                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Lists the datalists of an entity with their nodeRef and their validation
 * state, through `becpg/security/entitylists/check`.
 *
 * One call, one source of truth: the wizard uses the very same payload to decide
 * which steps are frozen (`state === "Valid"`), so both features stay consistent
 * by construction (bug #25928).
 *
 * @param {string} entityNodeRef
 * @param {Object} [options]
 * @param {boolean} [options.checkTaskAssignment=false]
 * @param {boolean} [options.skipSecurityRules=false]
 * @param {Object} [options.session]
 * @returns {Promise<{hasAssignedTask: boolean, accessMode: number, datalists: Object[]}>}
 */
export async function getEntityListsState(entityNodeRef, options = {}) {
    if (!isNodeRef(entityNodeRef)) {
        throw new BadRequestError('getEntityListsState requires a nodeRef');
    }
    const payload = await getJson(
        `becpg/security/entitylists/check/${nodeRefToPath(entityNodeRef)}`,
        {
            query: {
                ...(options.checkTaskAssignment ? { checkTaskAssignment: 'true' } : {}),
                ...(options.skipSecurityRules ? { skipSecurityRules: 'true' } : {}),
            },
            session: options.session,
        },
    );

    return {
        hasAssignedTask: payload?.hasAssignedTask === true,
        accessMode: Number(payload?.accessMode) || 0,
        datalists: Array.isArray(payload?.datalists) ? payload.datalists : [],
    };
}

/**
 * Resolves the nodeRef of one datalist of an entity, by name.
 *
 * @param {string} entityNodeRef
 * @param {string} listId datalist name, `@N` suffix included
 * @param {Object} [options]
 * @param {Object[]} [options.datalists] an already-fetched `datalists` array
 * @param {Object} [options.session]
 * @returns {Promise<{nodeRef: string, name: string, itemType: string|null, state: string|null}>}
 * @throws {NotFoundError} when the entity carries no such list
 */
export async function resolveDataList(entityNodeRef, listId, options = {}) {
    if (!listId) {
        throw new BadRequestError('resolveDataList requires a listId');
    }
    const datalists = options.datalists
        || (await getEntityListsState(entityNodeRef, { session: options.session })).datalists;

    const match = datalists.find((list) => list?.name === listId);
    if (!match?.nodeRef) {
        throw new NotFoundError(`Entity carries no datalist "${listId}"`, {
            details: { listId },
        });
    }
    return {
        nodeRef: match.nodeRef,
        name: match.name,
        itemType: match.itemType || null,
        title: match.title || match.name,
        state: match.state || null,
    };
}

/* -------------------------------------------------------------------------- */
/* Rows                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * A normalised row.
 *
 * @typedef {Object} DataListRow
 * @property {string} nodeRef
 * @property {string|null} itemType
 * @property {Object} values raw values, keyed by `formsName`
 * @property {Object} displayValues localised values, keyed by `formsName`
 * @property {Object} permissions `{ edit, delete, create, … }` as beCPG computed them
 */

/**
 * Splits a beCPG `itemData` map into `{ values, displayValues }`.
 *
 * @param {Object} itemData
 * @returns {{values: Object, displayValues: Object}}
 */
export function splitCells(itemData) {
    const values = {};
    const displayValues = {};
    for (const [key, cell] of Object.entries(itemData || {})) {
        if (cell === null || cell === undefined) {
            values[key] = null;
            displayValues[key] = null;
            continue;
        }
        if (Array.isArray(cell)) {
            // Nested list / multi-valued association: an array of cell maps.
            values[key] = cell.map((entry) => splitCells(entry).values);
            displayValues[key] = cell.map((entry) => splitCells(entry).displayValues);
            continue;
        }
        if (typeof cell === 'object' && ('value' in cell || 'displayValue' in cell)) {
            values[key] = cell.value !== undefined ? cell.value : null;
            displayValues[key] = cell.displayValue !== undefined && cell.displayValue !== null
                ? String(cell.displayValue)
                : null;
            continue;
        }
        if (typeof cell === 'object') {
            const split = splitCells(cell);
            values[key] = split.values;
            displayValues[key] = split.displayValues;
            continue;
        }
        values[key] = cell;
        displayValues[key] = String(cell);
    }
    return { values, displayValues };
}

/**
 * Normalises one item of the datalist data webscript.
 *
 * @param {Object} raw
 * @returns {DataListRow}
 */
export function normalizeRow(raw) {
    const { values, displayValues } = splitCells(raw?.itemData);
    return {
        nodeRef: raw?.nodeRef || null,
        itemType: raw?.itemType || null,
        values,
        displayValues,
        permissions: raw?.permissions?.userAccess || {},
    };
}

/**
 * Reads the rows of a datalist.
 *
 * @param {Object} params
 * @param {string} params.listNodeRef nodeRef of the **datalist node**
 * @param {string} params.itemType prefixed item type
 * @param {string} [params.listId] datalist name, `@N` suffix included
 * @param {string} [params.entityNodeRef] entity context (security rules, filters)
 * @param {string[]} [params.fields] fields to extract ({@link requestFields})
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=DEFAULT_PAGE_SIZE]
 * @param {string} [params.sort] `bcpg:sort|true`
 * @param {string} [params.filter] filter id
 * @param {string} [params.filterData]
 * @param {string} [params.locale]
 * @param {Object} [params.session]
 * @returns {Promise<{rows: DataListRow[], total: number, page: number, pageSize: number, permissions: Object}>}
 */
export async function getRows(params = {}) {
    const {
        listNodeRef,
        itemType,
        listId = null,
        entityNodeRef = null,
        fields = null,
        page = 1,
        pageSize = DEFAULT_PAGE_SIZE,
        sort = null,
        filter = null,
        filterData = null,
        locale = null,
        session = null,
    } = params;

    if (!isNodeRef(listNodeRef)) {
        throw new BadRequestError('getRows requires the datalist nodeRef');
    }
    if (!itemType) {
        throw new BadRequestError('getRows requires an itemType');
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE));

    // POST, not GET: `fields` is an array and the filter is a JSON object — that
    // is the shape the datagrid itself sends.
    const payload = await becpgJson(
        `becpg/entity/datalists/data/node/${nodeRefToPath(listNodeRef)}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            query: {
                itemType,
                dataListName: listId,
                entityNodeRef,
                page: safePage,
                pageSize: safePageSize,
                sort,
                locale,
            },
            body: JSON.stringify({
                ...(fields && fields.length > 0 ? { fields } : {}),
                page: safePage,
                pageSize: safePageSize,
                ...(filter ? { filter: { filterId: filter, filterData: filterData || null } } : {}),
            }),
            session,
            retries: 0,
        },
    );

    const items = Array.isArray(payload?.items) ? payload.items : [];
    return {
        rows: items.map(normalizeRow),
        total: Number(payload?.totalRecords ?? items.length),
        page: Number(payload?.startIndex ?? safePage) || safePage,
        pageSize: Number(payload?.pageSize ?? safePageSize) || safePageSize,
        permissions: payload?.metadata?.parent?.permissions?.userAccess || {},
    };
}

/**
 * Columns **and** rows of a datalist in the normalised portal shape.
 *
 * ```
 * { listId, listName, listIndex, listNodeRef, itemType, frozen, readOnly,
 *   columns: [DataListColumn], rows: [DataListRow],
 *   total, page, pageSize, permissions }
 * ```
 *
 * @param {Object} ctx a {@link import('./wizardConfig').WizardContext}
 * @param {Object} params
 * @param {string} params.entityNodeRef
 * @param {string} params.listId datalist name, `@N` suffix included
 * @param {string} [params.itemType] prefixed item type (read from the entity when absent)
 * @param {string} [params.formId] dedicated form id
 * @param {'view'|'edit'} [params.mode='edit']
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=DEFAULT_PAGE_SIZE]
 * @param {string} [params.sort]
 * @param {Object[]} [params.datalists] an already-fetched security payload
 * @returns {Promise<Object>}
 *
 * @example
 * const grid = await getDataList(ctx,
 *     { entityNodeRef, listId: 'surveyList@1', itemType: 'survey:surveyList' });
 */
export async function getDataList(ctx, params = {}) {
    const {
        entityNodeRef,
        listId,
        formId = null,
        page = 1,
        pageSize = DEFAULT_PAGE_SIZE,
        sort = null,
        datalists = null,
    } = params;

    const session = ctx?.session || await requireSession();
    const list = await resolveDataList(entityNodeRef, listId, { datalists, session });
    const itemType = params.itemType || list.itemType;
    if (!itemType) {
        throw new BadRequestError(`Cannot determine the item type of datalist "${listId}"`);
    }

    const frozen = list.state === 'Valid';
    const mode = frozen || params.mode === 'view' ? 'view' : 'edit';

    const columns = await getColumns(ctx, { itemType, listId, formId, mode });
    const data = await getRows({
        listNodeRef: list.nodeRef,
        itemType,
        listId,
        entityNodeRef,
        fields: requestFields(columns),
        page,
        pageSize,
        sort,
        locale: ctx?.locale || null,
        session,
    });

    const { name: listName, index: listIndex } = parseListId(listId);

    return {
        listId,
        listName,
        listIndex,
        listNodeRef: list.nodeRef,
        title: list.title,
        itemType,
        frozen,
        readOnly: mode === 'view',
        columns,
        ...data,
    };
}

/* -------------------------------------------------------------------------- */
/* Writing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Creates a row in a datalist.
 *
 * Goes through the Alfresco form processor on the item type, with the datalist
 * node as `alf_destination` — exactly what Share's create form submits to.
 *
 * @param {Object} params
 * @param {string} params.listNodeRef nodeRef of the datalist node
 * @param {string} params.itemType prefixed item type
 * @param {Object} params.values value map (either key convention)
 * @param {DataListColumn[]} [params.columns] used to tell properties from associations
 * @param {string} [params.entityNodeRef]
 * @param {boolean} [params.skipSecurityRules=false]
 * @param {Object} [params.session]
 * @returns {Promise<{nodeRef: string|null}>}
 */
export function createItem(params = {}) {
    const { listNodeRef, itemType, values, columns = [], entityNodeRef, skipSecurityRules, session } = params;
    if (!isNodeRef(listNodeRef)) {
        throw new BadRequestError('createItem requires the datalist nodeRef');
    }
    if (!itemType || !itemType.includes(':')) {
        throw new BadRequestError('createItem requires a prefixed item type');
    }
    return saveForm(itemType, values, {
        fields: columns,
        destination: listNodeRef,
        entityNodeRef,
        skipSecurityRules,
        session,
    });
}

/**
 * Updates a row.
 *
 * @param {Object} params
 * @param {string} params.nodeRef the row
 * @param {Object} params.values value map
 * @param {DataListColumn[]} [params.columns]
 * @param {string} [params.entityNodeRef]
 * @param {boolean} [params.skipSecurityRules=false]
 * @param {Object} [params.session]
 * @returns {Promise<{nodeRef: string|null}>}
 */
export function updateItem(params = {}) {
    const { nodeRef, values, columns = [], entityNodeRef, skipSecurityRules, session } = params;
    if (!isNodeRef(nodeRef)) {
        throw new BadRequestError('updateItem requires a nodeRef');
    }
    return saveForm(nodeRef, values, {
        fields: columns,
        entityNodeRef,
        skipSecurityRules,
        session,
    });
}

/**
 * Deletes one or more rows.
 *
 * Uses `DELETE slingshot/datalists/action/items`, the endpoint Share's datagrid
 * calls: it deletes a batch in one transaction and reports per-item failures.
 *
 * @param {Object} params
 * @param {string|string[]} params.nodeRefs the rows to delete
 * @param {Object} [params.session]
 * @returns {Promise<{deleted: string[], failed: Object[]}>}
 */
export async function deleteItem(params = {}) {
    const list = Array.isArray(params.nodeRefs) ? params.nodeRefs : [params.nodeRefs];
    const nodeRefs = list.filter((value) => isNodeRef(value));
    if (nodeRefs.length === 0) {
        throw new BadRequestError('deleteItem requires at least one nodeRef');
    }

    const payload = await becpgJson('slingshot/datalists/action/items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeRefs }),
        session: params.session,
        retries: 0,
    });

    const results = Array.isArray(payload?.results) ? payload.results : [];
    return {
        deleted: results.filter((result) => result?.success).map((result) => result.nodeRef),
        failed: results.filter((result) => result && !result.success),
    };
}

/**
 * Moves a row up or down inside its datalist.
 *
 * `becpg/entity/datalists/sort/node/{store}/{id}` — `{id}` is the **datalist**
 * node, `selectedNodeRefs` the row(s) being moved and `dir` the direction, which
 * is exactly what `SortDataListWebScript` reads. Share's own datagrid calls the
 * same endpoint; the difference here is that the caller has already been checked
 * against the step's read-only state.
 *
 * @param {Object} params
 * @param {string} params.listNodeRef nodeRef of the datalist node
 * @param {string|string[]} params.nodeRefs the row(s) to move
 * @param {'up'|'down'} params.direction
 * @param {Object} [params.session]
 * @returns {Promise<Object|null>}
 */
export async function sortItem(params = {}) {
    const { listNodeRef, direction, session } = params;
    if (!isNodeRef(listNodeRef)) {
        throw new BadRequestError('sortItem requires the datalist nodeRef');
    }
    const list = Array.isArray(params.nodeRefs) ? params.nodeRefs : [params.nodeRefs];
    const nodeRefs = list.filter((value) => isNodeRef(value));
    if (nodeRefs.length === 0) {
        throw new BadRequestError('sortItem requires at least one row nodeRef');
    }
    if (direction !== 'up' && direction !== 'down') {
        throw new BadRequestError('sortItem requires a direction of "up" or "down"');
    }

    return becpgJson(`becpg/entity/datalists/sort/node/${nodeRefToPath(listNodeRef)}`, {
        method: 'POST',
        query: { selectedNodeRefs: nodeRefs.join(','), dir: direction },
        // The webscript only declares an `.html.ftl` view: asking for `format=json`
        // makes Alfresco answer 404 on a call that would otherwise succeed.
        format: null,
        session,
        retries: 0,
    });
}

export { parseListId, toFormPayload, toFormsName };
