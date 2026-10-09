'use client';

/**
 * Supplier non-conformities (spec §4.6.5 « Qualité : conformité
 * documentaire, NC, certifications, audits », §4.2 `/monitor/quality`).
 *
 * A non-conformity *is* a `qa:nc` entity — the portal adds no second notion of
 * NC, and no second notion of corrective action either: an action is a
 * `pjt:taskList` row of the NC's treatment project, which is exactly how beCPG
 * models it (rule R2, business logic stays in beCPG).
 *
 * | Column                | Question it answers                  | Source                    |
 * |-----------------------|--------------------------------------|---------------------------|
 * | État                  | *where does it stand?*               | `qa:ncState`              |
 * | Priorité              | *is it blocking?*                    | `qa:ncPriority` (1 = yes) |
 * | Délai de traitement   | *for how long?*                      | `cm:created` → now        |
 * | Actions correctives   | *is the action plan moving?*         | `pjt:taskList` of the NC  |
 * | Coût                  | *what is it costing us?*             | `qa:ncCost`               |
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

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusPill } from '@/components/ui/StatusPill';
import { Icon } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Tooltip } from '@/components/ui/Tooltip';
import { CommentsPanel } from '@/components/wizard/panels/CommentsPanel';
import { formatDate, formatNumber } from '@/lib/format';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';
import { DateText } from '@/components/ui/DateText';

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

const LABELS = defineLabels('components/monitor/NonConformityList#LABELS', {
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
        empty: 'Aucune non-conformité sur ce périmètre',
        // Consultation: until now the NC opened nowhere, the screen listed its
        // code and its verdict without ever giving its text.
        open: 'Consulter cette non-conformité',
        detail: {
            description: 'Description',
            comment: 'Commentaire qualité',
            noText: 'Cette non-conformité ne porte ni description ni commentaire dans beCPG.',
            facts: 'Faits',
            actions: 'Actions correctives',
            noActions: 'Aucune action corrective ouverte.',
            suppliers: 'Fournisseurs concernés',
            discussion: 'Discussion',
            created: 'Créée le',
            modified: 'Dernière modification',
            cost: 'Coût',
            priority: 'Priorité',
            state: 'État',
            type: 'Type',
        },
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
        empty: 'No non-conformity in this perimeter',
        /* See the note on the French keys. */
        open: 'Open this non-conformity',
        detail: {
            description: 'Description',
            comment: 'Quality comment',
            noText: 'This non-conformity carries neither a description nor a comment in beCPG.',
            facts: 'Facts',
            actions: 'Corrective actions',
            noActions: 'No open corrective action.',
            suppliers: 'Suppliers concerned',
            discussion: 'Discussion',
            created: 'Created on',
            modified: 'Last modified',
            cost: 'Cost',
            priority: 'Priority',
            state: 'State',
            type: 'Type',
        },
    },
});

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
    const labels = pickLabels(LABELS, lang);
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
    const labels = pickLabels(LABELS, lang);
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

/** One `label: value` line of the facts block; renders nothing without a value. */
function Fact({ label, value }) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    return (
        <div className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-[var(--becpg-dark-grey)]">{label}</dt>
            <dd className="truncate text-sm text-[var(--becpg-blue)]">{value}</dd>
        </div>
    );
}

/**
 * One non-conformity, opened.
 *
 * ## Why a modal window and not a route
 *
 * An NC is consulted *from the list*: three are opened in a row to sort out what
 * blocks an approval, and a navigation per NC would lose the filter, the sort
 * and the selection on every round trip. The window keeps the working screen
 * behind it.
 *
 * ## What it shows, and where that comes from
 *
 * Nothing more than the row — same fields, same query: `qa:ncComment` and
 * `cm:description` were simply added to the projection already emitted, so
 * opening an NC costs no call. To that are added the corrective actions the list
 * summarised as « 2 / 5 » and the NC's discussion thread — the same one Share
 * shows, never a second channel (spec §7.1).
 *
 * The portal does not write on the NC: the treatment happens in beCPG, and a
 * consultation window that offered to change a state without carrying its
 * circuit would be a second quality model (rule R2).
 *
 * @param {Object} props
 * @param {Object|null} props.nc the row being consulted, `null` closes the modal
 * @param {Function} props.onClose
 * @param {Object} props.labels a LABELS dictionary
 * @param {string} props.lang
 */
function NonConformityDetail({ nc, onClose, labels, lang }) {
    const words = labels.detail;
    const style = (nc && STATE_STYLE[nc.state]) || { tone: 'neutral', icon: 'help_outline' };
    const actions = (nc && nc.correctiveActions) || [];

    return (
        <Modal open={Boolean(nc)} onClose={onClose} title={nc ? nc.name || '—' : ''} size="lg">
            {nc ? (
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusPill
                            status={nc.state || 'unknown'}
                            tone={style.tone}
                            icon={style.icon}
                            label={ncStateLabel(nc.state, lang)}
                            size="sm"
                        />
                        {nc.blocking ? (
                            <StatusPill
                                status="suspended"
                                tone="danger"
                                icon="block"
                                label={labels.blocking}
                                size="sm"
                            />
                        ) : null}
                        {nc.overdue ? (
                            <StatusPill
                                status="late"
                                tone="warn"
                                icon="schedule"
                                label={labels.overdue}
                                size="sm"
                            />
                        ) : null}
                    </div>

                    {/* The text first: it is what the reader came for. */}
                    <div>
                        {nc.description ? (
                            <>
                                <p className="text-[11px] uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                                    {words.description}
                                </p>
                                <p className="mt-0.5 whitespace-pre-wrap text-sm text-[var(--becpg-blue)]">
                                    {nc.description}
                                </p>
                            </>
                        ) : null}
                        {nc.comment ? (
                            <>
                                <p className="mt-3 text-[11px] uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                                    {words.comment}
                                </p>
                                <p className="mt-0.5 whitespace-pre-wrap text-sm text-[var(--becpg-blue)]">
                                    {nc.comment}
                                </p>
                            </>
                        ) : null}
                        {/* Say that beCPG carries no text, rather than showing a
                            blank that would be taken for a bug. */}
                        {!nc.description && !nc.comment ? (
                            <p className="text-sm text-[var(--becpg-dark-grey)]">{words.noText}</p>
                        ) : null}
                    </div>

                    <dl className="grid grid-cols-2 gap-3 border-t border-[var(--becpg-grey)] pt-3 sm:grid-cols-3">
                        <Fact label={words.type} value={ncTypeLabel(nc.ncType, lang)} />
                        <Fact
                            label={words.priority}
                            value={nc.priority === null ? null : (labels.priorities[nc.priority] || nc.priority)}
                        />
                        <Fact label="Code" value={nc.code} />
                        <Fact label={words.created} value={<DateText value={nc.createdAt} lang={lang} />} />
                        <Fact label={words.modified} value={<DateText value={nc.modifiedAt} lang={lang} />} />
                        <Fact label={words.cost} value={formatNumber(nc.cost, lang)} />
                    </dl>

                    <div className="border-t border-[var(--becpg-grey)] pt-3">
                        <p className="text-[11px] uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                            {words.actions}
                        </p>
                        {actions.length === 0 ? (
                            <p className="mt-0.5 text-sm text-[var(--becpg-dark-grey)]">{words.noActions}</p>
                        ) : (
                            <ul className="mt-1 flex flex-col gap-1">
                                {actions.map((action) => (
                                    <li
                                        key={action.nodeRef}
                                        className="flex flex-wrap items-center gap-2 text-sm"
                                    >
                                        <Icon
                                            name={action.done ? 'task_alt' : action.late ? 'alarm' : 'radio_button_unchecked'}
                                            size={16}
                                            className={action.late && !action.done
                                                ? 'text-[var(--status-danger)]'
                                                : action.done
                                                    ? 'text-[var(--status-ok)]'
                                                    : 'text-[var(--becpg-dark-grey)]'}
                                        />
                                        <span className="min-w-0 flex-1 truncate">{action.name || '—'}</span>
                                        {action.dueDate ? (
                                            <span className="shrink-0 text-xs text-[var(--becpg-dark-grey)]">
                                                <DateText value={action.dueDate} lang={lang} />
                                            </span>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {(nc.suppliers || []).length > 0 ? (
                        <div className="border-t border-[var(--becpg-grey)] pt-3">
                            <p className="text-[11px] uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                                {words.suppliers}
                            </p>
                            <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                {nc.suppliers.map((supplier) => (
                                    <li key={supplier.nodeRef}>
                                        <Link
                                            href={supplierHref(supplier)}
                                            className="rounded text-sm underline underline-offset-2 hover:text-[var(--becpg-blue-light)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                                        >
                                            {supplier.label || supplier.nodeRef}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    <div className="border-t border-[var(--becpg-grey)] pt-3">
                        <CommentsPanel entityNodeRef={nc.nodeRef} title={words.discussion} />
                    </div>
                </div>
            ) : null}
        </Modal>
    );
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
 * @param {Function} [props.onExport] see DataTable
 * @param {boolean} [props.exporting]
 * @param {React.ReactNode} [props.legend] see DataTable
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
    onExport,
    exporting = false,
    legend,
}) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);

    /** The NC being consulted, or `null`. Holds the row itself: the detail needs no fetch. */
    const [opened, setOpened] = useState(null);

    // `opened` is refreshed from `items` so a reload of the list — a filter, a
    // bulk action — updates the open panel instead of freezing yesterday's state
    // behind it.
    const openedRow = useMemo(
        () => (opened ? items.find((item) => item.nodeRef === opened.nodeRef) || opened : null),
        [opened, items],
    );

    const columns = useMemo(
        () => [
            {
                id: 'nc',
                accessorFn: (row) => `${row.name || ''} ${row.code || ''} ${row.ncType || ''}`,
                header: labels.columns.nc,
                meta: { primary: true, label: labels.columns.nc, width: '18rem' },
                /*
                 * The NC opens. The screen listed it without ever allowing it to
                 * be read: neither its description, nor the quality comment, nor
                 * its discussion. A real `<button>` — not a `<div onClick>` — and
                 * `stopPropagation`, so that consulting does not tick the row on
                 * the way.
                 */
                cell: ({ row }) => (
                    <div className="min-w-0">
                        <button
                            type="button"
                            title={labels.open}
                            onClick={(event) => {
                                event.stopPropagation();
                                setOpened(row.original);
                            }}
                            className="block w-full truncate rounded text-start font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                        >
                            {row.original.name || '—'}
                        </button>
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
                                // A real trigger, not a `title`: the other names
                                // must be readable from a keyboard and on a phone.
                                <Tooltip
                                    placement="top"
                                    content={suppliers.slice(1).map((entry) => entry.label || entry.nodeRef).join(', ')}
                                    className="shrink-0 rounded text-xs text-[var(--becpg-dark-grey)] underline decoration-dotted underline-offset-2"
                                >
                                    {fill(labels.others, { count: suppliers.length - 1 })}
                                </Tooltip>
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
                        <div className="text-end">
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
                                        className="ms-1 inline align-text-bottom"
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
                                <ul className="flex flex-col gap-1 text-start">
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
        <>
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
                storageKey="monitor.nonconformities"
                enablePagination={enablePagination}
                initialSorting={[{ id: 'delay', desc: true }]}
                initialColumnVisibility={{ cost: false }}
                /* The page searches on the server, through its toolbar: a second box
                   searching the displayed page only would answer another question. */
                enableFiltering={false}
                toolbar={toolbar}
                onExport={onExport}
                exporting={exporting}
                legend={legend}
                actions={actions}
                emptyState={<EmptyState icon="verified_user" variant="success" title={labels.empty} />}
                caption={labels.columns.nc}
            />
            <NonConformityDetail
                nc={openedRow}
                onClose={() => setOpened(null)}
                labels={labels}
                lang={lang}
            />
        </>
    );
}
