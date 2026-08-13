'use client';

/**
 * The assistant — spec §4.4, and the redesign's centre of gravity.
 *
 * ## The order is the feature
 *
 * ```
 * 0 · Contexte         volet permanent : fiche technique, suggestions de l'IA,
 *                      cahier des charges, remarques, listes gelées, refus → HelpPanel
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
 * wrong. Only the *supplier technical sheet* is expected unconditionally, so it
 * opens the wizard and it alone feeds the extraction suggestions; the documents
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
 * `SupplierDocuments` folder the documents step writes into. The wizard used to
 * call the reformulation for both, which meant the folder resolution never
 * happened and every navigation paid for a formulation it had not been asked for.
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
import { CommentsPanel, useDiscussion } from '@/components/wizard/panels/CommentsPanel';
import { FormStep } from '@/components/wizard/steps/FormStep';
import { DataListStep } from '@/components/wizard/steps/DataListStep';
import { SurveyStep } from '@/components/wizard/steps/SurveyStep';
import { DocumentsStep } from '@/components/wizard/steps/DocumentsStep';
import { SuggestionsStep } from '@/components/wizard/steps/SuggestionsStep';
import { ComplianceStep, blockingCatalogs } from '@/components/wizard/steps/ReviewStep';
import { ContentLocalesProvider } from '@/components/form/ContentLocalesProvider';
import { api, useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { formatDate } from '@/lib/format';
import { portalCatalogs } from '@/lib/catalogs';
import { suggestionScopeForStep } from '@/lib/suggestionScope';

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
        // Nommer l'étape et le nombre : « il manque quelque chose quelque part »
        // n'aide personne à finir.
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
     * LA FICHE TECHNIQUE N'EST PLUS UNE ÉTAPE.
     *
     * Elle ouvrait le parcours parce que c'est le document dont l'IA tire les
     * valeurs. Mais quand elle est déjà déposée — le cas courant, un
     * référencement précédent ou la matière première d'origine — l'étape ne
     * demandait rien et il fallait la traverser ; et quand elle manque, c'est
     * pendant la saisie qu'on s'en aperçoit, pas avant.
     *
     * Elle est donc dans le volet « Contexte », juste au-dessus des suggestions
     * qu'elle alimente (voir `panels/TechnicalSheetPanel.js`) : consultable de
     * partout, déposable au moment où son absence se voit.
     */

    /*
     * LES SUGGESTIONS NE SONT PLUS UNE ÉTAPE.
     *
     * Elles en étaient une, insérée en deuxième position dès que becpg-ai avait
     * répondu. Deux défauts venaient de là et non du contenu : le nombre
     * d'étapes changeait sous les pieds du fournisseur — « étape 2 sur 13 »
     * devenait « sur 14 » en cours de route, et « Suivant » ne menait plus au
     * même endroit — et surtout ce que l'IA a lu concerne TOUTES les étapes, pas
     * un moment du parcours : rangé au rang 2, il n'était consultable qu'en
     * revenant en arrière.
     *
     * Elles vivent désormais dans le panneau « Contexte », à droite, à côté du
     * cahier des charges et des remarques du client : visible pendant la saisie,
     * quelle que soit l'étape en cours, et recalculé à chaque changement d'étape.
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
    // `initialData` : quand la route de la tâche a déjà composé l'état, il est
    // peint immédiatement et la requête se contente de le rafraîchir derrière.
    const state = useApi(entityId ? `wizard/${encodeURIComponent(entityId)}` : null, {
        params,
        initialData: initialState,
    });
    const wizardState = state.data;
    const entityNodeRef = wizardState && wizardState.entity ? wizardState.entity.nodeRef : entityId;

    // becpg-ai is optional: a 503 `aiDisabled` simply means no suggestions step.

    /*
     * `suggestionsByField` a été supprimé avec les badges de confiance : il ne
     * servait qu'à poser un niveau sur le libellé d'un champ.
     */

    const commentsEnabled = Boolean(wizardState && wizardState.comments);
    const discussion = useDiscussion({ nodeRef: entityNodeRef, enabled: commentsEnabled });

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
     * L'étape demandée peut n'exister QU'APRÈS le premier rendu.
     *
     * « Suggestions » n'est ajoutée que lorsque becpg-ai a répondu, ce qui prend
     * de quelques secondes à une demi-minute. Ouvrir directement
     * `?step=__suggestions` — le lien qu'on s'envoie, celui qu'on met en favori —
     * demandait donc une étape que le modèle ne contenait pas encore : le repli
     * sur la première étape s'appliquait, et comme il rendait `currentId` valide,
     * plus rien ne ramenait ensuite le fournisseur là où il allait. La demande
     * était perdue sans avoir jamais été refusée.
     *
     * Elle reste donc en attente tant qu'elle n'a pas pu être honorée, et ne
     * l'est qu'une fois. Une navigation manuelle la périme sur-le-champ — `goTo`
     * marque la reprise comme consommée — parce que rien ne doit déplacer un
     * fournisseur qui vient de choisir son étape, fût-ce au nom de ce qu'il
     * demandait dix secondes plus tôt.
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
            // L'étape demandée vient d'apparaître : on l'honore, enfin.
            anchor(resumeStepId);
        }
    }

    const currentId = nav.currentId;
    const currentIndex = steps.findIndex((step) => step.id === currentId);
    const currentStep = currentIndex >= 0 ? steps[currentIndex] : null;

    /*
     * LES SUGGESTIONS SONT DEMANDÉES POUR L'ÉTAPE OUVERTE, PAS POUR TOUT.
     *
     * becpg-ai borne son analyse quand on lui nomme la liste — c'est ce que fait
     * l'action « Suggestions » de Share — et le portail transportait déjà ce
     * paramètre sans jamais le renseigner. Il lançait donc les quinze plugins à
     * chaque fois : sur l'étape « Nutriments », le fournisseur recevait aussi la
     * correction orthographique de ses libellés et l'examen de ses certificats,
     * après avoir attendu que tout ait tourné (~26 s mesurées sur dev).
     *
     * Le périmètre fait partie de la CLÉ de l'appel : changer d'étape change la
     * clé, donc relit ce qu'il faut sans qu'on ait à l'orchestrer, et deux
     * étapes de même périmètre partagent leur résultat.
     *
     * `suggestionScopeForStep` ne renvoie que des identifiants vérifiés dans
     * becpg-ai : un identifiant inconnu y répond vide, pas « tout ».
     */
    const suggestionScope = suggestionScopeForStep(currentStep);
    const suggestionsCall = useApi(entityId ? `suggestions/${encodeURIComponent(entityId)}` : null, {
        params: suggestionScope ? { listId: suggestionScope } : undefined,
    });
    const suggestions = useMemo(
        () => (suggestionsCall.data && Array.isArray(suggestionsCall.data.suggestions)
            ? suggestionsCall.data.suggestions
            : []),
        [suggestionsCall.data],
    );

    /* ------------------------------------------------- mandatory-entry gaps */

    /*
     * **Ce qui manque, étape par étape.**
     *
     * `{ [stepId]: { count, labels: string[] } }`, alimenté par les étapes
     * elles-mêmes : `FormStep` y déclare ses champs obligatoires restés vides,
     * `SurveyStep` ses questions obligatoires sans réponse. Rien n'est calculé
     * ici — l'assistant ne connaît ni les définitions de formulaire ni l'arbre de
     * décision, et il ne doit pas se mettre à les connaître.
     *
     * **Ce registre est partiel, et c'est assumé.** Une étape n'est montée que
     * lorsqu'elle est l'étape courante, donc seules les étapes réellement
     * ouvertes s'y déclarent. Il rend visible ce qui manque là où le fournisseur
     * est passé ; l'autorité sur « la fiche est-elle complète » reste le
     * catalogue, relu par `finish()` avant toute clôture (voir plus bas).
     */
    const [stepIssues, setStepIssues] = useState({});

    const reportStepIssues = useCallback((stepId, issues) => {
        setStepIssues((current) => {
            const next = issues && issues.count > 0 ? issues : null;
            const previous = current[stepId] || null;
            // Same verdict, same object identity: without this the report fires
            // on every keystroke and re-renders the whole rail for nothing.
            if (!next && !previous) {
                return current;
            }
            if (next && previous && next.count === previous.count
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

    const incompleteSteps = useMemo(
        () => steps.filter((step) => stepIssues[step.id]),
        [steps, stepIssues],
    );

    const visitedSteps = useMemo(
        () => steps.map((step) => ({
            ...step,
            visited: nav.visited.includes(step.id),
            // The rail is where "which step is not finished" belongs: the answer
            // used to live only inside the step the supplier happened to be on,
            // so leaving it took the answer with it.
            issues: stepIssues[step.id] || null,
        })),
        [steps, nav.visited, stepIssues],
    );

    /* ---------------------------------------------------------- the autosave */

    const autoSave = useAutoSave({
        onError: (error) => toast.error(error),
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

    /*
     * Le catalogue propre à l'assistant, demandé nommément — et **en plus**, pas
     * à la place.
     *
     * `entity/catalog/node` sans `catalogId` renvoie le score enregistré, c'est-à-dire
     * les catalogues du client (INCO, GS1…). Avec un `catalogId`, il renvoie ce
     * catalogue-là et lui seul, formulé sur-le-champ. Les deux réponses sont donc
     * disjointes, et remplacer la première par la seconde ferait disparaître de
     * l'écran les exigences réglementaires du client — l'inverse de ce qu'on veut.
     *
     * D'où deux appels et une fusion. Le second n'existe que si la configuration
     * nomme un catalogue, ce qui est le cas des assistants fournisseur par défaut
     * et d'aucun autre : une instance qui n'en déclare pas ne paie rien.
     */
    // Porté par l'URL du livrable (`&catalogId=`), qui est la convention beCPG —
    // la même que lit `wizard-mgr.get.js` dans Share. La tâche le transporte
    // jusqu'ici sans que l'URL soit jamais réécrite (invariant I1).
    const wizardCatalogId = (task && task.catalogId) || null;
    const wizardCatalog = useApi(
        complianceTouched && entityId && wizardCatalogId
            ? `entities/${encodeURIComponent(entityId)}/catalogs`
            : null,
        { params: { catalogId: wizardCatalogId } },
    );

    /** Score enregistré + catalogue de l'assistant, dédoublonnés sur l'id. */
    const catalogList = useMemo(() => {
        const stored = (catalogs.data && catalogs.data.catalogs) || [];
        const own = (wizardCatalog.data && wizardCatalog.data.catalogs) || [];
        const byId = new Map();
        for (const catalog of [...stored, ...own]) {
            const key = (catalog && (catalog.id || catalog.label)) || '';
            if (key) {
                // Le second gagne : il vient d'être formulé, le premier est stocké.
                byId.set(key, catalog);
            }
        }
        return [...byId.values()];
    }, [catalogs.data, wizardCatalog.data]);
    /*
     * Quels catalogues bloquent : l'instance le dit, jamais le portail. La prop
     * l'emporte (un appelant qui sait), sinon c'est ce que l'état du wizard porte
     * — `PORTAL_BLOCKING_CATALOGS`, vide par défaut. Voir `blockingCatalogs`.
     */
    const gatingCatalogIds = blockingCatalogIds
        || (wizardState && wizardState.blockingCatalogIds)
        || null;
    const blocking = useMemo(
        () => blockingCatalogs(catalogList, gatingCatalogIds),
        [catalogList, gatingCatalogIds],
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
     * Runs a step's declared `nextStepWebScript` server-side, in the background.
     *
     * Never blocking, never fatal — a background hook, as in Share. The
     * route decides *which* script — the wizard only says which step was left.
     */
    const runNextStep = useCallback(
        (stepId) => {
            if (formulatingRef.current || !entityId || !stepId || (wizardState && wizardState.readOnly)) {
                return;
            }
            formulatingRef.current = true;
            setFormulating(true);
            api.post(`wizard/${encodeURIComponent(entityId)}/step/${encodeURIComponent(stepId)}`,
                { action: 'nextStep' }, { params })
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
        },
        [entityId, params, wizardState, complianceTouched, catalogs],
    );

    const goTo = useCallback(
        async (stepId, options = {}) => {
            if (!stepId || stepId === currentId) {
                if (options.field) {
                    setFocusField(options.field);
                }
                return;
            }
            // Le fournisseur choisit : la reprise demandée par l'URL est
            // consommée et ne le déplacera plus.
            setResumeDone(true);
            const leaving = steps.find((step) => step.id === currentId);

            // Nothing is ever left behind: whatever is pending goes out first.
            await autoSave.flush();

            // Run **the script the step declared**, not a formulation regardless.
            //
            // Two templates exist in the configuration: `becpg/remote/formulate…`
            // and `becpg/project/path…&path=SupplierDocuments`, which resolves and
            // creates the folder the documents step then writes into. This branch
            // used to call a blanket formulation for both, so on a step declaring
            // SupplierDocuments (organoList, contactList, packMaterialList, the
            // `supplier-nc` form step) the folder resolution never ran — and every
            // navigation paid for a formulation nobody asked for.
            if (leaving && leaving.nextStepWebScript) {
                runNextStep(leaving.id);
            }

            /*
             * L'IA relit APRÈS chaque étape.
             *
             * Ce qu'elle propose dépend de ce qui est déjà saisi : une étape
             * remplie change les valeurs encore manquantes, et une fiche déposée
             * plus loin dans le parcours ouvre de nouvelles extractions. Calculées
             * une seule fois à l'ouverture, les suggestions vieillissaient pendant
             * toute la saisie — c'est précisément ce que leur ancienne place, une
             * étape figée au rang 2, rendait invisible.
             *
             * `autoSave.flush()` vient d'avoir lieu juste au-dessus : la relecture
             * porte donc bien sur ce qui a été écrit, jamais sur l'état d'avant.
             * L'appel n'est pas attendu — la navigation ne doit rien à l'IA.
             *
             * Il reste utile MALGRÉ la clé d'appel bornée à l'étape : deux étapes
             * de même périmètre — deux formulaires, tous deux `View-properties` —
             * ne changent pas la clé, et sans ce rappel la seconde afficherait ce
             * qui avait été lu avant la saisie de la première.
             */
            suggestionsCall.refresh();

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
        [currentId, steps, autoSave, runNextStep, persist, reduceMotion, suggestionsCall],
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

    /*
     * `goToChange` a été supprimé avec « Aller au champ ».
     *
     * Il résolvait l'étape que visait une suggestion pour y envoyer le
     * fournisseur. Le bouton posait plus de problèmes qu'il n'en réglait : il
     * quittait l'étape en cours de saisie pour une autre, et les suggestions
     * étant désormais dans le panneau permanent, la valeur proposée est lisible
     * DEPUIS l'étape concernée — il n'y a plus nulle part où aller.
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
     * Terminer, **une fois la fiche vérifiée**.
     *
     * ## Ce qui n'allait pas
     *
     * `finishDisabled` ne regardait que les catalogues — et ceux-ci n'étaient lus
     * qu'*une fois l'étape « Conformité » ouverte* (`complianceTouched`). Un
     * fournisseur qui ne l'ouvrait jamais avait donc `catalogs.data === undefined`,
     * donc `blocking === []`, donc un bouton *Terminer* actif : il rendait une
     * fiche incomplète sans que rien ne le lui dise, et sans avoir jamais vu
     * l'écran qui le lui aurait dit. Le garde-fou existait et ne gardait que ceux
     * qui étaient déjà passés devant.
     *
     * ## Ce qui le remplace
     *
     * Deux verdicts, dans cet ordre, **avant** toute clôture :
     *
     *  1. **ce que l'assistant sait** : les champs et les questions obligatoires
     *     restés vides sur les étapes ouvertes (`stepIssues`). C'est ce que le
     *     catalogue ne couvre pas — un questionnaire n'y figure pas ;
     *  2. **ce que le client a déclaré bloquant** : les catalogues, relus *ici*,
     *     à la demande, et pas seulement s'ils se trouvent avoir déjà été
     *     chargés. La lecture reste tardive — elle déclenche une reformulation,
     *     ce qu'on ne veut pas au premier rendu de l'assistant — mais elle n'est
     *     plus conditionnelle.
     *
     * **Un catalogue simplement incomplet ne bloque pas** : voir la note de
     * `blockingCatalogs`. beCPG ne publie aucun marqueur « bloquant », et traiter
     * l'absence de marqueur comme un blocage rendait tout assistant impossible à
     * terminer sur une instance dont un catalogue n'est pas à 100 % — une règle
     * que le dépôt n'a jamais énoncée, appliquée en son nom.
     *
     * Un refus n'est pas un bouton grisé : il **emmène** à l'étape fautive et dit
     * ce qui manque. Un bouton grisé sans explication laisse chercher.
     *
     * beCPG reste l'autorité finale : il peut refuser la clôture pour ses propres
     * raisons (liste figée, branche de refus, catalogue), et son refus est
     * affiché tel quel.
     */
    const finish = useCallback(async () => {
        if (!task) {
            return;
        }
        setFinishing(true);
        try {
            await autoSave.flush();

            // 1 — ce que l'assistant a vu de ses propres yeux. Sauf en mode
            // brouillon, où le client a déclaré qu'une fiche partielle est
            // recevable : le manque est alors signalé, pas opposé.
            const localGap = wizardState.draft
                ? null
                : steps.find((step) => stepIssues[step.id]);
            if (localGap) {
                const issues = stepIssues[localGap.id];
                toast.error(new Error(fill(labels.finishMissingStep, {
                    step: localGap.label,
                    count: issues.count,
                })));
                goTo(localGap.id);
                return;
            }

            /*
             * 2 — les catalogues **que l'instance a déclarés bloquants**.
             *
             * Relus à la demande, parce que `catalogs.data` n'existe que si l'étape
             * Conformité a été ouverte — le trou d'origine. Mais **seulement quand
             * il y a quelque chose à vérifier** : sans id déclaré, `blockingCatalogs`
             * ne peut par construction rien renvoyer (beCPG ne marque aucun
             * catalogue), et l'appel serait un aller-retour réseau — qui déclenche
             * une reformulation — inséré entre le clic et son effet, pour une
             * réponse connue d'avance. « Terminer » doit partir tout de suite.
             */
            let gateList = catalogList.length > 0 ? catalogList : null;
            if (!gateList && gatingCatalogIds && gatingCatalogIds.length > 0) {
                try {
                    const fresh = await api.get(`entities/${encodeURIComponent(entityId)}/catalogs`);
                    gateList = (fresh && fresh.catalogs) || [];
                }
                catch {
                    // Le score est indisponible : on ne bloque pas sur une lecture
                    // qui a échoué. beCPG refusera de lui-même si la fiche ne peut
                    // pas être rendue — c'est lui l'autorité, pas cet écran.
                    gateList = null;
                }
            }
            if (gateList) {
                const stillBlocking = blockingCatalogs(gateList, gatingCatalogIds);
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
        steps, stepIssues, goTo, catalogs, catalogList, gatingCatalogIds, wizardState,
    ]);

    /* ----------------------------------------------------------- the panels */

    /*
     * Ce que le panneau « Contexte » doit savoir des suggestions, en un objet :
     * les cartes, l'état de l'appel, et de quoi les relancer. Assemblé ici parce
     * que c'est le wizard qui détient l'appel, et mémoïsé pour ne pas redessiner
     * le panneau à chaque frappe dans un champ.
     */
    const suggestionsPanel = useMemo(() => ({
        entityId: entityNodeRef,
        // `wizardState.entity` et non `entity` : celui-ci est déclaré plus bas,
        // après les panneaux qui le consomment.
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
            entityNodeRef={entityNodeRef}
            suggestions={suggestionsPanel}
            readOnly={Boolean(wizardState.readOnly)}
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
            onSummary={setDocumentSummary}
            onUploaded={() => suggestionsCall.refresh()}
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
            onFieldClick={(field) => goToField(field.field || field.name)}
            blockingIds={gatingCatalogIds}
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

    /*
     * **Ce qui manque est toujours dit. Ce qui bloque dépend de la configuration.**
     *
     * `draft` est l'attribut par lequel le client déclare qu'on peut rendre
     * depuis n'importe quelle étape (spec §1.4) — donc, en toutes lettres, qu'une
     * fiche partielle est recevable chez lui. Refuser la clôture sur un
     * obligatoire vide dans ce mode reviendrait à contredire son propre
     * paramétrage ; et le registre des manques est de toute façon **partiel** —
     * il ne connaît que les étapes ouvertes — donc un blocage fondé dessus
     * dépendrait de l'endroit où le fournisseur a navigué. Deux bonnes raisons de
     * ne pas en faire un mur là où le client a dit l'inverse.
     *
     * Le manque, lui, est signalé dans les deux cas : dans le rail, et sous le
     * bouton (`finishReason` est rendu même actif — voir `WizardFooter`). Taire
     * une fiche incomplète parce qu'elle est recevable, c'est laisser le
     * fournisseur l'apprendre par un refus de son client.
     *
     * Le bouton se grise donc sur ce qui est **su et bloquant** ; `finish()`
     * revérifie sur ce qui est **vrai** au moment de rendre, parce que les
     * catalogues ne sont chargés qu'après passage par « Conformité ».
     */
    const draftMode = Boolean(wizardState && wizardState.draft);
    const finishDisabled = blocking.length > 0 || (!draftMode && incompleteSteps.length > 0);
    const finishReason = incompleteSteps.length > 0
        ? fill(labels.finishMissingStep, {
            step: incompleteSteps[0].label,
            count: stepIssues[incompleteSteps[0].id].count,
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
        /* Les langues de saisie de la fiche, mises à disposition des contrôles
           `d:mltext` sans traverser cinq composants — voir ContentLocalesProvider. */
        <ContentLocalesProvider value={wizardState.contentLocales}>
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
                          * Only from `lg` up: below it there is no side panel and
                          * no rail to put away — the layout is already the one
                          * this button produces.
                          */}
                        <Button
                            variant="outline"
                            size="sm"
                            icon={wide ? 'width_normal' : 'width_wide'}
                            onClick={toggleWide}
                            title={wide ? labels.restore : labels.widenHint}
                            aria-pressed={wide}
                            className="hidden lg:inline-flex"
                        >
                            {wide ? labels.restore : labels.widen}
                        </Button>
                        {/* With the panels away, they stay one click away. */}
                        {wide ? (
                            <div className="hidden items-center gap-1 lg:flex">
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
                        LE CORPS DE L'ÉTAPE N'EST DERRIÈRE AUCUNE ANIMATION DE SORTIE.

                        Il l'a été, dans un `<AnimatePresence mode="wait">`. Ce mode
                        garde l'ancien enfant monté tant que sa sortie n'est pas
                        terminée, puis monte le nouveau. Quand cette sortie ne se
                        termine jamais — observé en production le 2026-08-13,
                        framer-motion 12.43 — le nouvel enfant n'est jamais monté :
                        le rail, qui est hors du bloc, marquait bien la nouvelle
                        étape et l'URL suivait, pendant que le panneau restait
                        figé sur l'étape d'arrivée. Un nœud du DOM marqué à la main
                        survivait au changement d'étape, ce qui a écarté le
                        remontage et l'animation en cours : l'ancien élément était
                        simplement conservé.

                        Conséquence : les suggestions de l'IA étaient inatteignables
                        alors que le serveur les produisait, et toutes les autres
                        étapes l'étaient tout autant.

                        Le remplacement est une animation d'ENTRÉE seule, remontée
                        par la clé. Sans sortie il n'y a rien à attendre, donc rien
                        qui puisse bloquer : le contenu ne peut plus dépendre de
                        l'aboutissement d'une animation. On perd le fondu sortant,
                        qui ne valait pas ce risque sur le contenu principal.
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
                    entityNodeRef={entityNodeRef}
                    suggestions={suggestionsPanel}
                    readOnly={Boolean(wizardState.readOnly)}
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
        </ContentLocalesProvider>
    );
}
