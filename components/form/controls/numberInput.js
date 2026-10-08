/**
 * How `NumberControl` reads what is typed, kept apart from the component so
 * the decisions can be tested without rendering anything.
 */

/**
 * The editable text of a value.
 *
 * @param {*} value a number, a numeric string, or a `{ value }` cell
 * @returns {string}
 */
export function toText(value) {
    if (value === null || value === undefined || value === '') {
        return '';
    }
    if (typeof value === 'object' && 'value' in value) {
        return toText(value.value);
    }
    return String(value);
}

/**
 * The typed text in the shape `Number()` reads: no spaces (thousand
 * separators), a decimal point instead of the decimal comma.
 *
 * @param {string} text
 * @returns {string}
 */
function normalise(text) {
    return String(text ?? '').replace(/\s/g, '').replace(',', '.');
}

/** What a number looks like half-typed: `-`, `12`, `12.`, `.`. */
const NUMBER_PREFIX = /^-?\d*\.?$/;

/**
 * Parses what the user typed. Accepts the decimal comma and spaces used as
 * thousand separators.
 *
 * @param {string} text
 * @returns {{number: number|null, partial: boolean}} `partial` = "not a number *yet*"
 */
export function parseTyped(text) {
    const raw = normalise(text);
    if (raw === '') {
        return { number: null, partial: false };
    }
    if (raw === '-' || raw === '.' || raw === '-.' || raw.endsWith('.')) {
        return { number: null, partial: true };
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? { number: parsed, partial: false } : { number: null, partial: true };
}

/**
 * Whether the text can no longer become a number by typing more: `abc`,
 * `1.2.`, `12a`. `-` or `12,` are on their way to one and are not flagged.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function isUnparsable(text) {
    const raw = normalise(text);
    if (raw === '' || NUMBER_PREFIX.test(raw)) {
        return false;
    }
    return !Number.isFinite(Number(raw));
}

/**
 * What leaving the field does with the text in it.
 *
 * Only an empty text clears the value. A text that is not a number keeps the
 * value the field had and shows it again: emitting `null` there erased a
 * stored number the supplier never meant to delete, and the cell showed a
 * blank the repository did not hold.
 *
 * @param {string} text what is in the input
 * @param {*} value the value the field currently holds
 * @returns {{draft: string, value: *, emit: boolean}} the text to show, the
 *          value it stands for, and whether that value must be emitted
 */
export function resolveOnBlur(text, value) {
    const raw = normalise(text);
    if (raw === '') {
        return { draft: '', value: null, emit: toText(value) !== '' };
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
        return { draft: toText(value), value, emit: false };
    }
    return { draft: toText(parsed), value: parsed, emit: parsed !== value };
}
