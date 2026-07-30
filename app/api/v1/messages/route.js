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
 */

import { NextResponse } from 'next/server';
import { BadRequestError, toApiResponse } from '@/lib/errors';
import { becpgJson, getJson, isNodeRef, nodeRefToPath, requireSession } from '@/lib/becpg';

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
        const response = NextResponse.json({
            nodeRef,
            messages: items.map(normalizeMessage),
            total: Number(payload?.total ?? items.length),
            page,
            pageSize,
            permissions: payload?.nodePermissions || {},
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
