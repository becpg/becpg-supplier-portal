/**
 * `/` — the supplier dashboard, "Mon tableau de bord" (spec §4.3).
 *
 * The same grammar as the monitoring cockpit, so the two spaces read alike: a
 * row of KPI tiles, two charts, then the lists to act on.
 *
 * ```
 *  ┌ approval ┬ completeness ┬ open tasks ┬ documents to deal with ┐
 *  └ [To do] lists to act on  |  [Follow-up] due dates, catalogues ┘
 * ```
 *
 * The notifications are not repeated here: the bell of the top bar holds them.
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
import { AppShell, PageHeader } from '@/components/shell/AppShell';
import { StatusPill } from '@/components/ui/StatusPill';
import { DashboardKpis } from '@/components/dashboard/DashboardKpis';
import { CatalogChart, ScheduleChart } from '@/components/dashboard/DashboardCharts';
import { DashboardTabs } from '@/components/dashboard/DashboardTabs';
import { TaskList } from '@/components/dashboard/TaskList';
import { ProductList } from '@/components/dashboard/ProductList';
import { DocumentList } from '@/components/dashboard/DocumentList';
import { DiscussionList } from '@/components/dashboard/DiscussionList';
import { NonConformityCard } from '@/components/dashboard/NonConformityCard';
import { nodeRefToPath } from '@/lib/becpg';
import { buildDashboard, createBecpgClient, getMyGroups, resolveSpace, scopeTasks } from '@/lib/adapters/session';
import { listMyTasks, mapWithConcurrency, nodeRefFromId } from '@/lib/adapters/tasks';
import {
    buildEntityIndex,
    buildEntityQuery,
    listMyEntities,
    NO_SUPPLIER,
    sessionSupplierScope,
} from '@/lib/adapters/entities';
import { listDocuments } from '@/lib/adapters/documents';
import { buildSchedule } from '@/lib/schedule';
import { getLiveSession } from '@/lib/session';
import { SCOPE_COOKIE, parseScopeCookie } from '@/lib/scope';
import { t as translate } from '@/config/messages';
import { cookies } from 'next/headers';
import { defineLabels, pickLabels } from '@/lib/i18n';
import { resolveLang } from '@/lib/lang';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * How many rows each centre-zone card shows before "tout voir".
 *
 * Four everywhere except the tasks, which are the point of the screen. It used to
 * be five and six, and the difference is visible: the zone was ~1900px tall at
 * 1440px, i.e. two full screens of *preview*, and the cards were so unequal that
 * no column layout could balance them. Four rows is a preview; the rest is one
 * click away behind "tout voir".
 */
const PREVIEW = { tasks: 6, products: 4, documents: 4, discussions: 3 };

/**
 * The page heading. It belongs to this one screen, hence
 * here rather than in the chrome vocabulary of `config/messages.js`.
 */
const LOCAL = defineLabels('app/(home)/page#LOCAL', {
    fr: {
        description: 'Où en est votre dossier chez votre client, et ce qu’il attend de vous.',
        generatedAt: 'Données au {time}',
    },
    en: {
        description: 'Where your file stands with your customer, and what they expect from you.',
        generatedAt: 'Data as of {time}',
    },
});

/** Same window the `pjt:taskList` scan uses; 50 open tasks is already a lot. */
const TASK_SCAN = 50;

/** Entity window; mirrors what `buildDashboard` memoises, so the memo hits. */
const ENTITY_SCAN = 200;

/**
 * An ancestor no node has: the way to write "this account has no park" in an
 * AFTS query, without letting the clause drop — an absent clause would sweep
 * everything the account is allowed to read.
 */
const NO_PARK_ANCESTOR = 'workspace://SpacesStore/00000000-0000-0000-0000-000000000000';

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
 * @param {string|null} [supplierNodeRef] bounds the product query to the chosen supplier
 * @returns {Promise<Array<Object>>}
 */
/**
 * The scope of the discussion thread scan, aligned on the one used by
 * "Mes produits". An account without a supplier has no park: `NO_SUPPLIER`
 * becomes a list of ancestors nothing can satisfy, rather than a missing
 * clause, which would make the scan universal.
 *
 * @param {Object} client
 * @param {string|null} supplierNodeRef
 * @returns {Promise<{ancestors: string[], accessGroups?: string[]}>} `buildEntityQuery` options
 */
async function discussionScope(client, supplierNodeRef) {
    if (supplierNodeRef) {
        return { ancestors: [supplierNodeRef] };
    }
    const scope = await sessionSupplierScope(client);
    return scope === NO_SUPPLIER ? { ancestors: [NO_PARK_ANCESTOR] } : scope;
}

async function loadDiscussions(client, tasks, supplierNodeRef = null) {
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
        async () => client.getJson('becpg/remote/entity/list', {
            query: {
                // Same scope as the rest of the screen: without it, the card
                // listed the threads of every entity the account can read,
                // including those of another supplier (#35846).
                query: buildEntityQuery(await discussionScope(client, supplierNodeRef)),
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
    const lang = await resolveLang();
    const t = (key, vars) => translate(lang, key, vars);

    /*
     * The supplier picked in the top bar — see `lib/scope.js`.
     *
     * This is a server component: the choice lives in the browser, and without
     * this cookie it composed its counters over the fifteen entities of the
     * account while the bar announced a single one. The cookie is a hint of
     * where to look, never an authorisation: beCPG stays the sole judge of
     * access.
     *
     * `all` — « Tous les fournisseurs » — bounds nothing, which is exactly what
     * the label promises.
     */
    const scope = parseScopeCookie(cookieStore.get(SCOPE_COOKIE)?.value, session.sub || null);
    const supplierNodeRef = scope.all ? null : scope.ref;

    const client = createBecpgClient(session);

    /*
     * THE SPACE DECIDES WHICH HOME PAGE IS SERVED.
     *
     * This page is the supplier's dashboard: my tasks, my products, my file, my
     * approval status. An internal user used to land here after login, with a
     * « Suspendu » pill in the header — an approval status shown to someone who
     * is not a supplier.
     *
     * The space is computed here, it is not read from the session. The redirect
     * already existed and tested `session.space`: but the session encrypted in
     * the cookie does not carry that key — only the `/api/v1/session` payload
     * computes it, and that payload is built elsewhere. `undefined` never being
     * equal to `'monitor'`, the redirect never fired and the default reported as
     * fixed was not. Measured on 06/08/2026: account `admin`,
     * `space: "monitor"` on `/api/v1/session`, `GET /` answers 200 with the
     * supplier space.
     *
     * `getMyGroups` is memoised on the client, and `buildDashboard` calls it
     * right after: the redirect therefore costs no extra call.
     */
    const { groups, capabilities } = await safe(() => getMyGroups(client), { groups: [], capabilities: {} });
    if (resolveSpace(groups, capabilities) === 'monitor') {
        redirect('/monitor');
    }

    // The documents read the session, not this client's memo: nothing they need
    // waits on the cards, so they start now and run beside them.
    const documentsRead = safe(() => listDocuments({
        session,
        page: 1,
        pageSize: PREVIEW.documents * 4,
        supplier: supplierNodeRef ? [supplierNodeRef] : undefined,
    }), null);

    // The four header cards. Everything below reuses this client's memo cache,
    // so the tasks and the entities are fetched exactly once for the page.
    const dashboard = await safe(() => buildDashboard(client, { supplierNodeRef }));

    const [taskResult, entityResult, documentResult] = await Promise.all([
        safe(
            /*
             * `enrichLimit` — the dashboard shows six tasks and reads one counter.
             * Enriching the whole scan cost one `becpg/project/task` per task (31
             * on dev) to display six. The counters stay exact; only `byType`,
             * which the dashboard does not use, is omitted.
             */
            () => client.memo(`tasks:${supplierNodeRef || 'all'}`, () => listMyTasks(client, {
                pageSize: TASK_SCAN,
                // Under a scope, the `enrichLimit` truncation would hide the
                // tasks of the chosen supplier — see the detailed comment in
                // `buildDashboard`. This memo is filled by it anyway, since it
                // runs first; the two must say the same thing.
                enrichLimit: supplierNodeRef ? null : PREVIEW.tasks * 2,
            })),
            { items: [], counters: { total: 0, late: 0, open: 0, byType: {} } },
        ),
        safe(
            /*
             * `preview: true` — the dashboard names and orders, it does not detail.
             *
             * It shows four products and a park counter, then uses the rest of the
             * scan only to recognise the entity a preview task points at. The full
             * projection costs 942-3614 ms for 200 rows against 166-191 ms for the
             * cheap one (measured on the reference instance): eleven attributes fetched for
             * every product in the park so that four rows can show a name, a code
             * and a date.
             */
            () => client.memo(`entities:${supplierNodeRef || 'all'}`, () => listMyEntities(client, {
                pageSize: ENTITY_SCAN,
                preview: true,
                supplierNodeRef: supplierNodeRef || undefined,
            })),
            { items: [], pagination: { totalItems: 0, totalAtLeast: 0, totalExact: true } },
        ),
        documentsRead,
    ]);

    // --- Mes tâches ---------------------------------------------------------
    const entityByRef = new Map(entityResult.items.map((entity) => [entity.nodeRef, entity]));
    /*
     * Bounded to the chosen supplier, by the SAME test as `buildDashboard` —
     * hence the shared function: two filters written separately end up counting
     * differently, and the screen would then show two numbers for one question.
     */
    const inScope = scopeTasks(taskResult.items, {
        supplierNodeRef,
        entities: entityResult.items,
    });
    const openTasks = inScope.filter((task) => task.isOpen !== false).sort(byUrgency);
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
    // The discussions do not need the index: both run at once.
    const [extraIndex, threads] = await Promise.all([
        unknownRefs.length > 0 ? safe(() => buildEntityIndex(client, unknownRefs), {}) : {},
        safe(() => loadDiscussions(client, inScope, supplierNodeRef), []),
    ]);

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
        tasks: openTasks.length,
        documents: documentCounters
            ? (documentCounters.expired || 0) + (documentCounters.missing || 0)
            : 0,
        messages: threads.length,
    };

    const local = pickLabels(LOCAL, lang);
    // The expiry dates feed the schedule here; the browser only needs the counters.
    const { expiries = [], ...documentFigures } = documentCounters || {};
    const schedule = buildSchedule({ tasks: openTasks, expiries, now: new Date() });

    return (
        <AppShell
            ownHeading
            fullWidth
            title={t('nav.dashboard')}
            badges={badges}
            headerStatus={
                approval ? <StatusPill status={approval.status} size="sm" /> : null
            }
        >
            <PageHeader
                title={t('nav.dashboard')}
                description={local.description}
                actions={dashboard ? (
                    <span className="text-[11px] text-[var(--becpg-dark-grey)]">
                        {local.generatedAt.replace('{time}', formatDateTime(dashboard.generatedAt, lang))}
                    </span>
                ) : null}
            />

            <DashboardKpis
                approval={approval}
                supplier={supplier}
                validUntil={nextExpiry}
                completion={dashboard ? dashboard.completion : null}
                actions={dashboard ? dashboard.actions : null}
                documents={documentCounters ? documentFigures : null}
            />

            <div className="mt-5 sm:mt-6">
                <DashboardTabs
                    todoCount={openTasks.length + (dashboard?.nonConformities?.length || 0)}
                    todo={
                        /*
                         * Three stacks of comparable height: the conversations and
                         * the tasks, the products, the documents. The DOM order is
                         * the reading order, so the tab order follows the columns.
                         */
                        <div className="grid grid-cols-1 items-start gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3">
                            <div className="flex flex-col gap-3 sm:gap-4">
                                <NonConformityCard nonConformities={dashboard ? dashboard.nonConformities : null} index={0} />
                                <DiscussionList threads={threads} index={0} />
                                <TaskList tasks={tasks} total={openTasks.length} index={1} />
                            </div>
                            {/* `totalItems` is null when beCPG could not count the products
                                (see `formatTotal`); the floor travels with it so the card can
                                say "100+" instead of silently showing the preview size. */}
                            <ProductList
                                products={products}
                                total={entityResult.pagination.totalItems}
                                totalAtLeast={entityResult.pagination.totalAtLeast}
                                index={2}
                            />
                            <DocumentList documents={documents} total={documentTotal} index={3} />
                        </div>
                    }
                    followUp={
                        <div className="grid grid-cols-1 items-start gap-3 sm:gap-4 xl:grid-cols-3">
                            <ScheduleChart schedule={schedule} className="xl:col-span-2" />
                            <CatalogChart catalogs={dashboard ? dashboard.completion.catalogs : []} />
                        </div>
                    }
                />
            </div>
        </AppShell>
    );
}
