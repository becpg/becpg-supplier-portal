/**
 * The properties a renderer needs but never shows — the *companion fields*.
 *
 * ## Why this file has to exist
 *
 * `requestFields()` derives the repository's `fields` list from the columns that
 * survive `finishColumns()`, and `finishColumns()` drops everything beCPG marked
 * `label: "hidden"`. That is right for the grid and wrong for the renderers,
 * because Share's renderers read *sibling* cells of the same row that are
 * deliberately hidden:
 *
 * | shown column | what Share also reads |
 * |---|---|
 * | `bcpg:nutListValue` | `bcpg:nutListUnit`, `bcpg:nutListFormulatedValue` |
 * | `bcpg:nutListMini` / `Maxi` | `bcpg:nutListFormulatedMini` / `…Maxi` |
 * | `bcpg:ingListIng` | `bcpg:depthLevel` (the indent of the ingredient tree) |
 *
 * Measured on the `nutList` step of `bcpg:semiFinishedProduct` « Pâte à choux »:
 * the definition carries 28 fields, 9 survive, and the row payload contains
 * exactly those 9. `prop_bcpg_nutListUnit` and `prop_bcpg_nutListFormulatedValue`
 * were therefore absent — so the *Valeur* column of every formulated product was
 * blank in the portal while Share printed `1 020 kJ/100g`. The value is not on
 * the shown property at all: a formulated nutrient has `nutListValue = null` and
 * carries its number in the hidden `nutListFormulatedValue`.
 *
 * ## Why it is safe to ask for them
 *
 * Verified against 26.1.0 on the list above: the extractor answers off the
 * **content model**, not off the form configuration, so a hidden-but-declared
 * property comes back normally, and a name that does not exist on the item type
 * is *silently ignored* — no error, no key in `itemData`. Probing with a made-up
 * `bcpg_nutListThisIsNotAProperty` returned the other eighteen fields and nothing
 * for it. So the table below cannot break a list whose model lacks one of these
 * properties, and it exposes nothing Share's own datagrid does not already read.
 *
 * ## Why the table lives next to the renderers
 *
 * It is a *renderer* contract, not a datalist one: a companion field is needed
 * because a renderer reads it, and it must stop being requested the day that
 * renderer stops reading it. Keeping the two in one directory is what makes that
 * check a one-file check. The module is deliberately free of React and of any
 * server import so both sides can use it — `lib/adapters/datalists.js` reads it
 * to build the request, `nutrition.js` reads the values back out of the row.
 */

/**
 * The requirements a row breaks, as a nested list: only the columns
 * `signals.js::requirementMessage` reads. The repository's
 * `ReqCtrlListItemExtractor` narrows the list to the row's own characteristic,
 * so each row carries its own requirements and nobody else's.
 */
const REQUIREMENTS = 'bcpg:reqCtrlList|bcpg:rclDataType|bcpg:rclReqMessage|bcpg:rclSourcesV2';

/** The claim a label-claim row points at, for its description only. */
const CLAIM_DESCRIPTION = 'bcpg:lclLabelClaim|cm:description';

/**
 * Companion properties, keyed by the **shown** column's prefixed name.
 *
 * Values are prefixed property names (`bcpg:nutListUnit`), the same spelling as
 * `column.name`; {@link companionFields} converts them to the underscored form
 * the datalist webscript expects.
 *
 * @type {Object.<string, string[]>}
 */
export const COMPANION_FIELDS = Object.freeze({
    // --- nutrients: the manual value, its unit and its formulated sibling ----
    'bcpg:nutListValue': ['bcpg:nutListUnit', 'bcpg:nutListFormulatedValue'],
    'bcpg:nutListMini': ['bcpg:nutListUnit', 'bcpg:nutListFormulatedMini'],
    'bcpg:nutListMaxi': ['bcpg:nutListUnit', 'bcpg:nutListFormulatedMaxi'],
    'bcpg:nutListValuePrepared': ['bcpg:nutListUnit', 'bcpg:nutListUnitPrepared', 'bcpg:nutListFormulatedValuePrepared'],
    'bcpg:nutListValuePerServing': ['bcpg:nutListUnit', 'bcpg:nutListFormulatedValuePerServing'],
    'bcpg:nutListReductionValue': ['bcpg:nutListReductionFormulatedValue'],
    // `ReferenceValue` has no formulated sibling in Share either — only the unit.
    'bcpg:nutListReferenceValue': ['bcpg:nutListUnit'],

    // --- the indent of a multi-level list -----------------------------------
    // Every column Share indents needs `bcpg:depthLevel` alongside it: the level
    // is a hidden column, so without this the renderer is registered, the row
    // arrives, and the hierarchy is silently flat.
    'bcpg:ingListIng': ['bcpg:depthLevel'],
    'bcpg:allergenListAllergen': ['bcpg:depthLevel'],
    'bcpg:compoListProduct': ['bcpg:depthLevel'],
    'bcpg:packagingListProduct': ['bcpg:depthLevel'],
    'bcpg:productListProduct': ['bcpg:depthLevel'],
    'bcpg:nutListSources': ['bcpg:depthLevel'],
    'survey:questionLabel': ['bcpg:depthLevel'],
    'survey:slQuestion': ['bcpg:depthLevel'],
    // The packaging component and supplier packaging lists (#34468) name their
    // component with a text property rather than an association: the part they
    // describe has no entity of its own. The indent is the only thing that says
    // a cap belongs to the bottle above it.
    'pack:pclComponent': ['bcpg:depthLevel'],
    'pack:splComponent': ['bcpg:depthLevel'],
    'bcpg:mblMicrobio': ['bcpg:depthLevel'],
    'bcpg:organoListOrgano': ['bcpg:depthLevel'],
    'bcpg:toxListTox': ['bcpg:depthLevel'],
    'bcpg:svhcListIng': ['bcpg:depthLevel'],

    // --- the warning triangle or the formulated mark of a characteristic -----
    // Share swaps the characteristic's glyph for one of the two by reading the
    // row's formulated flag and the requirements it breaks, both hidden.
    'bcpg:nutListNut': ['bcpg:depthLevel', 'bcpg:nutListIsFormulated', REQUIREMENTS],
    'bcpg:pclPhysicoChem': ['bcpg:depthLevel', 'bcpg:physicoChemIsFormulated', REQUIREMENTS],
    'bcpg:lclLabelClaim': ['bcpg:depthLevel', 'bcpg:lclIsFormulated', REQUIREMENTS, CLAIM_DESCRIPTION],
});

/** How the datalist webscript writes a nested list and the columns it wants of it. */
const NESTED_SEPARATOR = '|';

/**
 * Turns a prefixed property name into the spelling the datalist data webscript
 * expects in its `fields` array — the same rule {@link requestFields} applies.
 *
 * @param {string} name `bcpg:nutListUnit`
 * @returns {string} `bcpg_nutListUnit`
 */
function toRequestField(name) {
    return String(name).replace(/:/g, '_');
}

/**
 * The extra `fields` entries the renderers of these columns need.
 *
 * Never returns a field already covered by a visible column, so the request
 * stays as short as it was before a renderer asked for anything.
 *
 * @param {Object[]} columns normalised columns, already filtered for display
 * @returns {string[]} underscored field names, deduplicated, in a stable order
 *
 * @example
 * companionFields([{ name: 'bcpg:nutListValue' }]);
 * // ['bcpg_nutListUnit', 'bcpg_nutListFormulatedValue']
 */
export function companionFields(columns) {
    const shown = new Set();
    const shownNested = new Set();
    for (const column of columns || []) {
        if (column?.name) {
            const field = toRequestField(column.name);
            shown.add(field);
            if (column.columns?.length > 0) {
                shownNested.add(field);
            }
        }
    }
    const extra = [];
    const seen = new Set();
    for (const column of columns || []) {
        for (const name of COMPANION_FIELDS[column?.name] || []) {
            const field = toRequestField(name);
            if (!isAlreadyRequested(field, shown, shownNested) && !seen.has(field)) {
                seen.add(field);
                extra.push(field);
            }
        }
    }
    return extra;
}

/**
 * Whether a visible column already brings this companion back.
 *
 * A nested companion (`bcpg_reqCtrlList|…`) is answered under the same
 * `dt_bcpg_reqCtrlList` key as a visible nested column of that list, and the
 * second one would overwrite the first with fewer cells; so it gives way to the
 * column. A plain association of the same name is answered under `assoc_…` and
 * does not collide.
 *
 * @param {string} field underscored companion
 * @param {Set<string>} shown every visible column
 * @param {Set<string>} shownNested the visible nested columns
 * @returns {boolean}
 */
function isAlreadyRequested(field, shown, shownNested) {
    const separator = field.indexOf(NESTED_SEPARATOR);
    if (separator < 0) {
        return shown.has(field);
    }
    return shownNested.has(field.slice(0, separator));
}
