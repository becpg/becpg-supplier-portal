/**
 * Which catalogs should the supplier see?
 *
 * An entity handed over to a supplier carries two families of catalogs: the
 * client's — INCO, GS1 — written for an internal user filling in a finished
 * product, and the portal's, which describe the few fields actually asked of the
 * supplier. Showing both means confronting the supplier with requirements nobody
 * addressed to them and that they cannot possibly satisfy.
 *
 * The convention is the identifier: `SupplierPortalInitRepoVisitor` ships
 * `supplierPortal-rawMaterial`, `supplierPortal-packagingMaterial`, etc.
 *
 * The fallback matters as much as the filter. On an instance that does not have
 * these catalogs — every instance where beCPG is not yet deployed — the filter
 * keeps nothing, and the full list is returned instead. An empty compliance
 * screen would be a far worse regression than the over-broad list it replaces.
 *
 * Client and server: this module imports nothing. The constant and the filter
 * live here, in a single copy, because `lib/adapters/entities.js` is
 * server-only (AGENTS.md rule 7) and the screens need them too.
 */

/** Identifier prefix of a supplier portal catalog. */
export const SUPPLIER_PORTAL_CATALOG_PREFIX = 'supplierPortal-';

/**
 * Is this catalog a portal catalog?
 *
 * @param {Object} catalog
 * @returns {boolean}
 */
export function isPortalCatalog(catalog) {
    return String((catalog && catalog.id) || '').startsWith(SUPPLIER_PORTAL_CATALOG_PREFIX);
}

/**
 * The catalogs to show the supplier: the portal's if there are any, all of them otherwise.
 *
 * @param {Object[]} catalogs
 * @returns {Object[]} the same array when no portal catalog exists
 */
export function portalCatalogs(catalogs) {
    const list = Array.isArray(catalogs) ? catalogs : [];
    const own = list.filter(isPortalCatalog);
    return own.length > 0 ? own : list;
}

/* -------------------------------------------------------------------------- */
/* Routing a catalogue gap to the step that can close it                       */
/* -------------------------------------------------------------------------- */

/**
 * A catalogue check that is a formula, not a field: it names nothing to route on.
 *
 * @param {string} name
 * @returns {boolean}
 */
export function isFormulaCheck(name) {
    return String(name || '').startsWith('formula');
}

/**
 * The field names a missing-field id refers to.
 *
 * beCPG joins the alternatives it found absent with `|`
 * (`bcpg:useByDate|bcpg:bestBeforeDate`) and emits `formulaX` for a formula
 * check. The locale is carried apart, in `field.locale`.
 *
 * @param {{field: ?string}} field a normalised missing field
 * @returns {string[]} the prefixed names, empty for a formula check
 */
export function missingFieldNames(field) {
    return String((field && field.field) || '')
        .split('|')
        .map((part) => part.trim())
        .filter((part) => part && !isFormulaCheck(part));
}

/**
 * The checks the portal's own catalogues shipped **before** they named their
 * list, and the list each one is about.
 *
 * `supplier-portal-catalogs.json` now names them `formulaNutListNutriscore` and
 * `formulaIngListOrigins`, which the convention below resolves on its own. An
 * instance that imported the file earlier keeps the ids it imported —
 * `SupplierPortalInitRepoVisitor` only rewrites a catalogue file still at its
 * initial version — so this table is what makes the mark appear on dev and on
 * every instance already installed, without touching their data.
 *
 * Three entries, for the three checks beCPG itself ships. A customer's own
 * catalogue is resolved by the convention or not at all.
 */
const LEGACY_CHECK_LISTS = Object.freeze({
    formulanutriscorevalues: 'nutList',
    formulainglistnotempty: 'ingList',
    formulaingorigins: 'ingList',
});

/**
 * The list a **formula** check is about, read from the name the catalogue gave
 * it.
 *
 * A formula check names no field: `EntityCatalogServiceImpl` emits the id the
 * catalogue declared — `formulaIngListOrigins` — and its already translated
 * sentence, and nothing else. The tab it belongs to is therefore only knowable
 * from that id, and only when the id says it: the convention is that a check
 * about a list carries the list's name, which is what the catalogues shipped
 * with the portal do (`supplier-portal-catalogs.json`).
 *
 * A catalogue that does not follow it loses nothing: the check stays unrouted,
 * which is exactly what it was before, and the conformity step still lists it.
 *
 * The longest match wins, so `ingList` never steals a check that names
 * `ingListOrigin`-like a longer list.
 *
 * @param {string} id the check id
 * @param {Object} listSteps list name -> stepId
 * @returns {string|null} the step id
 */
export function stepForFormulaCheck(id, listSteps) {
    const haystack = String(id || '').toLowerCase();
    let match = null;
    for (const name of Object.keys(listSteps || {})) {
        const needle = String(name).toLowerCase();
        if (!needle || !haystack.includes(needle)) {
            continue;
        }
        if (!match || needle.length > match.needle.length) {
            match = { needle, stepId: listSteps[name] };
        }
    }
    if (match) {
        return match.stepId;
    }
    const legacy = LEGACY_CHECK_LISTS[haystack];
    return legacy && listSteps[legacy] ? listSteps[legacy] : null;
}

/**
 * The step a catalogue-missing field belongs to.
 *
 * @param {Object} field a normalised missing field
 * @param {{fieldSteps: Object, listSteps: Object}} [index]
 * @returns {{stepId: string, name: string|null}|null} null when nothing can be asserted
 */
export function stepForMissingField(field, { fieldSteps = {}, listSteps = {} } = {}) {
    const target = field && field.target;
    if (target && listSteps[target]) {
        return { stepId: listSteps[target], name: null };
    }
    for (const name of missingFieldNames(field)) {
        if (fieldSteps[name]) {
            return { stepId: fieldSteps[name], name };
        }
    }
    const formula = String((field && field.field) || '');
    if (isFormulaCheck(formula)) {
        const stepId = stepForFormulaCheck(formula, listSteps);
        if (stepId) {
            return { stepId, name: null };
        }
    }
    return null;
}

/**
 * The catalogue gaps, attributed to the steps that hold them.
 *
 * A gap nobody can attribute is returned apart rather than dropped or pinned on
 * an arbitrary step: the conformity screen still lists it, which is the honest
 * answer when the catalogue names a formula instead of a field.
 *
 * @param {Object[]} catalogs
 * @param {{fieldSteps: Object, listSteps: Object}} [index]
 * @returns {{byStep: Object.<string, {count: number, labels: string[]}>, unrouted: string[]}}
 */
export function catalogGapsByStep(catalogs, index) {
    const byStep = {};
    const unrouted = [];
    const seen = new Set();
    for (const catalog of catalogs || []) {
        for (const field of catalog.missingFields || []) {
            // The same field is reported once per catalogue and once per locale:
            // a legal name missing in FR and in EN is two gaps, the same gap seen
            // by two catalogues is one.
            const key = `${field.field || ''}::${field.locale || ''}`;
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            const label = field.locale
                ? `${field.label} (${String(field.locale).toUpperCase()})`
                : field.label;
            const found = stepForMissingField(field, index);
            if (!found) {
                unrouted.push(label);
                continue;
            }
            const entry = byStep[found.stepId] || (byStep[found.stepId] = { count: 0, labels: [] });
            entry.count += 1;
            entry.labels.push(label);
        }
    }
    return { byStep, unrouted };
}
