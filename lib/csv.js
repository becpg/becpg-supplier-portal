/**
 * CSV serialisation, safe for a spreadsheet: shared by the server exports of the
 * monitoring routes and by the lists that export what they show in the browser.
 *
 * Safe on both sides of the wire.
 */

/**
 * A cell a spreadsheet would run as a formula: `=`, `+`, `-`, `@`, a tab or a
 * carriage return in first position. Supplier names, legal names and document
 * labels are typed by suppliers, so a name like `=HYPERLINK(...)` is an attack on
 * the buyer who opens the export, not a curiosity.
 */
const CSV_FORMULA_TRIGGER = /^[=+\-@\t\r]/;

/**
 * One CSV cell: formula-neutralised with a leading `'` (the OWASP rule), then
 * quoted when it holds a separator, a quote or a line break.
 *
 * @param {*} value
 * @returns {string}
 */
export function csvCell(value) {
    if (value === null || value === undefined) {
        return '';
    }
    const raw = value instanceof Date ? value.toISOString() : String(value);
    // Only text can smuggle a formula; a negative number stays a number.
    const text = typeof value === 'string' && CSV_FORMULA_TRIGGER.test(raw) ? `'${raw}` : raw;
    return /["\n\r]|,|;|\t/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Serialises rows as RFC 4180 CSV, with a UTF-8 BOM so Excel opens accented
 * labels correctly without an import dialog. Every cell goes through
 * {@link csvCell}, so no value can run as a formula.
 *
 * @param {Array<{key: string, label: string, get?: (row: Object) => *}>} columns
 * @param {Object[]} rows
 * @param {Object} [options] `{ separator = ',' , bom = true }`
 * @returns {string}
 *
 * @example
 * toCsv([{ key: 'name', label: 'Fournisseur' }], [{ name: 'Bio Ingredients' }]);
 */
export function toCsv(columns, rows, options = {}) {
    const separator = options.separator || ',';
    const escape = csvCell;

    const lines = [columns.map((column) => escape(column.label)).join(separator)];
    for (const row of rows) {
        lines.push(columns
            .map((column) => escape(column.get ? column.get(row) : row[column.key]))
            .join(separator));
    }
    return `${options.bom === false ? '' : '﻿'}${lines.join('\r\n')}\r\n`;
}
