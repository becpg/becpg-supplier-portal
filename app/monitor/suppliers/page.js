'use client';

/**
 * `/monitor/suppliers` — the supplier steering list (spec §4.6.2).
 *
 * Columns: statut d'agrément, score de risque, complétude, documents expirants,
 * NC ouvertes, dernière activité, acheteur référent. Multi-criteria filters,
 * side-by-side comparison of a selection, CSV export, and the three park actions
 * (*relancer, escalader, suspendre*) on that same selection.
 *
 * ## What is server-side and what is not, and why
 *
 * Approval status, expiry counts and risk are **derived, never persisted**
 * (spec §5.4.3): there is no `bcpg:approvalStatus` to sort or filter on, by
 * design. So the endpoint selects the park with one db-afts query, computes the
 * derived columns with the seven approval queries, and only then orders and
 * pages. That is why:
 *
 *  - the **status filter** and the **sort** are query parameters, not client-side
 *    work: they must be applied to the whole park, not to the loaded page;
 *  - the page loads a **window of 100 rows** and lets `DataTable` search, sort
 *    and paginate inside it — those are free and instant — while a *window*
 *    pager below walks the park 100 rows at a time;
 *  - beCPG clamps a listing to `beCPG.remote.maxResults.limit` (250 rows here),
 *    so above that the payload reports `truncated` / `sortScope: 'window'` and
 *    **this screen says so** instead of presenting a partial ranking as the park.
 *    The **CSV export is cut by the same limit**, and the API says so in the
 *    `X-Portal-Truncated` response header — which a browser download cannot read.
 *    So the warning is raised *before* the download, from `pagination.truncated`
 *    of the payload already on screen: a file handed to an auditor must never
 *    look complete when it is not.
 *
 * ## The business profile (§4.6.5)
 *
 * `ProfileSwitcher` reorders the columns and picks the opening sort — Qualité
 * lands on expired documents, Achats on the blocking approval status, R&D on the
 * least complete files, RSE on the expiring certificates. Same rows, same ACLs,
 * four readings.
 */

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell, PageHeader } from '@/components/shell/AppShell';
import { Button, Icon } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/Modal';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { BulkActionBar } from '@/components/monitor/BulkActionBar';
import {
    EMPTY_MONITOR_FILTERS,
    MonitorFilters,
    mergeFilterOptions,
    monitorFilterParams,
    monitorFilterQuery,
    readMonitorFilters,
    useDebouncedValue,
} from '@/components/monitor/MonitorFilters';
import { ProfileSwitcher, useMonitorProfile } from '@/components/monitor/ProfileSwitcher';
import { SupplierTable } from '@/components/monitor/SupplierTable';
import { HistoryUnavailable } from '@/components/monitor/SupplierScorecard';
import { download, useApi } from '@/lib/client';
import { formatTotal } from '@/lib/format';
import { useMessages } from '@/lib/messages';

/** Rows fetched per call. The API caps `pageSize` at 100. */
const WINDOW_SIZE = 100;

/** The four derived approval statuses, most severe first (spec §5.4.3). */
const STATUSES = ['suspended', 'toRenew', 'inProgress', 'approved'];

const STATUS_META = {
    suspended: { icon: 'block', tone: 'danger' },
    toRenew: { icon: 'update', tone: 'warn' },
    inProgress: { icon: 'autorenew', tone: 'info' },
    approved: { icon: 'verified', tone: 'ok' },
};

const LABELS = {
    fr: {
        title: 'Fournisseurs',
        description:
            'Le parc, colonne par colonne. Sélectionnez des lignes pour comparer, relancer, escalader ou suspendre.',
        statuses: {
            suspended: 'Suspendus',
            toRenew: 'À renouveler',
            inProgress: 'En cours',
            approved: 'Agréés',
        },
        statusHint: 'Cliquez pour filtrer',
        statusFiltered: 'Filtre actif',
        export: 'Exporter (CSV)',
        exportCutTitle: 'Export incomplet : {scanned} lignes sur {total}',
        exportCutMessage:
            'beCPG limite une liste à 250 lignes par requête, l’export porte donc sur la fenêtre lue et non sur tout le parc. Affinez les filtres (famille, acheteur, statut) et exportez par lot pour un fichier complet.',
        exportCutConfirm: 'Exporter la fenêtre',
        refresh: 'Rafraîchir',
        generatedAt: 'Données au {time}',
        windowOf: '{from}–{to} sur {total} fournisseurs',
        previous: 'Fenêtre précédente',
        next: 'Fenêtre suivante',
        truncated:
            'Parc plus large que la fenêtre d’analyse ({scanned} lus sur {total}) : le tri et le classement portent sur cette fenêtre. Affinez les filtres pour un classement exact sur tout le parc.',
        sortScope: 'Tri sur la fenêtre lue',
        sortedBy: 'Tri initial : {sort}',
        reminder:
            'Bonjour,\n\nVotre dossier fournisseur nécessite une mise à jour (documents obligatoires manquants, expirés ou en attente).\nMerci de vous connecter au portail pour le compléter.\n\nCordialement,',
        countsScope: 'Répartition sur les {scanned} fournisseurs lus',
        sortNames: {
            risk: 'risque décroissant',
            name: 'nom',
            code: 'code',
            status: 'statut d’agrément',
            completion: 'complétude',
            expiring: 'documents expirants',
            expired: 'documents expirés',
            nc: 'NC ouvertes',
            lastActivity: 'dernière activité',
            buyer: 'acheteur',
        },
    },
    en: {
        title: 'Suppliers',
        description:
            'The park, column by column. Select rows to compare, remind, escalate or suspend.',
        statuses: {
            suspended: 'Suspended',
            toRenew: 'To renew',
            inProgress: 'In progress',
            approved: 'Approved',
        },
        statusHint: 'Click to filter',
        statusFiltered: 'Filter active',
        export: 'Export (CSV)',
        exportCutTitle: 'Incomplete export: {scanned} rows out of {total}',
        exportCutMessage:
            'beCPG caps a listing at 250 rows per query, so the export covers the window read, not the whole park. Narrow the filters (family, buyer, status) and export in batches for a complete file.',
        exportCutConfirm: 'Export the window',
        refresh: 'Refresh',
        generatedAt: 'Data as of {time}',
        windowOf: '{from}–{to} of {total} suppliers',
        previous: 'Previous window',
        next: 'Next window',
        truncated:
            'Park larger than the scan window ({scanned} read out of {total}): sorting and ranking cover that window. Narrow the filters for an exact park-wide ranking.',
        sortScope: 'Sorted within the window read',
        sortedBy: 'Opening sort: {sort}',
        reminder:
            'Hello,\n\nYour supplier file needs an update (mandatory documents missing, expired or pending).\nPlease sign in to the portal to complete it.\n\nKind regards,',
        countsScope: 'Breakdown over the {scanned} suppliers read',
        sortNames: {
            risk: 'risk, descending',
            name: 'name',
            code: 'code',
            status: 'approval status',
            completion: 'completeness',
            expiring: 'expiring documents',
            expired: 'expired documents',
            nc: 'open NCs',
            lastActivity: 'last activity',
            buyer: 'buyer',
        },
    },
};

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]));
}

/**
 * @returns {JSX.Element}
 */
function MonitorSuppliersScreen() {
    const { lang } = useMessages();
    const local = LABELS[lang] || LABELS.fr;
    const searchParams = useSearchParams();
    const { profile } = useMonitorProfile();

    // --- state seeded by the URL --------------------------------------------
    const urlFilters = readMonitorFilters(searchParams);
    const urlStatus = (searchParams.get('status') || '')
        .split(',')
        .map((value) => value.trim())
        .filter((value) => STATUSES.includes(value));
    const urlKey = `${monitorFilterQuery(urlFilters)}|${urlStatus.join(',')}`;

    const [state, setState] = useState({
        key: urlKey,
        filters: urlFilters,
        status: urlStatus,
        page: 1,
    });
    if (state.key !== urlKey) {
        setState({ key: urlKey, filters: urlFilters, status: urlStatus, page: 1 });
    }
    const [selection, setSelection] = useState({});

    const patchFilters = useCallback((values) => {
        setState((previous) => {
            const filters = { ...previous.filters, ...values };
            return {
                ...previous,
                key: `${monitorFilterQuery(filters)}|${previous.status.join(',')}`,
                filters,
                page: 1,
            };
        });
        // Acting on rows that are about to be replaced would be relanching blind.
        setSelection({});
    }, []);

    const resetFilters = useCallback(() => {
        setState({ key: '', filters: { ...EMPTY_MONITOR_FILTERS }, status: [], page: 1 });
        setSelection({});
    }, []);

    const toggleStatus = useCallback((status) => {
        setState((previous) => {
            const status_ = previous.status.includes(status)
                ? previous.status.filter((value) => value !== status)
                : [...previous.status, status];
            return {
                ...previous,
                key: `${monitorFilterQuery(previous.filters)}|${status_.join(',')}`,
                status: status_,
                page: 1,
            };
        });
        setSelection({});
    }, []);

    const goToWindow = useCallback((delta) => {
        setState((previous) => ({ ...previous, page: Math.max(1, previous.page + delta) }));
        setSelection({});
    }, []);

    // --- the call -----------------------------------------------------------
    const debounced = useDebouncedValue(state, 350);
    const sort = (profile && profile.sort) || { by: 'risk', direction: 'desc' };

    const params = useMemo(
        () =>
            monitorFilterParams(debounced.filters, {
                status: debounced.status.join(','),
                sort: sort.by,
                direction: sort.direction,
                page: debounced.page,
                pageSize: WINDOW_SIZE,
            }),
        [debounced, sort.by, sort.direction],
    );

    const list = useApi('monitor/suppliers', { params });
    const data = list.data;
    const items = useMemo(() => (data && Array.isArray(data.items) ? data.items : []), [data]);
    const pagination = (data && data.pagination) || {
        page: 1,
        pageSize: WINDOW_SIZE,
        count: 0,
        totalItems: 0,
        totalAtLeast: 0,
        totalExact: true,
        hasMoreItems: false,
        scanned: 0,
        truncated: false,
        sortScope: 'park',
    };
    const counts = (data && data.counts) || {};
    const payloadFilters = (data && data.filters) || {};

    // The filter vocabularies are harvested from the rows already loaded and kept
    // across pages — otherwise choosing a family would empty the very select that
    // chose it (there is no facet endpoint, see the lot's API-gap note).
    // Accumulated in state and merged **during render** when a new payload
    // arrives, the way `useApi` adjusts its own state: an effect would paint one
    // frame with the previous vocabulary.
    const [vocabulary, setVocabulary] = useState({ payload: null, values: {} });
    if (data && vocabulary.payload !== data) {
        setVocabulary((previous) => ({
            payload: data,
            values: mergeFilterOptions(previous.values, data.items || []),
        }));
    }

    const exportCsv = useCallback(() => {
        download(
            'monitor/suppliers',
            monitorFilterParams(state.filters, {
                status: state.status.join(','),
                sort: sort.by,
                direction: sort.direction,
                format: 'csv',
            }),
        );
    }, [state.filters, state.status, sort.by, sort.direction]);

    // A truncated park makes a truncated CSV. The API flags it in a response
    // header, which an anchor download never surfaces, so the warning is raised
    // here from the payload already on screen.
    const [exportWarning, setExportWarning] = useState(false);
    const requestExport = useCallback(() => {
        if (pagination.truncated) {
            setExportWarning(true);
            return;
        }
        exportCsv();
    }, [pagination.truncated, exportCsv]);

    const afterAction = useCallback(() => {
        setSelection({});
        list.refresh();
    }, [list]);

    const selected = useMemo(
        () => items.filter((item) => selection[item.nodeRef]),
        [items, selection],
    );

    // `from`/`to` describe the page in hand, so they are counted from the rows in
    // hand — never from `totalItems`, which is `null` whenever beCPG could only
    // answer with its `count + 1` sentinel (see `formatTotal`). The total is
    // rendered on its own and degrades to "au moins N" when that is all we know.
    const rowsOnPage = Number.isFinite(pagination.count) ? pagination.count : items.length;
    const from = rowsOnPage === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
    const to = (pagination.page - 1) * pagination.pageSize + rowsOnPage;
    const total = formatTotal(pagination, lang);
    const filtered =
        state.status.length > 0
        || Object.values(state.filters).some((value) => Boolean(value));

    return (
        <AppShell
            fullWidth
            space="monitor"
            title={local.title}
            actions={
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        icon="refresh"
                        label={local.refresh}
                        loading={list.loading}
                    onClick={list.refresh}
                    />
                    <Button variant="secondary" size="sm" icon="download" onClick={requestExport}>
                        <span className="hidden sm:inline">{local.export}</span>
                    </Button>
                </div>
            }
        >
            <PageHeader
                title={local.title}
                description={local.description}
                actions={<ProfileSwitcher compact />}
            />

            {/* --------------------------------------------- status breakdown */}
            <StatGrid columns={4} className="mb-4">
                {STATUSES.map((status, index) => {
                    const active = state.status.includes(status);
                    return (
                        <StatCard
                            key={status}
                            index={index}
                            label={local.statuses[status]}
                            value={counts[status] || 0}
                            icon={STATUS_META[status].icon}
                            tone={STATUS_META[status].tone}
                            loading={list.loading && !data}
                            onClick={() => toggleStatus(status)}
                            hint={active ? local.statusFiltered : local.statusHint}
                            badge={
                                active ? (
                                    <span className="pill pill-info pill-sm pill-no-dot">
                                        <Icon name="filter_alt" size={12} />
                                    </span>
                                ) : null
                            }
                        />
                    );
                })}
            </StatGrid>

            <MonitorFilters
                className="mb-3"
                filters={state.filters}
                onChange={patchFilters}
                onReset={resetFilters}
                options={vocabulary.values}
                applied={payloadFilters.applied || []}
                unsupported={payloadFilters.unsupported || []}
            />

            {pagination.truncated ? (
                <p className="mb-3 flex items-start gap-2 rounded-lg bg-[var(--status-warn-bg)] px-3 py-2 text-xs text-[var(--status-warn)]">
                    <Icon name="info" size={16} className="mt-0.5 shrink-0" />
                    {fill(local.truncated, {
                        scanned: pagination.scanned,
                        total: total.label,
                    })}
                </p>
            ) : null}

            {list.error ? (
                <ErrorState error={list.error} onRetry={list.refresh} />
            ) : (
                <SupplierTable
                    items={items}
                    loading={list.loading && !data}
                    profile={profile}
                    selection={selection}
                    onSelectionChange={setSelection}
                    filtered={filtered}
                    onResetFilters={resetFilters}
                    onAfterAction={afterAction}
                    onRetry={list.refresh}
                />
            )}

            {/* ------------------------------------------------- window pager */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--becpg-dark-grey)]">
                <div className="flex flex-col gap-0.5">
                    <span className="tabular-nums">
                        {fill(local.windowOf, { from, to, total: total.text })}
                    </span>
                    <span>
                        {fill(local.sortedBy, {
                            sort: local.sortNames[sort.by] || sort.by,
                        })}
                        {pagination.sortScope === 'window' ? ` · ${local.sortScope}` : ''}
                    </span>
                    {pagination.scanned && data ? (
                        <span>{fill(local.countsScope, { scanned: pagination.scanned })}</span>
                    ) : null}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        icon="chevron_left"
                        label={local.previous}
                        disabled={pagination.page <= 1}
                        onClick={() => goToWindow(-1)}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        icon="chevron_right"
                        label={local.next}
                        disabled={!pagination.hasMoreItems}
                        onClick={() => goToWindow(1)}
                    />
                </div>
            </div>

            <HistoryUnavailable className="mt-4" history={data && data.history} compact />

            <ConfirmModal
                open={exportWarning}
                onClose={() => setExportWarning(false)}
                onConfirm={exportCsv}
                title={fill(local.exportCutTitle, {
                    scanned: pagination.scanned,
                    total: total.label,
                })}
                message={local.exportCutMessage}
                confirmLabel={local.exportCutConfirm}
            />

            {/* ------------------------------- relancer / escalader / suspendre */}
            <BulkActionBar
                targets={selected}
                defaultMessage={local.reminder}
                onClear={() => setSelection({})}
                onDone={afterAction}
            />
        </AppShell>
    );
}

/**
 * @returns {JSX.Element}
 */
export default function MonitorSuppliersPage() {
    return (
        <Suspense
            fallback={
                <AppShell space="monitor" fullWidth>
                    <SkeletonTable rows={8} columns={6} />
                </AppShell>
            }
        >
            <MonitorSuppliersScreen />
        </Suspense>
    );
}
