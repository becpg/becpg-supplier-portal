'use client';

/**
 * "État de mon dossier" — card 3 of 4: **actions requises** (spec §4.3).
 *
 * Number of open tasks, of which late, the next due date, and the breakdown by
 * task type. Every figure is a link that lands on `/tasks` already filtered, so
 * the card is a navigation surface and not a read-only counter.
 */

import Link from 'next/link';
import { Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useMessages } from '@/lib/messages';
import { STATE_CARD_CLASS, STATE_RAIL } from '@/components/dashboard/ApprovalCard';
import { formatDate } from '@/lib/format';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LOCAL = defineLabels('components/dashboard/ActionsCard#LOCAL', {
    fr: {
        title: 'Actions requises',
        open: 'tâche(s) ouverte(s)',
        late: '{count} en retard',
        onTime: 'Aucune en retard',
        nextDue: 'Prochaine échéance : {date}',
        noDue: 'Aucune échéance planifiée',
        none: 'Rien à faire pour l’instant',
        all: 'Voir toutes mes tâches',
    },
    en: {
        title: 'Required actions',
        open: 'open task(s)',
        late: '{count} late',
        onTime: 'None late',
        nextDue: 'Next due date: {date}',
        noDue: 'No planned due date',
        none: 'Nothing to do right now',
        all: 'See all my tasks',
    },
});

/**
 * Task types as returned by `/api/v1/tasks` (`task.type`). Exported so the
 * tasks screen and the task list render exactly the same vocabulary.
 */
export const TASK_TYPE_META = {
    wizard: defineLabels('components/dashboard/ActionsCard#TASK_TYPE_META.wizard', { icon: 'edit_note', fr: 'Assistant', en: 'Wizard' }),
    signature: defineLabels('components/dashboard/ActionsCard#TASK_TYPE_META.signature', { icon: 'draw', fr: 'Signature', en: 'Signature' }),
    document: defineLabels('components/dashboard/ActionsCard#TASK_TYPE_META.document', { icon: 'upload_file', fr: 'Document', en: 'Document' }),
    review: defineLabels('components/dashboard/ActionsCard#TASK_TYPE_META.review', { icon: 'visibility', fr: 'Revue', en: 'Review' }),
};

/**
 * @param {string} type
 * @param {string} lang
 * @returns {string}
 */
export function taskTypeLabel(type, lang) {
    const meta = TASK_TYPE_META[type];
    if (!meta) {
        return type || '—';
    }
    return pickLabels(meta, lang);
}

/**
 * @param {Object} props
 * @param {{open: number, late: number, byType: Object, nextDueDate: string|null}|null} props.actions
 * @param {number} [props.index]
 */
export function ActionsCard({ actions, index = 0, className = '' }) {
    const { lang } = useMessages();
    const local = pickLabels(LOCAL, lang);

    const open = (actions && actions.open) || 0;
    const late = (actions && actions.late) || 0;
    const byType = (actions && actions.byType) || {};
    // `fallback: null` on purpose: with no next due date the card says "aucune
    // échéance", it does not print "Prochaine échéance : —".
    const nextDue = formatDate(actions && actions.nextDueDate, lang, { fallback: null });

    const types = Object.keys(TASK_TYPE_META).filter((type) => (byType[type] || 0) > 0);
    // Late is the only state that deserves red; an open task that is on time is
    // work, not an incident, so it stays informative.
    const tone = late > 0 ? 'danger' : open > 0 ? 'info' : 'ok';

    return (
        <Card
            title={local.title}
            icon="assignment_turned_in"
            index={index}
            className={`${STATE_CARD_CLASS} ${className}`.trim()}
            style={{ borderLeftColor: STATE_RAIL[tone] }}
            actions={
                <Link
                    href="/tasks"
                    aria-label={local.all}
                    title={local.all}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--becpg-dark-grey-deep)] hover:bg-[var(--becpg-grey)] hover:text-[var(--becpg-blue)]"
                >
                    <Icon name="arrow_forward" size={18} />
                </Link>
            }
        >
            <div className="flex items-baseline gap-2">
                {/* Blue whatever the state — the rail and the "en retard" pill
                    below carry the alarm. See the note on `STATE_RAIL`. */}
                <span className="text-3xl font-light leading-none tabular-nums text-[var(--becpg-blue)]">
                    {open}
                </span>
                <span className="min-w-0 truncate text-xs text-[var(--becpg-dark-grey)]">{local.open}</span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {late > 0 ? (
                    <Link href="/tasks?late=1" className="pill pill-danger pill-sm hover:opacity-90">
                        <Icon name="alarm" size={13} />
                        {local.late.replace('{count}', late)}
                    </Link>
                ) : (
                    <span className="pill pill-ok pill-sm">
                        <Icon name="check_circle" size={13} />
                        {local.onTime}
                    </span>
                )}
            </div>

            <p className="mt-2 text-xs text-[var(--becpg-dark-grey)]">
                {open === 0 ? local.none : nextDue ? local.nextDue.replace('{date}', nextDue) : local.noDue}
            </p>

            {types.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--becpg-grey)] pt-3">
                    {types.map((type) => (
                        <Link
                            key={type}
                            href={`/tasks?type=${type}`}
                            className="inline-flex items-center gap-1 rounded-full border border-[var(--becpg-grey)] bg-white px-2 py-0.5 text-xs text-[var(--becpg-blue)] transition-colors hover:border-[var(--becpg-blue-light)] hover:bg-[var(--becpg-blue-lighter)]"
                        >
                            <Icon name={TASK_TYPE_META[type].icon} size={13} />
                            <span className="truncate">{taskTypeLabel(type, lang)}</span>
                            <span className="font-medium tabular-nums">{byType[type]}</span>
                        </Link>
                    ))}
                </div>
            ) : null}
        </Card>
    );
}
