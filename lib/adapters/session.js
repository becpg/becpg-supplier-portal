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
 * dev.becpg.fr, `supplier-test@becpg.fr` belongs to **thirteen**
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
 * **La requête vient de `buildDocumentQuery()`, et ce n'est pas une commodité.**
 * Elle était écrite ici à la main, sans la clause `TYPE:"cm:content"` — or
 * `AbstractEntityWebScript` ajoute `ofType(bcpg:entityV2)` à toute requête qui ne
 * mentionne pas `TYPE:`, et un document est un `cm:content`. La requête ne
 * ramenait donc jamais rien : la carte « Documents » affichait 0 sur toutes ses
 * lignes pendant que l'écran /documents, lui, en comptait cent. Le piège est
 * documenté dans `lib/adapters/documents.js` ; partager la fonction est la seule
 * façon de ne pas retomber dedans.
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
                query: buildDocumentQuery(),
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
 * @param {Object} client
 * @param {Object} [options]
 * @param {number} [options.noticeDays=EXPIRY_NOTICE_DAYS] "expiring soon" window
 * @returns {Promise<DashboardPayload>}
 *
 * @example
 * const dashboard = await buildDashboard(createBecpgClient(session));
 * dashboard.approval.status;      // 'ToRenew'
 * dashboard.completion.score;     // 78
 */
export async function buildDashboard(client, options = {}) {
    const noticeDays = Number(options.noticeDays) || EXPIRY_NOTICE_DAYS;

    const [taskResult, entityResult, documents, openNonConformities] = await Promise.all([
        /*
         * `enrichLimit` — the dashboard reads `isOpen` and `dueDate` from the
         * tasks, both of which a candidate already carries, plus the counters.
         * Enriching all of them cost one `becpg/project/task` per task.
         */
        client.memo('tasks', () => listMyTasks(client, { pageSize: 50, enrichLimit: 12 })),
        /*
         * `preview: true`, and it must be set HERE as much as on the dashboard
         * page: both share the memo key `entities`, and this call runs first, so
         * whatever projection it asks for is the one everybody gets. Setting it
         * only on the page looked right and changed nothing at all — measured,
         * the 4 s query stayed.
         */
        client.memo('entities', () => listMyEntities(client, {
            pageSize: MAX_ENTITY_SCAN,
            preview: true,
        })),
        client.memo(`documents:${noticeDays}`, () => countMyDocuments(client, { noticeDays })),
        client.memo('nc', () => countOpenNonConformities(client)),
    ]);

    const tasks = taskResult.items;
    const entities = entityResult.items;

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
     * Bornée aux catalogues du portail, comme le chiffre qu'elle accompagne.
     * `toCompletion()` restreint déjà le score moyen aux catalogues
     * `supplierPortal-` mais laisse volontairement la liste complète dans
     * `catalogs`, pour les écrans qui montrent aussi ce que le client contrôle.
     * Reprise telle quelle ici, cette liste affichait INCO et GS1 sous une jauge
     * qui ne les compte pas : le fournisseur lisait comme exigences de son
     * portail des catalogues écrits pour un produit fini interne, qu'aucune de
     * ses saisies ne peut faire monter.
     *
     * `portalCatalogs()` porte le repli — aucune instance sans catalogue de
     * portail ne se retrouve avec un panneau vide.
     */
    const catalogIndex = new Map();
    for (const entity of entities) {
        for (const catalog of portalCatalogs(entity.completion ? entity.completion.catalogs : [])) {
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

    let supplier = null;
    try {
        const suppliers = await resolveMySuppliers(client);
        supplier = suppliers.length > 0 ? suppliers[0] : null;
    }
    catch {
        supplier = null;
    }

    /*
     * PAS DE FOURNISSEUR, PAS DE STATUT D'AGRÉMENT.
     *
     * `deriveApprovalStatus` répond à « où en est CE fournisseur » à partir de
     * ses documents, ses tâches et ses non-conformités. Appelée pour un compte
     * qui n'est pas fournisseur, elle lit des compteurs vides et en conclut
     * « suspendu » — ce qui s'affichait en clair dans l'en-tête d'un acheteur.
     *
     * Un agrément est un jugement porté sur un fournisseur : sans fournisseur il
     * n'y a rien à juger, et `null` est la seule réponse honnête. Les consommateurs
     * le traitent déjà comme « inconnu » (`approval ? … : null` sur le tableau de
     * bord).
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
            catalogs: [...catalogIndex.values()].sort((a, b) => a.score - b.score),
        },
        actions: {
            open: openTasks.length,
            late: tasks.filter((task) => task.isLate).length,
            byType: taskResult.counters.byType,
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
