'use client';

/**
 * **Étape 1 — la fiche technique du fournisseur** (spec §4.4).
 *
 * ## Pourquoi cette étape existe, et pourquoi elle est seule en tête
 *
 * L'assistant commençait par *tous* les documents, pour que l'IA les lise avant
 * toute saisie. L'ordre était faux : beCPG **calcule les types de documents
 * attendus à partir des données saisies** — une allégation « sans OGM » appelle
 * son attestation, un label bio son certificat (`DocumentFormulationHandler`,
 * §4.5). En première étape la liste est donc vide ou fausse, et on demandait au
 * fournisseur de deviner ce que le système ne savait pas encore.
 *
 * Un seul document échappe à cette règle : la fiche technique, demandée dans
 * tous les cas quelles que soient les données. C'est donc elle qui ouvre le
 * parcours, et elle seule qui nourrit les suggestions d'extraction — c'est le
 * document qui contient les valeurs à reprendre.
 *
 * ## Comment la fiche est reconnue
 *
 * Par son **type de document**, résolu parmi les exigences que beCPG calcule sur
 * l'entité (`GET /api/v1/documents/requirements`). Le portail n'invente pas le
 * type : il reconnaît celui que le client a configuré, via
 * `PORTAL_TECHNICAL_SHEET_TYPES` — une liste de libellés ou de codes — dont les
 * valeurs par défaut couvrent les formulations courantes. Le rapprochement est
 * fait **côté serveur** (`lib/adapters/technicalSheet.js`) et arrive ici sous la
 * forme d'un simple `isTechnicalSheet` par exigence.
 *
 * Si aucune exigence ne correspond — un client qui n'a pas configuré ce type —
 * l'étape ne devient pas un cul-de-sac : elle offre un dépôt libre sur l'entité,
 * exactement comme la zone « autre document » de l'étape Documents. Le
 * fournisseur peut toujours avancer ; c'est la configuration qui est incomplète,
 * pas son dossier.
 */

import { useCallback, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { ExpiryPill } from '@/components/documents/ExpiryPill';
import { StepReadOnlyNotice } from '@/components/wizard/steps/FormStep';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        title: 'Fiche technique du produit',
        subtitle:
            'Déposez la fiche technique : c’est le seul document demandé à ce stade, '
            + 'et c’est celui dont le portail extrait les valeurs de la fiche produit.',
        provided: 'Fournie',
        awaited: 'Attendue',
        mandatory: 'Obligatoire',
        replace: 'Remplacer la fiche',
        deposited: 'Déposée le {date}',
        fallbackTitle: 'Aucun type « fiche technique » configuré',
        fallbackHint:
            'Votre client n’a pas déclaré d’exigence de fiche technique sur ce produit. '
            + 'Vous pouvez tout de même en déposer une ici ; elle sera classée automatiquement.',
        nextHint:
            'Une fois la fiche déposée, l’étape suivante vous proposera les valeurs '
            + 'que le portail y aura lues. Vous gardez la main sur chacune.',
        readOnly: 'Lecture seule',
    },
    en: {
        title: 'Product technical sheet',
        subtitle:
            'Upload the technical sheet: it is the only document asked for at this stage, '
            + 'and the one the portal reads the product values from.',
        provided: 'Provided',
        awaited: 'Expected',
        mandatory: 'Mandatory',
        replace: 'Replace the sheet',
        deposited: 'Uploaded on {date}',
        fallbackTitle: 'No "technical sheet" type configured',
        fallbackHint:
            'Your customer declared no technical sheet requirement on this product. '
            + 'You may still upload one here; it will be classified automatically.',
        nextHint:
            'Once the sheet is uploaded, the next step will offer the values the portal '
            + 'read from it. Each one stays yours to accept or refuse.',
        readOnly: 'Read only',
    },
};

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])),
    );
}

/**
 * @param {Object} props
 * @param {string} props.entityNodeRef
 * @param {Object} props.step the synthetic step, for its read-only state
 * @param {string|null} [props.readOnlyReason]
 * @param {Object} [props.autoSave]
 * @param {Function} [props.onUploaded] the wizard refreshes the suggestions with it
 * @param {string} [props.className]
 */
export function TechnicalSheetStep({
    entityNodeRef,
    step,
    readOnlyReason = null,
    autoSave,
    onUploaded,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;

    const requirements = useApi(entityNodeRef ? 'documents/requirements' : null, {
        params: { entity: entityNodeRef },
    });

    /*
     * `requirements`, pas `items`.
     *
     * `listRequirements()` renvoie `{ requirements, groups, summary, scope,
     * supplierScope, pagination }` — il n'y a **aucune** clé `items`. Cet écran
     * lisait `data.items`, obtenait donc toujours un tableau vide, ne trouvait
     * jamais de fiche technique, et affichait « Aucun type "fiche technique"
     * configuré » quelles que soient les données.
     *
     * C'était le **second** défaut sur ce message, empilé sur celui de
     * `isTechnicalSheet()` corrigé en 0.0.13 : même une fois la reconnaissance
     * réparée, la liste à reconnaître restait vide. Mesuré sur dev le 12/08 —
     * l'exigence `Fiche technique fournisseur` existe bien sur `MP96896`, avec le
     * bon `bcpg:documentTypeRef`, et l'écran l'ignorait.
     */
    const items = useMemo(
        () => (requirements.data && Array.isArray(requirements.data.requirements)
            ? requirements.data.requirements
            : []),
        [requirements.data],
    );

    /*
     * The flag is the SERVER's, not this component's.
     *
     * `GET /api/v1/documents/requirements` marks the requirement carrying the
     * technical sheet (`lib/adapters/documents.js`), because the patterns live in
     * `PORTAL_TECHNICAL_SHEET_TYPES` and `process.env` does not reach a client
     * component: matching here would quietly ignore the instance's own
     * configuration and fall back on our defaults.
     */
    const sheet = useMemo(() => items.find((item) => item.isTechnicalSheet) || null, [items]);

    const [deposits, setDeposits] = useState(0);
    const readOnly = Boolean(step && step.readOnly);

    const handleUploaded = useCallback(
        (result) => {
            requirements.refresh();
            setDeposits((count) => count + 1);
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
                />
            ) : null}

            <Card title={labels.title} subtitle={labels.subtitle} icon="description" padding="md">
                {requirements.loading ? <SkeletonCard lines={3} /> : null}

                {!requirements.loading && requirements.error ? (
                    <ErrorState error={requirements.error} onRetry={requirements.refresh} />
                ) : null}

                {!requirements.loading && !requirements.error && sheet ? (
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Icon
                                name="description"
                                size={18}
                                className="shrink-0 text-[var(--becpg-dark-grey)]"
                            />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--becpg-blue)]">
                                {(sheet.type && sheet.type.name) || sheet.name}
                            </span>
                            {sheet.isMandatory ? (
                                <span className="pill pill-no-dot pill-sm">{labels.mandatory}</span>
                            ) : null}
                            <StatusPill
                                status={sheet.isProvided ? 'valid' : 'missing'}
                                tone={sheet.isProvided ? 'ok' : 'warn'}
                                icon={sheet.isProvided ? 'check' : 'schedule'}
                                size="sm"
                                label={sheet.isProvided ? labels.provided : labels.awaited}
                            />
                            {sheet.validTo ? <ExpiryPill validTo={sheet.validTo} /> : null}
                        </div>

                        {sheet.isProvided && sheet.modified ? (
                            <p className="text-xs text-[var(--becpg-dark-grey)]">
                                {fill(labels.deposited, {
                                    date: formatDate(sheet.modified, lang),
                                })}
                            </p>
                        ) : null}

                        <DocumentUpload
                            key={deposits}
                            documentRef={sheet.uploadTarget.documentRef}
                            entityRef={sheet.uploadTarget.entityRef || entityNodeRef}
                            variant="zone"
                            disabled={readOnly}
                            disabledReason={labels.readOnly}
                            aiValidation={sheet.aiValidationState}
                            onUploaded={handleUploaded}
                        />
                    </div>
                ) : null}

                {!requirements.loading && !requirements.error && !sheet ? (
                    <div className="flex flex-col gap-3">
                        <EmptyState
                            variant="empty"
                            icon="help_outline"
                            title={labels.fallbackTitle}
                            message={labels.fallbackHint}
                        />
                        <DocumentUpload
                            key={deposits}
                            entityRef={entityNodeRef}
                            variant="zone"
                            disabled={readOnly}
                            disabledReason={labels.readOnly}
                            onUploaded={handleUploaded}
                        />
                    </div>
                ) : null}
            </Card>

            <p className="mt-3 flex items-start gap-1.5 text-xs text-[var(--becpg-dark-grey)]">
                <Icon name="lightbulb" size={14} className="mt-px shrink-0" />
                <span>{labels.nextHint}</span>
            </p>
        </div>
    );
}
