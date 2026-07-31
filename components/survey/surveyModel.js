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
 * { [qid]: { cid: '<choice id>'|null, listOptions: 'v1,v2', comment: 'text' } }
 * ```
 *
 * One entry per **question**, not per choice: beCPG stores one `survey:surveyList`
 * row per question, with one `slComment` and one `slChoices`.
 */

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
        state[question.id] = {
            // A radio question keeps the chosen choice id; a list question keeps
            // its container's id, so `cid` is always the thing beCPG expects back.
            cid: stored?.cid || (list ? list.id : null) || null,
            listOptions: stored?.listOptions || '',
            comment: stored?.comment || '',
        };
    }
    return state;
}

/**
 * Walks the tree and returns the ids of the questions that must be shown.
 *
 * A direct port of `toggleVisible`, minus the DOM: single pass, in `sort` order,
 * `visible` growing as parents are processed.
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

    for (let index = 0; index < (questions || []).length; index += 1) {
        const question = questions[index];
        if (!question?.id) {
            continue;
        }

        if (index === 0 || question.start === true) {
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
 * Only **visible** questions contribute (rule 3 above). One divergence, shared
 * with `lib/adapters/survey.js` and deliberate: an entry carrying nothing at all
 * is omitted rather than sent as `{ qid, cid, listOptions: "" }`. beCPG resets
 * every row before re-applying, so the stored answer is cleared either way — and
 * the empty form makes the repository resolve `new NodeRef(store, "")`.
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

        for (const choice of question.choices) {
            if (!isChoiceSelected(question, choice, state)) {
                continue;
            }

            const options = Array.isArray(choice.list) ? selectedOptions(choice, state).join(',') : '';
            const comment = choice.comment ? String(state.comment || '') : '';
            const synthetic = String(choice.id || '').startsWith('sub-');
            const keepCid = choice.id && (!synthetic || options !== '');

            if (!keepCid && options === '' && comment === '') {
                continue;
            }

            result.push({
                qid: question.id,
                ...(keepCid ? { cid: choice.id } : {}),
                ...(options === '' ? {} : { listOptions: options }),
                ...(comment === '' ? {} : { comment }),
            });
        }
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
    const list = listChoiceOf(question);
    if (list) {
        if (selectedOptions(list, state).length > 0) {
            return true;
        }
    }
    else if (state.cid && (question.choices || []).some((choice) => choice.id === state.cid && choice.label !== 'hidden')) {
        return true;
    }
    const comment = commentChoiceOf(question, state);
    return Boolean(comment) && String(state.comment || '').trim() !== '';
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
        const done = isAnswered(question, answerState ? answerState[question.id] : null);
        if (done) {
            answered += 1;
        }
        else if (question.mandatory) {
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
    const label = question?.label || '';
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

/**
 * Notes and labels authored in Share carry light HTML (`<br>`, `<b>`, `<ul>`).
 * The portal renders **no** HTML — there is no `dangerouslySetInnerHTML` in this
 * codebase and a supplier-facing screen is not the place to introduce one — so
 * the markup is turned into the structure it described: lines, and bullets.
 *
 * @param {string|null} value
 * @returns {Array<{bullet: boolean, text: string}>} empty when there is nothing to show
 */
export function richTextLines(value) {
    const raw = String(value ?? '');
    if (!raw.trim()) {
        return [];
    }
    const marked = raw
        // Every block-level end is a line break…
        .replace(/<\s*br\s*\/?\s*>/gi, '\n')
        .replace(/<\s*\/\s*(p|div|tr|h[1-6])\s*>/gi, '\n')
        // …and a list item is a line that gets a bullet.
        .replace(/<\s*li[^>]*>/gi, '\n')
        .replace(/<\s*\/\s*li\s*>/gi, '\n')
        // Everything else goes, tags and entities alike.
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#0?39;/gi, "'");

    return marked
        .split('\n')
        .map((line) => ({ bullet: line.startsWith(''), text: line.replace(//g, '').trim() }))
        .filter((line) => line.text !== '');
}
