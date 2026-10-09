/**
 * The menu counters, which must survive a change of screen.
 *
 * Every badge in the left menu comes from the rendered page: the dashboard
 * knows the tasks, the documents and the discussions; `/tasks` only knows the
 * tasks; `/products` knows none of them. Since `AppShell` only received what
 * the current page passed it, leaving the dashboard erased the badges the
 * destination page could not recompute — the supplier saw their 51 tasks and 3
 * discussions vanish when switching views.
 *
 * Having every page recompute them would be the wrong answer: a discussion
 * counter costs a sweep over the entities plus one thread read per discussion,
 * and the portal has no business paying that to show a "3" on a screen that is
 * about something else.
 *
 * This module therefore keeps the last known counter for each key, fed by the
 * pages that know how to compute them and read by the menu everywhere else. A
 * page publishing a fresher value overwrites it; a page that knows nothing
 * about a key leaves it intact.
 *
 * Scope: the tab, the user and the supplier scope. `sessionStorage` - and not
 * `localStorage` - because a counter is a snapshot, not a preference: it has no
 * reason to survive closing the tab, and a menu without badges is better than a
 * menu showing yesterday's figures. The user name and the supplier scope picked
 * in the top bar are stored alongside: a counter computed for one account, or
 * for one supplier record, says nothing about another, so a change of either
 * starts from zero rather than showing the previous figures.
 *
 * Client only.
 */

/** Storage key: `{ user, scope, badges }`. */
const STORAGE_KEY = 'becpg.portal.badges';

/**
 * The empty state, in a single copy — `useSyncExternalStore` compares snapshots
 * by identity, and a fresh object on every read would make React loop.
 */
const EMPTY = Object.freeze({});

/** The current snapshot, as the mounted components have seen it. */
let snapshot = EMPTY;

/** The user `snapshot` belongs to, so two sessions are never mixed. */
let snapshotUser = null;

/** The supplier scope `snapshot` was counted for (`'all'` or a supplier nodeRef). */
let snapshotScope = null;

/** True once `sessionStorage` has been read, so it only happens on the first client render. */
let hydrated = false;

/** The mounted components, to notify when a counter changes. */
const listeners = new Set();

/**
 * The known counters.
 *
 * Storage is read only once: afterwards `snapshot` is the source of truth,
 * which guarantees the identity stability `useSyncExternalStore` expects.
 *
 * @returns {Object<string, number>} badge key → count
 */
export function readBadges() {
    if (typeof window === 'undefined') {
        return EMPTY;
    }
    if (!hydrated) {
        hydrated = true;
        try {
            const raw = window.sessionStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && typeof parsed.badges === 'object' && parsed.badges) {
                snapshot = parsed.badges;
                snapshotUser = parsed.user || null;
                snapshotScope = parsed.scope || null;
            }
        }
        catch {
            // Storage refused or corrupted JSON: a menu without badges is
            // still a usable menu.
        }
    }
    return snapshot;
}

/**
 * The server render snapshot: always empty. The server does not know what this
 * tab has already displayed, and pretending otherwise would cause a hydration
 * mismatch.
 *
 * @returns {Object<string, number>}
 */
export function serverBadges() {
    return EMPTY;
}

/**
 * Subscribes to counter changes.
 *
 * @param {() => void} listener
 * @returns {() => void} the unsubscribe function
 */
export function subscribeBadges(listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/**
 * Publishes what a page knows how to count.
 *
 * Notifies only if something actually changed, and that is what makes the call
 * safe from an effect: pages pass literals (`badges={{ tasks: 51 }}`), whose
 * identity changes on every render. Without this guard, publishing would
 * trigger a render that would publish again, endlessly.
 *
 * Missing or non-numeric values are ignored rather than written as zero: a page
 * silent about a key is not claiming that key is zero.
 *
 * @param {Object<string, number>} badges the counters the page knows
 * @param {Object} [context]
 * @param {string|null} [context.user] the current user, to detect a change of account
 * @param {string|null} [context.scope] the supplier scope the page counted for
 * @returns {void}
 */
export function publishBadges(badges, { user = null, scope = null } = {}) {
    if (typeof window === 'undefined') {
        return;
    }
    readBadges();

    // Change of account or of supplier scope: nothing from before holds any
    // more, and mixing the two would be worse than showing nothing.
    const otherUser = Boolean(user && snapshotUser && user !== snapshotUser);
    const otherScope = Boolean(scope && snapshotScope && scope !== snapshotScope);
    const base = otherUser || otherScope ? EMPTY : snapshot;

    let next = base;
    for (const [key, value] of Object.entries(badges || {})) {
        if (typeof value !== 'number' || Number.isNaN(value)) {
            continue;
        }
        if (base[key] !== value) {
            if (next === base) {
                next = { ...base };
            }
            next[key] = value;
        }
    }

    const sameUser = !user || user === snapshotUser;
    const sameScope = !scope || scope === snapshotScope;
    if (next === base && base === snapshot && sameUser && sameScope) {
        return;
    }

    snapshot = next;
    snapshotUser = user || snapshotUser;
    snapshotScope = scope || snapshotScope;
    try {
        window.sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ user: snapshotUser, scope: snapshotScope, badges: snapshot }),
        );
    }
    catch {
        // Quota reached or storage refused: the counters stay valid for the
        // current navigation, which already covers most of the need.
    }
    for (const listener of listeners) {
        listener();
    }
}
