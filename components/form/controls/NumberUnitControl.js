'use client';

/**
 * `number-unit.ftl` — a number stored in a canonical unit, entered in any unit
 * of its family.
 *
 * ## Why this is not just "a number with a label"
 *
 * beCPG stores these properties in **one canonical unit** and lets the user type
 * in whichever unit of the family is convenient: a raw material dosed at
 * 0.0002 kg is typed as `200 mg`, and what is persisted is `0.0002`. The Share
 * control does the conversion in `beCPG.util.convertUnit` (`beCPGUtils.js`) and
 * posts the converted value in a hidden input.
 *
 * Rendering the raw canonical number with a static unit label would therefore be
 * *wrong twice*: unreadable (`0.0000002`), and a trap on save. So the conversion
 * table below **mirrors `beCPG.util.convertUnit` exactly**, and the families
 * mirror the `currUnits` lists of `number-unit.ftl`. Both are read from the
 * control parameter `unit`; nothing here is specific to a field.
 *
 * The conversion factor is derived from the mirrored function itself
 * (`factorOf(unit, base) = convertUnit(1, unit, base)`) rather than from a second
 * table, so the two can never drift apart.
 *
 * ## Deliberate deviations from the Share control
 *
 * - The automatic order-of-magnitude switch (`0.0002 kg` → shown as `mg`) is
 *   **not** reproduced: it makes the displayed unit change under the user while
 *   they type. The declared unit is the default, and the user picks another one.
 * - The `en_US` imperial default is not reproduced either: the portal's chrome
 *   language is a language, not a country, and `lb` stays one click away.
 * - The label is not rewritten. Share rewrites `Poids (kg)` into `Poids (mg)`;
 *   here the unit selector sits next to the input and says the same thing
 *   without touching a label that beCPG already translated.
 *
 * ## In a datalist cell
 *
 * The two halves carry `becpg-number-unit-value` / `becpg-number-unit-unit` so
 * that `app/globals.css` can give the number a floor inside `.becpg-grid`. The
 * selector declares a 5.5rem minimum, a table column is sized by its content,
 * and the number — `flex-1 min-w-0` — is what gave way: measured on
 * `bcpg:ingList`, a « Quantité (%) » column 90px wide left the input **18px**
 * for 24px of padding, so every quantity in the grid was invisible while the
 * total row printed « 100 % ».
 */

import { useState } from 'react';
import { Select } from '@/components/ui/Field';
import { controlParams } from '@/components/form/validation';
import { formatNumber } from '@/lib/format';
import { NumberControl } from '@/components/form/controls/NumberControl';
import { ReadOnlyControl } from '@/components/form/controls/ReadOnlyControl';

/**
 * Units offered for a given canonical unit — the `currUnits` lists of
 * `number-unit.ftl`, verbatim.
 */
export const UNIT_FAMILIES = Object.freeze({
    perc: ['perc', 'ppm'],
    ppm: ['perc', 'ppm'],
    kg: ['micro_g', 'mg', 'g', 'kg', 'lb', 'oz'],
    g: ['g', 'oz'],
    L: ['mL', 'cL', 'L', 'fl_oz', 'cp', 'gal'],
    m: ['mil', 'in', 'ft', 'micro_m', 'mm', 'cm', 'm'],
    mm: ['mil', 'in', 'ft', 'micro_m', 'mm', 'cm', 'm'],
    cm: ['mil', 'in', 'ft', 'micro_m', 'mm', 'cm', 'm'],
    d: ['d', 'mo', 'y'],
    mo: ['d', 'mo', 'y'],
    y: ['d', 'mo', 'y'],
    '-': ['-', 'mega', 'milli', 'micro'],
});

/** Symbols. Only the three duration units need a language. */
const UNIT_SYMBOLS = {
    micro_g: 'µg',
    mg: 'mg',
    g: 'g',
    kg: 'kg',
    lb: 'lb',
    oz: 'oz',
    mL: 'mL',
    cL: 'cL',
    L: 'L',
    fl_oz: 'fl oz',
    cp: 'cup',
    gal: 'gal',
    mil: 'mil',
    in: 'in',
    ft: 'ft',
    micro_m: 'µm',
    mm: 'mm',
    cm: 'cm',
    m: 'm',
    perc: '%',
    ppm: 'ppm',
    mega: 'M',
    milli: 'm',
    micro: 'µ',
    '-': '—',
};

const DURATION_SYMBOLS = {
    fr: { d: 'jours', mo: 'mois', y: 'ans' },
    en: { d: 'days', mo: 'months', y: 'years' },
};

const LABELS = {
    fr: { unit: 'Unité' },
    en: { unit: 'Unit' },
};

/**
 * The label of a unit.
 *
 * @param {string} unit
 * @param {string} [lang='fr']
 * @returns {string}
 */
export function unitLabel(unit, lang = 'fr') {
    const durations = DURATION_SYMBOLS[lang] || DURATION_SYMBOLS.fr;
    return durations[unit] || UNIT_SYMBOLS[unit] || unit;
}

/**
 * **Mirror of `beCPG.util.convertUnit`** (`becpg-share/.../beCPGUtils.js`).
 *
 * Converts a value expressed in `fromUnit` into the canonical unit of the
 * family, then applies the same milli-scale correction the original applies when
 * the canonical unit is one of `mm`, `cm`, `m`, `micro_m`, `g`, `mL`.
 *
 * Do not "fix" the apparent oddity of that last step: it is what makes a length
 * declared with `unit="m"` be stored in millimetres, which is what the
 * repository contains today.
 *
 * @param {number|string} value
 * @param {string} fromUnit
 * @param {string} toUnit canonical unit of the field
 * @returns {number|null}
 */
export function convertUnit(value, fromUnit, toUnit) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    let parsed = typeof value === 'number'
        ? value
        : Number(String(value).replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed === 0) {
        return Number.isFinite(parsed) ? parsed : null;
    }

    switch (fromUnit) {
        case 'mo': parsed *= 30; break;
        case 'y': parsed *= 365; break;
        case 'ppm': parsed /= 10000; break;
        case 'pp': parsed /= 10; break;
        case 'g':
        case 'milli':
        case 'mL':
        case 'mm': parsed /= 1000; break;
        case 'micro_m': parsed /= 1000000; break;
        case 'cL':
        case 'cm': parsed /= 100; break;
        case 'gal': parsed /= 0.264172; break;
        case 'fl_oz': parsed /= 33.814; break;
        case 'cp': parsed /= 4.16667; break;
        case 'mg':
        case 'micro': parsed /= 1000000; break;
        case 'micro_g': parsed /= 1000000000; break;
        case 'mega': parsed *= 1000000; break;
        case 'oz': parsed /= 35.27396195; break;
        case 'lb': parsed /= 2.204622622; break;
        case 'ft': parsed /= 3.28084; break;
        case 'in': parsed /= 39.37008; break;
        case 'mil': parsed /= 39370.079; break;
        default: break;
    }

    if (['mm', 'cm', 'm', 'micro_m', 'g', 'mL'].includes(toUnit)) {
        parsed *= 1000;
    }
    return Math.round(parsed * 1e12) / 1e12;
}

/**
 * How many canonical units one `unit` is worth. Derived from
 * {@link convertUnit}, never from a second table.
 *
 * @param {string} unit
 * @param {string} base
 * @returns {number}
 */
export function factorOf(unit, base) {
    const factor = convertUnit(1, unit, base);
    return factor === null || factor === 0 ? 1 : factor;
}

/**
 * Canonical value → value shown in `unit`.
 *
 * @param {number|null} value
 * @param {string} unit
 * @param {string} base
 * @returns {number|null}
 */
export function toDisplayUnit(value, unit, base) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) {
        return null;
    }
    // No `unit === base` shortcut: for the milli-scale families the canonical
    // unit is *not* the declared one (a field declared `m` is stored in
    // millimetres, `factorOf('m', 'm') === 1000`), and short-circuiting there
    // would show a length a thousand times too large.
    return Math.round((parsed / factorOf(unit, base)) * 1e12) / 1e12;
}

/**
 * @param {import('./index').ControlProps} props
 */
export function NumberUnitControl({
    field,
    value,
    displayValue,
    onChange,
    readOnly = false,
    error,
    id,
    lang = 'fr',
    ...rest
}) {
    const params = controlParams(field);
    const base = params.unit ? String(params.unit) : 'kg';
    const family = UNIT_FAMILIES[base] || null;
    const [unit, setUnit] = useState(base);

    if (readOnly) {
        return (
            <ReadOnlyControl
                field={field}
                value={value}
                displayValue={
                    displayValue !== null && displayValue !== undefined && displayValue !== ''
                        ? displayValue
                        : joinUnit(value, base, lang)
                }
                lang={lang}
                id={id}
            />
        );
    }

    const shown = toDisplayUnit(value, unit, base);
    const handleChange = (next) => {
        onChange(next === null ? null : convertUnit(next, unit, base));
    };

    // No family: the unit is a free label (`kJ`, `pH`…), so it is shown inside
    // the input and there is nothing to convert.
    if (!family || family.length < 2) {
        return (
            <NumberControl
                field={field}
                value={value}
                displayValue={displayValue}
                onChange={onChange}
                error={error}
                id={id}
                lang={lang}
                suffix={params.unit ? unitLabel(base, lang) : undefined}
                {...rest}
            />
        );
    }

    return (
        <div className="becpg-number-unit flex items-start gap-2">
            <div className="becpg-number-unit-value min-w-0 flex-1">
                <NumberControl
                    field={field}
                    value={shown}
                    onChange={handleChange}
                    error={error}
                    id={id}
                    lang={lang}
                    {...rest}
                />
            </div>
            <Select
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                aria-label={`${field?.label ? `${field.label} — ` : ''}${(LABELS[lang] || LABELS.fr).unit}`}
                className="becpg-number-unit-unit w-auto min-w-[5.5rem]"
                options={family.map((entry) => ({ value: entry, label: unitLabel(entry, lang) }))}
            />
        </div>
    );
}

/**
 * `0.25` + `kg` → `"0,25 kg"` for the read-only rendering.
 *
 * @param {*} value
 * @param {string} unit
 * @param {string} lang
 * @returns {string|null}
 */
function joinUnit(value, unit, lang) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    // The stored value is canonical, which is not always the declared unit —
    // see `toDisplayUnit`. Convert before writing the unit next to it.
    const shown = toDisplayUnit(value, unit, unit);
    if (shown === null) {
        return null;
    }
    const label = unitLabel(unit, lang);
    const formatted = formatNumber(shown, lang, { maximumFractionDigits: 6 });
    return label === '—' ? formatted : `${formatted} ${label}`;
}
