/**
 * What `/` shows while it is being composed.
 *
 * The dashboard is a server component that reads the park, the tasks, the
 * documents and the threads before it returns a single byte (see `page.js`, and
 * the reasons it is composed there rather than fetched from the browser). Until
 * this file existed, a click on « Tableau de bord » from another tab therefore
 * left the *previous* screen on display for as long as beCPG took to answer,
 * with nothing to say the navigation had even been registered — while every
 * other tab, which fetches from the browser, paints its skeleton immediately.
 *
 * This is that skeleton. The shell — header, rail, bottom bar and their
 * counters, which survive a navigation on their own — is painted at once, and
 * the zones fill in when the data lands.
 *
 * The route group `(home)` exists only to scope this boundary: at `app/` level
 * the same file would become the fallback of every route under the root layout.
 */

import { AppShell } from '@/components/shell/AppShell';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { t as translate } from '@/config/messages';
import { resolveLang } from '@/lib/lang';

/** As many cards as the zone it stands in for, so nothing jumps on arrival. */
const STATE_CARDS = 4;

/** Tasks, products, documents, notifications, discussions. */
const DETAIL_CARDS = 5;

/**
 * @returns {Promise<JSX.Element>}
 */
export default async function DashboardLoading() {
    const lang = await resolveLang();

    return (
        <AppShell title={translate(lang, 'nav.dashboard')}>
            {/* The shapes are `aria-hidden` on their own: what a screen reader
                has to hear is the region being busy, said once. */}
            <div aria-busy="true">
                <span className="sr-only-text">{translate(lang, 'state.loading')}</span>

                <Skeleton width="14rem" height="1.25rem" className="mb-3" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
                    {Array.from({ length: STATE_CARDS }, (unused, index) => (
                        <SkeletonCard key={index} lines={2} />
                    ))}
                </div>

                <Skeleton width="10rem" height="1.25rem" className="mb-3 mt-6 sm:mt-8" />
                <div className="lg:columns-2 lg:gap-4 xl:columns-3 [&>*]:mb-3 [&>*]:break-inside-avoid sm:[&>*]:mb-4 lg:[&>*:last-child]:mb-0">
                    {Array.from({ length: DETAIL_CARDS }, (unused, index) => (
                        <SkeletonCard key={index} lines={4} />
                    ))}
                </div>
            </div>
        </AppShell>
    );
}
