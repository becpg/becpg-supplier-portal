/**
 * What kind of column a datalist column is — pure, so the grid, the cards and
 * the tests read it alike.
 */

/** Column types that are not a scalar cell but a nested structure. */
export const NESTED_TYPES = ['dataList', 'entity'];

/**
 * @param {Object} column
 * @returns {boolean} true for a sub-datalist / linked-entity column
 */
export function isNestedColumn(column) {
    return NESTED_TYPES.includes(column?.type) || Array.isArray(column?.columns);
}

/**
 * The column a row describes: its mandatory association — the nutrient of a
 * `nutList` row, the allergen of an `allergenList` row, the claim of a
 * `labelClaimList` row. In every beCPG characteristic list that association is
 * the row's identity, so it is a property of the column the server described,
 * not a name this module knows.
 *
 * @param {Object} column
 * @returns {boolean}
 */
export function isCharacteristicColumn(column) {
    return column?.type === 'association' && Boolean(column.mandatory) && !isNestedColumn(column);
}
