'use client';

/**
 * `useDataList` — the state machine behind the datalist editor.
 *
 * ## What it is driven by
 *
 * Nothing in this file knows a single field name. The grid is entirely described
 * by what the server returns (doc/becpg-api-contracts.md §1 and §2):
 *
 *   - **columns** are resolved by Share (`module/entity-datagrid/config/columns`,
 *     cascade `formId + entityType + siteId + list`) and normalised by
 *     `lib/adapters/datalists.js`. Labels arrive already translated;
 *   - **rows** come from `becpg/entity/datalists/data`, each cell being
 *     `{ value, displayValue }` — `displayValue` is displayed, `value` is edited.
 *
 * The portal renders what it is given: there is no hard-coded column list, no
 * hard-coded ordering, no per-list special case.
 *
 * ## The endpoints it talks to (all through `/api/v1`, never Alfresco directly)
 *
 * | Operation | Call |
 * |---|---|
 * | read | `GET    wizard/{entityId}/step/{stepId}?page&pageSize&sort` |
 * | create / update a row | `PUT    wizard/{entityId}/step/{stepId}` `{ nodeRef?, values, formulate:false }` |
 * | delete rows | `DELETE wizard/{entityId}/step/{stepId}` `{ nodeRefs }` |
 * | reorder | `POST   wizard/{entityId}/step/{stepId}` `{ action:'reorder', nodeRefs, direction }` |
 *
 * **All four go through the step endpoint, deliberately.** Delete and reorder
 * used to call the generic beCPG proxy directly (`slingshot/datalists/action/items`
 * and `becpg/entity/datalists/sort/node/…`), the way Share's own datagrid does —
 * but that made the frozen state a UI convention: `SupplierSecurityPlugin` grants
 * write access per *entity* and knows nothing about `datalists[].state`, so a
 * `fetch()` from a console could delete a row of a validated list. Going through
 * the step means every mutation crosses `assertStepWritable()` server-side.
 *
 * `formulate:false` is sent on every cell write: reformulating on each
 * keystroke-sized save would be absurd — the wizard runs the formulation once,
 * when the step is left.
 *
 * ## Writing model — one PUT per row, not per cell
 *
 * A cell edit is local (`setCell`), a row commit is remote (`commitRow`). The
 * form processor takes a value map anyway, so batching a row's edits into one
 * call is both cheaper and semantically right: a row is the unit beCPG persists.
 *
 * Every commit is **optimistic with rollback**: the new value is shown at once,
 * and the previous row object is restored verbatim if the server refuses. The
 * per-row status (`saving` / `saved` / `error`) is exposed so the UI can say
 * exactly which line failed — a grid that saves silently is a grid that loses
 * data without telling anyone.
 *
 * After a successful write a **silent refresh** is scheduled: `displayValue` is
 * computed server-side (association labels, formatted numbers, dynamic lists),
 * so the optimistic display is a placeholder, never the truth.
 *
 * ## Pagination, sorting, filtering
 *
 * Pagination and sorting are **server side** — `page`, `pageSize` and
 * `sort=bcpg:prop|true` are the datalist webscript's own parameters, and a
 * nutrient list can hold hundreds of rows. Text filtering is **client side, on
 * the loaded page**: the repository's filter is a typed `filterId` /
 * `filterData` pair (contracts §2), not a free-text search, and the step
 * endpoint does not expose it. The filter is therefore a "find it on this page"
 * affordance, not a query — which is also why the row counter keeps showing the
 * server total.
 *
 * ## Read-only
 *
 * `readOnly` is **never re-derived here** (bug #25928, spec §4.4): it comes from
 * the single server-side security call, carried by the step payload
 * (`step.readOnly`, `step.frozen`, `readOnlyReason`). A frozen list is a list the
 * customer validated: `datalists[].state === "Valid"` (contracts §4).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { request } from '@/lib/client';
import { useMessages } from '@/lib/messages';

/**
 * The grid's own vocabulary.
 *
 * These are datagrid mechanics ("move up", "unsaved"), not portal vocabulary and
 * not business labels — business labels arrive translated from beCPG (AGENTS.md
 * rule 4). They live here rather than in `config/messages.js`, which is capped at
 * ~60 chrome keys, and they are shared by the four components of the folder so a
 * word is never spelled two different ways in two layouts.
 */
export const DATALIST_LABELS = {
    fr: {
        rows: '{count} ligne(s)',
        addRow: 'Ajouter une ligne',
        deleteRow: 'Supprimer la ligne',
        moveUp: 'Monter',
        moveDown: 'Descendre',
        actions: 'Actions',
        order: 'Ordre',
        row: 'Ligne {index}',
        newRow: 'Nouvelle ligne',
        saving: 'Enregistrement…',
        saved: 'Enregistré',
        unsaved: 'Modifications non enregistrées',
        saveRow: 'Enregistrer la ligne',
        discard: 'Annuler les modifications',
        failed: 'Échec de l’enregistrement',
        retry: 'Réessayer',
        deleting: 'Suppression…',
        search: 'Rechercher dans la liste',
        readOnly: 'Lecture seule',
        frozenTitle: 'Liste validée par votre client',
        frozenText: 'Votre client a validé cette liste : elle est désormais figée et ne peut plus être modifiée. Si une correction est nécessaire, demandez sa réouverture via la discussion du projet.',
        readAccessTitle: 'Consultation seule',
        readAccessText: 'Vous n’avez qu’un accès en lecture sur cette entité.',
        noTaskTitle: 'Aucune tâche en cours',
        noTaskText: 'La saisie n’est ouverte que pendant une tâche qui vous est assignée. Cette liste reste consultable.',
        wizardReadOnlyTitle: 'Assistant en lecture seule',
        wizardReadOnlyText: 'Cet assistant est configuré en consultation : aucune modification n’est possible.',
        protectedTitle: 'Champ protégé',
        protectedText: 'La colonne « {column} » est protégée : sa valeur est utilisée dans les contrôles de conformité de votre client. Confirmez que vous souhaitez la modifier.',
        protectedUnlock: 'Modifier quand même',
        protectedLocked: 'Champ protégé — cliquez pour déverrouiller',
        deleteTitle: 'Supprimer cette ligne ?',
        deleteText: 'Cette ligne sera définitivement supprimée de la liste.',
        expand: 'Afficher le détail',
        collapse: 'Masquer le détail',
        nestedEmpty: 'Aucun élément',
        empty: 'Cette liste est vide',
        emptyHint: 'Ajoutez une première ligne pour commencer.',
        emptyReadOnly: 'Votre client n’attend aucune ligne dans cette liste.',
        mandatory: 'Champ obligatoire',
        detail: 'Détail',
    },
    en: {
        rows: '{count} row(s)',
        addRow: 'Add a row',
        deleteRow: 'Delete row',
        moveUp: 'Move up',
        moveDown: 'Move down',
        actions: 'Actions',
        order: 'Order',
        row: 'Row {index}',
        newRow: 'New row',
        saving: 'Saving…',
        saved: 'Saved',
        unsaved: 'Unsaved changes',
        saveRow: 'Save row',
        discard: 'Discard changes',
        failed: 'Save failed',
        retry: 'Retry',
        deleting: 'Deleting…',
        search: 'Search in the list',
        readOnly: 'Read only',
        frozenTitle: 'List validated by your customer',
        frozenText: 'Your customer validated this list: it is now frozen and can no longer be modified. If a correction is needed, ask for it to be reopened through the project discussion.',
        readAccessTitle: 'View only',
        readAccessText: 'You only have read access on this entity.',
        noTaskTitle: 'No open task',
        noTaskText: 'Editing is only open while a task is assigned to you. This list stays visible.',
        wizardReadOnlyTitle: 'Read-only assistant',
        wizardReadOnlyText: 'This assistant is configured for consultation: no change is possible.',
        protectedTitle: 'Protected field',
        protectedText: 'The "{column}" column is protected: its value feeds your customer’s compliance checks. Please confirm you want to change it.',
        protectedUnlock: 'Change anyway',
        protectedLocked: 'Protected field — click to unlock',
        deleteTitle: 'Delete this row?',
        deleteText: 'This row will be permanently removed from the list.',
        expand: 'Show details',
        collapse: 'Hide details',
        nestedEmpty: 'No item',
        empty: 'This list is empty',
        emptyHint: 'Add a first row to get started.',
        emptyReadOnly: 'Your customer expects no row in this list.',
        mandatory: 'Required field',
        detail: 'Detail',
    },
};

/**
 * The grid vocabulary in the current chrome language.
 *
 * @returns {(key: string, vars?: Object) => string}
 */
export function useDataListLabels() {
    const { lang } = useMessages();
    return useCallback(
        (key, vars) => {
            const dict = DATALIST_LABELS[lang] || DATALIST_LABELS.fr;
            const value = dict[key] ?? DATALIST_LABELS.fr[key] ?? key;
            if (!vars) {
                return value;
            }
            return value.replace(/\{(\w+)\}/g, (match, name) => (
                vars[name] === undefined || vars[name] === null ? match : String(vars[name])
            ));
        },
        [lang],
    );
}

/** Lifecycle of a single row. */
export const ROW_STATUS = Object.freeze({
    IDLE: 'idle',
    DIRTY: 'dirty',
    SAVING: 'saving',
    SAVED: 'saved',
    ERROR: 'error',
    DELETING: 'deleting',
});

/** How long a "saved" tick stays visible before the row goes back to idle. */
const SAVED_TTL = 2600;

/** Debounce of the post-write silent refresh, so a burst of edits triggers one. */
const REFRESH_DEBOUNCE = 700;

/** Column types that are not a scalar cell but a nested structure. */
export const NESTED_TYPES = ['dataList', 'entity'];

/**
 * @param {Object} column
 * @returns {boolean} true for a sub-datalist / linked-entity column
 */
export function isNestedColumn(column) {
    return NESTED_TYPES.includes(column?.type) || Array.isArray(column?.columns);
}

/**
 * beCPG's sort parameter: `bcpg:nutListValue|true` (`true` = ascending).
 *
 * @param {{column: string, asc: boolean}|null} sort
 * @returns {string|null}
 */
export function sortParam(sort) {
    if (!sort || !sort.column) {
        return null;
    }
    return `${sort.column}|${sort.asc === false ? 'false' : 'true'}`;
}

/**
 * Best-effort local rendering of a value the user just typed, used only until
 * the silent refresh brings back the server's `displayValue`.
 *
 * @param {*} value
 * @returns {string}
 */
function localDisplay(value) {
    if (value === null || value === undefined || value === '') {
        return '';
    }
    if (typeof value === 'boolean') {
        return value ? '✓' : '';
    }
    if (Array.isArray(value)) {
        return value.map((entry) => localDisplay(entry)).filter(Boolean).join(', ');
    }
    if (typeof value === 'object') {
        return String(value.displayValue ?? value.label ?? value.name ?? value.value ?? '');
    }
    return String(value);
}

/**
 * Normalises the step payload into the shape the grid consumes.
 *
 * @param {Object|null} raw response of `GET wizard/{entityId}/step/{stepId}`
 * @returns {Object}
 */
function normalizePayload(raw) {
    const step = raw?.step || {};
    return {
        step,
        title: step.title || step.label || raw?.title || '',
        listId: step.listId || null,
        listNodeRef: raw?.listNodeRef || step.listNodeRef || null,
        itemType: raw?.itemType || step.itemId || null,
        columns: Array.isArray(raw?.columns) ? raw.columns : [],
        rows: Array.isArray(raw?.rows) ? raw.rows : [],
        total: Number(raw?.total ?? (Array.isArray(raw?.rows) ? raw.rows.length : 0)),
        pageSize: Number(raw?.pageSize) || 0,
        permissions: raw?.permissions || {},
        frozen: step.frozen === true,
        readOnly: raw?.readOnly === true || step.readOnly === true,
        readOnlyReason: step.frozen ? 'frozen' : raw?.readOnlyReason || null,
    };
}

let draftSequence = 0;

/**
 * The datalist editor's data layer.
 *
 * @param {Object} options
 * @param {string} [options.entityId] entity nodeRef / uuid — with `stepId`, builds the endpoint
 * @param {string} [options.stepId] wizard step id
 * @param {string} [options.endpoint] overrides the endpoint (`wizard/x/step/y` by default)
 * @param {Object} [options.params] extra query parameters (`wizardId`, `siteId`, `locale`)
 * @param {Object} [options.initialData] server-rendered payload, to avoid a loading flash
 * @param {number} [options.pageSize=25]
 * @param {{column: string, asc: boolean}} [options.initialSort]
 * @param {boolean} [options.readOnly] forces read-only on top of the server verdict
 * @param {Function} [options.onSaved] `(result, row) => void` — the wizard's "saved at HH:MM"
 * @param {Function} [options.onError] `(error, row) => void` — usually a toast
 * @returns {Object} see the properties listed at the end of the function
 */
export function useDataList(options = {}) {
    const {
        entityId,
        stepId,
        endpoint,
        params,
        initialData = null,
        pageSize: initialPageSize = 25,
        initialSort = null,
        readOnly: forcedReadOnly = false,
        onSaved,
        onError,
    } = options;

    const path = endpoint || (entityId && stepId ? `wizard/${encodeURIComponent(entityId)}/step/${encodeURIComponent(stepId)}` : null);

    const [payload, setPayload] = useState(() => normalizePayload(initialData));
    const [loading, setLoading] = useState(Boolean(path) && !initialData);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(
        Number(initialData?.pageSize) || initialPageSize,
    );
    const [sort, setSort] = useState(initialSort);
    const [filter, setFilter] = useState('');
    const [drafts, setDrafts] = useState([]);
    const [dirty, setDirty] = useState({});
    const [status, setStatus] = useState({});
    const [unlocked, setUnlocked] = useState({});
    const [pendingUnlock, setPendingUnlock] = useState(null);
    const [nonce, setNonce] = useState(0);

    const silent = useRef(false);
    const refreshTimer = useRef(null);
    const savedTimers = useRef(new Map());
    const alive = useRef(true);
    const handlers = useRef({ onSaved, onError });
    const paramsRef = useRef(params);

    // `dirty` is mirrored in a ref because a picker commits in the very tick it
    // changes: `commitRow` must see the edit `setCell` just recorded, and React
    // state would still hold the previous value at that point.
    const dirtyRef = useRef(dirty);
    const updateDirty = useCallback((updater) => {
        const next = updater(dirtyRef.current);
        dirtyRef.current = next;
        setDirty(next);
        return next;
    }, []);

    // Kept in refs and refreshed after every render, so a caller may pass inline
    // callbacks and an inline `params` object without re-triggering anything.
    useEffect(() => {
        handlers.current = { onSaved, onError };
        paramsRef.current = params;
    });

    useEffect(() => {
        alive.current = true;
        const timers = savedTimers.current;
        return () => {
            alive.current = false;
            timers.forEach((timer) => clearTimeout(timer));
            timers.clear();
            if (refreshTimer.current) {
                clearTimeout(refreshTimer.current);
            }
        };
    }, []);

    /* ---------------------------------------------------------------- reading */

    // Callers pass `params` inline (`params={{ wizardId, siteId }}`), so a new
    // object identity arrives on every render. Keying on its serialisation is
    // what keeps the fetch effect from looping forever.
    const paramsKey = JSON.stringify(params || {});

    const query = useMemo(
        () => ({ ...JSON.parse(paramsKey), page, pageSize, sort: sortParam(sort) }),
        [paramsKey, page, pageSize, sort],
    );

    useEffect(() => {
        if (!path) {
            return undefined;
        }
        const controller = new AbortController();
        const wasSilent = silent.current;
        silent.current = false;
        if (!wasSilent) {
            setLoading(true);
        }

        request(path, { params: query, signal: controller.signal })
            .then((data) => {
                if (!alive.current) {
                    return;
                }
                setPayload(normalizePayload(data));
                setError(null);
                setLoading(false);
            })
            .catch((cause) => {
                if (!alive.current || cause?.name === 'AbortError') {
                    return;
                }
                setError(cause);
                setLoading(false);
            });

        return () => controller.abort();
        // `query` is a memo, so this runs on page / pageSize / sort / params change.
    }, [path, query, nonce]);

    /**
     * Re-reads the page.
     *
     * @param {{silent?: boolean}} [opts] `silent` keeps the current rows on screen
     */
    const refresh = useCallback((opts = {}) => {
        silent.current = opts.silent === true;
        setNonce((value) => value + 1);
    }, []);

    /** Coalesces the refreshes that follow a burst of row writes. */
    const scheduleRefresh = useCallback(() => {
        if (refreshTimer.current) {
            clearTimeout(refreshTimer.current);
        }
        refreshTimer.current = setTimeout(() => {
            refreshTimer.current = null;
            if (alive.current) {
                refresh({ silent: true });
            }
        }, REFRESH_DEBOUNCE);
    }, [refresh]);

    /* ----------------------------------------------------------------- status */

    const setRowStatus = useCallback((key, next) => {
        setStatus((previous) => ({ ...previous, [key]: next }));
        const timer = savedTimers.current.get(key);
        if (timer) {
            clearTimeout(timer);
            savedTimers.current.delete(key);
        }
        if (next?.state === ROW_STATUS.SAVED) {
            savedTimers.current.set(
                key,
                setTimeout(() => {
                    savedTimers.current.delete(key);
                    if (alive.current) {
                        setStatus((previous) => (
                            previous[key]?.state === ROW_STATUS.SAVED
                                ? { ...previous, [key]: { state: ROW_STATUS.IDLE } }
                                : previous
                        ));
                    }
                }, SAVED_TTL),
            );
        }
    }, []);

    /* ------------------------------------------------------------------- rows */

    const rows = useMemo(() => {
        const persisted = (payload.rows || []).map((row) => ({
            ...row,
            key: row.nodeRef,
            draft: false,
        }));
        return [...persisted, ...drafts];
    }, [payload.rows, drafts]);

    const columns = payload.columns;

    const readOnly = forcedReadOnly || payload.readOnly || payload.frozen;
    const frozen = payload.frozen;
    const readOnlyReason = frozen ? 'frozen' : payload.readOnlyReason;

    /**
     * Current value of a cell: the pending edit if there is one, the server value
     * otherwise.
     */
    const valueOf = useCallback(
        (row, column) => {
            const pending = dirty[row.key];
            if (pending && Object.prototype.hasOwnProperty.call(pending, column.name)) {
                return pending[column.name];
            }
            return row.values?.[column.formsName] ?? null;
        },
        [dirty],
    );

    /** What to print in read mode — `displayValue`, already localised by beCPG. */
    const displayOf = useCallback(
        (row, column) => {
            const pending = dirty[row.key];
            if (pending && Object.prototype.hasOwnProperty.call(pending, column.name)) {
                return localDisplay(pending[column.name]);
            }
            const display = row.displayValues?.[column.formsName];
            if (display === null || display === undefined) {
                return localDisplay(row.values?.[column.formsName]);
            }
            return Array.isArray(display) ? '' : String(display);
        },
        [dirty],
    );

    /** Rows of nested sub-lists, as `[{ values, displayValues }]`. */
    const nestedRowsOf = useCallback((row, column) => {
        const values = row.values?.[column.formsName];
        const displays = row.displayValues?.[column.formsName];
        if (!Array.isArray(values)) {
            return [];
        }
        return values.map((entry, index) => ({
            values: entry || {},
            displayValues: (Array.isArray(displays) ? displays[index] : null) || {},
        }));
    }, []);

    /** Client-side text filter, applied to the loaded page (see the hook doc). */
    const visibleRows = useMemo(() => {
        const needle = filter.trim().toLowerCase();
        if (!needle) {
            return rows;
        }
        return rows.filter((row) => {
            if (row.draft) {
                return true;
            }
            return columns.some((column) => displayOf(row, column).toLowerCase().includes(needle));
        });
    }, [rows, columns, filter, displayOf]);

    /* -------------------------------------------------------------- permissions */

    const canCreate = !readOnly && payload.permissions?.create !== false;
    const canReorder = !readOnly && payload.permissions?.sort === true && !sort;
    const canEditRow = useCallback(
        (row) => !readOnly && (row.draft || row.permissions?.edit !== false),
        [readOnly],
    );
    const canDeleteRow = useCallback(
        (row) => !readOnly && (row.draft || row.permissions?.delete !== false),
        [readOnly],
    );

    const unlockKey = (rowKey, columnName) => `${rowKey}::${columnName}`;

    const isUnlocked = useCallback(
        (rowKey, columnName) => unlocked[unlockKey(rowKey, columnName)] === true,
        [unlocked],
    );

    /**
     * Is this cell editable right now?
     *
     * A `protectedField` column is delivered read-only by the adapter on purpose
     * (spec §6, point 6): it stays locked until the user goes through the
     * confirmation step, which flips it for that row only.
     */
    const isCellEditable = useCallback(
        (row, column) => {
            if (!canEditRow(row) || isNestedColumn(column)) {
                return false;
            }
            if (column.protectedField) {
                return isUnlocked(row.key, column.name);
            }
            return !column.readOnly;
        },
        [canEditRow, isUnlocked],
    );

    const requestUnlock = useCallback((row, column) => {
        setPendingUnlock({ rowKey: row.key, column, row });
    }, []);

    const confirmUnlock = useCallback(() => {
        if (pendingUnlock) {
            setUnlocked((previous) => ({
                ...previous,
                [unlockKey(pendingUnlock.rowKey, pendingUnlock.column.name)]: true,
            }));
        }
        setPendingUnlock(null);
    }, [pendingUnlock]);

    const cancelUnlock = useCallback(() => setPendingUnlock(null), []);

    /* ---------------------------------------------------------------- editing */

    /** Records a local edit. Nothing leaves the browser until `commitRow`. */
    const setCell = useCallback((row, column, value) => {
        updateDirty((previous) => ({
            ...previous,
            [row.key]: { ...(previous[row.key] || {}), [column.name]: value },
        }));
        setStatus((previous) => (
            previous[row.key]?.state === ROW_STATUS.SAVING
                ? previous
                : { ...previous, [row.key]: { state: ROW_STATUS.DIRTY } }
        ));
    }, [updateDirty]);

    const isRowDirty = useCallback(
        (rowKey) => Object.keys(dirty[rowKey] || {}).length > 0,
        [dirty],
    );

    /** Adds an empty local row. It is persisted by `commitRow`, not before. */
    const addRow = useCallback(
        (initialValues = {}) => {
            draftSequence += 1;
            const key = `draft-${draftSequence}`;
            const draft = {
                key,
                nodeRef: null,
                itemType: payload.itemType,
                values: {},
                displayValues: {},
                permissions: { edit: true, delete: true },
                draft: true,
            };
            setDrafts((previous) => [...previous, draft]);
            if (Object.keys(initialValues).length > 0) {
                updateDirty((previous) => ({ ...previous, [key]: { ...initialValues } }));
            }
            setRowStatus(key, { state: ROW_STATUS.DIRTY });
            return draft;
        },
        [payload.itemType, setRowStatus, updateDirty],
    );

    /** Drops the pending edits of a row (and the row itself when it is a draft). */
    const discardRow = useCallback((row) => {
        updateDirty((previous) => {
            const next = { ...previous };
            delete next[row.key];
            return next;
        });
        setStatus((previous) => {
            const next = { ...previous };
            delete next[row.key];
            return next;
        });
        if (row.draft) {
            setDrafts((previous) => previous.filter((entry) => entry.key !== row.key));
        }
    }, [updateDirty]);

    /**
     * Persists a row's pending edits — create when it is a draft, update otherwise.
     *
     * Optimistic: the values are written into the local row before the call, and
     * the previous row is restored as-is when the server refuses.
     *
     * @param {Object} row
     * @returns {Promise<Object|null>} the server result, or null when there was nothing to save
     */
    const commitRow = useCallback(
        async (row) => {
            const changes = dirtyRef.current[row.key];
            if (!changes || Object.keys(changes).length === 0) {
                return null;
            }
            if (readOnly || !path) {
                return null;
            }

            const columnByName = new Map(columns.map((column) => [column.name, column]));
            // A protected column can only be in `changes` after an explicit unlock;
            // this guard exists so a programmatic caller cannot bypass the step.
            const locked = Object.keys(changes).filter((name) => {
                const column = columnByName.get(name);
                return column?.protectedField && !isUnlocked(row.key, name);
            });
            if (locked.length > 0) {
                setRowStatus(row.key, {
                    state: ROW_STATUS.ERROR,
                    error: { messageKey: 'error.forbidden' },
                });
                return null;
            }

            // A new row is only created once its mandatory columns are filled.
            // Sending it half-empty would earn a 400 from the form processor and
            // put a red line under something the user was simply still typing.
            if (row.draft) {
                const incomplete = columns.some((column) => {
                    if (!column.mandatory || column.readOnly || isNestedColumn(column)) {
                        return false;
                    }
                    const value = Object.prototype.hasOwnProperty.call(changes, column.name)
                        ? changes[column.name]
                        : row.values?.[column.formsName];
                    return value === null || value === undefined || value === '';
                });
                if (incomplete) {
                    setRowStatus(row.key, { state: ROW_STATUS.DIRTY, incomplete: true });
                    return null;
                }
            }

            // --- optimistic write ------------------------------------------
            const optimisticValues = { ...row.values };
            const optimisticDisplays = { ...row.displayValues };
            for (const [name, value] of Object.entries(changes)) {
                const column = columnByName.get(name);
                if (!column) {
                    continue;
                }
                optimisticValues[column.formsName] = value;
                optimisticDisplays[column.formsName] = localDisplay(value);
            }
            const patch = (entry) => (
                entry.key === row.key
                    ? { ...entry, values: optimisticValues, displayValues: optimisticDisplays }
                    : entry
            );
            if (row.draft) {
                setDrafts((previous) => previous.map(patch));
            }
            else {
                setPayload((previous) => ({
                    ...previous,
                    rows: previous.rows.map((entry) => (
                        entry.nodeRef === row.nodeRef
                            ? { ...entry, values: optimisticValues, displayValues: optimisticDisplays }
                            : entry
                    )),
                }));
            }
            updateDirty((previous) => {
                const next = { ...previous };
                delete next[row.key];
                return next;
            });
            setRowStatus(row.key, { state: ROW_STATUS.SAVING });

            try {
                const result = await request(path, {
                    method: 'PUT',
                    params: paramsRef.current || undefined,
                    // The reformulation is run once when the step is left, never on
                    // a cell save (spec §4.4: asynchronous and non blocking).
                    body: { nodeRef: row.nodeRef || undefined, values: changes, formulate: false },
                });
                if (!alive.current) {
                    return result;
                }
                setRowStatus(result?.nodeRef || row.nodeRef || row.key, {
                    state: ROW_STATUS.SAVED,
                    at: result?.savedAt || new Date().toISOString(),
                });
                if (row.draft) {
                    // The draft has become a real row: drop it and re-read at once,
                    // so the line the user sees is the one the repository holds
                    // (nodeRef, permissions, server-computed display values).
                    setDrafts((previous) => previous.filter((entry) => entry.key !== row.key));
                    refresh({ silent: true });
                }
                else {
                    scheduleRefresh();
                }
                if (handlers.current.onSaved) {
                    handlers.current.onSaved(result, row);
                }
                return result;
            }
            catch (cause) {
                if (!alive.current) {
                    return null;
                }
                // --- rollback ----------------------------------------------
                const restore = (entry) => (entry.key === row.key ? row : entry);
                if (row.draft) {
                    setDrafts((previous) => previous.map(restore));
                }
                else {
                    setPayload((previous) => ({
                        ...previous,
                        rows: previous.rows.map((entry) => (entry.nodeRef === row.nodeRef ? row : entry)),
                    }));
                }
                updateDirty((previous) => ({ ...previous, [row.key]: { ...changes, ...(previous[row.key] || {}) } }));
                setRowStatus(row.key, { state: ROW_STATUS.ERROR, error: cause });
                if (handlers.current.onError) {
                    handlers.current.onError(cause, row);
                }
                return null;
            }
        },
        [readOnly, path, columns, isUnlocked, setRowStatus, scheduleRefresh, refresh, updateDirty],
    );

    /**
     * Deletes a row. Optimistic too: the line disappears immediately and comes
     * back, in place, if the repository refuses.
     *
     * @param {Object} row
     * @returns {Promise<boolean>}
     */
    const deleteRow = useCallback(
        async (row) => {
            if (row.draft) {
                discardRow(row);
                return true;
            }
            if (readOnly || !row.nodeRef) {
                return false;
            }

            const index = payload.rows.findIndex((entry) => entry.nodeRef === row.nodeRef);
            setRowStatus(row.key, { state: ROW_STATUS.DELETING });
            setPayload((previous) => ({
                ...previous,
                rows: previous.rows.filter((entry) => entry.nodeRef !== row.nodeRef),
                total: Math.max(0, previous.total - 1),
            }));

            try {
                const result = await request(path, {
                    method: 'DELETE',
                    params: paramsRef.current || undefined,
                    body: { nodeRefs: [row.nodeRef] },
                });
                const failed = Array.isArray(result?.failed) ? result.failed : [];
                if (failed.length > 0) {
                    throw Object.assign(new Error('Delete refused'), { messageKey: 'error.forbidden' });
                }
                if (alive.current) {
                    setStatus((previous) => {
                        const next = { ...previous };
                        delete next[row.key];
                        return next;
                    });
                    scheduleRefresh();
                }
                return true;
            }
            catch (cause) {
                if (!alive.current) {
                    return false;
                }
                setPayload((previous) => {
                    const restored = [...previous.rows];
                    restored.splice(index < 0 ? restored.length : index, 0, row);
                    return { ...previous, rows: restored, total: previous.total + 1 };
                });
                setRowStatus(row.key, { state: ROW_STATUS.ERROR, error: cause });
                if (handlers.current.onError) {
                    handlers.current.onError(cause, row);
                }
                return false;
            }
        },
        [readOnly, path, payload.rows, discardRow, setRowStatus, scheduleRefresh],
    );

    /**
     * Moves a row up or down — only on a list carrying `bcpg:sortableList`, which
     * is exactly what `permissions.sort` reports.
     *
     * @param {Object} row
     * @param {'up'|'down'} direction
     * @returns {Promise<boolean>}
     */
    const moveRow = useCallback(
        async (row, direction) => {
            if (!canReorder || row.draft || !payload.listNodeRef) {
                return false;
            }
            const index = payload.rows.findIndex((entry) => entry.nodeRef === row.nodeRef);
            const target = direction === 'up' ? index - 1 : index + 1;
            if (index < 0 || target < 0 || target >= payload.rows.length) {
                return false;
            }

            const previousRows = payload.rows;
            const reordered = [...previousRows];
            reordered.splice(target, 0, reordered.splice(index, 1)[0]);
            setPayload((previous) => ({ ...previous, rows: reordered }));
            setRowStatus(row.key, { state: ROW_STATUS.SAVING });

            try {
                await request(path, {
                    method: 'POST',
                    params: paramsRef.current || undefined,
                    body: { action: 'reorder', nodeRefs: [row.nodeRef], direction },
                });
                if (alive.current) {
                    setRowStatus(row.key, { state: ROW_STATUS.SAVED, at: new Date().toISOString() });
                    scheduleRefresh();
                }
                return true;
            }
            catch (cause) {
                if (!alive.current) {
                    return false;
                }
                setPayload((previous) => ({ ...previous, rows: previousRows }));
                setRowStatus(row.key, { state: ROW_STATUS.ERROR, error: cause });
                if (handlers.current.onError) {
                    handlers.current.onError(cause, row);
                }
                return false;
            }
        },
        [canReorder, path, payload.listNodeRef, payload.rows, setRowStatus, scheduleRefresh],
    );

    /** Toggles the sort on a column (asc → desc → none). */
    const toggleSort = useCallback((column) => {
        setPage(1);
        setSort((previous) => {
            if (!previous || previous.column !== column.name) {
                return { column: column.name, asc: true };
            }
            return previous.asc ? { column: column.name, asc: false } : null;
        });
    }, []);

    const total = payload.total;
    const pageCount = Math.max(1, Math.ceil((total || 0) / (pageSize || 1)));

    return {
        /* data */
        columns,
        rows: visibleRows,
        allRows: rows,
        total,
        listNodeRef: payload.listNodeRef,
        itemType: payload.itemType,
        title: payload.title,
        step: payload.step,

        /* fetch state */
        loading,
        error,
        refresh,

        /* pagination, sorting, filtering */
        page,
        setPage,
        pageSize,
        setPageSize,
        pageCount,
        sort,
        setSort,
        toggleSort,
        filter,
        setFilter,

        /* read-only */
        readOnly,
        frozen,
        readOnlyReason,

        /* permissions */
        canCreate,
        canReorder,
        canEditRow,
        canDeleteRow,
        isCellEditable,

        /* values */
        valueOf,
        displayOf,
        nestedRowsOf,

        /* editing */
        setCell,
        commitRow,
        discardRow,
        addRow,
        deleteRow,
        moveRow,
        isRowDirty,
        statusOf: (rowKey) => status[rowKey] || { state: ROW_STATUS.IDLE },

        /* protected fields */
        isUnlocked,
        requestUnlock,
        pendingUnlock,
        confirmUnlock,
        cancelUnlock,
    };
}
