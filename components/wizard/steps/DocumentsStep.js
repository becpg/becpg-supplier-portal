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

import { useCallback, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/StatusPill';
import { ListIcon } from '@/components/ui/ListIcon';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { RequirementChecklist } from '@/components/documents/RequirementChecklist';
import { DepositedDocuments } from '@/components/documents/DepositedDocuments';
import { StepReadOnlyNotice } from '@/components/wizard/steps/FormStep';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/wizard/steps/DocumentsStep#LABELS', {
    fr: {
        title: 'Documents attendus',
        subtitle: 'Ce que votre client attend, et pour quand.',
        otherTitle: 'Autres documents',
        otherSubtitle:
            'Les fichiers du dossier qui ne répondent à aucune exigence ci-dessus. Déposez ici tout document utile (photo, analyse…).',
        blocking: '{count} document(s) obligatoire(s) manquant(s)',
        allGood: 'Tous les documents obligatoires sont fournis',
        readOnly: 'Vous ne pouvez pas déposer de document sur cette fiche.',
    },
    en: {
        title: 'Expected documents',
        subtitle: 'What your customer expects, and by when.',
        otherTitle: 'Other documents',
        otherSubtitle:
            'The files in the folder that answer none of the requirements above. Drop here any useful document (photo, analysis…).',
        blocking: '{count} mandatory document(s) missing',
        allGood: 'Every mandatory document is provided',
        readOnly: 'You cannot deposit a document on this sheet.',
    },
});

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
 * @param {Function} [props.onUploaded] `(result, { attempt, last }) => void` — the wizard
 *        refreshes the AI panel, once the deposit has settled
 * @param {Object} props.requirements what `useDocumentRequirements` returns — read
 *        once at wizard level, so the rail knows what is missing before this step
 *        is ever opened and the payload is not fetched twice
 * @param {string} [props.className]
 */
export function DocumentsStep({
    entityNodeRef,
    step,
    readOnlyReason = null,
    autoSave,
    onUploaded,
    requirements,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);

    // Bumped on every deposit so the folder listing re-reads: a file dropped
    // through the check-list must appear below without a page reload.
    const [depositCount, setDepositCount] = useState(0);
    const readOnly = Boolean(step && step.readOnly);
    const summary = requirements.summary;

    /*
     * WHAT THE CHECK-LIST ALREADY DRAWS.
     *
     * The step used to show the requirements and then the whole folder, so every
     * provided document appeared twice, with a different pair of actions each
     * time. The check-list keeps the documents it can attribute to a requirement
     * — and now reads and downloads them in place; the list below keeps the
     * remainder, which is what a supplier deposited outside any expectation and
     * what the signature flow writes with no document type at all.
     */
    const shownByChecklist = useMemo(
        () => (requirements.requirements || [])
            .filter((requirement) => requirement.isProvided)
            .map((requirement) => requirement.nodeRef)
            .filter(Boolean),
        [requirements.requirements],
    );

    const handleUploaded = useCallback(
        // `info` carries `last`, which tells the wizard when the deposit has
        // settled — dropping it made every re-read look like a fresh deposit.
        (result, info) => {
            requirements.refresh();
            setDepositCount((count) => count + 1);
            if (autoSave) {
                autoSave.markSaved();
            }
            if (onUploaded) {
                onUploaded(result, info);
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
                groups={requirements.groups}
                requirements={requirements.requirements}
                summary={summary}
                loading={requirements.loading}
                error={requirements.error}
                onRetry={requirements.refresh}
                onUploaded={handleUploaded}
                readOnly={readOnly}
                groupByEntity={false}
            />

            <Card
                title={labels.otherTitle}
                subtitle={labels.otherSubtitle}
                icon="attach_file"
                padding="md"
                className="mt-4"
            >
                {/* The remainder of the folder and the way to add to it, in one
                    card: they are the same subject, and they were two. */}
                <DepositedDocuments
                    entityNodeRef={entityNodeRef}
                    refreshKey={depositCount}
                    exclude={shownByChecklist}
                    bare
                    className="mb-3"
                />
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
