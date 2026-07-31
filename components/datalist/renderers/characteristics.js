'use client';

/**
 * Characteristic columns — the ingredient, the nutrient, the allergen, the
 * question: the cell that carries a row's identity.
 *
 * Ported from `product-columnRenderers.js` lines 96, 705, 728, 760, 1348 and
 * 2407.
 *
 * ## What these renderers actually do, and what is left out
 *
 * Share's version of each of them builds a link, a CSS class, an indent, a
 * details popup and a set of `<tr>` classes. Only **one** of those five is a
 * difference the supplier can see, and it is the indent:
 *
 *  - **the indent stays.** `bcpg:ingList` is a tree — the ingredients of an
 *    ingredient — and `bcpg:depthLevel` is what says so. Flattened, a
 *    three-level declaration reads as one list of unrelated ingredients, which
 *    is wrong rather than merely plain. The card layout keeps it too, at a
 *    smaller step (see `Indent`), because a 360 px screen cannot spend 50 px on
 *    hierarchy but must not lose it either.
 *
 *  - **the link goes.** Share only links these cells inside a *where-used* list
 *    (`scope.datalistMeta.name.indexOf("WUsed") > -1`); everywhere else it
 *    renders a bare span, and no supplier wizard contains a where-used list. So
 *    "no link" *is* the faithful port for every list a supplier sees. It is also
 *    the only defensible one: the portal has no page for a beCPG characteristic,
 *    and the row payload carries no permission on the *target*, only on the row —
 *    so a link to an ingredient would be a guess, and a guess that resolves to a
 *    403 is worse than the plain text it replaced.
 *
 *  - **the details popup, the `mtl-*` row classes and the expand/collapse toggle
 *    go.** They are YUI DataTable machinery (`Dom.addClass(tr, …)`, a
 *    `SimpleDialog`, a group-toggle anchor bound to a Bubbling event). Faking a
 *    toggle that collapses nothing would be worse than not having one. Share's
 *    extra 25 px indent on a leaf is dropped with the toggle it aligns under —
 *    on its own it would push every leaf right for no reason.
 */

import { EmptyCell, Indent, TotalCell } from '@/components/datalist/renderers/cells';

/**
 * `bcpg:depthLevel` of a row, as a 1-based level.
 *
 * It is a hidden column, so it is requested as a companion field
 * (`dependencies.js`) rather than resolved as one of the grid's own.
 *
 * @param {Object} row
 * @returns {number|null}
 */
function depthOf(row) {
    const raw = row?.values?.prop_bcpg_depthLevel;
    const level = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(level) && level > 0 ? level : null;
}

/**
 * Builds one of the two indenting renderers.
 *
 * @param {number} step pixels per level — 25 for a characteristic, 15 for a
 *   question label, both Share's numbers
 * @returns {Function} a renderer
 */
function indentingRenderer(step) {
    return function indented({ displayValue, row, layout }) {
        const text = displayValue === null || displayValue === undefined ? '' : String(displayValue);
        if (!text) {
            return <EmptyCell />;
        }
        const depth = depthOf(row);
        if (depth === null || depth <= 1) {
            // Nothing to add over the default rendering: decline, so the grid
            // keeps its own (identical) markup and its own title.
            return row?.itemType === 'total' ? <TotalCell>{text}</TotalCell> : null;
        }
        const body = (
            <Indent depth={depth} step={step} layout={layout} title={text}>
                {text}
            </Indent>
        );
        return row?.itemType === 'total' ? <TotalCell>{body}</TotalCell> : body;
    };
}

/**
 * The characteristic of a multi-level list — the ingredient of `bcpg:ingList`,
 * the allergen of `bcpg:allergenList`, and every flat characteristic
 * (`bcpg:nut`, `bcpg:physicoChem`, `bcpg:microbio`, `bcpg:organo`,
 * `bcpg:labelClaim`, `bcpg:geoOrigin`…), which Share indents by the same 25 px
 * when the list happens to be nested.
 *
 * @type {Function}
 */
export const characteristic = indentingRenderer(25);

/**
 * `mltext_survey:questionLabel` — a question of a branching questionnaire,
 * indented by 15 px per level.
 *
 * Note that this is *not* the column the supplier's questionnaire uses:
 * `supplier-*` wizards declare `survey:slQuestion`, a flat association whose
 * `displayValue` beCPG already resolves to the question text. This renderer
 * applies to the nested `survey:questionLabel` column of a questionnaire
 * *definition* list, which is where the levels exist.
 *
 * @type {Function}
 */
export const questionLabel = indentingRenderer(15);
