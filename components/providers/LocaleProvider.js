'use client';

import { registerLocale } from '@/lib/localeRegistry';
import { LangContext } from '@/lib/messages';

/**
 * Hands the language the server resolved, and its translations, to the client.
 *
 * Registered during render, before any child renders, so the very first client
 * render — hydration included — finds the same text the server wrote. A second
 * registration of the same language is a no-op.
 *
 * @param {Object} props
 * @param {string} props.lang the reader's language
 * @param {Object|null} props.dictionary its translations, null for French and English
 * @param {React.ReactNode} props.children
 */
export function LocaleProvider({ lang, dictionary, children }) {
    registerLocale(lang, dictionary);
    return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}
