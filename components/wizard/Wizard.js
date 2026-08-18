'use client';

/**
 * The assistant — spec §4.4, and the redesign's centre of gravity.
 *
 * ## The order is the feature
 *
 * ```
 * header               the technical sheet, in red while it is missing
 *                                                          → TechnicalSheetBanner
 * 0 · Contexte         permanent panel: AI suggestions, specification,
 *                      frozen lists, refusals                   → HelpPanel
 * 1..n · Sections      the wizard definition, as configured → Form / DataList /
 *                      Survey / Documents, in server order
 * n+1 · Conformité     catalogue check, gates "Terminer"    → ComplianceStep
 * ```
 *
 * Steps 3..n are **not written here**: they are whatever
 * `GET /api/v1/wizard/{entityId}` returned, in the order Share resolved
 * (contracts §1, §8). The wizard adds only the three surfaces the configuration
 * has no way to express — the technical sheet, the suggestions and the
 * conformity. Add a list in Share and it appears here; nothing to write.
 *
 * ## Why the documents step is no longer pulled to the front
 *
 * It was, until the expected types were looked at closely: beCPG **computes
 * them from the data entered** — a "GMO free" claim calls for its attestation,
 * an organic label for its certificate (§4.5). Asked first, the list is empty or
 * wrong. Only the *supplier technical sheet* is expected unconditionally, and it
 * alone feeds the extraction suggestions, which is why it sits in the header
 * rather than in the flow; the documents
 * step keeps the place the configuration gives it, usually near the end, where
 * each upload gets its own AI help — its type and its dates, not the product's
 * properties.
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
 * A step that declares `nextStepWebScript` runs **that script** when it is left
 * (`POST /api/v1/wizard/{entityId}/step/{stepId}` with `action: "nextStep"`) —
 * once, in the background, never blocking the UI, with a thin hint in the footer
 * (spec §4.4). Two templates exist: a reformulation, and the resolution of the
 * `SupplierDocuments` folder the documents step writes into. Calling the
 * reformulation for both means the folder resolution never happens and every
 * navigation pays for a formulation it had not been asked for.
 *
 * A step that declares nothing still formulates, but **only when the supplier
 * actually wrote on it**. beCPG materialises the documents an entity requires at
 * formulation, and it maps "formulate here" onto the steps of a wizard that only
 * saved on Suivant; this one saves continuously, so a list left without a
 * declared script — the claims, which decide which certificates are expected —
 * would otherwise never trigger the generation. Browsing a step writes nothing
 * and therefore costs nothing.
 * Per-keystroke saves always send `formulate: false`.
 *
 * ## Mobile
 *
 * Below `xl` the stepper is a progress bar with a step selector, and the two
 * side panels become sheets one tap away. Everything is reachable at 360px.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
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
import { TechnicalSheetBanner, useDocumentRequirements } from '@/components/wizard/TechnicalSheetBanner';
import { CommentsPanel, useDiscussion } from '@/components/wizard/panels/CommentsPanel';
import { FormStep } from '@/components/wizard/steps/FormStep';
import { DataListStep } from '@/components/wizard/steps/DataListStep';
import { SurveyStep } from '@/components/wizard/steps/SurveyStep';
import { DocumentsStep } from '@/components/wizard/steps/DocumentsStep';
import { SuggestionsStep } from '@/components/wizard/steps/SuggestionsStep';
import { ComplianceStep, blockingCatalogs } from '@/components/wizard/steps/ReviewStep';
import { ContentLocalesProvider } from '@/components/form/ContentLocalesProvider';
import { FieldFocusProvider } from '@/components/form/FieldFocusProvider';
import { api, useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { formatDate } from '@/lib/format';
import { portalCatalogs } from '@/lib/catalogs';
import { suggestionScopeForStep } from '@/lib/suggestionScope';

/**
 * What the browser grants a becpg-ai analysis, aligned on the route's
 * `AI_SUGGESTIONS_TIMEOUT`. The two must move together.
 */
const AI_TIMEOUT_MS = 180_000;

const LABELS = {
    fr: {
        context: 'Contexte',
        discussion: 'Discussion',
        documents: 'Documents',
        technicalSheet: 'Fiche technique',
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
        // Name the step and the count: "something is missing somewhere" helps
        // nobody finish.
        finishMissingStep: '« {step} » : {count} réponse(s) obligatoire(s) manquante(s).',
        notFound: 'Fiche introuvable',
        notFoundHint: 'Cette fiche n’existe pas ou ne fait pas partie de votre périmètre.',
        delegated: 'Vous saisissez au nom de {supplier}',
        due: 'À rendre le {date}',
        step: 'Étape',
        widen: 'Élargir la saisie',
        widenHint: 'Masque les panneaux latéraux et réduit les étapes à leurs icônes.',
        restore: 'Rétablir les panneaux',
        steps: 'Étapes',
    },
    en: {
        context: 'Context',
        discussion: 'Discussion',
        documents: 'Documents',
        technicalSheet: 'Technical sheet',
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
        /* See the note on the French keys. */
        finishMissingStep: '"{step}": {count} mandatory answer(s) missing.',
        notFound: 'Sheet not found',
        notFoundHint: 'This sheet does not exist, or is not part of your scope.',
        delegated: 'You are filling in on behalf of {supplier}',
        due: 'Due on {date}',
        step: 'Step',
        widen: 'Widen the entry area',
        widenHint: 'Hides the side panels and reduces the steps to their icons.',
        restore: 'Restore the panels',
        steps: 'Steps',
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

/**
 * localStorage key of the entry-width preference.
 *
 * Deliberately **not** per entity: "I type with the panels out of the way" is a
 * way of working, not a property of one raw material. It has to survive a step
 * change, a reload and the next task, or it is not a preference at all — it is a
 * button you press twelve times an afternoon.
 */
const WIDE_KEY = 'becpg.portal.wizard.wide';

/**
 * DOM id of the discussion column, so `openComments` can bring it into view when
 * it is already on screen. One wizard per document, so a constant is enough.
 */
const COMMENTS_PANEL_ID = 'becpg-wizard-comments';

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
 * Builds the wizard's step model: the configured steps, in the order the server
 * gave them, plus the ones the configuration cannot express.
 *
 * ## Why the documents are no longer hoisted to the front
 *
 * They used to be, so that the AI could read them before anything was typed. The
 * order was wrong, and the reason is business rather than technical: **the
 * expected document types are computed from the data entered** — a "GMO free"
 * claim calls for a GMO certificate, an organic label for its certificate
 * (`DocumentFormulationHandler`, spec §4.5). On the first step that list is empty
 * or wrong, so the supplier was asked to guess what the system did not know yet.
 *
 * One document escapes that rule and now opens the wizard: the **supplier
 * technical sheet**, asked for in every case, whatever the data says. It is
 * therefore the entry point, and the only ground for extraction suggestions —
 * it is the document that holds the values to reuse.
 *
 * Everything else keeps the order the configuration gave it, documents included,
 * which most configurations place near the end.
 *
 * @param {Object} state the payload of `GET /api/v1/wizard/{entityId}`
 * @param {Object} options
 * @param {Object} options.labels
 * @returns {Array<Object>} step view models
 */
export function buildStepModel(state, { labels }) {
    if (!state || !Array.isArray(state.steps)) {
        return [];
    }

    const configured = state.steps.map((step) => ({
        ...step,
        kind: step.type,
        label: stepLabel(step, labels),
    }));

    const model = [];

    /*
     * THE TECHNICAL SHEET IS NO LONGER A STEP.
     *
     * It used to open the flow because it is the document the AI draws its
     * values from. But when it is already uploaded — the common case, an
     * earlier listing or the original raw material — the step asked for
     * nothing and still had to be crossed; and when it is missing, that is
     * noticed during data entry, not before.
     *
     * It therefore lives in the header (see `TechnicalSheetBanner`), visible
     * from every step: one line when it is there, a red banner when it is
     * missing — since without it the AI proposes nothing.
     */

    /*
     * THE SUGGESTIONS ARE NO LONGER A STEP.
     *
     * They were one, inserted in second position as soon as becpg-ai had
     * answered. Two defects came from that placement and not from the content:
     * the number of steps changed under the supplier's feet — « étape 2 sur 13 »
     * became « sur 14 » along the way, and « Suivant » no longer led to the same
     * place — and above all what the AI read concerns EVERY step, not a moment
     * of the flow: filed at rank 2, it could only be consulted by going back.
     *
     * They now live in the « Contexte » panel, on the right, next to the
     * specification and the client's remarks: visible during data entry,
     * whatever the current step, and recomputed on every step change.
     */

    model.push(...configured);

    // When the configuration declares no documents step at all, the portal still
    // shows the requirements — they are computed by beCPG on the entity, not by
    // the wizard configuration (contracts §9) — but at the END, where a
    // configuration that declares one puts it, never at the front.
    if (!configured.some((step) => step.type === 'documents')) {
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

    // Step n+1 — always read-only: it reports, it does not edit.
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
 * @param {Object} [props.initialState] wizard state already resolved server-side
 *        (`GET /api/v1/tasks/{id}?withWizard=1`), to skip one browser round trip
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
    initialState = null,
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
    // `initialData`: when the task route has already composed the state, it is
    // painted immediately and the request only refreshes it behind.
    const state = useApi(entityId ? `wizard/${encodeURIComponent(entityId)}` : null, {
        params,
        initialData: initialState,
    });
    const wizardState = state.data;
    const entityNodeRef = wizardState && wizardState.entity ? wizardState.entity.nodeRef : entityId;

    // becpg-ai is optional: a 503 `aiDisabled` simply means no suggestions step.

    /*
     * `suggestionsByField` was removed along with the confidence badges: it only
     * served to put a level on a field's label.
     */

    const commentsEnabled = Boolean(wizardState && wizardState.comments);
    const discussion = useDiscussion({ nodeRef: entityNodeRef, enabled: commentsEnabled });

    /*
     * The technical sheet is read HERE, at the assistant level: the header is
     * what carries it, and it must be known before any conditional rendering.
     * A client with no « fiche technique » type configured gets nothing at all.
     */
    const documents = useDocumentRequirements(entityNodeRef);

    /* ------------------------------------------------------------- the steps */

    const steps = useMemo(
        () => buildStepModel(wizardState, { labels }),
        [wizardState, labels],
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

    /*
     * The requested step may exist ONLY AFTER the first render.
     *
     * « Suggestions » is added only once becpg-ai has answered, which takes from
     * a few seconds to half a minute. Opening `?step=__suggestions` directly —
     * the link one sends to oneself, the one one bookmarks — therefore asked for
     * a step the model did not contain yet: the fallback to the first step
     * applied, and since it made `currentId` valid, nothing brought the supplier
     * back to where they were heading afterwards. The request was lost without
     * ever having been refused.
     *
     * It therefore stays pending as long as it could not be honoured, and is
     * honoured only once. A manual navigation expires it on the spot — `goTo`
     * marks the resume as consumed — because nothing must move a supplier who
     * has just chosen their step, not even in the name of what they asked for
     * ten seconds earlier.
     */
    const [resumeDone, setResumeDone] = useState(false);

    // Derived during render rather than in an effect: an effect would paint one
    // frame of "no step" before settling (the pattern `useApi` uses too).
    if (steps.length > 0) {
        const resumeReachable = Boolean(resumeStepId) && steps.some((step) => step.id === resumeStepId);
        const anchor = (target) => {
            if (resumeReachable && target === resumeStepId) {
                setResumeDone(true);
            }
            setNav((current) => ({
                currentId: target,
                visited: current.visited.includes(target) ? current.visited : [...current.visited, target],
            }));
        };

        if (!steps.some((step) => step.id === nav.currentId)) {
            anchor(resumeReachable ? resumeStepId : steps[0].id);
        }
        else if (!resumeDone && resumeReachable && nav.currentId !== resumeStepId) {
            // The requested step has just appeared: honour it, at last.
            anchor(resumeStepId);
        }
    }

    const currentId = nav.currentId;
    const currentIndex = steps.findIndex((step) => step.id === currentId);
    const currentStep = currentIndex >= 0 ? steps[currentIndex] : null;

    /*
     * SUGGESTIONS ARE REQUESTED FOR THE OPEN STEP, NOT FOR EVERYTHING.
     *
     * becpg-ai bounds its analysis when the list is named to it — that is what
     * Share's « Suggestions » action does — and the portal already carried that
     * parameter without ever filling it in. It therefore ran the fifteen plugins
     * every time: on the « Nutriments » step, the supplier also received the
     * spell check of their labels and the review of their certificates, after
     * waiting for everything to run (~26 s measured on dev).
     *
     * The scope is part of the call's KEY: changing step changes the key, so it
     * re-reads what it must without anyone orchestrating it, and two steps with
     * the same scope share their result.
     *
     * `suggestionScopeForStep` only returns identifiers verified in becpg-ai: an
     * unknown identifier answers empty there, not "everything".
     */
    const suggestionScope = suggestionScopeForStep(currentStep);
    const suggestionsCall = useApi(entityId ? `suggestions/${encodeURIComponent(entityId)}` : null, {
        params: suggestionScope ? { listId: suggestionScope } : undefined,
        // The same ceiling as the route: 45 s on the browser side cut short an
        // analysis the server let run up to 180 s.
        timeout: AI_TIMEOUT_MS,
    });
    const suggestions = useMemo(
        () => (suggestionsCall.data && Array.isArray(suggestionsCall.data.suggestions)
            ? suggestionsCall.data.suggestions
            : []),
        [suggestionsCall.data],
    );

    /* ------------------------------------------------- mandatory-entry gaps */

    /*
     * What is missing, step by step.
     *
     * `{ [stepId]: { count, labels: string[] } }`, fed by the steps themselves:
     * `FormStep` declares there its mandatory fields left empty, `SurveyStep`
     * its mandatory questions left unanswered. Nothing is computed here — the
     * assistant knows neither the form definitions nor the decision tree, and it
     * must not start knowing them.
     *
     * This register is partial, and that is deliberate. A step is mounted only
     * when it is the current step, so only the steps actually opened declare
     * themselves in it. It makes visible what is missing where the supplier went
     * through; authority over "is the sheet complete" stays with the catalogue,
     * re-read by `finish()` before any completion (see below).
     */
    const [stepIssues, setStepIssues] = useState({});

    /*
     * THREE VERDICTS, NOT TWO.
     *
     * The register only held "n answers are missing" and erased everything
     * else: "nothing is missing" and "I have not looked yet" were the same
     * absent entry. The rail read that absence as "step seen and clean", so
     * walking quickly past the questionnaire was enough to see it marked
     * validated without a single answer having been read.
     *
     * A `pending` entry now says "no verdict yet", and an entry at zero says
     * "ruled on, nothing missing". What an absent entry means is unchanged:
     * this step never returns a verdict - a list, the documents.
     */
    const reportStepIssues = useCallback((stepId, issues) => {
        setStepIssues((current) => {
            const next = issues || null;
            const previous = current[stepId] || null;
            if (!next && !previous) {
                return current;
            }
            // Same verdict, same object identity: without this the report fires
            // on every keystroke and re-renders the whole rail for nothing.
            if (next && previous
                && Boolean(next.pending) === Boolean(previous.pending)
                && next.count === previous.count
                && next.labels.join('|') === previous.labels.join('|')) {
                return current;
            }
            const copy = { ...current };
            if (next) {
                copy[stepId] = next;
            }
            else {
                delete copy[stepId];
            }
            return copy;
        });
    }, []);

    /*
     * ONE VERDICT PER STEP, FROM THREE SOURCES, IN THIS ORDER.
     *
     * 1. the server, which ruled on every form step against the entity it had
     *    just read — this is what survives a reopened task, where the browser
     *    knows nothing until a step is mounted;
     * 2. the documents, from the single wizard-level requirements read, so the
     *    step is orange while a mandatory document is missing whether or not
     *    anyone has opened it;
     * 3. the step currently mounted, which reflects what has just been typed and
     *    not yet saved, and therefore wins.
     *
     * A step nobody can rule on — a list, the conformity — carries
     * `evaluated: false` and the rail leaves it neutral. That is an answer, not
     * a gap: nothing declares a datalist mandatory, and painting it green
     * because it was walked past is what this whole register exists to stop.
     */
    const documentVerdict = useMemo(() => {
        if (documents.loading || !documents.summary) {
            return { pending: true, count: 0, labels: [] };
        }
        const blocking = documents.requirements.filter((item) => item.blocking);
        return {
            count: blocking.length,
            labels: blocking.map((item) => item.label || item.typeLabel || item.name).filter(Boolean),
        };
    }, [documents.loading, documents.summary, documents.requirements]);

    const verdicts = useMemo(() => {
        const map = {};
        for (const step of steps) {
            const served = step.completion;
            if (served && served.evaluated) {
                map[step.id] = { count: served.count || 0, labels: served.labels || [] };
            }
            if (step.kind === 'documents') {
                map[step.id] = documentVerdict;
            }
        }
        return { ...map, ...stepIssues };
    }, [steps, stepIssues, documentVerdict]);

    const incompleteSteps = useMemo(
        () => steps.filter((step) => (verdicts[step.id]?.count || 0) > 0),
        [steps, verdicts],
    );

    const visitedSteps = useMemo(
        () => steps.map((step) => {
            const reported = verdicts[step.id] || null;
            return {
                ...step,
                visited: nav.visited.includes(step.id),
                // The rail is where "which step is not finished" belongs: the answer
                // used to live only inside the step the supplier happened to be on,
                // so leaving it took the answer with it.
                issues: reported && reported.count > 0 ? reported : null,
                evaluated: Boolean(reported) && !reported.pending,
            };
        }),
        [steps, nav.visited, verdicts],
    );

    /* ---------------------------------------------------------- the autosave */

    /*
     * Did the supplier write anything on the step being left?
     *
     * Every writer reports here — the forms and the questionnaire through
     * `schedule`, the datalist rows through `markSaved` — because that is what
     * decides whether leaving the step is worth a formulation.
     */
    const wroteRef = useRef(false);

    const autoSave = useAutoSave({
        onError: (error) => toast.error(error),
        onSaved: () => {
            wroteRef.current = true;
        },
    });

    /* ------------------------------------------------------- side panel state */

    const [sheet, setSheet] = useState(null); // 'context' | 'comments' | null
    /*
     * "Élargir la saisie" — the answer to the grid being starved of width.
     *
     * Measured on the allergen step of a real task, at 1920: the usable grid was
     * **774px** for a table that needs 984, i.e. three columns permanently off
     * screen, while 320px went to the context panel, 208px to the step rail and
     * 264px to the readable-width cap. None of those three is wrong on a form
     * step; all three are wrong on a step whose content *is* a table.
     *
     * So the cap is released automatically on a grid step (that is the rule
     * `AppShell` already documents — "a screen whose content is a grid goes full
     * width" — applied per step rather than per route), and this flag is the
     * supplier's own decision about the other two: panels out, rail reduced to
     * its icons. Read once, in a lazy initialiser, because it is an entry
     * condition and not a value that changes while the wizard is open.
     */
    const [wide, setWide] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }
        try {
            return window.localStorage.getItem(WIDE_KEY) === '1';
        }
        catch {
            return false;
        }
    });

    const toggleWide = useCallback(() => {
        setWide((current) => {
            const next = !current;
            try {
                window.localStorage.setItem(WIDE_KEY, next ? '1' : '0');
            }
            catch {
                // No storage (private window): the mode still works, it just
                // does not survive the reload.
            }
            return next;
        });
    }, []);

    const [anchor, setAnchor] = useState(null);
    const [commentTargets, setCommentTargets] = useState([]);
    /*
     * Where a "missing field" link of the conformity step lands.
     *
     * `locale` because a multilingual field is missing *per language*, and
     * `nonce` because asking twice for the same box is a legitimate request —
     * the languages may have been folded back in between.
     */
    const [fieldFocus, setFieldFocus] = useState({ field: null, locale: null, nonce: 0 });
    const focusField = fieldFocus.field;
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

    /*
     * The assistant's own catalogue, asked for by name — and in addition, not
     * instead.
     *
     * `entity/catalog/node` without a `catalogId` returns the stored score, that
     * is the client's catalogues (INCO, GS1…). With a `catalogId`, it returns
     * that catalogue and it alone, formulated on the spot. The two answers are
     * therefore disjoint, and replacing the first by the second would remove the
     * client's regulatory requirements from the screen — the opposite of the aim.
     *
     * Hence two calls and a merge. The second exists only if the configuration
     * names a catalogue, which is the case of the default supplier assistants
     * and of no other: an instance that declares none pays nothing.
     */
    // Carried by the deliverable URL (`&catalogId=`), which is the beCPG
    // convention — the same one `wizard-mgr.get.js` reads in Share. The task
    // carries it all the way here without the URL ever being rewritten
    // (invariant I1).
    const wizardCatalogId = (task && task.catalogId) || null;
    const wizardCatalog = useApi(
        complianceTouched && entityId && wizardCatalogId
            ? `entities/${encodeURIComponent(entityId)}/catalogs`
            : null,
        { params: { catalogId: wizardCatalogId } },
    );

    /** Stored score plus the assistant's catalogue, de-duplicated on the id. */
    const catalogList = useMemo(() => {
        const stored = (catalogs.data && catalogs.data.catalogs) || [];
        const own = (wizardCatalog.data && wizardCatalog.data.catalogs) || [];
        const byId = new Map();
        for (const catalog of [...stored, ...own]) {
            const key = (catalog && (catalog.id || catalog.label)) || '';
            if (key) {
                // The second wins: it has just been formulated, the first is stored.
                byId.set(key, catalog);
            }
        }
        return [...byId.values()];
    }, [catalogs.data, wizardCatalog.data]);
    /*
     * WHICH CATALOGUES BLOCK: THE DELIVERABLE SAYS SO, AS IN SHARE.
     *
     * `project-task.js` (becpg-project-share) applies exactly this rule on the
     * task view: for every deliverable whose URL is an assistant and carries a
     * `catalogId`, it hides the validation button, queries
     * `becpg/entity/catalog/node/{nodeRef}?catalogId=…`, and reveals it only if
     * the catalogue reports no missing field at all.
     *
     * The portal applied that gate only on `PORTAL_BLOCKING_CATALOGS`, an
     * environment variable that was never filled in: nothing blocked, and a
     * listing task completed on an incomplete catalogue where Share forbids it
     * on the same data. The deliverable's catalogue therefore now takes
     * precedence — the repository is what declares, not the portal
     * configuration, and the two interfaces agree.
     *
     * The order stays: an explicit prop (a caller that knows), then the
     * deliverable, then the environment variable for an instance that wants to
     * extend the rule to other catalogues.
     */
    // Memoised: the array literal changed identity on every render, which re-ran
    // the blocking computation and the completion check on every keystroke.
    const gatingCatalogIds = useMemo(
        () => blockingCatalogIds
            || (wizardCatalogId ? [wizardCatalogId] : null)
            || (wizardState && wizardState.blockingCatalogIds)
            || null,
        [blockingCatalogIds, wizardCatalogId, wizardState],
    );
    // A missing translation is reported, not opposed, unless the instance said
    // otherwise — see `blockingTranslations()` in the wizard adapter.
    const blockingTranslations = Boolean(wizardState && wizardState.blockingTranslations);
    const blocking = useMemo(
        () => blockingCatalogs(catalogList, gatingCatalogIds, { translations: blockingTranslations }),
        [catalogList, gatingCatalogIds, blockingTranslations],
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


    /**
     * Runs the hook a step leaves behind, server-side and in the background.
     *
     * The step's own `nextStepWebScript` when it declares one — the route
     * decides *which* script, the wizard only says which step was left — and a
     * formulation otherwise, so what was just written is taken into account.
     *
     * Never blocking, never fatal: a background hook, as in Share.
     *
     * @param {Object} step the step being left
     * @param {boolean} wrote whether the supplier wrote on it
     * @returns {boolean} whether the hook was fired
     */
    const runStepHook = useCallback(
        (step, wrote) => {
            const stepId = step ? step.id : null;
            if (formulatingRef.current || !entityId || !stepId || (wizardState && wizardState.readOnly)) {
                // A hook already in flight: the caller keeps its "something was
                // written" flag, so the next transition fires the one owed.
                return false;
            }
            if (!step.nextStepWebScript && !wrote) {
                return false;
            }
            formulatingRef.current = true;
            setFormulating(true);
            const hook = step.nextStepWebScript
                ? api.post(`wizard/${encodeURIComponent(entityId)}/step/${encodeURIComponent(stepId)}`,
                    { action: 'nextStep' }, { params })
                : api.post(`wizard/${encodeURIComponent(entityId)}/formulate`, {}, { params });
            hook
                .then(() => {
                    // A formulation moves the score and the computed characteristics;
                    // a folder resolution does not. Refreshing when the compliance
                    // panel has been opened is cheap and correct in both cases.
                    if (complianceTouched) {
                        catalogs.refresh();
                    }
                })
                .catch(() => {
                    // Deliberately silent, exactly as before: a background hook that
                    // fails must not interrupt a supplier who is moving on.
                })
                .finally(() => {
                    formulatingRef.current = false;
                    setFormulating(false);
                });
            return true;
        },
        [entityId, params, wizardState, complianceTouched, catalogs],
    );

    const goTo = useCallback(
        async (stepId, options = {}) => {
            if (!stepId || stepId === currentId) {
                if (options.field) {
                    setFieldFocus((current) => ({
                        field: options.field,
                        locale: options.locale || null,
                        nonce: current.nonce + 1,
                    }));
                }
                return;
            }
            // The supplier chooses: the resume requested by the URL is consumed
            // and will not move them any more.
            setResumeDone(true);
            const leaving = steps.find((step) => step.id === currentId);

            // Nothing is ever left behind: whatever is pending goes out first.
            await autoSave.flush();

            // Run **the script the step declared**, not a formulation regardless.
            //
            // Two templates exist in the configuration: `becpg/remote/formulate…`
            // and `becpg/project/path…&path=SupplierDocuments`, which resolves and
            // creates the folder the documents step then writes into. A blanket
            // formulation for both means that on a step declaring
            // SupplierDocuments (organoList, contactList, packMaterialList, the
            // `supplier-nc` form step) the folder resolution never runs — and every
            // navigation pays for a formulation nobody asked for.
            //
            // A step declaring neither still formulates once the supplier has
            // written on it: the claims list decides which certificates beCPG
            // expects, and those documents are materialised by formulation.
            if (runStepHook(leaving, wroteRef.current)) {
                wroteRef.current = false;
            }

            /*
             * The AI re-reads AFTER every step.
             *
             * What it proposes depends on what has already been entered: a
             * filled step changes the values still missing, and a sheet uploaded
             * further along the flow opens new extractions. Computed once when
             * the wizard opened, the suggestions aged throughout the data entry —
             * precisely what their former place, a step frozen at rank 2, made
             * invisible.
             *
             * `autoSave.flush()` has just happened right above: the re-read
             * therefore bears on what was written, never on the earlier state.
             * The call is not awaited — navigation owes nothing to the AI.
             *
             * It stays useful DESPITE the call key being bounded to the step: two
             * steps of the same scope — two forms, both `View-properties` — do
             * not change the key, and without this refresh the second would show
             * what had been read before the first was filled in.
             */
            suggestionsCall.refresh();

            setNav((current) => ({
                currentId: stepId,
                visited: current.visited.includes(stepId) ? current.visited : [...current.visited, stepId],
            }));
            setFieldFocus((current) => ({
                field: options.field || null,
                locale: options.locale || null,
                nonce: current.nonce + 1,
            }));
            setCommentTargets([]);
            persist(stepId);

            if (stepId === SYNTHETIC.COMPLIANCE) {
                setComplianceSeen(true);
            }
            if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
            }
        },
        [currentId, steps, autoSave, runStepHook, persist, reduceMotion, suggestionsCall],
    );

    const goToField = useCallback(
        (name, locale = null) => {
            const known = fieldIndex[name];
            const target = known
                ? known.stepId
                : (steps.find((step) => step.type === 'form') || {}).id;
            if (target) {
                goTo(target, { field: name, locale });
            }
        },
        [fieldIndex, steps, goTo],
    );

    /*
     * `goToChange` was removed along with « Aller au champ ».
     *
     * It resolved the step a suggestion targeted, to send the supplier there.
     * The button caused more problems than it solved: it left the step being
     * filled in for another one, and since the suggestions now live in the
     * permanent panel, the proposed value is readable FROM the step concerned —
     * there is nowhere left to go.
     */

    /**
     * Opens the discussion, wherever it currently lives.
     *
     * Three layouts, and only one of them used to be handled:
     *
     * | layout | where the thread is | what used to happen |
     * |---|---|---|
     * | phone / tablet (`< lg`) | a modal sheet | the sheet opened — correct |
     * | desktop, panels shown | the right-hand aside | **nothing visible** |
     * | desktop, « Élargir la saisie » | nowhere: `aside` is `null` | **nothing at all** |
     *
     * So *Ouvrir la discussion*, in the context panel, was a dead button on
     * desktop — silent when the panel was already there (the anchor changed, and
     * the reader had no way to know), and inert in wide mode where there is no
     * panel to change. Same for a comment opened on a field: the click set an
     * anchor nobody could see.
     *
     * The rule now follows the layout rather than the viewport width: **the sheet
     * opens whenever the aside is not on screen**, and when it is, the panel is
     * scrolled to and focused so the click has a visible consequence. `wide` is
     * the flag deciding whether the aside is rendered at all, so it is the flag
     * consulted here.
     */
    const openComments = useCallback((nextAnchor) => {
        setAnchor(nextAnchor || null);
        if (typeof window === 'undefined') {
            return;
        }
        const asideOnScreen = !wide && window.matchMedia('(min-width: 1024px)').matches;
        if (!asideOnScreen) {
            setSheet('comments');
            return;
        }
        // The panel is already rendered: bring it into view rather than open a
        // second copy of it in a modal.
        const panel = document.getElementById(COMMENTS_PANEL_ID);
        if (panel) {
            panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            const focusable = panel.querySelector('textarea, input, button, select');
            if (focusable) {
                focusable.focus({ preventScroll: true });
            }
        }
    }, [wide]);

    /* ---------------------------------------------------------------- finish */

    /**
     * Terminer, once the sheet has been checked.
     *
     * ## What was wrong
     *
     * `finishDisabled` only looked at the catalogues — and those were read only
     * once the « Conformité » step had been opened (`complianceTouched`). A
     * supplier who never opened it therefore had `catalogs.data === undefined`,
     * so `blocking === []`, so an active Terminer button: they submitted an
     * incomplete sheet with nothing telling them so, and without ever seeing the
     * screen that would have told them. The guard rail existed and only guarded
     * those who had already walked past it.
     *
     * ## What replaces it
     *
     * Two verdicts, in this order, before any completion:
     *
     *  1. what the assistant knows: the mandatory fields and questions left
     *     empty on the steps opened (`stepIssues`). That is what the catalogue
     *     does not cover — a questionnaire does not appear in it;
     *  2. what the client declared blocking: the catalogues, re-read here, on
     *     demand, and not only if they happen to have been loaded already. The
     *     read stays late — it triggers a reformulation, which is not wanted on
     *     the assistant's first paint — but it is no longer conditional.
     *
     * A merely incomplete catalogue does not block: see the note on
     * `blockingCatalogs`. beCPG publishes no "blocking" marker, and treating the
     * absence of a marker as a block made every assistant impossible to complete
     * on an instance where a catalogue is not at 100 % — a rule the repository
     * never stated, applied in its name.
     *
     * A refusal is not a greyed-out button: it takes the supplier to the
     * offending step and says what is missing. A greyed-out button with no
     * explanation leaves them searching.
     *
     * beCPG stays the final authority: it can refuse the completion for its own
     * reasons (frozen list, refusal branch, catalogue), and its refusal is shown
     * as is.
     */
    const finish = useCallback(async () => {
        if (!task) {
            return;
        }
        setFinishing(true);
        try {
            await autoSave.flush();

            // 1 — what the assistant saw with its own eyes. Except in draft
            // mode, where the client declared that a partial sheet is
            // acceptable: the gap is then reported, not opposed.
            // See `finishDisabled`: `draft` allows saving, not the submission
            // of an incomplete sheet.
            const localGap = steps.find((step) => (verdicts[step.id]?.count || 0) > 0);
            if (localGap) {
                const issues = verdicts[localGap.id];
                toast.error(new Error(fill(labels.finishMissingStep, {
                    step: localGap.label,
                    count: issues.count,
                })));
                goTo(localGap.id);
                return;
            }

            /*
             * 2 — the catalogues the instance declared blocking.
             *
             * Re-read on demand, because `catalogs.data` only exists if the
             * Conformité step has been opened — the original hole. But only when
             * there is something to check: with no declared id, `blockingCatalogs`
             * can by construction return nothing (beCPG marks no catalogue), and
             * the call would be a network round trip — which triggers a
             * reformulation — inserted between the click and its effect, for an
             * answer known in advance. « Terminer » must go out immediately.
             */
            let gateList = catalogList.length > 0 ? catalogList : null;
            if (!gateList && gatingCatalogIds && gatingCatalogIds.length > 0) {
                try {
                    const fresh = await api.get(`entities/${encodeURIComponent(entityId)}/catalogs`);
                    gateList = (fresh && fresh.catalogs) || [];
                }
                catch {
                    // The score is unavailable: do not block on a read that
                    // failed. beCPG will refuse by itself if the sheet cannot be
                    // submitted — it is the authority, not this screen.
                    gateList = null;
                }
            }
            if (gateList) {
                const stillBlocking = blockingCatalogs(gateList, gatingCatalogIds,
                    { translations: blockingTranslations });
                if (stillBlocking.length > 0) {
                    setComplianceSeen(true);
                    catalogs.refresh();
                    toast.error(new Error(labels.finishBlocked));
                    goTo(SYNTHETIC.COMPLIANCE);
                    return;
                }
            }

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
    }, [
        task, autoSave, toast, labels, router, backHref, entityId,
        steps, verdicts, goTo, catalogs, catalogList, gatingCatalogIds, blockingTranslations,
    ]);

    /* ----------------------------------------------------------- the panels */

    /*
     * What the « Contexte » panel must know about the suggestions, in one object:
     * the cards, the state of the call, and what it takes to run it again.
     * Assembled here because the wizard is what holds the call, and memoised so
     * the panel is not redrawn on every keystroke in a field.
     */
    const suggestionsPanel = useMemo(() => ({
        entityId: entityNodeRef,
        // `wizardState.entity` and not `entity`: the latter is declared further
        // down, after the panels that consume it.
        entityType: (wizardState.entity || {}).type,
        items: suggestions,
        summary: suggestionsCall.data ? suggestionsCall.data.summary : null,
        entityLevelDropped: suggestionsCall.data ? suggestionsCall.data.entityLevelDropped || 0 : 0,
        analysis: suggestionsCall.data ? suggestionsCall.data.analysis : null,
        loading: suggestionsCall.loading,
        error: suggestionsCall.error,
        refresh: suggestionsCall.refresh,
        readOnly: Boolean(wizardState.readOnly),
        labelForField,
        onApplied: () => {
            if (complianceTouched) {
                catalogs.refresh();
            }
        },
    }), [
        entityNodeRef, wizardState.entity, suggestions, suggestionsCall.data, suggestionsCall.loading,
        suggestionsCall.error, suggestionsCall.refresh, wizardState.readOnly, labelForField,
        complianceTouched, catalogs,
    ]);

    const helpPanel = (
        <HelpPanel
            entityId={entityId}
            suggestions={suggestionsPanel}
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
        <div id={COMMENTS_PANEL_ID}>
            <CommentsPanel
                entityNodeRef={entityNodeRef}
                discussion={discussion}
                anchor={anchor}
                onAnchorChange={setAnchor}
                targets={commentTargets}
                readOnly={Boolean(wizardState && wizardState.readOnly)}
            />
        </div>
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
            requirements={documents}
            onUploaded={() => {
                documents.refresh();
                suggestionsCall.refresh();
            }}
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
            focusField={focusField}
            focusLocale={fieldFocus.locale}
            onLoaded={handleDefinitionLoaded(currentStep.id)}
            onIssues={reportStepIssues}
        />
    ) : currentStep.kind === 'survey' ? (
        <SurveyStep
            entityId={entityNodeRef}
            step={currentStep}
            params={params}
            autoSave={autoSave}
            readOnlyReason={stepReadOnlyReason}
            onComment={commentsEnabled ? openComments : undefined}
            onIssues={reportStepIssues}
        />
    ) : currentStep.kind === 'compliance' ? (
        <ComplianceStep
            catalogs={portalCatalogs(catalogList)}
            score={catalogs.data ? catalogs.data.score : null}
            loading={catalogs.loading || wizardCatalog.loading}
            error={catalogs.error}
            onRetry={() => {
                catalogs.refresh();
                wizardCatalog.refresh();
            }}
            // `field.locale` is set when a catalogue reports the field missing in
            // one language only — the box to land on, not just the field.
            onFieldClick={(field) => goToField(field.field || field.name, field.locale || null)}
            blockingIds={gatingCatalogIds}
            blockingTranslations={blockingTranslations}
            documentSummary={documents.summary}
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

    /*
     * `draft` DOES NOT GOVERN SUBMISSION.
     *
     * It did here, wrongly: completion was allowed on empty mandatory entries as
     * soon as the assistant carried `draft="true"` — which is the case of every
     * supplier assistant. A half-filled questionnaire therefore went off to the
     * client with nothing standing in its way.
     *
     * `draft` says one may save along the way, not that a partial sheet is
     * acceptable. The two are independent, and on this portal the attribute
     * hardly means anything any more: saving is automatic on every keystroke.
     *
     * Submitting commits the sheet: a missing mandatory entry prevents it,
     * always.
     *
     * The gap is still stated before it is opposed — in the rail, and under the
     * button (`finishReason` is rendered even when the button is active). The
     * button greys out on what is known; `finish()` re-checks on what is true at
     * the moment of submitting, the catalogues being loaded only after a visit
     * to « Conformité ».
     */
    const finishDisabled = blocking.length > 0 || incompleteSteps.length > 0;
    const finishReason = incompleteSteps.length > 0
        ? fill(labels.finishMissingStep, {
            step: incompleteSteps[0].label,
            count: verdicts[incompleteSteps[0].id].count,
        })
        : blocking.length > 0
            ? labels.finishBlocked
            : null;

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

    /*
     * A step whose content is a table opts out of the readable-width cap, and
     * only that step: a form step at 1664px would put a label 900px from its
     * value, which is the defect the cap exists to prevent. The width therefore
     * follows what is on screen, which is also what makes the change legible —
     * you moved to a different kind of content, so the page changed shape.
     */
    const gridStep = Boolean(currentStep) && currentStep.kind !== 'form'
        && currentStep.kind !== 'compliance' && currentStep.kind !== 'suggestions';

    return (
        /* The sheet's entry languages, made available to the `d:mltext` controls
           without crossing five components — see ContentLocalesProvider. */
        <ContentLocalesProvider value={wizardState.contentLocales}>
        <FieldFocusProvider value={fieldFocus}>
        <AppShell
            title={entity.name || labels.step}
            fullWidth={gridStep}
            aside={
                wide ? null : (
                    <div className="hidden flex-col gap-4 lg:flex">
                        {helpPanel}
                        {commentsPanel}
                    </div>
                )
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
                        {/*
                          * Only from `xl` up, and not `lg`: it is at `xl` that
                          * the rail and the panels appear
                          * (`xl:grid-cols-[13rem_1fr]`, `hidden xl:block`).
                          * Between `lg` and `xl`, the button showed with nothing
                          * to hide — it produced no visible change, which is
                          * worse than no button at all.
                          */}
                        <Button
                            variant="outline"
                            size="sm"
                            icon={wide ? 'width_normal' : 'width_wide'}
                            onClick={toggleWide}
                            title={wide ? labels.restore : labels.widenHint}
                            aria-pressed={wide}
                            className="hidden xl:inline-flex"
                        >
                            {wide ? labels.restore : labels.widen}
                        </Button>
                        {/* With the panels away, they stay one click away. */}
                        {wide ? (
                            <div className="hidden items-center gap-1 xl:flex">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    icon="lightbulb"
                                    onClick={() => setSheet('context')}
                                    label={labels.context}
                                />
                                {commentsEnabled ? (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        icon="forum"
                                        onClick={() => setSheet('comments')}
                                        label={
                                            discussion.total > 0
                                                ? `${labels.discussion} (${discussion.total})`
                                                : labels.discussion
                                        }
                                    />
                                ) : null}
                            </div>
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

                {/*
                    THE TECHNICAL SHEET, IN THE HEADER.

                    The first move expected from the supplier, and the condition
                    of the AI suggestions: while it is missing, the banner says
                    so in red above every step, at every width. Once uploaded,
                    only one line is left.
                */}
                <TechnicalSheetBanner
                    entityNodeRef={entityNodeRef}
                    state={documents}
                    readOnly={Boolean(wizardState.readOnly)}
                    onUploaded={suggestionsCall.refresh}
                />
            </Card>

            <div className={`grid min-w-0 gap-4 ${wide ? 'xl:grid-cols-[3.25rem_1fr]' : 'xl:grid-cols-[13rem_1fr]'}`}>
                <WizardStepper
                    steps={visitedSteps}
                    currentId={currentId}
                    onSelect={goTo}
                    // No strict tunnel: a step already visited is freely
                    // reachable, and so is the next one (spec §4.4).
                    isSelectable={(step, index) =>
                        step.visited || index <= currentIndex + 1 || Boolean(wizardState.allSteps)}
                    variant="rail"
                    collapsed={wide}
                    footer={wide ? (
                        <button
                            type="button"
                            onClick={toggleWide}
                            title={labels.restore}
                            aria-label={labels.restore}
                            className="mt-1 flex w-full items-center justify-center rounded-xl py-1.5 text-[var(--becpg-dark-grey)] hover:bg-[var(--becpg-grey)]/50 hover:text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                        >
                            <Icon name="chevron_right" size={18} />
                        </button>
                    ) : null}
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

                    {/*
                        THE STEP BODY SITS BEHIND NO EXIT ANIMATION.

                        It did, inside an `<AnimatePresence mode="wait">`. That
                        mode keeps the old child mounted until its exit is over,
                        then mounts the new one. When that exit never ends —
                        observed in production on 2026-08-13, framer-motion
                        12.43 — the new child is never mounted: the rail, which
                        is outside the block, did mark the new step and the URL
                        followed, while the panel stayed frozen on the arrival
                        step. A DOM node marked by hand survived the step change,
                        which ruled out the remount and the running animation:
                        the old element was simply kept.

                        Consequence: the AI suggestions were unreachable while
                        the server was producing them, and every other step was
                        just as unreachable.

                        The replacement is an ENTRY-only animation, remounted by
                        the key. With no exit there is nothing to wait for, hence
                        nothing that can block: the content can no longer depend
                        on an animation completing. The outgoing fade is lost,
                        and it was not worth that risk on the main content.
                    */}
                    <motion.div
                        key={currentId || 'empty'}
                        initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
                        className="min-w-0"
                    >
                        {stepContent}
                    </motion.div>

                    <WizardFooter
                        hasPrevious={currentIndex > 0}
                        hasNext={currentIndex >= 0 && currentIndex < steps.length - 1}
                        onPrevious={() => goTo(steps[currentIndex - 1] && steps[currentIndex - 1].id)}
                        onNext={() => goTo(steps[currentIndex + 1] && steps[currentIndex + 1].id)}
                        onFinish={canFinish ? finish : undefined}
                        finishing={finishing}
                        finishDisabled={finishDisabled}
                        finishReason={finishReason}
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
                    suggestions={suggestionsPanel}
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
        </FieldFocusProvider>
        </ContentLocalesProvider>
    );
}
