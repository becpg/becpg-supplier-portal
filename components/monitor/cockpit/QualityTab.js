'use client';

/**
 * The Quality tab of the cockpit: the park health index, four quality KPIs, the
 * risk map, the age of the open non-conformities and the suppliers at risk.
 */

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { RiskList, RISK_LEVELS, describeReason } from '@/components/monitor/RiskList';
import { APPROVAL_TONES, DOCUMENT_TONES, cssVar } from '@/components/monitor/cockpit/palette';
import {
    BlockUnavailable,
    ChartCard,
    CockpitChart,
    ExportButton,
    KpiCard,
    Legend,
    WindowPill,
    BAR_MAX_WIDTH,
    axisStyle,
    escapeHtml,
    fill,
    saveCsv,
    tooltipStyle,
} from '@/components/monitor/cockpit/parts';
import { APPROVAL_ORDER, useVocabulary } from '@/components/monitor/cockpit/vocabulary';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/monitor/cockpit/QualityTab#LABELS', {
    fr: {
        health: 'Santé du parc',
        healthAria: 'Indice de santé {value} sur 100',
        healthOutOf: 'sur 100',
        healthHelp: 'Indice sur 100 : 35 % taux d’agrément, 35 % conformité documentaire, 20 % taux de réponse aux projets, 10 % part des fournisseurs sans NC bloquante.',
        healthPartial: 'Calcul partiel, poids redistribués : {missing} indisponible(s).',
        weights: {
            approval: 'Agrément {weight} %',
            compliance: 'Conformité {weight} %',
            response: 'Réponse {weight} %',
            noBlockingNc: 'Sans NC bloquante {weight} %',
        },
        inputs: {
            approval: 'taux d’agrément',
            compliance: 'conformité documentaire',
            response: 'taux de réponse',
            noBlockingNc: 'part sans NC bloquante',
        },
        compliance: 'Conformité documentaire',
        compliant: 'Conformes',
        complianceHelp: 'Documents obligatoires valides sur les documents obligatoires attendus du périmètre.',
        complianceNoRate: 'Taux indisponible : un compteur a atteint la limite de lecture de beCPG.',
        openNc: 'Non-conformités ouvertes',
        suspended: 'Fournisseurs suspendus',
        outOf: '/ {total}',
        toReview: 'Documents à revoir',
        toReviewHelp: 'Documents à valider et documents expirés, un par fournisseur et par type de document.',
        riskMap: 'Carte des risques',
        riskMapAria: 'Fournisseurs selon le score de risque et les projets ouverts',
        riskMapHelp: 'Horizontal : projets ouverts. Vertical : score de risque. Taille : anomalies (documents manquants et expirés, NC bloquantes). Cliquez sur un fournisseur pour ouvrir sa fiche.',
        openProjects: 'Projets ouverts',
        riskScore: 'Score de risque',
        anomalies: 'Taille : anomalies',
        priorities: 'Zone prioritaire',
        bubble: 'Risque {score} · {projects} projet(s) ouvert(s) · {anomalies} anomalie(s)',
        ncAge: 'Ancienneté des NC ouvertes',
        ncAgeAria: 'Non-conformités ouvertes par ancienneté',
        ncUndated: '{count} NC sans date de création',
        csv: {
            rank: 'Rang',
            supplier: 'Fournisseur',
            code: 'Code',
            status: 'Agrément',
            level: 'Niveau de risque',
            score: 'Score de risque',
            reasons: 'Motifs',
            openProjects: 'Projets ouverts',
            anomalies: 'Anomalies',
        },
    },
    en: {
        health: 'Park health',
        healthAria: 'Health index {value} out of 100',
        healthOutOf: 'out of 100',
        healthHelp: 'Index out of 100: 35 % approval rate, 35 % document compliance, 20 % project response rate, 10 % share of suppliers without a blocking NC.',
        healthPartial: 'Partial computation, weights redistributed: {missing} unavailable.',
        weights: {
            approval: 'Approval {weight} %',
            compliance: 'Compliance {weight} %',
            response: 'Response {weight} %',
            noBlockingNc: 'No blocking NC {weight} %',
        },
        inputs: {
            approval: 'approval rate',
            compliance: 'document compliance',
            response: 'response rate',
            noBlockingNc: 'share without blocking NC',
        },
        compliance: 'Document compliance',
        compliant: 'Compliant',
        complianceHelp: 'Valid mandatory documents over the mandatory documents expected in the perimeter.',
        complianceNoRate: 'Rate unavailable: a counter reached the beCPG read limit.',
        openNc: 'Open non-conformities',
        suspended: 'Suspended suppliers',
        outOf: '/ {total}',
        toReview: 'Documents to review',
        toReviewHelp: 'Documents to validate and expired documents, one per supplier and document type.',
        riskMap: 'Risk map',
        riskMapAria: 'Suppliers by risk score and open projects',
        riskMapHelp: 'Horizontal: open projects. Vertical: risk score. Size: anomalies (missing and expired documents, blocking NCs). Click a supplier to open its sheet.',
        openProjects: 'Open projects',
        riskScore: 'Risk score',
        anomalies: 'Size: anomalies',
        priorities: 'Priority zone',
        bubble: 'Risk {score} · {projects} open project(s) · {anomalies} anomaly(ies)',
        ncAge: 'Age of open NCs',
        ncAgeAria: 'Open non-conformities by age',
        ncUndated: '{count} NC(s) without a creation date',
        csv: {
            rank: 'Rank',
            supplier: 'Supplier',
            code: 'Code',
            status: 'Approval',
            level: 'Risk level',
            score: 'Risk score',
            reasons: 'Reasons',
            openProjects: 'Open projects',
            anomalies: 'Anomalies',
        },
    },
});

/** Colour meaning of each health input, in the gauge legend. */
const HEALTH_TONES = Object.freeze({ approval: 'ok', compliance: 'teal', response: 'blueLight', noBlockingNc: 'orange' });

/** The priority zone of the risk map: this many open projects and this risk score, or more. */
const PRIORITY_ZONE = Object.freeze({ projects: 6, score: 45 });
/** Smallest and largest bubble of the risk map, in px. */
const BUBBLE_SIZE = Object.freeze({ min: 8, max: 42 });
/** Translucency of the bubbles, so overlapping suppliers stay visible. */
const BUBBLE_OPACITY = 0.75;
/** Outline of a bubble, the card surface, so touching bubbles stay apart. */
const BUBBLE_BORDER = '#ffffff';
/** Fill and border of the priority zone. */
const ZONE_FILL = 'rgba(179, 38, 30, 0.06)';
const ZONE_BORDER = 'rgba(179, 38, 30, 0.35)';

/** The bubble diameter of `anomalies`, on a square-root scale up to `max`. */
function bubbleSize(anomalies, max) {
    if (max <= 0) {
        return BUBBLE_SIZE.min;
    }
    return BUBBLE_SIZE.min + Math.sqrt(Math.max(0, anomalies) / max) * (BUBBLE_SIZE.max - BUBBLE_SIZE.min);
}

/* ------------------------------------------------------------------------ */
/* Health gauge                                                              */
/* ------------------------------------------------------------------------ */

function HealthCard({ health, local }) {
    const value = health.value;
    const build = useCallback((palette, echarts) => ({
        series: [{
            type: 'gauge',
            startAngle: 210,
            endAngle: -30,
            min: 0,
            max: 100,
            radius: '95%',
            center: ['50%', '60%'],
            progress: {
                show: true,
                width: 14,
                roundCap: true,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                        { offset: 0, color: palette.orange },
                        { offset: 1, color: palette.teal },
                    ]),
                },
            },
            axisLine: { lineStyle: { width: 14, color: [[1, palette.grey]] } },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            pointer: { show: false },
            title: { offsetCenter: [0, '32%'], color: palette.muted, fontSize: 12 },
            detail: { offsetCenter: [0, '-4%'], fontSize: 42, fontWeight: 300, color: palette.ink, formatter: '{value}' },
            data: [{ value, name: local.healthOutOf }],
        }],
    }), [value, local.healthOutOf]);

    const missing = health.missing.map((key) => local.inputs[key]).join(', ');
    const help = health.partial ? `${local.healthHelp} ${fill(local.healthPartial, { missing })}` : local.healthHelp;
    const legend = Object.entries(health.weights).map(([key, weight]) => ({
        key,
        tone: HEALTH_TONES[key],
        label: fill(local.weights[key], { weight: Math.round(weight * 100) }),
    }));

    return (
        <ChartCard icon="health_and_safety" title={local.health} help={help} className="col-span-12 xl:col-span-4">
            {health.available ? (
                <CockpitChart build={build} height={230} label={fill(local.healthAria, { value })} />
            ) : (
                <BlockUnavailable reason="noData" />
            )}
            <Legend items={legend} />
        </ChartCard>
    );
}

/* ------------------------------------------------------------------------ */
/* KPI cards                                                                 */
/* ------------------------------------------------------------------------ */

function QualityKpis({ data, local, words }) {
    const { compliance, nonConformities, park } = data.overview;
    const documents = data.documents.available ? data.documents.totals : null;
    const toReview = documents ? (documents.toValidate || 0) + (documents.expired || 0) : null;
    const blocking = nonConformities.blocking || 0;
    return (
        <div className="col-span-12 grid grid-cols-12 gap-3 sm:gap-4 xl:col-span-8">
            <KpiCard
                className="col-span-12 sm:col-span-6"
                icon="fact_check"
                label={local.compliance}
                value={compliance.rate}
                unit={compliance.rate === null ? undefined : '%'}
                help={compliance.rate === null ? local.complianceNoRate : local.complianceHelp}
                parts={[
                    { key: 'compliant', tone: DOCUMENT_TONES.valid, label: local.compliant, value: compliance.compliant },
                    { key: 'missing', tone: DOCUMENT_TONES.missing, label: words.documents.missing, value: compliance.missing },
                    { key: 'expired', tone: DOCUMENT_TONES.expired, label: words.documents.expired, value: compliance.expired },
                    { key: 'refused', tone: DOCUMENT_TONES.refused, label: words.documents.refused, value: compliance.refused },
                ]}
            />
            <KpiCard
                className="col-span-12 sm:col-span-6"
                icon="report_problem"
                label={local.openNc}
                value={nonConformities.open}
                parts={[
                    { key: 'blocking', tone: 'danger', label: words.nc.blocking, value: blocking },
                    { key: 'nonBlocking', tone: 'warn', label: words.nc.nonBlocking, value: Math.max(0, nonConformities.open - blocking) },
                ]}
            />
            <KpiCard
                className="col-span-12 sm:col-span-6"
                icon="block"
                label={local.suspended}
                value={park.suspended}
                unit={fill(local.outOf, { total: park.scanned })}
                badge={park.truncated ? <WindowPill /> : null}
                parts={APPROVAL_ORDER.map((status) => ({
                    key: status, tone: APPROVAL_TONES[status], label: words.approval[status], value: park[status] || 0,
                }))}
            />
            <KpiCard
                className="col-span-12 sm:col-span-6"
                icon="event_busy"
                label={local.toReview}
                value={toReview}
                help={local.toReviewHelp}
                parts={documents ? [
                    { key: 'toValidate', tone: DOCUMENT_TONES.toValidate, label: words.documents.toValidate, value: documents.toValidate || 0 },
                    { key: 'expired', tone: DOCUMENT_TONES.expired, label: words.documents.expired, value: documents.expired || 0 },
                ] : undefined}
            />
        </div>
    );
}

/* ------------------------------------------------------------------------ */
/* Risk map                                                                  */
/* ------------------------------------------------------------------------ */

/** The ECharts option of the risk map. */
function riskMapOption({ points, palette, local, words }) {
    const maxAnomalies = Math.max(0, ...points.map((point) => point.anomalies));
    const maxProjects = Math.max(PRIORITY_ZONE.projects + 2, ...points.map((point) => point.openProjects + 1));
    const statusSeries = APPROVAL_ORDER.map((status) => ({
        name: words.approval[status],
        type: 'scatter',
        data: points.filter((point) => point.status === status).map((point) => ({
            name: point.name,
            value: [point.openProjects, point.score, point.anomalies],
            href: point.href,
            symbolSize: bubbleSize(point.anomalies, maxAnomalies),
        })),
        itemStyle: { color: palette[APPROVAL_TONES[status]], opacity: BUBBLE_OPACITY, borderColor: BUBBLE_BORDER, borderWidth: 1 },
        emphasis: { scale: 1.2, label: { show: true, formatter: (entry) => entry.name, position: 'top', color: palette.ink } },
    }));
    const zone = {
        type: 'scatter',
        data: [],
        silent: true,
        markArea: {
            silent: true,
            itemStyle: { color: ZONE_FILL, borderColor: ZONE_BORDER, borderType: 'dashed', borderWidth: 1 },
            data: [[{ xAxis: PRIORITY_ZONE.projects, yAxis: PRIORITY_ZONE.score }, { xAxis: maxProjects, yAxis: 100 }]],
        },
    };
    return {
        tooltip: tooltipStyle(palette, {
            formatter: (entry) => (entry.seriesType === 'scatter' && entry.data?.value
                ? `<b>${escapeHtml(entry.name)}</b><br>${fill(local.bubble, {
                    score: entry.value[1], projects: entry.value[0], anomalies: entry.value[2],
                })}`
                : ''),
        }),
        grid: { left: 46, right: 18, top: 18, bottom: 40 },
        xAxis: axisStyle(palette, { name: local.openProjects, nameLocation: 'middle', nameGap: 26, min: 0, max: maxProjects, minInterval: 1 }),
        yAxis: axisStyle(palette, { name: local.riskScore, min: 0, max: 100 }),
        series: [...statusSeries, zone],
    };
}

/** The size legend of the risk map: three discs, smallest to largest. */
function SizeLegend({ max, label }) {
    const steps = [...new Set([1, Math.round(max / 2), max])].filter((step) => step > 0);
    return (
        <div className="flex items-center gap-2 text-[11.5px] text-[var(--becpg-muted)]">
            <span>{label}</span>
            {steps.map((step) => {
                const size = bubbleSize(step, max) / 2;
                return (
                    <span key={step} className="inline-flex items-center gap-1">
                        <span
                            aria-hidden="true"
                            className="inline-block rounded-full border border-[var(--becpg-muted)] bg-[var(--becpg-grey)]"
                            style={{ width: size, height: size }}
                        />
                        <span className="tabular-nums">{step}</span>
                    </span>
                );
            })}
        </div>
    );
}

function RiskMapCard({ suppliers, local, words, lang }) {
    const router = useRouter();
    const points = useMemo(() => (suppliers.available ? suppliers.riskPoints : []), [suppliers]);
    const build = useCallback((palette) => riskMapOption({ points, palette, local, words }), [points, local, words]);
    const open = useCallback((event) => {
        if (event?.data?.href) {
            router.push(event.data.href);
        }
    }, [router]);
    const exportPoints = () => saveCsv('risk-map', [
        { key: 'name', label: local.csv.supplier },
        { key: 'status', label: local.csv.status, get: (row) => words.approval[row.status] || row.status },
        { key: 'score', label: local.csv.score },
        { key: 'level', label: local.csv.level, get: (row) => pickLabels(RISK_LEVELS[row.level] || RISK_LEVELS.low, lang) },
        { key: 'openProjects', label: local.csv.openProjects },
        { key: 'anomalies', label: local.csv.anomalies },
    ], points);
    const maxAnomalies = Math.max(0, ...points.map((point) => point.anomalies));

    return (
        <ChartCard
            icon="bubble_chart"
            title={local.riskMap}
            help={local.riskMapHelp}
            className="col-span-12 xl:col-span-8"
            actions={(
                <>
                    {suppliers.truncated ? <WindowPill /> : null}
                    <ExportButton onClick={exportPoints} disabled={points.length === 0} />
                </>
            )}
        >
            {!suppliers.available ? <BlockUnavailable reason={suppliers.reason} /> : null}
            {suppliers.available && points.length === 0 ? <BlockUnavailable reason="noData" /> : null}
            {points.length > 0 ? (
                <>
                    <CockpitChart build={build} onClick={open} height={360} label={local.riskMapAria} />
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <Legend items={[
                            ...APPROVAL_ORDER.map((status) => ({ key: status, tone: APPROVAL_TONES[status], label: words.approval[status], round: true })),
                        ]}
                        />
                        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--becpg-muted)]">
                            <span aria-hidden="true" className="inline-block h-2.5 w-3.5 rounded-[2px] border border-dashed" style={{ borderColor: cssVar('danger') }} />
                            {local.priorities}
                        </span>
                        <SizeLegend max={maxAnomalies} label={local.anomalies} />
                    </div>
                </>
            ) : null}
        </ChartCard>
    );
}

/* ------------------------------------------------------------------------ */
/* NC ageing                                                                 */
/* ------------------------------------------------------------------------ */

function NcAgeCard({ block, local, words }) {
    const build = useCallback((palette) => ({
        tooltip: tooltipStyle(palette, { trigger: 'axis', axisPointer: { type: 'shadow' } }),
        grid: { left: 30, right: 10, top: 14, bottom: 28 },
        xAxis: axisStyle(palette, { type: 'category', data: block.buckets.map((bucket) => words.ncAges[bucket.key]), splitLine: { show: false } }),
        yAxis: axisStyle(palette, { type: 'value', minInterval: 1 }),
        series: [
            { name: words.nc.blocking, type: 'bar', stack: 'nc', barMaxWidth: BAR_MAX_WIDTH, data: block.buckets.map((bucket) => bucket.blocking), itemStyle: { color: palette.danger } },
            { name: words.nc.nonBlocking, type: 'bar', stack: 'nc', barMaxWidth: BAR_MAX_WIDTH, data: block.buckets.map((bucket) => bucket.nonBlocking), itemStyle: { color: palette.warn, borderRadius: [4, 4, 0, 0] } },
        ],
    }), [block, words]);

    return (
        <ChartCard
            icon="hourglass_bottom"
            title={local.ncAge}
            className="col-span-12 xl:col-span-4"
            actions={block.truncated ? <WindowPill /> : null}
        >
            {block.available ? (
                <>
                    <Legend items={[
                        { key: 'blocking', tone: 'danger', label: words.nc.blocking },
                        { key: 'nonBlocking', tone: 'warn', label: words.nc.nonBlocking },
                    ]}
                    />
                    <CockpitChart build={build} height={320} label={local.ncAgeAria} />
                    {block.undated > 0 ? (
                        <p className="text-[11.5px] text-[var(--becpg-muted)]">{fill(local.ncUndated, { count: block.undated })}</p>
                    ) : null}
                </>
            ) : (
                <BlockUnavailable reason={block.reason} />
            )}
        </ChartCard>
    );
}

/* ------------------------------------------------------------------------ */
/* Tab                                                                       */
/* ------------------------------------------------------------------------ */

/** The CSV columns of the top risk list. */
function riskCsvColumns(local, words, lang) {
    return [
        { key: 'rank', label: local.csv.rank, get: (row) => row.rank },
        { key: 'name', label: local.csv.supplier },
        { key: 'code', label: local.csv.code },
        { key: 'status', label: local.csv.status, get: (row) => row.approval?.statusLabel || words.approval[row.approval?.status] || '' },
        { key: 'level', label: local.csv.level, get: (row) => pickLabels(RISK_LEVELS[row.risk?.level] || RISK_LEVELS.low, lang) },
        { key: 'score', label: local.csv.score, get: (row) => row.risk?.score ?? '' },
        {
            key: 'reasons',
            label: local.csv.reasons,
            get: (row) => (row.risk?.reasons || []).map((reason) => describeReason(reason, lang)?.label).filter(Boolean).join(' ; '),
        },
    ];
}

/**
 * @param {Object} props
 * @param {Object} props.data the `/monitor/cockpit` payload
 * @param {Function} props.onRefresh reloads the payload after an action
 */
export function QualityTab({ data, onRefresh }) {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    const words = useVocabulary();
    const topRisk = data.overview.available ? data.overview.topRisk || [] : [];
    const exportRisk = () => saveCsv(
        'suppliers-at-risk',
        riskCsvColumns(local, words, lang),
        topRisk.map((row, index) => ({ ...row, rank: index + 1 })),
    );

    return (
        <div className="grid grid-cols-12 gap-3 sm:gap-4">
            <HealthCard health={data.health} local={local} />
            {data.overview.available ? (
                <QualityKpis data={data} local={local} words={words} />
            ) : (
                <div className="col-span-12 xl:col-span-8"><BlockUnavailable reason={data.overview.reason} /></div>
            )}
            <RiskMapCard suppliers={data.suppliers} local={local} words={words} lang={lang} />
            <NcAgeCard block={data.nonConformities} local={local} words={words} />
            <RiskList
                className="col-span-12"
                items={topRisk}
                onRefresh={onRefresh}
                actions={<ExportButton onClick={exportRisk} disabled={topRisk.length === 0} />}
            />
        </div>
    );
}
