'use client';

/**
 * The wizard's step navigation — two shapes, one state.
 *
 * - `variant="rail"` — the desktop left rail: the whole path is visible at once,
 *   which is what makes the redesign's inverted order legible (documents first,
 *   conformity last). Every visited step is a button, and the rail folds down to
 *   its bullets (`collapsed`) to give the width back to the form.
 * - `variant="compact"` — the phone: the summary, then one selector carrying the
 *   current step's name and opening the same list in a sheet. A vertical rail at
 *   360px would eat the screen the form needs (spec §4.4, "utilisable sur un
 *   téléphone").
 *
 * ## Three rules
 *
 * 1. **No strict tunnel.** A step already visited is freely reachable
 *    (`isSelectable`); the wizard decides, the stepper only renders the verdict.
 * 2. **A frozen step is shown as frozen, never as done.** `frozen` comes from
 *    the single server-side security call (bug #25928) and is displayed with a
 *    lock: the supplier must understand that the client validated that list, not
 *    that he completed it.
 * 3. **Nothing is written that the drawing already says.** The position and the
 *    plain states are carried by the shape of the rail and by every button's
 *    `aria-label`; the visible words are kept for what remains to be done. See
 *    {@link StepsSummary}.
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
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/wizard/WizardStepper#LABELS', {
    fr: {
        title: 'Étapes',
        step: 'Étape {index} sur {total}',
        open: 'Choisir une étape',
        frozen: 'Validée par le client',
        readOnly: 'Lecture seule',
        done: 'Vue',
        complete: 'Complète',
        current: 'Étape en cours',
        todo: 'Pas encore vue',
        locked: 'Disponible plus tard',
        // What the rail could not express: a step opened, left, and incomplete.
        // It showed as « Vue », green check included.
        incomplete: '{count} obligatoire(s) manquant(s)',
        // The customer's own verdict, not the portal's: what the catalogue
        // expects on this tab and does not find.
        catalogGap: '{count} information(s) attendue(s) par le catalogue',
        // The headline of the rail. « Signalé » and not « restant » on purpose:
        // see the note on `StepsSummary`.
        remaining: '{count} section(s) à compléter',
        remainingNone: 'Aucun manque signalé',
        remainingHint: 'Votre client attend ces informations pour valider la fiche.',
        remainingHintNone: 'Vous pouvez revenir sur chaque étape à tout moment.',
        collapse: 'Replier les étapes',
        expand: 'Déplier les étapes',
    },
    en: {
        title: 'Steps',
        step: 'Step {index} of {total}',
        open: 'Choose a step',
        frozen: 'Validated by the customer',
        readOnly: 'Read only',
        done: 'Visited',
        complete: 'Complete',
        current: 'Current step',
        todo: 'Not visited yet',
        locked: 'Available later',
        /* See the note on the French key. */
        incomplete: '{count} mandatory missing',
        catalogGap: '{count} field(s) expected by the catalogue',
        /* See the note on the French key. */
        remaining: '{count} section(s) to complete',
        remainingNone: 'Nothing reported missing',
        remainingHint: 'Your customer is waiting for this information to validate the sheet.',
        remainingHintNone: 'You can come back to any step at any time.',
        collapse: 'Collapse the steps',
        expand: 'Expand the steps',
    },
});

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
 * The one state a step is in, as a single word.
 *
 * Priority order is "what stops the supplier first": a missing mandatory entry
 * and a catalogue gap come before « you are here », because the rail is read to
 * find out what is left to do, not to find out where one stands.
 *
 * @returns {'missing'|'gap'|'current'|'complete'|'locked'|'seen'|'todo'}
 */
function stepTone(step, active) {
    if (step.issues && step.issues.count > 0) {
        return 'missing';
    }
    if (step.catalogGap && step.catalogGap.count > 0) {
        return 'gap';
    }
    if (active) {
        return 'current';
    }
    if (step.evaluated === true) {
        return 'complete';
    }
    if (step.frozen || step.readOnly) {
        return 'locked';
    }
    return step.visited ? 'seen' : 'todo';
}

/** The four tones the summary bar draws; everything else stays neutral. */
const BAR_TONES = {
    missing: 'bg-[var(--status-warn)]',
    gap: 'bg-[var(--status-danger)]',
    current: 'bg-[var(--becpg-blue)]',
    complete: 'bg-[var(--status-ok)]',
};

/**
 * The head of the stepper: what is left to do, then the whole path as one bar.
 *
 * WHY NOT « ÉTAPE 5 SUR 12 ».
 *
 * The ordinal is the vocabulary of a tunnel, and this assistant is not one any
 * more — `isSelectable` returns true for every step, so « 5 » names no
 * prerequisite and no remaining work. It was also written under each of the
 * twelve rows, so a twelve-step wizard said « sur 12 » twelve times. What a
 * supplier working alone needs instead is the sentence below: how many sections
 * still hold something his customer is waiting for.
 *
 * THE COUNT IS OF WHAT IS *SIGNALLED*, AND THE WORDING KEEPS THAT PROMISE.
 *
 * Only a step that rules on itself can be counted (`issues`, `catalogGap`); a
 * datalist and the conformity before its analysis rule on nothing. So zero is
 * said as « aucun manque signalé » and never as « fiche complète » — the portal
 * does not know that, and claiming it would be the kind of fabricated verdict
 * AGENTS.md forbids.
 *
 * The bar is `aria-hidden`: it repeats, as a shape, the sentence above it and
 * the rail below it, and a screen reader must not hear the same verdict three
 * times.
 */
function StepsSummary({ steps, currentId, labels, variant = 'rail', onToggleCollapsed, collapsed = false }) {
    const tones = steps.map((step) => stepTone(step, step.id === currentId));
    const remaining = tones.filter((tone) => tone === 'missing' || tone === 'gap').length;
    const headline = remaining > 0 ? fill(labels.remaining, { count: remaining }) : labels.remainingNone;
    const hint = remaining > 0 ? labels.remainingHint : labels.remainingHintNone;

    const toggle = onToggleCollapsed ? (
        <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? labels.expand : labels.collapse}
            title={collapsed ? labels.expand : labels.collapse}
            className="-me-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--becpg-dark-grey)] hover:bg-[var(--becpg-grey)]/60 hover:text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
        >
            <Icon name={collapsed ? 'chevron_right' : 'chevron_left'} size={18} />
        </button>
    ) : null;

    // Collapsed, the rail is 52px wide: the sentence cannot be written, so the
    // count alone is shown — with the sentence as its accessible name, and the
    // warning icon beside it so the state never rests on the colour.
    if (collapsed) {
        return (
            <div className="mb-1 flex flex-col items-center gap-1">
                {toggle}
                {remaining > 0 ? (
                    <span
                        title={headline}
                        aria-label={headline}
                        role="img"
                        className="inline-flex items-center gap-0.5 rounded-md border border-[var(--status-warn-border)] bg-[var(--status-warn-bg)] px-1 py-0.5 text-[10px] font-medium text-[var(--status-warn)]"
                    >
                        <Icon name="error_outline" size={12} />
                        {remaining}
                    </span>
                ) : null}
            </div>
        );
    }

    return (
        <div
            className={
                variant === 'rail'
                    ? 'mb-2 rounded-xl border border-[var(--becpg-blue-lighter)] bg-white px-3 py-2.5'
                    : 'mb-2'
            }
        >
            <div className="flex items-start gap-1">
                <p className="min-w-0 flex-1 text-[13px] font-medium leading-5 text-[var(--becpg-blue)]">
                    {headline}
                </p>
                {toggle}
            </div>
            <div className="mt-2 flex gap-[3px]" aria-hidden="true">
                {tones.map((tone, index) => (
                    <span
                        key={steps[index].id}
                        className={`h-1.5 flex-1 rounded-full ${BAR_TONES[tone] || 'bg-[var(--becpg-grey)]'}`}
                    />
                ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-4 text-[var(--becpg-dark-grey)]">{hint}</p>
        </div>
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
    const catalogGap = Boolean(step.catalogGap && step.catalogGap.count > 0);
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
                              : step.evaluated === true
                                ? 'border-[var(--becpg-green)] bg-[var(--becpg-green)]/25 text-[var(--becpg-blue)]'
                                : 'border-[var(--becpg-grey)] bg-white text-[var(--becpg-dark-grey)]',
                    ].join(' ')}
                >
                    {incomplete || step.evaluated === true || step.visited || step.frozen || active
                        ? <Icon name={icon} size={15} />
                        : index}
                </span>
                {/* The catalogue gap, on a rail too narrow for a pill. The words
                    are already in the accessible name, so this is emphasis. */}
                {catalogGap ? (
                    <span
                        aria-hidden="true"
                        className="absolute end-1 top-1 h-2 w-2 rounded-full bg-[var(--status-danger)]"
                    />
                ) : null}
                {/*
                  * The label, on hover and on focus. `pointer-events-none` so it
                  * can never sit between the pointer and the next step, and
                  * `aria-hidden` because the button already carries the same text
                  * as its accessible name — a screen reader must not read it twice.
                  */}
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute start-full top-1/2 z-40 ms-1 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-[var(--becpg-grey)] bg-white px-2 py-1 text-xs text-[var(--becpg-blue)] shadow-[var(--becpg-shadow-overlay)] group-hover:block group-focus-visible:block"
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
    // The conformity analysis attributed a catalogue gap to this step. It informs,
    // it does not gate: what forbids finishing stays `issues` and the blocking
    // catalogues, and this mark is deliberately drawn apart from the bullet.
    const catalogGap = step.catalogGap && step.catalogGap.count > 0 ? step.catalogGap : null;
    const seen = step.visited && !active && !incomplete;
    /*
     * SEEN IS NOT CHECKED.
     *
     * The green tick used to mean "the supplier walked past this step", which is
     * why it survived nothing and asserted nothing: a reopened task lost it, and
     * a step that never rules on itself earned it on sight. It now means what it
     * says — somebody ruled on this step and found nothing missing. A step no
     * one can rule on stays neutral, and the rail still says « Vue » for it,
     * because that much is true.
     */
    const done = step.evaluated === true && !incomplete && !active;
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
              : done
                ? labels.complete
                : seen
                  ? labels.done
                  : selectable
                    ? labels.todo
                    : labels.locked;
    // Appended rather than substituted: the two verdicts are independent, and a
    // screen reader must hear both.
    const spoken = catalogGap
        ? `${state} · ${fill(labels.catalogGap, { count: catalogGap.count })}`
        : state;
    /*
     * THE SUB-LINE ONLY SPEAKS WHEN THERE IS SOMETHING TO SAY.
     *
     * It used to carry « Étape 6 sur 12 · Pas encore vue » on every row, which
     * is the rail describing itself: the position is the row's place in the
     * list, and « pas encore vue » is the absence of any mark. Twelve rows, two
     * facts already drawn, twenty-four words. What is left is what the drawing
     * cannot say — a count of what is missing, a step the customer froze.
     *
     * Nothing is lost for a screen reader: the full sentence, position and
     * state included, is the button's `aria-label` below.
     */
    const details = [];
    if (incomplete) {
        details.push(fill(labels.incomplete, { count: step.issues.count }));
    }
    if (catalogGap) {
        details.push(fill(labels.catalogGap, { count: catalogGap.count }));
    }
    if (details.length === 0 && step.frozen) {
        details.push(labels.frozen);
    }
    if (details.length === 0 && step.readOnly) {
        details.push(labels.readOnly);
    }
    const detailTone = incomplete
        ? 'text-[var(--status-warn)]'
        : catalogGap
          ? 'text-[var(--status-danger)]'
          : 'text-[var(--becpg-dark-grey)]';

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
                state={spoken}
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
                aria-label={`${step.label} · ${fill(labels.step, { index, total })} · ${spoken}`}
                onClick={() => onSelect(step.id)}
                className={[
                    'group flex w-full items-start gap-2.5 rounded-xl px-2 text-start transition-colors',
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
                                // A step walked through, on which nobody can rule —
                                // a list, the conformity. Still its number, so it is
                                // never read as "complete", but no longer identical
                                // to a step never opened: the rail is also a map of
                                // where the supplier has been, and the state line
                                // already says « Vue » in words.
                                : seen
                                  ? 'border-[var(--becpg-blue-lighter)] bg-[var(--becpg-grey)]/70 text-[var(--becpg-blue)]'
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
                    {details.length > 0 ? (
                        <span
                            aria-hidden="true"
                            /* The rail is narrow and this line is the one that says what is
                               missing, so it truncates on almost every step. Always carry
                               the whole sentence in `title` — with the catalogue's own
                               labels appended when it has some — otherwise the reader can
                               see that something is missing and never which. */
                            title={[details.join(' · '), catalogGap ? catalogGap.labels.join(', ') : '']
                                .filter(Boolean)
                                .join(' — ')}
                            className={`mt-0.5 block truncate text-[11px] ${detailTone}`}
                        >
                            {details.join(' · ')}
                        </span>
                    ) : null}
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
 * @param {Function} [props.onToggleCollapsed] folds and unfolds the rail; the
 *   chevron is only drawn when a caller owns that state
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
    onToggleCollapsed,
    footer = null,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
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
        /*
         * One control, one label.
         *
         * The phone used to stack four encodings of the same position in 70px:
         * the step's name, « Étape 5 sur 12 », the « 5/12 » of the selector, and
         * a progress bar. The selector now carries the name — it is the thing
         * you press to change step, so it is the thing that should say which
         * step you are on — and the summary above says what is left. The
         * position stays in the button's accessible name, where it costs no
         * pixel.
         */
        const currentIcon = current ? (KIND_ICONS[current.kind] || 'list') : 'list';

        return (
            <div className={`min-w-0 ${className}`}>
                <StepsSummary steps={list} currentId={currentId} labels={labels} variant="compact" />

                <button
                    type="button"
                    onClick={() => setSheetOpen(true)}
                    aria-label={`${current ? current.label : ''} · ${fill(labels.step, { index: currentIndex + 1, total })} · ${labels.open}`}
                    className="touch-target flex w-full items-center gap-2 rounded-lg border border-[var(--becpg-grey)] bg-white px-3 py-2 text-start text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                >
                    <Icon name={currentIcon} size={18} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {current ? current.label : ''}
                    </span>
                    <Icon name="expand_more" size={18} className="shrink-0" />
                </button>

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
            <StepsSummary
                steps={list}
                currentId={currentId}
                labels={labels}
                collapsed={collapsed}
                onToggleCollapsed={onToggleCollapsed}
            />
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
