'use client';

/**
 * `/monitor/documents` — **la conformité documentaire du parc** (spec §4.6.3).
 *
 * *"C'est la vue que les équipes qualité impriment avant un audit."* One row per
 * supplier, one column per document type, and in each cell attendu / fourni /
 * valide jusqu'au / expiré / refusé. Everything on this page comes from
 * `GET /api/v1/monitor/documents`, which builds the whole matrix in ≈ 3 db-afts
 * queries (spec §4.6.6: db-afts first, no cube required for the current views).
 *
 * What the screen adds on top of the endpoint:
 *
 *  - **two filters that cost nothing**: the document type is pushed to the
 *    server (it narrows the scan window on a large park), the status is applied
 *    on the loaded matrix (it is a reading filter, not a query);
 *  - **a selection** — cells or whole suppliers — feeding the bulk reminder of
 *    `POST /api/v1/monitor/actions` through `BulkActionBar`. The reminder body
 *    is pre-filled with the document types actually selected, so the supplier
 *    reads *what* is expected, not "merci de mettre à jour vos documents";
 *  - **the export**: the same endpoint with `format=csv`, i.e. the same numbers
 *    as the screen, never a second computation;
 *  - **honesty about truncation**: beCPG clamps a listing query to 250 rows, so
 *    a park larger than the scan window is reported (`truncated`) instead of
 *    being silently cut.
 */

import { useCallback, useMemo, useState } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { Button, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { SearchInput, Select, Checkbox } from '@/components/ui/Field';
import { useMessages } from '@/lib/messages';
import { download, useApi } from '@/lib/client';
import {
    DocumentMatrix,
    EMPTY_SELECTION,
    MatrixLegend,
    selectionTargets,
    selectionTypes,
} from '@/components/monitor/DocumentMatrix';
import { BulkActionBar } from '@/components/monitor/BulkActionBar';

const LABELS = {
    fr: {
        title: 'Conformité documentaire',
        subtitle:
            'Matrice fournisseur × type de document. Sélectionnez des cellules ou des lignes pour relancer en masse.',
        search: 'Rechercher un fournisseur',
        allTypes: 'Tous les types de document',
        allStatuses: 'Tous les statuts',
        mandatoryOnly: 'Documents obligatoires uniquement',
        export: 'Exporter (CSV)',
        refresh: 'Rafraîchir',
        stats: {
            suppliers: 'Fournisseurs',
            missing: 'Manquants',
            expired: 'Expirés',
            expiring: 'À renouveler',
            refused: 'Refusés',
        },
        statuses: {
            valid: 'Valides',
            expiring: 'Expirent bientôt',
            expired: 'Expirés',
            missing: 'Manquants',
            refused: 'Refusés',
            toValidate: 'En validation',
        },
        truncated:
            'Parc plus large que la fenêtre d’analyse ({scanned} fournisseurs sur {total}) : affinez les filtres pour une matrice complète.',
        unsupported:
            'Filtre(s) non pris en charge par le modèle beCPG standard : {names}. À paramétrer côté client.',
        pageOf: '{from}–{to} sur {total} fournisseurs',
        previous: 'Précédent',
        next: 'Suivant',
        rows: 'Lignes',
        reminder:
            'Votre dossier fournisseur comporte des documents à mettre à jour sur le portail : {types}. Merci de les déposer dès que possible.',
        reminderGeneric:
            'Votre dossier fournisseur comporte des documents obligatoires manquants ou expirés. Merci de les mettre à jour sur le portail.',
        hintTypes: '{count} type(s) de document ciblé(s)',
    },
    en: {
        title: 'Document compliance',
        subtitle:
            'Supplier × document-type matrix. Select cells or rows to send a bulk reminder.',
        search: 'Search a supplier',
        allTypes: 'All document types',
        allStatuses: 'All statuses',
        mandatoryOnly: 'Mandatory documents only',
        export: 'Export (CSV)',
        refresh: 'Refresh',
        stats: {
            suppliers: 'Suppliers',
            missing: 'Missing',
            expired: 'Expired',
            expiring: 'To renew',
            refused: 'Rejected',
        },
        statuses: {
            valid: 'Valid',
            expiring: 'Expiring soon',
            expired: 'Expired',
            missing: 'Missing',
            refused: 'Rejected',
            toValidate: 'Being reviewed',
        },
        truncated:
            'Park larger than the scan window ({scanned} suppliers out of {total}): narrow the filters for a complete matrix.',
        unsupported:
            'Filter(s) unsupported by the standard beCPG model: {names}. Configure them client side.',
        pageOf: '{from}–{to} of {total} suppliers',
        previous: 'Previous',
        next: 'Next',
        rows: 'Rows',
        reminder:
            'Your supplier file has documents to update on the portal: {types}. Please upload them as soon as possible.',
        reminderGeneric:
            'Your supplier file has mandatory documents missing or expired. Please update them on the portal.',
        hintTypes: '{count} document type(s) targeted',
    },
};

/** Status order of `DEFAULT_DOCUMENT_CONFIG.statusOrder`, most severe first. */
const STATUSES = ['missing', 'refused', 'expired', 'expiring', 'toValidate', 'valid'];

const PAGE_SIZES = [25, 50, 100];

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]),
    );
}

export default function MonitorDocumentsPage() {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;

    const [query, setQuery] = useState('');
    const [documentType, setDocumentType] = useState('');
    const [status, setStatus] = useState('all');
    const [mandatoryOnly, setMandatoryOnly] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [selection, setSelection] = useState(EMPTY_SELECTION);

    const params = useMemo(
        () => ({
            q: query.trim() || undefined,
            documentType: documentType || undefined,
            mandatoryOnly: mandatoryOnly ? 'true' : undefined,
            page,
            pageSize,
        }),
        [query, documentType, mandatoryOnly, page, pageSize],
    );

    // The type filter narrows the server response to a single column, so the
    // option list is kept from the last **unfiltered** answer — otherwise
    // choosing a type would empty the very select that chose it. Captured in the
    // fetch callback, never during render: the catalog is state, not a ref.
    const [typeCatalog, setTypeCatalog] = useState([]);

    const matrix = useApi('monitor/documents', {
        params,
        onSuccess: (payload) => {
            if (!documentType && payload && Array.isArray(payload.columns)) {
                setTypeCatalog(payload.columns.filter((column) => column.nodeRef));
            }
        },
    });
    const data = matrix.data;

    const typeOptions = useMemo(
        () => typeCatalog.map((column) => ({ value: column.nodeRef, label: column.label })),
        [typeCatalog],
    );

    // Any change of what is displayed drops the selection: acting on rows the
    // user can no longer see would be relaunching blind. Done in the handlers,
    // never in an effect (an effect would fire after the reminder dialog opened).
    const resetView = useCallback(() => {
        setPage(1);
        setSelection(EMPTY_SELECTION);
    }, []);

    const goToPage = useCallback((updater) => {
        setPage(updater);
        setSelection(EMPTY_SELECTION);
    }, []);

    const totals = (data && data.totals) || {};
    const pagination = (data && data.pagination) || { page: 1, pageSize, totalItems: 0 };
    const filters = (data && data.filters) || {};

    const targets = useMemo(() => selectionTargets(selection), [selection]);
    const types = useMemo(() => selectionTypes(selection), [selection]);

    const reminderMessage = types.length > 0
        ? fill(labels.reminder, { types: types.join(', ') })
        : labels.reminderGeneric;

    const exportCsv = useCallback(() => {
        download('monitor/documents', {
            q: query.trim() || undefined,
            documentType: documentType || undefined,
            mandatoryOnly: mandatoryOnly ? 'true' : undefined,
            format: 'csv',
        });
    }, [query, documentType, mandatoryOnly]);

    const from = (pagination.page - 1) * pagination.pageSize + 1;
    const to = Math.min(pagination.page * pagination.pageSize, pagination.totalItems || 0);

    return (
        <AppShell
            space="monitor"
            title={labels.title}
            actions={
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        icon="refresh"
                        label={labels.refresh}
                        onClick={matrix.refresh}
                    />
                    <Button variant="secondary" size="sm" icon="download" onClick={exportCsv}>
                        <span className="hidden sm:inline">{labels.export}</span>
                    </Button>
                </div>
            }
        >
            <p className="mb-4 text-sm text-[var(--becpg-dark-grey)]">{labels.subtitle}</p>

            {/* ------------------------------------------------------ KPI row */}
            <StatGrid columns={4} className="mb-4">
                <StatCard
                    label={labels.stats.suppliers}
                    value={pagination.totalItems || 0}
                    icon="groups"
                    tone="info"
                    loading={matrix.loading}
                    index={0}
                    hint={
                        pagination.parkTotal && pagination.parkTotal !== pagination.totalItems
                            ? `/ ${pagination.parkTotal}`
                            : undefined
                    }
                />
                <StatCard
                    label={labels.stats.missing}
                    value={totals.missing || 0}
                    icon="help_outline"
                    tone={totals.missing ? 'danger' : 'ok'}
                    loading={matrix.loading}
                    index={1}
                    onClick={() => setStatus(status === 'missing' ? 'all' : 'missing')}
                />
                <StatCard
                    label={labels.stats.expired}
                    value={totals.expired || 0}
                    icon="error_outline"
                    tone={totals.expired ? 'danger' : 'ok'}
                    loading={matrix.loading}
                    index={2}
                    onClick={() => setStatus(status === 'expired' ? 'all' : 'expired')}
                />
                <StatCard
                    label={labels.stats.expiring}
                    value={totals.expiring || 0}
                    icon="schedule"
                    tone={totals.expiring ? 'warn' : 'ok'}
                    loading={matrix.loading}
                    index={3}
                    onClick={() => setStatus(status === 'expiring' ? 'all' : 'expiring')}
                />
            </StatGrid>

            {/* ------------------------------------------------------ toolbar */}
            <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="lg:w-64">
                    <SearchInput
                        value={query}
                        onChange={(value) => {
                            setQuery(value);
                            resetView();
                        }}
                        placeholder={labels.search}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Select
                        value={documentType}
                        placeholder={labels.allTypes}
                        options={typeOptions}
                        aria-label={labels.allTypes}
                        className="min-w-[12rem]"
                        onChange={(event) => {
                            setDocumentType(event.target.value);
                            resetView();
                        }}
                    />
                    <Select
                        value={status}
                        aria-label={labels.allStatuses}
                        className="min-w-[10rem]"
                        onChange={(event) => setStatus(event.target.value)}
                        options={[
                            { value: 'all', label: labels.allStatuses },
                            ...STATUSES.map((entry) => ({
                                value: entry,
                                label: labels.statuses[entry] || entry,
                            })),
                        ]}
                    />
                    <Checkbox
                        label={labels.mandatoryOnly}
                        checked={mandatoryOnly}
                        onChange={(event) => {
                            setMandatoryOnly(event.target.checked);
                            resetView();
                        }}
                    />
                </div>
            </div>

            {/* ----------------------------------------------------- warnings */}
            {pagination.truncated ? (
                <Card variant="accent" padding="sm" className="mb-3">
                    <p className="flex items-start gap-2 text-xs">
                        <Icon name="warning" size={16} className="mt-0.5 text-[var(--becpg-orange)]" />
                        <span>
                            {fill(labels.truncated, {
                                scanned: pagination.scanned,
                                total: pagination.parkTotal ?? pagination.scanned,
                            })}
                        </span>
                    </p>
                </Card>
            ) : null}

            {filters.unsupported && filters.unsupported.length > 0 ? (
                <p className="mb-3 text-xs text-[var(--becpg-dark-grey)]">
                    {fill(labels.unsupported, { names: filters.unsupported.join(', ') })}
                </p>
            ) : null}

            {/* ------------------------------------------------------- matrix */}
            <DocumentMatrix
                columns={(data && data.columns) || []}
                rows={(data && data.rows) || []}
                loading={matrix.loading}
                error={matrix.error}
                onRetry={matrix.refresh}
                statusFilter={status}
                selection={selection}
                onSelectionChange={setSelection}
                height={560}
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--becpg-dark-grey)]">
                <MatrixLegend />
                <div className="flex items-center gap-2">
                    <span className="tabular-nums">
                        {fill(labels.pageOf, {
                            from: pagination.totalItems ? from : 0,
                            to,
                            total: pagination.totalItems || 0,
                        })}
                    </span>
                    <select
                        aria-label={labels.rows}
                        className="rounded-md border border-[var(--becpg-grey)] bg-white px-2 py-1 text-xs"
                        value={pageSize}
                        onChange={(event) => {
                            setPageSize(Number(event.target.value));
                            resetView();
                        }}
                    >
                        {PAGE_SIZES.map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                    <Button
                        variant="outline"
                        size="sm"
                        icon="chevron_left"
                        label={labels.previous}
                        disabled={pagination.page <= 1}
                        onClick={() => goToPage((value) => Math.max(1, value - 1))}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        icon="chevron_right"
                        label={labels.next}
                        disabled={!pagination.hasMoreItems}
                        onClick={() => goToPage((value) => value + 1)}
                    />
                </div>
            </div>

            {/* ------------------------------------------------- bulk actions */}
            <BulkActionBar
                targets={targets}
                defaultMessage={reminderMessage}
                hint={types.length > 0 ? fill(labels.hintTypes, { count: types.length }) : undefined}
                onClear={() => setSelection(EMPTY_SELECTION)}
                onDone={() => {
                    setSelection(EMPTY_SELECTION);
                    matrix.refresh();
                }}
            />
        </AppShell>
    );
}
