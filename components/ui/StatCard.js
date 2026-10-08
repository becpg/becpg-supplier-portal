'use client';

/**
 * The dashboard KPI tile (spec §4.3 "zone haute — état de mon dossier").
 *
 * One figure, one label, one tone. The number counts up on mount — the only
 * animation, and it is disabled under `prefers-reduced-motion`. The tone is
 * carried by the icon chip beside the label, never by the number's colour alone.
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { Icon } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

/** `next/link` made animatable — see the note in components/ui/Card.js. */
const MotionLink = motion.create(Link);

/*
 * Tone → icon chip. The figure itself is always `--becpg-ink`: a KPI row where
 * every number is a different colour reads as five unrelated widgets. The tiles
 * carry no coloured rail either: a row of four rails in four colours was the
 * loudest thing on every list page, louder than the list it introduces.
 *
 * The chip carries the tone on top of the icon's own shape and the tile's
 * label, so no status is ever conveyed by colour alone. Chips measure
 * 4.73 / 4.70 / 5.72 / 5.57 / 4.79:1 (≥4.5:1, they hold an icon).
 */
const TONES = {
    ok: {
        chip: 'bg-[var(--status-ok-bg)] text-[var(--status-ok)]',
    },
    warn: {
        chip: 'bg-[var(--status-warn-bg)] text-[var(--status-warn)]',
    },
    danger: {
        chip: 'bg-[var(--status-danger-bg)] text-[var(--status-danger)]',
    },
    info: {
        chip: 'bg-[var(--status-info-bg)] text-[var(--status-info)]',
    },
    neutral: {
        chip: 'bg-[var(--becpg-grey)] text-[var(--becpg-blue)]',
    },
};

/*
 * Trend → colour + icon. Green when the figure went up, orange when it went
 * down, grey when it did not move — and the arrow says it too, so the direction
 * survives greyscale and colour blindness.
 *
 * `--becpg-green` (#00ffbd) on white is 1.40:1, unreadable, so the *up* label is
 * `--status-ok` — the same green pushed down to 5.31:1 (hue 162° vs the brand's
 * 164°: the brand green, dark enough to be read). Same reasoning for the *down*
 * label: `--becpg-orange` is 2.95:1, `--becpg-orange-deep` is 4.83:1.
 */
const TRENDS = {
    up: { icon: 'trending_up', className: 'text-[var(--status-ok)]' },
    down: { icon: 'trending_down', className: 'text-[var(--becpg-orange-deep)]' },
    flat: { icon: 'trending_flat', className: 'text-[var(--becpg-dark-grey)]' },
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
            <div className="flex items-start gap-3">
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
                        <div className="mt-0.5 flex items-baseline gap-1 text-[var(--becpg-ink)]">
                            <span className="text-2xl font-light leading-tight tabular-nums">
                                <AnimatedNumber value={value ?? '—'} reduceMotion={reduceMotion} />
                            </span>
                            {unit ? (
                                <span className="text-sm font-normal text-[var(--becpg-dark-grey)]">{unit}</span>
                            ) : null}
                        </div>
                    )}
                    {hint ? (
                        <p className="mt-1 text-xs text-[var(--becpg-dark-grey)]">{hint}</p>
                    ) : null}
                    {trend ? (
                        <p
                            className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                                (TRENDS[trend.direction] || TRENDS.flat).className
                            }`}
                        >
                            <Icon name={(TRENDS[trend.direction] || TRENDS.flat).icon} size={14} />
                            {trend.label}
                        </p>
                    ) : null}
                    {children ? <div className="mt-2">{children}</div> : null}
                </div>
                {clickable ? (
                    <Icon name="chevron_right" size={20} className="mt-1 text-[var(--becpg-orange-deep)]" />
                ) : null}
            </div>
        </>
    );

    const classes = [
        'relative w-full overflow-hidden rounded-2xl border border-[var(--becpg-line)] bg-white p-4 text-start',
        'shadow-[var(--becpg-shadow-raised)]',
        clickable
            ? 'hover-lift cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] focus-visible:ring-offset-2'
            : 'transition-shadow',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    /* See the note in components/ui/Card.js: `.hover-lift` owns the shadow, but
       the transform has to come from `whileHover` because framer-motion's inline
       `transform` outranks any class. */
    // `initial: false` rather than dropping the motion props — see the long note
    // in `components/ui/Card.js`: dropping them stranded every server-rendered
    // tile at the `opacity: 0` the SSR pass had inlined, so a user who asks for
    // reduced motion got a blank KPI row instead of a still one.
    const motionProps = {
        initial: reduceMotion ? false : { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: reduceMotion
            ? { duration: 0 }
            : { duration: 0.28, delay: Math.min(index, 8) * 0.05, ease: 'easeOut' },
        ...(clickable && !reduceMotion ? { whileHover: { y: -4 }, whileTap: { y: -1 } } : {}),
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
