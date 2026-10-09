'use client';

/**
 * Where the AI suggestions are, when the open step has none.
 *
 * Suggestions are read per step (`suggestionScopeForStep`), and becpg-ai only
 * keeps for a scope the proposals of its type: a technical sheet that lists
 * nutrients and ingredients yields nothing on the packaging step. Saying
 * « Rien à proposer pour cette étape » there was true and useless; the supplier
 * concluded the sheet had not been read. This hook counts the other steps'
 * scopes, and only once the open step is known to be empty, so a step that
 * has proposals costs nothing more.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useApi } from '@/lib/client';
import { suggestionScopeForStep } from '@/lib/suggestionScope';

/**
 * The first step of each scope other than the open one, in step order.
 *
 * @param {Object[]} steps the wizard's step model
 * @param {string|undefined} currentScope
 * @returns {Map<string, {stepId: string, label: string}>} keyed by scope
 */
function otherScopes(steps, currentScope) {
    const byScope = new Map();
    for (const step of steps) {
        const scope = suggestionScopeForStep(step);
        if (scope && scope !== currentScope && !byScope.has(scope)) {
            byScope.set(scope, { stepId: step.id, label: step.label });
        }
    }
    return byScope;
}

/**
 * Reduces the per-scope counts to what the panel says.
 *
 * `nothingFound` is only true when every scope answered, none is still
 * running and all are empty: a scope that failed is not known to be empty.
 */
function summarise(byScope, scopes) {
    const entries = scopes
        .filter((scope) => scope.available && scope.total > 0 && byScope.has(scope.listId))
        .map((scope) => ({ ...byScope.get(scope.listId), total: scope.total }));
    const settled = scopes.every((scope) => scope.available && !scope.running);
    return {
        entries,
        total: entries.reduce((sum, entry) => sum + entry.total, 0),
        running: scopes.some((scope) => scope.running),
        nothingFound: settled && entries.length === 0,
    };
}

/**
 * @param {Object} params
 * @param {string|null} params.entityId
 * @param {Object[]} params.steps the wizard's step model
 * @param {Object|null} params.currentStep
 * @param {boolean} params.currentEmpty true once the open step's read has
 *        answered with no suggestion and nothing still running
 * @param {string|null} params.readAt when the open step was last read; a
 *        new read (an upload, « Relancer l'analyse ») re-counts the others
 * @param {number} params.timeout browser timeout, the suggestions read's own
 * @returns {{loading: boolean, error: Error|null, entries: Array<{stepId: string, label: string, total: number}>,
 *            total: number, running: boolean, nothingFound: boolean}|null} `null` while not asked
 */
export function useSuggestionsElsewhere({ entityId, steps, currentStep, currentEmpty, readAt, timeout }) {
    const currentScope = suggestionScopeForStep(currentStep);
    const byScope = useMemo(() => otherScopes(steps, currentScope), [steps, currentScope]);
    const listIds = [...byScope.keys()].join(',');
    const enabled = Boolean(entityId) && currentEmpty && listIds !== '';

    const call = useApi(enabled ? `suggestions/${encodeURIComponent(entityId)}/scopes` : null, {
        params: { listIds },
        timeout,
    });

    // Only a re-read of a step already counted triggers a re-count: the read
    // that first finds the step empty is what enables the call, which then
    // fetches on its own.
    const seen = useRef({ readAt, enabled });
    const { refresh } = call;
    useEffect(() => {
        const previous = seen.current;
        if (enabled && previous.enabled && readAt && readAt !== previous.readAt) {
            refresh();
        }
        seen.current = { readAt, enabled };
    }, [enabled, readAt, refresh]);

    return useMemo(() => {
        if (!enabled) {
            return null;
        }
        const scopes = Array.isArray(call.data?.scopes) ? call.data.scopes : [];
        return {
            loading: call.loading,
            error: call.error,
            ...summarise(byScope, scopes),
        };
    }, [enabled, call.data, call.loading, call.error, byScope]);
}
