'use client';

/**
 * The Assistant tab of the cockpit.
 *
 * The priorities of the week are computed by fixed rules from the riskiest
 * suppliers (`weeklyPriorities()` in the cockpit adapter): they are real data,
 * and nothing on this tab presents them as written by a model. The copilot is not
 * wired to any assistant yet and says so; it holds no conversation.
 */

import { useId } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button, Icon } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { MonitorActionButtons, describeReason } from '@/components/monitor/RiskList';
import { BlockUnavailable, ChartCard, SoonPill, fill } from '@/components/monitor/cockpit/parts';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/monitor/cockpit/AssistantTab#LABELS', {
    fr: {
        priorities: 'Priorités de la semaine',
        prioritiesHelp: 'Calculées par règles sur les fournisseurs les plus à risque : risque critique avec NC bloquante, à escalader ; document expiré, au moins cinq documents manquants ou projet sans réponse, à relancer.',
        kinds: { escalate: 'À escalader', remind: 'À relancer' },
        score: 'Risque {score}',
        openSheet: 'Ouvrir la fiche',
        none: 'Aucune priorité cette semaine dans ce périmètre.',
        copilot: 'Copilote',
        wire: 'À câbler côté beCPG',
        copilotSoon: 'Le copilote répondra aux questions sur votre parc une fois branché à l’assistant de beCPG.',
        ask: 'Posez une question sur votre parc…',
        askLabel: 'Question au copilote',
    },
    en: {
        priorities: 'Priorities of the week',
        prioritiesHelp: 'Computed by rules on the riskiest suppliers: critical risk with a blocking NC, to escalate; an expired document, at least five missing documents or a project without answer, to remind.',
        kinds: { escalate: 'To escalate', remind: 'To remind' },
        score: 'Risk {score}',
        openSheet: 'Open the sheet',
        none: 'No priority this week in this perimeter.',
        copilot: 'Copilot',
        wire: 'To be wired in beCPG',
        copilotSoon: 'The copilot will answer questions about your park once it is connected to the beCPG assistant.',
        ask: 'Ask a question about your park…',
        askLabel: 'Question to the copilot',
    },
});

/** Pill tone of each priority kind. */
const KIND_TONES = Object.freeze({ escalate: 'danger', remind: 'warn' });
const KIND_ICONS = Object.freeze({ escalate: 'arrow_upward', remind: 'send' });

/** The target shape the action dialog expects. */
function actionTarget(item) {
    return { ...item, risk: { reasons: item.reasons, actions: item.action ? [item.action] : [], score: item.score, level: item.level } };
}

function PriorityRow({ item, local, lang, onDone }) {
    const reasons = item.reasons.map((reason) => describeReason(reason, lang)?.label).filter(Boolean).join(' · ');
    return (
        <li className="grid grid-cols-1 items-center gap-2 rounded-xl border border-[var(--becpg-line)] px-3 py-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
            <span className={`pill pill-sm pill-no-dot pill-${KIND_TONES[item.kind]} justify-self-start`}>
                <Icon name={KIND_ICONS[item.kind]} size={13} />
                <span>{local.kinds[item.kind]}</span>
            </span>
            <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link href={item.href} className="truncate text-sm font-medium text-[var(--becpg-ink)] hover:underline">
                        {item.name}
                    </Link>
                    <StatusPill status={item.approval.status} label={item.approval.statusLabel || undefined} size="sm" />
                    <span className="text-xs tabular-nums text-[var(--becpg-muted)]">{fill(local.score, { score: item.score })}</span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-[var(--becpg-muted)]" title={reasons}>{reasons}</span>
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
                <Button variant="outline" size="sm" icon="open_in_new" href={item.href}>{local.openSheet}</Button>
                {item.action ? <MonitorActionButtons targets={[actionTarget(item)]} allowed={[item.action]} onDone={onDone} /> : null}
            </span>
        </li>
    );
}

function PrioritiesCard({ priorities, local, lang, onRefresh }) {
    return (
        <ChartCard icon="summarize" title={local.priorities} help={local.prioritiesHelp} className="col-span-12 xl:col-span-7">
            {!priorities.available ? <BlockUnavailable reason={priorities.reason} /> : null}
            {priorities.available && priorities.items.length === 0 ? (
                <p className="text-sm text-[var(--becpg-muted)]">{local.none}</p>
            ) : null}
            {priorities.available && priorities.items.length > 0 ? (
                <ul className="flex flex-col gap-2">
                    {priorities.items.map((item) => (
                        <PriorityRow key={item.nodeRef} item={item} local={local} lang={lang} onDone={onRefresh} />
                    ))}
                </ul>
            ) : null}
        </ChartCard>
    );
}

function CopilotCard({ local }) {
    const inputId = useId();
    return (
        <Card icon="forum" title={local.copilot} animate={false} className="col-span-12 xl:col-span-5" actions={<SoonPill label={local.wire} />}>
            <p className="text-sm text-[var(--becpg-muted)]">{local.copilotSoon}</p>
            <label htmlFor={inputId} className="sr-only">{local.askLabel}</label>
            <div className="mt-3 flex items-center gap-2 rounded-full border border-[var(--becpg-field-border)] bg-[var(--becpg-grey)] px-3.5 py-2 text-[var(--becpg-muted)]">
                <Icon name="auto_awesome" size={18} className="text-[var(--becpg-teal)]" />
                <input
                    id={inputId}
                    type="text"
                    disabled
                    placeholder={local.ask}
                    className="min-w-0 flex-1 cursor-not-allowed bg-transparent text-sm outline-none"
                />
            </div>
        </Card>
    );
}

/**
 * @param {Object} props
 * @param {Object} props.data the `/monitor/cockpit` payload
 * @param {Function} props.onRefresh reloads the payload after an action
 */
export function AssistantTab({ data, onRefresh }) {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    return (
        <div className="grid grid-cols-12 gap-3 sm:gap-4">
            <PrioritiesCard priorities={data.priorities} local={local} lang={lang} onRefresh={onRefresh} />
            <CopilotCard local={local} />
        </div>
    );
}
