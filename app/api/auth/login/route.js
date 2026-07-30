/**
 * GET /api/auth/login
 *
 * Starts the OIDC authorization-code flow (PKCE) for the resolved tenant, and
 * redirects the browser to the IdP. The `state`, the PKCE verifier, the nonce,
 * the tenant and the page the user was heading to are kept in a short-lived
 * encrypted httpOnly cookie — nothing sensitive travels in the query string.
 *
 * Query parameters:
 *   next    path to come back to after login (same-origin paths only)
 *   tenant  explicit tenant chosen in the /login selector
 *   prompt  forwarded to the IdP (e.g. `login` to force re-authentication)
 *
 * DEV_FAKE_AUTH escape hatch (development only): instead of the OIDC dance, the
 * handler logs into Alfresco directly with BECPG_DEV_USER / BECPG_DEV_PASSWORD
 * and writes a normal session. It makes the portal runnable against
 * dev.becpg.fr without a fully configured OIDC client, and it is refused
 * outright when NODE_ENV === 'production'.
 */

import { NextResponse } from 'next/server';
import {
    OidcError,
    buildAuthorizationUrl,
    fetchAlfrescoPerson,
    generateCodeChallenge,
    generateCodeVerifier,
    isOidcConfigured,
    loginWithAlfrescoCredentials,
    randomToken,
} from '@/lib/oidc';
import {
    createSession,
    portalBaseUrl,
    safeNextPath,
    writeOidcState,
    writeSession,
} from '@/lib/session';
import { TENANT_COOKIE, resolveTenant, tenantCookieOptions } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

function isDevAuthEnabled() {
    const flag = String(process.env.DEV_FAKE_AUTH || '').toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(flag) && process.env.NODE_ENV !== 'production';
}

function errorResponse(request, code, message, status = 500) {
    const wantsJson = (request.headers.get('accept') || '').includes('application/json');
    if (wantsJson) {
        return NextResponse.json({ error: code, message }, { status });
    }
    const url = new URL('/login', portalBaseUrl(request));
    url.searchParams.set('error', code);
    return NextResponse.redirect(url, { status: 302 });
}

export async function GET(request) {
    const url = new URL(request.url);
    const requestedTenant = url.searchParams.get('tenant');
    const tenant = resolveTenant(request, { override: requestedTenant || undefined });
    const next = safeNextPath(url.searchParams.get('next'), '/');
    const baseUrl = portalBaseUrl(request);

    // ---------------------------------------------------------------- dev mode
    if (isDevAuthEnabled()) {
        const user = process.env.BECPG_DEV_USER;
        const password = process.env.BECPG_DEV_PASSWORD;
        if (!user || !password) {
            return errorResponse(
                request,
                'dev_auth_misconfigured',
                'DEV_FAKE_AUTH is on but BECPG_DEV_USER / BECPG_DEV_PASSWORD are missing',
            );
        }
        try {
            const becpgUrl = tenant.becpgUrl || process.env.BECPG_URL;
            const { ticket, userId, expiresAt } = await loginWithAlfrescoCredentials(
                becpgUrl,
                user,
                password,
            );
            const person = await fetchAlfrescoPerson(becpgUrl, ticket);
            const session = createSession({
                sub: userId,
                username: userId,
                name: (person && person.name) || userId,
                email: (person && person.email) || '',
                tenantId: tenant.id,
                becpgUrl,
                becpgInstance: tenant.becpgInstance,
                ticket,
                ticketExpiry: expiresAt,
                authMode: 'dev',
            });

            const response = NextResponse.redirect(new URL(next, baseUrl), { status: 302 });
            response.cookies.set(TENANT_COOKIE, tenant.id, tenantCookieOptions());
            await writeSession(response, session);
            console.warn(`[auth] DEV_FAKE_AUTH session opened for "${userId}" on ${becpgUrl}`);
            return response;
        } catch (error) {
            const status = error instanceof OidcError ? error.status : 502;
            const code = error instanceof OidcError ? error.code : 'dev_auth_failed';
            console.error('[auth] DEV_FAKE_AUTH failed:', error.message);
            return errorResponse(request, code, error.message, status);
        }
    }

    // --------------------------------------------------------------- OIDC flow
    if (!isOidcConfigured()) {
        return errorResponse(
            request,
            'oidc_not_configured',
            'OIDC_ISSUER_BASE / OIDC_CLIENT_ID are not configured (and DEV_FAKE_AUTH is off)',
        );
    }

    try {
        const state = randomToken(32);
        const nonce = randomToken(16);
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        const redirectUri = `${baseUrl}/api/auth/callback`;

        const authorizationUrl = await buildAuthorizationUrl(tenant, {
            redirectUri,
            state,
            codeChallenge,
            nonce,
            locale: url.searchParams.get('lang') || undefined,
            loginHint: url.searchParams.get('login_hint') || undefined,
            prompt: url.searchParams.get('prompt') || undefined,
        });

        const response = NextResponse.redirect(authorizationUrl, { status: 302 });
        response.cookies.set(TENANT_COOKIE, tenant.id, tenantCookieOptions());
        await writeOidcState(response, {
            state,
            nonce,
            codeVerifier,
            tenantId: tenant.id,
            redirectUri,
            next,
        });
        return response;
    } catch (error) {
        const status = error instanceof OidcError ? error.status : 502;
        const code = error instanceof OidcError ? error.code : 'login_failed';
        console.error('[auth] login failed:', error.message);
        return errorResponse(request, code, error.message, status);
    }
}
