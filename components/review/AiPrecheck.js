'use client';

/**
 * The AI's pre-validation of a sheet under review: a verdict, the checks it ran
 * section by section — worst first — and a feedback message it proposes for the
 * supplier, which the reviewer can reword, translate and take as the message
 * that sends the sheet back.
 *
 * The AI never decides: a check is a pointer to look at, added to the feedback
 * only by the reviewer. When becpg-ai is not deployed the card renders nothing.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button, Icon } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/Field';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useToast } from '@/components/providers/ToastProvider';
import { api } from '@/lib/client';
import { suggestionScopeForStep } from '@/lib/suggestionScope';
import { LANG_NAMES, SUPPORTED_LANGS } from '@/config/messages';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/review/AiPrecheck#LABELS', {
    fr: {
        title: 'Prévalidation IA',
        running: 'Analyse de la fiche en cours…',
        verdicts: { blocking: 'À corriger avant validation', toCheck: 'Points à vérifier', clear: 'Aucun point bloquant' },
        severities: { error: 'Erreur', warning: 'À vérifier', ok: 'Conforme' },
        addToFeedback: 'Ajouter au retour',
        added: 'Ajouté',
        open: 'Voir la section',
        proposed: 'Retour proposé au fournisseur',
        reformulate: 'Reformuler',
        translate: 'Traduire',
        useMessage: 'Utiliser ce message',
        help: 'L’IA relit la fiche avant vous : cohérence des valeurs, bilan matière, allergènes, documents obligatoires. Elle ne décide rien : chaque point est à vérifier, et c’est vous qui l’ajoutez au retour.',
        failed: 'La prévalidation n’a pas abouti.',
        retry: 'Relancer',
    },
    en: {
        title: 'AI pre-validation',
        running: 'Reading the sheet…',
        verdicts: { blocking: 'To fix before validation', toCheck: 'Points to check', clear: 'No blocking point' },
        severities: { error: 'Error', warning: 'To check', ok: 'Compliant' },
        addToFeedback: 'Add to the feedback',
        added: 'Added',
        open: 'Open the section',
        proposed: 'Feedback proposed to the supplier',
        reformulate: 'Reword',
        translate: 'Translate',
        useMessage: 'Use this message',
        help: 'The AI reads the sheet before you do: value coherence, mass balance, allergens, mandatory documents. It decides nothing: each point is something to check, and you are the one who adds it to the feedback.',
        failed: 'The pre-validation did not complete.',
        retry: 'Retry',
    },
});

/** Severity as an icon AND a label for a screen reader: never colour alone. */
const SEVERITY_ICONS = {
    error: { icon: 'error', className: 'text-[var(--status-danger)]' },
    warning: { icon: 'warning', className: 'text-[var(--status-warn)]' },
    ok: { icon: 'check_circle', className: 'text-[var(--status-ok)]' },
};

const VERDICT_TONES = { blocking: 'text-[var(--status-danger)]', toCheck: 'text-[var(--status-warn)]', clear: 'text-[var(--status-ok)]' };

/** Sections compared on their list name: `bcpg:nutList`, `nutList@1` and `nutList` are one. */
function listKey(value) {
    return String(value || '').split('@')[0].split(':').pop();
}

/**
 * The section a check belongs to, or null.
 *
 * @param {Object} check
 * @param {Object[]} sections the review sections, `{ id, step }`
 * @returns {Object|null}
 */
export function sectionOfCheck(check, sections) {
    if (!check.listId) {
        return null;
    }
    return sections.find((section) => section.step && listKey(suggestionScopeForStep(section.step)) === listKey(check.listId)) || null;
}

/**
 * Checks worth a look per section id — what the rail counts.
 *
 * @param {Object|null} precheck
 * @param {Object[]} sections
 * @returns {Object.<string, number>}
 */
export function checksBySection(precheck, sections) {
    const counts = {};
    for (const check of precheck?.checks || []) {
        const section = check.severity === 'ok' ? null : sectionOfCheck(check, sections);
        if (section) {
            counts[section.id] = (counts[section.id] || 0) + 1;
        }
    }
    return counts;
}

/**
 * Runs the pre-validation once and polls while the service is still working.
 *
 * @returns {{data: Object|null, loading: boolean, error: Error|null, run: Function}}
 */
export function usePrecheck({ entityNodeRef, taskId }) {
    const [state, setState] = useState({ data: null, loading: Boolean(entityNodeRef), error: null });
    // Each value is one read: a retry and each poll of a running analysis bump it.
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!entityNodeRef) {
            return undefined;
        }
        let cancelled = false;
        let timer = null;
        api.post('ai/review-precheck', { entity: entityNodeRef, taskId })
            .then((data) => {
                if (cancelled) {
                    return;
                }
                setState({ data, loading: false, error: null });
                if (data?.available && data.status === 'running') {
                    timer = setTimeout(() => setAttempt((value) => value + 1), (data.retryAfter || 5) * 1000);
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setState({ data: null, loading: false, error });
                }
            });
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [entityNodeRef, taskId, attempt]);

    const run = useCallback(() => {
        setState((value) => ({ ...value, loading: true, error: null }));
        setAttempt((value) => value + 1);
    }, []);

    return { ...state, run };
}

function CheckItem({ check, section, labels, onOpen, onAdd }) {
    const [added, setAdded] = useState(false);
    const severity = SEVERITY_ICONS[check.severity];
    const where = [section?.label, check.row?.label].filter(Boolean).join(' › ');
    return (
        <li className="flex gap-2.5 border-b border-[var(--becpg-line)] py-2.5 last:border-0">
            <Icon name={severity.icon} size={18} className={`mt-0.5 shrink-0 ${severity.className}`} />
            <span className="sr-only-text">{labels.severities[check.severity]}</span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--becpg-ink)]">{check.title}</p>
                <p className="text-xs text-[var(--becpg-muted)]">{[where, check.detail].filter(Boolean).join(' · ')}</p>
                {check.severity !== 'ok' ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {section ? <Button size="sm" variant="ghost" icon="arrow_forward" onClick={() => onOpen(section.id)}>{labels.open}</Button> : null}
                        {onAdd ? (
                            <Button
                                size="sm"
                                variant="outline"
                                icon={added ? 'check' : 'add_comment'}
                                disabled={added}
                                onClick={() => { onAdd(check, section); setAdded(true); }}
                            >
                                {added ? labels.added : labels.addToFeedback}
                            </Button>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </li>
    );
}

function ProposedFeedback({ feedback, entityNodeRef, labels, onUse }) {
    const { lang } = useMessages();
    const toast = useToast();
    const [message, setMessage] = useState(feedback.message || '');
    const [target, setTarget] = useState(feedback.locale || lang);
    const [busy, setBusy] = useState(null);

    const rewrite = async (mode) => {
        setBusy(mode);
        try {
            const result = await api.post('ai/rewrite', { message, mode, targetLocale: mode === 'translate' ? target : undefined, entity: entityNodeRef });
            if (result?.available && result.message) {
                setMessage(result.message);
            }
        }
        catch (error) {
            toast.error(error);
        }
        finally {
            setBusy(null);
        }
    };

    if (!feedback.message) {
        return null;
    }
    return (
        <div className="mt-3 border-t border-[var(--becpg-line)] pt-3">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--becpg-muted)]">{labels.proposed}</p>
            <Textarea rows={6} value={message} onChange={(event) => setMessage(event.target.value)} aria-label={labels.proposed} />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Button size="sm" variant="outline" icon="auto_fix_high" loading={busy === 'reformulate'} onClick={() => rewrite('reformulate')}>{labels.reformulate}</Button>
                <Select
                    aria-label={labels.translate}
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                    options={SUPPORTED_LANGS.map((code) => ({ value: code, label: LANG_NAMES[code] }))}
                />
                <Button size="sm" variant="outline" icon="translate" loading={busy === 'translate'} onClick={() => rewrite('translate')}>{labels.translate}</Button>
                <Button size="sm" icon="reply" className="ms-auto" disabled={!message.trim()} onClick={() => onUse(message)}>{labels.useMessage}</Button>
            </div>
        </div>
    );
}

/**
 * @param {Object} props
 * @param {Object} props.precheck {@link usePrecheck}
 * @param {Object[]} props.sections review sections `{ id, label, step }`
 * @param {string} props.entityNodeRef
 * @param {Function} props.onOpen `(sectionId) => void`
 * @param {Function|null} props.onAdd `(check, section) => void`, null once the task is closed
 * @param {Function|null} props.onUseMessage `(message) => void`
 */
export function AiPrecheck({ precheck, sections, entityNodeRef, onOpen, onAdd, onUseMessage }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const data = precheck.data;

    if (precheck.error) {
        return (
            <div className="rounded-2xl border border-[var(--becpg-line)] bg-white p-4 text-sm shadow-[var(--becpg-shadow-raised)]">
                <p className="text-[var(--becpg-muted)]">{labels.failed}</p>
                <Button size="sm" variant="outline" icon="refresh" className="mt-2" onClick={precheck.run}>{labels.retry}</Button>
            </div>
        );
    }
    if (precheck.loading && !data) {
        return <SkeletonCard lines={4} />;
    }
    if (!data?.available) {
        return null;
    }

    return (
        <section aria-label={labels.title} className="rounded-2xl border border-[var(--becpg-line)] bg-white shadow-[var(--becpg-shadow-raised)]">
            <header className="flex items-center gap-2 border-b border-[var(--becpg-line)] px-4 py-3">
                <Icon name="auto_awesome" size={18} className="text-[var(--becpg-blue)]" />
                <h2 className="flex-1 text-base font-medium text-[var(--becpg-ink)]">{labels.title}</h2>
                <span title={labels.help} className="inline-flex"><Icon name="help_outline" size={18} className="text-[var(--becpg-muted)]" /></span>
            </header>
            <div className="px-4 py-3">
                {data.status === 'running' ? (
                    <p className="flex items-center gap-2 text-sm text-[var(--becpg-muted)]"><Icon name="hourglass_top" size={16} />{labels.running}</p>
                ) : null}
                {data.verdict.state ? (
                    <p className={`text-sm font-semibold ${VERDICT_TONES[data.verdict.state]}`}>{labels.verdicts[data.verdict.state]}</p>
                ) : null}
                {data.verdict.summary ? <p className="mt-0.5 text-sm text-[var(--becpg-ink)]">{data.verdict.summary}</p> : null}
                <ul className="mt-2">
                    {data.checks.map((check) => (
                        <CheckItem
                            key={check.id}
                            check={check}
                            section={sectionOfCheck(check, sections)}
                            labels={labels}
                            onOpen={onOpen}
                            onAdd={onAdd}
                        />
                    ))}
                </ul>
                {onUseMessage ? <ProposedFeedback feedback={data.feedback} entityNodeRef={entityNodeRef} labels={labels} onUse={onUseMessage} /> : null}
            </div>
        </section>
    );
}
