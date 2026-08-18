/**
 * Wizard state — **computed once, server-side, returned whole**.
 *
 * ## The bug this module exists to close (#25928, spec §2ter.3)
 *
 * Share's `wizard-mgr.js` calls `becpg/security/entitylists/check` **per step**,
 * as the step is opened, and re-derives that step's validity from the answer.
 * The consequences are exactly what the ticket describes: the read-only state of
 * a step depends on the order in which steps were loaded, a list frozen by the
 * client can appear editable, and the "task assigned" flag is memoised in a DOM
 * component that a re-render resets.
 *
 * The portal does the opposite, and this is the single rule of the module:
 *
 * > `GET /api/v1/wizard/{entityId}` performs **one** security call, computes
 * > **every** step's `frozen` / `readOnly` from it, and returns the complete
 * > state in one response. The UI renders that state. **The UI never re-derives
 * > step validity**, from loading order or from anything else.
 *
 * ## Where each field comes from
 *
 * | Field | Source |
 * |---|---|
 * | `wizardId`, `draft`, `comments`, `enforceTask`, `skipSecurityRules`, step list | `lib/adapters/wizardConfig.js` (Share endpoint, or DEFAULT_WIZARDS) |
 * | `accessMode`, `hasAssignedTask`, `datalists[].state` | `becpg/security/entitylists/check/{entity}` (§4) |
 * | `entity` | `becpg/remote/entity?nodeRef=` (§6) |
 * | `frozen` per step | `datalists[].state === "Valid"`, looked up by the step's pseudo-list name: `View-properties` for a `form` step, `View-documents` for a `documents` step, `listId` otherwise |
 *
 * `accessMode` is beCPG's verdict: `1` = READ, `2` = WRITE. The portal never
 * overrides it — beCPG stays the authority on permissions (spec §6.2).
 *
 * Server only.
 */

import {
    getEntityJson,
    getJson,
    isNodeRef,
    nodeRefToPath,
    pathToNodeRef,
    requireSession,
} from '@/lib/becpg';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import {
    createContext,
    getWizard,
    parseListId,
    wizardIdForType,
} from '@/lib/adapters/wizardConfig';
import {
    applyValues,
    getFormDefinition,
    normalizeFormDefinition,
    readFieldValue,
    resolveNodeRefLabels,
    saveForm,
} from '@/lib/adapters/forms';
import { isEmptyValue } from '@/components/form/validation';
import { createBecpgClient } from '@/lib/adapters/session';
import { resolveContentLocales } from '@/lib/adapters/contentLocales';
import { catalogRows } from '@/lib/adapters/entities';
import {
    columnsFromDefinition,
    createItem,
    deleteItem,
    getColumns,
    getEntityListsState,
    getRows,
    requestFields,
    resolveDataList,
    sortItem,
    updateItem,
} from '@/lib/adapters/datalists';
import { getSurvey, saveSurvey } from '@/lib/adapters/survey';

/** `accessMode` values returned by `becpg/security/entitylists/check`. */
export const ACCESS_MODE = { NONE: 0, READ: 1, WRITE: 2 };

/** A datalist in this state has been validated by the client and is frozen. */
export const FROZEN_STATE = 'Valid';

/** Folder holding the documents a supplier must deposit. */
export const SUPPLIER_DOCUMENTS_PATH = 'SupplierDocuments';

/**
 * The catalogues that **forbid** finishing, from `PORTAL_BLOCKING_CATALOGS`.
 *
 * ## Why this is opt-in, and empty by default
 *
 * beCPG publishes a catalogue's score and its missing fields, and **no marker
 * saying whether it blocks** — measured: `GET /api/v1/entities/{id}/catalogs`
 * carries no `blocking` key at all. The portal therefore cannot deduce the
 * answer, and it must not invent it: treating "undeclared" as "blocking" made
 * every wizard unfinishable on an instance whose catalogue sits below 100 %,
 * which is most of them, in the name of a rule the repository never expressed.
 *
 * So the instance says. `PORTAL_BLOCKING_CATALOGS=incoRawMaterials,allergens`
 * names the catalogues that gate the completion; `all` gates on every catalogue
 * beCPG returns, for a client who wants "100 % or nothing". Unset — the default
 * — nothing gates: the supplier sees the score and the missing fields, and beCPG
 * remains the authority on whether the task may be completed (rule R2).
 *
 * @returns {string[]|null} the ids, `['*']` for all, `[]` when nothing is declared
 */
export function blockingCatalogIds() {
    const raw = String(process.env.PORTAL_BLOCKING_CATALOGS || '').trim();
    if (!raw) {
        return [];
    }
    if (raw.toLowerCase() === 'all' || raw === '*') {
        return ['*'];
    }
    return raw.split(',').map((id) => id.trim()).filter(Boolean);
}

/**
 * Whether a missing TRANSLATION holds the completion back, from
 * `PORTAL_BLOCKING_TRANSLATIONS`.
 *
 * Off by default. A catalogue reports one row per required language, and a
 * customer who asks for German wants to be told the German is missing, not to
 * make the sheet unreturnable — a supplier commonly fills one language only.
 * The row stays visible in Conformité either way; this only decides whether it
 * gates « Terminer ».
 *
 * @returns {boolean}
 */
export function blockingTranslations() {
    return String(process.env.PORTAL_BLOCKING_TRANSLATIONS || '').trim().toLowerCase() === 'true';
}

/* -------------------------------------------------------------------------- */
/* Entity                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Accepts a nodeRef, a `workspace/SpacesStore/<uuid>` path or a bare UUID and
 * returns a nodeRef.
 *
 * @param {string} entityId
 * @returns {string} `workspace://SpacesStore/<uuid>`
 * @throws {BadRequestError}
 */
export function toEntityNodeRef(entityId) {
    const value = String(entityId || '').trim();
    if (!value) {
        throw new BadRequestError('Missing entity id');
    }
    if (isNodeRef(value)) {
        return value;
    }
    if (value.includes('/')) {
        return pathToNodeRef(value);
    }
    if (/^[A-Za-z0-9-]{8,}$/.test(value)) {
        return `workspace://SpacesStore/${value}`;
    }
    throw new BadRequestError('Invalid entity id');
}

/**
 * Reads the entity and keeps the summary the wizard header needs.
 *
 * @param {string} nodeRef
 * @param {Object} [options]
 * @param {Object} [options.session]
 * @returns {Promise<{nodeRef: string, id: string, type: string, name: string, code: ?string, erpCode: ?string, state: ?string, siteId: ?string, attributes: Object, raw: Object}>}
 */
export async function getEntity(nodeRef, options = {}) {
    // `getEntityJson`: the full read (no `fields=`) is the one most exposed to the
    // empty-body failure — every reference of the entity is serialised, so one
    // target the account may not follow used to 404 the whole wizard.
    const payload = await getEntityJson({ nodeRef }, { session: options.session });
    const entity = payload?.entity || payload;
    if (!entity || !entity.type) {
        throw new NotFoundError('Entity not found', { details: { nodeRef } });
    }

    const attributes = entity.attributes || {};
    return {
        nodeRef,
        id: entity.id || nodeRef.split('/').pop(),
        type: entity.type,
        name: entity.name || attributes['cm:name'] || '',
        code: entity.code || attributes['bcpg:code'] || null,
        erpCode: entity.erpCode || attributes['bcpg:erpCode'] || null,
        state: attributes['bcpg:productState'] || attributes['pjt:projectState'] || null,
        siteId: entity.site?.id || null,
        // True when `getEntityJson` had to fall back to its narrowed read: some
        // properties are absent because a reference target is refused, not
        // because they are empty. The wizard says so rather than presenting a
        // truncated entity as a complete one.
        partial: entity.partial === true,
        attributes,
        raw: entity,
    };
}

/* -------------------------------------------------------------------------- */
/* State computation                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Indexes the security payload by list name.
 *
 * @param {Object[]} datalists
 * @returns {Map<string, Object>}
 */
function indexDataLists(datalists) {
    const index = new Map();
    for (const list of datalists || []) {
        if (list?.name) {
            index.set(list.name, list);
        }
    }
    return index;
}

/**
 * Computes the read-only state of the whole wizard, once.
 *
 * Reproduces the decision tree of `wizard-mgr.js` — minus its per-step
 * re-evaluation:
 *
 *   1. the wizard is configured read-only → everything is read-only;
 *   2. `accessMode === READ` → everything is read-only;
 *   3. `enforceTask` is on and the user holds no task on this entity →
 *      everything is read-only (a supplier may only write while a task is open);
 *   4. otherwise the wizard is writable and only the frozen steps are read-only.
 *
 * `security.hasAssignedTask` is `null` when nobody asked beCPG for it, but never
 * on the one branch that reads it: the flag is requested exactly when
 * `enforceTask` is on (see {@link getWizardState}), so rule 3 always has a real
 * boolean. Keep the two together if either ever moves.
 *
 * @param {Object} wizard normalised wizard attributes
 * @param {{accessMode: number, hasAssignedTask: boolean|null}} security
 * @returns {{readOnly: boolean, reason: string|null}}
 */
export function computeReadOnly(wizard, security) {
    if (wizard.readOnly) {
        return { readOnly: true, reason: 'wizardReadOnly' };
    }
    if (security.accessMode === ACCESS_MODE.READ) {
        return { readOnly: true, reason: 'readAccess' };
    }
    if (wizard.enforceTask && !security.hasAssignedTask) {
        return { readOnly: true, reason: 'noAssignedTask' };
    }
    return { readOnly: false, reason: null };
}

/**
 * Is this step something the entity can actually serve?
 *
 * A configuration describes a *family* of entities, so it can name a datalist a
 * given entity does not carry — its template simply never created one. The
 * portal used to advertise the step anyway, and opening it answered
 * `404 Entity carries no datalist "…"`. Measured on the local instance: the
 * `supplier-rawMaterial` wizard declares `supplierPackagingList`, the branch of
 * MPSEED002 carries seventeen lists and not that one, and the "Emballage
 * fournisseur" tab could only ever fail.
 *
 * Nothing is lost by hiding it: the portal **never creates a datalist** — a row
 * is written into `list.nodeRef`, which must already exist — so a step with no
 * list can neither be read nor written. Only `entityDataList` is filtered: a
 * `form` or `documents` step reads through beCPG's pseudo-lists
 * (`View-properties`, `View-documents`) rather than a real one, and a `survey`
 * step is served by `becpg/survey`, not by the datalist API.
 *
 * @param {Object} step a normalised step
 * @param {Map<string, Object>} listsByName
 * @returns {boolean}
 */
function stepIsServable(step, listsByName) {
    if (step.type !== 'entityDataList' || !step.securityListName) {
        return true;
    }
    return listsByName.has(step.securityListName);
}

/**
 * Decorates the steps with their computed state, dropping the ones this entity
 * cannot serve (see {@link stepIsServable}).
 *
 * @param {Object[]} steps normalised steps
 * @param {Map<string, Object>} listsByName
 * @param {boolean} wizardReadOnly
 * @returns {Object[]} the UI-facing steps
 */
export function decorateSteps(steps, listsByName, wizardReadOnly) {
    return steps.filter((step) => stepIsServable(step, listsByName)).map((step) => {
        const list = step.securityListName ? listsByName.get(step.securityListName) : null;
        const frozen = list?.state === FROZEN_STATE;
        return {
            id: step.id,
            label: step.label,
            labelId: step.labelId,
            title: step.title,
            titleId: step.titleId,
            type: step.type,
            formId: step.formId,
            itemId: step.itemId || list?.itemType || null,
            listId: step.listId,
            listName: step.listName,
            listIndex: step.listIndex,
            listNodeRef: list?.nodeRef || null,
            nextStepWebScript: step.nextStepWebScript,
            nodeRefStepIndex: step.nodeRefStepIndex,
            // Frozen = the client validated this list; it can be read, never written.
            frozen,
            // The single, authoritative read-only flag for this step.
            readOnly: wizardReadOnly || step.readOnly || frozen,
            // The field definition Share resolved, when it came from the Share
            // endpoint. Carried because `getStepData` needs it: re-asking
            // `module/entity-datagrid/config/columns` for fields we already hold
            // fails with 401 (`share_session_required`) — see `stepColumns`.
            // `GET /api/v1/wizard/{entityId}` strips it again before answering,
            // so the index payload stays small and its shape unchanged.
            definition: step.definition || null,
            // The item's default form, when Share sent one: the fields a row
            // editor offers beyond the grid's columns (the parent of an
            // ingredient, which the datagrid form does not show).
            itemDefinition: step.itemDefinition || null,
        };
    });
}

/**
 * The verdict of one step: has it been ruled on, and what is missing.
 *
 * Computed here rather than in the browser because the browser only knows the
 * steps it has mounted: a reopened task showed an empty rail, and a step type
 * that reports nothing — a list, the documents — was painted green the instant
 * it was visited. `evaluated: false` is a real answer and must stay one: nothing
 * declares a datalist mandatory, so claiming "complete" for one would be a
 * fabricated verdict.
 *
 * The predicate is the one `FormStep` runs in the browser, on the same
 * definition and the same values, so the two can never disagree.
 *
 * @param {Object} step a decorated step
 * @param {Object} attributes the entity attributes
 * @returns {{evaluated: boolean, count: number, labels: string[]}}
 */
function stepCompletion(step, attributes) {
    if (step.type !== 'form') {
        // A questionnaire rules on itself as soon as it is opened, and its own
        // read is not worth a second round trip here; a list and the documents
        // are ruled on by the browser, which already holds what they need.
        return { evaluated: false, count: 0, labels: [] };
    }
    if (step.readOnly) {
        // Its blanks are not the supplier's to fill.
        return { evaluated: true, count: 0, labels: [] };
    }
    const definition = resolveShareDefinition(step, 'edit');
    if (!definition) {
        // Default-source mode: no field definition, therefore no verdict.
        return { evaluated: false, count: 0, labels: [] };
    }
    const labels = (definition.fields || [])
        .filter((field) => field
            && field.name
            && field.mandatory
            && !field.readOnly
            && !field.protectedField
            && isEmptyValue(readFieldValue(attributes, field).value))
        .map((field) => field.label || field.name);

    return { evaluated: true, count: labels.length, labels };
}

/**
 * Which step holds which field.
 *
 * The map the rail needs to attribute a catalogue gap to the tab that can close
 * it, without opening a single step: the browser only learns a step's fields
 * when it mounts it, so a conformity report on a step nobody visited had
 * nowhere to land and the supplier was left to hunt for it.
 *
 * Only `form` steps are resolved — a catalogue names its checks by property
 * qname, and a list step is matched by its list name on the browser side, which
 * the step already carries.
 *
 * @param {Object[]} steps decorated steps
 * @returns {Object.<string, string>} prefixed field name -> stepId
 */
function buildFieldSteps(steps) {
    const index = {};
    for (const step of steps) {
        if (step.type !== 'form') {
            continue;
        }
        const definition = resolveShareDefinition(step, step.readOnly ? 'view' : 'edit');
        for (const field of definition?.fields || []) {
            if (field?.name && !index[field.name]) {
                index[field.name] = step.id;
            }
        }
    }
    return index;
}

/**
 * The step list as the browser sees it: everything {@link decorateSteps}
 * computed, minus the resolved field definitions — the datagrid one AND the
 * item's default form, which is just as large and just as per-step.
 *
 * Those are per-step and large (28 KB for the ten steps of `supplier-rawMaterial`),
 * and the UI fetches them one at a time from
 * `GET /api/v1/wizard/{entityId}/step/{stepId}` as the user advances. Sending
 * all ten up front would multiply the index payload for data nine tenths of
 * which is never read.
 *
 * @param {Object} state result of {@link getWizardState}
 * @returns {Object} the same state with lightweight steps
 */
export function withoutStepDefinitions(state) {
    return {
        ...state,
        steps: state.steps.map(({ definition, itemDefinition, ...step }) => step),
    };
}

/* -------------------------------------------------------------------------- */
/* Assignment memo                                                             */
/* -------------------------------------------------------------------------- */

/**
 * How long "does this user have a task on this record?" is taken for granted.
 * Aligned on the wizard configuration cache: the answer only changes when a task
 * is assigned or closed, and five minutes of lag on a boolean answer is worth
 * more than 5 s per tab.
 */
const TASK_ASSIGNED_TTL_MS = 5 * 60 * 1000;

/** `user|nodeRef` -> `{ value, expiresAt }`. Bounded, in process memory. */
const taskAssignedMemo = new Map();

/** Beyond that, the oldest entries are evicted. */
const TASK_ASSIGNED_MAX = 500;

function readTaskAssigned(key) {
    const entry = taskAssignedMemo.get(key);
    if (!entry) {
        return null;
    }
    if (entry.expiresAt < Date.now()) {
        taskAssignedMemo.delete(key);
        return null;
    }
    return entry.value;
}

function rememberTaskAssigned(key, value) {
    if (taskAssignedMemo.size >= TASK_ASSIGNED_MAX) {
        const oldest = taskAssignedMemo.keys().next().value;
        taskAssignedMemo.delete(oldest);
    }
    taskAssignedMemo.set(key, { value, expiresAt: Date.now() + TASK_ASSIGNED_TTL_MS });
}

/* -------------------------------------------------------------------------- */
/* Wizard state memo                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The state of a wizard is rebuilt at every tab, and that is the real cost.
 *
 * The step route replays `getWizardState()` in full before serving even the
 * smallest step. Measured on the deployed portal on 12/08, per tab:
 *
 * ```
 *   becpg/remote/entity                 2 600 – 3 400 ms
 *   becpg/security/entitylists/check    2 600 – 3 300 ms
 *   becpg/entity/datalists/data/node    2 800 ms      <- the only data specific to the step
 *   becpg/remote/dictionary                30 ms
 * ```
 *
 * Three cost items of comparable weight, two of which do not depend on the step:
 * the record and its permissions are the same for all fourteen tabs. Paying them
 * fourteen times is what makes a complete run exceed the minute.
 *
 * So the state itself is memoized, not only `hasAssignedTask`.
 *
 * The TTL is short, and the explicit invalidation is what matters. The state
 * carries the validation status of the lists, which changes as soon as a step
 * is saved or a formulation runs: every write going through the portal purges
 * the entry ({@link invalidateWizardState}). The one-minute TTL only covers
 * what the portal does not see — a change made in Share while the supplier is
 * typing.
 */
const STATE_TTL_MS = 60 * 1000;

/** Entries kept before the oldest one is evicted. */
const STATE_MAX = 200;

/** `user|nodeRef|wizardId|siteId|locale` -> `{ value, expiresAt }`. */
const stateMemo = new Map();

function stateKey(username, nodeRef, options) {
    return [
        username || '?',
        nodeRef,
        options.wizardId || '',
        options.siteId || '',
        options.locale || '',
    ].join('|');
}

/**
 * Forgets the memoized state of a record.
 *
 * Called by every write the portal makes on the entity: saving a step,
 * formulation, closing a task. Without it, the supplier saves a list and the
 * next screen keeps declaring it not validated for a whole minute — a delay that
 * shows and that nobody can explain.
 *
 * @param {string} entityNodeRef the record, or its uuid
 * @returns {void}
 */
export function invalidateWizardState(entityNodeRef) {
    if (!entityNodeRef) {
        stateMemo.clear();
        return;
    }
    const uuid = String(entityNodeRef).split('/').pop();
    for (const key of [...stateMemo.keys()]) {
        if (key.includes(uuid)) {
            stateMemo.delete(key);
        }
    }
}

/**
 * The full wizard state — the payload of `GET /api/v1/wizard/{entityId}`.
 *
 * ```
 * { wizardId, source, draft, comments, allSteps, enforceTask, skipSecurityRules,
 *   readOnly, readOnlyReason, accessMode,
 *   hasAssignedTask,          // true | false | null — see below
 *   entity: { nodeRef, id, type, name, code, erpCode, state, siteId,
 *             partial? },   // `partial: true` only — a reference target is refused
 *   steps: [ { id, label, title, type, formId, itemId, listId, listName,
 *              listIndex, listNodeRef, frozen, readOnly } ] }
 * ```
 *
 * `hasAssignedTask` is **`null` unless the wizard enforces the task**. beCPG only
 * computes it when asked, and asking costs 1575 ms instead of 66 ms (measured on
 * the reference instance), so the portal asks only when it will act on the answer. `null`
 * means "not asked", never "no" — `readOnly` is the flag to read for what the
 * user may actually do.
 *
 * @param {string} entityId nodeRef, node path or UUID
 * @param {Object} [options]
 * @param {string} [options.wizardId] force a wizard instead of deriving it from the type
 * @param {string} [options.siteId]
 * @param {string} [options.locale]
 * @param {Object} [options.session]
 * @returns {Promise<Object>}
 *
 * @example
 * const state = await getWizardState(entityId, { locale: 'fr' });
 * // state.steps[3].readOnly is final: the UI must not recompute it.
 */
export async function getWizardState(entityId, options = {}) {
    const session = options.session || await requireSession();
    const nodeRef = toEntityNodeRef(entityId);

    // Short-lived memo: see STATE_TTL_MS. `noCache` lets a caller demand the
    // fresh state — the step route uses it after a write.
    const memoKey = stateKey(session.user?.username || session.username, nodeRef, options);
    if (!options.noCache) {
        const cached = stateMemo.get(memoKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.value;
        }
        stateMemo.delete(memoKey);
    }

    const entity = await getEntity(nodeRef, { session });
    const wizardId = options.wizardId || wizardIdForType(entity.type);

    const ctx = createContext(session, {
        entityType: entity.type,
        entityNodeRef: nodeRef,
        siteId: options.siteId || entity.siteId,
        locale: options.locale,
    });

    const { wizard, steps, source } = await getWizard(ctx, wizardId);

    /*
     * THE single security call. Everything below is derived from it.
     *
     * `checkTaskAssignment` is asked only once per run. Measured on
     * the deployed portal on 12/08: `becpg/security/entitylists/check` with that
     * flag takes 5011 ms — more than half of the 9.5 s of a tab — and it was
     * fired again at every step, since this function is replayed by the step
     * route. Ten tabs, fifty seconds of assignment checking for an answer
     * that does not change.
     *
     * This is exactly what Share avoids: `wizard-mgr.js#checkValidation` only
     * adds `checkTaskAssignment=true` when `this.taskAssigned === null`, and
     * memoizes the answer in the component. Here the memory holder is the
     * screen, which sends back what it knows via `options.knownTaskAssigned`.
     *
     * The underlying cost stays on the beCPG side (`EntitySecurityWebScript`
     * lists all the tasks of the user only to keep one); this pays it once
     * instead of ten times.
     */
    const taskMemoKey = `${session.user?.username || session.username || '?'}|${nodeRef}`;
    const known = typeof options.knownTaskAssigned === 'boolean'
        ? options.knownTaskAssigned
        : readTaskAssigned(taskMemoKey);
    const security = await getEntityListsState(nodeRef, {
        checkTaskAssignment: wizard.enforceTask && known === null,
        skipSecurityRules: wizard.skipSecurityRules,
        session,
    });
    if (known !== null) {
        security.hasAssignedTask = known;
    }
    else if (typeof security.hasAssignedTask === 'boolean') {
        rememberTaskAssigned(taskMemoKey, security.hasAssignedTask);
    }

    const { readOnly, reason } = computeReadOnly(wizard, security);

    // Resolved here rather than in every control: the language policy is a
    // property of the record, not of a field, and having the browser resolve it
    // would amount to making it guess the configuration of the instance.
    // The dictionary is memoized on the request cache, so a ten-step wizard
    // only reads it once.
    // The catalogs come from `bcpg:entityScore`, already read with the entity:
    // `becpg/entity/catalog/node` serves that same payload, calling it here
    // would pay a round trip for what we already hold.
    const contentLocales = await resolveContentLocales(createBecpgClient(session), {
        entityType: entity.type,
        catalogs: catalogRows(entity.attributes?.['bcpg:entityScore']),
    });
    const listsByName = indexDataLists(security.datalists);
    const decorated = decorateSteps(steps, listsByName, readOnly);

    const state = {
        wizardId,
        source,
        draft: wizard.draft,
        comments: wizard.comments,
        allSteps: wizard.allSteps,
        enforceTask: wizard.enforceTask,
        skipSecurityRules: wizard.skipSecurityRules,
        // Which catalogs gate the completion — see `blockingCatalogIds()`.
        // Empty by default: beCPG decides, not the portal.
        blockingCatalogIds: blockingCatalogIds(),
        // Whether a missing translation gates the completion — off by default.
        blockingTranslations: blockingTranslations(),
        // In which languages the `d:mltext` fields are entered — the catalog of
        // the wizard when it declares one, otherwise the repository locales.
        // `null` when nothing can be asserted, and the wizard then keeps its
        // former behaviour. See `lib/adapters/contentLocales.js`.
        contentLocales,
        readOnly,
        readOnlyReason: reason,
        accessMode: security.accessMode,
        hasAssignedTask: security.hasAssignedTask,
        entity: {
            nodeRef: entity.nodeRef,
            id: entity.id,
            type: entity.type,
            name: entity.name,
            code: entity.code,
            erpCode: entity.erpCode,
            state: entity.state,
            siteId: entity.siteId,
            // Only when it is true: a wizard on a healthy entity keeps the exact
            // payload it had before this flag existed.
            ...(entity.partial ? { partial: true } : {}),
        },
        steps: decorated.map((step) => ({
            ...step,
            completion: stepCompletion(step, entity.attributes),
        })),
        // Which step holds which field. Empty — never absent — when nothing could
        // be resolved: the rail then shows no catalogue mark at all rather than
        // attributing a gap to the wrong tab.
        fieldSteps: buildFieldSteps(decorated),
        // Kept so a caller composing more calls does not fetch it twice.
        datalists: security.datalists.map((list) => ({
            name: list.name,
            nodeRef: list.nodeRef,
            itemType: list.itemType || null,
            title: list.title || list.name,
            state: list.state || null,
            frozen: list.state === FROZEN_STATE,
        })),
    };

    stateMemo.set(memoKey, { value: state, expiresAt: Date.now() + STATE_TTL_MS });
    if (stateMemo.size > STATE_MAX) {
        stateMemo.delete(stateMemo.keys().next().value);
    }

    return state;
}

/* -------------------------------------------------------------------------- */
/* Step data                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Finds a step in a computed state.
 *
 * @param {Object} state result of {@link getWizardState}
 * @param {string} stepId
 * @returns {Object}
 * @throws {NotFoundError}
 */
export function findStep(state, stepId) {
    const step = state.steps.find((candidate) => candidate.id === stepId);
    if (!step) {
        throw new NotFoundError(`Wizard "${state.wizardId}" has no step "${stepId}"`, {
            details: { wizardId: state.wizardId, stepId },
        });
    }
    return step;
}

/**
 * A date coming out of `slingshot/doclib2`.
 *
 * That webscript is the **only** source in the portal that serialises a date as an
 * object rather than a string:
 *
 * ```json
 * "cm:modified": { "iso8601": "2026-05-29T13:18:54.054Z",
 *                  "value": "Fri May 29 13:18:54 UTC 2026" }
 * ```
 *
 * Passed through as-is it reached `formatDate()`, which cannot read an object and
 * rendered an em dash — so every deposited document showed "Modifie le —" while the
 * date sat right there in the payload. Everything else in the portal goes through
 * `becpg/remote/entity`, which returns plain ISO strings; that is why the defect was
 * confined to this one screen.
 *
 * The `value` form is a Java `Date.toString()` and is deliberately ignored: no
 * timezone offset, no stable locale.
 *
 * @param {*} value a raw date from doclib2
 * @returns {string|null} an ISO 8601 string, or null
 */
function doclibDate(value) {
    if (!value) {
        return null;
    }
    if (typeof value === 'string') {
        return value;
    }
    return value.iso8601 || null;
}

/**
 * A person coming out of `slingshot/doclib2` — same story as {@link doclibDate}:
 * `{ firstName, lastName, displayName, userName }`, never a plain string.
 *
 * @param {*} value
 * @returns {string|null}
 */
function doclibPerson(value) {
    if (!value) {
        return null;
    }
    if (typeof value === 'string') {
        return value;
    }
    return value.displayName || value.userName || null;
}

/**
 * Reads the documents of the entity — the payload of a `documents` step.
 *
 * No dedicated API is needed (spec §5.4.2): `DocumentFormulationHandler` already
 * materialises the expected documents on the entity, `bcpg:documentState`
 * distinguishing `Simulation` (expected, not supplied) from a real deposit. The
 * folder is resolved by the same webscript the Share wizard uses between steps,
 * `becpg/project/path?path=SupplierDocuments`, with a fallback on the entity
 * itself when the project layout does not have that folder.
 *
 * @param {string} entityNodeRef
 * @param {Object} [options]
 * @param {Object} [options.session]
 * @returns {Promise<{folderNodeRef: string|null, documents: Object[]}>}
 */
export async function getDocuments(entityNodeRef, options = {}) {
    const session = options.session;
    let folderNodeRef = null;
    try {
        const resolved = await getJson('becpg/project/path', {
            query: { nodeRef: entityNodeRef, path: SUPPLIER_DOCUMENTS_PATH },
            session,
        });
        folderNodeRef = resolved?.nodeRef || null;
    }
    catch {
        // No SupplierDocuments folder on this entity: fall back on its children.
        folderNodeRef = null;
    }

    const target = folderNodeRef || entityNodeRef;
    const payload = await getJson(
        `slingshot/doclib2/doclist/documents/node/${nodeRefToPath(target)}`,
        { query: { max: 250 }, session },
    ).catch(() => null);

    const items = Array.isArray(payload?.items) ? payload.items : [];
    return {
        folderNodeRef,
        documents: items.map((item) => {
            const node = item?.node || {};
            const properties = node.properties || {};
            return {
                nodeRef: node.nodeRef || null,
                name: properties['cm:name'] || node.properties?.name || '',
                title: properties['cm:title'] || null,
                // doclib2 carries these on the node for a content item and omits
                // them for a folder; the content property is the fallback.
                mimetype: node.mimetype || properties['cm:content']?.mimetype || null,
                size: node.size ?? properties['cm:content']?.size ?? null,
                // `sign:signatureAspect` is what the signature flow writes on the
                // sheet it checked in. It carries no document type, so it never
                // appears in the requirement check-list — this flag is the only
                // way a screen can tell the signed sheet apart from any upload.
                signed: Array.isArray(node.aspects)
                    ? node.aspects.some((aspect) => String(aspect).includes('signatureAspect'))
                    : false,
                modified: doclibDate(node.modified || properties['cm:modified']),
                created: doclibDate(properties['cm:created']),
                modifier: doclibPerson(properties['cm:modifier']),
                documentType: properties['bcpg:documentTypeRef'] || null,
                mandatory: properties['bcpg:documentIsMandatory'] === true,
                // `Simulation` = expected but not supplied yet (contracts §9).
                state: properties['bcpg:documentState'] || null,
                expected: properties['bcpg:documentState'] === 'Simulation',
                validFrom: doclibDate(properties['cm:from']),
                validTo: doclibDate(properties['cm:to']),
                aiValidationState: properties['bcpg:aiValidationState'] || null,
                aiValidationHints: properties['bcpg:aiValidationHints'] || null,
            };
        }),
    };
}

/**
 * Everything one step needs to render, in one call.
 *
 * The shape depends on the step type, and always echoes the step's computed
 * `readOnly` / `frozen` so the UI has no reason to recompute anything:
 *
 * - `form` → `{ step, definition }` — the definition carries the values;
 * - `entityDataList` → `{ step, columns, rows, total, page, pageSize }`;
 * - `survey` → `{ step, listId, questions, answers, disabled }` — the decision
 *   tree, from `becpg/survey`, **not** a datalist (`lib/adapters/survey.js`);
 * - `documents` → `{ step, folderNodeRef, documents }`.
 *
 * @param {Object} state result of {@link getWizardState}
 * @param {string} stepId
 * @param {Object} [options]
 * @param {number} [options.page=1]
 * @param {number} [options.pageSize]
 * @param {string} [options.sort]
 * @param {string} [options.locale]
 * @param {Object} [options.session]
 * @returns {Promise<Object>}
 */
/**
 * Columns of a datalist / survey step — from the definition Share already
 * resolved when there is one, otherwise from the columns endpoint.
 *
 * The order matters and is not an optimisation: `module/entity-datagrid/config/columns`
 * runs as a Share *user* and answers 401 without a Share session, which the portal
 * server has no way to obtain (contracts §8). When the wizard came from Share it
 * already carries the resolved fields, so asking again can only turn a working step
 * into `share_session_required`. See {@link columnsFromDefinition}.
 *
 * @param {Object} ctx wizard context
 * @param {Object} step a normalised step
 * @param {string} itemType prefixed item type
 * @param {'view'|'edit'} mode
 * @returns {Promise<Object[]>}
 */
async function stepColumns(ctx, step, itemType, mode) {
    const resolved = columnsFromDefinition(step, mode);
    if (resolved) {
        return resolved;
    }
    return getColumns(ctx, {
        itemType,
        listId: step.listId,
        formId: step.formId,
        mode,
    });
}

/**
 * The normalised form definition a `form` step already carries, when Share
 * resolved one.
 *
 * The counterpart of {@link stepColumns} for the one step type that is not a
 * grid. `null` when the step has no definition, or when Share answered the typed
 * `no-form-config` marker — measured on the reference instance, `formId=supplier` on
 * `bcpg:rawMaterial` resolves to no form there, and an empty definition must
 * fall through to the columns path rather than freeze the sheet at zero fields.
 *
 * @param {Object} step a decorated wizard step
 * @param {'view'|'edit'} mode
 * @returns {Object|null}
 */
function resolveShareDefinition(step, mode) {
    return normalizeShareDefinition(step?.definition, {
        formId: step?.formId,
        itemType: step?.itemId,
        mode,
    });
}

/**
 * Normalises one raw definition Share sent, whichever form it came from.
 *
 * @param {Object|null} raw
 * @param {{formId: ?string, itemType: ?string, mode: 'view'|'edit'}} options
 * @returns {Object|null}
 */
function normalizeShareDefinition(raw, { formId, itemType, mode }) {
    if (!raw || !Array.isArray(raw.fields) || raw.fields.length === 0) {
        return null;
    }
    const definition = normalizeFormDefinition(raw, { formId, itemType, mode });
    if (mode === 'view') {
        definition.fields = definition.fields.map((field) => ({ ...field, readOnly: true }));
    }
    return definition;
}

/**
 * The properties a row editor's form needs the repository to extract.
 *
 * Same convention as {@link requestFields}: underscored, without the `prop_` /
 * `assoc_` prefix. An unknown name is silently ignored by the datalist
 * webscript, so asking for a field the item type does not carry is free.
 *
 * @param {Object|null} rowForm a normalised definition
 * @returns {string[]}
 */
function rowFormFields(rowForm) {
    return (rowForm?.fields || [])
        .filter((field) => field && field.name)
        .map((field) => String(field.name).replace(/:/g, '_'));
}

export async function getStepData(state, stepId, options = {}) {
    const session = options.session || await requireSession();
    const step = findStep(state, stepId);
    const entityNodeRef = state.entity.nodeRef;
    const mode = step.readOnly ? 'view' : 'edit';

    const ctx = createContext(session, {
        entityType: state.entity.type,
        entityNodeRef,
        siteId: state.entity.siteId,
        locale: options.locale,
    });

    if (step.type === 'documents') {
        const documents = await getDocuments(entityNodeRef, { session });
        return { step, ...documents };
    }

    if (step.type === 'form') {
        const entity = await getEntity(entityNodeRef, { session });
        // Same rule as `stepColumns` for the datalist steps, and for the same
        // reason: when the wizard came from Share it already carries the fields
        // Share resolved, and re-asking `module/entity-datagrid/config/columns`
        // for them answers 401 (`share_session_required`, contracts §8) because
        // that endpoint runs as a Share *user*. The form branch was the one place
        // that still re-asked. `resolveShareDefinition` returns null when the step
        // carries nothing usable — including the typed `no-form-config` marker —
        // so the columns path stays the fallback it always was.
        const definition = resolveShareDefinition(step, mode)
            || await getFormDefinition(ctx, {
                itemType: step.itemId || state.entity.type,
                formId: step.formId,
                mode,
            });
        // `d:noderef` (Famille / Sous-famille): the stored value is a nodeRef, and
        // the form endpoint does not give its label. It is resolved here — with no
        // call when `becpg/remote/entity` already unfolded the target, one request
        // per distinct target otherwise — rather than displaying the identifier.
        const filled = applyValues(definition, entity.attributes);
        return {
            step,
            definition: await resolveNodeRefLabels(filled, createBecpgClient(session), {
                lang: options.locale,
            }),
        };
    }

    if (step.type === 'survey') {
        // A questionnaire is NOT a datalist read through another widget: the
        // structure (`survey:surveyQuestion`) and the answers (`survey:surveyList`)
        // are two different types, and only the second is writable. beCPG serves
        // both in one call, response types and `nextQuestion` links included —
        // none of which survives the datagrid column resolution.
        const survey = await getSurvey(entityNodeRef, step.listId, {
            skipSecurityRules: state.skipSecurityRules,
            session,
        });
        return { step, listNodeRef: step.listNodeRef || null, ...survey };
    }

    const list = await resolveDataList(entityNodeRef, step.listId, {
        datalists: state.datalists,
        session,
    });
    const itemType = step.itemId || list.itemType;
    const columns = await stepColumns(ctx, step, itemType, mode);

    /*
     * The row editor's fields, when Share sent the item's default form.
     *
     * The grid renders the datagrid columns, which is what the customer chose to
     * show in a table; the default form is where the fields that do not fit a
     * table live — the parent of an ingredient above all, which a supplier could
     * otherwise never set. `null` when beCPG sent none, and the editor is then
     * simply not offered.
     */
    const rowForm = normalizeShareDefinition(step.itemDefinition, { itemType, mode });

    const data = await getRows({
        listNodeRef: list.nodeRef,
        itemType,
        listId: step.listId,
        entityNodeRef,
        // The row editor's fields are requested with the grid's: a definition
        // resolved without a node carries the model default, never the row's
        // value, so an editor seeded from it would show — and on the next save
        // write — a default over what the row really holds.
        fields: [...new Set([...requestFields(columns), ...rowFormFields(rowForm)])],
        page: options.page,
        pageSize: options.pageSize,
        sort: options.sort,
        locale: options.locale,
        session,
    });

    return { step, listNodeRef: list.nodeRef, itemType, columns, rowForm, ...data };
}

/* -------------------------------------------------------------------------- */
/* Between steps                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Reformulates the entity — `becpg/remote/formulate`.
 *
 * Kept from the existing wizard, but the caller is expected to run it
 * **asynchronously and without blocking the UI** (spec §4.4).
 *
 * @param {string} entityNodeRef
 * @param {Object} [options]
 * @param {Object} [options.session]
 * @param {number} [options.timeout] overrides the default upstream timeout
 * @returns {Promise<Object>} the reformulated entity
 */
export async function formulate(entityNodeRef, options = {}) {
    const nodeRef = toEntityNodeRef(entityNodeRef);
    return getJson('becpg/remote/formulate', {
        query: { nodeRef },
        session: options.session,
        timeout: options.timeout,
        // Formulation is expensive and not idempotent-cheap: never replay it.
        retries: 0,
    });
}

/**
 * Runs a step's `nextStepWebScript`, if it declares one.
 *
 * The configuration stores a template such as
 * `becpg/remote/formulate?nodeRef={nodeRef}&format=json` or
 * `becpg/project/path?nodeRef={nodeRef}&path=SupplierDocuments`. Only
 * `{nodeRef}` is substituted, and the resulting path still goes through the
 * proxy allow-list — a configuration error cannot open an arbitrary webscript.
 *
 * @param {Object} step a decorated step
 * @param {string} entityNodeRef
 * @param {Object} [options]
 * @param {Object} [options.session]
 * @returns {Promise<Object|null>} the webscript answer, or null when there is none
 */
export async function runNextStepWebScript(step, entityNodeRef, options = {}) {
    if (!step?.nextStepWebScript) {
        return null;
    }
    const nodeRef = toEntityNodeRef(entityNodeRef);
    const resolved = String(step.nextStepWebScript).replace(/\{nodeRef\}/g, encodeURIComponent(nodeRef));
    const [path, search = ''] = resolved.replace(/^\/+/, '').split('?');

    const query = {};
    for (const [name, value] of new URLSearchParams(search)) {
        if (name !== 'format') {
            query[name] = value;
        }
    }

    return getJson(path, { query, session: options.session, retries: 0 });
}

/**
 * **The single write gate of the wizard.**
 *
 * Every mutation of a step — a form save, a row create/update, a row delete, a
 * reorder — goes through this check first. It is what makes the frozen state a
 * *server-side* rule rather than a UI convention: `curl -X DELETE` from a
 * console is refused here, before any Alfresco call is made.
 *
 * The verdict is never recomputed (bug #25928): `step.readOnly` / `step.frozen`
 * come from the single `becpg/security/entitylists/check` call that produced the
 * state, and this function only reads them.
 *
 * @param {Object} state result of {@link getWizardState}
 * @param {string} stepId
 * @returns {Object} the step, when it may be written to
 * @throws {BadRequestError} naming the reason, rather than an opaque 403 from
 *         three layers down
 */
export function assertStepWritable(state, stepId) {
    const step = findStep(state, stepId);
    if (step.readOnly) {
        throw new BadRequestError(
            step.frozen
                ? `Step "${stepId}" has been validated by the client and can no longer be modified`
                : `Step "${stepId}" is read-only`,
            { details: { stepId, frozen: step.frozen, reason: state.readOnlyReason } },
        );
    }
    return step;
}

/**
 * Resolves the datalist a step edits, and the columns to write it with.
 *
 * @param {Object} state
 * @param {Object} step
 * @param {Object} session
 * @param {Object} [options]
 * @returns {Promise<{list: Object, itemType: string, columns: Object[], ctx: Object}>}
 */
async function stepDataListContext(state, step, session, options = {}) {
    const ctx = createContext(session, {
        entityType: state.entity.type,
        entityNodeRef: state.entity.nodeRef,
        siteId: state.entity.siteId,
        locale: options.locale,
    });
    const list = await resolveDataList(state.entity.nodeRef, step.listId, {
        datalists: state.datalists,
        session,
    });
    const itemType = step.itemId || list.itemType;
    const columns = await stepColumns(ctx, step, itemType, 'edit');
    return { ctx, list, itemType, columns };
}

/**
 * Deletes rows of a datalist step.
 *
 * Refused on a frozen or read-only step, exactly like {@link saveStep} — this is
 * the endpoint the grid calls, so a frozen list is unmodifiable whether the
 * request comes from the UI or from a hand-written `fetch`.
 *
 * @param {Object} state result of {@link getWizardState}
 * @param {string} stepId
 * @param {Object} payload
 * @param {string|string[]} payload.nodeRefs the rows to delete
 * @param {Object} [options]
 * @param {Object} [options.session]
 * @returns {Promise<{step: string, deleted: string[], failed: Object[]}>}
 */
export async function deleteStepRows(state, stepId, payload = {}, options = {}) {
    const session = options.session || await requireSession();
    const step = assertStepWritable(state, stepId);

    if (step.type === 'form' || step.type === 'documents') {
        throw new BadRequestError(`Step "${stepId}" has no rows to delete`);
    }

    // A questionnaire has no deletable row: a `survey:surveyList` row IS a
    // question the customer asked, and deleting it would remove the question,
    // not the answer. Clearing an answer is a write of the answer itself
    // (`saveStep`), which is why this verb is refused outright rather than
    // gated — the UI offers no such control either, and cannot be the only guard.
    if (step.type === 'survey') {
        throw new BadRequestError(
            `Step "${stepId}" is a questionnaire: a supplier answers it, it cannot delete a question`,
            { details: { stepId, listId: step.listId } },
        );
    }

    // The list is resolved so the answer names it, and so a step pointing at a
    // list the entity does not carry fails here rather than half-way through the
    // delete. It is NOT a membership check: `slingshot/datalists/action/items`
    // takes bare nodeRefs, and Alfresco's own permission check on each node is
    // what stops a caller from naming a row of somebody else's list.
    const { list } = await stepDataListContext(state, step, session, options);
    const asked = Array.isArray(payload.nodeRefs) ? payload.nodeRefs : [payload.nodeRefs];
    const result = await deleteItem({ nodeRefs: asked, session });

    return { step: step.id, listNodeRef: list.nodeRef, ...result };
}

/**
 * Moves a row of a datalist step up or down.
 *
 * @param {Object} state result of {@link getWizardState}
 * @param {string} stepId
 * @param {Object} payload
 * @param {string|string[]} payload.nodeRefs the row(s) to move
 * @param {'up'|'down'} payload.direction
 * @param {Object} [options]
 * @param {Object} [options.session]
 * @returns {Promise<Object>}
 */
export async function reorderStepRows(state, stepId, payload = {}, options = {}) {
    const session = options.session || await requireSession();
    const step = assertStepWritable(state, stepId);

    if (step.type === 'form' || step.type === 'documents') {
        throw new BadRequestError(`Step "${stepId}" has no rows to reorder`);
    }

    // The order of a questionnaire is the customer's (`bcpg:sort` on the
    // questions, walked by `survey:nextQuestion`). A respondent never reorders it.
    if (step.type === 'survey') {
        throw new BadRequestError(
            `Step "${stepId}" is a questionnaire: its order belongs to the questions, not to the answers`,
            { details: { stepId, listId: step.listId } },
        );
    }

    const { list } = await stepDataListContext(state, step, session, options);
    await sortItem({
        listNodeRef: list.nodeRef,
        nodeRefs: payload.nodeRefs,
        direction: payload.direction,
        session,
    });

    return { step: step.id, listNodeRef: list.nodeRef, sortedAt: new Date().toISOString() };
}

/**
 * Saves a step.
 *
 * - `form` steps go through the Alfresco form processor on the entity;
 * - datalist steps create or update one row;
 * - `survey` steps post the whole answer set to `becpg/survey`.
 *
 * The write is refused up front when the computed state says the step is
 * read-only: beCPG would refuse too, but a 409 that names the reason is a much
 * better answer than a 403 from three layers down.
 *
 * @param {Object} state result of {@link getWizardState}
 * @param {string} stepId
 * @param {Object} payload
 * @param {Object} [payload.values] values to write
 * @param {Object[]} [payload.answers] questionnaire answers (`survey` steps)
 * @param {string} [payload.nodeRef] the row to update (datalist steps)
 * @param {Object} [options]
 * @param {Object} [options.session]
 * @returns {Promise<Object>}
 */
export async function saveStep(state, stepId, payload = {}, options = {}) {
    const session = options.session || await requireSession();
    const step = assertStepWritable(state, stepId);

    if (step.type === 'form') {
        const ctx = createContext(session, {
            entityType: state.entity.type,
            entityNodeRef: state.entity.nodeRef,
            siteId: state.entity.siteId,
            locale: options.locale,
        });
        // Share's own definition first — see {@link resolveShareDefinition}. The
        // definition is only read here to tell a property from an association, but
        // a 401 on the columns endpoint would fail the *save*, not just the read.
        const definition = resolveShareDefinition(step, 'edit')
            || await getFormDefinition(ctx, {
                itemType: step.itemId || state.entity.type,
                formId: step.formId,
                mode: 'edit',
            });
        const result = await saveForm(state.entity.nodeRef, payload.values || {}, {
            fields: definition.fields,
            entityNodeRef: state.entity.nodeRef,
            skipSecurityRules: state.skipSecurityRules,
            session,
        });
        return { step: step.id, ...result, savedAt: new Date().toISOString() };
    }

    if (step.type === 'documents') {
        throw new BadRequestError('Documents are deposited through /api/v1/documents, not through the step endpoint');
    }

    if (step.type === 'survey') {
        // `{ answers: [{ qid, cid?, listOptions?, comment? }] }` — the complete
        // set, every time: beCPG resets the rows and re-applies what it is given,
        // so a partial payload would erase what it omits. `saveSurvey` re-reads
        // the questionnaire and drops anything it does not define, which is what
        // makes "a supplier answers, never authors" a server-side rule.
        //
        // The array is REQUIRED, and this guard is the reason: a datalist-shaped
        // body — `{ values: {...} }`, what a client that believed a
        // `permissions: { create: true }` would send to add a row — carries no
        // `answers`, and "reset every row, re-apply nothing" would have quietly
        // erased the whole questionnaire. A questionnaire is answered with
        // answers; there is no other verb, and asking for one is an error, not a
        // no-op.
        if (!Array.isArray(payload.answers)) {
            throw new BadRequestError(
                `Step "${stepId}" is a questionnaire: write it with { answers: [...] }`,
                { details: { stepId, listId: step.listId } },
            );
        }
        const result = await saveSurvey(state.entity.nodeRef, step.listId, payload.answers, {
            skipSecurityRules: state.skipSecurityRules,
            session,
        });
        return { step: step.id, ...result };
    }

    const { list, itemType, columns } = await stepDataListContext(state, step, session, options);

    const result = payload.nodeRef
        ? await updateItem({
            nodeRef: payload.nodeRef,
            values: payload.values || {},
            columns,
            itemType,
            entityNodeRef: state.entity.nodeRef,
            skipSecurityRules: state.skipSecurityRules,
            session,
        })
        : await createItem({
            listNodeRef: list.nodeRef,
            itemType,
            values: payload.values || {},
            columns,
            entityNodeRef: state.entity.nodeRef,
            skipSecurityRules: state.skipSecurityRules,
            session,
        });

    return { step: step.id, ...result, savedAt: new Date().toISOString() };
}

export { parseListId };
