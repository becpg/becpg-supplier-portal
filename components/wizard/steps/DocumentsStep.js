'use client';

/**
 * **Étape 1 · Documents** — and it is step *one*, not step nine.
 *
 * That inversion is the point of the redesign (spec §4.4). The current wizard
 * asks the supplier to type two hundred values and *then*, at the very end, to
 * attach the documents those values came from. The portal asks for the documents
 * first, because they are what the supplier already has: the specification
 * sheet, the certificates, the analyses. Everything after this step is either
 * extracted from them (step 2) or checked against them.
 *
 * The expected types are **not invented here**: `DocumentFormulationHandler`
 * already materialises them on the entity, with `docTypeFormula` evaluated,
 * mandatory or not, with their validity window (contracts §9, spec §5.4.2). The
 * step reads `GET /api/v1/documents/requirements?entity=…` and renders the
 * check-list — expected / provided / valid until — with a drop zone per line.
 * A type nobody configured shows nothing, which is correct.
 *
 * A deposit is also what feeds the AI: `onUploaded` lets the wizard refresh the
 * suggestions step, so a certificate dropped here can fill fields two steps
 * later.
 */

import { useCallback, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/StatusPill';
import { ListIcon } from '@/components/ui/ListIcon';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { RequirementChecklist } from '@/components/documents/RequirementChecklist';
import { DepositedDocuments } from '@/components/documents/DepositedDocuments';
import { StepReadOnlyNotice } from '@/components/wizard/steps/FormStep';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        title: 'Documents attendus',
        subtitle: 'Ce que votre client attend, et pour quand.',
        otherTitle: 'Autre document',
        otherSubtitle:
            'Déposez ici tout document utile qui ne correspond à aucune exigence ci-dessus (fiche technique, photo, analyse…).',
        blocking: '{count} document(s) obligatoire(s) manquant(s)',
        allGood: 'Tous les documents obligatoires sont fournis',
        readOnly: 'Vous ne pouvez pas déposer de document sur cette fiche.',
    },
    en: {
        title: 'Expected documents',
        subtitle: 'What your customer expects, and by when.',
        otherTitle: 'Other document',
        otherSubtitle:
            'Drop here any useful document that matches none of the requirements above (data sheet, photo, analysis…).',
        blocking: '{count} mandatory document(s) missing',
        allGood: 'Every mandatory document is provided',
        readOnly: 'You cannot deposit a document on this sheet.',
    },
};

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])),
    );
}

/**
 * @param {Object} props
 * @param {string} props.entityNodeRef the entity the documents hang on
 * @param {Object} props.step the computed step (`readOnly` / `frozen` included)
 * @param {string|null} [props.readOnlyReason]
 * @param {Object} [props.autoSave] the wizard's indicator, notified on deposit
 * @param {Function} [props.onUploaded] `(result) => void` — the wizard refreshes the AI step
 * @param {Function} [props.onSummary] `(summary) => void` — feeds the finish gate
 * @param {string} [props.className]
 */
export function DocumentsStep({
    entityNodeRef,
    step,
    readOnlyReason = null,
    autoSave,
    onUploaded,
    onSummary,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;

    const requirements = useApi(entityNodeRef ? 'documents/requirements' : null, {
        params: { entity: entityNodeRef },
        onSuccess: (data) => {
            if (onSummary && data) {
                onSummary(data.summary || null);
            }
        },
    });

    // Bumped on every deposit so the folder listing re-reads: a file dropped
    // through the check-list must appear below without a page reload.
    const [depositCount, setDepositCount] = useState(0);
    const readOnly = Boolean(step && step.readOnly);
    const summary = requirements.data ? requirements.data.summary : null;

    const handleUploaded = useCallback(
        (result) => {
            requirements.refresh();
            setDepositCount((count) => count + 1);
            if (autoSave) {
                autoSave.markSaved();
            }
            if (onUploaded) {
                onUploaded(result);
            }
        },
        [requirements, autoSave, onUploaded],
    );

    return (
        <div className={`min-w-0 ${className}`}>
            {readOnly ? (
                <StepReadOnlyNotice
                    reason={step.frozen ? 'frozen' : readOnlyReason || 'wizardReadOnly'}
                    lang={lang}
                />
            ) : null}

            <div className="mb-3 flex flex-wrap items-center gap-2">
                {/* Same glyph as the stepper entry that opened this step and as
                    the sheet's Documents tab. beCPG ships no PNG for documents
                    — it is not a characteristic list — so `ListIcon` resolves it
                    to the portal's own Material symbol; the point is that one
                    step is not the only heading in the wizard without a picture. */}
                <h3 className="flex items-center gap-2 text-base font-medium text-[var(--becpg-blue)]">
                    <ListIcon type="documents" size={18} />
                    {step.title || step.label || labels.title}
                </h3>
                {summary ? (
                    summary.blocking > 0 ? (
                        <StatusPill
                            status="missing"
                            tone="danger"
                            icon="error"
                            size="sm"
                            label={fill(labels.blocking, { count: summary.blocking })}
                        />
                    ) : (
                        <StatusPill status="valid" tone="ok" icon="check_circle" size="sm" label={labels.allGood} />
                    )
                ) : null}
            </div>
            <p className="mb-3 text-sm text-[var(--becpg-dark-grey)]">{labels.subtitle}</p>

            <RequirementChecklist
                groups={requirements.data ? requirements.data.groups : undefined}
                requirements={requirements.data ? requirements.data.requirements : undefined}
                summary={summary}
                loading={requirements.loading}
                error={requirements.error}
                onRetry={requirements.refresh}
                onUploaded={handleUploaded}
                readOnly={readOnly}
                groupByEntity={false}
            />

            <DepositedDocuments
                entityNodeRef={entityNodeRef}
                refreshKey={depositCount}
                className="mt-4"
            />

            <Card
                title={labels.otherTitle}
                subtitle={labels.otherSubtitle}
                icon="attach_file"
                padding="md"
                className="mt-4"
            >
                <DocumentUpload
                    entityRef={entityNodeRef}
                    variant="zone"
                    disabled={readOnly}
                    disabledReason={labels.readOnly}
                    onUploaded={handleUploaded}
                />
            </Card>
        </div>
    );
}
