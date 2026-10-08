'use client';

/**
 * Toast presentation. The queue itself lives in
 * `components/providers/ToastProvider.js` — this file only knows how a
 * notification looks and how it is announced.
 *
 * Placement is deliberately different per breakpoint: **top** on a phone (the
 * bottom of the screen is the nav bar and the thumb zone) and **bottom-right**
 * on a desktop. `role="status"` + `aria-live="polite"` for information,
 * `role="alert"` + `assertive` for an error — an error must interrupt.
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon, IconButton } from '@/components/ui/Button';
import { useMessages } from '@/lib/messages';

/** Variant → icon + colours. Same semantics as the status tones. */
export const TOAST_VARIANTS = Object.freeze({
    success: {
        icon: 'check_circle',
        bar: 'var(--status-ok)',
        chip: 'text-[var(--status-ok)] bg-[var(--status-ok-bg)]',
    },
    error: {
        icon: 'error_outline',
        bar: 'var(--status-danger)',
        chip: 'text-[var(--status-danger)] bg-[var(--status-danger-bg)]',
    },
    warning: {
        icon: 'warning_amber',
        bar: 'var(--status-warn)',
        chip: 'text-[var(--status-warn)] bg-[var(--status-warn-bg)]',
    },
    info: {
        icon: 'info_outline',
        bar: 'var(--status-info)',
        chip: 'text-[var(--status-info)] bg-[var(--status-info-bg)]',
    },
});

/**
 * A single toast.
 *
 * @param {Object} props
 * @param {string} props.id
 * @param {'success'|'error'|'warning'|'info'} [props.variant='info']
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.message]
 * @param {{label: string, onClick: Function}} [props.action]
 * @param {Function} props.onDismiss called with the id
 */
export function Toast({ id, variant = 'info', title, message, action, onDismiss }) {
    const { t } = useMessages();
    const palette = TOAST_VARIANTS[variant] || TOAST_VARIANTS.info;
    const assertive = variant === 'error';

    return (
        <div
            role={assertive ? 'alert' : 'status'}
            aria-live={assertive ? 'assertive' : 'polite'}
            className="pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-[var(--becpg-blue-lighter)] bg-white p-3 shadow-[var(--becpg-shadow-overlay)]"
        >
            <span className="absolute inset-y-0 start-0 w-1" style={{ background: palette.bar }} aria-hidden="true" />
            <span className={`ms-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${palette.chip}`}>
                <Icon name={palette.icon} size={18} />
            </span>
            <div className="min-w-0 flex-1 py-0.5">
                {title ? (
                    <p className="text-sm font-medium leading-tight text-[var(--becpg-blue)]">{title}</p>
                ) : null}
                {message ? (
                    <p className="mt-0.5 break-words text-xs leading-relaxed text-[var(--becpg-dark-grey)]">
                        {message}
                    </p>
                ) : null}
                {action ? (
                    <button
                        type="button"
                        onClick={() => {
                            action.onClick();
                            onDismiss(id);
                        }}
                        className="mt-1.5 rounded text-xs font-medium text-[var(--becpg-blue-light)] underline underline-offset-2 hover:text-[var(--becpg-orange-deep)]"
                    >
                        {action.label}
                    </button>
                ) : null}
            </div>
            <IconButton
                icon="close"
                size="sm"
                label={t('action.close')}
                onClick={() => onDismiss(id)}
                className="-me-1 -mt-1"
            />
        </div>
    );
}

/**
 * Fixed stack of toasts. Rendered once by `ToastProvider`.
 *
 * @param {Object} props
 * @param {Array<Object>} props.toasts
 * @param {Function} props.onDismiss
 */
export function ToastViewport({ toasts, onDismiss }) {
    const reduceMotion = useReducedMotion();
    return (
        <div
            className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 p-3 sm:inset-x-auto sm:bottom-0 sm:end-0 sm:top-auto sm:items-end sm:p-4"
            style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
        >
            <AnimatePresence initial={false}>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        layout={!reduceMotion}
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="pointer-events-auto w-full max-w-sm"
                    >
                        <Toast {...toast} onDismiss={onDismiss} />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
