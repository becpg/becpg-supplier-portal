/**
 * The browser tab title of a route segment, in the reader's language.
 *
 * Most screens are client components, which cannot export metadata: each route
 * gets a pass-through `layout.js` that exports the function built here. The
 * root layout wraps the result in {@link PAGE_TITLE_TEMPLATE}.
 *
 * Server only.
 */

import { t as translate } from '@/config/messages';
import { loadLocale } from '@/lib/i18n';
import { resolveLang } from '@/lib/lang';

/** `Mes tâches · beCPG`: the screen first, so a row of tabs stays readable. */
export const PAGE_TITLE_TEMPLATE = '%s · beCPG';

/**
 * Builds the `generateMetadata` of a segment titled by a chrome message.
 *
 * @param {string} messageKey a key of `config/messages.js`, e.g. `nav.tasks`
 * @returns {() => Promise<{title: string}>}
 *
 * @example
 * export const generateMetadata = pageTitle('nav.tasks');
 */
export function pageTitle(messageKey) {
    return async function generateMetadata() {
        const lang = await resolveLang();
        await loadLocale(lang);
        return { title: translate(lang, messageKey) };
    };
}
