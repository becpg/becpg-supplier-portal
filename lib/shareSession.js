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
 * So the portal needs a Share session. beCPG already knows how to make one from an OIDC
 * token: `BeCPGAIMSFilter` (becpg-share) takes the access token, exchanges it for an
 * Alfresco ticket and sets up the Share session. We drive that same filter by calling a
 * Share page once with the bearer, and keep the resulting `JSESSIONID`.
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

/** Share path hit to trigger the AIMS filter. Cheap, and always present. */
const SHARE_BOOTSTRAP_PATH = 'share/page/';

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
        // Ticket-only / dev mode: no bearer to hand to the AIMS filter. Entity form steps
        // will report `no-form-config`; everything else works.
        logDebug('share.session', { skipped: 'no-access-token' });
        return null;
    }

    try {
        const url = `${resolveShareBaseUrl(session)}/${SHARE_BOOTSTRAP_PATH}`;
        const response = await httpFetch(url, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}`, Accept: 'text/html' },
            redirect: 'manual',
            label: 'share-session',
        });

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
