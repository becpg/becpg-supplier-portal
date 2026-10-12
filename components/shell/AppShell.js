'use client';

/**
 * The application frame every authenticated page renders inside.
 *
 * Layout, mobile first:
 *
 * ```
 *  phone (< lg)                       desktop (>= lg)
 *  ┌──────────────────────┐           ┌──────────────────────────────────┐
 *  │ TEST banner          │           │ TEST banner                      │
 *  │ Header (tenant,menu) │           │ Header (tenant, title, user)      │
 *  ├──────────────────────┤           ├────────────┬─────────────────────┤
 *  │                      │           │  sidebar   │                     │
 *  │       content        │           │   Nav      │      content        │
 *  │                      │           │            │                     │
 *  ├──────────────────────┤           └────────────┴─────────────────────┘
 *  │ bottom Nav (4 + Plus)│
 *  └──────────────────────┘
 * ```
 *
 * The bottom bar is what makes the portal one-hand usable; the drawer (opened
 * from the header button or from "Plus") carries the secondary destinations.
 * Content reserves room for the bar with `.has-bottom-nav`, so a sticky wizard
 * action bar never lands underneath it.
 *
 * Page transitions are a 180 ms fade keyed on the pathname — enough to make a
 * navigation feel intentional, short enough never to be in the way. Everything
 * collapses to nothing under `prefers-reduced-motion`.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Header } from '@/components/shell/Header';
import { Nav } from '@/components/shell/Nav';
import { useSession } from '@/components/providers/SessionProvider';
import { publishBadges, readBadges, serverBadges, subscribeBadges } from '@/lib/badges';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tooltip } from '@/components/ui/Tooltip';

/** The sidebar's fold, remembered for the browser. */
const NAV_COLLAPSED_KEY = 'becpg.portal.nav.collapsed';

/** Dispatched on the window so every mounted shell follows the same fold. */
const NAV_COLLAPSED_EVENT = 'portalnavcollapsed';

/** Badge scope key of « Tous les fournisseurs ». */
const ALL_SUPPLIERS_SCOPE = 'all';

/**
 * The supplier scope the nav counters are computed for.
 *
 * @param {Object} session the `useSession()` value
 * @returns {string|null} `'all'`, the scoped supplier nodeRef, or `null` while unknown
 */
function badgeScopeOf(session) {
    if (session.scopeAll) {
        return ALL_SUPPLIERS_SCOPE;
    }
    return session.scopedSupplier?.nodeRef ?? null;
}

/** Where the preference lives when there is no storage — a private window. */
let navCollapsedFallback = false;

function subscribeNavCollapsed(onChange) {
    window.addEventListener(NAV_COLLAPSED_EVENT, onChange);
    // Another tab folded its rail: this one follows, as it does for the language.
    window.addEventListener('storage', onChange);
    return () => {
        window.removeEventListener(NAV_COLLAPSED_EVENT, onChange);
        window.removeEventListener('storage', onChange);
    };
}

function readNavCollapsed() {
    try {
        return window.localStorage.getItem(NAV_COLLAPSED_KEY) === '1';
    }
    catch {
        return navCollapsedFallback;
    }
}

/*
 * The server knows nothing of a browser preference, and says so.
 *
 * This is the whole reason the fold is an external store rather than a
 * `useState` seeded from `localStorage`, as the wizard's own folds are:
 * `AppShell` frames every server-rendered page, so a first client render that
 * disagreed with the HTML Next.js sent would be a hydration mismatch on the
 * entire application. `useSyncExternalStore` is what makes the two agree — the
 * same mechanism `lib/badges.js` uses for the nav counters.
 */
const serverNavCollapsed = () => false;

function setNavCollapsed(next) {
    navCollapsedFallback = next;
    try {
        window.localStorage.setItem(NAV_COLLAPSED_KEY, next ? '1' : '0');
    }
    catch {
        // No storage: the fold still works, it just does not survive the reload.
    }
    window.dispatchEvent(new Event(NAV_COLLAPSED_EVENT));
}

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children page content
 * @param {React.ReactNode} [props.title] page title, shown in the header
 * @param {boolean} [props.ownHeading] the content draws its own `<h1>`; otherwise the
 *        shell provides one from `title`, so every page has exactly one
 * @param {boolean} [props.showTitle] the shell's `<h1>` is shown at the top of the
 *        content instead of in the header bar — the list pages, so they all open
 *        the same way
 * @param {React.ReactNode} [props.subtitle] rendered above the content
 * @param {React.ReactNode} [props.actions] page actions in the header
 * @param {React.ReactNode} [props.headerStatus] a StatusPill (approval status) in the header
 * @param {React.ReactNode} [props.breadcrumb] rendered above the title
 * @param {React.ReactNode} [props.aside] permanent side panel (the wizard's "Étape 0 · Contexte")
 * @param {'supplier'|'monitor'} [props.space] overrides the session's space
 * @param {Object} [props.badges] nav counters, `{ tasks: 3, documents: 1 }`
 * @param {number} [props.notificationCount]
 * @param {boolean} [props.hideNav] full-bleed layout (signature viewer, print view)
 * @param {boolean} [props.fullWidth] the content column spans the whole window
 * @param {boolean} [props.noPadding] content owns its own padding
 *
 * ## Which screens are `fullWidth`, and why
 *
 * The application frame — header, rail, content column — is **always** the
 * width of the window. What is capped is the content *column*, by
 * `.page-container` at `--portal-max-width`, and `fullWidth` is the opt-out.
 * One rule decides:
 *
 * > **A screen whose content is a grid goes full width. A screen whose content
 * > is read or filled in keeps the cap.**
 *
 * Full width — `/products`, `/products/[id]`, `/documents`, `/tasks`, `/specs`
 * and everything under `/monitor`: their value is the number of columns and
 * rows visible at once. A supplier comparing eleven ingredient columns, a
 * quality manager reading a supplier × document-type matrix, gain a column for
 * every 120px. Nothing on those screens is a paragraph.
 *
 * Capped — the dashboard, `/company`, `/help`, `/messages`, every wizard step
 * and `/login`: cards, forms, prose and a conversation. A 1900px line of text
 * is not a fix, it is a different defect (≈220 characters per line against the
 * 45–90 typographic norm), and a two-column form grid stretched to 1900px puts
 * a label 900px from its value.
 */
export function AppShell({
    children,
    title,
    subtitle,
    actions,
    headerStatus,
    breadcrumb,
    aside,
    space,
    badges = {},
    notificationCount = 0,
    hideNav = false,
    fullWidth = false,
    noPadding = false,
    ownHeading = false,
    showTitle = false,
    className = '',
}) {
    const pathname = usePathname();
    const session = useSession();
    const reduceMotion = useReducedMotion();
    // The drawer state carries the pathname it was opened on, so a navigation
    // closes it during render instead of in an effect (an effect would paint the
    // new page with the drawer still over it for one frame).
    const [drawer, setDrawer] = useState({ open: false, pathname });
    if (drawer.pathname !== pathname) {
        setDrawer({ open: false, pathname });
    }
    const drawerOpen = drawer.open;
    const setDrawerOpen = (open) => setDrawer({ open, pathname });

    const resolvedSpace = space || session.space || 'supplier';
    const navCollapsed = useSyncExternalStore(
        subscribeNavCollapsed, readNavCollapsed, serverNavCollapsed,
    );
    const toggleNavCollapsed = useCallback(() => setNavCollapsed(!readNavCollapsed()), []);

    /*
     * THE NAV COUNTERS SURVIVE A CHANGE OF SCREEN.
     *
     * Each page only passes what it knows how to count — the dashboard all
     * three, `/tasks` the tasks alone, `/products` nothing — so the menu showed
     * exactly what the current page handed it: leaving the dashboard wiped the
     * task and discussion counters.
     *
     * They are now memorised for the tab (see `lib/badges.js`) and completed
     * here. The page still wins on what it asserts: its figures are those of the
     * screen being looked at, hence the freshest. Making every page recompute
     * the others would cost, for a single "3", the entity sweep the discussion
     * counter requires.
     */
    const storedBadges = useSyncExternalStore(subscribeBadges, readBadges, serverBadges);
    const badgeKey = JSON.stringify(badges);
    const currentUser = session.user ? (session.user.username || session.user.sub || null) : null;
    // A counter belongs to the supplier scope it was computed for: switching the
    // top-bar supplier drops the others' figures instead of showing them as ours.
    const currentScope = badgeScopeOf(session);
    useEffect(() => {
        publishBadges(JSON.parse(badgeKey), { user: currentUser, scope: currentScope });
        // `badges` is a literal recreated on every render: it is its value, not
        // its identity, that must trigger the publication — hence the serialised
        // key, which serves both as the dependency and as the source.
    }, [badgeKey, currentUser, currentScope]);
    const mergedBadges = { ...storedBadges, ...badges };

    return (
        <div className="flex min-h-dvh flex-col bg-[var(--becpg-grey)]/30">
            <Header
                title={showTitle || ownHeading ? null : title}
                space={resolvedSpace}
                actions={actions}
                status={headerStatus}
                notificationCount={notificationCount}
            />

            {/*
                The FRAME is the window. It used to carry
                `max-w-[var(--portal-max-width)]` as well, which capped the
                sidebar *and* the content together: at 1920 the whole
                application sat in a 1400px column with 260px of dead white on
                each side and a navigation rail floating in the middle of the
                screen rather than against its edge. Measured before / after,
                on every screen: 1920 → gutters 260px/260px, now 0/0;
                1600 → 100/100, now 0/0.

                The readable cap did not disappear, it moved to where it belongs
                — `.page-container`, i.e. the *text column*, which is what a
                maximum width is for. A page whose content is a grid opts out
                with `fullWidth`; see the prop's doc above.
            */}
            <div className="flex w-full flex-1">
                {/* The sidebar sticks under the 3.5rem header; the TEST banner
                    scrolls away with the page, which is fine — it is part of the
                    header, which is itself sticky. */}
                {hideNav ? null : (
                    /* Unfolded: `w-64`, the reference `Layout.js` rail width. It
                       was `w-60`, which leaves the label 157px: "Conformité
                       documentaire" needs 165 and was the one nav entry rendering
                       ellipsised at 1440. Folded: `3.25rem`, the same 52px column
                       the wizard's step rail folds to — one width for "a rail
                       reduced to its icons" across the portal.
                       `z-40`: a folded entry draws its label over the content,
                       and the animated cards there stack above a sticky rail
                       that declares no level. Below the header, which is `z-50`. */
                    <aside
                        className={[
                            'hidden shrink-0 border-e border-[var(--becpg-grey)] bg-white',
                            'lg:block lg:sticky lg:top-14 lg:z-40 lg:h-[calc(100dvh-3.5rem)]',
                            navCollapsed ? 'w-[3.25rem]' : 'w-64',
                            reduceMotion ? '' : 'transition-[width] duration-200 ease-out',
                        ].filter(Boolean).join(' ')}
                    >
                        {session.loading ? (
                            <div className="flex flex-col gap-2 p-3">
                                {Array.from({ length: 6 }, (_, index) => (
                                    <Skeleton key={index} height={40} radius="0.5rem" />
                                ))}
                            </div>
                        ) : (
                            <Nav
                                variant="sidebar"
                                space={resolvedSpace}
                                badges={mergedBadges}
                                collapsed={navCollapsed}
                                onToggleCollapsed={toggleNavCollapsed}
                            />
                        )}
                    </aside>
                )}

                <main
                    className={[
                        'min-w-0 flex-1',
                        hideNav ? '' : 'has-bottom-nav lg:pb-0',
                        className,
                    ]
                        .filter(Boolean)
                        .join(' ')}
                >
                    <motion.div
                        key={pathname}
                        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
                        className={noPadding ? '' : 'page-container'}
                        // Not `max-w-none`: `.page-container` is unlayered CSS
                        // and beats any Tailwind utility, so the class did
                        // nothing. See the rule in globals.css.
                        data-full={!noPadding && fullWidth ? 'true' : undefined}
                    >
                        {!ownHeading && title ? (
                            <h1 className={showTitle ? 'mb-4 text-xl font-medium leading-tight text-[var(--becpg-ink)]' : 'sr-only'}>
                                {title}
                            </h1>
                        ) : null}
                        {breadcrumb ? <div className="mb-2 text-xs">{breadcrumb}</div> : null}
                        {subtitle ? (
                            <p className="mb-3 text-sm text-[var(--becpg-dark-grey)]">{subtitle}</p>
                        ) : null}
                        {aside ? (
                            <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
                                <div className="min-w-0">{children}</div>
                                <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">{aside}</div>
                            </div>
                        ) : (
                            children
                        )}
                    </motion.div>
                </main>
            </div>

            {hideNav ? null : (
                <>
                    <Nav
                        variant="bottom"
                        space={resolvedSpace}
                        badges={mergedBadges}
                        onOpenMore={() => setDrawerOpen(true)}
                    />
                    <Nav
                        variant="drawer"
                        space={resolvedSpace}
                        badges={mergedBadges}
                        open={drawerOpen}
                        onClose={() => setDrawerOpen(false)}
                    />
                </>
            )}
        </div>
    );
}

/**
 * Page header used *inside* the content column, when a screen needs a title row
 * with actions that must not live in the app header (list filters, exports).
 *
 * What the screen is for goes in a help bubble beside the title, not in a
 * sentence under it: read once, it is noise on every later visit.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.description] the help bubble's content
 * @param {React.ReactNode} [props.meta] facts that identify the record — a code,
 *        a state — shown under the title, unlike the description
 * @param {React.ReactNode} [props.actions]
 */
export function PageHeader({ title, description, meta, actions, className = '' }) {
    return (
        <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 ${className}`}>
            <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                    <h1 className="truncate text-xl font-medium leading-tight text-[var(--becpg-ink)]">{title}</h1>
                    {description ? (
                        <Tooltip
                            content={description}
                            label={typeof title === 'string' ? title : undefined}
                            placement="bottom"
                        />
                    ) : null}
                </div>
                {meta ? <div className="mt-1 text-sm text-[var(--becpg-dark-grey)]">{meta}</div> : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    );
}
