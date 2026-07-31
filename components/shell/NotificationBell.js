'use client';

/**
 * The header bell — the in-app landing zone for notifications beCPG already
 * emits (spec §4.3, weakness F4).
 *
 * Before this component the bell was a `<Link href="/notifications">` fed by a
 * `notificationCount` prop that **no page ever passed**: the badge was therefore
 * always 0 and the link always led to a 404. The bell now owns its own data.
 *
 * ## What "unread" means here
 *
 * `/api/v1/notifications` stores **no read state**, on purpose: read state would
 * be portal-owned state, and holding none is exactly what lets the two portals
 * coexist (spec §7.1). So the badge counts what is still **outstanding** —
 * `counts.total`, the same number the dashboard card shows — and zero means no
 * badge at all, never a "0" bubble.
 *
 * Novelty is layered on top, in the browser only: the ids already shown to this
 * user are kept in `localStorage`, so a notification that appeared since the last
 * time the panel was opened gets a "Nouveau" dot. Nothing is sent to the server,
 * nothing is shared between devices, and losing that key degrades to "everything
 * looks new" — never to a wrong count.
 *
 * ## Refresh policy
 *
 * Two composed db-afts queries sit behind the endpoint, so it is polled slowly
 * and never in a tight loop:
 *
 *  - on mount — which is every navigation, since `AppShell` is rendered per page
 *    — but only if the cached payload is older than {@link FRESH_FOR_MS};
 *  - every {@link POLL_INTERVAL_MS} while the tab is visible;
 *  - once when the tab becomes visible again, if the data is older than that;
 *  - on demand, from the panel's own refresh button, which always calls.
 *
 * A hidden tab polls nothing, and the module-level `cache` is what keeps a
 * supplier clicking through five screens down to a single search.
 *
 * ## Keyboard and screen readers
 *
 * The trigger is a real `<button>`, so Enter and Space open it for free. The
 * panel is a `role="dialog"`: focus moves into it on open, Tab cycles inside it,
 * Escape closes and returns focus to the bell. The count is announced through a
 * polite live region rather than through the badge, which is `aria-hidden`
 * decoration.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import {
    NotificationRow,
    notificationLabels,
    sortNewestFirst,
} from '@/components/dashboard/NotificationList';
import { useSession } from '@/components/providers/SessionProvider';
import { api } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { formatTime } from '@/lib/format';

/** How often the endpoint is polled while the tab is visible. */
export const POLL_INTERVAL_MS = 120000;

/** How long a payload is reused across mounts instead of being re-fetched. */
export const FRESH_FOR_MS = 30000;

/** Notifications listed in the panel. The badge still counts them all. */
export const PANEL_LIMIT = 20;

/** Ids already shown to this user, so a new notification can be marked as new. */
const SEEN_STORAGE_KEY = 'becpg_portal_notifications_seen';

/** Cap on the stored ids — bounded so the key cannot grow forever. */
const SEEN_MAX = 200;

/**
 * The last payload, shared by every mount of the bell — and the reason this
 * component does not use `useApi`.
 *
 * `AppShell` (and therefore the header) is rendered **by each page**, not by the
 * root layout, so the bell unmounts and remounts on every navigation. A plain
 * per-mount fetch would turn "refresh on navigation" into one composed db-afts
 * search per click; reusing a payload younger than {@link FRESH_FOR_MS} turns
 * five clicks into one search while still refreshing a supplier who lingers.
 *
 * It is deliberately **never read or written on the server**: a module variable
 * is shared between requests there, so caching a payload would risk showing one
 * supplier's notifications to another. `readCache` returns `null` outside the
 * browser, which is also why the first render after a cold load — the one that
 * hydrates — always starts empty on both sides.
 */
let cache = { at: 0, data: null };

/** Guards against two mounts firing the same request during a transition. */
let inFlight = false;

/** @returns {Object|null} the cached payload, browser only */
function readCache() {
    if (typeof window === 'undefined') {
        return null;
    }
    return cache.data;
}

function writeCache(data) {
    if (typeof window === 'undefined') {
        return;
    }
    cache = { at: Date.now(), data };
}

const LOCAL = {
    fr: {
        open: 'Notifications',
        panel: 'Notifications',
        close: 'Fermer',
        refresh: 'Actualiser',
        markRead: 'Marquer comme lues',
        countOne: '1 notification en attente',
        countMany: '{count} notifications en attente',
        countNone: 'Aucune notification',
        updatedAt: 'Actualisé à {time}',
        more: 'et {count} autre(s) — voir « Mes documents » et « Mes tâches »',
        allTasks: 'Mes tâches',
        allDocuments: 'Mes documents',
    },
    en: {
        open: 'Notifications',
        panel: 'Notifications',
        close: 'Close',
        refresh: 'Refresh',
        markRead: 'Mark as read',
        countOne: '1 pending notification',
        countMany: '{count} pending notifications',
        countNone: 'No notification',
        updatedAt: 'Updated at {time}',
        more: 'and {count} more — see "My documents" and "My tasks"',
        allTasks: 'My tasks',
        allDocuments: 'My documents',
    },
};

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]),
    );
}

/** @returns {string[]} the ids already seen, or `[]` when storage is unavailable */
function readSeen() {
    if (typeof window === 'undefined') {
        return [];
    }
    try {
        const raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
    }
    catch {
        // Private mode, quota, a corrupted value: novelty is a nicety, not data.
        return [];
    }
}

function writeSeen(ids) {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(ids.slice(0, SEEN_MAX)));
    }
    catch {
        // ignored on purpose — see readSeen()
    }
}

/** Fallback offset of the mobile sheet, used before anything can be measured. */
const SHEET_TOP_FALLBACK = 60;

/**
 * Where the mobile sheet starts: just under the real header.
 *
 * Measured rather than hard-coded because the header's height is not a constant —
 * the TEST banner adds a strip that wraps on a narrow screen, and the safe-area
 * inset adds more on a notched phone. A fixed `top` was right by luck while the
 * header carried a `backdrop-filter` (which made it the containing block); it is
 * not, now that the toolbar is opaque, and a sheet drawn over the toolbar would
 * hide the tenant badge that spec §4.3 requires to be always visible.
 *
 * @param {Element|null} node any node inside the header
 * @returns {number} distance from the top of the viewport, in px
 */
function sheetTopFor(node) {
    const header = node && node.closest ? node.closest('header') : null;
    if (!header) {
        return SHEET_TOP_FALLBACK;
    }
    return Math.max(0, Math.round(header.getBoundingClientRect().bottom)) + 4;
}

/** Focusable descendants of the panel, in tab order. */
function focusables(container) {
    if (!container) {
        return [];
    }
    return Array.from(
        container.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
    ).filter((node) => node.offsetParent !== null || node === document.activeElement);
}

/**
 * @param {Object} props
 * @param {number} [props.initialCount] count to show before the first fetch lands
 */
export function NotificationBell({ initialCount = 0, className = '' }) {
    const { lang } = useMessages();
    const local = LOCAL[lang] || LOCAL.fr;
    const words = notificationLabels(lang);
    const session = useSession();
    const pathname = usePathname();
    const reduceMotion = useReducedMotion();

    // The panel state carries the pathname it was opened on, so a navigation
    // closes it **during render** instead of in an effect — the pattern the shell
    // already uses for its drawer (`AppShell`). Closing on `pathname` rather than
    // only in the row's `onClick` is deliberate: the panel must also close for a
    // navigation it did not start (the nav rail, the back button, a redirect).
    const [panel, setPanel] = useState({ open: false, pathname });
    if (panel.pathname !== pathname) {
        setPanel({ open: false, pathname });
    }
    const open = panel.open;

    const buttonRef = useRef(null);
    const panelRef = useRef(null);
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    // The bell is part of the header, which also renders on public pages: no
    // session means no call, so an anonymous page cannot trigger a 401 storm.
    const enabled = Boolean(session.user) && !session.loading;

    // Seeded from the cross-mount cache — empty on the server and on a cold page
    // load, which is what makes it hydration-safe (see `cache`).
    const [state, setState] = useState(() => ({ data: readCache(), error: null }));
    const { data, error } = state;
    // Derived rather than stored: "nothing has landed yet" is exactly when the
    // skeleton belongs, and deriving it keeps `load` free of any synchronous
    // setState, so it can be called straight from an effect. Gated on `enabled`
    // so a page without a session shows a state instead of a forever-skeleton.
    const loading = enabled && !data && !error;
    const [busy, setBusy] = useState(false);
    const [sheetTop, setSheetTop] = useState(SHEET_TOP_FALLBACK);

    /**
     * Fetches, unless the cached payload is younger than `maxAge`.
     *
     * @param {number} [maxAge=0] ms; `0` forces the call
     * @param {Function} [onDone] called once the request settled, either way
     */
    const load = useCallback(
        (maxAge = 0, onDone) => {
            const done = () => {
                if (typeof onDone === 'function') {
                    onDone();
                }
            };
            if (!enabled || inFlight) {
                done();
                return;
            }
            if (maxAge > 0 && cache.data && Date.now() - cache.at < maxAge) {
                done();
                return;
            }
            inFlight = true;
            api.get('notifications', { params: { limit: PANEL_LIMIT } })
                .then((payload) => {
                    writeCache(payload);
                    if (alive.current) {
                        setState({ data: payload, error: null });
                    }
                })
                .catch((failure) => {
                    if (alive.current) {
                        setState((previous) => ({ data: previous.data, error: failure }));
                    }
                })
                .finally(() => {
                    inFlight = false;
                    if (alive.current) {
                        done();
                    }
                });
        },
        [enabled],
    );

    /** The refresh button: same call, plus the feedback a click deserves. */
    const forceReload = useCallback(() => {
        setBusy(true);
        load(0, () => setBusy(false));
    }, [load]);

    const items = useMemo(
        () => sortNewestFirst(data && Array.isArray(data.items) ? data.items : []),
        [data],
    );
    const counts = (data && data.counts) || {};
    const total = Number(counts.total) > 0 ? Number(counts.total) : 0;
    const badge = data ? total : Math.max(0, Number(initialCount) || 0);
    const hidden = Math.max(0, total - items.length);

    // Novelty is browser-only state, so it is read **lazily, from the click that
    // opens the panel** (see `toggle`) — never at mount and never in an effect.
    //
    // That timing is what keeps it out of hydration: `localStorage` does not exist
    // on the server, so a value read at mount would differ between the server
    // render and the client's first render. `null` means "not read yet", and
    // nothing outside the panel consumes it, so the first render can be identical
    // on both sides.
    const [seen, setSeen] = useState(null);

    const seenSet = useMemo(() => (seen === null ? null : new Set(seen)), [seen]);
    const isUnseen = (id) => Boolean(seenSet) && !seenSet.has(id);
    const newCount = seenSet
        ? items.reduce((count, item) => (seenSet.has(item.id) ? count : count + 1), 0)
        : 0;

    /** Everything currently listed becomes "already seen", newest ids first. */
    const markSeen = useCallback(() => {
        const previous = seen === null ? readSeen() : seen;
        const merged = [];
        const known = new Set();
        items.forEach((item) => {
            if (item.id && !known.has(item.id)) {
                known.add(item.id);
                merged.push(item.id);
            }
        });
        previous.forEach((id) => {
            if (!known.has(id)) {
                known.add(id);
                merged.push(id);
            }
        });
        const capped = merged.slice(0, SEEN_MAX);
        writeSeen(capped);
        setSeen(capped);
    }, [items, seen]);

    // -------------------------------------------------------------- refreshing
    // Mount — which is also every navigation, since the shell is per page. The
    // cache is what turns five clicks into one search.
    useEffect(() => {
        load(FRESH_FOR_MS);
    }, [load]);

    useEffect(() => {
        if (!enabled) {
            return undefined;
        }
        const timer = setInterval(() => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                return;
            }
            load(POLL_INTERVAL_MS);
        }, POLL_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [enabled, load]);

    useEffect(() => {
        if (!enabled) {
            return undefined;
        }
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                load(POLL_INTERVAL_MS);
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [enabled, load]);

    // ------------------------------------------------------- open / close / a11y
    const close = useCallback(
        (returnFocus = true) => {
            setPanel((previous) => ({ open: false, pathname: previous.pathname }));
            if (returnFocus && buttonRef.current) {
                buttonRef.current.focus();
            }
        },
        [],
    );

    const toggle = useCallback(() => {
        setPanel((previous) => ({ open: !previous.open, pathname: previous.pathname }));
        if (!open) {
            // Measured from the click, before the sheet is drawn: the header is
            // already laid out, and this keeps the measurement out of an effect.
            setSheetTop(sheetTopFor(buttonRef.current));
            load(FRESH_FOR_MS);
            if (seen === null) {
                // First open of this page: adopt the ids stored by the previous
                // visit, so only what arrived since then is marked as new.
                setSeen(readSeen());
            }
        }
    }, [open, seen, load]);

    // Focus goes into the panel on open, and stays trapped there until Escape or
    // an outside click. Tab wraps in both directions.
    useEffect(() => {
        if (!open) {
            return undefined;
        }
        const panel = panelRef.current;
        const first = focusables(panel)[0];
        if (first) {
            first.focus();
        }
        else if (panel) {
            panel.focus();
        }

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                close();
                return;
            }
            if (event.key !== 'Tab') {
                return;
            }
            const nodes = focusables(panelRef.current);
            if (nodes.length === 0) {
                event.preventDefault();
                return;
            }
            const firstNode = nodes[0];
            const lastNode = nodes[nodes.length - 1];
            const active = document.activeElement;
            if (!panelRef.current || !panelRef.current.contains(active)) {
                event.preventDefault();
                firstNode.focus();
                return;
            }
            if (event.shiftKey && active === firstNode) {
                event.preventDefault();
                lastNode.focus();
            }
            else if (!event.shiftKey && active === lastNode) {
                event.preventDefault();
                firstNode.focus();
            }
        };

        const onPointerDown = (event) => {
            if (
                panelRef.current &&
                !panelRef.current.contains(event.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target)
            ) {
                close(false);
            }
        };

        // The TEST banner wraps at some widths, so the header's height — and the
        // top of the mobile sheet — changes with the viewport.
        const onResize = () => setSheetTop(sheetTopFor(buttonRef.current));

        document.addEventListener('keydown', onKeyDown, true);
        document.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('resize', onResize);
        return () => {
            document.removeEventListener('keydown', onKeyDown, true);
            document.removeEventListener('pointerdown', onPointerDown, true);
            window.removeEventListener('resize', onResize);
        };
    }, [open, close]);

    const announcement =
        badge === 0 ? local.countNone : badge === 1 ? local.countOne : fill(local.countMany, { count: badge });

    return (
        <div className={`relative ${className}`}>
            {/* `toolbar-item` re-colours the trigger on the blue beCPG toolbar
                (globals.css); the light-surface classes stay as the fallback for
                any other surface. */}
            <button
                ref={buttonRef}
                type="button"
                onClick={toggle}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={`${local.open} — ${announcement}`}
                className="toolbar-item relative inline-flex touch-target items-center justify-center rounded-lg p-2 text-[var(--becpg-blue)] hover:bg-[var(--becpg-grey)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
            >
                <Icon name={badge > 0 ? 'notifications_active' : 'notifications_none'} size={20} />
                {badge > 0 ? (
                    /*
                     * `--becpg-orange-deep`, not `--becpg-orange`: this chip
                     * carries a 10px *number*, so 1.4.3 asks 4.5:1, and white on
                     * the brand orange measures **2.95:1** — the count was below
                     * AA. The deep shade is the same hue on the same axis and
                     * measures **4.83:1**. `Button` made exactly this swap for
                     * its `accent` variant, for exactly this reason.
                     *
                     * The white ring is the chip's own boundary: the badge is
                     * drawn on the blue toolbar, where orange-deep against
                     * `--becpg-blue` is only 2.28:1. White is 11.01:1 on the
                     * toolbar and 4.83:1 on the chip, so the outline separates
                     * it from both. On the light fallback surface the ring
                     * disappears and the chip's own 4.83:1 carries it.
                     */
                    <span
                        aria-hidden="true"
                        className="absolute right-0.5 top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--becpg-orange-deep)] px-1 text-[10px] font-medium text-white ring-2 ring-white"
                    >
                        {badge > 99 ? '99+' : badge}
                    </span>
                ) : null}
            </button>

            {/* The count is spoken here, not read off the badge. */}
            <span className="sr-only-text" role="status" aria-live="polite">
                {announcement}
            </span>

            <AnimatePresence>
                {open ? (
                    <motion.div
                        ref={panelRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label={local.panel}
                        tabIndex={-1}
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                        transition={{ duration: reduceMotion ? 0 : 0.16 }}
                        style={{ '--sheet-top': `${sheetTop}px` }}
                        className={[
                            // Mobile first: a sheet pinned under the header, edge to
                            // edge. Above sm it becomes a dropdown anchored on the bell.
                            'fixed left-2 right-2 top-[var(--sheet-top)] z-[60] flex max-h-[70dvh] flex-col overflow-hidden',
                            // `.becpg-popover` (globals.css) is what makes this a
                            // surface instead of a white rectangle on a white page:
                            // its own dark foreground — the panel is a DOM child of
                            // `.becpg-toolbar` and inherited its WHITE text, so the
                            // title and every notification title were 1.00:1 — a
                            // 4.67:1 border, and the theme's overlay shadow.
                            'becpg-popover rounded-xl',
                            'sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-1 sm:w-[22rem] sm:max-h-[32rem]',
                        ].join(' ')}
                    >
                        <div className="becpg-popover-band flex items-center gap-2 border-b border-[var(--becpg-overlay-border)] px-3 py-2">
                            <Icon name="notifications" size={18} className="text-[var(--becpg-blue)]" />
                            <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--becpg-blue)]">
                                {local.panel}
                            </h2>
                            {newCount > 0 ? (
                                <button
                                    type="button"
                                    onClick={markSeen}
                                    className="rounded-lg border border-[var(--becpg-overlay-border)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--becpg-blue)] hover:bg-[var(--becpg-blue-lighter)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                                >
                                    {local.markRead}
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={forceReload}
                                aria-label={local.refresh}
                                title={local.refresh}
                                disabled={busy}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--becpg-dark-grey-deep)] hover:bg-[var(--background)] hover:text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] disabled:opacity-50"
                            >
                                <Icon name="refresh" size={18} className={busy ? 'animate-spin' : ''} />
                            </button>
                            <button
                                type="button"
                                onClick={() => close()}
                                aria-label={local.close}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--becpg-dark-grey-deep)] hover:bg-[var(--background)] hover:text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] sm:hidden"
                            >
                                <Icon name="close" size={18} />
                            </button>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto p-2">
                            {loading ? (
                                <SkeletonList rows={3} withAvatar />
                            ) : error ? (
                                <ErrorState error={error} onRetry={forceReload} compact />
                            ) : items.length === 0 ? (
                                // An empty popover is the bug being reported: say it.
                                <EmptyState
                                    variant="success"
                                    compact
                                    title={words.empty}
                                    message={words.emptyHint}
                                />
                            ) : (
                                /* `.becpg-popover-list` draws the hairline between
                                   rows — without it twenty notifications are one
                                   undifferentiated white block inside a white
                                   panel, which is the second half of "blanc sur
                                   blanc". Share separates datagrid rows the same
                                   way, and with nothing else. */
                                <ul className="becpg-popover-list flex flex-col">
                                    {items.map((item) => (
                                        <li key={item.id}>
                                            <NotificationRow
                                                item={item}
                                                lang={lang}
                                                local={words}
                                                unseen={isUnseen(item.id)}
                                                onNavigate={() => {
                                                    markSeen();
                                                    close(false);
                                                }}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="becpg-popover-band flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--becpg-overlay-border)] px-3 py-2 text-xs text-[var(--becpg-dark-grey-deep)]">
                            {hidden > 0 ? (
                                <span className="basis-full">{fill(local.more, { count: hidden })}</span>
                            ) : null}
                            <Link
                                href="/tasks"
                                onClick={() => close(false)}
                                className="rounded text-[var(--becpg-blue)] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                            >
                                {local.allTasks}
                            </Link>
                            <Link
                                href="/documents"
                                onClick={() => close(false)}
                                className="rounded text-[var(--becpg-blue)] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                            >
                                {local.allDocuments}
                            </Link>
                            {data && data.generatedAt ? (
                                <span className="ml-auto">
                                    {fill(local.updatedAt, { time: formatTime(data.generatedAt, lang) })}
                                </span>
                            ) : null}
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
