'use client';

/**
 * "Mes tâches" — the modernised `my-tasks` dashlet (spec §4.3).
 *
 * Name, product/customer, type badge, priority, due date, progress, **sorted by
 * urgency**. A click goes **straight** to `/tasks/{uuid}`: the task already
 * carries its resolved type (`wizard` / `signature` / `document` / `review`), so
 * there is no intermediate "what kind of task is this?" screen — that was one of
 * the V1 weaknesses this portal removes.
 *
 * The deliverable URL beCPG resolved is never rewritten here (invariant I1);
 * only `task.href`, computed by the adapter, is used for navigation.
 */

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMessages } from '@/lib/messages';
import { TASK_TYPE_META, taskTypeLabel } from '@/components/dashboard/ActionsCard';
import { formatDate, daysUntil } from '@/lib/format';

const LOCAL = {
    fr: {
        title: 'Mes tâches',
        subtitle: 'Triées par urgence',
        empty: 'Aucune tâche en cours',
        emptyHint: 'Tout est à jour. Les nouvelles demandes du client apparaîtront ici.',
        all: 'Tout voir',
        overdue: 'En retard de {days} j',
        overdueToday: 'Échéance aujourd’hui',
        dueIn: 'Dans {days} j',
        noDue: 'Sans échéance',
        priorityHigh: 'Haute',
        priorityMedium: 'Moyenne',
        priorityLow: 'Basse',
        progress: 'Avancement',
        untitled: 'Tâche sans nom',
    },
    en: {
        title: 'My tasks',
        subtitle: 'Sorted by urgency',
        empty: 'No task in progress',
        emptyHint: 'Everything is up to date. New customer requests will show up here.',
        all: 'See all',
        overdue: '{days} d late',
        overdueToday: 'Due today',
        dueIn: 'In {days} d',
        noDue: 'No due date',
        priorityHigh: 'High',
        priorityMedium: 'Medium',
        priorityLow: 'Low',
        progress: 'Progress',
        untitled: 'Untitled task',
    },
};

const PRIORITY_TONE = { high: 'pill-danger', medium: 'pill-warn', low: 'pill-neutral' };

/**
 * The due-date pill: the single most useful piece of information on a task row.
 * Self-contained (it resolves its own wording) so the `/tasks` grid can reuse it
 * without importing this module's private dictionary.
 *
 * @param {Object} props
 * @param {Object} props.task a task as returned by `/api/v1/tasks`
 */
export function DueBadge({ task }) {
    const { lang } = useMessages();
    const local = LOCAL[lang] || LOCAL.fr;
    const days = daysUntil(task.dueDate);
    if (days === null) {
        return (
            <span className="pill pill-neutral pill-sm pill-no-dot">
                <Icon name="event_busy" size={13} />
                {local.noDue}
            </span>
        );
    }
    if (days < 0 || task.isLate) {
        return (
            <span className="pill pill-danger pill-sm pill-no-dot">
                <Icon name="alarm" size={13} />
                {days < 0 ? local.overdue.replace('{days}', Math.abs(days)) : local.overdueToday}
            </span>
        );
    }
    if (days === 0) {
        return (
            <span className="pill pill-warn pill-sm pill-no-dot">
                <Icon name="today" size={13} />
                {local.overdueToday}
            </span>
        );
    }
    return (
        <span className={`pill pill-sm pill-no-dot ${days <= 7 ? 'pill-warn' : 'pill-neutral'}`}>
            <Icon name="event" size={13} />
            {days <= 7 ? local.dueIn.replace('{days}', days) : formatDate(task.dueDate, lang)}
        </span>
    );
}

/**
 * Priority badge. `priorityLevel` is `high` | `medium` | `low`, derived by the
 * adapter from the workflow's numeric `bpm:priority`; a task without a priority
 * renders nothing rather than a misleading "normal".
 *
 * @param {Object} props
 * @param {string|null} props.level
 */
export function PriorityPill({ level }) {
    const { lang } = useMessages();
    const local = LOCAL[lang] || LOCAL.fr;
    if (!level || !PRIORITY_TONE[level]) {
        return null;
    }
    const key = `priority${level.charAt(0).toUpperCase()}${level.slice(1)}`;
    return (
        <span className={`pill pill-sm pill-no-dot ${PRIORITY_TONE[level]}`}>
            <Icon name="flag" size={13} />
            {local[key]}
        </span>
    );
}

/**
 * @param {Object} props
 * @param {Array<Object>} props.tasks tasks as returned by `/api/v1/tasks`
 * @param {number} [props.total] total count, when the list is truncated
 * @param {number} [props.index] stagger position
 */
export function TaskList({ tasks = [], total, index = 0, className = '' }) {
    const { lang } = useMessages();
    const reduceMotion = useReducedMotion();
    const local = LOCAL[lang] || LOCAL.fr;
    const count = typeof total === 'number' ? total : tasks.length;

    return (
        <Card
            title={local.title}
            subtitle={tasks.length > 0 ? local.subtitle : undefined}
            icon="assignment_turned_in"
            index={index}
            padding="md"
            bodyClassName="pt-1"
            className={className}
            actions={
                count > tasks.length || tasks.length > 0 ? (
                    <Link
                        href="/tasks"
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--becpg-blue-light)] hover:bg-[var(--becpg-grey)]"
                    >
                        {local.all}
                        {count > tasks.length ? (
                            <span className="tabular-nums">({count})</span>
                        ) : null}
                        <Icon name="arrow_forward" size={14} />
                    </Link>
                ) : null
            }
        >
            {tasks.length === 0 ? (
                <EmptyState
                    variant="success"
                    compact
                    title={local.empty}
                    message={local.emptyHint}
                />
            ) : (
                <ul className="-mx-2 flex flex-col">
                    {tasks.map((task, position) => {
                        const meta = TASK_TYPE_META[task.type] || TASK_TYPE_META.review;
                        const percent = Math.max(0, Math.min(100, Number(task.completionPercent) || 0));
                        return (
                            <motion.li
                                key={task.id || task.uuid || position}
                                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: reduceMotion ? 0 : 0.22,
                                    delay: reduceMotion ? 0 : Math.min(position, 8) * 0.04,
                                }}
                            >
                                <Link
                                    href={task.href || `/tasks/${task.uuid}`}
                                    className="flex touch-target items-start gap-2.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--becpg-grey)]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                                >
                                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--becpg-blue-lighter)] text-[var(--becpg-blue)]">
                                        <Icon name={meta.icon} size={18} />
                                    </span>

                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-start justify-between gap-2">
                                            <span className="min-w-0 text-sm font-medium leading-snug">
                                                {task.name || local.untitled}
                                            </span>
                                            {/* The type badge moves under the title on a phone,
                                                where the title needs the full width. */}
                                            <span className="hidden shrink-0 sm:block">
                                                <span className="pill pill-info pill-sm pill-no-dot">
                                                    {taskTypeLabel(task.type, lang)}
                                                </span>
                                            </span>
                                        </span>

                                        {task.entity && (task.entity.name || task.entity.code) ? (
                                            <span className="mt-0.5 block truncate text-xs text-[var(--becpg-dark-grey)]">
                                                {[task.entity.code, task.entity.name]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </span>
                                        ) : null}

                                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                            <span className="sm:hidden">
                                                <span className="pill pill-info pill-sm pill-no-dot">
                                                    {taskTypeLabel(task.type, lang)}
                                                </span>
                                            </span>
                                            <PriorityPill level={task.priorityLevel} />
                                            <DueBadge task={task} />
                                            {task.commentCount > 0 ? (
                                                <span className="inline-flex items-center gap-0.5 text-xs text-[var(--becpg-dark-grey)]">
                                                    <Icon name="forum" size={13} />
                                                    {task.commentCount}
                                                </span>
                                            ) : null}
                                        </span>

                                        {percent > 0 ? (
                                            <span className="mt-2 flex items-center gap-2">
                                                <span className="h-1 w-full min-w-0 overflow-hidden rounded-full bg-[var(--becpg-grey)]">
                                                    <span
                                                        className="block h-full rounded-full bg-[var(--becpg-blue-light)]"
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </span>
                                                <span className="shrink-0 text-xs tabular-nums text-[var(--becpg-dark-grey)]">
                                                    {percent}%
                                                </span>
                                            </span>
                                        ) : null}
                                    </span>

                                    <Icon
                                        name="chevron_right"
                                        size={18}
                                        className="mt-1 shrink-0 text-[var(--becpg-dark-grey)]"
                                    />
                                </Link>
                            </motion.li>
                        );
                    })}
                </ul>
            )}
        </Card>
    );
}
