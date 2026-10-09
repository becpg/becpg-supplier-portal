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
import { formatDateTime, isIsoTimestamp } from '@/lib/format';
import {
    enqueueByKey,
    isPlainDirtyStatus,
    moveDirtyEntry,
    patchRowFields,
    restoreRowFields,
} from '@/components/datalist/rowCommits';
import { defineLabels, pickLabels } from '@/lib/i18n';

/**
 * The grid's own vocabulary.
 *
 * These are datagrid mechanics ("move up", "unsaved"), not portal vocabulary and
 * not business labels — business labels arrive translated from beCPG (AGENTS.md
 * rule 4). They live here rather than in `config/messages.js`, which is capped at
 * ~60 chrome keys, and they are shared by the four components of the folder so a
 * word is never spelled two different ways in two layouts.
 */
export const DATALIST_LABELS = defineLabels('components/datalist/useDataList#DATALIST_LABELS', {
    fr: {
        rows: '{count} ligne(s)',
        addRow: 'Ajouter une ligne',
        deleteRow: 'Supprimer la ligne',
        editRow: 'Modifier la ligne',
        moveUp: 'Monter',
        moveDown: 'Descendre',
        actions: 'Actions',
        order: 'Ordre',
        row: 'Ligne {index}',
        newRow: 'Nouvelle ligne',
        totalRow: 'Ligne de total, calculée par beCPG',
        incomplete: 'Complétez les champs obligatoires pour enregistrer cette ligne',
        sortBy: 'Trier par {column}',
        saving: 'Enregistrement…',
        saved: 'Enregistré',
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
        duplicate: 'Dupliquer cette ligne',
        select: 'Sélectionner',
        selectRow: 'Sélectionner la ligne {index}',
        selectAll: 'Sélectionner toutes les lignes de la page',
        selected: '{count} ligne(s) sélectionnée(s)',
        clearSelection: 'Tout désélectionner',
        // Short on the button, explicit in the accessible name: four row-level
        // buttons already carry « Monter », « Dupliquer »…
        bulkMoveUp: 'Monter',
        bulkMoveUpLong: 'Monter la sélection',
        bulkMoveDown: 'Descendre',
        bulkMoveDownLong: 'Descendre la sélection',
        bulkDuplicate: 'Dupliquer',
        bulkDuplicateLong: 'Dupliquer la sélection',
        bulkDelete: 'Supprimer',
        bulkDeleteLong: 'Supprimer la sélection',
        accessDenied: 'Accès refusé',
        accessDeniedRow: 'Cette ligne porte une caractéristique que votre compte ne peut pas lire : elle n’est pas modifiable ici.',
        bulkEdit: 'Modifier',
        bulkEditLong: 'Modifier la sélection',
        bulkEditTitle: 'Modifier {count} ligne(s)',
        bulkEditPickFields: 'Champs à remplir',
        bulkEditSearchField: 'Rechercher un champ',
        bulkEditApply: 'Appliquer à {count} ligne(s)',
        bulkEditCancel: 'Annuler',
        bulkEditEmptyClears: 'Un champ coché mais laissé vide efface la valeur sur toutes les lignes.',
        bulkEditSkipped: '{count} ligne(s) de la sélection ne sont pas modifiables et seront laissées telles quelles.',
        bulkEditTooMany: '{count} lignes sélectionnées, le maximum est de {max}. Réduisez la sélection.',
        bulkEditNoColumn: 'Aucune colonne de cette liste ne peut être remplie en série.',
        deleteSelectedTitle: 'Supprimer {count} ligne(s) ?',
        deleteSelectedText: 'Ces lignes seront définitivement supprimées de la liste.',
        rowsPerPage: 'Lignes par page',
        shortcuts: 'Raccourcis clavier',
        shortcutsTitle: 'Saisir au clavier',
        shortcutList: [
            ['Tab / Maj+Tab', 'cellule suivante / précédente'],
            ['Entrée', 'enregistre la ligne et descend dans la même colonne'],
            ['Entrée sur la dernière ligne', 'ajoute une ligne'],
            ['↑ / ↓', 'même colonne, ligne du dessus / dessous'],
            ['Échap', 'annule les modifications de la ligne en cours de saisie'],
            ['Ctrl+Entrée', 'ajoute une ligne'],
            ['Ctrl+D', 'duplique la ligne courante'],
            ['Ctrl+V', 'colle un bloc de cellules depuis un tableur'],
        ],
        pasteTitle: 'Collage depuis un tableur',
        pasteApplied: '{cells} valeur(s) collée(s) sur {rows} ligne(s), dont {created} nouvelle(s).',
        pasteNothing: 'Rien n’a pu être collé.',
        pasteUndo: 'Annuler le collage',
        pasteSave: 'Enregistrer les {count} ligne(s)',
        pasteResolving: 'Recherche des libellés…',
        pasteUnmatched: '{count} valeur(s) non reprise(s) — corrigez-les à la main :',
        pasteExtraColumns: '{count} colonne(s) collée(s) au-delà de la dernière colonne de la liste : ignorée(s).',
        pasteRefusedRows: '{count} ligne(s) au-delà de la liste : cette liste n’accepte pas de nouvelle ligne.',
        pasteLine: 'ligne {line}',
        pasteReasons: {
            number: 'nombre attendu',
            integer: 'nombre entier attendu',
            boolean: 'oui / non attendu',
            date: 'date attendue (jj/mm/aaaa)',
            list: 'valeur hors de la liste proposée',
            readonly: 'colonne non modifiable',
            association: 'aucune correspondance exacte dans le référentiel',
        },
    },
    en: {
        rows: '{count} row(s)',
        addRow: 'Add a row',
        deleteRow: 'Delete row',
        editRow: 'Edit the row',
        moveUp: 'Move up',
        moveDown: 'Move down',
        actions: 'Actions',
        order: 'Order',
        row: 'Row {index}',
        newRow: 'New row',
        totalRow: 'Total row, computed by beCPG',
        incomplete: 'Fill in the required fields to save this row',
        sortBy: 'Sort by {column}',
        saving: 'Saving…',
        saved: 'Saved',
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
        duplicate: 'Duplicate this row',
        select: 'Select',
        selectRow: 'Select row {index}',
        selectAll: 'Select every row on this page',
        selected: '{count} row(s) selected',
        clearSelection: 'Clear the selection',
        bulkMoveUp: 'Move up',
        bulkMoveUpLong: 'Move the selection up',
        bulkMoveDown: 'Move down',
        bulkMoveDownLong: 'Move the selection down',
        bulkDuplicate: 'Duplicate',
        bulkDuplicateLong: 'Duplicate the selection',
        bulkDelete: 'Delete',
        bulkDeleteLong: 'Delete the selection',
        accessDenied: 'Access refused',
        accessDeniedRow: 'This row carries a characteristic your account may not read: it cannot be edited here.',
        bulkEdit: 'Edit',
        bulkEditLong: 'Edit the selection',
        bulkEditTitle: 'Edit {count} row(s)',
        bulkEditPickFields: 'Fields to fill in',
        bulkEditSearchField: 'Search a field',
        bulkEditApply: 'Apply to {count} row(s)',
        bulkEditCancel: 'Cancel',
        bulkEditEmptyClears: 'A field ticked but left empty clears the value on every row.',
        bulkEditSkipped: '{count} selected row(s) cannot be edited and will be left as they are.',
        bulkEditTooMany: '{count} rows selected, the maximum is {max}. Narrow the selection.',
        bulkEditNoColumn: 'No column of this list can be filled in series.',
        deleteSelectedTitle: 'Delete {count} row(s)?',
        deleteSelectedText: 'These rows will be permanently removed from the list.',
        rowsPerPage: 'Rows per page',
        shortcuts: 'Keyboard shortcuts',
        shortcutsTitle: 'Typing with the keyboard',
        shortcutList: [
            ['Tab / Shift+Tab', 'next / previous cell'],
            ['Enter', 'saves the row and moves down in the same column'],
            ['Enter on the last row', 'adds a row'],
            ['↑ / ↓', 'same column, row above / below'],
            ['Esc', 'discards the changes of the row being edited'],
            ['Ctrl+Enter', 'adds a row'],
            ['Ctrl+D', 'duplicates the current row'],
            ['Ctrl+V', 'pastes a block of cells from a spreadsheet'],
        ],
        pasteTitle: 'Pasted from a spreadsheet',
        pasteApplied: '{cells} value(s) pasted over {rows} row(s), {created} of them new.',
        pasteNothing: 'Nothing could be pasted.',
        pasteUndo: 'Undo the paste',
        pasteSave: 'Save the {count} row(s)',
        pasteResolving: 'Looking the labels up…',
        pasteUnmatched: '{count} value(s) not taken — fix them by hand:',
        pasteExtraColumns: '{count} pasted column(s) past the last column of the list: ignored.',
        pasteRefusedRows: '{count} row(s) past the end of the list: this list accepts no new row.',
        pasteLine: 'line {line}',
        pasteReasons: {
            number: 'a number was expected',
            integer: 'a whole number was expected',
            boolean: 'yes / no was expected',
            date: 'a date was expected (dd/mm/yyyy)',
            list: 'value outside the offered list',
            readonly: 'column cannot be changed',
            association: 'no exact match in the reference data',
        },
    },
});

/**
 * The grid vocabulary in the current chrome language.
 *
 * @returns {(key: string, vars?: Object) => string}
 */
export function useDataListLabels() {
    const { lang } = useMessages();
    return useCallback(
        (key, vars) => {
            const dict = pickLabels(DATALIST_LABELS, lang);
            const value = dict[key] ?? DATALIST_LABELS.fr[key] ?? key;
            // A few entries are a table rather than a sentence (the shortcut
            // list, the paste reasons); they are handed back untouched.
            if (!vars || typeof value !== 'string') {
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
 * `itemType` of the synthetic summary row beCPG appends to a list.
 *
 * It is **not** a row of the list. `IngListExtractor.extract()` builds it after
 * the page has been extracted (`ret.addItem(totalRow)`), gives it
 * `itemType: "total"`, **no `nodeRef`**, and a `userAccess` map in which
 * `edit`, `delete`, `sort`, `select` and `create` are all `false`. It sums
 * `ingListQtyPerc` and its two yield variants over the depth-1 ingredients,
 * skipping the ones declared `Omit`.
 *
 * Two consequences the grid has to honour, and neither can be read off the
 * payload alone:
 *
 *  - it has no `nodeRef`, so it cannot be the subject of a PUT or a DELETE, and
 *    it cannot key a React list either — `key: row.nodeRef` produced `null`,
 *    which React treats as *no key at all*, and every per-row map in this hook
 *    (`dirty`, `status`, `unlocked`) collapsed onto the same `"null"` entry;
 *  - `addItem` does not touch `fullListSize` (`PaginatedExtractedItems:40,66`),
 *    so the `total` the server reports **already excludes it**. Nothing here may
 *    subtract it a second time — the row counter is right as it stands, and it
 *    stays right because the summary rows are handed out separately from the
 *    data rows rather than filtered out of them at each call site.
 */
export const TOTAL_ITEM_TYPE = 'total';

/**
 * True for a row the repository computed rather than a row the supplier owns.
 *
 * @param {Object} row
 * @returns {boolean}
 */
export function isTotalRow(row) {
    return row?.itemType === TOTAL_ITEM_TYPE;
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
 * The nodeRefs an association cell currently holds.
 *
 * A stored association arrives from `splitCells` as an array of cells —
 * `[{ value: "workspace://…", displayValue: "pH", metadata: "physicoChem" }]` —
 * and a single one may also arrive as a bare string. Both shapes are reduced to
 * a flat list of nodeRefs, which is what `assoc_x_removed` expects.
 *
 * @param {*} value
 * @returns {string[]}
 */
export function toNodeRefList(value) {
    if (value === null || value === undefined || value === '') {
        return [];
    }
    if (Array.isArray(value)) {
        return value.flatMap((entry) => toNodeRefList(entry));
    }
    if (typeof value === 'object') {
        return toNodeRefList(value.value !== undefined ? value.value : value.nodeRef);
    }
    return String(value).split(',').map((entry) => entry.trim()).filter(Boolean);
}

/**
 * Best-effort local rendering of a value the user just typed, used only until
 * the silent refresh brings back the server's `displayValue`.
 *
 * @param {*} value
 * @param {string} [lang='fr']
 * @returns {string}
 */
function localDisplay(value, lang = 'fr') {
    if (value === null || value === undefined || value === '') {
        return '';
    }
    if (typeof value === 'boolean') {
        return value ? '✓' : '';
    }
    if (Array.isArray(value)) {
        return value.map((entry) => localDisplay(entry, lang)).filter(Boolean).join(', ');
    }
    if (typeof value === 'object') {
        return String(value.displayValue ?? value.label ?? value.name ?? value.value ?? '');
    }
    // A date column echoes back the ISO string the picker produced; printed raw
    // it shows the user a timestamp in the cell he just edited.
    if (isIsoTimestamp(value)) {
        return formatDateTime(value, lang, { fallback: String(value) });
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
        // The item's own form, when beCPG sent one — the row editor's fields.
        rowForm: raw?.rowForm || null,
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
 * What a cell prints in read mode: its pending edit when there is one,
 * `displayValue` (already localised by beCPG) otherwise.
 *
 * @param {Object|undefined} pending the row's pending edits
 * @param {Object} row
 * @param {Object} column
 * @param {string} lang
 * @returns {string}
 */
function cellDisplay(pending, row, column, lang) {
    if (pending && Object.prototype.hasOwnProperty.call(pending, column.name)) {
        return localDisplay(pending[column.name], lang);
    }
    const display = row.displayValues?.[column.formsName];
    if (display === null || display === undefined) {
        return localDisplay(row.values?.[column.formsName], lang);
    }
    return Array.isArray(display) ? '' : String(display);
}

/** The status of a row nothing has happened to, shared so it compares equal. */
const IDLE_STATUS = Object.freeze({ state: ROW_STATUS.IDLE });

/**
 * The row statuses after an edit. A row being saved stays SAVING, and a row
 * already plainly DIRTY keeps its very status object: replacing it on every
 * keystroke re-rendered every row of the grid.
 *
 * @param {Object} statuses keyed by row key
 * @param {string} key
 * @returns {Object}
 */
function keepOrMarkDirty(statuses, key) {
    const current = statuses[key];
    if (current?.state === ROW_STATUS.SAVING || isPlainDirtyStatus(current, ROW_STATUS.DIRTY)) {
        return statuses;
    }
    return { ...statuses, [key]: { state: ROW_STATUS.DIRTY } };
}

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
 * @param {Function} [options.onWriting] `(inFlight: Promise) => void` — a row write is leaving now,
 *        whatever its outcome; the wizard uses it to know the step was written on
 * @param {Function} [options.onSaved] `(result, row) => void` — the wizard's "saved at HH:MM"
 * @param {Function} [options.onError] `(error, row) => void` — usually a toast
 * @returns {Object} see the properties listed at the end of the function
 */
export function useDataList(options = {}) {
    const { lang } = useMessages();
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
        onWriting,
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
    const handlers = useRef({ onSaved, onError, onWriting });
    const paramsRef = useRef(params);
    // The rows as of the last committed render. `commitAll` walks whatever is
    // dirty at the moment it is called, and needs the row objects behind those
    // keys without becoming a dependency of every callback that touches them.
    const rowsRef = useRef([]);
    // One write at a time per row (see `commitRow`): the tail of each row's
    // queue, and the persisted row each created draft became.
    const commitChains = useRef(new Map());
    const createdDrafts = useRef(new Map());

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

    // The row statuses are mirrored the same way, so the instance this hook
    // returns can stay the same object while a supplier types: the readers
    // below go through the refs, and each row is re-rendered by its own slice
    // (`pendingOf`, `statusOf`) rather than by a new list on every keystroke.
    const statusRef = useRef(status);
    const updateStatus = useCallback((updater) => {
        const next = updater(statusRef.current);
        if (next !== statusRef.current) {
            statusRef.current = next;
            setStatus(next);
        }
    }, []);

    // Kept in refs and refreshed after every render, so a caller may pass inline
    // callbacks and an inline `params` object without re-triggering anything.
    useEffect(() => {
        handlers.current = { onSaved, onError, onWriting };
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
        updateStatus((previous) => ({ ...previous, [key]: next }));
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
                        updateStatus((previous) => (
                            previous[key]?.state === ROW_STATUS.SAVED
                                ? { ...previous, [key]: { state: ROW_STATUS.IDLE } }
                                : previous
                        ));
                    }
                }, SAVED_TTL),
            );
        }
    }, [updateStatus]);

    /* ------------------------------------------------------------------- rows */

    const rows = useMemo(() => {
        const persisted = (payload.rows || []).map((row, index) => ({
            ...row,
            // A summary row carries no nodeRef (see {@link isTotalRow}); its key
            // is derived from its position so React, and the four per-row maps
            // of this hook, still see one entry per row.
            key: row.nodeRef || `computed-${row.itemType || 'row'}-${index}`,
            draft: false,
        }));
        return [...persisted, ...drafts];
    }, [payload.rows, drafts]);

    const columns = payload.columns;
    /*
     * The item's own form, when beCPG sent one — see `RowFormModal`. It carries
     * the fields the datagrid form deliberately leaves out, the parent of an
     * ingredient first among them. `null` means "no row editor", never "no
     * fields".
     */
    const rowForm = payload.rowForm || null;

    const readOnly = forcedReadOnly || payload.readOnly || payload.frozen;
    const frozen = payload.frozen;
    const readOnlyReason = frozen ? 'frozen' : payload.readOnlyReason;

    /**
     * Current value of a cell: the pending edit if there is one, the server value
     * otherwise.
     */
    const valueOf = useCallback(
        (row, column) => {
            const pending = dirtyRef.current[row.key];
            if (pending && Object.prototype.hasOwnProperty.call(pending, column.name)) {
                return pending[column.name];
            }
            return row.values?.[column.formsName] ?? null;
        },
        [],
    );

    /** What to print in read mode — `displayValue`, already localised by beCPG. */
    const displayOf = useCallback(
        (row, column) => cellDisplay(dirtyRef.current[row.key], row, column, lang),
        [lang],
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

    /*
     * Data rows and computed rows are two different things and are handed out
     * as two different lists.
     *
     * Filtering, numbering, counting, sorting, adding, deleting and committing
     * all mean "the rows the supplier owns"; the summary row belongs to none of
     * them. Splitting once, here, is what makes "the total is always last" true
     * of the card layout and of every consumer of the hook, and not only of the
     * one table that happens to render a `<tfoot>`.
     */
    useEffect(() => {
        rowsRef.current = rows;
    });

    const dataRows = useMemo(() => rows.filter((row) => !isTotalRow(row)), [rows]);

    /**
     * The rows beCPG computed, always last. There is exactly one today (the
     * ingList total), but nothing here assumes that.
     *
     * They are deliberately **not** filtered: the total is the total of the
     * list, not of what a text filter left on screen, and hiding it while
     * filtering would make it look as though the list had no total at all.
     */
    const summaryRows = useMemo(() => rows.filter(isTotalRow), [rows]);

    /** Client-side text filter, applied to the loaded page (see the hook doc). */
    // Reads `dirty` itself rather than `displayOf`, whose identity does not
    // change while typing: the filter must also match what is being typed.
    const visibleRows = useMemo(() => {
        const needle = filter.trim().toLowerCase();
        if (!needle) {
            return dataRows;
        }
        return dataRows.filter((row) => {
            if (row.draft) {
                return true;
            }
            return columns.some((column) => cellDisplay(dirty[row.key], row, column, lang)
                .toLowerCase().includes(needle));
        });
    }, [dataRows, columns, filter, dirty, lang]);

    /* -------------------------------------------------------------- permissions */

    const canCreate = !readOnly && payload.permissions?.create !== false;

    /*
     * Reordering is a **row** permission, not a list one, and reading it off the
     * list was silently fatal.
     *
     * `payload.permissions` is `metadata.parent.permissions.userAccess`, and
     * beCPG's `JSONDataListOutputWriter` puts exactly one key in it: `create`.
     * The full map — `edit`, `delete`, `sort`, `lock`… — is emitted per item by
     * `AbstractDataListExtractor`, which is also where the sortable aspect is
     * tested (`nodeService.hasAspect(nodeRef, ASPECT_SORTABLE_LIST)`). So
     * `payload.permissions.sort` was *never* true, on any list, for anyone, and
     * the up/down buttons never rendered — measured on `bcpg:nutList`, whose rows
     * all report `"sort": true`.
     *
     * Share's own datagrid reads the row: `oRecord.getData("permissions").
     * userAccess.sort` (`entity-datagrid.js`). This does the same, and keeps the
     * parent map as a fallback in case a future writer starts filling it.
     */
    const canReorder = !readOnly && !sort && (
        payload.permissions?.sort === true
        || dataRows.some((row) => !row.draft && row.permissions?.sort === true)
    );
    /*
     * `isTotalRow` first, and not only `permissions.edit !== false`.
     *
     * The repository does send `edit: false` on the summary row, so the payload
     * alone would be enough *today*, for `bcpg:ingList`. It is not enough as a
     * rule: the permission map is written by each extractor, and a list that
     * grows a computed row without filling one in would hand the supplier an
     * editable, deletable line that no PUT can ever reach (it has no nodeRef).
     * A computed row is not editable because of what it *is*.
     */
    // `accessDenied`: the repository grants the write, and the grid still declines
    // it. A row whose characteristic reads « accès interdit » is not a row the
    // supplier can answer for -- see `normalizeRow`.
    const canEditRow = useCallback(
        (row) => !readOnly && !isTotalRow(row) && !row.accessDenied
            && (row.draft || row.permissions?.edit !== false),
        [readOnly],
    );
    const canDeleteRow = useCallback(
        (row) => !readOnly && !isTotalRow(row) && !row.accessDenied
            && (row.draft || row.permissions?.delete !== false),
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

    /**
     * The values a new row starts with — the model defaults of its mandatory
     * columns.
     *
     * Only the mandatory ones: those are the values beCPG writes anyway at
     * creation, and the ones `commitRow` blocks on. Seeding anything else would
     * put values on screen the supplier never typed.
     */
    const columnDefaults = useMemo(() => {
        const initial = {};
        for (const column of columns) {
            if (!column.mandatory || column.readOnly || column.protectedField || isNestedColumn(column)) {
                continue;
            }
            if (column.defaultValue !== null && column.defaultValue !== undefined) {
                initial[column.name] = column.defaultValue;
            }
        }
        return initial;
    }, [columns]);

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
        updateStatus((previous) => keepOrMarkDirty(previous, row.key));
    }, [updateDirty, updateStatus]);

    /**
     * Several cells of one row, in a single update.
     *
     * Not a convenience: a paste writes ten columns of forty rows, and calling
     * `setCell` four hundred times would queue four hundred updates of a map
     * that is copied whole each time. It also has to be atomic for the caller —
     * a row must never be committed with half of a pasted line in it.
     *
     * @param {Object} row
     * @param {Object<string, *>} entries keyed by **column name**, as `dirty` is
     */
    const setCells = useCallback((row, entries) => {
        if (!entries || Object.keys(entries).length === 0) {
            return;
        }
        updateDirty((previous) => ({
            ...previous,
            [row.key]: { ...(previous[row.key] || {}), ...entries },
        }));
        updateStatus((previous) => keepOrMarkDirty(previous, row.key));
    }, [updateDirty, updateStatus]);

    const isRowDirty = useCallback(
        (rowKey) => Object.keys(dirtyRef.current[rowKey] || {}).length > 0,
        [],
    );

    /** The pending edits of one row, the same object until that row changes. */
    const pendingOf = useCallback((rowKey) => dirtyRef.current[rowKey], []);

    /** One row's status; a row with none shares a single idle status object. */
    const statusOf = useCallback((rowKey) => statusRef.current[rowKey] || IDLE_STATUS, []);


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
            const seeded = { ...columnDefaults, ...initialValues };
            if (Object.keys(seeded).length > 0) {
                updateDirty((previous) => ({ ...previous, [key]: { ...seeded } }));
            }
            setRowStatus(key, { state: ROW_STATUS.DIRTY });
            return draft;
        },
        [payload.itemType, setRowStatus, updateDirty, columnDefaults],
    );

    /**
     * A new line pre-filled from an existing one — the "same thing, one value
     * different" case, which is most of a nutrient or an allergen list.
     *
     * Only what the supplier may write is copied: a computed column, a protected
     * column and a nested sub-list are left to the server. Associations are
     * copied as their nodeRefs, which is the shape the picker itself emits.
     *
     * @param {Object} source the row to copy
     * @returns {Object|null} the draft, or null when the list refuses new rows
     */
    const duplicateRow = useCallback(
        (source) => {
            if (!canCreate || !source || isTotalRow(source)) {
                return null;
            }
            const initial = {};
            for (const column of columns) {
                if (column.readOnly || column.protectedField || isNestedColumn(column)) {
                    continue;
                }
                const pending = dirtyRef.current[source.key];
                const value = pending && Object.prototype.hasOwnProperty.call(pending, column.name)
                    ? pending[column.name]
                    : source.values?.[column.formsName];
                if (value === null || value === undefined || value === '') {
                    continue;
                }
                if (column.type === 'association') {
                    /*
                     * Copied as the **cells** the repository sent —
                     * `[{ value: nodeRef, displayValue: "E. coli O157" }]` — and
                     * not as bare nodeRefs.
                     *
                     * All three consumers need it that way and only this shape
                     * satisfies all three: `localDisplay` prints the label (a
                     * bare nodeRef put `workspace://SpacesStore/559164c2…` in the
                     * cell — measured), the picker resolves its own label from
                     * it, and `toFormValue` unwraps `{value}` back to the nodeRef
                     * for the PUT. Nothing is invented: the label is the one
                     * beCPG already computed for the row being copied.
                     */
                    const cells = (Array.isArray(value) ? value : [value])
                        .map((cell) => (cell && typeof cell === 'object'
                            ? { value: cell.value ?? cell.nodeRef ?? null, displayValue: cell.displayValue ?? null }
                            : { value: String(cell), displayValue: null }))
                        .filter((cell) => cell.value);
                    if (cells.length === 0) {
                        continue;
                    }
                    initial[column.name] = cells;
                    continue;
                }
                initial[column.name] = value;
            }
            return addRow(initial);
        },
        [canCreate, columns, addRow],
    );

    /** Drops the pending edits of a row (and the row itself when it is a draft). */
    const discardRow = useCallback((row) => {
        updateDirty((previous) => {
            const next = { ...previous };
            delete next[row.key];
            return next;
        });
        updateStatus((previous) => {
            const next = { ...previous };
            delete next[row.key];
            return next;
        });
        if (row.draft) {
            setDrafts((previous) => previous.filter((entry) => entry.key !== row.key));
        }
    }, [updateDirty, updateStatus]);

    /**
     * Hands a created draft over to the row it became.
     *
     * The supplier may have kept typing in the draft while its create was in
     * flight. Those edits were recorded under the draft's key, which vanishes
     * with the draft: they move to the new nodeRef, and any write still queued
     * for the draft is sent as an update of that row instead of a second
     * create.
     *
     * @param {Object} draft the draft as it was sent
     * @param {string} nodeRef the row the repository created
     * @param {{values: Object, displayValues: Object}} written the fields the create carried
     * @returns {boolean} whether edits are still pending on the new row
     */
    const adoptCreatedDraft = useCallback((draft, nodeRef, written) => {
        createdDrafts.current.set(draft.key, {
            ...patchRowFields(draft, written),
            key: nodeRef,
            nodeRef,
            draft: false,
        });
        const draftChain = commitChains.current.get(draft.key);
        if (draftChain && !commitChains.current.has(nodeRef)) {
            commitChains.current.set(nodeRef, draftChain);
        }
        const next = updateDirty((previous) => moveDirtyEntry(previous, draft.key, nodeRef));
        return Object.keys(next[nodeRef] || {}).length > 0;
    }, [updateDirty]);

    /**
     * Sends a row's pending edits, now: create when it is a draft, update
     * otherwise. Only ever called through {@link commitRow}, which makes sure
     * no other write of the same row is in flight.
     *
     * Optimistic: the values are written into the local row before the call,
     * and the fields it changed are restored when the server refuses.
     *
     * @param {Object} row
     * @returns {Promise<Object|null>} the server result, or null when there was nothing to save
     */
    const writeRow = useCallback(
        async (row) => {
            const changes = dirtyRef.current[row.key];
            if (!changes || Object.keys(changes).length === 0) {
                return null;
            }
            if (readOnly || !path || isTotalRow(row)) {
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

            /*
             * EMPTYING A MANDATORY COLUMN IS NOT A WRITE EITHER.
             *
             * A persisted row had no such guard: clearing the mandatory
             * association of a line — `nutListNut` on the nutrients, the
             * characteristic of any characteristic list — sent the removal, and
             * beCPG answered « Erreur de multiplicité de cible d'association ».
             * The supplier got a red row and a message from the repository's
             * internals for doing something the column itself declares
             * impossible.
             *
             * The verdict is the same as for a half-filled draft, and so is the
             * treatment: the edit stays pending — `dirty` is untouched, so the
             * cell keeps showing itself empty and marks itself invalid — the row
             * says « Renseignez les champs obligatoires », and nothing goes out.
             * Filling the column again is what sends the row.
             *
             * Only what THIS edit empties is examined, never the whole row: a
             * line that already reached the portal with a mandatory column blank
             * must stay editable on its other columns.
             */
            const emptiedMandatory = Object.entries(changes).some(([name, value]) => {
                const column = columnByName.get(name);
                if (!column?.mandatory || column.readOnly || isNestedColumn(column)) {
                    return false;
                }
                return value === null || value === undefined || value === ''
                    || (Array.isArray(value) && value.length === 0);
            });
            if (emptiedMandatory) {
                setRowStatus(row.key, { state: ROW_STATUS.DIRTY, incomplete: true });
                return null;
            }

            // --- clearing an association is a delta, not a value ------------
            //
            // Alfresco persists associations from `assoc_x_added` / `assoc_x_removed`
            // and **ignores an empty `_added`**. Sending `null` therefore produced
            // `{added: "", removed: ""}` — a request that returns 200 and changes
            // nothing. Measured on `bcpg:pclPhysicoChem`: the picker emptied itself,
            // the row reported "Enregistré", and beCPG still held `pH`. A grid that
            // says saved and did not save is worse than one that fails.
            //
            // So a cleared association names what must be removed: its current
            // value, and beCPG then answers for real. A *mandatory* association
            // never reaches this point — the guard above holds the row back
            // rather than let the repository refuse it.
            const outgoing = { ...changes };
            for (const [name, value] of Object.entries(changes)) {
                const column = columnByName.get(name);
                const emptied = value === null || value === undefined || value === ''
                    || (Array.isArray(value) && value.length === 0);
                if (column?.type === 'association' && emptied && !row.draft) {
                    outgoing[name] = { added: [], removed: toNodeRefList(row.values?.[column.formsName]) };
                }
            }

            /*
             * A write is going out NOW, not when it comes back — and the caller
             * is handed the promise that says when it lands.
             *
             * The wizard formulates on leaving a step the supplier wrote on, and
             * it reads that fact when the step is left, which happens on the very
             * click that follows the blur that started this request. Announcing
             * the write only on its return would skip the formulation on the step
             * that earned it; announcing it without the promise ran the
             * formulation *beside* the write, so beCPG recomputed the sheet as it
             * was **before** the cell — a claim set to « certifié » then produced
             * no certificate, which is defect 4 of the 21/08 recette.
             */
            let settleInFlight;
            const inFlight = new Promise((resolve) => {
                settleInFlight = resolve;
            });
            if (handlers.current.onWriting) {
                handlers.current.onWriting(inFlight);
            }

            // --- optimistic write ------------------------------------------
            // Only the fields of this write are patched onto the row as it is
            // held when the patch applies, so a refresh or an earlier write
            // that landed meanwhile is not painted over.
            const optimisticValues = {};
            const optimisticDisplays = {};
            let touchesAssociation = false;
            for (const [name, value] of Object.entries(changes)) {
                const column = columnByName.get(name);
                if (!column) {
                    continue;
                }
                optimisticValues[column.formsName] = value;
                if (column.type === 'association') {
                    // The picker hands back a nodeRef, and a nodeRef is never
                    // something to show: the previous label stays on screen until
                    // the re-read below brings the repository's own.
                    touchesAssociation = true;
                    continue;
                }
                optimisticDisplays[column.formsName] = localDisplay(value, lang);
            }
            const writtenFields = { values: optimisticValues, displayValues: optimisticDisplays };
            const isThisRow = (entry) => (row.draft ? entry.key === row.key : entry.nodeRef === row.nodeRef);
            const applyToRow = (transform) => {
                const map = (entries) => entries.map((entry) => (isThisRow(entry) ? transform(entry) : entry));
                if (row.draft) {
                    setDrafts(map);
                }
                else {
                    setPayload((previous) => ({ ...previous, rows: map(previous.rows) }));
                }
            };
            applyToRow((entry) => patchRowFields(entry, writtenFields));
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
                    body: { nodeRef: row.nodeRef || undefined, values: outgoing, formulate: false },
                });
                if (!alive.current) {
                    return result;
                }
                const savedKey = result?.nodeRef || row.nodeRef || row.key;
                // Edits typed while this write was in flight are still to be
                // sent: the row says so rather than claiming it is saved.
                const pendingSince = row.draft && result?.nodeRef
                    ? adoptCreatedDraft(row, result.nodeRef, writtenFields)
                    : Object.keys(dirtyRef.current[row.key] || {}).length > 0;
                setRowStatus(savedKey, pendingSince
                    ? { state: ROW_STATUS.DIRTY }
                    : { state: ROW_STATUS.SAVED, at: result?.savedAt || new Date().toISOString() });
                if (row.draft) {
                    if (!result?.nodeRef && dirtyRef.current[row.key]) {
                        console.warn(`Datalist ${path}: a row was created without a nodeRef in the answer, `
                            + 'the edits typed during its creation stay on the draft');
                    }
                    // The draft has become a real row: drop it and re-read at once,
                    // so the line the user sees is the one the repository holds
                    // (nodeRef, permissions, server-computed display values).
                    setDrafts((previous) => previous.filter((entry) => entry.key !== row.key));
                    refresh({ silent: true });
                }
                else if (touchesAssociation) {
                    // Not debounced: the cell is showing a label that is now
                    // wrong, and every tick of the debounce is a tick of it.
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
                const writtenNames = Object.keys(optimisticValues);
                applyToRow((entry) => restoreRowFields(entry, row, writtenNames));
                updateDirty((previous) => ({ ...previous, [row.key]: { ...changes, ...(previous[row.key] || {}) } }));
                setRowStatus(row.key, { state: ROW_STATUS.ERROR, error: cause });
                if (handlers.current.onError) {
                    handlers.current.onError(cause, row);
                }
                return null;
            }
            finally {
                // Whatever happened: a caller waiting on this write must not be
                // left waiting on a refusal.
                settleInFlight();
            }
        },
        [readOnly, path, columns, isUnlocked, setRowStatus, scheduleRefresh, refresh, updateDirty, lang,
            adoptCreatedDraft],
    );

    /**
     * The row a queued write must bear on, read when it runs rather than when
     * it was queued: an earlier write of the same row has changed its values
     * since, and a draft may have become a persisted row.
     *
     * @param {Object} row the row as it was when the write was asked for
     * @returns {Object}
     */
    const currentRow = useCallback((row) => {
        const created = createdDrafts.current.get(row.key);
        const key = created ? created.key : row.key;
        return rowsRef.current.find((entry) => entry.key === key) || created || row;
    }, []);

    /**
     * Persists a row's pending edits.
     *
     * Writes of one row are serialised: a commit asked for while another is in
     * flight (a second blur, Enter, a picker) waits for it, then sends what is
     * pending by then. Two concurrent PUTs of a row could land in either order,
     * and a draft committed twice was created twice.
     *
     * @param {Object} row
     * @returns {Promise<Object|null>} the server result, or null when there was nothing to save
     */
    const commitRow = useCallback((row) => {
        const created = createdDrafts.current.get(row.key);
        const key = created ? created.key : row.key;
        const { promise, queued } = enqueueByKey(commitChains.current, key, () => writeRow(currentRow(row)));
        if (queued) {
            // Announced now, not when it starts: whoever waits for the grid's
            // writes before leaving the step must wait for this one too.
            handlers.current.onWriting?.(promise);
        }
        return promise;
    }, [writeRow, currentRow]);

    /**
     * Persists **every** row that holds pending edits, oldest first.
     *
     * Sequential, not parallel, and that is the point: a paste can leave forty
     * dirty lines, and forty concurrent PUTs on the same datalist would race the
     * repository's own sort index. It also means the caller can report progress
     * honestly — the count only goes down when a row really was accepted.
     *
     * @returns {Promise<{saved: number, failed: number}>}
     */
    /**
     * Writes a whole row at once — what the row editor submits.
     *
     * It goes through `setCells` and `commitRow` rather than around them, so the
     * optimistic write, the rollback and the row status are the ones the grid
     * already has. `updateDirty` writes its ref synchronously, so the commit
     * that follows in the same tick really sees these values.
     *
     * @param {Object} row
     * @param {Object} values keyed by prefixed column/field name
     * @returns {Promise<Object|null>} what `commitRow` returned
     */
    const saveRowValues = useCallback(async (row, values) => {
        setCells(row, values || {});
        return commitRow(row);
    }, [setCells, commitRow]);

    /**
     * The same values on several rows, in ONE request.
     *
     * beCPG applies them in a single transaction (`becpg/bulkedit/…/bulksave`),
     * so this is not a loop over `saveRowValues`: thirty rows are one call that
     * either lands whole or not at all, which is the gesture the supplier made.
     *
     * The rows are re-read afterwards rather than patched here: the repository
     * may have derived more than what was sent — a formulated column, a state —
     * and guessing that would put a number on screen nobody wrote.
     *
     * @param {Object[]} selection
     * @param {Object} values
     * @returns {Promise<Object|null>} the answer, or null when nothing was owed
     */
    const bulkEdit = useCallback(
        async (selection, values) => {
            const rows = (selection || []).filter(
                (row) => row && !row.draft && !isTotalRow(row) && row.nodeRef,
            );
            if (readOnly || !path || rows.length === 0 || !values || Object.keys(values).length === 0) {
                return null;
            }

            const nodeRefs = rows.map((row) => row.nodeRef);
            rows.forEach((row) => setRowStatus(row.key, { state: ROW_STATUS.SAVING }));

            try {
                const result = await request(path, {
                    method: 'POST',
                    params: paramsRef.current || undefined,
                    body: { action: 'bulkEdit', nodeRefs, values },
                });
                if (!alive.current) {
                    return result;
                }
                const at = new Date().toISOString();
                rows.forEach((row) => setRowStatus(row.key, { state: ROW_STATUS.SAVED, at }));
                refresh({ silent: true });
                return result;
            }
            catch (cause) {
                if (!alive.current) {
                    return null;
                }
                // The whole call failed, so every row failed: saying so on each of
                // them is what stops a supplier believing part of it went through.
                rows.forEach((row) => setRowStatus(row.key, { state: ROW_STATUS.ERROR, error: cause }));
                throw cause;
            }
        },
        [readOnly, path, setRowStatus, refresh],
    );

    const commitAll = useCallback(async () => {
        const keys = Object.keys(dirtyRef.current);
        // A created draft's pending edits sit under its nodeRef before the
        // re-read has brought that row on screen.
        const created = Array.from(createdDrafts.current.values());
        const byKey = new Map([...created, ...rowsRef.current].map((row) => [row.key, row]));
        let saved = 0;
        let failed = 0;
        for (const key of keys) {
            const row = byKey.get(key);
            if (!row) {
                continue;
            }
            const result = await commitRow(row);
            if (result) {
                saved += 1;
            }
            else if (dirtyRef.current[key]) {
                failed += 1;
            }
        }
        return { saved, failed };
    }, [commitRow]);

    /**
     * Throws away pending edits by row key — the undo of a paste.
     *
     * @param {string[]} keys
     */
    const discardRows = useCallback((keys) => {
        const set = new Set(keys || []);
        if (set.size === 0) {
            return;
        }
        updateDirty((previous) => {
            const next = { ...previous };
            set.forEach((key) => delete next[key]);
            return next;
        });
        updateStatus((previous) => {
            const next = { ...previous };
            set.forEach((key) => delete next[key]);
            return next;
        });
        setDrafts((previous) => previous.filter((entry) => !set.has(entry.key)));
    }, [updateDirty, updateStatus]);

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
            if (readOnly || !row.nodeRef || isTotalRow(row)) {
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
                    updateStatus((previous) => {
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
        [readOnly, path, payload.rows, discardRow, setRowStatus, scheduleRefresh, updateStatus],
    );

    /**
     * Deletes several rows in ONE call.
     *
     * `slingshot/datalists/action/items` takes a list of nodeRefs, and so does
     * every layer down to it, so a selection of thirty rows is one request and
     * one permission check per node — not thirty round trips whose failures
     * would land one by one.
     *
     * On a refusal the list is re-read rather than patched back row by row: the
     * repository may have deleted some of them, and the truth about which is
     * upstream, not here.
     *
     * @param {Object[]} selection
     * @returns {Promise<boolean>} true when everything asked for was deleted
     */
    const deleteRows = useCallback(
        async (selection) => {
            const rows = (selection || []).filter((row) => row && !isTotalRow(row));
            const drafts = rows.filter((row) => row.draft);
            const persisted = rows.filter((row) => !row.draft && row.nodeRef);
            if (drafts.length > 0) {
                discardRows(drafts.map((row) => row.key));
            }
            if (persisted.length === 0) {
                return true;
            }
            if (readOnly) {
                return false;
            }

            const nodeRefs = persisted.map((row) => row.nodeRef);
            const keys = new Set(persisted.map((row) => row.key));
            persisted.forEach((row) => setRowStatus(row.key, { state: ROW_STATUS.DELETING }));
            setPayload((previous) => ({
                ...previous,
                rows: previous.rows.filter((entry) => !nodeRefs.includes(entry.nodeRef)),
                total: Math.max(0, previous.total - nodeRefs.length),
            }));

            try {
                const result = await request(path, {
                    method: 'DELETE',
                    params: paramsRef.current || undefined,
                    body: { nodeRefs },
                });
                const failed = Array.isArray(result?.failed) ? result.failed : [];
                if (failed.length > 0) {
                    throw Object.assign(new Error('Delete refused'), { messageKey: 'error.forbidden' });
                }
                if (alive.current) {
                    updateStatus((previous) => {
                        const next = { ...previous };
                        keys.forEach((key) => delete next[key]);
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
                refresh();
                if (handlers.current.onError) {
                    handlers.current.onError(cause, null);
                }
                return false;
            }
        },
        [readOnly, path, discardRows, setRowStatus, scheduleRefresh, refresh, updateStatus],
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
            if (!canReorder || row.draft || isTotalRow(row) || !payload.listNodeRef) {
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

    /**
     * Moves a whole selection one step up or down.
     *
     * The repository's sort action takes the list of nodeRefs and applies the
     * move to all of them, keeping their relative order; the answer is then
     * re-read instead of being guessed here, because "one step up" for a
     * discontiguous selection is the repository's rule to state, not ours.
     *
     * @param {Object[]} selection
     * @param {'up'|'down'} direction
     * @returns {Promise<boolean>}
     */
    const moveRows = useCallback(
        async (selection, direction) => {
            const rows = (selection || []).filter((row) => row && !row.draft && !isTotalRow(row) && row.nodeRef);
            if (!canReorder || rows.length === 0 || !payload.listNodeRef) {
                return false;
            }
            rows.forEach((row) => setRowStatus(row.key, { state: ROW_STATUS.SAVING }));
            try {
                await request(path, {
                    method: 'POST',
                    params: paramsRef.current || undefined,
                    body: { action: 'reorder', nodeRefs: rows.map((row) => row.nodeRef), direction },
                });
                if (alive.current) {
                    rows.forEach((row) => setRowStatus(row.key, {
                        state: ROW_STATUS.SAVED,
                        at: new Date().toISOString(),
                    }));
                    scheduleRefresh();
                }
                return true;
            }
            catch (cause) {
                if (!alive.current) {
                    return false;
                }
                refresh();
                if (handlers.current.onError) {
                    handlers.current.onError(cause, null);
                }
                return false;
            }
        },
        [canReorder, path, payload.listNodeRef, setRowStatus, scheduleRefresh, refresh],
    );

    const total = payload.total;
    const pageCount = Math.max(1, Math.ceil((total || 0) / (pageSize || 1)));

    // Memoised without `dirty` and `status`: the readers above go through
    // their refs, so this object only changes when the list itself does, and a
    // memoised row re-renders on its own slice instead of on every keystroke.
    return useMemo(() => ({
        /* data */
        columns,
        // `rows` is what a supplier owns: the summary rows are never in it, so
        // a completion gauge, a comment target list or an empty-state test can
        // keep counting `rows` and be right.
        rows: visibleRows,
        summaryRows,
        allRows: rows,
        total,
        listNodeRef: payload.listNodeRef,
        itemType: payload.itemType,
        rowForm,
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
        setCells,
        saveRowValues,
        bulkEdit,
        commitRow,
        commitAll,
        discardRow,
        discardRows,
        addRow,
        duplicateRow,
        deleteRow,
        deleteRows,
        moveRow,
        moveRows,
        isRowDirty,
        statusOf,
        pendingOf,

        /* protected fields */
        isUnlocked,
        requestUnlock,
        pendingUnlock,
        confirmUnlock,
        cancelUnlock,
    }), [
        columns, visibleRows, summaryRows, rows, total, payload.listNodeRef, payload.itemType,
        rowForm, payload.title, payload.step, loading, error, refresh, page, setPage, pageSize,
        setPageSize, pageCount, sort, setSort, toggleSort, filter, setFilter, readOnly, frozen,
        readOnlyReason, canCreate, canReorder, canEditRow, canDeleteRow, isCellEditable, valueOf,
        displayOf, nestedRowsOf, setCell, setCells, saveRowValues, bulkEdit, commitRow, commitAll,
        discardRow, discardRows, addRow, duplicateRow, deleteRow, deleteRows, moveRow, moveRows,
        isRowDirty, statusOf, pendingOf, isUnlocked, requestUnlock, pendingUnlock, confirmUnlock,
        cancelUnlock
    ]);
}
