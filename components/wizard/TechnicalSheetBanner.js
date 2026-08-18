'use client';

/**
 * The technical sheet, in the assistant's header.
 *
 * Uploading it is the supplier's **first** action: it is the document becpg-ai
 * reads, so nothing is suggested until it is there. It used to live in the
 * context panel, in a collapsible section right above the suggestions it feeds
 * — the right place to *read* it, the wrong place to *act* on it. Below `lg`
 * that panel is behind a button, above it is the column the eye reaches last,
 * and a supplier could fill a whole wizard by hand without ever noticing that
 * the one document unlocking the suggestions was still missing.
 *
 * So the missing case is a band in the header now, in the danger tone, saying
 * what it unlocks rather than what it is. Four situations, and one of them
 * renders nothing:
 *
 * | Situation | What the header shows |
 * |---|---|
 * | A sheet is there | one line: upload date, validity, AI verdict, and how to replace it |
 * | The type exists, nothing uploaded | a red band, the reason, and the upload control |
 * | Same, but entry is closed | one neutral line, no control — nothing can be done here |
 * | The customer configured no such type | **nothing at all** |
 *
 * The last one matters most: offering an upload with no configured destination
 * asks for a document nobody expects and nothing will attach.
 */

import { useCallback, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Button';
import { AiValidationBadge, DocumentUpload } from '@/components/documents/DocumentUpload';
import { ExpiryPill } from '@/components/documents/ExpiryPill';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        title: 'Fiche technique',
        deposited: 'Déposée le {date}',
        replace: 'Remplacer',
        cancel: 'Annuler',
        missing: 'Fiche technique manquante',
        missingHint: 'Pour activer les suggestions de l’IA, déposez votre fiche technique.',
        missingClosed: 'Aucune fiche technique n’a été déposée sur cette fiche.',
    },
    en: {
        title: 'Technical sheet',
        deposited: 'Uploaded on {date}',
        replace: 'Replace',
        cancel: 'Cancel',
        missing: 'Technical sheet missing',
        missingHint: 'Upload your technical sheet to enable the AI suggestions.',
        missingClosed: 'No technical sheet has been uploaded on this sheet.',
    },
};

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        (vars[key] === undefined || vars[key] === null ? match : String(vars[key])));
}

/**
 * What the customer expects on this entity, in documents.
 *
 * One read for the whole wizard. The banner takes the technical sheet out of
 * it, the rail takes the count of mandatory documents still missing — which is
 * why the Documents step can be marked incomplete before anyone opens it — and
 * the Documents step itself is handed the payload instead of fetching it again.
 *
 * Kept apart from the rendering so a caller can decide **before** opening a
 * surface for it: a customer with no such type configured must not end up with
 * an empty "Fiche technique" box, and a component cannot tell its parent that
 * during its own render without a side effect.
 *
 * @param {string} entityNodeRef
 * @returns {{loading: boolean, error: Error|null, sheet: Object|null,
 *            requirements: Object[], groups: Object[], summary: Object|null,
 *            refresh: Function}}
 */
export function useDocumentRequirements(entityNodeRef) {
    const requirements = useApi(entityNodeRef ? 'documents/requirements' : null, {
        params: { entity: entityNodeRef },
    });

    /*
     * `requirements`, not `items`: `listRequirements()` returns
     * `{ requirements, groups, summary, … }`. Reading the wrong key kept this
     * permanently empty — the defect that made two releases look as if no
     * "technical sheet" type was configured anywhere.
     */
    const rows = (requirements.data && Array.isArray(requirements.data.requirements))
        ? requirements.data.requirements
        : [];

    return {
        loading: requirements.loading,
        error: requirements.error,
        sheet: rows.find((row) => row.isTechnicalSheet) || null,
        requirements: rows,
        groups: (requirements.data && Array.isArray(requirements.data.groups))
            ? requirements.data.groups
            : [],
        summary: (requirements.data && requirements.data.summary) || null,
        refresh: requirements.refresh,
    };
}

/**
 * @param {Object} props
 * @param {string} props.entityNodeRef the wizard's entity
 * @param {Object} props.state what {@link useDocumentRequirements} returns
 * @param {boolean} [props.readOnly] entry is closed on this sheet
 * @param {Function} [props.onUploaded] called after a successful upload — the
 *        wizard re-reads the AI suggestions on it
 */
export function TechnicalSheetBanner({
    entityNodeRef,
    state,
    readOnly = false,
    onUploaded,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const { loading, sheet, refresh } = state;

    // The whole band is a drop target, not just the button: the file is already
    // in the supplier's hand when he reads the band.
    const bandRef = useRef(null);
    const [deposits, setDeposits] = useState(0);
    const [replacing, setReplacing] = useState(false);

    const handleUploaded = useCallback(
        (...args) => {
            setDeposits((current) => current + 1);
            setReplacing(false);
            refresh();
            if (onUploaded) {
                onUploaded(...args);
            }
        },
        [refresh, onUploaded],
    );

    if (loading || !sheet) {
        return null;
    }

    const upload = (
        <DocumentUpload
            key={deposits}
            documentRef={sheet.uploadTarget && sheet.uploadTarget.documentRef}
            entityRef={(sheet.uploadTarget && sheet.uploadTarget.entityRef) || entityNodeRef}
            variant="inline"
            action={sheet.isProvided ? 'renew' : 'upload'}
            dropRef={bandRef}
            onUploaded={handleUploaded}
            onCancel={sheet.isProvided ? () => setReplacing(false) : undefined}
        />
    );

    if (!sheet.isProvided) {
        if (readOnly) {
            return (
                <p className={`mt-2 flex items-center gap-1.5 text-sm text-[var(--becpg-dark-grey)] ${className}`}>
                    <Icon name="description" size={16} className="shrink-0" />
                    <span>{labels.missingClosed}</span>
                </p>
            );
        }
        return (
            <div
                ref={bandRef}
                className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3 py-2.5 ${className}`}
            >
                <p className="flex min-w-[16rem] flex-1 items-start gap-2 text-sm text-[var(--status-danger)]">
                    <Icon name="upload_file" size={18} className="mt-px shrink-0" />
                    <span className="min-w-0">
                        <span className="font-medium">{labels.missing}</span>{' '}
                        <span className="text-[var(--becpg-blue)]">{labels.missingHint}</span>
                    </span>
                </p>
                {upload}
            </div>
        );
    }

    return (
        <div ref={bandRef} className={`mt-2 flex flex-col gap-2 ${className}`}>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--becpg-dark-grey)]">
                <Icon name="check_circle" size={15} className="shrink-0 text-[var(--status-ok)]" />
                <span className="font-medium text-[var(--becpg-blue)]">{labels.title}</span>
                {sheet.modified ? (
                    <span>{fill(labels.deposited, { date: formatDate(sheet.modified, lang) })}</span>
                ) : null}
                {sheet.validTo ? <ExpiryPill validTo={sheet.validTo} /> : null}
                <AiValidationBadge
                    state={sheet.aiValidationState}
                    hints={sheet.aiValidationHints}
                    date={sheet.aiValidationDate}
                />
                {!readOnly && !replacing ? (
                    <button
                        type="button"
                        onClick={() => setReplacing(true)}
                        className="text-[var(--becpg-blue-light)] underline underline-offset-2 hover:opacity-80"
                    >
                        {labels.replace}
                    </button>
                ) : null}
            </p>
            {replacing && !readOnly ? upload : null}
        </div>
    );
}
