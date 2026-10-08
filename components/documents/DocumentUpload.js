'use client';

/**
 * Depositing a document — the single write path the supplier portal exposes on
 * documents (spec §4.5).
 *
 * ## What it does, and what it deliberately does not
 *
 * It posts a file to `POST /api/v1/documents` with either `documentRef` (the
 * placeholder created by `DocumentFormulationHandler` — a *renewal* or a first
 * deposit against an expected document) or `entityRef` (a free deposit into the
 * entity's `SupplierDocuments` folder). State and naming are
 * `DocumentAspectPolicy`'s job in beCPG, and duplicating that rule in the portal
 * is exactly what rule R2 forbids.
 *
 * The **validity window** is the one exception, and only where the row says so:
 * `validity.editable` is the server's verdict that this document type declares
 * `MANUAL` effectivity (or none), i.e. that beCPG writes no date and nobody but
 * the supplier knows them — they are printed on the certificate being uploaded.
 * The two boxes then travel with the file, in the same request, because a date
 * asked for in a second step is a date nobody comes back to type.
 *
 * ## AI validation
 *
 * Once beCPG (`bcpg:aiAspect`) has analysed the file it sets
 * `bcpg:aiValidationState` (`Valid` / `ToValidate` / `Refused`) and
 * `bcpg:aiValidationHints`. Analysis is asynchronous, so right after an upload
 * the verdict is simply not there yet: the component says *"analyse en cours"*
 * and re-reads the row a few times through `onUploaded`, then stops. An absent
 * verdict is never rendered as a bad verdict — same rule as the AI confidence
 * badges of the wizard (spec §4.4).
 *
 * ## Drag & drop
 *
 * The drop zone is the component itself, and `dropRef` lets a caller make a
 * whole row a drop target (`RequirementChecklist` passes its row): dropping a
 * PDF anywhere on the line of "Certificat IFS" uploads it against that
 * requirement. Everything is also reachable with the keyboard — the zone is a
 * real `<button>` that opens the file picker.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { api } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { Button, Icon, Spinner } from '@/components/ui/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { ValidityFields, toInputDate } from '@/components/documents/DocumentValidity';
import { RichText } from '@/components/ui/RichText';
import { formatDateTime, plainText } from '@/lib/format';

const LABELS = {
    fr: {
        drop: 'Glissez un fichier ici',
        or: 'ou',
        browse: 'Parcourir',
        deposit: 'Déposer',
        renew: 'Renouveler',
        replace: 'Remplacer',
        uploading: 'Envoi en cours…',
        analysing: 'Analyse du document en cours…',
        done: 'Fichier déposé',
        doneHint: 'Il sera vérifié par le client. Vous n’avez rien d’autre à faire.',
        retry: 'Réessayer',
        cancel: 'Annuler',
        tooLarge: 'Fichier trop volumineux ({size}). Maximum : {max}.',
        badType: 'Format non accepté ({name}). Formats attendus : {accept}.',
        empty: 'Le fichier est vide.',
        failed: 'Le dépôt a échoué.',
        locked: 'Dépôt indisponible',
        accepted: 'Formats : {accept} — {max} maximum',
        aiValid: 'Document vérifié par l’IA',
        aiToValidate: 'À vérifier',
        aiRefused: 'Document refusé par l’IA',
        aiOn: 'Analysé le {date}',
        selected: 'Fichier sélectionné',
        validityHint: 'Les dates de validité portées sur le document.',
        validityInverted: 'La date de fin précède la date de début.',
        validityMissing: 'Renseignez la date de fin de validité avant de déposer le fichier.',
        validityNotApplied:
            'Le fichier est déposé, mais ses dates de validité n’ont pas été enregistrées. Renseignez-les sur la ligne du document.',
    },
    en: {
        drop: 'Drop a file here',
        or: 'or',
        browse: 'Browse',
        deposit: 'Upload',
        renew: 'Renew',
        replace: 'Replace',
        uploading: 'Uploading…',
        analysing: 'Analysing the document…',
        done: 'File uploaded',
        doneHint: 'It will be reviewed by the customer. Nothing else is expected from you.',
        retry: 'Try again',
        cancel: 'Cancel',
        tooLarge: 'File too large ({size}). Maximum: {max}.',
        badType: 'Unsupported format ({name}). Expected: {accept}.',
        empty: 'The file is empty.',
        failed: 'The upload failed.',
        locked: 'Upload unavailable',
        accepted: 'Formats: {accept} — {max} max',
        aiValid: 'Checked by AI',
        aiToValidate: 'To be checked',
        aiRefused: 'Rejected by AI',
        aiOn: 'Analysed on {date}',
        selected: 'Selected file',
        validityHint: 'The validity dates printed on the document.',
        validityInverted: 'The end date precedes the start date.',
        validityMissing: 'Fill in the end of validity before uploading the file.',
        validityNotApplied:
            'The file is uploaded, but its validity dates were not saved. Fill them in on the document row.',
    },
};

/** Default ceiling, mirroring what Alfresco accepts comfortably through the proxy. */
const DEFAULT_MAX_MB = 50;

/**
 * How many times the row is re-read after the AI review has answered.
 *
 * This is no longer a hunt for a verdict — the review is *requested* now (see
 * `requestAiReview` below), so by the time these run the state is already
 * written. They exist only because the write goes through becpg-ai into
 * Alfresco, and the search index the document list reads from lags the
 * transaction by a beat. Two re-reads, not four: we are waiting on an index, not
 * on a model.
 */
const AI_POLL_ATTEMPTS = 2;

/** Delay between two of those re-reads, in ms. */
const AI_POLL_DELAY = 2000;

/**
 * How long the *spinner* waits. Measured on an AI-enabled instance, a real
 * document review is ~20 s; becpg-ai cuts a silent plugin off at 180 s.
 *
 * Deliberately **shorter** than the route's own 120 s ceiling: this number is a
 * UX limit, not a correctness one. If the browser stops waiting first, the route
 * still finishes and still applies the verdict — the write lands, and the row
 * picks it up on its next read. Nobody loses a review by giving up on the
 * spinner; they only stop looking at it.
 */
const AI_REVIEW_TIMEOUT = 90000;

function labelsFor(lang) {
    return LABELS[lang] || LABELS.fr;
}

function fill(template, vars) {
    return template.replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]),
    );
}

/**
 * Human file size.
 *
 * @param {number} bytes
 * @returns {string}
 */
export function formatSize(bytes) {
    if (!bytes && bytes !== 0) {
        return '—';
    }
    if (bytes < 1024) {
        return `${bytes} o`;
    }
    if (bytes < 1024 * 1024) {
        return `${Math.round(bytes / 1024)} Ko`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Checks a file against the `accept` attribute (extensions and/or mime types)
 * and the size ceiling.
 *
 * @param {File} file
 * @param {Object} options `{ accept, maxBytes, labels }`
 * @returns {string|null} an error message, or null when the file is fine
 */
function validateFile(file, { accept, maxBytes, labels }) {
    if (!file || file.size === 0) {
        return labels.empty;
    }
    if (maxBytes && file.size > maxBytes) {
        return fill(labels.tooLarge, { size: formatSize(file.size), max: formatSize(maxBytes) });
    }
    if (!accept) {
        return null;
    }
    const patterns = accept.split(',').map((entry) => entry.trim().toLowerCase()).filter(Boolean);
    if (patterns.length === 0) {
        return null;
    }
    const name = file.name.toLowerCase();
    const type = (file.type || '').toLowerCase();
    const ok = patterns.some((pattern) => {
        if (pattern.startsWith('.')) {
            return name.endsWith(pattern);
        }
        if (pattern.endsWith('/*')) {
            return type.startsWith(pattern.slice(0, -1));
        }
        return type === pattern;
    });
    return ok ? null : fill(labels.badType, { name: file.name, accept });
}

/**
 * Why the validity dates typed next to the file cannot travel with it, as a key
 * of the labels table, or null when they can.
 *
 * Same rule as the validity editor: an end before the start is refused, and a
 * row that requires its validity requires at least the end date, the one the
 * expiry follows. Checked before the upload, because once the file has landed
 * the route reports a refused date as a success with `validity.applied: false`.
 *
 * @param {{editable: boolean, required: boolean}|null} validity the row's verdict
 * @param {{from: string, to: string}} dates `YYYY-MM-DD` strings, possibly empty
 * @returns {'validityInverted'|'validityMissing'|null}
 */
export function uploadValidityProblem(validity, dates) {
    if (!validity?.editable) {
        return null;
    }
    if (dates.from && dates.to && dates.from > dates.to) {
        return 'validityInverted';
    }
    if (validity.required && !dates.to) {
        return 'validityMissing';
    }
    return null;
}

/* -------------------------------------------------------------------------- */
/* AI validation                                                               */
/* -------------------------------------------------------------------------- */

const AI_TONES = {
    Valid: { tone: 'ok', icon: 'verified', key: 'aiValid' },
    ToValidate: { tone: 'info', icon: 'psychology', key: 'aiToValidate' },
    Refused: { tone: 'danger', icon: 'report', key: 'aiRefused' },
};

const AI_PILL_CLASS = {
    ok: 'pill pill-ok pill-no-dot pill-sm',
    info: 'pill pill-info pill-no-dot pill-sm',
    danger: 'pill pill-danger pill-no-dot pill-sm',
};

/**
 * The verdict `becpg-ai` left on the document. Renders **nothing** when there is
 * no verdict — an absent analysis must never look like a failed one.
 *
 * @param {Object} props
 * @param {string|null} props.state `bcpg:aiValidationState`
 * @param {string|null} [props.hints] `bcpg:aiValidationHints`
 * @param {string|null} [props.date] `bcpg:aiValidationDate`
 * @param {boolean} [props.withHints=false] render the hints under the badge
 */
export function AiValidationBadge({ state, hints, date, withHints = false, className = '' }) {
    const { lang } = useMessages();
    const labels = labelsFor(lang);
    const descriptor = state ? AI_TONES[state] : null;

    if (!descriptor) {
        return null;
    }

    const label = labels[descriptor.key];
    /*
     * `bcpg:aiValidationHints` ARRIVES AS HTML.
     *
     * becpg-ai stores the report of its review there, formatted by its own
     * templates. Put as is in a `title=`, the attribute does not render the
     * markup: it displays it. The tooltip of the « Document refusé par l'IA »
     * badge therefore showed `<p>` and `<li>` tags to a supplier.
     *
     * `plainText` extracts the lines from it — and, since the `richTextLines`
     * fix, without the content of the `<style>` blocks. It stays the right
     * answer for the `title=`, which holds one string and nothing else; the
     * report itself is rendered below with its structure, because flattened
     * into a single paragraph a review reads as one sentence of three hundred
     * words — its sections, its checks and their verdicts all run together.
     */
    const hintsText = hints ? plainText(hints) : '';
    const badge = (
        <span
            className={`${AI_PILL_CLASS[descriptor.tone]} ${className}`}
            title={hintsText || (date ? fill(labels.aiOn, { date: formatDateTime(date, lang) }) : label)}
        >
            <Icon name={descriptor.icon} size={13} />
            <span>{label}</span>
        </span>
    );

    if (!withHints || !hintsText) {
        return badge;
    }

    return (
        <div className="flex flex-col gap-1">
            {badge}
            <RichText
                value={hints}
                className="flex flex-col gap-1 break-words text-xs leading-relaxed text-[var(--becpg-dark-grey)]"
            />
            {date ? (
                <p className="text-[0.6875rem] text-[var(--becpg-dark-grey)]">
                    {fill(labels.aiOn, { date: formatDateTime(date, lang) })}
                </p>
            ) : null}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Upload                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * @param {Object} props
 * @param {string} [props.documentRef] the expected document (placeholder) to fill or renew
 * @param {string} [props.entityRef] the entity to attach a free deposit to
 * @param {'zone'|'inline'} [props.variant='zone'] big dashed area, or a compact row control
 * @param {string} [props.action] `'upload'` | `'renew'` — drives the button wording
 * @param {string} [props.accept='.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg'] HTML accept list
 * @param {number} [props.maxSizeMb=50]
 * @param {boolean} [props.majorVersion=true] a supplier deposit is a major version
 * @param {boolean} [props.disabled]
 * @param {string} [props.disabledReason] shown instead of the zone when disabled
 * @param {React.RefObject} [props.dropRef] extra element that also accepts the drop (the row)
 * @param {Function} [props.onUploaded] `(result, { attempt, last }) => void` — refresh the
 *   list. Called several times: once on the deposit, then after each re-read that lets the
 *   search index catch up with the AI verdict. `last` marks the final one, so a caller with
 *   something expensive to run — asking becpg-ai to analyse the entity again — runs it once
 *   rather than three times over, each attempt aborting the previous run's request while
 *   upstream kept computing it.
 * @param {Function} [props.onAiReview] `(review) => void` — the verdict returned by
 *   `POST /api/v1/documents/{id}/ai-review`, once, right after the upload. Optional:
 *   the row also picks the state up from beCPG on the next re-read, this is just the
 *   fast path that avoids waiting for the index.
 * @param {Function} [props.onCancel] renders a cancel button in the inline variant
 * @param {{state: string|null, hints: string|null, date: string|null}} [props.aiValidation]
 * @param {{editable: boolean, required: boolean, from: string|null, to: string|null}} [props.validity]
 *   the row's validity verdict; the date boxes are rendered only when `editable`
 * @param {boolean} [props.autoFocus] focus the trigger on mount (row expanded by the user)
 */
export function DocumentUpload({
    documentRef,
    entityRef,
    variant = 'zone',
    action,
    accept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg',
    maxSizeMb = DEFAULT_MAX_MB,
    majorVersion = true,
    disabled = false,
    disabledReason,
    dropRef,
    onUploaded,
    onAiReview,
    onCancel,
    aiValidation,
    validity = null,
    autoFocus = false,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = labelsFor(lang);
    const toast = useToast();
    const reduceMotion = useReducedMotion();
    const inputId = useId();
    const inputRef = useRef(null);
    const triggerRef = useRef(null);
    const zoneRef = useRef(null);
    const dragDepth = useRef(0);
    const alive = useRef(true);
    // A ref, not `busy`: two clicks or a click and a drop can land in the same
    // frame, before the state that disables the zone has rendered, and each
    // would POST the file.
    const inFlight = useRef(false);

    const [dragging, setDragging] = useState(false);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState(null);
    const [done, setDone] = useState(null);
    const [waitingForAi, setWaitingForAi] = useState(false);
    const [dates, setDates] = useState(() => ({
        from: toInputDate(validity && validity.from),
        to: toInputDate(validity && validity.to),
    }));
    // Mirrored in a ref: `upload` is memoised, and the drag & drop listeners are
    // re-registered whenever it changes — rebuilding them on every keystroke in a
    // date box would be absurd, and a date typed afterwards must still travel
    // with the file.
    const datesRef = useRef(dates);
    const changeDates = useCallback((next) => {
        datesRef.current = next;
        setDates(next);
    }, []);

    const maxBytes = maxSizeMb ? maxSizeMb * 1024 * 1024 : 0;
    const busy = progress !== null;

    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    useEffect(() => {
        if (autoFocus && triggerRef.current) {
            triggerRef.current.focus();
        }
    }, [autoFocus]);

    /**
     * Asks becpg-ai to review the file that was just uploaded, and hands the
     * verdict to the caller through `onAiReview`.
     *
     * Everything here is best-effort by construction. The upload has already
     * succeeded when this runs, so a review that fails, times out, or finds
     * nothing to say must leave the user with a successful deposit and no
     * verdict — never with an error. That is why nothing throws out of here and
     * why the toast is not used: a supplier who deposited a valid certificate
     * has no use for "AI unavailable".
     *
     * @param {Object|null} result the upload result, carrying the new `nodeRef`
     * @returns {Promise<Object|null>} the review, or `null`
     */
    const requestAiReview = useCallback(
        async (result) => {
            const nodeRef = result && result.nodeRef;
            if (!nodeRef) {
                return null;
            }
            // becpg-ai identifies a node by its bare uuid.
            const documentId = String(nodeRef).split('/').pop();
            if (!documentId) {
                return null;
            }

            try {
                const review = await api.post(
                    `documents/${encodeURIComponent(documentId)}/ai-review`,
                    { locale: lang },
                    { timeout: AI_REVIEW_TIMEOUT },
                );
                if (alive.current && onAiReview) {
                    onAiReview(review);
                }
                return review;
            }
            catch (cause) {
                // Nothing for the supplier (see above), but a trace for whoever
                // wonders why a row never got its verdict.
                console.warn('AI review request failed', { document: documentId, status: cause?.status });
                return null;
            }
        },
        [lang, onAiReview],
    );

    /**
     * Uploads one file. Every failure surfaces twice — inline (so it stays next
     * to the requirement it belongs to) and as a toast (so it is noticed when
     * the row has scrolled away).
     */
    const upload = useCallback(
        async (file) => {
            if (inFlight.current) {
                return;
            }
            const invalid = validateFile(file, { accept, maxBytes, labels });
            const validityProblem = uploadValidityProblem(validity, datesRef.current);
            if (invalid || validityProblem) {
                setError(invalid || labels[validityProblem]);
                setDone(null);
                return;
            }

            setError(null);
            setDone(null);
            setProgress(0);
            inFlight.current = true;

            try {
                const result = await api.upload(
                    'documents',
                    file,
                    {
                        ...(documentRef ? { documentRef } : {}),
                        ...(entityRef && !documentRef ? { entityRef } : {}),
                        majorVersion: majorVersion ? 'true' : 'false',
                        // Only when the row says the supplier owns them: on an
                        // AUTO or NONE type the route refuses the write, and
                        // rightly so.
                        ...(validity && validity.editable && datesRef.current.from
                            ? { validFrom: datesRef.current.from }
                            : {}),
                        ...(validity && validity.editable && datesRef.current.to
                            ? { validTo: datesRef.current.to }
                            : {}),
                    },
                    { onProgress: (percent) => alive.current && setProgress(percent) },
                ).finally(() => {
                    inFlight.current = false;
                });

                if (!alive.current) {
                    return;
                }
                setProgress(null);
                setDone({ name: file.name, size: file.size, ...(result || {}) });
                if (result?.validity?.applied === false) {
                    setError(labels.validityNotApplied);
                    toast.error(new Error(labels.validityNotApplied));
                }

                if (onUploaded) {
                    onUploaded(result, { attempt: 0, last: false });
                }

                // Ask for the AI verdict instead of waiting for one.
                //
                // This used to poll `onUploaded` hoping `bcpg:aiValidationState`
                // would appear. It could not: nothing in beCPG calls becpg-ai, so
                // the field the UI was watching had no author and the wait always
                // timed out. The portal now requests the review itself and the
                // route applies it, which is what finally makes the state exist.
                setWaitingForAi(true);
                await requestAiReview(result);
                if (!alive.current) {
                    return;
                }

                // The verdict is written; these re-reads only let the search index
                // catch up so the row shows it.
                for (let attempt = 1; attempt <= AI_POLL_ATTEMPTS; attempt += 1) {
                    await new Promise((resolve) => setTimeout(resolve, AI_POLL_DELAY));
                    if (!alive.current) {
                        return;
                    }
                    if (onUploaded) {
                        // `last` is what tells a caller it may run something
                        // expensive — a becpg-ai re-read — once instead of on
                        // each of these re-reads. See the JSDoc above.
                        onUploaded(result, { attempt, last: attempt === AI_POLL_ATTEMPTS });
                    }
                }
                if (alive.current) {
                    setWaitingForAi(false);
                }
            }
            catch (cause) {
                if (!alive.current) {
                    return;
                }
                setProgress(null);
                setWaitingForAi(false);
                setError(cause?.message || labels.failed);
                toast.error(cause);
            }
        },
        [accept, maxBytes, labels, documentRef, entityRef, majorVersion, validity, onUploaded,
            requestAiReview, toast],
    );

    const onFiles = useCallback(
        (fileList) => {
            const file = fileList && fileList.length > 0 ? fileList[0] : null;
            if (file) {
                upload(file);
            }
        },
        [upload],
    );

    // --- Drag & drop, on the zone and (optionally) on the whole row ---------
    useEffect(() => {
        if (disabled) {
            return undefined;
        }
        const targets = [zoneRef.current, dropRef ? dropRef.current : null].filter(Boolean);
        if (targets.length === 0) {
            return undefined;
        }

        const carriesFiles = (event) =>
            Boolean(event.dataTransfer && Array.from(event.dataTransfer.types || []).includes('Files'));

        const onDragEnter = (event) => {
            if (!carriesFiles(event)) {
                return;
            }
            event.preventDefault();
            dragDepth.current += 1;
            setDragging(true);
        };
        const onDragOver = (event) => {
            if (!carriesFiles(event)) {
                return;
            }
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
        };
        const onDragLeave = () => {
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) {
                setDragging(false);
            }
        };
        const onDrop = (event) => {
            if (!carriesFiles(event)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            dragDepth.current = 0;
            setDragging(false);
            // Still prevented above, or the browser would open the file in
            // place of the portal.
            if (inFlight.current) {
                return;
            }
            onFiles(event.dataTransfer.files);
        };

        targets.forEach((target) => {
            target.addEventListener('dragenter', onDragEnter);
            target.addEventListener('dragover', onDragOver);
            target.addEventListener('dragleave', onDragLeave);
            target.addEventListener('drop', onDrop);
        });
        return () => {
            targets.forEach((target) => {
                target.removeEventListener('dragenter', onDragEnter);
                target.removeEventListener('dragover', onDragOver);
                target.removeEventListener('dragleave', onDragLeave);
                target.removeEventListener('drop', onDrop);
            });
        };
    }, [disabled, dropRef, onFiles]);

    if (disabled) {
        return (
            <p className={`flex items-center gap-1.5 text-xs text-[var(--becpg-dark-grey)] ${className}`}>
                <Icon name="lock_outline" size={14} />
                <span>{disabledReason || labels.locked}</span>
            </p>
        );
    }

    const input = (
        <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={accept}
            className="sr-only-text"
            onChange={(event) => {
                onFiles(event.target.files);
                // Let the same file be chosen twice in a row (retry after a failure).
                event.target.value = '';
            }}
        />
    );

    const progressBar = busy ? (
        <div className="mt-2 w-full" role="status" aria-live="polite">
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-[var(--becpg-blue)]">
                    <Spinner size={14} />
                    {labels.uploading}
                </span>
                <span className="tabular-nums text-[var(--becpg-dark-grey)]">{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--becpg-grey)]">
                <motion.div
                    className="h-full rounded-full bg-[var(--becpg-blue-light)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: reduceMotion ? 0 : 0.2 }}
                />
            </div>
        </div>
    ) : null;

    const feedback = (
        <>
            {error ? (
                <p
                    role="alert"
                    className="mt-2 flex items-start gap-1.5 rounded-lg bg-[var(--status-danger-bg)] px-2.5 py-1.5 text-xs text-[var(--status-danger)]"
                >
                    <Icon name="error_outline" size={14} className="mt-px" />
                    <span className="min-w-0 break-words">{error}</span>
                </p>
            ) : null}

            {done && !busy ? (
                <motion.div
                    initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 rounded-lg bg-[var(--status-ok-bg)] px-2.5 py-2 text-xs text-[var(--status-ok)]"
                    role="status"
                >
                    <p className="flex items-center gap-1.5 font-medium">
                        <Icon name="check_circle" size={14} />
                        <span className="min-w-0 truncate">{done.fileName || done.name}</span>
                    </p>
                    <p className="mt-0.5 text-[var(--becpg-dark-grey)]">{labels.doneHint}</p>
                </motion.div>
            ) : null}

            {aiValidation && aiValidation.state ? (
                <div className="mt-2">
                    <AiValidationBadge
                        state={aiValidation.state}
                        hints={aiValidation.hints}
                        date={aiValidation.date}
                        withHints
                    />
                </div>
            ) : waitingForAi && !busy ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--becpg-dark-grey)]">
                    <Spinner size={13} />
                    {labels.analysing}
                </p>
            ) : null}
        </>
    );

    /*
        THE DATES BEFORE THE BUTTON, NOT AFTER IT.

        They are printed on the document the supplier is holding at the moment he
        files it. Asked for after the upload, they assume he comes back to a row
        that already looks settled — which he does not.
    */
    const validityBoxes = validity && validity.editable ? (
        <div className="mb-2">
            <ValidityFields
                from={dates.from}
                to={dates.to}
                onChange={changeDates}
                required={validity.required}
                disabled={busy}
                idPrefix={`upload-${inputId}`}
            />
            <p className="mt-1 text-[0.6875rem] text-[var(--becpg-dark-grey)]">{labels.validityHint}</p>
        </div>
    ) : null;

    /* ----------------------------------------------------------- inline form */
    if (variant === 'inline') {
        return (
            <div ref={zoneRef} className={`min-w-0 ${className}`}>
                {input}
                {validityBoxes}
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        ref={triggerRef}
                        variant={dragging ? 'accent' : 'outline'}
                        size="sm"
                        icon={action === 'renew' ? 'autorenew' : 'upload_file'}
                        loading={busy}
                        onClick={() => inputRef.current && inputRef.current.click()}
                    >
                        {action === 'renew' ? labels.renew : labels.deposit}
                    </Button>
                    <span className="hidden text-xs text-[var(--becpg-dark-grey)] sm:inline">
                        {dragging ? labels.drop : fill(labels.accepted, { accept, max: `${maxSizeMb} Mo` })}
                    </span>
                    {onCancel ? (
                        <Button variant="subtle" size="sm" onClick={onCancel}>
                            {labels.cancel}
                        </Button>
                    ) : null}
                </div>
                {progressBar}
                {feedback}
            </div>
        );
    }

    /* --------------------------------------------------------------- big zone */
    return (
        <div className={`min-w-0 ${className}`}>
            {input}
            {validityBoxes}
            <button
                ref={(node) => {
                    zoneRef.current = node;
                    triggerRef.current = node;
                }}
                type="button"
                onClick={() => inputRef.current && inputRef.current.click()}
                disabled={busy}
                aria-busy={busy || undefined}
                className={[
                    'flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed',
                    'px-4 py-6 text-center transition-colors duration-150 disabled:cursor-progress disabled:opacity-60',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] focus-visible:ring-offset-2',
                    dragging
                        ? 'border-[var(--becpg-orange)] bg-[var(--becpg-orange)]/5'
                        : 'border-[var(--becpg-grey)] bg-white hover:border-[var(--becpg-blue-light)] hover:bg-[var(--becpg-blue-lighter)]/30',
                ].join(' ')}
            >
                <Icon
                    name={dragging ? 'file_download' : 'cloud_upload'}
                    size={28}
                    className={dragging ? 'text-[var(--becpg-orange)]' : 'text-[var(--becpg-blue-light)]'}
                />
                <span className="text-sm font-medium">{labels.drop}</span>
                <span className="text-xs text-[var(--becpg-dark-grey)]">
                    {labels.or} <span className="underline underline-offset-2">{labels.browse}</span>
                </span>
                <span className="mt-1 text-[0.6875rem] text-[var(--becpg-dark-grey)]">
                    {fill(labels.accepted, { accept, max: `${maxSizeMb} Mo` })}
                </span>
            </button>
            {progressBar}
            {feedback}
        </div>
    );
}
