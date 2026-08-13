'use client';

/**
 * `/tasks/[id]` — **the task router** (spec §4.2).
 *
 * A supplier task is not a screen, it is a *deliverable*: beCPG stores an URL on
 * it and that URL is what says what has to be done. `lib/adapters/tasks.js`
 * already parses it — **without ever rewriting it** — and hands over a
 * `type`, a `wizardId` and an `entityNodeRef`. This page does one thing with
 * them: it dispatches.
 *
 * | `task.type` | screen |
 * |---|---|
 * | `wizard` | `<Wizard>` — the assistant, spec §4.4 |
 * | `signature` | `<SignatureFlow>` — the PDF viewer + consent, spec §9.2 |
 * | `document` | `<DocumentsStep>` — a deposit, nothing else |
 * | `review` | `<ReviewStep>` — the sheet, read-only |
 *
 * ## Invariant I1 (spec §7.2), the routing half
 *
 * The deliverable URL is, and stays,
 * `/share/page/wizard?id=supplier-{type}&nodeRef={entity}`: it is what
 * `SupplierSecurityPlugin` matches to grant write access, and it is written into
 * project templates already instantiated in production. So the portal
 * **recognises** it and routes internally, and **never** rewrites it:
 *
 * - `app/share/page/wizard/page.js` answers that exact URL and redirects into
 *   the portal (`/tasks?entity=…`, then this page);
 * - the `wizardId` used here is the one **parsed out of the deliverable**
 *   (`task.wizardId`), never one recomputed from the entity type when the
 *   deliverable knows better;
 * - nothing in this file, or under `components/wizard/`, ever touches
 *   `task.url`.
 *
 * A task whose type is `wizard` but which carries no entity is not a wizard: the
 * deliverable is broken, and the honest answer is the read-only view of whatever
 * entity we do know, not a blank assistant.
 */

import { Suspense, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { Wizard } from '@/components/wizard/Wizard';
import { ReviewStep } from '@/components/wizard/steps/ReviewStep';
import { DocumentsStep } from '@/components/wizard/steps/DocumentsStep';
import { SignatureFlow } from '@/components/signature/SignatureFlow';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { Button } from '@/components/ui/Button';
import { CommentsPanel } from '@/components/wizard/panels/CommentsPanel';
import { TaskActions } from '@/components/tasks/TaskActions';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        loading: 'Tâche',
        notFound: 'Tâche introuvable',
        notFoundHint:
            'Cette tâche n’existe plus, a déjà été traitée, ou ne fait pas partie de votre périmètre.',
        back: 'Mes tâches',
        noEntity: 'Cette tâche ne désigne aucune fiche',
        noEntityHint:
            'Le livrable associé à cette tâche ne référence aucun produit. Contactez votre client via la discussion du projet.',
        documents: 'Documents à fournir',
        viewDocument: 'Consulter le document',
        due: 'À rendre le {date}',
        late: 'En retard',
        done: 'Terminée',
        discussion: 'Discussion',
    },
    en: {
        loading: 'Task',
        notFound: 'Task not found',
        notFoundHint: 'This task no longer exists, has already been handled, or is not part of your scope.',
        back: 'My tasks',
        noEntity: 'This task points at no sheet',
        noEntityHint:
            'The deliverable attached to this task references no product. Contact your customer through the project discussion.',
        documents: 'Documents to provide',
        viewDocument: 'View the document',
        due: 'Due on {date}',
        late: 'Late',
        done: 'Completed',
        discussion: 'Discussion',
    },
};

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])),
    );
}

/**
 * The header shown above the screens that are not the wizard (the wizard draws
 * its own, with the step navigation).
 */
function TaskHeader({ task, labels, lang, onDone }) {
    return (
        <Card padding="md" className="mb-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <h1 className="truncate text-lg font-medium text-[var(--becpg-blue)]">{task.name}</h1>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[var(--becpg-dark-grey)]">
                        {task.entity && task.entity.name ? <span>{task.entity.name}</span> : null}
                        {task.entity && task.entity.code ? <span>{task.entity.code}</span> : null}
                        {task.dueDate ? <span>{fill(labels.due, { date: formatDate(task.dueDate, lang) })}</span> : null}
                    </p>
                </div>
                <div className="shrink-0">
                    {task.isLate ? (
                        <StatusPill status="late" tone="danger" size="sm" label={labels.late} />
                    ) : !task.isOpen ? (
                        <StatusPill status="completed" tone="ok" size="sm" label={labels.done} />
                    ) : null}
                </div>
            </div>
            {task.description ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--becpg-blue)]/90">{task.description}</p>
            ) : null}
            {/* The wizard and the signature flow close their task themselves; every
                other screen goes through here — including the closure task, which
                carries no deliverable at all. */}
            <div className="mt-3 flex justify-end">
                <TaskActions task={task} onDone={onDone} />
            </div>
        </Card>
    );
}

/** `workspace://SpacesStore/<uuid>` → `<uuid>`, ce qu'attend la route de contenu. */
function uuidOf(nodeRef) {
    return String(nodeRef || '').split('/').pop();
}

function TaskRouter() {
    const params = useParams();
    const search = useSearchParams();
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;

    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    // `withWizard=1` : l'état de l'assistant est résolu côté serveur, en parallèle
    // de la tâche, et voyage avec elle. Voir la route pour les mesures.
    const task = useApi(id ? `tasks/${encodeURIComponent(id)}` : null, {
        params: { withWizard: 1 },
    });

    const step = search.get('step');
    const data = task.data;
    // Le document de la tâche, ouvert à la demande : `DocumentViewer` est une
    // modale, l'inscrire dans le flux la laisserait ouverte en permanence.
    const [viewing, setViewing] = useState(null);

    // The wizard id comes from the deliverable URL when it carries one — the
    // deliverable is the authority, not the entity type (invariant I1).
    const wizardId = useMemo(() => (data ? data.wizardId || undefined : undefined), [data]);

    if (task.error) {
        return (
            <AppShell title={labels.notFound}>
                {task.error.isNotFound ? (
                    <EmptyState
                        variant="error"
                        icon="search_off"
                        title={labels.notFound}
                        message={labels.notFoundHint}
                        actionLabel={labels.back}
                        actionHref="/tasks"
                    />
                ) : (
                    <ErrorState error={task.error} onRetry={task.refresh} />
                )}
            </AppShell>
        );
    }

    if (!data) {
        return (
            <AppShell title={labels.loading}>
                <div className="flex flex-col gap-3">
                    <SkeletonCard lines={2} />
                    <SkeletonCard lines={6} />
                </div>
            </AppShell>
        );
    }

    const entityNodeRef = data.entityNodeRef || (data.entity && data.entity.nodeRef) || null;

    /* ----------------------------------------------------------- signature */

    if (data.type === 'signature') {
        return <SignatureFlow task={data} taskId={id} entityNodeRef={entityNodeRef} backHref="/tasks" />;
    }

    /* -------------------------------------------------------------- wizard */

    if (data.type === 'wizard' && entityNodeRef) {
        return (
            <Wizard
                entityId={entityNodeRef}
                wizardId={wizardId}
                task={data}
                initialStepId={step || null}
                initialState={data.wizard || null}
                backHref="/tasks"
            />
        );
    }

    /* ------------------------------------------------------------ no entity */

    // A task can legitimately name no sheet — the empty state explains it, and
    // the header above it still carries Terminer / Refuser, so the task remains
    // actionable instead of being a dead end.
    if (!entityNodeRef) {
        return (
            <AppShell title={data.name || labels.loading}>
                <TaskHeader task={data} labels={labels} lang={lang} onDone={task.refresh} />
                <EmptyState
                    variant="empty"
                    icon="link_off"
                    title={labels.noEntity}
                    message={labels.noEntityHint}
                    actionLabel={labels.back}
                    actionHref="/tasks"
                />
            </AppShell>
        );
    }

    /* ------------------------------------------------------------ documents */

    if (data.type === 'document') {
        return (
            <AppShell title={data.name || labels.documents}>
                <TaskHeader task={data} labels={labels} lang={lang} onDone={task.refresh} />
                <DocumentsStep
                    entityNodeRef={entityNodeRef}
                    step={{
                        id: '__documents',
                        type: 'documents',
                        label: labels.documents,
                        // A document task is a deposit: read-only only when the
                        // task itself is closed. beCPG remains the authority and
                        // refuses the write anyway (spec §6.2).
                        readOnly: !data.isOpen,
                        frozen: false,
                    }}
                    readOnlyReason={data.isOpen ? null : 'noAssignedTask'}
                />
            </AppShell>
        );
    }

    /* --------------------------------------------------------------- review */

    /*
     * La relecture est l'écran d'un **interne** : la tâche « Validation » du
     * modèle de projet fournisseur lui échoit, et il y relit ce que le
     * fournisseur a saisi avant de terminer ou de refuser.
     *
     * La discussion est donc à côté de la fiche, et pas ailleurs. Sans elle,
     * « signaler une coquille » voulait dire quitter la tâche, retrouver la
     * fiche depuis `/messages`, écrire, revenir — ou refuser la tâche en
     * espérant que le motif se devine (`TaskActions` le dit lui-même : le motif
     * d'un refus n'est pas enregistré sur la tâche).
     *
     * Le fil est celui de l'entité : le même que celui du portail fournisseur et
     * celui de Share (spec §7.1). Une remarque écrite ici est lue par le
     * fournisseur dans son assistant, à l'endroit exact où il a saisi.
     */
    return (
        <AppShell
            title={data.name || labels.loading}
            fullWidth
            aside={
                <div className="hidden lg:block">
                    <CommentsPanel entityNodeRef={entityNodeRef} title={labels.discussion} />
                </div>
            }
        >
            <TaskHeader task={data} labels={labels} lang={lang} onDone={task.refresh} />
            {/*
                LE DOCUMENT SE LIT, IL NE SE TÉLÉCHARGE PAS SEULEMENT.

                Une tâche de validation de signature nomme le fichier signé. Sans
                visionneuse, la relire supposait de la télécharger, l'ouvrir
                ailleurs, puis revenir décider — pour une action dont tout
                l'objet est de regarder ce document.
            */}
            {data.documentNodeRef ? (
                <div className="mb-4">
                    <Button
                        variant="outline"
                        icon="visibility"
                        onClick={() => setViewing({
                            nodeRef: data.documentNodeRef,
                            name: data.name || '',
                            // `DocumentViewer` lit le contenu par le portail, jamais
                            // par Alfresco — voir `lib/adapters/documents.js`.
                            downloadUrl: `/api/v1/documents/${encodeURIComponent(uuidOf(data.documentNodeRef))}/content`,
                        })}
                    >
                        {labels.viewDocument}
                    </Button>
                </div>
            ) : null}
            <DocumentViewer document={viewing} onClose={() => setViewing(null)} />
            <ReviewStep entityId={entityNodeRef} wizardId={wizardId} />
            {/* Sous `lg` il n'y a pas de colonne latérale : le fil passe sous la
                fiche plutôt que de disparaître. */}
            <div className="mt-4 lg:hidden">
                <CommentsPanel entityNodeRef={entityNodeRef} title={labels.discussion} />
            </div>
        </AppShell>
    );
}

export default function TaskPage() {
    return (
        <Suspense
            fallback={
                <AppShell>
                    <SkeletonCard lines={6} />
                </AppShell>
            }
        >
            <TaskRouter />
        </Suspense>
    );
}
