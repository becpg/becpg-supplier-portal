/**
 * `POST /api/v1/entities/{id}/update-request` — the supplier asks for the update
 * of one of its validated sheets, or of its supplier record.
 *
 * Body: `{ "template": "workspace://SpacesStore/…", "reason": "New production site" }`,
 * the template being one `GET /api/v1/process/start` offers. Answers 201 with
 * `{ project, entity }`, `entity` being the working copy to file a new
 * technical sheet on. See `lib/adapters/updateRequest.js`.
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, BadRequestError, toApiResponse } from '@/lib/errors';
import { createBecpgClient } from '@/lib/adapters/session';
import { requestSupplierUpdate } from '@/lib/adapters/updateRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * @param {Request} request
 * @param {{ params: Promise<{ id: string }> }} context
 * @returns {Promise<Response>}
 */
export async function POST(request, context) {
    const { id } = await context.params;
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
        const result = await requestSupplierUpdate({
            client: createBecpgClient(session),
            entityId: id,
            template: body?.template,
            reason: body?.reason,
        });
        return NextResponse.json(result, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    }
    catch (error) {
        return toApiResponse(error, {
            route: '/api/v1/entities/[id]/update-request',
            method: 'POST',
            entity: String(id || '').slice(0, 80),
        });
    }
}
