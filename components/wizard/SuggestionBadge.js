'use client';

/**
 * The AI confidence badge — and the rule that must not be got wrong.
 *
 * spec §4.4 and `lib/adapters/suggestions.js` agree on four cases, and the
 * fourth is the one every implementation gets wrong:
 *
 * | Confidence | Level | Badge |
 * |---|---|---|
 * | ≥ 90 | `high` | green — applied, revocable |
 * | 70 – 89 | `medium` | orange — proposed, to confirm |
 * | < 70 | `low` | red — flagged, manual entry |
 * | **absent** | `null` | **no badge at all** |
 *
 * > **An absent confidence is never a low confidence.** A plugin that does not
 * > score itself is not a plugin that doubts itself. This component renders
 * > `null` — no dot, no grey pill, no "n/a" — because anything drawn there would
 * > be read as a verdict.
 *
 * The bucketing is computed server-side (`confidenceBucket`) and arrives as
 * `confidenceLevel`; {@link confidenceLevelOf} mirrors it for the cases where
 * only a raw number is at hand (a value extracted inside a datalist row). The
 * thresholds are duplicated on purpose: `lib/adapters/suggestions.js` is server
 * only and cannot be imported here.
 */

import { Icon } from '@/components/ui/Button';

/** Confidence at or above which a suggestion is applied automatically. */
export const CONFIDENCE_HIGH = 90;

/** Confidence at or above which a suggestion is proposed for confirmation. */
export const CONFIDENCE_MEDIUM = 70;

/**
 * Buckets a raw confidence. Mirrors `confidenceBucket()` server-side.
 *
 * @param {number|string|null|undefined} confidence percentage, 0-100
 * @returns {'high'|'medium'|'low'|null} `null` when no score was returned
 */
export function confidenceLevelOf(confidence) {
    if (confidence === null || confidence === undefined || confidence === '') {
        return null;
    }
    // `Number(false) === 0` and `Number([]) === 0`: a non-numeric input must
    // read as "no score", not as a confidence of zero (which buckets as 'low').
    if (typeof confidence !== 'number' && typeof confidence !== 'string') {
        return null;
    }
    // `Number(' ') === 0`, and a blank string is an absent score, not a zero.
    // Kept identical to `confidenceBucket()` server-side: the two must agree,
    // or the badge would contradict what the API decided to auto-apply.
    if (typeof confidence === 'string' && confidence.trim() === '') {
        return null;
    }
    const value = Number(confidence);
    if (!Number.isFinite(value)) {
        return null;
    }
    if (value >= CONFIDENCE_HIGH) {
        return 'high';
    }
    if (value >= CONFIDENCE_MEDIUM) {
        return 'medium';
    }
    return 'low';
}

/**
 * What each level means for the supplier — the wording matters more than the
 * colour, because the colour alone is not accessible.
 */
export const SUGGESTION_LEVELS = Object.freeze({
    high: {
        tone: 'ok',
        icon: 'auto_awesome',
        fr: { label: 'Appliqué', hint: 'Extrait automatiquement de vos documents. Vous pouvez annuler.' },
        en: { label: 'Applied', hint: 'Automatically extracted from your documents. You can undo it.' },
    },
    medium: {
        tone: 'warn',
        icon: 'help',
        fr: { label: 'À confirmer', hint: 'Proposition extraite de vos documents : vérifiez-la avant de l’appliquer.' },
        en: { label: 'To confirm', hint: 'Extracted from your documents: check it before applying.' },
    },
    low: {
        tone: 'danger',
        icon: 'error',
        fr: { label: 'À saisir', hint: 'L’extraction n’est pas fiable : saisissez la valeur vous-même.' },
        en: { label: 'Manual entry', hint: 'The extraction is not reliable: enter the value yourself.' },
    },
});

/**
 * @param {Object} props
 * @param {number|null} [props.confidence] raw percentage
 * @param {'high'|'medium'|'low'|null} [props.level] server-computed bucket; wins over `confidence`
 * @param {boolean} [props.showValue=true] appends "· 93 %" when a score exists
 * @param {boolean} [props.iconOnly=false] compact form, for a form label
 * @param {'sm'|'md'} [props.size='sm']
 * @param {string} [props.lang='fr']
 * @param {string} [props.className]
 * @returns {React.ReactElement|null} `null` when there is no confidence to show
 *
 * @example
 * <SuggestionBadge level={suggestion.confidenceLevel} confidence={suggestion.confidence} />
 * <SuggestionBadge confidence={null} />   // renders nothing at all
 */
export function SuggestionBadge({
    confidence = null,
    level,
    showValue = true,
    iconOnly = false,
    size = 'sm',
    lang = 'fr',
    className = '',
}) {
    // `level` is authoritative when the caller passes it — including when it is
    // explicitly null, which is the "no score" case.
    const resolved = level === undefined ? confidenceLevelOf(confidence) : level;
    if (!resolved) {
        return null;
    }

    const meta = SUGGESTION_LEVELS[resolved];
    if (!meta) {
        return null;
    }

    const words = meta[lang] || meta.fr;
    const score = Number.isFinite(Number(confidence)) ? Math.round(Number(confidence)) : null;
    const text = showValue && score !== null ? `${words.label} · ${score} %` : words.label;

    return (
        <span
            className={[
                'pill',
                `pill-${meta.tone}`,
                size === 'sm' ? 'pill-sm' : '',
                'pill-no-dot',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
            title={words.hint}
            aria-label={iconOnly ? text : undefined}
        >
            <Icon name={meta.icon} size={size === 'sm' ? 13 : 15} />
            {iconOnly ? null : <span>{text}</span>}
        </span>
    );
}

/**
 * The one-line explanation of a level, used under a suggestion card.
 *
 * @param {Object} props
 * @param {'high'|'medium'|'low'|null} props.level
 * @param {string} [props.lang='fr']
 */
export function SuggestionHint({ level, lang = 'fr', className = '' }) {
    const meta = level ? SUGGESTION_LEVELS[level] : null;
    if (!meta) {
        return null;
    }
    const words = meta[lang] || meta.fr;
    return <p className={`text-xs text-[var(--becpg-dark-grey)] ${className}`}>{words.hint}</p>;
}
