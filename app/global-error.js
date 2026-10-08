'use client';

/**
 * The last net: an error thrown by the **root layout itself**.
 *
 * `app/error.js` sits inside the root layout, so it cannot catch an error the
 * root layout threw on its way up — session decryption, tenant resolution, the
 * font loader. Only `global-error.js` can, and to do it Next.js **replaces the
 * whole document**: this component renders its own `<html>` and `<body>`.
 *
 * Two consequences drive how it is written:
 *
 *   1. `app/globals.css` is imported by the root layout, which did not run — so
 *      **no Tailwind class applies here**. Everything is inline `style`, or the
 *      page would be unstyled black-on-white serif text. The `--becpg-*` custom
 *      properties are equally unavailable, so the two brand colours are written
 *      as literals; this is the one file in the portal allowed to do that;
 *   2. no provider is mounted, so there is no `useMessages`, no session, no
 *      `Icon` (the Material font is loaded by the root layout too). The icon is
 *      an inline SVG and the language is read straight from the cookie.
 *
 * As in `app/error.js` the error message is never rendered — only the `digest`,
 * which is also in the server log and is what support needs to find it.
 */

import { useEffect } from 'react';
import { DEFAULT_LANG, LANG_COOKIE, bcp47Of, dirOf, normalizeLang } from '@/config/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('app/global-error#LABELS', {
    fr: {
        title: 'Le portail n’a pas pu démarrer',
        message:
            'Une erreur technique empêche l’affichage du portail. Réessayez ; si le problème persiste, contactez votre interlocuteur beCPG en indiquant la référence ci-dessous.',
        retry: 'Réessayer',
        reference: 'Référence',
    },
    en: {
        title: 'The portal could not start',
        message:
            'A technical error prevents the portal from rendering. Try again; if it persists, contact your beCPG contact with the reference below.',
        retry: 'Try again',
        reference: 'Reference',
    },
});

const BLUE = '#004254';
const DANGER = '#b3261e';

/** @returns {string} a supported lang */
function lang() {
    if (typeof document === 'undefined') {
        return DEFAULT_LANG;
    }
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([^;]+)`));
    return normalizeLang(match ? decodeURIComponent(match[1]) : DEFAULT_LANG);
}

/**
 * @param {Object} props
 * @param {Error & {digest?: string}} props.error
 * @param {Function} props.retry
 */
export default function GlobalError({ error, retry }) {
    const code = lang();
    const local = pickLabels(LABELS, code);

    useEffect(() => {
        console.error('[portal] root error', error);
    }, [error]);

    return (
        <html lang={bcp47Of(code)} dir={dirOf(code)}>
            <body
                style={{
                    margin: 0,
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5rem',
                    fontFamily:
                        'Roboto, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
                    color: BLUE,
                    background: '#f7fafb',
                }}
            >
                <main
                    style={{
                        maxWidth: '30rem',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem',
                    }}
                >
                    <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={DANGER}
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden="true"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="13" />
                        <line x1="12" y1="16.5" x2="12" y2="16.5" />
                    </svg>

                    <h1 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 500 }}>
                        {local.title}
                    </h1>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#747474', lineHeight: 1.5 }}>
                        {local.message}
                    </p>

                    <button
                        type="button"
                        onClick={() => retry()}
                        style={{
                            marginTop: '0.5rem',
                            cursor: 'pointer',
                            border: 'none',
                            borderRadius: '0.5rem',
                            background: BLUE,
                            color: '#ffffff',
                            padding: '0.625rem 1.25rem',
                            fontSize: '0.875rem',
                            font: 'inherit',
                            fontWeight: 500,
                        }}
                    >
                        {local.retry}
                    </button>

                    {error?.digest ? (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#747474' }}>
                            {local.reference}{' '}
                            <code style={{ fontFamily: 'ui-monospace, monospace' }}>
                                {error.digest}
                            </code>
                        </p>
                    ) : null}
                </main>
            </body>
        </html>
    );
}
