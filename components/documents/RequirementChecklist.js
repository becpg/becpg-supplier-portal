'use client';

/**
 * *"Qu'est-ce que je dois fournir, et pour quand ?"* — the check-list that
 * answers it (spec §4.5, trou n°1).
 *
 * It renders, unchanged, what `GET /api/v1/documents/requirements` returns:
 * the expected documents materialised by `DocumentFormulationHandler`, grouped
 * by entity, each with `satisfied`, `blocking`, `dueDate` and `action`. **No
 * business rule is re-derived here** — the component sorts and phrases, the
 * server decides.
 *
 * Two shapes, one component:
 *   - the `/documents` screen, where it is the page;
 *   - the wizard's "Étape 1 · Documents" (spec §4.4), where it is a panel —
 *     pass `compact` and a filtered `groups`.
 *
 * Each line is a drop target: dragging a PDF onto "Certificat IFS" uploads it
 * against that requirement (`documentRef` = the placeholder), which is the
 * shortest path that exists between a supplier's desktop and a compliant file.
 */

import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMessages } from '@/lib/messages';
import { Button, Icon, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GaugeBar } from '@/components/ui/Gauge';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { download } from '@/lib/client';
import { DocumentUpload, AiValidationBadge, uploadTargetOf } from '@/components/documents/DocumentUpload';
import { AiVerdictContest } from '@/components/documents/AiVerdictContest';
import { DocumentValidity } from '@/components/documents/DocumentValidity';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { ExpiryPill, ExpiryBar } from '@/components/documents/ExpiryPill';
import { entityTypeLabel } from '@/components/products/ProductHeader';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/documents/RequirementChecklist#LABELS', {
    fr: {
        mandatory: 'Obligatoire',
        satisfied: 'Fourni',
        upload: 'Déposer',
        renew: 'Renouveler',
        replace: 'Remplacer',
        download: 'Télécharger',
        consult: 'Consulter',
        details: 'Détails',
        hide: 'Masquer',
        of: '{done} / {total} documents obligatoires',
        allDone: 'Tout est à jour',
        allDoneHint: 'Aucun document n’est attendu de votre part pour le moment.',
        nothing: 'Aucune exigence documentaire',
        nothingHint: 'Le client n’a pas encore défini de documents attendus pour ce périmètre.',
        openCount: '{count} à traiter',
        blockingCount: '{count} obligatoire(s) à régulariser',
        category: 'Catégorie',
        readOnly: 'Le dépôt est fermé sur cette fiche.',
        noEntity: 'Documents fournisseur',
        aiHints: 'Remarques de l’analyse',
        deposit: 'Déposer un fichier',
        file: 'Fichier',
        actionOn: '{action} : {document}',
    },
    en: {
        mandatory: 'Mandatory',
        satisfied: 'Provided',
        upload: 'Upload',
        renew: 'Renew',
        replace: 'Replace',
        download: 'Download',
        consult: 'View',
        details: 'Details',
        hide: 'Hide',
        of: '{done} / {total} mandatory documents',
        allDone: 'Everything is up to date',
        allDoneHint: 'Nothing is expected from you at the moment.',
        nothing: 'No document requirement',
        nothingHint: 'The customer has not defined any expected document for this scope yet.',
        openCount: '{count} to handle',
        blockingCount: '{count} mandatory to fix',
        category: 'Category',
        readOnly: 'Uploads are closed on this sheet.',
        noEntity: 'Supplier documents',
        aiHints: 'Analysis notes',
        deposit: 'Upload a file',
        file: 'File',
        actionOn: '{action}: {document}',
    },
});

/** Worst first: a supplier must see what blocks him before what is merely valid. */
const STATUS_WEIGHT = {
    expired: 0,
    missing: 1,
    refused: 2,
    expiring: 3,
    toValidate: 4,
    valid: 5,
};

function labelsFor(lang) {
    return pickLabels(LABELS, lang);
}

function fill(template, vars) {
    return template.replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]),
    );
}

/**
 * Orders a group's requirements: blocking first, then by status severity, then
 * by deadline, then alphabetically — a stable order that never reshuffles when
 * a file is uploaded.
 *
 * @param {Array<Object>} items
 * @returns {Array<Object>}
 */
function sortRequirements(items) {
    return [...items].sort((a, b) => {
        if (a.blocking !== b.blocking) {
            return a.blocking ? -1 : 1;
        }
        const weightA = STATUS_WEIGHT[a.status] ?? 9;
        const weightB = STATUS_WEIGHT[b.status] ?? 9;
        if (weightA !== weightB) {
            return weightA - weightB;
        }
        const dueA = a.dueDate ? Date.parse(a.dueDate) : Number.MAX_SAFE_INTEGER;
        const dueB = b.dueDate ? Date.parse(b.dueDate) : Number.MAX_SAFE_INTEGER;
        if (dueA !== dueB) {
            return dueA - dueB;
        }
        return String(a.name || '').localeCompare(String(b.name || ''));
    });
}

/** The label of a requirement: the document type, falling back to the file name. */
function requirementLabel(requirement) {
    return (requirement.type && requirement.type.label) || requirement.name || '—';
}

/* -------------------------------------------------------------------------- */
/* One line                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * @param {Object} props
 * @param {Object} props.requirement one row of `/documents/requirements`
 * @param {Function} [props.onUploaded]
 * @param {number} [props.noticeDays=60]
 * @param {boolean} [props.compact]
 * @param {boolean} [props.readOnly] entry is closed: no deposit, no date
 * @param {number} [props.index] stagger position
 */
function RequirementRow({
    requirement,
    onUploaded,
    noticeDays = 60,
    compact = false,
    readOnly = false,
    index = 0,
}) {
    const { lang } = useMessages();
    const labels = labelsFor(lang);
    const reduceMotion = useReducedMotion();
    const rowRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [viewing, setViewing] = useState(false);

    const label = requirementLabel(requirement);
    // Every row carries the same four actions: each name says which document it acts on.
    const nameFor = (action) => fill(labels.actionOn, { action, document: label });
    const target = uploadTargetOf(requirement);
    const canAct = Boolean(requirement.action) || requirement.status !== 'missing';
    const actionLabel = requirement.action === 'renew'
        ? labels.renew
        : requirement.action === 'upload'
          ? labels.upload
          : labels.replace;

    return (
        <motion.li
            ref={rowRef}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: Math.min(index, 10) * 0.03 }}
            className="border-b border-[var(--becpg-line)] last:border-b-0"
        >
            {/* A line of the group's list, not a card of its own: one status
                icon carries the tone, the pills say it in words, and the action
                sits at the end of the line with the other ones. */}
            <div className={compact ? 'py-2' : 'py-2.5'}>
                <div className="flex items-start gap-2.5">
                    <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                            requirement.satisfied
                                ? 'bg-[var(--status-ok-bg)] text-[var(--status-ok)]'
                                : requirement.blocking
                                  ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger)]'
                                  : 'bg-[var(--status-warn-bg)] text-[var(--status-warn)]'
                        }`}
                    >
                        <Icon
                            name={
                                requirement.satisfied
                                    ? 'task_alt'
                                    : requirement.blocking
                                      ? 'priority_high'
                                      : 'radio_button_unchecked'
                            }
                            size={14}
                        />
                    </span>

                    <div className="min-w-0 flex-1">
                        {/* The name and its state on one line: the pills are what the
                            name is read with, and a second line only spread them out. */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="break-words text-sm font-medium leading-snug">{label}</p>
                            <ExpiryPill
                                status={requirement.status}
                                validTo={requirement.validTo}
                                daysToExpiry={requirement.daysToExpiry}
                                size="sm"
                            />
                            {/* One pill, not two: « Bloquant » was `isMandatory`
                                AND a status of missing / expired / refused, both
                                already written beside it in words and in icons.
                                The tone emphasises, it never carries the meaning. */}
                            {requirement.isMandatory ? (
                                <span className="pill pill-no-dot pill-sm pill-neutral">
                                    <Icon name="push_pin" size={12} />
                                    <span>{labels.mandatory}</span>
                                </span>
                            ) : null}
                            <AiValidationBadge
                                state={requirement.aiValidationState}
                                hints={requirement.aiValidationHints}
                                date={requirement.aiValidationDate}
                            />
                        </div>

                        {/*
                            THE VALIDITY ON THE ROW, NOT INSIDE THE FOLD.

                            It only showed once "Détails" was expanded, in grey,
                            next to the category — yet it is the fact that decides
                            whether a certificate is still worth anything, and on a
                            MANUAL effectivity type the only one the supplier has to
                            type. It sits here now, coloured as Share colours it,
                            and editable in place.
                        */}
                        <DocumentValidity
                            document={requirement}
                            noticeDays={noticeDays}
                            readOnly={readOnly}
                            onSaved={onUploaded}
                            className="mt-1"
                        />
                        <AiVerdictContest
                            requirement={requirement}
                            documentLabel={label}
                            readOnly={readOnly}
                            className="mt-1"
                        />
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                        {/* The way to fix a requirement never needs a click to be
                            found: it is the first action of the line. */}
                        {!open && canAct && !readOnly ? (
                            <Button
                                variant="outline"
                                size="sm"
                                icon={requirement.action === 'renew' ? 'autorenew' : 'upload_file'}
                                label={nameFor(actionLabel)}
                                onClick={() => setOpen(true)}
                            >
                                <span className="sr-only sm:not-sr-only">{actionLabel}</span>
                            </Button>
                        ) : null}
                        {/*
                            READING THE FILE HAPPENS HERE.

                            The row offered the download alone, so checking that
                            the certificate one deposited is the right one meant
                            saving it and opening it from the file manager — or
                            scrolling to the folder listing below, which is the
                            duplicate this step no longer has. `downloadUrl` is
                            null on a slot still empty, so both actions appear
                            exactly when there is something to look at.
                        */}
                        {requirement.downloadUrl ? (
                            <IconButton
                                icon="visibility"
                                label={nameFor(labels.consult)}
                                variant="ghost"
                                onClick={() => setViewing(true)}
                            />
                        ) : null}
                        {requirement.downloadUrl ? (
                            <IconButton
                                icon="download"
                                label={nameFor(labels.download)}
                                variant="ghost"
                                onClick={() => download(`documents/${requirement.id}/content`)}
                            />
                        ) : null}
                        <IconButton
                            icon={open ? 'expand_less' : 'expand_more'}
                            label={nameFor(open ? labels.hide : labels.details)}
                            variant="ghost"
                            aria-expanded={open}
                            onClick={() => setOpen((value) => !value)}
                        />
                    </div>
                </div>

                <ExpiryBar
                    daysToExpiry={requirement.daysToExpiry}
                    noticeDays={noticeDays}
                    className="mt-2"
                />

                <AnimatePresence initial={false}>
                    {open ? (
                        <motion.div
                            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="overflow-hidden"
                        >
                            <div className="mt-3 border-t border-[var(--becpg-grey)] pt-3">
                                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                                    {requirement.category ? (
                                        <>
                                            <dt className="text-[var(--becpg-dark-grey)]">{labels.category}</dt>
                                            <dd className="break-words">{requirement.category}</dd>
                                        </>
                                    ) : null}
                                    {requirement.isProvided && requirement.name ? (
                                        <>
                                            <dt className="text-[var(--becpg-dark-grey)]">{labels.file}</dt>
                                            <dd className="break-words">{requirement.name}</dd>
                                        </>
                                    ) : null}
                                </dl>

                                {requirement.aiValidationHints ? (
                                    <div className="mt-3">
                                        <p className="mb-1 text-xs font-medium text-[var(--becpg-blue)]">
                                            {labels.aiHints}
                                        </p>
                                        <AiValidationBadge
                                            state={requirement.aiValidationState}
                                            hints={requirement.aiValidationHints}
                                            date={requirement.aiValidationDate}
                                            withHints
                                        />
                                    </div>
                                ) : null}


                                <div className="mt-3">
                                    <DocumentUpload
                                        variant="inline"
                                        action={target.action}
                                        label={actionLabel}
                                        documentRef={target.documentRef}
                                        entityRef={target.entityRef || undefined}
                                        dropRef={rowRef}
                                        disabled={readOnly}
                                        disabledReason={labels.readOnly}
                                        validity={target.validity}
                                        onUploaded={onUploaded}
                                        onCancel={() => setOpen(false)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            <DocumentViewer
                document={viewing ? requirement : null}
                onClose={() => setViewing(false)}
            />
        </motion.li>
    );
}

/* -------------------------------------------------------------------------- */
/* One entity group                                                            */
/* -------------------------------------------------------------------------- */

/**
 * @param {Object} props
 * @param {Object} props.group `{ entity, items, summary }`
 * @param {Function} [props.onUploaded]
 * @param {boolean} [props.defaultOpen=true]
 */
function RequirementGroup({
    group,
    onUploaded,
    noticeDays,
    compact,
    readOnly = false,
    defaultOpen = true,
    index = 0,
}) {
    const { lang } = useMessages();
    const labels = labelsFor(lang);
    const [open, setOpen] = useState(defaultOpen);

    const items = useMemo(() => sortRequirements(group.items || []), [group.items]);
    const summary = group.summary || {};
    const openCount = items.filter((item) => !item.satisfied).length;
    const blockingCount = items.filter((item) => item.blocking).length;
    const entityName = group.entity ? group.entity.label || group.entity.name : labels.noEntity;

    return (
        <Card padding="md" index={index}>
            {/* The header is written here rather than passed to `Card.title`:
                an entity name is long and must wrap, and `Card` truncates its
                title on one line by design. */}
            <div className="mb-3 flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--becpg-blue-lighter)] text-[var(--becpg-blue)]">
                    <Icon name="inventory_2" size={18} />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="break-words text-sm font-medium sm:text-base">{entityName}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {/* The code when there is one, the *translated* type otherwise.
                            The fallback used to print `group.entity.type` as it came,
                            so a product with no `bcpg:code` showed the raw qname
                            `bcpg:rawMaterial` to the supplier. `entityTypeLabel`
                            prefers a server-side `typeLabel`, then its own map, and
                            only ever degrades to the local name — never the prefix. */}
                        {group.entity && (group.entity.code || group.entity.type) ? (
                            <span className="text-xs text-[var(--becpg-dark-grey)]">
                                {group.entity.code || entityTypeLabel(group.entity, lang)}
                            </span>
                        ) : null}
                        {blockingCount > 0 ? (
                            <span className="pill pill-danger pill-no-dot pill-sm">
                                <Icon name="priority_high" size={12} />
                                <span>{fill(labels.blockingCount, { count: blockingCount })}</span>
                            </span>
                        ) : openCount > 0 ? (
                            <span className="pill pill-warn pill-no-dot pill-sm">
                                {fill(labels.openCount, { count: openCount })}
                            </span>
                        ) : (
                            <span className="pill pill-ok pill-no-dot pill-sm">
                                <Icon name="check" size={12} />
                                <span>{labels.satisfied}</span>
                            </span>
                        )}
                    </div>
                </div>
                <IconButton
                    icon={open ? 'expand_less' : 'expand_more'}
                    label={fill(labels.actionOn, { action: open ? labels.hide : labels.details, document: entityName })}
                    aria-expanded={open}
                    onClick={() => setOpen((value) => !value)}
                />
            </div>

            {summary.mandatory ? (
                <GaugeBar
                    value={summary.completeness}
                    label={fill(labels.of, {
                        done: summary.mandatorySatisfied,
                        total: summary.mandatory,
                    })}
                    size="sm"
                    className="mb-3"
                    delay={0.1}
                />
            ) : null}

            {open ? (
                <ul className="m-0 flex list-none flex-col p-0">
                    {items.map((requirement, position) => (
                        <RequirementRow
                            key={requirement.nodeRef || requirement.id || position}
                            requirement={requirement}
                            onUploaded={onUploaded}
                            noticeDays={noticeDays}
                            compact={compact}
                            readOnly={readOnly}
                            index={position}
                        />
                    ))}
                </ul>
            ) : null}
        </Card>
    );
}

/** Every row of every group, most urgent first, without the group headers. */
function HeadlessRows({ groups, onUploaded, noticeDays, compact, readOnly }) {
    const items = useMemo(() => sortRequirements(groups.flatMap((group) => group.items || [])), [groups]);
    return (
        <ul className="m-0 flex list-none flex-col p-0">
            {items.map((requirement, position) => (
                <RequirementRow
                    key={requirement.nodeRef || requirement.id || position}
                    requirement={requirement}
                    onUploaded={onUploaded}
                    noticeDays={noticeDays}
                    compact={compact}
                    readOnly={readOnly}
                    index={position}
                />
            ))}
        </ul>
    );
}

/* -------------------------------------------------------------------------- */
/* The check-list                                                              */
/* -------------------------------------------------------------------------- */

/**
 * @param {Object} props
 * @param {Array<Object>} [props.groups] `groups` from `/documents/requirements`
 * @param {Array<Object>} [props.requirements] flat rows; used when `groups` is absent
 * @param {Object} [props.summary] the payload's `summary`, for the "all done" state
 * @param {boolean} [props.loading]
 * @param {Error} [props.error]
 * @param {Function} [props.onRetry]
 * @param {Function} [props.onUploaded] called after every successful deposit
 * @param {number} [props.noticeDays=60] renewal notice, sizes the countdown bar and
 *        the orange step of the validity line
 * @param {boolean} [props.compact] denser rows, for the wizard side panel
 * @param {boolean} [props.readOnly] entry is closed: the rows show, nothing is writable
 * @param {boolean} [props.groupByEntity=true] `false` renders one flat list
 * @param {React.ReactNode} [props.emptyState] overrides the default empty surface
 * @param {boolean} [props.headless=false] one card of rows, with no group header: for a
 *        screen that already names the one entity the rows belong to
 * @param {React.ReactNode} [props.children] rendered under the rows, in the same card,
 *        when `headless`
 */
export function RequirementChecklist({
    groups,
    requirements,
    summary,
    loading = false,
    error = null,
    onRetry,
    onUploaded,
    noticeDays = 60,
    compact = false,
    readOnly = false,
    groupByEntity = true,
    emptyState,
    headless = false,
    children,
    className = '',
}) {
    const { lang } = useMessages();
    const labels = labelsFor(lang);

    const resolvedGroups = useMemo(() => {
        if (groups && groups.length > 0) {
            return groups;
        }
        if (!requirements || requirements.length === 0) {
            return [];
        }
        if (!groupByEntity) {
            return [{ entity: null, items: requirements, summary }];
        }
        const map = new Map();
        requirements.forEach((requirement) => {
            const key = requirement.entity ? requirement.entity.nodeRef : 'unassigned';
            if (!map.has(key)) {
                map.set(key, { entity: requirement.entity || null, items: [] });
            }
            map.get(key).items.push(requirement);
        });
        return [...map.values()];
    }, [groups, requirements, groupByEntity, summary]);

    // Groups that still need something come first — the screen opens on the work.
    const ordered = useMemo(
        () =>
            [...resolvedGroups].sort((a, b) => {
                const blockingA = (a.items || []).filter((item) => item.blocking).length;
                const blockingB = (b.items || []).filter((item) => item.blocking).length;
                if (blockingA !== blockingB) {
                    return blockingB - blockingA;
                }
                const openA = (a.items || []).filter((item) => !item.satisfied).length;
                const openB = (b.items || []).filter((item) => !item.satisfied).length;
                return openB - openA;
            }),
        [resolvedGroups],
    );

    if (error) {
        return <ErrorState error={error} onRetry={onRetry} />;
    }
    if (loading) {
        return <SkeletonList rows={4} className={className} />;
    }
    if (ordered.length === 0) {
        return (
            emptyState || (
                <EmptyState
                    variant={summary && summary.total > 0 ? 'success' : 'empty'}
                    icon={summary && summary.total > 0 ? 'verified' : 'folder_open'}
                    title={summary && summary.total > 0 ? labels.allDone : labels.nothing}
                    message={summary && summary.total > 0 ? labels.allDoneHint : labels.nothingHint}
                    compact={compact}
                />
            )
        );
    }

    if (headless) {
        return (
            <Card padding="md" className={className}>
                <HeadlessRows
                    groups={ordered}
                    onUploaded={onUploaded}
                    noticeDays={noticeDays}
                    compact={compact}
                    readOnly={readOnly}
                />
                {children}
            </Card>
        );
    }

    return (
        <div className={`flex flex-col gap-3 sm:gap-4 ${className}`}>
            {ordered.map((group, index) => (
                <RequirementGroup
                    key={(group.entity && group.entity.nodeRef) || `group-${index}`}
                    group={group}
                    index={index}
                    onUploaded={onUploaded}
                    noticeDays={noticeDays}
                    compact={compact}
                    readOnly={readOnly}
                    defaultOpen={ordered.length <= 4 || index === 0}
                />
            ))}
        </div>
    );
}

/**
 * The three figures that summarise a check-list, for a caller that renders its
 * own header (the wizard step, the dashboard card).
 *
 * @param {Object} summary the `summary` of `/documents/requirements`
 * @returns {{open: number, blocking: number, completeness: number}}
 */
export function checklistCounters(summary) {
    if (!summary) {
        return { open: 0, blocking: 0, completeness: 100 };
    }
    return {
        open: summary.open || 0,
        blocking: summary.blocking || 0,
        completeness: summary.completeness === undefined ? 100 : summary.completeness,
    };
}
