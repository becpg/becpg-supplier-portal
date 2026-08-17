/**
 * What the supplier has already read — and why it can only live here.
 *
 * A portal discussion is the Alfresco forum attached to a node
 * (`fm:forum` → `fm:topic` → `fm:post`), the same thread Share writes. That
 * model carries no read state at all: neither per user, nor per message.
 * `lib/adapters/notifications.js` already observes this and draws the
 * consequence — unread cannot be computed server side, and a rule based on the
 * date alone would flag the same message forever.
 *
 * The "3" badge next to « Mes discussions » therefore counted the threads that
 * have at least one comment, not those calling for an answer. Nothing in the
 * list then said which ones were new: the counter promised information the
 * screen did not deliver.
 *
 * This module holds that state where it legitimately belongs: in the user's
 * browser, one entry per thread, the date of the last message they opened. A
 * thread is new as long as its last message is later than that date. It is
 * accurate in the sense the user means — "I have not opened it yet" — and
 * stable: the marker does not vanish on its own after a few days, it vanishes
 * once the thread has been read.
 *
 * An accepted limitation, stated rather than hidden: the state is per browser.
 * The same supplier on another machine finds their threads marked as new again.
 * A shared state would mean writing it into the repository, hence a beCPG model
 * the portal has no business inventing.
 *
 * Client only — `localStorage` does not exist during server rendering, and every
 * function below answers with a neutral value rather than failing.
 */

/**
 * Storage key: `{ [nodeRef]: { date, count } }`.
 *
 * Two screens ask the same question with what they have at hand. The dashboard
 * knows the date of the last message, because it reads the preview of three
 * threads. The Discussions screen lists twenty-six topics and cannot afford one
 * thread read per row: it only knows the message count, which comes along with
 * the product list.
 *
 * Both are recorded, and {@link isUnread} uses whichever one it has. The older
 * format — a plain date string — is still read, so that what had been opened
 * before this change is not turned back to unread.
 */
const STORAGE_KEY = 'becpg.portal.discussions.read';

/**
 * The empty state, in a single copy.
 *
 * `useSyncExternalStore` compares snapshots by identity: returning a fresh
 * object on every read would make React loop forever. This constant is both the
 * server snapshot and the snapshot of an empty storage.
 */
const EMPTY = Object.freeze({});

/**
 * Beyond this, the oldest entries are forgotten. An active supplier opens a few
 * dozen threads; the bound exists so that storage does not grow without end,
 * not to ration it.
 */
const MAX_ENTRIES = 500;

/* --- The store, as `useSyncExternalStore` expects it ----------------------- */

/** Last raw text read from storage, and the object derived from it. */
let cachedRaw = null;
let cachedState = EMPTY;

/** The mounted components, to notify when a read is recorded. */
const listeners = new Set();

/**
 * The complete read state, stable by identity as long as storage has not
 * changed.
 *
 * That is the condition `useSyncExternalStore` sets: two successive calls
 * without a write must return exactly the same object, otherwise React
 * considers the store changed and redraws endlessly. Hence the comparison on
 * the raw text rather than on the result of `JSON.parse`.
 *
 * @returns {Object<string, string>} nodeRef → ISO date; empty outside the
 *   browser or when the stored content is unreadable
 */
export function readState() {
    if (typeof window === 'undefined') {
        return EMPTY;
    }
    let raw = null;
    try {
        raw = window.localStorage.getItem(STORAGE_KEY);
    }
    catch {
        // Storage refused (private browsing): no marker is better than a
        // broken screen.
        return EMPTY;
    }
    if (raw === cachedRaw) {
        return cachedState;
    }
    cachedRaw = raw;
    cachedState = EMPTY;
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                cachedState = parsed;
            }
        }
        catch {
            // Corrupted JSON: start again from an empty state rather than propagate.
        }
    }
    return cachedState;
}

/**
 * The server render snapshot: always empty, because the server knows nothing of
 * what this user has read. That is what guarantees there is no hydration
 * mismatch — the markers appear on the first client render.
 *
 * @returns {Object<string, string>}
 */
export function serverState() {
    return EMPTY;
}

/**
 * Subscribes to read state changes.
 *
 * The browser `storage` event only fires in the other tabs; writes from this
 * tab go through {@link listeners}. Both are needed so that a thread opened in
 * one tab stops being flagged in the other.
 *
 * @param {() => void} listener
 * @returns {() => void} the unsubscribe function
 */
export function subscribe(listener) {
    listeners.add(listener);
    if (typeof window !== 'undefined') {
        window.addEventListener('storage', listener);
    }
    return () => {
        listeners.delete(listener);
        if (typeof window !== 'undefined') {
            window.removeEventListener('storage', listener);
        }
    };
}

/**
 * Does this thread carry a message the user has not opened yet?
 *
 * A thread never opened is new. A thread without a last-message date is not:
 * without a date, nothing lets us claim it moved, and flagging when in doubt
 * would permanently mark every thread whose preview could not be read.
 *
 * @param {{nodeRef: string, last: {date: string|null}|null}} thread
 * @param {Object<string, string>} state state returned by {@link readState}
 * @returns {boolean}
 */
export function isUnread(thread, state) {
    if (!thread || !thread.nodeRef) {
        return false;
    }
    const seen = entryOf(state, thread.nodeRef);

    // The message count, when the date is missing: that is all a topic list
    // knows, and "there are more than on my last visit" does answer the
    // question being asked.
    const lastDate = thread.last ? thread.last.date : null;
    if (!lastDate) {
        const count = Number(thread.count);
        if (!count || count <= 0) {
            return false;
        }
        return !seen || !(Number(seen.count) >= count);
    }

    const lastMs = Date.parse(lastDate);
    if (Number.isNaN(lastMs)) {
        return false;
    }
    if (!seen || !seen.date) {
        return true;
    }
    const seenMs = Date.parse(seen.date);
    return Number.isNaN(seenMs) || lastMs > seenMs;
}

/**
 * The entry recorded for a thread, whatever format it was written in.
 *
 * @param {Object<string, *>} state
 * @param {string} nodeRef
 * @returns {{date: string|null, count: number|null}|null}
 */
function entryOf(state, nodeRef) {
    const raw = state ? state[nodeRef] : null;
    if (!raw) {
        return null;
    }
    // Original format: the date alone, as a string.
    if (typeof raw === 'string') {
        return { date: raw, count: null };
    }
    if (typeof raw === 'object') {
        return { date: raw.date || null, count: raw.count === undefined ? null : Number(raw.count) };
    }
    return null;
}

/**
 * Marks a thread as read up to the date of its last message.
 *
 * The message date is recorded, not the moment of the click: a message posted
 * while reading must stay new, and that is guaranteed by never dating the read
 * later than what was actually read.
 *
 * @param {string} nodeRef the node carrying the forum
 * @param {string|null} lastDate ISO date of the last displayed message
 * @param {number|null} [count] message count of the thread at read time
 * @returns {void}
 */
export function markRead(nodeRef, lastDate, count = null) {
    if (typeof window === 'undefined' || !nodeRef) {
        return;
    }
    const state = readState();
    const previous = entryOf(state, nodeRef);

    /*
     * What the caller does not know is KEPT, never overwritten.
     *
     * The Discussions screen knows the message count and not the date; the
     * dashboard knows the opposite. If each wrote the whole entry, opening a
     * thread from one would erase what the other had left there, and the thread
     * would turn back to unread on the first return to the other screen.
     */
    const entry = {
        date: lastDate || (previous && previous.date) || new Date().toISOString(),
        count: count === null || count === undefined
            ? (previous ? previous.count : null)
            : Number(count),
    };
    const next = { ...state, [nodeRef]: entry };

    // Purge the oldest reads, not the oldest discussions: the recorded date is
    // what orders them, and it does say which thread has not been touched for
    // a long time.
    const keys = Object.keys(next);
    if (keys.length > MAX_ENTRIES) {
        const stampOf = (key) => {
            const parsed = Date.parse((entryOf(next, key) || {}).date || 0);
            return Number.isNaN(parsed) ? 0 : parsed;
        };
        keys.sort((a, b) => stampOf(a) - stampOf(b));
        for (const key of keys.slice(0, keys.length - MAX_ENTRIES)) {
            delete next[key];
        }
    }

    const raw = JSON.stringify(next);
    try {
        window.localStorage.setItem(STORAGE_KEY, raw);
    }
    catch {
        // Quota reached or storage refused: the marker still disappears for the
        // current page, thanks to the cache updated just below.
    }

    // The cache is set by hand rather than re-read: it is what gives React its
    // snapshot, and it must reflect the write even when the browser refused
    // that write.
    cachedRaw = raw;
    cachedState = next;
    for (const listener of listeners) {
        listener();
    }
}
