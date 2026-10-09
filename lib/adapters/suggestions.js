/**
 * AI suggestions — becpg-ai, and what the portal makes of it.
 *
 * Confidence no longer decides anything
 *
 * This module ranked suggestions by score: >= 90 "applied automatically",
 * 70-89 "to confirm", below that "flagged". The ranking is gone, and automatic
 * application with it.
 *
 * It promised what a percentage cannot hold. « Appliqué · 100 % » read as a
 * guarantee of correctness whereas the number only states a model's confidence
 * in its own reading; and applying without asking took away from the supplier
 * the very decision he answers for — he is the one committing his sheet, not
 * the extraction. A proposed value is a proposal: it applies once accepted.
 *
 * `confidence` stays in the payload, exactly as becpg-ai sends it, for the
 * plugins that display it line by line. It no longer drives grouping, badge or
 * writing.
 *
 * ## Transport: through beCPG, never straight to becpg-ai
 *
 * The portal does **not** know where becpg-ai lives and holds no AI credential.
 * It asks the repository — `becpg/ai/suggestions`, `…/apply`, `…/apply-plan` —
 * exactly as it asks `becpg/olap/chart` for the cube, and for the same reasons.
 *
 * It used to call becpg-ai directly, which meant carrying four environment
 * variables (`BECPG_AI_URL`, `BECPG_AI_API_KEY`, `BECPG_AI_INSTANCE_NAME`,
 * `BECPG_AI_TENANT`) and, worse, **re-implementing beCPG's composite auth token
 * in JavaScript** — `<instance>$<login>@<tenant>#<TICKET_…>`, base64. That string
 * is `BeCPGTicketService.getCurrentAuthToken()`, a format beCPG owns; a copy of it
 * here breaks silently the day the original changes, and it was already the source
 * of the "never put the instance in `X-BecPG-Instance`" trap. The proxy ends all of
 * it: one address, one credential, both inside beCPG.
 *
 * Consequence to keep in mind: **the three endpoints below need
 * `AiSuggestionsProxyWebScript` deployed** (becpg-core, `beCPG.ai.serverUrl`). An
 * instance without it answers 404, and an instance that has it but no becpg-ai
 * answers `503 aiNotConfigured` — both of which the UI reads as "no AI here"
 * rather than as a failure.
 *
 * Server only.
 */

import { requireSession } from '@/lib/becpg';
import { createBecpgClient } from '@/lib/adapters/session';
import { BadRequestError } from '@/lib/errors';
import { logWarn } from '@/lib/http';

/**
 * The repository proxy in front of becpg-ai. The portal never holds an AI URL.
 *
 * These three paths are deliberately **absent from `ALLOWED_BECPG_PATH_PREFIXES`**,
 * exactly like `becpg/olap/`: the browser-facing proxy answers 403 for them, and this
 * module — which runs server-side and uses `createBecpgClient`, i.e. `skipAllowList`
 * — is the only way in. Otherwise routing the AI through beCPG would have bought
 * nothing: the browser would simply tunnel to it through `/api/v1/becpg/**`.
 */
const AI_SUGGESTIONS_PATH = 'becpg/ai/suggestions';

/**
 * Beyond this, a suggestion read is logged with its duration. Successful
 * upstream calls are only traced at debug level, which left no figure to
 * answer "why does the panel wait 25 s"; becpg-ai's own log measured a cold
 * document extraction at 37 s and warm ones at 13-21 s.
 */
const SLOW_SUGGESTIONS_MS = 10000;

/** Applies one suggestion. */
const AI_APPLY_PATH = 'becpg/ai/suggestions/apply';

/** Applies an ordered creation plan. */
const AI_APPLY_PLAN_PATH = 'becpg/ai/suggestions/apply-plan';

/**
 * The server-side beCPG client the three calls below share.
 *
 * `createBecpgClient` is the one that carries `skipAllowList`, which is what makes
 * `becpg/ai/*` reachable from here and from nowhere else. The session is resolved
 * when the caller did not pass one — the old `aiFetch` did the same, and several
 * callers rely on it.
 *
 * @param {Object} [session]
 * @returns {Promise<Object>} a beCPG client
 */
async function aiClient(session) {
    return createBecpgClient(session || await requireSession());
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
 * @property {Object|null} suggestedChanges the `RemoteEntity` patch to apply
 * @property {Object[]|null} plan ordered entities to create (CreationPlan type)
 * @property {Object|null} versionData `{ isMajorVersion, description }`
 * @property {string|null} conversationId
 * @property {Object[]} changes flattened per-attribute view, for the UI
 * @property {boolean} applicable true when applying the patch or the plan writes something
 * @property {boolean} isDocument true when the patch writes the document node, not the product
 * @property {Object[]} sections titled display rows ({@link readSections})
 * @property {Object[]} sources the documents the values were read from ({@link readSources})
 * @property {Object[]} conflicts fields on which documents disagree ({@link readConflicts})
 */

/**
 * Attributes whose value is not a field value but the nodes held under the
 * entity: a document extraction writes the fields of the document node it read
 * through `cm:contains`, an image suggestion creates a folder and a file there.
 * Shown as such, the card read « contains — »: a local name and an object
 * nobody can read.
 */
const CONTAINER_ATTRIBUTES = new Set(['cm:contains']);

/**
 * True when a proposed value proposes nothing: absent, blank, or a collection
 * of such values.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isEmptyValue(value) {
    if (value === null || value === undefined) {
        return true;
    }
    if (typeof value === 'string') {
        return value.trim() === '';
    }
    if (Array.isArray(value)) {
        return value.every(isEmptyValue);
    }
    if (typeof value === 'object') {
        return Object.values(value).every(isEmptyValue);
    }
    return false;
}

/** The nodes listed under a container attribute, whatever shape it came in. */
function containedNodes(value) {
    return (Array.isArray(value) ? value : [value])
        .filter((node) => node && typeof node === 'object' && !Array.isArray(node));
}

/**
 * The field changes written on the nodes held under the entity, one level of
 * nesting at a time.
 *
 * @param {*} value the value of a container attribute
 * @returns {Object[]} changes with `scope: 'node'` and the node's `nodeName`
 */
function containedChanges(value) {
    const changes = [];
    for (const node of containedNodes(value)) {
        for (const [name, nested] of Object.entries(node.attributes || {})) {
            if (CONTAINER_ATTRIBUTES.has(name)) {
                changes.push(...containedChanges(nested));
                continue;
            }
            changes.push({
                scope: 'node', listName: null, rowIndex: null, name, value: nested,
                nodeName: typeof node.name === 'string' ? node.name : null,
            });
        }
    }
    return changes;
}

/**
 * True when a node under a container is written: created (it has no id yet
 * and carries a name or a content), or one of its fields receives a value.
 *
 * @param {Object} node
 * @returns {boolean}
 */
function nodeWritesSomething(node) {
    const created = !node.id && (!isEmptyValue(node.name) || !isEmptyValue(node.content));
    return created || attributesWriteSomething(node.attributes);
}

/** True when at least one attribute of a patch receives a value. */
function attributesWriteSomething(attributes) {
    return Object.entries(attributes || {}).some(([name, value]) => (CONTAINER_ATTRIBUTES.has(name)
        ? containedNodes(value).some(nodeWritesSomething)
        : !isEmptyValue(value)));
}

/**
 * True when applying the patch would change something on the repository.
 *
 * Decided on the patch and not on the rows the card displays: an image
 * suggestion writes a file whose only field is its content, and it must keep
 * its « Appliquer » button although it has no field to list.
 *
 * @param {Object|null} suggestedChanges a `RemoteEntity`
 * @returns {boolean}
 */
export function patchWritesSomething(suggestedChanges) {
    if (!suggestedChanges || typeof suggestedChanges !== 'object') {
        return false;
    }
    if (attributesWriteSomething(suggestedChanges.attributes)) {
        return true;
    }
    return Object.values(suggestedChanges.datalists || {}).some((rows) => Array.isArray(rows)
        && rows.some((row) => attributesWriteSomething(row?.attributes)));
}

/**
 * Flattens a `RemoteEntity` patch into a per-attribute list the UI can render
 * next to the corresponding form field.
 *
 * Attribute keys are prefixed names (`bcpg:legalName`); datalist patches are
 * exposed row by row, so a grid can highlight the exact cell; the fields of a
 * node held under the entity (`cm:contains`) come with `scope: 'node'`.
 *
 * @param {Object} suggestedChanges a `RemoteEntity`
 * @returns {Object[]} `[{ scope, listName, rowIndex, name, value, nodeName? }]`
 */
export function flattenChanges(suggestedChanges) {
    const changes = [];
    if (!suggestedChanges || typeof suggestedChanges !== 'object') {
        return changes;
    }

    for (const [name, value] of Object.entries(suggestedChanges.attributes || {})) {
        if (CONTAINER_ATTRIBUTES.has(name)) {
            changes.push(...containedChanges(value));
            continue;
        }
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

/** Beyond that, the description is cut: a card is not a document. */
const MAX_DESCRIPTION = 600;

/**
 * Makes what becpg-ai puts in `description` readable.
 *
 * Measured on dev on 12/08, on a single sheet, this field contained:
 *
 *  - a complete HTML document — `<div class="document-review-result">`, its
 *    three sections, and a 4 kB `<style>` tag — for a certificate review.
 *    Rendered as text by the screen, it dumped the markup and the whole style
 *    sheet onto the card;
 *  - a JSON array — `[{"confidence":100,"name":"Sel","value":"0.008 g"}]`
 *    — for extracted nutrients, displayed verbatim;
 *  - plain text, for the rest.
 *
 * All three went through a `<p>`. So they are brought back to text here, server
 * side: it is a data-shape problem, not a display one, and fixing it in the
 * screen would force every screen to do it again.
 *
 * The JSON is not thrown away but flattened: `name` and `value` are the
 * information the supplier is after — it is what gives the nutrient name that
 * the « — » row next to `nutListNut` does not show.
 *
 * @param {*} value the raw `description`
 * @returns {string} text, possibly empty
 */
export function readableDescription(value) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (raw === '') {
        return '';
    }

    // 1 — a JSON payload: keep what it names.
    if (raw.startsWith('[') || raw.startsWith('{')) {
        try {
            const parsed = JSON.parse(raw);
            const rows = Array.isArray(parsed) ? parsed : [parsed];
            const named = rows
                .filter((row) => row && typeof row === 'object')
                .map((row) => {
                    const name = row.name ?? row.label ?? row.charact ?? null;
                    const val = row.value ?? row.val ?? null;
                    if (name === null && val === null) {
                        return null;
                    }
                    return [name, val].filter((part) => part !== null && part !== '').join(' : ');
                })
                .filter(Boolean);
            if (named.length > 0) {
                return truncate(named.join(' · '));
            }
            // JSON that names nothing teaches a supplier nothing.
            return '';
        }
        catch {
            // A sentence that starts with a brace: treat it as text.
        }
    }

    // 2 — HTML: strip what is not content, then the tags.
    if (/<[a-z][\s\S]*>/i.test(raw)) {
        const text = raw
            // `<style>` and `<script>`: their CONTENT must go, not just their
            // tags — otherwise 4 kB of CSS ends up rendered as text.
            .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
            .replace(/<!--[\s\S]*?-->/g, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/\s+/g, ' ')
            .trim();
        return truncate(text);
    }

    return truncate(raw);
}

/** Cuts on a word boundary, and says so. */
function truncate(text) {
    if (text.length <= MAX_DESCRIPTION) {
        return text;
    }
    const cut = text.slice(0, MAX_DESCRIPTION);
    const lastSpace = cut.lastIndexOf(' ');
    return `${(lastSpace > 200 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
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

    return {
        id: suggestionId(raw, index),
        title: raw?.title || '',
        description: readableDescription(raw?.description),
        type: raw?.type || null,
        family: raw?.family || null,
        documentId: raw?.documentId || null,
        /*
         * The RAW description, alongside the sanitised text.
         *
         * becpg-ai does not send prose: depending on the plugin, `description`
         * is HTML (`DocumentReview`, `RegulatoryToxSummary`), a JSON array
         * (`DocumentExtraction`, `SpellCheck`), or `key : value` pairs
         * separated by semicolons (`I18n`). Flattening it all into one sentence
         * — which is what `readableDescription` does — lost the structure its
         * own client knows how to render. So both forms coexist: the raw one
         * for the typed rendering, the sanitised one as a fallback and for
         * everything that expects text.
         */
        rawDescription: typeof raw?.description === 'string' ? raw.description : '',
        confidence: Number.isFinite(confidence) ? confidence : null,
        suggestedChanges: raw?.suggestedChanges || null,
        plan: Array.isArray(raw?.plan) ? raw.plan : null,
        versionData: raw?.versionData || null,
        conversationId: raw?.conversationId || null,
        changes: flattenChanges(raw?.suggestedChanges),
        applicable: (Array.isArray(raw?.plan) && raw.plan.length > 0) || patchWritesSomething(raw?.suggestedChanges),
        // True when the patch writes the document node rather than the product.
        isDocument: raw?.isDocument === true,
        sections: readSections(raw?.sections),
        sources: readSources(raw?.sources),
        conflicts: readConflicts(raw?.conflicts),
    };
}

/** A display cell as text, `''` when it says nothing. */
function sectionText(value) {
    return isEmptyValue(value) ? '' : String(value);
}

/**
 * One row of a section; `null` when it proposes nothing — no value and no
 * cell — since a name above an empty value reads as a proposal to clear a
 * field.
 */
function readSectionRow(row) {
    if (!row || typeof row !== 'object') {
        return null;
    }
    const value = sectionText(row.value);
    const cells = Array.isArray(row.cells) ? row.cells.map(sectionText) : null;
    if (value === '' && !(cells?.some((cell) => cell !== ''))) {
        return null;
    }
    return {
        name: sectionText(row.name),
        value,
        previousValue: sectionText(row.previousValue) || null,
        notApplicable: row.action === 'NOT_APPLICABLE' || row.notApplicable === true,
        cells,
    };
}

/**
 * What a suggestion shows, as becpg-ai lays it out: titled sections of
 * display rows (`Suggestion.Section`), the field names already translated in
 * the request locale. becpg-ai moved its rows there from `description`, which
 * it now leaves empty; read only from `description`, every extraction lost its
 * table and fell back on raw qnames.
 *
 * @param {*} raw `sections` of the becpg-ai suggestion
 * @returns {Array<{title: string|null, columns: string[], rows: Object[]}>} the
 *   sections that have at least one row left
 */
export function readSections(raw) {
    return (Array.isArray(raw) ? raw : [])
        .filter((section) => section && typeof section === 'object')
        .map((section) => ({
            title: sectionText(section.title) || null,
            columns: Array.isArray(section.columns) ? section.columns.map(sectionText) : [],
            rows: (Array.isArray(section.rows) ? section.rows : []).map(readSectionRow).filter(Boolean),
        }))
        .filter((section) => section.rows.length > 0);
}

/**
 * True when a normalised suggestion gives the supplier nothing to apply and
 * nothing to read: its patch writes no value, and it has no text, no row and
 * no conflict to choose from.
 *
 * @param {PortalSuggestion} suggestion
 * @returns {boolean}
 */
export function proposesNothing(suggestion) {
    return !suggestion.applicable
        && suggestion.description === ''
        && suggestion.sections.length === 0
        && suggestion.conflicts.length === 0;
}

/** A document a value was read from, as the suggestion names it. */
function readSource(raw) {
    if (!raw || typeof raw !== 'object' || typeof raw.documentId !== 'string' || !raw.documentId.trim()) {
        return null;
    }
    const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
    return {
        documentId: raw.documentId.trim(),
        name: text(raw.name) || text(raw.documentName),
        version: text(raw.version),
        date: text(raw.date) || text(raw.documentDate),
        documentType: text(raw.documentType),
    };
}

/**
 * The documents a suggestion was read from — several when the extraction
 * merged them. A suggestion without the list keeps its single `documentId`.
 *
 * @param {*} raw `sources` of the becpg-ai suggestion
 * @returns {Array<{documentId: string, name: string|null, version: string|null, date: string|null, documentType: string|null}>}
 */
export function readSources(raw) {
    return (Array.isArray(raw) ? raw : []).map(readSource).filter(Boolean);
}

/**
 * The fields on which deposited documents disagree, each with the value every
 * document gives and the patch that applies it. The AI orders the candidates by
 * the priority of their document type; it never picks one.
 *
 * @param {*} raw `conflicts` of a `DocumentConflict` suggestion
 * @returns {Array<{name: string, label: string|null, row: Object|null,
 *          candidates: Array<{value: *, displayValue: string|null, source: Object, suggestedChanges: Object}>}>}
 */
export function readConflicts(raw) {
    return (Array.isArray(raw) ? raw : []).map((conflict) => {
        const candidates = (Array.isArray(conflict?.candidates) ? conflict.candidates : [])
            .map((candidate) => ({
                value: candidate?.value ?? null,
                displayValue: typeof candidate?.displayValue === 'string' ? candidate.displayValue : null,
                source: readSource(candidate),
                suggestedChanges: candidate?.suggestedChanges && typeof candidate.suggestedChanges === 'object' ? candidate.suggestedChanges : null,
            }))
            .filter((candidate) => candidate.source && candidate.suggestedChanges);
        return {
            name: typeof conflict?.name === 'string' ? conflict.name : null,
            label: typeof conflict?.label === 'string' ? conflict.label : null,
            row: conflict?.row && typeof conflict.row === 'object' ? { listId: conflict.row.listId || null, label: conflict.row.label || null } : null,
            candidates,
        };
    }).filter((conflict) => conflict.name && conflict.candidates.length > 1);
}

/**
 * Aggregate counters, so the wizard can show "3 suggestions to confirm" without
 * re-walking the list on the client.
 *
 * @param {PortalSuggestion[]} suggestions
 * @returns {{total: number, high: number, medium: number, low: number, unscored: number, averageConfidence: number|null}}
 */
export function summarize(suggestions) {
    /*
     * A count, and nothing else.
     *
     * This summary broke suggestions down by confidence level —
     * `high`/`medium`/`low`/`unscored` — to feed sections that no longer
     * exist. The only figure a supplier reads here is "how many things is the
     * AI proposing to me", and that is the one the section carries.
     */
    const list = Array.isArray(suggestions) ? suggestions : [];
    return { total: list.length };
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
 * The plugins that announced themselves and never announced they were done.
 *
 * ## Why the envelopes cannot simply be thrown away
 *
 * They are progress, not proposals — hence {@link isEnvelope} — but *dropping*
 * them turns "the analysis is running" into "the analysis found nothing", and
 * those two look identical on screen. Measured on dev after a real technical
 * sheet was deposited: `becpg-ai` answered two items, both `Loading`
 * (« DocumentClassification 1/2 », « Extraction de document 2/2 ») — the run had
 * started and was working asynchronously — while the wizard showed *Aucune
 * suggestion*, with a *Relancer l'analyse* button whose only effect was to
 * restart a run that was already going. That silence is what gets read as a
 * breakdown.
 *
 * A plugin is counted as running when it emitted `Loading` and no
 * `LoadingComplete` carrying the same title. `Closing` means the whole `Flux`
 * ended, so nothing is running whatever the `Loading` items say — a plugin that
 * died mid-run must not leave the screen waiting forever.
 *
 * @param {Object[]} list the raw becpg-ai items
 * @returns {{running: boolean, plugins: string[], closed: boolean}}
 */
export function analysisProgress(list) {
    const started = new Map();
    let closed = false;

    for (const raw of Array.isArray(list) ? list : []) {
        if (!raw || typeof raw !== 'object') {
            continue;
        }
        // The title is the only identity an envelope carries; `type` alone would
        // merge eight plugins into one.
        const key = String(raw.title || raw.family || raw.type || '').trim();
        if (raw.type === 'Loading') {
            started.set(key, (started.get(key) || 0) + 1);
        }
        else if (raw.type === 'LoadingComplete') {
            const count = (started.get(key) || 0) - 1;
            if (count > 0) {
                started.set(key, count);
            }
            else {
                started.delete(key);
            }
        }
        else if (raw.type === 'Closing') {
            closed = true;
        }
    }

    const plugins = closed ? [] : [...started.keys()].filter(Boolean);
    return { running: plugins.length > 0, plugins, closed };
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
 * A suggestion that found nothing: no attribute, only empty lists, no plan and
 * nothing to read.
 *
 * becpg-ai answers « allergens, label claims, physico-chemicals extracted » with
 * `datalists: { "bcpg:allergenList": [] }` when the sheet holds none. Shown, it
 * offered « Appliquer » on a write that changes nothing.
 *
 * @param {Object} raw
 * @returns {boolean}
 */
export function foundNothing(raw) {
    const patch = raw?.suggestedChanges;
    const hasAttributes = Object.keys(patch?.attributes || {}).length > 0;
    const hasRows = Object.values(patch?.datalists || {}).some((rows) => Array.isArray(rows) && rows.length > 0);
    const hasPlan = Array.isArray(raw?.plan) && raw.plan.length > 0;
    const hasText = typeof raw?.description === 'string' && raw.description.trim() !== '';
    const hasSections = readSections(raw?.sections).length > 0;
    return !hasAttributes && !hasRows && !hasPlan && !hasText && !hasSections;
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
    // Two deposited documents disagree on a field; the supplier chooses.
    'DocumentConflict',
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
 * ones carried `confidence: null`**, while the document-derived ones scored 70-100.
 * So the confidence badge — the one signal telling a supplier how much to trust a
 * proposal — was absent on exactly the suggestions that needed it most.
 *
 * The test is the document anchor first (`documentId`), then the type, so a
 * future document-grounded plugin is included without touching this list; an
 * entity-level plugin that starts citing a document is included too, which is
 * the correct outcome. `documentId` is an exact signal and not a heuristic:
 * `setDocumentId` is called by three plugins and only three — document
 * extraction, document review, document classification.
 *
 * `isDocument` IS NOT THIS. becpg-ai also ships an `isDocument` flag on every
 * suggestion, and it answers another question entirely: whether the patch writes
 * onto the **document node** (its type, its expiry date — the `doc_` fields of
 * `createEntityDocumentFromResults`) rather than onto the product. Both halves
 * come from the same extraction and both carry a `documentId`; review and
 * classification never set it at all. Filtering on it would keep one half of the
 * extraction and drop the two other plugins.
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
 * The same identifier as a **nodeRef**, which is what the repository proxy takes.
 *
 * becpg-ai addresses a node by its bare UUID, and the callers here inherited that
 * habit; `becpg/ai/suggestions` takes a nodeRef instead, because it parses it with
 * `new NodeRef(…)` — the repository's own validation — before letting any part of
 * it reach the upstream path. Rebuilding the default store here is safe: every
 * node the portal ever addresses lives in `workspace://SpacesStore`, and
 * {@link toEntityId} has already refused anything that is not an identifier.
 *
 * @param {string} entityId a nodeRef or a UUID
 * @returns {string} `workspace://SpacesStore/<uuid>`
 */
export function toEntityNodeRef(entityId) {
    const value = String(entityId || '').trim();
    return value.includes('://') ? value : `workspace://SpacesStore/${toEntityId(value)}`;
}

/**
 * Suggestions for an entity — `GET becpg/ai/suggestions`, which the repository
 * forwards to becpg-ai's `GET /api/suggestions/{entityId}`.
 *
 * The upstream controller returns a `Flux<Suggestion>`, which serialises as a JSON
 * array for a client asking `application/json` — the proxy does. A `locale` is
 * mandatory upstream; the portal always has one.
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
 * @returns {Promise<{entityId: string, listId: string|null, suggestions: PortalSuggestion[], summary: Object,
 *          readAt: string, entityLevelDropped: number, analysis: Object}>}
 *
 * @example
 * const { suggestions, summary } = await getSuggestions({ entityId, locale: 'fr' });
 */
export async function getSuggestions(params = {}) {
    const entityId = toEntityId(params.entityId);
    const listId = params.listId || null;

    const client = await aiClient(params.session);
    const startedAt = Date.now();
    const payload = await client.getJson(AI_SUGGESTIONS_PATH, {
        query: {
            nodeRef: toEntityNodeRef(params.entityId),
            ...(listId ? { listId } : {}),
            locale: params.locale || 'fr',
        },
        // Both are opt-in because the defaults are wrong for a *cold* call. A
        // suggestion run that has to read a PDF and call a model took ~22 s when
        // measured on dev-ai, against a 30 s default — and `GET` being idempotent,
        // the generic client would then replay it twice, tripling the model cost
        // of a request that was merely slow. Callers that know they are cold pass
        // a longer timeout and `retries: 0`.
        ...(params.timeout ? { timeout: params.timeout } : {}),
        ...(params.retries !== undefined ? { retries: params.retries } : {}),
    });

    const duration = Date.now() - startedAt;
    if (duration > SLOW_SUGGESTIONS_MS) {
        logWarn('suggestions.slow', { entityId, listId, duration });
    }

    const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.items) ? payload.items : []);
    // Index over the *raw* list so a suggestion keeps a stable id across a
    // re-fetch even if a plugin emits one envelope more or less than last time.
    let dropped = 0;
    const suggestions = list
        .map((raw, index) => {
            if (isEnvelope(raw) || isEmptyPlaceholder(raw) || foundNothing(raw)) {
                return null;
            }
            // Only what a document says. See `isDocumentGrounded`.
            if (!isDocumentGrounded(raw)) {
                dropped += 1;
                return null;
            }
            return normalizeSuggestion(raw, index);
        })
        .filter((suggestion) => suggestion && !proposesNothing(suggestion));

    return {
        entityId,
        listId,
        suggestions,
        summary: summarize(suggestions),
        // When the portal received this answer. becpg-ai may have served part
        // of it from its own cache, so it is the time of the read, not of the
        // model run.
        readAt: new Date().toISOString(),
        // Never silently: a run where becpg-ai produced only entity-level
        // proposals is not the same as a run that produced nothing, and the
        // screen has to be able to say which.
        entityLevelDropped: dropped,
        // Nor is a run still in flight. See `analysisProgress`.
        analysis: analysisProgress(list),
    };
}

/**
 * How many suggestions each of several scopes holds, so a step with nothing to
 * propose can point at the steps that do.
 *
 * Each scope is read exactly as its own step reads it — same `listId`, same
 * filters — so the count announced is the number of cards the supplier finds
 * on arriving there. Mapping one unscoped run onto steps would have meant
 * copying becpg-ai's type-to-list routing here. becpg-ai caches every plugin on
 * the entity's modification date, so the document extraction is computed once
 * for all the scopes.
 *
 * A scope whose read failed is reported `available: false`, never as zero: it
 * is not known to be empty.
 *
 * @param {Object} params
 * @param {string} params.entityId nodeRef or UUID
 * @param {string[]} params.scopes the `listId`s to count
 * @param {string} [params.locale]
 * @param {Object} [params.session]
 * @param {number} [params.timeout]
 * @returns {Promise<{scopes: Array<{listId: string, available: boolean, total: number|null, running: boolean}>}>}
 */
export async function countSuggestionsByScope(params = {}) {
    const session = params.session || await requireSession();
    const results = await Promise.allSettled(params.scopes.map((listId) => getSuggestions({
        entityId: params.entityId, listId, locale: params.locale, session, timeout: params.timeout, retries: 0,
    })));
    return {
        scopes: results.map((result, index) => scopeCount(params.scopes[index], result, params.entityId)),
    };
}

/** One scope of {@link countSuggestionsByScope}, from its settled read. */
function scopeCount(listId, result, entityId) {
    if (result.status === 'rejected') {
        logWarn('suggestions.scope.failed', { entityId, listId, message: result.reason?.message });
        return { listId, available: false, total: null, running: false };
    }
    return {
        listId,
        available: true,
        total: result.value.suggestions.length,
        running: Boolean(result.value.analysis?.running),
    };
}

/**
 * Applies a suggestion — `POST becpg/ai/suggestions/apply`, forwarded to becpg-ai.
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
    return (await aiClient(params.session)).postJson(AI_APPLY_PATH, patch, { retries: 0 });
}

/**
 * Applies an ordered creation plan — `POST becpg/ai/suggestions/apply-plan`.
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
    return (await aiClient(params.session)).postJson(AI_APPLY_PLAN_PATH, plan, { retries: 0 });
}
