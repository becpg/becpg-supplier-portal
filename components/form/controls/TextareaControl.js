'use client';

/**
 * `textarea.ftl` — multi-line text.
 *
 * Control parameters honoured:
 *
 * | Parameter | Effect |
 * |---|---|
 * | `rows` | initial height, in rows (default 3, clamped to 2..20) |
 * | `columns` | ignored — the portal is fluid, the field always fills its column |
 * | `activateLinks` | in read-only, URLs become links (`ReadOnlyControl`) |
 * | `maxLength`, `placeholder` | as for a text field |
 *
 * A textarea always spans the full width of the form grid: two half-width
 * paragraphs side by side are unreadable, on a phone as on a desktop.
 */

import { Textarea } from '@/components/ui/Field';
import { controlParams, lengthBounds, toNumber } from '@/components/form/validation';
import { ReadOnlyControl } from '@/components/form/controls/ReadOnlyControl';

/** Bounds on the configured row count — a 60-row textarea helps nobody. */
const MIN_ROWS = 2;
const MAX_ROWS = 20;

/**
 * @param {import('./index').ControlProps} props
 */
export function TextareaControl({
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
    const configured = toNumber(params.rows);
    const rows = configured === null ? 3 : Math.max(MIN_ROWS, Math.min(MAX_ROWS, Math.round(configured)));
    const maxLength = lengthBounds(field).max;

    return (
        <Textarea
            id={id}
            rows={rows}
            value={value === null || value === undefined ? '' : String(value)}
            onChange={(event) => onChange(event.target.value)}
            maxLength={maxLength === null ? undefined : maxLength}
            placeholder={params.placeholder || undefined}
            invalid={Boolean(error) || invalid}
            {...rest}
        />
    );
}

TextareaControl.fullWidth = true;
