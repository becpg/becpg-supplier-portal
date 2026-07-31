/**
 * The arithmetic Share does before it prints a datagrid number.
 *
 * Ported from `becpg-share/.../web/js/beCPGUtils.js` (`sigFigs`, `exp`,
 * `getRegulatoryCountryKey`). These are **not** generic formatting helpers —
 * `@/lib/format` owns that and is what every function here delegates to for the
 * actual `Intl` call. What lives here is the part that is specific to beCPG's
 * grid: rounding to significant figures, the engineering-notation fallback, and
 * the locale → regulatory-country mapping that decides *which* number of a
 * nutrient's per-country map the user is looking at.
 *
 * Everything is pure and React-free on purpose: the renderers import it, and so
 * does the server-side companion-field table next door.
 */

import { formatNumber } from '@/lib/format';

/**
 * Rounds to `sig` significant figures, sign-safe.
 *
 * Straight port of `beCPG.util.sigFigs`, including its two quirks, because the
 * portal has to print the same digits as Share for the same row:
 *
 *   - a magnitude at or above `10^sig` is rounded to the unit, not to `sig`
 *     digits (`sigFigs(71428.57, 5)` → `71429`, not `71430`);
 *   - `0`, `null` and `NaN` come back unchanged rather than as `0`.
 *
 * @param {number} value
 * @param {number} sig number of significant figures
 * @returns {number} the rounded value
 *
 * @example
 * sigFigs(71.42857142857143, 5);  // 71.429
 * sigFigs(23.4, 1);               // 20
 */
export function sigFigs(value, sig) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) {
        return value;
    }
    let magnitude = value;
    let sign = 1;
    if (magnitude < 0) {
        magnitude = Math.abs(magnitude);
        sign = -1;
    }
    if (magnitude >= Math.pow(10, sig)) {
        return sign * Math.round(magnitude);
    }
    const factor = Math.pow(10, sig - Math.floor(Math.log(magnitude) / Math.LN10) - 1);
    return sign * (Math.round(magnitude * factor) / factor);
}

/**
 * `Number.prototype.toLocaleString(locale, options)`, as the Share renderers
 * call it, expressed through the portal's single formatter.
 *
 * Differs from {@link formatNumber} in exactly one way, and it matters: an
 * absent or unreadable value yields the **empty string**, not the em dash. A
 * renderer composes several numbers into one cell (`4 < 5`), so it needs to be
 * able to leave a piece out; deciding that the whole cell is empty is the
 * renderer's job, not the formatter's.
 *
 * @param {number|string|null} value
 * @param {string} lang chrome language
 * @param {Object} [options] passed to `Intl.NumberFormat`
 * @returns {string} the formatted number, or `''`
 */
export function shareNumber(value, lang, options = {}) {
    return formatNumber(value, lang, { fallback: '', ...options });
}

/** Unicode superscripts, so an exponent survives a `title=` attribute. */
const SUPERSCRIPTS = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

/**
 * Splits `beCPG.util.exp()` into a mantissa and an exponent.
 *
 * Share's `exp()` returns a string with a literal `<sup>` in it. The portal
 * never injects markup from a value, so the two halves are returned separately
 * and the caller builds the `<sup>` element itself.
 *
 * Thresholds are Share's: below 10⁻⁶ the value is shown in millionths, below
 * 0.01 in thousandths, at or above 10⁶ in millions, and everything between is
 * printed at 3 significant figures.
 *
 * @param {number|string|null} value
 * @param {string} lang chrome language
 * @returns {{text: string, exponent: string|null}} `text` is `''` when there is
 *   no readable number
 *
 * @example
 * expParts(0.0004, 'fr');   // { text: '0,4', exponent: '-3' }
 * expParts(1020, 'fr');     // { text: '1 020', exponent: null }
 */
export function expParts(value, lang) {
    const number = typeof value === 'number' ? value : Number(value);
    if (value === null || value === undefined || value === '' || !Number.isFinite(number)) {
        return { text: '', exponent: null };
    }
    if (number === 0) {
        return { text: '0', exponent: null };
    }
    const magnitude = Math.abs(number);
    if (magnitude < 0.000001) {
        return { text: shareNumber(sigFigs(number * 1000000, 3), lang), exponent: '-6' };
    }
    if (magnitude < 0.01) {
        return { text: shareNumber(sigFigs(number * 1000, 3), lang), exponent: '-3' };
    }
    if (magnitude >= 1000000) {
        return { text: shareNumber(sigFigs(number / 1000000, 3), lang), exponent: '6' };
    }
    return { text: shareNumber(sigFigs(number, 3), lang), exponent: null };
}

/**
 * The same value as {@link expParts}, flattened to plain text with Unicode
 * superscripts — for a `title` attribute, where markup is not an option.
 *
 * @param {number|string|null} value
 * @param {string} lang
 * @returns {string}
 */
export function expText(value, lang) {
    const { text, exponent } = expParts(value, lang);
    if (!text || !exponent) {
        return text;
    }
    const digits = String(exponent).split('').map((char) => SUPERSCRIPTS[char] || char).join('');
    return `${text}×10${digits}`;
}

/**
 * Locale → beCPG regulatory country.
 *
 * A nutrient's labelled value is not one number: `bcpg:nutListRoundedValue`
 * holds a **country → number map** per aspect (value, tolerances, GDA…), because
 * the rounding rules are regulatory and differ per market. This function is what
 * picks the column the user is entitled to see, and it is a straight port of
 * `beCPG.util.getRegulatoryCountryKey` — every branch, including the twenty-eight
 * pass-through countries and the `EU` default.
 *
 * **What it resolves to today**: the portal's chrome language is `fr` or `en`, so
 * `loc.split('_')` has one part and the country falls back to `FR` / `EN`,
 * neither of which is in any branch — every portal user therefore reads the `EU`
 * column. The full table is ported anyway, and not trimmed to that one case, so
 * the day the session carries a real Alfresco locale (`en_US`, `pt_BR`) the right
 * column is selected without a code change and without a second reading of the
 * Share source.
 *
 * @param {string} locale an Alfresco locale (`fr_FR`, `en_US`) or a bare language
 * @returns {string} a regulatory key: `EU`, `US`, `CN`, `CODEX`, `GSO`…
 */
export function regulatoryCountryKey(locale) {
    const text = String(locale || '').replace('-', '_');
    const parts = text.split('_');
    const language = parts[0].toLowerCase();
    const country = parts.length > 1 ? parts[1].toUpperCase() : language.toUpperCase();

    const PASS_THROUGH = ['US', 'CA', 'AU', 'ID', 'HK', 'MY', 'IL', 'IN', 'KR', 'MA', 'MX', 'DZ',
        'TR', 'SG', 'TH', 'PK', 'ZA', 'TN', 'EG', 'CL', 'UY', 'BR', 'TT', 'DO', 'PE'];
    if (PASS_THROUGH.includes(country)) {
        return country;
    }
    if (language === 'zh') {
        return 'CN';
    }
    if (language === 'ru') {
        return 'RU';
    }
    if (country === 'NZ') {
        return 'AU';
    }
    if (country === 'PR') {
        return 'US';
    }
    if (country === 'PY') {
        return 'BR';
    }
    if (['GT', 'PA', 'SV'].includes(country)) {
        return 'CTA';
    }
    if (['AE', 'BH', 'SA', 'QA', 'OM', 'KW'].includes(country)) {
        return 'GSO';
    }
    if (['KE', 'NG', 'GH', 'CI', 'UG', 'MZ', 'MW', 'TZ', 'ZM', 'ZW', 'KH', 'MM', 'JO', 'IQ', 'PS']
        .includes(country)) {
        return 'CODEX';
    }
    if (country === 'CO') {
        return 'CO';
    }
    return 'EU';
}

/**
 * Reads a `country → number` map out of a parsed `bcpg:nutListRoundedValue`
 * envelope, tolerating every shape beCPG actually emits.
 *
 * The envelope carries twelve maps (`v`, `tu`, `tl`, `min`, `max`, `gda`, `ul`,
 * `vps`, `vpc`, `v2`, `v2ps`, `gdapc`) and **any of them may be `{}`** — an
 * unformulated row still carries the full envelope with every map empty, which
 * is why "the key is missing" has to be an ordinary answer rather than an error.
 *
 * A numeric **string** is accepted as well as a number. beCPG serialises these
 * maps from `Map<String, Double>`, so a quoted number is not a shape it emits —
 * but Share reads them with `jsonData.v[key] != null` and prints whatever comes
 * out, so a quoted `"7"` still shows the supplier a `7` there. Requiring a
 * `typeof number` made the portal render an em dash for it, i.e. **silently drop
 * a labelled value**, which is the one failure this whole module exists to
 * prevent. Coercing keeps the value on screen; the digits then follow the EU
 * rounding rule (`7` → `7,0`) where Share, whose `String.prototype.toLocaleString`
 * ignores its options, prints the raw `7`. That one-character difference is on an
 * input beCPG cannot produce, and it errs towards showing the number.
 *
 * @param {Object|null} envelope
 * @param {string} mapName
 * @param {string} key regulatory country key
 * @returns {number|null} the number, or `null`
 */
export function countryValue(envelope, mapName, key) {
    const map = envelope && typeof envelope === 'object' ? envelope[mapName] : null;
    if (!map || typeof map !== 'object') {
        return null;
    }
    const value = map[key];
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}
