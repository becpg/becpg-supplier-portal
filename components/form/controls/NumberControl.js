'use client';

/**
 * `number.ftl` / `number-float.ftl`, and the fallback for `d:int`, `d:long`,
 * `d:double`, `d:float`.
 *
 * Three decisions worth stating:
 *
 *  1. **`inputMode="decimal"`, not `type="number"`.** A native number input
 *     silently swallows what it cannot parse, scrolls its value on a trackpad,
 *     and — the reason that matters here — refuses the decimal comma a French
 *     supplier types on their phone keypad. So the field is a text input with a
 *     numeric keypad, and the parsing is ours.
 *  2. **The typed text is kept while the value is emitted.** `"1,"` and `"-"`
 *     are legitimate intermediate states; re-rendering them from the parsed
 *     number would delete the character the user just typed. The draft is only
 *     resynchronised when the value changes from the *outside* (autosave
 *     reload, AI suggestion applied).
 *  3. `onChange` emits a **number**, or `null` when the field is cleared —
 *     never `NaN`, never the raw string. `lib/adapters/forms.js` turns `null`
 *     into the empty string the form processor uses to clear a property.
 *
 * Bounds come from the `MINMAX` constraint and the number of decimals from
 * {@link import('../validation').numberFormat} (see there for the `help` blob).
 */

import { useState } from 'react';
import { Input } from '@/components/ui/Field';
import { bounds, controlParams, numberFormat } from '@/components/form/validation';
import { ReadOnlyControl } from '@/components/form/controls/ReadOnlyControl';
import { isUnparsable, parseTyped, resolveOnBlur, toText } from '@/components/form/controls/numberInput';

export { parseTyped };

/**
 * @param {import('./index').ControlProps & {suffix?: React.ReactNode}} props
 */
export function NumberControl({
    field,
    value,
    displayValue,
    onChange,
    readOnly = false,
    error,
    id,
    lang,
    suffix,
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
    // The draft the user is typing, paired with the value it stands for. As long
    // as the incoming value is the one we last emitted, the draft is kept — that
    // is our own round trip. Anything else is an outside change (autosave
    // reload, AI suggestion applied) and rewrites the draft.
    const [local, setLocal] = useState(() => ({ draft: toText(value), value }));
    if (value !== local.value) {
        setLocal({ draft: toText(value), value });
    }
    const draft = value === local.value ? local.draft : toText(value);

    if (readOnly) {
        return <ReadOnlyControl field={field} value={value} displayValue={displayValue} lang={lang} id={id} />;
    }

    const params = controlParams(field);
    const { min, max } = bounds(field);
    const { step, integer } = numberFormat(field);

    const handleChange = (text) => {
        const { number, partial } = parseTyped(text);
        if (partial) {
            // Nothing to emit yet: "-" or "1." is not a value, and emitting null
            // here would clear the field under the user's fingers.
            setLocal((previous) => ({ draft: text, value: previous.value }));
            return;
        }
        setLocal({ draft: text, value: number });
        onChange(number);
    };

    return (
        <Input
            id={id}
            type="text"
            inputMode={integer ? 'numeric' : 'decimal'}
            value={draft}
            onChange={(event) => handleChange(event.target.value)}
            onBlur={(event) => {
                // On blur an unfinished draft resolves to the value it means,
                // and a text that means no number gives the previous one back.
                const resolved = resolveOnBlur(event.target.value, value);
                setLocal({ draft: resolved.draft, value: resolved.value });
                if (resolved.emit) {
                    onChange(resolved.value);
                }
            }}
            min={min === null ? undefined : min}
            max={max === null ? undefined : max}
            step={step}
            placeholder={params.placeholder || undefined}
            suffix={suffix}
            invalid={Boolean(error) || invalid || isUnparsable(draft)}
            autoComplete="off"
            {...rest}
        />
    );
}
