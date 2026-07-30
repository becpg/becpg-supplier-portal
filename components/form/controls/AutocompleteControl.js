'use client';

/**
 * `autocomplete.ftl` / `autocomplete-association.ftl` — the datasource-backed
 * picker, and the only control in the registry that talks to the network.
 *
 * ## One endpoint, and why it is a POST
 *
 * ```
 * POST /api/v1/autocomplete/{formId}/{fieldId}
 * { itemType, listId, entityNodeRef, q, page, pageSize, values }
 * ```
 *
 * A beCPG datasource is not a static list: its URL lives in the control
 * parameter `ds`, and it can depend on **another field of the same form** —
 * `parent` (a property) or `parentAssoc` (an association). Plants filtered by
 * the chosen supplier is the canonical case (contracts §3). That is why the body
 * carries the *other current form values*: the server resolves the dependency
 * from the definition Share gave it, and appends `parent=` itself.
 *
 * The datasource URL is **never** sent by the browser. It is read server-side
 * from the resolved definition and checked against `becpg/autocomplete/`
 * (`lib/adapters/autocomplete.js`), so this control cannot be turned into a
 * generic Alfresco reader.
 *
 * ## What the picker guarantees
 *
 * - **debounced** typing — one request per pause, not per keystroke;
 * - **paginated on scroll** — beCPG datasources routinely return thousands of
 *   ingredients, and `fullListSize` is what tells us there is more;
 * - **multi-select** when the field repeats (`field.repeating`,
 *   `field.endpointMany`, or the `multipleSelectMode` parameter, which is what
 *   `autocomplete-association.ftl` itself honours first);
 * - **metadata visible** — beCPG returns `metadatas: [{key, value}]`, and the
 *   code under the label is often the only way to tell two ingredients with the
 *   same name apart;
 * - **the dependency resets the list** — when the parent field changes, the
 *   loaded page is dropped, because it was computed for the old parent.
 *
 * A value already stored keeps its label from `displayValue` — beCPG's already
 * localised label. There is no "resolve a nodeRef into a name" endpoint, and
 * inventing one would be a second source of truth for something the definition
 * already carries.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { api } from '@/lib/client';
import { Icon, Spinner } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { controlParams } from '@/components/form/validation';
import { ReadOnlyControl } from '@/components/form/controls/ReadOnlyControl';

/** Pause after the last keystroke before querying, in ms. */
export const DEBOUNCE_MS = 250;

/** Suggestions per page. Matches the adapter's default. */
export const PAGE_SIZE = 25;

/** Distance from the bottom of the list that triggers the next page, in px. */
const SCROLL_THRESHOLD = 32;

/** Delay before a blur closes the list, so a click on an option lands first. */
const BLUR_DELAY = 150;

const LABELS = {
    fr: {
        search: 'Rechercher…',
        loading: 'Recherche…',
        noResult: 'Aucun résultat',
        clear: 'Effacer',
        remove: 'Retirer',
        error: 'La recherche a échoué',
        results: '{count} résultat(s) sur {total}',
    },
    en: {
        search: 'Search…',
        loading: 'Searching…',
        noResult: 'No result',
        clear: 'Clear',
        remove: 'Remove',
        error: 'The search failed',
        results: '{count} result(s) of {total}',
    },
};

/**
 * The values currently held by the field, as an array.
 *
 * @param {*} value
 * @returns {string[]}
 */
export function toValueArray(value) {
    if (value === null || value === undefined || value === '') {
        return [];
    }
    if (Array.isArray(value)) {
        return value.flatMap((entry) => toValueArray(entry));
    }
    if (typeof value === 'object') {
        if ('value' in value) {
            return toValueArray(value.value);
        }
        if ('nodeRef' in value) {
            return [String(value.nodeRef)];
        }
        return [];
    }
    // beCPG posts multiple associations as a comma-separated list of nodeRefs.
    return String(value)
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry !== '');
}

/**
 * True when the field accepts several values.
 *
 * `multipleSelectMode` wins over the model, exactly as
 * `autocomplete-association.ftl` does.
 *
 * @param {Object} field
 * @returns {boolean}
 */
export function isMultiple(field) {
    const params = controlParams(field);
    if (params.multipleSelectMode !== undefined) {
        return params.multipleSelectMode === true || params.multipleSelectMode === 'true';
    }
    return Boolean(field?.repeating || field?.endpointMany);
}

/**
 * The value of the field this datasource depends on.
 *
 * Browser-side twin of `resolveParentValue` in `lib/adapters/autocomplete.js`:
 * it is only used to know **when to drop the loaded page**; the server resolves
 * the parameter it actually sends.
 *
 * @param {Object} field
 * @param {Object} values the other form values
 * @returns {string|null}
 */
export function parentValueOf(field, values) {
    const params = controlParams(field);
    const declared = params.parentAssoc || params.parent;
    if (!declared || !values || typeof values !== 'object') {
        return null;
    }
    const underscored = String(declared).replace(/:/g, '_');
    const prefixed = `${params.parentAssoc ? 'assoc' : 'prop'}_${underscored}`;
    const candidates = [prefixed, underscored, String(declared), underscored.replace('_', ':')];
    for (const key of candidates) {
        if (Object.prototype.hasOwnProperty.call(values, key)) {
            return toValueArray(values[key]).join(',') || null;
        }
    }
    return null;
}

/**
 * Guesses the labels of values that were already stored.
 *
 * `displayValue` is what beCPG sent for the whole field; for a single value it
 * *is* the label, and for several it is the labels joined by a comma. When the
 * counts do not line up the raw value is kept — a visible nodeRef is ugly, an
 * invented label is a lie.
 *
 * @param {string[]} values
 * @param {string|null} displayValue
 * @returns {Object<string, string>}
 */
export function initialLabels(values, displayValue) {
    const labels = {};
    if (!displayValue || values.length === 0) {
        return labels;
    }
    if (values.length === 1) {
        labels[values[0]] = String(displayValue);
        return labels;
    }
    const parts = String(displayValue).split(',').map((entry) => entry.trim());
    if (parts.length === values.length) {
        values.forEach((entry, index) => {
            labels[entry] = parts[index];
        });
    }
    return labels;
}

/**
 * The picker itself. Exported because `AssociationControl` is the same widget
 * with a different default, and because a project may want to reuse it outside
 * the registry.
 *
 * @param {Object} props
 * @param {Object} props.field the normalised field
 * @param {*} props.value current value(s)
 * @param {string|null} [props.displayValue] label beCPG sent for the current value
 * @param {Function} props.onChange receives a string, or an array when multiple
 * @param {boolean} [props.multiple] overrides {@link isMultiple}
 * @param {Object} [props.values] the other form values — dependent datasources
 * @param {string} [props.formId]
 * @param {string} [props.itemType] prefixed type the form edits (required by the route)
 * @param {string} [props.listId]
 * @param {string} [props.entityNodeRef]
 * @param {string} [props.lang]
 * @param {string} [props.error]
 * @param {boolean} [props.invalid]
 * @param {string} [props.id]
 */
export function DatasourcePicker({
    field,
    value,
    displayValue,
    onChange,
    multiple,
    values,
    formId,
    itemType,
    listId,
    entityNodeRef,
    lang = 'fr',
    error,
    invalid = false,
    id,
    ...rest
}) {
    const labels = LABELS[lang] || LABELS.fr;
    const params = controlParams(field);
    const many = multiple === undefined ? isMultiple(field) : multiple;
    const saveTitle = params.saveTitle === true || params.saveTitle === 'true';

    const listboxId = useId();
    const inputRef = useRef(null);
    const blurTimer = useRef(null);

    const selected = toValueArray(value);
    const parentValue = parentValueOf(field, values);

    const [query, setQuery] = useState('');
    const [term, setTerm] = useState('');
    const [focused, setFocused] = useState(false);
    const [active, setActive] = useState(-1);
    const [known, setKnown] = useState(() => initialLabels(selected, displayValue));

    /**
     * The request context is read at request time and never depended on: the
     * other form values change on every keystroke of every other field, and
     * re-querying for that would be absurd. Only the parent value is part of
     * the key.
     */
    const context = useRef({ values, formId, itemType, listId, entityNodeRef, term });
    // Refreshed after every commit, and declared **before** the fetch effect so
    // that it is always up to date by the time a request is built.
    useEffect(() => {
        context.current = { values, formId, itemType, listId, entityNodeRef, term };
    });

    const open = focused;
    const key = open ? `${term} ${parentValue || ''}` : null;

    const [state, setState] = useState({
        key,
        items: [],
        total: 0,
        page: 1,
        loading: Boolean(key),
        error: null,
    });
    // Reset during render when the search changes — the pattern `useApi` uses in
    // `lib/client.js`, so a new search never renders the previous results once.
    if (state.key !== key) {
        setState({ key, items: [], total: 0, page: 1, loading: Boolean(key), error: null });
    }

    const stateRef = useRef(state);
    useEffect(() => {
        stateRef.current = state;
    });

    /**
     * One page of suggestions.
     *
     * @param {number} page
     * @param {AbortSignal} [signal]
     * @returns {Promise<Object>}
     */
    const fetchPage = useCallback(
        (page, signal) => {
            const request = context.current;
            return api.post(
                `autocomplete/${encodeURIComponent(request.formId || 'default')}/${encodeURIComponent(field.id)}`,
                {
                    itemType: request.itemType || null,
                    listId: request.listId || null,
                    entityNodeRef: request.entityNodeRef || null,
                    q: request.term,
                    page,
                    pageSize: PAGE_SIZE,
                    values: request.values || {},
                },
                signal ? { signal } : undefined,
            );
        },
        [field.id],
    );

    useEffect(() => {
        if (!key) {
            return undefined;
        }
        let alive = true;
        const controller = new AbortController();

        fetchPage(1, controller.signal)
            .then((payload) => {
                if (!alive) {
                    return;
                }
                setState({
                    key,
                    items: payload?.items || [],
                    total: Number(payload?.total) || (payload?.items || []).length,
                    page: 1,
                    loading: false,
                    error: null,
                });
            })
            .catch((cause) => {
                if (!alive || cause?.name === 'AbortError') {
                    return;
                }
                setState({ key, items: [], total: 0, page: 1, loading: false, error: cause });
            });

        return () => {
            alive = false;
            controller.abort();
        };
    }, [key, fetchPage]);

    // Debounce: `term` is what triggers a request, and it only moves once the
    // typing has stopped.
    useEffect(() => {
        const timer = setTimeout(() => setTerm(query), DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(
        () => () => {
            if (blurTimer.current) {
                clearTimeout(blurTimer.current);
            }
        },
        [],
    );

    /** Appends the next page. No-op while one is in flight or at the end. */
    const loadMore = useCallback(() => {
        const current = stateRef.current;
        if (!current.key || current.loading || current.items.length >= current.total) {
            return;
        }
        const requestKey = current.key;
        const nextPage = current.page + 1;
        setState((latest) => (latest.key === requestKey ? { ...latest, loading: true } : latest));

        fetchPage(nextPage)
            .then((payload) => {
                setState((latest) => {
                    if (latest.key !== requestKey) {
                        return latest; // the search moved on while we waited
                    }
                    return {
                        ...latest,
                        items: [...latest.items, ...(payload?.items || [])],
                        total: Number(payload?.total) || latest.total,
                        page: nextPage,
                        loading: false,
                    };
                });
            })
            .catch((cause) => {
                setState((latest) =>
                    latest.key === requestKey ? { ...latest, loading: false, error: cause } : latest,
                );
            });
    }, [fetchPage]);

    // A value that arrives with a label (autosave reload, AI suggestion applied)
    // must not lose it.
    const [seenDisplay, setSeenDisplay] = useState(displayValue);
    if (displayValue !== seenDisplay) {
        setSeenDisplay(displayValue);
        const resolved = initialLabels(selected, displayValue);
        if (Object.keys(resolved).length > 0) {
            setKnown((current) => ({ ...resolved, ...current }));
        }
    }

    const labelOf = (entry) => known[entry] || entry;

    const select = (item) => {
        const stored = saveTitle ? item.label : item.value;
        setKnown((current) => ({ ...current, [stored]: item.label }));
        setQuery('');
        setActive(-1);
        if (many) {
            if (!selected.includes(stored)) {
                onChange([...selected, stored]);
            }
            if (inputRef.current) {
                inputRef.current.focus();
            }
            return;
        }
        onChange(stored);
        setFocused(false);
        if (inputRef.current) {
            inputRef.current.blur();
        }
    };

    const remove = (entry) => {
        const next = selected.filter((current) => current !== entry);
        onChange(many ? next : null);
    };

    const onKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setFocused(true);
            setActive((index) => Math.min(index + 1, state.items.length - 1));
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
            return;
        }
        if (event.key === 'Enter') {
            if (active >= 0 && state.items[active]) {
                event.preventDefault();
                select(state.items[active]);
            }
            return;
        }
        if (event.key === 'Escape') {
            setFocused(false);
            setActive(-1);
            return;
        }
        if (event.key === 'Backspace' && query === '' && many && selected.length > 0) {
            remove(selected[selected.length - 1]);
        }
    };

    const onScroll = (event) => {
        const element = event.currentTarget;
        if (element.scrollTop + element.clientHeight >= element.scrollHeight - SCROLL_THRESHOLD) {
            loadMore();
        }
    };

    const singleLabel = !many && selected.length > 0 ? labelOf(selected[0]) : '';

    return (
        <div className="relative" {...rest}>
            {many && selected.length > 0 ? (
                <ul className="mb-1 flex flex-wrap gap-1">
                    {selected.map((entry) => (
                        <li
                            key={entry}
                            className="inline-flex max-w-full items-center gap-1 rounded-lg bg-[var(--becpg-blue-lighter)] px-2 py-1 text-xs text-[var(--becpg-blue)]"
                        >
                            <span className="min-w-0 break-words">{labelOf(entry)}</span>
                            <button
                                type="button"
                                onClick={() => remove(entry)}
                                aria-label={`${labels.remove} ${labelOf(entry)}`}
                                className="shrink-0 rounded-full p-0.5 hover:bg-white/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                            >
                                <Icon name="close" size={14} />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}

            <div className="relative">
                <Input
                    ref={inputRef}
                    id={id}
                    role="combobox"
                    type="text"
                    autoComplete="off"
                    aria-expanded={open}
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    aria-activedescendant={active >= 0 ? `${listboxId}-${active}` : undefined}
                    value={focused ? query : singleLabel}
                    placeholder={labels.search}
                    invalid={Boolean(error) || invalid}
                    icon="search"
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setActive(-1);
                    }}
                    onFocus={() => {
                        if (blurTimer.current) {
                            clearTimeout(blurTimer.current);
                        }
                        setFocused(true);
                    }}
                    onBlur={() => {
                        blurTimer.current = setTimeout(() => {
                            setFocused(false);
                            setQuery('');
                            setActive(-1);
                        }, BLUR_DELAY);
                    }}
                    onKeyDown={onKeyDown}
                />
                {!many && selected.length > 0 && !focused ? (
                    <button
                        type="button"
                        onClick={() => remove(selected[0])}
                        aria-label={labels.clear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--becpg-dark-grey)] hover:bg-[var(--becpg-grey)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                    >
                        <Icon name="close" size={16} />
                    </button>
                ) : null}
            </div>

            {open ? (
                <div
                    id={listboxId}
                    role="listbox"
                    aria-label={field?.label}
                    onScroll={onScroll}
                    className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[var(--becpg-grey)] bg-white py-1 shadow-lg"
                >
                    {state.loading && state.items.length === 0 ? (
                        <p className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--becpg-dark-grey)]">
                            <Spinner size={14} />
                            {labels.loading}
                        </p>
                    ) : null}

                    {state.error ? (
                        <p className="px-3 py-2 text-sm text-[var(--status-danger)]">{labels.error}</p>
                    ) : null}

                    {!state.loading && !state.error && state.items.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-[var(--becpg-dark-grey)]">{labels.noResult}</p>
                    ) : null}

                    {state.items.map((item, index) => {
                        const stored = saveTitle ? item.label : item.value;
                        const isSelected = selected.includes(stored);
                        const metadata = Object.entries(item.metadata || {}).filter(
                            ([, entry]) => entry !== null && entry !== undefined && entry !== '',
                        );
                        return (
                            <button
                                key={`${item.value}-${index}`}
                                id={`${listboxId}-${index}`}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => select(item)}
                                onPointerEnter={() => setActive(index)}
                                className={[
                                    'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm',
                                    index === active ? 'bg-[var(--becpg-blue-lighter)]' : 'bg-transparent',
                                    isSelected ? 'font-medium text-[var(--becpg-blue)]' : '',
                                ].join(' ')}
                            >
                                <span className="flex w-full items-start gap-1.5">
                                    {isSelected ? <Icon name="check" size={14} className="mt-0.5" /> : null}
                                    <span className="min-w-0 break-words">{item.label}</span>
                                </span>
                                {metadata.length > 0 ? (
                                    <span className="flex flex-wrap gap-2 text-xs text-[var(--becpg-dark-grey)]">
                                        {metadata.map(([metaKey, metaValue]) => (
                                            <span key={metaKey}>
                                                {metaKey}: {String(metaValue)}
                                            </span>
                                        ))}
                                    </span>
                                ) : null}
                            </button>
                        );
                    })}

                    {state.items.length > 0 && state.items.length < state.total ? (
                        <p className="px-3 py-1.5 text-center text-xs text-[var(--becpg-dark-grey)]">
                            {state.loading ? (
                                <Spinner size={12} className="inline" />
                            ) : (
                                labels.results
                                    .replace('{count}', String(state.items.length))
                                    .replace('{total}', String(state.total))
                            )}
                        </p>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

/**
 * @param {import('./index').ControlProps} props
 */
export function AutocompleteControl({ readOnly = false, ...props }) {
    if (readOnly) {
        return (
            <ReadOnlyControl
                field={props.field}
                value={props.value}
                displayValue={props.displayValue}
                lang={props.lang}
                id={props.id}
            />
        );
    }
    return <DatasourcePicker {...props} />;
}

AutocompleteControl.handlesRepeating = true;
