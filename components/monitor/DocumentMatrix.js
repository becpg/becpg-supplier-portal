'use client';

/**
 * **The supplier × document-type matrix** — the deliverable of spec §4.6.3, the
 * view quality teams print before an audit.
 *
 * One row per supplier, one column per document type, and in each cell what the
 * auditor asks: *attendu / fourni / valide jusqu'au / expire / expiré / refusé*.
 * The vocabulary is the portal's single one (`StatusPill` / `ExpiryPill`), so a
 * cell here is the same orange, with the same icon and the same wording, as the
 * supplier's own document screen.
 *
 * ## Reading the cells
 *
 * | Cell               | Meaning                                                   |
 * |--------------------|-----------------------------------------------------------|
 * | a pill             | beCPG materialised this document type for this supplier   |
 * | `·` (empty)        | the type does **not apply** — beCPG only materialises the types that match, so an empty cell is information, not a hole |
 * | a bold outline     | the document is mandatory (`bcpg:documentIsMandatory`)     |
 *
 * When several documents of one type hang on one supplier (one per product) the
 * API already folded them onto **the worst one**: an auditor must see the
 * problem, not an average.
 *
 * ## Why it does not freeze the browser
 *
 * A large park means a large matrix. Rows are paginated server side, and *both
 * axes are virtualised here*: only the cells inside the scroll window (plus a
 * small overscan) are in the DOM, the rest is two spacer cells and two spacer
 * rows. 100 suppliers × 60 types = 6 000 cells becomes ≈ 250 rendered nodes,
 * and scrolling never re-renders more than that.
 *
 * Sticky headers on both axes: the type row stays under the toolbar, the
 * supplier column stays at the left, and the corner cell stays above both.
 *
 * ## Mobile
 *
 * A matrix is not usable at 360 px, so below `md` the same rows and the same
 * selection render as a card list: one card per supplier, with its document
 * types listed and individually selectable. Same data, same selection object.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { ExpiryPill } from '@/components/documents/ExpiryPill';
import { formatDate } from '@/lib/format';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

/** Height of a matrix row, in px — fixed, because virtualisation needs it. */
const ROW_H = 52;
/** Width of a document-type column, in px. */
const COL_W = 148;
/** Width of the frozen supplier column, in px. */
const STICKY_W = 240;
/** Height of the sticky header row, in px. */
const HEADER_H = 44;
/** Rows / columns rendered beyond the visible window. */
const OVERSCAN_ROWS = 6;
const OVERSCAN_COLS = 2;

const LABELS = defineLabels('components/monitor/DocumentMatrix#LABELS', {
    fr: {
        supplier: 'Fournisseur',
        types: '{count} type(s) de document',
        notApplicable: 'Ne s’applique pas à ce fournisseur',
        mandatory: 'Obligatoire',
        expected: '{count} attendu(s)',
        selectRow: 'Sélectionner {name}',
        selectCell: 'Sélectionner {type} pour {name}',
        download: 'Télécharger',
        empty: 'Aucun fournisseur dans ce périmètre',
        emptyHint: 'Élargissez les filtres pour voir la matrice.',
        noColumns: 'Aucun type de document n’est matérialisé sur ce périmètre',
        noColumnsHint:
            'beCPG matérialise les documents attendus lors de la formulation : sans exigence documentaire paramétrée, la matrice est vide.',
        toggle: 'Voir les documents',
        summary: '{missing} manquant(s) · {expired} expiré(s) · {expiring} à renouveler',
    },
    en: {
        supplier: 'Supplier',
        types: '{count} document type(s)',
        notApplicable: 'Does not apply to this supplier',
        mandatory: 'Mandatory',
        expected: '{count} expected',
        selectRow: 'Select {name}',
        selectCell: 'Select {type} for {name}',
        download: 'Download',
        empty: 'No supplier in this perimeter',
        emptyHint: 'Widen the filters to see the matrix.',
        noColumns: 'No document type is materialised on this perimeter',
        noColumnsHint:
            'beCPG materialises expected documents during formulation: with no documentary requirement configured, the matrix is empty.',
        toggle: 'Show documents',
        summary: '{missing} missing · {expired} expired · {expiring} to renew',
    },
});

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]),
    );
}

/** Key of a column: the API sends `nodeRef: null` for the untyped bucket. */
export function columnKey(column) {
    return column.nodeRef || 'untyped';
}

/** Key of a selected cell. */
function cellKey(supplierRef, typeKey) {
    return `${supplierRef}|${typeKey}`;
}

/** An empty selection — the shape the matrix reads and writes. */
export const EMPTY_SELECTION = Object.freeze({ rows: {}, cells: {} });

/**
 * The suppliers a selection targets: the selected rows, plus the supplier of
 * every selected cell. This is what `BulkActionBar` sends to
 * `POST /monitor/actions`, which only ever addresses suppliers (§4.6.7).
 *
 * @param {{rows: Object, cells: Object}} selection
 * @returns {Array<{nodeRef: string, name: string}>}
 */
export function selectionTargets(selection) {
    const targets = new Map();
    Object.values((selection && selection.rows) || {}).forEach((supplier) => {
        if (supplier && supplier.nodeRef) {
            targets.set(supplier.nodeRef, supplier);
        }
    });
    Object.values((selection && selection.cells) || {}).forEach((cell) => {
        if (cell && cell.supplier && cell.supplier.nodeRef && !targets.has(cell.supplier.nodeRef)) {
            targets.set(cell.supplier.nodeRef, cell.supplier);
        }
    });
    return [...targets.values()];
}

/** The document types named by a selection — used to phrase the reminder. */
export function selectionTypes(selection) {
    const types = new Set();
    Object.values((selection && selection.cells) || {}).forEach((cell) => {
        if (cell && cell.typeLabel) {
            types.add(cell.typeLabel);
        }
    });
    return [...types];
}

/** Short text of a cell, next to its pill. */
function cellText(cell, lang) {
    if (cell.status === 'valid' || cell.status === 'expiring') {
        return cell.validTo ? formatDate(cell.validTo, lang) : '';
    }
    if (cell.status === 'expired') {
        return cell.validTo ? formatDate(cell.validTo, lang) : '';
    }
    return '';
}

/**
 * @param {Object} props
 * @param {Array<Object>} props.columns document types, as returned by `GET /monitor/documents`
 * @param {Array<Object>} props.rows matrix rows `{ supplier, cells, summary }`
 * @param {boolean} [props.loading]
 * @param {Error} [props.error]
 * @param {Function} [props.onRetry]
 * @param {string} [props.statusFilter='all'] keeps the rows holding at least one cell in that status
 * @param {{rows: Object, cells: Object}} [props.selection]
 * @param {Function} [props.onSelectionChange] receives the next selection object
 * @param {number} [props.height=560] height of the scroll window, in px
 */
export function DocumentMatrix({
    columns = [],
    rows = [],
    loading = false,
    error = null,
    onRetry,
    statusFilter = 'all',
    selection = EMPTY_SELECTION,
    onSelectionChange,
    height = 560,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);

    const scrollRef = useRef(null);
    // Mirrored in state so the observer below attaches when the scroller
    // mounts: on a first load it does not exist yet, the skeleton stands in
    // its place, and an effect keyed on nothing else would never see it.
    const [scrollNode, setScrollNode] = useState(null);
    const attachScroll = useCallback((node) => {
        scrollRef.current = node;
        setScrollNode(node);
    }, []);
    const frameRef = useRef(0);
    const [view, setView] = useState({ top: 0, left: 0, width: 1200, height });
    const [expanded, setExpanded] = useState({});

    // Measurement happens in a rAF callback (never synchronously inside the
    // effect) and only writes when a number actually moved, so scrolling costs
    // one render per frame at most and mounting costs none.
    const measure = useCallback(() => {
        const node = scrollRef.current;
        if (!node) {
            return;
        }
        setView((previous) =>
            previous.top === node.scrollTop
            && previous.left === node.scrollLeft
            && previous.width === node.clientWidth
            && previous.height === node.clientHeight
                ? previous
                : {
                      top: node.scrollTop,
                      left: node.scrollLeft,
                      width: node.clientWidth,
                      height: node.clientHeight,
                  },
        );
    }, []);

    const schedule = useCallback(() => {
        if (frameRef.current) {
            return;
        }
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = 0;
            measure();
        });
    }, [measure]);

    useEffect(() => {
        schedule();
        if (!scrollNode || typeof ResizeObserver === 'undefined') {
            return undefined;
        }
        const observer = new ResizeObserver(schedule);
        observer.observe(scrollNode);
        return () => {
            observer.disconnect();
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = 0;
            }
        };
    }, [schedule, scrollNode]);

    // --- filtering ---------------------------------------------------------
    const visibleRows = useMemo(() => {
        if (statusFilter === 'all') {
            return rows;
        }
        return rows.filter((row) =>
            Object.values(row.cells || {}).some((cell) => cell.status === statusFilter),
        );
    }, [rows, statusFilter]);

    // --- selection ---------------------------------------------------------
    const emit = useCallback(
        (next) => {
            if (onSelectionChange) {
                onSelectionChange(next);
            }
        },
        [onSelectionChange],
    );

    const toggleRow = useCallback(
        (supplier) => {
            const nextRows = { ...selection.rows };
            if (nextRows[supplier.nodeRef]) {
                delete nextRows[supplier.nodeRef];
            }
            else {
                nextRows[supplier.nodeRef] = { nodeRef: supplier.nodeRef, name: supplier.name };
            }
            emit({ ...selection, rows: nextRows });
        },
        [selection, emit],
    );

    const toggleCell = useCallback(
        (supplier, column, cell) => {
            const key = cellKey(supplier.nodeRef, columnKey(column));
            const nextCells = { ...selection.cells };
            if (nextCells[key]) {
                delete nextCells[key];
            }
            else {
                nextCells[key] = {
                    supplier: { nodeRef: supplier.nodeRef, name: supplier.name },
                    typeKey: columnKey(column),
                    typeLabel: column.label,
                    status: cell ? cell.status : null,
                };
            }
            emit({ ...selection, cells: nextCells });
        },
        [selection, emit],
    );

    const toggleAll = useCallback(() => {
        const allSelected = visibleRows.length > 0
            && visibleRows.every((row) => selection.rows[row.supplier.nodeRef]);
        if (allSelected) {
            emit({ ...selection, rows: {} });
            return;
        }
        const nextRows = { ...selection.rows };
        visibleRows.forEach((row) => {
            nextRows[row.supplier.nodeRef] = {
                nodeRef: row.supplier.nodeRef,
                name: row.supplier.name,
            };
        });
        emit({ ...selection, rows: nextRows });
    }, [visibleRows, selection, emit]);

    // --- virtualisation ----------------------------------------------------
    const rowCount = visibleRows.length;
    const columnCount = columns.length;

    const rowStart = Math.max(
        0,
        Math.floor(Math.max(0, view.top - HEADER_H) / ROW_H) - OVERSCAN_ROWS,
    );
    const rowEnd = Math.min(
        rowCount,
        Math.ceil((view.top + view.height) / ROW_H) + OVERSCAN_ROWS,
    );
    const topSpacer = rowStart * ROW_H;
    const bottomSpacer = Math.max(0, (rowCount - rowEnd) * ROW_H);

    const colStart = Math.max(
        0,
        Math.floor(Math.max(0, view.left - STICKY_W) / COL_W) - OVERSCAN_COLS,
    );
    const colEnd = Math.min(
        columnCount,
        Math.ceil(Math.max(0, view.left + view.width - STICKY_W) / COL_W) + OVERSCAN_COLS,
    );
    const leftSpacer = colStart * COL_W;
    const rightSpacer = Math.max(0, (columnCount - colEnd) * COL_W);

    const windowRows = visibleRows.slice(rowStart, rowEnd);
    const windowColumns = columns.slice(colStart, colEnd);

    if (error) {
        return <ErrorState error={error} onRetry={onRetry} />;
    }
    if (loading) {
        return <SkeletonTable rows={6} columns={5} className={className} />;
    }
    if (rows.length === 0) {
        return <EmptyState title={labels.empty} message={labels.emptyHint} />;
    }
    if (columnCount === 0) {
        return (
            <EmptyState icon="fact_check" title={labels.noColumns} message={labels.noColumnsHint} />
        );
    }
    if (visibleRows.length === 0) {
        return <EmptyState variant="search" />;
    }

    const allSelected = visibleRows.every((row) => selection.rows[row.supplier.nodeRef]);
    const someSelected = !allSelected && visibleRows.some((row) => selection.rows[row.supplier.nodeRef]);

    return (
        <div className={className}>
            {/* ------------------------------------------------ desktop matrix */}
            {/*
                `contain: paint` is load-bearing, not decoration. `overflow-auto`
                clips what is *drawn*, but the fixed-layout table inside it keeps
                contributing its full width to the root's scrollable area, so the
                **page itself** gained a horizontal scrollbar as soon as the matrix
                was wider than its container. Measured on the reference instance at 1280 px:
                `document.documentElement.scrollWidth` 1789 for a 1280 viewport, and
                `window.scrollTo(600, 0)` really moved the page by 509 px — the
                header, the tiles and the bottom bar sliding out of view while the
                matrix stayed put. Not reproducible at 1920 (the table fits) nor at
                360 (the card list is rendered instead), i.e. it only appeared at the
                widths where the matrix is actually used.
                `contain: paint` gives the scroller the containment the clip implies:
                the page stops scrolling (scrollWidth back to 1280) and the matrix
                keeps its own scrollbar (scrollWidth 1572 for a 958 px viewport).
                It must not become `overflow: clip` — the matrix has to stay
                scrollable — and `isolation`/`overflow-x: clip` on the parent were
                measured as no-ops here.
            */}
            <div
                ref={attachScroll}
                onScroll={schedule}
                className="hidden overflow-auto rounded-xl border border-[var(--becpg-grey)] bg-white md:block"
                style={{ maxHeight: height, contain: 'paint' }}
                tabIndex={0}
                aria-label={labels.supplier}
            >
                <table
                    className="text-xs"
                    style={{
                        tableLayout: 'fixed',
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                        width: STICKY_W + columnCount * COL_W,
                    }}
                >
                    <thead>
                        <tr style={{ height: HEADER_H }}>
                            <th
                                scope="col"
                                className="sticky start-0 top-0 z-30 bg-white px-2 text-start align-middle shadow-[inset_-1px_0_0_var(--becpg-grey),inset_0_-1px_0_var(--becpg-grey)]"
                                style={{ width: STICKY_W, minWidth: STICKY_W }}
                            >
                                <span className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 cursor-pointer accent-[var(--becpg-blue)]"
                                        checked={allSelected}
                                        ref={(node) => {
                                            if (node) {
                                                node.indeterminate = someSelected;
                                            }
                                        }}
                                        onChange={toggleAll}
                                        aria-label={labels.supplier}
                                    />
                                    <span className="font-medium uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                                        {labels.supplier}
                                    </span>
                                </span>
                            </th>
                            {leftSpacer > 0 ? (
                                <th aria-hidden="true" style={{ width: leftSpacer }} className="p-0" />
                            ) : null}
                            {windowColumns.map((column) => (
                                <th
                                    key={columnKey(column)}
                                    scope="col"
                                    title={column.label}
                                    className="sticky top-0 z-20 bg-white px-2 text-start align-middle shadow-[inset_0_-1px_0_var(--becpg-grey)]"
                                    style={{ width: COL_W }}
                                >
                                    <span className="block truncate font-medium text-[var(--becpg-blue)]">
                                        {column.label}
                                    </span>
                                    <span className="block truncate text-[10px] font-normal text-[var(--becpg-dark-grey)]">
                                        {column.category
                                            ? column.category
                                            : fill(labels.expected, { count: column.expected })}
                                    </span>
                                </th>
                            ))}
                            {rightSpacer > 0 ? (
                                <th aria-hidden="true" style={{ width: rightSpacer }} className="p-0" />
                            ) : null}
                        </tr>
                    </thead>
                    <tbody>
                        {topSpacer > 0 ? (
                            <tr aria-hidden="true" style={{ height: topSpacer }}>
                                <td className="p-0" />
                            </tr>
                        ) : null}

                        {windowRows.map((row) => {
                            const supplier = row.supplier;
                            const rowSelected = Boolean(selection.rows[supplier.nodeRef]);
                            return (
                                <tr
                                    key={supplier.nodeRef}
                                    style={{ height: ROW_H }}
                                    className={rowSelected ? 'bg-[var(--becpg-blue-lighter)]/40' : ''}
                                >
                                    <th
                                        scope="row"
                                        className={[
                                            'sticky start-0 z-10 px-2 text-start align-middle font-normal',
                                            'shadow-[inset_-1px_0_0_var(--becpg-grey),inset_0_-1px_0_var(--becpg-grey)]',
                                            rowSelected
                                                ? 'bg-[#eef5f7]'
                                                : 'bg-white',
                                        ].join(' ')}
                                        style={{ width: STICKY_W, minWidth: STICKY_W }}
                                    >
                                        <span className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--becpg-blue)]"
                                                checked={rowSelected}
                                                onChange={() => toggleRow(supplier)}
                                                aria-label={fill(labels.selectRow, { name: supplier.name })}
                                            />
                                            <span className="min-w-0 flex-1">
                                                <Link
                                                    href={supplier.href || '#'}
                                                    className="block truncate font-medium text-[var(--becpg-blue)] hover:underline"
                                                    title={supplier.name}
                                                >
                                                    {supplier.name}
                                                </Link>
                                                <span className="block truncate text-[10px] text-[var(--becpg-dark-grey)]">
                                                    {[supplier.code, supplier.buyer].filter(Boolean).join(' · ') || '—'}
                                                </span>
                                            </span>
                                        </span>
                                    </th>

                                    {leftSpacer > 0 ? (
                                        <td aria-hidden="true" className="p-0" />
                                    ) : null}

                                    {windowColumns.map((column) => {
                                        const key = columnKey(column);
                                        const cell = row.cells ? row.cells[key] : null;
                                        const selected = Boolean(
                                            selection.cells[cellKey(supplier.nodeRef, key)],
                                        );
                                        const dimmed = statusFilter !== 'all'
                                            && cell
                                            && cell.status !== statusFilter;
                                        return (
                                            <td
                                                key={key}
                                                className="px-1 align-middle shadow-[inset_0_-1px_0_var(--becpg-grey)]"
                                                style={{ width: COL_W }}
                                            >
                                                {cell ? (
                                                    <span className="flex items-center gap-0.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleCell(supplier, column, cell)}
                                                            aria-pressed={selected}
                                                            aria-label={fill(labels.selectCell, {
                                                                type: column.label,
                                                                name: supplier.name,
                                                            })}
                                                            className={[
                                                                'flex min-w-0 flex-1 items-center gap-1 rounded-md px-1 py-1 text-start transition-colors',
                                                                selected
                                                                    ? 'bg-[var(--becpg-blue-lighter)] ring-2 ring-[var(--becpg-blue-light)]'
                                                                    : 'hover:bg-[var(--becpg-grey)]/60',
                                                                cell.isMandatory ? 'font-medium' : '',
                                                                dimmed ? 'opacity-35' : '',
                                                            ]
                                                                .filter(Boolean)
                                                                .join(' ')}
                                                        >
                                                            <ExpiryPill
                                                                status={cell.status}
                                                                validTo={cell.validTo}
                                                                daysToExpiry={cell.daysToExpiry}
                                                                size="sm"
                                                                iconOnly
                                                            />
                                                            <span className="min-w-0 truncate text-[11px] text-[var(--becpg-dark-grey)]">
                                                                {cellText(cell, lang)}
                                                            </span>
                                                            {cell.isMandatory ? (
                                                                <span
                                                                    title={labels.mandatory}
                                                                    className="ms-auto text-[var(--becpg-orange)]"
                                                                    aria-hidden="true"
                                                                >
                                                                    *
                                                                </span>
                                                            ) : null}
                                                        </button>
                                                        {cell.downloadUrl ? (
                                                            <a
                                                                href={cell.downloadUrl}
                                                                title={`${labels.download} — ${cell.documentName || column.label}`}
                                                                className="rounded p-1 text-[var(--becpg-dark-grey)] hover:bg-[var(--becpg-grey)] hover:text-[var(--becpg-blue)]"
                                                            >
                                                                <Icon name="download" size={14} />
                                                                <span className="sr-only-text">{labels.download}</span>
                                                            </a>
                                                        ) : null}
                                                    </span>
                                                ) : (
                                                    <span
                                                        title={labels.notApplicable}
                                                        className="block px-1 text-center text-[var(--becpg-grey)]"
                                                    >
                                                        ·<span className="sr-only-text">{labels.notApplicable}</span>
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })}

                                    {rightSpacer > 0 ? (
                                        <td aria-hidden="true" className="p-0" />
                                    ) : null}
                                </tr>
                            );
                        })}

                        {bottomSpacer > 0 ? (
                            <tr aria-hidden="true" style={{ height: bottomSpacer }}>
                                <td className="p-0" />
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>

            {/* -------------------------------------------------- mobile cards */}
            <div className="flex flex-col gap-2 md:hidden">
                {visibleRows.map((row) => {
                    const supplier = row.supplier;
                    const rowSelected = Boolean(selection.rows[supplier.nodeRef]);
                    const cells = Object.entries(row.cells || {});
                    const summary = row.summary || { byStatus: {} };
                    const byStatus = summary.byStatus || {};
                    const open = Boolean(expanded[supplier.nodeRef]);
                    return (
                        <div
                            key={supplier.nodeRef}
                            className={[
                                'rounded-xl border bg-white p-3',
                                rowSelected
                                    ? 'border-[var(--becpg-blue-light)] bg-[var(--becpg-blue-lighter)]/40'
                                    : 'border-[var(--becpg-grey)]',
                            ].join(' ')}
                        >
                            <div className="flex items-start gap-2">
                                <input
                                    type="checkbox"
                                    className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[var(--becpg-blue)]"
                                    checked={rowSelected}
                                    onChange={() => toggleRow(supplier)}
                                    aria-label={fill(labels.selectRow, { name: supplier.name })}
                                />
                                <div className="min-w-0 flex-1">
                                    <Link
                                        href={supplier.href || '#'}
                                        className="block truncate text-sm font-medium text-[var(--becpg-blue)]"
                                    >
                                        {supplier.name}
                                    </Link>
                                    <p className="truncate text-xs text-[var(--becpg-dark-grey)]">
                                        {fill(labels.summary, {
                                            missing: byStatus.missing || 0,
                                            expired: byStatus.expired || 0,
                                            expiring: byStatus.expiring || 0,
                                        })}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="touch-target flex items-center gap-1 rounded-lg px-2 text-xs text-[var(--becpg-blue)]"
                                    aria-expanded={open}
                                    onClick={() =>
                                        setExpanded((previous) => ({
                                            ...previous,
                                            [supplier.nodeRef]: !previous[supplier.nodeRef],
                                        }))
                                    }
                                >
                                    {fill(labels.types, { count: cells.length })}
                                    <Icon name={open ? 'expand_less' : 'expand_more'} size={16} />
                                </button>
                            </div>

                            {open ? (
                                <ul className="mt-2 flex flex-col gap-1 border-t border-[var(--becpg-grey)] pt-2">
                                    {cells.map(([key, cell]) => {
                                        const column = columns.find((entry) => columnKey(entry) === key)
                                            || { nodeRef: key === 'untyped' ? null : key, label: key };
                                        const selected = Boolean(
                                            selection.cells[cellKey(supplier.nodeRef, key)],
                                        );
                                        return (
                                            <li key={key} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--becpg-blue)]"
                                                    checked={selected}
                                                    onChange={() => toggleCell(supplier, column, cell)}
                                                    aria-label={fill(labels.selectCell, {
                                                        type: column.label,
                                                        name: supplier.name,
                                                    })}
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-xs font-medium">
                                                        {column.label}
                                                        {cell.isMandatory ? (
                                                            <span className="text-[var(--becpg-orange)]"> *</span>
                                                        ) : null}
                                                    </span>
                                                </span>
                                                <ExpiryPill
                                                    status={cell.status}
                                                    validTo={cell.validTo}
                                                    daysToExpiry={cell.daysToExpiry}
                                                    size="sm"
                                                />
                                                {cell.downloadUrl ? (
                                                    <a
                                                        href={cell.downloadUrl}
                                                        className="touch-target flex items-center text-[var(--becpg-blue)]"
                                                        aria-label={labels.download}
                                                    >
                                                        <Icon name="download" size={18} />
                                                    </a>
                                                ) : null}
                                            </li>
                                        );
                                    })}
                                    {cells.length === 0 ? (
                                        <li className="text-xs text-[var(--becpg-dark-grey)]">
                                            {labels.notApplicable}
                                        </li>
                                    ) : null}
                                </ul>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * The colour legend of the matrix — printed with it, so a paper copy is
 * readable without the screen.
 */
export function MatrixLegend({ statuses = ['valid', 'expiring', 'expired', 'missing', 'refused', 'toValidate'] }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    return (
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--becpg-dark-grey)]">
            {statuses.map((status) => (
                <StatusPill key={status} status={status} size="sm" />
            ))}
            <span className="inline-flex items-center gap-1">
                <span className="text-[var(--becpg-orange)]">*</span>
                {labels.mandatory}
            </span>
            <span className="inline-flex items-center gap-1">
                <span className="text-[var(--becpg-grey)]">·</span>
                {labels.notApplicable}
            </span>
        </div>
    );
}
