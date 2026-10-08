'use client';

/**
 * "Enregistré à HH:MM" — the visible half of spec §4.4 F2.
 *
 * The indicator is small, but it carries the whole promise of the redesign: the
 * supplier must be able to *see* that nothing is lost, and must be told —
 * clearly, never silently — when a save failed and what to do about it.
 *
 * Four states, four messages:
 *
 * | status | rendering |
 * |---|---|
 * | `idle` | nothing (no save yet, nothing pending) |
 * | `pending` | "Modifications en attente" — a save is coming |
 * | `saving` | spinner + "Enregistrement…" |
 * | `saved` | check + **"enregistré à HH:MM"** |
 * | `error` | red + the resolved message + a "Réessayer" button |
 *
 * The transition between two states is animated (framer-motion) so a save that
 * takes 200 ms does not flash: the text swaps, the row does not move.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { Icon, Spinner } from '@/components/ui/Button';
import { useMessages } from '@/lib/messages';
import { formatTime } from '@/lib/format';
import { AUTOSAVE_STATUS } from '@/components/wizard/useAutoSave';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/wizard/AutoSaveIndicator#LABELS', {
    fr: {
        pending: 'Modifications en attente',
        saving: 'Enregistrement…',
        saved: 'enregistré à {time}',
        savedShort: 'Enregistré',
        error: 'Enregistrement impossible',
        retry: 'Réessayer',
        unsaved: 'Vos modifications ne sont pas perdues : elles seront renvoyées.',
    },
    en: {
        pending: 'Pending changes',
        saving: 'Saving…',
        saved: 'saved at {time}',
        savedShort: 'Saved',
        error: 'Could not save',
        retry: 'Retry',
        unsaved: 'Your changes are not lost: they will be sent again.',
    },
});

/**
 * @param {Object} props
 * @param {string} props.status one of {@link AUTOSAVE_STATUS}
 * @param {Date|null} [props.savedAt]
 * @param {Error} [props.error] an `ApiError` resolves its own chrome message
 * @param {Function} [props.onRetry]
 * @param {boolean} [props.compact] icon + time only (mobile footer)
 * @param {string} [props.className]
 */
export function AutoSaveIndicator({
    status,
    savedAt = null,
    error = null,
    onRetry,
    compact = false,
    className = '',
}) {
    const { lang, t } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const reduceMotion = useReducedMotion();

    if (status === AUTOSAVE_STATUS.IDLE && !savedAt) {
        return null;
    }

    const time = formatTime(savedAt, lang);

    let icon = 'cloud_done';
    let tone = 'text-[var(--becpg-dark-grey)]';
    let text = time ? labels.saved.replace('{time}', time) : labels.savedShort;

    if (status === AUTOSAVE_STATUS.PENDING) {
        icon = 'cloud_sync';
        text = labels.pending;
    }
    else if (status === AUTOSAVE_STATUS.SAVING) {
        icon = null;
        text = labels.saving;
    }
    else if (status === AUTOSAVE_STATUS.ERROR) {
        icon = 'cloud_off';
        tone = 'text-[var(--status-danger,#d32f2f)]';
        text = t(error && error.messageKey ? error.messageKey : 'error.generic');
    }
    else if (status === AUTOSAVE_STATUS.SAVED) {
        tone = 'text-[var(--becpg-dark-grey)]';
    }

    const isError = status === AUTOSAVE_STATUS.ERROR;

    return (
        <div
            role="status"
            aria-live="polite"
            className={`flex min-w-0 items-center gap-1.5 text-xs ${tone} ${className}`}
        >
            {icon ? (
                <Icon name={icon} size={16} className="shrink-0" />
            ) : (
                <Spinner size={14} className="shrink-0" />
            )}

            {/*
                Entrée seule, sans `AnimatePresence mode="wait"` : ce mode a figé
                le corps de l'assistant (voir le commentaire de `Wizard.js`), et
                l'indicateur d'enregistrement est le dernier endroit où l'on peut
                se permettre un texte bloqué — il dit au fournisseur si sa saisie
                est partie. « Enregistré » qui resterait affiché sur un échec
                serait un mensonge, pas une imperfection d'animation.
            */}
            <motion.span
                key={`${status}-${text}`}
                initial={reduceMotion ? false : { opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.15 }}
                className={compact && !isError ? 'truncate' : 'min-w-0 truncate'}
            >
                {isError ? (
                    <span className="font-medium">{labels.error}</span>
                ) : null}
                {isError ? ' · ' : ''}
                {text}
            </motion.span>

            {isError && onRetry ? (
                <button
                    type="button"
                    onClick={onRetry}
                    className="touch-target shrink-0 rounded px-1 font-medium underline underline-offset-2 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                >
                    {labels.retry}
                </button>
            ) : null}
        </div>
    );
}

/**
 * The reassurance line shown under the indicator when a save failed: the input
 * is still there, and it will be sent again. Kept separate so the footer can
 * place it where there is room.
 *
 * @param {Object} props
 * @param {string} props.status
 */
export function AutoSaveReassurance({ status, className = '' }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);

    if (status !== AUTOSAVE_STATUS.ERROR) {
        return null;
    }
    return (
        <p className={`text-xs text-[var(--becpg-dark-grey)] ${className}`}>{labels.unsaved}</p>
    );
}
