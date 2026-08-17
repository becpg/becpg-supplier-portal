/**
 * `POST /api/v1/process/start` — start an **authorised** process.
 *
 * ## Which templates may be started
 *
 * The upstream webscript instantiates whatever template it is handed. Left
 * open, a supplier could start *any* project template of the repository — an
 * internal audit, a change-control workflow, anything. beCPG would let them: the
 * template is readable and starting a project is a legitimate operation for an
 * authenticated user. The restriction is a **portal** decision, so it belongs
 * here (spec §6.2: the portal may narrow beCPG's verdict, never widen it).
 *
 * The list itself is no longer a nodeRef pasted into configuration. It is
 * resolved by `lib/adapters/processTemplates.js`, which asks beCPG for the
 * templates carrying the product's own supplier marker — type `pjt:project` +
 * aspect `bcpg:entityTplAspect` + aspect `bcpg:suppliersAspect`, enabled — the
 * exact datasource Share's "envoyer au fournisseur" dialog uses. **Precedence:
 * `PORTAL_PROCESS_TEMPLATES` wins whenever it is set** (and then no discovery
 * query is issued at all, so a pinned installation behaves byte for byte as
 * before); discovery fills the list only when the variable is absent.
 *
 * Deny-by-default is unchanged either way: an empty resolved list starts
 * nothing, and a request naming a template that is not in the list is a 403 —
 * whether the list came from the environment or from discovery.
 *
 * ## Which webscript actually starts it
 *
 * `becpg/supplier/send-to-supplier` (`SupplierPortalWebScript`) is **broken in
 * the product**: the class is not declared as a Spring bean, so Alfresco answers
 * 500 on every call. The working entry point — the one Share's own dialog
 * submits to — is
 *
 *     POST becpg/workflow/start-process?script=create-supplier-project.js&nodeRefs=…
 *
 * whose body is the Share form data. Two of its fields cannot be invented by the
 * portal: the project name and the supplier accounts to assign. They are
 * **computed by beCPG**, not here: `GET …start-process?defs=true&nodeRefs=…`
 * evaluates the `formFields` expressions of `process.json`
 * (`bSupplier.extractSupplierProjectName`, `bSupplier.extractSupplierAccountRefs`)
 * for those very items and returns the result. The portal composes the two calls
 * and adds nothing of its own but the template — rule R1, and no business logic
 * migrates out of beCPG (rule R2).
 *
 * That `defs=true` call is also a **second gate for free**: beCPG only returns
 * the definition when its `condition` matches the items and the caller passes
 * its `permissionGroup`. An entity beCPG refuses to send to a supplier produces
 * no definition, and the portal answers 403 instead of starting anything.
 *
 * Body:
 * ```json
 * { "process": "supplier-referencing",       // or "tplNodeRef": "workspace://…"
 *   "entityNodeRef": "workspace://SpacesStore/…",
 *   "nodeRefs": ["workspace://…"] }          // batch, mutually exclusive with entityNodeRef
 * ```
 */

import { NextResponse } from 'next/server';
import { BadRequestError, ForbiddenError, PortalError, UpstreamError, toApiResponse } from '@/lib/errors';
import { becpgJson, isNodeRef, requireSession } from '@/lib/becpg';
import { resolveProcessTemplates } from '@/lib/adapters/processTemplates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Most entities a single call may push to a supplier. */
const MAX_BATCH = 50;

/** The webscript that starts a process — Share submits to this one too. */
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
function resolveTemplate(resolution, requested) {
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
async function supplierProcessDefinition(params) {
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
async function startOne(params) {
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

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function POST(request) {
    try {
        const session = await requireSession();

        let body;
        try {
            body = await request.json();
        }
        catch {
            throw new BadRequestError('Expected a JSON body');
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            throw new BadRequestError('Expected a JSON object');
        }

        const resolution = await resolveProcessTemplates({ session });
        const tplNodeRef = resolveTemplate(resolution, body.process || body.tplNodeRef || body.projectTpl);

        const nodeRefs = Array.isArray(body.nodeRefs)
            ? [...new Set(body.nodeRefs.filter((value) => isNodeRef(value)).map(String))]
            : [];
        const entityNodeRef = isNodeRef(body.entityNodeRef) ? body.entityNodeRef : null;

        if (nodeRefs.length === 0 && !entityNodeRef) {
            throw new BadRequestError('Provide entityNodeRef, or a non-empty nodeRefs array');
        }
        if (nodeRefs.length > MAX_BATCH) {
            throw new BadRequestError(`At most ${MAX_BATCH} entities can be sent in one call`);
        }

        // One project per entity — the semantics `send-to-supplier` had, which
        // looped over `nodeRefs`. `create-supplier-project.js` only ever reads
        // `items[0]`, so the loop lives here rather than upstream.
        const targets = nodeRefs.length > 0 ? nodeRefs : [entityNodeRef];
        const results = [];
        // The error objects, kept apart from `results`: those are serialised into
        // the response and must carry a code and a message, nothing more.
        const failures = [];
        for (const target of targets) {
            try {
                results.push({
                    entityNodeRef: target,
                    ok: true,
                    projectNodeRef: await startOne({ session, entityNodeRef: target, tplNodeRef }),
                });
            }
            catch (error) {
                // A batch never rolls back: report per target, like the
                // monitoring actions do.
                failures.push(error);
                results.push({
                    entityNodeRef: target,
                    ok: false,
                    error: error?.code || 'upstream',
                    message: error?.message || 'Could not start the process',
                });
            }
        }

        const started = results.filter((entry) => entry.ok);
        // A single-entity request that failed is a failure, not a 200 with a
        // silent `ok: false` the dialog would render as success.
        if (started.length === 0) {
            const first = failures[0];
            const details = { process: body.process || tplNodeRef, results };
            // A refusal is a settled answer, not a transient upstream failure.
            // Wrapping it in an UpstreamError answered 502 `error.network` — "the
            // connection failed, try again" — for something no retry can fix.
            // Measured on the reference instance the 03/08/2026: the test supplier account
            // starting a referencing gets "Accès refusé" out of
            // `create-supplier-project.js`, i.e. a 403, and the dialog told the
            // supplier it was a network problem.
            if (first instanceof PortalError && first.status >= 400 && first.status < 500) {
                throw new PortalError(first.message, {
                    status: first.status,
                    code: first.code,
                    messageKey: first.messageKey,
                    details,
                });
            }
            throw new UpstreamError(first?.message || results[0]?.message || 'Could not start the process', {
                details,
            });
        }

        const response = NextResponse.json({
            started: true,
            process: body.process || tplNodeRef,
            tplNodeRef,
            projectNodeRef: started[0].projectNodeRef,
            results,
            startedAt: new Date().toISOString(),
        });
        response.headers.set('Cache-Control', 'no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'process.start', method: 'POST' });
    }
}

/**
 * `GET /api/v1/process/start` — the processes this instance lets a supplier
 * start. Lets the UI render exactly the buttons that will work.
 *
 * Always 200 with a state, never a 500: `source` says where the list came from
 * and `discovery` says what happened when it was resolved, so the dialog can
 * tell "nothing is open here" (`reason: 'none'`) from "we could not ask beCPG"
 * (`available: false`) instead of showing an empty select in both cases.
 *
 * @returns {Promise<Response>}
 */
export async function GET() {
    try {
        const session = await requireSession();
        const { processes, source, discovery } = await resolveProcessTemplates({ session });

        const response = NextResponse.json({ processes, source, discovery });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'process.start', method: 'GET' });
    }
}
