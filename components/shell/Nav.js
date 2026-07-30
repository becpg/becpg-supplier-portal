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
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon, IconButton } from '@/components/ui/Button';
import { TenantBadge } from '@/components/shell/TenantBadge';
import { useSession } from '@/components/providers/SessionProvider';
import { useMessages } from '@/lib/messages';

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
    { id: 'suppliers', href: '/monitor/suppliers', labelKey: 'nav.monitor.suppliers', icon: 'groups', primary: true },
    { id: 'monitor-documents', href: '/monitor/documents', labelKey: 'nav.monitor.documents', icon: 'fact_check', primary: true },
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
const LOCAL_LABELS = {
    fr: { more: 'Plus', menu: 'Menu', close: 'Fermer le menu', supplierSpace: 'Espace fournisseur', monitorSpace: 'Espace pilotage' },
    en: { more: 'More', menu: 'Menu', close: 'Close menu', supplierSpace: 'Supplier space', monitorSpace: 'Monitoring space' },
};

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

function Badge({ count, tone = 'accent' }) {
    if (!count) {
        return null;
    }
    return (
        <span
            className={[
                'ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-medium',
                tone === 'accent'
                    ? 'bg-[var(--becpg-orange)] text-white'
                    : 'bg-[var(--becpg-grey)] text-[var(--becpg-blue)]',
            ].join(' ')}
        >
            {count > 99 ? '99+' : count}
        </span>
    );
}

/**
 * @param {Object} props
 * @param {'sidebar'|'bottom'|'drawer'} [props.variant='sidebar']
 * @param {'supplier'|'monitor'|'unknown'} [props.space] overrides the session's space
 * @param {Array<Object>} [props.items] overrides the item list entirely
 * @param {Object} [props.badges] counts keyed by `badgeKey` (`{ tasks: 3 }`)
 * @param {boolean} [props.open] drawer only
 * @param {Function} [props.onClose] drawer / bottom-bar "Plus"
 * @param {Function} [props.onOpenMore] bottom bar only: called by the "Plus" button
 */
export function Nav({
    variant = 'sidebar',
    space,
    items,
    badges = {},
    open = false,
    onClose,
    onOpenMore,
    className = '',
}) {
    const { t, lang } = useMessages();
    const pathname = appPath(usePathname());
    const session = useSession();
    const reduceMotion = useReducedMotion();
    const local = LOCAL_LABELS[lang] || LOCAL_LABELS.fr;

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

    // ---------------------------------------------------------------- sidebar
    if (variant === 'sidebar') {
        return (
            <nav
                aria-label={local.menu}
                className={`flex h-full flex-col gap-1 overflow-y-auto p-3 ${className}`}
            >
                {list.map((item) => {
                    const active = isActive(pathname, item);
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={[
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                                active
                                    ? 'bg-[var(--becpg-blue-lighter)] font-medium text-[var(--becpg-blue)]'
                                    : 'text-[var(--becpg-blue)]/80 hover:bg-[var(--becpg-grey)]',
                            ].join(' ')}
                        >
                            <Icon
                                name={item.icon}
                                size={20}
                                className={active ? 'text-[var(--becpg-orange)]' : ''}
                            />
                            <span className="truncate">{t(item.labelKey)}</span>
                            <Badge count={badges[item.badgeKey]} />
                        </Link>
                    );
                })}
                {canSwitchSpace ? (
                    <SpaceSwitch space={resolvedSpace} local={local} className="mt-auto" />
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
                            <li key={item.id} className="flex-1">
                                <Link
                                    href={item.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={[
                                        'relative flex h-full min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px]',
                                        active
                                            ? 'font-medium text-[var(--becpg-blue)]'
                                            : 'text-[var(--becpg-dark-grey)]',
                                    ].join(' ')}
                                >
                                    <span className="relative">
                                        <Icon
                                            name={item.icon}
                                            size={22}
                                            className={active ? 'text-[var(--becpg-orange)]' : ''}
                                        />
                                        {badges[item.badgeKey] ? (
                                            <span className="absolute -right-2 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--becpg-orange)] px-1 text-[10px] font-medium text-white">
                                                {badges[item.badgeKey] > 99 ? '99+' : badges[item.badgeKey]}
                                            </span>
                                        ) : null}
                                    </span>
                                    <span className="max-w-full truncate">{t(item.labelKey)}</span>
                                    {active ? (
                                        <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-[var(--becpg-orange)]" />
                                    ) : null}
                                </Link>
                            </li>
                        );
                    })}
                    {hasMore ? (
                        <li className="flex-1">
                            <button
                                type="button"
                                onClick={onOpenMore}
                                className="flex h-full min-h-[56px] w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] text-[var(--becpg-dark-grey)]"
                            >
                                <Icon name="more_horiz" size={22} />
                                <span>{local.more}</span>
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
                    <motion.nav
                        aria-label={local.menu}
                        initial={reduceMotion ? { opacity: 0 } : { x: '-100%' }}
                        animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
                        exit={reduceMotion ? { opacity: 0 } : { x: '-100%' }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className="safe-top absolute inset-y-0 left-0 flex w-[84%] max-w-xs flex-col bg-white shadow-2xl"
                    >
                        <div className="flex items-center gap-2 border-b border-[var(--becpg-grey)] p-3">
                            <TenantBadge size="sm" showSuffix />
                            <IconButton
                                icon="close"
                                label={local.close}
                                onClick={onClose}
                                className="ml-auto"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {list.map((item) => {
                                const active = isActive(pathname, item);
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        onClick={onClose}
                                        aria-current={active ? 'page' : undefined}
                                        className={[
                                            'flex touch-target items-center gap-3 rounded-lg px-3 py-3 text-sm',
                                            active
                                                ? 'bg-[var(--becpg-blue-lighter)] font-medium text-[var(--becpg-blue)]'
                                                : 'text-[var(--becpg-blue)]/85 active:bg-[var(--becpg-grey)]',
                                        ].join(' ')}
                                    >
                                        <Icon
                                            name={item.icon}
                                            size={22}
                                            className={active ? 'text-[var(--becpg-orange)]' : ''}
                                        />
                                        <span className="truncate">{t(item.labelKey)}</span>
                                        <Badge count={badges[item.badgeKey]} />
                                    </Link>
                                );
                            })}
                        </div>
                        {canSwitchSpace ? (
                            <SpaceSwitch space={resolvedSpace} local={local} onNavigate={onClose} />
                        ) : null}
                    </motion.nav>
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
function SpaceSwitch({ space, local, onNavigate, className = '' }) {
    const target = space === 'monitor' ? '/' : '/monitor';
    const label = space === 'monitor' ? local.supplierSpace : local.monitorSpace;
    return (
        <div className={`border-t border-[var(--becpg-grey)] p-2 ${className}`}>
            <Link
                href={target}
                onClick={onNavigate}
                className="flex touch-target items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--becpg-blue)]/80 hover:bg-[var(--becpg-grey)]"
            >
                <Icon name="swap_horiz" size={20} />
                <span className="truncate">{label}</span>
            </Link>
        </div>
    );
}
