/**
 * Domain adapter — **entities** (spec §4.3 "Mes produits", §5.4 `/entities`).
 *
 * Four concerns, one module:
 *
 *   1. **my products** — `becpg/remote/entity/list` (db-afts, so no indexation
 *      lag: spec §4.6.6). The list is *not* filtered by the portal on a supplier
 *      id: Alfresco ACLs already restrict an external account to its own
 *      entities, and `SupplierSecurityPlugin` is the authority (spec §6.2).
 *      A `supplierNodeRef` scope is available for the delegated-entry case
 *      (a client user working on behalf of a supplier); it is a **query clause**
 *      (`ANCESTOR:`), never a post-filter — see {@link listMyEntities}.
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

import { getEntityJson, nodeRefToPath } from '@/lib/becpg';
import { NotFoundError } from '@/lib/errors';
import { withBasePath } from '@/lib/basePath';
import { logWarn } from '@/lib/http';
import { readMlText } from '@/lib/mltext';
import { resolveScope, supplierAccessGroup } from '@/lib/adapters/documents';
import { SUPPLIER_PORTAL_CATALOG_PREFIX } from '@/lib/catalogs';
import {
    escapeFtsValue,
    nodeRefFromId,
    nodeRefUuid,
    readListTotal,
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
    /*
     * The two supplier scalars, asked for by the customer side (#35846): the
     * reference the supplier knows its own product by, and the date its
     * referencing was certified — the field a customer sorts on to know which
     * raw materials are due for renewal.
     *
     * Both are PROPERTIES (`bcpg:suppliersAspect`, `bcpg:certificateDateAspect`),
     * so they ride on the projection already made and cost one pass, unlike
     * `bcpg:supplierPlants` / `bcpg:suppliers`, which are associations — see the
     * measurement below.
     */
    'bcpg:supplierRefCode',
    'bcpg:certificateDate',
    /*
     * `bcpg:suppliers`, `bcpg:subsidiaryRef` and `bcpg:plants` were removed from
     * here — they are associations, and an association costs one resolution per
     * node where a scalar property comes out in a single pass.
     *
     * Measured on dev on 12/08, same query, same 200 nodes:
     *
     * ```
     *   fields=cm:name,bcpg:code                      0,55 – 0,81 s
     *   fields=bcpg:productSpecifications (1 assoc)   5,84 – 5,89 s
     * ```
     *
     * None of the three is displayed by *Mes produits*: the table shows the name,
     * the code, the type, the state, the completion, the project and the date.
     * They only serve the detail sheet, which asks for them through DETAIL_FIELDS.
     *
     * `bcpg:branchFromEntity` stays, association though it is: it is the one that
     * carries the « MAJ » badge, and 48 of the 58 products of this account are
     * branches — without it two rows that look like two products are one product
     * in two states.
     */
    // The referencing branch. Both come back in the *same* listing call — a target
    // association is returned when `fields` names it — so knowing that a product is
    // a work-in-progress update costs nothing extra.
    'bcpg:branchFromEntity',
    'bcpg:branchFromVersionLabel',
    /*
     * The number of messages in the thread attached to the node.
     *
     * The *Discussions* screen listed its topics without it: twenty-six products
     * presented identically, whether they carry zero or five messages, on the
     * very screen whose question that is. A scalar property, hence of the same
     * order of cost as `bcpg:code` — nowhere near the three associations removed
     * above.
     */
    'fm:commentCount',
].join(',');

/**
 * The projection the **dashboard** uses: what it displays and computes, and
 * nothing else.
 *
 * `fields=` is not free — it switches beCPG's visitor to per-node extraction, and
 * the cost grows with the list. Measured on the reference instance over 200 products:
 *
 * ```
 *   LIST_FIELDS (13)      952-1074 ms
 *   this projection (5)   159-167 ms
 * ```
 *
 * Six times cheaper for the same screen. What it keeps is exactly what the
 * dashboard reads: the name and the code to render four rows, `cm:modified` to
 * pick which four, `bcpg:productState` for the breakdown by state and
 * `bcpg:entityScore` for the completion gauge.
 *
 * What it drops belongs to the products page: the legal name, the ERP code, the
 * suppliers, the subsidiary, the plants and the branch metadata — eight
 * attributes fetched for every product of the park so that four rows could show
 * a name and a date.
 */
const PREVIEW_FIELDS = [
    'cm:name',
    'bcpg:code',
    'cm:modified',
    'bcpg:productState',
    'bcpg:entityScore',
].join(',');

/**
 * Extra fields the product sheet wants on top of {@link LIST_FIELDS}.
 *
 * **`bcpg:hierarchy1` does not exist.** The sheet asked for it for months and
 * `becpg/remote/entity` answered nothing, silently — `fields=` drops a name the
 * dictionary does not know instead of failing. *Famille* and *Sous-famille* were
 * therefore absent from every product sheet, and the `d:noderef` label
 * resolution downstream had nothing to resolve. Measured against the dictionary
 * on the reference instance (`api/classes/bcpg_productAspect`), the properties are
 * `bcpg:productHierarchy1` / `…2`, one per entity family:
 * `bcpg:supplierHierarchy*` on a `bcpg:supplier`, `bcpg:clientHierarchy*` on a
 * `bcpg:client`. All three are listed — `/products/{id}` serves a supplier node
 * too, and naming a property the node does not carry costs nothing.
 */
const DETAIL_FIELDS = [
    LIST_FIELDS,
    // The associations removed from LIST_FIELDS: the sheet displays them
    // (Fournisseur, Filiale), and a sheet is one node, not two hundred.
    'bcpg:suppliers',
    'bcpg:subsidiaryRef',
    'bcpg:plants',
    'cm:description',
    'cm:title',
    'bcpg:productSpecifications',
    'bcpg:productHierarchy1',
    'bcpg:productHierarchy2',
    'bcpg:supplierHierarchy1',
    'bcpg:supplierHierarchy2',
    'bcpg:clientHierarchy1',
    'bcpg:clientHierarchy2',
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
 * @property {string|null} name   `null` when the session may not read the target
 * @property {string|null} code
 * @property {string|null} type
 * @property {boolean} accessDenied the repository refused the target's properties
 *        and returned only its id — see {@link ACCESS_DENIED_NAME}
 */

/**
 * What `becpg/remote/entity/list` really tells us about a result set.
 *
 * **`totalItems` coming back from beCPG is not a total** — it is `count + 1` whenever
 * the db-afts path reports `hasMoreItems`, and SOLR's real `numFound` on the index
 * path. The measurements and the reasoning live once, on `readListTotal()` in
 * `lib/adapters/tasks.js`, which is what this adapter calls.
 *
 * The only two fields authoritative on both paths are `count` and `hasMoreItems`. This
 * adapter therefore publishes an **exact total or none at all**: `totalItems` is a
 * number when the window reached the end of the result set (or when the engine
 * reported a total that cannot be the sentinel), and `null` otherwise — with
 * `totalAtLeast` always carrying a proven floor, so a screen can say "at least 100"
 * instead of inventing a number. A reader that needs "how many" must handle `null`:
 * it is the honest answer, and a `0` there would read as "you have no products".
 *
 * @typedef {Object} EntityPagination
 * @property {number} page            1-based page number
 * @property {number} pageSize
 * @property {number} count           rows in this page
 * @property {boolean} hasMoreItems   rows exist beyond this page — always authoritative
 * @property {number|null} totalItems exact total, or `null` when it cannot be known
 * @property {number} totalAtLeast    rows proven to exist — always a number
 * @property {boolean} totalExact     whether `totalItems` is a fact
 * @property {number|null} totalPages derived from `totalItems`, so `null` with it
 * @property {boolean} truncated      the requested page lies past the window beCPG serves
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
 * @property {Array<{field: string, label: string, value: *,
 *                   entities: Array<{nodeRef: string, name: string|null}>}>} nonUniqueFields
 *        `entities` names the products already carrying the value. `name` is
 *        `null` when the caller may not read that product — the UI counts those
 *        rather than printing the nodeRef (see `nameDuplicateEntities`).
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
 * beCPG's marker for an association target the session may not read.
 *
 * `JsonEntityVisitor.createTargetAssociationNode()` catches the `AccessDeniedException`
 * raised while visiting the target and emits the reference with the **id kept and the
 * name replaced**:
 *
 * ```json
 * "bcpg:suppliers": [ { "id": "8f3c…", "cm:name": "#AccessDenied" } ]
 * ```
 *
 * So it is a *name*, not a value: a naive read prints `#AccessDenied` on the product
 * sheet where the supplier's name belongs. {@link toEntityRef} turns it into
 * `name: null` + `accessDenied: true`, which the UI already knows how to render
 * (an absent name) and a caller can still branch on.
 */
export const ACCESS_DENIED_NAME = '#AccessDenied';

/**
 * Normalises an association node as returned by the remote visitor
 * (`{ id, type, "cm:name", "bcpg:code" }`).
 *
 * A target the session cannot read still carries its **id** — see
 * {@link ACCESS_DENIED_NAME} — so the reference is returned, without the fields the
 * repository refused. A `value` that is the bare marker string carries no id at all
 * and is indistinguishable from an absent association: `null`, as before.
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
    const name = node['cm:name'] || node['bcpg:charactName'] || node.name || null;
    const accessDenied = name === ACCESS_DENIED_NAME;
    return {
        nodeRef,
        name: accessDenied ? null : name,
        code: accessDenied ? null : (node['bcpg:code'] || node['bcpg:charactCode'] || null),
        type: accessDenied ? null : (node.type || null),
        accessDenied,
    };
}

/**
 * The referencing branch of a product, or `null` when it is not one.
 *
 * **Referencing a product creates a branch.** beCPG marks it with
 * `bcpg:entityBranchAspect`: `bcpg:branchFromEntity` points at the validated
 * version it was cut from, `bcpg:branchFromVersionLabel` says which. Measured on
 * the reference instance with the test supplier account: **48 of the 58 products
 * the account sees are branches**, every one named `… - UPDATE - <year>`. So the supplier's catalogue
 * is mostly work-in-progress copies, and nothing on screen said so — two entries
 * that look like two products are one product in two states.
 *
 * **The validated version is not readable by the supplier.** The association comes
 * back as `#AccessDenied`, and reading the target directly answers **401** (three
 * origins tested on dev, all 401). So `origin.accessDenied` is the normal case,
 * and the UI must show the *relationship* — "this is an update of version 1.0" —
 * without offering a link that would 401. Same rule as the cahiers des charges: a
 * link the account cannot follow is worse than no link.
 *
 * @param {*} branchFrom raw `bcpg:branchFromEntity`
 * @param {*} versionLabel raw `bcpg:branchFromVersionLabel`
 * @returns {{origin: EntityRef|null, versionLabel: string|null, originReadable: boolean}|null}
 */
function toBranch(branchFrom, versionLabel) {
    const origin = toEntityRef(branchFrom);
    if (!origin) {
        return null;
    }
    return {
        origin,
        versionLabel: versionLabel ? String(versionLabel) : null,
        // Drives whether the UI links to the validated version at all.
        originReadable: !origin.accessDenied,
    };
}

// The prefix and the filter live in `lib/catalogs.js` — client AND server both
// need them, and two definitions would drift apart.

/**
 * The `catalogs[]` of a raw `bcpg:entityScore`, parsed and nothing else.
 *
 * The property is stored as a JSON string by `EntityCatalogFormulationHandler`,
 * which fills it with the very payload `becpg/entity/catalog/node/…` serves — so a
 * caller that already holds the entity does not need that call. Rows are returned
 * untouched, per catalogue **and per locale**: {@link toCompletion} collapses the
 * locale dimension for its summary, and `lib/adapters/contentLocales.js` is only
 * interested in that dimension.
 *
 * @param {Object|string|null} entityScore raw `bcpg:entityScore`
 * @returns {Object[]|null} `null` when the property is absent or unreadable —
 *          distinct from an entity that carries an empty `catalogs[]`
 */
export function catalogRows(entityScore) {
    let parsed = entityScore;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        }
        catch {
            return null;
        }
    }
    return parsed && Array.isArray(parsed.catalogs) ? parsed.catalogs : null;
}

/**
 * Turns `bcpg:entityScore` — `{ catalogs: [ { id, label, score, color, … } ] }` —
 * into the completion block of {@link Entity}.
 *
 * The overall score is the **arithmetic mean of the catalog scores**: catalogs
 * carry no weight in beCPG, so any other aggregation would invent business
 * meaning the product does not have.
 *
 * Scoped to the supplier-portal catalogues when the entity carries any — see
 * {@link SUPPLIER_PORTAL_CATALOG_PREFIX}. The chip list keeps **every**
 * catalogue: the supplier may read what its customer also checks, it is only
 * the headline number that stops averaging the two.
 *
 * @param {Object|string|null} entityScore raw `bcpg:entityScore`
 * @returns {EntityCompletion|null}
 */
export function toCompletion(entityScore) {
    const catalogs = catalogRows(entityScore);
    if (!catalogs) {
        return null;
    }

    // One row per catalogue, not per catalogue × locale: this block is a
    // summary — a count and a chip list — so the per-locale detail is noise
    // here, and keeping it would both duplicate the chips and inflate
    // `catalogCount` ("2 catalogue(s)" for one catalogue in two languages).
    // Collapsing on the id alone is what makes the count mean what the UI says
    // it means. The per-locale rows survive where they carry information, in
    // `getEntityCatalogs()`. Genuine same-locale duplicates collapse here too.
    const summary = dedupeCatalogs(
        catalogs.map((catalog) => ({
            id: catalog.id || null,
            label: catalog.label || null,
            score: catalog.score === undefined || catalog.score === null ? null : Number(catalog.score),
            color: catalog.color || null,
        })),
        (catalog) => catalog.id || catalog.label || '',
    );
    const scored = summary.filter((catalog) => typeof catalog.score === 'number' && !Number.isNaN(catalog.score));

    // The portal catalogues when there are any, all of them otherwise — see the
    // comment on the prefix for the two reasons (what the supplier can actually
    // raise, and the fallback for instances that have none).
    const own = scored.filter(
        (catalog) => String(catalog.id || '').startsWith(SUPPLIER_PORTAL_CATALOG_PREFIX),
    );
    const counted = own.length > 0 ? own : scored;

    return {
        score: counted.length > 0
            ? Math.round(counted.reduce((sum, catalog) => sum + catalog.score, 0) / counted.length)
            : null,
        // What the score aggregates, stated explicitly: a screen showing 40 %
        // over seven catalogues when the figure only summarises two must be able
        // to name that rather than leave it to be guessed.
        scoreScope: own.length > 0 ? 'supplierPortal' : 'all',
        scoredCount: counted.length,
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
        // A locale map stored as plain text becomes readable again here —
        // aftermath documented in `lib/mltext.js`. With no language available at
        // this level, the fallback takes the first locale filled in: this path
        // only triggers on a value that is already abnormal.
        legalName: readMlText(pick('bcpg:legalName')) || null,
        code: pick('bcpg:code') || null,
        erpCode: pick('bcpg:erpCode') || null,
        // The supplier's own reference for this product, and the date its
        // referencing was certified (`bcpg:certificateDateAspect`): both null
        // when the aspect is not on the node, which is an answer.
        supplierRefCode: pick('bcpg:supplierRefCode') || null,
        certificateDate: toIsoDate(pick('bcpg:certificateDate')),
        state: pick('bcpg:productState') || null,
        completion: toCompletion(pick('bcpg:entityScore')),
        modified: toIsoDate(pick('cm:modified')),
        created: toIsoDate(pick('cm:created')),
        // The discussion thread attached to the node: 0 when there is none, which
        // is an answer and not an absence of answer.
        commentCount: Number(pick('fm:commentCount')) || 0,
        version: raw.version || null,
        supplier: isSupplier
            ? { nodeRef, name: pick('cm:name') || null, code: pick('bcpg:code') || null, type }
            : supplierRef,
        subsidiary: toEntityRef(pick('bcpg:subsidiaryRef')),
        branch: toBranch(pick('bcpg:branchFromEntity'), pick('bcpg:branchFromVersionLabel')),
        project: project
            ? { nodeRef: project.nodeRef || null, name: project.name || null, state: project.state || null }
            : null,
        siteId: (raw.site && raw.site.id) || null,
        path: raw.path || null,
        href: `/products/${nodeRefUuid(nodeRef)}`,
    };

    // `getEntityJson` sets this when the full read came back empty and only the
    // narrowed retry answered — i.e. this entity carries a reference the account
    // may not follow, and the properties that are missing here are missing
    // because of a refusal, not because they are unset. Carried to the screen so
    // the gap can be *said*; a produced-but-unread flag is the same silence it
    // was meant to break. Set only when true, so every other payload is
    // byte-identical to before.
    if (raw.partial === true) {
        entity.partial = true;
    }

    if (options.withRaw) {
        entity.attributes = attributes;
        if (raw.datalists) {
            entity.datalists = raw.datalists;
        }
    }
    return entity;
}

/**
 * The identity of a catalogue **row**, i.e. what makes two entries of
 * `catalogs[]` the same thing rather than two different things.
 *
 * `id` alone is not it. `EntityCatalogServiceImpl.formulateCatalog()` emits one
 * entry **per report locale** (`rep:reportLocales`), all carrying the same
 * catalogue id and differing only by `locale` — and by their `missingFields`,
 * since a legal name can be filled in French and missing in English. Those are
 * two real rows and both must be shown.
 *
 * What is *not* real is the same `(id, locale)` twice. beCPG builds its
 * catalogue definitions by concatenating **every file** found under
 * `/app:company_home/cm:System/cm:PropertyCatalogs`
 * (`EntityCatalogServiceImpl.getCatalogsDef()`), with no de-duplication on id:
 * a second file redeclaring an id does not override the first, it adds a
 * duplicate, and `formulateCatalog()` then formulates both. Observed on the
 * local instance, which carries a stray second definition file next to
 * `catalogs.json`: `becpg/entity/catalog/node/…` returns `incoFinishedProduct`
 * twice, same locale, same score. That one is a genuine duplicate.
 *
 * @param {{id: ?string, label: ?string, locale: ?string}} catalog
 * @returns {string}
 */
export function catalogKey(catalog) {
    const id = (catalog && (catalog.id || catalog.label)) || '';
    const locale = (catalog && catalog.locale) || '';
    return `${id}::${locale}`;
}

/**
 * Collapses the duplicates {@link catalogKey} describes, keeping the **worst**
 * entry of each group.
 *
 * Worst, not first: two entries that are truly identical make the choice moot,
 * but if a redeclared catalogue ever disagrees with its twin, hiding the
 * stricter of the two would tell the supplier the file is more complete than
 * beCPG thinks it is. The pessimistic reading is the safe one.
 *
 * @template {{id: ?string, label: ?string, locale: ?string, score: ?number}} T
 * @param {T[]} catalogs
 * @param {(catalog: T) => string} [keyOf] defaults to {@link catalogKey}
 * @returns {T[]} in first-seen order
 */
export function dedupeCatalogs(catalogs, keyOf = catalogKey) {
    const byKey = new Map();
    for (const catalog of catalogs) {
        const key = keyOf(catalog);
        const current = byKey.get(key);
        if (!current) {
            byKey.set(key, catalog);
            continue;
        }
        const currentScore = typeof current.score === 'number' ? current.score : Infinity;
        const score = typeof catalog.score === 'number' ? catalog.score : Infinity;
        if (score < currentScore) {
            byKey.set(key, catalog);
        }
    }
    return [...byKey.values()];
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
            // The list a check belongs to, when the catalogue definition says so
            // (`fieldTargets`). Absent on every instance that does not declare
            // it, and the check is then simply not attributed to a tab.
            target: field.target || null,
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
 * True when a node really carries a content stream.
 *
 * `cm:content` comes back from `becpg/remote/entity` as a descriptor holding at
 * least a size; an entity without content has no such property. Used to decide
 * whether a download link means anything.
 *
 * @param {Object} attributes the node attributes
 * @returns {boolean}
 */
function hasContent(attributes) {
    const content = attributes && attributes['cm:content'];
    if (!content) {
        return false;
    }
    if (typeof content === 'string') {
        // Alfresco's content URL form: `contentUrl=store://…|mimetype=…|size=1234|…`
        return /(^|\|)size=([1-9]\d*)/.test(content);
    }
    return Number(content.size) > 0;
}

/**
 * True when a row is repository debris rather than an entity: a node whose
 * `cm:name` is its own node id.
 *
 * **What the supplier was seeing.** A node that loses its parent is re-filed by
 * Alfresco under `/sys:lost_found` and renamed. It keeps its type and its ACL, so
 * `TYPE:"bcpg:rawMaterial"` matches it like any other row, and these reached the
 * product list — the reported case was `/sys:lost_found/nonRootNodeWithoutParents-…`.
 * Measured on the reference instance with the test supplier account: **198 of the 256 rows** the
 * listing returns are such nodes — 77 % of what the screen showed — all
 * `bcpg:rawMaterial` / `bcpg:finishedProduct`, all with no `version`, most with no
 * `bcpg:code`. The same debris is what makes 42 of the 101 `/messages` subjects
 * render as a bare UUID.
 *
 * **Why this test and not a query clause.** Adding `-PATH:"/sys:lost_found//*"`
 * looks like the obvious fix and is a trap: `PATH` is not supported by db-afts, so
 * the clause silently moves the whole query onto the SOLR index. Measured, same
 * account: the filtered query returned an *exact* 78 instead of the db-afts
 * sentinel, **dropped 127 nodes SOLR had not indexed**, and added 19 others — a
 * different result set with different freshness, which is not what a filter is
 * supposed to do.
 *
 * **Why the name.** `cm:name === id` held for **198 of 198** debris rows, and for
 * none of the 58 real entities, which all carry a real name. It costs nothing:
 * both fields are already in the row. Reading the true path instead would need
 * `appendParent=true` (+47 ms per call, measured) and disagreed on exactly one of
 * the 198 — a nameless node that is debris too.
 *
 * @param {Object} raw a `becpg/remote/entity/list` row
 * @returns {boolean}
 */
function isOrphanRow(raw) {
    const id = raw && raw.id;
    const name = raw && raw['cm:name'];
    if (!id || typeof name !== 'string') {
        return false;
    }
    return name.toLowerCase() === String(id).toLowerCase();
}

/**
 * Builds the AFTS query of "my products".
 *
 * Kept as a plain FTS string on purpose: `becpg/remote/entity/list` runs it
 * through `inDBIfPossible()`, i.e. **db-afts**, which is real time and inherits
 * the ACLs and the tenant from beCPG (spec §4.6.6).
 *
 * `bcpg:suppliers` is deliberately **not** a clause: it is an association, and Alfresco
 * cannot search associations (only `pjt:tlResources` has an indexed mirror in the
 * model). The queryable signal for "belongs to this supplier" is where the entity is
 * filed — the supplier's own space — hence `ancestor`.
 *
 * @param {Object} [options]
 * @param {string[]} [options.types=SUPPLIER_ENTITY_TYPES]
 * @param {string[]} [options.states] `bcpg:productState` values
 * @param {string} [options.q] free text on name / code
 * @param {string[]} [options.nodeRefs] restrict to an explicit set of entities
 * @param {string} [options.ancestor] nodeRef the entity must live under
 * @param {string[]} [options.ancestors] any of these nodeRefs — the session's own
 *        suppliers, when the listing is scoped to what the account may work on
 * @param {string[]} [options.accessGroups] `bcpg:externalAccessGroup` values that
 *        also place an entity in scope; only applied alongside an ancestor
 * @returns {string} the AFTS query
 */
export function buildEntityQuery(options = {}) {
    const { types = SUPPLIER_ENTITY_TYPES, states, q, nodeRefs, ancestor, ancestors, accessGroups } = options;
    const clauses = [];

    const under = [ancestor, ...(Array.isArray(ancestors) ? ancestors : [])].filter(Boolean);
    if (under.length > 0) {
        const groups = (Array.isArray(accessGroups) ? accessGroups : []).filter(Boolean);
        const scope = [
            ...under.map((ref) => `ANCESTOR:"${escapeFtsValue(ref)}"`),
            ...groups.map((group) => `=bcpg:externalAccessGroup:"${escapeFtsValue(group)}"`),
        ];
        clauses.push(`(${scope.join(' OR ')})`);
    }
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
 * The supplier a delegated-entry listing is scoped on.
 *
 * Reads the node itself — one ACL-checked `becpg/remote/entity` call, no search, no
 * window. A caller that cannot read it gets a **404**, never an empty list: "you are
 * not allowed to see this supplier" and "this supplier has no product" are two
 * different answers, and only one of them is a normal state.
 *
 * @param {Object} client
 * @param {string} value nodeRef or uuid
 * @returns {Promise<{nodeRef: string, name: string|null, code: string|null}>}
 * @throws {NotFoundError} when the node is unreadable or is not a `bcpg:supplier`
 */
async function resolveDelegatedSupplier(client, value) {
    const nodeRef = toNodeRef(value);

    let raw = null;
    try {
        const data = await client.getJson('becpg/remote/entity', {
            query: { nodeRef, fields: 'cm:name,bcpg:code,bcpg:legalName', lists: 'none' },
        });
        raw = (data && data.entity) || null;
    }
    catch {
        // 403 / 404 / anything else: from here it is the same statement — this
        // session cannot work on that supplier.
        raw = null;
    }

    if (!raw || raw.type !== 'bcpg:supplier') {
        throw new NotFoundError('Unknown supplier for this session', {
            details: { supplier: nodeRefUuid(nodeRef) },
        });
    }

    const attributes = raw.attributes || {};
    return {
        nodeRef,
        name: raw['cm:name'] || attributes['cm:name'] || attributes['bcpg:legalName'] || null,
        code: raw['bcpg:code'] || attributes['bcpg:code'] || null,
    };
}

/**
 * No supplier is attached to this account: it has no park at all, which is not
 * the same statement as "no scope to add".
 */
export const NO_SUPPLIER = Symbol('no supplier attached to this session');

/**
 * The scope "Mes produits" is restricted to, for the session itself.
 *
 * **The listing used to have no scope at all.** It sent the type and state clauses
 * and let Alfresco's ACL filtering do the rest, on the assumption that a supplier
 * account can only read its own park. That assumption is false the moment the
 * account holds read on a site: measured on the reference instance (#35846), a supplier
 * saw *Carton pour quiche - FB* — a packaging with an **empty** `bcpg:suppliers`,
 * filed in the shared *Produits en développement* site — alongside 67 others, and
 * the same hole fed the park counter and the comment scan.
 *
 * The scope is the one the documents already use: the supplier spaces the session
 * can read, as an `ANCESTOR` disjunction, because that is where beCPG files a
 * supplier's entities (`SupplierPortalServiceImpl.getOrCreateSupplierDestFolder`).
 * `resolveScope` is shared with `lib/adapters/documents.js` deliberately — two
 * perimeters written twice end up disagreeing, and the one that is wider wins by
 * accident.
 *
 * Above `maxScopeAncestors` suppliers — an internal account reading the whole park —
 * it returns nothing to add, and the listing stays what it was: everything the
 * caller may read. That is the monitoring case, and it is not this ticket's.
 *
 * Containment alone loses a product once it is referenced: the referencing
 * project works on a branch filed under the supplier, and closing it merges the
 * branch into the original — which lives in its own site — then deletes the
 * branch. `validateProjectEntity` grants the supplier group read on the original
 * from its `bcpg:externalAccessGroup`, an indexed property the merge carries over,
 * so that property is the second half of the scope.
 *
 * An account attached to **no** supplier at all has no park, and the honest answer
 * there is an empty list rather than everything it happens to be able to read —
 * that distinction is what `NO_SUPPLIER` carries.
 *
 * @param {Object} client
 * @returns {Promise<{ancestors: string[], accessGroups: string[]}|Symbol>} both
 *          empty when there is no scope to add (the monitoring park),
 *          {@link NO_SUPPLIER} when there is no park
 */
export async function sessionSupplierScope(client) {
    if (!client || !client.session) {
        return { ancestors: [], accessGroups: [] };
    }
    try {
        const { suppliers, ancestors } = await resolveScope(client.session, undefined);
        if (suppliers.length === 0) {
            return NO_SUPPLIER;
        }
        const accessGroups = ancestors.length > 0
            ? suppliers.map((supplier) => supplierAccessGroup(supplier.code)).filter(Boolean)
            : [];
        return { ancestors, accessGroups };
    }
    catch (error) {
        // A scope that cannot be read is not a reason to widen the listing:
        // better a failure, said out loud, than someone else's products.
        logWarn('entities.scope.failed', { message: error.message });
        throw error;
    }
}

/**
 * **My products** — behind `GET /api/v1/entities`.
 *
 * ### Pagination
 *
 * The window is read **from the first row** and the requested page is sliced out of it,
 * instead of handing `page` to beCPG. `page` is 1-based upstream
 * (`BeCPGQueryBuilder.search()`: `skipCount = (page - 1) * maxResults`) but it is only
 * honoured on the index path: on the db-afts path a `skipCount` yields nothing.
 * Measured on the local instance, one supplier holding 84 entities, `maxResults=25`:
 *
 * ```
 * page=0 -> 25 rows        page=1 -> 0 rows        page=2 -> 0 rows        page=3 -> 0 rows
 * ```
 *
 * The portal used to send `page = current - 1`, so page 2 of "Mes produits" came back
 * empty with `hasMoreItems: false` — the screen said "that is all there is" while 59
 * products sat behind it. Reading the prefix costs the same single call on page 1 (every
 * screen today) and is correct on both paths. It cannot reach past
 * {@link MAX_PAGE_SIZE} rows; when the asked-for page is beyond that the answer carries
 * `truncated: true` rather than a silently short page.
 *
 * See {@link EntityPagination} for why `totalItems` may be `null`.
 *
 * ### Delegated entry (`supplierNodeRef`)
 *
 * Scoped **in the query** with `ANCESTOR:"<supplier>"`, because that is where beCPG
 * files a supplier's entities: `SupplierPortalServiceImpl.getOrCreateSupplierDestFolder()`
 * creates `<supplier>/SupplierEntities` (`RepoConsts.PATH_SUPPLIER_ENTITIES`) as a
 * **child of the supplier node** and `SupplierPortalHelper` moves — or branches — the
 * entity into it. So "belongs to this supplier" is a containment fact, and containment
 * is the one thing Alfresco can search: `bcpg:suppliers` is an association, and
 * associations are not indexed.
 *
 * The previous implementation post-filtered instead: it read one 200-row window of the
 * caller's *whole* readable park and kept the rows whose `bcpg:suppliers[0]` matched.
 * That is wrong twice over.
 *
 *   1. **The window.** It is an arbitrary prefix of everything the caller can read, so
 *      the supplier's entities are usually not in it, and what came back was "0
 *      products, no more pages" — indistinguishable from an empty catalogue. Measured:
 *      `?supplier=<seed supplier>` returned 0 items while that supplier owns 83.
 *   2. **The signal.** `bcpg:suppliers` is permission-dependent, and the question
 *      ("is this entity this supplier's?") is not. When the session may not read the
 *      target, beCPG returns it under the {@link ACCESS_DENIED_NAME} marker; on the
 *      current visitor the id survives that marker, on an older one the target was not
 *      serialised at all — so whether the comparison could *ever* match depends on the
 *      repository version, which is precisely why it must not be the mechanism.
 *
 * **An unreadable permission rendered as "you have no products" is the defect**, and
 * both failure modes above produced exactly that.
 *
 * Now: an unreadable supplier is a **404** ({@link resolveDelegatedSupplier}), and a
 * scope that legitimately matches nothing says so in `supplierScope.empty` instead of
 * letting an empty list pass for a normal state. `supplierScope` also declares what the
 * clause does **not** cover — an entity linked by `bcpg:suppliers` but filed outside the
 * supplier space is not returned, and no query can find it.
 *
 * @param {Object} client authenticated beCPG client
 * @param {Object} [options]
 * @param {number} [options.page=1]
 * @param {number} [options.pageSize=25] capped at {@link MAX_PAGE_SIZE}
 * @param {string[]} [options.types]
 * @param {string[]} [options.states]
 * @param {string} [options.q]
 * @param {string} [options.supplierNodeRef] delegated entry — scope on this supplier
 * @param {string[]} [options.nodeRefs] explicit set (used by the dashboard)
 * @param {Object} [options.projectsByEntity] nodeRef → `{nodeRef, name, state}`
 * @returns {Promise<{items: Entity[], pagination: EntityPagination, supplierScope?: Object}>}
 * @throws {NotFoundError} `supplierNodeRef` is not a supplier this session can read
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
        // Ask for the cheap projection when the caller only names and orders the
        // rows — see {@link PREVIEW_FIELDS} for what it costs not to.
        preview = false,
        ...queryOptions
    } = options;

    const size = Math.max(1, Math.min(Number(pageSize) || 25, MAX_PAGE_SIZE));
    const current = Math.max(1, Number(page) || 1);

    const scope = supplierNodeRef ? await resolveDelegatedSupplier(client, supplierNodeRef) : null;

    // Everything up to the end of the requested page, never more.
    const wanted = current * size;
    const windowSize = Math.min(wanted, MAX_PAGE_SIZE);

    /*
     * Delegated entry names its supplier; everybody else is scoped on their own.
     * An explicit `nodeRefs` set is left alone: the caller already named
     * ACL-checked entities, and no route lets the browser choose that set.
     */
    const resolved = scope
        ? { ancestors: [scope.nodeRef], accessGroups: [supplierAccessGroup(scope.code)].filter(Boolean) }
        : (queryOptions.nodeRefs ? { ancestors: [], accessGroups: [] } : await sessionSupplierScope(client));

    if (resolved === NO_SUPPLIER) {
        return {
            items: [],
            pagination: {
                page: current,
                pageSize: size,
                count: 0,
                hasMoreItems: false,
                totalItems: 0,
                totalAtLeast: 0,
                totalExact: true,
                totalPages: 1,
                truncated: false,
            },
            supplierScope: {
                supplier: null,
                applied: true,
                clause: null,
                reason: 'no supplier is attached to this account',
                unsupported: [],
                empty: {
                    reason: 'no supplier is attached to this account',
                    hint: 'the account holds no GROUP_EXTERNAL_SUPPLIER_<code> membership,'
                        + ' so it has no park to list',
                },
            },
        };
    }
    const { ancestors, accessGroups } = resolved;

    const data = await client.getJson('becpg/remote/entity/list', {
        query: {
            query: buildEntityQuery({ ...queryOptions, ancestors, accessGroups }),
            fields: preview ? PREVIEW_FIELDS : LIST_FIELDS,
            lists: 'none',
            maxResults: windowSize,
        },
    });

    const rows = Array.isArray(data && data.entities) ? data.entities : [];

    // Repository debris is dropped before anything else looks at the window — see
    // `isOrphanRow`. It has to happen here rather than in the query, because the
    // clause that would express it moves the whole search onto the SOLR index.
    const kept = rows.filter((row) => !isOrphanRow(row && row.entity));
    const skippedOrphans = rows.length - kept.length;

    const window = kept
        .map((row) => normalizeEntity(row && row.entity, { projectsByEntity }))
        .filter(Boolean);

    const raw = (data && data.pagination) || {};
    const upstreamHasMore = Boolean(raw.hasMoreItems);

    const start = (current - 1) * size;
    const items = window.slice(start, start + size);

    // The window starts at the first row, so what we hold is a prefix of the result
    // set: `readListTotal()` turns beCPG's `totalItems` into an exact total or into
    // `null` + a proven floor. It is never the `count + 1` sentinel.
    //
    //
    // When debris was dropped, no exact total can survive: beCPG counted it, the
    // screen does not show it, and beCPG cannot be asked for a count of "rows that
    // are not orphans". Publishing its number anyway would say 256 products over a
    // list of 58. So the total degrades to a proven floor — what we actually hold —
    // which is the same contract every other capped listing in the portal uses.
    const { total: totalItems, atLeast, exact } = skippedOrphans > 0
        ? { total: null, atLeast: window.length, exact: false }
        : readListTotal(raw, { rows: window.length });

    return {
        items,
        pagination: {
            page: current,
            pageSize: size,
            count: items.length,
            hasMoreItems: upstreamHasMore || start + items.length < window.length,
            totalItems,
            totalAtLeast: atLeast,
            totalExact: exact,
            totalPages: totalItems === null ? null : Math.max(1, Math.ceil(totalItems / size)),
            truncated: wanted > windowSize,
        },
        ...(scope || ancestors.length > 0
            ? {
                supplierScope: {
                    supplier: scope,
                    applied: true,
                    clause: [
                        ...ancestors.map((ref) => `ANCESTOR:"${ref}"`),
                        ...accessGroups.map((group) => `=bcpg:externalAccessGroup:"${group}"`),
                    ].join(' OR '),
                    reason: 'beCPG files a supplier entity under <supplier>/SupplierEntities'
                        + ' (SupplierPortalServiceImpl.getOrCreateSupplierDestFolder) and tags what'
                        + ' it hands to the supplier with bcpg:externalAccessGroup, which survives the'
                        + ' merge of a closed referencing; bcpg:suppliers is an association and cannot'
                        + ' be searched',
                    unsupported: ['bcpg:suppliers targets never handed to the supplier through a project'],
                    // An empty scoped listing is never left to speak for itself: the
                    // supplier was readable (a delegated one is a 404 otherwise), so
                    // "nothing here" is a statement about *filing*, not about the
                    // supplier's catalogue.
                    empty: window.length === 0
                        ? {
                            reason: 'no entity is filed under or handed to this supplier',
                            hint: 'entities linked to it by bcpg:suppliers, filed elsewhere and never'
                                + ' sent to it through a project, are outside this scope and cannot'
                                + ' be searched',
                        }
                        : null,
                },
            }
            : {}),
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
    // `getEntityJson`, not `client.getJson`: this is the read that must survive a
    // reference the account may not follow — beCPG answers 200 with an empty body
    // and the sheet used to 404 on a product the supplier owns.
    const data = await getEntityJson(
        { nodeRef, fields: DETAIL_FIELDS, ...(lists ? { lists } : {}) },
        { session: client.session, skipAllowList: true },
    );
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
/** Above this many distinct duplicates, the screen says "and N others". */
const MAX_NAMED_DUPLICATES = 8;

/**
 * Replaces the nodeRefs of `nonUniqueFields[].entities` by the products they name.
 *
 * **What the supplier was reading.** `becpg/entity/catalog/node/…` reports a
 * value used twice as a bare list of node identifiers, and the *Conformité* tab
 * printed it verbatim:
 *
 * > Code ERP : « MP-EPI-001 »
 * > Déjà utilisé par workspace://SpacesStore/372029fb-f1bb-4954-a029-fbf1bb3954b6
 *
 * Measured on the reference instance with the test supplier account. The sentence
 * is *about* another product, so the other product's name is the whole message;
 * the identifier is noise the supplier cannot act on.
 *
 * One read per **distinct** nodeRef, capped — a duplicated code has one or two
 * twins, not a park. Beyond the cap the extra entries keep no name and the UI
 * counts them. A target this account may not read keeps no name either, which is
 * the honest answer: "used elsewhere, by something you cannot see".
 *
 * @param {Catalog[]} catalogs normalised catalogues, mutated in place
 * @param {Object} client an authenticated beCPG client
 * @returns {Promise<void>}
 */
async function nameDuplicateEntities(catalogs, client) {
    const pending = new Set();
    for (const catalog of catalogs || []) {
        for (const field of catalog.nonUniqueFields || []) {
            for (const entity of field.entities || []) {
                if (typeof entity === 'string' && entity && pending.size < MAX_NAMED_DUPLICATES) {
                    pending.add(entity);
                }
            }
        }
    }
    if (pending.size === 0 || !client) {
        return;
    }

    const names = new Map();
    await Promise.all([...pending].map(async (ref) => {
        try {
            const payload = await client.getJson('becpg/remote/entity', {
                query: { nodeRef: toNodeRef(ref), lists: 'none', fields: 'cm:name,bcpg:code' },
            });
            const raw = (payload && payload.entity) || {};
            const name = raw['cm:name'] || (raw.attributes || {})['cm:name'];
            if (name) {
                names.set(ref, String(name));
            }
        }
        catch {
            // Refused or gone: no name, and the UI says so without an identifier.
        }
    }));

    for (const catalog of catalogs || []) {
        for (const field of catalog.nonUniqueFields || []) {
            field.entities = (field.entities || []).map((entity) => (typeof entity === 'string'
                ? { nodeRef: entity, name: names.get(entity) || null }
                : entity));
        }
    }
}

export async function getEntityCatalogs(client, entityNodeRef, options = {}) {
    const nodeRef = toNodeRef(entityNodeRef);
    const data = await client.getJson(`becpg/entity/catalog/node/${nodeRefToPath(nodeRef)}`, {
        query: options.catalogId ? { catalogId: options.catalogId } : {},
    });

    const rawCatalogs = Array.isArray(data && data.catalogs) ? data.catalogs : [];
    // Per-locale rows are kept — they carry different `missingFields` — but the
    // same catalogue twice for the same locale is a duplicate definition file
    // on the beCPG side and must not be rendered twice. See {@link catalogKey}.
    const catalogs = dedupeCatalogs(rawCatalogs.map(normalizeCatalog));
    await nameDuplicateEntities(catalogs, client);
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
 * Every specification applying to the caller's entities, in **two** repository
 * calls instead of one per product — behind `GET /api/v1/specs`.
 *
 * `/specs` used to scan the park: one `entities/{id}/specs` per product, 4 at a
 * time, 60 products. Measured on the reference instance: **60 repository calls, ~750 ms**,
 * on every visit to the page.
 *
 * It turns out `becpg/remote/entity/list` returns a *target association* when
 * `fields` names it — the key is simply absent when the association is empty,
 * which is what made it look unsupported. Same 60 entities, measured: **one call,
 * 592 ms**, 3 of them carrying a specification. The specifications themselves are
 * then read once each — distinct, not once per product that points at them.
 *
 * So the cost stops growing with the size of the park and starts growing with the
 * number of *distinct specifications*, which is the quantity the page is about.
 *
 * @param {Object} client
 * @param {Object} [options]
 * @param {string} [options.supplierNodeRef] delegated-entry scope
 * @param {number} [options.maxEntities=200] ceiling on the scanned window
 * @returns {Promise<{specifications: Array<Specification & {appliesTo: EntityRef[]}>,
 *                    scanned: number, truncated: boolean}>}
 */
export async function listSupplierSpecifications(client, options = {}) {
    const { supplierNodeRef, maxEntities = MAX_PAGE_SIZE } = options;
    const scope = supplierNodeRef ? await resolveDelegatedSupplier(client, supplierNodeRef) : null;

    const data = await client.getJson('becpg/remote/entity/list', {
        query: {
            query: buildEntityQuery({ ancestor: scope ? scope.nodeRef : undefined }),
            // `cm:name` and `bcpg:code` name the product a specification applies to;
            // the association is what the page is actually after.
            fields: 'cm:name,bcpg:code,bcpg:productSpecifications',
            lists: 'none',
            maxResults: Math.min(Math.max(1, Number(maxEntities) || MAX_PAGE_SIZE), MAX_PAGE_SIZE),
        },
    });

    const rows = Array.isArray(data && data.entities) ? data.entities : [];
    const entities = rows.map((row) => row && row.entity).filter((raw) => raw && !isOrphanRow(raw));

    // nodeRef of the specification → the entities it applies to. One entry per
    // specification, however many products point at it.
    const appliesTo = new Map();
    entities.forEach((raw) => {
        const refs = raw['bcpg:productSpecifications'] || (raw.attributes || {})['bcpg:productSpecifications'];
        const list = Array.isArray(refs) ? refs : (refs ? [refs] : []);
        list.forEach((node) => {
            const specNodeRef = (node && (node.nodeRef || nodeRefFromId(node.id))) || null;
            if (!specNodeRef) {
                return;
            }
            const owners = appliesTo.get(specNodeRef) || [];
            owners.push({
                nodeRef: node.nodeRef || nodeRefFromId(raw.id),
                uuid: raw.id,
                name: raw['cm:name'] || null,
                code: raw['bcpg:code'] || null,
                type: raw.type || null,
            });
            appliesTo.set(specNodeRef, owners);
        });
    });

    const resolved = await Promise.all(
        [...appliesTo.keys()].map(async (specNodeRef) => {
            const specification = await readSpecification(client, specNodeRef);
            // `null` = the supplier has no rights on it, so it is not theirs to see.
            return specification ? { ...specification, appliesTo: appliesTo.get(specNodeRef) } : null;
        }),
    );

    const specifications = resolved.filter(Boolean);

    return {
        specifications,
        // A specification the account may not open is dropped
        // ({@link readSpecification}); saying how many were dropped is the
        // difference between "your customer applies none" and "your customer
        // applies one you cannot read" — two answers the same empty list used to
        // give.
        unreadable: resolved.length - specifications.length,
        scanned: entities.length,
        truncated: Boolean(data && data.pagination && data.pagination.hasMoreItems),
        ...(scope ? { supplierScope: { supplier: scope, applied: true } } : {}),
    };
}

/**
 * **Applicable product specifications** (cahiers des charges) of one entity —
 * behind `GET /api/v1/entities/{id}/specs`.
 *
 * Reads the `bcpg:productSpecifications` association of the entity, then loads
 * the specification entities themselves for their metadata. Read-only by
 * construction: the portal exposes no write path on a specification.
 *
 * Only the specifications the caller may actually open are returned — see
 * {@link readSpecification}.
 *
 * `downloadUrl` points at the portal proxy, never at Alfresco: the ticket stays
 * server-side (spec §6.1).
 *
 * @param {Object} client
 * @param {string} entityNodeRef nodeRef or uuid
 * @returns {Promise<{nodeRef: string, specifications: Specification[], unreadable: number}>}
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
        return { nodeRef, specifications: [], unreadable: 0 };
    }

    const resolved = await Promise.all(nodeRefs.map((specNodeRef) => readSpecification(client, specNodeRef)));
    const specifications = resolved.filter(Boolean);

    // See `listSupplierSpecifications`: how many the account may not open.
    return { nodeRef, specifications, unreadable: resolved.length - specifications.length };
}

/**
 * Reads one specification, or `null` when the supplier has no rights on it.
 *
 * **A specification the account cannot read must not be listed at all.** The
 * association is readable from the product — `bcpg:productSpecifications` names
 * the target — but the target node itself is ACL'd separately, and the two do not
 * have to agree. Measured on the reference instance with the test supplier account: the one
 * specification its 58 entities point at answers `#AccessDenied` as an association
 * name, **401** on `becpg/remote/entity`, and **500** on `api/node/content`. The
 * page was listing it anyway, with an empty name (the reported `—`) and a download
 * URL ending in an empty filename — the reported "ne se visualise pas / ne se
 * télécharge pas".
 *
 * Offering a row that cannot be opened is worse than showing nothing: it tells the
 * supplier a document exists and then fails, with no way to tell a rights problem
 * from a broken portal. So an unreadable specification is dropped, and the page's
 * empty state ("le client vous en communiquera un s'il en applique un") becomes
 * the truthful answer.
 *
 * Only a *rights* answer is swallowed. Anything else — a timeout, a 5xx, an
 * unreachable repository — is a failed read of a specification that does exist,
 * and it propagates so the screen shows its error rather than quietly shrinking
 * the list.
 *
 * @param {Object} client
 * @param {string} specNodeRef
 * @returns {Promise<Specification|null>}
 */
async function readSpecification(client, specNodeRef) {
    let raw = null;
    try {
        const spec = await client.getJson('becpg/remote/entity', {
            query: { nodeRef: specNodeRef, fields: SPEC_FIELDS, lists: 'none' },
        });
        raw = spec && spec.entity ? spec.entity : null;
    }
    catch (error) {
        if (error && (error.status === 401 || error.status === 403)) {
            return null;
        }
        throw error;
    }

    if (!raw) {
        return null;
    }

    const specAttributes = raw.attributes || {};
    const name = raw['cm:name'] || specAttributes['cm:name'] || '';
    const uuid = nodeRefUuid(specNodeRef);

    // beCPG marks a node it resolved but would not disclose. It is the same
    // "no rights" answer as a 401, arriving through the association instead.
    if (name === ACCESS_DENIED_NAME) {
        return null;
    }

    return {
        nodeRef: specNodeRef,
        uuid,
        name,
        title: specAttributes['cm:title'] || null,
        description: specAttributes['cm:description'] || null,
        code: raw['bcpg:code'] || specAttributes['bcpg:code'] || null,
        type: raw.type || 'bcpg:productSpecification',
        state: specAttributes['bcpg:productState'] || null,
        modified: toIsoDate(specAttributes['cm:modified']),
        // A specification is an ENTITY (`bcpg:productSpecification`), not a
        // document: it usually carries no content at all, and `api/node/content`
        // then streams nothing. Offering "Ouvrir" and "Télécharger" on it put two
        // buttons on screen that could only fail — and they make no sense on a
        // sheet the supplier is meant to read, not download.
        //
        // The URL is therefore only built when the node really has a content
        // stream (`cm:content` carries a size). `SpecPanel` already hides both
        // buttons when `downloadUrl` is null, so nothing else changes.
        downloadUrl: hasContent(specAttributes)
            ? withBasePath(`/api/v1/becpg/api/node/content/${nodeRefToPath(specNodeRef)}/${encodeURIComponent(name || uuid)}`)
            : null,
        detailUrl: withBasePath(`/api/v1/entities/${uuid}`),
    };
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
                    fields: 'cm:name,bcpg:code,bcpg:legalName,bcpg:suppliers',
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
            // `supplier` is the toolbar scope's key; see
            // `lib/adapters/tasks.js#ENTITY_INDEX_FIELDS` for why it rides on a
            // query that already runs rather than on one of its own.
            const owner = raw.type === 'bcpg:supplier'
                ? { nodeRef }
                : toEntityRef(raw['bcpg:suppliers'] ?? attributes['bcpg:suppliers']);
            index[nodeRef] = {
                nodeRef,
                name: raw['cm:name'] || attributes['cm:name'] || '',
                code: raw['bcpg:code'] || attributes['bcpg:code'] || null,
                type: raw.type || null,
                supplier: (owner && owner.nodeRef) || null,
            };
        }
    }
    return index;
}
