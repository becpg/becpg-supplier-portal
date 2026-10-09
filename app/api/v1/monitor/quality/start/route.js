/**
 * `POST /api/v1/monitor/quality/start` — starts a supplier non-conformity
 * through beCPG's `nonConformityProcess` workflow.
 *
 * Body: `{ supplier, product?, batch?, priority?, dueDate?, description }`.
 * Monitoring space only: a supplier account gets a 403.
 */

import { NextResponse } from 'next/server';
import { startNonConformity } from '@/lib/adapters/nonConformities';
import { AuthError, BadRequestError, toApiResponse } from '@/lib/errors';
import { getLiveSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, private' };

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function POST(request) {
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }
        let body;
        try {
            body = await request.json();
        }
        catch {
            throw new BadRequestError('Expected a JSON body');
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            throw new BadRequestError('Expected a JSON object');
        }
        const payload = await startNonConformity({ ...body, session });
        return NextResponse.json(payload, { status: 201, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/monitor/quality/start', method: 'POST' });
    }
}
