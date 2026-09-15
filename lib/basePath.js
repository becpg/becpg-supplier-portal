/**
 * Prefix the portal is served under, browser side.
 *
 * The `basePath` of next.config only covers what Next generates: next/link,
 * next/router, the assets. Any absolute path written by hand -- a form action,
 * an href, a URL handed to fetch -- leaves without the prefix. Served under a
 * path of an instance host, it then lands on the beCPG core.
 */
export const basePath = process.env.NEXT_PUBLIC_PORTAL_BASE_PATH || '';

/**
 * Prefixes an absolute application path. Idempotent, and the identity when the
 * portal is served at the root.
 *
 * @param {string} path path starting with '/'
 * @returns {string}
 */
export function withBasePath(path) {
    if (!basePath || typeof path !== 'string' || !path.startsWith('/')) {
        return path;
    }
    if (path === basePath || path.startsWith(`${basePath}/`)) {
        return path;
    }
    return `${basePath}${path}`;
}
