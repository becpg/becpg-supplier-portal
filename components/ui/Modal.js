'use client';

/**
 * Dialogs.
 *
 * On a phone a centred dialog is the wrong shape: it fights the keyboard and
 * puts its actions out of thumb reach. So a Modal is a **bottom sheet below
 * `sm`** and a centred panel above — same component, same props, one media
 * query. Actions stay pinned at the bottom in both forms.
 *
 * Accessibility is done by hand (no Radix, rule 3): `role="dialog"`,
 * `aria-modal`, focus moved into the panel on open, Tab cycling kept inside,
 * Escape and backdrop close, focus restored to the opener, body scroll locked.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button, ButtonGroup, IconButton } from '@/components/ui/Button';
import { useMessages } from '@/lib/messages';

const SIZES = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
    full: 'sm:max-w-[min(96vw,1200px)]',
};

const FOCUSABLE =
    'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onClose called by Escape, the backdrop and the close button
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.description] sub-title, also the accessible description
 * @param {React.ReactNode} [props.footer] action bar; `<ButtonGroup>` is the usual content
 * @param {'sm'|'md'|'lg'|'xl'|'full'} [props.size='md']
 * @param {boolean} [props.closeOnBackdrop=true]
 * @param {boolean} [props.closeOnEscape=true]
 * @param {boolean} [props.hideClose=false] hides the ✕ (for a blocking dialog)
 * @param {React.RefObject} [props.initialFocusRef] element focused on open
 * @param {React.ReactNode} props.children
 */
export function Modal({
    open,
    onClose,
    title,
    description,
    footer,
    size = 'md',
    closeOnBackdrop = true,
    closeOnEscape = true,
    hideClose = false,
    initialFocusRef,
    className = '',
    bodyClassName = '',
    children,
}) {
    const { t } = useMessages();
    const reduceMotion = useReducedMotion();
    const panelRef = useRef(null);
    const openerRef = useRef(null);
    const generatedId = useId();
    const titleId = `modal-title-${generatedId}`;
    const descriptionId = `modal-description-${generatedId}`;

    const handleKeyDown = useCallback(
        (event) => {
            if (event.key === 'Escape' && closeOnEscape) {
                event.stopPropagation();
                onClose();
                return;
            }
            if (event.key !== 'Tab' || !panelRef.current) {
                return;
            }
            const nodes = Array.from(panelRef.current.querySelectorAll(FOCUSABLE)).filter(
                (node) => node.offsetParent !== null,
            );
            if (nodes.length === 0) {
                event.preventDefault();
                panelRef.current.focus();
                return;
            }
            const first = nodes[0];
            const last = nodes[nodes.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            }
            else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        },
        [closeOnEscape, onClose],
    );

    useEffect(() => {
        if (!open) {
            return undefined;
        }
        openerRef.current = document.activeElement;
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';

        const frame = requestAnimationFrame(() => {
            if (initialFocusRef && initialFocusRef.current) {
                initialFocusRef.current.focus();
            }
            else if (panelRef.current) {
                const first = panelRef.current.querySelector(FOCUSABLE);
                (first || panelRef.current).focus();
            }
        });

        return () => {
            cancelAnimationFrame(frame);
            document.body.style.overflow = overflow;
            if (openerRef.current && typeof openerRef.current.focus === 'function') {
                openerRef.current.focus();
            }
        };
    }, [open, initialFocusRef]);

    // No "mounted" state: `open` is false during SSR and hydration, so the
    // portal renders nothing on both sides and the trees match.
    if (typeof document === 'undefined') {
        return null;
    }

    const panelMotion = reduceMotion
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
        : {
              initial: { opacity: 0, y: 24, scale: 0.98 },
              animate: { opacity: 1, y: 0, scale: 1 },
              exit: { opacity: 0, y: 24, scale: 0.98 },
          };

    return createPortal(
        <AnimatePresence>
            {open ? (
                <div
                    className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
                    role="presentation"
                >
                    <motion.div
                        className="absolute inset-0 bg-[rgba(0,66,84,0.45)] backdrop-blur-[2px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={closeOnBackdrop ? onClose : undefined}
                        aria-hidden="true"
                    />
                    <motion.div
                        {...panelMotion}
                        transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: 'easeOut' }}
                        ref={panelRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={title ? titleId : undefined}
                        aria-describedby={description ? descriptionId : undefined}
                        tabIndex={-1}
                        onKeyDown={handleKeyDown}
                        // The 3px `--becpg-top-bar-border-color` edge at the top of the
                        // panel is the same rule that closes the application toolbar
                        // (`.becpg-toolbar-edge`): it is what makes a bottom sheet on a
                        // phone read as part of the product rather than as a floating
                        // white rectangle. Elevation is the blue-tinted
                        // `--becpg-shadow-overlay`, not Tailwind's neutral `shadow-2xl`.
                        className={[
                            'relative flex max-h-[92vh] w-full flex-col overflow-hidden bg-white',
                            'shadow-[var(--becpg-shadow-overlay)]',
                            'border-t-[3px] border-t-[var(--becpg-top-bar-border-color)]',
                            'rounded-t-2xl sm:rounded-2xl',
                            SIZES[size] || SIZES.md,
                            className,
                        ]
                            .filter(Boolean)
                            .join(' ')}
                    >
                        {/* Drag affordance — the sheet grabber, phones only. */}
                        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[var(--becpg-blue-lighter)] sm:hidden" />

                        {title || !hideClose ? (
                            <header className="flex items-start gap-3 px-4 pb-3 pt-3 sm:px-6 sm:pt-5">
                                <div className="min-w-0 flex-1">
                                    {title ? (
                                        <h2
                                            id={titleId}
                                            className="text-base font-medium text-[var(--becpg-blue)] sm:text-lg"
                                        >
                                            {title}
                                        </h2>
                                    ) : null}
                                    {description ? (
                                        <p
                                            id={descriptionId}
                                            className="mt-0.5 text-xs text-[var(--becpg-dark-grey)] sm:text-sm"
                                        >
                                            {description}
                                        </p>
                                    ) : null}
                                </div>
                                {hideClose ? null : (
                                    <IconButton icon="close" label={t('action.close')} onClick={onClose} />
                                )}
                            </header>
                        ) : null}

                        <div className={`flex-1 overflow-y-auto px-4 pb-4 sm:px-6 ${bodyClassName}`}>
                            {children}
                        </div>

                        {footer ? (
                            <footer className="safe-bottom border-t border-[var(--becpg-blue-lighter)] bg-[rgba(228,236,238,0.4)] px-4 py-3 sm:px-6">
                                {footer}
                            </footer>
                        ) : null}
                    </motion.div>
                </div>
            ) : null}
        </AnimatePresence>,
        document.body,
    );
}

/**
 * Confirmation dialog. The destructive path is explicit: `tone="danger"` turns
 * the confirm button red and it is never the auto-focused element.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onClose
 * @param {Function} props.onConfirm may return a promise; the button shows a spinner meanwhile
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.message]
 * @param {string} [props.confirmLabel] defaults to `action.confirm`
 * @param {string} [props.cancelLabel] defaults to `action.cancel`
 * @param {'primary'|'danger'} [props.tone='primary']
 */
export function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel,
    cancelLabel,
    tone = 'primary',
    children,
}) {
    const { t } = useMessages();
    const [busy, setBusy] = useState(false);
    const cancelRef = useRef(null);

    const confirm = async () => {
        try {
            setBusy(true);
            await onConfirm();
            onClose();
        }
        finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={busy ? () => {} : onClose}
            title={title}
            size="sm"
            initialFocusRef={tone === 'danger' ? cancelRef : undefined}
            footer={
                <ButtonGroup>
                    <Button ref={cancelRef} variant="outline" onClick={onClose} disabled={busy}>
                        {cancelLabel || t('action.cancel')}
                    </Button>
                    <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} onClick={confirm}>
                        {confirmLabel || t('action.confirm')}
                    </Button>
                </ButtonGroup>
            }
        >
            {message ? <p className="text-sm leading-relaxed">{message}</p> : null}
            {children}
        </Modal>
    );
}
