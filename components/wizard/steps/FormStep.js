'use client';

/**
 * A `form` step: the entity's properties, rendered from the definition Share
 * resolved, saved as you type.
 *
 * There is **no field list here**, and there never will be: `FormRenderer`
 * renders whatever `GET /api/v1/wizard/{entityId}/step/{stepId}` returned
 * (contracts §1 and §8). This file only wires four things around it.
 *
 * 1. **Autosave** (spec §4.4, F2). Every change schedules a debounced write of
 *    the *dirty fields only*, and the baseline moves only once the server
 *    confirmed — so a failed save leaves the field dirty and the next attempt
 *    still carries it. `formulate: false`: a keystroke must never trigger a
 *    reformulation; that happens once, when the step is left (`Wizard.js`).
 * 2. **Read-only / frozen**, taken verbatim from the step computed by the single
 *    server-side security call (bug #25928) — never re-derived here.
 * 3. **Comments anchored on the field** (spec §4.4): every label carries a
 *    discreet button that opens the discussion *on that field*, with the number
 *    of messages already written on it.
 * 4. **AI badges on the field**, using the confidence the server bucketed — and
 *    nothing at all when there is no score.
 *
 * `focusField` is how the conformity step's "champ manquant" links land: the
 * wizard switches to this step and passes the field name, which is scrolled to
 * and focused through `fieldDomId()`.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Icon } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { FormRenderer } from '@/components/form/FormRenderer';
import { fieldDomId } from '@/components/form/FieldRenderer';
import { useFormState } from '@/components/form/useFormState';
import { isEmptyValue } from '@/components/form/validation';
import { api, useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        comment: 'Commenter ce champ',
        comments: '{count} message(s) sur ce champ',
        frozenTitle: 'Section validée par votre client',
        frozenText:
            'Votre client a validé ces informations : elles sont figées et ne peuvent plus être modifiées. Si une correction est nécessaire, demandez leur réouverture via la discussion.',
        readAccessTitle: 'Consultation seule',
        readAccessText: 'Vous n’avez pas les droits d’écriture sur cette fiche.',
        noTaskTitle: 'Aucune tâche en cours',
        noTaskText:
            'Cette fiche ne vous est pas assignée en ce moment : vous pouvez la consulter, pas la modifier.',
        readOnlyTitle: 'Lecture seule',
        readOnlyText: 'Cette étape ne peut pas être modifiée.',
    },
    en: {
        comment: 'Comment this field',
        comments: '{count} message(s) on this field',
        frozenTitle: 'Section validated by your customer',
        frozenText:
            'Your customer validated this information: it is frozen and can no longer be modified. If a correction is needed, ask for it to be reopened through the discussion.',
        readAccessTitle: 'Read only',
        readAccessText: 'You do not have write access on this sheet.',
        noTaskTitle: 'No open task',
        noTaskText: 'This sheet is not assigned to you right now: you can read it, not modify it.',
        readOnlyTitle: 'Read only',
        readOnlyText: 'This step cannot be modified.',
    },
};

/**
 * Explains **why** a step cannot be edited, instead of showing a wall of greyed
 * inputs. Lives here because the form step was the first to need it; the
 * documents and suggestions steps import it rather than paraphrasing it.
 *
 * @param {Object} props
 * @param {'frozen'|'readAccess'|'noAssignedTask'|'wizardReadOnly'|null} props.reason
 * @param {string} [props.lang='fr']
 */
export function StepReadOnlyNotice({ reason, lang = 'fr', className = '' }) {
    const labels = LABELS[lang] || LABELS.fr;
    const byReason = {
        frozen: { icon: 'verified', title: labels.frozenTitle, text: labels.frozenText, accent: true },
        readAccess: { icon: 'visibility', title: labels.readAccessTitle, text: labels.readAccessText },
        noAssignedTask: { icon: 'assignment_late', title: labels.noTaskTitle, text: labels.noTaskText },
        wizardReadOnly: { icon: 'lock', title: labels.readOnlyTitle, text: labels.readOnlyText },
    };
    const notice = byReason[reason] || byReason.wizardReadOnly;

    return (
        <div
            role="status"
            className={[
                'mb-3 flex items-start gap-3 rounded-xl border p-3',
                notice.accent
                    ? 'border-[var(--becpg-orange)] bg-[var(--becpg-orange)]/8'
                    : 'border-[var(--becpg-grey)] bg-[var(--becpg-grey)]/40',
                className,
            ].join(' ')}
        >
            <Icon
                name={notice.icon}
                size={22}
                className={notice.accent ? 'text-[var(--becpg-orange)]' : 'text-[var(--becpg-dark-grey)]'}
            />
            <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--becpg-blue)]">{notice.title}</p>
                <p className="mt-0.5 text-sm text-[var(--becpg-dark-grey)]">{notice.text}</p>
            </div>
        </div>
    );
}

/**
 * @param {Object} props
 * @param {string} props.entityId entity nodeRef
 * @param {Object} props.step the computed step (`readOnly` / `frozen` included)
 * @param {Object} [props.params] query params forwarded to the API (`wizardId`, `siteId`)
 * @param {Object} props.autoSave the wizard's `useAutoSave` instance
 * @param {string|null} [props.readOnlyReason]
 * @param {Object} [props.commentCounts] `{ 'bcpg:legalName': 2 }`
 * @param {Function} [props.onComment] `({ field, label }) => void`
 * @param {string|null} [props.focusField] a field to scroll to and focus
 * @param {Function} [props.onLoaded] `(definition) => void`
 * @param {Function} [props.onIssues] `(stepId, {count, labels}) => void` — the
 *        mandatory fields still blank, so the wizard can mark the step and refuse
 *        to finish. Reported, never enforced here: this step does not own
 *        "Terminer".
 * @param {string} [props.className]
 */
export function FormStep({
    entityId,
    step,
    params,
    autoSave,
    readOnlyReason = null,
    commentCounts = null,
    onComment,
    focusField = null,
    onLoaded,
    onIssues,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;

    const stepData = useApi(
        entityId && step ? `wizard/${encodeURIComponent(entityId)}/step/${encodeURIComponent(step.id)}` : null,
        { params },
    );

    const definition = stepData.data ? stepData.data.definition : null;
    const readOnly = Boolean(step && step.readOnly);

    // The form state is read by the save task through a ref: the task runs long
    // after the render that scheduled it, and must see the values as they are
    // *then*, not as they were when it was created.
    const formRef = useRef(null);

    const scheduleSave = useCallback(() => {
        if (readOnly || !autoSave) {
            return;
        }
        autoSave.schedule(async () => {
            const form = formRef.current;
            if (!form) {
                return null;
            }
            const values = form.changes();
            const names = Object.keys(values);
            if (names.length === 0) {
                return null;
            }
            const result = await api.put(
                `wizard/${encodeURIComponent(entityId)}/step/${encodeURIComponent(step.id)}`,
                // The reformulation is NOT run per keystroke: the wizard runs it
                // once, when the step is left (spec §4.4).
                { values, formulate: false },
                { params },
            );
            // Confirm exactly what was sent — a field edited during the round
            // trip stays dirty and goes out with the next save.
            form.markSaved(names);
            return result;
        // Keyed by step: leaving this step while its save is pending — or has
        // failed — must not let the next step's first keystroke evict what was
        // typed here. The task reads `formRef` through a ref that outlives the
        // unmount, so it stays sendable from anywhere in the wizard.
        }, { key: step.id });
    }, [autoSave, entityId, step, params, readOnly]);

    const form = useFormState({
        definition,
        onDirty: scheduleSave,
        validateOnChange: true,
        lang,
    });
    // Refreshed after every render rather than during it: `changes()` and
    // `markSaved()` are stable callbacks over refs, so even the previous
    // render's instance reads the current values.
    useEffect(() => {
        formRef.current = form;
    });

    const loadedRef = useRef(null);
    useEffect(() => {
        if (definition && onLoaded && loadedRef.current !== definition) {
            loadedRef.current = definition;
            onLoaded(definition);
        }
    }, [definition, onLoaded]);

    /*
     * **Les obligatoires encore vides, remontés à l'assistant.**
     *
     * `useFormState` valide déjà au fil de la saisie, mais son verdict restait
     * dans ce composant — qui est démonté dès qu'on change d'étape. D'où le
     * défaut : rien n'indiquait, en quittant l'onglet, qu'il y restait un champ
     * obligatoire vide, et *Terminer* ne s'en souciait pas.
     *
     * On ne remonte que le **manquant obligatoire**, pas les erreurs de format :
     * une valeur déjà en base qui ne satisfait plus une contrainte n'est pas une
     * saisie inachevée, et bloquer la clôture dessus interdirait de rendre une
     * fiche que le fournisseur n'a aucun moyen de réparer.
     *
     * Les champs en lecture seule sont hors du compte : une section gelée par le
     * client n'est pas au fournisseur de la remplir. `validateForm` les écarte
     * de lui-même (`skipReadOnly`), et un pas en lecture seule voit tous ses
     * champs marqués tels par le serveur.
     */
    const missing = useMemo(() => {
        if (readOnly || !definition) {
            return [];
        }
        const fields = Array.isArray(definition.fields) ? definition.fields : [];
        return fields
            .filter((field) => field
                && field.name
                && field.mandatory
                && !field.readOnly
                && !field.protectedField
                && isEmptyValue(form.values[field.name]))
            .map((field) => field.label || field.name);
    }, [definition, readOnly, form.values]);

    useEffect(() => {
        if (!onIssues || !step) {
            return;
        }
        onIssues(step.id, { count: missing.length, labels: missing });
    }, [onIssues, step, missing]);

    // "Champ manquant" links from the conformity step land here.
    useEffect(() => {
        if (!focusField || !definition) {
            return;
        }
        const field = (definition.fields || []).find(
            (entry) => entry.name === focusField || entry.id === focusField,
        );
        if (!field) {
            return;
        }
        const node = document.getElementById(fieldDomId(field));
        if (!node) {
            return;
        }
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusable = node.querySelector('input, textarea, select, button');
        if (focusable) {
            focusable.focus({ preventScroll: true });
        }
    }, [focusField, definition]);

    /*
     * `badgeFor` a été supprimé avec la notion de confiance.
     *
     * Il posait sur le libellé d'un champ un badge « Confiance élevée / moyenne /
     * faible » tiré du score de la suggestion qui l'avait touché. Le score dit
     * l'assurance d'un modèle sur sa propre lecture, pas l'exactitude de la
     * valeur : affiché à côté d'un champ, il se lisait comme un certificat. Le
     * fournisseur reste seul juge de ce qu'il inscrit.
     */

    const actionFor = useCallback(
        (field) => {
            if (!onComment) {
                return null;
            }
            const count = commentCounts ? commentCounts[field.name] || 0 : 0;
            return (
                <button
                    type="button"
                    onClick={() => onComment({ field: field.name, label: field.label || field.name })}
                    title={count > 0 ? labels.comments.replace('{count}', count) : labels.comment}
                    aria-label={count > 0 ? labels.comments.replace('{count}', count) : labels.comment}
                    className="inline-flex items-center gap-0.5 rounded px-1 text-[var(--becpg-dark-grey)] hover:text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                >
                    <Icon name={count > 0 ? 'forum' : 'add_comment'} size={15} />
                    {count > 0 ? <span className="text-[11px]">{count}</span> : null}
                </button>
            );
        },
        [onComment, commentCounts, labels],
    );

    if (stepData.error) {
        return <ErrorState error={stepData.error} onRetry={stepData.refresh} />;
    }
    if (stepData.loading && !definition) {
        return (
            <div className={`flex flex-col gap-3 ${className}`}>
                <SkeletonCard lines={4} />
                <SkeletonCard lines={4} />
            </div>
        );
    }

    return (
        <div className={`min-w-0 ${className}`}>
            {readOnly ? (
                <StepReadOnlyNotice
                    reason={step.frozen ? 'frozen' : readOnlyReason || 'wizardReadOnly'}
                    lang={lang}
                />
            ) : null}

            <FormRenderer
                definition={definition}
                values={form.values}
                errors={form.errors}
                mode={readOnly ? 'view' : 'edit'}
                readOnly={readOnly}
                onChange={form.setValue}
                entityNodeRef={entityId}
                formId={step.formId || undefined}
                itemType={step.itemId || undefined}
                lang={lang}
                actionFor={actionFor}
            />
        </div>
    );
}
