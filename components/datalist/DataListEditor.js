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
 * ## Typing, not clicking
 *
 * Filling a forty-row nutrient list is the longest thing a supplier does in this
 * portal, and every mouse trip is a second lost. Four affordances answer that,
 * and all four are keyboard-first:
 *
 * | gesture | what happens |
 * |---|---|
 * | `↵` | saves the line and drops to the **same column** of the next one |
 * | `↵` / `↓` on the last line | adds a line and lands the caret in that column |
 * | `Ctrl+↵` | adds a line from anywhere in the grid |
 * | `Ctrl+D` | duplicates the line — consecutive rows differ by a cell or two |
 * | `Ctrl+V` | pastes a **block** from a spreadsheet |
 *
 * The one that pays for itself is the paste. Suppliers do not compose their
 * data here, they already have it in Excel; `components/datalist/paste.js` maps
 * the clipboard onto the columns and **reports every value it could not take**
 * — nothing is ever dropped without saying so, because a nutrient value that
 * quietly failed to land is worse than a paste that refused.
 *
 * Association columns are the one thing the browser cannot decide alone: the
 * label has to become a nodeRef, so each distinct one is looked up through the
 * field's own datasource (`POST /api/v1/autocomplete/{formId}/{fieldId}`) and
 * accepted **only on an exact, single match**. Anything ambiguous is reported,
 * never guessed.
 *
 * ## Frozen lists
 *
 * When the customer validates a list it becomes frozen (`state === "Valid"`,
 * contracts §4) and read-only — for the UI *and* for the API (spec §6, point 4).
 * That state is computed once, server-side, and carried by the step payload; it
 * is never re-derived here (bug #25928). Visually it is not a set of disabled
 * inputs: `ReadOnlyNotice` states that the customer validated the list, that it
 * is now frozen, and how to get it reopened. Rows render as plain text, the
 * add / duplicate / paste / delete / reorder affordances are **absent** — not
 * greyed — and only search and pagination remain.
 *
 * @example
 * <DataListEditor
 *     entityId={entity.nodeRef}
 *     stepId={step.id}
 *     params={{ wizardId, siteId }}
 *     initialData={stepPayload}
 * />
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Icon, IconButton } from '@/components/ui/Button';
import { ConfirmModal, Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useToast } from '@/components/providers/ToastProvider';
import { api } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { DataListRow, FOCUSABLE, SELECT_WIDTH, stickyOffsets } from '@/components/datalist/DataListRow';
import { DataListCardRow } from '@/components/datalist/DataListCardRow';
import { RowFormModal } from '@/components/datalist/RowFormModal';
import { BulkEditModal } from '@/components/datalist/BulkEditModal';
import { DataListToolbar, ReadOnlyNotice } from '@/components/datalist/DataListToolbar';
import { isNestedColumn, useDataList, useDataListLabels } from '@/components/datalist/useDataList';
import { normalizeLabel, parseClipboardTable, planPaste } from '@/components/datalist/paste';
import { PAGE_SIZES } from '@/components/datalist/pageSizes';
import { needsAnswer } from '@/components/form/validation';

/** Suggestions asked for when resolving one pasted label. */
const RESOLVE_PAGE_SIZE = 25;


/**
 * Turns the pasted labels of an association column into nodeRefs.
 *
 * **Exact match, or nothing.** The datasource is queried with the label as its
 * search term and the answer is accepted only when exactly one result carries
 * that label (accents and case aside — `normalizeLabel`). A prefix match, a
 * "closest" match or "the first result" would put the wrong ingredient under a
 * supplier's name, which is precisely the failure this whole module refuses.
 *
 * @param {Array<{column: Object, text: string, line: number}>} pending
 * @param {Object} context `{ formId, itemType, listId, entityNodeRef }`
 * @param {Map<string, string|null>} cache shared across the whole paste
 * @returns {Promise<Map<string, string|null>>} keyed `columnId\u0000label`
 */
async function resolveAssociations(pending, context, cache) {
    for (const entry of pending) {
        const key = `${entry.column.id}\u0000${normalizeLabel(entry.text)}`;
        if (cache.has(key)) {
            continue;
        }
        try {
            // One datasource at a time on purpose: a paste of forty lines must
            // not open forty parallel sockets against the repository.
            const payload = await api.post(
                `autocomplete/${encodeURIComponent(context.formId || 'default')}/${encodeURIComponent(entry.column.id)}`,
                {
                    itemType: context.itemType || null,
                    listId: context.listId || null,
                    entityNodeRef: context.entityNodeRef || null,
                    q: entry.text,
                    page: 1,
                    pageSize: RESOLVE_PAGE_SIZE,
                    values: {},
                },
            );
            const wanted = normalizeLabel(entry.text);
            const hits = (payload?.items || []).filter(
                (item) => normalizeLabel(item.label) === wanted,
            );
            cache.set(key, hits.length === 1 ? hits[0].value : null);
        }
        catch {
            // A datasource that fails is a value that could not be resolved, and
            // it is reported as such. It is never a reason to lose the rest.
            cache.set(key, null);
        }
    }
    return cache;
}

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
    // Which cell the next mounted row should land the caret in. `column` is an
    // index into the flat columns, so "add a line" from the middle of the grid
    // keeps the supplier in the column he was typing.
    const [focusTarget, setFocusTarget] = useState(null);
    const [pasteReport, setPasteReport] = useState(null);
    // The row whose own form is open — see `RowFormModal`.
    const [editingRow, setEditingRow] = useState(null);
    const [pasting, setPasting] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    // Keys, not rows: a row object is replaced on every re-read, its key is not.
    const [selection, setSelection] = useState(() => new Set());
    const [deletingSelection, setDeletingSelection] = useState(false);
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
    const [bulkEditing, setBulkEditing] = useState(false);
    const [savingPaste, setSavingPaste] = useState(false);
    const resolveCache = useRef(new Map());
    const focusedRef = useRef(null);

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

    /** The first column a new line can actually be typed into. */
    const firstEditableColumn = useCallback(
        () => Math.max(0, flatColumns.findIndex((column) => !column.readOnly && !column.protectedField)),
        [flatColumns],
    );

    const handleAdd = useCallback(
        (columnIndex) => {
            const draft = list.addRow();
            setFocusTarget({
                key: draft.key,
                column: typeof columnIndex === 'number' && columnIndex >= 0
                    ? columnIndex
                    : firstEditableColumn(),
            });
        },
        [list, firstEditableColumn],
    );

    const handleDuplicate = useCallback(
        (row) => {
            const draft = list.duplicateRow(row);
            if (draft) {
                setFocusTarget({ key: draft.key, column: firstEditableColumn() });
            }
        },
        [list, firstEditableColumn],
    );

    /*
     * Landing the caret in the new line — done from the DOM, not from a prop.
     *
     * `autoFocus` is passed down to the control and **most of the registry does
     * not honour it**: `DatasourcePicker` spreads its unknown props onto the
     * wrapper `<div>`, so `autofocus` ended up on a div, where it means nothing.
     * Measured: adding a row left the focus on the "Ajouter une ligne" button,
     * and the first thing a supplier had to do after asking for a line was to go
     * and click inside it. Every control renders a real focusable element inside
     * a `<td data-column>` — or inside a card on a phone — so that is what is
     * looked up here, and it works for the whole registry, present and future.
     */
    useEffect(() => {
        if (!focusTarget || typeof document === 'undefined') {
            return;
        }
        // Honoured once per request, remembered in a ref rather than cleared
        // from state: a `setState` here would cost a second render of the whole
        // grid for something that is finished the moment the caret lands.
        const token = `${focusTarget.key}#${focusTarget.column}`;
        if (focusedRef.current === token) {
            return;
        }
        focusedRef.current = token;
        const escaped = typeof CSS !== 'undefined' && CSS.escape
            ? CSS.escape(focusTarget.key)
            : focusTarget.key;
        const scope = document.querySelector(`tr[data-row-key="${escaped}"] td[data-column="${focusTarget.column}"]`)
            || document.querySelector(`[data-row-key="${escaped}"]`);
        const target = scope ? scope.querySelector(FOCUSABLE) : null;
        if (target) {
            target.focus();
            if (target.tagName === 'INPUT' && typeof target.select === 'function') {
                target.select();
            }
        }
    }, [focusTarget]);

    const handleDelete = useCallback(async () => {
        const row = pendingDelete;
        setPendingDelete(null);
        if (row) {
            await list.deleteRow(row);
        }
    }, [pendingDelete, list]);

    /*
     * The one bulk save that is genuinely owed.
     *
     * Every other write commits itself — on blur, on Enter, on a final-value
     * control. A paste is the exception: it fills rows nobody focused, so
     * nothing would ever blur them. Only the pasted keys are committed, never
     * the whole grid, so a row someone is still typing in is not swept up.
     */
    /*
     * Unmounting is the one exit that produces no blur.
     *
     * A row commits itself when the focus leaves it, and leaving a step moves
     * the focus to « Suivant », so navigation is covered. Closing the sheet or
     * unmounting the grid is not: whatever is still dirty goes out here rather
     * than being lost — spec §4.4 F2, no input can be lost.
     */
    const listRef = useRef(list);
    useEffect(() => {
        listRef.current = list;
    });
    useEffect(() => {
        const flush = listRef;
        return () => { flush.current.commitAll(); };
    }, []);

    const savePastedRows = useCallback(async () => {
        if (!pasteReport) {
            return;
        }
        setSavingPaste(true);
        try {
            for (const key of pasteReport.keys) {
                const row = list.rows.find((entry) => entry.key === key);
                if (row) {
                    await list.commitRow(row);
                }
            }
            setPasteReport(null);
        }
        finally {
            setSavingPaste(false);
        }
    }, [list, pasteReport]);

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

    /* ------------------------------------------------------- the selection */

    /*
     * Selecting rows to act on all of them at once — the gesture the V1 grid
     * had and this one did not: duplicating six lines meant six trips to the
     * same menu.
     *
     * The selection lives here rather than in `useDataList`: it is a property of
     * this screen, it must not survive a re-read that no longer holds the rows,
     * and nothing outside the grid has any use for it. Rows that left the page
     * are dropped on every render, so "3 selected" always matches what is on
     * screen.
     */
    const selectedRows = useMemo(
        () => rows.filter((row) => selection.has(row.key)),
        [rows, selection],
    );

    const toggleRow = useCallback((row, checked) => {
        setSelection((current) => {
            const next = new Set(current);
            if (checked) {
                next.add(row.key);
            }
            else {
                next.delete(row.key);
            }
            return next;
        });
    }, []);

    const toggleAll = useCallback((checked) => {
        setSelection(checked ? new Set(rows.map((row) => row.key)) : new Set());
    }, [rows]);

    const clearSelection = useCallback(() => setSelection(new Set()), []);

    const duplicateSelection = useCallback(() => {
        for (const row of selectedRows) {
            list.duplicateRow(row);
        }
        clearSelection();
    }, [selectedRows, list, clearSelection]);

    const moveSelection = useCallback(
        async (direction) => {
            await list.moveRows(selectedRows, direction);
        },
        [list, selectedRows],
    );

    const deleteSelection = useCallback(async () => {
        setConfirmBulkDelete(false);
        setDeletingSelection(true);
        try {
            await list.deleteRows(selectedRows);
            clearSelection();
        }
        finally {
            setDeletingSelection(false);
        }
    }, [list, selectedRows, clearSelection]);

    // One object, not one per row: `DataListCell` passes it straight to the
    // control registry, and a new identity on every row would defeat any
    // memoisation a control might grow.
    const rowContext = {
        entityNodeRef: entityId,
        itemType: list.itemType,
        formId: list.step?.formId || null,
    };

    /**
     * A block of cells from a spreadsheet, landing where the caret is.
     *
     * Everything about it is in `components/datalist/paste.js`; what happens
     * here is the two halves it cannot do — asking the datasource what a label
     * means, and writing the plan into the grid — followed by the report, which
     * is the point: a paste that took 38 of 40 values must say which two it did
     * not, and where.
     */
    const handlePaste = useCallback(
        async (event) => {
            if (list.readOnly) {
                return;
            }
            const text = event.clipboardData ? event.clipboardData.getData('text/plain') : '';
            const block = parseClipboardTable(text);
            if (!block) {
                // One cell: an ordinary paste into an ordinary input.
                return;
            }
            const target = event.target;
            const cell = target && typeof target.closest === 'function'
                ? target.closest('td[data-column]')
                : null;
            const rowEl = cell ? cell.closest('tr[data-row-key]') : null;
            if (!cell || !rowEl) {
                return;
            }
            const startColumn = Number(cell.getAttribute('data-column')) || 0;
            const startRow = rows.findIndex((row) => row.key === rowEl.getAttribute('data-row-key'));
            if (startRow < 0) {
                return;
            }

            event.preventDefault();
            setPasting(true);
            try {
                const plan = planPaste({
                    block,
                    columns: flatColumns,
                    startColumn,
                    rows,
                    startRow,
                    isCellEditable: list.isCellEditable,
                    canCreate: list.canCreate,
                });

                const pending = plan.targets.flatMap((entry) => entry.pending);
                if (pending.length > 0) {
                    await resolveAssociations(
                        pending,
                        {
                            formId: list.step?.formId || null,
                            itemType: list.itemType,
                            listId: list.step?.listId || null,
                            entityNodeRef: entityId,
                        },
                        resolveCache.current,
                    );
                }

                const unmatched = [...plan.unmatched];
                const touched = [];
                let cells = plan.cells;
                let created = 0;

                for (const entry of plan.targets) {
                    const values = { ...entry.values };
                    for (const item of entry.pending) {
                        const resolved = resolveCache.current.get(
                            `${item.column.id}\u0000${normalizeLabel(item.text)}`,
                        );
                        if (resolved) {
                            values[item.column.name] = item.column.repeating ? [resolved] : resolved;
                            cells += 1;
                        }
                        else {
                            unmatched.push({
                                line: item.line,
                                column: item.column.label,
                                text: item.text,
                                reason: 'association',
                            });
                        }
                    }
                    if (Object.keys(values).length === 0) {
                        continue;
                    }
                    if (entry.row) {
                        list.setCells(entry.row, values);
                        touched.push(entry.row.key);
                    }
                    else {
                        const draft = list.addRow(values);
                        touched.push(draft.key);
                        created += 1;
                    }
                }

                setPasteReport({
                    cells,
                    rows: touched.length,
                    created,
                    unmatched,
                    extraColumns: plan.extraColumns,
                    refusedRows: plan.refusedRows,
                    keys: touched,
                });
                /*
                 * The caret was in a cell, and if that cell is a picker its
                 * suggestion panel is open — 400px of list sitting exactly over
                 * the report that has just been written. The report is the point
                 * of the feature, so the focus is let go: the next gesture is to
                 * read it, fix what it lists, or save.
                 */
                if (typeof document !== 'undefined' && document.activeElement
                    && typeof document.activeElement.blur === 'function') {
                    document.activeElement.blur();
                }
            }
            finally {
                setPasting(false);
            }
        },
        [list, rows, flatColumns, entityId],
    );

    /*
     * The pinned columns only need their separating line while something is
     * actually sliding under them — a permanent rule on two column edges, in a
     * grid that draws none anywhere else, is just weight.
     *
     * Written straight onto the node rather than held in React state: a
     * horizontal scroll must not re-render two hundred rows.
     *
     * @param {HTMLElement} node the scroller
     */
    const markScroll = useCallback((node) => {
        if (!node) {
            return;
        }
        node.dataset.scrolledStart = node.scrollLeft > 0 ? 'true' : 'false';
        node.dataset.scrolledEnd =
            node.scrollLeft + node.clientWidth < node.scrollWidth - 1 ? 'true' : 'false';
    }, []);

    const undoPaste = useCallback(() => {
        if (pasteReport) {
            list.discardRows(pasteReport.keys);
        }
        setPasteReport(null);
    }, [list, pasteReport]);

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

    // Every entry affordance below hangs off this one flag, so a frozen list, a
    // wizard with no assigned task and a read-only product tab all lose the same
    // set of buttons — and lose them by **not being rendered**, never by being
    // disabled (spec: hide, do not disable).
    const editable = !list.readOnly;
    // Selecting is only offered where something can be done with a selection.
    const selectable = editable && rows.length > 0;
    const sticky = stickyOffsets({
        selectable,
        showOrder,
        hasNested: nestedColumns.length > 0,
    });
    const allSelected = rows.length > 0 && selection.size >= rows.length;
    const shortcutRows = label('shortcutList') || [];
    const reasons = label('pasteReasons') || {};

    return (
        <div className={className}>
            <DataListToolbar
                list={list}
                title={title}
                description={description}
                onAdd={editable ? () => handleAdd() : undefined}
                onShowShortcuts={editable ? () => setShortcutsOpen(true) : undefined}
                actions={actions}
            />

            {list.readOnly ? <ReadOnlyNotice reason={list.readOnlyReason} /> : null}

            {/*
              * The paste report — the honest half of the feature.
              *
              * It is rendered above the grid, keeps the exact text of every value
              * that could not be mapped, and offers to undo the whole thing in
              * one click. Nothing has reached beCPG at this point: the pasted
              * lines are pending edits, and "Annuler le collage" drops them.
              */}
            {pasteReport ? (
                <div
                    role="status"
                    className="mb-3 rounded-xl border border-[var(--becpg-blue-lighter)] bg-[var(--becpg-blue-lighter)]/40 p-3"
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <Icon name="content_paste" size={18} className="text-[var(--becpg-blue)]" />
                        <p className="min-w-0 flex-1 text-sm font-medium text-[var(--becpg-blue)]">
                            {pasteReport.cells > 0
                                ? label('pasteApplied', {
                                    cells: pasteReport.cells,
                                    rows: pasteReport.rows,
                                    created: pasteReport.created,
                                })
                                : label('pasteNothing')}
                        </p>
                        {pasteReport.keys.length > 0 ? (
                            <>
                                <Button variant="outline" size="sm" icon="undo" onClick={undoPaste}>
                                    {label('pasteUndo')}
                                </Button>
                                {editable ? (
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        icon="save"
                                        loading={savingPaste}
                                        onClick={savePastedRows}
                                    >
                                        {label('pasteSave', { count: pasteReport.keys.length })}
                                    </Button>
                                ) : null}
                            </>
                        ) : null}
                        <IconButton
                            icon="close"
                            label={t('action.close')}
                            variant="ghost"
                            size="icon"
                            onClick={() => setPasteReport(null)}
                        />
                    </div>

                    {pasteReport.extraColumns > 0 ? (
                        <p className="mt-1 text-sm text-[var(--becpg-dark-grey)]">
                            {label('pasteExtraColumns', { count: pasteReport.extraColumns })}
                        </p>
                    ) : null}
                    {pasteReport.refusedRows > 0 ? (
                        <p className="mt-1 text-sm text-[var(--becpg-dark-grey)]">
                            {label('pasteRefusedRows', { count: pasteReport.refusedRows })}
                        </p>
                    ) : null}

                    {pasteReport.unmatched.length > 0 ? (
                        <div className="mt-2">
                            <p className="text-sm text-[var(--becpg-dark-grey)]">
                                {label('pasteUnmatched', { count: pasteReport.unmatched.length })}
                            </p>
                            <ul className="mt-1 max-h-40 overflow-y-auto text-xs text-[var(--becpg-dark-grey)]">
                                {pasteReport.unmatched.map((entry, index) => (
                                    <li key={index} className="py-0.5">
                                        <span className="font-medium">
                                            {label('pasteLine', { line: entry.line })} · {entry.column}
                                        </span>
                                        {' — '}
                                        <span className="break-words">« {entry.text} »</span>
                                        {' · '}
                                        {reasons[entry.reason] || entry.reason}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </div>
            ) : null}

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
                            <Button variant="primary" icon="add" onClick={() => handleAdd()}>
                                {label('addRow')}
                            </Button>
                        ) : null
                    }
                />
            ) : (
                <>
                    {/* ------------------------------------------ desktop table */}
                    {/*
                      * The selection bar. Above the grid, not floating over it:
                      * the actions belong to the rows being looked at, and a
                      * fixed bar would sit on top of the last line of a list
                      * that already scrolls inside its own box.
                      */}
                    {selectedRows.length > 0 ? (
                        <div
                            role="group"
                            aria-label={label('selected', { count: selectedRows.length })}
                            className="mb-2 hidden flex-wrap items-center gap-2 rounded-xl border border-[var(--becpg-blue-lighter)] bg-[var(--becpg-blue-lighter)]/40 px-3 py-2 md:flex"
                        >
                            <span className="text-sm font-medium text-[var(--becpg-blue)]">
                                {label('selected', { count: selectedRows.length })}
                            </span>
                            <div className="ml-auto flex flex-wrap items-center gap-1">
                                {/* Before the reorder and the delete: filling a
                                    column down a selection is what a supplier
                                    does often, the rest is occasional. */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon="edit"
                                    aria-label={label('bulkEditLong')}
                                    onClick={() => setBulkEditing(true)}
                                >
                                    {label('bulkEdit')}
                                </Button>
                                {list.canReorder ? (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            icon="arrow_upward"
                                            aria-label={label('bulkMoveUpLong')}
                                            onClick={() => moveSelection('up')}
                                        >
                                            {label('bulkMoveUp')}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            icon="arrow_downward"
                                            aria-label={label('bulkMoveDownLong')}
                                            onClick={() => moveSelection('down')}
                                        >
                                            {label('bulkMoveDown')}
                                        </Button>
                                    </>
                                ) : null}
                                {list.canCreate ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        icon="content_copy"
                                        aria-label={label('bulkDuplicateLong')}
                                        onClick={duplicateSelection}
                                    >
                                        {label('bulkDuplicate')}
                                    </Button>
                                ) : null}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon="delete_outline"
                                    aria-label={label('bulkDeleteLong')}
                                    loading={deletingSelection}
                                    onClick={() => setConfirmBulkDelete(true)}
                                >
                                    {label('bulkDelete')}
                                </Button>
                                <Button variant="ghost" size="sm" icon="close" onClick={clearSelection}>
                                    {label('clearSelection')}
                                </Button>
                            </div>
                        </div>
                    ) : null}

                    {/*
                      * A BOUNDED SCROLLER, NOT A TABLE THAT GROWS FOREVER.
                      *
                      * The horizontal scrollbar sits at the bottom of the
                      * scroller: on a table as tall as the page, that is off
                      * screen, and reaching the last column meant scrolling
                      * vertically to the end of a two hundred row list first.
                      * Capping the height keeps that bar in view, and the header
                      * and the pinned columns (`data-sticky`) keep saying which
                      * row and which characteristic is being read — the same
                      * arrangement as the ingredient grid in the administration.
                      */}
                    <div
                        ref={markScroll}
                        className="table-scroll hidden rounded-xl border border-[var(--becpg-grey)] bg-white md:block"
                        data-sticky="true"
                        onScroll={(event) => markScroll(event.currentTarget)}
                        onPaste={editable ? handlePaste : undefined}
                        data-pasting={pasting ? 'true' : undefined}
                    >
                        <table className="becpg-grid">
                            <caption className="sr-only-text">{title || list.title}</caption>
                            <thead>
                                <tr>
                                    {selectable ? (
                                        <th
                                            scope="col"
                                            className="px-1"
                                            style={{ width: SELECT_WIDTH, left: sticky.selection }}
                                            data-sticky="start"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={allSelected}
                                                aria-label={label('selectAll')}
                                                onChange={(event) => toggleAll(event.target.checked)}
                                                className="h-4 w-4 cursor-pointer accent-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                                            />
                                        </th>
                                    ) : null}
                                    {showOrder ? (
                                        <th
                                            scope="col"
                                            style={{ width: '3.5rem', left: sticky.order }}
                                            data-sticky="start"
                                        >
                                            <span className="sr-only-text">{label('order')}</span>
                                        </th>
                                    ) : null}
                                    {nestedColumns.length > 0 ? (
                                        <th
                                            scope="col"
                                            className="w-10"
                                            style={{ left: sticky.nested }}
                                            data-sticky="start"
                                        >
                                            <span className="sr-only-text">{label('detail')}</span>
                                        </th>
                                    ) : null}
                                    {flatColumns.map((column, position) => {
                                        const sorted = list.sort?.column === column.name
                                            ? (list.sort.asc ? 'ascending' : 'descending')
                                            : undefined;
                                        return (
                                            <th
                                                key={column.formsName}
                                                scope="col"
                                                aria-sort={sorted}
                                                style={position === 0 ? { left: sticky.first } : undefined}
                                                data-sticky={position === 0 ? 'start' : undefined}
                                                data-sticky-edge={position === 0 ? 'true' : undefined}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => list.toggleSort(column)}
                                                    title={label('sortBy', { column: column.label })}
                                                    className="becpg-grid-sort"
                                                >
                                                    <span>{column.label}</span>
                                                    {needsAnswer(column) ? (
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
                                    <th scope="col" className="w-24 text-right" data-sticky="end">
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
                                        onEditRow={setEditingRow}
                                        onAddRow={list.canCreate ? handleAdd : undefined}
                                        onDuplicate={list.canCreate ? handleDuplicate : undefined}
                                        showOrder={showOrder}
                                        selectable={selectable}
                                        selected={selection.has(row.key)}
                                        onToggleSelect={toggleRow}
                                        sticky={sticky}
                                        dense={dense}
                                        zebra={index % 2 === 1}
                                        autoFocus={row.key === focusTarget?.key}
                                        autoFocusColumn={focusTarget?.column ?? 0}
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
                                            selectable={selectable}
                                            sticky={sticky}
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
                                onEditRow={setEditingRow}
                                onDuplicate={list.canCreate ? handleDuplicate : undefined}
                                showOrder={showOrder}
                                autoFocus={row.key === focusTarget?.key}
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
                            onClick={() => handleAdd()}
                        >
                            {label('addRow')}
                        </Button>
                    ) : null}

                    {list.total > PAGE_SIZES[0] ? (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--becpg-dark-grey)]">
                            <span>{t('state.of', { from, to, total: list.total })}</span>
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1.5">
                                    <span>{label('rowsPerPage')}</span>
                                    <select
                                        value={list.pageSize}
                                        onChange={(event) => {
                                            list.setPageSize(Number(event.target.value));
                                            list.setPage(1);
                                        }}
                                        className="rounded-lg border border-[var(--becpg-grey)] bg-white px-1.5 py-1 text-xs text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                                    >
                                        {PAGE_SIZES.map((size) => (
                                            <option key={size} value={size}>{size}</option>
                                        ))}
                                    </select>
                                </label>
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

            {editingRow && list.rowForm ? (
                <RowFormModal
                    list={list}
                    row={editingRow}
                    rowForm={list.rowForm}
                    entityNodeRef={entityId}
                    onClose={() => setEditingRow(null)}
                />
            ) : null}

            <ConfirmModal
                open={Boolean(pendingDelete)}
                onClose={() => setPendingDelete(null)}
                onConfirm={handleDelete}
                tone="danger"
                title={label('deleteTitle')}
                message={label('deleteText')}
                confirmLabel={t('action.delete')}
            />

            {bulkEditing ? (
                <BulkEditModal
                    list={list}
                    rows={selectedRows}
                    onClose={() => setBulkEditing(false)}
                    onApplied={clearSelection}
                />
            ) : null}

            <ConfirmModal
                open={confirmBulkDelete}
                onClose={() => setConfirmBulkDelete(false)}
                onConfirm={deleteSelection}
                tone="danger"
                title={label('deleteSelectedTitle', { count: selectedRows.length })}
                message={label('deleteSelectedText')}
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

            {/* The shortcuts are discoverable, not folklore. */}
            <Modal
                open={shortcutsOpen}
                onClose={() => setShortcutsOpen(false)}
                title={label('shortcutsTitle')}
                size="sm"
            >
                <dl className="flex flex-col gap-2 text-sm">
                    {shortcutRows.map(([keys, meaning]) => (
                        <div key={keys} className="flex flex-wrap items-baseline gap-2">
                            <dt className="shrink-0 rounded-md border border-[var(--becpg-grey)] bg-[var(--becpg-grey)]/40 px-1.5 py-0.5 font-mono text-xs text-[var(--becpg-blue)]">
                                {keys}
                            </dt>
                            <dd className="min-w-0 flex-1 text-[var(--becpg-dark-grey)]">{meaning}</dd>
                        </div>
                    ))}
                </dl>
            </Modal>
        </div>
    );
}
