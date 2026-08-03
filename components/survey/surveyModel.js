/**
 * The decision tree, as pure functions — **a port of Share's `decision-tree.js`**.
 *
 * Everything here is deliberately free of React and of the DOM, for one reason:
 * Share's component reads the answers back out of the DOM on every change
 * (`toggleVisible` walks `Dom.get(...)`), which is exactly why its reveal rules
 * are impossible to reason about, and impossible to test. The rules are the same
 * ones; the state they read is an object.
 *
 * ## The three rules that make it a *tree*
 *
 *  1. **Roots.** Only `i === 0` (the first question in `sort` order) and any
 *     question flagged `start: true` are shown to begin with. beCPG sets `start`
 *     on the first question it emits and on every question whose
 *     `survey:questionIsVisible` is true.
 *  2. **Children.** A child id listed in `choice.cid` becomes visible **only when
 *     that choice is actually selected** — not merely because the parent is
 *     answered (`_processQuestionChoices`, line 734 of the original). The array
 *     is walked once, in order, so a parent always precedes its children; that is
 *     why {@link sortQuestions} on the server matters.
 *  3. **Hidden means unanswered.** A question that is not visible contributes
 *     nothing to the serialised answers — Share's `result` only ever collects
 *     visible questions.
 *
 * ## What happens to a hidden child's stored answer
 *
 * **It is kept locally and cleared in beCPG — which is Share's behaviour, kept
 * on purpose.** Concretely: changing a parent's answer hides its children, but
 * their answers stay in the local state, so putting the parent's answer back
 * restores them instantly and nothing is lost while the user hesitates. What is
 * *sent* is `serialiseAnswers()`, which contains visible questions only, and
 * `SurveyServiceImpl.saveSurveyData` resets every row before re-applying what it
 * receives — so the abandoned branch is cleared in the repository. That is the
 * only coherent semantic: an answer to a question that was never asked is not an
 * answer, and leaving it behind would let a supplier submit a questionnaire whose
 * stored answers contradict the branch it actually took.
 *
 * ## The answer state
 *
 * ```js
 * { [qid]: { cid: '<choice id>'|null, listOptions: 'v1,v2',
 *            comment: 'text', commentCid: '<the choice that comment belongs to>' } }
 * ```
 *
 * One entry per **question**, not per choice: beCPG stores one `survey:surveyList`
 * row per question, with one `slComment` and one `slChoices`.
 *
 * ### Why `commentCid` exists
 *
 * A comment is configured on the **choice**, not on the question: in `def`, each
 * radio answer carries its own `commentType` / `commentLabel`
 * (`SurveyServiceImpl.appendQuestionDefinition`, the `else` branch reads
 * `defChoice.getResponseCommentType()`). "Rainy" can ask for a textarea and
 * "Sunny" for a number, on the same question — and the repository still has only
 * one `slComment` to store it in.
 *
 * Share resolves that with the DOM: there is a single comment container per
 * question, and `insertComment` **rebuilds it** whenever the selected choice
 * differs from the input's `data-choice-id` (`decision-tree.js:1031-1052`), which
 * throws the previous text away. So in Share, changing the answer clears the
 * comment. `commentCid` reproduces exactly that: the text belongs to the choice
 * it was typed for, and reading it back under another choice yields "".
 * Without it a textarea's prose would be posted into a `number` field and
 * `saveSurveyData` would log a `NumberFormatException` per save.
 */

// `richTextLines` / `plainText` used to live here. They turned out to describe
// *any* text authored in Share, not just a survey's — a comment body hits the
// same `<p>`-wrapped HTML — so they moved to `@/lib/format` and there is one
// implementation. Re-exported because the survey screens import them from here.
import { plainText, richTextLines } from '@/lib/format';

export { plainText, richTextLines };

/** Comment control types beCPG can ask for, mapped to an `<input type>`. */
export const COMMENT_INPUT_TYPES = Object.freeze({
    text: 'text',
    number: 'number',
    int: 'number',
    percentage: 'number',
    date: 'date',
    dateTime: 'datetime-local',
});

/** Requirement types beCPG emits, mapped to the portal's status vocabulary. */
export const REQUIREMENT_TONES = Object.freeze({
    forbidden: 'danger',
    tolerated: 'warn',
    authorized: 'ok',
    info: 'info',
});

/**
 * `"<value>|<label>"` → `{ value, label }`; a bare item is its own value.
 * Split on the **first** `|` only, and only when it is not the leading
 * character — `_parseListItem` in the original.
 *
 * @param {string} item
 * @returns {{value: string, label: string}}
 */
export function parseListItem(item) {
    const text = String(item ?? '');
    const separator = text.indexOf('|');
    if (separator > 0) {
        return { value: text.slice(0, separator), label: text.slice(separator + 1) };
    }
    return { value: text, label: text };
}

/**
 * A `def` entry with no `choices` is a **terminal message**, not a question:
 * "Enjoy your bright day!". It is revealed like a child and answers nothing.
 *
 * @param {Object} question
 * @returns {boolean}
 */
export function isMessage(question) {
    return !Array.isArray(question?.choices) || question.choices.length === 0;
}

/**
 * The one choice that carries the list of a response-type question
 * (`list` / `multiChoicelist` / `checkboxes`), or `null` for a radio question.
 *
 * beCPG emits exactly one such choice, with `label: "hidden"` and a synthetic
 * `sub-…` id — it is a container, never something to display.
 *
 * @param {Object} question
 * @returns {Object|null}
 */
export function listChoiceOf(question) {
    return (question?.choices || []).find((choice) => Array.isArray(choice?.list)) || null;
}

/**
 * The choice that carries the comment box of a question, or `null`.
 *
 * For a radio question the comment belongs to a *specific* answer ("I will be
 * rainy" → "How long?"), so it only appears once that radio is selected.
 *
 * @param {Object} question
 * @param {Object} [state] the question's answer state
 * @returns {Object|null}
 */
export function commentChoiceOf(question, state) {
    const choices = (question?.choices || []).filter((choice) => choice?.comment);
    if (choices.length === 0) {
        return null;
    }
    const selected = choices.find(
        (choice) => choice.label === 'hidden' || Array.isArray(choice.list) || isChoiceSelected(question, choice, state),
    );
    return selected || null;
}

/**
 * Is this choice a **container** rather than a real answer node?
 *
 * beCPG generates one for every question that has a response type or a comment
 * and no radio answers: `label: "hidden"`, id `"sub-" + <uuid minus 4 chars>`.
 * It exists to hold the list or the comment box, and it is not a
 * `survey:surveyQuestion` — which matters when serialising, because
 * `saveSurveyData` falls back to `cid` as a choice **nodeRef** whenever
 * `listOptions` is absent.
 *
 * @param {Object} choice
 * @returns {boolean}
 */
export function isChoiceContainer(choice) {
    if (!choice) {
        return false;
    }
    return Array.isArray(choice.list)
        || choice.label === 'hidden'
        || String(choice.id || '').startsWith('sub-');
}

/**
 * Is this choice selected, given the question's answer state?
 *
 * A choice whose `label` is `"hidden"` is a container beCPG generates for a
 * response-type or comment-only question: it is *always* selected, exactly as in
 * `_getChoiceData`.
 *
 * @param {Object} question
 * @param {Object} choice
 * @param {Object} [state] `{ cid, listOptions, comment }`
 * @returns {boolean}
 */
export function isChoiceSelected(question, choice, state) {
    if (!choice) {
        return false;
    }
    if (Array.isArray(choice.list)) {
        // A list choice is "selected" as soon as it exists — Share renders the
        // control, and `checkboxes` groups report themselves selected even when
        // nothing is ticked. What decides the *children* is `reveals` below.
        return true;
    }
    if (choice.label === 'hidden') {
        return true;
    }
    return Boolean(state) && state.cid === choice.id;
}

/**
 * The comment text to show — and to send — for this question.
 *
 * Empty as soon as the answer moved to a choice other than the one the text was
 * typed for, which is what Share's `insertComment` does by rebuilding the input
 * whenever its `data-choice-id` no longer matches the selected choice. Anything
 * else would show a textarea's prose inside the `number` box of the next answer,
 * and post it there.
 *
 * @param {Object} question
 * @param {Object} [state]
 * @returns {string}
 */
export function commentValue(question, state) {
    const choice = commentChoiceOf(question, state);
    if (!choice || !state) {
        return '';
    }
    if (state.commentCid && state.commentCid !== choice.id) {
        return '';
    }
    return String(state.comment || '');
}

/**
 * The values selected in a list choice, as an array.
 *
 * @param {Object} choice
 * @param {Object} [state]
 * @returns {string[]}
 */
export function selectedOptions(choice, state) {
    if (!choice || !Array.isArray(choice.list) || !state) {
        return [];
    }
    return String(state.listOptions || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
}

/**
 * Does this choice reveal its children? — `showVisible` in `_getChoiceData`.
 *
 * A list choice reveals only when something is actually picked; a radio reveals
 * when it is checked; a hidden container always reveals.
 *
 * @param {Object} question
 * @param {Object} choice
 * @param {Object} [state]
 * @returns {boolean}
 */
export function choiceReveals(question, choice, state) {
    if (!choice) {
        return false;
    }
    if (Array.isArray(choice.list)) {
        return selectedOptions(choice, state).length > 0;
    }
    if (choice.label === 'hidden') {
        return true;
    }
    return Boolean(state) && state.cid === choice.id;
}

/**
 * Builds the initial answer state from the `data` array beCPG serves.
 *
 * @param {Object[]} questions sorted `def`
 * @param {Object[]} answers `data`
 * @returns {Object} `{ [qid]: { cid, listOptions, comment } }`
 */
export function initialAnswerState(questions, answers) {
    const state = {};
    const byQid = new Map();
    for (const entry of answers || []) {
        if (!entry?.qid) {
            continue;
        }
        const previous = byQid.get(String(entry.qid)) || {};
        byQid.set(String(entry.qid), {
            cid: entry.cid === undefined || entry.cid === null ? previous.cid : String(entry.cid),
            listOptions:
                entry.listOptions === undefined || entry.listOptions === null
                    ? previous.listOptions
                    : String(entry.listOptions),
            comment:
                entry.comment === undefined || entry.comment === null
                    ? previous.comment
                    : String(entry.comment),
        });
    }

    for (const question of questions || []) {
        if (!question?.id) {
            continue;
        }
        const stored = byQid.get(String(question.id));
        const list = listChoiceOf(question);
        const seeded = {
            // A radio question keeps the chosen choice id; a list question keeps
            // its container's id, so `cid` is always the thing beCPG expects back.
            cid: stored?.cid || (list ? list.id : null) || null,
            listOptions: stored?.listOptions || '',
            comment: stored?.comment || '',
            commentCid: null,
            // "beCPG already holds an answer for this question." Read by
            // {@link visibleQuestionIds} to rescue orphan roots; see there.
            stored: Boolean(stored),
        };
        // Which choice does the stored comment belong to? The answer is already
        // in `cid`, and `commentChoiceOf` resolves it the same way for all three
        // shapes beCPG serves: `{qid, cid: <answer>, comment}` for a radio,
        // `{qid, cid: "sub-…", listOptions, comment}` for a list, and
        // `{qid, comment}` — no cid at all — for a comment-only question
        // (`SurveyServiceImpl.getSurveyData`, the `responseType` branch).
        seeded.commentCid = commentChoiceOf(question, seeded)?.id || null;
        state[question.id] = seeded;
    }
    return state;
}

/**
 * Every question id that some choice declares as a child.
 *
 * @param {Object[]} questions
 * @returns {Set<string>}
 */
function childQuestionIds(questions) {
    const children = new Set();
    for (const question of questions || []) {
        for (const choice of question?.choices || []) {
            if (!choice?.cid) {
                continue;
            }
            for (const child of Array.isArray(choice.cid) ? choice.cid : [choice.cid]) {
                children.add(child);
            }
        }
    }
    return children;
}

/**
 * Walks the tree and returns the ids of the questions that must be shown.
 *
 * A direct port of `toggleVisible`, minus the DOM: single pass, in `sort` order,
 * `visible` growing as parents are processed.
 *
 * ## The one addition to Share's rule, and why
 *
 * Share's roots are `i === 0 || question.start === true`, full stop. On the
 * questionnaire captured from the reference instance that leaves **two of the
 * three answered questions rooted nowhere**: `start` is
 * `questions.isEmpty() || questionIsVisible` (`SurveyServiceImpl:403`), so only
 * the first row gets it unless the customer ticked `survey:questionIsVisible`,
 * and neither of the other two is any choice's `cid`. Share renders one question
 * out of three and never shows the other two answers.
 *
 * That is not merely a display bug here. {@link serialiseAnswers} sends the
 * visible questions only, and `saveSurveyData` resets every row before
 * re-applying what it receives — so answering the first question would **delete
 * the two answers the supplier had already given**. Reproducing that faithfully
 * would be reproducing data loss.
 *
 * So a third root case: a question beCPG already holds an answer for
 * (`state.stored`) **and that no choice claims as a child**. It is strictly
 * additive — it never hides anything Share shows — and it cannot resurrect an
 * abandoned branch, because a real child is claimed by its parent's `cid` and so
 * is excluded by construction. A branch the supplier walks away from still
 * disappears, and its answer is still cleared, exactly as in Share.
 *
 * @param {Object[]} questions sorted `def`
 * @param {Object} answerState
 * @param {Object} [options]
 * @param {boolean} [options.readOnly] view mode — a root with choices is only
 *        shown when the questionnaire actually holds answers, as in Share
 * @param {boolean} [options.hasAnswers]
 * @returns {Set<string>}
 */
export function visibleQuestionIds(questions, answerState, options = {}) {
    const visible = new Set();
    const readOnly = Boolean(options.readOnly);
    const hasAnswers = Boolean(options.hasAnswers);
    const children = childQuestionIds(questions);

    for (let index = 0; index < (questions || []).length; index += 1) {
        const question = questions[index];
        if (!question?.id) {
            continue;
        }

        const orphanWithAnswer = answerState?.[question.id]?.stored === true
            && !children.has(question.id);

        if (index === 0 || question.start === true || orphanWithAnswer) {
            if (isMessage(question) && !question.mandatory) {
                visible.add(question.id);
            }
            else if (!readOnly) {
                visible.add(question.id);
            }
            else if (hasAnswers) {
                visible.add(question.id);
            }
        }

        if (!visible.has(question.id) || isMessage(question)) {
            continue;
        }

        const state = answerState ? answerState[question.id] : null;
        for (const choice of question.choices) {
            if (!choice?.cid || !choiceReveals(question, choice, state)) {
                continue;
            }
            const children = Array.isArray(choice.cid) ? choice.cid : [choice.cid];
            for (const child of children) {
                visible.add(child);
            }
        }
    }

    return visible;
}

/**
 * Serialises the answers for `POST /becpg/survey` — the equivalent of Share's
 * hidden input, and byte-compatible with it.
 *
 * Only **visible** questions contribute (rule 3 above).
 *
 * **Exactly one entry per question**, and that is not a simplification —
 * `saveSurveyData` indexes the array into a `HashMap<qid, JSONObject>`
 * (`SurveyServiceImpl:214-220`), so a second entry for the same question
 * *silently replaces* the first and the repository keeps only whichever came
 * last. Share reaches the same shape by a different road: it pushes one entry
 * per selected choice and then writes the comment onto `result[result.length-1]`
 * (`_handleCommentVisibility`), which is one entry because exactly one choice of
 * a question is ever selected. Building it directly is the same payload without
 * the assumption.
 *
 * One divergence from Share, shared with `lib/adapters/survey.js` and
 * deliberate: an entry carrying nothing at all is omitted rather than sent as
 * `{ qid, cid, listOptions: "" }`. beCPG resets every row before re-applying, so
 * the stored answer is cleared either way — and the empty form makes the
 * repository resolve `new NodeRef(store, "")`.
 *
 * @param {Object[]} questions sorted `def`
 * @param {Object} answerState
 * @param {Set<string>} [visible] defaults to {@link visibleQuestionIds}
 * @returns {Object[]} `[{ qid, cid?, listOptions?, comment? }]`
 */
export function serialiseAnswers(questions, answerState, visible) {
    const shown = visible || visibleQuestionIds(questions, answerState);
    const result = [];

    for (const question of questions || []) {
        if (!question?.id || !shown.has(question.id) || isMessage(question)) {
            continue;
        }
        const state = (answerState && answerState[question.id]) || {};
        const list = listChoiceOf(question);

        // The choice that carries the answer: the list container for a
        // response-type question, the ticked radio otherwise.
        const answer = list
            || (question.choices || []).find(
                (choice) => !isChoiceContainer(choice) && isChoiceSelected(question, choice, state),
            )
            || null;

        const options = list ? selectedOptions(list, state).join(',') : '';
        const comment = commentValue(question, state);
        // A container id is only ever sent alongside the options it holds: on its
        // own, beCPG resolves `cid` as a choice nodeRef (`optString("listOptions",
        // optString("cid", null))`) and would store a dangling `survey:slChoices`
        // — and `"sub-" + id.substring(4)` is not a node id at all. A real answer
        // node is always sent.
        const keepCid = Boolean(answer?.id) && (!isChoiceContainer(answer) || options !== '');

        if (!keepCid && options === '' && comment === '') {
            continue;
        }

        result.push({
            qid: question.id,
            ...(keepCid ? { cid: answer.id } : {}),
            ...(options === '' ? {} : { listOptions: options }),
            ...(comment === '' ? {} : { comment }),
        });
    }

    return result;
}

/**
 * Has this question been answered?
 *
 * "Answered" is: a radio picked, at least one option selected, or a comment
 * typed — whichever of the three this question actually asks for.
 *
 * @param {Object} question
 * @param {Object} [state]
 * @returns {boolean}
 */
export function isAnswered(question, state) {
    if (!question || isMessage(question) || !state) {
        return false;
    }
    return hasChoice(question, state) || commentValue(question, state).trim() !== '';
}

/**
 * Has a choice been picked on this question? (Ignores the comment.)
 *
 * @param {Object} question
 * @param {Object} [state]
 * @returns {boolean}
 */
function hasChoice(question, state) {
    const list = listChoiceOf(question);
    if (list) {
        return selectedOptions(list, state).length > 0;
    }
    return Boolean(state?.cid)
        && (question.choices || []).some((choice) => choice.id === state.cid && choice.label !== 'hidden');
}

/**
 * Is a **mandatory** question satisfied?
 *
 * Stricter than {@link isAnswered}, and Share's own rule: `insertComment` is
 * called with `question.mandatory` (`decision-tree.js:746`), so the comment box
 * of a mandatory question is a required field too. Picking "Other" and leaving
 * "please specify" empty answers nothing.
 *
 * The gauge deliberately keeps using {@link isAnswered}: a progress bar that
 * refuses to move until an optional-looking box is filled reads as broken.
 *
 * @param {Object} question
 * @param {Object} [state]
 * @returns {boolean}
 */
export function isComplete(question, state) {
    if (!question || isMessage(question) || !state) {
        return false;
    }
    // A comment-only question has no choice to pick: its comment IS the answer.
    const choices = (question.choices || []).filter((choice) => !isChoiceContainer(choice));
    const list = listChoiceOf(question);
    if ((choices.length > 0 || list) && !hasChoice(question, state)) {
        return false;
    }
    return !commentChoiceOf(question, state) || commentValue(question, state).trim() !== '';
}

/**
 * Progress and the blocking questions, computed on what is **currently asked**.
 *
 * A decision tree's total is not fixed: a branch that was never taken was never
 * asked, and counting its questions would show "3 / 40" on a questionnaire that
 * has three questions today. So the denominator is the set of visible questions,
 * messages excluded.
 *
 * @param {Object[]} questions sorted `def`
 * @param {Object} answerState
 * @param {Set<string>} [visible]
 * @returns {{answered: number, total: number, percent: number, missing: Object[]}}
 *          `missing` lists the **mandatory** questions still blank, in order
 */
export function surveyProgress(questions, answerState, visible) {
    const shown = visible || visibleQuestionIds(questions, answerState);
    const asked = (questions || []).filter(
        (question) => question?.id && shown.has(question.id) && !isMessage(question),
    );
    const missing = [];
    let answered = 0;

    for (const question of asked) {
        const state = answerState ? answerState[question.id] : null;
        if (isAnswered(question, state)) {
            answered += 1;
        }
        // Two different verdicts on purpose: the gauge counts what the supplier
        // has touched, the blocking list counts what is actually complete — a
        // mandatory question whose required comment is still blank is not.
        if (question.mandatory && !isComplete(question, state)) {
            missing.push(question);
        }
    }

    return {
        answered,
        total: asked.length,
        percent: asked.length === 0 ? 0 : Math.round((answered / asked.length) * 100),
        missing,
    };
}

/**
 * The legend Share prints: `"Q1 - What is the weather today?"`.
 *
 * The id prefix is only added when the id is short enough to be a human label —
 * `question.id.length < 10` in the original. beCPG's real ids are 36-character
 * uuids, so in production this is just the label; the fixtures that use `q1`,
 * `q2`… get the prefix, and that is where the rule comes from.
 *
 * @param {Object} question
 * @returns {string}
 */
export function questionLegend(question) {
    const label = plainText(question?.label || '');
    const id = String(question?.id || '');
    return id && id.length < 10 ? `${id.toUpperCase()} - ${label}` : label;
}

/**
 * beCPG's `url` is a string or an array of strings, and only `http(s)` and
 * `mailto` are ever rendered as links.
 *
 * @param {string|string[]|null} url
 * @returns {string[]}
 */
export function questionUrls(url) {
    const list = Array.isArray(url) ? url : url ? [url] : [];
    return list
        .map((value) => String(value || '').trim())
        .filter((value) => /^(https?:\/\/|mailto:)/i.test(value));
}

