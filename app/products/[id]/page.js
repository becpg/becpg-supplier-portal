'use client';

/**
 * `/products/[id]` — the product sheet, read-only (spec §4.2).
 *
 * The sheet answers three questions, in that order: *what is this product*,
 * *what is still missing on it*, and *what do I owe on it*. Hence four sections:
 *
 * | Section | Source | Why it is here |
 * |---|---|---|
 * | Fiche | `wizard/{id}/step/{formStep}` | the **labelled** properties — beCPG's own dictionary labels, not qnames |
 * | Conformité | `entities/{id}/catalogs` | the missing fields that hold the validation back |
 * | Documents | `documents/requirements?entity=` | the check-list, scoped to this product |
 * | Cahiers des charges | `entities/{id}/specs` | what the customer asked for |
 *
 * Properties deliberately go through the wizard's form definition rather than
 * through the raw `attributes` map of `/entities/{id}`: the definition carries
 * the label, the help text and the localised `displayValue`, which is what makes
 * the difference between a product sheet and a JSON dump. When that call is not
 * available (no wizard configured for the type, no permission), the sheet falls
 * back to the raw attributes — degraded, but never blank.
 *
 * Everything but the first section is fetched only when its tab is opened.
 */

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ProductHeader } from '@/components/products/ProductHeader';
import { CatalogPanel } from '@/components/products/CatalogPanel';
import { SpecPanel } from '@/components/specs/SpecPanel';
import { RequirementChecklist } from '@/components/documents/RequirementChecklist';
import { formatDate } from '@/components/documents/ExpiryPill';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        tabs: {
            sheet: 'Fiche',
            compliance: 'Conformité',
            documents: 'Documents',
            specs: 'Cahiers des charges',
        },
        notFound: 'Produit introuvable',
        notFoundHint: 'Cette fiche n’existe pas ou ne fait pas partie de votre périmètre.',
        noProperties: 'Aucune propriété à afficher',
        noPropertiesHint:
            'Les propriétés de ce produit ne sont pas exposées par la configuration de l’assistant.',
        rawProperties: 'Propriétés',
        rawNotice:
            'Libellés techniques : la configuration de l’assistant n’est pas disponible pour ce produit.',
        yes: 'Oui',
        no: 'Non',
        back: 'Mes produits',
    },
    en: {
        tabs: {
            sheet: 'Sheet',
            compliance: 'Compliance',
            documents: 'Documents',
            specs: 'Specifications',
        },
        notFound: 'Product not found',
        notFoundHint: 'This sheet does not exist, or is not part of your scope.',
        noProperties: 'No property to display',
        noPropertiesHint: 'This product’s properties are not exposed by the wizard configuration.',
        rawProperties: 'Properties',
        rawNotice: 'Technical labels: the wizard configuration is not available for this product.',
        yes: 'Yes',
        no: 'No',
        back: 'My products',
    },
};

const TABS = ['sheet', 'compliance', 'documents', 'specs'];

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
function readableValue(field, lang) {
    const value = field.displayValue !== null && field.displayValue !== undefined && field.displayValue !== ''
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
            if (field.dataType === 'd:date' || field.dataType === 'd:datetime') {
                return formatDate(entry, lang);
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

/** Prettifies a qname for the degraded rendering: `bcpg:legalName` → `legalName`. */
function qnameLabel(qname) {
    const local = String(qname).includes(':') ? String(qname).split(':')[1] : String(qname);
    return local.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (char) => char.toUpperCase());
}

/**
 * The labelled property sheet, built from the wizard's form definition.
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
                    // A read-only sheet showing forty empty lines is noise: keep
                    // only what the supplier actually filled in.
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
                                full={field.dataType === 'd:mltext' || field.control?.template === 'textarea.ftl'}
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
 * qname as the label. Used only when the wizard definition is unavailable.
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

export default function ProductPage() {
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const [tab, setTab] = useState('sheet');

    const entity = useApi(id ? `entities/${id}` : null);
    const nodeRef = entity.data ? entity.data.nodeRef : null;

    // The wizard state resolves which step holds the properties form, and with
    // it the labels. A failure here is not an error for this page — the sheet
    // simply degrades to the raw attributes.
    const wizard = useApi(id && tab === 'sheet' ? `wizard/${id}` : null);
    const formStepId = useMemo(() => {
        const steps = (wizard.data && wizard.data.steps) || [];
        const step = steps.find((entry) => entry.type === 'form');
        return step ? step.id : null;
    }, [wizard.data]);
    const formStep = useApi(
        id && tab === 'sheet' && formStepId ? `wizard/${id}/step/${formStepId}` : null,
    );

    const catalogs = useApi(id && tab === 'compliance' ? `entities/${id}/catalogs` : null);
    const specs = useApi(id && tab === 'specs' ? `entities/${id}/specs` : null);
    const requirements = useApi(nodeRef && tab === 'documents' ? 'documents/requirements' : null, {
        params: { entity: nodeRef },
    });

    if (entity.error) {
        return (
            <AppShell title={labels.notFound}>
                {entity.error.isNotFound ? (
                    <EmptyState
                        variant="error"
                        icon="search_off"
                        title={labels.notFound}
                        message={labels.notFoundHint}
                        actionLabel={labels.back}
                        actionHref="/products"
                    />
                ) : (
                    <ErrorState error={entity.error} onRetry={entity.refresh} />
                )}
            </AppShell>
        );
    }

    const product = entity.data;
    const sheetLoading = wizard.loading || (Boolean(formStepId) && formStep.loading);
    const definition = formStep.data ? formStep.data.definition : null;

    return (
        <AppShell title={product ? product.name : labels.tabs.sheet}>
            <ProductHeader
                entity={product}
                loading={entity.loading}
                backHref="/products"
                className="mb-4"
            />

            <div className="mb-4 border-b border-[var(--becpg-grey)]">
                <div className="scroll-x no-scrollbar">
                    {TABS.map((entry) => (
                        <button
                            key={entry}
                            type="button"
                            onClick={() => setTab(entry)}
                            aria-current={tab === entry ? 'page' : undefined}
                            className={[
                                'touch-target -mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                                tab === entry
                                    ? 'border-[var(--becpg-orange)] text-[var(--becpg-blue)]'
                                    : 'border-transparent text-[var(--becpg-dark-grey)] hover:text-[var(--becpg-blue)]',
                            ].join(' ')}
                        >
                            {labels.tabs[entry]}
                        </button>
                    ))}
                </div>
            </div>

            {tab === 'sheet' ? (
                sheetLoading || entity.loading ? (
                    <div className="flex flex-col gap-3">
                        <SkeletonCard lines={4} />
                        <SkeletonCard lines={4} />
                    </div>
                ) : definition ? (
                    <PropertySheet definition={definition} lang={lang} labels={labels} />
                ) : (
                    <RawPropertySheet
                        attributes={product ? product.attributes : null}
                        lang={lang}
                        labels={labels}
                    />
                )
            ) : null}

            {tab === 'compliance' ? (
                <CatalogPanel
                    catalogs={(catalogs.data && catalogs.data.catalogs) || []}
                    score={catalogs.data ? catalogs.data.score : undefined}
                    loading={catalogs.loading}
                    error={catalogs.error}
                    onRetry={catalogs.refresh}
                />
            ) : null}

            {tab === 'documents' ? (
                <RequirementChecklist
                    groups={(requirements.data && requirements.data.groups) || []}
                    summary={requirements.data ? requirements.data.summary : null}
                    loading={requirements.loading}
                    error={requirements.error}
                    onRetry={requirements.refresh}
                    onUploaded={requirements.refresh}
                />
            ) : null}

            {tab === 'specs' ? (
                <SpecPanel
                    specifications={(specs.data && specs.data.specifications) || []}
                    loading={specs.loading}
                    error={specs.error}
                    onRetry={specs.refresh}
                    title={
                        <span className="inline-flex items-center gap-1.5">
                            <Icon name="menu_book" size={18} />
                            {labels.tabs.specs}
                        </span>
                    }
                />
            ) : null}
        </AppShell>
    );
}
