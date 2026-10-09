'use client';

/**
 * **The files actually present in the entity's supplier-documents folder.**
 *
 * ## Why this is not the requirement check-list
 *
 * `RequirementChecklist` renders `GET /api/v1/documents/requirements`, which
 * searches on `ASPECT:"bcpg:documentAspect"` — beCPG's *expected document type*
 * model. It answers "what does my customer still expect", and that is the only
 * thing the portal used to show.
 *
 * A file with no document type is invisible to that search. The signed technical
 * sheet is precisely that case: the signature flow writes it with
 * `sign:signatureAspect` and no `bcpg:documentTypeRef`. So a folder holding two
 * files rendered one row, and the signed sheet appeared on no screen at all —
 * measured on dev, MP96843: `Halal.pdf` + the signed sheet in *Documents
 * fournisseur*, a single `Halal` requirement in the check-list.
 *
 * This component renders `GET /api/v1/entities/{id}/documents`, the folder as it
 * is.
 *
 * ## `exclude`: the two lists stopped repeating each other
 *
 * Shown whole beside the check-list, it listed every provided requirement a
 * second time — on the wizard's documents step, a file dropped on the « Certificat
 * IFS » line appeared once in its slot and once in the folder below, with a
 * different set of actions each time. The caller now passes the nodeRefs the
 * check-list already draws, and what is left is the honest remainder: the files
 * that belong to no requirement, which is exactly what the signed technical sheet
 * is. Pass nothing and the whole folder is listed, as on the `/documents` screen.
 *
 * Read-only on purpose. Depositing goes through the check-list line (renewing a
 * requirement) or the "other document" drop zone, which are the two paths beCPG
 * knows how to attribute; a third one here would be a fourth way to upload the
 * same file.
 */

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { Icon, IconButton } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/documents/DepositedDocuments#LABELS', {
    fr: {
        title: 'Documents déposés',
        subtitle: 'Les fichiers présents dans le dossier de ce produit, quel que soit leur type.',
        empty: 'Aucun fichier déposé',
        emptyHint: 'Le dossier de ce produit ne contient encore aucun document.',
        signed: 'Signé',
        download: 'Télécharger',
        consult: 'Consulter',
        modified: 'Modifié le {date}',
    },
    en: {
        title: 'Deposited documents',
        subtitle: 'The files present in this product’s folder, whatever their type.',
        empty: 'No file deposited',
        emptyHint: 'This product’s folder holds no document yet.',
        signed: 'Signed',
        download: 'Download',
        consult: 'View',
        modified: 'Modified on {date}',
    },
});

/**
 * Human file size. `null` for an unknown one — a "0 o" would read as an empty
 * file rather than as a missing measurement.
 *
 * @param {number|null} bytes
 * @returns {string|null}
 */
function formatSize(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) {
        return null;
    }
    const units = ['o', 'ko', 'Mo', 'Go'];
    let size = value;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit += 1;
    }
    return `${size < 10 && unit > 0 ? size.toFixed(1) : Math.round(size)} ${units[unit]}`;
}

/**
 * @param {Object} props
 * @param {string} props.entityNodeRef the entity whose folder is listed
 * @param {number} [props.refreshKey] bump to re-read after a deposit
 * @param {string[]} [props.exclude] nodeRefs another list already shows
 * @param {boolean} [props.bare=false] no card of its own — the caller owns the
 *   surface, and an empty folder renders nothing at all
 * @param {string} [props.className]
 */
export function DepositedDocuments({
    entityNodeRef,
    refreshKey = 0,
    exclude,
    bare = false,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);

    const list = useApi(
        entityNodeRef ? `entities/${encodeURIComponent(entityNodeRef)}/documents` : null,
        { params: { v: refreshKey || undefined } },
    );

    const excludeKey = (exclude || []).join('|');
    const items = useMemo(() => {
        const all = list.data && Array.isArray(list.data.items) ? list.data.items : [];
        if (!excludeKey) {
            return all;
        }
        const hidden = new Set(excludeKey.split('|'));
        return all.filter((item) => !hidden.has(item.nodeRef));
        // The array identity changes on every render of the caller; its content
        // is what selects, hence the serialised key.
    }, [list.data, excludeKey]);

    const [viewing, setViewing] = useState(null);

    // Bare and empty: the caller's drop zone already says the folder is open for
    // business, and an empty state above it would be a second way of saying so.
    if (bare && !list.loading && !list.error && items.length === 0) {
        return null;
    }

    const body = (
        <>
            {list.loading ? <SkeletonCard lines={3} /> : null}

            {!list.loading && list.error ? (
                <ErrorState error={list.error} onRetry={list.refresh} />
            ) : null}

            {!list.loading && !list.error && items.length === 0 ? (
                <EmptyState
                    variant="empty"
                    icon="folder_off"
                    title={labels.empty}
                    message={labels.emptyHint}
                />
            ) : null}

            {!list.loading && !list.error && items.length > 0 ? (
                <ul className="flex flex-col divide-y divide-[var(--becpg-light-grey)]">
                    {items.map((item) => (
                        <li
                            key={item.nodeRef}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0"
                        >
                            <Icon
                                name="description"
                                size={18}
                                className="shrink-0 text-[var(--becpg-dark-grey)]"
                            />
                            <span className="min-w-0 flex-1 truncate text-sm text-[var(--becpg-blue)]">
                                {item.title || item.name}
                            </span>
                            {/* The signature is the one attribute worth a badge here: it is
                                why the file exists and it is what a buyer looks for. */}
                            {item.signed ? (
                                <StatusPill
                                    status="valid"
                                    tone="ok"
                                    icon="verified"
                                    size="sm"
                                    label={labels.signed}
                                />
                            ) : null}
                            <span className="shrink-0 text-xs text-[var(--becpg-dark-grey)]">
                                {[
                                    formatSize(item.size),
                                    item.modified
                                        ? labels.modified.replace('{date}', formatDate(item.modified, lang))
                                        : null,
                                ]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </span>
                            {/* Viewing comes first: it is what one wants nine times
                                out of ten, and it spares a round trip through the
                                file manager just to check a certificate. */}
                            <span className="flex shrink-0 items-center">
                                <IconButton
                                    icon="visibility"
                                    label={labels.consult}
                                    variant="ghost"
                                    onClick={() => setViewing(item)}
                                />
                                <IconButton
                                    icon="download"
                                    label={labels.download}
                                    variant="ghost"
                                    href={item.downloadUrl}
                                    external
                                    download
                                />
                            </span>
                        </li>
                    ))}
                </ul>
            ) : null}

            <DocumentViewer document={viewing} onClose={() => setViewing(null)} />
        </>
    );

    if (bare) {
        return <div className={`min-w-0 ${className}`}>{body}</div>;
    }

    return (
        <Card
            title={labels.title}
            subtitle={labels.subtitle}
            icon="folder_open"
            padding="md"
            className={className}
        >
            {body}
        </Card>
    );
}
