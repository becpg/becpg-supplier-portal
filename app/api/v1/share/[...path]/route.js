/**
 * `/api/v1/share/**` → `<becpgUrl>/share/**`
 *
 * **Last resort, on purpose.** The portal replaces Share; it must not depend on
 * it. This route exists only for the few resources that are rendered by Share
 * and by nothing else — today the signature view (`bSign.getSignatureView`) and
 * a handful of legacy report renderers (spec §5.1, §9.2). Everything else goes
 * through `/api/v1/becpg/**`.
 *
 * Two consequences of that status:
 *
 *   - the allow-list `ALLOWED_SHARE_PATH_PREFIXES` is deliberately narrow;
 *   - the portal holds an Alfresco ticket, **not a Share session**. The ticket
 *     is forwarded as `alf_ticket`, which the Share endpoints proxying to the
 *     repository accept; a Share page requiring a real Share session will
 *     answer with its login page, and that is expected. Do not work around it
 *     here — add the missing view to beCPG instead (architecture rule R1).
 *
 * Whenever a Share-rendered resource gains a beCPG equivalent, delete its usage
 * here. The day this route has no caller left, delete the route.
 */

import { proxyToShare } from '@/lib/becpg';
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
        return await proxyToShare(request, path);
    }
    catch (error) {
        return toApiResponse(error, {
            target: 'share',
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
