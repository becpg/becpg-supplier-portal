/**
 * Which text a component shows, in thirteen languages, without shipping thirteen.
 *
 * Every component keeps its French and English labels inline, beside the code
 * that uses them: they are the source, and they are what a developer edits.
 * The other languages live in `config/locales/<lang>.js`, generated from that
 * source by `npm run i18n:extract` and translated, keyed by the namespace each
 * table declares here. Only the reader's language is ever loaded: the server
 * loads it before rendering and hands it to the client, and switching language
 * loads the new one before the switch happens.
 *
 * A key a translation lacks reads the English text, never a blank and never a
 * key: a label added in a component shows in English until it is translated.
 *
 * Safe on both sides of the wire.
 */

import { inlineLang, normalizeLang } from '@/config/messages';
import { localeDictionary, registerLocale } from '@/lib/localeRegistry';

/**
 * One loader per translated language: a static `import()` each, so the bundler
 * makes one chunk per language and a reader downloads only theirs.
 */
const LOADERS = {
    de: () => import('@/config/locales/de.js'),
    es: () => import('@/config/locales/es.js'),
    it: () => import('@/config/locales/it.js'),
    pt_BR: () => import('@/config/locales/pt_BR.js'),
    sv_SE: () => import('@/config/locales/sv_SE.js'),
    fi: () => import('@/config/locales/fi.js'),
    tr: () => import('@/config/locales/tr.js'),
    ja_JP: () => import('@/config/locales/ja_JP.js'),
    zh_CN: () => import('@/config/locales/zh_CN.js'),
    ar: () => import('@/config/locales/ar.js'),
};

/**
 * Keys that name things rather than say them — an anchor, an icon, a link, a
 * stored value. A translation never replaces them, even by mistake.
 */
const VERBATIM_KEYS = new Set(['id', 'icon', 'href', 'value', 'tone']);

/** table → its namespace, as declared by {@link defineLabels}. */
const namespaces = new WeakMap();

/** table → lang → the translated labels merged over the English ones. */
const merged = new WeakMap();

/**
 * Declares a component's inline labels under a namespace — the key its
 * translations are filed under in `config/locales/`.
 *
 * @param {string} namespace `<file path without extension>#<constant name>`
 * @param {{fr: Object, en: Object}} table
 * @returns {{fr: Object, en: Object}} the same table
 *
 * @example
 * const LABELS = defineLabels('components/shell/Nav#LABELS', { fr: {…}, en: {…} });
 */
export function defineLabels(namespace, table) {
    namespaces.set(table, namespace);
    return table;
}

/**
 * The labels of a table in a language.
 *
 * @param {{fr: Object, en: Object}} table declared by {@link defineLabels}
 * @param {string} lang any locale; normalised here
 * @returns {Object|string} the labels, same shape as `table.en`
 */
export function pickLabels(table, lang) {
    const code = normalizeLang(lang);
    const inline = inlineLang(code);
    if (inline && table[inline]) {
        return table[inline];
    }
    const base = table.en ?? table.fr;
    const translated = localeDictionary(code)?.[namespaces.get(table)];
    if (!translated) {
        return base;
    }
    let byLang = merged.get(table);
    if (!byLang) {
        byLang = new Map();
        merged.set(table, byLang);
    }
    if (!byLang.has(code)) {
        byLang.set(code, overlay(base, translated));
    }
    return byLang.get(code);
}

/**
 * `base` with every string `translated` provides, recursively — through
 * objects and arrays alike; whatever it lacks, or provides with another shape,
 * keeps the English value. A table may hold a single sentence (`{ fr, en }`
 * beside an icon), in which case `base` is that sentence.
 *
 * @param {*} base
 * @param {*} translated
 * @returns {*}
 */
function overlay(base, translated) {
    if (typeof base === 'string') {
        return typeof translated === 'string' && translated !== '' ? translated : base;
    }
    if (!base || typeof base !== 'object' || !translated || typeof translated !== 'object') {
        return base;
    }
    if (Array.isArray(base)) {
        return Array.isArray(translated) ? base.map((value, index) => overlay(value, translated[index])) : base;
    }
    const result = {};
    for (const [key, value] of Object.entries(base)) {
        result[key] = VERBATIM_KEYS.has(key) ? value : overlay(value, translated[key]);
    }
    return result;
}

/**
 * Loads a language's translations, once. A language written inline, or one
 * already loaded, resolves at once.
 *
 * @param {string} lang
 * @returns {Promise<Object|null>} the dictionary, null for an inline language
 */
export async function loadLocale(lang) {
    const code = normalizeLang(lang);
    const loader = LOADERS[code];
    if (!loader) {
        return null;
    }
    if (!localeDictionary(code)) {
        registerLocale(code, (await loader()).default);
    }
    return localeDictionary(code);
}
