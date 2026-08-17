'use client';

/**
 * `/monitor/suppliers/[id]` — the steering sheet of one supplier
 * (spec §4.6.2, scorecard §4.6.4).
 *
 * One call, `GET /api/v1/monitor/suppliers/{nodeRef}`, brings the whole sheet:
 * identity, the derived approval status **with the rows that caused it**, the
 * `pjt:scoreList` scorecard, the catalogue completeness, the documents with their
 * validity, the linked products, the sub-suppliers, the open campaigns and the
 * exchange history (`bcpg:activityList` merged with the forum thread Share
 * renders). A nodeRef outside the caller's perimeter answers 404 — never a leak.
 *
 * ## What the screen adds
 *
 *  - **The status is explained, not asserted.** The approval status is derived and
 *    never persisted (spec §5.4.3), so the only honest way to show it is next to
 *    the offending rows: which mandatory document expired, which NC blocks, which
 *    campaign is still open. That block is the difference between "suspendu" and
 *    "suspendu parce que".
 *  - **The four actions of §4.6.2** — relancer, escalader, suspendre (through
 *    `POST /monitor/actions`, which reuses beCPG's own mechanisms) and *lancer un
 *    processus* (référencement, renouvellement, ouverture de NC…) through
 *    `POST /process/start`, restricted to the instance's `PORTAL_PROCESS_TEMPLATES`
 *    allow-list. A process that is not allow-listed is not offered, rather than
 *    failing on click.
 *  - **Honest degradation on history**: no cube, no curve (`HistoryUnavailable`).
 */

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppShell, PageHeader } from '@/components/shell/AppShell';
import { Button, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { GaugeBar } from '@/components/ui/Gauge';
import { ConfirmModal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Field';
import { SkeletonCard, SkeletonText } from '@/components/ui/Skeleton';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { ExpiryPill, ValidityRange } from '@/components/documents/ExpiryPill';
import { formatDate, formatDateTime } from '@/lib/format';
import {
    MonitorActionButtons,
    describeReason,
    useMonitorActionCatalog,
} from '@/components/monitor/RiskList';
import { SupplierScorecard } from '@/components/monitor/SupplierScorecard';
import { useToast } from '@/components/providers/ToastProvider';
import { api, apiUrl, useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        back: 'Fournisseurs',
        refresh: 'Rafraîchir',
        notFound: 'Fournisseur introuvable',
        notFoundHint:
            'Ce fournisseur n’existe pas, ou il est hors de votre périmètre : le portail ne révèle jamais un nœud que vos droits beCPG ne couvrent pas.',
        kpi: {
            approval: 'Statut d’agrément',
            completion: 'Complétude',
            documents: 'Documents obligatoires',
            nc: 'NC bloquantes',
            campaigns: 'Campagnes en cours',
        },
        kpiHints: {
            derived: 'Dérivé, jamais stocké',
            documents: '{expired} expirés · {expiring} expirants · {missing} manquants',
            completion: '{count} catalogue(s) actif(s)',
            campaigns: '{late} en retard',
            cached: 'statut mis en cache',
        },
        why: {
            title: 'Pourquoi ce statut',
            subtitle: 'Les lignes qui déclenchent le statut dérivé (§5.4.3)',
            empty: 'Aucune anomalie : documents obligatoires valides, aucune NC bloquante, aucun catalogue bloquant.',
            more: '… et {count} autre(s)',
            entity: 'sur {name}',
            priority: 'priorité {priority}',
            catalog: 'Catalogue bloquant non satisfait',
        },
        documents: {
            title: 'Documents',
            subtitle: 'Exigences dérivées de bcpg:documentType et validité cm:effectivity',
            empty: 'Aucun document attendu ni fourni pour ce fournisseur',
            mandatory: 'obligatoire',
            download: 'Télécharger',
            summary: '{satisfied}/{mandatory} obligatoires satisfaits · {total} documents',
        },
        products: {
            title: 'Produits liés',
            subtitle: 'Entités rattachées au fournisseur',
            empty: 'Aucun produit rattaché',
        },
        subSuppliers: {
            title: 'Sous-fournisseurs',
            empty: 'Aucun sous-fournisseur déclaré',
        },
        projects: {
            title: 'Campagnes et projets en cours',
            empty: 'Aucune campagne ouverte',
            manager: 'Pilote : {name}',
            due: 'Échéance {date}',
            late: 'En retard',
            unanswered: 'Sans réponse depuis {days} j',
        },
        activity: {
            title: 'Historique des échanges',
            subtitle: 'bcpg:activityList et fil de discussion — la même source que Share',
            empty: 'Aucun échange enregistré',
            message: 'Message',
            activity: 'Activité',
        },
        process: {
            title: 'Lancer un processus',
            hint: 'Référencement, renouvellement, ouverture de NC… selon ce que l’instance autorise.',
            none: 'Aucun processus n’est autorisé sur cette instance (PORTAL_PROCESS_TEMPLATES).',
            launch: 'Lancer',
            confirmTitle: 'Lancer « {process} » ?',
            confirmMessage:
                'Un projet beCPG va être créé pour ce fournisseur à partir du modèle autorisé. Un processus démarré ne peut pas être annulé depuis le portail.',
            started: 'Processus démarré.',
        },
        identity: {
            code: 'Code',
            erpCode: 'Code ERP',
            legalName: 'Raison sociale',
            state: 'État beCPG',
            family: 'Famille',
            subFamily: 'Sous-famille',
            sites: 'Sites',
            subsidiaries: 'Filiales',
            buyer: 'Acheteur référent',
            email: 'Contact',
            lastActivity: 'Dernière activité',
            parent: 'Fournisseur parent',
            none: '—',
        },
        generatedAt: 'Données au {time}',
    },
    en: {
        back: 'Suppliers',
        refresh: 'Refresh',
        notFound: 'Supplier not found',
        notFoundHint:
            'This supplier does not exist, or it is outside your perimeter: the portal never discloses a node your beCPG rights do not cover.',
        kpi: {
            approval: 'Approval status',
            completion: 'Completeness',
            documents: 'Mandatory documents',
            nc: 'Blocking NCs',
            campaigns: 'Open campaigns',
        },
        kpiHints: {
            derived: 'Derived, never stored',
            documents: '{expired} expired · {expiring} expiring · {missing} missing',
            completion: '{count} active catalog(s)',
            campaigns: '{late} late',
            cached: 'status served from cache',
        },
        why: {
            title: 'Why this status',
            subtitle: 'The rows that trigger the derived status (§5.4.3)',
            empty: 'No anomaly: mandatory documents valid, no blocking NC, no blocking catalog.',
            more: '… and {count} more',
            entity: 'on {name}',
            priority: 'priority {priority}',
            catalog: 'Blocking catalog unsatisfied',
        },
        documents: {
            title: 'Documents',
            subtitle: 'Requirements derived from bcpg:documentType, validity from cm:effectivity',
            empty: 'No document expected or provided for this supplier',
            mandatory: 'mandatory',
            download: 'Download',
            summary: '{satisfied}/{mandatory} mandatory satisfied · {total} documents',
        },
        products: {
            title: 'Linked products',
            subtitle: 'Entities attached to the supplier',
            empty: 'No linked product',
        },
        subSuppliers: {
            title: 'Sub-suppliers',
            empty: 'No sub-supplier declared',
        },
        projects: {
            title: 'Open campaigns and projects',
            empty: 'No open campaign',
            manager: 'Manager: {name}',
            due: 'Due {date}',
            late: 'Late',
            unanswered: 'No answer for {days} days',
        },
        activity: {
            title: 'Exchange history',
            subtitle: 'bcpg:activityList and the discussion thread — the source Share uses',
            empty: 'No exchange recorded',
            message: 'Message',
            activity: 'Activity',
        },
        process: {
            title: 'Start a process',
            hint: 'Referencing, renewal, opening an NC… depending on what the instance allows.',
            none: 'No process is allowed on this instance (PORTAL_PROCESS_TEMPLATES).',
            launch: 'Start',
            confirmTitle: 'Start "{process}"?',
            confirmMessage:
                'A beCPG project will be created for this supplier from the allow-listed template. A started process cannot be cancelled from the portal.',
            started: 'Process started.',
        },
        identity: {
            code: 'Code',
            erpCode: 'ERP code',
            legalName: 'Legal name',
            state: 'beCPG state',
            family: 'Family',
            subFamily: 'Sub-family',
            sites: 'Sites',
            subsidiaries: 'Subsidiaries',
            buyer: 'Referring buyer',
            email: 'Contact',
            lastActivity: 'Last activity',
            parent: 'Parent supplier',
            none: '—',
        },
        generatedAt: 'Data as of {time}',
    },
};

/** Rows of one reason shown before folding the rest behind a counter. */
const DETAIL_PREVIEW = 5;

/** Reason code → the `details` key of the approval adapter. */
const DETAIL_KEYS = Object.freeze([
    'documentExpired',
    'documentExpiring',
    'documentMissing',
    'blockingNc',
    'openProject',
]);

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]));
}

/** Tone of the approval status, for the KPI tile. */
function approvalTone(status) {
    if (status === 'suspended') {
        return 'danger';
    }
    if (status === 'toRenew') {
        return 'warn';
    }
    if (status === 'inProgress') {
        return 'info';
    }
    return 'ok';
}

/** A definition row of the identity card. */
function Definition({ label, children }) {
    return (
        <div className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-[var(--becpg-dark-grey)]">{label}</dt>
            <dd className="min-w-0 break-words text-sm">{children}</dd>
        </div>
    );
}

/**
 * *Pourquoi ce statut* — the derived status next to the rows that caused it.
 */
function ApprovalReasons({ approval, local, lang }) {
    const details = (approval && approval.details) || {};
    const blockingCatalogs = Array.isArray(details.blockingCatalog) ? details.blockingCatalog : [];
    const groups = DETAIL_KEYS
        .map((code) => ({ code, rows: Array.isArray(details[code]) ? details[code] : [] }))
        .filter((group) => group.rows.length > 0);

    if (groups.length === 0 && blockingCatalogs.length === 0) {
        return <EmptyState compact variant="success" title={local.why.empty} />;
    }

    return (
        <ul className="flex flex-col gap-3">
            {groups.map((group) => {
                const described = describeReason({ code: group.code, count: group.rows.length }, lang);
                return (
                    <li key={group.code}>
                        <span className={`pill pill-sm pill-no-dot pill-${described ? described.tone : 'neutral'}`}>
                            {described ? <Icon name={described.icon} size={13} /> : null}
                            <span>{described ? described.label : group.code}</span>
                        </span>
                        <ul className="mt-1.5 flex flex-col gap-1 pl-1">
                            {group.rows.slice(0, DETAIL_PREVIEW).map((row) => (
                                <li key={row.nodeRef} className="flex flex-wrap items-baseline gap-1.5 text-xs">
                                    <span className="font-medium">{row.name}</span>
                                    {row.entity ? (
                                        <span className="text-[var(--becpg-dark-grey)]">
                                            {fill(local.why.entity, { name: row.entity.name })}
                                        </span>
                                    ) : null}
                                    {row.validTo ? (
                                        <span className="text-[var(--becpg-dark-grey)]">
                                            {formatDate(row.validTo, lang)}
                                        </span>
                                    ) : null}
                                    {row.priority !== undefined && row.priority !== null ? (
                                        <span className="text-[var(--becpg-dark-grey)]">
                                            {fill(local.why.priority, { priority: row.priority })}
                                        </span>
                                    ) : null}
                                    {row.state ? (
                                        <StatusPill status={row.state} size="sm" />
                                    ) : null}
                                </li>
                            ))}
                            {group.rows.length > DETAIL_PREVIEW ? (
                                <li className="text-xs text-[var(--becpg-dark-grey)]">
                                    {fill(local.why.more, { count: group.rows.length - DETAIL_PREVIEW })}
                                </li>
                            ) : null}
                        </ul>
                    </li>
                );
            })}

            {blockingCatalogs.length > 0 ? (
                <li>
                    <span className="pill pill-warn pill-sm pill-no-dot">
                        <Icon name="rule" size={13} />
                        <span>{local.why.catalog}</span>
                    </span>
                    <ul className="mt-1.5 flex flex-col gap-1 pl-1 text-xs">
                        {blockingCatalogs.map((catalog, index) => (
                            <li key={catalog.id || catalog.label || index}>
                                {catalog.label || catalog.id}
                                {typeof catalog.score === 'number' ? (
                                    <span className="text-[var(--becpg-dark-grey)]"> — {catalog.score} %</span>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                </li>
            ) : null}
        </ul>
    );
}

/**
 * *Lancer un processus* — `POST /api/v1/process/start`, restricted to the
 * instance's allow-list. Starting a project cannot be undone from the portal, so
 * it goes through a confirmation that says exactly that.
 *
 * ## The list comes from the endpoint it posts to
 *
 * It used to come from `useMonitorActionCatalog()`, i.e. from
 * `GET /api/v1/monitor/actions` — which lists the **suspension** processes, and
 * those are deliberately pinned to `PORTAL_PROCESS_TEMPLATES` because beCPG
 * ships no marker for a suspension template (see that route's header). The
 * launcher started a *referencing* process, whose templates are **discovered**.
 *
 * Two lists, one of them consulted and the other used. Measured on
 * the deployed portal: `GET /api/v1/process/start` answered one discovered template
 * while the panel displayed "aucun processus n'est autorisé sur cette instance
 * (PORTAL_PROCESS_TEMPLATES)" — naming a variable that governs a different
 * action. Asking the endpoint that will serve the request is the only way the
 * two cannot drift.
 */
function ProcessLauncher({ supplierRef, local, onDone }) {
    const catalog = useApi('process/start');
    const toast = useToast();
    const [process, setProcess] = useState('');
    const [confirming, setConfirming] = useState(false);
    const processes = useMemo(
        () => (catalog.data && Array.isArray(catalog.data.processes) ? catalog.data.processes : []),
        [catalog.data],
    );
    const selected = process || (processes[0] && processes[0].id) || '';

    const launch = useCallback(async () => {
        try {
            await api.post('process/start', { process: selected, entityNodeRef: supplierRef });
            toast.success(local.process.started);
            if (onDone) {
                onDone();
            }
        }
        catch (error) {
            toast.error(error);
        }
    }, [selected, supplierRef, toast, local, onDone]);

    if (catalog.loading) {
        return <SkeletonText lines={2} />;
    }
    if (processes.length === 0) {
        return <p className="text-xs text-[var(--becpg-dark-grey)]">{local.process.none}</p>;
    }

    return (
        <>
            <p className="mb-2 text-xs text-[var(--becpg-dark-grey)]">{local.process.hint}</p>
            <div className="flex flex-wrap items-center gap-2">
                <Select
                    aria-label={local.process.title}
                    className="min-w-[12rem]"
                    value={selected}
                    onChange={(event) => setProcess(event.target.value)}
                    // The discovered templates carry a real label — beCPG's own
                    // project template name — where the pinned list only had ids.
                    options={processes.map((entry) => ({
                        value: entry.id,
                        label: entry.label || entry.name || entry.id,
                    }))}
                />
                <Button variant="primary" size="sm" icon="play_arrow" onClick={() => setConfirming(true)}>
                    {local.process.launch}
                </Button>
            </div>
            <ConfirmModal
                open={confirming}
                onClose={() => setConfirming(false)}
                onConfirm={launch}
                tone="danger"
                title={fill(local.process.confirmTitle, { process: selected })}
                message={local.process.confirmMessage}
                confirmLabel={local.process.launch}
            />
        </>
    );
}

/**
 * @returns {JSX.Element}
 */
export default function MonitorSupplierSheetPage() {
    const { lang } = useMessages();
    const local = LABELS[lang] || LABELS.fr;
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    const sheet = useApi(id ? `monitor/suppliers/${encodeURIComponent(id)}` : null);
    const data = sheet.data;

    const supplier = (data && data.supplier) || null;
    const approval = (data && data.approval) || null;
    const documents = (data && data.documents) || { items: [], summary: null };
    const projects = (data && data.projects) || [];
    const identity = local.identity;

    const target = useMemo(
        () =>
            supplier
                ? [{
                    nodeRef: supplier.nodeRef,
                    name: supplier.name,
                    code: supplier.code,
                    risk: { reasons: (approval ? approval.reasons : []).map((code) => ({ code, count: 1 })) },
                }]
                : [],
        [supplier, approval],
    );

    if (sheet.error) {
        return (
            <AppShell space="monitor" title={local.back}>
                {sheet.error.isNotFound ? (
                    <EmptyState
                        variant="error"
                        icon="person_off"
                        title={local.notFound}
                        message={local.notFoundHint}
                        actionLabel={local.back}
                        actionHref="/monitor/suppliers"
                    />
                ) : (
                    <ErrorState error={sheet.error} onRetry={sheet.refresh} />
                )}
            </AppShell>
        );
    }

    return (
        <AppShell
            fullWidth
            space="monitor"
            title={supplier ? supplier.name : local.back}
            headerStatus={
                approval ? (
                    <StatusPill status={approval.status} label={approval.statusLabel} size="sm" />
                ) : null
            }
            breadcrumb={
                <Link
                    href="/monitor/suppliers"
                    className="inline-flex items-center gap-1 text-[var(--becpg-blue-light)] hover:text-[var(--becpg-orange)]"
                >
                    <Icon name="chevron_left" size={14} />
                    {local.back}
                </Link>
            }
            actions={
                <Button
                    variant="outline"
                    size="sm"
                    icon="refresh"
                    label={local.refresh}
                    loading={sheet.loading}
                    onClick={sheet.refresh}
                />
            }
        >
            {!data ? (
                <div className="flex flex-col gap-3">
                    <SkeletonCard lines={3} />
                    <StatGrid columns={4}>
                        {Array.from({ length: 4 }, (_, index) => (
                            <SkeletonCard key={index} lines={2} />
                        ))}
                    </StatGrid>
                    <SkeletonCard lines={6} />
                </div>
            ) : (
                <>
                    <PageHeader
                        title={
                            <span className="flex flex-wrap items-baseline gap-2">
                                <span>{supplier.name}</span>
                                {supplier.code ? (
                                    <span className="text-sm font-normal text-[var(--becpg-dark-grey)]">
                                        {supplier.code}
                                    </span>
                                ) : null}
                            </span>
                        }
                        description={
                            <span className="flex flex-wrap items-center gap-2">
                                {supplier.legalName && supplier.legalName !== supplier.name
                                    ? supplier.legalName
                                    : null}
                                {supplier.state ? <StatusPill status={supplier.state} size="sm" /> : null}
                                <span className="text-[11px]">
                                    {fill(local.generatedAt, {
                                        time: formatDateTime(data.generatedAt, lang) || '—',
                                    })}
                                </span>
                            </span>
                        }
                        actions={
                            <MonitorActionButtons
                                targets={target}
                                allowed={data.actions}
                                size="md"
                                onDone={sheet.refresh}
                            />
                        }
                    />

                    {/* ------------------------------------------------ KPI row */}
                    <StatGrid columns={4} className="mb-4">
                        <StatCard
                            index={0}
                            label={local.kpi.approval}
                            value={approval ? approval.statusLabel : '—'}
                            icon="verified_user"
                            tone={approvalTone(approval && approval.status)}
                            hint={
                                approval && approval.cached
                                    ? `${local.kpiHints.derived} · ${local.kpiHints.cached}`
                                    : local.kpiHints.derived
                            }
                        />
                        <StatCard
                            index={1}
                            label={local.kpi.completion}
                            value={
                                data.completion && typeof data.completion.score === 'number'
                                    ? data.completion.score
                                    : '—'
                            }
                            unit={
                                data.completion && typeof data.completion.score === 'number' ? '%' : undefined
                            }
                            icon="donut_large"
                            tone="info"
                            hint={fill(local.kpiHints.completion, {
                                count: ((data.completion && data.completion.catalogs) || []).length,
                            })}
                        >
                            <GaugeBar
                                value={data.completion ? data.completion.score : null}
                                size="sm"
                                showValue={false}
                                ariaLabel={local.kpi.completion}
                            />
                        </StatCard>
                        <StatCard
                            index={2}
                            label={local.kpi.documents}
                            value={documents.summary ? documents.summary.mandatory || 0 : 0}
                            icon="fact_check"
                            tone={
                                approval && approval.metrics && approval.metrics.documentsExpired > 0
                                    ? 'danger'
                                    : approval && approval.metrics && approval.metrics.documentsMissing > 0
                                      ? 'warn'
                                      : 'ok'
                            }
                            hint={fill(local.kpiHints.documents, {
                                expired: (approval && approval.metrics && approval.metrics.documentsExpired) || 0,
                                expiring:
                                    (approval && approval.metrics && approval.metrics.documentsExpiring) || 0,
                                missing: (approval && approval.metrics && approval.metrics.documentsMissing) || 0,
                            })}
                        />
                        <StatCard
                            index={3}
                            label={local.kpi.nc}
                            value={(approval && approval.metrics && approval.metrics.openNc) || 0}
                            icon="report_problem"
                            tone={
                                approval && approval.metrics && approval.metrics.openNc > 0 ? 'danger' : 'ok'
                            }
                            href={`/monitor/quality?q=${encodeURIComponent(supplier.name)}`}
                            hint={fill(local.kpiHints.campaigns, {
                                late: projects.filter((project) => project.isLate).length,
                            })}
                        />
                    </StatGrid>

                    {/* --------------------------------- why + identity + start */}
                    <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[1.2fr_1fr]">
                        <Card
                            title={local.why.title}
                            subtitle={local.why.subtitle}
                            icon="troubleshoot"
                            index={0}
                        >
                            <ApprovalReasons approval={approval} local={local} lang={lang} />
                        </Card>

                        <div className="flex flex-col gap-3 sm:gap-4">
                            <Card title={supplier.name} icon="business" index={1}>
                                <dl className="grid grid-cols-2 gap-3">
                                    <Definition label={identity.code}>
                                        {supplier.code || identity.none}
                                    </Definition>
                                    <Definition label={identity.erpCode}>
                                        {supplier.erpCode || identity.none}
                                    </Definition>
                                    <Definition label={identity.family}>
                                        {supplier.family
                                            ? supplier.family.label || null
                                            : identity.none}
                                    </Definition>
                                    <Definition label={identity.subFamily}>
                                        {supplier.subFamily
                                            ? supplier.subFamily.label || null
                                            : identity.none}
                                    </Definition>
                                    <Definition label={identity.buyer}>
                                        {supplier.buyer || identity.none}
                                    </Definition>
                                    <Definition label={identity.email}>
                                        {supplier.email ? (
                                            <a
                                                href={`mailto:${supplier.email}`}
                                                className="text-[var(--becpg-blue-light)] underline underline-offset-2"
                                            >
                                                {supplier.email}
                                            </a>
                                        ) : (
                                            identity.none
                                        )}
                                    </Definition>
                                    <Definition label={identity.sites}>
                                        {(supplier.sites || []).map((site) => site.label).join(', ')
                                            || identity.none}
                                    </Definition>
                                    <Definition label={identity.subsidiaries}>
                                        {(supplier.subsidiaries || []).map((entry) => entry.label).join(', ')
                                            || identity.none}
                                    </Definition>
                                    <Definition label={identity.parent}>
                                        {supplier.parent
                                            ? supplier.parent.label || supplier.parent.nodeRef
                                            : identity.none}
                                    </Definition>
                                    <Definition label={identity.lastActivity}>
                                        {supplier.lastActivity
                                            ? formatDate(supplier.lastActivity, lang)
                                            : identity.none}
                                    </Definition>
                                </dl>
                            </Card>

                            <Card title={local.process.title} icon="rocket_launch" index={2}>
                                <ProcessLauncher
                                    supplierRef={supplier.nodeRef}
                                    local={local}
                                    onDone={sheet.refresh}
                                />
                            </Card>
                        </div>
                    </div>

                    {/* ----------------------------------------------- scorecard */}
                    <SupplierScorecard
                        className="mt-3 sm:mt-4"
                        scorecard={data.scorecard}
                        completion={data.completion}
                        approval={approval}
                        history={data.history}
                    />

                    {/* ----------------------------------------------- documents */}
                    <Card
                        className="mt-3 sm:mt-4"
                        title={local.documents.title}
                        subtitle={local.documents.subtitle}
                        icon="folder_shared"
                        padding="none"
                        index={0}
                        actions={
                            documents.summary ? (
                                <span className="text-xs text-[var(--becpg-dark-grey)]">
                                    {fill(local.documents.summary, {
                                        satisfied: documents.summary.mandatorySatisfied || 0,
                                        mandatory: documents.summary.mandatory || 0,
                                        total: documents.summary.total || 0,
                                    })}
                                </span>
                            ) : null
                        }
                    >
                        {documents.items.length === 0 ? (
                            <div className="p-4">
                                <EmptyState compact title={local.documents.empty} />
                            </div>
                        ) : (
                            <ul className="border-t border-[var(--becpg-grey)]">
                                {documents.items.map((document) => (
                                    <li
                                        key={document.nodeRef}
                                        className="flex flex-wrap items-center gap-2 border-b border-[var(--becpg-grey)] px-3 py-2.5 last:border-0 sm:px-4"
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-2">
                                                <span className="truncate text-sm font-medium">
                                                    {document.type ? document.type.label : document.name}
                                                </span>
                                                {document.isMandatory ? (
                                                    <span className="pill pill-neutral pill-sm pill-no-dot">
                                                        {local.documents.mandatory}
                                                    </span>
                                                ) : null}
                                            </span>
                                            <span className="mt-0.5 flex flex-wrap items-center gap-2">
                                                <ValidityRange
                                                    from={document.validFrom}
                                                    to={document.validTo}
                                                />
                                                {document.entity ? (
                                                    <span className="text-xs text-[var(--becpg-dark-grey)]">
                                                        {fill(local.why.entity, {
                                                            name: document.entity.label || document.entity.name,
                                                        })}
                                                    </span>
                                                ) : null}
                                            </span>
                                        </span>
                                        <ExpiryPill
                                            status={document.status}
                                            validTo={document.validTo}
                                            daysToExpiry={document.daysToExpiry}
                                            size="sm"
                                        />
                                        {document.downloadUrl ? (
                                            <a
                                                href={apiUrl(document.downloadUrl)}
                                                className="inline-flex items-center gap-1 text-xs text-[var(--becpg-blue-light)] underline underline-offset-2 hover:text-[var(--becpg-orange)]"
                                            >
                                                <Icon name="download" size={14} />
                                                <span className="hidden sm:inline">
                                                    {local.documents.download}
                                                </span>
                                            </a>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>

                    {/* ------------------------------- products / sub-suppliers */}
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
                        <Card
                            title={local.products.title}
                            subtitle={local.products.subtitle}
                            icon="inventory_2"
                            index={0}
                        >
                            {data.products.length === 0 ? (
                                <EmptyState compact title={local.products.empty} />
                            ) : (
                                <ul className="flex flex-col gap-2">
                                    {data.products.map((product) => (
                                        <li
                                            key={product.nodeRef}
                                            className="flex flex-wrap items-center gap-2 border-b border-[var(--becpg-grey)] pb-2 last:border-0 last:pb-0"
                                        >
                                            {/* A listed product leads to its record: the row
                                                carried the name, the code and the date without
                                                ever being clickable, and the product had to be
                                                found again through search to open it. */}
                                            <Link
                                                href={`/products/${encodeURIComponent(product.nodeRef)}`}
                                                className="min-w-0 flex-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                                            >
                                                <span className="block truncate text-sm text-[var(--becpg-blue)] underline-offset-2 hover:underline">
                                                    {product.name}
                                                </span>
                                                <span className="text-xs text-[var(--becpg-dark-grey)]">
                                                    {product.code || ''}
                                                    {product.modified
                                                        ? ` · ${formatDate(product.modified, lang)}`
                                                        : ''}
                                                </span>
                                            </Link>
                                            {product.state ? (
                                                <StatusPill status={product.state} size="sm" />
                                            ) : null}
                                            {typeof product.completion === 'number' ? (
                                                <span className="w-20">
                                                    <GaugeBar
                                                        value={product.completion}
                                                        size="sm"
                                                        ariaLabel={product.name}
                                                    />
                                                </span>
                                            ) : null}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>

                        <Card title={local.subSuppliers.title} icon="account_tree" index={1}>
                            {data.subSuppliers.length === 0 ? (
                                <EmptyState compact title={local.subSuppliers.empty} />
                            ) : (
                                <ul className="flex flex-col gap-2">
                                    {data.subSuppliers.map((entry) => (
                                        <li key={entry.nodeRef} className="flex items-center gap-2">
                                            <Link
                                                href={`/monitor/suppliers/${encodeURIComponent(entry.nodeRef)}`}
                                                className="min-w-0 flex-1 truncate text-sm hover:text-[var(--becpg-orange)]"
                                            >
                                                {entry.name}
                                                {entry.code ? (
                                                    <span className="text-xs text-[var(--becpg-dark-grey)]">
                                                        {' '}
                                                        {entry.code}
                                                    </span>
                                                ) : null}
                                            </Link>
                                            {entry.state ? <StatusPill status={entry.state} size="sm" /> : null}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </div>

                    {/* -------------------------------- campaigns and activity */}
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
                        <Card title={local.projects.title} icon="campaign" index={0}>
                            {projects.length === 0 ? (
                                <EmptyState compact title={local.projects.empty} />
                            ) : (
                                <ul className="flex flex-col gap-3">
                                    {projects.map((project) => (
                                        <li key={project.nodeRef}>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {/* No page per campaign exists: the link leads
                                                    to the list already filtered on this project,
                                                    which is the closest thing to "opening the
                                                    campaign" without inventing a route. */}
                                                <Link
                                                    href={`/monitor/campaigns?q=${encodeURIComponent(project.name || '')}`}
                                                    className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--becpg-blue)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                                                >
                                                    {project.name}
                                                </Link>
                                                {project.state ? (
                                                    <StatusPill status={project.state} size="sm" />
                                                ) : null}
                                                {project.isLate ? (
                                                    <span className="pill pill-danger pill-sm pill-no-dot">
                                                        <Icon name="alarm" size={12} />
                                                        {local.projects.late}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="mt-1">
                                                <GaugeBar
                                                    value={project.completion}
                                                    size="sm"
                                                    ariaLabel={project.name}
                                                />
                                            </div>
                                            <p className="mt-0.5 text-xs text-[var(--becpg-dark-grey)]">
                                                {project.manager
                                                    ? fill(local.projects.manager, {
                                                        name: project.manager.label
                                                            || project.manager.username,
                                                    })
                                                    : null}
                                                {project.dueDate
                                                    ? ` · ${fill(local.projects.due, {
                                                        date: formatDate(project.dueDate, lang),
                                                    })}`
                                                    : ''}
                                                {project.unanswered
                                                    ? ` · ${fill(local.projects.unanswered, {
                                                        days: project.ageDays,
                                                    })}`
                                                    : ''}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>

                        <Card
                            title={local.activity.title}
                            subtitle={local.activity.subtitle}
                            icon="history"
                            index={1}
                        >
                            {data.activity.length === 0 ? (
                                <EmptyState compact title={local.activity.empty} />
                            ) : (
                                <ol className="flex flex-col gap-2.5">
                                    {data.activity.map((entry, index) => (
                                        <li
                                            key={entry.nodeRef || `${entry.date}-${index}`}
                                            className="flex gap-2"
                                        >
                                            <span
                                                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                                    entry.kind === 'message'
                                                        ? 'bg-[var(--status-info-bg)] text-[var(--status-info)]'
                                                        : 'bg-[var(--becpg-grey)] text-[var(--becpg-blue)]'
                                                }`}
                                            >
                                                <Icon
                                                    name={entry.kind === 'message' ? 'forum' : 'bolt'}
                                                    size={14}
                                                />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="flex flex-wrap items-baseline gap-1.5 text-xs">
                                                    <span className="font-medium">
                                                        {entry.type
                                                            || (entry.kind === 'message'
                                                                ? local.activity.message
                                                                : local.activity.activity)}
                                                    </span>
                                                    {entry.user ? (
                                                        <span className="text-[var(--becpg-dark-grey)]">
                                                            {entry.user}
                                                        </span>
                                                    ) : null}
                                                    <span className="text-[var(--becpg-dark-grey)] tabular-nums">
                                                        {formatDateTime(entry.date, lang)}
                                                    </span>
                                                </span>
                                                {entry.excerpt ? (
                                                    <span className="mt-0.5 block break-words text-xs text-[var(--becpg-dark-grey)]">
                                                        {entry.excerpt}
                                                    </span>
                                                ) : null}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </Card>
                    </div>
                </>
            )}
        </AppShell>
    );
}
