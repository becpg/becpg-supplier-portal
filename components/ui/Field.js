'use client';

/**
 * Form field chrome + the input primitives the wizard is built from.
 *
 * `Field` owns everything around a control: label, mandatory marker, the help
 * tooltip (spec §4.3 — a `?` on **every** field, fed by the beCPG dictionary),
 * the description, the error and the read-only rendering. The control itself is
 * whatever the caller passes as `children`, which is what lets the wizard map
 * beCPG's 35 `control.template` values onto its own widgets while keeping one
 * consistent frame.
 *
 * Wiring is automatic: `Field` generates an id and hands `id`,
 * `aria-describedby` and `aria-invalid` down to a single child element through
 * `cloneElement`, so a caller never has to repeat them.
 *
 * Frozen lists and delegated read-only steps are a first-class state here:
 * `readOnly` renders the *value* rather than a disabled input, because a
 * disabled input on a phone is unreadable and un-copyable.
 */

import { cloneElement, forwardRef, isValidElement, useId } from 'react';
import { Icon } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { useMessages } from '@/lib/messages';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.label field label (already translated by beCPG)
 * @param {React.ReactNode} [props.help] tooltip content — the dictionary description
 * @param {React.ReactNode} [props.description] persistent hint under the label
 * @param {React.ReactNode} [props.hint] persistent hint under the control
 * @param {boolean} [props.required] adds the `*` marker and `aria-required`
 * @param {string} [props.error] error message; also turns the control red
 * @param {boolean} [props.readOnly] renders `value` as text instead of the control
 * @param {React.ReactNode} [props.value] used by the read-only rendering
 * @param {string} [props.id] explicit control id (generated otherwise)
 * @param {'stacked'|'inline'} [props.layout='stacked']
 * @param {boolean} [props.full] spans both columns of `.form-grid`
 * @param {React.ReactNode} [props.badge] rendered after the label (AI confidence, frozen…)
 * @param {React.ReactNode} [props.action] rendered at the right of the label row
 * @param {React.ReactNode} props.children the control
 */
export function Field({
    label,
    help,
    description,
    hint,
    required = false,
    error,
    readOnly = false,
    value,
    id,
    layout = 'stacked',
    full = false,
    badge,
    action,
    className = '',
    children,
}) {
    const { t } = useMessages();
    const generatedId = useId();
    const controlId = id || `field-${generatedId}`;
    const errorId = `${controlId}-error`;
    const hintId = `${controlId}-hint`;

    const describedBy = [error ? errorId : null, hint || description ? hintId : null]
        .filter(Boolean)
        .join(' ');

    const control = readOnly ? (
        /* A frozen / delegated value. It is a *read* surface, so it says so with a
           `--becpg-blue` rail on the left — the same 3px signal the nav and the
           section headers use — rather than by looking like a broken input. */
        <div className="min-h-[40px] whitespace-pre-wrap break-words rounded-lg border-l-[3px] border-l-[var(--becpg-blue-light)] bg-[var(--becpg-grey)] px-3 py-2 text-sm text-[var(--becpg-blue)]">
            {value === null || value === undefined || value === '' ? (
                <span className="text-[var(--becpg-dark-grey-deep)]">—</span>
            ) : (
                value
            )}
        </div>
    ) : isValidElement(children) ? (
        cloneElement(children, {
            id: children.props.id || controlId,
            'aria-describedby': describedBy || undefined,
            'aria-invalid': error ? true : undefined,
            'aria-required': required || undefined,
            // `invalid` is a component prop, not an attribute: never forward it
            // to a raw <input>/<select>, React would warn about it.
            ...(typeof children.type === 'string'
                ? {}
                : { invalid: error ? true : children.props.invalid }),
        })
    ) : (
        children
    );

    return (
        <div
            className={[
                layout === 'inline' ? 'sm:flex sm:items-start sm:gap-4' : '',
                full ? 'form-grid-full' : '',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <div
                className={[
                    'mb-1 flex items-center gap-1.5',
                    layout === 'inline' ? 'sm:mb-0 sm:w-1/3 sm:pt-2' : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                <label
                    htmlFor={readOnly ? undefined : controlId}
                    className="min-w-0 text-sm font-medium text-[var(--becpg-blue)]"
                >
                    <span className="break-words">{label}</span>
                    {required ? (
                        <span
                            className="ml-0.5 text-[var(--status-danger)]"
                            title={t('state.required')}
                            aria-hidden="true"
                        >
                            *
                        </span>
                    ) : null}
                </label>
                {help ? <Tooltip content={help} label={typeof label === 'string' ? label : undefined} /> : null}
                {readOnly ? (
                    <Icon
                        name="lock_outline"
                        size={14}
                        className="text-[var(--becpg-dark-grey)]"
                    />
                ) : null}
                {badge}
                {action ? <span className="ml-auto">{action}</span> : null}
            </div>
            <div className={layout === 'inline' ? 'sm:flex-1' : ''}>
                {description ? (
                    <p className="mb-1 text-xs text-[var(--becpg-dark-grey)]">{description}</p>
                ) : null}
                {control}
                {error ? (
                    <p
                        id={errorId}
                        role="alert"
                        className="mt-1 flex items-start gap-1 text-xs text-[var(--status-danger)]"
                    >
                        <Icon name="error_outline" size={14} className="mt-px" />
                        <span>{error}</span>
                    </p>
                ) : hint ? (
                    <p id={hintId} className="mt-1 text-xs text-[var(--becpg-dark-grey)]">
                        {hint}
                    </p>
                ) : null}
            </div>
        </div>
    );
}

/**
 * Shared control chrome. `invalid` is consumed here and never reaches the DOM.
 *
 * The resting border is `--becpg-blue-lighter`, not the neutral `--becpg-grey`:
 * a form sits on a white card which sits on a grey page, and a grey outline
 * around a white input on a card was the same value as the page behind it.
 *
 * Focus is the **orange ring** — the range's indicator, the same one every
 * `Button`, the header and the sidebar use. It used to be blue-light here, which
 * meant the portal had two different focus colours depending on whether you had
 * tabbed onto a button or into a field. The border darkens to
 * `--becpg-blue-light` at the same time, so focus is never colour-only.
 *
 * Disabled is a *surface* change, not `opacity`: `--becpg-grey` with a
 * `--becpg-dark-grey-deep` value (4.79:1) — a frozen field still has to be
 * readable, and on a phone it also has to stay selectable.
 */
function controlClasses(invalid, extra = '') {
    return [
        'w-full rounded-lg border bg-white px-3 py-2 text-sm text-[var(--becpg-blue)]',
        'transition-colors placeholder:text-[var(--becpg-dark-grey)]',
        'focus:outline-none focus:ring-2 focus:ring-offset-0',
        invalid
            ? 'border-[var(--status-danger)] focus:ring-[var(--status-danger)]'
            : 'border-[var(--becpg-blue-lighter)] focus:border-[var(--becpg-blue-light)] focus:ring-[var(--becpg-orange)]',
        'disabled:cursor-not-allowed disabled:border-[var(--becpg-blue-lighter)] disabled:bg-[var(--becpg-grey)] disabled:text-[var(--becpg-dark-grey-deep)]',
        'min-h-[40px]',
        extra,
    ]
        .filter(Boolean)
        .join(' ');
}

/**
 * Text input. Accepts every native `<input>` prop.
 *
 * @param {Object} props
 * @param {boolean} [props.invalid] error styling (set automatically by `Field`)
 * @param {string} [props.icon] Material icon rendered inside, on the left
 * @param {React.ReactNode} [props.suffix] unit or button rendered inside, on the right
 */
export const Input = forwardRef(function Input(
    { invalid = false, icon, suffix, className = '', ...rest },
    ref,
) {
    const input = (
        <input
            ref={ref}
            /*
             * The icon and the suffix are positioned *over* the control, so the
             * room they occupy is padding. `pl-9` / `pr-12` are how that room is
             * expressed here — but a caller that restyles the control (the
             * datalist grid replaces the padding wholesale, `app/globals.css`)
             * cannot know from the outside that the room is needed. These two
             * attributes say it, and they say it whatever the utilities are
             * called next month.
             */
            data-affix-start={icon ? '' : undefined}
            data-affix-end={suffix ? '' : undefined}
            className={controlClasses(invalid, [icon ? 'pl-9' : '', suffix ? 'pr-12' : '', className].join(' '))}
            {...rest}
        />
    );
    if (!icon && !suffix) {
        return input;
    }
    return (
        <div className="relative">
            {icon ? (
                <Icon
                    name={icon}
                    size={18}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--becpg-dark-grey)]"
                />
            ) : null}
            {input}
            {suffix ? (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--becpg-dark-grey)]">
                    {suffix}
                </span>
            ) : null}
        </div>
    );
});

/**
 * Multi-line input.
 *
 * @param {Object} props
 * @param {number} [props.rows=3]
 * @param {boolean} [props.invalid]
 */
export const Textarea = forwardRef(function Textarea(
    { invalid = false, rows = 3, className = '', ...rest },
    ref,
) {
    return (
        <textarea
            ref={ref}
            rows={rows}
            className={controlClasses(invalid, `resize-y leading-relaxed ${className}`)}
            {...rest}
        />
    );
});

/**
 * Native select — deliberately native, because the OS picker is what works best
 * on a phone.
 *
 * @param {Object} props
 * @param {Array<{value: string, label: string, disabled?: boolean}>} [props.options]
 * @param {string} [props.placeholder] rendered as an empty first option
 * @param {boolean} [props.invalid]
 */
export const Select = forwardRef(function Select(
    { invalid = false, options, placeholder, className = '', children, ...rest },
    ref,
) {
    return (
        <div className="relative">
            <select
                ref={ref}
                /* The chevron always sits over the control — see `Input`. */
                data-affix-end=""
                className={controlClasses(invalid, `appearance-none pr-9 ${className}`)}
                {...rest}
            >
                {placeholder ? <option value="">{placeholder}</option> : null}
                {options
                    ? options.map((option) => (
                          <option key={option.value} value={option.value} disabled={option.disabled}>
                              {option.label}
                          </option>
                      ))
                    : children}
            </select>
            <Icon
                name="expand_more"
                size={18}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--becpg-dark-grey)]"
            />
        </div>
    );
});

/**
 * Checkbox with its own label — used standalone, not inside `Field`.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.label
 * @param {React.ReactNode} [props.description]
 */
export const Checkbox = forwardRef(function Checkbox(
    { label, description, className = '', ...rest },
    ref,
) {
    const generatedId = useId();
    const id = rest.id || `check-${generatedId}`;
    return (
        // `checkbox-row` (globals.css) gives the label a 44px tap band on touch
        // devices, without growing the box or touching the desktop layout.
        <div className={`checkbox-row flex items-start gap-2 ${className}`}>
            <input
                ref={ref}
                id={id}
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-[var(--becpg-blue-lighter)] accent-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] focus-visible:ring-offset-2"
                {...rest}
            />
            <label
                htmlFor={id}
                className="cursor-pointer select-none text-sm leading-5 text-[var(--becpg-blue)]"
            >
                {label}
                {description ? (
                    <span className="block text-xs text-[var(--becpg-dark-grey)]">{description}</span>
                ) : null}
            </label>
        </div>
    );
});

/**
 * Search box wired to a debounced-by-the-caller `onChange`. Used by DataTable
 * and by any list screen.
 *
 * @param {Object} props
 * @param {string} props.value
 * @param {Function} props.onChange receives the raw string
 * @param {string} [props.placeholder]
 */
export function SearchInput({ value, onChange, placeholder, className = '', ...rest }) {
    const { t } = useMessages();
    return (
        <Input
            type="search"
            icon="search"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder || t('action.search')}
            aria-label={placeholder || t('action.search')}
            className={className}
            {...rest}
        />
    );
}
