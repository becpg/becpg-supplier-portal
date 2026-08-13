/**
 * **Quelles suggestions demander pour l'étape en cours.**
 *
 * becpg-ai sait borner son analyse à une liste : `GET /api/suggestions/{id}?listId=…`
 * traduit l'identifiant en types de suggestions
 * (`SuggestionServiceImpl.resolveRequestedSuggestionTypes`) et n'exécute que les
 * plugins qui les produisent. C'est ce que fait déjà l'action « Suggestions » de
 * Share, qui passe la liste ouverte dans l'écran.
 *
 * Le portail transportait ce paramètre sans jamais le renseigner : il demandait
 * tout, à chaque fois. Le fournisseur recevait donc, sur l'étape « Nutriments »,
 * la correction orthographique de ses libellés et l'examen de ses certificats —
 * et il attendait que les quinze plugins aient tourné pour les voir.
 *
 * ## Un identifiant inconnu ne rend RIEN
 *
 * Le point qui gouverne tout ce fichier : face à un `listId` qu'il ne connaît
 * pas, becpg-ai ne se rabat pas sur « tout », il répond **vide** en journalisant
 * un avertissement. Envoyer au hasard le nom d'une liste beCPG — `View-documents`,
 * `packagingList` — vide donc le volet sans rien dire.
 *
 * Cette table ne contient par conséquent **que** des identifiants vérifiés dans
 * le code de becpg-ai, et {@link suggestionScopeForStep} répond `undefined`
 * — « demande tout » — plutôt que de risquer un identifiant non reconnu.
 */

/**
 * Les `listId` que becpg-ai sait traduire, relevés dans
 * `SuggestionServiceImpl.resolveRequestedSuggestionTypes` (26.1, 2026-08-13).
 *
 * Y ajouter une entrée sans l'avoir vérifiée là-bas revient à éteindre le volet
 * pour l'étape concernée.
 */
export const KNOWN_LIST_IDS = new Set([
    'View-properties',
    'allergenList',
    'ingList',
    'nutList',
    'microbioList',
    'physicoChemList',
    'costList',
    'organoList',
    'regulatoryList',
    'ingRegulatoryList',
    'toxList',
    'svhcList',
    'ingLabelingList',
    'labelingRuleList',
]);

/**
 * Le périmètre à demander pour une étape de l'assistant.
 *
 * @param {Object|null} step l'étape courante du modèle du wizard
 * @returns {string|undefined} le `listId` à envoyer, ou `undefined` pour tout
 *   demander
 *
 * @example
 * suggestionScopeForStep({ kind: 'form' });                    // 'View-properties'
 * suggestionScopeForStep({ kind: 'entityDataList', listId: 'nutList' }); // 'nutList'
 * suggestionScopeForStep({ kind: 'documents' });               // undefined
 */
export function suggestionScopeForStep(step) {
    if (!step) {
        return undefined;
    }

    /*
     * Les listes de données portent déjà le bon identifiant : le modèle
     * d'étape du portail expose `listId: 'nutList'` là où l'item est
     * `bcpg:nutList`, et c'est la forme courte que becpg-ai attend.
     */
    if (step.listId && KNOWN_LIST_IDS.has(step.listId)) {
        return step.listId;
    }

    /*
     * Un formulaire, un questionnaire : ce sont les propriétés de l'entité.
     * `View-properties` est l'identifiant que Share envoie pour sa vue
     * propriétés, et il ouvre les cinq plugins de champ — libellés extraits,
     * traductions, orthographe, classification, image.
     */
    if (step.kind === 'form' || step.kind === 'survey') {
        return 'View-properties';
    }

    /*
     * Documents et conformité : aucun identifiant ne les décrit aujourd'hui.
     *
     * L'examen et la classification de documents ne viennent pas d'une liste —
     * becpg-ai construit un contexte par document rattaché — et la conformité
     * catalogue n'est pas une notion d'IA mais un calcul beCPG (`bcpg:entityScore`).
     * On demande donc tout, et on ne ment pas sur le périmètre.
     */
    return undefined;
}
