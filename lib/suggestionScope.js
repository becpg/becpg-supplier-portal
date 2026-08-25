/**
 * Which suggestions to request for the current step.
 *
 * becpg-ai narrows its analysis to the list named to it:
 * `GET /api/suggestions/{id}?listId=…` translates the identifier into suggestion
 * types (`SuggestionServiceImpl.resolveRequestedSuggestionTypes`) and only runs
 * the plugins that produce them. Share's « Suggestions » action passes the list
 * open on screen and nothing else; the portal does the same.
 *
 * The step's list is always sent, whatever it is. Deciding here which
 * identifiers are worth sending would put in the portal a piece of becpg-ai's
 * routing table, which drifts the day a plugin is added there — and it is the
 * wrong half of the problem anyway: what a supplier may act on is settled on the
 * way back, by keeping only the suggestions a document grounds
 * (`isDocumentGrounded`).
 *
 * An identifier becpg-ai does not know answers empty, and that is its answer to
 * give.
 */

/**
 * The `listId` to request for one wizard step.
 *
 * The same pseudo-list vocabulary as everywhere else in the portal — see
 * `securityListName` in `lib/adapters/wizardConfig.js`: a form has no real
 * datalist and reads through `View-properties`, the documents step through
 * `View-documents`, every other step carries its own list.
 *
 * @param {Object|null} step the current step of the wizard model
 * @returns {string|undefined} the `listId` to send, `undefined` for a step that
 *   is bound to no list at all
 *
 * @example
 * suggestionScopeForStep({ kind: 'form' });                              // 'View-properties'
 * suggestionScopeForStep({ kind: 'documents' });                         // 'View-documents'
 * suggestionScopeForStep({ kind: 'entityDataList', listId: 'nutList' }); // 'nutList'
 */
export function suggestionScopeForStep(step) {
    if (!step) {
        return undefined;
    }
    if (step.kind === 'form') {
        return 'View-properties';
    }
    if (step.kind === 'documents') {
        return 'View-documents';
    }
    return step.listId || undefined;
}
