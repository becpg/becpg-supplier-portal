'use client';

/**
 * A `survey` step — the customer's questionnaire.
 *
 * A survey **is** a datalist (`survey:surveyList`, contracts §8): same endpoint,
 * same columns, same rows, same autosave. Only the *presentation* differs, and
 * it differs for a good reason: a questionnaire read as a nine-column grid is
 * unanswerable, on a phone and on a laptop alike. So this step reuses the exact
 * same state (`useDataList`) and the exact same cells (`DataListCardRow`) as the
 * grid, and simply renders every row as a card, at every width — the card layout
 * the editor keeps for phones is the right one for a questionnaire everywhere.
 *
 * Nothing about any particular questionnaire is written here. Which questions
 * exist, in which order, with which controls, comes from the columns Share
 * resolved; Aryzta's several instances of the same list (`surveyList@1`,
 * spec §2ter.1) are just different `listId`s and need no code.
 */

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/Modal';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { DataListCardRow } from '@/components/datalist/DataListCardRow';
import { DataListToolbar, ReadOnlyNotice } from '@/components/datalist/DataListToolbar';
import { isNestedColumn, useDataList, useDataListLabels } from '@/components/datalist/useDataList';
import { useToast } from '@/components/providers/ToastProvider';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        discuss: 'Discussion',
        answered: '{answered} réponse(s) sur {total}',
        empty: 'Aucune question',
        emptyHint: 'Votre client n’a pas encore publié de questionnaire pour cette fiche.',
    },
    en: {
        discuss: 'Discussion',
        answered: '{answered} of {total} answered',
        empty: 'No question',
        emptyHint: 'Your customer has not published a questionnaire for this sheet yet.',
    },
};

/** Surveys are short and read top to bottom: one page, no pager. */
const SURVEY_PAGE_SIZE = 200;

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])),
    );
}

/**
 * @param {Object} props
 * @param {string} props.entityId entity nodeRef
 * @param {Object} props.step the computed step (`readOnly` / `frozen` included)
 * @param {Object} [props.params] `wizardId`, `siteId`, `locale`
 * @param {Object} props.autoSave the wizard's `useAutoSave` instance
 * @param {Function} [props.onComment] `({ nodeRef, label }) => void`
 * @param {string} [props.className]
 */
export function SurveyStep({ entityId, step, params, autoSave, onComment, className = '' }) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const gridLabel = useDataListLabels();
    const toast = useToast();
    const [pendingDelete, setPendingDelete] = useState(null);

    const list = useDataList({
        entityId,
        stepId: step.id,
        params,
        pageSize: SURVEY_PAGE_SIZE,
        readOnly: Boolean(step.readOnly),
        onSaved: (result) => {
            if (autoSave) {
                autoSave.markSaved(result && result.savedAt ? result.savedAt : undefined);
            }
        },
        onError: (error) => {
            if (autoSave) {
                autoSave.markError(error);
            }
            toast.error(error);
        },
    });

    const [flatColumns, nestedColumns] = useMemo(() => {
        const flat = [];
        const nested = [];
        for (const column of list.columns || []) {
            (isNestedColumn(column) ? nested : flat).push(column);
        }
        return [flat, nested];
    }, [list.columns]);

    // "12 réponses sur 18" — a questionnaire without a progress count is a
    // questionnaire nobody knows how far they are into.
    //
    // Two things this must NOT count, both measured on 26.1.0 as reading
    // "12 réponse(s) sur 12" on a questionnaire where nothing had been answered:
    //
    //  1. **the first column.** In every beCPG datalist the first column carries
    //     the row's identity — here the question — and `DataListCardRow` already
    //     treats it as such (it is the card's headline). A question is always
    //     filled: counting it makes every row answered by construction.
    //  2. **an empty association.** `survey:slChoices` with nothing selected
    //     arrives as `[]`, which is neither null nor `''` and passed the test.
    const answered = useMemo(() => {
        const [, ...answerColumns] = flatColumns;
        const editable = answerColumns.filter((column) => !column.readOnly);
        if (editable.length === 0) {
            return null;
        }
        return (list.rows || []).filter((row) =>
            editable.some((column) => {
                const value = list.valueOf(row, column);
                if (Array.isArray(value)) {
                    return value.length > 0;
                }
                return value !== null && value !== undefined && value !== '';
            }),
        ).length;
    }, [list, flatColumns]);

    if (list.error && (list.rows || []).length === 0) {
        return <ErrorState error={list.error} onRetry={() => list.refresh()} />;
    }
    if (list.loading && (list.rows || []).length === 0) {
        return (
            <div className={`flex flex-col gap-3 ${className}`}>
                <SkeletonCard lines={3} />
                <SkeletonCard lines={3} />
                <SkeletonCard lines={3} />
            </div>
        );
    }

    const rows = list.rows || [];

    return (
        <div className={`min-w-0 ${className}`}>
            <DataListToolbar
                list={list}
                title={step.title || step.label}
                description={
                    answered === null || rows.length === 0
                        ? undefined
                        : fill(labels.answered, { answered, total: rows.length })
                }
                onAdd={list.canCreate ? () => list.addRow() : undefined}
                actions={
                    onComment ? (
                        <Button
                            variant="outline"
                            size="sm"
                            icon="forum"
                            onClick={() => onComment({ nodeRef: list.listNodeRef || entityId, label: step.label })}
                        >
                            {labels.discuss}
                        </Button>
                    ) : null
                }
            />

            {list.readOnly ? <ReadOnlyNotice reason={list.readOnlyReason} /> : null}

            {rows.length === 0 ? (
                <EmptyState
                    variant="empty"
                    icon="quiz"
                    title={labels.empty}
                    message={list.canCreate ? gridLabel('emptyHint') : labels.emptyHint}
                    action={
                        list.canCreate ? (
                            <Button variant="primary" icon="add" onClick={() => list.addRow()}>
                                {gridLabel('addRow')}
                            </Button>
                        ) : null
                    }
                />
            ) : (
                <div className="flex flex-col gap-2">
                    {rows.map((row, index) => (
                        <DataListCardRow
                            key={row.key}
                            row={row}
                            index={index + 1}
                            columns={flatColumns}
                            nestedColumns={nestedColumns}
                            list={list}
                            context={{
                                entityNodeRef: entityId,
                                itemType: list.itemType,
                                formId: list.step?.formId || null,
                            }}
                            onDelete={setPendingDelete}
                            showOrder={false}
                        />
                    ))}
                </div>
            )}

            <ConfirmModal
                open={Boolean(pendingDelete)}
                onClose={() => setPendingDelete(null)}
                onConfirm={async () => {
                    const row = pendingDelete;
                    setPendingDelete(null);
                    if (row) {
                        await list.deleteRow(row);
                    }
                }}
                title={gridLabel('deleteTitle')}
                message={gridLabel('deleteText')}
                tone="danger"
            />
        </div>
    );
}
