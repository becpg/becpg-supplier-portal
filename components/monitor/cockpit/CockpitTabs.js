'use client';

/**
 * The tabs of the cockpit: one reading of the park per profile.
 *
 * WAI-ARIA tabs with automatic activation: the arrow keys move and select, Home
 * and End jump to the ends, and only the active panel is mounted - a hidden tab
 * never loads its chart library. The last tab is remembered per viewer in the
 * browser, as a convenience only: storage may be unavailable and the cockpit then
 * opens on its first tab.
 */

import { useCallback, useId, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Button';

/** Browser storage key of the last tab opened. */
const TAB_STORAGE_KEY = 'becpg_portal_cockpit_tab';

/** Key to the step it moves the selection by, in a left-to-right document. */
const ARROW_STEPS = Object.freeze({ ArrowRight: 1, ArrowLeft: -1 });

/** The stored tab, when it is one of `ids`. */
function readStoredTab(ids, storageKey) {
    if (!storageKey) {
        return null;
    }
    try {
        const stored = typeof window === 'undefined' ? null : window.localStorage.getItem(storageKey);
        return ids.includes(stored) ? stored : null;
    }
    catch {
        return null;
    }
}

/** Remembers the tab; a browser that refuses storage keeps working without it. */
function storeTab(id, storageKey) {
    if (!storageKey) {
        return;
    }
    try {
        window.localStorage.setItem(storageKey, id);
    }
    catch {
        // A private window or blocked storage: the tab is simply not remembered.
    }
}

/** The index the key moves to, or `null` for a key the tablist ignores. */
function targetIndex(key, index, count) {
    if (key === 'Home') {
        return 0;
    }
    if (key === 'End') {
        return count - 1;
    }
    const step = ARROW_STEPS[key];
    if (!step) {
        return null;
    }
    const rtl = document.documentElement.dir === 'rtl';
    return (index + (rtl ? -step : step) + count) % count;
}

/**
 * @param {Object} props
 * @param {Array<{id: string, label: string, icon: string, badge?: React.ReactNode,
 *                render: () => React.ReactNode}>} props.tabs
 * @param {string} props.label accessible name of the tablist
 * @param {string} [props.active] the selected tab, when the caller drives it
 * @param {Function} [props.onSelect] `(id) => void`, with `active`
 * @param {?string} [props.storageKey] where the last tab is remembered; `null` forgets it
 */
export function CockpitTabs({ tabs, label, active: controlled, onSelect, storageKey = TAB_STORAGE_KEY }) {
    const ids = tabs.map((tab) => tab.id);
    const [own, setOwn] = useState(() => readStoredTab(ids, storageKey) || ids[0]);
    const active = controlled ?? own;
    const buttons = useRef({});
    const prefix = useId();

    const select = useCallback((id) => {
        setOwn(id);
        onSelect?.(id);
        storeTab(id, storageKey);
    }, [onSelect, storageKey]);

    const onKeyDown = (event, index) => {
        const next = targetIndex(event.key, index, tabs.length);
        if (next === null) {
            return;
        }
        event.preventDefault();
        select(tabs[next].id);
        buttons.current[tabs[next].id]?.focus();
    };

    const current = tabs.find((tab) => tab.id === active) || tabs[0];
    return (
        <div>
            <div role="tablist" aria-label={label} className="no-scrollbar mb-4 flex gap-1 overflow-x-auto border-b border-[var(--becpg-line)]">
                {tabs.map((tab, index) => {
                    const selected = tab.id === current.id;
                    return (
                        <button
                            key={tab.id}
                            ref={(node) => { buttons.current[tab.id] = node; }}
                            type="button"
                            role="tab"
                            id={`${prefix}-tab-${tab.id}`}
                            aria-controls={selected ? `${prefix}-panel-${tab.id}` : undefined}
                            aria-selected={selected}
                            tabIndex={selected ? 0 : -1}
                            onClick={() => select(tab.id)}
                            onKeyDown={(event) => onKeyDown(event, index)}
                            className={`touch-target -mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm ${
                                selected
                                    ? 'border-[var(--becpg-teal)] font-medium text-[var(--becpg-ink)]'
                                    : 'border-transparent text-[var(--becpg-muted)] hover:text-[var(--becpg-ink)]'
                            }`}
                        >
                            <Icon name={tab.icon} size={18} className={selected ? 'text-[var(--becpg-teal)]' : ''} />
                            <span>{tab.label}</span>
                            {tab.badge}
                        </button>
                    );
                })}
            </div>
            <div
                role="tabpanel"
                id={`${prefix}-panel-${current.id}`}
                aria-labelledby={`${prefix}-tab-${current.id}`}
                tabIndex={0}
            >
                {current.render()}
            </div>
        </div>
    );
}
