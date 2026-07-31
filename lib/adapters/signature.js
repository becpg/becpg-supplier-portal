/**
 * The signature task, server side — **spec §9.2, ticket #35696**.
 *
 * ## The one thing to understand before reading the code
 *
 * beCPG signs a **checked-out working copy**, not the document you see in the
 * folder. `bSign.prepareForSignature()` checks the original out, writes the
 * signature and initials widgets into the *working copy*, and
 * `getSignatureView()` returns
 *
 *     artworks-viewer?nodeRef=<WORKING COPY>&mode=sign&taskId=…
 *
 * which is stored on the deliverable's `pjt:dlUrl`. Meanwhile
 * `deliverable.contents[]` — the `pjt:dlContent` association — still points at
 * the **original**, which has no AcroForm and no signature fields at all.
 *
 * Measured on the local instance, task
 * `workspace://SpacesStore/89e840ed-…` ("Signature de documents"):
 *
 * | source | node | AcroForm |
 * |---|---|---|
 * | `deliverable.url` (`nodeRef=`) | `cb1c7ba8-…` (working copy, 200 849 B) | **yes** — `matthieuWF` p.1, `matthieuWF-signature` p.2 |
 * | `deliverable.contents[0]` | `cce86b34-…` (original, 199 083 B) | no |
 *
 * So **the document to display is the one named in the view URL**. Showing
 * `contents[0]` would render a document without a single signature field, and
 * the overlay of spec §9.2 would have nothing to draw — while the supplier
 * believes he is looking at what he signs. That is the bug this adapter exists
 * to not have.
 *
 * ## What is proxied, and what is composed
 *
 * | need | how |
 * |---|---|
 * | the task, its deliverables, their URL and contents | proxy `becpg/project/task` |
 * | the state of the signature (`sign:status`) | proxy `api/metadata` on the document |
 * | where signature and initials land | the prepared PDF's own AcroForm (`lib/pdfSignatureFields.js`) |
 * | signing | proxy `becpg/project/complete/task` — `sign-document.js` is the task's post-deliverable script |
 *
 * Nothing here decides anything: `SignatureService` owns the geometry,
 * `PDFBoxServiceImpl.signDocument()` owns the cryptography, and
 * `SupplierSecurityPlugin` owns the permissions (spec §6.2, rule R2).
 */

import { NotFoundError } from '@/lib/errors';
import { isNodeRef, nodeRefToPath } from '@/lib/becpg';
import { completeTask, nodeRefUuid, toNodeRef } from '@/lib/adapters/tasks';
import { extractSignatureZones } from '@/lib/pdfSignatureFields';

/** `sign:status` values (`fr.becpg.artworks.signature.model.SignatureStatus`). */
export const SIGNATURE_STATUS = Object.freeze({
    INITIALIZED: 'Initialized',
    PREPARED: 'Prepared',
    READY_TO_SIGN: 'ReadyToSign',
    SIGNED: 'Signed',
});

/** Deliverable / task states that mean "there is nothing left to sign". */
const CLOSED_STATES = new Set(['Completed', 'Cancelled', 'Refused']);

/**
 * How many signable deliverables of one task are rendered.
 *
 * Each one costs a metadata read and — while the task is open — a full PDF
 * download parsed for its AcroForm. Two is the largest seen in the wild; the
 * cap is there so a pathological project cannot turn one GET into fifty.
 */
export const MAX_SIGNATURE_DOCUMENTS = 10;

/** Fully-qualified names returned by `api/metadata`. */
const PROP_SIGN_STATUS = '{http://www.becpg.fr/signature/1.0}status';
const PROP_SIGN_VALIDATION_DATE = '{http://www.becpg.fr/signature/1.0}validationDate';
const PROP_SIGN_RECIPIENTS_DATA = '{http://www.becpg.fr/signature/1.0}recipientsData';
const PROP_NAME = '{http://www.alfresco.org/model/content/1.0}name';

/** Outcomes the client branches on. Mirrors `SignatureFlow`'s `OUTCOME`. */
export const OUTCOME = Object.freeze({
    OPEN: 'open',
    SIGNED: 'signed',
    CANCELLED: 'cancelled',
    CLOSED: 'closed',
});

/**
 * Reads `bSign.getSignatureView()`'s output.
 *
 * Three shapes exist in the wild, and they are not interchangeable:
 *
 * - `artworks-viewer?nodeRef=…&mode=sign&taskId=…` — PDFBox, the offline path;
 * - an absolute `https://…` — DocuSign / YouSign, where the signature happens
 *   at the provider and the portal only links out;
 * - empty — the deliverable has not been prepared yet.
 *
 * The URL is read, never rewritten (invariant I1, spec §7.2).
 *
 * @param {string|null} url raw `pjt:dlUrl`
 * @returns {{raw: string|null, external: boolean, nodeRef: string|null, mode: string|null}}
 *
 * @example
 * parseSignatureViewUrl('artworks-viewer?nodeRef=workspace://SpacesStore/ab&mode=sign&taskId=');
 * // { raw: 'artworks-viewer?…', external: false, nodeRef: 'workspace://SpacesStore/ab', mode: 'sign' }
 */
export function parseSignatureViewUrl(url) {
    const raw = typeof url === 'string' ? url.trim() : '';
    if (!raw) {
        return { raw: null, external: false, nodeRef: null, mode: null };
    }
    if (/^https?:\/\//i.test(raw)) {
        return { raw, external: true, nodeRef: null, mode: null };
    }
    let params = new URLSearchParams();
    try {
        // A base is required for the relative URLs beCPG stores; never used.
        params = new URL(raw, 'https://portal.invalid').searchParams;
    }
    catch {
        params = new URLSearchParams();
    }
    const candidate = params.get('nodeRef');
    return {
        raw,
        external: false,
        nodeRef: candidate && isNodeRef(candidate) ? candidate : null,
        mode: params.get('mode') || null,
    };
}

/**
 * The raw task, straight from beCPG.
 *
 * @param {Object} client `createBecpgClient(session)`
 * @param {string} taskId nodeRef or uuid
 * @returns {Promise<Object>} `payload.task`
 * @throws {NotFoundError} when beCPG knows no such task
 */
export async function fetchSignatureTask(client, taskId) {
    const nodeRef = toNodeRef(taskId);
    const payload = await client.getJson('becpg/project/task', { query: { nodeRef } });
    const task = payload && payload.task;
    if (!task) {
        throw new NotFoundError('Task not found', { details: { task: nodeRef.slice(0, 80) } });
    }
    return { ...task, nodeRef: task.nodeRef || nodeRef };
}

/**
 * `sign:recipientsData` — who `prepareForSignature()` prepared the fields for.
 *
 * Written by `PDFBoxServiceImpl.updateSignatureInformation()`, shaped
 * `{"recipients":[{"username":"…","nodeRef":"…","preparationDate":"…",
 * "signatureDate":"…"}]}`. It is what lets a zone say *whose* signature it is
 * when several people sign the same document — the AcroForm only carries the
 * formatted username.
 *
 * @param {string|null} raw
 * @returns {Array<Object>}
 */
export function parseRecipientsData(raw) {
    if (!raw || typeof raw !== 'string') {
        return [];
    }
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed && parsed.recipients) ? parsed.recipients.filter(Boolean) : [];
    }
    catch {
        return [];
    }
}

/**
 * Node metadata **and whether beCPG would serve that node at all** — the two
 * answers come from the same call, and conflating them is how a supplier ends
 * up clicking a link that 404s (defect F4).
 *
 * Read through `api/metadata`, i.e. with the **user's own ticket**: a document
 * the supplier may not read answers 403/404 here, before a single byte is
 * streamed. The webscript is addressed by query string (`?nodeRef=…`); its
 * `/node/{store}/{id}` form answers 405 on 26.1 — measured, not assumed.
 *
 * `readable` is deliberately three-valued, because the two failures are not the
 * same fact and must not be treated alike:
 *
 * | outcome | `readable` | what the caller may conclude |
 * |---|---|---|
 * | metadata came back with a `type` | `true` | the node exists and this user may read it |
 * | metadata came back **empty** (`200 {}`) | `false` | the node is deleted or refused — measured on dev.becpg.fr for both a deleted working copy and an access-refused one |
 * | the call itself failed | `null` | *unknown* — a transient upstream failure must not hide a good document |
 *
 * Only `false` is a licence to withhold a link. `null` keeps the previous
 * behaviour: render it, and let Alfresco refuse the stream if it must.
 *
 * @param {Object} client
 * @param {string} nodeRef
 * @returns {Promise<{meta: Object|null, readable: boolean|null}>}
 */
export async function probeDocument(client, nodeRef) {
    if (!nodeRef || !isNodeRef(nodeRef)) {
        return { meta: null, readable: false };
    }
    try {
        const payload = await client.getJson('api/metadata', { query: { nodeRef } });
        const properties = (payload && payload.properties) || {};
        // A node that no longer exists answers `200 {}` — not a 404. Measured on
        // 26.1 against the working copy `sign-document.js` deletes after
        // signing, and again on dev.becpg.fr against a working copy the supplier
        // has lost read access to. Without this, "the document is gone" reads as
        // "the document has no signature status", and the caller never falls back.
        if (!payload || !payload.type) {
            return { meta: null, readable: false };
        }
        return {
            meta: {
                nodeRef,
                name: properties[PROP_NAME] || '',
                mimetype: (payload && payload.mimetype) || null,
                signStatus: properties[PROP_SIGN_STATUS] || null,
                validationDate: properties[PROP_SIGN_VALIDATION_DATE] || null,
                recipients: parseRecipientsData(properties[PROP_SIGN_RECIPIENTS_DATA]),
            },
            readable: true,
        };
    }
    catch {
        // The probe failed, not the node. Unknown — never reported as "gone".
        return { meta: null, readable: null };
    }
}

/**
 * {@link probeDocument} without the verdict, for callers that only want the
 * properties.
 *
 * @param {Object} client
 * @param {string} nodeRef
 * @returns {Promise<{nodeRef: string, name: string, mimetype: string|null,
 *                    signStatus: string|null, validationDate: string|null,
 *                    recipients: Array<Object>}|null>}
 */
export async function fetchDocumentMeta(client, nodeRef) {
    const { meta } = await probeDocument(client, nodeRef);
    return meta;
}

/**
 * Downloads the prepared PDF and reads its signature widgets.
 *
 * Buffered — unlike `/documents/{id}/content`, which streams — because pdf.js
 * needs the whole file. `MAX_ZONE_PARSE_BYTES` caps the cost, and every failure
 * degrades to "no zones", never to an error: the overlay is a comfort, the
 * document is the point.
 *
 * @param {Object} client
 * @param {string} nodeRef the **working copy**, the one carrying the AcroForm
 * @returns {Promise<{zones: Array<Object>, pageCount: number, reason: string|null}>}
 */
export async function fetchSignatureZones(client, nodeRef) {
    if (!nodeRef || !isNodeRef(nodeRef)) {
        return { zones: [], pageCount: 0, reason: 'no-document' };
    }
    try {
        const response = await client.fetch(`api/node/content/${nodeRefToPath(nodeRef)}`, {
            method: 'GET',
            format: null,
            headers: { Accept: 'application/pdf,*/*' },
        });
        if (!response.ok) {
            return { zones: [], pageCount: 0, reason: `http-${response.status}` };
        }
        const buffer = await response.arrayBuffer();
        const result = await extractSignatureZones(buffer);
        return { zones: result.zones, pageCount: result.pageCount, reason: result.reason };
    }
    catch (error) {
        return { zones: [], pageCount: 0, reason: `fetch-error: ${String(error && error.message).slice(0, 120)}` };
    }
}

/**
 * Picks the deliverable that carries the signature.
 *
 * An open one wins over a closed one — a task re-run keeps the old deliverable
 * around — and a deliverable with a URL wins over one without, because the URL
 * *is* what `getSignatureView()` produced.
 *
 * @param {Array<Object>} deliverables
 * @returns {Object|null}
 */
export function pickSignatureDeliverable(deliverables) {
    const list = Array.isArray(deliverables) ? deliverables.filter(Boolean) : [];
    return list.find((entry) => entry.url && !CLOSED_STATES.has(entry.state))
        || list.find((entry) => entry.url)
        || null;
}

/**
 * Portal URLs for a node. Never an Alfresco URL, never a ticket (spec §6.1).
 *
 * The `task` parameter is not decoration: it is how
 * `/api/v1/documents/{id}/content` authorises a node that is **not** in the
 * supplier's document perimeter — a checked-out working copy living in a
 * signature project never matches `+ASPECT:"bcpg:documentAspect"` under the
 * supplier's folders. See that route for the check it performs.
 *
 * @param {string} nodeRef
 * @param {string} taskNodeRef
 * @returns {{contentUrl: string, downloadUrl: string}}
 */
export function portalContentUrls(nodeRef, taskNodeRef) {
    const id = encodeURIComponent(nodeRefUuid(nodeRef));
    const task = encodeURIComponent(nodeRefUuid(taskNodeRef));
    return {
        contentUrl: `/api/v1/documents/${id}/content?task=${task}`,
        downloadUrl: `/api/v1/documents/${id}/content?task=${task}&download=1`,
    };
}

/**
 * Is there still something to sign?
 *
 * Read from the document first (`sign:status` is the signature module's own
 * truth), then the deliverable, then the task. beCPG stays the authority; the
 * portal only reports.
 *
 * @param {Object} params `{ task, deliverable, document }`
 * @returns {string} one of {@link OUTCOME}
 */
export function resolveOutcome({ task, deliverable, document }) {
    const signStatus = String((document && document.signStatus) || '');
    if (signStatus === SIGNATURE_STATUS.SIGNED) {
        return OUTCOME.SIGNED;
    }

    const deliverableState = String((deliverable && deliverable.state) || '');
    const taskState = String((task && task.state) || '');

    if (deliverableState === 'Cancelled' || taskState === 'Cancelled' || taskState === 'Refused') {
        return OUTCOME.CANCELLED;
    }
    if (deliverableState === 'Completed' || taskState === 'Completed') {
        return OUTCOME.SIGNED;
    }
    if (taskState && taskState !== 'InProgress' && taskState !== 'Planned' && taskState !== 'OnHold') {
        return OUTCOME.CLOSED;
    }
    return OUTCOME.OPEN;
}

/**
 * Everything `GET /api/v1/signature/{taskId}` answers.
 *
 * @param {Object} params
 * @param {Object} params.client `createBecpgClient(session)`
 * @param {string} params.taskId
 * @param {boolean} [params.withZones=true] set false to skip the PDF download
 * @returns {Promise<Object>} the response payload
 */
export async function getSignatureView({ client, taskId, withZones = true }) {
    const task = await fetchSignatureTask(client, taskId);
    const taskNodeRef = task.nodeRef;

    const deliverables = Array.isArray(task.deliverables) ? task.deliverables : [];
    const deliverable = pickSignatureDeliverable(deliverables);
    const view = parseSignatureViewUrl(deliverable && deliverable.url);

    // Capped like `signable` below, and for the same reason now that each one
    // costs a readability probe: a pathological project must not turn one GET
    // into fifty. Two is the largest seen in the wild.
    const originals = deliverables
        .flatMap((entry) => (Array.isArray(entry.contents) ? entry.contents : []))
        .filter((entry) => entry && isNodeRef(entry.nodeRef))
        .slice(0, MAX_SIGNATURE_DOCUMENTS);

    // One `api/metadata` per distinct node, at most. The originals and the
    // signable working copies overlap (the fallback below adopts an original),
    // and a task with two deliverables would otherwise probe the same node
    // twice on every render of the screen.
    const probes = new Map();
    const probe = (nodeRef) => {
        const key = String(nodeRef || '');
        if (!probes.has(key)) {
            probes.set(key, probeDocument(client, nodeRef));
        }
        return probes.get(key);
    };

    // **Every** deliverable that carries a signature view, not just the first.
    // `beCPG/signature/sign-document.js` is a *post-deliverable* script, so
    // completing the task runs it once per deliverable and signs them all —
    // measured on the local instance, task
    // `c928cfab-…` carries `sample_1.pdf` **and** `sample_2.pdf`, both prepared,
    // both signed by one completion. Showing only the first would have the
    // supplier attest a reading he never did, on a document he never saw.
    //
    // Closed ones are dropped **only when an open one exists**: a task re-run
    // keeps its old deliverable around, and showing it next to the live one
    // would be noise. Once everything is closed they are all that is left, and
    // dropping them would turn "already signed" — the most common revisit of
    // this screen (#34523) — into a 404.
    const withView = deliverables
        .map((entry) => ({ deliverable: entry, view: parseSignatureViewUrl(entry && entry.url) }))
        .filter((entry) => entry.view.nodeRef);
    const stillOpen = withView.filter((entry) => !CLOSED_STATES.has(entry.deliverable.state));
    const signable = (stillOpen.length ? stillOpen : withView).slice(0, MAX_SIGNATURE_DOCUMENTS);

    // The document to *display* is the one the signature view names — the
    // prepared working copy. `contents[]` is the original, kept as a reference
    // so the UI can offer the untouched file.
    const resolved = [];
    for (const entry of signable) {
        let { meta, readable } = await probe(entry.view.nodeRef);
        let renderNodeRef = entry.view.nodeRef;
        const contents = Array.isArray(entry.deliverable.contents) ? entry.deliverable.contents : [];

        // Once signed, `sign-document.js` copies the signed content back into
        // the original and **removes the working copy**. The view URL then
        // points at a node that no longer exists — so a "download the signed
        // document" button built from it would 404 at the worst possible
        // moment. Fall back to that deliverable's own original, which is where
        // the signed bytes now are.
        if (readable === false && contents.length && isNodeRef(contents[0].nodeRef)) {
            const fallback = await probe(contents[0].nodeRef);
            // Only *adopt* the original when it is actually readable: swapping a
            // dead nodeRef for a second dead nodeRef would just move the 404.
            if (fallback.readable !== false) {
                renderNodeRef = contents[0].nodeRef;
                meta = fallback.meta;
                readable = fallback.readable;
            }
        }
        resolved.push({ ...entry, meta, readable, renderNodeRef });
    }

    const primary = resolved.find((entry) => entry.deliverable === deliverable) || resolved[0] || null;
    const meta = primary ? primary.meta : null;
    const renderNodeRef = primary ? primary.renderNodeRef : null;

    if (!renderNodeRef && !view.external) {
        throw new NotFoundError('This task carries nothing to sign', {
            details: { task: String(taskNodeRef).slice(0, 80) },
        });
    }

    // Signed means signed *everywhere*: one document still `Prepared` keeps the
    // whole task open, because completing it will sign that one too.
    const everySigned = resolved.length > 0
        && resolved.every((entry) => entry.meta && entry.meta.signStatus === SIGNATURE_STATUS.SIGNED);
    const outcome = resolveOutcome({
        task,
        deliverable,
        document: everySigned ? { signStatus: SIGNATURE_STATUS.SIGNED } : null,
    });

    const recipients = (meta && meta.recipients) || [];

    const documents = [];
    for (const entry of resolved) {
        // beCPG said this node is gone or refused (F4). Everything below that
        // needs the bytes is skipped, and — the point of the whole exercise —
        // **no content URL is emitted**, so the UI has nothing to link to.
        const available = entry.readable !== false;

        // No point downloading a 30 MB PDF to draw frames on a screen that will
        // show "already signed".
        const zoneResult = withZones && entry.renderNodeRef && available && outcome === OUTCOME.OPEN
            ? await fetchSignatureZones(client, entry.renderNodeRef)
            : { zones: [], pageCount: 0, reason: withZones ? (available ? 'not-open' : 'unavailable') : 'skipped' };

        const entryRecipients = (entry.meta && entry.meta.recipients) || [];
        // With a single recipient the frame says "Signature" / "Paraphes" and
        // that is the whole truth. With several, whose is which matters, so the
        // zone carries the name — and only then, because a name on a solo
        // signature is noise on a 360px screen.
        const zones = entryRecipients.length > 1
            ? zoneResult.zones.map((zone) => ({ ...zone, label: zone.recipient || null }))
            : zoneResult.zones;

        documents.push({
            nodeRef: entry.renderNodeRef,
            // The deliverable's name first: the node itself is the checked-out
            // copy and is called "… (Copie de Travail).pdf", which is an
            // implementation detail the supplier has no reason to read.
            name: entry.deliverable.name || (entry.meta && entry.meta.name) || 'document.pdf',
            mimetype: (entry.meta && entry.meta.mimetype) || null,
            deliverableNodeRef: entry.deliverable.nodeRef || null,
            deliverableState: entry.deliverable.state || null,
            signStatus: (entry.meta && entry.meta.signStatus) || null,
            validationDate: (entry.meta && entry.meta.validationDate) || null,
            pageCount: zoneResult.pageCount || null,
            // The coordinates the overlay draws — and the only ones it ever
            // gets. Empty means "no overlay", never "guess something".
            zones,
            zonesSource: zones.length ? 'acroform' : null,
            zonesReason: zoneResult.reason,
            // `false` is a statement, not a guess: beCPG answered, and it
            // answered that this node cannot be read. The UI renders an
            // explicit "no longer available" panel for it instead of a viewer.
            available,
            // Explicitly `null` rather than absent: a client that reads
            // `document.downloadUrl` must see "there is none", not `undefined`.
            ...(available
                ? portalContentUrls(entry.renderNodeRef, taskNodeRef)
                : { contentUrl: null, downloadUrl: null }),
        });
    }

    const document = documents.find((entry) => entry.nodeRef === renderNodeRef) || documents[0] || null;

    return {
        taskId: taskNodeRef,
        task: {
            nodeRef: taskNodeRef,
            name: task.name || '',
            description: task.description || '',
            state: task.state || null,
            completionPercent: task.completionPercent || null,
            isRefusedEnabled: Boolean(task.isRefusedEnabled),
            entityNodeRef: task.entityNodeRef && task.entityNodeRef !== '#access_forbidden'
                ? task.entityNodeRef
                : null,
        },
        outcome,
        signature: {
            // Relative → the portal's Share proxy; absolute (DocuSign, YouSign)
            // → as-is, it is already authenticated on the provider's side.
            url: view.external ? view.raw : null,
            external: view.external,
            deliverableNodeRef: (deliverable && deliverable.nodeRef) || null,
            state: (deliverable && deliverable.state) || null,
            status: (meta && meta.signStatus) || null,
            zones: document ? document.zones : [],
            zonesSource: document ? document.zonesSource : null,
            zonesReason: document ? document.zonesReason : 'no-document',
            documentCount: documents.length,
            recipients: recipients.map((entry) => ({
                username: entry.username || null,
                preparedAt: entry.preparationDate || null,
                signedAt: entry.signatureDate || null,
            })),
        },
        // The first signable document, kept as a scalar because most tasks have
        // exactly one and every caller already reads it…
        document,
        // …and the whole set, because some do not. The gate counts these.
        documents,
        // The untouched originals, for "keep a copy". Same rule as `documents`:
        // an original beCPG will not serve is dropped rather than offered as a
        // link that answers 404 (F4). They were probed above at most once each.
        originals: (await Promise.all(originals.map(async (entry) => {
            const { readable } = await probe(entry.nodeRef);
            if (readable === false) {
                return null;
            }
            return {
                nodeRef: entry.nodeRef,
                name: entry.name || 'document',
                ...portalContentUrls(entry.nodeRef, taskNodeRef),
            };
        }))).filter(Boolean),
    };
}

/**
 * May this node be streamed as part of that task?
 *
 * The perimeter query of `/documents` cannot answer: a checked-out working copy
 * in a signature project is not a `bcpg:documentAspect` document under the
 * supplier's folders. The honest authorisation is the one stated here — *this
 * node is a deliverable of a task beCPG lets you read* — and it is checked with
 * the user's own ticket, so a supplier cannot name someone else's task either.
 *
 * @param {Object} client
 * @param {string} taskId
 * @param {string} nodeRef
 * @returns {Promise<{nodeRef: string, name: string}|null>} null when it is not
 */
export async function authorizeTaskDocument(client, taskId, nodeRef) {
    const wanted = toNodeRef(nodeRef);
    let task = null;
    try {
        task = await fetchSignatureTask(client, taskId);
    }
    catch {
        return null;
    }

    const deliverables = Array.isArray(task.deliverables) ? task.deliverables : [];
    for (const deliverable of deliverables) {
        const view = parseSignatureViewUrl(deliverable && deliverable.url);
        if (view.nodeRef === wanted) {
            return { nodeRef: wanted, name: deliverable.name || 'document.pdf' };
        }
        const contents = Array.isArray(deliverable && deliverable.contents) ? deliverable.contents : [];
        const match = contents.find((entry) => entry && toNodeRef(entry.nodeRef || '') === wanted);
        if (match) {
            return { nodeRef: wanted, name: match.name || 'document' };
        }
    }
    return null;
}

/**
 * Sign — that is, complete the signature task.
 *
 * There is no "sign" webscript to proxy: `beCPG/signature/sign-document.js` is
 * the task's **post-deliverable script**, so `bSign.signDocument()` runs when
 * the task completes. Inventing a signing endpoint in the portal would move
 * business logic out of beCPG (rule R2, spec §6.2) — and would sign a document
 * whose project state beCPG had not agreed to advance.
 *
 * Idempotency is decided **here, from beCPG's own state**, not from a token
 * store: if the document already says `Signed`, or the task is already closed,
 * the answer is a success with `alreadySigned: true`. That is what makes a
 * retry after a lost response safe — the second POST cannot sign twice, because
 * `sign-document.js` itself refuses (`if (document.properties["sign:status"] !=
 * "Signed")`) and because we do not even get there.
 *
 * @param {Object} params
 * @param {Object} params.client
 * @param {string} params.taskId
 * @param {string} [params.requestId] echoed back, for log correlation
 * @returns {Promise<Object>} `{ taskId, signed, alreadySigned, outcome, document, task }`
 */
export async function signSignatureTask({ client, taskId, requestId = null }) {
    const before = await getSignatureView({ client, taskId, withZones: false });

    if (before.outcome === OUTCOME.SIGNED || before.outcome === OUTCOME.CLOSED) {
        return {
            taskId: before.taskId,
            requestId,
            signed: true,
            alreadySigned: true,
            outcome: before.outcome,
            document: before.document,
            task: before.task,
        };
    }

    if (before.outcome === OUTCOME.CANCELLED) {
        return {
            taskId: before.taskId,
            requestId,
            signed: false,
            alreadySigned: false,
            cancelled: true,
            outcome: before.outcome,
            document: before.document,
            task: before.task,
        };
    }

    const completion = await completeTask(client, before.taskId);

    // Re-read: `signDocument()` ran inside the completion, so beCPG — not the
    // portal — is what says whether the document is signed now.
    let after = null;
    try {
        after = await getSignatureView({ client, taskId: before.taskId, withZones: false });
    }
    catch {
        // A completed signature task can become unreadable; the completion is
        // what matters and it returned.
        after = null;
    }

    return {
        taskId: before.taskId,
        requestId,
        signed: after ? after.outcome !== OUTCOME.OPEN : completion.completed,
        alreadySigned: false,
        outcome: after ? after.outcome : OUTCOME.SIGNED,
        signStatus: after && after.document ? after.document.signStatus : null,
        document: after ? after.document : before.document,
        task: after ? after.task : before.task,
    };
}
