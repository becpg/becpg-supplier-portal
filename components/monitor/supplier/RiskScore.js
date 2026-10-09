'use client';

/**
 * The risk score of one supplier: a ring and the reasons that make it, each with
 * its count. The same score the park list and the dashboard show, computed by the
 * same server function.
 */

import { Icon } from '@/components/ui/Button';
import { RISK_LEVELS, describeReason } from '@/components/monitor/RiskList';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

/** The ring is drawn on a 0-100 scale; a higher score fills it. */
const RING_MAX = 100;
const RING_RADIUS = 42;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const LABELS = defineLabels('components/monitor/supplier/RiskScore#LABELS', {
    fr: {
        ring: 'Score de risque {score} sur 100, niveau {level}',
        none: 'Aucun motif de risque',
    },
    en: {
        ring: 'Risk score {score} out of 100, {level} level',
        none: 'No risk reason',
    },
});

const RING_TONES = Object.freeze({
    danger: 'var(--status-danger)',
    warn: 'var(--status-warn)',
    neutral: 'var(--becpg-teal)',
});

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) => (vars[key] ?? match));
}

/**
 * @param {Object} props
 * @param {{score: number, level: string, reasons: Object[]}} props.risk
 */
export function RiskScore({ risk }) {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    const level = RISK_LEVELS[risk?.level] || RISK_LEVELS.low;
    const levelLabel = pickLabels(level, lang);
    const score = Math.max(0, Math.round(risk?.score || 0));
    const filled = (Math.min(score, RING_MAX) / RING_MAX) * RING_LENGTH;
    const reasons = (risk?.reasons || [])
        .map((reason) => ({ reason, described: describeReason(reason, lang) }))
        .filter((entry) => entry.described);

    return (
        <div className="flex flex-wrap items-center gap-4">
            <svg
                viewBox="0 0 100 100"
                className="h-24 w-24 shrink-0"
                role="img"
                aria-label={fill(local.ring, { score, level: levelLabel })}
            >
                <circle cx="50" cy="50" r={RING_RADIUS} fill="none" stroke="var(--becpg-grey)" strokeWidth="10" />
                <circle
                    cx="50"
                    cy="50"
                    r={RING_RADIUS}
                    fill="none"
                    stroke={RING_TONES[level.tone] || RING_TONES.neutral}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${filled} ${RING_LENGTH}`}
                    transform="rotate(-90 50 50)"
                />
                <text x="50" y="52" textAnchor="middle" fontSize="24" fontWeight="300" fill="var(--becpg-ink)">{score}</text>
                <text x="50" y="68" textAnchor="middle" fontSize="10" fill="var(--becpg-muted)">{levelLabel}</text>
            </svg>
            {reasons.length === 0 ? (
                <p className="text-sm text-[var(--becpg-muted)]">{local.none}</p>
            ) : (
                <ul className="flex min-w-[12rem] flex-1 flex-col gap-2">
                    {reasons.map(({ reason, described }) => (
                        <li key={reason.code} className="flex items-center gap-2 text-sm">
                            <Icon
                                name={described.icon}
                                size={18}
                                className={described.tone === 'danger' ? 'text-[var(--status-danger)]' : 'text-[var(--status-warn)]'}
                            />
                            <span className="min-w-0 flex-1">{described.label}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
