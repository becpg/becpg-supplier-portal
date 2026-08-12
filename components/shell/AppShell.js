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

import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Header } from '@/components/shell/Header';
import { Nav } from '@/components/shell/Nav';
import { useSession } from '@/components/providers/SessionProvider';
import { publishBadges, readBadges, serverBadges, subscribeBadges } from '@/lib/badges';
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

    /*
     * LES PASTILLES DU MENU SURVIVENT AU CHANGEMENT D'ÉCRAN.
     *
     * Chaque page ne passe que ce qu'elle sait compter — le tableau de bord les
     * trois, `/tasks` les tâches seules, `/products` rien — et le menu affichait
     * donc exactement ce que la page courante lui donnait : quitter le tableau
     * de bord effaçait les compteurs de tâches et de discussions.
     *
     * Ils sont désormais mémorisés pour l'onglet (voir `lib/badges.js`) et
     * complétés ici. La page reste prioritaire sur ce qu'elle affirme : ses
     * chiffres sont ceux de l'écran qu'on regarde, donc les plus frais.
     * Faire recalculer les autres par chaque page coûterait, pour un « 3 », le
     * balayage d'entités qu'exige le compteur de discussions.
     */
    const storedBadges = useSyncExternalStore(subscribeBadges, readBadges, serverBadges);
    const badgeKey = JSON.stringify(badges);
    const currentUser = session.user ? (session.user.username || session.user.sub || null) : null;
    useEffect(() => {
        publishBadges(JSON.parse(badgeKey), currentUser);
        // `badges` est un littéral recréé à chaque rendu : c'est sa valeur, non
        // son identité, qui doit déclencher la publication — d'où la clé
        // sérialisée, qui sert à la fois de dépendance et de source.
    }, [badgeKey, currentUser]);
    const mergedBadges = { ...storedBadges, ...badges };

    return (
        <div className="flex min-h-dvh flex-col bg-[var(--becpg-grey)]/30">
            <Header
                title={title}
                actions={actions}
                status={headerStatus}
                notificationCount={notificationCount}
                onMenuClick={hideNav ? undefined : () => setDrawerOpen(true)}
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
                    /* `w-64`, the reference `Layout.js` rail width. It was `w-60`,
                       which leaves the label 157px: "Conformité documentaire" needs
                       165 and was the one nav entry rendering ellipsised at 1440. */
                    <aside className="hidden w-64 shrink-0 border-r border-[var(--becpg-grey)] bg-white lg:block lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)]">
                        {session.loading ? (
                            <div className="flex flex-col gap-2 p-3">
                                {Array.from({ length: 6 }, (_, index) => (
                                    <Skeleton key={index} height={40} radius="0.5rem" />
                                ))}
                            </div>
                        ) : (
                            <Nav variant="sidebar" space={resolvedSpace} badges={mergedBadges} />
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
