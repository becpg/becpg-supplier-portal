'use client';

/**
 * Completion gauges (spec §4.3: "Complétude : jauge % dérivée des catalogues actifs").
 *
 * Two shapes, one API:
 *   - `<Gauge>`    radial dial, for a headline score
 *   - `<GaugeBar>` horizontal bar, for a score inside a row or a card
 *
 * The arc fills once on mount (framer-motion), and the value is always written
 * as text next to it — the colour is a redundant cue, never the message.
 * `role="meter"` + `aria-valuenow` makes the figure available to assistive tech.
 */

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Default thresholds, low to high. The first entry whose `min` is not reached
 * gives the tone, so: < 50 danger, < 80 warn, else ok.
 */
export const DEFAULT_THRESHOLDS = Object.freeze([
    { min: 0, tone: 'danger' },
    { min: 50, tone: 'warn' },
    { min: 80, tone: 'ok' },
]);

const TONE_COLOR = {
    ok: 'var(--status-ok)',
    warn: 'var(--status-warn)',
    danger: 'var(--status-danger)',
    info: 'var(--becpg-blue-light)',
    neutral: 'var(--becpg-dark-grey)',
    accent: 'var(--becpg-orange)',
};

/**
 * Picks a tone from a percentage.
 *
 * @param {number} percent 0..100
 * @param {Array<{min: number, tone: string}>} [thresholds]
 * @returns {string} tone key
 */
export function toneForValue(percent, thresholds = DEFAULT_THRESHOLDS) {
    let tone = thresholds[0] ? thresholds[0].tone : 'neutral';
    thresholds.forEach((threshold) => {
        if (percent >= threshold.min) {
            tone = threshold.tone;
        }
    });
    return tone;
}

function clampPercent(value, max) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return null;
    }
    const percent = (Number(value) / (max || 100)) * 100;
    return Math.max(0, Math.min(100, percent));
}

/**
 * Radial completion dial.
 *
 * @param {Object} props
 * @param {number|null} props.value current value (null renders an "—" empty dial)
 * @param {number} [props.max=100]
 * @param {number} [props.size=120] outer diameter in px
 * @param {number} [props.thickness=10] stroke width in px
 * @param {string} [props.tone] forces a tone; derived from `thresholds` otherwise
 * @param {Array<{min:number,tone:string}>} [props.thresholds]
 * @param {React.ReactNode} [props.label] caption under the figure
 * @param {React.ReactNode} [props.sublabel] second caption line
 * @param {boolean} [props.showValue=true]
 * @param {string} [props.suffix='%']
 * @param {number} [props.delay=0] animation delay in seconds
 * @param {string} [props.ariaLabel] accessible name of the meter
 */
export function Gauge({
    value,
    max = 100,
    size = 120,
    thickness = 10,
    tone,
    thresholds = DEFAULT_THRESHOLDS,
    label,
    sublabel,
    showValue = true,
    suffix = '%',
    delay = 0,
    ariaLabel,
    className = '',
}) {
    const reduceMotion = useReducedMotion();
    const percent = clampPercent(value, max);
    const finalTone = tone || (percent === null ? 'neutral' : toneForValue(percent, thresholds));
    const color = TONE_COLOR[finalTone] || TONE_COLOR.neutral;

    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;
    const filled = percent === null ? 0 : (percent / 100) * circumference;

    return (
        <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
            <div
                className="relative"
                style={{ width: size, height: size }}
                role="meter"
                aria-valuenow={percent === null ? undefined : Math.round(percent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={ariaLabel || (typeof label === 'string' ? label : 'completion')}
            >
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="var(--becpg-grey)"
                        strokeWidth={thickness}
                    />
                    <motion.circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={thickness}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: reduceMotion ? circumference - filled : circumference }}
                        animate={{ strokeDashoffset: circumference - filled }}
                        transition={
                            reduceMotion ? { duration: 0 } : { duration: 0.9, delay, ease: 'easeOut' }
                        }
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                </svg>
                {showValue ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span
                            className="font-light leading-none"
                            style={{ color, fontSize: Math.round(size / 4) }}
                        >
                            {percent === null ? '—' : Math.round(percent)}
                        </span>
                        {percent === null ? null : (
                            <span className="text-xs text-[var(--becpg-dark-grey)]">{suffix}</span>
                        )}
                    </div>
                ) : null}
            </div>
            {label ? <span className="text-sm font-medium">{label}</span> : null}
            {sublabel ? (
                <span className="text-xs text-[var(--becpg-dark-grey)]">{sublabel}</span>
            ) : null}
        </div>
    );
}

/**
 * Horizontal completion bar — the in-row form of `Gauge`.
 *
 * @param {Object} props
 * @param {number|null} props.value
 * @param {number} [props.max=100]
 * @param {React.ReactNode} [props.label] rendered above the bar, on the left
 * @param {boolean} [props.showValue=true] rendered above the bar, on the right
 * @param {'sm'|'md'|'lg'} [props.size='md'] bar thickness
 * @param {string} [props.tone]
 * @param {Array<{min:number,tone:string}>} [props.thresholds]
 * @param {number} [props.delay=0]
 * @param {string} [props.suffix='%']
 */
export function GaugeBar({
    value,
    max = 100,
    label,
    showValue = true,
    size = 'md',
    tone,
    thresholds = DEFAULT_THRESHOLDS,
    delay = 0,
    suffix = '%',
    className = '',
    ariaLabel,
}) {
    const reduceMotion = useReducedMotion();
    const percent = clampPercent(value, max);
    const finalTone = tone || (percent === null ? 'neutral' : toneForValue(percent, thresholds));
    const color = TONE_COLOR[finalTone] || TONE_COLOR.neutral;
    const height = size === 'sm' ? 4 : size === 'lg' ? 12 : 8;

    return (
        <div className={`w-full ${className}`}>
            {label || showValue ? (
                <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                    {label ? <span className="truncate text-[var(--becpg-blue)]">{label}</span> : <span />}
                    {showValue ? (
                        <span className="font-medium tabular-nums" style={{ color }}>
                            {percent === null ? '—' : `${Math.round(percent)}${suffix}`}
                        </span>
                    ) : null}
                </div>
            ) : null}
            <div
                className="w-full overflow-hidden rounded-full bg-[var(--becpg-grey)]"
                style={{ height }}
                role="meter"
                aria-valuenow={percent === null ? undefined : Math.round(percent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={ariaLabel || (typeof label === 'string' ? label : 'completion')}
            >
                <motion.div
                    className="h-full rounded-full"
                    style={{ background: color }}
                    initial={{ width: reduceMotion ? `${percent || 0}%` : 0 }}
                    animate={{ width: `${percent || 0}%` }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.8, delay, ease: 'easeOut' }}
                />
            </div>
        </div>
    );
}
