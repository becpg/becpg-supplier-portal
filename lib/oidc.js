/**
 * OIDC authorization-code flow with PKCE, and the beCPG token → Alfresco ticket
 * exchange (spec §5.3, §6).
 *
 * Everything here runs **server side only**: the route handlers under
 * `app/api/auth/*` are the only callers. Neither the OIDC tokens nor the
 * Alfresco ticket ever reach the browser.
 *
 * IDS layout (verified on dev, cf. becpg-ai/doc/authentication_fr.md):
 *   issuer   <OIDC_ISSUER_BASE>/realms/<tenant realm>   (one realm per tenant)
 *   client   OIDC_CLIENT_ID (+ OIDC_CLIENT_SECRET when confidential)
 *   claims   becpg_url + becpg_instance, mandatory — missing ⇒ 401
 *
 * Token → ticket: beCPG Share does a `GET <becpgUrl>/alfresco/api/-default-/public/
 * authentication/versions/1/tickets/-me-` with the bearer token
 * (`BeCPGAIMSFilter.getAlfTicket`). We do exactly the same, with a POST on
 * `/tickets` as a fallback for older repositories.
 *
 * Edge-safe: WebCrypto + fetch only, no node built-ins.
 */

import { decodeJwt } from 'jose';
import { ticketAuthorizationValue } from '@/lib/http';

/** Discovery documents, cached in module scope per issuer. */
const metadataCache = new Map();

/** Discovery cache TTL (ms). */
const METADATA_TTL = 60 * 60 * 1000;

/** Base error for everything auth-related; carries an HTTP status and a stable code. */
export class OidcError extends Error {
    constructor(message, { code = 'oidc_error', status = 502, cause } = {}) {
        super(message);
        this.name = 'OidcError';
        this.code = code;
        this.status = status;
        if (cause) {
            this.cause = cause;
        }
    }
}

/** The JWT carries no `becpg_url` / `becpg_instance` claim ⇒ 401 (spec §5.3). */
export class MissingTenantClaimError extends OidcError {
    constructor(claim) {
        super(`Missing mandatory tenant claim "${claim}" in the JWT`, {
            code: 'missing_tenant_claim',
            status: 401,
        });
        this.name = 'MissingTenantClaimError';
        this.claim = claim;
    }
}

/** The token is past its `exp` (clock tolerance applied). */
export class TokenExpiredError extends OidcError {
    constructor(message = 'Token expired') {
        super(message, { code: 'token_expired', status: 401 });
        this.name = 'TokenExpiredError';
    }
}

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

function trimSlash(url) {
    const value = String(url || '').trim();
    return value.endsWith('/') ? value.slice(0, -1) : value;
}

/** Abort signal helper (AbortSignal.timeout is not guaranteed on every runtime). */
function timeoutSignal(ms) {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        return AbortSignal.timeout(ms);
    }
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
}

function requestTimeout() {
    return Number(env('BECPG_TIMEOUT', '30000')) || 30000;
}

function clockTolerance() {
    return Number(env('OIDC_CLOCK_TOLERANCE', '30')) || 30;
}

function toBase64Url(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomBytes(length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
}

/**
 * @param {number} [length] number of random bytes
 * @returns {string} url-safe random string (state, nonce, …)
 */
export function randomToken(length = 32) {
    return toBase64Url(randomBytes(length));
}

/**
 * @returns {string} a PKCE code verifier (43..128 url-safe chars)
 */
export function generateCodeVerifier() {
    return toBase64Url(randomBytes(48));
}

/**
 * @param {string} verifier PKCE code verifier
 * @returns {Promise<string>} the S256 code challenge
 */
export async function generateCodeChallenge(verifier) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return toBase64Url(new Uint8Array(digest));
}

/**
 * Issuer URL of a tenant: one realm per tenant.
 *
 * @param {Object} tenant resolved tenant (see lib/tenant.js)
 * @returns {string} `<OIDC_ISSUER_BASE>/realms/<realm>`
 */
export function issuerUrl(tenant) {
    const explicit = env('OIDC_ISSUER');
    if (explicit) {
        return trimSlash(explicit);
    }
    const base = trimSlash(env('OIDC_ISSUER_BASE'));
    if (!base) {
        throw new OidcError('OIDC_ISSUER_BASE is not configured', {
            code: 'oidc_not_configured',
            status: 500,
        });
    }
    const realm = (tenant && (tenant.realm || tenant.id)) || env('OIDC_REALM');
    if (!realm) {
        throw new OidcError('No Keycloak realm for this tenant', {
            code: 'oidc_not_configured',
            status: 500,
        });
    }
    return `${base}/realms/${realm}`;
}

/**
 * The OIDC client id **of this tenant**.
 *
 * ## Why it is per tenant and not one global value
 *
 * becpg-ai reads the target instance from the *token*, not from a header:
 * `AiContextProvider.getMcpContext()` documents the contract as
 * `becpg_instance` (instance name) and `becpg_url` (its URL). Those claims have
 * to be **hard-coded on the client**, because they describe an instance and not
 * a person — a user attribute would put the burden on every account and break
 * the day someone works on two instances.
 *
 * A hard-coded claim means one client per instance, hence the convention
 * `<instance>-supplier-portal`, mirroring `<instance>-openid` which Alfresco
 * already uses (`identity-service.resource`). And since a single realm can
 * serve several instances — `dev` serves both `dev` and `qa` — a global client
 * id would send the *same* `becpg_instance` for every tenant of that realm, so
 * a QA user's suggestions would be computed against dev. That is the bug this
 * function exists to prevent.
 *
 * `clientId` therefore comes from the tenant (`TENANT_MAP`), and
 * `OIDC_CLIENT_ID` remains as the fallback for a single-tenant deployment.
 *
 * @param {Object} [tenant] resolved tenant
 * @returns {string} the client id to present to Keycloak
 */
export function clientId(tenant) {
    return (tenant && tenant.clientId) || env('OIDC_CLIENT_ID');
}

/**
 * True when a real OIDC client is configured. When false the portal can only
 * run with DEV_FAKE_AUTH (see app/api/auth/login/route.js).
 *
 * @returns {boolean}
 */
export function isOidcConfigured() {
    // The client id is no longer required here: `lib/tenant.js` derives one per
    // tenant from the instance name (`<instance>-supplier-portal`), so a
    // multi-tenant deployment configures no global `OIDC_CLIENT_ID` at all.
    // Requiring it would have reported "OIDC not configured" on exactly the
    // deployments this convention is for.
    return Boolean(env('OIDC_ISSUER_BASE') || env('OIDC_ISSUER'));
}

/**
 * Fetches (and caches per issuer) the OIDC discovery document.
 *
 * @param {Object} tenant resolved tenant
 * @returns {Promise<Object>} the provider metadata
 */
export async function discover(tenant) {
    const issuer = issuerUrl(tenant);
    const cached = metadataCache.get(issuer);
    if (cached && Date.now() - cached.fetchedAt < METADATA_TTL) {
        return cached.metadata;
    }

    const url = `${issuer}/.well-known/openid-configuration`;
    let response;
    try {
        response = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal: timeoutSignal(requestTimeout()),
            cache: 'no-store',
        });
    } catch (error) {
        throw new OidcError(`OIDC discovery failed for ${issuer}`, {
            code: 'discovery_unreachable',
            cause: error,
        });
    }
    if (!response.ok) {
        throw new OidcError(`OIDC discovery returned ${response.status} for ${issuer}`, {
            code: 'discovery_failed',
        });
    }

    const metadata = await response.json();
    metadataCache.set(issuer, { metadata, fetchedAt: Date.now() });
    return metadata;
}

/** Drops the cached discovery document (used by tests and on hard failures). */
export function clearDiscoveryCache() {
    metadataCache.clear();
}

/**
 * Builds the IdP authorization URL (code flow + PKCE + nonce).
 *
 * @param {Object} tenant resolved tenant
 * @param {Object} params flow parameters
 * @param {string} params.redirectUri callback URL registered on the client
 * @param {string} params.state opaque state, echoed back on the callback
 * @param {string} params.codeChallenge S256 challenge
 * @param {string} [params.nonce] ID token nonce
 * @param {string} [params.locale] ui_locales hint
 * @param {string} [params.loginHint] login_hint
 * @param {string} [params.prompt] prompt (e.g. 'login')
 * @returns {Promise<string>} the absolute URL to redirect the browser to
 */
export async function buildAuthorizationUrl(tenant, params) {
    const metadata = await discover(tenant);
    const endpoint = metadata.authorization_endpoint;
    if (!endpoint) {
        throw new OidcError('No authorization_endpoint in the discovery document', {
            code: 'discovery_incomplete',
        });
    }

    const url = new URL(endpoint);
    url.searchParams.set('client_id', clientId(tenant));
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', env('OIDC_SCOPES', 'openid profile email'));
    url.searchParams.set('state', params.state);
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    if (params.nonce) {
        url.searchParams.set('nonce', params.nonce);
    }
    if (params.locale) {
        url.searchParams.set('ui_locales', params.locale);
    }
    if (params.loginHint) {
        url.searchParams.set('login_hint', params.loginHint);
    }
    if (params.prompt) {
        url.searchParams.set('prompt', params.prompt);
    }
    return url.toString();
}

/**
 * Posts to the token endpoint. Uses client_secret_post when a secret is
 * configured (confidential client), plain PKCE otherwise (public client).
 *
 * @param {Object} tenant resolved tenant
 * @param {Object} body form parameters
 * @returns {Promise<Object>} the token response
 */
async function postToken(tenant, body) {
    const metadata = await discover(tenant);
    const endpoint = metadata.token_endpoint;
    if (!endpoint) {
        throw new OidcError('No token_endpoint in the discovery document', {
            code: 'discovery_incomplete',
        });
    }

    const form = new URLSearchParams(body);
    form.set('client_id', clientId(tenant));
    const secret = env('OIDC_CLIENT_SECRET');
    if (secret) {
        form.set('client_secret', secret);
    }

    let response;
    try {
        response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            body: form.toString(),
            signal: timeoutSignal(requestTimeout()),
            cache: 'no-store',
        });
    } catch (error) {
        throw new OidcError('Token endpoint unreachable', {
            code: 'token_unreachable',
            cause: error,
        });
    }

    const text = await response.text();
    let payload = null;
    try {
        payload = text ? JSON.parse(text) : null;
    } catch {
        payload = null;
    }

    if (!response.ok) {
        const detail = payload && (payload.error_description || payload.error);
        throw new OidcError(`Token request failed (${response.status})${detail ? `: ${detail}` : ''}`, {
            code: (payload && payload.error) || 'token_request_failed',
            status: response.status === 400 || response.status === 401 ? 401 : 502,
        });
    }
    if (!payload || !payload.access_token) {
        throw new OidcError('Token response carries no access_token', {
            code: 'token_response_invalid',
        });
    }
    return payload;
}

/**
 * Exchanges an authorization code for tokens.
 *
 * @param {Object} tenant resolved tenant
 * @param {{code: string, codeVerifier: string, redirectUri: string}} params callback params
 * @returns {Promise<Object>} `{ access_token, refresh_token, id_token, expires_in, … }`
 */
export function exchangeCode(tenant, { code, codeVerifier, redirectUri }) {
    return postToken(tenant, {
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
    });
}

/**
 * Refreshes an expired access token.
 *
 * @param {Object} tenant resolved tenant
 * @param {string} refreshToken the refresh token
 * @returns {Promise<Object>} the token response
 */
export function refreshTokens(tenant, refreshToken) {
    return postToken(tenant, {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
    });
}

/**
 * Revokes the refresh token at the IdP (best effort, never throws).
 *
 * @param {Object} tenant resolved tenant
 * @param {string} refreshToken the refresh token
 * @returns {Promise<void>}
 */
export async function revokeToken(tenant, refreshToken) {
    if (!refreshToken) {
        return;
    }
    try {
        const metadata = await discover(tenant);
        if (!metadata.revocation_endpoint) {
            return;
        }
        const form = new URLSearchParams({
            token: refreshToken,
            token_type_hint: 'refresh_token',
            client_id: clientId(tenant),
        });
        const secret = env('OIDC_CLIENT_SECRET');
        if (secret) {
            form.set('client_secret', secret);
        }
        await fetch(metadata.revocation_endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: form.toString(),
            signal: timeoutSignal(requestTimeout()),
            cache: 'no-store',
        });
    } catch (error) {
        console.warn('[oidc] token revocation failed:', error.message);
    }
}

/**
 * Per-issuer verdict on `post_logout_redirect_uri`: `true` accepted, `false`
 * refused. Keyed by `<issuer>|<uri>` — a realm can allow one URI and not another.
 */
const postLogoutSupport = new Map();

/**
 * Does the IdP accept this `post_logout_redirect_uri`?
 *
 * **Why this has to be asked.** RP-initiated logout requires the URI to be
 * registered on the client, and discovery advertises **nothing** about it: there
 * is no `post_logout_redirect_uris_supported` metadata to read. So the only way
 * to know is to ask, and the cost of not asking is a dead sign-out — the IdP
 * answers with *its own* error page and the portal never gets the request back
 * to degrade on.
 *
 * Measured on an Alfresco Identity Service realm, 2026-08-06:
 *
 * ```
 * .../logout?client_id=dev-supplier-portal&post_logout_redirect_uri=…/login
 *     → 400  "Invalid redirect uri"
 * .../logout?client_id=dev-supplier-portal&post_logout_redirect_uri=…/api/auth/callback
 *     → 400  "Invalid redirect uri"        (registered as a *redirect* URI — that list is not this one)
 * .../logout?client_id=dev-supplier-portal
 *     → 200  the IdP's own sign-out page
 * ```
 *
 * i.e. the client's *Valid post logout redirect URIs* is empty, and **every**
 * sign-out from the portal landed on a Keycloak error page. The real repair is
 * one Keycloak field (set it to `+`, which means "the same as the redirect
 * URIs"), but a portal serving some thirty instances cannot make its sign-out
 * depend on a setting it does not own.
 *
 * The probe is a plain GET with no `id_token_hint` and no browser cookie, so it
 * ends no session: Keycloak validates the parameters and stops there. It runs at
 * most once per issuer and URI, and a network failure is treated as *accepted*
 * — the redirect is the better experience, and a wrong guess costs the same page
 * the user gets today.
 *
 * `OIDC_POST_LOGOUT_REDIRECT` overrides it: `off` never sends the parameter,
 * `on` always does (skip the probe), `auto` (default) probes.
 *
 * @param {Object} tenant resolved tenant
 * @param {string} endSessionEndpoint
 * @param {string} uri candidate post-logout redirect
 * @returns {Promise<boolean>}
 */
async function acceptsPostLogoutRedirect(tenant, endSessionEndpoint, uri) {
    const mode = String(env('OIDC_POST_LOGOUT_REDIRECT', 'auto')).toLowerCase();
    if (mode === 'off' || mode === 'false' || mode === '0') {
        return false;
    }
    if (mode === 'on' || mode === 'true' || mode === '1') {
        return true;
    }

    const key = `${endSessionEndpoint}|${uri}`;
    if (postLogoutSupport.has(key)) {
        return postLogoutSupport.get(key);
    }

    const probe = new URL(endSessionEndpoint);
    probe.searchParams.set('client_id', clientId(tenant));
    probe.searchParams.set('post_logout_redirect_uri', uri);

    let accepted = true;
    try {
        const response = await fetch(probe.toString(), {
            redirect: 'manual',
            signal: timeoutSignal(requestTimeout()),
            cache: 'no-store',
        });
        // 400 is the refusal; a 3xx or a 200 both mean the parameter passed
        // validation. Anything else (5xx, a gateway hiccup) is not an answer
        // about the URI, so it does not become one.
        accepted = response.status !== 400;
        if (!accepted) {
            console.warn(
                `[oidc] ${endSessionEndpoint} refuses post_logout_redirect_uri=${uri}. `
                + 'Signing out will land on the identity provider\'s own page instead of the portal. '
                + 'Fix: add it to the client\'s "Valid post logout redirect URIs" (Keycloak accepts "+" '
                + 'to reuse the redirect URIs).',
            );
        }
    } catch (error) {
        console.warn('[oidc] post-logout probe failed, keeping the redirect:', error.message);
        accepted = true;
    }

    postLogoutSupport.set(key, accepted);
    return accepted;
}

/**
 * Builds the RP-initiated logout URL.
 *
 * The `post_logout_redirect_uri` is only attached when the IdP accepts it — see
 * {@link acceptsPostLogoutRedirect}. Dropped, the user still signs out; they land
 * on the IdP's sign-out page rather than back on `/login`, which is a worse
 * ending than intended and a much better one than an error page.
 *
 * @param {Object} tenant resolved tenant
 * @param {{idToken?: string, postLogoutRedirectUri?: string}} params logout params
 * @returns {Promise<string|null>} the end_session URL, or null when unsupported
 */
export async function buildEndSessionUrl(tenant, { idToken, postLogoutRedirectUri } = {}) {
    let metadata;
    try {
        metadata = await discover(tenant);
    } catch (error) {
        console.warn('[oidc] end_session discovery failed:', error.message);
        return null;
    }
    if (!metadata.end_session_endpoint) {
        return null;
    }
    const url = new URL(metadata.end_session_endpoint);
    url.searchParams.set('client_id', clientId(tenant));
    if (idToken) {
        url.searchParams.set('id_token_hint', idToken);
    }
    if (postLogoutRedirectUri
        && await acceptsPostLogoutRedirect(tenant, metadata.end_session_endpoint, postLogoutRedirectUri)) {
        url.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri);
    }
    return url.toString();
}

/**
 * Decodes a JWT and checks its expiry. **No signature verification**: the token
 * is only ever forwarded to beCPG, which validates it against the realm keys.
 * We never grant anything on the strength of this decode alone.
 *
 * @param {string} token compact JWT
 * @param {{ignoreExpiration?: boolean}} [options] options
 * @returns {Object} the claims
 */
function decodeAndCheck(token, { ignoreExpiration = false } = {}) {
    if (!token) {
        throw new OidcError('No token to decode', { code: 'token_missing', status: 401 });
    }
    let claims;
    try {
        claims = decodeJwt(token);
    } catch (error) {
        throw new OidcError('Malformed JWT', { code: 'token_malformed', status: 401, cause: error });
    }
    if (!ignoreExpiration && typeof claims.exp === 'number') {
        const now = Math.floor(Date.now() / 1000);
        if (claims.exp + clockTolerance() < now) {
            throw new TokenExpiredError();
        }
    }
    return claims;
}

/**
 * Decodes the ID token (profile information).
 *
 * @param {string} idToken compact JWT
 * @param {{ignoreExpiration?: boolean}} [options] options
 * @returns {Object} the claims
 */
export function decodeIdToken(idToken, options = {}) {
    return decodeAndCheck(idToken, options);
}

/**
 * Decodes the access token and enforces the mandatory tenant claims
 * `becpg_url` / `becpg_instance` (spec §5.3 — a token without them is a 401).
 *
 * @param {string} accessToken compact JWT
 * @param {{requireTenantClaims?: boolean, ignoreExpiration?: boolean}} [options] options
 * @returns {Object} the claims
 * @throws {MissingTenantClaimError} when a mandatory claim is absent
 */
export function decodeAccessToken(accessToken, options = {}) {
    const { requireTenantClaims = true, ...rest } = options;
    const claims = decodeAndCheck(accessToken, rest);
    if (requireTenantClaims) {
        if (!claims.becpg_url) {
            throw new MissingTenantClaimError('becpg_url');
        }
        if (!claims.becpg_instance) {
            throw new MissingTenantClaimError('becpg_instance');
        }
    }
    return claims;
}

/**
 * Extracts a display name / email / login out of OIDC claims.
 *
 * @param {Object} claims merged ID + access token claims
 * @returns {{sub: string, name: string, email: string, username: string}}
 */
export function claimsToProfile(claims = {}) {
    return {
        sub: claims.sub || claims.preferred_username || '',
        name: claims.name
            || [claims.given_name, claims.family_name].filter(Boolean).join(' ')
            || claims.preferred_username
            || claims.email
            || '',
        email: claims.email || '',
        username: claims.preferred_username || claims.email || claims.sub || '',
    };
}

/**
 * Static ticket mode: `BECPG_TICKET` + `X-BecPG-Instance` headers, the
 * alternative to OAuth2 documented in becpg-ai/doc/authentication_fr.md.
 * Reserved for internal integrations and local development, hence the flag.
 *
 * @returns {{enabled: boolean, ticket: string, instance: string}}
 */
export function staticTicketMode() {
    const ticket = env('BECPG_TICKET');
    const enabled = Boolean(ticket) && toBoolean(env('BECPG_TICKET_MODE', ticket ? 'true' : 'false'));
    return {
        enabled,
        ticket,
        instance: env('BECPG_INSTANCE', env('DEFAULT_TENANT', '')),
    };
}

/**
 * Headers carrying the alternative ticket authentication, for the proxy layer.
 *
 * @param {string} ticket Alfresco ticket
 * @param {string} instance beCPG instance id
 * @returns {Object} headers
 */
export function ticketHeaders(ticket, instance) {
    const headers = {};
    if (ticket) {
        headers.BECPG_TICKET = ticket;
    }
    if (instance) {
        headers['X-BecPG-Instance'] = instance;
    }
    return headers;
}

/**
 * Default lifetime (seconds) we assume for an Alfresco ticket. Alfresco does
 * not tell us, so we simply re-exchange before that horizon.
 *
 * @returns {number} seconds
 */
export function ticketTtl() {
    return Number(env('BECPG_TICKET_TTL', '3600')) || 3600;
}

/**
 * Exchanges an OIDC access token for an Alfresco ticket, kept server-side.
 *
 * Primary call is the one beCPG Share itself makes
 * (`GET .../tickets/-me-`, cf. `BeCPGAIMSFilter.getAlfTicket`); the POST on
 * `/tickets` is a fallback for repositories that do not expose `-me-`.
 *
 * When BECPG_TICKET mode is enabled the configured ticket is returned as-is and
 * no call is made at all.
 *
 * @param {string} becpgUrl base URL of the beCPG instance
 * @param {string} accessToken OIDC access token
 * @returns {Promise<{ticket: string, expiresAt: number}>}
 */
export async function exchangeTokenForTicket(becpgUrl, accessToken) {
    const staticMode = staticTicketMode();
    if (staticMode.enabled) {
        return { ticket: staticMode.ticket, expiresAt: Date.now() + ticketTtl() * 1000 };
    }

    const base = trimSlash(becpgUrl);
    if (!base) {
        throw new OidcError('No beCPG URL for this tenant', {
            code: 'becpg_url_missing',
            status: 500,
        });
    }
    const apiBase = `${base}/alfresco/api/-default-/public/authentication/versions/1/tickets`;
    const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
    };

    const attempts = [
        { url: `${apiBase}/-me-?noCache=${randomToken(8)}`, init: { method: 'GET', headers } },
        { url: apiBase, init: { method: 'POST', headers, body: '{}' } },
    ];

    let lastStatus = 0;
    for (const attempt of attempts) {
        let response;
        try {
            response = await fetch(attempt.url, {
                ...attempt.init,
                signal: timeoutSignal(requestTimeout()),
                cache: 'no-store',
            });
        } catch (error) {
            throw new OidcError('beCPG is unreachable for the ticket exchange', {
                code: 'becpg_unreachable',
                cause: error,
            });
        }
        if (response.ok) {
            const payload = await response.json();
            const ticket = payload && payload.entry && payload.entry.id;
            if (!ticket) {
                throw new OidcError('beCPG returned no Alfresco ticket', {
                    code: 'ticket_missing',
                });
            }
            return { ticket, expiresAt: Date.now() + ticketTtl() * 1000 };
        }
        lastStatus = response.status;
        if (response.status === 401 || response.status === 403) {
            throw new OidcError('beCPG rejected the OIDC token', {
                code: 'ticket_unauthorized',
                status: 401,
            });
        }
    }

    throw new OidcError(`Alfresco ticket exchange failed (${lastStatus})`, {
        code: 'ticket_exchange_failed',
    });
}

/**
 * Direct Alfresco login with a user id and a password.
 *
 * Only used by the DEV_FAKE_AUTH escape hatch, so the portal can run against a
 * remote instance without a fully configured OIDC client.
 *
 * @param {string} becpgUrl base URL of the beCPG instance
 * @param {string} userId Alfresco user id
 * @param {string} password password
 * @returns {Promise<{ticket: string, userId: string, expiresAt: number}>}
 */
export async function loginWithAlfrescoCredentials(becpgUrl, userId, password) {
    const base = trimSlash(becpgUrl);
    const url = `${base}/alfresco/api/-default-/public/authentication/versions/1/tickets`;

    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ userId, password }),
            signal: timeoutSignal(requestTimeout()),
            cache: 'no-store',
        });
    } catch (error) {
        throw new OidcError('beCPG is unreachable', { code: 'becpg_unreachable', cause: error });
    }
    if (!response.ok) {
        throw new OidcError(`Alfresco login failed (${response.status})`, {
            code: 'login_failed',
            status: response.status === 403 || response.status === 401 ? 401 : 502,
        });
    }
    const payload = await response.json();
    const ticket = payload && payload.entry && payload.entry.id;
    if (!ticket) {
        throw new OidcError('Alfresco returned no ticket', { code: 'ticket_missing' });
    }
    return {
        ticket,
        userId: (payload.entry && payload.entry.userId) || userId,
        expiresAt: Date.now() + ticketTtl() * 1000,
    };
}

/**
 * Reads the current person from Alfresco, to fill in name/email/locale of the
 * session. Best effort: returns null instead of throwing.
 *
 * `locale` is the user's OWN language — `bcpg:userLocale`, what they set on their
 * beCPG profile — and it comes back in the `properties` of this very call, so it
 * costs nothing extra. It is what the portal must answer and ask upstream in,
 * ahead of any instance-wide default: a French supplier on an instance configured
 * in English was reading French chrome and English AI suggestions.
 *
 * @param {string} becpgUrl base URL of the beCPG instance
 * @param {string} ticket Alfresco ticket
 * @returns {Promise<{id: string, name: string, email: string, locale: string}|null>}
 */
export async function fetchAlfrescoPerson(becpgUrl, ticket) {
    const base = trimSlash(becpgUrl);
    const url = `${base}/alfresco/api/-default-/public/alfresco/versions/1/people/-me-`;
    try {
        const response = await fetch(url, {
            headers: {
                Accept: 'application/json',
                Authorization: ticketAuthorizationValue(ticket),
            },
            signal: timeoutSignal(requestTimeout()),
            cache: 'no-store',
        });
        if (!response.ok) {
            return null;
        }
        const payload = await response.json();
        const entry = payload && payload.entry;
        if (!entry) {
            return null;
        }
        return {
            id: entry.id,
            name: entry.displayName
                || [entry.firstName, entry.lastName].filter(Boolean).join(' ')
                || entry.id,
            email: entry.email || '',
            // Often absent — a user who never set it — so the caller falls through
            // to the instance default rather than treating '' as a choice.
            locale: (entry.properties && entry.properties['bcpg:userLocale']) || '',
        };
    } catch (error) {
        console.warn('[oidc] people/-me- lookup failed:', error.message);
        return null;
    }
}
