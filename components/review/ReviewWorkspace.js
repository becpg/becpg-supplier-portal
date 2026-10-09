'use client';

/**
 * The review of a supplier sheet by the customer — the « Validation » task of a
 * referencing project, as an internal reviewer works it.
 *
 * One section at a time, chosen in a rail that says for each one whether it is
 * accepted, sent back or still to read. Each section opens on what changed since
 * the reference the customer last validated (`/entities/{id}/review-diff`), then
 * shows the section itself, read only, with the same renderers as everywhere.
 * The reviewer accepts a section or asks for a correction; the corrections build
 * the message the supplier receives when the task is sent back.
 *
 * The decision stays the workflow's: « Valider la fiche » completes the task and
 * « Renvoyer au fournisseur » refuses it, with the message as its reason, through
 * the same routes as `TaskActions`. The marks of the review are the reviewer's
 * own work in progress, kept in this browser only.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ButtonGroup, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { Textarea } from '@/components/ui/Field';
import { ConfirmModal, Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/providers/ToastProvider';
import { RichText } from '@/components/ui/RichText';
import { FormStep } from '@/components/wizard/steps/FormStep';
import { DataListStep } from '@/components/wizard/steps/DataListStep';
import { SurveyStep } from '@/components/wizard/steps/SurveyStep';
import { ComplianceStep } from '@/components/wizard/steps/ReviewStep';
import { RequirementChecklist } from '@/components/documents/RequirementChecklist';
import { DepositedDocuments } from '@/components/documents/DepositedDocuments';
import { CommentsPanel } from '@/components/wizard/panels/CommentsPanel';
import { ListIcon } from '@/components/ui/ListIcon';
import { ReviewChanges, changesOfStep, useStepLabels } from '@/components/review/ReviewChanges';
import { AiPrecheck, checksBySection, usePrecheck } from '@/components/review/AiPrecheck';
import { api, useApi } from '@/lib/client';
import { portalCatalogs } from '@/lib/catalogs';
import { formatDate } from '@/lib/format';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/review/ReviewWorkspace#LABELS', {
    fr: {
        due: 'À rendre le {date}',
        late: 'En retard',
        comparedBranch: 'Comparée à la fiche validée',
        comparedVersion: 'Comparée à la version {label} du {date}',
        noReference: 'Première version : rien à comparer',
        progress: '{done} section(s) sur {total} relue(s)',
        validateHint: '« Valider la fiche » s’active quand chaque section est acceptée',
        sendBack: 'Renvoyer au fournisseur ({count})',
        validate: 'Valider la fiche',
        sections: 'Sections à relire',
        compliance: 'Conformité',
        accepted: 'acceptée',
        returned: 'correction demandée',
        toRead: 'à relire',
        legendAccepted: 'acceptée',
        legendReturned: 'correction demandée',
        legendChanged: 'changements depuis la référence',
        aiPoints: 'points relevés par l’IA',
        frozen: 'Liste validée',
        accept: 'Accepter et passer à la suite',
        acceptLast: 'Accepter',
        askCorrection: 'Demander une correction',
        correctionPlaceholder: 'Ce que le fournisseur doit corriger dans cette section…',
        addRemark: 'Ajouter au retour',
        cancel: 'Annuler',
        returnTitle: 'Retour au fournisseur',
        returnEmpty: 'Aucune correction demandée. Signalez une ligne, ou demandez une correction sur une section.',
        remove: 'Retirer',
        messageLabel: 'Message envoyé au fournisseur',
        messageIntro: 'Bonjour,\n\nAvant validation de la fiche « {name} », merci de corriger :',
        messageOutro: '\n\nCordialement,',
        sendBackTitle: 'Renvoyer la fiche au fournisseur ?',
        sendBackConfirm: 'Renvoyer',
        validateTitle: 'Valider la fiche ?',
        validateMessage: 'La tâche est terminée et le projet passe à l’étape suivante.',
        sent: 'Fiche renvoyée au fournisseur.',
        validated: 'Fiche validée.',
        discussion: 'Échanges avec le fournisseur',
        closed: 'Cette tâche est terminée : la relecture est en lecture seule.',
    },
    en: {
        due: 'Due {date}',
        late: 'Late',
        comparedBranch: 'Compared with the validated sheet',
        comparedVersion: 'Compared with version {label} of {date}',
        noReference: 'First version: nothing to compare',
        progress: '{done} of {total} section(s) reviewed',
        validateHint: '“Validate the sheet” turns on once every section is accepted',
        sendBack: 'Send back to the supplier ({count})',
        validate: 'Validate the sheet',
        sections: 'Sections to review',
        compliance: 'Compliance',
        accepted: 'accepted',
        returned: 'correction requested',
        toRead: 'to review',
        legendAccepted: 'accepted',
        legendReturned: 'correction requested',
        legendChanged: 'changes since the reference',
        aiPoints: 'points raised by the AI',
        frozen: 'Validated list',
        accept: 'Accept and go on',
        acceptLast: 'Accept',
        askCorrection: 'Request a correction',
        correctionPlaceholder: 'What the supplier must correct in this section…',
        addRemark: 'Add to the feedback',
        cancel: 'Cancel',
        returnTitle: 'Feedback to the supplier',
        returnEmpty: 'No correction requested. Flag a row, or request a correction on a section.',
        remove: 'Remove',
        messageLabel: 'Message sent to the supplier',
        messageIntro: 'Hello,\n\nBefore the sheet “{name}” can be validated, please correct:',
        messageOutro: '\n\nKind regards,',
        sendBackTitle: 'Send the sheet back to the supplier?',
        sendBackConfirm: 'Send back',
        validateTitle: 'Validate the sheet?',
        validateMessage: 'The task is completed and the project moves to its next step.',
        sent: 'Sheet sent back to the supplier.',
        validated: 'Sheet validated.',
        discussion: 'Exchanges with the supplier',
        closed: 'This task is closed: the review is read only.',
    },
});

/** The pseudo-section of the catalogues and mandatory documents, after the steps. */
const COMPLIANCE_ID = '__compliance';
const ACCEPTED = 'accepted';
/** beCPG's datalist states: locked once accepted, open to the supplier otherwise. */
const LIST_ACCEPTED = 'Valid';
const LIST_OPEN = 'ToValidate';
const RETURNED = 'returned';

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) => (vars[key] ?? match));
}

/** The review marks of one task, kept in this browser as the reviewer works. */
function useReviewMarks(taskId) {
    const key = `becpg_portal_review_${taskId}`;
    const [marks, setMarks] = useState({ status: {}, remarks: [] });
    const [loadedFor, setLoadedFor] = useState(null);
    if (loadedFor !== key) {
        setLoadedFor(key);
        try {
            const stored = typeof window === 'undefined' ? null : JSON.parse(window.localStorage.getItem(key) || 'null');
            setMarks(stored && typeof stored === 'object' ? { status: stored.status || {}, remarks: stored.remarks || [] } : { status: {}, remarks: [] });
        }
        catch {
            setMarks({ status: {}, remarks: [] });
        }
    }
    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(marks));
        }
        catch {
            // Private window or blocked storage: the review simply is not kept.
        }
    }, [key, marks]);
    return [marks, setMarks];
}

function RailItem({ section, current, status, changes, aiPoints, labels, onSelect }) {
    const icon = status === ACCEPTED ? 'check_circle' : status === RETURNED ? 'reply' : 'radio_button_unchecked';
    const tone = status === ACCEPTED ? 'text-[var(--status-ok)]' : status === RETURNED ? 'text-[var(--becpg-orange-deep)]' : 'text-[var(--becpg-muted)]';
    const word = status === ACCEPTED ? labels.accepted : status === RETURNED ? labels.returned : labels.toRead;
    return (
        <button
            type="button"
            onClick={() => onSelect(section.id)}
            aria-current={current ? 'true' : undefined}
            className={`grid w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2.5 py-2 text-start text-sm ${
                current ? 'bg-[var(--becpg-blue)] text-white' : 'hover:bg-[var(--becpg-teal-wash)]'
            }`}
        >
            <Icon name={icon} size={18} className={current ? 'text-white' : tone} />
            <span className="min-w-0 truncate">
                {section.label}
                <span className="sr-only-text">{` (${word})`}</span>
            </span>
            <span className="inline-flex items-center gap-1">
                {aiPoints > 0 ? (
                    <span
                        title={labels.aiPoints}
                        className={`inline-flex items-center gap-0.5 rounded-full px-1.5 text-[11px] leading-[18px] tabular-nums ${current ? 'bg-white/20 text-white' : 'bg-[var(--status-warn-bg)] text-[var(--status-warn)]'}`}
                    >
                        <Icon name="auto_awesome" size={11} />{aiPoints}
                        <span className="sr-only-text">{` ${labels.aiPoints}`}</span>
                    </span>
                ) : null}
                {changes > 0 ? (
                    <span className={`rounded-full px-1.5 text-[11px] leading-[18px] tabular-nums ${current ? 'bg-white/20 text-white' : 'bg-[var(--status-info-bg)] text-[var(--status-info)]'}`}>
                        {changes}
                    </span>
                ) : null}
            </span>
        </button>
    );
}

function SectionBody({ section, entityNodeRef, params, requirements, catalogs }) {
    if (section.id === COMPLIANCE_ID) {
        return (
            <ComplianceStep
                catalogs={portalCatalogs((catalogs.data && catalogs.data.catalogs) || [])}
                score={catalogs.data ? catalogs.data.score : null}
                loading={catalogs.loading}
                error={catalogs.error}
                onRetry={catalogs.refresh}
                documentSummary={requirements.data ? requirements.data.summary : null}
            />
        );
    }
    const step = { ...section.step, readOnly: true };
    if (step.type === 'form') {
        return <FormStep entityId={entityNodeRef} step={step} params={params} autoSave={null} consultation />;
    }
    if (step.type === 'survey') {
        return <SurveyStep entityId={entityNodeRef} step={step} params={params} autoSave={null} consultation />;
    }
    if (step.type === 'documents') {
        return (
            <RequirementChecklist
                groups={requirements.data ? requirements.data.groups : undefined}
                summary={requirements.data ? requirements.data.summary : null}
                loading={requirements.loading}
                error={requirements.error}
                onRetry={requirements.refresh}
                groupByEntity={false}
                headless
                readOnly
            >
                <DepositedDocuments entityNodeRef={entityNodeRef} bare className="mt-3" />
            </RequirementChecklist>
        );
    }
    return <DataListStep entityId={entityNodeRef} step={step} params={params} autoSave={null} consultation untitled />;
}

function CorrectionBox({ labels, onAdd, onCancel }) {
    const [text, setText] = useState('');
    return (
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--becpg-orange-deep)]/40 bg-[var(--status-warn-bg)] p-3">
            <Textarea rows={3} value={text} placeholder={labels.correctionPlaceholder} onChange={(event) => setText(event.target.value)} autoFocus />
            <ButtonGroup>
                <Button variant="outline" size="sm" onClick={onCancel}>{labels.cancel}</Button>
                <Button variant="primary" size="sm" icon="reply" disabled={!text.trim()} onClick={() => onAdd(text.trim())}>{labels.addRemark}</Button>
            </ButtonGroup>
        </div>
    );
}

function FeedbackCard({ remarks, labels, onRemove }) {
    return (
        <Card title={labels.returnTitle} icon="reply" animate={false}>
            {remarks.length === 0 ? (
                <p className="text-sm text-[var(--becpg-muted)]">{labels.returnEmpty}</p>
            ) : (
                <ul className="flex flex-col gap-2">
                    {remarks.map((remark) => (
                        <li key={remark.id} className="flex items-start gap-2 rounded-lg border border-[var(--becpg-line)] p-2 text-sm">
                            <span className="min-w-0 flex-1">
                                <span className="block text-xs text-[var(--becpg-muted)]">{remark.where}</span>
                                {remark.text}
                            </span>
                            <button type="button" onClick={() => onRemove(remark.id)} className="rounded p-1 text-[var(--becpg-muted)] hover:bg-[var(--becpg-grey)]" aria-label={labels.remove}>
                                <Icon name="close" size={16} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

/** The message the supplier receives, built from the corrections, editable before sending. */
function composeMessage(remarks, entityName, labels) {
    const lines = remarks.map((remark) => `• ${remark.where} : ${remark.text}`);
    return `${fill(labels.messageIntro, { name: entityName || '' })}\n${lines.join('\n')}${labels.messageOutro}`;
}

function ReviewHeader({ task, diff, done, total, remarks, canValidate, labels, lang, onSendBack, onValidate }) {
    const reference = diff.data?.reference;
    const comparison = diff.loading ? null : reference
        ? (reference.kind === 'branch'
            ? labels.comparedBranch
            : fill(labels.comparedVersion, { label: reference.label, date: formatDate(reference.createdAt, lang) }))
        : labels.noReference;
    const ratio = total > 0 ? Math.round((done / total) * 100) : 0;
    return (
        <Card padding="md" className="mb-4">
            <div className="grid grid-cols-1 items-center gap-x-6 gap-y-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                    <h1 className="flex flex-wrap items-baseline gap-x-2 text-lg font-medium text-[var(--becpg-ink)] sm:text-xl">
                        <span className="min-w-0 break-words">{task.entity?.name || task.name}</span>
                        <small className="text-[0.8125rem] font-normal text-[var(--becpg-muted)]">{[task.entity?.code, task.name].filter(Boolean).join(' · ')}</small>
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {task.dueDate ? (
                            <StatusPill status={task.isLate ? 'late' : 'pending'} tone={task.isLate ? 'danger' : 'info'} size="sm" icon="schedule"
                                label={task.isLate ? labels.late : fill(labels.due, { date: formatDate(task.dueDate, lang) })} />
                        ) : null}
                        {comparison ? <span className="pill pill-sm pill-no-dot pill-neutral"><Icon name="history" size={13} />{comparison}</span> : null}
                    </div>
                    {task.description ? <RichText value={task.description} className="mt-2 text-sm text-[var(--becpg-ink)]/90" /> : null}
                </div>
                {task.isOpen ? (
                    <div className="flex flex-wrap justify-end gap-2">
                        {task.isRefusedEnabled ? (
                            <Button variant="outline" icon="reply" onClick={onSendBack} disabled={remarks === 0}>
                                {fill(labels.sendBack, { count: remarks })}
                            </Button>
                        ) : null}
                        <Button variant="primary" icon="verified" onClick={onValidate} disabled={!canValidate}>{labels.validate}</Button>
                    </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--becpg-muted)] lg:col-span-2">
                    <span className="font-medium text-[var(--becpg-ink)]">{fill(labels.progress, { done, total })}</span>
                    <span className="relative h-1.5 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-[var(--becpg-grey)]" aria-hidden="true">
                        <span className="absolute inset-y-0 start-0 rounded-full bg-[var(--status-ok)]" style={{ width: `${ratio}%` }} />
                    </span>
                    {task.isOpen ? <span>{labels.validateHint}</span> : <span>{labels.closed}</span>}
                </div>
            </div>
        </Card>
    );
}

/**
 * @param {Object} props
 * @param {Object} props.task the task of `GET /api/v1/tasks/{id}`
 * @param {string} props.taskId the task id of the route
 * @param {string} props.entityNodeRef the sheet under review
 * @param {string} [props.wizardId]
 * @param {Function} [props.onDone] after the task was completed or refused
 */
export function ReviewWorkspace({ task, taskId, entityNodeRef, wizardId, onDone }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const toast = useToast();
    const router = useRouter();

    const wizard = useApi(entityNodeRef ? `wizard/${encodeURIComponent(entityNodeRef)}` : null, { params: { wizardId } });
    const diff = useApi(entityNodeRef ? `entities/${encodeURIComponent(entityNodeRef)}/review-diff` : null, { params: { wizardId } });
    const catalogs = useApi(entityNodeRef ? `entities/${encodeURIComponent(entityNodeRef)}/catalogs` : null);
    const requirements = useApi(entityNodeRef ? 'documents/requirements' : null, { params: { entity: entityNodeRef } });
    const precheck = usePrecheck({ entityNodeRef, taskId: task.workflowTaskId });
    const [marks, setMarks] = useReviewMarks(taskId);
    const [currentId, setCurrentId] = useState(null);
    const [correcting, setCorrecting] = useState(false);
    const [confirming, setConfirming] = useState(null);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    const sections = useMemo(() => {
        const steps = (wizard.data && wizard.data.steps) || [];
        return [
            ...steps.map((step) => ({ id: step.id, label: step.label || step.title || step.id, step, frozen: Boolean(step.frozen) })),
            { id: COMPLIANCE_ID, label: labels.compliance, step: null, frozen: false },
        ];
    }, [wizard.data, labels]);
    const current = sections.find((section) => section.id === currentId) || sections[0];
    const params = useMemo(() => ({ wizardId: wizard.data ? wizard.data.wizardId : wizardId }), [wizard.data, wizardId]);
    const fieldLabels = useStepLabels(entityNodeRef, current?.step || null, params);
    const done = sections.filter((section) => marks.status[section.id]).length;
    const allAccepted = sections.length > 0 && sections.every((section) => marks.status[section.id] === ACCEPTED);

    const setStatus = useCallback((id, status) => setMarks((value) => ({ ...value, status: { ...value.status, [id]: status } })), [setMarks]);
    const addRemark = useCallback((section, text, where) => {
        setMarks((value) => ({
            status: { ...value.status, [section.id]: RETURNED },
            remarks: [...value.remarks, { id: `${Date.now()}-${value.remarks.length}`, section: section.id, where: where || section.label, text }],
        }));
    }, [setMarks]);
    const removeRemark = useCallback((id) => setMarks((value) => ({ ...value, remarks: value.remarks.filter((remark) => remark.id !== id) })), [setMarks]);

    /*
     * Accepting a section locks its list in beCPG (`Valid`), as Share's list state
     * toggle does: when the sheet goes back to the supplier, only what was not
     * accepted stays open to him. A correction on a locked list reopens it.
     */
    const setListState = useCallback(async (section, state) => {
        const list = section.step?.listNodeRef;
        if (!list || !task.isOpen) {
            return;
        }
        try {
            await api.post(`entities/${encodeURIComponent(entityNodeRef)}/lists/state`, { list, state });
            wizard.refresh();
        }
        catch (error) {
            toast.error(error);
        }
    }, [entityNodeRef, task.isOpen, toast, wizard]);

    const correct = (section, text, where) => {
        addRemark(section, text, where);
        if (section.frozen) {
            setListState(section, LIST_OPEN);
        }
    };

    const acceptAndNext = () => {
        setStatus(current.id, ACCEPTED);
        setCorrecting(false);
        if (!current.frozen) {
            setListState(current, LIST_ACCEPTED);
        }
        const index = sections.findIndex((section) => section.id === current.id);
        const next = sections.slice(index + 1).find((section) => !marks.status[section.id]);
        if (next) {
            setCurrentId(next.id);
        }
    };

    const decide = async (action) => {
        setBusy(true);
        try {
            await api.post(`tasks/${encodeURIComponent(task.uuid || task.id)}/${action}`,
                action === 'refuse' ? { comment: message.trim() } : undefined);
            toast.success(action === 'refuse' ? labels.sent : labels.validated);
            setMarks({ status: {}, remarks: [] });
            onDone?.();
            router.push('/tasks');
        }
        catch (error) {
            toast.error(error);
        }
        finally {
            setBusy(false);
            setConfirming(null);
        }
    };

    if (wizard.error) {
        return <ErrorState error={wizard.error} onRetry={wizard.refresh} />;
    }
    if (!wizard.data) {
        return <div className="flex flex-col gap-3"><SkeletonCard lines={3} /><SkeletonCard lines={8} /></div>;
    }

    const sectionChanges = (section) => changesOfStep(diff.data, section.step);
    const aiPoints = checksBySection(precheck.data, sections);
    const isLast = sections[sections.length - 1]?.id === current.id;

    return (
        <>
            <ReviewHeader
                task={task}
                diff={diff}
                done={done}
                total={sections.length}
                remarks={marks.remarks.length}
                canValidate={allAccepted}
                labels={labels}
                lang={lang}
                onSendBack={() => { setMessage(composeMessage(marks.remarks, task.entity?.name, labels)); setConfirming('refuse'); }}
                onValidate={() => setConfirming('complete')}
            />
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[13.5rem_minmax(0,1fr)] 2xl:grid-cols-[13.5rem_minmax(0,1fr)_22rem]">
                <nav aria-label={labels.sections} className="rounded-2xl border border-[var(--becpg-line)] bg-white p-2 shadow-[var(--becpg-shadow-raised)] lg:sticky lg:top-4">
                    {sections.map((section) => (
                        <RailItem
                            key={section.id}
                            section={section}
                            current={section.id === current.id}
                            status={marks.status[section.id]}
                            changes={sectionChanges(section).count}
                            aiPoints={aiPoints[section.id] || 0}
                            labels={labels}
                            onSelect={(id) => { setCurrentId(id); setCorrecting(false); }}
                        />
                    ))}
                    <div className="mt-2 flex flex-col gap-1 border-t border-[var(--becpg-line)] px-2.5 pt-2 text-[11.5px] text-[var(--becpg-muted)]">
                        <span className="inline-flex items-center gap-1.5"><Icon name="check_circle" size={14} className="text-[var(--status-ok)]" />{labels.legendAccepted}</span>
                        <span className="inline-flex items-center gap-1.5"><Icon name="reply" size={14} className="text-[var(--becpg-orange-deep)]" />{labels.legendReturned}</span>
                        <span className="inline-flex items-center gap-1.5"><span className="rounded-full bg-[var(--status-info-bg)] px-1.5 text-[10px] text-[var(--status-info)]">n</span>{labels.legendChanged}</span>
                    </div>
                </nav>

                <section className="min-w-0 rounded-2xl border border-[var(--becpg-line)] bg-white shadow-[var(--becpg-shadow-raised)]">
                    <div className="flex flex-wrap items-center gap-2.5 border-b border-[var(--becpg-line)] px-4 py-3">
                        <h2 className="inline-flex items-center gap-2 text-base font-medium text-[var(--becpg-ink)]">
                            {current.step ? <ListIcon type={current.step.listName || current.step.type} size={18} /> : <Icon name="verified" size={18} />}
                            {current.label}
                        </h2>
                        {current.frozen ? <StatusPill status="valid" tone="ok" icon="verified" size="sm" label={labels.frozen} /> : null}
                        {marks.status[current.id] ? (
                            <StatusPill
                                status={marks.status[current.id] === ACCEPTED ? 'valid' : 'pending'}
                                tone={marks.status[current.id] === ACCEPTED ? 'ok' : 'warn'}
                                icon={marks.status[current.id] === ACCEPTED ? 'check_circle' : 'reply'}
                                size="sm"
                                label={marks.status[current.id] === ACCEPTED ? labels.accepted : labels.returned}
                            />
                        ) : null}
                    </div>
                    <div className="flex flex-col gap-4 p-4">
                        <ReviewChanges
                            changes={sectionChanges(current)}
                            loading={diff.loading}
                            fieldLabels={fieldLabels}
                            onFlag={task.isOpen ? (where, text) => correct(current, text, `${current.label} › ${where}`) : null}
                        />
                        <SectionBody section={current} entityNodeRef={entityNodeRef} params={params} requirements={requirements} catalogs={catalogs} />
                        {correcting ? (
                            <CorrectionBox labels={labels} onCancel={() => setCorrecting(false)} onAdd={(text) => { correct(current, text); setCorrecting(false); }} />
                        ) : null}
                    </div>
                    {task.isOpen ? (
                        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--becpg-line)] px-4 py-3">
                            <Button variant="outline" icon="reply" onClick={() => setCorrecting(true)} disabled={correcting}>{labels.askCorrection}</Button>
                            <Button variant="primary" icon="done_all" onClick={acceptAndNext}>{isLast ? labels.acceptLast : labels.accept}</Button>
                        </div>
                    ) : null}
                </section>

                <aside className="flex min-w-0 flex-col gap-4 lg:col-span-2 2xl:col-span-1 2xl:sticky 2xl:top-4">
                    <AiPrecheck
                        precheck={precheck}
                        sections={sections}
                        entityNodeRef={entityNodeRef}
                        onOpen={(id) => { setCurrentId(id); setCorrecting(false); }}
                        onAdd={task.isOpen ? (check, section) => {
                            const target = section || current;
                            correct(target, [check.title, check.detail].filter(Boolean).join(' : '), [target.label, check.row?.label].filter(Boolean).join(' › '));
                        } : null}
                        onUseMessage={task.isOpen ? (text) => { setMessage(text); setConfirming('refuse'); } : null}
                    />
                    <FeedbackCard remarks={marks.remarks} labels={labels} onRemove={removeRemark} />
                    <CommentsPanel entityNodeRef={entityNodeRef} title={labels.discussion} />
                </aside>
            </div>

            <Modal
                open={confirming === 'refuse'}
                onClose={busy ? () => {} : () => setConfirming(null)}
                title={labels.sendBackTitle}
                size="md"
                footer={(
                    <ButtonGroup>
                        <Button variant="outline" onClick={() => setConfirming(null)} disabled={busy}>{labels.cancel}</Button>
                        <Button variant="primary" icon="reply" loading={busy} disabled={!message.trim()} onClick={() => decide('refuse')}>{labels.sendBackConfirm}</Button>
                    </ButtonGroup>
                )}
            >
                <Textarea label={labels.messageLabel} rows={10} value={message} onChange={(event) => setMessage(event.target.value)} />
            </Modal>
            <ConfirmModal
                open={confirming === 'complete'}
                onClose={() => setConfirming(null)}
                onConfirm={() => decide('complete')}
                tone="primary"
                title={labels.validateTitle}
                message={labels.validateMessage}
                confirmLabel={labels.validate}
            />
        </>
    );
}
