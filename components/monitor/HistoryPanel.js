'use client';

/**
 * The evolution over time, read from beCPG's decision module through
 * `GET /api/v1/monitor/history`: one line per period, the main measure drawn as
 * a bar, every measure written out. When the cube cannot answer, the reason it
 * gave — never an empty chart.
 */

import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';
import { formatNumber } from '@/lib/format';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { HistoryUnavailable } from '@/components/monitor/SupplierScorecard';
import { Tooltip } from '@/components/ui/Tooltip';

const LABELS = defineLabels('components/monitor/HistoryPanel#LABELS', {
    fr: {
        title: 'Évolution',
        help: 'Lu dans le module décisionnel de beCPG, alimenté par lot : les chiffres peuvent dater de la dernière alimentation.',
        period: 'Période',
        measures: {
            stepsNumber: 'Tâches',
            averageActualDurations: 'Durée réelle moy. (j)',
            refusalRate: 'Taux de refus',
            avgResponseDelay: 'Délai de réponse moy. (j)',
            averageProgress: 'Avancement moyen',
            projectsNumber: 'Projets',
        },
    },
    en: {
        title: 'Evolution',
        help: 'Read from the beCPG decision module, loaded by batch: figures may date from the last load.',
        period: 'Period',
        measures: {
            stepsNumber: 'Tasks',
            averageActualDurations: 'Avg. actual duration (d)',
            refusalRate: 'Refusal rate',
            avgResponseDelay: 'Avg. response delay (d)',
            averageProgress: 'Average progress',
            projectsNumber: 'Projects',
        },
    },
});

/**
 * A cube value as a number. The webscript may hand back formatted text
 * ("1 234,5"), so separators are read rather than trusted.
 *
 * @param {*} value
 * @returns {number|null}
 */
function toNumber(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value !== 'string' || value.trim() === '') {
        return null;
    }
    const normalized = value.replace(/[\s  ]/g, '').replace(/%$/, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

/** The known label of a measure column, whatever caption the cube gave it. */
function measureLabel(name, measures) {
    const key = Object.keys(measures).find((id) => String(name).toLowerCase().includes(id.toLowerCase()));
    return key ? measures[key] : name;
}

function HistoryTable({ columns, rows, labels, lang }) {
    const [period, ...measures] = columns;
    const main = measures[0];
    const values = rows.map((row) => toNumber(row[main?.name]));
    const max = Math.max(1, ...values.filter((value) => value !== null));
    return (
        <div className="table-scroll">
            <table className="w-full border-collapse text-sm">
                <thead className="text-[0.8125rem] text-[var(--becpg-muted)]">
                    <tr className="border-b border-[var(--becpg-line)]">
                        <th scope="col" className="py-2 pe-3 text-start font-medium">{labels.period}</th>
                        {measures.map((column, index) => (
                            <th
                                key={column.name}
                                scope="col"
                                className={`py-2 pe-3 font-medium ${index === 0 ? 'text-start' : 'text-end'}`}
                            >
                                {measureLabel(column.name, labels.measures)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr key={String(row[period.name] ?? rowIndex)} className="border-b border-[var(--becpg-line)] last:border-0">
                            <th scope="row" className="py-2 pe-3 text-start font-medium tabular-nums text-[var(--becpg-ink)]">
                                {row[period.name] ?? '—'}
                            </th>
                            {measures.map((column, index) => {
                                const value = toNumber(row[column.name]);
                                const text = value === null ? '—' : formatNumber(value, lang, { maximumFractionDigits: 1 });
                                if (index > 0) {
                                    return (
                                        <td key={column.name} className="py-2 pe-3 text-end tabular-nums">{text}</td>
                                    );
                                }
                                return (
                                    <td key={column.name} className="py-2 pe-3">
                                        <span className="flex items-center gap-2">
                                            <span className="meter-segments relative block h-2 w-40 shrink-0 bg-[var(--becpg-grey)]" aria-hidden="true">
                                                <span
                                                    className="absolute inset-y-0 start-0 bg-[var(--becpg-teal)]"
                                                    style={{ width: `${value === null ? 0 : Math.round((value / max) * 100)}%` }}
                                                />
                                            </span>
                                            <span className="tabular-nums">{text}</span>
                                        </span>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * @param {Object} props
 * @param {'taskTrend'|'completion'} [props.series='taskTrend']
 * @param {string} [props.supplier] nodeRef, to slice the series on one supplier
 * @param {boolean} [props.bare] without its own card, inside a card that has a title
 * @param {string} [props.className]
 */
export function HistoryPanel({ series = 'taskTrend', supplier, bare = false, className = '' }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const history = useApi('monitor/history', { params: { series, supplier } });
    const data = history.data;

    if (history.loading) {
        return <Skeleton height={120} className={className} />;
    }
    if (history.error || !data || data.available !== true || (data.columns || []).length < 2) {
        return (
            <HistoryUnavailable
                className={className}
                history={data || { available: false, reason: 'unreachable' }}
                compact={!bare}
            />
        );
    }
    if (bare) {
        return <HistoryTable columns={data.columns} rows={data.rows || []} labels={labels} lang={lang} />;
    }
    return (
        <Card
            title={labels.title}
            icon="timeline"
            actions={<Tooltip content={labels.help} label={labels.title} />}
            className={className}
        >
            <HistoryTable columns={data.columns} rows={data.rows || []} labels={labels} lang={lang} />
        </Card>
    );
}
