/**
 * GET /api/auth/callback
 *
 * IdP redirect target. Verifies the `state` against the short-lived cookie,
 * exchanges the authorization code (PKCE) for tokens, enforces the mandatory
 * `becpg_url` / `becpg_instance` claims (spec §5.3 — missing claim ⇒ 401),
 * exchanges the access token for an Alfresco ticket, writes the encrypted
 * session cookie and sends the user back where they came from.
 *
 * Nothing obtained here is ever returned to the browser: the tokens and the
 * ticket only exist inside the ciphertext of the session cookie.
 */

import { NextResponse } from 'next/server';
import {
    MissingTenantClaimError,
    OidcError,
    claimsToProfile,
    decodeAccessToken,
    decodeIdToken,
    exchangeCode,
    exchangeTokenForTicket,
    fetchAlfrescoPerson,
    issuerUrl,
} from '@/lib/oidc';
import {
    clearOidcState,
    createSession,
    portalBaseUrl,
    portalHost,
    portalUrl,
    readOidcState,
    safeNextPath,
    writeSession,
} from '@/lib/session';
import { TENANT_COOKIE, getTenant, resolveTenant, tenantCookieOptions } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

function loginRedirect(request, code, extra = {}) {
    const url = new URL('/login', portalBaseUrl(request));
    url.searchParams.set('error', code);
    Object.keys(extra).forEach((key) => {
        if (extra[key]) {
            url.searchParams.set(key, extra[key]);
        }
    });
    const response = NextResponse.redirect(url, { status: 302 });
    clearOidcState(response);
    return response;
}

export async function GET(request) {
    const url = new URL(request.url);
    const baseUrl = portalBaseUrl(request);

    const idpError = url.searchParams.get('error');
    if (idpError) {
        console.warn('[auth] IdP returned an error:', idpError, url.searchParams.get('error_description'));
        return loginRedirect(request, idpError);
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) {
        return loginRedirect(request, 'invalid_callback');
    }

    const flow = await readOidcState(request);
    if (!flow || !flow.state) {
        return loginRedirect(request, 'state_expired');
    }
    if (flow.state !== state) {
        console.warn('[auth] state mismatch on the OIDC callback');
        return loginRedirect(request, 'state_mismatch');
    }

    const tenant = getTenant(flow.tenantId) || resolveTenant(request);
    const next = safeNextPath(flow.next, '/');
    // The host the login started on, not the callback's: the code was issued by
    // that issuer and is only redeemable there.
    const oidcHost = flow.oidcHost || portalHost(request);

    try {
        const issuer = issuerUrl(tenant, { host: oidcHost });
        const tokens = await exchangeCode(tenant, {
            code,
            codeVerifier: flow.codeVerifier,
            redirectUri: flow.redirectUri || `${baseUrl}/api/auth/callback`,
            host: oidcHost,
        });

        // Mandatory tenant claims live on the access token (hardcoded claim
        // mappers on the realm, cf. becpg-ai/doc/authentication_fr.md).
        const accessClaims = decodeAccessToken(tokens.access_token, { issuer });

        let idClaims = {};
        if (tokens.id_token) {
            idClaims = decodeIdToken(tokens.id_token, { issuer });
            if (flow.nonce && idClaims.nonce && idClaims.nonce !== flow.nonce) {
                console.warn('[auth] nonce mismatch on the ID token');
                return loginRedirect(request, 'nonce_mismatch');
            }
        }

        const profile = claimsToProfile({ ...accessClaims, ...idClaims });
        const becpgUrl = String(accessClaims.becpg_url).replace(/\/$/, '');
        const becpgInstance = String(accessClaims.becpg_instance);

        const { ticket, expiresAt: ticketExpiry } = await exchangeTokenForTicket(
            becpgUrl,
            tokens.access_token,
        );

        /*
         * The user's own language, read once at sign-in rather than on every
         * request. The identity provider does not know it — it is a beCPG profile
         * property (`bcpg:userLocale`) — and it is what the portal renders and
         * asks upstream in, ahead of the instance default. Best effort: this call
         * returns null on failure and the session then falls back as before.
         */
        const person = await fetchAlfrescoPerson(becpgUrl, ticket);

        const session = createSession({
            ...profile,
            locale: (person && person.locale) || '',
            tenantId: tenant.id,
            becpgUrl,
            becpgInstance,
            oidcHost,
            ticket,
            ticketExpiry,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || '',
            idToken: tokens.id_token || '',
            expiresAt: Date.now() + (Number(tokens.expires_in) || 300) * 1000,
            authMode: 'oidc',
        });

        const response = NextResponse.redirect(portalUrl(next, baseUrl), { status: 302 });
        response.cookies.set(TENANT_COOKIE, tenant.id, tenantCookieOptions());
        clearOidcState(response);
        await writeSession(response, session);
        return response;
    } catch (error) {
        if (error instanceof MissingTenantClaimError) {
            // Explicit 401 required by the spec: a token without becpg_url /
            // becpg_instance is not usable, and retrying login will not help.
            console.error('[auth] rejected token:', error.message);
            const response = NextResponse.json(
                { error: error.code, message: error.message, claim: error.claim },
                { status: 401 },
            );
            clearOidcState(response);
            return response;
        }
        const code2 = error instanceof OidcError ? error.code : 'callback_failed';
        console.error('[auth] callback failed:', error.message);
        return loginRedirect(request, code2);
    }
}
