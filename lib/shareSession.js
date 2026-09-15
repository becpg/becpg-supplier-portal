/**
 * Share session acquisition.
 *
 * WHY THIS EXISTS — verified on a 26.1.0 instance, see doc/becpg-api-contracts.md §8.
 *
 * The wizard endpoint resolves each step's form definition through Share, and Share's
 * `node-type` config evaluator (`NodeMetadataBasedEvaluator`) calls `/api/metadata`
 * through its **session** connector. With no Share session it swallows
 * `NotAuthenticatedException` and silently reports "no config" — so entity forms
 * (`bcpg:rawMaterial` and friends, declared only under `evaluator="node-type"`) come back
 * empty. Datalist steps are unaffected: beCPG also declares them under `model-type`,
 * which needs no node and therefore no session.
 *
 * Measured, same request, same instance:
 *   without a Share session -> step1: { error: 'no-form-config' }
 *   with one               -> step1: 21 fields, formId 'supplier'
 *
 * HOW THE SESSION IS OBTAINED. beCPG exposes `POST /share/noauth/becpg/portal/session`,
 * which verifies the portal's own access token against the issuer's signing keys and
 * trades it for a Share session. The portal proves it is the portal with a shared key in
 * `X-beCPG-Portal-Key`; both travel as HEADERS, never in the query string.
 *
 * The previous approach — calling a Share page with the bearer and letting
 * `BeCPGAIMSFilter` set the session up — does not work: that filter has no incoming
 * bearer branch, so an AIMS instance answers `302 -> aims-login` and the bearer is
 * ignored. The endpoint is that missing branch.
 *
 * The cookie is cached in memory per (tenant, user) with a TTL. It is NEVER put in the
 * portal's own session cookie: it is a server-side credential for a server-side call, and
 * the browser must not see it. A cache miss simply costs one extra round-trip, so losing
 * the map on a restart or a scale-out is harmless — which keeps the portal stateless in
 * the way that matters (no sticky sessions).
 *
 * Server only.
 */

import { getAccessToken, resolveShareBaseUrl } from '@/lib/becpg';
import { httpFetch, logDebug, logWarn } from '@/lib/http';

/**
 * The session endpoint, under `/noauth/` rather than `/service/`.
 *
 * `/noauth/*` is mapped to the UrlRewriteFilter alone, so it is not challenged by the
 * AIMS or SSO filters in any deployment mode. Safe because the endpoint derives no
 * authority whatsoever from cookies: its entire authority is the signed token plus the
 * shared key.
 */
const SHARE_SESSION_PATH = 'share/noauth/becpg/portal/session';

/** Header carrying the shared key that identifies the caller as the portal. */
const PORTAL_KEY_HEADER = 'X-beCPG-Portal-Key';

/** How long a Share session cookie is reused, in ms. Share's own default is 60 min. */
const SESSION_TTL_MS = 20 * 60 * 1000;

/** Hard cap, so a large tenant cannot grow the heap without bound. */
const MAX_ENTRIES = 500;

/** key -> { cookie, expiresAt } */
const cache = new Map();

function cacheKey(session) {
    return `${session?.tenantId || ''}::${session?.username || session?.sub || ''}`;
}

function readEntry(key) {
    const entry = cache.get(key);
    if (!entry) {
        return null;
    }
    if (entry.expiresAt <= Date.now()) {
        cache.delete(key);
        return null;
    }
    return entry.cookie;
}

function writeEntry(key, cookie) {
    if (cache.size >= MAX_ENTRIES) {
        // Cheapest sane eviction: drop the oldest insertion.
        const oldest = cache.keys().next();
        if (!oldest.done) {
            cache.delete(oldest.value);
        }
    }
    cache.set(key, { cookie, expiresAt: Date.now() + SESSION_TTL_MS });
}

/**
 * Extracts the JSESSIONID from a `set-cookie` response header.
 *
 * @param {Headers} headers response headers
 * @returns {string|null} a `JSESSIONID=…` cookie string, or null
 */
function extractSessionCookie(headers) {
    if (!headers) {
        return null;
    }
    const raw = typeof headers.getSetCookie === 'function'
        ? headers.getSetCookie()
        : [headers.get('set-cookie')].filter(Boolean);

    for (const value of raw || []) {
        const match = String(value).match(/JSESSIONID=([^;]+)/i);
        if (match) {
            return `JSESSIONID=${match[1]}`;
        }
    }
    return null;
}

/**
 * The `error` code of a refusal, for the log. Never the body: it is not ours to shape.
 *
 * @param {Response} response
 * @returns {Promise<string>}
 */
async function readErrorCode(response) {
    try {
        const body = await response.json();
        return body?.error ? String(body.error) : 'unknown';
    }
    catch {
        return 'unreadable';
    }
}

/**
 * Returns a Share session cookie for the current user, creating one if needed.
 *
 * Returns null — never throws — when no session can be obtained: the caller then runs
 * without one, which still resolves every datalist step. Degrading is deliberate: a
 * transient Share problem must not take the whole wizard down.
 *
 * @param {Object} session the portal session
 * @returns {Promise<string|null>} a `JSESSIONID=…` cookie, or null
 */
export async function getShareSessionCookie(session) {
    if (!session) {
        return null;
    }

    const key = cacheKey(session);
    const cached = readEntry(key);
    if (cached) {
        return cached;
    }

    const token = getAccessToken(session);
    if (!token) {
        // Dev / fake-auth mode: no bearer to trade. Entity form steps will report
        // `no-form-config`; everything else works.
        logDebug('share.session', { skipped: 'no-access-token' });
        return null;
    }

    const portalKey = (process.env.PORTAL_SHARE_KEY || '').trim();
    if (!portalKey) {
        logWarn('share.session', { skipped: 'PORTAL_SHARE_KEY is not set' });
        return null;
    }

    try {
        const url = `${resolveShareBaseUrl(session)}/${SHARE_SESSION_PATH}`;
        const response = await httpFetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                [PORTAL_KEY_HEADER]: portalKey,
                Accept: 'application/json',
            },
            redirect: 'manual',
            label: 'share-session',
        });

        if (!response.ok) {
            // The endpoint ships disabled and answers 404 until an administrator turns it
            // on, so 404 is a configuration state and not a fault. Everything else is one,
            // and the body carries a stable error code, never a stack trace.
            logWarn('share.session', {
                status: response.status,
                reason: response.status === 404
                    ? 'becpg.portal.session is not enabled on this Share'
                    : await readErrorCode(response),
            });
            return null;
        }

        const cookie = extractSessionCookie(response.headers);
        if (!cookie) {
            logWarn('share.session', { status: response.status, reason: 'no JSESSIONID returned' });
            return null;
        }

        writeEntry(key, cookie);
        logDebug('share.session', { established: true });
        return cookie;
    }
    catch (error) {
        logWarn('share.session', { error: error.message });
        return null;
    }
}

/**
 * Drops the cached Share session for a user. Call it on logout, and whenever a Share call
 * comes back 401 — the next call then re-establishes one.
 *
 * @param {Object} session the portal session
 */
export function clearShareSessionCookie(session) {
    if (session) {
        cache.delete(cacheKey(session));
    }
}
