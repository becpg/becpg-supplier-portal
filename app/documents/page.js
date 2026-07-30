'use client';

/**
 * `/documents` — *"qu'est-ce que je dois fournir, et pour quand ?"*
 *
 * This is the screen spec §4.5 calls the biggest gain for the smallest cost: the
 * data already exists in beCPG (`DocumentFormulationHandler` materialises the
 * expected documents on every entity), it was simply never shown to the person
 * who has to act on it. So the page is a **check-list**, not a document library:
 * it opens on what is missing, not on what is filed.
 *
 * Two views over the same rows (`GET /documents/requirements` and
 * `GET /documents` return the same projection, spec §5.4.2):
 *
 *   - **Exigences** — the check-list, grouped by product, with drag & drop
 *     deposit on each line;
 *   - **Tous les documents** — the flat table, for someone looking for a file
 *     rather than for a task.
 *
 * Nothing is computed here: statuses, deadlines and the "blocking" flag all come
 * from the API, which owns the notice delay and the status precedence.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { Button, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { GaugeBar } from '@/components/ui/Gauge';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { StatusPill } from '@/components/ui/StatusPill';
import { RequirementChecklist } from '@/components/documents/RequirementChecklist';
import { DocumentUpload, AiValidationBadge } from '@/components/documents/DocumentUpload';
import { ExpiryPill } from '@/components/documents/ExpiryPill';
import { download, useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        title: 'Mes documents',
        subtitle: 'Ce que le client attend de vous, et pour quand',
        tabRequirements: 'Exigences',
        tabAll: 'Tous les documents',
        deposit: 'Déposer un document',
        depositTitle: 'Déposer un document',
        depositHint:
            'Choisissez le produit concerné, puis déposez le fichier. Le type et la durée de validité sont déduits par beCPG.',
        entity: 'Produit concerné',
        chooseEntity: 'Choisir un produit…',
        filters: {
            open: 'À traiter',
            blocking: 'Bloquants',
            expiring: 'Expire bientôt',
            done: 'Fournis',
            all: 'Tout',
        },
        stats: {
            toProvide: 'À fournir',
            expired: 'Expirés',
            expiring: 'Expire < {days} j',
            compliance: 'Conformité documentaire',
            mandatory: '{done} / {total} obligatoires',
        },
        search: 'Rechercher un document',
        noMatch: 'Aucun document ne correspond à ce filtre',
        noMatchHint: 'Essayez « Tout » pour voir l’ensemble de vos documents.',
        columns: {
            document: 'Document',
            entity: 'Produit',
            status: 'Statut',
            validity: 'Validité',
            ai: 'Analyse IA',
            actions: '',
        },
        download: 'Télécharger',
        noFile: 'Pas encore fourni',
        blockingBanner:
            '{count} document(s) obligatoire(s) bloquent votre agrément. Ils sont en haut de la liste.',
    },
    en: {
        title: 'My documents',
        subtitle: 'What the customer expects from you, and by when',
        tabRequirements: 'Requirements',
        tabAll: 'All documents',
        deposit: 'Upload a document',
        depositTitle: 'Upload a document',
        depositHint:
            'Pick the product it belongs to, then drop the file. Type and validity are derived by beCPG.',
        entity: 'Related product',
        chooseEntity: 'Choose a product…',
        filters: {
            open: 'To handle',
            blocking: 'Blocking',
            expiring: 'Expiring',
            done: 'Provided',
            all: 'All',
        },
        stats: {
            toProvide: 'To provide',
            expired: 'Expired',
            expiring: 'Expiring < {days} d',
            compliance: 'Document compliance',
            mandatory: '{done} / {total} mandatory',
        },
        search: 'Search a document',
        noMatch: 'No document matches this filter',
        noMatchHint: 'Try "All" to see every document.',
        columns: {
            document: 'Document',
            entity: 'Product',
            status: 'Status',
            validity: 'Validity',
            ai: 'AI review',
            actions: '',
        },
        download: 'Download',
        noFile: 'Not provided yet',
        blockingBanner:
            '{count} mandatory document(s) are holding your approval back. They are at the top of the list.',
    },
};

/** Notice window shown in the KPI row; the API owns the real value. */
const NOTICE_DAYS = 60;

function fill(template, vars) {
    return template.replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]),
    );
}

/** The filter chips, in the order a supplier reasons about his backlog. */
const FILTERS = ['open', 'blocking', 'expiring', 'done', 'all'];

/**
 * Applies the active chip and the search term to one requirement.
 *
 * @param {Object} requirement
 * @param {string} filter one of FILTERS
 * @param {string} term lowercased search term
 * @returns {boolean}
 */
function matches(requirement, filter, term) {
    if (term) {
        const haystack = [
            requirement.name,
            requirement.type && requirement.type.label,
            requirement.category,
            requirement.entity && requirement.entity.label,
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        if (!haystack.includes(term)) {
            return false;
        }
    }
    switch (filter) {
        case 'open':
            return !requirement.satisfied;
        case 'blocking':
            return Boolean(requirement.blocking);
        case 'expiring':
            return requirement.status === 'expiring' || requirement.status === 'expired';
        case 'done':
            return Boolean(requirement.satisfied);
        default:
            return true;
    }
}

export default function DocumentsPage() {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;

    const [tab, setTab] = useState('requirements');
    const [filter, setFilter] = useState('open');
    const [query, setQuery] = useState('');
    const [depositOpen, setDepositOpen] = useState(false);
    const [depositEntity, setDepositEntity] = useState('');
    const depositRef = useRef(null);

    const requirements = useApi('documents/requirements');
    // The flat table is only fetched when its tab is opened — the check-list is
    // what the screen is for, and a supplier on 3G should not pay for both.
    const documents = useApi(tab === 'all' ? 'documents' : null, { params: { pageSize: 200 } });

    const summary = requirements.data ? requirements.data.summary : null;
    const byStatus = (summary && summary.byStatus) || {};

    const refreshAll = useCallback(() => {
        requirements.refresh();
        if (tab === 'all') {
            documents.refresh();
        }
    }, [requirements, documents, tab]);

    /** The entities a free deposit can be attached to, taken from the check-list. */
    const entities = useMemo(() => {
        const groups = (requirements.data && requirements.data.groups) || [];
        return groups
            .map((group) => group.entity)
            .filter((entity) => entity && entity.nodeRef)
            .map((entity) => ({ value: entity.nodeRef, label: entity.label || entity.name || entity.nodeRef }));
    }, [requirements.data]);

    const filteredGroups = useMemo(() => {
        const groups = (requirements.data && requirements.data.groups) || [];
        const term = query.trim().toLowerCase();
        return groups
            .map((group) => ({
                ...group,
                items: (group.items || []).filter((item) => matches(item, filter, term)),
            }))
            .filter((group) => group.items.length > 0);
    }, [requirements.data, filter, query]);

    const counts = useMemo(() => {
        const rows = (requirements.data && requirements.data.requirements) || [];
        return {
            open: rows.filter((row) => !row.satisfied).length,
            blocking: rows.filter((row) => row.blocking).length,
            expiring: rows.filter((row) => row.status === 'expiring' || row.status === 'expired').length,
            done: rows.filter((row) => row.satisfied).length,
            all: rows.length,
        };
    }, [requirements.data]);

    const columns = useMemo(
        () => [
            {
                id: 'document',
                accessorFn: (row) => `${(row.type && row.type.label) || ''} ${row.name || ''}`,
                header: labels.columns.document,
                meta: { primary: true, label: labels.columns.document },
                cell: ({ row }) => (
                    <div className="min-w-0">
                        <p className="truncate font-medium">
                            {(row.original.type && row.original.type.label) || row.original.name || '—'}
                        </p>
                        <p className="truncate text-xs text-[var(--becpg-dark-grey)]">
                            {row.original.isProvided ? row.original.name : labels.noFile}
                        </p>
                    </div>
                ),
            },
            {
                id: 'entity',
                accessorFn: (row) => (row.entity ? row.entity.label : ''),
                header: labels.columns.entity,
                meta: { secondary: true, label: labels.columns.entity },
                cell: ({ row }) => (
                    <span className="block max-w-[16rem] truncate">
                        {row.original.entity ? row.original.entity.label : '—'}
                    </span>
                ),
            },
            {
                id: 'status',
                accessorKey: 'status',
                header: labels.columns.status,
                meta: { badge: true, label: labels.columns.status },
                cell: ({ row }) => <StatusPill status={row.original.status} size="sm" />,
            },
            {
                id: 'validity',
                accessorFn: (row) => row.validTo || '',
                header: labels.columns.validity,
                meta: { label: labels.columns.validity },
                cell: ({ row }) => (
                    <ExpiryPill
                        status={row.original.status}
                        validTo={row.original.validTo}
                        daysToExpiry={row.original.daysToExpiry}
                        size="sm"
                    />
                ),
            },
            {
                id: 'ai',
                accessorFn: (row) => row.aiValidationState || '',
                header: labels.columns.ai,
                meta: { label: labels.columns.ai },
                cell: ({ row }) => (
                    <AiValidationBadge
                        state={row.original.aiValidationState}
                        hints={row.original.aiValidationHints}
                        date={row.original.aiValidationDate}
                    />
                ),
            },
            {
                id: 'actions',
                header: labels.columns.actions,
                enableSorting: false,
                meta: { align: 'right', label: labels.download, width: '7rem' },
                cell: ({ row }) =>
                    row.original.downloadUrl ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            icon="download"
                            onClick={(event) => {
                                event.stopPropagation();
                                download(`documents/${row.original.id}/content`);
                            }}
                        >
                            {labels.download}
                        </Button>
                    ) : null,
            },
        ],
        [labels],
    );

    const blocking = summary ? summary.blocking || 0 : 0;

    return (
        <AppShell
            title={labels.title}
            badges={{ documents: counts.open }}
            actions={
                <Button
                    variant="accent"
                    size="sm"
                    icon="upload_file"
                    onClick={() => setDepositOpen(true)}
                    disabled={entities.length === 0}
                >
                    <span className="hidden sm:inline">{labels.deposit}</span>
                </Button>
            }
        >
            <p className="mb-4 text-sm text-[var(--becpg-dark-grey)]">{labels.subtitle}</p>

            {/* ------------------------------------------------------ KPI row */}
            <StatGrid columns={4} className="mb-4">
                <StatCard
                    label={labels.stats.toProvide}
                    value={byStatus.missing || 0}
                    icon="upload_file"
                    tone={byStatus.missing ? 'warn' : 'ok'}
                    loading={requirements.loading}
                    index={0}
                    onClick={() => {
                        setTab('requirements');
                        setFilter('open');
                    }}
                />
                <StatCard
                    label={labels.stats.expired}
                    value={byStatus.expired || 0}
                    icon="error_outline"
                    tone={byStatus.expired ? 'danger' : 'ok'}
                    loading={requirements.loading}
                    index={1}
                    onClick={() => {
                        setTab('requirements');
                        setFilter('expiring');
                    }}
                />
                <StatCard
                    label={fill(labels.stats.expiring, { days: NOTICE_DAYS })}
                    value={byStatus.expiring || 0}
                    icon="schedule"
                    tone={byStatus.expiring ? 'warn' : 'ok'}
                    loading={requirements.loading}
                    index={2}
                    onClick={() => {
                        setTab('requirements');
                        setFilter('expiring');
                    }}
                />
                <StatCard
                    label={labels.stats.compliance}
                    value={summary ? summary.completeness : 0}
                    unit="%"
                    icon="verified"
                    tone={
                        !summary || summary.completeness >= 100
                            ? 'ok'
                            : summary.completeness >= 60
                              ? 'warn'
                              : 'danger'
                    }
                    hint={
                        summary
                            ? fill(labels.stats.mandatory, {
                                  done: summary.mandatorySatisfied,
                                  total: summary.mandatory,
                              })
                            : undefined
                    }
                    loading={requirements.loading}
                    index={3}
                >
                    <GaugeBar
                        value={summary ? summary.completeness : null}
                        showValue={false}
                        size="sm"
                        className="mt-2"
                    />
                </StatCard>
            </StatGrid>

            {blocking > 0 ? (
                <Card variant="accent" padding="sm" className="mb-4">
                    <p className="flex items-start gap-2 text-sm">
                        <Icon name="priority_high" size={18} className="mt-0.5 text-[var(--becpg-orange)]" />
                        <span>{fill(labels.blockingBanner, { count: blocking })}</span>
                    </p>
                </Card>
            ) : null}

            {/* --------------------------------------------------------- tabs */}
            <div className="mb-3 flex items-center gap-1 border-b border-[var(--becpg-grey)]">
                {[
                    { id: 'requirements', label: labels.tabRequirements },
                    { id: 'all', label: labels.tabAll },
                ].map((entry) => (
                    <button
                        key={entry.id}
                        type="button"
                        onClick={() => setTab(entry.id)}
                        aria-current={tab === entry.id ? 'page' : undefined}
                        className={[
                            'touch-target -mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                            tab === entry.id
                                ? 'border-[var(--becpg-orange)] text-[var(--becpg-blue)]'
                                : 'border-transparent text-[var(--becpg-dark-grey)] hover:text-[var(--becpg-blue)]',
                        ].join(' ')}
                    >
                        {entry.label}
                    </button>
                ))}
            </div>

            {tab === 'requirements' ? (
                <>
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="scroll-x no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0">
                            {FILTERS.map((entry) => (
                                <button
                                    key={entry}
                                    type="button"
                                    onClick={() => setFilter(entry)}
                                    aria-pressed={filter === entry}
                                    className={[
                                        'touch-target inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                                        filter === entry
                                            ? 'border-[var(--becpg-blue)] bg-[var(--becpg-blue)] text-white'
                                            : 'border-[var(--becpg-grey)] bg-white text-[var(--becpg-blue)] hover:bg-[var(--becpg-grey)]',
                                    ].join(' ')}
                                >
                                    {labels.filters[entry]}
                                    <span
                                        className={
                                            filter === entry
                                                ? 'tabular-nums opacity-80'
                                                : 'tabular-nums text-[var(--becpg-dark-grey)]'
                                        }
                                    >
                                        {counts[entry]}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className="sm:ml-auto sm:w-64">
                            <SearchInput value={query} onChange={setQuery} placeholder={labels.search} />
                        </div>
                    </div>

                    <RequirementChecklist
                        groups={filteredGroups}
                        summary={summary}
                        loading={requirements.loading}
                        error={requirements.error}
                        onRetry={requirements.refresh}
                        onUploaded={refreshAll}
                        noticeDays={NOTICE_DAYS}
                        emptyState={
                            requirements.data && counts.all > 0 ? (
                                <EmptyState
                                    variant={filter === 'open' || filter === 'blocking' ? 'success' : 'search'}
                                    icon={filter === 'open' ? 'verified' : undefined}
                                    title={labels.noMatch}
                                    message={labels.noMatchHint}
                                    actionLabel={labels.filters.all}
                                    onAction={() => {
                                        setFilter('all');
                                        setQuery('');
                                    }}
                                />
                            ) : undefined
                        }
                    />
                </>
            ) : documents.error ? (
                <ErrorState error={documents.error} onRetry={documents.refresh} />
            ) : (
                <DataTable
                    columns={columns}
                    data={(documents.data && documents.data.items) || []}
                    loading={documents.loading}
                    getRowId={(row, index) => String(row.id ?? row.nodeRef ?? index)}
                    searchPlaceholder={labels.search}
                    initialSorting={[{ id: 'validity', desc: false }]}
                    pageSize={25}
                />
            )}

            {/* ----------------------------------------------- free deposit */}
            <Modal
                open={depositOpen}
                onClose={() => setDepositOpen(false)}
                title={labels.depositTitle}
                description={labels.depositHint}
                size="md"
            >
                <div className="flex flex-col gap-3">
                    <label className="text-sm font-medium text-[var(--becpg-blue)]" htmlFor="deposit-entity">
                        {labels.entity}
                    </label>
                    <Select
                        id="deposit-entity"
                        value={depositEntity}
                        onChange={(event) => setDepositEntity(event.target.value)}
                        options={entities}
                        placeholder={labels.chooseEntity}
                    />
                    <div ref={depositRef}>
                        <DocumentUpload
                            entityRef={depositEntity || undefined}
                            disabled={!depositEntity}
                            disabledReason={labels.chooseEntity}
                            dropRef={depositRef}
                            onUploaded={refreshAll}
                        />
                    </div>
                </div>
            </Modal>
        </AppShell>
    );
}
