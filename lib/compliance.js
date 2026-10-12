/**
 * What the compliance step shows, read once from the catalogues, the document
 * requirements and the wizard steps.
 *
 * Pure: no request and no label. The step draws it; the counts it prints, the
 * chart it plots and the lists it renders all come from this one model, so they
 * cannot disagree.
 */

import { isFormulaCheck, stepForMissingField } from '@/lib/catalogs';

/** Kinds of catalogue message. */
export const MESSAGE_KINDS = Object.freeze({ RULE: 'rule', DUPLICATE: 'duplicate' });

/** Severity of a point: it holds « Terminer » back, or it only lowers the score. */
export const SEVERITY = Object.freeze({ BLOCKING: 'blocking', TO_COMPLETE: 'toComplete' });

function severityOf(catalog, blockingSet) {
    return blockingSet.has(catalog) ? SEVERITY.BLOCKING : SEVERITY.TO_COMPLETE;
}

/** The stronger of two severities. */
function worst(left, right) {
    return left === SEVERITY.BLOCKING || right === SEVERITY.BLOCKING ? SEVERITY.BLOCKING : SEVERITY.TO_COMPLETE;
}

/** Adds a point under its key, keeping the strongest severity and every catalogue. */
function collect(map, key, point) {
    const known = map.get(key);
    if (!known) {
        map.set(key, { ...point, catalogs: [point.catalog] });
        return;
    }
    known.severity = worst(known.severity, point.severity);
    if (!known.catalogs.includes(point.catalog)) {
        known.catalogs.push(point.catalog);
    }
}

function catalogName(catalog) {
    return catalog.label || catalog.id || '';
}

/**
 * Catalogue messages: the rules a catalogue checks (`formula…` ids, whose
 * label is the sentence beCPG translated) and the values it requires unique.
 */
function readMessages(catalogs, blockingSet, index) {
    const messages = new Map();
    for (const catalog of catalogs) {
        for (const field of catalog.missingFields || []) {
            if (!isFormulaCheck(String(field.field || ''))) {
                continue;
            }
            collect(messages, `rule::${field.field}::${field.locale || ''}`, {
                kind: MESSAGE_KINDS.RULE,
                text: field.label || field.field,
                locale: field.locale || null,
                catalog: catalogName(catalog),
                severity: severityOf(catalog, blockingSet),
                stepId: stepForMissingField(field, index)?.stepId || null,
                field: null,
            });
        }
        for (const field of catalog.nonUniqueFields || []) {
            collect(messages, `duplicate::${field.field}`, {
                kind: MESSAGE_KINDS.DUPLICATE,
                text: field.label || field.field,
                value: field.value ?? null,
                entities: Array.isArray(field.entities) ? field.entities : [],
                catalog: catalogName(catalog),
                severity: severityOf(catalog, blockingSet),
                stepId: stepForMissingField(field, index)?.stepId || null,
                field,
            });
        }
    }
    return [...messages.values()];
}

/** Missing fields, once per field and locale, with the step that holds each. */
function readFields(catalogs, blockingSet, index) {
    const fields = new Map();
    for (const catalog of catalogs) {
        for (const field of catalog.missingFields || []) {
            if (isFormulaCheck(String(field.field || ''))) {
                continue;
            }
            collect(fields, `${field.field || field.label}::${field.locale || ''}`, {
                label: field.label || field.field,
                locale: field.locale || null,
                catalog: catalogName(catalog),
                severity: severityOf(catalog, blockingSet),
                stepId: stepForMissingField(field, index)?.stepId || null,
                field,
            });
        }
    }
    return [...fields.values()];
}

/** Mandatory documents that block, on the documents step. */
function readDocuments(requirements, documentsStepId) {
    return (requirements || [])
        .filter((item) => item.blocking)
        .map((item) => ({
            label: item.label || item.typeLabel || item.name || '',
            status: item.status,
            validTo: item.validTo || null,
            severity: SEVERITY.BLOCKING,
            stepId: documentsStepId,
            requirement: item,
        }));
}

function emptyTally() {
    return { blocking: 0, toComplete: 0, documents: 0 };
}

/** Points per step, in step order, plus those no step could be named for. */
function tallyBySteps(steps, points) {
    const tallies = new Map(steps.map((step) => [step.id, emptyTally()]));
    const unrouted = emptyTally();
    for (const point of points) {
        const tally = tallies.get(point.stepId) || unrouted;
        if (point.isDocument) {
            tally.documents += 1;
        }
        else {
            tally[point.severity] += 1;
        }
    }
    return {
        steps: steps.map((step) => ({ id: step.id, label: step.label || step.title || step.id, ...tallies.get(step.id) })),
        unrouted,
    };
}

/**
 * @param {Object} input
 * @param {Object[]} input.catalogs the portal catalogues
 * @param {Object[]} input.blocking the catalogues that block (`blockingCatalogs()`)
 * @param {{fieldSteps: Object, listSteps: Object}} [input.index] field and list to step
 * @param {Object[]} [input.steps] the wizard steps to tally, compliance excluded
 * @param {Object[]} [input.requirements] the document requirements
 * @returns {{
 *   messages: Object[], fields: Object[], documents: Object[],
 *   bySteps: {steps: Object[], unrouted: Object},
 *   totals: {blocking: number, toComplete: number, messages: number, fields: number, documents: number},
 *   catalogs: {label: string, score: ?number, blocking: boolean, complete: boolean}[],
 * }} every point carries `severity` and `stepId` (null when no step holds it)
 */
export function buildComplianceModel({ catalogs, blocking, index = {}, steps = [], requirements = [] }) {
    const list = Array.isArray(catalogs) ? catalogs : [];
    const blockingSet = new Set(blocking || []);
    const documentsStep = steps.find((step) => step.kind === 'documents');
    const messages = readMessages(list, blockingSet, index);
    const fields = readFields(list, blockingSet, index);
    const documents = readDocuments(requirements, documentsStep ? documentsStep.id : null);
    const points = [...messages, ...fields, ...documents.map((item) => ({ ...item, isDocument: true }))];
    return {
        messages: sortBySeverity(messages),
        fields: sortBySeverity(fields),
        documents,
        bySteps: tallyBySteps(steps, points),
        totals: {
            blocking: points.filter((point) => point.severity === SEVERITY.BLOCKING).length,
            toComplete: points.filter((point) => point.severity === SEVERITY.TO_COMPLETE).length,
            messages: messages.length,
            fields: fields.length,
            documents: documents.length,
        },
        catalogs: catalogScores(list, blockingSet),
    };
}

function sortBySeverity(points) {
    return [...points].sort((left, right) => Number(right.severity === SEVERITY.BLOCKING) - Number(left.severity === SEVERITY.BLOCKING));
}

/** One score per catalogue: its per-locale rows are folded into the worst. */
function catalogScores(catalogs, blockingSet) {
    const byId = new Map();
    for (const catalog of catalogs) {
        const key = catalog.id || catalog.label;
        const score = typeof catalog.score === 'number' && !Number.isNaN(catalog.score) ? catalog.score : null;
        const known = byId.get(key);
        const entry = {
            label: catalogName(catalog),
            score,
            blocking: blockingSet.has(catalog),
            complete: Boolean(catalog.isComplete),
        };
        if (!known) {
            byId.set(key, entry);
            continue;
        }
        known.score = known.score === null ? score : (score === null ? known.score : Math.min(known.score, score));
        known.blocking = known.blocking || entry.blocking;
        known.complete = known.complete && entry.complete;
    }
    return [...byId.values()];
}
