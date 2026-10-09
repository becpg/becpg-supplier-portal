'use client';

/**
 * Nutrient columns — the three renderers that carry almost all of the visible
 * difference between Share's grid and the portal's.
 *
 * Ported from `becpg-plm-share/.../custom-entity-datagrid/product-columnRenderers.js`
 * (renderers at lines 796, 856 and 2310).
 */

import { Icon } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { EmptyCell, Exponent, Tone } from '@/components/datalist/renderers/cells';
import {
    fillLabel,
    nutrientDetails,
    regulationFlagUrl,
    rendererLabels,
} from '@/components/datalist/renderers/signals';
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
 * Number format of a labelled value: one decimal between 1 and 10 under the EU
 * rule, five at most, grouping on — Share's options, per regulation.
 *
 * @param {string} country regulatory key
 * @param {number} value
 * @returns {Object} `Intl.NumberFormat` options
 */
function labelledOptions(country, value) {
    const minimumFractionDigits = country === 'EU' && value >= 1 && value < 10 ? 1 : 0;
    return { minimumFractionDigits, maximumFractionDigits: 5, useGrouping: true };
}

/**
 * Parses the envelope, or says why it cannot.
 *
 * @param {*} value
 * @returns {{envelope: Object}|{decline: true}|{empty: true}}
 */
function parseEnvelope(value) {
    const text = value === null || value === undefined ? '' : String(value).trim();
    if (!text) {
        return { empty: true };
    }
    let envelope;
    try {
        envelope = JSON.parse(text);
    }
    catch {
        // Not JSON at all. A truncated envelope is hidden; ordinary text is the
        // honest answer, so the default rendering prints it.
        return text.startsWith('{') || text.startsWith('[') ? { empty: true } : { decline: true };
    }
    if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)
        || !envelope.v || typeof envelope.v !== 'object') {
        return { empty: true };
    }
    return { envelope };
}

/**
 * `bcpg:nutListRoundedValue` / `bcpg:nutListRoundedValuePrepared` — the labelled
 * nutrient value.
 *
 * The property holds the JSON envelope above, never a number. What Share does,
 * and what is reproduced here:
 *
 *  1. pick the regulatory country from the locale — `EU` for a French portal;
 *  2. bail out entirely when `v[country]` is absent (an unformulated row, or a
 *     product formulated only for other markets);
 *  3. print `tu` before the value and `tl` after it, each separated by a `<`, so
 *     the cell reads as the tolerance interval `4 < 5 < 6`, the bounds in the
 *     danger tone and the value in the ok tone — the `<` carries the meaning,
 *     the colours only repeat it;
 *  4. force one decimal under the EU rule (see {@link labelledOptions});
 *  5. on `US`, print the per-serving number (`vps`) instead of `v`;
 *  6. end with the regulation's flag, which opens the per-regulation details.
 *     Share opens a draggable YUI panel; here it is the portal's tooltip, a real
 *     button that a tap, a hover or the keyboard opens.
 *
 * Nothing can make this renderer print JSON: a malformed envelope, a truncated
 * one, a `v` that is not an object all end on the em dash.
 *
 * @param {Object} cell
 * @returns {React.ReactNode|null}
 */
export function nutListRoundedValue({ value, row, lang }) {
    const parsed = parseEnvelope(value);
    if (parsed.decline) {
        return null;
    }
    if (parsed.empty) {
        return <EmptyCell />;
    }
    const { envelope } = parsed;
    const key = regulatoryCountryKey(lang);
    const main = countryValue(envelope, 'v', key);
    if (main === null) {
        return <EmptyCell />;
    }

    const options = labelledOptions(key, main);
    const lower = bound(envelope, 'tu', key);
    const upper = bound(envelope, 'tl', key);
    // On US the labelled number is the per-serving one; when it is absent Share
    // prints the bounds alone, and so does this.
    const shown = key === 'US' ? bound(envelope, 'vps', key) : main;

    const lowerText = lower === null ? '' : shareNumber(lower, lang, options);
    const upperText = upper === null ? '' : shareNumber(upper, lang, options);
    const shownText = shown === null ? '' : shareNumber(shown, lang, key === 'US' ? {} : options);

    if (!lowerText && !upperText && !shownText) {
        return <EmptyCell />;
    }

    const plain = [lowerText, shownText, upperText].filter(Boolean).join(' < ');
    return (
        <span className="inline-flex items-center gap-1">
            <span title={plain}>
                {lowerText ? (
                    <>
                        <Tone tone="danger">{lowerText}</Tone>
                        {'<'}
                    </>
                ) : null}
                {shownText ? <Tone tone="ok">{shownText}</Tone> : null}
                {upperText ? (
                    <>
                        {'<'}
                        <Tone tone="danger">{upperText}</Tone>
                    </>
                ) : null}
            </span>
            <NutrientDetailsTrigger envelope={envelope} regulation={key} row={row} lang={lang} />
        </span>
    );
}
nutListRoundedValue.emptyOnError = true;

/** Rendered size of a flag, the proportions of the vendored PNGs. */
const FLAG_WIDTH = 16;
const FLAG_HEIGHT = 11;

/**
 * A regulation's flag, decorative: the regulation key is always written next
 * to it or in the accessible name of its button.
 *
 * @param {Object} props
 * @param {string} props.regulation
 */
function RegulationFlag({ regulation }) {
    const src = regulationFlagUrl(regulation);
    if (!src) {
        return <Icon name="info_outline" size={16} className="text-[var(--becpg-blue-light)]" />;
    }
    return (
        // A 16x11 static asset; `next/image` would cost more than the file.
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt=""
            aria-hidden="true"
            width={FLAG_WIDTH}
            height={FLAG_HEIGHT}
            loading="lazy"
            decoding="async"
            className="shrink-0"
            onError={(event) => {
                // A regulation with no flag in the set: the key stays readable
                // in the button's name, a broken image does not.
                event.currentTarget.style.visibility = 'hidden';
            }}
        />
    );
}

/**
 * The flag button and the per-regulation details it opens.
 *
 * @param {Object} props
 * @param {Object} props.envelope
 * @param {string} props.regulation the reader's regulation key
 * @param {Object} props.row
 * @param {string} props.lang
 */
function NutrientDetailsTrigger({ envelope, regulation, row, lang }) {
    const labels = rendererLabels(lang);
    const name = fillLabel(labels.nutrientDetails, { country: regulation });
    const nutrient = row?.displayValues?.assoc_bcpg_nutListNut;
    return (
        <Tooltip
            content={<NutrientDetails envelope={envelope} title={nutrient} lang={lang} />}
            maxWidth={320}
        >
            <RegulationFlag regulation={regulation} />
            <span className="sr-only-text">{name}</span>
        </Tooltip>
    );
}

/**
 * Share's `.nut-details` panel: one block per regulation with its flag, the
 * labelled value, the tolerances, the minimum and maximum, the GDA share and
 * the per-serving value — each line only when the envelope carries it.
 *
 * @param {Object} props
 * @param {Object} props.envelope
 * @param {string} [props.title] the nutrient's name
 * @param {string} props.lang
 */
function NutrientDetails({ envelope, title, lang }) {
    const labels = rendererLabels(lang);
    return (
        <div className="flex flex-col gap-2">
            {title ? <p className="font-semibold">{title}</p> : null}
            {nutrientDetails(envelope).map((detail) => {
                const options = labelledOptions(detail.country, detail.value);
                const line = (template, number, format = options) => (number === null ? null : (
                    <p>{fillLabel(template, { value: shareNumber(number, lang, format) })}</p>
                ));
                return (
                    <section key={detail.country}>
                        <p className="flex items-center gap-1 font-medium">
                            {fillLabel(labels.roundedFor, { country: detail.country })}
                            <RegulationFlag regulation={detail.country} />
                        </p>
                        {line(labels.valueLine, detail.value)}
                        {line(labels.toleranceMin, detail.toleranceMin)}
                        {line(labels.toleranceMax, detail.toleranceMax)}
                        {line(labels.minimum, detail.min)}
                        {line(labels.maximum, detail.max)}
                        {line(labels.gda, detail.gda, {})}
                        {line(labels.perServing, detail.perServing, {})}
                    </section>
                );
            })}
        </div>
    );
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
