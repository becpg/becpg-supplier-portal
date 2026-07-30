'use client';

/**
 * `/products/[id]` — the product sheet, read-only (spec §4.2).
 *
 * The sheet answers three questions, in that order: *what is this product*,
 * *what does it hold*, and *what do I owe on it*. It is the portal's equivalent
 * of Share's `entity-data-lists?list=…`: a supplier must be able to consult
 * **every** section of its product here, not only its properties.
 *
 * | Source | What it feeds |
 * |---|---|
 * | `wizard/{id}` | **the tabs themselves** — one per step, in beCPG's order, with beCPG's labels |
 * | `wizard/{id}/step/{stepId}` | the content of a step tab (form definition, columns + rows, documents) |
 * | `entities/{id}/catalogs` | Conformité — the missing fields holding the validation back |
 * | `entities/{id}/specs` | Cahiers des charges — what the customer asked for |
 * | `documents/requirements?entity=` | Documents, when the configuration declares no `documents` step |
 *
 * Two things this page owns, and only two: **the data the whole sheet needs**
 * (the entity and the wizard structure) and **the tab carried by the URL**.
 * Everything below the header lives in `components/products/ProductSections.js`,
 * which derives the tabs from the steps and fetches each panel lazily.
 *
 * The active tab is in the query string (`?tab=ingList`) so a supplier can
 * bookmark or send "the ingredients of MP1000023432", and a reload lands back on
 * it. The value is a list name rather than a step number, and an unknown one
 * falls back to the first tab.
 */

import { Suspense, useCallback } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ProductHeader } from '@/components/products/ProductHeader';
import { ProductSections } from '@/components/products/ProductSections';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        sheet: 'Fiche',
        notFound: 'Produit introuvable',
        notFoundHint: 'Cette fiche n’existe pas ou ne fait pas partie de votre périmètre.',
        back: 'Mes produits',
    },
    en: {
        sheet: 'Sheet',
        notFound: 'Product not found',
        notFoundHint: 'This sheet does not exist, or is not part of your scope.',
        back: 'My products',
    },
};

/**
 * The screen itself. Split out of the default export so `useSearchParams` sits
 * under a `<Suspense>` boundary — without it, a client page reading the query
 * string forces the whole route out of the prerender.
 *
 * @returns {JSX.Element}
 */
function ProductScreen() {
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab') || '';

    // `replace`, not `push`: browsing the sections of one sheet is not a
    // navigation history — the back button must return to the products list, not
    // walk back through nine tabs. `scroll: false` keeps the reading position.
    const selectTab = useCallback(
        (key) => {
            const next = new URLSearchParams(searchParams.toString());
            next.set('tab', key);
            router.replace(`${pathname}?${next.toString()}`, { scroll: false });
        },
        [router, pathname, searchParams],
    );

    const entity = useApi(id ? `entities/${id}` : null);

    // The wizard state is what the tabs are made of: which sections exist, in
    // which order, under which (already translated) label. It is fetched once,
    // on load; the steps' *data* is not — each panel fetches its own when it is
    // first opened. A failure here is not an error for this page: the sheet
    // degrades to the portal's own sections and the raw attributes.
    const wizard = useApi(id ? `wizard/${id}` : null);

    if (entity.error) {
        // A 403 and a 404 get the SAME screen on purpose.
        //
        // beCPG answers "no right to see this node" for a product outside the supplier's
        // perimeter (mapped to 403 in lib/errors.js). From the supplier's point of view the
        // two are the same thing — the sheet is not theirs — and the wording already says
        // both. It also avoids confirming that a node it may not see exists.
        //
        // No "retry" affordance here: retrying a permission denial can never succeed, and
        // offering it invites the user to hammer a wall. The way out is the products list.
        const outOfScope = entity.error.isNotFound || entity.error.status === 403;

        return (
            <AppShell title={labels.notFound}>
                {outOfScope ? (
                    <EmptyState
                        variant="error"
                        icon="search_off"
                        title={labels.notFound}
                        message={labels.notFoundHint}
                        actionLabel={labels.back}
                        actionHref="/products"
                    />
                ) : (
                    <ErrorState error={entity.error} onRetry={entity.refresh} />
                )}
            </AppShell>
        );
    }

    const product = entity.data;

    return (
        <AppShell title={product ? product.name : labels.sheet}>
            <ProductHeader
                entity={product}
                loading={entity.loading}
                backHref="/products"
                className="mb-4"
            />

            <ProductSections
                entity={product}
                entityId={id}
                steps={(wizard.data && wizard.data.steps) || []}
                wizardId={wizard.data ? wizard.data.wizardId : undefined}
                loading={wizard.loading}
                entityLoading={entity.loading}
                activeTab={activeTab}
                onTabChange={selectTab}
            />
        </AppShell>
    );
}

/**
 * @returns {JSX.Element}
 */
export default function ProductPage() {
    return (
        <Suspense
            fallback={
                <AppShell>
                    <SkeletonCard lines={4} />
                </AppShell>
            }
        >
            <ProductScreen />
        </Suspense>
    );
}
