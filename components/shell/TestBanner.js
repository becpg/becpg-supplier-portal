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
 * Permanent does not have to mean improvised. It is a 24px hazard strip in
 * `--becpg-orange`, striped with a black overlay (same hue, no new colour), sat
 * flush **above** the blue toolbar and the same width as it: it reads as the top
 * edge of the application chrome rather than as a notice bolted on top of the
 * page. The sentence rides on a white pill because `#ff642d` cannot carry 12px
 * text at AA — see the contrast note on `.test-banner` in globals.css. The
 * stripes animate, and stop under `prefers-reduced-motion`.
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
                <Icon name="science" size={13} className="mr-1" />
                {t('test.badge')}
            </span>
        );
    }

    return (
        <div className={`test-banner ${className}`} role="status" aria-live="polite">
            <span className="test-banner-text">
                <Icon name="science" size={13} className="mr-1" />
                {message || t('test.banner')}
            </span>
        </div>
    );
}
