/**
 * GET|POST /api/auth/logout
 *
 * Clears the session cookie, best-effort revokes the refresh token, and sends
 * the browser to the IdP end_session endpoint when the realm exposes one, so
 * the SSO session dies with the portal session. Falls back to /login.
 *
 * Query parameters:
 *   next   path appended to the post-logout redirect (defaults to /login)
 *   local  `true` to skip the IdP round trip (portal-only logout)
 */

import { NextResponse } from 'next/server';
import { buildEndSessionUrl, revokeToken } from '@/lib/oidc';
import {
    clearSession,
    portalBaseUrl,
    portalUrl,
    readSession,
    safeNextPath,
} from '@/lib/session';
import { TENANT_COOKIE, getTenant, resolveTenant, tenantCookieOptions } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

async function handle(request) {
    const url = new URL(request.url);
    const baseUrl = portalBaseUrl(request);
    const next = safeNextPath(url.searchParams.get('next'), '/login');
    const localOnly = ['1', 'true', 'yes'].includes(
        String(url.searchParams.get('local') || '').toLowerCase(),
    );

    const session = await readSession(request);
    const tenant = (session && getTenant(session.tenantId)) || resolveTenant(request);

    let target = portalUrl(next, baseUrl).toString();

    if (session && session.authMode === 'oidc' && !localOnly) {
        if (session.refreshToken) {
            await revokeToken(tenant, session.refreshToken);
        }
        const endSession = await buildEndSessionUrl(tenant, {
            idToken: session.idToken,
            postLogoutRedirectUri: portalUrl(next, baseUrl).toString(),
        });
        if (endSession) {
            target = endSession;
        }
    }

    const response = NextResponse.redirect(target, { status: 302 });
    await clearSession(response);
    // The tenant preference survives logout on purpose: the /login selector
    // comes back pre-filled on the right tenant.
    if (session && session.tenantId) {
        response.cookies.set(TENANT_COOKIE, session.tenantId, tenantCookieOptions());
    }
    return response;
}

export function GET(request) {
    return handle(request);
}

export function POST(request) {
    return handle(request);
}
