'use client';

/**
 * `textfield.ftl` — a single line of text.
 *
 * The plainest control of the registry, and therefore the one that documents the
 * shared props contract best (see `controls/index.js`): it reads only what the
 * definition gives it, forwards every extra prop to the `<input>` so `Field` can
 * wire `aria-describedby` / `aria-invalid` onto it, and calls `onChange` with a
 * plain string — never with an event.
 *
 * Control parameters honoured: `maxLength`, `size`, `placeholder`, `styleClass`.
 * `size` is a *character* count in Alfresco; it is mapped onto the input's
 * `size` attribute only above `sm`, because on a phone every field is full width
 * whatever the configuration says (mobile-first, spec §4.3).
 */

import { Input } from '@/components/ui/Field';
import { controlParams, lengthBounds } from '@/components/form/validation';
import { ReadOnlyControl } from '@/components/form/controls/ReadOnlyControl';

/**
 * @param {import('./index').ControlProps} props
 */
export function TextControl({
    field,
    value,
    displayValue,
    onChange,
    readOnly = false,
    error,
    id,
    lang,
    type = 'text',
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
    const maxLength = lengthBounds(field).max;

    return (
        <Input
            id={id}
            type={type}
            value={value === null || value === undefined ? '' : String(value)}
            onChange={(event) => onChange(event.target.value)}
            maxLength={maxLength === null ? undefined : maxLength}
            placeholder={params.placeholder || undefined}
            invalid={Boolean(error) || invalid}
            className={params.styleClass || ''}
            autoComplete="off"
            {...rest}
        />
    );
}
