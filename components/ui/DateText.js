/**
 * A date, written the same way on every screen: the chrome language's short
 * format, tabular figures so a column of dates lines up digit under digit, and
 * a `<time>` element carrying the machine-readable value.
 *
 * Safe on both sides of the wire.
 */

import { formatDate, formatDateTime, toDate } from '@/lib/format';

/**
 * @param {Object} props
 * @param {string|number|Date|null} props.value
 * @param {string} props.lang
 * @param {boolean} [props.withTime] adds the hour, for messages and history
 * @param {string} [props.className]
 * @returns {JSX.Element} the date, or a dash when there is none
 */
export function DateText({ value, lang, withTime = false, className = '' }) {
    const date = toDate(value);
    const text = withTime ? formatDateTime(value, lang) : formatDate(value, lang);
    if (!date) {
        return <span className={`text-[var(--becpg-dark-grey)] ${className}`.trim()}>{text}</span>;
    }
    return (
        <time dateTime={date.toISOString()} className={`whitespace-nowrap tabular-nums ${className}`.trim()}>
            {text}
        </time>
    );
}
