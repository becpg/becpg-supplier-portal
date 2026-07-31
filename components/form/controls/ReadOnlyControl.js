'use client';

/**
 * The read-only rendering — and the last link of the fallback chain.
 *
 * Two jobs, which is why it is the first control to read:
 *
 *  1. it is what **every** other control renders when `readOnly` is true. A
 *     disabled input is unreadable and un-copyable on a phone, and the wizard is
 *     full of read-only fields — a list frozen by the client, a step the
 *     supplier only consults, a `protectedField` of the model (spec §4.4);
 *  2. it is the component the registry falls back to when a `control.template`
 *     is unknown **and** the data type says nothing useful. Showing the value is
 *     always better than showing nothing, and never destroys data.
 *
 * `displayValue` wins over `value` whenever beCPG sent one: it is already
 * localised (`{ value, displayValue }` cells, contracts §2), and it is the only
 * thing that can turn a nodeRef into a product name.
 */

import { Icon } from '@/components/ui/Button';
import { controlParams, numberFormat } from '@/components/form/validation';
import { formatDate, formatDateTime, formatNumber, isIsoTimestamp } from '@/lib/format';

const LABELS = {
    fr: { yes: 'Oui', no: 'Non', empty: '—' },
    en: { yes: 'Yes', no: 'No', empty: '—' },
};

/** Anything that looks like a link, when `activateLinks` is on. */
const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

/**
 * A single value, written the way a human reads it.
 *
 * Never throws on a malformed value: a broken date renders as its raw text
 * rather than as `Invalid Date`.
 *
 * @param {Object} field a normalised field
 * @param {*} value
 * @param {string} [lang='fr']
 * @returns {string}
 *
 * @example
 * formatValue({ dataType: 'd:double', control: { params: { decimals: 2 } } }, 3.14159, 'fr'); // "3,14"
 */
export function formatValue(field, value, lang = 'fr') {
    const labels = LABELS[lang] || LABELS.fr;
    if (value === null || value === undefined || value === '') {
        return '';
    }
    if (Array.isArray(value)) {
        return value.map((entry) => formatValue(field, entry, lang)).filter(Boolean).join(', ');
    }
    if (typeof value === 'object') {
        if ('displayValue' in value && value.displayValue) {
            return String(value.displayValue);
        }
        if ('value' in value) {
            return formatValue(field, value.value, lang);
        }
        if ('nodeRef' in value) {
            return String(value.name || value.label || value.nodeRef);
        }
        // An mltext map: the current language first, then whatever is filled in.
        const entries = Object.entries(value).filter(([, text]) => text !== null && text !== undefined && text !== '');
        if (entries.length === 0) {
            return '';
        }
        const current = entries.find(([locale]) => String(locale).toLowerCase().startsWith(lang));
        return String((current || entries[0])[1]);
    }
    if (typeof value === 'boolean') {
        return value ? labels.yes : labels.no;
    }

    const dataType = field?.dataType;
    if (dataType === 'd:boolean') {
        const text = String(value).toLowerCase();
        if (text === 'true' || text === '1' || text === 'yes') {
            return labels.yes;
        }
        if (text === 'false' || text === '0' || text === 'no') {
            return labels.no;
        }
    }
    if (dataType === 'd:date') {
        return formatDate(value, lang, { fallback: String(value) });
    }
    if (dataType === 'd:datetime') {
        return formatDateTime(value, lang, { fallback: String(value) });
    }
    if (dataType === 'd:int' || dataType === 'd:long' || dataType === 'd:double' || dataType === 'd:float') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            const { maximumFractionDigits, minimumFractionDigits } = numberFormat(field);
            return formatNumber(parsed, lang, { maximumFractionDigits, minimumFractionDigits });
        }
    }
    // Last line of defence. A property can reach this control with no data type
    // at all — the degraded property sheet of `/products/{id}` builds its fields
    // straight from `entity.attributes`, where `cm:created` is just a string.
    // Without this the sheet printed `2026-07-06T14:48:55.903Z` verbatim, which
    // is precisely the bug this module was created to end.
    if (isIsoTimestamp(value)) {
        return formatDateTime(value, lang, { fallback: String(value) });
    }
    return String(value);
}

/**
 * Splits a text into plain segments and links.
 *
 * @param {string} text
 * @returns {React.ReactNode}
 */
function linkify(text) {
    const parts = String(text).split(URL_RE);
    return parts.map((part, index) => {
        if (index % 2 === 0 || !part) {
            return part;
        }
        const href = part.startsWith('www.') ? `https://${part}` : part;
        return (
            <a
                key={`${part}-${index}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--becpg-blue-light)] underline underline-offset-2 hover:text-[var(--becpg-orange)]"
            >
                {part}
            </a>
        );
    });
}

/**
 * @param {import('./index').ControlProps} props
 */
export function ReadOnlyControl({
    field,
    value,
    displayValue,
    lang = 'fr',
    id,
    className = '',
    // Consumed, never forwarded. `Field` injects `invalid` on every control it
    // clones, and none of these is a DOM attribute: spreading them onto the
    // <div> would put `formId="…"` in the HTML and make React complain.
    invalid: unusedInvalid,
    onChange: unusedOnChange,
    error: unusedError,
    readOnly: unusedReadOnly,
    values: unusedValues,
    formId: unusedFormId,
    itemType: unusedItemType,
    listId: unusedListId,
    entityNodeRef: unusedEntityNodeRef,
    ...rest
}) {
    const labels = LABELS[lang] || LABELS.fr;
    const params = controlParams(field);
    const text = displayValue !== null && displayValue !== undefined && displayValue !== ''
        ? String(displayValue)
        : formatValue(field, value, lang);

    const empty = text === '';
    const content = params.activateLinks === true || params.activateLinks === 'true' ? linkify(text) : text;

    return (
        <div
            id={id}
            className={[
                'flex min-h-[40px] items-start gap-1.5 rounded-lg bg-[var(--becpg-grey)]/60 px-3 py-2 text-sm',
                'whitespace-pre-wrap break-words',
                empty ? 'text-[var(--becpg-dark-grey)]' : 'text-[var(--becpg-blue)]',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
            {...rest}
        >
            {empty ? labels.empty : content}
        </div>
    );
}

/**
 * A read-only value that is *not* editable by design (a computed score, a SPEL
 * formula, a decision tree). Same rendering, plus the lock affordance, so the
 * supplier understands the difference between "not yours to fill" and "empty".
 *
 * @param {import('./index').ControlProps} props
 */
export function LockedControl(props) {
    return (
        <div className="relative">
            <ReadOnlyControl {...props} className="pr-9" />
            <Icon
                name="lock_outline"
                size={16}
                className="absolute right-3 top-2.5 text-[var(--becpg-dark-grey)]"
            />
        </div>
    );
}

ReadOnlyControl.handlesRepeating = true;
LockedControl.handlesRepeating = true;
