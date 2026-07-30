/**
 * 404 — a URL that does not exist, or `notFound()` called by a screen.
 *
 * Reached in three ways: a stale bookmark, a supplier following a link to an
 * entity that has since been archived, and a route handler-side `notFound()`.
 * The default Next.js 404 is an unstyled black-on-white page with no way out,
 * which on a portal reached from an e-mail link reads as "the portal is broken".
 *
 * Deliberately a **server component with no session read**: `not-found` is also
 * what renders for an unauthenticated 404, and a session read here would either
 * throw or redirect, turning a missing page into a login loop. It therefore
 * offers only the one link that is always valid — `/`, which the middleware
 * sends to `/login` when there is no session.
 *
 * The language comes from the `becpg_portal_lang` cookie, the same contract the
 * rest of the chrome uses.
 */

import Link from 'next/link';
import { cookies } from 'next/headers';
import { Icon } from '@/components/ui/Button';
import { LANG_COOKIE, normalizeLang } from '@/config/messages';

export const metadata = {
    title: 'Page introuvable — beCPG',
};

const LABELS = {
    fr: {
        title: 'Page introuvable',
        message:
            'Cette adresse n’existe pas, ou l’élément auquel elle renvoie n’est plus accessible. Si vous êtes arrivé ici depuis un e-mail, le lien est peut-être expiré.',
        home: 'Retour à l’accueil',
    },
    en: {
        title: 'Page not found',
        message:
            'This address does not exist, or the item it points to is no longer accessible. If you arrived from an e-mail, the link may have expired.',
        home: 'Back to home',
    },
};

/**
 * @returns {Promise<JSX.Element>}
 */
export default async function NotFound() {
    const cookieStore = await cookies();
    const lang = normalizeLang(cookieStore.get(LANG_COOKIE)?.value);
    const local = LABELS[lang] || LABELS.fr;

    return (
        <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--becpg-grey)] text-[var(--becpg-dark-grey)]">
                <Icon name="search_off" size={28} />
            </span>

            <p className="text-3xl font-light tracking-wide text-[var(--becpg-dark-grey)]">404</p>
            <h1 className="text-lg font-medium text-[var(--becpg-blue)]">{local.title}</h1>
            <p className="text-sm text-[var(--becpg-dark-grey)]">{local.message}</p>

            <Link
                href="/"
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--becpg-blue)] px-3.5 py-2 text-sm text-white hover:bg-[var(--becpg-blue)]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] focus-visible:ring-offset-2"
            >
                <Icon name="home" size={16} />
                {local.home}
            </Link>
        </main>
    );
}
