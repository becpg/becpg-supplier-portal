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
    getEntityJson,
    getJson,
    isNodeRef,
    nodeRefToPath,
    requireSession,
} from '@/lib/becpg';
import { BadRequestError, UpstreamError, errorFromStatus } from '@/lib/errors';
import { readErrorMessage } from '@/lib/http';
import { mlTextFromAttributes, readMlText, recoverMlText } from '@/lib/mltext';
import { isNodeRefValue, nodeLabel } from '@/lib/format';
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
    /*
     * Tri-state, not a checkbox. beCPG overrides Alfresco's `boolean.ftl` with
     * three radios -- Oui / Non / (vide) -- because a beCPG boolean property has
     * three states and "no" is not "not answered yet". A checkbox here would
     * write `false` over a question the supplier never answered.
     */
    'boolean.ftl': { control: 'boolean', params: {} },
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
    /*
     * Voluntary allergen presence: the same three radios as `boolean.ftl`, in a
     * template of its own only because Share also hangs the decision tree off
     * it. Mapping it to a select gave it no options at all, and a closed list
     * with nothing in it renders read-only -- so the column could not be filled.
     */
    'allergen-voluntary.ftl': { control: 'boolean', params: {} },
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
 * Qualifies a data type with its model prefix.
 *
 * **Why this exists.** Every `d:`-keyed comparison in the portal
 * (`DATATYPE_CONTROLS` below, `components/form/controls/index.js`,
 * `components/form/validation.js`, `DateControl`, `ReadOnlyControl`,
 * `ProductSections`, `autocomplete.js`) expects `d:double`. beCPG never sends
 * that: measured on a 26.1.0 instance, `POST /becpg/form` answers
 * `{"name":"bcpg:ingListQtyPerc","dataType":"double"}` — the **local name**,
 * unprefixed — and `columns.get.json.ftl` re-emits `col.dataType` verbatim, so
 * `module/entity-datagrid/config/columns` carries the bare name too.
 * (`doc/becpg-api-contracts.md` §1 showed `"d:double"`; it was wrong, and is
 * corrected.) Nothing therefore ever matched: every property fell through to
 * `FALLBACK_CONTROL`, so a date got a text box and a boolean got a text box.
 *
 * Normalising here, at the single funnel both sources go through, fixes the
 * whole chain without touching the twenty comparison sites.
 *
 * Any existing prefix is preserved — an association column carries its *target
 * type* in `dataType` (`bcpg:ing`, from the `<#else>` branch of that template),
 * which must not become `d:bcpg:ing`.
 *
 * @param {*} dataType `double`, `d:double`, `bcpg:ing`, null…
 * @returns {string|null} the prefixed type, or null when there is none
 *
 * @example
 * qualifyDataType('double');    // 'd:double'
 * qualifyDataType('d:double');  // 'd:double'
 * qualifyDataType('bcpg:ing');  // 'bcpg:ing'
 */
export function qualifyDataType(dataType) {
    if (typeof dataType !== 'string') {
        return null;
    }
    const value = dataType.trim();
    if (!value) {
        return null;
    }
    return value.includes(':') ? value : `d:${value}`;
}

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
        // `help` (wizard endpoint) and `options` (columns endpoint) are the SAME
        // beCPG field under two names — `portal-form.lib.js` is an extraction of
        // `columns.get.js`, only the serialisation differs (contracts §8). So
        // both carry both shapes: genuine help text, **or** a JSON blob of
        // datagrid parameters. Only `options` was being parsed, so a column
        // configured with `{"width":200}` printed that JSON at the supplier as
        // help text — measured under « % AR par portion » on the nutrient step,
        // invisible on a desktop grid and plainly visible in the card layout of a
        // phone. `parseColumnOptions` already tells the two shapes apart (it only
        // attempts a parse when the string opens with `{`, and falls back to
        // treating it as text), so routing `raw.help` through it costs nothing
        // and cannot swallow a real message.
        //
        // Only the *help* half is taken here. The parameters half of `raw.help`
        // stays dropped, exactly as before: feeding new control params into every
        // wizard-sourced field is a behaviour change, and this is a display fix.
        help: parseColumnOptions(raw.help).help || optionHelp,
        dataType: qualifyDataType(raw.dataType) || (isAssociation ? 'association' : null),
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
        /*
         * `recoverMlText` catches a locale map saved as text —
         * `{"fr":"Sucre cristal"}` — the leftover of a portal write defect fixed
         * since (see `lib/mltext.js`). Left uncaught, it was displayed as such in
         * the input field, and the first save encoded it once more. Turned back
         * into a real map, it is handled by the multilingual control and goes
         * back out straight.
         */
        value: raw.value !== undefined ? recoverMlText(raw.value) : null,
        displayValue: raw.displayValue !== undefined ? readMlText(raw.displayValue) : null,
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
    /*
     * A `d:mltext` is read from its sibling keys, never from the base key: that
     * one holds the caller's language alone, and a form built on it shows one
     * box filled and erases the other languages on the next save.
     */
    if (field.dataType === 'd:mltext') {
        const map = mlTextFromAttributes(values, field.name);
        if (map) {
            const base = readRawFieldValue(values, field);
            return {
                value: map,
                displayValue: base.displayValue
                    ?? (typeof base.value === 'string' ? base.value : null),
            };
        }
    }
    return readRawFieldValue(values, field);
}

/**
 * The value under the first key the field answers to, whatever its type.
 *
 * @param {Object} values source map
 * @param {FormField} field
 * @returns {{value: *, displayValue: string|null}}
 */
function readRawFieldValue(values, field) {
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
/* d:noderef — resolving the label                                             */
/* -------------------------------------------------------------------------- */

/**
 * Fills `displayValue` for the `d:noderef` fields whose value beCPG left as an
 * identifier, or as an expanded node the generic renderers cannot read.
 *
 * **Why this exists.** `bcpg:productHierarchy1` / `bcpg:productHierarchy2` —
 * *Famille* and *Sous-famille* — are `d:noderef` properties pointing at a
 * `bcpg:linkedValue` of the product classification. Share renders the target's
 * label; the portal rendered nothing at all, or the identifier.
 *
 * ## The two shapes, both measured on the reference instance
 *
 * `becpg/remote/entity` **expands** a `d:noderef` whenever the caller may read
 * the target, and only then:
 *
 * ```json
 * "bcpg:productHierarchy1": { "path": "/app:company_home/cm:System/…",
 *                             "bcpg:lkvValue": "Ingrédients de base",
 *                             "id": "f30163c4-…", "type": "bcpg:linkedValue" }
 * ```
 *
 * That is the common case, and it needs **no repository call**: the label is
 * already in the payload, under `bcpg:lkvValue`. The earlier version of this
 * function only looked for a bare `workspace://SpacesStore/…` string, so it never
 * fired on a real sheet — and `readableValue` then found no `displayValue`,
 * no `label`, no `name` on that object and dropped the field silently.
 *
 * A target the caller may **not** read stays a bare nodeRef string. That one is
 * read here, one call per distinct target — two or three values on a sheet, not
 * a list. `becpg/remote/entity/list` with `=sys:node-uuid:` (the pattern the task
 * adapter uses to name products) returns **nothing** for a `bcpg:linkedValue` or
 * a `bcpg:charact`: verified on dev, that listing only serves entities.
 * `becpg/remote/entity?nodeRef=` reads them.
 *
 * When the target is unreadable *and* unnamed the field simply keeps no label,
 * and the renderers show an em dash rather than the identifier: a missing label
 * is a gap, a visible nodeRef is machine data on a business screen. A refusal on
 * one target never fails the form.
 *
 * @param {Object} definition a normalised definition, values already applied
 * @param {Object} client an authenticated beCPG client
 * @param {Object} [options]
 * @param {string} [options.lang='fr'] picks `bcpg:lkvValue_fr` over `bcpg:lkvValue`
 * @returns {Promise<Object>} the definition, `displayValue` filled where possible
 */
export async function resolveNodeRefLabels(definition, client, options = {}) {
    if (!definition || !Array.isArray(definition.fields)) {
        return definition;
    }
    const lang = options.lang || 'fr';
    const valuesOf = (field) => (Array.isArray(field.value) ? field.value : [field.value]);

    // Pass 1 — the expanded targets. Free: the label travelled with the entity.
    const inline = new Map();
    definition.fields.forEach((field) => {
        valuesOf(field).forEach((value) => {
            const label = nodeLabel(value, lang);
            const id = value && typeof value === 'object' ? value.id || value.nodeRef : null;
            if (label && id) {
                inline.set(String(id).toLowerCase(), label);
            }
        });
    });

    // Pass 2 — the targets that stayed identifiers. One read each, and only when
    // a client was given (the caller may have none, e.g. a cached definition).
    const pending = new Set();
    definition.fields.forEach((field) => {
        if (field.displayValue) {
            return;
        }
        valuesOf(field)
            .filter(isNodeRefValue)
            .forEach((value) => pending.add(value.trim()));
    });

    const fetched = new Map();
    if (client && pending.size > 0) {
        await Promise.all([...pending].map(async (nodeRef) => {
            try {
                const data = await client.getJson('becpg/remote/entity', {
                    query: { nodeRef, lists: 'none' },
                });
                const label = nodeLabel((data && data.entity) || null, lang);
                if (label) {
                    fetched.set(nodeRef.toLowerCase(), label);
                }
            }
            catch {
                // Target this account may not read: no label, never an error —
                // the form renders and the field reads as absent.
            }
        }));
    }

    if (inline.size === 0 && fetched.size === 0) {
        return definition;
    }

    const labelOf = (value) => {
        if (typeof value === 'string') {
            const text = value.trim();
            return fetched.get(text.toLowerCase())
                || inline.get(text.toLowerCase())
                || inline.get(text.replace(/^workspace:\/\/SpacesStore\//i, '').toLowerCase())
                || null;
        }
        if (value && typeof value === 'object') {
            const id = value.id || value.nodeRef;
            return (id && inline.get(String(id).toLowerCase())) || nodeLabel(value, lang);
        }
        return null;
    };

    return {
        ...definition,
        fields: definition.fields.map((field) => {
            if (field.displayValue) {
                return field;
            }
            const resolved = valuesOf(field).map(labelOf).filter(Boolean);
            return resolved.length > 0 ? { ...field, displayValue: resolved.join(', ') } : field;
        }),
    };
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
        /*
         * A locale map does NOT go through the form processor.
         *
         * This code serialised `{ fr: "Sucre cristal" }` to JSON, claiming that
         * "this is what the multilingual control of beCPG posts". That is false,
         * and it corrupted data: the form processor stores the string as it is,
         * and beCPG ends up with `{"fr":"Sucre cristal"}` as text in the
         * property.
         *
         * Share does two distinct things (`form.lib.ftl#renderLocaleImage`): the
         * main form posts the current locale as a scalar, and the other languages
         * go through `becpg/form/multilingual/field/{field}`. `saveForm()` now
         * does the same — see `splitMlTextValues()`.
         *
         * If a map still reaches this point, the caller did not provide the field
         * definition: the default locale is then written rather than a JSON blob,
         * because a truncated text can be recovered whereas a corrupted property
         * goes unnoticed.
         */
        const first = Object.values(value).find((entry) => typeof entry === 'string' && entry !== '');
        console.warn('[forms] a locale map reached the form processor without a field definition:'
            + ' only the first language is written', { locales: Object.keys(value) });
        return first === undefined ? '' : String(first);
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

/* -------------------------------------------------------------------------- */
/* Multilingual values                                                         */
/* -------------------------------------------------------------------------- */

/** A field whose value is a `{ locale: text }` map. */
function isLocaleMap(value) {
    return Boolean(value)
        && typeof value === 'object'
        && !Array.isArray(value)
        && !('nodeRef' in value)
        && !('value' in value)
        && Object.keys(value).length > 0;
}

/**
 * Separates the multilingual values from the rest.
 *
 * The sorting is done on the field definition when it is provided, and on the
 * shape of the value otherwise: a caller that passes a locale map without a
 * definition — `saveField()` from the autosave — must be handled the same way,
 * otherwise the original bug comes back through that door.
 *
 * The definition is read on `dataType`, which is where both sources really
 * carry it (`d:mltext`, qualified by `qualifyDataType`). `type` only ever holds
 * `property` or `association`, so testing it here sorted every translation into
 * the scalars and threw all but one language away.
 *
 * @param {Object} values
 * @param {FormField[]} [fields]
 * @returns {{scalars: Object, mlTexts: Object}} `mlTexts` is keyed by `formsName`
 */
export function splitMlTextValues(values, fields = []) {
    const byName = new Map();
    for (const field of fields || []) {
        byName.set(field.name, field);
        byName.set(field.formsName, field);
    }

    const scalars = {};
    const mlTexts = {};

    for (const [key, value] of Object.entries(values || {})) {
        const field = byName.get(key);
        const declaredMl = field ? field.dataType === 'd:mltext' : false;
        if ((declaredMl || !field) && isLocaleMap(value)) {
            mlTexts[toFormsName(key, 'property')] = value;
            continue;
        }
        scalars[key] = value;
    }

    return { scalars, mlTexts };
}

/**
 * Writes the multilingual values of a node, one request per field.
 *
 * `POST becpg/form/multilingual/field/{field}?nodeRef={nodeRef}` with a body
 * `{ "fr": "Sucre cristal", "en": "Caster sugar" }` — that is the contract of
 * `MultilingualFieldWebScript`: it walks the keys, turns them into `Locale`,
 * builds an `MLText` and removes the locale whose value is empty. It is the
 * only correct write path for a `d:mltext`, and the one Share has always
 * taken through its translation dialog.
 *
 * `{field}` is the name in form convention, underscored and WITHOUT the `prop_`
 * prefix: `bcpg_legalName`. The webscript turns every underscore into a colon
 * (`fieldName.replace("_", ":")` is replace-all in Java), so a `prop_` prefix
 * would reach `QName.createQName` as `prop:bcpg:legalName` — a namespace no
 * model registers, i.e. a 500. Every Share caller strips it too
 * (`${field.id?replace("prop_","")}`).
 *
 * A failure is reported, never swallowed. The scalars are already saved at
 * this point, so the failure is partial — but a supplier who entered three
 * translations and is answered « enregistré » while they are lost has no way
 * to notice it. The error names the offending field.
 *
 * @param {string} nodeRef the node, which must exist
 * @param {Object} mlTexts `formsName -> { locale: text }`
 * @param {Object} [options]
 * @returns {Promise<void>}
 */
export async function saveMlTextValues(nodeRef, mlTexts, options = {}) {
    const entries = Object.entries(mlTexts || {});
    if (entries.length === 0) {
        return;
    }
    if (!isNodeRef(nodeRef)) {
        throw new BadRequestError('Saving multilingual values requires a nodeRef');
    }

    for (const [formsName, map] of entries) {
        const body = {};
        for (const [locale, text] of Object.entries(map || {})) {
            // An empty locale is not ignored: that is how a translation is
            // erased (the webscript calls `removeValue` on a blank value).
            body[locale] = text === null || text === undefined ? '' : String(text);
        }

        const field = String(formsName).replace(/^prop_/, '');
        const path = `becpg/form/multilingual/field/${encodeURIComponent(field)}`;
        const response = await becpgFetch(path, {
            method: 'POST',
            query: { nodeRef },
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            session: options.session,
            retries: 0,
        });

        if (!response.ok) {
            const message = await readErrorMessage(response);
            throw errorFromStatus(response.status, message, {
                label: 'becpg',
                path,
                details: { field: fromFormsName(formsName) },
            });
        }
    }
}

/**
 * Persists a form through the Alfresco form processor.
 *
 * Two targets, exactly as Share's `submissionUrl`:
 *
 * | `target` | Endpoint | Meaning |
 * |---|---|---|
 * | a nodeRef | `POST api/node/{store}/{id}/formprocessor` | update an existing node |
 * | a prefixed type | `POST api/type/{prefix:name}/formprocessor` + `alf_destination` **in the body** | create a node of that type |
 *
 * ## Creating: two details Alfresco does not forgive
 *
 * Both were measured against 26.1.0, and together they made **every** "add a row"
 * of every datalist fail — the grid could update and delete, never create.
 *
 * 1. **the type keeps its colon.** `api/type/bcpg_nutList/formprocessor` answers
 *    `404 FormNotFoundException: A form could not be found for item:
 *    [type]bcpg_nutList`, because `TypeFormProcessor.getTypedItem()` builds the
 *    QName from the item id verbatim. `api/type/bcpg:nutList/formprocessor`
 *    resolves. Underscoring the prefix is the convention of the *forms* webscript
 *    (`/becpg/form`), not of the form **processor**.
 * 2. **`alf_destination` travels in the body**, not in the query string.
 *    `FormServiceImpl` reads it out of the submitted `FormData`; as a URL
 *    parameter it is simply not seen and the call fails with
 *    `500 FormException: Failed to persist form for 'bcpg:nutList' as
 *    'alf_destination' data was not provided.`
 *
 * Share submits exactly this shape — its create form posts `alf_destination` as
 * a hidden field, which is why the datagrid works and the portal did not.
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

    // The `d:mltext` leave the payload: the form processor has no way to take a
    // locale map, and giving it one wrote literal JSON into the property. They
    // go out afterwards, on the dedicated endpoint.
    const { scalars, mlTexts } = splitMlTextValues(values, options.fields);
    const payload = toFormPayload(scalars, options.fields);

    // Only translations changed: the form processor has nothing to do, and an
    // empty payload is a round trip whose answer nobody reads.
    if (isNodeRef(target) && Object.keys(payload).length === 0) {
        await saveMlTextValues(target, mlTexts, { session });
        return { nodeRef: target, persistedObject: target, raw: {} };
    }

    let path;
    const query = {};
    if (isNodeRef(target)) {
        path = `api/node/${nodeRefToPath(target)}/formprocessor`;
    }
    else if (typeof target === 'string' && target.includes(':')) {
        if (!options.destination) {
            throw new BadRequestError('Creating a node requires a destination');
        }
        // The colon is kept (point 1 above) and the destination goes into the
        // payload (point 2), next to the fields — that is what `FormData` reads.
        path = `api/type/${encodeURIComponent(target)}/formprocessor`;
        payload.alf_destination = options.destination;
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

    // After the form processor, and on the node it has just returned: on a
    // creation it did not exist yet when the request left.
    await saveMlTextValues(persisted || (isNodeRef(target) ? target : null), mlTexts, { session });

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
    const payload = await getEntityJson({ nodeRef }, { session: options.session });

    const entity = payload?.entity || payload || {};
    return { entity, attributes: entity.attributes || {} };
}

export { createContext };
