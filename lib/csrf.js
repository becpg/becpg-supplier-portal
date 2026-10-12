/**
 * Cross-site request detection for the state-changing routes.
 *
 * The session cookie is SameSite=Lax, which is a *site* boundary, not an origin one: another
 * host under the same registrable domain (a Share instance, a sibling tenant) can still send a
 * cookie-bearing POST. A browser says where a request comes from in `Sec-Fetch-Site`; older ones
 * send `Origin` on writes. A client that sends neither is not a browser being steered by a
 * page, so it is let through.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** `Sec-Fetch-Site` values that mean "the user is on this very portal". */
const OWN_SITE = new Set(['same-origin', 'none']);

/**
 * @param {Request} request
 * @returns {boolean} true when a browser tells that the request did not start on this portal
 */
export function isCrossOrigin(request) {
    const site = request.headers.get('sec-fetch-site');
    if (site) {
        return !OWN_SITE.has(site);
    }
    const origin = request.headers.get('origin');
    if (!origin) {
        return false;
    }
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    try {
        return new URL(origin).host !== host;
    }
    catch {
        // An unparsable Origin is not one this portal ever issued.
        return true;
    }
}

/**
 * @param {Request} request
 * @returns {boolean} true for a write (any method but GET, HEAD, OPTIONS) coming from another origin
 */
export function isCrossOriginWrite(request) {
    return !SAFE_METHODS.has(request.method.toUpperCase()) && isCrossOrigin(request);
}
