/**
 * The icon of a beCPG characteristic list — Share's own glyphs, vendored.
 *
 * ## Why an image and not a font icon
 *
 * Share does not draw these with an icon font or a sprite: `beCPG.css:940-1050`
 * declares **one 16×16 PNG per type**, applied as a `background-image` on
 * `span.<type>` with `padding-left: 20px`. `ingList` is a wheat ear, `nutList`
 * an apple, `allergenList` a peanut — a food professional reads the bar by its
 * glyphs before reading a single label, and inventing lookalikes out of
 * Material Symbols would have produced *different* pictures for the same
 * concepts. The 17 PNGs are copied verbatim into `public/becpg/charact/`
 * (6.6 KB in total, `git`-tracked): the portal shows the icons a supplier
 * already knows from Share, and nothing is ever fetched from a Share host.
 *
 * Sources — copied, not linked:
 *   `becpg-plm/becpg-plm-share/src/main/assembly/web/components/images/filetypes/`
 *   `becpg-project/becpg-project-share/…/filetypes/` (`generic-task-16.png`)
 *
 * ## Two kinds of icon, on purpose
 *
 * A resolver returns a **descriptor**, not a URL, because half the surfaces
 * that name a list are not characteristic lists at all:
 *
 *   `{ kind: 'image',  src }`  beCPG ships a glyph for this type — use it.
 *   `{ kind: 'symbol', name }` beCPG ships none (the properties form, the
 *                              documents check-list, a questionnaire): the
 *                              portal's own Material icon, so the surface still
 *                              has *an* icon instead of a hole.
 *
 * That is the whole mixing rule, and it lives here rather than in each caller.
 *
 * ## Unknown types
 *
 * The map is closed: a name it does not know resolves to
 * `generic-product-16.png`, which is a real vendored file. **No lookup can ever
 * produce a URL that 404s**, which is what keeps a client-specific list
 * (`bcpg:myOwnList`) from rendering a broken image in the tab bar.
 */

import { withBasePath } from '@/lib/basePath';

/**
 * Where the vendored PNGs live, under `public/`.
 *
 * **Through `withBasePath`, like every other absolute path the portal writes by
 * hand.** Served under a prefix — `/supplier` on the deployed instance — a bare
 * `/becpg/charact/generic-nut-16.png` leaves the application and 404s. `ListIcon`
 * then falls back to its Material symbol on the image's `onError`, so nothing
 * breaks visibly: every characteristic list simply wears the same `list_alt`
 * glyph, and the wheat ear, the apple and the peanut a food professional reads
 * the grid by are gone. Measured on dev: `/becpg/charact/generic-nut-16.png`
 * 404, `/supplier/becpg/charact/generic-nut-16.png` 200, and every `<img>` in
 * the assistant's rail at `naturalWidth: 0`.
 */
export const LIST_ICON_BASE = withBasePath('/becpg/charact');

/**
 * Every PNG actually present in `public/becpg/charact/`.
 *
 * The map below may only point at a member of this set; that invariant is what
 * makes "never a broken image" a property of the code rather than a hope.
 */
export const LIST_ICON_ASSETS = [
    'generic-allergen-16',
    'generic-cost-16',
    'generic-finishedProduct-16',
    'generic-ing-16',
    'generic-labelClaim-16',
    'generic-labelingRuleList-16',
    'generic-lca-16',
    'generic-microbio-16',
    'generic-nut-16',
    'generic-organo-16',
    'generic-packagingKit-16',
    'generic-physicoChem-16',
    'generic-product-16',
    'generic-productSpecification-16',
    'generic-resourceProduct-16',
    'generic-supplier-16',
    'generic-task-16',
];

/** The asset used when a type is not in the map — a real file, always. */
export const LIST_ICON_FALLBACK = 'generic-product-16';

/**
 * type → asset, transcribed from `beCPG.css`.
 *
 * Both spellings of every entry are kept, because the two travel through
 * different fields: the **list** name (`nutList`) names a wizard step, the
 * **charact** name (`nut`) is the `metadata` of an association value
 * (`values.assoc_bcpg_ingListIng[0].metadata === 'ing'`). Share's CSS declares
 * them as a single selector list for exactly the same reason.
 */
const LIST_ICONS = {
    // --- characteristics -------------------------------------------------
    ing: 'generic-ing-16',
    ingList: 'generic-ing-16',
    nut: 'generic-nut-16',
    nutList: 'generic-nut-16',
    allergen: 'generic-allergen-16',
    allergenList: 'generic-allergen-16',
    organo: 'generic-organo-16',
    organoList: 'generic-organo-16',
    physicoChem: 'generic-physicoChem-16',
    physicoChemList: 'generic-physicoChem-16',
    microbio: 'generic-microbio-16',
    microbioList: 'generic-microbio-16',
    cost: 'generic-cost-16',
    costList: 'generic-cost-16',
    budgetList: 'generic-cost-16',
    lca: 'generic-lca-16',
    lcaList: 'generic-lca-16',
    labelClaim: 'generic-labelClaim-16',
    labelClaimList: 'generic-labelClaim-16',
    ingLabelingList: 'generic-labelingRuleList-16',
    labelingRuleList: 'generic-labelingRuleList-16',
    // --- structure -------------------------------------------------------
    compoList: 'generic-finishedProduct-16',
    packagingList: 'generic-packagingKit-16',
    processList: 'generic-resourceProduct-16',
    resourceParam: 'generic-resourceProduct-16',
    resourceParamList: 'generic-resourceProduct-16',
    taskList: 'generic-task-16',
    // --- entities the portal names next to its own tabs ------------------
    productSpecification: 'generic-productSpecification-16',
    supplier: 'generic-supplier-16',
    product: 'generic-product-16',
};

/**
 * Types beCPG ships no glyph for. They are **not** unknown — mapping them to
 * the generic product icon would be a lie — so they resolve to the portal's own
 * Material icon instead. `survey` is the clearest case: a questionnaire is not
 * a characteristic list, and Share renders it through a different component
 * entirely.
 */
const SYMBOL_ICONS = {
    survey: 'quiz',
    surveyList: 'quiz',
    form: 'description',
    documents: 'folder_open',
    documentList: 'folder_open',
    compliance: 'verified',
    specs: 'menu_book',
};

/** `surveyList@2` → `surveyList`; `bcpg:nutList` → `nutList`; trims spaces. */
function normalise(type) {
    if (type === null || type === undefined) {
        return '';
    }
    const raw = String(type).trim();
    const noPrefix = raw.includes(':') ? raw.slice(raw.indexOf(':') + 1) : raw;
    const noIndex = noPrefix.includes('@') ? noPrefix.slice(0, noPrefix.indexOf('@')) : noPrefix;
    return noIndex.trim();
}

/**
 * Does beCPG ship a glyph for this type?
 *
 * @param {string|null|undefined} type a list name or a charact name
 * @returns {boolean} false for an unknown type *and* for a symbol-only type
 */
export function hasListIcon(type) {
    return Object.prototype.hasOwnProperty.call(LIST_ICONS, normalise(type));
}

/**
 * The vendored PNG for a type — never null, never a 404.
 *
 * @param {string|null|undefined} type
 * @returns {string} an absolute path under `public/`
 */
export function listIconUrl(type) {
    const asset = LIST_ICONS[normalise(type)] || LIST_ICON_FALLBACK;
    return `${LIST_ICON_BASE}/${asset}.png`;
}

/**
 * The icon of a named list, as a descriptor.
 *
 * @param {string|null|undefined} type a list name (`nutList`, `surveyList@1`),
 *        a charact name (`nut`), or one of the portal's own tab kinds
 * @param {Object} [options]
 * @param {string} [options.fallbackSymbol] Material icon to use when the type is
 *        unknown *and* the caller would rather show a symbol than the generic
 *        product glyph — the tab bar uses it for its own non-beCPG tabs
 * @returns {{kind: 'image', src: string, key: string}|{kind: 'symbol', name: string, key: string}}
 */
export function listIcon(type, options = {}) {
    const key = normalise(type);
    if (Object.prototype.hasOwnProperty.call(LIST_ICONS, key)) {
        return { kind: 'image', src: `${LIST_ICON_BASE}/${LIST_ICONS[key]}.png`, key };
    }
    if (Object.prototype.hasOwnProperty.call(SYMBOL_ICONS, key)) {
        return { kind: 'symbol', name: SYMBOL_ICONS[key], key };
    }
    if (options.fallbackSymbol) {
        return { kind: 'symbol', name: options.fallbackSymbol, key };
    }
    return { kind: 'image', src: `${LIST_ICON_BASE}/${LIST_ICON_FALLBACK}.png`, key };
}
