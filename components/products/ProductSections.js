'use client';

/**
 * The tabbed body of the product sheet — **every wizard section, read only**.
 *
 * ## Why this file exists
 *
 * A supplier consults its product in Share through `entity-data-lists?list=…`:
 * ingredients, nutrients, allergens, physico-chemical characteristics, claims,
 * microbiology, organoleptic, questionnaire(s), documents. The portal sheet used
 * to show the properties form and nothing else, which made it strictly less
 * useful than Share. This component brings all of it back, in consultation mode.
 *
 * ## The one rule: the tabs ARE the wizard steps
 *
 * There is **no list of lists anywhere in this file**. The tabs are built from
 * `GET /api/v1/wizard/{entityId}`, in the order beCPG resolved them, with the
 * labels beCPG already translated (`step.label` / `step.title`). A client that
 * comments a step out (Bridor and `microbioList`) or declares four
 * questionnaires (Aryzta, `surveyList@1..3`) sees exactly its own configuration,
 * because the step list is data and this file only walks it.
 *
 * Two tabs are the portal's own and are appended after the steps — they are not
 * wizard steps and have no equivalent in it: **Conformité** (the catalogs and
 * their missing fields) and **Cahiers des charges**. **Documents** is the wizard's
 * own `documents` step when the configuration declares one, and the portal's
 * requirement check-list otherwise — never both, never twice.
 *
 * ## Read only, on purpose
 *
 * This is a consultation sheet, not the wizard: `readOnly` is passed explicitly
 * to every panel instead of being inherited from the server verdict, which may
 * well say "writable" when the supplier holds a task. `useDataList` then reports
 * `canCreate` / `canReorder` / `canDeleteRow` as false, and the add, delete and
 * reorder affordances are **not rendered at all** — the editing path is the
 * wizard, reachable from the task, and duplicating it here would give two places
 * to save the same row.
 *
 * ## Loading
 *
 * One request for the wizard structure (issued by the page), then **one request
 * per tab, the first time it is opened**. An opened panel stays mounted and
 * hidden, so coming back to it costs nothing. Ten steps therefore cost one call
 * on load, not eleven.
 *
 * ## States
 *
 * Every panel has four: skeleton, data, "aucune donnée renseignée", and a failure
 * that names itself. The step endpoint can answer `share_session_required`
 * (502, doc/becpg-api-contracts.md §8 — Share resolves the columns and needs its
 * own session): that is rendered as an explicit "configuration indisponible",
 * scoped to that tab, and the other tabs keep working.
 */

import { useMemo, useState } from 'react';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Button';
import { ListIcon } from '@/components/ui/ListIcon';
import { TabScroller } from '@/components/ui/TabScroller';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import { CatalogPanel } from '@/components/products/CatalogPanel';
import { SpecPanel } from '@/components/specs/SpecPanel';
import { RequirementChecklist } from '@/components/documents/RequirementChecklist';
import { DataListEditor } from '@/components/datalist/DataListEditor';
import { DataListCardRow } from '@/components/datalist/DataListCardRow';
import { isNestedColumn, useDataList } from '@/components/datalist/useDataList';
import { formatDate, formatDateTime, isIsoTimestamp } from '@/lib/format';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { parseListId } from '@/config/wizards.default';

/**
 * Portal chrome for this screen. Business labels — the tab names, the section
 * titles, the column headers — are **never** here: they come translated from
 * beCPG (AGENTS.md rule 4). The only labels below are the portal's own tabs
 * (Conformité, Cahiers des charges) and the sentences of the empty / error
 * surfaces.
 */
const LABELS = {
    fr: {
        sheet: 'Fiche',
        compliance: 'Conformité',
        documents: 'Documents',
        specs: 'Cahiers des charges',
        sections: 'Sections de la fiche',
        noProperties: 'Aucune propriété à afficher',
        noPropertiesHint:
            'Les propriétés de ce produit ne sont pas exposées par la configuration de l’assistant.',
        rawProperties: 'Propriétés',
        rawNotice:
            'Libellés techniques : la configuration de l’assistant n’est pas disponible pour ce produit.',
        noData: 'Aucune donnée renseignée',
        noDataHint: 'Cette section ne contient aucune ligne pour ce produit.',
        configTitle: 'Configuration indisponible',
        configHint:
            'La configuration de cette section n’a pas pu être chargée. Les autres onglets restent consultables.',
        documentsHint: 'Ce que votre client attend sur ce produit, et pour quand.',
        readOnly: 'Consultation seule : la saisie se fait depuis la tâche qui vous est assignée.',
        yes: 'Oui',
        no: 'Non',
    },
    en: {
        sheet: 'Sheet',
        compliance: 'Compliance',
        documents: 'Documents',
        specs: 'Specifications',
        sections: 'Sheet sections',
        noProperties: 'No property to display',
        noPropertiesHint: 'This product’s properties are not exposed by the wizard configuration.',
        rawProperties: 'Properties',
        rawNotice: 'Technical labels: the wizard configuration is not available for this product.',
        noData: 'No data provided',
        noDataHint: 'This section holds no row for this product.',
        configTitle: 'Configuration unavailable',
        configHint:
            'The configuration of this section could not be loaded. The other tabs remain available.',
        documentsHint: 'What your customer expects on this product, and by when.',
        readOnly: 'View only: data entry happens from the task assigned to you.',
        yes: 'Yes',
        no: 'No',
    },
};

/** A questionnaire is read top to bottom, in one page: no pager on a survey. */
const SURVEY_PAGE_SIZE = 200;

/**
 * The URL segment identifying a step in `?tab=`.
 *
 * The list name is used rather than the step id, so a bookmark keeps pointing at
 * "the ingredients" even if the configuration renumbers its steps. `parseListId`
 * splits the `@N` suffix beCPG uses for several instances of the same list
 * (Aryzta's questionnaires, spec §2ter.1): `surveyList@1` → `surveyList-1`.
 *
 * @param {Object} step a step of `GET /api/v1/wizard/{entityId}`
 * @returns {string}
 */
export function stepTabKey(step) {
    const parsed = parseListId(step.listId);
    const name = parsed.name || step.listName || null;
    if (name) {
        const index = parsed.index || step.listIndex || 0;
        return index > 0 ? `${name}-${index}` : name;
    }
    // A step without a list: the properties and the documents. They carry no
    // name of their own, and `step7` in a URL means nothing to anybody — the two
    // types are unique in every configuration shipped, and a duplicate falls
    // back to the step id in `buildProductTabs`.
    if (step.type === 'form') {
        return 'sheet';
    }
    if (step.type === 'documents') {
        return 'documents';
    }
    return step.id;
}

/**
 * The type that decides a step's icon (`lib/listIcons.js`).
 *
 * It is the **list name**, not the step id and not the label: `nutList` is what
 * beCPG's own CSS keys the apple glyph on, and it is stable across instances
 * where the label ("Nutriments", "Nutritional values", a client's own wording)
 * is not. `surveyList@2` normalises to `surveyList` inside the resolver, so
 * Aryzta's four questionnaires all get the questionnaire icon.
 *
 * @param {Object} step a step of `GET /api/v1/wizard/{entityId}`
 * @returns {string} a list name, or the step type when the step has no list
 */
export function stepIconType(step) {
    const parsed = parseListId(step.listId);
    return parsed.name || step.listName || step.type || '';
}

/**
 * Builds the tab list: the wizard steps as beCPG ordered them, then the portal's
 * own sections.
 *
 * The properties tab is synthesised only when the configuration declares no
 * `form` step (or when the wizard could not be read at all) — the sheet must
 * never lose its properties, even degraded to the raw attributes.
 *
 * @param {Object[]} steps steps of the wizard state; `[]` when it is unavailable
 * @param {Object} labels the chrome dictionary
 * @returns {Array<{key: string, label: string, kind: string, iconType: string, step: Object|null}>}
 */
export function buildProductTabs(steps, labels) {
    const wizardSteps = Array.isArray(steps) ? steps : [];
    const tabs = [];
    const taken = new Set();

    const push = (tab) => {
        // Two steps can only collide when a configuration repeats a list name
        // without the `@N` suffix; the step id is unique by construction.
        const key = taken.has(tab.key) ? (tab.step ? tab.step.id : `${tab.key}-2`) : tab.key;
        taken.add(key);
        tabs.push({ ...tab, key });
    };

    for (const step of wizardSteps) {
        push({
            key: stepTabKey(step),
            // Already translated by beCPG — the portal never translates a business label.
            label: step.label || step.title || labels[step.type] || step.id,
            kind: step.type,
            iconType: stepIconType(step),
            step,
        });
    }

    if (!wizardSteps.some((step) => step.type === 'form')) {
        // No form step: the properties still open the sheet, from the raw attributes.
        tabs.unshift({ key: 'sheet', label: labels.sheet, kind: 'form', iconType: 'form', step: null });
        taken.add('sheet');
    }

    push({ key: 'compliance', label: labels.compliance, kind: 'compliance', iconType: 'compliance', step: null });
    push({ key: 'specs', label: labels.specs, kind: 'specs', iconType: 'specs', step: null });

    if (!wizardSteps.some((step) => step.type === 'documents')) {
        // No `documents` step in this configuration: the portal's own check-list
        // takes the slot. Exactly one Documents tab, either way.
        push({ key: 'documents', label: labels.documents, kind: 'documents', iconType: 'documents', step: null });
    }

    return tabs;
}

/**
 * Is this failure "Share could not resolve the configuration"?
 *
 * `share_session_required` is a documented outcome (contracts §8), not a bug to
 * hide behind a generic error: the columns are resolved by Share, which needs a
 * session of its own. It deserves its own wording, and it must never take the
 * rest of the sheet down.
 *
 * @param {Object|null} error an `ApiError` from `lib/client.js`
 * @returns {boolean}
 */
export function isConfigUnavailable(error) {
    if (!error) {
        return false;
    }
    return error.code === 'share_session_required' || error.code === 'no-form-config';
}

/* -------------------------------------------------------------------------- */
/* Properties                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Renders any value a beCPG form field can hold as readable text.
 *
 * `displayValue` is authoritative when present — it is already localised by the
 * repository (units, constraint labels, association names). Everything else is a
 * defensive fallback so an unexpected shape shows *something* instead of
 * `[object Object]`.
 *
 * @param {Object} field a field of the wizard form definition
 * @param {string} lang
 * @returns {string|null}
 */
export function readableValue(field, lang) {
    const value =
        field.displayValue !== null && field.displayValue !== undefined && field.displayValue !== ''
            ? field.displayValue
            : field.value;

    const render = (entry) => {
        if (entry === null || entry === undefined || entry === '') {
            return null;
        }
        if (typeof entry === 'boolean') {
            const labels = LABELS[lang] || LABELS.fr;
            return entry ? labels.yes : labels.no;
        }
        if (typeof entry === 'number') {
            return String(entry);
        }
        if (typeof entry === 'string') {
            // A d:date arrives as an ISO string; nobody reads a timestamp.
            if (field.dataType === 'd:date') {
                return formatDate(entry, lang, { fallback: entry });
            }
            if (field.dataType === 'd:datetime') {
                return formatDateTime(entry, lang, { fallback: entry });
            }
            // `RawPropertySheet` below has no data type to give us — it renders
            // `entity.attributes` directly, where `cm:created` and `cm:modified`
            // are plain strings. Recognising the *shape* of the value is what
            // stops `2026-07-06T14:48:55.903Z` from being printed as-is.
            if (isIsoTimestamp(entry)) {
                return formatDateTime(entry, lang, { fallback: entry });
            }
            return entry;
        }
        if (Array.isArray(entry)) {
            return entry.map(render).filter(Boolean).join(', ') || null;
        }
        if (typeof entry === 'object') {
            return entry.displayValue || entry.label || entry.name || entry.value || null;
        }
        return String(entry);
    };

    const rendered = render(value);
    return rendered === '' ? null : rendered;
}

/** Prettifies a qname for the degraded rendering: `bcpg:legalName` → `Legal Name`. */
export function qnameLabel(qname) {
    const local = String(qname).includes(':') ? String(qname).split(':')[1] : String(qname);
    return local.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (char) => char.toUpperCase());
}

/**
 * The labelled property sheet, built from the wizard's form definition.
 *
 * It is deliberately not `FormRenderer`: that component is the wizard's editing
 * engine and renders every declared field, empty ones included. A consultation
 * sheet showing forty empty lines is noise — here only what the supplier
 * actually filled in is shown, grouped by the definition's own sets.
 *
 * @param {Object} props
 */
function PropertySheet({ definition, lang, labels }) {
    const sets = useMemo(() => {
        if (!definition || !Array.isArray(definition.fields)) {
            return [];
        }
        const byId = new Map(definition.fields.map((field) => [field.id, field]));
        const declared = Array.isArray(definition.sets) ? definition.sets : [];

        const groups = declared
            .map((set) => ({
                id: set.id,
                label: set.label || '',
                fields: (set.fields || []).map((id) => byId.get(id)).filter(Boolean),
            }))
            .filter((set) => set.fields.length > 0);

        // Fields not claimed by any set must still be shown.
        const claimed = new Set(groups.flatMap((set) => set.fields.map((field) => field.id)));
        const orphans = definition.fields.filter((field) => !claimed.has(field.id));
        if (orphans.length > 0) {
            groups.push({ id: '__other', label: '', fields: orphans });
        }
        return groups;
    }, [definition]);

    const filled = useMemo(
        () =>
            sets
                .map((set) => ({
                    ...set,
                    fields: set.fields
                        .map((field) => ({ field, value: readableValue(field, lang) }))
                        .filter((entry) => entry.value !== null),
                }))
                .filter((set) => set.fields.length > 0),
        [sets, lang],
    );

    if (filled.length === 0) {
        return (
            <EmptyState
                variant="empty"
                icon="description"
                title={labels.noProperties}
                message={labels.noPropertiesHint}
            />
        );
    }

    return (
        <div className="flex flex-col gap-3 sm:gap-4">
            {filled.map((set, index) => (
                <Card key={set.id} padding="lg" index={index}>
                    {set.label ? <SectionHeader title={set.label} /> : null}
                    <div className="form-grid">
                        {set.fields.map(({ field, value }) => (
                            <Field
                                key={field.id}
                                label={field.label || qnameLabel(field.name || field.id)}
                                help={field.description || field.help || undefined}
                                readOnly
                                value={value}
                                full={
                                    field.dataType === 'd:mltext' ||
                                    field.control?.template === 'textarea.ftl'
                                }
                            />
                        ))}
                    </div>
                </Card>
            ))}
        </div>
    );
}

/**
 * Degraded property sheet: the raw `attributes` of `/entities/{id}`, with the
 * qname as the label. Used when the form definition cannot be resolved — a
 * labelled sheet is better, a qname sheet is far better than a blank panel.
 *
 * @param {Object} props
 */
function RawPropertySheet({ attributes, lang, labels }) {
    const rows = useMemo(() => {
        if (!attributes || typeof attributes !== 'object') {
            return [];
        }
        return Object.entries(attributes)
            .map(([qname, raw]) => {
                const value = readableValue({ value: raw, displayValue: null, dataType: null }, lang);
                return value === null ? null : { qname, value };
            })
            .filter(Boolean)
            .sort((a, b) => a.qname.localeCompare(b.qname));
    }, [attributes, lang]);

    if (rows.length === 0) {
        return (
            <EmptyState
                variant="empty"
                icon="description"
                title={labels.noProperties}
                message={labels.noPropertiesHint}
            />
        );
    }

    return (
        <Card padding="lg">
            <SectionHeader title={labels.rawProperties} subtitle={labels.rawNotice} />
            <div className="form-grid">
                {rows.map((row) => (
                    <Field key={row.qname} label={qnameLabel(row.qname)} readOnly value={row.value} />
                ))}
            </div>
        </Card>
    );
}

/**
 * The `form` step: the labelled properties, fetched from the step endpoint.
 *
 * @param {Object} props
 */
function FormPanel({ entityId, attributes, step, params, lang, labels }) {
    const { t } = useMessages();
    const stepData = useApi(
        step ? `wizard/${entityId}/step/${step.id}` : null,
        { params },
    );

    if (step && stepData.loading) {
        return <PanelSkeleton variant="form" />;
    }

    if (step && stepData.error && !isConfigUnavailable(stepData.error)) {
        return <ErrorState error={stepData.error} onRetry={stepData.refresh} />;
    }

    const definition = stepData.data ? stepData.data.definition : null;
    const hasFields = Boolean(definition && Array.isArray(definition.fields) && definition.fields.length > 0);

    if (hasFields) {
        return <PropertySheet definition={definition} lang={lang} labels={labels} />;
    }

    // No resolvable definition (no wizard for this type, no Share session, or a
    // form the supplier may not see): the raw attributes, and a notice saying so.
    return (
        <>
            {step && (stepData.error || definition) ? (
                <p className="mb-3 text-xs text-[var(--becpg-dark-grey)]">
                    <Icon name="info" size={14} className="mr-1 align-text-bottom" />
                    {labels.configHint}
                    {stepData.error ? (
                        <button
                            type="button"
                            onClick={stepData.refresh}
                            className="ml-2 underline hover:text-[var(--becpg-blue)]"
                        >
                            {t('action.retry')}
                        </button>
                    ) : null}
                </p>
            ) : null}
            <RawPropertySheet attributes={attributes} lang={lang} labels={labels} />
        </>
    );
}

/* -------------------------------------------------------------------------- */
/* Lists and questionnaires                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The loading surface of a panel: a table above `md`, cards below — the two
 * shapes `DataListEditor` itself uses, so nothing jumps when the data lands.
 *
 * @param {Object} props
 * @param {'grid'|'cards'|'form'} props.variant
 */
function PanelSkeleton({ variant }) {
    if (variant === 'grid') {
        return (
            <>
                <SkeletonTable rows={5} columns={4} className="hidden md:block" />
                <div className="flex flex-col gap-2 md:hidden">
                    <SkeletonCard lines={3} />
                    <SkeletonCard lines={3} />
                    <SkeletonCard lines={3} />
                </div>
            </>
        );
    }
    return (
        <div className="flex flex-col gap-3">
            <SkeletonCard lines={variant === 'form' ? 4 : 3} />
            <SkeletonCard lines={variant === 'form' ? 4 : 3} />
        </div>
    );
}

/**
 * The header of a list panel: the step's label and its instructions, both
 * already translated by beCPG.
 *
 * @param {Object} props
 */
function StepHeader({ step, labels }) {
    const title = step.label || step.title || '';
    const subtitle = step.title && step.title !== title ? step.title : labels.readOnly;
    // Same glyph as the tab that opened this panel — one list, one picture.
    return <SectionHeader title={title} subtitle={subtitle} icon={<ListIcon type={stepIconType(step)} size={18} />} />;
}

/**
 * An `entityDataList` or `survey` step, read only.
 *
 * The grid is `DataListEditor` and the questionnaire is the same rows rendered
 * as cards (`DataListCardRow`) — a nine-column questionnaire is unanswerable and
 * unreadable alike. Both read the *same* `useDataList` instance, created here so
 * this component can tell an empty list from an unresolved configuration; the
 * editor is handed that instance and, deliberately, **no `stepId`**, so it does
 * not fire a second request for the page it has already been given.
 *
 * @param {Object} props
 */
function ListPanel({ entityId, step, params, variant, labels }) {
    const list = useDataList({
        entityId,
        stepId: step.id,
        params,
        pageSize: variant === 'cards' ? SURVEY_PAGE_SIZE : 25,
        // Explicit, and never relaxed: this sheet is consultation only. The
        // server verdict may well be "writable" (the supplier holds the task) —
        // editing happens in the wizard, not here.
        readOnly: true,
    });

    const [flatColumns, nestedColumns] = useMemo(() => {
        const flat = [];
        const nested = [];
        for (const column of list.columns || []) {
            (isNestedColumn(column) ? nested : flat).push(column);
        }
        return [flat, nested];
    }, [list.columns]);

    const rows = list.rows || [];

    if (list.loading && rows.length === 0) {
        return <PanelSkeleton variant={variant} />;
    }

    if (list.error && rows.length === 0) {
        return (
            <>
                <StepHeader step={step} labels={labels} />
                {isConfigUnavailable(list.error) ? (
                    <EmptyState
                        variant="error"
                        icon="settings"
                        title={labels.configTitle}
                        message={labels.configHint}
                        actionLabel={labels.retryLabel}
                        onAction={() => list.refresh()}
                    />
                ) : (
                    <ErrorState error={list.error} onRetry={() => list.refresh()} />
                )}
            </>
        );
    }

    if (rows.length === 0) {
        return (
            <>
                <StepHeader step={step} labels={labels} />
                <EmptyState
                    variant="empty"
                    icon={variant === 'cards' ? 'quiz' : 'table_rows'}
                    title={labels.noData}
                    message={labels.noDataHint}
                />
            </>
        );
    }

    if (variant === 'cards') {
        return (
            <div className="min-w-0">
                <StepHeader step={step} labels={labels} />
                <div className="flex flex-col gap-2">
                    {rows.map((row, index) => (
                        <DataListCardRow
                            key={row.key}
                            row={row}
                            index={index + 1}
                            columns={flatColumns}
                            nestedColumns={nestedColumns}
                            list={list}
                            context={{
                                entityNodeRef: entityId,
                                itemType: list.itemType,
                                formId: list.step?.formId || null,
                            }}
                            showOrder={false}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <DataListEditor
            entityId={entityId}
            list={list}
            readOnly
            // A node, not a string: the grid's own heading gets the same glyph as
            // the tab and the card header, and `DataListEditor` already types
            // `title` as a ReactNode — nothing in components/datalist changes.
            title={
                <span className="inline-flex items-center gap-2">
                    <ListIcon type={stepIconType(step)} size={18} />
                    {step.label || step.title}
                </span>
            }
            description={step.title && step.title !== step.label ? step.title : undefined}
        />
    );
}

/* -------------------------------------------------------------------------- */
/* Documents                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The documents check-list — what the customer expects on this product.
 *
 * It is the same surface whether it comes from the wizard's `documents` step or
 * from the portal's own tab: the expected types are materialised on the entity by
 * `DocumentFormulationHandler` (contracts §9), so there is one source and one
 * rendering.
 *
 * @param {Object} props
 */
function DocumentsPanel({ nodeRef, step, labels }) {
    const requirements = useApi(nodeRef ? 'documents/requirements' : null, {
        params: { entity: nodeRef },
    });

    return (
        <div className="min-w-0">
            <SectionHeader
                title={(step && (step.label || step.title)) || labels.documents}
                subtitle={(step && step.title !== step.label && step.title) || labels.documentsHint}
                icon={<ListIcon type={step ? stepIconType(step) : 'documents'} size={18} />}
            />
            <RequirementChecklist
                groups={(requirements.data && requirements.data.groups) || []}
                summary={requirements.data ? requirements.data.summary : null}
                loading={requirements.loading}
                error={requirements.error}
                onRetry={requirements.refresh}
                onUploaded={requirements.refresh}
                groupByEntity={false}
            />
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* The tabbed body                                                             */
/* -------------------------------------------------------------------------- */

/**
 * One panel. Split out so each opened tab owns its own hooks and its own
 * request, and so a tab that was never opened never fetches anything.
 *
 * @param {Object} props
 */
function SectionPanel({ tab, entity, entityId, params, lang, labels }) {
    const { step } = tab;

    if (tab.kind === 'form') {
        return (
            <FormPanel
                entityId={entityId}
                attributes={entity ? entity.attributes : null}
                step={step}
                params={params}
                lang={lang}
                labels={labels}
            />
        );
    }
    if (tab.kind === 'survey' || tab.kind === 'entityDataList') {
        return (
            <ListPanel
                entityId={entityId}
                step={step}
                params={params}
                variant={tab.kind === 'survey' ? 'cards' : 'grid'}
                labels={labels}
            />
        );
    }
    if (tab.kind === 'documents') {
        return <DocumentsPanel nodeRef={entity ? entity.nodeRef : null} step={step} labels={labels} />;
    }
    if (tab.kind === 'compliance') {
        return <CompliancePanel entityId={entityId} />;
    }
    if (tab.kind === 'specs') {
        return <SpecsPanel entityId={entityId} label={labels.specs} />;
    }

    // A step type the portal does not render (a future beCPG addition): say so
    // rather than paint an empty rectangle.
    return (
        <>
            {step ? <StepHeader step={step} labels={labels} /> : null}
            <EmptyState variant="empty" icon="help_outline" title={labels.configTitle} message={labels.configHint} />
        </>
    );
}

/** The catalogs and the fields they are still missing. */
function CompliancePanel({ entityId }) {
    const catalogs = useApi(`entities/${entityId}/catalogs`);
    return (
        <CatalogPanel
            catalogs={(catalogs.data && catalogs.data.catalogs) || []}
            score={catalogs.data ? catalogs.data.score : undefined}
            loading={catalogs.loading}
            error={catalogs.error}
            onRetry={catalogs.refresh}
        />
    );
}

/** What the customer asked for: the specifications bound to this product. */
function SpecsPanel({ entityId, label }) {
    const specs = useApi(`entities/${entityId}/specs`);
    return (
        <SpecPanel
            specifications={(specs.data && specs.data.specifications) || []}
            loading={specs.loading}
            error={specs.error}
            onRetry={specs.refresh}
            title={
                <span className="inline-flex items-center gap-1.5">
                    <Icon name="menu_book" size={18} />
                    {label}
                </span>
            }
        />
    );
}

/**
 * @param {Object} props
 * @param {Object|null} props.entity the entity of `GET /api/v1/entities/{id}`
 * @param {string} props.entityId the entity uuid / nodeRef used in the API paths
 * @param {Object[]} [props.steps] steps of `GET /api/v1/wizard/{entityId}`
 * @param {string} [props.wizardId] forwarded to the step endpoint, so the tabs and
 *        the data are read through the same wizard resolution
 * @param {boolean} [props.loading] the wizard structure is still being read
 * @param {string} props.activeTab the tab key carried by `?tab=`
 * @param {Function} props.onTabChange `(key) => void` — the page writes the URL
 * @param {boolean} [props.entityLoading]
 */
export function ProductSections({
    entity,
    entityId,
    steps,
    wizardId,
    loading = false,
    activeTab,
    onTabChange,
    entityLoading = false,
}) {
    const { lang, t } = useMessages();
    const labels = useMemo(() => {
        const dict = LABELS[lang] || LABELS.fr;
        return { ...dict, retryLabel: t('action.retry') };
    }, [lang, t]);

    const tabs = useMemo(() => buildProductTabs(steps, labels), [steps, labels]);

    // An unknown `?tab=` value (a stale bookmark, a step the client removed)
    // falls back to the first tab instead of showing nothing.
    const active = tabs.find((tab) => tab.key === activeTab) || tabs[0] || null;
    const activeKey = active ? active.key : null;

    // Lazy, then kept: a panel is mounted when its tab is first opened and stays
    // mounted (hidden) afterwards, so its data survives a round trip.
    //
    // The set is adjusted **during render** (React's "adjust state on prop
    // change" pattern, the one `useApi` uses): doing it in an effect would mount
    // the panel one paint late and cost a cascading render on every tab click.
    const [opened, setOpened] = useState(() => (activeKey ? [activeKey] : []));
    if (activeKey && !opened.includes(activeKey)) {
        setOpened([...opened, activeKey]);
    }

    const params = useMemo(
        () => (wizardId ? { wizardId } : undefined),
        [wizardId],
    );

    if (loading || entityLoading) {
        return (
            <>
                <div className="mb-4 flex gap-2 border-b border-[var(--becpg-grey)] pb-2" aria-hidden="true">
                    <span className="skeleton h-8 w-24 rounded-lg" />
                    <span className="skeleton h-8 w-28 rounded-lg" />
                    <span className="skeleton h-8 w-20 rounded-lg" />
                </div>
                <PanelSkeleton variant="form" />
            </>
        );
    }

    return (
        <>
            <div className="mb-4 border-b border-[var(--becpg-grey)]">
                {/*
                    Horizontal scroll rather than a wrap: at 360px a ten-step
                    configuration would otherwise build a four-line wall of tabs.
                    `TabScroller` adds what was missing — the chevrons, the edge
                    fades, "reveal the active tab", the arrow keys — without
                    changing that scroll. Labels are beCPG's translated list
                    names and are never truncated.
                */}
                <TabScroller ariaLabel={labels.sections} activeKey={activeKey}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            id={`tab-${tab.key}`}
                            type="button"
                            role="tab"
                            // The step TYPE, in the DOM. Every label on this bar comes from
                            // beCPG and changes from one instance to the next, so a test (or a
                            // support screenshot annotation) cannot key on the text. The kind
                            // can: it is the portal's own vocabulary, not the client's data.
                            data-tab-kind={tab.kind}
                            // How `TabScroller` finds the tab it has to reveal.
                            data-tab-key={tab.key}
                            aria-selected={tab.key === activeKey}
                            aria-controls={`panel-${tab.key}`}
                            // Roving tabindex: one Tab press leaves the bar for the
                            // panel instead of walking eleven tabs. Arrow keys move
                            // inside it (WAI-ARIA tabs, manual activation).
                            tabIndex={tab.key === activeKey ? 0 : -1}
                            onClick={() => onTabChange(tab.key)}
                            className={[
                                'touch-target -mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                                tab.key === activeKey
                                    ? 'border-[var(--becpg-orange)] text-[var(--becpg-blue)]'
                                    : 'border-transparent text-[var(--becpg-dark-grey)] hover:text-[var(--becpg-blue)]',
                            ].join(' ')}
                        >
                            {/* beCPG's own 16px glyph per characteristic list — the
                                picture a supplier already reads the bar by in Share. */}
                            <ListIcon type={tab.iconType} />
                            {tab.label}
                        </button>
                    ))}
                </TabScroller>
            </div>

            {tabs.map((tab) => {
                const isActive = tab.key === activeKey;
                if (!isActive && !opened.includes(tab.key)) {
                    return null;
                }
                return (
                    <div
                        key={tab.key}
                        id={`panel-${tab.key}`}
                        role="tabpanel"
                        data-tab-kind={tab.kind}
                        aria-labelledby={`tab-${tab.key}`}
                        hidden={!isActive}
                        className={isActive ? 'min-w-0' : 'hidden'}
                    >
                        <SectionPanel
                            tab={tab}
                            entity={entity}
                            entityId={entityId}
                            params={params}
                            lang={lang}
                            labels={labels}
                        />
                    </div>
                );
            })}
        </>
    );
}
