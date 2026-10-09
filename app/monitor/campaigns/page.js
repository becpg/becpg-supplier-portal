'use client';

/**
 * `/monitor/campaigns` — the referencing and renewal campaigns in progress, and
 * their response rate (spec §4.6.1 « campagnes en cours et taux de réponse »,
 * §4.2).
 *
 * A campaign **is** a beCPG project (`pjt:project`). The portal adds no second
 * notion of campaign, no second notion of progress and no second reminder
 * channel: everything here is read from `GET /api/v1/monitor/campaigns`, which
 * builds the pipeline in ≈ 3 db-afts queries, and every action posts to
 * `POST /api/v1/monitor/actions`, which reuses beCPG's own mechanisms
 * (§4.6.7).
 *
 * What the screen adds on top of the endpoint:
 *
 *  - **the four figures a referencing officer opens the day with**: campaigns
 *    open, response rate, campaigns still silent, reminders due — and the number
 *    of escalations the §4.5 ladder now recommends;
 *  - **two filters that do different things, and say which**: the project state
 *    and the sort order are pushed to the server (they decide *which* campaigns
 *    come back and in *what* order); the search box of the table filters the
 *    loaded page (it is a reading filter, not a query);
 *  - **a selection that targets suppliers, not projects**: a bulk action always
 *    addresses a supplier, so selecting three campaigns relaunches the suppliers
 *    of those campaigns — deduplicated, and named in the confirmation dialog;
 *  - **honesty about the window**: beCPG clamps a listing query to 250 rows, so a
 *    pipeline larger than the scan window is reported (`truncated`) instead of
 *    being silently cut.
 */

import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell, PageHeader } from '@/components/shell/AppShell';
import { WindowNotice } from '@/components/monitor/WindowNotice';
import { Button, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { useListExport } from '@/components/ui/useListExport';
import { SEARCH_SLOT_CLASS, SearchInput, Select } from '@/components/ui/Field';
import { formatTotal } from '@/lib/format';
import { useMessages } from '@/lib/messages';
import { useApi } from '@/lib/client';
import {
    CAMPAIGN_CLOSED_STATES,
    CAMPAIGN_OPEN_STATES,
    CampaignList,
    campaignTargets,
    projectStateLabel,
} from '@/components/monitor/CampaignList';
import { BulkActionBar } from '@/components/monitor/BulkActionBar';
import { StartCampaignDialog } from '@/components/monitor/StartCampaignDialog';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('app/monitor/campaigns/page#LABELS', {
    fr: {
        title: 'Projets',
        subtitle:
            'Projets de référencement et de renouvellement ouverts. Sélectionnez des projets pour relancer ou escalader leurs fournisseurs.',
        stats: {
            open: 'Projets ouverts',
            openState: 'Projets · {state}',
            response: 'Taux de réponse',
            unanswered: 'Sans réponse',
            reminders: 'Relances en attente',
        },
        hints: {
            scanned: '{count} analysées',
            meanCompletion: 'Avancement moyen {value} %',
            escalations: '{count} à escalader',
            late: '{count} en retard',
            noEscalation: 'Aucune escalade requise',
            answered: '{count} ont répondu',
        },
        startCampaign: 'Démarrer un projet',
        allOpen: 'Tous les projets ouverts',
        state: 'État du projet',
        sortLabel: 'Trier par',
        sorts: {
            dueDate: 'Échéance la plus proche',
            completion: 'Taux de réponse croissant',
            age: 'Ouvertes depuis le plus longtemps',
            name: 'Nom',
        },
        searchSupplier: 'Filtrer par fournisseur',
        truncatedShort: 'Fenêtre : {scanned} projets lus',
        truncated:
            'Fenêtre d’analyse : beCPG borne une liste à 250 lignes et {scanned} projet(s) ont été lus. Le tri et les totaux de cette page portent sur cette fenêtre — affinez l’état ou le périmètre pour une vue complète.',
        scopeEmpty:
            'Aucun fournisseur ne correspond à ce périmètre. Aucun projet ne peut lui être rattaché : les compteurs ci-dessus sont des zéros de construction, pas des mesures.',
        parkScoped: 'Compteurs restreints au périmètre filtré ({count} fournisseur(s)).',
        noRate: 'Aucun projet à évaluer',
        unsupported:
            'Filtre(s) non pris en charge par le modèle beCPG standard : {names}. À paramétrer côté client.',
        pageOf: '{from}–{to} sur {total} projets',
        previous: 'Précédent',
        next: 'Suivant',
        rows: 'Lignes',
        reminder:
            'Votre projet en cours sur le portail attend encore votre réponse. Merci de compléter les tâches qui vous sont assignées dès que possible.',
        hintTargets: 'Fournisseurs des projets sélectionnés',
        noteReminder:
            'beCPG ne journalise pas les relances : la colonne « Dernière relance » montre la dernière activité sur le projet, le fait le plus proche réellement disponible.',
    },
    en: {
        title: 'Projects',
        subtitle:
            'Open referencing and renewal projects. Select projects to remind or escalate their suppliers.',
        stats: {
            open: 'Open projects',
            openState: 'Projects · {state}',
            response: 'Response rate',
            unanswered: 'No answer',
            reminders: 'Reminders due',
        },
        hints: {
            scanned: '{count} scanned',
            meanCompletion: 'Mean progress {value}%',
            escalations: '{count} to escalate',
            late: '{count} late',
            noEscalation: 'No escalation needed',
            answered: '{count} answered',
        },
        startCampaign: 'Start a project',
        allOpen: 'All open projects',
        state: 'Project state',
        sortLabel: 'Sort by',
        sorts: {
            dueDate: 'Earliest due date',
            completion: 'Lowest response rate',
            age: 'Open the longest',
            name: 'Name',
        },
        searchSupplier: 'Filter by supplier',
        truncatedShort: 'Window: {scanned} projects read',
        truncated:
            'Scan window: beCPG caps a listing at 250 rows and {scanned} project(s) were read. The sort and the totals on this page cover that window — narrow the state or the perimeter for a complete view.',
        scopeEmpty:
            'No supplier matches this perimeter. No project can be attached to it: the counters above are zeros by construction, not measurements.',
        parkScoped: 'Counters restricted to the filtered perimeter ({count} supplier(s)).',
        noRate: 'No project to score',
        unsupported:
            'Filter(s) unsupported by the standard beCPG model: {names}. Configure them client side.',
        pageOf: '{from}–{to} of {total} projects',
        previous: 'Previous',
        next: 'Next',
        rows: 'Rows',
        reminder:
            'Your open project on the portal is still waiting for your answer. Please complete the tasks assigned to you as soon as possible.',
        hintTargets: 'Suppliers of the selected projects',
        noteReminder:
            'beCPG keeps no reminder log: the "Last reminder" column shows the last activity on the project, the closest fact actually available.',
    },
});

/** Server-side sort keys `listCampaigns()` implements. */
const SORTS = ['dueDate', 'completion', 'age', 'name'];

const PAGE_SIZES = [25, 50, 100];

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]),
    );
}

export default function MonitorCampaignsPage() {
    // A campaign is started from this screen: this is where one notices that one is missing.
    const [starting, setStarting] = useState(false);
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);

    /*
     * `?q=` seeds the filter — the page becomes addressable.
     *
     * The filter only lived in local state, so no screen could point at a given
     * campaign: the supplier record listed « Campagnes et projets en cours »
     * without any row leading anywhere. There is no page per campaign, and
     * inventing a route for one would be worse; landing the user on the list
     * already filtered is what this page can do.
     */
    const searchParams = useSearchParams();
    const [state, setState] = useState('');
    const [sort, setSort] = useState('dueDate');
    const [supplier, setSupplier] = useState(() => searchParams.get('q') || '');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [rowSelection, setRowSelection] = useState({});

    const [focus, setFocus] = useState('');
    const params = useMemo(
        () => ({
            states: state || undefined,
            sort,
            q: supplier.trim() || undefined,
            focus: focus || undefined,
            page,
            pageSize,
        }),
        [state, sort, supplier, focus, page, pageSize],
    );

    const campaigns = useApi('monitor/campaigns', { params });
    const exportQuery = useMemo(() => {
        const { page: unusedPage, pageSize: unusedPageSize, ...rest } = params;
        return rest;
    }, [params]);
    const listExport = useListExport({ path: 'monitor/campaigns', query: exportQuery, filename: 'projets' });
    /** A tile is a filter: one click narrows the list to what it counts, a second one clears it. */
    const tileProps = (id) => ({
        onClick: () => {
            setFocus((current) => (current === id ? '' : id));
            setPage(1);
        },
        'aria-pressed': focus === id,
        badge: focus === id ? (
            <span className="pill pill-info pill-sm pill-no-dot"><Icon name="filter_alt" size={12} /></span>
        ) : null,
    });
    const data = campaigns.data;

    // Memoised so an empty answer keeps one stable `[]` identity — otherwise the
    // selection memo below would recompute on every render.
    const items = useMemo(() => (data && data.items) || [], [data]);
    const summary = (data && data.summary) || {};
    const pagination = (data && data.pagination) || {
        page: 1,
        pageSize,
        count: 0,
        totalItems: 0,
        totalAtLeast: 0,
        totalExact: true,
    };
    const filters = (data && data.filters) || {};

    // Any change of what is displayed drops the selection: escalating rows the
    // user can no longer see would be escalating blind. Done in the handlers,
    // never in an effect (an effect would fire after the dialog opened).
    const resetView = useCallback(() => {
        setPage(1);
        setRowSelection({});
    }, []);

    const goToPage = useCallback((updater) => {
        setPage(updater);
        setRowSelection({});
    }, []);

    const targets = useMemo(() => campaignTargets(items, rowSelection), [items, rowSelection]);

    // From the rows in hand, never from a total: `summary.open` is a *floor* when
    // `openExact` is false (beCPG could not count the campaigns — see `formatTotal`).
    const rowsOnPage = Number.isFinite(pagination.count) ? pagination.count : items.length;
    const from = rowsOnPage === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
    const to = (pagination.page - 1) * pagination.pageSize + rowsOnPage;
    const total = formatTotal(pagination, lang);
    const open = formatTotal({ total: summary.open, exact: summary.openExact !== false }, lang);
    // A configuration fact the API states, never inferred from `items.length === 0`:
    // the perimeter matched no supplier, which is why every tile reads 0.
    const scopeEmpty = Boolean(data && data.scope && data.scope.empty);
    // `null` is a real answer — "there is no campaign to score" — and must reach the
    // tile as an absence, never as a 0 % nor as the 100 % it used to invent.
    const hasRate = summary.responseRate !== null && summary.responseRate !== undefined;

    const stateOptions = useMemo(
        () => [
            { value: '', label: labels.allOpen },
            ...[...CAMPAIGN_OPEN_STATES, ...CAMPAIGN_CLOSED_STATES].map((value) => ({
                value,
                label: projectStateLabel(value, lang),
            })),
        ],
        [labels, lang],
    );

    return (
        <AppShell
            ownHeading
            fullWidth
            space="monitor"
            title={labels.title}
        >
            <StartCampaignDialog
                open={starting}
                onClose={() => setStarting(false)}
                onStarted={campaigns.refresh}
            />
            {/* `scanned` is the rows beCPG returned, not the rows left after the
                perimeter filter: the notice speaks of the engine's 250-row cap, so
                it must quote the engine's own figure. */}
            <PageHeader
                title={labels.title}
                description={labels.subtitle}
                actions={
                    <div className="flex items-center gap-2">
                        {pagination.truncated ? (
                            <WindowNotice
                                label={fill(labels.truncatedShort, { scanned: pagination.scanned ?? summary.scanned ?? total.value })}
                                detail={fill(labels.truncated, { scanned: pagination.scanned ?? summary.scanned ?? total.value })}
                            />
                        ) : null}
                        <Button size="sm" icon="rocket_launch" onClick={() => setStarting(true)}>
                            {labels.startCampaign}
                        </Button>
                    </div>
                }
            />

            {/* ------------------------------------------------------ KPI row */}
            <StatGrid columns={4} className="mb-4">
                <StatCard
                    label={
                        state
                            ? fill(labels.stats.openState, {
                                  state: projectStateLabel(state, lang),
                              })
                            : labels.stats.open
                    }
                    value={open.text}
                    icon="campaign"
                    tone="info"
                    loading={campaigns.loading}
                    index={0}
                    onClick={() => {
                        setFocus('');
                        setPage(1);
                    }}
                    aria-pressed={!focus}
                    hint={
                        summary.scanned && summary.scanned !== open.value
                            ? fill(labels.hints.scanned, { count: summary.scanned })
                            : undefined
                    }
                />
                <StatCard
                    label={labels.stats.response}
                    value={hasRate ? summary.responseRate : '—'}
                    unit={hasRate ? '%' : undefined}
                    icon="how_to_reg"
                    tone={
                        !hasRate
                            ? 'neutral'
                            : summary.responseRate >= 80
                              ? 'ok'
                              : summary.responseRate >= 50
                                ? 'warn'
                                : 'danger'
                    }
                    loading={campaigns.loading}
                    index={1}
                    {...tileProps('answered')}
                    hint={
                        !hasRate
                            ? labels.noRate
                            : summary.meanCompletion === undefined
                              ? undefined
                              : fill(labels.hints.meanCompletion, { value: summary.meanCompletion })
                    }
                />
                <StatCard
                    label={labels.stats.unanswered}
                    value={summary.unanswered || 0}
                    icon="hourglass_empty"
                    tone={summary.unanswered ? 'warn' : 'ok'}
                    loading={campaigns.loading}
                    index={2}
                    {...tileProps('unanswered')}
                    hint={
                        summary.escalations
                            ? fill(labels.hints.escalations, { count: summary.escalations })
                            : labels.hints.noEscalation
                    }
                />
                <StatCard
                    label={labels.stats.reminders}
                    value={summary.pendingReminders || 0}
                    icon="alarm"
                    tone={summary.pendingReminders ? 'danger' : 'ok'}
                    loading={campaigns.loading}
                    index={3}
                    {...tileProps('reminders')}
                    hint={
                        summary.late
                            ? fill(labels.hints.late, { count: summary.late })
                            : summary.answered
                              ? fill(labels.hints.answered, { count: summary.answered })
                              : undefined
                    }
                />
            </StatGrid>

            {/* ----------------------------------------------------- warnings */}
            {scopeEmpty ? (
                <Card variant="accent" padding="sm" className="mb-3">
                    <p className="flex items-start gap-2 text-xs">
                        <Icon name="info" size={16} className="mt-0.5 text-[var(--becpg-orange)]" />
                        <span>{labels.scopeEmpty}</span>
                    </p>
                </Card>
            ) : null}


            {/* The counters follow the perimeter — said out loud, so "248" on an
                unfiltered screen and "10" on a filtered one are not read as the
                same question answered twice. */}
            {summary.parkScoped && !scopeEmpty ? (
                <p className="mb-3 text-xs text-[var(--becpg-dark-grey)]">
                    {fill(labels.parkScoped, { count: (data && data.scope && data.scope.suppliers) || 0 })}
                </p>
            ) : null}

            {filters.unsupported && filters.unsupported.length > 0 ? (
                <p className="mb-3 text-xs text-[var(--becpg-dark-grey)]">
                    {fill(labels.unsupported, { names: filters.unsupported.join(', ') })}
                </p>
            ) : null}

            {/* -------------------------------------------------------- table */}
            <CampaignList
                items={items}
                loading={campaigns.loading}
                error={campaigns.error}
                onRetry={campaigns.refresh}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                enablePagination={false}
                toolbar={
                    <>
                        <div className={SEARCH_SLOT_CLASS}>
                            <SearchInput
                                value={supplier}
                                placeholder={labels.searchSupplier}
                                onChange={(value) => {
                                    setSupplier(value);
                                    resetView();
                                }}
                            />
                        </div>
                        <Select
                            value={state}
                            aria-label={labels.state}
                            className="min-w-[11rem]"
                            options={stateOptions}
                            onChange={(event) => {
                                setState(event.target.value);
                                resetView();
                            }}
                        />
                        <Select
                            value={sort}
                            aria-label={labels.sortLabel}
                            className="min-w-[13rem]"
                            options={SORTS.map((value) => ({
                                value,
                                label: labels.sorts[value] || value,
                            }))}
                            onChange={(event) => {
                                setSort(event.target.value);
                                resetView();
                            }}
                        />
                    </>
                }
                legend={labels.noteReminder}
                onExport={listExport.onExport}
                exporting={listExport.exporting}
            />

            {/* --------------------------------------------------- pagination */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--becpg-dark-grey)]">
                <span />
                <div className="flex items-center gap-2">
                    <span className="tabular-nums">
                        {fill(labels.pageOf, { from, to, total: total.text })}
                    </span>
                    <select
                        aria-label={labels.rows}
                        className="rounded-md border border-[var(--becpg-grey)] bg-white px-2 py-1 text-xs"
                        value={pageSize}
                        onChange={(event) => {
                            setPageSize(Number(event.target.value));
                            resetView();
                        }}
                    >
                        {PAGE_SIZES.map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                    <Button
                        variant="outline"
                        size="sm"
                        icon="chevron_left"
                        label={labels.previous}
                        disabled={pagination.page <= 1}
                        onClick={() => goToPage((value) => Math.max(1, value - 1))}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        icon="chevron_right"
                        label={labels.next}
                        disabled={!pagination.hasMoreItems}
                        onClick={() => goToPage((value) => value + 1)}
                    />
                </div>
            </div>

            {/* ------------------------------------------------- bulk actions */}
            {/* A campaign is not suspended — a supplier is, and on a quality
                fact, not on a silence. The bar therefore offers the two steps of
                the §4.5 ladder here: relancer, puis escalader. */}
            <BulkActionBar
                targets={targets}
                only={['remind', 'escalate']}
                defaultMessage={labels.reminder}
                hint={labels.hintTargets}
                onClear={() => setRowSelection({})}
                onDone={() => {
                    setRowSelection({});
                    campaigns.refresh();
                }}
            />
        </AppShell>
    );
}
