'use client';

/**
 * The four figures of the supplier's file, drawn like the monitoring cockpit's
 * KPI row: a label, one large figure, a split bar and its legend. Each tile
 * opens the screen that lets the supplier act on it.
 */

import { Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { resolveStatus } from '@/components/ui/StatusPill';
import { toneForValue } from '@/components/ui/Gauge';
import { Legend, SplitBar, fill } from '@/components/monitor/cockpit/parts';
import { useMessages } from '@/lib/messages';
import { formatDate } from '@/lib/format';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LOCAL = defineLabels('components/dashboard/DashboardKpis#LOCAL', {
    fr: {
        approval: 'Statut d’agrément',
        approvalUnknown: 'Indisponible',
        approvalSuppliers: '{count} fournisseurs',
        approvalPickSupplier: 'Choisissez un fournisseur en haut de l’écran pour voir son statut.',
        validUntil: 'Valide jusqu’au {date}',
        noValidity: 'Aucune échéance connue',
        allGood: 'Aucun point bloquant',
        completion: 'Complétude',
        completionScope: '{scored} produit(s) évalué(s) sur {total}',
        completionNone: 'Aucun produit évalué',
        tasks: 'Tâches ouvertes',
        late: 'En retard',
        onTime: 'Dans les temps',
        nextDue: 'Prochaine échéance le {date}',
        noTask: 'Rien à faire pour l’instant',
        documents: 'Documents à traiter',
        documentsOf: 'sur {total}',
        documentsUnavailable: 'Suivi documentaire indisponible',
        valid: 'Valides',
        expiring: 'Expirent bientôt',
        refused: 'Refusés',
        expired: 'Expirés',
        missing: 'Manquants',
        more: '+{count}',
    },
    en: {
        approval: 'Approval status',
        approvalUnknown: 'Unavailable',
        approvalSuppliers: '{count} suppliers',
        approvalPickSupplier: 'Pick a supplier at the top of the screen to see its status.',
        validUntil: 'Valid until {date}',
        noValidity: 'No known deadline',
        allGood: 'Nothing is blocking',
        completion: 'Completeness',
        completionScope: '{scored} of {total} product(s) scored',
        completionNone: 'No product scored',
        tasks: 'Open tasks',
        late: 'Late',
        onTime: 'On time',
        nextDue: 'Next due date {date}',
        noTask: 'Nothing to do right now',
        documents: 'Documents to deal with',
        documentsOf: 'of {total}',
        documentsUnavailable: 'Document tracking unavailable',
        valid: 'Valid',
        expiring: 'Expiring soon',
        refused: 'Refused',
        expired: 'Expired',
        missing: 'Missing',
        more: '+{count}',
    },
});

/** Approval reasons, in the vocabulary of `deriveApprovalStatus`. */
const REASONS = defineLabels('components/dashboard/DashboardKpis#REASONS', {
    fr: {
        documentExpired: 'Document obligatoire expiré',
        documentExpiring: 'Document arrivant à échéance',
        documentMissing: 'Document attendu non fourni',
        documentRefused: 'Document refusé',
        catalogIncomplete: 'Fiche incomplète',
        openProject: 'Dossier en cours',
        openNonConformity: 'Non-conformité ouverte',
    },
    en: {
        documentExpired: 'Mandatory document expired',
        documentExpiring: 'Document nearing expiry',
        documentMissing: 'Expected document not provided',
        documentRefused: 'Document refused',
        catalogIncomplete: 'Incomplete record',
        openProject: 'Open referencing project',
        openNonConformity: 'Open non-conformity',
    },
});

/** Reasons listed under the approval status before the rest is counted. */
const MAX_REASONS = 2;

const TONE_TEXT = {
    ok: 'text-[var(--status-ok)]',
    warn: 'text-[var(--status-warn)]',
    danger: 'text-[var(--status-danger)]',
    info: 'text-[var(--status-info)]',
    neutral: 'text-[var(--becpg-ink)]',
};

/** One tile: the whole card is the link. */
function Kpi({ href, icon, label, value, unit, valueClassName = 'text-[var(--becpg-ink)]', children }) {
    return (
        <Card href={href} padding="md" animate={false} className="h-full">
            <div className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-xs text-[var(--becpg-muted)]">
                    <Icon name={icon} size={16} />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    <Icon name="arrow_forward" size={15} className="shrink-0 text-[var(--becpg-blue-light)]" />
                </span>
                <span className={`truncate text-[28px] font-semibold leading-tight tabular-nums ${valueClassName}`}>
                    {value}
                    {unit ? <small className="ms-1 text-[13px] font-normal text-[var(--becpg-muted)]">{unit}</small> : null}
                </span>
                {children}
            </div>
        </Card>
    );
}

function Hint({ children, className = '' }) {
    return <span className={`text-[11.5px] text-[var(--becpg-muted)] ${className}`}>{children}</span>;
}

/**
 * « Tous les fournisseurs » on a multi-record account: an approval status
 * belongs to one company, so the tile names how many are in play and asks for
 * one rather than showing a status that would read as covering them all.
 */
function AllSuppliersApprovalKpi({ supplierCount, local }) {
    return (
        <Kpi href="/documents" icon="verified_user" label={local.approval} value={fill(local.approvalSuppliers, { count: supplierCount })}>
            <Hint>{local.approvalPickSupplier}</Hint>
        </Kpi>
    );
}

function ApprovalKpi({ approval, supplier, validUntil, local, lang }) {
    const { t } = useMessages();
    const reasonLabels = pickLabels(REASONS, lang);
    const resolved = resolveStatus(approval?.status);
    const label = approval?.status && resolved.messageKey ? t(resolved.messageKey) : local.approvalUnknown;
    const deadline = formatDate(validUntil || approval?.validUntil, lang, { fallback: null });
    const reasons = Array.isArray(approval?.reasons) ? approval.reasons : [];
    return (
        <Kpi href="/documents" icon="verified_user" label={local.approval} value={label} valueClassName={TONE_TEXT[resolved.tone] || TONE_TEXT.neutral}>
            <Hint className="truncate">
                {[supplier?.name, approval ? (deadline ? fill(local.validUntil, { date: deadline }) : local.noValidity) : null].filter(Boolean).join(' · ')}
            </Hint>
            {approval ? (
                <span className="mt-1.5 flex flex-wrap gap-1">
                    {reasons.length === 0 ? (
                        <span className="pill pill-ok pill-sm"><Icon name="check_circle" size={13} />{local.allGood}</span>
                    ) : reasons.slice(0, MAX_REASONS).map((reason) => (
                        <span key={reason} className="pill pill-warn pill-sm pill-no-dot">{reasonLabels[reason] || reason}</span>
                    ))}
                    {reasons.length > MAX_REASONS ? (
                        <span className="pill pill-neutral pill-sm pill-no-dot">{fill(local.more, { count: reasons.length - MAX_REASONS })}</span>
                    ) : null}
                </span>
            ) : null}
        </Kpi>
    );
}

function CompletionKpi({ completion, local }) {
    const score = typeof completion?.score === 'number' ? Math.round(completion.score) : null;
    const tone = score === null ? 'neutral' : toneForValue(score);
    return (
        <Kpi href="/products" icon="donut_large" label={local.completion} value={score ?? '—'} unit={score === null ? null : '%'} valueClassName={TONE_TEXT[tone]}>
            {score === null ? null : (
                <SplitBar parts={[{ key: 'done', tone, value: score }, { key: 'rest', tone: 'grey', value: 100 - score }]} />
            )}
            <Hint>
                {score === null
                    ? local.completionNone
                    : fill(local.completionScope, { scored: completion.scoredEntityCount || 0, total: completion.entityCount || 0 })}
            </Hint>
        </Kpi>
    );
}

function TasksKpi({ actions, local, lang }) {
    const open = actions?.open || 0;
    // The scan stopped at its bound: the figure is a floor, said as such.
    const shown = actions?.truncated ? `${open}+` : open;
    const late = actions?.late || 0;
    const nextDue = formatDate(actions?.nextDueDate, lang, { fallback: null });
    const parts = [
        { key: 'late', tone: 'danger', label: local.late, value: late },
        { key: 'onTime', tone: 'teal', label: local.onTime, value: Math.max(open - late, 0) },
    ];
    return (
        <Kpi href={late > 0 ? '/tasks?late=1' : '/tasks'} icon="assignment_turned_in" label={local.tasks} value={shown}>
            {open > 0 ? <SplitBar parts={parts} /> : null}
            {open > 0 ? <Legend items={parts.filter((part) => part.value > 0)} /> : null}
            <Hint>{open === 0 ? local.noTask : nextDue ? fill(local.nextDue, { date: nextDue }) : null}</Hint>
        </Kpi>
    );
}

function DocumentsKpi({ documents, local }) {
    if (!documents || documents.available === false) {
        return (
            <Kpi href="/documents" icon="folder_shared" label={local.documents} value="—">
                <Hint>{local.documentsUnavailable}</Hint>
            </Kpi>
        );
    }
    const parts = [
        { key: 'missing', tone: 'danger', label: local.missing, value: documents.missing || 0 },
        { key: 'expired', tone: 'orange', label: local.expired, value: documents.expired || 0 },
        { key: 'refused', tone: 'warn', label: local.refused, value: documents.refused || 0 },
        { key: 'expiring', tone: 'teal', label: local.expiring, value: documents.expiringSoon || 0 },
        { key: 'valid', tone: 'ok', label: local.valid, value: documents.valid || 0 },
    ];
    // Missing, expired and refused: the same sum as the navigation badge.
    const toHandle = parts.slice(0, 3).reduce((sum, part) => sum + part.value, 0);
    return (
        <Kpi href="/documents" icon="folder_shared" label={local.documents} value={toHandle} unit={fill(local.documentsOf, { total: documents.total || 0 })}>
            <SplitBar parts={parts} />
            <Legend items={parts.filter((part) => part.value > 0)} />
        </Kpi>
    );
}

/**
 * @param {Object} props
 * @param {Object|null} props.approval `buildDashboard().approval`
 * @param {Object|null} props.supplier the record the approval is about, `null` under
 *        « Tous les fournisseurs » on a multi-record account
 * @param {number} [props.supplierCount] records the account acts for
 * @param {?string} props.validUntil nearest expiry of a mandatory document
 * @param {Object|null} props.completion `buildDashboard().completion`
 * @param {Object|null} props.actions `buildDashboard().actions`
 * @param {Object|null} props.documents `buildDashboard().documents`
 */
export function DashboardKpis({ approval, supplier, supplierCount = 0, validUntil, completion, actions, documents }) {
    const { lang } = useMessages();
    const local = pickLabels(LOCAL, lang);
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            {!supplier && supplierCount > 1 ? (
                <AllSuppliersApprovalKpi supplierCount={supplierCount} local={local} />
            ) : (
                <ApprovalKpi approval={approval} supplier={supplier} validUntil={validUntil} local={local} lang={lang} />
            )}
            <CompletionKpi completion={completion} local={local} />
            <TasksKpi actions={actions} local={local} lang={lang} />
            <DocumentsKpi documents={documents} local={local} />
        </div>
    );
}
