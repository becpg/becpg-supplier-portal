/**
 * `POST /api/v1/ai/{feature}` — the AI features of the monitoring space
 * (`lib/adapters/ai.js`, which documents each contract):
 *
 * | feature          | body                                                    |
 * |------------------|---------------------------------------------------------|
 * | `review-precheck`| `{ entity, reference?, taskId?, locale? }`              |
 * | `rewrite`        | `{ message, mode, targetLocale?, entity? }`             |
 * | `nc-assist`      | `{ nc, taskId?, taskType?, fieldNames?, locale? }`      |
 * | `drafts`         | `{ intent, targets: [{ nodeRef, locale?, items }], instructions?, dueDate? }` |
 *
 * An AI that is not deployed answers 200 `{ available: false, reason }`.
 * Monitoring space only: a supplier account gets a 403 (`requireMonitorAccess`).
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, BadRequestError, NotFoundError, toApiResponse } from '@/lib/errors';
import { draftMessages, ncAssist, reviewPrecheck, rewriteMessage } from '@/lib/adapters/ai';
import { upstreamLang } from '@/lib/becpg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FEATURES = {
    'review-precheck': (session, body, locale) => reviewPrecheck({ session, entity: body.entity, reference: body.reference, taskId: body.taskId, locale }),
    rewrite: (session, body) => rewriteMessage({ session, message: body.message, mode: body.mode, targetLocale: body.targetLocale, entity: body.entity }),
    'nc-assist': (session, body, locale) => ncAssist({
        session,
        nc: body.nc,
        taskId: body.taskId,
        taskType: body.taskType,
        fieldNames: Array.isArray(body.fieldNames) ? body.fieldNames.map(String) : null,
        locale,
    }),
    drafts: (session, body) => draftMessages({ session, intent: body.intent, targets: body.targets, instructions: body.instructions, dueDate: body.dueDate }),
};

/**
 * @param {Request} request
 * @param {{params: Promise<{feature: string}>}} context
 * @returns {Promise<Response>}
 */
export async function POST(request, context) {
    const { feature } = await context.params;
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }
        const run = FEATURES[feature];
        if (!run) {
            throw new NotFoundError('Unknown AI feature');
        }
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            throw new BadRequestError('A JSON body is required');
        }
        const locale = typeof body.locale === 'string' && body.locale ? body.locale : await upstreamLang();
        const response = NextResponse.json(await run(session, body, locale), { status: 200 });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/ai/[feature]', method: 'POST', feature });
    }
}
