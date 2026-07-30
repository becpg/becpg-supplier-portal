'use client';

/**
 * Tenant identity: logo + name.
 *
 * Spec §4.3 and §5.3 both require it in the header **systematically** — a
 * supplier often works for several beCPG customers, each with its own portal
 * URL, and the only thing that tells them which dossier they are filling is this
 * badge. So it is never conditional, never collapsed to a logo alone on desktop,
 * and it falls back to the tenant id when a label or a logo is missing.
 *
 * The logo is a plain `<img>`: it is a per-tenant URL coming from `TENANT_MAP`,
 * i.e. an arbitrary host, which `next/image` would require to be declared in
 * `next.config.mjs` ahead of time. A tenant must be addable by env var alone.
 */

import { useState } from 'react';
import { Icon } from '@/components/ui/Button';
import { useSession } from '@/components/providers/SessionProvider';
import { useMessages } from '@/lib/messages';

const SIZES = {
    sm: { box: 'h-6 w-6', text: 'text-xs', logo: 24 },
    md: { box: 'h-8 w-8', text: 'text-sm', logo: 32 },
    lg: { box: 'h-11 w-11', text: 'text-base', logo: 44 },
};

/**
 * @param {Object} props
 * @param {{id: string, label: string, logoUrl: string, isTest: boolean}} [props.tenant]
 *        explicit tenant; falls back to the session's (needed on /login, which has none)
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.showLabel=true] hide the text to keep only the logo
 * @param {boolean} [props.showSuffix=false] appends "espace fournisseur" under the name
 * @param {'light'|'dark'} [props.tone='light'] `dark` for a coloured header background
 */
export function TenantBadge({
    tenant,
    size = 'md',
    showLabel = true,
    showSuffix = false,
    tone = 'light',
    className = '',
}) {
    const { t } = useMessages();
    const session = useSession();
    const [logoFailed, setLogoFailed] = useState(false);
    const resolved = tenant === undefined ? session.tenant : tenant;
    const metrics = SIZES[size] || SIZES.md;

    const label = (resolved && (resolved.label || resolved.id)) || t('app.title');
    const logoUrl = resolved && resolved.logoUrl;

    return (
        <span className={`flex min-w-0 items-center gap-2 ${className}`}>
            <span
                className={[
                    'flex shrink-0 items-center justify-center overflow-hidden rounded-lg',
                    metrics.box,
                    tone === 'dark' ? 'bg-white/15' : 'bg-white ring-1 ring-[var(--becpg-grey)]',
                ].join(' ')}
            >
                {logoUrl && !logoFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={logoUrl}
                        alt=""
                        width={metrics.logo}
                        height={metrics.logo}
                        className="h-full w-full object-contain p-0.5"
                        onError={() => setLogoFailed(true)}
                    />
                ) : (
                    <Icon
                        name="apartment"
                        size={metrics.logo - 12}
                        className={tone === 'dark' ? 'text-white' : 'text-[var(--becpg-blue)]'}
                    />
                )}
            </span>
            {showLabel ? (
                <span className="flex min-w-0 flex-col leading-tight">
                    <span
                        className={`truncate font-medium ${metrics.text} ${
                            tone === 'dark' ? 'text-white' : 'text-[var(--becpg-blue)]'
                        }`}
                        title={label}
                    >
                        {label}
                    </span>
                    {showSuffix ? (
                        <span
                            className={`truncate text-[11px] ${
                                tone === 'dark' ? 'text-white/70' : 'text-[var(--becpg-dark-grey)]'
                            }`}
                        >
                            {t('app.tenantSuffix')}
                        </span>
                    ) : null}
                </span>
            ) : (
                <span className="sr-only-text">{label}</span>
            )}
        </span>
    );
}
