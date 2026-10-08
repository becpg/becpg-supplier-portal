'use client';

/**
 * **Consulting a deposited document without leaving the portal.**
 *
 * Until now a supplier could only download what had been filed: checking that
 * the right certificate went up meant saving a file, opening it in another
 * application, and coming back. On a phone that is three context switches to
 * answer "is this the current version?".
 *
 * ## What it renders, and what it refuses to pretend
 *
 * - **PDF** — the portal's own `PdfViewer` (pdf.js), the very component the
 *   signature flow uses. Nothing new is shipped to the browser: it is already in
 *   the bundle, lazily rendered, and it reads a same-origin URL.
 * - **Image** — a plain `<img>`. A certificate photographed with a phone is a
 *   common deposit and deserves no machinery.
 * - **Anything else** — Office files, archives, video — is **not** rendered.
 *   Faking a preview for a `.docx` would either need a server-side conversion
 *   the portal does not do, or an embedded viewer that shows a broken frame. The
 *   panel says plainly that this type cannot be previewed and offers the
 *   download, which is the honest answer.
 *
 * ## The bytes never come from Alfresco
 *
 * `downloadUrl` always points at `/api/v1/documents/{id}/content`, the portal's
 * own route: the session cookie authenticates it, and the browser never sees an
 * Alfresco URL or a ticket (AGENTS.md rule 6). The viewer takes that URL as it
 * is and builds nothing.
 */

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Modal } from '@/components/ui/Modal';
import { Button, Icon, Spinner } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMessages } from '@/lib/messages';

/**
 * Client-side only, exactly as `SignatureDocument` loads it and for the same
 * reason: pdf.js touches `DOMMatrix` and `canvas` on import, neither of which
 * exists in Node.
 *
 * A plain `import` here — which is what this file did first — is not caught by
 * `'use client'`: Next still renders client components on the server, so every
 * screen mounting a `DepositedDocuments` (a task, a product sheet) answered
 * **500 `ReferenceError: DOMMatrix is not defined`** before painting anything.
 * The panel is opened by a click and has nothing to pre-render, so deferring it
 * costs nothing and keeps pdf.js out of every other screen's first payload.
 */
const PdfViewer = dynamic(
    () => import('@/components/signature/PdfViewer').then((module) => module.PdfViewer),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-[70vh] items-center justify-center">
                <Spinner size={18} />
            </div>
        ),
    },
);

const LABELS = {
    fr: {
        title: 'Document',
        download: 'Télécharger',
        close: 'Fermer',
        unsupported: 'Aperçu indisponible pour ce type de fichier',
        unsupportedHint:
            'Ce format ne se prévisualise pas dans le navigateur. Téléchargez-le pour le consulter.',
        failed: 'Le document n’a pas pu être affiché',
        failedHint: 'Il reste téléchargeable.',
    },
    en: {
        title: 'Document',
        download: 'Download',
        close: 'Close',
        unsupported: 'No preview for this file type',
        unsupportedHint: 'This format cannot be previewed in the browser. Download it to read it.',
        failed: 'The document could not be displayed',
        failedHint: 'It can still be downloaded.',
    },
};

/**
 * What the panel can show, decided from the mimetype and, failing that, from the
 * extension.
 *
 * beCPG does not always fill `cm:content`'s mimetype — a document uploaded
 * through an older path can arrive as `application/octet-stream` — so the name
 * is the fallback rather than the other way round.
 *
 * @param {Object} document
 * @returns {'pdf'|'image'|'none'}
 */
export function previewKind(document) {
    const mimetype = String(document?.mimetype || '').toLowerCase();
    if (mimetype === 'application/pdf') {
        return 'pdf';
    }
    if (mimetype.startsWith('image/')) {
        return 'image';
    }

    const name = String(document?.name || '').toLowerCase();
    if (name.endsWith('.pdf')) {
        return 'pdf';
    }
    if (/\.(png|jpe?g|gif|webp|avif|bmp)$/.test(name)) {
        return 'image';
    }
    return 'none';
}

/**
 * @param {Object} props
 * @param {Object|null} props.document the document to show, null closes the panel
 * @param {Function} props.onClose
 */
export function DocumentViewer({ document, onClose }) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;

    const kind = useMemo(() => previewKind(document), [document]);
    const open = Boolean(document);
    const href = document?.downloadUrl || null;

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={document?.title || document?.name || labels.title}
            size="xl"
            bodyClassName="p-0"
            footer={
                <div className="flex w-full items-center justify-between gap-2">
                    {href ? (
                        <a
                            href={href}
                            download
                            className="inline-flex touch-target items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-[var(--becpg-blue)] underline hover:text-[var(--becpg-orange)]"
                        >
                            <Icon name="download" size={16} />
                            {labels.download}
                        </a>
                    ) : <span />}
                    <Button variant="outline" onClick={onClose}>
                        {labels.close}
                    </Button>
                </div>
            }
        >
            {!open ? null : kind === 'pdf' && href ? (
                // `PdfViewer` grows with its page count and has no scroller of
                // its own, so this box must be the one that scrolls: clipping it
                // left every page past the first unreachable. Its toolbar sticks
                // to the top of this box, and its page observer, rooted on the
                // viewport, sees through this clip like any other.
                <div className="h-[70vh] overflow-y-auto overscroll-contain">
                    <PdfViewer file={href} name={document.name} />
                </div>
            ) : kind === 'image' && href ? (
                <div className="flex max-h-[70vh] justify-center overflow-auto bg-[var(--becpg-grey)] p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element --
                        not next/image: the bytes sit behind an authenticated portal
                        route, so the optimiser would have to fetch them itself with
                        no session — and a deposited certificate is displayed once,
                        which is not what image optimisation is for. */}
                    <img
                        src={href}
                        alt={document.title || document.name || ''}
                        className="max-w-full object-contain"
                    />
                </div>
            ) : (
                <div className="p-4">
                    <EmptyState
                        variant="empty"
                        icon="visibility_off"
                        title={href ? labels.unsupported : labels.failed}
                        message={href ? labels.unsupportedHint : labels.failedHint}
                    />
                </div>
            )}
        </Modal>
    );
}
