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
 * **And when Share says the field is tri-state, it is.** beCPG overrides
 * Alfresco's `boolean.ftl` with three radios -- Oui / Non / (vide) -- and
 * `allergen-voluntary.ftl` is the same three, so a column the customer
 * configured with either template offers all three here too, as a select. The
 * choice is the customer's, declared per field, not a guess made from
 * `mandatory`: on an allergen row, « non maîtrisé » and « pas encore répondu »
 * are different answers and a checkbox can only tell one of them.
 *
 * The checkbox carries no "Oui" / "Non" text of its own. It used to, and that
 * text flipped with the state — which reads as the label of a button rather
 * than as the answer to a question, and repeats what the field label above it
 * or the column header beside it has already said.
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

import { ReadOnlyControl } from '@/components/form/controls/ReadOnlyControl';
import { isAnsweredByModel } from '@/components/form/validation';

const LABELS = {
    fr: { yes: 'Oui', no: 'Non', empty: '(vide)' },
    en: { yes: 'Yes', no: 'No', empty: '(empty)' },
};

/**
 * Controls whose Share template draws three radios rather than a checkbox.
 * `checkbox.ftl` and the bare `d:boolean` fallback are deliberately absent.
 */
const TRI_STATE_CONTROLS = new Set(['boolean', 'boolean.ftl', 'allergen-voluntary.ftl']);

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

    const answeredByModel = isAnsweredByModel(field);
    const triState = TRI_STATE_CONTROLS.has(field?.control?.name);

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

    /*
     * Three states in one cell, without three buttons.
     *
     * Share draws three radios, which is right on a pop-up form and impossible
     * in a grid the density spec pins to Share's own 33px row. A native select
     * carries the same three answers in one tab stop and one keystroke — which
     * is what the grid's keyboard-first entry asks for — and stays readable at
     * 360px. The empty option is first and really is selectable: leaving an
     * allergen unanswered has to stay reachable once it has been answered.
     */
    if (triState && !answeredByModel) {
        return (
            <select
                id={id}
                value={checked === null ? '' : String(checked)}
                aria-label={rest['aria-label'] || field?.label || undefined}
                onChange={(event) => onChange(toBoolean(event.target.value))}
                className={[
                    'w-full min-w-0 rounded-md border bg-white px-1.5 py-1 text-[inherit] text-[var(--becpg-blue)]',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]',
                    isInvalid ? 'border-[var(--status-danger)]' : 'border-[var(--becpg-grey)]',
                ].filter(Boolean).join(' ')}
                {...rest}
            >
                <option value="">{labels.empty}</option>
                <option value="true">{labels.yes}</option>
                <option value="false">{labels.no}</option>
            </select>
        );
    }

    return (
        <span className="checkbox-row inline-flex items-center">
            <input
                id={id}
                type="checkbox"
                checked={checked === true}
                aria-label={rest['aria-label'] || field?.label || undefined}
                title={checked === true ? labels.yes : labels.no}
                onChange={(event) => onChange(event.target.checked)}
                className={[
                    'h-4 w-4 cursor-pointer accent-[var(--becpg-blue)]',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] focus-visible:ring-offset-2',
                    isInvalid ? 'outline outline-1 outline-[var(--status-danger)]' : '',
                ].filter(Boolean).join(' ')}
                {...rest}
            />
        </span>
    );
}
