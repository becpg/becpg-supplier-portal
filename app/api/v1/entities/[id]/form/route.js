/**
 * `GET /api/v1/entities/{id}/form` — the **Share form** of one entity, read only.
 *
 * ## Why this exists
 *
 * The product sheet used to take its properties from the wizard's `form` step.
 * When a configuration declares no such step — and the default one does not for
 * every type — the sheet fell back to printing the raw `attributes` of
 * `/entities/{id}`: every qname as it comes out of the repository, ordered
 * alphabetically, labelled by a client-side prettifier. That produced « Branch
 * From Entity », « Product Hierarchy1 », « Entity Tpl Ref » on a French screen,
 * with the branch plumbing shown and the business fields buried.
 *
 * Share never has that problem: it asks the repository for the form of the
 * node's type and renders what comes back — the fields the administrator
 * configured, in the configured order, grouped in the configured sets, with the
 * repository's own translated labels. This route does exactly that, for any
 * entity, with no wizard involved:
 *
 *   1. read the entity (type + values),
 *   2. `getFormDefinition({ itemType: <type>, mode: 'view' })` — the same call
 *      the wizard's form step makes, against the same endpoint,
 *   3. apply the values, resolve the `d:noderef` labels (Famille / Sous-famille).
 *
 * So the sheet shows the **client's** configuration, not the portal's idea of it,
 * and a field added in Share appears here without touching this code.
 *
 * The definition is returned in `view` mode: every field is forced read-only in
 * `getFormDefinition`, whatever the configuration says. This route reads.
 */

import { NextResponse } from 'next/server';
import { getLiveSession } from '@/lib/session';
import { AuthError, toApiResponse } from '@/lib/errors';
import { createBecpgClient } from '@/lib/adapters/session';
import { toNodeRef } from '@/lib/adapters/tasks';
import { getEntity } from '@/lib/adapters/wizard';
import { createContext } from '@/lib/adapters/wizardConfig';
import { applyValues, getFormDefinition, resolveNodeRefLabels } from '@/lib/adapters/forms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * @param {Request} request
 * @param {{ params: Promise<{ id: string }> }} context
 * @returns {Promise<Response>}
 */
export async function GET(request, context) {
    const { id } = await context.params;
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }

        const { searchParams } = new URL(request.url);
        const locale = searchParams.get('locale') || session.locale || 'fr';
        const nodeRef = toNodeRef(id);

        const entity = await getEntity(nodeRef, { session });
        const ctx = createContext(session, {
            entityType: entity.type,
            entityNodeRef: nodeRef,
            siteId: entity.siteId,
            locale,
        });

        const definition = await getFormDefinition(ctx, {
            itemType: entity.type,
            mode: 'view',
        });
        const filled = applyValues(definition, entity.attributes);

        const payload = {
            entity: {
                nodeRef,
                id: entity.id,
                type: entity.type,
                name: entity.name,
                code: entity.code,
            },
            // `partial` propagates the wizard's own warning: some properties are
            // missing because a reference target was refused, not because they
            // are empty. A sheet that silently drops fields is worse than one
            // that says it is incomplete.
            partial: entity.partial === true,
            definition: await resolveNodeRefLabels(filled, createBecpgClient(session), { lang: locale }),
        };

        const response = NextResponse.json(payload, { status: 200 });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/entities/[id]/form', method: 'GET', id });
    }
}
