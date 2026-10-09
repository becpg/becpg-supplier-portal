/**
 * A workflow task that is not a project task — a step of a non-conformity —
 * read and treated as Share's task-edit page does it.
 *
 * Repository calls, nothing else:
 *
 *  - `api/task-instances/{id}`: the task, its workflow, its owner, what the
 *    reader may do with it (claim, release, edit) and the transitions of its
 *    node (`definition.node.transitions`);
 *  - `POST api/formdefinitions` (`itemKind: task`): the fields of the task type
 *    with their labels, constraints and current values, and the package items;
 *  - `POST api/task/{id}/formprocessor`: saves the fields and, with
 *    `prop_transitions`, ends the task on that transition;
 *  - `PUT api/task-instances/{id}`: claims a pooled task (`cm_owner`) or hands
 *    it back to the pool.
 *
 * Which fields: the ones the task type declares in its own namespace
 * (`ncwf:ncState`, `ncwf:corrActionActor`…), the progress (`bpm:status`) and the
 * comment (`bpm:comment`) — what the workflow asks the assignee to decide, the
 * same set Share's form configuration shows for these types. Workflow
 * bookkeeping (`bpm:*`, `cm:*`) stays out. The decision itself — which branch
 * the process takes — remains the workflow's (rule R2): the portal only posts
 * the values and the transition.
 *
 * An internal account answers any step it may edit. A supplier account answers
 * only the steps listed in {@link SUPPLIER_STEPS} that are assigned to it — the
 * corrective action of a non-conformity — and writes one thing: its answer, the
 * step's comment. The state of the non-conformity stays the customer's call.
 *
 * Server only.
 */

import { isNodeRef } from '@/lib/becpg';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { logWarn } from '@/lib/http';
import { normalizeFormDefinition, applyValues, toFormPayload, assertWritableFields } from '@/lib/adapters/forms';
import { hasMonitorAccess, requireMonitorAccess } from '@/lib/adapters/monitor';
import { createBecpgClient } from '@/lib/adapters/session';
import { TASK_TYPES, mapWithConcurrency, toIsoDate } from '@/lib/adapters/tasks';
import { readAuthorityName } from '@/lib/adapters/workflows';

/** `activiti$1234`: an engine prefix, a dollar, the engine's task id. */
const WORKFLOW_TASK_ID = /^[a-z]+\$\d+$/i;

/** Alfresco's id of the transition every task without an outcome ends on. */
const DEFAULT_TRANSITION = 'Next';

const COMMENT_FIELD = 'bpm:comment';
const TEXTAREA_TEMPLATE = '/org/alfresco/components/form/controls/textarea.ftl';

/** Workflow fields an assignee answers, whatever the task type. */
const COMMON_FIELDS = new Set(['bpm:status', COMMENT_FIELD]);

/** The workflow steps a supplier account answers in the portal. */
export const SUPPLIER_STEPS = Object.freeze(['ncwf:corrActionTask']);

/** Properties of the non-conformity a supplier reads before answering. */
const NC_SUMMARY_FIELDS = ['cm:name', 'cm:description', 'qa:ncType', 'qa:ncPriority', 'qa:batchId', 'qa:product', 'cm:created'];

const ANALYSIS_STEP = 'ncwf:analysisTask';

const PACKAGE_FIELD = 'packageItems';
const CONCURRENCY = 4;

/**
 * @param {string} id a route segment, possibly still percent-encoded
 * @returns {boolean} the id names a workflow task, not a `pjt:taskList` node
 */
export function isWorkflowTaskId(id) {
    return WORKFLOW_TASK_ID.test(decodeURIComponent(String(id || '')));
}

function requireWorkflowTaskId(id) {
    const taskId = decodeURIComponent(String(id || ''));
    if (!WORKFLOW_TASK_ID.test(taskId)) {
        throw new BadRequestError('Not a workflow task id');
    }
    return taskId;
}

async function readTaskInstance(client, taskId) {
    const payload = await client.getJson(`api/task-instances/${encodeURIComponent(taskId)}`);
    if (!payload?.data) {
        throw new NotFoundError('Workflow task not found');
    }
    return payload.data;
}

async function readTaskForm(client, taskId) {
    const payload = await client.postJson('api/formdefinitions', { itemKind: 'task', itemId: taskId });
    return payload?.data || { definition: { fields: [] }, formData: {} };
}

/**
 * The fields the assignee answers: the task type's own namespace, plus the
 * progress and the comment, writable ones only.
 *
 * @param {string} taskType e.g. `ncwf:analysisTask`
 * @param {Object[]} rawFields `definition.fields` of `api/formdefinitions`
 * @returns {Object[]}
 */
export function answerFields(taskType, rawFields) {
    const prefix = `${String(taskType || '').split(':')[0]}:`;
    return (rawFields || []).filter((field) => field?.name
        && field.protectedField !== true
        && field.name !== PACKAGE_FIELD
        && (field.name.startsWith(prefix) || COMMON_FIELDS.has(field.name)))
        // The comment closes the form, as in Share, where every workflow form
        // gives it a text area.
        .sort((left, right) => Number(left.name === 'bpm:comment') - Number(right.name === 'bpm:comment'))
        .map((field) => (field.name === COMMENT_FIELD ? { ...field, control: { template: TEXTAREA_TEMPLATE, params: {} } } : field));
}

/**
 * What a supplier answers on a step: the comment, which becomes its action plan,
 * mandatory — a corrective action sent back empty answers nothing.
 *
 * @param {Object[]} rawFields `definition.fields` of `api/formdefinitions`
 * @returns {Object[]}
 */
export function supplierAnswerFields(rawFields) {
    return (rawFields || [])
        .filter((field) => field?.name === COMMENT_FIELD)
        .map((field) => ({ ...field, mandatory: true, control: { template: TEXTAREA_TEMPLATE, params: {} } }));
}

/**
 * Whether a supplier account may answer a step: one of {@link SUPPLIER_STEPS},
 * assigned to that very account.
 *
 * @param {Object} instance `api/task-instances/{id}` data
 * @param {string} username
 * @returns {boolean}
 */
export function isSupplierStep(instance, username) {
    return SUPPLIER_STEPS.includes(instance?.name) && Boolean(username) && instance?.owner?.userName === username;
}

/**
 * The form-processor values of the answer fields: associations as nodeRef lists.
 *
 * @param {Object[]} fields normalised fields
 * @param {Object} formData `formData` of `api/formdefinitions`
 * @returns {Object} formsName → value
 */
export function answerValues(fields, formData) {
    return Object.fromEntries(fields.map((field) => {
        const raw = formData?.[field.formsName];
        if (field.type === 'association') {
            return [field.formsName, String(raw || '').split(',').map((value) => value.trim()).filter(isNodeRef)];
        }
        return [field.formsName, raw ?? null];
    }));
}

/**
 * The transitions a task can end on. A node with no declared transition ends on
 * Alfresco's default one, which Share labels « Tâche terminée ».
 *
 * @param {Object} instance `api/task-instances/{id}` data
 * @returns {Array<{id: string, label: string|null, isDefault: boolean}>}
 */
export function taskTransitions(instance) {
    const declared = (instance?.definition?.node?.transitions || [])
        .filter((transition) => transition?.id && transition.isHidden !== true)
        .map((transition) => ({ id: transition.id, label: transition.title || null, isDefault: Boolean(transition.isDefault) }));
    return declared.length > 0 ? declared : [{ id: DEFAULT_TRANSITION, label: null, isDefault: true }];
}

/** Display names of the persons the association fields point at. */
async function withAuthorityLabels(client, definition) {
    const refs = [...new Set(definition.fields
        .filter((field) => field.type === 'association')
        .flatMap((field) => (Array.isArray(field.value) ? field.value : [])))];
    const names = await mapWithConcurrency(refs, CONCURRENCY, (nodeRef) => readAuthorityName(client.session, nodeRef));
    const byRef = Object.fromEntries(refs.map((nodeRef, index) => [nodeRef, names[index]]));
    return {
        ...definition,
        fields: definition.fields.map((field) => (field.type === 'association' && Array.isArray(field.value)
            ? { ...field, displayValue: field.value.map((nodeRef) => byRef[nodeRef] || nodeRef).join(', ') || null }
            : field)),
    };
}

/** The package items, named. */
async function readItems(client, formData) {
    const refs = String(formData?.[`assoc_${PACKAGE_FIELD}`] || '').split(',').map((value) => value.trim()).filter(isNodeRef);
    if (refs.length === 0) {
        return [];
    }
    return mapWithConcurrency(refs, CONCURRENCY, (nodeRef) => readItem(client, nodeRef));
}

/** One package item, named — a non-conformity is no product, so no entity index. */
async function readItem(client, nodeRef) {
    try {
        const payload = await client.getJson('api/metadata', { query: { nodeRef, shortQNames: 'true' } });
        const properties = payload?.properties || {};
        return { nodeRef, name: properties['cm:name'] || null, code: properties['bcpg:code'] || null, type: payload?.type || null };
    }
    catch (error) {
        logWarn('workflowTasks.itemUnreadable', { nodeRef, status: error?.status });
        return { nodeRef, name: null, code: null, type: null };
    }
}

/**
 * Reads a step and decides who answers it: an internal account, or the supplier
 * account the step is assigned to.
 *
 * @throws {ForbiddenError} a supplier account on a step that is not its own
 */
async function openStep(session, id) {
    const taskId = requireWorkflowTaskId(id);
    const internal = await hasMonitorAccess(session);
    const client = createBecpgClient(session);
    const [instance, form] = await Promise.all([readTaskInstance(client, taskId), readTaskForm(client, taskId)]);
    if (!internal && !isSupplierStep(instance, client.username)) {
        throw new ForbiddenError('This workflow step is not answered from the supplier portal');
    }
    const raw = form.definition?.fields;
    const fields = internal ? answerFields(instance.name, raw) : supplierAnswerFields(raw);
    return { client, taskId, instance, form, internal, fields };
}

/** The non-conformity a supplier answers, as it reads it. */
async function readNcSummary(client, nodeRef) {
    try {
        const payload = await client.getJson('becpg/remote/entity', { query: { nodeRef, lists: 'none', fields: NC_SUMMARY_FIELDS.join(',') } });
        const attributes = payload?.entity?.attributes || {};
        const label = (value) => (value && typeof value === 'object' ? value['cm:name'] || value['bcpg:charactName'] || null : value ?? null);
        const product = Array.isArray(attributes['qa:product']) ? attributes['qa:product'][0] : attributes['qa:product'];
        return {
            nodeRef,
            name: attributes['cm:name'] || payload?.entity?.['cm:name'] || null,
            description: attributes['cm:description'] || null,
            type: label(attributes['qa:ncType']),
            priority: attributes['qa:ncPriority'] ?? null,
            batch: attributes['qa:batchId'] || null,
            product: label(product),
            createdAt: toIsoDate(attributes['cm:created']),
        };
    }
    catch (error) {
        logWarn('workflowTasks.ncUnreadable', { nodeRef, status: error?.status });
        return { nodeRef, name: null, description: null, type: null, priority: null, batch: null, product: null, createdAt: null };
    }
}

/**
 * What the customer asked for: the comment of the analysis step that sent the
 * non-conformity to the supplier, with who wrote it and when.
 */
async function readRequest(client, workflowId) {
    if (!workflowId) {
        return null;
    }
    try {
        const payload = await client.getJson(`api/workflow-instances/${encodeURIComponent(workflowId)}`, { query: { includeTasks: 'true' } });
        const analysis = (payload?.data?.tasks || [])
            .filter((task) => task.name === ANALYSIS_STEP && task.state !== 'IN_PROGRESS')
            .sort((left, right) => String(right.properties?.bpm_completionDate || '').localeCompare(String(left.properties?.bpm_completionDate || '')))[0];
        if (!analysis?.properties?.bpm_comment) {
            return null;
        }
        return { comment: analysis.properties.bpm_comment, by: personName(analysis.owner), at: toIsoDate(analysis.properties.bpm_completionDate) };
    }
    catch (error) {
        logWarn('workflowTasks.requestUnreadable', { workflowId, status: error?.status });
        return null;
    }
}

function personName(person) {
    if (!person) {
        return null;
    }
    const name = [...new Set([person.firstName, person.lastName].filter(Boolean))].join(' ').trim();
    return name || person.userName || null;
}

/**
 * The task as the screen needs it.
 *
 * @typedef {Object} WorkflowTaskSheet
 * @property {string} id
 * @property {'workflow'} type what `/tasks/[id]` routes on
 * @property {string|null} taskType the workflow task type, e.g. `ncwf:analysisTask`
 * @property {string} title
 * @property {string|null} description the workflow's message
 * @property {boolean} open
 * @property {string|null} owner
 * @property {boolean} pooled
 * @property {{claim: boolean, release: boolean, edit: boolean}} can
 * @property {string|null} dueDate
 * @property {boolean} late open past its due date
 * @property {number|null} priority
 * @property {{id: string, title: string|null, initiator: string|null, startedAt: string|null}} workflow
 * @property {Array<{nodeRef: string, name: string|null, code: string|null, type: string|null}>} items
 * @property {Object} definition the answer form, normalised, values applied
 * @property {Array<{id: string, label: string|null, isDefault: boolean}>} transitions
 * @property {boolean} supplierView answered by a supplier account: `nc` and
 *           `request` are set, `definition` holds the action plan alone
 * @property {Object|null} nc the non-conformity, summarised (supplier view)
 * @property {{comment: string, by: string|null, at: string|null}|null} request what
 *           the customer asked for (supplier view)
 */

/**
 * `GET /api/v1/tasks/activiti$…` — one workflow task, its answer form and its transitions.
 *
 * @param {Object} session
 * @param {string} id the workflow task id
 * @returns {Promise<WorkflowTaskSheet>}
 */
export async function getWorkflowTask(session, id) {
    const { client, taskId, instance, form, internal, fields } = await openStep(session, id);
    const definition = normalizeFormDefinition({ fields }, { itemType: instance.name });
    const filled = applyValues(definition, answerValues(definition.fields, form.formData));
    const properties = instance.properties || {};
    const dueDate = toIsoDate(properties.bpm_dueDate);
    const items = await readItems(client, form.formData);
    const ncItem = items.find((item) => item.type === 'qa:nc') || null;
    const [nc, request] = internal
        ? [null, null]
        : await Promise.all([ncItem ? readNcSummary(client, ncItem.nodeRef) : null, readRequest(client, instance.workflowInstance?.id)]);
    return {
        id: taskId,
        type: TASK_TYPES.WORKFLOW,
        taskType: instance.name || null,
        title: instance.title || instance.name || taskId,
        description: properties.bpm_description || instance.description || null,
        open: instance.state === 'IN_PROGRESS',
        owner: personName(instance.owner),
        pooled: Boolean(instance.isPooled) && !instance.owner,
        can: internal
            ? { claim: Boolean(instance.isClaimable), release: Boolean(instance.isReleasable), edit: Boolean(instance.isEditable) }
            : { claim: false, release: false, edit: instance.state === 'IN_PROGRESS' },
        dueDate,
        late: Boolean(instance.state === 'IN_PROGRESS' && dueDate && new Date(dueDate).getTime() < Date.now()),
        priority: properties.bpm_priority ?? null,
        workflow: {
            id: instance.workflowInstance?.id || null,
            title: instance.workflowInstance?.title || null,
            initiator: personName(instance.workflowInstance?.initiator),
            startedAt: toIsoDate(instance.workflowInstance?.startDate),
        },
        items,
        definition: await withAuthorityLabels(client, filled),
        transitions: internal ? taskTransitions(instance) : taskTransitions(instance).filter((transition) => transition.isDefault).slice(0, 1),
        supplierView: !internal,
        nc,
        request,
    };
}

/**
 * The association changes against the current values: the form processor takes
 * what to add and what to remove, never the full list.
 */
function associationChanges(values, fields, current) {
    return Object.fromEntries(Object.entries(values).map(([name, value]) => {
        const field = fields.find((entry) => entry.formsName === name || entry.name === name);
        if (field?.type !== 'association') {
            return [name, value];
        }
        const next = (Array.isArray(value) ? value : [value]).filter(isNodeRef);
        const before = current[field.formsName] || [];
        return [name, { added: next.filter((ref) => !before.includes(ref)), removed: before.filter((ref) => !next.includes(ref)) }];
    }));
}

/** The mandatory answer fields still empty once `values` is applied. */
function missingMandatory(fields, current, values) {
    return fields.filter((field) => {
        if (!field.mandatory) {
            return false;
        }
        const value = field.formsName in values ? values[field.formsName] : current[field.formsName];
        return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
    }).map((field) => field.name);
}

/**
 * `POST /api/v1/tasks/activiti$…/workflow` — saves the answers and, with a
 * transition, ends the task on it.
 *
 * @param {Object} session
 * @param {string} id the workflow task id
 * @param {Object} body `{ values: { formsName: value }, transition?: string }`
 * @returns {Promise<{id: string, completed: boolean}>}
 * @throws {BadRequestError} a field outside the answer form, an unknown
 *   transition, or a mandatory field left empty on a transition
 */
export async function submitWorkflowTask(session, id, { values = {}, transition = null } = {}) {
    const { client, taskId, instance, form, internal, fields: answer } = await openStep(session, id);
    const { fields } = normalizeFormDefinition({ fields: answer });
    assertWritableFields(values, fields);
    const current = answerValues(fields, form.formData);

    const payload = toFormPayload(associationChanges(values, fields, current), fields);
    if (transition) {
        const allowed = internal ? taskTransitions(instance) : taskTransitions(instance).filter((entry) => entry.isDefault).slice(0, 1);
        if (!allowed.some((entry) => entry.id === transition)) {
            throw new BadRequestError('Unknown transition for this task', { details: { transition } });
        }
        const missing = missingMandatory(fields, current, values);
        if (missing.length > 0) {
            throw new BadRequestError('Mandatory fields are empty', { details: { fields: missing } });
        }
        payload.prop_transitions = transition;
    }
    await client.postJson(`api/task/${encodeURIComponent(taskId)}/formprocessor`, payload);
    return { id: taskId, completed: Boolean(transition) };
}

/**
 * `POST /api/v1/tasks/activiti$…/claim` — takes a pooled task, or hands it back.
 *
 * @param {Object} session
 * @param {string} id
 * @param {{release?: boolean}} [options]
 * @returns {Promise<{id: string, owner: string|null}>}
 */
export async function claimWorkflowTask(session, id, { release = false } = {}) {
    const { client } = await requireMonitorAccess(session);
    const taskId = requireWorkflowTaskId(id);
    const owner = release ? null : client.username;
    await client.putJson(`api/task-instances/${encodeURIComponent(taskId)}`, { cm_owner: owner });
    if (!owner) {
        logWarn('workflowTasks.released', { taskId });
    }
    return { id: taskId, owner };
}
