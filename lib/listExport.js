/**
 * Exports a list as CSV in the browser, with the columns the reader sees.
 *
 * A monitoring list shows one page of a server-paged result; its export holds
 * every page, read through the same API call, so the file is the list and not
 * the window on it. The volume is bounded, and the file says nothing it did not
 * read: when the bound is reached the caller is told.
 */

import { api } from '@/lib/client';
import { toCsv } from '@/lib/csv';

/** Pages read at most for one export: 40 × 100 rows. */
const MAX_PAGES = 40;
const EXPORT_PAGE_SIZE = 100;

/**
 * Reads every page of a paged list endpoint.
 *
 * @param {Object} params
 * @param {string} params.path API path, as given to `useApi`
 * @param {Object} [params.query] the list's own parameters (filters, sort)
 * @param {string} [params.itemsKey='items'] where the rows are in a page
 * @returns {Promise<{rows: Object[], complete: boolean}>} `complete` is false when
 *          the page bound stopped the read
 */
export async function fetchAllPages({ path, query = {}, itemsKey = 'items' }) {
    const rows = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
        const payload = await api.get(path, { params: { ...query, page, pageSize: EXPORT_PAGE_SIZE } });
        rows.push(...(payload?.[itemsKey] || []));
        if (!payload?.pagination?.hasMoreItems) {
            return { rows, complete: true };
        }
    }
    return { rows, complete: false };
}

/**
 * Hands a CSV text to the browser as a file.
 *
 * @param {string} filename without extension
 * @param {string} csv
 */
export function saveCsv(filename, csv) {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

/**
 * Exports rows already in hand.
 *
 * @param {Object} params
 * @param {Object[]} params.rows
 * @param {Array<{label: string, get: Function}>} params.columns from DataTable's `onExport`
 * @param {string} params.filename
 */
export function exportRows({ rows, columns, filename }) {
    saveCsv(filename, toCsv(columns.map((column) => ({ label: column.label, get: column.get })), rows));
}

/**
 * Exports every page of a list endpoint.
 *
 * @param {Object} params
 * @param {string} params.path
 * @param {Object} [params.query]
 * @param {string} [params.itemsKey]
 * @param {Array<{label: string, get: Function}>} params.columns
 * @param {string} params.filename
 * @returns {Promise<{count: number, complete: boolean}>}
 */
export async function exportList({ path, query, itemsKey, columns, filename }) {
    const { rows, complete } = await fetchAllPages({ path, query, itemsKey });
    exportRows({ rows, columns, filename });
    return { count: rows.length, complete };
}
