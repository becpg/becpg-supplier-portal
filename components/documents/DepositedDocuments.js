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
 * is. The two are shown together: the check-list says what is missing, this says
 * what is there.
 *
 * Read-only on purpose. Depositing goes through the check-list line (renewing a
 * requirement) or the "other document" drop zone, which are the two paths beCPG
 * knows how to attribute; a third one here would be a fourth way to upload the
 * same file.
 */

import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        title: 'Documents déposés',
        subtitle: 'Les fichiers présents dans le dossier de ce produit, quel que soit leur type.',
        empty: 'Aucun fichier déposé',
        emptyHint: 'Le dossier de ce produit ne contient encore aucun document.',
        signed: 'Signé',
        download: 'Télécharger',
        modified: 'Modifié le {date}',
    },
    en: {
        title: 'Deposited documents',
        subtitle: 'The files present in this product’s folder, whatever their type.',
        empty: 'No file deposited',
        emptyHint: 'This product’s folder holds no document yet.',
        signed: 'Signed',
        download: 'Download',
        modified: 'Modified on {date}',
    },
};

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
 * @param {string} [props.className]
 */
export function DepositedDocuments({ entityNodeRef, refreshKey = 0, className = '' }) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;

    const list = useApi(
        entityNodeRef ? `entities/${encodeURIComponent(entityNodeRef)}/documents` : null,
        { params: { v: refreshKey || undefined } },
    );

    const items = list.data && Array.isArray(list.data.items) ? list.data.items : [];

    return (
        <Card
            title={labels.title}
            subtitle={labels.subtitle}
            icon="folder_open"
            padding="md"
            className={className}
        >
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
                            <a
                                href={item.downloadUrl}
                                className="shrink-0 text-sm text-[var(--becpg-blue)] underline hover:text-[var(--becpg-orange)]"
                            >
                                {labels.download}
                            </a>
                        </li>
                    ))}
                </ul>
            ) : null}
        </Card>
    );
}
