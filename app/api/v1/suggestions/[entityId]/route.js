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
import { upstreamLang } from '@/lib/becpg';
import { getSuggestions } from '@/lib/adapters/suggestions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * How long a suggestion run may take upstream.
 *
 * A suggestion run is not a lookup: becpg-ai fans out to every enabled plugin,
 * each of which may fetch a document, extract its text and call a model. The
 * generic `DEFAULT_TIMEOUT` of 30 s is sized for a webscript and is the wrong
 * order of magnitude here. Measured on dev-ai, on the becpg-ai side:
 * `DocumentExtractionSuggestionPlugin` alone took **38.5 s** and 29.0 s on two
 * runs, and `ClassificationSuggestionPlugin` 16.7 s — one plugin over the whole
 * request's former budget. The first call this route made against a single
 * untyped spreadsheet duly failed with `becpg-ai timed out after 30000ms`, while
 * the run completed perfectly well upstream.
 *
 * 180 s matches becpg-ai's own ceiling for a silent plugin, so the portal now
 * gives up at the same moment upstream does rather than well before it.
 */
const AI_SUGGESTIONS_TIMEOUT = 180000;

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
            /*
             * The portal's own switcher, not `Accept-Language`: the header is
             * Chrome's installation language, and becpg-ai writes the suggestion
             * titles and the field labels in whatever locale it is handed. An
             * English chrome on a French Chrome read « Champs extraits de la
             * fiche technique ». `upstreamLang` is the single answer to that
             * question — see it for what wins over what.
             */
            locale: url.searchParams.get('locale') || await upstreamLang(),
            session,
            timeout: AI_SUGGESTIONS_TIMEOUT,
            // A suggestion run is idempotent in the HTTP sense but *not* free:
            // every attempt re-reads the documents and re-calls the model. The
            // generic client would replay a merely-slow GET up to three times —
            // which is exactly what was observed against dev-ai, three full runs
            // billed for one request. A run is attempted once, and a failure is
            // reported as a failure.
            retries: 0,
        });

        const response = NextResponse.json(result);
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'suggestions', method: 'GET', entityId });
    }
}
