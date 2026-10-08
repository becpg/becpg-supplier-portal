/**
 * Supplier approval status — **derived on demand, never persisted** (spec §5.4.3).
 *
 * The decision that makes the whole project possible: the approval status is not
 * a property. It is deduced from data that already exists, so **no beCPG data
 * model evolves anywhere in this project**. The ERP connector calls `/approval`
 * instead of reading a field, which also removes any risk of the displayed
 * status and the exported status drifting apart.
 *
 * ## The design constraint that makes it hold at scale
 *
 * We never iterate over suppliers to compute a status each. Every condition is
 * expressed as **one db-afts query over the whole park**, and the supplier sets
 * are deduced from the results. "The suppliers to renew" is *one query*, not N
 * computations — which is also what makes the monitoring screens of spec §4.6
 * (sorting, filtering, counters) viable without denormalising anything.
 *
 * A whole-park evaluation therefore costs a **fixed** number of queries,
 * whatever the size of the park:
 *
 * | # | Query                          | Purpose                                  |
 * |---|--------------------------------|------------------------------------------|
 * | 1 | suppliers                      | the park itself                          |
 * | 2 | expired mandatory documents    | → Suspended                              |
 * | 3 | open blocking non-conformities | → Suspended                              |
 * | 4 | expiring mandatory documents   | → To renew                               |
 * | 5 | expected-not-provided documents| → In progress                            |
 * | 6 | open referencing projects      | → In progress                            |
 * | 7 | affected entities → suppliers  | maps the rows of 2/4/5 onto a supplier   |
 *
 * Queries 2, 4 and 5 fan out over `ANCESTOR:` chunks of the population; 3 and 6
 * cannot, since neither an NC nor a project is filed under its supplier, and run
 * once over `bcpg:suppliersAspect`. Query 7 fans out over `ID:` chunks and is
 * bounded by the number of entities that actually have a problem, not by the
 * size of the park.
 *
 * ## Rules (spec §5.4.3)
 *
 * | Status        | Condition                                                              |
 * |---------------|------------------------------------------------------------------------|
 * | `suspended`   | ≥ 1 mandatory document expired, or an open blocking NC                 |
 * | `toRenew`     | ≥ 1 mandatory document expiring within the notice period               |
 * | `inProgress`  | open referencing project, or mandatory document expected-not-provided, |
 * |               | or an unsatisfied blocking catalog                                     |
 * | `approved`    | none of the above                                                      |
 *
 * All of it is configurable through {@link DEFAULT_APPROVAL_CONFIG}: notice
 * period, precedence, NC vocabulary, project states, catalog rule.
 *
 * Server only — never import this from a client component.
 */

import {
    DEFAULT_DOCUMENT_CONFIG,
    ancestorClause,
    buildDocumentQuery,
    documentConfig,
    idClause,
    resolveScope,
    searchNodes,
    toAftsDate,
} from '@/lib/adapters/documents';
import { chunkAncestors } from '@/lib/adapters/notifications';
import { getJson, isNodeRef, nodeRefToPath } from '@/lib/becpg';
import { logDebug, logWarn } from '@/lib/http';

/* -------------------------------------------------------------------------- */
/* Statuses                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Machine values of the approval status. **These are part of the API contract**
 * (the ERP connector reads them): never rename one without updating the
 * consumers. The human label is never one of these values: it is resolved from
 * {@link APPROVAL_STATUS_MESSAGE_KEY}, or overridden per tenant through `labels`
 * of the configuration.
 */
export const APPROVAL_STATUS = {
    SUSPENDED: 'suspended',
    TO_RENEW: 'toRenew',
    IN_PROGRESS: 'inProgress',
    APPROVED: 'approved',
};

/**
 * Status to the portal message key that spells it out.
 *
 * The wording itself lives in `config/messages.js`, in both languages, and is
 * the same vocabulary `StatusPill` renders. Keeping a second French-only copy
 * next to the derivation rules is what made an English user read « Agréé ».
 * @readonly
 */
export const APPROVAL_STATUS_MESSAGE_KEY = Object.freeze({
    [APPROVAL_STATUS.SUSPENDED]: 'status.suspended',
    [APPROVAL_STATUS.TO_RENEW]: 'status.toRenew',
    [APPROVAL_STATUS.IN_PROGRESS]: 'status.inProgress',
    [APPROVAL_STATUS.APPROVED]: 'status.approved',
});

/* -------------------------------------------------------------------------- */
/* Configuration                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The derivation rules, entirely data-driven.
 *
 * `rules` is an ordered list, most severe first: the first rule whose `reasons`
 * are all satisfied for a supplier wins. Adding, removing or reordering a rule
 * changes the derivation without touching the evaluation code.
 */
export const DEFAULT_APPROVAL_CONFIG = {
    /**
     * Notice period, in days, before `cm:to` at which a mandatory document makes
     * its supplier "to renew". Defaults to the document adapter's own notice
     * period so both screens agree.
     */
    noticeDays: DEFAULT_DOCUMENT_CONFIG.noticeDays,

    /** Ordered derivation, most severe first. */
    rules: [
        { status: APPROVAL_STATUS.SUSPENDED, anyOf: ['documentExpired', 'blockingNc'] },
        { status: APPROVAL_STATUS.TO_RENEW, anyOf: ['documentExpiring'] },
        { status: APPROVAL_STATUS.IN_PROGRESS, anyOf: ['openProject', 'documentMissing', 'blockingCatalog'] },
        { status: APPROVAL_STATUS.APPROVED, anyOf: [] },
    ],

    /**
     * Tenant relabelling only, empty by default.
     *
     * A label set here wins over the portal vocabulary for every reader, in
     * every language, which is what a tenant asking for its own wording wants;
     * left empty, each screen translates the status itself.
     */
    labels: {},

    /**
     * The marker of a node that concerns a supplier (`PLMModel.ASPECT_SUPPLIERS`).
     *
     * Neither an NC nor a project is filed under its supplier, so an `ANCESTOR:`
     * clause can never find one; this indexed aspect is what narrows both to the
     * supplier ones, the same restriction `supplierScopeClause()` applies in
     * `lib/adapters/monitor.js`.
     */
    supplierAspect: 'bcpg:suppliersAspect',

    /** Non-conformities (`qa:nc`). */
    nc: {
        enabled: true,
        type: 'qa:nc',
        stateProp: 'qa:ncState',
        priorityProp: 'qa:ncPriority',
        /** States that are *not* open — everything else counts as open. */
        closedStates: ['closed'],
        /** `qa:ncPriority` values considered blocking (1 = highest). */
        blockingPriorities: [1],
        /** Association carrying the supplier(s) of an NC, when the client set it. */
        supplierAssoc: 'bcpg:suppliers',
    },

    /** Referencing projects (`pjt:project`). */
    project: {
        enabled: true,
        type: 'pjt:project',
        stateProp: 'pjt:projectState',
        /** States that keep a referencing "open". */
        openStates: ['Planned', 'InProgress', 'OnHold'],
        supplierAssoc: 'bcpg:suppliers',
    },

    /**
     * Blocking catalogs.
     *
     * `bcpg:entityScore` is stored with `index enabled="false"`, so the catalog
     * condition **cannot** be a db-afts query over the park. It is therefore
     * disabled by default and evaluated only when a single supplier is asked
     * for, by calling `becpg/entity/catalog/node/…` on that supplier's entities
     * — a bounded number of calls, never a park-wide loop.
     */
    catalogs: {
        enabled: false,
        /** Catalog ids that block; empty = every catalog returned by beCPG. */
        blockingIds: [],
        /** Score, in percent, below which a catalog is considered unsatisfied. */
        minScore: 100,
        /** Never call the catalog webscript for more entities than this. */
        maxEntities: 25,
    },

    /** TTL of the in-memory result cache, in ms. The park does not change by the second. */
    cacheTtlMs: 60000,
    /** Hard cap on the cache, so a large park cannot grow the heap without bound. */
    cacheMaxEntries: 500,
};

/**
 * Merges an override object onto {@link DEFAULT_APPROVAL_CONFIG}.
 *
 * @param {Object} [overrides] partial configuration
 * @returns {Object} the effective configuration
 */
export function approvalConfig(overrides) {
    if (!overrides) {
        return DEFAULT_APPROVAL_CONFIG;
    }
    return {
        ...DEFAULT_APPROVAL_CONFIG,
        ...overrides,
        rules: overrides.rules || DEFAULT_APPROVAL_CONFIG.rules,
        labels: { ...DEFAULT_APPROVAL_CONFIG.labels, ...(overrides.labels || {}) },
        nc: { ...DEFAULT_APPROVAL_CONFIG.nc, ...(overrides.nc || {}) },
        project: { ...DEFAULT_APPROVAL_CONFIG.project, ...(overrides.project || {}) },
        catalogs: { ...DEFAULT_APPROVAL_CONFIG.catalogs, ...(overrides.catalogs || {}) },
    };
}

/* -------------------------------------------------------------------------- */
/* Cache                                                                       */
/* -------------------------------------------------------------------------- */

/** `${tenant}|${user}|${supplierNodeRef}|${noticeDays}|${catalogs}` → `{ at, value }` */
const approvalCache = new Map();

/** Separator of the cache key; a nodeRef, a username and a number never contain it. */
const KEY_SEPARATOR = '|';

/**
 * The cache key of one supplier's status.
 *
 * The user is part of it because every condition query runs with the caller's
 * ticket: two buyers with different ACLs can see a different set of expired
 * documents for the same supplier, and one must never be served the other's
 * answer. The notice period and the catalog switch are part of it because they
 * change the derivation itself.
 *
 * @param {Object} session
 * @param {string} supplierRef
 * @param {Object} config the effective approval configuration
 * @returns {string}
 */
function cacheKey(session, supplierRef, config) {
    return [
        session?.tenantId || '',
        session?.username || session?.sub || '',
        supplierRef,
        config.noticeDays,
        config.catalogs.enabled ? 'catalogs' : '',
    ].join(KEY_SEPARATOR);
}

function cacheGet(session, supplierRef, config) {
    const key = cacheKey(session, supplierRef, config);
    const hit = approvalCache.get(key);
    if (!hit) {
        return null;
    }
    if (Date.now() - hit.at > config.cacheTtlMs) {
        approvalCache.delete(key);
        return null;
    }
    return hit.value;
}

function cacheSet(session, supplierRef, config, value) {
    if (approvalCache.size >= DEFAULT_APPROVAL_CONFIG.cacheMaxEntries) {
        // Cheap eviction: the map keeps insertion order, drop the oldest entry.
        const oldest = approvalCache.keys().next();
        if (!oldest.done) {
            approvalCache.delete(oldest.value);
        }
    }
    approvalCache.set(cacheKey(session, supplierRef, config), { at: Date.now(), value });
}

/**
 * Drops the cached approval of a supplier — **called on every document upload
 * and on every project closure**, the two events that can change a status
 * (spec §5.4.3, "invalidé sur dépôt de document ou clôture de projet").
 *
 * A document upload changes the status for every reader, so the eviction covers
 * every user of the tenant, not only the caller.
 *
 * @param {Object} session the portal session
 * @param {string|string[]} [supplierRef] supplier(s) to evict; all of the
 *   tenant's entries when omitted
 */
export function invalidateApproval(session, supplierRef) {
    const tenant = session?.tenantId || '';
    const wanted = supplierRef
        ? new Set(Array.isArray(supplierRef) ? supplierRef : [supplierRef])
        : null;
    for (const key of approvalCache.keys()) {
        const [keyTenant, , keySupplier] = key.split(KEY_SEPARATOR);
        if (keyTenant === tenant && (!wanted || wanted.has(keySupplier))) {
            approvalCache.delete(key);
        }
    }
}

/** Empties the whole cache. Exposed for tests and for administration actions. */
export function clearApprovalCache() {
    approvalCache.clear();
}

/* -------------------------------------------------------------------------- */
/* Query builders — one query per condition, over the park                     */
/* -------------------------------------------------------------------------- */

function aftsValue(value) {
    return String(value === undefined || value === null ? '' : value)
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');
}

function and(clauses) {
    return clauses.filter(Boolean).join(' AND ');
}

/**
 * The three document conditions, as db-afts queries.
 *
 * `ancestors` restricts them to those sub-trees. Callers must pass a **non-empty**
 * chunk (see {@link approvalScope}): `ancestorClause([])` is the empty string, so
 * an empty list does not mean "no restriction is needed", it silently produces an
 * instance-wide query — which is defect L2 and the reason this function is now
 * only ever called once per chunk.
 *
 * ```
 * expired  : TYPE:"cm:content" AND ASPECT:"bcpg:documentAspect"
 *            AND =bcpg:documentIsMandatory:"true" AND -=bcpg:documentState:"Simulation"
 *            AND cm:to:[MIN TO <now>]
 * expiring : … AND cm:to:[<now> TO <now + noticeDays>]
 * missing  : … AND =bcpg:documentIsMandatory:"true" AND =bcpg:documentState:"Simulation"
 * ```
 *
 * @param {Object} params `{ documents, ancestors, now, noticeDays }`
 * @returns {{expired: string, expiring: string, missing: string}}
 */
export function buildDocumentConditionQueries(params = {}) {
    const config = params.documents || DEFAULT_DOCUMENT_CONFIG;
    const now = params.now instanceof Date ? params.now : new Date(params.now || Date.now());
    const noticeDays = Number.isFinite(params.noticeDays)
        ? params.noticeDays
        : DEFAULT_APPROVAL_CONFIG.noticeDays;
    const notice = new Date(now.getTime() + noticeDays * 24 * 60 * 60 * 1000);
    const ancestors = params.ancestors || [];

    return {
        expired: buildDocumentQuery({
            config,
            ancestors,
            mandatoryOnly: true,
            provided: true,
            expiryRange: { from: 'MIN', to: toAftsDate(now) },
        }),
        expiring: buildDocumentQuery({
            config,
            ancestors,
            mandatoryOnly: true,
            provided: true,
            expiryRange: { from: toAftsDate(now), to: toAftsDate(notice) },
        }),
        missing: buildDocumentQuery({
            config,
            ancestors,
            mandatoryOnly: true,
            provided: false,
        }),
    };
}

/** `ASPECT:"<supplierAspect>"`, or '' when a tenant lifted the restriction. */
function supplierAspectClause(config) {
    return config.supplierAspect ? `ASPECT:"${aftsValue(config.supplierAspect)}"` : '';
}

/**
 * Open blocking supplier non-conformities, as one db-afts query.
 *
 * ```
 * TYPE:"qa:nc" AND ASPECT:"bcpg:suppliersAspect" AND -=qa:ncState:"closed"
 *   AND (=qa:ncPriority:"1")
 * ```
 *
 * No `ANCESTOR:` clause: an NC lives in the quality space, never under its
 * supplier, so scoping it on the supplier tree matches nothing at all and every
 * blocking NC would be silently ignored. The rows are attributed afterwards
 * through `bcpg:suppliers`, filtered on the evaluated population.
 *
 * @param {Object} config the approval configuration
 * @returns {string} the query, or '' when NCs are disabled
 */
export function buildNcQuery(config) {
    if (!config.nc.enabled) {
        return '';
    }
    const clauses = [`TYPE:"${config.nc.type}"`, supplierAspectClause(config)];
    for (const state of config.nc.closedStates) {
        clauses.push(`-=${config.nc.stateProp}:"${aftsValue(state)}"`);
    }
    const priorities = config.nc.blockingPriorities || [];
    if (priorities.length > 0) {
        clauses.push(`(${priorities
            .map((priority) => `=${config.nc.priorityProp}:"${aftsValue(priority)}"`)
            .join(' OR ')})`);
    }
    return and(clauses);
}

/**
 * Open supplier referencing projects, as one db-afts query.
 *
 * ```
 * TYPE:"pjt:project" AND ASPECT:"bcpg:suppliersAspect"
 *   AND (=pjt:projectState:"Planned" OR =pjt:projectState:"InProgress"
 *        OR =pjt:projectState:"OnHold")
 * ```
 *
 * No `ANCESTOR:` clause, for the reason given on {@link buildNcQuery}: a project
 * is filed in its project site, not under the supplier.
 *
 * @param {Object} config the approval configuration
 * @returns {string} the query, or '' when projects are disabled
 */
export function buildProjectQuery(config) {
    if (!config.project.enabled) {
        return '';
    }
    const states = config.project.openStates || [];
    const clauses = [`TYPE:"${config.project.type}"`, supplierAspectClause(config)];
    if (states.length > 0) {
        clauses.push(`(${states
            .map((state) => `=${config.project.stateProp}:"${aftsValue(state)}"`)
            .join(' OR ')})`);
    }
    return and(clauses);
}

/* -------------------------------------------------------------------------- */
/* Population scope                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The population, expressed as the `ANCESTOR:` chunks its condition queries run
 * on (defect L2).
 *
 * Same mechanism as `parkScope()` in `lib/adapters/monitor.js`, built on the
 * same `chunkAncestors()`, and with the same two rules:
 *
 *  1. **an empty population runs zero queries** — `chunks` is `[]` and the
 *     caller returns zero counts. It must never fall through to an unscoped
 *     query, which answers about the whole instance;
 *  2. **a large population fans out** rather than giving up on scoping.
 *
 * The fan-out ceiling is `maxScopeAncestors` chunks, i.e. `25 × 25 = 625`
 * suppliers — comfortably above the 250-row park scan that is this function's
 * only large caller. Beyond it `dropped > 0` and `complete` is false, and the
 * payload says so.
 *
 * @param {Array<{nodeRef: string}>} suppliers
 * @param {Object} [documents] document configuration (for `maxScopeAncestors`)
 * @returns {{refs: string[], chunks: string[][], dropped: number, complete: boolean}}
 */
export function approvalScope(suppliers, documents = DEFAULT_DOCUMENT_CONFIG) {
    const refs = [...new Set((suppliers || []).map((supplier) => supplier && supplier.nodeRef).filter(Boolean))];
    const { chunks, dropped } = chunkAncestors(refs, {
        ancestorsPerQuery: documents.maxScopeAncestors,
        maxQueries: documents.maxScopeAncestors,
    });
    return { refs, chunks, dropped, complete: dropped === 0 };
}

/**
 * Merges the rows of several result windows, each node once.
 *
 * @param {Array<{items: Object[]}>} results
 * @returns {Object[]}
 */
function mergeUnique(results) {
    const seen = new Set();
    const items = [];
    for (const result of results) {
        for (const node of result.items || []) {
            if (node.nodeRef) {
                if (seen.has(node.nodeRef)) {
                    continue;
                }
                seen.add(node.nodeRef);
            }
            items.push(node);
        }
    }
    return items;
}

/** Did beCPG stop this window before the end of the result set? */
function windowCut(result) {
    return result?.pagination?.hasMoreItems === true;
}

/**
 * Runs one `searchNodes()` per chunk query and merges the rows.
 *
 * Every chunk gets its **own** `maxResults` window: one window shared by the whole
 * instance is filled by whoever the engine returns first, and the rows this call
 * is about are the ones that fall out of it.
 *
 * `truncated` is true as soon as one window was cut: a status derived from a cut
 * window may miss the very row that would have made it worse.
 *
 * @param {string[]} queries one query per chunk (empty list ⇒ no call at all)
 * @param {Object} options forwarded to `searchNodes()`
 * @returns {Promise<{items: Object[], truncated: boolean}>}
 */
async function searchChunks(queries, options = {}) {
    const wanted = (queries || []).filter(Boolean);
    if (wanted.length === 0) {
        return { items: [], truncated: false };
    }
    const results = await Promise.all(wanted.map((query) => searchNodes(query, options)));
    return { items: mergeUnique(results), truncated: results.some(windowCut) };
}

/**
 * Identifiers one `ID:` disjunction may carry.
 *
 * Same ceiling as an `ANCESTOR:` disjunction, for the same reason: a few hundred
 * disjuncts make a URL past the 8 KB a stock Tomcat or a proxy accepts, and a
 * 414 costs the whole screen where a fan-out costs a few parallel round-trips.
 */
export const IDS_PER_QUERY = 25;

/** Default ceiling on the fan-out of {@link searchByIds}: 10 × 25 = 250 nodes. */
const MAX_ID_QUERIES = 10;

/**
 * Reads a set of nodes **by identifier**, `IDS_PER_QUERY` at a time, in parallel.
 *
 * ```
 * <build(…)> AND (ID:"<n1>" OR … OR ID:"<n25>")      × ceil(n / 25)
 * ```
 *
 * `unresolved` counts the identifiers the fan-out ceiling left out; `truncated`
 * is true when that count is not zero or a window was cut. A caller joining rows
 * on the result must report either as an incomplete join, never as "no match".
 *
 * @param {string[]} nodeRefs identifiers to read (duplicates ignored)
 * @param {Object} options
 * @param {Object} options.session portal session
 * @param {function(string): string} options.build turns the `ID:` disjunction of
 *   one chunk into the full query (it must add the `TYPE:` clause)
 * @param {string} [options.fields] forwarded to `searchNodes()`
 * @param {number} [options.maxQueries=10] fan-out ceiling
 * @returns {Promise<{items: Object[], queries: string[], truncated: boolean, unresolved: number}>}
 *
 * @example
 * await searchByIds(refs, { session, build: (ids) => `TYPE:"pjt:taskList" AND ${ids}` });
 */
export async function searchByIds(nodeRefs, options) {
    const { session, build, fields, maxQueries = MAX_ID_QUERIES } = options;
    const { chunks, dropped } = chunkAncestors(nodeRefs, {
        ancestorsPerQuery: IDS_PER_QUERY,
        maxQueries,
    });
    if (chunks.length === 0) {
        return { items: [], queries: [], truncated: false, unresolved: 0 };
    }
    const queries = chunks.map((chunk) => build(idClause(chunk)));
    const results = await Promise.all(queries.map((query, index) => searchNodes(query, {
        session,
        fields,
        maxResults: chunks[index].length,
    })));
    return {
        items: mergeUnique(results),
        queries,
        truncated: dropped > 0 || results.some(windowCut),
        unresolved: dropped,
    };
}

/* -------------------------------------------------------------------------- */
/* Evaluation                                                                  */
/* -------------------------------------------------------------------------- */

/** Reads `bcpg:suppliers` (or any assoc) out of an attributes block. */
function supplierRefsOf(attributes, assocName) {
    const value = attributes ? attributes[assocName] : null;
    if (!value) {
        return [];
    }
    const list = Array.isArray(value) ? value : [value];
    return list
        .map((node) => (node && node.id
            ? (isNodeRef(node.id) ? node.id : `workspace://SpacesStore/${node.id}`)
            : null))
        .filter(Boolean);
}

/**
 * Attributes a row (a document, an NC, a project) to one or more suppliers.
 *
 * Resolution order:
 *   1. the row's own supplier association, when it carries one;
 *   2. the supplier(s) of the entity the document belongs to
 *      (`bcpg:documentEntityRef` → `bcpg:suppliers`), resolved by query 7;
 *   3. the entity itself, when it *is* a `bcpg:supplier` (documents attached
 *      directly to the supplier);
 *   4. the single supplier in scope, when exactly one was asked for.
 */
function attributeToSuppliers(row, context) {
    const { entitySuppliers, supplierRefs, fallbackRef } = context;

    if (row.ownSuppliers && row.ownSuppliers.length > 0) {
        return row.ownSuppliers.filter((ref) => supplierRefs.has(ref));
    }
    if (row.entityRef) {
        if (supplierRefs.has(row.entityRef)) {
            return [row.entityRef];
        }
        const mapped = entitySuppliers.get(row.entityRef);
        if (mapped && mapped.length > 0) {
            const known = mapped.filter((ref) => supplierRefs.has(ref));
            if (known.length > 0) {
                return known;
            }
        }
    }
    return fallbackRef && supplierRefs.has(fallbackRef) ? [fallbackRef] : [];
}

/**
 * Applies `config.rules` to the reasons collected for one supplier.
 *
 * @param {Set<string>} reasons reason codes that hold for this supplier
 * @param {Object} config
 * @returns {string} the status
 */
export function deriveStatus(reasons, config = DEFAULT_APPROVAL_CONFIG) {
    for (const rule of config.rules) {
        if (!rule.anyOf || rule.anyOf.length === 0) {
            return rule.status;
        }
        if (rule.anyOf.some((reason) => reasons.has(reason))) {
            return rule.status;
        }
    }
    return APPROVAL_STATUS.APPROVED;
}

/**
 * Evaluates the approval status of a whole park — **the primary entry point**.
 *
 * `computeApproval(supplierRef)` is a thin wrapper on this: there is a single
 * evaluation path, so a supplier's status can never differ depending on which
 * screen asked for it.
 *
 * ## `population` — evaluating exactly the rows a caller already holds
 *
 * By default this function resolves its own population through `resolveScope()`,
 * i.e. one `TYPE:"bcpg:supplier"` window that beCPG clamps at
 * `beCPG.remote.maxResults.limit` (256 on a stock instance). A caller that has
 * *already* selected a population with a different ceiling — `/monitor`'s park
 * scan stops at `scanLimit`, 250 — then gets a status breakdown over a **different
 * set of suppliers than the rows it is about to display**, and the two ceilings
 * end up on screen next to each other as if they were counts. That is defect B5:
 * `park.total: 251` beside `park.approved: 256`.
 *
 * `population` closes that by construction: the caller hands in the very rows it
 * will render, no scope query runs, and `counts` is a partition of exactly those
 * rows. Two rules govern it, and they are the reason it is not simply
 * `params.supplier`:
 *
 *  - it is **not** caller-facing. `params.supplier` comes off a query string and
 *    must therefore be validated against the session's perimeter (`resolveScope()`
 *    raises `NotFoundError` for a nodeRef the session cannot read). A `population`
 *    is a set of rows that *came back from* an ACL-filtered db-afts search in this
 *    same request, so it is already inside the perimeter — re-validating it against
 *    a second, differently-clamped window is what would turn one row falling
 *    outside that window into a 404 for the whole page. No route handler passes it;
 *    only `lib/adapters/monitor.js` does;
 *  - an **empty** population means "the filtered park is empty", not "no
 *    restriction". It short-circuits to zero counts. Falling through would run the
 *    park-wide document, NC and project queries and hand back a non-empty breakdown
 *    for an empty park — the same class of contradiction this parameter exists to
 *    remove.
 *
 * @param {Object} params
 * @param {Object} params.session portal session
 * @param {Array<{nodeRef: string, name?: string, code?: string}>} [params.population]
 *   pre-resolved, already ACL-filtered suppliers to evaluate — see above. Wins over
 *   `supplier` / `supplierQuery`, which are then not read at all.
 * @param {string|string[]} [params.supplier] restrict to these supplier nodeRefs
 * @param {string} [params.supplierQuery] extra AFTS clause selecting the park
 *   (family, hierarchy, code…) — appended to `TYPE:"bcpg:supplier"`
 * @param {Object} [params.config] approval configuration override
 * @param {Object} [params.documents] document configuration override
 * @param {Date} [params.now] evaluation instant (tests)
 * @returns {Promise<Object>} `{ generatedAt, config, counts, suppliers, queries }`
 */
export async function computeApprovalForPark(params = {}) {
    const config = approvalConfig(params.config);
    const documents = documentConfig({
        ...(params.documents || {}),
        noticeDays: config.noticeDays,
    });
    const { session } = params;
    const now = params.now instanceof Date ? params.now : new Date();

    const given = Array.isArray(params.population) ? params.population : null;
    const suppliers = given || (await resolveScope(session, params.supplier, {
        config: documents,
        query: params.supplierQuery,
    })).suppliers;

    /*
     * The population, as the `ANCESTOR:` chunks its condition queries run on
     * (defect L2). What was here before had the shape
     *
     *   ancestors = length > 0 && length <= maxScopeAncestors ? refs : []
     *
     * and `ancestorClause([])` is the empty string, so **an empty population and
     * an oversized one produced the same query: an unscoped one**. For a status
     * that is derived from "does this supplier have an expired document?", an
     * unscoped query is not merely broader — it fills its single `maxResults`
     * window with rows of suppliers this call is not about, and the rows that
     * *were* about them fall out of the window. A supplier whose expired
     * certificate never made it into the window is then read as having none,
     * i.e. **published as approved**. Chunking gives every 25 suppliers their own
     * window, and an empty population runs no query at all.
     */
    const scope = approvalScope(suppliers, documents);

    if (scope.chunks.length === 0) {
        return {
            generatedAt: now.toISOString(),
            noticeDays: config.noticeDays,
            counts: {
                [APPROVAL_STATUS.SUSPENDED]: 0,
                [APPROVAL_STATUS.TO_RENEW]: 0,
                [APPROVAL_STATUS.IN_PROGRESS]: 0,
                [APPROVAL_STATUS.APPROVED]: 0,
            },
            suppliers: [],
            exact: true,
            scope: {
                suppliers: 0, chunks: 0, dropped: 0, complete: true, truncated: [],
            },
            queries: {
                documentExpired: null,
                documentExpiring: null,
                documentMissing: null,
                blockingNc: null,
                openProject: null,
                entitySuppliers: null,
            },
        };
    }

    const supplierRefs = new Set(suppliers.map((supplier) => supplier.nodeRef));
    const fallbackRef = suppliers.length === 1 ? suppliers[0].nodeRef : null;

    const conditionQueries = scope.chunks.map((ancestors) => buildDocumentConditionQueries({
        documents,
        ancestors,
        now,
        noticeDays: config.noticeDays,
    }));
    const documentQueries = {
        expired: conditionQueries.map((entry) => entry.expired),
        expiring: conditionQueries.map((entry) => entry.expiring),
        missing: conditionQueries.map((entry) => entry.missing),
    };
    // One query each, never per chunk: see `buildNcQuery()`.
    const ncQueries = [buildNcQuery(config)].filter(Boolean);
    const projectQueries = [buildProjectQuery(config)].filter(Boolean);

    const docFields = [
        documents.props.entityRef,
        documents.props.to,
        documents.props.typeRef,
        documents.props.mandatory,
        documents.props.state,
    ].join(',');

    // --- the population queries, one per chunk, all fired in parallel --------
    const [expired, expiring, missing, ncs, projects] = await Promise.all([
        searchChunks(documentQueries.expired, {
            session, fields: docFields, maxResults: documents.maxResults,
        }),
        searchChunks(documentQueries.expiring, {
            session, fields: docFields, maxResults: documents.maxResults,
        }),
        searchChunks(documentQueries.missing, {
            session, fields: docFields, maxResults: documents.maxResults,
        }),
        searchChunks(ncQueries, {
            session,
            fields: [config.nc.stateProp, config.nc.priorityProp, config.nc.supplierAssoc].join(','),
            maxResults: documents.maxResults,
        }),
        searchChunks(projectQueries, {
            session,
            fields: [config.project.stateProp, config.project.supplierAssoc].join(','),
            maxResults: documents.maxResults,
        }),
    ]);

    // --- query 7: map the affected entities onto their supplier(s) -----------
    const documentRows = [];
    const affectedEntities = new Set();
    const collect = (result, reason) => {
        for (const node of result.items) {
            const entity = node.attributes[documents.props.entityRef];
            const entityNode = Array.isArray(entity) ? entity[0] : entity;
            const entityRef = entityNode && entityNode.id
                ? (isNodeRef(entityNode.id) ? entityNode.id : `workspace://SpacesStore/${entityNode.id}`)
                : null;
            if (entityRef && !supplierRefs.has(entityRef)) {
                affectedEntities.add(entityRef);
            }
            documentRows.push({
                reason,
                nodeRef: node.nodeRef,
                name: node.name,
                entityRef,
                entityName: entityNode ? (entityNode['cm:name'] || entityNode['bcpg:charactName'] || '') : '',
                validTo: node.attributes[documents.props.to] || null,
                ownSuppliers: [],
            });
        }
    };
    collect(expired, 'documentExpired');
    collect(expiring, 'documentExpiring');
    collect(missing, 'documentMissing');

    const entitySuppliers = new Map();
    const resolved = await searchByIds([...affectedEntities], {
        session,
        build: (ids) => and([`TYPE:"${documents.entityType}"`, ids]),
        fields: documents.props.suppliers,
        // Bounded by the scanned document rows, never by the park: every entity
        // they name is resolved, however many chunks that takes.
        maxQueries: Math.ceil(affectedEntities.size / IDS_PER_QUERY),
    });
    for (const node of resolved.items) {
        entitySuppliers.set(
            node.nodeRef,
            supplierRefsOf(node.attributes, documents.props.suppliers),
        );
    }

    // Which windows beCPG cut. A cut window may hide the very row that makes a
    // supplier worse, so a status computed from it is a best case, not a fact.
    const truncatedConditions = Object.entries({
        documentExpired: expired.truncated,
        documentExpiring: expiring.truncated,
        documentMissing: missing.truncated,
        blockingNc: ncs.truncated,
        openProject: projects.truncated,
        entitySuppliers: resolved.truncated,
    }).filter(([, cut]) => cut).map(([name]) => name);
    if (truncatedConditions.length > 0) {
        logWarn('approval.truncated', { conditions: truncatedConditions, suppliers: scope.refs.length });
    }

    // --- fold everything into per-supplier reasons ---------------------------
    const context = { entitySuppliers, supplierRefs, fallbackRef };
    const state = new Map();
    for (const supplier of suppliers) {
        state.set(supplier.nodeRef, {
            supplier,
            reasons: new Set(),
            details: {
                documentExpired: [],
                documentExpiring: [],
                documentMissing: [],
                blockingNc: [],
                openProject: [],
                blockingCatalog: [],
            },
        });
    }

    for (const row of documentRows) {
        for (const ref of attributeToSuppliers(row, context)) {
            const entry = state.get(ref);
            if (!entry) {
                continue;
            }
            entry.reasons.add(row.reason);
            entry.details[row.reason].push({
                nodeRef: row.nodeRef,
                name: row.name,
                entity: row.entityRef ? { nodeRef: row.entityRef, name: row.entityName } : null,
                validTo: row.validTo,
            });
        }
    }

    // NCs and projects come from an instance-wide query: only their own
    // `bcpg:suppliers` can attribute them. The single-supplier fallback of the
    // document rows would pin every unassigned NC of the instance on that supplier.
    for (const node of ncs.items) {
        const targets = supplierRefsOf(node.attributes, config.nc.supplierAssoc)
            .filter((ref) => supplierRefs.has(ref));
        for (const ref of targets) {
            const entry = state.get(ref);
            if (!entry) {
                continue;
            }
            entry.reasons.add('blockingNc');
            entry.details.blockingNc.push({
                nodeRef: node.nodeRef,
                name: node.name,
                state: node.attributes[config.nc.stateProp] || null,
                priority: node.attributes[config.nc.priorityProp] ?? null,
            });
        }
    }

    for (const node of projects.items) {
        const targets = supplierRefsOf(node.attributes, config.project.supplierAssoc)
            .filter((ref) => supplierRefs.has(ref));
        for (const ref of targets) {
            const entry = state.get(ref);
            if (!entry) {
                continue;
            }
            entry.reasons.add('openProject');
            entry.details.openProject.push({
                nodeRef: node.nodeRef,
                name: node.name,
                state: node.attributes[config.project.stateProp] || null,
            });
        }
    }

    // --- the catalog condition, when it is enabled and bounded ---------------
    if (config.catalogs.enabled && suppliers.length === 1) {
        try {
            const blocking = await evaluateBlockingCatalogs({
                session,
                supplier: suppliers[0],
                config,
                documents,
                // One supplier means exactly one chunk of one ancestor.
                ancestors: scope.refs,
            });
            if (blocking.length > 0) {
                const entry = state.get(suppliers[0].nodeRef);
                entry.reasons.add('blockingCatalog');
                entry.details.blockingCatalog = blocking;
            }
        }
        catch (error) {
            // A catalog that cannot be read must never turn into a wrong status:
            // the condition is simply not asserted, and the fact is logged.
            logWarn('approval.catalogUnavailable', { message: error.message });
        }
    }

    const counts = {
        [APPROVAL_STATUS.SUSPENDED]: 0,
        [APPROVAL_STATUS.TO_RENEW]: 0,
        [APPROVAL_STATUS.IN_PROGRESS]: 0,
        [APPROVAL_STATUS.APPROVED]: 0,
    };

    const results = [...state.values()].map((entry) => {
        const status = deriveStatus(entry.reasons, config);
        counts[status] = (counts[status] || 0) + 1;
        return {
            nodeRef: entry.supplier.nodeRef,
            name: entry.supplier.name,
            code: entry.supplier.code,
            status,
            statusLabel: config.labels[status] || null,
            reasons: [...entry.reasons],
            details: entry.details,
            metrics: {
                documentsExpired: entry.details.documentExpired.length,
                documentsExpiring: entry.details.documentExpiring.length,
                documentsMissing: entry.details.documentMissing.length,
                openNc: entry.details.blockingNc.length,
                openProjects: entry.details.openProject.length,
            },
            generatedAt: now.toISOString(),
        };
    });

    // Riskiest first — that is the order the monitoring list wants.
    const severity = new Map(config.rules.map((rule, index) => [rule.status, index]));
    results.sort((a, b) => {
        const bySeverity = (severity.get(a.status) ?? 99) - (severity.get(b.status) ?? 99);
        return bySeverity !== 0 ? bySeverity : String(a.name).localeCompare(String(b.name));
    });

    logDebug('approval.park', {
        suppliers: results.length,
        scoped: scope.refs.length,
        chunks: scope.chunks.length,
        dropped: scope.dropped,
        entitiesResolved: affectedEntities.size,
        truncated: truncatedConditions,
    });
    const exact = scope.complete && truncatedConditions.length === 0;

    const payload = {
        generatedAt: now.toISOString(),
        noticeDays: config.noticeDays,
        counts,
        suppliers: results,
        /**
         * False when a status may be better than the truth: the fan-out ceiling
         * cut the population, or beCPG cut one of the condition windows. A caller
         * publishing a breakdown must then not present it as a fact.
         */
        exact,
        /**
         * The population these conditions were evaluated over, as chunks — see
         * {@link approvalScope}. `complete: false` means some supplier may have
         * been evaluated against an incomplete set of rows; `truncated` names the
         * conditions whose window beCPG cut.
         */
        scope: {
            suppliers: scope.refs.length,
            chunks: scope.chunks.length,
            dropped: scope.dropped,
            complete: exact,
            truncated: truncatedConditions,
        },
        queries: {
            documentExpired: documentQueries.expired,
            documentExpiring: documentQueries.expiring,
            documentMissing: documentQueries.missing,
            blockingNc: ncQueries.length > 0 ? ncQueries : null,
            openProject: projectQueries.length > 0 ? projectQueries : null,
            entitySuppliers: resolved.queries.length > 0 ? resolved.queries : null,
        },
    };

    for (const result of results) {
        cacheSet(session, result.nodeRef, config, { ...result, exact });
    }

    return payload;
}

/**
 * Evaluates the approval status of **one** supplier.
 *
 * Short-TTL cached, keyed by tenant + user + supplier + derivation knobs, and
 * invalidated by {@link invalidateApproval} on document upload (spec §5.4.3).
 *
 * The perimeter is checked **before** the cache is read: a cached status is a
 * statement about a supplier, and handing it to a caller who may not read that
 * supplier is the leak `resolveScope()` exists to prevent.
 *
 * @param {string} supplierRef supplier nodeRef
 * @param {Object} params `{ session, config, documents, now, refresh }`
 * @returns {Promise<Object>} the supplier entry of {@link computeApprovalForPark},
 *   plus `exact` and `cached`
 * @throws {NotFoundError} when the supplier is outside the caller's perimeter
 */
export async function computeApproval(supplierRef, params = {}) {
    const config = approvalConfig(params.config);
    const { session } = params;

    await resolveScope(session, supplierRef, { config: documentConfig(params.documents) });

    if (!params.refresh) {
        const cached = cacheGet(session, supplierRef, config);
        if (cached) {
            return { ...cached, cached: true };
        }
    }

    const park = await computeApprovalForPark({ ...params, config, supplier: supplierRef });
    const found = park.suppliers.find((entry) => entry.nodeRef === supplierRef);
    if (found) {
        return { ...found, exact: park.exact, queries: park.queries, cached: false };
    }
    return {
        nodeRef: supplierRef,
        status: APPROVAL_STATUS.APPROVED,
        statusLabel: config.labels[APPROVAL_STATUS.APPROVED] || null,
        reasons: [],
        details: {},
        metrics: {},
        exact: park.exact,
        generatedAt: park.generatedAt,
        cached: false,
    };
}

/* -------------------------------------------------------------------------- */
/* Blocking catalogs (bounded, per supplier)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Reads the applicable catalogs of the supplier's entities and returns the
 * blocking ones that are not satisfied.
 *
 * `bcpg:entityScore` is not indexed, so this **cannot** be a park query — hence
 * the strict bounds: one supplier at a time, at most `catalogs.maxEntities`
 * entities.
 *
 * @param {Object} params `{ session, supplier, config, documents, ancestors }`
 * @returns {Promise<Object[]>} unsatisfied blocking catalogs
 */
async function evaluateBlockingCatalogs(params) {
    const { session, supplier, config, documents } = params;

    const entities = await searchNodes(
        and([`TYPE:"${documents.entityType}"`, ancestorClause([supplier.nodeRef])]),
        // Same reason as elsewhere: `fields=cm:name` asks for data the row already
        // carries and costs 4x on the wire (measured on dev, 200 rows: 0.22 s vs
        // 0.92 s).
        { session, maxResults: config.catalogs.maxEntities },
    );

    const blocking = [];
    for (const entity of entities.items.slice(0, config.catalogs.maxEntities)) {
        const payload = await getJson(
            `becpg/entity/catalog/node/${nodeRefToPath(entity.nodeRef)}`,
            { session },
        );
        const catalogs = (payload && payload.catalogs) || [];
        for (const catalog of catalogs) {
            const isBlocking = config.catalogs.blockingIds.length === 0
                || config.catalogs.blockingIds.includes(catalog.id);
            const score = Number(catalog.score);
            if (isBlocking && Number.isFinite(score) && score < config.catalogs.minScore) {
                blocking.push({
                    entity: { nodeRef: entity.nodeRef, name: entity.name },
                    catalogId: catalog.id,
                    label: catalog.displayName || catalog.label || catalog.id,
                    score,
                    missingFields: catalog.missingFields || [],
                });
            }
        }
    }
    return blocking;
}
