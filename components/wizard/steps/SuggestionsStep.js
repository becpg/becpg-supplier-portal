'use client';

/**
 * The becpg-ai suggestions step / panel.
 *
 * Nothing is applied without a click
 *
 * This component ranked proposals by confidence score and wrote the ones above
 * 90 % on its own authority: « Appliqué · 100 % », green badge, « annuler »
 * button. All of that is gone.
 *
 * A percentage states a model's confidence in its own reading; displayed as a
 * verdict, it read as a guarantee of correctness. And applying without asking
 * took away from the supplier the decision he answers for: he is the one
 * committing his sheet, not the extraction. Two gestures remain — apply,
 * dismiss — and a single list.
 *
 * The body is rendered according to its type
 *
 * `description` has not one shape but six, depending on the plugin that
 * produced it. {@link SuggestionBody} tells them apart the way becpg-ai's own
 * client does, instead of flattening everything into a sentence — which is
 * what made analyses unreadable. The longest ones open at full width.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import {
    SuggestionBody,
    hasTypedBody,
    isApplicableSuggestion,
    isWideSuggestion,
} from '@/components/wizard/SuggestionBody';
import { Modal } from '@/components/ui/Modal';
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
        expand: 'Agrandir',
        applyAnyway: 'Appliquer quand même',
        revoke: 'Annuler',
        restore: 'Revoir',
        applying: 'Application…',
        appliedAt: 'Appliqué',
        revoked: 'Annulé',
        dismissed: 'Ignoré',
        notRevocable:
            'La valeur précédente ne peut pas être rétablie automatiquement : modifiez le champ directement si besoin.',
        empty: 'Aucune suggestion',
        /*
         * No more « à l'étape précédente »: the technical sheet is no longer a
         * step, and suggestions are now scoped to the open step — "nothing
         * here" means "nothing FOR THIS STEP", not "nothing at all".
         * Pointing at a screen that no longer exists was the worse of the two
         * mistakes.
         */
        emptyHint:
            'Rien à proposer pour cette étape. La fiche technique se dépose juste au-dessus : '
            + 'l’extraction vous proposera les valeurs qu’elle y trouve.',
        emptyEntityLevel:
            'L’analyse a bien tourné, mais elle n’a produit que des déductions faites sur la fiche '
            + 'elle-même, sans document à l’appui : elles ne vous sont pas proposées.',
        // The analysis is asynchronous: becpg-ai acknowledges, its plugins run,
        // and the result arrives later. Until that was stated, the wait was
        // displayed as « Aucune suggestion » — that is, as a failure.
        analysing: 'Analyse en cours',
        analysingHint:
            'Le portail lit vos documents. Les propositions apparaîtront ici toutes seules, '
            + 'sans quitter la page : la lecture d’une fiche technique prend en général moins d’une minute.',
        analysingPlugins: 'En cours : {plugins}',
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
        expand: 'Expand',
        applyAnyway: 'Apply anyway',
        revoke: 'Undo',
        restore: 'Review',
        applying: 'Applying…',
        appliedAt: 'Applied',
        revoked: 'Undone',
        dismissed: 'Dismissed',
        notRevocable:
            'The previous value cannot be restored automatically: edit the field directly if needed.',
        empty: 'No suggestion',
        /* See the note on the French key. */
        emptyHint:
            'Nothing to propose for this step. The technical sheet is uploaded just above: '
            + 'the extraction will propose the values it finds there.',
        emptyEntityLevel:
            'The analysis did run, but it only produced deductions made from the sheet itself, '
            + 'with no document backing them: they are not offered to you.',
        /* See the note on the French keys. */
        analysing: 'Analysis in progress',
        analysingHint:
            'The portal is reading your documents. The proposals will appear here on their own, '
            + 'without leaving the page: reading a technical sheet usually takes under a minute.',
        analysingPlugins: 'Running: {plugins}',
        refresh: 'Run the analysis again',
        readOnly: 'This sheet is read-only: suggestions cannot be applied.',
        source: 'Source',
        changes: '{count} value(s)',
        error: 'Applying the suggestion failed.',
    },
};

/**
 * How long the step waits before re-reading while becpg-ai is still working.
 *
 * A cold run — read a PDF, call a model — was measured at ~22 s on dev-ai, so a
 * tighter interval would mostly re-ask a question already in flight; a much
 * looser one would leave the supplier looking at a spinner well after the
 * answer landed.
 */
const ANALYSIS_POLL_MS = 8000;

/** Upper bound on those re-reads, so a plugin that never closes cannot poll forever. */
const ANALYSIS_POLL_MAX = 15;

/** How many raw changes a card lists before it offers the rest. */
const MAX_CHANGES = 8;

/** A change laid out in two columns, when the card is not in the narrow panel. */
const CHANGE_COLUMNS = 'grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-baseline gap-x-3';

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

/*
 * THE ANALYSIS IS THE AUTHORITY ON WHAT IS APPLIED, NOT THIS BROWSER.
 *
 * « Appliqué » used to be written to `localStorage`, keyed by suggestion id, and
 * read back for ever. becpg-ai only proposes what is *not* already in place and
 * re-runs the moment the entity changes, so a suggestion that comes back in a
 * fresh run has, by definition, nothing in place: apply an ingredient, delete
 * it, and the proposal returned — under a card frozen on « Appliqué », with no
 * way to apply it again.
 *
 * The decision therefore lives exactly as long as the proposal it was taken on:
 * a list whose content changed resets it. Nothing to persist, and nothing to
 * invalidate.
 */

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
        /*
         * A locale map — `{ fr: "Sucre cristal", en: "Caster sugar" }`, what the
         * AI returns for a `d:mltext` field such as `bcpg:legalName`.
         *
         * None of the four keys tested below exists on such a map, so the
         * suggestion displayed « — », that is, empty: the supplier saw a
         * proposal with no value, on the field the AI reads most often.
         * Measured on 12/08.
         *
         * We render the reading language when it is present, the first one
         * available otherwise — prefixed with its locale, so an English
         * translation is not passed off as French.
         */
        const locales = Object.entries(value)
            .filter(([, text]) => typeof text === 'string' && text.trim() !== '');
        if (locales.length > 0 && locales.every(([key]) => /^[a-z]{2}(_[A-Za-z]{2})?$/.test(key))) {
            const own = locales.find(([key]) => key.toLowerCase().startsWith(lang));
            if (own) {
                return own[1];
            }
            const [locale, text] = locales[0];
            return `${locale} : ${text}`;
        }
        // `value.value` can be a map in turn: recurse through here rather than
        // let `String()` produce "[object Object]".
        const inner = value.displayValue ?? value.name ?? value.label ?? value.value;
        return inner === undefined || inner === null ? '—' : readableValue(inner, lang);
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
    t,
    readOnly,
    revocable,
    onApply,
    onRevoke,
    onExpand,
    index,
    compact = false,
}) {
    const reduceMotion = useReducedMotion();
    const [allChanges, setAllChanges] = useState(false);
    const applied = status === STATE.APPLIED;
    const applying = status === STATE.APPLYING;
    const wide = isWideSuggestion(suggestion);
    // An analysis has nothing to write: it is read, it is not applied.
    const applicable = isApplicableSuggestion(suggestion);

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
                    {/*
                        En panneau, la colonne fait une quinzaine de rem : un titre
                        comme « Nutriments extraits de la fiche technique "Fiche
                        technique fournisseur.pdf" » y tenait sur six lignes et
                        repoussait hors de vue les valeurs, qui sont l'information.
                        Il est donc borné à deux lignes, en gardant le titre entier
                        dans l'infobulle.
                    */}
                    <p
                        className={`text-sm font-medium text-[var(--becpg-blue)]${compact ? ' line-clamp-2' : ''}`}
                        title={compact ? (suggestion.title || labels.title) : undefined}
                    >
                        {suggestion.title || labels.title}
                    </p>

                </div>
                {/*
                    Le badge de confiance a disparu, et « Appliqué · 100 % » avec
                    lui. Un pourcentage d'assurance d'un modèle sur sa propre
                    lecture se lisait comme une garantie d'exactitude ; il ne
                    l'était pas, et il n'a jamais eu à décider à la place du
                    fournisseur.

                    À sa place, quand le corps ne tient pas dans la colonne : de
                    quoi l'ouvrir en grand.
                */}
                {wide && onExpand ? (
                    <Button variant="ghost" size="sm" icon="open_in_full" onClick={onExpand}>
                        {labels.expand}
                    </Button>
                ) : null}
            </div>

            <SuggestionBody suggestion={suggestion} compact={compact} />

            {/*
                La liste brute des changements ne s'affiche QUE si le corps typé
                n'a rien rendu : sinon les deux répètent la même chose, la
                seconde en qnames.
            */}
            {!hasTypedBody(suggestion) && suggestion.changes && suggestion.changes.length > 0 ? (
                <>
                    <ul className="mt-2 flex flex-col gap-1">
                        {(allChanges ? suggestion.changes : suggestion.changes.slice(0, MAX_CHANGES))
                            .map((change, position) => (
                                <li
                                    key={`${change.scope}-${change.listName || ''}-${change.name}-${position}`}
                                    className={`${compact ? 'flex flex-col gap-0.5' : CHANGE_COLUMNS} rounded-lg bg-[var(--becpg-grey)]/40 px-2 py-1 text-sm`}
                                >
                                    {/* The label is never shortened: it is what says which
                                        field the value belongs to. */}
                                    <span className="break-words text-xs text-[var(--becpg-dark-grey)]">
                                        {labelFor(change)}
                                    </span>
                                    <span className="break-words font-medium text-[var(--becpg-blue)]">
                                        {readableValue(change.value, lang)}
                                    </span>
                                </li>
                            ))}
                    </ul>
                    {/* Le compte des valeurs restantes était une phrase grise :
                        il annonçait ce qu'il ne donnait pas. C'est le bouton qui
                        les ouvre. */}
                    {suggestion.changes.length > MAX_CHANGES ? (
                        <button
                            type="button"
                            onClick={() => setAllChanges((current) => !current)}
                            aria-expanded={allChanges}
                            className="mt-1 inline-flex items-center gap-1 rounded-lg px-1 py-0.5 text-xs text-[var(--becpg-dark-grey)] hover:text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                        >
                            <Icon name={allChanges ? 'expand_less' : 'expand_more'} size={14} />
                            {allChanges
                                ? t('action.showLess')
                                : t('action.showMore', { count: suggestion.changes.length - MAX_CHANGES })}
                        </button>
                    ) : null}
                </>
            ) : null}

            {status === STATE.ERROR && error ? (
                <p className="mt-1.5 text-xs text-[var(--status-danger,#d32f2f)]">{labels.error}</p>
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

                {!readOnly && !applied && applicable ? (
                    <Button variant="primary" size="sm" icon="check" onClick={onApply} loading={applying}>
                        {labels.apply}
                    </Button>
                ) : null}

                {/*
                    « Ignorer » a été retiré.
                
                    Il n'écartait la proposition que dans ce navigateur, sans rien
                    dire à personne — et posé à côté d'« Appliquer », il laissait
                    entendre que l'autre bouton engageait quelque chose de
                    symétrique et définitif. Une suggestion qu'on ne veut pas, on
                    ne l'applique pas : c'est déjà l'action par défaut.
                */}

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
 * @param {{running: boolean, plugins: string[]}|null} [props.analysis] becpg-ai's own
 *        progress, from the `Loading` / `LoadingComplete` envelopes
 * @param {boolean} [props.loading] nothing to show yet
 * @param {boolean} [props.refreshing] a re-read is in flight over what is shown
 * @param {Error} [props.error]
 * @param {Function} [props.onRefresh]
 * @param {boolean} [props.readOnly]
 * @param {Function} [props.onApplied] `(suggestion) => void` — the wizard refreshes the steps
 * @param {Function} [props.labelForField] `(name) => string` — the dictionary label when known
 * @param {string} [props.className]
 */
export function SuggestionsStep({
    entityId,
    entityType,
    suggestions = [],
    summary = null,
    entityLevelDropped = 0,
    analysis = null,
    loading = false,
    refreshing = false,
    error = null,
    onRefresh,
    readOnly = false,
    onApplied,
    labelForField,
    variant = 'step',
    className = '',
}) {
    const { lang, t } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const toast = useToast();
    const reduceMotion = useReducedMotion();

    /*
     * The suggestion opened at full size, or `null`.
     *
     * A regulatory analysis or a document review spans several paragraphs: in a
     * fifteen-rem column it is unreadable, however much care goes into the
     * card. Rather than widening the panel for everyone, the suggestion opens
     * here at full width, on demand.
     */
    const [expanded, setExpanded] = useState(null);

    const [statuses, setStatuses] = useState({});
    const [errors, setErrors] = useState({});

    /*
     * A fresh analysis clears what was decided on the previous one — see the
     * note above. Adjusted during render rather than in an effect, so no frame
     * is ever painted with the old verdicts over the new list (the pattern
     * `useApi` uses on a key change).
     *
     * WHAT COUNTS AS "FRESH" IS THE CONTENT, not the array. Applying now re-reads
     * the panel, and a re-read that brings back the very same proposals must not
     * wipe the « Appliqué » the supplier has just earned — his click would look
     * as if it had done nothing. `id` cannot arbitrate that: it is built from the
     * plugin, the document and the title, never from the values.
     */
    const signature = useMemo(
        () => suggestions
            .map((item) => [item.id, item.rawDescription || '', JSON.stringify(item.changes || [])].join('|'))
            .join('\n'),
        [suggestions],
    );
    const [seenSignature, setSeenSignature] = useState(signature);
    if (seenSignature !== signature) {
        setSeenSignature(signature);
        setStatuses({});
        setErrors({});
    }

    const analysing = Boolean(analysis && analysis.running);

    /*
     * **The analysis finishes on its own, so the screen must too.**
     *
     * becpg-ai answers immediately with the plugins it has started and computes
     * in the background; the result only exists on a *later* call. Announcing
     * "analyse en cours" and then waiting for the supplier to press *Relancer
     * l'analyse* would be asking them to poll by hand — and *Relancer* does not
     * even mean "check", it means "run it again".
     *
     * So while at least one plugin is running the step re-reads on its own, on a
     * fixed interval, and stops the moment nothing is running. Bounded by
     * {@link ANALYSIS_POLL_MAX}: an instance whose `LoadingComplete` never
     * arrives — a plugin that died without closing its `Flux` — must not leave a
     * browser polling for the rest of the day.
     */
    const pollsRef = useRef(0);
    useEffect(() => {
        if (!analysing || !onRefresh) {
            pollsRef.current = 0;
            return undefined;
        }
        if (pollsRef.current >= ANALYSIS_POLL_MAX) {
            return undefined;
        }
        const timer = setTimeout(() => {
            pollsRef.current += 1;
            onRefresh();
        }, ANALYSIS_POLL_MS);
        return () => clearTimeout(timer);
    }, [analysing, onRefresh, suggestions]);

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
        (suggestion) => statuses[suggestion.id] || STATE.PROPOSED,
        [statuses],
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
        [readOnly, onApplied, toast],
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
        [readOnly, snapshot, entityId, entityType, onApplied, toast],
    );

    /*
     * Nothing is applied on its own. A suggestion at 95 % used to be applied on
     * arrival at the step, green badge and « révoquer » button — that is what
     * spec §4.4 described, and it was removed on request.
     *
     * The reason fits in one sentence: the supplier signs the sheet. Writing in
     * his fields without a click of his makes him own a value a machine read in
     * a PDF, and being able to revoke does not fix that — he has to notice
     * first. Confidence still sorts and colours the proposals; it no longer
     * decides in his place.
     *
     * `autoApplicable` stays in the adapter payload: it is the AI reporting on
     * its own certainty, and nothing forces a screen to turn it into an action.
     */

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

    /*
     * A SINGLE LIST.
     *
     * They used to be split across four sections — « Appliqué automatiquement »,
     * « À confirmer », « Signalé », « Sans score » — by confidence percentage.
     * The ranking went away with automatic application: it scattered proposals
     * of the same nature across four boxes, and its first section claimed a
     * value was already set.
     *
     * The order is becpg-ai's, which sends its plugins in the order it runs
     * them.
     */

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


    /*
     * In panel mode, the title and subtitle are those of the containing
     * section: repeating them would steal half of an already narrow column. The
     * refresh button stays — the analysis can be restarted by hand — but in its
     * most discreet form.
     */
    const inPanel = variant === 'panel';

    /*
     * « Relancer l'analyse » spins while the run it started is under way.
     *
     * `loading` alone was false as soon as there was a list to show, so the
     * button answered a click with nothing at all for the up-to-180 s becpg-ai
     * takes — and becpg-ai caches per plugin on the entity's modification date,
     * so on an unchanged sheet the answer is also identical. Pressed twice, then
     * left alone: it looked broken because nothing said it was working.
     */
    const running = loading || refreshing || analysing;

    return (
        <div className={`min-w-0 ${className}`}>
            {inPanel ? (
                onRefresh ? (
                    <div className="mb-2 flex justify-end">
                        <Button variant="ghost" size="sm" icon="refresh" onClick={onRefresh} loading={running}>
                            {labels.refresh}
                        </Button>
                    </div>
                ) : null
            ) : (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                        <h3 className="text-base font-medium text-[var(--becpg-blue)]">{labels.title}</h3>
                        <p className="text-sm text-[var(--becpg-dark-grey)]">{labels.subtitle}</p>
                    </div>
                    {onRefresh ? (
                        <Button variant="outline" size="sm" icon="refresh" onClick={onRefresh} loading={running}>
                            {labels.refresh}
                        </Button>
                    ) : null}
                </div>
            )}

            {readOnly ? (
                <p className="mb-3 rounded-xl border border-[var(--becpg-grey)] bg-[var(--becpg-grey)]/40 p-3 text-sm text-[var(--becpg-dark-grey)]">
                    {labels.readOnly}
                </p>
            ) : null}

            {suggestions.length === 0 && analysing ? (
                /* Not the "empty" state: nothing is missing, the answer is not
                   there yet. Naming the plugins is what makes the wait credible
                   — it is the same wording becpg-ai streams. */
                <div
                    role="status"
                    aria-live="polite"
                    className="flex items-start gap-3 rounded-xl border border-[var(--becpg-grey)] bg-[var(--becpg-grey)]/40 p-4"
                >
                    <span className="skeleton mt-0.5 h-5 w-5 shrink-0 rounded-full" aria-hidden="true" />
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--becpg-blue)]">{labels.analysing}</p>
                        <p className="mt-0.5 text-sm text-[var(--becpg-dark-grey)]">{labels.analysingHint}</p>
                        {analysis.plugins.length > 0 ? (
                            <p className="mt-1 text-xs text-[var(--becpg-dark-grey)]">
                                {fill(labels.analysingPlugins, { plugins: analysis.plugins.join(' · ') })}
                            </p>
                        ) : null}
                    </div>
                </div>
            ) : suggestions.length === 0 ? (
                <EmptyState
                    variant="empty"
                    icon="auto_awesome"
                    title={labels.empty}
                    message={
                        entityLevelDropped > 0
                            ? `${labels.emptyHint} ${labels.emptyEntityLevel}`
                            : labels.emptyHint
                    }
                />
            ) : (
                <ul className="flex flex-col gap-2">
                    <AnimatePresence initial={!reduceMotion}>
                        {suggestions.map((suggestion, index) => (
                            <SuggestionCard
                                key={suggestion.id}
                                suggestion={suggestion}
                                status={statusOf(suggestion)}
                                error={errors[suggestion.id]}
                                labelFor={labelFor}
                                labels={labels}
                                lang={lang}
                                t={t}
                                index={index}
                                compact={inPanel}
                                readOnly={readOnly}
                                revocable={revocableOf(suggestion)}
                                onApply={() => apply(suggestion)}
                                onRevoke={() => revoke(suggestion)}
                                onExpand={() => setExpanded(suggestion)}
                            />
                        ))}
                    </AnimatePresence>
                </ul>
            )}

            {summary && summary.total > 0 ? (
                <p className="mt-3 text-xs text-[var(--becpg-dark-grey)]">
                    {fill(labels.changes, { count: summary.total })}
                </p>
            ) : null}

            {/* La suggestion en pleine largeur — voir `expanded`. */}
            <Modal
                open={Boolean(expanded)}
                onClose={() => setExpanded(null)}
                title={expanded ? (expanded.title || labels.title) : ''}
                size="lg"
            >
                {expanded ? <SuggestionBody suggestion={expanded} /> : null}
            </Modal>
        </div>
    );
}
