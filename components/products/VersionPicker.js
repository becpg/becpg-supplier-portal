'use client';

/**
 * The version of a product, as a drop-down of its history — Share's version
 * selector. Picking an older version opens the sheet on it, read-only; the
 * current one brings the sheet back.
 *
 * The history is read when the list is first opened, not with the sheet.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon, Spinner } from '@/components/ui/Button';
import { useApi } from '@/lib/client';
import { formatDateTime } from '@/lib/format';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/products/VersionPicker#LABELS', {
    fr: {
        open: 'Versions de la fiche',
        current: 'actuelle',
        failed: 'L’historique n’a pas pu être lu.',
        none: 'Aucune version antérieure',
        by: 'par {author}',
    },
    en: {
        open: 'Sheet versions',
        current: 'current',
        failed: 'The history could not be read.',
        none: 'No earlier version',
        by: 'by {author}',
    },
});

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) => (vars[key] ?? match));
}

/** Closes the list on a click outside it or on Escape. */
function useDismiss(ref, open, close) {
    useEffect(() => {
        if (!open) {
            return undefined;
        }
        const onPointer = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                close();
            }
        };
        const onKey = (event) => {
            if (event.key === 'Escape') {
                close();
            }
        };
        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [ref, open, close]);
}

/**
 * @param {Object} props
 * @param {string} props.entityId the entity uuid / nodeRef of the API paths
 * @param {string|null} props.label the version shown (the selected one, or the entity's)
 * @param {string|null} props.selected the nodeRef of the version being consulted, null for the current one
 * @param {Function} props.onSelect `(versionNodeRef|null) => void`
 */
export function VersionPicker({ entityId, label, selected, onSelect }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const [open, setOpen] = useState(false);
    const [requested, setRequested] = useState(false);
    const root = useRef(null);
    const listId = useId();
    const history = useApi(requested ? `entities/${encodeURIComponent(entityId)}/versions` : null);
    const versions = history.data?.versions || [];
    const close = useCallback(() => setOpen(false), []);
    useDismiss(root, open, close);

    const toggle = () => {
        setRequested(true);
        setOpen((value) => !value);
    };
    const pick = (version) => {
        setOpen(false);
        onSelect(version.current ? null : version.nodeRef);
    };

    return (
        <span ref={root} className="relative inline-block">
            <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-controls={listId}
                aria-label={`${labels.open} (${label || '—'})`}
                className="inline-flex items-center gap-0.5 rounded font-medium text-[var(--becpg-blue)] hover:underline"
            >
                {label || '—'}
                <Icon name={open ? 'expand_less' : 'expand_more'} size={16} />
            </button>
            {open ? (
                <div
                    id={listId}
                    className="absolute start-0 top-full z-40 mt-1 w-72 max-w-[80vw] rounded-xl border border-[var(--becpg-line)] bg-white p-1 shadow-[var(--becpg-shadow-overlay)]"
                >
                    {history.loading ? (
                        <p className="flex justify-center p-3"><Spinner size={16} /></p>
                    ) : history.error ? (
                        <p className="p-3 text-xs text-[var(--status-danger)]">{labels.failed}</p>
                    ) : versions.length <= 1 ? (
                        <p className="p-3 text-xs text-[var(--becpg-muted)]">{labels.none}</p>
                    ) : (
                        <ul className="max-h-72 overflow-y-auto">
                            {versions.map((version) => {
                                const active = selected ? selected === version.nodeRef : version.current;
                                return (
                                    <li key={version.nodeRef}>
                                        <button
                                            type="button"
                                            onClick={() => pick(version)}
                                            aria-current={active ? 'true' : undefined}
                                            className={`flex w-full flex-col items-start rounded-lg px-3 py-2 text-start text-xs hover:bg-[var(--becpg-teal-wash)] ${active ? 'bg-[var(--becpg-grey)]' : ''}`}
                                        >
                                            <span className="flex items-center gap-1.5 text-sm">
                                                <span className="font-semibold tabular-nums">{version.label}</span>
                                                {version.current ? (
                                                    <span className="pill pill-sm pill-no-dot pill-ok">{labels.current}</span>
                                                ) : null}
                                                {active ? <Icon name="check" size={14} className="text-[var(--becpg-teal)]" /> : null}
                                            </span>
                                            <span className="text-[var(--becpg-muted)]">
                                                {[
                                                    version.createdAt ? formatDateTime(version.createdAt, lang) : null,
                                                    version.author ? fill(labels.by, { author: version.author }) : null,
                                                ].filter(Boolean).join(' · ')}
                                            </span>
                                            {version.comment ? (
                                                <span className="mt-0.5 italic text-[var(--becpg-ink)]">{version.comment}</span>
                                            ) : null}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            ) : null}
        </span>
    );
}
