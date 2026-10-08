/**
 * The translations loaded so far, by language — the languages whose text is
 * not written inline beside each component (see `config/locales/`).
 *
 * A module of its own, importing nothing, so that `config/messages.js` and
 * `lib/i18n.js` can both read it without importing each other. On the server
 * it is shared by every request, which is safe: it only ever holds the static
 * content of `config/locales/*.js`, never anything about a user.
 */

const loaded = new Map();

/**
 * @param {string} lang a supported lang
 * @param {Object|null|undefined} dictionary namespace → labels
 */
export function registerLocale(lang, dictionary) {
    if (dictionary && !loaded.has(lang)) {
        loaded.set(lang, dictionary);
    }
}

/**
 * @param {string} lang
 * @returns {Object|null} namespace → labels, null while it is not loaded
 */
export function localeDictionary(lang) {
    return loaded.get(lang) ?? null;
}
