/**
 * What a datalist cell says beside its own value: the requirement a
 * characteristic breaks, the fact that its value was formulated, the regulation
 * a labelled nutrient was rounded for, the sources a label claim is missing.
 *
 * Every function here reads a row the way Share's renderers read `itemData`
 * (`product-columnRenderers.js`), and returns plain data. The React side lives
 * in the renderer modules next door; keeping this module free of React and of
 * any server import is what lets the e2e suite test these rules without a
 * browser, and lets `dependencies.js` stay the single list of what they read.
 */

import { withBasePath } from '@/lib/basePath';
import { defineLabels, pickLabels } from '@/lib/i18n';
import { countryValue } from '@/components/datalist/renderers/shareFormat';

/* -------------------------------------------------------------------------- */
/* Labels                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The chrome of the renderers. Business vocabulary (a nutrient, a claim, a
 * state) comes translated from beCPG; only the words the portal adds around it
 * live here.
 */
export const RENDERER_LABELS = defineLabels('components/datalist/renderers/signals#RENDERER_LABELS', {
    fr: {
        formulated: 'Valeur formulée',
        requirementBroken: 'Exigence non respectée',
        claimDescription: 'Description de l’allégation',
        nutrientDetails: 'Détail du nutriment ({country})',
        roundedFor: 'Valeur arrondie selon la réglementation : {country}',
        valueLine: 'Valeur : {value}',
        toleranceMin: 'Tolérance minimale : {value}',
        toleranceMax: 'Tolérance maximale : {value}',
        minimum: 'Valeur minimale : {value}',
        maximum: 'Valeur maximale : {value}',
        gda: '% AJR : {value}',
        perServing: 'Valeur par portion : {value}',
        missingSources: '{count} source(s) sans cette allégation',
        missingSourcesList: 'Sources sans cette allégation :',
        omitted: 'Ingrédient omis de la déclaration',
        packagingLevel: {
            Primary: 'Primaire',
            Inner: 'Sous conditionnement',
            Secondary: 'Secondaire',
            Tertiary: 'Tertiaire',
        },
    },
    en: {
        formulated: 'Formulated value',
        requirementBroken: 'Requirement not met',
        claimDescription: 'Claim description',
        nutrientDetails: 'Nutrient details ({country})',
        roundedFor: 'Value rounded according to regulations: {country}',
        valueLine: 'Value: {value}',
        toleranceMin: 'Minimum tolerance: {value}',
        toleranceMax: 'Maximum tolerance: {value}',
        minimum: 'Minimum value: {value}',
        maximum: 'Maximum value: {value}',
        gda: '% RI: {value}',
        perServing: 'Value per serving: {value}',
        missingSources: '{count} source(s) without this claim',
        missingSourcesList: 'Sources without this claim:',
        omitted: 'Ingredient omitted from the declaration',
        packagingLevel: {
            Primary: 'Primary',
            Inner: 'Inner pack',
            Secondary: 'Secondary',
            Tertiary: 'Tertiary',
        },
    },
});

/**
 * The renderer labels in a language.
 *
 * @param {string} lang chrome language
 * @returns {Object} same shape as `RENDERER_LABELS.en`
 */
export function rendererLabels(lang) {
    return pickLabels(RENDERER_LABELS, lang);
}

/**
 * Fills the `{name}` placeholders of a label.
 *
 * @param {string} template
 * @param {Object} vars
 * @returns {string}
 */
export function fillLabel(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) => (
        vars[name] === undefined || vars[name] === null ? match : String(vars[name])
    ));
}

/* -------------------------------------------------------------------------- */
/* Nested rows                                                                 */
/* -------------------------------------------------------------------------- */

/** The nested requirement list Share reads beside a characteristic. */
export const REQ_CTRL_FIELD = 'dt_bcpg_reqCtrlList';

/** The nested label claim, requested only for its description. */
export const LABEL_CLAIM_FIELD = 'dt_bcpg_lclLabelClaim';

/** Share lists five sources, then an ellipsis. */
export const MAX_LISTED_SOURCES = 5;

const ELLIPSIS = '...';

/**
 * The items of a nested `dt_*` list, each as its `{ values, displays }` maps.
 *
 * A nested item is a whole datalist row (`{ nodeRef, itemData, … }`) that
 * `splitCells` has already split; the cells are under `itemData`.
 *
 * @param {Object} row
 * @param {string} field `dt_…`
 * @returns {{values: Object, displays: Object}[]}
 */
export function nestedItems(row, field) {
    const values = row?.values?.[field];
    if (!Array.isArray(values)) {
        return [];
    }
    const displays = row?.displayValues?.[field];
    return values.map((entry, index) => ({
        values: entry?.itemData || {},
        displays: (Array.isArray(displays) ? displays[index]?.itemData : null) || {},
    }));
}

/**
 * The names of a multi-valued association cell, whatever shape it arrived in:
 * the array of `{ value, displayValue }` cells `splitCells` keeps, or a single
 * label when it was flattened.
 *
 * @param {*} value
 * @param {*} [display] the joined label, used when the cells carry none
 * @returns {string[]}
 */
export function cellNames(value, display) {
    if (Array.isArray(value)) {
        const names = value
            .map((entry) => (entry && typeof entry === 'object' ? entry.displayValue ?? entry.value : entry))
            .filter((name) => name !== null && name !== undefined && String(name).trim() !== '')
            .map(String);
        if (names.length > 0) {
            return names;
        }
    }
    const text = typeof display === 'string' ? display.trim() : '';
    return text ? [text] : [];
}

/**
 * One requirement as Share's `extractErrorMessage` words it: the message, then
 * at most five sources.
 *
 * @param {{values: Object, displays: Object}} item a `bcpg:reqCtrlList` row
 * @returns {string} `''` when the requirement carries no message
 */
function describeRequirement(item) {
    const message = item.displays.prop_bcpg_rclReqMessage ?? item.values.prop_bcpg_rclReqMessage;
    if (message === null || message === undefined || String(message).trim() === '') {
        return '';
    }
    const sources = cellNames(item.values.prop_bcpg_rclSourcesV2, item.displays.prop_bcpg_rclSourcesV2);
    if (sources.length === 0) {
        return String(message);
    }
    const listed = sources.slice(0, MAX_LISTED_SOURCES);
    if (sources.length > MAX_LISTED_SOURCES) {
        listed.push(ELLIPSIS);
    }
    return `${message}: ${listed.join(', ')}`;
}

/**
 * Every requirement of one data type a row breaks, one per line.
 *
 * Share concatenates them without a separator; a line each reads the same in a
 * tooltip and does not glue two sentences together.
 *
 * @param {Object} row
 * @param {string} dataType `Nutrient`, `Physicochem`, `Labelclaim`
 * @returns {string} `''` when the row breaks none
 */
export function requirementMessage(row, dataType) {
    return nestedItems(row, REQ_CTRL_FIELD)
        .filter((item) => item.values.prop_bcpg_rclDataType === dataType)
        .map(describeRequirement)
        .filter(Boolean)
        .join('\n');
}

/* -------------------------------------------------------------------------- */
/* Formulation signal of a characteristic                                      */
/* -------------------------------------------------------------------------- */

/**
 * Target class of a characteristic column → what its renderer reads.
 *
 * `onlyWhenFormulated` is Share's label-claim rule: a claim that was not
 * formulated shows neither the warning nor the formulated mark.
 */
export const CHARACT_SIGNALS = Object.freeze({
    'bcpg:nut': { dataType: 'Nutrient', formulatedField: 'prop_bcpg_nutListIsFormulated' },
    'bcpg:physicoChem': { dataType: 'Physicochem', formulatedField: 'prop_bcpg_physicoChemIsFormulated' },
    'bcpg:labelClaim': {
        dataType: 'Labelclaim',
        formulatedField: 'prop_bcpg_lclIsFormulated',
        onlyWhenFormulated: true,
    },
});

/**
 * @param {*} value
 * @returns {boolean}
 */
export function isTrue(value) {
    return value === true || value === 'true';
}

/**
 * What the characteristic cell of a row has to say about its formulation.
 *
 * @param {Object} row
 * @param {string|null} targetClass the column's target class, `bcpg:nut`…
 * @returns {{kind: 'error', message: string}|{kind: 'formulated'}|null}
 */
export function formulationSignal(row, targetClass) {
    const rule = CHARACT_SIGNALS[targetClass];
    if (!rule) {
        return null;
    }
    const formulated = isTrue(row?.values?.[rule.formulatedField]);
    if (rule.onlyWhenFormulated && !formulated) {
        return null;
    }
    const message = requirementMessage(row, rule.dataType);
    if (message) {
        return { kind: 'error', message };
    }
    return formulated ? { kind: 'formulated' } : null;
}

/**
 * The description of the claim a label-claim row points at, `''` when there is
 * none.
 *
 * @param {Object} row
 * @returns {string}
 */
export function claimDescription(row) {
    const first = nestedItems(row, LABEL_CLAIM_FIELD)[0];
    const description = first ? first.displays.prop_cm_description ?? first.values.prop_cm_description : null;
    return description === null || description === undefined ? '' : String(description).trim();
}

/* -------------------------------------------------------------------------- */
/* bcpg:nutListRoundedValue — the per-regulation details                       */
/* -------------------------------------------------------------------------- */

/** Regulations beCPG ships no flag for: their trigger keeps an information icon. */
const REGULATIONS_WITHOUT_FLAG = Object.freeze(['CTA']);

/**
 * The flag of a regulation key, as Share builds it (`getRegulationFlagUrl`).
 *
 * @param {string} key `EU`, `US`, `CODEX`…
 * @returns {string|null} null for a regulation that has no flag
 */
export function regulationFlagUrl(key) {
    const code = String(key || '').split('_')[0];
    if (!code || REGULATIONS_WITHOUT_FLAG.includes(code.toUpperCase())) {
        return null;
    }
    return withBasePath(`/theme/images/flags/${code.toLowerCase()}.png`);
}

/**
 * A map Share reads with `|| ''`: a `0` there means "nothing to say".
 *
 * @param {Object} envelope
 * @param {string} mapName
 * @param {string} key
 * @returns {number|null}
 */
function presentValue(envelope, mapName, key) {
    const value = countryValue(envelope, mapName, key);
    return value === 0 ? null : value;
}

/**
 * One block per regulation of a parsed `bcpg:nutListRoundedValue`, in the
 * order beCPG wrote them — what Share's `.nut-details` panel lists.
 *
 * The tolerances keep a `0`, as Share's `getRegulationValue` does: in the
 * details a zero tolerance is a value worth reading. The minimum, maximum, GDA
 * and per-serving maps do not, because Share tests those for truthiness.
 *
 * @param {Object} envelope
 * @returns {{country: string, value: number, toleranceMin: number|null,
 *   toleranceMax: number|null, min: number|null, max: number|null,
 *   gda: number|null, perServing: number|null}[]}
 */
export function nutrientDetails(envelope) {
    const values = envelope?.v;
    if (!values || typeof values !== 'object') {
        return [];
    }
    return Object.keys(values)
        .filter((country) => country && countryValue(envelope, 'v', country) !== null)
        .map((country) => ({
            country,
            value: countryValue(envelope, 'v', country),
            toleranceMin: countryValue(envelope, 'tu', country),
            toleranceMax: countryValue(envelope, 'tl', country),
            min: presentValue(envelope, 'min', country),
            max: presentValue(envelope, 'max', country),
            gda: presentValue(envelope, 'gda', country),
            perServing: presentValue(envelope, 'vps', country),
        }));
}

/* -------------------------------------------------------------------------- */
/* bcpg:ingListFlags                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Flag code → status tone. Share gives each flag its own palette; the portal
 * maps them onto its status tokens, and the label is always printed, so the
 * tone only groups what the text already says.
 */
const INGREDIENT_FLAG_TONES = Object.freeze({
    PROCESSING_AID: 'neutral',
    SUPPORT: 'ok',
    IMPURITY: 'warn',
    NANO: 'info',
    GMO: 'danger',
    IONIZED: 'warn',
});

/**
 * The codes of a multi-valued text cell: an array, or a comma separated string.
 *
 * @param {*} value
 * @returns {string[]}
 */
function flagCodes(value) {
    const list = Array.isArray(value) ? value : String(value ?? '').split(',');
    return list.map((code) => String(code ?? '').trim()).filter(Boolean);
}

/**
 * The badges of `bcpg:ingListFlags`.
 *
 * beCPG translates the codes into one joined label; when that label splits into
 * as many parts as there are codes each badge gets its own, otherwise a single
 * badge carries the whole label rather than a guessed pairing.
 *
 * @param {*} value the raw codes
 * @param {string|null} displayValue beCPG's label
 * @returns {{code: string, label: string, tone: string}[]}
 */
export function ingredientFlagBadges(value, displayValue) {
    const codes = flagCodes(value);
    if (codes.length === 0) {
        return [];
    }
    const display = typeof displayValue === 'string' ? displayValue.trim() : '';
    const labels = display ? display.split(/\s*,\s*/).filter(Boolean) : [];
    const toneOf = (code) => INGREDIENT_FLAG_TONES[code.toUpperCase()] || 'neutral';
    if (labels.length === codes.length) {
        return codes.map((code, index) => ({ code, label: labels[index], tone: toneOf(code) }));
    }
    if (labels.length > 0 && codes.length > 1) {
        return [{ code: codes[0], label: display, tone: toneOf(codes[0]) }];
    }
    return codes.map((code) => ({ code, label: labels[0] || code, tone: toneOf(code) }));
}

/* -------------------------------------------------------------------------- */
/* Small lookups                                                               */
/* -------------------------------------------------------------------------- */

/** `bcpg:ingListDeclType` value of an ingredient left out of the declaration. */
export const OMITTED_DECLARATION = 'Omit';

/**
 * The portal's label of a packaging level, or null when beCPG already
 * translated it (its label differs from the code) or the code is unknown.
 *
 * @param {string|null} value `Primary`, `Inner`, `Secondary`, `Tertiary`
 * @param {string|null} displayValue
 * @param {string} lang
 * @returns {string|null}
 */
export function packagingLevelLabel(value, displayValue, lang) {
    if (typeof value !== 'string' || !value) {
        return null;
    }
    if (displayValue && displayValue !== value) {
        return null;
    }
    return rendererLabels(lang).packagingLevel[value] ?? null;
}
