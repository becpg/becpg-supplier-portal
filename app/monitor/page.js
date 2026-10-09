'use client';

/**
 * `/monitor` — the overview of the supplier park (spec §4.6.1).
 *
 * This is the screen a quality officer opens every morning, and the reason this
 * lot exists: beCPG holds every figure below and restitutes none of them today,
 * so the referent has to open project after project in Share to know where the
 * park stands (spec §2.2, §2.3). Tracklab and Specright sell *this* screen first.
 *
 * ## Anatomy
 *
 * ```
 *  ProfileSwitcher (§4.6.5)      ← same data, four readings
 *  MonitorFilters (§4.6.1)       ← famille / site / acheteur / marché, in the URL
 *  ParkStats                     ← the eight header cards + park & expiry panels
 *  RiskList                      ← top 10 at risk: the reason AND the action
 * ```
 *
 * Everything comes from **one** call, `GET /api/v1/monitor/overview`: ~19 db-afts
 * queries whatever the size of the park, memoised 30 s per user and filter set.
 * Nothing on this page recomputes a number the API returned — a figure shown here
 * and a figure exported from the API can never disagree.
 *
 * ## Two design rules worth stating
 *
 *  - **The action is one click from the reason.** `RiskList` renders only the
 *    actions a supplier's reasons justify, intersected with the actions this
 *    instance actually offers (`GET /monitor/actions`); the irreversible one
 *    (*suspendre*, which starts a real beCPG process) goes through an explicit
 *    danger confirmation that says what will happen.
 *  - **Filters live in the URL.** "here is my organic park that never answered"
 *    is a link, which is what makes this screen usable in a weekly review. The
 *    typed value is debounced before it becomes a query (`useDebouncedValue`).
 */

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell, PageHeader } from '@/components/shell/AppShell';
import { Button, Icon } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/EmptyState';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { StatGrid } from '@/components/ui/StatCard';
import { ParkStats } from '@/components/monitor/ParkStats';
import { RiskList } from '@/components/monitor/RiskList';
import { ProfileSwitcher } from '@/components/monitor/ProfileSwitcher';
import { HistoryPanel } from '@/components/monitor/HistoryPanel';
import { WindowNotice } from '@/components/monitor/WindowNotice';
import {
    EMPTY_MONITOR_FILTERS,
    MonitorFilters,
    monitorFilterParams,
    monitorFilterQuery,
    readMonitorFilters,
    useDebouncedValue,
} from '@/components/monitor/MonitorFilters';
import { formatDateTime, formatTotal } from '@/lib/format';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('app/monitor/page#LABELS', {
    fr: {
        title: 'Pilotage du parc fournisseurs',
        description:
            'Agrément, conformité documentaire, expirations, projets et non-conformités de votre parc, en temps réel.',
        generatedAt: 'Données au {time}',
        openList: 'Voir la liste complète',
        openDocuments: 'Conformité documentaire',
        openCampaigns: 'Projets',
        openQuality: 'Non-conformités',
        truncatedShort: 'Fenêtre : {scanned} fournisseurs lus',
        truncated:
            'Parc plus large que la fenêtre d’analyse : {scanned} fournisseurs lus sur {total}. Les compteurs marqués « ≈ » sont plafonnés ; la répartition et le top 10 portent sur la fenêtre.',
    },
    en: {
        title: 'Supplier park monitoring',
        description:
            'Approval, document compliance, expiries, projects and non-conformities of your park, in real time.',
        generatedAt: 'Data as of {time}',
        openList: 'See the full list',
        openDocuments: 'Document compliance',
        openCampaigns: 'Projects',
        openQuality: 'Non-conformities',
        truncatedShort: 'Window: {scanned} suppliers read',
        truncated:
            'Park larger than the scan window: {scanned} suppliers read out of {total}. Counters marked “≈” are capped; the breakdown and the top 10 cover the window.',
    },
});

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]));
}

/** The header-card skeleton: eight tiles and two panels, same geometry. */
function OverviewSkeleton() {
    return (
        <div>
            <StatGrid columns={4}>
                {Array.from({ length: 8 }, (_, index) => (
                    <SkeletonCard key={index} lines={2} />
                ))}
            </StatGrid>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
                <SkeletonCard lines={4} />
                <SkeletonCard lines={4} />
            </div>
            <Skeleton height={220} radius="0.75rem" className="mt-3" />
        </div>
    );
}

/**
 * The screen. Split out of the default export so `useSearchParams` sits under a
 * `<Suspense>` boundary.
 *
 * @returns {JSX.Element}
 */
function MonitorOverviewScreen() {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    const searchParams = useSearchParams();

    /*
     * The URL is the shareable state; it seeds the local one and re-seeds it when
     * another screen navigates here already filtered. Adjusted during render
     * rather than in an effect (the pattern `useApi` and `AppShell` use too).
     *
     * `seed` IS THE URL KEY AND NOTHING ELSE. It used to be recomputed from the
     * local values, so the first keystroke made it differ from the URL and the
     * test below read that as "another screen navigated here" — the filters were
     * reset to the URL on the very render that carried the typed character. The
     * search box took nothing and no select ever held a value.
     */
    const urlFilters = readMonitorFilters(searchParams);
    const urlKey = monitorFilterQuery(urlFilters);
    const [filters, setFilters] = useState({ seed: urlKey, values: urlFilters });
    if (filters.seed !== urlKey) {
        setFilters({ seed: urlKey, values: urlFilters });
    }

    const patch = useCallback(
        (values) =>
            setFilters((previous) => ({
                seed: previous.seed,
                values: { ...previous.values, ...values },
            })),
        [],
    );
    const reset = useCallback(
        () => setFilters((previous) => ({
            seed: previous.seed,
            values: { ...EMPTY_MONITOR_FILTERS },
        })),
        [],
    );

    // Typing is instant, querying is not: `q` is a real db-afts clause.
    const queried = useDebouncedValue(filters.values, 350);
    const params = useMemo(() => monitorFilterParams(queried), [queried]);
    const query = useMemo(() => monitorFilterQuery(queried), [queried]);

    const overview = useApi('monitor/overview', { params });
    const data = overview.data;
    const payloadFilters = (data && data.filters) || {};

    return (
        <AppShell ownHeading
            fullWidth
            space="monitor"
            title={local.title}
            badges={{ nc: (data && data.nonConformities && data.nonConformities.open) || 0 }}
        >
            <PageHeader
                title={local.title}
                description={local.description}
                actions={
                    <div className="flex flex-col items-end gap-1">
                        <ProfileSwitcher compact />
                        {data && data.park && data.park.truncated ? (
                            <WindowNotice
                                label={fill(local.truncatedShort, { scanned: data.park.scanned })}
                                detail={fill(local.truncated, {
                                    scanned: data.park.scanned,
                                    // A floor when the counter could not reach the end of the park.
                                    total: formatTotal(
                                        { total: data.park.total, exact: data.park.exact !== false },
                                        lang,
                                    ).label,
                                })}
                            />
                        ) : null}
                        {data ? (
                            <span className="text-[11px] text-[var(--becpg-dark-grey)]">
                                {fill(local.generatedAt, {
                                    time: formatDateTime(data.generatedAt, lang) || '—',
                                })}
                            </span>
                        ) : null}
                    </div>
                }
            />

            <MonitorFilters
                className="mb-4"
                filters={filters.values}
                onChange={patch}
                onReset={reset}
                applied={payloadFilters.applied || []}
                unsupported={payloadFilters.unsupported || []}
            />


            {overview.error ? (
                <ErrorState error={overview.error} onRetry={overview.refresh} />
            ) : !data ? (
                <OverviewSkeleton />
            ) : (
                <>
                    <ParkStats overview={data} query={query} />

                    <RiskList
                        className="mt-3 sm:mt-4"
                        items={data.topRisk || []}
                        onRefresh={overview.refresh}
                    />

                    {/* The four screens the cards drill into, reachable without
                        going through a card — the same filters travel along. */}
                    <nav className="mt-3 flex flex-wrap gap-2" aria-label={local.openList}>
                        <Button
                            variant="outline"
                            size="sm"
                            icon="groups"
                            href={`/monitor/suppliers${query ? `?${query}` : ''}`}
                        >
                            {local.openList}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            icon="fact_check"
                            href={`/monitor/documents${query ? `?${query}` : ''}`}
                        >
                            {local.openDocuments}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            icon="campaign"
                            href={`/monitor/campaigns${query ? `?${query}` : ''}`}
                        >
                            {local.openCampaigns}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            icon="report_problem"
                            href={`/monitor/quality${query ? `?${query}` : ''}`}
                        >
                            {local.openQuality}
                        </Button>
                    </nav>

                    <HistoryPanel className="mt-4" series="taskTrend" />
                </>
            )}
        </AppShell>
    );
}

/**
 * @returns {JSX.Element}
 */
export default function MonitorOverviewPage() {
    return (
        <Suspense
            fallback={
                <AppShell space="monitor" fullWidth>
                    <OverviewSkeleton />
                </AppShell>
            }
        >
            <MonitorOverviewScreen />
        </Suspense>
    );
}
