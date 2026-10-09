'use client';

/**
 * The lists of the supplier sheet that have no screen of their own: its
 * documents, its products and its exchanges. Built on the portal's DataTable,
 * so they search, sort and export like every other monitoring list.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { DataTable } from '@/components/ui/DataTable';
import { Icon } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusPill } from '@/components/ui/StatusPill';
import { GaugeBar } from '@/components/ui/Gauge';
import { DateText } from '@/components/ui/DateText';
import { ExpiryPill, ValidityRange } from '@/components/documents/ExpiryPill';
import { useListExport } from '@/components/ui/useListExport';
import { apiUrl } from '@/lib/client';
import { formatDate } from '@/lib/format';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/monitor/supplier/SheetLists#LABELS', {
    fr: {
        documents: {
            search: 'Rechercher un document',
            document: 'Document',
            mandatory: 'Obligatoire',
            validity: 'Validité',
            status: 'Statut',
            entity: 'Rattaché à',
            download: 'Télécharger',
            empty: 'Aucun document attendu ni fourni',
            file: 'documents-fournisseur',
            yes: 'Oui',
            no: 'Non',
        },
        products: {
            search: 'Rechercher un produit',
            product: 'Produit',
            code: 'Code',
            state: 'État',
            completion: 'Complétude',
            modified: 'Mise à jour',
            empty: 'Aucun produit rattaché',
            file: 'produits-fournisseur',
        },
        subSuppliers: {
            search: 'Rechercher un sous-fournisseur',
            supplier: 'Sous-fournisseur',
            code: 'Code',
            state: 'État beCPG',
            file: 'sous-fournisseurs',
        },
        activity: {
            empty: 'Aucun échange enregistré',
            message: 'Message',
            activity: 'Activité',
        },
        unavailable: 'beCPG n’a pas pu fournir cette liste : elle ne dit rien de ce fournisseur.',
    },
    en: {
        documents: {
            search: 'Search a document',
            document: 'Document',
            mandatory: 'Mandatory',
            validity: 'Validity',
            status: 'Status',
            entity: 'Attached to',
            download: 'Download',
            empty: 'No document expected or provided',
            file: 'supplier-documents',
            yes: 'Yes',
            no: 'No',
        },
        products: {
            search: 'Search a product',
            product: 'Product',
            code: 'Code',
            state: 'State',
            completion: 'Completeness',
            modified: 'Updated',
            empty: 'No linked product',
            file: 'supplier-products',
        },
        subSuppliers: {
            search: 'Search a sub-supplier',
            supplier: 'Sub-supplier',
            code: 'Code',
            state: 'beCPG state',
            file: 'sub-suppliers',
        },
        activity: {
            empty: 'No exchange recorded',
            message: 'Message',
            activity: 'Activity',
        },
        unavailable: 'beCPG could not return this list: it says nothing about this supplier.',
    },
});

/**
 * The empty state of a sheet list, or the error state when the block could not
 * be read: an unread list must never pass for an empty one.
 */
function SheetEmpty({ block, title, onRetry, local }) {
    const { t } = useMessages();
    if (block?.available === false) {
        return (
            <EmptyState compact variant="error" message={local.unavailable} actionLabel={t('action.retry')} onAction={onRetry} />
        );
    }
    return <EmptyState compact title={title} />;
}

/**
 * @param {Object} props
 * @param {Object[]} props.items `documents.items` of the sheet
 * @param {Object} [props.block] `blocks.documents`
 * @param {Function} props.onRetry
 */
export function DocumentTable({ items, block, onRetry }) {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    const labels = local.documents;
    const exporter = useListExport({ rows: items, filename: labels.file });

    const columns = useMemo(() => [
        {
            id: 'document',
            accessorFn: (row) => row.type?.label || row.name || '',
            header: labels.document,
            meta: { primary: true, label: labels.document },
            cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
        },
        {
            id: 'mandatory',
            accessorFn: (row) => (row.isMandatory ? labels.yes : labels.no),
            header: labels.mandatory,
            meta: { label: labels.mandatory, width: '8rem' },
            cell: ({ row }) => (row.original.isMandatory
                ? <span className="pill pill-neutral pill-sm pill-no-dot">{labels.mandatory}</span>
                : <span className="text-[var(--becpg-dark-grey)]">—</span>),
        },
        {
            id: 'validity',
            accessorFn: (row) => [row.validFrom, row.validTo].map((value) => (value ? formatDate(value, lang) : '')).join(' - '),
            header: labels.validity,
            meta: { label: labels.validity, width: '13rem' },
            cell: ({ row }) => <ValidityRange from={row.original.validFrom} to={row.original.validTo} />,
        },
        {
            id: 'status',
            accessorFn: (row) => row.status || '',
            header: labels.status,
            meta: { badge: true, label: labels.status, width: '10rem' },
            cell: ({ row }) => (
                <ExpiryPill status={row.original.status} validTo={row.original.validTo} daysToExpiry={row.original.daysToExpiry} size="sm" />
            ),
        },
        {
            id: 'entity',
            accessorFn: (row) => row.entity?.label || row.entity?.name || '',
            header: labels.entity,
            meta: { label: labels.entity, width: '12rem' },
            cell: ({ getValue }) => <span className="block max-w-[12rem] truncate text-xs">{getValue() || '—'}</span>,
        },
        {
            id: 'download',
            header: '',
            enableSorting: false,
            meta: { label: labels.download, width: '3rem' },
            cell: ({ row }) => (row.original.downloadUrl ? (
                <a
                    href={apiUrl(row.original.downloadUrl)}
                    aria-label={`${labels.download} ${row.original.name || ''}`}
                    className="inline-flex rounded p-1 text-[var(--becpg-blue-light)] hover:text-[var(--becpg-orange-deep)]"
                >
                    <Icon name="download" size={18} />
                </a>
            ) : null),
        },
    ], [labels, lang]);

    return (
        <DataTable
            columns={columns}
            data={items}
            searchPlaceholder={labels.search}
            onExport={exporter.onExport}
            exporting={exporter.exporting}
            emptyState={<SheetEmpty block={block} title={labels.empty} onRetry={onRetry} local={local} />}
            caption={labels.document}
        />
    );
}

/**
 * @param {Object} props
 * @param {Object[]} props.items `products` of the sheet
 * @param {Object} [props.block] `blocks.products`
 * @param {Function} props.onRetry
 */
export function ProductTable({ items, block, onRetry }) {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    const labels = local.products;
    const exporter = useListExport({ rows: items, filename: labels.file });

    const columns = useMemo(() => [
        {
            id: 'product',
            accessorFn: (row) => row.name || '',
            header: labels.product,
            meta: { primary: true, label: labels.product },
            cell: ({ row }) => (
                <Link
                    href={`/products/${encodeURIComponent(row.original.nodeRef)}`}
                    className="font-medium text-[var(--becpg-blue)] hover:underline"
                >
                    {row.original.name}
                </Link>
            ),
        },
        {
            id: 'code',
            accessorFn: (row) => row.code || '',
            header: labels.code,
            meta: { secondary: true, label: labels.code, width: '8rem' },
        },
        {
            id: 'state',
            accessorFn: (row) => row.state || '',
            header: labels.state,
            meta: { badge: true, label: labels.state, width: '9rem' },
            cell: ({ row }) => (row.original.state ? <StatusPill status={row.original.state} size="sm" /> : '—'),
        },
        {
            id: 'completion',
            accessorFn: (row) => (typeof row.completion === 'number' ? row.completion : -1),
            header: labels.completion,
            meta: { label: labels.completion, width: '10rem', exportValue: (row) => row.completion ?? '' },
            cell: ({ row }) => (typeof row.original.completion === 'number'
                ? <span className="block w-24"><GaugeBar value={row.original.completion} size="sm" ariaLabel={row.original.name} /></span>
                : '—'),
        },
        {
            id: 'modified',
            accessorFn: (row) => (row.modified ? Date.parse(row.modified) : 0),
            header: labels.modified,
            meta: { label: labels.modified, align: 'right', width: '9rem', exportValue: (row) => (row.modified ? formatDate(row.modified, lang) : '') },
            cell: ({ row }) => (row.original.modified ? formatDate(row.original.modified, lang) : '—'),
        },
    ], [labels, lang]);

    return (
        <DataTable
            columns={columns}
            data={items}
            searchPlaceholder={labels.search}
            onExport={exporter.onExport}
            exporting={exporter.exporting}
            emptyState={<SheetEmpty block={block} title={labels.empty} onRetry={onRetry} local={local} />}
            caption={labels.product}
        />
    );
}

/**
 * The sub-suppliers of a group, each opening its own sheet.
 *
 * @param {Object} props
 * @param {Object[]} props.items `subSuppliers` of the sheet
 */
export function SubSupplierTable({ items }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang).subSuppliers;
    const exporter = useListExport({ rows: items, filename: labels.file });

    const columns = useMemo(() => [
        {
            id: 'supplier',
            accessorFn: (row) => row.name || '',
            header: labels.supplier,
            meta: { primary: true, label: labels.supplier },
            cell: ({ row }) => (
                <Link
                    href={`/monitor/suppliers/${encodeURIComponent(row.original.nodeRef)}`}
                    className="font-medium text-[var(--becpg-blue)] hover:underline"
                >
                    {row.original.name}
                </Link>
            ),
        },
        {
            id: 'code',
            accessorFn: (row) => row.code || '',
            header: labels.code,
            meta: { secondary: true, label: labels.code, width: '8rem' },
        },
        {
            id: 'state',
            accessorFn: (row) => row.state || '',
            header: labels.state,
            meta: { badge: true, label: labels.state, width: '9rem' },
            cell: ({ row }) => (row.original.state ? <StatusPill status={row.original.state} size="sm" /> : '—'),
        },
    ], [labels]);

    return (
        <DataTable
            columns={columns}
            data={items}
            searchPlaceholder={labels.search}
            onExport={exporter.onExport}
            exporting={exporter.exporting}
            caption={labels.supplier}
        />
    );
}

/**
 * The exchanges with the supplier, newest first.
 *
 * @param {Object} props
 * @param {Object[]} props.items `activity` of the sheet
 * @param {Object} [props.block] unavailable when either source could not be read
 * @param {Function} props.onRetry
 */
export function ActivityTimeline({ items, block, onRetry }) {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    if (items.length === 0) {
        return <SheetEmpty block={block} title={local.activity.empty} onRetry={onRetry} local={local} />;
    }
    return (
        <ol className="flex flex-col gap-2.5">
            {items.map((entry, index) => (
                <li key={entry.nodeRef || `${entry.date}-${index}`} className="flex gap-2.5">
                    <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            entry.kind === 'message'
                                ? 'bg-[var(--status-info-bg)] text-[var(--status-info)]'
                                : 'bg-[var(--becpg-grey)] text-[var(--becpg-blue)]'
                        }`}
                    >
                        <Icon name={entry.kind === 'message' ? 'forum' : 'bolt'} size={15} />
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-medium">
                                {entry.type || (entry.kind === 'message' ? local.activity.message : local.activity.activity)}
                            </span>
                            {entry.user ? <span className="text-[var(--becpg-muted)]">{entry.user}</span> : null}
                            <span className="text-xs tabular-nums text-[var(--becpg-muted)]">
                                <DateText value={entry.date} lang={lang} withTime />
                            </span>
                        </span>
                        {entry.excerpt ? (
                            <span className="mt-0.5 block break-words text-[var(--becpg-muted)]">{entry.excerpt}</span>
                        ) : null}
                    </span>
                </li>
            ))}
        </ol>
    );
}
