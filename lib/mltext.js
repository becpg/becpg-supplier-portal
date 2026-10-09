/**
 * A locale map that was stored as text.
 *
 * A `d:mltext` property normally reads either as a string — the text in the
 * caller's language — or as a map `{ fr: '…', en: '…' }`. There is a third
 * case, which should never have existed: a string holding the JSON of the map,
 * `{"fr":"Sucre cristal"}`, written as-is into the property.
 *
 * It comes from a defect of the portal itself, fixed since: the preparation of
 * form values serialised locale maps before sending them, so the repository
 * received text where it expected a multilingual value. What was written during
 * that period stays written — measured on dev on 2026-08-13: 2 entities out of
 * 83 carrying a legal name, two copies of the same test product.
 *
 * What this module does, and what it does not
 *
 * It reads back: handing `{"fr":"Sucre cristal"}` to a supplier in an input
 * field is not acceptable, and leaving it as-is also guaranteed that a plain
 * save would encode it once more. Once recognised, the value becomes a real
 * locale map again: the multilingual control picks it up, and the next save
 * writes it back straight.
 *
 * It repairs nothing on its own: no write is triggered on read, and no
 * migration patch accompanies this file — that is an explicit request, the
 * anomaly must stay visible rather than be erased behind the operator's back.
 *
 * Why the recognition is this narrow
 *
 * Mistaking legitimate text for an encoded map would replace one correct value
 * with another: the guard therefore requires a flat object whose keys are all
 * plausible language codes and whose values are all strings. A name that starts
 * with a brace without satisfying that is returned unchanged.
 */

/** `fr`, `en`, `fr_FR`, `pt_BR`… — the shape of Alfresco locales. */
const LOCALE_KEY = /^[a-z]{2}(_[A-Z]{2})?$/;

/**
 * Is the value an already decoded locale map?
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isLocaleMap(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const keys = Object.keys(value);
    return keys.length > 0
        && keys.every((key) => LOCALE_KEY.test(key))
        && keys.every((key) => typeof value[key] === 'string');
}

/**
 * The locale map of a `d:mltext`, rebuilt from the sibling keys the repository
 * emits beside the property — `bcpg:legalName_fr`, `bcpg:legalName_en_US`
 * (`JsonEntityVisitor#visitMltextAttributes`).
 *
 * The base key alone holds the text in the CALLER's language, which is why a
 * form built on it showed one language and overwrote every other one on the
 * next save. A row of a datalist carries no sibling, so the answer is `null`
 * there and every other caller reads exactly what it read before.
 *
 * @param {Object} attributes the entity attributes
 * @param {string} name prefixed property name, `bcpg:legalName`
 * @returns {Object|null} `{ locale: text }`, or null when no sibling answered
 */
export function mlTextFromAttributes(attributes, name) {
    if (!attributes || typeof attributes !== 'object' || !name) {
        return null;
    }
    const prefix = `${name}_`;
    const map = {};
    for (const [key, cell] of Object.entries(attributes)) {
        if (!key.startsWith(prefix)) {
            continue;
        }
        const locale = key.slice(prefix.length);
        if (!LOCALE_KEY.test(locale)) {
            continue;
        }
        const text = cell && typeof cell === 'object' && 'value' in cell ? cell.value : cell;
        if (typeof text === 'string' && text !== '') {
            map[locale] = text;
        }
    }
    return Object.keys(map).length > 0 ? map : null;
}

/**
 * Returns a locale map when the value is one, even if it is JSON-encoded.
 *
 * @param {*} value the raw value read from the repository
 * @returns {Object|null} the map, or `null` if the value is not one
 */
export function asLocaleMap(value) {
    if (isLocaleMap(value)) {
        return value;
    }
    if (typeof value !== 'string') {
        return null;
    }
    const text = value.trim();
    // Ruled out before paying for a `JSON.parse`: the vast majority of values
    // are ordinary text.
    if (!text.startsWith('{') || !text.endsWith('}')) {
        return null;
    }
    try {
        const parsed = JSON.parse(text);
        return isLocaleMap(parsed) ? parsed : null;
    }
    catch {
        return null;
    }
}

/**
 * The value as it must be handled: a locale map when it is one, the original
 * value otherwise.
 *
 * To be used on the read path, so that the rest of the portal never sees the
 * encoded form — neither on display, nor in an input field.
 *
 * @param {*} value
 * @returns {*}
 */
export function recoverMlText(value) {
    return asLocaleMap(value) || value;
}

/**
 * The value as it must be displayed: a single string.
 *
 * The requested language first, then any other non-empty one — a label filled
 * in a single language must be readable, even if it is not the user's. Better
 * the Spanish text than nothing at all.
 *
 * @param {*} value
 * @param {string} [lang='fr'] the user's language
 * @returns {*} a string for a multilingual value, the original value otherwise
 */
export function readMlText(value, lang = 'fr') {
    const map = asLocaleMap(value);
    if (!map) {
        return value;
    }
    const exact = map[lang];
    if (exact) {
        return exact;
    }
    // `fr` must match a map that only knows `fr_FR`, and the other way round.
    const base = String(lang).slice(0, 2);
    const near = Object.keys(map).find((key) => key.slice(0, 2) === base && map[key]);
    if (near) {
        return map[near];
    }
    const any = Object.keys(map).find((key) => map[key]);
    return any ? map[any] : '';
}

/**
 * A property of a frozen version. A multilingual text is frozen in its locale
 * variants only (`bcpg:legalName_fr`), never under the bare name the form asks for:
 * the reader's language first, then any language filled in.
 *
 * @param {Object} attributes the snapshot's attributes
 * @param {string} name the property qname
 * @param {string} lang the reader's language
 * @returns {*}
 */
export function snapshotValue(attributes, name, lang) {
    if (!attributes || !name) {
        return null;
    }
    if (attributes[name] !== undefined && attributes[name] !== null && attributes[name] !== '') {
        return attributes[name];
    }
    const subtag = String(lang || '').slice(0, 2).toLowerCase();
    const own = attributes[`${name}_${subtag}`];
    if (own) {
        return own;
    }
    const prefix = `${name}_`;
    const other = Object.keys(attributes).find((key) => key.startsWith(prefix)
        && /^[a-z]{2}(_[A-Z]{2})?$/.test(key.slice(prefix.length)) && attributes[key]);
    return other ? attributes[other] : null;
}
