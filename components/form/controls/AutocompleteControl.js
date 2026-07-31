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
 *
 * ## What a suggestion looks like, and why
 *
 * Share's list is one line per result and that line holds **an icon and a
 * name**. `autocomplete-picker.js:343` is the whole of it:
 *
 * ```html
 * <span id='ac-choice-{field}-{nodeRef}' class='{cssClass}'>
 *   <span class='ctn-fav'></span> {name}
 * </span>
 * ```
 *
 * The response is positional — `[value, name, cssClass, metadatas]` — and each
 * field has exactly one job:
 *
 * | field | Share does | the portal does |
 * |---|---|---|
 * | `value` | the stored nodeRef | unchanged, still the nodeRef |
 * | `name` | the visible label, code included (`Benzo[a]pyrene - 50-32-8`) | the label |
 * | `cssClass` | a 16×16 background image, `+ favourite` when starred | the vendored PNG, `+` a star |
 * | `metadatas.color` | a chip, when `showColor` | a chip |
 * | `metadatas.title` / `.description` | a hover tooltip, when `showToolTip` | the row's `title` |
 * | `metadatas.type` | **nothing, ever** | **nothing, ever** |
 *
 * That last row is the defect this rewrite closes. `metadatas.type` is the
 * prefixed Alfresco type, put there by
 * `TargetAssocAutoCompleteExtractor:73` (`props.put("type",
 * type.toPrefixString(namespaceService))`), and the picker used to render every
 * metadata entry as `key: value` — so each suggestion carried a second line
 * reading `type: bcpg:ing`. A supplier was being shown the repository's model.
 *
 * Everything else here follows the same source: the header sentence Share shows
 * above every list, the first result highlighted so `↵` always has a target,
 * the count line only when the datasource holds more than one page, the caret
 * that browses everything, and free text left alone (`forceSelection = false`).
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/client';
import { Icon, Spinner } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { ListIcon } from '@/components/ui/ListIcon';
import { hasListIcon } from '@/lib/listIcons';
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

/** Narrowest the suggestion panel may be, whatever the width of the cell. */
const MIN_PANEL_WIDTH = 240;

/** Widest it may be. Share's own panel measures 390–400px. */
const MAX_PANEL_WIDTH = 416;

/** Below this much room under the field, the panel opens upwards instead. */
const MIN_ROOM_BELOW = 180;

const LABELS = {
    fr: {
        search: 'Rechercher…',
        // Share's own header sentence, shown above every result list
        // (`autocomplete.css .ac-header`), translated the way Share translates it.
        hint: 'Pour filtrer entrez un nom ou un code',
        loading: 'Recherche…',
        noResult: 'Aucun résultat',
        clear: 'Effacer',
        remove: 'Retirer',
        browse: 'Afficher les valeurs',
        error: 'La recherche a échoué',
        showing: 'Affichage des éléments 1 - {count} sur {total}',
        favourite: 'Favori',
    },
    en: {
        search: 'Search…',
        hint: 'Enter name or code to filter data',
        loading: 'Searching…',
        noResult: 'No result',
        clear: 'Clear',
        remove: 'Remove',
        browse: 'Show values',
        error: 'The search failed',
        showing: 'Showing items 1 - {count} of {total}',
        favourite: 'Favourite',
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
 * The icon key of a suggestion.
 *
 * beCPG returns it as `cssClass` — the third positional field of the YUI
 * response (`oResultData[2]`), which Share writes straight into
 * `<span class='{cssClass}'>` and turns into a 16×16 background image
 * (`beCPG.css:940`). It is a *class list*, not a class: the repository appends
 * `favourite` to it when the node is one of the user's favourites
 * (`TargetAssocAutoCompleteExtractor:76` — `cssClass += "  favourite"`, two
 * spaces and all), so the type is the first token and nothing else.
 *
 * @param {string|null|undefined} cssClass
 * @returns {string|null}
 */
export function iconKeyOf(cssClass) {
    if (!cssClass) {
        return null;
    }
    const [first] = String(cssClass).trim().split(/\s+/);
    return first || null;
}

/**
 * Is this suggestion one of the user's favourites?
 *
 * @param {string|null|undefined} cssClass
 * @returns {boolean}
 */
export function isFavourite(cssClass) {
    return /(^|\s)favourite(\s|$)/.test(String(cssClass || ''));
}

/**
 * The 16px glyph in front of a suggestion.
 *
 * Share renders `<span class="{cssClass}">` unconditionally and lets CSS decide:
 * a class it has a picture for gets `background-image` and `padding-left: 20px`,
 * a class it does not gets **nothing at all** — no icon, no placeholder. This
 * keeps that rule (`hasListIcon` is exactly "beCPG ships a glyph for this
 * type"), with one deviation: the empty case still reserves the box, so the
 * labels of a mixed list stay on one vertical line instead of stepping in and
 * out by 16px from row to row.
 *
 * @param {Object} props
 * @param {string|null} props.cssClass
 */
function OptionIcon({ cssClass }) {
    const key = iconKeyOf(cssClass);
    if (!key || !hasListIcon(key)) {
        return <span aria-hidden="true" className="h-4 w-4 shrink-0" />;
    }
    return <ListIcon type={key} size={16} />;
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
    const anchorRef = useRef(null);
    const listRef = useRef(null);
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
    const key = open ? `${term}\u0000${parentValue || ''}` : null;

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
        // The highlight belonged to the previous result set. Left alone it kept
        // pointing at an index that no longer existed, and Enter selected
        // nothing at all.
        setActive(-1);
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
                const items = payload?.items || [];
                setState({
                    key,
                    items,
                    total: Number(payload?.total) || items.length,
                    page: 1,
                    loading: false,
                    error: null,
                });
                // Share highlights the first result as soon as the list opens,
                // so Enter always has a target and a keyboard user never has to
                // press ↓ before pressing ↵.
                setActive(items.length > 0 ? 0 : -1);
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

    /* ------------------------------------------------------------ placement */

    /*
     * The panel is rendered into `document.body` and positioned `fixed`.
     *
     * Not a preference: inside the datalist the control lives in a `<td>` of a
     * table wrapped in `.table-scroll`, whose `overflow-x: auto` computes
     * `overflow-y: auto` too — so an absolutely-positioned list is **clipped**
     * by the bottom of the grid. That is precisely the case that matters, since
     * the row a supplier is typing into is the last one. The same applies to
     * any card or modal with its own scroller.
     */
    const [anchor, setAnchor] = useState(null);

    const place = useCallback(() => {
        const element = anchorRef.current;
        if (!element || typeof window === 'undefined') {
            return;
        }
        const box = element.getBoundingClientRect();
        setAnchor({
            top: box.top,
            bottom: box.bottom,
            left: box.left,
            width: box.width,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
        });
    }, []);

    useEffect(() => {
        if (!open) {
            return undefined;
        }
        place();
        const onViewportChange = () => place();
        window.addEventListener('resize', onViewportChange);
        // `capture: true` so the panel also follows the grid's own horizontal
        // scroller and any scrolling ancestor, not just the window.
        window.addEventListener('scroll', onViewportChange, true);
        return () => {
            window.removeEventListener('resize', onViewportChange);
            window.removeEventListener('scroll', onViewportChange, true);
        };
    }, [open, place]);

    // Keep the highlighted option inside the scrolling area — a keyboard user
    // must never be moving a selection they cannot see.
    useEffect(() => {
        if (!open || active < 0 || !listRef.current) {
            return;
        }
        const option = listRef.current.querySelector(`[data-index="${active}"]`);
        if (option && typeof option.scrollIntoView === 'function') {
            option.scrollIntoView({ block: 'nearest' });
        }
    }, [open, active]);

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
            /*
             * `preventDefault` here is load-bearing twice over: it stops the
             * caret jumping to the end of the field, and it is the signal the
             * grid row reads (`DataListRow.handleKeyDown` skips a
             * `defaultPrevented` arrow) to know that an open suggestion list
             * owns the key and the focus must not move to the row below.
             */
            event.preventDefault();
            setFocused(true);
            setActive((index) => {
                const next = Math.min(index + 1, state.items.length - 1);
                // At the end of what is loaded, ↓ fetches the next page rather
                // than doing nothing: on a datasource of several thousand
                // ingredients, scrolling is not available to a keyboard user.
                if (next === state.items.length - 1) {
                    loadMore();
                }
                return next;
            });
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
            return;
        }
        if (event.key === 'Home' && open && state.items.length > 0) {
            event.preventDefault();
            setActive(0);
            return;
        }
        if (event.key === 'End' && open && state.items.length > 0) {
            event.preventDefault();
            setActive(state.items.length - 1);
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
            /*
             * An open suggestion list **consumes** Escape.
             *
             * In a datalist the picker sits inside a `<tr>` whose own `onKeyDown`
             * treats Escape as "discard this row" (`DataListRow.handleKeyDown` →
             * `list.discardRow`). Without this guard, dismissing the suggestions
             * threw away every pending edit of the whole row: measured on
             * `bcpg:physicoChemList`, a cell typed as `APRES-ESCAPE` reverted to the
             * stored `AVANT`, no request was sent, and nothing told the supplier his
             * line had just been reset.
             *
             * When the list is closed the key is *not* consumed, so Escape keeps its
             * meaning of "cancel my changes to this row".
             */
            if (open) {
                event.stopPropagation();
            }
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

    /*
     * Geometry of the panel, computed from the anchor rather than declared.
     *
     * `minWidth` is the field's own width — never narrower — but never narrower
     * than {@link MIN_PANEL_WIDTH} either, because in a grid the field is the
     * width of a column and an ingredient name is not. `left` is clamped so a
     * cell at the right edge of a wide grid does not push the panel off screen,
     * and the list flips above the field when the room below runs out.
     */
    const roomBelow = anchor ? anchor.viewportHeight - anchor.bottom : 0;
    const dropUp = Boolean(anchor) && roomBelow < MIN_ROOM_BELOW && anchor.top > roomBelow;
    const panelStyle = anchor
        ? {
            left: `${Math.max(8, Math.min(anchor.left, anchor.viewportWidth - MIN_PANEL_WIDTH - 8))}px`,
            minWidth: `${Math.max(anchor.width, MIN_PANEL_WIDTH)}px`,
            maxWidth: `${Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, anchor.viewportWidth - 16))}px`,
            maxHeight: `${Math.max(140, (dropUp ? anchor.top : roomBelow) - 16)}px`,
            ...(dropUp
                ? { bottom: `${Math.max(8, anchor.viewportHeight - anchor.top + 4)}px` }
                : { top: `${anchor.bottom + 4}px` }),
        }
        // Measured on the first paint after opening; until then it must not
        // flash at 0,0.
        : { visibility: 'hidden' };

    // Built only while it is open: a datalist page can hold thirty of these
    // controls at once, and a closed one must cost nothing.
    const panel = !open ? null : (
        <div
            className="becpg-ac-panel"
            style={panelStyle}
            /*
             * The panel must never steal the focus from the field: `mousedown`
             * is what would blur it, and the blur is what would close the panel
             * before the `click` on the option ever landed.
             */
            onMouseDown={(event) => event.preventDefault()}
        >
            {/* Share shows this line above every result list, always, even
                while loading and even when there is nothing to show. */}
            <p className="becpg-ac-header">{labels.hint}</p>

            {state.loading && state.items.length === 0 ? (
                <p className="becpg-ac-note" role="status">
                    <Spinner size={14} />
                    {labels.loading}
                </p>
            ) : null}

            {state.error ? (
                <p className="becpg-ac-note" role="status" style={{ color: 'var(--status-danger)' }}>
                    <Icon name="error_outline" size={14} />
                    {labels.error}
                </p>
            ) : null}

            {/*
              * Share renders no empty state at all: YUI simply never expands the
              * container, and the field is left looking as though nothing had
              * happened. Over HTTP that is indistinguishable from a request
              * still in flight, so the portal says it.
              */}
            {!state.loading && !state.error && state.items.length === 0 ? (
                <p className="becpg-ac-note" role="status">
                    {labels.noResult}
                </p>
            ) : null}

            {/*
              * Rendered even when it is empty, on purpose: the input's
              * `aria-controls` points at this id and `aria-activedescendant` at
              * one of its children, and neither may dangle while the combobox
              * says it is expanded.
              */}
            <ul
                ref={listRef}
                id={listboxId}
                role="listbox"
                aria-label={field?.label}
                className="becpg-ac-list"
                onScroll={onScroll}
            >
                {state.items.map((item, index) => {
                    const stored = saveTitle ? item.label : item.value;
                    const isSelected = selected.includes(stored);
                    const isActive = index === active;
                    const colour = item.metadata?.color;
                    /*
                     * `metadata` is `[{key,value}]` flattened — `type`, `color`,
                     * and `title` / `description` when the node is titled
                     * (`TargetAssocAutoCompleteExtractor:70-84`).
                     *
                     * **`type` is the defect.** It holds the prefixed Alfresco
                     * type — `bcpg:ing` — and the picker used to print every
                     * metadata entry as `key: value`, so every suggestion
                     * carried a line reading `type: bcpg:ing`. Share never shows
                     * it: `formatResult` emits the icon and the name, and
                     * nothing else. `title` and `description` are its tooltip
                     * content (`showToolTip`, off by default), so they go where
                     * a tooltip goes — the row's `title` — and the colour goes
                     * where `showColor` puts it, in a chip.
                     */
                    const tooltip = [item.label, item.metadata?.description]
                        .filter((entry) => entry !== null && entry !== undefined && entry !== '')
                        .join(' — ');
                    return (
                        <li
                            key={`${item.value}-${index}`}
                            id={`${listboxId}-${index}`}
                            role="option"
                            aria-selected={isSelected}
                            data-index={index}
                            data-active={isActive ? 'true' : undefined}
                            data-selected={isSelected && !isActive ? 'true' : undefined}
                            title={tooltip}
                            className="becpg-ac-option"
                            onMouseEnter={() => setActive(index)}
                            onClick={() => select(item)}
                        >
                            <OptionIcon cssClass={item.cssClass} />
                            {colour ? (
                                <span
                                    aria-hidden="true"
                                    className="becpg-ac-swatch"
                                    style={{ backgroundColor: colour }}
                                />
                            ) : null}
                            <span className="becpg-ac-label">{item.label}</span>
                            {isFavourite(item.cssClass) ? (
                                <Icon name="star" size={13} title={labels.favourite} />
                            ) : null}
                            {isSelected ? <Icon name="check" size={14} /> : null}
                        </li>
                    );
                })}
            </ul>

            {/* Share's own footer, which it draws only when the datasource has
                more to give than the page it returned. */}
            {state.items.length > 0 && state.items.length < state.total ? (
                <p className="becpg-ac-footer">
                    {state.loading ? (
                        <Spinner size={12} className="inline" />
                    ) : (
                        labels.showing
                            .replace('{count}', String(state.items.length))
                            .replace('{total}', String(state.total))
                    )}
                </p>
            ) : null}
        </div>
    );

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

            <div ref={anchorRef} className="flex items-center gap-1">
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
                    /*
                     * While the field has the focus its value is what is being
                     * typed, so the stored label would otherwise be invisible
                     * exactly when it is being replaced. Showing it as the
                     * placeholder keeps "what is currently saved" on screen for
                     * the whole edit, without a request and without the risk of
                     * committing the old label by pressing ↵ on it.
                     */
                    placeholder={singleLabel || labels.search}
                    invalid={Boolean(error) || invalid}
                    className="min-w-0 flex-1"
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
                {/*
                  * Clearing is available whenever there is something to clear —
                  * it used to appear only while the field was *not* focused,
                  * which is to say it vanished the moment anyone reached for it.
                  */}
                {!many && selected.length > 0 ? (
                    <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                            remove(selected[0]);
                            setQuery('');
                        }}
                        aria-label={labels.clear}
                        title={labels.clear}
                        className="becpg-ac-button focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                    >
                        <Icon name="close" size={16} />
                    </button>
                ) : null}
                {/*
                  * Share's `.ac-toogle`: the caret that opens the list on an
                  * empty query, i.e. browses the whole datasource.
                  *
                  * Out of the tab order (`tabIndex={-1}`) and not `aria-hidden`:
                  * it is a *redundant* affordance — focusing the field already
                  * opens the list — so it must not add a second tab stop per
                  * cell in a grid of thirty pickers, but it stays reachable and
                  * named for anyone who lands on it.
                  */}
                <button
                    type="button"
                    tabIndex={-1}
                    aria-label={labels.browse}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                        if (open) {
                            setFocused(false);
                            return;
                        }
                        setQuery('');
                        setFocused(true);
                        if (inputRef.current) {
                            inputRef.current.focus();
                        }
                    }}
                    title={labels.browse}
                    className="becpg-ac-button focus:outline-none"
                >
                    <Icon name={open ? 'expand_less' : 'expand_more'} size={16} />
                </button>
            </div>

            {/* No "mounted" flag: `open` follows the focus, so it is never true
                during SSR or hydration and both trees render nothing. */}
            {panel && typeof document !== 'undefined' ? createPortal(panel, document.body) : null}
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
