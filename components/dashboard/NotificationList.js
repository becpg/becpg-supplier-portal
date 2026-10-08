'use client';

/**
 * "Mes notifications" — new in V2 (spec §4.3, weakness F4).
 *
 * beCPG already **emits** notifications (`NotificationRuleService` +
 * `NotificationRuleJob`, with a shipped "documents expiring in less than 90
 * days" rule) — but the loop stops at an email sent to the customer. What was
 * missing was a place for the supplier to land. `/api/v1/notifications`
 * composes that landing zone out of the data that already exists (overdue
 * `pjt:taskList` rows + document statuses); **no read/unread state is stored**,
 * because the portal deliberately holds no state of its own (spec §7.1).
 *
 * This is the one dashboard block that fetches from the browser rather than
 * from the server render: it is the least critical block, and keeping it out of
 * the server round trip keeps the first paint of the four status cards fast.
 *
 * This module also owns the **notification vocabulary** — labels, severity
 * palette, icons, ordering and the row itself — so that the dashboard card and
 * the header bell (`components/shell/NotificationBell`) render one notification
 * exactly the same way. There is no second copy of that mapping anywhere.
 */

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { formatDate, formatTotal } from '@/lib/format';
import { defineLabels, pickLabels } from '@/lib/i18n';

/**
 * Item-level notification wording, shared by the card and the bell.
 * Shell-only strings (the bell's own chrome) stay in the bell.
 */
export const NOTIFICATION_LABELS = defineLabels('components/dashboard/NotificationList#NOTIFICATION_LABELS', {
    fr: {
        title: 'Mes notifications',
        // The API ranks by severity then by oldest date — see `sortNewestFirst`
        // below, which is the *bell's* order, not the card's.
        empty: 'Aucune notification',
        emptyHint: 'Rien ne requiert votre attention pour le moment.',
        overdue: 'En retard de {days} j',
        expiresIn: 'Dans {days} j',
        types: {
            'task.overdue': 'Tâche en retard',
            'document.expired': 'Document expiré',
            'document.expiring': 'Document à renouveler',
            'document.missing': 'Document manquant',
            'document.refused': 'Document refusé',
        },
        assigned: 'Qui m’est assignée',
        mandatory: 'Obligatoire',
        isNew: 'Nouveau',
        /*
         * Defect L3. `scope.empty` is the API saying the account is attached to
         * **no supplier**: no `GROUP_EXTERNAL_SUPPLIER_<code>` membership and no
         * task pointing at one. Document notifications cannot be scoped, so none
         * are reported — and an empty list then reads as "you are up to date"
         * when what happened is that nobody can tell whose documents to look at.
         * That is a configuration fact and it belongs on the screen, not only in
         * the payload.
         *
         * `internalAccount` is the same fact seen from the other side, and it is
         * not said the same way: for an internal account, having no supplier
         * scope is normal, not an anomaly to report. The `noSupplierIdentity`
         * text was also shown to a referencing officer — advising them to warn
         * « son contact chez le client », that is to say themselves.
         */
        scopeEmpty: {
            noSupplierIdentity: 'Votre compte n’est rattaché à aucun fournisseur : vos documents ne peuvent pas être identifiés. Seules vos tâches sont listées. Signalez-le à votre contact chez le client.',
            internalAccount: 'Compte interne : les alertes documentaires suivent le fournisseur qui doit les fournir, votre cloche ne liste donc que vos tâches. La vue par parc est dans Conformité documentaire.',
            fallback: 'Le périmètre de votre compte est vide : certaines alertes ne peuvent pas être calculées.',
        },
        // The pill counts the whole set; the card lists its most urgent rows. Said
        // out loud, because a "12" over four lines otherwise reads as a bug.
        countTitle: '{total} en attente · les {shown} plus urgentes ci-dessous',
    },
    en: {
        title: 'My notifications',
        empty: 'No notification',
        emptyHint: 'Nothing needs your attention right now.',
        overdue: '{days} d late',
        expiresIn: 'In {days} d',
        types: {
            'task.overdue': 'Overdue task',
            'document.expired': 'Expired document',
            'document.expiring': 'Document to renew',
            'document.missing': 'Missing document',
            'document.refused': 'Refused document',
        },
        assigned: 'Assigned to me',
        mandatory: 'Mandatory',
        isNew: 'New',
        /* See the note on the French `scopeEmpty`. */
        scopeEmpty: {
            noSupplierIdentity: 'Your account is not attached to any supplier, so your documents cannot be identified. Only your tasks are listed. Report it to your contact at the customer.',
            internalAccount: 'Internal account: document alerts follow the supplier who owes them, so your bell only lists your tasks. The park-wide view is under Document compliance.',
            fallback: 'Your account perimeter is empty: some alerts cannot be computed.',
        },
        countTitle: '{total} pending · the {shown} most urgent below',
    },
});

/**
 * @param {string} lang
 * @returns {Object} the notification wording for a language (falls back to fr)
 */
export function notificationLabels(lang) {
    return pickLabels(NOTIFICATION_LABELS, lang);
}

/**
 * Renders a `scope.empty` block — the API's way of saying "this list is empty
 * because of how the account is configured, not because there is nothing to
 * show" (defect L3).
 *
 * It is a **warning**, not an empty state: the two coexist. An `EmptyState`
 * answers "what is in this list"; this answers "why can the list not be built".
 * Rendering only the first is what turned a mis-provisioned account into a
 * silent, reassuring zero.
 *
 * Shared by the dashboard card and the header bell, which read the same payload
 * and must not word the same fact differently.
 *
 * **`internalAccount` is not a warning** and is not painted as one. The other
 * reasons say something is wrong with the account; that one says the account is
 * simply not the one document alerts are about. An orange strip on a normal
 * state teaches the reader to ignore orange strips.
 *
 * @param {Object} props
 * @param {{reason?: string, hint?: string}|null} props.empty the API block
 * @param {Object} props.local a {@link notificationLabels} dictionary
 */
export function ScopeEmptyNote({ empty, local, className = '' }) {
    if (!empty) {
        return null;
    }
    const words = local.scopeEmpty || {};
    const message = words[empty.reason] || words.fallback;
    if (!message) {
        return null;
    }
    const informational = empty.reason === 'internalAccount';
    return (
        <p
            role="status"
            className={[
                'flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-xs text-[var(--becpg-dark-grey-deep)]',
                informational ? 'bg-[var(--becpg-grey)]/60' : 'bg-[var(--status-warn-bg)]',
                className,
            ].join(' ')}
        >
            <Icon
                name="info"
                size={14}
                className={`mt-0.5 shrink-0 ${informational ? 'text-[var(--becpg-dark-grey)]' : 'text-[var(--status-warn)]'}`}
            />
            <span>{message}</span>
        </p>
    );
}

/** Severity → pill class + icon chip class. */
export const NOTIFICATION_SEVERITY = {
    danger: { pill: 'pill-danger', chip: 'bg-[var(--status-danger-bg)] text-[var(--status-danger)]' },
    warning: { pill: 'pill-warn', chip: 'bg-[var(--status-warn-bg)] text-[var(--status-warn)]' },
    info: { pill: 'pill-info', chip: 'bg-[var(--status-info-bg)] text-[var(--status-info)]' },
};

/** Notification type → Material icon. */
export const NOTIFICATION_TYPE_ICON = {
    'task.overdue': 'alarm',
    'document.expired': 'event_busy',
    'document.expiring': 'update',
    'document.missing': 'help_outline',
    'document.refused': 'cancel',
};

/**
 * Newest first.
 *
 * The API ranks by *urgency* (severity, then oldest date first), which is what
 * the dashboard card wants. A notification panel is read as a feed, so the bell
 * wants the reverse: the most recently dated event on top.
 *
 * The only date a notification carries is the date of the event that produced it
 * (`pjt:tlDue` for a task, `cm:effectivity` end for a document). Some
 * notifications have **no** date at all — a document that was never provided has
 * no validity date — and those cannot be placed on a timeline: they keep the
 * API's own urgency rank and land after the dated ones. The sort is stable, so
 * on an instance where nothing is dated the API order is preserved exactly.
 *
 * @param {Array<Object>} items notifications from `/api/v1/notifications`
 * @returns {Array<Object>} a new array, most recent first
 */
export function sortNewestFirst(items) {
    if (!Array.isArray(items)) {
        return [];
    }
    return items
        .map((item, position) => ({
            item,
            position,
            time: item && item.date ? new Date(item.date).getTime() : Number.NaN,
        }))
        .sort((a, b) => {
            const aDated = Number.isFinite(a.time);
            const bDated = Number.isFinite(b.time);
            if (aDated !== bDated) {
                return aDated ? -1 : 1;
            }
            if (aDated && a.time !== b.time) {
                return b.time - a.time;
            }
            return a.position - b.position;
        })
        .map((entry) => entry.item);
}

/**
 * The "how late / how soon" line of a row, or `null` when the notification
 * carries neither a delay nor a date.
 */
function timing(item, local, lang) {
    const days = item.type === 'task.overdue' ? item.daysOverdue : item.daysToExpiry;
    if (typeof days === 'number') {
        const template = item.type === 'task.overdue' || days < 0 ? local.overdue : local.expiresIn;
        return template.replace('{days}', Math.abs(days));
    }
    return item.date ? formatDate(item.date, lang) : null;
}

/**
 * One notification, rendered as the link to the thing it is about.
 *
 * `item.href` is computed server side (`/tasks/<id>` for a task, `/documents`
 * for a document requirement): the row never guesses a destination.
 *
 * @param {Object} props
 * @param {Object} props.item a notification from `/api/v1/notifications`
 * @param {string} props.lang
 * @param {Object} [props.local] wording (defaults to the item's language)
 * @param {boolean} [props.unseen] marks the row as new since the last read
 * @param {Function} [props.onNavigate] called on click (the bell closes its panel)
 */
export function NotificationRow({ item, lang, local, unseen = false, onNavigate, className = '' }) {
    const words = local || notificationLabels(lang);
    const severity = NOTIFICATION_SEVERITY[item.severity] || NOTIFICATION_SEVERITY.info;
    const when = timing(item, words, lang);

    return (
        <Link
            href={item.href || '/tasks'}
            onClick={onNavigate}
            // Read from the DOM by the audit and by the e2e suite: "which rows
            // does this user still have to look at" must be assertable without
            // reading a colour off a screenshot.
            data-unseen={unseen ? 'true' : 'false'}
            className={[
                // `.becpg-notification-row` carries the rail and the surfaces; the row
                // shipped a `--becpg-grey`/60 hover measured at 1.11:1 against
                // white, and read/unread was a 6px dot and nothing else.
                'becpg-notification-row flex touch-target items-start gap-2.5 rounded-lg px-2 py-2.5 transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${severity.chip}`}>
                <Icon name={NOTIFICATION_TYPE_ICON[item.type] || 'notifications'} size={18} />
            </span>

            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                    {unseen ? (
                        <>
                            {/* The same orange as the rail 3px to its left
                                (`--becpg-orange-deep`), not the brand accent: two
                                different oranges on one row read as a mistake, and
                                the brand one measures 2.95:1 on white and 2.77:1
                                on the unread wash — under 1.4.11's 3:1 for a
                                graphical object. `--becpg-orange-deep` is 4.83:1
                                and 4.53:1 on the same two surfaces. */}
                            <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--becpg-orange-deep)]"
                                aria-hidden="true"
                            />
                            {/* The dot is a colour: say it too. */}
                            <span className="sr-only-text">{words.isNew}</span>
                        </>
                    ) : null}
                    {/* Same rule as the document rows it sits next to: wrap to a
                        second line, never cut the discriminating half off.
                        The colour is explicit — this row is also rendered inside
                        the header's popover, where the inherited colour is the
                        toolbar's white. */}
                    <span
                        className={[
                            'min-w-0 flex-1 text-sm leading-snug line-clamp-2 text-[var(--becpg-blue)]',
                            // Weight is the greyscale half of the read/unread
                            // signal: the rail and the dot are colour, this is not.
                            unseen ? 'font-semibold' : 'font-medium',
                        ].join(' ')}
                    >
                        {item.title || (item.target && item.target.name) || '—'}
                    </span>
                </span>
                {/*
                  * `--becpg-dark-grey-deep` (#666666), not `--becpg-dark-grey`
                  * (#747474). This row is no longer always drawn on white: the
                  * bell now gives it a hover wash and an unread wash, and 12px
                  * text has to clear 4.5:1 on *every* surface the row can take.
                  * Measured — #747474: 4.67 on white, but 4.39 on the unread
                  * wash, 4.01 on its hover and 3.90 on the plain `--becpg-grey`
                  * hover, i.e. failing on three of four. #666666: 5.74 / 5.39 /
                  * 4.92 / 4.79, passing on all four. The title above is
                  * `--becpg-blue` and was never in question (9.4:1 at worst).
                  */}
                {item.entity && item.entity.label ? (
                    <span className="mt-0.5 block truncate text-xs text-[var(--becpg-dark-grey-deep)]">
                        {item.entity.label}
                    </span>
                ) : null}
                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className={`pill pill-sm pill-no-dot ${severity.pill}`}>
                        {words.types[item.type] || item.type}
                    </span>
                    {when ? <span className="text-xs text-[var(--becpg-dark-grey-deep)]">{when}</span> : null}
                    {item.isMandatory ? (
                        <span className="text-xs font-medium text-[var(--status-danger)]">{words.mandatory}</span>
                    ) : null}
                    {item.assignedToMe ? (
                        <span className="inline-flex items-center gap-0.5 text-xs text-[var(--becpg-blue-light)]">
                            <Icon name="person" size={13} />
                            {words.assigned}
                        </span>
                    ) : null}
                </span>
            </span>

            {/* Same grey as the two lines above it: one row, one secondary tone. */}
            <Icon name="chevron_right" size={18} className="mt-1 shrink-0 text-[var(--becpg-dark-grey-deep)]" />
        </Link>
    );
}

/**
 * @param {Object} props
 * @param {number} [props.limit=6] how many notifications the card shows
 * @param {number} [props.index]
 */
export function NotificationList({ limit = 6, index = 0, className = '' }) {
    const { lang } = useMessages();
    const local = notificationLabels(lang);
    const reduceMotion = useReducedMotion();

    const { data, error, loading, refresh } = useApi('notifications', { params: { limit } });
    const items = data && Array.isArray(data.items) ? data.items : [];
    const counts = (data && data.counts) || {};
    const scopeEmpty = (data && data.scope && data.scope.empty) || null;

    return (
        <Card
            title={local.title}
            icon="notifications"
            index={index}
            bodyClassName="pt-1"
            className={className}
            actions={
                counts.total ? (
                    /*
                     * The pill is the size of the **set** `/api/v1/notifications`
                     * enumerated; the card lists its head. `formatTotal` renders a
                     * capped count as "50+" rather than as a fact (`counts.exact`),
                     * and the title names the window — the number and the rows under
                     * it must never look like a contradiction.
                     */
                    <span
                        title={local.countTitle
                            .replace('{total}', counts.total)
                            .replace('{shown}', items.length)}
                        className={`pill pill-sm pill-no-dot tabular-nums ${
                            counts.danger ? 'pill-danger' : 'pill-warn'
                        }`}
                    >
                        <Icon name={counts.danger ? 'priority_high' : 'schedule'} size={13} />
                        {formatTotal({ total: counts.total, exact: counts.exact !== false }, lang).text}
                    </span>
                ) : null
            }
        >
            {/* The scope note sits **above** the list, not inside its empty
                state: it also applies when tasks did come back and only the
                document half of the payload could not be scoped. */}
            <ScopeEmptyNote empty={scopeEmpty} local={local} className="mb-2" />
            {loading ? (
                <SkeletonList rows={3} withAvatar />
            ) : error ? (
                <ErrorState error={error} onRetry={refresh} compact />
            ) : items.length === 0 ? (
                /* Not the reassuring green variant when the scope is empty: a
                   check mark and "nothing needs your attention" directly
                   contradict the warning right above it. */
                <EmptyState
                    variant={scopeEmpty ? 'empty' : 'success'}
                    compact
                    title={local.empty}
                    message={scopeEmpty ? undefined : local.emptyHint}
                />
            ) : (
                <ul className="-mx-2 flex flex-col">
                    {items.map((item, position) => (
                        <motion.li
                            key={item.id || position}
                            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: reduceMotion ? 0 : 0.22,
                                delay: reduceMotion ? 0 : Math.min(position, 8) * 0.04,
                            }}
                        >
                            <NotificationRow item={item} lang={lang} local={local} />
                        </motion.li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
