/**
 * `POST /api/v1/documents/{id}/ai-review` — ask becpg-ai to look at a document
 * that was just deposited, and write its verdict back.
 *
 * ## Why this route exists at all
 *
 * `DocumentUpload.js` used to wait for `bcpg:aiValidationState` to appear on the
 * row it had just uploaded, re-reading it a few times and then giving up. That
 * poll could only ever give up: **nothing in beCPG calls becpg-ai**. The
 * repository has the `bcpg:aiAspect` fields and the portal renders them, but no
 * writer sits between the two. The verdict the UI waited for had no author.
 *
 * Rather than add a caller inside beCPG — spec §7.2 keeps that repository
 * additive-only, and a portal must not grow a scheduler in it — the portal asks
 * for the review itself, at the one moment it is wanted: right after the upload
 * it just performed.
 *
 * ## The entry point this relies on
 *
 * `GET /api/suggestions/{id}` on becpg-ai accepts a **document** id, not only an
 * entity id. `createSuggestionContext` looks at the node's type, sees
 * `cm:content`, keeps it as `currentDocument` and resolves the owning entity
 * from `bcpg:documentEntityRef`. That is undocumented and worth stating plainly,
 * because everything here rests on it.
 *
 * Measured on an AI-enabled instance, `GET /api/suggestions/f7de9b31-…?locale=fr-FR`:
 * 200 in ~22 s, five items, of which one
 * `{"type":"DocumentReview","confidence":80,"documentId":"f7de9b31-…"}` whose
 * `suggestedChanges` set `bcpg:aiValidationState`, `bcpg:aiValidationHints` and
 * `bcpg:aiValidationDate` on that document, nested under the entity's
 * `cm:contains`. Applying it is what finally makes the state the UI reads exist.
 *
 * ## What is applied automatically, and what is not
 *
 * | Suggestion | Applied without asking | Why |
 * |---|---|---|
 * | `DocumentReview` | **yes** | it writes the machine's *own* verdict fields (`bcpg:aiValidation*`), which is precisely the value beCPG would have written itself had it called the AI. Nothing the supplier typed is touched. |
 * | `DocumentClassification` | **only `bcpg:documentTypeRef`, and only at confidence ≥ 90** | typing a document is what makes everything else possible: an untyped deposit cannot be reviewed at all (`resolveValidationCriteria` returns null → `reviewed: false`) and cannot be extracted from. The plugin caps an *inferred* type at 89 and keeps the model's score only when the label appears verbatim in the file, so the threshold is exactly the line between read and guessed. A guess is returned for the supplier to confirm. |
 * | anything else (extractions, dates, values…) | **no** | those change the supplier's data. Spec §4.4: a suggestion is applied only on an explicit user action, and a high confidence buys optimistic application in the UI, not silent application on the server. |
 *
 * The classification patch is **narrowed to that one property on that one node**
 * before being applied — see {@link narrowClassification}, and the reason it is
 * not optional: on a document with no `bcpg:documentEntityRef`, becpg-ai proposes
 * *product* properties on a `cm:content` node at confidence 100.
 *
 * The unapplied ones are still returned, normalised and bucketed, so the caller
 * can offer them.
 *
 * ## Failure is not an error here
 *
 * becpg-ai is optional and, on a shared instance, occasionally down. A failure
 * to review a document must never make the *upload* look failed — the file is in
 * the repository either way. So every AI failure is reported as
 * `{ reviewed: false, reason }` with a 200, and the caller simply shows no
 * verdict. The only 4xx this route raises is for its own bad input.
 *
 * @example
 * await api.post(`documents/${uuid}/ai-review`, { locale: 'fr' });
 * // → { reviewed: true, state: 'Refused', confidence: 80, confidenceLevel: 'medium', … }
 */

import { NextResponse } from 'next/server';
import { BadRequestError, toApiResponse } from '@/lib/errors';
import { requireSession, upstreamLang } from '@/lib/becpg';
import { applySuggestion, getSuggestions } from '@/lib/adapters/suggestions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** becpg-ai `SuggestionType` carrying a document verdict. */
const REVIEW_TYPE = 'DocumentReview';

/** becpg-ai `SuggestionType` proposing what kind of document this is. */
const CLASSIFICATION_TYPE = 'DocumentClassification';

/**
 * The one property the classification is allowed to write by itself.
 *
 * Typing a document is a **prerequisite**, not a convenience:
 * `DocumentReviewSuggestionPlugin.resolveValidationCriteria` returns null when the
 * document carries no `documentTypeRef` with `bcpg:aiValidationCriteria`, so an
 * untyped deposit answers `reviewed: false, reason: "noReview"` — correctly, and
 * uselessly. Measured on a freshly uploaded, untyped certificate on dev. Until a
 * document is typed there is nothing to review and nothing to extract, which is
 * why this is applied and the rest of the patch is not.
 */
const CLASSIFICATION_PROPERTY = 'bcpg:documentTypeRef';

/**
 * Minimum confidence for the type to be written without asking.
 *
 * The plugin caps an *inferred* type at 89 and keeps the model's score only when
 * the type label appears verbatim in the document, so 90 is exactly the line
 * between "read on the page" and "guessed". Measured on dev: three byte-identical
 * spreadsheets classified `Autre`@70, `Autre`@70 and `Extraction AI`@80 — all
 * below this line, all left for the supplier to confirm, which is the right
 * outcome for a filing category that decides which checks then run.
 */
const CLASSIFICATION_MIN_CONFIDENCE = 90;

/**
 * How long the review may take upstream. becpg-ai cuts a silent plugin off at
 * 180 s; a real review measured ~22 s on dev-ai. 120 s leaves room for a large
 * PDF without letting the request hang for the full upstream ceiling.
 */
const AI_REVIEW_TIMEOUT = 120000;

/**
 * Digs the validation state out of a review's `suggestedChanges`.
 *
 * The patch is an entity-shaped tree — `attributes['cm:contains'][…]` nested
 * until the document leaf — so the state is not at a fixed depth. Walking it is
 * more robust than assuming the shape, which has already changed once between
 * a document filed at the root of `Documents fournisseur` and one in a subfolder.
 *
 * @param {Object|null} suggestedChanges the `RemoteEntity` patch
 * @param {string} documentId the document the verdict belongs to
 * @returns {{state: string|null, validatedAt: string|null}}
 */
export function extractValidation(suggestedChanges, documentId) {
    const empty = { state: null, validatedAt: null };
    if (!suggestedChanges || typeof suggestedChanges !== 'object') {
        return empty;
    }

    /** @type {Object[]} */
    const stack = [suggestedChanges];
    const seen = new Set();
    while (stack.length > 0) {
        const node = stack.pop();
        if (!node || typeof node !== 'object' || seen.has(node)) {
            continue;
        }
        seen.add(node);

        const attributes = node.attributes;
        if (attributes && typeof attributes === 'object') {
            // Only accept the verdict of the document we asked about: a patch may
            // legitimately carry siblings, and attributing another file's "Refused"
            // to this upload would be worse than showing nothing.
            if (!documentId || node.id === documentId) {
                const state = attributes['bcpg:aiValidationState'];
                if (typeof state === 'string' && state) {
                    return { state, validatedAt: attributes['bcpg:aiValidationDate'] || null };
                }
            }
            stack.push(attributes);
        }

        for (const value of Object.values(node)) {
            if (Array.isArray(value)) {
                for (const item of value) {
                    if (item && typeof item === 'object') {
                        stack.push(item);
                    }
                }
            }
            else if (value && typeof value === 'object') {
                stack.push(value);
            }
        }
    }
    return empty;
}

/**
 * Narrows a classification patch to `bcpg:documentTypeRef` **on the uploaded
 * document itself**, or returns `null`.
 *
 * Two independent reasons this cannot just forward `suggestedChanges`:
 *
 *  1. **The patch may not be about this node.** becpg-ai builds an entity-shaped
 *     tree and, on a document with no `bcpg:documentEntityRef` — which is what a
 *     free deposit into *Documents fournisseur* produces — `createSuggestionContext`
 *     cannot resolve the owning entity, keeps the *document* as `currentEntity`,
 *     and the extraction plugin then proposes **product** properties
 *     (`bcpg:legalName`, `bcpg:productHierarchy1`) on a `cm:content` node, at
 *     `confidence: 100`. Observed on dev. Applying that would corrupt the node.
 *  2. **Only one property is wanted.** Everything else a classification carries is
 *     the supplier's data and belongs behind an explicit action (spec §4.4).
 *
 * So the tree is walked, the node whose `id` is the uploaded document is found,
 * and a patch is rebuilt carrying that single property and nothing else.
 *
 * @param {Object|null} suggestedChanges
 * @param {string} documentId
 * @returns {Object|null} a minimal patch, or `null` when there is nothing safe to apply
 */
export function narrowClassification(suggestedChanges, documentId) {
    if (!suggestedChanges || typeof suggestedChanges !== 'object' || !documentId) {
        return null;
    }

    const stack = [suggestedChanges];
    const seen = new Set();
    while (stack.length > 0) {
        const node = stack.pop();
        if (!node || typeof node !== 'object' || seen.has(node)) {
            continue;
        }
        seen.add(node);

        const attributes = node.attributes;
        if (attributes && typeof attributes === 'object') {
            const value = attributes[CLASSIFICATION_PROPERTY];
            if (node.id === documentId && value !== undefined && value !== null && value !== '') {
                return { id: documentId, attributes: { [CLASSIFICATION_PROPERTY]: value } };
            }
            stack.push(attributes);
        }

        for (const value of Object.values(node)) {
            if (Array.isArray(value)) {
                for (const item of value) {
                    if (item && typeof item === 'object') {
                        stack.push(item);
                    }
                }
            }
            else if (value && typeof value === 'object') {
                stack.push(value);
            }
        }
    }
    return null;
}

/**
 * @param {Request} request
 * @param {{ params: Promise<{ id: string }> }} context
 * @returns {Promise<Response>}
 */
export async function POST(request, context) {
    const { id } = await context.params;
    try {
        const session = await requireSession();

        let body = {};
        if ((request.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
            try {
                body = await request.json();
            }
            catch {
                throw new BadRequestError('Expected a JSON body');
            }
        }
        if (body && typeof body !== 'object') {
            throw new BadRequestError('Expected a JSON object');
        }

        // The portal's switcher, not Chrome's language — see `upstreamLang`.
        const locale = body.locale || await upstreamLang();

        let suggestions = [];
        try {
            const result = await getSuggestions({
                entityId: id,
                locale,
                session,
                // A cold review reads the PDF and calls a model: ~22 s measured on
                // dev-ai, well past the 30 s default once the file is bigger. And
                // `retries: 0` because replaying a slow model call does not make it
                // faster, it just bills it twice on a shared instance.
                timeout: AI_REVIEW_TIMEOUT,
                retries: 0,
            });
            suggestions = result.suggestions || [];
        }
        catch (cause) {
            // The document is uploaded; only the review failed. Say so, with a 200.
            return NextResponse.json(
                { reviewed: false, reason: cause?.code || 'aiUnavailable', documentId: id },
                { headers: { 'Cache-Control': 'no-store' } },
            );
        }

        // `getSuggestions` has already dropped becpg-ai's progress envelopes
        // (`Loading`, `Closing`, `Billing`…), so everything left is a proposal.
        const review = suggestions.find((item) => item.type === REVIEW_TYPE) || null;
        const classification = suggestions.find((item) => item.type === CLASSIFICATION_TYPE) || null;
        const others = suggestions.filter(
            (item) => item.type !== REVIEW_TYPE && item.type !== CLASSIFICATION_TYPE,
        );

        // The type first: a document with none cannot be reviewed at all, so
        // writing it is what makes everything downstream possible. Only when the
        // plugin read the type off the page (see CLASSIFICATION_MIN_CONFIDENCE);
        // a guess is returned for the supplier to confirm instead.
        let documentType = null;
        if (classification) {
            const patch = narrowClassification(classification.suggestedChanges, id);
            const confident = Number(classification.confidence) >= CLASSIFICATION_MIN_CONFIDENCE;
            documentType = {
                proposed: classification.title || null,
                confidence: classification.confidence ?? null,
                confidenceLevel: classification.confidenceLevel || null,
                applied: false,
                ...(patch ? {} : { reason: 'notOnThisDocument' }),
            };
            if (patch && confident && body.apply !== false) {
                try {
                    await applySuggestion({ suggestedChanges: patch, session });
                    documentType.applied = true;
                }
                catch (cause) {
                    documentType.error = cause?.code || 'applyFailed';
                }
            }
            else if (patch && !confident) {
                documentType.reason = 'lowConfidence';
            }
        }

        if (!review) {
            return NextResponse.json(
                {
                    reviewed: false,
                    reason: 'noReview',
                    documentId: id,
                    suggestions: classification ? [classification, ...others] : others,
                    ...(documentType ? { documentType } : {}),
                },
                { headers: { 'Cache-Control': 'no-store' } },
            );
        }

        const { state, validatedAt } = extractValidation(review.suggestedChanges, id);

        let applied = false;
        let applyError = null;
        if (review.suggestedChanges && body.apply !== false) {
            try {
                await applySuggestion({ suggestedChanges: review.suggestedChanges, session });
                applied = true;
            }
            catch (cause) {
                // The verdict is still worth returning: the UI can show it even if it
                // could not be persisted, and the next upload will try again.
                applyError = cause?.code || 'applyFailed';
            }
        }

        return NextResponse.json(
            {
                reviewed: true,
                documentId: id,
                state,
                validatedAt,
                hints: review.description || null,
                confidence: review.confidence,
                confidenceLevel: review.confidenceLevel,
                applied,
                ...(applyError ? { applyError } : {}),
                ...(documentType ? { documentType } : {}),
                suggestions: others,
                reviewedAt: new Date().toISOString(),
            },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    }
    catch (error) {
        return toApiResponse(error, { route: 'documents.aiReview', method: 'POST', documentId: id });
    }
}
