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

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Header } from '@/components/shell/Header';
import { Nav } from '@/components/shell/Nav';
import { useSession } from '@/components/providers/SessionProvider';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children page content
 * @param {React.ReactNode} [props.title] page title (header, and `<h1>` on phones)
 * @param {React.ReactNode} [props.subtitle] rendered above the content
 * @param {React.ReactNode} [props.actions] page actions in the header
 * @param {React.ReactNode} [props.headerStatus] a StatusPill (approval status) in the header
 * @param {React.ReactNode} [props.breadcrumb] rendered above the title
 * @param {React.ReactNode} [props.aside] permanent side panel (the wizard's "Étape 0 · Contexte")
 * @param {'supplier'|'monitor'} [props.space] overrides the session's space
 * @param {Object} [props.badges] nav counters, `{ tasks: 3, documents: 1 }`
 * @param {number} [props.notificationCount]
 * @param {boolean} [props.hideNav] full-bleed layout (signature viewer, print view)
 * @param {boolean} [props.fullWidth] drops the max-width on the content column
 * @param {boolean} [props.noPadding] content owns its own padding
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

    return (
        <div className="flex min-h-dvh flex-col bg-[var(--becpg-grey)]/30">
            <Header
                title={title}
                actions={actions}
                status={headerStatus}
                notificationCount={notificationCount}
                onMenuClick={hideNav ? undefined : () => setDrawerOpen(true)}
            />

            <div className="mx-auto flex w-full max-w-[var(--portal-max-width)] flex-1">
                {/* The sidebar sticks under the 3.5rem header; the TEST banner
                    scrolls away with the page, which is fine — it is part of the
                    header, which is itself sticky. */}
                {hideNav ? null : (
                    <aside className="hidden w-60 shrink-0 border-r border-[var(--becpg-grey)] bg-white lg:block lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)]">
                        {session.loading ? (
                            <div className="flex flex-col gap-2 p-3">
                                {Array.from({ length: 6 }, (_, index) => (
                                    <Skeleton key={index} height={40} radius="0.5rem" />
                                ))}
                            </div>
                        ) : (
                            <Nav variant="sidebar" space={resolvedSpace} badges={badges} />
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
                        className={
                            noPadding ? '' : `page-container ${fullWidth ? 'max-w-none' : ''}`
                        }
                    >
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
                        badges={badges}
                        onOpenMore={() => setDrawerOpen(true)}
                    />
                    <Nav
                        variant="drawer"
                        space={resolvedSpace}
                        badges={badges}
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
 * @param {Object} props
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.description]
 * @param {React.ReactNode} [props.actions]
 */
export function PageHeader({ title, description, actions, className = '' }) {
    return (
        <div className={`mb-4 flex flex-wrap items-start justify-between gap-3 ${className}`}>
            <div className="min-w-0">
                <h1 className="truncate text-lg font-medium sm:text-xl">{title}</h1>
                {description ? (
                    <p className="mt-0.5 text-sm text-[var(--becpg-dark-grey)]">{description}</p>
                ) : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    );
}
