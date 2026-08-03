'use client';

/**
 * One row of the datalist, in **card** layout (below `md`).
 *
 * This is not a nicety. A supplier fills these lists from a phone (spec §4.4:
 * the wizard must be completable on a 360px screen), and a nine-column datagrid
 * on a 360px screen is unusable at any font size. So below `md` a row stops
 * being a line of cells and becomes a card of label/value pairs, one field per
 * line, each field full width and thumb-sized.
 *
 * Everything else is shared with the table layout: the same `useDataList`
 * instance, the same `DataListCell` (hence the same control registry), the same
 * per-row status, the same protected-field unlock, the same nested sub-section.
 * Editing on the phone and editing on the desktop are literally the same code
 * path — there is no second implementation to keep in sync.
 */

import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Icon, IconButton } from '@/components/ui/Button';
import {
    DataListCell,
    NestedSection,
    RowStatus,
} from '@/components/datalist/DataListRow';
import { renderDataListCell } from '@/components/datalist/renderers';
import { isTotalRow, ROW_STATUS, useDataListLabels } from '@/components/datalist/useDataList';
import { isMachineValue } from '@/lib/format';
import { useMessages } from '@/lib/messages';

/**
 * @param {Object} props
 * @param {Object} props.row
 * @param {number} props.index position on the page, 1-based
 * @param {Object[]} props.columns flat (non-nested) columns, in server order
 * @param {Object[]} [props.nestedColumns] nested columns, in the expandable section
 * @param {Object} props.list the `useDataList` instance
 * @param {Object} [props.context] `{ entityNodeRef, itemType, formId }`
 * @param {Function} [props.onDelete] `(row) => void`
 * @param {Function} [props.onDuplicate] `(row) => void` — a new card pre-filled from this one
 * @param {boolean} [props.showOrder] renders the reorder buttons
 * @param {boolean} [props.autoFocus] focus the first editable field (a new row)
 */
export function DataListCardRow({
    row,
    index,
    columns,
    nestedColumns = [],
    list,
    context,
    onDelete,
    onDuplicate,
    showOrder = false,
    autoFocus = false,
}) {
    const label = useDataListLabels();
    const { lang } = useMessages();
    const [expanded, setExpanded] = useState(false);
    const containerRef = useRef(null);
    const status = list.statusOf(row.key);
    const dirty = list.isRowDirty(row.key);

    /*
     * The computed total row. It is not a row of the list (see `isTotalRow`),
     * so on a phone it is not a card of the list either: no row number, no
     * reorder, no delete, and the surface and weight that say "this line was
     * calculated, not typed". `DataListEditor` renders it after every data card.
     */
    const summary = isTotalRow(row);

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

    // The card's headline: the first column carries the row's identity in every
    // beCPG datalist (the characteristic, the ingredient, the question).
    const [headColumn, ...restColumns] = columns;
    const headline = headColumn ? list.displayOf(row, headColumn) : '';
    const headEditable = headColumn ? list.isCellEditable(row, headColumn) : false;
    // The headline is a cell like any other — it goes through the column-renderer
    // registry too, so the card's title reads the same as the table's first
    // column (the ingredient's indent, a state's pill) instead of being the one
    // place that still prints the raw value.
    const headlineNode = headColumn && !headEditable
        ? renderDataListCell({
            value: list.valueOf(row, headColumn),
            displayValue: headline,
            row,
            column: headColumn,
            lang,
            layout: 'card',
        })
        : null;

    const tone = status.state === ROW_STATUS.ERROR
        ? 'border-[var(--status-danger,#c0392b)]'
        : row.draft
          ? 'border-[var(--becpg-blue-light)]'
          : 'border-[var(--becpg-grey)]';

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
        >
            <section
                ref={containerRef}
                onBlur={summary ? undefined : handleBlur}
                aria-label={summary ? label('totalRow') : row.draft ? label('newRow') : label('row', { index })}
                // The editor focuses a new card through this, exactly as it does
                // a new table row — one mechanism for both layouts.
                data-row-key={row.key}
                data-total={summary ? 'true' : undefined}
                className={
                    summary
                        ? 'rounded-xl border border-[var(--status-neutral-border)] bg-[var(--becpg-grid-total-surface)] p-3 font-semibold text-[var(--becpg-blue)]'
                        : `rounded-xl border bg-white p-3 ${tone}`
                }
            >
                <header className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                            {summary ? label('totalRow') : row.draft ? label('newRow') : label('row', { index })}
                        </p>
                        {headColumn && !headEditable ? (
                            <p className="truncate text-sm font-medium">
                                {/* Same last guard as the table cell: a nodeRef or a
                                    node uuid is never the title of a row. */}
                                {headlineNode ?? ((isMachineValue(headline) ? '' : headline) || '—')}
                            </p>
                        ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        {showOrder && !summary ? (
                            <>
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
                            </>
                        ) : null}
                        {/* The phone gets the same shortcut the grid does — one
                            tap for "another line like this one" is worth more on
                            a 360px screen than anywhere else. */}
                        {onDuplicate && list.canCreate && !row.draft && !summary ? (
                            <IconButton
                                icon="content_copy"
                                label={label('duplicate')}
                                variant="ghost"
                                size="icon"
                                onClick={() => onDuplicate(row)}
                            />
                        ) : null}
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
                </header>

                <dl className="flex flex-col gap-2.5">
                    {(headColumn && headEditable ? [headColumn, ...restColumns] : restColumns).map(
                        (column, position) => (
                            <div key={column.formsName} className="flex flex-col gap-1">
                                <dt className="flex items-center gap-1 text-xs font-medium text-[var(--becpg-dark-grey)]">
                                    <span>{column.label}</span>
                                    {column.mandatory ? (
                                        <span
                                            aria-label={label('mandatory')}
                                            className="text-[var(--becpg-orange)]"
                                        >
                                            *
                                        </span>
                                    ) : null}
                                    {column.protectedField ? (
                                        <Icon
                                            name="lock"
                                            size={12}
                                            className="text-[var(--becpg-dark-grey)]"
                                        />
                                    ) : null}
                                </dt>
                                <dd className="min-w-0">
                                    <DataListCell
                                        row={row}
                                        column={column}
                                        list={list}
                                        context={context}
                                        autoFocus={autoFocus && position === 0}
                                        layout="card"
                                    />
                                </dd>
                                {column.help ? (
                                    <p className="text-[11px] text-[var(--becpg-dark-grey)]">{column.help}</p>
                                ) : null}
                            </div>
                        ),
                    )}
                </dl>

                {nestedColumns.length > 0 ? (
                    <div className="mt-3 border-t border-[var(--becpg-grey)] pt-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={expanded ? 'expand_less' : 'expand_more'}
                            onClick={() => setExpanded((value) => !value)}
                            aria-expanded={expanded}
                            fullWidth
                        >
                            {expanded ? label('collapse') : label('expand')}
                        </Button>
                        {expanded ? (
                            <div className="mt-2 flex flex-col gap-2">
                                {nestedColumns.map((column) => (
                                    <NestedSection
                                        key={column.formsName}
                                        row={row}
                                        column={column}
                                        list={list}
                                    />
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {status.state !== ROW_STATUS.IDLE || dirty ? (
                    <footer className="mt-3 flex items-center justify-end gap-2 border-t border-[var(--becpg-grey)] pt-2">
                        <RowStatus row={row} list={list} />
                    </footer>
                ) : null}
            </section>
        </motion.div>
    );
}
