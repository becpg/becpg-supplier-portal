'use client';

/**
 * One field: the chrome, and the control the definition asked for.
 *
 * `FormRenderer` decides *where* a field goes; this decides *what it looks
 * like*. It owns four things and delegates everything else:
 *
 *  1. **which control** — through `resolveControlComponent` and its documented
 *     fallback chain (`controls/index.js`). Nothing here knows a field name;
 *  2. **the chrome** — label, mandatory marker, description, error, and the help
 *     tooltip, which is present on **every** field that carries a description or
 *     a help text (spec §4.3: "tooltips d'aide (?) sur chaque champ"). Half of
 *     this portal is used on a phone, where a hover-only tooltip does not exist —
 *     `components/ui/Tooltip` is a real button for that reason;
 *  3. **read-only** — the union of the mode, the step's frozen state, the field's
 *     own `readOnly` / `protectedField`, and controls that are read-only by
 *     nature (`alwaysReadOnly`). A read-only field renders its *value*, never a
 *     disabled input: a disabled input on a phone is unreadable and
 *     un-copyable;
 *  4. **repetition** — a control that does not declare `handlesRepeating` is
 *     wrapped in an add/remove list, so a repeating `d:text` works without every
 *     control having to care.
 *
 * ## The DOM id is a contract
 *
 * The id of a field is `field-{formsName}` — stable, derived from the
 * definition, and the same on every render. The compliance panel's "missing
 * field" links (spec §4.4, "Étape n+1 · Conformité") scroll to exactly that id,
 * so it must not become a random `useId`.
 */

import { createElement } from 'react';
import { Icon, IconButton } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { resolveControlComponent } from '@/components/form/controls';
import { formatValidationError, helpText } from '@/components/form/validation';

const LABELS = {
    fr: { add: 'Ajouter une valeur', remove: 'Retirer cette valeur', locked: 'Champ verrouillé' },
    en: { add: 'Add a value', remove: 'Remove this value', locked: 'Locked field' },
};

/** Prefix of every field id. Also the anchor the compliance panel jumps to. */
export const FIELD_ID_PREFIX = 'field-';

/**
 * The DOM id of a field.
 *
 * @param {Object} field a normalised field
 * @returns {string}
 *
 * @example
 * document.getElementById(fieldDomId(field))?.scrollIntoView({ behavior: 'smooth' });
 */
export function fieldDomId(field) {
    return `${FIELD_ID_PREFIX}${field?.id || field?.formsName || field?.name || ''}`.replace(/[^\w:-]/g, '_');
}

/**
 * Splits a value into the entries of a repeating field.
 *
 * @param {*} value
 * @returns {Array<*>}
 */
function toEntries(value) {
    if (value === null || value === undefined || value === '') {
        return [];
    }
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value === 'string' && value.includes(',')) {
        return value.split(',').map((entry) => entry.trim());
    }
    return [value];
}

/**
 * The message shown under a field.
 *
 * A key produced by `validation.js` is resolved against the field's own
 * constraints; anything else (a server-side message, a client comment) is shown
 * as it came.
 *
 * @param {Object} field
 * @param {string} [error]
 * @param {string} lang
 * @returns {string|undefined}
 */
export function resolveErrorMessage(field, error, lang) {
    if (!error) {
        return undefined;
    }
    return String(error).startsWith('validation.')
        ? formatValidationError(field, error, lang)
        : String(error);
}

/**
 * Add/remove list for a control that does not handle repetition itself.
 *
 * @param {Object} props
 */
function RepeatingField({ control, controlProps, entries, onChange, lang }) {
    const labels = LABELS[lang] || LABELS.fr;
    const values = entries.length > 0 ? entries : [null];

    const replace = (index, next) => {
        const copy = [...values];
        copy[index] = next;
        onChange(copy.filter((entry) => entry !== null && entry !== undefined && entry !== ''));
    };

    return (
        <div className="flex flex-col gap-2">
            {values.map((entry, index) => (
                <div key={`${controlProps.id}-${index}`} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                        {createElement(control, {
                            ...controlProps,
                            id: index === 0 ? controlProps.id : `${controlProps.id}-${index}`,
                            value: entry,
                            displayValue: null,
                            onChange: (next) => replace(index, next),
                        })}
                    </div>
                    {values.length > 1 ? (
                        <IconButton
                            icon="close"
                            label={labels.remove}
                            variant="subtle"
                            onClick={() => onChange(values.filter((_, position) => position !== index))}
                        />
                    ) : null}
                </div>
            ))}
            <button
                type="button"
                onClick={() => onChange([...values, ''])}
                className="inline-flex items-center gap-1 self-start rounded-md px-1 py-1 text-xs text-[var(--becpg-blue-light)] hover:text-[var(--becpg-orange)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
            >
                <Icon name="add" size={14} />
                {labels.add}
            </button>
        </div>
    );
}

/**
 * @param {Object} props
 * @param {Object} props.field the normalised field
 * @param {*} props.value current value
 * @param {string|null} [props.displayValue] label beCPG localised for that value
 * @param {(next: *, field: Object) => void} props.onChange
 * @param {boolean} [props.readOnly] forced from the outside (mode, frozen step)
 * @param {string} [props.error] message key or message
 * @param {Object} [props.values] the other form values — dependent datasources
 * @param {string} [props.formId]
 * @param {string} [props.itemType]
 * @param {string} [props.listId]
 * @param {string} [props.entityNodeRef]
 * @param {string} [props.lang='fr']
 * @param {React.ReactNode} [props.badge] rendered after the label (AI confidence…)
 * @param {React.ReactNode} [props.action] rendered at the right of the label row
 */
export function FieldRenderer({
    field,
    value,
    displayValue = null,
    onChange,
    readOnly = false,
    error,
    values,
    formId,
    itemType,
    listId,
    entityNodeRef,
    lang = 'fr',
    badge,
    action,
    className = '',
}) {
    if (!field) {
        return null;
    }

    // `control` stays lowercase and is instantiated through `createElement`: it
    // is resolved from the definition, so it is *not* a component created during
    // render — it is one picked out of the registry.
    const control = resolveControlComponent(field);
    if (control.hidden) {
        return null;
    }

    const labels = LABELS[lang] || LABELS.fr;
    const id = fieldDomId(field);
    const locked = Boolean(field.readOnly || field.protectedField || control.alwaysReadOnly);
    const isReadOnly = Boolean(readOnly) || locked;
    const message = resolveErrorMessage(field, error, lang);

    // A help affordance whenever the definition carries anything to say. When
    // both exist, the description stays visible and the help goes in the bubble.
    const help = helpText(field);
    const tooltip = help || field.description || null;
    const description = help && field.description ? field.description : null;

    const controlProps = {
        field,
        value,
        displayValue,
        onChange: (next) => onChange(next, field),
        readOnly: isReadOnly,
        error: message,
        id,
        lang,
        values,
        formId,
        itemType,
        listId,
        entityNodeRef,
    };

    const rendered =
        field.repeating && !control.handlesRepeating && !isReadOnly ? (
            <RepeatingField
                control={control}
                controlProps={controlProps}
                entries={toEntries(value)}
                onChange={(next) => onChange(next, field)}
                lang={lang}
            />
        ) : (
            createElement(control, controlProps)
        );

    return (
        <Field
            label={field.label || field.name}
            help={tooltip}
            description={description}
            required={Boolean(field.mandatory) && !isReadOnly}
            error={message}
            id={id}
            full={Boolean(control.fullWidth)}
            badge={
                <>
                    {isReadOnly ? (
                        <Icon
                            name="lock_outline"
                            size={14}
                            className="text-[var(--becpg-dark-grey)]"
                            title={labels.locked}
                        />
                    ) : null}
                    {badge}
                </>
            }
            action={action}
            className={className}
        >
            {rendered}
        </Field>
    );
}
