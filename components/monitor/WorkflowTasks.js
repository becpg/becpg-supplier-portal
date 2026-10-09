'use client';

/**
 * The tasks running on a sheet — a non-conformity, a product, a supplier — as
 * Share's workflow view lists them: what is open, who holds it, by when, and,
 * on demand, what was already done. Each open task opens on the page where it
 * is treated: its project task page, or its workflow task page.
 *
 * Monitoring space only: the route answers 403 to a supplier account.
 */

import { useState } from 'react';
import { Button, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { DateText } from '@/components/ui/DateText';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/monitor/WorkflowTasks#LABELS', {
    fr: {
        title: 'Tâches en cours',
        none: 'Aucune tâche en cours',
        pooled: 'À prendre',
        unassigned: 'Non assignée',
        due: 'Échéance',
        open: 'Ouvrir',
        history: 'Historique ({count})',
        hideHistory: 'Masquer l’historique',
        doneBy: 'par {who}',
    },
    en: {
        title: 'Tasks in progress',
        none: 'No task in progress',
        pooled: 'To claim',
        unassigned: 'Unassigned',
        due: 'Due',
        open: 'Open',
        history: 'History ({count})',
        hideHistory: 'Hide the history',
        doneBy: 'by {who}',
    },
});

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) => (vars[key] ?? match));
}

function OpenTask({ task, workflow, labels, lang }) {
    return (
        <li className="flex flex-col gap-2 border-b border-[var(--becpg-line)] py-3 last:border-0 sm:flex-row sm:items-center sm:gap-4">
            <Icon name={task.pooled ? 'group' : 'assignment_ind'} size={20} className="hidden shrink-0 text-[var(--becpg-blue)] sm:block" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={task.title}>{task.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--becpg-muted)]">
                    <span>{workflow.title}</span>
                    <span className="inline-flex items-center gap-1">
                        {task.pooled ? <span className="font-medium text-[var(--becpg-ink)]">{labels.pooled}</span> : null}
                        {task.assignee || labels.unassigned}
                    </span>
                    {task.dueDate ? (
                        <span className="inline-flex items-center gap-1">
                            {labels.due} <DateText value={task.dueDate} lang={lang} />
                        </span>
                    ) : null}
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                {task.late ? <StatusPill status="late" size="sm" /> : null}
                <Button size="sm" href={task.href} icon="arrow_forward">{labels.open}</Button>
            </div>
        </li>
    );
}

function DoneTask({ task, labels, lang }) {
    return (
        <li className="flex items-start gap-2 py-2 text-sm">
            <Icon name="task_alt" size={16} className="mt-0.5 shrink-0 text-[var(--status-ok)]" />
            <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{task.title}</span>
                    {task.assignee ? <span className="text-[var(--becpg-muted)]">{fill(labels.doneBy, { who: task.assignee })}</span> : null}
                    {task.completedAt ? <DateText value={task.completedAt} lang={lang} withTime className="text-xs text-[var(--becpg-muted)]" /> : null}
                </p>
                {task.outcome ? <p className="text-xs text-[var(--becpg-muted)]">{task.outcome}</p> : null}
                {task.comment ? <p className="mt-1 whitespace-pre-line text-xs">{task.comment}</p> : null}
            </div>
        </li>
    );
}

function History({ workflows, labels, lang }) {
    const [open, setOpen] = useState(false);
    const done = workflows.flatMap((workflow) => workflow.tasks.filter((task) => !task.open));
    if (done.length === 0) {
        return null;
    }
    return (
        <div className="mt-2 border-t border-[var(--becpg-line)] pt-2">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className="inline-flex items-center gap-1 text-sm text-[var(--becpg-blue)]"
            >
                <Icon name={open ? 'expand_less' : 'history'} size={18} />
                {open ? labels.hideHistory : fill(labels.history, { count: done.length })}
            </button>
            {open ? (
                <ul className="mt-1">
                    {done.map((task) => <DoneTask key={task.id} task={task} labels={labels} lang={lang} />)}
                </ul>
            ) : null}
        </div>
    );
}

/**
 * @param {Object} props
 * @param {string} props.entityId nodeRef or uuid of the sheet
 * @param {boolean} [props.hideWhenIdle=false] render nothing while no task is open —
 *        for a sheet where tasks are the exception, not the subject
 * @param {string} [props.className]
 */
export function WorkflowTasks({ entityId, hideWhenIdle = false, className = '' }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const call = useApi(entityId ? `entities/${encodeURIComponent(entityId)}/workflows` : null);

    if (call.loading && !call.data) {
        return hideWhenIdle ? null : <SkeletonCard lines={2} className={className} />;
    }
    if (call.error) {
        return hideWhenIdle ? null : <ErrorState error={call.error} onRetry={call.refresh} compact className={className} />;
    }
    const workflows = call.data?.workflows || [];
    const openCount = call.data?.openCount || 0;
    if (hideWhenIdle && openCount === 0) {
        return null;
    }

    return (
        <Card
            className={className}
            icon="pending_actions"
            title={<span className="inline-flex items-center gap-2">{labels.title}<span className="pill pill-sm pill-no-dot pill-info tabular-nums">{openCount}</span></span>}
        >
            {openCount === 0 ? (
                <p className="text-sm text-[var(--becpg-muted)]">{labels.none}</p>
            ) : (
                <ul>
                    {workflows.flatMap((workflow) => workflow.tasks
                        .filter((task) => task.open)
                        .map((task) => <OpenTask key={task.id} task={task} workflow={workflow} labels={labels} lang={lang} />))}
                </ul>
            )}
            <History workflows={workflows} labels={labels} lang={lang} />
        </Card>
    );
}
