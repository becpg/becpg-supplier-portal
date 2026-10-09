/**
 * Reading of a derived approval status as a ladder, shared by the supplier sheet.
 *
 * The rules come from the server (`approval.rules`) in derivation order: the
 * first rule with a reason gives the status. Nothing here re-implements the
 * derivation, it only says which rules hold and in which order.
 */

/** The status every ladder ends on, held when no other rule is. */
export const APPROVED_STATUS = 'approved';

/**
 * The rules that hold for a supplier, in derivation order, each with the
 * reasons that make it hold. The first one is the rule that gives the status.
 *
 * @param {{rules?: Array<{status: string, anyOf: string[]}>, reasons?: string[]}} approval
 * @returns {Array<{status: string, reasons: string[]}>}
 */
export function heldRules(approval) {
    const reasons = new Set(approval?.reasons || []);
    return (approval?.rules || [])
        .filter((rule) => rule.status !== APPROVED_STATUS)
        .map((rule) => ({ status: rule.status, reasons: rule.anyOf.filter((code) => reasons.has(code)) }))
        .filter((rule) => rule.reasons.length > 0);
}

/**
 * Every condition an approved supplier meets: each reason any rule can hold on,
 * once, in rule order.
 *
 * @param {{rules?: Array<{anyOf: string[]}>}} approval
 * @returns {string[]}
 */
export function approvalConditions(approval) {
    return [...new Set((approval?.rules || []).flatMap((rule) => rule.anyOf))];
}
