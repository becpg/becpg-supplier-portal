'use client';

/**
 * The datalist editor — an editable grid whose entire shape comes from the
 * server.
 *
 * ## The one rule
 *
 * **Nothing about any list is written here.** No column name, no column order,
 * no per-list special case, no "if this is the nutrient list then…". Share
 * resolves *which* columns and *how* (cascade `formId + entityType + siteId +
 * list`, contracts §1); the repository describes those columns; the adapter
 * normalises them; this component renders whatever it is handed. Give it a
 * supplier-specific `formId` — Aryzta's `datagrid-supplier-nut`, Bridor's
 * `supplier` — and the grid changes without a line of code changing here.
 *
 * ## Two layouts, one state
 *
 * A real `<table>` from `md` up, `DataListCardRow` below it. Both read the same
 * `useDataList` instance and the same `DataListCell`, so a value typed on a
 * phone and a value typed on a laptop travel exactly the same path. The card
 * layout is not a fallback: the supplier portal is used on phones (spec §4.4),
 * and a nine-column grid at 360px is not usable at any font size.
 *
 * ## Frozen lists
 *
 * When the customer validates a list it becomes frozen (`state === "Valid"`,
 * contracts §4) and read-only — for the UI *and* for the API (spec §6, point 4).
 * That state is computed once, server-side, and carried by the step payload; it
 * is never re-derived here (bug #25928). Visually it is not a set of disabled
 * inputs: `ReadOnlyNotice` states that the customer validated the list, that it
 * is now frozen, and how to get it reopened. Rows render as plain text, the
 * add / delete / reorder affordances are gone, and only search and pagination
 * remain.
 *
 * @example
 * <DataListEditor
 *     entityId={entity.nodeRef}
 *     stepId={step.id}
 *     params={{ wizardId, siteId }}
 *     initialData={stepPayload}
 * />
 */

import { useCallback, useMemo, useState } from 'react';
import { Button, Icon } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useToast } from '@/components/providers/ToastProvider';
import { useMessages } from '@/lib/messages';
import { DataListRow } from '@/components/datalist/DataListRow';
import { DataListCardRow } from '@/components/datalist/DataListCardRow';
import { DataListToolbar, ReadOnlyNotice } from '@/components/datalist/DataListToolbar';
import { isNestedColumn, useDataList, useDataListLabels } from '@/components/datalist/useDataList';

/**
 * @param {Object} props
 * @param {string} [props.entityId] entity nodeRef / uuid — with `stepId`, builds the endpoint
 * @param {string} [props.stepId] wizard step id
 * @param {string} [props.endpoint] overrides the endpoint (`wizard/x/step/y` by default)
 * @param {Object} [props.params] extra query parameters (`wizardId`, `siteId`, `locale`)
 * @param {Object} [props.initialData] server-rendered step payload, to skip the loading flash
 * @param {Object} [props.list] an existing `useDataList` instance (a step that owns its state)
 * @param {React.ReactNode} [props.title] defaults to the list title returned by beCPG
 * @param {React.ReactNode} [props.description] the step instructions, already translated
 * @param {boolean} [props.readOnly=false] forces read-only on top of the server verdict
 * @param {number} [props.pageSize=25]
 * @param {{column: string, asc: boolean}} [props.initialSort]
 * @param {boolean} [props.dense=false] tighter table rows
 * @param {React.ReactNode} [props.actions] extra toolbar buttons
 * @param {Function} [props.onSaved] `(result, row) => void` — feeds the wizard's "saved at HH:MM"
 * @param {string} [props.className]
 */
export function DataListEditor({
    entityId,
    stepId,
    endpoint,
    params,
    initialData = null,
    list: externalList,
    title,
    description,
    readOnly = false,
    pageSize = 25,
    initialSort = null,
    dense = false,
    actions,
    onSaved,
    className = '',
}) {
    const { t } = useMessages();
    const label = useDataListLabels();
    const toast = useToast();
    const [pendingDelete, setPendingDelete] = useState(null);
    const [focusKey, setFocusKey] = useState(null);

    // A step that needs the grid state for its own purposes (autosave banner,
    // completion gauge) creates the instance and passes it in; otherwise the
    // editor owns it. Hooks stay unconditional either way.
    const ownList = useDataList({
        entityId,
        stepId,
        endpoint,
        params,
        initialData,
        pageSize,
        initialSort,
        readOnly,
        onSaved,
        onError: (error) => toast.error(error),
    });
    const list = externalList || ownList;

    const [flatColumns, nestedColumns] = useMemo(() => {
        const flat = [];
        const nested = [];
        for (const column of list.columns || []) {
            (isNestedColumn(column) ? nested : flat).push(column);
        }
        return [flat, nested];
    }, [list.columns]);

    const handleAdd = useCallback(() => {
        const draft = list.addRow();
        setFocusKey(draft.key);
    }, [list]);

    const handleDelete = useCallback(async () => {
        const row = pendingDelete;
        setPendingDelete(null);
        if (row) {
            await list.deleteRow(row);
        }
    }, [pendingDelete, list]);

    const showOrder = list.canReorder;
    const rows = list.rows;
    /*
     * The rows beCPG computed rather than the ones the supplier owns — today,
     * the ingList total. They are handed out apart by `useDataList` and are
     * never in `rows`, so nothing that counts, numbers, filters or paginates
     * the list can accidentally count them.
     */
    const summaryRows = list.summaryRows || [];
    const from = (list.page - 1) * list.pageSize + 1;
    const to = Math.min(list.page * list.pageSize, list.total);

    // One object, not one per row: `DataListCell` passes it straight to the
    // control registry, and a new identity on every row would defeat any
    // memoisation a control might grow.
    const rowContext = {
        entityNodeRef: entityId,
        itemType: list.itemType,
        formId: list.step?.formId || null,
    };

    if (list.error && rows.length === 0) {
        return <ErrorState error={list.error} onRetry={() => list.refresh()} />;
    }

    if (list.loading && rows.length === 0) {
        return (
            <SkeletonTable
                rows={5}
                columns={Math.min(Math.max(flatColumns.length, 3), 6)}
                className={className}
            />
        );
    }

    return (
        <div className={className}>
            <DataListToolbar
                list={list}
                title={title}
                description={description}
                onAdd={handleAdd}
                actions={actions}
            />

            {list.readOnly ? <ReadOnlyNotice reason={list.readOnlyReason} /> : null}

            {rows.length === 0 ? (
                <EmptyState
                    variant={list.filter ? 'search' : 'empty'}
                    title={list.filter ? undefined : label('empty')}
                    message={
                        list.filter
                            ? undefined
                            : list.canCreate
                              ? label('emptyHint')
                              : label('emptyReadOnly')
                    }
                    action={
                        !list.filter && list.canCreate ? (
                            <Button variant="primary" icon="add" onClick={handleAdd}>
                                {label('addRow')}
                            </Button>
                        ) : null
                    }
                />
            ) : (
                <>
                    {/* ------------------------------------------ desktop table */}
                    <div className="table-scroll hidden rounded-xl border border-[var(--becpg-grey)] bg-white md:block">
                        <table className="becpg-grid">
                            <caption className="sr-only-text">{title || list.title}</caption>
                            <thead>
                                <tr>
                                    {showOrder ? (
                                        <th scope="col" className="w-10">
                                            <span className="sr-only-text">{label('order')}</span>
                                        </th>
                                    ) : null}
                                    {nestedColumns.length > 0 ? (
                                        <th scope="col" className="w-10">
                                            <span className="sr-only-text">{label('detail')}</span>
                                        </th>
                                    ) : null}
                                    {flatColumns.map((column) => {
                                        const sorted = list.sort?.column === column.name
                                            ? (list.sort.asc ? 'ascending' : 'descending')
                                            : undefined;
                                        return (
                                            <th key={column.formsName} scope="col" aria-sort={sorted}>
                                                <button
                                                    type="button"
                                                    onClick={() => list.toggleSort(column)}
                                                    title={label('sortBy', { column: column.label })}
                                                    className="becpg-grid-sort"
                                                >
                                                    <span>{column.label}</span>
                                                    {column.mandatory ? (
                                                        <span
                                                            aria-label={label('mandatory')}
                                                            title={label('mandatory')}
                                                            className="text-[var(--becpg-orange-deep)]"
                                                        >
                                                            *
                                                        </span>
                                                    ) : null}
                                                    {column.protectedField ? (
                                                        <Icon name="lock" size={12} className="opacity-60" />
                                                    ) : null}
                                                    {/*
                                                      * Drawn in CSS, not typed as a Material ligature:
                                                      * this indicator sits on every column of every
                                                      * grid, and a ligature renders as its own name
                                                      * (`unfold_more`) until the icon webfont has
                                                      * loaded. `aria-sort` on the `<th>` is what a
                                                      * screen reader reads; the triangle is for eyes.
                                                      */}
                                                    <span
                                                        aria-hidden="true"
                                                        className="becpg-grid-sort-arrow"
                                                        data-dir={
                                                            sorted === 'ascending'
                                                                ? 'asc'
                                                                : sorted === 'descending'
                                                                  ? 'desc'
                                                                  : 'none'
                                                        }
                                                    />
                                                </button>
                                            </th>
                                        );
                                    })}
                                    <th scope="col" className="w-24 text-right">
                                        <span className="sr-only-text">{label('actions')}</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, index) => (
                                    <DataListRow
                                        key={row.key}
                                        row={row}
                                        index={from + index}
                                        columns={flatColumns}
                                        nestedColumns={nestedColumns}
                                        list={list}
                                        context={rowContext}
                                        onDelete={setPendingDelete}
                                        showOrder={showOrder}
                                        dense={dense}
                                        zebra={index % 2 === 1}
                                        autoFocus={row.key === focusKey}
                                    />
                                ))}
                            </tbody>
                            {/*
                              * The total row lives in `<tfoot>`.
                              *
                              * Share pins it with a special case inside its sort
                              * comparator (`entity-columnRenderer.js:852`, which
                              * returns it last in both directions). A `<tfoot>` is
                              * the same guarantee expressed once, in the document
                              * rather than in a comparator: it renders after the
                              * body whatever `<tbody>` holds and in whatever order,
                              * so no sort, filter, reorder or future client-side
                              * ordering can float it into the middle of the data.
                              */}
                            {summaryRows.length > 0 ? (
                                <tfoot>
                                    {summaryRows.map((row) => (
                                        <DataListRow
                                            key={row.key}
                                            row={row}
                                            index={0}
                                            columns={flatColumns}
                                            nestedColumns={nestedColumns}
                                            list={list}
                                            context={rowContext}
                                            showOrder={showOrder}
                                        />
                                    ))}
                                </tfoot>
                            ) : null}
                        </table>
                    </div>

                    {/* -------------------------------------------- mobile cards */}
                    <div className="flex flex-col gap-2 md:hidden">
                        {rows.map((row, index) => (
                            <DataListCardRow
                                key={row.key}
                                row={row}
                                index={from + index}
                                columns={flatColumns}
                                nestedColumns={nestedColumns}
                                list={list}
                                context={rowContext}
                                onDelete={setPendingDelete}
                                showOrder={showOrder}
                                autoFocus={row.key === focusKey}
                            />
                        ))}
                        {/* Last here too, and for the same reason — the card layout
                            reads the same list, in the same order. */}
                        {summaryRows.map((row) => (
                            <DataListCardRow
                                key={row.key}
                                row={row}
                                index={0}
                                columns={flatColumns}
                                nestedColumns={nestedColumns}
                                list={list}
                                context={rowContext}
                            />
                        ))}
                    </div>

                    {/* A phone user should not have to scroll back up to add a row. */}
                    {list.canCreate ? (
                        <Button
                            variant="outline"
                            icon="add"
                            fullWidth
                            className="mt-2 md:hidden"
                            onClick={handleAdd}
                        >
                            {label('addRow')}
                        </Button>
                    ) : null}

                    {list.total > list.pageSize ? (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--becpg-dark-grey)]">
                            <span>{t('state.of', { from, to, total: list.total })}</span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon="chevron_left"
                                    label={t('action.previous')}
                                    disabled={list.page <= 1 || list.loading}
                                    onClick={() => list.setPage(list.page - 1)}
                                />
                                <span className="tabular-nums">
                                    {t('state.page', { page: list.page, pages: list.pageCount })}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon="chevron_right"
                                    label={t('action.next')}
                                    disabled={list.page >= list.pageCount || list.loading}
                                    onClick={() => list.setPage(list.page + 1)}
                                />
                            </div>
                        </div>
                    ) : null}
                </>
            )}

            <ConfirmModal
                open={Boolean(pendingDelete)}
                onClose={() => setPendingDelete(null)}
                onConfirm={handleDelete}
                tone="danger"
                title={label('deleteTitle')}
                message={label('deleteText')}
                confirmLabel={t('action.delete')}
            />

            {/*
              * Protected fields (spec §6, point 6): the column feeds the customer's
              * compliance checks, so changing it is a decision, not a keystroke. The
              * cell stays locked until this dialog is confirmed, and the unlock
              * applies to that cell only.
              */}
            <ConfirmModal
                open={Boolean(list.pendingUnlock)}
                onClose={list.cancelUnlock}
                onConfirm={list.confirmUnlock}
                title={label('protectedTitle')}
                message={label('protectedText', { column: list.pendingUnlock?.column?.label || '' })}
                confirmLabel={label('protectedUnlock')}
            />
        </div>
    );
}
