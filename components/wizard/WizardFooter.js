'use client';

/**
 * The wizard's action bar: previous / next / finish, plus the autosave state.
 *
 * Three things it is careful about.
 *
 * 1. **"Suivant" is not a save button.** Everything is already saved when the
 *    user gets here (spec §4.4, F2), so the button never blocks on a write; it
 *    only flushes what is pending, which is normally nothing. The wording says
 *    "Suivant", not "Enregistrer et continuer" — promising a save on click is
 *    exactly the V1 behaviour the redesign removes.
 * 2. **Finishing can be blocked, and the reason is written down.** A blocking
 *    catalogue that is not satisfied disables "Terminer" *and* says which
 *    catalogue and where to fix it — a disabled button with no explanation is
 *    the single most reported frustration of the current portal.
 * 3. **Reformulation is discreet.** It runs in the background between two steps
 *    (`nextStepWebScript`); the footer shows a thin hint, never a spinner over
 *    the form, and never prevents the user from carrying on.
 *
 * On a phone the bar is sticky at the bottom (`.sticky-actions`, above the
 * bottom nav) and the labels shrink to fit 360px.
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button, Icon, Spinner } from '@/components/ui/Button';
import { useMessages } from '@/lib/messages';
import { AutoSaveIndicator, AutoSaveReassurance } from '@/components/wizard/AutoSaveIndicator';

const LABELS = {
    fr: {
        previous: 'Précédent',
        next: 'Suivant',
        finish: 'Terminer',
        finishing: 'Envoi…',
        formulating: 'Recalcul en cours…',
        blocked: 'Finalisation bloquée',
        // Le même manque, sans la conséquence : en mode brouillon on peut rendre,
        // on doit quand même savoir ce qui reste.
        incomplete: 'Fiche incomplète',
    },
    en: {
        previous: 'Previous',
        next: 'Next',
        finish: 'Finish',
        finishing: 'Sending…',
        formulating: 'Recalculating…',
        blocked: 'Cannot finish yet',
        /* See the note on the French key. */
        incomplete: 'Sheet incomplete',
    },
};

/**
 * @param {Object} props
 * @param {Function} [props.onPrevious]
 * @param {Function} [props.onNext]
 * @param {Function} [props.onFinish] absent = the wizard cannot be completed from here
 * @param {boolean} [props.hasPrevious]
 * @param {boolean} [props.hasNext]
 * @param {Object} props.autoSave the `useAutoSave` instance
 * @param {boolean} [props.finishing] a completion request is in flight
 * @param {boolean} [props.finishDisabled]
 * @param {React.ReactNode} [props.finishReason] why finishing is blocked
 * @param {React.ReactNode} [props.finishLabel]
 * @param {boolean} [props.formulating] a background reformulation is running
 * @param {boolean} [props.draft] the wizard declares `draft` — "Terminer" on every step
 * @param {React.ReactNode} [props.extra] rendered on the left, before the indicator
 * @param {string} [props.className]
 */
export function WizardFooter({
    onPrevious,
    onNext,
    onFinish,
    hasPrevious = false,
    hasNext = false,
    autoSave,
    finishing = false,
    finishDisabled = false,
    finishReason = null,
    finishLabel,
    formulating = false,
    draft = false,
    extra = null,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const reduceMotion = useReducedMotion();

    /*
     * `draft` is a wizard attribute of the product's own configuration, and its
     * documented meaning is exactly this: "bouton Terminer toujours visible"
     * (spec §1.4). `getWizardState` has always returned it — every supplier
     * wizard of `config/wizards.default.js` declares `draft: true`, and Share
     * returns it too — but nothing consumed it, so the button only ever appeared
     * on the last step. A supplier who had finished filling in step 3 had to walk
     * to the end of the rail to submit.
     *
     * It stays subordinate to `onFinish`: a read-only wizard, or a task that is
     * already completed, still gets **no** button at all rather than a greyed one
     * (spec: hide, do not disable).
     */
    const showFinish = Boolean(onFinish) && (!hasNext || draft);

    return (
        <div className={`mt-4 ${className}`}>
            <AnimatePresence initial={false}>
                {formulating ? (
                    <motion.p
                        key="formulating"
                        initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                        className="mb-2 flex items-center gap-2 text-xs text-[var(--becpg-dark-grey)]"
                    >
                        <Spinner size={13} />
                        {labels.formulating}
                    </motion.p>
                ) : null}
            </AnimatePresence>

            {/* `finishReason` est affiché **même quand le bouton reste actif**.
                En mode brouillon la configuration autorise à rendre une fiche
                incomplète, mais le fournisseur doit savoir qu'elle l'est : taire
                le manque parce qu'il n'interdit rien, c'est le lui apprendre par
                le refus de son client. Le ton suit la conséquence — barrière
                orange quand c'est bloquant, note grise quand c'est un avis. */}
            {finishReason && showFinish ? (
                <div
                    className={[
                        'mb-2 flex items-start gap-2 rounded-xl border p-3',
                        finishDisabled
                            ? 'border-[var(--becpg-orange)] bg-[var(--becpg-orange)]/8'
                            : 'border-[var(--becpg-grey)] bg-[var(--becpg-grey)]/40',
                    ].join(' ')}
                >
                    <Icon
                        name={finishDisabled ? 'report' : 'info'}
                        size={20}
                        className={`shrink-0 ${finishDisabled ? 'text-[var(--becpg-orange)]' : 'text-[var(--becpg-dark-grey)]'}`}
                    />
                    <div className="min-w-0 text-sm">
                        <p className="font-medium text-[var(--becpg-blue)]">
                            {finishDisabled ? labels.blocked : labels.incomplete}
                        </p>
                        <div className="mt-0.5 text-[var(--becpg-dark-grey)]">{finishReason}</div>
                    </div>
                </div>
            ) : null}

            <div className="sticky-actions -mx-4 flex-wrap items-center rounded-none sm:mx-0 sm:rounded-xl">
                <div className="order-2 min-w-0 flex-1 sm:order-1">
                    {extra}
                    {autoSave ? (
                        <AutoSaveIndicator
                            status={autoSave.status}
                            savedAt={autoSave.savedAt}
                            error={autoSave.error}
                            onRetry={autoSave.retry}
                        />
                    ) : null}
                    {autoSave ? <AutoSaveReassurance status={autoSave.status} className="mt-0.5" /> : null}
                </div>

                <div className="order-1 flex w-full shrink-0 items-center gap-2 sm:order-2 sm:w-auto">
                    <Button
                        variant="outline"
                        icon="chevron_left"
                        onClick={onPrevious}
                        disabled={!hasPrevious}
                        className="flex-1 sm:flex-none"
                    >
                        {labels.previous}
                    </Button>

                    {hasNext ? (
                        <Button
                            variant="primary"
                            iconRight="chevron_right"
                            onClick={onNext}
                            className="flex-1 sm:flex-none"
                        >
                            {labels.next}
                        </Button>
                    ) : null}

                    {showFinish ? (
                        <Button
                            variant="accent"
                            icon="task_alt"
                            onClick={onFinish}
                            loading={finishing}
                            disabled={finishDisabled || finishing}
                            className="flex-1 sm:flex-none"
                        >
                            {finishing ? labels.finishing : finishLabel || labels.finish}
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
