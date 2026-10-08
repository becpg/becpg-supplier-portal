'use client';

/**
 * The documents the supplier has signed, most recent first.
 *
 * The signature screen offers the download once; a supplier who skipped it
 * finds the signed copy here, without going back through a closed task.
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { download, useApi } from '@/lib/client';
import { formatDate } from '@/lib/format';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/documents/SignedDocumentList#LABELS', {
    fr: {
        document: 'Document signé',
        signedAt: 'Signé le',
        download: 'Télécharger',
        search: 'Rechercher un document signé',
        empty: 'Aucun document signé',
        emptyHint: 'Les documents que vous signez depuis vos tâches apparaissent ici.',
        truncated: 'Liste partielle : tous les documents signés n’ont pas pu être lus.',
    },
    en: {
        document: 'Signed document',
        signedAt: 'Signed on',
        download: 'Download',
        search: 'Search a signed document',
        empty: 'No signed document',
        emptyHint: 'The documents you sign from your tasks show up here.',
        truncated: 'Partial list: not every signed document could be read.',
    },
});

/**
 * @param {Object} labels
 * @param {string} lang
 * @returns {Object[]} DataTable columns
 */
function signedColumns(labels, lang) {
    return [
        {
            id: 'document',
            accessorKey: 'name',
            header: labels.document,
            meta: { primary: true, label: labels.document },
            cell: ({ row }) => <span className="block truncate font-medium">{row.original.name || '—'}</span>,
        },
        {
            id: 'signedAt',
            accessorFn: (row) => row.signedAt || row.modified || '',
            header: labels.signedAt,
            meta: { secondary: true, label: labels.signedAt },
            cell: ({ row }) => formatDate(row.original.signedAt || row.original.modified, lang) || '—',
        },
        {
            id: 'actions',
            header: '',
            enableSorting: false,
            meta: { align: 'right', label: labels.download, width: '8rem' },
            cell: ({ row }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    icon="download"
                    onClick={(event) => {
                        event.stopPropagation();
                        download(`documents/${row.original.nodeRef.split('/').pop()}/content`, { signed: 1 });
                    }}
                >
                    {labels.download}
                </Button>
            ),
        },
    ];
}

/**
 * @param {Object} props
 * @param {string|null} [props.supplier] supplier nodeRef the list is bounded to
 * @param {string} props.lang
 */
export function SignedDocumentList({ supplier = null, lang }) {
    const labels = pickLabels(LABELS, lang);
    const signed = useApi('documents/signed', { params: supplier ? { supplier } : undefined });
    const columns = useMemo(() => signedColumns(labels, lang), [labels, lang]);

    if (signed.error) {
        return <ErrorState error={signed.error} onRetry={signed.refresh} />;
    }
    return (
        <>
            {signed.data?.truncated ? (
                <Card padding="sm" variant="muted" className="mb-3">
                    <p className="text-sm" role="status">{labels.truncated}</p>
                </Card>
            ) : null}
            <DataTable
                columns={columns}
                data={signed.data?.items ?? []}
                loading={signed.loading}
                getRowId={(row) => row.nodeRef}
                searchPlaceholder={labels.search}
                initialSorting={[{ id: 'signedAt', desc: true }]}
                pageSize={25}
                emptyState={<EmptyState icon="draw" title={labels.empty} message={labels.emptyHint} />}
            />
        </>
    );
}
