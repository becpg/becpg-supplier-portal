'use client';

/**
 * "Mes discussions" — the modernised `forum-summary` dashlet (spec §4.3).
 *
 * A "discussion" is the Alfresco forum attached to a node (`fm:forum` →
 * `fm:topic` → `fm:post`), the very thread Share's `Alfresco.CommentsList`
 * writes to. The portal reads it through `/api/v1/messages`, so a remark left by
 * the quality manager in Share shows up here and an answer typed here shows up
 * there: **one discussion, two front ends** (spec §7.1).
 *
 * The threads themselves are resolved server-side (the dashboard page owns that
 * composition); this component only renders them.
 */

import { useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMessages } from '@/lib/messages';
import { isUnread, markRead, readState, serverState, subscribe } from '@/lib/discussions';
import { defineLabels, pickLabels } from '@/lib/i18n';
import { DateText } from '@/components/ui/DateText';

const LOCAL = defineLabels('components/dashboard/DiscussionList#LOCAL', {
    fr: {
        title: 'Mes discussions',
        empty: 'Aucune discussion',
        emptyHint: 'Les remarques de votre client sur vos tâches et vos produits apparaîtront ici.',
        all: 'Tout voir',
        messages: '{count} message(s)',
        anonymous: 'Utilisateur',
        onField: 'sur {field}',
        unread: 'Nouveau',
        unreadCount: '{count} non lu(s)',
    },
    en: {
        title: 'My discussions',
        empty: 'No discussion',
        emptyHint: 'Your customer’s remarks on your tasks and products will show up here.',
        all: 'See all',
        messages: '{count} message(s)',
        anonymous: 'User',
        onField: 'on {field}',
        unread: 'New',
        unreadCount: '{count} unread',
    },
});

/** Initials of a display name, for the avatar bubble. */
function initials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        return '?';
    }
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/**
 * @param {Object} props
 * @param {Array<{nodeRef: string, title: string, subtitle: string|null, href: string,
 *                count: number, field: string|null,
 *                last: {author: string, excerpt: string, date: string|null}|null}>} props.threads
 * @param {number} [props.index]
 */
export function DiscussionList({ threads = [], index = 0, className = '' }) {
    const { lang } = useMessages();
    const local = pickLabels(LOCAL, lang);
    const reduceMotion = useReducedMotion();

    /*
     * The read state lives in `localStorage`, hence outside React:
     * `useSyncExternalStore` is made for that. Its server snapshot is empty
     * — the server does not know what this user has read — which rules out any
     * hydration mismatch, and the subscription makes the marker disappear in the
     * other tabs as soon as a thread is opened here.
     */
    const seen = useSyncExternalStore(subscribe, readState, serverState);

    /*
     * Unread threads first, each of the two groups staying sorted by descending
     * date — the order the server already rendered them in. Sorting rather than
     * hiding: a read thread stays reachable, it merely stops competing for the
     * first place with a message nobody has answered.
     */
    const ordered = useMemo(() => {
        const unread = [];
        const read = [];
        for (const thread of threads) {
            (isUnread(thread, seen) ? unread : read).push(thread);
        }
        return [...unread, ...read];
    }, [threads, seen]);

    const unreadCount = useMemo(
        () => threads.filter((thread) => isUnread(thread, seen)).length,
        [threads, seen],
    );

    return (
        <Card
            title={local.title}
            icon="forum"
            index={index}
            bodyClassName="pt-1"
            className={className}
            actions={
                threads.length > 0 ? (
                    <span className="flex items-center gap-1.5">
                        {unreadCount > 0 ? (
                            <span className="pill pill-warn pill-sm pill-no-dot">
                                {local.unreadCount.replace('{count}', unreadCount)}
                            </span>
                        ) : null}
                        <Link
                            href="/messages"
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--becpg-blue-light)] hover:bg-[var(--becpg-grey)]"
                        >
                            {local.all}
                            <Icon name="arrow_forward" size={14} />
                        </Link>
                    </span>
                ) : null
            }
        >
            {threads.length === 0 ? (
                <EmptyState variant="empty" compact title={local.empty} message={local.emptyHint} />
            ) : (
                <ul className="-mx-2 flex flex-col">
                    {ordered.map((thread, position) => {
                        const unread = isUnread(thread, seen);
                        return (
                        <motion.li
                            key={thread.nodeRef || position}
                            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: reduceMotion ? 0 : 0.22,
                                delay: reduceMotion ? 0 : Math.min(position, 8) * 0.04,
                            }}
                        >
                            <Link
                                href={thread.href}
                                onClick={() => markRead(thread.nodeRef, thread.last ? thread.last.date : null)}
                                className={`flex touch-target items-start gap-2.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--becpg-grey)]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]${
                                    unread ? ' bg-[var(--becpg-orange)]/5' : ''
                                }`}
                            >
                                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full leading-none bg-[var(--becpg-blue)] text-[0.6875rem] font-medium text-white">
                                    {initials(thread.last ? thread.last.author : thread.title)}
                                </span>

                                <span className="min-w-0 flex-1">
                                    <span className="flex items-baseline justify-between gap-2">
                                        <span className={`min-w-0 truncate text-sm${unread ? ' font-semibold' : ' font-medium'}`}>
                                            {unread ? (
                                                <span
                                                    aria-hidden="true"
                                                    className="me-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--becpg-orange)] align-middle"
                                                />
                                            ) : null}
                                            {thread.title}
                                        </span>
                                        {thread.last && thread.last.date ? (
                                            <span className="shrink-0 text-xs text-[var(--becpg-dark-grey)]">
                                                <DateText value={thread.last.date} lang={lang} />
                                            </span>
                                        ) : null}
                                    </span>

                                    {thread.subtitle ? (
                                        <span className="mt-0.5 block truncate text-xs text-[var(--becpg-dark-grey)]">
                                            {thread.subtitle}
                                        </span>
                                    ) : null}

                                    {thread.last && thread.last.excerpt ? (
                                        <span className="mt-1 block text-xs leading-relaxed text-[var(--becpg-dark-grey)] line-clamp-2">
                                            <span className="font-medium text-[var(--becpg-blue)]">
                                                {thread.last.author || local.anonymous}
                                                {' : '}
                                            </span>
                                            {thread.last.excerpt}
                                        </span>
                                    ) : null}

                                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                        {unread ? (
                                            <span className="pill pill-warn pill-sm pill-no-dot">
                                                {local.unread}
                                            </span>
                                        ) : null}
                                        <span className="pill pill-neutral pill-sm pill-no-dot">
                                            <Icon name="chat_bubble_outline" size={13} />
                                            {local.messages.replace('{count}', thread.count)}
                                        </span>
                                        {thread.field ? (
                                            <span className="pill pill-info pill-sm pill-no-dot">
                                                {local.onField.replace('{field}', thread.field)}
                                            </span>
                                        ) : null}
                                    </span>
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
