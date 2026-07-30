/**
 * `GET /api/v1/documents/requirements` — "what I must provide, and by when".
 *
 * **No development, by design** (spec §5.4.2). `DocumentFormulationHandler`
 * already materialises the expected documents on the entity at every
 * formulation: it evaluates which `bcpg:documentType` apply (product type,
 * hierarchy, linked characteristics, subsidiary, plants, `docTypeFormula`),
 * creates the missing placeholders, computes `bcpg:documentIsMandatory` and
 * keeps `bcpg:documentState` at `Simulation` for as long as the document has not
 * been provided.
 *
 * So this endpoint is the **same rows as `/documents`, rendered as a
 * check-list** — grouped by entity, with `satisfied`, `blocking`, `dueDate` and
 * the action to take. It evaluates nothing and persists nothing.
 *
 * @example
 * fetch('/api/v1/documents/requirements?mandatory=true');
 */

import { NextResponse } from 'next/server';
import { listRequirements } from '@/lib/adapters/documents';
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
        const payload = await listRequirements({
            session,
            supplier: params.getAll('supplier'),
            entity: params.get('entity') || undefined,
            mandatoryOnly: params.get('mandatory') === 'true',
            config: params.get('noticeDays')
                ? { noticeDays: Number(params.get('noticeDays')) }
                : undefined,
        });

        return NextResponse.json(payload, { status: 200, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/documents/requirements', method: 'GET' });
    }
}
