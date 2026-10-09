'use client';

/**
 * The R&D tab of the cockpit: project progress, tasks, technical sheets and the
 * freshness of the supplier files.
 */

import { useCallback, useMemo } from 'react';
import { HistoryUnavailable } from '@/components/monitor/SupplierScorecard';
import { APPROVAL_TONES } from '@/components/monitor/cockpit/palette';
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
    escapeHtml,
    figure,
    fill,
    tooltipStyle,
} from '@/components/monitor/cockpit/parts';
import { APPROVAL_ORDER, useVocabulary } from '@/components/monitor/cockpit/vocabulary';
import { formatDate } from '@/lib/format';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/monitor/cockpit/RndTab#LABELS', {
    fr: {
        progress: 'Avancement moyen {year}',
        progressNoYear: 'Avancement moyen',
        projects: '{count} projet(s)',
        tasksInProgress: 'Tâches en cours',
        tasksPlanned: '{count} planifiée(s)',
        technicalSheets: 'Fiches techniques manquantes',
        technicalSheetsHint: '{toValidate} à valider · {expired} expirée(s)',
        technicalSheetsHelp: 'Types de document dont le libellé contient « fiche technique », un par fournisseur concerné.',
        activeFiles: 'Dossiers actifs',
        activeSince: 'Dernière activité depuis le {date}',
        activeHelp: 'Fournisseurs modifiés depuis le début du trimestre précédent.',
        projectProgress: 'Avancement des projets',
        projectProgressAria: 'Nombre de projets et avancement moyen par année',
        projectProgressHelp: 'Barres : projets par année de dernière modification. Ligne : avancement moyen en %.',
        projectsSeries: 'Projets',
        averageSeries: 'Avancement moyen (%)',
        landscape: 'Paysage du parc',
        landscapeAria: 'Fournisseurs par famille et statut d’agrément',
        landscapeHelp: 'Fournisseurs par famille et par statut d’agrément. Vue 3D quand le navigateur le permet, barres groupées sinon.',
        freshness: 'Fraîcheur des dossiers',
        freshnessAria: 'Fournisseurs par mois de dernière activité',
        recent: 'Actifs depuis le {date}',
        older: 'Plus anciens',
        undated: '{count} fournisseur(s) sans date d’activité',
        fromCube: 'Lu dans le module décisionnel de beCPG, alimenté par lot.',
    },
    en: {
        progress: 'Average progress {year}',
        progressNoYear: 'Average progress',
        projects: '{count} project(s)',
        tasksInProgress: 'Tasks in progress',
        tasksPlanned: '{count} planned',
        technicalSheets: 'Missing technical sheets',
        technicalSheetsHint: '{toValidate} to validate · {expired} expired',
        technicalSheetsHelp: 'Document types whose label contains "technical sheet", one per supplier concerned.',
        activeFiles: 'Active files',
        activeSince: 'Last activity since {date}',
        activeHelp: 'Suppliers modified since the start of the previous quarter.',
        projectProgress: 'Project progress',
        projectProgressAria: 'Number of projects and average progress per year',
        projectProgressHelp: 'Bars: projects per year of last modification. Line: average progress in %.',
        projectsSeries: 'Projects',
        averageSeries: 'Average progress (%)',
        landscape: 'Park landscape',
        landscapeAria: 'Suppliers by family and approval status',
        landscapeHelp: 'Suppliers by family and approval status. 3D view when the browser allows it, grouped bars otherwise.',
        freshness: 'File freshness',
        freshnessAria: 'Suppliers per month of last activity',
        recent: 'Active since {date}',
        older: 'Older',
        undated: '{count} supplier(s) without an activity date',
        fromCube: 'Read from the beCPG decision module, loaded by batch.',
    },
});

/** Progress area under the line, the teal token at low opacity. */
const PROGRESS_AREA = 'rgba(0, 118, 123, 0.12)';
/** Longest family label on an axis, in px, before it is cut. */
const AXIS_LABEL_WIDTH = 90;

/**
 * The completion point of the current year, or the latest one.
 *
 * @param {Object} series `history.completion`
 * @returns {?{label: string, values: Object}}
 */
function currentCompletion(series) {
    if (!series.available || series.points.length === 0) {
        return null;
    }
    const year = String(new Date().getFullYear());
    return series.points.find((point) => point.label === year) || series.points[series.points.length - 1];
}

/** The count of the task state `key`, or `null` when the series is unavailable. */
function stateCount(series, key) {
    if (!series.available) {
        return null;
    }
    return series.points.filter((point) => point.state === key).reduce((sum, point) => sum + (point.count || 0), 0);
}

function RndKpis({ data, local, lang }) {
    const completion = currentCompletion(data.history.completion);
    const average = completion?.values.averageProgress;
    const progress = Number.isFinite(average) ? Math.round(average) : null;
    const sheets = data.documents.available ? data.documents.technicalSheet : null;
    const suppliers = data.suppliers;
    const since = suppliers.available ? formatDate(suppliers.lastActivity.since, lang) : null;
    const planned = stateCount(data.history.taskStates, 'planned');
    return (
        <>
            <KpiCard
                className="col-span-12 sm:col-span-6 xl:col-span-3"
                icon="trending_up"
                label={completion ? fill(local.progress, { year: completion.label }) : local.progressNoYear}
                value={progress}
                unit={progress === null ? undefined : '%'}
                hint={completion ? fill(local.projects, { count: figure(completion.values.projectsNumber, lang) }) : null}
                help={local.fromCube}
            />
            <KpiCard
                className="col-span-12 sm:col-span-6 xl:col-span-3"
                icon="pending_actions"
                label={local.tasksInProgress}
                value={stateCount(data.history.taskStates, 'inProgress')}
                hint={planned === null ? null : fill(local.tasksPlanned, { count: figure(planned, lang) })}
                help={local.fromCube}
            />
            <KpiCard
                className="col-span-12 sm:col-span-6 xl:col-span-3"
                icon="description"
                label={local.technicalSheets}
                value={sheets?.available ? sheets.counts.missing : null}
                unit={sheets?.available ? `/ ${figure(sheets.expected, lang)}` : undefined}
                help={local.technicalSheetsHelp}
                hint={sheets?.available ? fill(local.technicalSheetsHint, {
                    toValidate: figure(sheets.counts.toValidate, lang), expired: figure(sheets.counts.expired, lang),
                }) : null}
            />
            <KpiCard
                className="col-span-12 sm:col-span-6 xl:col-span-3"
                icon="update"
                label={local.activeFiles}
                value={suppliers.available ? suppliers.lastActivity.activeSince : null}
                unit={suppliers.available ? `/ ${figure(suppliers.scanned, lang)}` : undefined}
                help={local.activeHelp}
                hint={since ? fill(local.activeSince, { date: since }) : null}
                badge={suppliers.truncated ? <WindowPill /> : null}
            />
        </>
    );
}

function ProjectProgressCard({ series, local }) {
    const build = useCallback((palette) => ({
        tooltip: tooltipStyle(palette, { trigger: 'axis' }),
        grid: { left: 50, right: 46, top: 30, bottom: 28 },
        xAxis: axisStyle(palette, { type: 'category', data: series.points.map((point) => point.label), splitLine: { show: false } }),
        yAxis: [
            axisStyle(palette, { type: 'value', name: local.projectsSeries, minInterval: 1 }),
            axisStyle(palette, { type: 'value', name: '%', max: 100, splitLine: { show: false } }),
        ],
        series: [
            {
                name: local.projectsSeries,
                type: 'bar',
                barWidth: '40%',
                barMaxWidth: BAR_MAX_WIDTH,
                data: series.points.map((point) => point.values.projectsNumber),
                itemStyle: { color: palette.blueLight, borderRadius: [5, 5, 0, 0] },
            },
            {
                name: local.averageSeries,
                type: 'line',
                yAxisIndex: 1,
                symbolSize: 9,
                data: series.points.map((point) => point.values.averageProgress),
                lineStyle: { color: palette.teal, width: 3 },
                itemStyle: { color: palette.teal },
                areaStyle: { color: PROGRESS_AREA },
            },
        ],
    }), [series, local]);

    return (
        <ChartCard icon="insights" title={local.projectProgress} help={local.projectProgressHelp} className="col-span-12 xl:col-span-6" actions={<SourcePill />}>
            {series.available && series.points.length > 0 ? (
                <>
                    <Legend items={[
                        { key: 'projects', tone: 'blueLight', label: local.projectsSeries },
                        { key: 'average', tone: 'teal', label: local.averageSeries, round: true },
                    ]}
                    />
                    <CockpitChart build={build} height={340} label={local.projectProgressAria} />
                </>
            ) : (
                <HistoryUnavailable history={series} />
            )}
        </ChartCard>
    );
}

/** Whether the reader asked for reduced motion; the 3D view then does not rotate. */
function prefersReducedMotion() {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/** The 3D bar option: families along x, statuses along y, suppliers up. */
function landscape3dOption({ palette, families, names, words }) {
    return {
        tooltip: tooltipStyle(palette, {
            formatter: (entry) => `${escapeHtml(names[entry.value[0]])}<br>${words.approval[APPROVAL_ORDER[entry.value[1]]]} : <b>${entry.value[2]}</b>`,
        }),
        xAxis3D: { type: 'category', name: '', data: names, axisLabel: { color: palette.muted, fontSize: 10, width: AXIS_LABEL_WIDTH, overflow: 'truncate' } },
        yAxis3D: { type: 'category', name: '', data: APPROVAL_ORDER.map((status) => words.approval[status]), axisLabel: { color: palette.muted, fontSize: 10 } },
        zAxis3D: { type: 'value', name: '', axisLabel: { color: palette.muted } },
        grid3D: {
            boxWidth: 170,
            boxDepth: 70,
            axisLine: { lineStyle: { color: palette.line } },
            splitLine: { lineStyle: { color: palette.line } },
            viewControl: { alpha: 22, beta: 32, autoRotate: !prefersReducedMotion(), autoRotateSpeed: 6, distance: 230 },
            light: { main: { intensity: 1.1, shadow: true }, ambient: { intensity: 0.45 } },
        },
        series: APPROVAL_ORDER.map((status, statusIndex) => ({
            name: words.approval[status],
            type: 'bar3D',
            shading: 'lambert',
            barSize: 9,
            itemStyle: { color: palette[APPROVAL_TONES[status]] },
            data: families.map((family, familyIndex) => [familyIndex, statusIndex, family.byStatus[status] || 0]),
        })),
    };
}

/** The 2D fallback: one group of bars per family. */
function landscape2dOption({ palette, families, names, words }) {
    return {
        tooltip: tooltipStyle(palette, { trigger: 'axis', axisPointer: { type: 'shadow' } }),
        grid: { left: 10, right: 10, top: 14, bottom: 10, containLabel: true },
        xAxis: axisStyle(palette, {
            type: 'category', data: names, splitLine: { show: false },
            axisLabel: { color: palette.muted, interval: 0, width: AXIS_LABEL_WIDTH, overflow: 'truncate' },
        }),
        yAxis: axisStyle(palette, { type: 'value', minInterval: 1 }),
        series: APPROVAL_ORDER.map((status) => ({
            name: words.approval[status],
            type: 'bar',
            data: families.map((family) => family.byStatus[status] || 0),
            itemStyle: { color: palette[APPROVAL_TONES[status]], borderRadius: [3, 3, 0, 0] },
        })),
    };
}

function LandscapeCard({ suppliers, local, words }) {
    const families = useMemo(() => (suppliers.available ? suppliers.families : []), [suppliers]);
    const names = useMemo(() => families.map((family) => family.label || words.noFamily), [families, words]);
    const build3d = useCallback((palette) => landscape3dOption({ palette, families, names, words }), [families, names, words]);
    const build2d = useCallback((palette) => landscape2dOption({ palette, families, names, words }), [families, names, words]);
    return (
        <ChartCard
            icon="view_in_ar"
            title={local.landscape}
            help={local.landscapeHelp}
            className="col-span-12 xl:col-span-6"
            actions={suppliers.truncated ? <WindowPill /> : null}
        >
            {families.length > 0 ? (
                <>
                    <Legend items={APPROVAL_ORDER.map((status) => ({ key: status, tone: APPROVAL_TONES[status], label: words.approval[status] }))} />
                    <CockpitChart build={build3d} fallback={build2d} gl height={340} label={local.landscapeAria} />
                </>
            ) : (
                <BlockUnavailable reason={suppliers.available ? 'noData' : suppliers.reason} />
            )}
        </ChartCard>
    );
}

function FreshnessCard({ suppliers, local, lang }) {
    const activity = suppliers.available ? suppliers.lastActivity : null;
    const since = activity ? activity.since.slice(0, 7) : '';
    const recentLabel = activity ? fill(local.recent, { date: formatDate(activity.since, lang) }) : '';
    const build = useCallback((palette) => {
        const months = activity.months;
        return {
            tooltip: tooltipStyle(palette, { trigger: 'axis', axisPointer: { type: 'shadow' } }),
            grid: { left: 30, right: 10, top: 14, bottom: 24 },
            xAxis: axisStyle(palette, { type: 'category', data: months.map((entry) => entry.month), splitLine: { show: false } }),
            yAxis: axisStyle(palette, { type: 'value', minInterval: 1 }),
            series: [
                {
                    name: recentLabel, type: 'bar', stack: 'fresh', barMaxWidth: BAR_MAX_WIDTH,
                    data: months.map((entry) => (entry.month >= since ? entry.count : null)),
                    itemStyle: { color: palette.teal, borderRadius: [4, 4, 0, 0] },
                },
                {
                    name: local.older, type: 'bar', stack: 'fresh', barMaxWidth: BAR_MAX_WIDTH,
                    data: months.map((entry) => (entry.month < since ? entry.count : null)),
                    itemStyle: { color: palette.neutral, borderRadius: [4, 4, 0, 0] },
                },
            ],
        };
    }, [activity, since, recentLabel, local]);

    return (
        <ChartCard icon="history" title={local.freshness} className="col-span-12" actions={suppliers.truncated ? <WindowPill /> : null}>
            {activity && activity.months.length > 0 ? (
                <>
                    <Legend items={[
                        { key: 'recent', tone: 'teal', label: recentLabel },
                        { key: 'older', tone: 'neutral', label: local.older },
                    ]}
                    />
                    <CockpitChart build={build} height={250} label={local.freshnessAria} />
                    {activity.undated > 0 ? (
                        <p className="text-[11.5px] text-[var(--becpg-muted)]">{fill(local.undated, { count: activity.undated })}</p>
                    ) : null}
                </>
            ) : (
                <BlockUnavailable reason={suppliers.available ? 'noData' : suppliers.reason} />
            )}
        </ChartCard>
    );
}

/**
 * @param {Object} props
 * @param {Object} props.data the `/monitor/cockpit` payload
 */
export function RndTab({ data }) {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    const words = useVocabulary();
    return (
        <div className="grid grid-cols-12 gap-3 sm:gap-4">
            <RndKpis data={data} local={local} lang={lang} />
            <ProjectProgressCard series={data.history.completion} local={local} />
            <LandscapeCard suppliers={data.suppliers} local={local} words={words} />
            <FreshnessCard suppliers={data.suppliers} local={local} lang={lang} />
        </div>
    );
}
