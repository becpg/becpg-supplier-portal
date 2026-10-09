'use client';

/**
 * `/monitor/campaigns/[id]` — one referencing campaign, opened (spec §4.6.1).
 *
 * ## Why this screen exists
 *
 * `/monitor/campaigns` could tell that a campaign was silent but could not tell
 * what the supplier had actually entered: its rows were clickable nowhere, even
 * though the payload already published an `href` to this route — which answered
 * nothing. A referencing manager had to go through the supplier record, and only
 * when the campaign named a supplier.
 *
 * Three blocks, and nothing else:
 *
 *  1. the campaign — the same facts as the row of the list, because it is
 *     literally the same row (`toCampaignRow`, server side);
 *  2. the open tasks — who owes what, by when, and how long it has been late.
 *     That is where "the supplier did not answer" is read;
 *  3. what the campaign is about — a product or a supplier, each with the route
 *     that opens it. That is the link that was missing: from there the product
 *     record shows the data being entered, tab by tab, and the discussion
 *     carries the thread the supplier reads in the assistant.
 *
 * The discussion thread of the project is shown right here: a reminder is
 * discussed on the campaign, not on the product record.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppShell, PageHeader } from '@/components/shell/AppShell';
import { Button, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { GaugeBar } from '@/components/ui/Gauge';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { CommentsPanel } from '@/components/wizard/panels/CommentsPanel';
import { projectStateLabel } from '@/components/monitor/CampaignList';
import { formatDate } from '@/lib/format';
import { routeParamId, useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('app/monitor/campaigns/[id]/page#LABELS', {
    fr: {
        back: 'Projets',
        notFound: 'Projet introuvable',
        notFoundHint:
            'Ce projet n’existe pas, n’est pas un projet fournisseur, ou il est hors de votre périmètre.',
        kpi: {
            response: 'Taux de réponse',
            age: 'Ouverte depuis',
            due: 'Échéance',
            tasks: 'Tâches en cours',
        },
        hints: {
            days: '{count} j',
            noDue: 'Aucune échéance',
            overdue: '{count} j de retard',
            dueIn: 'dans {count} j',
            late: '{count} en retard',
            unanswered: 'Aucune réponse depuis l’ouverture',
        },
        tasks: 'Tâches en cours',
        tasksEmpty: 'Aucune tâche ouverte sur ce projet.',
        tasksHint: 'Ce que le circuit attend, et de qui.',
        noAssignee: 'Non assignée',
        entities: 'Ce sur quoi porte le projet',
        entitiesHint: 'Ouvrez la fiche pour lire les données en cours de saisie et la discussion.',
        entitiesEmpty: 'Ce projet ne référence aucune fiche.',
        unreadable: 'Hors de votre périmètre',
        open: 'Ouvrir',
        suppliers: 'Fournisseurs',
        manager: 'Responsable',
        discussion: 'Discussion du projet',
        state: 'État',
    },
    en: {
        back: 'Projects',
        notFound: 'Project not found',
        notFoundHint:
            'This project does not exist, is not a supplier project, or is outside your perimeter.',
        kpi: {
            response: 'Response rate',
            age: 'Open for',
            due: 'Due date',
            tasks: 'Open tasks',
        },
        hints: {
            days: '{count} d',
            noDue: 'No due date',
            overdue: '{count} d late',
            dueIn: 'in {count} d',
            late: '{count} late',
            unanswered: 'No answer since it opened',
        },
        tasks: 'Open tasks',
        tasksEmpty: 'No open task on this project.',
        tasksHint: 'What the workflow is waiting for, and from whom.',
        noAssignee: 'Unassigned',
        entities: 'What the project is about',
        entitiesHint: 'Open the sheet to read the data being entered and its discussion.',
        entitiesEmpty: 'This project references no sheet.',
        unreadable: 'Outside your perimeter',
        open: 'Open',
        suppliers: 'Suppliers',
        manager: 'Manager',
        discussion: 'Project discussion',
        state: 'State',
    },
});

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])));
}

/**
 * @returns {JSX.Element}
 */
export default function CampaignPage() {
    const params = useParams();
    // Decoded once here, encoded at each call site — see `routeParamId`.
    const id = routeParamId(params.id);
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);

    const call = useApi(id ? `monitor/campaigns/${encodeURIComponent(id)}` : null);
    const data = call.data;

    const campaign = data ? data.campaign : null;
    const tasks = useMemo(() => (data && data.tasks) || [], [data]);
    const entities = useMemo(() => (data && data.entities) || [], [data]);
    const lateTasks = useMemo(() => tasks.filter((task) => task.late).length, [tasks]);

    if (call.error) {
        // 403 and 404 share the same screen: the portal never confirms the
        // existence of a node the caller's permissions do not cover.
        const outOfScope = call.error.isNotFound || call.error.status === 403;
        return (
            <AppShell title={labels.notFound}>
                {outOfScope ? (
                    <EmptyState
                        variant="error"
                        icon="search_off"
                        title={labels.notFound}
                        message={labels.notFoundHint}
                        actionLabel={labels.back}
                        actionHref="/monitor/campaigns"
                    />
                ) : (
                    <ErrorState error={call.error} onRetry={call.refresh} />
                )}
            </AppShell>
        );
    }

    if (!campaign) {
        return (
            <AppShell title={labels.back}>
                <div className="flex flex-col gap-3">
                    <SkeletonCard lines={3} />
                    <SkeletonCard lines={5} />
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell ownHeading
            title={campaign.name}
            fullWidth
            aside={
                <div className="hidden lg:block">
                    <CommentsPanel entityNodeRef={campaign.nodeRef} title={labels.discussion} />
                </div>
            }
        >
            <PageHeader
                title={campaign.name}
                meta={[campaign.code, projectStateLabel(campaign.state, lang)]
                    .filter(Boolean)
                    .join(' · ')}
                actions={
                    <>
                        <Button variant="ghost" size="sm" icon="arrow_back" href="/monitor/campaigns">
                            {labels.back}
                        </Button>
                    </>
                }
            />

            <StatGrid className="mb-4">
                <StatCard
                    label={labels.kpi.response}
                    value={`${campaign.completion || 0} %`}
                    hint={campaign.unanswered ? labels.hints.unanswered : undefined}
                    tone={campaign.unanswered ? 'warn' : undefined}
                    icon="query_stats"
                />
                <StatCard
                    label={labels.kpi.age}
                    value={campaign.ageDays === null || campaign.ageDays === undefined
                        ? '—'
                        : fill(labels.hints.days, { count: campaign.ageDays })}
                    hint={formatDate(campaign.startedAt, lang) || undefined}
                    icon="schedule"
                />
                <StatCard
                    label={labels.kpi.due}
                    value={campaign.dueDate ? formatDate(campaign.dueDate, lang) : '—'}
                    hint={campaign.dueDate
                        ? (campaign.isLate
                            ? fill(labels.hints.overdue, { count: Math.abs(campaign.daysToDue || 0) })
                            : fill(labels.hints.dueIn, { count: campaign.daysToDue ?? 0 }))
                        : labels.hints.noDue}
                    tone={campaign.isLate ? 'danger' : undefined}
                    icon="event"
                />
                <StatCard
                    label={labels.kpi.tasks}
                    value={tasks.length}
                    hint={lateTasks > 0 ? fill(labels.hints.late, { count: lateTasks }) : undefined}
                    tone={lateTasks > 0 ? 'danger' : undefined}
                    icon="assignment"
                />
            </StatGrid>

            <div className="grid gap-4 xl:grid-cols-2">
                {/* ------------------------------------------ what it is about */}
                <Card title={labels.entities} subtitle={labels.entitiesHint} padding="md">
                    {entities.length === 0 ? (
                        <EmptyState variant="empty" icon="link_off" title={labels.entitiesEmpty} compact />
                    ) : (
                        <ul className="flex flex-col divide-y divide-[var(--becpg-grey)]">
                            {entities.map((entity) => (
                                <li
                                    key={entity.nodeRef}
                                    className="flex items-center gap-2 py-2 first:pt-0 last:pb-0"
                                >
                                    <Icon
                                        name={entity.type === 'bcpg:supplier' ? 'apartment' : 'inventory_2'}
                                        size={18}
                                        className="shrink-0 text-[var(--becpg-dark-grey)]"
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm">{entity.name || '—'}</span>
                                        {entity.code ? (
                                            <span className="block truncate text-xs text-[var(--becpg-dark-grey)]">
                                                {entity.code}
                                            </span>
                                        ) : null}
                                    </span>
                                    {/* A reference the account cannot read keeps its
                                        row and loses its link: a button leading to a
                                        403 is worse than a plain mention. */}
                                    {entity.href && entity.readable ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            icon="open_in_new"
                                            href={entity.href}
                                            className="shrink-0"
                                        >
                                            {labels.open}
                                        </Button>
                                    ) : (
                                        <span className="shrink-0 text-xs text-[var(--becpg-dark-grey)]">
                                            {labels.unreadable}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    {campaign.suppliers.length > 0 ? (
                        <div className="mt-3 border-t border-[var(--becpg-grey)] pt-3">
                            <p className="text-[11px] uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                                {labels.suppliers}
                            </p>
                            <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                {campaign.suppliers.map((supplier) => (
                                    <li key={supplier.nodeRef}>
                                        <Link
                                            href={`/monitor/suppliers/${encodeURIComponent(supplier.nodeRef)}`}
                                            className="rounded text-sm underline underline-offset-2 hover:text-[var(--becpg-blue-light)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                                        >
                                            {supplier.label || supplier.nodeRef}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    {campaign.manager ? (
                        <p className="mt-3 text-xs text-[var(--becpg-dark-grey)]">
                            {labels.manager}
                            {' : '}
                            {campaign.manager.label || campaign.manager.username}
                        </p>
                    ) : null}
                </Card>

                {/* -------------------------------------------------- the tasks */}
                <Card title={labels.tasks} subtitle={labels.tasksHint} padding="md">
                    {tasks.length === 0 ? (
                        <EmptyState variant="empty" icon="task_alt" title={labels.tasksEmpty} compact />
                    ) : (
                        <ul className="flex flex-col divide-y divide-[var(--becpg-grey)]">
                            {tasks.map((task) => (
                                <li key={task.nodeRef} className="py-2 first:pt-0 last:pb-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                            {task.name || '—'}
                                        </span>
                                        <StatusPill
                                            status={task.late ? 'late' : task.done ? 'completed' : 'inProgress'}
                                            tone={task.late ? 'danger' : task.done ? 'ok' : 'info'}
                                            size="sm"
                                        />
                                    </div>
                                    <p className="mt-0.5 text-xs text-[var(--becpg-dark-grey)]">
                                        {(task.assignees || []).length > 0
                                            ? task.assignees
                                                .map((entry) => entry.label || entry.username)
                                                .join(', ')
                                            : labels.noAssignee}
                                        {task.dueDate ? ` · ${formatDate(task.dueDate, lang)}` : ''}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="mt-3 border-t border-[var(--becpg-grey)] pt-3">
                        <GaugeBar
                            value={campaign.completion || 0}
                            label={labels.kpi.response}
                            showValue
                        />
                    </div>
                </Card>
            </div>

            {/* Below `lg` there is no side column. */}
            <div className="mt-4 lg:hidden">
                <CommentsPanel entityNodeRef={campaign.nodeRef} title={labels.discussion} />
            </div>
        </AppShell>
    );
}
