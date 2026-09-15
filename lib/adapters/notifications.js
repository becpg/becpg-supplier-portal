/**
 * Domain adapter — **in-app notifications** (spec §4.3, weakness F4).
 *
 * **No new engine, no new data.** beCPG already owns notification *emission*
 * (`NotificationRuleService` + `NotificationRuleJob`, multi-tenant, configurable per
 * tenant, with a standard "documents expiring in less than 90 days" rule). What was
 * missing is a place for the supplier to land: the loop stops at an email sent to the
 * client. This adapter **composes** that landing zone out of data the supplier already
 * has, and stores nothing — there is no read/unread state, because that would be
 * portal-owned state and holding none is what lets both portals coexist (spec §7.1).
 *
 * ## What a supplier is notified about — and what it is NOT (defect B4)
 *
 * The previous composition counted **everything the account could read**: one supplier
 * account saw **456** notifications. That is not a leak — the account really may read
 * those nodes — it is a scoping mistake, twice over, and both halves are visible in the
 * code that produced it:
 *
 *  1. **tasks.** The query was `TYPE:"pjt:taskList" AND (open states) AND
 *     pjt:tlDue:[MIN TO now]`, restricted by `ANCESTOR` to the *supplier* nodes the
 *     account could read. Two failure modes, no correct one in between:
 *       - `pjt:taskList` rows are **not** under the supplier node.
 *         `SupplierPortalServiceImpl.createSupplierProject()` files the project under the
 *         project template's `bcpg:entityTplDefaultDest` (a Share site), and only the
 *         *branched entity* under `getOrCreateSupplierDestFolder(supplier)`. So with a
 *         non-empty `ANCESTOR` the task half returned **nothing**;
 *       - `resolveScope()` drops the `ANCESTOR` clause when the readable supplier set is
 *         empty or larger than `maxScopeAncestors` (25) — and then the very same query
 *         counted **every overdue task of the instance the account could read**,
 *         including the client's own tasks. The endpoint even computed `assignedToMe`
 *         per row… and never filtered on it.
 *  2. **documents.** The scope came from `resolveSupplierScope()`, i.e.
 *     `TYPE:"bcpg:supplier"` **ACL-filtered** — the suppliers the account may *read*,
 *     not the ones it *acts for*. Same `> 25` collapse: past that the notification set
 *     became every `bcpg:documentAspect` node in the instance the account could read.
 *
 * The rule this module applies instead — an *identity*, never a permission:
 *
 * | included                                                        | source |
 * |-----------------------------------------------------------------|--------|
 * | tasks **assigned to me** and overdue                             | the two sources of `listMyTasks()` — `api/task-instances?authority=<me>` and `pjt:tlResourcesAssocIndex:"<my cm:person>"` |
 * | documents of **my** supplier's tree: expired, refused, expiring   | `ANCESTOR:"<my supplier>"` — the folder beCPG files a supplier's entities and documents in |
 * | documents **expected and mandatory** (`Simulation` + `isMandatory`) | idem |
 *
 * | excluded                                          | why |
 * |---------------------------------------------------|-----|
 * | tasks of my projects assigned to someone else      | not mine to do; they are not in "Mes tâches" either |
 * | anything under a supplier I can read but do not act for | readable ≠ mine |
 * | expected documents that are **optional**            | nothing is owed; `NOTIFICATION_CONFIG.missingRequiresMandatory` |
 * | `toValidate` documents                              | provided; the ball is in the client's court |
 * | discussions                                         | there is no read state anywhere (spec §7.1), so "unread" cannot be computed; a date-based rule would notify the same message for ever. The panel links to `/messages` instead |
 *
 * **The badge and the panel are one set.** `counts.total` is the size of the set this
 * module enumerates — the very list `items` is a window on — and it is bounded by
 * `NOTIFICATION_CONFIG.limit`, so a caller asking for that many gets all of it.
 * `counts.listed` / `counts.hidden` name the window, and `counts.exact` is false when a
 * scan ceiling was hit, in which case `counts.total` is a **floor** (same three-field
 * contract as every other total of the portal — `readListTotal()` in `tasks.js`).
 *
 * Server only.
 */

import { logWarn } from '@/lib/http';
import { listMyTasks } from '@/lib/adapters/tasks';
import {
    createBecpgClient,
    getMyGroups,
    isSupplierAccount,
    resolveMySuppliers,
    suppliersFromGroups,
} from '@/lib/adapters/session';
import {
    buildDocumentQuery,
    documentConfig,
    searchAllNodes,
    toDocument,
} from '@/lib/adapters/documents';

/**
 * Composition rules, in one place so a tenant can retune the portal's own notification
 * vocabulary without touching the code below.
 */
export const NOTIFICATION_CONFIG = {
    /**
     * Document statuses that deserve a notification, with their severity. A status
     * absent from this map is never notified — see the exclusion table above.
     */
    documentSeverity: {
        expired: 'danger',
        missing: 'danger',
        refused: 'danger',
        expiring: 'warning',
    },
    /**
     * `missing` means "expected, never provided" (`bcpg:documentState = Simulation`).
     * beCPG's `DocumentFormulationHandler` creates one such placeholder per document
     * type of the entity's list, optional ones included, so notifying on all of them
     * turns the bell into a catalogue of everything that *could* be uploaded. Only the
     * mandatory ones are something the supplier owes.
     */
    missingRequiresMandatory: true,
    /** An overdue task becomes `danger` past this many days. */
    taskDangerAfterDays: 7,
    /**
     * Hard bound on the enumerated set. `counts.total` never exceeds it, and past it
     * the payload says `exact: false` rather than pretending to a number.
     */
    limit: 50,
    /** Candidate tasks scanned before the overdue filter. */
    taskScan: 200,
    /**
     * Supplier sub-trees per document query. `ancestorClause()` builds an `OR` of
     * `ANCESTOR:` terms; beyond this the disjunction stops being a sensible predicate,
     * so the scope is **split into several queries** — never dropped, which is what
     * turned the old scope into "the whole instance".
     */
    ancestorsPerQuery: 25,
    /** Most document queries a single call may fan out to (`ancestorsPerQuery` each). */
    maxQueries: 4,
};

/**
 * @typedef {Object} NotificationScope
 * @property {Array<{nodeRef: string, name: string, code: string|null}>} suppliers
 * @property {'group'|'task'|'none'} source how the identity was established
 * @property {boolean} isSupplierAccount whether the account is a supplier at all
 * @property {{reason: string, hint: string}|null} empty why there is no document scope
 */

/**
 * The supplier(s) the account **acts for** — never the ones it may read.
 *
 * Two steps, cheapest first:
 *
 *  1. `GROUP_EXTERNAL_SUPPLIER_<code>` memberships (two upstream calls, no enrichment).
 *     `SupplierPortalServiceImpl.getOrCreateSupplierGroup()` only ever creates those for
 *     a supplier's own accounts, so a membership *is* the identity;
 *  2. only if that yields nothing — an instance that does not use the group convention,
 *     or a delegated-entry internal user — the entity carried by each of my tasks, which
 *     costs the enriched task list. Same rule as
 *     `SupplierPortalServiceImpl.getSupplierNodeRef()`.
 *
 * @param {Object} client
 * @param {Object[]} tasks tasks already loaded (used by step 2 only)
 * @returns {Promise<{suppliers: Object[], source: string}>}
 */
async function resolveNotificationScope(client, tasks) {
    const { groups, capabilities } = await getMyGroups(client);
    // Whether the account IS a supplier is a different question from which
    // suppliers it acts for, and the empty answer does not mean the same thing in
    // the two cases — see `scope.empty` below.
    const supplierAccount = isSupplierAccount(groups, capabilities);
    const fromGroups = await suppliersFromGroups(client, groups);
    if (fromGroups.length > 0) {
        return { suppliers: fromGroups, source: 'group', isSupplierAccount: supplierAccount };
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
        return { suppliers: [], source: 'none', isSupplierAccount: supplierAccount };
    }

    /*
     * NO ENRICHED TASK SCAN HERE.
     *
     * Reaching the supplier through the deliverable URL takes the enriched task
     * list, which costs one `becpg/project/task` read per task — and the answer
     * would be thrown away: the suppliers come from `resolveMySuppliers()`,
     * which reads the very groups step 1 just above has read, so it returns
     * exactly what step 1 has already returned. The bell paid seconds for that,
     * on every screen.
     *
     * The day the entity to supplier link is read for real, read it here, out of
     * `tasks`, which is already loaded.
     */
    const suppliers = await resolveMySuppliers(client);
    return {
        suppliers,
        source: suppliers.length > 0 ? 'task' : 'none',
        isSupplierAccount: supplierAccount,
    };
}

/**
 * Splits the supplier scope into the `ANCESTOR` disjunctions the document query can
 * carry. Returns `[]` when there is no scope — the caller must then run **no** query at
 * all rather than an unscoped one.
 *
 * @param {string[]} nodeRefs
 * @param {Object} config
 * @returns {{chunks: string[][], dropped: number}}
 */
export function chunkAncestors(nodeRefs, config = NOTIFICATION_CONFIG) {
    const refs = [...new Set((nodeRefs || []).filter(Boolean))];
    const size = Math.max(1, config.ancestorsPerQuery);
    const chunks = [];
    for (let index = 0; index < refs.length; index += size) {
        chunks.push(refs.slice(index, index + size));
    }
    const kept = chunks.slice(0, Math.max(1, config.maxQueries));
    return { chunks: kept, dropped: refs.length - kept.reduce((sum, chunk) => sum + chunk.length, 0) };
}

/**
 * Turns one overdue task into a notification.
 *
 * @param {Object} task a {@link import('./tasks').Task}
 * @param {Date} now
 * @param {Object} config
 * @returns {Object}
 */
function taskNotification(task, now, config) {
    const due = task.dueDate || null;
    const daysOverdue = due
        ? Math.max(0, Math.floor((now.getTime() - new Date(due).getTime()) / 86400000))
        : 0;
    return {
        id: `task:${task.uuid || task.id}`,
        type: 'task.overdue',
        severity: daysOverdue >= config.taskDangerAfterDays ? 'danger' : 'warning',
        title: task.name || '',
        date: due,
        daysOverdue,
        // Everything here is assigned to me by construction — the two sources are
        // `authority=<me>` and `pjt:tlResourcesAssocIndex:"<me>"`. A pooled workflow
        // task is claimable rather than assigned, and says so.
        assignedToMe: !task.isPooled,
        isPooled: Boolean(task.isPooled),
        target: { kind: 'task', nodeRef: task.id, name: task.name || '' },
        entity: task.entity && task.entity.nodeRef ? task.entity : null,
        href: task.href,
    };
}

/**
 * Turns one document into a notification, or `null` when its status is not something
 * the supplier owes.
 *
 * @param {Object} document a projected document ({@link toDocument})
 * @param {Object} config
 * @returns {Object|null}
 */
function documentNotification(document, config) {
    const severity = config.documentSeverity[document.status];
    if (!severity) {
        return null;
    }
    if (document.status === 'missing' && config.missingRequiresMandatory && !document.isMandatory) {
        return null;
    }
    return {
        id: `document:${document.id}`,
        type: `document.${document.status}`,
        severity,
        title: document.type ? document.type.label : document.name,
        date: document.validTo,
        daysToExpiry: document.daysToExpiry,
        isMandatory: document.isMandatory,
        target: { kind: 'document', nodeRef: document.nodeRef, name: document.name },
        entity: document.entity,
        href: '/documents',
    };
}

/** Most urgent first: severity, then the oldest date. */
function byUrgency(rank) {
    return (a, b) => {
        const bySeverity = (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
        if (bySeverity !== 0) {
            return bySeverity;
        }
        return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
    };
}

/**
 * **Builds `GET /api/v1/notifications`.**
 *
 * @param {Object} params
 * @param {Object} params.session portal session
 * @param {number} [params.limit] items returned (the *set* is bounded by
 *        `NOTIFICATION_CONFIG.limit` whatever this says)
 * @param {number} [params.noticeDays] "expiring" window; defaults to the tenant's
 * @param {Date} [params.now]
 * @returns {Promise<Object>} `{ items, counts, scope, sources, queries, generatedAt }`
 *
 * @example
 * const { counts } = await listNotifications({ session, limit: 20 });
 * counts.total;   // size of the set the panel lists — the badge shows this
 */
export async function listNotifications(params = {}) {
    const { session } = params;
    const config = NOTIFICATION_CONFIG;
    const documents = documentConfig(
        Number(params.noticeDays) > 0 ? { noticeDays: Number(params.noticeDays) } : undefined,
    );
    const now = params.now instanceof Date ? params.now : new Date();
    const limit = Number(params.limit) > 0
        ? Math.min(Number(params.limit), config.limit)
        : config.limit;

    const client = createBecpgClient(session);

    // --- my tasks ----------------------------------------------------------------
    // Same two sources, same merge and the same `isLate` rule as `/api/v1/tasks`, so a
    // notification can never point at a task "Mes tâches" does not list. `enrich:false`
    // skips the per-task `becpg/project/task` read: the bell polls, and a notification
    // needs the name, the due date and the route — none of which come from there.
    const taskResult = await listMyTasks(client, {
        pageSize: config.taskScan,
        enrich: false,
    });
    const overdueTasks = taskResult.items.filter((task) => task.isLate === true);

    // --- my documents -------------------------------------------------------------
    const scope = await resolveNotificationScope(client, taskResult.items);
    const { chunks, dropped } = chunkAncestors(
        scope.suppliers.map((supplier) => supplier.nodeRef),
        config,
    );

    const documentQueries = chunks.map((ancestors) => buildDocumentQuery({
        config: documents,
        ancestors,
    }));

    let documentRows = [];
    let documentsTruncated = dropped > 0;
    if (documentQueries.length > 0) {
        const results = await Promise.all(documentQueries.map((query) => searchAllNodes(query, {
            session,
            // Exactly what `toDocument()` needs to derive a status and name the row —
            // the AI validation triple is deliberately left out, a notification never
            // shows it. `assoc|prop` is the form that brings a sub-property of an
            // association back (`docTypeCategory` feeds the `category` fallback).
            fields: [
                documents.props.state,
                documents.props.mandatory,
                documents.props.category,
                documents.props.typeRef,
                `${documents.props.typeRef}|bcpg:docTypeCategory`,
                documents.props.entityRef,
                documents.props.from,
                documents.props.to,
                documents.props.modified,
            ].join(','),
            pageSize: documents.upstreamPageSize,
        })));
        const seen = new Set();
        for (const result of results) {
            documentsTruncated = documentsTruncated || result.truncated;
            for (const node of result.items) {
                if (seen.has(node.nodeRef)) {
                    continue;
                }
                seen.add(node.nodeRef);
                documentRows.push(node);
            }
        }
    }

    const documentNotifications = documentRows
        .map((node) => documentNotification(toDocument(node, { config: documents, now }), config))
        .filter(Boolean);

    // --- one set ------------------------------------------------------------------
    const rank = { danger: 0, warning: 1, info: 2 };
    const all = [
        ...overdueTasks.map((task) => taskNotification(task, now, config)),
        ...documentNotifications,
    ].sort(byUrgency(rank));

    // The set is bounded, and the payload says whether the bound was reached: a badge
    // is allowed to be a floor ("50+"), never a number nobody can justify.
    const bounded = all.slice(0, config.limit);
    const exact = all.length <= config.limit && !documentsTruncated && !taskResult.truncated;
    if (!exact) {
        logWarn('notifications.truncated', {
            matched: all.length,
            limit: config.limit,
            documentsTruncated,
            tasksTruncated: taskResult.truncated,
            suppliers: scope.suppliers.length,
        });
    }

    const counts = bounded.reduce((accumulator, notification) => {
        accumulator[notification.severity] = (accumulator[notification.severity] || 0) + 1;
        return accumulator;
    }, { danger: 0, warning: 0, info: 0 });

    const items = bounded.slice(0, limit);

    return {
        items,
        counts: {
            ...counts,
            /** Size of the set `items` is a window on — this is what the badge shows. */
            total: bounded.length,
            /** Always a number, and a proven floor when `exact` is false. */
            atLeast: bounded.length,
            exact,
            listed: items.length,
            hidden: Math.max(0, bounded.length - items.length),
        },
        scope: {
            suppliers: scope.suppliers.map((supplier) => ({
                nodeRef: supplier.nodeRef,
                name: supplier.name || '',
                code: supplier.code || null,
            })),
            source: scope.source,
            // An empty document scope is a *statement*, never a silent empty list: it
            // says the account has no supplier identity, which is a configuration fact
            // and not "you have no documents to provide".
            //
            // **Two accounts reach it for opposite reasons, and one wording cannot
            // serve both.** For a supplier, an empty scope is an anomaly to report to
            // the customer. For an internal account — quality, purchasing,
            // referencing — it is the normal state: document alerts belong to the
            // supplier who owes the documents, and the monitoring space has
            // `/monitor/documents` for the park-wide view. Telling a referencing
            // officer that their account "is attached to no supplier" and inviting
            // them to "report it to your contact at the customer" is nonsense — they
            // ARE the customer.
            empty: chunks.length === 0
                ? (scope.isSupplierAccount
                    ? {
                        reason: 'noSupplierIdentity',
                        hint: 'No GROUP_EXTERNAL_SUPPLIER_<code> membership and no task pointing at a supplier: document notifications cannot be scoped, so none are reported.',
                    }
                    : {
                        reason: 'internalAccount',
                        hint: 'Internal account: document alerts are scoped on a supplier identity this account does not have, by design. Only tasks are reported here; the park-wide view is /monitor/documents.',
                    })
                : null,
        },
        sources: {
            tasks: {
                scope: 'assignedToMe',
                scanned: taskResult.items.length,
                overdue: overdueTasks.length,
                truncated: Boolean(taskResult.truncated),
            },
            documents: {
                scope: 'supplierTree',
                suppliers: scope.suppliers.length,
                queries: documentQueries.length,
                scanned: documentRows.length,
                matched: documentNotifications.length,
                truncated: documentsTruncated,
                noticeDays: documents.noticeDays,
            },
        },
        queries: { documents: documentQueries },
        generatedAt: now.toISOString(),
    };
}
