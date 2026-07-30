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
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Select } from '@/components/ui/Field';
import { GaugeBar } from '@/components/ui/Gauge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { useToast } from '@/components/providers/ToastProvider';
import { api, useApi, useMutation } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { formatDate } from '@/components/dashboard/ApprovalCard';

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
 * Turns a configured template id (`supplier-renewal`) into something readable
 * without inventing a translation: the id **is** the tenant's configuration.
 *
 * @param {string} id
 * @returns {string}
 */
function processLabel(id) {
    return String(id || '').replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
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

    // Only asked for when the dialog is actually open — the allow-list is tiny
    // but there is no reason to query it on every dashboard render.
    const { data, loading } = useApi('process/start', { enabled: Boolean(product) });
    const processes = (data && Array.isArray(data.processes) ? data.processes : []).map(
        (entry) => ({ value: entry.id, label: processLabel(entry.id) }),
    );

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
            ) : processes.length === 0 ? (
                <p className="rounded-lg bg-[var(--status-warn-bg)] px-3 py-2 text-sm text-[var(--status-warn)]">
                    {local.noProcess}
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
 * @param {number} [props.total]
 * @param {number} [props.index]
 */
export function ProductList({ products = [], total, index = 0, className = '' }) {
    const { lang } = useMessages();
    const local = LOCAL[lang] || LOCAL.fr;
    const stateLabels = STATE_LABELS[lang] || STATE_LABELS.fr;
    const reduceMotion = useReducedMotion();
    const router = useRouter();
    const [requested, setRequested] = useState(null);

    const count = typeof total === 'number' ? total : products.length;

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
                            {count > products.length ? (
                                <span className="tabular-nums">({count})</span>
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
