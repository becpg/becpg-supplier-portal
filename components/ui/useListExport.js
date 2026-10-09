'use client';

/**
 * The Exporter button of a list, wired: reads every page of the list's endpoint
 * with the list's own filters, writes the visible columns, and says when the
 * file is cut.
 */

import { useCallback, useState } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import { exportList, exportRows } from '@/lib/listExport';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/ui/useListExport#LABELS', {
    fr: {
        done: '{count} ligne(s) exportée(s).',
        cut: 'Export partiel : {count} ligne(s), la limite d’un export. Affinez les filtres pour le reste.',
    },
    en: {
        done: '{count} row(s) exported.',
        cut: 'Partial export: {count} row(s), the export limit. Narrow the filters for the rest.',
    },
});

/**
 * @param {Object} params
 * @param {string} [params.path] paged endpoint; omit it to export `rows`
 * @param {Object} [params.query] the list's parameters, without page and pageSize
 * @param {string} [params.itemsKey]
 * @param {Object[]} [params.rows] rows already in hand
 * @param {string} params.filename
 * @returns {{exporting: boolean, onExport: Function}} props for DataTable
 */
export function useListExport({ path, query, itemsKey, rows, filename }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const toast = useToast();
    const [exporting, setExporting] = useState(false);

    const onExport = useCallback(async (columns, shownRows) => {
        if (!path) {
            exportRows({ rows: shownRows || rows || [], columns, filename });
            return;
        }
        setExporting(true);
        try {
            const { count, complete } = await exportList({ path, query, itemsKey, columns, filename });
            const message = (complete ? labels.done : labels.cut).replace('{count}', String(count));
            if (complete) {
                toast.success(message);
            }
            else {
                toast.warning(message);
            }
        }
        catch (error) {
            console.warn('[list-export] export failed', path, error?.status);
            toast.error(error);
        }
        finally {
            setExporting(false);
        }
    }, [path, query, itemsKey, rows, filename, labels, toast]);

    return { exporting, onExport };
}
