/**
 * Recognising the supplier technical sheet among the document requirements
 * (spec §4.4).
 *
 * The technical sheet is the only document the flow asks for before any data
 * entry: every other type is computed from the data —
 * `DocumentFormulationHandler` derives the requirements from the claims, the
 * labels, the product hierarchy — so they do not exist yet when the wizard
 * opens. This one does.
 *
 * It still has to be recognised, and the portal invents no type: it recognises
 * the one the client has configured in its reference data
 * (`bcpg:documentType`). As that label varies from one instance to the next
 * — « Fiche technique », « Fiche technique fournisseur », « Technical data
 * sheet », « TDS » — the recognition is a list of patterns, configurable and
 * shipped with defaults that cover the usual wordings.
 *
 * `PORTAL_TECHNICAL_SHEET_TYPES` accepts labels or codes separated by commas.
 * Once set, it replaces the defaults: an instance that names its type otherwise
 * does not have to suffer our approximations.
 *
 * @example
 * PORTAL_TECHNICAL_SHEET_TYPES="Fiche technique fournisseur,FT-FOURN"
 */

/**
 * The wordings recognised in the absence of configuration.
 *
 * Deliberately short and unaccented: the comparison is made on a normalised
 * form, so « Fiche Technique » and « fiche technique » both land on
 * `fiche technique`.
 */
const DEFAULT_PATTERNS = [
    'fiche technique',
    'technical sheet',
    'technical data sheet',
    'product data sheet',
];

/**
 * Lowercase, unaccented, whitespace normalised — to compare « Fiche Technique »
 * and « fiche technique » without caring how the client typed it.
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
 * The patterns in force.
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
 * Does this document requirement carry the technical sheet?
 *
 * The match is made on the type of the document — its label or its code — and
 * not on the name of the uploaded file: a supplier who calls their PDF
 * « FT_2026_final_v3.pdf » must not decide the classification, and a supplier
 * who calls it « document.pdf » must not be punished for it.
 *
 * The comparison is an `includes` on the normalised form, not an equality:
 * « Fiche technique fournisseur » and « Fiche technique matière première »
 * designate the same thing from the point of view of the flow.
 *
 * The field carrying the label is called `label`
 *
 * This function used to read `type.name` / `type.code` / `type.title`. None of
 * the three exists: the type comes from `assocRef()`
 * (`lib/adapters/documents.js`), which produces
 * `{ nodeRef, label, type, category }`. The three candidates were therefore
 * always `undefined`, only `category` was left — null on a type that does not
 * declare `bcpg:docTypeCategory` — and the function always returned `false`, on
 * any instance whatsoever and whatever the name of the type.
 *
 * Measured on the reference instance on 11/08: the type « Fiche technique fournisseur »
 * is configured (linked to `bcpg:rawMaterial`), the requirement is materialised
 * on `MP96896` as `ToValidate`, and its `bcpg:documentTypeRef` does carry
 * `bcpg:charactName = "Fiche technique fournisseur"` — which `assocRef()` files
 * under `label`. The supplier nevertheless read « Aucun type "fiche technique"
 * configuré », that is, a statement about their reference data that was false.
 *
 * `label` is therefore consulted first. The three others remain, since they cost
 * nothing and a caller that would build the requirement differently must not
 * fall back into the same silence.
 *
 * @param {Object} requirement a requirement from `GET /api/v1/documents/requirements`
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
