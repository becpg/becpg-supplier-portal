'use client';

/**
 * The discussion, **anchored where the problem is** (spec §4.4).
 *
 * The current portal has one comment thread per task. A client who writes "la
 * valeur en sodium est fausse" leaves the supplier to find, among nine lists and
 * two hundred fields, which sodium. So the portal anchors a message on what it
 * is about:
 *
 * | Anchor | Thread | Marker |
 * |---|---|---|
 * | the whole sheet | the entity node | none |
 * | a field | the entity node | `field:bcpg:legalName` in the title |
 * | a datalist row | **the row node** | none — the node *is* the anchor |
 *
 * Both anchors are what `/api/v1/messages` already implements over Alfresco's
 * comment API, which is the very same forum Share's wizard shows: a message
 * written here appears in Share and vice versa — one discussion, two front ends
 * (spec §7.1). Nothing is invented client-side.
 *
 * `useDiscussion` is exported separately because the wizard needs the *counts*
 * (a badge next to every commented field) without mounting the panel: on a phone
 * the panel lives in a sheet that is closed most of the time.
 */

import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Select, Textarea } from '@/components/ui/Field';
import { SkeletonList } from '@/components/ui/Skeleton';
import { formatDateTime } from '@/components/documents/ExpiryPill';
import { api, useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        title: 'Discussion',
        subtitle: 'Vos échanges avec votre client sur cette fiche',
        placeholder: 'Écrire un message…',
        send: 'Envoyer',
        empty: 'Aucun message',
        emptyHint: 'Posez une question à votre client, ou répondez à une de ses remarques.',
        emptyAnchored: 'Aucun message sur cet élément',
        subject: 'Sujet',
        whole: 'Toute la fiche',
        onField: 'Champ : {label}',
        onRow: 'Ligne : {label}',
        anchored: 'Sur {label}',
        clear: 'Retirer l’ancrage',
        readOnly: 'La discussion est en lecture seule.',
        posting: 'Envoi…',
        count: '{count} message(s)',
    },
    en: {
        title: 'Discussion',
        subtitle: 'Your exchanges with your customer on this sheet',
        placeholder: 'Write a message…',
        send: 'Send',
        empty: 'No message',
        emptyHint: 'Ask your customer a question, or answer one of their remarks.',
        emptyAnchored: 'No message on this item',
        subject: 'Subject',
        whole: 'The whole sheet',
        onField: 'Field: {label}',
        onRow: 'Row: {label}',
        anchored: 'On {label}',
        clear: 'Remove the anchor',
        readOnly: 'The discussion is read-only.',
        posting: 'Sending…',
        count: '{count} message(s)',
    },
};

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])),
    );
}

/**
 * One discussion thread — the messages of a node, the per-field counts, and the
 * write.
 *
 * @param {Object} options
 * @param {string|null} options.nodeRef the node the thread hangs on
 * @param {boolean} [options.enabled=true]
 * @param {number} [options.pageSize=100]
 * @returns {{nodeRef: string|null, messages: Object[], total: number, counts: Object,
 *            countFor: Function, loading: boolean, error: Error|null, posting: boolean,
 *            refresh: Function, post: Function}}
 *
 * @example
 * const discussion = useDiscussion({ nodeRef: entityNodeRef });
 * discussion.countFor('bcpg:legalName'); // 2
 */
export function useDiscussion({ nodeRef, enabled = true, pageSize = 100 } = {}) {
    const [posting, setPosting] = useState(false);

    const thread = useApi(nodeRef && enabled ? 'messages' : null, {
        params: { nodeRef, pageSize },
    });

    const messages = useMemo(
        () => (thread.data && Array.isArray(thread.data.messages) ? thread.data.messages : []),
        [thread.data],
    );

    /** `{ 'bcpg:legalName': 2 }` — how many messages are anchored on each field. */
    const counts = useMemo(() => {
        const map = {};
        for (const message of messages) {
            const key = message.field || '';
            map[key] = (map[key] || 0) + 1;
        }
        return map;
    }, [messages]);

    const countFor = useCallback((field) => counts[field || ''] || 0, [counts]);

    const post = useCallback(
        async (content, options = {}) => {
            const target = options.nodeRef || nodeRef;
            if (!target || !content || !String(content).trim()) {
                return null;
            }
            setPosting(true);
            try {
                const result = await api.post('messages', {
                    nodeRef: target,
                    content: String(content).trim(),
                    field: options.field || null,
                    itemTitle: options.itemTitle || '',
                });
                if (target === nodeRef) {
                    thread.refresh();
                }
                return result;
            }
            finally {
                setPosting(false);
            }
        },
        [nodeRef, thread],
    );

    return {
        nodeRef: nodeRef || null,
        messages,
        total: thread.data ? Number(thread.data.total) || messages.length : 0,
        counts,
        countFor,
        loading: thread.loading,
        error: thread.error,
        posting,
        refresh: thread.refresh,
        post,
    };
}

/**
 * One message.
 */
function MessageItem({ message, index, lang, labels }) {
    const reduceMotion = useReducedMotion();
    return (
        <motion.li
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, delay: reduceMotion ? 0 : Math.min(index, 6) * 0.03 }}
            className="rounded-xl border border-[var(--becpg-grey)] bg-white p-3"
        >
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <span className="text-sm font-medium text-[var(--becpg-blue)]">
                    {message.author.displayName || message.author.username}
                </span>
                <span className="text-[11px] text-[var(--becpg-dark-grey)]">
                    {formatDateTime(message.createdOn, lang)}
                </span>
            </div>
            {message.field ? (
                <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-[var(--becpg-grey)]/60 px-1.5 py-0.5 text-[11px] text-[var(--becpg-dark-grey)]">
                    <Icon name="my_location" size={12} />
                    {fill(labels.anchored, { label: message.field })}
                </span>
            ) : null}
            <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-[var(--becpg-blue)]/90">
                {message.content}
            </p>
        </motion.li>
    );
}

/**
 * @param {Object} props
 * @param {string} props.entityNodeRef the sheet being worked on — the default thread
 * @param {Object} [props.discussion] an existing `useDiscussion` instance on the entity
 * @param {{nodeRef: string|null, field: string|null, label: string|null}} [props.anchor]
 * @param {Function} [props.onAnchorChange] `(anchor|null) => void`
 * @param {Array<{nodeRef: string, label: string}>} [props.targets] rows that can be discussed
 * @param {boolean} [props.readOnly] the wizard is read-only: read the thread, do not write
 * @param {React.ReactNode} [props.title]
 * @param {'panel'|'sheet'} [props.variant='panel']
 * @param {string} [props.className]
 */
export function CommentsPanel({
    entityNodeRef,
    discussion,
    anchor = null,
    onAnchorChange,
    targets = [],
    readOnly = false,
    title,
    variant = 'panel',
    className = '',
}) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const [draft, setDraft] = useState('');
    const [sendError, setSendError] = useState(null);

    const anchorNodeRef = (anchor && anchor.nodeRef) || entityNodeRef;
    const onEntityThread = !anchor || !anchor.nodeRef || anchor.nodeRef === entityNodeRef;

    // A row has its own thread; the entity thread is the one the wizard already
    // holds, so it is reused rather than fetched twice.
    const foreign = useDiscussion({ nodeRef: anchorNodeRef, enabled: !onEntityThread });
    const entityThread = useDiscussion({ nodeRef: entityNodeRef, enabled: !discussion && onEntityThread });
    const thread = onEntityThread ? (discussion || entityThread) : foreign;

    const field = (anchor && anchor.field) || null;
    const messages = useMemo(() => {
        if (!field) {
            return thread.messages;
        }
        return thread.messages.filter((message) => message.field === field);
    }, [thread.messages, field]);

    const options = useMemo(() => {
        const list = [{ value: '', label: labels.whole }];
        if (field) {
            list.push({
                value: `field:${field}`,
                label: fill(labels.onField, { label: (anchor && anchor.label) || field }),
            });
        }
        for (const target of targets || []) {
            if (target && target.nodeRef) {
                list.push({
                    value: `node:${target.nodeRef}`,
                    label: fill(labels.onRow, { label: target.label || target.nodeRef }),
                });
            }
        }
        return list;
    }, [labels, field, anchor, targets]);

    const currentOption = field
        ? `field:${field}`
        : anchor && anchor.nodeRef && anchor.nodeRef !== entityNodeRef
          ? `node:${anchor.nodeRef}`
          : '';

    const handleAnchor = (value) => {
        if (!onAnchorChange) {
            return;
        }
        if (!value) {
            onAnchorChange(null);
            return;
        }
        if (value.startsWith('field:')) {
            onAnchorChange({ nodeRef: entityNodeRef, field: value.slice(6), label: anchor ? anchor.label : null });
            return;
        }
        const nodeRef = value.slice(5);
        const target = (targets || []).find((entry) => entry.nodeRef === nodeRef);
        onAnchorChange({ nodeRef, field: null, label: target ? target.label : null });
    };

    const send = async () => {
        setSendError(null);
        try {
            await thread.post(draft, { nodeRef: anchorNodeRef, field, itemTitle: (anchor && anchor.label) || '' });
            setDraft('');
            if (!onEntityThread) {
                thread.refresh();
            }
        }
        catch (error) {
            setSendError(error);
        }
    };

    const body = (
        <div className="flex min-w-0 flex-col gap-3">
            {options.length > 1 && onAnchorChange ? (
                <Select
                    aria-label={labels.subject}
                    options={options}
                    value={currentOption}
                    onChange={(event) => handleAnchor(event.target.value)}
                />
            ) : null}

            {thread.error ? (
                <ErrorState error={thread.error} onRetry={thread.refresh} compact />
            ) : thread.loading && messages.length === 0 ? (
                <SkeletonList rows={3} />
            ) : messages.length === 0 ? (
                <EmptyState
                    variant="empty"
                    icon="forum"
                    compact
                    title={field || !onEntityThread ? labels.emptyAnchored : labels.empty}
                    message={field || !onEntityThread ? undefined : labels.emptyHint}
                />
            ) : (
                <ul className="flex max-h-[26rem] flex-col gap-2 overflow-y-auto pr-0.5">
                    <AnimatePresence initial={false}>
                        {messages.map((message, index) => (
                            <MessageItem
                                key={message.nodeRef || `${message.createdOn}-${index}`}
                                message={message}
                                index={index}
                                lang={lang}
                                labels={labels}
                            />
                        ))}
                    </AnimatePresence>
                </ul>
            )}

            {readOnly ? (
                <p className="text-xs text-[var(--becpg-dark-grey)]">{labels.readOnly}</p>
            ) : (
                <div className="flex flex-col gap-2">
                    <Textarea
                        rows={3}
                        value={draft}
                        placeholder={labels.placeholder}
                        onChange={(event) => setDraft(event.target.value)}
                        invalid={Boolean(sendError)}
                    />
                    {sendError ? <ErrorState error={sendError} compact /> : null}
                    <Button
                        variant="primary"
                        icon="send"
                        onClick={send}
                        loading={thread.posting}
                        disabled={!draft.trim() || thread.posting}
                        fullWidth
                    >
                        {thread.posting ? labels.posting : labels.send}
                    </Button>
                </div>
            )}
        </div>
    );

    if (variant === 'sheet') {
        return <div className={`min-w-0 ${className}`}>{body}</div>;
    }

    return (
        <Card
            title={title || labels.title}
            subtitle={labels.subtitle}
            icon="forum"
            padding="md"
            className={className}
        >
            {body}
        </Card>
    );
}
