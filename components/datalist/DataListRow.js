'use client';

/**
 * One row of the datalist, in **table** layout (`md` and up).
 *
 * This file also owns the two pieces the card layout reuses, so a cell behaves
 * identically whichever layout renders it: `DataListCell` (the editor of a
 * single cell) and `NestedSection` (the expandable sub-list).
 *
 * ## The control registry contract
 *
 * Cells are never edited by a widget written here. The control is resolved from
 * `components/form/controls`, which maps the beCPG control names produced by
 * `lib/adapters/forms.js` (`textfield`, `textarea`, `number`, `checkbox`,
 * `select`, `date`, `autocomplete-association`, `mltext`, …) onto React
 * components. Each control receives:
 *
 * ```js
 * {
 *   field,        // the normalised column: name, formsName, label, dataType,
 *                 // control {name, template, params}, constraints, mandatory…
 *   value,        // the raw value (never the displayValue)
 *   displayValue, // the localised text, for controls that show a label
 *   onChange,     // (nextValue) => void — records the edit
 *   readOnly, disabled, required, invalid, id, 'aria-label',
 *   lang, values, formId, itemType, listId, entityNodeRef   // context props
 * }
 * ```
 *
 * **That is exactly the contract documented in `components/form/controls/index.js`,
 * flat props and all.** This file used to pass a nested `context: {…}` object and
 * an `onCommit` callback instead. No control destructures either name, so both
 * landed in `...rest` and were spread onto the DOM node, and React warned on
 * every single cell (`Invalid value for prop 'context' on <input>`, `Unknown
 * event handler property 'onCommit'`). Do not reintroduce a second contract: the
 * form renderer and the grid must hand a control the same props.
 *
 * ## Committing
 *
 * Free-text controls commit when the focus leaves the **row** (or on Enter);
 * pickers commit on selection. The row — not the cell — is the unit sent to the
 * server, because that is the unit beCPG's form processor persists, and because
 * committing per cell would turn one edited line into five requests.
 *
 * Nothing is asked of the controls for this: `DataListRow` and `DataListCardRow`
 * carry `onBlur` / `onKeyDown` on the row container. React's `onBlur` is
 * `focusout`, which bubbles, so a focus leaving any control inside the row is
 * caught there — `relatedTarget` still inside the row is not a commit. That is
 * why the `onCommit` prop was never needed, only never noticed.
 */

import { createElement, useCallback, useRef, useState } from 'react';
import { getControl } from '@/components/form/controls';
import { renderDataListCell } from '@/components/datalist/renderers';
import { useMessages } from '@/lib/messages';
import { Icon, IconButton, Spinner } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { ROW_STATUS, useDataListLabels } from '@/components/datalist/useDataList';

/**
 * Controls whose value is final as soon as it changes: there is nothing to
 * "finish typing" in a checkbox or a picker, and waiting for a blur would leave
 * the user staring at an unsaved row.
 */
const INSTANT_COMMIT = new Set([
    'checkbox',
    'select',
    'radio',
    'date',
    'datetime',
    'period',
    'autocomplete-association',
    'association',
    'file',
]);

/**
 * Renders one cell — read mode, edit mode, or locked-protected mode.
 *
 * @param {Object} props
 * @param {Object} props.row
 * @param {Object} props.column normalised column (see `lib/adapters/datalists.js`)
 * @param {Object} props.list the `useDataList` instance
 * @param {Object} [props.context] `{ entityNodeRef, itemType, formId }`
 * @param {boolean} [props.autoFocus]
 * @param {'table'|'card'} [props.layout='table'] which layout is rendering this
 *   cell — the renderers use it to size an indent for a 360 px screen
 */
export function DataListCell({ row, column, list, context, autoFocus = false, layout = 'table' }) {
    const label = useDataListLabels();
    const { lang } = useMessages();
    const editable = list.isCellEditable(row, column);
    const value = list.valueOf(row, column);
    const display = list.displayOf(row, column);
    const id = `${row.key}__${column.formsName}`;

    // A protected column arrives read-only from the adapter on purpose: it takes
    // a deliberate confirmation to touch it (spec §6, point 6).
    if (column.protectedField && !editable && !list.readOnly && list.canEditRow(row)) {
        return (
            <button
                type="button"
                onClick={() => list.requestUnlock(row, column)}
                title={label('protectedLocked')}
                className="group flex w-full items-center justify-between gap-1 rounded-md border border-dashed border-[var(--becpg-grey)] px-2 py-1 text-left text-sm hover:border-[var(--becpg-orange)]"
            >
                <span className="min-w-0 truncate">{display || '—'}</span>
                <Icon
                    name="lock"
                    size={14}
                    className="shrink-0 text-[var(--becpg-dark-grey)] group-hover:text-[var(--becpg-orange)]"
                />
            </button>
        );
    }

    if (!editable) {
        /*
         * The column-renderer registry, and the only place a read cell is
         * produced — the table and the card both land here, so a phone shows
         * the same formatted value as a desktop from the same code.
         *
         * beCPG does not put display logic in the data: Share ships 65
         * renderers over 156 property keys and consults them for every cell.
         * Printing `displayValue` verbatim is right for most columns and wrong
         * for the few that carry structured data — « Valeur étiquetée »
         * (`bcpg:nutListRoundedValue`) is a JSON envelope of per-country
         * labelled values, and the supplier was reading it raw.
         *
         * `null` means the registry declined, and then nothing changes: the
         * cell renders exactly as it always has. That is what lets a renderer
         * improve one case without owning every case.
         */
        const rendered = renderDataListCell({
            value,
            displayValue: display,
            row,
            column,
            lang,
            layout,
        });
        if (rendered !== null) {
            return <span className="block min-w-0 break-words text-sm">{rendered}</span>;
        }
        return (
            <span className="block min-w-0 break-words text-sm" title={display || undefined}>
                {display || <span className="text-[var(--becpg-dark-grey)]">—</span>}
            </span>
        );
    }

    const controlName = column.control?.name || 'textfield';
    const control = getControl(controlName) || getControl('textfield');
    if (!control) {
        // The registry does not know this control: show the value rather than an
        // empty cell. Writing a replacement editor here is explicitly forbidden.
        return <span className="block min-w-0 break-words text-sm">{display || '—'}</span>;
    }

    const missing = column.mandatory && (value === null || value === undefined || value === '');

    /*
     * A picker commits as soon as it is used — but **never while the row is still
     * a draft**, and that exception is not a nicety.
     *
     * Measured on `bcpg:physicoChemList`, whose first column is the mandatory
     * association: adding a row, choosing the characteristic, then typing the
     * value — the obvious order, left to right — produced
     *
     *     200 PUT   ← the pick instant-committed the draft: the row is created
     *                 with the association alone
     *     502 PUT   ← the value, typed a second later, was committed against a
     *                 draft whose `nodeRef` is still null, so the portal asked
     *                 beCPG to CREATE A SECOND ROW carrying only that value.
     *                 beCPG refused it (mandatory association missing).
     *
     * The value was lost and the supplier was told « Connexion impossible au
     * serveur ». The draft only learns its nodeRef through the silent refresh
     * that follows the create, and everything typed in that window falls into the
     * hole.
     *
     * So a draft is committed the way this file documents for every other cell:
     * by the row's own blur / Enter, the row being the unit beCPG persists.
     * A persisted row keeps the instant commit — there is no draft to lose.
     */
    const instant = INSTANT_COMMIT.has(controlName) && !row.draft;

    // `createElement` rather than JSX on purpose: `getControl` *looks up* an
    // existing component in the registry, it never creates one, and writing it
    // as `<Control …>` would read (to a human and to the linter) as a component
    // declared during render.
    const element = createElement(control, {
        field: column,
        id,
        value,
        displayValue: display,
        required: column.mandatory,
        invalid: missing,
        readOnly: false,
        disabled: list.statusOf(row.key).state === ROW_STATUS.DELETING,
        autoFocus,
        'aria-label': column.label,
        'aria-invalid': missing || undefined,
        // Flat context props — the contract of `components/form/controls`. An
        // autocomplete resolves its `parentAssoc` dependency from `values`
        // (contracts §3), which here is the rest of the row.
        lang,
        values: row.values,
        entityNodeRef: context?.entityNodeRef,
        itemType: context?.itemType,
        formId: context?.formId,
        // What `POST /api/v1/autocomplete/{formId}/{fieldId}` needs to resolve a
        // datasource declared on a list rather than on the entity.
        listId: context?.listId ?? list.step?.listId ?? null,
        onChange: (next) => {
            list.setCell(row, column, next);
            if (instant) {
                // Safe in the same tick: `setCell` writes the hook's dirty ref
                // synchronously, so `commitRow` sees this very edit.
                list.commitRow(row);
            }
        },
    });

    // Free-text controls are committed by the row's own `onBlur` / `onKeyDown`.
    return element;
}

/**
 * The per-row saving / saved / error indicator.
 *
 * It is deliberately verbose on failure: a grid that fails silently is a grid
 * that loses a supplier's afternoon.
 *
 * @param {Object} props
 * @param {Object} props.row
 * @param {Object} props.list
 * @param {boolean} [props.compact] icon only (table layout)
 */
export function RowStatus({ row, list, compact = false }) {
    const label = useDataListLabels();
    const status = list.statusOf(row.key);
    const dirty = list.isRowDirty(row.key);

    if (status.state === ROW_STATUS.SAVING) {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--becpg-dark-grey)]">
                <Spinner size={14} />
                {compact ? null : label('saving')}
            </span>
        );
    }
    if (status.state === ROW_STATUS.DELETING) {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--becpg-dark-grey)]">
                <Spinner size={14} />
                {compact ? null : label('deleting')}
            </span>
        );
    }
    if (status.state === ROW_STATUS.SAVED) {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--status-ok,green)]">
                <Icon name="check_circle" size={16} />
                {compact ? null : label('saved')}
            </span>
        );
    }
    if (status.state === ROW_STATUS.ERROR) {
        return (
            <span className="inline-flex items-center gap-1">
                <Tooltip content={label('failed')} placement="left">
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--status-danger,#c0392b)]">
                        <Icon name="error" size={16} />
                        {compact ? null : label('failed')}
                    </span>
                </Tooltip>
                <IconButton
                    icon="refresh"
                    label={label('retry')}
                    variant="ghost"
                    size="icon"
                    onClick={() => list.commitRow(row)}
                />
            </span>
        );
    }
    if (dirty) {
        return (
            <span className="inline-flex items-center gap-1">
                <IconButton
                    icon="save"
                    label={label('saveRow')}
                    variant="ghost"
                    size="icon"
                    onClick={() => list.commitRow(row)}
                />
                <IconButton
                    icon="undo"
                    label={label('discard')}
                    variant="ghost"
                    size="icon"
                    onClick={() => list.discardRow(row)}
                />
            </span>
        );
    }
    return null;
}

/**
 * The expandable sub-section of a nested column (`type: "dataList"` on a
 * sub-list, `"entity"` on a linked entity — contracts §1).
 *
 * Nested rows are rendered from their `displayValue`s: they belong to another
 * datalist, with its own security state, and beCPG edits them in their own grid.
 * Showing them here is what makes a nutrient line or a sub-supplier readable
 * without leaving the step.
 *
 * @param {Object} props
 * @param {Object} props.row
 * @param {Object} props.column the nested column
 * @param {Object} props.list
 */
export function NestedSection({ row, column, list }) {
    const label = useDataListLabels();
    const { lang } = useMessages();
    const children = column.columns || [];
    const entries = list.nestedRowsOf(row, column);

    return (
        <div className="rounded-lg border border-[var(--becpg-grey)] bg-[var(--becpg-grey)]/30 p-2">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                {column.label}
            </p>
            {entries.length === 0 ? (
                <p className="text-xs text-[var(--becpg-dark-grey)]">{label('nestedEmpty')}</p>
            ) : (
                <div className="table-scroll">
                    <table className="w-full border-collapse text-xs">
                        <thead>
                            <tr>
                                {children.map((child) => (
                                    <th
                                        key={child.formsName}
                                        scope="col"
                                        className="px-2 py-1 text-left font-medium text-[var(--becpg-dark-grey)]"
                                    >
                                        {child.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry, index) => (
                                <tr key={index} className="border-t border-[var(--becpg-grey)]">
                                    {children.map((child) => (
                                        <td key={child.formsName} className="px-2 py-1 align-top">
                                            {/*
                                              * Nested rows go through the same registry as the
                                              * outer grid — a sub-list of nutrients would otherwise
                                              * show the raw JSON envelope here while the column
                                              * beside it shows `1 020`. `null` keeps the previous
                                              * rendering untouched.
                                              */}
                                            {renderDataListCell({
                                                value: entry.values?.[child.formsName] ?? null,
                                                displayValue: entry.displayValues?.[child.formsName] ?? null,
                                                row: entry,
                                                column: child,
                                                lang,
                                            }) ?? (
                                                entry.displayValues?.[child.formsName]
                                                    ?? entry.values?.[child.formsName]
                                                    ?? '—'
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

/**
 * A table row.
 *
 * @param {Object} props
 * @param {Object} props.row
 * @param {number} props.index position on the page, 1-based (used for the accessible name)
 * @param {Object[]} props.columns flat (non-nested) columns, in server order
 * @param {Object[]} props.nestedColumns nested columns, rendered in the sub-section
 * @param {Object} props.list the `useDataList` instance
 * @param {Object} [props.context] `{ entityNodeRef, itemType, formId }`
 * @param {Function} [props.onDelete] `(row) => void` — opens the confirmation
 * @param {boolean} [props.showOrder] renders the reorder column
 * @param {boolean} [props.showActions] renders the actions column
 * @param {boolean} [props.dense]
 * @param {boolean} [props.autoFocus] focus the first editable cell (a new row)
 */
export function DataListRow({
    row,
    index,
    columns,
    nestedColumns = [],
    list,
    context,
    onDelete,
    showOrder = false,
    showActions = true,
    dense = false,
    autoFocus = false,
}) {
    const label = useDataListLabels();
    const [expanded, setExpanded] = useState(false);
    const containerRef = useRef(null);
    const status = list.statusOf(row.key);
    const hasNested = nestedColumns.length > 0;
    const columnCount = columns.length + (showOrder ? 1 : 0) + (hasNested ? 1 : 0) + (showActions ? 1 : 0);

    /** Leaving the row is what turns pending edits into a request. */
    const handleBlur = useCallback(
        (event) => {
            const next = event.relatedTarget;
            if (next && containerRef.current && containerRef.current.contains(next)) {
                return;
            }
            if (list.isRowDirty(row.key)) {
                list.commitRow(row);
            }
        },
        [list, row],
    );

    const handleKeyDown = useCallback(
        (event) => {
            // Enter is also how a picker validates its highlighted option — the
            // event bubbles here from the combobox. On a **draft** that meant the
            // row was created from the association alone, while the local row kept
            // `nodeRef: null`; whatever the user typed next was then committed as a
            // *second* create and refused. See the comment on `instant` above: a
            // draft is committed by leaving the row, once, with everything in it.
            if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA' && !row.draft) {
                event.preventDefault();
                list.commitRow(row);
            }
            if (event.key === 'Escape' && list.isRowDirty(row.key)) {
                list.discardRow(row);
            }
        },
        [list, row],
    );

    const cellPadding = dense ? 'py-1' : 'py-1.5';
    const rowTone = status.state === ROW_STATUS.ERROR
        ? 'bg-[var(--status-danger-bg,#fdecea)]'
        : row.draft
          ? 'bg-[var(--becpg-blue-lighter)]/40'
          : '';

    return (
        <>
            <tr
                ref={containerRef}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                aria-label={row.draft ? label('newRow') : label('row', { index })}
                className={`border-b border-[var(--becpg-grey)] last:border-0 ${rowTone}`}
            >
                {showOrder ? (
                    <td className={`px-1 ${cellPadding} align-middle`}>
                        <div className="flex flex-col">
                            <IconButton
                                icon="keyboard_arrow_up"
                                label={label('moveUp')}
                                variant="ghost"
                                size="icon"
                                disabled={!list.canReorder || row.draft}
                                onClick={() => list.moveRow(row, 'up')}
                            />
                            <IconButton
                                icon="keyboard_arrow_down"
                                label={label('moveDown')}
                                variant="ghost"
                                size="icon"
                                disabled={!list.canReorder || row.draft}
                                onClick={() => list.moveRow(row, 'down')}
                            />
                        </div>
                    </td>
                ) : null}

                {hasNested ? (
                    <td className={`px-1 ${cellPadding} align-middle`}>
                        <IconButton
                            icon={expanded ? 'expand_less' : 'expand_more'}
                            label={expanded ? label('collapse') : label('expand')}
                            variant="ghost"
                            size="icon"
                            aria-expanded={expanded}
                            onClick={() => setExpanded((value) => !value)}
                        />
                    </td>
                ) : null}

                {columns.map((column, position) => (
                    <td
                        key={column.formsName}
                        className={`px-2 ${cellPadding} align-middle`}
                        style={{ minWidth: '8rem' }}
                    >
                        <DataListCell
                            row={row}
                            column={column}
                            list={list}
                            context={context}
                            autoFocus={autoFocus && position === 0}
                        />
                    </td>
                ))}

                {showActions ? (
                    <td className={`px-2 ${cellPadding} align-middle text-right whitespace-nowrap`}>
                        <div className="inline-flex items-center gap-1">
                            <RowStatus row={row} list={list} compact />
                            {list.canDeleteRow(row) && onDelete ? (
                                <IconButton
                                    icon="delete_outline"
                                    label={label('deleteRow')}
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onDelete(row)}
                                />
                            ) : null}
                        </div>
                    </td>
                ) : null}
            </tr>

            {hasNested && expanded ? (
                <tr className="border-b border-[var(--becpg-grey)]">
                    <td colSpan={columnCount} className="bg-white px-2 pb-2">
                        <div className="flex flex-col gap-2">
                            {nestedColumns.map((column) => (
                                <NestedSection key={column.formsName} row={row} column={column} list={list} />
                            ))}
                        </div>
                    </td>
                </tr>
            ) : null}
        </>
    );
}
