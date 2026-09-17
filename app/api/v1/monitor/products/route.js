/**
 * `GET /api/v1/monitor/products` — the products entrusted to a supplier, read
 * from the customer's side (#35846).
 *
 * The counterpart of `/api/v1/entities`, which answers "my products" for a
 * supplier: here the same population is read for the whole park, so a quality
 * or purchasing officer can see **what is due for renewal** rather than open one
 * supplier sheet after another.
 *
 * Query parameters:
 *   - `q` — free text on `cm:name`, `bcpg:code`, `bcpg:legalName`, `bcpg:erpCode`
 *   - `state` — `bcpg:productState` (`Valid`, `ToValidate`…)
 *   - `certifiedBefore` — an ISO date, or `none` for the products carrying no
 *     certificate date at all
 *   - `page`, `pageSize` (≤ 100)
 *
 * Closed to supplier accounts like every other monitoring route: the gate is
 * `requireMonitorAccess()`, called by the adapter itself.
 *
 * @example
 * fetch('/api/v1/monitor/products?certifiedBefore=2023-09-17');
 */

import { NextResponse } from 'next/server';
import { listMonitoredProducts } from '@/lib/adapters/monitor';
import { AuthError, toApiResponse } from '@/lib/errors';
import { getLiveSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, private' };

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

        const params = new URL(request.url).searchParams;
        const payload = await listMonitoredProducts({
            session,
            filters: {
                q: params.get('q') || '',
                state: params.get('state') || '',
                certifiedBefore: params.get('certifiedBefore') || '',
            },
            page: params.get('page'),
            pageSize: params.get('pageSize'),
        });

        return NextResponse.json(payload, { status: 200, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/monitor/products', method: 'GET' });
    }
}
