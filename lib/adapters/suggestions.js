/**
 * AI suggestions — becpg-ai, and the confidence rule that must not be got wrong.
 *
 * becpg-ai extracts values from the documents a supplier deposited and proposes
 * them as suggestions, each carrying an optional `confidence` percentage
 * (`Suggestion.confidence`, `Integer`, nullable). The portal turns that number
 * into a badge, and spec §4.4 is explicit about the thresholds **and** about the
 * absent case:
 *
 * | Confidence | Bucket | UI |
 * |---|---|---|
 * | ≥ 90 | `high` | applied, green badge, revocable |
 * | 70 – 89 | `medium` | proposed, orange badge, to confirm |
 * | < 70 | `low` | flagged, red badge, manual entry |
 * | **absent** | **`null`** | **no badge at all** |
 *
 * > **An absent confidence must never be shown as a low confidence.** A plugin
 * > that cannot assess itself is not a plugin that is unsure; conflating the two
 * > would make every extraction look untrustworthy. {@link confidenceBucket}
 * > returns `null` — not `'low'` — and the UI renders nothing for `null`.
 *
 * Transport: becpg-ai authenticates with the **OIDC bearer token**, never with
 * the Alfresco ticket, and carries the tenant in `X-BecPG-Instance`. All of that
 * is handled by `aiJson()` in `lib/becpg.js`; this module only shapes payloads.
 *
 * Server only.
 */

import { aiJson } from '@/lib/becpg';
import { BadRequestError } from '@/lib/errors';

/** Confidence at or above which a suggestion is applied automatically. */
export const CONFIDENCE_HIGH = 90;

/** Confidence at or above which a suggestion is proposed for confirmation. */
export const CONFIDENCE_MEDIUM = 70;

/** The buckets the UI knows how to render. `null` means "render no badge". */
export const CONFIDENCE_BUCKETS = ['high', 'medium', 'low'];

/**
 * Buckets a confidence score.
 *
 * @param {number|string|null|undefined} confidence percentage, 0-100
 * @returns {'high'|'medium'|'low'|null} `null` when no score was returned
 *
 * @example
 * confidenceBucket(93);        // 'high'
 * confidenceBucket(71);        // 'medium'
 * confidenceBucket(12);        // 'low'
 * confidenceBucket(null);      // null — no badge, NOT 'low'
 * confidenceBucket(undefined); // null
 */
export function confidenceBucket(confidence) {
    if (confidence === null || confidence === undefined || confidence === '') {
        return null;
    }
    // `Number(false) === 0` and `Number([]) === 0`: a non-numeric input must
    // read as "no score", not as a confidence of zero (which buckets as 'low').
    if (typeof confidence !== 'number' && typeof confidence !== 'string') {
        return null;
    }
    // `Number(' ') === 0`, and a blank string is an absent score, not a zero:
    // a plugin that serialises "no confidence" as whitespace must not make the
    // field read "À saisir — l'extraction n'est pas fiable".
    if (typeof confidence === 'string' && confidence.trim() === '') {
        return null;
    }
    const value = Number(confidence);
    if (!Number.isFinite(value)) {
        return null;
    }
    if (value >= CONFIDENCE_HIGH) {
        return 'high';
    }
    if (value >= CONFIDENCE_MEDIUM) {
        return 'medium';
    }
    return 'low';
}

/**
 * True when a suggestion may be applied without asking the user (spec §4.4).
 *
 * A suggestion with no score is never auto-applied: absence of evidence is not
 * evidence of quality either way.
 *
 * @param {number|null|undefined} confidence
 * @returns {boolean}
 */
export function isAutoApplicable(confidence) {
    return confidenceBucket(confidence) === 'high';
}

/* -------------------------------------------------------------------------- */
/* Normalisation                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A normalised suggestion.
 *
 * @typedef {Object} PortalSuggestion
 * @property {string} id stable id, built from the payload when becpg-ai sends none
 * @property {string} title
 * @property {string} description
 * @property {string|null} type becpg-ai `SuggestionType`
 * @property {string|null} family grouping key (a datalist name, a field family)
 * @property {string|null} documentId source document the value was extracted from
 * @property {number|null} confidence raw percentage, `null` when not assessed
 * @property {'high'|'medium'|'low'|null} confidenceLevel bucket, `null` when absent
 * @property {boolean} autoApplicable
 * @property {Object|null} suggestedChanges the `RemoteEntity` patch to apply
 * @property {Object[]|null} plan ordered entities to create (CreationPlan type)
 * @property {Object|null} versionData `{ isMajorVersion, description }`
 * @property {string|null} conversationId
 * @property {Object[]} changes flattened per-attribute view, for the UI
 */

/**
 * Flattens a `RemoteEntity` patch into a per-attribute list the UI can render
 * next to the corresponding form field.
 *
 * Attribute keys are prefixed names (`bcpg:legalName`); datalist patches are
 * exposed row by row, so a grid can highlight the exact cell.
 *
 * @param {Object} suggestedChanges a `RemoteEntity`
 * @returns {Object[]} `[{ scope, listName, rowIndex, name, value }]`
 */
export function flattenChanges(suggestedChanges) {
    const changes = [];
    if (!suggestedChanges || typeof suggestedChanges !== 'object') {
        return changes;
    }

    for (const [name, value] of Object.entries(suggestedChanges.attributes || {})) {
        changes.push({ scope: 'entity', listName: null, rowIndex: null, name, value });
    }

    for (const [listName, rows] of Object.entries(suggestedChanges.datalists || {})) {
        if (!Array.isArray(rows)) {
            continue;
        }
        rows.forEach((row, rowIndex) => {
            for (const [name, value] of Object.entries(row?.attributes || {})) {
                changes.push({ scope: 'datalist', listName, rowIndex, name, value });
            }
        });
    }

    return changes;
}

/**
 * Builds a stable id for a suggestion. becpg-ai does not send one, and the UI
 * needs a key to track "applied" / "dismissed" across a re-fetch.
 *
 * @param {Object} raw
 * @param {number} index
 * @returns {string}
 */
function suggestionId(raw, index) {
    const parts = [raw?.type, raw?.family, raw?.documentId, raw?.title].filter(Boolean);
    return parts.length > 0 ? `${parts.join('|')}#${index}` : `suggestion#${index}`;
}

/**
 * Normalises one becpg-ai `Suggestion`.
 *
 * @param {Object} raw
 * @param {number} [index=0]
 * @returns {PortalSuggestion}
 */
export function normalizeSuggestion(raw, index = 0) {
    const confidence = raw?.confidence === null || raw?.confidence === undefined
        ? null
        : Number(raw.confidence);
    const level = confidenceBucket(confidence);

    return {
        id: suggestionId(raw, index),
        title: raw?.title || '',
        description: raw?.description || '',
        type: raw?.type || null,
        family: raw?.family || null,
        documentId: raw?.documentId || null,
        confidence: Number.isFinite(confidence) ? confidence : null,
        confidenceLevel: level,
        autoApplicable: level === 'high',
        suggestedChanges: raw?.suggestedChanges || null,
        plan: Array.isArray(raw?.plan) ? raw.plan : null,
        versionData: raw?.versionData || null,
        conversationId: raw?.conversationId || null,
        changes: flattenChanges(raw?.suggestedChanges),
    };
}

/**
 * Aggregate counters, so the wizard can show "3 suggestions to confirm" without
 * re-walking the list on the client.
 *
 * @param {PortalSuggestion[]} suggestions
 * @returns {{total: number, high: number, medium: number, low: number, unscored: number, averageConfidence: number|null}}
 */
export function summarize(suggestions) {
    const summary = { total: 0, high: 0, medium: 0, low: 0, unscored: 0, averageConfidence: null };
    let scored = 0;
    let sum = 0;

    for (const suggestion of suggestions || []) {
        summary.total += 1;
        // `null`, `undefined` and any level we do not know all count as
        // *unscored*. Never as `low`: a missing score is not a bad score, and
        // `summary[undefined] += 1` would quietly produce NaN.
        const level = suggestion.confidenceLevel;
        if (!level || !Object.hasOwn(summary, level) || level === 'total') {
            summary.unscored += 1;
            continue;
        }
        summary[level] += 1;
        scored += 1;
        sum += suggestion.confidence;
    }

    // The average is over the *scored* suggestions only: averaging an absent
    // score as zero would be the same mistake as bucketing it as 'low'.
    summary.averageConfidence = scored > 0 ? Math.round(sum / scored) : null;
    return summary;
}

/* -------------------------------------------------------------------------- */
/* Calls                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * `SuggestionType`s becpg-ai streams **around** the real suggestions.
 *
 * The endpoint is a `Flux` designed for a WebSocket UI that shows a spinner per
 * plugin: `Loading` when a plugin starts, `LoadingComplete` when it ends,
 * `Closing` at the very end, `Billing` with the token cost, `Errors` for a
 * plugin that failed. Consumed as a plain JSON array — which is what the portal
 * does — they are not proposals, they are progress.
 *
 * Measured on dev-ai for MP96504: **29 items, of which 18 were envelopes**
 * (8 `Loading`, 8 `LoadingComplete`, 1 `Billing`, 1 `Closing`). Left in, they
 * reached the wizard as suggestion cards with an *Appliquer* button and no
 * content — a supplier being offered to apply "Allergènes: 1/7" with nothing in
 * it — and inflated `summary.total` to 29 for 11 real proposals.
 *
 * Dropped here rather than in each screen, so a count and a list can never
 * disagree about what a suggestion is.
 */
const ENVELOPE_TYPES = new Set(['Loading', 'LoadingComplete', 'Closing', 'Billing', 'Errors']);

/**
 * True when a raw becpg-ai item is a progress marker rather than a proposal.
 *
 * @param {Object} raw
 * @returns {boolean}
 */
export function isEnvelope(raw) {
    return Boolean(raw) && ENVELOPE_TYPES.has(raw.type);
}

/**
 * True when an item is becpg-ai's way of saying "I found nothing".
 *
 * When no plugin produced anything, `SuggestionServiceImpl` appends a synthetic
 * `FieldSuggestion` carrying only the sentence *"Aucune suggestion proposée."* —
 * no title, no `suggestedChanges`, no `plan`, nothing to apply. It is not in
 * {@link ENVELOPE_TYPES} because it reuses a real suggestion type, so it slipped
 * through and became a card with an *Appliquer* button and no content, and made
 * `summary.total` read **1** at the exact moment becpg-ai said there were none.
 *
 * Measured on dev-ai: `POST /api/v1/documents/5f073768-…/ai-review` on a
 * document whose content is missing upstream answered `reviewed: false` — the
 * correct verdict — while still shipping this one item in `suggestions`.
 *
 * Recognised by what it lacks rather than by its wording, which is translated:
 * an item with nothing to apply *and* no title cannot be rendered or acted on,
 * whatever it says.
 *
 * @param {Object} raw
 * @returns {boolean}
 */
export function isEmptyPlaceholder(raw) {
    if (!raw || typeof raw !== 'object') {
        return true;
    }
    const hasTitle = typeof raw.title === 'string' && raw.title.trim() !== '';
    const hasChanges = Boolean(raw.suggestedChanges);
    const hasPlan = Array.isArray(raw.plan) && raw.plan.length > 0;
    return !hasTitle && !hasChanges && !hasPlan;
}

/**
 * becpg-ai suggestion types that are, by construction, read out of a document.
 *
 * `DocumentExtraction` reads the file's text, `DocumentReview` judges it against
 * the criteria of its `bcpg:documentType`, and `DocumentClassification` proposes
 * what type it is. Everything else — `FieldSuggestion`, `Organoleptics`,
 * `Allergens`, `Ingredients`, `SpellCheck`, `Labeling`, `LabelingCompliance` —
 * reasons over the *entity's own data* and is not a reading of anything the
 * supplier deposited.
 */
const DOCUMENT_SUGGESTION_TYPES = new Set([
    'DocumentExtraction',
    'DocumentReview',
    'DocumentClassification',
]);

/**
 * True when a suggestion is grounded in a document the supplier deposited.
 *
 * **The portal shows the supplier only these.** A proposal a supplier is asked to
 * accept has to be checkable: with a document behind it, "the certificate says
 * 2027-03-01" can be verified by opening the file. The entity-level plugins offer
 * the opposite — a value inferred from the product's own data, which the supplier
 * is then invited to write back onto that same product, with nothing to check it
 * against. Measured on dev-ai for MP96504: **29 raw items, and all 29 entity-level
 * ones carried `confidence: null`**, while the document-derived ones scored 70–100.
 * So the confidence badge — the one signal telling a supplier how much to trust a
 * proposal — was absent on exactly the suggestions that needed it most.
 *
 * The test is the document anchor first (`documentId`), then the type, so a
 * future document-grounded plugin is included without touching this list; an
 * entity-level plugin that starts citing a document is included too, which is
 * the correct outcome.
 *
 * @param {Object} raw
 * @returns {boolean}
 */
export function isDocumentGrounded(raw) {
    if (!raw || typeof raw !== 'object') {
        return false;
    }
    if (typeof raw.documentId === 'string' && raw.documentId.trim() !== '') {
        return true;
    }
    return DOCUMENT_SUGGESTION_TYPES.has(raw.type);
}

/**
 * `becpg-ai` identifies an entity by its bare UUID: its controller prepends
 * `workspace://SpacesStore/` itself.
 *
 * @param {string} entityId a nodeRef or a UUID
 * @returns {string} the UUID
 */
export function toEntityId(entityId) {
    const value = String(entityId || '').trim();
    if (!value) {
        throw new BadRequestError('Missing entity id');
    }
    const parts = value.split('/');
    const id = parts[parts.length - 1];
    if (!/^[A-Za-z0-9-]{8,}$/.test(id)) {
        throw new BadRequestError('Invalid entity id');
    }
    return id;
}

/**
 * Suggestions for an entity — `GET /api/suggestions/{entityId}` on becpg-ai.
 *
 * The controller returns a `Flux<Suggestion>`, which serialises as a JSON array
 * when the client asks for `application/json` (which `aiJson` does). A `locale`
 * is mandatory upstream; the portal always has one.
 *
 * `entityId` may also be a **document** id. becpg-ai's `createSuggestionContext`
 * looks at the node type, sees `cm:content`, keeps the node as `currentDocument`
 * and resolves the owning entity from `bcpg:documentEntityRef`. That is how the
 * post-upload review is obtained; it is undocumented upstream, hence the note.
 *
 * @param {Object} params
 * @param {string} params.entityId nodeRef or UUID — of an entity **or** a document
 * @param {string} [params.listId] restrict to one datalist
 * @param {string} [params.locale='fr'] user locale
 * @param {Object} [params.session]
 * @param {number} [params.timeout] override the upstream timeout, in ms
 * @param {number} [params.retries] override the retry count
 * @returns {Promise<{entityId: string, listId: string|null, suggestions: PortalSuggestion[], summary: Object}>}
 *
 * @example
 * const { suggestions, summary } = await getSuggestions({ entityId, locale: 'fr' });
 */
export async function getSuggestions(params = {}) {
    const entityId = toEntityId(params.entityId);
    const listId = params.listId || null;

    const payload = await aiJson(`suggestions/${entityId}`, {
        query: {
            ...(listId ? { listId } : {}),
            locale: params.locale || 'fr',
        },
        session: params.session,
        // Both are opt-in because the defaults are wrong for a *cold* call. A
        // suggestion run that has to read a PDF and call a model took ~22 s when
        // measured on dev-ai, against a 30 s default — and `GET` being idempotent,
        // the generic client would then replay it twice, tripling the model cost
        // of a request that was merely slow. Callers that know they are cold pass
        // a longer timeout and `retries: 0`.
        ...(params.timeout ? { timeout: params.timeout } : {}),
        ...(params.retries !== undefined ? { retries: params.retries } : {}),
    });

    const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.items) ? payload.items : []);
    // Index over the *raw* list so a suggestion keeps a stable id across a
    // re-fetch even if a plugin emits one envelope more or less than last time.
    let dropped = 0;
    const suggestions = list
        .map((raw, index) => {
            if (isEnvelope(raw) || isEmptyPlaceholder(raw)) {
                return null;
            }
            // Only what a document says. See `isDocumentGrounded`.
            if (!isDocumentGrounded(raw)) {
                dropped += 1;
                return null;
            }
            return normalizeSuggestion(raw, index);
        })
        .filter(Boolean);

    return {
        entityId,
        listId,
        suggestions,
        summary: summarize(suggestions),
        // Never silently: a run where becpg-ai produced only entity-level
        // proposals is not the same as a run that produced nothing, and the
        // screen has to be able to say which.
        entityLevelDropped: dropped,
    };
}

/**
 * Applies a suggestion — `POST /api/suggestions/apply` on becpg-ai.
 *
 * The body is the `RemoteEntity` patch carried by the suggestion. becpg-ai then
 * writes it into beCPG through the remote API, so the repository stays the only
 * writer and the portal never bypasses the business rules (architecture rule R2).
 *
 * @param {Object} params
 * @param {Object} params.suggestedChanges the `RemoteEntity` patch
 * @param {Object} [params.session]
 * @returns {Promise<Object>} the persisted `RemoteEntity`
 * @throws {BadRequestError} when the patch is missing or has no id
 */
export async function applySuggestion(params = {}) {
    const patch = params.suggestedChanges;
    if (!patch || typeof patch !== 'object') {
        throw new BadRequestError('applySuggestion requires the suggested changes');
    }
    if (!patch.id) {
        throw new BadRequestError('The suggested changes carry no entity id');
    }
    return aiJson('suggestions/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
        session: params.session,
        retries: 0,
    });
}

/**
 * Applies an ordered creation plan — `POST /api/suggestions/apply-plan`.
 *
 * Used by suggestions of type `CreationPlan`, where an association value may
 * reference an entity created earlier in the same plan (`"$N"`).
 *
 * @param {Object} params
 * @param {Object[]} params.plan ordered skeleton entities
 * @param {Object} [params.session]
 * @returns {Promise<Object[]>} the created entities, in the same order
 */
export async function applyPlan(params = {}) {
    const plan = params.plan;
    if (!Array.isArray(plan) || plan.length === 0) {
        throw new BadRequestError('applyPlan requires a non-empty plan');
    }
    return aiJson('suggestions/apply-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
        session: params.session,
        retries: 0,
    });
}
