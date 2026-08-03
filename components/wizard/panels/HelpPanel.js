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
 * | Cahiers des charges | `entities/{id}/specs` (`SpecPanel`) | what am I contractually asked for? |
 * | Remarques du client | `messages` on the entity | what did they tell me? |
 * | Listes validées | the wizard state's frozen steps | what is settled and untouchable? |
 * | Refus précédents | `tasks?entity=…&state=completed` | why did it come back to me? |
 *
 * Every section is collapsible, and on a phone the whole panel is a sheet the
 * wizard opens on demand — at 360px it cannot be permanently on screen, so it
 * becomes permanently *one tap away*, which is the same promise.
 *
 * Nothing here is computed: frozen steps come from the single security call
 * (bug #25928), the specifications are read-only by construction (spec §4.5 F9),
 * and the refusal history is the project's own task history.
 */

import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/StatusPill';
import { SkeletonText } from '@/components/ui/Skeleton';
import { SpecPanel } from '@/components/specs/SpecPanel';
import { formatDate, formatDateTime, plainText } from '@/lib/format';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        title: 'Contexte',
        subtitle: 'Ce que votre client attend, et ce qui est déjà acté',
        specs: 'Cahiers des charges',
        specsEmpty: 'Aucun cahier des charges rattaché à cette fiche.',
        comments: 'Remarques de votre client',
        commentsEmpty: 'Aucune remarque pour le moment.',
        commentsOpen: 'Ouvrir la discussion',
        frozen: 'Listes validées',
        frozenHint:
            'Votre client a validé ces sections : elles sont figées. Pour une correction, demandez leur réouverture via la discussion.',
        frozenEmpty: 'Aucune section n’est figée : tout reste modifiable.',
        refusals: 'Refus précédents',
        refusalsEmpty: 'Aucun refus sur cette fiche.',
        refusalsHint: 'Ces étapes vous ont été renvoyées : relisez la remarque associée avant de renvoyer.',
        onField: 'sur {field}',
        seeStep: 'Voir',
        more: '+{count} autre(s)',
    },
    en: {
        title: 'Context',
        subtitle: 'What your customer expects, and what is already settled',
        specs: 'Specifications',
        specsEmpty: 'No specification attached to this sheet.',
        comments: 'Your customer’s remarks',
        commentsEmpty: 'No remark yet.',
        commentsOpen: 'Open the discussion',
        frozen: 'Validated lists',
        frozenHint:
            'Your customer validated these sections: they are frozen. For a correction, ask for them to be reopened through the discussion.',
        frozenEmpty: 'No section is frozen: everything can still be edited.',
        refusals: 'Previous rejections',
        refusalsEmpty: 'No rejection on this sheet.',
        refusalsHint: 'These steps were sent back to you: read the associated remark before sending again.',
        onField: 'on {field}',
        seeStep: 'Open',
        more: '+{count} more',
    },
};

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])),
    );
}

/**
 * A collapsible section of the panel.
 */
function Section({ id, icon, title, count, open, onToggle, children }) {
    const reduceMotion = useReducedMotion();
    return (
        <section className="border-b border-[var(--becpg-grey)] last:border-b-0">
            <h3>
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`help-${id}`}
                    onClick={() => onToggle(id)}
                    className="touch-target flex w-full items-center gap-2 py-2.5 text-left text-sm font-medium text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
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
 * @param {string} props.entityNodeRef the entity nodeRef, for the discussion thread
 * @param {Array<Object>} [props.steps] the wizard's step view models (frozen ones are listed)
 * @param {Function} [props.onSelectStep] `(stepId) => void`
 * @param {Object} [props.discussion] a `useDiscussion` instance on the entity
 * @param {Function} [props.onOpenComments] opens the discussion panel / sheet
 * @param {Object} [props.task] the task the wizard was opened from
 * @param {'panel'|'sheet'} [props.variant='panel']
 * @param {string} [props.className]
 */
export function HelpPanel({
    entityId,
    entityNodeRef,
    steps = [],
    onSelectStep,
    discussion,
    onOpenComments,
    task = null,
    variant = 'panel',
    className = '',
}) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const [open, setOpen] = useState({ specs: true, comments: true, frozen: false, refusals: true });

    const toggle = (id) => setOpen((current) => ({ ...current, [id]: !current[id] }));

    const specs = useApi(entityId ? `entities/${encodeURIComponent(entityId)}/specs` : null);

    // "Pourquoi ça m'est revenu" — the project's own history, no new data.
    const history = useApi(entityNodeRef ? 'tasks' : null, {
        params: { entity: entityNodeRef, state: 'completed', pageSize: 50, withEntities: 'false' },
    });

    const specifications = useMemo(
        () => (specs.data && Array.isArray(specs.data.specifications) ? specs.data.specifications : []),
        [specs.data],
    );

    const frozenSteps = useMemo(() => (steps || []).filter((step) => step.frozen), [steps]);

    const refusals = useMemo(() => {
        const items = (history.data && Array.isArray(history.data.items) ? history.data.items : [])
            .filter((entry) => entry.state === 'Refused' || entry.isRefusedEnabled);
        if (task && (task.state === 'Refused' || task.isRefusedEnabled)) {
            return [task, ...items.filter((entry) => entry.id !== task.id)];
        }
        return items;
    }, [history.data, task]);

    const remarks = useMemo(() => (discussion ? discussion.messages.slice(0, 3) : []), [discussion]);

    const content = (
        <div className="flex min-w-0 flex-col">
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
                    <p className="text-sm text-[var(--becpg-dark-grey)]">{labels.specsEmpty}</p>
                ) : (
                    <SpecPanel
                        specifications={specifications}
                        variant="panel"
                        title={null}
                        searchable={false}
                    />
                )}
            </Section>

            <Section
                id="comments"
                icon="forum"
                title={labels.comments}
                count={discussion ? discussion.total : 0}
                open={open.comments}
                onToggle={toggle}
            >
                {discussion && discussion.loading && remarks.length === 0 ? (
                    <SkeletonText lines={2} />
                ) : remarks.length === 0 ? (
                    <p className="text-sm text-[var(--becpg-dark-grey)]">{labels.commentsEmpty}</p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {remarks.map((message, index) => (
                            <li
                                key={message.nodeRef || index}
                                className="rounded-lg bg-[var(--becpg-grey)]/40 p-2"
                            >
                                <p className="flex flex-wrap items-baseline gap-x-1.5 text-[11px] text-[var(--becpg-dark-grey)]">
                                    <span className="font-medium text-[var(--becpg-blue)]">
                                        {message.author.displayName || message.author.username}
                                    </span>
                                    <span>{formatDateTime(message.createdOn, lang)}</span>
                                    {message.field ? (
                                        <span>{fill(labels.onField, { field: message.field })}</span>
                                    ) : null}
                                </p>
                                {/*
                                 * A three-line preview, so the body is flattened
                                 * rather than rendered as blocks: `line-clamp`
                                 * counts lines inside one element and cannot clamp
                                 * across sibling paragraphs. `plainText` also
                                 * strips the `<p>` Alfresco wraps every comment in,
                                 * which used to be printed literally here.
                                 */}
                                <p className="mt-0.5 line-clamp-3 break-words text-sm text-[var(--becpg-blue)]/90">
                                    {plainText(message.content)}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
                {onOpenComments ? (
                    <Button
                        variant="link"
                        size="sm"
                        icon="open_in_new"
                        onClick={() => onOpenComments(null)}
                        className="mt-1"
                    >
                        {labels.commentsOpen}
                    </Button>
                ) : null}
            </Section>

            <Section
                id="frozen"
                icon="lock"
                title={labels.frozen}
                count={frozenSteps.length}
                open={open.frozen}
                onToggle={toggle}
            >
                {frozenSteps.length === 0 ? (
                    <p className="text-sm text-[var(--becpg-dark-grey)]">{labels.frozenEmpty}</p>
                ) : (
                    <>
                        <p className="mb-2 text-xs text-[var(--becpg-dark-grey)]">{labels.frozenHint}</p>
                        <ul className="flex flex-col gap-1">
                            {frozenSteps.map((step) => (
                                <li key={step.id} className="flex items-center gap-2">
                                    <StatusPill status="valid" label={step.label} tone="ok" size="sm" icon="lock" />
                                    {onSelectStep ? (
                                        <button
                                            type="button"
                                            onClick={() => onSelectStep(step.id)}
                                            className="text-xs text-[var(--becpg-blue)] underline underline-offset-2"
                                        >
                                            {labels.seeStep}
                                        </button>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </Section>

            <Section
                id="refusals"
                icon="history"
                title={labels.refusals}
                count={refusals.length}
                open={open.refusals}
                onToggle={toggle}
            >
                {history.loading && refusals.length === 0 ? (
                    <SkeletonText lines={2} />
                ) : refusals.length === 0 ? (
                    <p className="text-sm text-[var(--becpg-dark-grey)]">{labels.refusalsEmpty}</p>
                ) : (
                    <>
                        <p className="mb-2 text-xs text-[var(--becpg-dark-grey)]">{labels.refusalsHint}</p>
                        <ul className="flex flex-col gap-2">
                            {refusals.slice(0, 5).map((entry) => (
                                <li
                                    key={entry.id}
                                    className="rounded-lg border border-[var(--becpg-orange)]/40 bg-[var(--becpg-orange)]/5 p-2"
                                >
                                    <p className="text-sm font-medium text-[var(--becpg-blue)]">{entry.name}</p>
                                    <p className="mt-0.5 text-[11px] text-[var(--becpg-dark-grey)]">
                                        {entry.dueDate ? formatDate(entry.dueDate, lang) : ''}
                                        {entry.commentCount > 0 ? ` · ${entry.commentCount} 💬` : ''}
                                    </p>
                                    {entry.description ? (
                                        <p className="mt-1 line-clamp-3 text-sm text-[var(--becpg-blue)]/90">
                                            {entry.description}
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
        <Card title={labels.title} subtitle={labels.subtitle} icon="lightbulb" padding="md" className={className}>
            {content}
        </Card>
    );
}
