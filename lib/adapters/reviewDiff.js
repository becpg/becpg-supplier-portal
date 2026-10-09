/**
 * What changed on a sheet under review, against what the customer last validated.
 *
 * The reference depends on how the sheet came to be reviewed:
 *
 *  - an update branch (`bcpg:branchFromEntity`, the « … - UPDATE - 2025 » copies a
 *    supplier works on) is compared with the validated product it was branched
 *    from — that product is what the customer accepted;
 *  - any other entity is compared with its latest frozen version.
 *
 * Both sides are read through `becpg/remote/entity`, which serves a live entity
 * and a frozen version in the same JSON shape (`JsonEntityVisitor`), datalists
 * included, so one comparison covers both. Labels come from the repository's
 * dictionary, in the reader's language.
 *
 * Server only.
 */

import { getEntityJson, getJson, isNodeRef, nodeRefToPath, postJson } from '@/lib/becpg';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import { getEntityListsState } from '@/lib/adapters/datalists';
import { requireMonitorAccess } from '@/lib/adapters/monitor';
import { listEntityVersions } from '@/lib/adapters/versions';
import { toNodeRef } from '@/lib/adapters/tasks';
import { classLabels } from '@/lib/adapters/dictionary';
import { getSurvey } from '@/lib/adapters/survey';
import { nodeLabel } from '@/lib/format';
import { normalizeFormDefinition } from '@/lib/adapters/forms';
import { getWizardState } from '@/lib/adapters/wizard';
import { logWarn } from '@/lib/http';

/**
 * Properties that change on every save or carry the repository's bookkeeping:
 * a reviewer reads what the supplier entered, never an audit field.
 */
const IGNORED = /^(sys:|rep:|cm:(created|modified|creator|modifier|name|owner|autoVersion|autoVersionOnUpdateProps|versionLabel|versionType|initialVersion|isIndexed|isContentIndexed|contains|lastThumbnailModification|taggable|categories)$|bcpg:(sort|depthLevel|parentLevel|entityScore|entityData|entityFormat|versionLabel|manualVersionLabel|formulatedDate|startEffectivity|endEffectivity|reportNodeRefs|entityTplRef|parentEntityRef|code|erpCode|productState|suppliers|clients|productHierarchy\d)$|bcpg:stateActivity|bcpg:branchFrom|bcpg:autoMerge|bcpg:externalAccessGroup|cm:title$)|Formulated|formula|Formula/;

/** `bcpg:legalName_fr`: a locale variant, compared through its base property. */
const LOCALE_SUFFIX = /_[a-z]{2}(_[A-Z]{2})?$/;

/** Most rows of one list described by name in each change bucket. */
const MAX_ROWS_PER_BUCKET = 50;

/**
 * The association that says which row is which, for the lists whose rows carry
 * no characteristic: a questionnaire answer is the answer to its question.
 */
const SURVEY_LIST = 'survey:surveyList';

const ROW_IDENTITY = Object.freeze({ [SURVEY_LIST]: 'survey:slQuestion' });

const NODE_ID = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** The uuid of a node value — `{ id }`, a nodeRef or a bare uuid — or null. */
function nodeIdOf(value) {
    const raw = value && typeof value === 'object' ? value.id : value;
    const match = NODE_ID.exec(String(raw || ''));
    return match ? match[1].toLowerCase() : null;
}

/**
 * A value as the reviewer reads it: an association by its label, a list joined,
 * nothing for an empty value. A node the payload does not name is looked up in
 * `names` — the questions and choices of a questionnaire — and is never shown
 * as an identifier when a name is known.
 *
 * @param {*} value
 * @param {string} lang
 * @param {Map<string, string>|null} [names] uuid → label
 * @returns {string|null}
 */
export function displayValue(value, lang, names = null) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    if (Array.isArray(value)) {
        const parts = value.map((entry) => displayValue(entry, lang, names)).filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : null;
    }
    const known = names?.get(nodeIdOf(value));
    if (known) {
        return known;
    }
    if (typeof value === 'object') {
        return nodeLabel(value, lang) || (value.id ? String(value.id) : null);
    }
    return String(value).replace(/<[^>]*>/g, '').trim() || null;
}

/** The properties of one side worth comparing, locale variants folded into their base. */
function comparable(attributes) {
    const out = {};
    for (const [name, value] of Object.entries(attributes || {})) {
        const base = name.replace(LOCALE_SUFFIX, '');
        if (IGNORED.test(base)) {
            continue;
        }
        if (base !== name && out[base] !== undefined) {
            continue;
        }
        out[base] = value;
    }
    return out;
}

/**
 * The properties whose displayed value differs between the reference and now.
 *
 * @param {Object} before attributes of the reference
 * @param {Object} after attributes of the sheet under review
 * @param {string} lang
 * @param {Map<string, string>|null} [labels] node uuid → label, see {@link displayValue}
 * @returns {Array<{name: string, before: string|null, after: string|null}>}
 */
export function diffAttributes(before, after, lang, labels = null) {
    const left = comparable(before);
    const right = comparable(after);
    const names = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
    return names
        .map((name) => ({ name, before: displayValue(left[name], lang, labels), after: displayValue(right[name], lang, labels) }))
        .filter((entry) => entry.before !== entry.after);
}

/**
 * What identifies a row across two copies of a list: the characteristic it
 * describes (`bcpg:nutListNut` → the nutrient), so a row recreated by a
 * formulation still matches; the row's own id otherwise.
 *
 * @param {Object} row `{ id, attributes }`
 * @param {string} type the list type, e.g. `bcpg:nutList`
 * @param {string} lang
 * @param {Map<string, string>|null} [labels] node uuid → label
 * @returns {{key: string, label: string}}
 */
export function rowKey(row, type, lang, labels = null) {
    // A characteristic is an association to a node that carries a characteristic
    // name: `bcpg:nutListNut` for a nutrient, `bcpg:pclPhysicoChem` for a
    // physico-chemical one. The first such association names the row; the list's
    // own associations come next.
    const attributes = row?.attributes || {};
    const isNode = (value) => value && typeof value === 'object' && !Array.isArray(value) && value.id;
    const names = Object.keys(attributes).sort().filter((key) => !key.startsWith('cm:') && isNode(attributes[key]));
    const baseType = String(type || '').split('|')[0];
    const identity = ROW_IDENTITY[baseType];
    const name = (identity && isNode(attributes[identity]) ? identity : null)
        || names.find((key) => attributes[key]['bcpg:charactName'] !== undefined)
        || names.find((key) => key.startsWith(baseType));
    if (name) {
        const target = attributes[name];
        const id = nodeIdOf(target) || String(target.id);
        return { key: `${name}=${id}`, label: labels?.get(id) || nodeLabel(target, lang) || String(target.id) };
    }
    return { key: `id=${row?.id}`, label: displayValue(attributes['cm:name'], lang) || String(row?.id || '') };
}

/**
 * The rows added, removed and changed between two copies of one list.
 *
 * @param {Object[]} before rows of the reference
 * @param {Object[]} after rows of the sheet under review
 * @param {string} type the list type
 * @param {string} lang
 * @param {Map<string, string>|null} [labels] node uuid → label
 * @returns {{added: Object[], removed: Object[], changed: Object[]}}
 */
export function diffRows(before, after, type, lang, labels = null) {
    const index = (rows) => new Map((rows || []).map((row) => {
        const { key, label } = rowKey(row, type, lang, labels);
        return [key, { label, attributes: row.attributes || {} }];
    }));
    const left = index(before);
    const right = index(after);
    const added = [];
    const changed = [];
    for (const [key, row] of right) {
        const previous = left.get(key);
        if (!previous) {
            added.push({ key, label: row.label });
            continue;
        }
        const fields = diffAttributes(previous.attributes, row.attributes, lang, labels);
        if (fields.length > 0) {
            changed.push({ key, label: row.label, fields });
        }
    }
    const removed = [...left].filter(([key]) => !right.has(key)).map(([key, row]) => ({ key, label: row.label }));
    return {
        added: added.slice(0, MAX_ROWS_PER_BUCKET),
        removed: removed.slice(0, MAX_ROWS_PER_BUCKET),
        changed: changed.slice(0, MAX_ROWS_PER_BUCKET),
    };
}

/** `bcpg:nutList`, `nutList@1` and `nutList` name one list. */
function listKey(type) {
    return String(type || '').split('|')[0].split('@')[0].split(':').pop();
}

/** The names a step lets the supplier write: its grid columns and its row form. */
function writableNamesOf(step) {
    const fields = [step.definition, step.itemDefinition]
        .filter((definition) => Array.isArray(definition?.fields))
        .flatMap((definition) => normalizeFormDefinition(definition).fields)
        .filter((field) => !field.protectedField);
    const writable = fields.filter((field) => !field.readOnly);
    // A definition resolved for viewing marks every field read-only; the step's
    // fields are then the best answer there is.
    return (writable.length > 0 ? writable : fields).map((field) => field.name);
}

/**
 * What the supplier's wizard lets them write: the fields of its form steps, and
 * per list the columns of its list steps. A computed value — a formulated
 * nutrient, a nutrient profile, a score — is in no step, so a reviewer never
 * reads it as something the supplier changed.
 *
 * @param {Object} params `{ session, entityRef, wizardId }`
 * @returns {Promise<{form: Set<string>, lists: Map<string, Set<string>|null>}|null>} a list
 *          mapped to `null` is written whole
 *          null when the wizard cannot be read: the diff is then not narrowed
 */
export async function readWritableFields({ session, entityRef, wizardId }) {
    let state;
    try {
        state = await getWizardState(entityRef, { session, ...(wizardId ? { wizardId } : {}) });
    }
    catch (error) {
        logWarn('reviewDiff.wizardUnavailable', { entity: entityRef, wizardId, status: error?.status });
        return null;
    }
    const form = new Set();
    const lists = new Map();
    for (const step of state?.steps || []) {
        const names = writableNamesOf(step);
        if (step.type === 'form') {
            names.forEach((name) => form.add(name));
        }
        else if (step.listName) {
            const key = listKey(step.listName);
            // A step that describes no columns — a questionnaire, answered on
            // its own screen — restricts nothing: `null` keeps every field.
            const known = lists.get(key);
            lists.set(key, names.length === 0 || known === null ? null : new Set([...(known || []), ...names]));
        }
    }
    return { form, lists };
}

/**
 * Keeps the changes the supplier could have made through the wizard.
 *
 * @param {{properties: Object[], lists: Object[]}} diff
 * @param {Object|null} writable {@link readWritableFields}
 * @returns {{properties: Object[], lists: Object[]}}
 */
export function narrowToWritable(diff, writable) {
    if (!writable) {
        return diff;
    }
    const properties = diff.properties.filter((entry) => writable.form.has(entry.name));
    const lists = diff.lists
        .filter((list) => writable.lists.has(listKey(list.type)))
        .map((list) => {
            const columns = writable.lists.get(listKey(list.type));
            const changed = list.changed
                .map((row) => ({ ...row, fields: columns ? row.fields.filter((field) => columns.has(field.name)) : row.fields }))
                .filter((row) => row.fields.length > 0);
            return { ...list, changed };
        })
        .filter((list) => list.added.length + list.removed.length + list.changed.length > 0);
    return { properties, lists };
}

/**
 * The questions and choices of a questionnaire list by uuid → label: an answer
 * row names its question and its choices by node only.
 *
 * @returns {Promise<Map<string, string>>} empty when the questionnaire cannot be read
 */
async function readSurveyLabels({ session, entityRef, type }) {
    const labels = new Map();
    const listId = String(type).includes('|') ? String(type).split('|')[1] : 'surveyList';
    try {
        const survey = await getSurvey(entityRef, listId, { session });
        for (const question of survey?.questions || []) {
            const id = nodeIdOf(question.id);
            const text = displayValue(question.label, 'fr');
            if (id && text) {
                labels.set(id, text);
            }
            for (const choice of question.choices || []) {
                for (const entry of choice.list || []) {
                    const [value, ...rest] = String(entry).split('|');
                    const choiceId = nodeIdOf(value);
                    if (choiceId && rest.length > 0) {
                        labels.set(choiceId, rest.join('|'));
                    }
                }
            }
        }
    }
    catch (error) {
        logWarn('reviewDiff.surveyUnreadable', { entity: entityRef, listId, status: error?.status });
    }
    return labels;
}

/** The reference the sheet is compared with, and its JSON. */
async function readReference({ session, entityRef, current }) {
    const branch = current.attributes?.['bcpg:branchFromEntity'];
    const origin = Array.isArray(branch) ? branch[0] : branch;
    if (origin?.id) {
        const nodeRef = String(origin.id).includes('://') ? origin.id : `workspace://SpacesStore/${origin.id}`;
        const payload = await getEntityJson({ nodeRef }, { session, skipAllowList: true });
        return { kind: 'branch', name: payload?.entity?.['cm:name'] || null, label: payload?.entity?.version || null, entity: payload?.entity };
    }
    const { versions } = await listEntityVersions({ session, entity: entityRef });
    const latest = versions.find((version) => String(version.nodeRef).includes('version2Store'));
    if (!latest) {
        return null;
    }
    const payload = await getEntityJson({ nodeRef: latest.nodeRef }, { session, skipAllowList: true });
    return { kind: 'version', name: null, label: latest.label, createdAt: latest.createdAt, author: latest.author, entity: payload?.entity };
}

/**
 * `GET /api/v1/entities/{id}/review-diff` — what changed since the reference.
 *
 * Only what the supplier's wizard lets them write is compared ({@link narrowToWritable}).
 *
 * @param {Object} params `{ session, entity, lang, wizardId? }` — `wizardId` the
 *        wizard of the supplier's task, the one whose fields count
 * @returns {Promise<{reference: Object|null, properties: Object[], lists: Object[]}>}
 *          `reference: null` when there is nothing to compare with (a first version)
 */
export async function getReviewDiff({ session, entity, lang, wizardId = null }) {
    await requireMonitorAccess(session);
    const entityRef = toNodeRef(entity);
    const currentPayload = await getEntityJson({ nodeRef: entityRef }, { session, skipAllowList: true });
    const current = currentPayload?.entity || {};
    const [reference, writable] = await Promise.all([
        readReference({ session, entityRef, current }),
        readWritableFields({ session, entityRef, wizardId }),
    ]);
    if (!reference?.entity) {
        return { reference: null, properties: [], lists: [] };
    }

    const types = [...new Set([...Object.keys(current.datalists || {}), ...Object.keys(reference.entity.datalists || {})])];
    const [entityLabels, listLabels, nodeLabels] = await Promise.all([
        classLabels(session, current.type || 'bcpg:product'),
        Promise.all(types.map((type) => classLabels(session, type))),
        Promise.all(types.map((type) => (String(type).startsWith(SURVEY_LIST) ? readSurveyLabels({ session, entityRef, type }) : null))),
    ]);
    const label = (labels, name) => labels[name] || name;

    const properties = diffAttributes(reference.entity.attributes, current.attributes, lang)
        .map((entry) => ({ ...entry, label: label(entityLabels, entry.name) }));
    const allLists = types.map((type, index) => {
        const labels = listLabels[index];
        const diff = diffRows(reference.entity.datalists?.[type], current.datalists?.[type], type, lang, nodeLabels[index]);
        return {
            type,
            label: labels.title || type,
            added: diff.added,
            removed: diff.removed,
            changed: diff.changed.map((row) => ({
                ...row,
                fields: row.fields.map((field) => ({ ...field, label: label(labels, field.name) })),
            })),
        };
    }).filter((list) => list.added.length + list.removed.length + list.changed.length > 0);

    const narrowed = narrowToWritable({ properties, lists: allLists }, writable);
    const { entity: _entity, ...described } = reference;
    return { reference: described, ...narrowed };
}

/** The two states beCPG gives a datalist: locked (accepted) or open to the supplier. */
export const LIST_STATES = Object.freeze({ accepted: 'Valid', open: 'ToValidate' });

/**
 * Locks a reviewed list (`Valid`) or reopens it (`ToValidate`) — what Share's
 * list state toggle does. A locked list can no longer be written by the
 * supplier, so a sheet sent back only reopens what was not accepted.
 *
 * The list must be one of the entity's own: the browser names it, beCPG's list
 * of the entity's datalists decides.
 *
 * @param {Object} params `{ session, entity, list, state }`
 * @returns {Promise<{list: string, state: string}>}
 * @throws {BadRequestError|NotFoundError}
 */
export async function setListState({ session, entity, list, state }) {
    await requireMonitorAccess(session);
    const entityRef = toNodeRef(entity);
    if (!isNodeRef(String(list || '')) || !Object.values(LIST_STATES).includes(state)) {
        throw new BadRequestError('A list nodeRef and a state (Valid or ToValidate) are required');
    }
    const { datalists } = await getEntityListsState(entityRef, { session });
    if (!datalists.some((entry) => entry.nodeRef === list)) {
        throw new NotFoundError('This list does not belong to the entity');
    }
    await postJson(`becpg/entitylist/node/${nodeRefToPath(list)}?state=${state}`, undefined, { session, skipAllowList: true });
    return { list, state };
}
