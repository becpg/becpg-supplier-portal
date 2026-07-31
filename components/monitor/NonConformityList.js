'use client';

/**
 * **Les non-conformités fournisseur** (spec §4.6.5 « Qualité : conformité
 * documentaire, NC, certifications, audits », §4.2 `/monitor/quality`).
 *
 * A non-conformity *is* a `qa:nc` entity — the portal adds no second notion of
 * NC, and no second notion of corrective action either: an action is a
 * `pjt:taskList` row of the NC's treatment project, which is exactly how beCPG
 * models it (rule R2, business logic stays in beCPG).
 *
 * | Column                | Question it answers                  | Source                    |
 * |-----------------------|--------------------------------------|---------------------------|
 * | État                  | *où en est-elle ?*                   | `qa:ncState`              |
 * | Priorité              | *est-elle bloquante ?*               | `qa:ncPriority` (1 = oui) |
 * | Délai de traitement   | *depuis combien de temps ?*          | `cm:created` → maintenant |
 * | Actions correctives   | *le plan d'action avance-t-il ?*     | `pjt:taskList` de la NC   |
 * | Coût                  | *combien nous coûte-t-elle ?*        | `qa:ncCost`               |
 *
 * ## Two honesty rules this component keeps
 *
 *  1. **The processing delay of a closed NC is an approximation, and it says
 *     so.** beCPG stores no closure date, so the API measures
 *     `cm:modified − cm:created` for a closed NC. The column carries that in its
 *     tooltip rather than presenting the figure as a certified lead time.
 *  2. **A blocking NC is the very fact that makes the derived approval status
 *     `suspended`** (spec §5.4.3). It is therefore rendered with the same danger
 *     vocabulary as the suspension pill on the other screens — the same fact must
 *     not look like two different things in two places.
 *
 * State and type wordings mirror beCPG's own standard list constraints
 * (`qa:ncStates`, `qa:ncTypes`) so the portal never contradicts Share. A value a
 * client added to those lists is displayed **raw**, never guessed at.
 *
 * Selecting rows targets the **suppliers** of the selected NCs: a bulk action
 * always addresses a supplier (`POST /monitor/actions`, §4.6.7).
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusPill } from '@/components/ui/StatusPill';
import { Icon } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatDate, formatNumber } from '@/lib/format';
import { useMessages } from '@/lib/messages';

/**
 * `qa:ncStates`, in the order of the constraint declared in
 * `qualityModel.xml` — i.e. the workflow order, not the alphabet.
 * @type {ReadonlyArray<string>}
 */
export const NC_STATES = Object.freeze([
    'new',
    'analysis',
    'treatment',
    'response',
    'classification',
    'closing',
    'closed',
]);

/** `qa:ncTypes` of the standard model. */
export const NC_TYPES = Object.freeze(['NonConformity', 'Claim']);

/** How each state is rendered. Tone + icon only — the label comes from LABELS. */
const STATE_STYLE = Object.freeze({
    new: { tone: 'info', icon: 'fiber_new' },
    analysis: { tone: 'info', icon: 'travel_explore' },
    treatment: { tone: 'warn', icon: 'build' },
    response: { tone: 'warn', icon: 'forum' },
    classification: { tone: 'info', icon: 'category' },
    closing: { tone: 'ok', icon: 'lock_clock' },
    closed: { tone: 'neutral', icon: 'check_circle' },
});

const LABELS = {
    fr: {
        columns: {
            nc: 'Non-conformité',
            suppliers: 'Fournisseurs',
            state: 'État',
            priority: 'Priorité',
            delay: 'Délai de traitement',
            actions: 'Actions correctives',
            cost: 'Coût',
        },
        // Wordings of beCPG's own `qa:ncStates` list constraint.
        states: {
            new: 'Nouveau',
            analysis: 'Orientation',
            treatment: 'Traitement',
            response: 'Réponse',
            classification: 'Classification',
            closing: 'Clôture',
            closed: 'Fermé',
        },
        types: { NonConformity: 'Non conformité', Claim: 'Réclamation client' },
        priorities: { 1: 'Haute', 2: 'Moyenne', 3: 'Basse' },
        blocking: 'Bloquante',
        blockingHint:
            'Priorité haute et NC ouverte : c’est ce qui rend le statut d’agrément « suspendu » (calculé, jamais stocké).',
        days: '{count} j',
        openSince: 'Ouverte depuis {count} j',
        overdue: 'Au-delà du délai de traitement',
        closedIn: 'Traitée en {count} j',
        closedApprox:
            'beCPG ne stocke pas de date de clôture : le délai d’une NC fermée est mesuré entre sa création et sa dernière modification.',
        createdOn: 'Créée le {date}',
        noDelay: 'Sans date de création',
        actionsCount: '{done} / {total}',
        actionsLate: '{count} en retard',
        noActions: 'Aucune action',
        noActionsHint:
            'Aucune tâche de traitement rattachée à cette NC dans beCPG — le plan d’action n’est pas encore ouvert.',
        actionState: {
            done: 'terminée',
            late: 'en retard',
            open: 'en cours',
        },
        andMore: '… et {count} autre(s)',
        others: '+{count}',
        noSupplier: 'Aucun fournisseur rattaché',
        search: 'Rechercher une non-conformité',
        empty: 'Aucune non-conformité sur ce périmètre',
    },
    en: {
        columns: {
            nc: 'Non-conformity',
            suppliers: 'Suppliers',
            state: 'State',
            priority: 'Priority',
            delay: 'Processing delay',
            actions: 'Corrective actions',
            cost: 'Cost',
        },
        states: {
            new: 'New',
            analysis: 'Analysis',
            treatment: 'Treatment',
            response: 'Response',
            classification: 'Classification',
            closing: 'Closing',
            closed: 'Closed',
        },
        types: { NonConformity: 'Nonconformity', Claim: 'Claim' },
        priorities: { 1: 'High', 2: 'Medium', 3: 'Low' },
        blocking: 'Blocking',
        blockingHint:
            'High priority and still open: this is what makes the derived approval status "suspended" (computed, never stored).',
        days: '{count} d',
        openSince: 'Open for {count} d',
        overdue: 'Past the processing target',
        closedIn: 'Handled in {count} d',
        closedApprox:
            'beCPG stores no closure date: the delay of a closed NC is measured between its creation and its last modification.',
        createdOn: 'Created on {date}',
        noDelay: 'No creation date',
        actionsCount: '{done} / {total}',
        actionsLate: '{count} late',
        noActions: 'No action',
        noActionsHint:
            'No treatment task linked to this NC in beCPG — the action plan is not open yet.',
        actionState: {
            done: 'done',
            late: 'late',
            open: 'in progress',
        },
        andMore: '… and {count} more',
        others: '+{count}',
        noSupplier: 'No supplier linked',
        search: 'Search a non-conformity',
        empty: 'No non-conformity in this perimeter',
    },
};

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]),
    );
}

/**
 * Label of a `qa:ncState`, in the portal's chrome language.
 *
 * A value that is not in the standard constraint is returned **as it comes from
 * beCPG** — a client-specific state must not be renamed by the portal.
 *
 * @param {string|null} state
 * @param {string} lang
 * @returns {string}
 */
export function ncStateLabel(state, lang = 'fr') {
    const labels = LABELS[lang] || LABELS.fr;
    if (!state) {
        return '—';
    }
    return labels.states[state] || state;
}

/**
 * Label of a `qa:ncType`, same rule as {@link ncStateLabel}.
 *
 * @param {string|null} type
 * @param {string} lang
 * @returns {string}
 */
export function ncTypeLabel(type, lang = 'fr') {
    const labels = LABELS[lang] || LABELS.fr;
    if (!type) {
        return '—';
    }
    return labels.types[type] || type;
}

/**
 * The suppliers of a set of selected NCs — the targets of a bulk action
 * (`POST /monitor/actions` only ever addresses suppliers, §4.6.7).
 *
 * @param {Object[]} items
 * @param {Object} rowSelection `{ [ncNodeRef]: true }`
 * @returns {Array<{nodeRef: string, name: string}>}
 */
export function ncTargets(items, rowSelection) {
    const targets = new Map();
    (items || [])
        .filter((item) => rowSelection && rowSelection[item.nodeRef])
        .forEach((item) => {
            (item.suppliers || []).forEach((supplier) => {
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

/** `/monitor/suppliers/<ref>` for an association reference. */
function supplierHref(ref) {
    return `/monitor/suppliers/${encodeURIComponent(ref.nodeRef)}`;
}

/**
 * @param {Object} props
 * @param {Object[]} props.items NC rows from `GET /monitor/quality`
 * @param {boolean} [props.loading]
 * @param {Error} [props.error]
 * @param {Function} [props.onRetry]
 * @param {Object} [props.rowSelection] controlled `{ [nodeRef]: true }`
 * @param {Function} [props.onRowSelectionChange]
 * @param {boolean} [props.enablePagination=true] off when the page owns the paging
 * @param {React.ReactNode} [props.toolbar] filters rendered next to the search box
 * @param {React.ReactNode} [props.actions]
 */
export function NonConformityList({
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
                id: 'nc',
                accessorFn: (row) => `${row.name || ''} ${row.code || ''} ${row.ncType || ''}`,
                header: labels.columns.nc,
                meta: { primary: true, label: labels.columns.nc, width: '18rem' },
                cell: ({ row }) => (
                    <div className="min-w-0">
                        <p className="truncate font-medium">{row.original.name || '—'}</p>
                        <p className="truncate text-xs text-[var(--becpg-dark-grey)]">
                            {[row.original.code, ncTypeLabel(row.original.ncType, lang)]
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
                        return (
                            <span className="text-[var(--becpg-dark-grey)]">{labels.noSupplier}</span>
                        );
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
                id: 'state',
                accessorFn: (row) => row.state || '',
                header: labels.columns.state,
                meta: { badge: true, label: labels.columns.state, width: '9rem' },
                cell: ({ row }) => {
                    const style = STATE_STYLE[row.original.state] || {
                        tone: 'neutral',
                        icon: 'help_outline',
                    };
                    return (
                        <StatusPill
                            status={row.original.state || 'unknown'}
                            tone={style.tone}
                            icon={style.icon}
                            label={ncStateLabel(row.original.state, lang)}
                            size="sm"
                        />
                    );
                },
            },
            {
                id: 'priority',
                // Blocking first, then priority: 1 sorts before 2 before "unset".
                accessorFn: (row) => (row.priority === null ? 9 : row.priority),
                header: labels.columns.priority,
                meta: { label: labels.columns.priority, width: '9rem' },
                cell: ({ row }) => {
                    const { priority, blocking } = row.original;
                    if (blocking) {
                        return (
                            <Tooltip content={labels.blockingHint} placement="top">
                                <StatusPill
                                    status="suspended"
                                    tone="danger"
                                    icon="block"
                                    label={labels.blocking}
                                    size="sm"
                                />
                            </Tooltip>
                        );
                    }
                    return (
                        <span className="text-xs text-[var(--becpg-dark-grey)]">
                            {priority === null || priority === undefined
                                ? '—'
                                : labels.priorities[priority] || String(priority)}
                        </span>
                    );
                },
            },
            {
                id: 'delay',
                accessorFn: (row) => row.delayDays || 0,
                header: labels.columns.delay,
                meta: { label: labels.columns.delay, align: 'right', width: '11rem' },
                cell: ({ row }) => {
                    const { delayDays, isClosed, overdue, createdAt } = row.original;
                    if (delayDays === null || delayDays === undefined) {
                        return (
                            <span className="text-xs text-[var(--becpg-dark-grey)]">
                                {labels.noDelay}
                            </span>
                        );
                    }
                    return (
                        <div className="text-right">
                            <p
                                className={`tabular-nums ${overdue ? 'font-medium text-[var(--status-danger)]' : ''}`}
                                title={
                                    isClosed
                                        ? labels.closedApprox
                                        : overdue
                                          ? labels.overdue
                                          : fill(labels.openSince, { count: delayDays })
                                }
                            >
                                {fill(labels.days, { count: delayDays })}
                                {overdue ? (
                                    <Icon
                                        name="alarm"
                                        size={14}
                                        className="ml-1 inline align-text-bottom"
                                    />
                                ) : null}
                            </p>
                            <p className="text-xs text-[var(--becpg-dark-grey)]">
                                {isClosed
                                    ? fill(labels.closedIn, { count: delayDays })
                                    : fill(labels.createdOn, { date: formatDate(createdAt, lang) })}
                            </p>
                        </div>
                    );
                },
            },
            {
                id: 'actions',
                accessorFn: (row) => (row.correctiveActions || []).length,
                header: labels.columns.actions,
                meta: { label: labels.columns.actions, width: '12rem' },
                cell: ({ row }) => {
                    const list = row.original.correctiveActions || [];
                    if (list.length === 0) {
                        return (
                            <span
                                className="text-xs text-[var(--becpg-dark-grey)]"
                                title={labels.noActionsHint}
                            >
                                {labels.noActions}
                            </span>
                        );
                    }
                    const done = list.filter((action) => action.done).length;
                    const late = list.filter((action) => action.late).length;
                    return (
                        <Tooltip
                            placement="left"
                            maxWidth={320}
                            content={
                                <ul className="flex flex-col gap-1 text-left">
                                    {list.slice(0, 6).map((action) => (
                                        <li key={action.nodeRef}>
                                            <span className="font-medium">{action.name}</span>
                                            {' — '}
                                            {action.done
                                                ? labels.actionState.done
                                                : action.late
                                                  ? labels.actionState.late
                                                  : labels.actionState.open}
                                            {action.dueDate
                                                ? ` (${formatDate(action.dueDate, lang)})`
                                                : ''}
                                        </li>
                                    ))}
                                    {list.length > 6 ? (
                                        <li>{fill(labels.andMore, { count: list.length - 6 })}</li>
                                    ) : null}
                                </ul>
                            }
                        >
                            <span className="inline-flex items-center gap-1.5 text-xs">
                                <Icon
                                    name={done === list.length ? 'task_alt' : 'checklist'}
                                    size={14}
                                    className={
                                        done === list.length
                                            ? 'text-[var(--status-ok)]'
                                            : 'text-[var(--becpg-blue)]'
                                    }
                                />
                                <span className="tabular-nums">
                                    {fill(labels.actionsCount, { done, total: list.length })}
                                </span>
                                {late > 0 ? (
                                    <span className="text-[var(--status-danger)]">
                                        {fill(labels.actionsLate, { count: late })}
                                    </span>
                                ) : null}
                            </span>
                        </Tooltip>
                    );
                },
            },
            {
                id: 'cost',
                accessorFn: (row) => (row.cost === null ? -1 : row.cost),
                header: labels.columns.cost,
                meta: { label: labels.columns.cost, align: 'right', width: '8rem' },
                cell: ({ row }) => (
                    <span className="tabular-nums text-xs">
                        {formatNumber(row.original.cost, lang)}
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
            enablePagination={enablePagination}
            initialSorting={[{ id: 'delay', desc: true }]}
            initialColumnVisibility={{ cost: false }}
            searchPlaceholder={labels.search}
            toolbar={toolbar}
            actions={actions}
            emptyState={<EmptyState icon="verified_user" variant="success" title={labels.empty} />}
            caption={labels.columns.nc}
        />
    );
}
