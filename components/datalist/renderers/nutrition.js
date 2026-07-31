'use client';

/**
 * Nutrient columns — the three renderers that carry almost all of the visible
 * difference between Share's grid and the portal's.
 *
 * Ported from `becpg-plm-share/.../custom-entity-datagrid/product-columnRenderers.js`
 * (renderers at lines 796, 856 and 2310).
 */

import { EmptyCell, Exponent, Tone } from '@/components/datalist/renderers/cells';
import {
    countryValue,
    expParts,
    expText,
    regulatoryCountryKey,
    shareNumber,
    sigFigs,
} from '@/components/datalist/renderers/shareFormat';

/* -------------------------------------------------------------------------- */
/* bcpg:nutListRoundedValue — the reported bug                                 */
/* -------------------------------------------------------------------------- */

/**
 * The measured schema of `bcpg:nutListRoundedValue` — **twelve** country → number
 * maps, not the three the report mentioned:
 *
 * ```json
 * {"tu":{"EU":4},"min":{},"max":{},"gda":{},"v":{"EU":5,"US":5},"ul":{},
 *  "tl":{"EU":6},"vps":{},"vpc":{"US":1100},"v2ps":{},"v2":{},"gdapc":{"US":5500}}
 * ```
 *
 * **Every one of them may be `{}`**: an unformulated row still carries the whole
 * envelope, empty. That is the case the portal has to render as nothing rather
 * than as `{}`.
 *
 * Despite their names `tu` prints *before* the value and `tl` *after* it, so a
 * cell reads as the interval `4 < 5 < 6`. Measured, and reproduced as such.
 */

/**
 * A tolerance bound — `tu`, `tl` — or the US per-serving value, read the way
 * Share reads them.
 *
 * Share guards these three with `if (jsonData.tu && jsonData.tu[key])`, a
 * **truthiness** test, while it guards the labelled value itself with
 * `jsonData.v[key] != null`. The asymmetry is deliberate on beCPG's side and is
 * not an oversight to correct: a bound of `0` is how the formulation engine
 * writes *"no tolerance on this side"*, so Share prints none.
 *
 * Measured on « Pâte à choux », row `Fiber, total dietary`:
 * `{"tu":{"EU":0,…},"v":{"EU":1.4,…},"tl":{"EU":3.4,…}}`. Share renders
 * `1,4<3,4`. Reading `tu` as an ordinary number renders `0,0<1,4<3,4` — which
 * does not merely look different, it **announces a lower tolerance bound that
 * does not exist**. The value keeps the `!= null` reading, so the same product's
 * `Sodium, Na` row still prints its genuine `0`.
 *
 * @param {Object} envelope the parsed `bcpg:nutListRoundedValue`
 * @param {string} mapName `tu`, `tl` or `vps`
 * @param {string} key regulatory country key
 * @returns {number|null} the bound, or `null` when there is none
 */
function bound(envelope, mapName, key) {
    const value = countryValue(envelope, mapName, key);
    return value === 0 ? null : value;
}

/**
 * `bcpg:nutListRoundedValue` / `bcpg:nutListRoundedValuePrepared` — the labelled
 * nutrient value.
 *
 * **This is the bug the supplier reported.** The property does not hold a number,
 * it holds the JSON envelope above, and the portal printed it verbatim: a
 * supplier looking at « Valeur étiquetée » saw
 * `{"tu":{"JP":816},"min":{},…,"v":{"BR":1020,"EU":1020,…},…}` where Share shows
 * `1 020`.
 *
 * What Share does, and what is reproduced here:
 *
 *  1. pick the regulatory country from the locale — `EU` for a French portal;
 *  2. bail out entirely when `v[country]` is absent (an unformulated row, or a
 *     product formulated only for other markets);
 *  3. print `tu` before the value and `tl` after it, each separated by a `<`, so
 *     the cell reads as the tolerance interval `4 < 5 < 6`;
 *  4. force **one decimal** when the country is `EU` and the value is in
 *     `[1, 10)` — the EU labelling rule — with at most five, and grouping on;
 *  5. on `US`, print the *per-serving* number (`vps`) instead of `v`.
 *
 * Three deliberate differences from Share:
 *
 *  - Share colours the value itself green. Here only the **bounds** are tinted,
 *    with `--status-danger`, because the value is the cell's subject and tinting
 *    it says nothing; the bounds are tinted *and* introduced by a `<`, so the
 *    meaning survives without the colour (AGENTS.md).
 *  - Share appends a hidden `.nut-details` panel plus a link that a YUI dialog
 *    opens, listing every country. That is grid machinery the portal does not
 *    have — the same information is put in the cell's `title` instead.
 *  - **Nothing can make this renderer print JSON.** A malformed envelope, a
 *    truncated one, a `v` that is not an object: all of them end on the em dash.
 *
 * @param {Object} cell
 * @returns {React.ReactNode|null}
 */
export function nutListRoundedValue({ value, lang }) {
    if (value === null || value === undefined || value === '') {
        return <EmptyCell />;
    }
    const text = String(value).trim();
    if (!text) {
        return <EmptyCell />;
    }

    let envelope;
    try {
        envelope = JSON.parse(text);
    }
    catch {
        // Not JSON at all. If it looks like a truncated envelope, hide it; if it
        // is ordinary text, showing it is the honest answer, so decline and let
        // the default rendering print it.
        return text.startsWith('{') || text.startsWith('[') ? <EmptyCell /> : null;
    }
    if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)
        || !envelope.v || typeof envelope.v !== 'object') {
        return <EmptyCell />;
    }

    const key = regulatoryCountryKey(lang);
    const main = countryValue(envelope, 'v', key);
    if (main === null) {
        return <EmptyCell />;
    }

    // The EU labelling rule: one decimal between 1 and 10, five at most.
    const minimumFractionDigits = key === 'EU' && main >= 1 && main < 10 ? 1 : 0;
    const options = { minimumFractionDigits, maximumFractionDigits: 5, useGrouping: true };

    const lower = bound(envelope, 'tu', key);
    const upper = bound(envelope, 'tl', key);
    // On US the labelled number is the per-serving one; when it is absent Share
    // prints the bounds alone, and so does this.
    const perServing = key === 'US' ? bound(envelope, 'vps', key) : null;
    const shown = key === 'US' ? perServing : main;

    const lowerText = lower === null ? '' : shareNumber(lower, lang, options);
    const upperText = upper === null ? '' : shareNumber(upper, lang, options);
    const shownText = shown === null
        ? ''
        : shareNumber(shown, lang, key === 'US' ? {} : options);

    if (!lowerText && !upperText && !shownText) {
        return <EmptyCell />;
    }

    const plain = [lowerText, shownText, upperText].filter(Boolean).join(' < ');
    const title = [plain, roundedDetails(envelope, lang)].filter(Boolean).join('\n');

    return (
        <span title={title}>
            {lowerText ? (
                <>
                    <Tone tone="danger">{lowerText}</Tone>
                    {'<'}
                </>
            ) : null}
            {shownText}
            {upperText ? (
                <>
                    {'<'}
                    <Tone tone="danger">{upperText}</Tone>
                </>
            ) : null}
        </span>
    );
}
nutListRoundedValue.emptyOnError = true;

/**
 * The per-country breakdown Share shows in its `.nut-details` dialog, flattened
 * into the lines of a `title` attribute.
 *
 * Each line is written as the same interval the cell shows — `EU — 4 < 5 < 6` —
 * so the tooltip needs no words at all. That is not laziness: the portal has no
 * i18n layer (AGENTS.md rule 4), business labels arrive translated from beCPG,
 * and a renderer is the wrong place to invent French captions that would then be
 * French for an English supplier too. Country codes and the `<` need no
 * translation.
 *
 * @param {Object} envelope the parsed `bcpg:nutListRoundedValue`
 * @param {string} lang
 * @returns {string} one line per country, or `''` when there is only one
 */
function roundedDetails(envelope, lang) {
    // Share's own loop skips a country whose value is falsy — `if (k && value)`
    // — so a market the product is not formulated for does not get a line.
    const countries = Object.keys(envelope.v || {})
        .filter((country) => {
            const value = countryValue(envelope, 'v', country);
            return value !== null && value !== 0;
        });
    if (countries.length < 2) {
        return '';
    }
    return countries.map((country) => {
        const value = countryValue(envelope, 'v', country);
        // The same EU one-decimal rule the cell applies, so the tooltip cannot
        // contradict the number printed above it.
        const options = {
            minimumFractionDigits: country === 'EU' && value >= 1 && value < 10 ? 1 : 0,
            maximumFractionDigits: 5,
            useGrouping: true,
        };
        const parts = [bound(envelope, 'tu', country), value, bound(envelope, 'tl', country)]
            .filter((number) => number !== null)
            .map((number) => shareNumber(number, lang, options));
        return `${country} — ${parts.join(' < ')}`;
    }).join('\n');
}

/* -------------------------------------------------------------------------- */
/* bcpg:nutListValue and friends                                               */
/* -------------------------------------------------------------------------- */

/**
 * Shown column → the hidden formulated property that carries its computed value.
 *
 * These are the *companion fields* of `dependencies.js`; without them every one
 * of these columns is blank on a formulated product, because the manual property
 * is null and the number lives only in the formulated sibling.
 */
const FORMULATED_SIBLING = Object.freeze({
    prop_bcpg_nutListValue: 'prop_bcpg_nutListFormulatedValue',
    prop_bcpg_nutListMini: 'prop_bcpg_nutListFormulatedMini',
    prop_bcpg_nutListMaxi: 'prop_bcpg_nutListFormulatedMaxi',
    prop_bcpg_nutListValuePrepared: 'prop_bcpg_nutListFormulatedValuePrepared',
    prop_bcpg_nutListValuePerServing: 'prop_bcpg_nutListFormulatedValuePerServing',
    prop_bcpg_nutListReductionValue: 'prop_bcpg_nutListReductionFormulatedValue',
    // `ReferenceValue` is the only one with no formulated counterpart in Share.
    prop_bcpg_nutListReferenceValue: null,
});

/**
 * The unit to print beside a nutrient value.
 *
 * Reproduces Share's two adjustments: the *prepared* column takes the prepared
 * unit when there is one, and a column whose own label already carries the basis
 * (`… /100g`, or any label containing a `/` after its first character) drops the
 * `/100g` / `/100mL` suffix so the cell does not read `1 020 kJ/100g` under a
 * header that already says `/100g`.
 *
 * @param {Object} row
 * @param {Object} column
 * @returns {string} the unit, or `''`
 */
function unitFor(row, column) {
    const values = row?.values || {};
    let unit = values.prop_bcpg_nutListUnit;
    if (column.formsName === 'prop_bcpg_nutListValuePrepared') {
        const prepared = values.prop_bcpg_nutListUnitPrepared;
        if (prepared !== null && prepared !== undefined && prepared !== '') {
            unit = prepared;
        }
    }
    if (column.formsName === 'prop_bcpg_nutListReductionValue') {
        return '%';
    }
    if (unit === null || unit === undefined || unit === '') {
        return '';
    }
    unit = String(unit);
    const label = String(column.label || '');
    const perServing = column.formsName === 'prop_bcpg_nutListValuePerServing';
    if (perServing || label.indexOf('100g') > 0 || label.indexOf('/') > 0) {
        unit = unit.replace('/100g', '').replace('/100mL', '');
    }
    return unit;
}

/**
 * `bcpg:nutListValue`, `…Mini`, `…Maxi`, `…ValuePrepared`, `…ValuePerServing`,
 * `…ReductionValue`, `…ReferenceValue`.
 *
 * **The widest hole in the portal, wider than the reported one.** On a formulated
 * product the manual property is empty and the number is in the hidden
 * `bcpg:nutListFormulatedValue`, which the portal never requested — so the
 * *Valeur* column of a formulated nutrient list was simply blank, on every row,
 * while Share printed `1 020 kJ/100g`.
 *
 * Share's shape, reproduced: the manual value with its unit, then the formulated
 * one in parentheses after two non-breaking spaces; and when there is no manual
 * value, the formulated one alone, with the unit.
 *
 * One improvement over Share: `nutListReductionValue`'s sibling is a `d:mltext`,
 * so it is not always a number. Share pushes it through `toLocaleString()` and
 * throws (swallowed by its own try/catch, leaving the cell blank); here a
 * non-numeric sibling is printed as text.
 *
 * @param {Object} cell
 * @returns {React.ReactNode|null}
 */
export function nutListValue({ value, row, column, lang }) {
    const unit = unitFor(row, column);
    const suffix = unit ? ` ${unit}` : '';

    const manual = value === null || value === undefined || value === ''
        ? ''
        : shareNumber(value, lang);

    const siblingKey = Object.prototype.hasOwnProperty.call(FORMULATED_SIBLING, column.formsName)
        ? FORMULATED_SIBLING[column.formsName]
        : 'prop_bcpg_nutListFormulatedValue';
    const formulated = siblingKey ? row?.values?.[siblingKey] : null;
    const hasFormulated = formulated !== null && formulated !== undefined && formulated !== '';

    if (!manual && !hasFormulated) {
        return null;
    }

    if (!hasFormulated) {
        return <span title={`${manual}${suffix}`}>{`${manual}${suffix}`}</span>;
    }

    const numeric = typeof formulated === 'number' ? formulated : Number(formulated);
    const { text, exponent } = Number.isFinite(numeric)
        ? expParts(numeric, lang)
        : { text: String(formulated), exponent: null };
    const plainFormulated = Number.isFinite(numeric) ? expText(numeric, lang) : String(formulated);

    if (!manual) {
        return (
            <span title={`${plainFormulated}${suffix}`}>
                {text}
                {exponent ? <Exponent exponent={exponent} /> : null}
                {suffix}
            </span>
        );
    }

    // The two separators before the parenthesis are non-breaking spaces, as
    // Share writes them (`&nbsp;&nbsp;`), so the formulated value never wraps
    // away from the manual value it qualifies.
    return (
        <span title={`${manual}${suffix}  (${plainFormulated})`}>
            {`${manual}${suffix}  (`}
            {text}
            {exponent ? <Exponent exponent={exponent} /> : null}
            {')'}
        </span>
    );
}

/* -------------------------------------------------------------------------- */
/* bcpg:nutListGDAPerc                                                         */
/* -------------------------------------------------------------------------- */

/**
 * `bcpg:nutListGDAPerc` — the share of the reference intake.
 *
 * Only Share's **fallback** branch is ported, and that is a measurement rather
 * than a shortcut: the coloured progress bar needs `dt_bcpg_nutListNut`, a nested
 * *entity* column carrying the nutrient's `color`, `nutGDA`, `nutUL` and
 * `nutUnit`. No supplier wizard declares that column — the nutrient arrives as a
 * flat association — so the bar's branch is unreachable and rebuilding it here
 * would mean inventing data. Share's own else-branch is one significant figure
 * plus ` %`, and that is what the supplier gets.
 *
 * `sigFigs(value, 1)` is not a typo: Share rounds this one to a single
 * significant figure (`23.4` → `20 %`).
 *
 * @param {Object} cell
 * @returns {React.ReactNode|null}
 */
export function nutListGDAPerc({ value, lang }) {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (value === null || value === undefined || value === '' || !Number.isFinite(numeric)
        || numeric <= 0) {
        return <EmptyCell />;
    }
    const text = `${shareNumber(sigFigs(numeric, 1), lang)} %`;
    return <span title={text}>{text}</span>;
}
