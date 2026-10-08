/**
 * Chrome message helpers.
 *
 * The client side of the chrome strings (see config/messages.js): the current
 * language, a bound `t`, and the switch. Server code calls `t(lang, key)` from
 * `config/messages` directly; component labels go through `lib/i18n.js`.
 *
 * This module must stay importable from both the server and the client, so it
 * never imports `next/headers`. The root layout reads the language cookie and
 * puts it on <html lang>; the client hook reads it back from the cookie.
 */

import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import {
    DEFAULT_LANG,
    LANG_CHANGE_EVENT,
    LANG_COOKIE,
    SUPPORTED_LANGS,
    bcp47Of,
    dirOf,
    normalizeLang,
    t as translate,
} from '@/config/messages';
import { loadLocale } from '@/lib/i18n';

/** One year, in seconds — the language cookie is a plain preference. */
const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * The language the server resolved for this document — the cookie, else the
 * beCPG profile, else the instance default (`lib/lang.js`). Provided by
 * `LocaleProvider`, so the server renders client components in it.
 */
export const LangContext = createContext(DEFAULT_LANG);

/**
 * Reads the chrome language in the browser: the cookie when the reader chose
 * one, otherwise the language the server wrote on `<html lang>` — which is
 * where a profile language lands when no cookie was ever set.
 *
 * @returns {string} a supported language code
 */
export function readLangCookie() {
    if (typeof document === 'undefined') {
        return DEFAULT_LANG;
    }
    const match = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`));
    return normalizeLang(match ? decodeURIComponent(match[1]) : document.documentElement.lang || DEFAULT_LANG);
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
    document.documentElement.lang = bcp47Of(code);
    document.documentElement.dir = dirOf(code);
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

/**
 * Client hook: returns the current chrome language and a bound `t`.
 *
 * Renders the language the server resolved (`LangContext`) on the server and
 * during hydration, so both agree, then follows the cookie on the client.
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
    const resolved = useContext(LangContext);
    const serverLang = useCallback(() => resolved, [resolved]);
    const lang = useSyncExternalStore(subscribeToLang, readLangCookie, serverLang);

    const setLang = useCallback((next) => {
        const code = normalizeLang(next);
        // The translations first, the switch after: the other way round, every
        // screen would render one frame in English. writeLangCookie dispatches
        // LANG_CHANGE_EVENT, which re-reads the store.
        loadLocale(code)
            .catch((error) => console.error('[i18n] locale load failed', code, error?.message))
            .finally(() => writeLangCookie(code));
    }, []);

    const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

    return { lang, t, setLang, langs: SUPPORTED_LANGS };
}
