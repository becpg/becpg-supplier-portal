'use client';

/**
 * The wizard's step navigation — two shapes, one state.
 *
 * - `variant="rail"` — the desktop left rail: the whole path is visible at once,
 *   which is what makes the redesign's inverted order legible (documents first,
 *   conformity last). Every visited step is a button.
 * - `variant="compact"` — the phone: a progress bar, the current step's name,
 *   and a selector opening the same list in a sheet. A vertical rail at 360px
 *   would eat the screen the form needs (spec §4.4, "utilisable sur un
 *   téléphone").
 *
 * ## Two rules
 *
 * 1. **No strict tunnel.** A step already visited is freely reachable
 *    (`isSelectable`); the wizard decides, the stepper only renders the verdict.
 * 2. **A frozen step is shown as frozen, never as done.** `frozen` comes from
 *    the single server-side security call (bug #25928) and is displayed with a
 *    lock: the supplier must understand that the client validated that list, not
 *    that he completed it.
 *
 * Nothing about any particular wizard is written here: the steps are whatever
 * the definition returned, in the order the wizard model built.
 */

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/ui/Button';
import { ListIcon } from '@/components/ui/ListIcon';
import { Modal } from '@/components/ui/Modal';
import { useMessages } from '@/lib/messages';
import { hasListIcon } from '@/lib/listIcons';

const LABELS = {
    fr: {
        title: 'Étapes',
        step: 'Étape {index} sur {total}',
        open: 'Choisir une étape',
        frozen: 'Validée par le client',
        readOnly: 'Lecture seule',
        done: 'Vue',
        current: 'Étape en cours',
        todo: 'Pas encore vue',
        locked: 'Disponible plus tard',
        progress: '{percent} % du parcours',
    },
    en: {
        title: 'Steps',
        step: 'Step {index} of {total}',
        open: 'Choose a step',
        frozen: 'Validated by the customer',
        readOnly: 'Read only',
        done: 'Visited',
        current: 'Current step',
        todo: 'Not visited yet',
        locked: 'Available later',
        progress: '{percent}% of the path',
    },
};

/** Icon shown in a step's bullet, by step kind. */
const KIND_ICONS = {
    documents: 'folder_open',
    suggestions: 'auto_awesome',
    form: 'edit_note',
    entityDataList: 'table_rows',
    survey: 'quiz',
    compliance: 'verified',
};

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])),
    );
}

/**
 * One entry of the list, shared by the rail and the sheet.
 */
function StepButton({ step, index, total, active, selectable, onSelect, labels, dense = false }) {
    const reduceMotion = useReducedMotion();
    const done = step.visited && !active;
    const icon = step.frozen
        ? 'lock'
        : done
          ? 'check'
          : KIND_ICONS[step.kind] || 'radio_button_unchecked';

    // The characteristic list this step edits, when it edits one — `null` for a
    // synthetic step and for a list beCPG ships no glyph for. `buildStepModel`
    // spreads the server step, so `listName` / `listId` survive into the model.
    const candidate = step.listName || step.listId || '';
    const listIconType = candidate && hasListIcon(candidate) ? candidate : null;

    /*
     * The state line is the button's accessible name, so it must describe the
     * button the user is actually offered.
     *
     * It used to fall through to "Disponible plus tard" for every step that was
     * not current, frozen, read-only or already visited — which is most of the
     * rail. MEASURED on a wizard sitting on step 7 of 12: "Documents · Étape 1
     * sur 12 · Disponible plus tard" on a button that was **enabled and
     * clickable**, next to "Allégations · Étape 9 sur 12 · Disponible plus tard"
     * that really was disabled. The same words for the two opposite states, and a
     * screen reader announcing "available later" on an actionable control.
     *
     * `selectable` is the very flag that drives `disabled` two lines below, so the
     * label now reads from it: a step you can reach is "pas encore vue", a step
     * you cannot is "disponible plus tard".
     */
    const state = active
        ? labels.current
        : step.frozen
          ? labels.frozen
          : step.readOnly
            ? labels.readOnly
            : done
              ? labels.done
              : selectable
                ? labels.todo
                : labels.locked;

    return (
        <li>
            <button
                type="button"
                disabled={!selectable}
                aria-current={active ? 'step' : undefined}
                onClick={() => onSelect(step.id)}
                className={[
                    'group flex w-full items-start gap-2.5 rounded-xl px-2 text-left transition-colors',
                    dense ? 'py-2.5' : 'py-2',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]',
                    active
                        ? 'bg-[var(--becpg-blue)]/8 text-[var(--becpg-blue)]'
                        : selectable
                          ? 'text-[var(--becpg-dark-grey)] hover:bg-[var(--becpg-grey)]/50 hover:text-[var(--becpg-blue)]'
                          : 'cursor-not-allowed text-[var(--becpg-dark-grey)]/60',
                ].join(' ')}
            >
                <span
                    aria-hidden="true"
                    className={[
                        'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium',
                        active
                            ? 'border-[var(--becpg-blue)] bg-[var(--becpg-blue)] text-white'
                            : done
                              ? 'border-[var(--becpg-green)] bg-[var(--becpg-green)]/25 text-[var(--becpg-blue)]'
                              : 'border-[var(--becpg-grey)] bg-white text-[var(--becpg-dark-grey)]',
                    ].join(' ')}
                >
                    {done || step.frozen || active ? <Icon name={icon} size={14} /> : index}
                </span>

                <span className="min-w-0 flex-1">
                    <span
                        className={[
                            'flex items-center gap-1.5 truncate text-sm',
                            active ? 'font-medium' : '',
                        ].join(' ')}
                    >
                        {/* Only for a step that IS a beCPG characteristic list.
                            A synthetic step (documents, suggestions, compliance)
                            has no glyph and must not borrow one — the numbered
                            status circle to its left already identifies it. */}
                        {listIconType ? <ListIcon type={listIconType} size={14} /> : null}
                        <span className="min-w-0 truncate">{step.label}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] opacity-70">
                        {fill(labels.step, { index, total })} · {state}
                    </span>
                </span>

                {step.badge ? (
                    <motion.span
                        initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mt-0.5 shrink-0"
                    >
                        {step.badge}
                    </motion.span>
                ) : null}
            </button>
        </li>
    );
}

/**
 * @param {Object} props
 * @param {Array<Object>} props.steps `{ id, label, kind, frozen, readOnly, visited, badge }`
 * @param {string} props.currentId
 * @param {(stepId: string) => void} props.onSelect
 * @param {(step: Object, index: number) => boolean} [props.isSelectable] defaults to "visited or current"
 * @param {'rail'|'compact'} [props.variant='rail']
 * @param {string} [props.className]
 */
export function WizardStepper({
    steps,
    currentId,
    onSelect,
    isSelectable,
    variant = 'rail',
    className = '',
}) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const [sheetOpen, setSheetOpen] = useState(false);

    const list = Array.isArray(steps) ? steps : [];
    const total = list.length;
    const currentIndex = Math.max(0, list.findIndex((step) => step.id === currentId));
    const selectable = (step, index) => (isSelectable ? isSelectable(step, index) : step.visited || step.id === currentId);

    const select = (stepId) => {
        setSheetOpen(false);
        onSelect(stepId);
    };

    if (total === 0) {
        return null;
    }

    if (variant === 'compact') {
        const current = list[currentIndex];
        const percent = total > 1 ? Math.round((currentIndex / (total - 1)) * 100) : 100;

        return (
            <div className={`min-w-0 ${className}`}>
                <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--becpg-blue)]">
                            {current ? current.label : ''}
                        </p>
                        <p className="text-xs text-[var(--becpg-dark-grey)]">
                            {fill(labels.step, { index: currentIndex + 1, total })}
                            {current && current.frozen ? ` · ${labels.frozen}` : ''}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSheetOpen(true)}
                        aria-label={labels.open}
                        className="touch-target inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--becpg-grey)] bg-white px-2.5 py-1.5 text-xs text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                    >
                        <Icon name="list" size={16} />
                        <span>{`${currentIndex + 1}/${total}`}</span>
                    </button>
                </div>

                <div
                    className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--becpg-grey)]"
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={fill(labels.progress, { percent })}
                >
                    <motion.div
                        className="h-full rounded-full bg-[var(--becpg-blue)]"
                        initial={false}
                        animate={{ width: `${Math.max(percent, 4)}%` }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                </div>

                <Modal open={sheetOpen} onClose={() => setSheetOpen(false)} title={labels.title} size="sm">
                    <ol className="flex flex-col gap-0.5">
                        {list.map((step, index) => (
                            <StepButton
                                key={step.id}
                                step={step}
                                index={index + 1}
                                total={total}
                                active={step.id === currentId}
                                selectable={selectable(step, index)}
                                onSelect={select}
                                labels={labels}
                                dense
                            />
                        ))}
                    </ol>
                </Modal>
            </div>
        );
    }

    return (
        <nav aria-label={labels.title} className={`min-w-0 ${className}`}>
            <ol className="flex flex-col gap-0.5">
                {list.map((step, index) => (
                    <StepButton
                        key={step.id}
                        step={step}
                        index={index + 1}
                        total={total}
                        active={step.id === currentId}
                        selectable={selectable(step, index)}
                        onSelect={select}
                        labels={labels}
                    />
                ))}
            </ol>
        </nav>
    );
}
