'use client';

/**
 * `/tasks` — **Mes tâches**, the full list with its filters (spec §4.2, §4.3).
 *
 * Filters: type, échéance, priorité, produit — exactly the four the spec names,
 * plus the free-text search `DataTable` provides and an "en cours / terminées"
 * switch.
 *
 * ## Why a client screen
 *
 * The dashboard is server-rendered because it is read once; this list is
 * *manipulated*. `GET /api/v1/tasks` merges two sources and enriches every
 * candidate before it can even tell a wizard from a signature, so re-querying
 * beCPG on each keystroke would be wasteful and slow. The page therefore loads
 * the whole open backlog once (the adapter caps its own scan) and filters in
 * memory — instant, and every counter stays consistent because they all come
 * from the same snapshot. Only the "en cours / terminées" switch changes the
 * query, because completed tasks are a different upstream read.
 *
 * A row click goes **straight** to `/tasks/{uuid}` — no intermediate screen,
 * and the beCPG deliverable URL is never rewritten (invariant I1).
 */

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell, PageHeader } from '@/components/shell/AppShell';
import { Button, Icon } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Field';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { TASK_TYPE_META, taskTypeLabel } from '@/components/dashboard/ActionsCard';
import { DueBadge, PriorityPill, daysUntil } from '@/components/dashboard/TaskList';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

/**
 * Screen vocabulary. These are list mechanics ("Toutes les échéances"), not
 * beCPG business labels, so they stay local rather than inflating
 * `config/messages.js` — the same call `Nav.js` and `DataTable.js` already make.
 */
const LOCAL = {
    fr: {
        title: 'Mes tâches',
        description: 'Tout ce que votre client attend de vous, filtrable et trié par urgence.',
        search: 'Rechercher une tâche, un produit, un code…',
        anyType: 'Tous les types',
        anyPriority: 'Toutes les priorités',
        anyProduct: 'Tous les produits',
        anyDue: 'Toutes les échéances',
        dueLate: 'En retard',
        dueToday: 'Aujourd’hui',
        dueWeek: 'Sous 7 jours',
        dueMonth: 'Sous 30 jours',
        dueNone: 'Sans échéance',
        stateOpen: 'En cours',
        stateDone: 'Terminées',
        colTask: 'Tâche',
        colProduct: 'Produit / client',
        colType: 'Type',
        colPriority: 'Priorité',
        colDue: 'Échéance',
        colProgress: 'Avancement',
        kpiTotal: 'Tâches',
        kpiLate: 'En retard',
        kpiNext: 'Prochaine échéance',
        kpiNone: 'Aucune',
        reset: 'Réinitialiser',
        empty: 'Aucune tâche',
        emptyHint: 'Rien ne vous est demandé pour le moment.',
        emptyFiltered: 'Aucune tâche ne correspond à ces filtres.',
        truncated:
            'Seules les premières tâches sont affichées. Affinez les filtres pour voir le reste.',
        priorityHigh: 'Haute',
        priorityMedium: 'Moyenne',
        priorityLow: 'Basse',
        noPriority: 'Sans priorité',
        untitled: 'Tâche sans nom',
        caption: 'Liste de mes tâches',
    },
    en: {
        title: 'My tasks',
        description: 'Everything your customer expects from you, filterable and sorted by urgency.',
        search: 'Search a task, a product, a code…',
        anyType: 'All types',
        anyPriority: 'All priorities',
        anyProduct: 'All products',
        anyDue: 'All due dates',
        dueLate: 'Late',
        dueToday: 'Today',
        dueWeek: 'Within 7 days',
        dueMonth: 'Within 30 days',
        dueNone: 'No due date',
        stateOpen: 'In progress',
        stateDone: 'Completed',
        colTask: 'Task',
        colProduct: 'Product / customer',
        colType: 'Type',
        colPriority: 'Priority',
        colDue: 'Due date',
        colProgress: 'Progress',
        kpiTotal: 'Tasks',
        kpiLate: 'Late',
        kpiNext: 'Next due date',
        kpiNone: 'None',
        reset: 'Reset',
        empty: 'No task',
        emptyHint: 'Nothing is expected from you right now.',
        emptyFiltered: 'No task matches these filters.',
        truncated: 'Only the first tasks are shown. Narrow the filters to see the rest.',
        priorityHigh: 'High',
        priorityMedium: 'Medium',
        priorityLow: 'Low',
        noPriority: 'No priority',
        untitled: 'Untitled task',
        caption: 'My task list',
    },
};

/** How many tasks a single read pulls; the adapter caps its own scan anyway. */
const PAGE_SIZE = 100;

/** Deterministic dd/mm/yyyy — see `formatDate` in the dashboard components. */
function shortDate(iso, lang) {
    if (!iso) {
        return null;
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    const pad = (value) => String(value).padStart(2, '0');
    return lang === 'en'
        ? `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
        : `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

/**
 * Does a task fall inside the selected due-date window?
 *
 * @param {Object} task
 * @param {string} due one of `all|late|today|week|month|none`
 * @returns {boolean}
 */
function matchesDue(task, due) {
    if (due === 'all') {
        return true;
    }
    if (due === 'none') {
        return !task.dueDate;
    }
    if (due === 'late') {
        return Boolean(task.isLate) || (daysUntil(task.dueDate) ?? 1) < 0;
    }
    const days = daysUntil(task.dueDate);
    if (days === null) {
        return false;
    }
    if (due === 'today') {
        return days <= 0;
    }
    if (due === 'week') {
        return days <= 7;
    }
    return days <= 30;
}

/**
 * The screen itself. Split out of the default export so `useSearchParams` sits
 * under a `<Suspense>` boundary — without it, a client page reading the query
 * string forces the whole route out of the prerender.
 *
 * @returns {JSX.Element}
 */
function TasksScreen() {
    const { t, lang } = useMessages();
    const local = LOCAL[lang] || LOCAL.fr;
    const searchParams = useSearchParams();

    // The dashboard links here already filtered (`/tasks?type=wizard`,
    // `/tasks?late=1`). The URL is the source of truth for the initial state and
    // is re-read during render when it changes, rather than in an effect.
    //
    // `?entity=<nodeRef>` pre-selects the product filter. That is what
    // `/share/page/wizard` routes to: a beCPG deliverable URL names an entity,
    // not a task, so recognising it lands the supplier on that entity's tasks.
    const urlType = searchParams.get('type') || '';
    const urlDue = searchParams.get('late') === '1' ? 'late' : 'all';
    const urlEntity = searchParams.get('entity') || '';
    const urlKey = `${urlType}|${urlDue}|${urlEntity}`;

    const [filters, setFilters] = useState({
        key: urlKey,
        type: urlType,
        due: urlDue,
        priority: '',
        product: urlEntity,
        state: 'in_progress',
    });
    if (filters.key !== urlKey) {
        setFilters({ ...filters, key: urlKey, type: urlType, due: urlDue, product: urlEntity });
    }

    const patch = (values) => setFilters((previous) => ({ ...previous, ...values }));

    const { data, error, loading, refresh } = useApi('tasks', {
        params: { state: filters.state, pageSize: PAGE_SIZE, sort: 'due' },
    });

    const items = useMemo(() => (data && Array.isArray(data.items) ? data.items : []), [data]);
    const counters = (data && data.counters) || { total: 0, late: 0, open: 0, byType: {} };

    // Product filter options are built from the snapshot: the supplier only ever
    // needs to filter on products that actually carry a task.
    const products = useMemo(() => {
        const index = new Map();
        for (const task of items) {
            const ref = task.entityNodeRef;
            if (!ref || index.has(ref)) {
                continue;
            }
            const label = [task.entity && task.entity.code, task.entity && task.entity.name]
                .filter(Boolean)
                .join(' · ');
            index.set(ref, { value: ref, label: label || ref });
        }
        return [...index.values()].sort((a, b) => a.label.localeCompare(b.label));
    }, [items]);

    const rows = useMemo(
        () =>
            items.filter((task) => {
                if (filters.type && task.type !== filters.type) {
                    return false;
                }
                if (filters.priority && String(task.priority || '') !== filters.priority) {
                    return false;
                }
                if (filters.product && task.entityNodeRef !== filters.product) {
                    return false;
                }
                return matchesDue(task, filters.due);
            }),
        [items, filters.type, filters.priority, filters.product, filters.due],
    );

    const nextDue = useMemo(() => {
        const dates = rows.map((task) => task.dueDate).filter(Boolean).sort();
        return dates.length > 0 ? shortDate(dates[0], lang) : null;
    }, [rows, lang]);

    const columns = useMemo(
        () => [
            {
                id: 'name',
                accessorFn: (task) => task.name || '',
                header: local.colTask,
                meta: { primary: true, label: local.colTask },
                cell: ({ row }) => (
                    <span className="flex min-w-0 items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--becpg-blue-lighter)] text-[var(--becpg-blue)] md:hidden">
                            <Icon
                                name={(TASK_TYPE_META[row.original.type] || TASK_TYPE_META.review).icon}
                                size={16}
                            />
                        </span>
                        <span className="min-w-0 font-medium">
                            {row.original.name || local.untitled}
                        </span>
                    </span>
                ),
            },
            {
                id: 'entity',
                accessorFn: (task) =>
                    [task.entity && task.entity.code, task.entity && task.entity.name]
                        .filter(Boolean)
                        .join(' · '),
                header: local.colProduct,
                meta: { secondary: true, label: local.colProduct },
                cell: ({ getValue }) => (
                    <span className="block max-w-[16rem] truncate text-[var(--becpg-dark-grey)]">
                        {getValue() || '—'}
                    </span>
                ),
            },
            {
                id: 'type',
                accessorFn: (task) => taskTypeLabel(task.type, lang),
                header: local.colType,
                meta: { badge: true, label: local.colType, width: '9rem' },
                cell: ({ row }) => (
                    <span className="pill pill-info pill-sm pill-no-dot">
                        <Icon
                            name={(TASK_TYPE_META[row.original.type] || TASK_TYPE_META.review).icon}
                            size={13}
                        />
                        {taskTypeLabel(row.original.type, lang)}
                    </span>
                ),
            },
            {
                id: 'priority',
                // Sorted on the numeric beCPG priority (1 = highest) so the grid
                // orders by urgency, not alphabetically by its label.
                accessorFn: (task) => task.priority || 9,
                header: local.colPriority,
                meta: { label: local.colPriority, width: '8rem' },
                cell: ({ row }) =>
                    row.original.priorityLevel ? (
                        <PriorityPill level={row.original.priorityLevel} />
                    ) : (
                        <span className="text-xs text-[var(--becpg-dark-grey)]">{local.noPriority}</span>
                    ),
            },
            {
                id: 'dueDate',
                accessorFn: (task) => (task.dueDate ? Date.parse(task.dueDate) : Number.MAX_SAFE_INTEGER),
                header: local.colDue,
                meta: { label: local.colDue, width: '11rem' },
                cell: ({ row }) => <DueBadge task={row.original} />,
            },
            {
                id: 'completionPercent',
                accessorFn: (task) => Number(task.completionPercent) || 0,
                header: local.colProgress,
                meta: { label: local.colProgress, align: 'right', width: '9rem' },
                cell: ({ getValue }) => {
                    const percent = Math.max(0, Math.min(100, getValue()));
                    return (
                        <span className="flex items-center justify-end gap-2">
                            <span className="h-1 w-16 overflow-hidden rounded-full bg-[var(--becpg-grey)]">
                                <span
                                    className="block h-full rounded-full bg-[var(--becpg-blue-light)]"
                                    style={{ width: `${percent}%` }}
                                />
                            </span>
                            <span className="w-8 shrink-0 text-xs tabular-nums text-[var(--becpg-dark-grey)]">
                                {percent}%
                            </span>
                        </span>
                    );
                },
            },
        ],
        [lang, local],
    );

    const filtered = Boolean(filters.type || filters.priority || filters.product)
        || filters.due !== 'all';

    const toolbar = (
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <Select
                aria-label={local.colType}
                value={filters.type}
                onChange={(event) => patch({ type: event.target.value })}
                className="sm:w-[10rem]"
                options={[
                    { value: '', label: local.anyType },
                    ...Object.keys(TASK_TYPE_META).map((type) => ({
                        value: type,
                        label: taskTypeLabel(type, lang),
                    })),
                ]}
            />
            <Select
                aria-label={local.colDue}
                value={filters.due}
                onChange={(event) => patch({ due: event.target.value })}
                className="sm:w-[10.5rem]"
                options={[
                    { value: 'all', label: local.anyDue },
                    { value: 'late', label: local.dueLate },
                    { value: 'today', label: local.dueToday },
                    { value: 'week', label: local.dueWeek },
                    { value: 'month', label: local.dueMonth },
                    { value: 'none', label: local.dueNone },
                ]}
            />
            <Select
                aria-label={local.colPriority}
                value={filters.priority}
                onChange={(event) => patch({ priority: event.target.value })}
                className="sm:w-[10rem]"
                options={[
                    { value: '', label: local.anyPriority },
                    { value: '1', label: local.priorityHigh },
                    { value: '2', label: local.priorityMedium },
                    { value: '3', label: local.priorityLow },
                ]}
            />
            <Select
                aria-label={local.colProduct}
                value={filters.product}
                onChange={(event) => patch({ product: event.target.value })}
                className="sm:w-[13rem]"
                options={[{ value: '', label: local.anyProduct }, ...products]}
            />
            {filtered ? (
                <Button
                    variant="ghost"
                    size="sm"
                    icon="restart_alt"
                    className="col-span-2 sm:col-span-1"
                    onClick={() => patch({ type: '', due: 'all', priority: '', product: '' })}
                >
                    {local.reset}
                </Button>
            ) : null}
        </div>
    );

    return (
        <AppShell title={local.title} badges={{ tasks: counters.open || 0 }}>
            <PageHeader title={local.title} description={local.description} />

            <StatGrid columns={3} className="mb-4">
                <StatCard
                    label={local.kpiTotal}
                    value={counters.total || 0}
                    icon="assignment_turned_in"
                    tone="info"
                    loading={loading}
                    index={0}
                />
                <StatCard
                    label={local.kpiLate}
                    value={counters.late || 0}
                    icon="alarm"
                    tone={counters.late > 0 ? 'danger' : 'ok'}
                    loading={loading}
                    index={1}
                />
                <StatCard
                    label={local.kpiNext}
                    value={nextDue || local.kpiNone}
                    icon="event"
                    tone="neutral"
                    loading={loading}
                    index={2}
                />
            </StatGrid>

            {data && data.truncated ? (
                <p className="mb-3 flex items-start gap-2 rounded-lg bg-[var(--status-warn-bg)] px-3 py-2 text-xs text-[var(--status-warn)]">
                    <Icon name="info" size={16} />
                    {local.truncated}
                </p>
            ) : null}

            <DataTable
                columns={columns}
                data={rows}
                loading={loading}
                error={error}
                onRetry={refresh}
                getRowId={(task, position) => String(task.uuid || task.id || position)}
                rowHref={(task) => task.href || `/tasks/${task.uuid}`}
                initialSorting={[{ id: 'dueDate', desc: false }]}
                enableColumnVisibility
                pageSize={25}
                searchPlaceholder={local.search}
                caption={local.caption}
                toolbar={toolbar}
                actions={
                    <Select
                        aria-label={local.stateOpen}
                        value={filters.state}
                        onChange={(event) => patch({ state: event.target.value })}
                        className="w-[9.5rem]"
                        options={[
                            { value: 'in_progress', label: local.stateOpen },
                            { value: 'completed', label: local.stateDone },
                        ]}
                    />
                }
                emptyState={
                    <EmptyState
                        variant={filtered ? 'search' : 'success'}
                        title={filtered ? t('state.noResults') : local.empty}
                        message={filtered ? local.emptyFiltered : local.emptyHint}
                        actionLabel={filtered ? local.reset : undefined}
                        onAction={
                            filtered
                                ? () => patch({ type: '', due: 'all', priority: '', product: '' })
                                : undefined
                        }
                    />
                }
            />
        </AppShell>
    );
}

/**
 * @returns {JSX.Element}
 */
export default function TasksPage() {
    return (
        <Suspense
            fallback={
                <AppShell>
                    <SkeletonTable rows={6} columns={5} />
                </AppShell>
            }
        >
            <TasksScreen />
        </Suspense>
    );
}
