'use client';

/**
 * `checkbox.ftl` / `boolean.ftl`, and the fallback for `d:boolean`.
 *
 * A checkbox has two states; a beCPG boolean property has **three** — true,
 * false, and never answered. That distinction matters in a supplier
 * questionnaire, where "no" and "not answered yet" are not the same thing at
 * all, and where a mandatory boolean that nobody ticked must be reported as
 * missing rather than silently read as `false`.
 *
 * So a mandatory boolean renders as an explicit yes/no pair (nothing is
 * preselected until the supplier answers), and an optional one renders as a
 * plain checkbox where unticked legitimately means `false`.
 *
 * **Unless the model already answers it.** A column whose `<default>` is
 * declared is never unanswered: the repository writes that default at creation,
 * so unticked really does mean `false` and the three-state pair would force an
 * answer to a question already settled — which is what turned four ingredient
 * flags (OGM, ionisation, processing aid, carrier) into four mandatory choices
 * instead of boxes to tick only when true.
 *
 * `onChange` emits a real boolean, or `null` when the field was never answered.
 */

import { Checkbox } from '@/components/ui/Field';
import { ReadOnlyControl } from '@/components/form/controls/ReadOnlyControl';

const LABELS = {
    fr: { yes: 'Oui', no: 'Non' },
    en: { yes: 'Yes', no: 'No' },
};

/**
 * @param {*} value
 * @returns {boolean|null}
 */
export function toBoolean(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'object' && 'value' in value) {
        return toBoolean(value.value);
    }
    const text = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'oui'].includes(text)) {
        return true;
    }
    if (['false', '0', 'no', 'non'].includes(text)) {
        return false;
    }
    return null;
}

/**
 * @param {import('./index').ControlProps} props
 */
export function BooleanControl({
    field,
    value,
    displayValue,
    onChange,
    readOnly = false,
    error,
    id,
    lang = 'fr',
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
    const labels = LABELS[lang] || LABELS.fr;
    const checked = toBoolean(value);
    const isInvalid = Boolean(error) || invalid;

    if (readOnly) {
        return <ReadOnlyControl field={field} value={value} displayValue={displayValue} lang={lang} id={id} />;
    }

    // A boolean the model already answers is not an unanswered question.
    const answeredByModel = field?.defaultValue !== null && field?.defaultValue !== undefined;
    if (field?.mandatory && !answeredByModel) {
        const name = `${id || field.id}-choice`;
        return (
            <div
                id={id}
                role="radiogroup"
                aria-label={field.label}
                className={[
                    'flex gap-2',
                    isInvalid ? 'rounded-lg ring-1 ring-[var(--status-danger)]' : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
                {...rest}
            >
                {[
                    { key: 'yes', label: labels.yes, state: true },
                    { key: 'no', label: labels.no, state: false },
                ].map((option) => (
                    <label
                        key={option.key}
                        className={[
                            'flex min-h-[40px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-sm transition-colors',
                            checked === option.state
                                ? 'border-[var(--becpg-blue)] bg-[var(--becpg-blue)] text-white'
                                : 'border-[var(--becpg-grey)] bg-white text-[var(--becpg-blue)] hover:bg-[var(--becpg-blue-lighter)]/40',
                        ].join(' ')}
                    >
                        <input
                            type="radio"
                            name={name}
                            className="sr-only-text"
                            checked={checked === option.state}
                            onChange={() => onChange(option.state)}
                        />
                        {option.label}
                    </label>
                ))}
            </div>
        );
    }

    return (
        <Checkbox
            id={id}
            checked={checked === true}
            onChange={(event) => onChange(event.target.checked)}
            label={checked === true ? labels.yes : labels.no}
            {...rest}
        />
    );
}
