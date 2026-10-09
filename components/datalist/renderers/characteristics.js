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

import { Icon } from '@/components/ui/Button';
import { ListIcon } from '@/components/ui/ListIcon';
import { Tooltip } from '@/components/ui/Tooltip';
import { hasListIcon } from '@/lib/listIcons';
import { EmptyCell, Indent, TotalCell } from '@/components/datalist/renderers/cells';
import {
    claimDescription,
    formulationSignal,
    rendererLabels,
} from '@/components/datalist/renderers/signals';

/** The target class whose rows carry a claim description. */
const LABEL_CLAIM_CLASS = 'bcpg:labelClaim';

/**
 * The icon key of a characteristic cell — Share's `data.metadata`.
 *
 * `product-columnRenderers.js:141` renders the whole cell as
 * `<span class="{data.metadata}">{displayName}</span>`, and `beCPG.css:940-1050`
 * turns that class into a 16×16 `background-image`. So the key is not derived,
 * looked up or guessed: the repository ships it *in the cell*, and an
 * association cell survives `splitCells` as `{value, displayValue, metadata}` —
 * `values.assoc_bcpg_ingListIng[0].metadata === "ing"`.
 *
 * Two shapes reach this, and only one carries the key. A **multi-valued**
 * association keeps its cells (an array of maps), so `metadata` is there; a
 * **single-valued** one is flattened by `splitCells` to the bare nodeRef, and
 * the key is gone. That is why this returns `null` rather than falling back to
 * the column, the list or the row's `itemType`: no icon is Share's own
 * behaviour for a class it has no picture for, and a *wrong* icon on a
 * characteristic is worse than none.
 *
 * @param {*} value the cell's raw value
 * @returns {string|null}
 */
export function characteristicIconKey(value) {
    const cell = Array.isArray(value) ? value[0] : value;
    if (!cell || typeof cell !== 'object' || Array.isArray(cell)) {
        return null;
    }
    const metadata = cell.metadata;
    return typeof metadata === 'string' && metadata !== '' ? metadata : null;
}

/**
 * A characteristic's label, with the glyph beCPG ships for its type.
 *
 * Share applies `padding-left: 20px` and a background image; the portal puts a
 * real 16px `<img>` in front of the text with a 4px gap — the same 20px, but as
 * a box rather than a painted background, so a name that wraps aligns under
 * itself instead of running back under the icon.
 *
 * The gate is `hasListIcon`, which is precisely "beCPG ships a picture for this
 * class". A type it has none for renders exactly as before — no icon, no
 * placeholder, no reserved box — which is what Share's CSS does when a class
 * has no rule. The total row's key is `"total"`, and there is no `total` glyph,
 * so it keeps its bare bold label.
 *
 * A formulation signal takes the glyph's place, as Share's `*-formulated` and
 * `*-formulated-error` classes replace the type's background image.
 *
 * @param {Object} props
 * @param {string|null} props.iconKey
 * @param {Object|null} [props.signal] {@link formulationSignal}
 * @param {string} [props.description] the label claim's description
 * @param {string} props.lang
 * @param {React.ReactNode} props.children
 */
function CharacteristicLabel({ iconKey, signal = null, description = '', lang, children }) {
    const glyph = signal
        ? <SignalGlyph signal={signal} lang={lang} />
        : iconKey && hasListIcon(iconKey) ? <ListIcon type={iconKey} size={16} /> : null;
    if (!glyph && !description) {
        return children;
    }
    return (
        <span className="flex items-start gap-1">
            {glyph}
            <span className="min-w-0">{children}</span>
            {description ? (
                <Tooltip content={description} variant="info" label={rendererLabels(lang).claimDescription} />
            ) : null}
        </span>
    );
}

/**
 * The warning triangle of a broken requirement, or the mark of a formulated
 * value. Never colour alone: the triangle is a button named after what it means
 * and opens the requirement's own words; the formulated mark carries its label.
 *
 * @param {Object} props
 * @param {{kind: string, message?: string}} props.signal
 * @param {string} props.lang
 */
function SignalGlyph({ signal, lang }) {
    const labels = rendererLabels(lang);
    if (signal.kind === 'error') {
        return (
            <Tooltip
                content={<span className="whitespace-pre-line">{signal.message}</span>}
                maxWidth={320}
                className="shrink-0"
            >
                <Icon name="warning" size={16} className="text-[var(--status-warn)]" />
                <span className="sr-only-text">{labels.requirementBroken}</span>
            </Tooltip>
        );
    }
    return (
        <span className="inline-flex shrink-0" title={labels.formulated}>
            <Icon name="functions" size={16} className="text-[var(--becpg-blue-light)]" />
            <span className="sr-only-text">{labels.formulated}</span>
        </span>
    );
}

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
    return function indented({ value, displayValue, row, column, lang, layout }) {
        const text = displayValue === null || displayValue === undefined ? '' : String(displayValue);
        if (!text) {
            return <EmptyCell />;
        }
        const isTotal = row?.itemType === 'total';
        const iconKey = characteristicIconKey(value);
        const iconed = Boolean(iconKey) && hasListIcon(iconKey);
        const depth = depthOf(row);
        const isIndented = depth !== null && depth > 1;
        const targetClass = column?.endpointType ?? null;
        const signal = formulationSignal(row, targetClass);
        // Share's rule: the description only accompanies a claim whose
        // formulation raised nothing.
        const description = signal?.kind === 'formulated' && targetClass === LABEL_CLAIM_CLASS
            ? claimDescription(row)
            : '';
        if (!iconed && !isIndented && !signal) {
            // Nothing to add over the default rendering: decline, so the grid
            // keeps its own (identical) markup and its own title.
            return isTotal ? <TotalCell>{text}</TotalCell> : null;
        }
        /*
         * The icon goes **inside** the indent, as it does in Share, where one
         * span carries both the type class and `style="margin-left:25px"`. The
         * `title` stays on the indent so a name truncated by a narrow column is
         * still readable on hover, unless a tooltip of its own already speaks
         * there: two bubbles over one cell say nothing twice as loud.
         */
        const body = (
            <Indent depth={depth ?? 1} step={step} layout={layout} title={signal || description ? undefined : text}>
                <CharacteristicLabel iconKey={iconKey} signal={signal} description={description} lang={lang}>
                    {text}
                </CharacteristicLabel>
            </Indent>
        );
        return isTotal ? <TotalCell>{body}</TotalCell> : body;
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
