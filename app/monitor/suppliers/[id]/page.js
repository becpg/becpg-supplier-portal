'use client';

/**
 * `/monitor/suppliers/[id]` - the steering sheet of one supplier (spec §4.6.2).
 *
 * One call, `GET /api/v1/monitor/suppliers/{nodeRef}`, brings the sheet; the
 * yearly activity comes apart from the decision module, so a slow cube never
 * holds the sheet back. A nodeRef outside the caller's perimeter answers 404.
 *
 * Laid out to answer three questions in order: why this status (the verdict and
 * the rule ladder), how risky (the score and its reasons), and what is behind
 * each figure (six counters, each opening the tab that lists its rows).
 */

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { Button, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { Tooltip } from '@/components/ui/Tooltip';
import { RISK_LEVELS } from '@/components/monitor/RiskList';
import { useListExport } from '@/components/ui/useListExport';
import { CampaignList } from '@/components/monitor/CampaignList';
import { NonConformityList } from '@/components/monitor/NonConformityList';
import { StartCampaignDialog } from '@/components/monitor/StartCampaignDialog';
import { CockpitTabs } from '@/components/monitor/cockpit/CockpitTabs';
import { SourcePill } from '@/components/monitor/cockpit/parts';
import { SupplierBand } from '@/components/monitor/supplier/SupplierBand';
import { StatusLadder } from '@/components/monitor/supplier/StatusLadder';
import { RiskScore } from '@/components/monitor/supplier/RiskScore';
import { ActivityChart, latestDelay } from '@/components/monitor/supplier/ActivityChart';
import { ActivityTimeline, DocumentTable, ProductTable, SubSupplierTable } from '@/components/monitor/supplier/SheetLists';
import { routeParamId, useApi } from '@/lib/client';
import { formatNumber } from '@/lib/format';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('app/monitor/suppliers/[id]/page#LABELS', {
    fr: {
        back: 'Fournisseurs',
        notFound: 'Fournisseur introuvable',
        notFoundHint: 'Ce fournisseur n’existe pas, ou il est hors de votre périmètre.',
        tiles: {
            label: 'Indicateurs du fournisseur',
            nc: 'NC bloquantes',
            ncHint: 'ouvertes',
            projects: 'Projets en cours',
            projectsHint: '{count} sans réponse',
            documents: 'Documents obligatoires',
            documentsHint: '{expired} expiré(s) · {missing} manquant(s)',
            documentsNone: 'aucun attendu',
            products: 'Produits',
            productsHint: 'rattachés',
            delay: 'Délai de réponse',
            delayHint: 'moyenne {period}',
            delayNone: 'module décisionnel',
            completion: 'Complétude',
            completionHint: '{count} catalogue(s) actif(s)',
            completionNone: 'aucun catalogue actif',
            days: 'j',
        },
        tabs: {
            label: 'Fiche fournisseur',
            overview: 'Vue d’ensemble',
            nc: 'Non-conformités',
            projects: 'Projets',
            documents: 'Documents',
            products: 'Produits',
            subSuppliers: 'Sous-fournisseurs',
            history: 'Historique',
        },
        status: 'Statut d’agrément',
        statusHelp: 'Le statut est calculé à chaque affichage, jamais stocké : la première règle vérifiée l’emporte.',
        risk: 'Score de risque',
        riskHelp: 'Chaque motif ajoute son poids ; une occurrence de plus ajoute un bonus dégressif.',
        riskFrom: 'à partir de {from}',
        reasonNames: {
            documentExpired: 'Document expiré',
            blockingNc: 'NC bloquante',
            campaignNoAnswer: 'Projet sans réponse',
            scoreDropping: 'Score en baisse',
            documentExpiring: 'Document expirant',
            lateTask: 'Tâche en retard',
            lowCompletion: 'Complétude faible',
            documentMissing: 'Document manquant',
            openNc: 'NC ouverte',
        },
        activity: 'Activité et réactivité',
        activityHelp: 'Tâches confiées au fournisseur et délai de réponse moyen, par année, lus dans le module décisionnel.',
        identity: 'Identité',
        identityRows: {
            code: 'Code',
            erpCode: 'Code ERP',
            legalName: 'Raison sociale',
            state: 'État beCPG',
            family: 'Famille',
            subFamily: 'Sous-famille',
            sites: 'Sites',
            subsidiaries: 'Filiales',
            parent: 'Fournisseur parent',
            catalogs: 'Catalogues actifs',
        },
        scorecard: 'Notation',
        scorecardHelp: 'Moyenne pondérée des critères notés sur les derniers projets du fournisseur.',
        allNc: 'Toutes ses NC',
        exchanges: 'Échanges',
        ncFile: 'nc-fournisseur',
        projectsFile: 'projets-fournisseur',
        none: '—',
    },
    en: {
        back: 'Suppliers',
        notFound: 'Supplier not found',
        notFoundHint: 'This supplier does not exist, or it is outside your perimeter.',
        tiles: {
            label: 'Supplier indicators',
            nc: 'Blocking NCs',
            ncHint: 'open',
            projects: 'Projects in progress',
            projectsHint: '{count} without answer',
            documents: 'Mandatory documents',
            documentsHint: '{expired} expired · {missing} missing',
            documentsNone: 'none expected',
            products: 'Products',
            productsHint: 'linked',
            delay: 'Response delay',
            delayHint: '{period} mean',
            delayNone: 'decision module',
            completion: 'Completeness',
            completionHint: '{count} active catalog(s)',
            completionNone: 'no active catalog',
            days: 'd',
        },
        tabs: {
            label: 'Supplier sheet',
            overview: 'Overview',
            nc: 'Non-conformities',
            projects: 'Projects',
            documents: 'Documents',
            products: 'Products',
            subSuppliers: 'Sub-suppliers',
            history: 'History',
        },
        status: 'Approval status',
        statusHelp: 'The status is derived on every view, never stored: the first rule met wins.',
        risk: 'Risk score',
        riskHelp: 'Each reason adds its weight; a further occurrence adds a decreasing bonus.',
        riskFrom: 'from {from}',
        reasonNames: {
            documentExpired: 'Expired document',
            blockingNc: 'Blocking NC',
            campaignNoAnswer: 'Project without answer',
            scoreDropping: 'Score dropping',
            documentExpiring: 'Expiring document',
            lateTask: 'Late task',
            lowCompletion: 'Low completeness',
            documentMissing: 'Missing document',
            openNc: 'Open NC',
        },
        activity: 'Activity and responsiveness',
        activityHelp: 'Tasks given to the supplier and mean response delay, per year, read from the decision module.',
        identity: 'Identity',
        identityRows: {
            code: 'Code',
            erpCode: 'ERP code',
            legalName: 'Legal name',
            state: 'beCPG state',
            family: 'Family',
            subFamily: 'Sub-family',
            sites: 'Sites',
            subsidiaries: 'Subsidiaries',
            parent: 'Parent supplier',
            catalogs: 'Active catalogs',
        },
        scorecard: 'Scorecard',
        scorecardHelp: 'Weighted mean of the criteria scored on the supplier’s latest projects.',
        allNc: 'All its NCs',
        exchanges: 'Exchanges',
        ncFile: 'supplier-ncs',
        projectsFile: 'supplier-projects',
        none: '—',
    },
});

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) => (vars[key] ?? match));
}

/** A tab label with its count, the count also spoken. */
function TabBadge({ count, tone = 'neutral' }) {
    if (typeof count !== 'number') {
        return null;
    }
    return (
        <span className={`ms-0.5 rounded-full px-1.5 text-[11px] leading-[18px] tabular-nums ${
            tone === 'danger' && count > 0
                ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger)]'
                : 'bg-[var(--becpg-grey)] text-[var(--becpg-ink)]'
        }`}
        >
            {count}
        </span>
    );
}

function CardTitle({ title, help }) {
    return (
        <span className="flex items-center gap-1.5">
            {title}
            {help ? <Tooltip content={help} label={title} maxWidth={320} /> : null}
        </span>
    );
}

/** How the risk score is built, from the weights and thresholds the server used. */
function RiskHelp({ risk, local, lang }) {
    const weights = Object.entries(risk?.weights || {})
        .filter(([code, weight]) => weight > 0 && local.reasonNames[code])
        .sort(([, a], [, b]) => b - a);
    const levels = (risk?.levels || []).filter((entry) => entry.from > 0 && RISK_LEVELS[entry.level]);
    return (
        <span className="flex flex-col gap-1.5">
            <span>{local.riskHelp}</span>
            <span className="grid grid-cols-[1fr_auto] gap-x-3">
                {weights.map(([code, weight]) => (
                    <span key={code} className="contents">
                        <span>{local.reasonNames[code]}</span>
                        <span className="text-end tabular-nums">{weight}</span>
                    </span>
                ))}
            </span>
            <span>
                {levels.map((entry) => `${pickLabels(RISK_LEVELS[entry.level], lang)} ${fill(local.riskFrom, { from: entry.from })}`).join(' · ')}
            </span>
        </span>
    );
}

function Tiles({ sheet, history, local, lang, onOpen }) {
    const tiles = local.tiles;
    const metrics = sheet.approval.metrics || {};
    const summary = sheet.documents.summary;
    const delay = latestDelay(history.data);
    const catalogs = sheet.completion?.catalogs || [];
    const unanswered = sheet.projects.filter((row) => row.unanswered).length;
    const expired = metrics.documentsExpired || 0;
    const missing = metrics.documentsMissing || 0;
    const mandatory = summary?.mandatory || 0;
    const blocking = sheet.nonConformities.length;

    return (
        <div role="group" aria-label={tiles.label} className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <StatCard index={0} label={tiles.nc} value={blocking} icon="report_problem" tone={blocking > 0 ? 'danger' : 'ok'} hint={tiles.ncHint} onClick={() => onOpen('nc')} />
            <StatCard
                index={1}
                label={tiles.projects}
                value={sheet.projects.length}
                icon="campaign"
                tone={unanswered > 0 ? 'warn' : 'info'}
                hint={fill(tiles.projectsHint, { count: unanswered })}
                onClick={() => onOpen('projects')}
            />
            <StatCard
                index={2}
                label={tiles.documents}
                value={mandatory > 0 ? `${summary.mandatorySatisfied || 0}/${mandatory}` : 0}
                icon="fact_check"
                tone={expired > 0 ? 'danger' : missing > 0 ? 'warn' : 'ok'}
                hint={mandatory > 0 ? fill(tiles.documentsHint, { expired, missing }) : tiles.documentsNone}
                onClick={() => onOpen('documents')}
            />
            <StatCard index={3} label={tiles.products} value={sheet.products.length} icon="inventory_2" tone="info" hint={tiles.productsHint} onClick={() => onOpen('products')} />
            <StatCard
                index={4}
                label={tiles.delay}
                value={delay ? formatNumber(delay.value, lang, { maximumFractionDigits: 0 }) : '—'}
                unit={delay ? tiles.days : undefined}
                icon="schedule"
                tone="neutral"
                loading={history.loading}
                hint={delay ? fill(tiles.delayHint, { period: delay.label }) : tiles.delayNone}
                onClick={() => onOpen('history')}
            />
            <StatCard
                index={5}
                label={tiles.completion}
                value={typeof sheet.completion?.score === 'number' ? sheet.completion.score : '—'}
                unit={typeof sheet.completion?.score === 'number' ? '%' : undefined}
                icon="donut_large"
                tone="info"
                hint={catalogs.length > 0 ? fill(tiles.completionHint, { count: catalogs.length }) : tiles.completionNone}
                onClick={() => onOpen('overview')}
            />
        </div>
    );
}

function labelsOf(entries) {
    return (entries || []).map((entry) => entry?.label || entry?.name).filter(Boolean).join(', ');
}

function IdentityCard({ sheet, local }) {
    const { supplier } = sheet;
    const rows = local.identityRows;
    const definitions = [
        [rows.code, supplier.code],
        [rows.erpCode, supplier.erpCode],
        [rows.legalName, supplier.legalName !== supplier.name ? supplier.legalName : null],
        [rows.state, supplier.state ? <StatusPill status={supplier.state} size="sm" /> : null],
        [rows.family, supplier.family?.label],
        [rows.subFamily, supplier.subFamily?.label],
        [rows.sites, labelsOf(supplier.sites)],
        [rows.subsidiaries, labelsOf(supplier.subsidiaries)],
        [rows.parent, supplier.parent ? (
            <Link href={`/monitor/suppliers/${encodeURIComponent(supplier.parent.nodeRef)}`} className="text-[var(--becpg-blue)] hover:underline">
                {supplier.parent.label || supplier.parent.nodeRef}
            </Link>
        ) : null],
        [rows.catalogs, labelsOf(sheet.completion?.catalogs)],
    ];
    return (
        <Card title={local.identity} icon="badge" animate={false} className="col-span-12 xl:col-span-4">
            <dl className="grid grid-cols-[minmax(7rem,9rem)_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
                {definitions.map(([term, value]) => (
                    <div key={term} className="contents">
                        <dt className="text-[var(--becpg-muted)]">{term}</dt>
                        <dd className={value ? 'min-w-0 break-words font-medium' : 'text-[var(--becpg-muted)]'}>{value || local.none}</dd>
                    </div>
                ))}
            </dl>
        </Card>
    );
}

function ScorecardCard({ scorecard, local, lang }) {
    if (!scorecard?.available) {
        return null;
    }
    const scored = scorecard.criteria.filter((entry) => entry.score !== null);
    return (
        <Card
            title={<CardTitle title={local.scorecard} help={local.scorecardHelp} />}
            icon="grading"
            animate={false}
            className="col-span-12"
            actions={typeof scorecard.score === 'number' ? (
                <span className="text-2xl font-light tabular-nums">{formatNumber(scorecard.score, lang)}</span>
            ) : null}
        >
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
                {scored.map((entry) => (
                    <li key={entry.nodeRef} className="flex items-center gap-2 text-sm">
                        <span className="min-w-0 flex-1 truncate" title={entry.criterion}>{entry.criterion}</span>
                        <span className="tabular-nums font-medium">{formatNumber(entry.score, lang)}</span>
                    </li>
                ))}
            </ul>
        </Card>
    );
}

function Overview({ sheet, history, local, lang, onOpen }) {
    return (
        <div className="grid grid-cols-12 gap-4">
            <Card title={<CardTitle title={local.status} help={local.statusHelp} />} icon="rule" animate={false} className="col-span-12 xl:col-span-7">
                <StatusLadder
                    approval={sheet.approval}
                    nonConformities={sheet.nonConformities}
                    projects={sheet.projects}
                    onOpenTab={onOpen}
                />
            </Card>
            <Card title={<CardTitle title={local.risk} help={<RiskHelp risk={sheet.risk} local={local} lang={lang} />} />} icon="trending_up" animate={false} className="col-span-12 xl:col-span-5">
                <RiskScore risk={sheet.risk} />
            </Card>
            <Card
                title={<CardTitle title={local.activity} help={local.activityHelp} />}
                icon="show_chart"
                animate={false}
                className="col-span-12 xl:col-span-8"
                actions={<SourcePill />}
            >
                {history.loading ? <SkeletonCard lines={4} /> : <ActivityChart history={history.data} />}
            </Card>
            <IdentityCard sheet={sheet} local={local} />
            <ScorecardCard scorecard={sheet.scorecard} local={local} lang={lang} />
        </div>
    );
}

function SheetTabs({ sheet, history, local, lang, active, onOpen, onRefresh }) {
    const ncExport = useListExport({ rows: sheet.nonConformities, filename: local.ncFile });
    const projectExport = useListExport({ rows: sheet.projects, filename: local.projectsFile });
    const activityBlock = sheet.blocks.activity?.available === false || sheet.blocks.comments?.available === false
        ? { available: false }
        : sheet.blocks.activity;

    const tabs = [
        { id: 'overview', label: local.tabs.overview, icon: 'dashboard', render: () => <Overview sheet={sheet} history={history} local={local} lang={lang} onOpen={onOpen} /> },
        {
            id: 'nc',
            label: local.tabs.nc,
            icon: 'report_problem',
            badge: <TabBadge count={sheet.nonConformities.length} tone="danger" />,
            render: () => (
                <NonConformityList
                    items={sheet.nonConformities}
                    onExport={ncExport.onExport}
                    exporting={ncExport.exporting}
                    actions={(
                        <Button variant="outline" size="sm" icon="open_in_new" href={`/monitor/quality?q=${encodeURIComponent(sheet.supplier.name)}&includeClosed=true`}>
                            {local.allNc}
                        </Button>
                    )}
                />
            ),
        },
        {
            id: 'projects',
            label: local.tabs.projects,
            icon: 'campaign',
            badge: <TabBadge count={sheet.projects.length} />,
            render: () => <CampaignList items={sheet.projects} onExport={projectExport.onExport} exporting={projectExport.exporting} />,
        },
        {
            id: 'documents',
            label: local.tabs.documents,
            icon: 'fact_check',
            badge: <TabBadge count={sheet.documents.items.length} />,
            render: () => <DocumentTable items={sheet.documents.items} block={sheet.blocks.documents} onRetry={onRefresh} />,
        },
        {
            id: 'products',
            label: local.tabs.products,
            icon: 'inventory_2',
            badge: <TabBadge count={sheet.products.length} />,
            render: () => <ProductTable items={sheet.products} block={sheet.blocks.products} onRetry={onRefresh} />,
        },
        // A group reads differently from one of its sites: its sub-suppliers get
        // a tab of their own, which a supplier without any does not show.
        ...(sheet.subSuppliers.length > 0 ? [{
            id: 'subSuppliers',
            label: local.tabs.subSuppliers,
            icon: 'account_tree',
            badge: <TabBadge count={sheet.subSuppliers.length} />,
            render: () => <SubSupplierTable items={sheet.subSuppliers} />,
        }] : []),
        {
            id: 'history',
            label: local.tabs.history,
            icon: 'history',
            render: () => (
                <div className="grid grid-cols-12 gap-4">
                    <Card title={<CardTitle title={local.activity} help={local.activityHelp} />} icon="show_chart" animate={false} className="col-span-12 xl:col-span-7" actions={<SourcePill />}>
                        {history.loading ? <SkeletonCard lines={4} /> : <ActivityChart history={history.data} />}
                    </Card>
                    <Card title={local.exchanges} icon="forum" animate={false} className="col-span-12 xl:col-span-5">
                        <ActivityTimeline items={sheet.activity} block={activityBlock} onRetry={onRefresh} />
                    </Card>
                </div>
            ),
        },
    ];
    return <CockpitTabs tabs={tabs} label={local.tabs.label} active={active} onSelect={onOpen} storageKey={null} />;
}

/**
 * @returns {JSX.Element}
 */
export default function MonitorSupplierSheetPage() {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    const id = routeParamId(useParams().id);
    const sheet = useApi(id ? `monitor/suppliers/${encodeURIComponent(id)}` : null);
    const history = useApi(id ? 'monitor/history' : null, { params: { series: 'taskTrend', supplier: id } });
    const [tab, setTab] = useState('overview');
    const [startingProject, setStartingProject] = useState(false);
    const data = sheet.data;

    const back = (
        <Link href="/monitor/suppliers" className="inline-flex items-center gap-1 text-[var(--becpg-blue-light)] hover:text-[var(--becpg-orange-deep)]">
            <Icon name="chevron_left" size={14} />
            {local.back}
        </Link>
    );

    if (sheet.error) {
        return (
            <AppShell space="monitor" title={local.back} breadcrumb={back}>
                {sheet.error.isNotFound ? (
                    <EmptyState variant="error" icon="person_off" title={local.notFound} message={local.notFoundHint} actionLabel={local.back} actionHref="/monitor/suppliers" />
                ) : (
                    <ErrorState error={sheet.error} onRetry={sheet.refresh} />
                )}
            </AppShell>
        );
    }

    const openTab = (next) => {
        setTab(next);
        document.getElementById('supplier-sheet-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <AppShell ownHeading fullWidth space="monitor" title={data?.supplier?.name || local.back} breadcrumb={back}>
            {!data ? (
                <div className="flex flex-col gap-4">
                    <SkeletonCard lines={3} />
                    <SkeletonCard lines={2} />
                    <SkeletonCard lines={6} />
                </div>
            ) : (
                <>
                    <SupplierBand sheet={data} onStartProject={() => setStartingProject(true)} onDone={sheet.refresh} />
                    <Tiles sheet={data} history={history} local={local} lang={lang} onOpen={openTab} />
                    <div id="supplier-sheet-tabs" className="scroll-mt-4">
                        <SheetTabs sheet={data} history={history} local={local} lang={lang} active={tab} onOpen={setTab} onRefresh={sheet.refresh} />
                    </div>
                    <StartCampaignDialog
                        open={startingProject}
                        onClose={() => setStartingProject(false)}
                        supplier={{ nodeRef: data.supplier.nodeRef, name: data.supplier.name }}
                        onStarted={sheet.refresh}
                    />
                </>
            )}
        </AppShell>
    );
}
