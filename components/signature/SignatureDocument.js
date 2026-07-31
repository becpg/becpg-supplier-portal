'use client';

/**
 * One document of a signature task — **viewer, overlay and its own read gate**
 * (spec §9.2, ticket #35696).
 *
 * ## Why this is a component and not a loop inside `SignatureFlow`
 *
 * A signature task can carry **several** signable deliverables:
 * `beCPG/signature/sign-document.js` is a *post-deliverable* script, so one
 * completion of the task signs every one of them. Measured on the local
 * instance: task `c928cfab-…` carries `sample_1.pdf` **and** `sample_2.pdf`,
 * both `Prepared`, both signed by a single completion.
 *
 * Each of them therefore needs its own viewer, its own overlay and its own read
 * tracking — and `useReadTracking` is a hook, which cannot be called in a loop.
 * So one document is one component instance, and it reports its progress
 * upwards; `SignatureFlow` sums them and only then unlocks the button. The
 * attestation is only worth something if it covers everything that gets signed.
 *
 * @example
 * <SignatureDocument
 *     document={documents[0]} taskId={taskId} index={0} total={2}
 *     onProgress={handleProgress} onControls={handleControls} />
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { apiUrl } from '@/lib/client';
import { Icon, Spinner } from '@/components/ui/Button';
import { normalizeZones, zonePages, SignatureZones, ZoneLegend } from '@/components/signature/SignatureZones';
import { useReadTracking } from '@/components/signature/useReadTracking';

/**
 * pdf.js has no business running on the server: it is a browser renderer, it
 * touches `DOMMatrix` and `canvas`, and there is nothing meaningful to
 * pre-render. Loading it client-side also keeps it out of the first JS payload
 * of every other screen.
 */
const PdfViewer = dynamic(() => import('@/components/signature/PdfViewer').then((module) => module.PdfViewer), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--becpg-grey)] bg-white py-20 text-sm text-[var(--becpg-dark-grey)]">
            <Spinner size={18} />
        </div>
    ),
});

const LABELS = {
    fr: {
        zonesHint: 'Les cadres indiquent où votre signature et vos paraphes seront apposés.',
        counter: 'Document {index} sur {total}',
        read: 'Lu',
        unavailable: 'Document indisponible',
        unavailableHint:
            'Ce document n’est plus accessible dans beCPG : il a pu être remplacé après signature, ou son accès vous a été retiré. Contactez votre client s’il vous en faut une copie.',
    },
    en: {
        zonesHint: 'The frames show where your signature and initials will be applied.',
        counter: 'Document {index} of {total}',
        read: 'Read',
        unavailable: 'Document unavailable',
        unavailableHint:
            'This document is no longer accessible in beCPG: it may have been replaced after signing, or your access to it was removed. Ask your customer if you need a copy.',
    },
};

/**
 * @param {string} template
 * @param {Object} vars
 * @returns {string}
 */
function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        (vars[key] === undefined || vars[key] === null ? match : String(vars[key])),
    );
}

/** The uuid part of a nodeRef — what the portal puts in its own URLs. */
export function uuidOf(nodeRef) {
    const value = String(nodeRef || '').trim();
    if (!value) {
        return null;
    }
    const slash = value.lastIndexOf('/');
    return slash === -1 ? value : value.slice(slash + 1);
}

/**
 * The sessionStorage key under which one document's reading progress lives.
 * Exported so the flow can clear it once the task is signed, without having to
 * keep a handle on every mounted child.
 *
 * @param {string} taskId
 * @param {string} nodeRef
 * @returns {string|null}
 */
export function readStorageKey(taskId, nodeRef) {
    const uuid = uuidOf(nodeRef);
    return taskId && uuid ? `${taskId}:${uuid}` : null;
}

/**
 * @param {Object} props
 * @param {Object} props.document one entry of `GET /signature/{taskId}`'s `documents`
 * @param {string} props.taskId
 * @param {number} props.index 0-based
 * @param {number} props.total how many documents the task carries
 * @param {boolean} [props.enabled=true] false freezes the read tracking (signed, cancelled…)
 * @param {number} [props.headerOffset=56] height of the sticky app header, in px
 * @param {'fr'|'en'} [props.lang='fr']
 * @param {(index: number, progress: Object) => void} [props.onProgress]
 * @param {(index: number, controls: Object) => void} [props.onControls] exposes `goToPage`
 */
export function SignatureDocument({
    document,
    taskId,
    index,
    total,
    enabled = true,
    headerOffset = 56,
    lang = 'fr',
    onProgress,
    onControls,
}) {
    const labels = LABELS[lang] || LABELS.fr;
    const [numPages, setNumPages] = useState(0);

    const uuid = uuidOf(document && document.nodeRef);
    const taskUuid = uuidOf(taskId);

    // The route already asked beCPG whether it would serve these bytes. `false`
    // is a measured answer — the working copy was deleted by the check-in that
    // followed the signature, or read access was withdrawn — and it is the one
    // case where no URL may be built: a link that answers 404 is worse than no
    // link (defect F4). Anything else (`true`, or a payload that predates the
    // flag) keeps the previous behaviour.
    const available = !(document && document.available === false);

    // Always the portal proxy, never an Alfresco URL (AGENTS.md rule 6), and
    // always built with `apiUrl()` so the tenant path prefix survives — the
    // route also computes these, but as an absolute `/api/v1/…` that would lose
    // a `/t/{tenant}` prefix.
    //
    // `?task=` is not cosmetic: it is what authorises the *working copy*, a node
    // deliberately outside the supplier document perimeter (see the content
    // route for the check it triggers).
    const contentUrl = useMemo(
        () => (uuid && available
            ? apiUrl(`documents/${encodeURIComponent(uuid)}/content`, taskUuid ? { task: taskUuid } : undefined)
            : null),
        [uuid, taskUuid, available],
    );

    const downloadUrl = useMemo(
        () => (uuid && available
            ? apiUrl(`documents/${encodeURIComponent(uuid)}/content`, {
                ...(taskUuid ? { task: taskUuid } : {}),
                download: 1,
            })
            : null),
        [uuid, taskUuid, available],
    );

    // Coordinates are the signature service's, not ours. Absent → no overlay.
    const zones = useMemo(() => normalizeZones(document && document.zones), [document]);
    const markedPages = useMemo(() => zonePages(zones), [zones]);

    const reading = useReadTracking({
        pageCount: numPages,
        storageKey: readStorageKey(taskId, document && document.nodeRef),
        enabled,
    });

    const { pageCount, seenCount, complete, firstUnseen } = reading;

    // Reported as primitives, and only when one of them moves: sending the hook
    // object up would re-render the whole flow on every scroll frame.
    useEffect(() => {
        if (onProgress) {
            onProgress(index, { pageCount, seenCount, complete, firstUnseen });
        }
    }, [onProgress, index, pageCount, seenCount, complete, firstUnseen]);

    const [controls, setControls] = useState(null);
    const handleViewerReady = useCallback((value) => setControls(value), []);

    useEffect(() => {
        if (onControls && controls) {
            onControls(index, controls);
        }
    }, [onControls, index, controls]);

    const goToPage = useCallback((page) => {
        if (controls) {
            controls.goToPage(page);
        }
    }, [controls]);

    const renderOverlay = useCallback(
        ({ pageNumber, pageSize }) => (
            <SignatureZones zones={zones} pageNumber={pageNumber} pageSize={pageSize} lang={lang} />
        ),
        [zones, lang],
    );

    const handleDocumentLoad = useCallback(({ numPages: pages }) => setNumPages(pages), []);

    // Not a viewer and not a blank space: the supplier is told, in words, that
    // beCPG will not serve this document — and gets no link to click (F4).
    // The hooks above still ran, so this document keeps reporting
    // `pageCount: 0`, which keeps the "everything read" gate locked: a document
    // nobody can open is a document nobody can attest having read.
    if (!available) {
        return (
            <section className="mt-3 first:mt-0" data-signature-document={index + 1}>
                <div className="rounded-xl border border-[var(--becpg-grey)] bg-white p-4 text-sm">
                    <p className="flex items-center gap-2 font-medium text-[var(--becpg-blue)]">
                        <Icon name="error_outline" size={18} />
                        <span className="min-w-0 truncate">{document.name || labels.unavailable}</span>
                    </p>
                    <p className="mt-1 text-[var(--becpg-dark-grey)]">{labels.unavailable}</p>
                    <p className="mt-1 text-xs text-[var(--becpg-dark-grey)]">{labels.unavailableHint}</p>
                </div>
            </section>
        );
    }

    if (!contentUrl) {
        return null;
    }

    return (
        <section className="mt-3 first:mt-0" data-signature-document={index + 1}>
            {/* The counter only appears when there is something to count: on the
                single-document task — which is most of them — it would just be
                noise above the viewer. */}
            {total > 1 ? (
                <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-[var(--becpg-blue-lighter)] px-2 py-0.5 font-medium text-[var(--becpg-blue)]">
                        {fill(labels.counter, { index: index + 1, total })}
                    </span>
                    <span className="flex min-w-0 items-center gap-1 text-[var(--becpg-dark-grey)]">
                        <Icon name="picture_as_pdf" size={14} />
                        <span className="truncate">{document.name}</span>
                    </span>
                    {complete ? (
                        <span className="flex items-center gap-1 text-[var(--status-ok)]">
                            <Icon name="check_circle" size={14} />
                            {labels.read}
                        </span>
                    ) : null}
                </div>
            ) : null}

            <PdfViewer
                file={contentUrl}
                name={total > 1 ? null : document.name}
                downloadUrl={downloadUrl}
                registerPage={reading.registerPage}
                renderOverlay={zones.length ? renderOverlay : undefined}
                onLoad={handleDocumentLoad}
                onReady={handleViewerReady}
                stickyTop={headerOffset}
                scrollOffset={headerOffset + 48}
            />

            {zones.length ? (
                <ZoneLegend zones={zones} lang={lang} className="mt-2">
                    {labels.zonesHint}
                    {markedPages.length ? (
                        <span className="ml-1">
                            {markedPages.map((page) => (
                                <button
                                    key={page}
                                    type="button"
                                    onClick={() => goToPage(page)}
                                    className="ml-1 underline underline-offset-2 hover:text-[var(--becpg-orange)]"
                                >
                                    p.{page}
                                </button>
                            ))}
                        </span>
                    ) : null}
                </ZoneLegend>
            ) : null}
        </section>
    );
}
