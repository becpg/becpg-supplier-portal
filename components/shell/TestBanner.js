'use client';

/**
 * The non-production banner (spec §4.3: "Bandeau TEST permanent et non masquable
 * sur les instances non-prod", §5.3).
 *
 * There is **no dismiss button and no state**: a supplier who fills a
 * questionnaire on a test instance must be told, on every screen, that what they
 * type is not contractual. Making it dismissible would defeat the only reason it
 * exists. The E2E suite asserts both facts — visible, and containing no
 * button-like descendant — so nothing may be added inside it that could be
 * mistaken for a close affordance.
 *
 * Permanent does not have to mean loud. It is a 26px band, a pale wash of the
 * brand orange, ruled underneath by a 2px orange line — the edge it shares with
 * the blue toolbar below it. The sentence is ordinary weight in
 * `--becpg-blue`, not uppercase, and nothing moves: a notice that never changes
 * has no business shouting on every screen, and the hazard stripes it used to
 * wear were the visual language of road works. The contrast reasoning sits next
 * to the tokens, in `app/globals.css`.
 *
 * The flag comes from the tenant (`tenant.isTest`), resolved server-side from
 * `TENANT_MAP`; it can be forced with the `isTest` prop for the login page,
 * which renders before the session exists.
 */

import { Icon } from '@/components/ui/Button';
import { useSession } from '@/components/providers/SessionProvider';
import { useMessages } from '@/lib/messages';

/**
 * @param {Object} props
 * @param {boolean} [props.isTest] forces the banner on/off (defaults to the session's tenant)
 * @param {React.ReactNode} [props.message] overrides the chrome sentence
 * @param {boolean} [props.compact] icon + short badge only, for a constrained header
 */
export function TestBanner({ isTest, message, compact = false, className = '' }) {
    const { t } = useMessages();
    const session = useSession();
    const active = isTest === undefined ? session.isTest : isTest;

    if (!active) {
        return null;
    }

    if (compact) {
        return (
            <span className={`test-badge ${className}`} role="status">
                <Icon name="science" size={13} className="mr-1 text-[var(--test-banner-icon)]" />
                {t('test.badge')}
            </span>
        );
    }

    return (
        <div className={`test-banner ${className}`} role="status" aria-live="polite">
            <span className="test-banner-text">
                <Icon name="science" size={14} />
                {message || t('test.banner')}
            </span>
        </div>
    );
}
