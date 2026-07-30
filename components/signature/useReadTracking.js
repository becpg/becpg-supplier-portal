'use client';

/**
 * Read tracking — **the gate that replaces "sign every page"** (spec §9.2).
 *
 * Today a supplier has to *sign* each page of the specification one by one in
 * PDFTron. That is what makes the signature the most expensive rupture point of
 * the journey (#35696): dozens of clicks, on a viewer that crawls on Firefox and
 * is unusable on a phone. The rule beCPG actually needs is much weaker than
 * "sign each page" — it is **"attest that every page was read"** — and the
 * signature itself is applied once, server-side, by `PDFBoxServiceImpl`.
 *
 * So this hook counts the pages the user *actually saw*, and nothing else. The
 * consent checkbox and the sign button stay disabled until `complete` is true.
 *
 * ## What counts as "seen"
 *
 * A page is seen when it has been **sufficiently visible for long enough**:
 *
 * - *sufficiently visible*: at least `threshold` of the page's own height is in
 *   the viewport **or** the visible slice of it covers `threshold` of the
 *   viewport. The second half of that rule is what makes it work on a 360px
 *   phone at 200% zoom, where a single page is taller than the screen and can
 *   never reach 55% of *its own* height;
 * - *for long enough*: `dwellMs` of continuous visibility. Flinging the scrollbar
 *   from page 1 to page 40 therefore does not mark 40 pages as read — which is
 *   the whole point of an attestation.
 *
 * `IntersectionObserver` does the work when it exists (every browser since 2019,
 * Firefox 55+); otherwise the hook falls back to a rAF-throttled scroll listener
 * with the exact same rule, so the gate can never be *bypassed* by an old
 * browser — nor can it lock a user out of signing.
 *
 * ## Progress survives a reload
 *
 * With a `storageKey`, progress is mirrored in `sessionStorage`. A supplier who
 * reloads (or whose mobile browser kills the tab while he fetches his glasses)
 * does not restart a 40-page read. It is scoped to the tab and to the exact
 * `{document, pageCount}` pair: a different document, or a document whose page
 * count changed, starts from zero.
 *
 * @example
 * const reading = useReadTracking({ pageCount: numPages, storageKey: taskId });
 * <div ref={reading.registerPage(n)}>…page n…</div>
 * <p>{reading.seenCount} / {reading.pageCount} pages consultées</p>
 * <Button disabled={!reading.complete}>Signer</Button>
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Share of the page (or of the viewport) that must be visible. */
export const DEFAULT_THRESHOLD = 0.55;

/** Continuous visibility required before a page counts, in ms. */
export const DEFAULT_DWELL_MS = 600;

/** sessionStorage namespace. */
const STORAGE_PREFIX = 'becpg-portal:read:';

/** Observer thresholds — fine enough to follow a slow scroll. */
const OBSERVER_THRESHOLDS = [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1];

/**
 * Reads persisted progress for a document.
 *
 * @param {string|null} storageKey
 * @param {number} pageCount
 * @returns {number[]} page numbers, empty when nothing usable is stored
 */
function loadProgress(storageKey, pageCount) {
    if (!storageKey || !pageCount || typeof window === 'undefined') {
        return [];
    }
    try {
        const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        // A document whose page count changed is not the document we tracked.
        if (!parsed || parsed.pageCount !== pageCount || !Array.isArray(parsed.seen)) {
            return [];
        }
        return parsed.seen
            .map((page) => Number(page))
            .filter((page) => Number.isInteger(page) && page >= 1 && page <= pageCount);
    }
    catch {
        return [];
    }
}

/**
 * @param {string|null} storageKey
 * @param {number} pageCount
 * @param {number[]} seen
 */
function saveProgress(storageKey, pageCount, seen) {
    if (!storageKey || !pageCount || typeof window === 'undefined') {
        return;
    }
    try {
        window.sessionStorage.setItem(
            `${STORAGE_PREFIX}${storageKey}`,
            JSON.stringify({ pageCount, seen, at: new Date().toISOString() }),
        );
    }
    catch {
        // Private mode, quota, disabled storage: progress simply is not persisted.
    }
}

/**
 * Clears the persisted progress of a document — called once it is signed, so a
 * later visit does not inherit a stale attestation.
 *
 * @param {string} storageKey
 */
export function clearReadProgress(storageKey) {
    if (!storageKey || typeof window === 'undefined') {
        return;
    }
    try {
        window.sessionStorage.removeItem(`${STORAGE_PREFIX}${storageKey}`);
    }
    catch {
        // ignored
    }
}

/**
 * Is that geometry "visible enough" to start the dwell timer?
 *
 * @param {number} visible height of the visible slice, in px
 * @param {number} pageHeight full height of the page element, in px
 * @param {number} viewportHeight height of the scroll root, in px
 * @param {number} threshold
 * @returns {boolean}
 */
function isVisibleEnough(visible, pageHeight, viewportHeight, threshold) {
    if (visible <= 0) {
        return false;
    }
    const reference = Math.min(pageHeight || 1, viewportHeight || 1);
    return visible >= threshold * reference;
}

/**
 * Tracks which pages of a paginated document have been read.
 *
 * @param {Object} options
 * @param {number} options.pageCount total number of pages (0 while loading)
 * @param {string|null} [options.storageKey] persists progress in sessionStorage
 * @param {number} [options.threshold=0.55] visible share required
 * @param {number} [options.dwellMs=600] continuous visibility required, in ms
 * @param {React.RefObject<HTMLElement>} [options.rootRef] scroll container; defaults to the viewport
 * @param {boolean} [options.enabled=true]
 * @returns {{
 *   pageCount: number, seenPages: number[], seenCount: number, remaining: number,
 *   progress: number, complete: boolean, currentPage: number, firstUnseen: number|null,
 *   isSeen: (page: number) => boolean, markSeen: (page: number) => void,
 *   registerPage: (page: number) => (element: HTMLElement|null) => void,
 *   reset: () => void, clearStored: () => void
 * }}
 */
export function useReadTracking(options = {}) {
    const {
        pageCount = 0,
        storageKey = null,
        threshold = DEFAULT_THRESHOLD,
        dwellMs = DEFAULT_DWELL_MS,
        rootRef = null,
        enabled = true,
    } = options;

    // The seen set is keyed by the document identity: `pageCount` changing means
    // another document (or a document that finished loading), so the state is
    // adjusted during render rather than in an effect — no cascading render.
    const [state, setState] = useState(() => ({ pageCount, seen: new Set(loadProgress(storageKey, pageCount)) }));
    const [currentPage, setCurrentPage] = useState(1);

    if (state.pageCount !== pageCount) {
        setState({ pageCount, seen: new Set(loadProgress(storageKey, pageCount)) });
    }

    const elements = useRef(new Map());
    const callbacks = useRef(new Map());
    const timers = useRef(new Map());
    const observer = useRef(null);
    const ratios = useRef(new Map());

    /** Marks a page read. Idempotent, and the only way into the seen set. */
    const markSeen = useCallback((page) => {
        const value = Number(page);
        if (!Number.isInteger(value) || value < 1) {
            return;
        }
        setState((previous) => {
            if (previous.seen.has(value) || (previous.pageCount && value > previous.pageCount)) {
                return previous;
            }
            const seen = new Set(previous.seen);
            seen.add(value);
            return { pageCount: previous.pageCount, seen };
        });
    }, []);

    /** Evaluates one page's geometry and schedules (or cancels) its dwell timer. */
    const evaluate = useCallback(
        (page, visible, pageHeight, viewportHeight) => {
            const enough = isVisibleEnough(visible, pageHeight, viewportHeight, threshold);
            const pending = timers.current.get(page);
            if (!enough) {
                if (pending) {
                    clearTimeout(pending);
                    timers.current.delete(page);
                }
                return;
            }
            if (pending) {
                return; // already counting down
            }
            if (dwellMs <= 0) {
                markSeen(page);
                return;
            }
            timers.current.set(
                page,
                setTimeout(() => {
                    timers.current.delete(page);
                    markSeen(page);
                }, dwellMs),
            );
        },
        [dwellMs, markSeen, threshold],
    );

    /** The most visible page becomes the "current" one shown in the toolbar. */
    const refreshCurrent = useCallback(() => {
        let best = null;
        let bestVisible = 0;
        ratios.current.forEach((visible, page) => {
            if (visible > bestVisible) {
                bestVisible = visible;
                best = page;
            }
        });
        if (best !== null && bestVisible > 0) {
            setCurrentPage((previous) => (previous === best ? previous : best));
        }
    }, []);

    /* ------------------------------------------------------------ observer */

    useEffect(() => {
        if (!enabled || !pageCount || typeof window === 'undefined') {
            return undefined;
        }

        const root = rootRef && rootRef.current ? rootRef.current : null;
        const timersMap = timers.current;

        if (typeof IntersectionObserver !== 'undefined') {
            const instance = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        const page = Number(entry.target.dataset.readPage);
                        if (!Number.isInteger(page)) {
                            return;
                        }
                        const visible = entry.intersectionRect.height;
                        const viewportHeight =
                            (entry.rootBounds && entry.rootBounds.height) || window.innerHeight || 1;
                        ratios.current.set(page, visible);
                        evaluate(page, visible, entry.boundingClientRect.height, viewportHeight);
                    });
                    refreshCurrent();
                },
                { root, threshold: OBSERVER_THRESHOLDS, rootMargin: '0px' },
            );
            observer.current = instance;
            elements.current.forEach((element) => instance.observe(element));
            return () => {
                instance.disconnect();
                observer.current = null;
                timersMap.forEach((timer) => clearTimeout(timer));
                timersMap.clear();
            };
        }

        // --- Fallback: no IntersectionObserver. Same rule, measured by hand.
        let frame = 0;
        const measure = () => {
            frame = 0;
            const bounds = root
                ? root.getBoundingClientRect()
                : { top: 0, bottom: window.innerHeight, height: window.innerHeight };
            elements.current.forEach((element, page) => {
                const rect = element.getBoundingClientRect();
                const visible = Math.max(0, Math.min(rect.bottom, bounds.bottom) - Math.max(rect.top, bounds.top));
                ratios.current.set(page, visible);
                evaluate(page, visible, rect.height, bounds.height);
            });
            refreshCurrent();
        };
        const schedule = () => {
            if (!frame) {
                frame = window.requestAnimationFrame(measure);
            }
        };
        const target = root || window;
        target.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule, { passive: true });
        schedule();
        return () => {
            if (frame) {
                window.cancelAnimationFrame(frame);
            }
            target.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
            timersMap.forEach((timer) => clearTimeout(timer));
            timersMap.clear();
        };
    }, [enabled, pageCount, rootRef, evaluate, refreshCurrent]);

    /* ---------------------------------------------------------- persistence */

    const seenPages = useMemo(() => Array.from(state.seen).sort((a, b) => a - b), [state.seen]);

    useEffect(() => {
        if (storageKey && pageCount) {
            saveProgress(storageKey, pageCount, seenPages);
        }
    }, [storageKey, pageCount, seenPages]);

    /* ------------------------------------------------------------- ref API */

    const registerPage = useCallback((page) => {
        const key = Number(page);
        let callback = callbacks.current.get(key);
        if (!callback) {
            callback = (element) => {
                const previous = elements.current.get(key);
                if (previous && observer.current) {
                    observer.current.unobserve(previous);
                }
                if (!element) {
                    // A page that leaves the DOM (lazy rendering unmounts it)
                    // must not keep a dwell timer running: it is no longer on
                    // screen, so it has not been read.
                    const pending = timers.current.get(key);
                    if (pending) {
                        clearTimeout(pending);
                        timers.current.delete(key);
                    }
                    elements.current.delete(key);
                    ratios.current.delete(key);
                    return;
                }
                element.dataset.readPage = String(key);
                elements.current.set(key, element);
                if (observer.current) {
                    observer.current.observe(element);
                }
            };
            callbacks.current.set(key, callback);
        }
        return callback;
    }, []);

    const reset = useCallback(() => {
        timers.current.forEach((timer) => clearTimeout(timer));
        timers.current.clear();
        setState({ pageCount, seen: new Set() });
    }, [pageCount]);

    const clearStored = useCallback(() => {
        if (storageKey) {
            clearReadProgress(storageKey);
        }
    }, [storageKey]);

    const isSeen = useCallback((page) => state.seen.has(Number(page)), [state.seen]);

    const seenCount = seenPages.length;
    const complete = pageCount > 0 && seenCount >= pageCount;
    const firstUnseen = useMemo(() => {
        for (let page = 1; page <= pageCount; page += 1) {
            if (!state.seen.has(page)) {
                return page;
            }
        }
        return null;
    }, [pageCount, state.seen]);

    return {
        pageCount,
        seenPages,
        seenCount,
        remaining: Math.max(0, pageCount - seenCount),
        progress: pageCount > 0 ? seenCount / pageCount : 0,
        complete,
        currentPage,
        firstUnseen,
        isSeen,
        markSeen,
        registerPage,
        reset,
        clearStored,
    };
}
