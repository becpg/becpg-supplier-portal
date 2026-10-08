'use client';

/**
 * The portal's one table, built on `@tanstack/react-table` (headless — rule 3
 * forbids a UI kit, not a table engine).
 *
 * Sorting, global filtering, pagination, column visibility and row selection all
 * come from a single `useReactTable` instance. **The same instance renders two
 * layouts**: a real `<table>` from `md` up, and a stack of cards below it. That
 * is not a nicety — a 9-column datagrid is unusable on a 360px screen, and the
 * supplier portal is used on phones (spec §4.3). Because both layouts read the
 * same row model, a filter or a sort applied on desktop still holds after a
 * resize, and selection is shared.
 *
 * ## Column contract
 *
 * Standard TanStack `ColumnDef`, plus a `meta` object the card layout reads:
 *
 * ```js
 * {
 *   accessorKey: 'name',
 *   header: 'Nom',
 *   cell: ({ row }) => row.original.name,
 *   meta: {
 *     primary: true,      // card title (defaults to the first column)
 *     secondary: true,    // card subtitle
 *     badge: true,        // rendered top-right of the card (a StatusPill)
 *     hideOnCard: true,   // omitted from the card body
 *     align: 'right',     // cell alignment in the table
 *     width: '12rem',     // column width hint
 *     label: 'Nom',       // label used on the card when `header` is a node
 *   },
 * }
 * ```
 */

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { Button, Icon, IconButton } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Field';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

/** Default page sizes offered in the pagination footer. */
export const PAGE_SIZES = [10, 25, 50, 100];

/**
 * The few accessible names the chrome dictionary does not carry (they are table
 * mechanics, not portal vocabulary, and adding them to `config/messages.js`
 * would blow its "keep it under ~60 keys" budget).
 */
const LOCAL_LABELS = defineLabels('components/ui/DataTable#LOCAL_LABELS', {
    fr: {
        selectAll: 'Tout sélectionner',
        selectRow: 'Sélectionner la ligne',
        columns: 'Colonnes affichées',
        rowsPerPage: 'Lignes par page',
    },
    en: {
        selectAll: 'Select all',
        selectRow: 'Select row',
        columns: 'Visible columns',
        rowsPerPage: 'Rows per page',
    },
});

function columnLabel(column) {
    const meta = column.columnDef.meta || {};
    if (meta.label) {
        return meta.label;
    }
    const header = column.columnDef.header;
    return typeof header === 'string' ? header : column.id;
}

function alignClass(meta) {
    if (!meta) {
        return '';
    }
    if (meta.align === 'right') {
        return 'text-end';
    }
    if (meta.align === 'center') {
        return 'text-center';
    }
    return '';
}

/** Prefix of the per-viewer column choice in `localStorage`. */
const COLUMN_VISIBILITY_PREFIX = 'becpg.portal.columns.';

/**
 * The visible columns, remembered for this viewer when the table is named.
 *
 * A column picked on a park of two hundred suppliers is a reading habit, not a
 * shared decision: it belongs to the browser, like the wizard's "élargir la
 * saisie". Without a `storageKey` the state is plain React state, so a table
 * that has not asked for it behaves exactly as before.
 *
 * Storage may throw or come back empty (private window, cleared site data), so
 * every access is guarded and the table renders from `fallback` — never from a
 * broken read.
 *
 * @param {string|null} key table name, or null for no persistence
 * @param {Object} fallback `{ columnId: false }` the table asked for
 * @returns {[Object, Function]} as `useState`
 */
function useStoredColumnVisibility(key, fallback) {
    const [value, setValue] = useState(() => {
        if (!key || typeof window === 'undefined') {
            return fallback;
        }
        try {
            const stored = window.localStorage.getItem(`${COLUMN_VISIBILITY_PREFIX}${key}`);
            const parsed = stored ? JSON.parse(stored) : null;
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
        }
        catch {
            return fallback;
        }
    });

    const update = useCallback((next) => {
        setValue((current) => {
            const resolved = typeof next === 'function' ? next(current) : next;
            if (key) {
                try {
                    window.localStorage.setItem(
                        `${COLUMN_VISIBILITY_PREFIX}${key}`,
                        JSON.stringify(resolved),
                    );
                }
                catch {
                    // No storage: the choice still applies, it just does not
                    // survive the reload.
                }
            }
            return resolved;
        });
    }, [key]);

    return [value, update];
}

/** Injected column when `enableRowSelection` is on. */
function selectionColumn(selectAllLabel, selectRowLabel) {
    return {
        id: '__select',
        enableSorting: false,
        enableHiding: false,
        size: 40,
        meta: { hideOnCard: true, width: '2.5rem' },
        header: ({ table }) => (
            <input
                type="checkbox"
                aria-label={selectAllLabel}
                /* On the blue header row a `--becpg-blue` checkbox is invisible.
                   `--becpg-green` is 8.41:1 against the bar — the one place in the
                   chrome where the brand mint can be itself at full strength. */
                className="h-4 w-4 cursor-pointer accent-[var(--becpg-green)]"
                checked={table.getIsAllPageRowsSelected()}
                ref={(node) => {
                    if (node) {
                        node.indeterminate = table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected();
                    }
                }}
                onChange={table.getToggleAllPageRowsSelectedHandler()}
            />
        ),
        cell: ({ row }) => (
            <input
                type="checkbox"
                aria-label={selectRowLabel}
                className="h-4 w-4 cursor-pointer accent-[var(--becpg-blue)]"
                checked={row.getIsSelected()}
                disabled={!row.getCanSelect()}
                onChange={row.getToggleSelectedHandler()}
                onClick={(event) => event.stopPropagation()}
            />
        ),
    };
}

/**
 * @param {Object} props
 * @param {Array<Object>} props.columns TanStack column definitions (see the contract above)
 * @param {Array<Object>} props.data rows
 * @param {boolean} [props.loading] renders a skeleton
 * @param {Error} [props.error] renders an ErrorState (with `onRetry` when given)
 * @param {Function} [props.onRetry]
 * @param {Function} [props.getRowId] `(row, index) => string`; defaults to id/nodeRef/index
 * @param {boolean} [props.enableSorting=true]
 * @param {boolean} [props.enableFiltering=true] global search box
 * @param {boolean} [props.enablePagination=true]
 * @param {boolean} [props.enableColumnVisibility=false] column picker (desktop only)
 * @param {boolean} [props.enableRowSelection=false] adds the checkbox column
 * @param {Object} [props.rowSelection] controlled selection `{ [rowId]: true }`
 * @param {Function} [props.onRowSelectionChange] controlled selection setter
 * @param {number} [props.pageSize=25]
 * @param {Array<number>} [props.pageSizeOptions]
 * @param {Array<{id: string, desc: boolean}>} [props.initialSorting]
 * @param {Object} [props.initialColumnVisibility] `{ columnId: false }`
 * @param {string} [props.storageKey] remembers the visible columns for this
 *        viewer, under this key — see {@link useStoredColumnVisibility}
 * @param {Function} [props.onRowClick] `(row.original) => void`
 * @param {Function} [props.rowHref] `(row.original) => string` — makes a row/card a link
 * @param {React.ReactNode} [props.toolbar] extra filters, rendered next to the search box
 * @param {React.ReactNode} [props.actions] buttons, rendered at the right of the toolbar
 * @param {React.ReactNode} [props.emptyState] overrides the default EmptyState
 * @param {string} [props.searchPlaceholder]
 * @param {Function} [props.renderCard] `(row.original, row) => node` — full control of the mobile card
 * @param {boolean} [props.dense] tighter rows
 * @param {string} [props.caption] table caption (screen readers)
 */
export function DataTable({
    columns,
    data,
    loading = false,
    error = null,
    onRetry,
    getRowId,
    enableSorting = true,
    enableFiltering = true,
    enablePagination = true,
    enableColumnVisibility = false,
    enableRowSelection = false,
    rowSelection,
    onRowSelectionChange,
    pageSize = 25,
    pageSizeOptions = PAGE_SIZES,
    initialSorting = [],
    initialColumnVisibility = {},
    storageKey = null,
    onRowClick,
    rowHref,
    toolbar,
    actions,
    emptyState,
    searchPlaceholder,
    renderCard,
    dense = false,
    caption,
    className = '',
}) {
    const { t, lang } = useMessages();
    const local = useMemo(() => pickLabels(LOCAL_LABELS, lang), [lang]);
    const router = useRouter();
    const [sorting, setSorting] = useState(initialSorting);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useStoredColumnVisibility(
        storageKey,
        initialColumnVisibility,
    );
    const [internalSelection, setInternalSelection] = useState({});
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });
    const [columnsOpen, setColumnsOpen] = useState(false);

    const selection = rowSelection === undefined ? internalSelection : rowSelection;
    const setSelection = onRowSelectionChange || setInternalSelection;

    const finalColumns = useMemo(() => {
        if (!enableRowSelection) {
            return columns;
        }
        return [selectionColumn(local.selectAll, local.selectRow), ...columns];
    }, [columns, enableRowSelection, local]);

    const table = useReactTable({
        data: data || [],
        columns: finalColumns,
        state: {
            sorting,
            globalFilter,
            columnVisibility,
            rowSelection: selection,
            ...(enablePagination ? { pagination } : {}),
        },
        getRowId:
            getRowId ||
            ((row, index) => String(row.id ?? row.nodeRef ?? row.uuid ?? index)),
        enableRowSelection,
        enableSorting,
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setSelection,
        onPaginationChange: setPagination,
        globalFilterFn: 'includesString',
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
        getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
        getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
        autoResetPageIndex: true,
    });

    const navigate = useCallback((href) => router.push(href), [router]);

    const rows = table.getRowModel().rows;
    const totalRows = table.getFilteredRowModel().rows.length;

    if (error) {
        return <ErrorState error={error} onRetry={onRetry} />;
    }
    if (loading) {
        return <SkeletonTable rows={5} columns={Math.min(finalColumns.length, 5)} className={className} />;
    }

    const hasToolbar = enableFiltering || toolbar || actions || enableColumnVisibility;

    // --- Card layout helpers ------------------------------------------------
    const visibleColumns = table.getVisibleLeafColumns().filter((column) => column.id !== '__select');
    const primaryColumn =
        visibleColumns.find((column) => (column.columnDef.meta || {}).primary) || visibleColumns[0];
    const secondaryColumn = visibleColumns.find((column) => (column.columnDef.meta || {}).secondary);
    const badgeColumns = visibleColumns.filter((column) => (column.columnDef.meta || {}).badge);
    const bodyColumns = visibleColumns.filter((column) => {
        const meta = column.columnDef.meta || {};
        return (
            !meta.hideOnCard &&
            !meta.badge &&
            column !== primaryColumn &&
            column !== secondaryColumn
        );
    });

    const cellOf = (row, column) => {
        const cell = row.getVisibleCells().find((entry) => entry.column.id === column.id);
        return cell ? flexRender(cell.column.columnDef.cell, cell.getContext()) : null;
    };

    return (
        <div
            className={className}
            /*
             * `--becpg-darkGrey` (#747474) clears AA on pure white by 4% and by
             * nothing else: 4.25:1 on the zebra stripe, 4.10:1 on the orange hover
             * wash. Every muted cell a *caller* renders writes
             * `text-[var(--becpg-dark-grey)]`, and none of them can know they will
             * land on a stripe.
             *
             * So the datagrid re-points that one custom property to
             * `--becpg-dark-grey-deep` for its whole subtree. Inheritance does the
             * rest: not a single column definition changes, and every muted label
             * in every table of the portal moves to 5.30:1 on the stripe and
             * 5.02:1 on the hover wash. Status pills are unaffected — they read
             * `--status-neutral`, which is bound to the camelCase spelling.
             */
            style={{ '--becpg-dark-grey': 'var(--becpg-dark-grey-deep)' }}
        >
            {hasToolbar ? (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    {enableFiltering ? (
                        <div className="min-w-[10rem] flex-1 sm:max-w-xs">
                            <SearchInput
                                value={globalFilter}
                                onChange={setGlobalFilter}
                                placeholder={searchPlaceholder}
                            />
                        </div>
                    ) : null}
                    {toolbar}
                    <div className="ms-auto flex items-center gap-2">
                        {actions}
                        {enableColumnVisibility ? (
                            <div className="relative hidden md:block">
                                <IconButton
                                    icon="view_column"
                                    label={local.columns}
                                    variant="outline"
                                    onClick={() => setColumnsOpen((value) => !value)}
                                    aria-expanded={columnsOpen}
                                />
                                {columnsOpen ? (
                                    <>
                                        <button
                                            type="button"
                                            className="fixed inset-0 z-10 cursor-default"
                                            aria-hidden="true"
                                            tabIndex={-1}
                                            onClick={() => setColumnsOpen(false)}
                                        />
                                        <div className="absolute end-0 z-20 mt-1 max-h-72 w-56 overflow-y-auto rounded-lg border border-[var(--becpg-blue-lighter)] bg-white p-2 shadow-[var(--becpg-shadow-overlay)]">
                                            {table
                                                .getAllLeafColumns()
                                                .filter((column) => column.getCanHide() && column.id !== '__select')
                                                .map((column) => (
                                                    <label
                                                        key={column.id}
                                                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-[var(--becpg-blue)] hover:bg-[var(--becpg-grey)]"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 accent-[var(--becpg-blue)]"
                                                            checked={column.getIsVisible()}
                                                            onChange={column.getToggleVisibilityHandler()}
                                                        />
                                                        <span className="truncate">{columnLabel(column)}</span>
                                                    </label>
                                                ))}
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {rows.length === 0 ? (
                emptyState || (
                    <EmptyState variant={globalFilter ? 'search' : 'empty'} />
                )
            ) : (
                <>
                    {/* ---------------------------------------- desktop table */}
                    {/*
                      * The datagrid surface: white, outlined in
                      * `--becpg-blue-lighter`, blue-tinted elevation. `overflow`
                      * comes from `.table-scroll` (`overflow-x: auto`, which makes
                      * the box a scroll container on both axes) and that is also
                      * what clips the blue header row to the rounded corners.
                      */}
                    <div className="table-scroll hidden rounded-xl border border-[var(--becpg-blue-lighter)] bg-white shadow-[var(--becpg-shadow-raised)] md:block">
                        <table className="w-full border-collapse text-sm">
                            {caption ? <caption className="sr-only-text">{caption}</caption> : null}
                            {/*
                              * The header is the toolbar again: `--becpg-blue` with
                              * white content (11.0:1), closed by the same 2px
                              * `--becpg-top-bar-border-color` rule as
                              * `.becpg-toolbar-edge`. Sort affordances hover to
                              * `--becpg-orange-light` (4.74:1 on the bar) — brand
                              * `--becpg-orange` is only 3.73:1 and cannot carry an
                              * 11px label.
                              */}
                            <thead className="bg-[var(--becpg-blue)] text-white">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <tr
                                        key={headerGroup.id}
                                        className="border-b-2 border-[var(--becpg-top-bar-border-color)]"
                                    >
                                        {headerGroup.headers.map((header) => {
                                            const meta = header.column.columnDef.meta || {};
                                            const sortable = enableSorting && header.column.getCanSort();
                                            const sorted = header.column.getIsSorted();
                                            return (
                                                <th
                                                    key={header.id}
                                                    scope="col"
                                                    style={meta.width ? { width: meta.width } : undefined}
                                                    aria-sort={
                                                        sorted === 'asc'
                                                            ? 'ascending'
                                                            : sorted === 'desc'
                                                              ? 'descending'
                                                              : undefined
                                                    }
                                                    className={`px-3 py-2.5 text-start text-xs font-medium uppercase tracking-wide ${alignClass(meta)}`}
                                                >
                                                    {header.isPlaceholder ? null : sortable ? (
                                                        <button
                                                            type="button"
                                                            onClick={header.column.getToggleSortingHandler()}
                                                            className="inline-flex items-center gap-1 rounded transition-colors hover:text-[var(--becpg-orange-light)]"
                                                        >
                                                            <span className="text-start">
                                                                {flexRender(
                                                                    header.column.columnDef.header,
                                                                    header.getContext(),
                                                                )}
                                                            </span>
                                                            <Icon
                                                                name={
                                                                    sorted === 'asc'
                                                                        ? 'arrow_upward'
                                                                        : sorted === 'desc'
                                                                          ? 'arrow_downward'
                                                                          : 'unfold_more'
                                                                }
                                                                size={14}
                                                                className={
                                                                    sorted
                                                                        ? 'text-[var(--becpg-orange-light)]'
                                                                        : 'opacity-60'
                                                                }
                                                            />
                                                        </button>
                                                    ) : (
                                                        flexRender(header.column.columnDef.header, header.getContext())
                                                    )}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {rows.map((row, index) => {
                                    const href = rowHref ? rowHref(row.original) : null;
                                    const clickable = Boolean(href || onRowClick);
                                    return (
                                        <tr
                                            key={row.id}
                                            onClick={
                                                clickable
                                                    ? () => {
                                                          if (href) {
                                                              navigate(href);
                                                              return;
                                                          }
                                                          onRowClick(row.original, row);
                                                      }
                                                    : undefined
                                            }
                                            tabIndex={clickable ? 0 : undefined}
                                            onKeyDown={
                                                clickable
                                                    ? (event) => {
                                                          if (event.key === 'Enter') {
                                                              if (href) {
                                                                  navigate(href);
                                                              }
                                                              else {
                                                                  onRowClick(row.original, row);
                                                              }
                                                          }
                                                      }
                                                    : undefined
                                            }
                                            /*
                                             * Zebra + orange hover, both as tokens
                                             * (`--becpg-row-*`) so a tenant theme can
                                             * retune them: the stripe is
                                             * `--becpg-grey` at 55%, the hover wash
                                             * `--becpg-orange` at 10%, the selection
                                             * `--becpg-blue-lighter` at 70%.
                                             *
                                             * The hover is a *wash* plus a 3px
                                             * `--becpg-orange` rail, not a solid
                                             * orange fill: #ff642d under text is
                                             * 2.95:1 for white and 3.73:1 for blue,
                                             * so a solid orange row would make every
                                             * cell unreadable exactly while the
                                             * pointer is on it. The wash keeps blue
                                             * at 9.67:1 and muted text at 5.02:1, and
                                             * the rail is where the brand orange is
                                             * allowed to be full strength.
                                             *
                                             * The stripe is picked in JS from the row
                                             * index rather than with `even:`, so the
                                             * three surfaces are *mutually exclusive
                                             * class strings* instead of three
                                             * same-specificity `bg-*` utilities whose
                                             * winner would depend on Tailwind's
                                             * emission order. `hover:` (0,2,0) then
                                             * beats whichever one is on the row
                                             * (0,1,0) by specificity alone.
                                             */
                                            className={[
                                                'border-b border-[var(--becpg-blue-lighter)] last:border-0 transition-colors',
                                                row.getIsSelected()
                                                    ? 'bg-[var(--becpg-row-selected)]'
                                                    : index % 2 === 1
                                                      ? 'bg-[var(--becpg-row-zebra)]'
                                                      : '',
                                                clickable
                                                    ? 'cursor-pointer hover:bg-[var(--becpg-row-hover)] focus:outline-none focus-visible:bg-[var(--becpg-row-selected)]'
                                                    : '',
                                                /*
                                                 * The rail is an inset shadow on the
                                                 * first cell, not on the row: a
                                                 * `box-shadow` on a `<tr>` is not
                                                 * painted reliably under
                                                 * `border-collapse: collapse`, and a
                                                 * left border would shift the cell's
                                                 * content by 3px on hover.
                                                 *
                                                 * It is `--becpg-orange-deep` and not
                                                 * the brand `--becpg-orange` for the
                                                 * one reason that justifies a shade
                                                 * change: this rail lands *on the
                                                 * orange wash*, where #ff642d measures
                                                 * 2.66:1 and simply dissolves into the
                                                 * row it is supposed to mark. The deep
                                                 * shade is 4.24:1 against the same
                                                 * wash.
                                                 */
                                                clickable
                                                    ? 'hover:[&>td:first-child]:shadow-[inset_3px_0_0_var(--becpg-orange-deep)] focus-visible:[&>td:first-child]:shadow-[inset_3px_0_0_var(--becpg-orange-deep)]'
                                                    : '',
                                            ]
                                                .filter(Boolean)
                                                .join(' ')}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <td
                                                    key={cell.id}
                                                    className={`px-3 ${dense ? 'py-1.5' : 'py-2.5'} align-middle ${alignClass(cell.column.columnDef.meta)}`}
                                                >
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ------------------------------------------ mobile cards */}
                    <div className="flex flex-col gap-2 md:hidden">
                        {rows.map((row, index) => {
                            if (renderCard) {
                                return <div key={row.id}>{renderCard(row.original, row)}</div>;
                            }
                            const href = rowHref ? rowHref(row.original) : null;
                            const clickable = Boolean(href || onRowClick);
                            const Wrapper = href ? Link : clickable ? 'button' : 'div';
                            return (
                                <motion.div
                                    key={row.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.03 }}
                                >
                                    {/*
                                      * The card is what a supplier actually sees, so
                                      * it gets the full card treatment rather than a
                                      * bare bordered div: white surface,
                                      * `--becpg-blue-lighter` outline, the same
                                      * blue-tinted `--becpg-shadow-raised` as a Card,
                                      * and — when it is tappable — the 3px
                                      * `--becpg-orange` rail that is the desktop row's
                                      * hover signal made permanent, because there is
                                      * no hover on a phone and nothing else would say
                                      * "this opens something".
                                      */}
                                    <Wrapper
                                        href={href || undefined}
                                        type={Wrapper === 'button' ? 'button' : undefined}
                                        onClick={
                                            !href && clickable ? () => onRowClick(row.original, row) : undefined
                                        }
                                        className={[
                                            'block w-full rounded-xl border bg-white p-3 text-start',
                                            'shadow-[var(--becpg-shadow-raised)] transition-colors',
                                            row.getIsSelected()
                                                ? 'border-[var(--becpg-blue-light)] bg-[var(--becpg-row-selected)]'
                                                : 'border-[var(--becpg-blue-lighter)]',
                                            clickable
                                                ? 'border-s-[3px] border-s-[var(--becpg-orange)] active:bg-[var(--becpg-row-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] focus-visible:ring-offset-2'
                                                : '',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                    >
                                        <div className="flex items-start gap-2">
                                            {enableRowSelection ? (
                                                <input
                                                    type="checkbox"
                                                    aria-label={local.selectRow}
                                                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--becpg-blue)]"
                                                    checked={row.getIsSelected()}
                                                    onChange={row.getToggleSelectedHandler()}
                                                    onClick={(event) => event.stopPropagation()}
                                                />
                                            ) : null}
                                            <div className="min-w-0 flex-1">
                                                {primaryColumn ? (
                                                    <div className="truncate text-sm font-medium text-[var(--becpg-blue)]">
                                                        {cellOf(row, primaryColumn)}
                                                    </div>
                                                ) : null}
                                                {secondaryColumn ? (
                                                    <div className="mt-0.5 truncate text-xs text-[var(--becpg-dark-grey)]">
                                                        {cellOf(row, secondaryColumn)}
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-1">
                                                {badgeColumns.map((column) => (
                                                    <div key={column.id}>{cellOf(row, column)}</div>
                                                ))}
                                                {clickable ? (
                                                    <Icon
                                                        name="chevron_right"
                                                        size={18}
                                                        className="text-[var(--becpg-orange-deep)]"
                                                    />
                                                ) : null}
                                            </div>
                                        </div>
                                        {bodyColumns.length ? (
                                            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-[var(--becpg-blue-lighter)] pt-2 text-xs">
                                                {bodyColumns.map((column) => (
                                                    <div key={column.id} className="contents">
                                                        <dt className="text-[11px] uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                                                            {columnLabel(column)}
                                                        </dt>
                                                        <dd className="min-w-0 break-words text-end text-[var(--becpg-blue)]">
                                                            {cellOf(row, column)}
                                                        </dd>
                                                    </div>
                                                ))}
                                            </dl>
                                        ) : null}
                                    </Wrapper>
                                </motion.div>
                            );
                        })}
                    </div>

                    {enablePagination && totalRows > table.getState().pagination.pageSize ? (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--becpg-dark-grey)]">
                            <span>
                                {t('state.of', {
                                    from:
                                        table.getState().pagination.pageIndex *
                                            table.getState().pagination.pageSize +
                                        1,
                                    to: Math.min(
                                        (table.getState().pagination.pageIndex + 1) *
                                            table.getState().pagination.pageSize,
                                        totalRows,
                                    ),
                                    total: totalRows,
                                })}
                            </span>
                            <div className="flex items-center gap-2">
                                <select
                                    aria-label={local.rowsPerPage}
                                    className="rounded-md border border-[var(--becpg-blue-lighter)] bg-white px-2 py-1 text-xs text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                                    value={table.getState().pagination.pageSize}
                                    onChange={(event) => table.setPageSize(Number(event.target.value))}
                                >
                                    {pageSizeOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon="chevron_left"
                                    label={t('action.previous')}
                                    disabled={!table.getCanPreviousPage()}
                                    onClick={() => table.previousPage()}
                                />
                                <span className="tabular-nums">
                                    {t('state.page', {
                                        page: table.getState().pagination.pageIndex + 1,
                                        pages: table.getPageCount(),
                                    })}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon="chevron_right"
                                    label={t('action.next')}
                                    disabled={!table.getCanNextPage()}
                                    onClick={() => table.nextPage()}
                                />
                            </div>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
}
