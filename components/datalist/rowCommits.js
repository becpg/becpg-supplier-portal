/**
 * Pure helpers behind the grid's row writes (`useDataList.commitRow`).
 *
 * Kept free of React so the ordering and rollback rules can be tested on their
 * own: they are what decides whether an edit made while a row is being saved
 * reaches the repository.
 */

/** A row status that carries nothing but "has pending edits". */
export function isPlainDirtyStatus(status, dirtyState) {
    return Boolean(status) && status.state === dirtyState && Object.keys(status).length === 1;
}

/**
 * Runs `task` after every task already queued under `key`, whatever their
 * outcome, and records it as the new tail of that queue.
 *
 * Two writes of the same row must never be in flight together: they can land
 * in either order, and a second create of a draft makes a second row.
 *
 * @param {Map<string, Promise>} chains the tails, keyed by row key
 * @param {string} key
 * @param {() => Promise<*>} task
 * @returns {{promise: Promise<*>, queued: boolean}} the task's own promise, and
 *          whether it had to wait for a previous one
 */
export function enqueueByKey(chains, key, task) {
    const previous = chains.get(key);
    const promise = previous ? previous.then(task, task) : task();
    chains.set(key, promise);
    const forget = () => {
        for (const [entryKey, tail] of chains) {
            if (tail === promise) {
                chains.delete(entryKey);
            }
        }
    };
    promise.then(forget, forget);
    return { promise, queued: Boolean(previous) };
}

/**
 * Moves the pending edits of a draft onto the key of the row it became.
 *
 * Edits typed while the create was in flight were recorded under the draft's
 * key; once the draft is gone they would be shown nowhere and sent never.
 * What is already pending under the target key wins.
 *
 * @param {Object} dirty pending edits, keyed by row key
 * @param {string} fromKey the draft's key
 * @param {string} toKey the persisted row's key
 * @returns {Object} the next pending edits
 */
export function moveDirtyEntry(dirty, fromKey, toKey) {
    const moving = dirty[fromKey];
    if (!moving || fromKey === toKey) {
        return dirty;
    }
    const next = { ...dirty, [toKey]: { ...moving, ...(dirty[toKey] || {}) } };
    delete next[fromKey];
    return next;
}

/**
 * Writes some fields into a row, leaving every other field as it is.
 *
 * @param {Object} entry the row as currently held
 * @param {{values: Object, displayValues: Object}} fields keyed by `formsName`
 * @returns {Object} the patched row
 */
export function patchRowFields(entry, fields) {
    return {
        ...entry,
        values: { ...entry.values, ...fields.values },
        displayValues: { ...entry.displayValues, ...fields.displayValues },
    };
}

/**
 * Puts back, from a snapshot, only the fields a failed write had changed.
 *
 * Restoring the whole snapshot would also undo what landed since it was taken:
 * a refresh, or an earlier write of the same row.
 *
 * @param {Object} entry the row as currently held
 * @param {Object} snapshot the row as it was before the failed write
 * @param {string[]} formsNames the fields that write had changed
 * @returns {Object} the restored row
 */
export function restoreRowFields(entry, snapshot, formsNames) {
    const values = { ...entry.values };
    const displayValues = { ...entry.displayValues };
    for (const name of formsNames) {
        values[name] = snapshot.values?.[name];
        displayValues[name] = snapshot.displayValues?.[name];
    }
    return { ...entry, values, displayValues };
}
