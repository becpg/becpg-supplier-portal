/**
 * `POST /api/v1/autocomplete/{formId}/{fieldId}` — contextual datasource.
 *
 * A POST, and not a GET, for one reason: beCPG autocomplete controls can depend
 * on **another field of the same form** (`parent` / `parentAssoc`), so the
 * request has to carry the current form values — plants filtered by the selected
 * supplier being the canonical case (doc/becpg-api-contracts.md §3).
 *
 * Body:
 * ```json
 * { "itemType": "bcpg:supplier",
 *   "listId": "plant",                       // when the field is a grid cell
 *   "entityNodeRef": "workspace://…",
 *   "q": "lyo", "page": 1, "pageSize": 25,
 *   "values": { "assoc_bcpg_supplier": "workspace://SpacesStore/…" } }
 * ```
 *
 * Response:
 * ```json
 * { "items": [ { "value": "workspace://…", "label": "Usine de Lyon",
 *                "cssClass": null, "metadata": { "code": "PL001" } } ],
 *   "total": 132, "page": 1, "pageSize": 25,
 *   "field": { "id", "name", "label", "control", "multiple", "dependsOn" } }
 * ```
 *
 * **The datasource URL is never read from the body.** It comes from the form
 * definition Share resolved, and it must live under `becpg/autocomplete/`
 * (`lib/adapters/autocomplete.js`). A supplier cannot turn this route into a
 * generic Alfresco reader.
 */

import { NextResponse } from 'next/server';
import { BadRequestError, toApiResponse } from '@/lib/errors';
import { requireSession } from '@/lib/becpg';
import { createContext } from '@/lib/adapters/wizardConfig';
import { autocomplete } from '@/lib/adapters/autocomplete';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * @param {Request} request
 * @param {{ params: Promise<{ formId: string, fieldId: string }> }} context
 * @returns {Promise<Response>}
 */
export async function POST(request, context) {
    const { formId, fieldId } = await context.params;
    try {
        const session = await requireSession();

        let body = {};
        const raw = await request.text();
        if (raw.trim()) {
            try {
                body = JSON.parse(raw);
            }
            catch {
                throw new BadRequestError('Expected a JSON body');
            }
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            throw new BadRequestError('Expected a JSON object');
        }

        const url = new URL(request.url);
        const ctx = createContext(session, {
            entityType: body.entityType || url.searchParams.get('entityType') || undefined,
            entityNodeRef: body.entityNodeRef || url.searchParams.get('entityNodeRef') || undefined,
            siteId: body.siteId || url.searchParams.get('siteId') || undefined,
            locale: body.locale || request.headers.get('accept-language') || undefined,
        });

        const result = await autocomplete(ctx, {
            formId,
            fieldId,
            itemType: body.itemType || url.searchParams.get('itemType'),
            listId: body.listId || url.searchParams.get('listId') || null,
            q: body.q ?? url.searchParams.get('q') ?? '',
            page: body.page ?? url.searchParams.get('page'),
            pageSize: body.pageSize ?? url.searchParams.get('pageSize'),
            values: body.values || {},
            entityNodeRef: ctx.entityNodeRef,
        });

        const response = NextResponse.json(result);
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'autocomplete', method: 'POST', formId, fieldId });
    }
}
