/**
 * The AI features of the portal beyond the suggestions panel, read through beCPG
 * proxy webscripts the way `becpg/ai/suggestions` is (rule 6: the portal talks
 * to beCPG only, which holds becpg-ai's address and builds its credential).
 *
 * | Feature                         | Repository webscript               |
 * |---------------------------------|------------------------------------|
 * | review pre-validation           | `POST becpg/ai/review/precheck`    |
 * | feedback reworded or translated | `POST becpg/ai/messages/rewrite`   |
 * | non-conformity assistance       | `POST becpg/ai/nc/assist`          |
 * | per-supplier message drafts     | `POST becpg/ai/messages/drafts`    |
 *
 * The contract of each one is the JSDoc of its function below; the backend work
 * is tracked outside this repository. Until a webscript is deployed — or while
 * `beCPG.ai.serverUrl` is empty — beCPG answers 404 or 503, and every function
 * here returns `{ available: false, reason }` instead of throwing: the screens
 * then show nothing of the feature, never an error and never an invented result.
 *
 * Whatever the service answers is checked here: an item missing what the screen
 * needs is dropped, an unknown severity reads as a warning, a confidence outside
 * 0-100 reads as absent. Nothing the AI returns is written anywhere by these
 * calls; the reviewer applies, edits or ignores it.
 *
 * Monitoring space only. Server only.
 */

import { postJson } from '@/lib/becpg';
import { BadRequestError } from '@/lib/errors';
import { logWarn } from '@/lib/http';
import { requireMonitorAccess } from '@/lib/adapters/monitor';
import { toNodeRef } from '@/lib/adapters/tasks';

export const AI_PATHS = Object.freeze({
    reviewPrecheck: 'becpg/ai/review/precheck',
    rewrite: 'becpg/ai/messages/rewrite',
    ncAssist: 'becpg/ai/nc/assist',
    drafts: 'becpg/ai/messages/drafts',
});

/** An AI run takes tens of seconds on a cold cache. */
const AI_TIMEOUT_MS = 120000;

/** Upstream statuses that mean « no AI here », not « AI failed ». */
const UNAVAILABLE_STATUSES = new Set([404, 501, 503]);

export const SEVERITIES = Object.freeze(['error', 'warning', 'ok']);
export const VERDICTS = Object.freeze(['blocking', 'toCheck', 'clear']);
export const DRAFT_INTENTS = Object.freeze(['remind', 'escalate', 'startProject']);
export const REWRITE_MODES = Object.freeze(['reformulate', 'translate']);

/* ------------------------------------------------------------------ helpers */

const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

/** 0-100, or null: an absent confidence is never a low one. */
export function confidenceOf(value) {
    const number = typeof value === 'string' && value.trim() ? Number(value) : value;
    return typeof number === 'number' && Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
}

const listOf = (value) => (Array.isArray(value) ? value : []);

/**
 * Calls one AI webscript; an AI that is not there is a result, not an error.
 *
 * @returns {Promise<Object>} the payload, or `{ available: false, reason }`
 */
async function callAi(session, feature, body) {
    try {
        const payload = await postJson(AI_PATHS[feature], body, { session, skipAllowList: true, timeout: AI_TIMEOUT_MS, retries: 0 });
        return { available: true, payload: payload || {} };
    }
    catch (error) {
        const status = error?.details?.upstreamStatus || error?.status;
        if (UNAVAILABLE_STATUSES.has(status)) {
            return { available: false, reason: status === 503 ? 'aiNotConfigured' : 'aiNotDeployed' };
        }
        logWarn('ai.callFailed', { feature, status });
        throw error;
    }
}

/* ---------------------------------------------------- review pre-validation */

function toCheck(raw, index) {
    const title = text(raw?.title);
    if (!title) {
        return null;
    }
    return {
        id: text(raw.id) || `check-${index}`,
        severity: SEVERITIES.includes(raw.severity) ? raw.severity : 'warning',
        title,
        detail: text(raw.detail),
        listId: text(raw.listId),
        field: text(raw.field),
        row: raw.row && text(raw.row.label) ? { key: text(raw.row.key), label: text(raw.row.label) } : null,
        documentId: text(raw.documentId),
        confidence: confidenceOf(raw.confidence),
    };
}

/**
 * The checks of a pre-validation, worst first.
 *
 * @param {Object} payload the webscript's answer
 * @returns {Object} see {@link reviewPrecheck}
 */
export function toPrecheck(payload) {
    const order = (check) => SEVERITIES.indexOf(check.severity);
    const checks = listOf(payload?.checks).map(toCheck).filter(Boolean).sort((left, right) => order(left) - order(right));
    const feedback = payload?.feedback || {};
    return {
        available: true,
        status: payload?.status === 'running' ? 'running' : 'done',
        retryAfter: Number(payload?.retryAfter) > 0 ? Number(payload.retryAfter) : null,
        verdict: {
            state: VERDICTS.includes(payload?.verdict?.state) ? payload.verdict.state : null,
            summary: text(payload?.verdict?.summary),
        },
        checks,
        feedback: {
            message: text(feedback.message),
            locale: text(feedback.locale),
            items: listOf(feedback.items).filter((item) => text(item?.text)).map((item) => ({ checkId: text(item.checkId), text: text(item.text) })),
        },
        generatedAt: text(payload?.generatedAt),
    };
}

/**
 * `POST /api/v1/ai/review-precheck` — what an AI reads in a sheet under review
 * before the reviewer does: coherence (kJ against kcal, mass balance, allergens
 * against ingredients), mandatory documents, changes since the validated
 * reference worth a look.
 *
 * Upstream request — `POST becpg/ai/review/precheck`:
 * `{ nodeRef, referenceNodeRef?, taskId?, locale }`
 *
 * Upstream response:
 * ```
 * { status: 'done'|'running', retryAfter?: seconds,
 *   verdict: { state: 'blocking'|'toCheck'|'clear', summary },
 *   checks: [{ id, severity: 'error'|'warning'|'ok', title, detail,
 *              listId: 'nutList'|'View-properties'|'View-documents'|…,
 *              field?: 'bcpg:nutListValue', row?: { key, label },
 *              documentId?, confidence?: 0-100 }],
 *   feedback: { message, locale, items: [{ checkId, text }] },
 *   generatedAt }
 * ```
 *
 * @param {Object} params `{ session, entity, reference?, taskId?, locale }`
 * @returns {Promise<Object>} `{ available: false, reason }` or the normalised pre-validation
 */
export async function reviewPrecheck({ session, entity, reference = null, taskId = null, locale = 'fr' }) {
    await requireMonitorAccess(session);
    const result = await callAi(session, 'reviewPrecheck', {
        nodeRef: toNodeRef(entity),
        ...(reference ? { referenceNodeRef: toNodeRef(reference) } : {}),
        ...(taskId ? { taskId: String(taskId) } : {}),
        locale,
    });
    return result.available ? toPrecheck(result.payload) : result;
}

/* ------------------------------------------------------------------ rewrite */

/**
 * `POST /api/v1/ai/rewrite` — a feedback message reworded, or translated into
 * the supplier's language.
 *
 * Upstream: `POST becpg/ai/messages/rewrite`
 * `{ message, mode: 'reformulate'|'translate', targetLocale?, nodeRef? }` →
 * `{ message, locale }`
 *
 * @param {Object} params `{ session, message, mode, targetLocale?, entity? }`
 * @returns {Promise<{available: boolean, message?: string, locale?: string|null, reason?: string}>}
 */
export async function rewriteMessage({ session, message, mode, targetLocale = null, entity = null }) {
    await requireMonitorAccess(session);
    if (!text(message) || !REWRITE_MODES.includes(mode)) {
        throw new BadRequestError('A message and a mode (reformulate or translate) are required');
    }
    const result = await callAi(session, 'rewrite', {
        message,
        mode,
        ...(targetLocale ? { targetLocale } : {}),
        ...(entity ? { nodeRef: toNodeRef(entity) } : {}),
    });
    if (!result.available) {
        return result;
    }
    return { available: Boolean(text(result.payload.message)), message: text(result.payload.message), locale: text(result.payload.locale) };
}

/* -------------------------------------------------------------- NC assist */

/**
 * The answers an AI proposes for the fields of a step, checked against the step.
 *
 * @param {Object} payload
 * @param {string[]} [fieldNames] the step's answer fields; others are dropped
 */
export function toNcAssist(payload, fieldNames = null) {
    const allowed = fieldNames ? new Set(fieldNames) : null;
    return {
        available: true,
        summary: text(payload?.summary),
        answers: listOf(payload?.answers)
            .filter((answer) => text(answer?.name) && answer.value !== undefined && (!allowed || allowed.has(answer.name)))
            .map((answer) => ({
                name: answer.name,
                value: answer.value,
                label: text(answer.label),
                reason: text(answer.reason),
                confidence: confidenceOf(answer.confidence),
            })),
        rootCauses: listOf(payload?.rootCauses).filter((cause) => text(cause?.label)).map((cause) => ({
            label: text(cause.label),
            likelihood: ['high', 'medium', 'low'].includes(cause.likelihood) ? cause.likelihood : null,
            evidence: text(cause.evidence),
        })),
        correctiveActions: listOf(payload?.correctiveActions).map((action) => text(action?.text)).filter(Boolean),
        similar: listOf(payload?.similar).filter((nc) => text(nc?.nodeRef) && text(nc?.name)).map((nc) => ({
            nodeRef: text(nc.nodeRef),
            name: text(nc.name),
            date: text(nc.date),
            supplier: text(nc.supplier),
            product: text(nc.product),
            state: text(nc.state),
            similarity: confidenceOf(nc.similarity),
        })),
    };
}

/**
 * `POST /api/v1/ai/nc-assist` — help for whoever treats a non-conformity step:
 * proposed answers for the step's fields, likely root causes, corrective actions,
 * similar past non-conformities.
 *
 * Upstream: `POST becpg/ai/nc/assist` `{ nodeRef, taskId?, taskType?, locale }` →
 * ```
 * { summary,
 *   answers: [{ name: 'ncwf:needPrevAction', value, label, reason, confidence }],
 *   rootCauses: [{ label, likelihood: 'high'|'medium'|'low', evidence }],
 *   correctiveActions: [{ text }],
 *   similar: [{ nodeRef, name, date, supplier, product, state, similarity }] }
 * ```
 *
 * @param {Object} params `{ session, nc, taskId?, taskType?, fieldNames?, locale }`
 * @returns {Promise<Object>}
 */
export async function ncAssist({ session, nc, taskId = null, taskType = null, fieldNames = null, locale = 'fr' }) {
    await requireMonitorAccess(session);
    const result = await callAi(session, 'ncAssist', {
        nodeRef: toNodeRef(nc),
        ...(taskId ? { taskId: String(taskId) } : {}),
        ...(taskType ? { taskType: String(taskType) } : {}),
        locale,
    });
    return result.available ? toNcAssist(result.payload, fieldNames) : result;
}

/* ------------------------------------------------------------------ drafts */

/**
 * The drafts that name one of the requested targets, one per target.
 *
 * @param {Object} payload
 * @param {string[]} targets the supplier nodeRefs asked for
 */
export function toDrafts(payload, targets) {
    const wanted = new Set(targets);
    const seen = new Set();
    const drafts = listOf(payload?.drafts).filter((draft) => {
        const target = text(draft?.target);
        if (!target || !wanted.has(target) || seen.has(target) || !text(draft.message)) {
            return false;
        }
        seen.add(target);
        return true;
    }).map((draft) => ({
        target: text(draft.target),
        locale: text(draft.locale),
        subject: text(draft.subject),
        message: text(draft.message),
        facts: listOf(draft.facts).map(text).filter(Boolean),
    }));
    return { available: true, drafts };
}

/**
 * `POST /api/v1/ai/drafts` — one message per supplier, in the supplier's
 * language, built from what is actually late or missing at that supplier.
 *
 * Upstream: `POST becpg/ai/messages/drafts`
 * `{ intent: 'remind'|'escalate'|'startProject', instructions?, dueDate?,
 *    targets: [{ nodeRef, locale?, items: [nodeRef] }] }` →
 * `{ drafts: [{ target, locale, subject, message, facts: [string] }] }`
 *
 * @param {Object} params `{ session, intent, targets, instructions?, dueDate? }`
 * @returns {Promise<Object>}
 */
export async function draftMessages({ session, intent, targets, instructions = null, dueDate = null }) {
    await requireMonitorAccess(session);
    if (!DRAFT_INTENTS.includes(intent) || !Array.isArray(targets) || targets.length === 0) {
        throw new BadRequestError('An intent and at least one target are required');
    }
    const normalized = targets.map((target) => ({
        nodeRef: toNodeRef(target.nodeRef),
        ...(text(target.locale) ? { locale: text(target.locale) } : {}),
        items: listOf(target.items).map((item) => toNodeRef(item)),
    }));
    const result = await callAi(session, 'drafts', {
        intent,
        targets: normalized,
        ...(text(instructions) ? { instructions: text(instructions) } : {}),
        ...(text(dueDate) ? { dueDate: text(dueDate) } : {}),
    });
    return result.available ? toDrafts(result.payload, normalized.map((target) => target.nodeRef)) : result;
}
