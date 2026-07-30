/**
 * `/api/v1/ai/**` → `<BECPG_AI_URL>/api/**`
 *
 * becpg-ai is authenticated with the **OIDC bearer token**, not with the
 * Alfresco ticket (doc/becpg-api-contracts.md §10). The token stays server-side
 * exactly like the ticket: it is read from the encrypted session cookie and
 * injected here, never handed to the browser.
 *
 * Reachable paths are limited to `ALLOWED_AI_PATH_PREFIXES`. When
 * `BECPG_AI_ENABLED=false` (or `BECPG_AI_URL` is unset) the route answers 503
 * with the `aiDisabled` code, which the UI uses to hide the suggestion panels.
 *
 * @example
 * fetch('/api/v1/ai/suggestions/abc-123')
 * fetch('/api/v1/ai/suggestions/apply', { method: 'POST', body: JSON.stringify(...) })
 */

import { proxyToAi } from '@/lib/becpg';
import { toApiResponse } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * @param {Request} request
 * @param {{ params: Promise<{ path: string[] }> }} context
 * @returns {Promise<Response>}
 */
async function handle(request, context) {
    const { path } = await context.params;
    try {
        return await proxyToAi(request, path);
    }
    catch (error) {
        return toApiResponse(error, {
            target: 'becpg-ai',
            method: request.method,
            path: Array.isArray(path) ? path.join('/') : String(path || ''),
        });
    }
}

/** @type {(request: Request, context: Object) => Promise<Response>} */
export async function GET(request, context) {
    return handle(request, context);
}

/** @type {(request: Request, context: Object) => Promise<Response>} */
export async function POST(request, context) {
    return handle(request, context);
}

/** @type {(request: Request, context: Object) => Promise<Response>} */
export async function PUT(request, context) {
    return handle(request, context);
}

/** @type {(request: Request, context: Object) => Promise<Response>} */
export async function DELETE(request, context) {
    return handle(request, context);
}
