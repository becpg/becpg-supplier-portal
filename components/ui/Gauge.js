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
 * `role="meter"` + `aria-valuenow` + `aria-valuetext` makes the figure available
 * to assistive tech *even when `showValue` is false*, which is how the callers
 * that print the number themselves (a StatCard figure, a tabular score) use it.
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

/**
 * Tone → `{ fill, rim, text }`.
 *
 * Good is `--becpg-teal`, not the mint `--becpg-green`: on the `--becpg-grey`
 * track the mint measures 1.09:1, an arc nobody can see, while the teal holds
 * 4.52:1 on its own. The orange still needs help — `#ff642d` is 2.46:1 on the
 * track, below the 3:1 WCAG 1.4.11 asks of a graphical object — so a tone may
 * edge its fill with a 1.5px **rim** of the same hue, dark enough to draw the
 * shape:
 *
 *   ok      fill `--becpg-teal`         rim = fill                 4.52:1 ✓
 *   warn    fill `--becpg-orange`       rim `--becpg-orange-deep`  rim vs track 4.03:1 ✓
 *   danger  fill `--status-danger`      rim = fill                 5.46:1 ✓
 *   info    fill `--becpg-blue-light`   rim = fill                 5.87:1 ✓
 *   neutral fill `--becpg-dark-grey`    rim `--becpg-dark-grey-deep`     ✓
 *
 * `text` is what the numeric label uses, 4.5:1 or better in every tone and on
 * every row surface: the warn label is `--becpg-orange-deep-active`, because
 * `--becpg-orange-deep` drops to 4.38:1 on a zebra stripe.
 */
const TONES = {
    ok: { fill: 'var(--becpg-teal)', rim: 'var(--becpg-teal)', text: 'var(--status-ok)' },
    warn: {
        fill: 'var(--becpg-orange)',
        rim: 'var(--becpg-orange-deep)',
        text: 'var(--becpg-orange-deep-active)',
    },
    danger: { fill: 'var(--status-danger)', rim: 'var(--status-danger)', text: 'var(--status-danger)' },
    info: { fill: 'var(--becpg-blue-light)', rim: 'var(--becpg-blue-light)', text: 'var(--becpg-blue-light)' },
    neutral: {
        fill: 'var(--becpg-dark-grey)',
        rim: 'var(--becpg-dark-grey-deep)',
        text: 'var(--becpg-dark-grey-deep)',
    },
    accent: {
        fill: 'var(--becpg-orange)',
        rim: 'var(--becpg-orange-deep)',
        text: 'var(--becpg-orange-deep-active)',
    },
};

/**
 * The colours of a tone — see {@link TONES}.
 *
 * @param {string} tone
 * @returns {{fill: string, rim: string, text: string}}
 */
export function tonePalette(tone) {
    return TONES[tone] || TONES.neutral;
}

/** The fill of a segmented bar per tone; a tone absent here fills flat. */
export const BAR_FILLS = {
    ok: 'linear-gradient(90deg, var(--becpg-teal), var(--becpg-teal-light))',
    warn: 'linear-gradient(90deg, var(--becpg-orange-deep), var(--becpg-orange))',
    accent: 'linear-gradient(90deg, var(--becpg-orange-deep), var(--becpg-orange))',
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
    const palette = TONES[finalTone] || TONES.neutral;

    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;
    const filled = percent === null ? 0 : (percent / 100) * circumference;
    /* The rim is the same arc drawn 3px wider, so the fill sits inside it with a
       1.5px edge on both sides. Below 6px there is no room for a rim and the arc
       falls back to the rim colour alone (a 4px mint hairline would vanish). */
    const rimmed = thickness >= 6;
    const fillWidth = rimmed ? thickness - 3 : thickness;
    const rounded = Math.round(percent === null ? 0 : percent);

    /* The value, always spelled out for assistive tech even when `showValue` is
       false — the caller then prints it next to the dial (a StatCard figure, a
       tabular score), but the meter must never be a bare coloured ring to a
       screen reader. */
    const valueText = percent === null ? '—' : `${rounded}${suffix ? ` ${suffix}` : ''}`;

    const arc = (stroke, width) => (
        <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={width}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: reduceMotion ? circumference - filled : circumference }}
            animate={{ strokeDashoffset: circumference - filled }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.9, delay, ease: 'easeOut' }}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
    );

    return (
        <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
            <div
                className="relative"
                style={{ width: size, height: size }}
                role="meter"
                aria-valuenow={percent === null ? undefined : rounded}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={valueText}
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
                    {rimmed ? arc(palette.rim, thickness) : null}
                    {arc(palette.fill, fillWidth)}
                </svg>
                {showValue ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span
                            className="font-light leading-none tabular-nums"
                            style={{ color: palette.text, fontSize: Math.round(size / 4) }}
                        >
                            {percent === null ? '—' : rounded}
                        </span>
                        {percent === null ? null : (
                            <span className="text-xs text-[var(--becpg-dark-grey)]">{suffix}</span>
                        )}
                    </div>
                ) : null}
            </div>
            {label ? <span className="text-sm font-medium text-[var(--becpg-blue)]">{label}</span> : null}
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
    const palette = TONES[finalTone] || TONES.neutral;
    const height = size === 'sm' ? 6 : size === 'lg' ? 10 : 8;
    const rounded = Math.round(percent === null ? 0 : percent);
    const valueText = percent === null ? '—' : `${rounded}${suffix ? ` ${suffix}` : ''}`;

    return (
        <div className={`w-full ${className}`}>
            {label || showValue ? (
                <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                    {label ? <span className="truncate text-[var(--becpg-ink)]">{label}</span> : <span />}
                    {showValue ? (
                        <span className="font-medium tabular-nums" style={{ color: palette.text }}>
                            {percent === null ? '—' : `${rounded}${suffix}`}
                        </span>
                    ) : null}
                </div>
            ) : null}
            <div
                className="meter-segments w-full overflow-hidden bg-[var(--becpg-grey)]"
                style={{ height }}
                role="meter"
                aria-valuenow={percent === null ? undefined : rounded}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={valueText}
                aria-label={ariaLabel || (typeof label === 'string' ? label : 'completion')}
            >
                <motion.div
                    className="h-full"
                    /* Cut into the same ten segments as the catalogue meters, by
                       the track's mask; the fill runs from the tone's darker edge
                       to its body, so even the first segment holds its contrast
                       against the track. */
                    style={{ background: BAR_FILLS[finalTone] || palette.fill }}
                    initial={{ width: reduceMotion ? `${percent || 0}%` : 0 }}
                    animate={{ width: `${percent || 0}%` }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.8, delay, ease: 'easeOut' }}
                />
            </div>
        </div>
    );
}
