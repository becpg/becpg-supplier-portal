/**
 * Pasting a block of cells from a spreadsheet into the grid.
 *
 * ## Why this exists
 *
 * A supplier does not compose a nutrient list in a browser. It already exists,
 * in Excel, and the portal's job is to accept it — not to make someone retype
 * forty rows into forty tab stops. This module is the honest half of that: it
 * turns the clipboard into a plan, and the plan says **exactly** what it will
 * write and exactly what it could not.
 *
 * ## The one rule
 *
 * **Nothing is ever silently dropped.** A value the grid cannot map is not
 * discarded, not coerced to something plausible and not written as text into a
 * numeric column: it is returned in `unmatched`, with the row, the column and
 * the text verbatim, so the caller can show it. The same goes for columns the
 * paste has and the grid has not, and for rows beyond what the list may create.
 *
 * That is also why coercion is deliberately strict. `"1,5"` is 1.5 because a
 * French spreadsheet writes it that way; `"environ 2"` is **not** 2. A grid that
 * guesses is a grid that files a wrong nutrition value under a supplier's name.
 *
 * ## What it does not do
 *
 * It never touches the network and never touches React. Association columns are
 * planned as `pending` — the label has to be resolved against the field's own
 * datasource, which only the caller can do — and everything else is decided
 * here, synchronously, from the column the server described.
 *
 * @module components/datalist/paste
 */

import { listOptions } from '@/components/form/validation';

/** How a single pasted cell ended up. */
export const CELL = Object.freeze({
    /** Coerced; `value` is what will be written. */
    OK: 'ok',
    /** The source cell was blank — left alone rather than written as empty. */
    EMPTY: 'empty',
    /** Needs the field's datasource; the caller resolves it. */
    PENDING: 'pending',
    /** Could not be turned into a value of this column's type. */
    UNMATCHED: 'unmatched',
    /** The column exists but is not writable here (computed, locked, frozen). */
    READONLY: 'readonly',
});

/**
 * Splits clipboard text into a rectangle of cells.
 *
 * Excel, LibreOffice and Google Sheets all put TSV on the clipboard as
 * `text/plain`, and all three quote a cell that contains a tab, a newline or a
 * quote — doubling the quote inside. This is a TSV reader for exactly that
 * dialect, written as a scanner because a regexp cannot see quoting.
 *
 * A single cell with no tab and no newline returns `null`: that is an ordinary
 * paste into an ordinary input and the browser does it better than we would.
 *
 * @param {string} text raw `text/plain` from the clipboard
 * @returns {string[][]|null} rows of cells, or null when this is not a block
 */
export function parseClipboardTable(text) {
    const source = typeof text === 'string' ? text : '';
    if (!source || (!source.includes('\t') && !/\r?\n/.test(source.trim()))) {
        return null;
    }

    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    let index = 0;

    while (index < source.length) {
        const char = source[index];

        if (quoted) {
            if (char === '"') {
                if (source[index + 1] === '"') {
                    cell += '"';
                    index += 2;
                    continue;
                }
                quoted = false;
                index += 1;
                continue;
            }
            cell += char;
            index += 1;
            continue;
        }

        if (char === '"' && cell === '') {
            quoted = true;
            index += 1;
            continue;
        }
        if (char === '\t') {
            row.push(cell);
            cell = '';
            index += 1;
            continue;
        }
        if (char === '\n' || char === '\r') {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
            index += char === '\r' && source[index + 1] === '\n' ? 2 : 1;
            continue;
        }
        cell += char;
        index += 1;
    }
    row.push(cell);
    rows.push(row);

    // A trailing newline is a line terminator, not an empty row.
    while (rows.length > 0 && rows[rows.length - 1].every((entry) => entry === '')) {
        rows.pop();
    }
    if (rows.length === 0) {
        return null;
    }
    // One cell, no structure: not our business.
    if (rows.length === 1 && rows[0].length === 1) {
        return null;
    }
    return rows;
}

/**
 * Comparable form of a label: case, accents and surrounding space removed.
 *
 * Used to match a pasted word against a constraint's allowed values and against
 * a datasource result. Matching is **exact** on this form and on nothing looser
 * — no prefix, no edit distance.
 *
 * @param {*} value
 * @returns {string}
 */
export function normalizeLabel(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

/**
 * Digits grouped by three after a comma, with no leading zero: a thousands
 * separator or a decimal one. `0,125` is not in it, no one groups thousands
 * after a zero.
 */
const THOUSANDS_OR_DECIMAL_COMMA = /^[+-]?[1-9]\d{0,2}(,\d{3})+$/;

/**
 * A number as a spreadsheet writes it.
 *
 * Accepts `1234.56`, `1 234,56` (with a plain or a narrow no-break space),
 * `1,234.56`, a leading sign and a trailing `%` or unit-less spaces. Returns
 * `null` for anything else — including `"~2"`, `"< 0,1"` and `"n/a"`, which
 * carry a meaning this grid must not invent a number for, and `"1,234"`,
 * which reads as two different numbers depending on who typed it.
 *
 * @param {string} text
 * @returns {number|null}
 */
export function parseDecimal(text) {
    let value = String(text ?? '').trim();
    if (value === '') {
        return null;
    }
    // A trailing percent sign is a unit, not a division: the column already is
    // "% AR par portion". Dividing by 100 here would silently change the value.
    value = value.replace(/%$/, '').trim();
    // Thousands separators: spaces of every kind, and a comma when a dot is
    // also present (the anglo-saxon `1,234.56`).
    value = value.replace(/[\s\u00a0\u202f\u2009']/g, '');
    if (value.includes(',') && value.includes('.')) {
        value = value.lastIndexOf(',') > value.lastIndexOf('.')
            ? value.replace(/\./g, '').replace(',', '.')
            : value.replace(/,/g, '');
    }
    else if (THOUSANDS_OR_DECIMAL_COMMA.test(value)) {
        // `1,234` is 1234 in an English sheet and 1.234 in a French one, and
        // nothing in the cell says which: refused rather than guessed.
        return null;
    }
    else {
        value = value.replace(',', '.');
    }
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(value)) {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

/** Words a spreadsheet uses for yes and no, in the two portal languages. */
const TRUE_WORDS = new Set(['1', 'x', 'true', 'vrai', 'oui', 'yes', 'o', 'y', 'v']);
const FALSE_WORDS = new Set(['0', 'false', 'faux', 'non', 'no', 'n', 'f']);

/**
 * @param {string} text
 * @returns {boolean|null}
 */
export function parseBooleanText(text) {
    const key = normalizeLabel(text);
    if (key === '') {
        return null;
    }
    if (TRUE_WORDS.has(key)) {
        return true;
    }
    if (FALSE_WORDS.has(key)) {
        return false;
    }
    return null;
}

/**
 * `31/12/2025`, `2025-12-31`, `31-12-2025`. A two-digit year is refused rather
 * than guessed — 1931 and 2031 are both plausible and only one is right.
 *
 * @param {string} text
 * @returns {string|null} ISO `YYYY-MM-DD`
 */
export function parseDateText(text) {
    const value = String(text ?? '').trim();
    if (value === '') {
        return null;
    }
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(value);
    if (iso) {
        return `${iso[1]}-${iso[2]}-${iso[3]}`;
    }
    const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value);
    if (dmy) {
        const day = Number(dmy[1]);
        const month = Number(dmy[2]);
        if (day < 1 || day > 31 || month < 1 || month > 12) {
            return null;
        }
        return `${dmy[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
}

/** Data types this module treats as numeric. */
const NUMERIC = new Set(['d:int', 'd:long', 'd:float', 'd:double']);

/**
 * Turns one pasted string into a value for one column.
 *
 * @param {Object} column the normalised column (`lib/adapters/datalists.js`)
 * @param {string} text the pasted cell, verbatim
 * @returns {{status: string, value?: *, reason?: string}}
 */
export function coerceCell(column, text) {
    const raw = String(text ?? '');
    if (raw.trim() === '') {
        return { status: CELL.EMPTY };
    }

    if (column.type === 'association') {
        // Only the datasource can turn « Lipides » into a nodeRef.
        return { status: CELL.PENDING, value: raw.trim() };
    }

    const control = column.control?.name || '';

    if (column.dataType === 'd:boolean' || control === 'checkbox') {
        const parsed = parseBooleanText(raw);
        return parsed === null
            ? { status: CELL.UNMATCHED, reason: 'boolean' }
            : { status: CELL.OK, value: parsed };
    }

    if (NUMERIC.has(column.dataType)) {
        const parsed = parseDecimal(raw);
        if (parsed === null) {
            return { status: CELL.UNMATCHED, reason: 'number' };
        }
        if ((column.dataType === 'd:int' || column.dataType === 'd:long') && !Number.isInteger(parsed)) {
            return { status: CELL.UNMATCHED, reason: 'integer' };
        }
        return { status: CELL.OK, value: parsed };
    }

    if (column.dataType === 'd:date' || column.dataType === 'd:datetime') {
        const parsed = parseDateText(raw);
        return parsed === null
            ? { status: CELL.UNMATCHED, reason: 'date' }
            : { status: CELL.OK, value: parsed };
    }

    // A closed list — a `LIST` constraint or an `options` control parameter.
    // The pasted word must be one of them, by value or by label; a value that is
    // not in the list is refused, because saving it would either be rejected by
    // the repository or quietly stored as an off-list answer.
    const options = listOptions(column);
    if (options.length > 0) {
        const key = normalizeLabel(raw);
        const hit = options.find(
            (option) => normalizeLabel(option.value) === key || normalizeLabel(option.label) === key,
        );
        return hit
            ? { status: CELL.OK, value: hit.value }
            : { status: CELL.UNMATCHED, reason: 'list' };
    }

    return { status: CELL.OK, value: raw.trim() };
}

/**
 * Plans a paste without performing it.
 *
 * The plan is deliberately a *description*: the caller applies it, and can show
 * it first. Nothing here mutates anything.
 *
 * ## Mapping
 *
 * Columns are taken **from the anchor cell rightwards**, in the grid's own
 * order, skipping the ones this row may not write (computed, protected,
 * nested). Rows are taken from the anchor row downwards; rows past the end of
 * the list become new lines when the list allows creating them, and are
 * reported as refused when it does not.
 *
 * @param {Object} options
 * @param {string[][]} options.block clipboard rectangle
 * @param {Object[]} options.columns flat columns, in grid order
 * @param {number} options.startColumn index into `columns` of the anchor cell
 * @param {Object[]} options.rows the rows on screen, in display order
 * @param {number} options.startRow index into `rows` of the anchor cell
 * @param {(row: Object, column: Object) => boolean} options.isCellEditable
 * @param {boolean} options.canCreate
 * @returns {{
 *   targets: Array<{rowIndex: number, row: Object|null, values: Object, pending: Array<Object>}>,
 *   unmatched: Array<{line: number, column: string, text: string, reason: string}>,
 *   extraColumns: number,
 *   refusedRows: number,
 *   created: number,
 *   cells: number
 * }}
 */
export function planPaste({
    block,
    columns,
    startColumn,
    rows,
    startRow,
    isCellEditable,
    canCreate,
}) {
    const unmatched = [];
    const targets = [];
    let extraColumns = 0;
    let refusedRows = 0;
    let created = 0;
    let cells = 0;

    const width = Math.max(...block.map((line) => line.length));
    // The columns the paste can land in, in order, starting at the anchor.
    const lane = [];
    for (let index = startColumn; index < columns.length && lane.length < width; index += 1) {
        lane.push(columns[index]);
    }
    extraColumns = Math.max(0, width - lane.length);

    block.forEach((line, offset) => {
        const rowIndex = startRow + offset;
        const row = rowIndex < rows.length ? rows[rowIndex] : null;
        if (!row && !canCreate) {
            refusedRows += 1;
            return;
        }
        if (!row) {
            created += 1;
        }

        const values = {};
        const pending = [];
        lane.forEach((column, position) => {
            const text = line[position];
            if (text === undefined) {
                return;
            }
            // A draft has no server permissions yet; `isCellEditable` answers for
            // the row it is given, and for a new line the caller passes null.
            const writable = row ? isCellEditable(row, column) : !column.readOnly && !column.protectedField;
            if (!writable) {
                if (String(text).trim() !== '') {
                    unmatched.push({
                        line: offset + 1,
                        column: column.label,
                        text: String(text),
                        reason: CELL.READONLY,
                    });
                }
                return;
            }
            const outcome = coerceCell(column, text);
            if (outcome.status === CELL.EMPTY) {
                return;
            }
            if (outcome.status === CELL.UNMATCHED) {
                unmatched.push({
                    line: offset + 1,
                    column: column.label,
                    text: String(text),
                    reason: outcome.reason,
                });
                return;
            }
            if (outcome.status === CELL.PENDING) {
                pending.push({ column, text: outcome.value, line: offset + 1 });
                return;
            }
            values[column.name] = outcome.value;
            cells += 1;
        });

        if (Object.keys(values).length > 0 || pending.length > 0) {
            targets.push({ rowIndex, row, values, pending });
        }
        else if (!row) {
            // An entirely unusable new line must not create an empty draft.
            created -= 1;
        }
    });

    return { targets, unmatched, extraColumns, refusedRows, created, cells };
}
