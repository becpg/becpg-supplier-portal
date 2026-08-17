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
 * and writes a normal session. It makes the portal runnable against a
 * remote instance without a fully configured OIDC client, and it is refused
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

/**
 * Development accounts that `?devUser=` may select, from `BECPG_DEV_ACCOUNTS`.
 *
 * Format: `label=user:password,label=user:password`. Example
 *   BECPG_DEV_ACCOUNTS=admin=admin:becpg,fournisseur=supplier.local@becpg.fr:PortailFournisseur2026!
 *
 * Why it exists: with a single BECPG_DEV_USER the portal always opens the same session, so
 * switching to a supplier perspective meant editing `.env` and restarting — and losing the
 * ability to compare the two spaces side by side. The picker exists so you can.
 *
 * **The password is never taken from the request.** `?devUser=` selects a LABEL from this
 * server-side map; an unknown label is refused. The whole thing is behind
 * {@link isDevAuthEnabled}, so it cannot exist in production.
 *
 * @returns {Object} label -> { userId, password }
 */
function devAccounts() {
    const accounts = {};
    const raw = String(process.env.BECPG_DEV_ACCOUNTS || '').trim();

    for (const entry of raw.split(',').map((part) => part.trim()).filter(Boolean)) {
        const equals = entry.indexOf('=');
        const colon = entry.indexOf(':', equals + 1);
        if (equals === -1 || colon === -1) {
            continue;
        }
        const label = entry.slice(0, equals).trim();
        const userId = entry.slice(equals + 1, colon).trim();
        const password = entry.slice(colon + 1);
        if (label && userId && password) {
            accounts[label] = { userId, password };
        }
    }

    // The single-account variables stay authoritative for the default login, so an existing
    // setup keeps working untouched.
    if (process.env.BECPG_DEV_USER && process.env.BECPG_DEV_PASSWORD) {
        accounts.default = {
            userId: process.env.BECPG_DEV_USER,
            password: process.env.BECPG_DEV_PASSWORD,
        };
    }

    return accounts;
}

/**
 * Resolves the development credentials to use.
 *
 * @param {string|null} requested the `devUser` label, if any
 * @returns {{userId: string, password: string}|null} null when nothing is configured
 * @throws {OidcError} when a label was asked for and does not exist
 */
function resolveDevAccount(requested) {
    const accounts = devAccounts();

    if (requested) {
        const account = accounts[requested];
        if (!account) {
            throw new OidcError(
                `Unknown dev account "${requested}". Configured: ${Object.keys(accounts).join(', ') || 'none'}`,
                { code: 'dev_account_unknown', status: 400 },
            );
        }
        return account;
    }

    return accounts.default || null;
}

/**
 * Labels a /login picker may offer. Never includes a password.
 *
 * @returns {string[]}
 */
export function devAccountLabels() {
    return isDevAuthEnabled() ? Object.keys(devAccounts()).filter((label) => label !== 'default') : [];
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
        let account;
        try {
            // `?devUser=<label>` selects a server-side entry of BECPG_DEV_ACCOUNTS, so the
            // supplier and the internal perspectives can be compared without a restart.
            account = resolveDevAccount(url.searchParams.get('devUser'));
        }
        catch (error) {
            return errorResponse(request, error.code, error.message, error.status || 400);
        }
        if (!account) {
            return errorResponse(
                request,
                'dev_auth_misconfigured',
                'DEV_FAKE_AUTH is on but no account is configured (BECPG_DEV_USER / BECPG_DEV_PASSWORD, or BECPG_DEV_ACCOUNTS)',
            );
        }
        const user = account.userId;
        const password = account.password;
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
