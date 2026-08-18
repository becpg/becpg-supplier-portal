'use client';

/**
 * Editing one row on the item's own form, not on the grid's columns.
 *
 * ## Why this exists
 *
 * The grid renders the **datagrid** form: the columns a customer chose to show
 * in a table. Some fields deliberately do not appear there and are edited in
 * Share through the row pop-up, whose fields come from the item's **default**
 * form — the parent of an ingredient (`bcpg:parentLevel`) above all, which a
 * supplier had no way of setting at all, in any screen of the portal.
 *
 * So this is the same surface Share has, driven by the same server-supplied
 * definition. Nothing here names a field: when beCPG sends no default form
 * (`rowForm === null`), the editor is simply not offered and the grid is exactly
 * what it was.
 *
 * ## What it writes
 *
 * `list.saveRowValues(row, values)` — the grid's own write path, so the
 * optimistic display, the rollback on refusal and the per-row status are the
 * ones every other write already goes through.
 */

import { useCallback, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormRenderer } from '@/components/form/FormRenderer';
import { useFormState } from '@/components/form/useFormState';
import { useMessages } from '@/lib/messages';

/** Escape must find something to call, even while the write is in flight. */
const NOOP = () => {};

const LABELS = {
    fr: {
        title: 'Modifier la ligne',
        create: 'Nouvelle ligne',
        save: 'Enregistrer',
        cancel: 'Annuler',
        description: 'Les champs que la grille n’affiche pas se saisissent ici.',
        refused: 'La ligne n’a pas été enregistrée. Vérifiez les champs obligatoires, puis réessayez.',
    },
    en: {
        title: 'Edit the row',
        create: 'New row',
        save: 'Save',
        cancel: 'Cancel',
        description: 'The fields the grid does not show are entered here.',
        refused: 'The row was not saved. Check the mandatory fields, then try again.',
    },
};

/**
 * @param {Object} props
 * @param {Object} props.list the `useDataList` instance
 * @param {Object} props.row the row being edited — a draft has `draft: true`
 * @param {Object} props.rowForm the normalised default form of the list item
 * @param {string} [props.entityNodeRef] context for the pickers
 * @param {Function} props.onClose `() => void`
 */
export function RowFormModal({ list, row, rowForm, entityNodeRef, onClose }) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // `row.values` is keyed by `formsName`; `seedValues` looks a field up under
    // its name, its `formsName` and its id, so the row seeds the form as it is.
    const initialValues = useMemo(() => row?.values || {}, [row]);
    const form = useFormState({
        definition: rowForm,
        initialValues,
        lang,
        validateOnChange: true,
    });

    const submit = useCallback(async () => {
        // `validate()` answers `{ valid, errors }`, never a boolean: testing the
        // object itself is always true, and the box would submit an invalid row
        // while painting its fields red.
        if (!form.validate().valid) {
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const saved = await list.saveRowValues(row, form.changes());
            if (!saved) {
                // The write was refused, or held back because a mandatory column
                // is still empty. Closing here would claim a save that did not
                // happen — the row status says which, beside the row.
                setError(new Error(labels.refused));
                return;
            }
            onClose();
        }
        catch (caught) {
            // Kept on the modal rather than thrown: the supplier is looking at
            // the values that failed, and closing the box would take them away.
            setError(caught);
        }
        finally {
            setSaving(false);
        }
    }, [form, list, row, onClose, labels]);

    return (
        <Modal
            open
            // A no-op rather than `undefined`: Escape calls it unconditionally.
            onClose={saving ? NOOP : onClose}
            title={row?.draft ? labels.create : labels.title}
            description={labels.description}
            size="lg"
            footer={(
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        {labels.cancel}
                    </Button>
                    <Button variant="primary" icon="save" loading={saving} onClick={submit}>
                        {labels.save}
                    </Button>
                </div>
            )}
        >
            <FormRenderer
                definition={rowForm}
                values={form.values}
                onChange={form.setValue}
                onSubmit={submit}
                errors={form.errors}
                entityNodeRef={entityNodeRef}
                itemType={list.itemType}
                lang={lang}
            />
            {error ? (
                <p role="alert" className="mt-3 text-sm text-[var(--status-danger)]">
                    {error.message}
                </p>
            ) : null}
        </Modal>
    );
}
