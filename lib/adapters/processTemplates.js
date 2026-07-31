/**
 * **Which project templates the portal may instantiate** — resolved at runtime
 * instead of pasted into configuration.
 *
 * ## The marker, and why it is not a heuristic
 *
 * beCPG already knows what a supplier referencing template is, and Share's own
 * "envoyer au fournisseur" dialog never asks anyone to paste a nodeRef. It fills
 * its template picker from **one autocomplete datasource**, declared twice in
 * the product:
 *
 *   - `becpg-plm-share/.../modules/supplier/send-to-supplier.get.html.ftl:44`
 *     (the standalone dialog);
 *   - `becpg-plm-share/.../forms/becpg-plm-form-config.xml:5521`
 *     (`bcpg:entityTplRef` of the `supplier-process` start-process form, the one
 *     `create-supplier-project.js` reads back as
 *     `assoc_bcpg_entityTplRef_added`).
 *
 * Both carry the identical string:
 *
 * ```
 * becpg/autocomplete/targetassoc/associations/pjt:project
 *     ?classNames=pjt:project,bcpg:entityTplAspect,bcpg:suppliersAspect
 *     &excludeProps=bcpg:entityTplEnabled|false
 * ```
 *
 * `TargetAssocAutoCompletePlugin.filterByClass()` turns every `classNames` entry
 * that resolves to an aspect into `BeCPGQueryBuilder.withAspect()`, which is a
 * **mandatory** clause (`+ASPECT:"…"`), and every type into `inType()`. So the
 * datasource is the conjunction:
 *
 *   > type `pjt:project` **and** aspect `bcpg:entityTplAspect` **and** aspect
 *   > `bcpg:suppliersAspect` **and** `bcpg:entityTplEnabled` ≠ `false`.
 *
 * The decisive aspect is `bcpg:suppliersAspect` (`PLMModel.ASPECT_SUPPLIERS`).
 * It is written onto the template by the product's own bootstrap —
 * `SupplierPortalInitRepoVisitor.visitContainer()`, line 204:
 * `pjtTpl.getAspects().add(PLMModel.ASPECT_SUPPLIERS)` — right next to the two
 * tasks ("Référencement", "Validation") and the `supplierPortalScript.js`
 * pre-deliverable. It is an **explicit marker set by beCPG when it creates the
 * template**, not something inferred.
 *
 * That is why this module matches on the marker and not on the name. On the
 * 26.1.0 reference instance the repository holds **62** enabled `pjt:project`
 * templates; the conjunction above selects exactly **one**, "Projet de
 * référencement fournisseur". A name match would have broken on translation and
 * on any customer rename; the path (`/Système/Modèles d'entités/Modèles de
 * projet`) is itself localised and `SupplierPortalInitRepoVisitor` tolerates the
 * template sitting one level up, so it is not load-bearing either. The aspect
 * survives a re-import, a rename and a locale change.
 *
 * `lib/adapters/monitor.js` already relies on the same aspect to tell a supplier
 * campaign from an R&D project (`config.supplierAspect`); this module is the
 * same rule applied to the templates rather than to their instances.
 *
 * ## Precedence
 *
 * 1. **`PORTAL_PROCESS_TEMPLATES` wins whenever it is set.** A non-empty
 *    variable is used verbatim and **no discovery query is issued at all** — an
 *    installation that pinned a nodeRef behaves exactly as before, and an
 *    operator keeps a way to restrict the portal to a subset (or, with a value
 *    that parses to nothing, to shut it entirely).
 * 2. **Discovery fills the list only when the variable is absent or blank.**
 *
 * ## What discovery permits, and what it still refuses
 *
 * Discovery is *not* "the portal may start anything it finds". The query is a
 * server-side constant: the browser cannot influence the path, the `classNames`
 * or the `excludeProps`. What comes back is therefore only ever a supplier
 * referencing template, and {@link resolveProcessTemplates} returns a closed
 * map. Everything else stays unstartable — a request naming another template,
 * by id or by nodeRef, is refused by the caller exactly as it was when the
 * allow-list came from the environment. Deny-by-default is unchanged: an
 * instance with no marked template resolves to an **empty** map, and an empty
 * map starts nothing.
 *
 * Server only.
 */

import { queryDatasource } from '@/lib/adapters/autocomplete';
import { getInstanceId, isNodeRef } from '@/lib/becpg';

/* -------------------------------------------------------------------------- */
/* The rule                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The datasource Share itself uses, byte for byte.
 *
 * Kept as one string rather than assembled from parts so a `grep` in this
 * repository and a `grep` in `becpg-plm-share` return the same text.
 *
 * @type {string}
 */
export const SUPPLIER_TEMPLATE_DATASOURCE =
    'becpg/autocomplete/targetassoc/associations/pjt:project'
    + '?classNames=pjt:project,bcpg:entityTplAspect,bcpg:suppliersAspect'
    + '&excludeProps=bcpg:entityTplEnabled|false';

/**
 * Id given to the first discovered template.
 *
 * Deliberately the id the pinned configuration used, so a deployment that drops
 * `PORTAL_PROCESS_TEMPLATES` keeps answering to the same request payloads.
 */
export const CANONICAL_PROCESS_ID = 'supplier-referencing';

/** Hard ceiling on how many templates discovery will expose. */
export const MAX_DISCOVERED_TEMPLATES = 25;

/** How long a discovery result is trusted, in seconds. */
const DEFAULT_TTL_SECONDS = 300;

/** Shorter TTL for "this instance has no supplier template", so an import shows up quickly. */
const EMPTY_TTL_SECONDS = 60;

/** Cache entries kept across tenants and users before the oldest is evicted. */
const MAX_CACHE_ENTRIES = 200;

/**
 * @returns {number} discovery TTL in milliseconds, from `PORTAL_PROCESS_TEMPLATES_TTL`
 */
function ttlMs() {
    const configured = Number(process.env.PORTAL_PROCESS_TEMPLATES_TTL);
    const seconds = Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_TTL_SECONDS;
    return seconds * 1000;
}

/* -------------------------------------------------------------------------- */
/* The override                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Parses `PORTAL_PROCESS_TEMPLATES` into `{ id -> nodeRef }`.
 *
 * Unchanged from the day the allow-list was the only mechanism: comma
 * separated, each entry a nodeRef or `id=nodeRef`, every template registered
 * **twice** — under its id and under its nodeRef — so a caller may always send
 * the nodeRef provided it is listed. An entry whose nodeRef does not parse is
 * dropped silently rather than widening the list.
 *
 * @returns {Map<string, string>} empty when nothing is configured (deny by default)
 */
export function configuredProcessTemplates() {
    const raw = String(process.env.PORTAL_PROCESS_TEMPLATES || '').trim();
    const templates = new Map();
    if (!raw) {
        return templates;
    }
    for (const entry of raw.split(',')) {
        const value = entry.trim();
        if (!value) {
            continue;
        }
        const separator = value.indexOf('=');
        const id = separator > 0 ? value.slice(0, separator).trim() : null;
        const nodeRef = separator > 0 ? value.slice(separator + 1).trim() : value;
        if (!isNodeRef(nodeRef)) {
            continue;
        }
        templates.set(id || nodeRef, nodeRef);
        // A caller may always send the nodeRef itself, provided it is listed.
        templates.set(nodeRef, nodeRef);
    }
    return templates;
}

/**
 * Is the environment pinning the list?
 *
 * Tested on the **raw** variable and not on the parsed map on purpose: a
 * variable set to something that parses to nothing means "start nothing", and
 * must not silently hand the decision back to discovery.
 *
 * @returns {boolean}
 */
export function hasConfiguredTemplates() {
    return String(process.env.PORTAL_PROCESS_TEMPLATES || '').trim().length > 0;
}

/* -------------------------------------------------------------------------- */
/* Cache                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * `${tenant}|${user}` → `{ at, ttl, value }`.
 *
 * Keyed by user as well as by tenant because the answer genuinely depends on
 * the caller: the datasource runs a permission-filtered search, so a template
 * the session may not read simply does not come back. Sharing one entry across
 * users would offer a button that then fails on click — the portal narrowing
 * beCPG's verdict is fine, widening it is not.
 */
const discoveryCache = new Map();

/**
 * @param {Object} session
 * @returns {string}
 */
function cacheKey(session) {
    const tenant = session?.tenantId || getInstanceId(session) || '';
    const user = session?.username || session?.sub || '';
    return `${tenant}|${user}`;
}

/**
 * @param {Object} session
 * @returns {{value: Object, expired: boolean}|null}
 */
function cacheGet(session) {
    const hit = discoveryCache.get(cacheKey(session));
    if (!hit) {
        return null;
    }
    return { value: hit.value, expired: Date.now() - hit.at > hit.ttl };
}

/**
 * @param {Object} session
 * @param {Object} value
 */
function cacheSet(session, value) {
    if (discoveryCache.size >= MAX_CACHE_ENTRIES) {
        // Cheap eviction: the map keeps insertion order, drop the oldest entry.
        const oldest = discoveryCache.keys().next();
        if (!oldest.done) {
            discoveryCache.delete(oldest.value);
        }
    }
    discoveryCache.set(cacheKey(session), {
        at: Date.now(),
        ttl: value.templates.length === 0 ? Math.min(ttlMs(), EMPTY_TTL_SECONDS * 1000) : ttlMs(),
        value,
    });
}

/** Empties the discovery cache. Exposed for tests and administration actions. */
export function clearProcessTemplateCache() {
    discoveryCache.clear();
}

/* -------------------------------------------------------------------------- */
/* Discovery                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A template the portal is willing to instantiate.
 *
 * @typedef {Object} ProcessTemplate
 * @property {string} id stable id the UI sends back
 * @property {string} nodeRef the template node
 * @property {string|null} label beCPG's own name for it, already in the user's locale
 */

/**
 * The id of a discovered template.
 *
 * The first one — templates are ordered by nodeRef so the order does not depend
 * on what the index happens to return — takes {@link CANONICAL_PROCESS_ID}; any
 * further one is suffixed with the first segment of its uuid, which is stable
 * for the life of the node. The nodeRef is registered as an id too, so a caller
 * that wants an id that can never be reassigned may simply send the nodeRef.
 *
 * @param {string} nodeRef
 * @param {number} index position in the ordered list
 * @returns {string}
 */
export function templateId(nodeRef, index) {
    if (index === 0) {
        return CANONICAL_PROCESS_ID;
    }
    const uuid = String(nodeRef).split('/').pop() || '';
    return `${CANONICAL_PROCESS_ID}-${uuid.split('-')[0] || index}`;
}

/**
 * Asks beCPG which supplier referencing templates this session can start.
 *
 * Never throws: an unreachable repository, a refused search or a malformed
 * answer all degrade to `{ available: false, reason }`, because the caller's job
 * is to render a state, not a stack trace.
 *
 * @param {Object} params
 * @param {Object} params.session the portal session
 * @returns {Promise<{templates: ProcessTemplate[], available: boolean, reason: string|null,
 *   total: number, truncated: boolean}>}
 */
export async function discoverSupplierTemplates(params = {}) {
    const { session } = params;

    let payload;
    try {
        payload = await queryDatasource({
            ds: SUPPLIER_TEMPLATE_DATASOURCE,
            q: '*',
            page: 1,
            pageSize: MAX_DISCOVERED_TEMPLATES,
            session,
        });
    }
    catch (error) {
        // 401/403 mean this session may not read the templates space; anything
        // else means beCPG could not answer. Both are states, not crashes.
        const denied = error?.status === 401 || error?.status === 403;
        return {
            templates: [],
            available: false,
            reason: denied ? 'denied' : 'unreachable',
            total: 0,
            truncated: false,
        };
    }

    const found = (Array.isArray(payload?.items) ? payload.items : [])
        .map((item) => ({ nodeRef: String(item?.value || ''), label: item?.label || null }))
        .filter((item) => isNodeRef(item.nodeRef));

    // Deterministic order, so an id round-trips across restarts and replicas.
    found.sort((a, b) => a.nodeRef.localeCompare(b.nodeRef));

    const kept = found.slice(0, MAX_DISCOVERED_TEMPLATES);
    // Truncation is measured against beCPG's `fullListSize`, not against the page
    // we asked for: the page is already capped at MAX_DISCOVERED_TEMPLATES, so
    // comparing it with itself would always report "nothing was dropped".
    const total = Number(payload?.total) || found.length;
    return {
        templates: kept.map((item, index) => ({
            id: templateId(item.nodeRef, index),
            nodeRef: item.nodeRef,
            label: item.label,
        })),
        available: true,
        reason: kept.length === 0 ? 'none' : null,
        total,
        truncated: total > kept.length,
    };
}

/* -------------------------------------------------------------------------- */
/* Resolution                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * **The one entry point** — the templates this session may start, and how the
 * portal came to that list.
 *
 * Precedence, restated because it is the contract:
 * `PORTAL_PROCESS_TEMPLATES` when set (no query issued), discovery otherwise.
 *
 * Never throws. When discovery fails and a previous answer is still in the
 * cache, that answer is served and flagged `stale` — a transient index hiccup
 * must not make a working button vanish.
 *
 * @param {Object} params
 * @param {Object} params.session the portal session
 * @param {boolean} [params.refresh=false] bypass the cache
 * @returns {Promise<{templates: Map<string, string>, processes: ProcessTemplate[],
 *   source: 'config'|'discovery', discovery: Object}>}
 */
export async function resolveProcessTemplates(params = {}) {
    const { session, refresh = false } = params;

    if (hasConfiguredTemplates()) {
        const templates = configuredProcessTemplates();
        return {
            templates,
            processes: [...templates.entries()]
                .filter(([id]) => !isNodeRef(id))
                .map(([id, nodeRef]) => ({ id, nodeRef, label: null })),
            source: 'config',
            discovery: { attempted: false, available: null, reason: null, stale: false },
        };
    }

    const cached = refresh ? null : cacheGet(session);
    let result = cached && !cached.expired ? cached.value : null;
    let stale = false;

    if (!result) {
        const fresh = await discoverSupplierTemplates({ session });
        if (fresh.available) {
            cacheSet(session, fresh);
            result = fresh;
        }
        else if (cached) {
            // Serve the last good answer rather than blanking the UI.
            result = cached.value;
            stale = true;
        }
        else {
            result = fresh;
        }
    }

    const templates = new Map();
    for (const entry of result.templates) {
        templates.set(entry.id, entry.nodeRef);
        // Same rule as the configured list: the nodeRef is always an accepted id.
        templates.set(entry.nodeRef, entry.nodeRef);
    }

    return {
        templates,
        processes: result.templates,
        source: 'discovery',
        discovery: {
            attempted: true,
            available: result.available,
            reason: result.reason,
            candidates: result.templates.length,
            truncated: Boolean(result.truncated),
            stale,
        },
    };
}
