/**
 * The workflows running on an entity and their tasks — what Share's workflow
 * view shows on a document: who has to do what, by when, and what was done.
 *
 * Three repository calls, all read-only:
 *
 *  - `api/node/{store}/{id}/workflow-instances`: the active workflows whose
 *    package holds the node. A non-conformity is in the package of its
 *    `nonConformityProcess`; a product or a supplier in the package of the
 *    `projectAdhoc` workflows of its projects;
 *  - `api/workflow-instances/{id}?includeTasks=true`: the tasks of one workflow,
 *    open and done;
 *  - `api/metadata`: the display name of a pooled actor (a group or a person).
 *
 * A project task opens on its project task page (`/tasks/{uuid}`, the
 * `pjt:taskList` node the workflow task points at through `pjt:workflowTask`);
 * any other step — those of a non-conformity — on its workflow task page
 * (`/tasks/activiti$…`).
 *
 * Monitoring space only. Server only.
 */

import { getJson, isNodeRef, nodeRefToPath } from '@/lib/becpg';
import { logWarn } from '@/lib/http';
import { requireMonitorAccess } from '@/lib/adapters/monitor';
import { mapWithConcurrency, nodeRefUuid, toIsoDate, toNodeRef } from '@/lib/adapters/tasks';

/** Upstream calls in flight at once, per request. */
const CONCURRENCY = 4;

/** Most workflows of one entity described; an entity rarely has more than a few. */
const MAX_WORKFLOWS = 20;

const TASK_IN_PROGRESS = 'IN_PROGRESS';

/** The person as a reader names them: accounts created from an e-mail repeat it as both names. */
function personName(person) {
    if (!person) {
        return null;
    }
    const name = [...new Set([person.firstName, person.lastName].filter(Boolean))].join(' ').trim();
    return name || person.userName || null;
}

/**
 * The display name of an authority nodeRef: a group or a person.
 *
 * @param {Object} session
 * @param {string} nodeRef
 * @returns {Promise<string|null>} null when it cannot be read
 */
export async function readAuthorityName(session, nodeRef) {
    try {
        const payload = await getJson('api/metadata', { session, query: { nodeRef, shortQNames: 'true' }, skipAllowList: true });
        const properties = payload?.properties || {};
        return properties['cm:authorityDisplayName']
            || personName({ firstName: properties['cm:firstName'], lastName: properties['cm:lastName'], userName: properties['cm:userName'] })
            || properties['cm:authorityName']
            || null;
    }
    catch (error) {
        logWarn('workflows.actorUnreadable', { nodeRef, status: error?.status });
        return null;
    }
}

/** nodeRef → display name, for every pooled actor of the tasks, each read once. */
async function readActorNames(session, rawTasks) {
    const refs = [...new Set(rawTasks.flatMap((task) => task.properties?.bpm_pooledActors || []).filter(isNodeRef))];
    const names = await mapWithConcurrency(refs, CONCURRENCY, (nodeRef) => readAuthorityName(session, nodeRef));
    return Object.fromEntries(refs.map((nodeRef, index) => [nodeRef, names[index]]));
}

/**
 * Where an open task is treated: a project task on its project task page, any
 * other step on its own workflow task page. A done task opens nowhere.
 *
 * @returns {{href: string|null}}
 */
function taskLink(raw) {
    if (raw.state !== TASK_IN_PROGRESS) {
        return { href: null };
    }
    const projectTask = raw.properties?.pjt_workflowTask;
    return { href: isNodeRef(projectTask) ? `/tasks/${nodeRefUuid(projectTask)}` : `/tasks/${encodeURIComponent(raw.id)}` };
}

/**
 * One task of a workflow.
 *
 * @typedef {Object} WorkflowTask
 * @property {string} id the Activiti task id
 * @property {string} title the task as its project names it, else its type title
 * @property {boolean} open
 * @property {string|null} assignee the owner, else the pooled actors joined
 * @property {boolean} pooled nobody has claimed it yet
 * @property {string|null} dueDate ISO
 * @property {boolean} late
 * @property {string|null} completedAt ISO
 * @property {string|null} outcome
 * @property {string|null} comment
 * @property {string|null} href where the open task is treated in the portal
 */

/**
 * @param {Object} raw a task of `api/workflow-instances/{id}?includeTasks=true`
 * @param {Object.<string, string|null>} actorNames pooled actor nodeRef → display name
 * @returns {WorkflowTask}
 */
export function toWorkflowTask(raw, actorNames) {
    const properties = raw.properties || {};
    const open = raw.state === TASK_IN_PROGRESS;
    const dueDate = toIsoDate(properties.bpm_dueDate);
    const pooledNames = (properties.bpm_pooledActors || []).map((nodeRef) => actorNames[nodeRef]).filter(Boolean);
    const isProjectTask = isNodeRef(properties.pjt_workflowTask);
    return {
        id: raw.id,
        title: (isProjectTask && properties.bpm_description) || raw.title || raw.name || raw.id,
        open,
        assignee: personName(raw.owner) || (pooledNames.length > 0 ? pooledNames.join(', ') : null),
        pooled: Boolean(raw.isPooled) && !raw.owner,
        dueDate,
        late: Boolean(open && dueDate && new Date(dueDate).getTime() < Date.now()),
        completedAt: open ? null : toIsoDate(properties.bpm_completionDate),
        outcome: open ? null : (raw.outcome || null),
        comment: properties.bpm_comment || null,
        ...taskLink(raw),
    };
}

/** One workflow with its tasks, open first then the most recently done. */
async function readWorkflow(session, instance) {
    const payload = await getJson(`api/workflow-instances/${encodeURIComponent(instance.id)}`, {
        session,
        query: { includeTasks: 'true' },
        skipAllowList: true,
    });
    const data = payload?.data || {};
    return { id: instance.id, title: data.title || instance.title || null, message: data.message || null, startedAt: toIsoDate(data.startDate), initiator: personName(data.initiator), rawTasks: data.tasks || [] };
}

function byOpenThenRecent(left, right) {
    if (left.open !== right.open) {
        return left.open ? -1 : 1;
    }
    return String(right.completedAt || '').localeCompare(String(left.completedAt || ''));
}

/**
 * `GET /api/v1/entities/{id}/workflows` — the active workflows of an entity.
 *
 * @param {Object} params `{ session, entity }` — `entity` a nodeRef or uuid
 * @returns {Promise<{workflows: Array<{id: string, title: string|null, message: string|null,
 *          startedAt: string|null, initiator: string|null, tasks: WorkflowTask[]}>, openCount: number}>}
 */
export async function listEntityWorkflows({ session, entity }) {
    await requireMonitorAccess(session);
    const nodeRef = toNodeRef(entity);
    const payload = await getJson(`api/node/${nodeRefToPath(nodeRef)}/workflow-instances`, { session, skipAllowList: true });
    const instances = (payload?.data || []).slice(0, MAX_WORKFLOWS);
    const read = await mapWithConcurrency(instances, CONCURRENCY, (instance) => readWorkflow(session, instance));
    const actorNames = await readActorNames(session, read.flatMap((workflow) => workflow.rawTasks));
    const workflows = read.map(({ rawTasks, ...workflow }) => ({
        ...workflow,
        tasks: rawTasks.map((raw) => toWorkflowTask(raw, actorNames)).sort(byOpenThenRecent),
    }));
    return { workflows, openCount: workflows.reduce((sum, workflow) => sum + workflow.tasks.filter((task) => task.open).length, 0) };
}
