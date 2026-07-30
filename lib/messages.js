/**
 * Chrome message helpers.
 *
 * Deliberately tiny: the portal has no i18n layer, only its own shell strings
 * (see config/messages.js). Two entry points:
 *
 *   - getMessages(lang)  → server components / route handlers
 *   - useMessages()      → client components
 *
 * This module must stay importable from both the server and the client, so it
 * never imports `next/headers`. The root layout reads the language cookie and
 * puts it on <html lang>; the client hook reads it back from the cookie.
 */

import { useCallback, useSyncExternalStore } from 'react';
import {
    DEFAULT_LANG,
    LANG_CHANGE_EVENT,
    LANG_COOKIE,
    SUPPORTED_LANGS,
    messages,
    normalizeLang,
    t as translate,
} from '@/config/messages';

/** One year, in seconds — the language cookie is a plain preference. */
const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Server-side accessor: returns the chrome messages bound to a language.
 *
 * @param {string} [lang] language code, normalised (defaults to DEFAULT_LANG)
 * @returns {{ lang: string, messages: Object, t: (key: string, vars?: Object) => string }}
 *
 * @example
 * const { t } = getMessages(lang);
 * return <h1>{t('nav.dashboard')}</h1>;
 */
export function getMessages(lang) {
    const code = normalizeLang(lang);
    return {
        lang: code,
        messages: messages[code],
        t: (key, vars) => translate(code, key, vars),
    };
}

/**
 * Reads the chrome language from the browser cookie.
 * Returns DEFAULT_LANG on the server or when the cookie is absent/invalid.
 *
 * @returns {string} a supported language code
 */
export function readLangCookie() {
    if (typeof document === 'undefined') {
        return DEFAULT_LANG;
    }
    const match = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`));
    return normalizeLang(match ? decodeURIComponent(match[1]) : DEFAULT_LANG);
}

/**
 * Writes the chrome language cookie and notifies every mounted useMessages().
 *
 * @param {string} lang language code
 */
export function writeLangCookie(lang) {
    if (typeof document === 'undefined') {
        return;
    }
    const code = normalizeLang(lang);
    document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; samesite=lax`;
    document.documentElement.lang = code;
    window.dispatchEvent(new Event(LANG_CHANGE_EVENT));
}

/**
 * Subscribes to the language cookie. The cookie IS the store: `writeLangCookie`
 * dispatches LANG_CHANGE_EVENT, which is what wakes every mounted hook up.
 *
 * @param {() => void} onStoreChange
 * @returns {() => void} unsubscribe
 */
function subscribeToLang(onStoreChange) {
    window.addEventListener(LANG_CHANGE_EVENT, onStoreChange);
    return () => window.removeEventListener(LANG_CHANGE_EVENT, onStoreChange);
}

/** @returns {string} DEFAULT_LANG — the server has no cookie access here. */
function serverLangSnapshot() {
    return DEFAULT_LANG;
}

/**
 * Client hook: returns the current chrome language and a bound `t`.
 *
 * Renders DEFAULT_LANG on the server (matching the SSR output, so hydration
 * stays clean) then immediately reads the real cookie on the client.
 * `useSyncExternalStore` is used rather than useState+useEffect on purpose: the
 * cookie is an external store, and setState inside an effect would cause a
 * cascading render (react-hooks/set-state-in-effect).
 *
 * @returns {{ lang: string, t: (key: string, vars?: Object) => string,
 *             setLang: (lang: string) => void, langs: string[] }}
 *
 * @example
 * const { t, lang, setLang } = useMessages();
 * <button onClick={() => setLang('en')}>{t('account.language')}</button>
 */
export function useMessages() {
    const lang = useSyncExternalStore(subscribeToLang, readLangCookie, serverLangSnapshot);

    const setLang = useCallback((next) => {
        // writeLangCookie dispatches LANG_CHANGE_EVENT, which re-reads the store.
        writeLangCookie(normalizeLang(next));
    }, []);

    const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

    return { lang, t, setLang, langs: SUPPORTED_LANGS };
}
