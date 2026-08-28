/**
 * Drawing the supplier's mark into the boxes beCPG prepared (spec §9.2).
 *
 * ## Why the portal has to draw it at all
 *
 * `PDFBoxServiceImpl.signDocument()` builds its `SignatureOptions` **without**
 * `setVisualSignature`: it produces a detached PKCS#7 and a timestamp, and adds
 * nothing you can see. In Share, what fills the boxes is Apryse WebViewer, in
 * the browser: the supplier clicks each widget, the mark is placed as an
 * annotation, and `getFileData({ xfdfString, INCREMENTAL })` bakes it into the
 * bytes before they are uploaded (`artworks-viewer.js`). The cryptographic
 * signature then runs over a document that already carries the visual.
 *
 * The portal had no equivalent step, so a sheet signed from it came back
 * cryptographically valid with eleven empty frames — and the drawing the
 * supplier had just made was posted and dropped. This module is that missing
 * step, done server-side because the browser never touches Alfresco (rule 6).
 *
 * ## The rectangles are read here, not passed in
 *
 * `lib/pdfSignatureFields.js` extracts the same widgets for the *overlay*, in
 * viewport ratios. Nothing of that is reused: the rectangle is read again from
 * the AcroForm, in PDF user space, which is the space `drawImage` writes in.
 * Converting ratios back would be a second chance to be wrong about rotation,
 * on the one operation that leaves a permanent trace in a signed document.
 *
 * The two files agree on ONE thing, and it is the naming: `classifyField()` —
 * `<user>-signature` is the signature, `<user>` alone is the initials — is
 * imported from there rather than restated.
 */

import { PDFDocument, PDFSignature, degrees } from 'pdf-lib';
import { classifyField } from '@/lib/pdfSignatureFields';

/**
 * A mark bigger than this is not a signature, it is an attack surface: the
 * image is decoded server-side, and a supplier can post whatever they like.
 */
export const MAX_MARK_BYTES = 2 * 1024 * 1024;

/** Room left inside the widget so the ink never touches its border. */
const PADDING_RATIO = 0.06;

/**
 * The bytes of a `data:image/png;base64,…`, validated.
 *
 * PNG only, and the magic number is checked rather than the declared type: the
 * `data:` prefix is written by the caller's browser and proves nothing.
 *
 * @param {string} dataUrl
 * @returns {Uint8Array|null} `null` when there is nothing usable to draw
 */
export function markBytes(dataUrl) {
    const value = String(dataUrl || '');
    const comma = value.indexOf(',');
    if (comma === -1 || !value.slice(0, comma).includes('base64')) {
        return null;
    }
    const bytes = Buffer.from(value.slice(comma + 1), 'base64');
    if (bytes.length === 0 || bytes.length > MAX_MARK_BYTES) {
        return null;
    }
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return png.every((byte, index) => bytes[index] === byte) ? new Uint8Array(bytes) : null;
}

/**
 * The image, centred inside the widget and never distorted.
 *
 * A signature stretched to the box's proportions stops looking like the one the
 * supplier drew, which is the only thing it has going for it.
 *
 * @param {{x: number, y: number, width: number, height: number}} rect user space
 * @param {number} imageWidth
 * @param {number} imageHeight
 * @returns {{x: number, y: number, width: number, height: number}}
 */
function fitInto(rect, imageWidth, imageHeight) {
    const padding = Math.min(rect.width, rect.height) * PADDING_RATIO;
    const boxWidth = Math.max(rect.width - 2 * padding, 1);
    const boxHeight = Math.max(rect.height - 2 * padding, 1);
    const scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
    const width = imageWidth * scale;
    const height = imageHeight * scale;
    return {
        x: rect.x + (rect.width - width) / 2,
        y: rect.y + (rect.height - height) / 2,
        width,
        height,
    };
}

/**
 * Where to anchor a box so it fills `placed` once the page rotation is applied.
 *
 * `drawImage` writes in user space and rotates around the anchor, while the
 * reader sees the page turned by `/Rotate`. Drawing a mark 90 degrees off would
 * be worse than not drawing it, so the four cases are written out rather than
 * assumed to be zero.
 *
 * @param {{x: number, y: number, width: number, height: number}} placed
 * @param {number} rotation 0, 90, 180 or 270
 * @returns {{x: number, y: number, width: number, height: number, rotate: Object}}
 */
function orient(placed, rotation) {
    const { x, y, width, height } = placed;
    if (rotation === 90) {
        return { x: x + width, y, width: height, height: width, rotate: degrees(90) };
    }
    if (rotation === 180) {
        return { x: x + width, y: y + height, width, height, rotate: degrees(180) };
    }
    if (rotation === 270) {
        return { x, y: y + height, width: height, height: width, rotate: degrees(270) };
    }
    return { x, y, width, height, rotate: degrees(0) };
}

/**
 * Every signature widget of the document, with the page it sits on.
 *
 * @param {Object} pdf a loaded `PDFDocument`
 * @returns {Array<Object>} `[{ page, rect, type, recipient }]`
 */
function signatureWidgets(pdf) {
    const pages = pdf.getPages();
    const widgets = [];

    for (const field of pdf.getForm().getFields()) {
        // Tested with `instanceof` and not on a class name: the server bundle is
        // minified, and a name comparison would start answering false the day the
        // build decides to rename that class.
        if (!(field instanceof PDFSignature)) {
            continue;
        }
        const { type, recipient } = classifyField(field.getName());

        for (const widget of field.acroField.getWidgets()) {
            const rectangle = widget.getRectangle();
            const reference = widget.P();
            const index = pages.findIndex((page) => page.ref === reference);
            if (index === -1 || !(rectangle.width > 0) || !(rectangle.height > 0)) {
                continue;
            }
            widgets.push({ page: pages[index], rect: rectangle, type, recipient });
        }
    }

    return widgets;
}

/**
 * Draws the supplier's marks into the prepared document.
 *
 * Whatever is missing is left alone: a document with no signature widget comes
 * back untouched and `stamped: 0`, and the caller decides what that means. It is
 * never an error here — a deliverable prepared by DocuSign or YouSign keeps its
 * geometry on the provider's side and has nothing for us to fill.
 *
 * @param {ArrayBuffer|Uint8Array|Buffer} bytes the prepared working copy
 * @param {Object} marks
 * @param {string} [marks.signature] `data:image/png;base64,…`
 * @param {string} [marks.initials] `data:image/png;base64,…`, defaults to the signature
 * @returns {Promise<{bytes: Uint8Array|null, stamped: number, widgets: number}>}
 *   `bytes` is `null` when nothing was drawn, so the caller uploads nothing
 */
export async function stampSignatureMarks(bytes, marks = {}) {
    const signature = markBytes(marks.signature);
    const initials = markBytes(marks.initials) || signature;
    if (!signature && !initials) {
        return { bytes: null, stamped: 0, widgets: 0 };
    }

    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const widgets = signatureWidgets(pdf);
    if (widgets.length === 0) {
        return { bytes: null, stamped: 0, widgets: 0 };
    }

    const images = new Map();
    const imageFor = async (mark) => {
        if (!images.has(mark)) {
            images.set(mark, await pdf.embedPng(mark));
        }
        return images.get(mark);
    };

    let stamped = 0;
    for (const widget of widgets) {
        const mark = widget.type === 'initials' ? initials : signature;
        if (!mark) {
            continue;
        }
        const image = await imageFor(mark);
        const rotation = ((widget.page.getRotation().angle % 360) + 360) % 360;
        const placed = fitInto(widget.rect, image.width, image.height);
        widget.page.drawImage(image, orient(placed, rotation));
        stamped += 1;
    }

    if (stamped === 0) {
        return { bytes: null, stamped: 0, widgets: widgets.length };
    }

    /*
     * Apryse saves incrementally, appending the marks after the prepared bytes.
     * pdf-lib cannot: `save()` rewrites the file. The signature fields and their
     * rectangles survive that rewrite — they are ordinary AcroForm objects — and
     * PDFBox signs whatever it is handed afterwards, incrementally, so the
     * cryptographic act still covers exactly what the supplier saw. Object
     * streams stay off so the result reads like the document PDFBox produced.
     */
    const saved = await pdf.save({ useObjectStreams: false });
    return { bytes: saved, stamped, widgets: widgets.length };
}
