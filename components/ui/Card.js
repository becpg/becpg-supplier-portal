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

const VARIANTS = {
    default: 'bg-white border-[var(--becpg-grey)]',
    flat: 'bg-transparent border-transparent',
    muted: 'bg-[var(--becpg-grey)]/50 border-[var(--becpg-grey)]',
    accent: 'bg-white border-[var(--becpg-orange)]/40 border-l-4 border-l-[var(--becpg-orange)]',
    primary: 'bg-[var(--becpg-blue)] text-white border-transparent',
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
        'relative rounded-xl border transition-shadow duration-200',
        VARIANTS[variant] || VARIANTS.default,
        clickable
            ? 'cursor-pointer hover:shadow-[0_8px_20px_rgba(0,66,84,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] focus-visible:ring-offset-2'
            : 'shadow-[0_1px_2px_rgba(0,66,84,0.06)]',
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
                                : 'bg-[var(--becpg-blue-lighter)] text-[var(--becpg-blue)]'
                        }`}
                    >
                        <Icon name={icon} size={18} />
                    </span>
                ) : null}
                <div className="min-w-0 flex-1">
                    {title ? (
                        <h3 className="truncate text-sm font-medium sm:text-base">{title}</h3>
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
                <div className="border-t border-[var(--becpg-grey)] px-4 py-3 text-sm">{footer}</div>
            ) : null}
        </>
    );

    const motionProps =
        animate && !reduceMotion
            ? {
                  initial: { opacity: 0, y: 10 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 0.28, delay: Math.min(index, 12) * STAGGER, ease: 'easeOut' },
              }
            : {};

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
            <div className="min-w-0">
                <h2 className="text-base font-medium sm:text-lg">{title}</h2>
                {subtitle ? (
                    <p className="text-xs text-[var(--becpg-dark-grey)] sm:text-sm">{subtitle}</p>
                ) : null}
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
    );
}
