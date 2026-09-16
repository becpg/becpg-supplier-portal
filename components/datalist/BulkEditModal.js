'use client';

/**
 * Setting ONE column on EVERY selected row, in one gesture.
 *
 * ## Why it exists
 *
 * A supplier who knows a product carries no allergen has fourteen rows to say
 * « non » in, one cell at a time, and the grid gives him no way to say it once
 * (recette du 15/09). The same shape covers « aucune origine biologique », « pas
 * de présence fortuite », a unit repeated down a nutrient list: a column whose
 * value is the same for the whole selection.
 *
 * ## What it deliberately does NOT do
 *
 * **One column at a time.** A box offering the whole row would be the row editor
 * applied to many rows, and the values a supplier wants to spread are never a
 * whole row — they are the one field he can answer for all of them at once.
 *
 * **It writes through the grid's own path**, `saveRowValues`, so every rule the
 * grid already enforces still holds: a protected column stays locked, a frozen
 * list refuses, a mandatory column still blocks a draft, and a refusal rolls its
 * row back on its own. Nothing here re-implements a write.
 *
 * **Row by row, and it says so.** beCPG has no bulk write for datalist items:
 * the honest thing is one request per row with a live count, not a progress bar
 * over a single call that does not exist. Failures are counted and named rather
 * than collapsed into "ça n'a pas marché" — a selection of thirty rows where two
 * are refused must say which two.
 */

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Select } from '@/components/ui/Field';
import { FieldRenderer } from '@/components/form/FieldRenderer';
import { isNestedColumn, useDataListLabels } from '@/components/datalist/useDataList';
import { useMessages } from '@/lib/messages';

/**
 * The columns this box may set.
 *
 * A protected column is excluded on purpose: it takes a per-cell confirmation
 * (spec §6, point 6), and honouring that one row at a time inside a bulk gesture
 * would either bypass the confirmation or ask for it thirty times.
 *
 * @param {Object[]} columns the grid's normalised columns
 * @returns {Object[]}
 */
export function bulkEditableColumns(columns) {
    return (columns || []).filter((column) => (
        !column.readOnly && !column.protectedField && !isNestedColumn(column)
    ));
}

/**
 * @param {Object} props
 * @param {Object} props.list the `useDataList` instance
 * @param {Object[]} props.rows the selected rows
 * @param {Function} props.onClose `() => void`
 * @param {Function} [props.onApplied] `(result) => void`, once the writes settled
 * @returns {JSX.Element|null}
 */
export function BulkEditModal({ list, rows, onClose, onApplied }) {
    const { lang } = useMessages();
    const label = useDataListLabels();

    const columns = useMemo(() => bulkEditableColumns(list.columns), [list.columns]);
    const [columnName, setColumnName] = useState(() => (columns[0] ? columns[0].name : ''));
    const [value, setValue] = useState(null);
    const [applying, setApplying] = useState(false);
    const [done, setDone] = useState(0);
    const [failures, setFailures] = useState([]);

    const column = useMemo(
        () => columns.find((candidate) => candidate.name === columnName) || null,
        [columns, columnName],
    );

    // The rows a write can actually land on. A selection may hold a row the grid
    // refuses to edit — a computed total, a line whose characteristic the account
    // may not read — and counting it in would promise a write that never happens.
    const targets = useMemo(
        () => (rows || []).filter((row) => list.canEditRow(row)),
        [rows, list],
    );
    const skipped = (rows || []).length - targets.length;

    const pickColumn = useCallback((next) => {
        setColumnName(next);
        // The value belongs to the column that was chosen, never to the next one:
        // a boolean left over from « Est maîtrisé » must not be applied to a text
        // column because the box was reused without closing it.
        setValue(null);
        setFailures([]);
        setDone(0);
    }, []);

    const apply = useCallback(async () => {
        if (!column || targets.length === 0) {
            return;
        }
        setApplying(true);
        setFailures([]);
        setDone(0);

        const refused = [];
        for (const row of targets) {
            try {
                const saved = await list.saveRowValues(row, { [column.name]: value });
                if (!saved) {
                    // A held-back write, not an exception: `commitRow` answers null
                    // when it declines (a mandatory column still empty on a draft).
                    refused.push(row);
                }
            }
            catch {
                // The row carries its own error state, set by `commitRow`; what is
                // owed here is the count, so the supplier knows the gesture was
                // partial rather than reading a silent success.
                refused.push(row);
            }
            setDone((current) => current + 1);
        }

        setApplying(false);
        setFailures(refused);
        if (refused.length === 0) {
            onClose();
            if (onApplied) {
                onApplied({ applied: targets.length });
            }
        }
    }, [column, targets, value, list, onClose, onApplied]);

    if (columns.length === 0) {
        return (
            <Modal open onClose={onClose} title={label('bulkEditTitle', { count: (rows || []).length })} size="md">
                <p className="text-sm text-[var(--becpg-dark-grey)]">{label('bulkEditNoColumn')}</p>
            </Modal>
        );
    }

    return (
        <Modal
            open
            onClose={applying ? () => {} : onClose}
            title={label('bulkEditTitle', { count: targets.length })}
            description={label('bulkEditDescription')}
            size="md"
            footer={(
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={applying}>
                        {label('bulkEditCancel')}
                    </Button>
                    <Button
                        variant="primary"
                        icon="edit"
                        loading={applying}
                        disabled={!column || targets.length === 0}
                        onClick={apply}
                    >
                        {applying
                            ? label('bulkEditProgress', { done, total: targets.length })
                            : label('bulkEditApply', { count: targets.length })}
                    </Button>
                </div>
            )}
        >
            <div className="flex flex-col gap-4">
                <Field label={label('bulkEditColumn')} id="bulk-edit-column">
                    <Select
                        id="bulk-edit-column"
                        value={columnName}
                        onChange={(event) => pickColumn(event.target.value)}
                        disabled={applying}
                    >
                        {columns.map((candidate) => (
                            <option key={candidate.name} value={candidate.name}>
                                {candidate.label || candidate.name}
                            </option>
                        ))}
                    </Select>
                </Field>

                {column ? (
                    <FieldRenderer
                        field={column}
                        value={value}
                        onChange={(next) => setValue(next)}
                        readOnly={applying}
                        lang={lang}
                        formId={list.step?.formId || undefined}
                        itemType={list.itemType}
                        listId={list.step?.listId || undefined}
                        entityNodeRef={list.step?.entityNodeRef || undefined}
                    />
                ) : null}

                {/* Said before the click, not after: a selection that holds rows
                    the grid will not write is the supplier's to know about. */}
                {skipped > 0 ? (
                    <p className="text-xs text-[var(--becpg-dark-grey)]">
                        {label('bulkEditSkipped', { count: skipped })}
                    </p>
                ) : null}

                {failures.length > 0 ? (
                    <p role="alert" className="text-sm text-[var(--status-danger)]">
                        {label('bulkEditFailed', { count: failures.length, total: targets.length })}
                    </p>
                ) : null}
            </div>
        </Modal>
    );
}
