/**
 * **Fallback translations of the beCPG wizard step keys.**
 *
 * A step of `config/wizards.default.js` carries a message key (`labelId`,
 * `titleId`) and no label: the keys belong to beCPG's `becpg-forms.properties`,
 * and Share resolves them in the caller's language when the portal reads the
 * wizard through `becpg/portal/wizard`. That is still how a label is obtained —
 * nothing here overrides a label the repository sent.
 *
 * **But nothing resolved them when Share did not answer.** The default wizards
 * are the fallback the portal runs on when the Share endpoint is absent or
 * refuses the call, and every step then had an empty label: the assistant, the
 * product tabs and the step rail printed « step1 », « step2 »… down to
 * « step10 », in every language. A screen that says `step7` says less than one
 * that says « Allégations », and it says it in no language at all.
 *
 * So the same keys are mirrored here, in the portal's two chrome languages,
 * copied verbatim from `becpg-forms_fr.properties` / `becpg-forms_en.properties`
 * (the values, not a translation of our own). This is not a second i18n layer:
 * it is the fallback structure's own vocabulary, next to the fallback structure,
 * used only when the repository answered nothing. A key that is not here — a
 * customer's own wizard step — keeps degrading the way it always did.
 *
 * Keep in step with `config/wizards.default.js`: a key added there and not here
 * comes back as an empty label.
 */

import { DEFAULT_LANG, inlineLang, normalizeLang } from '@/config/messages';

/** Key → its beCPG wording, per portal language. */
export const WIZARD_MESSAGES = {
    'becpg.wizard.spec.allergenList.label': { fr: 'Allergènes', en: 'Allergens' },
    'becpg.wizard.spec.allergenList.title': { fr: 'Les allergènes que ce cahier des charges encadre.', en: 'The allergens this specification governs.' },
    'becpg.wizard.spec.forbiddenIngList.label': { fr: 'Ingrédients interdits', en: 'Forbidden ingredients' },
    'becpg.wizard.spec.forbiddenIngList.title': { fr: 'Les ingrédients que ce cahier des charges interdit, tolère ou limite, avec les seuils applicables.', en: 'The ingredients this specification forbids, tolerates or limits, with the applicable thresholds.' },
    'becpg.wizard.spec.microbioList.label': { fr: 'Microbiologie', en: 'Microbiology' },
    'becpg.wizard.spec.microbioList.title': { fr: 'Les critères microbiologiques exigés.', en: 'The microbiological criteria required.' },
    'becpg.wizard.spec.nutList.label': { fr: 'Nutriments', en: 'Nutrients' },
    'becpg.wizard.spec.nutList.title': { fr: 'Les valeurs nutritionnelles attendues et leurs fourchettes.', en: 'The expected nutritional values and their ranges.' },
    'becpg.wizard.spec.physicoChemList.label': { fr: 'Physico-chimiques', en: 'Physico-chemical' },
    'becpg.wizard.spec.physicoChemList.title': { fr: 'Les caractéristiques physico-chimiques exigées.', en: 'The physico-chemical characteristics required.' },
    'becpg.wizard.supplier.allergenList.label': { fr: 'Allergènes', en: 'Allergens' },
    'becpg.wizard.supplier.allergenList.title': { fr: 'Veuillez renseigner les allergènes présents dans les ingrédients et les risques de contamination croisée.', en: 'Please enter the allergens that are present in the ingredients.' },
    'becpg.wizard.supplier.certification.label': { fr: 'Certifications', en: 'Certifications' },
    'becpg.wizard.supplier.certification.title': { fr: 'Veuillez renseigner les certifications.', en: 'Please enter the certifications.' },
    'becpg.wizard.supplier.contactList.label': { fr: 'Contacts', en: 'Contacts' },
    'becpg.wizard.supplier.contactList.title': { fr: 'Veuillez renseigner les contacts.', en: 'Please enter the contacts.' },
    'becpg.wizard.supplier.documents.label': { fr: 'Documents', en: 'Documents' },
    'becpg.wizard.supplier.ingList.label': { fr: 'Ingrédients', en: 'Ingredients' },
    'becpg.wizard.supplier.ingList.title': { fr: 'Veuillez renseigner vos ingrédients, tous les champs doivent être renseignés.', en: 'Please enter ingredients, all fields are needed.' },
    'becpg.wizard.supplier.labelClaimList.label': { fr: 'Allégations', en: 'Claims' },
    'becpg.wizard.supplier.labelClaimList.title': { fr: 'Veuillez renseigner les allégations possibles.', en: 'Please enter possible label claims.' },
    'becpg.wizard.supplier.microbioList.label': { fr: 'Microbiologie', en: 'Microbiology' },
    'becpg.wizard.supplier.microbioList.title': { fr: 'Veuillez renseigner les caractéristiques microbiologiques.', en: 'Please enter the microbiological characteristics.' },
    'becpg.wizard.supplier.nutList.label': { fr: 'Nutriments', en: 'Nutrients' },
    'becpg.wizard.supplier.nutList.title': { fr: 'Veuillez renseigner les valeurs nutritionnelles.', en: 'Please enter the nutritional information.' },
    'becpg.wizard.supplier.organoList.label': { fr: 'Organoleptique', en: 'Organoleptic' },
    'becpg.wizard.supplier.organoList.title': { fr: 'Veuillez renseigner les caractéristiques organoleptiques.', en: 'Please enter the organoleptic characteristics.' },
    'becpg.wizard.supplier.packMaterialList.label': { fr: 'Matériaux', en: 'Materials' },
    'becpg.wizard.supplier.packMaterialList.title': { fr: 'Veuillez renseigner les matériaux.', en: 'Please enter the materials.' },
    'becpg.wizard.supplier.physicoChemList.label': { fr: 'Physico-chimiques', en: 'Physicochemicals' },
    'becpg.wizard.supplier.physicoChemList.title': { fr: 'Veuillez renseigner les caractéristiques physico-chimiques, toutes les lignes doivent être complétées.', en: 'Please enter the physicochemicals. All row have to be filled.' },
    'becpg.wizard.supplier.plant.label': { fr: 'Usines', en: 'Plants' },
    'becpg.wizard.supplier.plant.title': { fr: 'Veuillez renseigner les usines.', en: 'Please enter the plants.' },
    'becpg.wizard.supplier.properties.label': { fr: 'Informations fournisseur', en: 'Supplier information' },
    'becpg.wizard.supplier.surveyList.label': { fr: 'Questionnaire', en: 'Survey' },
    'becpg.wizard.supplier.surveyList.title': { fr: 'Veuillez répondre au questionnaire.', en: 'Please complete the survey.' },
};

/**
 * The wording of a beCPG wizard message key, or `''` when it is not one we know.
 *
 * @param {string|null} key `becpg.wizard.supplier.ingList.label`
 * @param {string} [lang] portal language; falls back to the default one
 * @returns {string} the wording, or an empty string — never the key itself,
 *   which would print `becpg.wizard.…` on screen
 */
export function wizardMessage(key, lang) {
    const entry = key ? WIZARD_MESSAGES[key] : null;
    if (!entry) {
        return '';
    }
    const code = inlineLang(normalizeLang(lang)) ?? 'en';
    return entry[code] || entry[DEFAULT_LANG] || '';
}
