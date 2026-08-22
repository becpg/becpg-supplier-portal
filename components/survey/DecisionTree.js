'use client';

/**
 * The questionnaire, as beCPG defines it — **a decision tree, not a grid**.
 *
 * This is the portal's rendering of `beCPG.component.DecisionTree`
 * (`becpg-plm-share/.../form/controls/decision-tree.js`, 1135 lines of YUI). The
 * *rules* are a faithful port and live in `surveyModel.js`, tested against the
 * traces captured from a running Share; this file is the surface.
 *
 * ## What a supplier can do here, and what it cannot
 *
 * It answers. That is all. There is **no add-question control, no delete, no
 * reorder** — not disabled ones, absent ones — because a question is a
 * `survey:surveyQuestion` its customer authored, and a row of `survey:surveyList`
 * is the *answer* to one. The previous rendering (an editable datalist) offered
 * "add a row", i.e. "invent a question", and it is that structural mistake this
 * screen exists to correct. The rule is also enforced server-side, where it
 * belongs: `lib/adapters/wizard.js` refuses the create / delete / reorder verbs
 * for a `survey` step, and `lib/adapters/survey.js` drops any answer whose
 * question is not in the questionnaire beCPG just served — so a payload claiming
 * `permissions: { create: true }` changes nothing, there is no code path to
 * create anything.
 *
 * ## Two modes, one component
 *
 * `readOnly` keeps the same tree, the same reveal rules and the same order, and
 * renders the **answer** instead of the controls. That is a deliberate departure
 * from Share, which renders the full option list with every control disabled: on
 * the product sheet the question that matters is "what did we answer", and a
 * consultation tab made of forty greyed-out checkboxes answers it badly.
 *
 * ## Divergences from Share, all deliberate
 *
 * | Share | here | why |
 * |---|---|---|
 * | `responseType=list` → `<select>`, first option auto-selected | radio rows (a `<select>` with an empty option beyond 12 choices) | Share's select has no empty option, so an untouched single-choice question is stored as its first answer and reads as "answered". Mandatory checks are meaningless under that. |
 * | `multiChoicelist` → `<select multiple>` | checkbox rows | a multi-select listbox cannot be operated one-handed, and the portal is responsive to 360px |
 * | notes rendered as sanitised HTML | tags turned into lines and bullets | there is no `dangerouslySetInnerHTML` in this codebase and a supplier-facing screen is not where to introduce one |
 * | an untouched group serialised as `listOptions: ""` | omitted | beCPG resolves `""` as a nodeRef; omitting writes the same empty answer |
 * | comment input rebuilt from the DOM when the selected choice changes | `commentCid` in the state | same observable behaviour, no DOM read |
 *
 * Everything else — the reveal rules, the order, the legend, the notes, the
 * urls, the requirement colours, the comment types, what is sent — is Share's.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { RichText } from '@/components/ui/RichText';
import { rowColor, tint } from '@/lib/format';
import { useMessages } from '@/lib/messages';
import {
    COMMENT_INPUT_TYPES,
    REQUIREMENT_TONES,
    commentChoiceOf,
    commentValue,
    initialAnswerState,
    isAnswered,
    isMessage,
    listChoiceOf,
    parseListItem,
    plainText,
    questionLegendPrefix,
    questionUrls,
    selectedOptions,
    serialiseAnswers,
    surveyProgress,
    visibleQuestionIds,
} from '@/components/survey/surveyModel';

const LABELS = {
    fr: {
        required: 'Question obligatoire',
        noAnswer: 'Sans réponse',
        choose: 'Choisir une réponse',
        openLink: 'Ouvrir le lien',
        answer: 'Réponse',
        blank: 'Cette question obligatoire attend une réponse.',
    },
    en: {
        required: 'Mandatory question',
        noAnswer: 'Not answered',
        choose: 'Select an answer',
        openLink: 'Open link',
        answer: 'Answer',
        blank: 'This mandatory question is still blank.',
    },
};

/** Beyond this many options a single-choice question becomes a dropdown. */
const RADIO_LIMIT = 12;

/** Requirement tone → the portal's status tokens and its icon. */
const REQUIREMENT_STYLE = Object.freeze({
    danger: {
        icon: 'block',
        className:
            'border-l-[var(--status-danger)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]',
    },
    warn: {
        icon: 'warning_amber',
        className: 'border-l-[var(--status-warn)] bg-[var(--status-warn-bg)] text-[var(--status-warn)]',
    },
    ok: {
        icon: 'check_circle',
        className: 'border-l-[var(--status-ok)] bg-[var(--status-ok-bg)] text-[var(--status-ok)]',
    },
    info: {
        icon: 'info',
        className: 'border-l-[var(--status-info)] bg-[var(--status-info-bg)] text-[var(--status-info)]',
    },
});

/**
 * The DOM id of a question block — the anchor the validation summary scrolls to.
 *
 * @param {string} prefix the tree's id prefix
 * @param {string} questionId
 * @returns {string}
 */
export function questionDomId(prefix, questionId) {
    return `${prefix}-q-${questionId}`;
}

/* -------------------------------------------------------------------------- */
/* Blocks                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A `def` entry with no choices: the branch's conclusion. `.decision-tree-message`
 * in Share — a pale callout, not a question.
 *
 * @param {Object} props
 */
function MessageBlock({ question, domId }) {
    const paint = rowColor(question.color);
    return (
        <div
            id={domId}
            data-question-id={question.id}
            data-question-kind="message"
            style={paint ? { backgroundColor: tint(paint), borderLeftColor: paint } : undefined}
            className={`flex min-w-0 items-start gap-2 rounded-xl border border-[var(--becpg-blue-lighter)] border-l-4 border-l-[var(--becpg-blue-light)] px-4 py-3${paint ? '' : ' bg-[var(--becpg-grey)]/50'}`}
        >
            <Icon name="campaign" size={18} className="mt-0.5 shrink-0 text-[var(--becpg-blue-light)]" />
            <RichText
                value={question.label}
                className="min-w-0 flex-1 text-sm leading-relaxed text-[var(--becpg-blue)]"
            />
        </div>
    );
}

/** The four requirement types beCPG can attach to a question. */
function Requirements({ requirements }) {
    if (!Array.isArray(requirements) || requirements.length === 0) {
        return null;
    }
    return (
        <div className="mb-3 flex flex-col gap-1">
            {requirements.map((requirement, index) => {
                const tone = REQUIREMENT_TONES[String(requirement?.type || 'info').toLowerCase()] || 'info';
                const style = REQUIREMENT_STYLE[tone];
                return (
                    <div
                        key={index}
                        data-requirement-type={requirement?.type || 'Info'}
                        className={`flex items-start gap-1.5 rounded-lg border-l-4 px-2.5 py-1.5 text-xs leading-snug ${style.className}`}
                    >
                        {/* Never colour alone: the type is carried by the icon and
                            by the code as well as by the tint. */}
                        <Icon name={style.icon} size={14} className="mt-px shrink-0" />
                        <span className="min-w-0">
                            {requirement?.code ? (
                                <span className="font-semibold">{requirement.code} : </span>
                            ) : null}
                            {requirement?.message || ''}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/** The documentation links a question can carry. */
function QuestionUrls({ url, label }) {
    const urls = useMemo(() => questionUrls(url), [url]);
    if (urls.length === 0) {
        return null;
    }
    return (
        <div className="mb-2 flex flex-col gap-1">
            {urls.map((href) => (
                <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={label}
                    className="inline-flex w-fit max-w-full items-center gap-1 break-all text-sm text-[var(--becpg-blue-light)] underline underline-offset-2 hover:text-[var(--becpg-blue)]"
                >
                    <Icon name="link" size={16} className="shrink-0" />
                    {href}
                </a>
            ))}
        </div>
    );
}

/**
 * One selectable option — a radio or a checkbox, rendered as a full-width row so
 * the whole row is the target (44px minimum, one-handed on a phone).
 *
 * @param {Object} props
 */
function OptionRow({ id, name, type, value, checked, disabled, label, onChange }) {
    return (
        <label
            htmlFor={id}
            className={[
                'flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors',
                checked
                    ? 'border-[var(--becpg-blue-light)] bg-[var(--becpg-blue-lighter)]/60 text-[var(--becpg-blue)]'
                    : 'border-[var(--becpg-blue-lighter)] text-[var(--becpg-blue)] hover:bg-[var(--becpg-row-hover)]',
                disabled ? 'cursor-default opacity-100' : '',
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <input
                id={id}
                name={name}
                type={type}
                value={value}
                checked={checked}
                disabled={disabled}
                onChange={onChange}
                className={[
                    'mt-0.5 h-5 w-5 shrink-0 accent-[var(--becpg-blue)]',
                    type === 'checkbox' ? 'rounded' : '',
                    'border-[var(--becpg-blue-lighter)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] focus-visible:ring-offset-2',
                ]
                    .filter(Boolean)
                    .join(' ')}
            />
            <span className="min-w-0 leading-5">{label}</span>
        </label>
    );
}

/**
 * The comment box of a question — free text, a number, a percentage, a date…
 * `survey:responseCommentType` decides, and beCPG stores the typed value in
 * `slNumberComment` / `slDateComment` besides the string in `slComment`.
 *
 * @param {Object} props
 */
function CommentControl({ id, choice, value, invalid, onChange, labels }) {
    const type = String(choice.commentType || (choice.textarea ? 'textarea' : 'text'));
    // A `<label>` accepts phrasing content only, so the markup a note may carry
    // is flattened here rather than rendered as blocks.
    const labelText = choice.commentLabel === 'hidden' ? '' : plainText(choice.commentLabel);
    const showLabel = labelText !== '';

    const commit = useCallback(
        (next) => {
            if (type === 'int') {
                const parsed = parseInt(next, 10);
                onChange(next === '' ? '' : String(Number.isNaN(parsed) ? 0 : parsed));
                return;
            }
            if (type === 'percentage') {
                const parsed = parseFloat(next);
                onChange(
                    next === ''
                        ? ''
                        : String(Math.min(100, Math.max(0, Number.isNaN(parsed) ? 0 : parsed))),
                );
                return;
            }
            onChange(next);
        },
        [onChange, type],
    );

    // beCPG allows a comment with no label at all (`commentLabel: "hidden"`), and
    // a box with no name is a box a screen reader cannot announce.
    const named = showLabel ? {} : { 'aria-label': labels.answer };

    return (
        <div className="mt-3 min-w-0">
            {showLabel ? (
                <label htmlFor={id} className="mb-1 block text-sm font-medium text-[var(--becpg-blue)]">
                    {labelText}
                </label>
            ) : null}
            {type === 'textarea' ? (
                <Textarea
                    id={id}
                    rows={3}
                    value={value}
                    invalid={invalid}
                    {...named}
                    onChange={(event) => onChange(event.target.value)}
                />
            ) : (
                <Input
                    id={id}
                    type={COMMENT_INPUT_TYPES[type] || 'text'}
                    value={value}
                    invalid={invalid}
                    {...(type === 'int' ? { step: 1, inputMode: 'numeric' } : {})}
                    {...(type === 'percentage' ? { min: 0, max: 100, inputMode: 'decimal' } : {})}
                    {...(type === 'number' ? { inputMode: 'decimal' } : {})}
                    {...named}
                    onChange={(event) => onChange(event.target.value)}
                    // Clamped on blur, not on every keystroke: `Alfresco`'s own
                    // handler clamps on change, and clamping mid-typing turns
                    // "10" into "1" then "10" under the user's fingers.
                    onBlur={(event) => commit(event.target.value)}
                />
            )}
        </div>
    );
}

/**
 * One question, with its controls.
 *
 * @param {Object} props
 */
function QuestionBlock({
    question,
    state,
    prefix,
    readOnly,
    invalid,
    labels,
    onSelectChoice,
    onToggleOption,
    onSelectOptions,
    onComment,
}) {
    const domId = questionDomId(prefix, question.id);
    const list = listChoiceOf(question);
    const comment = commentChoiceOf(question, state);
    // Never `state.comment` directly: the text belongs to the choice it was
    // typed for, and reading it back under another answer is exactly what
    // `commentValue` refuses to do.
    const commentText = commentValue(question, state);
    const radios = (question.choices || []).filter(
        (choice) => !Array.isArray(choice.list) && choice.label !== 'hidden',
    );
    const answered = isAnswered(question, state);

    /* ------------------------------------------------------------- controls */

    let controls = null;

    if (list) {
        // Option labels end up inside a `<label>` / an `<option>`: phrasing
        // content only, so any markup they carry is flattened.
        const items = list.list.map((entry) => {
            const parsed = parseListItem(entry);
            return { value: parsed.value, label: plainText(parsed.label) || parsed.label };
        });
        const selected = selectedOptions(list, state);

        if (readOnly) {
            const chosen = items.filter((item) => selected.includes(item.value));
            controls = <ReadOnlyAnswer values={chosen.map((item) => item.label)} labels={labels} />;
        }
        else if (list.multiple || list.checkboxes) {
            controls = (
                <div className="flex flex-col gap-1.5">
                    {items.map((item, index) => (
                        <OptionRow
                            key={item.value}
                            id={`${domId}-o${index}`}
                            name={`${domId}-group`}
                            type="checkbox"
                            value={item.value}
                            checked={selected.includes(item.value)}
                            label={item.label}
                            onChange={(event) => onToggleOption(question, list, item.value, event.target.checked)}
                        />
                    ))}
                </div>
            );
        }
        else if (items.length > RADIO_LIMIT) {
            controls = (
                <Select
                    id={`${domId}-select`}
                    value={selected[0] || ''}
                    // An EMPTY option, which Share does not have: without it the
                    // browser selects the first answer and an untouched question
                    // is stored — and counted — as answered.
                    placeholder={labels.choose}
                    invalid={invalid}
                    options={items.map((item) => ({ value: item.value, label: item.label }))}
                    onChange={(event) => onSelectOptions(question, list, event.target.value ? [event.target.value] : [])}
                />
            );
        }
        else {
            controls = (
                <div className="flex flex-col gap-1.5">
                    {items.map((item, index) => (
                        <OptionRow
                            key={item.value}
                            id={`${domId}-o${index}`}
                            name={`${domId}-group`}
                            type="radio"
                            value={item.value}
                            checked={selected[0] === item.value}
                            label={item.label}
                            onChange={() => onSelectOptions(question, list, [item.value])}
                        />
                    ))}
                </div>
            );
        }
    }
    else if (radios.length > 0) {
        if (readOnly) {
            const chosen = radios.filter((choice) => choice.id === state.cid);
            controls = (
                <ReadOnlyAnswer
                    values={chosen.map((choice) => plainText(choice.label) || choice.label)}
                    labels={labels}
                />
            );
        }
        else {
            controls = (
                <div className="flex flex-col gap-1.5">
                    {radios.map((choice, index) => (
                        <OptionRow
                            key={choice.id}
                            id={`${domId}-c${index}`}
                            name={`${domId}-group`}
                            type="radio"
                            value={choice.id}
                            checked={state.cid === choice.id}
                            label={plainText(choice.label) || choice.label}
                            onChange={() => onSelectChoice(question, choice)}
                        />
                    ))}
                </div>
            );
        }
    }

    /* -------------------------------------------------------------- comment */

    const commentBox = !comment ? null : readOnly ? (
        <div className="mt-3">
            {comment.commentLabel && comment.commentLabel !== 'hidden' ? (
                <RichText
                    value={comment.commentLabel}
                    className="mb-1 text-sm font-medium text-[var(--becpg-blue)]"
                />
            ) : null}
            <ReadOnlyAnswer values={commentText ? [commentText] : []} labels={labels} />
        </div>
    ) : (
        <CommentControl
            // Keyed by the choice: a `text` box and a `number` box are two
            // different controls, and React must not reuse one as the other when
            // the answer changes — which is `insertComment`'s `data-choice-id`
            // check, expressed the way React expresses identity.
            key={comment.id}
            id={`${domId}-comment`}
            choice={comment}
            value={commentText}
            invalid={invalid && commentText.trim() === ''}
            onChange={(value) => onComment(question, comment, value)}
            labels={labels}
        />
    );

    const legendPrefix = questionLegendPrefix(question);
    /*
     * `bcpg:color` on the question row — as a BAND, not as a flood.
     *
     * A questionnaire is a datalist, and a customer colours its lines to mark a
     * section the way he does anywhere else in beCPG. Painting the whole card
     * with it said something else entirely: a solid red question reads as an
     * error and a solid green one as an answer already validated, on a screen
     * where red and green mean exactly that everywhere else. The colour is
     * therefore kept where it is unmistakably an author's mark — a 4px edge and
     * a wash of the same hue — and the text keeps the portal's ink, which also
     * spares it the black-or-white inversion the flood needed to stay readable.
     *
     * Dropped entirely when the question is flagged unanswered: that red border
     * is about to be acted on, and nothing may compete with it.
     */
    const paint = !invalid ? rowColor(question.color) : null;

    return (
        <fieldset
            id={domId}
            tabIndex={-1}
            data-question-id={question.id}
            data-question-kind="question"
            data-mandatory={question.mandatory ? 'true' : 'false'}
            data-answered={answered ? 'true' : 'false'}
            style={paint ? { backgroundColor: tint(paint), borderLeftColor: paint } : undefined}
            className={[
                'min-w-0 scroll-mt-24 rounded-xl border p-4 shadow-[var(--becpg-shadow-raised)] focus:outline-none',
                paint ? 'border-l-4' : 'bg-white',
                invalid
                    ? 'border-[var(--status-danger)]'
                    : 'border-[var(--becpg-blue-lighter)]',
            ].join(' ')}
        >
            {/* `float-left w-full` turns the legend into a plain block: the
                default rendering cuts the card's border, which at 360px with a
                three-line question is unreadable. */}
            <legend className="float-left mb-2 w-full p-0 text-sm font-medium leading-snug text-[var(--becpg-blue)]">
                {/* The label keeps the marks its author gave it in Share — a
                    coloured, bold title is how a customer separates a section
                    from the questions under it. `inline`: a `<legend>` takes
                    phrasing content, never a paragraph. */}
                <span className="align-middle">
                    {legendPrefix ? `${legendPrefix} - ` : null}
                    <RichText inline value={question.label} />
                </span>
                {question.mandatory ? (
                    <span className="ml-0.5 align-middle text-[var(--status-danger)]" title={labels.required}>
                        *
                    </span>
                ) : null}
            </legend>

            <div className="clear-both min-w-0">
                <Requirements requirements={question.requirements} />
                <RichText
                    value={question.note}
                    className="mb-2 text-sm leading-relaxed text-[var(--becpg-dark-grey-deep)]"
                />
                <RichText
                    value={question.upperNote}
                    className="mb-2 text-sm leading-relaxed text-[var(--becpg-dark-grey-deep)]"
                />
                <QuestionUrls url={question.url} label={labels.openLink} />

                {controls}
                {commentBox}

                {invalid ? (
                    <p role="alert" className="mt-2 flex items-start gap-1 text-xs text-[var(--status-danger)]">
                        <Icon name="error_outline" size={14} className="mt-px shrink-0" />
                        <span>{labels.blank}</span>
                    </p>
                ) : null}

                <RichText
                    value={question.lowerNote}
                    className="mt-2 text-sm leading-relaxed text-[var(--becpg-dark-grey-deep)]"
                />
            </div>
        </fieldset>
    );
}

/**
 * The read-only rendering of an answer — the same surface `Field` uses for a
 * frozen value, so a consulted questionnaire looks like the rest of the sheet.
 *
 * @param {Object} props
 */
function ReadOnlyAnswer({ values, labels }) {
    const filled = (values || []).filter((value) => value !== null && value !== undefined && value !== '');
    return (
        <div className="min-h-[40px] whitespace-pre-wrap break-words rounded-lg border-l-[3px] border-l-[var(--becpg-blue-light)] bg-[var(--becpg-grey)] px-3 py-2 text-sm text-[var(--becpg-blue)]">
            {filled.length === 0 ? (
                <span className="text-[var(--becpg-dark-grey-deep)]">{labels.noAnswer}</span>
            ) : (
                filled.join(', ')
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* The tree                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * @param {Object} props
 * @param {Object[]} props.questions the sorted `def` of `GET /becpg/survey`
 * @param {Object[]} props.answers its `data`
 * @param {boolean} [props.readOnly] render the answers instead of the controls
 * @param {string} props.idPrefix unique per instance — several questionnaires
 *        (`surveyList`, `surveyList@1`…) can be on screen at once, and their
 *        radio groups must not collide
 * @param {Function} [props.onChange] `(serialisedAnswers) => void`, on a user change only
 * @param {Function} [props.onProgress] `({answered, total, percent, missing}) => void`
 * @param {string[]} [props.invalidIds] questions to flag (after a failed submit)
 * @param {React.ReactNode} [props.emptyState] rendered when the tree shows
 *        nothing — in view mode a questionnaire with no answer at all reveals no
 *        question, and an empty rectangle is not an answer to "what did we say?"
 * @param {string} [props.className]
 */
export function DecisionTree({
    questions,
    answers,
    readOnly = false,
    idPrefix,
    onChange,
    onProgress,
    invalidIds,
    emptyState = null,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;

    const list = useMemo(() => (Array.isArray(questions) ? questions : []), [questions]);
    const hasAnswers = Array.isArray(answers) && answers.length > 0;

    // The answer state is seeded from the server payload and re-seeded whenever
    // the payload identity changes (a reload, a step change, another instance).
    // Adjusted **during render** — React's "derive state from props" pattern, the
    // one `useApi` and `ProductSections` already use: an effect would paint the
    // stale tree once and cost a cascading render on every refresh.
    const [seed, setSeed] = useState({ questions: list, answers });
    const [state, setState] = useState(() => initialAnswerState(list, answers));
    if (seed.questions !== list || seed.answers !== answers) {
        setSeed({ questions: list, answers });
        setState(initialAnswerState(list, answers));
    }

    const visible = useMemo(
        () => visibleQuestionIds(list, state, { readOnly, hasAnswers }),
        [list, state, readOnly, hasAnswers],
    );
    const progress = useMemo(
        () => surveyProgress(list, state, visible),
        [list, state, visible],
    );

    // Progress is reported on mount too, so the header can show "0 / 3" without
    // recomputing it — but `onChange` is NOT, or loading a questionnaire would
    // schedule a write of what was just read.
    const report = useRef(onProgress);
    useEffect(() => {
        report.current = onProgress;
    });
    useEffect(() => {
        if (report.current) {
            report.current(progress);
        }
    }, [progress]);

    const flagged = useMemo(() => new Set(invalidIds || []), [invalidIds]);

    /**
     * Applies a change and publishes the answers computed from the **new** state:
     * what is visible — and therefore what is sent — depends on it.
     *
     * The next state is built here rather than inside a `setState` updater: an
     * updater is free to run twice, and publishing from one would schedule the
     * save twice.
     */
    const change = useCallback(
        (questionId, patch) => {
            const next = { ...state, [questionId]: { ...(state[questionId] || {}), ...patch } };
            setState(next);
            if (onChange) {
                onChange(serialiseAnswers(list, next, visibleQuestionIds(list, next, { readOnly: false })));
            }
        },
        [list, state, onChange],
    );

    const onSelectChoice = useCallback(
        (question, choice) => change(question.id, { cid: choice.id }),
        [change],
    );
    const onSelectOptions = useCallback(
        (question, choice, values) => change(question.id, { cid: choice.id, listOptions: values.join(',') }),
        [change],
    );
    const onToggleOption = useCallback(
        (question, choice, value, checked) => {
            const previous = state[question.id] || {};
            const wanted = new Set(
                String(previous.listOptions || '')
                    .split(',')
                    .map((entry) => entry.trim())
                    .filter(Boolean),
            );
            if (checked) {
                wanted.add(value);
            }
            else {
                wanted.delete(value);
            }
            // Keep the values in the order beCPG declared them, whatever the
            // order the boxes were ticked in.
            const ordered = choice.list
                .map((item) => parseListItem(item).value)
                .filter((entry) => wanted.has(entry));
            change(question.id, { cid: choice.id, listOptions: ordered.join(',') });
        },
        [change, state],
    );
    // The comment is stamped with the choice it belongs to. Share does the same
    // with `data-choice-id` on the input it rebuilds; here the stamp is state,
    // so the rule survives a re-render and a reload.
    const onComment = useCallback(
        (question, choice, value) => change(question.id, { comment: value, commentCid: choice.id }),
        [change],
    );

    const blocks = list
        .filter((question) => question?.id && visible.has(question.id))
        .map((question) =>
            isMessage(question) ? (
                <MessageBlock
                    key={question.id}
                    question={question}
                    domId={questionDomId(idPrefix, question.id)}
                />
            ) : (
                <QuestionBlock
                    key={question.id}
                    question={question}
                    state={state[question.id] || {}}
                    prefix={idPrefix}
                    readOnly={readOnly}
                    invalid={!readOnly && flagged.has(question.id)}
                    labels={labels}
                    onSelectChoice={onSelectChoice}
                    onSelectOptions={onSelectOptions}
                    onToggleOption={onToggleOption}
                    onComment={onComment}
                />
            ),
        );

    return (
        <div
            className={`flex min-w-0 flex-col gap-3 ${className}`}
            data-survey-tree={idPrefix}
            data-survey-visible={blocks.length}
        >
            {blocks.length === 0 ? emptyState : blocks}
        </div>
    );
}
