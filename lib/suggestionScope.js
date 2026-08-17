/**
 * Which suggestions to request for the current step.
 *
 * becpg-ai can narrow its analysis to one list: `GET /api/suggestions/{id}?listId=…`
 * translates the identifier into suggestion types
 * (`SuggestionServiceImpl.resolveRequestedSuggestionTypes`) and only runs the
 * plugins that produce them. This is what Share's « Suggestions » action already
 * does, passing the list open on screen.
 *
 * The portal carried that parameter without ever filling it in: it asked for
 * everything, every time. So on the « Nutriments » step the supplier got the
 * spell check of his labels and the review of his certificates — and he waited
 * for all fifteen plugins to run before seeing them.
 *
 * An unknown identifier returns NOTHING
 *
 * The point that governs this whole file: faced with a `listId` it does not
 * know, becpg-ai does not fall back to "everything", it answers empty and logs
 * a warning. Sending the name of a beCPG list at random — `View-documents`,
 * `packagingList` — therefore empties the panel without saying anything.
 *
 * This table consequently holds only identifiers verified in the becpg-ai
 * source, and {@link suggestionScopeForStep} answers `undefined`
 * — "ask for everything" — rather than risk an unrecognised identifier.
 */

/**
 * The `listId` values becpg-ai knows how to translate, taken from
 * `SuggestionServiceImpl.resolveRequestedSuggestionTypes` (26.1, 2026-08-13).
 *
 * Adding an entry here without checking it over there amounts to switching the
 * panel off for the step concerned.
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
 * The scope to request for one wizard step.
 *
 * @param {Object|null} step the current step of the wizard model
 * @returns {string|undefined} the `listId` to send, or `undefined` to ask for
 *   everything
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
     * Data lists already carry the right identifier: the portal's step model
     * exposes `listId: 'nutList'` where the item is `bcpg:nutList`, and the
     * short form is the one becpg-ai expects.
     */
    if (step.listId && KNOWN_LIST_IDS.has(step.listId)) {
        return step.listId;
    }

    /*
     * A form, a questionnaire: these are the entity's properties.
     * `View-properties` is the identifier Share sends for its properties view,
     * and it opens the five field plugins — extracted labels, translations,
     * spelling, classification, image.
     */
    if (step.kind === 'form' || step.kind === 'survey') {
        return 'View-properties';
    }

    /*
     * Documents and compliance: no identifier describes them today.
     *
     * Document review and classification do not come from a list — becpg-ai
     * builds a context per attached document — and catalog compliance is not an
     * AI notion but a beCPG computation (`bcpg:entityScore`).
     * So we ask for everything, and we do not lie about the scope.
     */
    return undefined;
}
