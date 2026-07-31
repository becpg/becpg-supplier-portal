'use client';

/**
 * The assistant — spec §4.4, and the redesign's centre of gravity.
 *
 * ## The order is the feature
 *
 * ```
 * 0 · Contexte      permanent side panel: cahier des charges, remarques,
 *                   listes gelées, refus précédents      → HelpPanel
 * 1 · Documents     the expected document types, first   → DocumentsStep
 * 2 · Suggestions   what the AI read in them             → SuggestionsStep
 * 3..n · Sections   the wizard definition, as configured → Form / DataList / Survey
 * n+1 · Conformité  catalogue check, gates "Terminer"    → ComplianceStep
 * ```
 *
 * Steps 3..n are **not written here**: they are whatever
 * `GET /api/v1/wizard/{entityId}` returned, in the order Share resolved
 * (contracts §1, §8). The wizard only *hoists* the configured `documents` step
 * to position 1 — that hoist is the inversion the spec asks for — and appends
 * the two surfaces the configuration has no way to express (suggestions,
 * conformity). Add a list in Share and it appears here; nothing to write.
 *
 * ## The state, in one call
 *
 * `GET /api/v1/wizard/{entityId}` performs **one** `becpg/security/entitylists/check`
 * server-side and returns every step already carrying its `frozen` and
 * `readOnly` verdict. This component **renders** that verdict and never recomputes
 * it — not from loading order, not from the DOM, not from a second call. That is
 * bug #25928, and the whole reason the endpoint is shaped that way.
 *
 * ## Autosave
 *
 * One `useAutoSave` instance for the whole wizard, whatever the step type:
 * `FormStep` schedules writes on it, the datalist steps report their own row
 * saves into it, and it is flushed before **every** navigation and before
 * completing the task. So "enregistré à HH:MM" means the same thing everywhere,
 * and leaving a step can never lose what was typed in it.
 *
 * ## Reformulation
 *
 * A step that declares `nextStepWebScript` triggers
 * `POST /api/v1/wizard/{entityId}/formulate` **when it is left** — once, in the
 * background, never blocking the UI, with a thin hint in the footer (spec §4.4).
 * Per-keystroke saves always send `formulate: false`.
 *
 * ## Mobile
 *
 * Below `xl` the stepper is a progress bar with a step selector, and the two
 * side panels become sheets one tap away. Everything is reachable at 360px.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AppShell } from '@/components/shell/AppShell';
import { Button, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { useToast } from '@/components/providers/ToastProvider';
import { WizardStepper } from '@/components/wizard/WizardStepper';
import { WizardFooter } from '@/components/wizard/WizardFooter';
import { useAutoSave } from '@/components/wizard/useAutoSave';
import { HelpPanel } from '@/components/wizard/panels/HelpPanel';
import { CommentsPanel, useDiscussion } from '@/components/wizard/panels/CommentsPanel';
import { FormStep } from '@/components/wizard/steps/FormStep';
import { DataListStep } from '@/components/wizard/steps/DataListStep';
import { SurveyStep } from '@/components/wizard/steps/SurveyStep';
import { DocumentsStep } from '@/components/wizard/steps/DocumentsStep';
import { SuggestionsStep } from '@/components/wizard/steps/SuggestionsStep';
import { ComplianceStep, blockingCatalogs } from '@/components/wizard/steps/ReviewStep';
import { api, useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { formatDate } from '@/lib/format';

const LABELS = {
    fr: {
        context: 'Contexte',
        discussion: 'Discussion',
        documents: 'Documents',
        suggestions: 'Suggestions',
        compliance: 'Conformité',
        properties: 'Propriétés',
        list: 'Liste',
        survey: 'Questionnaire',
        readOnly: 'Lecture seule',
        readOnlyReasons: {
            readAccess: 'Vous n’avez qu’un accès en lecture sur cette fiche.',
            noAssignedTask: 'Aucune tâche ne vous est assignée sur cette fiche : la saisie est fermée.',
            wizardReadOnly: 'Cet assistant est configuré en lecture seule.',
        },
        finish: 'Terminer',
        finished: 'Tâche envoyée à votre client',
        finishBlocked: 'Complétez les champs manquants de l’étape « Conformité » pour terminer.',
        notFound: 'Fiche introuvable',
        notFoundHint: 'Cette fiche n’existe pas ou ne fait pas partie de votre périmètre.',
        delegated: 'Vous saisissez au nom de {supplier}',
        due: 'À rendre le {date}',
        step: 'Étape',
    },
    en: {
        context: 'Context',
        discussion: 'Discussion',
        documents: 'Documents',
        suggestions: 'Suggestions',
        compliance: 'Compliance',
        properties: 'Properties',
        list: 'List',
        survey: 'Questionnaire',
        readOnly: 'Read only',
        readOnlyReasons: {
            readAccess: 'You only have read access on this sheet.',
            noAssignedTask: 'No task is assigned to you on this sheet: entry is closed.',
            wizardReadOnly: 'This assistant is configured as read-only.',
        },
        finish: 'Finish',
        finished: 'Task sent to your customer',
        finishBlocked: 'Fill in the missing fields of the "Compliance" step to finish.',
        notFound: 'Sheet not found',
        notFoundHint: 'This sheet does not exist, or is not part of your scope.',
        delegated: 'You are filling in on behalf of {supplier}',
        due: 'Due on {date}',
        step: 'Step',
    },
};

/** Ids of the steps the portal adds on top of the configured ones. */
const SYNTHETIC = Object.freeze({
    DOCUMENTS: '__documents',
    SUGGESTIONS: '__suggestions',
    COMPLIANCE: '__compliance',
});

/** localStorage key holding where the supplier was — "reprise exacte" (spec §4.4). */
function resumeKey(entityId) {
    return `becpg.portal.wizard.${entityId}`;
}

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])),
    );
}

/**
 * `nutList` → `Nut list`. Only ever used as a **fallback**: as soon as Share
 * resolves the wizard configuration the steps carry a translated `label`
 * (contracts §8). `DEFAULT_WIZARDS` only knows the message *key*, and a raw
 * `becpg.wizard.supplier.nutList.label` on screen would be worse than this.
 *
 * @param {string} value
 * @returns {string}
 */
function humanize(value) {
    return String(value || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[._-]+/g, ' ')
        .trim()
        .replace(/^./, (char) => char.toUpperCase());
}

/**
 * The label of a configured step, with the fallbacks the configuration forces.
 *
 * @param {Object} step
 * @param {Object} labels
 * @returns {string}
 */
function stepLabel(step, labels) {
    if (step.label) {
        return step.label;
    }
    if (step.title) {
        return step.title;
    }
    const key = step.labelId || step.titleId;
    if (key) {
        const parts = String(key).split('.');
        const candidate = parts.length > 1 ? parts[parts.length - 2] : null;
        if (candidate) {
            return humanize(candidate);
        }
    }
    if (step.listName || step.listId) {
        return humanize(step.listName || step.listId);
    }
    if (step.type === 'form') {
        return labels.properties;
    }
    if (step.type === 'documents') {
        return labels.documents;
    }
    if (step.type === 'survey') {
        return labels.survey;
    }
    return labels.list;
}

/**
 * Builds the wizard's step model: the configured steps, reordered, plus the two
 * the configuration cannot express.
 *
 * **The only reordering is the documents hoist.** Everything else keeps the
 * order Share returned.
 *
 * @param {Object} state the payload of `GET /api/v1/wizard/{entityId}`
 * @param {Object} options
 * @param {boolean} options.hasSuggestions
 * @param {Object} options.labels
 * @returns {Array<Object>} step view models
 */
export function buildStepModel(state, { hasSuggestions, labels }) {
    if (!state || !Array.isArray(state.steps)) {
        return [];
    }

    const configured = state.steps.map((step) => ({
        ...step,
        kind: step.type,
        label: stepLabel(step, labels),
    }));

    const documents = configured.filter((step) => step.type === 'documents');
    const rest = configured.filter((step) => step.type !== 'documents');

    const model = [];

    // Étape 1 — the documents come first. When the configuration declares no
    // documents step (a wizard that never asked for any), the portal still shows
    // the requirements: they are computed by beCPG on the entity, not by the
    // wizard configuration (contracts §9).
    if (documents.length > 0) {
        model.push(...documents);
    }
    else {
        model.push({
            id: SYNTHETIC.DOCUMENTS,
            type: 'documents',
            kind: 'documents',
            synthetic: true,
            label: labels.documents,
            readOnly: Boolean(state.readOnly),
            frozen: false,
        });
    }

    // Étape 2 — only when there is something to show; an instance without
    // becpg-ai must not grow an empty step.
    if (hasSuggestions) {
        model.push({
            id: SYNTHETIC.SUGGESTIONS,
            type: 'suggestions',
            kind: 'suggestions',
            synthetic: true,
            label: labels.suggestions,
            readOnly: Boolean(state.readOnly),
            frozen: false,
        });
    }

    model.push(...rest);

    // Étape n+1 — always read-only: it reports, it does not edit.
    model.push({
        id: SYNTHETIC.COMPLIANCE,
        type: 'compliance',
        kind: 'compliance',
        synthetic: true,
        label: labels.compliance,
        readOnly: true,
        frozen: false,
    });

    return model;
}

/**
 * @param {Object} props
 * @param {string} props.entityId the entity **nodeRef** (the API also accepts a uuid)
 * @param {string} [props.wizardId] `supplier-rawMaterial` — parsed from the deliverable URL
 * @param {string} [props.siteId]
 * @param {Object} [props.task] the task the wizard was opened from; enables "Terminer"
 * @param {string} [props.initialStepId] forces the resumed step
 * @param {string[]} [props.blockingCatalogIds] catalogues that gate the completion
 * @param {string} [props.backHref='/tasks']
 * @param {string} [props.className]
 */
export function Wizard({
    entityId,
    wizardId,
    siteId,
    task = null,
    initialStepId = null,
    blockingCatalogIds = null,
    backHref = '/tasks',
    className = '',
}) {
    const { lang, t } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const toast = useToast();
    const router = useRouter();
    const reduceMotion = useReducedMotion();

    /* ------------------------------------------------------------- the state */

    const params = useMemo(() => ({ wizardId, siteId }), [wizardId, siteId]);
    const state = useApi(entityId ? `wizard/${encodeURIComponent(entityId)}` : null, { params });
    const wizardState = state.data;
    const entityNodeRef = wizardState && wizardState.entity ? wizardState.entity.nodeRef : entityId;

    // becpg-ai is optional: a 503 `aiDisabled` simply means no suggestions step.
    const suggestionsCall = useApi(entityId ? `suggestions/${encodeURIComponent(entityId)}` : null);
    const suggestions = useMemo(
        () => (suggestionsCall.data && Array.isArray(suggestionsCall.data.suggestions)
            ? suggestionsCall.data.suggestions
            : []),
        [suggestionsCall.data],
    );

    /**
     * `{ 'bcpg:legalName': { confidence, confidenceLevel } }` — what the form
     * steps need to badge a label. Built from the same payload the suggestions
     * step renders, so a badge and a card can never disagree.
     */
    const suggestionsByField = useMemo(() => {
        const map = {};
        for (const suggestion of suggestions) {
            for (const change of suggestion.changes || []) {
                if (change.scope === 'entity' && change.name && !map[change.name]) {
                    map[change.name] = {
                        confidence: suggestion.confidence,
                        confidenceLevel: suggestion.confidenceLevel,
                    };
                }
            }
        }
        return map;
    }, [suggestions]);

    const commentsEnabled = Boolean(wizardState && wizardState.comments);
    const discussion = useDiscussion({ nodeRef: entityNodeRef, enabled: commentsEnabled });

    /* ------------------------------------------------------------- the steps */

    const steps = useMemo(
        () => buildStepModel(wizardState, { hasSuggestions: suggestions.length > 0, labels }),
        [wizardState, suggestions.length, labels],
    );

    // Where the supplier was, in order of authority: an explicit prop, the URL,
    // the last visit. "Reprise exacte à l'étape en cours" (spec §4.4, F2).
    // Read once, in a lazy initialiser: it is an entry condition, not a value
    // that changes while the wizard is open.
    const [resumeStepId] = useState(() => {
        if (initialStepId) {
            return initialStepId;
        }
        if (typeof window === 'undefined') {
            return '';
        }
        const fromUrl = new URLSearchParams(window.location.search).get('step');
        if (fromUrl) {
            return fromUrl;
        }
        try {
            return (entityId && window.localStorage.getItem(resumeKey(entityId))) || '';
        }
        catch {
            return '';
        }
    });

    const [nav, setNav] = useState({ currentId: null, visited: [] });

    // Derived during render rather than in an effect: an effect would paint one
    // frame of "no step" before settling (the pattern `useApi` uses too).
    if (steps.length > 0 && !steps.some((step) => step.id === nav.currentId)) {
        const target = resumeStepId && steps.some((step) => step.id === resumeStepId)
            ? resumeStepId
            : steps[0].id;
        setNav((current) => ({
            currentId: target,
            visited: current.visited.includes(target) ? current.visited : [...current.visited, target],
        }));
    }

    const currentId = nav.currentId;
    const currentIndex = steps.findIndex((step) => step.id === currentId);
    const currentStep = currentIndex >= 0 ? steps[currentIndex] : null;

    const visitedSteps = useMemo(
        () => steps.map((step) => ({ ...step, visited: nav.visited.includes(step.id) })),
        [steps, nav.visited],
    );

    /* ---------------------------------------------------------- the autosave */

    const autoSave = useAutoSave({
        onError: (error) => toast.error(error),
    });

    /* ------------------------------------------------------- side panel state */

    const [sheet, setSheet] = useState(null); // 'context' | 'comments' | null
    const [anchor, setAnchor] = useState(null);
    const [commentTargets, setCommentTargets] = useState([]);
    const [focusField, setFocusField] = useState(null);
    const [documentSummary, setDocumentSummary] = useState(null);
    const [formulating, setFormulating] = useState(false);
    const [finishing, setFinishing] = useState(false);
    const formulatingRef = useRef(false);

    // Collected from the form steps as they load: the only place the portal
    // learns which step holds which field (the definition is the authority).
    const [fieldIndex, setFieldIndex] = useState({});

    const handleDefinitionLoaded = useCallback(
        (stepId) => (definition) => {
            const entries = {};
            for (const field of (definition && definition.fields) || []) {
                if (field && field.name) {
                    entries[field.name] = { stepId, label: field.label || null };
                }
            }
            if (Object.keys(entries).length === 0) {
                return;
            }
            setFieldIndex((current) => ({ ...current, ...entries }));
        },
        [],
    );

    const labelForField = useCallback(
        (name) => (fieldIndex[name] ? fieldIndex[name].label : null),
        [fieldIndex],
    );

    /* -------------------------------------------------------- the catalogues */

    // Fetched only once the conformity step has been reached: without a
    // `catalogId` beCPG re-formulates a stale entity, which is not something to
    // trigger on the wizard's first paint.
    // Sticky *and* derived: reaching the step arms it, and it stays armed so the
    // score does not disappear when the supplier goes back to fix a field.
    const [complianceSeen, setComplianceSeen] = useState(false);
    const complianceTouched = complianceSeen || currentId === SYNTHETIC.COMPLIANCE;
    const catalogs = useApi(
        complianceTouched && entityId ? `entities/${encodeURIComponent(entityId)}/catalogs` : null,
    );
    const blocking = useMemo(
        () => blockingCatalogs((catalogs.data && catalogs.data.catalogs) || [], blockingCatalogIds),
        [catalogs.data, blockingCatalogIds],
    );

    /* -------------------------------------------------------------- movement */

    const persist = useCallback(
        (stepId) => {
            if (typeof window === 'undefined' || !entityId) {
                return;
            }
            try {
                window.localStorage.setItem(resumeKey(entityId), stepId);
            }
            catch {
                // No storage (private window): the URL still carries the step.
            }
            const url = new URL(window.location.href);
            url.searchParams.set('step', stepId);
            // `replaceState` rather than a router navigation: the URL must stay
            // shareable without re-rendering the whole tree on every step.
            window.history.replaceState(window.history.state, '', url.toString());
        },
        [entityId],
    );

    /** Reformulation between two steps — background, non-blocking (spec §4.4). */
    const runFormulation = useCallback(() => {
        if (formulatingRef.current || !entityId || (wizardState && wizardState.readOnly)) {
            return;
        }
        formulatingRef.current = true;
        setFormulating(true);
        api.post(`wizard/${encodeURIComponent(entityId)}/formulate`, null, { params })
            .then(() => {
                // The score and the computed characteristics moved.
                if (complianceTouched) {
                    catalogs.refresh();
                }
            })
            .catch(() => {
                // Deliberately silent: a background reformulation that fails must
                // not interrupt a supplier who is typing. The values are saved;
                // beCPG reformulates again on validation.
            })
            .finally(() => {
                formulatingRef.current = false;
                setFormulating(false);
            });
    }, [entityId, params, wizardState, complianceTouched, catalogs]);

    const goTo = useCallback(
        async (stepId, options = {}) => {
            if (!stepId || stepId === currentId) {
                if (options.field) {
                    setFocusField(options.field);
                }
                return;
            }
            const leaving = steps.find((step) => step.id === currentId);

            // Nothing is ever left behind: whatever is pending goes out first.
            await autoSave.flush();

            if (leaving && leaving.nextStepWebScript) {
                runFormulation();
            }

            setNav((current) => ({
                currentId: stepId,
                visited: current.visited.includes(stepId) ? current.visited : [...current.visited, stepId],
            }));
            setFocusField(options.field || null);
            setCommentTargets([]);
            persist(stepId);

            if (stepId === SYNTHETIC.COMPLIANCE) {
                setComplianceSeen(true);
            }
            if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
            }
        },
        [currentId, steps, autoSave, runFormulation, persist, reduceMotion],
    );

    const goToField = useCallback(
        (name) => {
            const known = fieldIndex[name];
            const target = known
                ? known.stepId
                : (steps.find((step) => step.type === 'form') || {}).id;
            if (target) {
                goTo(target, { field: name });
            }
        },
        [fieldIndex, steps, goTo],
    );

    const goToChange = useCallback(
        (change) => {
            if (!change) {
                return;
            }
            if (change.scope === 'datalist' && change.listName) {
                const target = steps.find(
                    (step) => step.listName === change.listName || step.listId === change.listName,
                );
                if (target) {
                    goTo(target.id);
                    return;
                }
            }
            goToField(change.name);
        },
        [steps, goTo, goToField],
    );

    const openComments = useCallback((nextAnchor) => {
        setAnchor(nextAnchor || null);
        if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
            setSheet('comments');
        }
    }, []);

    /* ---------------------------------------------------------------- finish */

    const finish = useCallback(async () => {
        if (!task) {
            return;
        }
        setFinishing(true);
        try {
            await autoSave.flush();
            await api.post(`tasks/${encodeURIComponent(task.uuid || task.id)}/complete`);
            toast.success(labels.finished);
            if (typeof window !== 'undefined' && entityId) {
                try {
                    window.localStorage.removeItem(resumeKey(entityId));
                }
                catch {
                    // ignore
                }
            }
            router.push(backHref);
        }
        catch (error) {
            // beCPG stays the authority on whether a task may be completed
            // (frozen lists, blocking catalogue, refusal branch): its refusal is
            // shown as is.
            toast.error(error);
        }
        finally {
            setFinishing(false);
        }
    }, [task, autoSave, toast, labels.finished, router, backHref, entityId]);

    /* ----------------------------------------------------------- the panels */

    const helpPanel = (
        <HelpPanel
            entityId={entityId}
            entityNodeRef={entityNodeRef}
            steps={visitedSteps}
            onSelectStep={(stepId) => {
                setSheet(null);
                goTo(stepId);
            }}
            discussion={commentsEnabled ? discussion : null}
            onOpenComments={commentsEnabled ? openComments : undefined}
            task={task}
        />
    );

    const commentsPanel = commentsEnabled ? (
        <CommentsPanel
            entityNodeRef={entityNodeRef}
            discussion={discussion}
            anchor={anchor}
            onAnchorChange={setAnchor}
            targets={commentTargets}
            readOnly={Boolean(wizardState && wizardState.readOnly)}
        />
    ) : null;

    /* ------------------------------------------------------------- rendering */

    if (state.error) {
        return (
            <AppShell title={labels.notFound}>
                <ErrorState error={state.error} onRetry={state.refresh} />
            </AppShell>
        );
    }

    if (!wizardState) {
        return (
            <AppShell title={labels.step}>
                <div className="flex flex-col gap-3">
                    <SkeletonCard lines={2} />
                    <SkeletonCard lines={6} />
                </div>
            </AppShell>
        );
    }

    const entity = wizardState.entity || {};
    const readOnlyReason = wizardState.readOnlyReason;
    const stepReadOnlyReason = currentStep && currentStep.frozen ? 'frozen' : readOnlyReason;

    const stepContent = !currentStep ? null : currentStep.kind === 'documents' ? (
        <DocumentsStep
            entityNodeRef={entityNodeRef}
            step={currentStep}
            readOnlyReason={stepReadOnlyReason}
            autoSave={autoSave}
            onSummary={setDocumentSummary}
            onUploaded={() => suggestionsCall.refresh()}
        />
    ) : currentStep.kind === 'suggestions' ? (
        <SuggestionsStep
            entityId={entityNodeRef}
            entityType={entity.type}
            suggestions={suggestions}
            summary={suggestionsCall.data ? suggestionsCall.data.summary : null}
            loading={suggestionsCall.loading}
            error={suggestionsCall.error}
            onRefresh={suggestionsCall.refresh}
            readOnly={Boolean(wizardState.readOnly)}
            onApplied={() => {
                // The values are on the entity now; the form steps are mounted
                // only when they are the current step, so they reload by
                // themselves. Only the score has to be asked for again.
                if (complianceTouched) {
                    catalogs.refresh();
                }
            }}
            onGoToChange={goToChange}
            labelForField={labelForField}
        />
    ) : currentStep.kind === 'form' ? (
        <FormStep
            entityId={entityNodeRef}
            step={currentStep}
            params={params}
            autoSave={autoSave}
            readOnlyReason={stepReadOnlyReason}
            commentCounts={commentsEnabled ? discussion.counts : null}
            onComment={
                commentsEnabled
                    ? ({ field, label }) => openComments({ nodeRef: entityNodeRef, field, label })
                    : undefined
            }
            suggestionsByField={suggestionsByField}
            focusField={focusField}
            onLoaded={handleDefinitionLoaded(currentStep.id)}
        />
    ) : currentStep.kind === 'survey' ? (
        <SurveyStep
            entityId={entityNodeRef}
            step={currentStep}
            params={params}
            autoSave={autoSave}
            onComment={commentsEnabled ? openComments : undefined}
        />
    ) : currentStep.kind === 'compliance' ? (
        <ComplianceStep
            catalogs={(catalogs.data && catalogs.data.catalogs) || []}
            score={catalogs.data ? catalogs.data.score : null}
            loading={catalogs.loading}
            error={catalogs.error}
            onRetry={catalogs.refresh}
            onFieldClick={(field) => goToField(field.field || field.name)}
            blockingIds={blockingCatalogIds}
            documentSummary={documentSummary}
            onOpenDocuments={() => {
                const target = steps.find((step) => step.kind === 'documents');
                if (target) {
                    goTo(target.id);
                }
            }}
        />
    ) : (
        <DataListStep
            entityId={entityNodeRef}
            step={currentStep}
            params={params}
            autoSave={autoSave}
            onComment={commentsEnabled ? openComments : undefined}
            onCommentTargets={setCommentTargets}
        />
    );

    const finishDisabled = blocking.length > 0;

    // "Terminer" is an action, not a decoration: it is shown only when there is
    // something to submit. On a task that is already `Completed` — or on a
    // wizard the server turned read-only (`enforceTask` with no assigned task,
    // `readAccess`, a `read-only` configuration) — the button is **absent**, not
    // greyed out (spec: hide, do not disable). It used to be rendered as soon as
    // a task object existed, so a supplier reopening a task they had already
    // finished was offered a button that re-posted the completion, got a
    // meaningless 200 back, and was bounced to /tasks as if something had
    // happened.
    const canFinish = Boolean(task) && task.isOpen !== false && !wizardState.readOnly;

    return (
        <AppShell
            title={entity.name || labels.step}
            aside={
                <div className="hidden flex-col gap-4 lg:flex">
                    {helpPanel}
                    {commentsPanel}
                </div>
            }
            className={className}
        >
            {/* ------------------------------------------------------- header */}
            <Card padding="md" className="mb-4" animate={false}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h1 className="truncate text-lg font-medium text-[var(--becpg-blue)]">
                            {entity.name || ''}
                        </h1>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[var(--becpg-dark-grey)]">
                            {entity.code ? <span>{entity.code}</span> : null}
                            {task && task.dueDate ? (
                                <span>
                                    {fill(labels.due, {
                                        date: formatDate(task.dueDate, lang),
                                    })}
                                </span>
                            ) : null}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        {wizardState.readOnly ? (
                            <StatusPill status="readonly" tone="neutral" icon="lock" size="sm" label={labels.readOnly} />
                        ) : null}
                        <Button
                            variant="ghost"
                            size="icon"
                            icon="close"
                            href={backHref}
                            label={t('action.close')}
                        />
                    </div>
                </div>

                {wizardState.readOnly && readOnlyReason ? (
                    <p className="mt-2 flex items-start gap-2 rounded-lg bg-[var(--becpg-grey)]/50 p-2 text-sm text-[var(--becpg-dark-grey)]">
                        <Icon name="info" size={18} className="shrink-0" />
                        {labels.readOnlyReasons[readOnlyReason] || labels.readOnlyReasons.wizardReadOnly}
                    </p>
                ) : null}
            </Card>

            <div className="grid min-w-0 gap-4 xl:grid-cols-[13rem_1fr]">
                <WizardStepper
                    steps={visitedSteps}
                    currentId={currentId}
                    onSelect={goTo}
                    // No strict tunnel: a step already visited is freely
                    // reachable, and so is the next one (spec §4.4).
                    isSelectable={(step, index) =>
                        step.visited || index <= currentIndex + 1 || Boolean(wizardState.allSteps)}
                    variant="rail"
                    className="hidden xl:sticky xl:top-24 xl:block xl:self-start"
                />

                <div className="min-w-0">
                    <div className="mb-3 flex flex-col gap-2 xl:hidden">
                        <WizardStepper
                            steps={visitedSteps}
                            currentId={currentId}
                            onSelect={goTo}
                            isSelectable={(step, index) =>
                                step.visited || index <= currentIndex + 1 || Boolean(wizardState.allSteps)}
                            variant="compact"
                        />
                        <div className="flex gap-2 lg:hidden">
                            <Button
                                variant="outline"
                                size="sm"
                                icon="lightbulb"
                                onClick={() => setSheet('context')}
                                className="flex-1"
                            >
                                {labels.context}
                            </Button>
                            {commentsEnabled ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon="forum"
                                    onClick={() => setSheet('comments')}
                                    className="flex-1"
                                >
                                    {labels.discussion}
                                    {discussion.total > 0 ? ` (${discussion.total})` : ''}
                                </Button>
                            ) : null}
                        </div>
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={currentId || 'empty'}
                            initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={reduceMotion ? undefined : { opacity: 0, x: -12 }}
                            transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
                            className="min-w-0"
                        >
                            {stepContent}
                        </motion.div>
                    </AnimatePresence>

                    <WizardFooter
                        hasPrevious={currentIndex > 0}
                        hasNext={currentIndex >= 0 && currentIndex < steps.length - 1}
                        onPrevious={() => goTo(steps[currentIndex - 1] && steps[currentIndex - 1].id)}
                        onNext={() => goTo(steps[currentIndex + 1] && steps[currentIndex + 1].id)}
                        onFinish={canFinish ? finish : undefined}
                        finishing={finishing}
                        finishDisabled={finishDisabled}
                        finishReason={finishDisabled ? labels.finishBlocked : null}
                        finishLabel={labels.finish}
                        formulating={formulating}
                        // `draft` (spec §1.4) — the configuration asks for
                        // "Terminer" on every step, not only on the last one.
                        draft={Boolean(wizardState.draft)}
                        autoSave={autoSave}
                    />
                </div>
            </div>

            {/* ------------------------------------------------ mobile sheets */}
            <Modal
                open={sheet === 'context'}
                onClose={() => setSheet(null)}
                title={labels.context}
                size="lg"
            >
                <HelpPanel
                    entityId={entityId}
                    entityNodeRef={entityNodeRef}
                    steps={visitedSteps}
                    onSelectStep={(stepId) => {
                        setSheet(null);
                        goTo(stepId);
                    }}
                    discussion={commentsEnabled ? discussion : null}
                    onOpenComments={commentsEnabled ? () => setSheet('comments') : undefined}
                    task={task}
                    variant="sheet"
                />
            </Modal>

            <Modal
                open={sheet === 'comments'}
                onClose={() => setSheet(null)}
                title={labels.discussion}
                size="lg"
            >
                {commentsEnabled ? (
                    <CommentsPanel
                        entityNodeRef={entityNodeRef}
                        discussion={discussion}
                        anchor={anchor}
                        onAnchorChange={setAnchor}
                        targets={commentTargets}
                        readOnly={Boolean(wizardState.readOnly)}
                        variant="sheet"
                    />
                ) : null}
            </Modal>
        </AppShell>
    );
}
