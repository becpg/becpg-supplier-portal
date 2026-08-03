'use client';

/**
 * The signature task, end to end — **spec §9.2, ticket #35696**.
 *
 * This screen is the last step of a referencing project, and the one that must
 * never fail: it comes after weeks of data entry, it cannot be refused, and
 * today it is served by a PDFTron viewer that crawls on Firefox and is unusable
 * on a phone. Everything below exists to make it boring.
 *
 * ## What the client does, and what it does not
 *
 * beCPG signs **server-side**. `supplierPortalPrepareSignatures.js` has already
 * run `bSign.prepareForSignature(document, recipients)` — the geometry of the
 * signature and of the initials is fixed — and completing the task runs
 * `beCPG/signature/sign-document.js`, which calls `bSign.signDocument()`,
 * checks the signed content back into the original, and mails it to the
 * recipients. The portal therefore never signs anything. It:
 *
 *   1. **shows** the document (portal proxy only — no Alfresco URL, no ticket);
 *   2. **proves the read** — every page seen, not every page signed;
 *   3. **collects consent** — a mark plus an explicit checkbox;
 *   4. **posts once**, and copes with the fact that a phone on 3G loses answers.
 *
 * ## The single POST, and where it goes
 *
 * `POST /api/v1/signature/{taskId}`, once, carrying the consent. That route is
 * a thin thing: signing *is* completing the signature task, because
 * `sign-document.js` is that task's post-deliverable script, so it proxies
 * `becpg/project/complete/task` and lets beCPG run `bSign.signDocument()`.
 * Inventing a signing endpoint in the portal would move business logic out of
 * beCPG (rule R2, spec §6.2). `submitPath` lets an installation point the POST
 * elsewhere without touching this component.
 *
 * ## The three production failures this handles
 *
 * | Failure | What happens here |
 * |---|---|
 * | Document **already signed** (a second tab, a reload after success, #34523) | detected before rendering the pad; the screen shows the signed state and a download, never a second signature |
 * | Project / deliverable **cancelled** | explicit dead-end state, no capture at all |
 * | **Network dies mid-submit** | the request carries a stable id kept in `sessionStorage`; a retry reuses it, and before showing a failure the screen re-reads the task — a POST that arrived but whose answer was lost resolves as success, not as an error |
 *
 * @example
 * <SignatureFlow task={task} taskId={id} entityNodeRef={entity} backHref="/tasks" />
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { api, apiUrl, useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { AppShell } from '@/components/shell/AppShell';
import { Card } from '@/components/ui/Card';
import { Button, Icon } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Field';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useToast } from '@/components/providers/ToastProvider';
import { useSession } from '@/components/providers/SessionProvider';
import { SignaturePad } from '@/components/signature/SignaturePad';
import { SignatureDocument, readStorageKey, uuidOf } from '@/components/signature/SignatureDocument';
import { clearReadProgress } from '@/components/signature/useReadTracking';

/** Where the idempotency key of a submission lives, per task. */
const REQUEST_KEY_PREFIX = 'becpg-portal:sign-request:';

/** How long the server may take to sign a PDF before we call it a timeout. */
const SUBMIT_TIMEOUT = 120000;

/** Outcomes read off the task and the deliverable, before anything is drawn. */
const OUTCOME = Object.freeze({
    OPEN: 'open',
    SIGNED: 'signed',
    CANCELLED: 'cancelled',
    CLOSED: 'closed',
});

const LABELS = {
    fr: {
        title: 'Signature',
        back: 'Mes tâches',
        loading: 'Ouverture du document…',
        notFound: 'Aucun document à signer',
        notFoundHint:
            'Cette tâche ne référence aucun document signable. Le livrable est peut-être encore en préparation — contactez votre client via la discussion du projet.',
        readTitle: 'Lecture du document',
        progress: '{seen} / {pages} pages consultées',
        progressDone: 'Document consulté en entier',
        progressHint: 'Le bouton de signature s’active une fois toutes les pages consultées.',
        readyHint: 'Tout est prêt : votre signature sera apposée sur le document.',
        goToPage: 'Reprendre page {page}',
        goToDocumentPage: 'Reprendre doc. {document}, page {page}',
        documentCount: '{count} documents à signer',
        toSignature: 'Aller à la signature',
        signTitle: 'Votre signature',
        consent:
            'J’ai lu l’intégralité du document et j’accepte de le signer électroniquement. Je reconnais à cette signature la même valeur qu’une signature manuscrite.',
        sign: 'Signer le document',
        signing: 'Signature en cours…',
        blockedRead: 'Consultez toutes les pages pour pouvoir signer.',
        blockedSignature: 'Ajoutez votre signature.',
        blockedConsent: 'Cochez la case de consentement.',
        successTitle: 'Document signé',
        successBody:
            'Votre signature a été enregistrée. beCPG appose la signature sur le document et vous en envoie une copie par e-mail.',
        successNext: 'Vous n’avez plus rien à faire : la tâche se clôture et votre client est notifié.',
        successDownload: 'Télécharger le document',
        successBack: 'Revenir à mes tâches',
        signedTitle: 'Ce document est déjà signé',
        signedBody:
            'La signature a déjà été enregistrée pour cette tâche. Il n’y a rien à refaire — vous pouvez télécharger le document.',
        // Same card, without the promise of a download, when beCPG no longer serves
        // the document (working copy remplacée à la signature, ou accès retiré).
        signedBodyNoCopy:
            'La signature a déjà été enregistrée pour cette tâche. Il n’y a rien à refaire. Le document n’est plus accessible depuis le portail ; demandez-en une copie à votre client si nécessaire.',
        cancelledTitle: 'Signature annulée',
        cancelledBody:
            'Cette demande de signature a été annulée par votre client. Aucune action n’est attendue de votre part.',
        closedTitle: 'Tâche déjà traitée',
        closedBody: 'Cette tâche n’est plus ouverte. Si vous pensez que c’est une erreur, contactez votre client.',
        externalTitle: 'Signature chez votre prestataire',
        externalBody:
            'Votre client utilise un service de signature externe. Le document s’ouvre dans un nouvel onglet ; revenez ici une fois la signature terminée.',
        externalOpen: 'Ouvrir la signature',
        failed: 'La signature n’a pas pu être enregistrée.',
        failedNetwork:
            'La connexion a été perdue pendant l’envoi. Votre signature n’est pas perdue : réessayez, elle ne sera pas enregistrée deux fois.',
        retry: 'Réessayer',
        refresh: 'Actualiser',
        leaving: 'Signature en cours d’envoi. Quitter maintenant risque de l’interrompre.',
        document: 'Document',
    },
    en: {
        title: 'Signature',
        back: 'My tasks',
        loading: 'Opening the document…',
        notFound: 'No document to sign',
        notFoundHint:
            'This task references no signable document. The deliverable may still be in preparation — contact your customer through the project discussion.',
        readTitle: 'Reading the document',
        progress: '{seen} / {pages} pages read',
        progressDone: 'Whole document read',
        progressHint: 'The sign button unlocks once every page has been seen.',
        readyHint: 'All set: your signature will be applied to the document.',
        goToPage: 'Resume on page {page}',
        goToDocumentPage: 'Resume on doc. {document}, page {page}',
        documentCount: '{count} documents to sign',
        toSignature: 'Go to the signature',
        signTitle: 'Your signature',
        consent:
            'I have read the whole document and I agree to sign it electronically. I acknowledge this signature has the same value as a handwritten one.',
        sign: 'Sign the document',
        signing: 'Signing…',
        blockedRead: 'Read every page to be able to sign.',
        blockedSignature: 'Add your signature.',
        blockedConsent: 'Tick the consent box.',
        successTitle: 'Document signed',
        successBody:
            'Your signature has been recorded. beCPG applies it to the document and emails you a copy.',
        successNext: 'Nothing else is expected from you: the task closes and your customer is notified.',
        successDownload: 'Download the document',
        successBack: 'Back to my tasks',
        signedTitle: 'This document is already signed',
        signedBody:
            'A signature has already been recorded for this task. Nothing to redo — you can download the document.',
        signedBodyNoCopy:
            'A signature has already been recorded for this task. Nothing to redo. The document is no longer reachable from the portal; ask your customer for a copy if you need one.',
        cancelledTitle: 'Signature cancelled',
        cancelledBody: 'This signature request was cancelled by your customer. No action is expected from you.',
        closedTitle: 'Task already handled',
        closedBody: 'This task is no longer open. If you believe this is a mistake, contact your customer.',
        externalTitle: 'Signature at your provider',
        externalBody:
            'Your customer uses an external signature service. The document opens in a new tab; come back here once you are done.',
        externalOpen: 'Open the signature',
        failed: 'The signature could not be recorded.',
        failedNetwork:
            'The connection dropped during the upload. Your signature is not lost: retry, it will not be recorded twice.',
        retry: 'Retry',
        refresh: 'Refresh',
        leaving: 'The signature is being sent. Leaving now may interrupt it.',
        document: 'Document',
    },
};

/**
 * @param {string} template
 * @param {Object} vars
 * @returns {string}
 */
function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
        (vars[key] === undefined || vars[key] === null ? match : String(vars[key])),
    );
}

/**
 * Every document this task will sign — because completing it signs **all** its
 * prepared deliverables, not just the first (`sign-document.js` is a
 * post-deliverable script). When the signature route is unavailable, falls back
 * to the contents of the task the router already loaded, so the screen still
 * shows something rather than an error.
 *
 * @param {Object|null} view `/api/v1/signature/{taskId}` payload
 * @param {Object|null} task the task from `/api/v1/tasks/{id}`
 * @returns {Array<{nodeRef: string, name: string}>}
 */
export function resolveDocuments(view, task) {
    const fromView = view && Array.isArray(view.documents) ? view.documents.filter((entry) => entry && entry.nodeRef) : [];
    if (fromView.length) {
        return fromView;
    }
    // Payload predating `documents` — one scalar document.
    if (view && view.document && view.document.nodeRef) {
        return [view.document];
    }
    const deliverables = (task && Array.isArray(task.deliverables) ? task.deliverables : [])
        .filter((deliverable) => deliverable && Array.isArray(deliverable.contents));
    const fallback = [];
    for (const deliverable of deliverables) {
        const content = deliverable.contents.find((entry) => entry && entry.nodeRef);
        if (content) {
            fallback.push(content);
        }
    }
    return fallback;
}

/**
 * The primary document — the one named in the header and offered for download.
 *
 * @param {Object|null} view
 * @param {Object|null} task
 * @returns {{nodeRef: string, name: string}|null}
 */
export function resolveDocument(view, task) {
    return resolveDocuments(view, task)[0] || null;
}

/**
 * Is there still something to sign? Read from the deliverable, the document and
 * the task, in that order of authority — beCPG stays the source of truth.
 *
 * @param {Object|null} view
 * @param {Object|null} task
 * @returns {string} one of OUTCOME
 */
export function resolveOutcome(view, task) {
    // The route already decided, from `sign:status` + the deliverable + the
    // task, in that order of authority. Everything below is the fallback for a
    // payload that predates it (or for the task-only path).
    const decided = String((view && view.outcome) || '').toLowerCase();
    if (Object.values(OUTCOME).includes(decided)) {
        return decided;
    }

    const signature = (view && view.signature) || null;
    const document = (view && view.document) || null;
    const state = String((signature && signature.state) || '').toLowerCase();
    const signStatus = String(
        (document && (document.signStatus || document.status)) || (view && view.status) || '',
    ).toLowerCase();
    const taskState = String((view && view.task && view.task.state) || (task && task.state) || '').toLowerCase();

    if (signStatus === 'signed' || state === 'signed') {
        return OUTCOME.SIGNED;
    }
    if (state === 'cancelled' || taskState === 'cancelled' || taskState === 'refused') {
        return OUTCOME.CANCELLED;
    }
    if (taskState === 'completed' || state === 'completed') {
        return OUTCOME.SIGNED;
    }
    if (task && task.isOpen === false) {
        return OUTCOME.CLOSED;
    }
    return OUTCOME.OPEN;
}

/**
 * A stable id for one signing intent, kept for the lifetime of the tab.
 *
 * This is what makes the retry idempotent: the same POST, replayed, carries the
 * same `requestId`, so a server (or a proxy in front of it) can recognise the
 * duplicate — and, more importantly, so the *user* is never asked to sign twice
 * because an answer was lost.
 *
 * @param {string} taskId
 * @returns {string}
 */
function requestIdFor(taskId) {
    const key = `${REQUEST_KEY_PREFIX}${taskId}`;
    const fresh = `sign-${taskId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    if (typeof window === 'undefined') {
        return fresh;
    }
    try {
        const existing = window.sessionStorage.getItem(key);
        if (existing) {
            return existing;
        }
        window.sessionStorage.setItem(key, fresh);
    }
    catch {
        // Storage unavailable: the id lives for this render only, which is still
        // enough for the immediate retry — the case that actually happens.
    }
    return fresh;
}

/** @param {string} taskId */
function clearRequestId(taskId) {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.sessionStorage.removeItem(`${REQUEST_KEY_PREFIX}${taskId}`);
    }
    catch {
        // ignored
    }
}

/**
 * A terminal state (signed / cancelled / already handled), rendered the same way
 * so the supplier always gets one clear sentence and one way out.
 */
function OutcomeCard({ icon, tone, title, body, actions }) {
    return (
        <Card padding="lg" className="text-center">
            <span
                className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${
                    tone === 'ok'
                        ? 'bg-[var(--status-ok-bg)] text-[var(--status-ok)]'
                        : tone === 'danger'
                          ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger)]'
                          : 'bg-[var(--becpg-blue-lighter)] text-[var(--becpg-blue)]'
                }`}
            >
                <Icon name={icon} size={26} />
            </span>
            {/* `text-center` is repeated here on purpose: the Card lays its
                children out in a flow that resets the inherited alignment. */}
            <h2 className="text-center text-lg font-medium text-[var(--becpg-blue)]">{title}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--becpg-dark-grey)]">{body}</p>
            {actions ? <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">{actions}</div> : null}
        </Card>
    );
}

/**
 * The signature screen.
 *
 * @param {Object} props
 * @param {Object} [props.task] the task already loaded by `/tasks/[id]` (avoids a refetch)
 * @param {string} props.taskId `pjt:taskList` nodeRef or uuid
 * @param {string} [props.entityNodeRef] the entity the project is about
 * @param {string} [props.backHref='/tasks']
 * @param {'draw'|'type'|'both'} [props.signatureMode='both'] how the mark is captured
 * @param {string} [props.submitPath] overrides the completion endpoint
 * @param {string} [props.consentText] overrides the consent sentence
 * @param {(result: *) => void} [props.onSigned]
 */
export function SignatureFlow({
    task = null,
    taskId,
    entityNodeRef = null,
    backHref = '/tasks',
    signatureMode = 'both',
    submitPath,
    consentText,
    onSigned,
}) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const toast = useToast();
    const session = useSession();
    const reduceMotion = useReducedMotion();

    const view = useApi(taskId ? `signature/${encodeURIComponent(taskId)}` : null);
    // Aliased so the submit callback can depend on the two things it really
    // uses rather than on the whole hook object, which changes on every poll.
    const viewData = view.data;
    const refreshView = view.refresh;

    const [signature, setSignature] = useState({ kind: 'drawn', text: '', dataUrl: null, empty: true });
    const [consent, setConsent] = useState(false);
    const [status, setStatus] = useState('idle');
    const [failure, setFailure] = useState(null);
    const [headerOffset, setHeaderOffset] = useState(56);
    /** index → `{ pageCount, seenCount, complete, firstUnseen }`, one per document. */
    const [progressByDocument, setProgressByDocument] = useState({});

    const viewerControls = useRef(new Map());
    const signPanel = useRef(null);

    /* ------------------------------------------------------------ resolution */

    const documents = useMemo(() => resolveDocuments(view.data, task), [view.data, task]);
    const document_ = documents[0] || null;
    const outcome = useMemo(() => resolveOutcome(view.data, task), [view.data, task]);
    const external = view.data && view.data.signature && view.data.signature.external
        ? view.data.signature
        : null;

    const documentUuid = document_ ? uuidOf(document_.nodeRef) : null;
    const taskUuid = uuidOf(taskId);

    // The primary document's download link, for the terminal cards. The viewers
    // build their own (see `SignatureDocument`); this one has to exist even when
    // no viewer is mounted, which is exactly the "already signed" case.
    //
    // …and exactly the case where it used to lie. Once a signature task is
    // completed, beCPG's check-in deletes the working copy the deliverable's
    // `pjt:dlUrl` still names, so "Télécharger le document signé" pointed at a
    // node the repository no longer has — the reported 404 (defect F4). The
    // route now says so with `available: false`, and the button disappears
    // rather than leading to an error page.
    const downloadUrl = useMemo(
        () => (documentUuid && !(document_ && document_.available === false)
            ? apiUrl(`documents/${encodeURIComponent(documentUuid)}/content`, {
                ...(taskUuid ? { task: taskUuid } : {}),
                download: 1,
            })
            : null),
        [documentUuid, taskUuid, document_],
    );

    /* -------------------------------------------------------- read tracking */

    const trackingEnabled = outcome === OUTCOME.OPEN && status !== 'done';

    const handleProgress = useCallback((index, value) => {
        setProgressByDocument((previous) => {
            const known = previous[index];
            if (known
                && known.pageCount === value.pageCount
                && known.seenCount === value.seenCount
                && known.complete === value.complete
                && known.firstUnseen === value.firstUnseen) {
                return previous;
            }
            return { ...previous, [index]: value };
        });
    }, []);

    const handleControls = useCallback((index, controls) => {
        viewerControls.current.set(index, controls);
    }, []);

    /**
     * The gate, summed over **every** document the completion will sign.
     *
     * `complete` deliberately requires each document to have reported a page
     * count: a viewer that has not finished loading reports `pageCount: 0`, and
     * `0 seen of 0` must never read as "read in full".
     */
    const reading = useMemo(() => {
        const entries = documents.map((unused, index) =>
            progressByDocument[index] || { pageCount: 0, seenCount: 0, complete: false, firstUnseen: null });
        const pageCount = entries.reduce((total, entry) => total + (entry.pageCount || 0), 0);
        const seenCount = entries.reduce((total, entry) => total + (entry.seenCount || 0), 0);
        const loaded = entries.length > 0 && entries.every((entry) => entry.pageCount > 0);
        const firstIndex = entries.findIndex((entry) => !entry.complete);
        return {
            pageCount,
            seenCount,
            documentCount: documents.length,
            complete: loaded && firstIndex === -1,
            progress: pageCount > 0 ? seenCount / pageCount : 0,
            firstIndex: firstIndex === -1 ? null : firstIndex,
            firstUnseen: firstIndex === -1 ? null : entries[firstIndex].firstUnseen,
        };
    }, [documents, progressByDocument]);

    /* ------------------------------------------------------------- geometry */

    // The app header is sticky and its height varies (the TEST banner sits
    // inside it), so it is measured rather than hard-coded.
    useEffect(() => {
        const measure = () => {
            const header = typeof window !== 'undefined' ? window.document.querySelector('header') : null;
            setHeaderOffset(header ? Math.round(header.getBoundingClientRect().height) : 56);
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    /* ------------------------------------------------------------ submitting */

    const requestId = useMemo(() => (taskId ? requestIdFor(taskId) : null), [taskId]);
    const path = submitPath || `signature/${encodeURIComponent(taskId || '')}`;

    const blocked = !reading.complete
        ? labels.blockedRead
        : signature.empty
          ? labels.blockedSignature
          : !consent
            ? labels.blockedConsent
            : null;

    /**
     * Did the POST we lost the answer to actually land?
     *
     * Two independent probes, because neither is conclusive alone: the signature
     * view says whether the *document* is signed, the task says whether the
     * *task* is still open. Either one closing is enough — and both failing
     * leaves the user on the retry path, which is idempotent anyway.
     */
    const confirmSigned = useCallback(async () => {
        try {
            // `zones=0`: this probe must not make the server re-download and
            // re-parse the PDF just to answer "is it signed yet".
            const fresh = await api.get(`signature/${encodeURIComponent(taskId)}?zones=0`, { silent401: true, timeout: 15000 });
            const state = resolveOutcome(fresh, null);
            if (state === OUTCOME.SIGNED || state === OUTCOME.CLOSED) {
                return true;
            }
        }
        catch {
            // The signature deliverable can simply disappear once completed;
            // that is not an answer, so fall through to the task.
        }
        try {
            const fresh = await api.get(`tasks/${encodeURIComponent(taskId)}`, { silent401: true, timeout: 15000 });
            return Boolean(fresh) && fresh.isOpen === false;
        }
        catch {
            return false;
        }
    }, [taskId]);

    const succeed = useCallback(
        (result) => {
            setStatus('done');
            setFailure(null);
            clearRequestId(taskId);
            // Every document's attestation, not just the first: a stale one
            // would pre-tick the gate on a later, different signature.
            documents.forEach((entry) => {
                const key = readStorageKey(taskId, entry.nodeRef);
                if (key) {
                    clearReadProgress(key);
                }
            });
            toast.success(labels.successTitle);
            if (onSigned) {
                onSigned(result);
            }
        },
        [taskId, documents, toast, labels.successTitle, onSigned],
    );

    const submit = useCallback(async () => {
        if (blocked || status === 'sending') {
            return;
        }
        setStatus('sending');
        setFailure(null);

        const body = {
            requestId,
            taskId,
            entityNodeRef,
            documentNodeRef: document_ ? document_.nodeRef : null,
            deliverableNodeRef: (viewData && viewData.signature && viewData.signature.deliverableNodeRef) || null,
            signature: {
                kind: signature.kind,
                name: signature.text || null,
                image: signature.dataUrl || null,
            },
            consent: {
                accepted: true,
                text: consentText || labels.consent,
                at: new Date().toISOString(),
            },
            reading: {
                pages: reading.pageCount,
                seenPages: reading.seenCount,
                documents: reading.documentCount,
                complete: reading.complete,
            },
        };

        try {
            const result = await api.post(path, body, {
                timeout: SUBMIT_TIMEOUT,
                headers: { 'X-Portal-Request-Id': requestId },
            });
            // The route answers 200 for "signed" *and* for "was already signed"
            // — a retry whose first attempt landed. Both are a success for the
            // supplier, and neither signs twice.
            if (result && result.signed === false) {
                setStatus('error');
                setFailure(new Error(labels.failed));
                return;
            }
            succeed(result);
        }
        catch (error) {
            // A dropped connection, a timeout or a 5xx says nothing about
            // whether the server signed. Ask it before crying failure — this is
            // the exact scenario that makes a supplier sign twice, or give up.
            const ambiguous = error.isNetwork || error.code === 'timeout' || error.status >= 500;
            if (ambiguous && (await confirmSigned())) {
                succeed(null);
                return;
            }
            // 409 = the request was cancelled server-side while this tab was
            // open. Retrying is pointless and offering it is a lie: re-read and
            // let the terminal card say so.
            if (error.status === 409) {
                setStatus('idle');
                setFailure(null);
                refreshView();
                toast.error(error);
                return;
            }
            setStatus('error');
            setFailure(error);
            if (!ambiguous) {
                toast.error(error);
            }
        }
    }, [
        blocked,
        status,
        requestId,
        taskId,
        entityNodeRef,
        document_,
        viewData,
        refreshView,
        signature,
        consentText,
        labels.consent,
        labels.failed,
        reading,
        path,
        succeed,
        confirmSigned,
        toast,
    ]);

    // A supplier who closes the tab mid-POST loses nothing (the retry is
    // idempotent) but deserves to be told.
    useEffect(() => {
        if (status !== 'sending') {
            return undefined;
        }
        const guard = (event) => {
            event.preventDefault();
            event.returnValue = labels.leaving;
            return labels.leaving;
        };
        window.addEventListener('beforeunload', guard);
        return () => window.removeEventListener('beforeunload', guard);
    }, [status, labels.leaving]);

    const scrollToSignature = useCallback(() => {
        if (signPanel.current) {
            signPanel.current.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        }
    }, [reduceMotion]);

    // "Resume on page N" of the **first document that is not finished** — the
    // page number alone is meaningless once there are two documents.
    const goToFirstUnseen = useCallback(() => {
        const index = reading.firstIndex;
        if (index === null) {
            return;
        }
        const controls = viewerControls.current.get(index);
        if (controls) {
            controls.goToPage(reading.firstUnseen || 1);
        }
    }, [reading.firstIndex, reading.firstUnseen]);

    /* ------------------------------------------------------------- branches */

    // `code — name`, whichever of the two beCPG knows. Empty when the task carries
    // no entity at all, in which case the line is simply not drawn.
    const productLabel = task && task.entity
        ? [task.entity.code, task.entity.name].filter(Boolean).join(' — ')
        : '';

    const header = (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
                <h1 className="truncate text-lg font-medium text-[var(--becpg-blue)]">
                    {(task && task.name) || (view.data && view.data.task && view.data.task.name) || labels.title}
                </h1>
                {/* The product, not just the PDF. A signature task is called
                    "Signature de documents" on every project of the instance, so
                    without this line the screen never says *what* is being signed —
                    the deliverable carries the document's nodeRef and nothing else,
                    and `lib/adapters/tasks.js` is what recovers the product. */}
                {productLabel ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-[var(--becpg-blue)]">
                        <Icon name="inventory_2" size={14} />
                        <span className="truncate">{productLabel}</span>
                    </p>
                ) : null}
                {document_ && document_.name ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--becpg-dark-grey)]">
                        <Icon name="picture_as_pdf" size={14} />
                        <span className="truncate">
                            {documents.length > 1
                                ? fill(labels.documentCount, { count: documents.length })
                                : document_.name}
                        </span>
                    </p>
                ) : null}
            </div>
            <Button variant="ghost" size="sm" icon="arrow_back" href={backHref}>
                {labels.back}
            </Button>
        </div>
    );

    if (view.loading && !view.data) {
        return (
            <AppShell title={labels.title} hideNav>
                <div className="flex flex-col gap-3">
                    <SkeletonCard lines={2} />
                    <SkeletonCard lines={8} />
                </div>
            </AppShell>
        );
    }

    // A hard error on the signature route is not fatal by itself: the task the
    // router already loaded may carry the document. Only a missing document is.
    if (view.error && !document_ && !external) {
        return (
            <AppShell title={labels.title} hideNav>
                {header}
                {view.error.isNotFound ? (
                    <EmptyState
                        variant="empty"
                        icon="draw"
                        title={labels.notFound}
                        message={labels.notFoundHint}
                        actionLabel={labels.back}
                        actionHref={backHref}
                    />
                ) : (
                    <ErrorState error={view.error} onRetry={view.refresh} />
                )}
            </AppShell>
        );
    }

    /* --- signed, cancelled, already handled: no capture, ever ------------- */

    if (status !== 'done' && outcome !== OUTCOME.OPEN) {
        const terminal = {
            [OUTCOME.SIGNED]: {
                icon: 'verified',
                tone: 'ok',
                title: labels.signedTitle,
                // "vous pouvez télécharger le document" next to no download button
                // is how a fixed 404 becomes a puzzled support call.
                body: downloadUrl ? labels.signedBody : labels.signedBodyNoCopy,
            },
            [OUTCOME.CANCELLED]: {
                icon: 'cancel',
                tone: 'danger',
                title: labels.cancelledTitle,
                body: labels.cancelledBody,
            },
            [OUTCOME.CLOSED]: {
                icon: 'task_alt',
                tone: 'info',
                title: labels.closedTitle,
                body: labels.closedBody,
            },
        }[outcome];

        return (
            <AppShell title={labels.title} hideNav>
                {header}
                <OutcomeCard
                    {...terminal}
                    actions={
                        <>
                            {downloadUrl && outcome === OUTCOME.SIGNED ? (
                                <Button variant="outline" icon="download" href={downloadUrl} external>
                                    {labels.successDownload}
                                </Button>
                            ) : null}
                            <Button variant="primary" icon="arrow_back" href={backHref}>
                                {labels.successBack}
                            </Button>
                        </>
                    }
                />
            </AppShell>
        );
    }

    /* --- signed just now -------------------------------------------------- */

    if (status === 'done') {
        return (
            <AppShell title={labels.title} hideNav>
                {header}
                <motion.div
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    <OutcomeCard
                        icon="verified"
                        tone="ok"
                        title={labels.successTitle}
                        body={
                            <>
                                {labels.successBody}
                                <span className="mt-2 block">{labels.successNext}</span>
                            </>
                        }
                        actions={
                            <>
                                {downloadUrl ? (
                                    <Button variant="outline" icon="download" href={downloadUrl} external>
                                        {labels.successDownload}
                                    </Button>
                                ) : null}
                                <Button variant="primary" icon="arrow_back" href={backHref}>
                                    {labels.successBack}
                                </Button>
                            </>
                        }
                    />
                </motion.div>
            </AppShell>
        );
    }

    /* --- DocuSign / YouSign: the signature does not happen here ------------ */

    if (external && !documents.length) {
        return (
            <AppShell title={labels.title} hideNav>
                {header}
                <OutcomeCard
                    icon="open_in_new"
                    tone="info"
                    title={labels.externalTitle}
                    body={labels.externalBody}
                    actions={
                        <>
                            <Button variant="primary" icon="draw" href={external.url} external>
                                {labels.externalOpen}
                            </Button>
                            <Button variant="outline" icon="refresh" onClick={view.refresh}>
                                {labels.refresh}
                            </Button>
                        </>
                    }
                />
            </AppShell>
        );
    }

    if (!documents.length) {
        return (
            <AppShell title={labels.title} hideNav>
                {header}
                <EmptyState
                    variant="empty"
                    icon="draw"
                    title={labels.notFound}
                    message={labels.notFoundHint}
                    actionLabel={labels.back}
                    actionHref={backHref}
                />
            </AppShell>
        );
    }

    /* --- the flow itself --------------------------------------------------- */

    const progressLabel = reading.complete
        ? labels.progressDone
        : fill(labels.progress, { seen: reading.seenCount, pages: reading.pageCount || '…' });

    return (
        <AppShell title={labels.title} hideNav>
            {header}

            {external ? (
                <Card padding="sm" variant="muted" className="mb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="text-[var(--becpg-dark-grey)]">{labels.externalBody}</span>
                        <Button variant="outline" size="sm" icon="open_in_new" href={external.url} external>
                            {labels.externalOpen}
                        </Button>
                    </div>
                </Card>
            ) : null}

            {/* One viewer per signable deliverable — completing the task signs
                all of them, so the supplier must be able to read all of them. */}
            {documents.map((entry, index) => (
                <SignatureDocument
                    key={entry.nodeRef}
                    document={entry}
                    taskId={taskId}
                    index={index}
                    total={documents.length}
                    enabled={trackingEnabled}
                    headerOffset={headerOffset}
                    lang={lang}
                    onProgress={handleProgress}
                    onControls={handleControls}
                />
            ))}

            {/* --------------------------------------------- reading progress */}
            <div
                className="sticky bottom-0 z-30 -mx-4 mt-3 border-t border-[var(--becpg-grey)] bg-white/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
            >
                <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs">
                            <Icon
                                name={reading.complete ? 'check_circle' : 'menu_book'}
                                size={16}
                                className={reading.complete ? 'text-[var(--status-ok)]' : 'text-[var(--becpg-dark-grey)]'}
                            />
                            <span
                                className={`tabular-nums ${
                                    reading.complete ? 'text-[var(--status-ok)]' : 'text-[var(--becpg-dark-grey)]'
                                }`}
                                aria-live="polite"
                            >
                                {progressLabel}
                            </span>
                        </div>
                        <div
                            className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--becpg-grey)]"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={reading.pageCount || 0}
                            aria-valuenow={reading.seenCount}
                            aria-label={progressLabel}
                        >
                            <motion.div
                                className={`h-full rounded-full ${
                                    reading.complete ? 'bg-[var(--status-ok)]' : 'bg-[var(--becpg-blue-light)]'
                                }`}
                                initial={false}
                                animate={{ width: `${Math.round(reading.progress * 100)}%` }}
                                transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }}
                            />
                        </div>
                    </div>
                    <Button
                        variant={reading.complete ? 'primary' : 'outline'}
                        size="sm"
                        icon={reading.complete ? 'draw' : 'arrow_downward'}
                        onClick={reading.complete ? scrollToSignature : goToFirstUnseen}
                        disabled={!reading.complete && !reading.firstUnseen}
                    >
                        {reading.complete
                            ? labels.toSignature
                            : documents.length > 1
                              ? fill(labels.goToDocumentPage, {
                                  document: (reading.firstIndex || 0) + 1,
                                  page: reading.firstUnseen || 1,
                              })
                              : fill(labels.goToPage, { page: reading.firstUnseen || 1 })}
                    </Button>
                </div>
            </div>

            {/* ----------------------------------------------------- signature */}
            <Card
                title={labels.signTitle}
                icon="draw"
                padding="md"
                className="mt-4 scroll-mt-24"
                animate={false}
            >
                <div ref={signPanel} className="scroll-mt-24">
                    <SignaturePad
                        mode={signatureMode}
                        defaultName={
                            (view.data && view.data.recipientName) || (session.user && session.user.name) || ''
                        }
                        onChange={setSignature}
                        disabled={status === 'sending'}
                    />

                    <div className="mt-4 rounded-lg border border-[var(--becpg-grey)] bg-[var(--becpg-grey)]/30 p-3">
                        <Checkbox
                            checked={consent}
                            disabled={status === 'sending'}
                            onChange={(event) => setConsent(event.target.checked)}
                            label={consentText || labels.consent}
                        />
                    </div>

                    {failure ? (
                        <div className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-3 text-sm text-[var(--status-danger)]">
                            <Icon name="error_outline" size={18} />
                            <span>
                                {failure.isNetwork || failure.code === 'timeout' || failure.status >= 500
                                    ? labels.failedNetwork
                                    : `${labels.failed} ${failure.message || ''}`.trim()}
                            </span>
                        </div>
                    ) : null}

                    <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                        {/* `blocked` is what still stands between the supplier and the
                            signature — and when nothing does, saying "the button unlocks
                            once every page has been read" next to an *enabled* button is
                            simply false (observed on dev, 03/08/2026). The unblocked case
                            gets its own sentence. */}
                        <p className="text-xs text-[var(--becpg-dark-grey)]">
                            {blocked || labels.readyHint}
                        </p>
                        <Button
                            variant="accent"
                            size="lg"
                            icon="draw"
                            onClick={submit}
                            loading={status === 'sending'}
                            disabled={Boolean(blocked) || status === 'sending'}
                        >
                            {status === 'sending' ? labels.signing : failure ? labels.retry : labels.sign}
                        </Button>
                    </div>
                </div>
            </Card>

            <p className="mt-4 text-center text-xs text-[var(--becpg-dark-grey)]">
                <Link href={backHref} className="underline underline-offset-2 hover:text-[var(--becpg-orange)]">
                    {labels.back}
                </Link>
            </p>
        </AppShell>
    );
}
