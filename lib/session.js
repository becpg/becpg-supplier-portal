/**
 * Server-side session (spec §5.3, §5.5, §6).
 *
 * The session lives **entirely inside an encrypted httpOnly cookie** (JWE,
 * `dir` + `A256GCM`). Nothing is kept in server memory, so the portal scales
 * horizontally without sticky sessions, and nothing readable leaves the server:
 * the OIDC tokens and the Alfresco ticket are inside the ciphertext.
 *
 * Session payload:
 *
 *   {
 *     sub, name, email, username,          // who
 *     tenantId, becpgUrl, becpgInstance,   // where
 *     ticket, ticketExpiry,                // Alfresco ticket (server-side only)
 *     accessToken, refreshToken, idToken,  // OIDC tokens (server-side only)
 *     expiresAt,                           // access token expiry (ms epoch)
 *     authMode,                            // 'oidc' | 'dev' | 'ticket'
 *     createdAt
 *   }
 *
 * `toPublicSession()` is the ONLY projection that may ever be serialised to the
 * browser: it drops ticket, accessToken, refreshToken and idToken.
 *
 * Edge-safe: jose + WebCrypto only. `next/headers` is imported dynamically, so
 * `proxy.js` can import this module.
 */

import { EncryptJWT, jwtDecrypt } from 'jose';
import { getTenant } from '@/lib/tenant';
import {
    OidcError,
    exchangeTokenForTicket,
    refreshTokens,
    staticTicketMode,
    ticketTtl,
    loginWithAlfrescoCredentials,
} from '@/lib/oidc';

/** Name of the session cookie (overridable, but this is the documented contract). */
export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'becpg_portal_session';

/**
 * Largest value we are willing to put in a single cookie.
 *
 * Browsers cap a cookie at ~4096 bytes for the WHOLE `name=value; attributes`
 * string, and silently drop anything larger — no error, the cookie simply never
 * comes back, which looks exactly like a login loop.
 *
 * Measured on the local Keycloak: a DEV_FAKE_AUTH session (ticket only) encrypts
 * to ~700 bytes, but a real OIDC session (access + refresh + id token) encrypts
 * to **5380 bytes**. So the real flow does not fit and must be chunked.
 * 3500 leaves room for the cookie name, `Path`, `Max-Age`, `HttpOnly`, `SameSite`.
 */
const MAX_COOKIE_VALUE = 3500;

/** Hard cap on chunks — also the number we blindly clear, so none can be orphaned. */
const MAX_COOKIE_CHUNKS = 8;

/** Short-lived cookie holding the OIDC state / PKCE verifier between login and callback. */
export const OIDC_STATE_COOKIE = 'becpg_portal_oidc';

/** Lifetime of the OIDC state cookie (seconds). */
export const OIDC_STATE_TTL = 600;

/** Refresh the access token this long before it actually expires (ms). */
const REFRESH_SKEW_MS = 60 * 1000;

/** Re-exchange the Alfresco ticket this long before its assumed expiry (ms). */
const TICKET_SKEW_MS = 60 * 1000;

/** Claims added by jose that are not part of the session payload. */
const JWT_RESERVED = ['iat', 'exp', 'nbf', 'iss', 'aud', 'jti'];

let cachedKey = null;
let cachedKeySecret = null;

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

/** Session cookie lifetime, in seconds. */
export function sessionTtl() {
    return Number(env('SESSION_TTL', '28800')) || 28800;
}

function secureCookies() {
    return toBoolean(process.env.SESSION_COOKIE_SECURE, process.env.NODE_ENV === 'production');
}

/**
 * Derives the 256-bit content-encryption key from the configured secret.
 * SHA-256 of the raw secret, so any secret format works (base64, hex, phrase).
 *
 * @returns {Promise<Uint8Array>} the 32-byte key
 */
async function sessionKey() {
    const secret = env('SESSION_SECRET', env('SESSION_COOKIE_SECRET'));
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new OidcError('SESSION_SECRET is not configured', {
                code: 'session_not_configured',
                status: 500,
            });
        }
        console.warn('[session] SESSION_SECRET missing — using an insecure development key');
    }
    const material = secret || 'becpg-supplier-portal-development-key';
    if (cachedKey && cachedKeySecret === material) {
        return cachedKey;
    }
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));
    cachedKey = new Uint8Array(digest);
    cachedKeySecret = material;
    return cachedKey;
}

/**
 * Encrypts an arbitrary payload as a compact JWE.
 *
 * @param {Object} payload payload to encrypt
 * @param {number} ttlSeconds lifetime
 * @returns {Promise<string>} the compact JWE
 */
export async function encryptPayload(payload, ttlSeconds) {
    const key = await sessionKey();
    return new EncryptJWT({ ...payload })
        .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
        .setIssuedAt()
        .setExpirationTime(`${ttlSeconds}s`)
        .encrypt(key);
}

/**
 * Decrypts a compact JWE produced by {@link encryptPayload}.
 * Returns null on any failure (tampered, expired, key rotated) — a bad cookie
 * is exactly equivalent to no cookie.
 *
 * @param {string} value the compact JWE
 * @returns {Promise<Object|null>} the payload, without the JWT reserved claims
 */
export async function decryptPayload(value) {
    if (!value) {
        return null;
    }
    try {
        const key = await sessionKey();
        const { payload } = await jwtDecrypt(value, key, { clockTolerance: 30 });
        const result = { ...payload };
        JWT_RESERVED.forEach((claim) => {
            delete result[claim];
        });
        result.cookieExpiresAt = typeof payload.exp === 'number' ? payload.exp * 1000 : null;
        return result;
    } catch {
        return null;
    }
}

/**
 * Builds a normalised session object.
 *
 * @param {Object} data session fields
 * @returns {Object} the session
 */
export function createSession(data = {}) {
    return {
        sub: data.sub || '',
        name: data.name || '',
        email: data.email || '',
        username: data.username || data.sub || '',
        tenantId: data.tenantId || '',
        becpgUrl: data.becpgUrl || '',
        becpgInstance: data.becpgInstance || data.tenantId || '',
        ticket: data.ticket || '',
        ticketExpiry: data.ticketExpiry || 0,
        accessToken: data.accessToken || '',
        refreshToken: data.refreshToken || '',
        idToken: data.idToken || '',
        expiresAt: data.expiresAt || 0,
        authMode: data.authMode || 'oidc',
        createdAt: data.createdAt || Date.now(),
    };
}

/**
 * Cookie options for the session cookie.
 *
 * @param {number} [maxAge] lifetime in seconds (0 clears the cookie)
 * @returns {Object} cookie options
 */
export function sessionCookieOptions(maxAge = sessionTtl()) {
    return {
        httpOnly: true,
        secure: secureCookies(),
        sameSite: 'lax',
        path: '/',
        maxAge,
    };
}

/**
 * Encrypts a session into the `{ name, value, options }` triple to set.
 *
 * @param {Object} session the session
 * @returns {Promise<{name: string, value: string, options: Object}>}
 */
export async function sessionCookie(session) {
    const ttl = sessionTtl();
    return {
        name: SESSION_COOKIE,
        value: await encryptPayload(session, ttl),
        options: sessionCookieOptions(ttl),
    };
}

async function cookieStore() {
    const { cookies } = await import('next/headers');
    return cookies();
}

/**
 * Reads a cookie value from any supported source: a NextRequest, a plain
 * Request, or a cookie store.
 *
 * @param {Object} source request or cookie store
 * @param {string} name cookie name
 * @returns {string|null}
 */
function readCookieValue(source, name) {
    if (!source) {
        return null;
    }
    if (typeof source === 'string') {
        return source;
    }
    if (source.cookies && typeof source.cookies.get === 'function') {
        const entry = source.cookies.get(name);
        return entry ? (typeof entry === 'string' ? entry : entry.value) : null;
    }
    if (typeof source.get === 'function' && !source.headers) {
        const entry = source.get(name);
        return entry ? (typeof entry === 'string' ? entry : entry.value) : null;
    }
    if (source.headers && typeof source.headers.get === 'function') {
        const header = source.headers.get('cookie');
        if (!header) {
            return null;
        }
        const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
        return match ? decodeURIComponent(match[1]) : null;
    }
    return null;
}

/**
 * Reassembles the session cookie value, chunked or not.
 *
 * A plain `becpg_portal_session` wins when present (small sessions, and every
 * cookie written before chunking existed); otherwise `…session.0`, `…session.1`, …
 * are concatenated in order and the first gap ends the sequence.
 *
 * @param {Object} source request or cookie store
 * @returns {string|null} the ciphertext, or null when there is no session cookie
 */
function readChunkedCookie(source) {
    const single = readCookieValue(source, SESSION_COOKIE);
    if (single) {
        return single;
    }
    const parts = [];
    for (let index = 0; index < MAX_COOKIE_CHUNKS; index += 1) {
        const chunk = readCookieValue(source, `${SESSION_COOKIE}.${index}`);
        if (!chunk) {
            break;
        }
        parts.push(chunk);
    }
    return parts.length ? parts.join('') : null;
}

/**
 * Reads and decrypts the session from a request or a cookie store.
 *
 * @param {Object} source NextRequest, Request, cookie store, or raw cookie value
 * @returns {Promise<Object|null>} the session, or null when absent/invalid
 */
export async function readSession(source) {
    const value = typeof source === 'string' ? source : readChunkedCookie(source);
    if (!value) {
        return null;
    }
    const payload = await decryptPayload(value);
    if (!payload || !payload.tenantId) {
        return null;
    }
    return payload;
}

/**
 * Reads the session inside a route handler / server component.
 *
 * @returns {Promise<Object|null>} the session, or null
 */
export async function getSession() {
    const store = await cookieStore();
    return readSession(store);
}

/**
 * Writes the session cookie.
 *
 * @param {Object|null} target a NextResponse (or anything with `cookies.set`),
 *        or null/undefined to write through `next/headers` (route handlers)
 * @param {Object} session the session to persist
 * @returns {Promise<Object|null>} the target, for chaining
 */
export async function writeSession(target, session) {
    const { name, value, options } = await sessionCookie(session);

    // One cookie when it fits, `name.0` / `name.1` / … when it does not. The unused
    // form is always cleared, so switching between the two cannot leave a stale
    // cookie behind that would then be read in preference to the fresh one.
    const entries = [];
    if (value.length <= MAX_COOKIE_VALUE) {
        entries.push([name, value, options]);
        for (let index = 0; index < MAX_COOKIE_CHUNKS; index += 1) {
            entries.push([`${name}.${index}`, '', sessionCookieOptions(0)]);
        }
    }
    else {
        const chunks = [];
        for (let offset = 0; offset < value.length; offset += MAX_COOKIE_VALUE) {
            chunks.push(value.slice(offset, offset + MAX_COOKIE_VALUE));
        }
        if (chunks.length > MAX_COOKIE_CHUNKS) {
            throw new Error(
                `Session cookie needs ${chunks.length} chunks, the limit is ${MAX_COOKIE_CHUNKS}`,
            );
        }
        entries.push([name, '', sessionCookieOptions(0)]);
        chunks.forEach((chunk, index) => entries.push([`${name}.${index}`, chunk, options]));
        for (let index = chunks.length; index < MAX_COOKIE_CHUNKS; index += 1) {
            entries.push([`${name}.${index}`, '', sessionCookieOptions(0)]);
        }
    }

    if (target && target.cookies && typeof target.cookies.set === 'function') {
        entries.forEach(([cookieName, cookieValue, cookieOptions]) =>
            target.cookies.set(cookieName, cookieValue, cookieOptions));
        return target;
    }
    const store = await cookieStore();
    entries.forEach(([cookieName, cookieValue, cookieOptions]) =>
        store.set(cookieName, cookieValue, cookieOptions));
    return target || null;
}

/**
 * Clears the session cookie (and the OIDC state cookie, if any is left over).
 *
 * @param {Object|null} target a NextResponse, or null to use `next/headers`
 * @returns {Promise<Object|null>} the target, for chaining
 */
export async function clearSession(target) {
    const options = sessionCookieOptions(0);
    const names = [SESSION_COOKIE, OIDC_STATE_COOKIE];
    for (let index = 0; index < MAX_COOKIE_CHUNKS; index += 1) {
        names.push(`${SESSION_COOKIE}.${index}`);
    }
    if (target && target.cookies && typeof target.cookies.set === 'function') {
        names.forEach((name) => target.cookies.set(name, '', options));
        return target;
    }
    const store = await cookieStore();
    names.forEach((name) => store.set(name, '', options));
    return target || null;
}

/**
 * Strips every secret from a session. **This is the only shape that may be
 * sent to the browser.**
 *
 * @param {Object} session the session
 * @returns {{sub: string, name: string, email: string, username: string,
 *            tenantId: string, authMode: string, expiresAt: number|null,
 *            createdAt: number}|null}
 */
export function toPublicSession(session) {
    if (!session) {
        return null;
    }
    return {
        sub: session.sub || '',
        name: session.name || '',
        email: session.email || '',
        username: session.username || '',
        tenantId: session.tenantId || '',
        authMode: session.authMode || 'oidc',
        expiresAt: session.cookieExpiresAt || session.expiresAt || null,
        createdAt: session.createdAt || null,
    };
}

/**
 * @param {Object} session the session
 * @returns {boolean} true when the OIDC access token is expired (or about to)
 */
export function isAccessTokenStale(session) {
    if (!session || session.authMode !== 'oidc' || !session.expiresAt) {
        return false;
    }
    return session.expiresAt - REFRESH_SKEW_MS <= Date.now();
}

/**
 * @param {Object} session the session
 * @returns {boolean} true when the Alfresco ticket must be re-obtained
 */
export function isTicketStale(session) {
    if (!session) {
        return true;
    }
    if (staticTicketMode().enabled) {
        return false;
    }
    if (!session.ticket) {
        return true;
    }
    if (!session.ticketExpiry) {
        return false;
    }
    return session.ticketExpiry - TICKET_SKEW_MS <= Date.now();
}

/**
 * Refreshes what needs refreshing: the OIDC access token first (refresh_token
 * grant), then the Alfresco ticket. Used by every route handler that is about
 * to call beCPG, and by GET /api/auth/session.
 *
 * The caller is responsible for persisting the result when `changed` is true:
 *
 *     const { session, changed } = await refreshSessionIfNeeded(current);
 *     if (changed) { await writeSession(response, session); }
 *
 * @param {Object} session the current session
 * @param {{tenant?: Object, force?: boolean}} [options] options
 * @returns {Promise<{session: Object|null, changed: boolean}>}
 */
export async function refreshSessionIfNeeded(session, options = {}) {
    if (!session) {
        return { session: null, changed: false };
    }

    const tenant = options.tenant || getTenant(session.tenantId);
    let next = session;
    let changed = false;

    if (options.force || isAccessTokenStale(session)) {
        if (session.authMode === 'oidc') {
            if (!session.refreshToken || !tenant) {
                return { session: null, changed: false };
            }
            try {
                const tokens = await refreshTokens(tenant, session.refreshToken);
                next = {
                    ...next,
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token || next.refreshToken,
                    idToken: tokens.id_token || next.idToken,
                    expiresAt: Date.now() + (Number(tokens.expires_in) || 300) * 1000,
                    ticket: '',
                    ticketExpiry: 0,
                };
                changed = true;
            } catch (error) {
                console.warn('[session] refresh failed:', error.message);
                return { session: null, changed: false };
            }
        }
    }

    if (isTicketStale(next)) {
        try {
            if (next.authMode === 'dev') {
                const user = env('BECPG_DEV_USER');
                const password = env('BECPG_DEV_PASSWORD');
                if (!user || !password) {
                    return { session: null, changed: false };
                }
                const { ticket, expiresAt } = await loginWithAlfrescoCredentials(
                    next.becpgUrl,
                    user,
                    password,
                );
                next = { ...next, ticket, ticketExpiry: expiresAt };
            } else if (next.accessToken) {
                const { ticket, expiresAt } = await exchangeTokenForTicket(
                    next.becpgUrl,
                    next.accessToken,
                );
                next = { ...next, ticket, ticketExpiry: expiresAt };
            } else if (staticTicketMode().enabled) {
                const staticMode = staticTicketMode();
                next = {
                    ...next,
                    ticket: staticMode.ticket,
                    ticketExpiry: Date.now() + ticketTtl() * 1000,
                };
            } else {
                return { session: null, changed: false };
            }
            changed = true;
        } catch (error) {
            console.warn('[session] ticket renewal failed:', error.message);
            return { session: null, changed: false };
        }
    }

    return { session: next, changed };
}

/**
 * Convenience for the proxy layer: returns a usable session (refreshed if
 * needed) or null. Persists the refreshed session through `next/headers`.
 *
 * @returns {Promise<Object|null>} a session with a live ticket, or null
 */
export async function getLiveSession() {
    const current = await getSession();
    if (!current) {
        return null;
    }
    const { session, changed } = await refreshSessionIfNeeded(current);
    if (!session) {
        return null;
    }
    if (changed) {
        try {
            await writeSession(null, session);
        } catch (error) {
            // Server components cannot set cookies; the session is still usable
            // for this request, it will simply be refreshed again next time.
            console.warn('[session] could not persist the refreshed session:', error.message);
        }
    }
    return session;
}

/**
 * Public base URL of the portal, used to build the OIDC redirect_uri and the
 * post-logout URL. PORTAL_BASE_URL wins (it must match the Keycloak client
 * configuration); the request origin is the fallback for local development.
 *
 * @param {Request} request incoming request
 * @returns {string} an absolute origin, without trailing slash
 */
export function portalBaseUrl(request) {
    const configured = env('PORTAL_BASE_URL');
    if (configured) {
        return configured.endsWith('/') ? configured.slice(0, -1) : configured;
    }
    const headers = request && request.headers;
    const host = (headers && (headers.get('x-forwarded-host') || headers.get('host'))) || '';
    const proto = (headers && headers.get('x-forwarded-proto'))
        || (request && request.url ? new URL(request.url).protocol.replace(':', '') : 'http');
    if (host) {
        return `${proto}://${host.split(',')[0].trim()}`;
    }
    return new URL(request.url).origin;
}

/**
 * Sanitises a `next` parameter: only same-origin absolute paths are accepted,
 * so the login flow can never be turned into an open redirect.
 *
 * @param {string} value candidate path
 * @param {string} [fallback] value returned when the candidate is unusable
 * @returns {string} a safe path
 */
export function safeNextPath(value, fallback = '/') {
    if (!value || typeof value !== 'string') {
        return fallback;
    }
    if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
        return fallback;
    }
    if (value.startsWith('/api/auth/')) {
        return fallback;
    }
    return value;
}

/**
 * Stores the short-lived OIDC flow state (state, PKCE verifier, nonce, tenant,
 * original path) in its own encrypted cookie.
 *
 * @param {Object} target a NextResponse
 * @param {Object} state flow state
 * @returns {Promise<Object>} the target
 */
export async function writeOidcState(target, state) {
    const value = await encryptPayload(state, OIDC_STATE_TTL);
    target.cookies.set(OIDC_STATE_COOKIE, value, {
        httpOnly: true,
        secure: secureCookies(),
        sameSite: 'lax',
        path: '/',
        maxAge: OIDC_STATE_TTL,
    });
    return target;
}

/**
 * Reads the short-lived OIDC flow state.
 *
 * @param {Object} source NextRequest or cookie store
 * @returns {Promise<Object|null>}
 */
export async function readOidcState(source) {
    const value = readCookieValue(source, OIDC_STATE_COOKIE);
    return decryptPayload(value);
}

/**
 * Deletes the short-lived OIDC flow state cookie.
 *
 * @param {Object} target a NextResponse
 * @returns {Object} the target
 */
export function clearOidcState(target) {
    target.cookies.set(OIDC_STATE_COOKIE, '', {
        httpOnly: true,
        secure: secureCookies(),
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });
    return target;
}
