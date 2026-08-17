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

/** `workspace://SpacesStore/<uuid>` → `<uuid>`, what the content route expects. */
function uuidOf(nodeRef) {
    return String(nodeRef || '').split('/').pop();
}

function TaskRouter() {
    const params = useParams();
    const search = useSearchParams();
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;

    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    // `withWizard=1`: the wizard state is resolved on the server, in parallel with
    // the task, and travels with it. See the route for the measurements.
    const task = useApi(id ? `tasks/${encodeURIComponent(id)}` : null, {
        params: { withWizard: 1 },
    });

    const step = search.get('step');
    const data = task.data;
    // The task document, opened on demand: `DocumentViewer` is a modal, putting it
    // in the flow would leave it permanently open.
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
     * The review is an internal user's screen: the « Validation » task of the
     * supplier project template falls to him, and there he reads back what the
     * supplier entered before completing or refusing.
     *
     * The discussion therefore sits next to the sheet, and nowhere else. Without
     * it, reporting a typo meant leaving the task, finding the sheet again from
     * `/messages`, writing, coming back — or refusing the task and hoping the
     * reason would be guessed (`TaskActions` says so itself: the reason for a
     * refusal is not recorded on the task).
     *
     * The thread is the entity's: the same one as in the supplier portal and in
     * Share (spec §7.1). A remark written here is read by the supplier in his
     * wizard, at the exact place where he entered the data.
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
                THE DOCUMENT IS READ, NOT ONLY DOWNLOADED.

                A signature validation task names the signed file. Without a
                viewer, reading it back meant downloading it, opening it
                somewhere else, then coming back to decide — for an action whose
                whole point is to look at that document.
            */}
            {data.documentNodeRef ? (
                <div className="mb-4">
                    <Button
                        variant="outline"
                        icon="visibility"
                        onClick={() => setViewing({
                            nodeRef: data.documentNodeRef,
                            name: data.name || '',
                            // `DocumentViewer` reads the content through the portal,
                            // never through Alfresco — see `lib/adapters/documents.js`.
                            downloadUrl: `/api/v1/documents/${encodeURIComponent(uuidOf(data.documentNodeRef))}/content`,
                        })}
                    >
                        {labels.viewDocument}
                    </Button>
                </div>
            ) : null}
            <DocumentViewer document={viewing} onClose={() => setViewing(null)} />
            <ReviewStep entityId={entityNodeRef} wizardId={wizardId} />
            {/* Below `lg` there is no side column: the thread moves under the
                sheet rather than disappearing. */}
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
