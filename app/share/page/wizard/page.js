/**
 * `/share/page/wizard` — **invariant I1 of spec §7.2, the routing half.**
 *
 * The deliverable URL beCPG stores on every supplier task is, and stays,
 *
 *     /share/page/wizard?id=supplier-{type}&nodeRef={entity}
 *
 * It is what `SupplierSecurityPlugin` matches (`SUPPLIER_WIZARD_PREFIX`) to grant
 * write access, and `SupplierPortalInitRepoVisitor` writes it into project
 * templates that are already instantiated in production. So the invariant is
 * two-sided:
 *
 *   1. **the portal never rewrites it** — `parseDeliverableUrl()` returns it
 *      verbatim and nothing in `components/` ever touches `task.url`;
 *   2. **the portal recognises it and routes internally** — which is this file.
 *      A supplier who follows the link in a beCPG notification, with the portal
 *      as host, must land inside the portal, not on a 404.
 *
 * Both portals therefore answer the same URL, which is exactly what §7.1 asks
 * for: a referencing started on Share can be finished here, and back again, with
 * no migration and no change on the beCPG side.
 *
 * ## Where it routes
 *
 * A deliverable URL names an **entity**, never a task — so the destination is
 * derived, not stored:
 *
 * | URL                                              | destination                          |
 * |--------------------------------------------------|--------------------------------------|
 * | `?id=supplier-…&nodeRef=…`                        | `/tasks?entity=<nodeRef>`            |
 * | `?id=supplier-…&nodeRef=…&mode=sign`              | `/tasks?entity=<nodeRef>&type=signature` |
 * | no usable `nodeRef`                               | `/tasks`                             |
 * | an `id` that is not `supplier-…`                  | 404 — not a supplier deliverable     |
 *
 * `/tasks` filtered on the entity is the honest destination **today**: it is the
 * screen that exists and it shows exactly the task(s) the deliverable belongs to.
 * The day `/tasks/[id]` lands (spec §4.2, "routage par type de tâche"), resolve
 * the task here and redirect straight to it — the recognition and the validation
 * below do not change.
 *
 * The redirect is a plain `redirect()`, not a rewrite: the browser URL becomes a
 * portal route while the **stored** deliverable URL in beCPG is untouched. I1
 * forbids rewriting the deliverable, not navigating away from it.
 *
 * Access: the middleware requires a session before this page renders, so an
 * anonymous click goes through `/login?next=/share/page/wizard?…` and comes back
 * here. The session check below is defence in depth.
 */

import { notFound, redirect } from 'next/navigation';
import { isNodeRef } from '@/lib/becpg';
import { getLiveSession } from '@/lib/session';
import { TASK_TYPES, parseDeliverableUrl } from '@/lib/adapters/tasks';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'beCPG — Portail Fournisseur',
};

/** The wizard ids this route accepts, i.e. `SUPPLIER_WIZARD_PREFIX` minus the path. */
const SUPPLIER_WIZARD_ID_PREFIX = 'supplier-';

/**
 * Rebuilds the deliverable URL from the query Next.js handed us, so the
 * recognition runs through the **same** parser the task adapter uses. There is
 * deliberately no second implementation of "is this a supplier wizard URL".
 *
 * @param {Object} params resolved `searchParams`
 * @returns {string} the deliverable URL, as beCPG stores it
 */
function rebuildDeliverableUrl(params) {
    const search = new URLSearchParams();
    for (const [name, value] of Object.entries(params || {})) {
        if (Array.isArray(value)) {
            value.forEach((entry) => search.append(name, String(entry)));
        }
        else if (value !== undefined && value !== null) {
            search.set(name, String(value));
        }
    }
    const query = search.toString();
    return query ? `/share/page/wizard?${query}` : '/share/page/wizard';
}

/**
 * @param {Object} props
 * @param {Promise<Object>} props.searchParams `{ id, nodeRef, mode… }`
 * @returns {Promise<never>} always redirects, or 404s
 */
export default async function ShareWizardDeliverablePage({ searchParams }) {
    const params = (await searchParams) || {};

    const session = await getLiveSession();
    if (!session) {
        redirect(`/login?next=${encodeURIComponent(rebuildDeliverableUrl(params))}`);
    }

    const parsed = parseDeliverableUrl(rebuildDeliverableUrl(params));

    // Only a *supplier* wizard deliverable belongs to this portal. Any other
    // `/share/page/wizard` URL is a Share internal screen, and answering it here
    // would be the portal pretending to be Share.
    if (!parsed.wizardId || !parsed.wizardId.startsWith(SUPPLIER_WIZARD_ID_PREFIX)) {
        notFound();
    }

    const entityNodeRef = parsed.entityNodeRef;
    if (!entityNodeRef || !isNodeRef(entityNodeRef)) {
        // The link is a supplier deliverable but carries no usable entity: the
        // task list is still the right place, unfiltered.
        redirect('/tasks');
    }

    const target = new URLSearchParams({ entity: entityNodeRef });
    if (parsed.type === TASK_TYPES.SIGNATURE) {
        target.set('type', TASK_TYPES.SIGNATURE);
    }
    redirect(`/tasks?${target.toString()}`);
}
