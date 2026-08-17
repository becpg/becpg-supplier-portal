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
import { logWarn } from '@/lib/http';
import { parseListId } from '@/config/wizards.default';

/** beCPG's questionnaire webscript. GET reads it, POST writes the answers. */
export const SURVEY_PATH = 'becpg/survey';

/** The node type a question is, for the colour lookup. */
const QUESTION_TYPE = 'survey:surveyQuestion';

/** `bcpg:colorAspect`'s only property — the colour a customer paints a row with. */
const COLOR_PROP = 'bcpg:color';

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
    const questions = await withQuestionColors(sortQuestions(payload?.def), options.session);

    return {
        listId,
        listName,
        listIndex,
        questions,
        answers: normaliseAnswers(payload?.data),
        // beCPG's own verdict on this list, computed from the entity ACL and the
        // list state. The portal's `step.readOnly` is a second, independent gate;
        // neither overrides the other, both are honoured.
        disabled: payload?.disabled === true,
    };
}

/**
 * The colour a customer put on his question rows (`bcpg:colorAspect`).
 *
 * A questionnaire is a datalist like any other in Share: the customer colours a
 * line to mark a section, and the datagrid paints it. `becpg/survey` describes
 * the decision tree — id, label, choices, requirements — and carries no colour,
 * so the tree arrived here flat while the same questions were coloured in beCPG.
 *
 * Rather than ask the repository for a new field, the colours are read in **one**
 * db-afts query on the question nodes the tree already names. It is one extra
 * call per questionnaire, it is real time, and it works against an instance
 * nobody has upgraded.
 *
 * A questionnaire whose colours cannot be read is a questionnaire without
 * colours, never a questionnaire that fails to open: the answer is the tree.
 *
 * @param {Object[]} questions the sorted `def`
 * @param {Object} [session]
 * @returns {Promise<Object[]>} the same questions, `color` added where there is one
 */
async function withQuestionColors(questions, session) {
    const ids = questions.map((question) => question?.id).filter(Boolean);
    if (ids.length === 0) {
        return questions;
    }

    let colors = {};
    try {
        const payload = await getJson('becpg/remote/entity/list', {
            query: {
                /*
                 * `ID:` and not `=sys:node-uuid:`, and the TYPE clause is not
                 * decoration either. Measured on 26.1.0: a question node answers
                 * to `TYPE:"survey:surveyQuestion" AND ID:"workspace://…"` and to
                 * nothing else — `=sys:node-uuid:` needs the index, which does
                 * not hold the rows of a live entity, and a bare `ID:` with no
                 * TYPE clause returns nothing at all.
                 */
                query: `TYPE:"${QUESTION_TYPE}" AND (${ids
                    .map((id) => `ID:"workspace://SpacesStore/${id}"`)
                    .join(' OR ')})`,
                fields: COLOR_PROP,
                lists: 'none',
                maxResults: ids.length,
            },
            session,
        });
        colors = (Array.isArray(payload?.entities) ? payload.entities : []).reduce(
            (map, row) => {
                const node = row && row.entity;
                const color = node && node.attributes ? node.attributes[COLOR_PROP] : null;
                return color ? { ...map, [node.id]: color } : map;
            },
            {},
        );
    }
    catch (error) {
        logWarn('survey.colors.unreadable', { listId: null, message: error.message });
        return questions;
    }

    return questions.map((question) => (colors[question.id]
        ? { ...question, color: colors[question.id] }
        : question));
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
        const containers = new Set();
        const options = new Map();
        for (const choice of question.choices || []) {
            if (!choice?.id) {
                continue;
            }
            const id = String(choice.id);
            choices.add(id);
            // beCPG's own container for a response-type / comment-only question:
            // `label: "hidden"`, id `sub-…`. It holds the list or the comment box
            // and is NOT a `survey:surveyQuestion`.
            if (Array.isArray(choice.list) || choice.label === 'hidden' || id.startsWith('sub-')) {
                containers.add(id);
            }
            if (Array.isArray(choice.list)) {
                options.set(id, new Set(choice.list.map((item) => parseListItem(item).value)));
            }
        }
        index.set(String(question.id), { choices, containers, options });
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
 *   no answer";
 * - **at most one entry per question survives**, later fields winning. Not a
 *   nicety: `saveSurveyData` indexes the array into a `HashMap<qid, JSONObject>`
 *   (`SurveyServiceImpl:214-220`), so a caller sending `[{qid, cid}, {qid,
 *   comment}]` would have the choice silently dropped by the repository. Merging
 *   here means the answer that reaches beCPG is the answer that was sent.
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
    // Insertion-ordered, so the questionnaire keeps the order it was answered in
    // and the payload stays readable next to the one Share posts.
    const byQid = new Map();

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

        // A container id is not a node: it is only meaningful next to the options
        // it holds. `saveSurveyData` falls back to `cid` as a choice nodeRef when
        // `listOptions` is absent, and would then store a dangling association.
        const keepCid = Boolean(known) && (!definition.containers.has(known) || listOptions !== '');

        if (!keepCid && listOptions === '' && comment === '') {
            continue;
        }

        byQid.set(qid, {
            // A second entry for the same question completes the first rather
            // than replacing it wholesale: `{qid, cid}` then `{qid, comment}` is
            // one answer with both, which is what beCPG's own read shape looks
            // like — and what its HashMap would otherwise have reduced to the
            // comment alone.
            ...(byQid.get(qid) || {}),
            qid,
            ...(keepCid ? { cid: known } : {}),
            ...(listOptions === '' ? {} : { listOptions }),
            ...(comment === '' ? {} : { comment }),
        });
    }

    return Array.from(byQid.values());
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
