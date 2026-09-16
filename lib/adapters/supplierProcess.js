/**
 * Starting a supplier referencing project — **the one composition, shared**.
 *
 * `becpg/supplier/send-to-supplier` looks like the endpoint for this and is not:
 * its Spring bean was dropped in 2022 (`176a72f026`) after the process took over,
 * and its descriptor, its class and its Share evaluator were left behind. What
 * Share actually submits is
 *
 *     POST becpg/workflow/start-process?script=create-supplier-project.js&nodeRefs=…
 *
 * whose body is the process form. Two of its fields cannot be invented by a
 * caller — the project name and the supplier accounts — because they are
 * **computed by beCPG**: `GET …start-process?defs=true&nodeRefs=…` evaluates the
 * `formFields` expressions of `process.json` (`bSupplier.extractSupplierProjectName`,
 * `bSupplier.extractSupplierAccountRefs`) for those very items and returns the
 * result. So the portal composes the two calls and adds nothing of its own but
 * the template — rule R1, and no business logic migrates out of beCPG (rule R2).
 *
 * That `defs=true` call is also a **second gate for free**: beCPG only returns the
 * definition when its `condition` matches the items and the caller holds its
 * `permissionGroup`. An entity beCPG refuses to send to a supplier produces no
 * definition, and the caller gets a 403 instead of starting anything.
 *
 * Server only.
 */

import { becpgJson, isNodeRef } from '@/lib/becpg';
import { ForbiddenError, UpstreamError } from '@/lib/errors';

const START_PROCESS_PATH = 'becpg/workflow/start-process';

/**
 * The repository script `process.json` names for "envoyer au fournisseur".
 *
 * Only a default: the script actually invoked is read back from the definition
 * beCPG returns, so an instance that renamed it in its own `process.json` keeps
 * working.
 */
const SUPPLIER_PROJECT_SCRIPT = 'create-supplier-project.js';

/** The form id `process.json` gives that definition. */
const SUPPLIER_PROCESS_FORM_ID = 'supplier-process';

/**
 * Resolves the requested process against the resolved list.
 *
 * @param {Object} resolution the answer of {@link resolveProcessTemplates}
 * @param {string} requested a configured or discovered id, or a nodeRef
 * @returns {string} the template nodeRef
 * @throws {ForbiddenError} when the template is not allowed
 * @throws {UpstreamError} when the list could not be resolved at all
 */
export function resolveTemplate(resolution, requested) {
    const { templates, source, discovery } = resolution;
    // Only the human-readable ids are worth showing back.
    const ids = [...templates.keys()].filter((key) => !isNodeRef(key));

    if (templates.size === 0) {
        // Distinguish "nothing is open here" from "we could not find out": the
        // first is a settled answer, the second is a transient failure and the
        // UI must not tell the supplier their request type does not exist.
        if (source === 'discovery' && discovery.available === false) {
            throw new UpstreamError('beCPG could not be asked which processes are open to suppliers', {
                details: { reason: discovery.reason, allowed: [] },
            });
        }
        throw new ForbiddenError('No process may be started from the supplier portal on this instance', {
            details: { allowed: [], source, reason: discovery.reason || null },
        });
    }
    const nodeRef = templates.get(String(requested || '').trim());
    if (!nodeRef) {
        throw new ForbiddenError('This process is not open to suppliers', {
            details: { allowed: ids, source },
        });
    }
    return nodeRef;
}

/**
 * Asks beCPG for the "envoyer au fournisseur" definition of one entity, with
 * its `formFields` already evaluated.
 *
 * @param {Object} params `{ session, entityNodeRef }`
 * @returns {Promise<{script: string, formFields: Object}>}
 * @throws {ForbiddenError} when beCPG offers no such process for this entity
 */
export async function supplierProcessDefinition(params) {
    const { session, entityNodeRef } = params;

    const payload = await becpgJson(START_PROCESS_PATH, {
        method: 'GET',
        query: { defs: 'true', nodeRefs: entityNodeRef },
        session,
        skipAllowList: true,
    });

    const definitions = Array.isArray(payload?.processDefinitions) ? payload.processDefinitions : [];
    const definition = definitions.find((entry) => entry?.formId === SUPPLIER_PROCESS_FORM_ID)
        || definitions.find((entry) => String(entry?.submissionUrl || '').includes(SUPPLIER_PROJECT_SCRIPT));

    if (!definition) {
        // beCPG's own `condition` / `permissionGroup` refused it. Its verdict
        // stands; the portal does not try to start it anyway.
        throw new ForbiddenError('beCPG does not offer a supplier process for this item', {
            details: { entityNodeRef },
        });
    }

    const script = new URLSearchParams(String(definition.submissionUrl || '').split('?')[1] || '')
        .get('script') || SUPPLIER_PROJECT_SCRIPT;

    const formFields = definition.formFields || {};

    /*
     * NO RESOLVED SUPPLIER ACCOUNT, NO SUBMISSION.
     *
     * `create-supplier-project.js` calls
     * `bSupplier.createSupplierProject(items, tpl, accounts)` where `accounts`
     * must be a `String[]`. When the field is missing, the script passes `""` —
     * a string — and Rhino finds no matching overload:
     *
     *     La méthode 'SupplierPortalHelper.createSupplierProject(
     *       [LScriptNode;, ScriptNode, string)' est introuvable
     *
     * Measured on the deployed portal by starting the referencing from the record of
     * a `bcpg:supplier`: 502, a message the user cannot read, no project created.
     * beCPG only evaluates the accounts for the entities the process applies to —
     * a product — and the portal submitted anyway.
     *
     * Refusing here makes the cause readable and avoids a server error for a
     * perfectly predictable situation. The beCPG fix (passing `[]` instead of
     * `""`) remains desirable; this one does not depend on it.
     */
    const accounts = String(formFields.assoc_bcpg_supplierAccountRef ?? '').trim();
    if (!accounts) {
        throw new ForbiddenError(
            'beCPG resolved no supplier account for this item: the referencing process '
            + 'applies to a product, not to this entity',
            { details: { entityNodeRef, reason: 'noSupplierAccount' } },
        );
    }

    return { script, formFields };
}

/**
 * Turns beCPG's evaluated `formFields` into the body `create-supplier-project.js`
 * reads.
 *
 * Association fields are submitted with the `_added` suffix — that is what the
 * Share object-finder control writes and what the script reads back. An empty
 * value is dropped rather than sent blank: the script splits it on `,` and would
 * build a `NodeRef("")`.
 *
 * @param {Object} formFields evaluated fields, as beCPG returned them
 * @param {string} tplNodeRef the resolved template
 * @returns {Object} the form data to submit
 */
export function buildFormData(formFields, tplNodeRef) {
    const body = {};
    for (const [key, value] of Object.entries(formFields || {})) {
        const text = value === null || value === undefined ? '' : String(value);
        if (key.startsWith('assoc_')) {
            if (text) {
                body[`${key}_added`] = text;
            }
            continue;
        }
        body[key] = text;
    }
    // The one field the portal owns: which template to instantiate.
    body.assoc_bcpg_entityTplRef_added = tplNodeRef;
    return body;
}

/**
 * Starts one project.
 *
 * @param {Object} params `{ session, entityNodeRef, tplNodeRef }`
 * @returns {Promise<string|null>} the created project nodeRef
 */
export async function startSupplierProject(params) {
    const { session, entityNodeRef, tplNodeRef } = params;

    const { script, formFields } = await supplierProcessDefinition({ session, entityNodeRef });

    const result = await becpgJson(START_PROCESS_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        query: { script, nodeRefs: entityNodeRef },
        body: JSON.stringify(buildFormData(formFields, tplNodeRef)),
        session,
        skipAllowList: true,
        // Starting a project is not idempotent: never replay it.
        retries: 0,
    });

    return result?.persistedObject || null;
}

