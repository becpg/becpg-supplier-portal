'use client';

/**
 * The handful of presentational pieces every renderer is built from.
 *
 * Two rules are enforced by construction here rather than by review:
 *
 *  1. **A renderer never injects HTML.** Share's renderers concatenate strings
 *     and hand YUI a blob of markup; the values inside that blob come from the
 *     repository, i.e. from whatever a customer typed into a nutrient name three
 *     years ago. Everything below builds React elements, so a value is always a
 *     text node and there is no `dangerouslySetInnerHTML` anywhere in this
 *     directory.
 *  2. **Colour is never the only carrier of meaning** (AGENTS.md). Share paints a
 *     tolerance bound with `class="red"` and stops there. {@link Tone} keeps the
 *     colour but is only ever used where a glyph or a word already says the same
 *     thing — the `<` before a threshold, the icon in a `StatusPill`, the `%`
 *     after a percentage — and it always carries a `title`.
 *
 * Colours come from the `--status-*` tokens of `app/globals.css`, which is where
 * the beCPG palette lives and what a tenant theme overrides. No renderer in this
 * directory contains a hex value.
 */

/** What an empty cell looks like — the same markup the default read cell uses. */
export function EmptyCell() {
    return <span className="text-[var(--becpg-dark-grey)]">—</span>;
}

/** Tone → the CSS custom property that carries it. */
const TONE_VAR = Object.freeze({
    danger: 'var(--status-danger)',
    ok: 'var(--status-ok)',
    warn: 'var(--status-warn)',
    info: 'var(--becpg-blue-light)',
    muted: 'var(--becpg-dark-grey)',
});

/**
 * A run of text in one of the status tones.
 *
 * @param {Object} props
 * @param {'danger'|'ok'|'warn'|'info'|'muted'} props.tone
 * @param {string} [props.title] native tooltip — what the colour means, in words
 * @param {React.ReactNode} props.children
 */
export function Tone({ tone, title, children }) {
    return (
        <span style={{ color: TONE_VAR[tone] || 'inherit' }} title={title || undefined}>
            {children}
        </span>
    );
}

/**
 * A power of ten, as `beCPG.util.exp()` renders it — except that here the `10`
 * and the exponent are elements rather than a `<sup>` spliced into a string.
 *
 * @param {Object} props
 * @param {string} props.exponent `'-3'`, `'6'`…
 */
export function Exponent({ exponent }) {
    return (
        <>
            ×10<sup>{exponent}</sup>
        </>
    );
}

/** Pixels per depth level in the card layout — see {@link Indent}. */
export const CARD_STEP = 8;

/**
 * The indent of a multi-level list (`bcpg:ingList`, a branching questionnaire).
 *
 * Share multiplies `bcpg:depthLevel - 1` by 25 px for a characteristic and by
 * 15 px for a question label, and writes it as a `margin-left`. Two deviations,
 * both deliberate:
 *
 *   - `marginInlineStart`, not `margin-left`;
 *   - **a much smaller step in the card layout.** Below `md` a row is a card of
 *     label/value pairs on a 360 px screen, where 25 px per level would eat a
 *     quarter of the line by the third ingredient. The hierarchy still has to
 *     survive — a flattened `bcpg:ingList` reads as unrelated ingredients, which
 *     is wrong and not merely plain — so the step drops to {@link CARD_STEP}
 *     rather than to zero. That keeps it language-neutral: nothing here has to
 *     spell the word "level" in a language the portal has no dictionary for.
 *
 * @param {Object} props
 * @param {number} props.depth `bcpg:depthLevel`, 1-based (1 = no indent)
 * @param {number} [props.step=25] pixels per level, in the table layout
 * @param {'table'|'card'} [props.layout='table']
 * @param {string} [props.title]
 * @param {React.ReactNode} props.children
 */
export function Indent({ depth, step = 25, layout = 'table', title, children }) {
    const level = Number(depth);
    const perLevel = layout === 'card' ? CARD_STEP : step;
    const offset = !Number.isFinite(level) || level <= 1 ? 0 : (level - 1) * perLevel;
    if (offset === 0) {
        return <span title={title || undefined}>{children}</span>;
    }
    return (
        // A block, not an inline span: the label inside is a flex row, and an
        // inline margin only moves the first line box, which pushed the name onto
        // a line of its own with no indent at all.
        <span className="block" style={{ marginInlineStart: `${offset}px` }} title={title || undefined}>
            {children}
        </span>
    );
}

/**
 * A total row's cell — beCPG marks these with `itemType: "total"` and Share
 * gives them `class="total"`.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function TotalCell({ children }) {
    return <span className="font-semibold">{children}</span>;
}
