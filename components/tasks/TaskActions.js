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
import { ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/providers/ToastProvider';
import { useMessages } from '@/lib/messages';
import { api } from '@/lib/client';

const LABELS = {
    fr: {
        complete: 'Terminer la tâche',
        refuse: 'Refuser',
        completeTitle: 'Terminer cette tâche ?',
        completeMessage:
            'La tâche sera marquée comme terminée et le projet passera à l’étape suivante.',
        refuseTitle: 'Refuser cette tâche ?',
        refuseMessage:
            'Le projet repartira à l’étape prévue par le circuit de refus. Expliquez le motif dans la discussion du projet : il n’est pas enregistré sur la tâche.',
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
            'The project goes back to the step the refusal path defines. Explain the reason in the project discussion: it is not stored on the task.',
        completed: 'Task completed.',
        refused: 'Task refused.',
    },
};

/**
 * @param {Object} props
 * @param {Object} props.task the normalised task of `GET /api/v1/tasks/{id}`
 * @param {Function} [props.onDone] called after a successful action, before navigating
 * @param {string} [props.backHref='/tasks'] where to go once the task is closed
 */
export function TaskActions({ task, onDone, backHref = '/tasks' }) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const toast = useToast();
    const router = useRouter();
    const [pending, setPending] = useState(null);
    const [confirming, setConfirming] = useState(null);

    if (!task || !task.isOpen) {
        return null;
    }

    const taskId = encodeURIComponent(task.uuid || task.id);

    const run = async (action) => {
        setPending(action);
        try {
            await api.post(`tasks/${taskId}/${action}`);
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
                        onClick={() => setConfirming('refuse')}
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

            <ConfirmModal
                open={confirming !== null}
                onClose={() => setConfirming(null)}
                onConfirm={() => run(confirming)}
                tone={confirming === 'refuse' ? 'danger' : 'primary'}
                title={confirming === 'refuse' ? labels.refuseTitle : labels.completeTitle}
                message={confirming === 'refuse' ? labels.refuseMessage : labels.completeMessage}
                confirmLabel={confirming === 'refuse' ? labels.refuse : labels.complete}
            />
        </>
    );
}
