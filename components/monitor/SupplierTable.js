'use client';

/**
 * **La liste fournisseurs du pilotage** (spec §4.6.2) — *"tri et filtres
 * multi-critères, comparaison de plusieurs fournisseurs côte à côte, export"*.
 *
 * Built on `components/ui/DataTable` (the portal's one table), so it inherits for
 * free: sorting, the column picker, row selection, the global search box and —
 * this is the part that matters here — the **card layout below `md`**. A
 * 10-column park datagrid is unusable on a tablet in portrait; the same row model
 * renders as a card there, and the selection survives the switch.
 *
 * ## What this file adds on top of DataTable
 *
 *  1. **A column catalog** (`buildSupplierColumns`) whose ids are the ones
 *     `ProfileSwitcher` reorders (spec §4.6.5). A profile decides the order and
 *     the default visibility; the column picker still brings a hidden column
 *     back, because a profile is a *reading*, not a permission.
 *  2. **The comparison view** — select rows, press *Comparer*, and the suppliers
 *     are put side by side, one column each, one metric per row. It is a table
 *     and not a grouped bar chart on purpose: with 2 to 6 suppliers × 10
 *     heterogeneous measures (a status, a percentage, four counts, a date) a
 *     chart would need a categorical hue per supplier and a shared scale that
 *     does not exist. The numbers, aligned and direct-labelled, are the chart.
 *  3. **Nothing is recomputed.** Every cell reads the payload of
 *     `GET /api/v1/monitor/suppliers`; the CSV export is that very endpoint with
 *     `format=csv`, so the export can never disagree with the screen.
 *
 * ## Data-viz rules applied
 *
 * - The only marks are the completion meters: one hue, value always written next
 *   to the bar, `role="meter"` with its `aria-valuenow` (`GaugeBar`).
 * - A count is never colour alone: a non-zero metric is a pill carrying an icon,
 *   the number, and a title spelling the metric out.
 * - Status and risk use the portal's status palette (`StatusPill`, `RISK_LEVELS`)
 *   which is reserved for state and never used as a series colour.
 */

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, Icon } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { GaugeBar } from '@/components/ui/Gauge';
import { Modal } from '@/components/ui/Modal';
import { StatusPill } from '@/components/ui/StatusPill';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatDate } from '@/lib/format';
import {
    MonitorActionButtons,
    RISK_LEVELS,
    describeReason,
} from '@/components/monitor/RiskList';
import { applyProfileOrder } from '@/components/monitor/ProfileSwitcher';
import { useMessages } from '@/lib/messages';

/**
 * Column id → the `sort` value `GET /monitor/suppliers` understands.
 *
 * The list is sorted **server side** (the derived columns only exist there,
 * spec §5.4.3) and re-sorted client side inside the loaded window by DataTable.
 * Both orders therefore have to speak of the same thing, which this table
 * guarantees.
 * @readonly
 */
export const SORT_PARAM_BY_COLUMN = Object.freeze({
    name: 'name',
    code: 'code',
    status: 'status',
    risk: 'risk',
    completion: 'completion',
    documentsExpiring: 'expiring',
    documentsExpired: 'expired',
    openNc: 'nc',
    lastActivity: 'lastActivity',
    buyer: 'buyer',
});

/** The inverse: what column a `sort` value refers to. */
export const COLUMN_BY_SORT_PARAM = Object.freeze(
    Object.entries(SORT_PARAM_BY_COLUMN).reduce(
        (accumulator, [column, param]) => ({ ...accumulator, [param]: column }),
        {},
    ),
);

const LABELS = {
    fr: {
        search: 'Filtrer les fournisseurs chargés…',
        caption: 'Fournisseurs du parc, statut d’agrément et indicateurs dérivés',
        columns: {
            name: 'Fournisseur',
            code: 'Code',
            status: 'Agrément',
            risk: 'Risque',
            completion: 'Complétude',
            documentsExpired: 'Doc. expirés',
            documentsExpiring: 'Doc. expirants',
            documentsMissing: 'Doc. manquants',
            openNc: 'NC ouvertes',
            openProjects: 'Projets',
            family: 'Famille',
            sites: 'Sites',
            buyer: 'Acheteur',
            lastActivity: 'Dernière activité',
        },
        metrics: {
            documentsExpired: '{count} document(s) obligatoire(s) expiré(s)',
            documentsExpiring: '{count} document(s) arrivant à échéance',
            documentsMissing: '{count} document(s) obligatoire(s) non fourni(s)',
            openNc: '{count} non-conformité(s) ouverte(s)',
            openProjects: '{count} projet(s) en cours',
        },
        none: '—',
        noBuyer: 'Non affecté',
        empty: 'Aucun fournisseur dans ce périmètre',
        emptyHint: 'Élargissez les filtres, ou vérifiez votre périmètre d’acheteur.',
        emptyFiltered: 'Aucun fournisseur ne correspond à ces filtres.',
        compare: 'Comparer',
        compareTitle: 'Comparaison de {count} fournisseurs',
        compareCapped:
            'Comparaison limitée aux {max} premiers fournisseurs sélectionnés — au-delà, les colonnes deviennent illisibles.',
        compareRows: {
            status: 'Statut d’agrément',
            reasons: 'Motifs',
            risk: 'Score de risque',
            completion: 'Complétude (catalogues)',
            documentsExpired: 'Documents expirés',
            documentsExpiring: 'Documents expirants',
            documentsMissing: 'Documents manquants',
            openNc: 'NC ouvertes',
            openProjects: 'Projets en cours',
            state: 'État beCPG',
            family: 'Famille',
            sites: 'Sites',
            buyer: 'Acheteur référent',
            lastActivity: 'Dernière activité',
        },
        openSheet: 'Ouvrir la fiche',
        selected: '{count} sélectionné(s)',
        clear: 'Vider la sélection',
        close: 'Fermer',
        noReason: 'Aucun motif de risque',
    },
    en: {
        search: 'Filter the loaded suppliers…',
        caption: 'Suppliers of the park, approval status and derived indicators',
        columns: {
            name: 'Supplier',
            code: 'Code',
            status: 'Approval',
            risk: 'Risk',
            completion: 'Completeness',
            documentsExpired: 'Expired doc.',
            documentsExpiring: 'Expiring doc.',
            documentsMissing: 'Missing doc.',
            openNc: 'Open NCs',
            openProjects: 'Projects',
            family: 'Family',
            sites: 'Sites',
            buyer: 'Buyer',
            lastActivity: 'Last activity',
        },
        metrics: {
            documentsExpired: '{count} mandatory document(s) expired',
            documentsExpiring: '{count} document(s) reaching their expiry',
            documentsMissing: '{count} mandatory document(s) not provided',
            openNc: '{count} open non-conformity(ies)',
            openProjects: '{count} open project(s)',
        },
        none: '—',
        noBuyer: 'Unassigned',
        empty: 'No supplier in this perimeter',
        emptyHint: 'Widen the filters, or check your buyer perimeter.',
        emptyFiltered: 'No supplier matches these filters.',
        compare: 'Compare',
        compareTitle: 'Comparing {count} suppliers',
        compareCapped:
            'Comparison limited to the first {max} selected suppliers — beyond that the columns stop being readable.',
        compareRows: {
            status: 'Approval status',
            reasons: 'Reasons',
            risk: 'Risk score',
            completion: 'Completeness (catalogs)',
            documentsExpired: 'Expired documents',
            documentsExpiring: 'Expiring documents',
            documentsMissing: 'Missing documents',
            openNc: 'Open NCs',
            openProjects: 'Open projects',
            state: 'beCPG state',
            family: 'Family',
            sites: 'Sites',
            buyer: 'Referring buyer',
            lastActivity: 'Last activity',
        },
        openSheet: 'Open the sheet',
        selected: '{count} selected',
        clear: 'Clear selection',
        close: 'Close',
        noReason: 'No risk reason',
    },
};

/** Suppliers a single comparison may hold — past that, columns are unreadable. */
export const MAX_COMPARED = 6;

/** Icon and tone of each derived metric. Tone is state, never identity. */
const METRIC_META = Object.freeze({
    documentsExpired: { icon: 'error_outline', tone: 'danger' },
    documentsExpiring: { icon: 'schedule', tone: 'warn' },
    documentsMissing: { icon: 'help_outline', tone: 'warn' },
    openNc: { icon: 'report_problem', tone: 'danger' },
    openProjects: { icon: 'pending_actions', tone: 'info' },
});

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]));
}

/**
 * A derived count. Zero is deliberately quiet (muted dash-like `0`) and a
 * non-zero count is a pill with an icon, the figure and a spelled-out title:
 * the reader never has to decode a colour.
 */
function MetricCell({ value, metric, local }) {
    const count = Number(value) || 0;
    const meta = METRIC_META[metric] || METRIC_META.openProjects;
    if (count === 0) {
        return <span className="text-xs tabular-nums text-[var(--becpg-dark-grey)]">0</span>;
    }
    return (
        <span
            className={`pill pill-sm pill-no-dot pill-${meta.tone}`}
            title={fill(local.metrics[metric] || '{count}', { count })}
        >
            <Icon name={meta.icon} size={13} />
            <span className="tabular-nums">{count}</span>
        </span>
    );
}

/**
 * The approval status, and why. The reasons are the answer to "what does this
 * supplier still owe", so they sit behind a real trigger a keyboard and a tap
 * can open, not in a `title` only a mouse ever shows.
 *
 * @param {Object} props
 * @param {{status: string, statusLabel: string, reasons: string[]}|null} props.approval
 */
function ApprovalCell({ approval }) {
    const pill = (
        <StatusPill
            status={approval ? approval.status : null}
            label={approval ? approval.statusLabel : undefined}
            size="sm"
        />
    );
    const reasons = approval?.reasons ?? [];
    if (reasons.length === 0) {
        return pill;
    }
    return (
        <Tooltip
            placement="top"
            content={(
                <ul className="m-0 list-disc pl-4">
                    {reasons.map((reason, position) => <li key={`${position}-${reason}`}>{reason}</li>)}
                </ul>
            )}
            className="rounded"
        >
            {pill}
        </Tooltip>
    );
}

/** Risk level + score. The level word travels with the colour, always. */
function RiskCell({ risk, lang }) {
    const level = RISK_LEVELS[(risk && risk.level) || 'low'] || RISK_LEVELS.low;
    const score = (risk && risk.score) || 0;
    return (
        <span className={`pill pill-sm pill-no-dot pill-${level.tone}`}>
            <Icon name={level.icon} size={13} />
            <span>{level[lang] || level.fr}</span>
            <span className="tabular-nums opacity-70">{score}</span>
        </span>
    );
}

/**
 * The column catalog. **Ids are a contract** with `MONITOR_PROFILES`
 * (spec §4.6.5): a profile names them to reorder and to hide.
 *
 * @param {Object} local label dictionary
 * @param {string} lang
 * @returns {Array<Object>} TanStack column definitions
 */
export function buildSupplierColumns(local, lang) {
    const columns = local.columns;
    return [
        {
            id: 'name',
            accessorFn: (row) => `${row.name || ''} ${row.legalName || ''}`,
            header: columns.name,
            meta: { primary: true, label: columns.name, width: '18rem' },
            cell: ({ row }) => (
                <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{row.original.name}</span>
                    {row.original.legalName && row.original.legalName !== row.original.name ? (
                        <span className="truncate text-xs text-[var(--becpg-dark-grey)]">
                            {row.original.legalName}
                        </span>
                    ) : null}
                </span>
            ),
        },
        {
            id: 'code',
            accessorFn: (row) => row.code || '',
            header: columns.code,
            meta: { secondary: true, label: columns.code, width: '7rem' },
            cell: ({ row }) => (
                <span className="text-xs tabular-nums text-[var(--becpg-dark-grey)]">
                    {row.original.code || row.original.erpCode || local.none}
                </span>
            ),
        },
        {
            id: 'status',
            accessorFn: (row) => (row.approval ? row.approval.severity : 9),
            header: columns.status,
            meta: { badge: true, label: columns.status, width: '9rem' },
            cell: ({ row }) => <ApprovalCell approval={row.original.approval} />,
        },
        {
            id: 'risk',
            accessorFn: (row) => (row.risk ? row.risk.score : 0),
            header: columns.risk,
            meta: { label: columns.risk, width: '9.5rem' },
            cell: ({ row }) => <RiskCell risk={row.original.risk} lang={lang} />,
        },
        {
            id: 'completion',
            accessorFn: (row) => (typeof row.completion === 'number' ? row.completion : -1),
            header: columns.completion,
            meta: { label: columns.completion, width: '9rem' },
            cell: ({ row }) =>
                typeof row.original.completion === 'number' ? (
                    <span className="block w-24">
                        <GaugeBar
                            value={row.original.completion}
                            size="sm"
                            ariaLabel={`${columns.completion} ${row.original.name}`}
                        />
                    </span>
                ) : (
                    <span className="text-xs text-[var(--becpg-dark-grey)]">{local.none}</span>
                ),
        },
        ...['documentsExpired', 'documentsExpiring', 'documentsMissing', 'openNc', 'openProjects'].map(
            (metric) => ({
                id: metric,
                accessorFn: (row) => (row.metrics ? row.metrics[metric] || 0 : 0),
                header: columns[metric],
                meta: { label: columns[metric], align: 'right', width: '7.5rem' },
                cell: ({ row }) => (
                    <MetricCell
                        value={row.original.metrics ? row.original.metrics[metric] : 0}
                        metric={metric}
                        local={local}
                    />
                ),
            }),
        ),
        {
            id: 'family',
            accessorFn: (row) => (row.family ? row.family.label || '' : ''),
            header: columns.family,
            meta: { label: columns.family, width: '10rem' },
            cell: ({ getValue }) => (
                <span className="block max-w-[10rem] truncate text-xs">{getValue() || local.none}</span>
            ),
        },
        {
            id: 'sites',
            accessorFn: (row) => (row.sites || []).map((site) => site.label).join(', '),
            header: columns.sites,
            meta: { label: columns.sites, width: '11rem' },
            cell: ({ getValue }) => (
                <span className="block max-w-[11rem] truncate text-xs" title={getValue() || undefined}>
                    {getValue() || local.none}
                </span>
            ),
        },
        {
            id: 'buyer',
            accessorFn: (row) => row.buyer || '',
            header: columns.buyer,
            meta: { label: columns.buyer, width: '9rem' },
            cell: ({ getValue }) =>
                getValue() ? (
                    <span className="block max-w-[9rem] truncate text-xs">{getValue()}</span>
                ) : (
                    <span className="text-xs text-[var(--becpg-dark-grey)]">{local.noBuyer}</span>
                ),
        },
        {
            id: 'lastActivity',
            accessorFn: (row) => (row.lastActivity ? Date.parse(row.lastActivity) : 0),
            header: columns.lastActivity,
            meta: { label: columns.lastActivity, align: 'right', width: '9rem' },
            cell: ({ row }) => (
                <span className="text-xs tabular-nums text-[var(--becpg-dark-grey)]">
                    {row.original.lastActivity ? formatDate(row.original.lastActivity, lang) : local.none}
                </span>
            ),
        },
    ];
}

/**
 * The rows of the comparison view: heterogeneous measures, one line each.
 *
 * @param {Object} local
 * @param {string} lang
 * @returns {Array<{id: string, label: string, render: Function}>}
 */
function compareRows(local, lang) {
    const rows = local.compareRows;
    const metric = (id) => ({
        id,
        label: rows[id],
        render: (item) => (
            <MetricCell value={item.metrics ? item.metrics[id] : 0} metric={id} local={local} />
        ),
    });

    return [
        {
            id: 'status',
            label: rows.status,
            render: (item) => (
                <StatusPill
                    status={item.approval ? item.approval.status : null}
                    label={item.approval ? item.approval.statusLabel : undefined}
                    size="sm"
                />
            ),
        },
        {
            id: 'reasons',
            label: rows.reasons,
            render: (item) => {
                const reasons = ((item.risk && item.risk.reasons) || [])
                    .map((reason) => describeReason(reason, lang))
                    .filter(Boolean);
                if (reasons.length === 0) {
                    return (
                        <span className="text-xs text-[var(--becpg-dark-grey)]">{local.noReason}</span>
                    );
                }
                return (
                    <ul className="flex flex-col gap-1">
                        {reasons.map((reason) => (
                            <li key={reason.label} className={`pill pill-sm pill-no-dot pill-${reason.tone}`}>
                                <Icon name={reason.icon} size={12} />
                                <span>{reason.label}</span>
                            </li>
                        ))}
                    </ul>
                );
            },
        },
        { id: 'risk', label: rows.risk, render: (item) => <RiskCell risk={item.risk} lang={lang} /> },
        {
            id: 'completion',
            label: rows.completion,
            render: (item) =>
                typeof item.completion === 'number' ? (
                    <GaugeBar
                        value={item.completion}
                        size="sm"
                        ariaLabel={`${rows.completion} ${item.name}`}
                    />
                ) : (
                    <span className="text-xs text-[var(--becpg-dark-grey)]">{local.none}</span>
                ),
        },
        metric('documentsExpired'),
        metric('documentsExpiring'),
        metric('documentsMissing'),
        metric('openNc'),
        metric('openProjects'),
        {
            id: 'state',
            label: rows.state,
            render: (item) => <span className="text-xs">{item.state || local.none}</span>,
        },
        {
            id: 'family',
            label: rows.family,
            render: (item) => (
                <span className="text-xs">
                    {(item.family && item.family.label) || local.none}
                </span>
            ),
        },
        {
            id: 'sites',
            label: rows.sites,
            render: (item) => (
                <span className="text-xs">
                    {(item.sites || []).map((site) => site.label).join(', ') || local.none}
                </span>
            ),
        },
        {
            id: 'buyer',
            label: rows.buyer,
            render: (item) => <span className="text-xs">{item.buyer || local.noBuyer}</span>,
        },
        {
            id: 'lastActivity',
            label: rows.lastActivity,
            render: (item) => (
                <span className="text-xs tabular-nums">
                    {item.lastActivity ? formatDate(item.lastActivity, lang) : local.none}
                </span>
            ),
        },
    ];
}

/**
 * Side-by-side comparison (spec §4.6.2). One column per supplier, one row per
 * measure, horizontally scrollable so it survives a tablet.
 *
 * @param {Object} props
 * @param {Array<Object>} props.items the selected suppliers
 * @param {boolean} props.open
 * @param {Function} props.onClose
 * @param {Function} [props.onDone] after an action ran on the selection
 */
export function SupplierCompare({ items, open, onClose, onDone }) {
    const { lang } = useMessages();
    const local = LABELS[lang] || LABELS.fr;
    const shown = items.slice(0, MAX_COMPARED);
    const rows = useMemo(() => compareRows(local, lang), [local, lang]);

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="full"
            title={fill(local.compareTitle, { count: shown.length })}
            footer={
                <div className="flex w-full flex-wrap items-center justify-between gap-2">
                    <MonitorActionButtons targets={shown} size="sm" onDone={onDone} />
                    <Button variant="outline" onClick={onClose}>
                        {local.close}
                    </Button>
                </div>
            }
        >
            {items.length > MAX_COMPARED ? (
                <p className="mb-3 flex items-start gap-2 rounded-lg bg-[var(--status-warn-bg)] px-3 py-2 text-xs text-[var(--status-warn)]">
                    <Icon name="info" size={14} className="mt-0.5 shrink-0" />
                    {fill(local.compareCapped, { max: MAX_COMPARED })}
                </p>
            ) : null}

            <div className="table-scroll -mx-1 px-1">
                <table className="w-full min-w-[36rem] border-collapse text-sm">
                    <caption className="sr-only-text">
                        {fill(local.compareTitle, { count: shown.length })}
                    </caption>
                    <thead>
                        <tr className="border-b border-[var(--becpg-grey)]">
                            <th scope="col" className="w-44 px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                                {' '}
                            </th>
                            {shown.map((item) => (
                                <th
                                    key={item.nodeRef}
                                    scope="col"
                                    className="min-w-[10rem] px-2 py-2 text-left align-bottom"
                                >
                                    <Link
                                        href={item.href}
                                        className="block truncate font-medium hover:text-[var(--becpg-orange)]"
                                        title={item.name}
                                    >
                                        {item.name}
                                    </Link>
                                    <span className="block truncate text-xs font-normal text-[var(--becpg-dark-grey)]">
                                        {item.code || item.erpCode || ''}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id} className="border-b border-[var(--becpg-grey)] last:border-0">
                                <th
                                    scope="row"
                                    className="px-2 py-2 text-left align-top text-xs font-medium text-[var(--becpg-dark-grey)]"
                                >
                                    {row.label}
                                </th>
                                {shown.map((item) => (
                                    <td key={item.nodeRef} className="px-2 py-2 align-top">
                                        {row.render(item)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        <tr>
                            <th scope="row" className="px-2 py-2 text-left text-xs font-medium text-[var(--becpg-dark-grey)]">
                                {' '}
                            </th>
                            {shown.map((item) => (
                                <td key={item.nodeRef} className="px-2 py-2">
                                    <Link
                                        href={item.href}
                                        className="inline-flex items-center gap-1 text-xs text-[var(--becpg-blue-light)] underline underline-offset-2 hover:text-[var(--becpg-orange)]"
                                    >
                                        <Icon name="open_in_new" size={13} />
                                        {local.openSheet}
                                    </Link>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </Modal>
    );
}

/**
 * @param {Object} props
 * @param {Array<Object>} props.items rows of `GET /api/v1/monitor/suppliers`
 * @param {boolean} [props.loading]
 * @param {Error} [props.error]
 * @param {Function} [props.onRetry]
 * @param {Object} props.profile the business profile (`useMonitorProfile().profile`)
 * @param {Object} props.selection controlled `{ [nodeRef]: true }`
 * @param {Function} props.onSelectionChange
 * @param {React.ReactNode} [props.actions] page-level buttons (export, refresh)
 * @param {React.ReactNode} [props.toolbar] extra filters next to the search box
 * @param {boolean} [props.filtered] the park is filtered — changes the empty state
 * @param {Function} [props.onResetFilters]
 * @param {Function} [props.onAfterAction] called after a monitoring write
 * @param {number} [props.pageSize=25]
 */
export function SupplierTable({
    items,
    loading = false,
    error = null,
    onRetry,
    profile,
    selection = {},
    onSelectionChange,
    actions,
    toolbar,
    filtered = false,
    onResetFilters,
    onAfterAction,
    pageSize = 25,
    className = '',
}) {
    const { lang } = useMessages();
    const local = LABELS[lang] || LABELS.fr;
    const [comparing, setComparing] = useState(false);

    const catalog = useMemo(() => buildSupplierColumns(local, lang), [local, lang]);

    // A profile reorders the catalog and hides what it did not ask for; the
    // column picker of DataTable still brings a hidden column back.
    const { ordered, hidden } = useMemo(
        () => applyProfileOrder(catalog, (profile && profile.columns) || []),
        [catalog, profile],
    );
    const initialColumnVisibility = useMemo(
        () => hidden.reduce((accumulator, id) => ({ ...accumulator, [id]: false }), {}),
        [hidden],
    );
    const initialSorting = useMemo(() => {
        const sort = (profile && profile.sort) || { by: 'risk', direction: 'desc' };
        const columnId = COLUMN_BY_SORT_PARAM[sort.by] || 'risk';
        return [{ id: columnId, desc: sort.direction !== 'asc' }];
    }, [profile]);

    const selected = useMemo(
        () => (items || []).filter((item) => selection[item.nodeRef]),
        [items, selection],
    );

    const clearSelection = useCallback(() => onSelectionChange({}), [onSelectionChange]);

    const afterAction = useCallback(() => {
        clearSelection();
        if (onAfterAction) {
            onAfterAction();
        }
    }, [clearSelection, onAfterAction]);

    return (
        <div className={className}>
            <DataTable
                /* Switching business profile changes the column order AND the
                   default visibility; the visibility lives in DataTable's own
                   state, so the table is remounted rather than left half
                   converted to the new reading. */
                key={(profile && profile.id) || 'default'}
                columns={ordered}
                data={items || []}
                loading={loading}
                error={error}
                onRetry={onRetry}
                getRowId={(row, index) => String(row.nodeRef || index)}
                rowHref={(row) => row.href}
                enableRowSelection
                rowSelection={selection}
                onRowSelectionChange={onSelectionChange}
                enableColumnVisibility
                storageKey={`monitor.suppliers.${(profile && profile.id) || 'default'}`}
                initialColumnVisibility={initialColumnVisibility}
                initialSorting={initialSorting}
                pageSize={pageSize}
                searchPlaceholder={local.search}
                caption={local.caption}
                toolbar={toolbar}
                actions={
                    <>
                        {selected.length >= 2 ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                icon="compare_arrows"
                                onClick={() => setComparing(true)}
                            >
                                {local.compare}
                                <span className="ml-1 tabular-nums">({selected.length})</span>
                            </Button>
                        ) : null}
                        {actions}
                    </>
                }
                emptyState={
                    <EmptyState
                        variant={filtered ? 'search' : 'empty'}
                        title={filtered ? local.emptyFiltered : local.empty}
                        message={filtered ? undefined : local.emptyHint}
                        actionLabel={filtered && onResetFilters ? local.clear : undefined}
                        onAction={filtered && onResetFilters ? onResetFilters : undefined}
                    />
                }
            />

            <SupplierCompare
                items={selected}
                open={comparing && selected.length >= 2}
                onClose={() => setComparing(false)}
                onDone={afterAction}
            />
        </div>
    );
}
