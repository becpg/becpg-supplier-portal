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
    becpgFetch,
    becpgJson,
    getJson,
    isNodeRef,
    nodeRefToPath,
    requireSession,
} from '@/lib/becpg';
import { BadRequestError, NotFoundError, errorFromStatus } from '@/lib/errors';
import { readErrorMessage } from '@/lib/http';
import { rowColor } from '@/lib/format';
import { getColumnsConfig, parseListId } from '@/lib/adapters/wizardConfig';
import { normalizeField, saveForm, toFormPayload, toFormsName } from '@/lib/adapters/forms';
// The renderers declare which hidden siblings they read; see `requestFields`.
// A pure table — no React, no server import — so both sides can share it.
import { companionFields } from '@/components/datalist/renderers/dependencies';

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
    const formsName = nested ? `dt_${String(field.name).replace(/:/g, '_')}` : field.formsName;

    return {
        // A control addresses its field by `id` — `AutocompleteControl` builds
        // `POST /api/v1/autocomplete/{formId}/{field.id}` out of it. A column had
        // none, so every datasource-backed cell (the questionnaire's "Choix
        // retenu" first of all) queried `…/autocomplete/default/undefined`.
        id: formsName,
        name: field.name,
        formsName,
        label: field.label,
        help: field.help,
        type: COLUMN_TYPES.includes(raw?.type) ? raw.type : 'property',
        dataType: field.dataType || (nested ? 'nested' : null),
        // The **target class** of an association — `bcpg:nut` for
        // `bcpg:nutListNut`. `normalizeField` resolves it and this dropped it,
        // which is not cosmetic: it is Share's `p_type` for an association
        // (`columns.get.json.ftl` emits `"dataType": "${col.endpointType}"`), so
        // without it the third level of the column-renderer lookup —
        // `components/datalist/renderers` — can never match. Purely additive:
        // every other consumer keys on `type === 'association'`, which is
        // unchanged, and the autocomplete datasource resolves its endpoint from
        // the *form field*, not from a column.
        endpointType: field.endpointType || null,
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
    return finishColumns(columns.map(normalizeColumn), mode);
}

/**
 * beCPG's marker for "resolve this field, but do not show it".
 *
 * It is a **label**, not a flag: the datagrid form configuration writes
 * `label="hidden"` on the columns the grid must fetch (so filters, formulas and
 * the form processor keep working) without ever displaying them. Share's own
 * datagrid keys on exactly this string — `entity-datagrid.js`:
 *
 * ```js
 * var hidden = column.label == "hidden" || …;
 * … label: column.label == "hidden" ? "" : column.label, hidden: hidden,
 * ```
 *
 * so the convention is beCPG's, not an invention here.
 */
export const HIDDEN_COLUMN_LABEL = 'hidden';

/**
 * @param {DataListColumn} column
 * @returns {boolean}
 */
export function isHiddenColumn(column) {
    return String(column?.label || '').trim() === HIDDEN_COLUMN_LABEL;
}

/**
 * Applies the view-mode rule to an already-normalised column list, and drops the
 * columns beCPG marked hidden.
 *
 * ## Why dropping them is not cosmetic
 *
 * Measured on the `supplier-rawMaterial` wizard of 26.1.0, step 4 (`bcpg:nutList`):
 * Share resolves **28** columns, **19** of which carry `label: "hidden"`. The
 * portal rendered all 28, so the supplier was shown nineteen grid columns whose
 * header was the literal word `hidden` — `bcpg:variantColumn1..5`,
 * `bcpg:nutListFormulatedValue`, `fm:commentCount`, `bcpg:entityDataListState`…
 *
 * And one of them, `bcpg:depthLevel`, is `mandatory`. `useDataList.commitRow()`
 * refuses to create a draft row until every mandatory column is filled, so a
 * hidden mandatory column made "Ajouter une ligne" produce a row that could
 * never be saved and never said why. On `bcpg:ingList` there are five such
 * columns (`depthLevel` plus four mandatory booleans).
 *
 * Dropping them here — rather than hiding them in the grid — also keeps them out
 * of {@link requestFields}, so the repository is not asked to extract values
 * nobody will read.
 *
 * @param {DataListColumn[]} columns
 * @param {string} mode
 * @returns {DataListColumn[]}
 */
function finishColumns(columns, mode) {
    const visible = columns.filter((column) => !isHiddenColumn(column));
    return mode === 'view'
        ? visible.map((column) => ({ ...column, readOnly: true }))
        : visible;
}

/**
 * Columns of a step whose field definition Share **already resolved**, without
 * asking Share again.
 *
 * `GET /share/service/becpg/portal/wizard` (contracts §8) returns each step with
 * its `definition.fields`, resolved by the very same `getVisibleFields()` /
 * `createPostBody()` / `POST /becpg/form` chain as
 * `module/entity-datagrid/config/columns` — `portal-form.lib.js` is an
 * extraction of `columns.get.js`, so the two field *sets* are the same by
 * construction. Only the serialisation differs, and only in two ways:
 *
 * | | wizard endpoint | columns endpoint |
 * |---|---|---|
 * | forms name | `id` | `formsName` (`assoc_`/`prop_` + name, `:`→`_`) |
 * | help text | `help` | `options` |
 *
 * `normalizeField` already derives `formsName` with exactly the template's rule
 * and already reads either key, so the definition field is fed to
 * {@link normalizeColumn} unchanged.
 *
 * **Why this matters.** The columns endpoint calls `AlfrescoUtil.getPreferences`,
 * so it runs *as a Share user* and answers **401 without a Share session** —
 * which the portal server cannot obtain (contracts §8: a Share session needs a
 * full authorization-code replay against Keycloak). Re-asking it therefore threw
 * `share_session_required` on every datalist and survey step, for definitions the
 * portal was already holding. Measured on 26.1.0, entity `17243f08-…`: the
 * wizard endpoint returns 3/17/28/13/17/12/11/7 fields for steps 2-9 with
 * `portalTicket` alone, while `GET /api/v1/wizard/{id}/step/step2` answered 401.
 *
 * Nothing changes when the definition is absent (default/fallback mode, or a
 * step Share could not resolve): the caller falls back to {@link getColumns}.
 *
 * @param {Object} step a normalised wizard step
 * @param {string} [mode='edit']
 * @returns {DataListColumn[]|null} null when the step carries no usable definition
 */
export function columnsFromDefinition(step, mode = 'edit') {
    const fields = step?.definition?.fields;
    if (!Array.isArray(fields) || fields.length === 0) {
        return null;
    }
    return finishColumns(fields.map(normalizeColumn), mode);
}

/**
 * The `fields` list the datalist data webscript expects: the column names with
 * `:` replaced by `_`, nested columns expressed as `parent|child|child`, plus
 * the **companion fields** the column renderers need.
 *
 * ## Why the companions are not optional
 *
 * The list is derived from the columns that survived {@link finishColumns},
 * which drops everything beCPG marked `label: "hidden"`. Several of those hidden
 * properties are exactly what Share's renderers read to fill a *visible* cell —
 * `bcpg:nutListUnit` and `bcpg:nutListFormulatedValue` for the nutrient value,
 * `bcpg:depthLevel` for the indent of a multi-level list. Measured on the
 * `nutList` step of « Pâte à choux »: 28 fields declared, 9 requested, and the
 * *Valeur* column blank on every formulated row because the number lives only in
 * the formulated sibling nobody asked for.
 *
 * The table is `components/datalist/renderers/dependencies.js` — it belongs to
 * the renderers, so a companion stops being requested the day the renderer that
 * needs it goes away. Verified against 26.1.0: a declared-but-hidden property is
 * returned normally, and a name the item type does not carry is silently ignored
 * (no error, no key), so this cannot break a list whose model differs.
 *
 * @param {DataListColumn[]} columns
 * @returns {string[]}
 */
export function requestFields(columns) {
    const fields = (columns || []).map((column) => {
        const name = String(column.name).replace(/:/g, '_');
        if (column.columns && column.columns.length > 0) {
            return [name, ...column.columns.map((child) => String(child.name).replace(/:/g, '_'))].join('|');
        }
        return name;
    });
    return [...fields, ...companionFields(columns)];
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
 * ## `hasAssignedTask` is `null` when the question was not asked
 *
 * beCPG only computes it when the request carries `checkTaskAssignment`, and
 * that computation is **expensive**: measured on the reference instance, the same call
 * costs 66 ms without it and 1575 ms with — twenty-four times more, on every
 * wizard load. So the portal asks for it only when it is going to act on the
 * answer (`enforceTask`).
 *
 * The flag therefore has three states, and it used to have two: `payload
 * ?.hasAssignedTask === true` collapsed "beCPG says no" and "nobody asked" into
 * the same `false`. Measured on dev, that made the portal contradict the
 * repository — `becpg/security/entitylists/check?checkTaskAssignment=true`
 * answering `true` for a task the supplier really held, while
 * `GET /api/v1/wizard/{entity}` published `false`. `null` says "unknown", which
 * is what it is; a consumer that needs the fact must ask for it.
 *
 * @param {string} entityNodeRef
 * @param {Object} [options]
 * @param {boolean} [options.checkTaskAssignment=false]
 * @param {boolean} [options.skipSecurityRules=false]
 * @param {Object} [options.session]
 * @returns {Promise<{hasAssignedTask: boolean|null, accessMode: number, datalists: Object[]}>}
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
        // Only a fact when it was asked for — see the header.
        hasAssignedTask: options.checkTaskAssignment ? payload?.hasAssignedTask === true : null,
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
 * @property {string|null} color the row's own colour (`bcpg:color`), as authored
 */

/**
 * True when a beCPG cell is a *scalar* cell — `{ value, displayValue }` — rather
 * than a map of cells (a nested row) or an empty-cell marker.
 *
 * @param {*} cell
 * @returns {boolean}
 */
function isScalarCell(cell) {
    return Boolean(cell) && typeof cell === 'object' && !Array.isArray(cell)
        && ('value' in cell || 'displayValue' in cell);
}

/**
 * Splits a beCPG `itemData` map into `{ values, displayValues }`.
 *
 * Three shapes come out of `AttributeExtractorServiceImpl`, and telling them
 * apart is the whole job — getting it wrong is not cosmetic, it is what put
 * `[object Object]` in every empty comment box of the questionnaire and hid
 * every question label behind its nodeRef:
 *
 * | beCPG sends | means | becomes |
 * |---|---|---|
 * | `"72 °C"` / `12` | a filled property | the value itself |
 * | `{ value, displayValue }` | a single association / formatted property | `{ value }` + `{ displayValue }` |
 * | `[{ value, displayValue }, …]` | a **multi-valued** association | the array + the labels joined |
 * | `[{ prop_x: …, prop_y: … }, …]` | a **nested sub-list** (`dt_*`) | an array of row maps |
 * | `{ metadata: "text" }` | an **empty** property — only its datatype | `null` |
 *
 * The last one has no `value` and no `displayValue`: beCPG describes the *type*
 * of a cell it has nothing to put in. Recursing into it as if it were a nested
 * row produced `{ metadata: "text" }` as the cell value, which every text
 * control then rendered as `[object Object]`.
 *
 * An array of scalar cells is a multi-valued association (`survey:slChoices`,
 * `bcpg:ingList`…): its `displayValue` must be the **joined labels**, not an
 * array — `displayOf()` prints `''` for an array, which is why a selected choice
 * and a question label both showed up empty in read mode and as a raw nodeRef in
 * the picker.
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
            if (cell.length === 0) {
                values[key] = [];
                displayValues[key] = '';
                continue;
            }
            if (cell.every((entry) => isScalarCell(entry))) {
                // Multi-valued association: keep the cells (the picker reads
                // `value` from them) but present one localised, joined label.
                values[key] = cell.map((entry) => splitCells(entry).values);
                displayValues[key] = cell
                    .map((entry) => (entry.displayValue === undefined || entry.displayValue === null
                        ? entry.value
                        : entry.displayValue))
                    .filter((entry) => entry !== null && entry !== undefined && entry !== '')
                    .map((entry) => String(entry))
                    .join(', ');
                continue;
            }
            // Nested sub-list: an array of cell maps.
            values[key] = cell.map((entry) => splitCells(entry).values);
            displayValues[key] = cell.map((entry) => splitCells(entry).displayValues);
            continue;
        }
        if (isScalarCell(cell)) {
            values[key] = cell.value !== undefined ? cell.value : null;
            displayValues[key] = cell.displayValue !== undefined && cell.displayValue !== null
                ? String(cell.displayValue)
                : null;
            continue;
        }
        if (typeof cell === 'object') {
            // `{ metadata: "text" }` — the datatype of a cell beCPG has nothing
            // to put in. That is an empty cell, not a nested row.
            //
            // The marker is not always alone: an empty `d:mltext` arrives as
            // `{ mltextHasValue: false, metadata: "mltext" }` (measured on
            // `bcpg:nutListReductionFormulatedValue`), and keying on the single
            // `metadata` name let that one through to the nested-row branch — so
            // that column, and it alone, still printed `[object Object]`.
            // What actually separates the two shapes is that a nested row holds
            // *cells*, i.e. objects; a marker holds only scalars.
            if (!Object.values(cell).some((entry) => entry !== null && typeof entry === 'object')) {
                values[key] = null;
                displayValues[key] = null;
                continue;
            }
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
        color: rowColor(raw?.color),
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
 * Reads one row's current cells — `becpg/entity/datalists/item/node/{store}/{id}`,
 * the single-item twin of the data webscript.
 *
 * `fields` is mandatory: without it the webscript answers `itemData: {}`.
 *
 * @param {Object} params
 * @param {string} params.nodeRef the row
 * @param {string} [params.itemType]
 * @param {string[]} [params.fields]
 * @param {Object} [params.session]
 * @returns {Promise<DataListRow|null>}
 */
export async function getRow(params = {}) {
    const { nodeRef, itemType = null, fields = null, session = null } = params;
    if (!isNodeRef(nodeRef)) {
        throw new BadRequestError('getRow requires a nodeRef');
    }
    const payload = await becpgJson(`becpg/entity/datalists/item/node/${nodeRefToPath(nodeRef)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        query: { ...(itemType ? { itemType } : {}) },
        body: JSON.stringify(fields && fields.length > 0 ? { fields } : {}),
        session,
        retries: 0,
    });
    return payload?.item ? normalizeRow(payload.item) : null;
}

/**
 * The nodeRefs currently held by a cell, whatever shape it arrived in.
 *
 * @param {*} cell
 * @returns {string[]}
 */
function targetsOf(cell) {
    if (cell === null || cell === undefined || cell === '') {
        return [];
    }
    const list = Array.isArray(cell) ? cell : [cell];
    return list
        .map((entry) => {
            if (entry && typeof entry === 'object') {
                return entry.value ?? entry.nodeRef ?? null;
            }
            return entry;
        })
        .flatMap((entry) => (typeof entry === 'string' ? entry.split(',') : [entry]))
        .map((entry) => (entry === null || entry === undefined ? '' : String(entry).trim()))
        .filter((entry) => entry !== '');
}

/**
 * Turns "here is the new value of this association" into the **delta** the
 * Alfresco form processor actually applies.
 *
 * ## Why this exists
 *
 * `assoc_x_added` / `assoc_x_removed` is not a "set the value" pair: the
 * processor *adds* what `_added` lists and *removes* what `_removed` lists, and
 * ignores everything else. `toFormPayload` sends the caller's whole new value as
 * `_added` with an empty `_removed`, which makes every association write purely
 * additive. Measured on 26.1.0, on a `survey:slChoices` cell holding
 * `[Lait, Gluten]`:
 *
 * | written | stored afterwards |
 * |---|---|
 * | `[Lait]` — deselect Gluten | `[Lait, Gluten]` |
 * | `[]` — clear the answer | `[Lait, Gluten]` |
 * | `Aucun` — replace, single choice | `[Lait, Gluten, Aucun]` |
 * | `{ added: [Aucun], removed: [Lait, Gluten] }` | `[Aucun]` |
 *
 * So a supplier could never *correct* an answer: unticking an allergen did
 * nothing, and a single-choice question silently accumulated contradictory
 * answers. The delta form already worked — nobody computed the delta.
 *
 * The current targets are read from the row itself rather than trusted from the
 * browser: the row on screen may be a few seconds old, and a stale `removed`
 * list would delete an answer the user never touched.
 *
 * A caller that already knows its delta (`{ added, removed }`) is left alone,
 * and a value map without a single association costs no extra call.
 *
 * @param {Object} params
 * @param {string} params.nodeRef the row being updated
 * @param {Object} params.values the new values, keyed either way
 * @param {DataListColumn[]} params.columns the step's columns
 * @param {string} [params.itemType] prefixed item type
 * @param {Object} [params.session]
 * @returns {Promise<Object>} the value map, associations expressed as deltas
 */
export async function reconcileAssociations(params = {}) {
    const { nodeRef, values, columns = [], itemType = null, session = null } = params;

    const byKey = new Map();
    for (const column of columns) {
        byKey.set(column.name, column);
        byKey.set(column.formsName, column);
    }

    const associations = Object.keys(values || {}).filter((key) => {
        const column = byKey.get(key);
        const isAssociation = column ? column.type === 'association' : String(key).startsWith('assoc_');
        if (!isAssociation) {
            return false;
        }
        const value = values[key];
        // Already a delta: the caller knows better than we do.
        return !(value && typeof value === 'object' && !Array.isArray(value)
            && ('added' in value || 'removed' in value));
    });

    if (associations.length === 0) {
        return values;
    }

    const current = await getRow({
        nodeRef,
        itemType: itemType || undefined,
        fields: requestFields(columns),
        session,
    });
    if (!current) {
        return values;
    }

    const reconciled = { ...values };
    for (const key of associations) {
        const column = byKey.get(key);
        const formsName = column ? column.formsName : String(key);
        const next = targetsOf(values[key]);
        const removed = targetsOf(current.values[formsName]).filter((target) => !next.includes(target));
        reconciled[key] = { added: next, removed };
    }
    return reconciled;
}

/**
 * Updates a row.
 *
 * @param {Object} params
 * @param {string} params.nodeRef the row
 * @param {Object} params.values value map
 * @param {DataListColumn[]} [params.columns]
 * @param {string} [params.itemType] prefixed item type, for the read-back
 * @param {string} [params.entityNodeRef]
 * @param {boolean} [params.skipSecurityRules=false]
 * @param {Object} [params.session]
 * @returns {Promise<{nodeRef: string|null}>}
 */
export async function updateItem(params = {}) {
    const { nodeRef, values, columns = [], itemType, entityNodeRef, skipSecurityRules, session } = params;
    if (!isNodeRef(nodeRef)) {
        throw new BadRequestError('updateItem requires a nodeRef');
    }
    // An association is persisted as a delta, never as a value — see
    // {@link reconcileAssociations}.
    const reconciled = await reconcileAssociations({ nodeRef, values, columns, itemType, session });
    return saveForm(nodeRef, reconciled, {
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

    const path = `becpg/entity/datalists/sort/node/${nodeRefToPath(listNodeRef)}`;
    const response = await becpgFetch(path, {
        method: 'POST',
        query: { selectedNodeRefs: nodeRefs.join(','), dir: direction },
        // The webscript only declares an `.html.ftl` view: asking for `format=json`
        // makes Alfresco answer 404 on a call that would otherwise succeed.
        format: null,
        session,
        retries: 0,
    });

    if (!response.ok) {
        const message = await readErrorMessage(response);
        throw errorFromStatus(response.status, message, { label: 'becpg', path });
    }

    // …and, having only an `.html.ftl` view, it answers `Content-Type: text/html`
    // with a body that *looks* like JSON but is not — the key is unquoted:
    //
    //     {
    //        status : "OK"
    //     }
    //
    // Parsing it threw `beCPG returned a non-JSON payload`, so every reorder was
    // reported to the user as a failure and rolled back in the grid **after the
    // repository had already moved the row** (measured: `bcpg:sort` went 10101 →
    // 10100 on the row the portal claimed it could not move). The status line is
    // the contract here, not the body.
    await response.text().catch(() => '');
    return { status: 'OK' };
}

export { parseListId, toFormPayload, toFormsName };
