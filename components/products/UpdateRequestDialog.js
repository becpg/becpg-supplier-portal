'use client';

/**
 * « Demander une mise à jour » — a supplier asks its customer to reopen one of
 * its validated sheets, or its own supplier record.
 *
 * The portal decides nothing here. The projects offered are the supplier
 * templates the supplier may read — an administrator opens one by giving
 * `GROUP_ExternalUser` a read permission on it — exactly as `GET /api/v1/process/start`
 * lists them with the supplier's own ticket. beCPG checks it again, refuses a
 * second project while one is open, and starts the whole workflow: the supplier
 * goes back through the wizard, the customer validates as for « Envoyer au
 * fournisseur ».
 *
 * The new technical sheet, when one is joined, is filed on the working copy
 * the project has just created — where the customer reviews it.
 */

import { useState } from 'react';
import { Button, ButtonGroup } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/EmptyState';
import { Field, Select, Textarea } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/providers/ToastProvider';
import { api, useApi, useMutation } from '@/lib/client';
import { defineLabels, pickLabels } from '@/lib/i18n';
import { useMessages } from '@/lib/messages';

const LABELS = defineLabels('components/products/UpdateRequestDialog#LABELS', {
    fr: {
        title: 'Demander une mise à jour',
        intro: 'Votre client reçoit la demande et la traite comme un référencement : vous recevrez une tâche pour mettre la fiche à jour, qu’il validera. Rien n’est modifié tant que ce n’est pas fait.',
        template: 'Type de demande',
        templatePlaceholder: 'Choisir…',
        noTemplate: 'Votre client n’a ouvert aucun type de demande aux fournisseurs. Écrivez-lui depuis Discussions.',
        reason: 'Motif de la demande',
        reasonHint: 'Nouvelle recette, nouvelle origine, nouveau site de production, nouvelle fiche technique…',
        file: 'Nouvelle fiche technique (facultatif)',
        submit: 'Envoyer la demande',
        sent: 'Demande envoyée. Une tâche de mise à jour vous a été ouverte.',
        sentFileFailed: 'Demande envoyée, mais la fiche technique n’a pas pu être déposée : déposez-la depuis la tâche.',
    },
    en: {
        title: 'Request an update',
        intro: 'Your customer receives the request and handles it as a referencing: you will get a task to update the sheet, which they will validate. Nothing changes until then.',
        template: 'Request type',
        templatePlaceholder: 'Choose…',
        noTemplate: 'Your customer has opened no request type to suppliers. Write to them from Discussions.',
        reason: 'Reason for the request',
        reasonHint: 'New recipe, new origin, new production site, new technical sheet…',
        file: 'New technical sheet (optional)',
        submit: 'Send the request',
        sent: 'Request sent. An update task has been opened for you.',
        sentFileFailed: 'Request sent, but the technical sheet could not be uploaded: upload it from the task.',
    },
});

/** Beyond that, a reason is a document: attach it instead. */
const MAX_REASON_LENGTH = 2000;

/**
 * @param {string} nodeRef
 * @returns {string} the uuid the portal routes take
 */
function uuidOf(nodeRef) {
    return String(nodeRef || '').split('/').pop();
}

/**
 * @param {Object} props
 * @param {{nodeRef: string, name?: string, code?: string}|null} props.entity the sheet, null when closed
 * @param {Function} props.onClose
 * @param {Function} [props.onDone] called once the request is sent
 */
export function UpdateRequestDialog({ entity, onClose, onDone }) {
    const { t, lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const toast = useToast();
    const [reason, setReason] = useState('');
    const [file, setFile] = useState(null);
    const [picked, setPicked] = useState('');

    // Only asked for while the dialog is open.
    const catalog = useApi('process/start', { enabled: Boolean(entity) });
    const templates = (catalog.data?.processes ?? []).map((entry) => ({ value: entry.nodeRef, label: entry.label || entry.id }));
    // A single template is the answer, not a question.
    const template = templates.length === 1 ? templates[0].value : picked;

    // A reason typed for one sheet must not follow the dialog to the next.
    const entityRef = entity?.nodeRef ?? null;
    const [shownFor, setShownFor] = useState(entityRef);
    if (shownFor !== entityRef) {
        setShownFor(entityRef);
        setReason('');
        setFile(null);
        setPicked('');
    }

    const send = useMutation(
        async () => {
            const result = await api.post(`entities/${encodeURIComponent(uuidOf(entityRef))}/update-request`, {
                template,
                reason: reason.trim(),
            });
            if (!file || !result?.entity) {
                return { fileFiled: true };
            }
            try {
                await api.upload('documents', file, { entityRef: result.entity });
                return { fileFiled: true };
            }
            catch (error) {
                console.warn('[update-request] technical sheet upload failed', error?.status);
                return { fileFiled: false };
            }
        },
        {
            onSuccess: (outcome) => {
                if (outcome?.fileFiled === false) {
                    toast.error(new Error(labels.sentFileFailed));
                }
                else {
                    toast.success(labels.sent);
                }
                onClose();
                onDone?.();
            },
            onError: (error) => toast.error(error),
        },
    );

    const ready = Boolean(template) && reason.trim() !== '' && !send.loading;

    return (
        <Modal
            open={Boolean(entity)}
            onClose={send.loading ? () => {} : onClose}
            title={labels.title}
            description={entity ? [entity.code, entity.name].filter(Boolean).join(' · ') : undefined}
            size="md"
            footer={
                <ButtonGroup>
                    <Button variant="outline" onClick={onClose} disabled={send.loading}>
                        {t('action.cancel')}
                    </Button>
                    <Button
                        variant="primary"
                        icon="send"
                        loading={send.loading}
                        disabled={!ready}
                        onClick={() => send.run().catch(() => {})}
                    >
                        {labels.submit}
                    </Button>
                </ButtonGroup>
            }
        >
            <p className="mb-4 text-sm leading-relaxed text-[var(--becpg-dark-grey)]">{labels.intro}</p>
            <div className="flex flex-col gap-3">
                {catalog.loading ? (
                    <Skeleton height={44} radius="0.5rem" />
                ) : catalog.error ? (
                    <ErrorState error={catalog.error} onRetry={catalog.refresh} compact />
                ) : templates.length === 0 ? (
                    <p className="rounded-lg bg-[var(--status-warn-bg)] px-3 py-2 text-sm text-[var(--status-warn)]">
                        {labels.noTemplate}
                    </p>
                ) : templates.length > 1 ? (
                    <Field label={labels.template} required id="update-request-template">
                        <Select
                            id="update-request-template"
                            options={templates}
                            placeholder={labels.templatePlaceholder}
                            value={picked}
                            onChange={(event) => setPicked(event.target.value)}
                        />
                    </Field>
                ) : null}
                <Field label={labels.reason} help={labels.reasonHint} required id="update-request-reason">
                    <Textarea
                        id="update-request-reason"
                        rows={4}
                        maxLength={MAX_REASON_LENGTH}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                    />
                </Field>
                <Field label={labels.file} id="update-request-file">
                    <input
                        id="update-request-file"
                        type="file"
                        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-[var(--becpg-blue)] file:me-3 file:rounded-lg file:border-0 file:bg-[var(--becpg-grey)] file:px-3 file:py-1.5 file:text-sm file:text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                    />
                </Field>
            </div>
        </Modal>
    );
}
