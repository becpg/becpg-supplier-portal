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

/**
 * Node type prefixes {@link resolveEntityFromDocument} walks **through**.
 *
 * `cm:` / `sys:` / `st:` / `app:` are Alfresco's own containers — a document, a
 * folder, a site. `pjt:` is excluded on purpose: a project is an entity in
 * beCPG's model, but it is not the *product* this contract calls `entity`
 * (it has its own field, `task.project`), and a document that lives under a
 * project must not make the task claim the project is its product.
 */
const WALKED_TYPE_PREFIXES = ['cm:', 'sys:', 'st:', 'app:', 'pjt:'];

/** Hops the walk of {@link resolveEntityFromDocument} allows before giving up. */
const ENTITY_WALK_MAX_HOPS = 4;

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
        /*
         * Sur un livrable de signature, `nodeRef=` désigne **le document à signer**
         * (la copie de travail préparée), pas le produit — cf. `signature.js`, qui
         * lit la même URL pour retrouver le PDF.
         *
         * Le ranger dans `entityNodeRef` faisait chercher un produit sous
         * l'identifiant d'un PDF : l'index d'entités ne le trouvait jamais et la
         * tâche s'affichait « Signature de documents » sans dire de quel produit
         * il s'agit (`entity.name = null`, observé sur la tâche
         * « Drops de chocolat noir bio UTZ »).
         *
         * Le produit ne se récupère PAS d'un autre livrable : mesuré le 03/08/2026
         * sur dev.becpg.fr, une tâche de signature créée par
         * `SignatureProjectServiceImpl.createEntitySignatureTasks()` porte trois
         * livrables (`- prepare`, `- url`, `- sign`) qui désignent tous le même
         * document, et le livrable assistant appartient à une **autre** tâche du
         * projet — que le fournisseur ne peut pas lire (`becpg/project/task`
         * répond `entityNodeRef: "#access_forbidden"`, et le nœud projet lui-même
         * répond 401). Il est remonté depuis le document par
         * {@link resolveEntityFromDocument}.
         */
        return {
            url: raw,
            type: TASK_TYPES.SIGNATURE,
            wizardId: isWizard ? wizardId : null,
            entityNodeRef: null,
            mode: mode || 'sign',
            contentNodeRef: entityNodeRef,
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

/** Cheapest projection that still names an entity and types it. */
const ENTITY_INDEX_FIELDS = ['cm:name', 'bcpg:code', 'bcpg:erpCode', 'bcpg:legalName'].join(',');

/**
 * One `becpg/remote/entity/list` lookup. Never throws: a name is a nicety, not a
 * prerequisite, and a failed lookup must not take the task list down.
 *
 * @param {Object} client
 * @param {string} clause the AFTS disjunction to run
 * @param {number} size `maxResults` — the batch handed in, never more
 * @returns {Promise<Object>} partial `nodeRef -> {name, code, type}`; `{}` on failure
 */
async function lookupEntities(client, clause, size) {
    const index = {};
    try {
        const data = await client.getJson('becpg/remote/entity/list', {
            query: { query: `(${clause})`, maxResults: size, fields: ENTITY_INDEX_FIELDS },
        });
        for (const wrapper of data?.entities || []) {
            const entity = wrapper?.entity;
            const id = entity?.nodeRef || entity?.id;
            if (!id) {
                continue;
            }
            // `id` is a bare uuid on this endpoint, but a payload that already carries a
            // full nodeRef must not be keyed as `workspace://SpacesStore/workspace://…`.
            index[isNodeRef(id) ? id : `workspace://SpacesStore/${id}`] = {
                name: entity['cm:name'] || entity['bcpg:legalName'] || null,
                code: entity['bcpg:code'] || entity['bcpg:erpCode'] || null,
                type: entity.type || null,
            };
        }
    }
    catch (error) {
        logWarn('tasks.resolveEntityIndex', { error: error.message, size });
    }
    return index;
}

/**
 * Resolves `nodeRef -> { name, code, type }` for a batch of nodes, in ONE query per chunk.
 *
 * Batched on purpose: one call per task would mean N round-trips on a page, and the same
 * entity often carries several tasks.
 *
 * ### Why two clauses, and in this order
 *
 * `becpg/remote/entity/list` runs its query through `inDBIfPossible()`. A query it can
 * answer from the database (`=sys:node-uuid:"<uuid>"`, the form `buildEntityQuery()` in
 * `lib/adapters/entities.js` uses for exactly this reason) is **real time**; one that
 * needs the search index (`ID:"<nodeRef>"`) lags a few seconds behind a node that was
 * just created. That lag is observable: `e2e/tests/06-full-process.spec.js` has to poll
 * for `entity.name` after branching a product, and its comment records why.
 *
 * So the db-afts clause runs first, and only the nodeRefs it did **not** answer are
 * retried on the index path. The retry is what makes this safe to change blind: if the
 * db-afts assumption is wrong on a given repository, the first pass simply returns
 * nothing and the second restores exactly the previous behaviour at the cost of one
 * extra query. This function can therefore never resolve *fewer* names than before.
 *
 * @param {Object} client the beCPG client
 * @param {string[]} nodeRefs nodeRefs to resolve
 * @returns {Promise<Object>} the index; nodes that cannot be read are simply absent
 */
export async function resolveEntityIndex(client, nodeRefs) {
    const refs = [...new Set((nodeRefs || []).filter(Boolean))];
    if (refs.length === 0) {
        return {};
    }

    const CHUNK = 40;
    const index = {};

    for (let offset = 0; offset < refs.length; offset += CHUNK) {
        const chunk = refs.slice(offset, offset + CHUNK);

        // Pass 1 — real time, straight out of the database.
        const byUuid = chunk
            .map((ref) => `=sys:node-uuid:"${escapeFtsValue(nodeRefUuid(ref))}"`)
            .join(' OR ');
        Object.assign(index, await lookupEntities(client, byUuid, chunk.length));

        // Pass 2 — only what pass 1 could not answer. The membership test canonicalises
        // the ref the same way `lookupEntities()` keys its result, so a caller that
        // handed in a bare uuid does not force a pointless second query.
        const missing = chunk.filter(
            (ref) => !index[isNodeRef(ref) ? ref : `workspace://SpacesStore/${nodeRefUuid(ref)}`],
        );
        if (missing.length > 0) {
            const byId = missing.map((ref) => `ID:"${escapeFtsValue(ref)}"`).join(' OR ');
            Object.assign(index, await lookupEntities(client, byId, missing.length));
        }
    }

    return index;
}

/**
 * One node, read as cheaply as beCPG allows: its name, its code, its **type**
 * and its **parent**. `lists=none` + `fields=` keeps the answer around 600 bytes
 * even on a raw material that carries twenty datalists (measured on
 * dev.becpg.fr: 546–720 B per node).
 *
 * Memoised on the client cache, which is per request: the same document is read
 * once whatever the number of deliverables that name it.
 *
 * @param {Object} client
 * @param {string} nodeRef
 * @returns {Promise<{nodeRef: string, parentNodeRef: string|null, type: string|null,
 *                    name: string|null, code: string|null}|null>} null when unreadable
 */
async function readNodeHeader(client, nodeRef) {
    const key = `nodeHeader:${nodeRef}`;
    if (client.cache && client.cache.has(key)) {
        return client.cache.get(key);
    }

    const promise = (async () => {
        try {
            const data = await client.getJson('becpg/remote/entity', {
                query: { nodeRef, fields: ENTITY_INDEX_FIELDS, lists: 'none' },
            });
            const node = data && data.entity;
            if (!node) {
                return null;
            }
            const attributes = node.attributes || {};
            return {
                nodeRef: node.nodeRef || nodeRefFromId(node.id) || nodeRef,
                parentNodeRef: node.parent ? nodeRefFromId(node.parent) : null,
                type: node.type || null,
                name: node['cm:name'] || attributes['cm:name'] || attributes['bcpg:legalName'] || null,
                code: attributes['bcpg:code'] || attributes['bcpg:erpCode'] || null,
            };
        }
        catch {
            // A node this session may not read is not an error here: the caller
            // simply ends up without a name, exactly as before this walk existed.
            return null;
        }
    })();

    if (client.cache) {
        client.cache.set(key, promise);
    }
    return promise;
}

/**
 * **Which product does this document belong to?** — answered by containment,
 * because nothing else answers it for a supplier.
 *
 * A signature task carries no product anywhere a supplier can read it: its three
 * deliverables all name the PDF, `becpg/project/task` answers
 * `entityNodeRef: "#access_forbidden"`, and the project node itself answers 401.
 * What the supplier *can* read is the document, and beCPG puts it in
 * `<entity>/<Documents fournisseur>` —
 * `SupplierPortalServiceImpl.getOrCreateSupplierDocumentsFolder(entityNodeRef)`
 * creates that folder as a direct child of the entity, and
 * `SignatureProjectHelper.findDocumentsToSign()` only ever looks inside it.
 *
 * So the walk climbs from the document through Alfresco's own containers and
 * stops on the first ancestor that is a beCPG entity — two hops in the supplier
 * referencing flow, capped at {@link ENTITY_WALK_MAX_HOPS} so a document filed
 * somewhere unexpected costs a bounded number of calls and then gives up.
 *
 * @param {Object} client
 * @param {string} documentNodeRef the signed document (or its working copy)
 * @returns {Promise<{nodeRef: string, name: string|null, code: string|null,
 *                    type: string|null}|null>} null when no entity owns it
 *
 * @example
 * await resolveEntityFromDocument(client, 'workspace://SpacesStore/0d1b33f4-…');
 * // { nodeRef: 'workspace://SpacesStore/fa5a9dfa-…', name: 'PORTALTEST …',
 * //   code: 'MP96843', type: 'bcpg:rawMaterial' }
 */
export async function resolveEntityFromDocument(client, documentNodeRef) {
    let current = isNodeRef(documentNodeRef) ? documentNodeRef : null;

    for (let hop = 0; current && hop < ENTITY_WALK_MAX_HOPS; hop += 1) {
        const node = await readNodeHeader(client, current);
        if (!node) {
            return null;
        }
        if (node.type && !WALKED_TYPE_PREFIXES.some((prefix) => node.type.startsWith(prefix))) {
            return { nodeRef: node.nodeRef, name: node.name, code: node.code, type: node.type };
        }
        current = node.parentNodeRef;
    }

    return null;
}

/**
 * The document a task is about, when it has one.
 *
 * The **original** (`pjt:dlContent`, i.e. `contents[0]`) is preferred over the
 * working copy named by the view URL, because `sign-document.js` deletes the
 * working copy on check-in: the original is the node that still exists once the
 * task is signed, and this resolution has to keep working on a closed task.
 *
 * @param {Array<Object>} deliverables raw `becpg/project/task` deliverables
 * @returns {string|null}
 */
export function pickTaskDocumentNodeRef(deliverables) {
    const list = Array.isArray(deliverables) ? deliverables.filter(Boolean) : [];

    for (const deliverable of list) {
        const contents = Array.isArray(deliverable.contents) ? deliverable.contents : [];
        const content = contents.find((entry) => entry && isNodeRef(entry.nodeRef));
        if (content) {
            return content.nodeRef;
        }
    }
    for (const deliverable of list) {
        const { contentNodeRef } = parseDeliverableUrl(deliverable.url);
        if (contentNodeRef) {
            return contentNodeRef;
        }
    }
    return null;
}

/**
 * Fills in `candidate.entityNodeRef` for the tasks no deliverable URL names an
 * entity for — a signature task, and any task whose only deliverable is a
 * document. Mutates the candidates it is given (they are built by this module)
 * and returns the metadata the walk already paid for, so the caller does not
 * look the same nodes up a second time.
 *
 * Tasks that already know their entity cost **nothing**: no call is issued for
 * them at all.
 *
 * @param {Object} client
 * @param {Object[]} candidates
 * @param {Array<Object|null>} infos the matching `becpg/project/task` payloads
 * @returns {Promise<Object>} nodeRef → `{name, code, type}` for what was resolved
 */
export async function attachDocumentEntities(client, candidates, infos) {
    const index = {};
    const list = Array.isArray(candidates) ? candidates : [];

    await mapWithConcurrency(list, ENRICH_CONCURRENCY, async (candidate, position) => {
        if (!candidate || candidate.entityNodeRef) {
            return;
        }
        const info = (infos || [])[position];
        const deliverables = Array.isArray(info && info.deliverables) ? info.deliverables : [];
        if (deliverables.length === 0) {
            return;
        }
        // A deliverable URL that names an entity is authoritative (invariant I1);
        // the walk is only for the tasks where there is none.
        if (deliverables.some((deliverable) => parseDeliverableUrl(deliverable && deliverable.url).entityNodeRef)) {
            return;
        }

        const documentNodeRef = pickTaskDocumentNodeRef(deliverables);
        if (!documentNodeRef) {
            return;
        }

        const entity = await resolveEntityFromDocument(client, documentNodeRef);
        if (entity && entity.nodeRef) {
            candidate.entityNodeRef = entity.nodeRef;
            index[entity.nodeRef] = { name: entity.name, code: entity.code, type: entity.type };
        }
    });

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
    // Un livrable de signature ne nomme pas le produit ; un autre livrable de la
    // même tâche (l'assistant) le fait. On prend le premier qui en désigne un.
    const fromDeliverables = deliverables.map((entry) => entry.entityNodeRef).find(Boolean) || null;
    const entityNodeRef = (primary && primary.entityNodeRef)
        || fromDeliverables
        || candidate.entityNodeRef
        || null;
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
 * @param {boolean} [options.enrich=true] read `becpg/project/task` per candidate and
 *        resolve the entity names. **The only reason to turn it off** is a caller that
 *        needs the *set* of my tasks and none of the deliverable-derived fields:
 *        enrichment is one upstream call per task, and the notification bell
 *        (`lib/adapters/notifications.js`) polls. With `false` the two sources, the
 *        merge, the `isOpen` / `isLate` rules and the pagination are byte-identical;
 *        what degrades is `deliverables` (empty), `type` (`review` for everything),
 *        `url` / `wizardId` (`null`) and `entity.name` (`null`).
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
        enrich = true,
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

    const infos = enrich
        ? await mapWithConcurrency(
            scanned,
            ENRICH_CONCURRENCY,
            (candidate) => fetchProjectTaskInfo(client, candidate.projectTaskNodeRef),
        )
        // `normalizeTask` already takes a null info — it is the shape an unreadable
        // task produces — so the un-enriched path is an existing code path, not a
        // new one.
        : scanned.map(() => null);

    // A signature task names no entity anywhere the supplier can read; climb from its
    // document to the product that owns it. Runs before the batch below so the nodeRefs
    // it discovers are part of the same resolution — and it hands back what it already
    // read, so those nodes are never queried twice.
    const walkedIndex = enrich ? await attachDocumentEntities(client, scanned, infos) : {};

    // The deliverable URL yields the entity's nodeRef, never its name. Resolve the names in
    // ONE batched query before normalising: without this the task list shows "Référencement"
    // with no product, and the supplier cannot tell which product a task is about — which
    // spec §4.3 requires ("nom, produit/client, type, priorité, échéance").
    // Measured on dev.becpg.fr: 8 tasks, every entity.name null before this.
    const resolvedIndex = {
        ...(enrich ? await resolveEntityIndex(client, collectEntityNodeRefs(scanned, infos)) : {}),
        // The walk read the entity itself, so its answer is a fact, not a search result:
        // it wins over the index, which lags a few seconds behind a node just created.
        ...walkedIndex,
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
    // Same walk as the list: a signature task carries its document and nothing else, so
    // the product is reached by containment. It mutates `candidate.entityNodeRef`, which
    // is why it runs before the nodeRefs are collected.
    const walkedIndex = await attachDocumentEntities(client, [candidate], [info]);

    const entityIndex = { ...(options.entityIndex || {}) };
    const unresolved = collectEntityNodeRefs([candidate], [info])
        .filter((ref) => !entityIndex[ref] && !walkedIndex[ref]);
    if (unresolved.length > 0) {
        Object.assign(entityIndex, await resolveEntityIndex(client, unresolved));
    }

    return normalizeTask(candidate, info, { ...walkedIndex, ...entityIndex });
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
