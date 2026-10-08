'use client';

/**
 * Validity of a document, said in one line.
 *
 * A supplier does not read `cm:to`, he reads *"j'ai encore 12 jours"*. This
 * component turns the pair (`status`, `validTo`/`daysToExpiry`) produced by
 * `GET /api/v1/documents` into that sentence, on top of the portal's single
 * status vocabulary (`StatusPill`) — so an expiring certificate is the same
 * orange, with the same icon, everywhere it appears.
 *
 * Nothing is computed here that the server already computed: `daysToExpiry` and
 * `status` come from `lib/adapters/documents.js`, which owns the notice delay
 * (`noticeDays`, 60 by default). The component only *phrases* them, and falls
 * back to counting the days itself when a caller has a raw date and no status.
 *
 * Date formatting used to live here — fifteen screens imported `formatDate` from
 * this file, and a second, subtly different copy lived in `ApprovalCard`. Both
 * are gone: everything now goes through `@/lib/format`.
 */

import { useMessages } from '@/lib/messages';
import { formatDate, daysUntil } from '@/lib/format';
import { Icon } from '@/components/ui/Button';
import { StatusPill, resolveStatus } from '@/components/ui/StatusPill';
import { defineLabels, pickLabels } from '@/lib/i18n';

/**
 * Screen vocabulary of the document screens. It stays local, like `Nav.js` and
 * `DataTable.js` do, so `config/messages.js` keeps its ~60-key budget for the
 * shell (AGENTS.md rule 4).
 */
const LABELS = defineLabels('components/documents/ExpiryPill#LABELS', {
    fr: {
        missing: 'À fournir',
        refused: 'Refusé',
        toValidate: 'En cours de validation',
        valid: 'Valide',
        validUntil: 'Valide jusqu’au {date}',
        expiredOn: 'Expiré le {date}',
        expiredSince: 'Expiré depuis {days} j',
        expiresToday: 'Expire aujourd’hui',
        expiresIn: 'Expire dans {days} j',
        noDate: 'Sans date de validité',
        from: 'Du',
        to: 'au',
        since: 'Depuis le',
        until: 'Jusqu’au',
    },
    en: {
        missing: 'To provide',
        refused: 'Rejected',
        toValidate: 'Being reviewed',
        valid: 'Valid',
        validUntil: 'Valid until {date}',
        expiredOn: 'Expired on {date}',
        expiredSince: 'Expired {days} days ago',
        expiresToday: 'Expires today',
        expiresIn: 'Expires in {days} days',
        noDate: 'No validity date',
        from: 'From',
        to: 'to',
        since: 'Since',
        until: 'Until',
    },
});

/** @param {string} lang @returns {Object} the label map of that language */
function labelsFor(lang) {
    return pickLabels(LABELS, lang);
}

/** Replaces `{name}` placeholders. */
function fill(template, vars) {
    return template.replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]),
    );
}

/**
 * Builds the phrase shown by the pill.
 *
 * @param {Object} params `{ status, validTo, daysToExpiry, labels, lang }`
 * @returns {string}
 */
function phraseFor({ status, validTo, daysToExpiry, labels, lang }) {
    const days = daysToExpiry === null || daysToExpiry === undefined ? daysUntil(validTo) : daysToExpiry;

    switch (status) {
        case 'missing':
            return labels.missing;
        case 'refused':
            return labels.refused;
        case 'toValidate':
            return labels.toValidate;
        case 'expired':
            return days !== null && days < 0 && days > -400
                ? fill(labels.expiredSince, { days: Math.abs(days) })
                : fill(labels.expiredOn, { date: formatDate(validTo, lang) });
        case 'expiring':
            if (days === null) {
                return labels.valid;
            }
            return days <= 0 ? labels.expiresToday : fill(labels.expiresIn, { days });
        case 'valid':
            return validTo ? fill(labels.validUntil, { date: formatDate(validTo, lang) }) : labels.valid;
        default:
            return validTo ? fill(labels.validUntil, { date: formatDate(validTo, lang) }) : labels.noDate;
    }
}

/**
 * Validity pill.
 *
 * @param {Object} props
 * @param {string} props.status document status (`valid`, `expiring`, `expired`, `missing`, `refused`, `toValidate`)
 * @param {string|null} [props.validTo] `cm:to`, ISO
 * @param {number|null} [props.daysToExpiry] days left, as computed by the API
 * @param {'sm'|'md'} [props.size='md']
 * @param {boolean} [props.iconOnly=false] compact form for a dense grid
 * @param {string} [props.className]
 */
export function ExpiryPill({
    status,
    validTo = null,
    daysToExpiry = null,
    size = 'md',
    iconOnly = false,
    className = '',
    ...rest
}) {
    const { lang } = useMessages();
    const labels = labelsFor(lang);
    const label = phraseFor({ status, validTo, daysToExpiry, labels, lang });

    return (
        <StatusPill
            status={status}
            label={label}
            size={size}
            iconOnly={iconOnly}
            title={label}
            className={className}
            {...rest}
        />
    );
}

/**
 * The `cm:effectivity` range, as plain text. Rendered next to the pill when the
 * exact dates matter (a certificate the supplier must match with the PDF he is
 * about to upload).
 *
 * @param {Object} props
 * @param {string|null} [props.from] `cm:from`
 * @param {string|null} [props.to] `cm:to`
 * @param {boolean} [props.withIcon=true]
 */
export function ValidityRange({ from, to, withIcon = true, className = '' }) {
    const { lang } = useMessages();
    const labels = labelsFor(lang);

    if (!from && !to) {
        return (
            <span className={`text-xs text-[var(--becpg-dark-grey)] ${className}`}>{labels.noDate}</span>
        );
    }

    const text = from && to
        ? `${labels.from} ${formatDate(from, lang)} ${labels.to} ${formatDate(to, lang)}`
        : from
          ? `${labels.since} ${formatDate(from, lang)}`
          : `${labels.until} ${formatDate(to, lang)}`;

    return (
        <span className={`inline-flex items-center gap-1 text-xs text-[var(--becpg-dark-grey)] ${className}`}>
            {withIcon ? <Icon name="event" size={14} /> : null}
            <span>{text}</span>
        </span>
    );
}

/**
 * The countdown as a thin bar — used in the checklist when a document is about
 * to expire, so a row that needs action is visible without reading it.
 *
 * The bar is *empty* when the document is fresh and fills as the deadline
 * approaches, over the notice window (`noticeDays`, 60 by default).
 *
 * @param {Object} props
 * @param {number|null} props.daysToExpiry
 * @param {number} [props.noticeDays=60]
 */
export function ExpiryBar({ daysToExpiry, noticeDays = 60, className = '' }) {
    // Once expired there is nothing left to count down: the pill and the date
    // already say it, and a full red bar under every expired row was a third
    // copy of the same alarm.
    if (daysToExpiry === null || daysToExpiry === undefined || daysToExpiry > noticeDays || daysToExpiry <= 0) {
        return null;
    }
    const remaining = Math.max(0, Math.min(noticeDays, daysToExpiry));
    const consumed = Math.round(((noticeDays - remaining) / noticeDays) * 100);
    const tone = daysToExpiry <= Math.round(noticeDays / 2)
          ? 'var(--status-warn)'
          : 'var(--becpg-blue-light)';

    return (
        <div
            className={`h-1 w-full overflow-hidden rounded-full bg-[var(--becpg-grey)] ${className}`}
            aria-hidden="true"
        >
            <div className="h-full rounded-full" style={{ width: `${consumed}%`, background: tone }} />
        </div>
    );
}

/**
 * Resolves the tone of a document status, for callers that need the colour
 * without the pill (a rail, a dot, a chart).
 *
 * @param {string} status
 * @returns {'ok'|'warn'|'danger'|'neutral'|'info'}
 */
export function toneForDocumentStatus(status) {
    return resolveStatus(status).tone;
}
