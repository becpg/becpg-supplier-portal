'use client';

/**
 * `/monitor/campaigns` — **les campagnes de référencement et de renouvellement
 * en cours, et leur taux de réponse** (spec §4.6.1 « campagnes en cours et taux
 * de réponse », §4.2).
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
import { AppShell } from '@/components/shell/AppShell';
import { Button, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { SearchInput, Select } from '@/components/ui/Field';
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

const LABELS = {
    fr: {
        title: 'Campagnes',
        subtitle:
            'Projets de référencement et de renouvellement ouverts. Sélectionnez des campagnes pour relancer ou escalader leurs fournisseurs.',
        refresh: 'Rafraîchir',
        stats: {
            open: 'Campagnes ouvertes',
            openState: 'Campagnes · {state}',
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
        allOpen: 'Toutes les campagnes ouvertes',
        state: 'État du projet',
        sortLabel: 'Trier par',
        sorts: {
            dueDate: 'Échéance la plus proche',
            completion: 'Taux de réponse croissant',
            age: 'Ouvertes depuis le plus longtemps',
            name: 'Nom',
        },
        searchSupplier: 'Filtrer par fournisseur',
        truncated:
            'Fenêtre d’analyse : {scanned} campagne(s) lue(s) sur {total} ouverte(s) — beCPG borne une liste à 250 lignes, et un filtre fournisseur restreint encore l’ensemble. Le tri et les totaux de cette page portent sur cette fenêtre.',
        unsupported:
            'Filtre(s) non pris en charge par le modèle beCPG standard : {names}. À paramétrer côté client.',
        pageOf: '{from}–{to} sur {total} campagnes',
        previous: 'Précédent',
        next: 'Suivant',
        rows: 'Lignes',
        reminder:
            'Votre campagne en cours sur le portail attend encore votre réponse. Merci de compléter les tâches qui vous sont assignées dès que possible.',
        hintTargets: 'Fournisseurs des campagnes sélectionnées',
        noteReminder:
            'beCPG ne journalise pas les relances : la colonne « Dernière relance » montre la dernière activité sur la campagne, le fait le plus proche réellement disponible. L’historique par état demanderait le cube OLAP (§4.6.6).',
    },
    en: {
        title: 'Campaigns',
        subtitle:
            'Open referencing and renewal projects. Select campaigns to remind or escalate their suppliers.',
        refresh: 'Refresh',
        stats: {
            open: 'Open campaigns',
            openState: 'Campaigns · {state}',
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
        allOpen: 'All open campaigns',
        state: 'Project state',
        sortLabel: 'Sort by',
        sorts: {
            dueDate: 'Earliest due date',
            completion: 'Lowest response rate',
            age: 'Open the longest',
            name: 'Name',
        },
        searchSupplier: 'Filter by supplier',
        truncated:
            'Scan window: {scanned} campaign(s) read out of {total} open — beCPG caps a listing at 250 rows, and a supplier filter narrows the set further. The sort and the totals on this page cover that window.',
        unsupported:
            'Filter(s) unsupported by the standard beCPG model: {names}. Configure them client side.',
        pageOf: '{from}–{to} of {total} campaigns',
        previous: 'Previous',
        next: 'Next',
        rows: 'Rows',
        reminder:
            'Your open campaign on the portal is still waiting for your answer. Please complete the tasks assigned to you as soon as possible.',
        hintTargets: 'Suppliers of the selected campaigns',
        noteReminder:
            'beCPG keeps no reminder log: the "Last reminder" column shows the last activity on the campaign, the closest fact actually available. Per-state history would require the OLAP cube (§4.6.6).',
    },
};

/** Server-side sort keys `listCampaigns()` implements. */
const SORTS = ['dueDate', 'completion', 'age', 'name'];

const PAGE_SIZES = [25, 50, 100];

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]),
    );
}

export default function MonitorCampaignsPage() {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;

    const [state, setState] = useState('');
    const [sort, setSort] = useState('dueDate');
    const [supplier, setSupplier] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [rowSelection, setRowSelection] = useState({});

    const params = useMemo(
        () => ({
            states: state || undefined,
            sort,
            q: supplier.trim() || undefined,
            page,
            pageSize,
        }),
        [state, sort, supplier, page, pageSize],
    );

    const campaigns = useApi('monitor/campaigns', { params });
    const data = campaigns.data;

    // Memoised so an empty answer keeps one stable `[]` identity — otherwise the
    // selection memo below would recompute on every render.
    const items = useMemo(() => (data && data.items) || [], [data]);
    const summary = (data && data.summary) || {};
    const pagination = (data && data.pagination) || { page: 1, pageSize, totalItems: 0 };
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

    const from = (pagination.page - 1) * pagination.pageSize + 1;
    const to = Math.min(pagination.page * pagination.pageSize, pagination.totalItems || 0);

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
            space="monitor"
            title={labels.title}
            actions={
                <Button
                    variant="outline"
                    size="sm"
                    icon="refresh"
                    label={labels.refresh}
                    onClick={campaigns.refresh}
                />
            }
        >
            <p className="mb-4 text-sm text-[var(--becpg-dark-grey)]">{labels.subtitle}</p>

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
                    value={summary.open || 0}
                    icon="campaign"
                    tone="info"
                    loading={campaigns.loading}
                    index={0}
                    hint={
                        summary.scanned && summary.scanned !== summary.open
                            ? fill(labels.hints.scanned, { count: summary.scanned })
                            : undefined
                    }
                />
                <StatCard
                    label={labels.stats.response}
                    value={summary.responseRate === undefined ? '—' : summary.responseRate}
                    unit="%"
                    icon="how_to_reg"
                    tone={
                        summary.responseRate === undefined
                            ? 'neutral'
                            : summary.responseRate >= 80
                              ? 'ok'
                              : summary.responseRate >= 50
                                ? 'warn'
                                : 'danger'
                    }
                    loading={campaigns.loading}
                    index={1}
                    hint={
                        summary.meanCompletion === undefined
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
            {pagination.truncated ? (
                <Card variant="accent" padding="sm" className="mb-3">
                    <p className="flex items-start gap-2 text-xs">
                        <Icon name="warning" size={16} className="mt-0.5 text-[var(--becpg-orange)]" />
                        <span>
                            {fill(labels.truncated, {
                                scanned: summary.scanned ?? pagination.totalItems ?? 0,
                                total: summary.open ?? pagination.totalItems ?? 0,
                            })}
                        </span>
                    </p>
                </Card>
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
                        <div className="min-w-[12rem]">
                            <SearchInput
                                value={supplier}
                                placeholder={labels.searchSupplier}
                                onChange={(value) => {
                                    setSupplier(value);
                                    resetView();
                                }}
                            />
                        </div>
                    </>
                }
            />

            {/* --------------------------------------------------- pagination */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--becpg-dark-grey)]">
                <p className="max-w-xl">{labels.noteReminder}</p>
                <div className="flex items-center gap-2">
                    <span className="tabular-nums">
                        {fill(labels.pageOf, {
                            from: pagination.totalItems ? from : 0,
                            to,
                            total: pagination.totalItems || 0,
                        })}
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
