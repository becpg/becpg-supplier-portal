'use client';

/**
 * The route-level error boundary (spec §4.1 "aucune page blanche").
 *
 * Without this file an uncaught render error in any page under `app/` falls
 * through to Next.js' built-in boundary: in development that is a stack-trace
 * overlay, in production a bare white page reading "Application error: a
 * client-side exception has occurred". Both are unacceptable in front of a
 * supplier — the first leaks our internals, the second says nothing and offers
 * nothing.
 *
 * ## What a supplier is allowed to see
 *
 * The **message is not rendered**. A React render error carries whatever text
 * the throwing code put in it — a nodeRef, a webscript URL, a fragment of a
 * beCPG stack — and none of that belongs on a supplier's screen (spec §6.5:
 * upstream detail is logged, never echoed). What is shown instead is: something
 * broke, here is the retry, here is the way home, and here is the **`digest`**,
 * the stable hash Next.js also writes to the server log — so a support call can
 * be correlated to the real error without ever exposing it.
 *
 * `reset()` re-renders the segment: for the common cause — one failed upstream
 * call during render — that is genuinely enough, and cheaper than a reload.
 *
 * This boundary catches **render** errors only. A failed `fetch()` inside a
 * screen is not an exception here; every screen handles its own request states
 * (`loading` / `empty` / `error` with retry) and that stays the normal path.
 * This is the net under it, not a substitute for it.
 */

import Link from 'next/link';
import { useEffect } from 'react';
import { Button, Icon } from '@/components/ui/Button';

const LABELS = {
    fr: {
        title: 'Cette page n’a pas pu s’afficher',
        message:
            'Une erreur technique est survenue pendant l’affichage. Vos données saisies ne sont pas perdues : elles sont enregistrées au fur et à mesure.',
        retry: 'Réessayer',
        home: 'Retour à l’accueil',
        reference: 'Référence à communiquer au support',
    },
    en: {
        title: 'This page could not be displayed',
        message:
            'A technical error occurred while rendering. Anything you had entered is not lost: it is saved as you go.',
        retry: 'Try again',
        home: 'Back to home',
        reference: 'Reference to give to support',
    },
};

/**
 * Reads the language the way the rest of the chrome does, without pulling in a
 * provider: this boundary must render even when the tree above it is what broke.
 *
 * @returns {'fr'|'en'}
 */
function lang() {
    if (typeof document === 'undefined') {
        return 'fr';
    }
    const match = document.cookie.match(/(?:^|;\s*)becpg_portal_lang=(fr|en)/);
    return match ? match[1] : 'fr';
}

/**
 * @param {Object} props
 * @param {Error & {digest?: string}} props.error
 * @param {Function} props.reset re-renders the failed segment
 */
export default function RouteError({ error, reset }) {
    const local = LABELS[lang()] || LABELS.fr;

    useEffect(() => {
        // The full error goes to the browser console for a developer with the
        // devtools open, and nowhere else. It is deliberately not rendered.
        console.error('[portal] render error', error);
    }, [error]);

    return (
        <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger)]">
                <Icon name="error_outline" size={28} />
            </span>

            <h1 className="text-lg font-medium text-[var(--becpg-blue)]">{local.title}</h1>
            <p className="text-sm text-[var(--becpg-dark-grey)]">{local.message}</p>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <Button variant="primary" icon="refresh" onClick={() => reset()}>
                    {local.retry}
                </Button>
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--becpg-blue-lighter)] bg-white px-3.5 py-2 text-sm text-[var(--becpg-blue)] hover:bg-[var(--becpg-blue-lighter)]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] focus-visible:ring-offset-2"
                >
                    <Icon name="home" size={16} />
                    {local.home}
                </Link>
            </div>

            {error?.digest ? (
                <p className="mt-4 text-xs text-[var(--becpg-dark-grey)]">
                    {local.reference}{' '}
                    <code className="rounded bg-[var(--becpg-grey)] px-1.5 py-0.5 font-mono">
                        {error.digest}
                    </code>
                </p>
            ) : null}
        </main>
    );
}
