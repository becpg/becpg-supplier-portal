'use client';

/**
 * The percentage family — the renderer that touches the most supplier columns.
 *
 * Ported from `product-columnRenderers.js:1103`. Nine keys are registered in
 * Share; six of them are declared by the wizards a supplier actually fills
 * (`ingListQtyPerc` and its two yield variants, `allergenListQtyPerc`,
 * `lclPercentClaim`, `lclPercentApplicable`), which is why this is the widest of
 * the four renderers that change text rather than colour.
 *
 * Measured on « Pâte à choux »: `bcpg:ingListQtyPerc` = `71.42857142857143`, and
 * the portal printed beCPG's `displayValue`, `71,4286`. Share prints `71,429 %`.
 */

import { EmptyCell, TotalCell } from '@/components/datalist/renderers/cells';
import { shareNumber, sigFigs } from '@/components/datalist/renderers/shareFormat';

/**
 * A ratio, printed the way beCPG prints ratios.
 *
 * Three rules, all Share's:
 *
 *  1. an exact `0` is `"0"` — no unit, because "0 %" and "0 ppm" say the same
 *     thing and the bare zero is what the grid has always shown;
 *  2. below 0.01 the value switches to **parts per million** (`×10000` and
 *     ` ppm`), which is the only readable form for an allergen trace: `0,005`
 *     becomes `50 ppm`, not `0,005 %`;
 *  3. otherwise five significant figures and ` %`.
 *
 * A total row (beCPG marks it `itemType: "total"`) gets seven significant
 * figures and Share's `class="total"`, here rendered as the semibold cell the
 * portal uses for a computed line.
 *
 * `maximumFractionDigits: 20` is deliberate and is Share's: the rounding has
 * already happened in {@link sigFigs}, and letting `Intl` round again to its
 * three-digit default would turn `50 ppm` into `50` and `71,429` into `71,429`
 * only by luck.
 *
 * The two branches Share guards with `oColumn.forceUnit` and
 * `oColumn.numberFormat` are **not** ported: those two properties are read in
 * several renderers and assigned in none — they are per-customer datagrid
 * configuration hooks, dead in a stock deployment.
 *
 * @param {Object} cell
 * @returns {React.ReactNode|null}
 */
export function percentage({ value, row, lang }) {
    if (value === null || value === undefined || value === '') {
        return <EmptyCell />;
    }
    const numeric = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
    if (!Number.isFinite(numeric)) {
        // Not a number at all: beCPG's own text is more useful than an em dash.
        return null;
    }
    if (numeric === 0) {
        return <span>0</span>;
    }

    const ppm = Math.abs(numeric) < 0.01;
    const quantity = ppm ? numeric * 10000 : numeric;
    const unit = ppm ? ' ppm' : ' %';
    const isTotal = row?.itemType === 'total';

    const text = shareNumber(
        sigFigs(quantity, isTotal ? 7 : 5),
        lang,
        { maximumFractionDigits: 20 },
    ) + unit;

    return isTotal
        ? <TotalCell><span title={text}>{text}</span></TotalCell>
        : <span title={text}>{text}</span>;
}
