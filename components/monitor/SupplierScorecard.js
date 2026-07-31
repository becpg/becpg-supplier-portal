'use client';

/**
 * **La scorecard fournisseur** (spec §4.6.4) — critère / poids / note, la
 * complétude des catalogues, et l'évolution *quand elle existe*.
 *
 * ## Where the numbers come from
 *
 * Everything is read from `GET /api/v1/monitor/suppliers/{id}`:
 *
 *   - `scorecard.criteria[]` is `pjt:scoreList` — the very rows
 *     `ExportSupplierScoreList` exports, with `pjt:slWeight`, `pjt:slScore` and
 *     `pjt:slScoreRange`. **The criteria stay the client's**: nothing here
 *     hard-codes a criterion name, an order or a scale.
 *   - `scorecard.score` is the weighted mean the adapter computes the way beCPG
 *     weights it. It is not recomputed here — the sheet and the export must
 *     never disagree.
 *   - `completion.catalogs[]` is `bcpg:entityScore`, i.e. the catalogue-driven
 *     completeness of §4.3.
 *
 * ## The scale problem, solved honestly
 *
 * `pjt:slScore` carries no unit: depending on the client's configuration it is a
 * /100, a /5 or a /20. `pjt:slScoreRange` is the field that says so, but it is
 * free text and may be empty. So {@link resolveScoreScale} parses a maximum out
 * of the range when it can, falls back on the observed maximum otherwise, and
 * the **raw score and the range are always printed next to the bar**. A bar is
 * never the only statement of a value whose scale we inferred.
 *
 * ## Data-viz decisions
 *
 * - Criteria are **horizontal bars, one hue** (`GaugeBar`, the portal's meter):
 *   the job is "compare magnitude, low → high", which is a sequential job, and
 *   the categories (the criteria) have no identity worth a colour of their own.
 *   Tone comes from the value's threshold — a *status* reading — and the number
 *   is direct-labelled, so colour is never the message.
 * - The weight is written as text (`poids 3 · 20 %`), not drawn: drawing it would
 *   double-encode and invite the reader to compare two bars that share no scale.
 * - **No history, no chart.** Without the OLAP cube beCPG stores no snapshot of
 *   past statuses or scores (§4.6.6), so the panel says *historique
 *   indisponible*, says why, and lists the four dimensions and four measures the
 *   cube would need (`OLAP_REQUIREMENTS`, echoed by the API). A flat line at
 *   today's value, or an empty axis frame, would be a lie.
 */

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Gauge, GaugeBar, toneForValue } from '@/components/ui/Gauge';
import { SkeletonText } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatDate } from '@/lib/format';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        title: 'Scorecard',
        subtitle: 'Critères, poids et notes — paramétrés côté client (pjt:scoreList)',
        weighted: 'Score pondéré',
        weightedHint: '{count} critère(s) · poids total {weight}',
        criterion: 'Critère',
        weight: 'poids {weight}',
        weightShare: '{share} % du total',
        range: 'barème {range}',
        noScore: 'Non noté',
        scaleNote:
            'Barème déduit de pjt:slScoreRange (ou de la note maximale observée) : la note brute est toujours affichée.',
        unavailable: 'Aucune scorecard pour ce fournisseur',
        unavailableHint:
            'Les scorecards sont alimentées par les listes pjt:scoreList des projets du fournisseur. Aucun projet noté n’a été trouvé dans votre périmètre.',
        completion: 'Complétude des catalogues',
        completionSubtitle: 'bcpg:entityScore — les catalogues actifs sur les entités du fournisseur',
        completionEmpty: 'Aucun catalogue actif sur ce fournisseur',
        completionScore: 'Complétude moyenne',
        approval: 'Statut d’agrément',
        approvalDerived: 'Calculé à la volée, jamais stocké (§5.4.3)',
        history: 'Évolution',
        historyUnavailable: 'Historique indisponible',
        historyWhy:
            'Sans cube OLAP, beCPG ne conserve aucun instantané des statuts d’agrément ni des scores passés : le portail n’affiche donc pas de courbe plutôt qu’une courbe inventée.',
        historyNeeds: 'Ce qu’il faut côté OLAP pour l’activer',
        dimensions: 'Dimensions',
        measures: 'Mesures',
        statusPartial: 'partiel',
        statusMissing: 'à créer',
        trendLast: 'Dernier point : {value} au {date}',
        trendCaption: 'Évolution du score pondéré',
    },
    en: {
        title: 'Scorecard',
        subtitle: 'Criteria, weights and scores — configured client side (pjt:scoreList)',
        weighted: 'Weighted score',
        weightedHint: '{count} criteria · total weight {weight}',
        criterion: 'Criterion',
        weight: 'weight {weight}',
        weightShare: '{share} % of total',
        range: 'scale {range}',
        noScore: 'Not scored',
        scaleNote:
            'Scale inferred from pjt:slScoreRange (or from the highest observed score): the raw score is always shown.',
        unavailable: 'No scorecard for this supplier',
        unavailableHint:
            'Scorecards are fed by the pjt:scoreList rows of the supplier projects. No scored project was found in your perimeter.',
        completion: 'Catalog completeness',
        completionSubtitle: 'bcpg:entityScore — the catalogs active on the supplier entities',
        completionEmpty: 'No active catalog on this supplier',
        completionScore: 'Mean completeness',
        approval: 'Approval status',
        approvalDerived: 'Derived on the fly, never stored (§5.4.3)',
        history: 'Trend',
        historyUnavailable: 'History unavailable',
        historyWhy:
            'Without an OLAP cube, beCPG keeps no snapshot of past approval statuses or scores: the portal shows no curve rather than an invented one.',
        historyNeeds: 'What the OLAP side needs to enable it',
        dimensions: 'Dimensions',
        measures: 'Measures',
        statusPartial: 'partial',
        statusMissing: 'to create',
        trendLast: 'Last point: {value} on {date}',
        trendCaption: 'Weighted score over time',
    },
};

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]));
}

/**
 * The maximum a `pjt:slScore` can reach, so a bar can be drawn at all.
 *
 * `pjt:slScoreRange` is free text: `"0-100"`, `"/20"`, `"5"`, `"A-E"`… The first
 * number that can plausibly be a maximum wins; otherwise the highest observed
 * score is used (rounded up to 5 / 10 / 20 / 100), and 100 as a last resort.
 *
 * @param {Array<{score: number|null, range: string|null}>} criteria
 * @returns {{max: number, inferred: boolean}}
 */
export function resolveScoreScale(criteria) {
    const scores = (criteria || [])
        .map((entry) => Number(entry.score))
        .filter((score) => Number.isFinite(score));
    const observed = scores.length > 0 ? Math.max(...scores) : 0;

    for (const entry of criteria || []) {
        const numbers = String(entry.range || '')
            .match(/\d+(?:[.,]\d+)?/g);
        if (!numbers || numbers.length === 0) {
            continue;
        }
        const candidate = Math.max(...numbers.map((value) => Number(String(value).replace(',', '.'))));
        if (Number.isFinite(candidate) && candidate >= observed && candidate > 0) {
            return { max: candidate, inferred: false };
        }
    }

    for (const step of [5, 10, 20, 100]) {
        if (observed <= step) {
            return { max: step, inferred: true };
        }
    }
    return { max: Math.ceil(observed), inferred: true };
}

/**
 * *Historique indisponible* — the honest degradation of spec §4.6.6.
 *
 * Renders the reason and the exact OLAP dimensions / measures the API says are
 * required (`history.required`, i.e. `OLAP_REQUIREMENTS`). Never a chart frame,
 * never an empty axis.
 *
 * @param {Object} props
 * @param {{available: boolean, reason?: string, required?: Object}} props.history
 * @param {boolean} [props.compact] one-line form, for a list footer
 */
export function HistoryUnavailable({ history, compact = false, className = '' }) {
    const { lang } = useMessages();
    const local = LABELS[lang] || LABELS.fr;
    const required = (history && history.required) || null;

    if (compact) {
        return (
            <p className={`flex items-start gap-1.5 text-xs text-[var(--becpg-dark-grey)] ${className}`}>
                <Icon name="timeline" size={14} className="mt-0.5 shrink-0" />
                <span>
                    <strong className="font-medium">{local.historyUnavailable}</strong> — {local.historyWhy}
                </span>
            </p>
        );
    }

    return (
        <div className={className}>
            <div className="flex items-start gap-2 rounded-lg border border-[var(--becpg-grey)] bg-[var(--becpg-grey)]/40 p-3">
                <Icon name="timeline" size={18} className="mt-0.5 shrink-0 text-[var(--becpg-blue)]" />
                <div className="min-w-0">
                    <p className="text-sm font-medium">{local.historyUnavailable}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--becpg-dark-grey)]">
                        {local.historyWhy}
                    </p>
                </div>
            </div>

            {required ? (
                <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-[var(--becpg-blue-light)] underline underline-offset-2">
                        {local.historyNeeds}
                    </summary>
                    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <p className="mb-1 font-medium">{local.dimensions}</p>
                            <ul className="flex flex-col gap-1">
                                {(required.dimensions || []).map((dimension) => (
                                    <li key={dimension.id} className="flex flex-wrap items-baseline gap-1.5">
                                        <code className="rounded bg-white px-1 py-0.5">{dimension.id}</code>
                                        <span
                                            className={`pill pill-sm pill-no-dot ${
                                                dimension.status === 'partial' ? 'pill-warn' : 'pill-neutral'
                                            }`}
                                        >
                                            {dimension.status === 'partial'
                                                ? local.statusPartial
                                                : local.statusMissing}
                                        </span>
                                        <span className="text-[var(--becpg-dark-grey)]">{dimension.source}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="mb-1 font-medium">{local.measures}</p>
                            <ul className="flex flex-col gap-1">
                                {(required.measures || []).map((measure) => (
                                    <li key={measure.id} className="flex flex-wrap items-baseline gap-1.5">
                                        <code className="rounded bg-white px-1 py-0.5">{measure.id}</code>
                                        <span className="text-[var(--becpg-dark-grey)]">{measure.source}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </details>
            ) : null}
        </div>
    );
}

/**
 * The score series, **only** rendered when the cube actually answered points.
 *
 * One series, one hue, 2 px line, no gridlines, the last value direct-labelled,
 * and the whole series also exposed as text for assistive tech — the chart is a
 * redundant reading of the numbers, never the only one.
 *
 * @param {Object} props
 * @param {Array<{date: string, score: number}>} props.points
 * @param {number} props.max scale maximum
 */
function ScoreTrend({ points, max }) {
    const { lang } = useMessages();
    const local = LABELS[lang] || LABELS.fr;
    const reduceMotion = useReducedMotion();

    const usable = (points || [])
        .filter((point) => point && Number.isFinite(Number(point.score)))
        .map((point) => ({ date: point.date, score: Number(point.score) }));

    if (usable.length < 2) {
        return null;
    }

    const width = 320;
    const height = 72;
    const top = 6;
    const bottom = height - 6;
    const step = width / (usable.length - 1);
    const scale = (score) => bottom - (Math.max(0, Math.min(score, max)) / max) * (bottom - top);
    const path = usable
        .map((point, index) => `${index === 0 ? 'M' : 'L'}${(index * step).toFixed(1)},${scale(point.score).toFixed(1)}`)
        .join(' ');
    const last = usable[usable.length - 1];

    return (
        <figure className="mt-2">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                width="100%"
                height={height}
                role="img"
                aria-label={local.trendCaption}
                preserveAspectRatio="none"
            >
                <motion.path
                    d={path}
                    fill="none"
                    stroke="var(--becpg-blue-light)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={reduceMotion ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: reduceMotion ? 0 : 0.8, ease: 'easeOut' }}
                />
                <circle
                    cx={width}
                    cy={scale(last.score)}
                    r="4"
                    fill="var(--becpg-blue-light)"
                    stroke="#ffffff"
                    strokeWidth="2"
                />
            </svg>
            <figcaption className="mt-1 text-xs text-[var(--becpg-dark-grey)]">
                {fill(local.trendLast, {
                    value: last.score,
                    date: formatDate(last.date, lang) || '—',
                })}
            </figcaption>
        </figure>
    );
}

/**
 * One criterion: name, weight (as text), score bar, raw score.
 */
function CriterionRow({ criterion, max, totalWeight, local, index }) {
    const score = Number.isFinite(Number(criterion.score)) ? Number(criterion.score) : null;
    const percent = score === null ? null : (score / max) * 100;
    const share = totalWeight > 0 ? Math.round(((criterion.weight || 0) / totalWeight) * 100) : null;

    return (
        <li className="border-b border-[var(--becpg-grey)] py-2.5 last:border-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium" title={criterion.criterion}>
                    {criterion.criterion}
                </span>
                <span className="shrink-0 text-xs text-[var(--becpg-dark-grey)]">
                    {criterion.weight ? fill(local.weight, { weight: criterion.weight }) : null}
                    {criterion.weight && share !== null ? ' · ' : ''}
                    {share !== null && criterion.weight ? fill(local.weightShare, { share }) : null}
                </span>
            </div>
            <div className="mt-1 flex items-center gap-3">
                <span className="min-w-0 flex-1">
                    {percent === null ? (
                        <span className="pill pill-neutral pill-sm pill-no-dot">
                            <Icon name="remove" size={12} />
                            {local.noScore}
                        </span>
                    ) : (
                        <GaugeBar
                            value={percent}
                            size="sm"
                            showValue={false}
                            delay={Math.min(index, 8) * 0.04}
                            ariaLabel={`${criterion.criterion} — ${score} / ${max}`}
                        />
                    )}
                </span>
                <span className="w-24 shrink-0 text-right text-sm tabular-nums">
                    {score === null ? (
                        <span className="text-[var(--becpg-dark-grey)]">—</span>
                    ) : (
                        <span
                            style={{
                                color: `var(--status-${toneForValue(percent)})`,
                            }}
                        >
                            {score}
                            <span className="text-xs text-[var(--becpg-dark-grey)]"> / {max}</span>
                        </span>
                    )}
                </span>
            </div>
            {criterion.range ? (
                <p className="mt-0.5 text-[11px] text-[var(--becpg-dark-grey)]">
                    {fill(local.range, { range: criterion.range })}
                </p>
            ) : null}
        </li>
    );
}

/**
 * @param {Object} props
 * @param {{score: number|null, criteria: Array<Object>, available: boolean}} props.scorecard
 * @param {{score: number|null, catalogs: Array<Object>}} [props.completion]
 * @param {{status: string, statusLabel: string, reasons: string[]}} [props.approval]
 * @param {{available: boolean, points?: Array<Object>, reason?: string, required?: Object}} [props.history]
 * @param {boolean} [props.loading]
 */
export function SupplierScorecard({
    scorecard,
    completion,
    approval,
    history,
    loading = false,
    className = '',
}) {
    const { lang } = useMessages();
    const local = LABELS[lang] || LABELS.fr;

    const criteria = useMemo(
        () =>
            [...((scorecard && scorecard.criteria) || [])].sort(
                (a, b) => (b.weight || 0) - (a.weight || 0),
            ),
        [scorecard],
    );
    const scale = useMemo(() => resolveScoreScale(criteria), [criteria]);
    const totalWeight = criteria.reduce((sum, entry) => sum + (entry.weight || 0), 0);
    const catalogs = (completion && completion.catalogs) || [];
    const available = Boolean(scorecard && scorecard.available && criteria.length > 0);
    const historyAvailable = Boolean(history && history.available);
    const points = (history && history.points) || [];

    return (
        <div className={`grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 ${className}`}>
            {/* --------------------------------------------------- scorecard */}
            <Card title={local.title} subtitle={local.subtitle} icon="grading" index={0}>
                {loading ? (
                    <SkeletonText lines={4} />
                ) : !available ? (
                    <EmptyState
                        compact
                        icon="grading"
                        title={local.unavailable}
                        message={local.unavailableHint}
                    />
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-4">
                            <Gauge
                                value={
                                    scorecard.score === null || scorecard.score === undefined
                                        ? null
                                        : (scorecard.score / scale.max) * 100
                                }
                                size={96}
                                thickness={9}
                                showValue={false}
                                ariaLabel={local.weighted}
                            />
                            <div className="min-w-0">
                                <p className="text-xs uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                                    {local.weighted}
                                </p>
                                <p className="text-2xl font-light leading-tight">
                                    {scorecard.score === null || scorecard.score === undefined ? (
                                        '—'
                                    ) : (
                                        <>
                                            <span className="tabular-nums">{scorecard.score}</span>
                                            <span className="text-sm text-[var(--becpg-dark-grey)]">
                                                {' '}
                                                / {scale.max}
                                            </span>
                                        </>
                                    )}
                                </p>
                                <p className="mt-0.5 text-xs text-[var(--becpg-dark-grey)]">
                                    {fill(local.weightedHint, {
                                        count: criteria.length,
                                        weight: totalWeight || '—',
                                    })}
                                </p>
                            </div>
                        </div>

                        <ul className="mt-3 border-t border-[var(--becpg-grey)]">
                            {criteria.map((criterion, index) => (
                                <CriterionRow
                                    key={criterion.nodeRef || `${criterion.criterion}-${index}`}
                                    criterion={criterion}
                                    max={scale.max}
                                    totalWeight={totalWeight}
                                    local={local}
                                    index={index}
                                />
                            ))}
                        </ul>

                        {scale.inferred ? (
                            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-[var(--becpg-dark-grey)]">
                                <Icon name="info" size={13} className="mt-0.5 shrink-0" />
                                <span>{local.scaleNote}</span>
                            </p>
                        ) : null}
                    </>
                )}
            </Card>

            {/* ------------------------------- completion + approval + trend */}
            <div className="flex flex-col gap-3 sm:gap-4">
                <Card
                    title={local.completion}
                    subtitle={local.completionSubtitle}
                    icon="donut_large"
                    index={1}
                >
                    {loading ? (
                        <SkeletonText lines={3} />
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-4">
                                <Gauge
                                    value={completion ? completion.score : null}
                                    size={88}
                                    thickness={9}
                                    ariaLabel={local.completionScore}
                                />
                                <div className="min-w-0 flex-1">
                                    {approval ? (
                                        <div className="mb-2">
                                            <p className="text-xs uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                                                {local.approval}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                <StatusPill
                                                    status={approval.status}
                                                    label={approval.statusLabel}
                                                />
                                            </div>
                                            <p className="mt-1 text-[11px] text-[var(--becpg-dark-grey)]">
                                                {local.approvalDerived}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {catalogs.length === 0 ? (
                                <p className="mt-2 text-xs text-[var(--becpg-dark-grey)]">
                                    {local.completionEmpty}
                                </p>
                            ) : (
                                <ul className="mt-3 flex flex-col gap-2 border-t border-[var(--becpg-grey)] pt-3">
                                    {/* `catalog.id` alone is enough here, with no
                                        index fallback: `/monitor/suppliers/{id}`
                                        collapses `bcpg:entityScore` to one row per
                                        catalogue (dedupeCatalogs), so the ids in this
                                        list are unique by construction. An index
                                        fallback would only hide it if that ever
                                        stopped being true. */}
                                    {catalogs.map((catalog, index) => (
                                        <li key={catalog.id || catalog.label}>
                                            <GaugeBar
                                                value={catalog.score}
                                                label={catalog.label || catalog.id}
                                                size="sm"
                                                delay={Math.min(index, 8) * 0.04}
                                                ariaLabel={`${catalog.label || catalog.id} ${catalog.score ?? '—'}`}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}
                </Card>

                <Card title={local.history} icon="show_chart" index={2}>
                    {loading ? (
                        <SkeletonText lines={2} />
                    ) : historyAvailable && points.length >= 2 ? (
                        <ScoreTrend points={points} max={scale.max} />
                    ) : (
                        <HistoryUnavailable history={history} />
                    )}
                </Card>
            </div>
        </div>
    );
}
