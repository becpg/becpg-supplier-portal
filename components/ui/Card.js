'use client';

/**
 * The surface every screen is built from.
 *
 * A Card is a plain container with an optional header (icon + title + actions)
 * and footer. It becomes a link or a button when `href` / `onClick` is set, and
 * in that case it is a *single* interactive element — never a div with a click
 * handler — so it stays keyboard reachable.
 *
 * Motion: a card fades and lifts once on mount. `index` staggers a grid without
 * any orchestration code in the page (`<Card index={i} />`). `prefers-reduced-motion`
 * removes it entirely.
 */

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/ui/Button';

/** Stagger between two consecutive cards of the same grid, in seconds. */
const STAGGER = 0.05;

/**
 * `next/link` made animatable. A wrapper with `display:contents` would NOT work:
 * such an element generates no box, so `opacity` and `transform` are ignored and
 * the card would appear without any transition.
 */
const MotionLink = motion.create(Link);

/*
 * A card is a **white surface on the grey page**, outlined in
 * `--becpg-blue-lighter` rather than in the neutral `--becpg-grey`: the page
 * itself is `--becpg-grey`, so a grey border on a white card disappeared into
 * the background at the very corners where the card's shape has to be read. The
 * elevation is `--becpg-shadow-raised`, i.e. blue-tinted — a neutral black
 * shadow over `--becpg-grey` goes muddy.
 *
 * `accent` marks the one card that carries an action or a warning: an
 * `--becpg-orange` rail, the same 3px signal `.nav-item-active` uses.
 * `primary` is the inverse card (white on `--becpg-blue`, 11.0:1).
 */
const VARIANTS = {
    default: 'bg-white border-[var(--becpg-blue-lighter)]',
    flat: 'bg-transparent border-transparent',
    muted: 'bg-[rgba(228,236,238,0.5)] border-[var(--becpg-blue-lighter)]',
    accent: 'bg-white border-[var(--becpg-blue-lighter)] border-l-4 border-l-[var(--becpg-orange)]',
    primary: 'bg-[var(--becpg-blue)] text-white border-[var(--becpg-blue-light)]',
};

const PADDINGS = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5 sm:p-6',
};

/**
 * @param {Object} props
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.subtitle]
 * @param {string} [props.icon] Material icon shown before the title
 * @param {React.ReactNode} [props.actions] rendered at the right of the header
 * @param {React.ReactNode} [props.footer]
 * @param {'default'|'flat'|'muted'|'accent'|'primary'} [props.variant='default']
 * @param {'none'|'sm'|'md'|'lg'} [props.padding='md']
 * @param {string} [props.href] renders the whole card as a link
 * @param {Function} [props.onClick] renders the whole card as a button
 * @param {boolean} [props.interactive] hover affordance without href/onClick
 * @param {number} [props.index=0] position in a grid — drives the stagger delay
 * @param {boolean} [props.animate=true]
 * @param {React.ReactNode} props.children
 */
export function Card({
    title,
    subtitle,
    icon,
    actions,
    footer,
    variant = 'default',
    padding = 'md',
    href,
    onClick,
    interactive = false,
    index = 0,
    animate = true,
    className = '',
    bodyClassName = '',
    children,
    ...rest
}) {
    const reduceMotion = useReducedMotion();
    const clickable = Boolean(href || onClick || interactive);

    const classes = [
        'relative rounded-xl border shadow-[var(--becpg-shadow-raised)]',
        VARIANTS[variant] || VARIANTS.default,
        clickable
            ? 'hover-lift cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] focus-visible:ring-offset-2'
            : 'transition-shadow duration-200',
        'w-full text-left',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    const header =
        title || actions || icon ? (
            <div className={`flex items-start gap-3 ${PADDINGS[padding] || PADDINGS.md} pb-2`}>
                {icon ? (
                    <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            variant === 'primary'
                                ? 'bg-white/15 text-white'
                                : variant === 'accent'
                                  /* `--becpg-orange` at 8%, not 12%: at 12% the
                                     deep-orange glyph on its own wash measured
                                     4.23:1. 8% takes it to 4.44:1 — an icon only
                                     owes 3:1, but this one is the accent card's
                                     single signal and it should not be borderline. */
                                  ? 'bg-[rgba(255,100,45,0.08)] text-[var(--becpg-orange-deep)]'
                                  : 'bg-[var(--becpg-blue-lighter)] text-[var(--becpg-blue)]'
                        }`}
                    >
                        <Icon name={icon} size={18} />
                    </span>
                ) : null}
                <div className="min-w-0 flex-1">
                    {title ? (
                        <h3
                            className={`truncate text-sm font-medium sm:text-base ${
                                variant === 'primary' ? '' : 'text-[var(--becpg-blue)]'
                            }`}
                        >
                            {title}
                        </h3>
                    ) : null}
                    {subtitle ? (
                        <p
                            className={`mt-0.5 text-xs ${
                                variant === 'primary' ? 'text-white/70' : 'text-[var(--becpg-dark-grey)]'
                            }`}
                        >
                            {subtitle}
                        </p>
                    ) : null}
                </div>
                {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
            </div>
        ) : null;

    const body = (
        <>
            {header}
            <div className={`${header ? 'px-4 pb-4 pt-0' : PADDINGS[padding] || PADDINGS.md} ${bodyClassName}`}>
                {children}
            </div>
            {footer ? (
                <div
                    className={`border-t px-4 py-3 text-sm ${
                        variant === 'primary'
                            ? 'border-white/25'
                            : 'border-[var(--becpg-blue-lighter)] bg-[rgba(228,236,238,0.35)] rounded-b-xl'
                    }`}
                >
                    {footer}
                </div>
            ) : null}
        </>
    );

    /*
     * `.hover-lift` (globals.css) is the range's hover vocabulary and it carries
     * the *shadow* here — but not the transform. It cannot: framer-motion writes
     * `transform` as an inline style for the mount animation and leaves it there,
     * and an inline declaration beats any class, so `.hover-lift:hover`'s
     * `translateY(-4px)` would never apply on an animated card. The lift is
     * therefore driven by `whileHover`, with the exact same -4px and the same
     * easing window, so a card behaves identically whether it animates or not.
     */
    const motionProps = {
        /*
         * `initial: false` and **not** "no motion props at all" under reduced
         * motion — that variant left every server-rendered card permanently
         * invisible.
         *
         * `useReducedMotion()` cannot know the media query while rendering on the
         * server, so it returns `false` there and the HTML ships with the entrance
         * state inlined: `opacity: 0; transform: translateY(10px)`. On a machine
         * that asks for reduced motion the hook flips to `true` right after
         * hydration, motion props disappeared, framer stopped driving the element
         * — and nothing ever cleared that inlined `opacity: 0`. Measured in the
         * browser with `prefers-reduced-motion: reduce`: 9 blocks stuck at opacity
         * 0 on the dashboard (the whole "état de mon dossier" row), 3 on /tasks,
         * 4 on /products, 4 on /documents. /monitor was spared only because its
         * cards mount after a client fetch, i.e. after the hook is already right.
         *
         * `initial: false` tells framer "you are already at `animate`", so it
         * writes the final values on the first client frame. No transition, no
         * flash, and the element is visible.
         */
        ...(animate
            ? {
                  initial: reduceMotion ? false : { opacity: 0, y: 10 },
                  animate: { opacity: 1, y: 0 },
                  transition: reduceMotion
                      ? { duration: 0 }
                      : { duration: 0.28, delay: Math.min(index, 12) * STAGGER, ease: 'easeOut' },
              }
            : {}),
        ...(clickable && !reduceMotion ? { whileHover: { y: -4 }, whileTap: { y: -1 } } : {}),
    };

    if (href) {
        return (
            <MotionLink href={href} className={classes} {...motionProps} {...rest}>
                {body}
            </MotionLink>
        );
    }

    if (onClick) {
        return (
            <motion.button type="button" onClick={onClick} className={classes} {...motionProps} {...rest}>
                {body}
            </motion.button>
        );
    }

    return (
        <motion.section {...motionProps} className={classes} {...rest}>
            {body}
        </motion.section>
    );
}

/**
 * Responsive card grid: 1 column on a phone, `columns` above lg.
 *
 * @param {Object} props
 * @param {1|2|3|4} [props.columns=3]
 */
export function CardGrid({ columns = 3, className = '', children }) {
    const map = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-2 lg:grid-cols-4',
    };
    return <div className={`grid gap-3 sm:gap-4 ${map[columns] || map[3]} ${className}`}>{children}</div>;
}

/**
 * Section heading used above a group of cards or a table.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.subtitle]
 * @param {React.ReactNode} [props.actions]
 */
export function SectionHeader({ title, subtitle, actions, className = '' }) {
    return (
        <div className={`mb-3 flex flex-wrap items-end justify-between gap-2 ${className}`}>
            {/* The 3px `--becpg-orange` rail is the range's section marker — the
                same signal `.nav-item-active` and `.becpg-toolbar-edge` use, so a
                heading reads as beCPG on every screen without a single new colour.
                3.73:1 on white: a rule, not text, so 1.4.11's 3:1 is the bar. */}
            <div className="min-w-0 border-l-[3px] border-l-[var(--becpg-orange)] pl-2.5">
                <h2 className="text-base font-medium text-[var(--becpg-blue)] sm:text-lg">{title}</h2>
                {subtitle ? (
                    <p className="text-xs text-[var(--becpg-dark-grey)] sm:text-sm">{subtitle}</p>
                ) : null}
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
    );
}
