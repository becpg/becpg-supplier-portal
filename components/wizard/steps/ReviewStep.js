'use client';

/**
 * Two read-only surfaces that share one idea: *show the sheet, change nothing*.
 *
 * - {@link ComplianceStep} — **Étape n+1 · Conformité** (spec §4.4). The
 *   catalogue check: completion score, missing fields **clickable** (they are
 *   the whole point — a list of field names nobody can act on is a report, not a
 *   tool), and the verdict that gates "Terminer".
 * - {@link ReviewStep} — the `review` task type of `/tasks/[id]`: the customer
 *   asked the supplier to *look* at something. Same steps, same renderers, every
 *   one of them forced read-only.
 *
 * Forcing read-only is always **additive**: a step the server declared writable
 * can be rendered read-only here, but a step the server declared read-only can
 * never be relaxed (spec §6, and the reason `saveStep` refuses server-side too).
 *
 * ## What "blocking" means for a catalogue
 *
 * beCPG's catalogue payload carries a score and the missing fields; it does not
 * carry a "blocking" flag today. {@link blockingCatalogs} therefore reads one if
 * the repository ever sends it (`blocking` / `isBlocking`), and otherwise falls
 * back on the only honest rule available: **a catalogue with missing fields is
 * unsatisfied**. The wizard accepts an explicit list of blocking catalogue ids
 * to narrow that down per client, so the fallback is a default, not a policy
 * baked into the code.
 */

import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button, Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { CatalogPanel } from '@/components/products/CatalogPanel';
import { RequirementChecklist } from '@/components/documents/RequirementChecklist';
import { FormStep } from '@/components/wizard/steps/FormStep';
import { DataListStep } from '@/components/wizard/steps/DataListStep';
import { SurveyStep } from '@/components/wizard/steps/SurveyStep';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        title: 'Conformité',
        subtitle: 'Ce qui manque encore pour que votre client puisse valider la fiche.',
        blocking: 'Catalogue(s) bloquant(s) : {names}',
        blockingHint: 'Complétez les champs manquants ci-dessous pour pouvoir terminer.',
        ready: 'Tous les catalogues bloquants sont satisfaits',
        documents: 'Documents obligatoires',
        documentsMissing: '{count} document(s) obligatoire(s) manquant(s)',
        documentsOk: 'Tous les documents obligatoires sont fournis',
        reviewTitle: 'Fiche en lecture seule',
        reviewSubtitle: 'Vous consultez cette fiche : aucune modification n’est possible.',
        expand: 'Afficher',
        collapse: 'Masquer',
        empty: 'Rien à afficher',
    },
    en: {
        title: 'Compliance',
        subtitle: 'What is still missing before your customer can validate the sheet.',
        blocking: 'Blocking catalog(s): {names}',
        blockingHint: 'Fill in the missing fields below to be able to finish.',
        ready: 'Every blocking catalog is satisfied',
        documents: 'Mandatory documents',
        documentsMissing: '{count} mandatory document(s) missing',
        documentsOk: 'Every mandatory document is provided',
        reviewTitle: 'Read-only sheet',
        reviewSubtitle: 'You are viewing this sheet: no modification is possible.',
        expand: 'Show',
        collapse: 'Hide',
        empty: 'Nothing to display',
    },
};

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])),
    );
}

/**
 * The catalogues that hold the finish button back.
 *
 * @param {Array<Object>} catalogs from `GET /api/v1/entities/{id}/catalogs`
 * @param {string[]} [blockingIds] restrict the gate to these catalogue ids
 * @returns {Array<Object>} the unsatisfied blocking catalogues
 *
 * @example
 * blockingCatalogs(catalogs).length === 0; // "Terminer" may be enabled
 */
export function blockingCatalogs(catalogs, blockingIds = null) {
    const list = Array.isArray(catalogs) ? catalogs : [];
    return list.filter((catalog) => {
        const declared = catalog.blocking ?? catalog.isBlocking;
        const isBlocking = declared === undefined
            ? (Array.isArray(blockingIds) ? blockingIds.includes(catalog.id) : true)
            : Boolean(declared);
        if (!isBlocking) {
            return false;
        }
        const missing = Array.isArray(catalog.missingFields) ? catalog.missingFields.length : 0;
        return missing > 0 || catalog.isComplete === false;
    });
}

/**
 * **Étape n+1 · Conformité.**
 *
 * @param {Object} props
 * @param {Array<Object>} props.catalogs
 * @param {number|null} [props.score]
 * @param {boolean} [props.loading]
 * @param {Error} [props.error]
 * @param {Function} [props.onRetry]
 * @param {Function} [props.onFieldClick] `(field, catalog) => void` — jumps to the field
 * @param {string[]} [props.blockingIds]
 * @param {Object} [props.documentSummary] the `summary` of `/documents/requirements`
 * @param {Function} [props.onOpenDocuments]
 * @param {string} [props.className]
 */
export function ComplianceStep({
    catalogs,
    score = null,
    loading = false,
    error = null,
    onRetry,
    onFieldClick,
    blockingIds = null,
    documentSummary = null,
    onOpenDocuments,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;

    const blocking = useMemo(() => blockingCatalogs(catalogs, blockingIds), [catalogs, blockingIds]);
    const missingDocuments = documentSummary ? Number(documentSummary.blocking) || 0 : 0;

    return (
        <div className={`min-w-0 ${className}`}>
            <div className="mb-3">
                <h3 className="text-base font-medium text-[var(--becpg-blue)]">{labels.title}</h3>
                <p className="text-sm text-[var(--becpg-dark-grey)]">{labels.subtitle}</p>
            </div>

            {!loading && !error ? (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    {blocking.length === 0 ? (
                        <StatusPill status="valid" tone="ok" icon="verified" size="sm" label={labels.ready} />
                    ) : (
                        <StatusPill
                            status="missing"
                            tone="warn"
                            icon="report"
                            size="sm"
                            label={fill(labels.blocking, {
                                names: blocking.map((catalog) => catalog.label).join(', '),
                            })}
                        />
                    )}
                    {documentSummary ? (
                        missingDocuments > 0 ? (
                            <button type="button" onClick={onOpenDocuments}>
                                <StatusPill
                                    status="missing"
                                    tone="danger"
                                    icon="folder_off"
                                    size="sm"
                                    label={fill(labels.documentsMissing, { count: missingDocuments })}
                                />
                            </button>
                        ) : (
                            <StatusPill
                                status="valid"
                                tone="ok"
                                icon="folder"
                                size="sm"
                                label={labels.documentsOk}
                            />
                        )
                    ) : null}
                </div>
            ) : null}

            {blocking.length > 0 ? (
                <p className="mb-3 text-sm text-[var(--becpg-dark-grey)]">{labels.blockingHint}</p>
            ) : null}

            <CatalogPanel
                catalogs={catalogs || []}
                score={score === null ? undefined : score}
                loading={loading}
                error={error}
                onRetry={onRetry}
                onFieldClick={onFieldClick}
            />
        </div>
    );
}

/**
 * A collapsible section of the read-only review.
 */
function ReviewSection({ step, open, onToggle, children, labels }) {
    const reduceMotion = useReducedMotion();
    return (
        <Card padding="none" className="overflow-hidden">
            <button
                type="button"
                aria-expanded={open}
                onClick={() => onToggle(step.id)}
                className="touch-target flex w-full items-center gap-2 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
            >
                <Icon
                    name={step.frozen ? 'lock' : 'description'}
                    size={18}
                    className="shrink-0 text-[var(--becpg-dark-grey)]"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--becpg-blue)]">
                    {step.label}
                </span>
                <span className="shrink-0 text-xs text-[var(--becpg-dark-grey)]">
                    {open ? labels.collapse : labels.expand}
                </span>
                <Icon name={open ? 'expand_less' : 'expand_more'} size={18} className="shrink-0" />
            </button>
            <AnimatePresence initial={false}>
                {open ? (
                    <motion.div
                        initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-[var(--becpg-grey)] p-4">{children}</div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </Card>
    );
}

/**
 * **The `review` task type**: the whole sheet, read-only, section by section.
 *
 * Each section is mounted only once it is expanded — a sheet has up to ten
 * lists, and loading them all at once would be ten calls for a screen the user
 * mostly scrolls past.
 *
 * @param {Object} props
 * @param {string} props.entityId entity nodeRef
 * @param {Object} [props.state] an already-loaded wizard state (`GET /api/v1/wizard/{id}`)
 * @param {string} [props.wizardId] forces a wizard when the state is fetched here
 * @param {boolean} [props.withCompliance=true] appends the catalogue panel
 * @param {string} [props.className]
 */
export function ReviewStep({ entityId, state = null, wizardId, withCompliance = true, className = '' }) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;

    const fetched = useApi(!state && entityId ? `wizard/${encodeURIComponent(entityId)}` : null, {
        params: { wizardId },
    });
    const wizardState = state || fetched.data;

    const params = useMemo(
        () => ({ wizardId: wizardState ? wizardState.wizardId : wizardId }),
        [wizardState, wizardId],
    );

    // Read-only is *added*, never relaxed: a step the server froze stays frozen.
    const steps = useMemo(() => {
        const list = (wizardState && wizardState.steps) || [];
        return list.map((step) => ({
            ...step,
            label: step.label || step.title || step.id,
            readOnly: true,
        }));
    }, [wizardState]);

    const [open, setOpen] = useState({});
    const toggle = useCallback((id) => setOpen((current) => ({ ...current, [id]: !current[id] })), []);

    const catalogs = useApi(withCompliance && entityId ? `entities/${encodeURIComponent(entityId)}/catalogs` : null);
    const requirements = useApi(
        wizardState && wizardState.entity ? 'documents/requirements' : null,
        { params: { entity: wizardState && wizardState.entity ? wizardState.entity.nodeRef : null } },
    );

    if (fetched.error) {
        return <ErrorState error={fetched.error} onRetry={fetched.refresh} />;
    }
    if (!wizardState) {
        return (
            <div className={`flex flex-col gap-3 ${className}`}>
                <SkeletonCard lines={3} />
                <SkeletonCard lines={3} />
            </div>
        );
    }

    const entityNodeRef = wizardState.entity ? wizardState.entity.nodeRef : entityId;
    const firstId = steps.length > 0 ? steps[0].id : null;

    return (
        <div className={`flex min-w-0 flex-col gap-3 ${className}`}>
            <div className="rounded-xl border border-[var(--becpg-grey)] bg-[var(--becpg-grey)]/40 p-3">
                <p className="text-sm font-medium text-[var(--becpg-blue)]">{labels.reviewTitle}</p>
                <p className="mt-0.5 text-sm text-[var(--becpg-dark-grey)]">{labels.reviewSubtitle}</p>
            </div>

            {steps.length === 0 ? (
                <EmptyState variant="empty" icon="description" title={labels.empty} />
            ) : null}

            {steps.map((step) => {
                const isOpen = open[step.id] === undefined ? step.id === firstId : open[step.id];
                return (
                    <ReviewSection key={step.id} step={step} open={isOpen} onToggle={toggle} labels={labels}>
                        {!isOpen ? null : step.type === 'form' ? (
                            <FormStep entityId={entityNodeRef} step={step} params={params} autoSave={null} />
                        ) : step.type === 'survey' ? (
                            <SurveyStep entityId={entityNodeRef} step={step} params={params} autoSave={null} />
                        ) : step.type === 'documents' ? (
                            <RequirementChecklist
                                groups={requirements.data ? requirements.data.groups : undefined}
                                requirements={requirements.data ? requirements.data.requirements : undefined}
                                summary={requirements.data ? requirements.data.summary : null}
                                loading={requirements.loading}
                                error={requirements.error}
                                onRetry={requirements.refresh}
                                groupByEntity={false}
                                compact
                            />
                        ) : (
                            <DataListStep entityId={entityNodeRef} step={step} params={params} autoSave={null} />
                        )}
                    </ReviewSection>
                );
            })}

            {withCompliance ? (
                <Card padding="lg">
                    <ComplianceStep
                        catalogs={(catalogs.data && catalogs.data.catalogs) || []}
                        score={catalogs.data ? catalogs.data.score : null}
                        loading={catalogs.loading}
                        error={catalogs.error}
                        onRetry={catalogs.refresh}
                        documentSummary={requirements.data ? requirements.data.summary : null}
                    />
                </Card>
            ) : null}
        </div>
    );
}
