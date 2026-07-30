/**
 * Form definitions — normalisation of what **Share** resolved, and persistence.
 *
 * The portal never resolves a form itself. The definition always comes from
 * Share (`lib/adapters/wizardConfig.js`, which owns both sources), because Share
 * is the only component that knows the effective configuration: the beCPG
 * cascade `formId + entityType + siteId + list`, client overrides included
 * (doc/becpg-api-contracts.md §1 and §8). This module does three things and
 * nothing else:
 *
 *   1. **normalise** whatever shape Share produced into one render-ready tree;
 *   2. **map** the beCPG control template onto a portal control
 *      ({@link CONTROL_TEMPLATES} — an exported table, made to be extended);
 *   3. **persist** a form through the Alfresco form processor
 *      ({@link saveForm}).
 *
 * ## The three input shapes we accept
 *
 * | Shape | Where it comes from | Recognised by |
 * |---|---|---|
 * | `{ tabs, sets, fields }` | the planned Share wizard endpoint (§8) | a `fields` array whose items carry `control` / `set` |
 * | `{ fields: [...] }` merged def | `POST /becpg/form` (`BecpgFormDefinition.getMergeDef`) | a `fields` array, `sets` embedded as `fieldType: "ContainerRepresentation"` |
 * | `{ columns: [...] }` | the existing `module/entity-datagrid/config/columns` (§1) | a `columns` array with `formsName` |
 *
 * The columns shape carries **no set/tab structure** — the datagrid does not
 * need one. Normalising it therefore yields a single implicit set
 * ({@link DEFAULT_SET_ID}). That is an acknowledged limitation of the fallback
 * mode, not a bug: the day the Share wizard endpoint exists, the same fields
 * arrive with their real sets and tabs and the UI does not change.
 *
 * ## Values never come from the definition
 *
 * A definition describes fields. Values come from the entity
 * (`becpg/remote/entity`) or from the datalist row
 * (`becpg/entity/datalists/data/...`, each cell being `{ value, displayValue }`).
 * {@link applyValues} is the single place the two are merged, so a definition
 * stays cacheable and shareable between users.
 *
 * Server only.
 */

import {
    becpgFetch,
    getJson,
    isNodeRef,
    nodeRefToPath,
    requireSession,
} from '@/lib/becpg';
import { BadRequestError, UpstreamError, errorFromStatus } from '@/lib/errors';
import { readErrorMessage } from '@/lib/http';
import { createContext, getColumnsConfig } from '@/lib/adapters/wizardConfig';

/* -------------------------------------------------------------------------- */
/* Control mapping                                                             */
/* -------------------------------------------------------------------------- */

/** Id of the implicit set used when the source carries no set structure. */
export const DEFAULT_SET_ID = 'default';

/**
 * **beCPG / Share control template → portal control.** Extend this table, not
 * the renderer.
 *
 * The key is the FreeMarker template file name as it appears in the Share form
 * configuration (`<control template="…/textarea.ftl">`); matching is done on the
 * base name, so a full classpath prefix is irrelevant.
 *
 * Every entry documents:
 *   - `control` — the portal control the UI must render;
 *   - `params`  — the control parameters that matter to the portal, and what
 *                 they mean. Unknown parameters are still forwarded untouched in
 *                 `control.params`, so a client-specific parameter never gets
 *                 lost on the way.
 *
 * Templates seen in the shipped configuration and in client overrides, ordered
 * by how often they occur.
 */
export const CONTROL_TEMPLATES = {
    /** Target association picker. `ds` = datasource URL, `parent`/`parentAssoc` = dependency. */
    'autocomplete-association.ftl': {
        control: 'autocomplete-association',
        params: { ds: 'datasource URL', parent: 'parent property', parentAssoc: 'parent association', pageLinkTemplate: 'link to the target entity', showTooltip: 'preview on hover', saveTitle: 'store the label instead of the nodeRef' },
    },
    /** Free-text autocomplete on a beCPG datasource (characteristics, lists…). */
    'autocomplete.ftl': {
        control: 'autocomplete',
        params: { ds: 'datasource URL', parent: 'parent property', local: 'datasource served by Share', maxLength: 'input max length', showPage: 'paginated results' },
    },
    /** Single-line text. */
    'textfield.ftl': { control: 'textfield', params: { maxLength: 'input max length', size: 'visible width' } },
    /** Multi-line text. */
    'textarea.ftl': { control: 'textarea', params: { rows: 'rows', columns: 'columns', activateLinks: 'linkify URLs in view mode' } },
    /** Number with a unit label (`kg`, `%`…). */
    'number-unit.ftl': { control: 'number-unit', params: { unit: 'unit displayed next to the value' } },
    /** Plain number. */
    'number.ftl': { control: 'number', params: { maxLength: 'input max length' } },
    /** Decimal number. */
    'number-float.ftl': { control: 'number', params: { decimals: 'decimal places' } },
    /** min/max pair. */
    'numberrange.ftl': { control: 'number-range', params: { unit: 'unit', minLabel: 'lower bound label', maxLabel: 'upper bound label' } },
    /** Single choice from a LIST constraint or from `options`. */
    'selectone.ftl': { control: 'select', params: { options: 'comma-separated values, `value|label` accepted' } },
    /** Multiple choice. */
    'selectmany.ftl': { control: 'multiselect', params: { options: 'comma-separated values' } },
    /** Multiple choice rendered as checkboxes. */
    'checkboxmany.ftl': { control: 'checkbox-group', params: { options: 'comma-separated values' } },
    /** Boolean. Both names exist in the configuration. */
    'boolean.ftl': { control: 'checkbox', params: {} },
    'checkbox.ftl': { control: 'checkbox', params: {} },
    /** Date, optionally with a time part. */
    'date.ftl': { control: 'date', params: { showTime: 'include a time picker' } },
    /** `cm:effectivity`-style from/to pair. */
    'daterange.ftl': { control: 'date-range', params: { showTime: 'include a time picker' } },
    /**
     * **Language picker**, not multilingual text — despite the name.
     * Alfresco's `mtlangue.ftl` is a multi-select of `locale.name.*` storing
     * `fr_FR,en_US`. Mapping it to `mltext` would send it to the multilingual
     * editor and corrupt the value. Multilingual TEXT is driven by the data type
     * `d:mltext`, never by this template.
     */
    'mtlangue.ftl': { control: 'locale-select', params: {} },
    /** Static informative text — never editable. */
    'info.ftl': { control: 'readonly-text', params: {} },
    /** Rich text. Rendered as sanitised HTML in view mode. */
    'richtext.ftl': { control: 'richtext', params: {} },
    /** Standard Alfresco association picker (no beCPG datasource). */
    'association.ftl': {
        control: 'association',
        params: { compactMode: 'compact rendering', displayMode: 'items|list', showTargetLink: 'link to the target', startLocation: 'browse root' },
    },
    /** Person / group picker. */
    'authority.ftl': { control: 'person', params: { authorityType: 'USER|GROUP' } },
    /** Colour picker. */
    'selectcolorpicker.ftl': { control: 'color', params: {} },
    /**
     * **Read-only file size.** Alfresco's `size.ftl` displays the size of a
     * content property; its only parameter is `property`, from which it reads
     * `size=` out of the content URL. It is not a dimension triplet.
     */
    'size.ftl': { control: 'size', params: { property: 'content property carrying the size' } },
    /** Recurrence period (`P1Y`, `P30D`…). */
    'period.ftl': { control: 'period', params: {} },
    /** External link. */
    'httplink.ftl': { control: 'link', params: { text: 'anchor text' } },
    /** Task priority. */
    'priority.ftl': { control: 'select', params: {} },
    /** Mime type picker. */
    'mimetype.ftl': { control: 'select', params: {} },
    /** SPEL formula editor — read-only for a supplier. */
    'spel-editor.ftl': { control: 'spel', params: {} },
    /** Computed nutritional score. Always read-only. */
    'nutrient-class.ftl': { control: 'nutrient-score', params: {} },
    /** Computed environmental score. Always read-only. */
    'ecoscore-class.ftl': { control: 'ecoscore', params: {} },
    /** Product unit (kg / L / P…). */
    'product-unit.ftl': { control: 'select', params: {} },
    /** Voluntary / involuntary allergen tri-state. */
    'allergen-voluntary.ftl': { control: 'select', params: {} },
    /** Client-specific configuration editor — read-only for a supplier. */
    'config-editor.ftl': { control: 'readonly-text', params: {} },
    /** Decision tree — not renderable in the portal, degrades to read-only text. */
    'decision-tree.ftl': { control: 'readonly-text', params: {} },
    /** Hidden field: submitted, never displayed. */
    'hidden.ftl': { control: 'hidden', params: {} },
    /** Explicitly read-only rendering of any value. */
    'readonly.ftl': { control: 'readonly', params: {} },
    /** Content / file field. */
    'content.ftl': { control: 'file', params: {} },
};

/**
 * Fallback mapping when the source carries no control template — which is the
 * case of the columns endpoint. Keyed by Alfresco data type.
 */
export const DATATYPE_CONTROLS = {
    'd:text': 'textfield',
    'd:mltext': 'mltext',
    'd:content': 'file',
    'd:int': 'number',
    'd:long': 'number',
    'd:float': 'number',
    'd:double': 'number',
    'd:boolean': 'checkbox',
    'd:date': 'date',
    'd:datetime': 'date',
    'd:noderef': 'autocomplete-association',
    'd:category': 'autocomplete-association',
    'd:qname': 'textfield',
    'd:period': 'period',
    'd:locale': 'select',
    'd:any': 'textfield',
};

/** Portal control used when nothing else matches. */
export const FALLBACK_CONTROL = 'textfield';

/**
 * Maps a control template onto a portal control name.
 *
 * @param {string} template template path or file name, e.g. `.../textarea.ftl`
 * @returns {string|null} the portal control, or null when unknown
 *
 * @example
 * controlForTemplate('org/alfresco/components/form/controls/textarea.ftl'); // 'textarea'
 */
export function controlForTemplate(template) {
    if (!template) {
        return null;
    }
    const base = String(template).split(/[\\/]/).pop();
    return CONTROL_TEMPLATES[base]?.control || null;
}

/**
 * Resolves the control of a field: template first, data type second, then the
 * fallback. Associations always end up on an association-shaped control.
 *
 * @param {Object} field a partially normalised field
 * @returns {string}
 */
export function resolveControl(field) {
    const fromTemplate = controlForTemplate(field?.control?.template);
    if (fromTemplate) {
        return fromTemplate;
    }
    if (field?.type === 'association' || field?.endpointType) {
        return 'autocomplete-association';
    }
    if (field?.dataType && DATATYPE_CONTROLS[field.dataType]) {
        // A LIST constraint turns a plain text field into a closed choice.
        if (DATATYPE_CONTROLS[field.dataType] === 'textfield' && hasListConstraint(field)) {
            return field.repeating ? 'multiselect' : 'select';
        }
        return DATATYPE_CONTROLS[field.dataType];
    }
    return FALLBACK_CONTROL;
}

/**
 * @param {Object} field
 * @returns {boolean} true when the field carries a LIST constraint
 */
function hasListConstraint(field) {
    return Array.isArray(field?.constraints)
        && field.constraints.some((constraint) => String(constraint?.type).toUpperCase() === 'LIST');
}

/* -------------------------------------------------------------------------- */
/* Helpers shared with datalists.js                                            */
/* -------------------------------------------------------------------------- */

/**
 * `bcpg:nutListValue` → `prop_bcpg_nutListValue`, `assoc_…` for an association.
 *
 * That is the key beCPG uses everywhere: datalist `itemData` keys, form
 * processor field names, datagrid sort fields. The Share columns endpoint
 * already returns it as `formsName`; this rebuilds it when it is missing.
 *
 * @param {string} name prefixed property/association name
 * @param {string} [type='property'] `property` | `association`
 * @returns {string}
 */
export function toFormsName(name, type = 'property') {
    const prefix = type === 'association' ? 'assoc' : 'prop';
    return `${prefix}_${String(name || '').replace(/:/g, '_')}`;
}

/**
 * The reverse of {@link toFormsName}.
 *
 * @param {string} formsName
 * @returns {string} the prefixed name, e.g. `bcpg:nutListValue`
 */
export function fromFormsName(formsName) {
    const value = String(formsName || '');
    const stripped = value.replace(/^(prop|assoc|dt)_/, '');
    return stripped.replace('_', ':');
}

/**
 * `options` of the columns endpoint is the field's help text
 * (`formConfig.fields[id].getHelpText()`). The datagrid convention is to put a
 * JSON object in it when the field needs control parameters
 * (`{"minWidth":150}`, `{"ds":"becpg/autocomplete/..."}`); anything else is
 * genuine help text meant for the user.
 *
 * @param {string} options raw `options` value
 * @returns {{ params: Object, help: string|null }}
 */
export function parseColumnOptions(options) {
    const raw = typeof options === 'string' ? options.trim() : '';
    if (!raw) {
        return { params: {}, help: null };
    }
    if (raw.startsWith('{')) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                return { params: parsed, help: typeof parsed.help === 'string' ? parsed.help : null };
            }
        }
        catch {
            // Not JSON after all — treat it as help text, as the datagrid does.
        }
    }
    return { params: {}, help: raw };
}

/* -------------------------------------------------------------------------- */
/* Normalisation                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A render-ready field.
 *
 * @typedef {Object} FormField
 * @property {string} id stable id (the `formsName`, unique inside the form)
 * @property {string} name prefixed property/association name
 * @property {string} formsName `prop_x` / `assoc_x`
 * @property {string} label already translated by beCPG
 * @property {string|null} description longer description, when the model has one
 * @property {string|null} help help text (from `options`)
 * @property {string} dataType Alfresco data type (`d:double`…) or `association`
 * @property {{template: string|null, name: string, params: Object}} control
 * @property {boolean} mandatory
 * @property {boolean} readOnly
 * @property {boolean} protectedField model-level protection (never editable)
 * @property {boolean} repeating multi-valued
 * @property {Object[]} constraints `[{ type, parameters }]`
 * @property {string} set id of the set the field belongs to
 * @property {string|null} tab id of the tab, when the form has tabs
 * @property {*} value raw value, filled by {@link applyValues}
 * @property {string|null} displayValue localised value, filled by {@link applyValues}
 * @property {Object[]|null} columns nested columns (sub-datalist / linked entity)
 */

/**
 * Normalises one field, whatever shape it arrived in.
 *
 * @param {Object} raw
 * @param {Object} [options]
 * @param {string} [options.set=DEFAULT_SET_ID]
 * @param {string|null} [options.tab=null]
 * @returns {FormField}
 */
export function normalizeField(raw, options = {}) {
    const name = raw.name || raw.id || '';
    const isAssociation = raw.type === 'association' || Boolean(raw.endpointType);
    const formsName = raw.formsName || toFormsName(name, isAssociation ? 'association' : 'property');

    const { params: optionParams, help: optionHelp } = parseColumnOptions(raw.options);
    const controlParams = {
        ...optionParams,
        ...(raw.params && typeof raw.params === 'object' ? raw.params : {}),
        ...(raw.control?.params && typeof raw.control.params === 'object' ? raw.control.params : {}),
    };
    // `help` is a message for the user, not a control parameter.
    delete controlParams.help;

    const field = {
        id: formsName,
        name,
        formsName,
        label: raw.label || '',
        description: raw.description || null,
        help: raw.help || optionHelp,
        dataType: raw.dataType || (isAssociation ? 'association' : null),
        type: isAssociation ? 'association' : (raw.type || 'property'),
        endpointType: raw.endpointType || null,
        endpointMany: raw.endpointMany === true || raw.repeating === true,
        control: {
            template: raw.control?.template || null,
            name: null,
            params: controlParams,
        },
        mandatory: raw.mandatory === true || raw.mandatory === 'true' || raw.endpointMandatory === true,
        readOnly: raw.readOnly === true || raw.readOnly === 'true',
        protectedField: raw.protectedField === true || raw.protectedField === 'true',
        repeating: raw.repeating === true || raw.repeating === 'true' || raw.endpointMany === true,
        constraints: Array.isArray(raw.constraints) ? raw.constraints : [],
        set: raw.set || options.set || DEFAULT_SET_ID,
        tab: raw.tab || options.tab || null,
        value: raw.value !== undefined ? raw.value : null,
        displayValue: raw.displayValue !== undefined ? raw.displayValue : null,
        columns: Array.isArray(raw.columns) && raw.columns.length > 0
            ? raw.columns.map((column) => normalizeField(column, { set: DEFAULT_SET_ID }))
            : null,
    };

    field.control.name = resolveControl(field);
    // A protected field is read-only whatever the configuration says.
    if (field.protectedField) {
        field.readOnly = true;
    }
    return field;
}

/**
 * Flattens the `ContainerRepresentation` sets of a `/becpg/form` merged
 * definition into `{ sets, fields }`.
 *
 * The merged definition nests fields as `set.fields = { "1": [...], "2": [...] }`
 * — one entry per rendering column. The portal is responsive and lays fields out
 * itself, so the column index is kept as `numberOfColumns` on the set and the
 * fields are flattened in reading order.
 *
 * Containers can nest. The enclosing container id is carried down as `parent`, so
 * a set that only groups other sets keeps its children attached instead of seeing
 * them flattened into siblings.
 *
 * @param {Object[]} nodes `fields` array of the merged definition
 * @param {string|null} tab current tab id
 * @param {{sets: Object[], fields: Object[]}} accumulator
 * @param {string|null} [parentSetId] enclosing container id
 * @returns {{sets: Object[], fields: Object[]}}
 */
function flattenMergedFields(nodes, tab, accumulator, parentSetId = null) {
    for (const node of nodes || []) {
        if (!node || typeof node !== 'object') {
            continue;
        }
        if (node.fieldType === 'ContainerRepresentation') {
            const setId = node.id || DEFAULT_SET_ID;
            accumulator.sets.push({
                id: setId,
                label: node.label || '',
                appearance: node.appearance || node.type || 'panel',
                numberOfColumns: Number(node.numberOfColumns) || 1,
                tab: node.tab || tab || null,
                parent: parentSetId,
                fields: [],
            });
            const columns = node.fields && typeof node.fields === 'object' ? node.fields : {};
            const ordered = Object.keys(columns)
                .sort((a, b) => Number(a) - Number(b))
                .flatMap((key) => (Array.isArray(columns[key]) ? columns[key] : []));
            flattenMergedFields(ordered, node.tab || tab || null, {
                sets: accumulator.sets,
                fields: accumulator.fields,
                currentSet: setId,
            }, setId);
            continue;
        }
        accumulator.fields.push(normalizeField(node, {
            set: node.set || accumulator.currentSet || DEFAULT_SET_ID,
            tab,
        }));
    }
    return accumulator;
}

/**
 * Normalises any Share/beCPG form payload into the portal's render-ready tree.
 *
 * ```
 * { tabs: [{ id, label }],
 *   sets: [{ id, label, appearance, numberOfColumns, tab, fields: [fieldId] }],
 *   fields: [FormField] }
 * ```
 *
 * @param {Object} raw one of the three shapes documented at the top of the file
 * @param {Object} [options]
 * @param {string} [options.formId] echoed back for traceability
 * @param {string} [options.itemType] echoed back for traceability
 * @param {string} [options.mode] echoed back for traceability
 * @returns {{tabs: Object[], sets: Object[], fields: FormField[], formId: ?string, itemType: ?string, mode: ?string}}
 *
 * @example
 * const definition = normalizeFormDefinition({ columns }, { formId: 'supplier' });
 */
export function normalizeFormDefinition(raw, options = {}) {
    const source = raw || {};
    let sets = [];
    let fields = [];

    if (Array.isArray(source.columns)) {
        // Columns endpoint: flat list, no set structure (see the file header).
        fields = source.columns.map((column) => normalizeField(column));
    }
    else if (Array.isArray(source.fields)) {
        const declaredSets = Array.isArray(source.sets) ? source.sets : null;
        if (declaredSets) {
            sets = declaredSets.map((set) => ({
                id: set.id || DEFAULT_SET_ID,
                label: set.label || '',
                appearance: set.appearance || 'panel',
                numberOfColumns: Number(set.numberOfColumns) || 1,
                tab: set.tab || null,
                // Share allows `<set parent="…">`; keeping the link lets the renderer
                // nest panels instead of flattening them into siblings.
                parent: set.parent || set.parentId || null,
                fields: [],
            }));
            fields = source.fields.map((field) => normalizeField(field));
        }
        else {
            const flattened = flattenMergedFields(source.fields, null, { sets: [], fields: [] });
            sets = flattened.sets;
            fields = flattened.fields;
        }
    }

    // Every field must belong to a set the UI can render.
    const setsById = new Map(sets.map((set) => [set.id, set]));
    for (const field of fields) {
        if (!setsById.has(field.set)) {
            const set = {
                id: field.set,
                label: '',
                appearance: 'panel',
                numberOfColumns: 1,
                tab: field.tab || null,
                fields: [],
            };
            setsById.set(set.id, set);
            sets.push(set);
        }
        setsById.get(field.set).fields.push(field.id);
    }
    // Drop sets that ended up empty (a filtered tab, a set whose fields were all
    // hidden by the security rules) — but KEEP a set that has no field of its own
    // yet still parents other sets. beCPG uses such container sets purely for
    // nesting; dropping one detaches its children, which then lose their grouping
    // in the renderer. Iterate until nothing more can be dropped, so a chain of
    // empty containers collapses only when the whole branch is empty.
    const hasChildSet = (setId, remaining) => remaining.some((candidate) => candidate.parent === setId);
    let previousCount = -1;
    while (sets.length !== previousCount) {
        previousCount = sets.length;
        sets = sets.filter((set) => set.fields.length > 0 || hasChildSet(set.id, sets));
    }

    const tabs = (Array.isArray(source.tabs) ? source.tabs : [])
        .map((tab) => ({ id: tab.id || '', label: tab.label || '' }))
        .filter((tab) => tab.id && sets.some((set) => set.tab === tab.id));

    return {
        formId: options.formId || source.formId || null,
        itemType: options.itemType || source.itemType || null,
        mode: options.mode || null,
        tabs,
        sets,
        fields,
    };
}

/* -------------------------------------------------------------------------- */
/* Values                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Reads a value out of a beCPG payload, whichever key convention it uses.
 *
 * beCPG indexes values by `formsName` in datalist rows (`prop_bcpg_x`) and by
 * the prefixed name in `becpg/remote/entity` (`bcpg:x`). Cells can be a scalar
 * or `{ value, displayValue }`.
 *
 * @param {Object} values source map
 * @param {FormField} field
 * @returns {{value: *, displayValue: string|null}}
 */
export function readFieldValue(values, field) {
    if (!values || typeof values !== 'object') {
        return { value: null, displayValue: null };
    }
    const candidates = [field.formsName, field.name, field.id];
    for (const key of candidates) {
        if (key && Object.prototype.hasOwnProperty.call(values, key)) {
            const cell = values[key];
            if (cell && typeof cell === 'object' && !Array.isArray(cell)
                && ('value' in cell || 'displayValue' in cell)) {
                return {
                    value: cell.value !== undefined ? cell.value : null,
                    displayValue: cell.displayValue !== undefined && cell.displayValue !== null
                        ? String(cell.displayValue)
                        : null,
                };
            }
            return { value: cell === undefined ? null : cell, displayValue: null };
        }
    }
    return { value: null, displayValue: null };
}

/**
 * Merges values into a definition. Returns a **copy**: definitions are cached
 * and shared, they must never be mutated.
 *
 * @param {Object} definition a normalised definition
 * @param {Object} values entity attributes or a datalist row's `itemData`
 * @returns {Object} the definition with `value` / `displayValue` filled in
 *
 * @example
 * const filled = applyValues(definition, entity.attributes);
 */
export function applyValues(definition, values) {
    if (!definition) {
        return definition;
    }
    return {
        ...definition,
        fields: definition.fields.map((field) => ({ ...field, ...readFieldValue(values, field) })),
    };
}

/* -------------------------------------------------------------------------- */
/* Reading a definition                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Fetches and normalises the definition of a form.
 *
 * Delegates the resolution to Share through `wizardConfig.getColumnsConfig`;
 * the portal contributes nothing but the normalisation.
 *
 * @param {Object} ctx a {@link import('./wizardConfig').WizardContext}
 * @param {Object} params
 * @param {string} params.itemType prefixed type (`bcpg:rawMaterial`, `bcpg:nutList`…)
 * @param {string} [params.formId] dedicated form id (`supplier`…)
 * @param {string} [params.listId] datalist name, `@N` suffix included
 * @param {'view'|'edit'|'create'} [params.mode='edit']
 * @param {Object} [params.values] values to merge in
 * @param {boolean} [params.noCache=false]
 * @returns {Promise<Object>} the render-ready definition
 *
 * @example
 * const definition = await getFormDefinition(ctx,
 *     { itemType: 'bcpg:rawMaterial', formId: 'supplier', mode: 'edit', values });
 */
export async function getFormDefinition(ctx, params = {}) {
    const { itemType, formId = null, listId = null, mode = 'edit', values = null, noCache = false } = params;
    if (!itemType) {
        throw new BadRequestError('getFormDefinition requires an itemType');
    }

    const columns = await getColumnsConfig(ctx, {
        itemType,
        list: listId,
        formId,
        // The columns endpoint only distinguishes view / edit / create / bulk-edit.
        mode: mode === 'create' ? 'create' : mode,
        noCache,
    });

    const definition = normalizeFormDefinition({ columns }, { formId, itemType, mode });
    // A view-mode form is read-only end to end, whatever the field configuration
    // says — the security decision has already been taken by the caller.
    if (mode === 'view') {
        definition.fields = definition.fields.map((field) => ({ ...field, readOnly: true }));
    }
    return values ? applyValues(definition, values) : definition;
}

/* -------------------------------------------------------------------------- */
/* Persistence                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Turns a portal value into what the Alfresco form processor expects.
 *
 * - `null` / `undefined` → empty string (that is how the form processor clears
 *   a property; omitting the key would leave the old value in place);
 * - booleans → `"true"` / `"false"`;
 * - `Date` → ISO 8601;
 * - arrays → comma-separated (associations and repeating properties);
 * - `{ value }` cells → their `value`.
 *
 * @param {*} value
 * @returns {string}
 */
export function toFormValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (Array.isArray(value)) {
        return value.map((item) => toFormValue(item)).filter((item) => item !== '').join(',');
    }
    if (typeof value === 'object') {
        if ('value' in value) {
            return toFormValue(value.value);
        }
        if ('nodeRef' in value) {
            return String(value.nodeRef);
        }
        // An mltext map `{ fr: "…", en: "…" }` has no scalar form: JSON is what
        // beCPG's multilingual field control posts.
        return JSON.stringify(value);
    }
    return String(value);
}

/**
 * Normalises a value map into form-processor field names.
 *
 * Accepts either convention as input (`bcpg:legalName` or `prop_bcpg_legalName`)
 * and always emits the `prop_` / `assoc_` form. Association values are emitted
 * as `assoc_x_added`, which is the additive form the processor understands, plus
 * `assoc_x_removed` when the caller provides `{ added, removed }`.
 *
 * @param {Object} values
 * @param {FormField[]} [fields] the definition, used to tell properties from associations
 * @returns {Object} form-processor payload
 */
export function toFormPayload(values, fields = []) {
    const byName = new Map();
    for (const field of fields || []) {
        byName.set(field.name, field);
        byName.set(field.formsName, field);
    }

    const payload = {};
    for (const [key, rawValue] of Object.entries(values || {})) {
        const field = byName.get(key);
        const isAssociation = field
            ? field.type === 'association'
            : String(key).startsWith('assoc_');
        const formsName = String(key).startsWith('prop_') || String(key).startsWith('assoc_')
            ? String(key)
            : toFormsName(key, isAssociation ? 'association' : 'property');

        if (isAssociation) {
            if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)
                && ('added' in rawValue || 'removed' in rawValue)) {
                payload[`${formsName}_added`] = toFormValue(rawValue.added);
                payload[`${formsName}_removed`] = toFormValue(rawValue.removed);
            }
            else {
                payload[`${formsName}_added`] = toFormValue(rawValue);
                payload[`${formsName}_removed`] = '';
            }
            continue;
        }
        payload[formsName] = toFormValue(rawValue);
    }
    return payload;
}

/**
 * Persists a form through the Alfresco form processor.
 *
 * Two targets, exactly as Share's `submissionUrl`:
 *
 * | `target` | Endpoint | Meaning |
 * |---|---|---|
 * | a nodeRef | `POST api/node/{store}/{id}/formprocessor` | update an existing node |
 * | a prefixed type | `POST api/type/{type}/formprocessor?alf_destination=…` | create a node of that type |
 *
 * The `api/type/...` path is not in `ALLOWED_BECPG_PATH_PREFIXES`: that
 * allow-list guards the **generic proxy**, whose path is chosen by the browser.
 * Here the path is built server-side from a validated target, so the call is
 * made with `skipAllowList` — the option `lib/becpg.js` documents as "internal
 * composition calls only".
 *
 * @param {string} target a nodeRef (update) or a prefixed type (create)
 * @param {Object} values value map, either key convention
 * @param {Object} [options]
 * @param {FormField[]} [options.fields] definition, to tell properties from associations
 * @param {string} [options.destination] parent nodeRef, required when creating
 * @param {string} [options.entityNodeRef] entity context, for the security rules
 * @param {boolean} [options.skipSecurityRules=false] wizard attribute
 * @param {Object} [options.session] an already-resolved session
 * @returns {Promise<{nodeRef: string|null, persistedObject: string|null, raw: Object}>}
 * @throws {BadRequestError} when the target is neither a nodeRef nor a type
 *
 * @example
 * await saveForm(entityNodeRef, { 'bcpg:legalName': 'ACME' }, { fields: definition.fields });
 * await saveForm('bcpg:nutList', values, { destination: listNodeRef });
 */
export async function saveForm(target, values, options = {}) {
    const session = options.session || await requireSession();
    const payload = toFormPayload(values, options.fields);

    let path;
    const query = {};
    if (isNodeRef(target)) {
        path = `api/node/${nodeRefToPath(target)}/formprocessor`;
    }
    else if (typeof target === 'string' && target.includes(':')) {
        if (!options.destination) {
            throw new BadRequestError('Creating a node requires a destination');
        }
        path = `api/type/${target.replace(/:/g, '_')}/formprocessor`;
        query.alf_destination = options.destination;
    }
    else {
        throw new BadRequestError('saveForm expects a nodeRef or a prefixed type');
    }

    if (options.entityNodeRef) {
        query.entityNodeRef = options.entityNodeRef;
    }
    if (options.skipSecurityRules) {
        query.skipSecurityRules = 'true';
    }

    const response = await becpgFetch(path, {
        method: 'POST',
        query,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        session,
        skipAllowList: true,
        retries: 0,
    });

    if (!response.ok) {
        const message = await readErrorMessage(response);
        throw errorFromStatus(response.status, message, { label: 'becpg', path });
    }

    const text = await response.text();
    let raw = {};
    if (text.trim()) {
        try {
            raw = JSON.parse(text);
        }
        catch (error) {
            throw new UpstreamError('The form processor returned a non-JSON payload', {
                details: { path },
                cause: error,
            });
        }
    }

    const persisted = raw.persistedObject || raw.nodeRef || null;
    return { nodeRef: persisted, persistedObject: persisted, raw };
}

/**
 * Updates a single field of an entity — the autosave path of the wizard.
 *
 * @param {string} nodeRef
 * @param {string} field prefixed name or `formsName`
 * @param {*} value
 * @param {Object} [options] same as {@link saveForm}
 * @returns {Promise<Object>}
 */
export function saveField(nodeRef, field, value, options = {}) {
    return saveForm(nodeRef, { [field]: value }, options);
}

/**
 * Reads the entity and returns its attributes, ready for {@link applyValues}.
 *
 * `becpg/remote/entity` answers either `{ entity: {...} }` or the entity itself
 * depending on the version; both are accepted here so a repository upgrade
 * cannot silently empty every form.
 *
 * @param {string} nodeRef
 * @param {Object} [options]
 * @param {Object} [options.session]
 * @returns {Promise<{entity: Object, attributes: Object}>}
 */
export async function getEntityValues(nodeRef, options = {}) {
    if (!isNodeRef(nodeRef)) {
        throw new BadRequestError('getEntityValues requires a nodeRef');
    }
    const payload = await getJson('becpg/remote/entity', {
        query: { nodeRef },
        session: options.session,
    });

    const entity = payload?.entity || payload || {};
    return { entity, attributes: entity.attributes || {} };
}

export { createContext };
