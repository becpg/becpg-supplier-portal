/**
 * GET /api/auth/session
 *
 * Returns the public projection of the current session plus the tenant chrome
 * (label, logo, TEST flag) — 401 when there is no usable session.
 *
 * The response NEVER contains the Alfresco ticket nor the OIDC tokens: it is
 * built with `toPublicSession()` / `toPublicTenant()`, which strip them.
 *
 * The handler also refreshes the access token and the Alfresco ticket when they
 * are about to expire, and re-issues the session cookie when that happens — so
 * a client that polls this endpoint keeps its session alive.
 */

import { NextResponse } from 'next/server';
import {
    getSession,
    refreshSessionIfNeeded,
    toPublicSession,
    writeSession,
} from '@/lib/session';
import { getTenant, resolveTenant, toPublicTenant } from '@/lib/tenant';
import { DEFAULT_LANG, LANG_COOKIE, normalizeLang } from '@/config/messages';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, private' };

export async function GET(request) {
    const current = await getSession();
    if (!current) {
        return NextResponse.json(
            { error: 'unauthenticated', message: 'No session' },
            { status: 401, headers: NO_STORE },
        );
    }

    const tenant = getTenant(current.tenantId) || resolveTenant(request);
    const { session, changed } = await refreshSessionIfNeeded(current, { tenant });

    if (!session) {
        return NextResponse.json(
            { error: 'session_expired', message: 'Session expired' },
            { status: 401, headers: NO_STORE },
        );
    }

    const langCookie = request.cookies.get(LANG_COOKIE);
    const lang = normalizeLang(langCookie ? langCookie.value : DEFAULT_LANG);

    const response = NextResponse.json(
        {
            user: toPublicSession(session),
            tenant: toPublicTenant(tenant),
            isTest: Boolean(tenant && tenant.isTest),
            lang,
        },
        { status: 200, headers: NO_STORE },
    );

    if (changed) {
        // `writeSession`, never `sessionCookie` + a single `cookies.set`: a real
        // OIDC session is ~5.4 kB and does not fit in one cookie, so it is chunked
        // across `becpg_portal_session.N` (lib/session.js). A single oversized
        // cookie is dropped by the browser without a word, and the refreshed token
        // is lost — the session then dies at its old expiry instead of the new one.
        await writeSession(response, session);
    }

    return response;
}
