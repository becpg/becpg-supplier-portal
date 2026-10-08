/**
 * The rows behind a repeating field (`FieldRenderer`'s add/remove list).
 *
 * The list keeps its own rows, each with a stable id, because the value it
 * emits drops the empty entries: deriving the rows from that value made an
 * entry cleared mid-edit vanish, and the next one slide into the focused
 * input. Kept free of React so the rules can be tested on their own.
 */

/**
 * Whether an entry holds nothing.
 *
 * @param {*} entry
 * @returns {boolean}
 */
function isEmptyEntry(entry) {
    return entry === null || entry === undefined || entry === '';
}

/**
 * The value to emit: the entries in order, empty ones left out.
 *
 * @param {Array<{id: string, value: *}>} rows
 * @returns {Array<*>}
 */
export function compactEntries(rows) {
    return rows.map((row) => row.value).filter((entry) => !isEmptyEntry(entry));
}

/**
 * Rows for a list of entries; one empty row when there is none, so the field
 * always offers an input.
 *
 * @param {Array<*>} entries
 * @param {() => string} makeId
 * @returns {Array<{id: string, value: *}>}
 */
export function seedRows(entries, makeId) {
    const values = entries.length > 0 ? entries : [null];
    return values.map((value) => ({ id: makeId(), value }));
}

/**
 * Compares two entry lists by content.
 *
 * @param {Array<*>} left
 * @param {Array<*>} right
 * @returns {boolean}
 */
function sameEntries(left, right) {
    try {
        return JSON.stringify(left) === JSON.stringify(right);
    }
    catch {
        return false;
    }
}

/**
 * The rows to show for the value the form holds.
 *
 * When the value is what these rows emit, they are kept as they are, empty
 * rows and ids included: that is the field's own round trip. Anything else
 * is a change from outside (a reload, an applied suggestion) and reseeds.
 *
 * @param {Array<{id: string, value: *}>} rows
 * @param {Array<*>} entries the value the form holds, as a list
 * @param {() => string} makeId
 * @returns {Array<{id: string, value: *}>} `rows` itself when nothing changed
 */
export function reconcileRows(rows, entries, makeId) {
    const own = entries.filter((entry) => !isEmptyEntry(entry));
    return sameEntries(compactEntries(rows), own) ? rows : seedRows(own, makeId);
}

/**
 * Rows with one entry replaced.
 *
 * @param {Array<{id: string, value: *}>} rows
 * @param {string} id
 * @param {*} value
 * @returns {Array<{id: string, value: *}>}
 */
export function replaceRow(rows, id, value) {
    return rows.map((row) => (row.id === id ? { ...row, value } : row));
}
