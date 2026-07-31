'use client';

/**
 * The application header — the beCPG toolbar.
 *
 * Chrome, and the reason it looks the way it does:
 *
 *   TEST strip (orange, striped, non dismissable)
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ ☰  [beCPG]  │  ▣ Tenant           status  actions  🔔  ● User ▾  │  ← --becpg-blue
 *   └──────────────────────────────────────────────────────────────────┘
 *   ▂▂▂ green/orange hairline
 *
 * The bar is `--becpg-toolbar-color` with `--becpg-on-toolbar-color` content,
 * the two variables `public/theme/default/theme.css` defines for exactly this
 * surface. That is not decoration: a supplier who also uses beCPG Share must
 * recognise the same blue toolbar, and a portal with a white header reads as a
 * different product. Hover states are handled by `.toolbar-item` in globals.css
 * (orange-light on a darkened surface — see the contrast table there).
 *
 * Two things are non-negotiable here (spec §4.3, §5.3):
 *
 *  1. **The tenant logo and name are always shown.** A supplier working for
 *     several beCPG customers has one portal per customer, and this badge is the
 *     only thing that tells them which dossier they are in. It is rendered at
 *     every breakpoint — abbreviated on a phone, never removed.
 *  2. **The user menu is always reachable**, including the sign-out, because an
 *     external account is often shared between colleagues at the supplier.
 *
 * The menu is a plain button + popover: no headless UI kit (rule 3), so the
 * keyboard and outside-click behaviour is implemented here, once.
 */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, IconButton } from '@/components/ui/Button';
import { NotificationBell } from '@/components/shell/NotificationBell';
import { TenantBadge } from '@/components/shell/TenantBadge';
import { TestBanner } from '@/components/shell/TestBanner';
import { StatusPill } from '@/components/ui/StatusPill';
import { useSession } from '@/components/providers/SessionProvider';
import { useMessages } from '@/lib/messages';

const LOCAL_LABELS = {
    fr: { menu: 'Ouvrir le menu', account: 'Mon compte', home: 'beCPG — accueil du portail' },
    en: { menu: 'Open menu', account: 'My account', home: 'beCPG — portal home' },
};

/** Two-letter monogram from a display name. */
function initials(name) {
    if (!name) {
        return '?';
    }
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        return '?';
    }
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * @param {Object} props
 * @param {Function} [props.onMenuClick] opens the mobile drawer (hides the button when absent)
 * @param {React.ReactNode} [props.title] page title, shown next to the tenant on desktop
 * @param {React.ReactNode} [props.actions] page-level actions rendered before the user menu
 * @param {number} [props.notificationCount] count shown on the bell before its own
 *     fetch lands; the bell keeps it up to date itself afterwards
 * @param {React.ReactNode} [props.status] a StatusPill (approval status) shown on desktop
 */
export function Header({ onMenuClick, title, actions, notificationCount = 0, status, className = '' }) {
    const { t, lang, setLang, langs } = useMessages();
    const session = useSession();
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);
    const buttonRef = useRef(null);
    const local = LOCAL_LABELS[lang] || LOCAL_LABELS.fr;

    useEffect(() => {
        if (!open) {
            return undefined;
        }
        const onPointerDown = (event) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target)
            ) {
                setOpen(false);
            }
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
                if (buttonRef.current) {
                    buttonRef.current.focus();
                }
            }
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const user = session.user;
    const displayName = (user && (user.name || user.username)) || '';

    return (
        /*
            `becpg-toolbar` sits on the <header> itself, not on the bar below:
            `safe-top` reserves the notch area, and that reserved strip has to be
            painted `--becpg-blue` too — the manifest and `theme-color` promise a
            blue chrome, and `apple-mobile-web-app-status-bar-style:
            black-translucent` puts the status bar directly on top of it.
        */
        <header className={`becpg-toolbar safe-top sticky top-0 z-50 ${className}`}>
            <TestBanner />
            <div className="shadow-[0_2px_10px_rgba(0,66,84,0.25)]">
                {/* Full width, like the frame under it. Capped at
                    `--portal-max-width` the toolbar painted its blue edge to
                    edge but pushed the brand 260px inboard at 1920, so the logo
                    no longer lined up with the navigation rail it sits above —
                    and the account menu floated 260px off the right edge. */}
                <div className="flex h-14 w-full items-center gap-1.5 px-2 sm:gap-2 sm:px-4">
                    {onMenuClick ? (
                        <IconButton
                            icon="menu"
                            label={local.menu}
                            onClick={onMenuClick}
                            className="toolbar-item lg:hidden"
                        />
                    ) : null}

                    {/*
                        The product mark, on its white plate (see
                        `.becpg-brand-plate`: the official logo is drawn in
                        `--becpg-blue` and would vanish on the blue bar).

                        `logo.png` is the official 200×37 wordmark; on a phone the
                        toolbar also has to hold the tenant name, the bell and the
                        account, so the compact `app-logo-48.png` mark takes over
                        below `sm` — the same two assets, and the same trade-off,
                        as the reference layout. `priority` on both: they are above
                        the fold on every single screen, and a late-loading logo is
                        exactly what makes a branded portal look unbranded.
                    */}
                    <Link
                        href="/"
                        aria-label={local.home}
                        className="brand-link flex shrink-0 items-center rounded-[0.625rem] p-1"
                    >
                        <span className="becpg-brand-plate">
                            <Image
                                src="/theme/default/images/logo.png"
                                alt="beCPG"
                                width={200}
                                height={37}
                                priority
                                className="becpg-wordmark hidden sm:block"
                            />
                            <Image
                                src="/theme/images/app-logo-48.png"
                                alt="beCPG"
                                width={48}
                                height={42}
                                priority
                                className="block h-6 w-auto sm:hidden"
                            />
                        </span>
                    </Link>

                    <span className="toolbar-divider hidden sm:block" aria-hidden="true" />

                    {/* Tenant identity — always present, spec §4.3 / §5.3. */}
                    <Link
                        href="/"
                        className="toolbar-item flex min-w-0 items-center rounded-lg px-1 py-1"
                    >
                        <TenantBadge size="md" tone="dark" showSuffix />
                    </Link>

                    {title ? (
                        <>
                            <span className="toolbar-divider mx-1 hidden lg:block" aria-hidden="true" />
                            <h1 className="hidden min-w-0 truncate text-sm font-medium lg:block">{title}</h1>
                        </>
                    ) : null}

                    <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
                        {status ? <span className="hidden sm:inline-flex">{status}</span> : null}
                        {actions}

                        {/* The bell owns its own data and its own popover: it used to
                            be a link to `/notifications`, a route that does not
                            exist, fed by a count no page ever passed. */}
                        <NotificationBell initialCount={notificationCount} className="toolbar-slot" />

                        {/* ------------------------------------- user menu */}
                        <div className="relative">
                            <button
                                ref={buttonRef}
                                type="button"
                                onClick={() => setOpen((value) => !value)}
                                aria-haspopup="menu"
                                aria-expanded={open}
                                aria-label={local.account}
                                className="toolbar-item flex touch-target items-center gap-2 rounded-lg p-1 pr-1 md:pr-2"
                            >
                                {/* The monogram inverts on the blue bar: white
                                    chip, blue letters (11:1 either way). */}
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-medium text-[var(--becpg-blue)]">
                                    {initials(displayName)}
                                </span>
                                <span className="hidden max-w-[10rem] truncate text-sm md:block">
                                    {displayName}
                                </span>
                                <Icon name="expand_more" size={18} className="hidden md:block" />
                            </button>

                            <AnimatePresence>
                                {open ? (
                                    <motion.div
                                        ref={menuRef}
                                        role="menu"
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.14 }}
                                        className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[var(--becpg-grey)] bg-white text-[var(--becpg-blue)] shadow-xl"
                                    >
                                        <div className="border-b border-[var(--becpg-grey)] p-3">
                                            <p className="truncate text-sm font-medium">{displayName || '—'}</p>
                                            {user && user.email ? (
                                                <p className="truncate text-xs text-[var(--becpg-dark-grey)]">
                                                    {user.email}
                                                </p>
                                            ) : null}
                                            {session.supplier ? (
                                                <p className="mt-1 truncate text-xs text-[var(--becpg-dark-grey)]">
                                                    <Icon
                                                        name="apartment"
                                                        size={13}
                                                        className="mr-1 align-text-bottom"
                                                    />
                                                    {session.supplier.name}
                                                </p>
                                            ) : null}
                                            {session.isTest ? (
                                                <div className="mt-2">
                                                    <StatusPill
                                                        status="inProgress"
                                                        label={t('test.badge')}
                                                        tone="warn"
                                                        icon="science"
                                                        size="sm"
                                                    />
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="p-1">
                                            <Link
                                                href="/company"
                                                role="menuitem"
                                                onClick={() => setOpen(false)}
                                                className="flex touch-target items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--becpg-grey)]"
                                            >
                                                <Icon name="account_circle" size={18} />
                                                {t('account.profile')}
                                            </Link>

                                            <div className="px-3 pb-1 pt-2 text-[11px] uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                                                {t('account.language')}
                                            </div>
                                            <div className="flex gap-1 px-2 pb-2">
                                                {langs.map((code) => (
                                                    <button
                                                        key={code}
                                                        type="button"
                                                        onClick={() => setLang(code)}
                                                        aria-pressed={lang === code}
                                                        className={[
                                                            'flex-1 rounded-lg border px-2 py-1.5 text-xs uppercase',
                                                            lang === code
                                                                ? 'border-[var(--becpg-blue)] bg-[var(--becpg-blue-lighter)] font-medium text-[var(--becpg-blue)]'
                                                                : 'border-[var(--becpg-grey)] text-[var(--becpg-dark-grey)] hover:bg-[var(--becpg-grey)]',
                                                        ].join(' ')}
                                                    >
                                                        {code}
                                                    </button>
                                                ))}
                                            </div>

                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={() => session.signOut()}
                                                className="flex w-full touch-target items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--status-danger)] hover:bg-[var(--status-danger-bg)]"
                                            >
                                                <Icon name="logout" size={18} />
                                                {t('account.logout')}
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : null}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Page title on phones: it does not fit next to the tenant badge.
                    It stays inside the blue bar rather than starting a second
                    white strip — one block of chrome, not two. */}
                {title ? (
                    <div className="border-t border-[var(--becpg-toolbar-divider)] px-3 py-2 lg:hidden">
                        <h1 className="truncate text-sm font-medium">{title}</h1>
                    </div>
                ) : null}
            </div>

            {/* The range's secondary accent, 2px. Decorative only (aria-hidden). */}
            <div className="becpg-toolbar-edge" aria-hidden="true" />
        </header>
    );
}
