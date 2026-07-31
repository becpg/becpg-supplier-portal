'use client';

/**
 * The datalist column renderer registry — the portal's port of Share's
 * `registerDataGridRenderer`.
 *
 * ## The problem
 *
 * beCPG does not put display logic in the data. Share ships **65 renderers
 * covering 156 property keys** (`product-columnRenderers.js`,
 * `custom-columnRenderers.js`, `entity-columnRenderer.js`) and the datagrid
 * consults them for every cell. The portal had none, so it printed
 * `row.displayValues[column]` verbatim — which is right for most columns and
 * wrong, sometimes spectacularly, for the handful that carry structured data.
 * The one the supplier reported: `bcpg:nutListRoundedValue` holds a JSON
 * envelope of per-country labelled values, and « Valeur étiquetée » showed
 * `{"tu":{"JP":816},…,"v":{"BR":1020,"EU":1020,…},…}` where Share shows `1 020`.
 *
 * ## The lookup, from Share's code and not from its documentation
 *
 * `entity-columnRenderer.js:304` — `getCellFormatter()`, with
 * `p_type = column.dataType` and `p_label = column.name`:
 *
 * ```js
 * if      (renderers[p_type + "_" + p_label]) …
 * else if (renderers[p_label])                …
 * else if (renderers[p_type])                 …
 * else                                        $links($html(data.displayValue));
 * ```
 *
 * Three lookups, then the default. Two things about `p_type` that a guess would
 * get wrong, and that {@link shareTypeToken} reproduces:
 *
 *  - for a **property** it is the *bare* Alfresco datatype — `double`, `text`,
 *    `mltext`, `boolean` — which is why the registered keys read
 *    `boolean_bcpg:allergenListVoluntary` and `mltext_survey:questionLabel`. The
 *    portal normalises datatypes to `d:double` (`forms.js::qualifyDataType`), so
 *    the prefix is stripped back off here;
 *  - for an **association** it is not the string `"association"` but the *target
 *    class*: `columns.get.json.ftl` emits `"dataType": "${col.endpointType}"`,
 *    so `bcpg:nutListNut` arrives as `bcpg:nut`. That is what makes the third
 *    lookup work at all, and it is why `normalizeColumn` now carries
 *    `endpointType` — it was dropped, which made every level-3 key unreachable.
 *
 * ## The contract of a renderer
 *
 * A renderer is a **pure function** of one cell. It never calls a hook (it is
 * invoked from inside a component's render, conditionally), never fetches, never
 * touches the DOM, and never returns a string of HTML — see `cells.js`.
 *
 * ```js
 * (cell) => React.ReactNode | null
 * ```
 *
 * with `cell = { value, displayValue, row, column, lang, layout }`. Returning
 * `null` means **"I decline"**: the grid then renders the cell exactly as it did
 * before, which is what lets a renderer handle only the case it improves. To
 * render *nothing* — Share's `return ""` — a renderer returns `<EmptyCell/>`.
 *
 * Share wraps every call in a `try/catch` that logs and yields `""`, because a
 * renderer runs on repository content and one bad value must not take a row
 * down. {@link renderDataListCell} does the same, and honours a renderer's
 * `emptyOnError` flag for the cases where falling back to the raw value would
 * put machine data back on screen.
 *
 * ## What is deliberately absent
 *
 * Of the 156 keys, **37 of the 63 columns two live supplier wizards deliver**
 * are covered by the 16 renderers Share would fire; the rest resolve to the
 * default, which is what the portal already does. This file registers the ones
 * that change what the supplier reads, plus the ones that change how they read
 * it, and nothing else. Not ported, on purpose:
 *
 *  - everything grid-structural — the `mtl-*` row classes, the expand/collapse
 *    toggle, `elCell.style` painting, `columnRenamed`, `showAfterRender`,
 *    `dirtyDataTable` listeners, the `SimpleDialog` detail popups, the
 *    `ProductNotifications` component instantiation. These are YUI DataTable
 *    machinery, not formatting;
 *  - everything a supplier has no business seeing — costs, LCA, profitability,
 *    eco-score, Decernis regulatory results, change orders (`ecm:*`), quality
 *    control plans (`qa:*` beyond the state labels), publication channels
 *    (`bp:*`), the labelling workspace (`bcpg:ill*`), dynamic characteristics,
 *    the internal supplier-account audit;
 *  - the branches guarded by `oColumn.numberFormat`, `oColumn.forceUnit` and
 *    `oColumn.tooltip`: those three are read in several renderers and assigned
 *    nowhere in the open-source tree — per-customer datagrid hooks, dead in a
 *    stock deployment;
 *  - `eval()`-based ones (`bcpg:allergenListDecisionTree` runs `eval(data.value)`
 *    on a repository string).
 */

import {
    nutListGDAPerc,
    nutListRoundedValue,
    nutListValue,
} from '@/components/datalist/renderers/nutrition';
import { percentage } from '@/components/datalist/renderers/quantities';
import {
    complianceState,
    dataListState,
    entityState,
    flaggedBoolean,
    labelClaimValue,
    reassuringBoolean,
} from '@/components/datalist/renderers/states';
import { characteristic, questionLabel } from '@/components/datalist/renderers/characteristics';
import { EmptyCell } from '@/components/datalist/renderers/cells';

/**
 * The registry, keyed exactly as Share keys it.
 *
 * Order in this object is irrelevant; the *shape* of a key is what decides at
 * which of the three lookup levels it can match:
 *
 *   `bcpg:ing_bcpg:ingListIng`   level 1 — this property on this target class
 *   `boolean_bcpg:allergenListVoluntary`  level 1 — this property at this datatype
 *   `bcpg:nutListRoundedValue`   level 2 — this property, wherever it appears
 *   `bcpg:nut`                   level 3 — anything pointing at this class
 *
 * @type {Object.<string, Function>}
 */
export const RENDERERS = Object.freeze({
    /* --- level 1: datatype- or target-scoped ----------------------------- */
    'bcpg:ing_bcpg:ingListIng': characteristic,
    'mltext_survey:questionLabel': questionLabel,
    'boolean_bcpg:allergenListVoluntary': flaggedBoolean,
    'boolean_bcpg:allergenListInVoluntary': flaggedBoolean,
    'boolean_bcpg:allergenListOnSite': flaggedBoolean,
    'boolean_bcpg:allergenListOnLine': flaggedBoolean,
    'boolean_bcpg:packagingListIsMaster': flaggedBoolean,
    'boolean_bcpg:allergenListIsCleaned': reassuringBoolean,

    /* --- level 2: the property itself ------------------------------------ */
    // nutrients
    'bcpg:nutListRoundedValue': nutListRoundedValue,
    'bcpg:nutListRoundedValuePrepared': nutListRoundedValue,
    'bcpg:nutListValue': nutListValue,
    'bcpg:nutListMini': nutListValue,
    'bcpg:nutListMaxi': nutListValue,
    'bcpg:nutListValuePrepared': nutListValue,
    'bcpg:nutListValuePerServing': nutListValue,
    'bcpg:nutListReductionValue': nutListValue,
    'bcpg:nutListReferenceValue': nutListValue,
    'bcpg:nutListGDAPerc': nutListGDAPerc,
    // ratios
    'bcpg:ingListQtyPerc': percentage,
    'bcpg:ingListQtyPercWithYield': percentage,
    'bcpg:ingListQtyPercWithSecondaryYield': percentage,
    'bcpg:allergenListQtyPerc': percentage,
    'bcpg:allergenRegulatoryThreshold': percentage,
    'bcpg:allergenInVoluntaryRegulatoryThreshold': percentage,
    'bcpg:svhcListQtyPerc': percentage,
    'bcpg:lclPercentClaim': percentage,
    'bcpg:lclPercentApplicable': percentage,
    // states
    'bcpg:productState': entityState,
    'bcpg:supplierState': entityState,
    'bcpg:clientState': entityState,
    'bcpg:documentState': entityState,
    'bcpg:productCollectionState': entityState,
    'qa:batchState': entityState,
    'qa:ncState': entityState,
    // Registered twice in Share (lines 677 then 693) — the second wins.
    'qa:qcState': entityState,
    'qa:clState': complianceState,
    'qa:slSampleState': complianceState,
    'bcpg:lclClaimValue': labelClaimValue,
    'bcpg:entityDataListState': dataListState,
    // multi-level characteristics
    'bcpg:allergenListAllergen': characteristic,
    'bcpg:toxListTox': characteristic,
    'bcpg:svhcListIng': characteristic,

    /* --- level 3: the target class of an association --------------------- */
    'bcpg:ing': characteristic,
    'bcpg:allergen': characteristic,
    'bcpg:nut': characteristic,
    'bcpg:physicoChem': characteristic,
    'bcpg:microbio': characteristic,
    'bcpg:organo': characteristic,
    'bcpg:labelClaim': characteristic,
    'bcpg:geoOrigin': characteristic,
    'bcpg:bioOrigin': characteristic,
    'bcpg:geo': characteristic,
    'bcpg:listValue': characteristic,
    'bcpg:linkedSearchAssociation': characteristic,
});

/**
 * Share's `p_type` for a column.
 *
 * @param {Object} column a normalised datalist column
 * @returns {string|null} `double`, `mltext`, `bcpg:ing`… or `null`
 *
 * @example
 * shareTypeToken({ type: 'property', dataType: 'd:boolean' });          // 'boolean'
 * shareTypeToken({ type: 'association', endpointType: 'bcpg:nut' });    // 'bcpg:nut'
 */
export function shareTypeToken(column) {
    if (!column) {
        return null;
    }
    if (column.type === 'association' || column.dataType === 'association') {
        return column.endpointType || null;
    }
    const dataType = column.dataType;
    if (typeof dataType !== 'string' || !dataType) {
        return null;
    }
    return dataType.startsWith('d:') ? dataType.slice(2) : dataType;
}

/**
 * Resolves a column to its renderer, in Share's order.
 *
 * @param {Object} column a normalised datalist column
 * @returns {Function|null} the renderer, or `null` for the default rendering
 */
export function resolveRenderer(column) {
    if (!column?.name) {
        return null;
    }
    const token = shareTypeToken(column);
    if (token) {
        const scoped = RENDERERS[`${token}_${column.name}`];
        if (scoped) {
            return scoped;
        }
    }
    const byName = RENDERERS[column.name];
    if (byName) {
        return byName;
    }
    if (token) {
        const byType = RENDERERS[token];
        if (byType) {
            return byType;
        }
    }
    return null;
}

/**
 * Renders one cell through the registry.
 *
 * The single entry point of this directory. Both layouts call it — the table
 * cell and the card's label/value pair — so a phone shows the same formatted
 * value as a desktop, from the same code, and there is no second implementation
 * to keep in sync.
 *
 * @param {Object} params
 * @param {*} params.value the cell's raw value (pending edit included)
 * @param {string} params.displayValue what beCPG localised it to
 * @param {Object} params.row `{ nodeRef, itemType, values, displayValues }`
 * @param {Object} params.column the normalised column
 * @param {string} params.lang chrome language
 * @param {'table'|'card'} [params.layout='table']
 * @returns {React.ReactNode|null} `null` when the caller should render the cell
 *   the way it always has
 */
export function renderDataListCell({ value, displayValue, row, column, lang, layout = 'table' }) {
    const renderer = resolveRenderer(column);
    if (!renderer) {
        return null;
    }
    try {
        const rendered = renderer({ value, displayValue, row, column, lang, layout });
        return rendered === undefined ? null : rendered;
    }
    catch {
        // Same net as Share's, for the same reason: a renderer runs on values a
        // customer typed, and one of them must not be able to break a row. When
        // declining would put machine data back on screen — the JSON envelope of
        // a labelled nutrient value — the renderer says so and the cell empties
        // instead.
        return renderer.emptyOnError ? <EmptyCell /> : null;
    }
}
