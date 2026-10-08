/**
 * The values a native `<input type="date">` / `datetime-local` shows, kept
 * apart from `DateControl` so they can be tested without rendering anything.
 */

import { toDate } from '@/lib/format';

/** A bare day, `2026-07-29`: what a `d:date` holds, with no time zone. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Length of `YYYY-MM-DD`. */
const DAY_LENGTH = 10;

/**
 * The value under a `{ value, displayValue }` cell, or the value itself.
 *
 * @param {*} value
 * @returns {*}
 */
function unwrap(value) {
    if (value && typeof value === 'object' && !(value instanceof Date) && 'value' in value) {
        return unwrap(value.value);
    }
    return value;
}

/**
 * Two digits, zero padded.
 *
 * @param {number} number
 * @returns {string}
 */
function pad(number) {
    return String(number).padStart(2, '0');
}

/**
 * `2026-07-29`, for `<input type="date">`.
 *
 * A bare day is taken as it is written. Parsed, it would be UTC midnight, and
 * read back with local getters it lands on the previous day for every
 * supplier west of Greenwich. Anything else is a moment, shown on the
 * browser's own calendar.
 *
 * @param {*} value anything `toDate` accepts, or a `{ value }` cell
 * @returns {string} the input value, `''` when there is none
 */
export function toDateInputValue(value) {
    const raw = unwrap(value);
    if (typeof raw === 'string' && DATE_ONLY.test(raw.trim())) {
        return raw.trim().slice(0, DAY_LENGTH);
    }
    const date = toDate(raw);
    if (!date) {
        return '';
    }
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * `2026-07-29T14:30`, for `<input type="datetime-local">`, on the browser's
 * own clock.
 *
 * @param {*} value anything `toDate` accepts, or a `{ value }` cell
 * @returns {string} the input value, `''` when there is none
 */
export function toDateTimeInputValue(value) {
    const date = toDate(unwrap(value));
    if (!date) {
        return '';
    }
    const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
