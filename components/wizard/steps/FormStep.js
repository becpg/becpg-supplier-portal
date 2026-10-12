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
 * and focused through `fieldDomId()`. When the link also names a language —
 * a multilingual field is missing per language — the scrolling still happens
 * here but the focusing does not: only `MlTextControl` can unfold the box that
 * language lives in, and it does it from `useFieldFocus()`.
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
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/wizard/steps/FormStep#LABELS', {
    fr: {
        comment: 'Commenter ce champ',
        comments: '{count} message(s) sur ce champ',
        catalogGap: 'Attendu par le catalogue de votre client',
        catalogGapLocale: 'Attendu par le catalogue de votre client en {locale}',
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
        catalogGap: 'Expected by your customer’s catalogue',
        catalogGapLocale: 'Expected by your customer’s catalogue in {locale}',
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
});

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
    const labels = pickLabels(LABELS, lang);
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
 * @param {number} [props.reloadNonce] bumped by the wizard when something wrote
 *        into the entity from outside the form — an applied AI suggestion
 * @param {string|null} [props.readOnlyReason]
 * @param {Object} [props.commentCounts] `{ 'bcpg:legalName': 2 }`
 * @param {{fields: {name: string, locale: string|null}[]}} [props.catalogGap] what the
 *        customer's catalogue expects on this step and does not find — see
 *        `catalogGapsByStep`. Marks the fields concerned; it never gates anything.
 * @param {Function} [props.onComment] `({ field, label }) => void`
 * @param {string|null} [props.focusField] a field to scroll to and focus
 * @param {string|null} [props.focusLocale] the language box the link aims at;
 *        scrolled to here, focused by `MlTextControl`
 * @param {Function} [props.onLoaded] `(definition) => void`
 * @param {Function} [props.onIssues] `(stepId, {count, labels}) => void` — the
 *        mandatory fields still blank, so the wizard can mark the step and refuse
 *        to finish. Reported, never enforced here: this step does not own
 *        "Terminer".
 * @param {boolean} [props.consultation=false] a review: no read-only notice
 * @param {string} [props.className]
 */
export function FormStep({
    entityId,
    step,
    params,
    autoSave,
    reloadNonce = 0,
    readOnlyReason = null,
    commentCounts = null,
    catalogGap = null,
    onComment,
    focusField = null,
    focusLocale = null,
    onLoaded,
    onIssues,
    consultation = false,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);

    const stepData = useApi(
        entityId && step ? `wizard/${encodeURIComponent(entityId)}/step/${encodeURIComponent(step.id)}` : null,
        { params },
    );

    const definition = stepData.data ? stepData.data.definition : null;
    const readOnly = Boolean(step && step.readOnly);

    /*
     * A write that did not come from this form — an applied suggestion — is only
     * visible once the step is read again. The wizard flushes the autosave
     * before bumping the counter, so nothing typed is lost to the reseed that
     * follows.
     */
    const refreshStep = stepData.refresh;
    const seenReload = useRef(reloadNonce);
    useEffect(() => {
        if (seenReload.current === reloadNonce) {
            return;
        }
        seenReload.current = reloadNonce;
        refreshStep();
    }, [reloadNonce, refreshStep]);

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
            if (Object.keys(values).length === 0) {
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
            form.markSaved(values);
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
     * The mandatory fields still empty, reported up to the wizard.
     *
     * `useFormState` already validates as the supplier types, but its verdict
     * stayed inside this component — which is unmounted as soon as the step
     * changes. Hence the defect: nothing said, on leaving the tab, that a
     * mandatory field was still empty, and "Terminer" did not care.
     *
     * Only the missing mandatory values are reported, not the format errors: a
     * value already stored that no longer satisfies a constraint is not an
     * unfinished input, and blocking submission on it would forbid returning a
     * sheet the supplier has no way to repair.
     *
     * Read-only fields are out of the count: a section frozen by the customer is
     * not the supplier's to fill. `validateForm` discards them on its own
     * (`skipReadOnly`), and a read-only step sees all its fields marked as such
     * by the server.
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

    /*
     * NOT READ YET IS NOT NOTHING TO REPORT.
     *
     * This report went out on the first render, before the definition had
     * arrived: `missing` was `[]` and the wizard recorded "nothing is missing".
     * A supplier merely walking past the step therefore saw it mark itself
     * finished, empty mandatory fields included. While the read is in flight,
     * the step says it has not ruled yet.
     */
    useEffect(() => {
        if (!onIssues || !step) {
            return;
        }
        if (!definition) {
            onIssues(step.id, { pending: true, count: 0, labels: [] });
            return;
        }
        onIssues(step.id, { count: missing.length, labels: missing });
    }, [onIssues, step, missing, definition]);

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
        if (focusLocale) {
            return;
        }
        const focusable = node.querySelector('input, textarea, select, button');
        if (focusable) {
            focusable.focus({ preventScroll: true });
        }
    }, [focusField, focusLocale, definition]);

    /*
     * `badgeFor` was removed along with the whole notion of confidence.
     *
     * It put a « Confiance élevée / moyenne / faible » badge next to a field
     * label, taken from the score of the suggestion that had touched it. The
     * score states a model's assurance about its own reading, not the accuracy
     * of the value: shown beside a field, it read as a certificate. The supplier
     * remains the sole judge of what he writes.
     */

    /*
     * THE CATALOGUE MARK, ON THE FIELD ITSELF.
     *
     * The rail already carries a dot per tab; it says which tab, never which
     * field. A supplier reading « 2 informations attendues » on a twelve-field
     * form had to open the conformity step and come back to know which two.
     *
     * Icon plus accessible name, never colour alone: the tone only reinforces
     * what the glyph and the label already say.
     */
    const catalogFields = useMemo(() => {
        const index = new Map();
        for (const gap of (catalogGap && catalogGap.fields) || []) {
            const locales = index.get(gap.name) || [];
            if (gap.locale) {
                locales.push(String(gap.locale).toUpperCase());
            }
            index.set(gap.name, locales);
        }
        return index;
    }, [catalogGap]);

    const badgeFor = useCallback(
        (field) => {
            if (!catalogFields.has(field.name)) {
                return null;
            }
            const locales = catalogFields.get(field.name);
            const title = locales.length > 0
                ? labels.catalogGapLocale.replace('{locale}', locales.join(', '))
                : labels.catalogGap;
            return (
                <span
                    title={title}
                    aria-label={title}
                    className="inline-flex items-center text-[var(--status-danger)]"
                >
                    <Icon name="rule" size={14} />
                </span>
            );
        },
        [catalogFields, labels],
    );

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
            {/* A reviewer reads, he does not try to write: no "read only" notice. */}
            {readOnly && !consultation ? (
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
                hideEmpty={consultation}
                entityNodeRef={entityId}
                formId={step.formId || undefined}
                itemType={step.itemId || undefined}
                lang={lang}
                badgeFor={badgeFor}
                actionFor={actionFor}
            />
        </div>
    );
}
