'use client';

/**
 * `/monitor/quality/[id]` — one non-conformity, as a sheet.
 *
 * The same reading as a product sheet: an identity band, then the sections beCPG
 * defines for a `qa:nc` — its properties form as Share renders it, its documents —
 * and its discussion beside them. Nothing is written from here: an NC is treated
 * through its workflow (rule R2), whose open tasks the sheet lists and opens.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { DateText } from '@/components/ui/DateText';
import { ProductSections } from '@/components/products/ProductSections';
import { NcStatePill, ncPriorityLabel, ncTypeLabel } from '@/components/monitor/NonConformityList';
import { CommentsPanel } from '@/components/wizard/panels/CommentsPanel';
import { WorkflowTasks } from '@/components/monitor/WorkflowTasks';
import { routeParamId, useApi } from '@/lib/client';
import { formatNumber, nodeLabel } from '@/lib/format';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('app/monitor/quality/[id]/page#LABELS', {
    fr: {
        back: 'Non-conformités',
        notFound: 'Non-conformité introuvable',
        notFoundHint: 'Elle n’existe pas, ou elle est hors de votre périmètre.',
        blocking: 'Bloquante',
        priority: 'Priorité',
        product: 'Produit',
        suppliers: 'Fournisseurs',
        batch: 'Lot',
        created: 'Créée le',
        modified: 'Mise à jour',
        cost: 'Coût',
        discussion: 'Discussion',
    },
    en: {
        back: 'Non-conformities',
        notFound: 'Non-conformity not found',
        notFoundHint: 'It does not exist, or it is outside your perimeter.',
        blocking: 'Blocking',
        priority: 'Priority',
        product: 'Product',
        suppliers: 'Suppliers',
        batch: 'Batch',
        created: 'Created on',
        modified: 'Updated',
        cost: 'Cost',
        discussion: 'Discussion',
    },
});

/** The discussion moves beside the sheet from this width up. */
const WIDE_LAYOUT = '(min-width: 1024px)';

/** `qa:ncPriority` values that block the supplier's approval (spec §5.4.3). */
const BLOCKING_PRIORITY = 1;

/** An association value of the entity, always as a list of `{ nodeRef, label }`. */
function refsOf(value, lang) {
    const list = Array.isArray(value) ? value : (value ? [value] : []);
    return list
        .filter((entry) => entry && typeof entry === 'object' && entry.id)
        .map((entry) => ({
            nodeRef: String(entry.id).includes('://') ? entry.id : `workspace://SpacesStore/${entry.id}`,
            label: nodeLabel(entry, lang) || entry['cm:name'] || '',
        }));
}

function Fact({ label, children }) {
    if (children === null || children === undefined || children === '' || (Array.isArray(children) && children.length === 0)) {
        return null;
    }
    return (
        <div className="min-w-0">
            <dt className="text-[0.75rem] text-[var(--becpg-muted)]">{label}</dt>
            <dd className="mt-0.5 break-words text-sm font-medium">{children}</dd>
        </div>
    );
}

function NcHeader({ nc, labels, lang }) {
    const attributes = nc.attributes || {};
    const priority = Number(attributes['qa:ncPriority']);
    const products = refsOf(attributes['qa:product'], lang);
    const suppliers = refsOf(attributes['bcpg:suppliers'], lang);
    const cost = Number(attributes['qa:ncCost']);
    return (
        <Card padding="lg" className="mb-4">
            <Link href="/monitor/quality" className="mb-2 inline-flex items-center gap-1 text-xs text-[var(--becpg-blue-light)] hover:text-[var(--becpg-orange-deep)]">
                <Icon name="arrow_back" size={14} />
                {labels.back}
            </Link>
            <h1 className="break-words text-lg font-medium leading-tight sm:text-xl">{nc.name || '—'}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <NcStatePill state={attributes['qa:ncState'] || null} lang={lang} />
                {attributes['qa:ncType'] ? (
                    <span className="pill pill-sm pill-no-dot pill-info">{ncTypeLabel(attributes['qa:ncType'], lang)}</span>
                ) : null}
                {priority === BLOCKING_PRIORITY ? (
                    <StatusPill status="suspended" tone="danger" icon="block" label={labels.blocking} size="sm" />
                ) : null}
                {attributes['bcpg:code'] ? (
                    <span className="pill pill-sm pill-no-dot pill-neutral">{attributes['bcpg:code']}</span>
                ) : null}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--becpg-grey)] pt-4 sm:grid-cols-3 lg:grid-cols-4">
                <Fact label={labels.priority}>{ncPriorityLabel(Number.isFinite(priority) ? priority : null, lang)}</Fact>
                <Fact label={labels.product}>
                    {products.length > 0 ? products.map((product) => (
                        <Link key={product.nodeRef} href={`/products/${encodeURIComponent(product.nodeRef)}`} className="block text-[var(--becpg-blue)] hover:underline">
                            {product.label || product.nodeRef}
                        </Link>
                    )) : null}
                </Fact>
                <Fact label={labels.suppliers}>
                    {suppliers.length > 0 ? suppliers.map((supplier) => (
                        <Link key={supplier.nodeRef} href={`/monitor/suppliers/${encodeURIComponent(supplier.nodeRef)}`} className="block text-[var(--becpg-blue)] hover:underline">
                            {supplier.label || supplier.nodeRef}
                        </Link>
                    )) : null}
                </Fact>
                <Fact label={labels.batch}>{attributes['qa:batchId'] || null}</Fact>
                <Fact label={labels.cost}>{Number.isFinite(cost) && cost > 0 ? formatNumber(cost, lang) : null}</Fact>
                <Fact label={labels.created}>{attributes['cm:created'] ? <DateText value={attributes['cm:created']} lang={lang} /> : null}</Fact>
                <Fact label={labels.modified}>{attributes['cm:modified'] ? <DateText value={attributes['cm:modified']} lang={lang} /> : null}</Fact>
            </dl>
        </Card>
    );
}

function NcScreen() {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const id = routeParamId(useParams().id);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const wide = useMediaQuery(WIDE_LAYOUT);

    const entity = useApi(id ? `entities/${encodeURIComponent(id)}` : null);
    const wizard = useApi(id ? `wizard/${encodeURIComponent(id)}` : null);
    const nc = entity.data;

    const selectTab = (key) => {
        const next = new URLSearchParams(searchParams.toString());
        next.set('tab', key);
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    };

    if (entity.error) {
        const outOfScope = entity.error.isNotFound || entity.error.status === 403;
        return (
            <AppShell space="monitor" title={labels.notFound}>
                {outOfScope ? (
                    <EmptyState variant="error" icon="search_off" title={labels.notFound} message={labels.notFoundHint} actionLabel={labels.back} actionHref="/monitor/quality" />
                ) : (
                    <ErrorState error={entity.error} onRetry={entity.refresh} />
                )}
            </AppShell>
        );
    }

    return (
        <AppShell
            ownHeading
            fullWidth
            space="monitor"
            title={nc ? nc.name : labels.back}
            aside={wide && nc ? <CommentsPanel entityNodeRef={nc.nodeRef} title={labels.discussion} /> : null}
        >
            {nc ? <NcHeader nc={nc} labels={labels} lang={lang} /> : <SkeletonCard lines={3} className="mb-4" />}
            {nc ? <WorkflowTasks entityId={nc.nodeRef} className="mb-4" /> : null}
            <ProductSections
                entity={nc}
                entityId={id}
                // A non-conformity has no supplier wizard: its sheet is the form
                // Share renders for `qa:nc`, and its documents.
                steps={(wizard.data && wizard.data.steps) || []}
                wizardId={wizard.data ? wizard.data.wizardId : undefined}
                loading={wizard.loading}
                entityLoading={entity.loading}
                activeTab={searchParams.get('tab') || ''}
                onTabChange={selectTab}
            />
            {!wide && nc ? (
                <div className="mt-4">
                    <CommentsPanel entityNodeRef={nc.nodeRef} title={labels.discussion} />
                </div>
            ) : null}
        </AppShell>
    );
}

/**
 * @returns {JSX.Element}
 */
export default function NonConformityPage() {
    return (
        <Suspense fallback={<AppShell space="monitor" fullWidth><SkeletonCard lines={4} /></AppShell>}>
            <NcScreen />
        </Suspense>
    );
}
