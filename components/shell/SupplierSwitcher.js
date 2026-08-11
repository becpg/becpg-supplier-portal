'use client';

/**
 * **Which company am I working on?** — said in the toolbar, and changed there.
 *
 * The choice already existed but was invisible: it lived inside the account
 * popover, so the answer to "whose products am I looking at?" needed two clicks
 * and a guess. `/products` was scoped on it silently, and `/tasks` was not
 * scoped at all — the same account therefore read a filtered catalogue next to
 * an unfiltered task list, with nothing on screen explaining the difference.
 *
 * So the control is a **peer of the tenant badge**: the badge says which customer
 * this portal belongs to, this says which of my records I am acting for. Both are
 * always painted, because both change what every list underneath means.
 *
 * Three states, and only three:
 *
 * | Records the account acts for | What is rendered |
 * |---|---|
 * | 0 | nothing — an internal account has no record, and an empty chip is noise |
 * | 1 | a static chip; scoping on the only record is what "all" already means |
 * | 2+ | a menu: every record, plus **Tous les fournisseurs** |
 *
 * "Tous" widens the *lists* only. `/company`, the approval banner and the
 * document check-list keep describing the last concrete record — see
 * `SessionProvider`'s `supplier` vs `scopedSupplier`.
 *
 * No headless UI kit (AGENTS.md rule 3): the popover's keyboard and outside-click
 * behaviour is written here, the same way `Header`'s account menu writes its own.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/Button';
import { useSession } from '@/components/providers/SessionProvider';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        all: 'Tous les fournisseurs',
        change: 'Changer de fournisseur',
        current: 'Fournisseur sélectionné',
        group: 'Mes fiches fournisseur',
        scope: 'Périmètre',
    },
    en: {
        all: 'All suppliers',
        change: 'Change supplier',
        current: 'Selected supplier',
        group: 'My supplier records',
        scope: 'Scope',
    },
};

/**
 * @param {Object} props
 * @param {string} [props.className]
 * @returns {JSX.Element|null}
 */
export function SupplierSwitcher({ className = '' }) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const { suppliers, supplier, scopeAll, selectSupplier, selectAllSuppliers } = useSession();

    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        if (!open) {
            return undefined;
        }
        const onPointerDown = (event) => {
            if (
                menuRef.current
                && !menuRef.current.contains(event.target)
                && buttonRef.current
                && !buttonRef.current.contains(event.target)
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

    if (!suppliers || suppliers.length === 0) {
        return null;
    }

    const label = scopeAll ? labels.all : (supplier && supplier.name) || labels.all;

    // One record: the name is information, not a choice. A menu offering a single
    // option that is already selected is a control that can only disappoint.
    if (suppliers.length === 1) {
        return (
            <span
                className={`toolbar-slot flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 text-sm ${className}`}
                title={`${labels.current} — ${label}`}
            >
                <Icon name="apartment" size={18} className="shrink-0 opacity-90" />
                <span className="sr-only">{labels.current}</span>
                <span className="hidden max-w-[12rem] truncate md:block">{label}</span>
            </span>
        );
    }

    return (
        <div className={`relative ${className}`}>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`${labels.change} — ${label}`}
                className="toolbar-item flex touch-target min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 text-sm"
            >
                <Icon name="apartment" size={18} className="shrink-0" />
                <span className="hidden max-w-[12rem] truncate md:block">{label}</span>
                <Icon name="expand_more" size={16} className="hidden shrink-0 md:block" />
            </button>

            <AnimatePresence>
                {open ? (
                    <motion.div
                        ref={menuRef}
                        role="menu"
                        aria-label={labels.group}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.14 }}
                        className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-[var(--becpg-grey)] bg-white text-[var(--becpg-blue)] shadow-xl"
                    >
                        <div className="px-3 pb-1 pt-2 text-[11px] uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                            {labels.scope}
                        </div>

                        {/* "Tous" first: it is the widest reading, and the one a
                            supplier reaches for when a product or a task is
                            missing from a scoped list. */}
                        <button
                            type="button"
                            role="menuitemradio"
                            aria-checked={Boolean(scopeAll)}
                            onClick={() => {
                                selectAllSuppliers();
                                setOpen(false);
                            }}
                            className={[
                                'flex w-full touch-target items-center gap-2 px-3 py-2 text-left text-sm',
                                scopeAll ? 'bg-[var(--becpg-blue-lighter)] font-medium' : 'hover:bg-[var(--becpg-grey)]',
                            ].join(' ')}
                        >
                            <Icon
                                name={scopeAll ? 'radio_button_checked' : 'select_all'}
                                size={18}
                                className="shrink-0"
                            />
                            <span className="min-w-0 flex-1 truncate">{labels.all}</span>
                            <span className="shrink-0 text-[11px] text-[var(--becpg-dark-grey)]">
                                {suppliers.length}
                            </span>
                        </button>

                        <div className="my-1 border-t border-[var(--becpg-grey)]" />
                        <div
                            role="group"
                            aria-label={labels.group}
                            className="max-h-64 overflow-y-auto pb-1"
                        >
                            {suppliers.map((entry) => {
                                const active = !scopeAll && supplier && entry.nodeRef === supplier.nodeRef;
                                return (
                                    <button
                                        key={entry.nodeRef}
                                        type="button"
                                        role="menuitemradio"
                                        aria-checked={Boolean(active)}
                                        onClick={() => {
                                            selectSupplier(entry);
                                            setOpen(false);
                                        }}
                                        className={[
                                            'flex w-full touch-target items-center gap-2 px-3 py-2 text-left text-sm',
                                            active
                                                ? 'bg-[var(--becpg-blue-lighter)] font-medium'
                                                : 'hover:bg-[var(--becpg-grey)]',
                                        ].join(' ')}
                                    >
                                        <Icon
                                            name={active ? 'radio_button_checked' : 'apartment'}
                                            size={18}
                                            className="shrink-0"
                                        />
                                        <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                                        {entry.code ? (
                                            <span className="shrink-0 text-[11px] text-[var(--becpg-dark-grey)]">
                                                {entry.code}
                                            </span>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
