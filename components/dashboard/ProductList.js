'use client';

/**
 * "Mes produits" — the modernised `product-catalog` dashlet (spec §4.3), plus
 * the one thing V1 never allowed: **"demander une mise à jour"** (weakness F10).
 *
 * F10 is *not* solved by letting the supplier write on production data: the
 * supplier starts a supplier project its customer opened to it, and goes
 * through the whole workflow again (`UpdateRequestDialog`).
 *
 * Completion comes from `bcpg:entityScore` (already computed by beCPG), the
 * state from `bcpg:productState`.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { GaugeBar } from '@/components/ui/Gauge';
import { StatusPill } from '@/components/ui/StatusPill';
import { useMessages } from '@/lib/messages';
import { formatDate, formatTotal } from '@/lib/format';
import { defineLabels, pickLabels } from '@/lib/i18n';
import { UpdateRequestDialog } from '@/components/products/UpdateRequestDialog';

/** `bcpg:productState` of a sheet the supplier may ask to reopen. */
const VALID_STATE = 'Valid';

const LOCAL = defineLabels('components/dashboard/ProductList#LOCAL', {
    fr: {
        title: 'Mes produits',
        empty: 'Aucun produit',
        emptyHint: 'Les produits que le client vous confie apparaîtront ici.',
        all: 'Tout voir',
        updatedOn: 'MAJ {date}',
        request: 'Demander une mise à jour',
        noCompletion: 'Non évalué',
        completion: 'Complétude',
    },
    en: {
        title: 'My products',
        empty: 'No product',
        emptyHint: 'The products your customer entrusts to you will show up here.',
        all: 'See all',
        updatedOn: 'Updated {date}',
        request: 'Request an update',
        noCompletion: 'Not scored',
        completion: 'Completeness',
    },
});

/**
 * `bcpg:productState` → the wording spec §4.3 asks for. The machine values are
 * kept as the `status` so the pill keeps its tone and icon.
 */
const STATE_LABELS = defineLabels('components/dashboard/ProductList#STATE_LABELS', {
    fr: {
        Valid: 'Validé',
        ToValidate: 'En cours d’approbation',
        Refused: 'À corriger',
        Simulation: 'Simulation',
        Stopped: 'Arrêté',
        Archived: 'Archivé',
    },
    en: {
        Valid: 'Approved',
        ToValidate: 'Pending approval',
        Refused: 'To fix',
        Simulation: 'Simulation',
        Stopped: 'Stopped',
        Archived: 'Archived',
    },
});

/**
 * @param {Object} props
 * @param {Array<Object>} props.products entities as returned by `/api/v1/entities`
 * @param {number|null} [props.total] exact number of products, `null` when beCPG
 *        could not count them — never rendered as 0, see `formatTotal`
 * @param {number} [props.totalAtLeast] proven floor that goes with a `null` total
 * @param {number} [props.index]
 */
export function ProductList({ products = [], total, totalAtLeast, index = 0, className = '' }) {
    const { lang } = useMessages();
    const local = pickLabels(LOCAL, lang);
    const stateLabels = pickLabels(STATE_LABELS, lang);
    const reduceMotion = useReducedMotion();
    const router = useRouter();
    const [requested, setRequested] = useState(null);

    // "Tout voir (12)" — and "(100+)" when the count is only a floor. Falling back on
    // `products.length` would label the link with the size of the preview.
    const count = formatTotal(
        {
            totalItems: typeof total === 'number' ? total : null,
            totalAtLeast: typeof totalAtLeast === 'number' ? totalAtLeast : products.length,
            totalExact: typeof total === 'number',
        },
        lang,
    );

    return (
        <>
            <Card
                title={local.title}
                icon="inventory_2"
                index={index}
                bodyClassName="pt-1"
                className={className}
                actions={
                    products.length > 0 ? (
                        <Link
                            href="/products"
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--becpg-blue-light)] hover:bg-[var(--becpg-grey)]"
                        >
                            {local.all}
                            {count.value > products.length ? (
                                <span className="tabular-nums" title={count.label}>
                                    ({count.text})
                                </span>
                            ) : null}
                            <Icon name="arrow_forward" size={14} />
                        </Link>
                    ) : null
                }
            >
                {products.length === 0 ? (
                    <EmptyState variant="empty" compact title={local.empty} message={local.emptyHint} />
                ) : (
                    <ul className="-mx-2 flex flex-col">
                        {products.map((product, position) => (
                            <motion.li
                                key={product.nodeRef || position}
                                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: reduceMotion ? 0 : 0.22,
                                    delay: reduceMotion ? 0 : Math.min(position, 8) * 0.04,
                                }}
                                className="flex items-start gap-1 rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--becpg-grey)]/60"
                            >
                                <Link
                                    href={product.href || `/products/${product.uuid}`}
                                    className="min-w-0 flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                                >
                                    {/*
                                     * The name owns the first line.
                                     *
                                     * It used to share it with the code chip and the
                                     * state pill, which on a 360px screen left it
                                     * about 50px — every product read "Raw m…". The
                                     * state pill drops under the name below `sm`,
                                     * exactly as the task type badge does in
                                     * `TaskList`, so the two lists behave alike.
                                     */}
                                    <div className="flex items-start gap-2">
                                        <span className="min-w-0 flex-1 text-sm font-medium leading-snug line-clamp-2">
                                            {product.name}
                                        </span>
                                        {product.state ? (
                                            <span className="hidden shrink-0 sm:block">
                                                <StatusPill
                                                    status={product.state}
                                                    label={stateLabels[product.state] || product.state}
                                                    size="sm"
                                                />
                                            </span>
                                        ) : null}
                                    </div>

                                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                        {product.code ? (
                                            <span className="rounded bg-[var(--becpg-grey)] px-1.5 py-px font-mono text-[0.6875rem] text-[var(--becpg-blue)]">
                                                {product.code}
                                            </span>
                                        ) : null}
                                        {product.state ? (
                                            <span className="sm:hidden">
                                                <StatusPill
                                                    status={product.state}
                                                    label={stateLabels[product.state] || product.state}
                                                    size="sm"
                                                />
                                            </span>
                                        ) : null}
                                        {product.modified ? (
                                            <span className="text-xs text-[var(--becpg-dark-grey)]">
                                                {local.updatedOn.replace(
                                                    '{date}',
                                                    formatDate(product.modified, lang),
                                                )}
                                            </span>
                                        ) : null}
                                    </div>

                                    {/* Capped width: a full-bleed bar under every row
                                        reads as a separator, not as a gauge. */}
                                    <div className="mt-1.5 max-w-[14rem]">
                                        {product.completion
                                        && typeof product.completion.score === 'number' ? (
                                            <GaugeBar
                                                value={product.completion.score}
                                                label={local.completion}
                                                size="sm"
                                                showValue
                                                delay={0.1 + position * 0.05}
                                                ariaLabel={`${local.completion} — ${product.name}`}
                                            />
                                        ) : (
                                            <span className="text-xs text-[var(--becpg-dark-grey)]">
                                                {local.noCompletion}
                                            </span>
                                        )}
                                    </div>
                                </Link>

{/* Only a validated sheet can be reopened: a draft is still being
                                    worked on, through the task that opened it. */}
                                {product.state === VALID_STATE ? (
                                <button
                                        type="button"
                                        onClick={() => setRequested(product)}
                                        aria-label={local.request}
                                        title={local.request}
                                        className="flex h-9 w-9 shrink-0 touch-target items-center justify-center rounded-lg text-[var(--becpg-dark-grey)] transition-colors hover:bg-[var(--becpg-blue-lighter)] hover:text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                                    >
                                        <Icon name="published_with_changes" size={20} />
                                    </button>
                                ) : null}
                            </motion.li>
                        ))}
                    </ul>
                )}
            </Card>

            <UpdateRequestDialog
                entity={requested}
                onClose={() => setRequested(null)}
                onDone={() => router.refresh()}
            />
        </>
    );
}
