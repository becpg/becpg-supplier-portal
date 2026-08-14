/**
 * **In which languages must the supplier fill a `d:mltext` field?** (#33085, spec §4.4.1)
 *
 * A `d:mltext` value is a locale → text map. The portal used to render those maps
 * with **two** boxes, `fr` and `en`, because `localesFor()` fell back on
 * `SUPPORTED_LANGS` — the list of languages the portal's *own chrome* is written
 * in. Those are two different things: the language someone reads the portal in
 * says nothing about the languages a customer expects a legal name in. A supplier
 * shipping to Italy simply could not type Italian.
 *
 * Resolution order, most specific first:
 *
 * | Rank | Source | What it means |
 * |---|---|---|
 * | 1 | `locales` / `languages` control parameter | the Share form declares it field by field — always wins |
 * | 2 | the **catalogues applying to the entity** | the customer declares what it expects of this sheet |
 * | 3 | `$supportedLocales` of the repository | everything Alfresco knows how to store |
 *
 * Rank 1 is resolved in the browser by `MlTextControl`, which holds the field
 * definition; this module answers ranks 2 and 3. Rank 2 is the one the
 * specification calls for: a required language is a completeness requirement like
 * any other, so it belongs to the catalogue and not to a parallel configuration of
 * the portal.
 *
 * **How a catalogue carries its languages.** `catalogs.json` accepts a `locales`
 * array per catalogue (`EntityCatalogService.PROP_LOCALES`), and
 * `EntityCatalogServiceImpl.getLocales()` falls back to the entity's
 * `rep:reportLocales`, then to the instance locale. The response never echoes that
 * array: `formulateCatalog()` **expands** it into one row per language, each
 * stamped with a singular `locale`. Reading `catalogs[].locale` is therefore the
 * only way to learn the list — there is no `locales` field to look for.
 *
 * **And the default locale comes back as an absent key.** `formulateCatalog()`
 * writes `locale: null` for the instance locale, and `JSONObject.put(key, null)`
 * *removes* the key. Hence {@link CATALOG_DECLARES_LANGUAGES}: a lone unnamed row
 * is not evidence of anything, while an unnamed row among named ones is the
 * instance locale and must be named — otherwise a German instance restricting its
 * suppliers to `["de","en"]` would offer them English only.
 *
 * **No list is invented here.** The portal writes no language list of its own:
 * this module has no default value, and when the repository does not answer, the
 * answer is `null` — the caller then keeps the behaviour it had rather than a list
 * of our making.
 *
 * Server side only.
 */

import { logWarn } from '@/lib/http';
import { portalCatalogs } from '@/lib/catalogs';

/**
 * How many rows a catalogue must produce before its unnamed row can be read as
 * the instance locale.
 *
 * One row carrying no `locale` is what a catalogue that declares nothing produces
 * on an entity without `rep:reportLocales` — the absence of a declaration, not a
 * requirement for one language. Two rows can only come from a declaration, so the
 * unnamed one among them is a required language that happens to be the instance's.
 *
 * A declaration of exactly one language *equal to* the instance locale is
 * indistinguishable from no declaration at all in this payload. It falls back to
 * rank 3, which offers more languages than asked rather than fewer — the reading
 * that cannot take away a language the supplier needs.
 */
const CATALOG_DECLARES_LANGUAGES = 2;

/** The dictionary needs a type; it answers the same locales for all of them. */
const DICTIONARY_PROBE_TYPE = 'bcpg:rawMaterial';

/**
 * Splits a comma-separated locale list.
 *
 * Accepts both spellings in circulation — `fr_FR` (Java) and `fr-FR` (BCP 47) —
 * and returns them as they came: `MlTextControl` displays them and already
 * normalises before comparing.
 *
 * @param {*} value
 * @returns {string[]}
 */
export function parseLocales(value) {
    if (Array.isArray(value)) {
        return value.map((entry) => String(entry).trim()).filter(Boolean);
    }
    if (typeof value !== 'string') {
        return [];
    }
    return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

/**
 * Groups catalogue rows by catalogue id.
 *
 * Rows of different catalogues interleave in the payload, and the unnamed-row rule
 * is per catalogue: a catalogue declaring nothing next to one declaring three
 * languages must not borrow its neighbour's evidence.
 *
 * @param {Object[]} catalogs
 * @returns {Map<string, Object[]>}
 */
function groupById(catalogs) {
    const byId = new Map();
    for (const catalog of catalogs) {
        if (!catalog || typeof catalog !== 'object') {
            continue;
        }
        const id = catalog.id || catalog.label || '';
        const rows = byId.get(id);
        if (rows) {
            rows.push(catalog);
        }
        else {
            byId.set(id, [catalog]);
        }
    }
    return byId;
}

/**
 * The languages the catalogues of a sheet require.
 *
 * Scoped to the portal's own catalogues when the entity carries any — the
 * supplier is asked to satisfy those, not the customer's internal INCO or GS1
 * sheets (see `lib/catalogs.js`).
 *
 * @param {Object[]} catalogs the `catalogs[]` payload of `entity/catalog/node`,
 *        or the same rows read from `bcpg:entityScore`
 * @param {string|null} [defaultLocale] the instance locale, to name the rows that
 *        come back without one
 * @returns {string[]} empty when no catalogue declares anything
 */
export function catalogLocales(catalogs, defaultLocale = null) {
    const found = [];
    const add = (locale) => {
        if (locale && !found.includes(locale)) {
            found.push(locale);
        }
    };

    for (const rows of groupById(portalCatalogs(catalogs)).values()) {
        const declares = rows.length >= CATALOG_DECLARES_LANGUAGES;
        for (const row of rows) {
            const locale = typeof row.locale === 'string' ? row.locale.trim() : '';
            add(locale || (declares ? defaultLocale : null));
        }
    }
    return found;
}

/**
 * What the repository says about locales: the ones it can store, and its own.
 *
 * `becpg/remote/dictionary` announces both at the head of its schema —
 * `$supportedLocales` is `MLTextHelper.getSupportedLocales()`, i.e. the instance
 * property `beCPG.multilinguale.supportedLocales`, the same list Share offers and
 * the one an administrator already tunes; `$locale` is
 * `Locale.getDefault()`, which is what a catalogue row omits its `locale` for.
 *
 * The `becpg/remote/` prefix is already allowed by the proxy — nothing to open.
 *
 * @param {Object} client an authenticated beCPG client
 * @param {string} [entityType] the type queried; the dictionary answers the same
 *        locales whatever the type, but it requires one
 * @returns {Promise<{locales: string[]|null, defaultLocale: string|null}>}
 *          `locales` is `null` when the repository did not answer
 */
export async function repositoryLocales(client, entityType = DICTIONARY_PROBE_TYPE) {
    const key = `supportedLocales:${entityType}`;
    if (client.cache && client.cache.has(key)) {
        return client.cache.get(key);
    }

    const promise = (async () => {
        try {
            const payload = await client.getJson('becpg/remote/dictionary', {
                query: { type: entityType },
            });
            const locales = parseLocales(payload && payload.$supportedLocales);
            const defaultLocale = parseLocales(payload && payload.$locale)[0] || null;
            return { locales: locales.length > 0 ? locales : null, defaultLocale };
        }
        catch (error) {
            // A language list is a comfort, not a prerequisite: the wizard must
            // open even when the dictionary does not answer.
            logWarn('contentLocales.dictionary', { error: error.message, entityType });
            return { locales: null, defaultLocale: null };
        }
    })();

    if (client.cache) {
        client.cache.set(key, promise);
    }
    return promise;
}

/**
 * The input-language policy of a sheet.
 *
 * The dictionary is read even when the catalogues answer: naming their unnamed row
 * needs `$locale`. It is memoised on the request cache, so a ten-step wizard reads
 * it once.
 *
 * @param {Object} client an authenticated beCPG client
 * @param {Object} [options]
 * @param {Object[]} [options.catalogs] the catalogues applying to the sheet
 * @param {string} [options.entityType] the type of the sheet
 * @returns {Promise<{locales: string[], source: 'catalog'|'repository'}|null>}
 *          `null` when nothing can be asserted — the caller must then change
 *          **nothing** to what it was doing
 *
 * @example
 * await resolveContentLocales(client, { entityType: 'bcpg:rawMaterial' });
 * // { locales: ['fr','de','en','en_AU', …], source: 'repository' }
 */
export async function resolveContentLocales(client, options = {}) {
    const repository = await repositoryLocales(client, options.entityType);

    const fromCatalog = catalogLocales(options.catalogs, repository.defaultLocale);
    if (fromCatalog.length > 0) {
        return { locales: fromCatalog, source: 'catalog' };
    }

    return repository.locales ? { locales: repository.locales, source: 'repository' } : null;
}
