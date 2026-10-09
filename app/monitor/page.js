'use client';

/**
 * `/monitor` - the supplier park cockpit (spec §4.6.1).
 *
 * The screen a quality officer, a buyer, an R&D lead or a CSR manager opens every
 * morning: one tab per reading of the same park (Quality, Purchasing, R&D, CSR)
 * plus the priorities of the week. Everything comes from one call,
 * `GET /api/v1/monitor/cockpit`, which composes the adapters of the other
 * monitoring screens; nothing here recomputes a figure the API returned.
 *
 * Filters live in the URL, so "my organic park" is a link; the typed value is
 * debounced before it becomes a query.
 */

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell, PageHeader } from '@/components/shell/AppShell';
import { ErrorState } from '@/components/ui/EmptyState';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { WindowNotice } from '@/components/monitor/WindowNotice';
import {
    EMPTY_MONITOR_FILTERS,
    MonitorFilters,
    monitorFilterParams,
    monitorFilterQuery,
    readMonitorFilters,
    useDebouncedValue,
} from '@/components/monitor/MonitorFilters';
import { CockpitTabs } from '@/components/monitor/cockpit/CockpitTabs';
import { QualityTab } from '@/components/monitor/cockpit/QualityTab';
import { PurchasingTab } from '@/components/monitor/cockpit/PurchasingTab';
import { RndTab } from '@/components/monitor/cockpit/RndTab';
import { CsrTab } from '@/components/monitor/cockpit/CsrTab';
import { AssistantTab } from '@/components/monitor/cockpit/AssistantTab';
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
        truncatedShort: 'Fenêtre : {scanned} fournisseurs lus',
        truncated:
            'Parc plus large que la fenêtre d’analyse : {scanned} fournisseurs lus sur {total}. Les compteurs marqués « ≈ » sont plafonnés ; la répartition et le top 10 portent sur la fenêtre.',
        tablist: 'Lecture du parc',
        tabs: {
            quality: 'Qualité',
            purchasing: 'Achats',
            rnd: 'R&D',
            csr: 'RSE',
            assistant: 'Assistant',
        },
        ai: 'IA',
    },
    en: {
        title: 'Supplier park monitoring',
        description:
            'Approval, document compliance, expiries, projects and non-conformities of your park, in real time.',
        generatedAt: 'Data as of {time}',
        truncatedShort: 'Window: {scanned} suppliers read',
        truncated:
            'Park larger than the scan window: {scanned} suppliers read out of {total}. Counters marked “≈” are capped; the breakdown and the top 10 cover the window.',
        tablist: 'Park reading',
        tabs: {
            quality: 'Quality',
            purchasing: 'Purchasing',
            rnd: 'R&D',
            csr: 'CSR',
            assistant: 'Assistant',
        },
        ai: 'AI',
    },
});

/** The cockpit reads several screens' worth of data: its first load may take longer than a list. */
const COCKPIT_TIMEOUT_MS = 120000;
/** Debounce of the typed filters, in ms. */
const FILTER_DEBOUNCE_MS = 350;

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]));
}

/** The cockpit skeleton: the tab bar, a row of KPI cards and two chart cards. */
function CockpitSkeleton() {
    return (
        <div>
            <Skeleton height={40} className="mb-4" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => <SkeletonCard key={index} lines={2} />)}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2">
                <Skeleton height={320} radius="1rem" />
                <Skeleton height={320} radius="1rem" />
            </div>
        </div>
    );
}

/** The "AI" badge of the Assistant tab. */
function AiBadge({ label }) {
    return (
        <span className="rounded-[5px] bg-[var(--becpg-green)] px-1.5 py-px text-[10px] font-bold leading-4 text-[var(--becpg-blue)]">
            {label}
        </span>
    );
}

/**
 * The URL filters, seeded into local state and re-seeded when another screen
 * navigates here already filtered. `seed` is the URL key and nothing else.
 *
 * @returns {{values: Object, patch: Function, reset: Function}}
 */
function useUrlFilters() {
    const searchParams = useSearchParams();
    const urlFilters = readMonitorFilters(searchParams);
    const urlKey = monitorFilterQuery(urlFilters);
    const [filters, setFilters] = useState({ seed: urlKey, values: urlFilters });
    if (filters.seed !== urlKey) {
        setFilters({ seed: urlKey, values: urlFilters });
    }
    const patch = useCallback((values) => setFilters((previous) => ({
        seed: previous.seed, values: { ...previous.values, ...values },
    })), []);
    const reset = useCallback(() => setFilters((previous) => ({
        seed: previous.seed, values: { ...EMPTY_MONITOR_FILTERS },
    })), []);
    return { values: filters.values, patch, reset };
}

/** Header facts: the scan-window notice and the data timestamp. */
function HeaderFacts({ data, local, lang }) {
    const park = data?.overview?.available ? data.overview.park : null;
    return (
        <div className="flex flex-col items-end gap-1">
            {park?.truncated ? (
                <WindowNotice
                    label={fill(local.truncatedShort, { scanned: park.scanned })}
                    detail={fill(local.truncated, {
                        scanned: park.scanned,
                        total: formatTotal({ total: park.total, exact: park.exact !== false }, lang).label,
                    })}
                />
            ) : null}
            {data ? (
                <span className="text-[11px] text-[var(--becpg-dark-grey)]">
                    {fill(local.generatedAt, { time: formatDateTime(data.generatedAt, lang) || '—' })}
                </span>
            ) : null}
        </div>
    );
}

/** The five tabs, each rendering from the same payload. */
function cockpitTabs({ data, local, refresh }) {
    return [
        { id: 'quality', icon: 'verified_user', label: local.tabs.quality, render: () => <QualityTab data={data} onRefresh={refresh} /> },
        { id: 'purchasing', icon: 'shopping_cart', label: local.tabs.purchasing, render: () => <PurchasingTab data={data} /> },
        { id: 'rnd', icon: 'science', label: local.tabs.rnd, render: () => <RndTab data={data} /> },
        { id: 'csr', icon: 'eco', label: local.tabs.csr, render: () => <CsrTab data={data} /> },
        {
            id: 'assistant',
            icon: 'auto_awesome',
            label: local.tabs.assistant,
            badge: <AiBadge label={local.ai} />,
            render: () => <AssistantTab data={data} onRefresh={refresh} />,
        },
    ];
}

/**
 * The screen. Split out of the default export so `useSearchParams` sits under a
 * `<Suspense>` boundary.
 *
 * @returns {JSX.Element}
 */
function MonitorCockpitScreen() {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    const filters = useUrlFilters();

    const queried = useDebouncedValue(filters.values, FILTER_DEBOUNCE_MS);
    const params = useMemo(() => monitorFilterParams(queried), [queried]);
    const cockpit = useApi('monitor/cockpit', { params, timeout: COCKPIT_TIMEOUT_MS });
    const data = cockpit.data;
    const overview = data?.overview?.available ? data.overview : null;
    const payloadFilters = overview?.filters || {};

    return (
        <AppShell
            ownHeading
            fullWidth
            space="monitor"
            title={local.title}
            badges={{ nc: overview?.nonConformities?.open || 0 }}
        >
            <PageHeader
                title={local.title}
                description={local.description}
                actions={<HeaderFacts data={data} local={local} lang={lang} />}
            />

            <MonitorFilters
                className="mb-4"
                filters={filters.values}
                onChange={filters.patch}
                onReset={filters.reset}
                applied={payloadFilters.applied || []}
                unsupported={payloadFilters.unsupported || []}
            />

            {cockpit.error ? (
                <ErrorState error={cockpit.error} onRetry={cockpit.refresh} />
            ) : !data ? (
                <CockpitSkeleton />
            ) : (
                <CockpitTabs label={local.tablist} tabs={cockpitTabs({ data, local, refresh: cockpit.refresh })} />
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
                    <CockpitSkeleton />
                </AppShell>
            }
        >
            <MonitorCockpitScreen />
        </Suspense>
    );
}
