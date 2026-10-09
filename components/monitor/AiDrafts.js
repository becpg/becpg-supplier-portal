'use client';

/**
 * One message per supplier, drafted by the AI in each supplier's language from
 * what is actually late or missing at that supplier, for a reminder, an
 * escalation or a project start sent to several suppliers at once.
 *
 * The drafts are only proposals: each one is edited in place, and nothing is
 * sent before the reader presses the dialog's own button. When becpg-ai is not
 * deployed the button says so once and disappears.
 */

import { useState } from 'react';
import { Button, Icon } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/providers/ToastProvider';
import { api } from '@/lib/client';
import { LANG_NAMES } from '@/config/messages';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/monitor/AiDrafts#LABELS', {
    fr: {
        draft: 'Personnaliser par fournisseur avec l’IA',
        drafting: 'Rédaction des messages…',
        unavailable: 'L’assistant IA n’est pas disponible sur cette instance.',
        common: 'Revenir à un message commun',
        none: 'L’IA n’a proposé aucun message.',
        help: 'Un message par fournisseur, dans sa langue, à partir de ce qui est en retard ou manquant chez lui. Relisez et modifiez avant d’envoyer.',
    },
    en: {
        draft: 'Personalise per supplier with the AI',
        drafting: 'Drafting the messages…',
        unavailable: 'The AI assistant is not available on this instance.',
        common: 'Back to one common message',
        none: 'The AI proposed no message.',
        help: 'One message per supplier, in their language, from what is late or missing at that supplier. Read and edit before sending.',
    },
});

/**
 * @param {Object} props
 * @param {'remind'|'escalate'|'startProject'} props.intent
 * @param {Array<{nodeRef: string, name: string, lang?: string}>} props.targets
 * @param {Object.<string, {message: string, locale: string|null, facts: string[]}>|null} props.drafts
 * @param {Function} props.onDrafts `(drafts|null) => void`
 */
export function AiDrafts({ intent, targets, drafts, onDrafts }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const toast = useToast();
    const [busy, setBusy] = useState(false);
    const [unavailable, setUnavailable] = useState(false);

    const draft = async () => {
        setBusy(true);
        try {
            const result = await api.post('ai/drafts', {
                intent,
                targets: targets.map((target) => ({ nodeRef: target.nodeRef, locale: target.lang || undefined, items: [] })),
            });
            if (!result?.available) {
                setUnavailable(true);
                toast.info(labels.unavailable);
                return;
            }
            if (result.drafts.length === 0) {
                toast.info(labels.none);
                return;
            }
            onDrafts(Object.fromEntries(result.drafts.map((entry) => [entry.target, entry])));
        }
        catch (error) {
            toast.error(error);
        }
        finally {
            setBusy(false);
        }
    };

    if (!drafts) {
        return unavailable ? null : (
            <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" icon="auto_awesome" loading={busy} onClick={draft}>
                    {busy ? labels.drafting : labels.draft}
                </Button>
                <span title={labels.help} className="inline-flex"><Icon name="help_outline" size={16} className="text-[var(--becpg-muted)]" /></span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <ul className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto">
                {targets.filter((target) => drafts[target.nodeRef]).map((target) => {
                    const entry = drafts[target.nodeRef];
                    return (
                        <li key={target.nodeRef} className="rounded-lg border border-[var(--becpg-line)] p-3">
                            <p className="mb-1 flex flex-wrap items-center gap-2 text-sm font-medium">
                                <Icon name="auto_awesome" size={14} className="text-[var(--becpg-blue)]" />
                                {target.name}
                                {entry.locale ? <span className="pill pill-sm pill-no-dot pill-neutral">{LANG_NAMES[entry.locale] || entry.locale}</span> : null}
                            </p>
                            {entry.facts.length > 0 ? (
                                <p className="mb-1.5 text-xs text-[var(--becpg-muted)]">{entry.facts.join(' · ')}</p>
                            ) : null}
                            <Textarea
                                rows={5}
                                aria-label={target.name}
                                value={entry.message}
                                onChange={(event) => onDrafts({ ...drafts, [target.nodeRef]: { ...entry, message: event.target.value } })}
                            />
                        </li>
                    );
                })}
            </ul>
            <Button size="sm" variant="ghost" icon="undo" className="self-start" onClick={() => onDrafts(null)}>{labels.common}</Button>
        </div>
    );
}
