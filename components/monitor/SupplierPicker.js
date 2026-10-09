'use client';

/**
 * A searchable supplier picker for a park of hundreds of records.
 *
 * A native select listed the whole park with no way to type, and two records
 * with one name could not be told apart. Here the supplier types a part of the
 * name or of a code, each option carries a second line (code, ERP code,
 * family, state) that separates namesakes, and a record read twice by the
 * paginated listing appears once.
 */

import { useId, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LOCAL = defineLabels('components/monitor/SupplierPicker#LOCAL', {
    fr: {
        search: 'Rechercher un fournisseur (nom, code)…',
        none: 'Aucun fournisseur ne correspond.',
        more: '{count} autre(s) : précisez la recherche.',
        clear: 'Changer de fournisseur',
        loading: 'Chargement des fournisseurs…',
    },
    en: {
        search: 'Search a supplier (name, code)…',
        none: 'No supplier matches.',
        more: '{count} more: refine the search.',
        clear: 'Change supplier',
        loading: 'Loading suppliers…',
    },
});

/** Options rendered at once; the rest is reached by typing. */
const MAX_OPTIONS = 50;

/** Lower case without accents, so « elodie » finds « Élodie ». */
function fold(value) {
    return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * The rows once each, in name order.
 *
 * @param {Array<Object>} rows `monitor/suppliers` rows
 * @returns {Array<Object>}
 */
export function uniqueSuppliers(rows) {
    const seen = new Map();
    for (const row of rows || []) {
        if (row?.nodeRef && !seen.has(row.nodeRef)) {
            seen.set(row.nodeRef, row);
        }
    }
    return [...seen.values()].sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));
}

/** The line that tells two suppliers of one name apart. */
function detailOf(row) {
    return [row.code, row.erpCode, row.legalName !== row.name ? row.legalName : null, row.family?.label, row.state]
        .filter(Boolean)
        .join(' · ');
}

function matches(row, terms) {
    const haystack = fold([row.name, row.code, row.erpCode, row.legalName].join(' '));
    return terms.every((term) => haystack.includes(term));
}

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) => (vars[key] ?? match));
}

/**
 * @param {Object} props
 * @param {string} [props.id]
 * @param {Array<Object>} props.suppliers `monitor/suppliers` rows, duplicates allowed
 * @param {string} props.value the chosen nodeRef, `''` for none
 * @param {Function} props.onChange `(nodeRef) => void`, `''` when cleared
 * @param {boolean} [props.loading]
 */
export function SupplierPicker({ id, suppliers, value, onChange, loading = false }) {
    const { lang } = useMessages();
    const local = pickLabels(LOCAL, lang);
    const listId = useId();
    const inputRef = useRef(null);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);

    const rows = useMemo(() => uniqueSuppliers(suppliers), [suppliers]);
    const chosen = value ? rows.find((row) => row.nodeRef === value) : null;
    const terms = fold(query).split(/\s+/).filter(Boolean);
    const found = terms.length > 0 ? rows.filter((row) => matches(row, terms)) : rows;
    const shown = found.slice(0, MAX_OPTIONS);

    const choose = (row) => {
        onChange(row.nodeRef);
        setQuery('');
    };

    const onKeyDown = (event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const step = event.key === 'ArrowDown' ? 1 : -1;
            setActive((current) => Math.max(0, Math.min(shown.length - 1, current + step)));
        }
        else if (event.key === 'Enter' && shown[active]) {
            event.preventDefault();
            choose(shown[active]);
        }
    };

    if (chosen) {
        return (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--becpg-grey)] bg-white px-3 py-2">
                <Icon name="factory" size={18} className="shrink-0 text-[var(--becpg-blue-light)]" />
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[var(--becpg-ink)]">{chosen.name}</span>
                    {detailOf(chosen) ? <span className="block truncate text-xs text-[var(--becpg-dark-grey)]">{detailOf(chosen)}</span> : null}
                </span>
                <button
                    type="button"
                    onClick={() => {
                        onChange('');
                        requestAnimationFrame(() => inputRef.current?.focus());
                    }}
                    aria-label={local.clear}
                    title={local.clear}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--becpg-dark-grey)] hover:bg-[var(--becpg-grey)] hover:text-[var(--becpg-blue)]"
                >
                    <Icon name="close" size={18} />
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            <Input
                ref={inputRef}
                id={id}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={shown[active] ? `${listId}-${active}` : undefined}
                autoComplete="off"
                value={query}
                placeholder={local.search}
                icon="search"
                onChange={(event) => {
                    setQuery(event.target.value);
                    setActive(0);
                }}
                onKeyDown={onKeyDown}
            />
            <ul id={listId} role="listbox" className="max-h-60 overflow-y-auto rounded-lg border border-[var(--becpg-grey)] bg-white py-1">
                {loading && rows.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-[var(--becpg-dark-grey)]">{local.loading}</li>
                ) : shown.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-[var(--becpg-dark-grey)]">{local.none}</li>
                ) : shown.map((row, index) => (
                    <li
                        key={row.nodeRef}
                        id={`${listId}-${index}`}
                        role="option"
                        aria-selected={index === active}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => choose(row)}
                        onMouseEnter={() => setActive(index)}
                        className={`cursor-pointer px-3 py-1.5 ${index === active ? 'bg-[var(--becpg-blue-lighter)]' : ''}`}
                    >
                        <span className="block truncate text-sm text-[var(--becpg-ink)]">{row.name}</span>
                        {detailOf(row) ? <span className="block truncate text-xs text-[var(--becpg-dark-grey)]">{detailOf(row)}</span> : null}
                    </li>
                ))}
                {found.length > MAX_OPTIONS ? (
                    <li className="px-3 py-1.5 text-xs text-[var(--becpg-dark-grey)]">{fill(local.more, { count: found.length - MAX_OPTIONS })}</li>
                ) : null}
            </ul>
        </div>
    );
}
