'use client';

/**
 * Why a supplier has its approval status, read as a ladder: the rule that holds
 * today with the rows behind it, the rules that will hold once those rows are
 * cleared, and what it takes to be approved.
 *
 * The rules come from the server (`approval.rules`); see `lib/approvalLadder.js`.
 */

import { Button, Icon } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { DateText } from '@/components/ui/DateText';
import { describeReason } from '@/components/monitor/RiskList';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';
import { APPROVED_STATUS, approvalConditions, heldRules } from '@/lib/approvalLadder';

/** Rows of one reason shown before the link to the full list. */
const PREVIEW_ROWS = 3;

/** Reason code → the sheet tab that lists its rows. */
export const REASON_TABS = Object.freeze({
    blockingNc: 'nc',
    openProject: 'projects',
    documentExpired: 'documents',
    documentExpiring: 'documents',
    documentMissing: 'documents',
});

const LABELS = defineLabels('components/monitor/supplier/StatusLadder#LABELS', {
    fr: {
        current: 'Règle vérifiée',
        next: 'Ensuite',
        approvedWhen: 'Agréé quand',
        approvedNow: 'Toutes les conditions sont remplies',
        seeAll: 'Voir les {count}',
        days: '{count} j',
        on: 'sur {name}',
        conditions: {
            documentExpired: 'Aucun document obligatoire expiré',
            blockingNc: 'Aucune NC bloquante',
            documentExpiring: 'Aucun document à renouveler',
            openProject: 'Aucun projet ouvert',
            documentMissing: 'Aucun document obligatoire manquant',
            blockingCatalog: 'Catalogues bloquants satisfaits',
        },
        met: 'remplie',
        unmet: 'non remplie',
    },
    en: {
        current: 'Rule met',
        next: 'Then',
        approvedWhen: 'Approved when',
        approvedNow: 'Every condition is met',
        seeAll: 'See all {count}',
        days: '{count} d',
        on: 'on {name}',
        conditions: {
            documentExpired: 'No expired mandatory document',
            blockingNc: 'No blocking NC',
            documentExpiring: 'No document to renew',
            openProject: 'No open project',
            documentMissing: 'No missing mandatory document',
            blockingCatalog: 'Blocking catalogs satisfied',
        },
        met: 'met',
        unmet: 'not met',
    },
});

/** Tone of the dot of a step, by status. */
const STEP_TONES = Object.freeze({
    suspended: 'danger',
    toRenew: 'warn',
    inProgress: 'info',
    approved: 'ok',
});

const DOT_CLASSES = Object.freeze({
    danger: 'bg-[var(--status-danger-bg)] text-[var(--status-danger)]',
    warn: 'bg-[var(--status-warn-bg)] text-[var(--status-warn)]',
    info: 'bg-[var(--status-info-bg)] text-[var(--status-info)]',
    ok: 'bg-[var(--status-ok-bg)] text-[var(--status-ok)]',
});

const STEP_ICONS = Object.freeze({
    suspended: 'block',
    toRenew: 'event_repeat',
    inProgress: 'autorenew',
    approved: 'verified',
});

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]));
}

/**
 * The rows behind one reason: the NCs and projects read in full by the sheet,
 * the document rows of the approval otherwise.
 */
function rowsOf(code, { approval, nonConformities, projects }) {
    if (code === 'blockingNc' && nonConformities.length > 0) {
        return nonConformities.map((row) => ({ nodeRef: row.nodeRef, name: row.name, days: row.delayDays }));
    }
    if (code === 'openProject' && projects.length > 0) {
        return projects.map((row) => ({ nodeRef: row.nodeRef, name: row.name, days: row.ageDays }));
    }
    return approval.details?.[code] || [];
}

function ReasonRows({ code, rows, local, lang, onOpenTab }) {
    const tab = REASON_TABS[code];
    return (
        <ul className="mt-1.5 flex flex-col">
            {rows.slice(0, PREVIEW_ROWS).map((row) => (
                <li
                    key={row.nodeRef}
                    className="flex min-w-0 items-center gap-2 border-t border-dashed border-[var(--becpg-line)] py-1 text-sm"
                >
                    <span className="min-w-0 flex-1 truncate font-medium" title={row.name}>{row.name}</span>
                    {row.entity?.name ? (
                        <span className="hidden truncate text-xs text-[var(--becpg-muted)] sm:inline">
                            {fill(local.on, { name: row.entity.name })}
                        </span>
                    ) : null}
                    {row.validTo ? (
                        <span className="shrink-0 text-xs text-[var(--becpg-muted)]">
                            <DateText value={row.validTo} lang={lang} />
                        </span>
                    ) : null}
                    {typeof row.days === 'number' ? (
                        <span className="shrink-0 text-xs tabular-nums text-[var(--becpg-muted)]">
                            {fill(local.days, { count: row.days })}
                        </span>
                    ) : null}
                </li>
            ))}
            {tab && rows.length > 0 ? (
                <li className="border-t border-dashed border-[var(--becpg-line)] pt-1.5">
                    <Button variant="link" size="sm" onClick={() => onOpenTab(tab)}>
                        {fill(local.seeAll, { count: rows.length })}
                    </Button>
                </li>
            ) : null}
        </ul>
    );
}

function Step({ status, badge, last = false, children }) {
    const tone = STEP_TONES[status] || 'info';
    return (
        <li className="relative grid grid-cols-[2.125rem_minmax(0,1fr)] gap-2.5 pb-4 last:pb-0">
            {last ? null : (
                <span aria-hidden="true" className="absolute bottom-0 start-4 top-9 w-0.5 bg-[var(--becpg-line)]" />
            )}
            <span className={`flex h-[2.125rem] w-[2.125rem] items-center justify-center rounded-full ${DOT_CLASSES[tone]}`}>
                <Icon name={STEP_ICONS[status] || 'rule'} size={18} />
            </span>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={status} size="sm" />
                    {badge}
                </div>
                {children}
            </div>
        </li>
    );
}

/**
 * @param {Object} props
 * @param {Object} props.approval `approval` of the sheet: status, reasons, details, rules
 * @param {Object[]} props.nonConformities the blocking NCs, read in full
 * @param {Object[]} props.projects the open projects
 * @param {Function} props.onOpenTab `(tabId) => void`
 */
export function StatusLadder({ approval, nonConformities = [], projects = [], onOpenTab }) {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    const held = heldRules(approval);
    const reasons = new Set(approval?.reasons || []);
    const conditions = approvalConditions(approval);

    return (
        <ol className="flex flex-col">
            {held.map((rule, index) => (
                <Step
                    key={rule.status}
                    status={rule.status}
                    badge={(
                        <span className={`pill pill-sm pill-no-dot ${index === 0 ? `pill-${STEP_TONES[rule.status] || 'info'}` : 'pill-neutral'}`}>
                            {index === 0 ? local.current : local.next}
                        </span>
                    )}
                >
                    {rule.reasons.map((code) => {
                        const rows = rowsOf(code, { approval, nonConformities, projects });
                        const described = describeReason({ code, count: rows.length || 1 }, lang);
                        return (
                            <div key={code} className="mt-2">
                                <p className="flex items-center gap-1.5 text-sm text-[var(--becpg-ink)]">
                                    <Icon name={described?.icon || 'rule'} size={16} className="text-[var(--becpg-muted)]" />
                                    {described?.label || code}
                                </p>
                                {rows.length > 0 ? (
                                    <ReasonRows code={code} rows={rows} local={local} lang={lang} onOpenTab={onOpenTab} />
                                ) : null}
                            </div>
                        );
                    })}
                </Step>
            ))}
            <Step
                status={APPROVED_STATUS}
                last
                badge={(
                    <span className="text-sm font-medium text-[var(--becpg-ink)]">
                        {held.length === 0 ? local.approvedNow : local.approvedWhen}
                    </span>
                )}
            >
                <ul className="mt-2 flex flex-wrap gap-1.5">
                    {conditions.map((code) => {
                        const met = !reasons.has(code);
                        return (
                            <li key={code}>
                                <span
                                    className={`pill pill-sm pill-no-dot ${met ? 'pill-ok' : 'pill-neutral'}`}
                                    title={met ? local.met : local.unmet}
                                >
                                    <Icon name={met ? 'check' : 'close'} size={13} />
                                    <span>{local.conditions[code] || code}</span>
                                    <span className="sr-only-text">{` (${met ? local.met : local.unmet})`}</span>
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </Step>
        </ol>
    );
}
