/**
 * The monitoring cockpit: every aggregate the five tabs of `/monitor` draw, in one
 * payload (`GET /api/v1/monitor/cockpit`).
 *
 * Nothing here queries the repository on its own. The cockpit composes the
 * adapters the other monitoring screens already use - the overview, the supplier
 * list, the quality list, the document matrix and the OLAP catalogue - and folds
 * their rows into chart-ready counts. A figure on the cockpit and the same figure
 * on the screen it drills into therefore come from one computation.
 *
 * Each block degrades on its own: a read that fails answers
 * `{ available: false, reason }` and the other blocks are still served. Nothing is
 * ever filled in to make a chart look complete.
 *
 * Server only.
 */

import {
    buildDocumentMatrix,
    buildOverview,
    listMonitoredSuppliers,
    listQuality,
    requireMonitorAccess,
} from '@/lib/adapters/monitor';
import { OLAP_QUERIES, runOlapQuery } from '@/lib/adapters/olap';
import { logWarn } from '@/lib/http';

/** Weights of the park health index, as validated by the product owner. */
export const HEALTH_WEIGHTS = Object.freeze({
    approval: 0.35,
    compliance: 0.35,
    response: 0.2,
    noBlockingNc: 0.1,
});

/** Approval statuses, most severe last - the order every cockpit chart stacks them in. */
export const APPROVAL_ORDER = Object.freeze(['approved', 'inProgress', 'toRenew', 'suspended']);

/** Age buckets of the open non-conformities, upper bound in months (exclusive). */
export const NC_AGE_BUCKETS = Object.freeze([
    { key: 'under3Months', below: 3 },
    { key: 'from3To12Months', below: 12 },
    { key: 'from1To2Years', below: 24 },
    { key: 'over2Years', below: Infinity },
]);

/** Document statuses of the matrix, as `documentConfig().statusOrder` names them. */
export const DOCUMENT_STATUSES = Object.freeze(['valid', 'expiring', 'toValidate', 'expired', 'refused', 'missing']);

/** A document type whose label names a certificate. */
const CERTIFICATE_TYPE = /certifica/i;

/** A document type whose label names the supplier technical sheet. */
const TECHNICAL_SHEET_TYPE = /fiche\s+technique|technical\s+(data\s+)?sheet/i;

/** Normalised cube captions of the task states, raw value and the French and English labels. */
const TASK_STATE_CAPTIONS = Object.freeze({
    planned: ['planned', 'planifie', 'planifiee', 'a faire'],
    inProgress: ['inprogress', 'in progress', 'en cours'],
    completed: ['completed', 'termine', 'terminee'],
    cancelled: ['cancelled', 'canceled', 'annule', 'annulee'],
    refused: ['refused', 'refuse', 'refusee'],
    onHold: ['onhold', 'on hold', 'en attente', 'suspendu'],
});

/** Measures read from each OLAP series, by the id the cube names them with. */
const OLAP_SERIES = Object.freeze({
    taskTrend: ['stepsNumber', 'avgResponseDelay'],
    taskStates: ['stepsNumber'],
    completion: ['averageProgress', 'projectsNumber'],
});

/** Rules of the weekly priorities: a supplier qualifies with this many missing documents. */
const PRIORITY_MISSING_DOCUMENTS = 5;
/** Most entries the weekly priorities list. */
const PRIORITY_LIMIT = 6;

/** Page size used to walk the paged monitoring lists (their own ceiling). */
const LIST_PAGE_SIZE = 100;
/** Most pages a walk may read: 250 rows is the scan window, so 3 pages hold it. */
const MAX_LIST_PAGES = 10;

/* -------------------------------------------------------------------------- */
/* Pure aggregation helpers                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A rate in percent, or `null` when the denominator is empty or unknown.
 *
 * @param {number} part
 * @param {number} whole
 * @returns {number|null}
 */
export function percent(part, whole) {
    if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) {
        return null;
    }
    return Math.round((part / whole) * 100);
}

/**
 * The park health index: 35 % approval rate, 35 % document compliance, 20 %
 * response rate, 10 % share of suppliers without a blocking NC.
 *
 * An input that is `null` is left out and the remaining weights are renormalised;
 * the result then says `partial: true` and names what is missing. With no input
 * at all there is no index - `value: null`, never a 0.
 *
 * @param {{approval: ?number, compliance: ?number, response: ?number,
 *          noBlockingNc: ?number}} inputs rates in percent (0-100) or `null`
 * @returns {{available: boolean, value: number|null, partial: boolean,
 *            missing: string[], inputs: Object, weights: Object}}
 */
export function computeHealthIndex(inputs) {
    const keys = Object.keys(HEALTH_WEIGHTS);
    const present = keys.filter((key) => Number.isFinite(inputs?.[key]));
    const missing = keys.filter((key) => !present.includes(key));
    const weight = present.reduce((sum, key) => sum + HEALTH_WEIGHTS[key], 0);
    const value = weight > 0
        ? Math.round(present.reduce((sum, key) => sum + inputs[key] * HEALTH_WEIGHTS[key], 0) / weight)
        : null;
    return {
        available: value !== null,
        value,
        partial: value !== null && missing.length > 0,
        missing,
        inputs: Object.fromEntries(keys.map((key) => [key, present.includes(key) ? inputs[key] : null])),
        weights: { ...HEALTH_WEIGHTS },
    };
}

/**
 * Anomalies of a supplier row: missing and expired documents plus blocking NCs.
 *
 * @param {Object} row a `listMonitoredSuppliers` row
 * @returns {number}
 */
export function anomaliesOf(row) {
    const metrics = row?.metrics || {};
    return (metrics.documentsMissing || 0) + (metrics.documentsExpired || 0) + (metrics.openNc || 0);
}

/**
 * The risk map: one point per supplier whose risk score is above zero.
 *
 * @param {Object[]} rows `listMonitoredSuppliers` rows
 * @returns {Array<{nodeRef: string, name: string, href: string, status: string,
 *                  openProjects: number, score: number, level: string,
 *                  anomalies: number}>}
 */
export function riskPoints(rows) {
    return (rows || [])
        .filter((row) => (row?.risk?.score || 0) > 0)
        .map((row) => ({
            nodeRef: row.nodeRef,
            name: row.name,
            href: row.href,
            status: row.approval?.status || null,
            openProjects: row.metrics?.openProjects || 0,
            score: row.risk.score,
            level: row.risk.level,
            anomalies: anomaliesOf(row),
        }));
}

/** Counts per approval status, every status present even at zero. */
function emptyStatusCounts() {
    return Object.fromEntries(APPROVAL_ORDER.map((status) => [status, 0]));
}

/** The key and label of a family reference; a row without one is grouped under `''`. */
function hierarchyEntry(ref) {
    return { key: ref?.nodeRef || '', label: ref?.label || null };
}

/** Finds or creates the child of `parent.children` under `entry.key`. */
function childOf(parent, entry) {
    let child = parent.children.get(entry.key);
    if (!child) {
        child = { ...entry, total: 0, byStatus: emptyStatusCounts(), children: new Map() };
        parent.children.set(entry.key, child);
    }
    return child;
}

/** A tree node with its children as a sorted array, biggest first. */
function freezeNode(node) {
    const children = [...node.children.values()]
        .sort((a, b) => (b.total - a.total) || String(a.label ?? '').localeCompare(String(b.label ?? '')))
        .map(freezeNode);
    const { key, label, total, byStatus } = node;
    return children.length > 0 ? { key, label, total, byStatus, children } : { key, label, total, byStatus };
}

/**
 * The park as a family, sub-family, approval status tree.
 *
 * `label: null` is a supplier with no family (or no sub-family): the screen names
 * it, the data does not invent one.
 *
 * @param {Object[]} rows `listMonitoredSuppliers` rows
 * @returns {Array<{key: string, label: ?string, total: number, byStatus: Object,
 *                  children: Array<{key: string, label: ?string, total: number,
 *                  byStatus: Object}>}>}
 */
export function familyTree(rows) {
    const root = { children: new Map() };
    for (const row of rows || []) {
        const status = row?.approval?.status;
        const family = childOf(root, hierarchyEntry(row?.family));
        const subFamily = childOf(family, hierarchyEntry(row?.subFamily));
        for (const node of [family, subFamily]) {
            node.total += 1;
            if (node.byStatus[status] !== undefined) {
                node.byStatus[status] += 1;
            }
        }
    }
    return freezeNode(root).children || [];
}

/**
 * Suppliers per month of last activity (`cm:modified`), oldest month first.
 *
 * @param {Object[]} rows rows carrying `lastActivity`
 * @returns {{months: Array<{month: string, count: number}>, undated: number}}
 */
export function lastActivityMonths(rows) {
    const counts = new Map();
    let undated = 0;
    for (const row of rows || []) {
        const date = row?.lastActivity ? new Date(row.lastActivity) : null;
        if (!date || Number.isNaN(date.getTime())) {
            undated += 1;
            continue;
        }
        const month = date.toISOString().slice(0, 7);
        counts.set(month, (counts.get(month) || 0) + 1);
    }
    const months = [...counts.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }));
    return { months, undated };
}

/**
 * The first day of the quarter before the one `now` falls in, at 00:00 UTC.
 *
 * @param {Date} now
 * @returns {Date}
 */
export function startOfPreviousQuarter(now) {
    const quarterStart = Math.floor(now.getUTCMonth() / 3) * 3;
    return new Date(Date.UTC(now.getUTCFullYear(), quarterStart - 3, 1));
}

/**
 * Suppliers whose last activity is on or after `since`.
 *
 * @param {Object[]} rows rows carrying `lastActivity`
 * @param {Date} since
 * @returns {number}
 */
export function countActiveSince(rows, since) {
    return (rows || []).filter((row) => {
        const time = row?.lastActivity ? new Date(row.lastActivity).getTime() : NaN;
        return Number.isFinite(time) && time >= since.getTime();
    }).length;
}

/**
 * Whole calendar months between two dates, the day of the month included.
 *
 * @param {Date} from
 * @param {Date} to
 * @returns {number}
 */
export function monthsBetween(from, to) {
    const months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
    return to.getUTCDate() < from.getUTCDate() ? months - 1 : months;
}

/**
 * Open non-conformities by age, blocking and non-blocking apart.
 *
 * A closed NC is ignored; an NC without a creation date cannot be aged and is
 * counted in `undated` rather than in a bucket.
 *
 * @param {Object[]} rows `listQuality` rows (`createdAt`, `blocking`, `isClosed`)
 * @param {Date} now
 * @returns {{buckets: Array<{key: string, blocking: number, nonBlocking: number}>,
 *            undated: number, total: number}}
 */
export function ncAgingBuckets(rows, now) {
    const buckets = NC_AGE_BUCKETS.map(({ key }) => ({ key, blocking: 0, nonBlocking: 0 }));
    let undated = 0;
    let total = 0;
    for (const row of rows || []) {
        if (!row || row.isClosed) {
            continue;
        }
        total += 1;
        const created = row.createdAt ? new Date(row.createdAt) : null;
        if (!created || Number.isNaN(created.getTime())) {
            undated += 1;
            continue;
        }
        const age = Math.max(0, monthsBetween(created, now));
        const bucket = buckets[NC_AGE_BUCKETS.findIndex((entry) => age < entry.below)];
        bucket[row.blocking ? 'blocking' : 'nonBlocking'] += 1;
    }
    return { buckets, undated, total };
}

/** Counts per document status, every status present even at zero. */
function emptyDocumentCounts() {
    return Object.fromEntries(DOCUMENT_STATUSES.map((status) => [status, 0]));
}

/**
 * Cells of the document matrix counted per document type and status.
 *
 * A cell is the worst document of one type for one supplier, so `expected` is
 * the number of suppliers the type applies to.
 *
 * @param {Array<{nodeRef: string, label: string}>} columns matrix columns
 * @param {Array<{cells: Object}>} rows matrix rows
 * @returns {Array<{nodeRef: string, label: string, expected: number, counts: Object}>}
 *   most expected first
 */
export function documentTypeCounts(columns, rows) {
    const byType = new Map((columns || []).map((column) => [column.nodeRef, {
        nodeRef: column.nodeRef,
        label: column.label,
        expected: 0,
        counts: emptyDocumentCounts(),
    }]));
    for (const row of rows || []) {
        for (const [typeRef, cell] of Object.entries(row?.cells || {})) {
            const entry = byType.get(typeRef);
            if (!entry || entry.counts[cell?.status] === undefined) {
                continue;
            }
            entry.expected += 1;
            entry.counts[cell.status] += 1;
        }
    }
    return [...byType.values()]
        .sort((a, b) => (b.expected - a.expected) || String(a.label).localeCompare(String(b.label)));
}

/**
 * The document types whose label matches, summed.
 *
 * @param {Object[]} types {@link documentTypeCounts} entries
 * @param {RegExp} pattern
 * @returns {{available: boolean, reason: ?string, types: Array<{label: string,
 *            expected: number}>, expected: number, counts: Object}}
 */
export function summarizeDocumentTypes(types, pattern) {
    const matching = (types || []).filter((type) => pattern.test(String(type.label || '')));
    const counts = emptyDocumentCounts();
    for (const type of matching) {
        for (const status of DOCUMENT_STATUSES) {
            counts[status] += type.counts[status] || 0;
        }
    }
    return {
        available: matching.length > 0,
        reason: matching.length > 0 ? null : 'noMatchingDocumentType',
        types: matching.map((type) => ({ label: type.label, expected: type.expected })),
        expected: matching.reduce((sum, type) => sum + type.expected, 0),
        counts,
    };
}

/**
 * A cube value as a number. The webscript may hand back formatted text
 * ("1 234,5"), so separators are read rather than trusted.
 *
 * @param {*} value
 * @returns {number|null}
 */
export function cubeNumber(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value !== 'string' || value.trim() === '') {
        return null;
    }
    const parsed = Number(value.replace(/[\s  ]/g, '').replace(/%$/, '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
}

/**
 * The column of a measure. The cube names its columns with translated captions
 * ("Nombre de tâches" for `stepsNumber`), so the id rarely appears in them: the
 * column is found by the measure's position in the query, which lists its
 * measures in the order the columns come back, and by its id only when the
 * column count does not match that order.
 *
 * @param {Array<{name: string}>} columns the result's columns, the period first
 * @param {string} measure
 * @param {string[]} queryMeasures the measures of the MDX, in order
 * @returns {{name: string}|undefined}
 */
function measureColumn(columns, measure, queryMeasures = []) {
    const values = (columns || []).slice(1);
    const position = queryMeasures.indexOf(measure);
    if (position >= 0 && values.length === queryMeasures.length) {
        return values[position];
    }
    return values.find((column) => String(column.name).toLowerCase().includes(measure.toLowerCase()));
}

/**
 * An OLAP result reduced to labelled points.
 *
 * @param {Object} result a `runOlapQuery` answer
 * @param {string[]} measures measure ids to read
 * @param {string[]} [queryMeasures] the measures of the query, in column order
 * @returns {{available: boolean, reason: ?string,
 *            points: Array<{label: string, values: Object.<string, ?number>}>}}
 */
export function toOlapSeries(result, measures, queryMeasures = []) {
    if (!result?.available || (result.columns || []).length < 2) {
        return { available: false, reason: result?.reason || 'noData', points: [] };
    }
    const period = result.columns[0].name;
    const columns = Object.fromEntries(measures.map((measure) => [measure, measureColumn(result.columns, measure, queryMeasures)]));
    const points = (result.rows || []).map((row) => ({
        label: String(row[period] ?? ''),
        values: Object.fromEntries(measures.map((measure) => [
            measure,
            columns[measure] ? cubeNumber(row[columns[measure].name]) : null,
        ])),
    }));
    return { available: true, reason: null, points };
}

/** A caption lowercased, without accents or underscores. */
function normalizeCaption(value) {
    return String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/_/g, ' ').trim().toLowerCase();
}

/**
 * The portal state key of a cube task-state caption, or `null` when unknown.
 *
 * @param {string} caption
 * @returns {string|null}
 */
export function taskStateKey(caption) {
    const normalized = normalizeCaption(caption);
    const match = Object.entries(TASK_STATE_CAPTIONS)
        .find(([, captions]) => captions.includes(normalized) || captions.includes(normalized.replace(/\s/g, '')));
    return match ? match[0] : null;
}

/**
 * The `taskStates` series with a state key on every point.
 *
 * @param {Object} series {@link toOlapSeries} of `taskStates`
 * @returns {Object} the same series; each point gains `state` and `count`
 */
export function classifyTaskStates(series) {
    if (!series.available) {
        return series;
    }
    return {
        ...series,
        points: series.points.map((point) => ({
            ...point,
            state: taskStateKey(point.label),
            count: point.values.stepsNumber,
        })),
    };
}

/** The reasons of a risk entry without the per-campaign detail. */
function compactReasons(reasons) {
    return (reasons || []).map(({ code, count, score }) => ({ code, count, score }));
}

/** The rule a supplier matches, or `null`. */
function priorityRule(row) {
    const reasons = row?.risk?.reasons || [];
    const has = (code, atLeast = 1) => reasons.some((reason) => reason.code === code && (reason.count || 0) >= atLeast);
    if (row?.risk?.level === 'critical' && has('blockingNc')) {
        return { kind: 'escalate', action: 'escalate' };
    }
    if (has('documentExpired') || has('documentMissing', PRIORITY_MISSING_DOCUMENTS) || has('campaignNoAnswer')) {
        return { kind: 'remind', action: 'remind' };
    }
    return null;
}

/**
 * The priorities of the week, derived by rule from the riskiest suppliers.
 *
 * A critical supplier with a blocking NC is to escalate; an expired document,
 * five missing ones or a project left without answer is to remind. The action is
 * kept only when the supplier's own risk offers it. Rules, not a model.
 *
 * @param {Object[]} rows `listMonitoredSuppliers` rows, riskiest first
 * @param {number} [limit]
 * @returns {Array<{nodeRef: string, name: string, href: string, kind: string,
 *                  action: ?string, score: number, level: string,
 *                  reasons: Object[], approval: Object}>}
 */
export function weeklyPriorities(rows, limit = PRIORITY_LIMIT) {
    const items = [];
    for (const row of rows || []) {
        const rule = priorityRule(row);
        if (!rule) {
            continue;
        }
        items.push({
            nodeRef: row.nodeRef,
            name: row.name,
            href: row.href,
            kind: rule.kind,
            action: (row.risk.actions || []).includes(rule.action) ? rule.action : null,
            score: row.risk.score,
            level: row.risk.level,
            reasons: compactReasons(row.risk.reasons),
            approval: { status: row.approval?.status || null, statusLabel: row.approval?.statusLabel || null },
        });
        if (items.length >= limit) {
            break;
        }
    }
    return items;
}

/* -------------------------------------------------------------------------- */
/* Repository reads                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The repository status of a failure, in the vocabulary the screen translates.
 * Never the upstream message, which can carry a webscript URL.
 */
function unavailableReason(error) {
    if (error?.status === 401 || error?.status === 403) {
        return 'denied';
    }
    return error?.status === 404 ? 'notFound' : 'unavailable';
}

/**
 * Runs one read without letting it sink the other blocks.
 *
 * @param {string} block name, for the log
 * @param {Function} read returns a promise
 * @returns {Promise<{ok: boolean, value?: *, reason?: string}>}
 */
async function settle(block, read) {
    try {
        return { ok: true, value: await read() };
    }
    catch (error) {
        logWarn('cockpit.blockUnavailable', { block, status: error.status, message: error.message });
        return { ok: false, reason: unavailableReason(error) };
    }
}

/**
 * Every open NC of the perimeter, walking the quality list page by page.
 *
 * @param {Object} params `{ session, filters, lang, refresh }`
 * @returns {Promise<{rows: Object[], truncated: boolean}>}
 */
async function readOpenNonConformities(params) {
    const rows = [];
    let truncated = false;
    for (let page = 1; page <= MAX_LIST_PAGES; page += 1) {
        const result = await listQuality({ ...params, page, pageSize: LIST_PAGE_SIZE });
        rows.push(...result.items);
        truncated = truncated || result.pagination.truncated === true;
        if (!result.pagination.hasMoreItems) {
            return { rows, truncated };
        }
    }
    return { rows, truncated: true };
}

/** The OLAP series of the cockpit, each with its own `available`. */
async function readHistory(session) {
    const ids = Object.keys(OLAP_SERIES);
    const results = await Promise.all(ids.map((queryId) => runOlapQuery({ session, queryId })));
    const series = Object.fromEntries(ids.map((id, index) => [
        id,
        toOlapSeries(results[index], OLAP_SERIES[id], OLAP_QUERIES[id]?.measures || []),
    ]));
    return { ...series, taskStates: classifyTaskStates(series.taskStates) };
}

/* -------------------------------------------------------------------------- */
/* Blocks                                                                      */
/* -------------------------------------------------------------------------- */

/** Every OLAP series marked unavailable, when the history read itself failed. */
function historyUnavailable(settled) {
    return Object.fromEntries(Object.keys(OLAP_SERIES).map((id) => [id, { ...unavailable(settled), points: [] }]));
}

/** The block of a failed read. */
function unavailable(settled) {
    return { available: false, reason: settled.reason };
}

/** The overview counters the cockpit shows, without the replayable queries. */
function overviewBlock(settled) {
    if (!settled.ok) {
        return unavailable(settled);
    }
    const { park, compliance, expiring, campaigns, tasks, nonConformities, topRisk, filters } = settled.value;
    return {
        available: true, reason: null, park, compliance, expiring, campaigns, tasks, nonConformities, topRisk, filters,
    };
}

/** The supplier-row aggregates: risk map, family tree, activity, blocking-NC share. */
function suppliersBlock(settled, now) {
    if (!settled.ok) {
        return unavailable(settled);
    }
    const rows = settled.value.items;
    const since = startOfPreviousQuarter(now);
    return {
        available: true,
        reason: null,
        scanned: rows.length,
        truncated: settled.value.pagination.truncated === true,
        counts: settled.value.counts,
        riskPoints: riskPoints(rows),
        families: familyTree(rows),
        lastActivity: { ...lastActivityMonths(rows), since: since.toISOString(), activeSince: countActiveSince(rows, since) },
        withBlockingNc: rows.filter((row) => (row.metrics?.openNc || 0) > 0).length,
    };
}

/** The open-NC ageing block. */
function nonConformityBlock(settled, now) {
    if (!settled.ok) {
        return unavailable(settled);
    }
    return { available: true, reason: null, truncated: settled.value.truncated, ...ncAgingBuckets(settled.value.rows, now) };
}

/** The document-type block, with the certificates and the technical sheet. */
function documentsBlock(settled) {
    if (!settled.ok) {
        return unavailable(settled);
    }
    const types = documentTypeCounts(settled.value.columns, settled.value.rows);
    return {
        available: true,
        reason: null,
        truncated: settled.value.pagination.truncated === true,
        totals: settled.value.totals,
        types,
        certificates: summarizeDocumentTypes(types, CERTIFICATE_TYPE),
        technicalSheet: summarizeDocumentTypes(types, TECHNICAL_SHEET_TYPE),
    };
}

/**
 * The health index inputs, each `null` when its source is unavailable.
 *
 * @param {Object} overview {@link overviewBlock}
 * @param {Object} suppliers {@link suppliersBlock}
 * @returns {Object}
 */
function healthInputs(overview, suppliers) {
    return {
        approval: overview.available ? percent(overview.park.approved, overview.park.scanned) : null,
        // No mandatory document expected is no compliance to measure, not a perfect one.
        compliance: overview.available && overview.compliance.mandatoryTotal > 0 ? overview.compliance.rate ?? null : null,
        response: overview.available ? overview.campaigns.responseRate ?? null : null,
        noBlockingNc: suppliers.available
            ? percent(suppliers.scanned - suppliers.withBlockingNc, suppliers.scanned)
            : null,
    };
}

/**
 * **Shape of `GET /api/v1/monitor/cockpit`.**
 *
 * @typedef {Object} MonitorCockpit
 * @property {Object} overview  the overview counters (`park`, `compliance`,
 *   `expiring`, `campaigns`, `tasks`, `nonConformities`, `topRisk`, `filters`)
 * @property {Object} health    {@link computeHealthIndex}
 * @property {Object} suppliers `riskPoints`, `families`, `lastActivity`, `counts`,
 *   `scanned`, `truncated`, `withBlockingNc`
 * @property {Object} nonConformities `buckets`, `undated`, `total`, `truncated`
 * @property {Object} documents `types`, `totals`, `certificates`, `technicalSheet`,
 *   `truncated`
 * @property {{taskTrend: Object, taskStates: Object, completion: Object}} history
 * @property {{available: boolean, items: Object[]}} priorities
 * @property {string} generatedAt
 *
 * Every block carries `available` and `reason`; an unavailable block holds no figure.
 */

/**
 * **Builds `GET /api/v1/monitor/cockpit`** - the aggregates of the five cockpit tabs.
 *
 * The reads run in parallel and share the monitoring memo, so the park is scanned
 * once whatever the number of blocks.
 *
 * @param {Object} params
 * @param {Object} params.session live portal session
 * @param {Object} [params.filters] parsed monitoring filters
 * @param {string} [params.lang]
 * @param {boolean} [params.refresh]
 * @param {Date} [params.now]
 * @returns {Promise<MonitorCockpit>}
 */
export async function buildCockpit(params = {}) {
    const { session } = params;
    await requireMonitorAccess(session);
    const now = params.now instanceof Date ? params.now : new Date();
    const common = { session, filters: params.filters || {}, lang: params.lang, refresh: params.refresh };

    const [overviewRead, suppliersRead, ncRead, documentsRead, historyRead] = await Promise.all([
        settle('overview', () => buildOverview(common)),
        settle('suppliers', () => listMonitoredSuppliers({ ...common, sort: 'risk', exportAll: true })),
        settle('nonConformities', () => readOpenNonConformities(common)),
        settle('documents', () => buildDocumentMatrix({ ...common, exportAll: true })),
        settle('history', () => readHistory(session)),
    ]);

    const overview = overviewBlock(overviewRead);
    const suppliers = suppliersBlock(suppliersRead, now);
    return {
        overview,
        health: computeHealthIndex(healthInputs(overview, suppliers)),
        suppliers,
        nonConformities: nonConformityBlock(ncRead, now),
        documents: documentsBlock(documentsRead),
        history: historyRead.ok ? historyRead.value : historyUnavailable(historyRead),
        priorities: suppliersRead.ok
            ? { available: true, reason: null, items: weeklyPriorities(suppliersRead.value.items) }
            : unavailable(suppliersRead),
        generatedAt: now.toISOString(),
    };
}
