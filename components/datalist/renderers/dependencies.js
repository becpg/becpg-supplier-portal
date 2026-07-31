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
    'bcpg:ingListIng': ['bcpg:depthLevel'],
    'bcpg:allergenListAllergen': ['bcpg:depthLevel'],
    'survey:questionLabel': ['bcpg:depthLevel'],
    'survey:slQuestion': ['bcpg:depthLevel'],
});

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
    for (const column of columns || []) {
        if (column?.name) {
            shown.add(toRequestField(column.name));
        }
    }
    const extra = [];
    const seen = new Set();
    for (const column of columns || []) {
        for (const name of COMPANION_FIELDS[column?.name] || []) {
            const field = toRequestField(name);
            if (!shown.has(field) && !seen.has(field)) {
                seen.add(field);
                extra.push(field);
            }
        }
    }
    return extra;
}
