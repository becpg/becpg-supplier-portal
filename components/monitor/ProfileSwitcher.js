'use client';

/**
 * Business-role views (spec §4.6.5) — *"même donnée, quatre lectures"*.
 *
 * This is a **selector, not four applications**. There is one API, one payload
 * and one set of components; a profile only decides:
 *
 *   - `tiles`   — the order of the KPI tiles of a reading;
 *   - `panels`  — which of the two park panels comes first;
 *   - `columns` — the order **and** the default visibility of the supplier table
 *     columns (`SupplierTable`); a column left out is hidden, never dropped —
 *     the column picker still brings it back;
 *   - `sort`    — the row order the table opens on, i.e. "what this job looks at
 *     first" expressed as a sort key the API already supports.
 *
 * Nothing here filters data. A buyer and a quality officer see the **same park**
 * with the same ACLs; they simply do not read it in the same order. Hiding rows
 * per profile would make two people disagree about the same supplier, which is
 * exactly the problem this space exists to fix.
 *
 * ## Persistence
 *
 * The choice is per user and per browser, kept in `localStorage`. It is a
 * display preference, not a permission: it carries nothing sensitive, so it does
 * not belong in the session cookie. `localStorage` **is** the store here — the
 * component subscribes to it with `useSyncExternalStore` (the same pattern as
 * the language cookie in `lib/messages.js`), so every mounted reader of
 * `useMonitorProfile()` updates at once, without a context provider and without
 * a `setState` inside an effect.
 */

import { useCallback, useSyncExternalStore } from 'react';
import { Icon } from '@/components/ui/Button';
import { useMessages } from '@/lib/messages';
import { Tooltip } from '@/components/ui/Tooltip';
import { defineLabels, pickLabels } from '@/lib/i18n';

/** Where the choice is kept. Display preference only — never a permission. */
export const PROFILE_STORAGE_KEY = 'becpg_portal_monitor_profile';

/** Dispatched on the window when the profile changes, so every reader wakes up. */
export const PROFILE_CHANGE_EVENT = 'portalmonitorprofilechange';

/**
 * The four readings of spec §4.6.5.
 *
 * `columns` reference ids owned by `SupplierTable`;
 * an unknown id is ignored, so a profile can name a tile a future version adds.
 *
 * @type {ReadonlyArray<Object>}
 */
export const MONITOR_PROFILES = Object.freeze([
    Object.freeze({
        id: 'quality',
        icon: 'verified_user',
        label: defineLabels('components/monitor/ProfileSwitcher#MONITOR_PROFILES.quality.label', { fr: 'Qualité', en: 'Quality' }),
        focus: defineLabels('components/monitor/ProfileSwitcher#MONITOR_PROFILES.quality.focus', {
            fr: 'Conformité documentaire, non-conformités, certifications, audits',
            en: 'Document compliance, non-conformities, certifications, audits',
        }),
        tiles: ['compliance', 'expiring30', 'nc', 'suspended', 'toRenew', 'lateTasks', 'campaigns', 'approved'],
        panels: ['expiry', 'park'],
        columns: [
            'name',
            'status',
            'documentsExpired',
            'documentsExpiring',
            'documentsMissing',
            'openNc',
            'risk',
            'lastActivity',
        ],
        sort: { by: 'expired', direction: 'desc' },
    }),
    Object.freeze({
        id: 'purchasing',
        icon: 'shopping_cart',
        label: defineLabels('components/monitor/ProfileSwitcher#MONITOR_PROFILES.purchasing.label', { fr: 'Achats', en: 'Purchasing' }),
        focus: defineLabels('components/monitor/ProfileSwitcher#MONITOR_PROFILES.purchasing.focus', {
            fr: "Statut d'agrément (bloquant pour commander), score, réactivité",
            en: 'Approval status (blocks ordering), score, responsiveness',
        }),
        tiles: ['approved', 'suspended', 'toRenew', 'nc', 'campaigns', 'lateTasks', 'compliance', 'expiring30'],
        panels: ['park', 'expiry'],
        columns: ['name', 'status', 'risk', 'openNc', 'openProjects', 'lastActivity', 'completion'],
        // Most severe approval status first: that is the buyer's blocking question.
        sort: { by: 'status', direction: 'desc' },
    }),
    Object.freeze({
        id: 'rnd',
        icon: 'science',
        label: defineLabels('components/monitor/ProfileSwitcher#MONITOR_PROFILES.rnd.label', { fr: 'R&D', en: 'R&D' }),
        focus: defineLabels('components/monitor/ProfileSwitcher#MONITOR_PROFILES.rnd.focus', {
            fr: 'Complétude des données techniques, catalogues, cahiers des charges',
            en: 'Technical data completeness, catalogs, specifications',
        }),
        tiles: ['compliance', 'campaigns', 'lateTasks', 'expiring30', 'approved', 'toRenew', 'suspended', 'nc'],
        panels: ['park', 'expiry'],
        columns: ['name', 'status', 'completion', 'documentsMissing', 'openProjects', 'family', 'lastActivity'],
        // Ascending completion: the least documented suppliers are the work list.
        sort: { by: 'completion', direction: 'asc' },
    }),
    Object.freeze({
        id: 'csr',
        icon: 'eco',
        label: defineLabels('components/monitor/ProfileSwitcher#MONITOR_PROFILES.csr.label', { fr: 'RSE', en: 'CSR' }),
        focus: defineLabels('components/monitor/ProfileSwitcher#MONITOR_PROFILES.csr.focus', {
            fr: 'Certifications, origines, questionnaires RSE',
            en: 'Certifications, origins, CSR questionnaires',
        }),
        tiles: ['expiring30', 'compliance', 'campaigns', 'toRenew', 'approved', 'suspended', 'nc', 'lateTasks'],
        panels: ['expiry', 'park'],
        columns: [
            'name',
            'status',
            'documentsExpiring',
            'documentsExpired',
            'completion',
            'family',
            'sites',
            'lastActivity',
        ],
        sort: { by: 'expiring', direction: 'desc' },
    }),
]);

/** The profile a first-time visitor lands on. */
export const DEFAULT_PROFILE_ID = 'quality';

/**
 * @param {string} [id]
 * @returns {Object} a profile — always one, never undefined
 */
export function resolveProfile(id) {
    return MONITOR_PROFILES.find((profile) => profile.id === id)
        || MONITOR_PROFILES.find((profile) => profile.id === DEFAULT_PROFILE_ID)
        || MONITOR_PROFILES[0];
}

/**
 * Orders a catalog of `{ id }` entries the way a profile asks, and says which
 * ones the profile did not ask for.
 *
 * Ids the profile names but the catalog does not carry are skipped; ids the
 * catalog carries but the profile omits are appended **at the end** and reported
 * in `hidden`, so nothing is ever silently lost — a table can hide them behind
 * the column picker, a KPI row can simply render them last.
 *
 * @param {Array<{id: string}>} catalog
 * @param {string[]} order ids, in the profile's order
 * @returns {{ordered: Array<Object>, hidden: string[]}}
 */
export function applyProfileOrder(catalog, order) {
    const wanted = Array.isArray(order) ? order : [];
    const byId = new Map(catalog.map((entry) => [entry.id, entry]));
    const ordered = [];
    const seen = new Set();

    for (const id of wanted) {
        const entry = byId.get(id);
        if (entry && !seen.has(id)) {
            ordered.push(entry);
            seen.add(id);
        }
    }
    const hidden = [];
    for (const entry of catalog) {
        if (!seen.has(entry.id)) {
            ordered.push(entry);
            hidden.push(entry.id);
        }
    }
    return { ordered, hidden };
}

/* -------------------------------------------------------------------------- */
/* The store: localStorage + one window event                                  */
/* -------------------------------------------------------------------------- */

function subscribe(onStoreChange) {
    window.addEventListener(PROFILE_CHANGE_EVENT, onStoreChange);
    // Another tab of the same portal counts as a change too.
    window.addEventListener('storage', onStoreChange);
    return () => {
        window.removeEventListener(PROFILE_CHANGE_EVENT, onStoreChange);
        window.removeEventListener('storage', onStoreChange);
    };
}

function readProfileId() {
    try {
        const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);
        return MONITOR_PROFILES.some((profile) => profile.id === stored) ? stored : DEFAULT_PROFILE_ID;
    }
    catch {
        // Private browsing, storage disabled: the default is a fine answer.
        return DEFAULT_PROFILE_ID;
    }
}

/** The server has no storage; it renders the default, then the client corrects it. */
function serverProfileId() {
    return DEFAULT_PROFILE_ID;
}

/**
 * The current business profile, and how to change it.
 *
 * @returns {{profile: Object, profileId: string, setProfile: (id: string) => void,
 *            profiles: ReadonlyArray<Object>, label: (profile: Object) => string}}
 *
 * @example
 * const { profile } = useMonitorProfile();
 * const { ordered } = applyProfileOrder(TILES, profile.tiles);
 */
export function useMonitorProfile() {
    const { lang } = useMessages();
    const profileId = useSyncExternalStore(subscribe, readProfileId, serverProfileId);

    const setProfile = useCallback((id) => {
        const next = resolveProfile(id).id;
        try {
            window.localStorage.setItem(PROFILE_STORAGE_KEY, next);
        }
        catch {
            // Nothing to persist to; the event below still switches the session.
        }
        window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
    }, []);

    const label = useCallback(
        (profile) => (profile && profile.label ? pickLabels(profile.label, lang) : ''),
        [lang],
    );

    return {
        profile: resolveProfile(profileId),
        profileId,
        setProfile,
        profiles: MONITOR_PROFILES,
        label,
    };
}

/* -------------------------------------------------------------------------- */
/* The selector                                                                */
/* -------------------------------------------------------------------------- */

const LABELS = defineLabels('components/monitor/ProfileSwitcher#LABELS', {
    fr: {
        legend: 'Vue métier',
        hint: 'Même parc, quatre lectures. Réordonne les cartes et les colonnes.',
    },
    en: {
        legend: 'Business view',
        hint: 'Same park, four readings. Reorders the cards and the columns.',
    },
});

/**
 * The profile selector: a radio group styled as segments on a desktop, a native
 * `<select>` on a phone (a four-way segmented control does not survive 360px,
 * and the OS picker is the better control there anyway).
 *
 * @param {Object} props
 * @param {boolean} [props.compact] drops the legend, for a header slot
 */
export function ProfileSwitcher({ compact = false, className = '' }) {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    const { profile, profileId, setProfile, profiles, label } = useMonitorProfile();

    return (
        <div className={className}>
            {/* --------------------------------------------------- phone */}
            <div className="sm:hidden">
                <label className="sr-only-text" htmlFor="monitor-profile">
                    {local.legend}
                </label>
                <div className="relative">
                    <select
                        id="monitor-profile"
                        value={profileId}
                        onChange={(event) => setProfile(event.target.value)}
                        className="w-full appearance-none rounded-lg border border-[var(--becpg-grey)] bg-white py-2 ps-9 pe-9 text-sm"
                    >
                        {profiles.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                                {label(entry)}
                            </option>
                        ))}
                    </select>
                    <Icon
                        name={profile.icon}
                        size={18}
                        className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--becpg-blue)]"
                    />
                    <Icon
                        name="expand_more"
                        size={18}
                        className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-[var(--becpg-dark-grey)]"
                    />
                </div>
            </div>

            {/* ------------------------------------------------- desktop */}
            <fieldset className="hidden sm:block">
                <legend className={compact ? 'sr-only-text' : 'mb-1 text-xs text-[var(--becpg-dark-grey)]'}>
                    {local.legend}
                </legend>
                <div
                    className="inline-flex rounded-lg border border-[var(--becpg-grey)] bg-white p-0.5"
                    role="radiogroup"
                    aria-label={local.legend}
                >
                    {profiles.map((entry) => {
                        const active = entry.id === profileId;
                        return (
                            <button
                                key={entry.id}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                title={pickLabels(entry.focus, lang)}
                                onClick={() => setProfile(entry.id)}
                                className={[
                                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]',
                                    active
                                        ? 'bg-[var(--becpg-blue)] font-medium text-white'
                                        : 'text-[var(--becpg-blue)] hover:bg-[var(--becpg-grey)]',
                                ].join(' ')}
                            >
                                <Icon name={entry.icon} size={16} />
                                <span>{label(entry)}</span>
                            </button>
                        );
                    })}
                </div>
                {/* What each reading changes, on demand: the four buttons alone
                    did not say how Quality differs from Purchasing. */}
                <Tooltip
                    className="ms-1.5 align-middle"
                    label={local.legend}
                    placement="bottom"
                    maxWidth={340}
                    content={
                        <span className="flex flex-col gap-1.5">
                            <span>{local.hint}</span>
                            {profiles.map((entry) => (
                                <span key={entry.id}>
                                    <strong className="font-medium">{label(entry)}</strong> — {pickLabels(entry.focus, lang)}
                                </span>
                            ))}
                        </span>
                    }
                />
                {compact ? null : (
                    <p className="mt-1 text-xs text-[var(--becpg-dark-grey)]">
                        {pickLabels(profile.focus, lang)}
                    </p>
                )}
            </fieldset>
        </div>
    );
}
