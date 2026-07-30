'use client';

/**
 * "État de mon dossier" — card 4 of 4: **documents** (spec §4.3).
 *
 * Valid / expiring within the notice window / expired, plus the expected-but-
 * not-provided placeholders `DocumentFormulationHandler` already materialises.
 * The notice window is the one the API used (`noticeDays`, 60 by default), so
 * the caption never lies about what "expiring soon" means.
 */

import Link from 'next/link';
import { Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useMessages } from '@/lib/messages';
import { STATE_CARD_CLASS, STATE_RAIL } from '@/components/dashboard/ApprovalCard';

const LOCAL = {
    fr: {
        title: 'Documents',
        valid: 'Valides',
        expiring: 'Expirent < {days} j',
        expired: 'Expirés',
        missing: 'Manquants',
        refused: 'Refusés',
        total: '{count} document(s) suivi(s)',
        none: 'Aucun document suivi',
        unavailable: 'Suivi documentaire indisponible sur cette instance.',
        all: 'Voir mes documents',
        toHandle: 'à traiter',
    },
    en: {
        title: 'Documents',
        valid: 'Valid',
        expiring: 'Expiring < {days} d',
        expired: 'Expired',
        missing: 'Missing',
        refused: 'Refused',
        total: '{count} tracked document(s)',
        none: 'No tracked document',
        unavailable: 'Document tracking is unavailable on this instance.',
        all: 'See my documents',
        toHandle: 'to deal with',
    },
};

/**
 * One counter tile. Kept inline (not a `StatCard`) because four of them must fit
 * on a 360px-wide card without wrapping into a scroll.
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {number} props.value
 * @param {'ok'|'warn'|'danger'|'neutral'} props.tone
 * @param {string} props.href
 */
function Counter({ label, value, tone, href }) {
    const color = {
        ok: 'text-[var(--status-ok)]',
        warn: 'text-[var(--status-warn)]',
        danger: 'text-[var(--status-danger)]',
        neutral: 'text-[var(--becpg-dark-grey)]',
    }[tone];

    return (
        <Link
            href={href}
            className="flex min-w-0 flex-col items-center rounded-lg border border-[var(--becpg-grey)] px-1 py-2 text-center transition-colors hover:border-[var(--becpg-blue-light)] hover:bg-[var(--becpg-blue-lighter)]/40"
        >
            <span className={`text-xl font-light leading-none tabular-nums ${color}`}>{value}</span>
            <span className="mt-1 w-full truncate text-[0.6875rem] leading-tight text-[var(--becpg-dark-grey)]">
                {label}
            </span>
        </Link>
    );
}

/**
 * @param {Object} props
 * @param {{total: number, valid: number, expiringSoon: number, expired: number,
 *          missing: number, refused: number, noticeDays: number,
 *          available: boolean}|null} props.documents
 * @param {number} [props.index]
 */
export function DocumentsCard({ documents, index = 0, className = '' }) {
    const { lang } = useMessages();
    const local = LOCAL[lang] || LOCAL.fr;

    const available = Boolean(documents && documents.available !== false);
    const noticeDays = (documents && documents.noticeDays) || 60;
    const total = (documents && documents.total) || 0;
    const refused = (documents && documents.refused) || 0;

    // The one figure that is an instruction rather than an inventory: the same
    // sum the nav badge shows (`app/page.js` → `badges.documents`), so the card
    // and the bell can never contradict each other.
    const toHandle = (documents && documents.expired ? documents.expired : 0)
        + (documents && documents.missing ? documents.missing : 0)
        + refused;
    const tone = !available
        ? 'neutral'
        : toHandle > 0
            ? 'danger'
            : (documents && documents.expiringSoon) > 0
                ? 'warn'
                : 'ok';

    return (
        <Card
            title={local.title}
            icon="folder_shared"
            index={index}
            className={`${STATE_CARD_CLASS} ${className}`.trim()}
            style={{ borderLeftColor: STATE_RAIL[tone] }}
            actions={
                <Link
                    href="/documents"
                    aria-label={local.all}
                    title={local.all}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--becpg-dark-grey)] hover:bg-[var(--becpg-grey)] hover:text-[var(--becpg-blue)]"
                >
                    <Icon name="arrow_forward" size={18} />
                </Link>
            }
        >
            {!available ? (
                <p className="text-xs text-[var(--becpg-dark-grey)]">{local.unavailable}</p>
            ) : (
                <>
                    {/*
                     * The headline, so this card scans like its three siblings:
                     * they all answer "how bad is it?" with one large figure on
                     * the same baseline. Without it the card was a 2×2 grid of
                     * four equal numbers, and the eye had nowhere to land.
                     */}
                    <div className="mb-2.5 flex items-baseline gap-2">
                        {/* Blue, like every other headline figure of the row; the
                            rail and the four counters carry the tone. */}
                        <span className="text-3xl font-light leading-none tabular-nums text-[var(--becpg-blue)]">
                            {toHandle}
                        </span>
                        <span className="min-w-0 truncate text-xs text-[var(--becpg-dark-grey)]">
                            {local.toHandle}
                        </span>
                    </div>

                    {/* Two columns at every width: in the 4-up header row the card
                        is ~300px wide, where four tiles would truncate their label. */}
                    <div className="grid grid-cols-2 gap-1.5">
                        <Counter
                            label={local.valid}
                            value={documents.valid || 0}
                            tone="ok"
                            href="/documents?status=valid"
                        />
                        <Counter
                            label={local.expiring.replace('{days}', noticeDays)}
                            value={documents.expiringSoon || 0}
                            tone="warn"
                            href="/documents?status=expiring"
                        />
                        <Counter
                            label={local.expired}
                            value={documents.expired || 0}
                            tone="danger"
                            href="/documents?status=expired"
                        />
                        <Counter
                            label={local.missing}
                            value={documents.missing || 0}
                            tone="neutral"
                            href="/documents?status=missing"
                        />
                    </div>
                    <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--becpg-dark-grey)]">
                        <span>{total === 0 ? local.none : local.total.replace('{count}', total)}</span>
                        {refused > 0 ? (
                            <Link href="/documents?status=refused" className="pill pill-danger pill-sm">
                                <Icon name="cancel" size={13} />
                                {refused} {local.refused}
                            </Link>
                        ) : null}
                    </p>
                </>
            )}
        </Card>
    );
}
