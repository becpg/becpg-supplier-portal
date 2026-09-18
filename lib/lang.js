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
 * The order is the same as it always was on the upstream side, and it is the
 * only one that makes sense:
 *
 *   1. `becpg_portal_lang` — what the supplier chose in the switcher;
 *   2. `PORTAL_DEFAULT_LANG` — what the instance is configured for;
 *   3. `DEFAULT_LANG` — the last resort.
 *
 * Server only: step 2 reads an environment variable that is deliberately not
 * `NEXT_PUBLIC_`, so a client-side copy of this would silently skip it and
 * reintroduce the divergence.
 *
 * @returns {Promise<string>} one of `SUPPORTED_LANGS`
 */

import { cookies } from 'next/headers';
import { LANG_COOKIE, normalizeLang } from '@/config/messages';

export async function resolveLang() {
    try {
        const store = await cookies();
        const chosen = store.get(LANG_COOKIE)?.value;
        if (chosen) {
            return normalizeLang(chosen);
        }
    }
    catch {
        // Outside a request scope — a cron, a webhook: `cookies()` throws rather
        // than returning empty, and that is a legitimate caller.
    }
    return normalizeLang(process.env.PORTAL_DEFAULT_LANG);
}
