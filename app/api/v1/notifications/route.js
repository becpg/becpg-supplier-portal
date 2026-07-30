/**
 * `GET /api/v1/notifications` — in-app notifications (spec §4.3, §5.4 line
 * "composition", weakness F4).
 *
 * **No new engine, no new data.** beCPG already owns notification *emission*
 * (`NotificationRuleService` + `NotificationRuleJob`, multi-tenant, configurable
 * per tenant, with a standard "documents expiring in less than 90 days" rule).
 * What is missing is a place for the supplier to land: today the loop stops at
 * an email sent to the client.
 *
 * So this endpoint **composes** what the supplier already has, out of two
 * db-afts queries and one derivation:
 *
 *   1. **overdue tasks** — `pjt:taskList` rows still open whose `pjt:tlDue` is
 *      in the past;
 *   2. **documents** — expiring, expired, or expected-and-not-provided, from the
 *      documents adapter (which is itself one query).
 *
 * Nothing is written and nothing is stored: there is no read/unread state,
 * because that would be portal-owned state, and the portal deliberately holds
 * none (spec §7.1 — this is what lets both portals coexist).
 *
 * @example
 * fetch('/api/v1/notifications?noticeDays=90&limit=20');
 */

import { NextResponse } from 'next/server';
import { listDocuments, resolveScope, searchNodes, ancestorClause } from '@/lib/adapters/documents';
import { AuthError, toApiResponse } from '@/lib/errors';
import { getLiveSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, private' };
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Composition rules, in one place so a tenant can retune the portal's own
 * notification vocabulary without touching the code below.
 */
export const NOTIFICATION_CONFIG = {
    task: {
        type: 'pjt:taskList',
        stateProp: 'pjt:tlState',
        dueProp: 'pjt:tlDue',
        nameProp: 'pjt:tlTaskName',
        resourcesAssoc: 'pjt:tlResources',
        /** States for which a task is still owed. */
        openStates: ['Planned', 'InProgress', 'Refused'],
    },
    /** Document statuses that deserve a notification, with their severity. */
    documentSeverity: {
        expired: 'danger',
        missing: 'danger',
        refused: 'danger',
        expiring: 'warning',
    },
    /** An overdue task becomes `danger` past this many days. */
    taskDangerAfterDays: 7,
    /** Maximum number of notifications returned. */
    limit: 50,
};

function aftsValue(value) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * The overdue-task query — **one db-afts query**.
 *
 * ```
 * TYPE:"pjt:taskList"
 *   AND (=pjt:tlState:"Planned" OR =pjt:tlState:"InProgress" OR =pjt:tlState:"Refused")
 *   AND pjt:tlDue:[MIN TO <now>]
 * ```
 *
 * `pjt:tlState` and `pjt:tlDue` are both indexed. Results are ACL-filtered by
 * Alfresco, which is what limits an external account to the tasks of its own
 * referencing projects.
 *
 * @param {Date} now
 * @param {string[]} [ancestors] optional sub-tree restriction
 * @returns {string} the AFTS query
 */
export function buildOverdueTaskQuery(now, ancestors) {
    const task = NOTIFICATION_CONFIG.task;
    const states = task.openStates
        .map((state) => `=${task.stateProp}:"${aftsValue(state)}"`)
        .join(' OR ');
    return [
        `TYPE:"${task.type}"`,
        ancestorClause(ancestors),
        `(${states})`,
        `${task.dueProp}:[MIN TO ${now.toISOString()}]`,
    ].filter(Boolean).join(' AND ');
}

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function GET(request) {
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }

        const params = new URL(request.url).searchParams;
        const now = new Date();
        const limit = Number(params.get('limit')) > 0
            ? Number(params.get('limit'))
            : NOTIFICATION_CONFIG.limit;
        const documentConfigOverride = params.get('noticeDays')
            ? { noticeDays: Number(params.get('noticeDays')) }
            : undefined;

        const { ancestors } = await resolveScope(session, params.getAll('supplier'), {
            config: documentConfigOverride,
        });

        const taskQuery = buildOverdueTaskQuery(now, ancestors);
        const task = NOTIFICATION_CONFIG.task;

        const [tasks, documents] = await Promise.all([
            searchNodes(taskQuery, {
                session,
                fields: [task.nameProp, task.dueProp, task.stateProp, task.resourcesAssoc].join(','),
                maxResults: 200,
            }),
            listDocuments({
                session,
                supplier: params.getAll('supplier'),
                page: 1,
                pageSize: 500,
                config: documentConfigOverride,
            }),
        ]);

        const username = String(session.username || session.sub || '').toLowerCase();
        const notifications = [];

        for (const node of tasks.items) {
            const due = node.attributes[task.dueProp] || null;
            const daysOverdue = due
                ? Math.max(0, Math.floor((now.getTime() - new Date(due).getTime()) / MS_PER_DAY))
                : 0;
            const resources = node.attributes[task.resourcesAssoc];
            const resourceList = Array.isArray(resources) ? resources : (resources ? [resources] : []);
            const assignedToMe = resourceList.some((resource) => String(
                resource['cm:userName'] || resource['cm:authorityName'] || '',
            ).toLowerCase() === username);

            notifications.push({
                id: `task:${node.id}`,
                type: 'task.overdue',
                severity: daysOverdue >= NOTIFICATION_CONFIG.taskDangerAfterDays ? 'danger' : 'warning',
                title: node.attributes[task.nameProp] || node.name || '',
                date: due,
                daysOverdue,
                assignedToMe,
                target: { kind: 'task', nodeRef: node.nodeRef, name: node.attributes[task.nameProp] || node.name || '' },
                href: `/tasks/${encodeURIComponent(node.id)}`,
            });
        }

        for (const document of documents.items) {
            const severity = NOTIFICATION_CONFIG.documentSeverity[document.status];
            if (!severity) {
                continue;
            }
            notifications.push({
                id: `document:${document.id}`,
                type: `document.${document.status}`,
                severity,
                title: document.type ? document.type.label : document.name,
                date: document.validTo,
                daysToExpiry: document.daysToExpiry,
                isMandatory: document.isMandatory,
                target: { kind: 'document', nodeRef: document.nodeRef, name: document.name },
                entity: document.entity,
                href: '/documents',
            });
        }

        const rank = { danger: 0, warning: 1, info: 2 };
        notifications.sort((a, b) => {
            const bySeverity = (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
            if (bySeverity !== 0) {
                return bySeverity;
            }
            return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
        });

        const counts = notifications.reduce((accumulator, notification) => {
            accumulator[notification.severity] = (accumulator[notification.severity] || 0) + 1;
            return accumulator;
        }, { danger: 0, warning: 0, info: 0 });

        return NextResponse.json({
            items: notifications.slice(0, limit),
            counts: { ...counts, total: notifications.length },
            generatedAt: now.toISOString(),
            queries: {
                overdueTasks: taskQuery,
                documents: documents.query,
            },
        }, { status: 200, headers: NO_STORE });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/notifications', method: 'GET' });
    }
}
