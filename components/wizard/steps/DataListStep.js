'use client';

/**
 * An `entityDataList` step — ingredients, nutrients, allergens, claims…
 *
 * The grid itself is `components/datalist/DataListEditor`, which already owns
 * everything hard about a datalist: the columns resolved by Share, the per-row
 * autosave, the frozen state, the mobile card layout. This file is deliberately
 * thin and adds only what belongs to the *wizard*:
 *
 * - the step's `readOnly` / `frozen` verdict, forwarded verbatim from the single
 *   server-side security call (bug #25928) — `DataListEditor` never relaxes it,
 *   it only ever adds to it;
 * - the saved timestamp, pushed into the wizard's one autosave indicator, so a
 *   grid step and a form step say "enregistré à HH:MM" the same way;
 * - **row-level comment anchors** (spec §4.4): the rows are published to the
 *   discussion panel, which can then hang a message on *one row* rather than on
 *   the task.
 *
 * The `list` instance is created here rather than inside the editor precisely so
 * those rows can be published; the editor accepts an external instance for that
 * reason.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ListIcon } from '@/components/ui/ListIcon';
import { DataListEditor } from '@/components/datalist/DataListEditor';
import { useDataList } from '@/components/datalist/useDataList';
import { useToast } from '@/components/providers/ToastProvider';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: { discuss: 'Discussion', row: 'Ligne {index}' },
    en: { discuss: 'Discussion', row: 'Row {index}' },
};

/**
 * Builds the labels the discussion panel shows in its "sujet" selector: the
 * first readable cell of each row, which is what a human calls that row.
 *
 * @param {Object} list a `useDataList` instance
 * @param {string} rowLabel `'Ligne {index}'`
 * @returns {Array<{nodeRef: string, label: string}>}
 */
function commentTargetsOf(list, rowLabel) {
    const columns = (list.columns || []).filter((column) => column.type === 'property' || column.type === 'association');
    return (list.rows || [])
        .filter((row) => row.nodeRef && !row.draft)
        .map((row, index) => {
            let label = '';
            for (const column of columns) {
                const value = list.displayOf(row, column);
                if (value) {
                    label = value;
                    break;
                }
            }
            return {
                nodeRef: row.nodeRef,
                label: label || rowLabel.replace('{index}', index + 1),
            };
        });
}

/**
 * @param {Object} props
 * @param {string} props.entityId entity nodeRef
 * @param {Object} props.step the computed step (`readOnly` / `frozen` included)
 * @param {Object} [props.params] `wizardId`, `siteId`, `locale`
 * @param {Object} props.autoSave the wizard's `useAutoSave` instance
 * @param {number} [props.reloadNonce] bumped by the wizard when something wrote
 *        into the entity from outside the grid — an applied AI suggestion
 * @param {Function} [props.onComment] `({ nodeRef, label }) => void`
 * @param {Function} [props.onCommentTargets] `(targets) => void` — publishes the rows
 * @param {Function} [props.onDirty] called when the grid holds unsaved rows
 * @param {string} [props.className]
 */
export function DataListStep({
    entityId,
    step,
    params,
    autoSave,
    reloadNonce = 0,
    onComment,
    onCommentTargets,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const toast = useToast();

    const handleSaved = useCallback(
        (result) => {
            if (autoSave) {
                autoSave.markSaved(result && result.savedAt ? result.savedAt : undefined);
            }
        },
        [autoSave],
    );

    // The grid writes on its own. The wizard needs both halves: that a write
    // left — so leaving the step formulates what was typed — and when it lands,
    // so the formulation bears on the row and not on the sheet as it was before
    // it.
    const handleWriting = useCallback(
        (inFlight) => {
            if (autoSave) {
                autoSave.markWriting(inFlight);
            }
        },
        [autoSave],
    );

    const handleError = useCallback(
        (error) => {
            if (autoSave) {
                autoSave.markError(error);
            }
            toast.error(error);
        },
        [autoSave, toast],
    );

    const list = useDataList({
        entityId,
        stepId: step.id,
        params,
        // The server verdict is the floor, never the ceiling: a step the wizard
        // says is read-only stays read-only whatever the grid thinks.
        readOnly: Boolean(step.readOnly),
        onSaved: handleSaved,
        onWriting: handleWriting,
        onError: handleError,
    });

    /*
     * An extraction applied to this list — nutrients read off a sheet — writes
     * rows the grid knows nothing about. Silent: the rows already on screen stay
     * put while the page is read again.
     */
    const refreshList = list.refresh;
    const seenReload = useRef(reloadNonce);
    useEffect(() => {
        if (seenReload.current === reloadNonce) {
            return;
        }
        seenReload.current = reloadNonce;
        refreshList({ silent: true });
    }, [reloadNonce, refreshList]);

    const targets = useMemo(() => commentTargetsOf(list, labels.row), [list, labels.row]);

    // Published only when the set of rows actually changed: `onCommentTargets`
    // lives in the wizard's state and an unconditional call would loop.
    const publishedRef = useRef('');
    useEffect(() => {
        if (!onCommentTargets) {
            return;
        }
        const signature = targets.map((target) => `${target.nodeRef}|${target.label}`).join('\n');
        if (signature === publishedRef.current) {
            return;
        }
        publishedRef.current = signature;
        onCommentTargets(targets);
    }, [targets, onCommentTargets]);

    return (
        <DataListEditor
            entityId={entityId}
            stepId={step.id}
            params={params}
            list={list}
            // beCPG's own glyph for this characteristic list, next to the name
            // it gave the step — the same picture the product sheet's tab bar
            // and section headers use.
            title={
                <span className="inline-flex items-center gap-2">
                    <ListIcon type={step.listName || step.listId || step.type} size={18} />
                    {step.title || step.label}
                </span>
            }
            description={step.title && step.label !== step.title ? step.label : undefined}
            className={className}
            actions={
                onComment ? (
                    <Button
                        variant="outline"
                        size="sm"
                        icon="forum"
                        onClick={() =>
                            onComment({
                                nodeRef: list.listNodeRef || entityId,
                                label: step.label,
                            })
                        }
                    >
                        {labels.discuss}
                    </Button>
                ) : null
            }
        />
    );
}
