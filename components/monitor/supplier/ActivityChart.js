'use client';

/**
 * The supplier's activity and responsiveness per year, from beCPG's decision
 * module: the tasks it was given as bars, its mean response delay as a line.
 */

import { useCallback, useMemo } from 'react';
import { HistoryUnavailable } from '@/components/monitor/SupplierScorecard';
import { BAR_MAX_WIDTH, CockpitChart, Legend, axisStyle, tooltipStyle } from '@/components/monitor/cockpit/parts';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/monitor/supplier/ActivityChart#LABELS', {
    fr: {
        tasks: 'Tâches',
        delay: 'Délai de réponse moyen (j)',
        days: 'j',
        aria: 'Tâches et délai de réponse moyen par année pour ce fournisseur',
    },
    en: {
        tasks: 'Tasks',
        delay: 'Mean response delay (d)',
        days: 'd',
        aria: 'Tasks and mean response delay per year for this supplier',
    },
});

/**
 * @param {Object} props
 * @param {Object} props.history the `GET /monitor/history?series=taskTrend` payload
 */
export function ActivityChart({ history }) {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    const points = useMemo(() => history?.points || [], [history]);

    const build = useCallback((palette) => ({
        tooltip: tooltipStyle(palette, { trigger: 'axis' }),
        grid: { left: 44, right: 48, top: 16, bottom: 28 },
        xAxis: axisStyle(palette, { type: 'category', data: points.map((point) => point.label), splitLine: { show: false } }),
        yAxis: [
            axisStyle(palette, { type: 'value', minInterval: 1 }),
            axisStyle(palette, { type: 'value', splitLine: { show: false }, axisLabel: { color: palette.muted, formatter: `{value} ${local.days}` } }),
        ],
        series: [
            {
                name: local.tasks,
                type: 'bar',
                barWidth: '32%',
                barMaxWidth: BAR_MAX_WIDTH,
                data: points.map((point) => point.values.stepsNumber),
                itemStyle: { color: palette.teal, borderRadius: [5, 5, 0, 0] },
            },
            {
                name: local.delay,
                type: 'line',
                yAxisIndex: 1,
                symbolSize: 8,
                data: points.map((point) => point.values.avgResponseDelay),
                lineStyle: { color: palette.orange, width: 3 },
                itemStyle: { color: palette.orange },
            },
        ],
    }), [points, local]);

    if (!history?.available || points.length === 0) {
        return <HistoryUnavailable history={history?.available ? { available: false, reason: 'noData' } : history || { available: false, reason: 'unreachable' }} />;
    }
    return (
        <>
            <Legend items={[
                { key: 'tasks', tone: 'teal', label: local.tasks },
                { key: 'delay', tone: 'orange', label: local.delay, round: true },
            ]}
            />
            <CockpitChart build={build} height={240} label={local.aria} />
        </>
    );
}

/**
 * The latest period of the series that carries a response delay.
 *
 * @param {Object} history
 * @returns {{label: string, value: number}|null}
 */
export function latestDelay(history) {
    const points = (history?.available && history.points) || [];
    for (let index = points.length - 1; index >= 0; index -= 1) {
        const value = points[index].values?.avgResponseDelay;
        if (typeof value === 'number') {
            return { label: points[index].label, value };
        }
    }
    return null;
}
