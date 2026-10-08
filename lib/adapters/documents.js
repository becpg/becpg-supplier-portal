/**
 * Documents and documentary requirements adapter (spec §4.5, §5.4.2,
 * doc/becpg-api-contracts.md §9).
 *
 * **The single most important thing to understand before touching this file:
 * there is no requirement engine to write.** `DocumentFormulationHandler`
 * (becpg-plm-core) already materialises, at every formulation, the documents an
 * entity is expected to carry:
 *
 *   - it evaluates which `bcpg:documentType` apply (product type, hierarchy,
 *     linked characteristics, subsidiary, plants, `docTypeFormula` SPEL);
 *   - it **creates the missing expected documents** and names them with
 *     `docTypeNameFormat`;
 *   - it computes `bcpg:documentIsMandatory` for each of them;
 *   - it keeps `bcpg:documentState` up to date, where **`Simulation` means
 *     "expected but not provided"**, and removes the placeholders that stopped
 *     being applicable.
 *
 * So `/documents` and `/documents/requirements` read *the same* rows: one is the
 * document list, the other is the same list rendered as a check-list. No new
 * logic and no new data (spec §5.4.2).
 *
 * The one thing this adapter writes besides the file itself is the **validity
 * window**, and only where beCPG deliberately writes nothing — see
 * {@link setDocumentValidity} and the `effectivityTypes` note below.
 *
 * Everything is read with **one db-afts query** (`becpg/remote/entity/list`,
 * which runs `inDBIfPossible()`, i.e. AFTS syntax evaluated transactionally
 * against the database whenever the predicate is DB-supported, with a graceful
 * fallback to the index otherwise). Every property used in these queries is
 * indexed: `bcpg:documentState`, `bcpg:documentIsMandatory`, `cm:from`, `cm:to`,
 * `bcpg:documentTypeRef`.
 *
 * Server only — never import this from a client component.
 */

import {
    getJson,
    isNodeRef,
    nodeRefToPath,
    streamContent,
    uploadFile,
} from '@/lib/becpg';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import { withBasePath } from '@/lib/basePath';
import { saveForm } from '@/lib/adapters/forms';
import { isTechnicalSheet } from '@/lib/adapters/technicalSheet';
import { logDebug } from '@/lib/http';

/* -------------------------------------------------------------------------- */
/* Configuration                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Everything the document rules depend on. **No literal is hard-coded in the
 * query builders below**: they all read this object, so a tenant can override
 * the notice period, the state vocabulary or the status precedence without
 * touching a line of code (spec §5.4.3 — "paramétrable par tenant, pas codé en
 * dur").
 *
 * Override per call with `documentConfig({ noticeDays: 90 })`.
 */
export const DEFAULT_DOCUMENT_CONFIG = {
    /** Node type carrying `bcpg:documentAspect`. */
    contentType: 'cm:content',
    /** The aspect that makes a node a beCPG document. */
    documentAspect: 'bcpg:documentAspect',
    /** Type of the entity a document belongs to. */
    entityType: 'bcpg:entityV2',
    /** Type of a supplier entity. */
    supplierType: 'bcpg:supplier',

    /** Properties of `bcpg:documentAspect` (spec §1.3). */
    props: {
        state: 'bcpg:documentState',
        mandatory: 'bcpg:documentIsMandatory',
        category: 'bcpg:documentCategory',
        typeRef: 'bcpg:documentTypeRef',
        entityRef: 'bcpg:documentEntityRef',
        from: 'cm:from',
        to: 'cm:to',
        aiState: 'bcpg:aiValidationState',
        aiHints: 'bcpg:aiValidationHints',
        aiDate: 'bcpg:aiValidationDate',
        name: 'cm:name',
        modified: 'cm:modified',
        code: 'bcpg:code',
        charactName: 'bcpg:charactName',
        suppliers: 'bcpg:suppliers',
    },

    /**
     * `bcpg:systemState` vocabulary, as used on `bcpg:documentState`.
     * `Simulation` is *the* value that means "expected, not provided yet".
     */
    states: {
        expected: 'Simulation',
        toValidate: 'ToValidate',
        valid: 'Valid',
        refused: 'Refused',
    },

    /**
     * `bcpg:docTypeEffectivityType` vocabulary — **who owns `cm:from` / `cm:to`**.
     *
     * `DocumentAspectPolicy` (becpg-core) reads it on every content update and
     * only writes the dates for two of the three values:
     *
     * | value | what beCPG writes |
     * |---|---|
     * | `NONE` | `cm:from` = now, no end of validity |
     * | `AUTO` | `cm:from` = now, `cm:to` = from + `docTypeAutoExpirationDelay` |
     * | `MANUAL` | **nothing** — the dates are the supplier's to enter |
     *
     * An unset value behaves like `MANUAL`: nobody upstream fills the dates, so
     * a document type that declares none leaves them empty forever unless
     * someone types them. That is the case Share paints in red bold on a
     * mandatory document (`effectivity-mandatory`), and the reason the portal
     * lets the supplier write them.
     */
    effectivityTypes: {
        none: 'NONE',
        auto: 'AUTO',
        manual: 'MANUAL',
    },

    /**
     * Notice period, in days, before the end of validity (`cm:to`) at which a
     * document starts being reported as `expiring`. 60 days is the dashboard
     * default of spec §4.3 ("expirant < 60 j"); the standard beCPG notification
     * rule uses 90 (spec §1.5), and the monitoring screens want 30/60/90.
     */
    noticeDays: 60,

    /** Buckets exposed to the monitoring screens (spec §4.6.1). */
    expiryBuckets: [30, 60, 90],

    /**
     * Status precedence, most severe first. The first predicate that matches
     * wins, so reordering this array changes the reported status — which is
     * exactly the point of having it here rather than in an `if/else` chain.
     */
    statusOrder: ['missing', 'refused', 'expired', 'expiring', 'toValidate', 'valid'],

    /** Page size of the list endpoints. */
    pageSize: 100,
    /** Hard ceiling sent to `becpg/remote/entity/list` as `maxResults`. */
    maxResults: 1000,
    /**
     * Rows per **upstream** request when reading a result set to exhaustion.
     *
     * Kept below `beCPG.remote.maxResults.hardLimit` (256 on a stock instance):
     * a page at or above the cap comes back trimmed, and paging on a trimmed
     * page skips rows. 100 is beCPG's own default page size.
     */
    upstreamPageSize: 100,
    /** Above this number of suppliers, the scope is not expressed as ANCESTOR. */
    maxScopeAncestors: 25,
    /**
     * Ceiling on the entities handed to the supplier and filed outside its
     * space — each one becomes an `ANCESTOR` clause of the document query.
     */
    maxHandedEntities: 100,
    /** TTL of the supplier-scope memo, in ms. */
    scopeTtlMs: 60000,
};

/**
 * Merges an override object onto {@link DEFAULT_DOCUMENT_CONFIG}.
 *
 * @param {Object} [overrides] partial configuration
 * @returns {Object} the effective configuration
 */
export function documentConfig(overrides) {
    if (!overrides) {
        return DEFAULT_DOCUMENT_CONFIG;
    }
    return {
        ...DEFAULT_DOCUMENT_CONFIG,
        ...overrides,
        props: { ...DEFAULT_DOCUMENT_CONFIG.props, ...(overrides.props || {}) },
        states: { ...DEFAULT_DOCUMENT_CONFIG.states, ...(overrides.states || {}) },
        effectivityTypes: {
            ...DEFAULT_DOCUMENT_CONFIG.effectivityTypes,
            ...(overrides.effectivityTypes || {}),
        },
    };
}

/** Fields requested on a document row. Assoc fields use the `assoc|prop` form. */
function documentFields(config) {
    const p = config.props;
    return [
        p.state,
        p.mandatory,
        p.category,
        p.typeRef,
        `${p.typeRef}|bcpg:docTypeCategory`,
        // Who owns the validity window — see `effectivityTypes` above. Without
        // it the portal cannot tell a date beCPG computes from a date nobody
        // will ever fill.
        `${p.typeRef}|bcpg:docTypeEffectivityType`,
        p.entityRef,
        p.from,
        p.to,
        p.aiState,
        p.aiHints,
        p.aiDate,
        p.modified,
    ].join(',');
}

/* -------------------------------------------------------------------------- */
/* db-afts helpers                                                             */
/* -------------------------------------------------------------------------- */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * ISO-8601 in UTC, the form beCPG's `BeCPGQueryBuilder.andBetween()` expects in
 * a range. `Z` is used on purpose: an offset such as `+02:00` would put a `+`
 * inside an unquoted AFTS range term.
 *
 * @param {Date|number|string} value
 * @returns {string}
 */
export function toAftsDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new BadRequestError('Invalid date');
    }
    return date.toISOString();
}

/**
 * Escapes a value used inside a quoted AFTS term.
 *
 * @param {string} value
 * @returns {string}
 */
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

/**
 * Negated exact-match clause. Mirrors `AbstractBeCPGQueryBuilder.prohibided()`,
 * which emits ` AND -=<cond>` — that is the dialect this repository already
 * runs in production, so we do not invent another one.
 */
function notEq(property, value) {
    return `-=${property}:"${aftsValue(value)}"`;
}

/** Range clause. `MIN` / `MAX` are the accepted open bounds. */
function between(property, from, to) {
    return `${property}:[${from} TO ${to}]`;
}

/**
 * Scope clause: everything below one of the given nodes.
 *
 * A supplier entity is a folder; its branched entities live in its
 * `SupplierEntities` sub-folder and their documents in the entity's
 * `SupplierDocuments` sub-folder (`SupplierPortalServiceImpl`). So a single
 * `ANCESTOR` predicate covers the whole park of one supplier — documents
 * attached to the supplier itself included.
 *
 * @param {string[]} nodeRefs
 * @returns {string} the clause, or '' when there is nothing to scope on
 */
export function ancestorClause(nodeRefs) {
    const refs = (nodeRefs || []).filter(Boolean);
    if (refs.length === 0) {
        return '';
    }
    if (refs.length === 1) {
        return `ANCESTOR:"${aftsValue(refs[0])}"`;
    }
    return `(${refs.map((ref) => `ANCESTOR:"${aftsValue(ref)}"`).join(' OR ')})`;
}

/**
 * `ID:"..."` disjunction — used to resolve a bounded set of nodes in one query.
 *
 * @param {string[]} nodeRefs
 * @returns {string}
 */
export function idClause(nodeRefs) {
    const refs = (nodeRefs || []).filter(Boolean);
    if (refs.length === 0) {
        return '';
    }
    if (refs.length === 1) {
        return `ID:"${aftsValue(refs[0])}"`;
    }
    return `(${refs.map((ref) => `ID:"${aftsValue(ref)}"`).join(' OR ')})`;
}

/**
 * Builds the db-afts query of a document set.
 *
 * Exported because it is the contract: the monitoring screens, the approval
 * rules and the notifications all reuse these exact strings, and a reviewer must
 * be able to read them without running the portal.
 *
 * Base query (always present):
 *
 * ```
 * TYPE:"cm:content" AND ASPECT:"bcpg:documentAspect"
 * ```
 *
 * The explicit `TYPE:` clause is **required**: `AbstractEntityWebScript` adds
 * `ofType(bcpg:entityV2)` to any query that does not mention `TYPE`, which would
 * silently return nothing, since a document is a `cm:content`.
 *
 * @param {Object} [criteria]
 * @param {string[]} [criteria.ancestors] restrict to the sub-trees of these nodes
 * @param {boolean} [criteria.mandatoryOnly] only `bcpg:documentIsMandatory:true`
 * @param {boolean} [criteria.provided] true = provided, false = expected only
 * @param {string} [criteria.state] exact `bcpg:documentState`
 * @param {string} [criteria.documentTypeRef] not usable in db-afts, ignored here
 * @param {{from: (Date|string), to: (Date|string)}} [criteria.expiryRange]
 *   range on `cm:to`; `from`/`to` may be the `MIN` / `MAX` sentinels
 * @param {Object} [criteria.config] configuration override
 * @returns {string} the AFTS query
 */
export function buildDocumentQuery(criteria = {}) {
    const config = criteria.config || DEFAULT_DOCUMENT_CONFIG;
    const p = config.props;

    const clauses = [
        `TYPE:"${config.contentType}"`,
        `ASPECT:"${config.documentAspect}"`,
        ancestorClause(criteria.ancestors),
    ];

    if (criteria.mandatoryOnly) {
        clauses.push(eq(p.mandatory, 'true'));
    }
    if (criteria.state) {
        clauses.push(eq(p.state, criteria.state));
    }
    else if (criteria.provided === true) {
        clauses.push(notEq(p.state, config.states.expected));
    }
    else if (criteria.provided === false) {
        clauses.push(eq(p.state, config.states.expected));
    }

    if (criteria.expiryRange) {
        const from = criteria.expiryRange.from === 'MIN'
            ? 'MIN'
            : toAftsDate(criteria.expiryRange.from);
        const to = criteria.expiryRange.to === 'MAX'
            ? 'MAX'
            : toAftsDate(criteria.expiryRange.to);
        clauses.push(between(p.to, from, to));
    }

    return and(clauses);
}

/* -------------------------------------------------------------------------- */
/* Low-level search                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Normalises one `{ "entity": { … } }` row of `becpg/remote/entity/list`.
 *
 * The visitor puts the identifier, the type and the "name" property at the root
 * of the object and everything that was asked for through `fields` under
 * `attributes` (`JsonEntityVisitor`).
 *
 * @param {Object} row a row of the `entities` array
 * @returns {Object|null} `{ nodeRef, id, type, name, attributes }`
 */
export function normalizeNode(row) {
    const node = row && row.entity ? row.entity : row;
    if (!node || !node.id) {
        return null;
    }
    return {
        nodeRef: isNodeRef(node.id) ? node.id : `workspace://SpacesStore/${node.id}`,
        id: node.id,
        type: node.type || '',
        name: node['cm:name'] || node['bcpg:charactName'] || node['cm:userName'] || '',
        code: node['bcpg:code'] || '',
        version: node.version || '',
        attributes: node.attributes || {},
        raw: node,
    };
}

/**
 * Runs one db-afts query through `becpg/remote/entity/list`.
 *
 * `becpg/remote/entity/list?query=…` goes through
 * `BeCPGQueryBuilder…inDBIfPossible()`: AFTS syntax, transactional consistency
 * when the predicate is DB-supported, index otherwise. Results are ACL-filtered
 * by Alfresco for the session user, which is what scopes a supplier to its own
 * park even before the portal adds its own `ANCESTOR` restriction.
 *
 * @param {string} query the AFTS query — must contain an explicit `TYPE:` clause
 * @param {Object} [options]
 * @param {string} [options.fields] comma-separated prefixed property names
 * @param {number} [options.maxResults]
 * @param {number} [options.page] 1-based
 * @param {Object} [options.session] an already-resolved session
 * @returns {Promise<{items: Object[], pagination: Object, query: string}>}
 */
export async function searchNodes(query, options = {}) {
    const { fields, maxResults, page, session } = options;
    const payload = await getJson('becpg/remote/entity/list', {
        session,
        query: {
            query,
            ...(fields ? { fields } : {}),
            ...(maxResults ? { maxResults } : {}),
            ...(page && page > 1 ? { page } : {}),
        },
    });

    const entities = Array.isArray(payload && payload.entities) ? payload.entities : [];
    const items = entities.map(normalizeNode).filter(Boolean);
    const pagination = (payload && payload.pagination) || {
        count: items.length,
        totalItems: items.length,
        hasMoreItems: false,
    };

    logDebug('documents.query', { query, count: items.length, total: pagination.totalItems });

    return { items, pagination, query };
}

/**
 * Runs one db-afts query **to exhaustion**, following beCPG's own pagination.
 *
 * `becpg/remote/entity/list` caps a request that asks for `fields` (or `lists`)
 * at `beCPG.remote.maxResults.hardLimit` — 256 on a stock instance
 * (`becpg-config-core.properties`), whatever `maxResults` says. The cap is
 * applied silently: the answer simply stops at 256 rows. It is *not* an error,
 * and it is not undetectable either — the response carries
 * `pagination.hasMoreItems: true`, which is the only honest signal of it.
 *
 * Asking for a bigger `maxResults` does not lift the cap; only paging does.
 * Measured on this instance, on a supplier holding 312 requirement rows:
 *
 * ```
 * maxResults=1000 without fields -> 312 rows, hasMoreItems false
 * maxResults=1000 with    fields -> 256 rows, hasMoreItems TRUE   <- silently cut
 * page=1..4 at 100 with   fields -> 100+100+100+12 = 312 distinct, hasMoreItems false
 * ```
 *
 * A caller that reads one window and stops does not merely lose rows: it
 * *miscounts*, because every summary is then computed on an arbitrary subset.
 * That is what this helper exists to prevent — see {@link listDocuments}.
 *
 * Two details of the endpoint this loop is built on, both measured:
 *
 *   - `page` is 1-based here, and **`page=0` aliases to `page=1`** — iterating
 *     from 0 returns the first window twice. The loop therefore starts at 1.
 *   - a repeated row would corrupt every count downstream, so results are
 *     de-duplicated on `nodeRef` regardless.
 *
 * @param {string} query the AFTS query — must contain an explicit `TYPE:` clause
 * @param {Object} [options]
 * @param {string} [options.fields] comma-separated prefixed property names
 * @param {Object} [options.session] an already-resolved session
 * @param {number} [options.pageSize=100] rows per upstream request
 * @param {number} [options.maxPages=40] safety ceiling — 4 000 rows by default
 * @returns {Promise<{items: Object[], pagination: Object, query: string, truncated: boolean}>}
 *   `truncated` is true only when the ceiling was reached with rows still
 *   pending — i.e. the one case where the answer really is incomplete.
 */
export async function searchAllNodes(query, options = {}) {
    const {
        fields, session, pageSize = 100, maxPages = 40,
    } = options;

    const items = [];
    const seen = new Set();
    let pagination = { count: 0, totalItems: 0, hasMoreItems: false };
    let truncated = false;
    let pages = 0;

    for (let page = 1; page <= maxPages; page += 1) {
        const result = await searchNodes(query, {
            fields, session, maxResults: pageSize, page,
        });
        pages += 1;
        pagination = result.pagination;

        for (const item of result.items) {
            const key = item && item.nodeRef;
            if (key && seen.has(key)) {
                continue;
            }
            if (key) {
                seen.add(key);
            }
            items.push(item);
        }

        // An empty page is a stop condition in its own right: a truthful
        // `hasMoreItems` on a page that returned nothing would loop forever.
        if (!pagination.hasMoreItems || result.items.length === 0) {
            truncated = false;
            break;
        }
        if (page === maxPages) {
            truncated = true;
        }
    }

    logDebug('documents.queryAll', {
        query, pages, count: items.length, truncated,
    });

    return {
        items,
        pagination: { ...pagination, count: items.length, hasMoreItems: truncated },
        query,
        truncated,
    };
}

/* -------------------------------------------------------------------------- */
/* Supplier scope                                                              */
/* -------------------------------------------------------------------------- */

/** tenant|user → { at, refs } */
const scopeCache = new Map();

/**
 * The supplier entities the session user may see.
 *
 * **One db-afts query**, ACL-filtered by Alfresco:
 *
 * ```
 * TYPE:"bcpg:supplier"
 * ```
 *
 * An external supplier account only reads the supplier(s) it is attached to
 * (`GROUP_EXTERNAL_SUPPLIER_<code>` / `bcpg:supplierAccounts`), so the same
 * query serves the supplier space and, for an internal user, the monitoring
 * park. It is memoised for `config.scopeTtlMs` per tenant and user.
 *
 * @param {Object} session the portal session
 * @param {Object} [options]
 * @param {Object} [options.config] configuration override
 * @param {boolean} [options.refresh] bypass the memo
 * @param {string} [options.query] extra AFTS clause (park filters)
 * @returns {Promise<Object[]>} normalised supplier nodes
 */
export async function resolveSupplierScope(session, options = {}) {
    // `options.config` may be a partial override coming straight from a route
    // handler (`{ noticeDays: 90 }`): always merge it onto the defaults.
    const config = documentConfig(options.config);
    const key = `${session?.tenantId || ''}|${session?.username || session?.sub || ''}|${options.query || ''}`;

    if (!options.refresh) {
        const hit = scopeCache.get(key);
        if (hit && Date.now() - hit.at < config.scopeTtlMs) {
            return hit.refs;
        }
    }

    const query = and([`TYPE:"${config.supplierType}"`, options.query]);
    const { items } = await searchNodes(query, {
        session,
        fields: config.props.code,
        maxResults: config.maxResults,
    });

    scopeCache.set(key, { at: Date.now(), refs: items });
    return items;
}

/**
 * Drops the memoised supplier scope. Called after a document upload, so a
 * freshly created supplier space is picked up immediately.
 *
 * @param {Object} [session] limit the eviction to this session
 */
export function invalidateSupplierScope(session) {
    if (!session) {
        scopeCache.clear();
        return;
    }
    const prefix = `${session.tenantId || ''}|${session.username || session.sub || ''}|`;
    for (const key of scopeCache.keys()) {
        if (key.startsWith(prefix)) {
            scopeCache.delete(key);
        }
    }
}

/**
 * The group beCPG gives a supplier's accounts — `SupplierPortalServiceImpl`
 * names it `EXTERNAL_SUPPLIER_<bcpg:code>` and stores it, `GROUP_`-prefixed, in
 * `bcpg:externalAccessGroup` on every entity it hands to that supplier.
 */
const SUPPLIER_ACCESS_GROUP_PREFIX = 'GROUP_EXTERNAL_SUPPLIER_';

/**
 * The `bcpg:externalAccessGroup` value of a supplier, or null when it has no
 * code — beCPG creates no group for a supplier without one.
 *
 * @param {string|null|undefined} code the supplier `bcpg:code`
 * @returns {string|null}
 */
export function supplierAccessGroup(code) {
    const trimmed = typeof code === 'string' ? code.trim() : '';
    return trimmed ? `${SUPPLIER_ACCESS_GROUP_PREFIX}${trimmed}` : null;
}

/**
 * The entities handed to these suppliers that live **outside** their space.
 *
 * Closing a referencing merges the branch filed under the supplier into the
 * original, filed in its own site, and deletes the branch — documents included,
 * which move onto the original. `validateProjectEntity` grants the supplier
 * group read on it from `bcpg:externalAccessGroup`, which the merge carries
 * over and which is indexed: that property finds them again.
 *
 * @param {Object} session
 * @param {Object[]} suppliers `{ code }` rows of {@link resolveSupplierScope}
 * @param {Object} config
 * @returns {Promise<{nodeRefs: string[], truncated: boolean}>}
 */
async function handedEntities(session, suppliers, config) {
    const groups = suppliers.map((supplier) => supplierAccessGroup(supplier.code)).filter(Boolean);
    if (groups.length === 0) {
        return { nodeRefs: [], truncated: false };
    }
    const { items } = await searchNodes(
        and([
            `TYPE:"${config.entityType}"`,
            `(${groups.map((group) => eq('bcpg:externalAccessGroup', group)).join(' OR ')})`,
        ]),
        { session, fields: 'cm:name', maxResults: config.maxHandedEntities + 1 },
    );
    return {
        nodeRefs: items.slice(0, config.maxHandedEntities).map((item) => item.nodeRef),
        truncated: items.length > config.maxHandedEntities,
    };
}

/**
 * {@link resolveScope}, widened to the entities handed to the supplier and
 * filed elsewhere — the scope of what a supplier calls "my documents".
 *
 * Only a scoped listing is widened: an unscoped one (the monitoring park)
 * already reads everything the caller may read.
 *
 * @param {Object} session
 * @param {string|string[]} [requested]
 * @param {Object} config
 * @returns {Promise<{suppliers: Object[], ancestors: string[], handed: {count: number, truncated: boolean}}>}
 */
async function resolveDocumentScope(session, requested, config) {
    const { suppliers, ancestors } = await resolveScope(session, requested, { config });
    if (ancestors.length === 0) {
        return { suppliers, ancestors, handed: { count: 0, truncated: false } };
    }
    const { nodeRefs, truncated } = await handedEntities(session, suppliers, config);
    return {
        suppliers,
        ancestors: [...ancestors, ...nodeRefs],
        handed: { count: nodeRefs.length, truncated },
    };
}

/**
 * Turns the caller's `supplier` parameter into the list of nodeRefs the queries
 * may be scoped on — and **refuses a nodeRef the session does not own**
 * (spec §6.3: the proxy checks the perimeter in addition to beCPG).
 *
 * @param {Object} session
 * @param {string|string[]} [requested] supplier nodeRef(s) asked for
 * @param {Object} [options] forwarded to {@link resolveSupplierScope}
 * @returns {Promise<{suppliers: Object[], ancestors: string[]}>}
 */
export async function resolveScope(session, requested, options = {}) {
    const config = documentConfig(options.config);
    const suppliers = await resolveSupplierScope(session, options);

    const asked = (Array.isArray(requested) ? requested : [requested])
        .filter(Boolean)
        .map((value) => String(value));

    let selected = suppliers;
    if (asked.length > 0) {
        const allowed = new Set(suppliers.map((supplier) => supplier.nodeRef));
        const unknown = asked.filter((ref) => !allowed.has(ref));
        if (unknown.length > 0) {
            throw new NotFoundError('Unknown supplier for this session', {
                details: { supplier: unknown[0].slice(0, 80) },
            });
        }
        selected = suppliers.filter((supplier) => asked.includes(supplier.nodeRef));
    }

    // Above the threshold the ANCESTOR disjunction stops being a sensible
    // predicate: the query runs unscoped and Alfresco's ACL filtering plus the
    // entity → supplier mapping do the scoping.
    const ancestors = selected.length > 0 && selected.length <= config.maxScopeAncestors
        ? selected.map((supplier) => supplier.nodeRef)
        : [];

    return { suppliers: selected, ancestors };
}

/* -------------------------------------------------------------------------- */
/* Document projection                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Reads an association value out of an `attributes` block. beCPG serialises a
 * single-valued association as an object and a multi-valued one as an array.
 *
 * @param {Object} attributes
 * @param {string} name prefixed association name
 * @returns {Object[]} always an array
 */
function assocList(attributes, name) {
    const value = attributes ? attributes[name] : null;
    if (!value) {
        return [];
    }
    return Array.isArray(value) ? value : [value];
}

/**
 * Turns an association node into `{ nodeRef, label, type }`.
 *
 * @param {Object} node
 * @returns {Object|null}
 */
function assocRef(node) {
    if (!node || !node.id) {
        return null;
    }
    const attributes = node.attributes || {};
    return {
        nodeRef: isNodeRef(node.id) ? node.id : `workspace://SpacesStore/${node.id}`,
        label: node['bcpg:charactName'] || node['cm:name'] || '',
        type: node.type || '',
        // Only present when the caller asked for it with the `assoc|prop` form
        // of `fields` (e.g. `bcpg:documentTypeRef|bcpg:docTypeCategory`).
        category: attributes['bcpg:docTypeCategory'] || null,
        effectivityType: attributes['bcpg:docTypeEffectivityType'] || null,
    };
}

/**
 * Derives the presentation status of a document.
 *
 * The order is `config.statusOrder`, most severe first — the first matching
 * predicate wins:
 *
 * | status       | condition                                                   |
 * |--------------|-------------------------------------------------------------|
 * | `missing`    | `bcpg:documentState = Simulation` (expected, not provided)  |
 * | `refused`    | `bcpg:documentState = Refused`                              |
 * | `expired`    | `cm:to` in the past                                         |
 * | `expiring`   | `cm:to` within the notice period                            |
 * | `toValidate` | `bcpg:documentState = ToValidate`                           |
 * | `valid`      | none of the above                                           |
 *
 * @param {Object} facts `{ state, toDate, daysToExpiry }`
 * @param {Object} config
 * @returns {string} one of `config.statusOrder`
 */
export function deriveDocumentStatus(facts, config = DEFAULT_DOCUMENT_CONFIG) {
    const predicates = {
        missing: () => facts.state === config.states.expected,
        refused: () => facts.state === config.states.refused,
        expired: () => facts.daysToExpiry !== null && facts.daysToExpiry < 0,
        expiring: () => facts.daysToExpiry !== null && facts.daysToExpiry <= config.noticeDays,
        toValidate: () => facts.state === config.states.toValidate,
        valid: () => true,
    };
    for (const status of config.statusOrder) {
        const predicate = predicates[status];
        if (predicate && predicate()) {
            return status;
        }
    }
    return 'valid';
}

/**
 * Projects a raw document node onto the portal contract.
 *
 * ```json
 * {
 *   "nodeRef": "workspace://SpacesStore/…",
 *   "name": "Certificat IFS 2026.pdf",
 *   "type":  { "nodeRef": "workspace://SpacesStore/…", "label": "Certificat IFS" },
 *   "category": "Quality",
 *   "isMandatory": true,
 *   "state": "ToValidate",
 *   "validFrom": "2026-01-01T00:00:00.000Z",
 *   "validTo": "2026-12-31T00:00:00.000Z",
 *   "daysToExpiry": 155,
 *   "status": "valid",
 *   "effectivityType": "MANUAL",
 *   "validityEditable": true,
 *   "validityRequired": true,
 *   "validityMissing": false,
 *   "aiValidationState": "ToValidate",
 *   "aiValidationHints": "…",
 *   "aiValidationDate": "2026-07-02T09:12:00.000Z",
 *   "entity": { "nodeRef": "workspace://SpacesStore/…", "label": "MP001", "type": "bcpg:rawMaterial" },
 *   "modified": "2026-07-02T09:12:00.000Z",
 *   "downloadUrl": "/api/v1/documents/<uuid>/content"
 * }
 * ```
 *
 * `downloadUrl` points at the portal, never at Alfresco: the browser must never
 * be handed a direct repository URL (spec §6.1).
 *
 * @param {Object} node a node returned by {@link searchNodes}
 * @param {Object} [options] `{ config, now }`
 * @returns {Object} the document
 */
export function toDocument(node, options = {}) {
    const config = options.config || DEFAULT_DOCUMENT_CONFIG;
    const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
    const p = config.props;
    const attributes = node.attributes || {};

    const state = attributes[p.state] || '';
    const validFrom = attributes[p.from] || null;
    const validTo = attributes[p.to] || null;

    let daysToExpiry = null;
    if (validTo) {
        const to = new Date(validTo);
        if (!Number.isNaN(to.getTime())) {
            daysToExpiry = Math.ceil((to.getTime() - now.getTime()) / MS_PER_DAY);
        }
    }

    const type = assocRef(assocList(attributes, p.typeRef)[0]);
    const entity = assocRef(assocList(attributes, p.entityRef)[0]);
    const isMandatory = attributes[p.mandatory] === true || attributes[p.mandatory] === 'true';

    const status = deriveDocumentStatus({ state, daysToExpiry }, config);
    const isExpected = state === config.states.expected;

    /*
     * WHO OWNS THE VALIDITY WINDOW.
     *
     * `DocumentAspectPolicy` only fills `cm:from` / `cm:to` for the `NONE` and
     * `AUTO` types. On a `MANUAL` type — or on a type that declares none at
     * all, which is frequent — nobody upstream writes them: those dates stay
     * empty as long as a human does not enter them, and it is not up to the
     * client to do it on behalf of their supplier. The portal therefore makes
     * them editable in that case, and in that case only: overwriting a date
     * computed by beCPG would be taking a business rule back from the
     * repository (rule R2).
     */
    const effectivityType = (type && type.effectivityType) || null;
    const validityEditable = effectivityType !== config.effectivityTypes.auto
        && effectivityType !== config.effectivityTypes.none;
    const validityRequired = validityEditable && isMandatory;

    return {
        nodeRef: node.nodeRef,
        id: node.id,
        name: node.name,
        type,
        category: attributes[p.category] || (type && type.category) || null,
        isMandatory,
        state,
        isProvided: !isExpected,
        validFrom,
        validTo,
        daysToExpiry,
        status,
        effectivityType,
        validityEditable,
        validityRequired,
        /*
         * The red bold case of Share (`effectivity-mandatory`): a mandatory
         * document, already provided, whose validity nobody has filled in. On a
         * slot that is still empty the window makes no sense — it is the file
         * that is missing, not its date.
         */
        validityMissing: validityRequired && !isExpected && !validFrom && !validTo,
        aiValidationState: attributes[p.aiState] || null,
        aiValidationHints: attributes[p.aiHints] || null,
        aiValidationDate: attributes[p.aiDate] || null,
        entity,
        // Decided HERE, on the server, and never in the browser: the patterns come
        // from `PORTAL_TECHNICAL_SHEET_TYPES`, and `process.env` is not readable
        // from a client component — a client-side match would silently ignore the
        // instance's own configuration and fall back to our defaults.
        isTechnicalSheet: isTechnicalSheet({ type, category: attributes[p.category] || null }),
        modified: attributes[p.modified] || null,
        // A placeholder has no content yet: offering a download would 404.
        downloadUrl: isExpected ? null : withBasePath(`/api/v1/documents/${encodeURIComponent(node.id)}/content`),
        uploadTarget: {
            documentRef: node.nodeRef,
            entityRef: entity ? entity.nodeRef : null,
        },
    };
}

/**
 * Counts a document list by status and by expiry bucket — the numbers the
 * dashboard cards (spec §4.3) and the park overview (spec §4.6.1) display.
 *
 * @param {Object[]} documents
 * @param {Object} [config]
 * @returns {Object} `{ total, byStatus, mandatory, expiringIn }`
 */
export function summarizeDocuments(documents, config = DEFAULT_DOCUMENT_CONFIG) {
    const byStatus = {};
    for (const status of config.statusOrder) {
        byStatus[status] = 0;
    }
    const expiringIn = {};
    for (const bucket of config.expiryBuckets) {
        expiringIn[bucket] = 0;
    }

    let mandatory = 0;
    let mandatorySatisfied = 0;

    for (const document of documents) {
        byStatus[document.status] = (byStatus[document.status] || 0) + 1;
        if (document.isMandatory) {
            mandatory += 1;
            if (document.status === 'valid' || document.status === 'toValidate') {
                mandatorySatisfied += 1;
            }
        }
        if (document.daysToExpiry !== null && document.daysToExpiry >= 0) {
            for (const bucket of config.expiryBuckets) {
                if (document.daysToExpiry <= bucket) {
                    expiringIn[bucket] += 1;
                }
            }
        }
    }

    return {
        total: documents.length,
        byStatus,
        expiringIn,
        mandatory,
        mandatorySatisfied,
        completeness: mandatory === 0 ? 100 : Math.round((mandatorySatisfied / mandatory) * 100),
    };
}

/* -------------------------------------------------------------------------- */
/* Public API — list                                                           */
/* -------------------------------------------------------------------------- */

/**
 * `GET /api/v1/documents` — the documents of the supplier's entities.
 *
 * One db-afts query, then a pure projection. Filtering by status is done in
 * memory on purpose: `status` is derived (it mixes `bcpg:documentState` with
 * `cm:to`), so pushing it into the query would mean several queries and a
 * paginated result that no longer adds up.
 *
 * @param {Object} params
 * @param {Object} params.session portal session
 * @param {string|string[]} [params.supplier] restrict to these supplier nodeRefs
 * @param {string} [params.entity] restrict to one entity (`bcpg:documentEntityRef`)
 * @param {string} [params.status] one of `config.statusOrder`
 * @param {boolean} [params.mandatoryOnly]
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize]
 * @param {Object} [params.config] configuration override
 * @returns {Promise<Object>} `{ items, summary, pagination, scope, query }`
 */
export async function listDocuments(params = {}) {
    const config = documentConfig(params.config);
    const { session } = params;
    const now = new Date();

    const { suppliers, ancestors, handed } = await resolveDocumentScope(session, params.supplier, config);

    const query = buildDocumentQuery({
        config,
        ancestors,
        mandatoryOnly: Boolean(params.mandatoryOnly),
    });

    /*
     * An account attached to no supplier is a **configuration fact**, and the
     * list it produces is empty for a reason no screen could otherwise guess
     * (defect L3). `scope` stays the array it has always been — the ERP-facing
     * contract does not move — and the statement travels beside it.
     */
    const supplierScope = {
        suppliers: suppliers.length,
        applied: ancestors.length > 0,
        // Referenced products live outside the supplier space; past the
        // ceiling their documents are missing from this list, and it says so.
        handed,
        empty: suppliers.length === 0
            ? {
                reason: 'noSupplierIdentity',
                hint: 'No GROUP_EXTERNAL_SUPPLIER_<code> membership resolves to a supplier'
                    + ' this session can read, so no document can be attributed to it.',
            }
            : null,
    };

    // Read the whole result set, not one capped window: `params.entity` and
    // `params.status` below filter **in memory**, and the summary counts what
    // survives. Against a 256-row cap that turned a product's eight outstanding
    // requirements into `total: 0, completeness: 100` — the portal telling the
    // supplier he was done while beCPG held eight unsatisfied mandatory rows.
    const { items, pagination, truncated } = await searchAllNodes(query, {
        session,
        fields: documentFields(config),
        pageSize: config.upstreamPageSize,
    });

    let documents = items.map((node) => toDocument(node, { config, now }));

    if (params.entity) {
        const entityRef = String(params.entity);
        documents = documents.filter((doc) => doc.entity && doc.entity.nodeRef === entityRef);
    }
    if (params.status) {
        const wanted = String(params.status).split(',').map((value) => value.trim());
        documents = documents.filter((doc) => wanted.includes(doc.status));
    }

    const summary = summarizeDocuments(documents, config);

    // Most urgent first: missing, then the closest expiry.
    const severity = new Map(config.statusOrder.map((status, index) => [status, index]));
    documents.sort((a, b) => {
        const bySeverity = (severity.get(a.status) ?? 99) - (severity.get(b.status) ?? 99);
        if (bySeverity !== 0) {
            return bySeverity;
        }
        const left = a.daysToExpiry === null ? Number.MAX_SAFE_INTEGER : a.daysToExpiry;
        const right = b.daysToExpiry === null ? Number.MAX_SAFE_INTEGER : b.daysToExpiry;
        return left - right;
    });

    const pageSize = Number(params.pageSize) > 0 ? Number(params.pageSize) : config.pageSize;
    const page = Number(params.page) > 0 ? Number(params.page) : 1;
    const start = (page - 1) * pageSize;
    const pageItems = documents.slice(start, start + pageSize);

    return {
        items: pageItems,
        summary,
        pagination: {
            page,
            pageSize,
            count: pageItems.length,
            totalItems: documents.length,
            hasMoreItems: start + pageSize < documents.length,
            upstream: pagination,
            /**
             * True only if the safety ceiling of {@link searchAllNodes} was hit
             * with rows still pending. Every count in `summary` is then computed
             * on an incomplete set, and a caller that shows them as totals is
             * lying to the user — so the flag travels with them rather than
             * being dropped here.
             */
            truncated,
        },
        scope: suppliers.map((supplier) => ({
            nodeRef: supplier.nodeRef,
            name: supplier.name,
            code: supplier.code,
        })),
        supplierScope,
        query,
        generatedAt: now.toISOString(),
    };
}

/**
 * `GET /api/v1/documents/requirements` — "what I must provide, and by when".
 *
 * **This is a presentation, not a computation** (spec §5.4.2): the same rows as
 * {@link listDocuments}, grouped by entity and by document type, with the
 * check-list flags the UI needs. `documentState = Simulation` is the requirement
 * that is still open.
 *
 * @param {Object} params same as {@link listDocuments}
 * @returns {Promise<Object>} `{ groups, requirements, summary, pagination, query }`
 */
export async function listRequirements(params = {}) {
    const config = documentConfig(params.config);
    const listed = await listDocuments({
        ...params,
        config,
        page: 1,
        pageSize: config.maxResults,
        // A requirement check-list is about what is expected: `mandatoryOnly`
        // stays a caller choice, but the default shows optional ones too, with
        // their `isMandatory` flag, because that is what the supplier asks for.
    });

    const requirements = listed.items.map((document) => ({
        ...document,
        satisfied: document.status === 'valid' || document.status === 'toValidate',
        blocking: document.isMandatory
            && ['missing', 'expired', 'refused'].includes(document.status),
        dueDate: document.validTo,
        action: document.status === 'missing' ? 'upload'
            : (['expired', 'expiring', 'refused'].includes(document.status) ? 'renew' : null),
    }));

    const groups = new Map();
    for (const requirement of requirements) {
        const key = requirement.entity ? requirement.entity.nodeRef : 'unassigned';
        if (!groups.has(key)) {
            groups.set(key, {
                entity: requirement.entity,
                items: [],
            });
        }
        groups.get(key).items.push(requirement);
    }

    const grouped = [...groups.values()].map((group) => ({
        ...group,
        summary: summarizeDocuments(group.items, config),
    }));

    return {
        requirements,
        groups: grouped,
        summary: {
            ...listed.summary,
            open: requirements.filter((item) => !item.satisfied).length,
            blocking: requirements.filter((item) => item.blocking).length,
        },
        scope: listed.scope,
        supplierScope: listed.supplierScope,
        // Carried through as the JSDoc above promises. It is the only place a
        // caller can learn that the answer is incomplete (`pagination.truncated`):
        // a check-list that silently drops rows is worse than one that says so.
        pagination: listed.pagination,
        query: listed.query,
        generatedAt: listed.generatedAt,
    };
}

/* -------------------------------------------------------------------------- */
/* Public API — content and upload                                             */
/* -------------------------------------------------------------------------- */

/**
 * Accepts a document identifier in any of the forms the client may hold and
 * returns a nodeRef.
 *
 * @param {string} id `workspace://SpacesStore/<uuid>`, `workspace/SpacesStore/<uuid>` or `<uuid>`
 * @returns {string} the nodeRef
 * @throws {BadRequestError}
 */
export function toDocumentNodeRef(id) {
    const value = decodeURIComponent(String(id || '')).trim();
    if (!value) {
        throw new BadRequestError('Missing document identifier');
    }
    if (isNodeRef(value)) {
        return value;
    }
    if (/^[A-Za-z][A-Za-z0-9+.-]*\/[^/]+\/.+$/.test(value)) {
        return value.replace('/', '://');
    }
    if (/^[0-9a-fA-F-]{16,}$/.test(value)) {
        return `workspace://SpacesStore/${value}`;
    }
    throw new BadRequestError('Invalid document identifier');
}

/**
 * Checks that a document is inside the session's perimeter, and returns it.
 *
 * beCPG remains the authority (an unreadable node answers 403 whatever we do),
 * but spec §6.3 asks the proxy to verify the perimeter as well. **One db-afts
 * query**:
 *
 * ```
 * TYPE:"cm:content" AND ASPECT:"bcpg:documentAspect"
 *   AND (ANCESTOR:"<supplier1>" OR …) AND ID:"<document>"
 * ```
 *
 * @param {Object} params `{ session, nodeRef, config, supplier }`
 * @returns {Promise<Object>} the document projection
 * @throws {NotFoundError} when the node is not a document of this perimeter
 */
export async function getDocument(params = {}) {
    const config = documentConfig(params.config);
    const { session } = params;
    const nodeRef = toDocumentNodeRef(params.nodeRef);

    const { ancestors } = await resolveDocumentScope(session, params.supplier, config);
    const query = and([
        buildDocumentQuery({ config, ancestors }),
        idClause([nodeRef]),
    ]);

    const { items } = await searchNodes(query, {
        session,
        fields: documentFields(config),
        maxResults: 1,
    });

    if (items.length === 0) {
        throw new NotFoundError('Document not found in this perimeter', {
            details: { document: nodeRef.slice(0, 80) },
        });
    }
    return toDocument(items[0], { config, now: new Date() });
}

/**
 * `GET /api/v1/documents/{id}/content` — streams the file through the proxy.
 *
 * Nothing is buffered and no Alfresco URL is ever exposed: the browser only ever
 * sees the portal route (spec §6.1).
 *
 * @param {Object} params `{ session, nodeRef, filename, attachment }`
 * @returns {Promise<Response>} a response a route handler can return as-is
 */
export function streamDocument(params = {}) {
    const nodeRef = toDocumentNodeRef(params.nodeRef);
    const filename = params.filename || 'document';
    return streamContent(
        `api/node/content/${nodeRefToPath(nodeRef)}/${encodeURIComponent(filename)}`,
        {
            session: params.session,
            filename,
            attachment: Boolean(params.attachment),
        },
    );
}

/**
 * Resolves the folder a new document must be created in.
 *
 * Reuses the very webscript the current wizard uses between two steps
 * (`nextStepWebScript="becpg/project/path?nodeRef={nodeRef}&path=SupplierDocuments"`),
 * so the portal drops files exactly where Share does — which is what keeps both
 * portals interchangeable (spec §7.2, I3).
 *
 * @param {Object} params `{ session, entityRef, path }`
 * @returns {Promise<string>} the folder nodeRef
 */
export async function resolveDocumentFolder(params = {}) {
    const { session, entityRef } = params;
    if (!entityRef || !isNodeRef(entityRef)) {
        throw new BadRequestError('A valid entity nodeRef is required to deposit a document');
    }
    const payload = await getJson('becpg/project/path', {
        session,
        query: { nodeRef: entityRef, path: params.path || 'SupplierDocuments' },
    });
    if (!payload || !payload.nodeRef) {
        throw new NotFoundError('Supplier documents folder not found for this entity');
    }
    return payload.nodeRef;
}

/**
 * `POST /api/v1/documents` — deposit a document or a new version.
 *
 * Two modes, and the first one is the important one:
 *
 *   1. **`documentRef` given** → the file is uploaded *onto the placeholder*
 *      `DocumentFormulationHandler` already created for that requirement
 *      (`updateNodeRef`). `DocumentAspectPolicy` then flips
 *      `bcpg:documentState` to `ToValidate` and fills `cm:from` / `cm:to` from
 *      `docTypeEffectivityType` and `docTypeAutoExpirationDelay`. This function
 *      writes **no** metadata: beCPG owns that. A `MANUAL` type, where beCPG
 *      writes no date at all, is served by {@link setDocumentValidity} after the
 *      upload — never from here.
 *   2. **`entityRef` given** → a new document is created in the entity's
 *      `SupplierDocuments` folder.
 *
 * @param {Object} params
 * @param {Object} params.session
 * @param {File|Blob} params.file the uploaded file
 * @param {string} [params.filename]
 * @param {string} [params.documentRef] existing document to version
 * @param {string} [params.entityRef] entity to attach a new document to
 * @param {boolean} [params.majorVersion=true]
 * @param {string} [params.description] version comment
 * @param {Object} [params.config]
 * @returns {Promise<Object>} `{ nodeRef, fileName, mode }`
 */
export async function uploadDocument(params = {}) {
    const config = documentConfig(params.config);
    const { session, file } = params;

    if (!file || typeof file !== 'object' || typeof file.arrayBuffer !== 'function') {
        throw new BadRequestError('A file is required (multipart field "file")');
    }

    const filename = params.filename || file.name || 'document';
    const form = new FormData();
    form.append('filedata', file, filename);
    form.append('majorVersion', String(params.majorVersion !== false));
    form.append('overwrite', 'false');
    if (params.description) {
        form.append('description', String(params.description).slice(0, 500));
    }

    let mode = 'create';
    if (params.documentRef) {
        // Guarded read: this throws when the document is not in the perimeter.
        const existing = await getDocument({
            session,
            nodeRef: params.documentRef,
            config,
        });
        form.append('updateNodeRef', existing.nodeRef);

        // Keep the placeholder's mimetype in step with the bytes just filed.
        //
        // `api/upload` writes a new version with
        // `content.write(content, updateNameAndMimetype, true, newFilename)`, and
        // `updateNameAndMimetype` defaults to **false** — so a version upload keeps
        // whatever mimetype the node already had. The placeholders that
        // `DocumentFormulationHandler` materialises for a documentary requirement have
        // no content, hence `application/octet-stream`, and every document a supplier
        // files against a requirement inherited it. Measured on 26.1.0: the same PDF
        // uploaded as a *new* document was stored `application/pdf`, and filed against
        // the "Certificat sanitaire" requirement `application/octet-stream` — which
        // costs the preview, the thumbnail and the PDF parsing of the signature step.
        //
        // The flag also renames the node to the uploaded file's name, which would
        // replace beCPG's generated name ("<produit> - <type de document>.pdf") with
        // whatever the supplier called the file on their disk, and break the visible
        // link between the file and the requirement it satisfies. Sending the
        // placeholder's **current** name as `filename` makes that rename a no-op
        // (`updateNode.setName(<its own name>)`), and leaves only the mimetype update.
        if (existing.name) {
            form.append('filename', existing.name);
            form.append('updatenameandmimetype', 'true');
        }
        mode = 'version';
    }
    else {
        const folderRef = await resolveDocumentFolder({ session, entityRef: params.entityRef });
        form.append('destination', folderRef);
    }

    // `api/upload` is an Alfresco core webscript, deliberately absent from the
    // browser-facing allow-list of lib/becpg.js: it is reachable only through
    // this server-side composition, never through the generic proxy.
    const result = await uploadFile('api/upload', form, { session, skipAllowList: true });

    invalidateSupplierScope(session);

    return {
        nodeRef: (result && result.nodeRef) || null,
        fileName: (result && result.fileName) || filename,
        mode,
    };
}

/* -------------------------------------------------------------------------- */
/* Public API — validity window                                                */
/* -------------------------------------------------------------------------- */

/**
 * A day, as `cm:from` / `cm:to` are stored: `d:date`, so UTC midnight.
 *
 * `<input type="date">` hands over `YYYY-MM-DD`, which `new Date()` already
 * reads as UTC midnight; an ISO instant is accepted too — a client that holds a
 * full timestamp must not have to truncate it itself — and is truncated here so
 * two suppliers in two timezones write the same day.
 *
 * @param {string} value `YYYY-MM-DD` or an ISO 8601 instant
 * @param {string} field the field name, for the error message
 * @returns {string} ISO 8601 at UTC midnight
 * @throws {BadRequestError} on anything else
 */
function toValidityDate(value, field) {
    const text = String(value).trim();
    const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00.000Z` : text);
    if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestError(`Invalid ${field} date`);
    }
    return new Date(Date.UTC(
        parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(),
    )).toISOString();
}

/**
 * Writes the validity window a supplier entered on one of their documents.
 *
 * ## Why the portal writes these two properties and no others
 *
 * `uploadDocument` writes **no** metadata, on purpose: naming, state and the
 * computed validity belong to `DocumentAspectPolicy` (rule R2). The exception is
 * a document type whose `bcpg:docTypeEffectivityType` is `MANUAL` or unset,
 * where the policy deliberately writes nothing and the dates stay empty until
 * someone types them. There is no rule to duplicate in that case — there is a
 * field nobody fills, on a document only the supplier holds. `validityEditable`
 * says which case a row is in, and it is checked here, server-side, rather than
 * trusted from the browser.
 *
 * A `null` clears the property; an absent key leaves it untouched, so a caller
 * can set the end of validity without inventing a start date.
 *
 * @param {Object} params
 * @param {Object} params.session
 * @param {string} params.nodeRef the document, in any of the forms {@link toDocumentNodeRef} accepts
 * @param {string|null} [params.validFrom] `cm:from`
 * @param {string|null} [params.validTo] `cm:to`
 * @param {Object} [params.config]
 * @returns {Promise<Object>} the document projection, dates included
 * @throws {BadRequestError} on an unparsable date, an inverted window, or a
 *         document whose dates beCPG computes
 * @throws {NotFoundError} when the document is outside the session's perimeter
 */
export async function setDocumentValidity(params = {}) {
    const config = documentConfig(params.config);
    const { session } = params;

    const hasFrom = params.validFrom !== undefined;
    const hasTo = params.validTo !== undefined;
    if (!hasFrom && !hasTo) {
        throw new BadRequestError('Nothing to write: validFrom or validTo is required');
    }

    const from = hasFrom && params.validFrom !== null && params.validFrom !== ''
        ? toValidityDate(params.validFrom, 'validFrom')
        : null;
    const to = hasTo && params.validTo !== null && params.validTo !== ''
        ? toValidityDate(params.validTo, 'validTo')
        : null;

    // Guarded read: throws when the document is not in the perimeter, and tells
    // us who owns its dates.
    const existing = await getDocument({ session, nodeRef: params.nodeRef, config });
    if (!existing.validityEditable) {
        throw new BadRequestError('beCPG computes the validity of this document type', {
            details: { effectivityType: existing.effectivityType },
        });
    }

    const start = hasFrom ? from : existing.validFrom;
    const end = hasTo ? to : existing.validTo;
    if (start && end && new Date(start).getTime() > new Date(end).getTime()) {
        throw new BadRequestError('The end of validity precedes its start');
    }

    const values = {};
    if (hasFrom) {
        values[config.props.from] = from;
    }
    if (hasTo) {
        values[config.props.to] = to;
    }
    await saveForm(existing.nodeRef, values, { session });

    /*
     * The response is recomputed HERE and not read back.
     *
     * A read back right after the write goes through the search index, which
     * lags the transaction by a beat: the portal would return the previous
     * dates to a supplier who has just entered them. What has just been written
     * is known, and the status derives from it with the same function as the
     * read path.
     */
    const daysToExpiry = end
        ? Math.ceil((new Date(end).getTime() - Date.now()) / MS_PER_DAY)
        : null;

    return {
        ...existing,
        validFrom: start,
        validTo: end,
        daysToExpiry,
        status: deriveDocumentStatus({ state: existing.state, daysToExpiry }, config),
        validityMissing: existing.validityRequired && !start && !end,
    };
}
