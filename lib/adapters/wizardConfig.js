/**
 * Wizard configuration source — **Share resolves, the portal consumes**.
 *
 * ## Which mode is active, and why
 *
 * This module exposes ONE interface — {@link getWizard} — behind two
 * interchangeable sources. The active one is decided at runtime by a single
 * environment variable:
 *
 * | Mode | Active when | What it uses |
 * |---|---|---|
 * | **(a) SHARE — primary** | `BECPG_SHARE_WIZARD_ENDPOINT` is set | `GET /share/service/becpg/portal/wizard` — wizard + steps + **resolved form definitions** in ONE call (doc/becpg-api-contracts.md §8) |
 * | **(b) DEFAULT — fallback, used today** | the variable is unset/empty | `DEFAULT_WIZARDS` (config/wizards.default.js) for the structure **+** the *existing* Share endpoint `GET /share/service/module/entity-datagrid/config/columns` for each step's field definition (§1) |
 *
 * Mode (a) does not exist on the beCPG side yet: it is the single planned,
 * strictly additive beCPG addition (spec §5.4.1). The client is written and
 * gated, so the day the webscript is deployed the portal switches over by
 * setting one variable — no code change, no redeploy of logic.
 *
 * Mode (b) is an assumed development crutch: `DEFAULT_WIZARDS` is a
 * transcription of the standard shipped configuration and therefore **ignores
 * client overrides** (Bridor, Aryzta…). The per-step field definitions,
 * however, are *not* a crutch: `module/entity-datagrid/config/columns` already
 * runs the real beCPG cascade (formId + entityType + siteId + list) and calls
 * `/becpg/form`, so the columns are resolved, client overrides included, and
 * already translated.
 *
 * ## Two rules this module exists to enforce
 *
 * 1. **We never parse XML.** The form configuration lives in Share
 *    (`becpg-*-form-config.xml` + client overrides) and only Share knows the
 *    effective result.
 * 2. **We never reimplement the cascade.** `columns.get.js` →
 *    `getFormConfig()` / `getVisibleFields()` / `createPostBody()` →
 *    `POST /becpg/form` is the reference implementation. Redoing it in the
 *    portal would guarantee divergence.
 *
 * Consequence: we do **not** read `dsg:configAspect` nodes either.
 *
 * ## Authentication towards Share
 *
 * **A Share SESSION is a prerequisite, not a nicety. Measured, do not assume otherwise.**
 *
 * An earlier version of this comment claimed `columns.get.js` "degrades gracefully without a
 * Share session, the user simply gets the default column set". That is **false**. Tested
 * against the reference instance with a valid Alfresco ticket and no Share session:
 *
 *     GET /share/service/module/entity-datagrid/config/columns
 *     -> 401 {"error":"unauthorized","message":"Not authenticated"}
 *
 * because it calls `AlfrescoUtil.getPreferences`, which goes through Share's session
 * connector. The same wall stands in front of the new `becpg/portal/wizard` endpoint for
 * `form` steps: Share's `node-type` evaluator resolves the node type through
 * `/api/metadata` over that same connector.
 *
 * Consequence, and it drives deployment: **no field definition can be resolved without a
 * Share session**, whichever mode is active. `lib/shareSession.js` obtains one in both
 * modes — from the OIDC access token in production, and from Share's own form login on the
 * `DEV_FAKE_AUTH` shortcut, where the credentials are already server-side. So the local run
 * resolves its fields too: measured on the local stack, step1 comes back with 21 fields and
 * `formId: 'supplier'`, where it used to report `no-form-config`.
 *
 * ## Caching
 *
 * Wizard structures and step definitions are configuration, not data: they are
 * cached **per tenant and per user** with a TTL (`WIZARD_CACHE_TTL`, seconds)
 * and a bounded number of entries. The cache key carries everything the
 * resolution depends on — the **configuration version** (below), tenant,
 * **user**, wizard, entity type, site, list, mode, locale and, in Share mode, the
 * nodeRef (the definition can depend on the node's security context).
 *
 * The user is part of the key on purpose, and it is not an optimisation
 * detail: `columns.get.js` reads **per-user** Alfresco preferences
 * (`fr.becpg.formulation.dashlet.custom.datagrid-prefs.*`) to decide which
 * columns are shown and which are forced. Whenever Share can identify the caller
 * — always with `BECPG_SHARE_BEARER=true`, and whenever the ticket resolves to a
 * Share user — its answer differs from one supplier to the next. A key without
 * the user would serve supplier A's resolved column set to supplier B for the
 * whole TTL, i.e. the wrong editable fields on a shared, process-wide cache.
 *
 * ## The configuration can change under the cache
 *
 * Each instance has its own wizards and they are refreshed: Upfield versions its
 * wizards by year. The cache therefore assumes a lag: after a refresh in Share,
 * the portal serves the old structure until `WIZARD_CACHE_TTL` (5 minutes by
 * default), the time it takes for the entry to expire.
 *
 * This is a choice, not an oversight. beCPG publishes no version signal at all —
 * measured, do not assume otherwise:
 *
 * ```
 * GET module/entity-datagrid/config/columns  -> max-age=3600, no ETag and no Last-Modified
 * GET …?noCache=<epoch ms>                   -> Last-Modified: THE VALUE WE SENT
 * GET becpg/portal/wizard                    -> max-age=300, no ETag and no Last-Modified
 * POST becpg/form?reload=true                -> {"SUCCESS": true}   (trigger, not a version)
 * GET  becpg/admin/repository/reload-cache   -> admin / SystemMgr   (trigger, not a version)
 * ```
 *
 * The structure comes from Surf's `config.scoped["wizard"]`
 * (`share-config-custom.xml`), which no webscript ever dates.
 *
 * Taking back control before expiry is therefore done explicitly, through
 * {@link invalidateWizardConfig} — exposed as `POST /api/v1/config/refresh`, with
 * `{"scope":"tenant"}` for the whole tenant. Five minutes of lag plus an
 * on-demand purge, rather than an endpoint to add in beCPG.
 *
 * Server only.
 */

import { DEFAULT_WIZARDS, wizardIdForType, parseListId } from '@/config/wizards.default';
import { wizardMessage } from '@/config/wizardMessages';
import {
    SHARE_BASE,
    getAccessToken,
    requireSession,
    resolveShareBaseUrl,
} from '@/lib/becpg';
import { BadRequestError, NotFoundError, UpstreamError, errorFromStatus } from '@/lib/errors';
import { buildUrl, httpFetch, logDebug, logWarn, readErrorMessage } from '@/lib/http';
import { clearShareSessionCookie, getShareSessionCookie } from '@/lib/shareSession';

/* -------------------------------------------------------------------------- */
/* Modes and configuration                                                     */
/* -------------------------------------------------------------------------- */

/** The two interchangeable sources behind {@link getWizard}. */
export const WIZARD_SOURCE = {
    /** (a) The planned Share webscript — wizard + steps + definitions in one call. */
    SHARE: 'share',
    /** (b) DEFAULT_WIZARDS + the existing `entity-datagrid/config/columns` endpoint. */
    DEFAULT: 'default',
};

/**
 * Share path of the **existing** column/field resolution endpoint
 * (doc/becpg-api-contracts.md §1). Always used for datalist columns, and used
 * for form steps too while mode (b) is active.
 */
export const SHARE_COLUMNS_PATH = 'service/module/entity-datagrid/config/columns';

/** Default path of the planned wizard endpoint, when the flag is a bare `true`. */
export const SHARE_WIZARD_DEFAULT_PATH = 'service/becpg/portal/wizard';

/** Entries kept in the configuration cache before the oldest are evicted. */
const CACHE_MAX_ENTRIES = 500;

/** In-process cache: `key -> { value, expiresAt }`. */
const configCache = new Map();

function env(name, fallback = '') {
    const value = process.env[name];
    return value === undefined || value === null || value === '' ? fallback : value;
}

function toBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }
    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

/**
 * Resolves the Share wizard endpoint from `BECPG_SHARE_WIZARD_ENDPOINT`.
 *
 * Accepted values:
 *   - unset / empty / `false` / `off` → mode (b), the endpoint is not called;
 *   - `true` / `1` / `on`             → mode (a) on {@link SHARE_WIZARD_DEFAULT_PATH};
 *   - any other string                → mode (a) on that Share path
 *     (leading `/share/` and `/` are stripped, so
 *     `/share/service/becpg/portal/wizard` and `service/becpg/portal/wizard`
 *     are equivalent).
 *
 * @returns {{ enabled: boolean, path: string|null }}
 */
export function shareWizardEndpoint() {
    const raw = String(env('BECPG_SHARE_WIZARD_ENDPOINT', '')).trim();
    if (!raw || ['0', 'false', 'no', 'off'].includes(raw.toLowerCase())) {
        return { enabled: false, path: null };
    }
    if (['1', 'true', 'yes', 'on'].includes(raw.toLowerCase())) {
        return { enabled: true, path: SHARE_WIZARD_DEFAULT_PATH };
    }
    const path = raw.replace(/^\/+/, '').replace(/^share\//, '').replace(/^\/+/, '');
    return { enabled: true, path: path || SHARE_WIZARD_DEFAULT_PATH };
}

/**
 * The source that will actually be used for the next {@link getWizard} call.
 * Exposed so a diagnostics screen (or a log line) can state it plainly.
 *
 * @returns {'share'|'default'}
 */
export function activeWizardSource() {
    return shareWizardEndpoint().enabled ? WIZARD_SOURCE.SHARE : WIZARD_SOURCE.DEFAULT;
}

/** Configuration cache TTL, in milliseconds. */
export function wizardCacheTtl() {
    const seconds = Number(env('WIZARD_CACHE_TTL', '300'));
    return (Number.isFinite(seconds) && seconds >= 0 ? seconds : 300) * 1000;
}

/* -------------------------------------------------------------------------- */
/* Cache                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Reads a live entry, or `undefined` when there is none or it has expired.
 *
 * A hit moves the key back to the end of the map so `configCache` behaves as an
 * LRU: `Map` iterates in insertion order, which is what {@link cacheSet} evicts
 * on.
 *
 * @param {string} key
 * @returns {*} the cached value, or `undefined`
 */
function cacheGet(key) {
    const entry = configCache.get(key);
    if (!entry) {
        return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
        configCache.delete(key);
        return undefined;
    }
    configCache.delete(key);
    configCache.set(key, entry);
    return entry.value;
}

/**
 * Stores a value for {@link wizardCacheTtl}, evicting the oldest entry when the
 * map is full. Returns the value so call sites can `return cacheSet(key, x)`.
 *
 * `WIZARD_CACHE_TTL=0` disables the cache entirely: nothing is stored, and every
 * call resolves from Share.
 *
 * @param {string} key
 * @param {*} value
 * @returns {*} `value`, unchanged
 */
function cacheSet(key, value) {
    const ttl = wizardCacheTtl();
    if (ttl <= 0) {
        return value;
    }
    if (configCache.size >= CACHE_MAX_ENTRIES) {
        const oldest = configCache.keys().next();
        if (!oldest.done) {
            configCache.delete(oldest.value);
        }
    }
    configCache.set(key, { value, expiresAt: Date.now() + ttl });
    return value;
}

/**
 * Drops cached configuration.
 *
 * @param {string} [tenantId] when given, only that tenant's entries are dropped
 * @returns {number} number of evicted entries
 */
export function clearWizardCache(tenantId) {
    if (!tenantId) {
        const size = configCache.size;
        configCache.clear();
        return size;
    }
    let removed = 0;
    for (const key of [...configCache.keys()]) {
        if (key.startsWith(`${tenantId}|`) || key.includes(`|${tenantId}|`)) {
            configCache.delete(key);
            removed += 1;
        }
    }
    return removed;
}

/**
 * Drops the cached configuration of one caller — or of a whole tenant.
 *
 * The explicit purge, the only way to take back control before the TTL: beCPG
 * publishes no version, an administrator who refreshes a wizard in Share has no
 * way to tell the portal, and a supplier looking at the old structure has no way
 * to ask for the new one. `POST /api/v1/config/refresh` calls this, so the answer
 * to "I refreshed the wizard and the portal still shows the old fields" is one
 * click rather than five minutes of waiting.
 *
 * Scoped to `(tenant, user)` by default: the resolved columns are per-user
 * (Alfresco preferences), so that is the unit that means something, and one
 * supplier cannot make every other supplier's next call pay for a re-resolution.
 *
 * @param {Object} [scope]
 * @param {string} [scope.tenantId] restrict to this tenant
 * @param {string} [scope.username] restrict to this caller inside the tenant
 * @returns {number} number of evicted entries
 */
export function invalidateWizardConfig(scope = {}) {
    const { tenantId, username } = scope;
    if (!tenantId) {
        return clearWizardCache();
    }
    if (username === undefined || username === null) {
        return clearWizardCache(tenantId);
    }
    // The caller's entries are matched
    // on the `|tenant|user|` window rather than on a prefix.
    const needle = `|${tenantId}|${username}|`;
    let removed = 0;
    for (const key of [...configCache.keys()]) {
        if (key.includes(needle)) {
            configCache.delete(key);
            removed += 1;
        }
    }
    return removed;
}

function cacheKey(parts) {
    return parts.map((part) => (part === undefined || part === null ? '' : String(part))).join('|');
}

/* -------------------------------------------------------------------------- */
/* Share client                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Normalised call context, built once per request by the route handlers.
 *
 * @typedef {Object} WizardContext
 * @property {Object} session decrypted portal session (carries ticket + tenant)
 * @property {string} [tenantId] tenant id, defaults to `session.tenantId`
 * @property {string} [username] the caller, part of every cache key (see header)
 * @property {string} [entityType] prefixed type, e.g. `bcpg:rawMaterial`
 * @property {string} [entityNodeRef] the entity being edited, when it exists
 * @property {string} [siteId] Share site scoping the configuration
 * @property {string} [locale] user locale, forwarded as `Accept-Language`
 * @property {boolean} [noCache] resolve from Share and refresh the entry, whatever
 *           the cache holds — the bypass generalised from `getColumnsConfig`
 */

/**
 * Builds a {@link WizardContext} from a session and loose options.
 *
 * `noCache` is carried on the context rather than only on the call options so a
 * caller that already forwards its request options (`{ ...options, session }`)
 * gets the bypass for free, on the wizard structure and on the columns alike.
 *
 * @param {Object} session
 * @param {Object} [options]
 * @returns {WizardContext}
 */
export function createContext(session, options = {}) {
    return {
        session,
        tenantId: options.tenantId || session?.tenantId || session?.becpgInstance || 'default',
        // Share resolves the columns against the caller's own preferences, so the
        // caller is part of the cache identity (see the "Caching" section above).
        username: options.username || session?.username || session?.sub || '',
        entityType: options.entityType || null,
        entityNodeRef: options.entityNodeRef || null,
        /*
         * `supplier-portal` BY DEFAULT, and not a variable someone must fill in.
         *
         * The site is created by `SupplierPortalInitRepoVisitor`, under the identifier
         * held by `SupplierPortalHelper.SUPPLIER_SITE_ID`: it is therefore known to
         * every instance where beCPG is delivered, and nothing justified turning it
         * into a configuration nobody ever filled in.
         *
         * This is not cosmetic. `columns.get.js` resolves the form of a grid
         * through a cascade that tries `formId-siteId-list` before `formId`:
         * without a siteId, the portal received Share's `datagrid` form, the same
         * one as the internal interface, and no column could be specific to it.
         * With it, a `datagrid-supplier-portal` form applies only to its own calls
         * and leaves Share untouched.
         */
        siteId: options.siteId || env('BECPG_SUPPLIER_SITE_ID', 'supplier-portal') || null,
        locale: options.locale || null,
        noCache: options.noCache === true || options.refresh === true,
    };
}

/**
 * GET a Share service endpoint and parse its JSON.
 *
 * This is the only place the portal talks to Share for configuration. It is
 * exported because `forms.js` and `datalists.js` consume the very same
 * `entity-datagrid/config/columns` endpoint and must authenticate identically.
 *
 * @param {WizardContext} ctx
 * @param {string} path Share path, relative to `/share/` (e.g. `service/…`)
 * @param {Object} [query] query parameters (empty values are dropped)
 * @returns {Promise<*>} the parsed JSON body
 * @throws {PortalError} typed error mapped from the Share status
 *
 * @example
 * const { columns } = await shareGetJson(ctx, SHARE_COLUMNS_PATH,
 *     { itemType: 'bcpg:nutList', list: 'nutList', mode: 'edit' });
 */
export async function shareGetJson(ctx, path, query) {
    const session = ctx?.session || await requireSession();
    const baseUrl = resolveShareBaseUrl(session);
    const cleanPath = String(path || '').replace(/^\/+/, '');

    const url = buildUrl(`${baseUrl}${SHARE_BASE}${cleanPath}`, query);

    const headers = { Accept: 'application/json' };
    if (ctx?.locale) {
        headers['Accept-Language'] = ctx.locale;
    }

    // The Share SESSION carries the identity, and nothing else does. It is what lets
    // `portal-form.lib.js` reach /becpg/form over the session connector, as the supplier,
    // and what lets Share's `node-type` evaluator resolve the node through /api/metadata —
    // without it entity `form` steps come back `no-form-config` (measured; datalist steps
    // are unaffected, they are declared under `model-type` too).
    //
    // No credential is appended to the URL. A ticket used to travel here as `portalTicket`
    // and was re-glued onto /api/metadata and /becpg/form as `?alf_ticket=`, which wrote it
    // to the access log of every hop and to browser history.
    const shareCookie = await getShareSessionCookie(session);
    if (shareCookie) {
        headers.Cookie = shareCookie;
    }

    if (toBoolean(env('BECPG_SHARE_BEARER'), false)) {
        const token = getAccessToken(session);
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
    }

    const response = await httpFetch(url, { method: 'GET', headers, label: 'share' });
    if (!response.ok) {
        const message = await readErrorMessage(response);

        // A 401/403 from SHARE must NEVER be re-emitted as the portal's own 401.
        //
        // The caller's session is valid — what failed is Share's *session* connector, which
        // `entity-datagrid/config/columns` needs (it calls AlfrescoUtil.getPreferences). Passing
        // the 401 through told the browser "your session died"; SessionProvider then restarted
        // the login flow, DEV_FAKE_AUTH re-issued a session instantly, the page reloaded, asked
        // for the same step, got 401 again — an infinite reload loop on
        // /tasks/<id>?step=<n>. The in-page redirect guard cannot help: a full navigation resets it.
        //
        // So this is reported as what it is: an upstream failure. The step then renders its own
        // error state instead of bouncing the user through the login flow.
        if (response.status === 401 || response.status === 403) {
            clearShareSessionCookie(session);
            throw new UpstreamError(
                'Share refused the configuration call: no Share session (see lib/shareSession.js)',
                {
                    code: 'share_session_required',
                    details: { label: 'share', path: cleanPath, upstreamStatus: response.status },
                },
            );
        }

        throw errorFromStatus(response.status, message, { label: 'share', path: cleanPath });
    }

    const text = await response.text();
    if (!text.trim()) {
        return null;
    }
    // A Share endpoint that needs a session answers with its login page: that is
    // an HTML body, and it must not be reported as "invalid JSON from beCPG".
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('html') || text.trimStart().startsWith('<')) {
        throw new UpstreamError('Share answered with a page instead of JSON (no Share session)', {
            details: { path: cleanPath },
        });
    }
    try {
        return JSON.parse(text);
    }
    catch (error) {
        throw new UpstreamError('Share returned a non-JSON payload', {
            details: { path: cleanPath },
            cause: error,
        });
    }
}

/* -------------------------------------------------------------------------- */
/* Step normalisation                                                          */
/* -------------------------------------------------------------------------- */

/** Step types beCPG's wizard configuration knows about. */
export const STEP_TYPES = ['form', 'entityDataList', 'survey', 'documents'];

/**
 * The pseudo list name the security webscript uses for a step, i.e. the key to
 * look up in `becpg/security/entitylists/check` → `datalists[].name`.
 *
 * `form` and `documents` steps have no real datalist: beCPG models them as the
 * pseudo-lists `View-properties` and `View-documents`
 * (doc/becpg-api-contracts.md §4).
 *
 * @param {{type: string, listId?: string}} step
 * @returns {string|null}
 */
export function securityListName(step) {
    if (!step) {
        return null;
    }
    if (step.type === 'form') {
        return 'View-properties';
    }
    if (step.type === 'documents') {
        return 'View-documents';
    }
    return step.listId || null;
}

/**
 * Normalises one step, whatever the source it came from.
 *
 * `labelId` / `titleId` are message keys **resolved by beCPG**: in Share mode the
 * label arrives already translated in the caller's language and is taken as it
 * comes. The key is kept beside it either way, because it identifies the step
 * across languages.
 *
 * In mode (b) nothing translated them, and every step reached the screen with an
 * empty label — the rail, the tabs and the assistant printed « step1 »…
 * « step10 ». The keys of the default wizards are therefore mirrored in
 * `config/wizardMessages.js` and resolved here, in the caller's language, **only
 * when the repository sent no label**. A key nobody mirrored still degrades to
 * an empty label, never to `becpg.wizard.…` on screen.
 *
 * @param {Object} raw a step from Share or from DEFAULT_WIZARDS
 * @param {number} index position, used to synthesise a missing id
 * @param {string} [lang] portal language, for the fallback above
 * @returns {Object} normalised step
 */
function normalizeStep(raw, index, lang) {
    const listId = raw.listId || null;
    const { name: listName, index: listIndex } = parseListId(listId);
    const type = STEP_TYPES.includes(raw.type) ? raw.type : (raw.type || 'form');

    return {
        id: raw.id || `step${index + 1}`,
        type,
        label: raw.label || wizardMessage(raw.labelId, lang),
        labelId: raw.labelId || null,
        title: raw.title || wizardMessage(raw.titleId, lang),
        titleId: raw.titleId || null,
        formId: raw.formId || null,
        itemId: raw.itemId || null,
        // The raw listId is what beCPG expects as `dataListName`: the `@N` suffix
        // is part of the datalist node's cm:name (InitEntityListPolicy.createName).
        listId,
        listName,
        listIndex,
        nextStepWebScript: raw.nextStepWebScript || null,
        nodeRefStepIndex: raw.nodeRefStepIndex !== undefined && raw.nodeRefStepIndex !== null
            ? Number(raw.nodeRefStepIndex)
            : null,
        readOnly: raw.readOnly === true || raw['read-only'] === true || raw['read-only'] === 'true',
        securityListName: securityListName({ type, listId }),
        definition: raw.definition || null,
        // The item's default form, when Share was asked for it: what the row
        // editor renders, and `null` when there is none to render.
        itemDefinition: raw.itemDefinition || null,
    };
}

/**
 * Normalises the wizard-level attributes.
 *
 * @param {Object} raw
 * @param {string} wizardId
 * @returns {Object}
 */
function normalizeWizard(raw, wizardId) {
    return {
        id: raw?.id || wizardId,
        draft: raw?.draft === true || raw?.draft === 'true',
        comments: raw?.comments === true || raw?.comments === 'true',
        allSteps: raw?.allSteps === true || raw?.allSteps === 'true',
        readOnly: raw?.readOnly === true || raw?.['read-only'] === true || raw?.['read-only'] === 'true',
        enforceTask: raw?.enforceTask === true || raw?.enforceTask === 'true',
        skipSecurityRules: raw?.skipSecurityRules === true || raw?.skipSecurityRules === 'true',
    };
}

/* -------------------------------------------------------------------------- */
/* Source (a) — the Share wizard webscript                                     */
/* -------------------------------------------------------------------------- */

/**
 * Calls `GET /share/service/becpg/portal/wizard` (doc/becpg-api-contracts.md §8).
 *
 * @param {WizardContext} ctx
 * @param {string} wizardId
 * @returns {Promise<{source: string, wizardId: string, wizard: Object, steps: Object[]}>}
 */
async function getWizardFromShare(ctx, wizardId) {
    const { path } = shareWizardEndpoint();
    const payload = await shareGetJson(ctx, path, {
        wizardId,
        nodeRef: ctx.entityNodeRef,
        entityType: ctx.entityType,
        siteId: ctx.siteId,
        /*
         * The default form of each list item, beside the datagrid one.
         *
         * Share never edits a whole row in its grid either: the parent of an
         * ingredient lives on the row pop-up, whose fields come from the item's
         * default form, and the datagrid form deliberately does not show it. Ask
         * for it and the portal can offer the same surface; an instance that has
         * not been updated ignores the parameter and the portal simply has no
         * row editor to open.
         */
        withItemForm: 'true',
    });

    const rawSteps = Array.isArray(payload?.steps) ? payload.steps : [];
    if (!payload?.wizard && rawSteps.length === 0) {
        throw new NotFoundError(`Share knows no wizard "${wizardId}"`, { details: { wizardId } });
    }

    return {
        source: WIZARD_SOURCE.SHARE,
        wizardId,
        wizard: normalizeWizard(payload.wizard, wizardId),
        steps: rawSteps.map((raw, index) => normalizeStep(raw, index, ctx?.locale)),
    };
}

/* -------------------------------------------------------------------------- */
/* Source (b) — DEFAULT_WIZARDS                                                */
/* -------------------------------------------------------------------------- */

/**
 * Reads the wizard structure from `config/wizards.default.js`.
 *
 * @param {string} wizardId
 * @param {string} [lang] portal language, for the step labels
 * @returns {{source: string, wizardId: string, wizard: Object, steps: Object[]}}
 * @throws {NotFoundError}
 */
function getWizardFromDefaults(wizardId, lang) {
    const raw = DEFAULT_WIZARDS[wizardId];
    if (!raw) {
        throw new NotFoundError(`Unknown wizard "${wizardId}"`, { details: { wizardId } });
    }
    return {
        source: WIZARD_SOURCE.DEFAULT,
        wizardId,
        wizard: normalizeWizard(raw, wizardId),
        steps: (raw.steps || []).map((step, index) => normalizeStep(step, index, lang)),
    };
}

/* -------------------------------------------------------------------------- */
/* Public interface                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Resolves a wizard: its attributes and its ordered steps.
 *
 * Identical shape whichever source is active. In Share mode each step may also
 * carry `definition` (already resolved); in default mode `definition` is null
 * and the caller asks {@link getStepColumns} (or `forms.js`) for it.
 *
 * @param {WizardContext} ctx
 * @param {string} wizardId e.g. `supplier-rawMaterial`
 * @returns {Promise<{source: string, wizardId: string, wizard: Object, steps: Object[]}>}
 * @throws {BadRequestError} when no wizard id can be determined
 * @throws {NotFoundError} when the wizard does not exist
 *
 * @example
 * const ctx = createContext(session, { entityType, entityNodeRef, siteId });
 * const { wizard, steps } = await getWizard(ctx, wizardIdForType(entityType));
 */
/**
 * True when at least one step carries a resolved field definition.
 *
 * `documents` steps legitimately have none (they are a file deposit), so an all-documents
 * wizard — `supplier-content` is one — is considered usable.
 *
 * @param {Object[]} steps the resolved steps
 * @returns {boolean}
 */
export function hasAnyFieldDefinition(steps) {
    const list = Array.isArray(steps) ? steps : [];
    const expectFields = list.filter((step) => step.type !== 'documents');
    if (expectFields.length === 0) {
        return true;
    }
    return expectFields.some((step) => {
        const fields = step.fields || step.definition?.fields;
        return Array.isArray(fields) && fields.length > 0;
    });
}

export async function getWizard(ctx, wizardId, options = {}) {
    if (!wizardId) {
        throw new BadRequestError('Missing wizard id');
    }
    const share = shareWizardEndpoint();
    const noCache = options.noCache === true || ctx?.noCache === true;
    // First segment on purpose: a new configuration version orphans every entry of
    // the previous one in one comparison, and `invalidateWizardConfig` still matches
    // a caller on the `|tenant|user|` window.
    const key = cacheKey([
        ctx?.tenantId, ctx?.username, 'wizard', share.enabled ? 'share' : 'default', wizardId,
        ctx?.entityType, ctx?.siteId, ctx?.locale,
        // In Share mode the resolved definitions may depend on the node itself.
        share.enabled ? ctx?.entityNodeRef : '',
    ]);

    const cached = noCache ? undefined : cacheGet(key);
    if (cached) {
        return cached;
    }

    let resolved;
    if (share.enabled) {
        try {
            resolved = await getWizardFromShare(ctx, wizardId);
        }
        catch (error) {
            // The endpoint is the planned addition; until it is deployed a 404
            // must not take the portal down — fall back and say so once.
            if (error?.status === 404 || error?.status === 405) {
                logDebug('wizard.shareEndpointMissing', { wizardId, status: error.status });
                resolved = getWizardFromDefaults(wizardId, ctx?.locale);
            }
            else {
                throw error;
            }
        }

        // A 200 is not proof of a usable answer. Observed on the reference instance:
        // the endpoint was configured but pointed at ANOTHER instance's Share
        // (BECPG_SHARE_URL leaking from `.env`), which resolved the wizard structure
        // fine and returned ten steps with zero fields — a wizard the supplier cannot
        // fill, with nothing in the logs.
        // So we validate the payload, not just the status, and fall back when it is hollow.
        if (resolved && !hasAnyFieldDefinition(resolved.steps)) {
            logWarn('wizard.shareEndpointEmpty', {
                wizardId,
                steps: resolved.steps?.length || 0,
                reason: 'no step carries a field definition — falling back to the default source',
            });
            resolved = getWizardFromDefaults(wizardId, ctx?.locale);
        }
    }
    else {
        resolved = getWizardFromDefaults(wizardId, ctx?.locale);
    }

    return cacheSet(key, resolved);
}

/**
 * Same as {@link getWizard}, but derives the wizard id from the entity type
 * (`bcpg:rawMaterial` → `supplier-rawMaterial`), exactly as the Share
 * deliverable URL does.
 *
 * @param {WizardContext} ctx
 * @param {string} entityType prefixed type
 * @param {Object} [options] forwarded to {@link getWizard} (`noCache`)
 * @returns {Promise<Object>}
 */
export function getWizardForType(ctx, entityType, options = {}) {
    return getWizard(ctx, wizardIdForType(entityType), options);
}

/**
 * Asks Share for the resolved columns/fields of one step.
 *
 * This is the **existing** endpoint of doc/becpg-api-contracts.md §1: Share runs
 * the cascade and calls `POST /becpg/form`, and answers with columns that are
 * already resolved and already translated. It serves both the datalist grids and
 * — while mode (b) is active — the form steps.
 *
 * @param {WizardContext} ctx
 * @param {Object} step a normalised step
 * @param {Object} [options]
 * @param {'view'|'edit'|'create'|'bulk-edit'|'datagrid-prefs'} [options.mode='edit']
 * @param {string} [options.formId] overrides `step.formId`
 * @param {string} [options.itemType] overrides `step.itemId`
 * @param {boolean} [options.noCache=false] bypass the portal cache
 * @returns {Promise<Object[]>} the raw `columns` array (never null)
 */
export async function getStepColumns(ctx, step, options = {}) {
    const mode = options.mode || 'edit';
    const itemType = options.itemType || step?.itemId || null;
    if (!itemType) {
        return [];
    }
    const formId = options.formId !== undefined ? options.formId : (step?.formId || null);
    const list = step?.listId || null;

    return getColumnsConfig(ctx, { itemType, list, formId, mode, noCache: options.noCache });
}

/**
 * Raw access to `module/entity-datagrid/config/columns`, cached per tenant.
 *
 * @param {WizardContext} ctx
 * @param {Object} params
 * @param {string} params.itemType prefixed type, e.g. `bcpg:nutList`
 * @param {string} [params.list] datalist name (with its `@N` suffix, if any)
 * @param {string} [params.formId] dedicated form id (`supplier`, `datagrid-supplier-nut`…)
 * @param {'view'|'edit'|'create'|'bulk-edit'|'datagrid-prefs'} [params.mode='edit']
 * @param {boolean} [params.noCache=false]
 * @returns {Promise<Object[]>} the `columns` array
 */
export async function getColumnsConfig(ctx, params = {}) {
    const { itemType, list = null, formId = null, mode = 'edit' } = params;
    // The bypass now comes from the context too, so it survives a caller that only
    // forwards its request options (see `createContext`).
    const noCache = params.noCache === true || ctx?.noCache === true;
    if (!itemType) {
        throw new BadRequestError('getColumnsConfig requires an itemType');
    }

    const key = cacheKey([
        ctx?.tenantId, ctx?.username, 'columns', itemType, list, formId, mode,
        ctx?.entityType, ctx?.siteId, ctx?.entityNodeRef, ctx?.locale,
    ]);
    if (!noCache) {
        const cached = cacheGet(key);
        if (cached) {
            return cached;
        }
    }

    const payload = await shareGetJson(ctx, SHARE_COLUMNS_PATH, {
        itemType,
        list,
        formId,
        mode,
        siteId: ctx?.siteId,
        entityType: ctx?.entityType,
        entityNodeRef: ctx?.entityNodeRef,
        /*
         * The `<control>` the form configuration declares for each field.
         *
         * Without it a column carries its data type and nothing else, so a
         * `d:noderef` such as `bcpg:ingListIngTypes` ("Fonctions de l'ingrédient")
         * reaches the grid as an autocomplete with **no datasource** — and the
         * picker can only answer "this field has no value list configured".
         * The `ds` exists, in `becpg-plm-form-config.xml`; it simply was not
         * serialised. Share now sends it when asked, and only when asked: an
         * instance that has not been updated ignores the parameter and the
         * portal degrades exactly as before.
         */
        withControls: 'true',
        /*
         * The model's `<default>` for each column.
         *
         * A boolean the model already answers — OGM, ionisation, processing aid —
         * is not an unanswered question: without the default the grid asked the
         * supplier to choose Oui or Non on every one of them, where beCPG only
         * ever wanted the ones that are true to be ticked. Opt-in on the Share
         * side too, so an instance that has not been updated answers as before.
         */
        withDefaults: 'true',
        ...(noCache ? { noCache: String(Date.now()) } : {}),
    });

    if (payload?.error) {
        throw new UpstreamError(`Share could not resolve the columns of ${itemType}`, {
            details: { itemType, list, formId, mode },
        });
    }

    const columns = Array.isArray(payload?.columns) ? payload.columns : [];
    return noCache ? columns : cacheSet(key, columns);
}

export { wizardIdForType, parseListId };
