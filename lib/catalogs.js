/**
 * **Quels catalogues le fournisseur doit-il voir ?**
 *
 * Une fiche confiée à un fournisseur porte deux familles de catalogues : ceux du
 * client — INCO, GS1 — écrits pour un utilisateur interne qui remplit un produit
 * fini, et ceux du portail, qui décrivent les quelques champs réellement demandés
 * au fournisseur. Lui montrer les deux, c'est lui opposer des exigences que
 * personne ne lui a adressées et qu'il ne peut pas faire monter.
 *
 * La convention est l'identifiant : `SupplierPortalInitRepoVisitor` livre
 * `supplierPortal-rawMaterial`, `supplierPortal-packagingMaterial`, etc.
 *
 * **Le repli compte autant que le filtre.** Sur une instance qui n'a pas ces
 * catalogues — toutes celles où beCPG n'est pas encore livré — le filtre ne
 * retient rien, et on rend alors la liste complète. Un écran de conformité vide
 * serait une régression bien pire que la liste trop large qu'il remplace.
 *
 * Client **et** serveur : ce module n'importe rien. La constante et le filtre
 * vivent ici, en un seul exemplaire, parce que `lib/adapters/entities.js` est
 * réservé au serveur (règle 7 d'AGENTS.md) et que les écrans en ont besoin aussi.
 */

/** Préfixe d'identifiant d'un catalogue du portail fournisseur. */
export const SUPPLIER_PORTAL_CATALOG_PREFIX = 'supplierPortal-';

/**
 * Ce catalogue est-il un catalogue du portail ?
 *
 * @param {Object} catalog
 * @returns {boolean}
 */
export function isPortalCatalog(catalog) {
    return String((catalog && catalog.id) || '').startsWith(SUPPLIER_PORTAL_CATALOG_PREFIX);
}

/**
 * Les catalogues à montrer au fournisseur : ceux du portail s'il y en a, tous sinon.
 *
 * @param {Object[]} catalogs
 * @returns {Object[]} le même tableau quand aucun catalogue du portail n'existe
 */
export function portalCatalogs(catalogs) {
    const list = Array.isArray(catalogs) ? catalogs : [];
    const own = list.filter(isPortalCatalog);
    return own.length > 0 ? own : list;
}
