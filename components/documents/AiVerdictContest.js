'use client';

/**
 * What a supplier can do about a negative AI verdict on one of their documents.
 *
 * The verdict is advice: becpg-ai checks the document against the criteria the
 * customer configured on its type, and those criteria can be wrong for the
 * document at hand - an ingredient list asked of a Halal certificate. It never
 * blocks finishing; only the requirement state the customer controls does. But
 * a supplier who reads « non conforme » next to a certificate he knows is right
 * needs a way to say so to someone who can act on it.
 *
 * So the contest is a message to the customer, through the sheet's existing
 * discussion (`POST /api/v1/messages`, the Alfresco comments Share reads too),
 * with the verdict quoted so the reader needs nothing else. No new repository
 * state is invented: the « contested » mark is the supplier's own record that
 * the message left, kept in this browser and tied to the verdict it answers - a
 * new analysis clears it.
 */

import { useCallback, useId, useState, useSyncExternalStore } from 'react';
import { Button, Icon } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/providers/ToastProvider';
import { api } from '@/lib/client';
import { plainText } from '@/lib/format';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';
import { AI_REFUSED_STATE } from '@/components/documents/DocumentUpload';

const LABELS = defineLabels('components/documents/AiVerdictContest#LABELS', {
    fr: {
        advisory: 'Avis consultatif de l’IA : il ne bloque pas la finalisation, votre client décide.',
        contest: 'Contester l’analyse',
        contestFor: 'Contester l’analyse de l’IA sur « {document} »',
        reasonLabel: 'Pourquoi l’analyse ne s’applique pas à ce document',
        reasonPlaceholder: 'Ex. : un certificat Halal ne porte ni liste d’ingrédients ni poids net.',
        send: 'Envoyer à mon client',
        cancel: 'Annuler',
        sent: 'Contestation envoyée à votre client',
        contested: 'Contestée — en attente de votre client',
        messageIntro: 'Je conteste l’analyse automatique du document « {document} ».',
        messageVerdict: 'Verdict de l’IA :',
        messageReason: 'Mon explication :',
    },
    en: {
        advisory: 'AI advice only: it does not block finishing, your customer decides.',
        contest: 'Contest the analysis',
        contestFor: 'Contest the AI analysis of "{document}"',
        reasonLabel: 'Why the analysis does not apply to this document',
        reasonPlaceholder: 'E.g. a Halal certificate carries neither an ingredient list nor a net weight.',
        send: 'Send to my customer',
        cancel: 'Cancel',
        sent: 'Contest sent to your customer',
        contested: 'Contested - awaiting your customer',
        messageIntro: 'I contest the automatic analysis of the document "{document}".',
        messageVerdict: 'AI verdict:',
        messageReason: 'My explanation:',
    },
});

/** Browser-storage prefix of the « contested » marks. */
const CONTEST_STORAGE_PREFIX = 'becpg_portal_ai_contest:';

/** Same-tab signal that a mark was written; `storage` only fires in the other tabs. */
const CONTEST_EVENT = 'becpg-portal-ai-contest';

/** Longest quote of the AI report carried in the message; the route caps a message at 20 000. */
const MAX_QUOTED_VERDICT = 4000;

/** Longest explanation a supplier may type. */
const MAX_REASON_LENGTH = 2000;

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        (vars[key] === undefined || vars[key] === null ? match : String(vars[key])));
}

/**
 * The storage key of one verdict: the document and the date of its analysis, so
 * a mark never outlives the verdict it contested.
 *
 * @param {Object} requirement
 * @returns {string}
 */
function contestKey(requirement) {
    return `${CONTEST_STORAGE_PREFIX}${requirement.nodeRef}:${requirement.aiValidationDate || ''}`;
}

function readContested(key) {
    try {
        return window.localStorage.getItem(key) !== null;
    }
    catch {
        return false;
    }
}

function writeContested(key) {
    try {
        window.localStorage.setItem(key, new Date().toISOString());
    }
    catch (error) {
        console.warn('Could not keep the AI contest mark', { key, error: error?.name });
    }
    window.dispatchEvent(new Event(CONTEST_EVENT));
}

function subscribeContested(onChange) {
    window.addEventListener(CONTEST_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
        window.removeEventListener(CONTEST_EVENT, onChange);
        window.removeEventListener('storage', onChange);
    };
}

/** The server knows nothing of browser storage: it renders the row uncontested. */
const serverContested = () => false;

/**
 * The message the customer receives: the document, the verdict quoted, the
 * supplier's reason.
 *
 * @param {Object} params `{ labels, documentLabel, hints, reason }`
 * @returns {string}
 */
export function contestMessage({ labels, documentLabel, hints, reason }) {
    const verdict = plainText(hints || '').slice(0, MAX_QUOTED_VERDICT);
    return [
        fill(labels.messageIntro, { document: documentLabel }),
        verdict ? `${labels.messageVerdict}\n${verdict}` : null,
        `${labels.messageReason}\n${reason.trim()}`,
    ].filter(Boolean).join('\n\n');
}

/**
 * @param {Object} props
 * @param {Object} props.requirement a row of `/documents/requirements`
 * @param {string} props.documentLabel what the supplier calls it - the document type
 * @param {boolean} [props.readOnly] entry is closed: the advice shows, the contest does not
 * @param {string} [props.className]
 */
export function AiVerdictContest({ requirement, documentLabel, readOnly = false, className = '' }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const toast = useToast();
    const reasonId = useId();
    const key = contestKey(requirement);

    // An external store, not a state seeded in an effect: the server render and
    // the first client render must agree, and the mark lives outside React.
    const readMark = useCallback(() => readContested(key), [key]);
    const storedMark = useSyncExternalStore(subscribeContested, readMark, serverContested);
    // Kept in state too, so the mark shows even where storage is refused - for
    // the verdict it answered only, a new analysis is a new verdict.
    const [sentFor, setSentFor] = useState(null);
    const contested = storedMark || sentFor === key;
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [sending, setSending] = useState(false);

    if (requirement.aiValidationState !== AI_REFUSED_STATE) {
        return null;
    }

    const send = async () => {
        setSending(true);
        try {
            await api.post('messages', {
                // The sheet's discussion, where the customer reads the supplier;
                // the document type travels as the row label of the message.
                nodeRef: requirement.entity?.nodeRef || requirement.nodeRef,
                content: contestMessage({
                    labels,
                    documentLabel,
                    hints: requirement.aiValidationHints,
                    reason,
                }),
                itemTitle: documentLabel,
            });
            writeContested(key);
            setSentFor(key);
            setOpen(false);
            toast.success(labels.sent);
        }
        catch (error) {
            toast.error(error);
        }
        finally {
            setSending(false);
        }
    };

    return (
        <div className={`text-xs ${className}`}>
            <p className="flex items-start gap-1.5 text-[var(--becpg-dark-grey)]">
                <Icon name="info" size={14} className="mt-px shrink-0" />
                <span>{labels.advisory}</span>
            </p>

            {contested ? (
                <span className="pill pill-info pill-no-dot pill-sm mt-1.5" role="status">
                    <Icon name="forum" size={12} />
                    <span>{labels.contested}</span>
                </span>
            ) : null}

            {!contested && !readOnly && !open ? (
                <Button
                    variant="link"
                    size="sm"
                    icon="gavel"
                    label={fill(labels.contestFor, { document: documentLabel })}
                    onClick={() => setOpen(true)}
                    className="mt-1"
                >
                    {labels.contest}
                </Button>
            ) : null}

            {open ? (
                <div className="mt-2 flex flex-col gap-2">
                    <label htmlFor={reasonId} className="font-medium text-[var(--becpg-blue)]">
                        {labels.reasonLabel}
                    </label>
                    <Textarea
                        id={reasonId}
                        value={reason}
                        maxLength={MAX_REASON_LENGTH}
                        placeholder={labels.reasonPlaceholder}
                        onChange={(event) => setReason(event.target.value)}
                        disabled={sending}
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            icon="send"
                            loading={sending}
                            disabled={!reason.trim()}
                            onClick={send}
                        >
                            {labels.send}
                        </Button>
                        <Button size="sm" variant="subtle" onClick={() => setOpen(false)} disabled={sending}>
                            {labels.cancel}
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
