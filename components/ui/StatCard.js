'use client';

/**
 * The dashboard KPI tile (spec §4.3 "zone haute — état de mon dossier").
 *
 * One figure, one label, one tone. The number counts up on mount — the only
 * animation, and it is disabled under `prefers-reduced-motion`. The tone is
 * carried by an icon and a coloured rail, never by the number's colour alone.
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { Icon } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

/** `next/link` made animatable — see the note in components/ui/Card.js. */
const MotionLink = motion.create(Link);

const TONES = {
    ok: {
        rail: 'var(--status-ok)',
        chip: 'bg-[var(--status-ok-bg)] text-[var(--status-ok)]',
        value: 'text-[var(--status-ok)]',
    },
    warn: {
        rail: 'var(--status-warn)',
        chip: 'bg-[var(--status-warn-bg)] text-[var(--status-warn)]',
        value: 'text-[var(--status-warn)]',
    },
    danger: {
        rail: 'var(--status-danger)',
        chip: 'bg-[var(--status-danger-bg)] text-[var(--status-danger)]',
        value: 'text-[var(--status-danger)]',
    },
    info: {
        rail: 'var(--status-info)',
        chip: 'bg-[var(--status-info-bg)] text-[var(--status-info)]',
        value: 'text-[var(--becpg-blue)]',
    },
    neutral: {
        rail: 'var(--becpg-blue-light)',
        chip: 'bg-[var(--becpg-grey)] text-[var(--becpg-blue)]',
        value: 'text-[var(--becpg-blue)]',
    },
};

/**
 * Counts from 0 to `value` in ~0.6s. Falls back to the plain value when the
 * user asked for reduced motion or when the value is not a number.
 */
function AnimatedNumber({ value, reduceMotion }) {
    const numeric = typeof value === 'number' && Number.isFinite(value);
    const count = useMotionValue(0);
    const rendered = useTransform(count, (current) => String(Math.round(current)));

    useEffect(() => {
        if (!numeric || reduceMotion) {
            return undefined;
        }
        const controls = animate(count, value, { duration: 0.6, ease: 'easeOut' });
        return () => controls.stop();
    }, [count, value, numeric, reduceMotion]);

    if (!numeric || reduceMotion) {
        return <>{value}</>;
    }
    return <motion.span>{rendered}</motion.span>;
}

/**
 * @param {Object} props
 * @param {React.ReactNode} props.label short caption ("Documents expirés")
 * @param {number|string} [props.value] the figure
 * @param {string} [props.unit] suffix rendered smaller ("%", "j")
 * @param {string} [props.icon] Material icon name
 * @param {'ok'|'warn'|'danger'|'info'|'neutral'} [props.tone='neutral']
 * @param {React.ReactNode} [props.hint] secondary line under the figure
 * @param {React.ReactNode} [props.badge] pill rendered next to the label (e.g. a StatusPill)
 * @param {{direction: 'up'|'down'|'flat', label: string}} [props.trend]
 * @param {string} [props.href] makes the whole tile a link
 * @param {Function} [props.onClick] makes the whole tile a button
 * @param {boolean} [props.loading] renders a skeleton instead of the figure
 * @param {number} [props.index=0] stagger position in a KPI row
 * @param {React.ReactNode} [props.children] extra content under the hint (gauge, sparkline…)
 */
export function StatCard({
    label,
    value,
    unit,
    icon,
    tone = 'neutral',
    hint,
    badge,
    trend,
    href,
    onClick,
    loading = false,
    index = 0,
    className = '',
    children,
    ...rest
}) {
    const reduceMotion = useReducedMotion();
    const palette = TONES[tone] || TONES.neutral;
    const clickable = Boolean(href || onClick);

    const inner = (
        <>
            <span
                className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
                style={{ background: palette.rail }}
                aria-hidden="true"
            />
            <div className="flex items-start gap-3 pl-2">
                {icon ? (
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${palette.chip}`}>
                        <Icon name={icon} size={20} />
                    </span>
                ) : null}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-medium uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                            {label}
                        </span>
                        {badge}
                    </div>
                    {loading ? (
                        <Skeleton width="55%" height={30} className="mt-1.5" />
                    ) : (
                        <div className={`mt-0.5 flex items-baseline gap-1 ${palette.value}`}>
                            <span className="text-2xl font-light leading-tight sm:text-3xl">
                                <AnimatedNumber value={value ?? '—'} reduceMotion={reduceMotion} />
                            </span>
                            {unit ? <span className="text-sm font-normal">{unit}</span> : null}
                        </div>
                    )}
                    {hint ? (
                        <p className="mt-1 text-xs text-[var(--becpg-dark-grey)]">{hint}</p>
                    ) : null}
                    {trend ? (
                        <p className="mt-1 flex items-center gap-1 text-xs text-[var(--becpg-dark-grey)]">
                            <Icon
                                name={
                                    trend.direction === 'up'
                                        ? 'trending_up'
                                        : trend.direction === 'down'
                                          ? 'trending_down'
                                          : 'trending_flat'
                                }
                                size={14}
                            />
                            {trend.label}
                        </p>
                    ) : null}
                    {children ? <div className="mt-2">{children}</div> : null}
                </div>
                {clickable ? (
                    <Icon name="chevron_right" size={20} className="mt-1 text-[var(--becpg-dark-grey)]" />
                ) : null}
            </div>
        </>
    );

    const classes = [
        'relative w-full overflow-hidden rounded-xl border border-[var(--becpg-grey)] bg-white p-4 text-left',
        clickable
            ? 'cursor-pointer transition-shadow hover:shadow-[0_8px_20px_rgba(0,66,84,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] focus-visible:ring-offset-2'
            : 'shadow-[0_1px_2px_rgba(0,66,84,0.06)]',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    const motionProps = reduceMotion
        ? {}
        : {
              initial: { opacity: 0, y: 10 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.28, delay: Math.min(index, 8) * 0.05, ease: 'easeOut' },
          };

    if (href) {
        return (
            <MotionLink href={href} className={classes} {...motionProps} {...rest}>
                {inner}
            </MotionLink>
        );
    }
    if (onClick) {
        return (
            <motion.button type="button" onClick={onClick} className={classes} {...motionProps} {...rest}>
                {inner}
            </motion.button>
        );
    }
    return (
        <motion.div {...motionProps} className={classes} {...rest}>
            {inner}
        </motion.div>
    );
}

/**
 * A row of StatCards: 2 columns on a phone, 4 above lg. Children get their
 * `index` from their position, so the stagger is free.
 *
 * @param {Object} props
 * @param {2|3|4} [props.columns=4]
 */
export function StatGrid({ columns = 4, className = '', children }) {
    const map = {
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    };
    return <div className={`grid gap-3 sm:gap-4 ${map[columns] || map[4]} ${className}`}>{children}</div>;
}
