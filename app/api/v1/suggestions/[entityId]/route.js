/**
 * `GET /api/v1/suggestions/{entityId}` — AI suggestions and their confidence.
 *
 * Proxy onto becpg-ai `GET /api/suggestions/{entityId}` (contracts §10), with
 * one thing added on the way: the confidence **bucket**, computed once and
 * server-side so every screen shows the same badge (spec §4.4).
 *
 * ```
 * ≥ 90  high    applied, green, revocable
 * 70-89 medium  proposed, orange, to confirm
 * < 70  low     flagged, red, manual entry
 * absent null   NO badge — an absent confidence is never a low confidence
 * ```
 *
 * Query: `listId` (restrict to one datalist), `locale` (mandatory upstream, the
 * portal always has one).
 *
 * Response:
 * ```json
 * { "entityId": "…", "listId": null,
 *   "suggestions": [ { "id", "title", "description", "type", "family",
 *                      "documentId", "confidence", "confidenceLevel",
 *                      "autoApplicable", "suggestedChanges", "changes" } ],
 *   "summary": { "total", "high", "medium", "low", "unscored", "averageConfidence" } }
 * ```
 *
 * becpg-ai being optional, an instance that runs without it answers 503
 * `aiDisabled`; the UI hides the AI panels on that code rather than showing an
 * error.
 */

import { NextResponse } from 'next/server';
import { toApiResponse } from '@/lib/errors';
import { requireSession } from '@/lib/becpg';
import { getSuggestions } from '@/lib/adapters/suggestions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * @param {Request} request
 * @param {{ params: Promise<{ entityId: string }> }} context
 * @returns {Promise<Response>}
 */
export async function GET(request, context) {
    const { entityId } = await context.params;
    try {
        const session = await requireSession();
        const url = new URL(request.url);

        const result = await getSuggestions({
            entityId,
            listId: url.searchParams.get('listId') || undefined,
            locale: url.searchParams.get('locale')
                || (request.headers.get('accept-language') || '').split(',')[0]
                || process.env.PORTAL_DEFAULT_LANG
                || 'fr',
            session,
        });

        const response = NextResponse.json(result);
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'suggestions', method: 'GET', entityId });
    }
}
