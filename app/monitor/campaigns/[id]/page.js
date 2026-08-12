'use client';

/**
 * `/monitor/campaigns/[id]` — **une campagne de référencement, ouverte**
 * (spec §4.6.1).
 *
 * ## Pourquoi cet écran existe
 *
 * `/monitor/campaigns` savait dire qu'une campagne était muette et ne savait pas
 * dire *ce que le fournisseur avait saisi* : ses lignes n'étaient cliquables
 * nulle part, alors même que la charge utile publiait déjà un `href` vers cette
 * route — qui ne répondait pas. Un responsable référencement devait passer par la
 * fiche fournisseur, et seulement quand la campagne nommait un fournisseur.
 *
 * Trois blocs, et rien d'autre :
 *
 *  1. **la campagne** — les mêmes faits que la ligne de la liste, parce que c'est
 *     littéralement la même ligne (`toCampaignRow` côté serveur) ;
 *  2. **les tâches en cours** — qui doit quoi, pour quand, et depuis quand c'est
 *     en retard. C'est là que se lit « le fournisseur n'a pas répondu » ;
 *  3. **ce sur quoi porte la campagne** — produit ou fournisseur, chacun avec la
 *     route qui l'ouvre. C'est le lien qui manquait : de là, la fiche produit
 *     montre les données en cours de saisie, onglet par onglet, et la discussion
 *     porte le fil que le fournisseur lit dans son assistant.
 *
 * Le fil de discussion du **projet** est affiché ici même : une relance se
 * discute sur la campagne, pas sur la fiche produit.
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
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        back: 'Campagnes',
        refresh: 'Rafraîchir',
        notFound: 'Campagne introuvable',
        notFoundHint:
            'Cette campagne n’existe pas, n’est pas une campagne fournisseur, ou elle est hors de votre périmètre.',
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
        tasksEmpty: 'Aucune tâche ouverte sur cette campagne.',
        tasksHint: 'Ce que le circuit attend, et de qui.',
        noAssignee: 'Non assignée',
        entities: 'Ce sur quoi porte la campagne',
        entitiesHint: 'Ouvrez la fiche pour lire les données en cours de saisie et la discussion.',
        entitiesEmpty: 'Cette campagne ne référence aucune fiche.',
        unreadable: 'Hors de votre périmètre',
        open: 'Ouvrir',
        suppliers: 'Fournisseurs',
        manager: 'Responsable',
        discussion: 'Discussion de la campagne',
        state: 'État',
    },
    en: {
        back: 'Campaigns',
        refresh: 'Refresh',
        notFound: 'Campaign not found',
        notFoundHint:
            'This campaign does not exist, is not a supplier campaign, or is outside your perimeter.',
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
        tasksEmpty: 'No open task on this campaign.',
        tasksHint: 'What the workflow is waiting for, and from whom.',
        noAssignee: 'Unassigned',
        entities: 'What the campaign is about',
        entitiesHint: 'Open the sheet to read the data being entered and its discussion.',
        entitiesEmpty: 'This campaign references no sheet.',
        unreadable: 'Outside your perimeter',
        open: 'Open',
        suppliers: 'Suppliers',
        manager: 'Manager',
        discussion: 'Campaign discussion',
        state: 'State',
    },
};

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])));
}

/**
 * @returns {JSX.Element}
 */
export default function CampaignPage() {
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;

    const call = useApi(id ? `monitor/campaigns/${encodeURIComponent(id)}` : null);
    const data = call.data;

    const campaign = data ? data.campaign : null;
    const tasks = useMemo(() => (data && data.tasks) || [], [data]);
    const entities = useMemo(() => (data && data.entities) || [], [data]);
    const lateTasks = useMemo(() => tasks.filter((task) => task.late).length, [tasks]);

    if (call.error) {
        // 403 et 404 partagent le même écran : le portail ne confirme jamais
        // l'existence d'un nœud que les droits de l'appelant ne couvrent pas.
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
        <AppShell
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
                description={[campaign.code, projectStateLabel(campaign.state, lang)]
                    .filter(Boolean)
                    .join(' · ')}
                actions={
                    <>
                        <Button variant="ghost" size="sm" icon="arrow_back" href="/monitor/campaigns">
                            {labels.back}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            icon="refresh"
                            loading={call.loading}
                            onClick={call.refresh}
                        >
                            {labels.refresh}
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
                                    {/* Un renvoi que le compte ne peut pas lire garde
                                        sa ligne et perd son lien : un bouton menant à
                                        un 403 est pire qu'une mention. */}
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

            {/* Sous `lg` il n'y a pas de colonne latérale. */}
            <div className="mt-4 lg:hidden">
                <CommentsPanel entityNodeRef={campaign.nodeRef} title={labels.discussion} />
            </div>
        </AppShell>
    );
}
