'use client';

/**
 * `date.ftl`, and the fallback for `d:date` / `d:datetime`.
 *
 * The native picker is used on purpose. A hand-written calendar is one of the
 * most expensive components to make accessible and one of the worst on a phone,
 * while `<input type="date">` gives the OS picker, the OS locale, the OS
 * keyboard and full keyboard support for free — and the portal must be usable on
 * a 360px screen (spec §4.3).
 *
 * Value in, value out:
 *
 * | Direction | Shape |
 * |---|---|
 * | in | anything `new Date()` accepts: ISO 8601, `2026-07-29`, an epoch number |
 * | out (`d:date`) | `YYYY-MM-DD` — a day has no time zone, and adding one is how a date lands on the day before |
 * | out (`d:datetime`) | full ISO 8601, `toISOString()` |
 *
 * `showTime` in the control parameters switches to `datetime-local`; a
 * `d:datetime` data type implies it.
 */

import { Input } from '@/components/ui/Field';
import { controlParams } from '@/components/form/validation';
import { ReadOnlyControl } from '@/components/form/controls/ReadOnlyControl';

/**
 * @param {*} value
 * @returns {Date|null}
 */
function toDate(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'object' && 'value' in value) {
        return toDate(value.value);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/** `2026-07-29`, in the browser's own time zone. */
function toDateInput(date) {
    if (!date) {
        return '';
    }
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

/** `2026-07-29T14:30`, in the browser's own time zone. */
function toDateTimeInput(date) {
    if (!date) {
        return '';
    }
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${toDateInput(date)}T${hours}:${minutes}`;
}

/**
 * @param {import('./index').ControlProps} props
 */
export function DateControl({
    field,
    value,
    displayValue,
    onChange,
    readOnly = false,
    error,
    id,
    lang,
    invalid = false,
    // Context props of the contract: never DOM attributes, so they are
    // consumed here rather than forwarded with `...rest`.
    values,
    formId,
    itemType,
    listId,
    entityNodeRef,
    ...rest
}) {
    if (readOnly) {
        return <ReadOnlyControl field={field} value={value} displayValue={displayValue} lang={lang} id={id} />;
    }

    const params = controlParams(field);
    const withTime =
        field?.dataType === 'd:datetime' || params.showTime === true || params.showTime === 'true';
    const date = toDate(value);

    const handleChange = (text) => {
        if (!text) {
            onChange(null);
            return;
        }
        const parsed = new Date(text);
        if (Number.isNaN(parsed.getTime())) {
            return;
        }
        // A day is a day: `2026-07-29` must not become `2026-07-28T22:00:00Z`
        // for a supplier east of Greenwich.
        onChange(withTime ? parsed.toISOString() : text);
    };

    return (
        <Input
            id={id}
            type={withTime ? 'datetime-local' : 'date'}
            value={withTime ? toDateTimeInput(date) : toDateInput(date)}
            onChange={(event) => handleChange(event.target.value)}
            invalid={Boolean(error) || invalid}
            {...rest}
        />
    );
}
