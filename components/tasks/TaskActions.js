'use client';

/**
 * **Terminer / Refuser**, for the tasks that carry no assistant.
 *
 * ## Why this exists
 *
 * Only two screens could ever close a task: the wizard (its « Terminer » button)
 * and the signature flow (signing completes it). Every other task type —
 * `review`, `document` — routed to a read-only screen with **no way to act on
 * it at all**. A buyer holding the closure task of a referencing project could
 * open it and nothing more; measured on dev with `purchasingmgr.test.user`,
 * task « Clôture » of project PJ3123.
 *
 * ## What it does, and what it does not
 *
 * It posts to `…/complete` or `…/refuse` and shows what beCPG answered. It takes
 * **no decision**: whether a task may be completed (frozen lists, a blocking
 * catalog, a mandatory deliverable) and what a refusal reopens are beCPG's,
 * decided in `ProjectService` and returned as a 403 the toast prints verbatim.
 *
 * Refusal is offered only when beCPG says the workflow has a refusal path —
 * `isRefusedEnabled`, which `projectTaskInfo.get.json.ftl` computes from
 * `pjt:tlRefusedTaskRef`. A task without one shows the completion alone rather
 * than a button that would always fail.
 *
 * Both actions ask for confirmation: they move a project forward, and neither
 * has an undo in the portal.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ButtonGroup } from '@/components/ui/Button';
import { ConfirmModal, Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/providers/ToastProvider';
import { useMessages } from '@/lib/messages';
import { api } from '@/lib/client';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/tasks/TaskActions#LABELS', {
    fr: {
        complete: 'Terminer la tâche',
        refuse: 'Refuser',
        completeTitle: 'Terminer cette tâche ?',
        completeMessage:
            'La tâche sera marquée comme terminée et le projet passera à l’étape suivante.',
        refuseTitle: 'Refuser cette tâche ?',
        refuseMessage:
            'Le projet repartira à l’étape prévue par le circuit de refus. Le motif ci-dessous sera transmis au fournisseur.',
        refuseReason: 'Motif du refus',
        refuseReasonHint: 'Ce texte est envoyé au fournisseur : dites-lui ce qu’il doit corriger.',
        refuseReasonRequired: 'Un motif est nécessaire pour refuser.',
        cancel: 'Annuler',
        completed: 'Tâche terminée.',
        refused: 'Tâche refusée.',
    },
    en: {
        complete: 'Complete task',
        refuse: 'Refuse',
        completeTitle: 'Complete this task?',
        completeMessage: 'The task will be marked as done and the project moves to the next step.',
        refuseTitle: 'Refuse this task?',
        refuseMessage:
            'The project goes back to the step the refusal path defines. The reason below is sent to the supplier.',
        refuseReason: 'Reason for the refusal',
        refuseReasonHint: 'This text is sent to the supplier: tell them what to correct.',
        refuseReasonRequired: 'A reason is required to refuse.',
        cancel: 'Cancel',
        completed: 'Task completed.',
        refused: 'Task refused.',
    },
});

/**
 * @param {Object} props
 * @param {Object} props.task the normalised task of `GET /api/v1/tasks/{id}`
 * @param {Function} [props.onDone] called after a successful action, before navigating
 * @param {string} [props.backHref='/tasks'] where to go once the task is closed
 */
export function TaskActions({ task, onDone, backHref = '/tasks' }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const toast = useToast();
    const router = useRouter();
    const [pending, setPending] = useState(null);
    const [confirming, setConfirming] = useState(null);
    // The refusal reason, mandatory: see the route, which also rejects it empty.
    const [reason, setReason] = useState('');

    if (!task || !task.isOpen) {
        return null;
    }

    const taskId = encodeURIComponent(task.uuid || task.id);

    const run = async (action) => {
        setPending(action);
        try {
            await api.post(`tasks/${taskId}/${action}`,
                action === 'refuse' ? { comment: reason.trim() } : undefined);
            toast.success(action === 'complete' ? labels.completed : labels.refused);
            if (onDone) {
                onDone();
            }
            router.push(backHref);
        }
        catch (error) {
            // beCPG is the authority; its refusal is shown as it came.
            toast.error(error);
        }
        finally {
            setPending(null);
        }
    };

    return (
        <>
            <ButtonGroup>
                {task.isRefusedEnabled ? (
                    <Button
                        variant="outline"
                        icon="close"
                        loading={pending === 'refuse'}
                        disabled={Boolean(pending)}
                        onClick={() => { setReason(''); setConfirming('refuse'); }}
                    >
                        {labels.refuse}
                    </Button>
                ) : null}
                <Button
                    variant="primary"
                    icon="check"
                    loading={pending === 'complete'}
                    disabled={Boolean(pending)}
                    onClick={() => setConfirming('complete')}
                >
                    {labels.complete}
                </Button>
            </ButtonGroup>

            {/*
                LE REFUS DEMANDE SON MOTIF.

                Ce n'était qu'une confirmation, et le texte disait au client
                d'expliquer sa décision « dans la discussion du projet » — un
                endroit auquel le fournisseur n'a pas accès. Le motif est
                désormais saisi ici et transmis au moteur par la transition de
                workflow, qui le pose sur la tâche rouverte : celle du fournisseur.
            */}
            <Modal
                open={confirming === 'refuse'}
                onClose={() => setConfirming(null)}
                title={labels.refuseTitle}
                size="md"
            >
                <div className="flex flex-col gap-3">
                    <p className="text-sm text-[var(--becpg-dark-grey)]">{labels.refuseMessage}</p>
                    <Textarea
                        label={labels.refuseReason}
                        hint={labels.refuseReasonHint}
                        value={reason}
                        rows={4}
                        required
                        onChange={(event) => setReason(event.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setConfirming(null)}>
                            {labels.cancel}
                        </Button>
                        <Button
                            variant="danger"
                            icon="close"
                            loading={pending === 'refuse'}
                            disabled={!reason.trim() || Boolean(pending)}
                            onClick={() => run('refuse')}
                        >
                            {labels.refuse}
                        </Button>
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                open={confirming === 'complete'}
                onClose={() => setConfirming(null)}
                onConfirm={() => run('complete')}
                tone="primary"
                title={labels.completeTitle}
                message={labels.completeMessage}
                confirmLabel={labels.complete}
            />
        </>
    );
}
