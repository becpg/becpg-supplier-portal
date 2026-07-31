'use client';

/**
 * The columns Share renders as a coloured label: entity states, compliance
 * verdicts, the allergen booleans, the label-claim verdict, the frozen-list lock.
 *
 * Ported from `product-columnRenderers.js` lines 173, 186, 213, 676, 692 and
 * 1721.
 *
 * ## Colour is not enough here, and Share only has colour
 *
 * Every one of these renderers is a `<span class="red">` / `"green"` / `"blue"`
 * around a label beCPG already translated. Read literally that is a portal-wide
 * rule violation (AGENTS.md: "status is never conveyed by colour alone"), so each
 * of them is expressed through {@link StatusPill}, which resolves anything to the
 * triple **(tone, icon, label)** and is readable in greyscale and to a screen
 * reader. The label is always beCPG's `displayValue`, never a portal string:
 * these values are business vocabulary and arrive already translated.
 *
 * The Share class → portal tone mapping is one-to-one and mechanical, so the two
 * screens still agree at a glance: `red` → `danger`, `green` → `ok`,
 * `blue` → `info`.
 *
 * Nothing is rendered as a pill when Share renders nothing: a `false` boolean or
 * an unremarkable state is plain text, exactly as in the grid, which is what
 * keeps a nine-column list from turning into a wall of badges.
 */

import { Icon } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyCell } from '@/components/datalist/renderers/cells';

/**
 * `bcpg:productState`, `bcpg:supplierState`, `bcpg:clientState`,
 * `bcpg:documentState`, `bcpg:productCollectionState`, `qa:batchState`,
 * `qa:ncState`, `qa:qcState`.
 *
 * Share writes `class="product-state entity-{value}"` and lets the stylesheet
 * pick the colour per state. `StatusPill.resolveStatus()` already knows this
 * vocabulary — `Valid`, `Simulation`, `ToValidate`, `Refused`, `Archived` all
 * resolve — and an unknown state falls through to a neutral pill showing beCPG's
 * own label rather than being swallowed.
 *
 * `qa:qcState` is registered twice in Share (lines 677 and 693); the second
 * registration wins, so quality-control rows get the entity-state rendering and
 * not the compliance one. That is reproduced.
 *
 * @param {Object} cell
 * @returns {React.ReactNode|null}
 */
export function entityState({ value, displayValue }) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    return <StatusPill status={String(value)} label={displayValue || String(value)} size="sm" />;
}

/**
 * `qa:clState`, `qa:slSampleState` — a control point's verdict.
 *
 * @param {Object} cell
 * @returns {React.ReactNode|null}
 */
export function complianceState({ value, displayValue }) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const label = displayValue || String(value);
    if (value === 'Compliant') {
        return <StatusPill status={label} label={label} tone="ok" icon="check_circle" size="sm" />;
    }
    if (value === 'NonCompliant') {
        return <StatusPill status={label} label={label} tone="danger" icon="cancel" size="sm" />;
    }
    return null;
}

/**
 * The allergen presence booleans — `boolean_bcpg:allergenListVoluntary`,
 * `…InVoluntary`, `…OnSite`, `…OnLine`, plus `boolean_bcpg:packagingListIsMaster`.
 *
 * Share turns the label red when the flag is set, because "this product contains
 * that allergen on purpose" is the line a quality manager scans for. The `false`
 * case is untouched plain text.
 *
 * @param {Object} cell
 * @returns {React.ReactNode|null}
 */
export function flaggedBoolean({ value, displayValue }) {
    if (!isTrue(value)) {
        return null;
    }
    const label = displayValue || '';
    return <StatusPill status={label} label={label} tone="danger" icon="warning" size="sm" />;
}

/**
 * `boolean_bcpg:allergenListIsCleaned` — the reassuring one, green in Share.
 *
 * @param {Object} cell
 * @returns {React.ReactNode|null}
 */
export function reassuringBoolean({ value, displayValue }) {
    if (!isTrue(value)) {
        return null;
    }
    const label = displayValue || '';
    return <StatusPill status={label} label={label} tone="ok" icon="check_circle" size="sm" />;
}

/**
 * `bcpg:lclClaimValue` — whether a label claim holds for this product.
 *
 * Share's three tinted cases: `true` red, `suitable` blue, `certified` green.
 * Anything else — including the very common `false` — is plain text.
 *
 * @param {Object} cell
 * @returns {React.ReactNode|null}
 */
export function labelClaimValue({ value, displayValue }) {
    const label = displayValue || '';
    if (value === 'true' || value === true) {
        return <StatusPill status={label} label={label} tone="danger" icon="warning" size="sm" />;
    }
    if (value === 'suitable') {
        return <StatusPill status={label} label={label} tone="info" icon="thumb_up" size="sm" />;
    }
    if (value === 'certified') {
        return <StatusPill status={label} label={label} tone="ok" icon="verified" size="sm" />;
    }
    return null;
}

/**
 * `bcpg:entityDataListState` — the padlock on a validated (frozen) list.
 *
 * Share un-hides the column and drops a `.locked` glyph in it when the value is
 * `Valid`, and renders nothing otherwise. Same here, with the state's own label
 * as the accessible name so the padlock is not a colour-and-shape-only signal.
 *
 * In practice the column arrives `label: "hidden"` and is dropped before it ever
 * reaches a cell — the portal says "frozen" at the step level instead, which is
 * where a supplier can act on it. This is registered for the deployments that do
 * show the column, and costs nothing in the ones that do not.
 *
 * @param {Object} cell
 * @returns {React.ReactNode|null}
 */
export function dataListState({ value, displayValue }) {
    if (value !== 'Valid') {
        return <EmptyCell />;
    }
    const label = displayValue || String(value);
    return (
        <span className="inline-flex items-center gap-1" title={label}>
            <Icon name="lock" size={14} className="text-[var(--becpg-dark-grey)]" />
            <span className="sr-only-text">{label}</span>
        </span>
    );
}

/**
 * beCPG serialises a `d:boolean` cell as `true` or as the string `"true"`
 * depending on the extractor; both mean the same thing.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isTrue(value) {
    return value === true || value === 'true';
}
