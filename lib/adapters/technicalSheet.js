/**
 * **Reconnaître la fiche technique du fournisseur** parmi les exigences
 * documentaires (spec §4.4).
 *
 * La fiche technique est le seul document que le parcours demande *avant* toute
 * saisie : tous les autres types sont **calculés à partir des données** —
 * `DocumentFormulationHandler` en déduit les exigences des allégations, des
 * labels, de la hiérarchie produit — donc ils n'existent pas encore quand
 * l'assistant s'ouvre. Elle, si.
 *
 * Encore faut-il la reconnaître, et le portail **n'invente pas de type** : il
 * reconnaît celui que le client a configuré dans son référentiel
 * (`bcpg:documentType`). Comme ce libellé varie d'une instance à l'autre
 * — « Fiche technique », « Fiche technique fournisseur », « Technical data
 * sheet », « TDS » — la reconnaissance est une liste de motifs, configurable et
 * pourvue de valeurs par défaut qui couvrent les formulations courantes.
 *
 * `PORTAL_TECHNICAL_SHEET_TYPES` accepte des libellés ou des codes séparés par
 * des virgules. Renseignée, elle **remplace** les valeurs par défaut : une
 * instance qui nomme son type autrement n'a pas à subir nos approximations.
 *
 * @example
 * PORTAL_TECHNICAL_SHEET_TYPES="Fiche technique fournisseur,FT-FOURN"
 */

/**
 * Les formulations reconnues à défaut de configuration.
 *
 * Volontairement courtes et sans accent : la comparaison est faite sur une forme
 * normalisée, donc « Fiche Technique » et « fiche technique » tombent toutes deux
 * sur `fiche technique`.
 */
const DEFAULT_PATTERNS = [
    'fiche technique',
    'technical sheet',
    'technical data sheet',
    'product data sheet',
];

/**
 * Minuscules, sans accent, espaces normalisés — pour comparer « Fiche Technique »
 * et « fiche technique » sans se soucier de la saisie du client.
 *
 * @param {*} value
 * @returns {string}
 */
export function normalize(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Les motifs en vigueur.
 *
 * @returns {string[]}
 */
export function technicalSheetPatterns() {
    const configured = String(process.env.PORTAL_TECHNICAL_SHEET_TYPES || '')
        .split(',')
        .map(normalize)
        .filter(Boolean);
    return configured.length > 0 ? configured : DEFAULT_PATTERNS;
}

/**
 * Cette exigence documentaire porte-t-elle la fiche technique ?
 *
 * Le rapprochement se fait sur le **type** du document — son libellé ou son code
 * — et non sur le nom du fichier déposé : un fournisseur qui appelle son PDF
 * « FT_2026_final_v3.pdf » ne doit pas décider du classement, et un fournisseur
 * qui l'appelle « document.pdf » ne doit pas en être puni.
 *
 * La comparaison est un `includes` sur la forme normalisée, pas une égalité :
 * « Fiche technique fournisseur » et « Fiche technique matière première »
 * désignent la même chose du point de vue du parcours.
 *
 * ## Le champ qui porte le libellé s'appelle `label`
 *
 * Cette fonction lisait `type.name` / `type.code` / `type.title`. Aucun des trois
 * n'existe : le type vient de `assocRef()` (`lib/adapters/documents.js`), qui
 * produit `{ nodeRef, label, type, category }`. Les trois candidats étaient donc
 * toujours `undefined`, il ne restait que `category` — nulle sur un type qui ne
 * déclare pas `bcpg:docTypeCategory` — et la fonction renvoyait **toujours
 * `false`**, sur n'importe quelle instance et quel que soit le nom du type.
 *
 * Mesuré sur dev.becpg.fr le 11/08 : le type « Fiche technique fournisseur »
 * **est** configuré (lié à `bcpg:rawMaterial`), l'exigence **est** matérialisée
 * sur `MP96896` en `ToValidate`, et son `bcpg:documentTypeRef` porte bien
 * `bcpg:charactName = "Fiche technique fournisseur"` — que `assocRef()` range
 * dans `label`. Le fournisseur lisait pourtant « Aucun type "fiche technique"
 * configuré », c'est-à-dire une affirmation sur son référentiel qui était fausse.
 *
 * `label` est donc consulté en premier. Les trois autres restent, car ils ne
 * coûtent rien et qu'un appelant qui construirait l'exigence autrement ne doit
 * pas retomber dans le même silence.
 *
 * @param {Object} requirement une exigence de `GET /api/v1/documents/requirements`
 * @returns {boolean}
 */
export function isTechnicalSheet(requirement) {
    if (!requirement || typeof requirement !== 'object') {
        return false;
    }
    const type = requirement.type || {};
    const candidates = [type.label, type.name, type.code, type.title, type.category, requirement.category]
        .map(normalize)
        .filter(Boolean);
    if (candidates.length === 0) {
        return false;
    }
    const patterns = technicalSheetPatterns();
    return candidates.some((candidate) =>
        patterns.some((pattern) => candidate.includes(pattern)));
}
