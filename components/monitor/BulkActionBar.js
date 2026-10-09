'use client';

/**
 * The action bar of the monitoring space — *relancer, escalader, suspendre*
 * (spec §4.6.1) on a selection, from any monitoring screen.
 *
 * Three rules shape this component, and they all come from the spec:
 *
 *  1. **The monitoring space writes nothing of its own** (§4.6.7). Every button
 *     here posts to `POST /api/v1/monitor/actions`, which reuses an existing
 *     beCPG mechanism (the Alfresco forum for a reminder, `sendToSupplier` for a
 *     suspension process). The bar therefore renders exactly the actions
 *     `GET /api/v1/monitor/actions` declares available on this instance —
 *     `suspend` simply is not shown when no suspension template is allow-listed,
 *     rather than failing on click.
 *  2. **A bulk write is always confirmed**, in the same dialog as a single one
 *     (`MonitorActionDialog`), which lists the suppliers — nobody relaunches 80
 *     suppliers by mis-clicking.
 *  3. **The result is reported precisely.** The endpoint attempts every target
 *     and answers per target, so the report says *n relancés*, and for each
 *     failure the supplier and the reason. A partial failure is never rounded
 *     into "an error occurred".
 *
 * The bar is a fixed bottom sheet: it sits above the mobile bottom nav on
 * phones, at the bottom of the viewport on desktop, and it disappears with an
 * empty selection.
 */

import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button, ButtonGroup, Icon, Spinner } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { MonitorActionDialog } from '@/components/monitor/RiskList';
import { useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

/**
 * Targets a single `/monitor/actions` call may address — mirrors
 * `DEFAULT_MONITOR_CONFIG.maxActionTargets`. Beyond that the endpoint answers
 * 400, so the bar sends the first slice and *says so* in the dialog and in the
 * report instead of letting the call fail.
 */
export const MAX_BULK_TARGETS = 100;

const LABELS = defineLabels('components/monitor/BulkActionBar#LABELS', {
    fr: {
        selected: '{count} fournisseur sélectionné',
        selectedPlural: '{count} fournisseurs sélectionnés',
        clear: 'Vider la sélection',
        overflow: 'Seuls les {max} premiers seront traités.',
        loading: 'Chargement des actions…',
        unavailable: 'Aucune action disponible pour votre profil.',
        actions: {
            remind: 'Relancer',
            escalate: 'Escalader',
            suspend: 'Suspendre',
        },
        targets: 'Fournisseurs concernés',
        report: 'Résultat de l’action',
        reportOk: '{count} fournisseur(s) traité(s) avec succès.',
        reportKo: '{count} échec(s) :',
        reportSkipped: '{count} fournisseur(s) non traité(s) : au-delà de la limite de {max}.',
        reportNone: 'Aucun fournisseur n’a été traité.',
        close: 'Fermer',
        errors: {
            notFound: 'Fournisseur hors de votre périmètre',
        },
    },
    en: {
        selected: '{count} supplier selected',
        selectedPlural: '{count} suppliers selected',
        clear: 'Clear selection',
        overflow: 'Only the first {max} will be processed.',
        loading: 'Loading actions…',
        unavailable: 'No action is available for your profile.',
        actions: {
            remind: 'Remind',
            escalate: 'Escalate',
            suspend: 'Suspend',
        },
        targets: 'Suppliers concerned',
        report: 'Action result',
        reportOk: '{count} supplier(s) processed successfully.',
        reportKo: '{count} failure(s):',
        reportSkipped: '{count} supplier(s) left out: above the limit of {max}.',
        reportNone: 'No supplier was processed.',
        close: 'Close',
        errors: {
            notFound: 'Supplier outside your perimeter',
        },
    },
});

/** Replaces `{name}` placeholders. */
function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]),
    );
}

/** Material icon of each action. */
const ACTION_ICONS = { remind: 'campaign', escalate: 'trending_up', suspend: 'block' };

/**
 * The action bar itself.
 *
 * @param {Object} props
 * @param {Array<{nodeRef: string, name: string}>} props.targets selected suppliers (deduplicated by the bar)
 * @param {Function} [props.onClear] empties the selection
 * @param {Function} [props.onDone] called with the API payload after a run — refresh the screen
 * @param {string} [props.defaultMessage] pre-filled reminder body (a screen may describe the selection)
 * @param {React.ReactNode} [props.hint] extra line rendered in the bar (e.g. "3 types de documents")
 * @param {string[]} [props.only] restricts the offered actions (defaults to all available ones)
 */
export function BulkActionBar({
    targets = [],
    onClear,
    onDone,
    defaultMessage = '',
    hint,
    only,
}) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const reduceMotion = useReducedMotion();

    const [pending, setPending] = useState(null); // action id being confirmed
    const [report, setReport] = useState(null);

    // The instance's own capabilities: an action that cannot work here is not
    // rendered at all (GET /monitor/actions, spec §4.6.1).
    const catalog = useApi('monitor/actions');

    /** Unique targets, in selection order. */
    const unique = useMemo(() => {
        const seen = new Map();
        for (const target of targets) {
            if (target && target.nodeRef && !seen.has(target.nodeRef)) {
                seen.set(target.nodeRef, { nodeRef: target.nodeRef, name: target.name || target.nodeRef });
            }
        }
        return [...seen.values()];
    }, [targets]);

    const available = useMemo(() => {
        const rows = (catalog.data && catalog.data.actions) || [];
        return rows.filter(
            (action) => action.available !== false && (!only || only.includes(action.id)),
        );
    }, [catalog.data, only]);

    const current = available.find((action) => action.id === pending) || null;
    const overflow = Math.max(0, unique.length - MAX_BULK_TARGETS);
    const sent = unique.slice(0, MAX_BULK_TARGETS);

    // The dialog already says when every target went through; the report only
    // opens to name the ones that did not.
    const onResult = useCallback((payload) => {
        if ((payload?.summary?.failed || 0) > 0 || overflow > 0) {
            setReport({ ...payload, skipped: overflow });
        }
    }, [overflow]);

    const failures = report ? (report.results || []).filter((result) => !result.ok) : [];

    return (
        <>
            <AnimatePresence>
                {unique.length > 0 ? (
                    <motion.div
                        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="fixed inset-x-0 bottom-[calc(var(--portal-bottom-nav-height)+0.5rem)] z-50 px-3 lg:bottom-4"
                        role="region"
                        aria-label={labels.targets}
                    >
                        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-2 rounded-xl border border-[var(--becpg-blue-lighter)] bg-white p-2 shadow-[0_10px_30px_rgba(0,66,84,0.18)]">
                            <span className="flex min-w-0 flex-1 items-center gap-2 px-1 text-sm">
                                <Icon name="checklist" size={18} className="text-[var(--becpg-blue)]" />
                                <span className="min-w-0">
                                    <span className="block font-medium">
                                        {fill(
                                            unique.length > 1 ? labels.selectedPlural : labels.selected,
                                            { count: unique.length },
                                        )}
                                    </span>
                                    {overflow > 0 ? (
                                        <span className="block text-xs text-[var(--status-warn)]">
                                            {fill(labels.overflow, { max: MAX_BULK_TARGETS })}
                                        </span>
                                    ) : hint ? (
                                        <span className="block truncate text-xs text-[var(--becpg-dark-grey)]">
                                            {hint}
                                        </span>
                                    ) : null}
                                </span>
                            </span>

                            {catalog.loading ? (
                                <span className="flex items-center gap-2 px-2 text-xs text-[var(--becpg-dark-grey)]">
                                    <Spinner size={14} />
                                    {labels.loading}
                                </span>
                            ) : available.length === 0 ? (
                                <span className="px-2 text-xs text-[var(--becpg-dark-grey)]">
                                    {labels.unavailable}
                                </span>
                            ) : (
                                available.map((action) => (
                                    <Button
                                        key={action.id}
                                        size="sm"
                                        variant={action.id === 'suspend' ? 'danger' : action.id === 'remind' ? 'accent' : 'outline'}
                                        icon={ACTION_ICONS[action.id] || 'bolt'}
                                        onClick={() => setPending(action.id)}
                                    >
                                        {labels.actions[action.id] || action.id}
                                    </Button>
                                ))
                            )}

                            <Button
                                size="sm"
                                variant="subtle"
                                icon="close"
                                label={labels.clear}
                                onClick={onClear}
                            />
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            {/* The same dialog as every other monitoring action, so a reminder
                reads and behaves alike from a sheet, a list or a selection. */}
            <MonitorActionDialog
                action={current ? current.id : null}
                targets={sent}
                processes={(current && current.processes) || []}
                defaultMessage={defaultMessage}
                onClose={() => setPending(null)}
                onDone={onDone}
                onResult={onResult}
            />

            {/* -------------------------------------------------------- report */}
            <Modal
                open={Boolean(report)}
                onClose={() => setReport(null)}
                size="md"
                title={labels.report}
                footer={
                    <ButtonGroup>
                        <Button onClick={() => setReport(null)}>{labels.close}</Button>
                    </ButtonGroup>
                }
            >
                {report ? (
                    <div className="flex flex-col gap-3 text-sm">
                        <p className="flex items-center gap-2">
                            <Icon
                                name={report.summary.succeeded > 0 ? 'check_circle' : 'error_outline'}
                                size={18}
                                className={
                                    report.summary.succeeded > 0
                                        ? 'text-[var(--status-ok)]'
                                        : 'text-[var(--status-danger)]'
                                }
                            />
                            {report.summary.succeeded > 0
                                ? fill(labels.reportOk, { count: report.summary.succeeded })
                                : labels.reportNone}
                        </p>
                        {report.skipped > 0 ? (
                            <p className="text-xs text-[var(--status-warn)]">
                                {fill(labels.reportSkipped, {
                                    count: report.skipped,
                                    max: MAX_BULK_TARGETS,
                                })}
                            </p>
                        ) : null}
                        {failures.length > 0 ? (
                            <div>
                                <p className="mb-1 font-medium text-[var(--status-danger)]">
                                    {fill(labels.reportKo, { count: failures.length })}
                                </p>
                                <ul className="flex flex-col gap-1 rounded-lg border border-[var(--becpg-grey)] p-2">
                                    {failures.map((failure) => (
                                        <li key={failure.supplier} className="text-xs">
                                            <span className="font-medium">
                                                {failure.name || failure.supplier}
                                            </span>
                                            {' — '}
                                            <span className="text-[var(--becpg-dark-grey)]">
                                                {labels.errors[failure.error] || failure.message || failure.error}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </Modal>
        </>
    );
}
