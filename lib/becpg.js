/**
 * beCPG server client and proxy engine.
 *
 * The portal plays exactly the role Share's `/share/proxy/alfresco/...` plays
 * today (spec §5.1): it holds the authentication secret, routes to the right
 * target, and never exposes Alfresco to the browser. Two consequences drive
 * every line of this file:
 *
 *   1. the Alfresco ticket lives here and only here — it is read from the
 *      encrypted session cookie, appended as `alf_ticket`, and never appears in
 *      a response header, a body or a log line (spec §6.1);
 *   2. only an explicit allow-list of webscript prefixes is reachable
 *      ({@link ALLOWED_BECPG_PATH_PREFIXES}) — the proxy is not an open relay
 *      onto Alfresco.
 *
 * Two ways to use it:
 *
 *   - **as a client**, from composition route handlers:
 *     `getJson('becpg/remote/entity', { query: { nodeRef } })`
 *   - **as a proxy**, from the catch-all route handlers:
 *     `proxyToBecpg(request, segments)`
 *
 * Server only — never import this from a client component.
 */

import { getLiveSession } from '@/lib/session';
import {
    AuthError,
    BadRequestError,
    ForbiddenError,
    PortalError,
    TenantError,
    UpstreamError,
    errorFromStatus,
} from '@/lib/errors';
import { buildUrl, httpFetch, logDebug, logWarn, readErrorMessage, redactUrl } from '@/lib/http';

/** Every beCPG webscript lives under this path. */
export const BECPG_WEBSCRIPT_BASE = '/alfresco/s/';

/** Share is mounted at `/share/`. */
export const SHARE_BASE = '/share/';

/**
 * **Security allow-list — review this list, not the routes.**
 *
 * The only beCPG webscript path prefixes the supplier proxy may reach.
 * Anything else is answered with 403 without ever leaving the portal.
 * Keep it minimal and justified: each entry is an attack surface opened to
 * external suppliers.
 *
 * A prefix ending with `/` matches by folder; a prefix without one matches the
 * exact path, `<prefix>/…` or `<prefix>.<view>` (webscripts driven by their
 * query string, such as `becpg/form?itemId=…`).
 */
export const ALLOWED_BECPG_PATH_PREFIXES = [
    // Entities, lists, formulation, dictionary — `becpg/remote/entity`,
    // `becpg/remote/entity/list`, `becpg/remote/formulate`, `becpg/remote/dictionary`.
    'becpg/remote/',
    // Datalists and catalogs — `becpg/entity/datalists/data/node/…`,
    // `becpg/entity/datalists/item/node/…`, `becpg/entity/catalog/node/…`.
    'becpg/entity/',
    // Project tasks — `becpg/project/projectTaskInfo`, `completeProjectTask`, `path`.
    'becpg/project/',
    // Read/write mode and frozen lists — `becpg/security/entitylists/check/…`.
    'becpg/security/',
    // Contextual datasources of the form controls — `becpg/autocomplete/…`.
    'becpg/autocomplete/',
    // Questionnaires — `becpg/survey?entityNodeRef=…&dataListName=surveyList@1`,
    // GET to read the decision tree and POST to write the answers. The webscript
    // is driven entirely by its query string and has **no path segments**, so the
    // folder form (`becpg/survey/`) never matched it and every call was answered
    // 403 by the portal itself. Same shape as `becpg/form` below.
    'becpg/survey',
    // Merged form definitions — the single source of the form renderer.
    'becpg/form',
    // Node metadata and content (documents, reports) — `api/node/content/…`.
    'api/node/',
    // Doclib / upload endpoints used for document deposit.
    'slingshot/',
    // --- additions required by documented endpoints of spec §5.4 -------------
    // Starting an authorised referencing process — `becpg/supplier/send-to-supplier`
    // (that is the `<url>` of SupplierPortalWebScript; `sendToSupplier` is the
    // service method it calls, not a webscript path).
    'becpg/supplier/',
];

/**
 * Allow-list of the Share proxy.
 *
 * Share is NOT a marginal target: it is the **authority on form and column
 * configuration** (doc/becpg-api-contracts.md §1). Share owns the resolution
 * cascade `formId + entityType + siteId + list` and then asks the repository for
 * the field metadata. The portal must not reimplement that — it consumes Share's
 * JSON.
 *
 * Deliberately restricted to the config site-webscripts:
 *   - `service/module/entity-datagrid/config/columns` — exists today, returns the
 *     resolved, already-translated columns of a datalist;
 *   - `service/becpg/portal/` — reserved for the single planned Share addition,
 *     the wizard endpoint of doc/becpg-api-contracts.md §8.
 *
 * Rendered Share pages (`page/`), its static resources (`res/`) and its Alfresco
 * relay (`proxy/alfresco/`) are deliberately NOT exposed: a supplier must never
 * reach Share's own UI through the portal (cf. #19293 — Share chrome leaking to
 * external users is exactly what this portal exists to stop).
 */
export const ALLOWED_SHARE_PATH_PREFIXES = [
    'service/module/entity-datagrid/config/',
    'service/becpg/portal/',
];

/** Request headers forwarded upstream. Everything else is dropped. */
const FORWARDED_REQUEST_HEADERS = new Set([
    'accept',
    'accept-language',
    'content-type',
    'if-modified-since',
    'if-none-match',
    'range',
    'x-requested-with',
]);

/** Response headers forwarded back to the browser. Everything else is dropped. */
const FORWARDED_RESPONSE_HEADERS = new Set([
    'content-type',
    'content-disposition',
    'content-language',
    'content-range',
    'accept-ranges',
    'etag',
    'last-modified',
    'cache-control',
    'expires',
]);

/**
 * Query parameters a client is never allowed to set: they would let the browser
 * inject its own credentials into the upstream call.
 */
const CLIENT_FORBIDDEN_QUERY_PARAMS = ['alf_ticket', 'ticket', 'access_token', 'api_key', 'apikey'];

/**
 * `x-becpg-*` request headers a client is never allowed to set.
 *
 * The prefix is otherwise forwarded (it carries harmless UI hints), but these
 * three are part of beCPG's *authentication and routing* contract:
 * `BECPG_TICKET` / `x-becpg-ticket` is the header-mode credential, and
 * `x-becpg-instance` selects the multi-tenant instance. Letting the browser set
 * them would let a supplier aim the proxy at another tenant's data with its own
 * legitimate session — the server derives both from the session, always.
 */
const CLIENT_FORBIDDEN_REQUEST_HEADERS = new Set([
    'becpg_ticket',
    'x-becpg-ticket',
    'x-becpg-instance',
    'x-becpg-tenant',
]);

/** Paths serving binary content, on which `format=json` must not be forced. */
const CONTENT_PATH_PATTERN = /(^|\/)(content|thumbnails|preview|download)(\/|$)/i;

/** Methods the proxy accepts. */
const PROXY_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE']);

/* -------------------------------------------------------------------------- */
/* nodeRef helpers                                                             */
/* -------------------------------------------------------------------------- */

const NODEREF_PATTERN = /^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^/]+)\/(.+)$/;
const NODEPATH_PATTERN = /^([A-Za-z][A-Za-z0-9+.-]*)\/([^/]+)\/(.+)$/;

/**
 * `workspace://SpacesStore/xxx` → `workspace/SpacesStore/xxx`.
 *
 * That is the form beCPG webscripts expect inside a URL path
 * (`becpg/entity/datalists/data/node/{store_type}/{store_id}/{id}`).
 *
 * @param {string} nodeRef an Alfresco nodeRef
 * @returns {string} the three path segments, unencoded
 * @throws {BadRequestError} when the value is not a nodeRef
 *
 * @example
 * nodeRefToPath('workspace://SpacesStore/abc-123'); // 'workspace/SpacesStore/abc-123'
 */
export function nodeRefToPath(nodeRef) {
    const match = NODEREF_PATTERN.exec(String(nodeRef || '').trim());
    if (!match) {
        throw new BadRequestError(`Invalid nodeRef: ${String(nodeRef).slice(0, 80)}`);
    }
    return `${match[1]}/${match[2]}/${match[3]}`;
}

/**
 * `workspace/SpacesStore/xxx` → `workspace://SpacesStore/xxx`.
 *
 * Accepts a leading slash and an already-formed nodeRef (returned untouched),
 * so route handlers can pass whatever the client sent.
 *
 * @param {string} path three path segments, or an already-formed nodeRef
 * @returns {string} the nodeRef
 * @throws {BadRequestError} when the value cannot be a nodeRef
 */
export function pathToNodeRef(path) {
    const value = String(path || '').trim().replace(/^\/+/, '');
    if (NODEREF_PATTERN.test(value)) {
        return value;
    }
    const match = NODEPATH_PATTERN.exec(value);
    if (!match) {
        throw new BadRequestError(`Invalid node path: ${value.slice(0, 80)}`);
    }
    return `${match[1]}://${match[2]}/${match[3]}`;
}

/**
 * True when the value looks like an Alfresco nodeRef.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isNodeRef(value) {
    return NODEREF_PATTERN.test(String(value || '').trim());
}

/* -------------------------------------------------------------------------- */
/* Path validation and allow-list                                              */
/* -------------------------------------------------------------------------- */

/**
 * Joins and validates the catch-all segments of a proxy route.
 *
 * Rejects path traversal in every form we can see (raw, encoded, backslash),
 * so the allow-list check below cannot be walked out of.
 *
 * **Why the check is on the joined path and not on the raw segments.** Next.js
 * hands `params.path` already URL-decoded, and an encoded slash does NOT split
 * a segment: the request
 *
 *     /api/v1/becpg/becpg/remote/%2e%2e%2f%2e%2e%2fapi/login
 *
 * arrives as the segments `['becpg', 'remote', '../../api', 'login']`. Testing
 * `segment === '..'` therefore misses it entirely, the joined path still starts
 * with the allow-listed `becpg/remote/`, and the WHATWG `URL` constructor then
 * silently normalises `/alfresco/s/becpg/remote/../../api/login` into
 * `/alfresco/s/api/login` — i.e. the whole allow-list bypassed, with a real
 * ticket attached. So we validate every `/`-separated component of the final
 * string, which is what the URL parser will actually act on.
 *
 * @param {string[]|string} segments `params.path` of the catch-all route
 * @returns {string} the joined path, without leading or trailing slash
 * @throws {BadRequestError} on an empty or suspicious path
 */
export function joinPathSegments(segments) {
    const list = Array.isArray(segments) ? segments : (segments ? [segments] : []);
    if (list.length === 0) {
        throw new BadRequestError('Missing target path');
    }

    const parts = [];
    for (const rawSegment of list) {
        const segment = String(rawSegment);
        const lowered = segment.toLowerCase();
        // A literal `%xx` still present after Next's decoding means the client
        // double-encoded it — the only reason to do that is to smuggle a
        // separator past this function.
        const suspicious = segment.includes('\\')
            || segment.includes('\0')
            || lowered.includes('%2e')
            || lowered.includes('%2f')
            || lowered.includes('%5c');
        if (suspicious) {
            throw new BadRequestError('Invalid path segment');
        }
        parts.push(segment);
    }

    const path = parts.join('/');
    for (const component of path.split('/')) {
        if (component === '' || component === '.' || component === '..') {
            throw new BadRequestError('Invalid path segment');
        }
    }
    return path;
}

/**
 * Checks a path against an allow-list of prefixes.
 *
 * @param {string} path webscript path, without leading slash
 * @param {string[]} [prefixes=ALLOWED_BECPG_PATH_PREFIXES]
 * @returns {boolean}
 *
 * @example
 * isAllowedPath('becpg/remote/entity');        // true
 * isAllowedPath('becpg/admin/dumpDatabase');   // false
 */
export function isAllowedPath(path, prefixes = ALLOWED_BECPG_PATH_PREFIXES) {
    const value = String(path || '').replace(/^\/+/, '');
    if (!value) {
        return false;
    }
    // A relative component makes the prefix match meaningless: the URL parser
    // resolves it afterwards, so `becpg/remote/../../api/login` would pass the
    // prefix test and then call `api/login`. `joinPathSegments` already rejects
    // these for the proxy routes; repeating it here also covers the direct
    // client (becpgFetch / streamContent / uploadFile), whose paths are built
    // from nodeRefs and file names that ultimately come from the client.
    // Compare on the path portion only: callers may hand over a path that
    // already carries its query string (`becpg/form?itemId=…`), and a nodeRef
    // in that query string legitimately contains slashes.
    const pathOnly = value.split('?')[0].replace(/\/+$/, '');
    if (pathOnly.split('/').some((component) => component === '' || component === '.' || component === '..')) {
        return false;
    }
    return prefixes.some((prefix) => {
        if (prefix.endsWith('/')) {
            return value.startsWith(prefix);
        }
        return value === prefix
            || value.startsWith(`${prefix}/`)
            || value.startsWith(`${prefix}.`)
            || value.startsWith(`${prefix}?`);
    });
}

/**
 * Same as {@link isAllowedPath}, but throws.
 *
 * @param {string} path
 * @param {string[]} [prefixes]
 * @param {string} [target='becpg'] target name, for the log line
 * @throws {ForbiddenError}
 */
export function assertAllowedPath(path, prefixes = ALLOWED_BECPG_PATH_PREFIXES, target = 'becpg') {
    if (!isAllowedPath(path, prefixes)) {
        logWarn('security.pathDenied', { target, path: String(path).slice(0, 200) });
        throw new ForbiddenError('This resource is not reachable through the supplier portal', {
            details: { path: String(path).slice(0, 200) },
        });
    }
}

/* -------------------------------------------------------------------------- */
/* Session context                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Reads the session, or fails with a 401.
 *
 * Uses {@link getLiveSession}, not `getSession`: the OIDC access token lives
 * ~5 minutes and the Alfresco ticket about an hour, while the session cookie
 * lives 8 hours. Reading the raw cookie would hand a dead ticket to Alfresco
 * and turn every long-lived tab into a stream of 401s. `getLiveSession()`
 * refreshes the token / re-exchanges the ticket when needed and re-issues the
 * cookie, so the proxy always works with live credentials.
 *
 * @returns {Promise<Object>} the decrypted, refreshed session
 * @throws {AuthError} when there is no valid session cookie, or when the
 *   credentials could not be renewed (the user must sign in again)
 */
export async function requireSession() {
    const session = await getLiveSession();
    if (!session) {
        throw new AuthError('No portal session');
    }
    return session;
}

/**
 * Resolves the beCPG base URL of a session.
 *
 * The `becpg_url` JWT claim is authoritative (spec §5.3). `BECPG_URL` is only a
 * fallback for internal integrations that authenticate with headers; a session
 * that resolves to neither is a 401, as the spec demands.
 *
 * @param {Object} session
 * @returns {string} base URL without trailing slash
 * @throws {TenantError} when no beCPG URL can be resolved
 */
/**
 * Base URL of Share.
 *
 * In a normal deployment Alfresco and Share sit behind the same host
 * (`https://tenant.becpg.fr/alfresco` and `/share`), so the beCPG base URL is also
 * Share's. A local `run.sh` stack does NOT: Alfresco listens on 8080 and Share on 8180.
 * `BECPG_SHARE_URL` overrides the base for that case; unset, behaviour is unchanged.
 *
 * @param {Object} session the portal session
 * @returns {string} base URL without trailing slash
 * @throws {TenantError} when no URL can be resolved
 */
export function resolveShareBaseUrl(session) {
    const override = (process.env.BECPG_SHARE_URL || '').trim();
    if (!override) {
        return resolveBecpgBaseUrl(session);
    }
    let parsed;
    try {
        parsed = new URL(override);
    }
    catch {
        throw new TenantError('BECPG_SHARE_URL is not a valid URL');
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new TenantError('BECPG_SHARE_URL must be an http(s) URL');
    }
    return override.replace(/\/+$/, '');
}

export function resolveBecpgBaseUrl(session) {
    const candidate = session?.becpgUrl || process.env.BECPG_URL || '';
    if (!candidate) {
        throw new TenantError('Session carries no becpg_url claim');
    }
    let parsed;
    try {
        parsed = new URL(candidate);
    }
    catch {
        throw new TenantError('Session carries an invalid becpg_url claim');
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new TenantError('becpg_url must be an http(s) URL');
    }
    return parsed.origin + parsed.pathname.replace(/\/+$/, '');
}

/**
 * The Alfresco ticket of the session.
 *
 * @param {Object} session
 * @returns {string}
 * @throws {AuthError} when the session carries no ticket
 */
export function requireTicket(session) {
    const ticket = session?.ticket || session?.alfTicket;
    if (!ticket) {
        throw new AuthError('Session carries no Alfresco ticket');
    }
    return ticket;
}

/**
 * The OIDC access token of the session — used for becpg-ai only, never for
 * Alfresco (which gets the ticket).
 *
 * @param {Object} session
 * @returns {string|null}
 */
export function getAccessToken(session) {
    return session?.accessToken || session?.access_token || session?.token || null;
}

/**
 * The beCPG instance identifier (`becpg_instance` claim), sent to becpg-ai as
 * `X-BecPG-Instance`.
 *
 * @param {Object} session
 * @returns {string|null}
 */
export function getInstanceId(session) {
    return session?.instance || session?.becpgInstance || session?.tenantId || null;
}

/* -------------------------------------------------------------------------- */
/* beCPG client                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Builds the absolute URL of a beCPG webscript.
 *
 * @param {string} baseUrl beCPG base URL
 * @param {string} path webscript path, e.g. `becpg/remote/entity`
 * @param {Object} [query] query parameters
 * @returns {URL}
 */
export function buildBecpgUrl(baseUrl, path, query) {
    const cleanPath = String(path || '').replace(/^\/+/, '');
    return buildUrl(`${baseUrl}${BECPG_WEBSCRIPT_BASE}${cleanPath}`, query);
}

/**
 * Calls a beCPG webscript with the session ticket.
 *
 * Authentication uses the `alf_ticket` query parameter: it is the form every
 * Alfresco webscript accepts, including the binary content endpoints, and it
 * survives redirects inside Alfresco — which HTTP Basic does not.
 *
 * `format=json` is added by default; pass `format: null` for binary content.
 *
 * @param {string} path webscript path, relative to `/alfresco/s/`
 * @param {Object} [options]
 * @param {string} [options.method='GET']
 * @param {Object} [options.query] query parameters
 * @param {*} [options.body] request body (string, FormData, stream…)
 * @param {Object} [options.headers] extra request headers
 * @param {string|null} [options.format='json'] value of the `format` parameter
 * @param {Object} [options.session] an already-resolved session
 * @param {number} [options.timeout] override the default timeout
 * @param {AbortSignal} [options.signal]
 * @param {boolean} [options.skipAllowList=false] internal composition calls only
 * @returns {Promise<Response>} the raw upstream response
 * @throws {AuthError|ForbiddenError|PortalError}
 *
 * @example
 * const response = await becpgFetch('becpg/remote/entity', { query: { nodeRef } });
 */
export async function becpgFetch(path, options = {}) {
    const {
        method = 'GET',
        query,
        body,
        headers,
        format = 'json',
        session: providedSession,
        timeout,
        signal,
        skipAllowList = false,
        retries,
    } = options;

    const session = providedSession || await requireSession();
    const baseUrl = resolveBecpgBaseUrl(session);
    const cleanPath = String(path || '').replace(/^\/+/, '');

    if (!skipAllowList) {
        assertAllowedPath(cleanPath, ALLOWED_BECPG_PATH_PREFIXES, 'becpg');
    }

    const effectiveFormat = format && !CONTENT_PATH_PATTERN.test(cleanPath) ? format : null;
    const url = buildBecpgUrl(baseUrl, cleanPath, {
        ...(effectiveFormat ? { format: effectiveFormat } : {}),
        ...(query || {}),
    });
    // Appended last so a caller can never override it from `query`.
    url.searchParams.set('alf_ticket', requireTicket(session));

    return httpFetch(url, {
        method,
        body,
        headers: { Accept: 'application/json', ...(headers || {}) },
        timeout,
        signal,
        retries,
        label: 'becpg',
    });
}

/**
 * `becpgFetch` + JSON parsing + typed errors.
 *
 * @param {string} path
 * @param {Object} [options] same as {@link becpgFetch}
 * @returns {Promise<*>} the parsed body (`null` on 204)
 */
export async function becpgJson(path, options = {}) {
    const response = await becpgFetch(path, options);
    if (!response.ok) {
        const message = await readErrorMessage(response);
        throw errorFromStatus(response.status, message, { label: 'becpg', path });
    }
    if (response.status === 204) {
        return null;
    }
    const text = await response.text();
    if (!text.trim()) {
        return null;
    }
    try {
        return JSON.parse(text);
    }
    catch (error) {
        throw new UpstreamError('beCPG returned a non-JSON payload', {
            details: { path },
            cause: error,
        });
    }
}

/**
 * GET a webscript and parse its JSON.
 *
 * @param {string} path
 * @param {Object} [options] same as {@link becpgFetch}
 * @returns {Promise<*>}
 *
 * @example
 * const lists = await getJson(`becpg/entity/datalists/data/node/${nodeRefToPath(nodeRef)}`,
 *     { query: { dataListName: 'nutList', pageSize: 50 } });
 */
export function getJson(path, options = {}) {
    return becpgJson(path, { ...options, method: 'GET' });
}

/**
 * The scalar properties every beCPG entity carries. Used only by
 * {@link getEntityJson} as the narrowed retry — see there.
 */
const ENTITY_SAFE_FIELDS = [
    'cm:name', 'cm:title', 'cm:description', 'cm:created', 'cm:modified', 'cm:owner',
    'bcpg:code', 'bcpg:erpCode', 'bcpg:legalName', 'bcpg:productState', 'bcpg:productUnit',
].join(',');

/**
 * `becpg/remote/entity`, and the one failure of that webscript the portal cannot
 * let through.
 *
 * **Measured on dev.becpg.fr, 26.1.0.** When an entity carries a `d:noderef` (or
 * an association) whose **target the caller may not read**, the webscript answers
 * `200 OK` with a **zero-byte body** — not a 403, not the bare nodeRef, nothing.
 * Reproduced on a raw material whose `bcpg:productHierarchy2` points at a product
 * of another site:
 *
 * ```
 * fields=cm:name                              → 200, 569 bytes
 * fields=cm:name,bcpg:productHierarchy1       → 200, 869 bytes   (target readable)
 * fields=cm:name,bcpg:productHierarchy2       → 200, 0 bytes     (target refused)
 * no fields at all                            → 200, 0 bytes
 * ```
 *
 * `becpgJson` turns an empty body into `null`, so every caller then reported
 * **"entity not found" — a 404 on a product that exists and that the supplier
 * owns**. One reference it happens not to be allowed to see took the whole sheet,
 * and the whole wizard, down.
 *
 * The answer is to degrade explicitly (AGENTS.md): retry **once**, narrowed to the
 * scalar properties, and flag the result `partial: true` so a caller can say so
 * rather than pretend the entity is complete. The retry costs nothing in the
 * normal case — it only runs when the first read came back empty.
 *
 * @param {Object} query `{ nodeRef, fields?, lists? }`
 * @param {Object} [options] same as {@link becpgFetch}
 * @returns {Promise<Object|null>} the payload, `entity.partial` set when narrowed
 */
export async function getEntityJson(query, options = {}) {
    const payload = await getJson('becpg/remote/entity', { ...options, query });
    if (payload) {
        return payload;
    }

    const narrowed = await getJson('becpg/remote/entity', {
        ...options,
        query: { nodeRef: query.nodeRef, lists: 'none', fields: ENTITY_SAFE_FIELDS },
    });
    if (!narrowed) {
        return payload;
    }
    logWarn('becpg.entityTruncated', {
        nodeRef: String(query.nodeRef || '').slice(-36),
        reason: 'empty body on the full read — an unreadable reference target',
    });

    const entity = narrowed.entity || narrowed;
    entity.partial = true;
    return narrowed;
}

/**
 * POST a JSON document to a webscript.
 *
 * @param {string} path
 * @param {*} [body] serialised as JSON
 * @param {Object} [options] same as {@link becpgFetch}
 * @returns {Promise<*>}
 */
export function postJson(path, body, options = {}) {
    return becpgJson(path, {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

/**
 * PUT a JSON document to a webscript.
 *
 * @param {string} path
 * @param {*} [body] serialised as JSON
 * @param {Object} [options] same as {@link becpgFetch}
 * @returns {Promise<*>}
 */
export function putJson(path, body, options = {}) {
    return becpgJson(path, {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

/**
 * DELETE a webscript resource.
 *
 * @param {string} path
 * @param {Object} [options] same as {@link becpgFetch}
 * @returns {Promise<*>}
 */
export function del(path, options = {}) {
    return becpgJson(path, { ...options, method: 'DELETE' });
}

/**
 * Uploads a file to Alfresco (document deposit, new version).
 *
 * The `FormData` is passed to `fetch` untouched so the multipart boundary is
 * generated correctly — do not set `Content-Type` yourself.
 *
 * @param {string} path upload webscript, e.g. `api/upload`
 * @param {FormData} formData fields expected by the webscript
 *   (`filedata`, `destination`, `updateNodeRef`, `majorVersion`…)
 * @param {Object} [options] same as {@link becpgFetch}
 * @returns {Promise<*>} the parsed upload result
 * @throws {PortalError} `upload` code when the deposit is refused
 *
 * @example
 * const form = new FormData();
 * form.append('filedata', file, file.name);
 * form.append('destination', folderNodeRef);
 * await uploadFile('api/upload', form);
 */
export async function uploadFile(path, formData, options = {}) {
    if (typeof FormData === 'undefined' || !(formData instanceof FormData)) {
        throw new BadRequestError('uploadFile expects a FormData body');
    }
    const response = await becpgFetch(path, {
        ...options,
        method: 'POST',
        body: formData,
        // Let fetch set multipart/form-data; boundary included.
        headers: { Accept: 'application/json', ...(options.headers || {}) },
        retries: 0,
    });

    if (!response.ok) {
        const message = await readErrorMessage(response);
        const error = errorFromStatus(response.status, message, { label: 'becpg', path });
        // A refusal keeps its own code: "Le dépôt du fichier a échoué." invites a retry, and
        // a deposit on an entity the supplier no longer has write access to (the referencing
        // is over) will never succeed. 401/403 therefore stay 401/403 — the UI then reads
        // "Vous n'avez pas les droits nécessaires pour cette action."
        if (error.status === 401 || error.status === 403) {
            throw error;
        }
        if (error.status >= 400 && error.status < 500) {
            throw new PortalError(error.message, {
                status: error.status,
                code: 'upload',
                details: { path },
            });
        }
        throw error;
    }

    const text = await response.text();
    if (!text.trim()) {
        return null;
    }
    try {
        return JSON.parse(text);
    }
    catch {
        // Some Alfresco upload endpoints answer with an HTML wrapper.
        return { raw: text.slice(0, 2000) };
    }
}

/**
 * Streams binary content (document, report, thumbnail) straight through to the
 * browser, preserving `Content-Type` and `Content-Disposition`.
 *
 * Nothing is buffered in the portal: a 200 MB technical sheet costs no memory.
 *
 * @param {string} path content webscript, e.g.
 *   `api/node/content/workspace/SpacesStore/<id>/<name>.pdf`
 * @param {Object} [options]
 * @param {Object} [options.query] query parameters
 * @param {string} [options.filename] overrides the download file name
 * @param {boolean} [options.attachment=false] force a download instead of inline
 * @param {Object} [options.session] an already-resolved session
 * @returns {Promise<Response>} a response ready to be returned by a route handler
 *
 * @example
 * export async function GET(request, { params }) {
 *     const { nodeRef, name } = await params;
 *     return streamContent(`api/node/content/${nodeRefToPath(nodeRef)}/${name}`);
 * }
 */
export async function streamContent(path, options = {}) {
    const { query, filename, attachment = false, session, headers, signal } = options;

    const response = await becpgFetch(path, {
        method: 'GET',
        query,
        format: null,
        session,
        signal,
        headers: { Accept: '*/*', ...(headers || {}) },
    });

    if (!response.ok) {
        const message = await readErrorMessage(response);
        throw errorFromStatus(response.status, message, { label: 'becpg', path });
    }

    const outHeaders = filterResponseHeaders(response.headers);
    if (!outHeaders.has('content-type')) {
        outHeaders.set('content-type', 'application/octet-stream');
    }
    if (filename || attachment) {
        const disposition = attachment ? 'attachment' : 'inline';
        outHeaders.set(
            'content-disposition',
            filename
                ? `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`
                : disposition,
        );
    }
    if (!outHeaders.has('cache-control')) {
        outHeaders.set('cache-control', 'private, max-age=0, must-revalidate');
    }

    return new Response(response.body, { status: response.status, headers: outHeaders });
}

/* -------------------------------------------------------------------------- */
/* becpg-ai client                                                             */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Proxy engine                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Keeps only the request headers that are safe and useful upstream.
 *
 * Dropped on purpose: `cookie` (the session cookie must never reach Alfresco),
 * `authorization` (we set our own credential), `host`, `content-length` (the
 * body is re-framed), every hop-by-hop header, and the `x-becpg-*` headers
 * listed in {@link CLIENT_FORBIDDEN_REQUEST_HEADERS} (ticket and instance —
 * those come from the session, never from the browser).
 *
 * @param {Headers} headers incoming request headers
 * @returns {Object} plain header object to forward
 */
export function filterRequestHeaders(headers) {
    const output = {};
    for (const [name, value] of headers.entries()) {
        const lower = name.toLowerCase();
        if (CLIENT_FORBIDDEN_REQUEST_HEADERS.has(lower)) {
            continue;
        }
        if (FORWARDED_REQUEST_HEADERS.has(lower) || lower.startsWith('x-becpg-')) {
            output[name] = value;
        }
    }
    return output;
}

/**
 * Keeps only the response headers that are safe to return.
 *
 * Dropped on purpose: `set-cookie` (an upstream must never set a cookie on the
 * portal's domain), `content-encoding` and `content-length` (fetch already
 * decoded the body, so both would be wrong), and every hop-by-hop header.
 *
 * @param {Headers} headers upstream response headers
 * @returns {Headers} headers to send back
 */
export function filterResponseHeaders(headers) {
    const output = new Headers();
    const encoded = headers.has('content-encoding');
    for (const [name, value] of headers.entries()) {
        const lower = name.toLowerCase();
        if (FORWARDED_RESPONSE_HEADERS.has(lower)) {
            output.set(name, value);
        }
        else if (lower === 'content-length' && !encoded) {
            output.set(name, value);
        }
    }
    return output;
}

/**
 * Copies the incoming query string, stripping anything the client is not
 * allowed to set (a ticket or a token it could try to inject).
 *
 * @param {Request} request
 * @returns {URLSearchParams}
 */
function forwardableSearchParams(request) {
    const params = new URL(request.url).searchParams;
    for (const name of CLIENT_FORBIDDEN_QUERY_PARAMS) {
        params.delete(name);
    }
    return params;
}

/**
 * Reads the request body as something fetch can send, without buffering.
 *
 * @param {Request} request
 * @returns {{ body: *, duplex: string }|{}}
 */
function forwardableBody(request) {
    const method = request.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || !request.body) {
        return {};
    }
    return { body: request.body, duplex: 'half' };
}

/**
 * Second line of defence against allow-list bypass.
 *
 * `joinPathSegments` already refuses `.` / `..` components, so this should
 * never fire. It exists because the failure mode is silent and expensive: the
 * WHATWG `URL` parser resolves `..` on its own, so *any* future change that
 * lets a separator through would re-open a full proxy bypass with no visible
 * symptom. Here we simply check that the URL we are about to call still ends
 * with the exact path the allow-list approved.
 *
 * @param {URL} url the upstream URL, after normalisation by the URL parser
 * @param {string} basePath the target's fixed base (`/alfresco/s/`, `/api/`…)
 * @param {string} path the allow-listed path
 * @param {string} label target name, for the log line
 * @throws {ForbiddenError} when normalisation moved the target
 */
function assertUrlMatchesPath(url, basePath, path, label) {
    let pathname;
    try {
        pathname = decodeURIComponent(url.pathname);
    }
    catch {
        throw new ForbiddenError('This resource is not reachable through the supplier portal');
    }
    if (!pathname.endsWith(`${basePath}${path}`)) {
        logWarn('security.pathNormalized', { target: label, path: String(path).slice(0, 200) });
        throw new ForbiddenError('This resource is not reachable through the supplier portal');
    }
}

/**
 * The generic proxy: session check, allow-list, forward, stream back.
 *
 * @param {Request} request the incoming request
 * @param {Object} target
 * @param {string} target.label short name used in logs
 * @param {string[]|string} target.segments catch-all segments
 * @param {string[]} target.allowList allowed path prefixes
 * @param {string} target.basePath fixed upstream base, checked after normalisation
 * @param {(session: Object, path: string) => URL} target.buildUrl builds the upstream URL
 * @param {(session: Object, url: URL, path: string) => void} [target.finalizeUrl]
 *   applied after the client query string has been merged — this is where the
 *   credential is appended, so a client parameter can never override it
 * @param {(session: Object) => Object} [target.buildHeaders] extra upstream headers
 * @returns {Promise<Response>}
 */
async function proxyRequest(request, target) {
    const method = request.method.toUpperCase();
    if (!PROXY_METHODS.has(method)) {
        throw new BadRequestError(`Method ${method} is not proxied`);
    }

    const session = await requireSession();
    const path = joinPathSegments(target.segments);
    assertAllowedPath(path, target.allowList, target.label);

    const url = target.buildUrl(session, path);
    assertUrlMatchesPath(url, target.basePath, path, target.label);

    for (const [name, value] of forwardableSearchParams(request)) {
        url.searchParams.append(name, value);
    }
    if (typeof target.finalizeUrl === 'function') {
        target.finalizeUrl(session, url, path);
    }

    const startedAt = Date.now();
    const response = await httpFetch(url, {
        method,
        headers: {
            ...filterRequestHeaders(request.headers),
            ...(target.buildHeaders ? target.buildHeaders(session) : {}),
        },
        ...forwardableBody(request),
        label: target.label,
    });

    logDebug('proxy.forwarded', {
        target: target.label,
        method,
        path,
        status: response.status,
        duration: Date.now() - startedAt,
        url: redactUrl(url),
    });

    // 204 and 304 must not carry a body.
    const body = response.status === 204 || response.status === 304 ? null : response.body;
    const headers = filterResponseHeaders(response.headers);
    if (!headers.has('cache-control')) {
        headers.set('cache-control', 'private, no-store');
    }
    return new Response(body, { status: response.status, headers });
}

/**
 * Proxies `/api/v1/becpg/**` onto `<becpgUrl>/alfresco/s/**`.
 *
 * Adds the session ticket, enforces {@link ALLOWED_BECPG_PATH_PREFIXES}, and
 * defaults `format=json` on everything but content endpoints.
 *
 * @param {Request} request
 * @param {string[]} segments the catch-all segments
 * @returns {Promise<Response>}
 */
export function proxyToBecpg(request, segments) {
    return proxyRequest(request, {
        label: 'becpg',
        segments,
        allowList: ALLOWED_BECPG_PATH_PREFIXES,
        basePath: BECPG_WEBSCRIPT_BASE,
        buildUrl: (session, path) => new URL(
            `${resolveBecpgBaseUrl(session)}${BECPG_WEBSCRIPT_BASE}${path}`,
        ),
        finalizeUrl: (session, url, path) => {
            if (!url.searchParams.has('format') && !CONTENT_PATH_PATTERN.test(path)) {
                url.searchParams.set('format', 'json');
            }
            url.searchParams.set('alf_ticket', requireTicket(session));
        },
    });
}

/**
 * Proxies `/api/v1/share/**` onto `<becpgUrl>/share/**`.
 *
 * Last resort only — see the route handler for the rationale.
 *
 * @param {Request} request
 * @param {string[]} segments the catch-all segments
 * @returns {Promise<Response>}
 */
export function proxyToShare(request, segments) {
    return proxyRequest(request, {
        label: 'share',
        segments,
        allowList: ALLOWED_SHARE_PATH_PREFIXES,
        basePath: SHARE_BASE,
        buildUrl: (session, path) => new URL(`${resolveShareBaseUrl(session)}${SHARE_BASE}${path}`),
        finalizeUrl: (session, url) => {
            // `portalTicket`, not `alf_ticket`: Share consumes `alf_ticket` in its own
            // authentication layer and the webscript never sees it. The endpoint forwards
            // this one to the repository through the identity-less `alfresco-noauth`
            // connector, so /becpg/form runs as the supplier
            // (doc/becpg-api-contracts.md §8).
            url.searchParams.set('portalTicket', requireTicket(session));
        },
    });
}
