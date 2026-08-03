'use client';

/**
 * `/products` — the supplier's catalogue.
 *
 * The V1 already had it as the `product-catalog` dashlet; what it never showed
 * is **where each product stands**: its completion (derived from
 * `bcpg:entityScore`, already stored by `EntityCatalogFormulationHandler`) and
 * the referencing project it belongs to. Both come free with
 * `GET /api/v1/entities?withProjects=1`, so the list is a decision surface
 * rather than an inventory.
 *
 * The table is `DataTable`, which renders a real `<table>` on desktop and a card
 * stack on a phone from the same row model — a 6-column grid is unusable at
 * 360px, and this portal is used on phones (spec §4.3).
 */

import { useMemo, useState } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { DataTable } from '@/components/ui/DataTable';
import { Select } from '@/components/ui/Field';
import { GaugeBar } from '@/components/ui/Gauge';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { Icon } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { entityTypeLabel } from '@/components/products/ProductHeader';
import { formatDate, formatTotal } from '@/lib/format';
import { useSession } from '@/components/providers/SessionProvider';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])),
    );
}

const LABELS = {
    fr: {
        title: 'Mes produits',
        subtitle: 'Les fiches que le client vous demande de tenir à jour',
        search: 'Rechercher un produit',
        allStates: 'Tous les états',
        allTypes: 'Tous les types',
        scope: 'Périmètre',
        scopeCurrent: 'Fiche courante',
        scopeAll: 'Toutes mes fiches',
        branch: 'MAJ',
        branchFrom: 'Mise à jour de la version {version}',
        columns: {
            name: 'Produit',
            code: 'Code',
            type: 'Type',
            state: 'État',
            completion: 'Complétude',
            project: 'Projet',
            modified: 'Mise à jour',
        },
        stats: {
            total: 'Produits',
            valid: 'Validés',
            pending: 'En cours',
            completion: 'Complétude moyenne',
        },
        empty: 'Aucun produit',
        emptyHint:
            'Aucun produit ne vous est rattaché pour le moment. Une fiche apparaît ici dès que le client vous en confie une.',
    },
    en: {
        title: 'My products',
        subtitle: 'The sheets the customer asks you to keep up to date',
        search: 'Search a product',
        allStates: 'All states',
        allTypes: 'All types',
        scope: 'Scope',
        scopeCurrent: 'Current record',
        scopeAll: 'All my records',
        branch: 'Update',
        branchFrom: 'Update of version {version}',
        columns: {
            name: 'Product',
            code: 'Code',
            type: 'Type',
            state: 'State',
            completion: 'Completion',
            project: 'Project',
            modified: 'Updated',
        },
        stats: {
            total: 'Products',
            valid: 'Validated',
            pending: 'In progress',
            completion: 'Average completion',
        },
        empty: 'No product',
        emptyHint:
            'No product is linked to you yet. A sheet shows up here as soon as the customer assigns one.',
    },
};

/** `bcpg:productState` values, in the order of the product life cycle. */
const STATES = ['Simulation', 'ToValidate', 'Valid', 'Refused', 'Stopped', 'Archived'];

export default function ProductsPage() {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;

    const [state, setState] = useState('');
    const [type, setType] = useState('');

    // The type filter offers what the supplier actually holds, learned from the
    // rows the repository returns — never a hard-coded list of entity types.
    // Values accumulate: filtering on one type narrows the payload to that type,
    // and an option must not disappear from under the user's cursor.
    const [seenTypes, setSeenTypes] = useState([]);

    const { supplier, suppliers } = useSession();
    // Only meaningful for an account acting for several records; a single-record
    // account is already looking at everything it has.
    const canScope = suppliers.length > 1;
    const [scopeAll, setScopeAll] = useState(false);

    /*
     * Scoped on the supplier record currently selected in the header.
     *
     * The scope is a query clause — `ANCESTOR:` on the supplier's own space,
     * resolved server-side — not a filter applied to a list already fetched, so
     * the repository returns only what is asked for.
     *
     * **It can hide products, and that is why "toutes mes fiches" exists.**
     * Measured on dev with an account acting for 14 records: the records account
     * for 50 of the 58 products the account can read, because 8 are filed outside
     * any supplier space (`bcpg:suppliers` points at them, but filing is what
     * `ANCESTOR:` sees). Without a way back to the unscoped list those 8 would be
     * unreachable from this screen whichever record is selected.
     */
    const products = useApi('entities', {
        params: {
            pageSize: 100,
            withProjects: 1,
            state: state || undefined,
            type: type || undefined,
            supplier: scopeAll ? undefined : (supplier ? supplier.nodeRef : undefined),
        },
    });

    const items = useMemo(() => (products.data && products.data.items) || [], [products.data]);

    // Reseeded during render rather than in an effect — the pattern `useFormState`
    // and `useApi` already use in this codebase, and the one React asks for when
    // state is derived from props/data.
    const foundTypes = useMemo(
        () => Array.from(new Set(items.map((item) => item.type).filter(Boolean))),
        [items],
    );
    const newTypes = foundTypes.filter((entry) => !seenTypes.includes(entry));
    if (newTypes.length > 0) {
        setSeenTypes(seenTypes.concat(newTypes));
    }

    const stats = useMemo(() => {
        const scored = items.filter(
            (item) => item.completion && typeof item.completion.score === 'number',
        );
        return {
            // `pagination.totalItems` is `null` when beCPG could not count the result
            // set (see `formatTotal`), and `|| items.length` would then print the page
            // size as a park size. `formatTotal` prints "100+" instead — the honest
            // reading of "at least one more page exists".
            total: formatTotal(
                (products.data && products.data.pagination) || { totalItems: items.length },
                lang,
            ),
            valid: items.filter((item) => item.state === 'Valid').length,
            pending: items.filter((item) => item.state === 'Simulation' || item.state === 'ToValidate').length,
            completion:
                scored.length > 0
                    ? Math.round(
                          scored.reduce((sum, item) => sum + item.completion.score, 0) / scored.length,
                      )
                    : null,
        };
    }, [items, products.data, lang]);

    const columns = useMemo(
        () => [
            {
                id: 'name',
                accessorKey: 'name',
                header: labels.columns.name,
                meta: { primary: true, label: labels.columns.name },
                cell: ({ row }) => (
                    <span className="flex min-w-0 items-center gap-1.5">
                        <span className="min-w-0 truncate font-medium">{row.original.name || '—'}</span>
                        {/*
                         * Referencing cuts a working branch off the validated
                         * version, so the same product can appear twice. Marking
                         * the branch is what turns two rows that look unrelated
                         * into one product in two states. Measured on dev: 48 of
                         * 58 rows are branches.
                         */}
                        {row.original.branch ? (
                            <span
                                className="pill pill-warn pill-no-dot pill-sm shrink-0"
                                title={
                                    row.original.branch.versionLabel
                                        ? fill(labels.branchFrom, { version: row.original.branch.versionLabel })
                                        : labels.branch
                                }
                            >
                                <Icon name="call_split" size={12} />
                                <span className="hidden sm:inline">{labels.branch}</span>
                            </span>
                        ) : null}
                    </span>
                ),
            },
            {
                id: 'code',
                accessorKey: 'code',
                header: labels.columns.code,
                meta: { secondary: true, label: labels.columns.code, width: '9rem' },
                cell: ({ row }) => (
                    <span className="tabular-nums text-[var(--becpg-dark-grey)]">
                        {row.original.code || '—'}
                    </span>
                ),
            },
            {
                id: 'type',
                accessorFn: (row) => entityTypeLabel(row, lang),
                header: labels.columns.type,
                meta: { label: labels.columns.type, width: '10rem' },
                cell: ({ row }) => entityTypeLabel(row.original, lang),
            },
            {
                id: 'state',
                accessorKey: 'state',
                header: labels.columns.state,
                meta: { badge: true, label: labels.columns.state, width: '9rem' },
                cell: ({ row }) =>
                    row.original.state ? <StatusPill status={row.original.state} size="sm" /> : '—',
            },
            {
                id: 'completion',
                accessorFn: (row) => (row.completion ? row.completion.score : null),
                header: labels.columns.completion,
                meta: { label: labels.columns.completion, width: '11rem' },
                cell: ({ row }) =>
                    row.original.completion && row.original.completion.score !== null ? (
                        <GaugeBar
                            value={row.original.completion.score}
                            size="sm"
                            showValue
                            label={null}
                            ariaLabel={`${row.original.name} — ${labels.columns.completion}`}
                        />
                    ) : (
                        <span className="text-xs text-[var(--becpg-dark-grey)]">—</span>
                    ),
            },
            {
                id: 'project',
                accessorFn: (row) => (row.project ? row.project.name : ''),
                header: labels.columns.project,
                meta: { label: labels.columns.project },
                cell: ({ row }) => (
                    <span className="block max-w-[14rem] truncate text-xs text-[var(--becpg-dark-grey)]">
                        {row.original.project ? row.original.project.name : '—'}
                    </span>
                ),
            },
            {
                id: 'modified',
                accessorFn: (row) => row.modified || '',
                header: labels.columns.modified,
                meta: { label: labels.columns.modified, align: 'right', width: '8rem' },
                cell: ({ row }) => (
                    <span className="tabular-nums text-xs">{formatDate(row.original.modified, lang)}</span>
                ),
            },
        ],
        [labels, lang],
    );

    return (
        <AppShell title={labels.title} fullWidth>
            <p className="mb-4 text-sm text-[var(--becpg-dark-grey)]">{labels.subtitle}</p>

            <StatGrid columns={4} className="mb-4">
                <StatCard
                    label={labels.stats.total}
                    value={stats.total.text}
                    hint={stats.total.exact ? undefined : stats.total.label}
                    icon="inventory_2"
                    tone="info"
                    loading={products.loading}
                    index={0}
                />
                <StatCard
                    label={labels.stats.valid}
                    value={stats.valid}
                    icon="verified"
                    tone="ok"
                    loading={products.loading}
                    index={1}
                />
                <StatCard
                    label={labels.stats.pending}
                    value={stats.pending}
                    icon="pending_actions"
                    tone={stats.pending ? 'warn' : 'neutral'}
                    loading={products.loading}
                    index={2}
                />
                <StatCard
                    label={labels.stats.completion}
                    value={stats.completion === null ? '—' : stats.completion}
                    unit={stats.completion === null ? undefined : '%'}
                    icon="donut_large"
                    tone={
                        stats.completion === null
                            ? 'neutral'
                            : stats.completion >= 80
                              ? 'ok'
                              : stats.completion >= 50
                                ? 'warn'
                                : 'danger'
                    }
                    loading={products.loading}
                    index={3}
                >
                    <GaugeBar value={stats.completion} showValue={false} size="sm" className="mt-2" />
                </StatCard>
            </StatGrid>

            <DataTable
                columns={columns}
                data={items}
                loading={products.loading}
                error={products.error}
                onRetry={products.refresh}
                rowHref={(row) => `/products/${row.uuid}`}
                getRowId={(row, index) => String(row.uuid ?? row.nodeRef ?? index)}
                searchPlaceholder={labels.search}
                initialSorting={[{ id: 'modified', desc: true }]}
                initialColumnVisibility={{ project: false }}
                enableColumnVisibility
                pageSize={25}
                emptyState={
                    <EmptyState
                        variant={state || type ? 'search' : 'empty'}
                        icon="inventory_2"
                        title={labels.empty}
                        message={labels.emptyHint}
                    />
                }
                toolbar={
                    <div className="flex flex-wrap gap-2">
                        <div className="w-40">
                            <Select
                                value={state}
                                onChange={(event) => setState(event.target.value)}
                                aria-label={labels.allStates}
                                options={STATES.map((value) => ({ value, label: value }))}
                                placeholder={labels.allStates}
                            />
                        </div>
                        <div className="w-44">
                            <Select
                                value={type}
                                onChange={(event) => setType(event.target.value)}
                                aria-label={labels.allTypes}
                                options={seenTypes.map((value) => ({
                                    value,
                                    label: entityTypeLabel(value, lang),
                                }))}
                                placeholder={labels.allTypes}
                            />
                        </div>
                        {/*
                         * The scope is shown, not implied. An account acting for
                         * several records is otherwise looking at a filtered list
                         * with nothing on screen saying so — and 8 of this account's
                         * 58 products sit under no record at all, reachable only
                         * from here.
                         */}
                        {canScope ? (
                            <div className="w-64">
                                <Select
                                    value={scopeAll ? '' : 'current'}
                                    onChange={(event) => setScopeAll(event.target.value === '')}
                                    aria-label={labels.scope}
                                    options={[
                                        { value: 'current', label: supplier ? supplier.name : labels.scopeCurrent },
                                        { value: '', label: labels.scopeAll },
                                    ]}
                                />
                            </div>
                        ) : null}
                    </div>
                }
            />
        </AppShell>
    );
}
