/**
 * **The one answer to "which language is this request in".**
 *
 * There used to be two, and they disagreed. The rendered page resolved
 * `normalizeLang(cookie)` — falling back to `DEFAULT_LANG` — while every
 * upstream call resolved `normalizeLang(cookie) ?? PORTAL_DEFAULT_LANG`. With no
 * cookie set and `PORTAL_DEFAULT_LANG=en`, which is what dev.becpg.fr ships, the
 * portal drew a **French** interface and asked beCPG for **English**: measured
 * on dev, the chrome in French and the AI suggestions coming back "Allergens
 * extracted from the technical sheet". A supplier reads one page, not two.
 *
 * ## The order, and why the user's own language sits above the instance's
 *
 *   1. `becpg_portal_lang` — what this supplier just chose in the switcher. The
 *      most recent explicit act wins, always.
 *   2. `session.locale` — `bcpg:userLocale`, the language on their beCPG profile,
 *      read once at sign-in. **This is the answer for almost everybody**: a French
 *      supplier on an instance configured in English must read French, and an
 *      instance-wide default can never express that.
 *   3. `PORTAL_DEFAULT_LANG` — what the instance is configured for, for a user who
 *      never set a language.
 *   4. `DEFAULT_LANG`.
 *
 * A profile locale the portal does not speak falls through to 3 instead of being
 * flattened onto the default: `normalizeLang('de')` returns `fr`, which would
 * silently override an instance configured in English.
 *
 * Server only: step 3 reads an environment variable that is deliberately not
 * `NEXT_PUBLIC_`, so a client-side copy of this would skip it and reintroduce the
 * divergence.
 */

import { cookies } from 'next/headers';
import { LANG_COOKIE, SUPPORTED_LANGS, normalizeLang } from '@/config/messages';
import { getSession } from '@/lib/session';

/**
 * The value when the portal speaks it, `null` otherwise — so the caller can fall
 * through rather than flatten an unsupported language onto the default.
 *
 * @param {string} [value]
 * @returns {string|null}
 */
function spoken(value) {
    const code = String(value || '').trim().toLowerCase().split(/[-_]/)[0];
    return SUPPORTED_LANGS.includes(code) ? code : null;
}

/**
 * The language of the current request.
 *
 * @param {Object} [session] the caller's session, when it already has one — the
 *        hot path (`becpgFetch`) does, and passing it avoids decrypting the
 *        cookie again on every upstream call.
 * @returns {Promise<string>} one of `SUPPORTED_LANGS`
 */
export async function resolveLang(session) {
    let chosen = null;
    try {
        const store = await cookies();
        chosen = spoken(store.get(LANG_COOKIE)?.value);
    }
    catch {
        // Outside a request scope — a cron, a webhook: `cookies()` throws rather
        // than returning empty, and that is a legitimate caller.
    }
    if (chosen) {
        return chosen;
    }

    const current = session ?? await getSession().catch(() => null);
    const profile = spoken(current?.locale);
    if (profile) {
        return profile;
    }

    return normalizeLang(process.env.PORTAL_DEFAULT_LANG);
}
