/**
 * Contextual datasources — `POST /api/v1/autocomplete/{formId}/{fieldId}`.
 *
 * A beCPG autocomplete control is not a static list: its datasource URL lives in
 * the control parameter `ds`, and it can **depend on another field of the same
 * form**. `autocomplete-association.ftl` declares that dependency as `parent`
 * (a property) or `parentAssoc` (an association) and the picker appends
 * `&parent=<value of that field>` to every query — that is how "plants filtered
 * by the selected supplier" works (doc/becpg-api-contracts.md §3).
 *
 * A GET endpoint could not express that: the portal would have to smuggle the
 * whole form state into the query string. Hence a POST whose body carries the
 * other field values, and hence this adapter, which:
 *
 *   1. finds the field in the form definition (Share-resolved, never guessed);
 *   2. reads its `ds` — or rebuilds the default one for an association;
 *   3. resolves the parent value out of the submitted form values;
 *   4. appends `q` / `page` / `pageSize` / `parent` and the context parameters
 *      the control adds server-side (`entityNodeRef`, `itemId`, `fieldName`);
 *   5. normalises the answer to `{ items: [{ value, label, metadata }], total, page }`.
 *
 * ## Security
 *
 * The datasource URL is **never** taken from the request body. It comes from the
 * form definition Share resolved, and it is checked against
 * {@link AUTOCOMPLETE_PATH_PREFIX} before being called. A supplier can therefore
 * not turn this route into a generic Alfresco reader by posting a crafted `ds`.
 *
 * Server only.
 */

import { becpgJson } from '@/lib/becpg';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { getFormDefinition } from '@/lib/adapters/forms';

/** Every legitimate datasource lives under this webscript family. */
export const AUTOCOMPLETE_PATH_PREFIX = 'becpg/autocomplete/';

/** Suggestions returned when the caller does not say. */
export const DEFAULT_PAGE_SIZE = 25;

/** Hard ceiling on the page size. */
export const MAX_PAGE_SIZE = 100;

/** Controls whose values come from a datasource. */
const AUTOCOMPLETE_CONTROLS = new Set(['autocomplete', 'autocomplete-association', 'association']);

/* -------------------------------------------------------------------------- */
/* Datasource resolution                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Splits a `ds` into its path and its own query parameters.
 *
 * A `ds` is a webscript path, possibly with a query string already attached
 * (`becpg/autocomplete/targetassoc/associations/bcpg:ingTypeItem?filter=x`).
 *
 * @param {string} ds
 * @returns {{path: string, query: Object}}
 * @throws {ForbiddenError} when the path is not an autocomplete datasource
 */
export function parseDatasource(ds) {
    const raw = String(ds || '').trim().replace(/^\/+/, '');
    if (!raw) {
        throw new BadRequestError('Field carries no datasource');
    }
    // Strip a Share/Alfresco proxy prefix, should the configuration carry one.
    const cleaned = raw
        .replace(/^share\/proxy\/alfresco\//, '')
        .replace(/^proxy\/alfresco\//, '')
        .replace(/^alfresco\/s\//, '')
        .replace(/^service\//, '');

    const [path, search = ''] = cleaned.split('?');
    if (!path.startsWith(AUTOCOMPLETE_PATH_PREFIX)) {
        throw new ForbiddenError('This datasource is not reachable through the supplier portal', {
            details: { datasource: path.slice(0, 120) },
        });
    }

    const query = {};
    for (const [name, value] of new URLSearchParams(search)) {
        query[name] = value;
    }
    return { path, query };
}

/**
 * The datasource of a field.
 *
 * When the control declares no `ds`, an association falls back on the default
 * beCPG datasource — the same rule `autocomplete-association.ftl` applies:
 * `becpg/autocomplete/targetassoc/associations/{endpointType}`.
 *
 * @param {Object} field a normalised field
 * @returns {string|null}
 */
export function datasourceForField(field) {
    const declared = field?.control?.params?.ds;
    if (declared) {
        return String(declared);
    }
    const target = field?.endpointType || (field?.dataType === 'd:noderef' ? field?.name : null);
    if (field?.type === 'association' && target) {
        return `${AUTOCOMPLETE_PATH_PREFIX}targetassoc/associations/${target}`;
    }
    return null;
}

/**
 * Resolves the value of the field the datasource depends on.
 *
 * `parent` names a property, `parentAssoc` an association; both are declared
 * without the `prop_` / `assoc_` prefix and with `_` instead of `:`, exactly as
 * the Share control writes the DOM id. The submitted values may use any of the
 * three conventions, so all are tried.
 *
 * @param {Object} field a normalised field
 * @param {Object} values the other form values, as posted
 * @returns {string|null} the parent value, ready to be sent as `parent`
 */
export function resolveParentValue(field, values) {
    const params = field?.control?.params || {};
    const declared = params.parentAssoc || params.parent;
    if (!declared || !values || typeof values !== 'object') {
        return null;
    }

    const isAssoc = Boolean(params.parentAssoc);
    const underscored = String(declared).replace(/:/g, '_');
    const prefixed = `${isAssoc ? 'assoc' : 'prop'}_${underscored}`;
    const candidates = [
        prefixed,
        `${prefixed}_added`,
        underscored,
        String(declared),
        underscored.replace('_', ':'),
    ];

    for (const key of candidates) {
        if (Object.prototype.hasOwnProperty.call(values, key)) {
            const value = values[key];
            if (value === null || value === undefined || value === '') {
                return null;
            }
            if (Array.isArray(value)) {
                return value.map((item) => extractScalar(item)).filter(Boolean).join(',') || null;
            }
            return extractScalar(value);
        }
    }
    return null;
}

/**
 * @param {*} value
 * @returns {string|null}
 */
function extractScalar(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    if (typeof value === 'object') {
        if ('value' in value) {
            return extractScalar(value.value);
        }
        if ('nodeRef' in value) {
            return String(value.nodeRef);
        }
        return null;
    }
    return String(value);
}

/* -------------------------------------------------------------------------- */
/* Querying                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A normalised suggestion.
 *
 * @typedef {Object} AutocompleteItem
 * @property {string} value the value to store (a nodeRef, a code, a literal)
 * @property {string} label the label to display — already localised by beCPG
 * @property {string|null} cssClass icon class beCPG suggests for the entry
 * @property {Object} metadata `metadatas: [{key, value}]` flattened into a map
 */

/**
 * Normalises the answer of a beCPG autocomplete webscript.
 *
 * @param {Object} payload `{ result, page, pageSize, fullListSize }`
 * @returns {{items: AutocompleteItem[], total: number, page: number, pageSize: number}}
 */
export function normalizeAutocomplete(payload) {
    const result = Array.isArray(payload?.result) ? payload.result : [];
    const items = result.map((entry) => {
        const metadata = {};
        for (const item of Array.isArray(entry?.metadatas) ? entry.metadatas : []) {
            if (item && item.key !== undefined) {
                metadata[item.key] = item.value;
            }
        }
        return {
            value: entry?.value !== undefined && entry?.value !== null ? String(entry.value) : '',
            label: entry?.name !== undefined && entry?.name !== null ? String(entry.name) : '',
            cssClass: entry?.cssClass || null,
            metadata,
        };
    });

    return {
        items,
        total: Number(payload?.fullListSize ?? items.length) || items.length,
        page: Number(payload?.page ?? 1) || 1,
        pageSize: Number(payload?.pageSize ?? items.length) || items.length,
    };
}

/**
 * Calls a datasource.
 *
 * @param {Object} params
 * @param {string} params.ds datasource, from the form definition only
 * @param {string} [params.q] search term (`*` lists the first page)
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=DEFAULT_PAGE_SIZE]
 * @param {string} [params.parent] resolved parent value
 * @param {string} [params.entityNodeRef] entity context
 * @param {string} [params.itemId] item type or nodeRef the form edits
 * @param {string} [params.fieldName] prefixed field name
 * @param {Object} [params.extra] extra parameters declared by the control
 * @param {Object} [params.session]
 * @returns {Promise<{items: AutocompleteItem[], total: number, page: number, pageSize: number}>}
 */
export async function queryDatasource(params = {}) {
    const { path, query } = parseDatasource(params.ds);

    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.pageSize) || DEFAULT_PAGE_SIZE));
    const page = Math.max(1, Number(params.page) || 1);

    const payload = await becpgJson(path, {
        method: 'GET',
        query: {
            ...query,
            ...(params.extra || {}),
            q: params.q ? String(params.q) : '*',
            page,
            pageSize,
            ...(params.parent ? { parent: params.parent } : {}),
            ...(params.entityNodeRef ? { entityNodeRef: params.entityNodeRef } : {}),
            ...(params.itemId ? { itemId: params.itemId } : {}),
            ...(params.fieldName ? { fieldName: params.fieldName } : {}),
        },
        session: params.session,
    });

    return normalizeAutocomplete(payload);
}

/**
 * The endpoint behind `POST /api/v1/autocomplete/{formId}/{fieldId}`.
 *
 * Resolves the field through Share, reads its datasource, resolves the
 * dependency on the other submitted values, and queries.
 *
 * @param {Object} ctx a {@link import('./wizardConfig').WizardContext}
 * @param {Object} params
 * @param {string} params.formId form id the field belongs to (may be null/`default`)
 * @param {string} params.fieldId field id: `prop_x`, `assoc_x` or `bcpg:x`
 * @param {string} params.itemType prefixed type the form edits
 * @param {string} [params.listId] datalist name, when the field is a grid cell
 * @param {string} [params.q] search term
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=DEFAULT_PAGE_SIZE]
 * @param {Object} [params.values] the other form values (dependency resolution)
 * @param {string} [params.entityNodeRef]
 * @returns {Promise<Object>} `{ items, total, page, pageSize, field: {…} }`
 * @throws {NotFoundError} when the form carries no such field
 * @throws {BadRequestError} when the field is not an autocomplete field
 *
 * @example
 * await autocomplete(ctx, { formId: 'supplier', fieldId: 'assoc_bcpg_plants',
 *     itemType: 'bcpg:supplier', q: 'lyo', values: { assoc_bcpg_supplier: nodeRef } });
 */
export async function autocomplete(ctx, params = {}) {
    const { formId, fieldId, itemType, listId = null, values = {}, entityNodeRef = null } = params;
    if (!fieldId) {
        throw new BadRequestError('Missing field id');
    }
    if (!itemType) {
        throw new BadRequestError('Missing itemType: the field cannot be resolved without its form');
    }

    const definition = await getFormDefinition(ctx, {
        itemType,
        formId: formId && formId !== 'default' ? formId : null,
        listId,
        mode: 'edit',
    });

    const needle = String(fieldId);
    const field = definition.fields.find((candidate) => candidate.id === needle
        || candidate.formsName === needle
        || candidate.name === needle
        || candidate.name === needle.replace(/^(prop|assoc)_/, '').replace('_', ':'));

    if (!field) {
        throw new NotFoundError(`Form "${formId || 'default'}" carries no field "${fieldId}"`, {
            details: { formId, fieldId, itemType },
        });
    }
    if (!AUTOCOMPLETE_CONTROLS.has(field.control.name)) {
        throw new BadRequestError(`Field "${field.name}" is not a datasource-backed field`, {
            details: { control: field.control.name },
        });
    }

    const ds = datasourceForField(field);
    if (!ds) {
        throw new BadRequestError(`Field "${field.name}" declares no datasource`);
    }

    // Parameters the Share control appends server-side, kept so a datasource
    // plugin that relies on them keeps behaving identically.
    const extra = {};
    if (field.control.params.filter) {
        extra.filter = field.control.params.filter;
    }
    if (field.control.params.className || field.control.params.classNames) {
        extra.classNames = field.control.params.classNames || field.control.params.className;
    }
    if (field.control.params.excludeClassNames) {
        extra.excludeClassNames = field.control.params.excludeClassNames;
    }
    if (field.control.params.excludeProps) {
        extra.excludeProps = field.control.params.excludeProps;
    }
    if (field.control.params.andProps) {
        extra.andProps = field.control.params.andProps;
    }
    if (field.control.params.path) {
        extra.path = field.control.params.path;
    }

    const result = await queryDatasource({
        ds,
        q: params.q,
        page: params.page,
        pageSize: params.pageSize,
        parent: resolveParentValue(field, values),
        entityNodeRef: entityNodeRef || ctx?.entityNodeRef || null,
        itemId: entityNodeRef || itemType,
        fieldName: field.name,
        extra,
        session: ctx?.session,
    });

    return {
        ...result,
        field: {
            id: field.id,
            name: field.name,
            label: field.label,
            control: field.control.name,
            multiple: field.repeating || field.endpointMany,
            dependsOn: field.control.params.parentAssoc || field.control.params.parent || null,
        },
    };
}
