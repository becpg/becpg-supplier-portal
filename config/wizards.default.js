/**
 * DEVELOPMENT CRUTCH — standard configuration of the supplier wizards.
 *
 * Transcription of the <config condition="wizard"> block of
 *   becpg/becpg-plm/becpg-plm-share/src/main/resources/alfresco/becpg-plm-share-config.xml
 *
 * ⚠ This is NOT the source of truth. The effective configuration is resolved by SHARE
 * (formId + entityType + siteId + list cascade, client overrides included) and must be
 * consumed through the Share webscript described in doc/becpg-api-contracts.md §8. We parse
 * no XML and we do not reimplement the cascade.
 *
 * This file only exists to run the portal BEFORE that webscript is added.
 * It ignores client overrides (Bridor, Aryzta…). To be removed as soon as the webscript exists.
 *
 * Labels are NOT translated here: `labelId` / `titleId` are keys resolved by
 * beCPG (spec — no i18n layer in the portal for business labels).
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

    /*
     * Product specification — consultation only, never data entry.
     *
     * beCPG declares no `<wizard id="supplier-productSpecification">` at all in
     * `becpg-plm-share-config.xml`: a `bcpg:productSpecification` is a
     * `bcpg:entityV2` carrying `bcpg:entityListsAspect`, so its lists are
     * data, not a fixed structure — hard-coding them here would amount to
     * inventing a model the product does not have.
     *
     * This default therefore gives the only content whose existence is certain: the
     * documents deposited under `SupplierDocuments` of the product specification. The
     * day Share declares a real wizard for this type, it wins priority (see
     * `getWizard`) and its lists appear without a line of code here — that is
     * exactly the rule the wizard already applies to products.
     *
     * `enforceTask: true`: no supplier has a task assigned on a product
     * specification, so the wizard resolves itself read-only. Consultation does
     * not depend on a flag set here but on the server-side security check, which
     * remains the authority (bug #25928).
     */
    'supplier-productSpecification': {
        id: 'supplier-productSpecification',
        draft: false,
        enforceTask: true,
        skipSecurityRules: false,
        steps: [
            { id: 'step1', labelId: 'becpg.wizard.supplier.documents.label', titleId: 'becpg.wizard.supplier.documents.title', type: 'documents' },
        ],
    },

    /* Supplier claim */
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
 * The wizard identifier is derived from the entity type, as in the deliverable URL
 * `/share/page/wizard?id=supplier-{pjt:projectEntity|@type}`: we take the local name of the type.
 * E.g. "bcpg:rawMaterial" -> "supplier-rawMaterial".
 */
export function wizardIdForType(entityType) {
    if (!entityType) {
        return null;
    }
    const localName = entityType.includes(':') ? entityType.split(':')[1] : entityType;
    return `supplier-${localName}`;
}

/**
 * A listId can carry an @N suffix (e.g. "surveyList@1"): several instances of the same
 * list on one entity — the mechanism behind multiple questionnaires (spec §2ter.1).
 */
export function parseListId(listId) {
    if (!listId) {
        return { name: null, index: 0 };
    }
    const [name, index] = listId.split('@');
    return { name, index: index ? Number(index) : 0 };
}
