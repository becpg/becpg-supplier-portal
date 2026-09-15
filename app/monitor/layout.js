/**
 * Layout of the **espace de pilotage** (`/monitor/*`, spec §4.6).
 *
 * It renders no chrome of its own — each screen mounts its own `AppShell`, which
 * is what lets a page own its header actions. What the layout owns is the
 * **gate** (spec §4.2, §4.6.7).
 *
 * ## Why a server-side gate on top of the API's own
 *
 * Every `/api/v1/monitor/*` endpoint already refuses a non-monitoring account:
 * `requireMonitorAccess()` runs inside the adapter, so no route can forget it.
 * That is the security boundary and it stays the security boundary — this layout
 * changes nothing about it.
 *
 * What it changes is what a supplier account *sees* when it lands on
 * `/monitor/suppliers`, for instance by following a stale bookmark: without this
 * gate, the page mounts, fires three or four calls, and paints a wall of red
 * error states saying "vous n'avez pas les droits" once per widget. With it, the
 * space answers in one clear sentence, before a single query is spent, and points
 * at the space the account *does* have.
 *
 * The check is deliberately **the same function the API calls**, not a
 * re-implementation: one definition of "who may read the park" (`MONITOR_GROUPS`,
 * `ExternalUser` refused first), evaluated with the caller's own ticket.
 *
 * ## Two refusals, two answers
 *
 *   - an **`ExternalUser`** — a supplier account — is **redirected to `/`**, its
 *     own space. It has somewhere to go, the monitoring space will never open for
 *     it whatever it does, and showing it a page about a park it must not know
 *     exists would be the wrong answer. No chrome is rendered: the redirect is
 *     issued before anything is returned;
 *   - an **internal account without any of `MONITOR_GROUPS`** is told so, with
 *     the groups it would need. Redirecting it would hide an administration
 *     problem behind a bounce, and `/` is not a useful destination for someone
 *     who has no supplier file.
 *
 * Anything other than a 403 — beCPG down, a stale ticket — is **not** treated as
 * a refusal: the children are rendered and the screens surface the real error
 * with their retry, because "beCPG a répondu 500" and "vous n'avez pas les
 * droits" must never look alike.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { requireMonitorAccess } from '@/lib/adapters/monitor';
import { MONITOR_GROUPS } from '@/lib/adapters/session';
import { getLiveSession } from '@/lib/session';
import { LANG_COOKIE, normalizeLang } from '@/config/messages';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const LABELS = {
    fr: {
        metaTitle: 'Pilotage fournisseurs — beCPG',
        metaDescription: 'Vue d’ensemble du parc fournisseurs, conformité documentaire et campagnes',
        title: 'Espace de pilotage',
        denied: 'Espace de pilotage réservé aux équipes internes',
        deniedGroups:
            'Votre compte n’appartient à aucun des groupes beCPG qui ouvrent le pilotage : {groups}. Demandez le rattachement à votre administrateur beCPG.',
        backSupplier: 'Aller à mon tableau de bord',
    },
    en: {
        metaTitle: 'Supplier monitoring — beCPG',
        metaDescription: 'The supplier park at a glance: document compliance and campaigns',
        title: 'Monitoring space',
        denied: 'The monitoring space is reserved for internal teams',
        deniedGroups:
            'Your account belongs to none of the beCPG groups that open the monitoring space: {groups}. Ask your beCPG administrator for the membership.',
        backSupplier: 'Go to my dashboard',
    },
};

/**
 * The tab title and the link preview of every monitoring screen, in the
 * reader's language.
 *
 * @returns {Promise<{title: string, description: string}>}
 */
export async function generateMetadata() {
    const cookieStore = await cookies();
    const lang = normalizeLang(cookieStore.get(LANG_COOKIE)?.value);
    const local = LABELS[lang] || LABELS.fr;
    return { title: local.metaTitle, description: local.metaDescription };
}

/**
 * @param {{children: React.ReactNode}} props
 * @returns {Promise<JSX.Element>}
 */
export default async function MonitorLayout({ children }) {
    const cookieStore = await cookies();
    const lang = normalizeLang(cookieStore.get(LANG_COOKIE)?.value);
    const local = LABELS[lang] || LABELS.fr;

    const session = await getLiveSession();
    let denial = null;
    let isExternal = false;

    if (session) {
        try {
            await requireMonitorAccess(session);
        }
        catch (error) {
            // 403 only. A 500 or a network failure must not read as "forbidden":
            // the screens below show the real error, with a retry.
            if (error && (error.status === 403 || error.code === 'forbidden')) {
                // `requireMonitorAccess` tags a supplier account with the space
                // it does belong to, and a plain internal account with the
                // groups it would need.
                isExternal = Boolean(error.details && error.details.space === 'supplier');
                // A supplier account is redirected below, so it needs no message;
                // an internal account needs to know which groups are missing.
                denial = isExternal
                    ? null
                    : local.deniedGroups.replace(
                        '{groups}',
                        (error.details && Array.isArray(error.details.required)
                            ? error.details.required
                            : MONITOR_GROUPS
                        ).join(', '),
                    );
            }
        }
    }

    // A supplier account goes back to its own space. `redirect()` signals by
    // throwing, so it is called **outside** the try above — inside, the catch
    // would swallow the signal and render the monitoring chrome anyway.
    if (isExternal) {
        redirect('/');
    }

    if (denial) {
        return (
            <AppShell title={local.title}>
                <EmptyState
                    variant="error"
                    icon="lock"
                    title={local.denied}
                    message={denial}
                    action={
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--becpg-blue-lighter)] bg-white px-3.5 py-2 text-sm text-[var(--becpg-blue)] hover:bg-[var(--becpg-blue-lighter)]/40"
                        >
                            {local.backSupplier}
                        </Link>
                    }
                />
            </AppShell>
        );
    }

    return children;
}
