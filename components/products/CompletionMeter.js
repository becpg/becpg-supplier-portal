'use client';

/**
 * How complete a sheet is, in the width of a sidebar card: the headline score,
 * then one segmented bar per catalogue, so the supplier sees at once the figure
 * the customer reads and which catalogue holds it back.
 *
 * Every bar is a `meter` with its value, and every value is also written out:
 * the colour of a bar is never the only way to read it.
 */

import { useId } from 'react';
import { DEFAULT_THRESHOLDS, tonePalette, toneForValue } from '@/components/ui/Gauge';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/products/CompletionMeter#LABELS', {
    fr: {
        title: 'Complétude',
        noScore: 'Pas encore évaluée',
        notCounted: 'hors note',
        more: '+ {count} autre(s) catalogue(s)',
    },
    en: {
        title: 'Completion',
        noScore: 'Not scored yet',
        notCounted: 'not in the score',
        more: '+ {count} more catalogue(s)',
    },
});

/** Beyond that, the card would outgrow the header it sits in. */
const MAX_ROWS = 3;

/** The fill runs from the tone's darker edge to its body, left to right. */
const FILLS = {
    ok: 'linear-gradient(90deg, var(--becpg-teal), var(--becpg-teal-light))',
    warn: 'linear-gradient(90deg, var(--becpg-orange-deep), var(--becpg-orange))',
    danger: 'var(--status-danger)',
};

/**
 * Catalogues that make the score first, then the weakest first: the rows a
 * supplier has to act on come up top.
 *
 * @param {Array<{score: number|null, counted?: boolean}>} catalogs
 * @returns {Array}
 */
function byRelevance(catalogs) {
    return catalogs
        .filter((catalog) => typeof catalog.score === 'number')
        .sort((a, b) => Number(Boolean(b.counted)) - Number(Boolean(a.counted)) || a.score - b.score);
}

function CatalogRow({ catalog, labels }) {
    const tone = toneForValue(catalog.score, DEFAULT_THRESHOLDS);
    const score = Math.round(catalog.score);
    return (
        <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
            <span className="truncate text-xs text-[var(--becpg-ink)]" title={catalog.label || undefined}>
                {catalog.label}
                {catalog.counted === false ? (
                    <span className="text-[var(--becpg-muted)]"> · {labels.notCounted}</span>
                ) : null}
            </span>
            <span className="text-xs font-semibold tabular-nums" style={{ color: tonePalette(tone).text }}>
                {score} %
            </span>
            <span
                role="meter"
                aria-label={catalog.label || labels.title}
                aria-valuenow={score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={`${score} %`}
                className="meter-segments relative col-span-2 block h-2 bg-[var(--becpg-grey)]"
            >
                <span
                    className="absolute inset-y-0 start-0 transition-[width] duration-700 ease-out motion-reduce:transition-none"
                    style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: FILLS[tone] }}
                />
            </span>
        </li>
    );
}

/**
 * @param {Object} props
 * @param {import('@/lib/adapters/entities').EntityCompletion|null} props.completion
 * @param {string} [props.className]
 */
export function CompletionMeter({ completion, className = '' }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const titleId = useId();
    const score = typeof completion?.score === 'number' ? Math.round(completion.score) : null;
    const rows = byRelevance(completion?.catalogs ?? []);
    const shown = rows.slice(0, MAX_ROWS);
    const hidden = rows.length - shown.length;
    const headline = score === null ? null : tonePalette(toneForValue(score, DEFAULT_THRESHOLDS));

    return (
        <section
            aria-labelledby={titleId}
            className={`flex w-full items-center gap-4 rounded-xl border border-[var(--becpg-line)] bg-[var(--becpg-page-surface)] px-4 py-3 sm:w-[27rem] ${className}`}
        >
            <div className="min-w-[4.5rem] shrink-0 text-center">
                <p className="text-[2rem] font-light leading-none tabular-nums" style={{ color: headline?.text }}>
                    {score === null ? '—' : score}
                    {score === null ? null : <span className="ms-0.5 text-sm font-medium">%</span>}
                </p>
                <p id={titleId} className="mt-1.5 text-[0.6875rem] uppercase tracking-[0.06em] text-[var(--becpg-muted)]">
                    {labels.title}
                </p>
            </div>
            <div className="min-w-0 flex-1 border-s border-[var(--becpg-line)] ps-4">
                {shown.length === 0 ? (
                    <p className="text-xs text-[var(--becpg-muted)]">{labels.noScore}</p>
                ) : (
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                        {shown.map((catalog) => (
                            <CatalogRow key={catalog.id || catalog.label} catalog={catalog} labels={labels} />
                        ))}
                    </ul>
                )}
                {hidden > 0 ? (
                    <p className="mt-1.5 text-xs text-[var(--becpg-muted)]">
                        {labels.more.replace('{count}', String(hidden))}
                    </p>
                ) : null}
            </div>
        </section>
    );
}
