/**
 * Starting a supplier non-conformity from the monitoring space.
 *
 * beCPG creates an NC by starting a workflow, never by creating the node: the
 * `${CreateNC}` service task of `nonConformityProcess` files the `qa:nc`, gives it
 * its number and copies the start form onto it (`CreateNC`, `NCWorkflowUtils`).
 * The portal starts that same workflow through Alfresco's workflow form
 * processor, with the fields of its start form (`ncwf:startTask`): supplier,
 * product, batch, priority, due date and description. The supplier is set at
 * the start, so the NC counts in its approval status as soon as beCPG files it.
 *
 * Server only.
 */

import { isNodeRef, postJson } from '@/lib/becpg';
import { BadRequestError } from '@/lib/errors';
import { idClause, searchNodes, toAftsDate } from '@/lib/adapters/documents';
import { invalidateApproval } from '@/lib/adapters/approval';
import { invalidateMonitorCache, requireMonitorAccess } from '@/lib/adapters/monitor';

/** The workflow beCPG files a supplier non-conformity through. */
const NC_WORKFLOW = 'activiti$nonConformityProcess';

/** `bpm:workflowPriority`: 1 high, 2 medium, 3 low. */
const PRIORITIES = Object.freeze([1, 2, 3]);

/** Beyond that a description is a document: attach it to the NC instead. */
const MAX_DESCRIPTION_LENGTH = 4000;
const MAX_BATCH_LENGTH = 100;

/** The type `qa:product` must point at: a product, never an NC or a supplier. */
const PRODUCT_TYPE = 'bcpg:product';

/** `YYYY-MM-DD`, the only due date shape accepted. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Checks what the browser sent and turns it into the start form's fields.
 *
 * @param {Object} input `{ supplier, product, batch, priority, dueDate, description }`
 * @returns {Object} the form processor body
 * @throws {BadRequestError}
 */
export function toNcStartForm(input = {}) {
    const supplier = String(input.supplier || '');
    if (!isNodeRef(supplier)) {
        throw new BadRequestError('A supplier nodeRef is required');
    }
    const product = input.product ? String(input.product) : null;
    if (product && !isNodeRef(product)) {
        throw new BadRequestError('The product must be a nodeRef');
    }
    const description = String(input.description || '').trim();
    if (!description || description.length > MAX_DESCRIPTION_LENGTH) {
        throw new BadRequestError(`A description of 1 to ${MAX_DESCRIPTION_LENGTH} characters is required`);
    }
    const priority = Number(input.priority || 2);
    if (!PRIORITIES.includes(priority)) {
        throw new BadRequestError('The priority must be 1, 2 or 3');
    }
    const dueDate = input.dueDate ? String(input.dueDate) : null;
    if (dueDate && !DATE_PATTERN.test(dueDate)) {
        throw new BadRequestError('The due date must be YYYY-MM-DD');
    }
    const batch = String(input.batch || '').trim().slice(0, MAX_BATCH_LENGTH);
    return {
        prop_bpm_workflowDescription: description,
        prop_bpm_workflowPriority: String(priority),
        assoc_bcpg_suppliers_added: supplier,
        ...(product ? { assoc_qa_product_added: product } : {}),
        ...(batch ? { prop_qa_batchId: batch } : {}),
        ...(dueDate ? { prop_bpm_workflowDueDate: dueDate } : {}),
    };
}

/**
 * Refuses a product that is not one. beCPG would refuse it too, but only after
 * starting the workflow, with an integrity error and a 500.
 *
 * @param {Object} session
 * @param {string|undefined} product a nodeRef, or nothing
 * @throws {BadRequestError}
 */
async function requireProduct(session, product) {
    if (!product) {
        return;
    }
    const { items } = await searchNodes(`TYPE:"${PRODUCT_TYPE}" AND ${idClause([product])}`, {
        session, fields: 'cm:name', maxResults: 1,
    });
    if (items.length === 0) {
        throw new BadRequestError('The product of a non-conformity must be a product');
    }
}

/** How far before the start the NC's creation date may fall (clock skew). */
const CREATION_MARGIN_MS = 60 * 1000;

/**
 * The NC the workflow has just filed for this supplier. The form processor
 * answers with the workflow instance only, and `CreateNC` runs in the same
 * transaction, so the NC is searchable as soon as the start returns.
 *
 * @param {Object} params `{ session, supplier, since }`
 * @returns {Promise<{nodeRef: string, name: string}|null>} null when it cannot be read
 */
async function findStartedNc({ session, supplier, since }) {
    const from = toAftsDate(new Date(since.getTime() - CREATION_MARGIN_MS));
    const { items } = await searchNodes(`TYPE:"qa:nc" AND cm:created:[${from} TO MAX]`, {
        session, fields: 'cm:name,cm:created,bcpg:suppliers', maxResults: 20,
    });
    const own = items
        .filter((node) => [].concat(node.attributes?.['bcpg:suppliers'] || [])
            .some((ref) => ref && (ref.id === supplier || `workspace://SpacesStore/${ref.id}` === supplier)))
        .sort((a, b) => String(b.attributes?.['cm:created'] || '').localeCompare(String(a.attributes?.['cm:created'] || '')));
    return own[0] ? { nodeRef: own[0].nodeRef, name: own[0].name } : null;
}

/**
 * `POST /api/v1/monitor/quality/start` — starts a supplier non-conformity.
 *
 * @param {Object} params `{ session, ...input }` — see {@link toNcStartForm}
 * @returns {Promise<{started: boolean, workflowId: string|null, nc: {nodeRef: string, name: string}|null}>}
 *          the workflow instance, and the NC beCPG filed in its first step when it can be read
 */
export async function startNonConformity(params = {}) {
    const { session, ...input } = params;
    await requireMonitorAccess(session);
    const form = toNcStartForm(input);
    await requireProduct(session, form.assoc_qa_product_added);
    const since = new Date();
    const result = await postJson(`api/workflow/${NC_WORKFLOW}/formprocessor`, form, {
        session,
        skipAllowList: true,
    });
    // A new NC on a supplier moves its approval status and the quality counters.
    invalidateApproval(session);
    invalidateMonitorCache(session);
    const persisted = String(result?.persistedObject || '');
    const match = /id=([^,\]]+)/.exec(persisted);
    const nc = await findStartedNc({ session, supplier: form.assoc_bcpg_suppliers_added, since })
        .catch((error) => {
            console.warn('[nc-start] the new NC could not be read back', error?.status);
            return null;
        });
    return { started: true, workflowId: match ? match[1] : null, nc };
}
