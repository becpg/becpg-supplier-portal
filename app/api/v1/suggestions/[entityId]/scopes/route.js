/**
 * `GET /api/v1/suggestions/{entityId}/scopes?listIds=a,b,c` — how many AI
 * suggestions each step scope holds.
 *
 * Read by the « Contexte » panel only when the open step has nothing to
 * propose, so it can say where the proposals are instead of « rien à
 * proposer ». See `countSuggestionsByScope`.
 *
 * Response:
 * ```json
 * { "scopes": [ { "listId": "nutList", "available": true, "total": 2, "running": false } ] }
 * ```
 */

import { NextResponse } from 'next/server';
import { BadRequestError, toApiResponse } from '@/lib/errors';
import { requireSession, upstreamLang } from '@/lib/becpg';
import { countSuggestionsByScope } from '@/lib/adapters/suggestions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The same ceiling as a single read: the slowest scope bounds the answer. */
const AI_SUGGESTIONS_TIMEOUT = 180000;

/** A wizard has around ten steps; more scopes than this is not a wizard asking. */
const MAX_SCOPES = 20;

/** A datalist name or one of the portal's `View-*` pseudo-lists. */
const SCOPE_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

/**
 * The scopes asked for, validated: each one is forwarded upstream as a query
 * parameter.
 *
 * @param {URLSearchParams} searchParams
 * @returns {string[]}
 * @throws {BadRequestError}
 */
function readScopes(searchParams) {
    const scopes = [...new Set(String(searchParams.get('listIds') || '')
        .split(',')
        .map((scope) => scope.trim())
        .filter(Boolean))];
    if (scopes.length === 0 || scopes.length > MAX_SCOPES) {
        throw new BadRequestError(`Expected between 1 and ${MAX_SCOPES} list ids`);
    }
    const invalid = scopes.find((scope) => !SCOPE_PATTERN.test(scope));
    if (invalid) {
        throw new BadRequestError('Invalid list id');
    }
    return scopes;
}

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
        const result = await countSuggestionsByScope({
            entityId,
            scopes: readScopes(url.searchParams),
            locale: url.searchParams.get('locale') || await upstreamLang(),
            session,
            timeout: AI_SUGGESTIONS_TIMEOUT,
        });
        const response = NextResponse.json(result);
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'suggestions.scopes', method: 'GET', entityId });
    }
}
