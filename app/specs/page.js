'use client';

/**
 * `/specs` — the applicable *cahiers des charges*, read-only.
 *
 * **This page used to scan the park.** `bcpg:productSpecifications` is a source
 * association — nothing queries a specification back to the products it applies
 * to — so the first implementation read every product's specifications one by
 * one, four at a time, and merged the result. Measured on the reference instance: **60
 * repository calls and ~750 ms on every visit**, growing with the size of the
 * catalogue.
 *
 * It is now a single call. `becpg/remote/entity/list` does return a target
 * association when `fields` names it (the key is just omitted when the
 * association is empty, which is what made it look unsupported), so
 * `GET /api/v1/specs` reads the whole park in one listing and then resolves each
 * *distinct* specification once. The progressive rendering that existed to hide
 * the scan is gone with it — there is nothing left to stagger.
 *
 * Only the specifications the supplier may actually open are listed: the
 * association names targets whose own ACL can refuse the account, and showing one
 * produced a nameless row with a download link that failed.
 */

import { useCallback, useMemo } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { ErrorState } from '@/components/ui/EmptyState';
import { SpecPanel } from '@/components/specs/SpecPanel';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        title: 'Cahiers des charges',
        subtitle: 'Les documents de référence que le client applique à vos produits',
        stats: {
            specs: 'Cahiers des charges',
            products: 'Produits couverts',
        },
        emptyHint:
            'Aucun cahier des charges ne vous est accessible. Le client vous en communiquera un s’il en applique un.',
    },
    en: {
        title: 'Specifications',
        subtitle: 'The reference documents the customer applies to your products',
        stats: {
            specs: 'Specifications',
            products: 'Covered products',
        },
        emptyHint:
            'No specification is available to you. The customer will share one if any applies.',
    },
};

export default function SpecsPage() {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;

    const call = useApi('specs');

    const specifications = useMemo(
        () => (call.data && call.data.specifications) || [],
        [call.data],
    );

    const coveredProducts = useMemo(() => {
        const set = new Set();
        specifications.forEach((specification) =>
            (specification.appliesTo || []).forEach((entry) => set.add(entry.nodeRef)),
        );
        return set.size;
    }, [specifications]);

    const retry = useCallback(() => call.refresh(), [call]);

    if (call.error) {
        return (
            <AppShell title={labels.title}>
                <ErrorState error={call.error} onRetry={retry} />
            </AppShell>
        );
    }

    return (
        <AppShell title={labels.title} fullWidth>
            <p className="mb-4 text-sm text-[var(--becpg-dark-grey)]">{labels.subtitle}</p>

            <StatGrid columns={2} className="mb-4">
                <StatCard
                    label={labels.stats.specs}
                    value={specifications.length}
                    icon="menu_book"
                    tone={specifications.length ? 'info' : 'neutral'}
                    index={0}
                />
                <StatCard
                    label={labels.stats.products}
                    value={coveredProducts}
                    icon="inventory_2"
                    tone="neutral"
                    index={1}
                />
            </StatGrid>

            <SpecPanel
                specifications={specifications}
                unreadable={(call.data && call.data.unreadable) || 0}
                variant="list"
                title={null}
                loading={call.loading}
                error={null}
                onRetry={retry}
                emptyMessage={labels.emptyHint}
            />
        </AppShell>
    );
}
