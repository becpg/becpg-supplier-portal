'use client';

/**
 * `selectone.ftl`, `selectmany.ftl`, `checkboxmany.ftl` — and the fallback for
 * any field carrying a `LIST` constraint.
 *
 * The options are read from the definition only: the `LIST` constraint's
 * `allowedValues` first, the `options` control parameter second
 * ({@link import('../validation').listOptions}). Nothing is ever hard-coded, and
 * the same list drives {@link import('../validation').validateField} — the
 * renderer and the validator cannot disagree.
 *
 * Two renderings for the same control, chosen by `field.repeating`:
 *
 * - single value → the **native** `<select>`. The OS picker is the best possible
 *   list on a phone, and it comes with search-by-typing for free;
 * - multiple values → a checkbox group. A native multi-select is a scroll trap
 *   on touch and its ctrl-click model is unknown to most users.
 *
 * A stored value that is no longer in the list (the client changed the
 * constraint after the supplier answered) is kept and shown, flagged as
 * off-list. Dropping it would silently destroy an answer on the next save.
 */

import { Select } from '@/components/ui/Field';
import { listOptions } from '@/components/form/validation';
import { ReadOnlyControl } from '@/components/form/controls/ReadOnlyControl';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/form/controls/SelectControl#LABELS', {
    fr: { placeholder: 'Choisir…', offList: 'valeur hors liste', empty: 'Aucune valeur proposée' },
    en: { placeholder: 'Choose…', offList: 'value not in the list', empty: 'No value offered' },
});

/**
 * @param {*} value
 * @returns {string[]} the selected values, whatever shape they arrived in
 */
function toArray(value) {
    if (value === null || value === undefined || value === '') {
        return [];
    }
    if (Array.isArray(value)) {
        return value.flatMap((entry) => toArray(entry));
    }
    if (typeof value === 'object') {
        if ('value' in value) {
            return toArray(value.value);
        }
        return [];
    }
    // beCPG stores a repeating property as a comma-separated string.
    return String(value)
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry !== '');
}

/**
 * The options to display: the configured ones, plus any stored value that is no
 * longer among them.
 *
 * @param {Object} field
 * @param {string[]} selected
 * @param {string} offListLabel
 * @returns {Array<{value: string, label: string}>}
 */
function optionsWithOrphans(field, selected, offListLabel) {
    const options = listOptions(field);
    const known = new Set(options.map((option) => option.value));
    const orphans = selected
        .filter((entry) => !known.has(entry))
        .map((entry) => ({ value: entry, label: `${entry} (${offListLabel})` }));
    return [...options, ...orphans];
}

/**
 * @param {import('./index').ControlProps} props
 */
export function SelectControl({
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
    const labels = pickLabels(LABELS, lang);
    const selected = toArray(value);
    const options = optionsWithOrphans(field, selected, labels.offList);

    if (readOnly) {
        const labelsByValue = new Map(options.map((option) => [option.value, option.label]));
        return (
            <ReadOnlyControl
                field={field}
                value={value}
                displayValue={
                    displayValue !== null && displayValue !== undefined && displayValue !== ''
                        ? displayValue
                        : selected.map((entry) => labelsByValue.get(entry) || entry).join(', ')
                }
                lang={lang}
                id={id}
            />
        );
    }

    if (options.length === 0) {
        // A closed list with nothing in it is a configuration problem, not a
        // field the supplier can fill: say so instead of showing an empty box.
        return (
            <ReadOnlyControl field={field} value={value} displayValue={labels.empty} lang={lang} id={id} />
        );
    }

    if (field?.repeating) {
        const toggle = (entry, checked) => {
            const next = checked
                ? [...selected, entry]
                : selected.filter((current) => current !== entry);
            onChange(next);
        };
        return (
            /*
             * `becpg-checkgroup` is what lets `app/globals.css` give this group
             * a grid-sized rest state.
             *
             * MEASURED on `bcpg:organoList`, whose « Rapports »
             * (`rep:reportKinds`) is a repeating LIST of eight values: the group
             * is **394px** tall, and it set the pitch of all seven rows to
             * **401px** against the 34px the other lists hold. A checkbox group
             * is the right rendering in a form and an impossible one in a cell,
             * so the grid clips it to one line — selected values first — and
             * opens it while it has the focus, the way it already does for a
             * textarea. The class is the only thing this file owes that rule;
             * nothing about the control changes outside a grid.
             */
            <div
                id={id}
                role="group"
                aria-label={field.label}
                className={[
                    'becpg-checkgroup flex flex-col gap-1 rounded-lg border bg-white p-2',
                    Boolean(error) || invalid ? 'border-[var(--status-danger)]' : 'border-[var(--becpg-grey)]',
                ].join(' ')}
                {...rest}
            >
                {options.map((option) => (
                    <label
                        key={option.value}
                        data-checked={selected.includes(option.value) ? 'true' : undefined}
                        className="becpg-checkgroup-option flex min-h-[36px] cursor-pointer items-center gap-2 rounded px-1 text-sm hover:bg-[var(--becpg-blue-lighter)]/40"
                    >
                        <input
                            type="checkbox"
                            className="h-5 w-5 shrink-0 cursor-pointer rounded border-[var(--becpg-grey)] accent-[var(--becpg-blue)]"
                            checked={selected.includes(option.value)}
                            onChange={(event) => toggle(option.value, event.target.checked)}
                        />
                        <span className="min-w-0 break-words">{option.label}</span>
                    </label>
                ))}
            </div>
        );
    }

    return (
        <Select
            id={id}
            value={selected[0] || ''}
            onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
            placeholder={labels.placeholder}
            options={options}
            invalid={Boolean(error) || invalid}
            {...rest}
        />
    );
}

SelectControl.handlesRepeating = true;
