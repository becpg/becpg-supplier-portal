'use client';

/**
 * "État de mon dossier" — card 1 of 4: the **approval status** (spec §4.3).
 *
 * The status itself is never stored: `/api/v1/dashboard` derives it on the fly
 * from the mandatory documents, the blocking catalogues, the open projects and
 * the open non-conformities (spec §5.4.3). This card only renders the verdict,
 * plus the *reasons* that produced it — a supplier who reads "Suspendu" without
 * being told which document expired has learnt nothing.
 *
 * `validUntil` is the date the current verdict holds until. The derivation
 * deliberately returns `null` today (nothing guarantees a repository-wide
 * validity date), so the card falls back on the nearest expiry it is given.
 */

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { resolveStatus } from '@/components/ui/StatusPill';
import { useMessages } from '@/lib/messages';
import { formatDate } from '@/lib/format';
import { defineLabels, pickLabels } from '@/lib/i18n';

/**
 * Why the portal reached that verdict. These are the `reasons[]` codes of
 * `/api/v1/dashboard` and `/api/v1/approval`; they are portal mechanics, not
 * beCPG business vocabulary, so they live here rather than in
 * `config/messages.js` (whose stated budget is ~60 keys).
 */
const REASONS = defineLabels('components/dashboard/ApprovalCard#REASONS', {
    fr: {
        documentExpired: 'Document obligatoire expiré',
        documentExpiring: 'Document arrivant à échéance',
        documentMissing: 'Document attendu non fourni',
        documentRefused: 'Document refusé',
        catalogIncomplete: 'Fiche incomplète',
        openProject: 'Dossier en cours',
        openNonConformity: 'Non-conformité ouverte',
    },
    en: {
        documentExpired: 'Mandatory document expired',
        documentExpiring: 'Document nearing expiry',
        documentMissing: 'Expected document not provided',
        documentRefused: 'Document refused',
        catalogIncomplete: 'Incomplete record',
        openProject: 'Open referencing project',
        openNonConformity: 'Open non-conformity',
    },
});

const LOCAL = defineLabels('components/dashboard/ApprovalCard#LOCAL', {
    fr: {
        title: 'Statut d’agrément',
        validUntil: 'Valide jusqu’au {date}',
        noValidity: 'Aucune échéance connue',
        why: 'Pourquoi ?',
        unknown: 'Statut indisponible',
        unknownHint: 'Le statut n’a pas pu être calculé. Réessayez plus tard.',
        allGood: 'Aucun point bloquant',
    },
    en: {
        title: 'Approval status',
        validUntil: 'Valid until {date}',
        noValidity: 'No known deadline',
        why: 'Why?',
        unknown: 'Status unavailable',
        unknownHint: 'The status could not be computed. Please try again later.',
        allGood: 'Nothing is blocking',
    },
});

/**
 * Tone → the 4px rail at the left edge of the card.
 *
 * The four "état de mon dossier" cards all carry one, in the same place, and
 * these are **exactly** the five rail colours of `components/ui/StatCard`, the
 * tile the monitoring space is built from: the supplier's four state cards and
 * the quality officer's eight park tiles then read as the same instrument, which
 * is the whole point of a range. It is also the cue that survives a glance from
 * two metres away. Exported so the three sibling cards cannot drift from it.
 *
 * Following `StatCard`'s rule, the **figure stays `--becpg-blue`**: a row where
 * every number is a different colour reads as unrelated widgets. The tone lives
 * on the rail and on the pills, never on the number alone.
 */
export const STATE_RAIL = {
    ok: 'var(--status-ok)',
    warn: 'var(--status-warn)',
    danger: 'var(--status-danger)',
    info: 'var(--status-info)',
    neutral: 'var(--becpg-blue-light)',
};

/**
 * The class every state card puts on its `Card`, so the four have the same edge
 * treatment. The colour itself travels in `style.borderLeftColor`.
 */
export const STATE_CARD_CLASS = 'border-s-4';

/** Tone → the surface used for the big status medallion. */
const TONE_SURFACE = {
    ok: 'bg-[var(--status-ok-bg)] text-[var(--status-ok)] border-[var(--status-ok-border)]',
    warn: 'bg-[var(--status-warn-bg)] text-[var(--status-warn)] border-[var(--status-warn-border)]',
    danger: 'bg-[var(--status-danger-bg)] text-[var(--status-danger)] border-[var(--status-danger-border)]',
    info: 'bg-[var(--status-info-bg)] text-[var(--status-info)] border-[var(--status-info-border)]',
    neutral: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] border-[var(--status-neutral-border)]',
};

/**
 * @param {Object} props
 * @param {{status: string, reasons: string[], validUntil: string|null}|null} props.approval
 * @param {{name: string|null, code: string|null}|null} [props.supplier]
 * @param {string|null} [props.validUntil] overrides `approval.validUntil`
 * @param {number} [props.index] stagger position in the KPI row
 */
export function ApprovalCard({ approval, supplier, validUntil, index = 0, className = '' }) {
    const { t, lang } = useMessages();
    const reduceMotion = useReducedMotion();
    const local = pickLabels(LOCAL, lang);
    const reasonLabels = pickLabels(REASONS, lang);

    const status = approval ? approval.status : null;
    const resolved = resolveStatus(status);
    const surface = TONE_SURFACE[resolved.tone] || TONE_SURFACE.neutral;
    const label = status
        ? (resolved.messageKey ? t(resolved.messageKey) : String(status))
        : local.unknown;

    const reasons = Array.isArray(approval && approval.reasons) ? approval.reasons : [];
    // `fallback: null` on purpose: no validity date must fall through to the
    // "no validity" sentence below, not print a bare em dash after "Valide
    // jusqu'au".
    const deadline = formatDate(validUntil || (approval && approval.validUntil), lang, {
        fallback: null,
    });

    return (
        <Card
            title={local.title}
            subtitle={supplier && supplier.name ? supplier.name : undefined}
            icon="verified_user"
            index={index}
            className={`${STATE_CARD_CLASS} ${className}`.trim()}
            style={{ borderLeftColor: STATE_RAIL[resolved.tone] || STATE_RAIL.neutral }}
        >
            <div className="flex items-center gap-3">
                <motion.span
                    initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : 0.1 }}
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${surface}`}
                >
                    <Icon name={resolved.icon} size={26} />
                </motion.span>
                <div className="min-w-0">
                    <p className="truncate text-xl font-light leading-tight sm:text-2xl">{label}</p>
                    <p className="mt-0.5 text-xs text-[var(--becpg-dark-grey)]">
                        {approval
                            ? deadline
                                ? local.validUntil.replace('{date}', deadline)
                                : local.noValidity
                            : local.unknownHint}
                    </p>
                </div>
            </div>

            {approval ? (
                <div className="mt-3 border-t border-[var(--becpg-grey)] pt-3">
                    {reasons.length === 0 ? (
                        <p className="flex items-center gap-1.5 text-xs text-[var(--status-ok)]">
                            <Icon name="check_circle" size={14} />
                            {local.allGood}
                        </p>
                    ) : (
                        <ul className="flex flex-col gap-1.5">
                            {reasons.map((reason) => (
                                <li
                                    key={reason}
                                    className="flex items-start gap-1.5 text-xs text-[var(--becpg-dark-grey)]"
                                >
                                    <Icon
                                        name="chevron_right"
                                        size={14}
                                        className="mt-px shrink-0 text-[var(--becpg-orange)]"
                                    />
                                    <span className="min-w-0">{reasonLabels[reason] || reason}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {reasons.length > 0 ? (
                        <Link
                            href="/documents"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--becpg-blue-light)] hover:underline"
                        >
                            {local.why}
                            <Icon name="arrow_forward" size={13} />
                        </Link>
                    ) : null}
                </div>
            ) : null}
        </Card>
    );
}
