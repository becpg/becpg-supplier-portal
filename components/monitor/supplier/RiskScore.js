'use client';

/**
 * The risk score of one supplier: a ring with its level, the scale of levels
 * with the supplier placed on it, and what each reason adds to the score. The
 * same score the park list and the dashboard show, computed by the same server
 * function, with the weights and thresholds that function used.
 */

import { Icon } from '@/components/ui/Button';
import { RISK_LEVELS, describeReason } from '@/components/monitor/RiskList';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

/** The ring and the scale are drawn on a 0-100 scale; a higher score fills them. */
const SCALE_MAX = 100;
const RING_RADIUS = 42;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const LABELS = defineLabels('components/monitor/supplier/RiskScore#LABELS', {
    fr: {
        ring: 'Score de risque {score} sur 100, niveau {level}',
        none: 'Aucun motif de risque',
        scale: 'Échelle des niveaux',
        contributions: 'Ce qui fait le score',
        points: '+{points}',
    },
    en: {
        ring: 'Risk score {score} out of 100, {level} level',
        none: 'No risk reason',
        scale: 'Level scale',
        contributions: 'What makes the score',
        points: '+{points}',
    },
});

const TONE_COLORS = Object.freeze({
    danger: 'var(--status-danger)',
    warn: 'var(--status-warn)',
    neutral: 'var(--becpg-teal)',
});

const ZONE_CLASSES = Object.freeze({
    danger: 'bg-[var(--status-danger-bg)] text-[var(--status-danger)]',
    warn: 'bg-[var(--status-warn-bg)] text-[var(--status-warn)]',
    neutral: 'bg-[var(--becpg-grey)] text-[var(--becpg-muted)]',
});

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) => (vars[key] ?? match));
}

function Ring({ score, level, lang, local }) {
    const levelLabel = pickLabels(level, lang);
    const filled = (Math.min(score, SCALE_MAX) / SCALE_MAX) * RING_LENGTH;
    return (
        <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0" role="img" aria-label={fill(local.ring, { score, level: levelLabel })}>
            <circle cx="50" cy="50" r={RING_RADIUS} fill="none" stroke="var(--becpg-grey)" strokeWidth="10" />
            <circle
                cx="50"
                cy="50"
                r={RING_RADIUS}
                fill="none"
                stroke={TONE_COLORS[level.tone] || TONE_COLORS.neutral}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${filled} ${RING_LENGTH}`}
                transform="rotate(-90 50 50)"
            />
            <text x="50" y="52" textAnchor="middle" fontSize="26" fontWeight="300" fill="var(--becpg-ink)">{score}</text>
            <text x="50" y="68" textAnchor="middle" fontSize="10" fill="var(--becpg-muted)">{levelLabel}</text>
        </svg>
    );
}

/**
 * The levels laid side by side from their thresholds, the supplier's score
 * marked on them.
 */
function LevelScale({ score, levels, lang, local }) {
    const zones = [...(levels || [])]
        .filter((entry) => RISK_LEVELS[entry.level])
        .sort((a, b) => a.from - b.from)
        .map((entry, index, all) => ({
            ...entry,
            to: index + 1 < all.length ? all[index + 1].from : SCALE_MAX,
            definition: RISK_LEVELS[entry.level],
        }));
    if (zones.length === 0) {
        return null;
    }
    const marker = Math.min(score, SCALE_MAX);
    return (
        <div>
            <p className="mb-1.5 text-xs text-[var(--becpg-muted)]">{local.scale}</p>
            <div className="relative">
                <div className="flex h-7 overflow-hidden rounded-lg text-[11px] font-medium">
                    {zones.map((zone) => (
                        <span
                            key={zone.level}
                            className={`flex items-center justify-center border-e border-white last:border-e-0 ${ZONE_CLASSES[zone.definition.tone]}`}
                            style={{ width: `${zone.to - zone.from}%` }}
                            title={`${pickLabels(zone.definition, lang)} ${zone.from}-${zone.to}`}
                        >
                            <span className="truncate px-1">{pickLabels(zone.definition, lang)}</span>
                        </span>
                    ))}
                </div>
                <span
                    aria-hidden="true"
                    className="absolute -top-1 -bottom-1 w-1 -translate-x-1/2 rounded-full bg-[var(--becpg-ink)] rtl:translate-x-1/2"
                    style={{ insetInlineStart: `${marker}%` }}
                />
            </div>
            <div className="mt-1 flex justify-between text-[11px] tabular-nums text-[var(--becpg-muted)]">
                {zones.map((zone) => <span key={zone.level}>{zone.from}</span>)}
                <span>{SCALE_MAX}</span>
            </div>
        </div>
    );
}

function Contributions({ reasons, lang, local }) {
    const max = Math.max(1, ...reasons.map((entry) => entry.reason.points || 0));
    return (
        <div>
            <p className="mb-1.5 text-xs text-[var(--becpg-muted)]">{local.contributions}</p>
            <ul className="flex flex-col gap-2">
                {reasons.map(({ reason, described }) => (
                    <li key={reason.code} className="grid grid-cols-[1.25rem_minmax(0,1fr)_minmax(4rem,8rem)_2.5rem] items-center gap-2 text-sm">
                        <Icon
                            name={described.icon}
                            size={18}
                            className={described.tone === 'danger' ? 'text-[var(--status-danger)]' : 'text-[var(--status-warn)]'}
                        />
                        <span className="min-w-0 truncate" title={described.label}>{described.label}</span>
                        <span className="meter-segments relative block h-2 bg-[var(--becpg-grey)]" aria-hidden="true">
                            <span
                                className="absolute inset-y-0 start-0 bg-[var(--becpg-orange-deep)]"
                                style={{ width: `${Math.round(((reason.points || 0) / max) * 100)}%` }}
                            />
                        </span>
                        <span className="text-end text-xs font-medium tabular-nums">
                            {typeof reason.points === 'number' ? fill(local.points, { points: reason.points }) : ''}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/**
 * @param {Object} props
 * @param {{score: number, level: string, reasons: Object[], levels?: Object[]}} props.risk
 */
export function RiskScore({ risk }) {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    const level = RISK_LEVELS[risk?.level] || RISK_LEVELS.low;
    const score = Math.max(0, Math.round(risk?.score || 0));
    const reasons = (risk?.reasons || [])
        .map((reason) => ({ reason, described: describeReason(reason, lang) }))
        .filter((entry) => entry.described)
        .sort((a, b) => (b.reason.points || 0) - (a.reason.points || 0));

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-5">
                <Ring score={score} level={level} lang={lang} local={local} />
                <div className="min-w-[12rem] flex-1">
                    <LevelScale score={score} levels={risk?.levels} lang={lang} local={local} />
                </div>
            </div>
            {reasons.length === 0
                ? <p className="text-sm text-[var(--becpg-muted)]">{local.none}</p>
                : <Contributions reasons={reasons} lang={lang} local={local} />}
        </div>
    );
}
