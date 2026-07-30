/**
 * Edge middleware: nothing is reachable without a session.
 *
 * Public surface, and only this:
 *   /login (and /t/<tenant>/login)   the sign-in page and its tenant selector
 *   /api/auth/*                      the OIDC flow itself
 *   static assets                    handled by the matcher below
 *
 * Everything else requires a valid encrypted session cookie:
 *   - a page request without one is redirected to /login?next=<path>
 *   - an /api/* request without one gets a 401 JSON payload (no redirect: the
 *     caller is fetch(), not a browser navigation)
 *
 * The resolved tenant is forwarded to the route handlers as `x-becpg-tenant`,
 * so they do not have to redo the host/path/cookie resolution.
 *
 * Edge-safe: only `jose` (WebCrypto) and plain URL work — no node built-in.
 */

import { NextResponse } from 'next/server';
import { readSession } from '@/lib/session';
import { resolveTenant, stripTenantPrefix, withTenantPrefix } from '@/lib/tenant';

/** Paths served without a session, matched on the tenant-stripped pathname. */
const PUBLIC_PATHS = ['/login', '/api/auth', '/api/health'];

/** Files that must stay reachable anonymously (favicon, manifest, theme…). */
const PUBLIC_FILE_RE = /\.(?:ico|png|jpg|jpeg|gif|svg|webp|avif|css|js|map|txt|xml|json|woff|woff2|ttf|eot)$/i;

function isPublicPath(pathname) {
    return PUBLIC_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * A static asset, i.e. a file extension we serve anonymously.
 *
 * `/api/**` is excluded explicitly: webscript paths legitimately end in an
 * extension (`becpg/remote/entity.json`, `api/node/content/…/report.pdf`), and
 * without this guard such a request would skip the session check entirely.
 * The route handlers do call `requireSession()` themselves, so this was only
 * defence in depth — but it is the layer that is supposed to make "nothing is
 * reachable without a session" true by construction.
 *
 * @param {string} pathname tenant-stripped pathname
 * @returns {boolean}
 */
function isPublicFile(pathname) {
    if (pathname.startsWith('/api/')) {
        return false;
    }
    return PUBLIC_FILE_RE.test(pathname);
}

/**
 * Continues the request, mapping `/t/<tenant>/x` onto the real route `/x`.
 *
 * There is deliberately NO `app/t/[tenant]/` directory: the tenant prefix is a
 * routing concern, not a page hierarchy, and duplicating every page under it
 * would be absurd. So pages and route handlers live at their natural path, and
 * the prefixed form is rewritten here. Without this rewrite every
 * `/t/<tenant>/…` URL 404s, even though `resolveTenant()` advertises `path` as
 * a supported tenant source.
 *
 * @param {import('next/server').NextRequest} request
 * @param {string} prefix the tenant prefix, '' when there is none
 * @param {string} appPath the pathname with the prefix removed
 * @param {Headers} [headers] request headers to forward
 * @returns {NextResponse}
 */
function forward(request, prefix, appPath, headers) {
    const init = headers ? { request: { headers } } : undefined;
    if (!prefix) {
        return NextResponse.next(init);
    }
    const url = request.nextUrl.clone();
    url.pathname = appPath;
    return NextResponse.rewrite(url, init);
}

export async function middleware(request) {
    const { pathname, search } = request.nextUrl;
    const { pathname: appPath, prefix } = stripTenantPrefix(pathname);

    if (isPublicPath(appPath) || isPublicFile(appPath)) {
        return forward(request, prefix, appPath);
    }

    const session = await readSession(request);
    const tenant = resolveTenant(request);

    if (!session) {
        if (appPath.startsWith('/api/')) {
            return NextResponse.json(
                { error: 'unauthenticated', message: 'No session' },
                { status: 401, headers: { 'Cache-Control': 'no-store, private' } },
            );
        }
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = withTenantPrefix(prefix, '/login');
        loginUrl.search = '';
        loginUrl.searchParams.set('next', `${pathname}${search || ''}`);
        return NextResponse.redirect(loginUrl);
    }

    // Session present but pointing at another tenant than the URL explicitly
    // asks for (sub-domain or /t/<tenant> prefix): force a fresh login rather
    // than serving cross-tenant data. A tenant coming from the cookie or from
    // DEFAULT_TENANT is only a preference, and never invalidates a session.
    const explicitTenant = tenant && ['subdomain', 'path'].includes(tenant.source);
    if (explicitTenant && session.tenantId && tenant.id !== session.tenantId) {
        if (appPath.startsWith('/api/')) {
            return NextResponse.json(
                { error: 'tenant_mismatch', message: 'Session belongs to another tenant' },
                { status: 401, headers: { 'Cache-Control': 'no-store, private' } },
            );
        }
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = withTenantPrefix(prefix, '/login');
        loginUrl.search = '';
        loginUrl.searchParams.set('tenant', tenant.id);
        loginUrl.searchParams.set('next', `${pathname}${search || ''}`);
        return NextResponse.redirect(loginUrl);
    }

    const headers = new Headers(request.headers);
    headers.set('x-becpg-tenant', session.tenantId || (tenant ? tenant.id : ''));
    return forward(request, prefix, appPath, headers);
}

export const config = {
    matcher: [
        /*
         * Everything except the Next.js internals and the static assets served
         * from /public. `/api/auth/*` is filtered inside the middleware rather
         * than here, so the tenant-prefixed form (/t/<tenant>/api/...) is also
         * covered.
         */
        '/((?!_next/static|_next/image|favicon.ico|theme/|images/|fonts/|robots.txt|sitemap.xml|manifest.webmanifest).*)',
    ],
};
