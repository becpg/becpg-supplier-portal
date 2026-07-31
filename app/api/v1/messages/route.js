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
 * Query (GET): `nodeRef` (required), `page`, `pageSize`.
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
import { BadRequestError, toApiResponse } from '@/lib/errors';
import { becpgJson, getJson, isNodeRef, nodeRefToPath, requireSession } from '@/lib/becpg';
import { getEntityListsState } from '@/lib/adapters/datalists';

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
 * Normalises one Alfresco comment.
 *
 * @param {Object} raw
 * @returns {Object}
 */
function normalizeMessage(raw) {
    const author = raw?.author || {};
    const title = raw?.title || '';
    const field = title.startsWith(FIELD_PREFIX) ? title.slice(FIELD_PREFIX.length).trim() : null;

    return {
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

        const response = NextResponse.json({
            nodeRef,
            messages: items.map(normalizeMessage),
            total: Number(payload?.total ?? items.length),
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

        const payload = await becpgJson(`api/node/${nodeRefToPath(nodeRef)}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // The title is the anchor: `field:bcpg:allergenList`, or empty.
                title: field ? `${FIELD_PREFIX}${field}` : '',
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
