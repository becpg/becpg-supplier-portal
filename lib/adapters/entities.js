/**
 * Domain adapter — **entities** (spec §4.3 "Mes produits", §5.4 `/entities`).
 *
 * Four concerns, one module:
 *
 *   1. **my products** — `becpg/remote/entity/list` (db-afts, so no indexation
 *      lag: spec §4.6.6). The list is *not* filtered by the portal on a supplier
 *      id: Alfresco ACLs already restrict an external account to its own
 *      entities, and `SupplierSecurityPlugin` is the authority (spec §6.2).
 *      A `supplierNodeRef` filter is available for the delegated-entry case
 *      (a client user working on behalf of a supplier).
 *   2. **product detail** — `becpg/remote/entity?nodeRef=…`. Datalists are
 *      excluded by default (`lists=none`): the wizard reads them list by list.
 *   3. **catalogs** — `becpg/entity/catalog/node/{store}/{id}/{uuid}`, the source
 *      of both the wizard's compliance panel and the dashboard completion gauge.
 *   4. **product specifications** (cahiers des charges) — the
 *      `bcpg:productSpecifications` association of the entity, exposed read-only
 *      with a download URL that goes through the portal proxy.
 *
 * Completion is **derived, never stored**: `bcpg:entityScore` already holds the
 * catalogs computed by `EntityCatalogFormulationHandler`, so listing products
 * costs exactly one call, catalogs included.
 *
 * Server only — every function takes an already-authenticated beCPG client
 * (see `createBecpgClient()` in `lib/adapters/session.js`).
 */

import { nodeRefToPath } from '@/lib/becpg';
import {
    escapeFtsValue,
    nodeRefFromId,
    nodeRefUuid,
    paginate,
    toIsoDate,
    toNodeRef,
} from '@/lib/adapters/tasks';

/* -------------------------------------------------------------------------- */
/* Constants                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Entity types a supplier can be asked to fill in. Mirrors the wizard ids of
 * `config/wizards.default.js` and the `product-catalog` dashlet configuration.
 * @readonly
 */
export const SUPPLIER_ENTITY_TYPES = Object.freeze([
    'bcpg:rawMaterial',
    'bcpg:finishedProduct',
    'bcpg:semiFinishedProduct',
    'bcpg:packagingMaterial',
    'bcpg:packagingKit',
    'bcpg:localSemiFinishedProduct',
    'bcpg:supplier',
    'qa:nc',
]);

/**
 * `bcpg:productState` values (see the `product-catalog` dashlet filters).
 * @readonly
 */
export const ENTITY_STATES = Object.freeze([
    'Simulation',
    'ToValidate',
    'Valid',
    'Refused',
    'Stopped',
    'Archived',
]);

/** Properties we always ask `becpg/remote/*` for. Anything else is dead weight. */
const LIST_FIELDS = [
    'cm:name',
    'cm:modified',
    'cm:created',
    'bcpg:code',
    'bcpg:erpCode',
    'bcpg:legalName',
    'bcpg:productState',
    'bcpg:entityScore',
    'bcpg:suppliers',
    'bcpg:subsidiaryRef',
    'bcpg:plants',
].join(',');

/** Extra fields the product sheet wants on top of {@link LIST_FIELDS}. */
const DETAIL_FIELDS = [
    LIST_FIELDS,
    'cm:description',
    'cm:title',
    'bcpg:productSpecifications',
    'bcpg:hierarchy1',
    'bcpg:hierarchy2',
    'bcpg:productUnit',
    'bcpg:clients',
    'bcpg:entityTplRef',
].join(',');

/** Fields of a `bcpg:productSpecification` node. */
const SPEC_FIELDS = [
    'cm:name',
    'cm:title',
    'cm:description',
    'cm:modified',
    'bcpg:code',
    'bcpg:productState',
].join(',');

/** Hard cap on a single `becpg/remote/entity/list` call. */
const MAX_PAGE_SIZE = 200;

/* -------------------------------------------------------------------------- */
/* Typedefs — the contract the UI agents depend on                             */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {Object} EntityRef
 * @property {string|null} nodeRef
 * @property {string|null} name
 * @property {string|null} code
 * @property {string|null} type
 */

/**
 * @typedef {Object} EntityCompletion
 * @property {number|null} score    0..100, mean of the applicable catalog scores
 * @property {number} catalogCount
 * @property {Array<{id: string, label: string, score: number|null, color: string|null}>} catalogs
 */

/**
 * The normalised product. **This is the shape `/api/v1/entities` returns.**
 *
 * @typedef {Object} Entity
 * @property {string} nodeRef
 * @property {string} uuid
 * @property {string} type             prefixed type — `bcpg:rawMaterial`
 * @property {string} name             `cm:name`, already localised by beCPG
 * @property {string|null} legalName    `bcpg:legalName`
 * @property {string|null} code         `bcpg:code`
 * @property {string|null} erpCode      `bcpg:erpCode`
 * @property {string|null} state        `bcpg:productState` — Simulation|ToValidate|Valid|Refused|Stopped|Archived
 * @property {EntityCompletion|null} completion derived from `bcpg:entityScore`
 * @property {string|null} modified     ISO 8601
 * @property {string|null} created      ISO 8601
 * @property {string|null} version
 * @property {EntityRef|null} supplier  `bcpg:suppliers[0]` (or itself when it *is* a supplier)
 * @property {EntityRef|null} subsidiary `bcpg:subsidiaryRef[0]` (multi-filiale, spec §2ter.2)
 * @property {{nodeRef: string|null, name: string|null, state: string|null}|null} project
 *           the referencing project — only filled when the caller passes a
 *           `projectsByEntity` index (built from `/tasks`), because
 *           `pjt:projectEntity` is a *source* association and is not queryable
 * @property {string|null} siteId
 * @property {string|null} path
 * @property {string} href              portal route — `/products/{uuid}`
 * @property {Object} [attributes]      raw beCPG attributes, detail view only
 * @property {Object} [datalists]       raw beCPG datalists, only when `lists` is asked for
 */

/**
 * @typedef {Object} CatalogMissingField
 * @property {string} field   property qname — `bcpg:legalName`
 * @property {string} label   already localised by beCPG (`displayName`)
 * @property {string|null} locale non-null when the field is missing for one locale only
 */

/**
 * One compliance catalog. **Shape of `/api/v1/entities/{id}/catalogs`.**
 *
 * @typedef {Object} Catalog
 * @property {string} id
 * @property {string} label             already localised
 * @property {string|null} color        hex colour configured on the catalog
 * @property {number|null} score        0..100
 * @property {string|null} locale       null for the default locale
 * @property {CatalogMissingField[]} missingFields
 * @property {Array<{field: string, label: string, value: *, entities: string[]}>} nonUniqueFields
 * @property {string[]} protectedFields fields requiring re-authentication (spec §6.6)
 * @property {string|null} modifiedDate ISO 8601
 * @property {boolean} isComplete       score === 100 and no missing field
 */

/**
 * One applicable product specification (cahier des charges).
 *
 * @typedef {Object} Specification
 * @property {string} nodeRef
 * @property {string} uuid
 * @property {string} name
 * @property {string|null} title
 * @property {string|null} description
 * @property {string|null} code
 * @property {string} type
 * @property {string|null} state
 * @property {string|null} modified     ISO 8601
 * @property {string} downloadUrl       portal URL streaming the content
 * @property {string} detailUrl         portal API URL of the full entity
 */

/* -------------------------------------------------------------------------- */
/* Normalisation helpers                                                       */
/* -------------------------------------------------------------------------- */

function firstOf(value) {
    if (Array.isArray(value)) {
        return value.length > 0 ? value[0] : null;
    }
    return value || null;
}

/**
 * Normalises an association node as returned by the remote visitor
 * (`{ id, type, "cm:name", "bcpg:code" }`).
 *
 * @param {Object|Array|null} value
 * @returns {EntityRef|null}
 */
export function toEntityRef(value) {
    const node = firstOf(value);
    if (!node || typeof node !== 'object') {
        return null;
    }
    const nodeRef = node.nodeRef || nodeRefFromId(node.id);
    if (!nodeRef) {
        return null;
    }
    return {
        nodeRef,
        name: node['cm:name'] || node['bcpg:charactName'] || node.name || null,
        code: node['bcpg:code'] || node['bcpg:charactCode'] || null,
        type: node.type || null,
    };
}

/**
 * Turns `bcpg:entityScore` — `{ catalogs: [ { id, label, score, color, … } ] }` —
 * into the completion block of {@link Entity}.
 *
 * The overall score is the **arithmetic mean of the catalog scores**: catalogs
 * carry no weight in beCPG, so any other aggregation would invent business
 * meaning the product does not have.
 *
 * @param {Object|string|null} entityScore raw `bcpg:entityScore`
 * @returns {EntityCompletion|null}
 */
export function toCompletion(entityScore) {
    let parsed = entityScore;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        }
        catch {
            return null;
        }
    }
    const catalogs = parsed && Array.isArray(parsed.catalogs) ? parsed.catalogs : null;
    if (!catalogs) {
        return null;
    }

    const summary = catalogs.map((catalog) => ({
        id: catalog.id || null,
        label: catalog.label || null,
        score: catalog.score === undefined || catalog.score === null ? null : Number(catalog.score),
        color: catalog.color || null,
    }));
    const scored = summary.filter((catalog) => typeof catalog.score === 'number' && !Number.isNaN(catalog.score));

    return {
        score: scored.length > 0
            ? Math.round(scored.reduce((sum, catalog) => sum + catalog.score, 0) / scored.length)
            : null,
        catalogCount: summary.length,
        catalogs: summary,
    };
}

/**
 * Normalises one `{ entity: {…} }` node of `becpg/remote/entity(/list)`.
 *
 * @param {Object} raw the `entity` object
 * @param {Object} [options]
 * @param {Object} [options.projectsByEntity] nodeRef → `{nodeRef, name, state}`
 * @param {boolean} [options.withRaw=false] keep `attributes` / `datalists`
 * @returns {Entity|null}
 */
export function normalizeEntity(raw, options = {}) {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const nodeRef = raw.nodeRef || nodeRefFromId(raw.id);
    if (!nodeRef) {
        return null;
    }

    const attributes = raw.attributes || {};
    const type = raw.type || null;
    const pick = (key) => (raw[key] !== undefined ? raw[key] : attributes[key]);

    const supplierRef = toEntityRef(pick('bcpg:suppliers'));
    const isSupplier = type === 'bcpg:supplier';
    const project = (options.projectsByEntity && options.projectsByEntity[nodeRef]) || null;

    const entity = {
        nodeRef,
        uuid: nodeRefUuid(nodeRef),
        type,
        name: pick('cm:name') || pick('bcpg:charactName') || '',
        legalName: pick('bcpg:legalName') || null,
        code: pick('bcpg:code') || null,
        erpCode: pick('bcpg:erpCode') || null,
        state: pick('bcpg:productState') || null,
        completion: toCompletion(pick('bcpg:entityScore')),
        modified: toIsoDate(pick('cm:modified')),
        created: toIsoDate(pick('cm:created')),
        version: raw.version || null,
        supplier: isSupplier
            ? { nodeRef, name: pick('cm:name') || null, code: pick('bcpg:code') || null, type }
            : supplierRef,
        subsidiary: toEntityRef(pick('bcpg:subsidiaryRef')),
        project: project
            ? { nodeRef: project.nodeRef || null, name: project.name || null, state: project.state || null }
            : null,
        siteId: (raw.site && raw.site.id) || null,
        path: raw.path || null,
        href: `/products/${nodeRefUuid(nodeRef)}`,
    };

    if (options.withRaw) {
        entity.attributes = attributes;
        if (raw.datalists) {
            entity.datalists = raw.datalists;
        }
    }
    return entity;
}

/**
 * Normalises one entry of `becpg/entity/catalog/node/…`.
 *
 * @param {Object} raw
 * @returns {Catalog}
 */
export function normalizeCatalog(raw) {
    const missingFields = Array.isArray(raw && raw.missingFields) ? raw.missingFields : [];
    const nonUniqueFields = Array.isArray(raw && raw.nonUniqueFields) ? raw.nonUniqueFields : [];
    const protectedFields = Array.isArray(raw && raw.protectedFields) ? raw.protectedFields : [];
    const score = raw && raw.score !== undefined && raw.score !== null ? Number(raw.score) : null;

    return {
        id: (raw && raw.id) || null,
        label: (raw && raw.label) || (raw && raw.id) || '',
        color: (raw && raw.color) || null,
        score,
        locale: (raw && raw.locale) || null,
        missingFields: missingFields.map((field) => ({
            field: field.id || null,
            // beCPG already returns `displayName` in the user's locale.
            label: field.displayName || field.id || '',
            locale: field.locale || null,
        })),
        nonUniqueFields: nonUniqueFields.map((field) => ({
            field: field.id || null,
            label: field.displayName || field.id || '',
            value: field.value === undefined ? null : field.value,
            entities: Array.isArray(field.entities) ? field.entities : [],
        })),
        protectedFields: protectedFields.map((field) => (typeof field === 'string' ? field : field && field.id)).filter(Boolean),
        modifiedDate: toIsoDate(raw && raw.modifiedDate),
        isComplete: score === 100 && missingFields.length === 0,
    };
}

/* -------------------------------------------------------------------------- */
/* Query building                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Builds the AFTS query of "my products".
 *
 * Kept as a plain FTS string on purpose: `becpg/remote/entity/list` runs it
 * through `inDBIfPossible()`, i.e. **db-afts**, which is real time and inherits
 * the ACLs and the tenant from beCPG (spec §4.6.6).
 *
 * `supplierNodeRef` is deliberately **not** a query clause: `bcpg:suppliers` is
 * an association, and Alfresco cannot search associations (only
 * `pjt:tlResources` has an indexed mirror in the model). It is applied as a
 * post-filter by {@link listMyEntities} instead — see the note there.
 *
 * @param {Object} [options]
 * @param {string[]} [options.types=SUPPLIER_ENTITY_TYPES]
 * @param {string[]} [options.states] `bcpg:productState` values
 * @param {string} [options.q] free text on name / code
 * @param {string[]} [options.nodeRefs] restrict to an explicit set of entities
 * @returns {string} the AFTS query
 */
export function buildEntityQuery(options = {}) {
    const { types = SUPPLIER_ENTITY_TYPES, states, q, nodeRefs } = options;
    const clauses = [];

    if (Array.isArray(nodeRefs) && nodeRefs.length > 0) {
        const ids = nodeRefs
            .map((nodeRef) => `=sys:node-uuid:"${escapeFtsValue(nodeRefUuid(nodeRef))}"`)
            .join(' OR ');
        clauses.push(`(${ids})`);
    }
    if (Array.isArray(types) && types.length > 0) {
        clauses.push(`(${types.map((type) => `TYPE:"${escapeFtsValue(type)}"`).join(' OR ')})`);
    }
    if (Array.isArray(states) && states.length > 0) {
        clauses.push(`(${states.map((state) => `=bcpg:productState:"${escapeFtsValue(state)}"`).join(' OR ')})`);
    }
    if (q) {
        const needle = escapeFtsValue(q);
        clauses.push(`(cm:name:"${needle}*" OR bcpg:code:"${needle}*"`
            + ` OR bcpg:legalName:"${needle}*" OR bcpg:erpCode:"${needle}*")`);
    }

    return clauses.join(' AND ');
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * **My products** — behind `GET /api/v1/entities`.
 *
 * Paginated by beCPG (`page` + `maxResults` on `becpg/remote/entity/list`),
 * **except** when `supplierNodeRef` is given: since the supplier link is an
 * association and cannot be searched, the filter is applied after the query, so
 * a bounded window ({@link MAX_PAGE_SIZE}) is read and paginated in memory.
 * That path is only used for delegated entry, where the volume is one supplier.
 *
 * @param {Object} client authenticated beCPG client
 * @param {Object} [options]
 * @param {number} [options.page=1]
 * @param {number} [options.pageSize=25] capped at {@link MAX_PAGE_SIZE}
 * @param {string[]} [options.types]
 * @param {string[]} [options.states]
 * @param {string} [options.q]
 * @param {string} [options.supplierNodeRef] post-filter on `bcpg:suppliers`
 * @param {string[]} [options.nodeRefs] explicit set (used by the dashboard)
 * @param {Object} [options.projectsByEntity] nodeRef → `{nodeRef, name, state}`
 * @returns {Promise<{items: Entity[], pagination: import('./tasks').Pagination}>}
 *
 * @example
 * const { items } = await listMyEntities(client, { states: ['Simulation', 'ToValidate'] });
 */
export async function listMyEntities(client, options = {}) {
    const {
        page = 1,
        pageSize = 25,
        projectsByEntity,
        supplierNodeRef,
        ...queryOptions
    } = options;

    const size = Math.max(1, Math.min(Number(pageSize) || 25, MAX_PAGE_SIZE));
    const current = Math.max(1, Number(page) || 1);
    const inMemory = Boolean(supplierNodeRef);

    const data = await client.getJson('becpg/remote/entity/list', {
        query: {
            query: buildEntityQuery(queryOptions),
            fields: LIST_FIELDS,
            lists: 'none',
            maxResults: inMemory ? MAX_PAGE_SIZE : size,
            page: inMemory ? 1 : current,
        },
    });

    const rows = Array.isArray(data && data.entities) ? data.entities : [];
    let items = rows
        .map((row) => normalizeEntity(row && row.entity, { projectsByEntity }))
        .filter(Boolean);

    if (inMemory) {
        items = items.filter((entity) => entity.supplier && entity.supplier.nodeRef === supplierNodeRef);
        return paginate(items, current, size);
    }

    const raw = (data && data.pagination) || {};
    const totalItems = Number(raw.totalItems) || items.length;

    return {
        items,
        pagination: {
            page: current,
            pageSize: size,
            count: items.length,
            totalItems,
            totalPages: Math.max(1, Math.ceil(totalItems / size)),
            hasMoreItems: Boolean(raw.hasMoreItems),
        },
    };
}

/**
 * **One product** — behind `GET /api/v1/entities/{id}`.
 *
 * @param {Object} client
 * @param {string} entityNodeRef nodeRef or uuid
 * @param {Object} [options]
 * @param {string|null} [options.lists='none'] comma-separated datalists to include.
 *        `'none'` (the default) excludes them all — the wizard fetches lists
 *        individually; `null` asks beCPG for every list.
 * @param {Object} [options.projectsByEntity]
 * @returns {Promise<Entity|null>}
 */
export async function getEntity(client, entityNodeRef, options = {}) {
    const nodeRef = toNodeRef(entityNodeRef);
    const lists = options.lists === undefined ? 'none' : options.lists;
    const data = await client.getJson('becpg/remote/entity', {
        query: {
            nodeRef,
            fields: DETAIL_FIELDS,
            ...(lists ? { lists } : {}),
        },
    });
    const entity = normalizeEntity(data && data.entity, {
        projectsByEntity: options.projectsByEntity,
        withRaw: true,
    });
    if (entity && !entity.nodeRef) {
        entity.nodeRef = nodeRef;
    }
    return entity;
}

/**
 * **Compliance catalogs** — behind `GET /api/v1/entities/{id}/catalogs`.
 *
 * Calls `becpg/entity/catalog/node/{store_type}/{store_id}/{id}`. Without a
 * `catalogId` beCPG returns the *stored* `bcpg:entityScore` (re-formulating the
 * entity first when it is stale, hence `formulated`); with one, it formulates
 * that catalog on the spot.
 *
 * @param {Object} client
 * @param {string} entityNodeRef nodeRef or uuid
 * @param {Object} [options]
 * @param {string} [options.catalogId] formulate a single catalog
 * @returns {Promise<{nodeRef: string, formulated: boolean, score: number|null,
 *                    catalogs: Catalog[]}>}
 *
 * @example
 * const { score, catalogs } = await getEntityCatalogs(client, nodeRef);
 * catalogs[0].missingFields; // [ { field: 'bcpg:legalName', label: 'Nom légal', locale: null } ]
 */
export async function getEntityCatalogs(client, entityNodeRef, options = {}) {
    const nodeRef = toNodeRef(entityNodeRef);
    const data = await client.getJson(`becpg/entity/catalog/node/${nodeRefToPath(nodeRef)}`, {
        query: options.catalogId ? { catalogId: options.catalogId } : {},
    });

    const rawCatalogs = Array.isArray(data && data.catalogs) ? data.catalogs : [];
    const catalogs = rawCatalogs.map(normalizeCatalog);
    const scored = catalogs.filter((catalog) => typeof catalog.score === 'number');

    return {
        nodeRef,
        formulated: Boolean(data && data.formulated),
        score: scored.length > 0
            ? Math.round(scored.reduce((sum, catalog) => sum + catalog.score, 0) / scored.length)
            : null,
        catalogs,
    };
}

/**
 * **Applicable product specifications** (cahiers des charges) — behind
 * `GET /api/v1/entities/{id}/specs`.
 *
 * Reads the `bcpg:productSpecifications` association of the entity, then loads
 * the specification entities themselves for their metadata. Read-only by
 * construction: the portal exposes no write path on a specification (spec §4.5,
 * F9 "les cahiers des charges ne sont pas exposés en lecture").
 *
 * `downloadUrl` points at the portal proxy, never at Alfresco: the ticket stays
 * server-side (spec §6.1).
 *
 * @param {Object} client
 * @param {string} entityNodeRef nodeRef or uuid
 * @returns {Promise<{nodeRef: string, specifications: Specification[]}>}
 */
export async function getEntitySpecifications(client, entityNodeRef) {
    const nodeRef = toNodeRef(entityNodeRef);

    const data = await client.getJson('becpg/remote/entity', {
        query: { nodeRef, fields: 'bcpg:productSpecifications', lists: 'none' },
    });

    const attributes = (data && data.entity && data.entity.attributes) || {};
    const refs = attributes['bcpg:productSpecifications'];
    const list = Array.isArray(refs) ? refs : (refs ? [refs] : []);
    const nodeRefs = list
        .map((node) => (node && (node.nodeRef || nodeRefFromId(node.id))) || null)
        .filter(Boolean);

    if (nodeRefs.length === 0) {
        return { nodeRef, specifications: [] };
    }

    const specifications = await Promise.all(nodeRefs.map(async (specNodeRef) => {
        let raw = null;
        try {
            const spec = await client.getJson('becpg/remote/entity', {
                query: { nodeRef: specNodeRef, fields: SPEC_FIELDS, lists: 'none' },
            });
            raw = spec && spec.entity ? spec.entity : null;
        }
        catch {
            raw = null;
        }

        const specAttributes = (raw && raw.attributes) || {};
        const name = (raw && raw['cm:name']) || specAttributes['cm:name'] || '';
        const uuid = nodeRefUuid(specNodeRef);

        return {
            nodeRef: specNodeRef,
            uuid,
            name,
            title: specAttributes['cm:title'] || null,
            description: specAttributes['cm:description'] || null,
            code: (raw && raw['bcpg:code']) || specAttributes['bcpg:code'] || null,
            type: (raw && raw.type) || 'bcpg:productSpecification',
            state: specAttributes['bcpg:productState'] || null,
            modified: toIsoDate(specAttributes['cm:modified']),
            // Streams through the portal proxy — the Alfresco ticket never leaves
            // the server (`api/node/` is on the proxy allow-list).
            downloadUrl: `/api/v1/becpg/api/node/content/${nodeRefToPath(specNodeRef)}/${encodeURIComponent(name || uuid)}`,
            detailUrl: `/api/v1/entities/${uuid}`,
        };
    }));

    return { nodeRef, specifications };
}

/**
 * Index of the entities referenced by a list of tasks, so `/tasks` can show
 * "MP001 — Farine T55" instead of a bare nodeRef.
 *
 * **One** db-afts query for the whole page (`=sys:node-uuid:` disjunction), not
 * one call per task. Entities the user cannot read are simply absent from the
 * index — beCPG's ACLs filter the query, and the portal does not second-guess
 * them (spec §6.2).
 *
 * @param {Object} client
 * @param {string[]} entityNodeRefs
 * @returns {Promise<Object.<string, {nodeRef: string, name: string, code: string|null, type: string|null}>>}
 */
export async function buildEntityIndex(client, entityNodeRefs) {
    const unique = [...new Set((entityNodeRefs || []).filter(Boolean))];
    if (unique.length === 0) {
        return {};
    }

    const index = {};
    for (let offset = 0; offset < unique.length; offset += 50) {
        const chunk = unique.slice(offset, offset + 50);
        let rows = [];
        try {
            const data = await client.getJson('becpg/remote/entity/list', {
                query: {
                    query: buildEntityQuery({ nodeRefs: chunk, types: [] }),
                    fields: 'cm:name,bcpg:code,bcpg:legalName',
                    lists: 'none',
                    maxResults: chunk.length,
                },
            });
            rows = Array.isArray(data && data.entities) ? data.entities : [];
        }
        catch {
            rows = [];
        }

        for (const row of rows) {
            const raw = row && row.entity;
            const nodeRef = raw && (raw.nodeRef || nodeRefFromId(raw.id));
            if (!nodeRef) {
                continue;
            }
            const attributes = raw.attributes || {};
            index[nodeRef] = {
                nodeRef,
                name: raw['cm:name'] || attributes['cm:name'] || '',
                code: raw['bcpg:code'] || attributes['bcpg:code'] || null,
                type: raw.type || null,
            };
        }
    }
    return index;
}
