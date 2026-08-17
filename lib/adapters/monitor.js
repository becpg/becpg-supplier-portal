/**
 * Domain adapter — **the supplier monitoring space** (spec §4.6, screens
 * `/monitor`, `/monitor/suppliers`, `/monitor/documents`, `/monitor/campaigns`,
 * `/monitor/quality`).
 *
 * ## Why this module exists
 *
 * Tracklab and Specright sell the *client* dashboard first (spec §2.2, §2.3).
 * beCPG holds every piece of that data and restitutes none of it: today a
 * quality officer opens project after project in Share to know the state of the
 * supplier park. This adapter is the restitution layer. It adds **no data, no
 * property and no engine** — everything below is a read over what beCPG already
 * materialises.
 *
 * ## Access control — enforced here, not only in the route
 *
 * The monitoring space is for internal users (Quality, Purchasing, Referencing,
 * R&D). {@link requireMonitorAccess} is the single gate and **every exported
 * function calls it**: a route that forgot the check still answers 403, and a
 * future server component that imports the adapter directly is covered too.
 *
 * Two independent conditions (spec §4.2, §4.6.7):
 *
 *   1. the session must hold one of `MONITOR_GROUPS` (`capabilities.canMonitor`
 *      of `lib/adapters/session.js`);
 *   2. an `ExternalUser` is refused **even if** it also holds a monitoring group
 *      — a supplier account must never read the park of its competitors.
 *
 * Beyond that gate, nothing runs as system: every query is issued with the
 * caller's own ticket, so Alfresco's ACLs keep filtering the results and a buyer
 * only ever sees their own perimeter. The park itself is resolved by
 * `resolveSupplierScope()` (one ACL-filtered db-afts query), which is the same
 * function the supplier space uses — one code path, two audiences.
 *
 * ## Data source (spec §4.6.6) — db-afts first
 *
 * Everything here is `becpg/remote/entity/list?query=…`, i.e.
 * `BeCPGQueryBuilder…inDBIfPossible()`: AFTS syntax, transactional when the
 * predicate is DB-supported, index otherwise, ACL and tenant inherited from
 * beCPG. No cube, no ETL, no denormalisation.
 *
 * ### The supplier restriction — `bcpg:suppliersAspect`
 *
 * Two of the families read here are **not** supplier entities: `pjt:project`
 * (campaigns) and `qa:nc` (quality). Read by type alone they cover the whole
 * instance — every R&D project, every production non-conformity. Both are
 * therefore restricted by {@link supplierScopeClause} to the nodes carrying
 * `bcpg:suppliersAspect` (`PLMModel.ASPECT_SUPPLIERS`):
 *
 * ```
 * campaigns : TYPE:"pjt:project" AND ASPECT:"bcpg:suppliersAspect" AND (state clauses…)
 * quality   : TYPE:"qa:nc"       AND ASPECT:"bcpg:suppliersAspect" AND (open clauses…)
 * ```
 *
 * The clause lives **in the query**, so `/monitor/campaigns`, `/monitor/quality`
 * and the `/monitor/overview` counters share one restriction and the counts stay
 * exact. Every payload echoes it as `supplierScope`.
 *
 * ### Counting without fetching
 *
 * `becpg/remote/entity/list` answers
 * `{ entities: [...], pagination: { count, totalItems, hasMoreItems } }`. A
 * **counter is therefore one query that returns one row** ({@link countNodes}),
 * never a page scanned and counted in JavaScript.
 *
 * Two upstream facts shape the whole module and are exposed rather than hidden:
 *
 *   - **`beCPG.remote.maxResults.limit` (default 256)** clamps `maxResults` on
 *     any call that asks for `fields` or `lists`. A *listing* is therefore
 *     capped at {@link DEFAULT_MONITOR_CONFIG.scanLimit} rows per query.
 *   - **`totalItems` is not a total.** On the db-afts path it is `count + 1`
 *     whenever `hasMoreItems` is true — a sentinel, not a count (see
 *     `readListTotal()` in `lib/adapters/tasks.js` for the measurements).
 *     {@link countNodes} recognises it, widens the query once up to `scanLimit`,
 *     and past that answers with a **proven floor** and `exact: false`. A counter
 *     is never silently wrong, and never publishes `maxResults + 1` as a park size.
 *
 * Wherever a listing is truncated the payload carries `truncated: true`; wherever
 * a total is not a fact it carries `totalItems: null` with `totalAtLeast`, so the
 * UI says "at least 250" instead of lying.
 *
 * ### One population per screen (defect B5)
 *
 * The two ceilings above are *different numbers on the same query* — 250 for a
 * listing this module runs, 256 for one beCPG clamps — and a screen that shows a
 * figure derived from each contradicts itself. `/monitor/overview` did: `park.total:
 * 251` beside `park.approved: 256`, more approved suppliers than suppliers.
 *
 * The rule that replaces it: **a screen resolves its park once and every derived
 * figure is a fold over those rows.** `scanPark()` produces the population,
 * `computeApprovalForPark({ population })` is handed it verbatim instead of
 * re-selecting it, and the status breakdown is computed by walking it. A bucket can
 * then never exceed the park it is drawn from, and `/monitor/overview` and
 * `/monitor/suppliers` cannot disagree about how many suppliers are approved,
 * because they now count the same rows.
 *
 * The one figure that stays outside that fold is `park.total`, the size of the
 * *whole* filtered park: it is a floor when the scan did not reach the end.
 * `breakdownScope` says whether it is also the breakdown's denominator, and the UI
 * prints the population it partitions, never the park, when the two differ.
 *
 * ### One population per *counter* too (defect L2)
 *
 * The same rule reaches the sub-queries through {@link parkScope}. A park-scoped
 * counter never runs unscoped: an empty park runs **zero queries**, and a park
 * larger than one `ANCESTOR:` disjunction fans out over as many as it needs. What
 * that replaced was a threshold — "≤ 25 suppliers, scope; otherwise none" — under
 * which the counter silently changed population. Measured on the reference instance, one
 * account, one instant: 22 mandatory documents scoped against 35 unscoped, 0 late
 * tasks against 15, 0 open NCs against 5 — all reported `exact: true`.
 *
 * Three families are **not** park-scopable at all, because they are not filed
 * under a supplier: `pjt:project`, `pjt:taskList` and `qa:nc`. They keep the
 * `bcpg:suppliersAspect` restriction that *is* meaningful for them and their
 * payload block says `parkScoped: false`, rather than being handed an `ANCESTOR:`
 * clause that would turn every one of them into a structural zero.
 *
 * ### Historical series — degraded on purpose (spec §4.6.6)
 *
 * Evolution over time, multi-supplier comparison and heavy aggregates need the
 * OLAP cube (`becpg-olap`). The portal **degrades cleanly**: it returns the
 * current values with `historyAvailable: false` and {@link OLAP_REQUIREMENTS}
 * rather than failing. Where each axis stands:
 *
 * | Kind      | Name                | State                                        |
 * |-----------|---------------------|----------------------------------------------|
 * | dimension | supplier            | in the cube — `suppliersDimension`           |
 * | dimension | approval status     | in the cube — `bcpg:supplierState`           |
 * | dimension | subsidiary          | in the cube — `bcpg:supplierHierarchy1/2`    |
 * | dimension | document type       | **not in the cube**, db-afts only            |
 * | measure   | refusal rate        | in the cube — `projectsSteps.refusalRate`    |
 * | measure   | response delay      | in the cube — `projectsSteps.avgResponseDelay` |
 * | measure   | completion          | in the cube — `projects.averageProgress`     |
 * | measure   | expiring documents  | **not in the cube**, db-afts only            |
 *
 * The two documentary rows are a decision, not a backlog item: the OLAP
 * connector does not extract documents at all. See {@link OLAP_REQUIREMENTS}.
 *
 * ## Query cost, per endpoint
 *
 * "q" = one upstream `becpg/remote/entity/list` call. All costs are **fixed**:
 * none of them grows with the size of the park.
 *
 * | Endpoint                  | Cost                                             |
 * |---------------------------|--------------------------------------------------|
 * | `/monitor/overview`       | 1 park + 6 approval + 4 compliance + 3 expiry + 1 campaigns + 1 late tasks + 2 NC ≈ **18 q** |
 * | `/monitor/suppliers`      | 1 park + 6 approval + 1 campaigns ≈ **8 q**      |
 * | `/monitor/suppliers/{id}` | 1 guard + 7 approval (cached) + 6 detail + 1 forum ≈ **15 q** |
 * | `/monitor/documents`      | 1 park + 1 document scan + 1 entity join ≈ **3 q** |
 * | `/monitor/campaigns`      | 1 campaign scan + 1 task read (+ 1 park when filtered) ≈ **2–3 q** |
 * | `/monitor/quality`        | 4 NC counts + 1 project scan + 1 task read (+ 1 park) ≈ **6–7 q** |
 * | `/monitor/actions`        | 1 guard query + 1 write per target                |
 *
 * A counter that hits the DB path of `inDBIfPossible()` costs one extra query
 * (the single widening of {@link countNodes}); the ceilings above are therefore
 * upper bounds on the SOLR path and at most doubled counters on the DB path.
 *
 * Results are memoised per tenant + user + endpoint + filters for
 * {@link DEFAULT_MONITOR_CONFIG.cacheTtlMs} (30 s by default): the park does not
 * change by the second, and a monitoring screen fires several widgets at once.
 * The park scan has a memo **of its own** (`park|<filters>`) on top of that, so the
 * "1 park" line of the table above is paid once per filter set and not once per
 * endpoint — and, more importantly, so the endpoints of one page load share a single
 * population rather than each sampling its own window of the same query.
 *
 * The **open-campaign scan** has the same treatment (`campaignScan|<states>`), for the
 * same two reasons and one more: three screens score `campaignNoAnswer` off those rows
 * and must score it off the *same* rows (see {@link scanOpenCampaigns}). It is the
 * expensive one — 248 projects with their associations, measured at ≈ 7 s on
 * the reference instance — so `/monitor/suppliers` visited cold and alone pays it (9 s against
 * 2,5 s before), while a visit that starts at `/monitor` pays it once for both.
 *
 * Server only — never import this from a client component.
 */

import {
    APPROVAL_STATUS,
    computeApproval,
    computeApprovalForPark,
    invalidateApproval,
} from '@/lib/adapters/approval';
import {
    ancestorClause,
    buildDocumentQuery,
    documentConfig,
    idClause,
    listDocuments,
    searchNodes,
    summarizeDocuments,
    toAftsDate,
    toDocument,
} from '@/lib/adapters/documents';
import { dedupeCatalogs } from '@/lib/adapters/entities';
import { chunkAncestors } from '@/lib/adapters/notifications';
import {
    monitorGroups,
    createBecpgClient,
    getMyGroups,
    isSupplierAccount,
} from '@/lib/adapters/session';
import { readListTotal } from '@/lib/adapters/tasks';
import { becpgJson, isNodeRef, nodeRefToPath } from '@/lib/becpg';
import { isMachineValue, nodeLabel } from '@/lib/format';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { logDebug, logWarn } from '@/lib/http';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/* -------------------------------------------------------------------------- */
/* Configuration                                                               */
/* -------------------------------------------------------------------------- */

/**
 * What the OLAP cube exposes for the historical views of spec §4.6.6, and what
 * it does not. Echoed in every payload that had to degrade, so the state of the
 * cube is documented **in the API**, not only in a comment.
 *
 * `status` is per axis, because they no longer share a fate:
 *
 * - `available` — delivered in `olapSchema_4_0.get.xml.ftl`. The shared
 *   `suppliersDimension` is now used by the `projects` and `projectsSteps` cubes,
 *   which brings the supplier, its state and its subsidiary hierarchy at once;
 *   the refusal rate and the response delay are measures of `projectsSteps`.
 * - `unsupported` — **the documents axis, and it is a decision, not a gap.** The
 *   OLAP connector builds its tables from declared entities, datalists and
 *   associations; a supplier document is none of the three, and `cm:contains`
 *   only serialises the folders. Extracting `cm:content` in the publication
 *   channel would be the way in — `bcpg:documentEntityRef` even carries the join
 *   key back to the product — but that is not arbitrated, so the documentary
 *   views stay on db-afts and no caller should wait for a cube that is not
 *   coming.
 * @readonly
 */
export const OLAP_REQUIREMENTS = Object.freeze({
    dimensions: Object.freeze([
        Object.freeze({ id: 'supplier', source: 'assoc_bcpg_suppliers → bcpg:supplier', status: 'available', note: 'suppliersDimension, used by projects and projectsSteps' }),
        Object.freeze({ id: 'approvalStatus', source: 'bcpg:supplierState (suppliersDimension level "state")', status: 'available' }),
        Object.freeze({ id: 'subsidiary', source: 'bcpg:supplierHierarchy1/2 (suppliersDimension)', status: 'available' }),
        Object.freeze({ id: 'documentType', source: 'bcpg:documentTypeRef → bcpg:documentType', status: 'unsupported', note: 'documents are not extracted by becpg-olap-connector' }),
    ]),
    measures: Object.freeze([
        Object.freeze({ id: 'refusalRate', source: 'projectsSteps.refusalRate — refused / answered tasks', status: 'available' }),
        Object.freeze({ id: 'responseDelay', source: 'projectsSteps.avgResponseDelay — DATEDIFF(pjt:tlEnd, pjt:tlTargetEnd)', status: 'available' }),
        Object.freeze({ id: 'completion', source: 'projects.averageProgress — pjt:completionPercent', status: 'available' }),
        Object.freeze({ id: 'expiringDocuments', source: 'cm:to bucketed at 30/60/90 days', status: 'unsupported', note: 'served by db-afts only' }),
    ]),
});

/**
 * Everything the monitoring queries depend on. **No property name is hard-coded
 * below**: a tenant overrides this object and the queries follow, which is the
 * same contract as `DEFAULT_DOCUMENT_CONFIG` and `DEFAULT_APPROVAL_CONFIG`.
 */
export const DEFAULT_MONITOR_CONFIG = {
    /** Supplier entity type — the park. */
    supplierType: 'bcpg:supplier',

    /**
     * **The marker that makes a node "concern a supplier"** —
     * `PLMModel.ASPECT_SUPPLIERS`.
     *
     * The monitoring space watches the *supplier* park, so a project or a
     * non-conformity must be restricted to the ones that carry this aspect.
     * Without it, `/monitor/campaigns` lists every `pjt:project` of the instance
     * (R&D, industrialisation, audits…) and `/monitor/quality` every `qa:nc`,
     * including the ones that have nothing to do with a supplier.
     *
     * Why this aspect and not an association:
     *
     *   - `SupplierPortalInitRepoVisitor` adds it to the supplier referencing
     *     **project templates** (`pjtTpl.getAspects().add(PLMModel.ASPECT_SUPPLIERS)`),
     *     and an instance created from a template inherits its aspects — so every
     *     supplier campaign carries it, whether or not `bcpg:suppliers` is filled
     *     in yet (a campaign that has just been created and not yet assigned
     *     still is a supplier campaign);
     *   - `qa:nc` extends `bcpg:entityV2` and declares **no supplier association
     *     of its own**; the supplier link comes from this very aspect and its
     *     `bcpg:suppliers` association.
     *
     * Alfresco indexes aspects (`ASPECT:"…"`), so the restriction is **pushed
     * into the db-afts query** and the counters stay exact — it is not a
     * post-filter on the scanned window, which would have silently capped every
     * figure at `scanLimit`.
     *
     * Set to `null` in a tenant override to lift the restriction.
     */
    supplierAspect: 'bcpg:suppliersAspect',

    /**
     * Park filters of spec §4.6.1 (family, site, buyer, market), declared rather
     * than coded.
     *
     * `mode` says how a filter can physically be applied:
     *
     *   - `query`      → an indexed property, pushed into the db-afts query
     *                    (one query for the whole park, the §5.4.3 rule);
     *   - `assoc`      → an **association**. Alfresco cannot search associations,
     *                    so the value is read back on the rows we already fetch
     *                    and applied as a post-filter on the scanned window. The
     *                    payload reports `mode: 'assoc'` so the UI knows the
     *                    filter is window-scoped;
     *   - `unset`      → no standard beCPG property carries this notion. The
     *                    filter is **reported as unsupported**, never silently
     *                    dropped. Point it at a client property to enable it.
     *
     * `market` is `unset` on purpose: beCPG has no market property in the
     * standard model. A tenant that models it (a hierarchy, a `d:text`, a list)
     * enables the filter by naming the property here.
     */
    filters: {
        family: { mode: 'query', prop: 'bcpg:supplierHierarchy1', kind: 'noderef' },
        subFamily: { mode: 'query', prop: 'bcpg:supplierHierarchy2', kind: 'noderef' },
        state: { mode: 'query', prop: 'bcpg:supplierState', kind: 'text' },
        buyer: { mode: 'query', prop: 'cm:owner', kind: 'text' },
        site: { mode: 'assoc', assoc: 'bcpg:plants' },
        subsidiary: { mode: 'assoc', assoc: 'bcpg:subsidiaryRef' },
        market: { mode: 'unset', prop: null },
    },

    /** Free-text search, applied on these indexed properties. */
    searchProps: ['cm:name', 'bcpg:code', 'bcpg:legalName', 'bcpg:erpCode'],

    /** Fields read on a supplier row of the monitoring list. */
    supplierFields: [
        'cm:name',
        'cm:modified',
        'cm:created',
        'cm:owner',
        'bcpg:code',
        'bcpg:erpCode',
        'bcpg:legalName',
        'bcpg:supplierState',
        'bcpg:supplierHierarchy1',
        'bcpg:supplierHierarchy2',
        'bcpg:supplierEmail',
        // Not indexed, but readable as a field: the catalog completion scores.
        'bcpg:entityScore',
        'bcpg:plants',
        'bcpg:subsidiaryRef',
        'bcpg:parentEntityRef',
    ],

    /** Referencing / renewal campaigns (`pjt:project`). */
    project: {
        type: 'pjt:project',
        stateProp: 'pjt:projectState',
        completionProp: 'pjt:completionPercent',
        dueProp: 'pjt:projectDueDate',
        startProp: 'pjt:projectStartDate',
        priorityProp: 'pjt:projectPriority',
        managerAssoc: 'pjt:projectManager',
        entityAssoc: 'pjt:projectEntity',
        supplierAssoc: 'bcpg:suppliers',
        /**
         * The open tasks of the project. **This is the only reliable way to
         * attribute a task to its project from a list query**: the remote
         * visitor emits `path` / `parentId` for `ENTITY`, `CONTENT` and assoc
         * nodes but **not** for the rows of `becpg/remote/entity/list`
         * (`JsonEntityVisitor.visitNode`, `JsonVisitNodeType.ENTITY_LIST`), so a
         * task row carries no pointer back to its project. Reading the
         * association on the project side inverts the problem and costs nothing.
         */
        currentTasksAssoc: 'pjt:projectCurrentTasks',
        /** States that keep a campaign open. */
        openStates: ['Planned', 'InProgress', 'OnHold'],
        /** States that close it. */
        closedStates: ['Completed', 'Cancelled'],
    },

    /** Supplier tasks (`pjt:taskList`). */
    task: {
        type: 'pjt:taskList',
        stateProp: 'pjt:tlState',
        dueProp: 'pjt:tlDue',
        startProp: 'pjt:tlStart',
        endProp: 'pjt:tlEnd',
        nameProp: 'pjt:tlTaskName',
        resourcesAssoc: 'pjt:tlResources',
        openStates: ['Planned', 'InProgress', 'Refused'],
        doneStates: ['Completed'],
    },

    /** Non-conformities (`qa:nc`) — spec §4.6.5 quality view. */
    nc: {
        type: 'qa:nc',
        stateProp: 'qa:ncState',
        typeProp: 'qa:ncType',
        priorityProp: 'qa:ncPriority',
        costProp: 'qa:ncCost',
        commentProp: 'qa:ncComment',
        supplierAssoc: 'bcpg:suppliers',
        /** `qa:ncStates` values that mean "no longer open". */
        closedStates: ['closed'],
        /** `qa:ncPriority` values that block an approval (1 = highest). */
        blockingPriorities: [1],
        /** Beyond this many days open, an NC is reported as overdue. */
        overdueAfterDays: 30,
    },

    /** Scorecards (`pjt:scoreList`, spec §4.6.4). */
    score: {
        type: 'pjt:scoreList',
        weightProp: 'pjt:slWeight',
        scoreProp: 'pjt:slScore',
        rangeProp: 'pjt:slScoreRange',
        criterionProp: 'pjt:slCriterion',
        criterionAssoc: 'pjt:slScoreCriterion',
    },

    /** Exchange history (`bcpg:activityList`). */
    activity: {
        type: 'bcpg:activityList',
        typeProp: 'bcpg:alType',
        userProp: 'bcpg:alUserId',
        dataProp: 'bcpg:alData',
    },

    /** Expiry buckets of the overview cards (spec §4.6.1). */
    expiryBuckets: [30, 60, 90],

    /**
     * Rows a single listing query may bring back. beCPG clamps this to
     * `beCPG.remote.maxResults.limit` (default **256**) as soon as `fields` are
     * requested, so asking for more is pointless — and asking for exactly the
     * limit is what keeps the truncation flag meaningful.
     */
    scanLimit: 250,

    /**
     * Ancestors a single `ANCESTOR:` disjunction may carry — the same value as
     * `documentConfig().maxScopeAncestors`, so the park scope of the monitoring
     * space and the supplier scope of `/documents` are expressed identically.
     *
     * It is deliberately **not** raised to `scanLimit`: measured on
     * the reference instance, a 250-disjunct query is a 23 KB URL, which this instance
     * accepts and another (a proxy with a smaller `large_client_header_buffers`,
     * a Tomcat with the stock 8 KB `maxHttpHeaderSize`) would reject with a 414.
     * A fan-out of small queries costs a few parallel round-trips; a 414 costs
     * the whole screen.
     */
    ancestorsPerQuery: 25,

    /**
     * Chunks a park-scoped counter may fan out to. `25 × 10 = 250 = scanLimit`,
     * so the whole scanned park is always covered and `dropped` can only be > 0
     * if `scanLimit` is raised without raising this.
     */
    maxAncestorQueries: 10,

    /** Default page size of the monitoring lists. */
    pageSize: 25,
    /** Hard ceiling on a caller-supplied page size. */
    maxPageSize: 100,

    /** Rows in the "suppliers at risk" block (spec §4.6.1: top 10). */
    topRiskSize: 10,

    /**
     * Risk weights of the top-10 block. An ordered, data-driven table: adding a
     * reason is adding a line, not an `if`.
     */
    riskWeights: {
        documentExpired: 40,
        blockingNc: 35,
        campaignNoAnswer: 22,
        documentExpiring: 15,
        lateTask: 14,
        documentMissing: 10,
        openNc: 8,
        lowCompletion: 12,
        scoreDropping: 18,
    },

    /** Completion (catalog score, %) below which `lowCompletion` fires. */
    lowCompletionBelow: 70,

    /** Risk score thresholds, most severe first. */
    riskLevels: [
        { level: 'critical', from: 60 },
        { level: 'high', from: 35 },
        { level: 'medium', from: 15 },
        { level: 'low', from: 0 },
    ],

    /** A campaign with no progress after this many days counts as unanswered. */
    campaignNoAnswerAfterDays: 7,

    /** TTL of the endpoint result cache, in ms. */
    cacheTtlMs: 30000,
    /** Hard cap on the cache so a large park cannot grow the heap. */
    cacheMaxEntries: 200,

    /** Most targets a single `/monitor/actions` call may address. */
    maxActionTargets: 100,
    /** Longest message body a reminder / escalation may carry. */
    maxActionMessage: 4000,
};

/**
 * Merges an override object onto {@link DEFAULT_MONITOR_CONFIG}.
 *
 * @param {Object} [overrides] partial configuration
 * @returns {Object} the effective configuration
 */
export function monitorConfig(overrides) {
    if (!overrides) {
        return DEFAULT_MONITOR_CONFIG;
    }
    return {
        ...DEFAULT_MONITOR_CONFIG,
        ...overrides,
        filters: { ...DEFAULT_MONITOR_CONFIG.filters, ...(overrides.filters || {}) },
        project: { ...DEFAULT_MONITOR_CONFIG.project, ...(overrides.project || {}) },
        task: { ...DEFAULT_MONITOR_CONFIG.task, ...(overrides.task || {}) },
        nc: { ...DEFAULT_MONITOR_CONFIG.nc, ...(overrides.nc || {}) },
        score: { ...DEFAULT_MONITOR_CONFIG.score, ...(overrides.score || {}) },
        activity: { ...DEFAULT_MONITOR_CONFIG.activity, ...(overrides.activity || {}) },
        riskWeights: { ...DEFAULT_MONITOR_CONFIG.riskWeights, ...(overrides.riskWeights || {}) },
    };
}

/* -------------------------------------------------------------------------- */
/* Access control                                                              */
/* -------------------------------------------------------------------------- */

/**
 * **The gate of the monitoring space** (spec §4.2, §4.6.7).
 *
 * Called by every exported function of this module, so the rule is enforced in
 * the adapter and not only in the route handlers.
 *
 * @param {Object} session a live portal session
 * @returns {Promise<{session: Object, client: Object, groups: string[],
 *                    capabilities: {isExternalUser: boolean, canMonitor: boolean}}>}
 * @throws {ForbiddenError} for an external supplier account, or for an
 *   internal account that holds none of `MONITOR_GROUPS`
 *
 * @example
 * const { client } = await requireMonitorAccess(session);
 */
export async function requireMonitorAccess(session) {
    if (!session) {
        throw new ForbiddenError('The monitoring space requires a portal session');
    }
    const client = createBecpgClient(session);
    const { groups, capabilities } = await getMyGroups(client);

    // `isSupplierAccount()` and not a local test: the generic `GROUP_ExternalUser`
    // marker is NOT sufficient. Measured on the reference instance, the test supplier account
    // holds thirteen `GROUP_EXTERNAL_SUPPLIER_<code>` groups and no generic one —
    // so a local `groups.includes(EXTERNAL_USER_GROUP)` classified a real supplier
    // as internal, fell through to the group test below, and refused it with
    // "ask your administrator for GROUP_QualityMgr…": internal group names handed
    // to an external user, and the §4.6.7 invariant ("refused **even if** it also
    // holds a monitoring group") silently not enforced. One predicate, shared with
    // `resolveSpace()`, or the two disagree again.
    const isExternalUser = isSupplierAccount(groups, capabilities);
    const canMonitor = monitorGroups().some((group) => groups.includes(group));

    // An external account is refused first and unconditionally: a supplier that
    // also happened to sit in a monitoring group must never read the park.
    if (isExternalUser) {
        throw new ForbiddenError('The monitoring space is not open to supplier accounts', {
            details: { space: 'supplier' },
        });
    }
    if (!canMonitor) {
        throw new ForbiddenError('This account holds none of the monitoring groups', {
            details: { required: monitorGroups() },
        });
    }

    return { session, client, groups, capabilities: { isExternalUser, canMonitor } };
}

/* -------------------------------------------------------------------------- */
/* Cache                                                                       */
/* -------------------------------------------------------------------------- */

/** `${tenant}|${user}|${endpoint}|${filterSignature}` → `{ at, value }` */
const monitorCache = new Map();

function cacheKey(session, endpoint, signature) {
    const tenant = session?.tenantId || '';
    const user = session?.username || session?.sub || '';
    return `${tenant}|${user}|${endpoint}|${signature}`;
}

/**
 * Short-TTL memo shared by the monitoring endpoints.
 *
 * The key includes the **user**, never only the tenant: results are ACL-filtered
 * by Alfresco, so one buyer's park must never be served to another.
 *
 * @param {Object} session
 * @param {string} endpoint
 * @param {string} signature stable signature of the filters
 * @param {Object} config
 * @param {() => Promise<*>} factory
 * @param {boolean} [refresh] bypass the cache
 * @returns {Promise<*>}
 */
async function memoize(session, endpoint, signature, config, factory, refresh) {
    const key = cacheKey(session, endpoint, signature);
    if (!refresh) {
        const hit = monitorCache.get(key);
        if (hit && Date.now() - hit.at < config.cacheTtlMs) {
            return hit.value;
        }
    }
    const value = await factory();
    if (monitorCache.size >= config.cacheMaxEntries) {
        const oldest = monitorCache.keys().next();
        if (!oldest.done) {
            monitorCache.delete(oldest.value);
        }
    }
    monitorCache.set(key, { at: Date.now(), value });
    return value;
}

/**
 * Drops the memoised monitoring results — called after every `/monitor/actions`
 * write, so a screen refreshed straight after a bulk reminder shows the effect.
 *
 * @param {Object} [session] limit the eviction to this session
 */
export function invalidateMonitorCache(session) {
    if (!session) {
        monitorCache.clear();
        return;
    }
    const prefix = `${session.tenantId || ''}|${session.username || session.sub || ''}|`;
    for (const key of monitorCache.keys()) {
        if (key.startsWith(prefix)) {
            monitorCache.delete(key);
        }
    }
}

/* -------------------------------------------------------------------------- */
/* db-afts helpers                                                             */
/* -------------------------------------------------------------------------- */

/** Escapes a value used inside a quoted AFTS term. */
function aftsValue(value) {
    return String(value === undefined || value === null ? '' : value)
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');
}

/** `AND`-joins the non-empty clauses. */
function and(clauses) {
    return clauses.filter(Boolean).join(' AND ');
}

/** Exact-match clause, the `=prop:"value"` form beCPG generates. */
function eq(property, value) {
    return `=${property}:"${aftsValue(value)}"`;
}

/** Negated exact match — mirrors `AbstractBeCPGQueryBuilder.prohibided()`. */
function notEq(property, value) {
    return `-=${property}:"${aftsValue(value)}"`;
}

/** `(=prop:"a" OR =prop:"b")`, or '' when the list is empty. */
function anyOf(property, values) {
    const list = (values || []).filter((value) => value !== undefined && value !== null && value !== '');
    if (list.length === 0) {
        return '';
    }
    return `(${list.map((value) => eq(property, value)).join(' OR ')})`;
}

/** `-=prop:"a" AND -=prop:"b"` — every value excluded. */
function noneOf(property, values) {
    return (values || []).map((value) => notEq(property, value)).join(' AND ');
}

/**
 * **The supplier restriction of the monitoring space** — one indexed `ASPECT`
 * clause, ANDed into the query.
 *
 * ```
 * ASPECT:"bcpg:suppliersAspect"
 * ```
 *
 * Applied to the two families that are *not* supplier entities themselves and
 * would otherwise be read instance-wide: `pjt:project` (campaigns) and `qa:nc`
 * (quality). See {@link DEFAULT_MONITOR_CONFIG.supplierAspect} for why this is
 * the right marker.
 *
 * @param {Object} [config]
 * @returns {string} the clause, or `''` when a tenant lifted the restriction
 *
 * @example
 * supplierScopeClause();   // 'ASPECT:"bcpg:suppliersAspect"'
 */
export function supplierScopeClause(config = DEFAULT_MONITOR_CONFIG) {
    const aspect = config?.supplierAspect;
    return aspect ? `ASPECT:"${aftsValue(aspect)}"` : '';
}

/**
 * What the endpoints echo so the applied restriction is **declared in the API**,
 * not only in this file. A caller that sees `applied: false` knows the figures
 * cover the whole instance.
 *
 * @param {Object} config
 * @param {string[]} types the node types the clause was applied to
 * @returns {{aspect: string|null, clause: string, applied: boolean, appliesTo: string[], reason: string}}
 */
function supplierScopeInfo(config, types) {
    const clause = supplierScopeClause(config);
    return {
        aspect: config?.supplierAspect || null,
        clause,
        applied: clause !== '',
        appliesTo: types,
        reason: 'PLMModel.ASPECT_SUPPLIERS — only projects and non-conformities that concern a supplier',
    };
}

/** Range clause. `MIN` / `MAX` are the accepted open bounds. */
function between(property, from, to) {
    return `${property}:[${from} TO ${to}]`;
}

/**
 * **The counter primitive** — how many nodes match, without listing them.
 *
 * One query, one row *when the engine answers with a real count*. It often does not:
 * `pagination.totalItems` is `count + 1` on the db-afts path of `inDBIfPossible()` —
 * a "there is at least one more" sentinel, not a total (the measurements are on
 * {@link readListTotal}). Read naively, every counter of this module would answer
 * **2** for a `sample: 1` probe, whatever the park holds.
 *
 * So the probe is passed through {@link readListTotal}, which either recognises a
 * real total or refuses to invent one; when it refuses, the query is widened **once**
 * up to `ceiling` and read again. Past that the result carries `exact: false` and
 * `count` is a **proven floor**, never `maxResults + 1`:
 *
 * ```
 * park of 173, sample 1   -> probe: count 1, totalItems 2, hasMore true   (sentinel)
 *                         -> widen to 250: count 173, hasMore false       -> 173, exact
 * park of 900, sample 250 -> probe: count 250, totalItems 251, hasMore true
 *                         -> 250, exact: false     (was: 251, exact: true)
 * ```
 *
 * `count` stays a number in every case — a caller doing arithmetic on it keeps
 * working — but a caller **publishing** it must read `exact` first and degrade to
 * "at least N" rather than print a fact it does not have.
 *
 * @param {string} query the AFTS query (must carry an explicit `TYPE:` clause)
 * @param {Object} options
 * @param {Object} options.session portal session
 * @param {string} [options.fields='bcpg:code'] cheapest projection that works
 * @param {number} [options.sample=1] rows to bring back with the count
 * @param {number} [options.ceiling] widening ceiling (defaults to `scanLimit`)
 * @returns {Promise<{count: number, atLeast: number, exact: boolean,
 *                    items: Object[], query: string}>}
 *
 * @example
 * const { count, exact } = await countNodes('TYPE:"qa:nc" AND -=qa:ncState:"closed"', { session });
 */
export async function countNodes(query, options = {}) {
    const {
        session,
        fields = 'bcpg:code',
        sample = 1,
        ceiling = DEFAULT_MONITOR_CONFIG.scanLimit,
    } = options;

    if (!query) {
        return { count: 0, atLeast: 0, exact: true, items: [], query: '' };
    }

    const probeSize = Math.max(1, Number(sample) || 1);
    const probe = await searchNodes(query, { session, fields, maxResults: probeSize });
    const probed = readListTotal(probe.pagination, { rows: probe.items.length });

    // The window held everything, or the engine answered with a count too big to be
    // the sentinel (index path): either way `totalItems` is a fact.
    if (probed.exact) {
        return { count: probed.total, atLeast: probed.total, exact: true, items: probe.items, query };
    }
    // The probe already asked for the ceiling: widening would replay the very
    // same query for the very same answer.
    if (probeSize >= ceiling) {
        logWarn('monitor.countTruncated', { query, ceiling, count: probed.atLeast });
        return { count: probed.atLeast, atLeast: probed.atLeast, exact: false, items: probe.items, query };
    }

    // db-afts path: the count came back as the sentinel. Widen once.
    const widened = await searchNodes(query, { session, fields, maxResults: ceiling });
    const total = readListTotal(widened.pagination, { rows: widened.items.length });

    if (!total.exact) {
        logWarn('monitor.countTruncated', { query, ceiling, count: total.atLeast });
    }
    return {
        count: total.exact ? total.total : total.atLeast,
        atLeast: total.atLeast,
        exact: total.exact,
        items: widened.items,
        query,
    };
}

/* -------------------------------------------------------------------------- */
/* Park scope — the ANCESTOR chunks a counter runs on                          */
/* -------------------------------------------------------------------------- */

/**
 * Turns the scanned park into the `ANCESTOR:` chunks its sub-queries run on.
 *
 * ## Why this exists (defect L2)
 *
 * Every park-scoped query used to be built with
 *
 * ```js
 * const ancestors = rows.length > 0 && rows.length <= maxScopeAncestors ? refs : [];
 * ```
 *
 * and `ancestorClause([])` returns `''`, so **both edge cases collapsed onto the
 * same code path: "no scope at all"**. Two different lies came out of it, and
 * both were measured on the reference instance with one supplier account, one instant, the
 * real query builders:
 *
 * | counter              | with `ANCESTOR` | without | verdict |
 * |----------------------|-----------------|---------|---------|
 * | mandatory documents  | 22              | **35**  | 13 rows outside the scope |
 * | missing documents    | 16              | **25**  |         |
 * | late tasks           | 0               | **15**  | instance-wide |
 * | open NCs             | 0               | **5**   | instance-wide |
 *
 * Every one of those figures came back with `exact: true`. So above the
 * threshold the portal was not merely imprecise — it answered a *different
 * question* and vouched for the answer. And an **empty** park ran the same
 * instance-wide queries, which is how "no supplier matches this filter" could
 * produce a non-zero counter.
 *
 * ## The two rules
 *
 *  1. **An empty scope runs zero queries.** `chunks` is then `[]` and the caller
 *     returns a hard zero — never an unscoped query;
 *  2. **A large scope fans out**, `ancestorsPerQuery` at a time, so the counter
 *     means the same thing at every park size. `dropped > 0` says the fan-out
 *     ceiling cut the scope, and the counter is then a floor.
 *
 * @param {string[]} nodeRefs the park, as node references
 * @param {Object} [config] monitoring configuration
 * @returns {{refs: string[], chunks: string[][], dropped: number,
 *            empty: boolean, complete: boolean}}
 *
 * @example
 * parkScope([]).chunks;                 // []  -> the caller must not query
 * parkScope(refs30).chunks.length;      // 2   -> 25 + 5
 */
export function parkScope(nodeRefs, config = DEFAULT_MONITOR_CONFIG) {
    const refs = [...new Set((nodeRefs || []).filter(Boolean))];
    const { chunks, dropped } = chunkAncestors(refs, {
        ancestorsPerQuery: config.ancestorsPerQuery,
        maxQueries: config.maxAncestorQueries,
    });
    return {
        refs,
        chunks,
        dropped,
        empty: refs.length === 0,
        /** True when the chunks cover the whole scope — nothing was cut. */
        complete: refs.length > 0 && dropped === 0,
    };
}

/**
 * De-duplicates rows coming back from several chunk queries.
 *
 * The chunks partition the *suppliers*, so a document can only be seen twice if
 * it is multi-filed under two supplier trees — rare, but a repeated row would
 * corrupt every count downstream, exactly as `searchAllNodes()` guards against.
 *
 * @param {Array<{items: Object[]}>} results
 * @returns {Object[]}
 */
function mergeRows(results) {
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

/**
 * {@link countNodes}, once per chunk of {@link parkScope}, added up.
 *
 * **Zero chunks means zero queries** and a hard zero: an empty park has nothing
 * in it, and asking beCPG the unscoped question would answer about the whole
 * instance (see the table in `parkScope()`).
 *
 * `exact` is the conjunction of every chunk's own `exact` **and** `dropped ===
 * 0`: a sum of exact counts over an incomplete scope is still only a floor.
 *
 * @param {Object} scope a {@link parkScope} result
 * @param {function(string[]): string} build query builder, given one chunk
 * @param {Object} [options] forwarded to {@link countNodes}
 * @returns {Promise<{count: number, atLeast: number, exact: boolean,
 *                    items: Object[], queries: string[]}>}
 */
async function countScoped(scope, build, options = {}) {
    if (scope.chunks.length === 0) {
        return { count: 0, atLeast: 0, exact: true, items: [], queries: [] };
    }
    const queries = scope.chunks.map((ancestors) => build(ancestors));
    const results = await Promise.all(queries.map((query) => countNodes(query, options)));
    return {
        count: results.reduce((sum, result) => sum + result.count, 0),
        atLeast: results.reduce((sum, result) => sum + result.atLeast, 0),
        exact: scope.dropped === 0 && results.every((result) => result.exact),
        items: mergeRows(results),
        queries,
    };
}

/**
 * {@link searchNodes}, once per chunk of {@link parkScope}, merged.
 *
 * Same rule as {@link countScoped}: zero chunks, zero queries, no rows. Each
 * chunk gets its **own** `maxResults` window, which is the second half of the
 * fix — a single unscoped window was filled with rows of suppliers outside the
 * park, pushing the park's own rows out of it.
 *
 * @param {Object} scope a {@link parkScope} result
 * @param {function(string[]): string} build
 * @param {Object} [options] forwarded to {@link searchNodes}
 * @returns {Promise<{items: Object[], queries: string[], truncated: boolean}>}
 */
async function searchScoped(scope, build, options = {}) {
    if (scope.chunks.length === 0) {
        return { items: [], queries: [], truncated: false };
    }
    const queries = scope.chunks.map((ancestors) => build(ancestors));
    const results = await Promise.all(queries.map((query) => searchNodes(query, options)));
    return {
        items: mergeRows(results),
        queries,
        truncated: scope.dropped > 0
            || results.some((result) => result.pagination && result.pagination.hasMoreItems === true),
    };
}

/* -------------------------------------------------------------------------- */
/* Park filters                                                                */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {Object} MonitorFilters
 * @property {string|null} family      `bcpg:supplierHierarchy1` nodeRef
 * @property {string|null} subFamily   `bcpg:supplierHierarchy2` nodeRef
 * @property {string|null} site        plant nodeRef (association, post-filtered)
 * @property {string|null} subsidiary  subsidiary nodeRef (association, post-filtered)
 * @property {string|null} buyer       `cm:owner` username
 * @property {string|null} market      unsupported until a tenant maps it
 * @property {string|null} state       `bcpg:supplierState`
 * @property {string|null} q           free text on name / code / legal name
 */

/**
 * Reads the park filters of spec §4.6.1 out of a query string. Unknown
 * parameters are ignored; known ones are trimmed and length-capped.
 *
 * @param {URLSearchParams} params
 * @returns {MonitorFilters}
 */
export function parseMonitorFilters(params) {
    const read = (name) => {
        const value = params.get(name);
        if (value === null) {
            return null;
        }
        const trimmed = String(value).trim();
        return trimmed ? trimmed.slice(0, 200) : null;
    };
    return {
        family: read('family'),
        subFamily: read('subFamily'),
        site: read('site'),
        subsidiary: read('subsidiary'),
        buyer: read('buyer'),
        market: read('market'),
        state: read('state'),
        q: read('q'),
    };
}

/** Stable signature of a filter set, used as the cache key. */
function filterSignature(filters, extra = {}) {
    const entries = Object.entries({ ...(filters || {}), ...extra })
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, value]) => `${name}=${value}`);
    return entries.join('&');
}

/**
 * Turns the park filters into **one db-afts clause** plus the residue that has
 * to be applied on the fetched rows.
 *
 * The clause is appended to `TYPE:"bcpg:supplier"` by
 * `resolveSupplierScope()`, so the whole park is still selected by a single
 * query (spec §5.4.3) whatever the filters.
 *
 * ```
 * =bcpg:supplierHierarchy1:"workspace://SpacesStore/…"
 *   AND =bcpg:supplierState:"Valid"
 *   AND =cm:owner:"jdoe"
 *   AND (cm:name:"bio*" OR bcpg:code:"bio*" OR bcpg:legalName:"bio*" OR bcpg:erpCode:"bio*")
 * ```
 *
 * @param {MonitorFilters} filters
 * @param {Object} [config]
 * @returns {{query: string, postFilters: Array<{name: string, assoc: string, value: string}>,
 *            applied: Array<{name: string, mode: string, prop: string|null}>,
 *            unsupported: string[]}}
 */
export function buildParkFilterQuery(filters = {}, config = DEFAULT_MONITOR_CONFIG) {
    const clauses = [];
    const postFilters = [];
    const applied = [];
    const unsupported = [];

    for (const [name, value] of Object.entries(filters)) {
        if (value === null || value === undefined || value === '' || name === 'q') {
            continue;
        }
        const rule = config.filters[name];
        if (!rule || rule.mode === 'unset' || (rule.mode === 'query' && !rule.prop)) {
            // Never silently ignore a filter the caller asked for.
            unsupported.push(name);
            continue;
        }
        if (rule.mode === 'query') {
            clauses.push(eq(rule.prop, value));
            applied.push({ name, mode: 'query', prop: rule.prop });
            continue;
        }
        if (rule.mode === 'assoc') {
            // Alfresco cannot search associations: applied on the scanned window.
            postFilters.push({ name, assoc: rule.assoc, value: String(value) });
            applied.push({ name, mode: 'assoc', prop: rule.assoc });
        }
    }

    if (filters.q) {
        const needle = aftsValue(filters.q);
        clauses.push(`(${config.searchProps.map((prop) => `${prop}:"${needle}*"`).join(' OR ')})`);
        applied.push({ name: 'q', mode: 'query', prop: config.searchProps.join('|') });
    }

    return { query: and(clauses), postFilters, applied, unsupported };
}

/* -------------------------------------------------------------------------- */
/* Row projections                                                             */
/* -------------------------------------------------------------------------- */

/** Reads an association value out of an `attributes` block, always as a list. */
function assocList(attributes, name) {
    const value = attributes ? attributes[name] : null;
    if (!value) {
        return [];
    }
    return Array.isArray(value) ? value : [value];
}

/**
 * `{ id, "cm:name" }` → `{ nodeRef, label }`.
 *
 * {@link nodeLabel} owns the order the label is looked up in and refuses a value
 * that is an identifier — a hierarchy node is named after its own uuid, and
 * `cm:name` used to win here and put that uuid in the *Famille* column.
 */
function assocRef(node) {
    if (!node || !node.id) {
        return null;
    }
    return {
        nodeRef: isNodeRef(node.id) ? node.id : `workspace://SpacesStore/${node.id}`,
        label: nodeLabel(node) || '',
        type: node.type || '',
        username: node['cm:userName'] || null,
    };
}

/** The nodeRefs carried by an association. */
function assocRefs(attributes, name) {
    return assocList(attributes, name).map(assocRef).filter(Boolean);
}

/** Parses `bcpg:entityScore` into `{ score, catalogs }` (spec §4.6.4). */
function toCatalogCompletion(raw) {
    let parsed = raw;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        }
        catch {
            return { score: null, catalogs: [] };
        }
    }
    const catalogs = parsed && Array.isArray(parsed.catalogs) ? parsed.catalogs : [];
    const scored = catalogs
        .map((catalog) => Number(catalog.score))
        .filter((score) => Number.isFinite(score));
    return {
        score: scored.length > 0
            ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length)
            : null,
        // One row per catalogue: the scorecard reads "complétude des
        // catalogues", so a catalogue scored in two locales is one bar at its
        // worst score, not two bars with the same label. Same collapse as
        // `toCompletion()` in lib/adapters/entities.js, and the same reason.
        catalogs: dedupeCatalogs(
            catalogs.map((catalog) => ({
                id: catalog.id || null,
                label: catalog.label || catalog.id || null,
                score: Number.isFinite(Number(catalog.score)) ? Number(catalog.score) : null,
                color: catalog.color || null,
            })),
            (catalog) => catalog.id || catalog.label || '',
        ),
    };
}

/**
 * Fills in the label of the hierarchy references (family, sub-family).
 *
 * `bcpg:supplierHierarchy1` / `…2` are `d:noderef` properties pointing at a
 * `bcpg:linkedValue` — not a `bcpg:listValue`, and that nuance is the whole bug:
 * the label of a hierarchy link is `bcpg:lkvValue`, that of a plain list value
 * `bcpg:lvValue`. This function only read `lv`, found nothing, and fell back on
 * `cm:name` — which, measured on dev, holds the uuid of the node
 * (`9a8a35f0-bea7-498f-8b23-4d39c47394e6`) or a generated slug (`sup-hier-1270`).
 * The monitoring screen did therefore display a machine identifier in the
 * *Famille* column, exactly what the fix claimed to remove.
 * {@link nodeLabel} now holds the table of label properties, and refuses
 * `cm:name` on the types where it is an identifier.
 *
 * Two sources, in this order:
 *
 *   1. the object already served by the search when the target is readable — the
 *      label travels with the row, no call is needed;
 *   2. one read per distinct target for what only arrives as a `nodeRef`.
 *      A park has a handful of families, not one per supplier.
 *      `becpg/remote/entity/list` cannot resolve those nodes — it only serves
 *      entities, verified on dev — whereas `becpg/remote/entity?nodeRef=`
 *      reads them.
 *
 * An unreadable target keeps an empty label: the screen shows a dash, never the
 * identifier.
 *
 * @param {Object[]} rows rows carrying `family` / `subFamily`
 * @param {Object} client authenticated beCPG client
 * @param {string} [lang='fr'] picks `bcpg:lkvValue_fr` rather than `bcpg:lkvValue`
 * @returns {Promise<void>}
 */
async function fillHierarchyLabels(rows, client, lang = 'fr') {
    if (!Array.isArray(rows) || rows.length === 0) {
        return;
    }
    const refs = [];
    rows.forEach((row) => {
        [row && row.family, row && row.subFamily].forEach((ref) => {
            if (ref && ref.nodeRef) {
                // A label already in place may be an identifier: `assocRef` takes
                // `cm:name` for want of better. It is rejected here, not displayed.
                if (isMachineValue(ref.label)) {
                    ref.label = '';
                }
                refs.push(ref);
            }
        });
    });

    const pending = new Set(refs.filter((ref) => !ref.label).map((ref) => ref.nodeRef));
    if (pending.size === 0 || !client) {
        return;
    }

    const labels = new Map();
    await Promise.all([...pending].map(async (nodeRef) => {
        try {
            const data = await client.getJson('becpg/remote/entity', { query: { nodeRef, lists: 'none' } });
            const label = nodeLabel((data && data.entity) || null, lang);
            if (label) {
                labels.set(nodeRef, label);
            }
        }
        catch {
            // A missing label does not stop the screen from rendering.
        }
    }));

    refs.forEach((ref) => {
        if (!ref.label && labels.has(ref.nodeRef)) {
            ref.label = labels.get(ref.nodeRef);
        }
    });
}

/**
 * Projects a supplier node onto the monitoring row (spec §4.6.2 columns).
 *
 * @param {Object} node a node returned by {@link searchNodes}
 * @param {Object} config
 * @returns {Object}
 */
function toSupplierRow(node, config) {
    const attributes = node.attributes || {};
    const completion = toCatalogCompletion(attributes['bcpg:entityScore']);
    const family = assocRefs(attributes, config.filters.family.prop)[0]
        || (attributes[config.filters.family.prop]
            ? { nodeRef: attributes[config.filters.family.prop], label: '' }
            : null);
    const subFamily = assocRefs(attributes, config.filters.subFamily.prop)[0]
        || (attributes[config.filters.subFamily.prop]
            ? { nodeRef: attributes[config.filters.subFamily.prop], label: '' }
            : null);

    return {
        nodeRef: node.nodeRef,
        id: node.id,
        name: node.name,
        code: attributes['bcpg:code'] || node.code || null,
        erpCode: attributes['bcpg:erpCode'] || null,
        legalName: attributes['bcpg:legalName'] || null,
        state: attributes['bcpg:supplierState'] || null,
        email: attributes['bcpg:supplierEmail'] || null,
        family,
        subFamily,
        sites: assocRefs(attributes, config.filters.site.assoc),
        subsidiaries: assocRefs(attributes, config.filters.subsidiary.assoc),
        parent: assocRefs(attributes, 'bcpg:parentEntityRef')[0] || null,
        // Referring buyer: `cm:owner` of the supplier node. `/monitor/suppliers/{id}`
        // refines it with the project manager of the open referencing project,
        // which is the operational referent when the client uses projects.
        buyer: attributes['cm:owner'] || null,
        completion: completion.score,
        catalogs: completion.catalogs,
        lastActivity: attributes['cm:modified'] || null,
        createdAt: attributes['cm:created'] || null,
    };
}

/* -------------------------------------------------------------------------- */
/* Park scan                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Resolves the filtered park in **one query** ({@link countNodes}): its size and the
 * scanned window of rows with the full monitoring projection, capped at `scanLimit`.
 *
 * The park is `TYPE:"bcpg:supplier"` plus the filter clause — the same shape
 * `resolveSupplierScope()` uses for the supplier space, so both audiences read
 * the park through one ACL-filtered query and never through a per-supplier loop
 * (spec §5.4.3).
 *
 * `total` is a number in every case, but it is only a **total** when `exact` is true;
 * otherwise it is a floor — a park bigger than `scanLimit` on the db-afts path cannot
 * be counted without paging it, and this module does not page the park.
 *
 * **Memoised under its own key** (`park|<filters>`), not only inside each endpoint's
 * memo. `/monitor` loads several endpoints at once and every one of them scans the
 * park; without a shared memo each got its *own* `scanLimit` window of the same
 * query, and nothing guarantees Alfresco returns the same 250 rows twice — the
 * db-afts path issues no ORDER BY. Two screens of one page load could therefore
 * disagree about how many suppliers are suspended while both were right about their
 * own window. One memo makes it one query and one population (defect B5).
 *
 * @param {Object} params `{ session, filters, config, documents, refresh }`
 * @returns {Promise<{rows: Object[], total: number, atLeast: number, exact: boolean,
 *                    truncated: boolean, filters: Object, query: string}>}
 */
async function scanPark(params) {
    const { session, config } = params;
    const filters = params.filters || {};

    return memoize(session, 'park', filterSignature(filters), config, async () => {
        const built = buildParkFilterQuery(filters, config);
        const parkQuery = and([`TYPE:"${config.supplierType}"`, built.query]);

        const counted = await countNodes(parkQuery, {
            session,
            fields: config.supplierFields.join(','),
            sample: config.scanLimit,
            ceiling: config.scanLimit,
        });
        let rows = counted.items.map((node) => toSupplierRow(node, config));
        // Families are few: one read per distinct value, not one per row.
        await fillHierarchyLabels(rows, createBecpgClient(session));

        // Association filters (site, subsidiary) cannot be pushed into the query:
        // Alfresco does not index associations, so they are applied on the window we
        // already fetched. `filters.applied[].mode === 'assoc'` says so in the payload.
        for (const post of built.postFilters) {
            const key = post.name === 'site' ? 'sites' : 'subsidiaries';
            rows = rows.filter((row) => (row[key] || []).some((ref) => ref.nodeRef === post.value));
        }

        // Did the scan hold the *whole* park? Only then is a number computed on the
        // window — the row count after an association post-filter — a total rather
        // than a floor.
        const wholePark = counted.exact && counted.count <= counted.items.length;
        const filtered = built.postFilters.length > 0;
        return {
            rows,
            total: filtered ? rows.length : counted.count,
            atLeast: filtered ? rows.length : counted.atLeast,
            exact: filtered ? wholePark : counted.exact,
            truncated: !wholePark,
            filters: {
                requested: filters,
                applied: built.applied,
                unsupported: built.unsupported,
            },
            query: parkQuery,
        };
    }, params.refresh);
}

/**
 * Reads a bounded set of `pjt:taskList` rows **by identifier** — the companion
 * of `pjt:projectCurrentTasks`.
 *
 * ```
 * TYPE:"pjt:taskList" AND (ID:"<t1>" OR ID:"<t2>" …)
 * ```
 *
 * One query, bounded by the number of open tasks of the scanned projects, never
 * by the size of the park.
 *
 * @param {Object} params `{ session, config, taskRefs, now }`
 * @returns {Promise<{tasks: Map<string, Object>, query: string|null}>}
 */
async function fetchTasksByRef(params) {
    const { session, config, now } = params;
    const taskRefs = [...new Set(params.taskRefs || [])].slice(0, config.scanLimit);
    if (taskRefs.length === 0) {
        return { tasks: new Map(), query: null };
    }

    const query = and([`TYPE:"${config.task.type}"`, idClause(taskRefs)]);
    const { items } = await searchNodes(query, {
        session,
        fields: [
            config.task.nameProp,
            config.task.stateProp,
            config.task.dueProp,
            config.task.resourcesAssoc,
        ].join(','),
        maxResults: config.scanLimit,
    }).catch(() => ({ items: [] }));

    const tasks = new Map();
    for (const node of items) {
        const attributes = node.attributes || {};
        const state = attributes[config.task.stateProp] || null;
        const due = attributes[config.task.dueProp] || null;
        const isOpen = config.task.openStates.includes(state);
        tasks.set(node.nodeRef, {
            nodeRef: node.nodeRef,
            name: attributes[config.task.nameProp] || node.name,
            state,
            dueDate: due,
            done: config.task.doneStates.includes(state),
            isOpen,
            late: Boolean(due) && isOpen && new Date(due).getTime() < now.getTime(),
            assignees: assocRefs(attributes, config.task.resourcesAssoc),
        });
    }
    return { tasks, query };
}

/* -------------------------------------------------------------------------- */
/* Documentary compliance                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Documentary compliance of the park, as **four count queries** — never a scan.
 *
 * ```
 * total    : TYPE:"cm:content" AND ASPECT:"bcpg:documentAspect" AND =bcpg:documentIsMandatory:"true"
 * missing  : … AND =bcpg:documentState:"Simulation"
 * expired  : … AND -=bcpg:documentState:"Simulation" AND cm:to:[MIN TO <now>]
 * refused  : … AND =bcpg:documentState:"Refused"
 * ```
 *
 * `compliance = (total − missing − expired − refused) / total`, i.e. the share
 * of mandatory documents that are present and valid (spec §4.6.1).
 *
 * ## `rate` is `null` rather than wrong (defect L1)
 *
 * The four counters are capped independently, each at `scanLimit`. The moment
 * two of them clamp on the same ceiling the subtraction stops meaning anything:
 * `compliant = max(0, 250 − 250) = 0` and the tile showed **0 %**. Measured on
 * the reference instance, same account, same instant, the only variable being the ceiling
 * `countNodes()` widens to:
 *
 * ```
 * ceiling 250 -> total 35 (exact) missing 25 (exact)          -> 29 %
 * ceiling  20 -> total 20 (capped) missing 20 (capped)        ->  0 %   <- false
 * ceiling  10 -> total 10 (capped) missing 10 (capped)        ->  0 %   <- false
 * ```
 *
 * 0 % is not an imprecise 29 %, it is a different statement: "this park has no
 * compliant document at all". Labelling it `≈ approché` did not make it true.
 *
 * So the rate is now published **only when all four inputs are facts**, and is
 * `null` otherwise, with `rateUnavailable` naming what is missing. A tile that
 * shows "—" and says why is honest; one that shows 0 % is not. The counters
 * themselves still travel — as floors, which is what `exact: false` means.
 *
 * Exported for the same reason `buildDocumentQuery()` is: the rule above is part
 * of the contract — "no rate rather than a wrong one" — and a reviewer must be
 * able to exercise it against a real instance without going through the
 * monitoring gate.
 *
 * @param {Object} params `{ session, scope, documents, now }` — `scope` is a
 *   {@link parkScope}; an empty one runs **no query** and returns hard zeros
 * @returns {Promise<Object>}
 */
export async function countCompliance(params) {
    const { session, scope, documents, now } = params;

    const builders = {
        total: (ancestors) => buildDocumentQuery({ config: documents, ancestors, mandatoryOnly: true }),
        missing: (ancestors) => buildDocumentQuery({
            config: documents, ancestors, mandatoryOnly: true, provided: false,
        }),
        expired: (ancestors) => buildDocumentQuery({
            config: documents,
            ancestors,
            mandatoryOnly: true,
            provided: true,
            expiryRange: { from: 'MIN', to: toAftsDate(now) },
        }),
        refused: (ancestors) => buildDocumentQuery({
            config: documents,
            ancestors,
            mandatoryOnly: true,
            state: documents.states.refused,
        }),
    };

    const [total, missing, expired, refused] = await Promise.all([
        countScoped(scope, builders.total, { session }),
        countScoped(scope, builders.missing, { session }),
        countScoped(scope, builders.expired, { session }),
        countScoped(scope, builders.refused, { session }),
    ]);

    const nonCompliant = missing.count + expired.count + refused.count;
    const compliant = Math.max(0, total.count - nonCompliant);
    const exact = total.exact && missing.exact && expired.exact && refused.exact;

    // Which inputs are floors — named, so the screen can say *what* is missing
    // instead of showing an unexplained dash.
    const capped = Object.entries({ total, missing, expired, refused })
        .filter(([, result]) => result.exact === false)
        .map(([name]) => name);
    if (capped.length > 0) {
        logWarn('monitor.complianceRateUnavailable', {
            capped,
            total: total.count,
            missing: missing.count,
            scopeChunks: scope.chunks.length,
            scopeDropped: scope.dropped,
        });
    }

    return {
        mandatoryTotal: total.count,
        compliant,
        missing: missing.count,
        expired: expired.count,
        refused: refused.count,
        /**
         * A percentage, or `null` when one of its inputs is a floor. Never a
         * number the four counters cannot justify (defect L1).
         */
        rate: !exact || scope.empty
            ? null
            : (total.count > 0 ? Math.round((compliant / total.count) * 100) : 100),
        /** Why there is no rate. `null` when there is one. */
        rateUnavailable: exact && !scope.empty
            ? null
            : {
                // An empty park has nothing to be compliant *about*: "100 %" would
                // be as much of an invention as the 0 % this guard replaced.
                reason: scope.empty
                    ? 'emptyScope'
                    : (scope.dropped > 0 ? 'scopeTruncated' : 'countsCapped'),
                capped,
                scanLimit: DEFAULT_MONITOR_CONFIG.scanLimit,
                droppedSuppliers: scope.dropped,
            },
        exact,
        /** The counters cover the park itself — see `parkScope()`. */
        parkScoped: true,
        queries: {
            total: total.queries,
            missing: missing.queries,
            expired: expired.queries,
            refused: refused.queries,
        },
    };
}

/**
 * Documents expiring inside each bucket — **one count query per bucket**.
 *
 * ```
 * TYPE:"cm:content" AND ASPECT:"bcpg:documentAspect"
 *   AND -=bcpg:documentState:"Simulation" AND cm:to:[<now> TO <now + N days>]
 * ```
 *
 * @param {Object} params `{ session, scope, documents, now, buckets, mandatoryOnly }`
 *   — `scope` is a {@link parkScope}; an empty one runs **no query** and every
 *   bucket is a hard zero (defect L2)
 * @returns {Promise<{buckets: Object, queries: Object, exact: boolean}>}
 */
async function countExpiring(params) {
    const { session, scope, documents, now, buckets, mandatoryOnly } = params;

    const build = (days) => (ancestors) => buildDocumentQuery({
        config: documents,
        ancestors,
        mandatoryOnly: Boolean(mandatoryOnly),
        provided: true,
        expiryRange: { from: toAftsDate(now), to: toAftsDate(new Date(now.getTime() + days * MS_PER_DAY)) },
    });

    const results = await Promise.all(
        buckets.map((days) => countScoped(scope, build(days), { session })),
    );

    const counts = {};
    const queries = {};
    let exact = true;
    buckets.forEach((days, index) => {
        counts[days] = results[index].count;
        queries[days] = results[index].queries;
        exact = exact && results[index].exact;
    });

    return { buckets: counts, queries, exact, parkScoped: true };
}

/* -------------------------------------------------------------------------- */
/* Campaigns                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The open-campaign query — one db-afts query over the **supplier** projects.
 *
 * ```
 * TYPE:"pjt:project"
 *   AND ASPECT:"bcpg:suppliersAspect"
 *   AND (=pjt:projectState:"Planned" OR =pjt:projectState:"InProgress" OR =pjt:projectState:"OnHold")
 * ```
 *
 * The `ASPECT` clause is what makes this a *campaign* query rather than a
 * project query: `pjt:project` covers every project of the instance, and the
 * monitoring space only ever means the supplier referencing / renewal pipeline
 * ({@link DEFAULT_MONITOR_CONFIG.supplierAspect}).
 *
 * @param {Object} config
 * @param {string[]} [ancestors]
 * @param {string[]} [states] defaults to `config.project.openStates`
 * @param {Object} [options]
 * @param {boolean} [options.supplierOnly=true] set to `false` **only** for an
 *   internal join whose rows are re-filtered afterwards (see `listQuality()`);
 *   never for a query whose count or rows reach a screen
 * @returns {string}
 */
export function buildCampaignQuery(config, ancestors, states, options = {}) {
    const project = config.project;
    return and([
        `TYPE:"${project.type}"`,
        options.supplierOnly === false ? '' : supplierScopeClause(config),
        ancestorClause(ancestors),
        anyOf(project.stateProp, states || project.openStates),
    ]);
}

/** Fields of a campaign row. */
function campaignFields(config) {
    const project = config.project;
    return [
        'cm:name',
        'cm:created',
        'cm:modified',
        'bcpg:code',
        project.stateProp,
        project.completionProp,
        project.dueProp,
        project.startProp,
        project.priorityProp,
        project.managerAssoc,
        project.supplierAssoc,
        project.entityAssoc,
        project.currentTasksAssoc,
    ].join(',');
}

/**
 * Projects a project node onto a campaign row.
 *
 * **Response rate** is `pjt:completionPercent`, the progress beCPG itself
 * maintains from the project's task graph — the portal does not invent a second
 * notion of progress. A campaign that is still at 0 % more than
 * `campaignNoAnswerAfterDays` after its start counts as *unanswered*, which is
 * the "campagne sans réponse" reason of spec §4.6.1.
 *
 * @param {Object} node
 * @param {Object} config
 * @param {Date} now
 * @returns {Object}
 */
function toCampaignRow(node, config, now) {
    const project = config.project;
    const attributes = node.attributes || {};
    const completion = Number(attributes[project.completionProp]);
    const startedAt = attributes[project.startProp] || attributes['cm:created'] || null;
    const dueDate = attributes[project.dueProp] || null;

    const ageDays = startedAt
        ? Math.floor((now.getTime() - new Date(startedAt).getTime()) / MS_PER_DAY)
        : null;
    const daysToDue = dueDate
        ? Math.ceil((new Date(dueDate).getTime() - now.getTime()) / MS_PER_DAY)
        : null;

    return {
        nodeRef: node.nodeRef,
        id: node.id,
        name: node.name,
        code: attributes['bcpg:code'] || null,
        state: attributes[project.stateProp] || null,
        completion: Number.isFinite(completion) ? completion : 0,
        startedAt,
        dueDate,
        ageDays,
        daysToDue,
        isLate: daysToDue !== null && daysToDue < 0,
        manager: assocRefs(attributes, project.managerAssoc)[0] || null,
        suppliers: assocRefs(attributes, project.supplierAssoc),
        entities: assocRefs(attributes, project.entityAssoc),
        // The project → task direction: a task row of a list query carries no
        // pointer back to its project (see `project.currentTasksAssoc`).
        currentTaskRefs: assocRefs(attributes, project.currentTasksAssoc).map((ref) => ref.nodeRef),
        unanswered: (Number.isFinite(completion) ? completion : 0) === 0
            && ageDays !== null
            && ageDays >= config.campaignNoAnswerAfterDays,
        modified: attributes['cm:modified'] || null,
    };
}

/**
 * **The one open-campaign scan of the monitoring space**, memoised per user and
 * state set so the three screens that need it pay for it once.
 *
 * ## Why it is shared (defect B7 — the risk score disagreed with itself)
 *
 * `scoreRisk()` weighs `campaignNoAnswer` at 22, the third-heaviest reason. Only
 * `/monitor/overview` ever had campaign rows in hand, so only its top-10 block
 * could produce that reason; `/monitor/suppliers` built its reasons out of the
 * approval details alone and the code was **structurally unreachable** there.
 * The same supplier therefore carried two scores under one word. Measured on
 * the reference instance, one instant, all ten rows of the top-10 disagreed:
 *
 * ```
 * Chez Philippe – Cires et gélifiants   /monitor: critical 79   /monitor/suppliers: high 35
 * Chez Élodie – Sels et condiments      /monitor: critical 64   /monitor/suppliers: medium 20
 * Chez Camille – Jus de fruits          /monitor: high 54       /monitor/suppliers: low 12
 * ```
 *
 * …and the list's default ordering is `sort=risk`, so "the riskiest suppliers"
 * were not the same suppliers on the dashboard and in the list it links to — nor
 * in the CSV an auditor exports from that list.
 *
 * The rows are not mapped here: `toCampaignRow()` reads `now`, and a memo must
 * not freeze it. What is shared is the **query**, which is what costs.
 *
 * @param {Object} params `{ session, config, states, refresh }`
 * @returns {Promise<{count: number, atLeast: number, exact: boolean,
 *                    items: Object[], query: string}>}
 */
async function scanOpenCampaigns(params) {
    const { session, config, states, refresh } = params;
    const list = states && states.length > 0 ? states : config.project.openStates;
    const query = buildCampaignQuery(config, [], list);

    return memoize(session, 'campaignScan', list.join('+'), config, async () => countNodes(query, {
        session,
        fields: campaignFields(config),
        sample: config.scanLimit,
    }), refresh);
}

/**
 * Unanswered campaigns per supplier — the input of the `campaignNoAnswer` risk
 * reason, derived identically wherever risk is scored.
 *
 * @param {Object[]} campaignRows rows of {@link toCampaignRow}
 * @returns {Map<string, Array<{nodeRef: string, name: string, ageDays: number}>>}
 */
function unansweredCampaignsBySupplier(campaignRows) {
    const index = new Map();
    for (const campaign of campaignRows) {
        if (!campaign.unanswered) {
            continue;
        }
        for (const supplier of campaign.suppliers) {
            const list = index.get(supplier.nodeRef) || [];
            list.push({ nodeRef: campaign.nodeRef, name: campaign.name, ageDays: campaign.ageDays });
            index.set(supplier.nodeRef, list);
        }
    }
    return index;
}

/**
 * The overdue supplier-task query — one db-afts query.
 *
 * ```
 * TYPE:"pjt:taskList"
 *   AND (=pjt:tlState:"Planned" OR =pjt:tlState:"InProgress" OR =pjt:tlState:"Refused")
 *   AND pjt:tlDue:[MIN TO <now>]
 * ```
 *
 * @param {Object} config
 * @param {Date} now
 * @param {string[]} [ancestors]
 * @returns {string}
 */
export function buildLateTaskQuery(config, now, ancestors) {
    const task = config.task;
    return and([
        `TYPE:"${task.type}"`,
        ancestorClause(ancestors),
        anyOf(task.stateProp, task.openStates),
        between(task.dueProp, 'MIN', toAftsDate(now)),
    ]);
}

/* -------------------------------------------------------------------------- */
/* Non-conformities                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The open **supplier** non-conformity query — one db-afts query.
 *
 * ```
 * TYPE:"qa:nc" AND ASPECT:"bcpg:suppliersAspect" AND -=qa:ncState:"closed"
 * ```
 *
 * With `blockingOnly`, the priority disjunction is added:
 * `AND (=qa:ncPriority:"1")`.
 *
 * `qa:nc` extends `bcpg:entityV2` and carries **no supplier association of its
 * own**: an NC that concerns a supplier is exactly one carrying
 * `bcpg:suppliersAspect` (and its `bcpg:suppliers` association). Without that
 * clause the quality view reports every non-conformity of the instance —
 * production, client, internal audit included.
 *
 * @param {Object} config
 * @param {Object} [options] `{ ancestors, blockingOnly, states, includeClosed,
 *   ncType, supplierOnly }`
 * @returns {string}
 */
export function buildNcQuery(config, options = {}) {
    const nc = config.nc;
    const clauses = [
        `TYPE:"${nc.type}"`,
        options.supplierOnly === false ? '' : supplierScopeClause(config),
        ancestorClause(options.ancestors),
    ];

    if (Array.isArray(options.states) && options.states.length > 0) {
        clauses.push(anyOf(nc.stateProp, options.states));
    }
    else if (options.includeClosed !== true) {
        clauses.push(noneOf(nc.stateProp, nc.closedStates));
    }
    if (options.blockingOnly) {
        clauses.push(anyOf(nc.priorityProp, nc.blockingPriorities));
    }
    if (options.ncType) {
        clauses.push(eq(nc.typeProp, options.ncType));
    }
    return and(clauses);
}

/* -------------------------------------------------------------------------- */
/* Risk scoring (spec §4.6.1 — top 10 suppliers at risk)                       */
/* -------------------------------------------------------------------------- */

/**
 * Reason → the direct action the overview offers on it (spec §4.6.1: "avec le
 * motif … et l'action directe — relancer, escalader, suspendre").
 * @readonly
 */
const REASON_ACTIONS = Object.freeze({
    documentExpired: ['remind', 'escalate', 'suspend'],
    documentExpiring: ['remind'],
    documentMissing: ['remind'],
    blockingNc: ['escalate', 'suspend'],
    openNc: ['escalate'],
    campaignNoAnswer: ['remind', 'escalate'],
    lateTask: ['remind', 'escalate'],
    lowCompletion: ['remind'],
    scoreDropping: ['escalate'],
});

/**
 * Scores one supplier's risk from the reasons that hold for it.
 *
 * The weights live in `config.riskWeights` and the levels in
 * `config.riskLevels`: adding a reason is adding a line of configuration, not a
 * branch of code.
 *
 * @param {Array<{code: string, count: number}>} reasons
 * @param {Object} config
 * @returns {{score: number, level: string, reasons: Object[], actions: string[]}}
 */
export function scoreRisk(reasons, config = DEFAULT_MONITOR_CONFIG) {
    let score = 0;
    const actions = new Set();

    for (const reason of reasons) {
        const weight = config.riskWeights[reason.code] || 0;
        // The first occurrence carries the full weight; further ones add a
        // decreasing bonus, so "12 expired documents" outranks "1 expired
        // document" without letting one reason swamp every other.
        const count = Math.max(1, Number(reason.count) || 1);
        score += weight + Math.min(weight, (count - 1) * Math.ceil(weight / 5));
        for (const action of REASON_ACTIONS[reason.code] || []) {
            actions.add(action);
        }
    }

    const level = (config.riskLevels.find((entry) => score >= entry.from) || { level: 'low' }).level;
    return { score: Math.round(score), level, reasons, actions: [...actions] };
}

/* -------------------------------------------------------------------------- */
/* /monitor/overview (spec §4.6.1)                                             */
/* -------------------------------------------------------------------------- */

/**
 * **Shape of `GET /api/v1/monitor/overview`.**
 *
 * @typedef {Object} MonitorOverview
 * @property {{approved: number, inProgress: number, toRenew: number,
 *             suspended: number, unknown: number, total: number|number,
 *             exact: boolean, atLeast: number, scanned: number,
 *             truncated: boolean, breakdownScope: 'park'|'window'}} park
 *   `approved + inProgress + toRenew + suspended + unknown === scanned`, always.
 *   `total` is the size of the *whole* filtered park and is only a fact when
 *   `exact` is true — it is **not** the denominator of the four buckets unless
 *   `breakdownScope` is `'park'`. See the defect-B5 note in `buildOverview()`.
 * @property {{rate: number|null, rateUnavailable: Object|null,
 *             mandatoryTotal: number, compliant: number, missing: number,
 *             expired: number, refused: number, exact: boolean,
 *             parkScoped: true}} compliance
 *   `rate` is `null` whenever one of its four inputs is a floor — see
 *   `countCompliance()`. A screen must render the absence, never a 0 %.
 * @property {{buckets: Object.<string, number>, noticeDays: number}} expiring
 * @property {{open: number, unanswered: number, responseRate: number,
 *             meanCompletion: number, late: number, parkScoped: false}} campaigns
 * @property {{late: number, parkScoped: false}} tasks
 * @property {{open: number, blocking: number, parkScoped: false}} nonConformities
 * @property {{suppliers: number, chunks: number, dropped: number,
 *             complete: boolean, empty: Object|null, appliesTo: string[],
 *             notParkScoped: Object[]}} scope the park restriction the counters
 *   ran under — `chunks: 0` means the park is empty and **no query was run**
 * @property {Object[]} topRisk  at most `topRiskSize` entries, riskiest first
 * @property {{available: boolean, required: Object}} history
 * @property {{aspect: string|null, clause: string, applied: boolean,
 *             appliesTo: string[]}} supplierScope the supplier restriction the
 *   campaign and NC counters were computed under
 * @property {Object} filters
 * @property {Object} queries    every db-afts query actually run
 * @property {string} generatedAt
 */

/**
 * **Builds `GET /api/v1/monitor/overview`** — the park at a glance (spec §4.6.1).
 *
 * Cost: ~18 fixed queries, whatever the size of the park (see the module
 * header). Everything except the approval breakdown is a **count query**.
 *
 * @param {Object} params
 * @param {Object} params.session live portal session
 * @param {MonitorFilters} [params.filters]
 * @param {Object} [params.config] monitoring configuration override
 * @param {Object} [params.documents] document configuration override
 * @param {boolean} [params.refresh] bypass the short-TTL cache
 * @param {Date} [params.now] evaluation instant (tests)
 * @returns {Promise<MonitorOverview>}
 *
 * @example
 * const overview = await buildOverview({ session, filters: { family: familyRef } });
 * overview.park.suspended;      // 3
 * overview.topRisk[0].risk;     // { score: 84, level: 'critical', … }
 */
export async function buildOverview(params = {}) {
    const { session } = params;
    await requireMonitorAccess(session);

    const config = monitorConfig(params.config);
    const documents = documentConfig(params.documents);
    const filters = params.filters || {};
    const now = params.now instanceof Date ? params.now : new Date();

    return memoize(session, 'overview', filterSignature(filters), config, async () => {
        const park = await scanPark({ session, filters, config, documents, refresh: params.refresh });

        /*
         * The park, as the `ANCESTOR:` chunks its document counters run on
         * (defect L2). The previous rule — "≤ 25 suppliers, scope; otherwise
         * none" — made an empty park and an oversized park share one code path,
         * "no scope at all", and that path answers about the whole instance.
         * `parkScope()` has no such branch: zero suppliers is zero queries, and
         * a big park fans out instead of giving up.
         */
        const scope = parkScope(park.rows.map((row) => row.nodeRef), config);

        /*
         * The three families below are **not filed under a supplier**, so
         * `ANCESTOR:"<supplier>"` is not a narrower filter on them — it selects
         * none of them. Measured on the reference instance: `qa:nc` rows live in
         * `/Espace racine/Qualité/Non conformités` (3/3 sampled), and with the
         * park scope applied the counters read `nc.open 0` / `nc.blocking 0` /
         * `tasks.late 0` while the unscoped ones read 5 / 2 / 15. The same is
         * already stated for projects in `getSupplierScorecard()`: "projects
         * live in the project site, not under the supplier".
         *
         * So they keep the restriction that *is* meaningful for them — the
         * `bcpg:suppliersAspect` clause already in `buildCampaignQuery()` /
         * `buildNcQuery()` — and the payload declares `parkScoped: false`
         * instead of letting a park-filtered reader take them for park figures.
         * An **empty park** still runs none of them: a park with no supplier in
         * it cannot show a non-zero counter.
         */
        const campaignQuery = scope.empty ? '' : buildCampaignQuery(config, []);
        const lateTaskQuery = scope.empty ? '' : buildLateTaskQuery(config, now, []);
        const openNcQuery = scope.empty ? '' : buildNcQuery(config, {});
        const blockingNcQuery = scope.empty ? '' : buildNcQuery(config, { blockingOnly: true });

        const [approval, compliance, expiring, campaigns, lateTasks, openNc, blockingNc] = await Promise.all([
            computeApprovalForPark({
                session,
                // **The population is the scanned rows themselves** (defect B5). Not
                // `supplierQuery`, which would make the approval pass re-select the
                // park through a second window with a *different* ceiling (256, vs
                // this scan's 250) and hand back a breakdown of a set the screen does
                // not display. Not `supplier:` either — that is the caller-facing,
                // perimeter-validated parameter, and validating rows that already came
                // out of an ACL-filtered search against a second window turns one row
                // falling outside it into a 404 for the whole overview.
                population: park.rows,
                documents: params.documents,
                now,
            }),
            countCompliance({ session, scope, documents, now }),
            countExpiring({ session, scope, documents, now, buckets: config.expiryBuckets }),
            // Shared with `/monitor/suppliers` and `/monitor/campaigns` through one
            // memo, so the three screens score `campaignNoAnswer` off the same rows
            // (see `scanOpenCampaigns()`). An empty park still runs nothing.
            scope.empty
                ? Promise.resolve({ count: 0, atLeast: 0, exact: true, items: [], query: '' })
                : scanOpenCampaigns({ session, config, states: config.project.openStates, refresh: params.refresh }),
            countNodes(lateTaskQuery, { session, fields: config.task.dueProp }),
            countNodes(openNcQuery, { session, fields: config.nc.stateProp }),
            countNodes(blockingNcQuery, { session, fields: config.nc.priorityProp }),
        ]);

        const campaignRows = campaigns.items.map((node) => toCampaignRow(node, config, now));
        const unanswered = campaignRows.filter((row) => row.unanswered).length;
        const answered = campaignRows.filter((row) => row.completion > 0).length;
        const meanCompletion = campaignRows.length > 0
            ? Math.round(campaignRows.reduce((sum, row) => sum + row.completion, 0) / campaignRows.length)
            : 0;

        const approvalByRef = new Map(approval.suppliers.map((entry) => [entry.nodeRef, entry]));

        /*
         * --- the approval breakdown, as a partition of the scanned park (defect B5) --
         *
         * Measured before this: `park.total: 251` next to `park.approved: 256` — more
         * approved suppliers than suppliers. Neither number was a park size:
         *
         *   - **251** was `scanLimit` (250) **+ 1**, the db-afts "there is at least one
         *     more" sentinel that `pagination.totalItems` carries, read as a total.
         *     `readListTotal()` now refuses it and `scanPark` reports 250 with
         *     `exact: false`, i.e. "250+";
         *   - **256** was `beCPG.remote.maxResults.limit`, the ceiling beCPG silently
         *     clamps a `fields` request to. `computeApprovalForPark()` resolves its own
         *     population through `resolveSupplierScope()` — one window, `maxResults:
         *     1000`, clamped to 256 rows — and gave every one of them a status.
         *
         * So the two figures were the two ceilings of the *same* query, compared as if
         * they were counts.
         *
         * They are now **one population**: the approval pass above is handed
         * `population: park.rows`, so it evaluates exactly the rows this fold walks and
         * nothing else. The fold below is therefore not a filter but the *proof* — it
         * is what makes `approved + inProgress + toRenew + suspended + unknown ===
         * scanned` an identity that holds no matter what the approval adapter returns,
         * and it keeps `unknown` as a tripwire (it must be 0; it is logged and
         * published, never silently folded into `approved`, which is what
         * `listMonitoredSuppliers` used to do). No bucket can exceed the park it is
         * drawn from, because every bucket is filled by walking that park.
         *
         * What the screen must still not do is put a bucket over `park.total`: the
         * buckets partition the **scanned window** (`scanned`), and `park.total` is a
         * floor of the whole park when `park.exact` is false. `breakdownScope` says
         * which of the two is the denominator, and `ParkStats` reads it.
         *
         * (The other suspect — one query carrying `ASPECT:"bcpg:suppliersAspect"` and
         * the other not — is ruled out by reading: that clause is applied to `pjt:project`
         * and `qa:nc` only, see `supplierScopeInfo()` below. Both park queries are a
         * plain `TYPE:"bcpg:supplier"` plus the same filter clause.)
         */
        const breakdown = {
            [APPROVAL_STATUS.APPROVED]: 0,
            [APPROVAL_STATUS.IN_PROGRESS]: 0,
            [APPROVAL_STATUS.TO_RENEW]: 0,
            [APPROVAL_STATUS.SUSPENDED]: 0,
        };
        let breakdownUnknown = 0;
        for (const row of park.rows) {
            const entry = approvalByRef.get(row.nodeRef);
            if (!entry || breakdown[entry.status] === undefined) {
                breakdownUnknown += 1;
                continue;
            }
            breakdown[entry.status] += 1;
        }
        if (breakdownUnknown > 0) {
            logWarn('monitor.breakdownIncomplete', {
                scanned: park.rows.length,
                unknown: breakdownUnknown,
                evaluated: approval.suppliers.length,
            });
        }

        // --- top 10 at risk --------------------------------------------------
        // Same helper as `listMonitoredSuppliers`, so the reason lists that feed
        // `scoreRisk()` cannot drift apart again.
        const unansweredBySupplier = unansweredCampaignsBySupplier(campaignRows);

        // Iterate the **scanned park**, not the approval result: a post-filtered
        // park (site, subsidiary) is narrower than what the approval queries
        // saw, and a supplier the user filtered out must not surface here.
        const candidates = [];
        for (const row of park.rows) {
            const nodeRef = row.nodeRef;
            const entry = approvalByRef.get(nodeRef);
            if (!entry) {
                continue;
            }
            const reasons = [];

            for (const code of ['documentExpired', 'documentExpiring', 'documentMissing', 'blockingNc']) {
                const count = (entry.details?.[code] || []).length;
                if (count > 0) {
                    reasons.push({ code, count, label: code });
                }
            }
            const unansweredCampaigns = unansweredBySupplier.get(nodeRef) || [];
            if (unansweredCampaigns.length > 0) {
                reasons.push({ code: 'campaignNoAnswer', count: unansweredCampaigns.length, campaigns: unansweredCampaigns });
            }
            if (typeof row.completion === 'number' && row.completion < config.lowCompletionBelow) {
                reasons.push({ code: 'lowCompletion', count: 1, score: row.completion });
            }
            if (reasons.length === 0) {
                continue;
            }

            candidates.push({
                nodeRef,
                name: entry.name || row.name,
                code: entry.code || row.code,
                approval: { status: entry.status, statusLabel: entry.statusLabel },
                completion: row.completion,
                buyer: row.buyer,
                lastActivity: row.lastActivity,
                metrics: entry.metrics,
                risk: scoreRisk(reasons, config),
                href: `/monitor/suppliers/${encodeURIComponent(nodeRef)}`,
            });
        }

        candidates.sort((a, b) => {
            const byRisk = b.risk.score - a.risk.score;
            return byRisk !== 0 ? byRisk : String(a.name).localeCompare(String(b.name));
        });

        logDebug('monitor.overview', {
            park: park.total,
            scanned: park.rows.length,
            atRisk: candidates.length,
        });

        return {
            park: {
                total: park.total,
                // `total` is a floor when the counter could not reach the end of the
                // park; every tile that prints it must say so (see `formatTotal()`).
                exact: park.exact,
                atLeast: park.atLeast,
                scanned: park.rows.length,
                truncated: park.truncated,
                // The four buckets below and `unknown` partition `scanned` — never
                // `total` (defect B5). They come from the fold above, over the very
                // rows the approval pass was handed, so `approved` can no longer
                // exceed the park it is drawn from.
                approved: breakdown[APPROVAL_STATUS.APPROVED],
                inProgress: breakdown[APPROVAL_STATUS.IN_PROGRESS],
                toRenew: breakdown[APPROVAL_STATUS.TO_RENEW],
                suspended: breakdown[APPROVAL_STATUS.SUSPENDED],
                /** Scanned rows the approval pass did not return a status for. 0 by
                 *  construction; published so the screen can show a remainder instead
                 *  of quietly mis-adding if that ever stops being true. */
                unknown: breakdownUnknown,
                // Which population the buckets partition: `scanned` when the window
                // did not hold the whole park, the park itself otherwise. Said out
                // loud rather than presented as a park-wide fact.
                breakdownScope: park.truncated ? 'window' : 'park',
            },
            compliance: {
                /** `null` when an input is a floor — never a 0 % nobody can justify. */
                rate: compliance.rate,
                rateUnavailable: compliance.rateUnavailable,
                mandatoryTotal: compliance.mandatoryTotal,
                compliant: compliance.compliant,
                missing: compliance.missing,
                expired: compliance.expired,
                refused: compliance.refused,
                exact: compliance.exact,
                parkScoped: true,
            },
            expiring: {
                buckets: expiring.buckets,
                noticeDays: documents.noticeDays,
                exact: expiring.exact,
                parkScoped: true,
            },
            campaigns: {
                open: campaigns.count,
                scanned: campaignRows.length,
                unanswered,
                answered,
                /*
                 * `null`, not 100, when there is no campaign to answer — same
                 * rule as `compliance.rate` (defect L1). "0 campagnes en cours ·
                 * 100 % de réponse" was a perfect score awarded for an empty set.
                 */
                responseRate: campaignRows.length > 0
                    ? Math.round((answered / campaignRows.length) * 100)
                    : null,
                meanCompletion,
                late: campaignRows.filter((row) => row.isLate).length,
                exact: campaigns.exact,
                // A project is not a descendant of a supplier, so the park filter
                // cannot reach it: this counts the supplier campaigns of the whole
                // instance. Said here rather than left for the reader to assume.
                parkScoped: false,
            },
            tasks: { late: lateTasks.count, exact: lateTasks.exact, parkScoped: false },
            nonConformities: {
                open: openNc.count,
                blocking: blockingNc.count,
                exact: openNc.exact && blockingNc.exact,
                parkScoped: false,
            },
            /**
             * The park restriction the counters above ran under (defect L2).
             * `chunks` is how many `ANCESTOR:` queries each park-scoped counter
             * fanned out to — `0` means the park is empty and **no query ran**.
             */
            scope: {
                suppliers: scope.refs.length,
                chunks: scope.chunks.length,
                ancestorsPerQuery: config.ancestorsPerQuery,
                dropped: scope.dropped,
                complete: scope.chunks.length === 0 || scope.complete,
                empty: scope.empty
                    ? {
                        reason: 'emptyPark',
                        hint: 'No supplier matches this perimeter, so every counter is'
                            + ' zero by construction and no query was run.',
                    }
                    : null,
                appliesTo: ['compliance', 'expiring'],
                /**
                 * Counters the park filter physically cannot reach, with the
                 * reason — they are supplier-scoped (`bcpg:suppliersAspect`) but
                 * never park-scoped.
                 */
                notParkScoped: [
                    { counter: 'campaigns', type: config.project.type, reason: 'filedOutsideSupplier' },
                    { counter: 'tasks', type: config.task.type, reason: 'filedOutsideSupplier' },
                    { counter: 'nonConformities', type: config.nc.type, reason: 'filedOutsideSupplier' },
                ],
                unsupported: [
                    'a document filed under an entity that is not under the supplier space'
                    + ' is outside ANCESTOR reach (same limit as supplierScope in entities.js)',
                ],
            },
            topRisk: candidates.slice(0, config.topRiskSize),
            // The series themselves are NOT fetched here. `/monitor` is already
            // a dozen upstream calls, and the cube is absent on most instances;
            // paying a Saiku round-trip on every overview to usually learn
            // "no cube" is a cost for nothing. The payload names the endpoint
            // that serves them so a screen can ask when it actually plots one.
            history: {
                available: false,
                endpoint: '/api/v1/monitor/history',
                series: ['taskTrend', 'taskStates', 'completion', 'incidents'],
                required: OLAP_REQUIREMENTS,
            },
            // The campaign and NC counters above are supplier-restricted, and
            // the payload says so: an overview that silently counted every
            // project of the instance is worse than no overview at all.
            // `tasks.late` is not restricted — a `pjt:taskList` row carries no
            // aspect of its own; it is scoped by the campaigns it hangs under.
            supplierScope: supplierScopeInfo(config, [config.project.type, config.nc.type]),
            filters: park.filters,
            queries: {
                park: park.query,
                approval: approval.queries,
                compliance: compliance.queries,
                expiring: expiring.queries,
                campaigns: campaignQuery,
                lateTasks: lateTaskQuery,
                openNc: openNcQuery,
                blockingNc: blockingNcQuery,
            },
            generatedAt: now.toISOString(),
        };
    }, params.refresh);
}

/* -------------------------------------------------------------------------- */
/* /monitor/suppliers (spec §4.6.2)                                            */
/* -------------------------------------------------------------------------- */

/** Sortable columns of the monitoring list. */
const SUPPLIER_SORTERS = {
    name: (a, b) => String(a.name).localeCompare(String(b.name)),
    code: (a, b) => String(a.code || '').localeCompare(String(b.code || '')),
    status: (a, b) => (a.approval.severity - b.approval.severity),
    score: (a, b) => (b.completion ?? -1) - (a.completion ?? -1),
    completion: (a, b) => (b.completion ?? -1) - (a.completion ?? -1),
    expiring: (a, b) => b.metrics.documentsExpiring - a.metrics.documentsExpiring,
    expired: (a, b) => b.metrics.documentsExpired - a.metrics.documentsExpired,
    nc: (a, b) => b.metrics.openNc - a.metrics.openNc,
    lastActivity: (a, b) => new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime(),
    buyer: (a, b) => String(a.buyer || '').localeCompare(String(b.buyer || '')),
    // Ties broken by name, **the same way `buildOverview()` breaks them**: the
    // dashboard's top 10 links into this list, and with an unstable tie order the
    // two showed the same ten suppliers in a different order at equal scores
    // (measured: positions 1↔2 and 5↔6 swapped at 79 and 54).
    risk: (a, b) => (b.risk.score - a.risk.score) || String(a.name).localeCompare(String(b.name)),
};

/** Severity rank of an approval status, most severe first. */
const APPROVAL_SEVERITY = {
    [APPROVAL_STATUS.SUSPENDED]: 0,
    [APPROVAL_STATUS.TO_RENEW]: 1,
    [APPROVAL_STATUS.IN_PROGRESS]: 2,
    [APPROVAL_STATUS.APPROVED]: 3,
};

/**
 * **Shape of `GET /api/v1/monitor/suppliers`.**
 *
 * @typedef {Object} MonitorSupplierList
 * @property {Object[]} items   one row per supplier (columns of spec §4.6.2)
 * @property {{page: number, pageSize: number, count: number,
 *             totalItems: number|null, totalAtLeast: number, totalExact: boolean,
 *             hasMoreItems: boolean, scanned: number, truncated: boolean,
 *             sortScope: 'park'|'window'}} pagination — `totalItems` is `null` when
 *             the park is bigger than the scan and the engine would only answer with
 *             the `count + 1` sentinel; `totalAtLeast` is then the proven floor
 * @property {Object.<string, number>} counts by approval status
 * @property {Object} filters
 * @property {{by: string, direction: 'asc'|'desc'}} sort
 * @property {Object} queries
 * @property {string} generatedAt
 */

/**
 * **Builds `GET /api/v1/monitor/suppliers`** — the monitoring list (spec §4.6.2).
 *
 * Columns: approval status, score, completion, expiring documents, open NCs,
 * last activity, referring buyer. Sorting and pagination happen **after** the
 * derived columns exist, because approval status, expiry counts and risk are
 * derived (spec §5.4.3) and cannot be sorted by the search engine. The scanned
 * window is bounded by `scanLimit`; when the filtered park is larger the payload
 * says so with `truncated: true` and `sortScope: 'window'` instead of pretending
 * the ordering is park-wide.
 *
 * Cost: 1 count + 1 park scan + 7 approval queries ≈ 9, independent of the park.
 *
 * @param {Object} params
 * @param {Object} params.session
 * @param {MonitorFilters} [params.filters]
 * @param {string} [params.status] restrict to one approval status
 * @param {string} [params.sort='risk']
 * @param {'asc'|'desc'} [params.direction]
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize]
 * @param {Object} [params.config]
 * @param {Object} [params.documents]
 * @param {boolean} [params.refresh]
 * @returns {Promise<MonitorSupplierList>}
 */
export async function listMonitoredSuppliers(params = {}) {
    const { session } = params;
    await requireMonitorAccess(session);

    const config = monitorConfig(params.config);
    const documents = documentConfig(params.documents);
    const filters = params.filters || {};
    const now = params.now instanceof Date ? params.now : new Date();

    const sortBy = SUPPLIER_SORTERS[params.sort] ? params.sort : 'risk';
    const direction = params.direction === 'asc' ? 'asc' : 'desc';
    const pageSize = Math.max(1, Math.min(
        Number(params.pageSize) || config.pageSize,
        config.maxPageSize,
    ));
    const page = Math.max(1, Number(params.page) || 1);

    const signature = filterSignature(filters, { status: params.status || '' });

    const computed = await memoize(session, 'suppliers', signature, config, async () => {
        const park = await scanPark({ session, filters, config, documents, refresh: params.refresh });

        // Same population as `/monitor/overview` (defect B5): the approval pass is
        // handed the scanned rows, so this list's `counts` and the overview's park
        // breakdown are two folds over one set. Before this they were two windows on
        // one query with two different ceilings, and the "Agréés" tile of the overview
        // could name a bigger number than this list could ever show rows for.
        const [approval, campaigns] = await Promise.all([
            computeApprovalForPark({
                session,
                population: park.rows,
                documents: params.documents,
                now,
            }),
            /*
             * The very scan `/monitor/overview` runs, shared through one memo. Without
             * it the `campaignNoAnswer` reason — weight 22, the third heaviest — was
             * unreachable in this list while it dominated the dashboard's top 10, and
             * the same supplier read "Critique 79" there and "Élevé 35" here. See
             * `scanOpenCampaigns()` for the measurements.
             */
            scanOpenCampaigns({ session, config, states: config.project.openStates, refresh: params.refresh }),
        ]);
        const approvalByRef = new Map(approval.suppliers.map((entry) => [entry.nodeRef, entry]));
        const unansweredBySupplier = unansweredCampaignsBySupplier(
            campaigns.items.map((node) => toCampaignRow(node, config, now)),
        );

        const rows = park.rows.map((row) => {
            const entry = approvalByRef.get(row.nodeRef);
            // `population` makes a missing entry impossible; the fallback stays as a
            // total function, and it agrees with `deriveStatus()`, which returns
            // APPROVED when no reason holds.
            const status = entry ? entry.status : APPROVAL_STATUS.APPROVED;
            const metrics = (entry && entry.metrics) || {
                documentsExpired: 0,
                documentsExpiring: 0,
                documentsMissing: 0,
                openNc: 0,
                openProjects: 0,
            };

            // Built in the **same order and from the same sources** as the top-10 of
            // `buildOverview()`: `scoreRisk()` is order-independent, but two reason
            // lists that differ produce two scores under one word, which is the
            // defect this list carried.
            const reasons = [];
            for (const code of ['documentExpired', 'documentExpiring', 'documentMissing', 'blockingNc']) {
                const count = (entry?.details?.[code] || []).length;
                if (count > 0) {
                    reasons.push({ code, count });
                }
            }
            const unansweredCampaigns = unansweredBySupplier.get(row.nodeRef) || [];
            if (unansweredCampaigns.length > 0) {
                reasons.push({
                    code: 'campaignNoAnswer',
                    count: unansweredCampaigns.length,
                    campaigns: unansweredCampaigns,
                });
            }
            if (typeof row.completion === 'number' && row.completion < config.lowCompletionBelow) {
                reasons.push({ code: 'lowCompletion', count: 1, score: row.completion });
            }

            return {
                ...row,
                approval: {
                    status,
                    statusLabel: entry ? entry.statusLabel : status,
                    reasons: entry ? entry.reasons : [],
                    severity: APPROVAL_SEVERITY[status] ?? 9,
                },
                metrics,
                risk: scoreRisk(reasons, config),
                href: `/monitor/suppliers/${encodeURIComponent(row.nodeRef)}`,
            };
        });

        const counts = {
            [APPROVAL_STATUS.SUSPENDED]: 0,
            [APPROVAL_STATUS.TO_RENEW]: 0,
            [APPROVAL_STATUS.IN_PROGRESS]: 0,
            [APPROVAL_STATUS.APPROVED]: 0,
        };
        for (const row of rows) {
            counts[row.approval.status] = (counts[row.approval.status] || 0) + 1;
        }

        return {
            rows,
            counts,
            park,
            queries: { park: park.query, approval: approval.queries },
        };
    }, params.refresh);

    let rows = computed.rows;
    if (params.status) {
        const wanted = String(params.status).split(',').map((value) => value.trim()).filter(Boolean);
        rows = rows.filter((row) => wanted.includes(row.approval.status));
    }

    const sorter = SUPPLIER_SORTERS[sortBy];
    rows = [...rows].sort(direction === 'asc' ? (a, b) => -sorter(a, b) : sorter);

    const start = (page - 1) * pageSize;
    const pageItems = rows.slice(start, start + pageSize);

    // A status filter is applied on the scanned window, so its row count is a total
    // only when the window held the whole park; otherwise it is a floor, exactly like
    // the park counter itself. Either way the payload never states a number it cannot
    // prove — see `readListTotal()` in lib/adapters/tasks.js.
    const filteredByStatus = Boolean(params.status);
    const totalExact = filteredByStatus ? !computed.park.truncated : computed.park.exact;
    const totalAtLeast = filteredByStatus ? rows.length : computed.park.atLeast;

    return {
        items: pageItems,
        counts: computed.counts,
        pagination: {
            page,
            pageSize,
            count: pageItems.length,
            totalItems: totalExact ? totalAtLeast : null,
            totalAtLeast,
            totalExact,
            hasMoreItems: start + pageSize < rows.length,
            scanned: computed.rows.length,
            truncated: computed.park.truncated,
            // Say it plainly: with a park larger than `scanLimit` the ordering
            // is over the scanned window, not over the whole park.
            sortScope: computed.park.truncated ? 'window' : 'park',
        },
        filters: computed.park.filters,
        sort: { by: sortBy, direction },
        // Same rule as the overview: the endpoint is named, the round-trip is
        // not paid until a screen plots a series.
        history: {
            available: false,
            endpoint: '/api/v1/monitor/history',
            series: ['taskTrend', 'taskStates', 'completion', 'incidents'],
            required: OLAP_REQUIREMENTS,
        },
        queries: computed.queries,
        generatedAt: now.toISOString(),
    };
}

/* -------------------------------------------------------------------------- */
/* /monitor/suppliers/{id} (spec §4.6.2 fiche, §4.6.4 scorecard)               */
/* -------------------------------------------------------------------------- */

/**
 * Checks that a supplier is inside the caller's perimeter and returns its row.
 *
 * beCPG remains the authority — an unreadable node answers 403 whatever we do —
 * but spec §6.3 asks the proxy to verify the perimeter as well. **One db-afts
 * query**: `TYPE:"bcpg:supplier" AND ID:"<nodeRef>"`.
 *
 * @param {Object} params `{ session, supplierRef, config }`
 * @returns {Promise<Object>} the supplier row
 * @throws {NotFoundError}
 */
async function requireSupplier(params) {
    const { session, config } = params;
    const supplierRef = String(params.supplierRef || '').trim();
    if (!isNodeRef(supplierRef)) {
        throw new BadRequestError('A valid supplier nodeRef is required');
    }

    const query = and([`TYPE:"${config.supplierType}"`, idClause([supplierRef])]);
    const { items } = await searchNodes(query, {
        session,
        fields: config.supplierFields.join(','),
        maxResults: 1,
    });
    if (items.length === 0) {
        throw new NotFoundError('Unknown supplier in this perimeter', {
            details: { supplier: supplierRef.slice(0, 80) },
        });
    }
    const row = toSupplierRow(items[0], config);
    await fillHierarchyLabels([row], createBecpgClient(session));
    return row;
}

/**
 * **Shape of `GET /api/v1/monitor/suppliers/{id}`.**
 *
 * @typedef {Object} MonitorSupplierSheet
 * @property {Object} supplier          identity + family + buyer + last activity
 * @property {Object} approval          the derived status and its reasons
 * @property {{score: number|null, criteria: Object[], available: boolean}} scorecard
 * @property {{available: boolean, points: Object[], required: Object}} history
 * @property {{items: Object[], summary: Object}} documents
 * @property {Object[]} products        entities linked to the supplier
 * @property {Object[]} subSuppliers    `bcpg:parentEntityRef` children
 * @property {Object[]} projects        open referencing / renewal projects
 * @property {Object[]} activity        exchange history (activities + comments)
 * @property {string[]} actions         actions offered on this supplier
 * @property {Object} queries
 * @property {string} generatedAt
 */

/**
 * **Builds `GET /api/v1/monitor/suppliers/{id}`** — the supplier sheet
 * (spec §4.6.2, scorecard §4.6.4).
 *
 * Cost: 7 approval queries (short-TTL cached, invalidated on document upload)
 * plus 6 detail queries.
 *
 * The **evolution over time** block degrades on purpose: without the OLAP cube
 * there is no snapshot of past approval statuses or past scores, so the sheet
 * returns `history.available === false` and {@link OLAP_REQUIREMENTS} instead of
 * fabricating a series (spec §4.6.6).
 *
 * @param {Object} params
 * @param {Object} params.session
 * @param {string} params.supplierRef supplier nodeRef
 * @param {Object} [params.config]
 * @param {Object} [params.documents]
 * @param {boolean} [params.refresh]
 * @returns {Promise<MonitorSupplierSheet>}
 */
export async function getSupplierScorecard(params = {}) {
    const { session } = params;
    await requireMonitorAccess(session);

    const config = monitorConfig(params.config);
    const documents = documentConfig(params.documents);
    const now = params.now instanceof Date ? params.now : new Date();

    const supplier = await requireSupplier({ session, supplierRef: params.supplierRef, config });
    const ancestors = [supplier.nodeRef];

    const productQuery = and([
        `TYPE:"${documents.entityType}"`,
        ancestorClause(ancestors),
        `-TYPE:"${config.supplierType}"`,
    ]);
    const subSupplierQuery = and([`TYPE:"${config.supplierType}"`, ancestorClause(ancestors)]);
    const activityQuery = and([`TYPE:"${config.activity.type}"`, ancestorClause(ancestors)]);
    // Projects live in the project site, not under the supplier: the query runs
    // unscoped and the rows are attributed through `bcpg:suppliers`, exactly as
    // `computeApprovalForPark()` does.
    const projectQuery = buildCampaignQuery(config, []);

    const [approval, documentList, products, subSuppliers, projects, activities] = await Promise.all([
        computeApproval(supplier.nodeRef, {
            session,
            documents: params.documents,
            refresh: params.refresh,
            now,
        }),
        listDocuments({
            session,
            supplier: [supplier.nodeRef],
            page: 1,
            pageSize: config.scanLimit,
            config: params.documents,
        }).catch(() => ({ items: [], summary: null, query: null })),
        searchNodes(productQuery, {
            session,
            fields: 'cm:name,cm:modified,bcpg:code,bcpg:productState,bcpg:entityScore',
            maxResults: config.scanLimit,
        }).catch(() => ({ items: [] })),
        searchNodes(subSupplierQuery, {
            session,
            fields: 'cm:name,bcpg:code,bcpg:supplierState,bcpg:parentEntityRef',
            maxResults: config.scanLimit,
        }).catch(() => ({ items: [] })),
        searchNodes(projectQuery, {
            session,
            fields: campaignFields(config),
            maxResults: config.scanLimit,
        }).catch(() => ({ items: [] })),
        searchNodes(activityQuery, {
            session,
            fields: [
                'cm:created',
                'cm:creator',
                config.activity.typeProp,
                config.activity.userProp,
            ].join(','),
            maxResults: config.scanLimit,
        }).catch(() => ({ items: [] })),
    ]);

    const supplierProjects = projects.items
        .map((node) => toCampaignRow(node, config, now))
        .filter((row) => row.suppliers.some((ref) => ref.nodeRef === supplier.nodeRef));

    // --- scorecard (`pjt:scoreList` under the supplier's projects) -----------
    let scorecard = { score: null, criteria: [], available: false, query: null };
    if (supplierProjects.length > 0) {
        const scoreQuery = and([
            `TYPE:"${config.score.type}"`,
            ancestorClause(supplierProjects.slice(0, documents.maxScopeAncestors).map((row) => row.nodeRef)),
        ]);
        try {
            const { items } = await searchNodes(scoreQuery, {
                session,
                fields: [
                    'cm:name',
                    config.score.weightProp,
                    config.score.scoreProp,
                    config.score.rangeProp,
                    config.score.criterionProp,
                    config.score.criterionAssoc,
                ].join(','),
                maxResults: config.scanLimit,
            });
            const criteria = items.map((node) => {
                const attributes = node.attributes || {};
                const criterion = assocRefs(attributes, config.score.criterionAssoc)[0];
                return {
                    nodeRef: node.nodeRef,
                    criterion: criterion ? criterion.label : (attributes[config.score.criterionProp] || node.name),
                    criterionType: attributes[config.score.criterionProp] || null,
                    weight: Number(attributes[config.score.weightProp]) || 0,
                    score: Number.isFinite(Number(attributes[config.score.scoreProp]))
                        ? Number(attributes[config.score.scoreProp])
                        : null,
                    range: attributes[config.score.rangeProp] || null,
                };
            });
            // Weighted mean — `pjt:slWeight` is the weight beCPG stores, so the
            // portal aggregates the way `ExportSupplierScoreList` does.
            const weighted = criteria.filter((entry) => entry.score !== null);
            const totalWeight = weighted.reduce((sum, entry) => sum + (entry.weight || 0), 0);
            scorecard = {
                score: weighted.length === 0
                    ? null
                    : Math.round(totalWeight > 0
                        ? weighted.reduce((sum, entry) => sum + entry.score * entry.weight, 0) / totalWeight
                        : weighted.reduce((sum, entry) => sum + entry.score, 0) / weighted.length),
                criteria,
                available: criteria.length > 0,
                query: scoreQuery,
            };
        }
        catch (error) {
            logWarn('monitor.scorecardUnavailable', { message: error.message });
        }
    }

    // --- exchange history: activities + the forum thread of the supplier -----
    const activity = activities.items.map((node) => {
        const attributes = node.attributes || {};
        return {
            nodeRef: node.nodeRef,
            kind: 'activity',
            type: attributes[config.activity.typeProp] || null,
            user: attributes[config.activity.userProp] || attributes['cm:creator'] || null,
            date: attributes['cm:created'] || null,
        };
    });

    try {
        const comments = await becpgJson(`api/node/${nodeRefToPath(supplier.nodeRef)}/comments`, {
            session,
            query: { reverse: 'true', pageSize: 25 },
            skipAllowList: true,
        });
        for (const item of (comments?.items || [])) {
            activity.push({
                nodeRef: item.nodeRef || null,
                kind: 'message',
                type: 'Comment',
                user: item.author?.username || null,
                date: item.createdOnISO || item.createdOn || null,
                excerpt: String(item.content || '').replace(/<[^>]*>/g, '').slice(0, 240),
            });
        }
    }
    catch {
        // A supplier with no discussion has no forum node: not an error.
    }
    activity.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    const referent = supplierProjects.find((row) => row.manager);

    return {
        supplier: {
            ...supplier,
            // The operational referent: the manager of an open referencing
            // project when there is one, the node owner otherwise.
            buyer: referent && referent.manager
                ? (referent.manager.username || referent.manager.label)
                : supplier.buyer,
        },
        approval: {
            status: approval.status,
            statusLabel: approval.statusLabel,
            reasons: approval.reasons,
            details: approval.details,
            metrics: approval.metrics,
            cached: approval.cached === true,
        },
        scorecard,
        completion: { score: supplier.completion, catalogs: supplier.catalogs },
        history: {
            available: false,
            points: [],
            // Without the cube there is no series: say why, and what it takes.
            reason: 'No OLAP cube: beCPG stores no snapshot of past approval statuses or scores',
            required: OLAP_REQUIREMENTS,
        },
        documents: {
            items: documentList.items,
            summary: documentList.summary,
        },
        products: products.items.map((node) => ({
            nodeRef: node.nodeRef,
            name: node.name,
            code: node.attributes['bcpg:code'] || null,
            type: node.type,
            state: node.attributes['bcpg:productState'] || null,
            completion: toCatalogCompletion(node.attributes['bcpg:entityScore']).score,
            modified: node.attributes['cm:modified'] || null,
        })),
        subSuppliers: subSuppliers.items
            .filter((node) => node.nodeRef !== supplier.nodeRef)
            .map((node) => ({
                nodeRef: node.nodeRef,
                name: node.name,
                code: node.attributes['bcpg:code'] || null,
                state: node.attributes['bcpg:supplierState'] || null,
                parent: assocRefs(node.attributes, 'bcpg:parentEntityRef')[0] || null,
            })),
        projects: supplierProjects,
        activity: activity.slice(0, 50),
        actions: ['remind', 'escalate', 'suspend'],
        queries: {
            supplier: and([`TYPE:"${config.supplierType}"`, idClause([supplier.nodeRef])]),
            approval: approval.queries || null,
            documents: documentList.query || null,
            products: productQuery,
            subSuppliers: subSupplierQuery,
            projects: projectQuery,
            activity: activityQuery,
            scorecard: scorecard.query,
        },
        generatedAt: now.toISOString(),
    };
}

/* -------------------------------------------------------------------------- */
/* /monitor/documents — the supplier × document-type matrix (spec §4.6.3)      */
/* -------------------------------------------------------------------------- */

/**
 * **Shape of `GET /api/v1/monitor/documents`.**
 *
 * @typedef {Object} MonitorDocumentMatrix
 * @property {Array<{nodeRef: string, label: string, expected: number}>} columns
 *           the document types present in the scope, alphabetical
 * @property {Array<{supplier: Object, cells: Object.<string, Object>,
 *                   summary: Object}>} rows one row per supplier
 * @property {Object} totals   per-status totals over the whole matrix
 * @property {Object} filters
 * @property {Object} pagination
 * @property {Object} queries
 * @property {string} generatedAt
 */

/**
 * **Builds `GET /api/v1/monitor/documents`** — the supplier × document-type
 * matrix quality teams print before an audit (spec §4.6.3).
 *
 * A cell is `{ status, expected, provided, validTo, daysToExpiry, isMandatory,
 * documentRef }` where `status` is the derived status of the documents adapter:
 * `missing` (expected, not provided) / `refused` / `expired` / `expiring` /
 * `toValidate` / `valid`. An empty cell means the type does not apply to that
 * supplier — which is information too, since `DocumentFormulationHandler` only
 * materialises the types that match.
 *
 * Cost: 1 park scan + 1 document scan + 1 entity → supplier join + 1 count ≈ 4.
 *
 * @param {Object} params
 * @param {Object} params.session
 * @param {MonitorFilters} [params.filters]
 * @param {string} [params.documentType] restrict to one `bcpg:documentTypeRef`
 * @param {boolean} [params.mandatoryOnly]
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize]
 * @param {Object} [params.config]
 * @param {Object} [params.documents]
 * @returns {Promise<MonitorDocumentMatrix>}
 */
export async function buildDocumentMatrix(params = {}) {
    const { session } = params;
    await requireMonitorAccess(session);

    const config = monitorConfig(params.config);
    const documents = documentConfig(params.documents);
    const filters = params.filters || {};
    const now = params.now instanceof Date ? params.now : new Date();

    const pageSize = Math.max(1, Math.min(
        Number(params.pageSize) || config.pageSize,
        config.maxPageSize,
    ));
    const page = Math.max(1, Number(params.page) || 1);

    const signature = filterSignature(filters, {
        documentType: params.documentType || '',
        mandatoryOnly: params.mandatoryOnly ? '1' : '',
    });

    const computed = await memoize(session, 'documents', signature, config, async () => {
        const park = await scanPark({ session, filters, config, documents, refresh: params.refresh });
        const supplierRefs = new Set(park.rows.map((row) => row.nodeRef));

        /*
         * Same rule as the overview (defect L2): the park is chunked, never
         * dropped. Here it mattered twice over — the matrix does not count, it
         * *reads rows*, so an unscoped query spent its single `scanLimit` window
         * on documents of suppliers the matrix does not display, and the park's
         * own rows fell out of it. Empty park, no query at all.
         */
        const scope = parkScope(park.rows.map((row) => row.nodeRef), config);

        const { items, queries: documentQueries, truncated } = await searchScoped(
            scope,
            (ancestors) => buildDocumentQuery({
                config: documents,
                ancestors,
                mandatoryOnly: Boolean(params.mandatoryOnly),
            }),
            {
                session,
                fields: [
                    documents.props.state,
                    documents.props.mandatory,
                    documents.props.category,
                    documents.props.typeRef,
                    `${documents.props.typeRef}|bcpg:docTypeCategory`,
                    documents.props.entityRef,
                    documents.props.from,
                    documents.props.to,
                    documents.props.aiState,
                    documents.props.modified,
                ].join(','),
                maxResults: config.scanLimit,
            },
        );
        const pagination = { count: items.length, truncated };

        const rows = items.map((node) => toDocument(node, { config: documents, now }));

        // The rows carry the *entity* they belong to; a document hung on a
        // product must be attributed to that product's supplier. One join query,
        // bounded by the number of distinct entities in the window — never by
        // the park (same query 7 as `computeApprovalForPark()`).
        const entityRefs = [...new Set(
            rows.map((row) => row.entity?.nodeRef).filter((ref) => ref && !supplierRefs.has(ref)),
        )];
        const entitySuppliers = new Map();
        let joinQuery = null;
        if (entityRefs.length > 0) {
            joinQuery = and([`TYPE:"${documents.entityType}"`, idClause(entityRefs)]);
            const resolved = await searchNodes(joinQuery, {
                session,
                fields: documents.props.suppliers,
                maxResults: config.scanLimit,
            });
            for (const node of resolved.items) {
                entitySuppliers.set(
                    node.nodeRef,
                    assocRefs(node.attributes, documents.props.suppliers).map((ref) => ref.nodeRef),
                );
            }
        }

        return {
            park, rows, entitySuppliers, supplierRefs, scope,
            documentQuery: documentQueries, joinQuery, pagination,
        };
    }, params.refresh);

    const { park, rows, entitySuppliers, supplierRefs, scope } = computed;

    // --- fold the documents into the matrix ---------------------------------
    const wantedType = params.documentType ? String(params.documentType) : null;
    const columns = new Map();
    const cellsBySupplier = new Map(park.rows.map((row) => [row.nodeRef, new Map()]));
    const severity = new Map(documents.statusOrder.map((status, index) => [status, index]));

    for (const document of rows) {
        const typeRef = document.type?.nodeRef || 'untyped';
        const typeLabel = document.type?.label || 'Sans type';
        if (wantedType && typeRef !== wantedType) {
            continue;
        }

        const entityRef = document.entity?.nodeRef || null;
        let targets = [];
        if (entityRef && supplierRefs.has(entityRef)) {
            targets = [entityRef];
        }
        else if (entityRef && entitySuppliers.has(entityRef)) {
            targets = entitySuppliers.get(entityRef).filter((ref) => supplierRefs.has(ref));
        }
        if (targets.length === 0) {
            continue;
        }

        if (!columns.has(typeRef)) {
            columns.set(typeRef, {
                nodeRef: typeRef === 'untyped' ? null : typeRef,
                label: typeLabel,
                category: document.category || null,
                expected: 0,
            });
        }

        for (const target of targets) {
            const cells = cellsBySupplier.get(target);
            if (!cells) {
                continue;
            }
            const existing = cells.get(typeRef);
            const cell = {
                status: document.status,
                expected: true,
                provided: document.isProvided,
                isMandatory: document.isMandatory,
                validFrom: document.validFrom,
                validTo: document.validTo,
                daysToExpiry: document.daysToExpiry,
                aiValidationState: document.aiValidationState,
                documentRef: document.nodeRef,
                documentName: document.name,
                entity: document.entity,
                downloadUrl: document.downloadUrl,
            };
            // Several documents of the same type on the same supplier (one per
            // product): the **worst** one is what an auditor must see.
            if (!existing
                || (severity.get(cell.status) ?? 99) < (severity.get(existing.status) ?? 99)) {
                cells.set(typeRef, cell);
            }
            columns.get(typeRef).expected += existing ? 0 : 1;
        }
    }

    const orderedColumns = [...columns.values()]
        .sort((a, b) => String(a.label).localeCompare(String(b.label)));

    const totals = {};
    for (const status of documents.statusOrder) {
        totals[status] = 0;
    }
    const matrixRows = park.rows.map((supplier) => {
        const cells = cellsBySupplier.get(supplier.nodeRef) || new Map();
        const cellList = [...cells.values()];
        for (const cell of cellList) {
            totals[cell.status] = (totals[cell.status] || 0) + 1;
        }
        return {
            supplier: {
                nodeRef: supplier.nodeRef,
                name: supplier.name,
                code: supplier.code,
                family: supplier.family,
                buyer: supplier.buyer,
                href: `/monitor/suppliers/${encodeURIComponent(supplier.nodeRef)}`,
            },
            cells: Object.fromEntries(cells),
            summary: summarizeDocuments(cellList.map((cell) => ({
                status: cell.status,
                isMandatory: cell.isMandatory,
                daysToExpiry: cell.daysToExpiry,
            })), documents),
        };
    });

    const start = (page - 1) * pageSize;
    const pageRows = matrixRows.slice(start, start + pageSize);

    return {
        columns: orderedColumns,
        rows: pageRows,
        totals,
        pagination: {
            page,
            pageSize,
            count: pageRows.length,
            // The matrix is built in memory from the scanned park, so its own total is
            // a fact; it covers the whole park only when the scan did.
            totalItems: matrixRows.length,
            totalAtLeast: matrixRows.length,
            totalExact: !park.truncated,
            hasMoreItems: start + pageSize < matrixRows.length,
            scanned: park.rows.length,
            truncated: park.truncated || computed.pagination?.truncated === true,
            // The park behind it, whose size may only be a floor.
            parkTotal: park.exact ? park.total : null,
            parkAtLeast: park.atLeast,
        },
        /** Same block as the overview — see `parkScope()` (defect L2). */
        scope: {
            suppliers: scope.refs.length,
            chunks: scope.chunks.length,
            ancestorsPerQuery: config.ancestorsPerQuery,
            dropped: scope.dropped,
            complete: scope.chunks.length === 0 || scope.complete,
            empty: scope.empty
                ? {
                    reason: 'emptyPark',
                    hint: 'No supplier matches this perimeter, so the matrix has no row'
                        + ' and no document query was run.',
                }
                : null,
        },
        filters: {
            ...park.filters,
            documentType: wantedType,
            mandatoryOnly: Boolean(params.mandatoryOnly),
        },
        // Same rule as the overview: the endpoint is named, the round-trip is
        // not paid until a screen plots a series.
        history: {
            available: false,
            endpoint: '/api/v1/monitor/history',
            series: ['taskTrend', 'taskStates', 'completion', 'incidents'],
            required: OLAP_REQUIREMENTS,
        },
        queries: {
            park: park.query,
            documents: computed.documentQuery,
            entitySuppliers: computed.joinQuery,
        },
        generatedAt: now.toISOString(),
    };
}

/* -------------------------------------------------------------------------- */
/* /monitor/campaigns (spec §4.2 screen, §4.6.1 card)                          */
/* -------------------------------------------------------------------------- */

/**
 * **Builds `GET /api/v1/monitor/campaigns`** — open referencing and renewal
 * projects, response rate, reminders and escalations.
 *
 * Reminders and escalations are **counted, not invented**: a campaign's pending
 * reminders are its overdue supplier tasks (`pjt:taskList` past `pjt:tlDue`),
 * which is the same data the notification rules of beCPG act on. Sending one is
 * `/monitor/actions`.
 *
 * Cost: 1 count + 1 project scan + 1 task scan ≈ 3 queries.
 *
 * @param {Object} params
 * @param {Object} params.session
 * @param {MonitorFilters} [params.filters]
 * @param {string[]} [params.states] project states (default: the open ones)
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize]
 * @param {string} [params.sort] `dueDate` | `completion` | `age` | `name`
 * @param {Object} [params.config]
 * @returns {Promise<Object>}
 */
export async function listCampaigns(params = {}) {
    const { session } = params;
    await requireMonitorAccess(session);

    const config = monitorConfig(params.config);
    const documents = documentConfig(params.documents);
    const filters = params.filters || {};
    const now = params.now instanceof Date ? params.now : new Date();

    const states = Array.isArray(params.states) && params.states.length > 0
        ? params.states.filter((state) => [...config.project.openStates, ...config.project.closedStates].includes(state))
        : config.project.openStates;

    const pageSize = Math.max(1, Math.min(
        Number(params.pageSize) || config.pageSize,
        config.maxPageSize,
    ));
    const page = Math.max(1, Number(params.page) || 1);

    const signature = filterSignature(filters, { states: states.join('+') });

    const computed = await memoize(session, 'campaigns', signature, config, async () => {
        // The park is only scanned when a park filter was given: campaigns are
        // attributed through `bcpg:suppliers`, not through the folder tree.
        const hasParkFilter = Object.entries(filters)
            .some(([name, value]) => value && name !== 'q');
        const park = hasParkFilter || filters.q
            ? await scanPark({ session, filters, config, documents })
            : null;
        const allowedSuppliers = park ? new Set(park.rows.map((row) => row.nodeRef)) : null;

        const campaignQuery = buildCampaignQuery(config, [], states);
        // The same memoised scan `/monitor` and `/monitor/suppliers` read, so the
        // three screens never sample two different windows of one query.
        const campaigns = await scanOpenCampaigns({ session, config, states, refresh: params.refresh });

        let rows = campaigns.items.map((node) => toCampaignRow(node, config, now));
        if (allowedSuppliers) {
            rows = rows.filter((row) => row.suppliers.some((ref) => allowedSuppliers.has(ref.nodeRef)));
        }

        // Open tasks of those campaigns → the reminders that are due. Read by
        // identifier from `pjt:projectCurrentTasks`, because a task row of a
        // list query carries no pointer back to its project.
        const { tasks, query: taskQuery } = await fetchTasksByRef({
            session,
            config,
            now,
            taskRefs: rows.flatMap((row) => row.currentTaskRefs),
        });

        return { park, rows, campaigns, tasks, campaignQuery, taskQuery };
    }, params.refresh);

    const { rows, campaigns, tasks } = computed;
    /*
     * The rows the scan brought back, **before** the park filter removed any.
     * Two different questions are answered with it below and they were conflated:
     * "did beCPG cut the listing?" (a fact about the engine) and "did the caller's
     * perimeter remove rows?" (a fact about the filter). See `scanTruncated`.
     */
    const scannedRows = campaigns.items.length;
    /** A park filter is active — the rows below are the campaigns that park owns. */
    const parkScoped = Boolean(computed.park);
    const parkEmpty = Boolean(computed.park) && computed.park.rows.length === 0;

    const enriched = rows.map((row) => ({
        ...row,
        lateTasks: row.currentTaskRefs
            .filter((ref) => tasks.get(ref)?.late === true).length,
        openTasks: row.currentTaskRefs
            .filter((ref) => tasks.get(ref)?.isOpen === true).length,
        // Graduated follow-up of spec §4.5: remind while the campaign is merely
        // late, escalate once it has been silent past the notice window.
        suggestedAction: row.unanswered
            ? (row.ageDays >= config.campaignNoAnswerAfterDays * 3 ? 'escalate' : 'remind')
            : (row.isLate ? 'remind' : null),
        href: `/monitor/campaigns/${encodeURIComponent(row.nodeRef)}`,
    }));

    const SORTERS = {
        dueDate: (a, b) => new Date(a.dueDate || '9999').getTime() - new Date(b.dueDate || '9999').getTime(),
        completion: (a, b) => a.completion - b.completion,
        age: (a, b) => (b.ageDays || 0) - (a.ageDays || 0),
        name: (a, b) => String(a.name).localeCompare(String(b.name)),
    };
    const sorter = SORTERS[params.sort] || SORTERS.dueDate;
    const sorted = [...enriched].sort(sorter);

    const start = (page - 1) * pageSize;
    const pageItems = sorted.slice(start, start + pageSize);

    const answered = enriched.filter((row) => row.completion > 0).length;
    const byState = enriched.reduce((accumulator, row) => {
        const key = row.state || 'unknown';
        accumulator[key] = (accumulator[key] || 0) + 1;
        return accumulator;
    }, {});

    /*
     * **Did beCPG cut the listing?** — and nothing else.
     *
     * This used to read `campaigns.count > enriched.length`, comparing the count of
     * the *unfiltered* campaign query with the rows left *after* the park filter. So
     * every park filter raised the flag: measured on the reference instance, `q=Maxime` gave
     * 248 campaigns scanned in full (`exact: true`, 248 ≤ scanLimit) and 10 kept, and
     * the screen answered "Fenêtre d'analyse : 10 campagne(s) lue(s) sur 248 — beCPG
     * borne une liste à 250 lignes". Nothing had been cut; the reader's own filter had
     * removed the rows, and the banner blamed the engine and advised narrowing the
     * very filter that caused it. An uncertainty mention that fires on a certainty is
     * worse than none: it teaches the reader to ignore the real ones.
     *
     * The comparison is now against the rows the scan actually returned, which is the
     * only thing that can tell truncation.
     */
    const scanTruncated = !campaigns.exact || campaigns.count > scannedRows;

    return {
        items: pageItems,
        summary: {
            /*
             * **The tiles and the list describe one population** — the defect already
             * fixed on `/monitor/quality` (see `countNcSummary()`), which was still
             * open here. `open` was `campaigns.count`, the supplier campaigns of the
             * whole instance, whatever perimeter the caller had typed: measured on
             * the reference instance, `q=Maxime` printed « CAMPAGNES OUVERTES 248 » over a list
             * of 10, and an empty perimeter printed 248 over a list of 0.
             *
             * With a park filter the campaigns are attributed to the park and `open`
             * counts those; without one, `campaigns.count` *is* the population the
             * list shows. `parkScoped` says which, so no screen has to guess.
             */
            open: parkScoped ? enriched.length : campaigns.count,
            // A park-attributed count is a fact for as long as the scan held every
            // campaign — past that, rows outside the window could belong to the park.
            openExact: campaigns.exact,
            parkScoped,
            scanned: enriched.length,
            byState,
            answered,
            unanswered: enriched.filter((row) => row.unanswered).length,
            late: enriched.filter((row) => row.isLate).length,
            /*
             * `null`, not 100, when there is no campaign to answer — the rule
             * `compliance.rate` and `buildOverview()` already follow (defect L1).
             * "0 campagnes · 100 % de réponse" awarded a perfect score to an empty
             * set, in green, on a screen whose list was empty.
             */
            responseRate: enriched.length > 0
                ? Math.round((answered / enriched.length) * 100)
                : null,
            meanCompletion: enriched.length > 0
                ? Math.round(enriched.reduce((sum, row) => sum + row.completion, 0) / enriched.length)
                : 0,
            pendingReminders: enriched.reduce((sum, row) => sum + row.lateTasks, 0),
            escalations: enriched.filter((row) => row.suggestedAction === 'escalate').length,
        },
        /**
         * The perimeter the figures above ran under, same block as `listQuality()`.
         * `empty` is a configuration fact — the filter matched no supplier — not an
         * empty result, and a screen must say so rather than show zeros that read
         * like measurements (defect L3).
         */
        scope: {
            parkScoped,
            suppliers: computed.park ? computed.park.rows.length : null,
            empty: parkEmpty
                ? {
                    reason: 'emptyPark',
                    hint: 'No supplier matches this perimeter, so no campaign can be'
                        + ' attributed to it and every figure is zero by construction.',
                }
                : null,
        },
        pagination: {
            page,
            pageSize,
            count: pageItems.length,
            // Rows enriched in memory: an exact count of what was scanned, which is
            // the whole result set unless `truncated`.
            totalItems: enriched.length,
            totalAtLeast: enriched.length,
            totalExact: !scanTruncated,
            hasMoreItems: start + pageSize < enriched.length,
            scanned: scannedRows,
            truncated: scanTruncated,
        },
        states,
        filters: computed.park ? computed.park.filters : { requested: params.filters || {}, applied: [], unsupported: [] },
        supplierScope: supplierScopeInfo(config, [config.project.type]),
        // Same rule as the overview: the endpoint is named, the round-trip is
        // not paid until a screen plots a series.
        history: {
            available: false,
            endpoint: '/api/v1/monitor/history',
            series: ['taskTrend', 'taskStates', 'completion', 'incidents'],
            required: OLAP_REQUIREMENTS,
        },
        queries: { campaigns: computed.campaignQuery, tasks: computed.taskQuery },
        generatedAt: now.toISOString(),
    };
}

/**
 * **Shape of `GET /api/v1/monitor/campaigns/{id}`.**
 *
 * @typedef {Object} MonitorCampaign
 * @property {Object} campaign   the row `/monitor/campaigns` lists, for one project
 * @property {Object[]} tasks    the project's current tasks, with their assignees
 * @property {Object[]} entities what the project is about — products and/or suppliers,
 *                               each with the portal route that opens it
 * @property {Object} queries
 * @property {string} generatedAt
 */

/**
 * **Builds `GET /api/v1/monitor/campaigns/{id}`** — one campaign, opened.
 *
 * ## Why this endpoint exists
 *
 * `/monitor/campaigns` listed campaigns and stopped there: the rows were inert,
 * and the payload already advertised `href: /monitor/campaigns/<ref>` — a route
 * nothing served. A referencing officer could see that a campaign was silent and
 * had no way, from that screen, to look at what the supplier had actually
 * entered or at what had been said to them. The answer was three screens away,
 * through the supplier sheet, and only when the campaign happened to name a
 * supplier.
 *
 * What it returns is deliberately **not** a second campaign model: the campaign
 * block is `toCampaignRow` — the very row the list renders — so the two screens
 * can never disagree about a completion rate or a due date. What it adds is the
 * two things a list cannot carry: the tasks (who owes what, and is it late) and
 * the entities, each resolved to the portal route that opens it.
 *
 * Three db-afts queries: the project, its current tasks, its entities.
 *
 * @param {Object} params
 * @param {Object} params.session
 * @param {string} params.campaignRef project nodeRef
 * @param {Object} [params.config]
 * @param {Date} [params.now]
 * @returns {Promise<MonitorCampaign>}
 * @throws {NotFoundError} when the nodeRef is not a supplier campaign
 */
export async function getCampaign(params = {}) {
    const { session } = params;
    await requireMonitorAccess(session);

    const config = monitorConfig(params.config);
    const now = params.now instanceof Date ? params.now : new Date();
    const campaignRef = String(params.campaignRef || '').trim();
    if (!isNodeRef(campaignRef)) {
        throw new BadRequestError('A valid campaign nodeRef is required');
    }

    /*
     * `supplierScopeClause` is kept, exactly as in `buildCampaignQuery`: this
     * endpoint must open a *supplier campaign* and nothing else. Without it the
     * route would read any `pjt:project` of the instance by nodeRef — every R&D
     * or industrialisation project — which is precisely the leak the aspect
     * clause exists to prevent on the list.
     */
    const query = and([
        `TYPE:"${config.project.type}"`,
        supplierScopeClause(config),
        idClause([campaignRef]),
    ]);
    const { items } = await searchNodes(query, {
        session,
        fields: campaignFields(config),
        maxResults: 1,
    });
    if (items.length === 0) {
        throw new NotFoundError('Unknown campaign in this perimeter', {
            details: { campaign: campaignRef.slice(0, 80) },
        });
    }

    const campaign = toCampaignRow(items[0], config, now);

    const { tasks, query: taskQuery } = await fetchTasksByRef({
        session,
        config,
        now,
        taskRefs: campaign.currentTaskRefs,
    });

    /*
     * **The entities, and where they open.**
     *
     * A supplier campaign points at whatever it is about, and that is not always a
     * product: measured on the local instance, `supplier1 - REFERENCING - 2026`
     * names a `bcpg:supplier`. So the route is chosen from the *type* — the
     * supplier sheet for a supplier, the product sheet otherwise — rather than
     * assumed. A reference we cannot type gets no route at all instead of a
     * plausible-looking 404.
     */
    const entityRefs = campaign.entities.map((ref) => ref.nodeRef).filter(Boolean);
    let entities = [];
    let entityQuery = null;
    if (entityRefs.length > 0) {
        entityQuery = idClause(entityRefs);
        const found = await searchNodes(entityQuery, {
            session,
            fields: 'cm:name,bcpg:code,bcpg:productState',
            maxResults: Math.min(config.scanLimit, entityRefs.length * 2),
        }).catch(() => ({ items: [] }));

        const byRef = new Map(found.items.map((node) => [node.nodeRef, node]));
        entities = campaign.entities.map((ref) => {
            const node = byRef.get(ref.nodeRef);
            const attributes = (node && node.attributes) || {};
            const type = (node && node.type) || ref.type || null;
            const uuid = ref.nodeRef.split('/').pop();
            return {
                nodeRef: ref.nodeRef,
                name: (node && node.name) || attributes['cm:name'] || ref.label || '',
                code: attributes['bcpg:code'] || null,
                state: attributes['bcpg:productState'] || null,
                type,
                href: type === config.supplierType
                    ? `/monitor/suppliers/${encodeURIComponent(ref.nodeRef)}`
                    : type
                        ? `/products/${encodeURIComponent(uuid)}`
                        : null,
                // False when the node was not returned: the reference exists on the
                // project but this account may not read its target, and an empty
                // row must say so rather than look like a missing name.
                readable: Boolean(node),
            };
        });
    }

    return {
        campaign,
        tasks: campaign.currentTaskRefs
            .map((ref) => tasks.get(ref))
            .filter(Boolean),
        entities,
        queries: { campaign: query, tasks: taskQuery, entities: entityQuery },
        generatedAt: now.toISOString(),
    };
}

/* -------------------------------------------------------------------------- */
/* /monitor/quality (spec §4.6.5 quality view)                                 */
/* -------------------------------------------------------------------------- */

/**
 * The three headline NC counters of `/monitor/quality`, over **one population**.
 *
 * ## Why this is no longer three unscoped count queries (defect L1, this screen)
 *
 * `open`, `blocking` and `total` used to be three `countNodes()` calls with no
 * park restriction at all, while the list under them was scanned and *then*
 * filtered by the park. A `qa:nc` is **not** a descendant of its supplier — it
 * lives in `/Espace racine/Qualité/Non conformités` — so `ANCESTOR:` cannot
 * narrow it, and the three queries answered about the whole instance whatever
 * perimeter the officer had typed.
 *
 * Measured on the reference instance, the 14 suppliers the test supplier account can see:
 *
 * ```
 * instance-wide            : open 5, blocking 2, total 6   (all exact)
 * attributable to that park: 0 of the 6
 * ```
 *
 * So a perimeter entered in « Rechercher un fournisseur » produced an **empty
 * list under tiles reading « 5 NC ouvertes · 2 bloquantes »**. Worse, inside the
 * same `StatGrid` the two other tiles — « Au-delà du délai » and « Délai moyen »
 * — *did* follow the filtered rows, because they are computed from them. Four
 * tiles, two populations, and nothing on the screen saying so.
 *
 * The rule applied here is the one `compliance.rate` and the approval breakdown
 * already follow: **one population, not two windows.** With a park filter the
 * counters are derived from the NC rows the park actually owns; without one they
 * stay the three count queries — exact, cheap, and about the whole instance,
 * which is then exactly what the screen displays.
 *
 * This is deliberately *not* the same thing as the state/type filters, which
 * narrow "the rows an officer works on" and are meant to leave the tiles alone
 * (see the note at the top of `app/monitor/quality/page.js`). A park filter
 * narrows the **perimeter**, and a counter for another perimeter is not an
 * imprecise figure, it is a figure about someone else.
 *
 * An **empty park runs zero queries** and returns hard zeros (defect L2): a
 * perimeter that matches no supplier cannot own a non-zero NC counter.
 *
 * Exported for the same reason {@link countCompliance} is: "the tiles and the
 * list describe one population" is part of the contract, and a reviewer must be
 * able to exercise it against a real instance without holding a monitoring
 * group — `listQuality()` itself is gated by {@link requireMonitorAccess}.
 *
 * @param {Object} params `{ session, config, allQuery, allowedSuppliers, parkEmpty }`
 *   — `allowedSuppliers` is `null` when no park filter is active
 * @returns {Promise<{open: number, blocking: number, total: number,
 *                    exact: boolean, parkScoped: boolean, empty: boolean}>}
 */
export async function countNcSummary(params) {
    const { session, config, allQuery, allowedSuppliers, parkEmpty } = params;

    // No perimeter: the three count queries, unchanged.
    if (!allowedSuppliers) {
        const [open, blocking, all] = await Promise.all([
            countNodes(buildNcQuery(config, {}), { session, fields: config.nc.stateProp }),
            countNodes(buildNcQuery(config, { blockingOnly: true }), {
                session, fields: config.nc.priorityProp,
            }),
            countNodes(allQuery, { session, fields: config.nc.stateProp }),
        ]);
        return {
            open: open.count,
            blocking: blocking.count,
            total: all.count,
            exact: open.exact && blocking.exact && all.exact,
            parkScoped: false,
            empty: false,
        };
    }

    // An empty perimeter runs nothing at all (defect L2).
    if (parkEmpty) {
        return { open: 0, blocking: 0, total: 0, exact: true, parkScoped: true, empty: true };
    }

    // A perimeter: one scan of the NC population, attributed to the park. One
    // query instead of three, and every tile drawn from the same rows.
    const population = await countNodes(allQuery, {
        session,
        fields: [config.nc.stateProp, config.nc.priorityProp, config.nc.supplierAssoc].join(','),
        sample: config.scanLimit,
    });

    let open = 0;
    let blocking = 0;
    let total = 0;
    for (const node of population.items) {
        const attributes = node.attributes || {};
        const owners = assocRefs(attributes, config.nc.supplierAssoc);
        if (!owners.some((ref) => allowedSuppliers.has(ref.nodeRef))) {
            continue;
        }
        total += 1;
        // `buildNcQuery(config, {})` is "not closed", and `blockingOnly` adds the
        // priority clause *on top of it* — so a closed blocking NC counts in
        // neither. Derived the same way, or the tiles would disagree with the
        // queries they replace.
        if (config.nc.closedStates.includes(attributes[config.nc.stateProp] || null)) {
            continue;
        }
        open += 1;
        if (config.nc.blockingPriorities.includes(Number(attributes[config.nc.priorityProp]))) {
            blocking += 1;
        }
    }

    return {
        open,
        blocking,
        total,
        // Derived from a scan: a fact only for as long as the scan held every NC.
        exact: population.exact,
        parkScoped: true,
        empty: false,
    };
}

/**
 * **Builds `GET /api/v1/monitor/quality`** — supplier non-conformities
 * (`qa:nc`), their corrective actions and the processing delay.
 *
 * Counters are count queries; the page is one scan. The **processing delay** is
 * `now − cm:created` for an open NC and `cm:modified − cm:created` for a closed
 * one: beCPG stores no dedicated closure date, and inventing one would be
 * inventing data (spec rule R2 — business logic stays in beCPG).
 *
 * Corrective actions are the `pjt:taskList` rows hanging under the NC entities,
 * which is how beCPG models them — no parallel notion of "action".
 *
 * Cost: 1 NC scan + 1 action scan, plus the headline counters — 3 count queries
 * without a park filter, **1 scan** with one (see {@link countNcSummary}), and
 * none at all when the perimeter is empty.
 *
 * @param {Object} params
 * @param {Object} params.session
 * @param {MonitorFilters} [params.filters]
 * @param {string} [params.state] one `qa:ncState`
 * @param {string} [params.ncType] one `qa:ncType`
 * @param {boolean} [params.includeClosed]
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize]
 * @param {Object} [params.config]
 * @returns {Promise<Object>}
 */
export async function listQuality(params = {}) {
    const { session } = params;
    await requireMonitorAccess(session);

    const config = monitorConfig(params.config);
    const documents = documentConfig(params.documents);
    const filters = params.filters || {};
    const now = params.now instanceof Date ? params.now : new Date();

    const pageSize = Math.max(1, Math.min(
        Number(params.pageSize) || config.pageSize,
        config.maxPageSize,
    ));
    const page = Math.max(1, Number(params.page) || 1);

    const signature = filterSignature(filters, {
        state: params.state || '',
        ncType: params.ncType || '',
        includeClosed: params.includeClosed ? '1' : '',
    });

    const computed = await memoize(session, 'quality', signature, config, async () => {
        const hasParkFilter = Object.values(filters).some(Boolean);
        const park = hasParkFilter ? await scanPark({ session, filters, config, documents }) : null;
        const allowedSuppliers = park ? new Set(park.rows.map((row) => row.nodeRef)) : null;

        const listQueryOptions = {
            states: params.state ? [params.state] : undefined,
            includeClosed: Boolean(params.includeClosed),
            ncType: params.ncType || null,
        };
        const ncQuery = buildNcQuery(config, listQueryOptions);
        const allQuery = buildNcQuery(config, { includeClosed: true });

        const ncFields = [
            'cm:name',
            'cm:created',
            'cm:modified',
            'bcpg:code',
            config.nc.stateProp,
            config.nc.typeProp,
            config.nc.priorityProp,
            config.nc.costProp,
            config.nc.supplierAssoc,
            // What the NC says about itself. `qa:ncComment` was declared in the
            // configuration and asked for nowhere: the screen listed
            // non-conformities nobody could read — a code, a type, a priority,
            // and not one word on what happened. Two more fields on a query
            // already issued, no extra call.
            config.nc.commentProp,
            'cm:description',
        ].join(',');

        const [listed, ncSummary] = await Promise.all([
            countNodes(ncQuery, { session, fields: ncFields, sample: config.scanLimit }),
            // The headline counters, over the population the list below shows —
            // never a second, wider one. See `countNcSummary()`.
            countNcSummary({
                session,
                config,
                allQuery,
                allowedSuppliers,
                parkEmpty: Boolean(park) && park.rows.length === 0,
            }),
        ]);

        let rows = listed.items.map((node) => {
            const attributes = node.attributes || {};
            const state = attributes[config.nc.stateProp] || null;
            const createdAt = attributes['cm:created'] || null;
            const modifiedAt = attributes['cm:modified'] || null;
            const isClosed = config.nc.closedStates.includes(state);
            const reference = isClosed ? new Date(modifiedAt || now) : now;
            const delayDays = createdAt
                ? Math.max(0, Math.floor((reference.getTime() - new Date(createdAt).getTime()) / MS_PER_DAY))
                : null;
            const priority = Number(attributes[config.nc.priorityProp]);

            return {
                nodeRef: node.nodeRef,
                id: node.id,
                name: node.name,
                code: attributes['bcpg:code'] || null,
                state,
                ncType: attributes[config.nc.typeProp] || null,
                priority: Number.isFinite(priority) ? priority : null,
                blocking: config.nc.blockingPriorities.includes(priority),
                cost: Number.isFinite(Number(attributes[config.nc.costProp]))
                    ? Number(attributes[config.nc.costProp])
                    : null,
                suppliers: assocRefs(attributes, config.nc.supplierAssoc),
                // The text of the NC, as quality wrote it. `null` when it is
                // empty — never an empty string, which the screen would render as
                // a blank paragraph.
                comment: attributes[config.nc.commentProp] || null,
                description: attributes['cm:description'] || null,
                createdAt,
                modifiedAt,
                isClosed,
                delayDays,
                overdue: !isClosed && delayDays !== null && delayDays > config.nc.overdueAfterDays,
                correctiveActions: [],
            };
        });

        if (allowedSuppliers) {
            rows = rows.filter((row) => row.suppliers.some((ref) => allowedSuppliers.has(ref.nodeRef)));
        }

        // --- corrective actions ---------------------------------------------
        // In beCPG a corrective action is a project task on the NC's treatment
        // project: `pjt:project.pjt:projectEntity → qa:nc`. Attribution has to
        // go **project → NC → task**, because neither a task row nor an NC row
        // of a list query carries a pointer to the other (the remote visitor
        // emits no path on `ENTITY_LIST` rows). Two bounded queries:
        //   1. the projects whose `pjt:projectEntity` is one of the listed NCs;
        //   2. their `pjt:projectCurrentTasks`, read by identifier.
        //
        // This one query is deliberately **not** supplier-restricted: it is a
        // join, not a listing. An NC treatment project is created from the
        // quality templates, which do not carry `bcpg:suppliersAspect`, so
        // restricting it would silently drop the corrective actions. Nothing
        // leaks: every row is kept only when its `pjt:projectEntity` is one of
        // the already supplier-restricted NCs of `ncRefs`.
        const ncRefs = new Set(rows.map((row) => row.nodeRef));
        const projectQuery = buildCampaignQuery(config, [], [
            ...config.project.openStates,
            ...config.project.closedStates,
        ], { supplierOnly: false });
        let actionQuery = null;

        if (ncRefs.size > 0) {
            const projects = await searchNodes(projectQuery, {
                session,
                fields: campaignFields(config),
                maxResults: config.scanLimit,
            }).catch(() => ({ items: [] }));

            const taskOwner = new Map();
            for (const node of projects.items) {
                const attributes = node.attributes || {};
                const owned = assocRefs(attributes, config.project.entityAssoc)
                    .map((ref) => ref.nodeRef)
                    .filter((ref) => ncRefs.has(ref));
                if (owned.length === 0) {
                    continue;
                }
                for (const taskRef of assocRefs(attributes, config.project.currentTasksAssoc)) {
                    taskOwner.set(taskRef.nodeRef, owned);
                }
            }

            const { tasks, query } = await fetchTasksByRef({
                session,
                config,
                now,
                taskRefs: [...taskOwner.keys()],
            });
            actionQuery = query;

            const rowByRef = new Map(rows.map((row) => [row.nodeRef, row]));
            for (const [taskRef, owners] of taskOwner) {
                const task = tasks.get(taskRef);
                if (!task) {
                    continue;
                }
                for (const ncRef of owners) {
                    rowByRef.get(ncRef)?.correctiveActions.push(task);
                }
            }
        }

        return { park, rows, listed, ncSummary, ncQuery, actionQuery };
    }, params.refresh);

    const { rows, listed, ncSummary } = computed;

    const sorted = [...rows].sort((a, b) => {
        if (a.blocking !== b.blocking) {
            return a.blocking ? -1 : 1;
        }
        return (b.delayDays || 0) - (a.delayDays || 0);
    });
    const start = (page - 1) * pageSize;
    const pageItems = sorted.slice(start, start + pageSize);

    const openRows = rows.filter((row) => !row.isClosed);
    const closedRows = rows.filter((row) => row.isClosed);
    const mean = (list) => (list.length > 0
        ? Math.round(list.reduce((sum, row) => sum + (row.delayDays || 0), 0) / list.length)
        : null);

    const byState = rows.reduce((accumulator, row) => {
        const key = row.state || 'unknown';
        accumulator[key] = (accumulator[key] || 0) + 1;
        return accumulator;
    }, {});

    return {
        items: pageItems,
        summary: {
            open: ncSummary.open,
            blocking: ncSummary.blocking,
            total: ncSummary.total,
            closed: Math.max(0, ncSummary.total - ncSummary.open),
            byState,
            overdue: openRows.filter((row) => row.overdue).length,
            meanOpenDelayDays: mean(openRows),
            meanClosingDelayDays: mean(closedRows),
            correctiveActions: {
                total: rows.reduce((sum, row) => sum + row.correctiveActions.length, 0),
                late: rows.reduce(
                    (sum, row) => sum + row.correctiveActions.filter((action) => action.late).length,
                    0,
                ),
            },
            exact: ncSummary.exact,
            /**
             * Whether the four tiles above and the list below describe the **same**
             * population. True when a park filter is active — the counters are then
             * derived from the NC rows the park owns. False when there is no park
             * filter, and the whole instance is both the perimeter and the list.
             * Never a mix of the two (defect L1 on this screen).
             */
            parkScoped: ncSummary.parkScoped,
        },
        /**
         * The perimeter the counters ran under. `empty` is a configuration fact,
         * not an empty result: the filter matched no supplier, so no query ran
         * and every figure is a zero by construction (defect L2/L3).
         */
        scope: {
            parkScoped: ncSummary.parkScoped,
            suppliers: computed.park ? computed.park.rows.length : null,
            empty: ncSummary.empty
                ? {
                    reason: 'emptyPark',
                    hint: 'No supplier matches this perimeter, so every counter is'
                        + ' zero by construction and no query was run.',
                }
                : null,
        },
        pagination: {
            page,
            pageSize,
            count: pageItems.length,
            // Non-conformities are listed then paginated in memory: an exact count of
            // the scan, which is everything unless `truncated`.
            totalItems: rows.length,
            totalAtLeast: rows.length,
            /*
             * **Truncation is a fact about the engine, never about the filter.**
             * Both flags used to compare `listed.count` — the count of the *unfiltered*
             * NC query — with `rows`, which the park filter had already narrowed. Any
             * perimeter therefore raised them: measured on the reference instance, `q=Philippe`
             * scanned all 11 non-conformities of the instance (`exact: true`), kept the
             * 4 that park owns, and the screen still said "Plus de NC que la fenêtre
             * d'analyse (4 analysées) : affinez les filtres" — a cap that had not been
             * hit, and advice to narrow the filter that had done the narrowing.
             * The comparison is now against the rows the scan brought back.
             */
            totalExact: listed.exact && listed.count <= listed.items.length,
            hasMoreItems: start + pageSize < rows.length,
            scanned: rows.length,
            truncated: !listed.exact || listed.count > listed.items.length,
        },
        filters: computed.park
            ? computed.park.filters
            : { requested: filters, applied: [], unsupported: [] },
        supplierScope: supplierScopeInfo(config, [config.nc.type]),
        // Same rule as the overview: the endpoint is named, the round-trip is
        // not paid until a screen plots a series.
        history: {
            available: false,
            endpoint: '/api/v1/monitor/history',
            series: ['taskTrend', 'taskStates', 'completion', 'incidents'],
            required: OLAP_REQUIREMENTS,
        },
        queries: { nonConformities: computed.ncQuery, correctiveActions: computed.actionQuery },
        generatedAt: now.toISOString(),
    };
}

/* -------------------------------------------------------------------------- */
/* /monitor/actions (spec §4.6.1, §4.6.7)                                      */
/* -------------------------------------------------------------------------- */

/**
 * The three bulk actions of the monitoring space, and **the existing mechanism
 * each one reuses**. There is no parallel notification engine, no status
 * property and no portal-owned state (spec §4.6.7, §7.1).
 *
 * | Action     | Mechanism reused                                              |
 * |------------|---------------------------------------------------------------|
 * | `remind`   | the Alfresco **forum** of the target node — the very thread `/messages` reads and Share renders. A message lands in the supplier's portal, and Alfresco's own activity/notification subscriptions carry it by mail. |
 * | `escalate` | the same forum, on the **project** rather than on the supplier, prefixed so the internal referent sees it in Share; the referent is `pjt:projectManager`, `cm:owner` otherwise. |
 * | `suspend`  | the approval status is **derived and never persisted** (spec §5.4.3), so nothing can be written to it. Suspension therefore starts the client's suspension / non-conformity process through `becpg/supplier/send-to-supplier`, exactly like `/process/start`; the derived status flips on its own once beCPG holds the blocking NC. |
 * @readonly
 */
export const MONITOR_ACTIONS = Object.freeze({
    REMIND: 'remind',
    ESCALATE: 'escalate',
    SUSPEND: 'suspend',
});

/** Marker written into the comment title, so both front ends can filter on it. */
const ACTION_TITLE_PREFIX = 'monitor:';

/**
 * Posts a message on a node's forum — the mechanism `/messages` already uses.
 *
 * @param {Object} params `{ session, nodeRef, title, content }`
 * @returns {Promise<Object>} the created comment, as beCPG returned it
 */
async function postForumMessage(params) {
    const { session, nodeRef, title, content } = params;
    return becpgJson(`api/node/${nodeRefToPath(nodeRef)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title,
            content,
            page: 'portal',
            pageParams: JSON.stringify({ nodeRef }),
            nodeRef,
        }),
        session,
        // Posting a message is not idempotent: never replay it.
        retries: 0,
        skipAllowList: true,
    });
}

/**
 * **Runs `POST /api/v1/monitor/actions`** — bulk reminder, escalation,
 * suspension (spec §4.6.1).
 *
 * Bulk semantics: every target is attempted, the outcome is reported per target,
 * and one failure never rolls back the others. The whole call answers 200 with a
 * summary; a malformed request answers 400 and an unauthorised one 403.
 *
 * **Every target is checked against the caller's perimeter first**, with one
 * db-afts query (`TYPE:"bcpg:supplier" AND (ID:… OR ID:…)`): a nodeRef the
 * session cannot read is rejected before any write.
 *
 * @param {Object} params
 * @param {Object} params.session
 * @param {string} params.action one of {@link MONITOR_ACTIONS}
 * @param {string[]} params.suppliers supplier nodeRefs
 * @param {string} [params.message] body of the reminder / escalation
 * @param {string} [params.process] allow-listed process id, for `suspend`
 * @param {Object} [params.templates] `{ id -> nodeRef }` allow-list (injected by
 *   the route from `PORTAL_PROCESS_TEMPLATES`, so there is exactly one list)
 * @param {Object} [params.config]
 * @returns {Promise<{action: string, results: Object[], summary: Object, executedAt: string}>}
 */
export async function runMonitorActions(params = {}) {
    const { session } = params;
    await requireMonitorAccess(session);

    const config = monitorConfig(params.config);
    const action = String(params.action || '').trim();
    if (!Object.values(MONITOR_ACTIONS).includes(action)) {
        throw new BadRequestError('Unknown action', {
            details: { allowed: Object.values(MONITOR_ACTIONS) },
        });
    }

    const requested = [...new Set((params.suppliers || [])
        .filter((value) => isNodeRef(value))
        .map((value) => String(value)))];
    if (requested.length === 0) {
        throw new BadRequestError('At least one supplier nodeRef is required');
    }
    if (requested.length > config.maxActionTargets) {
        throw new BadRequestError(`At most ${config.maxActionTargets} suppliers per call`);
    }

    const message = String(params.message || '').trim().slice(0, config.maxActionMessage);
    if ((action === MONITOR_ACTIONS.REMIND || action === MONITOR_ACTIONS.ESCALATE) && !message) {
        throw new BadRequestError('A reminder or an escalation needs a message');
    }

    // --- perimeter guard: one query for every target ------------------------
    const guardQuery = and([`TYPE:"${config.supplierType}"`, idClause(requested)]);
    const { items } = await searchNodes(guardQuery, {
        session,
        fields: config.supplierFields.join(','),
        maxResults: Math.min(requested.length, config.scanLimit),
    });
    const allowed = new Map(items.map((node) => [node.nodeRef, toSupplierRow(node, config)]));

    // --- suspension: resolve the allow-listed process once -------------------
    let templateRef = null;
    if (action === MONITOR_ACTIONS.SUSPEND) {
        const templates = params.templates instanceof Map
            ? params.templates
            : new Map(Object.entries(params.templates || {}));
        if (templates.size === 0) {
            throw new ForbiddenError(
                'No suspension process is configured on this instance (PORTAL_PROCESS_TEMPLATES)',
                { details: { allowed: [] } },
            );
        }
        const wanted = String(params.process || 'supplier-suspension').trim();
        templateRef = templates.get(wanted) || null;
        if (!templateRef) {
            throw new ForbiddenError('This process is not open to the monitoring space', {
                details: { allowed: [...templates.keys()].filter((key) => !isNodeRef(key)) },
            });
        }
    }

    const results = [];
    for (const supplierRef of requested) {
        const supplier = allowed.get(supplierRef);
        if (!supplier) {
            results.push({
                supplier: supplierRef,
                ok: false,
                error: 'notFound',
                message: 'Unknown supplier in this perimeter',
            });
            continue;
        }

        try {
            if (action === MONITOR_ACTIONS.REMIND) {
                await postForumMessage({
                    session,
                    nodeRef: supplierRef,
                    title: `${ACTION_TITLE_PREFIX}remind`,
                    content: message,
                });
                results.push({
                    supplier: supplierRef, name: supplier.name, ok: true, mechanism: 'forum',
                });
            }
            else if (action === MONITOR_ACTIONS.ESCALATE) {
                // Escalation is internal: the referent is named in the message so
                // it reaches them through the same subscription as any remark.
                const referent = supplier.buyer ? `@${supplier.buyer} ` : '';
                await postForumMessage({
                    session,
                    nodeRef: supplierRef,
                    title: `${ACTION_TITLE_PREFIX}escalate`,
                    content: `${referent}${message}`,
                });
                results.push({
                    supplier: supplierRef,
                    name: supplier.name,
                    ok: true,
                    mechanism: 'forum',
                    referent: supplier.buyer || null,
                });
            }
            else {
                const started = await becpgJson('becpg/supplier/send-to-supplier', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    query: { tplNodeRef: templateRef, entityNodeRef: supplierRef },
                    body: JSON.stringify({ projectTpl: templateRef }),
                    session,
                    retries: 0,
                });
                results.push({
                    supplier: supplierRef,
                    name: supplier.name,
                    ok: true,
                    mechanism: 'sendToSupplier',
                    projectNodeRef: started?.persistedObject || null,
                });
            }
        }
        catch (error) {
            results.push({
                supplier: supplierRef,
                name: supplier.name,
                ok: false,
                error: error.code || 'upstream',
                message: error.message,
            });
        }
    }

    // A reminder does not change a status, but a suspension does — and both make
    // the cached park stale.
    invalidateApproval(session, requested);
    invalidateMonitorCache(session);

    const succeeded = results.filter((result) => result.ok).length;
    logDebug('monitor.actions', { action, targets: requested.length, succeeded });

    return {
        action,
        results,
        summary: {
            requested: requested.length,
            succeeded,
            failed: results.length - succeeded,
        },
        executedAt: new Date().toISOString(),
    };
}

/* -------------------------------------------------------------------------- */
/* CSV export                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Serialises rows as RFC 4180 CSV, with a UTF-8 BOM so Excel opens accented
 * labels correctly without an import dialog.
 *
 * @param {Array<{key: string, label: string, get?: (row: Object) => *}>} columns
 * @param {Object[]} rows
 * @param {Object} [options] `{ separator = ',' , bom = true }`
 * @returns {string}
 *
 * @example
 * toCsv([{ key: 'name', label: 'Fournisseur' }], [{ name: 'Bio Ingredients' }]);
 */
export function toCsv(columns, rows, options = {}) {
    const separator = options.separator || ',';
    const escape = (value) => {
        if (value === null || value === undefined) {
            return '';
        }
        const text = value instanceof Date ? value.toISOString() : String(value);
        return /["\n\r]|,|;|\t/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const lines = [columns.map((column) => escape(column.label)).join(separator)];
    for (const row of rows) {
        lines.push(columns
            .map((column) => escape(column.get ? column.get(row) : row[column.key]))
            .join(separator));
    }
    return `${options.bom === false ? '' : '﻿'}${lines.join('\r\n')}\r\n`;
}

/** Columns of the `/monitor/suppliers?format=csv` export (spec §4.6.2). */
export const SUPPLIER_CSV_COLUMNS = Object.freeze([
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Fournisseur' },
    { key: 'legalName', label: 'Raison sociale' },
    { key: 'approvalStatus', label: 'Statut agrément', get: (row) => row.approval.statusLabel },
    { key: 'approvalReasons', label: 'Motifs', get: (row) => row.approval.reasons.join(' | ') },
    { key: 'completion', label: 'Complétude (%)' },
    { key: 'risk', label: 'Risque', get: (row) => row.risk.score },
    { key: 'riskLevel', label: 'Niveau de risque', get: (row) => row.risk.level },
    { key: 'documentsExpired', label: 'Documents expirés', get: (row) => row.metrics.documentsExpired },
    { key: 'documentsExpiring', label: 'Documents expirants', get: (row) => row.metrics.documentsExpiring },
    { key: 'documentsMissing', label: 'Documents manquants', get: (row) => row.metrics.documentsMissing },
    { key: 'openNc', label: 'NC ouvertes', get: (row) => row.metrics.openNc },
    { key: 'openProjects', label: 'Projets ouverts', get: (row) => row.metrics.openProjects },
    { key: 'family', label: 'Famille', get: (row) => (row.family ? row.family.label || '' : '') },
    { key: 'buyer', label: 'Acheteur référent' },
    { key: 'lastActivity', label: 'Dernière activité' },
    { key: 'state', label: 'État' },
]);

/**
 * Flattens the document matrix into CSV rows — one line per supplier, one column
 * per document type, which is the layout a quality team prints (spec §4.6.3).
 *
 * @param {MonitorDocumentMatrix} matrix
 * @returns {{columns: Object[], rows: Object[]}}
 */
export function documentMatrixToCsv(matrix) {
    const columns = [
        { key: 'code', label: 'Code', get: (row) => row.supplier.code },
        { key: 'name', label: 'Fournisseur', get: (row) => row.supplier.name },
        { key: 'buyer', label: 'Acheteur référent', get: (row) => row.supplier.buyer },
        { key: 'completeness', label: 'Conformité (%)', get: (row) => row.summary.completeness },
        ...matrix.columns.map((column) => ({
            key: column.nodeRef || column.label,
            label: column.label,
            get: (row) => {
                const cell = row.cells[column.nodeRef || 'untyped'];
                if (!cell) {
                    return '';
                }
                return cell.validTo ? `${cell.status} (${String(cell.validTo).slice(0, 10)})` : cell.status;
            },
        })),
    ];
    return { columns, rows: matrix.rows };
}
