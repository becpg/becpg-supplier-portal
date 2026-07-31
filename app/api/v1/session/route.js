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
import { getLiveSession, writeSession } from '@/lib/session';
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
        //
        // This MUST go through `writeSession`, not through `sessionCookie` + a
        // single `cookies.set`: a real OIDC session encrypts to ~5.4 kB, well past
        // the ~4 kB a browser accepts for one cookie, which is exactly why
        // `lib/session.js` chunks it across `becpg_portal_session.N`. Written as a
        // single cookie the browser drops it silently — no error, the renewed
        // ticket simply never persists — and `writeSession` is also what clears the
        // form (single or chunked) that is no longer in use, so the two can never
        // both be present with one of them stale.
        await writeSession(response, session);

        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/session', method: 'GET' });
    }
}
