'use client';

/**
 * `/company` — *ma fiche fournisseur* (spec §4.2).
 *
 * The supplier's own record is a `bcpg:supplier` entity like any other, with its
 * own datalists: contacts, sites (`bcpg:plant`), certifications, questionnaire
 * (`survey:surveyList`). The portal does not invent a schema for them — it reads
 * the **same wizard configuration** Share uses for `supplier-supplier`
 * (`GET /api/v1/wizard/{id}`), which gives, per step: the list, its labelled
 * columns, its rows with already-localised `displayValue`s, and whether the
 * client has frozen it. Anything a client adds to that configuration therefore
 * shows up here without a line of code.
 *
 * Two things are joined on top of it:
 *
 *   - the **approval status** (`GET /api/v1/approval?supplier=`), computed on
 *     the fly and never persisted (spec §5.4.3), with the reasons spelled out —
 *     a supplier who is suspended must know *why*;
 *   - the **document check-list** scoped to the supplier record itself.
 *
 * The page is read-only: writing goes through the wizard, which is a task, which
 * is the customer's decision to open. Frozen lists are shown as such.
 */

import { useMemo, useState } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { Button, Icon } from '@/components/ui/Button';
import { Card, SectionHeader } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Field } from '@/components/ui/Field';
import { Gauge, GaugeBar } from '@/components/ui/Gauge';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { ListIcon } from '@/components/ui/ListIcon';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { TabScroller } from '@/components/ui/TabScroller';
import { RequirementChecklist } from '@/components/documents/RequirementChecklist';
import { SpecPanel } from '@/components/specs/SpecPanel';
import { DecisionTree } from '@/components/survey/DecisionTree';
import { formatDate } from '@/lib/format';
import { useSession } from '@/components/providers/SessionProvider';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('app/company/page#LABELS', {
    fr: {
        title: 'Ma fiche',
        subtitle: 'Les informations que le client détient sur votre entreprise',
        noSupplier: 'Aucune fiche fournisseur',
        noSupplierHint:
            'Votre compte n’est rattaché à aucun fournisseur. Contactez votre interlocuteur chez le client.',
        approval: 'Statut d’agrément',
        approvalHint: 'Calculé en temps réel à partir de vos documents, projets et non-conformités.',
        reasons: {
            documentExpired: 'Un document obligatoire est expiré',
            documentExpiring: 'Un document obligatoire arrive à échéance',
            documentMissing: 'Un document obligatoire n’a pas été fourni',
            blockingNc: 'Une non-conformité bloquante est ouverte',
            openProject: 'Un projet de référencement est en cours',
            blockingCatalog: 'Un catalogue bloquant n’est pas satisfait',
        },
        metrics: {
            documentsExpired: 'Documents expirés',
            documentsExpiring: 'Documents expirant',
            documentsMissing: 'Documents manquants',
            openNc: 'NC ouvertes',
            openProjects: 'Projets en cours',
        },
        sections: {
            identity: 'Identité',
            surveyList: 'Questionnaire',
            contactList: 'Contacts',
            plant: 'Sites',
            certification: 'Certifications',
            documents: 'Documents',
            specs: 'Cahiers des charges',
        },
        frozen: 'Liste validée par le client — lecture seule',
        emptyList: 'Aucune ligne',
        emptyListHint: 'Cette rubrique n’a pas encore été renseignée.',
        questionnaire: '{done} / {total} questions répondues',
        completion: 'Complétude',
        noProperties: 'Aucune propriété à afficher',
        yes: 'Oui',
        no: 'Non',
        code: 'Code',
    },
    en: {
        title: 'My company',
        subtitle: 'What the customer holds about your company',
        noSupplier: 'No supplier record',
        noSupplierHint: 'Your account is not linked to any supplier. Contact your customer representative.',
        approval: 'Approval status',
        approvalHint: 'Computed in real time from your documents, projects and non-conformities.',
        reasons: {
            documentExpired: 'A mandatory document has expired',
            documentExpiring: 'A mandatory document is about to expire',
            documentMissing: 'A mandatory document has not been provided',
            blockingNc: 'A blocking non-conformity is open',
            openProject: 'A referencing project is under way',
            blockingCatalog: 'A blocking catalogue is not satisfied',
        },
        metrics: {
            documentsExpired: 'Expired documents',
            documentsExpiring: 'Expiring documents',
            documentsMissing: 'Missing documents',
            openNc: 'Open NC',
            openProjects: 'Open projects',
        },
        sections: {
            identity: 'Identity',
            surveyList: 'Questionnaire',
            contactList: 'Contacts',
            plant: 'Sites',
            certification: 'Certifications',
            documents: 'Documents',
            specs: 'Specifications',
        },
        frozen: 'List validated by the customer — read only',
        emptyList: 'No row',
        emptyListHint: 'This section has not been filled in yet.',
        questionnaire: '{done} / {total} questions answered',
        completion: 'Completion',
        noProperties: 'No property to display',
        yes: 'Yes',
        no: 'No',
        code: 'Code',
    },
});

/** Reason codes, ordered from the most to the least severe (mirrors `rules`). */
const REASON_ORDER = [
    'documentExpired',
    'blockingNc',
    'documentExpiring',
    'documentMissing',
    'blockingCatalog',
    'openProject',
];

function fill(template, vars) {
    return template.replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]),
    );
}

/**
 * Section key of a wizard step, used both for the tab label and for the special
 * rendering a few of them get. Derived from the step's `listId`, falling back to
 * the segment of its `labelId` (`becpg.wizard.supplier.plant.label` → `plant`).
 *
 * @param {Object} step
 * @returns {string}
 */
function sectionKey(step) {
    if (step.type === 'form') {
        return 'identity';
    }
    if (step.type === 'documents') {
        return 'documents';
    }
    if (step.listName) {
        return step.listName;
    }
    if (step.listId) {
        return String(step.listId).split('@')[0];
    }
    if (step.labelId) {
        const parts = String(step.labelId).split('.');
        return parts.length > 1 ? parts[parts.length - 2] : step.labelId;
    }
    return step.id;
}

/** Human label of a step: our own vocabulary first, then beCPG's, then the key. */
function sectionLabel(step, labels) {
    const key = sectionKey(step);
    return labels.sections[key] || step.label || step.title || key;
}

/** Reads a cell, preferring the localised `displayValue`. */
function cellText(row, column) {
    const key = column.formsName || column.name;
    const display = row.displayValues ? row.displayValues[key] : undefined;
    const raw = row.values ? row.values[key] : undefined;
    const value = display !== undefined && display !== null && display !== '' ? display : raw;

    if (value === null || value === undefined || value === '') {
        return '';
    }
    if (Array.isArray(value)) {
        return value
            .map((entry) =>
                entry && typeof entry === 'object'
                    ? entry.displayValue || entry.label || entry.name || ''
                    : String(entry),
            )
            .filter(Boolean)
            .join(', ');
    }
    if (typeof value === 'object') {
        return value.displayValue || value.label || value.name || '';
    }
    return String(value);
}

/**
 * A datalist rendered as a table. Columns come from beCPG with their labels, so
 * nothing is hard-coded — a client who adds a column to `bcpg:plant` sees it.
 */
function DataListSection({ data, loading, error, onRetry, labels, frozen, stepId }) {
    const columns = useMemo(() => {
        const declared = (data && data.columns) || [];
        // Six columns is what a laptop shows without a horizontal scroll; the
        // rest stays reachable through the column picker.
        return declared.map((column, index) => ({
            id: column.formsName || column.name || `col-${index}`,
            accessorFn: (row) => cellText(row, column),
            header: column.label || column.name,
            meta: {
                label: column.label || column.name,
                primary: index === 0,
                secondary: index === 1,
            },
            cell: ({ getValue }) => (
                <span className="block max-w-[18rem] break-words">{getValue() || '—'}</span>
            ),
        }));
    }, [data]);

    const rows = (data && data.rows) || [];

    if (error) {
        return <ErrorState error={error} onRetry={onRetry} />;
    }

    return (
        <>
            {frozen ? (
                <p className="mb-2 flex items-center gap-1.5 text-xs text-[var(--becpg-dark-grey)]">
                    <Icon name="lock_outline" size={14} />
                    {labels.frozen}
                </p>
            ) : null}
            <DataTable
                columns={columns}
                data={rows}
                loading={loading}
                getRowId={(row, index) => String(row.nodeRef ?? index)}
                enablePagination={rows.length > 25}
                enableFiltering={rows.length > 10}
                enableColumnVisibility={columns.length > 6}
                // Per list: two questionnaires or two datalists share no column,
                // and a choice made on one must not hide a column of the other.
                storageKey={stepId ? `company.${stepId}` : null}
                initialColumnVisibility={columns.slice(6).reduce(
                    (accumulator, column) => ({ ...accumulator, [column.id]: false }),
                    {},
                )}
                emptyState={
                    <EmptyState
                        variant="empty"
                        icon="list_alt"
                        title={labels.emptyList}
                        message={labels.emptyListHint}
                        compact
                    />
                }
            />
        </>
    );
}

/**
 * The questionnaire — **the decision tree, read only**.
 *
 * The step endpoint serves a `survey` step as `{ questions, answers }` from
 * `becpg/survey`, not as columns and rows: the structure
 * (`survey:surveyQuestion`, with its response types and its `nextQuestion`
 * links) and the answers (`survey:surveyList`) are two different types, and a
 * table can only show the second. So this section renders the same component
 * the wizard does, in its read-only mode — questions in the customer's order,
 * only the branches the answers actually opened, and the answer under each one.
 *
 * The completion ratio is computed by the tree itself, on the questions that are
 * *asked*: a branch nobody took was never a question.
 */
function SurveySection({ data, loading, error, onRetry, labels, frozen, stepId }) {
    const [progress, setProgress] = useState(null);
    const questions = (data && data.questions) || [];

    if (error) {
        return <ErrorState error={error} onRetry={onRetry} />;
    }
    if (loading && !data) {
        return <SkeletonCard lines={5} />;
    }

    return (
        <div className="flex flex-col gap-3">
            {progress && progress.total > 0 ? (
                <Card padding="md">
                    <GaugeBar
                        value={progress.percent}
                        label={fill(labels.questionnaire, {
                            done: progress.answered,
                            total: progress.total,
                        })}
                        size="lg"
                    />
                </Card>
            ) : null}

            {frozen ? (
                <p className="flex items-center gap-1.5 text-xs text-[var(--becpg-dark-grey)]">
                    <Icon name="lock_outline" size={14} />
                    {labels.frozen}
                </p>
            ) : null}

            {questions.length === 0 ? (
                <EmptyState
                    variant="empty"
                    icon="quiz"
                    title={labels.emptyList}
                    message={labels.emptyListHint}
                    compact
                />
            ) : (
                <DecisionTree
                    idPrefix={`company-survey-${stepId}`}
                    questions={questions}
                    answers={(data && data.answers) || []}
                    readOnly
                    onProgress={setProgress}
                    emptyState={
                        <EmptyState
                            variant="empty"
                            icon="quiz"
                            title={labels.emptyList}
                            message={labels.emptyListHint}
                            compact
                        />
                    }
                />
            )}
        </div>
    );
}

/** The identity block: the properties form, read-only. */
function IdentitySection({ data, loading, error, onRetry, labels, lang }) {
    const definition = data ? data.definition : null;

    const groups = useMemo(() => {
        if (!definition || !Array.isArray(definition.fields)) {
            return [];
        }
        const byId = new Map(definition.fields.map((field) => [field.id, field]));
        const sets = (definition.sets || [])
            .map((set) => ({
                id: set.id,
                label: set.label || '',
                fields: (set.fields || []).map((id) => byId.get(id)).filter(Boolean),
            }))
            .filter((set) => set.fields.length > 0);
        const claimed = new Set(sets.flatMap((set) => set.fields.map((field) => field.id)));
        const orphans = definition.fields.filter((field) => !claimed.has(field.id));
        if (orphans.length > 0) {
            sets.push({ id: '__other', label: '', fields: orphans });
        }
        return sets;
    }, [definition]);

    if (loading) {
        return <SkeletonCard lines={5} />;
    }
    if (error) {
        return <ErrorState error={error} onRetry={onRetry} />;
    }
    if (groups.length === 0) {
        return <EmptyState variant="empty" icon="badge" title={labels.noProperties} compact />;
    }

    const readable = (field) => {
        const value = field.displayValue || field.value;
        if (value === null || value === undefined || value === '') {
            return null;
        }
        if (typeof value === 'boolean') {
            return value ? labels.yes : labels.no;
        }
        if (Array.isArray(value)) {
            return (
                value
                    .map((entry) =>
                        entry && typeof entry === 'object'
                            ? entry.displayValue || entry.label || entry.name
                            : entry,
                    )
                    .filter(Boolean)
                    .join(', ') || null
            );
        }
        if (typeof value === 'object') {
            return value.displayValue || value.label || value.name || null;
        }
        if (field.dataType === 'd:date' || field.dataType === 'd:datetime') {
            return formatDate(value, lang);
        }
        return String(value);
    };

    return (
        <div className="flex flex-col gap-3 sm:gap-4">
            {groups.map((group, index) => {
                const fields = group.fields
                    .map((field) => ({ field, value: readable(field) }))
                    .filter((entry) => entry.value !== null);
                if (fields.length === 0) {
                    return null;
                }
                return (
                    <Card key={group.id} padding="lg" index={index}>
                        {group.label ? <SectionHeader title={group.label} /> : null}
                        {/* `.form-columns` is the container the grid measures itself against: a
                            `@container` query with no container ancestor is simply false, and
                            the fields would stay in one column at every width. */}
                        <div className="form-columns">
                            <div className="form-grid">
                                {fields.map(({ field, value }) => (
                                    <Field
                                        key={field.id}
                                        label={field.label || field.name}
                                        help={field.description || undefined}
                                        readOnly
                                        value={value}
                                    />
                                ))}
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}

export default function CompanyPage() {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const session = useSession();
    const supplier = session.supplier;
    const supplierId = supplier ? supplier.uuid || supplier.nodeRef : null;

    const [section, setSection] = useState(null);

    const entity = useApi(supplierId ? `entities/${supplierId}` : null);
    const approval = useApi(supplier ? 'approval' : null, {
        params: { supplier: supplier ? supplier.nodeRef : undefined },
    });
    const wizard = useApi(supplierId ? `wizard/${supplierId}` : null);

    /** The sections offered by the configuration, plus the two portal ones. */
    const sections = useMemo(() => {
        const steps = (wizard.data && wizard.data.steps) || [];
        const fromWizard = steps
            .filter((step) => step.type !== 'documents')
            .map((step) => ({
                key: sectionKey(step),
                label: sectionLabel(step, labels),
                step,
            }));
        return [
            ...fromWizard,
            { key: 'documents', label: labels.sections.documents, step: null },
            { key: 'specs', label: labels.sections.specs, step: null },
        ];
    }, [wizard.data, labels]);

    const active = useMemo(() => {
        if (sections.length === 0) {
            return null;
        }
        return sections.find((entry) => entry.key === section) || sections[0];
    }, [sections, section]);

    const activeStep = active ? active.step : null;
    const stepData = useApi(
        supplierId && activeStep ? `wizard/${supplierId}/step/${activeStep.id}` : null,
    );
    const requirements = useApi(
        supplier && active && active.key === 'documents' ? 'documents/requirements' : null,
        { params: { supplier: supplier ? supplier.nodeRef : undefined } },
    );
    const specs = useApi(
        supplierId && active && active.key === 'specs' ? `entities/${supplierId}/specs` : null,
    );

    if (!session.loading && !supplier) {
        return (
            <AppShell title={labels.title}>
                <EmptyState
                    variant="empty"
                    icon="domain_disabled"
                    title={labels.noSupplier}
                    message={labels.noSupplierHint}
                />
            </AppShell>
        );
    }

    const record = entity.data;
    const status = approval.data || null;
    const reasons = status && Array.isArray(status.reasons)
        ? REASON_ORDER.filter((code) => status.reasons.includes(code))
        : [];
    const metrics = (status && status.metrics) || {};

    return (
        <AppShell
            title={labels.title}
            headerStatus={
                status ? <StatusPill status={status.status} label={status.statusLabel} size="sm" /> : null
            }
        >
            <p className="mb-4 text-sm text-[var(--becpg-dark-grey)]">{labels.subtitle}</p>

            {/* ---------------------------------------------- identity band */}
            {/* The band falls back on the session's supplier name; the failed
                read of the record itself still has to say so, with a retry. */}
            {entity.error ? (
                <div className="mb-3">
                    <ErrorState error={entity.error} onRetry={entity.refresh} compact />
                </div>
            ) : null}
            <Card padding="lg" className="mb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                        <h1 className="break-words text-lg font-medium sm:text-xl">
                            {(record && record.name) || (supplier && supplier.name) || '—'}
                        </h1>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {(record && record.code) || (supplier && supplier.code) ? (
                                <span className="pill pill-info pill-no-dot pill-sm" title={labels.code}>
                                    <Icon name="tag" size={12} />
                                    <span className="tabular-nums">
                                        {(record && record.code) || supplier.code}
                                    </span>
                                </span>
                            ) : null}
                            {record && record.state ? <StatusPill status={record.state} size="sm" /> : null}
                            {record && record.legalName ? (
                                <span className="text-xs text-[var(--becpg-dark-grey)]">
                                    {record.legalName}
                                </span>
                            ) : null}
                        </div>
                    </div>
                    {record && record.completion ? (
                        <Gauge
                            value={record.completion.score}
                            size={92}
                            thickness={9}
                            label={labels.completion}
                        />
                    ) : null}
                </div>
            </Card>

            {/* ------------------------------------------------- approval */}
            <Card padding="lg" className="mb-4">
                <SectionHeader title={labels.approval} subtitle={labels.approvalHint} />
                {approval.error ? (
                    <ErrorState error={approval.error} onRetry={approval.refresh} compact />
                ) : approval.loading ? (
                    <SkeletonCard lines={2} withTitle={false} />
                ) : status ? (
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusPill status={status.status} label={status.statusLabel} />
                        </div>
                        {reasons.length > 0 ? (
                            <ul className="flex list-none flex-col gap-1.5 p-0">
                                {reasons.map((code) => (
                                    <li
                                        key={code}
                                        className="flex items-start gap-2 rounded-lg bg-[var(--becpg-grey)]/50 px-2.5 py-1.5 text-xs"
                                    >
                                        <Icon
                                            name="chevron_right"
                                            size={14}
                                            className="mt-px text-[var(--becpg-orange)]"
                                        />
                                        <span>{labels.reasons[code] || code}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                        <dl className="grid grid-cols-2 gap-2 border-t border-[var(--becpg-grey)] pt-3 sm:grid-cols-5">
                            {Object.keys(labels.metrics).map((key) => (
                                <div key={key} className="min-w-0">
                                    <dt className="text-[0.6875rem] uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                                        {labels.metrics[key]}
                                    </dt>
                                    <dd className="text-lg font-light tabular-nums">
                                        {metrics[key] === undefined ? '—' : metrics[key]}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        {reasons.length > 0 ? (
                            <div>
                                <Button variant="outline" size="sm" icon="upload_file" href="/documents">
                                    {labels.sections.documents}
                                </Button>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </Card>

            {/* --------------------------------------------------- sections */}
            {wizard.error ? (
                <ErrorState error={wizard.error} onRetry={wizard.refresh} />
            ) : (
                <>
                    <div className="mb-4 border-b border-[var(--becpg-grey)]">
                        {/* Same bar, same defect: a supplier profile can declare
                            as many sections as the wizard configuration does, and
                            the row scrolled with nothing saying so. `tabs={false}`
                            because these keep `aria-current="page"` rather than
                            the tabs pattern — the arrow keys would be a lie. */}
                        <TabScroller ariaLabel={labels.title} activeKey={active ? active.key : null} tabs={false}>
                            {sections.map((entry) => (
                                <button
                                    key={entry.key}
                                    type="button"
                                    data-tab-key={entry.key}
                                    onClick={() => setSection(entry.key)}
                                    aria-current={active && active.key === entry.key ? 'page' : undefined}
                                    className={[
                                        'touch-target -mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                                        active && active.key === entry.key
                                            ? 'border-[var(--becpg-orange)] text-[var(--becpg-blue)]'
                                            // Same swap, same reason as the product sheet's
                                            // bar: on the page surface #747474 is 4.43:1,
                                            // #666666 is 5.44:1.
                                            : 'border-transparent text-[var(--becpg-dark-grey-deep)] hover:text-[var(--becpg-blue)]',
                                    ].join(' ')}
                                >
                                    <ListIcon
                                        type={
                                            entry.step
                                                ? entry.step.listName || entry.step.listId || entry.step.type
                                                : entry.key
                                        }
                                    />
                                    {entry.label}
                                </button>
                            ))}
                        </TabScroller>
                    </div>

                    {wizard.loading || entity.loading ? (
                        <SkeletonCard lines={5} />
                    ) : active && active.key === 'documents' ? (
                        <RequirementChecklist
                            groups={(requirements.data && requirements.data.groups) || []}
                            summary={requirements.data ? requirements.data.summary : null}
                            loading={requirements.loading}
                            error={requirements.error}
                            onRetry={requirements.refresh}
                            onUploaded={() => {
                                requirements.refresh();
                                approval.refresh();
                            }}
                        />
                    ) : active && active.key === 'specs' ? (
                        <SpecPanel
                            specifications={(specs.data && specs.data.specifications) || []}
                            unreadable={(specs.data && specs.data.unreadable) || 0}
                            loading={specs.loading}
                            error={specs.error}
                            onRetry={specs.refresh}
                        />
                    ) : active && activeStep && activeStep.type === 'form' ? (
                        <IdentitySection
                            data={stepData.data}
                            loading={stepData.loading}
                            error={stepData.error}
                            onRetry={stepData.refresh}
                            labels={labels}
                            lang={lang}
                        />
                    ) : active && activeStep && activeStep.type === 'survey' ? (
                        <SurveySection
                            // Keyed on the step: several questionnaires
                            // (`surveyList`, `surveyList@1`…) are independent, and
                            // switching between them must rebuild the tree rather
                            // than re-seed it.
                            key={activeStep.id}
                            stepId={activeStep.id}
                            data={stepData.data}
                            loading={stepData.loading}
                            error={stepData.error}
                            onRetry={stepData.refresh}
                            labels={labels}
                            frozen={activeStep.frozen}
                        />
                    ) : active && activeStep ? (
                        <DataListSection
                            key={activeStep.id}
                            stepId={activeStep.id}
                            data={stepData.data}
                            loading={stepData.loading}
                            error={stepData.error}
                            onRetry={stepData.refresh}
                            labels={labels}
                            frozen={activeStep.frozen}
                        />
                    ) : null}
                </>
            )}
        </AppShell>
    );
}
