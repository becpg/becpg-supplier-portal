/**
 * The versions of an entity, read-only — the history Share shows in its version
 * drop-down, for the monitoring space only.
 *
 * beCPG freezes every version of an entity in Alfresco's version store, with a
 * JSON snapshot of the entity and its datalists (`EntityVersionServiceImpl`).
 * Two repository calls are enough, both read-only:
 *
 *  - `becpg/api/entity-version?nodeRef=<entity>`: the history, newest first;
 *  - `becpg/remote/entity?nodeRef=<version node>`: the snapshot of one version,
 *    properties and datalists, which `JsonEntityVisitor` serves from the frozen
 *    JSON.
 *
 * Neither is open to the browser-facing proxy; only this adapter calls them, and
 * only for a monitoring account: a supplier account is not allowed to read the
 * history of the version its customer validated.
 *
 * Server only.
 */

import { getEntityJson, getJson } from '@/lib/becpg';
import { NotFoundError } from '@/lib/errors';
import { requireMonitorAccess } from '@/lib/adapters/monitor';
import { toNodeRef } from '@/lib/adapters/tasks';

/** The repository webscript Share reads the version history from. */
const VERSION_HISTORY_PATH = 'becpg/api/entity-version';

/**
 * One version of the history.
 *
 * @typedef {Object} EntityVersion
 * @property {string} label       e.g. `2.0`
 * @property {string} nodeRef     the frozen version node
 * @property {string|null} createdAt ISO date
 * @property {string|null} author
 * @property {string|null} comment the check-in comment
 * @property {boolean} current    the version the entity is at today
 */

/** The author of a version as a person reads it. */
function authorOf(creator) {
    if (!creator) {
        return null;
    }
    // Accounts created from an e-mail carry it as first AND last name.
    const name = [...new Set([creator.firstName, creator.lastName].filter(Boolean))].join(' ').trim();
    return name || creator.userName || null;
}

/**
 * @param {Object} raw a row of `becpg/api/entity-version`
 * @returns {EntityVersion}
 */
export function toVersion(raw) {
    return {
        label: String(raw.label || ''),
        nodeRef: raw.nodeRef,
        createdAt: raw.createdDateISO || null,
        author: authorOf(raw.creator),
        comment: raw.versionDescription || null,
        current: Boolean(raw.clickableNode),
    };
}

/**
 * The version history of an entity, newest first.
 *
 * @param {Object} params `{ session, entity }` — `entity` a nodeRef or uuid
 * @returns {Promise<{entity: string, versions: EntityVersion[]}>}
 */
export async function listEntityVersions({ session, entity }) {
    await requireMonitorAccess(session);
    const nodeRef = toNodeRef(entity);
    const payload = await getJson(VERSION_HISTORY_PATH, {
        session,
        query: { nodeRef },
        skipAllowList: true,
    });
    const rows = Array.isArray(payload) ? payload : (payload?.versions || []);
    return {
        entity: nodeRef,
        versions: rows.filter((row) => row && row.nodeRef).map(toVersion),
    };
}

/**
 * A datalist row of the snapshot, as the screen reads it: its properties.
 *
 * @param {Object} row a row of `entity.datalists[<type>]`
 * @returns {{id: string|null, attributes: Object}}
 */
function toSnapshotRow(row) {
    return { id: row?.id || null, attributes: row?.attributes || {} };
}

/**
 * One version of an entity: its properties and its datalists as they were frozen.
 *
 * The version is looked up in the entity's own history first, so this never
 * reads a node that is not a version of that entity.
 *
 * @param {Object} params `{ session, entity, version }` — `version` a version nodeRef
 * @returns {Promise<{version: EntityVersion, name: string|null,
 *                    attributes: Object, lists: Object.<string, Object[]>}>}
 * @throws {NotFoundError} when `version` is not in the entity's history
 */
export async function getEntityVersion({ session, entity, version }) {
    const { versions } = await listEntityVersions({ session, entity });
    const wanted = versions.find((entry) => entry.nodeRef === String(version || ''));
    if (!wanted) {
        throw new NotFoundError('Version not found for this entity', {
            details: { version: String(version || '').slice(-36) },
        });
    }
    const payload = await getEntityJson({ nodeRef: wanted.nodeRef }, { session, skipAllowList: true });
    const snapshot = payload?.entity || {};
    const lists = Object.fromEntries(Object.entries(snapshot.datalists || {})
        .filter(([, rows]) => Array.isArray(rows))
        .map(([type, rows]) => [type, rows.map(toSnapshotRow)]));
    return {
        version: wanted,
        name: snapshot['cm:name'] || snapshot.attributes?.['cm:name'] || null,
        attributes: snapshot.attributes || {},
        lists,
    };
}
