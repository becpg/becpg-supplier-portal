/**
 * Domain adapter — **session and dashboard** (spec §4.3, §5.4 `/session`,
 * `/dashboard`).
 *
 * Three things live here:
 *
 *   1. {@link createBecpgClient} — the tiny object every other adapter takes.
 *      It binds an already-refreshed session to `lib/becpg.js` and carries a
 *      per-request memo cache, so `/dashboard` (which composes `/tasks` and
 *      `/entities`) never asks beCPG the same question twice.
 *   2. {@link buildSessionPayload} — tenant + user + supplier(s) + locale, the
 *      single call the shell makes on boot.
 *   3. {@link buildDashboard} — the counters of spec §4.3, composed from the
 *      tasks and entities adapters plus one document query.
 *
 * ### How the supplier(s) of the connected user are determined
 *
 * **By their groups, and by nothing else.** An account is a supplier if and only
 * if it belongs to a `GROUP_EXTERNAL_SUPPLIER_<code>` group; `<code>` is the
 * supplier's `bcpg:code`, which *is* searchable, so one db-afts query resolves
 * every one of them at once. Cheap, exact, and it works for a supplier that
 * holds no task at all.
 *
 * There is no queryable link from a `cm:person` to a `bcpg:supplier` —
 * `bcpg:supplierAccountRef` is a **source** association on the supplier side and
 * Alfresco cannot search associations — but none is needed: beCPG creates those
 * groups itself, and only for a supplier's own accounts
 * (`SupplierPortalServiceImpl.getOrCreateSupplierGroup`). The membership is the
 * definition.
 *
 * A second strategy used to walk the entities of the user's open tasks and read
 * their `bcpg:suppliers`, on the belief that an instance might not follow the
 * group convention. It cannot: an account outside those groups is not a
 * supplier, whatever it holds a task on. So that strategy never contributed a
 * supplier the groups had missed, while costing one `becpg/remote/entity` per
 * task — up to twenty-five reads on every session, twice per dashboard.
 *
 * Delegated entry (a client filling in for a supplier) does not go through here
 * at all: it names its supplier explicitly, and `resolveDelegatedSupplier`
 * checks it.
 *
 * The result is cached per request.
 *
 * The portal never *enforces* this scope — beCPG remains the authority
 * (spec §6.2). It is used for display (which client / which supplier am I
 * working for) and to scope the dashboard counters.
 *
 * Server only.
 */

import {
    del as becpgDel,
    getJson as becpgGetJson,
    postJson as becpgPostJson,
    putJson as becpgPutJson,
    becpgFetch,
} from '@/lib/becpg';
import { toPublicSession } from '@/lib/session';
import { toPublicTenant } from '@/lib/tenant';
// Single source of truth for the approval vocabulary — see APPROVAL_STATUS below.
import { APPROVAL_STATUS } from '@/lib/adapters/approval';
import { DEFAULT_LANG, normalizeLang } from '@/config/messages';
import {
    escapeFtsValue,
    listMyTasks,
    nodeRefFromId,
    nodeRefUuid,
    toIsoDate,
} from '@/lib/adapters/tasks';
import { listMyEntities, toEntityRef } from '@/lib/adapters/entities';
import { buildDocumentQuery } from '@/lib/adapters/documents';
import { portalCatalogs } from '@/lib/catalogs';

/* -------------------------------------------------------------------------- */
/* The beCPG client                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Wraps a live session into the client the adapters take.
 *
 * Every call is made with `skipAllowList: true`: the allow-list of
 * `lib/becpg.js` exists to keep the **browser** from reaching arbitrary
 * webscripts through `/api/v1/becpg/**`. Here the paths are literals written in
 * this repository (`becpg/project/task`, `api/task-instances`, `api/people/…`),
 * and the only client-supplied part — a node identifier — has already gone
 * through `toNodeRef()` / `nodeRefToPath()`. Composition endpoints legitimately
 * need Alfresco core webscripts (`api/task-instances`) that must stay closed to
 * the browser.
 *
 * @param {Object} session a live session (see `getLiveSession()`)
 * @returns {{session: Object, username: string, cache: Map<string, *>,
 *            getJson: Function, postJson: Function, putJson: Function,
 *            del: Function, fetch: Function,
 *            memo: (key: string, factory: () => Promise<*>) => Promise<*>}}
 *
 * @example
 * const session = await getLiveSession();
 * const client = createBecpgClient(session);
 * const { items } = await listMyTasks(client);
 */
export function createBecpgClient(session) {
    const base = { session, skipAllowList: true };
    const cache = new Map();

    return {
        session,
        username: session.username || session.sub || '',
        cache,
        getJson: (path, options = {}) => becpgGetJson(path, { ...base, ...options }),
        postJson: (path, body, options = {}) => becpgPostJson(path, body, { ...base, ...options }),
        putJson: (path, body, options = {}) => becpgPutJson(path, body, { ...base, ...options }),
        del: (path, options = {}) => becpgDel(path, { ...base, ...options }),
        fetch: (path, options = {}) => becpgFetch(path, { ...base, ...options }),
        /**
         * Per-request memoisation — `/dashboard` composes several adapters and
         * must not pay twice for the same upstream call.
         */
        async memo(key, factory) {
            if (cache.has(key)) {
                return cache.get(key);
            }
            const promise = Promise.resolve().then(factory);
            cache.set(key, promise);
            try {
                return await promise;
            }
            catch (error) {
                cache.delete(key);
                throw error;
            }
        },
    };
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                   */
/* -------------------------------------------------------------------------- */

/** Prefix of the per-supplier Alfresco group (`SupplierPortalServiceImpl`). */
export const SUPPLIER_GROUP_PREFIX = 'GROUP_EXTERNAL_SUPPLIER_';

/** Group that puts a user in the supplier space (spec §4.2). */
export const EXTERNAL_USER_GROUP = 'GROUP_ExternalUser';

/**
 * The three beCPG groups that actually concern the supplier portal.
 *
 * This is the product's own list — the "Module Portail fournisseur" section of the group
 * administration — and nothing else belongs here:
 *
 *   ReferencingMgr    beCPG Responsables référencement — access to entities being referenced
 *   ExternalUser      assigned to a supplier, restricts its access
 *   ExternalUserMgr   allows creating supplier accounts
 *
 * **Correction of an earlier over-engineering.** This module used to map five invented
 * "profiles" onto every PLM group (QualityMgr, RDUser, ProductionMgr, PackagingUser…). That was
 * wrong twice over: those groups have nothing to do with the supplier portal, and the mapping
 * even contained `PurchasingMgr`, which is not a beCPG group at all. Authorisation for this
 * portal rests on the three groups above, full stop.
 *
 * @readonly
 */
export const SUPPLIER_PORTAL_GROUPS = Object.freeze({
    /** Runs the referencing campaigns and reads the park. */
    REFERENCING_MGR: 'GROUP_ReferencingMgr',
    /** Is a supplier. */
    EXTERNAL_USER: EXTERNAL_USER_GROUP,
    /** Creates supplier accounts. */
    EXTERNAL_USER_MGR: 'GROUP_ExternalUserMgr',
});

/**
 * Groups opening the monitoring space (spec §4.2, §4.6.7).
 *
 * The two INTERNAL supplier-portal roles, plus Alfresco administrators. A quality officer or an
 * R&D user who is not `ReferencingMgr` has no business in the supplier park — and if an instance
 * organises it differently, that is what `PORTAL_MONITOR_GROUPS` is for.
 *
 * @type {ReadonlyArray<string>}
 */
export const MONITOR_GROUPS = Object.freeze([
    SUPPLIER_PORTAL_GROUPS.REFERENCING_MGR,
    SUPPLIER_PORTAL_GROUPS.EXTERNAL_USER_MGR,
    'GROUP_ALFRESCO_ADMINISTRATORS',
]);

/**
 * Every group opening the monitoring space: the product ones plus the instance's own.
 *
 * `PORTAL_MONITOR_GROUPS` is a comma-separated list ADDED to {@link MONITOR_GROUPS} (names with
 * or without the `GROUP_` prefix). Instances do declare their own roles, and refusing a
 * legitimate referent is worse than accepting a group this portal has never heard of.
 *
 * @returns {string[]}
 */
export function monitorGroups() {
    const extra = String(process.env.PORTAL_MONITOR_GROUPS || '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => (name.startsWith('GROUP_') ? name : `GROUP_${name}`));
    return [...new Set([...MONITOR_GROUPS, ...extra])];
}

/*
 * The reading profiles of spec §4.6.5 (Qualité / Achats / R&D / RSE) are NOT declared here.
 *
 * They are a **display preference, never an authorisation**: they reorder and re-weight the same
 * data, the user picks one in the switcher and it is persisted client-side. They live where they
 * are used — `components/monitor/ProfileSwitcher.js`, which owns their ids, labels and tile
 * ordering — precisely so there is only one list.
 *
 * They are deliberately NOT derived from beCPG groups: this portal knows three roles
 * (see SUPPLIER_PORTAL_GROUPS above), and a referencing manager may perfectly well want the
 * purchasing lens one day and the quality lens the next.
 */

/** Notice window of the "documents expiring soon" card (spec §4.3). */
export const EXPIRY_NOTICE_DAYS = 60;

/** Upper bound on the documents scanned by the dashboard. */
const MAX_DOCUMENT_SCAN = 500;

/** Upper bound on the entities scanned by the dashboard. */
const MAX_ENTITY_SCAN = 200;

/** `bcpg:documentState` marking an expected-but-not-provided document (spec §5.4.2). */
const DOCUMENT_STATE_EXPECTED = 'Simulation';

/**
 * Approval statuses (spec §4.5, §5.4.3). Machine codes — the wording is the
 * UI's business, and the status is derived on the fly, never persisted.
 *
 * **Single source of truth: `lib/adapters/approval.js`.** This module re-exports it
 * instead of redeclaring it. Two declarations existed and had diverged in case
 * (`Approved` here vs `approved` there), so `/api/v1/dashboard` and `/api/v1/approval`
 * emitted two different vocabularies for the same thing — and the UI maps the status to a
 * StatusPill, so one of the two screens rendered an unstyled pill. Caught by the E2E
 * contract test, fixed at the source rather than papered over in the components.
 *
 * Imported (not just re-exported): this module uses it internally too, and
 * `export … from` alone would not bring it into local scope.
 *
 * @readonly
 */
export { APPROVAL_STATUS };

/* -------------------------------------------------------------------------- */
/* Typedefs — the contract the UI agents depend on                             */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {Object} SupplierRef
 * @property {string} nodeRef
 * @property {string} uuid
 * @property {string} name
 * @property {string|null} code   `bcpg:code` — also the suffix of the Alfresco group
 * @property {string} type        always `bcpg:supplier`
 * @property {string[]} sources   how it was found: `group` and/or `task`
 */

/**
 * **Shape of `GET /api/v1/session`.**
 *
 * @typedef {Object} SessionPayload
 * @property {{sub: string, name: string, email: string, username: string,
 *             tenantId: string, authMode: string, expiresAt: number|null,
 *             createdAt: number|null}} user  never contains a ticket or a token
 * @property {{id: string, label: string, logoUrl: string, isTest: boolean}|null} tenant
 * @property {boolean} isTest         drives the permanent TEST banner (spec §4.3)
 * @property {string} lang            portal chrome language (`fr` | `en`)
 * @property {string} space           `supplier` | `monitor` | `unknown`
 * @property {string[]} groups        beCPG group memberships, `GROUP_`-prefixed
 * @property {SupplierRef[]} suppliers every supplier the user acts for
 * @property {SupplierRef|null} supplier the current one (the only one, when there is one)
 * @property {{isExternalUser: boolean, canMonitor: boolean}} capabilities
 * @property {string} generatedAt     ISO 8601
 */

/**
 * **Shape of `GET /api/v1/dashboard`.**
 *
 * @typedef {Object} DashboardPayload
 * @property {{status: string, reasons: string[], validUntil: string|null}} approval
 *           status is one of {@link APPROVAL_STATUS}; `reasons` are stable codes
 *           (`documentExpired`, `documentExpiring`, `documentMissing`,
 *           `catalogIncomplete`, `openProject`, `openNonConformity`)
 * @property {{score: number|null, entityCount: number, scoredEntityCount: number,
 *             catalogs: Array<{id: string, label: string, score: number}>}} completion
 * @property {{open: number, late: number, byType: Object.<string, number>,
 *             nextDueDate: string|null}} actions
 * @property {{total: number, valid: number, expiringSoon: number, expired: number,
 *             missing: number, refused: number, noticeDays: number,
 *             available: boolean}} documents
 * @property {{total: number, byState: Object.<string, number>}} products
 * @property {SupplierRef|null} supplier
 * @property {string} generatedAt ISO 8601
 */

/* -------------------------------------------------------------------------- */
/* Groups and suppliers                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Reads the connected user's Alfresco groups and beCPG capabilities.
 *
 * @param {Object} client
 * @returns {Promise<{groups: string[], capabilities: Object, person: Object|null}>}
 */
export async function getMyGroups(client) {
    return client.memo('groups', async () => {
        if (!client.username) {
            return { groups: [], capabilities: {}, person: null };
        }
        try {
            const person = await client.getJson(`api/people/${encodeURIComponent(client.username)}`, {
                query: { groups: 'true' },
            });
            const groups = Array.isArray(person && person.groups)
                ? person.groups.map((group) => group.itemName).filter(Boolean)
                : [];
            return { groups, capabilities: (person && person.capabilities) || {}, person: person || null };
        }
        catch {
            // A restricted account may not read its own person node; the portal
            // then relies on the task-derived strategy alone.
            return { groups: [], capabilities: {}, person: null };
        }
    });
}

/**
 * The suppliers named by a `GROUP_EXTERNAL_SUPPLIER_<code>` membership — the
 * whole of {@link resolveMySuppliers}, two upstream calls.
 *
 * Exported because it answers a different question from "which suppliers may I
 * read": a group membership is an *identity*, an ACL is a permission. `lib/adapters/notifications.js` scopes on the identity — see the
 * note on `resolveSupplierScope()` in the documents adapter, which answers the
 * permission question and must not be mistaken for this one.
 *
 * @param {Object} client
 * @param {string[]} groups group names
 * @returns {Promise<SupplierRef[]>}
 */
export async function suppliersFromGroups(client, groups) {
    const codes = (groups || [])
        .filter((name) => name.startsWith(SUPPLIER_GROUP_PREFIX))
        .map((name) => name.slice(SUPPLIER_GROUP_PREFIX.length))
        .filter(Boolean);

    if (codes.length === 0) {
        return [];
    }

    const clause = codes.map((code) => `=bcpg:code:"${escapeFtsValue(code)}"`).join(' OR ');
    try {
        const data = await client.getJson('becpg/remote/entity/list', {
            query: {
                query: `TYPE:"bcpg:supplier" AND (${clause})`,
                fields: 'cm:name,bcpg:code,bcpg:legalName',
                lists: 'none',
                maxResults: Math.min(50, codes.length * 2),
            },
        });
        const rows = Array.isArray(data && data.entities) ? data.entities : [];
        return rows
            .map((row) => row && row.entity)
            .filter(Boolean)
            .map((entity) => {
                const nodeRef = nodeRefFromId(entity.id);
                return {
                    nodeRef,
                    uuid: nodeRefUuid(nodeRef),
                    name: entity['cm:name'] || (entity.attributes && entity.attributes['cm:name']) || '',
                    code: entity['bcpg:code'] || null,
                    type: entity.type || 'bcpg:supplier',
                    sources: ['group'],
                };
            });
    }
    catch {
        return [];
    }
}

/**
 * The supplier(s) the connected user acts for.
 *
 * **One rule, no fallback**: an account is a supplier if and only if it belongs
 * to a `GROUP_EXTERNAL_SUPPLIER_<code>` group. beCPG creates those groups itself
 * and only for a supplier's own accounts
 * (`SupplierPortalServiceImpl.getOrCreateSupplierGroup`), so the membership *is*
 * the definition — not a hint to be completed.
 *
 * This module used to add a second strategy, reading the `bcpg:suppliers` of
 * every entity carried by an open task, on the belief that an instance might not
 * use the group convention. It could not: an account outside those groups is not
 * a supplier, whatever it holds a task on. The strategy therefore added no
 * supplier that the groups had missed — and it cost one `becpg/remote/entity`
 * per task, up to twenty-five reads on every session.
 *
 * @param {Object} client
 * @returns {Promise<SupplierRef[]>}
 */
export async function resolveMySuppliers(client) {
    return client.memo('suppliers', async () => {
        const { groups } = await getMyGroups(client);
        const suppliers = await suppliersFromGroups(client, groups);
        return suppliers.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    });
}

/**
 * True when the user is an external supplier account.
 *
 * `GROUP_ExternalUser` is the documented marker, but it is NOT sufficient: measured on
 * the reference instance, the test supplier account belongs to **thirteen**
 * `GROUP_EXTERNAL_SUPPLIER_<code>` groups and to no generic `GROUP_ExternalUser`. Relying on
 * the generic group alone classified a real supplier as `unknown`, so the shell rendered
 * neither navigation. Membership of any per-supplier group is therefore just as conclusive —
 * `SupplierPortalServiceImpl.getOrCreateSupplierGroup()` only ever creates those for a
 * supplier's own accounts.
 *
 * @param {string[]} groups
 * @param {Object} [capabilities] beCPG person capabilities
 * @returns {boolean}
 */
export function isSupplierAccount(groups, capabilities = {}) {
    const list = groups || [];
    return list.includes(EXTERNAL_USER_GROUP)
        || list.some((group) => String(group).startsWith(SUPPLIER_GROUP_PREFIX))
        || capabilities.isbeCPGExternalUser === true;
}

/**
 * Which space the user lands in (spec §4.2).
 *
 * The supplier test comes FIRST and wins: an account that is a supplier must never be
 * routed to the monitoring space, whatever else it holds (spec §4.6.7 — the monitoring
 * adapter refuses an external user unconditionally, and the two decisions must agree).
 *
 * @param {string[]} groups
 * @param {Object} [capabilities] beCPG person capabilities
 * @returns {'supplier'|'monitor'|'unknown'}
 */
export function resolveSpace(groups, capabilities = {}) {
    if (isSupplierAccount(groups, capabilities)) {
        return 'supplier';
    }
    const set = new Set(groups || []);
    if (monitorGroups().some((group) => set.has(group))) {
        return 'monitor';
    }
    return 'unknown';
}

/* -------------------------------------------------------------------------- */
/* /session                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * **Builds `GET /api/v1/session`.**
 *
 * @param {Object} params
 * @param {Object} params.session live session
 * @param {Object|null} params.tenant resolved tenant
 * @param {string} [params.lang] chrome language
 * @param {Object} [params.client] an existing client (reused for the caching)
 * @returns {Promise<SessionPayload>}
 */
export async function buildSessionPayload({ session, tenant, lang, client }) {
    const becpg = client || createBecpgClient(session);
    const { groups, capabilities } = await getMyGroups(becpg);

    let suppliers = [];
    try {
        suppliers = await resolveMySuppliers(becpg);
    }
    catch {
        // Never fail the boot call on the supplier lookup: the shell must render.
        suppliers = [];
    }

    return {
        user: toPublicSession(session),
        tenant: toPublicTenant(tenant),
        isTest: Boolean(tenant && tenant.isTest),
        lang: normalizeLang(lang || DEFAULT_LANG),
        space: resolveSpace(groups, capabilities),
        groups,
        suppliers,
        supplier: suppliers.length > 0 ? suppliers[0] : null,
        capabilities: {
            isExternalUser: isSupplierAccount(groups, capabilities),
            // A supplier never gets the monitoring space, whatever else it holds: the
            // monitoring adapter refuses an external user unconditionally (spec §4.6.7) and
            // the two decisions must not disagree.
            canMonitor: !isSupplierAccount(groups, capabilities)
                && monitorGroups().some((group) => groups.includes(group)),
        },
        generatedAt: new Date().toISOString(),
    };
}

/* -------------------------------------------------------------------------- */
/* Documents (dashboard only — /documents belongs to its own adapter)          */
/* -------------------------------------------------------------------------- */

/**
 * Counts the supplier's documents by validity, from the data
 * `DocumentFormulationHandler` already materialises on the entities
 * (spec §5.4.2): `bcpg:documentState`, `bcpg:documentIsMandatory` and
 * `cm:effectivity` (`cm:from` / `cm:to`).
 *
 * One db-afts query, ACL-filtered by Alfresco. Degrades to
 * `{ available: false }` rather than failing the whole dashboard.
 *
 * The query comes from `buildDocumentQuery()`, and that is not a convenience.
 * It used to be written here by hand, without the `TYPE:"cm:content"` clause — but
 * `AbstractEntityWebScript` adds `ofType(bcpg:entityV2)` to any query that does not
 * mention `TYPE:`, and a document is a `cm:content`. The query therefore never
 * brought anything back: the Documents card showed 0 on every one of its rows while
 * the /documents screen counted a hundred. The trap is documented in
 * `lib/adapters/documents.js`; sharing the function is the only way not to fall into
 * it again.
 *
 * @param {Object} client
 * @param {Object} [options]
 * @param {number} [options.noticeDays=EXPIRY_NOTICE_DAYS]
 * @returns {Promise<{total: number, valid: number, expiringSoon: number,
 *                    expired: number, missing: number, refused: number,
 *                    noticeDays: number, available: boolean}>}
 */
export async function countMyDocuments(client, options = {}) {
    const noticeDays = Number(options.noticeDays) || EXPIRY_NOTICE_DAYS;
    // The perimeter is an `ANCESTOR:` clause — documents are filed under the
    // supplier's space — and not a filter applied afterwards, which would leave
    // the counters computed over every supplier record of the account.
    const ancestors = options.supplierNodeRef ? [options.supplierNodeRef] : undefined;
    const empty = {
        total: 0,
        valid: 0,
        expiringSoon: 0,
        expired: 0,
        missing: 0,
        refused: 0,
        noticeDays,
        available: false,
    };

    let rows = [];
    try {
        const data = await client.getJson('becpg/remote/entity/list', {
            query: {
                query: buildDocumentQuery({ ancestors }),
                fields: 'cm:name,cm:from,cm:to,bcpg:documentState,bcpg:documentIsMandatory,bcpg:aiValidationState',
                lists: 'none',
                maxResults: MAX_DOCUMENT_SCAN,
            },
        });
        rows = Array.isArray(data && data.entities) ? data.entities : [];
    }
    catch {
        return empty;
    }

    const now = Date.now();
    const horizon = now + noticeDays * 24 * 60 * 60 * 1000;
    const counters = { ...empty, available: true };

    for (const row of rows) {
        const entity = row && row.entity;
        if (!entity) {
            continue;
        }
        const attributes = entity.attributes || {};
        const state = attributes['bcpg:documentState'] || null;
        const to = attributes['cm:to'] ? new Date(attributes['cm:to']).getTime() : null;

        counters.total += 1;

        if (state === DOCUMENT_STATE_EXPECTED) {
            // Placeholder created by DocumentFormulationHandler: expected, not provided.
            counters.missing += 1;
            continue;
        }
        if (state === 'Refused') {
            counters.refused += 1;
            continue;
        }
        if (to !== null && !Number.isNaN(to)) {
            if (to < now) {
                counters.expired += 1;
                continue;
            }
            if (to <= horizon) {
                counters.expiringSoon += 1;
                continue;
            }
        }
        counters.valid += 1;
    }

    return counters;
}

/**
 * Counts the open non-conformities visible to the user (`qa:nc`).
 * Optional: returns null when the quality module is absent or the query fails.
 *
 * @param {Object} client
 * @returns {Promise<number|null>}
 */
async function countOpenNonConformities(client) {
    try {
        const data = await client.getJson('becpg/remote/entity/list', {
            query: {
                query: 'TYPE:"qa:nc" AND NOT =qa:ncState:"closed"',
                // No `fields=` on purpose. A row of `entity/list` already carries
                // cm:name, id, type and bcpg:code without it, and asking for any
                // field switches the webscript to its per-node property resolution
                // — measured on dev, 200 rows: 0.22 s without `fields`, 0.92 s with
                // `fields=cm:name`, for strictly the same data. That path is also
                // what the 256-row cap belongs to.
                lists: 'none',
                maxResults: 100,
            },
        });
        const rows = Array.isArray(data && data.entities) ? data.entities : [];
        return rows.length;
    }
    catch {
        return null;
    }
}

/* -------------------------------------------------------------------------- */
/* /dashboard                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Derives the approval status (spec §4.5, §5.4.3). **Computed on the fly, never
 * persisted** — there is no `bcpg:approvalStatus` property and the project
 * deliberately adds none.
 *
 * | Status      | Condition                                                        |
 * |-------------|------------------------------------------------------------------|
 * | Suspended   | a mandatory document is expired, or a blocking NC is open         |
 * | ToRenew     | a mandatory document expires inside the notice window             |
 * | InProgress  | an expected document is missing, a blocking catalog is unsatisfied, or a referencing project is open |
 * | Approved    | none of the above                                                 |
 *
 * @param {Object} input
 * @param {Object} input.documents counters from {@link countMyDocuments}
 * @param {number|null} input.completionScore mean catalog score, 0..100
 * @param {number} input.openTasks
 * @param {number|null} input.openNonConformities
 * @returns {{status: string, reasons: string[], validUntil: string|null}}
 */
export function deriveApprovalStatus({ documents, completionScore, openTasks, openNonConformities }) {
    const reasons = [];

    if (documents && documents.available) {
        if (documents.expired > 0) {
            reasons.push('documentExpired');
        }
        if (documents.expiringSoon > 0) {
            reasons.push('documentExpiring');
        }
        if (documents.missing > 0) {
            reasons.push('documentMissing');
        }
    }
    if (typeof completionScore === 'number' && completionScore < 100) {
        reasons.push('catalogIncomplete');
    }
    if (openTasks > 0) {
        reasons.push('openProject');
    }
    if (openNonConformities) {
        reasons.push('openNonConformity');
    }

    let status = APPROVAL_STATUS.APPROVED;
    if (reasons.includes('documentExpired') || reasons.includes('openNonConformity')) {
        status = APPROVAL_STATUS.SUSPENDED;
    }
    else if (reasons.includes('documentExpiring')) {
        status = APPROVAL_STATUS.TO_RENEW;
    }
    else if (reasons.includes('documentMissing')
        || reasons.includes('catalogIncomplete')
        || reasons.includes('openProject')) {
        status = APPROVAL_STATUS.IN_PROGRESS;
    }

    return { status, reasons, validUntil: null };
}

/**
 * **Builds `GET /api/v1/dashboard`** — the four header cards of spec §4.3.
 *
 * Everything is composed from the other adapters, and every upstream call goes
 * through `client.memo()`, so a page that also calls `/tasks` and `/entities`
 * pays for each query once per request.
 *
 * ## The supplier perimeter
 *
 * `supplierNodeRef` bounds the counters to one supplier record, the one the top
 * bar displays. Without it the dashboard answered over the fifteen records of the
 * test account while the bar announced one: 51 tasks for a perimeter that held
 * two, and an approval describing a company other than the one named on screen.
 *
 * It is optional: without it, the whole account, which remains the right
 * behaviour for « Tous les fournisseurs » and for a single-record account.
 *
 * One reservation, better known than hidden: non-conformities are not bounded.
 * Nothing in `qa:nc` links a non-conformity to a supplier record in a queryable
 * way; inventing an attachment through the folder tree would return a false zero,
 * which would read as "no non-conformity" when it would mean "I did not know how
 * to look". They therefore stay counted over everything the account can read.
 *
 * @param {Object} client
 * @param {Object} [options]
 * @param {number} [options.noticeDays=EXPIRY_NOTICE_DAYS] "expiring soon" window
 * @param {string|null} [options.supplierNodeRef] bounds the counters to this record
 * @returns {Promise<DashboardPayload>}
 *
 * @example
 * const dashboard = await buildDashboard(createBecpgClient(session));
 * dashboard.approval.status;      // 'ToRenew'
 * dashboard.completion.score;     // 78
 */
/**
 * The chosen supplier's tasks, by their product and not by their enrichment.
 *
 * A task carries no supplier: it inherits one from the product it bears on, and
 * no AFTS clause follows that link — the sorting is therefore done in memory, as
 * the « Mes tâches » screen already does.
 *
 * But not on `task.entity.supplier`. That was the first version of this filter,
 * and it returned zero: that field exists only on enriched tasks, and the
 * dashboard enriches only twelve of them — one read per task, which is the cost
 * this limit exists to avoid. The supplier's three tasks sat at positions 26, 27
 * and 39; all three without `entity`, so all three discarded, and the card
 * announced « aucune tâche en cours » to a supplier who had three of them.
 *
 * Ownership is therefore read on the product: the entities have already been
 * fetched bounded by `ANCESTOR:` on the supplier's space, and a task pointing at
 * one of them belongs to him. No extra call, and the verdict no longer depends on
 * the position of the task in the list.
 *
 * Reservation: a task whose product falls outside the entity window (200) is not
 * recognised. The supplier record itself is accepted — a task may bear on it
 * rather than on a product.
 *
 * @param {Array<Object>} tasks
 * @param {Object} options
 * @param {string|null} options.supplierNodeRef `null` = no perimeter, everything passes
 * @param {Array<Object>} options.entities the entities already bounded to the supplier
 * @returns {Array<Object>}
 */
export function scopeTasks(tasks, { supplierNodeRef, entities }) {
    const list = Array.isArray(tasks) ? tasks : [];
    if (!supplierNodeRef) {
        return list;
    }
    const owned = new Set((entities || []).map((entity) => entity.nodeRef).filter(Boolean));
    owned.add(supplierNodeRef);
    return list.filter((task) => {
        if (task.entityNodeRef && owned.has(task.entityNodeRef)) {
            return true;
        }
        // An enriched task can tell it by itself: no reason to do without that
        // when the information is there.
        return Boolean(task.entity && task.entity.supplier === supplierNodeRef);
    });
}

export async function buildDashboard(client, options = {}) {
    const noticeDays = Number(options.noticeDays) || EXPIRY_NOTICE_DAYS;
    const supplierNodeRef = options.supplierNodeRef || null;
    // The memo key carries the perimeter: two perimeters are not two views of one
    // response, and sharing them would hand back the figures of the first.
    const scopeKey = supplierNodeRef || 'all';

    const [taskResult, entityResult, documents, openNonConformities] = await Promise.all([
        /*
         * `enrichLimit` — the dashboard reads `isOpen` and `dueDate` from the
         * tasks, both of which a candidate already carries, plus the counters.
         * Enriching all of them cost one `becpg/project/task` per task.
         */
        /*
         * `enrichLimit` DOES NOT HOLD UNDER A PERIMETER, and that is structural.
         *
         * It does not merely skip the enrichment: it truncates the list to the
         * twelve most urgent tasks, because those are the only ones the card
         * displays. Yet the supplier of a task is only readable on its product,
         * and the product is only obtained through the enrichment — raw candidates
         * carry no `entityNodeRef`. Filtering afterwards therefore amounted to
         * looking for a supplier's tasks among the twelve most urgent of the
         * account, all suppliers taken together.
         *
         * Measured on dev: 56 tasks spread over fifteen records, the three of the
         * selected supplier at positions 26, 27 and 39. The card announced
         * « aucune tâche en cours » to a supplier who had three — worse than the
         * missing perimeter it was fixing.
         *
         * Under a perimeter everything that is scanned is therefore enriched. That
         * is the cost `enrichLimit` exists to avoid, accepted here because a wrong
         * counter is not made up for by speed; outside a perimeter the limit stays,
         * and with it the fast dashboard.
         */
        client.memo(`tasks:${scopeKey}`, () => listMyTasks(client, {
            pageSize: 50,
            enrichLimit: supplierNodeRef ? null : 12,
        })),
        /*
         * `preview: true`, and it must be set HERE as much as on the dashboard
         * page: both share the memo key `entities`, and this call runs first, so
         * whatever projection it asks for is the one everybody gets. Setting it
         * only on the page looked right and changed nothing at all — measured,
         * the 4 s query stayed.
         */
        client.memo(`entities:${scopeKey}`, () => listMyEntities(client, {
            pageSize: MAX_ENTITY_SCAN,
            preview: true,
            supplierNodeRef: supplierNodeRef || undefined,
        })),
        client.memo(`documents:${noticeDays}:${scopeKey}`, () => countMyDocuments(client, {
            noticeDays,
            supplierNodeRef,
        })),
        client.memo('nc', () => countOpenNonConformities(client)),
    ]);

    const entities = entityResult.items;

    const tasks = scopeTasks(taskResult.items, { supplierNodeRef, entities });

    // --- completion gauge: mean of the entities' own catalog means ----------
    const scored = entities
        .map((entity) => (entity.completion ? entity.completion.score : null))
        .filter((score) => typeof score === 'number' && !Number.isNaN(score));
    const completionScore = scored.length > 0
        ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length)
        : null;

    /*
     * Worst score per catalog id, so the UI can show what actually blocks.
     *
     * Bounded to the portal catalogs, like the figure it accompanies.
     * `toCompletion()` already restricts the mean score to the `supplierPortal-`
     * catalogs but deliberately leaves the complete list in `catalogs`, for the
     * screens that also show what the client controls. Taken as is here, that
     * list displayed INCO and GS1 under a gauge that does not count them: the
     * supplier read, as requirements of his portal, catalogs written for an
     * internal finished product, which none of his entries can push up.
     *
     * The fallback is decided over the whole set, not per product. Applying
     * `portalCatalogs()` entity by entity reopened the door it was meant to
     * close: a product with no portal catalog fell back on the fallback and
     * re-injected its client catalogs into the shared index. With 193 products
     * a single one was enough for INCO to reappear. The question "does this
     * instance have portal catalogs?" is therefore asked only once, on the
     * assembled index.
     */
    const catalogIndex = new Map();
    for (const entity of entities) {
        for (const catalog of (entity.completion ? entity.completion.catalogs : [])) {
            if (!catalog.id || typeof catalog.score !== 'number') {
                continue;
            }
            const current = catalogIndex.get(catalog.id);
            if (!current || catalog.score < current.score) {
                catalogIndex.set(catalog.id, { id: catalog.id, label: catalog.label || catalog.id, score: catalog.score });
            }
        }
    }

    // --- required actions ---------------------------------------------------
    const openTasks = tasks.filter((task) => task.isOpen);
    const nextDue = openTasks
        .map((task) => task.dueDate)
        .filter(Boolean)
        .sort()[0] || null;

    // --- products by state --------------------------------------------------
    const byState = entities.reduce((accumulator, entity) => {
        const key = entity.state || 'unknown';
        accumulator[key] = (accumulator[key] || 0) + 1;
        return accumulator;
    }, {});

    /*
     * THE RECORD DESCRIBED IS THE ONE THAT IS SELECTED.
     *
     * It used to be `suppliers[0]`, that is the first one the resolution returned:
     * the header announced "Chez Matthieu" while the approval card described
     * "Chez Axel". An approval status names a company; naming the wrong company
     * is not a display detail.
     *
     * The fallback on the first one stays for the single-record account and for
     * « Tous les fournisseurs », where there is nothing to choose. A
     * `supplierNodeRef` matching no record of the account is ignored rather than
     * followed.
     */
    let supplier = null;
    try {
        const suppliers = await resolveMySuppliers(client);
        supplier = (supplierNodeRef && suppliers.find((item) => item.nodeRef === supplierNodeRef))
            || (suppliers.length > 0 ? suppliers[0] : null);
    }
    catch {
        supplier = null;
    }

    /*
     * NO SUPPLIER, NO APPROVAL STATUS.
     *
     * `deriveApprovalStatus` answers "where does THIS supplier stand" from its
     * documents, its tasks and its non-conformities. Called for an account that
     * is not a supplier, it reads empty counters and concludes « Suspendu » —
     * which was displayed in plain sight in a buyer's header.
     *
     * An approval is a judgement passed on a supplier: with no supplier there is
     * nothing to judge, and `null` is the only honest answer. Consumers already
     * treat it as unknown (`approval ? … : null` on the dashboard).
     */
    const approval = supplier
        ? deriveApprovalStatus({
            documents,
            completionScore,
            openTasks: openTasks.length,
            openNonConformities,
        })
        : null;

    return {
        approval,
        completion: {
            score: completionScore,
            entityCount: entities.length,
            scoredEntityCount: scored.length,
            catalogs: portalCatalogs([...catalogIndex.values()]).sort((a, b) => a.score - b.score),
        },
        actions: {
            open: openTasks.length,
            late: tasks.filter((task) => task.isLate).length,
            // Recounted over the retained tasks: `taskResult.counters` covers the
            // whole task book, and taking it as is would show the breakdown of
            // fifteen records under a total that covers only one.
            byType: supplierNodeRef
                ? tasks.reduce((accumulator, task) => {
                    const key = task.type || 'unknown';
                    accumulator[key] = (accumulator[key] || 0) + 1;
                    return accumulator;
                }, {})
                : taskResult.counters.byType,
            nextDueDate: toIsoDate(nextDue),
        },
        documents,
        products: {
            // Exact, or `null` when beCPG could only answer with its `count + 1`
            // sentinel — `readListTotal()` in lib/adapters/tasks.js. `atLeast` is
            // always a number, so a consumer has something true to render.
            total: entityResult.pagination.totalItems,
            totalAtLeast: entityResult.pagination.totalAtLeast,
            totalExact: entityResult.pagination.totalExact,
            byState,
        },
        nonConformities: openNonConformities,
        supplier,
        generatedAt: new Date().toISOString(),
    };
}
