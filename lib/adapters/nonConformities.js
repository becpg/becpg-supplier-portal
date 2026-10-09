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
import { invalidateApproval } from '@/lib/adapters/approval';
import { invalidateMonitorCache, requireMonitorAccess } from '@/lib/adapters/monitor';

/** The workflow beCPG files a supplier non-conformity through. */
const NC_WORKFLOW = 'activiti$nonConformityProcess';

/** `bpm:workflowPriority`: 1 high, 2 medium, 3 low. */
const PRIORITIES = Object.freeze([1, 2, 3]);

/** Beyond that a description is a document: attach it to the NC instead. */
const MAX_DESCRIPTION_LENGTH = 4000;
const MAX_BATCH_LENGTH = 100;

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
 * `POST /api/v1/monitor/quality/start` — starts a supplier non-conformity.
 *
 * @param {Object} params `{ session, ...input }` — see {@link toNcStartForm}
 * @returns {Promise<{started: boolean, workflowId: string|null}>} the workflow instance;
 *          the NC itself is filed by beCPG in the workflow's first step
 */
export async function startNonConformity(params = {}) {
    const { session, ...input } = params;
    await requireMonitorAccess(session);
    const form = toNcStartForm(input);
    const result = await postJson(`api/workflow/${NC_WORKFLOW}/formprocessor`, form, {
        session,
        skipAllowList: true,
    });
    // A new NC on a supplier moves its approval status and the quality counters.
    invalidateApproval(session);
    invalidateMonitorCache(session);
    const persisted = String(result?.persistedObject || '');
    const match = /id=([^,\]]+)/.exec(persisted);
    return { started: true, workflowId: match ? match[1] : null };
}
