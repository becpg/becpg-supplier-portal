/**
 * **Historical series, through beCPG's own OLAP proxy** (spec §4.6.6).
 *
 * ## No OLAP URL, ever
 *
 * The portal holds **no Saiku address and no OLAP credentials**, and must never
 * gain any. beCPG already proxies the cube: `becpg/olap/chart` is a repository
 * webscript (`<authentication>user</authentication>`) whose `OlapServiceImpl`
 * keeps the Saiku URL server-side in `becpg.olap.url.internal`. A call needs
 * exactly what every other adapter here already has — the beCPG base URL of the
 * session and its Alfresco ticket.
 *
 * ## Why the MDX is built here and not received
 *
 * `becpg/olap/chart?cube=…&mdx=…` executes **arbitrary MDX**, and the cube has no
 * row-level security: one crafted query reads the whole park. That is why
 * `becpg/olap/` is deliberately **absent from `ALLOWED_BECPG_PATH_PREFIXES`** —
 * the browser-facing proxy answers 403. This module is the only way in: it runs
 * server-side, and builds every statement from {@link OLAP_QUERIES}, a closed
 * catalogue. A caller chooses a query *id* and, at most, a supplier nodeRef.
 *
 * ## Three traps, all measured on dev.becpg.fr
 *
 * 1. **A failed MDX is indistinguishable from a missing cube.** Saiku answers
 *    `{"cellset": null}`, `OlapServiceImpl` logs `Incorrect data return by saiku`
 *    and the webscript returns an **empty body with HTTP 200**. The portal sees
 *    the same thing whether the cube is absent, the statement is wrong or a
 *    measure does not exist. Hence `reason: 'noData'` and not a confident
 *    "no cube" — the beCPG log is the only place that knows which it was. Every
 *    statement below was therefore run against the real cube before landing.
 * 2. **No crossjoin on rows.** `OlapServiceImpl.runMdxQuery` flattens the cellset
 *    and `shiftMetadata()` drops the *outer* row-header level: a
 *    `CROSSJOIN(year, state)` came back with the state and the measures, and the
 *    year silently gone. Every query below puts a single level on rows.
 * 3. **Numbers come back formatted, and that corrupts them.** `OlapServiceImpl`
 *    reads Saiku's *display* value (`/result/cheat` → `{"value": "1.148"}`) and
 *    `OlapUtils.convert` parses it with `Double.parseDouble`: 1 148 tasks become
 *    **1.148**. Every count of a thousand or more is wrong, and no consumer can
 *    tell — `19.468` really is an average duration of 19.468. The portal
 *    therefore publishes `values.reliable: false` and **refuses to derive any
 *    figure** from these rows (see `summarizeTaskStates`, kept but unused): a
 *    refusal rate computed from them read 97 % where the truth is near 3.5 %.
 *    Fixing this belongs in beCPG — reading Saiku's raw value rather than its
 *    formatted one — not in a portal heuristic, because `1.148` is genuinely
 *    ambiguous once it has been stringified.
 * 4. **Members are addressed by name, not by key.** The supplier level is
 *    `column="nodeRef" nameColumn="name"`, so `[suppliers].[name].&[workspace://…]`
 *    resolves to nothing while `[suppliers].[name].[Chez Rémi …]` returns the
 *    row. Callers still pass a nodeRef — {@link resolveSupplierName} turns it
 *    into the name server-side, so no free-text ever reaches a statement.
 *
 * ## What the deployed cube can and cannot do
 *
 * The `suppliers` dimension exists today on `products` and `incidents`, **not**
 * on `projects` / `projectsSteps` — it is added there by the schema change that
 * ships with this ticket. Until that is deployed, the task and completion series
 * are park-wide: asked for one supplier they answer `supplierAxisUnavailable`
 * rather than silently returning the whole park under a supplier's name.
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
    INCIDENTS: 'incidents',
});

/**
 * Escapes a member value for an MDX bracketed name.
 *
 * MDX escapes `]` by doubling it, as SQL doubles a quote. Supplier names are
 * free text typed by a user and *can* contain one, so this is not theoretical:
 * it is the one place a repository string reaches a statement.
 *
 * @param {string} value
 * @returns {string}
 */
export function quoteMember(value) {
    return String(value == null ? '' : value).replace(/]/g, ']]');
}

/**
 * The closed catalogue. **Adding an entry here is the only way to run a new
 * query.** Each statement was executed against dev.becpg.fr; the row counts in
 * the comments are what it returned.
 *
 * `supplierScope` says how a query narrows to one supplier:
 *   - `'slicer'` — a `WHERE` clause on `[suppliers]`, and the row axis changes
 *     because MDX forbids slicing a dimension that is already on rows;
 *   - `'none'` — the cube has no supplier axis for this fact yet.
 * @readonly
 */
export const OLAP_QUERIES = Object.freeze({
    /**
     * Task volume and real duration per year — the evolution over time that
     * db-afts cannot produce without reading every task of every project.
     * dev: 11 rows, from 2019.
     */
    taskTrend: Object.freeze({
        cube: CUBES.PROJECT_STEPS,
        supplierScope: 'none',
        measures: Object.freeze(['stepsNumber', 'averageActualDurations']),
        build() {
            return 'SELECT {[Measures].[stepsNumber], [Measures].[averageActualDurations]} ON COLUMNS,'
                + ' NON EMPTY [tlEnd.date].[Year].Members ON ROWS'
                + ` FROM [${CUBES.PROJECT_STEPS}]`;
        },
    }),

    /**
     * Task distribution by state. The refusal rate is derived from it by
     * {@link summarizeTaskStates} rather than read from the cube: the native
     * `refusalRate` measure ships with this ticket's schema change and is not
     * deployed yet, while this query works on every existing instance.
     * dev: 6 rows (Annulé, Terminé, Refusé, …).
     */
    taskStates: Object.freeze({
        cube: CUBES.PROJECT_STEPS,
        supplierScope: 'none',
        measures: Object.freeze(['stepsNumber']),
        build() {
            return 'SELECT {[Measures].[stepsNumber]} ON COLUMNS,'
                + ' NON EMPTY [taskState].[tlState].Members ON ROWS'
                + ` FROM [${CUBES.PROJECT_STEPS}]`;
        },
    }),

    /**
     * Average project completion per year — the completeness measure of §4.6.6.
     * dev: 3 rows.
     */
    completion: Object.freeze({
        cube: CUBES.PROJECTS,
        supplierScope: 'none',
        measures: Object.freeze(['averageProgress', 'projectsNumber']),
        build() {
            return 'SELECT {[Measures].[averageProgress], [Measures].[projectsNumber]} ON COLUMNS,'
                + ' NON EMPTY [projectDateModified.date].[Year].Members ON ROWS'
                + ` FROM [${CUBES.PROJECTS}]`;
        },
    }),

    /**
     * Non-conformities per supplier — the multi-supplier comparison of §4.6.5,
     * on the one fact where the deployed cube already carries the supplier axis.
     * dev: 18 suppliers park-wide; filtered, the claim types of that supplier.
     */
    supplierIncidents: Object.freeze({
        cube: CUBES.INCIDENTS,
        supplierScope: 'slicer',
        measures: Object.freeze(['noderef']),
        /**
         * @param {Object} params
         * @param {string} [params.supplierName] resolved server-side, never received
         * @returns {string} MDX
         */
        build({ supplierName } = {}) {
            // Rows carry the suppliers when comparing the park; when one supplier
            // is sliced they must carry something else, since MDX cannot put a
            // dimension on rows and in the WHERE clause at once.
            if (supplierName) {
                return 'SELECT {[Measures].DefaultMember} ON COLUMNS,'
                    + ' NON EMPTY [incidentType].Members ON ROWS'
                    + ` FROM [${CUBES.INCIDENTS}]`
                    + ` WHERE ([suppliers].[name].[${quoteMember(supplierName)}])`;
            }
            return 'SELECT {[Measures].DefaultMember} ON COLUMNS,'
                + ' NON EMPTY [suppliers].[name].Members ON ROWS'
                + ` FROM [${CUBES.INCIDENTS}]`;
        },
    }),
});

/**
 * Turns beCPG's `{ metadatas, resultsets }` into rows of named values.
 *
 * `metadatas` is `[{colIndex, colType, colName}]`, `resultsets` a list of
 * positional arrays. Names come from the metadata rather than being assumed, and
 * the alignment is computed **from the right**: `shiftMetadata()` can drop a
 * leading row-header, so a left-aligned read would shift every measure by one
 * column.
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
 * The refusal rate, derived from the `taskStates` rows.
 *
 * **Not called today**: the counts it would divide are corrupted by beCPG's
 * formatted values (trap 3 in the header). Kept because the definition is the
 * part that took the arbitration, and because it becomes correct the moment the
 * repository returns raw values — or the moment the native `refusalRate` measure
 * of the schema change is deployed, which is the better fix.
 *
 * Refused over **answered** — refused plus completed — and not over every task:
 * a planned or in-progress task has not been refused and must not dilute the
 * rate. Same definition as the `refusalRate` member added to the schema, so the
 * figure does not move when that measure becomes available.
 *
 * Matching is on the state *caption* (the cube formats `Refused` to the tenant's
 * label through a `MemberFormatter`), so both the raw state and the French and
 * English labels are accepted rather than a single spelling.
 *
 * @param {Array<Object>} rows rows of the `taskStates` query
 * @param {string} stateColumn name of the state column, from the metadata
 * @param {string} countColumn name of the measure column
 * @returns {{refused: number, completed: number, rate: number|null}}
 */
export function summarizeTaskStates(rows, stateColumn, countColumn) {
    const REFUSED = ['refused', 'refusé', 'refusée', 'refuse'];
    const COMPLETED = ['completed', 'terminé', 'terminée', 'termine'];

    let refused = 0;
    let completed = 0;
    for (const row of Array.isArray(rows) ? rows : []) {
        const label = String(row[stateColumn] ?? '').trim().toLowerCase();
        const count = Number(row[countColumn]) || 0;
        if (REFUSED.includes(label)) {
            refused += count;
        }
        else if (COMPLETED.includes(label)) {
            completed += count;
        }
    }
    const answered = refused + completed;
    // `null`, not 0: a park where nothing has been answered has no refusal rate,
    // and publishing 0 % would read as "nobody ever refuses".
    return { refused, completed, rate: answered > 0 ? refused / answered : null };
}

/**
 * Reads a supplier's `cm:name`, the only form the cube can address.
 *
 * The public contract stays on nodeRefs — a name is neither stable nor unique,
 * and accepting one from the browser would put free text in an MDX statement.
 * A supplier that cannot be read yields `null`, and the caller degrades instead
 * of querying the whole park under that supplier's name.
 *
 * @param {Object} client an authenticated beCPG client
 * @param {string} nodeRef
 * @returns {Promise<string|null>}
 */
export async function resolveSupplierName(client, nodeRef) {
    try {
        const payload = await client.getJson('becpg/remote/entity', {
            query: { nodeRef, lists: 'none', fields: 'cm:name' },
        });
        const entity = payload?.entity || payload;
        return entity?.['cm:name'] || entity?.name || entity?.attributes?.['cm:name'] || null;
    }
    catch (error) {
        logWarn('olap.supplierUnresolved', { nodeRef: String(nodeRef).slice(-36), message: error.message });
        return null;
    }
}

/**
 * Runs one catalogued query.
 *
 * **Never throws.** `reason` distinguishes what the portal can actually tell
 * apart:
 *   - `unknownQuery` — a portal bug, not a cube state;
 *   - `denied` / `unreachable` — beCPG refused or did not answer;
 *   - `supplierAxisUnavailable` — one supplier asked of a fact whose cube has no
 *     supplier axis yet;
 *   - `supplierUnresolved` — the supplier could not be read, so it cannot be named;
 *   - `noData` — an empty 200. Missing cube, failed statement and genuinely empty
 *     result are **the same answer** on the wire (see the header); the beCPG log
 *     is where the difference is recorded.
 *
 * @param {Object} params
 * @param {Object} params.session the portal session
 * @param {string} params.queryId a key of {@link OLAP_QUERIES}
 * @param {string} [params.supplierNodeRef] restrict to one supplier
 * @returns {Promise<Object>}
 */
export async function runOlapQuery({ session, queryId, supplierNodeRef = null } = {}) {
    const query = OLAP_QUERIES[queryId];
    const base = {
        queryId,
        cube: query ? query.cube : null,
        supplierScope: null,
        columns: [],
        rows: [],
        summary: null,
        values: null,
    };

    if (!query) {
        return { ...base, available: false, reason: 'unknownQuery' };
    }
    base.supplierScope = query.supplierScope;

    if (supplierNodeRef && query.supplierScope === 'none') {
        return { ...base, available: false, reason: 'supplierAxisUnavailable' };
    }

    const client = createBecpgClient(session);

    let supplierName = null;
    if (supplierNodeRef) {
        supplierName = await resolveSupplierName(client, supplierNodeRef);
        if (!supplierName) {
            return { ...base, available: false, reason: 'supplierUnresolved' };
        }
    }

    let payload;
    try {
        payload = await client.getJson(OLAP_ENDPOINT, {
            query: { cube: query.cube, mdx: query.build({ supplierName }) },
        });
    }
    catch (error) {
        logWarn('olap.unreachable', { queryId, message: error.message, status: error.status });
        return {
            ...base,
            available: false,
            reason: error?.status === 401 || error?.status === 403 ? 'denied' : 'unreachable',
        };
    }

    const { columns, rows } = normalizeChartData(payload);
    if (columns.length === 0) {
        return { ...base, available: false, reason: 'noData' };
    }

    // No derived figure while the values are formatted (trap 3): a rate computed
    // from a corrupted count is exactly the kind of number the monitoring must
    // not publish, and it is the same rule as `rateUnavailable` in monitor.js.
    return {
        ...base,
        available: true,
        reason: null,
        columns,
        rows,
        summary: null,
        values: {
            reliable: false,
            issue: 'formattedNumbers',
            detail: 'beCPG returns Saiku display values: a count of 1000 or more comes back'
                + ' as a decimal (1148 → 1.148). Counts below 1000 and non-numeric cells are exact.',
        },
    };
}
