/**
 * Domain adapter — **tasks** (spec §4.3, §5.4 `/tasks`).
 *
 * Turns the two beCPG sources of "my tasks" into one stable, documented shape:
 *
 *   1. **Alfresco workflow tasks** — `api/task-instances?authority=<me>` — the
 *      exact source the Share dashlet `my-tasks` uses today. It is the only one
 *      that knows about *pooled* tasks and about the workflow assignment, and it
 *      is what `SupplierSecurityPlugin` reads to grant write access (spec §6.2).
 *      Each beCPG workflow task carries two associations we exploit:
 *        - `pjt:workflowTask`   → the `pjt:taskList` item (our stable task id);
 *        - `bcpg:workflowEntity` → the project node.
 *   2. **`pjt:taskList` items** — a db-afts query on `pjt:tlResourcesAssocIndex`
 *      (the *indexed* mirror of the `pjt:tlResources` association; the raw
 *      association is not queryable, which is exactly why beCPG maintains that
 *      property — see `TaskListResourcesAssocIndexPatch`). This second source
 *      catches project tasks that are assigned to the user but have no live
 *      workflow task instance (planned tasks, tasks whose workflow was closed).
 *
 * Both sources are merged and de-duplicated on the `pjt:taskList` nodeRef, which
 * is the **id** of a portal task: it is the node `becpg/project/task` and
 * `becpg/project/complete/task` accept, so `/tasks/{id}` and
 * `/tasks/{id}/complete` are direct.
 *
 * ### Routing (spec §7.2, invariant I1)
 *
 * The deliverable URL is **not rewritten**. `/share/page/wizard?id=supplier-…`
 * stays byte-for-byte what beCPG stored, because that prefix is what
 * `SupplierSecurityPlugin.SUPPLIER_WIZARD_PREFIX` matches to grant write access
 * on the entity. The portal *recognises* the URL and routes internally; it never
 * replaces it. `wizardId` and `entityNodeRef` are **parsed out** of it and
 * exposed as separate fields so the UI never has to parse a URL again.
 *
 * Server only — every function takes an already-authenticated beCPG client
 * (see `createBecpgClient()` in `lib/adapters/session.js`).
 */

import { isNodeRef } from '@/lib/becpg';
import { logWarn } from '@/lib/http';
import { BadRequestError } from '@/lib/errors';
import { wizardIdForType } from '@/config/wizards.default';

/* -------------------------------------------------------------------------- */
/* Shared low-level helpers (this module is the bottom of the adapter stack)   */
/* -------------------------------------------------------------------------- */

/** Default Alfresco store; every node the portal handles lives there. */
export const DEFAULT_STORE = 'workspace://SpacesStore';

/**
 * Rebuilds a full nodeRef from the bare uuid `becpg/remote/*` returns as `id`.
 *
 * @param {string} id uuid, or an already-formed nodeRef (returned untouched)
 * @param {string} [store=DEFAULT_STORE]
 * @returns {string|null}
 */
export function nodeRefFromId(id, store = DEFAULT_STORE) {
    const value = String(id || '').trim();
    if (!value) {
        return null;
    }
    return isNodeRef(value) ? value : `${store}/${value}`;
}

/**
 * The uuid part of a nodeRef — what the portal puts in its own URLs.
 *
 * @param {string} nodeRef
 * @returns {string|null}
 */
export function nodeRefUuid(nodeRef) {
    const value = String(nodeRef || '').trim();
    if (!value) {
        return null;
    }
    const slash = value.lastIndexOf('/');
    return slash === -1 ? value : value.slice(slash + 1);
}

/**
 * Accepts what a route parameter can hold — a uuid, a nodeRef, or a
 * `workspace/SpacesStore/uuid` path — and returns a canonical nodeRef.
 *
 * @param {string} value route parameter
 * @returns {string} a nodeRef
 * @throws {BadRequestError} when the value cannot be a node identifier
 */
export function toNodeRef(value) {
    const raw = decodeURIComponent(String(value || '').trim());
    if (!raw) {
        throw new BadRequestError('Missing node identifier');
    }
    if (isNodeRef(raw)) {
        return raw;
    }
    const asPath = raw.replace(/^\/+/, '');
    if (/^[A-Za-z][A-Za-z0-9+.-]*\/[^/]+\/.+$/.test(asPath)) {
        const [storeType, storeId, ...rest] = asPath.split('/');
        return `${storeType}://${storeId}/${rest.join('/')}`;
    }
    if (/^[A-Za-z0-9-]{8,}$/.test(raw)) {
        return `${DEFAULT_STORE}/${raw}`;
    }
    throw new BadRequestError(`Invalid node identifier: ${raw.slice(0, 80)}`);
}

/**
 * Escapes a literal so it can be embedded in an AFTS phrase (`prop:"value"`).
 * Only `"` and `\` can break out of a phrase.
 *
 * @param {string} value
 * @returns {string}
 */
export function escapeFtsValue(value) {
    return String(value === undefined || value === null ? '' : value).replace(/([\\"])/g, '\\$1');
}

/**
 * ISO 8601 string, or null. Accepts Date, ISO string, epoch ms.
 *
 * @param {*} value
 * @returns {string|null}
 */
export function toIsoDate(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Runs an async mapper over a list with a bounded number of in-flight calls.
 * Keeps the enrichment of a task page from opening 50 sockets on Alfresco.
 *
 * @template T,R
 * @param {T[]} items
 * @param {number} limit max concurrent calls
 * @param {(item: T, index: number) => Promise<R>} fn
 * @returns {Promise<R[]>} results, in input order
 */
export async function mapWithConcurrency(items, limit, fn) {
    const list = Array.isArray(items) ? items : [];
    const results = new Array(list.length);
    let cursor = 0;

    const workers = new Array(Math.max(1, Math.min(limit, list.length || 1)))
        .fill(null)
        .map(async () => {
            for (;;) {
                const index = cursor;
                cursor += 1;
                if (index >= list.length) {
                    return;
                }
                results[index] = await fn(list[index], index);
            }
        });

    await Promise.all(workers);
    return results;
}

/**
 * Slices an already-materialised list and returns the portal pagination block.
 *
 * The list is in memory, so `totalItems` here **is** a fact: `totalExact` is
 * `true` and `totalAtLeast` equals it. Both fields are emitted anyway so every
 * paginated payload of the portal carries the same three-field total contract —
 * see {@link readListTotal} for the case where the total cannot be known.
 *
 * @param {Array} items full, already-sorted list
 * @param {number} page 1-based page number
 * @param {number} pageSize
 * @returns {{items: Array, pagination: Pagination}}
 */
export function paginate(items, page, pageSize) {
    const total = items.length;
    const size = Math.max(1, pageSize);
    const current = Math.max(1, page);
    const start = (current - 1) * size;
    const slice = items.slice(start, start + size);
    return {
        items: slice,
        pagination: {
            page: current,
            pageSize: size,
            count: slice.length,
            totalItems: total,
            totalAtLeast: total,
            totalExact: true,
            totalPages: Math.max(1, Math.ceil(total / size)),
            hasMoreItems: start + slice.length < total,
        },
    };
}

/**
 * @typedef {Object} ListTotal
 * @property {number|null} total  exact number of matching rows, `null` when unknowable
 * @property {number} atLeast     rows **proven** to exist — always a number
 * @property {boolean} exact      whether `total` is a fact
 */

/**
 * Reads an honest total out of a `becpg/remote/entity/list` pagination block.
 *
 * **`totalItems` is not a total.** `JsonEntityVisitor` (becpg-core) writes
 * `pagingResult.getTotalResultCount().getFirst()`, which `BeCPGQueryBuilder.search()`
 * fills with `ResultSet.getNumberFound()` — and that number means two different things
 * depending on the path `inDBIfPossible()` took:
 *
 *   - **db-afts path** (a predicate the database can answer, which is what a plain
 *     `TYPE:` / property-equality query gets): the engine fetches one row past the
 *     window to decide `hasMore`, so `getNumberFound()` is `count + 1` — a *sentinel*
 *     meaning "there is at least one more", never a count. Measured on the local
 *     instance, one supplier, `TYPE:` disjunction:
 *
 *     ```
 *     maxResults=2   -> count 2,  totalItems 3,   hasMoreItems true    <- sentinel
 *     maxResults=5   -> count 5,  totalItems 6,   hasMoreItems true    <- sentinel
 *     maxResults=25  -> count 9,  totalItems 9,   hasMoreItems false   <- real total
 *     maxResults=200 -> count 173, totalItems 173, hasMoreItems false  <- real total
 *     ```
 *
 *   - **index path** (a predicate SOLR has to answer, e.g. `ANCESTOR:`): the same
 *     field is SOLR's `numFound`, i.e. the real total, constant across pages —
 *     measured, 79 raw materials under one supplier: `totalItems 79` on pages 1…4
 *     while `count` was 25/25/25/4.
 *
 * A reader cannot know which path ran, so this helper decides from the numbers
 * themselves, and answers with **an exact total or none at all**:
 *
 * | upstream                                  | verdict                          |
 * |-------------------------------------------|----------------------------------|
 * | `hasMoreItems: false`                     | exact — the window held everything |
 * | `hasMoreItems: true`, `totalItems > seen + 1` | exact — bigger than the sentinel can be, so it is SOLR's count |
 * | `hasMoreItems: true`, anything else       | **unknown** — `total: null`, `atLeast: seen` |
 *
 * The last row is deliberately pessimistic: an index-path result set holding exactly
 * `seen + 1` rows is reported as "at least `seen`" instead of "`seen + 1`". Being
 * vague is recoverable; a `maxResults + 1` printed as a park size is not.
 *
 * @param {Object|null} raw the `pagination` block beCPG returned
 * @param {Object} [options]
 * @param {number} [options.rows] rows actually held (defaults to `raw.count`)
 * @param {number} [options.skipped=0] rows skipped before this window (`page` > 1)
 * @returns {ListTotal}
 *
 * @example
 * readListTotal({ count: 5, totalItems: 6, hasMoreItems: true });
 * // { total: null, atLeast: 5, exact: false }   <- never 6
 */
export function readListTotal(raw, options = {}) {
    const block = raw || {};
    const asked = Number(options.rows);
    const rows = Math.max(0, Number.isFinite(asked) ? asked : Number(block.count) || 0);
    const skipped = Math.max(0, Number(options.skipped) || 0);
    const seen = skipped + rows;
    const reported = Number(block.totalItems);

    if (block.hasMoreItems !== true) {
        const total = Number.isFinite(reported) ? Math.max(reported, seen) : seen;
        return { total, atLeast: total, exact: true };
    }
    if (Number.isFinite(reported) && reported > seen + 1) {
        return { total: reported, atLeast: reported, exact: true };
    }
    return { total: null, atLeast: seen, exact: false };
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The four task types the supplier space routes on (spec §4.2 `/tasks/[id]`).
 * @readonly
 */
export const TASK_TYPES = Object.freeze({
    WIZARD: 'wizard',
    SIGNATURE: 'signature',
    DOCUMENT: 'document',
    REVIEW: 'review',
});

/**
 * **Invariant I1 (spec §7.2).** The deliverable URL prefix `SupplierSecurityPlugin`
 * matches to grant write access. Never rewrite a URL starting with it.
 */
export const SUPPLIER_WIZARD_PREFIX = '/share/page/wizard?id=supplier-';

/** Any `/share/page/wizard` URL, supplier-scoped or not. */
const WIZARD_PATH = '/share/page/wizard';

/** `content:<nodeRef>` deliverable URLs (doc/becpg-api-contracts.md, DeliverableUrl). */
const CONTENT_URL_PREFIX = 'content:';

/** Heuristics for a signature deliverable (bSign / DocuSign / YouSign views). */
const SIGNATURE_HINTS = [/(^|[?&])mode=sign(&|$)/i, /\bbsign\b/i, /docusign/i, /yousign/i, /\bsignature\b/i, /\/sign(\/|$|\?)/i];

/** Heuristics for a "open this document" deliverable. */
const DOCUMENT_HINTS = [/document-details/i, /api\/node\/content/i, /\/document\//i];

/** beCPG task states (`pjt:tlState`). */
export const TASK_STATES = Object.freeze(['Planned', 'InProgress', 'OnHold', 'Cancelled', 'Completed', 'Refused']);

/** States a supplier still has something to do about. */
const OPEN_TASK_STATES = new Set(['Planned', 'InProgress', 'OnHold']);

/** Upper bound on the number of candidate tasks we scan before paginating. */
const MAX_TASK_SCAN = 200;

/** Concurrency used to enrich tasks with `becpg/project/task`. */
const ENRICH_CONCURRENCY = 6;

/** Workflow task properties we ask Alfresco for — everything else is noise. */
const WORKFLOW_TASK_PROPERTIES = [
    'bpm_priority',
    'bpm_status',
    'bpm_dueDate',
    'bpm_startDate',
    'bpm_description',
    'bpm_percentComplete',
    'pjt_workflowTask',
    'bcpg_workflowEntity',
].join(',');

/* -------------------------------------------------------------------------- */
/* Typedefs — the contract the UI agents depend on                             */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {Object} Pagination
 * @property {number} page          1-based page number
 * @property {number} pageSize
 * @property {number} count         items in this page
 * @property {number|null} totalItems total matching items — a number here because the
 *        list is materialised in memory (bounded by MAX_TASK_SCAN for tasks); it is
 *        `null` on the payloads whose total comes from the search engine and cannot be
 *        known, see {@link readListTotal}
 * @property {number} totalAtLeast  rows proven to exist — always a number
 * @property {boolean} totalExact   whether `totalItems` is a fact
 * @property {number|null} totalPages
 * @property {boolean} hasMoreItems
 */

/**
 * @typedef {Object} TaskEntityRef
 * @property {string|null} nodeRef  the product / supplier entity being worked on
 * @property {string|null} name
 * @property {string|null} code     `bcpg:code`
 * @property {string|null} type     prefixed type, e.g. `bcpg:rawMaterial`
 */

/**
 * @typedef {Object} TaskProjectRef
 * @property {string|null} nodeRef  the `pjt:project` node
 * @property {string|null} name
 */

/**
 * @typedef {Object} TaskDeliverable
 * @property {string} nodeRef
 * @property {string} name              `pjt:dlDescription`, already localised by beCPG
 * @property {string|null} state        `pjt:dlState` (Planned|InProgress|Completed…)
 * @property {string|null} url          **verbatim** deliverable URL (invariant I1)
 * @property {string} type              one of TASK_TYPES, derived from `url`
 * @property {string|null} wizardId     e.g. `supplier-rawMaterial`
 * @property {string|null} entityNodeRef nodeRef carried by the URL
 * @property {number} sort              `bcpg:sort`
 * @property {number} completionPercent 0..100
 * @property {number} commentCount
 * @property {Array<{nodeRef: string, name: string, type: string, path: string|null,
 *                   siteId: string|null, isContainer: boolean}>} contents
 */

/**
 * The normalised portal task. **This is the shape `/api/v1/tasks` returns.**
 *
 * @typedef {Object} Task
 * @property {string} id                 `pjt:taskList` nodeRef — the id of `/tasks/{id}`
 * @property {string} uuid               uuid part of `id`, for short URLs
 * @property {string} name               `pjt:tlTaskName`, already localised
 * @property {string|null} description   `pjt:tlTaskDescription`
 * @property {TaskEntityRef} entity      the product / supplier the task is about
 * @property {TaskProjectRef} project    the referencing project
 * @property {string} type               `wizard` | `signature` | `document` | `review`
 * @property {number|null} priority      `bpm:priority` — 1 high, 2 medium, 3 low
 * @property {string|null} priorityLevel `high` | `medium` | `low`
 * @property {string|null} dueDate       ISO 8601
 * @property {string|null} startDate     ISO 8601
 * @property {string|null} state         `pjt:tlState` — Planned|InProgress|Completed|Refused…
 * @property {boolean} isLate            due date in the past and the task still open
 * @property {boolean} isOpen            state is Planned / InProgress / OnHold
 * @property {string|null} url           **verbatim** deliverable URL (never rewritten)
 * @property {string|null} wizardId      parsed from `url` — `supplier-rawMaterial`
 * @property {string|null} entityNodeRef parsed from `url` — the entity to open
 * @property {number} completionPercent  0..100
 * @property {number} commentCount
 * @property {boolean} isPooled          claimable pooled workflow task
 * @property {boolean} isRefusedEnabled  the client refused a previous step
 * @property {string|null} workflowTaskId Activiti id, e.g. `activiti$1234`
 * @property {string} source             `workflow` | `projectTask` | `workflow+projectTask`
 * @property {string} href               portal route — `/tasks/{uuid}`
 * @property {TaskDeliverable[]} deliverables sorted by `sort`
 */

/* -------------------------------------------------------------------------- */
/* Deliverable URL parsing — the routing rule of spec §4.2                     */
/* -------------------------------------------------------------------------- */

function firstMatch(patterns, value) {
    return patterns.some((pattern) => pattern.test(value));
}

/**
 * Parses a beCPG deliverable URL and derives the portal task type.
 *
 * Rules, in order:
 *
 * | URL                                                    | type        |
 * |--------------------------------------------------------|-------------|
 * | `/share/page/wizard?id=supplier-…` (no `mode=sign`)     | `wizard`    |
 * | any URL carrying `mode=sign`, bSign / DocuSign / YouSign | `signature` |
 * | `content:<nodeRef>` or a document/content URL            | `document`  |
 * | anything else (including an empty URL)                   | `review`    |
 *
 * The URL itself is returned **unchanged** — invariant I1.
 *
 * @param {string|null} url the raw `pjt:dlUrl`, already resolved by beCPG
 * @returns {{url: string|null, type: string, wizardId: string|null,
 *            entityNodeRef: string|null, mode: string|null,
 *            contentNodeRef: string|null, isSupplierWizard: boolean}}
 *
 * @example
 * parseDeliverableUrl('/share/page/wizard?id=supplier-rawMaterial&nodeRef=workspace://SpacesStore/abc');
 * // { type: 'wizard', wizardId: 'supplier-rawMaterial', entityNodeRef: 'workspace://SpacesStore/abc', … }
 */
export function parseDeliverableUrl(url) {
    const raw = typeof url === 'string' ? url.trim() : '';
    const empty = {
        url: raw || null,
        type: TASK_TYPES.REVIEW,
        wizardId: null,
        entityNodeRef: null,
        mode: null,
        contentNodeRef: null,
        isSupplierWizard: false,
    };

    if (!raw) {
        return empty;
    }

    // `content:<nodeRef>` — the deliverable *is* a document.
    if (raw.toLowerCase().startsWith(CONTENT_URL_PREFIX)) {
        const candidate = decodeURIComponent(raw.slice(CONTENT_URL_PREFIX.length));
        return {
            ...empty,
            type: TASK_TYPES.DOCUMENT,
            contentNodeRef: isNodeRef(candidate) ? candidate : null,
        };
    }

    let params = null;
    let pathname = raw;
    try {
        // A base is required for the relative URLs beCPG stores; it is never used.
        const parsed = new URL(raw, 'https://portal.invalid');
        params = parsed.searchParams;
        pathname = parsed.pathname;
    }
    catch {
        params = new URLSearchParams();
    }

    const mode = params.get('mode');
    const wizardId = params.get('id');
    const nodeRefParam = params.get('nodeRef') || params.get('destination');
    const entityNodeRef = nodeRefParam && isNodeRef(nodeRefParam) ? nodeRefParam : null;
    const isSupplierWizard = raw.startsWith(SUPPLIER_WIZARD_PREFIX);
    const isWizard = isSupplierWizard || pathname === WIZARD_PATH;

    if (mode === 'sign' || firstMatch(SIGNATURE_HINTS, raw)) {
        return {
            url: raw,
            type: TASK_TYPES.SIGNATURE,
            wizardId: isWizard ? wizardId : null,
            entityNodeRef,
            mode: mode || 'sign',
            contentNodeRef: null,
            isSupplierWizard,
        };
    }

    if (isWizard) {
        return {
            url: raw,
            type: TASK_TYPES.WIZARD,
            wizardId,
            entityNodeRef,
            mode: mode || null,
            contentNodeRef: null,
            isSupplierWizard,
        };
    }

    if (firstMatch(DOCUMENT_HINTS, raw)) {
        return { ...empty, url: raw, type: TASK_TYPES.DOCUMENT, entityNodeRef, mode: mode || null };
    }

    return { ...empty, url: raw, entityNodeRef, mode: mode || null };
}

/**
 * Normalises one deliverable of `becpg/project/task`.
 *
 * @param {Object} raw a `task.deliverables[]` entry
 * @returns {TaskDeliverable}
 */
export function normalizeDeliverable(raw) {
    const parsed = parseDeliverableUrl(raw && raw.url);
    const contents = Array.isArray(raw && raw.contents) ? raw.contents : [];

    return {
        nodeRef: (raw && raw.nodeRef) || null,
        name: (raw && raw.name) || '',
        state: (raw && raw.state) || null,
        url: parsed.url,
        type: contents.length > 0 && parsed.type === TASK_TYPES.REVIEW ? TASK_TYPES.DOCUMENT : parsed.type,
        wizardId: parsed.wizardId,
        entityNodeRef: parsed.entityNodeRef,
        contentNodeRef: parsed.contentNodeRef,
        sort: Number(raw && raw.sort) || 0,
        completionPercent: Number(raw && raw.completionPercent) || 0,
        commentCount: Number(raw && raw.commentCount) || 0,
        contents: contents.map((content) => ({
            nodeRef: content.nodeRef,
            name: content.name || '',
            type: content.type || null,
            path: content.path || null,
            siteId: content.siteId || null,
            isContainer: Boolean(content.isContainer),
        })),
    };
}

/** Routing precedence when a task carries several deliverables. */
const TYPE_PRECEDENCE = [TASK_TYPES.WIZARD, TASK_TYPES.SIGNATURE, TASK_TYPES.DOCUMENT, TASK_TYPES.REVIEW];

/**
 * Picks the deliverable a click on the task must open.
 *
 * Unfinished deliverables win over completed ones; then the precedence above
 * (a wizard step is what the supplier is actually asked to do); then `sort`.
 *
 * @param {TaskDeliverable[]} deliverables
 * @returns {TaskDeliverable|null}
 */
export function pickPrimaryDeliverable(deliverables) {
    const list = (deliverables || []).filter((item) => item && (item.url || item.contents.length > 0));
    if (list.length === 0) {
        return null;
    }
    const score = (item) => {
        const done = item.state === 'Completed' || item.state === 'Cancelled' ? 100 : 0;
        return done + TYPE_PRECEDENCE.indexOf(item.type) * 10 + Math.min(9, item.sort);
    };
    return [...list].sort((a, b) => score(a) - score(b))[0];
}

/* -------------------------------------------------------------------------- */
/* Sources                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Resolves the `cm:person` nodeRef of the connected user.
 *
 * Needed because `pjt:tlResourcesAssocIndex` stores nodeRefs, and it is the only
 * way to query "the project tasks assigned to me" — associations themselves are
 * not searchable in Alfresco.
 *
 * @param {Object} client authenticated beCPG client
 * @param {string} [username] defaults to the session user
 * @returns {Promise<string|null>} the person nodeRef, or null when unresolvable
 */
export async function resolvePersonNodeRef(client, username) {
    const user = username || client.username;
    if (!user) {
        return null;
    }
    if (client.cache && client.cache.has(`person:${user}`)) {
        return client.cache.get(`person:${user}`);
    }

    let nodeRef = null;
    try {
        const data = await client.getJson('becpg/remote/entity/list', {
            query: {
                query: `TYPE:"cm:person" AND =cm:userName:"${escapeFtsValue(user)}"`,
                maxResults: 1,
                excludeSystems: false,
            },
        });
        const first = Array.isArray(data && data.entities) ? data.entities[0] : null;
        nodeRef = first && first.entity ? nodeRefFromId(first.entity.id) : null;
    }
    catch {
        // A supplier account may not be allowed to read the person store; the
        // workflow source alone is then authoritative.
        nodeRef = null;
    }

    if (client.cache) {
        client.cache.set(`person:${user}`, nodeRef);
    }
    return nodeRef;
}

/**
 * Source 1 — Alfresco workflow tasks assigned to (or poolable by) the user.
 *
 * @param {Object} client
 * @param {Object} [options]
 * @param {string} [options.state='in_progress'] `in_progress` | `completed`
 * @param {boolean} [options.pooled=true] include pooled tasks
 * @param {number} [options.maxItems=MAX_TASK_SCAN]
 * @param {string} [options.exclude] comma-separated task types to drop
 * @returns {Promise<Array<Object>>} raw candidates, one per workflow task
 */
async function fetchWorkflowTasks(client, options = {}) {
    const {
        state = 'in_progress',
        pooled = true,
        maxItems = MAX_TASK_SCAN,
        exclude,
    } = options;

    const data = await client.getJson('api/task-instances', {
        query: {
            authority: client.username,
            state,
            pooledTasks: pooled ? 'true' : 'false',
            properties: WORKFLOW_TASK_PROPERTIES,
            maxItems,
            skipCount: 0,
            ...(exclude ? { exclude } : {}),
        },
    });

    const rows = Array.isArray(data && data.data) ? data.data : [];
    return rows.map((row) => {
        const properties = (row && row.properties) || {};
        const projectTaskNodeRef = properties.pjt_workflowTask || null;
        return {
            source: 'workflow',
            projectTaskNodeRef: isNodeRef(projectTaskNodeRef) ? projectTaskNodeRef : null,
            projectNodeRef: isNodeRef(properties.bcpg_workflowEntity) ? properties.bcpg_workflowEntity : null,
            workflowTaskId: row.id || null,
            workflowInstance: (row.workflowInstance && row.workflowInstance.id) || null,
            name: row.title || row.name || '',
            description: properties.bpm_description || row.description || '',
            dueDate: toIsoDate(properties.bpm_dueDate),
            startDate: toIsoDate(properties.bpm_startDate),
            priority: properties.bpm_priority === undefined || properties.bpm_priority === null
                ? null
                : Number(properties.bpm_priority),
            completionPercent: Number(properties.bpm_percentComplete) || 0,
            state: row.state === 'COMPLETED' ? 'Completed' : 'InProgress',
            isPooled: Boolean(row.isPooled),
        };
    });
}

/**
 * Source 2 — `pjt:taskList` items where the user is a resource.
 *
 * @param {Object} client
 * @param {Object} [options]
 * @param {string} [options.personNodeRef] resolved by {@link resolvePersonNodeRef}
 * @param {string[]} [options.states] `pjt:tlState` values to keep
 * @param {number} [options.maxResults=MAX_TASK_SCAN]
 * @returns {Promise<Array<Object>>} raw candidates, one per project task
 */
async function fetchProjectTasks(client, options = {}) {
    const { personNodeRef, states = ['InProgress'], maxResults = MAX_TASK_SCAN } = options;
    if (!personNodeRef) {
        return [];
    }

    const stateClause = states.length > 0
        ? ` AND (${states.map((state) => `=pjt:tlState:"${escapeFtsValue(state)}"`).join(' OR ')})`
        : '';
    const query = `TYPE:"pjt:taskList" AND pjt:tlResourcesAssocIndex:"${escapeFtsValue(personNodeRef)}"${stateClause}`;

    let data = null;
    try {
        data = await client.getJson('becpg/remote/entity/list', {
            query: {
                query,
                maxResults,
                fields: [
                    'pjt:tlTaskName',
                    'pjt:tlTaskDescription',
                    'pjt:tlState',
                    'pjt:tlDue',
                    'pjt:tlStart',
                    'pjt:tlEnd',
                    'pjt:completionPercent',
                    'fm:commentCount',
                ].join(','),
                lists: 'none',
            },
        });
    }
    catch {
        // The property is only populated once `patch.bcpg.taskListResourcesAssocIndexPatch`
        // has run. On an instance where it has not, this source is simply empty.
        return [];
    }

    const rows = Array.isArray(data && data.entities) ? data.entities : [];
    return rows
        .map((row) => row && row.entity)
        .filter(Boolean)
        .map((entity) => {
            const attributes = entity.attributes || {};
            return {
                source: 'projectTask',
                projectTaskNodeRef: nodeRefFromId(entity.id),
                projectNodeRef: null,
                workflowTaskId: null,
                workflowInstance: null,
                name: attributes['pjt:tlTaskName'] || entity['cm:name'] || '',
                description: attributes['pjt:tlTaskDescription'] || '',
                dueDate: toIsoDate(attributes['pjt:tlDue']),
                startDate: toIsoDate(attributes['pjt:tlStart']),
                priority: null,
                completionPercent: Number(attributes['pjt:completionPercent']) || 0,
                state: attributes['pjt:tlState'] || null,
                commentCount: Number(attributes['fm:commentCount']) || 0,
                isPooled: false,
            };
        });
}

/**
 * Reads `becpg/project/task?nodeRef=…` — the task detail with its deliverables
 * and their **resolved** URLs (beCPG substitutes `{pjt:projectEntity}` & co.).
 *
 * @param {Object} client
 * @param {string} taskNodeRef `pjt:taskList` nodeRef
 * @returns {Promise<Object|null>} `{ task: {…} }`, or null when unreadable
 */
async function fetchProjectTaskInfo(client, taskNodeRef) {
    try {
        const data = await client.getJson('becpg/project/task', { query: { nodeRef: taskNodeRef } });
        return data && data.task ? data.task : null;
    }
    catch {
        // A task the supplier may not read must not blow up the whole list.
        return null;
    }
}

/* -------------------------------------------------------------------------- */
/* Normalisation                                                               */
/* -------------------------------------------------------------------------- */

function priorityLevel(priority) {
    if (priority === 1) {
        return 'high';
    }
    if (priority === 3) {
        return 'low';
    }
    if (priority === 2) {
        return 'medium';
    }
    return null;
}

/**
 * Collects every entity nodeRef a page of tasks refers to.
 *
 * The deliverable URL is the authoritative source of the entity (spec §7.2 I1: the URL is
 * parsed, never rewritten).
 *
 * @param {Object[]} candidates task candidates
 * @param {Object[]} infos the matching `becpg/project/task` payloads
 * @returns {string[]} de-duplicated nodeRefs
 */
export function collectEntityNodeRefs(candidates, infos) {
    const refs = new Set();
    (candidates || []).forEach((candidate, index) => {
        const info = (infos || [])[index];
        const deliverables = Array.isArray(info && info.deliverables) ? info.deliverables : [];
        deliverables
            .map((deliverable) => parseDeliverableUrl(deliverable && deliverable.url).entityNodeRef)
            .filter(Boolean)
            .forEach((ref) => refs.add(ref));
        if (candidate && candidate.entityNodeRef) {
            refs.add(candidate.entityNodeRef);
        }
    });
    return [...refs];
}

/**
 * Resolves `nodeRef -> { name, code, type }` for a batch of nodes, in ONE query per chunk.
 *
 * Batched on purpose: one call per task would mean N round-trips on a page, and the same
 * entity often carries several tasks.
 *
 * @param {Object} client the beCPG client
 * @param {string[]} nodeRefs nodeRefs to resolve
 * @returns {Promise<Object>} the index; nodes that cannot be read are simply absent
 */
export async function resolveEntityIndex(client, nodeRefs) {
    const refs = (nodeRefs || []).filter(Boolean);
    if (refs.length === 0) {
        return {};
    }

    const CHUNK = 40;
    const index = {};

    for (let offset = 0; offset < refs.length; offset += CHUNK) {
        const chunk = refs.slice(offset, offset + CHUNK);
        const clause = chunk.map((ref) => `ID:"${escapeFtsValue(ref)}"`).join(' OR ');
        try {
            const data = await client.getJson('becpg/remote/entity/list', {
                query: {
                    query: `(${clause})`,
                    maxResults: chunk.length,
                    fields: ['cm:name', 'bcpg:code', 'bcpg:erpCode', 'bcpg:legalName'].join(','),
                },
            });
            for (const wrapper of data?.entities || []) {
                const entity = wrapper?.entity;
                if (!entity?.id) {
                    continue;
                }
                index[`workspace://SpacesStore/${entity.id}`] = {
                    name: entity['cm:name'] || entity['bcpg:legalName'] || null,
                    code: entity['bcpg:code'] || entity['bcpg:erpCode'] || null,
                    type: entity.type || null,
                };
            }
        }
        catch (error) {
            // A name is a nicety, not a prerequisite: a failed lookup must not take the task
            // list down. The task still routes — it carries its nodeRef and its wizardId.
            logWarn('tasks.resolveEntityIndex', { error: error.message, size: chunk.length });
        }
    }

    return index;
}

/**
 * Merges a candidate (workflow and/or project-task source) with its
 * `becpg/project/task` detail into the normalised {@link Task}.
 *
 * @param {Object} candidate merged raw candidate
 * @param {Object|null} info `becpg/project/task` payload (`task`)
 * @param {Object} [entityIndex] nodeRef → {name, code, type}, when already known
 * @returns {Task}
 */
export function normalizeTask(candidate, info, entityIndex = {}) {
    const deliverables = Array.isArray(info && info.deliverables)
        ? info.deliverables.map(normalizeDeliverable).sort((a, b) => a.sort - b.sort)
        : [];
    const primary = pickPrimaryDeliverable(deliverables);

    const state = (info && info.state) || candidate.state || null;
    const dueDate = candidate.dueDate || null;
    const isOpen = state ? OPEN_TASK_STATES.has(state) : true;
    const entityNodeRef = (primary && primary.entityNodeRef) || candidate.entityNodeRef || null;
    const entityMeta = (entityNodeRef && entityIndex[entityNodeRef]) || {};

    // `becpg/project/task` names its `entityNodeRef` after the node that OWNS the
    // taskList — that is the project, not the product. The product is the nodeRef
    // carried by the deliverable URL.
    const projectNodeRef = candidate.projectNodeRef || (info && info.entityNodeRef) || null;

    const type = primary ? primary.type : TASK_TYPES.REVIEW;
    const wizardId = (primary && primary.wizardId)
        || (entityMeta.type ? wizardIdForType(entityMeta.type) : null);

    return {
        id: candidate.projectTaskNodeRef,
        uuid: nodeRefUuid(candidate.projectTaskNodeRef),
        name: (info && info.name) || candidate.name || '',
        description: (info && info.description) || candidate.description || null,
        entity: {
            nodeRef: entityNodeRef,
            name: entityMeta.name || null,
            code: entityMeta.code || null,
            type: entityMeta.type || null,
        },
        project: {
            nodeRef: projectNodeRef && projectNodeRef !== '#access_forbidden' ? projectNodeRef : null,
            name: candidate.projectName || null,
        },
        type,
        priority: candidate.priority === null || candidate.priority === undefined ? null : candidate.priority,
        priorityLevel: priorityLevel(candidate.priority),
        dueDate,
        startDate: candidate.startDate || null,
        state,
        isOpen,
        isLate: Boolean(dueDate && isOpen && new Date(dueDate).getTime() < Date.now()),
        url: primary ? primary.url : null,
        wizardId: wizardId || null,
        entityNodeRef,
        completionPercent: Number((info && info.completionPercent) || candidate.completionPercent) || 0,
        commentCount: Number((info && info.commentCount) || candidate.commentCount) || 0,
        isPooled: Boolean(candidate.isPooled),
        isRefusedEnabled: Boolean(info && info.isRefusedEnabled),
        workflowTaskId: candidate.workflowTaskId || null,
        source: candidate.source,
        href: `/tasks/${nodeRefUuid(candidate.projectTaskNodeRef)}`,
        deliverables,
    };
}

function mergeCandidates(lists) {
    const byNodeRef = new Map();
    for (const list of lists) {
        for (const candidate of list) {
            if (!candidate.projectTaskNodeRef) {
                continue;
            }
            const existing = byNodeRef.get(candidate.projectTaskNodeRef);
            if (!existing) {
                byNodeRef.set(candidate.projectTaskNodeRef, candidate);
                continue;
            }
            byNodeRef.set(candidate.projectTaskNodeRef, {
                ...candidate,
                ...existing,
                // Keep whichever source knows a value.
                dueDate: existing.dueDate || candidate.dueDate,
                startDate: existing.startDate || candidate.startDate,
                priority: existing.priority ?? candidate.priority,
                state: existing.state || candidate.state,
                description: existing.description || candidate.description,
                completionPercent: existing.completionPercent || candidate.completionPercent,
                commentCount: existing.commentCount || candidate.commentCount,
                projectNodeRef: existing.projectNodeRef || candidate.projectNodeRef,
                workflowTaskId: existing.workflowTaskId || candidate.workflowTaskId,
                isPooled: existing.isPooled || candidate.isPooled,
                source: existing.source === candidate.source
                    ? existing.source
                    : `${existing.source}+${candidate.source}`,
            });
        }
    }
    return [...byNodeRef.values()];
}

const SORTERS = {
    due: (a, b) => {
        if (a.isLate !== b.isLate) {
            return a.isLate ? -1 : 1;
        }
        const left = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
        const right = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
        if (left !== right) {
            return left - right;
        }
        return (a.priority || 2) - (b.priority || 2);
    },
    priority: (a, b) => (a.priority || 2) - (b.priority || 2) || SORTERS.due(a, b),
    name: (a, b) => String(a.name).localeCompare(String(b.name)),
    type: (a, b) => String(a.type).localeCompare(String(b.type)) || SORTERS.due(a, b),
};

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * **My tasks** — the list behind `/api/v1/tasks` and the dashboard's
 * "actions requises" card.
 *
 * Both sources are read, merged on the `pjt:taskList` nodeRef, then every
 * candidate is enriched with `becpg/project/task` (bounded concurrency) so the
 * deliverable URL — and therefore the task **type** — is known before filtering
 * and paginating. The scan is capped at {@link MAX_TASK_SCAN} candidates; a
 * supplier never has more open tasks than that, and the cap keeps the endpoint
 * O(1) in the size of the instance.
 *
 * @param {Object} client authenticated beCPG client
 * @param {Object} [options]
 * @param {number} [options.page=1]
 * @param {number} [options.pageSize=25]
 * @param {string} [options.type] filter on one of {@link TASK_TYPES}
 * @param {string} [options.state='in_progress'] workflow state (`in_progress`|`completed`)
 * @param {boolean} [options.late] keep only late (true) / on-time (false) tasks
 * @param {string} [options.entityNodeRef] keep only the tasks of one entity
 * @param {string} [options.q] free-text filter on the task / entity name
 * @param {string} [options.sort='due'] `due` | `priority` | `name` | `type`
 * @param {boolean} [options.includeProjectTasks=true] use source 2 as well
 * @param {Object} [options.entityIndex] nodeRef → `{name, code, type}` already known
 * @returns {Promise<{items: Task[], pagination: Pagination,
 *                    counters: {total: number, late: number, byType: Object.<string, number>},
 *                    truncated: boolean}>}
 *
 * @example
 * const { items, counters } = await listMyTasks(client, { type: 'wizard', pageSize: 10 });
 */
export async function listMyTasks(client, options = {}) {
    const {
        page = 1,
        pageSize = 25,
        type,
        state = 'in_progress',
        late,
        entityNodeRef,
        q,
        sort = 'due',
        includeProjectTasks = true,
        entityIndex = {},
    } = options;

    const workflowTasks = await fetchWorkflowTasks(client, { state });

    let projectTasks = [];
    if (includeProjectTasks && state === 'in_progress') {
        const personNodeRef = await resolvePersonNodeRef(client);
        projectTasks = await fetchProjectTasks(client, { personNodeRef });
    }

    const candidates = mergeCandidates([workflowTasks, projectTasks]);
    const truncated = candidates.length > MAX_TASK_SCAN;
    const scanned = candidates.slice(0, MAX_TASK_SCAN);

    const infos = await mapWithConcurrency(
        scanned,
        ENRICH_CONCURRENCY,
        (candidate) => fetchProjectTaskInfo(client, candidate.projectTaskNodeRef),
    );

    // The deliverable URL yields the entity's nodeRef, never its name. Resolve the names in
    // ONE batched query before normalising: without this the task list shows "Référencement"
    // with no product, and the supplier cannot tell which product a task is about — which
    // spec §4.3 requires ("nom, produit/client, type, priorité, échéance").
    // Measured on dev.becpg.fr: 8 tasks, every entity.name null before this.
    const resolvedIndex = {
        ...(await resolveEntityIndex(client, collectEntityNodeRefs(scanned, infos))),
        // A caller-supplied index wins: it already has the data and paid for it.
        ...entityIndex,
    };

    let tasks = scanned.map((candidate, index) => normalizeTask(candidate, infos[index], resolvedIndex));

    if (type) {
        tasks = tasks.filter((task) => task.type === type);
    }
    if (late === true || late === false) {
        tasks = tasks.filter((task) => task.isLate === late);
    }
    if (entityNodeRef) {
        tasks = tasks.filter((task) => task.entityNodeRef === entityNodeRef);
    }
    if (q) {
        const needle = String(q).toLowerCase();
        tasks = tasks.filter((task) => `${task.name} ${task.entity.name || ''} ${task.entity.code || ''}`
            .toLowerCase()
            .includes(needle));
    }

    tasks.sort(SORTERS[sort] || SORTERS.due);

    const counters = {
        total: tasks.length,
        late: tasks.filter((task) => task.isLate).length,
        open: tasks.filter((task) => task.isOpen).length,
        byType: Object.values(TASK_TYPES).reduce((accumulator, taskType) => {
            accumulator[taskType] = tasks.filter((task) => task.type === taskType).length;
            return accumulator;
        }, {}),
    };

    return { ...paginate(tasks, page, pageSize), counters, truncated };
}

/**
 * **One task** — behind `GET /api/v1/tasks/{id}`.
 *
 * Returns the same {@link Task} shape as the list, always with its full
 * `deliverables[]`, so the UI can route (`type`, `wizardId`, `entityNodeRef`)
 * without a second call.
 *
 * The entity **name** is resolved here, exactly as {@link listMyTasks} does it: the
 * deliverable URL carries the product's nodeRef and nothing else, so without a lookup
 * `entity.name` is `null` and the supplier opens a task called "Référencement" with no
 * way to tell which product it is about — the very thing spec §4.3 asks for.
 *
 * @param {Object} client
 * @param {string} taskNodeRef `pjt:taskList` nodeRef (or uuid — see {@link toNodeRef})
 * @param {Object} [options]
 * @param {Object} [options.entityIndex] nodeRef → `{name, code, type}` already known;
 *        every entry here is used as-is and is never looked up again
 * @returns {Promise<Task|null>} null when the task does not exist / is not readable
 */
export async function getTask(client, taskNodeRef, options = {}) {
    const nodeRef = toNodeRef(taskNodeRef);
    const info = await fetchProjectTaskInfo(client, nodeRef);
    if (!info) {
        return null;
    }

    // The workflow instance carries the due date and the priority; the project
    // task itself does not. Look it up, but never fail on it.
    let candidate = {
        source: 'projectTask',
        projectTaskNodeRef: nodeRef,
        projectNodeRef: null,
        workflowTaskId: null,
        name: info.name,
        description: info.description,
        dueDate: null,
        startDate: null,
        priority: null,
        completionPercent: Number(info.completionPercent) || 0,
        commentCount: Number(info.commentCount) || 0,
        state: info.state || null,
        isPooled: false,
    };

    try {
        const workflowTasks = await fetchWorkflowTasks(client, {});
        const match = workflowTasks.find((task) => task.projectTaskNodeRef === nodeRef);
        if (match) {
            candidate = { ...candidate, ...match, source: 'workflow+projectTask' };
        }
    }
    catch {
        // Keep the project-task-only view.
    }

    // Same resolution as the list, sized for one task. `resolveEntityIndex()` builds its
    // query from the batch it is handed (`maxResults: chunk.length`), so a single task
    // costs a single `ID:"…"` lookup — never a 40-item chunk — and a nodeRef the caller
    // already knows costs nothing at all. A failure there degrades exactly like it does in
    // the list: `logWarn`, no name, and the task still routes on its nodeRef and wizardId.
    const entityIndex = { ...(options.entityIndex || {}) };
    const unresolved = collectEntityNodeRefs([candidate], [info])
        .filter((ref) => !entityIndex[ref]);
    if (unresolved.length > 0) {
        Object.assign(entityIndex, await resolveEntityIndex(client, unresolved));
    }

    return normalizeTask(candidate, info, entityIndex);
}

/**
 * **Completes a task** — behind `POST /api/v1/tasks/{id}/complete`.
 *
 * Straight proxy of `becpg/project/complete/task`; the business rules (frozen
 * lists, mandatory catalogs, refusal branches) stay in beCPG, which remains the
 * authority (spec §6.2, rule R2).
 *
 * @param {Object} client
 * @param {string} taskNodeRef `pjt:taskList` nodeRef or uuid
 * @returns {Promise<{nodeRef: string, completed: boolean, raw: Object|null}>}
 * @throws {PortalError} whatever beCPG answered, mapped by `lib/errors.js`
 */
export async function completeTask(client, taskNodeRef) {
    const nodeRef = toNodeRef(taskNodeRef);
    const result = await client.postJson('becpg/project/complete/task', undefined, {
        query: { nodeRef },
    });
    return {
        nodeRef,
        // beCPG spells the flag `succees` (sic) — normalised here, once.
        completed: Boolean(result && (result.succees === true || result.success === true)) || result === null,
        raw: result || null,
    };
}
