'use client';

/**
 * **La fiche technique, dans le volet plutôt qu'en première étape.**
 *
 * Elle ouvrait le parcours : une étape à elle seule, avant toute saisie, parce
 * que c'est le document dont l'IA extrait les valeurs. La place était mal
 * choisie pour deux raisons.
 *
 * D'abord, il n'y a rien à *faire* à cette étape quand la fiche est déjà là —
 * et elle l'est souvent, déposée lors d'un référencement précédent ou héritée de
 * la matière première. Le fournisseur traversait donc un écran qui ne lui
 * demandait rien. Ensuite, quand elle manque, c'est justement pendant la saisie
 * qu'on s'en aperçoit : au moment où les suggestions sont vides. La proposer là,
 * à côté d'elles, c'est la proposer quand elle sert.
 *
 * Trois états, et un quatrième qui n'affiche rien :
 *
 * | Situation | Ce que le volet montre |
 * |---|---|
 * | Une fiche est déposée | son nom, sa date de dépôt, sa validité, et de quoi la remplacer |
 * | Le type existe, rien n'est déposé | la zone de dépôt, et pourquoi elle vaut la peine |
 * | Le client n'a pas configuré ce type | **rien du tout** |
 *
 * Le dernier cas est le plus important à respecter : proposer un dépôt sans
 * destination configurée revient à demander un document que personne n'attend
 * et que rien ne rattachera. Mieux vaut ne rien afficher.
 */

import { useCallback, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Button';
import { SkeletonText } from '@/components/ui/Skeleton';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { ExpiryPill } from '@/components/documents/ExpiryPill';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        title: 'Fiche technique',
        deposited: 'Déposée le {date}',
        replace: 'Remplacer la fiche',
        missingHint: 'Améliorez les suggestions en déposant votre fiche technique.',
        readOnly: 'La saisie est fermée sur cette fiche.',
    },
    en: {
        title: 'Technical sheet',
        deposited: 'Uploaded on {date}',
        replace: 'Replace the sheet',
        missingHint: 'Improve the suggestions by uploading your technical sheet.',
        readOnly: 'Entry is closed on this sheet.',
    },
};

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        (vars[key] === undefined || vars[key] === null ? match : String(vars[key])));
}

/**
 * La fiche technique attendue sur cette entité, s'il y en a une.
 *
 * Séparé du rendu pour que le conteneur puisse décider **avant** d'ouvrir une
 * section : sans cela, un client qui n'a pas configuré ce type se retrouvait
 * avec un encart « Fiche technique » vide, ce que le composant ne peut pas
 * signaler à son parent pendant son propre rendu sans effet de bord.
 *
 * @param {string} entityNodeRef
 * @returns {{loading: boolean, sheet: Object|null, refresh: Function}}
 */
export function useTechnicalSheet(entityNodeRef) {
    const requirements = useApi(entityNodeRef ? 'documents/requirements' : null, {
        params: { entity: entityNodeRef },
    });

    /*
     * `requirements`, pas `items` : `listRequirements()` renvoie
     * `{ requirements, groups, summary, … }`. Lire la mauvaise clé rendait le
     * volet vide en permanence — c'est le défaut qui a fait croire pendant deux
     * livraisons qu'aucun type « fiche technique » n'était configuré.
     */
    const sheet = useMemo(() => {
        const rows = (requirements.data && Array.isArray(requirements.data.requirements))
            ? requirements.data.requirements
            : [];
        return rows.find((row) => row.isTechnicalSheet) || null;
    }, [requirements.data]);

    return { loading: requirements.loading, sheet, refresh: requirements.refresh };
}

/**
 * @param {Object} props
 * @param {string} props.entityNodeRef l'entité de l'assistant
 * @param {Object} props.state ce que rend {@link useTechnicalSheet}
 * @param {boolean} [props.readOnly]
 * @param {Function} [props.onUploaded] appelé après un dépôt réussi — le volet
 *        s'en sert pour relancer l'analyse
 */
export function TechnicalSheetPanel({ entityNodeRef, state, readOnly = false, onUploaded }) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const { loading, sheet, refresh } = state;

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

    if (loading) {
        return <SkeletonText lines={2} />;
    }
    if (!sheet) {
        return null;
    }

    return (
        <div className="flex flex-col gap-2">
            {sheet.isProvided ? (
                /*
                    UNE LIGNE, PAS UN DOSSIER.
                
                    Le bloc reprenait le nom du fichier sous un encart déjà
                    intitulé « Fiche technique », puis repliait le remplacement
                    derrière un dépliant — trois niveaux pour dire « elle est là,
                    depuis telle date ». Ce qui sert au fournisseur, c'est la
                    date de dépôt, la validité, et pouvoir la remplacer.
                */
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Icon name="check_circle" size={15} className="shrink-0 text-[var(--becpg-green)]" />
                    {sheet.modified ? (
                        <span className="text-sm text-[var(--becpg-dark-grey)]">
                            {fill(labels.deposited, { date: formatDate(sheet.modified, lang) })}
                        </span>
                    ) : null}
                    {sheet.validTo ? <ExpiryPill validTo={sheet.validTo} /> : null}
                    {!readOnly ? (
                        <button
                            type="button"
                            onClick={() => setReplacing((current) => !current)}
                            className="text-xs text-[var(--becpg-blue-light)] underline underline-offset-2 hover:opacity-80"
                        >
                            {labels.replace}
                        </button>
                    ) : null}
                    {replacing && !readOnly ? (
                        <div className="w-full">
                            <DocumentUpload
                                key={deposits}
                                documentRef={sheet.uploadTarget && sheet.uploadTarget.documentRef}
                                entityRef={(sheet.uploadTarget && sheet.uploadTarget.entityRef) || entityNodeRef}
                                variant="zone"
                                disabled={readOnly}
                                disabledReason={labels.readOnly}
                                onUploaded={handleUploaded}
                            />
                        </div>
                    ) : null}
                </div>
            ) : (
                <>
                    <p className="text-sm text-[var(--becpg-dark-grey)]">{labels.missingHint}</p>
                    <DocumentUpload
                        key={deposits}
                        documentRef={sheet.uploadTarget && sheet.uploadTarget.documentRef}
                        entityRef={(sheet.uploadTarget && sheet.uploadTarget.entityRef) || entityNodeRef}
                        variant="zone"
                        disabled={readOnly}
                        disabledReason={labels.readOnly}
                        aiValidation={sheet.aiValidationState}
                        onUploaded={handleUploaded}
                    />
                </>
            )}
        </div>
    );
}
