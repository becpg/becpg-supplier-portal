/**
 * A supplier's request to update one of its validated sheets, or its supplier
 * record — `POST becpg/supplier/update-request`.
 *
 * Composition only (rule R1): beCPG checks that the caller is an account of the
 * supplier, that the template is a supplier template open to suppliers
 * (`GROUP_ExternalUser` may read it), refuses a second project while one is
 * open, and starts it — the whole workflow, the supplier going back through
 * the wizard. The portal validates the
 * shape of what the browser sent and forwards the verdict as it came — 403,
 * 409 or 400 stay what they are.
 *
 * Server only.
 */

import { isNodeRef } from '@/lib/becpg';
import { BadRequestError } from '@/lib/errors';
import { toNodeRef } from '@/lib/adapters/tasks';

/**
 * beCPG's own webscript. Its `becpg/supplier/` prefix is allow-listed, but it is a POST and
 * the browser proxy only relays GET and HEAD, so only this server-side call reaches it.
 */
const UPDATE_REQUEST_PATH = 'becpg/supplier/update-request';

/** Beyond that, a reason is a document: the supplier attaches it. */
export const MAX_REASON_LENGTH = 2000;

/**
 * The reason, trimmed, or a refusal when it is blank or too long.
 *
 * @param {*} value
 * @returns {string}
 * @throws {BadRequestError}
 */
export function readReason(value) {
    const reason = typeof value === 'string' ? value.trim() : '';
    if (!reason) {
        throw new BadRequestError('A reason is required');
    }
    if (reason.length > MAX_REASON_LENGTH) {
        throw new BadRequestError(`The reason exceeds ${MAX_REASON_LENGTH} characters`);
    }
    return reason;
}

/**
 * Starts the supplier project an update request opens.
 *
 * @param {Object} params
 * @param {Object} params.client `createBecpgClient(session)`
 * @param {string} params.entityId the sheet or supplier: uuid or nodeRef
 * @param {string} params.template nodeRef of the project template the supplier picked
 * @param {string} params.reason why the supplier asks
 * @returns {Promise<{project: string, entity: string|null}>} the project, and
 *          the working copy the new technical sheet is to be filed on
 * @throws {BadRequestError} on a malformed id or reason
 */
export async function requestSupplierUpdate({ client, entityId, template, reason }) {
    const nodeRef = toNodeRef(entityId);
    if (!isNodeRef(nodeRef)) {
        throw new BadRequestError('Invalid entity identifier');
    }
    if (!isNodeRef(template)) {
        throw new BadRequestError('Invalid project template');
    }
    const payload = await client.postJson(UPDATE_REQUEST_PATH, { nodeRef, template, reason: readReason(reason) });
    return {
        project: payload?.project ?? null,
        entity: payload?.entity ?? null,
    };
}
