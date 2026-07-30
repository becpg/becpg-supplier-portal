/**
 * `GET /api/v1/session` — tenant, logo, TEST flag, user, supplier(s), locale.
 *
 * The single call the shell makes on boot (spec §5.4). Composition, not proxy:
 * the JWT claims, the beCPG person (groups and capabilities) and the supplier(s)
 * derived from the user's projects/tasks are aggregated here — see
 * `lib/adapters/session.js` for the supplier-resolution strategy and why it is
 * the only one available.
 *
 * The payload goes through `toPublicSession()` / `toPublicTenant()`: the
 * Alfresco ticket and the OIDC tokens never reach the browser (spec §6.1).
 */

import { NextResponse } from 'next/server';
import { getLiveSession, sessionCookie } from '@/lib/session';
import { getTenant, resolveTenant } from '@/lib/tenant';
import { AuthError, toApiResponse } from '@/lib/errors';
import { DEFAULT_LANG, LANG_COOKIE, normalizeLang } from '@/config/messages';
import { buildSessionPayload, createBecpgClient } from '@/lib/adapters/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function GET(request) {
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }

        const tenant = getTenant(session.tenantId) || resolveTenant(request);
        const langCookie = request.cookies ? request.cookies.get(LANG_COOKIE) : null;
        const lang = normalizeLang(langCookie ? langCookie.value : DEFAULT_LANG);

        const payload = await buildSessionPayload({
            session,
            tenant,
            lang,
            client: createBecpgClient(session),
        });

        const response = NextResponse.json(payload, { status: 200 });
        response.headers.set('Cache-Control', 'private, no-store');

        // The ticket may have been renewed while resolving the session.
        const cookie = await sessionCookie(session);
        response.cookies.set(cookie.name, cookie.value, cookie.options);

        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/session', method: 'GET' });
    }
}
