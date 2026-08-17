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
