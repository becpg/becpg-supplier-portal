'use client';

/**
 * The 16px icon that identifies a beCPG list — Share's glyph when there is one,
 * a Material icon when there is not (see `lib/listIcons.js` for the rule).
 *
 * It is **decorative**: every surface that uses it prints the list's translated
 * label right next to it, so the image carries `alt=""` and the symbol is
 * `aria-hidden`. A screen reader reads "Nutriments", not "Nutriments image".
 *
 * `data-list-icon` carries the resolved type so a test — or a support
 * screenshot — can assert *which* icon a tab got without matching on a
 * client-translated label.
 */

import { useState } from 'react';
import { Icon } from '@/components/ui/Button';
import { listIcon } from '@/lib/listIcons';

/**
 * @param {Object} props
 * @param {string|null} props.type list name (`nutList`, `surveyList@1`) or charact name (`nut`)
 * @param {number} [props.size=16] rendered box, in px — the assets are 16×16
 * @param {string} [props.fallbackSymbol] Material icon for a type beCPG has no glyph for
 * @param {string} [props.className]
 */
export function ListIcon({ type, size = 16, fallbackSymbol, className = '' }) {
    // Insurance, not a code path: `listIcon` only ever returns a vendored asset,
    // so this flips exactly when someone deletes a PNG from `public/`. The
    // surface degrades to a Material icon instead of a broken-image box.
    const [broken, setBroken] = useState(false);
    const resolved = listIcon(type, fallbackSymbol ? { fallbackSymbol } : undefined);

    if (resolved.kind === 'symbol' || broken) {
        return (
            <Icon
                name={resolved.kind === 'symbol' ? resolved.name : fallbackSymbol || 'list_alt'}
                size={size + 2}
                className={className}
                data-list-icon={resolved.key || 'unknown'}
            />
        );
    }

    return (
        /* A 16×16 PNG of ~300 bytes with fixed intrinsic dimensions.
           `next/image` would route it through `/_next/image`, whose response
           headers alone outweigh the file, and it can never be an LCP element. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={resolved.src}
            alt=""
            aria-hidden="true"
            width={size}
            height={size}
            loading="lazy"
            decoding="async"
            draggable={false}
            data-list-icon={resolved.key}
            onError={() => setBroken(true)}
            className={`shrink-0 select-none ${className}`}
            style={{ width: `${size}px`, height: `${size}px` }}
        />
    );
}
