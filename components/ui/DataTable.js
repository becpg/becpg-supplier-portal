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

/** Default page sizes offered in the pagination footer. */
export const PAGE_SIZES = [10, 25, 50, 100];

/**
 * The few accessible names the chrome dictionary does not carry (they are table
 * mechanics, not portal vocabulary, and adding them to `config/messages.js`
 * would blow its "keep it under ~60 keys" budget).
 */
const LOCAL_LABELS = {
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
};

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
        return 'text-right';
    }
    if (meta.align === 'center') {
        return 'text-center';
    }
    return '';
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
                className="h-4 w-4 cursor-pointer accent-[var(--becpg-blue)]"
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
    const local = LOCAL_LABELS[lang] || LOCAL_LABELS.fr;
    const router = useRouter();
    const [sorting, setSorting] = useState(initialSorting);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState(initialColumnVisibility);
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
        <div className={className}>
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
                    <div className="ml-auto flex items-center gap-2">
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
                                        <div className="absolute right-0 z-20 mt-1 max-h-72 w-56 overflow-y-auto rounded-lg border border-[var(--becpg-grey)] bg-white p-2 shadow-lg">
                                            {table
                                                .getAllLeafColumns()
                                                .filter((column) => column.getCanHide() && column.id !== '__select')
                                                .map((column) => (
                                                    <label
                                                        key={column.id}
                                                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[var(--becpg-grey)]"
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
                    <div className="table-scroll hidden rounded-xl border border-[var(--becpg-grey)] bg-white md:block">
                        <table className="w-full border-collapse text-sm">
                            {caption ? <caption className="sr-only-text">{caption}</caption> : null}
                            <thead>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <tr key={headerGroup.id} className="border-b border-[var(--becpg-grey)]">
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
                                                    className={`px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-[var(--becpg-dark-grey)] ${alignClass(meta)}`}
                                                >
                                                    {header.isPlaceholder ? null : sortable ? (
                                                        <button
                                                            type="button"
                                                            onClick={header.column.getToggleSortingHandler()}
                                                            className="inline-flex items-center gap-1 hover:text-[var(--becpg-blue)]"
                                                        >
                                                            <span className="text-left">
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
                                                                className={sorted ? 'text-[var(--becpg-orange)]' : 'opacity-40'}
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
                                {rows.map((row) => {
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
                                            className={[
                                                'border-b border-[var(--becpg-grey)] last:border-0',
                                                row.getIsSelected() ? 'bg-[var(--becpg-blue-lighter)]/50' : '',
                                                clickable
                                                    ? 'cursor-pointer hover:bg-[var(--becpg-grey)]/60 focus:outline-none focus-visible:bg-[var(--becpg-blue-lighter)]/60'
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
                                    <Wrapper
                                        href={href || undefined}
                                        type={Wrapper === 'button' ? 'button' : undefined}
                                        onClick={
                                            !href && clickable ? () => onRowClick(row.original, row) : undefined
                                        }
                                        className={[
                                            'block w-full rounded-xl border bg-white p-3 text-left',
                                            row.getIsSelected()
                                                ? 'border-[var(--becpg-blue-light)] bg-[var(--becpg-blue-lighter)]/40'
                                                : 'border-[var(--becpg-grey)]',
                                            clickable ? 'active:bg-[var(--becpg-grey)]/60' : '',
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
                                                    <div className="truncate text-sm font-medium">
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
                                                        className="text-[var(--becpg-dark-grey)]"
                                                    />
                                                ) : null}
                                            </div>
                                        </div>
                                        {bodyColumns.length ? (
                                            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-[var(--becpg-grey)] pt-2 text-xs">
                                                {bodyColumns.map((column) => (
                                                    <div key={column.id} className="contents">
                                                        <dt className="text-[var(--becpg-dark-grey)]">
                                                            {columnLabel(column)}
                                                        </dt>
                                                        <dd className="min-w-0 break-words text-right">
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
                                    className="rounded-md border border-[var(--becpg-grey)] bg-white px-2 py-1 text-xs"
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
