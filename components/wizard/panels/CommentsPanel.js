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
import { RichText } from '@/components/ui/RichText';
import { formatDateTime } from '@/lib/format';
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
        onRowOfList: 'Ligne « {label} » de « {list} »',
        inList: 'Une ligne de « {list} »',
        row: 'une ligne',
        anchored: 'Sur {label}',
        clear: 'Retirer l’ancrage',
        readOnly: 'La discussion est en lecture seule.',
        posting: 'Envoi…',
        count: '{count} message(s)',
        denyReasons: {
            noAssignedTask:
                'Le référencement est clos : cette discussion est en lecture seule.',
            readAccess: 'Vous n’avez qu’un accès en lecture sur cette fiche.',
            noPermission: 'Vous n’avez pas les droits pour écrire dans cette discussion.',
        },
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
        onRowOfList: 'Row "{label}" of "{list}"',
        inList: 'A row of "{list}"',
        row: 'a row',
        anchored: 'On {label}',
        clear: 'Remove the anchor',
        readOnly: 'The discussion is read-only.',
        posting: 'Sending…',
        count: '{count} message(s)',
        denyReasons: {
            noAssignedTask: 'The referencing is closed: this discussion is read-only.',
            readAccess: 'You only have read access on this sheet.',
            noPermission: 'You are not allowed to write in this discussion.',
        },
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
 * `canPost` / `denyReason` are **read from the payload, never derived here**: the API asks
 * the repository whether this user may add a post on this very node (defect F6). Until the
 * thread has answered, `canPost` is false — a composer that appears once the right is known
 * is honest, one that appears and then has to be taken away is not.
 *
 * @param {Object} options
 * @param {string|null} options.nodeRef the node the thread hangs on
 * @param {boolean} [options.enabled=true]
 * @param {number} [options.pageSize=100]
 * @param {'entity'|null} [options.scope] `'entity'` reads the sheet **and** the forums of
 *        its commented rows; every message then carries its `source`
 * @returns {{nodeRef: string|null, messages: Object[], total: number, counts: Object,
 *            countFor: Function, loading: boolean, error: Error|null, posting: boolean,
 *            canPost: boolean, denyReason: string|null,
 *            refresh: Function, post: Function}}
 *
 * @example
 * const discussion = useDiscussion({ nodeRef: entityNodeRef });
 * discussion.countFor('bcpg:legalName'); // 2
 */
export function useDiscussion({ nodeRef, enabled = true, pageSize = 100, scope = null } = {}) {
    const [posting, setPosting] = useState(false);

    const thread = useApi(nodeRef && enabled ? 'messages' : null, {
        params: { nodeRef, pageSize, ...(scope ? { scope } : {}) },
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
            catch (error) {
                // A 403 here means the right went away between the read and the write — the
                // task was completed in another tab, the client closed the referencing.
                // Re-read the thread so the composer disappears instead of inviting a second
                // attempt that will fail the same way.
                if (error && error.status === 403 && target === nodeRef) {
                    thread.refresh();
                }
                throw error;
            }
            finally {
                setPosting(false);
            }
        },
        [nodeRef, thread],
    );

    // The server decides; `null` data (loading, disabled, in error) means "not yet allowed".
    const canPost = Boolean(thread.data && thread.data.canPost !== false);
    const denyReason = thread.data && thread.data.canPost === false
        ? (thread.data.postDenyReason || 'noPermission')
        : null;

    return {
        nodeRef: nodeRef || null,
        messages,
        total: thread.data ? Number(thread.data.total) || messages.length : 0,
        counts,
        countFor,
        loading: thread.loading,
        error: thread.error,
        posting,
        canPost,
        denyReason,
        refresh: thread.refresh,
        post,
    };
}

/**
 * One message.
 */
/**
 * How a message names where it comes from, with what could actually be resolved.
 *
 * @param {{label: string|null, list: string|null}} source
 * @param {Object} labels
 * @returns {string}
 */
function anchorOf(source, labels) {
    if (source.label && source.list) {
        return fill(labels.onRowOfList, { label: source.label, list: source.list });
    }
    if (source.list) {
        return fill(labels.inList, { list: source.list });
    }
    return fill(labels.onRow, { label: source.label || labels.row });
}

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
            {/* Where the message hangs: a field of the sheet, or the row whose own
                forum it came from — named with its list, without which the
                sheet-level view piles up remarks from a dozen lines with no way
                to tell them apart. A remark written in beCPG carries no row
                label, so it is named by its list alone rather than not at all. */}
            {message.field || message.source ? (
                <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-[var(--becpg-grey)]/60 px-1.5 py-0.5 text-[11px] text-[var(--becpg-dark-grey)]">
                    <Icon name="my_location" size={12} />
                    {message.field
                        ? fill(labels.anchored, { label: message.field })
                        : anchorOf(message.source, labels)}
                </span>
            ) : null}
            {/*
             * The body is HTML in the repository — Alfresco's editor wraps every
             * comment in `<p>`. Printed as a text node it showed as the literal
             * `<p>T1</p>`; `RichText` renders the lines and bullets it described.
             */}
            <RichText
                value={message.content}
                className="mt-1.5 space-y-1 text-sm text-[var(--becpg-blue)]/90"
            />
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
 * @param {boolean} [props.readOnly] the wizard is read-only: read the thread, do not write.
 *   The thread's own `canPost` is applied on top of it, so a writable wizard still hides the
 *   composer on a node the repository refuses.
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

    /*
        "THE WHOLE SHEET" HAS TO MEAN THE WHOLE SHEET.

        The option read the entity's forum, and only that one. A message written on
        the "AG saturés" row lives on the row node, hence in another forum: the
        panel showed "Aucun message" next to a remark the customer had just left.
        `scope: 'entity'` asks the server for the sheet AND its commented rows, in
        one go.
    */
    const sheetWide = onEntityThread && !field;
    const wholeSheet = useDiscussion({
        nodeRef: entityNodeRef,
        scope: 'entity',
        enabled: sheetWide,
    });
    const shown = sheetWide ? wholeSheet : thread;

    const messages = useMemo(() => {
        if (!field) {
            return shown.messages;
        }
        return shown.messages.filter((message) => message.field === field);
    }, [shown.messages, field]);

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
            if (shown !== thread) {
                shown.refresh();
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

            {shown.error ? (
                <ErrorState error={shown.error} onRetry={shown.refresh} compact />
            ) : shown.loading && messages.length === 0 ? (
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

            {/* The composer is ABSENT, not disabled, when the user may not post: a greyed
                Send button still says "you should be able to do this", and the reason is
                what the user actually needs. `thread.canPost` is the server's verdict on
                THIS thread — switching the anchor to a row re-asks it (defect F6). */}
            {readOnly || !thread.canPost ? (
                // Nothing at all while the verdict is still unknown (thread loading): a
                // "read-only" sentence that shows for half a second and then turns into a
                // composer is worse than no sentence.
                thread.denyReason || readOnly ? (
                    <p className="text-xs text-[var(--becpg-dark-grey)]">
                        {thread.denyReason
                            ? (labels.denyReasons[thread.denyReason] || labels.denyReasons.noPermission)
                            : labels.readOnly}
                    </p>
                ) : null
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
