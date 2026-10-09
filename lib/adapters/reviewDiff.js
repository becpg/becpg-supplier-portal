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
import { nodeLabel } from '@/lib/format';

/**
 * Properties that change on every save or carry the repository's bookkeeping:
 * a reviewer reads what the supplier entered, never an audit field.
 */
const IGNORED = /^(sys:|rep:|cm:(created|modified|creator|modifier|name|owner|autoVersion|autoVersionOnUpdateProps|versionLabel|versionType|initialVersion|isIndexed|isContentIndexed|contains|lastThumbnailModification|taggable|categories)$|bcpg:(sort|depthLevel|parentLevel|entityScore|entityData|entityFormat|versionLabel|manualVersionLabel|formulatedDate|startEffectivity|endEffectivity|reportNodeRefs|entityTplRef|parentEntityRef|code|erpCode|productState|suppliers|clients|productHierarchy\d)$|bcpg:stateActivity|bcpg:branchFrom|bcpg:autoMerge)|Formulated|formula|Formula/;

/** `bcpg:legalName_fr`: a locale variant, compared through its base property. */
const LOCALE_SUFFIX = /_[a-z]{2}(_[A-Z]{2})?$/;

/** Most rows of one list described by name in each change bucket. */
const MAX_ROWS_PER_BUCKET = 50;

/**
 * A value as the reviewer reads it: an association by its label, a list joined,
 * nothing for an empty value.
 *
 * @param {*} value
 * @param {string} lang
 * @returns {string|null}
 */
export function displayValue(value, lang) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    if (Array.isArray(value)) {
        const parts = value.map((entry) => displayValue(entry, lang)).filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : null;
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
        if (IGNORED.test(name)) {
            continue;
        }
        const base = name.replace(LOCALE_SUFFIX, '');
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
 * @returns {Array<{name: string, before: string|null, after: string|null}>}
 */
export function diffAttributes(before, after, lang) {
    const left = comparable(before);
    const right = comparable(after);
    const names = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
    return names
        .map((name) => ({ name, before: displayValue(left[name], lang), after: displayValue(right[name], lang) }))
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
 * @returns {{key: string, label: string}}
 */
export function rowKey(row, type, lang) {
    // `bcpg:nutList` rows name their nutrient in `bcpg:nutListNut`.
    const prefix = type;
    const attributes = row?.attributes || {};
    const name = Object.keys(attributes).sort().find((key) => key.startsWith(prefix)
        && attributes[key] && typeof attributes[key] === 'object' && !Array.isArray(attributes[key]) && attributes[key].id);
    if (name) {
        return { key: `${name}=${attributes[name].id}`, label: nodeLabel(attributes[name], lang) || attributes[name].id };
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
 * @returns {{added: Object[], removed: Object[], changed: Object[]}}
 */
export function diffRows(before, after, type, lang) {
    const index = (rows) => new Map((rows || []).map((row) => {
        const { key, label } = rowKey(row, type, lang);
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
        const fields = diffAttributes(previous.attributes, row.attributes, lang);
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
 * @param {Object} params `{ session, entity, lang }`
 * @returns {Promise<{reference: Object|null, properties: Object[], lists: Object[]}>}
 *          `reference: null` when there is nothing to compare with (a first version)
 */
export async function getReviewDiff({ session, entity, lang }) {
    await requireMonitorAccess(session);
    const entityRef = toNodeRef(entity);
    const currentPayload = await getEntityJson({ nodeRef: entityRef }, { session, skipAllowList: true });
    const current = currentPayload?.entity || {};
    const reference = await readReference({ session, entityRef, current });
    if (!reference?.entity) {
        return { reference: null, properties: [], lists: [] };
    }

    const types = [...new Set([...Object.keys(current.datalists || {}), ...Object.keys(reference.entity.datalists || {})])];
    const [entityLabels, ...listLabels] = await Promise.all([
        classLabels(session, current.type || 'bcpg:product'),
        ...types.map((type) => classLabels(session, type)),
    ]);
    const label = (labels, name) => labels[name] || name;

    const properties = diffAttributes(reference.entity.attributes, current.attributes, lang)
        .map((entry) => ({ ...entry, label: label(entityLabels, entry.name) }));
    const lists = types.map((type, index) => {
        const labels = listLabels[index];
        const diff = diffRows(reference.entity.datalists?.[type], current.datalists?.[type], type, lang);
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

    const { entity: _entity, ...described } = reference;
    return { reference: described, properties, lists };
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
