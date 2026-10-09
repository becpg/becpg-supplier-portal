'use client';

/**
 * The two charts of the supplier dashboard, built with the cockpit's chart
 * parts so both spaces read alike: the due dates of the coming weeks, and the
 * completeness of each catalogue the customer checks.
 */

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toneForValue } from '@/components/ui/Gauge';
import {
    BAR_MAX_WIDTH,
    BlockUnavailable,
    ChartCard,
    CockpitChart,
    Legend,
    axisStyle,
    escapeHtml,
    fill,
    tooltipStyle,
} from '@/components/monitor/cockpit/parts';
import { useMessages } from '@/lib/messages';
import { formatDayMonth } from '@/lib/format';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LOCAL = defineLabels('components/dashboard/DashboardCharts#LOCAL', {
    fr: {
        schedule: 'Mes échéances',
        scheduleAria: 'Tâches à rendre et documents arrivant à expiration, semaine par semaine',
        tasks: 'Tâches à rendre',
        documents: 'Documents qui expirent',
        overdue: 'En retard',
        thisWeek: 'Cette semaine',
        later: 'Plus tard',
        undated: '{count} tâche(s) sans échéance',
        catalogs: 'Complétude par catalogue',
        catalogsAria: 'Score de complétude du produit le moins complet, par catalogue',
        catalogsHint: 'Score du produit le moins complet de chaque catalogue.',
    },
    en: {
        schedule: 'My due dates',
        scheduleAria: 'Tasks due and documents expiring, week by week',
        tasks: 'Tasks due',
        documents: 'Documents expiring',
        overdue: 'Overdue',
        thisWeek: 'This week',
        later: 'Later',
        undated: '{count} task(s) without a due date',
        catalogs: 'Completeness by catalogue',
        catalogsAria: 'Completeness score of the least complete product, per catalogue',
        catalogsHint: 'Score of the least complete product of each catalogue.',
    },
});

const SERIES = { tasks: 'tasks', documents: 'documents' };

/** Where a click on a bar of the schedule leads. */
const SCHEDULE_TARGETS = {
    tasks: { overdue: '/tasks?late=1', other: '/tasks' },
    documents: { overdue: '/documents?status=expired', other: '/documents?status=expiring' },
};

/** Height of one catalogue row, so a long list grows the chart instead of squeezing it. */
const CATALOG_ROW_HEIGHT = 34;

/** The columns of the schedule: overdue, the weeks, then everything later. */
function scheduleColumns(schedule, local, lang) {
    return [
        { key: 'overdue', label: local.overdue, ...schedule.overdue },
        ...schedule.weeks.map((week, index) => ({
            key: week.start,
            label: index === 0 ? local.thisWeek : formatDayMonth(week.start, lang),
            tasks: week.tasks,
            documents: week.documents,
        })),
        { key: 'later', label: local.later, ...schedule.later },
    ];
}

/**
 * @param {Object} props
 * @param {ReturnType<import('@/lib/schedule').buildSchedule>|null} props.schedule
 */
export function ScheduleChart({ schedule, className = '' }) {
    const { lang } = useMessages();
    const local = pickLabels(LOCAL, lang);
    const router = useRouter();
    const columns = useMemo(() => (schedule ? scheduleColumns(schedule, local, lang) : []), [schedule, local, lang]);
    const empty = columns.every((column) => column.tasks + column.documents === 0);

    const build = useCallback((palette) => ({
        tooltip: tooltipStyle(palette, { trigger: 'axis', axisPointer: { type: 'shadow' } }),
        grid: { left: 30, right: 10, top: 14, bottom: 24 },
        xAxis: axisStyle(palette, {
            type: 'category',
            data: columns.map((column) => column.label),
            splitLine: { show: false },
            axisLabel: { color: palette.muted, interval: 0, hideOverlap: true },
        }),
        yAxis: axisStyle(palette, { type: 'value', minInterval: 1 }),
        series: [
            {
                id: SERIES.tasks, name: local.tasks, type: 'bar', stack: 'due', barMaxWidth: BAR_MAX_WIDTH,
                data: columns.map((column, index) => ({
                    value: column.tasks || null,
                    itemStyle: { color: index === 0 ? palette.danger : palette.blue },
                })),
            },
            {
                id: SERIES.documents, name: local.documents, type: 'bar', stack: 'due', barMaxWidth: BAR_MAX_WIDTH,
                data: columns.map((column) => column.documents || null),
                itemStyle: { color: palette.orange, borderRadius: [4, 4, 0, 0] },
            },
        ],
    }), [columns, local]);

    const onClick = useCallback((event) => {
        const target = SCHEDULE_TARGETS[event.seriesId];
        if (target) {
            router.push(event.dataIndex === 0 ? target.overdue : target.other);
        }
    }, [router]);

    return (
        <ChartCard icon="event" title={local.schedule} className={className}>
            {!schedule || empty ? (
                <BlockUnavailable reason="noData" />
            ) : (
                <>
                    <Legend items={[
                        { key: 'tasks', tone: 'blue', label: local.tasks },
                        { key: 'documents', tone: 'orange', label: local.documents },
                    ]}
                    />
                    <CockpitChart build={build} onClick={onClick} height={260} label={local.scheduleAria} />
                    {schedule.undatedTasks > 0 ? (
                        <p className="text-[11.5px] text-[var(--becpg-muted)]">{fill(local.undated, { count: schedule.undatedTasks })}</p>
                    ) : null}
                </>
            )}
        </ChartCard>
    );
}

/**
 * @param {Object} props
 * @param {Array<{id: string, label: string, score: number}>} props.catalogs
 *        `buildDashboard().completion.catalogs`, worst first
 */
export function CatalogChart({ catalogs, className = '' }) {
    const { lang } = useMessages();
    const local = pickLabels(LOCAL, lang);
    // ECharts draws a category axis bottom-up: reversed, the worst comes on top.
    const rows = useMemo(() => (Array.isArray(catalogs) ? [...catalogs].reverse() : []), [catalogs]);

    const build = useCallback((palette) => ({
        tooltip: tooltipStyle(palette, {
            trigger: 'item',
            formatter: (item) => `${escapeHtml(item.name)}<br/><b>${Math.round(item.value)} %</b>`,
        }),
        grid: { left: 8, right: 40, top: 6, bottom: 6, containLabel: true },
        xAxis: axisStyle(palette, { type: 'value', max: 100, show: false }),
        yAxis: axisStyle(palette, {
            type: 'category',
            data: rows.map((row) => row.label),
            axisTick: { show: false },
            axisLabel: { color: palette.ink, width: 170, overflow: 'truncate' },
        }),
        series: [{
            type: 'bar', barMaxWidth: 16,
            showBackground: true, backgroundStyle: { color: palette.grey, borderRadius: 8 },
            data: rows.map((row) => ({
                name: row.label,
                value: row.score,
                itemStyle: { color: palette[toneForValue(row.score)], borderRadius: 8 },
            })),
            label: { show: true, position: 'right', color: palette.muted, formatter: (item) => `${Math.round(item.value)} %` },
        }],
    }), [rows]);

    return (
        <ChartCard icon="donut_large" title={local.catalogs} help={local.catalogsHint} className={className}>
            {rows.length === 0 ? (
                <BlockUnavailable reason="noData" />
            ) : (
                <CockpitChart build={build} height={Math.max(120, rows.length * CATALOG_ROW_HEIGHT + 20)} label={local.catalogsAria} />
            )}
        </ChartCard>
    );
}
