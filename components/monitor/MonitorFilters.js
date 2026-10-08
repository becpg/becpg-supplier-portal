'use client';

/**
 * The park filters (spec §4.6.1: *"cartes d'en-tête, filtrables par
 * famille de fournisseur, site, acheteur, marché"*).
 *
 * One filter bar for the whole monitoring space: the overview, the supplier
 * list, the documentary matrix and the campaigns all read the same eight
 * parameters, so they are declared **once** here and travelled in the URL.
 * That is what makes a link shareable — "here are my late organic suppliers" is
 * a URL, not a screenshot.
 *
 * ## What the API can and cannot filter, said out loud
 *
 * `lib/adapters/monitor.js` declares each filter's `mode`, and the payload
 * echoes it back in `filters.applied` / `filters.unsupported`:
 *
 * | mode      | meaning                                    | what this bar does          |
 * |-----------|--------------------------------------------|-----------------------------|
 * | `query`   | indexed property, one db-afts clause       | nothing special             |
 * | `assoc`   | an association — Alfresco cannot search it | badge: *fenêtre lue*        |
 * | `unset`   | no standard beCPG property carries it      | control disabled + why      |
 *
 * `market` is `unset` in the standard model: rather than pretending, the control
 * is rendered **disabled** with the reason. The day a tenant names a property in
 * `DEFAULT_MONITOR_CONFIG.filters.market`, the API stops reporting it as
 * unsupported and the control enables itself — no code change here.
 *
 * ## Where the option lists come from
 *
 * There is no facet endpoint (see the API gaps note of this lot), and inventing
 * one would mean a second pass over the park. So the vocabularies (famille,
 * sous-famille, site, filiale, acheteur) are **harvested from the rows the
 * screen already loaded** with {@link mergeFilterOptions}, and accumulated
 * across pages so choosing a value never empties the select that chose it. A
 * screen with no rows in hand (the overview) simply gets fewer selects, and the
 * free-text search still covers `cm:name`, `bcpg:code`, `bcpg:legalName` and
 * `bcpg:erpCode`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button, Icon } from '@/components/ui/Button';
import { SearchInput, Select } from '@/components/ui/Field';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

/**
 * The park filters, in the order `parseMonitorFilters()` reads them.
 * `q` is handled apart: it is a search box, not a select.
 * @readonly
 */
export const MONITOR_FILTER_KEYS = Object.freeze([
    'q',
    'family',
    'subFamily',
    'site',
    'subsidiary',
    'buyer',
    'market',
    'state',
]);

/** Neutral filter set — every key present, so React inputs stay controlled. */
export const EMPTY_MONITOR_FILTERS = Object.freeze(
    MONITOR_FILTER_KEYS.reduce((accumulator, key) => ({ ...accumulator, [key]: '' }), {}),
);

/**
 * `bcpg:supplierState` — the `bcpg:systemState` constraint of the beCPG model
 * (`Simulation`, `ToValidate`, `Valid`, `Refused`, `Archived`, `Stopped`, see
 * `custom-plm-becpg-context.xml`). This is the **lifecycle** of the supplier
 * node and has nothing to do with the derived approval status of §5.4.3: a
 * supplier can be `Valid` in beCPG and `suspended` for the portal.
 * @readonly
 */
export const SUPPLIER_STATES = Object.freeze([
    defineLabels('components/monitor/MonitorFilters#SUPPLIER_STATES.Valid', { value: 'Valid', fr: 'Validé', en: 'Valid' }),
    defineLabels('components/monitor/MonitorFilters#SUPPLIER_STATES.Simulation', { value: 'Simulation', fr: 'Brouillon', en: 'Draft' }),
    defineLabels('components/monitor/MonitorFilters#SUPPLIER_STATES.ToValidate', { value: 'ToValidate', fr: 'À valider', en: 'To validate' }),
    defineLabels('components/monitor/MonitorFilters#SUPPLIER_STATES.Refused', { value: 'Refused', fr: 'Refusé', en: 'Rejected' }),
    defineLabels('components/monitor/MonitorFilters#SUPPLIER_STATES.Archived', { value: 'Archived', fr: 'Archivé', en: 'Archived' }),
    defineLabels('components/monitor/MonitorFilters#SUPPLIER_STATES.Stopped', { value: 'Stopped', fr: 'Arrêté', en: 'Stopped' }),
]);

/** `workspace://SpacesStore/<uuid>` — a node identifier, never a label. */
const NODEREF_RE = /^workspace:\/\/SpacesStore\/[0-9a-f-]{36}$/i;

const LABELS = defineLabels('components/monitor/MonitorFilters#LABELS', {
    fr: {
        search: 'Rechercher un fournisseur, un code, une raison sociale…',
        toggle: 'Filtres',
        reset: 'Réinitialiser',
        close: 'Masquer les filtres',
        legend: 'Filtres du parc',
        family: 'Famille',
        subFamily: 'Sous-famille',
        site: 'Site',
        subsidiary: 'Filiale',
        buyer: 'Acheteur référent',
        market: 'Marché',
        state: 'État du fournisseur',
        any: 'Tous',
        anyBuyer: 'Tous les acheteurs',
        buyerHint: 'Identifiant beCPG (cm:owner)',
        windowScoped: 'fenêtre lue',
        windowScopedHelp:
            'Alfresco n’indexe pas les associations : ce filtre s’applique sur les fournisseurs déjà lus, pas sur le parc entier.',
        unsupported: 'non paramétré',
        unsupportedHelp:
            'Aucune propriété beCPG standard ne porte cette notion. À activer côté client en la déclarant dans la configuration du pilotage.',
        noVocabulary: 'Aucune valeur dans le périmètre chargé',
        active: '{count} filtre actif',
        activePlural: '{count} filtres actifs',
        clearOne: 'Retirer ce filtre',
    },
    en: {
        search: 'Search a supplier, a code, a legal name…',
        toggle: 'Filters',
        reset: 'Reset',
        close: 'Hide the filters',
        legend: 'Park filters',
        family: 'Family',
        subFamily: 'Sub-family',
        site: 'Site',
        subsidiary: 'Subsidiary',
        buyer: 'Referring buyer',
        market: 'Market',
        state: 'Supplier state',
        any: 'All',
        anyBuyer: 'All buyers',
        buyerHint: 'beCPG username (cm:owner)',
        windowScoped: 'window-scoped',
        windowScopedHelp:
            'Alfresco does not index associations: this filter applies to the suppliers already read, not to the whole park.',
        unsupported: 'not configured',
        unsupportedHelp:
            'No standard beCPG property carries this notion. Enable it client side by declaring the property in the monitoring configuration.',
        noVocabulary: 'No value in the loaded perimeter',
        active: '{count} active filter',
        activePlural: '{count} active filters',
        clearOne: 'Remove this filter',
    },
});

/** The selects, in reading order. `q` and `state` are handled separately. */
const VOCABULARY_FILTERS = Object.freeze(['family', 'subFamily', 'site', 'subsidiary', 'market']);

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]));
}

/**
 * Reads the park filters out of a `URLSearchParams` (or any `get`-able).
 *
 * The URL is the source of truth: every monitoring screen initialises from it,
 * and every link between screens carries it (`monitorFilterQuery`).
 *
 * @param {{get: (name: string) => string|null}} searchParams
 * @returns {Object} a complete filter set
 */
export function readMonitorFilters(searchParams) {
    const filters = { ...EMPTY_MONITOR_FILTERS };
    if (!searchParams || typeof searchParams.get !== 'function') {
        return filters;
    }
    for (const key of MONITOR_FILTER_KEYS) {
        const value = searchParams.get(key);
        filters[key] = value === null ? '' : String(value).trim().slice(0, 200);
    }
    return filters;
}

/**
 * The filters as query parameters for `useApi` / `download`.
 *
 * Empty values are dropped so two equivalent filter sets produce the same URL —
 * which is what lets the API's 30 s memo actually hit.
 *
 * @param {Object} filters
 * @param {Object} [extra] additional parameters (`status`, `sort`, `page`…)
 * @returns {Object}
 */
export function monitorFilterParams(filters, extra = {}) {
    const params = {};
    for (const key of MONITOR_FILTER_KEYS) {
        const value = filters && filters[key];
        if (value) {
            params[key] = value;
        }
    }
    for (const [key, value] of Object.entries(extra)) {
        if (value !== undefined && value !== null && value !== '') {
            params[key] = value;
        }
    }
    return params;
}

/**
 * The filters as a query string, for a link from one monitoring screen to
 * another (`/monitor/suppliers?status=suspended&family=…`).
 *
 * @param {Object} filters
 * @param {Object} [extra]
 * @returns {string} without the leading `?`
 */
export function monitorFilterQuery(filters, extra = {}) {
    return new URLSearchParams(monitorFilterParams(filters, extra)).toString();
}

/**
 * How many filters are set (the badge on the toggle button).
 *
 * @param {Object} filters
 * @returns {number}
 */
export function activeFilterCount(filters) {
    return MONITOR_FILTER_KEYS.filter((key) => Boolean(filters && filters[key])).length;
}

/**
 * Debounces a value, so the *typed* filter and the *queried* filter can differ.
 *
 * The search box must feel instant while `q` is a real db-afts clause — a
 * request per keystroke would hammer beCPG through the whole park. The inputs
 * therefore read the immediate state and `useApi` reads this one.
 *
 * @param {*} value
 * @param {number} [delay=350] ms
 * @returns {*} the value, `delay` after it stopped changing
 */
export function useDebouncedValue(value, delay = 350) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        if (value === debounced) {
            return undefined;
        }
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, debounced, delay]);

    return debounced;
}

/**
 * Harvests the filter vocabularies from the supplier rows a screen has loaded,
 * merging them into what was already known.
 *
 * Accumulating matters: once the user filters on a family, the API only returns
 * that family, and a select rebuilt from the response alone would lose every
 * other option — i.e. the user could never come back. Keeping the union of what
 * has been seen makes the control stable.
 *
 * @param {Object} previous result of a former call (`{}` to start)
 * @param {Array<Object>} items supplier rows (`/monitor/suppliers` items)
 * @returns {Object} `{ family: [{value,label}], subFamily, site, subsidiary, buyer }`
 */
export function mergeFilterOptions(previous, items) {
    const known = {
        family: new Map(),
        subFamily: new Map(),
        site: new Map(),
        subsidiary: new Map(),
        buyer: new Map(),
    };
    for (const key of Object.keys(known)) {
        for (const option of (previous && previous[key]) || []) {
            known[key].set(option.value, option);
        }
    }

    /** `workspace://SpacesStore/<uuid>` — an identifier, never a label. */
    const put = (key, value, label) => {
        if (!value) {
            return;
        }
        const existing = known[key].get(value);
        // A later row may carry the label an earlier one did not resolve.
        if (!existing || (!existing.label && label)) {
            // `value` is a readable string for most filters (site, buyer) and a
            // **nodeRef** for the hierarchies — falling back to it there put
            // `workspace://SpacesStore/…` in the dropdown. An option with no
            // label is dropped rather than shown as an identifier: the server
            // resolves these labels, and an unresolved one is a gap, not a value
            // to pick from.
            const readable = label || (NODEREF_RE.test(value) ? '' : value);
            if (!readable) {
                return;
            }
            known[key].set(value, { value, label: readable });
        }
    };

    for (const item of items || []) {
        if (item.family) {
            put('family', item.family.nodeRef, item.family.label);
        }
        if (item.subFamily) {
            put('subFamily', item.subFamily.nodeRef, item.subFamily.label);
        }
        for (const site of item.sites || []) {
            put('site', site.nodeRef, site.label);
        }
        for (const subsidiary of item.subsidiaries || []) {
            put('subsidiary', subsidiary.nodeRef, subsidiary.label);
        }
        put('buyer', item.buyer, item.buyer);
    }

    const sorted = {};
    for (const key of Object.keys(known)) {
        sorted[key] = [...known[key].values()].sort((a, b) =>
            String(a.label).localeCompare(String(b.label)));
    }
    return sorted;
}

/**
 * One filter chip: the value, and a way to drop it.
 */
function FilterChip({ label, value, onClear, clearLabel }) {
    return (
        <span className="pill pill-info pill-sm pill-no-dot max-w-full">
            <span className="truncate">
                <span className="opacity-70">{label} :</span> {value}
            </span>
            <button
                type="button"
                onClick={onClear}
                aria-label={`${clearLabel} — ${label}`}
                className="-me-1 ms-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-white/60"
            >
                <Icon name="close" size={12} />
            </button>
        </span>
    );
}

/**
 * The filter bar.
 *
 * @param {Object} props
 * @param {Object} props.filters current filter set (see {@link readMonitorFilters})
 * @param {Function} props.onChange `(patch) => void` — receives only the changed keys
 * @param {Function} [props.onReset] defaults to `onChange(EMPTY_MONITOR_FILTERS)`
 * @param {Object} [props.options] vocabularies (see {@link mergeFilterOptions})
 * @param {Array<{name: string, mode: string}>} [props.applied] `payload.filters.applied`
 * @param {string[]} [props.unsupported] `payload.filters.unsupported`
 * @param {React.ReactNode} [props.children] extra controls (approval status, sort…)
 * @param {boolean} [props.defaultOpen]
 */
export function MonitorFilters({
    filters,
    onChange,
    onReset,
    options = {},
    applied = [],
    unsupported = [],
    children,
    defaultOpen = false,
    className = '',
}) {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    const reduceMotion = useReducedMotion();
    const [open, setOpen] = useState(defaultOpen);

    const count = activeFilterCount(filters);
    const assocFilters = useMemo(
        () => new Set((applied || []).filter((entry) => entry.mode === 'assoc').map((entry) => entry.name)),
        [applied],
    );
    const unsupportedSet = useMemo(() => new Set(unsupported || []), [unsupported]);

    const patch = useCallback((values) => onChange(values), [onChange]);
    const reset = useCallback(() => {
        if (onReset) {
            onReset();
            return;
        }
        onChange({ ...EMPTY_MONITOR_FILTERS });
    }, [onChange, onReset]);

    const stateOptions = useMemo(
        () => SUPPLIER_STATES.map((entry) => ({ value: entry.value, label: pickLabels(entry, lang) })),
        [lang],
    );

    /** Label of a currently selected value, for the chip row. */
    const labelOf = (key) => {
        const value = filters[key];
        if (!value) {
            return null;
        }
        if (key === 'state') {
            const entry = SUPPLIER_STATES.find((candidate) => candidate.value === value);
            return entry ? pickLabels(entry, lang) : value;
        }
        const option = (options[key] || []).find((candidate) => candidate.value === value);
        return option ? option.label : value;
    };

    /** `assoc` and `unset` are worth saying next to the control itself. */
    const modeBadge = (key) => {
        if (unsupportedSet.has(key)) {
            return (
                <span className="pill pill-neutral pill-sm pill-no-dot" title={local.unsupportedHelp}>
                    <Icon name="block" size={12} />
                    {local.unsupported}
                </span>
            );
        }
        if (assocFilters.has(key)) {
            return (
                <span className="pill pill-warn pill-sm pill-no-dot" title={local.windowScopedHelp}>
                    <Icon name="filter_alt" size={12} />
                    {local.windowScoped}
                </span>
            );
        }
        return null;
    };

    const selectFor = (key) => {
        const list = options[key] || [];
        const disabled = unsupportedSet.has(key) || (list.length === 0 && !filters[key]);
        return (
            <div key={key} className="min-w-0">
                <div className="mb-1 flex items-center justify-between gap-2">
                    <label
                        htmlFor={`monitor-filter-${key}`}
                        className="truncate text-xs font-medium text-[var(--becpg-dark-grey)]"
                    >
                        {local[key]}
                    </label>
                    {modeBadge(key)}
                </div>
                <Select
                    id={`monitor-filter-${key}`}
                    value={filters[key] || ''}
                    disabled={disabled}
                    aria-label={local[key]}
                    placeholder={local.any}
                    options={list}
                    onChange={(event) => patch({ [key]: event.target.value })}
                />
                {disabled && !unsupportedSet.has(key) ? (
                    <p className="mt-1 text-[11px] text-[var(--becpg-dark-grey)]">{local.noVocabulary}</p>
                ) : null}
            </div>
        );
    };

    return (
        <div className={className}>
            {/* ----------------------------------------------------- top row */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[12rem] flex-1 sm:max-w-md">
                    <SearchInput
                        value={filters.q || ''}
                        onChange={(value) => patch({ q: value })}
                        placeholder={local.search}
                    />
                </div>
                <Button
                    variant={open ? 'secondary' : 'outline'}
                    size="md"
                    icon="filter_list"
                    aria-expanded={open}
                    aria-controls="monitor-filter-panel"
                    onClick={() => setOpen((value) => !value)}
                >
                    <span>{local.toggle}</span>
                    {count > 0 ? (
                        <span className="ms-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--becpg-orange)] px-1.5 text-[11px] font-medium text-white">
                            {count}
                        </span>
                    ) : null}
                </Button>
                {children}
                {count > 0 ? (
                    <Button variant="ghost" size="md" icon="restart_alt" onClick={reset}>
                        <span className="hidden sm:inline">{local.reset}</span>
                    </Button>
                ) : null}
            </div>

            {/* ------------------------------------------------- active chips */}
            {count > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-live="polite">
                    <span className="sr-only-text">
                        {fill(count > 1 ? local.activePlural : local.active, { count })}
                    </span>
                    {MONITOR_FILTER_KEYS.filter((key) => filters[key]).map((key) => (
                        <FilterChip
                            key={key}
                            label={key === 'q' ? local.search.replace('…', '') : local[key]}
                            value={key === 'q' ? filters.q : labelOf(key)}
                            clearLabel={local.clearOne}
                            onClear={() => patch({ [key]: '' })}
                        />
                    ))}
                </div>
            ) : null}

            {/* ------------------------------------------------------- panel */}
            <AnimatePresence initial={false}>
                {open ? (
                    <motion.div
                        id="monitor-filter-panel"
                        initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="overflow-hidden"
                    >
                        <fieldset className="mt-3 rounded-xl border border-[var(--becpg-grey)] bg-white p-3 sm:p-4">
                            <legend className="sr-only-text">{local.legend}</legend>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {VOCABULARY_FILTERS.map((key) => selectFor(key))}

                                {/* The buyer is a beCPG username: a datalist gives
                                    the ones we have seen without forbidding the
                                    others, since the park window may not hold them. */}
                                <div className="min-w-0">
                                    <label
                                        htmlFor="monitor-filter-buyer"
                                        className="mb-1 block truncate text-xs font-medium text-[var(--becpg-dark-grey)]"
                                    >
                                        {local.buyer}
                                    </label>
                                    <input
                                        id="monitor-filter-buyer"
                                        list="monitor-filter-buyer-list"
                                        value={filters.buyer || ''}
                                        onChange={(event) => patch({ buyer: event.target.value })}
                                        placeholder={local.anyBuyer}
                                        className="w-full rounded-lg border border-[var(--becpg-grey)] bg-white px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                                    />
                                    <datalist id="monitor-filter-buyer-list">
                                        {(options.buyer || []).map((option) => (
                                            <option key={option.value} value={option.value} />
                                        ))}
                                    </datalist>
                                    <p className="mt-1 text-[11px] text-[var(--becpg-dark-grey)]">
                                        {local.buyerHint}
                                    </p>
                                </div>

                                <div className="min-w-0">
                                    <label
                                        htmlFor="monitor-filter-state"
                                        className="mb-1 block truncate text-xs font-medium text-[var(--becpg-dark-grey)]"
                                    >
                                        {local.state}
                                    </label>
                                    <Select
                                        id="monitor-filter-state"
                                        value={filters.state || ''}
                                        aria-label={local.state}
                                        placeholder={local.any}
                                        options={stateOptions}
                                        onChange={(event) => patch({ state: event.target.value })}
                                    />
                                </div>
                            </div>

                            {unsupportedSet.size > 0 || assocFilters.size > 0 ? (
                                <div className="mt-3 flex flex-col gap-1 border-t border-[var(--becpg-grey)] pt-2">
                                    {assocFilters.size > 0 ? (
                                        <p className="flex items-start gap-1.5 text-[11px] text-[var(--becpg-dark-grey)]">
                                            <Icon name="info" size={13} className="mt-0.5 shrink-0" />
                                            <span>{local.windowScopedHelp}</span>
                                        </p>
                                    ) : null}
                                    {unsupportedSet.size > 0 ? (
                                        <p className="flex items-start gap-1.5 text-[11px] text-[var(--becpg-dark-grey)]">
                                            <Icon name="info" size={13} className="mt-0.5 shrink-0" />
                                            <span>{local.unsupportedHelp}</span>
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}

                            <div className="mt-3 flex justify-end">
                                <Button variant="subtle" size="sm" icon="expand_less" onClick={() => setOpen(false)}>
                                    {local.close}
                                </Button>
                            </div>
                        </fieldset>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
