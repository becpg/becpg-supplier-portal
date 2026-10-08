'use client';

/**
 * Help tooltips (spec §4.3: "Tooltips d'aide (?) sur chaque champ").
 *
 * A tooltip that only reacts to `:hover` is invisible on a phone, and half of
 * this portal is used on a phone. So the trigger is a real **button**:
 *
 *   - tap / click        toggles the bubble (this is the touch path)
 *   - hover / focus      opens it on a pointer device
 *   - Escape, outside tap, scroll  close it
 *
 * The bubble is rendered in a portal at the end of `<body>` and positioned from
 * the trigger's bounding box, so it is never clipped by a card's `overflow`
 * or by a table's horizontal scroller, and its width is clamped to the viewport
 * so it stays readable on a 360px screen.
 *
 * `children`, when given, replaces the `?` icon and is wrapped in the trigger
 * button — so it must be non-interactive content (text, a pill, an icon).
 *
 * The content is plain text or nodes — for a form field it is the beCPG
 * dictionary description (`field.description` / `field.help`), already translated.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@/components/ui/Button';

/** Gap between the trigger and the bubble, in px. */
const OFFSET = 8;

/** Viewport margin the bubble never crosses, in px. */
const MARGIN = 8;

function computePosition(rect, bubble, placement) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(bubble.width, viewportWidth - MARGIN * 2);
    let top;
    let left;
    let resolved = placement;

    if (placement === 'top' && rect.top - bubble.height - OFFSET < MARGIN) {
        resolved = 'bottom';
    }
    if (placement === 'bottom' && rect.bottom + bubble.height + OFFSET > viewportHeight - MARGIN) {
        resolved = 'top';
    }

    switch (resolved) {
        case 'bottom':
            top = rect.bottom + OFFSET;
            left = rect.left + rect.width / 2 - width / 2;
            break;
        case 'left':
            top = rect.top + rect.height / 2 - bubble.height / 2;
            left = rect.left - width - OFFSET;
            break;
        case 'right':
            top = rect.top + rect.height / 2 - bubble.height / 2;
            left = rect.right + OFFSET;
            break;
        default:
            top = rect.top - bubble.height - OFFSET;
            left = rect.left + rect.width / 2 - width / 2;
            break;
    }

    left = Math.max(MARGIN, Math.min(left, viewportWidth - width - MARGIN));
    top = Math.max(MARGIN, Math.min(top, viewportHeight - bubble.height - MARGIN));
    return { top, left, width, placement: resolved };
}

/**
 * @param {Object} props
 * @param {React.ReactNode} props.content the help text (nodes allowed)
 * @param {React.ReactNode} [props.children] custom trigger; a `?` help button when omitted
 * @param {'top'|'bottom'|'left'|'right'} [props.placement='top'] preferred side (flips when it does not fit)
 * @param {string} [props.label] accessible name of the default `?` trigger
 * @param {'help'|'info'|'plain'} [props.variant='help'] icon of the default trigger
 * @param {number} [props.maxWidth=280] bubble max width in px
 * @param {boolean} [props.disabled] renders the trigger without any tooltip behaviour
 * @param {number} [props.openDelay=120] hover delay in ms (0 on tap/focus)
 */
export function Tooltip({
    content,
    children,
    placement = 'top',
    label,
    variant = 'help',
    maxWidth = 280,
    disabled = false,
    openDelay = 120,
    className = '',
}) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState(null);
    const triggerRef = useRef(null);
    const bubbleRef = useRef(null);
    const hoverTimer = useRef(null);
    const bubbleId = useId();

    useEffect(
        () => () => {
            if (hoverTimer.current) {
                clearTimeout(hoverTimer.current);
            }
        },
        [],
    );

    const place = useCallback(() => {
        if (!triggerRef.current || !bubbleRef.current) {
            return;
        }
        const rect = triggerRef.current.getBoundingClientRect();
        const bubble = {
            width: Math.min(maxWidth, bubbleRef.current.offsetWidth || maxWidth),
            height: bubbleRef.current.offsetHeight || 0,
        };
        setPosition(computePosition(rect, bubble, placement));
    }, [maxWidth, placement]);

    // useEffect rather than useLayoutEffect: the bubble starts off-screen and
    // fades in, so measuring after paint costs nothing and keeps SSR quiet.
    useEffect(() => {
        if (open) {
            place();
        }
    }, [open, place]);

    useEffect(() => {
        if (!open) {
            return undefined;
        }
        const close = () => setOpen(false);
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                close();
                if (triggerRef.current) {
                    triggerRef.current.focus();
                }
            }
        };
        const onPointerDown = (event) => {
            if (
                triggerRef.current &&
                !triggerRef.current.contains(event.target) &&
                bubbleRef.current &&
                !bubbleRef.current.contains(event.target)
            ) {
                close();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('pointerdown', onPointerDown, true);
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [open]);

    if (disabled || content === null || content === undefined || content === '') {
        return children || null;
    }

    const openNow = () => {
        if (hoverTimer.current) {
            clearTimeout(hoverTimer.current);
            hoverTimer.current = null;
        }
        setOpen(true);
    };
    const openDelayed = () => {
        if (hoverTimer.current) {
            clearTimeout(hoverTimer.current);
        }
        hoverTimer.current = setTimeout(() => setOpen(true), openDelay);
    };
    const closeNow = () => {
        if (hoverTimer.current) {
            clearTimeout(hoverTimer.current);
            hoverTimer.current = null;
        }
        setOpen(false);
    };

    const triggerProps = {
        ref: triggerRef,
        type: 'button',
        'aria-describedby': open ? bubbleId : undefined,
        'aria-expanded': open,
        onClick: (event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen((value) => !value);
        },
        onPointerEnter: (event) => {
            if (event.pointerType !== 'touch') {
                openDelayed();
            }
        },
        onPointerLeave: (event) => {
            if (event.pointerType !== 'touch') {
                closeNow();
            }
        },
        onFocus: openNow,
        onBlur: closeNow,
    };

    const icon = variant === 'info' ? 'info_outline' : 'help_outline';

    const trigger = children ? (
        <button
            {...triggerProps}
            className={`inline-flex cursor-help items-center gap-1 text-start ${className}`}
        >
            {children}
        </button>
    ) : (
        <button
            {...triggerProps}
            aria-label={label || 'Aide'}
            className={[
                'inline-flex h-6 w-6 items-center justify-center rounded-full align-middle',
                'text-[var(--becpg-blue-light)] transition-colors',
                'hover:bg-[var(--becpg-blue-lighter)] hover:text-[var(--becpg-blue)]',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]',
                open ? 'bg-[var(--becpg-blue-lighter)] text-[var(--becpg-blue)]' : '',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <Icon name={icon} size={16} />
        </button>
    );

    const bubble = (
        <AnimatePresence>
            {open ? (
                <motion.div
                    ref={bubbleRef}
                    id={bubbleId}
                    role="tooltip"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.12, ease: 'easeOut' }}
                    style={{
                        position: 'fixed',
                        top: position ? position.top : -9999,
                        left: position ? position.left : -9999,
                        maxWidth,
                        zIndex: 90,
                    }}
                    /* The bubble is the toolbar's own pairing — white on
                       `--becpg-blue`, 11.0:1 — closed by a 2px
                       `--becpg-top-bar-border-color` rule so it is recognisably
                       beCPG and so its edge is visible on a dark screenshot. */
                    className="rounded-lg border-b-2 border-b-[var(--becpg-top-bar-border-color)] bg-[var(--becpg-blue)] px-3 py-2 text-xs leading-relaxed text-white shadow-[var(--becpg-shadow-overlay)]"
                >
                    {content}
                </motion.div>
            ) : null}
        </AnimatePresence>
    );

    return (
        <>
            {trigger}
            {/* No "mounted" state: the bubble only exists while `open` is true,
                which it never is during SSR or hydration, so the portal renders
                nothing on either side and the trees match. */}
            {typeof document === 'undefined' ? null : createPortal(bubble, document.body)}
        </>
    );
}

/**
 * Shorthand for the `?` affordance next to a field label.
 * Identical to `<Tooltip content={...} />`, kept as a named export because that
 * is how form code reads best.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.content
 */
export function HelpTip({ content, ...rest }) {
    return <Tooltip content={content} variant="help" {...rest} />;
}
