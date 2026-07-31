/**
 * Tenant resolution (spec §5.3).
 *
 * One Keycloak realm per tenant, one beCPG instance per tenant. The tenant is
 * resolved from the incoming request, by order of priority:
 *
 *   1. sub-domain          https://<tenant>.portail.becpg.fr/...
 *   2. path prefix         /t/<tenant>/...
 *   3. explicit selection  the `becpg_portal_tenant` cookie set by /login
 *   4. DEFAULT_TENANT      (or the single-tenant fallback below)
 *
 * Configuration comes from the environment, as a JSON map:
 *
 *   BECPG_TENANTS={"demo":{"realm":"demo","label":"beCPG Demo",
 *                          "logo":"/theme/default/images/logo.png",
 *                          "becpgUrl":"https://demo.becpg.fr","isTest":true}}
 *
 * `TENANT_MAP` is accepted as an alias (that is the name used in env.example).
 * When neither is set the module falls back to a single tenant built from
 * BECPG_URL / BECPG_INSTANCE, which is what a mono-instance deployment (and
 * local development against dev.becpg.fr) needs.
 *
 * This module is edge-safe: no node-only API, only `process.env`, `URL` and
 * plain string work — `proxy.js` imports it.
 */

/** Cookie holding the tenant explicitly chosen on /login. */
export const TENANT_COOKIE = 'becpg_portal_tenant';

/** Legacy / short cookie name also honoured on read (spec wording: "cookie tenant"). */
const TENANT_COOKIE_LEGACY = 'tenant';

/** `/t/<tenant>/rest/of/path` — the tenant path prefix. */
const TENANT_PATH_RE = /^\/t\/([A-Za-z0-9][A-Za-z0-9._-]*)(?=\/|$)/;

/** A tenant id is a realm-ish slug; anything else is rejected outright. */
const TENANT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/** Hosts that never carry a meaningful tenant sub-domain. */
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

let cachedTenants = null;
let cachedTenantsSource = null;

function env(name, fallback = '') {
    const value = process.env[name];
    return value === undefined || value === null || value === '' ? fallback : value;
}

function toBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

/** Strips a trailing slash so `${becpgUrl}/alfresco/...` never doubles it. */
function normalizeUrl(url) {
    const value = String(url || '').trim();
    return value.endsWith('/') ? value.slice(0, -1) : value;
}

function portalTestMode() {
    return toBoolean(process.env.PORTAL_TEST_MODE, false);
}

/**
 * Normalises one raw entry of the tenant map into the internal tenant shape.
 *
 * @param {string} id tenant identifier (map key)
 * @param {Object} raw raw JSON entry
 * @returns {{id: string, realm: string, label: string, logoUrl: string, becpgUrl: string, becpgInstance: string, isTest: boolean}}
 */
function normalizeTenant(id, raw = {}) {
    return {
        id,
        realm: raw.realm || id,
        label: raw.label || id,
        logoUrl: raw.logoUrl || raw.logo || '/theme/default/images/logo.png',
        becpgUrl: normalizeUrl(raw.becpgUrl || raw.url || env('BECPG_URL')),
        becpgInstance: raw.becpgInstance || raw.instance || id,
        isTest: raw.isTest === undefined ? portalTestMode() : toBoolean(raw.isTest, false),
    };
}

/**
 * Builds the single-tenant fallback from BECPG_URL / BECPG_INSTANCE.
 * Used when no tenant map is configured at all.
 *
 * @returns {Object} a one-entry tenant map
 */
function singleTenantFallback() {
    const id = env('BECPG_INSTANCE', env('DEFAULT_TENANT', 'default'));
    return {
        [id]: normalizeTenant(id, {
            realm: env('OIDC_REALM', id),
            label: env('BECPG_INSTANCE_LABEL', id),
            becpgUrl: env('BECPG_URL'),
            becpgInstance: id,
        }),
    };
}

/**
 * Parses (and memoises) the tenant map from the environment.
 * Re-parses automatically when the env value changes (dev hot reload).
 *
 * @returns {Object.<string, Object>} tenants indexed by id
 */
function loadTenants() {
    const source = env('BECPG_TENANTS', env('TENANT_MAP', ''));
    if (cachedTenants && cachedTenantsSource === source) {
        return cachedTenants;
    }

    let tenants = null;
    if (source) {
        try {
            const parsed = JSON.parse(source);
            tenants = {};
            Object.keys(parsed).forEach((id) => {
                if (TENANT_ID_RE.test(id)) {
                    tenants[id] = normalizeTenant(id, parsed[id]);
                }
            });
            if (Object.keys(tenants).length === 0) {
                tenants = null;
            }
        } catch (error) {
            // Never take the whole app down for a malformed map: log and degrade
            // to the single-tenant fallback.
            console.error('[tenant] invalid BECPG_TENANTS/TENANT_MAP JSON:', error.message);
            tenants = null;
        }
    }

    cachedTenants = tenants || singleTenantFallback();
    cachedTenantsSource = source;
    return cachedTenants;
}

/**
 * @returns {string} the default tenant id (DEFAULT_TENANT, or the first configured one)
 */
export function defaultTenantId() {
    const tenants = loadTenants();
    const configured = env('DEFAULT_TENANT');
    if (configured && tenants[configured]) {
        return configured;
    }
    return Object.keys(tenants)[0];
}

/**
 * Looks a tenant up by id.
 *
 * @param {string} id tenant identifier
 * @returns {Object|null} the tenant, or null when unknown
 */
export function getTenant(id) {
    if (!id || !TENANT_ID_RE.test(id)) {
        return null;
    }
    return loadTenants()[id] || null;
}

/**
 * Public tenant list, for the /login selector. Never exposes `becpgUrl` or the
 * realm — the browser has no business knowing where the back end lives.
 *
 * @returns {Array<{id: string, label: string, logoUrl: string, isTest: boolean}>}
 */
export function listTenants() {
    const tenants = loadTenants();
    return Object.keys(tenants)
        .sort()
        .map((id) => ({
            id: tenants[id].id,
            label: tenants[id].label,
            logoUrl: tenants[id].logoUrl,
            isTest: tenants[id].isTest,
        }));
}

/**
 * Public projection of a resolved tenant (safe to serialise to the client).
 *
 * @param {Object} tenant resolved tenant
 * @returns {{id: string, label: string, logoUrl: string, isTest: boolean}|null}
 */
export function toPublicTenant(tenant) {
    if (!tenant) {
        return null;
    }
    return {
        id: tenant.id,
        label: tenant.label,
        logoUrl: tenant.logoUrl,
        isTest: tenant.isTest,
    };
}

/**
 * Extracts the `/t/<tenant>` prefix from a pathname.
 *
 * @param {string} pathname request pathname
 * @returns {{tenantId: string|null, pathname: string, prefix: string}}
 */
export function stripTenantPrefix(pathname) {
    const match = TENANT_PATH_RE.exec(pathname || '');
    if (!match) {
        return { tenantId: null, pathname: pathname || '/', prefix: '' };
    }
    const rest = pathname.slice(match[0].length) || '/';
    return {
        tenantId: match[1],
        pathname: rest.startsWith('/') ? rest : `/${rest}`,
        prefix: match[0],
    };
}

/**
 * Re-applies a tenant path prefix to a path.
 *
 * @param {string} prefix prefix returned by stripTenantPrefix (may be '')
 * @param {string} pathname path to prefix
 * @returns {string}
 */
export function withTenantPrefix(prefix, pathname) {
    if (!prefix) {
        return pathname;
    }
    return `${prefix}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

/**
 * Reads a cookie from a NextRequest or a plain Request.
 *
 * @param {Request} request incoming request
 * @param {string} name cookie name
 * @returns {string|null}
 */
export function readRequestCookie(request, name) {
    if (!request) {
        return null;
    }
    if (request.cookies && typeof request.cookies.get === 'function') {
        const entry = request.cookies.get(name);
        if (entry) {
            return typeof entry === 'string' ? entry : entry.value;
        }
        return null;
    }
    const header = request.headers && typeof request.headers.get === 'function'
        ? request.headers.get('cookie')
        : null;
    if (!header) {
        return null;
    }
    const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Host of the request, honouring the reverse proxy headers.
 *
 * @param {Request} request incoming request
 * @returns {string} lower-cased host without the port
 */
export function requestHost(request) {
    const headers = request && request.headers;
    const raw = (headers && (headers.get('x-forwarded-host') || headers.get('host')))
        || (request && request.url ? new URL(request.url).host : '');
    return String(raw || '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
}

/**
 * Derives a tenant id from the host name.
 *
 * With TENANT_HOST_SUFFIX=".portail.becpg.fr", `demo.portail.becpg.fr` → `demo`.
 * Without a suffix configured, the first label is used when the host has more
 * than two labels (so `demo.becpg.fr` → `demo`, but `becpg.fr` → null).
 *
 * @param {string} host lower-cased host
 * @returns {string|null}
 */
export function tenantIdFromHost(host) {
    if (!host || LOCAL_HOSTS.includes(host)) {
        return null;
    }
    const suffix = env('TENANT_HOST_SUFFIX');
    if (suffix) {
        const normalized = suffix.startsWith('.') ? suffix : `.${suffix}`;
        if (host.endsWith(normalized)) {
            const candidate = host.slice(0, -normalized.length);
            return candidate && !candidate.includes('.') && TENANT_ID_RE.test(candidate)
                ? candidate
                : null;
        }
        return null;
    }
    const labels = host.split('.');
    if (labels.length < 3) {
        return null;
    }
    const candidate = labels[0];
    if (candidate === 'www' || !TENANT_ID_RE.test(candidate)) {
        return null;
    }
    return candidate;
}

/**
 * Resolves the tenant of a request (spec §5.3).
 *
 * @param {Request} request incoming request (NextRequest or plain Request)
 * @param {{override?: string}} [options] `override` wins over everything, used by
 *        /api/auth/login when the user picks a tenant in the selector
 * @returns {{id: string, becpgUrl: string, label: string, logoUrl: string, isTest: boolean,
 *            realm: string, becpgInstance: string, source: string}}
 */
export function resolveTenant(request, options = {}) {
    const candidates = [];

    if (options.override) {
        candidates.push(['explicit', options.override]);
    }

    const host = requestHost(request);
    const fromHost = tenantIdFromHost(host);
    if (fromHost) {
        candidates.push(['subdomain', fromHost]);
    }

    let pathname = '/';
    try {
        pathname = request && request.nextUrl ? request.nextUrl.pathname : new URL(request.url).pathname;
    } catch {
        pathname = '/';
    }
    const { tenantId: fromPath } = stripTenantPrefix(pathname);
    if (fromPath) {
        candidates.push(['path', fromPath]);
    }

    const fromCookie = readRequestCookie(request, TENANT_COOKIE)
        || readRequestCookie(request, TENANT_COOKIE_LEGACY);
    if (fromCookie) {
        candidates.push(['cookie', fromCookie]);
    }

    candidates.push(['default', defaultTenantId()]);

    for (const [source, id] of candidates) {
        const tenant = getTenant(id);
        if (tenant) {
            return { ...tenant, source };
        }
    }

    // Unreachable in practice (the default always resolves), but never return
    // undefined to a caller that is about to read `.becpgUrl`.
    const fallbackId = defaultTenantId();
    return { ...normalizeTenant(fallbackId, {}), source: 'fallback' };
}

/**
 * Cookie options for the tenant preference cookie (readable by the client is
 * fine — it holds no secret — but we keep it httpOnly anyway since only the
 * server needs it).
 *
 * @returns {Object} cookie options
 */
export function tenantCookieOptions() {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: toBoolean(process.env.SESSION_COOKIE_SECURE, process.env.NODE_ENV === 'production'),
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
    };
}
