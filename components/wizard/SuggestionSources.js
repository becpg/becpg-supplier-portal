'use client';

/**
 * Where a suggestion comes from, and what to do when two documents disagree.
 *
 * A value read from a document is only checkable if the document is named: its
 * name, version and date sit under the suggestion. When two deposited documents
 * give two values for one field — the technical sheet says « absent », the
 * allergen statement « may contain » — the AI does not choose: each value is
 * shown with its document, and the reader applies the one that is right.
 */

import { useState } from 'react';
import { Button, Icon } from '@/components/ui/Button';
import { DateText } from '@/components/ui/DateText';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/wizard/SuggestionSources#LABELS', {
    fr: {
        source: 'Source',
        conflict: 'Les documents ne donnent pas la même valeur',
        choose: 'Appliquer ce choix',
        version: 'v{version}',
    },
    en: {
        source: 'Source',
        conflict: 'The documents do not give the same value',
        choose: 'Apply this choice',
        version: 'v{version}',
    },
});

function SourceLabel({ source, labels, lang }) {
    return (
        <span className="inline-flex flex-wrap items-center gap-1">
            <Icon name="description" size={13} className="text-[var(--becpg-blue)]" />
            <span className="font-medium">{source.name || source.documentType || source.documentId}</span>
            {source.version ? <span>{labels.version.replace('{version}', source.version)}</span> : null}
            {source.date ? <DateText value={source.date} lang={lang} /> : null}
        </span>
    );
}

/**
 * @param {Object} props
 * @param {Object[]} props.sources `suggestion.sources`
 */
export function SourceChips({ sources }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    if (!sources?.length) {
        return null;
    }
    return (
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--becpg-dark-grey)]">
            <span className="sr-only-text">{labels.source}</span>
            {sources.map((source) => <SourceLabel key={source.documentId} source={source} labels={labels} lang={lang} />)}
        </p>
    );
}

function ConflictChoice({ conflict, readOnly, labels, lang, onChoose }) {
    const [chosen, setChosen] = useState(0);
    const name = `conflict-${conflict.name}-${conflict.row?.label || ''}`;
    return (
        <fieldset className="rounded-lg border border-[var(--status-warn-border)] bg-[var(--status-warn-bg)] p-2.5">
            <legend className="px-1 text-xs font-medium text-[var(--status-warn)]">
                <Icon name="compare_arrows" size={14} className="me-1 align-[-2px]" />
                {[conflict.row?.label, conflict.label || conflict.name].filter(Boolean).join(' › ')}
            </legend>
            <ul className="flex flex-col gap-1.5">
                {conflict.candidates.map((candidate, index) => (
                    <li key={candidate.source.documentId}>
                        <label className="flex cursor-pointer items-start gap-2 text-sm">
                            <input type="radio" name={name} checked={chosen === index} onChange={() => setChosen(index)} disabled={readOnly} className="mt-1" />
                            <span className="min-w-0">
                                <span className="font-semibold text-[var(--becpg-ink)]">{candidate.displayValue ?? String(candidate.value ?? '')}</span>
                                <span className="block text-xs text-[var(--becpg-dark-grey)]"><SourceLabel source={candidate.source} labels={labels} lang={lang} /></span>
                            </span>
                        </label>
                    </li>
                ))}
            </ul>
            {readOnly ? null : (
                <Button size="sm" variant="outline" icon="check" className="mt-2" onClick={() => onChoose(conflict.candidates[chosen])}>
                    {labels.choose}
                </Button>
            )}
        </fieldset>
    );
}

/**
 * @param {Object} props
 * @param {Object[]} props.conflicts `suggestion.conflicts`
 * @param {boolean} [props.readOnly]
 * @param {Function} props.onChoose `(candidate) => void` applies `candidate.suggestedChanges`
 */
export function ConflictChoices({ conflicts, readOnly = false, onChoose }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    if (!conflicts?.length) {
        return null;
    }
    return (
        <div className="mt-2 flex flex-col gap-2">
            <p className="text-xs text-[var(--becpg-dark-grey)]">{labels.conflict}</p>
            {conflicts.map((conflict) => (
                <ConflictChoice
                    key={`${conflict.name}-${conflict.row?.label || ''}`}
                    conflict={conflict}
                    readOnly={readOnly}
                    labels={labels}
                    lang={lang}
                    onChoose={onChoose}
                />
            ))}
        </div>
    );
}
