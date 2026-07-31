'use client';

/**
 * `/messages` — the discussions with the customer.
 *
 * There is no "portal messaging": a discussion in beCPG is the Alfresco forum
 * attached to a node (`fm:forum` → `fm:topic` → `fm:post`), the very thread
 * Share's wizard shows through `Alfresco.CommentsList`. The portal reads and
 * writes that same thread (`GET|POST /api/v1/messages?nodeRef=`), so a remark
 * written by the quality team in Share appears here, and an answer typed here
 * appears in Share — **one discussion, two front ends** (spec §7.1). The portal
 * stores nothing of its own: no read/unread flag, no copy.
 *
 * A thread hangs off a node, so the screen is a master/detail: the subjects are
 * the supplier's record and its products, the detail is the thread. On a phone
 * the two are stacked — the list, then the thread with a back button — because a
 * side-by-side inbox at 360px is a well-known way to make both halves unusable.
 *
 * Messages carry an optional field anchor (`field:bcpg:allergenList`, written
 * into the post title): the remark "il manque le soja" belongs to a field, not
 * to a task (spec §4.4). It is shown as a chip on the message.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { AppShell } from '@/components/shell/AppShell';
import { Button, Icon, Spinner } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea, SearchInput } from '@/components/ui/Field';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/providers/ToastProvider';
import { useSession } from '@/components/providers/SessionProvider';
import { formatDateTime } from '@/lib/format';
import { api, useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        title: 'Discussions',
        subtitle: 'Les échanges avec le client, produit par produit',
        subjects: 'Sujets',
        search: 'Rechercher un sujet',
        myRecord: 'Ma fiche fournisseur',
        back: 'Sujets',
        placeholder: 'Écrire un message…',
        send: 'Envoyer',
        sending: 'Envoi…',
        empty: 'Aucun message',
        emptyHint: 'Démarrez la discussion : le client sera notifié.',
        noSubject: 'Choisissez un sujet',
        noSubjectHint: 'Sélectionnez un produit ou votre fiche pour voir les échanges.',
        noSubjects: 'Aucun sujet de discussion',
        noSubjectsHint:
            'Les discussions sont rattachées à vos produits. Aucun produit ne vous est rattaché pour le moment.',
        field: 'Champ',
        edited: 'modifié',
        you: 'Vous',
        openSubject: 'Ouvrir la fiche',
        thread: 'Discussion',
        tooLong: 'Message trop long (20 000 caractères maximum).',
        denyReasons: {
            noAssignedTask:
                'Le référencement est clos : cette discussion est en lecture seule.',
            readAccess: 'Vous n’avez qu’un accès en lecture sur cette fiche.',
            noPermission: 'Vous n’avez pas les droits pour écrire dans cette discussion.',
        },
    },
    en: {
        title: 'Discussions',
        subtitle: 'Exchanges with the customer, product by product',
        subjects: 'Subjects',
        search: 'Search a subject',
        myRecord: 'My supplier record',
        back: 'Subjects',
        placeholder: 'Write a message…',
        send: 'Send',
        sending: 'Sending…',
        empty: 'No message',
        emptyHint: 'Start the discussion — the customer will be notified.',
        noSubject: 'Pick a subject',
        noSubjectHint: 'Select a product or your record to see the exchanges.',
        noSubjects: 'No discussion subject',
        noSubjectsHint:
            'Discussions hang off your products. No product is linked to you at the moment.',
        field: 'Field',
        edited: 'edited',
        you: 'You',
        openSubject: 'Open the sheet',
        thread: 'Discussion',
        tooLong: 'Message too long (20,000 characters maximum).',
        denyReasons: {
            noAssignedTask: 'The referencing is closed: this discussion is read-only.',
            readAccess: 'You only have read access on this sheet.',
            noPermission: 'You are not allowed to write in this discussion.',
        },
    },
};

/** Same ceiling as the route handler, checked here so the user is told before sending. */
const MAX_LENGTH = 20000;

/** Initials of a display name, for the message avatar. */
function initials(name) {
    return String(name || '?')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('');
}

/**
 * One message.
 *
 * @param {Object} props
 * @param {Object} props.message
 * @param {boolean} props.mine written by the signed-in user
 */
function Message({ message, mine, labels, lang, index }) {
    const reduceMotion = useReducedMotion();
    const author = message.author || {};
    const name = author.displayName || author.username || '—';

    return (
        <motion.li
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.03 }}
            className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}
        >
            <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                    mine
                        ? 'bg-[var(--becpg-blue)] text-white'
                        : 'bg-[var(--becpg-grey)] text-[var(--becpg-blue)]'
                }`}
                aria-hidden="true"
            >
                {initials(name)}
            </span>
            <div className={`min-w-0 max-w-[85%] ${mine ? 'text-right' : ''}`}>
                <p className="text-xs text-[var(--becpg-dark-grey)]">
                    <span className="font-medium text-[var(--becpg-blue)]">{mine ? labels.you : name}</span>
                    {message.createdOn ? <span> · {formatDateTime(message.createdOn, lang)}</span> : null}
                    {message.edited ? <span> · {labels.edited}</span> : null}
                </p>
                {message.field ? (
                    <span className="pill pill-info pill-no-dot pill-sm mt-1">
                        <Icon name="my_location" size={12} />
                        <span>
                            {labels.field} : {message.field}
                        </span>
                    </span>
                ) : null}
                <div
                    className={`mt-1 inline-block whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-left text-sm ${
                        mine
                            ? 'bg-[var(--becpg-blue-lighter)] text-[var(--becpg-blue)]'
                            : 'bg-white text-[var(--becpg-blue)] ring-1 ring-[var(--becpg-grey)]'
                    }`}
                >
                    {message.content}
                </div>
            </div>
        </motion.li>
    );
}

/**
 * The screen itself. Split out of the default export so `useSearchParams` sits
 * under a `<Suspense>` boundary — the convention every other query-reading
 * screen of this portal follows (`/tasks`, `/monitor/suppliers`, `/products/[id]`).
 *
 * @returns {JSX.Element}
 */
function MessagesScreen() {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const session = useSession();
    const toast = useToast();
    const searchParams = useSearchParams();

    /*
     * `?nodeRef=` is the deep link — the dashboard's "Mes discussions" rows and
     * the notification mails both point here — and it is read through
     * `useSearchParams()` **because that is the only reader the App Router keeps
     * in sync**.
     *
     * It used to be read once, from `window.location.search`, in the `useState`
     * initialiser. That failed in exactly the way defect F5 describes: arriving
     * from the dashboard is a client-side transition, the component mounts
     * before the new query string is on `window.location`, the initialiser
     * therefore reads `null` — and nothing ever reads it again. The URL showed
     * the discussion and the panel showed "choose a subject". (Reloading that
     * same URL worked, which is what made the bug look like nothing at all.)
     * It also branched on `typeof window` during render, so every hard load of a
     * deep link logged a hydration mismatch.
     *
     * The URL is re-read during render when it changes, the same "adjust state
     * on prop change" shape `useApi` and `/tasks` use, rather than in an effect
     * that would paint the wrong pane first.
     */
    const urlNodeRef = searchParams.get('nodeRef') || null;
    const [selected, setSelected] = useState(urlNodeRef);
    const [urlKey, setUrlKey] = useState(urlNodeRef);
    if (urlKey !== urlNodeRef) {
        setUrlKey(urlNodeRef);
        setSelected(urlNodeRef);
    }

    const [query, setQuery] = useState('');
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);

    const products = useApi('entities', { params: { pageSize: 100 } });

    /** Subjects: the supplier record first, then the products. */
    const subjects = useMemo(() => {
        const items = (products.data && products.data.items) || [];
        const list = items.map((item) => ({
            nodeRef: item.nodeRef,
            name: item.name,
            code: item.code,
            href: `/products/${item.uuid}`,
        }));
        const supplier = session.supplier;
        if (supplier && supplier.nodeRef && !list.some((entry) => entry.nodeRef === supplier.nodeRef)) {
            list.unshift({
                nodeRef: supplier.nodeRef,
                name: supplier.name || labels.myRecord,
                code: supplier.code,
                href: '/company',
                isSupplier: true,
            });
        }
        return list;
    }, [products.data, session.supplier, labels.myRecord]);

    const filteredSubjects = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) {
            return subjects;
        }
        return subjects.filter((subject) =>
            [subject.name, subject.code]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(term)),
        );
    }, [subjects, query]);

    const activeSubject = useMemo(
        () => subjects.find((subject) => subject.nodeRef === selected) || null,
        [subjects, selected],
    );

    const thread = useApi(selected ? 'messages' : null, { params: { nodeRef: selected } });

    // Newest first upstream (`reverse=true`); read as a conversation here.
    const messages = useMemo(() => {
        const items = (thread.data && thread.data.messages) || [];
        return [...items].reverse();
    }, [thread.data]);

    const username = session.user ? session.user.username || session.user.sub : null;

    useEffect(() => {
        if (bottomRef.current && messages.length > 0) {
            bottomRef.current.scrollIntoView({ block: 'nearest' });
        }
    }, [messages.length]);

    /**
     * Selects a subject and keeps it in the URL, so a thread can be linked to
     * (a notification mail points at `/messages?nodeRef=…`). `replaceState` is
     * used rather than a router push: switching subject is not a navigation.
     */
    const select = useCallback((nodeRef) => {
        setSelected(nodeRef);
        setDraft('');
        if (typeof window === 'undefined') {
            return;
        }
        const url = new URL(window.location.href);
        if (nodeRef) {
            url.searchParams.set('nodeRef', nodeRef);
        }
        else {
            url.searchParams.delete('nodeRef');
        }
        window.history.replaceState(null, '', url.toString());
    }, []);

    /**
     * May the signed-in user write on the selected thread?
     *
     * Answered by the API (`canPost`), never guessed here: the right to comment on an entity
     * is beCPG's, and it lasts exactly as long as the supplier holds an assigned task on it
     * (`SupplierSecurityPlugin`). Unknown until the thread has loaded, so the composer
     * appears once — it is never shown and then taken back (defect F6).
     */
    const canPost = Boolean(thread.data && thread.data.canPost !== false);
    const denyReason = thread.data && thread.data.canPost === false
        ? (thread.data.postDenyReason || 'noPermission')
        : null;

    const send = useCallback(async () => {
        const content = draft.trim();
        if (!content || !selected) {
            return;
        }
        if (content.length > MAX_LENGTH) {
            toast.error({ messageKey: 'error.generic', message: labels.tooLong });
            return;
        }
        setSending(true);
        try {
            await api.post('messages', { nodeRef: selected, content });
            setDraft('');
            thread.refresh();
        }
        catch (error) {
            toast.error(error);
            // Refused after all — the referencing closed while the message was being typed.
            // Re-read the thread so the composer goes away with an explanation, instead of
            // leaving a Send button that will keep failing.
            if (error && error.status === 403) {
                thread.refresh();
            }
        }
        finally {
            setSending(false);
        }
    }, [draft, selected, thread, toast, labels.tooLong]);

    const canSend = canPost && Boolean(selected) && draft.trim().length > 0 && !sending;

    /* ------------------------------------------------------------- subjects */
    const subjectList = (
        <Card padding="sm" className="h-full">
            <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium">{labels.subjects}</h2>
                <span className="pill pill-neutral pill-no-dot pill-sm">{subjects.length}</span>
            </div>
            {subjects.length > 8 ? (
                <div className="mb-2">
                    <SearchInput value={query} onChange={setQuery} placeholder={labels.search} />
                </div>
            ) : null}
            {products.loading ? (
                <SkeletonList rows={5} />
            ) : products.error ? (
                <ErrorState error={products.error} onRetry={products.refresh} compact />
            ) : filteredSubjects.length === 0 ? (
                <EmptyState
                    variant={query ? 'search' : 'empty'}
                    icon="forum"
                    title={labels.noSubjects}
                    message={query ? undefined : labels.noSubjectsHint}
                    compact
                />
            ) : (
                <ul className="flex max-h-[60vh] list-none flex-col gap-1 overflow-y-auto p-0 lg:max-h-[calc(100dvh-18rem)]">
                    {filteredSubjects.map((subject) => (
                        <li key={subject.nodeRef}>
                            <button
                                type="button"
                                onClick={() => select(subject.nodeRef)}
                                aria-current={selected === subject.nodeRef ? 'true' : undefined}
                                className={[
                                    'touch-target flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                                    selected === subject.nodeRef
                                        ? 'bg-[var(--becpg-blue-lighter)] text-[var(--becpg-blue)]'
                                        : 'hover:bg-[var(--becpg-grey)]/60',
                                ].join(' ')}
                            >
                                <Icon
                                    name={subject.isSupplier ? 'domain' : 'inventory_2'}
                                    size={18}
                                    className="text-[var(--becpg-dark-grey)]"
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate">{subject.name || '—'}</span>
                                    {subject.code ? (
                                        <span className="block truncate text-xs text-[var(--becpg-dark-grey)]">
                                            {subject.code}
                                        </span>
                                    ) : null}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );

    /* --------------------------------------------------------------- thread */
    const threadView = (
        <Card padding="sm" className="flex min-h-[24rem] flex-col">
            <div className="mb-2 flex items-center gap-2 border-b border-[var(--becpg-grey)] pb-2">
                <Button
                    variant="ghost"
                    size="sm"
                    icon="arrow_back"
                    className="lg:hidden"
                    onClick={() => select(null)}
                >
                    {labels.back}
                </Button>
                <div className="min-w-0 flex-1">
                    {/* The subject list is capped, and a deep link may name a node that is
                        not in it (an older product, a discussion opened from a mail). The
                        thread is still readable, so name it rather than showing a dash. */}
                    <p className="truncate text-sm font-medium">
                        {activeSubject ? activeSubject.name : labels.thread}
                    </p>
                    {activeSubject && activeSubject.code ? (
                        <p className="truncate text-xs text-[var(--becpg-dark-grey)]">{activeSubject.code}</p>
                    ) : null}
                </div>
                {activeSubject ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        icon="open_in_new"
                        href={activeSubject.href}
                        label={labels.openSubject}
                        title={labels.openSubject}
                    />
                ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                {thread.loading ? (
                    <SkeletonList rows={4} withAvatar />
                ) : thread.error ? (
                    <ErrorState error={thread.error} onRetry={thread.refresh} compact />
                ) : messages.length === 0 ? (
                    <EmptyState
                        variant="empty"
                        icon="chat_bubble_outline"
                        title={labels.empty}
                        // "Start the discussion" is an invitation; do not extend it to a
                        // thread the user cannot write on — the reason is shown below instead.
                        message={canPost ? labels.emptyHint : undefined}
                        compact
                    />
                ) : (
                    <ul className="flex list-none flex-col gap-3 p-0">
                        {messages.map((message, index) => (
                            <Message
                                key={message.nodeRef || `${message.createdOn}-${index}`}
                                message={message}
                                mine={Boolean(
                                    username && message.author && message.author.username === username,
                                )}
                                labels={labels}
                                lang={lang}
                                index={index}
                            />
                        ))}
                        <li ref={bottomRef} aria-hidden="true" />
                    </ul>
                )}
            </div>

            {/* No right to write ⇒ no composer and no Send button at all, plus the reason.
                A disabled Send would still promise an action beCPG will refuse, and hiding
                it silently would leave the supplier wondering where it went. */}
            {!canPost ? (
                denyReason ? (
                    <p className="mt-2 flex items-start gap-1.5 border-t border-[var(--becpg-grey)] pt-2 text-xs text-[var(--becpg-dark-grey)]">
                        <Icon name="lock" size={14} className="mt-px shrink-0" />
                        <span>{labels.denyReasons[denyReason] || labels.denyReasons.noPermission}</span>
                    </p>
                ) : null
            ) : (
            <div className="mt-2 border-t border-[var(--becpg-grey)] pt-2">
                <Textarea
                    rows={2}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={labels.placeholder}
                    aria-label={labels.placeholder}
                    maxLength={MAX_LENGTH}
                    onKeyDown={(event) => {
                        // Enter sends, Shift+Enter breaks the line — the convention
                        // every messaging app has taught, including on mobile keyboards.
                        if (event.key === 'Enter' && !event.shiftKey && canSend) {
                            event.preventDefault();
                            send();
                        }
                    }}
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-[var(--becpg-dark-grey)]">
                        {sending ? (
                            <span className="inline-flex items-center gap-1.5">
                                <Spinner size={13} />
                                {labels.sending}
                            </span>
                        ) : (
                            `${draft.length} / ${MAX_LENGTH}`
                        )}
                    </span>
                    <Button
                        variant="primary"
                        size="sm"
                        icon="send"
                        disabled={!canSend}
                        loading={sending}
                        onClick={send}
                    >
                        {labels.send}
                    </Button>
                </div>
            </div>
            )}
        </Card>
    );

    return (
        <AppShell title={labels.title}>
            <p className="mb-4 text-sm text-[var(--becpg-dark-grey)]">{labels.subtitle}</p>

            <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
                {/* Below lg the two panes never coexist: the list is the screen
                    until a subject is picked, then the thread is. */}
                <div className={selected ? 'hidden lg:block' : 'block'}>{subjectList}</div>
                <div className={selected ? 'block' : 'hidden lg:block'}>
                    {selected ? (
                        threadView
                    ) : (
                        <Card padding="lg">
                            <EmptyState
                                variant="empty"
                                icon="forum"
                                title={labels.noSubject}
                                message={labels.noSubjectHint}
                            />
                        </Card>
                    )}
                </div>
            </div>
        </AppShell>
    );
}

/**
 * @returns {JSX.Element}
 */
export default function MessagesPage() {
    return (
        <Suspense
            fallback={
                <AppShell>
                    <SkeletonList rows={6} />
                </AppShell>
            }
        >
            <MessagesScreen />
        </Suspense>
    );
}
