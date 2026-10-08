'use client';

/**
 * The validity window of a document — **shown, coloured and typed in**.
 *
 * ## The colour code is Share's, deliberately
 *
 * `custom-documentlist.js` paints the effectivity of every document in the
 * repository, and a supplier who used the Share portal reads those colours
 * without thinking:
 *
 * | Share class | Situation | Colour |
 * |---|---|---|
 * | `effectivity-mandatory` | mandatory document, no date at all | red, bold |
 * | `effectivity-past` | `cm:to` in the past | red |
 * | `effectivity-future` | inside the window, or not started yet | green |
 * | `effectivity-empty` | no effectivity on a plain file | grey |
 *
 * The portal keeps them and adds one the Share list has no notion of: the
 * **notice period** (`noticeDays`, 60 days by default), painted orange. That is
 * not a departure from the code — an expiring certificate is green in Share only
 * because nothing there computes the delay — it is the same axis, one step
 * earlier. Colour is never alone: every state carries its icon and its sentence,
 * so the line reads the same in greyscale.
 *
 * ## Why the dates are editable here and nowhere else
 *
 * `DocumentAspectPolicy` fills `cm:from` / `cm:to` for the `AUTO` and `NONE`
 * effectivity types, and writes nothing for `MANUAL` — the case where the dates
 * are printed on the certificate the supplier is holding, and where no one else
 * can know them. The server decides which case a row is in and says so with
 * `validityEditable`; this component only renders that verdict, and
 * `PATCH /api/v1/documents/{id}` refuses the write anyway on a type beCPG owns.
 */

import { useState } from 'react';
import { Button, Icon } from '@/components/ui/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { api } from '@/lib/client';
import { formatDate } from '@/lib/format';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/documents/DocumentValidity#LABELS', {
    fr: {
        fromTo: 'Valide du {from} au {to}',
        from: 'Valide depuis le {from}',
        to: 'Valide jusqu’au {to}',
        none: 'Aucune date de validité',
        required: 'Validité à renseigner',
        expired: 'Validité expirée le {to}',
        fromLabel: 'Valide du',
        toLabel: 'Valide jusqu’au',
        edit: 'Modifier',
        setDates: 'Renseigner',
        save: 'Enregistrer',
        cancel: 'Annuler',
        saved: 'Validité enregistrée',
        inverted: 'La date de fin précède la date de début.',
        hint: 'Les dates portées sur le document que vous déposez.',
    },
    en: {
        fromTo: 'Valid from {from} to {to}',
        from: 'Valid since {from}',
        to: 'Valid until {to}',
        none: 'No validity date',
        required: 'Validity to be filled in',
        expired: 'Validity expired on {to}',
        fromLabel: 'Valid from',
        toLabel: 'Valid until',
        edit: 'Edit',
        setDates: 'Fill in',
        save: 'Save',
        cancel: 'Cancel',
        saved: 'Validity saved',
        inverted: 'The end date precedes the start date.',
        hint: 'The dates printed on the document you are uploading.',
    },
});

function labelsFor(lang) {
    return pickLabels(LABELS, lang);
}

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        (vars[key] === undefined || vars[key] === null ? match : String(vars[key])));
}

/**
 * ISO instant → `YYYY-MM-DD`, the only form `<input type="date">` accepts.
 * `cm:from` / `cm:to` are `d:date`, so the day is read in UTC — the same day the
 * supplier typed, whatever timezone the browser is in.
 *
 * @param {string|null} value
 * @returns {string} `''` when there is no date
 */
export function toInputDate(value) {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

/**
 * The (tone, icon, sentence) triple of a validity window — Share's colour code,
 * plus the notice period.
 *
 * @param {Object} document a row of `/documents` or `/documents/requirements`
 * @param {Object} options `{ labels, lang, noticeDays }`
 * @returns {{tone: string, icon: string, text: string, strong: boolean}}
 */
export function validityView(document, { labels, lang, noticeDays = 60 }) {
    const { validFrom, validTo, daysToExpiry } = document || {};

    if (!validFrom && !validTo) {
        return document && document.validityMissing
            ? { tone: 'var(--status-danger)', icon: 'event_busy', text: labels.required, strong: true }
            : { tone: 'var(--becpg-dark-grey)', icon: 'event', text: labels.none, strong: false };
    }

    const expired = daysToExpiry !== null && daysToExpiry !== undefined && daysToExpiry < 0;
    if (expired) {
        return {
            tone: 'var(--status-danger)',
            icon: 'event_busy',
            text: fill(labels.expired, { to: formatDate(validTo, lang) }),
            strong: true,
        };
    }

    const expiring = daysToExpiry !== null && daysToExpiry !== undefined && daysToExpiry <= noticeDays;
    const text = validFrom && validTo
        ? fill(labels.fromTo, { from: formatDate(validFrom, lang), to: formatDate(validTo, lang) })
        : validFrom
          ? fill(labels.from, { from: formatDate(validFrom, lang) })
          : fill(labels.to, { to: formatDate(validTo, lang) });

    return {
        tone: expiring ? 'var(--status-warn)' : 'var(--status-ok)',
        // `schedule` and not `event_upcoming`: the portal ships the classic
        // `material-icons` font, where the Symbols-only names render as their
        // own text.
        icon: expiring ? 'schedule' : 'event_available',
        text,
        strong: false,
    };
}

/**
 * The two date boxes, without any persistence of their own.
 *
 * Used by the editor below and by the upload control, where the dates travel
 * **with** the file rather than in a second step nobody would come back for.
 *
 * @param {Object} props
 * @param {string} props.from `YYYY-MM-DD`
 * @param {string} props.to `YYYY-MM-DD`
 * @param {Function} props.onChange `({ from, to }) => void`
 * @param {boolean} [props.required] renders the boxes as expected input
 * @param {boolean} [props.disabled]
 * @param {string} [props.idPrefix] so two instances never share an input id
 */
export function ValidityFields({
    from,
    to,
    onChange,
    required = false,
    disabled = false,
    idPrefix = 'validity',
    className = '',
}) {
    const { lang } = useMessages();
    const labels = labelsFor(lang);

    const box = 'mt-0.5 w-full rounded-lg border border-[var(--becpg-grey)] px-2 py-1 text-sm '
        + 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]';

    return (
        <div className={`flex flex-wrap items-end gap-2 ${className}`}>
            <div className="min-w-[9rem] flex-1">
                <label
                    htmlFor={`${idPrefix}-from`}
                    className="text-[0.6875rem] uppercase tracking-wide text-[var(--becpg-dark-grey)]"
                >
                    {labels.fromLabel}
                </label>
                <input
                    id={`${idPrefix}-from`}
                    type="date"
                    value={from}
                    disabled={disabled}
                    onChange={(event) => onChange({ from: event.target.value, to })}
                    className={box}
                />
            </div>
            <div className="min-w-[9rem] flex-1">
                <label
                    htmlFor={`${idPrefix}-to`}
                    className="text-[0.6875rem] uppercase tracking-wide text-[var(--becpg-dark-grey)]"
                >
                    {labels.toLabel}
                    {required ? <span className="text-[var(--status-danger)]"> *</span> : null}
                </label>
                <input
                    id={`${idPrefix}-to`}
                    type="date"
                    value={to}
                    disabled={disabled}
                    onChange={(event) => onChange({ from, to: event.target.value })}
                    className={box}
                />
            </div>
        </div>
    );
}

/**
 * The validity of one document: the coloured sentence, and the boxes to correct
 * it when the supplier owns the dates.
 *
 * @param {Object} props
 * @param {Object} props.document a row of `/documents/requirements`
 * @param {number} [props.noticeDays=60]
 * @param {boolean} [props.readOnly] entry is closed on this sheet
 * @param {Function} [props.onSaved] called after a successful write, to re-read the list
 * @param {string} [props.className]
 */
export function DocumentValidity({
    document,
    noticeDays = 60,
    readOnly = false,
    onSaved,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = labelsFor(lang);
    const toast = useToast();

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState({
        from: toInputDate(document.validFrom),
        to: toInputDate(document.validTo),
    });

    const view = validityView(document, { labels, lang, noticeDays });
    // An empty slot has no window to speak of: what is missing there is the
    // file, and the row already says so.
    const canEdit = !readOnly && document.validityEditable && document.isProvided;

    const open = () => {
        setDraft({ from: toInputDate(document.validFrom), to: toInputDate(document.validTo) });
        setEditing(true);
    };

    const save = async () => {
        if (draft.from && draft.to && draft.from > draft.to) {
            toast.error(new Error(labels.inverted));
            return;
        }
        setSaving(true);
        try {
            await api.patch(`documents/${encodeURIComponent(document.id || document.nodeRef)}`, {
                validFrom: draft.from || null,
                validTo: draft.to || null,
            });
            toast.success(labels.saved);
            setEditing(false);
            if (onSaved) {
                onSaved();
            }
        }
        catch (error) {
            toast.error(error);
        }
        finally {
            setSaving(false);
        }
    };

    if (editing) {
        return (
            <div className={`min-w-0 ${className}`}>
                <ValidityFields
                    from={draft.from}
                    to={draft.to}
                    onChange={setDraft}
                    required={document.validityRequired}
                    disabled={saving}
                    idPrefix={`validity-${document.id || 'row'}`}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" icon="save" loading={saving} onClick={save}>
                        {labels.save}
                    </Button>
                    <Button size="sm" variant="subtle" onClick={() => setEditing(false)} disabled={saving}>
                        {labels.cancel}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${className}`}>
            <span
                className={`inline-flex items-center gap-1 ${view.strong ? 'font-semibold' : ''}`}
                style={{ color: view.tone }}
            >
                <Icon name={view.icon} size={14} className="shrink-0" />
                <span>{view.text}</span>
            </span>
            {canEdit ? (
                <button
                    type="button"
                    onClick={open}
                    className="text-[var(--becpg-blue-light)] underline underline-offset-2 hover:opacity-80"
                >
                    {document.validFrom || document.validTo ? labels.edit : labels.setDates}
                </button>
            ) : null}
        </p>
    );
}
