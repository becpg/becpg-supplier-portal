'use client';

/**
 * The light PDF viewer — **the component that replaces PDFTron/Apryse**
 * (spec §9.2, ticket #35696).
 *
 * The V1 portal embeds `webviewer.min.js`, a multi-megabyte annotation SDK, to
 * do something it never needed: *show* a document and collect a consent. In
 * beCPG the signature is applied server-side (`SignatureService.prepareForSignature`
 * then `PDFBoxServiceImpl.signDocument`), so the client has no annotation to
 * produce, no XFDF to merge, no licence to pay — and no reason to ship an SDK
 * that makes Firefox unusable and phones hopeless.
 *
 * What is left is `pdf.js` through `react-pdf`: Mozilla's own renderer, MIT, no
 * licence server, and the exact engine Firefox itself uses for PDFs.
 *
 * ## Design decisions worth knowing
 *
 * - **The bytes come from the portal.** `file` is a same-origin URL
 *   (`/api/v1/documents/{id}/content`); the session is the httpOnly cookie, so
 *   pdf.js needs no header, and the browser never sees an Alfresco URL or a
 *   ticket (AGENTS.md rule 6).
 * - **The worker is bundled, not fetched from a CDN.** `new URL(…, import.meta.url)`
 *   makes the bundler emit `pdf.worker.min.mjs` as a same-origin asset. A CDN
 *   would break in an air-gapped client installation and would violate the proxy
 *   rule.
 * - **Pages are lazily rendered, but never lazily *sized*.** Every page keeps a
 *   wrapper of the right height from the start, so the scrollbar never jumps and
 *   a jump to page 40 lands on page 40. Only `overscan` pages around the current
 *   one hold a real canvas: a 120-page specification stays at a few canvases,
 *   which is what makes this usable on a phone.
 * - **Fit-to-width is the zoom origin.** `scale` is a multiplier *of the fitted
 *   width*, not of the PDF's own points: on a 360px phone, 100% means "the page
 *   fills the screen", which is the only definition a supplier cares about.
 * - **Two-finger pinch** is handled explicitly (native listener, `passive:false`),
 *   because React's synthetic `touchmove` is passive and cannot `preventDefault`.
 *
 * @example
 * const viewer = useRef(null);
 * <PdfViewer
 *     ref={viewer}
 *     file={`/api/v1/documents/${id}/content`}
 *     registerPage={reading.registerPage}
 *     renderOverlay={({ pageNumber, pageSize }) =>
 *         <SignatureZones zones={zones} pageNumber={pageNumber} pageSize={pageSize} />}
 *     onLoad={({ numPages }) => setPages(numPages)}
 * />
 * viewer.current.goToPage(12);
 */

import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button, Icon, IconButton, Spinner } from '@/components/ui/Button';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

/**
 * The pdf.js worker, resolved by the bundler and served from our own origin.
 * Assigned once, at module scope: `GlobalWorkerOptions` is global to pdf.js.
 *
 * `pdfjs-dist` is declared in `package.json` at the **exact** version react-pdf
 * depends on. Both parts matter: importing from a package we do not declare only
 * works by hoisting luck, and pdf.js throws "API version does not match Worker
 * version" the moment the two drift. Bump the pin together with react-pdf.
 */
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
    ).toString();
}

/**
 * Must be a module constant: react-pdf reloads the document whenever the
 * identity of `options` changes.
 */
const DOCUMENT_OPTIONS = Object.freeze({
    // Same-origin, but explicit: the session cookie is the only credential.
    withCredentials: true,
    isEvalSupported: false,
});

/** Zoom bounds, as a multiplier of the fit-to-width scale. */
const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;

/** Canvas resolution cap — 3x on a modern phone is a memory wall, not a gain. */
const MAX_PIXEL_RATIO = 2;

/** Fallback aspect ratio (A4 portrait) while the first page is measuring. */
const DEFAULT_ASPECT = 1.414;

/** How long a smooth scroll is given to land before it is snapped, in ms. */
const SETTLE_DELAY = 700;

/** How far off the target a settled scroll may be, in px. */
const SETTLE_TOLERANCE = 8;

const LABELS = defineLabels('components/signature/PdfViewer#LABELS', {
    fr: {
        previous: 'Page précédente',
        next: 'Page suivante',
        page: 'Page',
        of: 'sur {pages}',
        zoomIn: 'Agrandir',
        zoomOut: 'Réduire',
        fit: 'Ajuster à la largeur',
        download: 'Télécharger le PDF',
        loading: 'Chargement du document…',
        pageLoading: 'Chargement de la page {page}…',
        error: 'Ce document n’a pas pu être affiché',
        errorHint:
            'Le fichier est peut-être protégé ou momentanément indisponible. Vous pouvez réessayer ou le télécharger pour le consulter.',
        retry: 'Réessayer',
        pinch: 'Pincez pour zoomer',
    },
    en: {
        previous: 'Previous page',
        next: 'Next page',
        page: 'Page',
        of: 'of {pages}',
        zoomIn: 'Zoom in',
        zoomOut: 'Zoom out',
        fit: 'Fit to width',
        download: 'Download the PDF',
        loading: 'Loading the document…',
        pageLoading: 'Loading page {page}…',
        error: 'This document could not be displayed',
        errorHint:
            'The file may be protected or temporarily unavailable. You can retry, or download it to read it.',
        retry: 'Retry',
        pinch: 'Pinch to zoom',
    },
});

/**
 * @param {string} template
 * @param {Object} vars
 * @returns {string}
 */
function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])),
    );
}

/** @param {number} value @param {number} min @param {number} max @returns {number} */
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

/** Distance between the first two touches, in px. */
function touchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
}

const SCROLLABLE_OVERFLOW = /(auto|scroll|overlay)/;

/**
 * Top edge of the box that scrolls `element`, in viewport coordinates: 0 for
 * the window, the box's own top when the viewer sits in a dialog or a pane
 * with its own overflow. `scrollIntoView` lands a page `scrollOffset` below
 * that edge, not below the top of the viewport.
 *
 * @param {HTMLElement} element
 * @returns {number}
 */
function scrollerTop(element) {
    for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
        if (SCROLLABLE_OVERFLOW.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight) {
            return node.getBoundingClientRect().top;
        }
    }
    return 0;
}

/**
 * The viewer.
 *
 * @param {Object} props
 * @param {string} props.file same-origin URL of the PDF (portal proxy only)
 * @param {string} [props.name] file name, shown in the toolbar
 * @param {string} [props.downloadUrl] adds a download button when set
 * @param {(page: number) => ((element: HTMLElement|null) => void)} [props.registerPage]
 *        ref factory from `useReadTracking` — attached to the *rendered* page only
 * @param {(context: {pageNumber: number, width: number, height: number,
 *        pageSize: {width: number, height: number}|null}) => React.ReactNode} [props.renderOverlay]
 * @param {(info: {numPages: number}) => void} [props.onLoad]
 * @param {(error: Error) => void} [props.onError]
 * @param {(page: number) => void} [props.onPageChange]
 * @param {number} [props.overscan=2] pages rendered on each side of the current one
 * @param {number} [props.stickyTop=0] where the toolbar sticks, under the app header, in px
 * @param {number} [props.scrollOffset=72] sticky-toolbar compensation when jumping, in px
 * @param {number} [props.maxWidth=900] widest a page gets at 100%, in px
 * @param {boolean} [props.textLayer=true] selectable text (also what makes it accessible)
 * @param {React.ReactNode} [props.toolbarExtra] rendered at the right of the toolbar
 * @param {(controls: {goToPage: Function, next: Function, previous: Function}) => void} [props.onReady]
 *        same handle as the ref, as a plain prop — `next/dynamic({ssr:false})` does not forward refs
 * @param {string} [props.className]
 * @param {React.Ref} ref imperative handle: `{ goToPage, next, previous, numPages, currentPage }`
 */
export const PdfViewer = forwardRef(function PdfViewer(
    {
        file,
        name,
        downloadUrl,
        registerPage,
        renderOverlay,
        onLoad,
        onError,
        onPageChange,
        overscan = 2,
        stickyTop = 0,
        scrollOffset = 72,
        maxWidth = 900,
        textLayer = true,
        toolbarExtra,
        onReady,
        className = '',
    },
    ref,
) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);

    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1);
    const [containerWidth, setContainerWidth] = useState(0);
    const [error, setError] = useState(null);
    const [attempt, setAttempt] = useState(0);
    /** pageNumber → { width, height } in PDF points, filled as pages render. */
    const [sizes, setSizes] = useState({});

    // State, not a ref: the pages container unmounts on a load error and a new
    // one mounts on Retry, and the effects below must follow it to the new node.
    const [scrollElement, setScrollElement] = useState(null);
    // The pinch listeners are bound once per container; they read the live
    // scale from here instead of being rebound, which would reset a pinch.
    const scaleRef = useRef(scale);
    useEffect(() => {
        scaleRef.current = scale;
    }, [scale]);
    const pageElements = useRef(new Map());
    const pageRefCallbacks = useRef(new Map());
    /** Pending "did the smooth scroll actually land" check. */
    const settleTimer = useRef(0);

    // Read once: a canvas rendered at 3x on a mid-range phone is a memory wall,
    // not a sharper page. The component is client-only, so `window` is there.
    const pixelRatio = useMemo(
        () => (typeof window === 'undefined' ? 1 : Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1)),
        [],
    );

    /* ------------------------------------------------------------ geometry */

    // The available width drives everything: fit-to-width is the zoom origin.
    useEffect(() => {
        const element = scrollElement;
        if (!element || typeof ResizeObserver === 'undefined') {
            if (element) {
                setContainerWidth(element.clientWidth);
            }
            return undefined;
        }
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                setContainerWidth(Math.round(entry.contentRect.width));
            }
        });
        observer.observe(element);
        setContainerWidth(element.clientWidth);
        return () => observer.disconnect();
    }, [scrollElement]);

    const fittedWidth = useMemo(() => {
        const available = containerWidth || 0;
        if (!available) {
            return 0;
        }
        // 2px of breathing room so the page border is not clipped by the scroller.
        return Math.max(240, Math.min(maxWidth, available - 2));
    }, [containerWidth, maxWidth]);

    const pageWidth = useMemo(() => Math.round(fittedWidth * scale), [fittedWidth, scale]);

    /** Aspect ratio of a page: its own if measured, else page 1's, else A4. */
    const aspectOf = useCallback(
        (page) => {
            const size = sizes[page] || sizes[1];
            if (size && size.width > 0) {
                return size.height / size.width;
            }
            return DEFAULT_ASPECT;
        },
        [sizes],
    );

    const heightOf = useCallback((page) => Math.round(pageWidth * aspectOf(page)), [pageWidth, aspectOf]);

    /* -------------------------------------------------------- page tracking */

    // A second, deliberately dumb observer: it only answers "which page is the
    // user looking at", which drives the toolbar and the render window. Read
    // tracking has its own, with its own (much stricter) rule.
    useEffect(() => {
        if (!numPages || typeof IntersectionObserver === 'undefined') {
            return undefined;
        }
        const visible = new Map();
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const page = Number(entry.target.dataset.page);
                    if (Number.isInteger(page)) {
                        visible.set(page, entry.intersectionRect.height);
                    }
                });
                let best = 0;
                let bestHeight = 0;
                visible.forEach((height, page) => {
                    if (height > bestHeight) {
                        bestHeight = height;
                        best = page;
                    }
                });
                if (best > 0) {
                    setCurrentPage(best);
                }
            },
            { threshold: [0, 0.05, 0.25, 0.5, 0.75, 1] },
        );
        pageElements.current.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }, [numPages]);

    useEffect(() => {
        if (onPageChange && currentPage) {
            onPageChange(currentPage);
        }
    }, [currentPage, onPageChange]);

    /** Stable ref callback per page — the wrapper, always mounted. */
    const wrapperRef = useCallback((page) => {
        let callback = pageRefCallbacks.current.get(page);
        if (!callback) {
            callback = (element) => {
                if (element) {
                    element.dataset.page = String(page);
                    pageElements.current.set(page, element);
                }
                else {
                    pageElements.current.delete(page);
                }
            };
            pageRefCallbacks.current.set(page, callback);
        }
        return callback;
    }, []);

    /* ----------------------------------------------------------- navigation */

    const goToPage = useCallback(
        (page, behavior = 'smooth') => {
            const target = clamp(Math.round(Number(page) || 1), 1, numPages || 1);
            setCurrentPage(target);
            const element = pageElements.current.get(target);
            if (!element) {
                return target;
            }

            const reduced =
                typeof window !== 'undefined' &&
                window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const mode = reduced ? 'auto' : behavior;

            // `scrollIntoView`, not `window.scrollTo(getBoundingClientRect().top
            // + scrollY)`: the second only works when the *window* is the
            // scroller. It silently does nothing the day the viewer sits in a
            // dialog or in a pane with its own overflow — and `scroll-margin-top`
            // (set on the wrapper) already compensates the sticky toolbar.
            element.scrollIntoView({ behavior: mode, block: 'start', inline: 'nearest' });

            // A smooth scroll is an *animation*, and browsers are free to cancel
            // one: Chromium drops it when it sees user input, which a real click
            // on this very button counts as (measured — the page simply never
            // moved). Landing on the page is the feature; the animation is not.
            // So: verify, and snap if it did not happen.
            if (settleTimer.current) {
                clearTimeout(settleTimer.current);
                settleTimer.current = 0;
            }
            if (mode === 'smooth') {
                settleTimer.current = setTimeout(() => {
                    settleTimer.current = 0;
                    const current = pageElements.current.get(target);
                    if (!current) {
                        return;
                    }
                    const landedAt = current.getBoundingClientRect().top - scrollerTop(current);
                    if (Math.abs(landedAt - scrollOffset) > SETTLE_TOLERANCE) {
                        current.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'nearest' });
                    }
                }, SETTLE_DELAY);
            }
            return target;
        },
        [numPages, scrollOffset],
    );

    useEffect(() => () => {
        if (settleTimer.current) {
            clearTimeout(settleTimer.current);
        }
    }, []);

    const controls = useMemo(
        () => ({
            goToPage,
            next: () => goToPage(currentPage + 1),
            previous: () => goToPage(currentPage - 1),
            currentPage,
            numPages,
        }),
        [goToPage, currentPage, numPages],
    );

    useImperativeHandle(ref, () => controls, [controls]);

    // The viewer is loaded with `next/dynamic({ ssr: false })` — pdf.js has no
    // business running on the server — and that wrapper does not forward refs.
    // `onReady` is the same handle, passed the way a lazy component can.
    useEffect(() => {
        if (onReady) {
            onReady(controls);
        }
    }, [onReady, controls]);

    /* ---------------------------------------------------------------- zoom */

    const zoomBy = useCallback((delta) => {
        setScale((previous) => clamp(Number((previous + delta).toFixed(2)), MIN_SCALE, MAX_SCALE));
    }, []);

    const resetZoom = useCallback(() => setScale(1), []);

    // Pinch. React's onTouchMove is passive, so preventDefault would be ignored:
    // the listener has to be native and explicitly non-passive.
    useEffect(() => {
        const element = scrollElement;
        if (!element) {
            return undefined;
        }
        let startDistance = 0;
        let startScale = 1;

        const onTouchStart = (event) => {
            if (event.touches.length === 2) {
                startDistance = touchDistance(event.touches);
                startScale = scaleRef.current;
            }
        };
        const onTouchMove = (event) => {
            if (event.touches.length !== 2 || !startDistance) {
                return;
            }
            event.preventDefault();
            const ratio = touchDistance(event.touches) / startDistance;
            setScale(clamp(Number((startScale * ratio).toFixed(2)), MIN_SCALE, MAX_SCALE));
        };
        const onTouchEnd = (event) => {
            if (event.touches.length < 2) {
                startDistance = 0;
            }
        };

        element.addEventListener('touchstart', onTouchStart, { passive: true });
        element.addEventListener('touchmove', onTouchMove, { passive: false });
        element.addEventListener('touchend', onTouchEnd, { passive: true });
        element.addEventListener('touchcancel', onTouchEnd, { passive: true });
        return () => {
            element.removeEventListener('touchstart', onTouchStart);
            element.removeEventListener('touchmove', onTouchMove);
            element.removeEventListener('touchend', onTouchEnd);
            element.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [scrollElement]);

    /* -------------------------------------------------------------- loading */

    const handleLoadSuccess = useCallback(
        (pdf) => {
            setError(null);
            setNumPages(pdf.numPages);
            if (onLoad) {
                onLoad({ numPages: pdf.numPages });
            }
        },
        [onLoad],
    );

    const handleLoadError = useCallback(
        (cause) => {
            setError(cause || new Error('PDF load error'));
            if (onError) {
                onError(cause);
            }
        },
        [onError],
    );

    const handlePageLoad = useCallback((page) => {
        const width = page.originalWidth || page.width;
        const height = page.originalHeight || page.height;
        if (!width || !height) {
            return;
        }
        setSizes((previous) => {
            const known = previous[page.pageNumber];
            if (known && known.width === width && known.height === height) {
                return previous;
            }
            return { ...previous, [page.pageNumber]: { width, height } };
        });
    }, []);

    // react-pdf's default handler opens a browser `prompt()`. A supplier facing
    // a raw prompt on a signature screen would (rightly) close the tab; an
    // explicit "protected document" card with a download fallback is honest.
    const handlePassword = useCallback(() => {
        setError(new Error('This document is password protected'));
    }, []);

    const retry = useCallback(() => {
        setError(null);
        setNumPages(0);
        setSizes({});
        setAttempt((value) => value + 1);
    }, []);

    /* ------------------------------------------------------------- rendering */

    const pages = useMemo(
        () => Array.from({ length: numPages }, (unused, index) => index + 1),
        [numPages],
    );

    const shouldRender = useCallback(
        (page) => Math.abs(page - currentPage) <= overscan,
        [currentPage, overscan],
    );

    if (error) {
        return (
            <div className={`rounded-xl border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-6 text-center ${className}`}>
                <Icon name="picture_as_pdf" size={28} className="mx-auto text-[var(--status-danger)]" />
                <p className="mt-2 text-sm font-medium text-[var(--status-danger)]">{labels.error}</p>
                <p className="mx-auto mt-1 max-w-md text-xs text-[var(--becpg-dark-grey)]">{labels.errorHint}</p>
                <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                    <Button variant="outline" icon="refresh" onClick={retry}>
                        {labels.retry}
                    </Button>
                    {downloadUrl ? (
                        <Button variant="secondary" icon="download" href={downloadUrl} external>
                            {labels.download}
                        </Button>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        // No `overflow-hidden` here, on purpose: an ancestor with a clipped
        // overflow turns the toolbar's `position: sticky` into dead weight.
        <div className={`rounded-xl border border-[var(--becpg-grey)] bg-white ${className}`}>
            {/* ------------------------------------------------------ toolbar */}
            {/* One row, always. Wrapping put the zoom controls on a second line
                at 360px, where the sticky toolbar then covered a third of the
                page. Scrolling the toolbar itself is the honest trade: the
                controls stay reachable and the document keeps its height. */}
            <div
                className="sticky z-20 flex flex-nowrap items-center gap-1 overflow-x-auto rounded-t-xl border-b border-[var(--becpg-grey)] bg-white/95 px-2 py-1.5 backdrop-blur sm:gap-2 sm:px-3"
                style={{ top: `${stickyTop}px` }}
            >
                <IconButton
                    icon="keyboard_arrow_up"
                    label={labels.previous}
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                />
                <IconButton
                    icon="keyboard_arrow_down"
                    label={labels.next}
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={!numPages || currentPage >= numPages}
                />

                <label className="ms-1 flex shrink-0 items-center gap-1 text-xs text-[var(--becpg-dark-grey)]">
                    <span className="sr-only">{labels.page}</span>
                    <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={numPages || 1}
                        value={currentPage}
                        onChange={(event) => {
                            const value = Number(event.target.value);
                            if (Number.isFinite(value) && value >= 1 && value <= (numPages || 1)) {
                                goToPage(value, 'auto');
                            }
                        }}
                        className="w-12 rounded border border-[var(--becpg-grey)] px-1 py-1 text-center text-xs tabular-nums text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                        aria-label={labels.page}
                    />
                    <span className="tabular-nums">{fill(labels.of, { pages: numPages || '…' })}</span>
                </label>

                {/* Pushes the zoom cluster right; `shrink` keeps it from
                    forcing a horizontal scroll on a narrow toolbar. */}
                <span className="min-w-0 flex-1 shrink" />

                <IconButton icon="zoom_out" label={labels.zoomOut} onClick={() => zoomBy(-SCALE_STEP)} disabled={scale <= MIN_SCALE} />
                <button
                    type="button"
                    onClick={resetZoom}
                    className="touch-target min-w-[52px] rounded-md px-1 text-xs tabular-nums text-[var(--becpg-dark-grey)] hover:bg-[var(--becpg-grey)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                    title={labels.fit}
                >
                    {Math.round(scale * 100)}%
                </button>
                <IconButton icon="zoom_in" label={labels.zoomIn} onClick={() => zoomBy(SCALE_STEP)} disabled={scale >= MAX_SCALE} />
                {downloadUrl ? (
                    <IconButton icon="download" label={labels.download} href={downloadUrl} external />
                ) : null}
                {toolbarExtra}
            </div>

            {/* -------------------------------------------------------- pages */}
            <div
                ref={setScrollElement}
                className="overflow-x-auto overscroll-x-contain bg-[var(--becpg-grey)]/40 px-1 py-3 sm:px-3"
                style={{ touchAction: 'pan-x pan-y' }}
            >
                <Document
                    key={attempt}
                    file={file}
                    options={DOCUMENT_OPTIONS}
                    onLoadSuccess={handleLoadSuccess}
                    onLoadError={handleLoadError}
                    onSourceError={handleLoadError}
                    onPassword={handlePassword}
                    externalLinkTarget="_blank"
                    loading={
                        <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--becpg-dark-grey)]">
                            <Spinner size={18} />
                            {labels.loading}
                        </div>
                    }
                    error={null}
                    noData={null}
                    className="mx-auto flex w-max max-w-none flex-col items-center gap-3"
                >
                    {pages.map((page) => {
                        const width = pageWidth || 0;
                        const height = heightOf(page);
                        const rendered = shouldRender(page);
                        return (
                            <div
                                key={page}
                                ref={wrapperRef(page)}
                                data-page={page}
                                className="relative shrink-0 bg-white shadow-[0_1px_4px_rgba(0,66,84,0.18)]"
                                style={{
                                    width: width ? `${width}px` : '100%',
                                    height: height ? `${height}px` : undefined,
                                    scrollMarginTop: `${scrollOffset}px`,
                                }}
                            >
                                {rendered && width ? (
                                    <>
                                        <Page
                                            pageNumber={page}
                                            width={width}
                                            devicePixelRatio={pixelRatio}
                                            renderTextLayer={textLayer}
                                            renderAnnotationLayer
                                            onLoadSuccess={handlePageLoad}
                                            loading={
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <Spinner size={20} className="text-[var(--becpg-blue-light)]" />
                                                </div>
                                            }
                                            error={null}
                                        />
                                        {/* Read tracking observes this element, which exists
                                            only while the page is really rendered: a
                                            placeholder must never count as read. */}
                                        <div
                                            ref={registerPage ? registerPage(page) : undefined}
                                            className="pointer-events-none absolute inset-0"
                                            aria-hidden="true"
                                        />
                                        {renderOverlay
                                            ? renderOverlay({
                                                pageNumber: page,
                                                width,
                                                height,
                                                pageSize: sizes[page] || null,
                                            })
                                            : null}
                                    </>
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-xs text-[var(--becpg-dark-grey)]">
                                        {fill(labels.pageLoading, { page })}
                                    </div>
                                )}
                                <span className="pointer-events-none absolute bottom-1 end-2 rounded bg-white/80 px-1 text-[10px] tabular-nums text-[var(--becpg-dark-grey)]">
                                    {page}
                                </span>
                            </div>
                        );
                    })}
                </Document>
            </div>

            {name ? (
                <div className="flex items-center gap-1.5 border-t border-[var(--becpg-grey)] px-3 py-1.5 text-[11px] text-[var(--becpg-dark-grey)]">
                    <Icon name="picture_as_pdf" size={14} />
                    <span className="truncate">{name}</span>
                </div>
            ) : null}
        </div>
    );
});
