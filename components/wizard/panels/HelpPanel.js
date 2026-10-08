'use client';

/**
 * **Étape 0 · Contexte** (spec §4.4) — permanently visible, never a step you
 * have to walk through.
 *
 * This panel is the inversion the redesign is about. In the current wizard the
 * supplier is dropped straight into a form and has to *guess* what the customer
 * expects; the reference documents, the remarks, the refusal history all live
 * elsewhere, in Share, behind a link he does not have. So the answer is not
 * "another step", it is **a panel that is always there**:
 *
 * | Section | Source | Question it answers |
 * |---|---|---|
 * | Suggestions de l'IA | `becpg/ai/*` through the wizard | what has already been read for me? |
 * | Cahiers des charges | `entities/{id}/specs` (`SpecPanel`) | what am I contractually asked for? |
 * | Refus précédents | the task's `pjt:tlRefusedTaskRef` | why did it come back to me? |
 *
 * Two sections were removed rather than kept for symmetry — « Remarques du
 * client » and « Listes validées » — and the reason is the same for both: each
 * repeated, in a narrower and less actionable form, something the screen beside
 * it already said. See the notes at their former places below.
 *
 * Every section is collapsible, and on a phone the whole panel is a sheet the
 * wizard opens on demand — at 360px it cannot be permanently on screen, so it
 * becomes permanently *one tap away*, which is the same promise.
 *
 * Nothing here is computed: the specifications are read-only by construction
 * (spec §4.5 F9), and the refusal history comes with the task.
 */

import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SkeletonText } from '@/components/ui/Skeleton';
import { SpecPanel } from '@/components/specs/SpecPanel';
import { SuggestionsStep } from '@/components/wizard/steps/SuggestionsStep';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/wizard/panels/HelpPanel#LABELS', {
    fr: {
        title: 'Contexte',
        suggestions: 'Suggestions de l’IA',
        specs: 'Cahiers des charges',
        specsEmpty: 'Aucun cahier des charges rattaché à cette fiche.',
        specsUnreadable: 'Un cahier des charges est rattaché à cette fiche, mais votre compte n’y a pas accès.',
        refusals: 'Refus précédents',
        refusalsEmpty: 'Aucun refus sur cette fiche.',
        refusalsHint: 'Ces étapes vous ont été renvoyées : relisez la remarque associée avant de renvoyer.',
        onField: 'sur {field}',
        seeStep: 'Voir',
        more: '+{count} autre(s)',
    },
    en: {
        title: 'Context',
        suggestions: 'AI suggestions',
        specs: 'Specifications',
        specsEmpty: 'No specification attached to this sheet.',
        specsUnreadable: 'A specification is attached to this sheet, but your account cannot open it.',
        refusals: 'Previous rejections',
        refusalsEmpty: 'No rejection on this sheet.',
        refusalsHint: 'These steps were sent back to you: read the associated remark before sending again.',
        onField: 'on {field}',
        seeStep: 'Open',
        more: '+{count} more',
    },
});

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])),
    );
}

/**
 * A collapsible section of the panel.
 *
 * No rule between two sections. The panel is a narrow column of small text, and
 * a full-width line under every section — including under the suggestions, the
 * one thing here that is read at length — cut it into slabs and added weight
 * where the eye needs calm. The icon, the heading and the space around it say
 * "new section" perfectly well on their own.
 */
function Section({ id, icon, title, count, open, onToggle, children }) {
    const reduceMotion = useReducedMotion();
    return (
        <section>
            <h3>
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`help-${id}`}
                    onClick={() => onToggle(id)}
                    className="touch-target flex w-full items-center gap-2 py-2.5 text-start text-sm font-medium text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                >
                    <Icon name={icon} size={18} className="shrink-0 text-[var(--becpg-dark-grey)]" />
                    <span className="min-w-0 flex-1 truncate">{title}</span>
                    {count > 0 ? (
                        <span className="shrink-0 rounded-full bg-[var(--becpg-grey)] px-1.5 py-0.5 text-[11px] text-[var(--becpg-dark-grey)]">
                            {count}
                        </span>
                    ) : null}
                    <Icon name={open ? 'expand_less' : 'expand_more'} size={18} className="shrink-0" />
                </button>
            </h3>
            <AnimatePresence initial={false}>
                {open ? (
                    <motion.div
                        id={`help-${id}`}
                        initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
                        className="overflow-hidden"
                    >
                        <div className="pb-3">{children}</div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </section>
    );
}

/**
 * @param {Object} props
 * @param {string} props.entityId entity nodeRef (or uuid) — the API accepts both
 * @param {Object} [props.suggestions] what the wizard knows of the AI suggestions —
 *        see `suggestionsPanel` in `Wizard.js`. Absent = no section rendered.
 * @param {Object} [props.discussion] a `useDiscussion` instance on the entity
 * @param {Function} [props.onOpenComments] opens the discussion panel / sheet
 * @param {Object} [props.task] the task the wizard was opened from
 * @param {'panel'|'sheet'} [props.variant='panel']
 * @param {string} [props.className]
 */
export function HelpPanel({
    entityId,
    suggestions = null,
    discussion,
    onOpenComments,
    task = null,
    variant = 'panel',
    className = '',
}) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    // Suggestions open from the start: this is what the supplier did not ask for
    // but does use, and a collapsed section is not read.
    const [open, setOpen] = useState({
        suggestions: true, specs: true, refusals: true,
    });

    const toggle = (id) => setOpen((current) => ({ ...current, [id]: !current[id] }));

    const specs = useApi(entityId ? `entities/${encodeURIComponent(entityId)}/specs` : null);


    const specifications = useMemo(
        () => (specs.data && Array.isArray(specs.data.specifications) ? specs.data.specifications : []),
        [specs.data],
    );

    /*
     * REFUSALS COME FROM THE PROJECT, NOT FROM THE TASK LIST.
     *
     * This panel queried `/tasks?state=completed` and kept the entries whose
     * state was `Refused`. It never found any, and could not: `fetchWorkflowTasks`
     * reduces the state of an Activiti task to `Completed` or `InProgress`, and
     * the PROJECT tasks — the only ones carrying `pjt:tlState = Refused` — were
     * read for `state=in_progress` only. Measured on dev: a « Validation » task
     * refused while the panel displayed « Aucun refus sur cette fiche ».
     *
     * They now arrive WITH the task: `projectTaskInfo.get.json.ftl` returns the
     * source associations of `pjt:tlRefusedTaskRef` and their
     * `pjt:tlTaskComment` — what `ProjectServiceImpl.refusedTask` writes there.
     * Reading the project would have given nothing: a supplier has no access to it.
     */
    const refusals = useMemo(
        () => (task && Array.isArray(task.refusals) ? task.refusals : []),
        [task],
    );


    const content = (
        <div className="flex min-w-0 flex-col">
            {/*
                THE AI SUGGESTIONS COME FIRST.

                They used to be a step of the assistant, in second place. Two
                things were wrong with that, and neither had to do with their
                content: the number of steps changed midway when becpg-ai
                answered, and above all what the AI read is there to FILL the
                steps in — reading it meant leaving the one being typed.

                Here they stay in sight throughout the data entry, whatever the
                step, and `Wizard.js` re-reads them on every step change.
            */}
            {/*
                THE TECHNICAL SHEET IS NO LONGER HERE.

                It opened this panel, right above the suggestions it feeds: the
                right place to read it, the wrong place to upload it. Below `lg`
                the panel is behind a button, above it is the column the eye
                reaches last — and uploading the sheet is the FIRST action
                expected of the supplier, the one without which the AI proposes
                nothing.

                It is in the assistant's header instead, in red while it is
                missing: see `TechnicalSheetBanner`.
            */}
            {suggestions ? (
                <Section
                    id="suggestions"
                    icon="auto_awesome"
                    title={labels.suggestions}
                    count={(suggestions.items || []).length}
                    open={open.suggestions}
                    onToggle={toggle}
                >
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
                    />
                </Section>
            ) : null}

            <Section
                id="specs"
                icon="menu_book"
                title={labels.specs}
                count={specifications.length}
                open={open.specs}
                onToggle={toggle}
            >
                {specs.loading ? (
                    <SkeletonText lines={2} />
                ) : specifications.length === 0 ? (
                    /* An unreadable specification is one the customer DOES apply:
                       saying so is not the same message as "none attached". */
                    <p className="text-sm text-[var(--becpg-dark-grey)]">
                        {(specs.data && specs.data.unreadable) > 0
                            ? labels.specsUnreadable
                            : labels.specsEmpty}
                    </p>
                ) : (
                    <SpecPanel
                        specifications={specifications}
                        variant="panel"
                        title={null}
                        searchable={false}
                    />
                )}
            </Section>

            {/*
                "VALIDATED LISTS" WAS REMOVED.

                The section listed the frozen steps and recalled that a
                correction goes through a request to reopen them. The rail
                already says so on every step concerned — padlock and "Validée
                par le client" — and the open step carries the full sentence with
                what to do (`useDataList.frozenText`, `FormStep.frozenText`).
                This panel only gave a third copy of it, on the right, in the
                column the eye reaches last.

                "YOUR CUSTOMER'S REMARKS" WAS REMOVED.

                The section read the SAME thread as the discussion panel —
                `discussion.messages.slice(0, 3)` — and showed a truncated
                preview of it, with no way to answer. Two places for one
                conversation, one of which existed only to point at the other.
                The full thread, with its input, is one click away.
            */}
            <Section
                id="refusals"
                icon="history"
                title={labels.refusals}
                count={refusals.length}
                open={open.refusals}
                onToggle={toggle}
            >
                {refusals.length === 0 ? (
                    <p className="text-sm text-[var(--becpg-dark-grey)]">{labels.refusalsEmpty}</p>
                ) : (
                    <>
                        <p className="mb-2 text-xs text-[var(--becpg-dark-grey)]">{labels.refusalsHint}</p>
                        <ul className="flex flex-col gap-2">
                            {refusals.slice(0, 5).map((entry) => (
                                <li
                                    key={entry.nodeRef || entry.date}
                                    className="rounded-lg border border-[var(--becpg-orange)]/40 bg-[var(--becpg-orange)]/5 p-2"
                                >
                                    {/* The author and the date: the reason comes from a
                                        comment, which carries no step name. */}
                                    <p className="flex flex-wrap items-baseline gap-x-1.5 text-[11px] text-[var(--becpg-dark-grey)]">
                                        {entry.by ? (
                                            <span className="font-medium text-[var(--becpg-blue)]">{entry.by}</span>
                                        ) : null}
                                        {entry.date ? <span>{formatDate(entry.date, lang)}</span> : null}
                                    </p>
                                    {/*
                                        Le motif, quand il y en a un : un refus saisi
                                        sans commentaire n'en porte pas, et il vaut
                                        mieux l'annoncer sans raison que d'en inventer.
                                    */}
                                    {entry.comment ? (
                                        <p className="mt-1 line-clamp-4 text-sm text-[var(--becpg-blue)]/90">
                                            {entry.comment}
                                        </p>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                        {refusals.length > 5 ? (
                            <p className="mt-1 text-xs text-[var(--becpg-dark-grey)]">
                                {fill(labels.more, { count: refusals.length - 5 })}
                            </p>
                        ) : null}
                    </>
                )}
            </Section>
        </div>
    );

    if (variant === 'sheet') {
        return <div className={`min-w-0 ${className}`}>{content}</div>;
    }

    return (
        /* No subtitle: « Ce que votre client attend, et ce qui est déjà acté »
           described the panel to someone already reading it, and cost two lines
           at the top of a 320px column. The section headers say what is inside. */
        <Card title={labels.title} icon="auto_awesome" padding="md" className={className}>
            {content}
        </Card>
    );
}
