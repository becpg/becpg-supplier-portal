'use client';

/**
 * The Purchasing tab of the cockpit: approval and project KPIs, the composition
 * of the park, the reactivity of the suppliers and the tasks of their projects.
 */

import { useCallback, useMemo } from 'react';
import { HistoryUnavailable } from '@/components/monitor/SupplierScorecard';
import { APPROVAL_TONES, TASK_STATE_TONES, familyTone } from '@/components/monitor/cockpit/palette';
import {
    BlockUnavailable,
    ChartCard,
    CockpitChart,
    KpiCard,
    Legend,
    SourcePill,
    WindowPill,
    BAR_MAX_WIDTH,
    axisStyle,
    figure,
    fill,
    tooltipStyle,
} from '@/components/monitor/cockpit/parts';
import { APPROVAL_ORDER, useVocabulary } from '@/components/monitor/cockpit/vocabulary';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/monitor/cockpit/PurchasingTab#LABELS', {
    fr: {
        approved: 'Fournisseurs agréés',
        outOf: '/ {total}',
        openProjects: 'Projets ouverts',
        answered: 'Avec réponse',
        unanswered: 'Sans réponse',
        openProjectsHelp: 'Projets fournisseurs ouverts de toute l’instance : un projet n’est pas rangé sous un fournisseur, les filtres du parc ne s’y appliquent pas.',
        responseRate: 'Taux de réponse',
        meanCompletion: 'Avancement moyen {value} %',
        lateTasks: 'Tâches en retard',
        lateProjects: '{count} projet(s) en retard',
        composition: 'Composition du parc',
        compositionAria: 'Fournisseurs par famille, sous-famille et statut d’agrément',
        compositionHelp: 'Anneau intérieur : familles. Anneau médian : sous-familles. Anneau extérieur : statut d’agrément. Cliquez sur une famille pour la déplier.',
        reactivity: 'Réactivité des fournisseurs',
        reactivityAria: 'Tâches par année et délai de réponse moyen',
        reactivityHelp: 'Barres : tâches des projets fournisseurs par année de fin (échelle logarithmique). Ligne : délai de réponse moyen en jours.',
        tasks: 'Tâches',
        delay: 'Délai de réponse moyen (j)',
        days: 'Jours',
        taskStates: 'Tâches des projets fournisseurs',
        taskStatesAria: 'Tâches par état',
        taskStatesHelp: 'Toutes les tâches des projets fournisseurs lues dans le module décisionnel, par état (échelle logarithmique).',
    },
    en: {
        approved: 'Approved suppliers',
        outOf: '/ {total}',
        openProjects: 'Open projects',
        answered: 'Answered',
        unanswered: 'Unanswered',
        openProjectsHelp: 'Open supplier projects of the whole instance: a project is not filed under a supplier, so the park filters do not apply to it.',
        responseRate: 'Response rate',
        meanCompletion: 'Average progress {value} %',
        lateTasks: 'Late tasks',
        lateProjects: '{count} late project(s)',
        composition: 'Park composition',
        compositionAria: 'Suppliers by family, sub-family and approval status',
        compositionHelp: 'Inner ring: families. Middle ring: sub-families. Outer ring: approval status. Click a family to expand it.',
        reactivity: 'Supplier reactivity',
        reactivityAria: 'Tasks per year and average response delay',
        reactivityHelp: 'Bars: supplier project tasks per end year (logarithmic scale). Line: average response delay in days.',
        tasks: 'Tasks',
        delay: 'Avg. response delay (d)',
        days: 'Days',
        taskStates: 'Supplier project tasks',
        taskStatesAria: 'Tasks by state',
        taskStatesHelp: 'Every supplier project task read from the decision module, by state (logarithmic scale).',
    },
});

/** Width of the white separators between the sunburst sectors. */
const SECTOR_BORDER = 2;
/** White: the separators between sectors and the labels drawn on them. */
const ON_SECTOR = '#ffffff';
/** Sub-family ring translucency, so the family colour reads through. */
const SUB_FAMILY_OPACITY = 0.55;

/* ------------------------------------------------------------------------ */
/* KPIs                                                                      */
/* ------------------------------------------------------------------------ */

function PurchasingKpis({ overview, local, words, lang }) {
    const { park, campaigns, tasks } = overview;
    const rate = campaigns.responseRate;
    return (
        <>
            <KpiCard
                className="col-span-12 sm:col-span-6 xl:col-span-3"
                icon="verified"
                label={local.approved}
                value={park.approved}
                unit={fill(local.outOf, { total: park.scanned })}
                badge={park.truncated ? <WindowPill /> : null}
                parts={APPROVAL_ORDER.map((status) => ({
                    key: status, tone: APPROVAL_TONES[status], label: words.approval[status], value: park[status] || 0,
                }))}
            />
            <KpiCard
                className="col-span-12 sm:col-span-6 xl:col-span-3"
                icon="campaign"
                label={local.openProjects}
                value={campaigns.open}
                help={local.openProjectsHelp}
                parts={[
                    { key: 'answered', tone: 'teal', label: local.answered, value: campaigns.answered || 0 },
                    { key: 'unanswered', tone: 'warn', label: local.unanswered, value: campaigns.unanswered || 0 },
                ]}
            />
            <KpiCard
                className="col-span-12 sm:col-span-6 xl:col-span-3"
                icon="forward_to_inbox"
                label={local.responseRate}
                value={rate}
                unit={rate === null ? undefined : '%'}
                legend={false}
                parts={rate === null ? undefined : [
                    { key: 'rate', tone: 'teal', value: rate },
                    { key: 'rest', tone: 'grey', value: 100 - rate },
                ]}
                hint={fill(local.meanCompletion, { value: figure(campaigns.meanCompletion, lang) })}
            />
            <KpiCard
                className="col-span-12 sm:col-span-6 xl:col-span-3"
                icon="alarm"
                label={local.lateTasks}
                value={tasks.late}
                hint={fill(local.lateProjects, { count: figure(campaigns.late, lang) })}
            />
        </>
    );
}

/* ------------------------------------------------------------------------ */
/* Sunburst                                                                  */
/* ------------------------------------------------------------------------ */

/** The status leaves of a family or sub-family node. */
function statusLeaves(node, palette, words) {
    return APPROVAL_ORDER.filter((status) => node.byStatus[status] > 0).map((status) => ({
        name: words.approval[status],
        value: node.byStatus[status],
        itemStyle: { color: palette[APPROVAL_TONES[status]] },
    }));
}

/** The sunburst data: family, sub-family, approval status. */
function sunburstData(families, palette, words) {
    return families.map((family, index) => {
        const color = palette[familyTone(index)];
        return {
            name: family.label || words.noFamily,
            itemStyle: { color },
            children: (family.children || []).map((sub) => ({
                name: sub.label || words.noSubFamily,
                itemStyle: { color },
                children: statusLeaves(sub, palette, words),
            })),
        };
    });
}

function CompositionCard({ suppliers, local, words }) {
    const families = useMemo(() => (suppliers.available ? suppliers.families : []), [suppliers]);
    const build = useCallback((palette) => ({
        tooltip: tooltipStyle(palette),
        series: [{
            type: 'sunburst',
            data: sunburstData(families, palette, words),
            radius: ['12%', '96%'],
            sort: null,
            nodeClick: 'rootToNode',
            itemStyle: { borderColor: ON_SECTOR, borderWidth: SECTOR_BORDER },
            label: { color: ON_SECTOR, fontSize: 10, minAngle: 14 },
            levels: [
                {},
                { r0: '12%', r: '42%', label: { rotate: 'tangential' } },
                { r0: '42%', r: '80%', itemStyle: { opacity: SUB_FAMILY_OPACITY }, label: { show: false } },
                { r0: '80%', r: '96%', label: { show: false } },
            ],
        }],
    }), [families, words]);

    return (
        <ChartCard
            icon="donut_large"
            title={local.composition}
            help={local.compositionHelp}
            className="col-span-12 xl:col-span-5"
            actions={suppliers.truncated ? <WindowPill /> : null}
        >
            {families.length > 0 ? (
                <>
                    <CockpitChart build={build} height={360} label={local.compositionAria} />
                    <Legend
                        className="mt-2"
                        items={[
                            ...families.map((family, index) => ({
                                key: family.key || 'none', tone: familyTone(index), label: family.label || words.noFamily, value: family.total,
                            })),
                            ...APPROVAL_ORDER.map((status) => ({
                                key: status, tone: APPROVAL_TONES[status], label: words.approval[status], round: true,
                            })),
                        ]}
                    />
                </>
            ) : (
                <BlockUnavailable reason={suppliers.available ? 'noData' : suppliers.reason} />
            )}
        </ChartCard>
    );
}

/* ------------------------------------------------------------------------ */
/* OLAP charts                                                               */
/* ------------------------------------------------------------------------ */

function ReactivityCard({ series, local }) {
    const build = useCallback((palette, echarts) => ({
        tooltip: tooltipStyle(palette, { trigger: 'axis' }),
        grid: { left: 54, right: 50, top: 30, bottom: 28 },
        xAxis: axisStyle(palette, { type: 'category', data: series.points.map((point) => point.label), splitLine: { show: false } }),
        yAxis: [
            axisStyle(palette, { type: 'log', name: local.tasks, min: 1 }),
            axisStyle(palette, { type: 'value', name: local.days, splitLine: { show: false } }),
        ],
        series: [
            {
                name: local.tasks,
                type: 'bar',
                barWidth: '45%',
                barMaxWidth: BAR_MAX_WIDTH,
                // A log axis cannot place zero: an empty year is left blank, not drawn at 1.
                data: series.points.map((point) => (point.values.stepsNumber > 0 ? point.values.stepsNumber : null)),
                itemStyle: {
                    borderRadius: [5, 5, 0, 0],
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: palette.tealLight },
                        { offset: 1, color: palette.teal },
                    ]),
                },
            },
            {
                name: local.delay,
                type: 'line',
                yAxisIndex: 1,
                smooth: true,
                symbolSize: 7,
                connectNulls: false,
                data: series.points.map((point) => point.values.avgResponseDelay),
                lineStyle: { color: palette.orange, width: 3 },
                itemStyle: { color: palette.orange },
            },
        ],
    }), [series, local]);

    return (
        <ChartCard icon="schedule" title={local.reactivity} help={local.reactivityHelp} className="col-span-12 xl:col-span-7" actions={<SourcePill />}>
            {series.available && series.points.length > 0 ? (
                <>
                    <Legend items={[
                        { key: 'tasks', tone: 'teal', label: local.tasks },
                        { key: 'delay', tone: 'orange', label: local.delay, round: true },
                    ]}
                    />
                    <CockpitChart build={build} height={340} label={local.reactivityAria} />
                </>
            ) : (
                <HistoryUnavailable history={series} />
            )}
        </ChartCard>
    );
}

function TaskStatesCard({ series, local, words, lang }) {
    const points = useMemo(() => (series.available ? series.points.filter((point) => point.count > 0) : []), [series]);
    const labelOf = useCallback((point) => (point.state ? words.taskStates[point.state] : point.label), [words]);
    const build = useCallback((palette) => ({
        tooltip: tooltipStyle(palette, { trigger: 'axis', axisPointer: { type: 'shadow' } }),
        grid: { left: 10, right: 70, top: 6, bottom: 6, containLabel: true },
        xAxis: { type: 'log', show: false, min: 1 },
        yAxis: axisStyle(palette, { type: 'category', inverse: true, data: points.map(labelOf), splitLine: { show: false }, axisTick: { show: false } }),
        series: [{
            type: 'bar',
            barWidth: 18,
            data: points.map((point) => ({
                value: point.count,
                itemStyle: { color: palette[TASK_STATE_TONES[point.state] || 'neutral'], borderRadius: 5 },
            })),
            label: { show: true, position: 'right', color: palette.ink, formatter: (entry) => figure(entry.value, lang) },
        }],
    }), [points, labelOf, lang]);

    return (
        <ChartCard icon="filter_alt" title={local.taskStates} help={local.taskStatesHelp} className="col-span-12" actions={<SourcePill />}>
            {points.length > 0 ? (
                <>
                    <CockpitChart build={build} height={Math.max(160, points.length * 34)} label={local.taskStatesAria} />
                    <Legend items={points.map((point) => ({
                        key: point.label, tone: TASK_STATE_TONES[point.state] || 'neutral', label: labelOf(point), value: point.count,
                    }))}
                    />
                </>
            ) : (
                <HistoryUnavailable history={series.available ? { available: false, reason: 'noData' } : series} />
            )}
        </ChartCard>
    );
}

/**
 * @param {Object} props
 * @param {Object} props.data the `/monitor/cockpit` payload
 */
export function PurchasingTab({ data }) {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    const words = useVocabulary();
    return (
        <div className="grid grid-cols-12 gap-3 sm:gap-4">
            {data.overview.available ? (
                <PurchasingKpis overview={data.overview} local={local} words={words} lang={lang} />
            ) : (
                <div className="col-span-12"><BlockUnavailable reason={data.overview.reason} /></div>
            )}
            <CompositionCard suppliers={data.suppliers} local={local} words={words} />
            <ReactivityCard series={data.history.taskTrend} local={local} />
            <TaskStatesCard series={data.history.taskStates} local={local} words={words} lang={lang} />
        </div>
    );
}
