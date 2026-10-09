'use client';

/**
 * Top 10 suppliers at risk (spec §4.6.1) — the block under the
 * header cards, *"avec le motif et l'action directe : relancer, escalader,
 * suspendre"*.
 *
 * Two rules shape it:
 *
 *  1. **The reason is always visible.** A ranking without its motive is a
 *     ranking nobody trusts; each row lists the reasons the API scored
 *     (`risk.reasons`, weighted by `config.riskWeights`) with their counts, and
 *     the risk level is a pill with an icon and a word — never a colour alone.
 *  2. **The action is one click away** — and only the actions that reason
 *     actually justifies (`risk.actions`, from the API's `REASON_ACTIONS`
 *     table), intersected with the actions this instance really offers
 *     (`GET /api/v1/monitor/actions`). A `suspend` button that would 403 on
 *     click is not rendered at all.
 *
 * ## The action machinery lives here on purpose
 *
 * `MonitorActionDialog`, `useMonitorActionCatalog` and the reason vocabulary are
 * exported from this file and reused by `SupplierTable` (bulk actions on the
 * selection) and by the supplier sheet. One implementation, so a reminder sent
 * from the top-10 and a reminder sent from the list are the same write, with the
 * same confirmation, hitting the same endpoint.
 *
 * ## Irreversibility
 *
 * `remind` posts on the supplier's Alfresco forum — the thread `/messages` reads
 * and Share renders. `escalate` posts on the forum of the supplier's open
 * project, never on that thread, since the supplier reads it. Both are
 * reversible enough to need only a message box (the API refuses an empty one).
 *
 * `suspend` is declared unavailable by `GET /api/v1/monitor/actions`, so its
 * button is not rendered. The confirmation below is kept for the day it becomes
 * available: starting a business process cannot be undone, so it must never be
 * a one-click write.
 */

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Button, Icon } from '@/components/ui/Button';
import { ButtonGroup } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/format';
import { Field, Select, Textarea } from '@/components/ui/Field';
import { StatusPill } from '@/components/ui/StatusPill';
import { useToast } from '@/components/providers/ToastProvider';
import { api, useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

/**
 * Reason vocabulary. The codes come from the API (`config.riskWeights` and the
 * approval adapter's `details` keys); only the wording lives here, like every
 * other screen dictionary in the portal (AGENTS.md rule 4).
 * @readonly
 */
export const RISK_REASONS = Object.freeze({
    documentExpired: defineLabels('components/monitor/RiskList#RISK_REASONS.documentExpired', {
        icon: 'error_outline',
        tone: 'danger',
        fr: '{count} document(s) expiré(s)',
        en: '{count} expired document(s)',
    }),
    documentExpiring: defineLabels('components/monitor/RiskList#RISK_REASONS.documentExpiring', {
        icon: 'schedule',
        tone: 'warn',
        fr: '{count} document(s) expirant(s)',
        en: '{count} expiring document(s)',
    }),
    documentMissing: defineLabels('components/monitor/RiskList#RISK_REASONS.documentMissing', {
        icon: 'help_outline',
        tone: 'warn',
        fr: '{count} document(s) manquant(s)',
        en: '{count} missing document(s)',
    }),
    blockingNc: defineLabels('components/monitor/RiskList#RISK_REASONS.blockingNc', {
        icon: 'report_problem',
        tone: 'danger',
        fr: '{count} NC bloquante(s)',
        en: '{count} blocking NC(s)',
    }),
    openNc: defineLabels('components/monitor/RiskList#RISK_REASONS.openNc', {
        icon: 'report_problem',
        tone: 'warn',
        fr: '{count} NC ouverte(s)',
        en: '{count} open NC(s)',
    }),
    campaignNoAnswer: defineLabels('components/monitor/RiskList#RISK_REASONS.campaignNoAnswer', {
        icon: 'campaign',
        tone: 'danger',
        fr: '{count} projet(s) sans réponse',
        en: '{count} project(s) without answer',
    }),
    lateTask: defineLabels('components/monitor/RiskList#RISK_REASONS.lateTask', {
        icon: 'alarm',
        tone: 'danger',
        fr: '{count} tâche(s) en retard',
        en: '{count} late task(s)',
    }),
    lowCompletion: defineLabels('components/monitor/RiskList#RISK_REASONS.lowCompletion', {
        icon: 'donut_large',
        tone: 'warn',
        fr: 'Complétude faible ({score} %)',
        en: 'Low completeness ({score} %)',
    }),
    scoreDropping: defineLabels('components/monitor/RiskList#RISK_REASONS.scoreDropping', {
        icon: 'trending_down',
        tone: 'warn',
        fr: 'Score en baisse',
        en: 'Score dropping',
    }),
    openProject: defineLabels('components/monitor/RiskList#RISK_REASONS.openProject', {
        icon: 'pending_actions',
        tone: 'info',
        fr: '{count} référencement(s) en cours',
        en: '{count} referencing in progress',
    }),
    blockingCatalog: defineLabels('components/monitor/RiskList#RISK_REASONS.blockingCatalog', {
        icon: 'rule',
        tone: 'warn',
        fr: 'Catalogue bloquant non satisfait',
        en: 'Blocking catalog unsatisfied',
    }),
});

/** Risk level → tone + icon. The word is always rendered next to it. */
export const RISK_LEVELS = Object.freeze({
    critical: defineLabels('components/monitor/RiskList#RISK_LEVELS.critical', { tone: 'danger', icon: 'priority_high', fr: 'Critique', en: 'Critical' }),
    high: defineLabels('components/monitor/RiskList#RISK_LEVELS.high', { tone: 'danger', icon: 'trending_up', fr: 'Élevé', en: 'High' }),
    medium: defineLabels('components/monitor/RiskList#RISK_LEVELS.medium', { tone: 'warn', icon: 'remove', fr: 'Moyen', en: 'Medium' }),
    low: defineLabels('components/monitor/RiskList#RISK_LEVELS.low', { tone: 'neutral', icon: 'south', fr: 'Faible', en: 'Low' }),
});

const LABELS = defineLabels('components/monitor/RiskList#LABELS', {
    fr: {
        title: 'Top 10 des fournisseurs à risque',
        empty: 'Aucun fournisseur à risque dans ce périmètre',
        emptyHint: 'Aucun document expiré, NC bloquante ou projet sans réponse détecté.',
        riskScore: 'Score de risque {score}',
        level: 'Risque {level}',
        buyer: 'Acheteur : {name}',
        lastActivity: 'Dernière activité le {date}',
        completion: 'Complétude {value} %',
        openSheet: 'Ouvrir la fiche',
        actions: {
            remind: 'Relancer',
            escalate: 'Escalader',
            suspend: 'Suspendre',
        },
        dialog: {
            remindTitle: 'Relancer {target}',
            escalateTitle: 'Escalader {target}',
            suspendTitle: 'Suspendre {target}',
            messageLabel: 'Message',
            messageHelp:
                'Publié sur le fil de discussion du fournisseur — le même que celui du portail et de Share. Le fournisseur le reçoit par ses abonnements Alfresco.',
            escalateHelp:
                'Publié en interne sur le projet ouvert du fournisseur, jamais sur le fil qu’il lit, avec le référent nommé dans le message. Sans projet ouvert, rien n’est publié.',
            messageRequired: 'Le message est obligatoire.',
            suspendWarning:
                'Le statut d’agrément est calculé à la volée, jamais stocké : cette action n’écrit pas « suspendu ». Elle démarre le processus de suspension configuré chez le client. Une fois la NC bloquante enregistrée par beCPG, le statut bascule de lui-même.',
            suspendIrreversible:
                'Un processus démarré ne peut pas être annulé depuis le portail. Vérifiez la sélection.',
            process: 'Processus à démarrer',
            noProcess:
                'Aucun processus de suspension n’est autorisé sur cette instance (PORTAL_PROCESS_TEMPLATES).',
            targets: '{count} fournisseur(s) concerné(s) :',
            send: 'Envoyer',
            suspendConfirm: 'Démarrer la suspension',
        },
        result: {
            ok: '{count} action(s) exécutée(s).',
            partial: '{ok} réussie(s), {failed} en échec.',
            failed: 'Aucune action n’a abouti.',
        },
        defaults: {
            remind: 'Bonjour,\n\nVotre dossier fournisseur nécessite une mise à jour : {reasons}.\nMerci de vous connecter au portail pour le compléter.\n\nCordialement,',
            escalate: 'Escalade : le dossier fournisseur reste en anomalie ({reasons}) malgré les relances.\nMerci de prendre le relais.',
            genericReasons: 'documents et échéances en attente',
        },
    },
    en: {
        title: 'Top 10 suppliers at risk',
        empty: 'No supplier at risk in this perimeter',
        emptyHint: 'No expired document, blocking NC or unanswered project detected.',
        riskScore: 'Risk score {score}',
        level: '{level} risk',
        buyer: 'Buyer: {name}',
        lastActivity: 'Last activity on {date}',
        completion: 'Completeness {value} %',
        openSheet: 'Open the sheet',
        actions: {
            remind: 'Remind',
            escalate: 'Escalate',
            suspend: 'Suspend',
        },
        dialog: {
            remindTitle: 'Remind {target}',
            escalateTitle: 'Escalate {target}',
            suspendTitle: 'Suspend {target}',
            messageLabel: 'Message',
            messageHelp:
                'Posted on the supplier discussion thread — the same one the portal and Share show. The supplier receives it through their Alfresco subscriptions.',
            escalateHelp:
                'Posted internally on the supplier\'s open project, never on the thread the supplier reads, naming the referent. Without an open project, nothing is posted.',
            messageRequired: 'A message is required.',
            suspendWarning:
                'The approval status is derived on the fly, never stored: this action does not write "suspended". It starts the customer\'s suspension process. Once beCPG holds the blocking NC, the status flips on its own.',
            suspendIrreversible:
                'A started process cannot be cancelled from the portal. Check the selection.',
            process: 'Process to start',
            noProcess: 'No suspension process is allowed on this instance (PORTAL_PROCESS_TEMPLATES).',
            targets: '{count} supplier(s) targeted:',
            send: 'Send',
            suspendConfirm: 'Start the suspension',
        },
        result: {
            ok: '{count} action(s) executed.',
            partial: '{ok} succeeded, {failed} failed.',
            failed: 'No action succeeded.',
        },
        defaults: {
            remind: 'Hello,\n\nYour supplier file needs an update: {reasons}.\nPlease sign in to the portal to complete it.\n\nKind regards,',
            escalate: 'Escalation: the supplier file is still in anomaly ({reasons}) despite the reminders.\nPlease take over.',
            genericReasons: 'pending documents and deadlines',
        },
    },
});

function interpolate(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        vars[name] === undefined || vars[name] === null ? match : String(vars[name]));
}

/**
 * Human wording of one risk reason.
 *
 * @param {{code: string, count?: number, score?: number}} reason
 * @param {string} lang
 * @returns {{label: string, icon: string, tone: string}|null}
 */
export function describeReason(reason, lang) {
    const entry = RISK_REASONS[reason && reason.code];
    if (!entry) {
        return null;
    }
    return {
        label: interpolate(pickLabels(entry, lang), {
            count: reason.count || 1,
            score: reason.score === undefined || reason.score === null ? '—' : reason.score,
        }),
        icon: entry.icon,
        tone: entry.tone,
    };
}

/**
 * The actions this instance really offers — `GET /api/v1/monitor/actions`.
 *
 * `suspend` disappears when no suspension template is allow-listed, so the UI
 * renders exactly the buttons that will work instead of failing on click.
 *
 * @returns {{byId: Object, processes: string[], loading: boolean}}
 */
export function useMonitorActionCatalog() {
    const { data, loading } = useApi('monitor/actions');
    return useMemo(() => {
        const list = (data && Array.isArray(data.actions) ? data.actions : []);
        const byId = {};
        for (const entry of list) {
            byId[entry.id] = entry;
        }
        return {
            byId,
            processes: (byId.suspend && byId.suspend.processes) || [],
            loading,
        };
    }, [data, loading]);
}

/**
 * The one dialog every monitoring write goes through.
 *
 * @param {Object} props
 * @param {'remind'|'escalate'|'suspend'|null} props.action `null` closes it
 * @param {Array<{nodeRef: string, name: string, risk?: Object}>} props.targets
 * @param {string[]} [props.processes] allow-listed suspension processes
 * @param {Function} props.onClose
 * @param {Function} [props.onDone] called after a run that succeeded at least once
 */
export function MonitorActionDialog({ action, targets = [], processes = [], onClose, onDone }) {
    const { lang, t } = useMessages();
    const local = (pickLabels(LABELS, lang)).dialog;
    const results = (pickLabels(LABELS, lang)).result;
    const defaults = (pickLabels(LABELS, lang)).defaults;
    const toast = useToast();

    const suggested = useMemo(() => {
        if (!action || action === 'suspend') {
            return '';
        }
        const codes = new Set();
        for (const target of targets) {
            for (const reason of ((target.risk && target.risk.reasons) || [])) {
                const described = describeReason(reason, lang);
                if (described) {
                    codes.add(described.label);
                }
            }
        }
        const reasons = codes.size > 0 ? [...codes].slice(0, 4).join(', ') : defaults.genericReasons;
        return interpolate(defaults[action] || '', { reasons });
    }, [action, targets, lang, defaults]);

    const [message, setMessage] = useState('');
    const [process, setProcess] = useState('');
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    // The suggestion depends on the action and the targets, both of which change
    // while the dialog is closed: re-seed on open rather than in an effect.
    const [seed, setSeed] = useState(null);
    if (action && seed !== action + targets.length) {
        setSeed(action + targets.length);
        setMessage(suggested);
        setProcess(processes[0] || '');
        setError(null);
    }

    const needsMessage = action === 'remind' || action === 'escalate';
    const title = action
        ? interpolate(local[`${action}Title`], {
            target: targets.length === 1 ? targets[0].name : `${targets.length}`,
        })
        : '';

    const run = async () => {
        if (needsMessage && !message.trim()) {
            setError(local.messageRequired);
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const payload = await api.post('monitor/actions', {
                action,
                suppliers: targets.map((target) => target.nodeRef),
                message: needsMessage ? message.trim() : undefined,
                process: action === 'suspend' ? process || undefined : undefined,
            });
            const summary = payload.summary || { succeeded: 0, failed: 0 };
            if (summary.failed === 0) {
                toast.success(interpolate(results.ok, { count: summary.succeeded }));
            }
            else if (summary.succeeded > 0) {
                toast.warning(
                    interpolate(results.partial, { ok: summary.succeeded, failed: summary.failed }),
                );
            }
            else {
                toast.error(results.failed);
            }
            if (summary.succeeded > 0 && onDone) {
                onDone(payload);
            }
            onClose();
        }
        catch (failure) {
            toast.error(failure);
            setError(failure.message || null);
        }
        finally {
            setBusy(false);
        }
    };

    const suspendBlocked = action === 'suspend' && processes.length === 0;

    return (
        <Modal
            open={Boolean(action)}
            onClose={busy ? () => {} : onClose}
            title={title}
            size="md"
            footer={
                <ButtonGroup>
                    <Button variant="outline" onClick={onClose} disabled={busy}>
                        {t('action.cancel')}
                    </Button>
                    <Button
                        variant={action === 'suspend' ? 'danger' : 'primary'}
                        icon={action === 'suspend' ? 'block' : 'send'}
                        loading={busy}
                        disabled={suspendBlocked}
                        onClick={run}
                    >
                        {action === 'suspend' ? local.suspendConfirm : local.send}
                    </Button>
                </ButtonGroup>
            }
        >
            <div className="flex flex-col gap-3">
                <div>
                    <p className="text-xs text-[var(--becpg-dark-grey)]">
                        {interpolate(local.targets, { count: targets.length })}
                    </p>
                    <ul className="mt-1 max-h-28 overflow-y-auto text-sm">
                        {targets.map((target) => (
                            <li key={target.nodeRef} className="truncate">
                                · {target.name}
                                {target.code ? (
                                    <span className="text-[var(--becpg-dark-grey)]"> ({target.code})</span>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                </div>

                {action === 'suspend' ? (
                    <>
                        <div className="rounded-lg border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-3">
                            <p className="flex items-start gap-2 text-sm text-[var(--status-danger)]">
                                <Icon name="warning" size={18} className="mt-0.5 shrink-0" />
                                <span>{local.suspendIrreversible}</span>
                            </p>
                        </div>
                        <p className="text-xs leading-relaxed text-[var(--becpg-dark-grey)]">
                            {local.suspendWarning}
                        </p>
                        {suspendBlocked ? (
                            <p className="text-sm text-[var(--status-danger)]">{local.noProcess}</p>
                        ) : processes.length > 1 ? (
                            <Field label={local.process}>
                                <Select
                                    value={process}
                                    onChange={(event) => setProcess(event.target.value)}
                                    options={processes.map((id) => ({ value: id, label: id }))}
                                />
                            </Field>
                        ) : null}
                    </>
                ) : (
                    <Field
                        label={local.messageLabel}
                        required
                        error={error || undefined}
                        description={action === 'escalate' ? local.escalateHelp : local.messageHelp}
                    >
                        <Textarea
                            rows={6}
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            invalid={Boolean(error)}
                        />
                    </Field>
                )}
            </div>
        </Modal>
    );
}

/**
 * The action buttons of one supplier (or of a selection).
 *
 * Only renders an action that (a) the risk reasons justify and (b) the instance
 * offers. `size="sm"` on a row, `md` in a page header.
 *
 * @param {Object} props
 * @param {Array<Object>} props.targets suppliers the action applies to
 * @param {string[]} [props.allowed] restrict to these action ids (row-level `risk.actions`)
 * @param {'sm'|'md'} [props.size='sm']
 * @param {Function} [props.onDone]
 */
export function MonitorActionButtons({ targets, allowed, size = 'sm', onDone, className = '' }) {
    const { lang } = useMessages();
    const local = (pickLabels(LABELS, lang)).actions;
    const catalog = useMonitorActionCatalog();
    const [action, setAction] = useState(null);

    const ids = ['remind', 'escalate', 'suspend'].filter((id) => {
        if (allowed && !allowed.includes(id)) {
            return false;
        }
        const entry = catalog.byId[id];
        // While the catalog loads, remind/escalate are always available (they
        // need no configuration); suspend waits for its allow-list.
        return entry ? entry.available !== false : id !== 'suspend';
    });

    if (targets.length === 0 || ids.length === 0) {
        return null;
    }

    return (
        <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
            {ids.map((id) => (
                <Button
                    key={id}
                    size={size}
                    variant={id === 'suspend' ? 'danger' : id === 'escalate' ? 'outline' : 'secondary'}
                    icon={id === 'remind' ? 'send' : id === 'escalate' ? 'arrow_upward' : 'block'}
                    onClick={() => setAction(id)}
                >
                    {local[id]}
                </Button>
            ))}
            <MonitorActionDialog
                action={action}
                targets={targets}
                processes={catalog.processes}
                onClose={() => setAction(null)}
                onDone={onDone}
            />
        </div>
    );
}

/**
 * One row of the top-10.
 */
function RiskRow({ item, rank, local, lang, onDone }) {
    const reduceMotion = useReducedMotion();
    const level = RISK_LEVELS[item.risk && item.risk.level] || RISK_LEVELS.low;
    const reasons = ((item.risk && item.risk.reasons) || [])
        .map((reason) => describeReason(reason, lang))
        .filter(Boolean);
    const lowCompletion = ((item.risk && item.risk.reasons) || []).some((reason) => reason.code === 'lowCompletion');
    const details = [
        ...reasons.map((reason) => reason.label),
        item.buyer ? interpolate(local.buyer, { name: item.buyer }) : null,
        // Said once: a low completion is already one of the reasons when it is one.
        typeof item.completion === 'number' && !lowCompletion
            ? interpolate(local.completion, { value: item.completion })
            : null,
        item.lastActivity ? interpolate(local.lastActivity, { date: formatDate(item.lastActivity, lang) }) : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <motion.li
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(rank, 8) * 0.03 }}
            className="border-b border-[var(--becpg-line)] py-2.5 first:pt-0 last:border-0 last:pb-0"
        >
            {/* One line per supplier on a wide screen: who, how risky, why, and
                what to do — the reasons as a sentence rather than a row of
                pills, the full list in the line's own text when it is cut. */}
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--becpg-grey)] text-[11px] font-medium leading-none tabular-nums text-[var(--becpg-ink)]"
                        aria-hidden="true"
                    >
                        {rank + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <Link
                                href={item.href}
                                className="truncate text-sm font-medium text-[var(--becpg-ink)] hover:underline"
                            >
                                {item.name}
                            </Link>
                            {item.code ? (
                                <span className="text-xs tabular-nums text-[var(--becpg-dark-grey)]">{item.code}</span>
                            ) : null}
                            <StatusPill
                                status={item.approval ? item.approval.status : null}
                                label={item.approval ? item.approval.statusLabel : undefined}
                                size="sm"
                            />
                            <span
                                className={`pill pill-sm pill-no-dot pill-${level.tone}`}
                                title={interpolate(local.riskScore, {
                                    score: (item.risk && item.risk.score) || 0,
                                })}
                            >
                                <Icon name={level.icon} size={13} />
                                <span>
                                    {interpolate(local.level, { level: pickLabels(level, lang) })} ·{' '}
                                    <span className="tabular-nums">{(item.risk && item.risk.score) || 0}</span>
                                </span>
                            </span>
                        </div>
                        {/* the motive — never a rank without its reason — then the
                            buyer, the completion and the last activity */}
                        <p className="mt-0.5 truncate text-xs text-[var(--becpg-dark-grey)]" title={details}>
                            {details}
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5 ps-9 lg:ps-0">
                    <Button variant="outline" size="sm" icon="open_in_new" href={item.href}>
                        {local.openSheet}
                    </Button>
                    <MonitorActionButtons
                        targets={[item]}
                        allowed={(item.risk && item.risk.actions) || []}
                        onDone={onDone}
                    />
                </div>
            </div>
        </motion.li>
    );
}

/**
 * @param {Object} props
 * @param {Array<Object>} props.items `overview.topRisk`
 * @param {Function} [props.onRefresh] called after a successful action
 * @param {React.ReactNode} [props.actions] rendered at the right of the card header
 */
export function RiskList({ items = [], onRefresh, actions, className = '' }) {
    const { lang } = useMessages();
    const local = pickLabels(LABELS, lang);
    const router = useRouter();

    const done = useCallback(() => {
        if (onRefresh) {
            onRefresh();
            return;
        }
        // The API invalidates its own 30 s memo on every write, so a plain
        // server re-render is enough to show the effect.
        router.refresh();
    }, [onRefresh, router]);

    return (
        <Card
            title={local.title}
            icon="crisis_alert"
            actions={actions}
            className={className}
        >
            {items.length === 0 ? (
                /*
                 * An empty top-10 is *good news*, and good news does not deserve
                 * 200px of white with a large icon in the middle of it — that is
                 * the shape of a failure. One calm line, in the success tone,
                 * ~56px tall instead of ~230.
                 */
                <p className="flex items-start gap-2.5 rounded-lg border border-[var(--status-ok-border)] bg-[var(--status-ok-bg)] px-3 py-2.5">
                    <Icon
                        name="task_alt"
                        size={18}
                        className="mt-px shrink-0 text-[var(--status-ok)]"
                    />
                    <span className="min-w-0 text-sm text-[var(--becpg-blue)]">
                        <span className="font-medium">{local.empty}</span>
                        <span className="mt-0.5 block text-xs text-[var(--becpg-dark-grey)]">
                            {local.emptyHint}
                        </span>
                    </span>
                </p>
            ) : (
                <ul className="border-t border-[var(--becpg-grey)] pt-1">
                    {items.map((item, index) => (
                        <RiskRow
                            key={item.nodeRef}
                            item={item}
                            rank={index}
                            local={local}
                            lang={lang}
                            onDone={done}
                        />
                    ))}
                </ul>
            )}
        </Card>
    );
}
