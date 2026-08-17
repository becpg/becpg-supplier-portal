/**
 * `GET /api/v1/specs` — every cahier des charges applying to the caller's
 * products, read-only.
 *
 * **Why this exists next to `/entities/{id}/specs`.** The `/specs` screen needs
 * the union over the whole park, and `bcpg:productSpecifications` is a source
 * association: there is no query that goes from a specification back to the
 * products it applies to. The page therefore used to scan — one
 * `entities/{id}/specs` call per product, 60 products, on every visit. Measured
 * on the reference instance: 60 repository calls, ~750 ms. This route does the same work in
 * **two** calls (see {@link listSupplierSpecifications}): one listing that carries
 * the association, then one read per *distinct* specification.
 *
 * A specification the caller has no rights on is **not returned**. It is not a
 * filter for tidiness: the association names targets whose own ACL may refuse the
 * account, and listing one produced a row with no name and a download link that
 * 500s. The supplier sees the cahiers des charges they may open, and nothing else.
 *
 * Read-only by construction — the portal exposes no write path on a
 * specification. Download URLs go through the portal proxy so the Alfresco ticket
 * never reaches the browser (spec §6.1).
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, toApiResponse } from '@/lib/errors';
import { createBecpgClient } from '@/lib/adapters/session';
import { listSupplierSpecifications } from '@/lib/adapters/entities';

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

        const { searchParams } = new URL(request.url);
        const payload = await listSupplierSpecifications(createBecpgClient(session), {
            supplierNodeRef: searchParams.get('supplier') || undefined,
        });

        const response = NextResponse.json(payload, { status: 200 });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/specs', method: 'GET' });
    }
}
