/**
 * BÉQUILLE DE DÉVELOPPEMENT — configuration standard des assistants fournisseur.
 *
 * Transcription du bloc <config condition="wizard"> de
 *   becpg/becpg-plm/becpg-plm-share/src/main/resources/alfresco/becpg-plm-share-config.xml
 *
 * ⚠ Ce n'est PAS la source de vérité. La configuration effective est résolue par SHARE
 * (cascade formId + entityType + siteId + list, surcharges client comprises) et doit être
 * consommée via le webscript Share décrit dans doc/becpg-api-contracts.md §8. On ne parse
 * aucun XML et on ne réimplémente pas la cascade.
 *
 * Ce fichier n'existe que pour faire tourner le portail AVANT que ce webscript soit ajouté.
 * Il ignore les surcharges client (Bridor, Aryzta…). À supprimer dès que le webscript existe.
 *
 * Les libellés ne sont PAS traduits ici : `labelId` / `titleId` sont des clés résolues par
 * beCPG (spec — pas de couche i18n dans le portail pour les libellés métier).
 */

const FORMULATE = 'becpg/remote/formulate?nodeRef={nodeRef}&format=json';
const SUPPLIER_DOCS = 'becpg/project/path?nodeRef={nodeRef}&path=SupplierDocuments';

export const DEFAULT_WIZARDS = {
    'supplier-rawMaterial': {
        id: 'supplier-rawMaterial',
        draft: true,
        comments: true,
        enforceTask: true,
        skipSecurityRules: false,
        steps: [
            { id: 'step1', labelId: 'becpg.wizard.supplier.properties.label', titleId: 'becpg.wizard.supplier.properties.title', type: 'form', formId: 'supplier', itemId: 'bcpg:rawMaterial' },
            { id: 'step2', labelId: 'becpg.wizard.supplier.surveyList.label', titleId: 'becpg.wizard.supplier.surveyList.title', type: 'survey', listId: 'surveyList', itemId: 'survey:surveyList', nextStepWebScript: FORMULATE },
            { id: 'step3', labelId: 'becpg.wizard.supplier.ingList.label', titleId: 'becpg.wizard.supplier.ingList.title', type: 'entityDataList', listId: 'ingList', itemId: 'bcpg:ingList', nextStepWebScript: FORMULATE },
            { id: 'step4', labelId: 'becpg.wizard.supplier.nutList.label', titleId: 'becpg.wizard.supplier.nutList.title', type: 'entityDataList', listId: 'nutList', itemId: 'bcpg:nutList' },
            { id: 'step5', labelId: 'becpg.wizard.supplier.allergenList.label', titleId: 'becpg.wizard.supplier.allergenList.title', type: 'entityDataList', listId: 'allergenList', itemId: 'bcpg:allergenList' },
            { id: 'step6', labelId: 'becpg.wizard.supplier.physicoChemList.label', titleId: 'becpg.wizard.supplier.physicoChemList.title', type: 'entityDataList', listId: 'physicoChemList', itemId: 'bcpg:physicoChemList' },
            { id: 'step7', labelId: 'becpg.wizard.supplier.labelClaimList.label', titleId: 'becpg.wizard.supplier.labelClaimList.title', type: 'entityDataList', listId: 'labelClaimList', itemId: 'bcpg:labelClaimList' },
            { id: 'step8', labelId: 'becpg.wizard.supplier.microbioList.label', titleId: 'becpg.wizard.supplier.microbioList.title', type: 'entityDataList', listId: 'microbioList', itemId: 'bcpg:microbioList' },
            { id: 'step9', labelId: 'becpg.wizard.supplier.organoList.label', titleId: 'becpg.wizard.supplier.organoList.title', type: 'entityDataList', listId: 'organoList', itemId: 'bcpg:organoList', nextStepWebScript: SUPPLIER_DOCS },
            { id: 'step10', labelId: 'becpg.wizard.supplier.documents.label', titleId: 'becpg.wizard.supplier.documents.title', type: 'documents' },
        ],
    },

    'supplier-finishedProduct': {
        id: 'supplier-finishedProduct',
        draft: true,
        comments: true,
        enforceTask: true,
        skipSecurityRules: false,
        steps: [
            { id: 'step1', labelId: 'becpg.wizard.supplier.properties.label', titleId: 'becpg.wizard.supplier.properties.title', type: 'form', formId: 'supplier', itemId: 'bcpg:finishedProduct' },
            { id: 'step2', labelId: 'becpg.wizard.supplier.ingList.label', titleId: 'becpg.wizard.supplier.ingList.title', type: 'entityDataList', listId: 'ingList', itemId: 'bcpg:ingList', nextStepWebScript: FORMULATE },
            { id: 'step3', labelId: 'becpg.wizard.supplier.nutList.label', titleId: 'becpg.wizard.supplier.nutList.title', type: 'entityDataList', listId: 'nutList', itemId: 'bcpg:nutList' },
            { id: 'step4', labelId: 'becpg.wizard.supplier.allergenList.label', titleId: 'becpg.wizard.supplier.allergenList.title', type: 'entityDataList', listId: 'allergenList', itemId: 'bcpg:allergenList' },
            { id: 'step5', labelId: 'becpg.wizard.supplier.physicoChemList.label', titleId: 'becpg.wizard.supplier.physicoChemList.title', type: 'entityDataList', listId: 'physicoChemList', itemId: 'bcpg:physicoChemList' },
            { id: 'step6', labelId: 'becpg.wizard.supplier.labelClaimList.label', titleId: 'becpg.wizard.supplier.labelClaimList.title', type: 'entityDataList', listId: 'labelClaimList', itemId: 'bcpg:labelClaimList' },
            { id: 'step7', labelId: 'becpg.wizard.supplier.microbioList.label', titleId: 'becpg.wizard.supplier.microbioList.title', type: 'entityDataList', listId: 'microbioList', itemId: 'bcpg:microbioList' },
            { id: 'step8', labelId: 'becpg.wizard.supplier.organoList.label', titleId: 'becpg.wizard.supplier.organoList.title', type: 'entityDataList', listId: 'organoList', itemId: 'bcpg:organoList', nextStepWebScript: SUPPLIER_DOCS },
            { id: 'step9', labelId: 'becpg.wizard.supplier.documents.label', titleId: 'becpg.wizard.supplier.documents.title', type: 'documents' },
        ],
    },

    'supplier-semiFinishedProduct': {
        id: 'supplier-semiFinishedProduct',
        draft: true,
        comments: true,
        enforceTask: true,
        skipSecurityRules: false,
        steps: [
            { id: 'step1', labelId: 'becpg.wizard.supplier.properties.label', titleId: 'becpg.wizard.supplier.properties.title', type: 'form', formId: 'supplier', itemId: 'bcpg:semiFinishedProduct' },
            { id: 'step2', labelId: 'becpg.wizard.supplier.ingList.label', titleId: 'becpg.wizard.supplier.ingList.title', type: 'entityDataList', listId: 'ingList', itemId: 'bcpg:ingList', nextStepWebScript: FORMULATE },
            { id: 'step3', labelId: 'becpg.wizard.supplier.nutList.label', titleId: 'becpg.wizard.supplier.nutList.title', type: 'entityDataList', listId: 'nutList', itemId: 'bcpg:nutList' },
            { id: 'step4', labelId: 'becpg.wizard.supplier.allergenList.label', titleId: 'becpg.wizard.supplier.allergenList.title', type: 'entityDataList', listId: 'allergenList', itemId: 'bcpg:allergenList' },
            { id: 'step5', labelId: 'becpg.wizard.supplier.physicoChemList.label', titleId: 'becpg.wizard.supplier.physicoChemList.title', type: 'entityDataList', listId: 'physicoChemList', itemId: 'bcpg:physicoChemList' },
            { id: 'step6', labelId: 'becpg.wizard.supplier.labelClaimList.label', titleId: 'becpg.wizard.supplier.labelClaimList.title', type: 'entityDataList', listId: 'labelClaimList', itemId: 'bcpg:labelClaimList' },
            { id: 'step7', labelId: 'becpg.wizard.supplier.microbioList.label', titleId: 'becpg.wizard.supplier.microbioList.title', type: 'entityDataList', listId: 'microbioList', itemId: 'bcpg:microbioList' },
            { id: 'step8', labelId: 'becpg.wizard.supplier.organoList.label', titleId: 'becpg.wizard.supplier.organoList.title', type: 'entityDataList', listId: 'organoList', itemId: 'bcpg:organoList', nextStepWebScript: SUPPLIER_DOCS },
            { id: 'step9', labelId: 'becpg.wizard.supplier.documents.label', titleId: 'becpg.wizard.supplier.documents.title', type: 'documents' },
        ],
    },

    'supplier-packagingMaterial': {
        id: 'supplier-packagingMaterial',
        draft: true,
        comments: true,
        enforceTask: true,
        skipSecurityRules: false,
        steps: [
            { id: 'step1', labelId: 'becpg.wizard.supplier.properties.label', titleId: 'becpg.wizard.supplier.properties.title', type: 'form', formId: 'supplier', itemId: 'bcpg:packagingMaterial' },
            { id: 'step2', labelId: 'becpg.wizard.supplier.physicoChemList.label', titleId: 'becpg.wizard.supplier.physicoChemList.title', type: 'entityDataList', listId: 'physicoChemList', itemId: 'bcpg:physicoChemList' },
            { id: 'step3', labelId: 'becpg.wizard.supplier.labelClaimList.label', titleId: 'becpg.wizard.supplier.labelClaimList.title', type: 'entityDataList', listId: 'labelClaimList', itemId: 'bcpg:labelClaimList' },
            { id: 'step4', labelId: 'becpg.wizard.supplier.packMaterialList.label', titleId: 'becpg.wizard.supplier.packMaterialList.title', type: 'entityDataList', listId: 'packMaterialList', itemId: 'pack:packMaterialList', nextStepWebScript: SUPPLIER_DOCS },
            { id: 'step5', labelId: 'becpg.wizard.supplier.documents.label', titleId: 'becpg.wizard.supplier.documents.title', type: 'documents' },
        ],
    },

    'supplier-packagingKit': {
        id: 'supplier-packagingKit',
        draft: true,
        enforceTask: true,
        skipSecurityRules: false,
        steps: [
            { id: 'step1', labelId: 'becpg.wizard.supplier.properties.label', titleId: 'becpg.wizard.supplier.properties.title', type: 'form', formId: 'supplier', itemId: 'bcpg:packagingKit' },
        ],
    },

    'supplier-supplier': {
        id: 'supplier-supplier',
        draft: true,
        enforceTask: true,
        skipSecurityRules: false,
        steps: [
            { id: 'step1', labelId: 'becpg.wizard.supplier.properties.label', titleId: 'becpg.wizard.supplier.properties.title', type: 'form', formId: 'supplier', itemId: 'bcpg:supplier' },
            { id: 'step2', labelId: 'becpg.wizard.supplier.surveyList.label', titleId: 'becpg.wizard.supplier.surveyList.title', type: 'survey', listId: 'surveyList', itemId: 'survey:surveyList', nextStepWebScript: FORMULATE },
            { id: 'step3', labelId: 'becpg.wizard.supplier.certification.label', titleId: 'becpg.wizard.supplier.certification.title', type: 'entityDataList', listId: 'certification', itemId: 'bcpg:certification' },
            { id: 'step4', labelId: 'becpg.wizard.supplier.plant.label', titleId: 'becpg.wizard.supplier.plant.title', type: 'entityDataList', listId: 'plant', itemId: 'bcpg:plant' },
            { id: 'step5', labelId: 'becpg.wizard.supplier.contactList.label', titleId: 'becpg.wizard.supplier.contactList.title', type: 'entityDataList', listId: 'contactList', itemId: 'bcpg:contactList', nextStepWebScript: SUPPLIER_DOCS },
            { id: 'step6', labelId: 'becpg.wizard.supplier.documents.label', titleId: 'becpg.wizard.supplier.documents.title', type: 'documents' },
        ],
    },

    'supplier-content': {
        id: 'supplier-content',
        draft: true,
        enforceTask: true,
        skipSecurityRules: false,
        steps: [
            { id: 'step1', labelId: 'becpg.wizard.supplier.documents.label', titleId: 'becpg.wizard.supplier.documents.title', type: 'documents' },
        ],
    },

    /* Réclamation fournisseur */
    'supplier-nc': {
        id: 'supplier-nc',
        draft: true,
        comments: true,
        enforceTask: true,
        skipSecurityRules: false,
        steps: [
            { id: 'step1', label: 'Réclamation fournisseur', titleId: 'becpg.wizard.supplier.properties.title', type: 'form', formId: 'supplier', itemId: 'qa:nc', nextStepWebScript: SUPPLIER_DOCS },
            { id: 'step2', labelId: 'becpg.wizard.supplier.documents.label', titleId: 'becpg.wizard.supplier.documents.title', type: 'documents' },
        ],
    },

    'sample-survey': {
        id: 'sample-survey',
        draft: true,
        enforceTask: false,
        skipSecurityRules: false,
        steps: [
            { id: 'step1', labelId: 'becpg.wizard.supplier.properties.label', titleId: 'becpg.wizard.supplier.properties.title', type: 'form', formId: 'supplier', itemId: 'bcpg:supplier' },
            { id: 'step2', label: 'Sample survey 1', title: 'Sample survey 1', type: 'survey', listId: 'surveyList', itemId: 'survey:surveyList', nextStepWebScript: FORMULATE },
            { id: 'step3', label: 'Sample survey 2', title: 'Sample survey 2', type: 'survey', listId: 'surveyList@1', itemId: 'survey:surveyList', nextStepWebScript: FORMULATE },
        ],
    },
};

/**
 * L'identifiant de wizard est dérivé du type d'entité, comme dans l'URL de livrable
 * `/share/page/wizard?id=supplier-{pjt:projectEntity|@type}` : on prend le nom local du type.
 * Ex. "bcpg:rawMaterial" -> "supplier-rawMaterial".
 */
export function wizardIdForType(entityType) {
    if (!entityType) {
        return null;
    }
    const localName = entityType.includes(':') ? entityType.split(':')[1] : entityType;
    return `supplier-${localName}`;
}

/**
 * Un listId peut porter un suffixe @N (ex. "surveyList@1") : plusieurs instances de la même
 * liste sur une entité — mécanisme des questionnaires multiples (spec §2ter.1).
 */
export function parseListId(listId) {
    if (!listId) {
        return { name: null, index: 0 };
    }
    const [name, index] = listId.split('@');
    return { name, index: index ? Number(index) : 0 };
}
