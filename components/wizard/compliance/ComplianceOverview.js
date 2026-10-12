'use client';

/**
 * The compliance step, in the cockpit's grammar: a verdict, the catalogue
 * messages, where the work is (by step and by catalogue), then the fields and
 * documents still expected. Every figure comes from {@link buildComplianceModel}.
 */

import { useCallback, useMemo, useState } from 'react';
import { Button, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Gauge, toneForValue } from '@/components/ui/Gauge';
import { ChartCard, CockpitChart, Legend, escapeHtml, fill, tooltipStyle, axisStyle } from '@/components/monitor/cockpit/parts';
import { MESSAGE_KINDS, SEVERITY } from '@/lib/compliance';
import { formatDate } from '@/lib/format';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/wizard/compliance/ComplianceOverview#LABELS', {
    fr: {
        blockingTitle: '{count} point(s) bloquant(s) avant l’envoi',
        toCompleteTitle: '{count} point(s) à compléter',
        readyTitle: 'Prêt à envoyer',
        blocking: 'Bloquant',
        toComplete: 'À compléter',
        document: 'Document',
        blockingCount: '{count} bloquant(s)',
        toCompleteCount: '{count} à compléter',
        messagesCount: '{count} message(s)',
        start: 'Commencer par {step}',
        messages: 'Ce que votre client vous signale',
        rule: 'Règle',
        duplicate: 'Doublon',
        usedBy: 'déjà utilisé par {names}',
        usedByOthers: '{count} autre(s) fiche(s)',
        byStep: 'Par étape',
        byStepAria: 'Points à traiter par étape',
        byCatalog: 'Par catalogue',
        byCatalogAria: 'Score de complétude par catalogue',
        expected: 'Champs et documents attendus',
        all: 'Tout ({count})',
        blockingOnly: 'Bloquants ({count})',
        other: 'Autres',
        goToStep: 'Voir l’étape',
        goToField: 'Aller au champ',
        renew: 'Renouveler',
        missing: 'Manquant',
        expired: 'Expiré le {date}',
        refused: 'Refusé',
    },
    en: {
        blockingTitle: '{count} blocking point(s) before sending',
        toCompleteTitle: '{count} point(s) to complete',
        readyTitle: 'Ready to send',
        blocking: 'Blocking',
        toComplete: 'To complete',
        document: 'Document',
        blockingCount: '{count} blocking',
        toCompleteCount: '{count} to complete',
        messagesCount: '{count} message(s)',
        start: 'Start with {step}',
        messages: 'What your customer points out',
        rule: 'Rule',
        duplicate: 'Duplicate',
        usedBy: 'already used by {names}',
        usedByOthers: '{count} other record(s)',
        byStep: 'By step',
        byStepAria: 'Points to deal with, by step',
        byCatalog: 'By catalogue',
        byCatalogAria: 'Completeness score by catalogue',
        expected: 'Expected fields and documents',
        all: 'All ({count})',
        blockingOnly: 'Blocking ({count})',
        other: 'Other',
        goToStep: 'Go to the step',
        goToField: 'Go to the field',
        renew: 'Renew',
        missing: 'Missing',
        expired: 'Expired on {date}',
        refused: 'Refused',
    },
});

const SEVERITY_TONE = { [SEVERITY.BLOCKING]: 'danger', [SEVERITY.TO_COMPLETE]: 'warn' };
const CHART_TONES = { blocking: 'danger', toComplete: 'orange', documents: 'blueLight' };
const STEP_ROW_HEIGHT = 30;
const CATALOG_RING_HEIGHT = 240;

function SeverityPill({ severity, labels }) {
    const blocking = severity === SEVERITY.BLOCKING;
    return (
        <span className={`pill pill-sm pill-no-dot ${blocking ? 'pill-danger' : 'pill-warn'}`}>
            <Icon name={blocking ? 'block' : 'edit_note'} size={13} />
            {blocking ? labels.blocking : labels.toComplete}
        </span>
    );
}

/** The first step holding a blocking point, else any point. */
function firstStepToFix(bySteps) {
    return bySteps.steps.find((step) => step.blocking + step.documents > 0)
        || bySteps.steps.find((step) => step.toComplete > 0)
        || null;
}

function Verdict({ model, score, labels, onGoToStep }) {
    const { blocking, toComplete, messages } = model.totals;
    const first = firstStepToFix(model.bySteps);
    const title = blocking > 0 ? fill(labels.blockingTitle, { count: blocking })
        : toComplete > 0 ? fill(labels.toCompleteTitle, { count: toComplete })
            : labels.readyTitle;
    return (
        <Card padding="md" animate={false}>
            <div className="flex flex-wrap items-center gap-4">
                {typeof score === 'number' ? <Gauge value={score} size={96} thickness={9} /> : null}
                <div className="min-w-0 flex-1">
                    <h2 className={`text-lg font-medium ${blocking > 0 ? 'text-[var(--status-danger)]' : toComplete > 0 ? 'text-[var(--becpg-ink)]' : 'text-[var(--status-ok)]'}`}>
                        {title}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {blocking > 0 ? <span className="pill pill-sm pill-no-dot pill-danger">{fill(labels.blockingCount, { count: blocking })}</span> : null}
                        {messages > 0 ? <span className="pill pill-sm pill-no-dot pill-info">{fill(labels.messagesCount, { count: messages })}</span> : null}
                        {toComplete > 0 ? <span className="pill pill-sm pill-no-dot pill-warn">{fill(labels.toCompleteCount, { count: toComplete })}</span> : null}
                    </div>
                </div>
                {first && onGoToStep ? (
                    <Button variant="primary" icon="arrow_forward" onClick={() => onGoToStep(first.id)}>
                        {fill(labels.start, { step: first.label })}
                    </Button>
                ) : null}
            </div>
        </Card>
    );
}

function duplicateText(message, labels) {
    const named = message.entities.map((entity) => (typeof entity === 'string' ? null : entity?.name)).filter(Boolean);
    const others = message.entities.length - named.length;
    const names = [...named, ...(others > 0 ? [fill(labels.usedByOthers, { count: others })] : [])];
    const head = message.value ? `${message.text} « ${message.value} »` : message.text;
    return names.length > 0 ? `${head} : ${fill(labels.usedBy, { names: names.join(', ') })}` : head;
}

function MessageRow({ message, stepLabel, labels, onGoToStep, onFieldClick }) {
    const duplicate = message.kind === MESSAGE_KINDS.DUPLICATE;
    const tone = SEVERITY_TONE[message.severity];
    const go = duplicate && onFieldClick ? () => onFieldClick(message.field)
        : message.stepId && onGoToStep ? () => onGoToStep(message.stepId) : null;
    return (
        <li className="flex items-stretch gap-3 rounded-xl bg-[var(--becpg-page-surface)] py-2.5 pe-3">
            <span className={`w-1 shrink-0 rounded-e bg-[var(--status-${tone})]`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-snug text-[var(--becpg-ink)]">{duplicate ? duplicateText(message, labels) : message.text}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[var(--becpg-dark-grey)]">
                    <SeverityPill severity={message.severity} labels={labels} />
                    <span className="inline-flex items-center gap-1">
                        <Icon name={duplicate ? 'content_copy' : 'rule'} size={14} />
                        {duplicate ? labels.duplicate : labels.rule}
                    </span>
                    <span>{message.catalogs.join(' · ')}</span>
                    {stepLabel ? <span>· {stepLabel}</span> : null}
                    {message.locale ? <span>· {String(message.locale).toUpperCase()}</span> : null}
                </p>
            </div>
            {go ? (
                <Button variant="outline" size="sm" icon="arrow_forward" onClick={go} className="self-center">
                    {duplicate ? labels.goToField : labels.goToStep}
                </Button>
            ) : null}
        </li>
    );
}

function Messages({ model, stepLabels, labels, onGoToStep, onFieldClick }) {
    if (model.messages.length === 0) {
        return null;
    }
    return (
        <Card icon="campaign" title={labels.messages} padding="md" animate={false}>
            <ul className="flex flex-col gap-2">
                {model.messages.map((message) => (
                    <MessageRow
                        key={`${message.kind}-${message.text}-${message.locale || ''}`}
                        message={message}
                        stepLabel={stepLabels.get(message.stepId)}
                        labels={labels}
                        onGoToStep={onGoToStep}
                        onFieldClick={onFieldClick}
                    />
                ))}
            </ul>
        </Card>
    );
}

function StepsChart({ model, labels, onGoToStep }) {
    const steps = model.bySteps.steps;
    const build = useCallback((palette) => ({
        tooltip: tooltipStyle(palette, { trigger: 'axis', axisPointer: { type: 'shadow' } }),
        grid: { left: 8, right: 16, top: 6, bottom: 6, containLabel: true },
        xAxis: axisStyle(palette, { type: 'value', minInterval: 1 }),
        yAxis: axisStyle(palette, {
            type: 'category', inverse: true, data: steps.map((step) => step.label),
            axisTick: { show: false }, axisLabel: { color: palette.ink, width: 140, overflow: 'truncate' },
        }),
        series: [
            ['blocking', labels.blocking], ['toComplete', labels.toComplete], ['documents', labels.document],
        ].map(([key, name]) => ({
            name, type: 'bar', stack: 'points', barWidth: 14,
            data: steps.map((step) => step[key] || null),
            itemStyle: { color: palette[CHART_TONES[key]] },
        })),
    }), [steps, labels]);
    const onClick = useCallback((event) => {
        const step = steps[event.dataIndex];
        if (step && onGoToStep) {
            onGoToStep(step.id);
        }
    }, [steps, onGoToStep]);
    return (
        <ChartCard icon="stacked_bar_chart" title={labels.byStep}>
            <Legend items={[
                { key: 'blocking', tone: CHART_TONES.blocking, label: labels.blocking },
                { key: 'toComplete', tone: CHART_TONES.toComplete, label: labels.toComplete },
                { key: 'documents', tone: CHART_TONES.documents, label: labels.document },
            ]}
            />
            <CockpitChart build={build} onClick={onClick} height={Math.max(160, steps.length * STEP_ROW_HEIGHT + 20)} label={labels.byStepAria} />
        </ChartCard>
    );
}

function CatalogChart({ model, labels }) {
    const catalogs = useMemo(() => model.catalogs.filter((catalog) => catalog.score !== null), [model.catalogs]);
    const build = useCallback((palette) => ({
        tooltip: tooltipStyle(palette, {
            formatter: (item) => `${escapeHtml(item.name)} : <b>${Math.round(item.value)} %</b>`,
        }),
        angleAxis: { max: 100, startAngle: 90, show: false },
        radiusAxis: { type: 'category', data: catalogs.map((catalog) => catalog.label), show: false },
        polar: { radius: ['22%', '90%'], center: ['50%', '50%'] },
        series: [{
            type: 'bar', coordinateSystem: 'polar', roundCap: true, barWidth: 14,
            showBackground: true, backgroundStyle: { color: palette.grey },
            data: catalogs.map((catalog) => ({
                name: catalog.label,
                value: catalog.score,
                itemStyle: { color: palette[toneForValue(catalog.score)] },
            })),
            label: {
                show: true, position: 'start', color: palette.ink, fontSize: 11,
                formatter: (item) => `${item.name}  ${Math.round(item.value)} %`,
            },
        }],
    }), [catalogs]);
    if (catalogs.length === 0) {
        return null;
    }
    return (
        <ChartCard icon="donut_large" title={labels.byCatalog}>
            <CockpitChart build={build} height={CATALOG_RING_HEIGHT} label={labels.byCatalogAria} />
        </ChartCard>
    );
}

function documentState(item, labels, lang) {
    if (item.status === 'expired') {
        return fill(labels.expired, { date: formatDate(item.validTo, lang) });
    }
    return item.status === 'refused' ? labels.refused : labels.missing;
}

function ExpectedRow({ point, labels, lang, onFieldClick, onOpenDocuments }) {
    const isDocument = Boolean(point.requirement);
    const label = point.locale ? `${point.label} (${String(point.locale).toUpperCase()})` : point.label;
    const go = isDocument ? onOpenDocuments : onFieldClick ? () => onFieldClick(point.field) : null;
    return (
        <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 hover:bg-[var(--becpg-blue-lighter)]/40">
            <Icon
                name={isDocument ? 'description' : point.severity === SEVERITY.BLOCKING ? 'block' : 'edit_note'}
                size={20}
                className={`shrink-0 text-[var(--status-${SEVERITY_TONE[point.severity]})]`}
            />
            <span className="min-w-0 flex-1">
                <span className="block font-medium text-[var(--becpg-ink)]">{label}</span>
                <span className="block text-xs text-[var(--becpg-dark-grey)]">
                    {isDocument ? documentState(point, labels, lang) : point.catalogs.join(' · ')}
                </span>
            </span>
            <SeverityPill severity={point.severity} labels={labels} />
            {go ? (
                <Button variant="outline" size="sm" icon={isDocument ? 'upload_file' : 'arrow_forward'} onClick={go}>
                    {isDocument ? labels.renew : labels.goToField}
                </Button>
            ) : null}
        </li>
    );
}

function Expected({ model, steps, labels, lang, onFieldClick, onOpenDocuments }) {
    const [blockingOnly, setBlockingOnly] = useState(false);
    const points = [...model.fields, ...model.documents];
    const blockingCount = points.filter((point) => point.severity === SEVERITY.BLOCKING).length;
    const shown = blockingOnly ? points.filter((point) => point.severity === SEVERITY.BLOCKING) : points;
    if (points.length === 0) {
        return null;
    }
    const groups = [...steps.map((step) => ({ id: step.id, label: step.label })), { id: null, label: labels.other }]
        .map((group) => ({ ...group, points: shown.filter((point) => (point.stepId || null) === group.id) }))
        .filter((group) => group.points.length > 0);
    const filters = (
        <div className="flex gap-1" role="group">
            {[[false, fill(labels.all, { count: points.length })], [true, fill(labels.blockingOnly, { count: blockingCount })]].map(([value, text]) => (
                <button
                    key={String(value)}
                    type="button"
                    aria-pressed={blockingOnly === value}
                    onClick={() => setBlockingOnly(value)}
                    className={`rounded-full border px-3 py-1 text-xs ${blockingOnly === value
                        ? 'border-[var(--becpg-blue)] bg-[var(--becpg-blue)] text-white'
                        : 'border-[var(--becpg-line)] text-[var(--becpg-dark-grey)] hover:text-[var(--becpg-ink)]'}`}
                >
                    {text}
                </button>
            ))}
        </div>
    );
    return (
        <Card icon="checklist" title={labels.expected} actions={filters} padding="md" animate={false}>
            {groups.map((group) => (
                <section key={group.id || 'other'} className="-mx-4 border-t border-[var(--becpg-line)] pb-1 last:-mb-4">
                    <h3 className="px-4 pb-1 pt-2.5 text-xs font-medium uppercase tracking-wide text-[var(--becpg-dark-grey)]">{group.label}</h3>
                    <ul className="flex flex-col">
                        {group.points.map((point) => (
                            <ExpectedRow
                                key={`${point.label}-${point.locale || ''}-${point.stepId || ''}`}
                                point={point}
                                labels={labels}
                                lang={lang}
                                onFieldClick={onFieldClick}
                                onOpenDocuments={onOpenDocuments}
                            />
                        ))}
                    </ul>
                </section>
            ))}
        </Card>
    );
}

/**
 * @param {Object} props
 * @param {ReturnType<import('@/lib/compliance').buildComplianceModel>} props.model
 * @param {?number} props.score the overall completion score
 * @param {Function} [props.onGoToStep] `(stepId) => void`
 * @param {Function} [props.onFieldClick] `(field) => void`
 * @param {Function} [props.onOpenDocuments]
 */
export function ComplianceOverview({ model, score, onGoToStep, onFieldClick, onOpenDocuments }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const steps = model.bySteps.steps;
    const stepLabels = useMemo(() => new Map(steps.map((step) => [step.id, step.label])), [steps]);
    return (
        <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
            <Verdict model={model} score={score} labels={labels} onGoToStep={onGoToStep} />
            <Messages model={model} stepLabels={stepLabels} labels={labels} onGoToStep={onGoToStep} onFieldClick={onFieldClick} />
            {steps.length > 0 || model.catalogs.length > 0 ? (
                <div className="grid grid-cols-1 items-start gap-3 sm:gap-4 xl:grid-cols-5">
                    {steps.length > 0 ? <div className="min-w-0 xl:col-span-3"><StepsChart model={model} labels={labels} onGoToStep={onGoToStep} /></div> : null}
                    <div className="min-w-0 xl:col-span-2"><CatalogChart model={model} labels={labels} /></div>
                </div>
            ) : null}
            <Expected model={model} steps={steps} labels={labels} lang={lang} onFieldClick={onFieldClick} onOpenDocuments={onOpenDocuments} />
        </div>
    );
}
