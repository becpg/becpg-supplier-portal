'use client';

/**
 * The tenant's own mark, next to the beCPG wordmark on the sign-in card.
 *
 * ## Why this is a component and not an `<img>` in the page
 *
 * `/login` is a server component (it reads `TENANT_MAP`, which only exists
 * server-side), so it cannot hold the one thing this image needs: an `onError`.
 * And it needs one — the URL comes from `TENANT_MAP`, i.e. from an environment
 * variable, pointing at an arbitrary path or host that nothing validates. A
 * tenant whose logo has moved, is behind a host the browser cannot reach, or is
 * simply mistyped rendered the browser's **broken-image icon** on the first
 * screen a supplier ever sees — and it changed as the tenant was picked in the
 * selector, since the choice is what decides which logo is drawn.
 *
 * So the chip renders the neutral "customer" mark until the image actually
 * loads, and goes back to it if the image fails. There is no state in which a
 * broken image is shown.
 *
 * It is still a plain `<img>` and not `next/image`: an arbitrary host would have
 * to be declared in `next.config.mjs` ahead of time, and a tenant must be
 * addable by environment variable alone. Same reasoning as `TenantBadge`.
 */

import { useState } from 'react';
import { Icon } from '@/components/ui/Button';
import { tenantLogoUrl } from '@/components/shell/TenantBadge';

/**
 * @param {Object} props
 * @param {{label?: string, logoUrl?: string}|null} props.tenant the selected tenant
 * @param {string} [props.className]
 */
export function TenantLogo({ tenant, className = '' }) {
    const [failed, setFailed] = useState(false);
    const url = tenantLogoUrl(tenant);

    // No logo of its own: the card already shows the beCPG wordmark full size, so
    // a second, crushed copy of it adds nothing. Nothing is drawn at all here —
    // the tenant's name is right below, in words.
    if (!url) {
        return null;
    }

    return (
        <span className={`flex items-center gap-3 ${className}`}>
            <span className="h-8 w-px bg-[var(--becpg-grey)]" aria-hidden="true" />
            {failed ? (
                <Icon name="apartment" size={22} className="text-[var(--becpg-blue)]" />
            ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={url}
                    alt=""
                    onError={() => setFailed(true)}
                    className="h-8 w-auto max-w-[7rem] object-contain"
                />
            )}
        </span>
    );
}
