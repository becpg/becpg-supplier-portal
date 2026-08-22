'use client';

/**
 * Autosave — **spec §4.4, F2: "aucune saisie ne peut être perdue"**.
 *
 * This is the single most important behaviour of the redesign. The V1 wizard
 * saves on "Suivant"; a supplier who loses his connection, closes the tab or
 * simply hits the browser's back button loses everything he typed. So the rule
 * here is deliberately paranoid.
 *
 * ## The contract
 *
 * `schedule(task)` takes a **task**, not a payload:
 *
 * ```js
 * autoSave.schedule(async () => {
 *     const values = form.changes();               // read LIVE, at send time
 *     if (Object.keys(values).length === 0) {
 *         return null;                             // nothing to save
 *     }
 *     const result = await api.put(url, { values, formulate: false });
 *     form.markSaved(Object.keys(values));         // confirm only what was sent
 *     return result;
 * }, { key: step.id });                            // one slot per writer
 * ```
 *
 * Everything follows from that one choice:
 *
 * - **Debounced** — a burst of keystrokes schedules one write, `delay` ms after
 *   the last one.
 * - **Coalesced per writer** — the queue is keyed, so only the latest task *of a
 *   given key* survives. A step never evicts another step's unsent input, which
 *   is what a single shared slot used to do the moment a save failed and the
 *   user carried on in the next step. Tasks are drained sequentially, so two
 *   writes can never race on the same field.
 * - **No input is lost on failure** — the task reads the dirty values *when it
 *   runs*, and `markSaved` is only called on success. A failed write leaves the
 *   fields dirty, so the retry (and every later save) still carries them.
 * - **Retried once**, after `retryDelay`. A flaky network is the normal case on
 *   a phone; a second failure is a real one.
 * - **Never silent** — a definitive failure surfaces as `status: 'error'` with
 *   the `ApiError`, which `AutoSaveIndicator` renders with a "Réessayer"
 *   button. Nothing is swallowed, and nothing is retried forever behind the
 *   user's back either.
 * - **Guarded on leave** — while something is pending, in flight or in error,
 *   `beforeunload` asks for a confirmation.
 *
 * `markSaved()` exists for the writers this hook does not own: the datalist
 * editor saves its own rows (`useDataList`), and simply reports the timestamp so
 * the wizard shows one coherent "enregistré à HH:MM" whatever the step type.
 *
 * @example
 * const autoSave = useAutoSave({ onError: (error) => toast.error(error) });
 * // …on step change, before navigating away:
 * await autoSave.flush();
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** The states `AutoSaveIndicator` knows how to render. */
export const AUTOSAVE_STATUS = Object.freeze({
    /** Nothing to save, nothing saved yet. */
    IDLE: 'idle',
    /** Something is waiting for the debounce (or for a retry). */
    PENDING: 'pending',
    /** A write is in flight. */
    SAVING: 'saving',
    /** The last write succeeded. */
    SAVED: 'saved',
    /** The last write failed, retries included. */
    ERROR: 'error',
});

/** Debounce of a scheduled save, in ms. Long enough to coalesce typing. */
const DEFAULT_DELAY = 1200;

/** Wait before the single automatic retry, in ms. */
const DEFAULT_RETRY_DELAY = 2500;

/**
 * Reads the server's `savedAt` out of a step response, falling back on the
 * local clock. The server's timestamp is preferred: it is the one that matches
 * what was actually persisted.
 *
 * @param {*} result
 * @returns {Date}
 */
function savedAtOf(result) {
    const iso = result && typeof result === 'object' ? result.savedAt : null;
    if (iso) {
        const date = new Date(iso);
        if (!Number.isNaN(date.getTime())) {
            return date;
        }
    }
    return new Date();
}

/**
 * @param {Object} [options]
 * @param {number} [options.delay=1200] debounce, in ms
 * @param {number} [options.retryDelay=2500] wait before the automatic retry
 * @param {number} [options.retries=1] automatic retries after a failure
 * @param {(result: *|null, savedAt: Date) => void} [options.onSaved] every
 *        successful write, whichever writer performed it
 * @param {(error: Error) => void} [options.onError] called once, when the retries are exhausted
 * @param {boolean} [options.warnOnLeave=true] `beforeunload` guard while unsaved
 * @returns {{status: string, savedAt: Date|null, error: Error|null,
 *            isPending: boolean, isSaving: boolean, hasUnsaved: boolean,
 *            schedule: Function, flush: Function, retry: Function,
 *            cancel: Function, markSaved: Function, markWriting: Function,
 *            markError: Function, track: Function, reset: Function}}
 */
export function useAutoSave({
    delay = DEFAULT_DELAY,
    retryDelay = DEFAULT_RETRY_DELAY,
    retries = 1,
    onSaved,
    onError,
    warnOnLeave = true,
} = {}) {
    const [state, setState] = useState({
        status: AUTOSAVE_STATUS.IDLE,
        savedAt: null,
        error: null,
    });

    // Everything the scheduler needs lives in refs: a save must be decidable
    // synchronously, from a timer or from an unmount, without waiting for a
    // render.
    //
    // A **Map keyed by writer**, not a single slot. Coalescing is per key, so a
    // step whose save is still pending — or has failed — cannot be evicted by
    // another step scheduling its own. That single-slot design was a real loss
    // path: type in step 1, hit "Suivant" while offline (the flush fails and
    // keeps the task, which is correct), then type in step 2 → the step 1 task
    // was overwritten and everything typed there was gone, silently, error
    // status included. Tasks read their values live through refs that survive
    // unmounting, so a queued task from a step that is no longer on screen is
    // still perfectly sendable.
    const tasksRef = useRef(new Map());
    const timerRef = useRef(null);
    const runningRef = useRef(false);
    const attemptRef = useRef(0);
    const aliveRef = useRef(true);
    const handlers = useRef({ onSaved, onError });

    useEffect(() => {
        handlers.current = { onSaved, onError };
    });

    useEffect(() => {
        aliveRef.current = true;
        return () => {
            aliveRef.current = false;
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, []);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    /**
     * Drains the queue now, one task at a time.
     *
     * Sequential on purpose: two writers may touch the same entity, and a
     * concurrent write is exactly how a "last write wins" race loses a field.
     * Re-entrant safe — a call made while a write is in flight is absorbed, and
     * the runner re-checks the queue on its way out.
     *
     * A task is removed from the queue **only when it succeeded** (and only if
     * nobody re-scheduled the same key meanwhile). A failure keeps it: it will
     * re-read the dirty values on the next attempt, so nothing typed since is
     * lost either.
     *
     * @returns {Promise<*>} the last write result, or null when there was nothing to do
     */
    const run = useCallback(async () => {
        clearTimer();

        if (runningRef.current || tasksRef.current.size === 0) {
            // Not lost: whoever is running re-reads the queue when it lands.
            return null;
        }

        runningRef.current = true;
        setState((current) => ({ ...current, status: AUTOSAVE_STATUS.SAVING, error: null }));

        let lastResult = null;
        let wrote = false;

        try {
            // Snapshot the keys: a task scheduled during the drain is picked up
            // by the tail call below, not half-way through this loop.
            for (const key of Array.from(tasksRef.current.keys())) {
                const task = tasksRef.current.get(key);
                if (!task) {
                    continue;
                }
                const result = await task();
                // Only drop it if nobody replaced it while we were writing.
                if (tasksRef.current.get(key) === task) {
                    tasksRef.current.delete(key);
                }
                if (result !== null && result !== undefined) {
                    lastResult = result;
                    wrote = true;
                }
            }

            runningRef.current = false;
            attemptRef.current = 0;

            if (aliveRef.current) {
                if (!wrote) {
                    // Every task decided there was nothing to write (no dirty
                    // field left). Keep the previous "saved at", it is still true.
                    setState((current) => ({
                        ...current,
                        status: current.savedAt ? AUTOSAVE_STATUS.SAVED : AUTOSAVE_STATUS.IDLE,
                        error: null,
                    }));
                }
                else {
                    const at = savedAtOf(lastResult);
                    setState({ status: AUTOSAVE_STATUS.SAVED, savedAt: at, error: null });
                    if (handlers.current.onSaved) {
                        handlers.current.onSaved(lastResult, at);
                    }
                }
            }

            // A change made during the drain: save it too, immediately.
            if (tasksRef.current.size > 0) {
                return run();
            }
            return lastResult;
        }
        catch (error) {
            runningRef.current = false;

            if (attemptRef.current < retries) {
                attemptRef.current += 1;
                if (aliveRef.current) {
                    setState((current) => ({ ...current, status: AUTOSAVE_STATUS.PENDING, error: null }));
                }
                // The failed task is deliberately still queued: it will re-read
                // the dirty values, so nothing typed in the meantime is lost.
                timerRef.current = setTimeout(() => {
                    run();
                }, retryDelay);
                return null;
            }

            attemptRef.current = 0;
            if (aliveRef.current) {
                setState((current) => ({ ...current, status: AUTOSAVE_STATUS.ERROR, error }));
            }
            if (handlers.current.onError) {
                handlers.current.onError(error);
            }
            // Never rethrown: an autosave failure is a UI state, not an
            // exception the caller has to catch on every keystroke.
            return null;
        }
    }, [clearTimer, retries, retryDelay]);

    /**
     * Schedules a save.
     *
     * The task replaces the **task with the same key** that has not run yet —
     * and only that one. Give each writer a stable key (the step id): two
     * different steps must never evict one another, or the older one's input is
     * lost. The default key exists for a wizard with a single writer.
     *
     * @param {() => Promise<*>} task performs the write and confirms it
     * @param {Object} [options]
     * @param {string} [options.key='default'] the writer's identity
     * @param {boolean} [options.immediate] skip the debounce
     */
    const schedule = useCallback(
        (task, options = {}) => {
            if (typeof task !== 'function') {
                return;
            }
            tasksRef.current.set(options.key || 'default', task);
            attemptRef.current = 0;
            clearTimer();
            setState((current) => ({ ...current, status: AUTOSAVE_STATUS.PENDING, error: null }));

            if (options.immediate) {
                run();
                return;
            }
            timerRef.current = setTimeout(() => {
                run();
            }, delay);
        },
        [clearTimer, delay, run],
    );

    /*
     * WRITES THIS HOOK DOES NOT OWN.
     *
     * The datalist editor sends its rows itself, so the queue above knows
     * nothing about them — and `flush()` returned while a cell was still in the
     * air. Every writer that hands over its promise is waited for here, which is
     * what makes "leave the step, then formulate" mean what it says.
     */
    const trackedRef = useRef(new Set());

    /**
     * Registers a write performed by another writer.
     *
     * @param {Promise} promise settled when that write lands, refusal included
     */
    const track = useCallback((promise) => {
        trackedRef.current.add(promise);
        const forget = () => trackedRef.current.delete(promise);
        promise.then(forget, forget);
    }, []);

    /**
     * Waits for every tracked write, including the ones started while waiting.
     *
     * @returns {Promise<void>}
     */
    const settled = useCallback(async () => {
        // Bounded: a writer that re-arms on every settle must not hold the
        // navigation for ever.
        for (let round = 0; round < 3 && trackedRef.current.size > 0; round += 1) {
            await Promise.allSettled([...trackedRef.current]);
        }
    }, []);

    /**
     * Writes whatever is pending, now, and waits for it. Called before leaving
     * a step, before completing the task, and on unmount.
     *
     * @returns {Promise<*>}
     */
    const flush = useCallback(async () => {
        // The foreign writers first: the grid sends its own PUTs, and what
        // follows a flush — a formulation, a completion — must bear on a
        // repository that has already received them.
        await settled();
        if (tasksRef.current.size === 0 && !runningRef.current) {
            return null;
        }
        attemptRef.current = 0;
        return run();
    }, [run, settled]);

    /** Manual retry, from the indicator's button. */
    const retry = useCallback(() => {
        attemptRef.current = 0;
        return run();
    }, [run]);

    /** Drops every pending task — used when a step is left without saving. */
    const cancel = useCallback(() => {
        clearTimer();
        tasksRef.current.clear();
        attemptRef.current = 0;
    }, [clearTimer]);

    /**
     * Records a save performed by another writer (the datalist editor saves its
     * own rows). Keeps one coherent "enregistré à HH:MM" across step types.
     *
     * `onSaved` fires here too: a caller that wants to know whether anything was
     * written must hear about every writer, not only about the ones going
     * through `schedule`. The result is `null` because a foreign writer keeps
     * its own response; the timestamp is what it reported.
     *
     * @param {Date|string} [at]
     */
    const markSaved = useCallback((at) => {
        const date = at instanceof Date ? at : savedAtOf(at ? { savedAt: at } : null);
        setState({ status: AUTOSAVE_STATUS.SAVED, savedAt: date, error: null });
        if (handlers.current.onSaved) {
            handlers.current.onSaved(null, date);
        }
    }, []);

    /**
     * A foreign writer has just sent a write, whose outcome is not known yet.
     *
     * Distinct from {@link markSaved}: nothing is saved at this point, so the
     * timestamp must not move. It exists because a caller may need to know the
     * step was written on before the answer arrives — the wizard decides on
     * leaving the step, which happens between the two.
     */
    const markWriting = useCallback((inFlight) => {
        if (inFlight && typeof inFlight.then === 'function') {
            track(inFlight);
        }
        if (handlers.current.onSaved) {
            handlers.current.onSaved(null, null);
        }
    }, [track]);

    /**
     * Records a failure from another writer, so the footer never claims
     * everything is saved when it is not.
     *
     * @param {Error} error
     */
    const markError = useCallback((error) => {
        setState((current) => ({ ...current, status: AUTOSAVE_STATUS.ERROR, error: error || null }));
    }, []);

    const reset = useCallback(() => {
        cancel();
        setState({ status: AUTOSAVE_STATUS.IDLE, savedAt: null, error: null });
    }, [cancel]);

    const hasUnsaved =
        state.status === AUTOSAVE_STATUS.PENDING ||
        state.status === AUTOSAVE_STATUS.SAVING ||
        state.status === AUTOSAVE_STATUS.ERROR;

    // Closing the tab on an unsaved form is the one case autosave cannot cover.
    useEffect(() => {
        if (!warnOnLeave || !hasUnsaved || typeof window === 'undefined') {
            return undefined;
        }
        const handler = (event) => {
            event.preventDefault();
            // Chrome ignores the message but requires returnValue to be set.
            event.returnValue = '';
            return '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [warnOnLeave, hasUnsaved]);

    return useMemo(
        () => ({
            status: state.status,
            savedAt: state.savedAt,
            error: state.error,
            isPending: state.status === AUTOSAVE_STATUS.PENDING,
            isSaving: state.status === AUTOSAVE_STATUS.SAVING,
            hasUnsaved,
            schedule,
            flush,
            retry,
            cancel,
            markSaved,
            markWriting,
            markError,
            track,
            reset,
        }),
        [state, hasUnsaved, schedule, flush, retry, cancel, markSaved, markWriting, markError, track, reset],
    );
}
