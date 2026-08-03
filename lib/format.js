/**
 * The portal's single date / number formatting module.
 *
 * Before this module every screen reimplemented `Intl.DateTimeFormat` — twelve
 * copies, two incompatible `formatDate` exports (one in `ExpiryPill`, one in
 * `ApprovalCard`, disagreeing on both the English pattern and the empty value),
 * and the screens that had no copy at hand simply printed the ISO string. That
 * is how `2026-07-06T14:48:55.903Z` reached a user's product sheet.
 *
 * Three properties this module guarantees, and which the ad-hoc copies did not:
 *
 *   1. **Null-safe.** An absent, empty or unparseable value renders the em dash
 *      `—`, never `Invalid Date` and never `NaN`. Callers that need a falsy
 *      answer so they can pick a different sentence pass `{ fallback: null }`.
 *   2. **SSR-safe.** Every formatter pins {@link DISPLAY_TIME_ZONE}. Left to
 *      itself `Intl` uses the *host* zone, so the server rendered the container's
 *      UTC and the browser rendered the user's zone — different markup for the
 *      same node, i.e. a React hydration mismatch, and a date off by one day
 *      either side of midnight. A fixed zone makes both sides agree by
 *      construction.
 *   3. **One implementation.** Locale mapping, parsing and the empty case are
 *      decided here and nowhere else.
 *
 * This module is imported by client components, so it must stay free of any
 * server-only dependency: no `next/headers`, no `@/lib/becpg`, no `@/lib/session`
 * (AGENTS.md rule 7). It is pure and has no environment lookup — a
 * `process.env` read would be inlined on the server and `undefined` in the
 * browser, which would reintroduce the very hydration mismatch point 2 removes.
 *
 * @example
 * import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
 *
 * formatDate('2026-07-06T14:48:55.903Z', 'fr');      // '06/07/2026'
 * formatDateTime('2026-07-06T14:48:55.903Z', 'fr');  // '06/07/2026 16:48'
 * formatDate(null, 'fr');                            // '—'
 * formatDate(null, 'fr', { fallback: null });        // null
 * formatNumber(1234.5, 'fr');                        // '1 234,5'
 */

import { t as translate } from '@/config/messages';

/**
 * The zone every date is rendered in, server and client alike.
 *
 * Business zone of the deployment rather than UTC: the portal's timestamps are
 * read as wall-clock times ("saved at 16:48"), and beCPG stores day-precision
 * properties at local midnight — rendering those in UTC would show the previous
 * day for half the year. Pass `options.timeZone` to override per call.
 */
export const DISPLAY_TIME_ZONE = 'Europe/Paris';

/** What an absent or unreadable value renders as. */
export const EMPTY_VALUE = '—';

/**
 * Chrome language → BCP 47 tag.
 *
 * `en` maps to `en-GB`, not `en-US`: the portal's English users are European and
 * read `31/12/2026`, not `12/31/2026`. This was already the choice of the
 * `ExpiryPill` copy, which fifteen screens imported; the `ApprovalCard` copy
 * disagreed and emitted `2026-12-31`. `en-GB` wins.
 */
const LOCALES = {
    fr: 'fr-FR',
    en: 'en-GB',
};

const DEFAULT_LOCALE = LOCALES.fr;

/**
 * Resolves a chrome language to a BCP 47 tag.
 *
 * @param {string} [lang] `'fr'` | `'en'`
 * @returns {string} a BCP 47 tag
 */
function localeOf(lang) {
    if (!lang) {
        return DEFAULT_LOCALE;
    }
    return LOCALES[String(lang).slice(0, 2).toLowerCase()] || DEFAULT_LOCALE;
}

/**
 * `Intl` constructors are expensive and these run once per table cell, so every
 * distinct option set is built once and reused. The key is the locale plus the
 * serialised options, which is exactly what determines the instance.
 */
const formatterCache = new Map();

/**
 * @param {'date'|'number'|'relative'} kind
 * @param {string} locale
 * @param {Object} options
 * @returns {Intl.DateTimeFormat|Intl.NumberFormat|Intl.RelativeTimeFormat}
 */
function formatter(kind, locale, options) {
    const key = `${kind}|${locale}|${JSON.stringify(options)}`;
    const cached = formatterCache.get(key);
    if (cached) {
        return cached;
    }
    let built;
    if (kind === 'date') {
        built = new Intl.DateTimeFormat(locale, options);
    }
    else if (kind === 'number') {
        built = new Intl.NumberFormat(locale, options);
    }
    else {
        built = new Intl.RelativeTimeFormat(locale, options);
    }
    formatterCache.set(key, built);
    return built;
}

/**
 * Date-only strings (`2026-12-31`), which `new Date()` would read as UTC
 * midnight and a negative-offset zone would then render as the 30th.
 */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses anything beCPG or the proxy can hand us into a `Date`.
 *
 * Accepts a `Date`, an epoch number, an ISO string, and the bare `YYYY-MM-DD`
 * that Alfresco's `d:date` sometimes serialises to. Returns `null` — never an
 * `Invalid Date` — for everything else, so each formatter has a single empty
 * branch to handle.
 *
 * @param {string|number|Date|null|undefined} value
 * @returns {Date|null} a valid `Date`, or `null`
 */
export function toDate(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'number') {
        const fromEpoch = new Date(value);
        return Number.isNaN(fromEpoch.getTime()) ? null : fromEpoch;
    }
    if (typeof value !== 'string') {
        return null;
    }
    const text = value.trim();
    if (!text) {
        return null;
    }
    // Anchored at noon UTC: far enough from both midnights that no zone in use
    // can push the calendar day either way.
    const dateOnly = DATE_ONLY.exec(text);
    if (dateOnly) {
        const parsed = new Date(
            Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12),
        );
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * True when a string looks like an ISO timestamp.
 *
 * Used by the generic value renderers — the raw property sheet, the datalist
 * cells, the suggestion cards — which receive values with no data type attached
 * and would otherwise print the timestamp verbatim. Matching on the *shape* of
 * the value is what stops `2026-07-06T14:48:55.903Z` from reaching a screen.
 *
 * Deliberately requires the `T` and the time part: a bare `2026-12-31` is
 * ambiguous (a batch number, a code) and is left alone.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isIsoTimestamp(value) {
    return typeof value === 'string'
        && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/.test(value.trim());
}

/**
 * Shared tail of every formatter: resolve the empty case once.
 *
 * @param {Object} options
 * @returns {string|null} what an absent value renders as
 */
function fallbackOf(options) {
    return options && 'fallback' in options ? options.fallback : EMPTY_VALUE;
}

/**
 * A short calendar date — `31/12/2026` in both `fr` and `en`.
 *
 * @param {string|number|Date|null} value ISO string, epoch or `Date`
 * @param {string} [lang='fr'] chrome language
 * @param {{fallback?: *, timeZone?: string}} [options]
 * @returns {string|*} the formatted date, or the fallback (`'—'` by default)
 *
 * @example
 * formatDate('2026-12-31T23:30:00Z');                  // '01/01/2027' (Paris)
 * formatDate(null, 'fr', { fallback: null });          // null
 */
export function formatDate(value, lang = 'fr', options = {}) {
    const date = toDate(value);
    if (!date) {
        return fallbackOf(options);
    }
    return formatter('date', localeOf(lang), {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: options.timeZone || DISPLAY_TIME_ZONE,
    }).format(date);
}

/**
 * A calendar date plus the time — `31/12/2026 14:05`.
 *
 * @param {string|number|Date|null} value
 * @param {string} [lang='fr']
 * @param {{fallback?: *, timeZone?: string}} [options]
 * @returns {string|*}
 */
export function formatDateTime(value, lang = 'fr', options = {}) {
    const date = toDate(value);
    if (!date) {
        return fallbackOf(options);
    }
    return formatter('date', localeOf(lang), {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: options.timeZone || DISPLAY_TIME_ZONE,
    }).format(date);
}

/**
 * The time alone — `14:05`.
 *
 * @param {string|number|Date|null} value
 * @param {string} [lang='fr']
 * @param {{fallback?: *, timeZone?: string}} [options] defaults to an empty
 *   string here: the callers (autosave indicator, notification panel) append it
 *   to a sentence where an em dash would read as an error.
 * @returns {string|*}
 */
export function formatTime(value, lang = 'fr', options = {}) {
    const date = toDate(value);
    if (!date) {
        return 'fallback' in options ? options.fallback : '';
    }
    return formatter('date', localeOf(lang), {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: options.timeZone || DISPLAY_TIME_ZONE,
    }).format(date);
}

/** Thresholds walked from the smallest unit up, as `[seconds, unit]`. */
const RELATIVE_UNITS = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [604800, 'day'],
    [2629800, 'week'],
    [31557600, 'month'],
    [Infinity, 'year'],
];

/** Seconds in one of the units above, in the same order. */
const RELATIVE_DIVISORS = {
    second: 1,
    minute: 60,
    hour: 3600,
    day: 86400,
    week: 604800,
    month: 2629800,
    year: 31557600,
};

/**
 * A human delay — `il y a 5 minutes`, `dans 3 jours`.
 *
 * **Not SSR-safe on its own, by nature**: the answer depends on *when* it is
 * computed, so a server render and the hydration that follows it disagree even
 * with a pinned zone. Either call it from an effect / after mount, or pass an
 * explicit `now` shared by both renders. It is the one formatter here whose
 * output is time-dependent, hence the warning rather than a silent guarantee.
 *
 * @param {string|number|Date|null} value
 * @param {string} [lang='fr']
 * @param {{fallback?: *, now?: string|number|Date}} [options]
 * @returns {string|*}
 *
 * @example
 * formatRelative(Date.now() - 300000, 'fr');  // 'il y a 5 minutes'
 */
export function formatRelative(value, lang = 'fr', options = {}) {
    const date = toDate(value);
    if (!date) {
        return fallbackOf(options);
    }
    const now = toDate(options.now) || new Date();
    const elapsed = (date.getTime() - now.getTime()) / 1000;
    const magnitude = Math.abs(elapsed);

    const unit = RELATIVE_UNITS.find(([limit]) => magnitude < limit)[1];
    const amount = Math.round(elapsed / RELATIVE_DIVISORS[unit]);

    return formatter('relative', localeOf(lang), { numeric: 'auto' }).format(amount, unit);
}

/**
 * A number in the user's locale — `1 234,5` in `fr`, `1,234.5` in `en`.
 *
 * @param {number|string|null} value
 * @param {string} [lang='fr']
 * @param {{fallback?: *, minimumFractionDigits?: number, maximumFractionDigits?: number,
 *   style?: string, currency?: string, unit?: string}} [options] the extra keys are
 *   passed straight to `Intl.NumberFormat`
 * @returns {string|*}
 */
export function formatNumber(value, lang = 'fr', options = {}) {
    const { fallback: _fallback, ...intlOptions } = options;
    if (value === null || value === undefined || value === '') {
        return fallbackOf(options);
    }
    const parsed = typeof value === 'number'
        ? value
        : Number(String(value).replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(parsed)) {
        return fallbackOf(options);
    }
    return formatter('number', localeOf(lang), {
        maximumFractionDigits: 3,
        ...intlOptions,
    }).format(parsed);
}

/**
 * Renders the **total** of a paginated payload without ever inventing one.
 *
 * `becpg/remote/entity/list` cannot always tell how many rows match: on its db-afts
 * path `pagination.totalItems` is `count + 1`, a "there is at least one more"
 * sentinel (the measurements are on `readListTotal()` in `lib/adapters/tasks.js`).
 * Every adapter of the portal therefore publishes three fields instead of one —
 * `totalItems` (exact, or `null`), `totalAtLeast` (a proven floor) and `totalExact` —
 * and this function is how a screen prints them.
 *
 * A screen must not fall back on `totalItems || 0`: a park of 900 suppliers would
 * read "0 fournisseurs", i.e. the exact opposite of the truth.
 *
 * @param {Object|null} source a `pagination` block, or `{ total, exact }`, or
 *        `{ count, exact }` — whichever the payload carries
 * @param {string} [lang='fr']
 * @returns {{value: number, exact: boolean, text: string, label: string}}
 *          `text` is compact (`'250+'`) for a tile or a table footer, `label` is a
 *          sentence (`'au moins 250'`) and belongs in a title / aria-label
 *
 * @example
 * formatTotal({ totalItems: 173, totalAtLeast: 173, totalExact: true }, 'fr').text; // '173'
 * formatTotal({ totalItems: null, totalAtLeast: 250, totalExact: false }, 'fr').text; // '250+'
 */
export function formatTotal(source, lang = 'fr') {
    const block = source || {};
    const exact = block.totalExact !== undefined
        ? block.totalExact === true
        : block.exact !== undefined
            ? block.exact === true
            : block.totalItems !== null && block.totalItems !== undefined;

    const candidates = [
        block.totalItems,
        block.total,
        block.totalAtLeast,
        block.atLeast,
        block.count,
    ];
    const found = candidates.find((entry) => Number.isFinite(Number(entry)) && entry !== null && entry !== '');
    const value = Math.max(0, Number(found) || 0);
    const number = formatNumber(value, lang);

    return {
        value,
        exact,
        text: exact ? number : `${number}+`,
        label: exact ? number : translate(lang, 'state.atLeast', { total: number }),
    };
}

/**
 * Whole days between now and a date, negative in the past.
 *
 * A fallback only: `GET /api/v1/documents` already returns `daysToExpiry`,
 * computed server-side with the tenant's notice delay. Both ends are floored to
 * midnight so "tomorrow" is 1 whether it is asked at 09:00 or at 23:00.
 *
 * @param {string|number|Date|null} value
 * @param {{now?: string|number|Date}} [options]
 * @returns {number|null} `null` when there is no readable date
 */
export function daysUntil(value, options = {}) {
    const date = toDate(value);
    if (!date) {
        return null;
    }
    const now = toDate(options.now) || new Date();
    const startOfDay = (input) => Date.UTC(
        input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(),
    );
    return Math.round((startOfDay(date) - startOfDay(now)) / 86400000);
}

/* -------------------------------------------------------------------------- */
/* Light markup authored in Share                                              */
/* -------------------------------------------------------------------------- */

/**
 * Sentinel marking the lines that came out of a `<li>`, so {@link richTextLines}
 * can hand them back as bullets. A private-use code point: authored text cannot
 * contain it, and it never survives into what is rendered.
 */
const BULLET_MARK = '\uE000';

/**
 * Text authored in Share carries light HTML — `<br>`, `<b>`, `<ul>`, and for a
 * comment the whole body is wrapped in `<p>` by Alfresco's editor.
 *
 * The portal renders **no** HTML: there is no `dangerouslySetInnerHTML` in this
 * codebase, and a screen that shows repository content authored by another party
 * is the last place to introduce one. So the markup is turned into the structure
 * it described — lines, and bullets — and everything else becomes plain text.
 *
 * Without this, a comment reached the screen as the literal string `<p>T1</p>`,
 * which is what a supplier saw in the discussion panel.
 *
 * @param {string|null} value
 * @returns {Array<{bullet: boolean, text: string}>} empty when there is nothing to show
 *
 * @example
 * richTextLines('<p>Bonjour</p><ul><li>un</li></ul>');
 * // [{bullet: false, text: 'Bonjour'}, {bullet: true, text: 'un'}]
 */
export function richTextLines(value) {
    const raw = String(value ?? '');
    if (!raw.trim()) {
        return [];
    }
    const marked = raw
        // Every block-level end is a line break…
        .replace(/<\s*br\s*\/?\s*>/gi, '\n')
        .replace(/<\s*\/\s*(?:p|div|tr|h[1-6])\s*>/gi, '\n')
        // …and a list item is a line that gets a bullet.
        .replace(/<\s*li[^>]*>/gi, `\n${BULLET_MARK}`)
        .replace(/<\s*\/\s*li\s*>/gi, '\n')
        // Everything else goes, tags and entities alike. Nothing here is ever
        // handed to React as markup: these end up as plain text nodes.
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#0?39;/gi, "'");

    return marked
        .split('\n')
        .map((line) => ({
            bullet: line.startsWith(BULLET_MARK),
            text: line.split(BULLET_MARK).join('').trim(),
        }))
        .filter((line) => line.text !== '');
}

/**
 * The same markup handling as {@link richTextLines}, flattened to one string.
 * Used wherever HTML would be invalid — a `<label>`, a `<legend>`, a `title`.
 *
 * @param {string|null} value
 * @returns {string}
 */
export function plainText(value) {
    return richTextLines(value)
        .map((line) => line.text)
        .join(' ');
}

/* -------------------------------------------------------------------------- */
/* Repository identifiers — what must never reach a screen                     */
/* -------------------------------------------------------------------------- */

/** `workspace://SpacesStore/<uuid>` — the only shape a stored `d:noderef` takes. */
const NODEREF_RE = /^workspace:\/\/SpacesStore\/[0-9a-f-]{36}$/i;

/** A bare Alfresco node id. It is what `cm:name` holds on most hierarchy nodes. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A repository path: `/app:company_home/cm:System/…`. */
const QNAME_PATH_RE = /^\/[a-z]+:[A-Za-z0-9_]/;

/**
 * True when a string is a repository identifier rather than a business label.
 *
 * **Why this exists.** Four defects of the same family have already shipped, and
 * every one of them was a value that *is* a string being printed because it is a
 * string. Measured on dev.becpg.fr, all three shapes below reached a screen:
 *
 * | Shape | Where | Rendered as |
 * |---|---|---|
 * | `workspace://SpacesStore/2152aad9-…` | `/monitor`, supplier family | the nodeRef |
 * | `9a8a35f0-bea7-498f-8b23-4d39c47394e6` | `/monitor`, supplier family | the `cm:name` of a `bcpg:linkedValue`, which *is* its uuid |
 * | `/app:company_home/cm:System/cm:ProductHierarchy/…` | read-only form field | the `path` of an expanded node summary |
 *
 * A field with no label is a gap; a field showing one of these is machine data on
 * a business screen, and it is strictly worse — it looks like an answer.
 *
 * @param {*} value
 * @returns {boolean}
 *
 * @example
 * isMachineValue('workspace://SpacesStore/2152aad9-00f1-4841-92aa-d900f1d8415b'); // true
 * isMachineValue('9a8a35f0-bea7-498f-8b23-4d39c47394e6');                         // true
 * isMachineValue('/app:company_home/cm:System');                                  // true
 * isMachineValue('Ingrédients de base');                                          // false
 */
export function isMachineValue(value) {
    if (typeof value !== 'string') {
        return false;
    }
    const text = value.trim();
    return NODEREF_RE.test(text) || UUID_RE.test(text) || QNAME_PATH_RE.test(text);
}

/** True when a value is a bare nodeRef — the shape a label has to be read for. */
export function isNodeRefValue(value) {
    return typeof value === 'string' && NODEREF_RE.test(value.trim());
}

/**
 * The properties beCPG stores a *displayable* label in, most specific first.
 *
 * `bcpg:lkvValue` comes first and is not interchangeable with `bcpg:lvValue`:
 * a hierarchy level (`bcpg:linkedValue` — *Famille*, *Sous-famille*) carries
 * `lkv`, a simple list value (`bcpg:listValue`) carries `lv`, and a
 * characteristic (`bcpg:ing`, `bcpg:allergen`, `bcpg:nut`…) carries
 * `bcpg:charactName`. Reading only `lv` — which is what this portal did — finds
 * nothing on any hierarchy node, which is how the fallback below got reached.
 */
const LABEL_PROPERTIES = ['bcpg:lkvValue', 'bcpg:lvValue', 'bcpg:charactName', 'cm:title'];

/**
 * Node types whose `cm:name` is an identifier and never a label.
 *
 * Measured on dev: a `bcpg:linkedValue` is named after its own uuid
 * (`9a8a35f0-…`) or after a generated slug (`hier-ref-950220`, `sup-hier-1270`).
 * beCPG's own `LinkedValueAutoCompleteExtractor` reads `bcpg:lkvValue` and
 * renders `null` when it is absent — it never falls back on `cm:name`, and
 * neither does this. For every *other* type (a document, a product, a person)
 * `cm:name` is a legitimate label and is used.
 */
const NAMELESS_TYPES = new Set(['bcpg:linkedValue', 'bcpg:listValue']);

/**
 * The label of an **expanded node summary** — what `becpg/remote/entity` returns
 * for a `d:noderef` property or an association target.
 *
 * ```json
 * { "path": "/app:company_home/cm:System/cm:ProductHierarchy/…",
 *   "bcpg:lkvValue_fr": "Ingrédients de base",
 *   "bcpg:lkvValue": "Ingrédients de base",
 *   "id": "f30163c4-e369-4aff-8163-c4e3690aff99",
 *   "type": "bcpg:linkedValue", "bcpg:code": "LNK96864" }
 * ```
 *
 * Nothing in that object is called `label`, `name` or `value`, which is why the
 * generic renderers fell through it: `ProductSections.readableValue` returned
 * `null` (the field vanished from the sheet) and
 * `ReadOnlyControl.formatValue` returned the **first** entry — the repository
 * `path`. Both are fixed by asking this function first.
 *
 * @param {*} node an expanded node summary, or anything else
 * @param {string} [lang='fr'] chrome language — picks `bcpg:lkvValue_fr` over `bcpg:lkvValue`
 * @returns {string|null} the label, or null when the object carries none
 *
 * @example
 * nodeLabel({ 'bcpg:lkvValue': 'Épices et condiments' });        // 'Épices et condiments'
 * nodeLabel({ 'cm:name': '9a8a35f0-…', type: 'bcpg:linkedValue' }); // null
 * nodeLabel({ 'cm:name': 'IFS.pdf', type: 'cm:content' });       // 'IFS.pdf'
 */
export function nodeLabel(node, lang = 'fr') {
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
        return null;
    }
    const attributes = node.attributes && typeof node.attributes === 'object' ? node.attributes : {};
    // beCPG suffixes with the primary subtag (`_fr`), never with the full tag —
    // callers pass whatever they hold (`fr`, `fr-FR`, `fr_FR`, an Accept-Language).
    const subtag = String(lang || 'fr').trim().slice(0, 2).toLowerCase() || 'fr';
    const read = (key) => {
        const raw = node[key] !== undefined ? node[key] : attributes[key];
        if (typeof raw !== 'string') {
            return null;
        }
        const text = raw.trim();
        return text && !isMachineValue(text) ? text : null;
    };

    // beCPG already localised the value; the suffixed variant wins when it is filled in.
    for (const property of LABEL_PROPERTIES) {
        const localised = read(`${property}_${subtag}`) || read(property);
        if (localised) {
            return localised;
        }
    }
    // The portal's own shapes — a `{ value, displayValue }` cell, an association ref.
    const own = read('displayValue') || read('label') || read('name');
    if (own) {
        return own;
    }
    const type = typeof node.type === 'string' ? node.type : '';
    if (NAMELESS_TYPES.has(type)) {
        return null;
    }
    return read('cm:name') || read('cm:userName') || null;
}
