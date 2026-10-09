'use client';

/**
 * What changed in one section of a sheet under review, against the reference the
 * customer last validated: the properties of a form step, the rows of a list.
 * The old value is struck through beside the new one, and each change can be
 * flagged into the feedback sent to the supplier.
 */

import { useMemo, useState } from 'react';
import { Button, Icon } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useApi } from '@/lib/client';
import { parseListId } from '@/config/wizards.default';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/review/ReviewChanges#LABELS', {
    fr: {
        title: '{count} changement(s) depuis la référence',
        none: 'Aucun changement depuis la référence',
        added: 'Ajoutée',
        removed: 'Retirée',
        empty: 'vide',
        flag: 'Signaler',
        flagged: 'Signalé',
        flagText: 'à vérifier ({before} → {after})',
        addedText: 'ligne ajoutée, à vérifier',
        removedText: 'ligne retirée, à vérifier',
        show: 'Voir les changements',
        hide: 'Masquer les changements',
    },
    en: {
        title: '{count} change(s) since the reference',
        none: 'No change since the reference',
        added: 'Added',
        removed: 'Removed',
        empty: 'empty',
        flag: 'Flag',
        flagged: 'Flagged',
        flagText: 'to check ({before} → {after})',
        addedText: 'row added, to check',
        removedText: 'row removed, to check',
        show: 'Show the changes',
        hide: 'Hide the changes',
    },
});

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) => (vars[key] ?? match));
}

/** The local name of a list type: `bcpg:nutList`, `nutList` and `bcpg:nutList|nutList@1` give `nutList`. */
function localName(type) {
    return String(type || '').split('|')[0].split(':').pop();
}

/**
 * The changes of one step in a review diff.
 *
 * @param {Object|null} diff the `/review-diff` payload
 * @param {Object|null} step a wizard step; `null` for a section that is not one
 * @returns {{kind: 'properties'|'list'|null, properties: Object[], list: Object|null, count: number}}
 */
export function changesOfStep(diff, step) {
    if (!diff || !step) {
        return { kind: null, properties: [], list: null, count: 0 };
    }
    if (step.type === 'form') {
        const properties = diff.properties || [];
        return { kind: 'properties', properties, list: null, count: properties.length };
    }
    const name = parseListId(step.listId).name || step.listName;
    const list = name ? (diff.lists || []).find((entry) => localName(entry.type) === name) || null : null;
    const count = list ? list.added.length + list.removed.length + list.changed.length : 0;
    return { kind: 'list', properties: [], list, count };
}

function Value({ before, after, labels }) {
    return (
        <span className="inline-flex flex-wrap items-baseline gap-1.5 tabular-nums">
            <span className="rounded bg-[var(--status-danger-bg)] px-1 text-xs text-[var(--status-danger)] line-through">{before ?? labels.empty}</span>
            <Icon name="arrow_forward" size={13} className="text-[var(--becpg-muted)]" />
            <span className="rounded bg-[var(--status-ok-bg)] px-1 text-[var(--status-ok)]">{after ?? labels.empty}</span>
        </span>
    );
}

function FlagButton({ onFlag, labels }) {
    const [flagged, setFlagged] = useState(false);
    if (!onFlag) {
        return null;
    }
    return (
        <Button
            variant="outline"
            size="sm"
            icon={flagged ? 'check' : 'flag'}
            disabled={flagged}
            onClick={() => { onFlag(); setFlagged(true); }}
        >
            {flagged ? labels.flagged : labels.flag}
        </Button>
    );
}

/**
 * The labels the step itself shows for its fields or columns, by qname — the
 * same request the section's own panel makes, so they are read once. The
 * dictionary label of the diff stays the fallback.
 *
 * @param {string} entityId
 * @param {Object|null} step
 * @param {Object} params
 * @returns {Object.<string, string>}
 */
export function useStepLabels(entityId, step, params) {
    const data = useApi(entityId && step ? `wizard/${encodeURIComponent(entityId)}/step/${encodeURIComponent(step.id)}` : null, { params });
    return useMemo(() => {
        const payload = data.data || {};
        const fields = [
            ...((payload.definition && payload.definition.fields) || []),
            ...(payload.columns || []),
        ];
        return Object.fromEntries(fields.filter((field) => field?.name && field.label).map((field) => [field.name, field.label]));
    }, [data.data]);
}

/**
 * @param {Object} props
 * @param {Object} props.changes {@link changesOfStep}
 * @param {boolean} [props.loading]
 * @param {Function|null} [props.onFlag] `(where, text) => void` — null when the task is closed
 * @param {Object.<string, string>} [props.fieldLabels] {@link useStepLabels}
 */
export function ReviewChanges({ changes, loading = false, onFlag = null, fieldLabels = {} }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const nameOf = (field) => fieldLabels[field.name] || field.label || field.name;
    const [open, setOpen] = useState(true);

    if (loading) {
        return <Skeleton height={44} radius="0.75rem" />;
    }
    if (!changes.kind) {
        return null;
    }
    if (changes.count === 0) {
        return (
            <p className="flex items-center gap-1.5 text-sm text-[var(--becpg-muted)]">
                <Icon name="check" size={16} className="text-[var(--status-ok)]" />
                {labels.none}
            </p>
        );
    }

    const rows = changes.kind === 'properties'
        ? changes.properties.map((field) => ({
            key: field.name,
            label: nameOf(field),
            body: <Value before={field.before} after={field.after} labels={labels} />,
            flag: () => onFlag?.(nameOf(field), fill(labels.flagText, { before: field.before ?? labels.empty, after: field.after ?? labels.empty })),
        }))
        : [
            ...changes.list.changed.map((row) => ({
                key: row.key,
                label: row.label,
                body: (
                    <span className="flex flex-col gap-1">
                        {row.fields.map((field) => (
                            <span key={field.name} className="flex flex-wrap items-baseline gap-2 text-sm">
                                <span className="text-[var(--becpg-muted)]">{nameOf(field)}</span>
                                <Value before={field.before} after={field.after} labels={labels} />
                            </span>
                        ))}
                    </span>
                ),
                flag: () => onFlag?.(row.label, row.fields
                    .map((field) => `${nameOf(field)} ${fill(labels.flagText, { before: field.before ?? labels.empty, after: field.after ?? labels.empty })}`)
                    .join(' ; ')),
            })),
            ...changes.list.added.map((row) => ({
                key: row.key,
                label: row.label,
                body: <span className="pill pill-sm pill-no-dot pill-ok"><Icon name="add" size={13} />{labels.added}</span>,
                flag: () => onFlag?.(row.label, labels.addedText),
            })),
            ...changes.list.removed.map((row) => ({
                key: row.key,
                label: row.label,
                body: <span className="pill pill-sm pill-no-dot pill-danger"><Icon name="remove" size={13} />{labels.removed}</span>,
                flag: () => onFlag?.(row.label, labels.removedText),
            })),
        ];

    return (
        <div className="rounded-xl border border-[var(--status-info-border)] bg-[var(--status-info-bg)]/40">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm font-medium text-[var(--becpg-ink)]"
            >
                <Icon name="difference" size={18} className="text-[var(--status-info)]" />
                <span className="flex-1">{fill(labels.title, { count: changes.count })}</span>
                <span className="text-xs font-normal text-[var(--becpg-muted)]">{open ? labels.hide : labels.show}</span>
                <Icon name={open ? 'expand_less' : 'expand_more'} size={18} />
            </button>
            {open ? (
                <ul className="flex flex-col border-t border-[var(--status-info-border)] bg-white">
                    {rows.map((row) => (
                        <li key={row.key} className="grid grid-cols-1 items-start gap-2 border-b border-[var(--becpg-line)] px-3 py-2 last:border-0 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]">
                            <span className="truncate text-sm font-medium" title={row.label}>{row.label}</span>
                            <span className="min-w-0">{row.body}</span>
                            <FlagButton onFlag={onFlag ? row.flag : null} labels={labels} />
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}
