/**
 * `GET|POST /api/v1/messages` — discussions.
 *
 * The client's remarks and the supplier's answers are, in beCPG, the Alfresco
 * **forum** attached to a node: an `fm:forum` holding `fm:topic`/`fm:post`
 * children. Share's wizard shows them through `Alfresco.CommentsList`, which
 * talks to `api/node/{store}/{id}/comments` — the very same forum model, exposed
 * as a flat, chronological thread. That is what the portal consumes, so a
 * message written in Share appears in the portal and vice versa: **one
 * discussion, two front ends** (spec §7.1).
 *
 * | Verb | Upstream | Purpose |
 * |---|---|---|
 * | `GET`  | `api/node/{store}/{store_id}/{id}/comments` | read a thread |
 * | `POST` | same, POST | post a message |
 *
 * Threading: Alfresco's comment API is deliberately flat, which is what a
 * client/supplier exchange needs. Replies to a specific post
 * (`api/forum/post/node/…/replies`) exist in the repository but are not exposed
 * here — a supplier discussion that grows a tree is a discussion nobody reads.
 *
 * Anchoring: the spec asks for comments anchored at the **field / row** level,
 * not only at task level (spec §4.4). `nodeRef` is therefore whatever the UI is
 * discussing — the entity, a datalist row, a document — and the optional
 * `field` is echoed in the message title so both front ends can filter on it.
 *
 * Query (GET): `nodeRef` (required), `page`, `pageSize`, `scope`.
 *
 * ## `scope=entity` — what "the whole sheet" has to mean
 *
 * A row's discussion lives on **the row node**, which is a different forum from the
 * entity's. So the sheet-level view, reading the entity forum alone, showed "Aucun
 * message" while a remark sat on the *AG saturés* line right next to it (#35846) —
 * a message the client had written and the supplier could not find.
 *
 * With `scope=entity` the route reads **every thread of the subtree**: the `fm:forum`
 * nodes under the entity name the nodes that carry a discussion, and each one's
 * thread is read the same way the entity's own is.
 *
 * Three things were measured on 26.1.0 before settling on that shape, and each rules
 * out a shorter road:
 *
 *   - a bare `ANCESTOR:` with no `TYPE:` clause answers **nothing**, and
 *     `TYPE:"bcpg:nutList"` does not match a datalist row of a live entity either:
 *     "find the commented rows, then read their threads" cannot be written;
 *   - `fm:forum` and `fm:post`, on the other hand, are found immediately — the
 *     predicate is DB-supported, so a comment posted a second ago is already there;
 *   - `api/forum/post/node/…/{post}` always answers with the **first** post of the
 *     post's topic, and a node's comments are sibling posts of one topic: reading
 *     them one by one returns the same message N times.
 *
 * The fan-out is capped: past {@link AGGREGATE_MAX_NODES} commented nodes the answer
 * says `truncated: true` rather than issuing an unbounded number of reads.
 *
 * A message keeps its anchor in its title — `field:bcpg:legalName` for a field,
 * `row:AG saturés` for a datalist row — which is what lets the panel say where a
 * message belongs without resolving its node.
 *
 * Body (POST):
 * ```json
 * { "nodeRef": "workspace://SpacesStore/…",
 *   "content": "The allergen list is missing soy.",
 *   "field": "bcpg:allergenList" }
 * ```
 *
 * ## May I write here? — `canPost`
 *
 * A supplier does **not** hold write access on an entity for ever. `SupplierSecurityPlugin`
 * (beCPG) grants it only while the account holds an assigned — or pooled — workflow task
 * carrying a supplier-wizard deliverable on that entity; once the referencing is over the
 * entity is read-only again, and Alfresco refuses the comment. So the GET answers with
 * **`canPost`**, and the UI removes the composer instead of offering a Send button that can
 * only fail (defect F6).
 *
 * The verdict comes from `nodePermissions.create`, which the comments resource itself
 * returns: it is the very ACL check the POST performs, so the announced right and the real
 * one cannot drift apart. `accessMode` / `hasAssignedTask` — the pair the wizard already uses
 * to decide `readOnly` — is then read from `becpg/security/entitylists/check` to *name* the
 * reason, so the sentence shown under a closed discussion and the one shown by the wizard
 * come from a single source. It is deliberately not the other way round: `accessMode` is
 * beCPG's entity-level verdict on *field* writes and is measurably wider than the forum ACL
 * (an entity outside the supplier's own perimeter answers `accessMode: 2` while
 * `nodePermissions.create` is `false`), so trusting it alone would keep offering a Send
 * button that 500s.
 */

import { NextResponse } from 'next/server';
import { classLabels } from '@/lib/adapters/dictionary';
import { mapWithConcurrency } from '@/lib/adapters/tasks';
import { BadRequestError, toApiResponse } from '@/lib/errors';
import {
    becpgJson,
    getJson,
    getNodeAncestry,
    isNodeRef,
    nodeRefToPath,
    requireSession,
} from '@/lib/becpg';
import { getEntityListsState } from '@/lib/adapters/datalists';
import { logWarn } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Messages per page when the caller does not say. */
const DEFAULT_PAGE_SIZE = 25;

/** Hard ceiling on the page size. */
const MAX_PAGE_SIZE = 100;

/** Longest message the portal accepts, to keep a runaway paste out of the repo. */
const MAX_CONTENT_LENGTH = 20000;

/**
 * Field marker written into the message title, so a message anchored on a field
 * can be found again by both front ends.
 */
const FIELD_PREFIX = 'field:';

/**
 * Same idea for a datalist row: the row has no name a human reads, so the label the
 * supplier saw when writing travels with the message.
 */
const ROW_PREFIX = 'row:';

/** Reads in flight at once on the sheet-level view: beCPG's rate limiter answers 429 past a burst. */
const AGGREGATE_CONCURRENCY = 5;

/** Commented nodes read by `scope=entity` before the answer declares itself truncated. */
const AGGREGATE_MAX_NODES = 20;

/**
 * Normalises one Alfresco comment.
 *
 * @param {Object} raw
 * @returns {Object}
 */
function normalizeMessage(raw, source = null) {
    const author = raw?.author || {};
    const title = raw?.title || '';
    const field = title.startsWith(FIELD_PREFIX) ? title.slice(FIELD_PREFIX.length).trim() : null;
    const row = title.startsWith(ROW_PREFIX) ? title.slice(ROW_PREFIX.length).trim() : null;

    /*
     * Where the message comes from, in order of what can be proved: the list the
     * repository says the commented node belongs to, then the row the portal
     * wrote in the comment title when it posted it, then nothing. A remark
     * written from beCPG has no title, which is exactly why the list is resolved
     * server-side rather than read out of it.
     */
    return {
        source: source
            ? { ...source, label: source.label || row || null }
            : (row ? { label: row, list: null } : null),
        nodeRef: raw?.nodeRef || null,
        // `content` is already stripped of unsafe HTML by the repository
        // (`stringUtils.stripUnsafeHTML`); the UI still renders it as text.
        content: raw?.content || '',
        field,
        author: {
            username: author.username || raw?.author?.username || '',
            firstName: author.firstName || '',
            lastName: author.lastName || '',
            displayName: [author.firstName, author.lastName].filter(Boolean).join(' ')
                || author.username || '',
        },
        createdOn: raw?.createdOnISO || raw?.createdOn || null,
        modifiedOn: raw?.modifiedOnISO || raw?.modifiedOn || null,
        edited: raw?.isUpdated === true,
        permissions: raw?.permissions || {},
    };
}

/**
 * @param {string} value
 * @returns {string} a validated nodeRef
 */
function requireNodeRef(value) {
    if (!isNodeRef(value)) {
        throw new BadRequestError('A valid nodeRef is required');
    }
    return value;
}

/** `accessMode` values of `becpg/security/entitylists/check` — same table as the wizard. */
const ACCESS_MODE = { NONE: 0, READ: 1, WRITE: 2 };

/**
 * Stable reasons a thread is read-only. The UI maps them to a sentence; they are part of the
 * API contract, exactly like `ERROR_CODES`.
 */
const DENY_REASONS = {
    /** No workflow task in progress on the entity: the referencing is closed. */
    NO_ASSIGNED_TASK: 'noAssignedTask',
    /** beCPG's security grants read access only on this entity. */
    READ_ACCESS: 'readAccess',
    /** Refused, and neither of the two above explains it. */
    NO_PERMISSION: 'noPermission',
};

/**
 * Names *why* the repository refuses a post, from the pair the wizard already uses.
 *
 * `hasAssignedTask` is tested first, on purpose: for a supplier it is the only thing that
 * ever opens write access (`SupplierSecurityPlugin`), so it is both the cause and the
 * sentence the user needs — "the referencing is closed" — while `accessMode: 1` is its
 * consequence. The wizard tests them in the opposite order because there `enforceTask` may
 * be off; both orders name a true reason, and only the sentence differs.
 *
 * The wording assumes the reader is a supplier, which is who `/messages` is for. An internal
 * account refused by an ACL would read "the referencing is closed" where "you are not allowed
 * here" would be truer — it never reaches this branch in practice, because an internal
 * account that can read a thread can write on it.
 *
 * @param {string} nodeRef the node the thread hangs on (entity, row or document)
 * @param {Object} session
 * @returns {Promise<{reason: string, accessMode: number|null, hasAssignedTask: boolean|null}>}
 */
async function explainDenial(nodeRef, session) {
    try {
        const security = await getEntityListsState(nodeRef, {
            checkTaskAssignment: true,
            session,
        });
        const reason = security.hasAssignedTask === false
            ? DENY_REASONS.NO_ASSIGNED_TASK
            : security.accessMode === ACCESS_MODE.READ
                ? DENY_REASONS.READ_ACCESS
                : DENY_REASONS.NO_PERMISSION;
        return {
            reason,
            accessMode: security.accessMode,
            hasAssignedTask: security.hasAssignedTask,
        };
    }
    catch {
        // Never fail a thread on the explanation: the composer is already hidden, and a
        // generic sentence is better than an error page over a discussion the user can read.
        return { reason: DENY_REASONS.NO_PERMISSION, accessMode: null, hasAssignedTask: null };
    }
}

/**
 * The nodes of the sheet that carry a discussion.
 *
 * `fm:forum` is the queryable signal — Alfresco creates one under a node the first
 * time it is commented — and its parent is the node being discussed. Both steps are
 * needed: a bare `ANCESTOR:` with no `TYPE:` clause answers nothing, the datalist
 * rows are not reachable by type at all, and the forum's own payload names its
 * parent only by path, never by nodeRef.
 *
 * @param {string} entityNodeRef
 * @param {Object} session
 * @returns {Promise<{nodes: Object[], truncated: boolean}>} one descriptor per
 *          commented node: `{ nodeRef, name, ancestors }`
 */
async function commentedNodes(entityNodeRef, session) {
    const payload = await getJson('becpg/remote/entity/list', {
        query: {
            query: `TYPE:"fm:forum" AND ANCESTOR:"${entityNodeRef}"`,
            lists: 'none',
            maxResults: AGGREGATE_MAX_NODES + 1,
        },
        session,
    });

    const forums = (Array.isArray(payload?.entities) ? payload.entities : [])
        .map((row) => row && row.entity)
        .filter((node) => node && node.id)
        .map((node) => (node.id.includes('://') ? node.id : `workspace://SpacesStore/${node.id}`));

    const parents = await mapWithConcurrency(forums.slice(0, AGGREGATE_MAX_NODES), AGGREGATE_CONCURRENCY, async (forum) => {
        try {
            const ancestry = await getNodeAncestry(forum, { session });
            return ancestry.nodeRef ? ancestry : null;
        }
        catch (error) {
            logWarn('messages.forum.unresolved', {
                route: 'messages',
                forum: forum.slice(0, 80),
                message: error.message,
            });
            return null;
        }
    });

    const byNodeRef = new Map();
    for (const ancestry of parents.filter(Boolean)) {
        if (!byNodeRef.has(ancestry.nodeRef)) {
            byNodeRef.set(ancestry.nodeRef, ancestry);
        }
    }

    return {
        nodes: [...byNodeRef.values()],
        truncated: forums.length > AGGREGATE_MAX_NODES,
    };
}

/**
 * Names the list each commented node belongs to.
 *
 * A row names neither its list nor itself in a way a reader recognises, and a
 * remark written from beCPG carries no title at all — so the origin has to be
 * resolved from the repository. `becpg/security/entitylists/check` already
 * names every list of the entity, translated, and the ancestry came back with
 * the forum: one call for the whole view, no read per row.
 *
 * @param {string} entityNodeRef
 * @param {Object[]} descriptors what {@link commentedNodes} returned
 * @param {Object} session
 * @returns {Promise<Object[]>} the same descriptors, `source` attached
 */
async function describeSources(entityNodeRef, descriptors, session) {
    // Nothing but the sheet's own forum: there is no list to name, so the call
    // that names them is not worth making.
    if (descriptors.every((descriptor) => descriptor.nodeRef === entityNodeRef)) {
        return descriptors.map((descriptor) => ({ ...descriptor, source: null }));
    }

    let lists = new Map();
    try {
        const state = await getEntityListsState(entityNodeRef, { session });
        lists = new Map((state.datalists || [])
            .filter((list) => list.nodeRef)
            .map((list) => [list.nodeRef, list.title || list.name]));
    }
    catch (error) {
        // Degrade explicitly: the messages are still worth showing without the
        // name of the list they came from.
        logWarn('messages.lists.unresolved', { route: 'messages', message: error.message });
    }

    return descriptors.map((descriptor) => {
        if (descriptor.nodeRef === entityNodeRef) {
            return { ...descriptor, source: null };
        }
        const holder = (descriptor.ancestors || [])
            .map((ancestor) => lists.get(ancestor.nodeRef))
            .filter(Boolean)
            .pop() || null;
        // A commented node that hangs off no list is not a row: a document of
        // the entity's folder, for one. Naming it « une ligne » would be worse
        // than saying nothing, so the title-derived anchor keeps its say.
        if (!holder) {
            return { ...descriptor, source: null };
        }
        return { ...descriptor, source: { nodeRef: descriptor.nodeRef, list: holder, label: null } };
    });
}

/**
 * Reads one node's thread for the sheet-level view.
 *
 * A thread that cannot be read is skipped rather than fatal: the sheet-level view
 * must survive one row whose ACL refuses the caller — showing the other twelve
 * messages is better than showing none.
 *
 * @param {Object} descriptor `{ nodeRef, source }`
 * @param {Object} options `{ session, pageSize }`
 * @returns {Promise<Object[]>}
 */
async function readNodeThread(descriptor, { session, pageSize }) {
    const nodeRef = descriptor.nodeRef;
    try {
        const payload = await getJson(`api/node/${nodeRefToPath(nodeRef)}/comments`, {
            query: { reverse: 'true', startIndex: 0, pageSize },
            session,
        });
        return (Array.isArray(payload?.items) ? payload.items : [])
            .map((item) => normalizeMessage(item, descriptor.source));
    }
    catch (error) {
        logWarn('messages.thread.unreadable', {
            route: 'messages',
            node: nodeRef.slice(0, 80),
            message: error.message,
        });
        return [];
    }
}

/**
 * Names the field a message hangs on with the label the reader knows: the
 * anchor stores the property's qname, which no reviewer reads. One dictionary
 * read for the entity's type, and only when a message is anchored on a field.
 *
 * @param {Object[]} messages
 * @param {string} nodeRef the entity
 * @param {Object} session
 * @returns {Promise<Object[]>} the messages, `fieldLabel` set where it is known
 */
async function nameFields(messages, nodeRef, session) {
    if (!messages.some((message) => message.field)) {
        return messages;
    }
    try {
        const entity = await getJson('becpg/remote/entity', {
            query: { nodeRef, lists: 'none', fields: 'cm:name' },
            session,
        });
        const labels = await classLabels(session, entity?.entity?.type || 'bcpg:product');
        return messages.map((message) => (message.field
            ? { ...message, fieldLabel: labels[message.field] || null }
            : message));
    }
    catch (error) {
        logWarn('messages.fieldLabels.unavailable', { route: 'messages', status: error?.status });
        return messages;
    }
}

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function GET(request) {
    try {
        const session = await requireSession();
        const url = new URL(request.url);
        const nodeRef = requireNodeRef(url.searchParams.get('nodeRef'));

        const pageSize = Math.min(
            MAX_PAGE_SIZE,
            Math.max(1, Number(url.searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE),
        );
        const page = Math.max(1, Number(url.searchParams.get('page')) || 1);

        const payload = await getJson(`api/node/${nodeRefToPath(nodeRef)}/comments`, {
            query: {
                // Newest first: a supplier reads the last remark, not the first.
                reverse: 'true',
                startIndex: (page - 1) * pageSize,
                pageSize,
            },
            session,
        });

        const items = Array.isArray(payload?.items) ? payload.items : [];
        const nodePermissions = payload?.nodePermissions || {};

        // `create` is the repository's own answer to "may this user add a post here", so it
        // is the one the portal reports.
        let canPost = nodePermissions.create === true;
        let denial = null;
        if (nodePermissions.create === undefined) {
            // Older comments webscript: no ACL verdict in the payload. Fall back on beCPG's
            // entity-level one — `accessMode: READ` is a denial we can prove. Anything else,
            // including a check that could not be run at all, keeps the composer: removing a
            // control we cannot show to be forbidden is the mirror image of the same defect.
            const security = await explainDenial(nodeRef, session);
            canPost = security.accessMode !== ACCESS_MODE.READ;
            denial = canPost ? null : security;
        }
        else if (!canPost) {
            denial = await explainDenial(nodeRef, session);
        }

        /*
         * The sheet-level view replaces the list — it does not extend it: the topic
         * search already covers the entity's own forum, so reading both would show
         * every message of the sheet twice.
         */
        // Called explicitly: `map` hands the index as the second argument, and
        // the second argument is now the resolved source.
        let messages = items.map((item) => normalizeMessage(item));
        let aggregate = null;
        if (url.searchParams.get('scope') === 'entity') {
            const { nodes, truncated } = await commentedNodes(nodeRef, session);
            const described = await describeSources(nodeRef, nodes, session);
            messages = (await mapWithConcurrency(
                described,
                AGGREGATE_CONCURRENCY,
                (node) => readNodeThread(node, { session, pageSize }),
            ))
                .flat()
                .sort((a, b) => Date.parse(b.createdOn || 0) - Date.parse(a.createdOn || 0));
            aggregate = { scope: 'entity', sources: nodes.length, truncated };
        }

        messages = await nameFields(messages, nodeRef, session);

        const response = NextResponse.json({
            nodeRef,
            messages,
            total: aggregate ? messages.length : Number(payload?.total ?? items.length),
            aggregate,
            page,
            pageSize,
            permissions: nodePermissions,
            // The right to write, decided server-side. The UI removes the composer when it is
            // false and says why with `postDenyReason`; it never re-derives either (F6).
            canPost,
            postDenyReason: canPost ? null : (denial ? denial.reason : DENY_REASONS.NO_PERMISSION),
            // Echoed so a support session can see the wizard's own signals for this node.
            security: denial
                ? { accessMode: denial.accessMode, hasAssignedTask: denial.hasAssignedTask }
                : null,
        });
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'messages', method: 'GET' });
    }
}

/**
 * Posts a message.
 *
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function POST(request) {
    try {
        const session = await requireSession();

        let body;
        try {
            body = await request.json();
        }
        catch {
            throw new BadRequestError('Expected a JSON body');
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            throw new BadRequestError('Expected a JSON object');
        }

        const nodeRef = requireNodeRef(body.nodeRef);
        const content = typeof body.content === 'string' ? body.content.trim() : '';
        if (!content) {
            throw new BadRequestError('A message cannot be empty');
        }
        if (content.length > MAX_CONTENT_LENGTH) {
            throw new BadRequestError(`A message cannot exceed ${MAX_CONTENT_LENGTH} characters`);
        }

        const field = typeof body.field === 'string' && body.field.trim()
            ? body.field.trim().slice(0, 120)
            : null;

        /*
         * A row's label, kept with the message.
         *
         * The row node is named after a uuid, so a sheet-level reader has nothing to
         * show but "a row". The label the supplier had under his eyes when he wrote
         * — "AG saturés" — travels in the title, the same way a field's name does.
         */
        const row = !field && typeof body.itemTitle === 'string' && body.itemTitle.trim()
            ? body.itemTitle.trim().slice(0, 120)
            : null;

        const payload = await becpgJson(`api/node/${nodeRefToPath(nodeRef)}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // The title is the anchor: `field:bcpg:allergenList`, `row:AG saturés`,
                // or empty for the sheet itself.
                title: field ? `${FIELD_PREFIX}${field}` : row ? `${ROW_PREFIX}${row}` : '',
                content,
                itemTitle: body.itemTitle || '',
                // Deep link back into the portal, used by the notification mail.
                page: 'portal',
                pageParams: JSON.stringify({ nodeRef }),
                nodeRef,
            }),
            session,
            retries: 0,
        });

        const created = payload?.item ? normalizeMessage(payload.item) : null;
        const response = NextResponse.json({
            posted: true,
            nodeRef,
            message: created,
            postedAt: new Date().toISOString(),
        }, { status: 201 });
        response.headers.set('Cache-Control', 'no-store');
        return response;
    }
    catch (error) {
        return toApiResponse(error, { route: 'messages', method: 'POST' });
    }
}
