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
 *  2. **A bulk write is always confirmed.** The dialog names the mechanism, the
 *     number of suppliers, and lists them — nobody relaunches 80 suppliers by
 *     mis-clicking.
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
import { Textarea, Select } from '@/components/ui/Field';
import { useToast } from '@/components/providers/ToastProvider';
import { api, useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

/**
 * Targets a single `/monitor/actions` call may address — mirrors
 * `DEFAULT_MONITOR_CONFIG.maxActionTargets`. Beyond that the endpoint answers
 * 400, so the bar sends the first slice and *says so* in the dialog and in the
 * report instead of letting the call fail.
 */
export const MAX_BULK_TARGETS = 100;

const LABELS = {
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
        confirm: {
            remind: 'Relancer {count} fournisseur(s)',
            escalate: 'Escalader {count} fournisseur(s)',
            suspend: 'Suspendre {count} fournisseur(s)',
        },
        mechanism: {
            remind:
                'Le message est publié sur le fil de discussion du fournisseur — celui que le portail et Share affichent déjà. Aucun autre canal n’est créé.',
            escalate:
                'Le message est publié en interne sur le projet ouvert du fournisseur, en nommant son chef de projet. Le fournisseur ne le voit pas. Sans projet ouvert, rien n’est publié.',
            suspend:
                'Le statut d’agrément est calculé, jamais stocké : la suspension démarre le process de suspension paramétré côté beCPG. Le statut basculera de lui-même.',
        },
        message: 'Message',
        messageRequired: 'Un message est obligatoire.',
        process: 'Process à démarrer',
        targets: 'Fournisseurs concernés',
        andMore: '… et {count} autre(s)',
        send: 'Envoyer',
        suspendConfirm: 'Suspendre',
        report: 'Résultat de l’action',
        reportOk: '{count} fournisseur(s) traité(s) avec succès.',
        reportKo: '{count} échec(s) :',
        reportSkipped: '{count} fournisseur(s) non traité(s) : au-delà de la limite de {max}.',
        reportNone: 'Aucun fournisseur n’a été traité.',
        close: 'Fermer',
        // Per action, because "relancé" is false for an escalation and for a
        // suspension — the toast must say what actually happened.
        successToast: {
            remind: '{ok} fournisseur(s) relancé(s)',
            escalate: '{ok} escalade(s) envoyée(s)',
            suspend: '{ok} suspension(s) démarrée(s)',
        },
        successToastFallback: '{ok} fournisseur(s) traité(s)',
        partialToast: '{ok} traité(s), {ko} en échec',
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
        confirm: {
            remind: 'Remind {count} supplier(s)',
            escalate: 'Escalate {count} supplier(s)',
            suspend: 'Suspend {count} supplier(s)',
        },
        mechanism: {
            remind:
                'The message is posted on the supplier discussion thread — the one the portal and Share already display. No other channel is created.',
            escalate:
                'The message is posted internally on the supplier’s open project, naming its project manager. The supplier does not see it. Without an open project, nothing is posted.',
            suspend:
                'The approval status is derived, never stored: suspension starts the suspension process configured in beCPG. The status flips on its own.',
        },
        message: 'Message',
        messageRequired: 'A message is required.',
        process: 'Process to start',
        targets: 'Suppliers concerned',
        andMore: '… and {count} more',
        send: 'Send',
        suspendConfirm: 'Suspend',
        report: 'Action result',
        reportOk: '{count} supplier(s) processed successfully.',
        reportKo: '{count} failure(s):',
        reportSkipped: '{count} supplier(s) left out: above the limit of {max}.',
        reportNone: 'No supplier was processed.',
        close: 'Close',
        successToast: {
            remind: '{ok} supplier(s) reminded',
            escalate: '{ok} escalation(s) sent',
            suspend: '{ok} suspension(s) started',
        },
        successToastFallback: '{ok} supplier(s) processed',
        partialToast: '{ok} processed, {ko} failed',
        errors: {
            notFound: 'Supplier outside your perimeter',
        },
    },
};

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
    const labels = LABELS[lang] || LABELS.fr;
    const toast = useToast();
    const reduceMotion = useReducedMotion();

    const [pending, setPending] = useState(null); // action id being confirmed
    const [message, setMessage] = useState('');
    const [process, setProcess] = useState('');
    const [busy, setBusy] = useState(false);
    const [report, setReport] = useState(null);
    const [touched, setTouched] = useState(false);

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

    const openAction = useCallback(
        (action) => {
            setPending(action.id);
            setTouched(false);
            setMessage(action.needsMessage ? defaultMessage : '');
            setProcess(action.processes && action.processes.length > 0 ? action.processes[0] : '');
        },
        [defaultMessage],
    );

    const close = useCallback(() => {
        if (!busy) {
            setPending(null);
        }
    }, [busy]);

    const run = useCallback(async () => {
        if (!current) {
            return;
        }
        if (current.needsMessage && !message.trim()) {
            setTouched(true);
            return;
        }
        setBusy(true);
        try {
            const payload = await api.post('monitor/actions', {
                action: current.id,
                suppliers: sent.map((target) => target.nodeRef),
                message: message.trim() || undefined,
                process: current.id === 'suspend' ? process || undefined : undefined,
            });
            setPending(null);
            setReport({ ...payload, skipped: overflow });
            const { succeeded = 0, failed = 0 } = payload.summary || {};
            if (failed === 0) {
                toast.success(
                    fill(labels.successToast[current.id] || labels.successToastFallback, {
                        ok: succeeded,
                    }),
                );
            }
            else {
                toast.warning(fill(labels.partialToast, { ok: succeeded, ko: failed }));
            }
            if (onDone) {
                onDone(payload);
            }
        }
        catch (error) {
            toast.error(error);
        }
        finally {
            setBusy(false);
        }
    }, [current, message, process, sent, overflow, toast, labels, onDone]);

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
                                        onClick={() => openAction(action)}
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

            {/* ------------------------------------------------- confirmation */}
            <Modal
                open={Boolean(current)}
                onClose={close}
                size="md"
                title={
                    current
                        ? fill(labels.confirm[current.id] || labels.actions[current.id], {
                              count: sent.length,
                          })
                        : ''
                }
                description={current ? labels.mechanism[current.id] : undefined}
                footer={
                    <ButtonGroup>
                        <Button variant="outline" onClick={close} disabled={busy}>
                            {labels.close}
                        </Button>
                        <Button
                            variant={current && current.id === 'suspend' ? 'danger' : 'primary'}
                            loading={busy}
                            onClick={run}
                        >
                            {current && current.id === 'suspend' ? labels.suspendConfirm : labels.send}
                        </Button>
                    </ButtonGroup>
                }
            >
                {current ? (
                    <div className="flex flex-col gap-4">
                        {overflow > 0 ? (
                            <p className="rounded-lg bg-[var(--status-warn-bg)] px-3 py-2 text-xs text-[var(--status-warn)]">
                                {fill(labels.overflow, { max: MAX_BULK_TARGETS })}
                            </p>
                        ) : null}

                        {current.needsMessage ? (
                            <div className="flex flex-col gap-1">
                                <label
                                    htmlFor="bulk-action-message"
                                    className="text-sm font-medium text-[var(--becpg-blue)]"
                                >
                                    {labels.message}
                                </label>
                                <Textarea
                                    id="bulk-action-message"
                                    rows={4}
                                    value={message}
                                    invalid={touched && !message.trim()}
                                    onChange={(event) => setMessage(event.target.value)}
                                />
                                {touched && !message.trim() ? (
                                    <p className="text-xs text-[var(--status-danger)]">
                                        {labels.messageRequired}
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        {current.id === 'suspend' && current.processes && current.processes.length > 0 ? (
                            <div className="flex flex-col gap-1">
                                <label
                                    htmlFor="bulk-action-process"
                                    className="text-sm font-medium text-[var(--becpg-blue)]"
                                >
                                    {labels.process}
                                </label>
                                <Select
                                    id="bulk-action-process"
                                    value={process}
                                    onChange={(event) => setProcess(event.target.value)}
                                    options={current.processes.map((id) => ({ value: id, label: id }))}
                                />
                            </div>
                        ) : null}

                        <div>
                            <p className="mb-1 text-sm font-medium text-[var(--becpg-blue)]">
                                {labels.targets}
                            </p>
                            <ul className="max-h-40 overflow-y-auto rounded-lg border border-[var(--becpg-grey)] p-2 text-sm">
                                {sent.slice(0, 12).map((target) => (
                                    <li key={target.nodeRef} className="truncate py-0.5">
                                        {target.name}
                                    </li>
                                ))}
                                {sent.length > 12 ? (
                                    <li className="py-0.5 text-xs text-[var(--becpg-dark-grey)]">
                                        {fill(labels.andMore, { count: sent.length - 12 })}
                                    </li>
                                ) : null}
                            </ul>
                        </div>
                    </div>
                ) : null}
            </Modal>

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
