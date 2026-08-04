/**
 * **Historical series, through beCPG's own OLAP proxy** (spec §4.6.6).
 *
 * ## No OLAP URL, ever
 *
 * The portal holds **no Saiku address and no OLAP credentials**, and must never
 * gain any. beCPG already proxies the cube: `becpg/olap/chart` is a repository
 * webscript (`<authentication>user</authentication>`) whose `OlapServiceImpl`
 * keeps the Saiku URL server-side in `becpg.olap.url.internal`. So a call needs
 * exactly what every other adapter here already has — the beCPG base URL of the
 * session and its Alfresco ticket. One less secret, one less thing to configure
 * per tenant, and the cube inherits beCPG's authentication instead of a second
 * one.
 *
 * ## Why the MDX is built here and not received
 *
 * `becpg/olap/chart?cube=…&mdx=…` executes **arbitrary MDX**. The cube carries
 * no row-level security: one crafted query reads the whole park — every
 * supplier, every score. That is why `becpg/olap/` is deliberately **absent from
 * `ALLOWED_BECPG_PATH_PREFIXES`**: the browser-facing proxy must never reach it.
 *
 * This module is the other path. It runs server-side, calls through
 * `createBecpgClient()` (which sets `skipAllowList`), and builds every statement
 * from {@link OLAP_QUERIES} — a closed catalogue. A caller chooses a query *id*
 * and, at most, a supplier nodeRef; it never supplies MDX, a cube name, a
 * dimension or a member expression. Anything a caller does provide goes through
 * {@link quoteMember}, so a nodeRef cannot close a bracket and append a clause.
 *
 * ## Degrading
 *
 * `becpg.olap.enabled=false` is the default in beCPG, and most instances have no
 * cube at all. The webscript does not fail in that case: `runMdxQuery` throws,
 * the webscript logs and returns an **empty payload with HTTP 200**. Empty
 * metadata therefore means "no cube", not "no rows" — the two are told apart
 * here, because a monitoring screen that renders 0 % where the truth is "not
 * measured" is worse than one that says nothing (same rule as `rateUnavailable`
 * in `monitor.js`).
 *
 * Server only.
 */

import { createBecpgClient } from '@/lib/adapters/session';
import { logWarn } from '@/lib/http';

/** The repository webscript that proxies Saiku. Never called from the browser. */
const OLAP_ENDPOINT = 'becpg/olap/chart';

/**
 * The cubes this module reads, as named in `olapSchema_4_0.get.xml.ftl`.
 * @readonly
 */
export const CUBES = Object.freeze({
    PROJECTS: 'projects',
    PROJECT_STEPS: 'projectsSteps',
});

/**
 * Escapes a member value for inclusion in an MDX bracketed name.
 *
 * MDX escapes `]` by doubling it, exactly like SQL doubles a quote. A nodeRef
 * cannot contain one, but this is the only place a caller-supplied string
 * reaches a statement, so it is escaped rather than trusted.
 *
 * @param {string} value
 * @returns {string}
 */
export function quoteMember(value) {
    return String(value == null ? '' : value).replace(/]/g, ']]');
}

/**
 * The closed catalogue of statements. **Adding an entry here is the only way to
 * run a new query**, which is what keeps MDX out of the request surface.
 *
 * Each entry declares the cube, a builder taking already-validated parameters,
 * and the axes it reads, so a payload can name its own source.
 *
 * The `NON EMPTY` on rows is not cosmetic: without it a park of 300 suppliers
 * crossed with 36 months returns 10 800 mostly-empty cells.
 * @readonly
 */
export const OLAP_QUERIES = Object.freeze({
    /**
     * Answered-task quality per month: refusal rate and response delay.
     * The two measures the supplier monitoring cannot compute in real time,
     * because they are a *history*, not a current state.
     */
    supplierTaskQuality: Object.freeze({
        cube: CUBES.PROJECT_STEPS,
        axes: Object.freeze(['refusalRate', 'avgResponseDelay', 'stepsNumber']),
        /**
         * @param {Object} params
         * @param {string} [params.supplierNodeRef] restrict to one supplier
         * @returns {string} MDX
         */
        build({ supplierNodeRef } = {}) {
            const measures = '{[Measures].[refusalRate], [Measures].[avgResponseDelay], [Measures].[stepsNumber]}';
            const rows = 'NON EMPTY [tlEnd.dimdate].[Year].Members * [tlEnd.dimdate].[Month].Members';
            const slicer = supplierNodeRef
                ? ` WHERE ([suppliers].[${quoteMember(supplierNodeRef)}])`
                : '';
            return `SELECT ${measures} ON COLUMNS, ${rows} ON ROWS FROM [${CUBES.PROJECT_STEPS}]${slicer}`;
        },
    }),

    /**
     * Completion over time, per month. `averageProgress` is
     * `pjt:completionPercent`, i.e. how complete the referencing projects were.
     */
    supplierCompletion: Object.freeze({
        cube: CUBES.PROJECTS,
        axes: Object.freeze(['averageProgress', 'projectsNumber']),
        build({ supplierNodeRef } = {}) {
            const measures = '{[Measures].[averageProgress], [Measures].[projectsNumber]}';
            const rows = 'NON EMPTY [projectDateModified.dimdate].[Year].Members * [projectDateModified.dimdate].[Month].Members';
            const slicer = supplierNodeRef
                ? ` WHERE ([suppliers].[${quoteMember(supplierNodeRef)}])`
                : '';
            return `SELECT ${measures} ON COLUMNS, ${rows} ON ROWS FROM [${CUBES.PROJECTS}]${slicer}`;
        },
    }),

    /**
     * The park compared: one row per supplier, the same three measures. This is
     * the multi-supplier comparison of §4.6.5 — the one thing db-afts cannot do
     * without reading every project of every supplier.
     */
    supplierComparison: Object.freeze({
        cube: CUBES.PROJECT_STEPS,
        axes: Object.freeze(['refusalRate', 'avgResponseDelay', 'stepsNumber']),
        build() {
            const measures = '{[Measures].[refusalRate], [Measures].[avgResponseDelay], [Measures].[stepsNumber]}';
            return `SELECT ${measures} ON COLUMNS,`
                + ' NON EMPTY [suppliers].[name].Members ON ROWS'
                + ` FROM [${CUBES.PROJECT_STEPS}]`;
        },
    }),
});

/**
 * Turns beCPG's `{ metadatas, resultsets }` into rows of named values.
 *
 * `metadatas` is `[{colIndex, colType, colName}]` and `resultsets` is a list of
 * positional arrays — the leading columns are the row headers (the dimension
 * members), the trailing ones the measures. Names are taken from the metadata
 * rather than assumed, so a schema that reorders its measures does not silently
 * shift the values by one column.
 *
 * @param {Object} payload the webscript answer
 * @returns {{columns: Array<{name: string, type: ?string}>, rows: Array<Object>}}
 */
export function normalizeChartData(payload) {
    const metadatas = Array.isArray(payload?.metadatas) ? payload.metadatas : [];
    const resultsets = Array.isArray(payload?.resultsets) ? payload.resultsets : [];

    const columns = metadatas
        .slice()
        .sort((a, b) => Number(a.colIndex) - Number(b.colIndex))
        .map((column) => ({
            name: column.colName || `col${column.colIndex}`,
            type: column.colType || null,
        }));

    const rows = resultsets.map((values) => {
        const row = {};
        const list = Array.isArray(values) ? values : [];
        // Positional: `resultsets` rows align with `metadatas` from the right,
        // because beCPG drops the highest row-header level (`shiftMetadata`).
        const offset = Math.max(0, columns.length - list.length);
        list.forEach((value, index) => {
            const column = columns[index + offset];
            if (column) {
                row[column.name] = value;
            }
        });
        return row;
    });

    return { columns, rows };
}

/**
 * Runs one catalogued query.
 *
 * **Never throws.** An instance without a cube is the common case, not an
 * incident: the answer is `{ available: false, reason }` and the caller renders
 * the current values alone. `reason` distinguishes the three ways it can be
 * absent, because "no cube installed" and "the cube refused this session" call
 * for different actions from whoever reads the logs.
 *
 * @param {Object} params
 * @param {Object} params.session the portal session
 * @param {string} params.queryId a key of {@link OLAP_QUERIES}
 * @param {string} [params.supplierNodeRef] restrict to one supplier
 * @returns {Promise<{available: boolean, reason: ?string, queryId: string, cube: ?string,
 *   columns: Array<Object>, rows: Array<Object>}>}
 */
export async function runOlapQuery({ session, queryId, supplierNodeRef = null } = {}) {
    const query = OLAP_QUERIES[queryId];
    const empty = { queryId, cube: query ? query.cube : null, columns: [], rows: [] };

    if (!query) {
        // A caller asking for an unknown id is a portal bug, not a cube state.
        return { ...empty, available: false, reason: 'unknownQuery' };
    }

    let payload;
    try {
        payload = await createBecpgClient(session).getJson(OLAP_ENDPOINT, {
            query: { cube: query.cube, mdx: query.build({ supplierNodeRef }) },
        });
    }
    catch (error) {
        logWarn('olap.unreachable', { queryId, message: error.message, status: error.status });
        return {
            ...empty,
            available: false,
            reason: error?.status === 401 || error?.status === 403 ? 'denied' : 'unreachable',
        };
    }

    const { columns, rows } = normalizeChartData(payload);
    // The webscript answers 200 with an empty body when Saiku is absent or the
    // MDX failed — it catches and logs on its side. No column at all is that
    // case; no row with columns present is a genuine "nothing to report".
    if (columns.length === 0) {
        return { ...empty, available: false, reason: 'noCube' };
    }

    return { ...empty, available: true, reason: null, columns, rows };
}
