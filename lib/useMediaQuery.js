'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** The server renders the narrow layout: there is no viewport to ask. */
function serverSnapshot() {
    return false;
}

/**
 * Whether a media query matches, kept in step with the viewport.
 *
 * For the places where showing one of two layouts with CSS would mount both —
 * and mounting means fetching.
 *
 * @param {string} query e.g. `(min-width: 1024px)`
 * @returns {boolean}
 */
export function useMediaQuery(query) {
    const subscribe = useCallback((onChange) => {
        const list = window.matchMedia(query);
        list.addEventListener('change', onChange);
        return () => list.removeEventListener('change', onChange);
    }, [query]);
    const snapshot = useCallback(() => window.matchMedia(query).matches, [query]);
    return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
