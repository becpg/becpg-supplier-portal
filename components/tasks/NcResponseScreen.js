'use client';

/**
 * A supplier answers a non-conformity: what happened, what the customer asks,
 * its action plan, the documents that back it, and one button that sends it.
 *
 * It is the corrective action step of the customer's non-conformity workflow,
 * assigned to the supplier's account (`lib/adapters/workflowTasks.js`). The
 * supplier writes its answer and attaches files to the non-conformity; the
 * state of the non-conformity, and the next step, stay the customer's.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { Button, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateText } from '@/components/ui/DateText';
import { StatusPill } from '@/components/ui/StatusPill';
import { Textarea } from '@/components/ui/Field';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { DepositedDocuments } from '@/components/documents/DepositedDocuments';
import { CommentsPanel } from '@/components/wizard/panels/CommentsPanel';
import { useToast } from '@/components/providers/ToastProvider';
import { api } from '@/lib/client';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/tasks/NcResponseScreen#LABELS', {
    fr: {
        back: 'Mes tâches',
        title: 'Répondre à la non-conformité {name}',
        due: 'À rendre le {date}',
        what: 'La non-conformité',
        product: 'Produit',
        batch: 'Lot',
        type: 'Type',
        declared: 'Déclarée le',
        request: 'Ce que votre client demande',
        requestBy: '{who}, le {date}',
        plan: 'Votre plan d’action',
        planHelp: 'Cause identifiée, actions correctives et préventives, délais.',
        planRequired: 'Décrivez votre plan d’action avant d’envoyer.',
        files: 'Pièces jointes',
        filesHelp: 'Analyse de cause, rapport d’inspection, photos…',
        send: 'Envoyer ma réponse',
        sent: 'Réponse envoyée à votre client',
        save: 'Enregistrer le brouillon',
        saved: 'Brouillon enregistré',
        closed: 'Votre réponse a été envoyée.',
        discussion: 'Discussion',
    },
    en: {
        back: 'My tasks',
        title: 'Answer the non-conformity {name}',
        due: 'Due on {date}',
        what: 'The non-conformity',
        product: 'Product',
        batch: 'Batch',
        type: 'Type',
        declared: 'Reported on',
        request: 'What your customer asks',
        requestBy: '{who}, on {date}',
        plan: 'Your action plan',
        planHelp: 'Root cause found, corrective and preventive actions, deadlines.',
        planRequired: 'Describe your action plan before sending.',
        files: 'Attachments',
        filesHelp: 'Root cause analysis, inspection report, photos…',
        send: 'Send my answer',
        sent: 'Answer sent to your customer',
        save: 'Save the draft',
        saved: 'Draft saved',
        closed: 'Your answer has been sent.',
        discussion: 'Discussion',
    },
});

/** The discussion moves beside the answer from this width up. */
const WIDE_LAYOUT = '(min-width: 1024px)';

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) => (vars[key] ?? match));
}

function Fact({ label, children }) {
    if (!children) {
        return null;
    }
    return (
        <div className="min-w-0">
            <dt className="text-[0.75rem] text-[var(--becpg-muted)]">{label}</dt>
            <dd className="mt-0.5 break-words text-sm font-medium">{children}</dd>
        </div>
    );
}

function NcSummary({ task, labels, lang }) {
    const nc = task.nc || {};
    return (
        <Card className="mb-4" icon="report" title={labels.what}>
            {nc.description || task.description ? <p className="mb-3 whitespace-pre-line text-sm">{nc.description || task.description}</p> : null}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                <Fact label={labels.product}>{nc.product}</Fact>
                <Fact label={labels.batch}>{nc.batch}</Fact>
                <Fact label={labels.type}>{nc.type}</Fact>
                <Fact label={labels.declared}>{nc.createdAt ? <DateText value={nc.createdAt} lang={lang} /> : null}</Fact>
            </dl>
            {task.request ? (
                <div className="mt-4 rounded-xl bg-[var(--status-info-bg)] p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--status-info)]">{labels.request}</p>
                    <p className="mt-1 whitespace-pre-line text-sm">{task.request.comment}</p>
                    {task.request.by ? (
                        <p className="mt-1 text-xs text-[var(--becpg-muted)]">
                            {fill(labels.requestBy, { who: task.request.by, date: task.request.at ? new Date(task.request.at).toLocaleDateString(lang.replace('_', '-')) : '' })}
                        </p>
                    ) : null}
                </div>
            ) : null}
        </Card>
    );
}

/**
 * @param {Object} props
 * @param {import('@/lib/adapters/workflowTasks').WorkflowTaskSheet} props.task `supplierView` set
 */
export function NcResponseScreen({ task }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const toast = useToast();
    const router = useRouter();
    const wide = useMediaQuery(WIDE_LAYOUT);
    const field = task.definition.fields[0] || null;
    const [plan, setPlan] = useState(field?.value || '');
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(null);
    const [deposits, setDeposits] = useState(0);
    const ncRef = task.nc?.nodeRef || null;
    const transition = task.transitions[0] || null;
    const open = task.open && task.can.edit;

    const post = async (key, finish) => {
        if (finish && !plan.trim()) {
            setError(labels.planRequired);
            return;
        }
        setError(null);
        setBusy(key);
        try {
            await api.post(`tasks/${encodeURIComponent(task.id)}/workflow`, {
                values: field ? { [field.formsName]: plan.trim() } : {},
                transition: finish ? transition?.id : undefined,
            });
            toast.success(finish ? labels.sent : labels.saved);
            if (finish) {
                router.push('/tasks');
            }
        }
        catch (failure) {
            toast.error(failure);
        }
        finally {
            setBusy(null);
        }
    };

    const discussion = ncRef ? <CommentsPanel entityNodeRef={ncRef} title={labels.discussion} /> : null;

    return (
        <AppShell ownHeading title={fill(labels.title, { name: task.nc?.name || '' })} aside={wide ? discussion : null}>
            <div className="mb-4">
                <Link href="/tasks" className="inline-flex items-center gap-1 text-xs text-[var(--becpg-blue)]">
                    <Icon name="arrow_back" size={14} />{labels.back}
                </Link>
                <h1 className="mt-2 text-xl font-semibold text-[var(--becpg-ink)]">{fill(labels.title, { name: task.nc?.name || '' })}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--becpg-muted)]">
                    {task.dueDate ? <span>{fill(labels.due, { date: new Date(task.dueDate).toLocaleDateString(lang.replace('_', '-')) })}</span> : null}
                    {task.late ? <StatusPill status="late" size="sm" /> : null}
                </div>
            </div>

            <NcSummary task={task} labels={labels} lang={lang} />

            <Card className="mb-4" icon="edit_note" title={labels.plan}>
                {open ? (
                    <>
                        <p className="mb-2 text-sm text-[var(--becpg-muted)]">{labels.planHelp}</p>
                        <Textarea
                            rows={8}
                            aria-label={labels.plan}
                            aria-required="true"
                            value={plan}
                            onChange={(event) => setPlan(event.target.value)}
                            invalid={Boolean(error)}
                        />
                        {error ? <p role="alert" className="mt-1 text-sm text-[var(--status-danger)]">{error}</p> : null}
                    </>
                ) : (
                    <p className="whitespace-pre-line text-sm">{plan || labels.closed}</p>
                )}
            </Card>

            {ncRef ? (
                <Card className="mb-4" icon="attach_file" title={labels.files} subtitle={labels.filesHelp}>
                    {open ? <DocumentUpload entityRef={ncRef} onUploaded={() => setDeposits((value) => value + 1)} className="mb-3" /> : null}
                    <DepositedDocuments entityNodeRef={ncRef} refreshKey={deposits} bare />
                </Card>
            ) : null}

            {open ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button variant="outline" icon="save" loading={busy === 'save'} onClick={() => post('save', false)}>{labels.save}</Button>
                    <Button icon="send" loading={busy === 'send'} disabled={!transition} onClick={() => post('send', true)}>{labels.send}</Button>
                </div>
            ) : null}

            {!wide && discussion ? <div className="mt-4">{discussion}</div> : null}
        </AppShell>
    );
}
