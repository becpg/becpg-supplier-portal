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
 * A new technical sheet is not asked for here: it is deposited from the update
 * task the request opens, on the working copy the customer reviews.
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
        template: 'Type de demande',
        templatePlaceholder: 'Choisir…',
        noTemplate: 'Votre client n’a ouvert aucun type de demande aux fournisseurs. Écrivez-lui depuis Discussions.',
        reason: 'Motif de la demande',
        reasonHint: 'Nouvelle recette, nouvelle origine, nouveau site de production, nouvelle fiche technique…',
        submit: 'Envoyer la demande',
        sent: 'Demande envoyée. Une tâche de mise à jour vous a été ouverte.',
    },
    en: {
        title: 'Request an update',
        template: 'Request type',
        templatePlaceholder: 'Choose…',
        noTemplate: 'Your customer has opened no request type to suppliers. Write to them from Discussions.',
        reason: 'Reason for the request',
        reasonHint: 'New recipe, new origin, new production site, new technical sheet…',
        submit: 'Send the request',
        sent: 'Request sent. An update task has been opened for you.',
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
        setPicked('');
    }

    const send = useMutation(
        () => api.post(`entities/${encodeURIComponent(uuidOf(entityRef))}/update-request`, {
            template,
            reason: reason.trim(),
        }),
        {
            onSuccess: () => {
                toast.success(labels.sent);
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
            </div>
        </Modal>
    );
}
