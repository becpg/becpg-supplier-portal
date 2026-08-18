'use client';

/**
 * A `survey` step — **the customer's questionnaire, answered as a decision tree**.
 *
 * ## What changed, and why it is not cosmetic
 *
 * This step used to render `survey:surveyList` as a datalist: the same rows, the
 * same columns, the same "add row" button as `ingList`. Three things were wrong
 * with that, and only the first one was visible:
 *
 *  1. **a supplier could add a question.** A row of `survey:surveyList` is an
 *     *answer*; the question is a `survey:surveyQuestion` its customer authored.
 *     "Ajouter une ligne" on a questionnaire means "invent a question", which is
 *     meaningless — and was offered because the grid honours
 *     `permissions.create`, as it should for a real list.
 *  2. **half the answer types had no control.** The datagrid form for
 *     `survey:surveyList` declares three fields, so `slNumberComment` and
 *     `slDateComment` had no column: a question whose answer is a number or a
 *     date was answered in a text box, and an answer already recorded in Share
 *     was not displayed at all.
 *  3. **`survey:responseType` never reached the browser.** One control — a
 *     multi-valued association picker listing every question of the repository —
 *     answered single-choice, multi-choice and checkbox questions alike, so a
 *     single-choice question happily collected two contradictory answers.
 *
 * None of that is fixable inside a datalist, because the missing information is
 * not in the datalist: it is in `survey:surveyQuestion`. beCPG serves both, plus
 * the `survey:nextQuestion` links, in one call — `GET /becpg/survey` — and that
 * is what this step now consumes (`lib/adapters/survey.js`), through the same
 * `GET /api/v1/wizard/{entityId}/step/{stepId}` as every other step, so the
 * read-only and frozen verdicts still come from the single security call.
 *
 * ## Answering
 *
 * The tree itself is `components/survey/DecisionTree.js`. This file owns what
 * surrounds it: progress, autosave, and what "submit" means.
 *
 * - **Autosave.** Every change schedules a write of the *whole* visible answer
 *   set (`PUT …/step/{id}` with `{ answers }`), debounced by `useAutoSave`.
 *   `saveSurveyData` resets the rows and re-applies what it receives, so posting
 *   everything is both correct and idempotent — and it is what makes a reload
 *   mid-questionnaire lose nothing.
 * - **Submit.** There is no "send" button, on purpose: the answers are already
 *   saved. What the button does is **check**, because a questionnaire with a
 *   blank mandatory question is not finished. It names the questions, focuses
 *   the first one and refuses to say "complete" — it never blocks the save, and
 *   it never silently accepts either.
 *
 * ## Several instances
 *
 * Aryzta has four (`surveyList`, `surveyList@1`, `@2`, `@3`). Nothing here knows
 * that: each is a step with its own `listId`, its own request, its own autosave
 * key and its own DOM id prefix, so two on screen never share a radio group.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Icon } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { GaugeBar } from '@/components/ui/Gauge';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { ReadOnlyNotice } from '@/components/datalist/DataListToolbar';
import { DecisionTree, questionDomId } from '@/components/survey/DecisionTree';
import { useToast } from '@/components/providers/ToastProvider';
import { api, useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        discuss: 'Discussion',
        answered: '{answered} réponse(s) sur {total}',
        empty: 'Aucune question',
        emptyHint: 'Votre client n’a pas encore publié de questionnaire pour cette fiche.',
        check: 'Vérifier mes réponses',
        complete: 'Questionnaire complet',
        missingTitle: '{count} question(s) obligatoire(s) sans réponse',
        missingHint: 'Sélectionnez une question pour vous y rendre. Vos autres réponses sont déjà enregistrées.',
        readOnly: 'Consultation seule',
        noneAnswered: 'Aucune réponse enregistrée',
        noneAnsweredHint: 'Le questionnaire s’affichera au fur et à mesure de vos réponses.',
        dropped: 'Votre client n’a pas prévu de place pour {count} de vos réponses : {questions}. Elles ne sont pas enregistrées — signalez-le à votre client.',
    },
    en: {
        discuss: 'Discussion',
        answered: '{answered} of {total} answered',
        empty: 'No question',
        emptyHint: 'Your customer has not published a questionnaire for this sheet yet.',
        check: 'Check my answers',
        complete: 'Questionnaire complete',
        missingTitle: '{count} mandatory question(s) still blank',
        missingHint: 'Pick one to jump to it. Your other answers are already saved.',
        readOnly: 'View only',
        noneAnswered: 'No answer recorded',
        noneAnsweredHint: 'The questionnaire unfolds as you answer it.',
        dropped: 'Your customer left nowhere to store {count} of your answers: {questions}. They are not saved — tell your customer.',
    },
};

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])));
}

/** At most three question ids, named the way the supplier read them. */
const NAMED_QUESTIONS = 3;

/**
 * Names the questions behind a list of ids, for a message the supplier reads.
 *
 * @param {Object} survey the questionnaire payload, `{ questions }`
 * @param {string[]} ids
 * @returns {string}
 */
function questionLabels(survey, ids) {
    const byId = new Map((survey?.questions || []).map((question) => [question.id, question]));
    const labels = ids.map((id) => byId.get(id)?.label || id);
    return labels.length > NAMED_QUESTIONS
        ? `${labels.slice(0, NAMED_QUESTIONS).join(', ')}…`
        : labels.join(', ');
}

/**
 * @param {Object} props
 * @param {string} props.entityId entity nodeRef
 * @param {Object} props.step the computed step (`readOnly` / `frozen` included)
 * @param {Object} [props.params] `wizardId`, `siteId`, `locale`
 * @param {Object} [props.autoSave] the wizard's `useAutoSave` instance. **Absent
 *        ⇒ the tree is read-only**: `ReviewStep` embeds the steps with no
 *        autosave, and a control that accepts input it then discards is worse
 *        than no control.
 * @param {string} [props.readOnlyReason] `frozen` | `readAccess` | `noAssignedTask` | `wizardReadOnly`
 * @param {Function} [props.onComment] `({ nodeRef, label }) => void`
 * @param {Function} [props.onIssues] `(stepId, {count, labels}) => void` — the
 *        mandatory questions still blank, so the wizard can mark the step and
 *        refuse to finish. The check below stays: it names them *here*, where
 *        they are answered.
 * @param {string} [props.className]
 */
export function SurveyStep({
    entityId,
    step,
    params,
    autoSave,
    readOnlyReason,
    onComment,
    onIssues,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const toast = useToast();

    // `entityId` is a **nodeRef** on the task route (`workspace://SpacesStore/…`)
    // and a bare uuid on the product route. Unencoded, the `//` collapses to `/`
    // in the URL and the App Router segment no longer matches — the step 404s on
    // the one screen it is meant to be answered from. `FormStep` already encodes;
    // this is the same rule, applied to the read and the write.
    const call = useApi(
        entityId && step
            ? `wizard/${encodeURIComponent(entityId)}/step/${encodeURIComponent(step.id)}`
            : null,
        { params },
    );
    const data = call.data;

    // Three independent verdicts, and the strictest wins: the wizard's own
    // (`step.readOnly`, computed once from the single security call), beCPG's
    // (`disabled`, from the entity ACL and the list state), and "there is nobody
    // to save this".
    const readOnly = Boolean(step.readOnly) || Boolean(data && data.disabled) || !autoSave;
    const questions = useMemo(() => (data && data.questions) || [], [data]);
    const answers = useMemo(() => (data && data.answers) || [], [data]);

    const [progress, setProgress] = useState(null);
    const [checked, setChecked] = useState(false);
    // The questions beCPG acknowledged and stored nowhere. A notice, not an
    // error state: retrying writes them to the same absent row.
    const [dropped, setDropped] = useState([]);

    const missing = useMemo(() => (progress && progress.missing) || [], [progress]);
    // Derived, not frozen at check time. A check that keeps naming a question the
    // supplier has just answered is worse than no check: the list shrinks as the
    // blanks are filled and turns into "complete" on the last one, so the answer
    // to "am I done?" stays true without asking again.
    const invalidIds = useMemo(
        () => (checked ? missing.map((question) => question.id) : []),
        [checked, missing],
    );

    /*
     * The same verdict, reported up to the wizard.
     *
     * « Vérifier mes réponses » already existed, but it spoke to this screen
     * only and had to be asked for. A supplier changing tab took the
     * information away with him, and "Terminer" did not know it at all: a
     * half-answered questionnaire was submitted without a word.
     *
     * A read-only step reports nothing: its blanks are not the supplier's to
     * fill.
     */
    useEffect(() => {
        if (!onIssues) {
            return;
        }
        /*
         * Tant que l'arbre n'est pas lu, l'étape ne statue pas.
         *
         * `progress` est calculé par `DecisionTree` une fois les questions
         * chargées ; avant cela `missing` vaut `[]`, et ce compte rendu disait
         * donc « rien ne manque » dès le premier rendu. Passer vite sur
         * l'onglet suffisait à le faire marquer validé alors qu'aucune réponse
         * n'avait été relue (#35846).
         */
        if (!readOnly && (call.loading || !data || progress === null)) {
            onIssues(step.id, { pending: true, count: 0, labels: [] });
            return;
        }
        onIssues(step.id, readOnly
            ? { count: 0, labels: [] }
            : { count: missing.length, labels: missing.map((question) => question.label) });
    }, [onIssues, step.id, missing, readOnly, call.loading, data, progress]);

    // The answers to send are read at send time, never captured in the closure:
    // a failed write must re-read whatever has been answered since (§4.4 F2).
    const pending = useRef(null);

    const save = useCallback(
        (serialised) => {
            pending.current = serialised;

            if (!autoSave) {
                return;
            }
            autoSave.schedule(
                async () => {
                    const payload = pending.current;
                    if (!payload) {
                        return null;
                    }
                    try {
                        const result = await api.put(`wizard/${encodeURIComponent(entityId)}/step/${encodeURIComponent(step.id)}`, {
                            answers: payload,
                            // A questionnaire answer changes no formulated value:
                            // reformulating on every click would cost a round trip
                            // per radio button. The step's `nextStepWebScript` still
                            // runs when the user leaves the step.
                            formulate: false,
                        }, { params });

                        /*
                         * beCPG answers 200 for answers it stored nowhere: it
                         * updates the rows the entity already has and creates
                         * none, so a question reached through `survey:nextQuestion`
                         * with no row of its own is acknowledged and dropped. The
                         * adapter re-reads and names them; a supplier must never be
                         * told « enregistré » over that.
                         *
                         * Reported, NOT thrown. The autosave keeps a failed task
                         * queued and retries it, and no number of retries will
                         * make beCPG create that row: throwing here would replay
                         * the same write for the rest of the session and block
                         * every other writer behind it. The task is dequeued, and
                         * the supplier is told once, in words.
                         */
                        if (Array.isArray(result?.dropped) && result.dropped.length > 0) {
                            setDropped(result.dropped);
                            toast.error(new Error(fill(labels.dropped, {
                                count: result.dropped.length,
                                questions: questionLabels(data, result.dropped),
                            })));
                        }
                        else if (dropped.length > 0) {
                            setDropped([]);
                        }
                        return result;
                    }
                    catch (error) {
                        toast.error(error);
                        throw error;
                    }
                },
                { key: `survey:${step.id}` },
            );
        },
        [autoSave, entityId, step.id, params, toast, labels, data, dropped.length],
    );

    const check = useCallback(() => {
        setChecked(true);
        if (missing.length > 0) {
            const target = document.getElementById(questionDomId(`survey-${step.id}`, missing[0].id));
            if (target) {
                target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                // `preventScroll`, or the browser's own focus scroll fights the
                // smooth one and lands somewhere between the two.
                target.focus({ preventScroll: true });
            }
        }
    }, [missing, step.id]);

    const goTo = useCallback(
        (questionId) => {
            const target = document.getElementById(questionDomId(`survey-${step.id}`, questionId));
            if (target) {
                target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                target.focus({ preventScroll: true });
            }
        },
        [step.id],
    );

    /* ------------------------------------------------------------- states */

    if (call.error && !data) {
        return <ErrorState error={call.error} onRetry={call.refresh} />;
    }
    if (call.loading && !data) {
        return (
            <div className={`flex flex-col gap-3 ${className}`}>
                <SkeletonCard lines={3} />
                <SkeletonCard lines={3} />
                <SkeletonCard lines={3} />
            </div>
        );
    }

    const title = step.title || step.label;

    return (
        <div className={`min-w-0 ${className}`}>
            <div className="mb-3 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    {title ? (
                        <h3 className="text-base font-medium text-[var(--becpg-blue)]">{title}</h3>
                    ) : null}
                    {readOnly ? (
                        <StatusPill status="readonly" tone="neutral" icon="lock" size="sm" label={labels.readOnly} />
                    ) : null}
                    {onComment ? (
                        <Button
                            variant="outline"
                            size="sm"
                            icon="forum"
                            className="ml-auto"
                            onClick={() =>
                                onComment({ nodeRef: (data && data.listNodeRef) || entityId, label: step.label })}
                        >
                            {labels.discuss}
                        </Button>
                    ) : null}
                </div>

                {progress && progress.total > 0 ? (
                    <GaugeBar
                        value={progress.percent}
                        label={fill(labels.answered, { answered: progress.answered, total: progress.total })}
                    />
                ) : null}
            </div>

            {step.readOnly ? (
                <ReadOnlyNotice reason={step.frozen ? 'frozen' : readOnlyReason || 'wizardReadOnly'} />
            ) : null}

            {questions.length === 0 ? (
                <EmptyState variant="empty" icon="quiz" title={labels.empty} message={labels.emptyHint} />
            ) : (
                <>
                    <DecisionTree
                        // One prefix per step: two questionnaires on the same
                        // screen must not share a radio group nor a DOM id.
                        idPrefix={`survey-${step.id}`}
                        questions={questions}
                        answers={answers}
                        readOnly={readOnly}
                        invalidIds={invalidIds}
                        onChange={readOnly ? undefined : save}
                        onProgress={setProgress}
                        emptyState={
                            <EmptyState
                                variant="empty"
                                icon="quiz"
                                title={labels.noneAnswered}
                                message={labels.noneAnsweredHint}
                                compact
                            />
                        }
                    />

                    {readOnly ? null : (
                        <div className="mt-4 flex flex-col gap-2">
                            {/* Persistent, because it survives no retry: the
                                questionnaire has nowhere to store these answers
                                until the customer gives them a row. */}
                            {dropped.length > 0 ? (
                                <div
                                    role="alert"
                                    className="rounded-xl border border-[var(--status-danger)] bg-[var(--status-danger-bg)] p-3"
                                >
                                    <p className="flex items-start gap-1.5 text-sm font-medium text-[var(--status-danger)]">
                                        <Icon name="error_outline" size={18} className="mt-px shrink-0" />
                                        {fill(labels.dropped, {
                                            count: dropped.length,
                                            questions: questionLabels(data, dropped),
                                        })}
                                    </p>
                                </div>
                            ) : null}
                            {checked && missing.length > 0 ? (
                                <div
                                    role="alert"
                                    className="rounded-xl border border-[var(--status-danger)] bg-[var(--status-danger-bg)] p-3"
                                >
                                    <p className="flex items-start gap-1.5 text-sm font-medium text-[var(--status-danger)]">
                                        <Icon name="error_outline" size={18} className="mt-px shrink-0" />
                                        {fill(labels.missingTitle, { count: missing.length })}
                                    </p>
                                    <p className="mt-1 text-xs text-[var(--becpg-dark-grey-deep)]">
                                        {labels.missingHint}
                                    </p>
                                    <ul className="mt-2 flex flex-col gap-1">
                                        {missing.map((question) => (
                                            <li key={question.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => goTo(question.id)}
                                                    className="touch-target text-left text-sm text-[var(--becpg-blue)] underline underline-offset-2 hover:text-[var(--becpg-blue-light)]"
                                                >
                                                    {question.label}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}

                            {checked && missing.length === 0 ? (
                                <p className="flex items-center gap-1.5 text-sm text-[var(--status-ok)]">
                                    <Icon name="task_alt" size={18} />
                                    {labels.complete}
                                </p>
                            ) : null}

                            <div>
                                <Button variant="outline" size="sm" icon="fact_check" onClick={check}>
                                    {labels.check}
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
