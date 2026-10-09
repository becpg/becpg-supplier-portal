/**
 * `GET /api/v1/monitor/suppliers/{id}` — the supplier monitoring sheet
 * (spec §4.6.2, scorecard §4.6.4).
 *
 * `{id}` is the supplier nodeRef (`workspace://SpacesStore/…`, URL-encoded) or
 * its uuid. It is **checked against the caller's perimeter** with one db-afts
 * query before anything else is read: a nodeRef the session cannot see answers
 * 404, never a leak (spec §6.3).
 *
 * What the sheet returns:
 *
 *   - `supplier`      identity, family, sites, last activity;
 *   - `approval`      the derived status with the reasons and the offending
 *                     rows (spec §5.4.3) — cached, invalidated on upload;
 *   - `scorecard`     `pjt:scoreList` of the supplier's projects, weighted the
 *                     way `ExportSupplierScoreList` weights it (spec §4.6.4);
 *   - `completion`    the catalog scores of `bcpg:entityScore`;
 *   - `documents`     every document with its validity and derived status;
 *   - `products`      the entities branched under the supplier;
 *   - `subSuppliers`  the `bcpg:parentEntityRef` children (§2bis.1);
 *   - `projects`      the open referencing / renewal projects;
 *   - `activity`      exchange history — `bcpg:activityList` merged with the
 *                     forum thread, i.e. the same discussion Share shows;
 *   - `history`       **`available: false`** plus the OLAP dimensions and
 *                     measures it would take. Without the cube beCPG stores no
 *                     snapshot of past statuses or scores, so the endpoint
 *                     degrades instead of fabricating a series (spec §4.6.6).
 *
 * Access: monitoring groups only, `ExternalUser` gets 403 (adapter-enforced).
 * Cost: 1 perimeter guard + 7 approval queries (short-TTL cached) + 6 detail
 * queries + 1 forum read ≈ 15.
 *
 * Query: `refresh=true` to bypass the approval cache.
 *
 * @example
 * fetch(`/api/v1/monitor/suppliers/${encodeURIComponent(nodeRef)}`);
 */

import { NextResponse } from 'next/server';
import { getSupplierScorecard } from '@/lib/adapters/monitor';
import { AuthError, BadRequestError, toApiResponse } from '@/lib/errors';
import { isNodeRef } from '@/lib/becpg';
import { resolveLang } from '@/lib/lang';
import { getLiveSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, private' };

/**
 * Accepts a supplier identifier in any of the forms the UI may hold.
 *
 * @param {string} id
 * @returns {string} a nodeRef
 * @throws {BadRequestError}
 */
function toSupplierNodeRef(id) {
    const value = decodeURIComponent(String(id || '')).trim();
    if (!value) {
        throw new BadRequestError('Missing supplier identifier');
    }
    if (isNodeRef(value)) {
        return value;
    }
    if (/^[A-Za-z][A-Za-z0-9+.-]*\/[^/]+\/.+$/.test(value)) {
        return value.replace('/', '://');
    }
    if (/^[0-9a-fA-F-]{16,}$/.test(value)) {
        return `workspace://SpacesStore/${value}`;
    }
    throw new BadRequestError('Invalid supplier identifier');
}

/**
 * @param {Request} request
 * @param {{ params: Promise<{ id: string }> }} context
 * @returns {Promise<Response>}
 */
export async function GET(request, context) {
    const { id } = await context.params;
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }

        const params = new URL(request.url).searchParams;
        const payload = await getSupplierScorecard({
            session,
            supplierRef: toSupplierNodeRef(id),
            lang: await resolveLang(session),
            refresh: params.get('refresh') === 'true',
        });

        return NextResponse.json(payload, { status: 200, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/monitor/suppliers/[id]', method: 'GET', id });
    }
}
