/**
 * The supplier scope, made readable by the server.
 *
 * One account can act for several supplier records — fifteen for the test
 * account — and the top bar is what picks the one in use. That choice used to
 * live in the browser `localStorage`, hence out of reach of the server components.
 *
 * The dashboard is one of them. It therefore built its counters over the fifteen
 * records while the bar announced a single one: 51 tasks and 193 products for a
 * scope that held two, and an approval status describing a company other than the
 * one displayed. That was not a display lag, it was an answer to a question the
 * user had not asked.
 *
 * The choice is therefore also written into a cookie. `localStorage` remains the
 * reference on the client side: the cookie exists only so that server rendering
 * can bound its queries, and it is treated as a hint, never as an
 * authorisation.
 *
 * What this cookie is not
 *
 * It grants no right. The scope narrows what is looked at among what may already
 * be seen; beCPG remains the sole judge of access (spec §6.2), and a record
 * requested outside those rights answers 403 whatever this cookie says. It also
 * carries the `sub` of the session that wrote it, so that a cookie left by
 * another account on the same browser is ignored rather than applied.
 *
 * `SameSite=Lax` and no `httpOnly`: the client is the one writing it, and it only
 * contains a node identifier the browser already knows.
 */

/** Name of the cookie carrying the chosen scope. */
export const SCOPE_COOKIE = 'becpg_portal_scope';

/** One year: this is a setting, not a working session. */
const MAX_AGE_SECONDS = 31_536_000;

/**
 * Writes the scope into the cookie, on the browser side.
 *
 * @param {string|null} sub identifier of the current user
 * @param {{ref: string|null, all: boolean}} scope
 * @returns {boolean} true when the cookie held another scope, so whatever the
 *          server rendered from it is out of date
 */
export function writeScopeCookie(sub, scope) {
    if (typeof document === 'undefined' || !sub) {
        return false;
    }
    const value = encodeURIComponent(JSON.stringify({
        sub,
        ref: (scope && scope.ref) || null,
        all: Boolean(scope && scope.all),
    }));
    const current = document.cookie.split('; ').find((entry) => entry.startsWith(`${SCOPE_COOKIE}=`));
    if (current === `${SCOPE_COOKIE}=${value}`) {
        return false;
    }
    document.cookie = `${SCOPE_COOKIE}=${value}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`;
    return true;
}

/**
 * Reads the scope back from the raw value of a cookie.
 *
 * Exported apart from the server-side read so it is testable without `next/headers`.
 *
 * @param {string|null|undefined} raw cookie value, already decoded by the caller
 * @param {string|null} sessionSub the `sub` of the session currently open
 * @returns {{ref: string|null, all: boolean}} empty scope if the cookie is
 *   absent, unreadable, or written by another account
 */
export function parseScopeCookie(raw, sessionSub) {
    const empty = { ref: null, all: false };
    if (!raw) {
        return empty;
    }
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return empty;
        }
        // A choice belongs to whoever made it: the cookie of another account
        // on this browser must not bound this very session.
        if (!parsed.sub || !sessionSub || parsed.sub !== sessionSub) {
            return empty;
        }
        return { ref: parsed.ref || null, all: Boolean(parsed.all) };
    }
    catch {
        return empty;
    }
}
