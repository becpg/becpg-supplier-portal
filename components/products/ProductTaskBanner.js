'use client';

/**
 * **"Une tâche est en cours sur cette fiche"** — the way back from a product to
 * the work being asked on it.
 *
 * The two screens were one-way. `/tasks` names its product and links to it;
 * `/products/{id}` knew nothing of the task, so a supplier who arrived on a
 * sheet — from the catalogue, from a search, from a bookmark — had to go back to
 * *Mes tâches* and find the row again to actually fill anything in. The sheet is
 * read-only by construction (spec §4.2): the task **is** the write path, and a
 * read-only screen that hides its own write path is a dead end.
 *
 * It renders nothing at all when there is no open task, which is the common case
 * for a validated product: an empty "no task" card on every sheet would be noise
 * on the one screen that has to stay readable.
 *
 * `GET /api/v1/tasks?entity=…` is the source, filtered server-side on the
 * entity — the same endpoint `/tasks` uses, so a task appears here exactly when
 * it appears there, and the route each row opens is the task's own `href`
 * (never a rewritten beCPG deliverable URL — invariant I1).
 */

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Button';
import { DueBadge } from '@/components/dashboard/TaskList';
import { TASK_TYPE_META, taskTypeLabel } from '@/components/dashboard/ActionsCard';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        one: 'Une tâche est en cours sur cette fiche',
        many: 'Plusieurs tâches sont en cours sur cette fiche',
        open: 'Ouvrir la tâche',
        all: 'Voir les tâches de ce produit',
        untitled: 'Tâche sans nom',
    },
    en: {
        one: 'A task is open on this sheet',
        many: 'Several tasks are open on this sheet',
        open: 'Open the task',
        all: 'See this product’s tasks',
        untitled: 'Untitled task',
    },
};

/** How many tasks are listed before the banner sends the user to `/tasks`. */
const MAX_SHOWN = 3;

/**
 * @param {Object} props
 * @param {string} props.entityId uuid of the product, as it appears in the route
 * @param {string} [props.entityNodeRef] full nodeRef — what `/tasks?entity=` matches on
 * @param {string} [props.className]
 * @returns {JSX.Element|null}
 */
export function ProductTaskBanner({ entityId, entityNodeRef = null, className = '' }) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;

    const { data } = useApi(entityId ? 'tasks' : null, {
        params: { entity: entityId, state: 'in_progress', pageSize: 10 },
    });

    const tasks = (data && Array.isArray(data.items) ? data.items : []).filter((task) => task.isOpen);

    // No task, still loading, or the call failed: nothing is drawn. A failure
    // here must not put an error on a sheet that reads perfectly well without
    // this band — the task list itself remains reachable from the navigation.
    if (tasks.length === 0) {
        return null;
    }

    const shown = tasks.slice(0, MAX_SHOWN);

    return (
        <Card variant="accent" padding="sm" className={className}>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Icon name="assignment_turned_in" size={18} className="text-[var(--becpg-orange)]" />
                {tasks.length > 1 ? labels.many : labels.one}
            </p>

            <ul className="flex flex-col gap-1.5">
                {shown.map((task) => (
                    <li key={task.uuid || task.id}>
                        <Link
                            href={task.href || `/tasks/${task.uuid}`}
                            className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-[var(--becpg-grey)]"
                        >
                            <span className="pill pill-info pill-sm pill-no-dot shrink-0">
                                <Icon
                                    name={(TASK_TYPE_META[task.type] || TASK_TYPE_META.review).icon}
                                    size={13}
                                />
                                {taskTypeLabel(task.type, lang)}
                            </span>
                            <span className="min-w-0 flex-1 truncate font-medium">
                                {task.name || labels.untitled}
                            </span>
                            <DueBadge task={task} />
                            <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--becpg-blue-light)]">
                                {labels.open}
                                <Icon name="arrow_forward" size={14} />
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>

            {/* `/tasks?entity=` pre-selects the product filter, which compares
                full nodeRefs — a uuid would silently match nothing, so the link
                only exists once the sheet has loaded and can supply one. */}
            {tasks.length > shown.length && entityNodeRef ? (
                <Link
                    href={`/tasks?entity=${encodeURIComponent(entityNodeRef)}`}
                    className="mt-1 inline-flex items-center gap-1 px-2 text-xs text-[var(--becpg-blue-light)] hover:text-[var(--becpg-orange)]"
                >
                    {labels.all}
                    <Icon name="arrow_forward" size={13} />
                </Link>
            ) : null}
        </Card>
    );
}
