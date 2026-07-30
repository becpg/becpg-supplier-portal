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

    return (
        <Card
            title={local.title}
            icon="folder_shared"
            index={index}
            className={className}
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
