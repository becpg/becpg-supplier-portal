'use client';

/**
 * « Modifier la sélection » — the same values on every selected row.
 *
 * ## Why it exists
 *
 * A supplier who knows a product carries no allergen has fourteen rows to say
 * « non » in, one cell at a time, and the grid gave him no way to say it once
 * (recette du 15/09).
 *
 * ## It is Share's gesture, deliberately
 *
 * `custom-entity-actions.js` does it in two moves and this does the same, because
 * a supplier who has seen one has seen the other:
 *
 *   1. **choose the fields** — a checkbox list of the columns that may be filled,
 *      never the whole form. Share's own comment says why: "a form holding every
 *      field of the type is unusable", and it deliberately offers no select-all;
 *   2. **fill them**, then apply.
 *
 * The write goes to `becpg/bulkedit/type/{itemType}/bulksave`, the endpoint Share
 * submits to, which applies the form to every nodeRef **in one transaction**. One
 * call, not one per row: thirty rows were thirty requests and thirty chances to
 * stop half-way, for a gesture the supplier reads as a single one.
 *
 * ## The ceiling is Share's too
 *
 * Fifty rows. Above that Share refuses and says so rather than starting; the
 * portal keeps the same number so the two behave alike, and because a form
 * applied to more rows than a supplier can check is not an edit, it is a
 * find-and-replace on somebody's product sheet.
 */

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Checkbox, SearchInput } from '@/components/ui/Field';
import { FieldRenderer } from '@/components/form/FieldRenderer';
import { isNestedColumn, isTotalRow, useDataListLabels } from '@/components/datalist/useDataList';
import { useMessages } from '@/lib/messages';

/**
 * How many rows one gesture may cover. Share's own limit
 * (`message.too.many.items`), kept identical on purpose.
 */
export const BULK_EDIT_MAX_ROWS = 50;

/**
 * The columns this box may offer.
 *
 * The same filter Share applies when it builds its field chooser
 * (`_buildFieldPickerItems`): nothing read-only, nothing protected, nothing
 * hidden, and no nested sub-list — a sub-list is rows, not a value.
 *
 * A protected column is excluded rather than locked: its unlock is a per-cell
 * confirmation (spec §6, point 6), and a gesture covering thirty rows would
 * either ask thirty times or not at all. The server refuses it too.
 *
 * @param {Object[]} columns the grid's normalised columns
 * @returns {Object[]}
 */
export function bulkEditableColumns(columns) {
    return (columns || []).filter((column) => (
        !column.readOnly
        && !column.protectedField
        && !isNestedColumn(column)
        && column.label !== 'hidden'
        && column.label !== 'datasource'
    ));
}

/**
 * @param {Object} props
 * @param {Object} props.list the `useDataList` instance
 * @param {Object[]} props.rows the selected rows
 * @param {Function} props.onClose `() => void`
 * @param {Function} [props.onApplied] `(result) => void`, once the write landed
 * @returns {JSX.Element}
 */
export function BulkEditModal({ list, rows, onClose, onApplied }) {
    const { lang } = useMessages();
    const label = useDataListLabels();

    const columns = useMemo(() => bulkEditableColumns(list.columns), [list.columns]);

    // The rows the write can land on. A selection may hold a draft, a computed
    // total or a line whose characteristic the account may not read; counting
    // those in would promise a write that never happens.
    const targets = useMemo(
        () => (rows || []).filter((row) => row && !row.draft && !isTotalRow(row) && row.nodeRef && list.canEditRow(row)),
        [rows, list],
    );
    const skipped = (rows || []).length - targets.length;
    const tooMany = targets.length > BULK_EDIT_MAX_ROWS;

    const [chosen, setChosen] = useState(() => new Set());
    const [term, setTerm] = useState('');
    const [values, setValues] = useState({});
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState(null);

    const visible = useMemo(() => {
        const needle = term.trim().toLowerCase();
        if (!needle) {
            return columns;
        }
        return columns.filter((column) => String(column.label || column.name).toLowerCase().includes(needle));
    }, [columns, term]);

    const fields = useMemo(
        () => columns.filter((column) => chosen.has(column.name)),
        [columns, chosen],
    );

    const toggle = useCallback((column, checked) => {
        setChosen((current) => {
            const next = new Set(current);
            if (checked) {
                next.add(column.name);
            }
            else {
                next.delete(column.name);
            }
            return next;
        });
        if (!checked) {
            // A field taken out of the form takes its value with it, otherwise an
            // unchecked column would still be written.
            setValues((current) => {
                const next = { ...current };
                delete next[column.name];
                return next;
            });
        }
    }, []);

    const apply = useCallback(async () => {
        if (fields.length === 0 || targets.length === 0 || tooMany) {
            return;
        }
        setApplying(true);
        setError(null);
        try {
            // Every chosen field is sent, including the ones left empty: that is
            // how a value is CLEARED on the whole selection, and the supplier who
            // ticked a column and left it blank meant exactly that.
            const payload = {};
            for (const field of fields) {
                payload[field.name] = values[field.name] ?? null;
            }
            const result = await list.bulkEdit(targets, payload);
            onClose();
            if (onApplied) {
                onApplied(result);
            }
        }
        catch (caught) {
            // Kept on the box: the supplier is looking at the values that failed,
            // and closing would take them away.
            setError(caught);
        }
        finally {
            setApplying(false);
        }
    }, [fields, targets, tooMany, values, list, onClose, onApplied]);

    return (
        <Modal
            open
            onClose={applying ? NOOP : onClose}
            title={label('bulkEditTitle', { count: targets.length })}
            description={label('bulkEditDescription')}
            size="lg"
            footer={(
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={applying}>
                        {label('bulkEditCancel')}
                    </Button>
                    <Button
                        variant="primary"
                        icon="edit"
                        loading={applying}
                        disabled={fields.length === 0 || targets.length === 0 || tooMany}
                        onClick={apply}
                    >
                        {label('bulkEditApply', { count: targets.length })}
                    </Button>
                </div>
            )}
        >
            <div className="flex flex-col gap-4">
                {tooMany ? (
                    <p role="alert" className="text-sm text-[var(--status-danger)]">
                        {label('bulkEditTooMany', { count: targets.length, max: BULK_EDIT_MAX_ROWS })}
                    </p>
                ) : null}

                {/* Step 1 — the fields. */}
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-[var(--becpg-blue)]">
                        {label('bulkEditPickFields')}
                    </p>
                    {columns.length > 8 ? (
                        <SearchInput
                            value={term}
                            onChange={setTerm}
                            placeholder={label('bulkEditSearchField')}
                        />
                    ) : null}
                    <div className="max-h-44 overflow-y-auto rounded-lg border border-[var(--becpg-grey)] p-2">
                        {visible.length === 0 ? (
                            <p className="p-1 text-sm text-[var(--becpg-dark-grey)]">
                                {label('bulkEditNoColumn')}
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                                {visible.map((column) => (
                                    <Checkbox
                                        key={column.name}
                                        id={`bulk-field-${column.formsName || column.name}`}
                                        checked={chosen.has(column.name)}
                                        onChange={(event) => toggle(column, event.target.checked)}
                                        label={column.label || column.name}
                                        disabled={applying}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Step 2 — their values, with the real controls. */}
                {fields.length > 0 ? (
                    <div className="flex flex-col gap-3 border-t border-[var(--becpg-grey)] pt-3">
                        {fields.map((field) => (
                            <FieldRenderer
                                key={field.name}
                                field={field}
                                value={values[field.name] ?? null}
                                onChange={(next) => setValues((current) => ({ ...current, [field.name]: next }))}
                                readOnly={applying}
                                values={values}
                                lang={lang}
                                formId={list.step?.formId || undefined}
                                itemType={list.itemType}
                                listId={list.step?.listId || undefined}
                                entityNodeRef={list.step?.entityNodeRef || undefined}
                            />
                        ))}
                        <p className="text-xs text-[var(--becpg-dark-grey)]">
                            {label('bulkEditEmptyClears')}
                        </p>
                    </div>
                ) : null}

                {/* Said before the click: a selection holding rows the grid will
                    not write is the supplier's to know about. */}
                {skipped > 0 ? (
                    <p className="text-xs text-[var(--becpg-dark-grey)]">
                        {label('bulkEditSkipped', { count: skipped })}
                    </p>
                ) : null}

                {error ? (
                    <p role="alert" className="text-sm text-[var(--status-danger)]">
                        {error.message}
                    </p>
                ) : null}
            </div>
        </Modal>
    );
}

/** `onClose` is called unconditionally by Escape; while applying it must do nothing. */
const NOOP = () => {};
