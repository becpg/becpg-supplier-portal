'use client';

/**
 * A workflow step with no project task behind it — the analysis, the corrective
 * action, the check of a non-conformity — treated as Share's task-edit page
 * treats it: who holds it, what it is about, the answers the workflow asks for,
 * and the transitions that end it.
 *
 * The form is the task type's own fields as the repository describes them
 * (`lib/adapters/workflowTasks.js`); which branch the process takes next is the
 * workflow's decision, made from those answers.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { Button, ButtonGroup, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateText } from '@/components/ui/DateText';
import { StatusPill } from '@/components/ui/StatusPill';
import { FormRenderer } from '@/components/form/FormRenderer';
import { validateForm } from '@/components/form/validation';
import { CommentsPanel } from '@/components/wizard/panels/CommentsPanel';
import { ncHref } from '@/components/monitor/NonConformityList';
import { NcAssist } from '@/components/tasks/NcAssist';
import { useToast } from '@/components/providers/ToastProvider';
import { api } from '@/lib/client';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/tasks/WorkflowTaskScreen#LABELS', {
    fr: {
        back: 'Mes tâches',
        assignee: 'Assignée à',
        pooled: 'À prendre',
        due: 'Échéance',
        startedBy: 'Lancé par',
        concerns: 'Concerne',
        answer: 'Votre réponse',
        claim: 'Prendre la tâche',
        release: 'Remettre au pool',
        claimed: 'La tâche est à vous',
        released: 'La tâche est remise au pool',
        save: 'Enregistrer',
        saved: 'Réponse enregistrée',
        done: 'Tâche terminée',
        completed: 'Tâche terminée, le workflow continue',
        claimFirst: 'Prenez la tâche pour y répondre.',
        closed: 'Cette tâche est terminée.',
        discussion: 'Discussion',
    },
    en: {
        back: 'My tasks',
        assignee: 'Assigned to',
        pooled: 'To claim',
        due: 'Due',
        startedBy: 'Started by',
        concerns: 'About',
        answer: 'Your answer',
        claim: 'Claim the task',
        release: 'Release to the pool',
        claimed: 'The task is yours',
        released: 'The task is back in the pool',
        save: 'Save',
        saved: 'Answer saved',
        done: 'Task done',
        completed: 'Task done, the workflow moves on',
        claimFirst: 'Claim the task to answer it.',
        closed: 'This task is done.',
        discussion: 'Discussion',
    },
});

/** The discussion moves beside the sheet from this width up. */
const WIDE_LAYOUT = '(min-width: 1024px)';

const NC_TYPE = 'qa:nc';
const SUPPLIER_TYPE = 'bcpg:supplier';
const COMMENT_FIELD = 'bpm:comment';

/** Where an item of the package opens in the portal. */
function itemHref(item) {
    if (item.type === NC_TYPE) {
        return ncHref(item.nodeRef);
    }
    if (item.type === SUPPLIER_TYPE) {
        return `/monitor/suppliers/${encodeURIComponent(item.nodeRef.split('/').pop())}`;
    }
    return `/products/${encodeURIComponent(item.nodeRef)}`;
}

/** The answers as the definition holds them, keyed by form name. */
function initialValues(definition) {
    return Object.fromEntries((definition?.fields || []).map((field) => [field.formsName, field.value ?? null]));
}

function Fact({ label, children }) {
    return (
        <div className="min-w-0">
            <dt className="text-[0.75rem] text-[var(--becpg-muted)]">{label}</dt>
            <dd className="mt-0.5 break-words text-sm font-medium">{children}</dd>
        </div>
    );
}

function TaskHeader({ task, labels, lang, busy, onClaim }) {
    return (
        <Card className="mb-4">
            <Link href="/tasks" className="inline-flex items-center gap-1 text-xs text-[var(--becpg-blue)]">
                <Icon name="arrow_back" size={14} />{labels.back}
            </Link>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-xl font-semibold text-[var(--becpg-ink)]">{task.title}</h1>
                    <p className="mt-0.5 text-sm text-[var(--becpg-muted)]">{[task.workflow.title, task.description].filter(Boolean).join(' · ')}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        <StatusPill status={task.open ? 'inProgress' : 'completed'} size="sm" />
                        {task.late ? <StatusPill status="late" size="sm" /> : null}
                    </div>
                </div>
                <ButtonGroup stackOnMobile={false}>
                    {task.can.claim ? <Button size="sm" icon="back_hand" loading={busy} onClick={() => onClaim(false)}>{labels.claim}</Button> : null}
                    {task.can.release ? <Button size="sm" variant="outline" icon="group" loading={busy} onClick={() => onClaim(true)}>{labels.release}</Button> : null}
                </ButtonGroup>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <Fact label={labels.assignee}>{task.owner || labels.pooled}</Fact>
                <Fact label={labels.due}>{task.dueDate ? <DateText value={task.dueDate} lang={lang} /> : '-'}</Fact>
                <Fact label={labels.startedBy}>
                    {task.workflow.initiator || '-'}
                    {task.workflow.startedAt ? <span className="ms-1 font-normal text-[var(--becpg-muted)]"><DateText value={task.workflow.startedAt} lang={lang} /></span> : null}
                </Fact>
            </dl>
        </Card>
    );
}

function Items({ items, labels }) {
    if (items.length === 0) {
        return null;
    }
    return (
        <Card className="mb-4" icon="link" title={labels.concerns}>
            <ul className="flex flex-wrap gap-2">
                {items.map((item) => (
                    <li key={item.nodeRef}>
                        <Link
                            href={itemHref(item)}
                            className="inline-flex items-center gap-2 rounded-lg border border-[var(--becpg-line)] px-3 py-2 text-sm hover:bg-[var(--becpg-grey)]"
                        >
                            <Icon name={item.type === NC_TYPE ? 'report' : 'inventory_2'} size={18} className="text-[var(--becpg-blue)]" />
                            <span className="font-medium">{item.name || item.nodeRef}</span>
                            {item.code ? <span className="text-xs text-[var(--becpg-muted)]">{item.code}</span> : null}
                        </Link>
                    </li>
                ))}
            </ul>
        </Card>
    );
}

/**
 * @param {Object} props
 * @param {import('@/lib/adapters/workflowTasks').WorkflowTaskSheet} props.task
 * @param {Function} props.onChanged re-reads the task
 */
export function WorkflowTaskScreen({ task, onChanged }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const toast = useToast();
    const router = useRouter();
    const wide = useMediaQuery(WIDE_LAYOUT);
    const [values, setValues] = useState(() => initialValues(task.definition));
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(null);

    const writable = task.open && task.can.edit;
    const changed = useMemo(() => {
        const initial = initialValues(task.definition);
        return Object.fromEntries(Object.entries(values).filter(([name, value]) => JSON.stringify(value) !== JSON.stringify(initial[name])));
    }, [values, task.definition]);
    const discussionOn = task.items.find((item) => item.type === NC_TYPE) || task.items[0] || null;

    const run = async (key, call, message) => {
        setBusy(key);
        try {
            await call();
            toast.success(message);
            return true;
        }
        catch (error) {
            toast.error(error);
            return false;
        }
        finally {
            setBusy(null);
        }
    };

    const claim = (release) => run('claim', () => api.post(`tasks/${encodeURIComponent(task.id)}/claim`, { release }), release ? labels.released : labels.claimed)
        .then((done) => done && onChanged());

    const save = () => run('save', () => api.post(`tasks/${encodeURIComponent(task.id)}/workflow`, { values: changed }), labels.saved);

    const finish = async (transition) => {
        const { valid, errors: found } = validateForm(task.definition, values);
        setErrors(found);
        if (!valid) {
            return;
        }
        const done = await run(transition.id, () => api.post(`tasks/${encodeURIComponent(task.id)}/workflow`, { values: changed, transition: transition.id }), labels.completed);
        if (done) {
            router.push('/tasks');
        }
    };

    const addToComment = (line) => setValues((current) => {
        const field = task.definition.fields.find((entry) => entry.name === COMMENT_FIELD);
        if (!field) {
            return current;
        }
        const before = current[field.formsName] ? `${current[field.formsName]}\n` : '';
        return { ...current, [field.formsName]: `${before}- ${line}` };
    });

    const discussion = discussionOn ? <CommentsPanel entityNodeRef={discussionOn.nodeRef} title={labels.discussion} /> : null;

    return (
        <AppShell ownHeading fullWidth space="monitor" title={task.title} aside={wide ? discussion : null}>
            <TaskHeader task={task} labels={labels} lang={lang} busy={busy === 'claim'} onClaim={claim} />
            <Items items={task.items} labels={labels} />
            {task.items.some((item) => item.type === NC_TYPE) ? (
                <NcAssist
                    task={task}
                    nc={task.items.find((item) => item.type === NC_TYPE).nodeRef}
                    onApply={writable ? (field, value) => setValues((current) => ({ ...current, [field.formsName]: value })) : null}
                    onAddToComment={writable ? addToComment : null}
                />
            ) : null}
            <Card icon="edit_note" title={labels.answer}>
                {!task.open ? <p className="mb-3 text-sm text-[var(--becpg-muted)]">{labels.closed}</p> : null}
                {task.open && !task.can.edit ? <p className="mb-3 text-sm text-[var(--becpg-muted)]">{labels.claimFirst}</p> : null}
                <FormRenderer
                    definition={task.definition}
                    values={values}
                    readOnly={!writable}
                    errors={errors}
                    lang={lang}
                    entityNodeRef={discussionOn?.nodeRef}
                    onChange={(name, next, field) => setValues((current) => ({ ...current, [field?.formsName || name]: next }))}
                />
                {writable ? (
                    <ButtonGroup className="mt-4 border-t border-[var(--becpg-line)] pt-4">
                        <Button variant="outline" icon="save" loading={busy === 'save'} disabled={Object.keys(changed).length === 0} onClick={save}>{labels.save}</Button>
                        {task.transitions.map((transition) => (
                            <Button
                                key={transition.id}
                                variant={transition.isDefault ? 'primary' : 'outline'}
                                icon="check"
                                loading={busy === transition.id}
                                onClick={() => finish(transition)}
                            >
                                {transition.label || labels.done}
                            </Button>
                        ))}
                    </ButtonGroup>
                ) : null}
            </Card>
            {!wide && discussion ? <div className="mt-4">{discussion}</div> : null}
        </AppShell>
    );
}
