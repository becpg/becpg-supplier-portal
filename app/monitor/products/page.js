'use client';

/**
 * `/monitor/products` — the products entrusted to a supplier, from the
 * customer's side (#35846).
 *
 * The customer's counterpart of the supplier's own « Mes produits ». The
 * supplier list answers "what do I have to fill in"; this one answers **"what is
 * due for renewal"**, which is the question a quality or purchasing officer asks
 * of a park of several thousand raw materials, and which no screen answered: the
 * only way to see a supplier's products was to open that supplier's sheet, one
 * at a time.
 *
 * The population is `TYPE:"bcpg:product"` narrowed by the supplier aspect, and
 * both that aspect and `bcpg:certificateDate` are indexed — so the threshold
 * ("referenced more than three years ago", "no date at all") is a clause in the
 * query and the paging is the repository's own. Nothing here scans a window and
 * calls it a park.
 *
 * What the screen adds over the endpoint:
 *
 *  - **the renewal threshold as a choice, not a date picker**: one year, two,
 *    three, or "no certificate date", because that is how a renewal policy is
 *    stated and because the fourth case is the one people forget;
 *  - **the columns the customer asked for**: the supplier, its plants, the
 *    supplier's own reference, and the certificate date with its age;
 *  - **an honest sort**: the table sorts the page it holds, and says so. The
 *    repository exposes no sort on this listing, and ordering 25 rows out of
 *    1 300 would read as a ranking of the park.
 */

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell, PageHeader } from '@/components/shell/AppShell';
import { Button, Icon } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { SEARCH_SLOT_CLASS, SearchInput, Select } from '@/components/ui/Field';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatDate, formatTotal } from '@/lib/format';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { SUPPLIER_STATES, useDebouncedValue } from '@/components/monitor/MonitorFilters';
import { defineLabels, pickLabels } from '@/lib/i18n';
import { DateText } from '@/components/ui/DateText';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { useListExport } from '@/components/ui/useListExport';

const LABELS = defineLabels('app/monitor/products/page#LABELS', {
    fr: {
        title: 'Produits fournisseurs',
        subtitle:
            'Les produits confiés à un fournisseur. Filtrez sur la date de référencement pour voir ce qui est à renouveler.',
        search: 'Rechercher un produit, un code, une raison sociale…',
        state: 'État du produit',
        anyState: 'Tous les états',
        certified: 'Date de référencement',
        anyCertified: 'Toutes les dates',
        certifiedNone: 'Sans date',
        certifiedYears: 'Référencé il y a plus de {count} an(s)',
        tiles: {
            total: 'Produits',
            valid: 'Validés',
            draft: 'Simulation',
            noCertificate: 'Sans date de référencement',
        },
        columns: {
            name: 'Produit',
            code: 'Code',
            supplierRef: 'Réf. fournisseur',
            suppliers: 'Fournisseur(s)',
            plants: 'Usines fournisseur',
            state: 'État',
            certificate: 'Date de référencement',
            modified: 'Mise à jour',
        },
        age: 'il y a {count} an(s)',
        ageMonths: 'il y a {count} mois',
        none: '—',
        empty: 'Aucun produit dans ce périmètre',
        emptyHint:
            'Aucune entité produit ne porte l’aspect fournisseur avec ces filtres. Les produits apparaissent ici dès qu’un fournisseur leur est rattaché.',
        pageOf: '{from} – {to} sur {total}',
        previous: 'Page précédente',
        next: 'Page suivante',
        rows: 'Lignes par page',
        sortScope: 'Le tri porte sur la page affichée, pas sur tout le parc.',
    },
    en: {
        title: 'Supplier products',
        subtitle:
            'The products entrusted to a supplier. Filter on the certificate date to see what is due for renewal.',
        search: 'Search a product, a code, a legal name…',
        state: 'Product state',
        anyState: 'All states',
        certified: 'Certificate date',
        anyCertified: 'All dates',
        certifiedNone: 'No date',
        certifiedYears: 'Certified more than {count} year(s) ago',
        tiles: {
            total: 'Products',
            valid: 'Validated',
            draft: 'Simulation',
            noCertificate: 'No referencing date',
        },
        columns: {
            name: 'Product',
            code: 'Code',
            supplierRef: 'Supplier reference',
            suppliers: 'Supplier(s)',
            plants: 'Supplier plants',
            state: 'State',
            certificate: 'Certificate date',
            modified: 'Updated',
        },
        age: '{count} year(s) ago',
        ageMonths: '{count} month(s) ago',
        none: '—',
        empty: 'No product in this perimeter',
        emptyHint:
            'No product entity carries the supplier aspect with these filters. Products appear here as soon as a supplier is attached to them.',
        pageOf: '{from} – {to} of {total}',
        previous: 'Previous page',
        next: 'Next page',
        rows: 'Rows per page',
        sortScope: 'Sorting applies to the page shown, not to the whole park.',
    },
});

/** Page sizes offered under the table. */
const PAGE_SIZES = [25, 50, 100];

/** Renewal thresholds, in years. `none` is handled apart — see the adapter. */
const CERTIFIED_YEARS = [1, 2, 3];

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        (vars[key] === undefined || vars[key] === null ? match : String(vars[key])));
}

/**
 * The ISO date `n` years before now — what `certifiedBefore` expects.
 *
 * @param {number} years
 * @returns {string}
 */
function isoYearsAgo(years) {
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    return date.toISOString().slice(0, 10);
}

/**
 * How long ago a referencing was certified, in words.
 *
 * @param {number|null} days
 * @param {Object} labels
 * @returns {string|null}
 */
function ageLabel(days, labels) {
    if (days === null || days === undefined || days < 0) {
        return null;
    }
    if (days >= 365) {
        return fill(labels.age, { count: Math.floor(days / 365) });
    }
    return fill(labels.ageMonths, { count: Math.max(1, Math.round(days / 30)) });
}

/** A list of `{nodeRef, label}` refs, truncated to what a cell can carry. */
function RefList({ refs, empty }) {
    const list = Array.isArray(refs) ? refs.filter((ref) => ref && ref.label) : [];
    if (list.length === 0) {
        return <span className="text-[var(--becpg-dark-grey)]">{empty}</span>;
    }
    return (
        <span className="block truncate" title={list.map((ref) => ref.label).join(', ')}>
            {list[0].label}
            {list.length > 1 ? (
                <span className="text-[var(--becpg-dark-grey)]"> +{list.length - 1}</span>
            ) : null}
        </span>
    );
}

export default function MonitorProductsPage() {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);

    const [query, setQuery] = useState('');
    const [state, setState] = useState('');
    const [certified, setCertified] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

    // Typing is instant, querying is not: `q` is a real db-afts clause.
    const debounced = useDebouncedValue(query, 350);

    const params = useMemo(
        () => ({
            ...(debounced ? { q: debounced } : {}),
            ...(state ? { state } : {}),
            ...(certified ? { certifiedBefore: certified } : {}),
            page,
            pageSize,
        }),
        [debounced, state, certified, page, pageSize],
    );

    const call = useApi('monitor/products', { params });
    const exportQuery = useMemo(() => {
        const { page: unusedPage, pageSize: unusedPageSize, ...rest } = params;
        return rest;
    }, [params]);
    const listExport = useListExport({ path: 'monitor/products', query: exportQuery, filename: 'produits-fournisseurs' });
    const data = call.data;
    const items = useMemo(() => (data && Array.isArray(data.items) ? data.items : []), [data]);
    const pagination = (data && data.pagination) || {
        page: 1, pageSize, count: 0, totalItems: 0, hasMoreItems: false,
    };

    // A filter change puts the reader back on the first page: page 4 of another
    // population is not the page they were reading.
    const reset = useCallback((apply) => {
        apply();
        setPage(1);
    }, []);

    const stateOptions = useMemo(
        () => SUPPLIER_STATES.map((entry) => ({ value: entry.value, label: pickLabels(entry, lang) })),
        [lang],
    );

    /*
     * The tiles are the list's own filters, counted: a click applies one, a
     * second click on the active tile removes it.
     */
    const summary = (data && data.summary) || null;
    const TILES = [
        { id: 'total', icon: 'inventory_2', tone: 'info', active: !state && !certified, apply: () => { setState(''); setCertified(''); } },
        { id: 'valid', icon: 'verified', tone: 'ok', active: state === 'Valid', apply: () => setState(state === 'Valid' ? '' : 'Valid') },
        { id: 'draft', icon: 'edit_note', tone: 'neutral', active: state === 'Simulation', apply: () => setState(state === 'Simulation' ? '' : 'Simulation') },
        { id: 'noCertificate', icon: 'event_busy', tone: 'warn', active: certified === 'none', apply: () => setCertified(certified === 'none' ? '' : 'none') },
    ];

    const certifiedOptions = useMemo(
        () => [
            ...CERTIFIED_YEARS.map((years) => ({
                value: isoYearsAgo(years),
                label: fill(labels.certifiedYears, { count: years }),
            })),
            { value: 'none', label: labels.certifiedNone },
        ],
        [labels],
    );

    const columns = useMemo(
        () => [
            {
                id: 'name',
                accessorKey: 'name',
                header: labels.columns.name,
                meta: { primary: true, label: labels.columns.name, width: '20rem' },
                cell: ({ row }) => (
                    <Link
                        href={`/products/${encodeURIComponent(row.original.nodeRef)}`}
                        className="block truncate rounded text-[var(--becpg-blue)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                    >
                        {row.original.name}
                    </Link>
                ),
            },
            {
                id: 'code',
                accessorKey: 'code',
                header: labels.columns.code,
                meta: { secondary: true, label: labels.columns.code, width: '8rem' },
                cell: ({ row }) => (
                    <span className="tabular-nums text-[var(--becpg-dark-grey)]">
                        {row.original.code || labels.none}
                    </span>
                ),
            },
            {
                id: 'suppliers',
                accessorFn: (row) => (row.suppliers || []).map((ref) => ref.label).join(', '),
                header: labels.columns.suppliers,
                meta: { label: labels.columns.suppliers, width: '12rem' },
                cell: ({ row }) => <RefList refs={row.original.suppliers} empty={labels.none} />,
            },
            {
                id: 'plants',
                accessorFn: (row) => (row.plants || []).map((ref) => ref.label).join(', '),
                header: labels.columns.plants,
                meta: { label: labels.columns.plants, width: '12rem' },
                cell: ({ row }) => <RefList refs={row.original.plants} empty={labels.none} />,
            },
            {
                id: 'supplierRef',
                accessorKey: 'supplierRefCode',
                header: labels.columns.supplierRef,
                meta: { label: labels.columns.supplierRef, width: '10rem' },
                cell: ({ row }) => (
                    <span className="text-[var(--becpg-dark-grey)]">
                        {row.original.supplierRefCode || labels.none}
                    </span>
                ),
            },
            {
                id: 'certificate',
                accessorKey: 'certificateDate',
                header: labels.columns.certificate,
                meta: { label: labels.columns.certificate, width: '12rem' },
                cell: ({ row }) => {
                    const date = formatDate(row.original.certificateDate, lang);
                    if (!date) {
                        return <span className="text-[var(--becpg-dark-grey)]">{labels.none}</span>;
                    }
                    const age = ageLabel(row.original.certificateAgeDays, labels);
                    return (
                        <span className="tabular-nums">
                            {date}
                            {age ? (
                                <span className="ms-1 text-xs text-[var(--becpg-dark-grey)]">({age})</span>
                            ) : null}
                        </span>
                    );
                },
            },
            {
                id: 'state',
                accessorKey: 'state',
                header: labels.columns.state,
                meta: { badge: true, label: labels.columns.state, width: '9rem' },
                cell: ({ row }) => (row.original.state
                    ? <StatusPill status={row.original.state} size="sm" />
                    : <span className="text-[var(--becpg-dark-grey)]">{labels.none}</span>),
            },
            {
                id: 'modified',
                accessorKey: 'modified',
                header: labels.columns.modified,
                meta: { label: labels.columns.modified, align: 'right', width: '9rem' },
                cell: ({ row }) => (
                    <span className="tabular-nums text-xs"><DateText value={row.original.modified} lang={lang} /></span>
                ),
            },
        ],
        [labels, lang],
    );

    const rowsOnPage = Number.isFinite(pagination.count) ? pagination.count : items.length;
    const from = rowsOnPage === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
    const to = (pagination.page - 1) * pagination.pageSize + rowsOnPage;
    const total = formatTotal(
        { total: pagination.totalItems, exact: pagination.hasMoreItems !== true },
        lang,
    );

    return (
        <AppShell ownHeading fullWidth space="monitor" title={labels.title}>
            <PageHeader
                title={labels.title}
                description={(
                    <span className="flex flex-col gap-1">
                        <span>{labels.subtitle}</span>
                        <span>{labels.sortScope}</span>
                    </span>
                )}
            />

            <StatGrid columns={4} className="mb-4">
                {TILES.map((tile, index) => {
                    const entry = summary ? summary[tile.id] : null;
                    return (
                        <StatCard
                            key={tile.id}
                            index={index}
                            label={labels.tiles[tile.id]}
                            value={entry ? formatTotal({ total: entry.count, exact: entry.exact }, lang).text : null}
                            icon={tile.icon}
                            tone={tile.tone}
                            loading={call.loading && !data}
                            onClick={() => reset(tile.apply)}
                            aria-pressed={tile.active}
                            badge={tile.active && tile.id !== 'total' ? (
                                <span className="pill pill-info pill-sm pill-no-dot"><Icon name="filter_alt" size={12} /></span>
                            ) : null}
                        />
                    );
                })}
            </StatGrid>

            <DataTable
                columns={columns}
                data={items}
                loading={call.loading && !data}
                error={call.error}
                onRetry={call.refresh}
                getRowId={(row, index) => String(row.nodeRef || index)}
                enableFiltering={false}
                enablePagination={false}
                enableColumnVisibility
                onExport={listExport.onExport}
                exporting={listExport.exporting}
                storageKey="monitor.products"
                toolbar={
                    <>
                        <div className={SEARCH_SLOT_CLASS}>
                            <SearchInput
                                value={query}
                                onChange={(value) => reset(() => setQuery(value))}
                                placeholder={labels.search}
                            />
                        </div>
                        <Select
                            aria-label={labels.certified}
                            value={certified}
                            placeholder={labels.anyCertified}
                            options={certifiedOptions}
                            onChange={(event) => reset(() => setCertified(event.target.value))}
                            className="w-auto"
                        />
                        <Select
                            aria-label={labels.state}
                            value={state}
                            placeholder={labels.anyState}
                            options={stateOptions}
                            onChange={(event) => reset(() => setState(event.target.value))}
                            className="w-auto"
                        />
                    </>
                }
                caption={labels.title}
                emptyState={
                    <EmptyState
                        variant="empty"
                        icon="inventory_2"
                        title={labels.empty}
                        message={labels.emptyHint}
                    />
                }
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--becpg-dark-grey)]">
                <span />
                <div className="flex items-center gap-2">
                    <span className="tabular-nums">
                        {fill(labels.pageOf, { from, to, total: total.text })}
                    </span>
                    <select
                        aria-label={labels.rows}
                        className="rounded-md border border-[var(--becpg-grey)] bg-white px-2 py-1 text-xs"
                        value={pageSize}
                        onChange={(event) => reset(() => setPageSize(Number(event.target.value)))}
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
                        onClick={() => setPage((value) => Math.max(1, value - 1))}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        icon="chevron_right"
                        label={labels.next}
                        disabled={!pagination.hasMoreItems}
                        onClick={() => setPage((value) => value + 1)}
                    />
                </div>
            </div>
        </AppShell>
    );
}
