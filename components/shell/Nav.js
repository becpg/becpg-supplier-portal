'use client';

/**
 * Navigation — three renderings of one item list.
 *
 * The list itself is chosen by the user's **space**, which `/api/v1/session`
 * derives from the beCPG groups (`ExternalUser` → supplier, `QualityMgr` /
 * `PurchasingMgr` / `ReferencingMgr` → monitoring, spec §4.2). A user who has
 * both gets a space switcher in the drawer.
 *
 * Renderings:
 *
 *  - `variant="sidebar"` — the desktop rail, `lg` and up.
 *  - `variant="bottom"`  — the phone bar. **Four primary destinations + "Plus"**,
 *    fixed at the bottom of the viewport, inside the safe area. A bottom bar
 *    rather than a hamburger because the spec requires one-handed use: on a
 *    6" phone the top-left corner is unreachable with a thumb, the bottom edge
 *    is where the thumb already rests.
 *  - `variant="drawer"` — the full list, opened by "Plus" or by the header
 *    button; it slides from the left and is the only place secondary items live
 *    on a phone.
 *
 * Every item carries a `badgeKey`; the shell feeds counts in through `badges`
 * (`{ tasks: 3 }`), which is how "Mes tâches" shows the number of open actions
 * without this file knowing anything about the API.
 *
 * ## Visual language
 *
 * The rail speaks the range's language, not its own: Material Icons (the single
 * icon set the root layout links, exactly as `becpg-regulatory-ui` does) and an
 * active state built from `--becpg-blue` + `--becpg-orange`. The item classes
 * live in globals.css (`.nav-item`, `.nav-item-active`) so the sidebar and the
 * drawer cannot drift apart, and so the contrast reasoning sits next to the
 * colours it is about.
 */

import { useCallback, useEffect, useRef } from 'react';
import { withBasePath } from '@/lib/basePath';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon, IconButton } from '@/components/ui/Button';
import { TenantBadge } from '@/components/shell/TenantBadge';
import { useSession } from '@/components/providers/SessionProvider';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

/**
 * Supplier space (spec §4.2). `primary` items are the four shown in the phone
 * bottom bar; the rest live in the drawer and in the desktop sidebar.
 */
export const SUPPLIER_NAV = Object.freeze([
    { id: 'dashboard', href: '/', labelKey: 'nav.dashboard', icon: 'dashboard', exact: true, primary: true },
    { id: 'tasks', href: '/tasks', labelKey: 'nav.tasks', icon: 'assignment_turned_in', primary: true, badgeKey: 'tasks' },
    { id: 'products', href: '/products', labelKey: 'nav.products', icon: 'inventory_2', primary: true },
    { id: 'documents', href: '/documents', labelKey: 'nav.documents', icon: 'folder_shared', primary: true, badgeKey: 'documents' },
    { id: 'company', href: '/company', labelKey: 'nav.company', icon: 'business' },
    { id: 'specs', href: '/specs', labelKey: 'nav.specs', icon: 'menu_book' },
    { id: 'messages', href: '/messages', labelKey: 'nav.messages', icon: 'forum', badgeKey: 'messages' },
    // `/help` is spec §4.2's last supplier screen and now exists (`app/help/`).
    // It is the *reference* material — the wizard keeps its own in-context
    // `HelpPanel` for "what does my customer expect on this sheet".
    { id: 'help', href: '/help', labelKey: 'nav.help', icon: 'help_outline', secondary: true },
]);

/** Monitoring space (spec §4.6). */
export const MONITOR_NAV = Object.freeze([
    { id: 'monitor', href: '/monitor', labelKey: 'nav.monitor', icon: 'insights', exact: true, primary: true },
    // The monitoring space has tasks too. A referencing ends with an internal
    // validation: the account that carries it receives a « Validation » task
    // (SupplierPortalInitRepoVisitor creates it on GROUP_QualityMgr), and that is
    // where it re-reads the input, validates the lists and the documents, fixes a
    // typo and talks to the supplier. Without this entry, `/tasks` existed and
    // answered — measured on the local instance, `/api/v1/tasks` does serve an
    // internal account — and was reachable through no link at all.
    { id: 'monitor-tasks', href: '/tasks', labelKey: 'nav.monitor.tasks', icon: 'assignment_turned_in', primary: true, badgeKey: 'tasks' },
    { id: 'suppliers', href: '/monitor/suppliers', labelKey: 'nav.monitor.suppliers', icon: 'groups', primary: true },
    // The park seen from the products rather than from the suppliers: what is
    // due for renewal (#35846). Same population, the other axis.
    { id: 'monitor-products', href: '/monitor/products', labelKey: 'nav.monitor.products', icon: 'inventory_2' },
    { id: 'monitor-documents', href: '/monitor/documents', labelKey: 'nav.monitor.documents', icon: 'fact_check' },
    { id: 'campaigns', href: '/monitor/campaigns', labelKey: 'nav.monitor.campaigns', icon: 'campaign', primary: true },
    { id: 'quality', href: '/monitor/quality', labelKey: 'nav.monitor.quality', icon: 'report_problem', badgeKey: 'nc' },
    // No `reports` entry. `/monitor/reports` had no route under `app/`, so the
    // item 404'd — and it is not an oversight waiting to be filled: historical
    // series need the OLAP cube, which is exactly why every monitoring payload
    // carries `history: { available: false }` (spec §4.6.6). A nav item
    // promising reports the repository cannot produce is worse than no item.
    // The `nav.monitor.reports` message key stays in config/messages.js for
    // whoever builds that screen.
    //
    // `/help` is shared with the supplier space on purpose: a referencing
    // officer entering data on behalf of a supplier (spec §4.4, "saisie
    // déléguée") needs the same reference material, never a second copy of it.
    { id: 'monitor-help', href: '/help', labelKey: 'nav.help', icon: 'help_outline', secondary: true },
]);

/** Chrome strings that are pure navigation mechanics, not portal vocabulary. */
const LOCAL_LABELS = defineLabels('components/shell/Nav#LOCAL_LABELS', {
    fr: {
        more: 'Plus', menu: 'Menu', close: 'Fermer le menu',
        supplierSpace: 'Espace fournisseur', monitorSpace: 'Espace pilotage',
        collapse: 'Replier le menu', expand: 'Déplier le menu',
    },
    en: {
        more: 'More', menu: 'Menu', close: 'Close menu',
        supplierSpace: 'Supplier space', monitorSpace: 'Monitoring space',
        collapse: 'Collapse the menu', expand: 'Expand the menu',
    },
});

/**
 * Items for a space.
 *
 * @param {'supplier'|'monitor'|'unknown'} space
 * @returns {Array<Object>}
 */
export function navItemsForSpace(space) {
    return space === 'monitor' ? MONITOR_NAV : SUPPLIER_NAV;
}

/**
 * Is `href` the active route?
 *
 * @param {string} pathname current pathname (tenant prefix already stripped)
 * @param {Object} item nav item
 * @returns {boolean}
 */
export function isActive(pathname, item) {
    if (!pathname) {
        return false;
    }
    if (item.exact) {
        return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Strips the `/t/<tenant>` prefix so the active test works on both URL shapes. */
function appPath(pathname) {
    return (pathname || '/').replace(/^\/t\/[^/]+/, '') || '/';
}

/**
 * The counter chip.
 *
 * Contrast, measured — the digits *are* the payload, so they carry the burden:
 *   `accent`  #ffffff on `--becpg-blue`, ringed `--becpg-orange` .. 11.0:1 ✓
 *   `onBlue`  `--becpg-blue` on #ffffff, ringed `--becpg-orange` .. 11.0:1 ✓
 *
 * The chip used to be white on `--becpg-orange`: 2.95:1, i.e. a number nobody
 * with low vision can read at 11px. The orange moved to the ring — a non-text
 * element, where 3:1 is the bar and where it still reads as the alert accent.
 *
 * @param {Object} props
 * @param {number} [props.count]
 * @param {'accent'|'onBlue'|'muted'} [props.tone='accent'] `onBlue` for a blue surface
 */
function Badge({ count, tone = 'accent' }) {
    if (!count) {
        return null;
    }
    const TONES = {
        accent: 'bg-[var(--becpg-blue)] text-white ring-1 ring-[var(--becpg-orange)]',
        onBlue: 'bg-white text-[var(--becpg-blue)] ring-1 ring-[var(--becpg-orange)]',
        muted: 'bg-[var(--becpg-grey)] text-[var(--becpg-blue)]',
    };
    return (
        <span
            className={[
                'ms-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full leading-none px-1.5 text-[11px] font-semibold tabular-nums',
                TONES[tone] || TONES.accent,
            ].join(' ')}
        >
            {count > 99 ? '99+' : count}
        </span>
    );
}

/**
 * The label of a folded sidebar entry, on hover **and on keyboard focus**.
 *
 * `title` alone would leave a keyboard user with nothing — a native tooltip
 * never opens on focus — and a rail folded to its icons is exactly where the
 * label cannot be read off the item. `aria-hidden`, because the link already
 * carries the same words as its accessible name and a screen reader must not
 * hear them twice.
 *
 * @param {Object} props
 * @param {string} props.label
 */
function NavFlyout({ label }) {
    return (
        <span
            aria-hidden="true"
            className="pointer-events-none absolute start-full top-1/2 z-50 ms-2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-[var(--becpg-grey)] bg-white px-2 py-1 text-xs font-normal text-[var(--becpg-blue)] shadow-[var(--becpg-shadow-overlay)] group-hover:block group-focus-visible:block"
        >
            {label}
        </span>
    );
}

/**
 * The counter of a folded entry: there is no room for the chip, so it rides the
 * corner of the icon. The figure is also in the link's accessible name — this
 * mark is emphasis, never the only carrier.
 *
 * @param {Object} props
 * @param {number} [props.count]
 */
function CollapsedBadge({ count }) {
    if (!count) {
        return null;
    }
    return (
        <span
            aria-hidden="true"
            className="absolute end-0.5 top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--becpg-blue)] px-1 text-[10px] font-semibold leading-none text-white ring-1 ring-[var(--becpg-orange)]"
        >
            {count > 9 ? '9+' : count}
        </span>
    );
}

/** What Tab may land on inside the drawer — the same list `ui/Modal` traps on. */
const FOCUSABLE =
    'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * The open drawer is a modal dialog, with the behaviour `ui/Modal` gives one:
 * focus moved in on open and kept inside, the page behind it frozen, focus
 * handed back to the button that opened it. It does not render through Modal
 * because Modal is a bottom sheet / centred panel, and this is a side drawer.
 *
 * @param {boolean} active
 * @returns {{panelRef: React.RefObject, onKeyDown: Function}}
 */
function useModalDrawer(active) {
    const panelRef = useRef(null);

    useEffect(() => {
        if (!active) {
            return undefined;
        }
        const opener = document.activeElement;
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';
        const frame = requestAnimationFrame(() => {
            const panel = panelRef.current;
            if (panel) {
                (panel.querySelector(FOCUSABLE) || panel).focus();
            }
        });
        return () => {
            cancelAnimationFrame(frame);
            document.body.style.overflow = overflow;
            if (opener && typeof opener.focus === 'function') {
                opener.focus();
            }
        };
    }, [active]);

    const onKeyDown = useCallback((event) => {
        const panel = panelRef.current;
        if (event.key !== 'Tab' || !panel) {
            return;
        }
        const nodes = Array.from(panel.querySelectorAll(FOCUSABLE)).filter((node) => node.offsetParent !== null);
        if (nodes.length === 0) {
            event.preventDefault();
            panel.focus();
            return;
        }
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        }
        else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }, []);

    return { panelRef, onKeyDown };
}

/**
 * @param {Object} props
 * @param {'sidebar'|'bottom'|'drawer'} [props.variant='sidebar']
 * @param {'supplier'|'monitor'|'unknown'} [props.space] overrides the session's space
 * @param {Array<Object>} [props.items] overrides the item list entirely
 * @param {Object} [props.badges] counts keyed by `badgeKey` (`{ tasks: 3 }`)
 * @param {boolean} [props.collapsed=false] sidebar folded to its icons
 * @param {Function} [props.onToggleCollapsed] sidebar only; the fold button is
 *   drawn only when a caller owns that state
 * @param {boolean} [props.open] drawer only
 * @param {Function} [props.onClose] drawer / bottom-bar "Plus"
 * @param {Function} [props.onOpenMore] bottom bar only: called by the "Plus" button
 */
export function Nav({
    variant = 'sidebar',
    space,
    items,
    badges = {},
    collapsed = false,
    onToggleCollapsed,
    open = false,
    onClose,
    onOpenMore,
    className = '',
}) {
    const { t, lang } = useMessages();
    const pathname = appPath(usePathname());
    const session = useSession();
    const reduceMotion = useReducedMotion();
    const local = pickLabels(LOCAL_LABELS, lang);

    const resolvedSpace = space || session.space || 'supplier';
    const list = items || navItemsForSpace(resolvedSpace);
    const canSwitchSpace =
        !items && session.capabilities && session.capabilities.canMonitor && session.capabilities.isExternalUser;

    // Escape closes the drawer.
    useEffect(() => {
        if (variant !== 'drawer' || !open) {
            return undefined;
        }
        const onKeyDown = (event) => {
            if (event.key === 'Escape' && onClose) {
                onClose();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [variant, open, onClose]);

    const { panelRef: drawerRef, onKeyDown: onDrawerKeyDown } = useModalDrawer(variant === 'drawer' && open);

    // ---------------------------------------------------------------- sidebar
    if (variant === 'sidebar') {
        const foldLabel = collapsed ? local.expand : local.collapse;
        return (
            <nav
                aria-label={local.menu}
                /*
                 * `overflow-y-auto` is dropped once folded: `overflow-y` clips
                 * horizontally too, and a folded entry's label flyout is drawn
                 * outside the 52px column — it would show as a sliver. Seven
                 * entries of 40px never need to scroll anyway.
                 */
                className={[
                    'flex h-full flex-col gap-1',
                    collapsed ? 'overflow-visible px-1.5 py-3' : 'overflow-y-auto p-3',
                    className,
                ].filter(Boolean).join(' ')}
            >
                {/*
                  * The fold control sits above the entries, where every
                  * application that folds a sidebar puts it: someone looking for
                  * it looks at the top of the panel. Under the entries it was
                  * found by accident, or not at all.
                  *
                  * AN ICON, NOT AN ENTRY. Given the entries' own styling — same
                  * row, same size, same words — it read as an eighth destination
                  * called « Replier le menu », between the logo and « Pilotage ».
                  * It is chrome, not navigation: a 32px target carrying the
                  * chevron alone, pushed to the edge the panel folds towards, and
                  * its sentence in `title` / `aria-label` where it costs no
                  * pixel and no confusion.
                  */}
                {onToggleCollapsed ? (
                    <div className={collapsed ? 'flex justify-center' : 'flex justify-end'}>
                        <button
                            type="button"
                            onClick={onToggleCollapsed}
                            aria-expanded={!collapsed}
                            aria-label={foldLabel}
                            title={foldLabel}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--becpg-dark-grey-deep)] hover:bg-[var(--becpg-grey)] hover:text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                        >
                            <Icon name={collapsed ? 'chevron_right' : 'chevron_left'} size={20} />
                        </button>
                    </div>
                ) : null}

                {list.map((item) => {
                    const active = isActive(pathname, item);
                    const label = t(item.labelKey);
                    const count = badges[item.badgeKey];
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            // Folded, the words leave the screen but not the
                            // accessible name — the count included, since the
                            // corner mark is `aria-hidden`.
                            aria-label={collapsed ? (count ? `${label} (${count})` : label) : undefined}
                            title={collapsed ? label : undefined}
                            className={[
                                'nav-item group',
                                collapsed ? 'nav-item-collapsed' : '',
                                active ? 'nav-item-active' : '',
                            ].filter(Boolean).join(' ')}
                        >
                            <Icon name={item.icon} size={20} className="nav-item-icon" />
                            {collapsed ? null : <span className="truncate">{label}</span>}
                            {collapsed
                                ? <CollapsedBadge count={count} />
                                : <Badge count={count} tone={active ? 'onBlue' : 'accent'} />}
                            {collapsed ? <NavFlyout label={label} /> : null}
                        </Link>
                    );
                })}

                {canSwitchSpace ? (
                    <div className="mt-auto flex flex-col gap-1 pt-2">
                        <SpaceSwitch space={resolvedSpace} local={local} collapsed={collapsed} />
                    </div>
                ) : null}
            </nav>
        );
    }

    // ------------------------------------------------------------- bottom bar
    if (variant === 'bottom') {
        const primary = list.filter((item) => item.primary).slice(0, 4);
        const hasMore = list.length > primary.length;
        return (
            <nav
                aria-label={local.menu}
                className={`safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-[var(--becpg-grey)] bg-white/95 backdrop-blur lg:hidden ${className}`}
            >
                <ul className="flex items-stretch justify-around">
                    {primary.map((item) => {
                        const active = isActive(pathname, item);
                        return (
                            <li key={item.id} className="min-w-0 flex-1">
                                <Link
                                    href={item.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={[
                                        // `min-w-0` on both the item and the label:
                                        // without it "Mes documents" pushes "Plus"
                                        // past the right edge on a 360px screen.
                                        // A long label wraps to two lines rather
                                        // than being cut to "Mes docum…".
                                        'relative flex h-full min-h-[64px] min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px]',
                                        active
                                            ? 'font-medium text-[var(--becpg-blue)]'
                                            : 'text-[var(--becpg-dark-grey)]',
                                    ].join(' ')}
                                >
                                    <span className="relative">
                                        <Icon name={item.icon} size={22} />
                                        {badges[item.badgeKey] ? (
                                            <span className="absolute -end-2 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full leading-none bg-[var(--becpg-blue)] px-1 text-[10px] font-semibold tabular-nums text-white ring-1 ring-[var(--becpg-orange)]">
                                                {badges[item.badgeKey] > 99 ? '99+' : badges[item.badgeKey]}
                                            </span>
                                        ) : null}
                                    </span>
                                    <span className="line-clamp-2 w-full break-words text-center leading-tight">{t(item.labelKey)}</span>
                                    {/* The active marker: a 3px orange rail on the
                                        top edge. Decoration only — the state is
                                        already carried by `aria-current`, by the
                                        heavier label and by its colour going from
                                        `--becpg-dark-grey` (4.6:1) to
                                        `--becpg-blue` (11:1). */}
                                    {active ? (
                                        <span
                                            className="absolute inset-x-4 top-0 h-[3px] rounded-b-full bg-[var(--becpg-orange)]"
                                            aria-hidden="true"
                                        />
                                    ) : null}
                                </Link>
                            </li>
                        );
                    })}
                    {hasMore ? (
                        <li className="min-w-0 flex-1">
                            <button
                                type="button"
                                onClick={onOpenMore}
                                className="flex h-full min-h-[64px] w-full min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] text-[var(--becpg-dark-grey)]"
                            >
                                <Icon name="more_horiz" size={22} />
                                <span className="line-clamp-2 w-full break-words text-center leading-tight">{local.more}</span>
                            </button>
                        </li>
                    ) : null}
                </ul>
            </nav>
        );
    }

    // ----------------------------------------------------------------- drawer
    return (
        <AnimatePresence>
            {open ? (
                <div className="fixed inset-0 z-[70] lg:hidden">
                    <motion.div
                        className="absolute inset-0 bg-[rgba(0,66,84,0.45)]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={onClose}
                        aria-hidden="true"
                    />
                    <motion.div
                        ref={drawerRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label={local.menu}
                        tabIndex={-1}
                        onKeyDown={onDrawerKeyDown}
                        initial={reduceMotion ? { opacity: 0 } : { x: '-100%' }}
                        animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
                        exit={reduceMotion ? { opacity: 0 } : { x: '-100%' }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className="absolute inset-y-0 start-0 flex w-[84%] max-w-xs flex-col bg-white shadow-2xl"
                    >
                        {/* The drawer opens with the same blue toolbar and the same
                            wordmark as the header it came from, so a phone user
                            never loses the product identity while navigating. */}
                        {/* `safe-top` lives on this block and not on the panel:
                            the notch strip must be blue, like the header's. */}
                        <div className="becpg-toolbar safe-top flex items-center gap-2 px-3 py-2">
                            {/* White plate, as in the header: the official logo is
                                drawn in `--becpg-blue`. */}
                            <span className="becpg-brand-plate">
                                <Image
                                    src={withBasePath("/theme/default/images/logo.png")}
                                    unoptimized
                                    alt="beCPG"
                                    width={200}
                                    height={37}
                                    className="becpg-wordmark"
                                />
                            </span>
                            <IconButton
                                icon="close"
                                label={local.close}
                                onClick={onClose}
                                className="toolbar-item ms-auto"
                            />
                        </div>
                        <div className="flex items-center gap-2 border-b border-[var(--becpg-grey)] p-3">
                            <TenantBadge size="sm" showSuffix />
                        </div>
                        <nav aria-label={local.menu} className="flex-1 overflow-y-auto p-2">
                            {list.map((item) => {
                                const active = isActive(pathname, item);
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        onClick={onClose}
                                        aria-current={active ? 'page' : undefined}
                                        className={`nav-item touch-target py-3 ${active ? 'nav-item-active' : ''}`}
                                    >
                                        <Icon name={item.icon} size={22} className="nav-item-icon" />
                                        <span className="truncate">{t(item.labelKey)}</span>
                                        <Badge
                                            count={badges[item.badgeKey]}
                                            tone={active ? 'onBlue' : 'accent'}
                                        />
                                    </Link>
                                );
                            })}
                        </nav>
                        {canSwitchSpace ? (
                            <SpaceSwitch space={resolvedSpace} local={local} onNavigate={onClose} />
                        ) : null}
                    </motion.div>
                </div>
            ) : null}
        </AnimatePresence>
    );
}

/**
 * Switch between the supplier and the monitoring space. Rendered only for the
 * rare account that legitimately has both (an internal user delegated to enter
 * data on behalf of a supplier, spec §4.4).
 */
function SpaceSwitch({ space, local, onNavigate, collapsed = false, className = '' }) {
    const target = space === 'monitor' ? '/' : '/monitor';
    const label = space === 'monitor' ? local.supplierSpace : local.monitorSpace;
    return (
        <div className={`border-t border-[var(--becpg-grey)] ${collapsed ? 'px-0 pt-2' : 'p-2'} ${className}`}>
            <Link
                href={target}
                onClick={onNavigate}
                aria-label={collapsed ? label : undefined}
                title={collapsed ? label : undefined}
                className={`nav-item group touch-target ${collapsed ? 'nav-item-collapsed' : ''}`}
            >
                <Icon name="swap_horiz" size={20} className="nav-item-icon" />
                {collapsed ? null : <span className="truncate">{label}</span>}
                {collapsed ? <NavFlyout label={label} /> : null}
            </Link>
        </div>
    );
}
