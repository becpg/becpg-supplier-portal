'use client';

/**
 * "Mes produits" — the modernised `product-catalog` dashlet (spec §4.3), plus
 * the one thing V1 never allowed: **"demander une mise à jour"** (weakness F10).
 *
 * F10 is *not* solved by letting the supplier write on production data. It is
 * solved the way beCPG already models it: the supplier **starts an authorised
 * project** from a template, which the client then validates. The allow-list
 * lives server-side in `PORTAL_PROCESS_TEMPLATES` and is deny-by-default, so
 * this component simply asks `GET /api/v1/process/start` which templates are
 * open and renders exactly those — never a guess.
 *
 * Completion comes from `bcpg:entityScore` (already computed by beCPG), the
 * state from `bcpg:productState`.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Button, ButtonGroup, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Field, Select } from '@/components/ui/Field';
import { GaugeBar } from '@/components/ui/Gauge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { useToast } from '@/components/providers/ToastProvider';
import { api, useApi, useMutation } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { formatDate, formatTotal } from '@/lib/format';

const LOCAL = {
    fr: {
        title: 'Mes produits',
        empty: 'Aucun produit',
        emptyHint: 'Les produits que le client vous confie apparaîtront ici.',
        all: 'Tout voir',
        updatedOn: 'MAJ {date}',
        request: 'Demander une mise à jour',
        requestTitle: 'Demander une mise à jour',
        requestIntro:
            'Vous demandez l’ouverture d’un dossier de mise à jour sur ce produit. '
            + 'Votre client devra le valider ; aucune donnée n’est modifiée immédiatement.',
        process: 'Type de demande',
        processPlaceholder: 'Choisir…',
        noProcess:
            'Aucun type de demande n’est ouvert aux fournisseurs sur cette instance. '
            + 'Contactez votre interlocuteur habituel.',
        processUnavailable:
            'Les types de demande n’ont pas pu être récupérés. Réessayez dans un instant ; '
            + 'si cela persiste, contactez votre interlocuteur habituel.',
        submit: 'Envoyer la demande',
        sent: 'Demande envoyée. Votre client va la traiter.',
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
        requestTitle: 'Request an update',
        requestIntro:
            'You are requesting an update file on this product. Your customer must approve it; '
            + 'nothing is changed straight away.',
        process: 'Request type',
        processPlaceholder: 'Choose…',
        noProcess:
            'No request type is open to suppliers on this instance. Please contact your usual contact.',
        processUnavailable:
            'Request types could not be retrieved. Try again in a moment; if it persists, '
            + 'please contact your usual contact.',
        submit: 'Send the request',
        sent: 'Request sent. Your customer will process it.',
        noCompletion: 'Not scored',
        completion: 'Completeness',
    },
};

/**
 * `bcpg:productState` → the wording spec §4.3 asks for. The machine values are
 * kept as the `status` so the pill keeps its tone and icon.
 */
const STATE_LABELS = {
    fr: {
        Valid: 'Validé',
        ToValidate: 'En cours d’approbation',
        Refused: 'À corriger',
        Simulation: 'Brouillon',
        Stopped: 'Arrêté',
        Archived: 'Archivé',
    },
    en: {
        Valid: 'Approved',
        ToValidate: 'Pending approval',
        Refused: 'To fix',
        Simulation: 'Draft',
        Stopped: 'Stopped',
        Archived: 'Archived',
    },
};

/**
 * The label of a request type.
 *
 * A **discovered** template carries beCPG's own name for it ("Projet de
 * référencement fournisseur"), already in the user's locale — that is the label
 * to show, and the portal invents nothing (AGENTS rule 4). A template pinned
 * through `PORTAL_PROCESS_TEMPLATES` has no name, only an id, so the id is
 * de-slugged: it **is** the tenant's configuration.
 *
 * @param {{id: string, label: ?string}} entry
 * @returns {string}
 */
function processLabel(entry) {
    if (entry && entry.label) {
        return String(entry.label);
    }
    return String(entry?.id || '').replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * The "demander une mise à jour" dialog.
 *
 * @param {Object} props
 * @param {Object|null} props.product the entity the request is about
 * @param {Function} props.onClose
 * @param {Function} props.onDone
 */
function RequestUpdateModal({ product, onClose, onDone }) {
    const { t, lang } = useMessages();
    const local = LOCAL[lang] || LOCAL.fr;
    const toast = useToast();
    const [processId, setProcessId] = useState('');
    // A request type picked for one product must not be pre-selected for the
    // next one; reset during render, as the other dialogs of the portal do.
    const productRef = product?.nodeRef ?? null;
    const [shownFor, setShownFor] = useState(productRef);
    if (shownFor !== productRef) {
        setShownFor(productRef);
        setProcessId('');
    }

    // Only asked for when the dialog is actually open — the allow-list is tiny
    // but there is no reason to query it on every dashboard render.
    const { data, loading, error, refresh } = useApi('process/start', { enabled: Boolean(product) });
    const processes = (data && Array.isArray(data.processes) ? data.processes : []).map(
        (entry) => ({ value: entry.id, label: processLabel(entry) }),
    );
    // "We could not ask beCPG" is not "nothing is open here": the first is
    // transient and worth retrying, the second is the instance's configuration.
    const unresolved = Boolean(data && data.discovery && data.discovery.available === false);

    const send = useMutation(
        (input) => api.post('process/start', input),
        {
            onSuccess: () => {
                toast.success(local.sent);
                onClose();
                onDone();
            },
            onError: (error) => toast.error(error),
        },
    );

    const submit = async () => {
        if (!processId || !product) {
            return;
        }
        try {
            await send.run({ process: processId, entityNodeRef: product.nodeRef });
        }
        catch {
            // The toast is already raised by onError; the dialog stays open so
            // the supplier can pick another request type.
        }
    };

    return (
        <Modal
            open={Boolean(product)}
            onClose={onClose}
            title={local.requestTitle}
            description={product ? [product.code, product.name].filter(Boolean).join(' · ') : undefined}
            size="sm"
            footer={
                <ButtonGroup>
                    <Button variant="outline" onClick={onClose} disabled={send.loading}>
                        {t('action.cancel')}
                    </Button>
                    <Button
                        variant="primary"
                        icon="send"
                        loading={send.loading}
                        disabled={!processId || processes.length === 0}
                        onClick={submit}
                    >
                        {local.submit}
                    </Button>
                </ButtonGroup>
            }
        >
            <p className="mb-4 text-sm leading-relaxed text-[var(--becpg-dark-grey)]">
                {local.requestIntro}
            </p>
            {loading ? (
                <Skeleton height={44} radius="0.5rem" />
            ) : error ? (
                // A failed read is not "nothing is open here": say so, and let
                // the supplier ask again.
                <ErrorState error={error} onRetry={refresh} compact />
            ) : processes.length === 0 ? (
                <p className="rounded-lg bg-[var(--status-warn-bg)] px-3 py-2 text-sm text-[var(--status-warn)]">
                    {unresolved ? local.processUnavailable : local.noProcess}
                </p>
            ) : (
                <Field label={local.process} required>
                    <Select
                        options={processes}
                        placeholder={local.processPlaceholder}
                        value={processId}
                        onChange={(event) => setProcessId(event.target.value)}
                    />
                </Field>
            )}
        </Modal>
    );
}

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
    const local = LOCAL[lang] || LOCAL.fr;
    const stateLabels = STATE_LABELS[lang] || STATE_LABELS.fr;
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

                                <button
                                    type="button"
                                    onClick={() => setRequested(product)}
                                    aria-label={local.request}
                                    title={local.request}
                                    className="flex h-9 w-9 shrink-0 touch-target items-center justify-center rounded-lg text-[var(--becpg-dark-grey)] transition-colors hover:bg-[var(--becpg-blue-lighter)] hover:text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                                >
                                    <Icon name="published_with_changes" size={20} />
                                </button>
                            </motion.li>
                        ))}
                    </ul>
                )}
            </Card>

            <RequestUpdateModal
                product={requested}
                onClose={() => setRequested(null)}
                onDone={() => router.refresh()}
            />
        </>
    );
}
