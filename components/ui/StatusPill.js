'use client';

/**
 * The portal's single status vocabulary.
 *
 * Every status the supplier portal displays — document validity (§4.5), approval
 * status (§5.4.3), task state, entity state (`bcpg:systemState`) — resolves here
 * to the same triple **(tone, icon, label)**. Colour is never the only carrier of
 * meaning: a pill always shows an icon and a text label, so it stays readable in
 * greyscale, for a colour-blind user and for a screen reader.
 *
 * Tones map onto the `.pill-{ok,warn,danger,neutral,info}` classes of globals.css,
 * which a tenant theme can restyle without touching a single component. Those
 * classes read the `--status-*` tokens, and the tokens are what carry the beCPG
 * palette: each tint is now its own foreground — or a brand colour — composited
 * over white at a fixed alpha (`--becpg-green` 12%, `--becpg-orange` 8%,
 * `--status-danger` 8%, `--becpg-grey`, `--becpg-blue-lighter`) instead of a
 * free-standing pastel. The vocabulary, the icons and the labels below are
 * untouched; only the colours moved.
 *
 * Measured label contrast, each tone on its own tint: ok 5.02:1 · warn 4.79:1 ·
 * danger 5.74:1 · neutral 4.79:1 · info 8.72:1 — all ✓ AA at the pill's 12px,
 * and 11px in the `sm` variant, which is why none of them is allowed near 4.5.
 * `neutral` is the one that changed behaviour: it used to be `--becpg-darkGrey`
 * on `--becpg-grey`, i.e. **3.90:1**, so every "planned" / "cancelled" /
 * "archived" pill in the portal was below AA. `--status-neutral` now points at
 * `--becpg-dark-grey-deep`.
 *
 * Labels come from `config/messages.js` (portal chrome). An upstream value that
 * is not in the vocabulary is displayed verbatim with a neutral tone — a beCPG
 * state the portal does not know about must still be visible, never swallowed.
 */

import { useMessages } from '@/lib/messages';
import { Icon } from '@/components/ui/Button';

/**
 * Canonical statuses. Keys are the machine values returned by `/api/v1/*`.
 *
 * @type {Object.<string, {tone: string, icon: string, messageKey: string}>}
 */
export const STATUS_VOCABULARY = Object.freeze({
    // --- Document validity (GET /documents → item.status) -------------------
    valid: { tone: 'ok', icon: 'check_circle', messageKey: 'status.valid' },
    expiring: { tone: 'warn', icon: 'schedule', messageKey: 'status.expiring' },
    expired: { tone: 'danger', icon: 'error_outline', messageKey: 'status.expired' },
    missing: { tone: 'danger', icon: 'help_outline', messageKey: 'status.missing' },
    // Share paints this one red and bold (`effectivity-mandatory`): a mandatory
    // document whose validity window nobody has filled in.
    validityMissing: { tone: 'danger', icon: 'event_busy', messageKey: 'status.validityMissing' },
    toValidate: { tone: 'info', icon: 'hourglass_top', messageKey: 'status.pending' },
    refused: { tone: 'danger', icon: 'cancel', messageKey: 'status.rejected' },

    // --- Approval status (GET /approval → status, spec §5.4.3) -------------
    approved: { tone: 'ok', icon: 'verified', messageKey: 'status.approved' },
    inProgress: { tone: 'info', icon: 'autorenew', messageKey: 'status.inProgress' },
    toRenew: { tone: 'warn', icon: 'update', messageKey: 'status.toRenew' },
    suspended: { tone: 'danger', icon: 'block', messageKey: 'status.suspended' },

    // --- Task / project state (pjt:tlState) --------------------------------
    planned: { tone: 'neutral', icon: 'event', messageKey: 'status.pending' },
    onHold: { tone: 'warn', icon: 'pause_circle_outline', messageKey: 'status.pending' },
    completed: { tone: 'ok', icon: 'task_alt', messageKey: 'status.completed' },
    cancelled: { tone: 'neutral', icon: 'do_not_disturb_on', messageKey: 'status.rejected' },
    late: { tone: 'danger', icon: 'alarm', messageKey: 'status.late' },

    // --- Entity state (bcpg:systemState) -----------------------------------
    simulation: { tone: 'neutral', icon: 'edit_note', messageKey: 'status.draft' },
    stopped: { tone: 'neutral', icon: 'stop_circle', messageKey: 'status.rejected' },
    archived: { tone: 'neutral', icon: 'inventory', messageKey: 'status.completed' },
});

/**
 * Upstream spellings → canonical key. beCPG, the ERP connector and the spec all
 * use slightly different wordings for the same thing; they are reconciled here
 * and nowhere else.
 */
const ALIASES = Object.freeze({
    // approval — spec §5.4.3 French wording and the ERP connector's values
    agree: 'approved',
    agréé: 'approved',
    agree_: 'approved',
    approve: 'approved',
    encours: 'inProgress',
    'en cours': 'inProgress',
    arenouveler: 'toRenew',
    'a renouveler': 'toRenew',
    'à renouveler': 'toRenew',
    torenew: 'toRenew',
    suspendu: 'suspended',
    // documents
    rejected: 'refused',
    expiringsoon: 'expiring',
    expiring_soon: 'expiring',
    tovalidate: 'toValidate',
    pending: 'toValidate',
    notprovided: 'missing',
    provided: 'valid',
    // task / entity states (bcpg:systemState + pjt:tlState are PascalCase)
    inprogress: 'inProgress',
    onhold: 'onHold',
    open: 'inProgress',
    closed: 'completed',
    draft: 'simulation',
});

/** Tone → pill class + a default icon for a tone-only pill. */
const TONE_CLASS = Object.freeze({
    ok: 'pill-ok',
    warn: 'pill-warn',
    danger: 'pill-danger',
    neutral: 'pill-neutral',
    info: 'pill-info',
});

/**
 * Resolves any incoming status value to the canonical vocabulary entry.
 *
 * @param {string} status raw status ('Valid', 'à renouveler', 'toRenew'…)
 * @returns {{key: string|null, tone: string, icon: string, messageKey: string|null}}
 */
export function resolveStatus(status) {
    if (status === null || status === undefined || status === '') {
        return { key: null, tone: 'neutral', icon: 'remove', messageKey: null };
    }
    const raw = String(status).trim();
    const direct = STATUS_VOCABULARY[raw];
    if (direct) {
        return { key: raw, ...direct };
    }
    const lowered = raw.toLowerCase();
    const aliased = ALIASES[lowered];
    if (aliased && STATUS_VOCABULARY[aliased]) {
        return { key: aliased, ...STATUS_VOCABULARY[aliased] };
    }
    const byLowerKey = Object.keys(STATUS_VOCABULARY).find((key) => key.toLowerCase() === lowered);
    if (byLowerKey) {
        return { key: byLowerKey, ...STATUS_VOCABULARY[byLowerKey] };
    }
    // Unknown upstream state: shown verbatim rather than hidden.
    return { key: null, tone: 'neutral', icon: 'label_outline', messageKey: null };
}

/**
 * Status badge: icon + label + tone.
 *
 * @param {Object} props
 * @param {string} props.status canonical or upstream status value
 * @param {string} [props.label] overrides the resolved label (business label from beCPG)
 * @param {'ok'|'warn'|'danger'|'neutral'|'info'} [props.tone] overrides the resolved tone
 * @param {string} [props.icon] overrides the resolved Material icon
 * @param {'sm'|'md'} [props.size='md']
 * @param {boolean} [props.showIcon=true] keep the icon (it is what makes the pill readable without colour)
 * @param {boolean} [props.showDot=false] adds the coloured dot of `.pill::before`
 * @param {boolean} [props.iconOnly=false] compact form; the label moves to the accessible name
 * @param {string} [props.title] native tooltip / accessible description
 */
export function StatusPill({
    status,
    label,
    tone,
    icon,
    size = 'md',
    showIcon = true,
    showDot = false,
    iconOnly = false,
    title,
    className = '',
    ...rest
}) {
    const { t } = useMessages();
    const resolved = resolveStatus(status);
    const finalTone = tone || resolved.tone;
    const finalIcon = icon || resolved.icon;
    const finalLabel =
        label || (resolved.messageKey ? t(resolved.messageKey) : String(status ?? '—'));

    const classes = [
        'pill',
        TONE_CLASS[finalTone] || TONE_CLASS.neutral,
        size === 'sm' ? 'pill-sm' : '',
        showDot ? '' : 'pill-no-dot',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <span className={classes} title={title || finalLabel} {...rest}>
            {showIcon ? <Icon name={finalIcon} size={size === 'sm' ? 13 : 15} /> : null}
            {iconOnly ? <span className="sr-only-text">{finalLabel}</span> : <span>{finalLabel}</span>}
        </span>
    );
}

/**
 * Bare coloured dot, for dense grids and calendars. Always paired with a
 * `title` and an off-screen label so it is never colour-only.
 *
 * @param {Object} props
 * @param {string} props.status
 * @param {string} [props.label]
 */
export function StatusDot({ status, label, className = '' }) {
    const { t } = useMessages();
    const resolved = resolveStatus(status);
    const finalLabel = label || (resolved.messageKey ? t(resolved.messageKey) : String(status ?? '—'));
    return (
        <span className={`inline-flex items-center gap-1.5 ${className}`} title={finalLabel}>
            <span className={`status-dot status-dot-${resolved.tone}`} />
            <span className="sr-only-text">{finalLabel}</span>
        </span>
    );
}
