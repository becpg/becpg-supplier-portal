'use client';

/**
 * The cells Share annotates rather than formats: the ingredient flags, the
 * omitted ingredient, the packaging level, the sources of an allergen and the
 * sources a label claim is missing.
 *
 * Ported from `product-columnRenderers.js` lines 221, 236, 647, 2331 and 2415.
 * The rules they follow are in `signals.js`, where they can be tested without
 * a browser; this file only draws them.
 */

import { Icon } from '@/components/ui/Button';
import { ListIcon } from '@/components/ui/ListIcon';
import { Tooltip } from '@/components/ui/Tooltip';
import { hasListIcon } from '@/lib/listIcons';
import { EmptyCell } from '@/components/datalist/renderers/cells';
import {
    OMITTED_DECLARATION,
    cellNames,
    fillLabel,
    ingredientFlagBadges,
    packagingLevelLabel,
    rendererLabels,
} from '@/components/datalist/renderers/signals';

/**
 * Marks the cell of an omitted ingredient. `app/globals.css` tints the whole
 * row from it (`:has()`), the way Share paints the `<tr>` of such a line: the
 * row component stays unaware of a business rule that belongs to one column.
 */
export const OMITTED_ROW_MARKER = 'becpg-decl-omit';

/**
 * `bcpg:ingListFlags` — processing aid, support, impurity, nano, GMO,
 * ionised: one badge per flag, its label always printed.
 *
 * @param {Object} cell
 * @returns {React.ReactNode}
 */
export function ingredientFlags({ value, displayValue }) {
    const badges = ingredientFlagBadges(value, displayValue);
    if (badges.length === 0) {
        return <EmptyCell />;
    }
    return (
        <span className="inline-flex flex-wrap gap-0.5">
            {badges.map((badge) => (
                <span key={badge.code} className={`pill pill-sm pill-no-dot pill-${badge.tone}`} title={badge.label}>
                    {badge.label}
                </span>
            ))}
        </span>
    );
}

/**
 * `bcpg:ingListDeclType` — an omitted ingredient says so with an icon and
 * marks its row; every other declaration type is plain text.
 *
 * @param {Object} cell
 * @returns {React.ReactNode|null}
 */
export function declarationType({ value, displayValue, lang }) {
    if (value !== OMITTED_DECLARATION) {
        return null;
    }
    const label = displayValue || String(value);
    return (
        <span className={`${OMITTED_ROW_MARKER} inline-flex items-center gap-1`} title={rendererLabels(lang).omitted}>
            <Icon name="visibility_off" size={14} />
            {label}
        </span>
    );
}

/**
 * `bcpg:packagingListPkgLevel` — the level in the reader's language when
 * beCPG sent the bare code.
 *
 * @param {Object} cell
 * @returns {React.ReactNode|null}
 */
export function packagingLevel({ value, displayValue, lang }) {
    const label = packagingLevelLabel(value, displayValue, lang);
    return label ? <span title={label}>{label}</span> : null;
}

/**
 * The sources of an allergen (`bcpg:allergenListVolSources`,
 * `…InVolSources`): each with the glyph of what it is — an ingredient, a raw
 * material, a semi-finished product.
 *
 * Share links each source to its entity, or opens an ingredient's details. The
 * portal has no page for either, so the names stay text, as the
 * characteristic renderers already decided.
 *
 * @param {Object} cell
 * @returns {React.ReactNode|null}
 */
export function sourceList({ value }) {
    const sources = Array.isArray(value) ? value.filter((entry) => entry && typeof entry === 'object') : [];
    if (!sources.some((entry) => hasListIcon(entry.metadata))) {
        return null;
    }
    return (
        <span className="inline-flex flex-wrap gap-x-2 gap-y-0.5">
            {sources.map((entry, index) => (
                <span key={entry.value ?? index} className="inline-flex items-center gap-1">
                    {hasListIcon(entry.metadata) ? <ListIcon type={entry.metadata} size={16} /> : null}
                    {entry.displayValue ?? entry.value}
                </span>
            ))}
        </span>
    );
}

/**
 * `bcpg:lclMissingLabelClaims` — the sources that do not carry the claim: a
 * warning naming how many, which opens the list.
 *
 * @param {Object} cell
 * @returns {React.ReactNode}
 */
export function missingLabelClaims({ value, displayValue, lang }) {
    const names = cellNames(value, Array.isArray(value) ? null : displayValue);
    if (names.length === 0) {
        return <EmptyCell />;
    }
    const labels = rendererLabels(lang);
    return (
        <Tooltip
            maxWidth={320}
            content={(
                <span className="flex flex-col gap-1">
                    <span>{labels.missingSourcesList}</span>
                    <ul className="list-disc ps-4">
                        {names.map((name, index) => <li key={`${name}-${index}`}>{name}</li>)}
                    </ul>
                </span>
            )}
        >
            <Icon name="warning" size={16} className="text-[var(--status-warn)]" />
            <span>{fillLabel(labels.missingSources, { count: names.length })}</span>
        </Tooltip>
    );
}
