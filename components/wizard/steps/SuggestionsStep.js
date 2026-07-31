'use client';

/**
 * **Étape 2 · Suggestions IA** — what becpg-ai read in the documents deposited
 * at step 1.
 *
 * ## The confidence rule (spec §4.4), applied literally
 *
 * | Confidence | What happens here |
 * |---|---|
 * | ≥ 90 | **applied** on arrival, green badge, **revocable** |
 * | 70 – 89 | proposed, orange badge, applied only if the supplier confirms |
 * | < 70 | flagged, red badge, the supplier is sent to the field to type it |
 * | absent | **no badge at all**, treated exactly like a 70-89 proposal |
 *
 * The last line is the one that matters: a suggestion with no score is *not* a
 * bad suggestion, and drawing a red badge on it would teach the supplier to
 * distrust everything. `SuggestionBadge` renders nothing for a null level, and
 * this step never auto-applies one either — absence of evidence is not evidence.
 *
 * ## What "revocable" means, concretely
 *
 * Before a value is applied, the step reads the entity's **current** value for
 * exactly the attributes about to change (`becpg/remote/entity?fields=…` through
 * the proxy) and keeps it. "Annuler" writes that value back through the same
 * `POST /api/v1/suggestions/apply` path, so the repository stays the only writer
 * and every business rule applies (architecture rule R2).
 *
 * When a previous value cannot be restored faithfully — an association, whose
 * snapshot is a node object and not the nodeRef the patch expects — the card
 * says so and offers to go and edit the field by hand instead of pretending to
 * undo. A wrong undo is worse than no undo.
 *
 * Nothing is applied without an explicit action *except* the ≥ 90 bucket, which
 * the spec asks to apply — and which stays revocable for that reason.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { SuggestionBadge, SuggestionHint } from '@/components/wizard/SuggestionBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { api, useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { formatDateTime, isIsoTimestamp } from '@/lib/format';

const LABELS = {
    fr: {
        title: 'Extraction automatique',
        subtitle:
            'Ces valeurs ont été lues dans les documents que vous avez déposés. Vérifiez-les : vous gardez la main.',
        applied: 'Appliqué automatiquement',
        appliedHint: 'Confiance élevée : la valeur est déjà en place, vous pouvez l’annuler.',
        toConfirm: 'À confirmer',
        toConfirmHint: 'Vérifiez la valeur proposée, puis appliquez-la.',
        flagged: 'À saisir vous-même',
        flaggedHint: 'L’extraction n’est pas assez fiable : nous préférons vous laisser saisir.',
        unscored: 'Propositions',
        unscoredHint: 'Ces propositions ne sont pas accompagnées d’un indice de confiance.',
        apply: 'Appliquer',
        applyAnyway: 'Appliquer quand même',
        revoke: 'Annuler',
        dismiss: 'Ignorer',
        restore: 'Revoir',
        goToField: 'Aller au champ',
        applying: 'Application…',
        appliedAt: 'Appliqué',
        revoked: 'Annulé',
        dismissed: 'Ignoré',
        notRevocable:
            'La valeur précédente ne peut pas être rétablie automatiquement : modifiez le champ directement si besoin.',
        empty: 'Aucune suggestion',
        emptyHint:
            'Déposez vos documents à l’étape précédente : l’extraction automatique vous proposera les valeurs qu’elle y trouve.',
        refresh: 'Relancer l’analyse',
        readOnly: 'Cette fiche est en lecture seule : les suggestions ne peuvent pas être appliquées.',
        source: 'Source',
        changes: '{count} valeur(s)',
        error: 'L’application de la suggestion a échoué.',
    },
    en: {
        title: 'Automatic extraction',
        subtitle: 'These values were read from the documents you deposited. Check them: you stay in control.',
        applied: 'Applied automatically',
        appliedHint: 'High confidence: the value is already in place, you can undo it.',
        toConfirm: 'To confirm',
        toConfirmHint: 'Check the proposed value, then apply it.',
        flagged: 'Type it yourself',
        flaggedHint: 'The extraction is not reliable enough: we would rather let you type it.',
        unscored: 'Proposals',
        unscoredHint: 'These proposals come without a confidence score.',
        apply: 'Apply',
        applyAnyway: 'Apply anyway',
        revoke: 'Undo',
        dismiss: 'Dismiss',
        restore: 'Review',
        goToField: 'Go to the field',
        applying: 'Applying…',
        appliedAt: 'Applied',
        revoked: 'Undone',
        dismissed: 'Dismissed',
        notRevocable:
            'The previous value cannot be restored automatically: edit the field directly if needed.',
        empty: 'No suggestion',
        emptyHint:
            'Deposit your documents at the previous step: the automatic extraction will propose the values it finds.',
        refresh: 'Run the analysis again',
        readOnly: 'This sheet is read-only: suggestions cannot be applied.',
        source: 'Source',
        changes: '{count} value(s)',
        error: 'Applying the suggestion failed.',
    },
};

/** Per-suggestion lifecycle, kept locally: becpg-ai has no notion of "dismissed". */
const STATE = Object.freeze({
    PROPOSED: 'proposed',
    APPLYING: 'applying',
    APPLIED: 'applied',
    REVOKED: 'revoked',
    DISMISSED: 'dismissed',
    ERROR: 'error',
});

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])),
    );
}

/** localStorage key holding what the supplier already decided about a suggestion. */
function storageKey(entityId) {
    return `becpg.portal.suggestions.${entityId}`;
}

/**
 * Reads the decisions persisted for this entity, so a revoked suggestion is not
 * re-applied the next time the step is opened.
 *
 * @param {string} entityId
 * @returns {Object} `{ [suggestionId]: 'applied'|'revoked'|'dismissed' }`
 */
function readDecisions(entityId) {
    if (typeof window === 'undefined' || !entityId) {
        return {};
    }
    try {
        const raw = window.localStorage.getItem(storageKey(entityId));
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === 'object' ? parsed : {};
    }
    catch {
        return {};
    }
}

function writeDecisions(entityId, decisions) {
    if (typeof window === 'undefined' || !entityId) {
        return;
    }
    try {
        window.localStorage.setItem(storageKey(entityId), JSON.stringify(decisions));
    }
    catch {
        // A private-browsing window without storage is not a reason to fail.
    }
}

/**
 * True when a snapshot value can be written back as-is through the apply patch.
 * A node object (association) cannot: the patch expects a nodeRef, and guessing
 * would silently rewrite an association.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isRestorable(value) {
    if (value === null || value === undefined) {
        return true;
    }
    if (Array.isArray(value)) {
        return value.every((entry) => entry === null || typeof entry !== 'object');
    }
    return typeof value !== 'object';
}

/**
 * Renders a value the way a human reads it, whatever shape beCPG sent.
 *
 * @param {*} value
 * @param {string} [lang='fr']
 * @returns {string}
 */
function readableValue(value, lang = 'fr') {
    if (value === null || value === undefined || value === '') {
        return '—';
    }
    if (Array.isArray(value)) {
        return value.map((entry) => readableValue(entry, lang)).filter((entry) => entry !== '—').join(', ') || '—';
    }
    if (typeof value === 'object') {
        return String(value.displayValue || value.name || value.label || value.value || '—');
    }
    if (typeof value === 'boolean') {
        return value ? '✓' : '✗';
    }
    // The AI returns a d:date suggestion as a bare ISO string, with no type
    // beside it — the "before → after" line would otherwise show a timestamp.
    if (isIsoTimestamp(value)) {
        return formatDateTime(value, lang, { fallback: String(value) });
    }
    return String(value);
}

/**
 * One suggestion.
 */
function SuggestionCard({
    suggestion,
    status,
    error,
    labelFor,
    labels,
    lang,
    readOnly,
    revocable,
    onApply,
    onRevoke,
    onDismiss,
    onGoToChange,
    index,
}) {
    const reduceMotion = useReducedMotion();
    const level = suggestion.confidenceLevel;
    const applied = status === STATE.APPLIED;
    const applying = status === STATE.APPLYING;

    return (
        <motion.li
            layout
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, delay: reduceMotion ? 0 : Math.min(index, 8) * 0.04 }}
            className="rounded-xl border border-[var(--becpg-grey)] bg-white p-3"
        >
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--becpg-blue)]">
                        {suggestion.title || labels.title}
                    </p>
                    {suggestion.description ? (
                        <p className="mt-0.5 text-sm text-[var(--becpg-dark-grey)]">{suggestion.description}</p>
                    ) : null}
                </div>
                {/* Nothing at all when the confidence is absent. */}
                <SuggestionBadge level={level} confidence={suggestion.confidence} lang={lang} />
            </div>

            {suggestion.changes && suggestion.changes.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-1">
                    {suggestion.changes.slice(0, 8).map((change, position) => (
                        <li
                            key={`${change.scope}-${change.listName || ''}-${change.name}-${position}`}
                            className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg bg-[var(--becpg-grey)]/40 px-2 py-1 text-sm"
                        >
                            <button
                                type="button"
                                onClick={() => onGoToChange(change)}
                                className="truncate text-[var(--becpg-blue)] underline underline-offset-2 hover:opacity-80"
                            >
                                {labelFor(change)}
                            </button>
                            <span className="min-w-0 flex-1 truncate font-medium text-[var(--becpg-blue)]">
                                {readableValue(change.value, lang)}
                            </span>
                        </li>
                    ))}
                    {suggestion.changes.length > 8 ? (
                        <li className="px-2 text-xs text-[var(--becpg-dark-grey)]">
                            {fill(labels.changes, { count: suggestion.changes.length })}
                        </li>
                    ) : null}
                </ul>
            ) : null}

            <SuggestionHint level={level} lang={lang} className="mt-1.5" />

            {status === STATE.ERROR && error ? (
                <p className="mt-1.5 text-xs text-[var(--status-danger,#d32f2f)]">{labels.error}</p>
            ) : null}

            {applied && !revocable ? (
                <p className="mt-1.5 text-xs text-[var(--becpg-dark-grey)]">{labels.notRevocable}</p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-2">
                {applied ? (
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--becpg-dark-grey)]">
                        <Icon name="check_circle" size={15} className="text-[var(--becpg-green)]" />
                        {labels.appliedAt}
                    </span>
                ) : null}

                {!readOnly && applied && revocable ? (
                    <Button variant="outline" size="sm" icon="undo" onClick={onRevoke} loading={applying}>
                        {labels.revoke}
                    </Button>
                ) : null}

                {!readOnly && !applied ? (
                    <Button
                        variant={level === 'low' ? 'outline' : 'primary'}
                        size="sm"
                        icon="check"
                        onClick={onApply}
                        loading={applying}
                    >
                        {level === 'low' ? labels.applyAnyway : labels.apply}
                    </Button>
                ) : null}

                {!readOnly && !applied && status !== STATE.DISMISSED ? (
                    <Button variant="ghost" size="sm" onClick={onDismiss}>
                        {labels.dismiss}
                    </Button>
                ) : null}

                {suggestion.changes && suggestion.changes.length > 0 ? (
                    <Button
                        variant="link"
                        size="sm"
                        icon="edit"
                        onClick={() => onGoToChange(suggestion.changes[0])}
                    >
                        {labels.goToField}
                    </Button>
                ) : null}
            </div>
        </motion.li>
    );
}

/**
 * @param {Object} props
 * @param {string} props.entityId entity nodeRef
 * @param {string} props.entityType prefixed type, needed by the apply patch
 * @param {Array<Object>} props.suggestions normalised suggestions (`/api/v1/suggestions/{id}`)
 * @param {Object} [props.summary]
 * @param {boolean} [props.loading]
 * @param {Error} [props.error]
 * @param {Function} [props.onRefresh]
 * @param {boolean} [props.readOnly]
 * @param {Function} [props.onApplied] `(suggestion) => void` — the wizard refreshes the steps
 * @param {Function} [props.onGoToChange] `(change) => void` — navigate to the field / list
 * @param {Function} [props.labelForField] `(name) => string` — the dictionary label when known
 * @param {string} [props.className]
 */
export function SuggestionsStep({
    entityId,
    entityType,
    suggestions = [],
    summary = null,
    loading = false,
    error = null,
    onRefresh,
    readOnly = false,
    onApplied,
    onGoToChange,
    labelForField,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const toast = useToast();
    const reduceMotion = useReducedMotion();

    const [decisions, setDecisions] = useState(() => readDecisions(entityId));
    const [statuses, setStatuses] = useState({});
    const [errors, setErrors] = useState({});
    const autoAppliedRef = useRef(new Set());

    // Every entity attribute a suggestion would overwrite: the snapshot is what
    // makes "revocable" true rather than decorative.
    const attributeNames = useMemo(() => {
        const names = new Set();
        for (const suggestion of suggestions) {
            for (const change of suggestion.changes || []) {
                if (change.scope === 'entity' && change.name) {
                    names.add(change.name);
                }
            }
        }
        return [...names];
    }, [suggestions]);

    const snapshotCall = useApi(entityId && attributeNames.length > 0 ? 'becpg/becpg/remote/entity' : null, {
        params: { nodeRef: entityId, fields: attributeNames.join(','), lists: 'none' },
    });

    const snapshot = useMemo(() => {
        const entity = snapshotCall.data && snapshotCall.data.entity;
        return (entity && entity.attributes) || null;
    }, [snapshotCall.data]);

    const statusOf = useCallback(
        (suggestion) => statuses[suggestion.id] || decisions[suggestion.id] || STATE.PROPOSED,
        [statuses, decisions],
    );

    const remember = useCallback(
        (id, decision) => {
            setDecisions((current) => {
                const next = { ...current, [id]: decision };
                writeDecisions(entityId, next);
                return next;
            });
        },
        [entityId],
    );

    /** True when every attribute this suggestion touches can be written back. */
    const revocableOf = useCallback(
        (suggestion) => {
            if (!snapshot) {
                return false;
            }
            const changes = (suggestion.changes || []).filter((change) => change.scope === 'entity');
            if (changes.length === 0 || changes.length !== (suggestion.changes || []).length) {
                // A datalist patch creates rows; there is no faithful undo.
                return false;
            }
            return changes.every((change) => isRestorable(snapshot[change.name]));
        },
        [snapshot],
    );

    const apply = useCallback(
        async (suggestion, { silent = false } = {}) => {
            if (readOnly) {
                return;
            }
            setStatuses((current) => ({ ...current, [suggestion.id]: STATE.APPLYING }));
            try {
                const body = Array.isArray(suggestion.plan) && suggestion.plan.length > 0
                    ? { plan: suggestion.plan }
                    : { suggestedChanges: suggestion.suggestedChanges };
                await api.post('suggestions/apply', body);
                setStatuses((current) => ({ ...current, [suggestion.id]: STATE.APPLIED }));
                remember(suggestion.id, STATE.APPLIED);
                if (onApplied) {
                    onApplied(suggestion);
                }
            }
            catch (applyError) {
                setStatuses((current) => ({ ...current, [suggestion.id]: STATE.ERROR }));
                setErrors((current) => ({ ...current, [suggestion.id]: applyError }));
                if (!silent) {
                    toast.error(applyError);
                }
            }
        },
        [readOnly, remember, onApplied, toast],
    );

    const revoke = useCallback(
        async (suggestion) => {
            if (readOnly || !snapshot) {
                return;
            }
            const attributes = {};
            for (const change of suggestion.changes || []) {
                if (change.scope === 'entity') {
                    const previous = snapshot[change.name];
                    attributes[change.name] = previous === undefined ? null : previous;
                }
            }
            setStatuses((current) => ({ ...current, [suggestion.id]: STATE.APPLYING }));
            try {
                await api.post('suggestions/apply', {
                    suggestedChanges: {
                        id: (suggestion.suggestedChanges && suggestion.suggestedChanges.id)
                            || String(entityId).split('/').pop(),
                        type: (suggestion.suggestedChanges && suggestion.suggestedChanges.type) || entityType,
                        attributes,
                    },
                });
                setStatuses((current) => ({ ...current, [suggestion.id]: STATE.REVOKED }));
                remember(suggestion.id, STATE.REVOKED);
                if (onApplied) {
                    onApplied(suggestion);
                }
            }
            catch (revokeError) {
                setStatuses((current) => ({ ...current, [suggestion.id]: STATE.ERROR }));
                setErrors((current) => ({ ...current, [suggestion.id]: revokeError }));
                toast.error(revokeError);
            }
        },
        [readOnly, snapshot, entityId, entityType, remember, onApplied, toast],
    );

    const dismiss = useCallback(
        (suggestion) => {
            setStatuses((current) => ({ ...current, [suggestion.id]: STATE.DISMISSED }));
            remember(suggestion.id, STATE.DISMISSED);
        },
        [remember],
    );

    // ≥ 90 % is applied on arrival (spec §4.4) — once, never against a
    // suggestion the supplier already revoked or dismissed, and never before the
    // snapshot that makes it revocable has landed.
    useEffect(() => {
        if (readOnly || suggestions.length === 0) {
            return;
        }
        if (attributeNames.length > 0 && !snapshot) {
            return;
        }
        for (const suggestion of suggestions) {
            if (suggestion.confidenceLevel !== 'high' || !suggestion.autoApplicable) {
                continue;
            }
            if (autoAppliedRef.current.has(suggestion.id)) {
                continue;
            }
            const decided = decisions[suggestion.id];
            if (decided && decided !== STATE.PROPOSED) {
                continue;
            }
            autoAppliedRef.current.add(suggestion.id);
            apply(suggestion, { silent: true });
        }
    }, [suggestions, snapshot, attributeNames.length, decisions, readOnly, apply]);

    const labelFor = useCallback(
        (change) => {
            const own = labelForField ? labelForField(change.name) : null;
            if (own) {
                return own;
            }
            const local = String(change.name || '').split(':').pop();
            return change.listName ? `${change.listName} · ${local}` : local;
        },
        [labelForField],
    );

    const buckets = useMemo(() => {
        const groups = { high: [], medium: [], low: [], unscored: [] };
        for (const suggestion of suggestions) {
            const key = suggestion.confidenceLevel || 'unscored';
            groups[key].push(suggestion);
        }
        return groups;
    }, [suggestions]);

    if (error) {
        return <ErrorState error={error} onRetry={onRefresh} />;
    }
    if (loading && suggestions.length === 0) {
        return (
            <div className={`flex flex-col gap-3 ${className}`}>
                <SkeletonCard lines={3} />
                <SkeletonCard lines={3} />
            </div>
        );
    }

    const sections = [
        { key: 'high', title: labels.applied, hint: labels.appliedHint, items: buckets.high },
        { key: 'medium', title: labels.toConfirm, hint: labels.toConfirmHint, items: buckets.medium },
        { key: 'low', title: labels.flagged, hint: labels.flaggedHint, items: buckets.low },
        { key: 'unscored', title: labels.unscored, hint: labels.unscoredHint, items: buckets.unscored },
    ].filter((section) => section.items.length > 0);

    return (
        <div className={`min-w-0 ${className}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                    <h3 className="text-base font-medium text-[var(--becpg-blue)]">{labels.title}</h3>
                    <p className="text-sm text-[var(--becpg-dark-grey)]">{labels.subtitle}</p>
                </div>
                {onRefresh ? (
                    <Button variant="outline" size="sm" icon="refresh" onClick={onRefresh} loading={loading}>
                        {labels.refresh}
                    </Button>
                ) : null}
            </div>

            {readOnly ? (
                <p className="mb-3 rounded-xl border border-[var(--becpg-grey)] bg-[var(--becpg-grey)]/40 p-3 text-sm text-[var(--becpg-dark-grey)]">
                    {labels.readOnly}
                </p>
            ) : null}

            {sections.length === 0 ? (
                <EmptyState variant="empty" icon="auto_awesome" title={labels.empty} message={labels.emptyHint} />
            ) : (
                <div className="flex flex-col gap-4">
                    {sections.map((section) => (
                        <Card key={section.key} title={section.title} subtitle={section.hint} padding="md">
                            <ul className="flex flex-col gap-2">
                                <AnimatePresence initial={!reduceMotion}>
                                    {section.items.map((suggestion, index) => (
                                        <SuggestionCard
                                            key={suggestion.id}
                                            suggestion={suggestion}
                                            status={statusOf(suggestion)}
                                            error={errors[suggestion.id]}
                                            labelFor={labelFor}
                                            labels={labels}
                                            lang={lang}
                                            index={index}
                                            readOnly={readOnly}
                                            revocable={revocableOf(suggestion)}
                                            onApply={() => apply(suggestion)}
                                            onRevoke={() => revoke(suggestion)}
                                            onDismiss={() => dismiss(suggestion)}
                                            onGoToChange={(change) => onGoToChange && onGoToChange(change)}
                                        />
                                    ))}
                                </AnimatePresence>
                            </ul>
                        </Card>
                    ))}
                </div>
            )}

            {summary && summary.total > 0 ? (
                <p className="mt-3 text-xs text-[var(--becpg-dark-grey)]">
                    {fill(labels.changes, { count: summary.total })}
                    {summary.averageConfidence !== null && summary.averageConfidence !== undefined
                        ? ` · ${summary.averageConfidence} %`
                        : ''}
                </p>
            ) : null}
        </div>
    );
}
