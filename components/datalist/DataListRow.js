'use client';

/**
 * One row of the datalist, in **table** layout (`md` and up).
 *
 * This file also owns the two pieces the card layout reuses, so a cell behaves
 * identically whichever layout renders it: `DataListCell` (the editor of a
 * single cell) and `NestedSection` (the expandable sub-list).
 *
 * ## The control registry contract
 *
 * Cells are never edited by a widget written here. The control is resolved from
 * `components/form/controls`, which maps the beCPG control names produced by
 * `lib/adapters/forms.js` (`textfield`, `textarea`, `number`, `checkbox`,
 * `select`, `date`, `autocomplete-association`, `mltext`, …) onto React
 * components. Each control receives:
 *
 * ```js
 * {
 *   field,        // the normalised column: name, formsName, label, dataType,
 *                 // control {name, template, params}, constraints, mandatory…
 *   value,        // the raw value (never the displayValue)
 *   displayValue, // the localised text, for controls that show a label
 *   onChange,     // (nextValue) => void — records the edit
 *   readOnly, disabled, required, invalid, id, 'aria-label',
 *   lang, values, formId, itemType, listId, entityNodeRef   // context props
 * }
 * ```
 *
 * **That is exactly the contract documented in `components/form/controls/index.js`,
 * flat props and all.** This file used to pass a nested `context: {…}` object and
 * an `onCommit` callback instead. No control destructures either name, so both
 * landed in `...rest` and were spread onto the DOM node, and React warned on
 * every single cell (`Invalid value for prop 'context' on <input>`, `Unknown
 * event handler property 'onCommit'`). Do not reintroduce a second contract: the
 * form renderer and the grid must hand a control the same props.
 *
 * ## Committing
 *
 * Free-text controls commit when the focus leaves the **row** (or on Enter);
 * pickers commit on selection. The row — not the cell — is the unit sent to the
 * server, because that is the unit beCPG's form processor persists, and because
 * committing per cell would turn one edited line into five requests.
 *
 * Nothing is asked of the controls for this: `DataListRow` and `DataListCardRow`
 * carry `onBlur` / `onKeyDown` on the row container. React's `onBlur` is
 * `focusout`, which bubbles, so a focus leaving any control inside the row is
 * caught there — `relatedTarget` still inside the row is not a commit. That is
 * why the `onCommit` prop was never needed, only never noticed.
 */

import { createElement, useCallback, useRef, useState } from 'react';
import { getControl } from '@/components/form/controls';
import { renderDataListCell } from '@/components/datalist/renderers';
import { isMachineValue, readableInk } from '@/lib/format';
import { useMessages } from '@/lib/messages';
import { Icon, IconButton, Spinner } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { isTotalRow, ROW_STATUS, useDataListLabels } from '@/components/datalist/useDataList';

/**
 * Controls whose value is final as soon as it changes: there is nothing to
 * "finish typing" in a checkbox or a picker, and waiting for a blur would leave
 * the user staring at an unsaved row.
 */
const INSTANT_COMMIT = new Set([
    'checkbox',
    'select',
    'radio',
    'date',
    'datetime',
    'period',
    'autocomplete-association',
    'association',
    'file',
]);

/**
 * Nothing at all: `null`, `undefined`, the empty string, an empty association.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isBlank(value) {
    if (value === null || value === undefined || value === '') {
        return true;
    }
    return Array.isArray(value) && value.length === 0;
}

/**
 * Renders one cell — read mode, edit mode, or locked-protected mode.
 *
 * @param {Object} props
 * @param {Object} props.row
 * @param {Object} props.column normalised column (see `lib/adapters/datalists.js`)
 * @param {Object} props.list the `useDataList` instance
 * @param {Object} [props.context] `{ entityNodeRef, itemType, formId }`
 * @param {boolean} [props.autoFocus]
 * @param {'table'|'card'} [props.layout='table'] which layout is rendering this
 *   cell — the renderers use it to size an indent for a 360 px screen
 */
export function DataListCell({ row, column, list, context, autoFocus = false, layout = 'table' }) {
    const label = useDataListLabels();
    const { lang } = useMessages();
    const editable = list.isCellEditable(row, column);
    const value = list.valueOf(row, column);
    const display = list.displayOf(row, column);
    const id = `${row.key}__${column.formsName}`;

    /*
     * The size of a read cell — and the one line that decided whether the whole
     * density spec reached the screen.
     *
     * `.becpg-grid` sets Share's measured 13px/16px on the `<table>`, but every
     * read cell used to declare `text-sm` (14px/20px) on its own wrapper. A
     * font-size set **on** an element always beats an inherited one — layers and
     * specificity never enter into it — so the token was overridden on every
     * cell and the row pitch went with it: 8 + 20 + 8 + 1 = 37px, against
     * Share's 33px. Read cells are most of a product sheet, so this is where the
     * grid actually looked loose.
     *
     * The table therefore declares no size at all and inherits the grid's; the
     * card keeps 14px, because below `md` a row is a card on a 360px screen and
     * 13px there is a legibility question, not a density one.
     */
    const valueClass = layout === 'card'
        ? 'block min-w-0 break-words text-sm'
        : 'block min-w-0 break-words';

    // A protected column arrives read-only from the adapter on purpose: it takes
    // a deliberate confirmation to touch it (spec §6, point 6).
    if (column.protectedField && !editable && !list.readOnly && list.canEditRow(row)) {
        return (
            <button
                type="button"
                onClick={() => list.requestUnlock(row, column)}
                title={label('protectedLocked')}
                className={`group flex w-full items-center justify-between gap-1 rounded-md border border-dashed border-[var(--becpg-grey)] px-2 py-1 text-left${layout === 'card' ? ' text-sm' : ''} hover:border-[var(--becpg-orange)]`}
            >
                <span className="min-w-0 truncate">{display || '—'}</span>
                <Icon
                    name="lock"
                    size={14}
                    className="shrink-0 text-[var(--becpg-dark-grey)] group-hover:text-[var(--becpg-orange)]"
                />
            </button>
        );
    }

    if (!editable) {
        /*
         * A computed row has nothing to say in most of its columns, and an em
         * dash there would claim it has: « — » means *this value is missing*,
         * and a total has no ingredient name, no unit and no threshold to be
         * missing. Share leaves those cells blank, and so does this. Only the
         * cells the extractor actually filled — the label and the sums — are
         * rendered, through the same registry as any other cell.
         */
        if (isTotalRow(row) && isBlank(value) && isBlank(display)) {
            return null;
        }
        /*
         * The column-renderer registry, and the only place a read cell is
         * produced — the table and the card both land here, so a phone shows
         * the same formatted value as a desktop from the same code.
         *
         * beCPG does not put display logic in the data: Share ships 65
         * renderers over 156 property keys and consults them for every cell.
         * Printing `displayValue` verbatim is right for most columns and wrong
         * for the few that carry structured data — « Valeur étiquetée »
         * (`bcpg:nutListRoundedValue`) is a JSON envelope of per-country
         * labelled values, and the supplier was reading it raw.
         *
         * `null` means the registry declined, and then nothing changes: the
         * cell renders exactly as it always has. That is what lets a renderer
         * improve one case without owning every case.
         */
        const rendered = renderDataListCell({
            value,
            displayValue: display,
            row,
            column,
            lang,
            layout,
        });
        if (rendered !== null) {
            return <span className={valueClass}>{rendered}</span>;
        }
        /*
         * Last guard before the raw value reaches the grid: `displayValue` is
         * beCPG's own label and is right almost always, but a `d:noderef` column
         * whose target beCPG could not name arrives as the nodeRef itself, and a
         * hierarchy node arrives as the uuid it is named after. Neither is an
         * answer; both look like one. An em dash says "not filled in", which is
         * the truth the supplier can act on.
         */
        const readable = isMachineValue(display) ? null : display;
        return (
            <span className={valueClass} title={readable || undefined}>
                {readable || <span className="text-[var(--becpg-dark-grey)]">—</span>}
            </span>
        );
    }

    const controlName = column.control?.name || 'textfield';
    const control = getControl(controlName) || getControl('textfield');
    if (!control) {
        // The registry does not know this control: show the value rather than an
        // empty cell. Writing a replacement editor here is explicitly forbidden.
        return <span className={valueClass}>{display || '—'}</span>;
    }

    const missing = column.mandatory && (value === null || value === undefined || value === '');

    /*
     * A picker commits as soon as it is used — but **never while the row is still
     * a draft**, and that exception is not a nicety.
     *
     * Measured on `bcpg:physicoChemList`, whose first column is the mandatory
     * association: adding a row, choosing the characteristic, then typing the
     * value — the obvious order, left to right — produced
     *
     *     200 PUT   ← the pick instant-committed the draft: the row is created
     *                 with the association alone
     *     502 PUT   ← the value, typed a second later, was committed against a
     *                 draft whose `nodeRef` is still null, so the portal asked
     *                 beCPG to CREATE A SECOND ROW carrying only that value.
     *                 beCPG refused it (mandatory association missing).
     *
     * The value was lost and the supplier was told « Connexion impossible au
     * serveur ». The draft only learns its nodeRef through the silent refresh
     * that follows the create, and everything typed in that window falls into the
     * hole.
     *
     * So a draft is committed the way this file documents for every other cell:
     * by the row's own blur / Enter, the row being the unit beCPG persists.
     * A persisted row keeps the instant commit — there is no draft to lose.
     */
    const instant = INSTANT_COMMIT.has(controlName) && !row.draft;

    // `createElement` rather than JSX on purpose: `getControl` *looks up* an
    // existing component in the registry, it never creates one, and writing it
    // as `<Control …>` would read (to a human and to the linter) as a component
    // declared during render.
    const element = createElement(control, {
        field: column,
        id,
        value,
        displayValue: display,
        required: column.mandatory,
        invalid: missing,
        readOnly: false,
        disabled: list.statusOf(row.key).state === ROW_STATUS.DELETING,
        autoFocus,
        'aria-label': column.label,
        'aria-invalid': missing || undefined,
        // Flat context props — the contract of `components/form/controls`. An
        // autocomplete resolves its `parentAssoc` dependency from `values`
        // (contracts §3), which here is the rest of the row.
        lang,
        values: row.values,
        entityNodeRef: context?.entityNodeRef,
        itemType: context?.itemType,
        formId: context?.formId,
        // What `POST /api/v1/autocomplete/{formId}/{fieldId}` needs to resolve a
        // datasource declared on a list rather than on the entity.
        listId: context?.listId ?? list.step?.listId ?? null,
        onChange: (next) => {
            list.setCell(row, column, next);
            if (instant) {
                // Safe in the same tick: `setCell` writes the hook's dirty ref
                // synchronously, so `commitRow` sees this very edit.
                list.commitRow(row);
            }
        },
    });

    /*
     * Validation that costs no layout.
     *
     * The only rule the grid can check without asking the server is the one it
     * already enforces before creating a row — a mandatory column left empty —
     * and it used to be silent: the control turned red, the row refused to
     * save, and nothing said which cell was the reason. A message under the
     * cell would push every row below it down by a line on each keystroke, in a
     * grid whose whole point is that a row is 33px tall.
     *
     * So the flag is absolutely positioned inside the cell: it cannot move
     * anything, it is a glyph and a colour rather than a colour alone, and the
     * sentence lives in its `title` and on the row's status.
     *
     * Free-text controls are still committed by the row's own `onBlur` /
     * `onKeyDown`; nothing here commits.
     */
    return (
        <span className="becpg-grid-field" data-invalid={missing ? 'true' : undefined}>
            {element}
            {missing ? (
                <Icon
                    name="error"
                    size={14}
                    className="becpg-grid-field-flag"
                    title={label('incomplete')}
                />
            ) : null}
        </span>
    );
}

/**
 * The per-row saving / saved / error indicator.
 *
 * It is deliberately verbose on failure: a grid that fails silently is a grid
 * that loses a supplier's afternoon.
 *
 * @param {Object} props
 * @param {Object} props.row
 * @param {Object} props.list
 * @param {boolean} [props.compact] icon only (table layout)
 */
export function RowStatus({ row, list, compact = false }) {
    const label = useDataListLabels();
    const status = list.statusOf(row.key);
    const dirty = list.isRowDirty(row.key);

    if (status.state === ROW_STATUS.SAVING) {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--becpg-dark-grey)]">
                <Spinner size={14} />
                {compact ? null : label('saving')}
            </span>
        );
    }
    if (status.state === ROW_STATUS.DELETING) {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--becpg-dark-grey)]">
                <Spinner size={14} />
                {compact ? null : label('deleting')}
            </span>
        );
    }
    if (status.state === ROW_STATUS.SAVED) {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--status-ok,green)]">
                <Icon name="check_circle" size={16} />
                {compact ? null : label('saved')}
            </span>
        );
    }
    if (status.state === ROW_STATUS.ERROR) {
        return (
            <span className="inline-flex items-center gap-1">
                <Tooltip content={label('failed')} placement="left">
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--status-danger,#c0392b)]">
                        <Icon name="error" size={16} />
                        {compact ? null : label('failed')}
                    </span>
                </Tooltip>
                <IconButton
                    icon="refresh"
                    label={label('retry')}
                    variant="ghost"
                    size="icon"
                    className="becpg-grid-icon"
                    onClick={() => list.commitRow(row)}
                />
            </span>
        );
    }
    if (dirty) {
        return (
            <span className="inline-flex items-center gap-1">
                {/*
                  * A draft that is still missing a mandatory column is held back
                  * by `commitRow` on purpose (a half-empty create earns a 400).
                  * That verdict used to be invisible: the row simply never
                  * saved. It now says so, once, next to the save button.
                  */}
                {status.incomplete ? (
                    <Tooltip content={label('incomplete')} placement="left">
                        <span className="inline-flex items-center text-[var(--status-warn)]">
                            <Icon name="edit_note" size={16} />
                            <span className="sr-only-text">{label('incomplete')}</span>
                        </span>
                    </Tooltip>
                ) : null}
                <IconButton
                    icon="save"
                    label={label('saveRow')}
                    variant="ghost"
                    size="icon"
                    className="becpg-grid-icon"
                    onClick={() => list.commitRow(row)}
                />
                <IconButton
                    icon="undo"
                    label={label('discard')}
                    variant="ghost"
                    size="icon"
                    className="becpg-grid-icon"
                    onClick={() => list.discardRow(row)}
                />
            </span>
        );
    }
    return null;
}

/**
 * The expandable sub-section of a nested column (`type: "dataList"` on a
 * sub-list, `"entity"` on a linked entity — contracts §1).
 *
 * Nested rows are rendered from their `displayValue`s: they belong to another
 * datalist, with its own security state, and beCPG edits them in their own grid.
 * Showing them here is what makes a nutrient line or a sub-supplier readable
 * without leaving the step.
 *
 * @param {Object} props
 * @param {Object} props.row
 * @param {Object} props.column the nested column
 * @param {Object} props.list
 */
export function NestedSection({ row, column, list }) {
    const label = useDataListLabels();
    const { lang } = useMessages();
    const children = column.columns || [];
    const entries = list.nestedRowsOf(row, column);

    return (
        <div className="rounded-lg border border-[var(--becpg-grey)] bg-[var(--becpg-grey)]/30 p-2">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                {column.label}
            </p>
            {entries.length === 0 ? (
                <p className="text-xs text-[var(--becpg-dark-grey)]">{label('nestedEmpty')}</p>
            ) : (
                <div className="table-scroll">
                    <table className="w-full border-collapse text-xs">
                        <thead>
                            <tr>
                                {children.map((child) => (
                                    <th
                                        key={child.formsName}
                                        scope="col"
                                        className="px-2 py-1 text-left font-medium text-[var(--becpg-dark-grey)]"
                                    >
                                        {child.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry, index) => (
                                <tr key={index} className="border-t border-[var(--becpg-grey)]">
                                    {children.map((child) => (
                                        <td key={child.formsName} className="px-2 py-1 align-top">
                                            {/*
                                              * Nested rows go through the same registry as the
                                              * outer grid — a sub-list of nutrients would otherwise
                                              * show the raw JSON envelope here while the column
                                              * beside it shows `1 020`. `null` keeps the previous
                                              * rendering untouched.
                                              */}
                                            {renderDataListCell({
                                                value: entry.values?.[child.formsName] ?? null,
                                                displayValue: entry.displayValues?.[child.formsName] ?? null,
                                                row: entry,
                                                column: child,
                                                lang,
                                            }) ?? (
                                                entry.displayValues?.[child.formsName]
                                                    ?? entry.values?.[child.formsName]
                                                    ?? '—'
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

/** What a supplier can put the focus into, inside a cell. */
export const FOCUSABLE = [
    'input:not([type="hidden"]):not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * How much room a column is given **as a floor**, from what the server said it
 * holds.
 *
 * The table keeps `table-layout: auto`, so this is a minimum and never a width:
 * a column with room to spare still grows to its content. What it fixes is the
 * opposite case. Every column used to declare the same `6rem`, so on a
 * ten-column list at 1920 the browser resolved *all ten* to exactly 96px — and
 * 96px is generous for « Sur ligne » (a checkbox) and catastrophic for
 * « Nutriment », whose picker holds an input plus a clear cross plus a caret and
 * collapsed to a **20px** field showing nothing of « Lipides ajoutées ». The
 * name the supplier is editing was the one thing invisible.
 *
 * This is not a per-list rule and carries no field name: it reads `type`,
 * `dataType` and the resolved control — the three things `lib/adapters/datalists.js`
 * normalises for every column of every list. A new list gets sensible widths
 * without a line changing here.
 *
 * @param {Object} column normalised column
 * @returns {string} a CSS length
 */
export function columnFloor(column) {
    /*
     * A picker: a name, a code in the metadata, and two affordances beside the
     * field. This is the column a supplier actually reads while typing.
     *
     * A **mandatory** association gets more again, and that is not a special
     * case for one list: in every beCPG characteristic list the mandatory
     * association *is* the row — `bcpg:nutListNut`, `bcpg:allergenListAllergen`,
     * `bcpg:mblMicrobio`. Its values are also the longest ones on screen
     * («Anhydride sulfureux et sulfites», «Céréales contenant du gluten»), while
     * the optional associations beside it are usually empty. Sizing by "is this
     * column required" is a property of the column the server described, not a
     * name this file knows.
     */
    if (column.type === 'association') {
        if (column.mandatory) {
            return '18rem';
        }
        return column.repeating ? '14rem' : '12rem';
    }
    const control = column.control?.name || '';
    if (control === 'checkbox' || column.dataType === 'd:boolean') {
        return '3.5rem';
    }
    if (control === 'date' || column.dataType === 'd:date' || column.dataType === 'd:datetime') {
        return '8rem';
    }
    if (control === 'number' || control === 'number-unit'
        || ['d:int', 'd:long', 'd:float', 'd:double'].includes(column.dataType)) {
        return '5.5rem';
    }
    if (control === 'textarea' || control === 'mltext' || column.dataType === 'd:mltext') {
        return '12rem';
    }
    if (control === 'select' || control === 'multiselect' || control === 'checkbox-group') {
        return '9rem';
    }
    return '8rem';
}

/**
 * Controls for which the up/down arrows belong to the control, not to the grid:
 * a number spins, a date steps, a range slides, a list opens. Stealing those
 * would trade one working key for another.
 */
const ARROWS_OWNED_BY_CONTROL = new Set([
    'number', 'date', 'datetime-local', 'month', 'week', 'time', 'range',
]);

/**
 * Targets for which `Enter` is **already** the way to use them, so the grid must
 * keep its hands off it.
 *
 * `Enter` on a `<button>` *is* the click — it is the whole of operating a button
 * without a mouse — and the same holds for a link. The row handler used to
 * `preventDefault()` on every `Enter` whose target was not a `<textarea>`, which
 * made « Supprimer la ligne », « Dupliquer cette ligne », the save / undo pair,
 * the detail chevron and the picker's own buttons **unreachable from the
 * keyboard**: the key committed the row and moved the caret down instead of
 * pressing the button under it. Measured: 0 click events fired, no confirmation
 * dialog, focus landed on the row below.
 *
 * A `<select>` is deliberately absent. `Enter` there is not an activation — the
 * native list is opened and browsed with the arrows and Space — so the grid
 * keeps it, and "Enter validates the row and goes down one" stays true from a
 * unit cell as it is from a text cell.
 *
 * @param {EventTarget|null} target
 * @returns {boolean}
 */
function ownsEnterKey(target) {
    if (!target || typeof target.tagName !== 'string') {
        return false;
    }
    if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') {
        return true;
    }
    if (target.tagName === 'A' && target.hasAttribute && target.hasAttribute('href')) {
        return true;
    }
    // No `<div onClick>` exists in this codebase (AGENTS.md), but a control from
    // the registry is free to expose a widget by role rather than by tag, and
    // ARIA says a `button` role answers Enter exactly like the element does.
    const role = typeof target.getAttribute === 'function' ? target.getAttribute('role') : null;
    return role === 'button' || role === 'link' || role === 'menuitem'
        || role === 'menuitemcheckbox' || role === 'menuitemradio' || role === 'option';
}

/**
 * The `<tr>` above or below, skipping the detail rows an expanded row inserts.
 *
 * `nextElementSibling` never crosses a section boundary, so this cannot walk
 * out of `<tbody>` into the `<tfoot>` that holds the computed total.
 *
 * @param {Element} rowEl
 * @param {number} direction -1 or 1
 * @returns {Element|null}
 */
function siblingRow(rowEl, direction) {
    let node = direction > 0 ? rowEl.nextElementSibling : rowEl.previousElementSibling;
    while (node && node.getAttribute('data-detail') === 'true') {
        node = direction > 0 ? node.nextElementSibling : node.previousElementSibling;
    }
    return node;
}

/**
 * Moves the focus to the same column of the row above / below.
 *
 * Falls back to the first focusable cell **to the right** of that column, so
 * arrowing down a grid whose first column is read-only (a computed
 * characteristic, a locked field) still lands somewhere rather than nowhere.
 *
 * @param {Element} rowEl the current `<tr>`
 * @param {number} cellIndex index of the current `<td>` within it
 * @param {number} direction -1 (up) or 1 (down)
 * @returns {boolean} true when the focus actually moved
 */
function moveFocusVertically(rowEl, cellIndex, direction) {
    const next = siblingRow(rowEl, direction);
    if (!next) {
        return false;
    }
    for (let index = cellIndex; index < next.children.length; index += 1) {
        const target = next.children[index].querySelector(FOCUSABLE);
        if (target) {
            target.focus();
            if (typeof target.select === 'function' && target.tagName === 'INPUT') {
                // Landing on a cell selects what is in it, so the next keystroke
                // replaces the value instead of appending to it. That is what
                // makes "arrow down, type, arrow down, type" work at the speed of
                // a spreadsheet, and it is why nothing here needs a double-click
                // to start editing.
                target.select();
            }
            return true;
        }
    }
    return false;
}

/**
 * Moves the focus to the next / previous focusable cell **of the same row**.
 *
 * Used after a picker has chosen a value: the natural continuation of "type,
 * arrow, Enter" is the cell beside it, not the row below.
 *
 * @param {Element} rowEl
 * @param {number} cellIndex
 * @param {number} direction -1 or 1
 * @returns {boolean}
 */
function moveFocusHorizontally(rowEl, cellIndex, direction) {
    for (
        let index = cellIndex + direction;
        index >= 0 && index < rowEl.children.length;
        index += direction
    ) {
        const target = rowEl.children[index].querySelector(FOCUSABLE);
        if (target) {
            target.focus();
            if (typeof target.select === 'function' && target.tagName === 'INPUT') {
                target.select();
            }
            return true;
        }
    }
    return false;
}

/**
 * A table row.
 *
 * ## Moving around with the keyboard
 *
 * Typing a nutrient list is typing forty rows, and the grid has to be usable
 * without the mouse leaving the keyboard:
 *
 *  - **Tab / Shift+Tab** move from cell to cell. They already did, and — this is
 *    the part that matters — moving *within* the row does not commit anything:
 *    `handleBlur` ignores a focus that is still inside the `<tr>`, so a row is
 *    saved once, when it is left, not once per column.
 *  - **↑ / ↓** move to the same column of the row above or below, which is what
 *    commits the row being left. They are handed back to the control whenever
 *    the control owns them: an open suggestion list (which calls
 *    `preventDefault`), a `<select>`, a `<textarea>`, a number or a date.
 *  - **Enter** commits and goes down one row, **Escape** discards — *except on
 *    something Enter already operates*. On a `<button>` or a link the key is
 *    that element's click, so the row hands it over ({@link ownsEnterKey}): a
 *    supplier can reach « Supprimer la ligne », the detail chevron or the
 *    picker's buttons without a mouse.
 *
 * @param {Object} props
 * @param {Object} props.row
 * @param {number} props.index position on the page, 1-based (used for the accessible name)
 * @param {Object[]} props.columns flat (non-nested) columns, in server order
 * @param {Object[]} props.nestedColumns nested columns, rendered in the sub-section
 * @param {Object} props.list the `useDataList` instance
 * @param {Object} [props.context] `{ entityNodeRef, itemType, formId }`
 * @param {Function} [props.onDelete] `(row) => void` — opens the confirmation
 * @param {boolean} [props.showOrder] renders the reorder column
 * @param {boolean} [props.showActions] renders the actions column
 * @param {boolean} [props.dense]
 * @param {boolean} [props.zebra] paints the row as a stripe (parity is computed
 *   by the caller, not by `:nth-child`: an expanded row inserts a second `<tr>`)
 * @param {boolean} [props.autoFocus] focus the first editable cell (a new row)
 */
export function DataListRow({
    row,
    index,
    columns,
    nestedColumns = [],
    list,
    context,
    onDelete,
    onAddRow,
    onDuplicate,
    showOrder = false,
    showActions = true,
    dense = false,
    zebra = false,
    autoFocus = false,
    autoFocusColumn = 0,
}) {
    const label = useDataListLabels();
    const [expanded, setExpanded] = useState(false);
    const containerRef = useRef(null);
    const status = list.statusOf(row.key);
    const hasNested = nestedColumns.length > 0;
    const columnCount = columns.length + (showOrder ? 1 : 0) + (hasNested ? 1 : 0)
        + (showActions ? 1 : 0);

    /*
     * The computed total row (`itemType: "total"`).
     *
     * It is a *summary of* the rows, not one of them: it has no nodeRef, nothing
     * in it can be edited, deleted or reordered, and it carries none of the row
     * chrome. `DataListEditor` renders it inside `<tfoot>`, which is what pins
     * it under the data whatever the active sort — the cells below are only its
     * appearance.
     */
    const summary = isTotalRow(row);
    const editable = !summary && list.canEditRow(row);

    /** Leaving the row is what turns pending edits into a request. */
    const handleBlur = useCallback(
        (event) => {
            const next = event.relatedTarget;
            if (next && containerRef.current && containerRef.current.contains(next)) {
                return;
            }
            if (list.isRowDirty(row.key)) {
                list.commitRow(row);
            }
        },
        [list, row],
    );

    const handleKeyDown = useCallback(
        (event) => {
            const target = event.target;
            const cell = target && typeof target.closest === 'function' ? target.closest('td') : null;
            const rowEl = containerRef.current;
            const inThisRow = Boolean(cell && rowEl && cell.parentElement === rowEl);
            const cellIndex = inThisRow
                ? Array.prototype.indexOf.call(rowEl.children, cell)
                : -1;
            const modified = event.ctrlKey || event.metaKey;

            /*
             * Add / duplicate, from the keyboard, without leaving the row.
             *
             * Both are the same gesture from the supplier's side — "another line
             * like this one" — and both are answered by the editor, which owns
             * the drafts and the focus. Ctrl+D is browsers' bookmark shortcut, so
             * it is only taken while the focus is inside a row of the grid.
             */
            if (modified && event.key === 'Enter' && onAddRow) {
                event.preventDefault();
                onAddRow();
                return;
            }
            if (modified && (event.key === 'd' || event.key === 'D') && onDuplicate && !summary) {
                event.preventDefault();
                onDuplicate(row);
                return;
            }

            if (event.key === 'Enter' && !ownsEnterKey(target)) {
                /*
                 * A picker that has just chosen an option `preventDefault`s the
                 * key on its way up (`DatasourcePicker.onKeyDown`), and that is
                 * the only signal that survives bubbling. It means "this Enter
                 * was a selection", so the caret belongs in the **next cell** —
                 * type, ↓, ↵, and you are on the value, which is the whole flow
                 * of an ingredient line.
                 *
                 * It is also what keeps the draft bug closed: that Enter no
                 * longer commits anything, so a new row can never be created
                 * from its association alone while the rest is still being
                 * typed (see the comment on `instant` above).
                 */
                if (event.defaultPrevented) {
                    if (inThisRow) {
                        moveFocusHorizontally(rowEl, cellIndex, 1);
                    }
                    return;
                }
                event.preventDefault();
                list.commitRow(row);
                // Commit **and go on**: the same column of the row below, which
                // is how a column of forty values is typed. At the bottom of the
                // list it asks for one more line rather than stopping.
                if (inThisRow && !moveFocusVertically(rowEl, cellIndex, event.shiftKey ? -1 : 1)) {
                    if (!event.shiftKey && onAddRow) {
                        onAddRow();
                    }
                }
                return;
            }
            if (event.key === 'Escape' && list.isRowDirty(row.key)) {
                list.discardRow(row);
                return;
            }
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
                return;
            }
            // `defaultPrevented` is how an open suggestion list says "these two
            // keys are mine" (`AutocompleteControl.onKeyDown`), and it is the
            // only signal that survives bubbling.
            if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
                return;
            }
            const tag = target ? target.tagName : '';
            if (tag === 'TEXTAREA' || tag === 'SELECT') {
                return;
            }
            if (tag === 'INPUT' && ARROWS_OWNED_BY_CONTROL.has(target.type)) {
                return;
            }
            if (!inThisRow || cellIndex < 0) {
                return;
            }
            const down = event.key === 'ArrowDown';
            if (moveFocusVertically(rowEl, cellIndex, down ? 1 : -1)) {
                // Only once the move succeeded: at the top and at the bottom of
                // the grid the key keeps its usual meaning.
                event.preventDefault();
            }
            else if (down && onAddRow) {
                // The bottom of the list is where a supplier keeps typing, not
                // where he stops. ↓ on the last line asks for the next one.
                event.preventDefault();
                onAddRow();
            }
        },
        [list, row, onAddRow, onDuplicate, summary],
    );

    const rowState = status.state === ROW_STATUS.ERROR
        ? 'error'
        : row.draft
          ? 'draft'
          : undefined;

    /*
     * The colour the customer put on the line (`bcpg:color`), as Share paints it.
     *
     * Only while the row has nothing else to say: a row being written or a row
     * whose save failed shows *that*, because it is about to be acted on, and an
     * inline background would win over the state's own styling. Decoration gives
     * way to state, never the reverse.
     */
    const paint = !summary && !rowState && row.color ? row.color : null;

    return (
        <>
            <tr
                ref={containerRef}
                onBlur={summary ? undefined : handleBlur}
                onKeyDown={summary ? undefined : handleKeyDown}
                aria-label={summary ? label('totalRow') : row.draft ? label('newRow') : label('row', { index })}
                style={paint ? { backgroundColor: paint, color: readableInk(paint) } : undefined}
                // How a paste finds which line it was dropped on.
                data-row-key={row.key}
                data-total={summary ? 'true' : undefined}
                data-zebra={zebra && !summary ? 'true' : undefined}
                data-state={rowState}
                data-editable={editable ? 'true' : undefined}
                data-dense={dense ? 'true' : undefined}
            >
                {showOrder ? (
                    /*
                     * Side by side, not stacked — and that single change is worth
                     * 62px of row.
                     *
                     * Two `size="icon"` buttons are 44px each; stacked they made
                     * the tallest cell of every editable row 88px, and the row
                     * pitch 95px against Share's 33px. Measured on
                     * `bcpg:allergenList`: 95px on all seventeen rows, nothing
                     * else in the row taller than 26px. Laid out horizontally at
                     * the grid's own compact size the cell is 26px and the row
                     * goes back to the pitch the rest of this file is built for.
                     */
                    <td className="px-1" style={{ width: '3.5rem' }}>
                        {summary ? null : (
                            <div className="flex items-center">
                                <IconButton
                                    icon="keyboard_arrow_up"
                                    label={label('moveUp')}
                                    variant="ghost"
                                    size="icon"
                                    className="becpg-grid-icon"
                                    disabled={!list.canReorder || row.draft}
                                    onClick={() => list.moveRow(row, 'up')}
                                />
                                <IconButton
                                    icon="keyboard_arrow_down"
                                    label={label('moveDown')}
                                    variant="ghost"
                                    size="icon"
                                    className="becpg-grid-icon"
                                    disabled={!list.canReorder || row.draft}
                                    onClick={() => list.moveRow(row, 'down')}
                                />
                            </div>
                        )}
                    </td>
                ) : null}

                {hasNested ? (
                    <td className="w-10 px-1">
                        {summary ? null : (
                            <IconButton
                                icon={expanded ? 'expand_less' : 'expand_more'}
                                label={expanded ? label('collapse') : label('expand')}
                                variant="ghost"
                                size="icon"
                                className="becpg-grid-icon"
                                aria-expanded={expanded}
                                onClick={() => setExpanded((value) => !value)}
                            />
                        )}
                    </td>
                ) : null}

                {columns.map((column, position) => (
                    /*
                     * A floor, not a width — see {@link columnFloor}. The table
                     * keeps `table-layout: auto`, so a characteristic name still
                     * takes the room it needs; what the floor decides is what
                     * happens when there is not enough room for everyone, and
                     * that is the case this grid lives in.
                     *
                     * `data-column` is how a paste finds where it was dropped:
                     * the anchor cell names its own column index, and the plan is
                     * built from there rightwards.
                     */
                    <td
                        key={column.formsName}
                        data-column={position}
                        style={{ minWidth: columnFloor(column) }}
                    >
                        <DataListCell
                            row={row}
                            column={column}
                            list={list}
                            context={context}
                            autoFocus={autoFocus && position === autoFocusColumn}
                        />
                    </td>
                ))}

                {showActions ? (
                    <td className="text-right whitespace-nowrap">
                        {summary ? null : (
                            <div className="inline-flex items-center gap-1">
                                <RowStatus row={row} list={list} compact />
                                {onDuplicate && list.canCreate && !row.draft ? (
                                    <IconButton
                                        icon="content_copy"
                                        label={label('duplicate')}
                                        variant="ghost"
                                        size="icon"
                                        className="becpg-grid-icon"
                                        onClick={() => onDuplicate(row)}
                                    />
                                ) : null}
                                {list.canDeleteRow(row) && onDelete ? (
                                    <IconButton
                                        icon="delete_outline"
                                        label={label('deleteRow')}
                                        variant="ghost"
                                        size="icon"
                                        className="becpg-grid-icon"
                                        onClick={() => onDelete(row)}
                                    />
                                ) : null}
                            </div>
                        )}
                    </td>
                ) : null}
            </tr>

            {hasNested && expanded ? (
                <tr data-detail="true">
                    <td colSpan={columnCount} className="bg-white pb-2">
                        <div className="flex flex-col gap-2">
                            {nestedColumns.map((column) => (
                                <NestedSection key={column.formsName} row={row} column={column} list={list} />
                            ))}
                        </div>
                    </td>
                </tr>
            ) : null}
        </>
    );
}
