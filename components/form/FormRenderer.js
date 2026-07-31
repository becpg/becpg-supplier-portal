'use client';

/**
 * The form engine: it renders **whatever the definition says**, and nothing else.
 *
 * ## The rule
 *
 * Share resolves *which* fields and *how* — the beCPG cascade
 * `formId + entityType + siteId + list`, client overrides included — and the
 * repository describes those fields (doc/becpg-api-contracts.md §1 and §8). The
 * portal renders what it is given. So there is **no form, no field list and no
 * column list anywhere in this file**: a client that adds a field, renames a
 * set, reorders a tab or overrides a control template changes the form, and this
 * component follows without a line of code being written.
 *
 * Consequences worth being explicit about:
 *
 * - a field the definition does not carry cannot be rendered — that is a
 *   feature, it is how a supplier is prevented from seeing an internal field;
 * - a control template nobody implemented degrades to a read-only rendering
 *   rather than to a blank (`controls/index.js`, fallback chain);
 * - the layout comes from the definition's `appearance` and `numberOfColumns`,
 *   never from a per-screen stylesheet.
 *
 * ## Structure
 *
 * ```
 * tabs (only when the definition declares more than one)
 *   └─ sets, nested by `parent`
 *        ├─ appearance: bordered-panel | panel | title | fieldset | 2-column-set | whitespace
 *        └─ fields ── FieldRenderer ── control from the registry
 * ```
 *
 * Sets nest: a `bordered-panel` holding two `panel`s is a shape beCPG uses a
 * lot. A set whose declared parent is missing is hoisted to the root instead of
 * disappearing — a definition is data, and data is sometimes incomplete.
 *
 * ## Mobile first
 *
 * One column below `md`, `numberOfColumns` above (`.form-grid` in
 * `app/globals.css`). Tabs scroll horizontally instead of wrapping into a wall.
 * Everything is reachable at 360px, which is the width the wizard is judged on
 * (spec §4.3).
 */

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { TabScroller } from '@/components/ui/TabScroller';
import { FieldRenderer } from '@/components/form/FieldRenderer';
import { readValue } from '@/components/form/validation';

const LABELS = {
    fr: { empty: 'Aucun champ à saisir', emptyHint: 'La configuration de ce formulaire ne renvoie aucun champ.' },
    en: { empty: 'No field to fill in', emptyHint: 'The configuration of this form returns no field.' },
};

/** Set appearances that draw a container of their own. */
const APPEARANCES = {
    'bordered-panel': 'card',
    panel: 'panel',
    fieldset: 'fieldset',
    title: 'title',
    '2-column-set': 'plain',
    whitespace: 'plain',
    invisible: 'hidden',
};

/**
 * Builds the set tree, honouring `parent` and never losing an orphan.
 *
 * @param {Object[]} sets normalised sets
 * @returns {Object[]} root sets, each with a `children` array
 */
export function buildSetTree(sets) {
    const nodes = (Array.isArray(sets) ? sets : []).map((set) => ({ ...set, children: [] }));
    const byId = new Map(nodes.map((set) => [set.id, set]));
    const roots = [];

    for (const set of nodes) {
        const parentId = set.parent || set.parentId || null;
        const parent = parentId ? byId.get(parentId) : null;
        if (parent && parent !== set) {
            parent.children.push(set);
        }
        else {
            // No parent, or a parent the definition forgot to declare.
            roots.push(set);
        }
    }
    return roots;
}

/**
 * The number of rendering columns of a set.
 *
 * @param {Object} set
 * @returns {number}
 */
function columnsOf(set) {
    if (set.appearance === '2-column-set') {
        return 2;
    }
    const declared = Number(set.numberOfColumns);
    return Number.isFinite(declared) && declared > 0 ? Math.min(declared, 2) : 1;
}

/**
 * One set and its children.
 *
 * @param {Object} props
 */
function SetRenderer({ set, index, depth, fieldsById, renderField, lang }) {
    const shape = APPEARANCES[set.appearance] || 'plain';
    if (shape === 'hidden') {
        return null;
    }

    const fields = (set.fields || [])
        .map((fieldId) => fieldsById.get(fieldId))
        .filter(Boolean);

    const body = (
        <>
            {fields.length > 0 ? (
                <div className={columnsOf(set) > 1 ? 'form-grid' : 'flex flex-col gap-4'}>
                    {fields.map((field) => renderField(field))}
                </div>
            ) : null}
            {set.children.length > 0 ? (
                <div className={`flex flex-col gap-4 ${fields.length > 0 ? 'mt-4' : ''}`}>
                    {set.children.map((child, position) => (
                        <SetRenderer
                            key={child.id}
                            set={child}
                            index={position}
                            depth={depth + 1}
                            fieldsById={fieldsById}
                            renderField={renderField}
                            lang={lang}
                        />
                    ))}
                </div>
            ) : null}
        </>
    );

    // Nothing to show: an empty set must not draw an empty box.
    if (fields.length === 0 && set.children.length === 0) {
        return null;
    }

    if (shape === 'card') {
        return (
            <Card title={set.label || undefined} padding="lg" index={index}>
                {body}
            </Card>
        );
    }

    if (shape === 'fieldset') {
        return (
            <fieldset className="min-w-0 rounded-xl border border-[var(--becpg-grey)] p-4">
                {set.label ? (
                    <legend className="px-1 text-sm font-medium text-[var(--becpg-blue)]">{set.label}</legend>
                ) : null}
                {body}
            </fieldset>
        );
    }

    if (shape === 'panel' || shape === 'title') {
        const Heading = depth === 0 ? 'h3' : 'h4';
        return (
            <section className="min-w-0">
                {set.label ? (
                    <Heading
                        className={[
                            'mb-3 font-medium text-[var(--becpg-blue)]',
                            depth === 0 ? 'text-base' : 'text-sm',
                            shape === 'panel' ? 'border-b border-[var(--becpg-grey)] pb-1' : '',
                        ]
                            .filter(Boolean)
                            .join(' ')}
                    >
                        {set.label}
                    </Heading>
                ) : null}
                {body}
            </section>
        );
    }

    return <div className="min-w-0">{body}</div>;
}

/**
 * @param {Object} props
 * @param {Object} props.definition `{ tabs, sets, fields, formId, itemType }` — normalised by `lib/adapters/forms.js`
 * @param {Object} [props.values] current values, keyed by `field.name`, `formsName` or `id`.
 *   When a field is absent from the map, the value carried by the definition (`applyValues`) is used.
 * @param {'view'|'edit'|'create'} [props.mode='edit']
 * @param {(name: string, value: *, field: Object) => void} [props.onChange] called with the **prefixed field name**
 * @param {(event: Event) => void} [props.onSubmit] renders a `<form>`; omit for a plain container
 * @param {boolean} [props.readOnly=false] forces the whole form read-only (frozen step, delegated entry)
 * @param {string} [props.entityNodeRef] entity context, for datasources
 * @param {string} [props.formId] overrides `definition.formId`
 * @param {string} [props.itemType] overrides `definition.itemType`
 * @param {string} [props.listId] datalist name, when the form edits a grid row
 * @param {Object} [props.errors] `{ [field.name]: messageKey }` — the shape `validation.js` returns
 * @param {string} [props.lang='fr']
 * @param {(field: Object) => React.ReactNode} [props.badgeFor] extra badge after a label (AI confidence…)
 * @param {(field: Object) => React.ReactNode} [props.actionFor] extra action at the right of a label (comments…)
 * @param {React.ReactNode} [props.footer] rendered after the sets — the wizard's buttons
 *
 * @example
 * <FormRenderer
 *     definition={definition}
 *     values={values}
 *     mode="edit"
 *     errors={errors}
 *     onChange={(name, value) => setValue(name, value)}
 *     entityNodeRef={entityNodeRef}
 * />
 */
export function FormRenderer({
    definition,
    values,
    mode = 'edit',
    onChange,
    onSubmit,
    readOnly = false,
    entityNodeRef,
    formId,
    itemType,
    listId,
    errors,
    lang = 'fr',
    badgeFor,
    actionFor,
    footer,
    className = '',
}) {
    const labels = LABELS[lang] || LABELS.fr;
    const tabs = useMemo(
        () => (Array.isArray(definition?.tabs) ? definition.tabs : []),
        [definition],
    );
    const [activeTab, setActiveTab] = useState(tabs.length > 0 ? tabs[0].id : null);

    const fieldsById = useMemo(() => {
        const map = new Map();
        for (const field of definition?.fields || []) {
            map.set(field.id, field);
        }
        return map;
    }, [definition]);

    const tree = useMemo(() => buildSetTree(definition?.sets), [definition]);

    // A tab that disappeared between two definitions (a step reloaded read-only,
    // a client override) must not leave the form blank.
    const currentTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : tabs[0]?.id || null;

    const untabbed = tree.filter((set) => !set.tab);
    const tabbed = currentTab ? tree.filter((set) => set.tab === currentTab) : [];

    /** Which tabs hold an error — a red dot beats a silent invalid tab. */
    const tabsInError = useMemo(() => {
        if (!errors || Object.keys(errors).length === 0) {
            return new Set();
        }
        const flagged = new Set();
        for (const field of definition?.fields || []) {
            if (errors[field.name] && field.tab) {
                flagged.add(field.tab);
            }
        }
        return flagged;
    }, [errors, definition]);

    const formReadOnly = readOnly || mode === 'view';

    const renderField = (field) => {
        const fromValues = readValue(values, field);
        const value = fromValues.found ? fromValues.value : field.value;
        const displayValue = fromValues.found && fromValues.displayValue !== null
            ? fromValues.displayValue
            : field.displayValue;

        return (
            <FieldRenderer
                key={field.id}
                field={field}
                value={value}
                displayValue={displayValue}
                onChange={(next, changed) => {
                    if (onChange) {
                        onChange(changed.name, next, changed);
                    }
                }}
                readOnly={formReadOnly}
                error={errors ? errors[field.name] : undefined}
                values={values}
                formId={formId || definition?.formId || undefined}
                itemType={itemType || definition?.itemType || undefined}
                listId={listId}
                entityNodeRef={entityNodeRef}
                lang={lang}
                badge={badgeFor ? badgeFor(field) : undefined}
                action={actionFor ? actionFor(field) : undefined}
            />
        );
    };

    const content =
        (definition?.fields || []).length === 0 ? (
            <EmptyState icon="edit_note" title={labels.empty} message={labels.emptyHint} />
        ) : (
            <>
                {tabs.length > 1 ? (
                    /* Same overflow affordance as the product sheet's bar: a
                       Share form config can declare a dozen sets, and this row
                       scrolled silently too. `surface="card"` because it sits on
                       a white Card, not on the page grey — that is what the edge
                       fade has to fade into. */
                    <TabScroller
                        ariaLabel={definition?.formId || 'tabs'}
                        activeKey={currentTab}
                        surface="card"
                        className="-mx-1 mb-4"
                        /* No `gap-*` here: `.tab-track` declares the gap and is
                           unlayered CSS, which beats Tailwind's utility layer —
                           the same trap `/help`'s topic rail documents. The
                           padding is what a pill tab's focus ring needs so it is
                           not clipped by `overflow-x`. */
                        trackClassName="px-1 pb-1"
                    >
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                data-tab-key={tab.id}
                                tabIndex={tab.id === currentTab ? 0 : -1}
                                aria-selected={tab.id === currentTab}
                                onClick={() => setActiveTab(tab.id)}
                                className={[
                                    'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]',
                                    tab.id === currentTab
                                        ? 'bg-[var(--becpg-blue)] text-white'
                                        : 'bg-[var(--becpg-grey)] text-[var(--becpg-blue)] hover:bg-[var(--becpg-blue-lighter)]',
                                ].join(' ')}
                            >
                                {tab.label}
                                {tabsInError.has(tab.id) ? (
                                    <span
                                        className="status-dot status-dot-danger"
                                        aria-label="!"
                                        role="img"
                                    />
                                ) : null}
                            </button>
                        ))}
                    </TabScroller>
                ) : null}

                <div className="flex flex-col gap-4 sm:gap-6">
                    {[...untabbed, ...tabbed].map((set, index) => (
                        <SetRenderer
                            key={set.id}
                            set={set}
                            index={index}
                            depth={0}
                            fieldsById={fieldsById}
                            renderField={renderField}
                            lang={lang}
                        />
                    ))}
                </div>
            </>
        );

    if (onSubmit) {
        return (
            <form
                onSubmit={onSubmit}
                // The portal validates against the definition, not against the
                // browser's idea of a valid input.
                noValidate
                className={`min-w-0 ${className}`}
            >
                {content}
                {footer ? <div className="mt-6">{footer}</div> : null}
            </form>
        );
    }

    return (
        <div className={`min-w-0 ${className}`}>
            {content}
            {footer ? <div className="mt-6">{footer}</div> : null}
        </div>
    );
}
