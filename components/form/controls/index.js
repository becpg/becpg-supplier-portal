'use client';

/**
 * The control registry — how a beCPG form definition becomes a React control.
 *
 * # 1. The props contract
 *
 * **Every** control in this registry receives the same seven props, and nothing
 * about a control's identity may leak into the caller. `FieldRenderer` builds
 * them; a control never reads the definition through any other channel.
 *
 * | Prop | Type | Meaning |
 * |---|---|---|
 * | `field` | `Object` | the normalised field: `name`, `label`, `dataType`, `mandatory`, `readOnly`, `repeating`, `constraints`, `control: { template, name, params }`, `help`. The **only** source of configuration. |
 * | `value` | `*` | the raw value: a scalar, an array (repeating / multi association), or a `{ locale: text }` map (`d:mltext`). `null` means empty. |
 * | `displayValue` | `string\|null` | the label beCPG already localised for that value (`{ value, displayValue }` cells, contracts §2). Preferred over `value` for display, never for editing. |
 * | `onChange` | `(next) => void` | called with the **new value**, never with an event. `null` clears the field. |
 * | `readOnly` | `boolean` | render the value, not a disabled input. Frozen lists, protected fields, view mode. |
 * | `error` | `string\|undefined` | the message already resolved for display; the control only uses it to look invalid. |
 * | `id` | `string` | the DOM id the `<label>` points at. Must land on the focusable element. |
 *
 * Four **context** props are passed on top of the contract, because a control
 * cannot invent them and only some need them:
 * `lang` (chrome language), `values` (the other form values — dependent
 * datasources), `formId` / `itemType` / `listId` / `entityNodeRef` (what
 * `POST /api/v1/autocomplete/{formId}/{fieldId}` needs to resolve a field
 * server-side).
 *
 * Any other prop is forwarded to the underlying element: `Field` clones the
 * control to inject `aria-describedby`, `aria-invalid`, `aria-required` and
 * `invalid`. A control must therefore **consume `invalid`** and never spread it
 * onto a DOM node.
 *
 * A control may declare three statics, read by `FieldRenderer`:
 *
 * | Static | Effect |
 * |---|---|
 * | `handlesRepeating` | the control renders multiple values itself; otherwise the renderer wraps it in an add/remove list |
 * | `fullWidth` | the field spans both columns of the form grid |
 * | `alwaysReadOnly` | the control is never editable, whatever the mode says |
 *
 * # 2. The fallback chain
 *
 * `resolveControlComponent(field)` tries, in order:
 *
 * 1. **the exact control template** — `field.control.template`, matched on its
 *    file name so a classpath prefix is irrelevant
 *    (`.../controls/textarea.ftl` → `textarea.ftl`);
 * 2. **the portal control name** `lib/adapters/forms.js` already resolved
 *    (`field.control.name`, e.g. `number-unit`). The two key spaces share this
 *    object and cannot collide: one always ends in `.ftl`;
 * 3. **the data type** — `DATATYPE_REGISTRY[field.dataType]`. This is the branch
 *    that carries the whole datagrid path: `module/entity-datagrid/config/columns`
 *    returns **no control at all** (contracts §1), only a `dataType`;
 * 4. **`ReadOnlyControl`** — always render the value rather than nothing.
 *
 * Two corrections are applied on top of the chain, both read from the
 * definition and neither a business rule:
 *
 * - a **`d:mltext`** field that resolved to plain text becomes an
 *   `MlTextControl`. beCPG configures multilingual properties with
 *   `textfield.ftl` / `textarea.ftl` because Alfresco's templates cannot express
 *   the language dimension; taking the template literally would edit one locale
 *   and drop the others;
 * - a field that resolved to free text but carries a **`LIST` constraint**
 *   becomes a `SelectControl`. A closed list is never an open input.
 *
 * # 3. Extending it without forking
 *
 * The registry is a plain mutable object, and {@link registerControl} is the
 * supported way in. A client-specific control is one line at application start,
 * with no change to `FormRenderer`, `FieldRenderer` or this file:
 *
 * ```js
 * import { registerControl } from '@/components/form/controls';
 * registerControl('decision-tree.ftl', DecisionTreeControl);
 * ```
 */

import { hasListConstraint } from '@/components/form/validation';
import { AssociationControl } from '@/components/form/controls/AssociationControl';
import { AutocompleteControl, DatasourcePicker } from '@/components/form/controls/AutocompleteControl';
import { BooleanControl } from '@/components/form/controls/BooleanControl';
import { DateControl } from '@/components/form/controls/DateControl';
import { MlTextControl } from '@/components/form/controls/MlTextControl';
import { NumberControl } from '@/components/form/controls/NumberControl';
import { NumberUnitControl } from '@/components/form/controls/NumberUnitControl';
import { LockedControl, ReadOnlyControl, formatValue } from '@/components/form/controls/ReadOnlyControl';
import { SelectControl } from '@/components/form/controls/SelectControl';
import { SizeControl } from '@/components/form/controls/SizeControl';
import { TextControl } from '@/components/form/controls/TextControl';
import { TextareaControl } from '@/components/form/controls/TextareaControl';

/**
 * `hidden.ftl` — the value is submitted, never displayed.
 *
 * It renders nothing at all, chrome included: `FieldRenderer` skips the label
 * and the tooltip for it. A hidden field that painted an empty row would be a
 * gap in the form nobody could explain.
 *
 * @returns {null}
 */
export function HiddenControl() {
    return null;
}

HiddenControl.hidden = true;
HiddenControl.handlesRepeating = true;

/**
 * @typedef {Object} ControlProps
 * @property {Object} field the normalised field definition
 * @property {*} value raw value — scalar, array, or `{ locale: text }` map
 * @property {string|null} displayValue label already localised by beCPG
 * @property {(next: *) => void} onChange called with the new value
 * @property {boolean} readOnly render the value instead of an input
 * @property {string} [error] message to look invalid for
 * @property {string} id DOM id the label points at
 * @property {string} [lang] chrome language (`fr` | `en`)
 * @property {Object} [values] the other form values — dependent datasources
 * @property {string} [formId] form id, for the autocomplete route
 * @property {string} [itemType] prefixed type the form edits
 * @property {string} [listId] datalist name, when the field is a grid cell
 * @property {string} [entityNodeRef] entity context
 */

/**
 * **The registry.** Keyed by control template file name *and* by the portal
 * control name resolved in `lib/adapters/forms.js`.
 *
 * Mutable on purpose — see {@link registerControl}.
 */
export const CONTROL_REGISTRY = {
    /* --- Text ---------------------------------------------------------- */
    'textfield.ftl': TextControl,
    textfield: TextControl,
    'textarea.ftl': TextareaControl,
    textarea: TextareaControl,
    /* No WYSIWYG in the portal: the content is edited as text. A rich editor is
       a large dependency for a field a supplier form almost never carries. */
    'richtext.ftl': TextareaControl,
    richtext: TextareaControl,
    'httplink.ftl': TextControl,
    link: TextControl,
    'selectcolorpicker.ftl': TextControl,
    color: TextControl,

    /* --- Multilingual --------------------------------------------------- */
    mltext: MlTextControl,
    /* Not a multilingual editor despite the name: `mtlangue.ftl` is a *language
       picker* (a multi-select of `locale.name.*`, value = `fr_FR,en_US`). Its
       options come from Share's `Languages` configuration, which the definition
       does not carry, so it is shown rather than guessed. */
    'mtlangue.ftl': ReadOnlyControl,

    /* --- Numbers -------------------------------------------------------- */
    'number.ftl': NumberControl,
    number: NumberControl,
    'number-float.ftl': NumberControl,
    'number-unit.ftl': NumberUnitControl,
    'number-unit': NumberUnitControl,

    /* --- Dates ---------------------------------------------------------- */
    'date.ftl': DateControl,
    date: DateControl,

    /* --- Booleans ------------------------------------------------------- */
    'checkbox.ftl': BooleanControl,
    'boolean.ftl': BooleanControl,
    // beCPG's tri-state boolean; see BooleanControl.
    boolean: BooleanControl,
    'allergen-voluntary.ftl': BooleanControl,
    checkbox: BooleanControl,

    /* --- Closed lists --------------------------------------------------- */
    'selectone.ftl': SelectControl,
    select: SelectControl,
    'selectmany.ftl': SelectControl,
    multiselect: SelectControl,
    'checkboxmany.ftl': SelectControl,
    'checkbox-group': SelectControl,
    'priority.ftl': SelectControl,
    'mimetype.ftl': SelectControl,
    'product-unit.ftl': SelectControl,

    /* --- Datasources ---------------------------------------------------- */
    'autocomplete.ftl': AutocompleteControl,
    autocomplete: AutocompleteControl,
    'autocomplete-association.ftl': AssociationControl,
    'autocomplete-association': AssociationControl,
    'association.ftl': AssociationControl,
    association: AssociationControl,

    /* --- Read-only by nature -------------------------------------------- */
    'size.ftl': SizeControl,
    size: SizeControl,
    'info.ftl': ReadOnlyControl,
    'readonly-text': ReadOnlyControl,
    'readonly.ftl': ReadOnlyControl,
    readonly: ReadOnlyControl,
    /* Computed by beCPG, never typed by a supplier. */
    'spel-editor.ftl': LockedControl,
    spel: LockedControl,
    'nutrient-class.ftl': LockedControl,
    'nutrient-score': LockedControl,
    'ecoscore-class.ftl': LockedControl,
    ecoscore: LockedControl,
    'config-editor.ftl': LockedControl,

    /* --- Not renderable here, degraded on purpose ------------------------ */
    /* A decision tree is a Share widget with its own state machine. */
    'decision-tree.ftl': ReadOnlyControl,
    /* A min/max pair and a from/to pair are two values in one field: editing
       them as one would corrupt the other half. Shown, not edited. */
    'numberrange.ftl': ReadOnlyControl,
    'number-range': ReadOnlyControl,
    'daterange.ftl': ReadOnlyControl,
    'date-range': ReadOnlyControl,
    /* `becpg/autocomplete/` does not serve people or groups, and the portal must
       not expose an Alfresco people search to a supplier. */
    'authority.ftl': ReadOnlyControl,
    person: ReadOnlyControl,
    /* A recurrence (`P1Y`) typed by hand is a broken recurrence. */
    'period.ftl': ReadOnlyControl,
    period: ReadOnlyControl,
    /* Files are the documents module's job (`components/documents/*`), not a
       form control's — a form post cannot carry a 40 MB certificate. */
    'content.ftl': ReadOnlyControl,
    file: ReadOnlyControl,

    /* --- Submitted, never shown ------------------------------------------ */
    'hidden.ftl': HiddenControl,
    hidden: HiddenControl,
    'invisible.ftl': HiddenControl,
};

/**
 * Data-type fallback — the branch the datagrid path always takes, since
 * `module/entity-datagrid/config/columns` returns no control at all.
 */
export const DATATYPE_REGISTRY = {
    'd:text': TextControl,
    'd:mltext': MlTextControl,
    'd:int': NumberControl,
    'd:long': NumberControl,
    'd:float': NumberControl,
    'd:double': NumberControl,
    'd:boolean': BooleanControl,
    'd:date': DateControl,
    'd:datetime': DateControl,
    'd:noderef': AssociationControl,
    'd:category': AssociationControl,
    'd:qname': TextControl,
    'd:locale': SelectControl,
    'd:period': ReadOnlyControl,
    'd:content': ReadOnlyControl,
    'd:any': TextControl,
    association: AssociationControl,
};

/** Last link of the chain. Never null — a value is always shown. */
export const FALLBACK_CONTROL = ReadOnlyControl;

/**
 * `org/alfresco/.../controls/textarea.ftl` → `textarea.ftl`.
 *
 * @param {string} template
 * @returns {string|null}
 */
export function templateKey(template) {
    if (!template) {
        return null;
    }
    return String(template).split(/[\\/]/).pop() || null;
}

/**
 * Registers or replaces a control, for a template name, a portal control name or
 * a data type.
 *
 * @param {string} key `'decision-tree.ftl'`, `'number-unit'`, `'d:double'`…
 * @param {Function} component a React component honouring the props contract
 * @returns {Function} the component, for chaining
 *
 * @example
 * registerControl('decision-tree.ftl', DecisionTreeControl);
 * registerControl('d:double', PrecisionNumberControl);
 */
export function registerControl(key, component) {
    if (!key || typeof component !== 'function') {
        throw new Error('registerControl expects a key and a component');
    }
    if (String(key).startsWith('d:')) {
        DATATYPE_REGISTRY[key] = component;
    }
    else {
        CONTROL_REGISTRY[key] = component;
    }
    return component;
}

/**
 * Looks a control up **by name**, the way the datalist editor needs it.
 *
 * `resolveControlComponent()` takes a whole field and runs the fallback chain;
 * a datagrid cell has already been given the portal control name by
 * `lib/adapters/forms.js` (`textfield`, `select`, `autocomplete-association`…)
 * and only wants the component behind it. Both read the same registry, so a
 * control registered with {@link registerControl} is picked up by either.
 *
 * Returns `undefined` for an unknown key on purpose: the caller decides whether
 * to fall back on `'textfield'` or to print the value as text.
 *
 * @param {string} name a template key, a portal control name or a data type
 * @returns {Function|undefined} the component, or undefined when unknown
 *
 * @example
 * getControl('textfield');                 // TextControl
 * getControl('autocomplete-association');  // AssociationControl
 * getControl('d:double');                  // NumberControl
 */
export function getControl(name) {
    if (!name) {
        return undefined;
    }
    const key = String(name);
    return CONTROL_REGISTRY[key] || CONTROL_REGISTRY[templateKey(key)] || DATATYPE_REGISTRY[key];
}

/**
 * Resolves the component that renders a field.
 *
 * See the fallback chain at the top of this file. Never returns null.
 *
 * @param {Object} field a normalised field
 * @returns {Function} a React component
 *
 * @example
 * resolveControlComponent({ control: { template: '.../textarea.ftl' } }); // TextareaControl
 * resolveControlComponent({ dataType: 'd:double' });                      // NumberControl
 * resolveControlComponent({ dataType: 'd:text', constraints: [{ type: 'LIST', parameters: { allowedValues: ['A'] } }] });
 * // SelectControl — a closed list is never an open input
 */
export function resolveControlComponent(field) {
    if (!field) {
        return FALLBACK_CONTROL;
    }

    const byTemplate = CONTROL_REGISTRY[templateKey(field.control?.template)];
    const byName = field.control?.name ? CONTROL_REGISTRY[field.control.name] : null;
    const byDataType = field.dataType ? DATATYPE_REGISTRY[field.dataType] : null;
    const byType = field.type === 'association' || field.endpointType ? AssociationControl : null;

    const resolved = byTemplate || byName || byDataType || byType || FALLBACK_CONTROL;
    const isPlainText = resolved === TextControl || resolved === TextareaControl;

    // A multilingual property stays multilingual, whatever the template said.
    // This is not a preference: `d:mltext` fields are configured in beCPG with
    // `textfield.ftl` / `textarea.ftl` (`bcpg:legalName` is the canonical
    // example, contracts §8) because Alfresco's templates cannot express the
    // language dimension — Share edits the current locale and drops the others.
    // Honouring the template literally would overwrite translations.
    // `MlTextControl` reads `rows` itself, so a configured textarea stays one.
    if (field.dataType === 'd:mltext' && isPlainText) {
        return MlTextControl;
    }

    // A closed list is a select, whatever the template said — unless the values
    // come from a datasource, which is a list of another kind entirely.
    if (isPlainText && hasListConstraint(field)) {
        return SelectControl;
    }
    return resolved;
}

export {
    AssociationControl,
    AutocompleteControl,
    BooleanControl,
    DateControl,
    DatasourcePicker,
    LockedControl,
    MlTextControl,
    NumberControl,
    NumberUnitControl,
    ReadOnlyControl,
    SelectControl,
    SizeControl,
    TextControl,
    TextareaControl,
    formatValue,
};
