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
 * Measured on dev-ai.becpg.fr, `GET /api/suggestions/f7de9b31-…?locale=fr-FR`:
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
 * | anything else (`DocumentClassification`, extractions…) | **no** | those change the supplier's data — a document type, a validity date. Spec §4.4: a suggestion is applied only on an explicit user action, and a high confidence buys optimistic application in the UI, not silent application on the server. |
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
import { requireSession } from '@/lib/becpg';
import { applySuggestion, getSuggestions } from '@/lib/adapters/suggestions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** becpg-ai `SuggestionType` carrying a document verdict. */
const REVIEW_TYPE = 'DocumentReview';

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

        const locale = body.locale
            || (request.headers.get('accept-language') || '').split(',')[0]
            || process.env.PORTAL_DEFAULT_LANG
            || 'fr';

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
        const others = suggestions.filter((item) => item.type !== REVIEW_TYPE);

        if (!review) {
            return NextResponse.json(
                { reviewed: false, reason: 'noReview', documentId: id, suggestions: others },
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
