'use client';

/**
 * The building blocks every cockpit tab is made of: a KPI card with its split
 * bar, a chart card, a legend, the "to be wired" state and the CSV download.
 */

import { Card } from '@/components/ui/Card';
import { Button, Icon } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatNumber } from '@/lib/format';
import { toCsv } from '@/lib/csv';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';
import { cssVar } from '@/components/monitor/cockpit/palette';
import { Chart } from '@/components/monitor/cockpit/Chart';

/** The reason of a block that answered with nothing to draw, which is not a failure. */
const NO_DATA = 'noData';

/** Widest bar of a cartesian chart, so a single bar does not fill the card. */
export const BAR_MAX_WIDTH = 48;

/** Background of the chart tooltips: the card surface. */
const TOOLTIP_SURFACE = '#ffffff';

const LABELS = defineLabels('components/monitor/cockpit/parts#LABELS', {
    fr: {
        export: 'Exporter',
        soon: 'À brancher',
        decisionModule: 'Module décisionnel',
        chartFailed: 'Le graphique n’a pas pu être chargé.',
        window: 'Fenêtre d’analyse : les chiffres couvrent les fournisseurs lus.',
        unavailable: 'Données indisponibles',
        empty: 'Rien à afficher',
        reasons: {
            denied: 'Accès refusé par beCPG à cette information.',
            notFound: 'Information introuvable dans beCPG.',
            unavailable: 'beCPG n’a pas répondu pour ce bloc. Réessayez dans un instant.',
            noMatchingDocumentType: 'Aucun type de document correspondant dans ce périmètre.',
            noData: 'Aucune donnée pour ce périmètre.',
        },
    },
    en: {
        export: 'Export',
        soon: 'To be wired',
        decisionModule: 'Decision module',
        chartFailed: 'The chart could not be loaded.',
        window: 'Scan window: the figures cover the suppliers read.',
        unavailable: 'Data unavailable',
        empty: 'Nothing to show',
        reasons: {
            denied: 'beCPG denied access to this information.',
            notFound: 'Information not found in beCPG.',
            unavailable: 'beCPG did not answer for this block. Try again in a moment.',
            noMatchingDocumentType: 'No matching document type in this perimeter.',
            noData: 'No data for this perimeter.',
        },
    },
});

/** The labels of this module, for the tabs that reuse its wording. */
export function usePartLabels() {
    const { lang } = useMessages();
    return pickLabels(LABELS, lang);
}

/**
 * Replaces `{name}` placeholders.
 *
 * @param {string} template
 * @param {Object} vars
 * @returns {string}
 */
export function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]));
}

/**
 * A number in the reader's language, or a dash.
 *
 * @param {?number} value
 * @param {string} lang
 * @returns {string}
 */
export function figure(value, lang) {
    return Number.isFinite(value) ? formatNumber(value, lang, { maximumFractionDigits: 1 }) : '—';
}

/** A coloured square (or disc) beside a legend label. */
export function Swatch({ tone, round = false }) {
    return (
        <span
            aria-hidden="true"
            className={`inline-block h-2 w-2 shrink-0 ${round ? 'rounded-full' : 'rounded-[2px]'}`}
            style={{ background: cssVar(tone) }}
        />
    );
}

/**
 * A legend: one swatch and one label per entry, the value written when given.
 *
 * @param {Object} props
 * @param {Array<{key: string, label: string, tone: string, value?: number, round?: boolean}>} props.items
 */
export function Legend({ items, className = '' }) {
    const { lang } = useMessages();
    return (
        <ul className={`flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-[var(--becpg-muted)] ${className}`}>
            {items.map((item) => (
                <li key={item.key} className="inline-flex items-center gap-1.5">
                    <Swatch tone={item.tone} round={item.round} />
                    <span>
                        {item.label}
                        {item.value === undefined ? null : <span className="tabular-nums"> {figure(item.value, lang)}</span>}
                    </span>
                </li>
            ))}
        </ul>
    );
}

/**
 * A stacked bar of parts of a whole, each part a share of the sum.
 *
 * @param {Object} props
 * @param {Array<{key: string, tone: string, value: number}>} props.parts
 */
export function SplitBar({ parts }) {
    const total = parts.reduce((sum, part) => sum + (part.value || 0), 0);
    return (
        <div className="my-1.5 flex h-3 w-full overflow-hidden rounded-full bg-[var(--becpg-grey)]" aria-hidden="true">
            {total > 0 ? parts.filter((part) => part.value > 0).map((part) => (
                <span key={part.key} className="h-full" style={{ width: `${(part.value / total) * 100}%`, background: cssVar(part.tone) }} />
            )) : null}
        </div>
    );
}

/**
 * A KPI card: label, figure, an optional split bar and its legend.
 *
 * @param {Object} props
 * @param {string} props.icon Material icon
 * @param {string} props.label
 * @param {?number|string} props.value `null` renders a dash
 * @param {string} [props.unit] rendered small after the figure ("%", "/ 174")
 * @param {Array} [props.parts] {@link SplitBar} parts; their legend is drawn under it
 * @param {boolean} [props.legend=true] false draws the bar without its legend
 * @param {React.ReactNode} [props.hint] a line under the figure when there is no split
 * @param {React.ReactNode} [props.help] help bubble content
 * @param {React.ReactNode} [props.badge] rendered after the label
 */
export function KpiCard({ icon, label, value, unit, parts, legend = true, hint, help, badge, className = '' }) {
    const { lang } = useMessages();
    const shown = typeof value === 'number' ? figure(value, lang) : (value ?? '—');
    return (
        <Card padding="md" animate={false} className={className}>
            <div className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-xs text-[var(--becpg-muted)]">
                    <Icon name={icon} size={16} />
                    <span className="truncate">{label}</span>
                    {help ? <Tooltip content={help} label={label} maxWidth={320} /> : null}
                    {badge}
                </span>
                <span className="text-[28px] font-light leading-tight tabular-nums text-[var(--becpg-ink)]">
                    {shown}
                    {unit ? <small className="ms-1 text-[13px] text-[var(--becpg-muted)]">{unit}</small> : null}
                </span>
                {parts ? <SplitBar parts={parts} /> : null}
                {parts && legend ? <Legend items={parts} /> : null}
                {hint ? <span className="text-[11.5px] text-[var(--becpg-muted)]">{hint}</span> : null}
            </div>
        </Card>
    );
}

/** The amber "to be wired" pill of a block that has no data source yet. */
export function SoonPill({ label }) {
    const local = usePartLabels();
    return (
        <span className="pill pill-warn pill-sm pill-no-dot">
            <Icon name="link" size={13} />
            <span>{label || local.soon}</span>
        </span>
    );
}

/** The neutral pill naming the decision module as the source of a chart. */
export function SourcePill() {
    const local = usePartLabels();
    return <span className="pill pill-neutral pill-sm pill-no-dot">{local.decisionModule}</span>;
}

/** The pill of a block computed on a scan window rather than on the whole park. */
export function WindowPill() {
    const local = usePartLabels();
    return (
        <Tooltip content={local.window} placement="bottom" maxWidth={300}>
            <span className="pill pill-warn pill-sm pill-no-dot">
                <Icon name="filter_center_focus" size={13} />
                <span>≈</span>
            </span>
        </Tooltip>
    );
}

/**
 * Why a block holds no figure.
 *
 * @param {Object} props
 * @param {?string} props.reason the block's `reason`
 */
export function BlockUnavailable({ reason, className = '' }) {
    const local = usePartLabels();
    return (
        <div className={`flex min-h-[160px] flex-col items-center justify-center gap-1.5 text-center text-sm text-[var(--becpg-muted)] ${className}`}>
            <Icon name={reason === NO_DATA ? 'inbox' : 'cloud_off'} size={26} className="text-[var(--becpg-blue-light)]" />
            <span className="font-medium text-[var(--becpg-ink)]">{reason === NO_DATA ? local.empty : local.unavailable}</span>
            <span className="max-w-sm text-xs">{local.reasons[reason] || local.reasons.unavailable}</span>
        </div>
    );
}

/**
 * {@link Chart} with the cockpit's own wording when the library cannot load.
 *
 * @param {Object} props the props of {@link Chart}
 */
export function CockpitChart(props) {
    const local = usePartLabels();
    return <Chart failedLabel={local.chartFailed} {...props} />;
}

/**
 * The export button of a chart card.
 *
 * @param {Object} props
 * @param {Function} props.onClick
 * @param {boolean} [props.disabled]
 */
export function ExportButton({ onClick, disabled = false }) {
    const local = usePartLabels();
    return (
        <Button variant="outline" size="sm" icon="download" onClick={onClick} disabled={disabled}>
            {local.export}
        </Button>
    );
}

/**
 * A chart card: icon, title, actions at the right, the chart and its legend.
 *
 * @param {Object} props
 * @param {string} props.icon
 * @param {string} props.title
 * @param {React.ReactNode} [props.actions]
 * @param {React.ReactNode} [props.help] help bubble content
 */
export function ChartCard({ icon, title, actions, help, className = '', children }) {
    return (
        <Card
            icon={icon}
            title={title}
            animate={false}
            className={className}
            actions={(help || actions) ? (
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {help ? <Tooltip content={help} label={title} maxWidth={320} /> : null}
                    {actions}
                </div>
            ) : null}
        >
            {children}
        </Card>
    );
}

/**
 * Saves rows as a CSV file in the browser. The rows are what the screen already
 * holds, so no request is made.
 *
 * @param {string} name file name without extension
 * @param {Array<{key: string, label: string, get?: Function}>} columns
 * @param {Object[]} rows
 */
export function saveCsv(name, columns, rows) {
    const blob = new Blob([toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

/**
 * HTML-escapes a repository value before it reaches an ECharts tooltip, which
 * renders its formatter output as markup.
 *
 * @param {*} value
 * @returns {string}
 */
export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/** Shared axis styling of the cartesian charts. */
export function axisStyle(palette, extra = {}) {
    return {
        axisLine: { lineStyle: { color: palette.line } },
        axisLabel: { color: palette.muted },
        splitLine: { lineStyle: { color: palette.line } },
        nameTextStyle: { color: palette.muted },
        ...extra,
    };
}

/** Shared tooltip styling. */
export function tooltipStyle(palette, extra = {}) {
    return {
        backgroundColor: TOOLTIP_SURFACE,
        borderColor: palette.line,
        textStyle: { color: palette.ink, fontSize: 12 },
        ...extra,
    };
}
