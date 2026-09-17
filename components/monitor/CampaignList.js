'use client';

/**
 * The referencing and renewal campaigns in progress (spec §4.6.1
 * "campagnes en cours et taux de réponse", §4.2 `/monitor/campaigns`).
 *
 * A campaign *is* a beCPG project (`pjt:project`): the portal adds no second
 * notion of campaign and no second notion of progress. Everything displayed here
 * is read from the project, and the columns answer the three questions a
 * referencing officer asks about a campaign:
 *
 * | Column          | Question                          | Source                         |
 * |-----------------|-----------------------------------|--------------------------------|
 * | Taux de réponse  | *has the supplier answered?*     | `pjt:completionPercent`        |
 * | Ancienneté       | *for how long?*                  | `pjt:projectStartDate`         |
 * | Dernière relance | *how long has it been silent?*     | `cm:modified` (see below)    |
 * | Relances         | *how many overdue tasks?*        | overdue `pjt:taskList` rows    |
 * | Suivi            | *what to do now?*                | `suggestedAction` (§4.5 ladder)|
 *
 * **"Dernière relance" is not a beCPG property** — there is no reminder log on a
 * project. The column therefore shows the *last activity* on the campaign
 * (`cm:modified`), which is the closest fact beCPG actually holds, and it is
 * labelled as such. Inventing a reminder date would be inventing data.
 *
 * Selecting rows targets the **suppliers** of the selected campaigns: a bulk
 * action always addresses a supplier (`POST /monitor/actions`, §4.6.7).
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { GaugeBar } from '@/components/ui/Gauge';
import { StatusPill } from '@/components/ui/StatusPill';
import { Icon } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatDate } from '@/lib/format';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        columns: {
            campaign: 'Campagne',
            suppliers: 'Fournisseurs',
            response: 'Taux de réponse',
            age: 'Ancienneté',
            silence: 'Dernière relance',
            due: 'Échéance',
            reminders: 'Relances',
            follow: 'Suivi',
            manager: 'Pilote',
        },
        days: '{count} j',
        since: 'Ouverte depuis {count} j',
        lastActivity: 'Dernière activité {date}',
        silenceDays: 'Il y a {count} j',
        silenceToday: 'Aujourd’hui',
        silenceHint:
            'beCPG ne journalise pas les relances : cette colonne montre la dernière activité sur la campagne (cm:modified), le fait le plus proche réellement disponible.',
        noSilence: 'Aucune activité datée',
        noAnswer: 'Sans réponse',
        late: 'En retard',
        onTrack: 'Dans les temps',
        toRemind: 'À relancer',
        toEscalate: 'À escalader',
        lateTasks: '{late} / {open} tâche(s) en retard',
        noTasks: 'Aucune tâche ouverte',
        dueIn: 'Dans {count} j',
        overdue: 'Dépassée de {count} j',
        noDue: 'Sans échéance',
        others: '+{count}',
        search: 'Rechercher une campagne',
        empty: 'Aucune campagne ouverte sur ce périmètre',
        // Wordings of beCPG's own `pjt:projectStates` list constraint.
        projectStates: {
            Planned: 'Planifié',
            InProgress: 'En cours',
            OnHold: 'En attente',
            Completed: 'Terminé',
            Cancelled: 'Annulé',
        },
    },
    en: {
        columns: {
            campaign: 'Campaign',
            suppliers: 'Suppliers',
            response: 'Response rate',
            age: 'Age',
            silence: 'Last reminder',
            due: 'Due date',
            reminders: 'Reminders',
            follow: 'Follow-up',
            manager: 'Owner',
        },
        days: '{count} d',
        since: 'Open for {count} d',
        lastActivity: 'Last activity {date}',
        silenceDays: '{count} d ago',
        silenceToday: 'Today',
        silenceHint:
            'beCPG keeps no reminder log: this column shows the last activity on the campaign (cm:modified), the closest fact actually available.',
        noSilence: 'No dated activity',
        noAnswer: 'No answer',
        late: 'Late',
        onTrack: 'On track',
        toRemind: 'To remind',
        toEscalate: 'To escalate',
        lateTasks: '{late} / {open} task(s) overdue',
        noTasks: 'No open task',
        dueIn: 'In {count} d',
        overdue: '{count} d overdue',
        noDue: 'No due date',
        others: '+{count}',
        search: 'Search a campaign',
        empty: 'No open campaign on this perimeter',
        projectStates: {
            Planned: 'Planned',
            InProgress: 'In progress',
            OnHold: 'On hold',
            Completed: 'Completed',
            Cancelled: 'Cancelled',
        },
    },
};

/** `pjt:projectStates` that keep a campaign open — mirrors the adapter's config. */
export const CAMPAIGN_OPEN_STATES = Object.freeze(['Planned', 'InProgress', 'OnHold']);

/** `pjt:projectStates` that close it. */
export const CAMPAIGN_CLOSED_STATES = Object.freeze(['Completed', 'Cancelled']);

/**
 * Label of a `pjt:projectState`, in the portal's chrome language. An unknown
 * value — a state a client added to the constraint — is returned raw rather than
 * renamed by the portal.
 *
 * @param {string|null} state
 * @param {string} lang
 * @returns {string}
 */
export function projectStateLabel(state, lang = 'fr') {
    const labels = LABELS[lang] || LABELS.fr;
    if (!state) {
        return '—';
    }
    return labels.projectStates[state] || state;
}

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]),
    );
}

/** Whole days between an ISO date and now, or `null`. */
function daysSince(value) {
    if (!value) {
        return null;
    }
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) {
        return null;
    }
    return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

/** `/monitor/suppliers/<ref>` for an association reference. */
function supplierHref(ref) {
    return `/monitor/suppliers/${encodeURIComponent(ref.nodeRef)}`;
}

/**
 * The suppliers of a set of selected campaigns — the targets of a bulk action.
 *
 * @param {Object[]} campaigns
 * @param {Object} rowSelection `{ [campaignNodeRef]: true }`
 * @returns {Array<{nodeRef: string, name: string}>}
 */
export function campaignTargets(campaigns, rowSelection) {
    const targets = new Map();
    campaigns
        .filter((campaign) => rowSelection[campaign.nodeRef])
        .forEach((campaign) => {
            (campaign.suppliers || []).forEach((supplier) => {
                if (supplier.nodeRef && !targets.has(supplier.nodeRef)) {
                    targets.set(supplier.nodeRef, {
                        nodeRef: supplier.nodeRef,
                        name: supplier.label || supplier.nodeRef,
                    });
                }
            });
        });
    return [...targets.values()];
}

/**
 * @param {Object} props
 * @param {Object[]} props.items campaign rows from `GET /monitor/campaigns`
 * @param {boolean} [props.loading]
 * @param {Error} [props.error]
 * @param {Function} [props.onRetry]
 * @param {Object} [props.rowSelection] controlled `{ [nodeRef]: true }`
 * @param {Function} [props.onRowSelectionChange]
 * @param {boolean} [props.enablePagination=true] off when the page owns the paging
 * @param {React.ReactNode} [props.toolbar] filters rendered next to the search box
 * @param {React.ReactNode} [props.actions]
 */
export function CampaignList({
    items = [],
    loading = false,
    error = null,
    onRetry,
    rowSelection,
    onRowSelectionChange,
    enablePagination = true,
    toolbar,
    actions,
}) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;

    const columns = useMemo(
        () => [
            {
                id: 'campaign',
                accessorFn: (row) => `${row.name || ''} ${row.code || ''}`,
                header: labels.columns.campaign,
                meta: { primary: true, label: labels.columns.campaign, width: '18rem' },
                /*
                 * The campaign opens. The rows were inert while the payload was
                 * already publishing `href` — a route that answered nothing.
                 * From there the record being filled in and the discussion are
                 * reachable, that is the answer to "where does this referencing
                 * stand?", which was until now outside this screen.
                 *
                 * `stopPropagation`: the row also carries the selection box of
                 * the bulk actions, and opening the campaign must not tick it on
                 * the way.
                 */
                cell: ({ row }) => (
                    <div className="min-w-0">
                        <Link
                            href={row.original.href
                                || `/monitor/campaigns/${encodeURIComponent(row.original.nodeRef)}`}
                            onClick={(event) => event.stopPropagation()}
                            className="block truncate rounded font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                        >
                            {row.original.name || '—'}
                        </Link>
                        <p className="truncate text-xs text-[var(--becpg-dark-grey)]">
                            {[row.original.code, projectStateLabel(row.original.state, lang)]
                                .filter(Boolean)
                                .join(' · ')}
                        </p>
                    </div>
                ),
            },
            {
                id: 'suppliers',
                accessorFn: (row) => (row.suppliers || []).map((entry) => entry.label).join(' '),
                header: labels.columns.suppliers,
                meta: { secondary: true, label: labels.columns.suppliers, width: '14rem' },
                cell: ({ row }) => {
                    const suppliers = row.original.suppliers || [];
                    if (suppliers.length === 0) {
                        return <span className="text-[var(--becpg-dark-grey)]">—</span>;
                    }
                    return (
                        <span className="flex min-w-0 items-center gap-1">
                            <Link
                                href={supplierHref(suppliers[0])}
                                className="truncate hover:underline"
                                onClick={(event) => event.stopPropagation()}
                            >
                                {suppliers[0].label || suppliers[0].nodeRef}
                            </Link>
                            {suppliers.length > 1 ? (
                                <span
                                    className="shrink-0 text-xs text-[var(--becpg-dark-grey)]"
                                    title={suppliers.map((entry) => entry.label).join(', ')}
                                >
                                    {fill(labels.others, { count: suppliers.length - 1 })}
                                </span>
                            ) : null}
                        </span>
                    );
                },
            },
            {
                id: 'response',
                accessorFn: (row) => row.completion || 0,
                header: labels.columns.response,
                meta: { label: labels.columns.response, width: '10rem' },
                cell: ({ row }) => (
                    <div className="min-w-[7rem]">
                        <GaugeBar
                            value={row.original.completion || 0}
                            size="sm"
                            label={null}
                            showValue
                        />
                    </div>
                ),
            },
            {
                id: 'age',
                accessorFn: (row) => row.ageDays || 0,
                header: labels.columns.age,
                meta: { label: labels.columns.age, align: 'right', width: '9rem' },
                cell: ({ row }) => (
                    <div className="text-right">
                        <p
                            className="tabular-nums"
                            title={
                                row.original.ageDays === null
                                    ? undefined
                                    : fill(labels.since, { count: row.original.ageDays })
                            }
                        >
                            {row.original.ageDays === null || row.original.ageDays === undefined
                                ? '—'
                                : fill(labels.days, { count: row.original.ageDays })}
                        </p>
                        <p className="text-xs text-[var(--becpg-dark-grey)]">
                            {formatDate(row.original.startedAt, lang)}
                        </p>
                    </div>
                ),
            },
            {
                // **"Dernière relance" is not a beCPG property.** There is no
                // reminder log on a project, so the closest fact beCPG actually
                // holds is the last activity on the campaign (`cm:modified`) —
                // shown as such, with the caveat in the tooltip. Inventing a
                // reminder date would be inventing data.
                id: 'silence',
                accessorFn: (row) => daysSince(row.modified) ?? -1,
                header: labels.columns.silence,
                meta: { label: labels.columns.silence, align: 'right', width: '10rem' },
                cell: ({ row }) => {
                    const silence = daysSince(row.original.modified);
                    if (silence === null) {
                        return (
                            <span className="text-xs text-[var(--becpg-dark-grey)]">
                                {labels.noSilence}
                            </span>
                        );
                    }
                    // Silent for longer than the campaign's own no-answer window
                    // is what the follow-up ladder reacts to (§4.5).
                    const stale = row.original.suggestedAction !== null && silence >= 7;
                    return (
                        <Tooltip
                            placement="left"
                            content={
                                <span>
                                    {fill(labels.lastActivity, {
                                        date: formatDate(row.original.modified, lang),
                                    })}
                                    {' — '}
                                    {labels.silenceHint}
                                </span>
                            }
                        >
                            <span className="flex flex-col items-end">
                                <span
                                    className={`tabular-nums ${stale ? 'text-[var(--status-warn)]' : ''}`}
                                >
                                    {silence === 0
                                        ? labels.silenceToday
                                        : fill(labels.silenceDays, { count: silence })}
                                </span>
                                <span className="text-xs text-[var(--becpg-dark-grey)]">
                                    {formatDate(row.original.modified, lang)}
                                </span>
                            </span>
                        </Tooltip>
                    );
                },
            },
            {
                id: 'due',
                accessorFn: (row) => row.dueDate || '',
                header: labels.columns.due,
                meta: { label: labels.columns.due, width: '10rem' },
                cell: ({ row }) => {
                    const { dueDate, daysToDue, isLate } = row.original;
                    if (!dueDate) {
                        return <span className="text-[var(--becpg-dark-grey)]">{labels.noDue}</span>;
                    }
                    return (
                        <div>
                            <p className="tabular-nums">{formatDate(dueDate, lang)}</p>
                            <p
                                className={`text-xs ${isLate ? 'text-[var(--status-danger)]' : 'text-[var(--becpg-dark-grey)]'}`}
                            >
                                {isLate
                                    ? fill(labels.overdue, { count: Math.abs(daysToDue || 0) })
                                    : fill(labels.dueIn, { count: daysToDue ?? 0 })}
                            </p>
                        </div>
                    );
                },
            },
            {
                id: 'reminders',
                accessorFn: (row) => row.lateTasks || 0,
                header: labels.columns.reminders,
                meta: { label: labels.columns.reminders, width: '10rem' },
                cell: ({ row }) => {
                    const { lateTasks = 0, openTasks = 0 } = row.original;
                    if (openTasks === 0) {
                        return (
                            <span className="text-xs text-[var(--becpg-dark-grey)]">
                                {labels.noTasks}
                            </span>
                        );
                    }
                    return (
                        <span
                            className={`inline-flex items-center gap-1 text-xs ${lateTasks > 0 ? 'text-[var(--status-danger)]' : 'text-[var(--becpg-dark-grey)]'}`}
                        >
                            <Icon name={lateTasks > 0 ? 'alarm' : 'schedule'} size={14} />
                            {fill(labels.lateTasks, { late: lateTasks, open: openTasks })}
                        </span>
                    );
                },
            },
            {
                id: 'follow',
                accessorFn: (row) => row.suggestedAction || '',
                header: labels.columns.follow,
                meta: { badge: true, label: labels.columns.follow, width: '9rem' },
                cell: ({ row }) => {
                    const { suggestedAction, unanswered, isLate } = row.original;
                    if (suggestedAction === 'escalate') {
                        return (
                            <StatusPill
                                status="suspended"
                                tone="danger"
                                icon="trending_up"
                                label={labels.toEscalate}
                                size="sm"
                            />
                        );
                    }
                    if (suggestedAction === 'remind') {
                        return (
                            <StatusPill
                                status="toRenew"
                                tone="warn"
                                icon="campaign"
                                label={unanswered ? labels.noAnswer : isLate ? labels.late : labels.toRemind}
                                size="sm"
                            />
                        );
                    }
                    return (
                        <StatusPill status="inProgress" tone="ok" icon="check" label={labels.onTrack} size="sm" />
                    );
                },
            },
            {
                id: 'manager',
                accessorFn: (row) => (row.manager ? row.manager.label : ''),
                header: labels.columns.manager,
                meta: { label: labels.columns.manager, width: '9rem' },
                cell: ({ row }) => (
                    <span className="block truncate text-xs">
                        {row.original.manager ? row.original.manager.label || row.original.manager.username : '—'}
                    </span>
                ),
            },
        ],
        [labels, lang],
    );

    return (
        <DataTable
            columns={columns}
            data={items}
            loading={loading}
            error={error}
            onRetry={onRetry}
            getRowId={(row) => row.nodeRef}
            enableRowSelection
            rowSelection={rowSelection}
            onRowSelectionChange={onRowSelectionChange}
            enableColumnVisibility
            storageKey="monitor.campaigns"
            enablePagination={enablePagination}
            initialSorting={[{ id: 'due', desc: false }]}
            searchPlaceholder={labels.search}
            toolbar={toolbar}
            actions={actions}
            pageSize={25}
            emptyState={<EmptyState icon="campaign" title={labels.empty} />}
            caption={labels.columns.campaign}
        />
    );
}
