'use client';

/**
 * "Mes documents" — new in V2 (spec §4.3).
 *
 * Type of document, scope (supplier / product), end of validity
 * (`cm:effectivity` → `cm:to`) with a pill, status, and the action that matters:
 * **"déposer une nouvelle version"**.
 *
 * The deposit posts onto the *placeholder* `DocumentFormulationHandler` already
 * created (`uploadTarget.documentRef`), so `DocumentAspectPolicy` flips
 * `bcpg:documentState` to `ToValidate` and recomputes `cm:from` / `cm:to` from
 * the document type. The portal writes **no** metadata of its own — the
 * business rule stays in beCPG (rule R2).
 *
 * Progress is a real XHR progress bar: this screen is used on a phone, on a
 * mobile network, to upload a scanned certificate.
 */

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { StatusPill } from '@/components/ui/StatusPill';
import { useToast } from '@/components/providers/ToastProvider';
import { api } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { formatDate, daysUntil } from '@/lib/format';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LOCAL = defineLabels('components/dashboard/DocumentList#LOCAL', {
    fr: {
        title: 'Mes documents',
        empty: 'Aucun document attendu',
        emptyHint: 'Les certificats et attestations demandés par le client apparaîtront ici.',
        all: 'Tout voir',
        supplierScope: 'Fournisseur',
        mandatory: 'Obligatoire',
        until: 'Jusqu’au {date}',
        expiredSince: 'Expiré depuis {days} j',
        expiresIn: 'Expire dans {days} j',
        noValidity: 'Sans date de fin',
        upload: 'Déposer une nouvelle version',
        uploadFirst: 'Déposer le document',
        download: 'Télécharger',
        view: 'Consulter',
        uploading: 'Envoi…',
        uploaded: 'Document déposé. Il passe en validation chez votre client.',
    },
    en: {
        title: 'My documents',
        empty: 'No expected document',
        emptyHint: 'The certificates your customer requires will show up here.',
        all: 'See all',
        supplierScope: 'Supplier',
        mandatory: 'Mandatory',
        until: 'Until {date}',
        expiredSince: 'Expired {days} d ago',
        expiresIn: 'Expires in {days} d',
        noValidity: 'No end date',
        upload: 'Upload a new version',
        uploadFirst: 'Upload the document',
        download: 'Download',
        view: 'View',
        uploading: 'Uploading…',
        uploaded: 'Document uploaded. It is now pending your customer’s validation.',
    },
});

/**
 * The validity line: a date is useless on its own, the supplier needs the delay.
 *
 * @param {Object} props
 * @param {Object} props.document
 * @param {Object} props.local
 * @param {string} props.lang
 */
function Validity({ document, local, lang }) {
    if (!document.validTo) {
        return <span className="text-xs text-[var(--becpg-dark-grey)]">{local.noValidity}</span>;
    }
    const days = typeof document.daysToExpiry === 'number'
        ? document.daysToExpiry
        : daysUntil(document.validTo);
    const date = formatDate(document.validTo, lang);

    if (days !== null && days < 0) {
        return (
            <span className="text-xs text-[var(--status-danger)]">
                {local.expiredSince.replace('{days}', Math.abs(days))} · {date}
            </span>
        );
    }
    if (days !== null && days <= 60) {
        return (
            <span className="text-xs text-[var(--status-warn)]">
                {local.expiresIn.replace('{days}', days)} · {date}
            </span>
        );
    }
    return (
        <span className="text-xs text-[var(--becpg-dark-grey)]">
            {local.until.replace('{date}', date)}
        </span>
    );
}

/**
 * @param {Object} props
 * @param {Array<Object>} props.documents documents as returned by `/api/v1/documents`
 * @param {number} [props.total]
 * @param {number} [props.index]
 */
export function DocumentList({ documents = [], total, index = 0, className = '' }) {
    const { lang } = useMessages();
    const local = pickLabels(LOCAL, lang);
    const reduceMotion = useReducedMotion();
    const router = useRouter();
    const toast = useToast();

    const inputRef = useRef(null);
    const targetRef = useRef(null);
    const [busy, setBusy] = useState({ id: null, percent: 0 });
    const [viewing, setViewing] = useState(null);

    const count = typeof total === 'number' ? total : documents.length;

    const pick = (document) => {
        targetRef.current = document;
        if (inputRef.current) {
            inputRef.current.value = '';
            inputRef.current.click();
        }
    };

    const upload = async (event) => {
        const file = event.target.files && event.target.files[0];
        const target = targetRef.current;
        if (!file || !target) {
            return;
        }
        setBusy({ id: target.id, percent: 0 });
        try {
            await api.upload(
                'documents',
                file,
                {
                    documentRef: target.uploadTarget ? target.uploadTarget.documentRef : undefined,
                    entityRef: target.uploadTarget ? target.uploadTarget.entityRef : undefined,
                },
                { onProgress: (percent) => setBusy({ id: target.id, percent }) },
            );
            toast.success(local.uploaded);
            router.refresh();
        }
        catch (error) {
            toast.error(error);
        }
        finally {
            targetRef.current = null;
            setBusy({ id: null, percent: 0 });
        }
    };

    return (
        <Card
            title={local.title}
            icon="folder_shared"
            index={index}
            bodyClassName="pt-1"
            className={className}
            actions={
                documents.length > 0 ? (
                    <Link
                        href="/documents"
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--becpg-blue-light)] hover:bg-[var(--becpg-grey)]"
                    >
                        {local.all}
                        {count > documents.length ? <span className="tabular-nums">({count})</span> : null}
                        <Icon name="arrow_forward" size={14} />
                    </Link>
                ) : null
            }
        >
            {/* One shared, visually hidden input: a per-row input would multiply
                file pickers for nothing. */}
            <input
                ref={inputRef}
                type="file"
                className="sr-only-text"
                tabIndex={-1}
                aria-hidden="true"
                onChange={upload}
            />

            {documents.length === 0 ? (
                <EmptyState variant="empty" compact title={local.empty} message={local.emptyHint} />
            ) : (
                <ul className="-mx-2 flex flex-col">
                    {documents.map((document, position) => {
                        const uploading = busy.id === document.id;
                        const label = (document.type && document.type.label) || document.name;
                        const scope = document.entity && document.entity.label
                            ? document.entity.label
                            : local.supplierScope;
                        return (
                            <motion.li
                                key={document.id || position}
                                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: reduceMotion ? 0 : 0.22,
                                    delay: reduceMotion ? 0 : Math.min(position, 8) * 0.04,
                                }}
                                className="flex items-start gap-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--becpg-grey)]/60"
                            >
                                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--becpg-grey)] text-[var(--becpg-blue)]">
                                    <Icon name="description" size={18} />
                                </span>

                                <div className="min-w-0 flex-1">
                                    {/* Two lines rather than an ellipsis: in a 370px
                                        dashboard column every certificate read
                                        "Japan Flavor Auth…" / "Non-ionization
                                        Att…", which is exactly the part that
                                        distinguishes one from the next. */}
                                    <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                                        <span className="min-w-0 flex-1 text-sm font-medium leading-snug line-clamp-2">
                                            {label}
                                        </span>
                                        <StatusPill status={document.status} size="sm" />
                                    </div>

                                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                        <span className="inline-flex min-w-0 items-center gap-1 text-xs text-[var(--becpg-dark-grey)]">
                                            <Icon
                                                name={document.entity ? 'inventory_2' : 'business'}
                                                size={13}
                                            />
                                            <span className="truncate">{scope}</span>
                                        </span>
                                        {document.isMandatory ? (
                                            <span className="rounded bg-[var(--becpg-grey)] px-1.5 py-px text-[0.6875rem] text-[var(--becpg-dark-grey-deep)]">
                                                {local.mandatory}
                                            </span>
                                        ) : null}
                                    </div>

                                    <div className="mt-0.5">
                                        <Validity document={document} local={local} lang={lang} />
                                    </div>

                                    {uploading ? (
                                        <div className="mt-1.5 flex items-center gap-2">
                                            <span className="h-1 w-full overflow-hidden rounded-full bg-[var(--becpg-grey)]">
                                                <span
                                                    className="block h-full rounded-full bg-[var(--becpg-orange)] transition-[width] duration-150"
                                                    style={{ width: `${busy.percent}%` }}
                                                />
                                            </span>
                                            <span className="shrink-0 text-xs tabular-nums text-[var(--becpg-dark-grey)]">
                                                {busy.percent}%
                                            </span>
                                        </div>
                                    ) : null}
                                </div>

                                <div className="flex shrink-0 items-center">
                                    {document.downloadUrl ? (
                                        <button
                                            type="button"
                                            onClick={() => setViewing(document)}
                                            aria-label={local.view}
                                            title={local.view}
                                            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--becpg-dark-grey-deep)] transition-colors hover:bg-[var(--becpg-grey)] hover:text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                                        >
                                            <Icon name="visibility" size={18} />
                                        </button>
                                    ) : null}
                                    {document.downloadUrl ? (
                                        <a
                                            href={document.downloadUrl}
                                            download
                                            aria-label={local.download}
                                            title={local.download}
                                            className="hidden h-9 w-9 items-center justify-center rounded-lg text-[var(--becpg-dark-grey-deep)] transition-colors hover:bg-[var(--becpg-grey)] hover:text-[var(--becpg-blue)] sm:flex"
                                        >
                                            <Icon name="download" size={18} />
                                        </a>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={() => pick(document)}
                                        disabled={Boolean(busy.id)}
                                        aria-label={document.isProvided ? local.upload : local.uploadFirst}
                                        title={document.isProvided ? local.upload : local.uploadFirst}
                                        className="flex h-9 w-9 touch-target items-center justify-center rounded-lg text-[var(--becpg-dark-grey)] transition-colors hover:bg-[var(--becpg-blue-lighter)] hover:text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] disabled:opacity-40"
                                    >
                                        <Icon name={uploading ? 'hourglass_top' : 'upload_file'} size={20} />
                                    </button>
                                </div>
                            </motion.li>
                        );
                    })}
                </ul>
            )}
            <DocumentViewer document={viewing} onClose={() => setViewing(null)} />
        </Card>
    );
}
