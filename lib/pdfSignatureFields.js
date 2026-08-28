/**
 * Reading back **where beCPG decided the signature goes** (spec §9.2).
 *
 * ## Why this file exists at all
 *
 * The overlay of `components/signature/SignatureZones.js` must draw the real
 * rectangles or nothing — "no coordinates → no overlay, never a guess". So the
 * question is: where are the real ones?
 *
 * `PDFBoxServiceImpl.prepareForSignature()` computes them
 * (`addFields()`: anchor keyword or `fromLeftRatio`/`fromBottomRatio` of the
 * MediaBox, then `index * gap` along `direction`, clamped to the page) and
 * **writes them into the PDF** as a `PDSignatureField` plus its
 * `PDAnnotationWidget`, then `saveIncremental()`. The naming is fixed:
 * `<formattedUsername>-signature` on the signature page, `<formattedUsername>`
 * for the initials on every other page.
 *
 * There is **no webscript that returns those rectangles** — the only HTTP
 * surface of the module is
 * `becpg/signature/node/{store}/{id}/{checkout|create-session|checkin|cancel}`,
 * and none of the four answers geometry. Adding one would mean touching beCPG;
 * spec §7.2 keeps that strictly additive and it is not needed, because the
 * authoritative copy of the geometry is already in the bytes the portal
 * streams: the AcroForm of the *prepared working copy*.
 *
 * So the portal reads the widgets out of the document beCPG produced. That is
 * not a guess and not a re-computation — it is the same rectangle PDFBox will
 * fill when `signDocument()` runs. If the AcroForm holds no signature widget
 * (document not prepared yet, or prepared by DocuSign/YouSign which keep the
 * geometry on their side), this returns an empty list and the overlay simply
 * does not appear.
 *
 * ## Why server-side and not in the browser
 *
 * The viewer would also be able to call `page.getAnnotations()`. It is done here
 * instead so that `GET /api/v1/signature/{taskId}` — the documented contract —
 * carries the coordinates, and the client stays a renderer. It also keeps the
 * rule enforceable: the client is never in a position to invent a zone.
 *
 * @example
 * const { zones, pageCount } = await extractSignatureZones(bytes);
 * // zones[0] === { page: 2, type: 'signature', x: 0.60, y: 0.80, width: 0.32,
 * //                height: 0.09, unit: 'ratio', origin: 'top-left', … }
 */

/**
 * Above this, the PDF is not parsed: the overlay is a comfort, not a feature
 * worth loading 60 MB into the route handler for. Beyond it the viewer still
 * renders the document — it just gets no frames.
 */
export const MAX_ZONE_PARSE_BYTES = 32 * 1024 * 1024;

/** Suffix `PDFBoxServiceImpl.addFields()` appends to the signature field. */
const SIGNATURE_SUFFIX = '-signature';

/**
 * The class pdf.js needs to exist before it will even evaluate.
 *
 * Its display layer holds `const SCALE_MATRIX = new DOMMatrix()` at module
 * scope. In a browser that class is native; under Node pdf.js polyfills it from
 * `@napi-rs/canvas` — an OPTIONAL dependency, present in a developer's
 * `node_modules` and absent from the standalone image, where nothing statically
 * requires it for the tracer to see. The import therefore threw
 * `ReferenceError: DOMMatrix is not defined` in production and nowhere else, and
 * every signature document came back with `zonesReason: "pdfjs-unavailable"`:
 * the overlay had never once been drawn on the deployed portal.
 *
 * A placeholder is enough because NOTHING HERE RASTERISES. The document is
 * parsed for its widget rectangles, and `convertToViewportRectangle` is plain
 * arithmetic on arrays — the canvas code that would use this matrix is never
 * reached. Shipping a native canvas binary to satisfy one unused constant would
 * be the expensive way to fix it. Anyone who later renders a page server-side
 * has to install the real polyfill instead; this class cannot draw.
 */
class MissingDomMatrix {}

/**
 * pdf.js, loaded lazily and only on the server.
 *
 * The `legacy` build is the one that runs under Node without a DOM. The import
 * is dynamic so that a route that never sees a PDF never pays for it, and so
 * that a broken/absent pdfjs degrades into "no zones" instead of a 500.
 *
 * The placeholder goes in BEFORE the import, never after: a failed ESM
 * evaluation is cached, so a second import would replay the same error.
 *
 * @returns {Promise<Object|null>}
 */
async function loadPdfjs() {
    if (typeof globalThis.DOMMatrix === 'undefined') {
        globalThis.DOMMatrix = MissingDomMatrix;
    }
    try {
        return await import('pdfjs-dist/legacy/build/pdf.mjs');
    }
    catch (error) {
        // Silence here is what let the production overlay disappear unnoticed.
        console.warn('[signature] pdf.js could not be loaded:', (error && error.message) || error);
        return null;
    }
}

/**
 * `matthieuWF-signature` → signature, `matthieuWF` → initials.
 *
 * @param {string} fieldName
 * @returns {{type: string, recipient: string|null}}
 */
export function classifyField(fieldName) {
    const name = String(fieldName || '').trim();
    if (!name) {
        return { type: 'signature', recipient: null };
    }
    if (name.endsWith(SIGNATURE_SUFFIX)) {
        return { type: 'signature', recipient: name.slice(0, -SIGNATURE_SUFFIX.length) || null };
    }
    return { type: 'initials', recipient: name };
}

/**
 * One widget → one zone, in the units `SignatureZones` understands.
 *
 * The conversion goes through pdf.js' own viewport rather than by hand:
 * `convertToViewportRectangle()` applies the page rotation and the MediaBox
 * origin, which a naive `rect[1] / mediaBox.height` gets wrong on a rotated or
 * offset page — and a frame drawn 90° off is exactly the lie this component
 * must never tell.
 *
 * @param {Object} annotation a pdf.js annotation
 * @param {Object} viewport `page.getViewport({ scale: 1 })`
 * @param {number} pageNumber 1-based
 * @param {number} index
 * @returns {Object|null}
 */
function toZone(annotation, viewport, pageNumber, index) {
    const rect = annotation && annotation.rect;
    if (!Array.isArray(rect) || rect.length < 4) {
        return null;
    }

    const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(rect);
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    if (!(width > 0) || !(height > 0) || !(viewport.width > 0) || !(viewport.height > 0)) {
        return null;
    }

    const { type, recipient } = classifyField(annotation.fieldName);

    return {
        id: `${annotation.fieldName || type}-${pageNumber}-${index}`,
        page: pageNumber,
        type,
        recipient,
        // Ratios of the rendered page, top-left origin: the viewer scales the
        // page freely (fit-to-width, pinch zoom), so anything absolute would
        // have to be re-derived on every zoom step.
        x: left / viewport.width,
        y: top / viewport.height,
        width: width / viewport.width,
        height: height / viewport.height,
        unit: 'ratio',
        origin: 'top-left',
        pageWidth: viewport.width,
        pageHeight: viewport.height,
    };
}

/**
 * Extracts the signature and initials rectangles of a prepared PDF.
 *
 * Never throws: a document that is not a PDF, is encrypted, is corrupt or was
 * never prepared yields `{ zones: [] }`, and the caller renders no overlay.
 *
 * @param {ArrayBuffer|Uint8Array|Buffer} bytes the PDF, whole
 * @param {Object} [options]
 * @param {number} [options.maxPages=400] pages scanned for widgets
 * @returns {Promise<{zones: Array<Object>, pageCount: number, parsed: boolean,
 *                    reason: string|null}>}
 */
export async function extractSignatureZones(bytes, options = {}) {
    const empty = { zones: [], pageCount: 0, parsed: false, reason: null };
    if (!bytes) {
        return { ...empty, reason: 'no-content' };
    }

    // pdf.js rejects a Node `Buffer` by name, even though it *is* a Uint8Array
    // ("Please provide binary data as `Uint8Array`"). Re-wrapping the same
    // memory costs nothing and makes the function accept whatever the caller
    // has at hand.
    const data = ArrayBuffer.isView(bytes)
        ? new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
        : new Uint8Array(bytes);
    if (data.byteLength === 0) {
        return { ...empty, reason: 'empty' };
    }
    if (data.byteLength > MAX_ZONE_PARSE_BYTES) {
        return { ...empty, reason: 'too-large' };
    }

    const pdfjs = await loadPdfjs();
    if (!pdfjs) {
        return { ...empty, reason: 'pdfjs-unavailable' };
    }

    let document = null;
    try {
        document = await pdfjs.getDocument({
            data,
            // Nothing is rendered here: no fonts, no eval, no worker fetch.
            isEvalSupported: false,
            disableFontFace: true,
            useSystemFonts: false,
            useWorkerFetch: false,
            stopAtErrors: false,
        }).promise;

        const pageCount = document.numPages;
        const limit = Math.min(pageCount, options.maxPages || 400);
        const zones = [];

        for (let pageNumber = 1; pageNumber <= limit; pageNumber += 1) {
            // Sequential on purpose: pdf.js serialises on one worker anyway, and
            // a signature document is a handful of pages.
            const page = await document.getPage(pageNumber);
            const annotations = await page.getAnnotations({ intent: 'display' });
            const viewport = page.getViewport({ scale: 1 });

            annotations
                .filter((annotation) => annotation
                    && annotation.subtype === 'Widget'
                    && annotation.fieldType === 'Sig')
                .forEach((annotation, index) => {
                    const zone = toZone(annotation, viewport, pageNumber, index);
                    if (zone) {
                        zones.push(zone);
                    }
                });

            page.cleanup();
        }

        return { zones, pageCount, parsed: true, reason: zones.length ? null : 'no-signature-field' };
    }
    catch (error) {
        return { ...empty, reason: `parse-error: ${String(error && error.message).slice(0, 120)}` };
    }
    finally {
        if (document) {
            try {
                await document.destroy();
            }
            catch {
                // nothing to do: the document is being thrown away anyway
            }
        }
    }
}
