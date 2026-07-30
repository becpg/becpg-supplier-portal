/**
 * `/api/v1/becpg/**` → `<becpgUrl>/alfresco/s/**`
 *
 * The main proxy. This is the portal's equivalent of Share's
 * `/share/proxy/alfresco/...` (spec §5.1): the browser talks only to this
 * route, and the Alfresco ticket never leaves the server.
 *
 * Guarantees enforced in `lib/becpg.js`:
 *
 *   - a valid session is required, otherwise 401;
 *   - the target path must match `ALLOWED_BECPG_PATH_PREFIXES`, otherwise 403;
 *   - the client query string is forwarded, but `alf_ticket` & co. are stripped
 *     from it before our own ticket is appended;
 *   - the request body is streamed, never buffered (large document uploads);
 *   - the session cookie is never forwarded upstream, and no upstream
 *     `Set-Cookie` is ever returned to the browser.
 *
 * beCPG remains the authority on permissions (spec §6.2): a 403 coming from
 * `SupplierSecurityPlugin` is passed through unchanged.
 *
 * ## Read-only, on purpose
 *
 * This route exposes **GET and HEAD only**. It is a passthrough: it does not know
 * which entity, which list or which step the call belongs to, so it cannot check
 * the wizard's read-only state — and `SupplierSecurityPlugin` cannot either,
 * because it grants write access per *entity* while a list is frozen per *list*
 * (`datalists[].state === "Valid"`). Leaving PUT/POST/DELETE open here meant one
 * `fetch()` from the browser console could delete a row of a list the customer
 * had validated, whatever the UI displayed.
 *
 * Every write therefore goes through a **composed** route that owns its business
 * rule — `PUT|POST|DELETE /api/v1/wizard/{entityId}/step/{stepId}` (guarded by
 * `assertStepWritable`), `/api/v1/documents`, `/api/v1/tasks/{id}/complete`,
 * `/api/v1/suggestions/apply`, `/api/v1/process/start`. Server-side composition
 * code is unaffected: it calls `becpgJson()` directly, not this route.
 *
 * A new browser-side write does not belong here. Add the composed route that can
 * state, and enforce, what makes the write legitimate.
 *
 * @example
 * fetch('/api/v1/becpg/becpg/remote/entity?nodeRef=workspace://SpacesStore/abc')
 */

import { proxyToBecpg } from '@/lib/becpg';
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
        return await proxyToBecpg(request, path);
    }
    catch (error) {
        return toApiResponse(error, {
            target: 'becpg',
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
export async function HEAD(request, context) {
    return handle(request, context);
}

// No POST / PUT / DELETE: see the header. Next answers 405 for the verbs a route
// does not export, which is the correct answer here.
