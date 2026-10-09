'use client';

/**
 * AI help for whoever treats a non-conformity step: what it proposes for the
 * step's own fields, the likely root causes, corrective actions, and the past
 * non-conformities that look like this one.
 *
 * A proposal fills the form, it saves nothing: the assignee reads it, changes it
 * or ignores it, then answers the step as usual. When becpg-ai is not deployed
 * the card renders nothing.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Icon, IconButton } from '@/components/ui/Button';
import { DateText } from '@/components/ui/DateText';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ncHref } from '@/components/monitor/NonConformityList';
import { api } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/tasks/NcAssist#LABELS', {
    fr: {
        title: 'Aide IA',
        help: 'Propositions de l’IA à partir de la non-conformité, du produit, du fournisseur et des non-conformités passées. Rien n’est enregistré tant que vous ne répondez pas à la tâche.',
        answers: 'Réponses proposées',
        apply: 'Reprendre',
        applied: 'Repris',
        applyAll: 'Tout reprendre',
        causes: 'Causes probables',
        actions: 'Actions correctives suggérées',
        addToComment: 'Ajouter au commentaire',
        similar: 'Non-conformités similaires',
        likelihood: { high: 'probable', medium: 'possible', low: 'peu probable' },
        yes: 'Oui',
        no: 'Non',
    },
    en: {
        title: 'AI help',
        help: 'Proposals from the AI, based on the non-conformity, the product, the supplier and past non-conformities. Nothing is saved until you answer the task.',
        answers: 'Proposed answers',
        apply: 'Use',
        applied: 'Used',
        applyAll: 'Use all',
        causes: 'Likely root causes',
        actions: 'Suggested corrective actions',
        addToComment: 'Add to the comment',
        similar: 'Similar non-conformities',
        likelihood: { high: 'likely', medium: 'possible', low: 'unlikely' },
        yes: 'Yes',
        no: 'No',
    },
});

/** The step's fields that are the workflow's own, by prefixed name. */
function answerFieldNames(definition) {
    return (definition?.fields || []).map((field) => field.name);
}

function useNcAssist({ nc, task }) {
    const [state, setState] = useState({ data: null, loading: Boolean(nc) });
    const fieldNames = answerFieldNames(task.definition);
    const key = fieldNames.join(',');
    useEffect(() => {
        if (!nc) {
            return undefined;
        }
        let cancelled = false;
        api.post('ai/nc-assist', { nc, taskId: task.id, taskType: task.taskType, fieldNames: key.split(',') })
            .then((data) => !cancelled && setState({ data, loading: false }))
            // An assistant that fails is an assistant that is not there: the step
            // is answered without it, and the failure is in the server log.
            .catch(() => !cancelled && setState({ data: null, loading: false }));
        return () => {
            cancelled = true;
        };
    }, [nc, task.id, task.taskType, key]);
    return state;
}

function displayAnswer(answer, labels) {
    if (answer.label) {
        return answer.label;
    }
    if (typeof answer.value === 'boolean') {
        return answer.value ? labels.yes : labels.no;
    }
    return Array.isArray(answer.value) ? answer.value.join(', ') : String(answer.value);
}

function Answers({ answers, definition, labels, onApply }) {
    const [applied, setApplied] = useState({});
    if (answers.length === 0) {
        return null;
    }
    const fieldOf = (name) => (definition?.fields || []).find((field) => field.name === name);
    const apply = (answer) => {
        const field = fieldOf(answer.name);
        if (field) {
            onApply(field, answer.value);
            setApplied((value) => ({ ...value, [answer.name]: true }));
        }
    };
    return (
        <div>
            <div className="mb-1 flex items-center justify-between gap-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--becpg-muted)]">{labels.answers}</h3>
                <Button size="sm" variant="ghost" icon="done_all" onClick={() => answers.forEach(apply)}>{labels.applyAll}</Button>
            </div>
            <ul className="flex flex-col gap-2">
                {answers.map((answer) => (
                    <li key={answer.name} className="rounded-lg border border-[var(--becpg-line)] px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-[var(--becpg-muted)]">{fieldOf(answer.name)?.label || answer.name}</span>
                            <span className="text-sm font-semibold">{displayAnswer(answer, labels)}</span>
                            {answer.confidence !== null ? <span className="text-xs tabular-nums text-[var(--becpg-muted)]">{answer.confidence} %</span> : null}
                            <Button size="sm" variant="outline" className="ms-auto" icon={applied[answer.name] ? 'check' : 'south_west'} disabled={applied[answer.name]} onClick={() => apply(answer)}>
                                {applied[answer.name] ? labels.applied : labels.apply}
                            </Button>
                        </div>
                        {answer.reason ? <p className="mt-1 text-xs text-[var(--becpg-muted)]">{answer.reason}</p> : null}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Causes({ causes, labels }) {
    if (causes.length === 0) {
        return null;
    }
    return (
        <div>
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--becpg-muted)]">{labels.causes}</h3>
            <ul className="flex flex-col gap-1.5">
                {causes.map((cause) => (
                    <li key={cause.label} className="text-sm">
                        <span className="font-medium">{cause.label}</span>
                        {cause.likelihood ? <span className="ms-2 pill pill-sm pill-no-dot pill-neutral">{labels.likelihood[cause.likelihood]}</span> : null}
                        {cause.evidence ? <p className="text-xs text-[var(--becpg-muted)]">{cause.evidence}</p> : null}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Actions({ actions, labels, onAddToComment }) {
    if (actions.length === 0) {
        return null;
    }
    return (
        <div>
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--becpg-muted)]">{labels.actions}</h3>
            <ul className="flex flex-col gap-1.5">
                {actions.map((action) => (
                    <li key={action} className="flex items-start gap-2 text-sm">
                        <Icon name="build" size={16} className="mt-0.5 shrink-0 text-[var(--becpg-blue)]" />
                        <span className="flex-1">{action}</span>
                        {onAddToComment ? (
                            <IconButton icon="add_comment" label={labels.addToComment} title={labels.addToComment} onClick={() => onAddToComment(action)} />
                        ) : null}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Similar({ similar, labels, lang }) {
    if (similar.length === 0) {
        return null;
    }
    return (
        <div>
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--becpg-muted)]">{labels.similar}</h3>
            <ul className="flex flex-col gap-1">
                {similar.map((nc) => (
                    <li key={nc.nodeRef} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                        <Link href={ncHref(nc.nodeRef)} className="font-medium text-[var(--becpg-blue)] hover:underline">{nc.name}</Link>
                        <span className="text-xs text-[var(--becpg-muted)]">{[nc.product, nc.supplier, nc.state].filter(Boolean).join(' · ')}</span>
                        {nc.date ? <DateText value={nc.date} lang={lang} className="text-xs text-[var(--becpg-muted)]" /> : null}
                        {nc.similarity !== null ? <span className="ms-auto text-xs tabular-nums text-[var(--becpg-muted)]">{nc.similarity} %</span> : null}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/**
 * @param {Object} props
 * @param {Object} props.task the workflow task sheet
 * @param {string|null} props.nc the non-conformity the step is about
 * @param {Function|null} props.onApply `(field, value) => void`, null when the step cannot be answered
 * @param {Function|null} props.onAddToComment `(text) => void`
 */
export function NcAssist({ task, nc, onApply, onAddToComment }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const { data, loading } = useNcAssist({ nc, task });

    if (loading) {
        return <SkeletonCard lines={3} className="mb-4" />;
    }
    if (!data?.available) {
        return null;
    }
    return (
        <section aria-label={labels.title} className="mb-4 rounded-2xl border border-[var(--becpg-line)] bg-white p-4 shadow-[var(--becpg-shadow-raised)]">
            <header className="mb-3 flex items-center gap-2">
                <Icon name="auto_awesome" size={18} className="text-[var(--becpg-blue)]" />
                <h2 className="flex-1 text-base font-medium">{labels.title}</h2>
                <span title={labels.help} className="inline-flex"><Icon name="help_outline" size={18} className="text-[var(--becpg-muted)]" /></span>
            </header>
            {data.summary ? <p className="mb-3 text-sm">{data.summary}</p> : null}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {onApply ? <Answers answers={data.answers} definition={task.definition} labels={labels} onApply={onApply} /> : null}
                <Causes causes={data.rootCauses} labels={labels} />
                <Actions actions={data.correctiveActions} labels={labels} onAddToComment={onAddToComment} />
                <Similar similar={data.similar} labels={labels} lang={lang} />
            </div>
        </section>
    );
}
