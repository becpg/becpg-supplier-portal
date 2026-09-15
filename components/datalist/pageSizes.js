/**
 * How many rows of a datalist may be asked for at once.
 *
 * ## Why this file has to exist
 *
 * The choice offered in the grid's footer and the ceiling the adapter clamps to
 * are the same decision, and they were written twice: the footer offered 500
 * while `getRows()` capped at 200, so picking 500 returned 200 rows and the
 * select snapped back to 200 with nothing said. Owning the vocabulary in one
 * place is what keeps the offer and the ceiling from disagreeing again.
 *
 * A pure table — no React, no server import — so both sides can share it: the
 * client footer reads {@link PAGE_SIZES}, the server adapter clamps to
 * {@link MAX_PAGE_SIZE}.
 *
 * A nutrient or ingredient list runs to a few hundred rows and is filled in one
 * sitting, from a spreadsheet: paging through it in slices of 25 is the wrong
 * unit of work. The read is server side and paginated, so a large page costs one
 * bigger response rather than a client-side sort over everything.
 */

/** What a supplier may ask to see at once, smallest first. */
export const PAGE_SIZES = Object.freeze([25, 50, 100, 200, 500]);

/** Rows per page when the caller does not say. */
export const DEFAULT_PAGE_SIZE = PAGE_SIZES[0];

/** Hard ceiling, so a crafted request cannot ask the repository for everything. */
export const MAX_PAGE_SIZE = PAGE_SIZES[PAGE_SIZES.length - 1];
