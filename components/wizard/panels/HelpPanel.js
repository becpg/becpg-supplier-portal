'use client';

/**
 * The context of the sheet, permanently beside the steps (spec §4.4): what the
 * customer sent back, what the AI read, what the specifications ask for.
 *
 * One column without section headings: the card is already titled « Contexte »,
 * and each block is recognisable by its own form. Refusals come first and only
 * when there are some, since a step sent back is what the supplier must treat
 * before anything else. On a phone the panel is a sheet the wizard opens on
 * demand.
 */

import { useMemo } from 'react';
import { Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SkeletonText } from '@/components/ui/Skeleton';
import { SpecPanel } from '@/components/specs/SpecPanel';
import { SuggestionsStep } from '@/components/wizard/steps/SuggestionsStep';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';
import { DateText } from '@/components/ui/DateText';

const LABELS = defineLabels('components/wizard/panels/HelpPanel#LABELS', {
    fr: {
        title: 'Contexte',
        suggestions: 'Suggestions de l’IA',
        specs: 'Cahiers des charges',
        specsUnreadable: 'Un cahier des charges est rattaché à cette fiche, mais votre compte n’y a pas accès.',
        refusals: 'Refus précédents',
        refusedBy: 'Refusé par {by}',
        refused: 'Refusé',
        more: '+{count} autre(s)',
    },
    en: {
        title: 'Context',
        suggestions: 'AI suggestions',
        specs: 'Specifications',
        specsUnreadable: 'A specification is attached to this sheet, but your account cannot open it.',
        refusals: 'Previous rejections',
        refusedBy: 'Rejected by {by}',
        refused: 'Rejected',
        more: '+{count} more',
    },
});

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])),
    );
}

const MAX_REFUSALS = 5;

/** The remarks of the steps sent back, newest first, in one callout. */
function Refusals({ refusals, labels, lang }) {
    return (
        <section aria-label={labels.refusals} className="rounded-lg border border-[var(--becpg-orange)]/50 bg-[var(--becpg-orange)]/5 p-2.5">
            <ul className="flex flex-col gap-2.5">
                {refusals.slice(0, MAX_REFUSALS).map((entry) => (
                    <li key={entry.nodeRef || entry.date} className="flex items-start gap-2">
                        <Icon name="undo" size={16} className="mt-0.5 shrink-0 text-[var(--becpg-orange)]" />
                        <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-baseline gap-x-1.5 text-[11px] text-[var(--becpg-dark-grey)]">
                                <span className="font-medium text-[var(--becpg-orange-deep)]">
                                    {entry.by ? fill(labels.refusedBy, { by: entry.by }) : labels.refused}
                                </span>
                                {entry.date ? <DateText value={entry.date} lang={lang} /> : null}
                            </p>
                            {/* A refusal entered without a comment carries no reason; none is invented. */}
                            {entry.comment ? (
                                <p className="mt-0.5 line-clamp-4 text-sm text-[var(--becpg-ink)]">{entry.comment}</p>
                            ) : null}
                        </div>
                    </li>
                ))}
            </ul>
            {refusals.length > MAX_REFUSALS ? (
                <p className="mt-1.5 text-xs text-[var(--becpg-dark-grey)]">
                    {fill(labels.more, { count: refusals.length - MAX_REFUSALS })}
                </p>
            ) : null}
        </section>
    );
}

/**
 * The specifications applied to the sheet. Nothing at all when none is
 * attached; a line when one is attached that the account cannot open, since
 * the customer does apply it.
 */
function Specifications({ specs, labels }) {
    const specifications = Array.isArray(specs.data?.specifications) ? specs.data.specifications : [];
    if (specs.loading) {
        return <SkeletonText lines={2} />;
    }
    if (specifications.length > 0) {
        return (
            <section aria-label={labels.specs}>
                <SpecPanel specifications={specifications} variant="panel" title={null} searchable={false} />
            </section>
        );
    }
    if (specs.data?.unreadable > 0) {
        return <p className="text-sm text-[var(--becpg-dark-grey)]">{labels.specsUnreadable}</p>;
    }
    return null;
}

/**
 * @param {Object} props
 * @param {string} props.entityId entity nodeRef (or uuid) - the API accepts both
 * @param {Object} [props.suggestions] what the wizard knows of the AI suggestions -
 *        see `suggestionsPanel` in `Wizard.js`. Absent = no block rendered.
 * @param {React.ReactNode} [props.suggestionActions] shown when the AI has nothing to propose
 * @param {Object} [props.task] the task the wizard was opened from; carries
 *        `refusals`, read from the project's `pjt:tlRefusedTaskRef`
 * @param {'panel'|'sheet'} [props.variant='panel']
 * @param {string} [props.className]
 */
export function HelpPanel({
    entityId,
    suggestions = null,
    suggestionActions = null,
    task = null,
    variant = 'panel',
    className = '',
}) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const specs = useApi(entityId ? `entities/${encodeURIComponent(entityId)}/specs` : null);
    const refusals = useMemo(() => (Array.isArray(task?.refusals) ? task.refusals : []), [task]);

    const content = (
        <div className="flex min-w-0 flex-col gap-4">
            {refusals.length > 0 ? <Refusals refusals={refusals} labels={labels} lang={lang} /> : null}
            {suggestions ? (
                <section aria-label={labels.suggestions}>
                    <SuggestionsStep
                        variant="panel"
                        entityId={suggestions.entityId}
                        entityType={suggestions.entityType}
                        suggestions={suggestions.items || []}
                        summary={suggestions.summary}
                        entityLevelDropped={suggestions.entityLevelDropped}
                        analysis={suggestions.analysis}
                        loading={suggestions.loading}
                        refreshing={suggestions.refreshing}
                        error={suggestions.error}
                        onRefresh={suggestions.refresh}
                        readOnly={suggestions.readOnly}
                        onApplied={suggestions.onApplied}
                        labelForField={suggestions.labelForField}
                        emptyActions={suggestionActions}
                    />
                </section>
            ) : null}
            <Specifications specs={specs} labels={labels} />
        </div>
    );

    if (variant === 'sheet') {
        return <div className={`min-w-0 ${className}`}>{content}</div>;
    }
    return (
        <Card title={labels.title} icon="auto_awesome" padding="md" className={className}>
            {content}
        </Card>
    );
}
