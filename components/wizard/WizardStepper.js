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
        // What the rail could not express: a step opened, left, and incomplete.
        // It showed as « Vue », green check included.
        incomplete: '{count} obligatoire(s) manquant(s)',
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
        /* See the note on the French key. */
        incomplete: '{count} mandatory missing',
        progress: '{percent}% of the path',
    },
};

/** Icon shown in a step's bullet, by step kind. */
const KIND_ICONS = {
    technicalSheet: 'description',
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
 * One entry of the list, collapsed to its bullet.
 *
 * The rail costs 208px of a grid the supplier is typing into, and on a datalist
 * step that is three columns. Collapsed it costs 52px — but the label may not
 * simply disappear: these are **beCPG's own translated labels**, they are how a
 * supplier knows which list he is on, and « Allergènes » and « Allégations »
 * are two letters apart.
 *
 * So the label is kept three ways over: as the button's accessible name, as its
 * native `title` (which is also what a long press shows on a touch screen), and
 * as a flyout that opens on hover **and on keyboard focus** — the last one being
 * the reason it is drawn here rather than left to `title` alone, since a
 * keyboard user never gets a native tooltip.
 */
function CollapsedStepButton({ step, index, total, active, selectable, onSelect, labels, state, icon, listIconType }) {
    const name = `${step.label} · ${fill(labels.step, { index, total })} · ${state}`;
    const incomplete = Boolean(step.issues && step.issues.count > 0);
    return (
        <li>
            <button
                type="button"
                disabled={!selectable}
                aria-current={active ? 'step' : undefined}
                aria-label={name}
                title={name}
                onClick={() => onSelect(step.id)}
                className={[
                    'group relative flex w-full items-center justify-center rounded-xl py-1.5 transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]',
                    active
                        ? 'bg-[var(--becpg-blue)]/8'
                        : selectable
                          ? 'hover:bg-[var(--becpg-grey)]/50'
                          : 'cursor-not-allowed opacity-60',
                ].join(' ')}
            >
                <span
                    aria-hidden="true"
                    className={[
                        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium',
                        incomplete
                            ? 'border-[var(--status-warn)] bg-[var(--status-warn-bg)] text-[var(--status-warn)]'
                            : active
                              ? 'border-[var(--becpg-blue)] bg-[var(--becpg-blue)] text-white'
                              : step.visited && step.evaluated !== false
                                ? 'border-[var(--becpg-green)] bg-[var(--becpg-green)]/25 text-[var(--becpg-blue)]'
                                : 'border-[var(--becpg-grey)] bg-white text-[var(--becpg-dark-grey)]',
                    ].join(' ')}
                >
                    {incomplete || step.visited || step.frozen || active ? <Icon name={icon} size={15} /> : index}
                </span>
                {/*
                  * The label, on hover and on focus. `pointer-events-none` so it
                  * can never sit between the pointer and the next step, and
                  * `aria-hidden` because the button already carries the same text
                  * as its accessible name — a screen reader must not read it twice.
                  */}
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-full top-1/2 z-40 ml-1 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-[var(--becpg-grey)] bg-white px-2 py-1 text-xs text-[var(--becpg-blue)] shadow-[var(--becpg-shadow-overlay)] group-hover:block group-focus-visible:block"
                >
                    <span className="inline-flex items-center gap-1.5">
                        {listIconType ? <ListIcon type={listIconType} size={14} /> : null}
                        {step.label}
                    </span>
                </span>
            </button>
        </li>
    );
}

/**
 * One entry of the list, shared by the rail and the sheet.
 */
function StepButton({ step, index, total, active, selectable, onSelect, labels, dense = false, collapsed = false }) {
    const reduceMotion = useReducedMotion();
    // A step the supplier opened and left with a mandatory answer still blank.
    // It must NOT read as done: a green check on a step that blocks the
    // completion is the rail contradicting the button.
    const incomplete = Boolean(step.issues && step.issues.count > 0);
    const seen = step.visited && !active && !incomplete;
    /*
     * VUE N'EST PAS VÉRIFIÉE.
     *
     * `evaluated === false` : l'étape a été ouverte mais n'a pas eu le temps de
     * dire si elle était complète — le fournisseur n'a fait que passer. Le rail
     * l'annonce toujours « Vue », parce qu'elle l'est, mais sans la coche verte :
     * celle-ci affirmerait une vérification qui n'a pas eu lieu (#35846). Une
     * étape qui ne rend jamais de verdict — une liste, les documents — n'a pas
     * cette clé et reste terminée dès qu'elle est vue.
     */
    const done = seen && step.evaluated !== false;
    const icon = step.frozen
        ? 'lock'
        : incomplete
          ? 'error_outline'
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
    // `incomplete` wins over every other wording, including "current": it is the
    // one state that stops the supplier from finishing, so it is the one the
    // accessible name has to carry.
    const state = incomplete
        ? fill(labels.incomplete, { count: step.issues.count })
        : active
          ? labels.current
          : step.frozen
            ? labels.frozen
            : step.readOnly
              ? labels.readOnly
              : seen
                ? labels.done
                : selectable
                  ? labels.todo
                  : labels.locked;

    if (collapsed) {
        return (
            <CollapsedStepButton
                step={step}
                index={index}
                total={total}
                active={active}
                selectable={selectable}
                onSelect={onSelect}
                labels={labels}
                state={state}
                icon={icon}
                listIconType={listIconType}
            />
        );
    }

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
                        // Never colour alone: the icon changes with the state
                        // (`error_outline` here), and the accessible name says it
                        // in words — AGENTS.md, "status is never conveyed by
                        // colour alone".
                        incomplete
                            ? 'border-[var(--status-warn)] bg-[var(--status-warn-bg)] text-[var(--status-warn)]'
                            : active
                              ? 'border-[var(--becpg-blue)] bg-[var(--becpg-blue)] text-white'
                              : done
                                ? 'border-[var(--becpg-green)] bg-[var(--becpg-green)]/25 text-[var(--becpg-blue)]'
                                : 'border-[var(--becpg-grey)] bg-white text-[var(--becpg-dark-grey)]',
                    ].join(' ')}
                >
                    {incomplete || done || step.frozen || active ? <Icon name={icon} size={14} /> : index}
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
 * @param {boolean} [props.collapsed=false] rail reduced to its bullets — see
 *   {@link CollapsedStepButton} for how the labels stay reachable
 * @param {React.ReactNode} [props.footer] rendered under the rail (the expand button)
 * @param {string} [props.className]
 */
export function WizardStepper({
    steps,
    currentId,
    onSelect,
    isSelectable,
    variant = 'rail',
    collapsed = false,
    footer = null,
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
        /*
          * `z-30` is what lets the collapsed rail's labels be read.
          *
          * The flyout is absolutely positioned outside the 52px column, and the
          * step content beside it is a card on a white surface that comes later
          * in the document: measured, the label was drawn *under* it and only a
          * 4px sliver showed. Raising the rail — the whole rail, so the labels of
          * every step behave the same — puts it above the column it overlaps
          * without touching the panel or the header, which are higher still.
          */
        <nav
            aria-label={labels.title}
            className={`relative z-30 min-w-0 ${className}`}
        >
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
                        collapsed={collapsed}
                    />
                ))}
            </ol>
            {footer}
        </nav>
    );
}
