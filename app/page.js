/**
 * `/` — **Mon tableau de bord** (spec §4.3).
 *
 * The V1 dashboard (`external-dashboard` preset: Mes tâches, Mes discussions,
 * Mes produits) is kept structurally and given the compliance dimension it
 * never had:
 *
 * ```
 *  ┌───────────── état de mon dossier ─────────────────────────────┐
 *  │ agrément │ complétude │ actions requises │ documents          │  animated
 *  └───────────────────────────────────────────────────────────────┘
 *  ┌───────────────────────────┬───────────────────────────────────┐
 *  │ Mes tâches                │ Mes documents                     │
 *  │ Mes produits              │ Mes notifications                 │
 *  │                           │ Mes discussions                   │
 *  └───────────────────────────┴───────────────────────────────────┘
 * ```
 *
 * **This is a server component**: it talks to the adapters directly, not to its
 * own HTTP API. Going through `fetch('/api/v1/dashboard')` from here would mean
 * an extra network hop, a second session decryption and a cookie forwarding
 * dance for data the process already has. The route handlers exist for the
 * browser (and for the ERP connector), not for the server render.
 *
 * Every upstream call goes through `client.memo()`, so the dashboard, the task
 * list and the product list share **one** round of beCPG queries. Each block
 * degrades on its own: a beCPG hiccup on the documents query empties the
 * documents card, it does not blank the page.
 */

import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { StatusPill } from '@/components/ui/StatusPill';
import { ApprovalCard } from '@/components/dashboard/ApprovalCard';
import { CompletionCard } from '@/components/dashboard/CompletionCard';
import { ActionsCard } from '@/components/dashboard/ActionsCard';
import { DocumentsCard } from '@/components/dashboard/DocumentsCard';
import { TaskList } from '@/components/dashboard/TaskList';
import { ProductList } from '@/components/dashboard/ProductList';
import { DocumentList } from '@/components/dashboard/DocumentList';
import { DiscussionList } from '@/components/dashboard/DiscussionList';
import { NotificationList } from '@/components/dashboard/NotificationList';
import { nodeRefToPath } from '@/lib/becpg';
import { buildDashboard, createBecpgClient } from '@/lib/adapters/session';
import { listMyTasks, mapWithConcurrency, nodeRefFromId } from '@/lib/adapters/tasks';
import { buildEntityIndex, buildEntityQuery, listMyEntities } from '@/lib/adapters/entities';
import { listDocuments } from '@/lib/adapters/documents';
import { getLiveSession } from '@/lib/session';
import { LANG_COOKIE, normalizeLang, t as translate } from '@/config/messages';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/** How many rows each centre-zone card shows before "tout voir". */
const PREVIEW = { tasks: 6, products: 5, documents: 5, notifications: 6, discussions: 4 };

/** Same window the `pjt:taskList` scan uses; 50 open tasks is already a lot. */
const TASK_SCAN = 50;

/** Entity window; mirrors what `buildDashboard` memoises, so the memo hits. */
const ENTITY_SCAN = 200;

/**
 * Runs a block and swallows its failure. A dashboard is an aggregate of
 * independent readings: one of them failing must degrade that block only.
 *
 * @template T
 * @param {() => Promise<T>} factory
 * @param {T} [fallback]
 * @returns {Promise<T>}
 */
async function safe(factory, fallback = null) {
    try {
        return await factory();
    }
    catch (error) {
        console.warn('[dashboard] block failed:', (error && error.message) || error);
        return fallback;
    }
}

/**
 * Urgency order (spec §4.3 "tri par urgence"): late first, then the closest due
 * date, then the highest priority. Tasks without a due date come last — they are
 * not urgent, they are simply undated.
 *
 * @param {Object} a
 * @param {Object} b
 * @returns {number}
 */
function byUrgency(a, b) {
    if (Boolean(a.isLate) !== Boolean(b.isLate)) {
        return a.isLate ? -1 : 1;
    }
    const left = a.dueDate ? Date.parse(a.dueDate) : Number.MAX_SAFE_INTEGER;
    const right = b.dueDate ? Date.parse(b.dueDate) : Number.MAX_SAFE_INTEGER;
    if (left !== right) {
        return left - right;
    }
    return (a.priority || 9) - (b.priority || 9);
}

/**
 * Strips the HTML the repository stores for a comment and keeps a one-line
 * excerpt. The content is already sanitised server-side by Alfresco
 * (`stringUtils.stripUnsafeHTML`); this is purely about rendering it as text.
 *
 * @param {string} html
 * @param {number} [max=140]
 * @returns {string}
 */
function excerpt(html, max = 140) {
    const text = String(html || '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, '\'')
        .replace(/\s+/g, ' ')
        .trim();
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * **Mes discussions.**
 *
 * There is no "list my threads" webscript in beCPG, and inventing one would
 * mean touching the repository — which this phase forbids (rule 7). So the
 * threads are composed from what already carries `fm:commentCount`:
 *
 *   1. the tasks already fetched for the dashboard — zero extra query;
 *   2. my entities, through **one** extra db-afts query asking only for
 *      `fm:commentCount`.
 *
 * The last message of at most {@link PREVIEW.discussions} threads is then read
 * from `api/node/…/comments` — the same flat `fm:forum` thread Share's
 * `Alfresco.CommentsList` writes to, so both front ends show one conversation.
 *
 * @param {Object} client
 * @param {Array<Object>} tasks
 * @returns {Promise<Array<Object>>}
 */
async function loadDiscussions(client, tasks) {
    const candidates = [];

    for (const task of tasks) {
        if ((task.commentCount || 0) > 0 && task.id) {
            candidates.push({
                nodeRef: task.id,
                title: task.name || '',
                subtitle: task.entity
                    ? [task.entity.code, task.entity.name].filter(Boolean).join(' · ') || null
                    : null,
                href: task.href || `/tasks/${task.uuid}`,
                count: task.commentCount,
            });
        }
    }

    const data = await safe(
        () => client.getJson('becpg/remote/entity/list', {
            query: {
                query: buildEntityQuery({}),
                fields: 'cm:name,bcpg:code,fm:commentCount',
                lists: 'none',
                maxResults: ENTITY_SCAN,
            },
        }),
        null,
    );

    for (const row of (data && Array.isArray(data.entities) ? data.entities : [])) {
        const raw = row && row.entity;
        if (!raw || !raw.id) {
            continue;
        }
        const attributes = raw.attributes || {};
        const count = Number(attributes['fm:commentCount'] || raw['fm:commentCount']) || 0;
        if (count <= 0) {
            continue;
        }
        const nodeRef = raw.nodeRef || nodeRefFromId(raw.id);
        if (!nodeRef) {
            continue;
        }
        candidates.push({
            nodeRef,
            title: raw['cm:name'] || attributes['cm:name'] || '',
            subtitle: raw['bcpg:code'] || attributes['bcpg:code'] || null,
            href: `/messages?nodeRef=${encodeURIComponent(nodeRef)}`,
            count,
        });
    }

    const seen = new Set();
    const picked = candidates
        .filter((candidate) => {
            if (seen.has(candidate.nodeRef)) {
                return false;
            }
            seen.add(candidate.nodeRef);
            return true;
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, PREVIEW.discussions);

    if (picked.length === 0) {
        return [];
    }

    const threads = await mapWithConcurrency(picked, 4, async (candidate) => {
        const payload = await safe(
            () => client.getJson(`api/node/${nodeRefToPath(candidate.nodeRef)}/comments`, {
                query: { reverse: 'true', startIndex: 0, pageSize: 1 },
            }),
            null,
        );
        const item = payload && Array.isArray(payload.items) ? payload.items[0] : null;
        if (!item) {
            return { ...candidate, field: null, last: null };
        }
        const author = item.author || {};
        const title = String(item.title || '');
        return {
            ...candidate,
            // The portal anchors a comment on a field by writing `field:<qname>`
            // in the post title (see /api/v1/messages).
            field: title.startsWith('field:') ? title.slice('field:'.length).trim() : null,
            last: {
                author: [author.firstName, author.lastName].filter(Boolean).join(' ')
                    || author.username
                    || '',
                excerpt: excerpt(item.content),
                date: item.createdOnISO || item.createdOn || null,
            },
        };
    });

    return threads.sort(
        (a, b) => Date.parse((b.last && b.last.date) || 0) - Date.parse((a.last && a.last.date) || 0),
    );
}

/**
 * @returns {Promise<JSX.Element>}
 */
export default async function DashboardPage() {
    const session = await getLiveSession();
    if (!session) {
        redirect('/login?next=%2F');
    }

    // `lib/messages` cannot be imported here: it carries the client hook
    // (`useSyncExternalStore`). A server component reads the cookie and calls
    // the plain resolver from `config/messages` instead.
    const cookieStore = await cookies();
    const lang = normalizeLang(cookieStore.get(LANG_COOKIE)?.value);
    const t = (key, vars) => translate(lang, key, vars);

    const client = createBecpgClient(session);

    // The four header cards. Everything below reuses this client's memo cache,
    // so the tasks and the entities are fetched exactly once for the page.
    const dashboard = await safe(() => buildDashboard(client));

    const [taskResult, entityResult, documentResult] = await Promise.all([
        safe(
            () => client.memo('tasks', () => listMyTasks(client, { pageSize: TASK_SCAN })),
            { items: [], counters: { total: 0, late: 0, open: 0, byType: {} } },
        ),
        safe(
            () => client.memo('entities', () => listMyEntities(client, { pageSize: ENTITY_SCAN })),
            { items: [], pagination: { totalItems: 0 } },
        ),
        safe(() => listDocuments({ session, page: 1, pageSize: PREVIEW.documents * 4 }), null),
    ]);

    // --- Mes tâches ---------------------------------------------------------
    const entityByRef = new Map(entityResult.items.map((entity) => [entity.nodeRef, entity]));
    const openTasks = taskResult.items.filter((task) => task.isOpen !== false).sort(byUrgency);
    const previewTasks = openTasks.slice(0, PREVIEW.tasks);

    // Products the tasks point at that are not in my own product list (delegated
    // entry, a customer entity…): one bounded query, usually zero.
    const unknownRefs = [
        ...new Set(
            previewTasks
                .map((task) => task.entityNodeRef)
                .filter((ref) => ref && !entityByRef.has(ref)),
        ),
    ];
    const extraIndex = unknownRefs.length > 0
        ? await safe(() => buildEntityIndex(client, unknownRefs), {})
        : {};

    const tasks = previewTasks.map((task) => {
        const ref = task.entityNodeRef;
        const known = ref ? (entityByRef.get(ref) || extraIndex[ref]) : null;
        if (!known) {
            return task;
        }
        return {
            ...task,
            entity: {
                ...task.entity,
                name: known.name || task.entity.name,
                code: known.code || task.entity.code,
                type: known.type || task.entity.type,
            },
        };
    });

    // --- Mes produits -------------------------------------------------------
    const products = [...entityResult.items]
        .sort((a, b) => Date.parse(b.modified || 0) - Date.parse(a.modified || 0))
        .slice(0, PREVIEW.products);

    // --- Mes documents ------------------------------------------------------
    const documents = documentResult ? documentResult.items.slice(0, PREVIEW.documents) : [];
    const documentTotal = documentResult ? documentResult.pagination.totalItems : 0;

    // --- Mes discussions ----------------------------------------------------
    const threads = await safe(() => loadDiscussions(client, taskResult.items), []);

    const approval = dashboard ? dashboard.approval : null;
    const supplier = dashboard ? dashboard.supplier : null;
    const documentCounters = dashboard ? dashboard.documents : null;

    // The nearest mandatory expiry is the only honest "valid until" the portal
    // can show: the approval status is derived, never stored (spec §5.4.3).
    const nextExpiry = documentResult
        ? documentResult.items
            .filter((doc) => doc.isMandatory && doc.validTo && doc.status !== 'expired')
            .map((doc) => doc.validTo)
            .sort()[0] || null
        : null;

    const badges = {
        tasks: taskResult.counters.open || 0,
        documents: documentCounters
            ? (documentCounters.expired || 0) + (documentCounters.missing || 0)
            : 0,
        messages: threads.length,
    };

    return (
        <AppShell
            title={t('nav.dashboard')}
            badges={badges}
            headerStatus={
                approval ? <StatusPill status={approval.status} size="sm" /> : null
            }
        >
            {/* ---------------------------------------- état de mon dossier */}
            <section aria-label={t('nav.dashboard')}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
                    <ApprovalCard
                        approval={approval}
                        supplier={supplier}
                        validUntil={nextExpiry}
                        index={0}
                    />
                    <CompletionCard completion={dashboard ? dashboard.completion : null} index={1} />
                    <ActionsCard actions={dashboard ? dashboard.actions : null} index={2} />
                    <DocumentsCard documents={documentCounters} index={3} />
                </div>
            </section>

            {/* --------------------------------------------- zone centrale */}
            <section className="mt-6" aria-label={t('nav.tasks')}>
                <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
                        <TaskList tasks={tasks} total={taskResult.counters.open} index={0} />
                        <ProductList
                            products={products}
                            total={entityResult.pagination.totalItems}
                            index={1}
                        />
                    </div>
                    <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
                        <DocumentList documents={documents} total={documentTotal} index={2} />
                        <NotificationList limit={PREVIEW.notifications} index={3} />
                        <DiscussionList threads={threads} index={4} />
                    </div>
                </div>
            </section>
        </AppShell>
    );
}
