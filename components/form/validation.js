/**
 * Reading a beCPG form definition — and validating values against it.
 *
 * This module is the **only** place that interprets a definition. Nothing here
 * knows a single business field: every rule it applies is read from what Share
 * and the repository returned (doc/becpg-api-contracts.md §1), namely
 *
 *   - `field.mandatory`, `field.dataType`, `field.repeating`;
 *   - `field.constraints[]` — `LIST`, `MINMAX`, `LENGTH`, `REGEX`, with the raw
 *     Alfresco `parameters` map (`columns.get.json.ftl` serialises it untouched);
 *   - `field.control.params` — the control parameters;
 *   - `field.help` — which beCPG sometimes uses as a **JSON blob** of extra
 *     control parameters instead of a sentence (the datagrid convention,
 *     `{"minWidth":150}`, `{"maximumFractionDigits":3}`). Both shapes are
 *     accepted and told apart defensively.
 *
 * It is also where the controls read the definition from, so that "what a LIST
 * offers" or "how many decimals a number has" is answered identically by the
 * renderer and by the validator. It imports nothing but `lib/i18n` and is
 * safe on both sides of the wire.
 *
 * ## The error contract
 *
 * ```js
 * validateForm(definition, values) // → { valid: false, errors: { 'bcpg:qty': 'validation.min' } }
 * ```
 *
 * `errors` maps **`field.name`** (the prefixed name, e.g. `bcpg:legalName`) onto
 * a *message key*, never onto a sentence: the caller decides the language, and a
 * key can be asserted on in a test. {@link formatValidationError} turns a key
 * back into a sentence, reading the bound to interpolate from the field's own
 * constraints — which is why it takes the field and not a bag of parameters.
 */

import { defineLabels, pickLabels } from '@/lib/i18n';

/* -------------------------------------------------------------------------- */
/* Constraints and control parameters                                          */
/* -------------------------------------------------------------------------- */

/** Constraint types the portal knows how to enforce. */
export const CONSTRAINT_TYPES = Object.freeze({
    LIST: 'LIST',
    MINMAX: 'MINMAX',
    LENGTH: 'LENGTH',
    REGEX: 'REGEX',
});

/**
 * The `parameters` map of one constraint, or `null`.
 *
 * @param {Object} field a normalised field
 * @param {string} type constraint type, case-insensitive
 * @returns {Object|null}
 *
 * @example
 * constraintOf(field, 'MINMAX'); // { minValue: 0, maxValue: 100 }
 */
export function constraintOf(field, type) {
    const wanted = String(type || '').toUpperCase();
    const constraints = Array.isArray(field?.constraints) ? field.constraints : [];
    const found = constraints.find((entry) => String(entry?.type || '').toUpperCase() === wanted);
    if (!found) {
        return null;
    }
    const parameters = found.parameters || found.params || {};
    return parameters && typeof parameters === 'object' ? parameters : {};
}

/**
 * Splits a `help` value into control parameters and human help text.
 *
 * beCPG puts either a sentence or a JSON object in that slot. A blob that does
 * not parse is treated as text — never as a broken parameter set.
 *
 * @param {string} help raw help value
 * @returns {{params: Object, text: string|null}}
 */
export function parseHelpParams(help) {
    const raw = typeof help === 'string' ? help.trim() : '';
    if (!raw) {
        return { params: {}, text: null };
    }
    if (raw.startsWith('{')) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return {
                    params: parsed,
                    text: typeof parsed.help === 'string' ? parsed.help : null,
                };
            }
        }
        catch {
            // Not JSON after all: it is help text that happens to start with a brace.
        }
    }
    return { params: {}, text: raw };
}

/**
 * Every control parameter that applies to a field.
 *
 * Precedence, lowest first: the `help` JSON blob, then `control.params` — the
 * explicit configuration always wins over the blob.
 *
 * @param {Object} field a normalised field
 * @returns {Object}
 */
export function controlParams(field) {
    const fromHelp = parseHelpParams(field?.help).params;
    const declared = field?.control?.params;
    return {
        ...fromHelp,
        ...(declared && typeof declared === 'object' ? declared : {}),
    };
}

/**
 * The help sentence of a field, if it has one.
 *
 * Returns `null` when `help` was a parameter blob — a JSON object must never be
 * shown to a supplier as help.
 *
 * @param {Object} field
 * @returns {string|null}
 */
export function helpText(field) {
    return parseHelpParams(field?.help).text;
}

/**
 * `"a,b"` / `"a|Label A,b|Label B"` → `['a', 'a|Label A']`.
 *
 * @param {string} value
 * @returns {string[]}
 */
function splitOptions(value) {
    return String(value)
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry !== '');
}

/**
 * Normalises one option entry.
 *
 * @param {string|Object} entry
 * @param {Object} labels optional `{ value: label }` map
 * @returns {{value: string, label: string}}
 */
function toOption(entry, labels) {
    if (entry && typeof entry === 'object') {
        const value = entry.value !== undefined ? String(entry.value) : '';
        return { value, label: String(entry.label ?? entry.displayLabel ?? labels?.[value] ?? value) };
    }
    const raw = String(entry);
    const separator = raw.indexOf('|');
    if (separator > -1) {
        return { value: raw.slice(0, separator), label: raw.slice(separator + 1) };
    }
    return { value: raw, label: String(labels?.[raw] ?? raw) };
}

/**
 * The closed list of values a field accepts, or `[]`.
 *
 * Two sources, in order: the `LIST` constraint (`allowedValues`) and the
 * `options` control parameter of `selectone.ftl` / `selectmany.ftl`. Labels come
 * from the definition when it carries them; the repository does not localise
 * `allowedValues`, so the raw value is the honest fallback — better a visible
 * code than a blank option.
 *
 * @param {Object} field
 * @returns {Array<{value: string, label: string}>}
 */
export function listOptions(field) {
    const params = controlParams(field);
    const constraint = constraintOf(field, CONSTRAINT_TYPES.LIST);
    const labels =
        constraint?.displayLabels ||
        constraint?.allowedValuesLabels ||
        constraint?.labels ||
        params.displayLabels ||
        null;

    let raw = null;
    if (constraint && Array.isArray(constraint.allowedValues)) {
        raw = constraint.allowedValues;
    }
    else if (constraint && typeof constraint.allowedValues === 'string') {
        raw = splitOptions(constraint.allowedValues);
    }
    else if (Array.isArray(params.options)) {
        raw = params.options;
    }
    else if (typeof params.options === 'string') {
        raw = splitOptions(params.options);
    }

    if (!raw) {
        return [];
    }
    return raw
        .map((entry) => toOption(entry, labels))
        .filter((option) => option.value !== '' || option.label !== '');
}

/** @param {Object} field @returns {boolean} true when the field is a closed choice */
export function hasListConstraint(field) {
    return listOptions(field).length > 0;
}

/**
 * `{ min, max }` of the `MINMAX` constraint — `null` on either side when unset.
 *
 * @param {Object} field
 * @returns {{min: number|null, max: number|null}}
 */
export function bounds(field) {
    const parameters = constraintOf(field, CONSTRAINT_TYPES.MINMAX) || {};
    const min = toNumber(parameters.minValue ?? parameters.min);
    const max = toNumber(parameters.maxValue ?? parameters.max);
    return { min, max };
}

/**
 * `{ min, max }` of the `LENGTH` constraint.
 *
 * @param {Object} field
 * @returns {{min: number|null, max: number|null}}
 */
export function lengthBounds(field) {
    const parameters = constraintOf(field, CONSTRAINT_TYPES.LENGTH) || {};
    const params = controlParams(field);
    const min = toNumber(parameters.minLength ?? parameters.min);
    const max = toNumber(parameters.maxLength ?? parameters.max ?? params.maxLength);
    return { min, max };
}

/**
 * The `REGEX` constraint, compiled. An unparsable expression is ignored rather
 * than thrown: a broken constraint in the repository must not make a form
 * unusable for a supplier.
 *
 * @param {Object} field
 * @returns {{pattern: RegExp, requiresMatch: boolean}|null}
 */
export function regexConstraint(field) {
    const parameters = constraintOf(field, CONSTRAINT_TYPES.REGEX);
    const expression = parameters?.expression;
    if (!expression) {
        return null;
    }
    try {
        return {
            pattern: new RegExp(String(expression)),
            requiresMatch: parameters.requiresMatch === undefined ? true : parameters.requiresMatch !== false,
        };
    }
    catch {
        return null;
    }
}

/**
 * How a number is written: decimals, and whether it must be a whole number.
 *
 * `maximumFractionDigits` is read from, in order, the explicit parameter, the
 * `decimals` parameter, and the FreeMarker `format` pattern `number-unit.ftl`
 * uses (`"0.####"` → 4). Integer data types force 0.
 *
 * @param {Object} field
 * @returns {{maximumFractionDigits: number, minimumFractionDigits: number, integer: boolean, step: string}}
 */
export function numberFormat(field) {
    const params = controlParams(field);
    const integer = field?.dataType === 'd:int' || field?.dataType === 'd:long';

    let digits = toNumber(params.maximumFractionDigits ?? params.decimals);
    if (digits === null && typeof params.format === 'string' && params.format.includes('.')) {
        const decimals = params.format.split('.')[1] || '';
        const matched = decimals.match(/[#0]*/);
        digits = matched ? matched[0].length : null;
    }
    if (integer) {
        digits = 0;
    }
    if (digits === null) {
        digits = 4;
    }
    digits = Math.max(0, Math.min(20, digits));

    const minimum = Math.max(0, Math.min(digits, toNumber(params.minimumFractionDigits) ?? 0));
    return {
        maximumFractionDigits: digits,
        minimumFractionDigits: minimum,
        integer,
        step: digits === 0 ? '1' : `0.${'0'.repeat(digits - 1)}1`,
    };
}

/**
 * @param {*} value
 * @returns {number|null} the number, or null when the input is not one
 */
export function toNumber(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.').trim());
    return Number.isFinite(parsed) ? parsed : null;
}

/* -------------------------------------------------------------------------- */
/* Values                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Reads a field's value out of a value map, whichever key convention it uses.
 *
 * The browser-side twin of `readFieldValue` in `lib/adapters/forms.js`: beCPG
 * indexes values by `formsName` in datalist rows (`prop_bcpg_x`) and by the
 * prefixed name in `becpg/remote/entity` (`bcpg:x`), and a cell may be a scalar
 * or `{ value, displayValue }`.
 *
 * @param {Object} values
 * @param {Object} field
 * @returns {{value: *, displayValue: string|null, found: boolean}}
 */
export function readValue(values, field) {
    if (!values || typeof values !== 'object' || !field) {
        return { value: null, displayValue: null, found: false };
    }
    const candidates = [field.name, field.formsName, field.id];
    for (const key of candidates) {
        if (key && Object.prototype.hasOwnProperty.call(values, key)) {
            const cell = values[key];
            if (cell && typeof cell === 'object' && !Array.isArray(cell)
                && ('value' in cell || 'displayValue' in cell)) {
                return {
                    value: cell.value === undefined ? null : cell.value,
                    displayValue: cell.displayValue === undefined || cell.displayValue === null
                        ? null
                        : String(cell.displayValue),
                    found: true,
                };
            }
            return { value: cell === undefined ? null : cell, displayValue: null, found: true };
        }
    }
    return { value: null, displayValue: null, found: false };
}

/**
 * True when a value counts as "not filled in" for a mandatory check.
 *
 * Handles the three shapes a portal value takes: scalar, array (repeating field
 * or multi association) and `{ locale: text }` map (`d:mltext`). `false` and `0`
 * are values, not emptiness.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isEmptyValue(value) {
    if (value === null || value === undefined) {
        return true;
    }
    if (typeof value === 'string') {
        return value.trim() === '';
    }
    if (Array.isArray(value)) {
        return value.every((entry) => isEmptyValue(entry));
    }
    if (typeof value === 'object') {
        if ('value' in value) {
            return isEmptyValue(value.value);
        }
        if ('nodeRef' in value) {
            return isEmptyValue(value.nodeRef);
        }
        return Object.values(value).every((entry) => isEmptyValue(entry));
    }
    return false;
}

/**
 * Flattens a value into the scalars a per-entry rule applies to.
 *
 * @param {*} value
 * @returns {Array<*>}
 */
function scalarsOf(value) {
    if (value === null || value === undefined) {
        return [];
    }
    if (Array.isArray(value)) {
        return value.flatMap((entry) => scalarsOf(entry));
    }
    if (typeof value === 'object') {
        if ('value' in value) {
            return scalarsOf(value.value);
        }
        if ('nodeRef' in value) {
            return scalarsOf(value.nodeRef);
        }
        return Object.values(value).flatMap((entry) => scalarsOf(entry));
    }
    return [value];
}

/**
 * Is this field a boolean the model already answers?
 *
 * `bcpg:ingListIsGMO` and `bcpg:ingListIsIonized` are declared mandatory with a
 * `false` default: the control is then a plain checkbox, which has no blank
 * state, so the field can never be left unanswered.
 *
 * @param {Object} field a normalised field or column
 * @returns {boolean}
 */
export function isAnsweredByModel(field) {
    return field?.dataType === 'd:boolean'
        && field.defaultValue !== null
        && field.defaultValue !== undefined;
}

/**
 * Does this field ask the user for an answer — the asterisk, the red outline?
 *
 * Model mandatory is not enough: a mandatory boolean with a model default is
 * always filled, and marking it read as a question nobody could leave blank.
 *
 * @param {Object} field a normalised field or column
 * @returns {boolean}
 */
export function needsAnswer(field) {
    return Boolean(field?.mandatory) && !isAnsweredByModel(field);
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

/** Message keys this module can return, with their fr/en wording. */
export const VALIDATION_MESSAGES = defineLabels('components/form/validation#VALIDATION_MESSAGES', {
    fr: {
        'validation.required': 'Ce champ est obligatoire.',
        'validation.number': 'Saisissez un nombre.',
        'validation.integer': 'Saisissez un nombre entier.',
        'validation.date': 'Saisissez une date valide.',
        'validation.boolean': 'Saisissez oui ou non.',
        'validation.list': 'Choisissez une valeur dans la liste.',
        'validation.regex': 'Le format attendu n’est pas respecté.',
        'validation.min': 'La valeur doit être supérieure ou égale à {min}.',
        'validation.max': 'La valeur doit être inférieure ou égale à {max}.',
        'validation.range': 'La valeur doit être comprise entre {min} et {max}.',
        'validation.minLength': 'Saisissez au moins {min} caractère(s).',
        'validation.maxLength': 'Saisissez au plus {max} caractère(s).',
    },
    en: {
        'validation.required': 'This field is required.',
        'validation.number': 'Enter a number.',
        'validation.integer': 'Enter a whole number.',
        'validation.date': 'Enter a valid date.',
        'validation.boolean': 'Enter yes or no.',
        'validation.list': 'Pick a value from the list.',
        'validation.regex': 'The expected format is not respected.',
        'validation.min': 'The value must be greater than or equal to {min}.',
        'validation.max': 'The value must be lower than or equal to {max}.',
        'validation.range': 'The value must be between {min} and {max}.',
        'validation.minLength': 'Enter at least {min} character(s).',
        'validation.maxLength': 'Enter at most {max} character(s).',
    },
});

/**
 * Turns a message key back into a sentence.
 *
 * The bounds are interpolated from the **field's own constraints**, so a caller
 * only ever has to carry the key around.
 *
 * @param {Object} field the field the error belongs to
 * @param {string} key a key of {@link VALIDATION_MESSAGES}
 * @param {string} [lang='fr']
 * @returns {string} the sentence, or the key itself when unknown
 *
 * @example
 * formatValidationError(field, 'validation.min', 'fr'); // "La valeur doit être supérieure ou égale à 0."
 */
export function formatValidationError(field, key, lang = 'fr') {
    if (!key) {
        return '';
    }
    const dictionary = pickLabels(VALIDATION_MESSAGES, lang);
    const template = dictionary[key] || VALIDATION_MESSAGES.fr[key];
    if (!template) {
        return key;
    }
    const numeric = bounds(field);
    const length = lengthBounds(field);
    const vars = {
        min: numeric.min !== null ? numeric.min : length.min,
        max: numeric.max !== null ? numeric.max : length.max,
    };
    return template.replace(/\{(\w+)\}/g, (match, name) =>
        vars[name] === undefined || vars[name] === null ? match : String(vars[name]),
    );
}

/**
 * Is this value coherent with the field's data type?
 *
 * Deliberately permissive on `d:noderef` and `d:any`: an autocomplete control
 * configured with `saveTitle` stores a label where the model declares a nodeRef,
 * and refusing it here would block a perfectly valid beCPG configuration.
 *
 * @param {Object} field
 * @param {*} scalar a single value
 * @returns {string|null} a message key, or null
 */
function checkDataType(field, scalar) {
    const dataType = field?.dataType;
    switch (dataType) {
        case 'd:int':
        case 'd:long': {
            const parsed = toNumber(scalar);
            if (parsed === null) {
                return 'validation.number';
            }
            return Number.isInteger(parsed) ? null : 'validation.integer';
        }
        case 'd:double':
        case 'd:float':
            return toNumber(scalar) === null ? 'validation.number' : null;
        case 'd:boolean':
            if (typeof scalar === 'boolean') {
                return null;
            }
            return ['true', 'false', '1', '0', 'yes', 'no'].includes(String(scalar).toLowerCase())
                ? null
                : 'validation.boolean';
        case 'd:date':
        case 'd:datetime':
            return Number.isNaN(new Date(scalar).getTime()) ? 'validation.date' : null;
        default:
            return null;
    }
}

/**
 * Validates one field.
 *
 * Order matters, and it is the order a human reads in: is it filled in, is it
 * the right kind of thing, is it one of the allowed values, is it inside the
 * bounds, is it the right length, does it match the pattern.
 *
 * A read-only or protected field is never validated — the supplier cannot fix
 * it, so reporting it would only be noise.
 *
 * @param {Object} field a normalised field
 * @param {*} value the current value
 * @returns {string|null} a message key, or null when the value is acceptable
 *
 * @example
 * validateField({ name: 'bcpg:qty', dataType: 'd:double', mandatory: true }, '');
 * // 'validation.required'
 */
export function validateField(field, value) {
    if (!field || field.readOnly || field.protectedField) {
        return null;
    }

    const empty = isEmptyValue(value);
    if (empty) {
        return field.mandatory ? 'validation.required' : null;
    }

    const scalars = scalarsOf(value).filter((entry) => !isEmptyValue(entry));
    const options = listOptions(field);
    const allowed = new Set(options.map((option) => option.value));
    const numeric = bounds(field);
    const length = lengthBounds(field);
    const regex = regexConstraint(field);

    for (const scalar of scalars) {
        const typeError = checkDataType(field, scalar);
        if (typeError) {
            return typeError;
        }

        if (allowed.size > 0 && !allowed.has(String(scalar))) {
            return 'validation.list';
        }

        if (numeric.min !== null || numeric.max !== null) {
            const parsed = toNumber(scalar);
            if (parsed !== null) {
                if (numeric.min !== null && numeric.max !== null && (parsed < numeric.min || parsed > numeric.max)) {
                    return 'validation.range';
                }
                if (numeric.min !== null && parsed < numeric.min) {
                    return 'validation.min';
                }
                if (numeric.max !== null && parsed > numeric.max) {
                    return 'validation.max';
                }
            }
        }

        const text = typeof scalar === 'string' ? scalar : String(scalar);
        if (length.min !== null && text.length < length.min) {
            return 'validation.minLength';
        }
        if (length.max !== null && text.length > length.max) {
            return 'validation.maxLength';
        }

        if (regex) {
            const matches = regex.pattern.test(text);
            if (regex.requiresMatch ? !matches : matches) {
                return 'validation.regex';
            }
        }
    }

    return null;
}

/**
 * Validates a whole form against its definition.
 *
 * @param {Object} definition `{ fields, sets, tabs }`, as normalised by `lib/adapters/forms.js`
 * @param {Object} values value map, keyed by `field.name` / `formsName` / `id`
 * @param {Object} [options]
 * @param {string[]} [options.only] restrict the check to these field names
 * @param {boolean} [options.skipReadOnly=true] ignore read-only and protected fields
 * @returns {{valid: boolean, errors: Object<string, string>}} errors keyed by `field.name`
 *
 * @example
 * const { valid, errors } = validateForm(definition, values);
 * if (!valid) { setErrors(errors); }
 */
export function validateForm(definition, values, options = {}) {
    const { only = null, skipReadOnly = true } = options;
    const fields = Array.isArray(definition?.fields) ? definition.fields : [];
    const restricted = only ? new Set(only) : null;
    const errors = {};

    for (const field of fields) {
        if (!field || !field.name) {
            continue;
        }
        if (restricted && !restricted.has(field.name) && !restricted.has(field.id)) {
            continue;
        }
        if (skipReadOnly && (field.readOnly || field.protectedField)) {
            continue;
        }
        const { value } = readValue(values, field);
        const error = validateField(field, value);
        if (error) {
            errors[field.name] = error;
        }
    }

    return { valid: Object.keys(errors).length === 0, errors };
}
