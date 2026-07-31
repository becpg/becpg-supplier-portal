/**
 * Questionnaires — **the decision tree, not a datalist**.
 *
 * ## Why this module exists
 *
 * `survey:surveyList` looks like a datalist and used to be served as one: nine
 * columns, an "add row" button, a generic association picker for the answers.
 * That rendering is not merely ugly, it is **structurally wrong**, and beCPG's
 * own model says why — there are two types, not one:
 *
 * | type | what it is | who writes it |
 * |---|---|---|
 * | `survey:surveyQuestion` | the **structure**: label, notes, url, response type, choices, `survey:nextQuestion` → the children | the customer, in Share |
 * | `survey:surveyList` | the **answer**: `slChoices`, `slComment`, `slNumberComment`, `slDateComment` | the supplier |
 *
 * A supplier *answers* a questionnaire. It never authors one. Rendering the
 * answers as an editable grid offered "add a row" — i.e. add a question — and,
 * worse, hid three of the six answer types: the datagrid form for
 * `survey:surveyList` declares three fields, so `slNumberComment` and
 * `slDateComment` had no column at all and `survey:responseType` never reached
 * the browser, which is why one control (a multi-valued picker listing every
 * question of the repository) had to answer single-choice, multi-choice and
 * checkbox questions alike.
 *
 * ## The endpoint
 *
 * beCPG already exposes the whole thing, definition included, in one call —
 * it is what Share's own decision tree consumes:
 *
 * ```
 * GET  /becpg/survey?entityNodeRef={nodeRef}&dataListName={surveyList|surveyList@1…}
 * POST /becpg/survey?entityNodeRef=…&dataListName=…      body: { "data": "<json string>" }
 * ```
 *
 * `SurveyServiceImpl.getSurveyData()` walks the **existing** `surveyList` rows,
 * resolves each `slQuestion` and follows `survey:nextQuestion` recursively, so
 * the payload is exactly the questions this entity has to answer — no more, no
 * less. The response is `{ def, data, disabled }`:
 *
 * ```jsonc
 * def[i]  = { id, sort, start, label,
 *             mandatory?, note?, upperNote?, lowerNote?, url?,   // url: string OR array
 *             requirements?: [{ type: Forbidden|Tolerated|Authorized|Info, code?, message }],
 *             choices?: [ { id, label,                            // label "hidden" ⇒ not a radio
 *                           list?: ["<value>|<label>", …],        // presence ⇒ select / checkboxes
 *                           multiple?, checkboxes?,
 *                           comment?, commentLabel?, commentType?, textarea?,
 *                           cid?: "<qid>" | ["<qid>", …] } ] }    // children revealed by THIS choice
 * data[j] = { qid, cid, listOptions?: "v1,v2", comment? }         // ← the only writable part
 * disabled: boolean                                               // beCPG's own write verdict
 * ```
 *
 * A `def` entry **without `choices` is a terminal message**, not a question.
 *
 * ## Writing
 *
 * `saveSurveyData()` resets every `surveyList` row of the list and then re-applies
 * what the posted array carries, keyed by `qid`. Two consequences the portal
 * depends on and must not fight:
 *
 *  1. omitting a question from the payload **clears** its stored answer — which is
 *     how a decision tree is supposed to behave when a branch is abandoned, and
 *     exactly what Share does (its serialiser only emits *visible* questions);
 *  2. the write is idempotent, so the autosave can replay the whole array on every
 *     change without diffing anything.
 *
 * ## The authoring gate
 *
 * {@link sanitiseAnswers} drops every `qid` that is not in the questionnaire beCPG
 * just served, every `cid` that is not one of that question's own choices, and
 * every option value that is not in that choice's list. A crafted `fetch` cannot
 * introduce a question, an answer or an option that the customer did not define —
 * the guarantee is server-side, not a UI convention. There is no create, no delete
 * and no reorder verb for a survey step at all (`lib/adapters/wizard.js`).
 *
 * Server only — never import this from a client component.
 */

import { getJson, postJson } from '@/lib/becpg';
import { BadRequestError } from '@/lib/errors';
import { parseListId } from '@/config/wizards.default';

/** beCPG's questionnaire webscript. GET reads it, POST writes the answers. */
export const SURVEY_PATH = 'becpg/survey';

/** Longest comment accepted from the browser, in characters. */
const MAX_COMMENT_LENGTH = 8000;

/* -------------------------------------------------------------------------- */
/* Reading                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Orders the questions the way Share's `survey-form.get.js` does — by `sort`,
 * ascending, and stably.
 *
 * The order is not cosmetic: the reveal algorithm walks the array once and a
 * child is only shown when its parent has already been processed, so a parent
 * must precede its children. beCPG builds `def` depth-first (parent, then its
 * `nextQuestion`s) and the `bcpg:sort` values follow that walk.
 *
 * @param {Object[]} def raw `def` array
 * @returns {Object[]} a new, sorted array
 */
export function sortQuestions(def) {
    return (Array.isArray(def) ? def.filter(Boolean) : [])
        .map((question, index) => ({ question, index }))
        .sort((a, b) => {
            const left = Number(a.question.sort);
            const right = Number(b.question.sort);
            if (Number.isFinite(left) && Number.isFinite(right) && left !== right) {
                return left < right ? -1 : 1;
            }
            // Same `sort` (or none): keep beCPG's own depth-first order.
            return a.index - b.index;
        })
        .map((entry) => entry.question);
}

/**
 * The answers, normalised — `{ qid, cid, listOptions, comment }` with strings
 * everywhere and nothing else.
 *
 * @param {Object[]} data raw `data` array
 * @returns {Object[]}
 */
function normaliseAnswers(data) {
    return (Array.isArray(data) ? data : [])
        .filter((entry) => entry && typeof entry === 'object' && entry.qid)
        .map((entry) => ({
            qid: String(entry.qid),
            ...(entry.cid === undefined || entry.cid === null ? {} : { cid: String(entry.cid) }),
            ...(entry.listOptions === undefined || entry.listOptions === null
                ? {}
                : { listOptions: String(entry.listOptions) }),
            ...(entry.comment === undefined || entry.comment === null
                ? {}
                : { comment: String(entry.comment) }),
        }));
}

/**
 * Reads one questionnaire.
 *
 * @param {string} entityNodeRef the entity carrying the list
 * @param {string} listId datalist name, `@N` suffix included (`surveyList@1`)
 * @param {Object} [options]
 * @param {boolean} [options.skipSecurityRules]
 * @param {Object} [options.session]
 * @returns {Promise<{listId: string, listName: string|null, listIndex: number,
 *                    questions: Object[], answers: Object[], disabled: boolean}>}
 *
 * @example
 * const survey = await getSurvey(nodeRef, 'surveyList@1', { session });
 * survey.questions[0].choices[0].list; // ["<uuid>|Perfect", …]
 */
export async function getSurvey(entityNodeRef, listId, options = {}) {
    if (!entityNodeRef) {
        throw new BadRequestError('getSurvey requires an entity nodeRef');
    }
    if (!listId) {
        throw new BadRequestError('getSurvey requires a listId');
    }

    const payload = await getJson(SURVEY_PATH, {
        query: {
            entityNodeRef,
            dataListName: listId,
            ...(options.skipSecurityRules ? { skipSecurityRules: 'true' } : {}),
        },
        session: options.session,
    });

    const { name: listName, index: listIndex } = parseListId(listId);

    return {
        listId,
        listName,
        listIndex,
        questions: sortQuestions(payload?.def),
        answers: normaliseAnswers(payload?.data),
        // beCPG's own verdict on this list, computed from the entity ACL and the
        // list state. The portal's `step.readOnly` is a second, independent gate;
        // neither overrides the other, both are honoured.
        disabled: payload?.disabled === true,
    };
}

/* -------------------------------------------------------------------------- */
/* Writing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * `"<value>|<label>"` → `{ value, label }`; a bare item is its own value.
 * Same rule as `decision-tree.js:_parseListItem` — split on the **first** `|`
 * only when it is not the leading character.
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
 * Indexes a questionnaire: which questions exist, which choices each one offers,
 * and which option values each choice accepts.
 *
 * @param {Object[]} questions sorted `def`
 * @returns {Map<string, {choices: Set<string>, options: Map<string, Set<string>>}>}
 */
function indexQuestions(questions) {
    const index = new Map();
    for (const question of questions || []) {
        if (!question?.id) {
            continue;
        }
        const choices = new Set();
        const options = new Map();
        for (const choice of question.choices || []) {
            if (!choice?.id) {
                continue;
            }
            choices.add(String(choice.id));
            if (Array.isArray(choice.list)) {
                options.set(
                    String(choice.id),
                    new Set(choice.list.map((item) => parseListItem(item).value)),
                );
            }
        }
        index.set(String(question.id), { choices, options });
    }
    return index;
}

/**
 * **The authoring gate.** Keeps only what the questionnaire beCPG just served
 * actually defines.
 *
 * - an entry whose `qid` is not a question of this list is dropped;
 * - a `cid` that is not one of that question's own choices is dropped;
 * - an option value that is not in that choice's list is dropped;
 * - an entry left carrying nothing at all is dropped — which, given that
 *   `saveSurveyData` resets before re-applying, is precisely "this question has
 *   no answer".
 *
 * The last rule is also a safety one and the single place this module diverges
 * from Share: Share serialises an untouched checkbox group as
 * `{ qid, cid, listOptions: "" }`, and beCPG then runs `"".split(",")` through
 * `new NodeRef(store, "")`. Sending nothing writes exactly the same thing —
 * an empty `slChoices` — without asking the repository to resolve an empty id.
 *
 * @param {*} answers whatever the browser posted
 * @param {Object[]} questions the questionnaire as beCPG serves it
 * @returns {Object[]} the array to hand to beCPG
 */
export function sanitiseAnswers(answers, questions) {
    const index = indexQuestions(questions);
    const result = [];

    for (const entry of Array.isArray(answers) ? answers : []) {
        if (!entry || typeof entry !== 'object') {
            continue;
        }
        const qid = entry.qid === undefined || entry.qid === null ? '' : String(entry.qid);
        const definition = index.get(qid);
        if (!definition) {
            // Not a question of this list: a supplier may answer, never author.
            continue;
        }

        const cid = entry.cid === undefined || entry.cid === null ? '' : String(entry.cid);
        const known = cid && definition.choices.has(cid) ? cid : '';

        let listOptions = '';
        if (entry.listOptions !== undefined && entry.listOptions !== null && known) {
            const allowed = definition.options.get(known);
            listOptions = String(entry.listOptions)
                .split(',')
                .map((value) => value.trim())
                .filter((value) => value !== '' && (!allowed || allowed.has(value)))
                .join(',');
        }

        let comment = '';
        if (entry.comment !== undefined && entry.comment !== null) {
            comment = String(entry.comment).slice(0, MAX_COMMENT_LENGTH);
        }

        // A synthetic `sub-…` id is beCPG's container for a response-type
        // question, not a node: it is only meaningful next to `listOptions`
        // (`saveSurveyData` falls back to `cid` as a choice nodeRef when
        // `listOptions` is absent, which would make it resolve `sub-…`).
        const isSynthetic = known.startsWith('sub-');
        const keepCid = known && (!isSynthetic || listOptions !== '');

        if (!keepCid && listOptions === '' && comment === '') {
            continue;
        }

        result.push({
            qid,
            ...(keepCid ? { cid: known } : {}),
            ...(listOptions === '' ? {} : { listOptions }),
            ...(comment === '' ? {} : { comment }),
        });
    }

    return result;
}

/**
 * Writes the answers of one questionnaire.
 *
 * The whole answer set is posted every time: `saveSurveyData` resets the rows and
 * re-applies what it is given, so a partial payload would silently erase what it
 * omits. The caller therefore always sends the complete, currently-visible set —
 * which is also what makes abandoning a branch clear its answers, as in Share.
 *
 * @param {string} entityNodeRef
 * @param {string} listId datalist name, `@N` suffix included
 * @param {Object[]} answers `[{ qid, cid?, listOptions?, comment? }]`
 * @param {Object} [options]
 * @param {boolean} [options.skipSecurityRules]
 * @param {Object} [options.session]
 * @returns {Promise<{listId: string, answers: Object[], savedAt: string}>}
 * @throws {BadRequestError} when beCPG reports the questionnaire as read-only
 */
export async function saveSurvey(entityNodeRef, listId, answers, options = {}) {
    // Re-read first: it is the questionnaire's own definition that says which
    // answers exist, and beCPG's `disabled` that says whether it may be written
    // at all. Both come from the same call, and it costs ~2 KB.
    const current = await getSurvey(entityNodeRef, listId, options);

    if (current.disabled) {
        // The webscript would silently answer with the questionnaire instead of
        // saving (`access.canWrite()` is false), i.e. a 200 for a write that
        // never happened. Refuse it here, with the reason.
        throw new BadRequestError(`Questionnaire "${listId}" is read-only for this user`, {
            details: { listId },
        });
    }

    const payload = sanitiseAnswers(answers, current.questions);

    await postJson(
        SURVEY_PATH,
        // beCPG expects the array as a **JSON string** under `data`
        // (`saveSurveyData`: `new JSONArray(data.getString("data"))`), which is
        // what Share's hidden form field carries.
        { data: JSON.stringify(payload) },
        {
            query: {
                entityNodeRef,
                dataListName: listId,
                ...(options.skipSecurityRules ? { skipSecurityRules: 'true' } : {}),
            },
            session: options.session,
            retries: 0,
        },
    );

    return { listId, answers: payload, savedAt: new Date().toISOString() };
}
