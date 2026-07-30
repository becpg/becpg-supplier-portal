/**
 * `/login` — the only public page.
 *
 * It is a **server component with a native form**, and deliberately so:
 *
 *   - `listTenants()` reads `TENANT_MAP` from the environment, which only exists
 *     on the server. Rendering the list here avoids shipping the tenant catalog
 *     through an API just to draw a `<select>`;
 *   - the whole page is a `GET` form aimed at `/api/auth/login`, so signing in
 *     works with JavaScript disabled, before hydration, and on a bad connection.
 *     There is no client state to lose — the button *is* the OIDC redirect.
 *
 * Tenant resolution follows spec §5.3, in priority order: an explicit `?tenant=`
 * (the selector, or the middleware's tenant-mismatch redirect), then the
 * sub-domain, then the `becpg_portal_tenant` cookie, then the default. The
 * selector is only rendered when the choice is actually open — i.e. when the
 * portal serves several tenants and the URL does not already carry one.
 *
 * Nothing here touches the session: the middleware lets `/login` through
 * unauthenticated, and `/api/auth/login` owns the whole OIDC dance.
 */

import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import {
    TENANT_COOKIE,
    defaultTenantId,
    getTenant,
    listTenants,
    stripTenantPrefix,
    tenantIdFromHost,
} from '@/lib/tenant';
import { LANG_COOKIE, normalizeLang, t } from '@/config/messages';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'beCPG — Connexion',
};

/** Chrome strings owned by this page only (they never appear anywhere else). */
const PAGE_TEXT = {
    fr: {
        welcome: 'Bienvenue',
        intro: 'Connectez-vous pour accéder à votre espace fournisseur : vos tâches, vos produits, vos documents et votre statut d’agrément.',
        chooseTenant: 'Sélectionnez votre client',
        chooseTenantHelp: 'Vous travaillez pour plusieurs clients beCPG ? Choisissez celui dont vous voulez ouvrir le dossier.',
        sso: 'Vous serez redirigé vers le service d’authentification de votre client.',
        testNotice: 'Instance de TEST — les données saisies ici ne sont pas contractuelles.',
        help: 'Besoin d’aide ?',
        errorTitle: 'La connexion a échoué',
    },
    en: {
        welcome: 'Welcome',
        intro: 'Sign in to reach your supplier space: your tasks, your products, your documents and your approval status.',
        chooseTenant: 'Select your customer',
        chooseTenantHelp: 'Working for several beCPG customers? Pick the one whose dossier you want to open.',
        sso: 'You will be redirected to your customer’s authentication service.',
        testNotice: 'TEST instance — data entered here is not contractual.',
        help: 'Need help?',
        errorTitle: 'Sign-in failed',
    },
};

/** Sign-in failures worth explaining; anything else falls back to the generic one. */
const ERROR_TEXT = {
    fr: {
        oidc_not_configured: "L'authentification n'est pas configurée pour ce client.",
        tenant_mismatch: 'Votre session appartenait à un autre client. Reconnectez-vous.',
        dev_auth_misconfigured: 'Le mode développement est actif mais mal configuré.',
        session_expired: 'Votre session a expiré. Merci de vous reconnecter.',
    },
    en: {
        oidc_not_configured: 'Authentication is not configured for this customer.',
        tenant_mismatch: 'Your session belonged to another customer. Please sign in again.',
        dev_auth_misconfigured: 'Development mode is on but misconfigured.',
        session_expired: 'Your session has expired. Please sign in again.',
    },
};

/**
 * Best-effort tenant carried by the URL. The middleware rewrites
 * `/t/<tenant>/login` onto `/login`, so the prefix is only visible through the
 * headers Next.js forwards; the sub-domain is always readable from `host`.
 *
 * @param {Headers} headerList
 * @returns {string|null}
 */
function tenantFromUrl(headerList) {
    const host = (headerList.get('x-forwarded-host') || headerList.get('host') || '')
        .toLowerCase()
        .split(':')[0];
    const fromHost = tenantIdFromHost(host);
    if (fromHost) {
        return fromHost;
    }
    const candidates = [
        headerList.get('x-becpg-tenant'),
        headerList.get('x-invoke-path'),
        headerList.get('x-matched-path'),
        headerList.get('next-url'),
    ];
    for (const candidate of candidates) {
        if (!candidate) {
            continue;
        }
        if (!candidate.startsWith('/')) {
            return candidate;
        }
        const { tenantId } = stripTenantPrefix(candidate);
        if (tenantId) {
            return tenantId;
        }
    }
    return null;
}

/**
 * @param {Object} props
 * @param {Promise<Object>} props.searchParams `{ next, tenant, error }`
 */
export default async function LoginPage({ searchParams }) {
    const params = (await searchParams) || {};
    const headerList = await headers();
    const cookieStore = await cookies();

    const lang = normalizeLang(cookieStore.get(LANG_COOKIE)?.value);
    const text = PAGE_TEXT[lang] || PAGE_TEXT.fr;
    const errors = ERROR_TEXT[lang] || ERROR_TEXT.fr;

    const tenants = listTenants();
    const urlTenant = tenantFromUrl(headerList);
    const requested =
        (typeof params.tenant === 'string' ? params.tenant : null) ||
        urlTenant ||
        cookieStore.get(TENANT_COOKIE)?.value ||
        defaultTenantId();

    const selected = getTenant(requested) || getTenant(defaultTenantId());
    // The choice is only offered when it is real: several tenants configured and
    // none imposed by the host or by the /t/<tenant> prefix.
    const showSelector = tenants.length > 1 && !urlTenant;

    const next = typeof params.next === 'string' && params.next.startsWith('/') ? params.next : '/';
    const errorCode = typeof params.error === 'string' ? params.error : null;
    const errorMessage = errorCode ? errors[errorCode] || t(lang, 'error.generic') : null;

    return (
        <main className="relative flex min-h-dvh flex-col bg-[var(--becpg-grey)]/40">
            {selected && selected.isTest ? (
                <div className="test-banner" role="status">
                    <span className="test-banner-text">{text.testNotice}</span>
                </div>
            ) : null}

            <div className="flex flex-1 items-center justify-center px-4 py-8">
                <div className="animate-fade-in w-full max-w-md">
                    {/* ------------------------------------------ brand block */}
                    <div className="mb-6 flex flex-col items-center text-center">
                        <span className="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_6px_18px_rgba(0,66,84,0.12)] ring-1 ring-[var(--becpg-grey)]">
                            {selected && selected.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={selected.logoUrl}
                                    alt=""
                                    className="h-full w-full object-contain p-1.5"
                                />
                            ) : (
                                <span className="material-icons text-[var(--becpg-blue)]" style={{ fontSize: 30 }}>
                                    apartment
                                </span>
                            )}
                        </span>
                        <h1 className="text-xl font-light text-[var(--becpg-blue)] sm:text-2xl">
                            {text.welcome}
                        </h1>
                        <p className="mt-0.5 text-sm font-medium text-[var(--becpg-blue)]">
                            {selected ? selected.label : t(lang, 'app.title')}
                            <span className="text-[var(--becpg-dark-grey)]">
                                {' · '}
                                {t(lang, 'app.tenantSuffix')}
                            </span>
                        </p>
                    </div>

                    {/* ------------------------------------------------- card */}
                    <div className="rounded-2xl border border-[var(--becpg-grey)] bg-white p-5 shadow-[0_8px_28px_rgba(0,66,84,0.08)] sm:p-6">
                        <p className="text-sm leading-relaxed text-[var(--becpg-dark-grey)]">
                            {text.intro}
                        </p>

                        {errorMessage ? (
                            <div
                                role="alert"
                                className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-3 text-sm text-[var(--status-danger)]"
                            >
                                <span className="material-icons" style={{ fontSize: 18 }} aria-hidden="true">
                                    error_outline
                                </span>
                                <span>
                                    <strong className="block font-medium">{text.errorTitle}</strong>
                                    {errorMessage}
                                </span>
                            </div>
                        ) : null}

                        <form action="/api/auth/login" method="get" className="mt-5">
                            <input type="hidden" name="next" value={next} />
                            <input type="hidden" name="lang" value={lang} />

                            {showSelector ? (
                                <div className="mb-4">
                                    <label
                                        htmlFor="tenant"
                                        className="mb-1 block text-sm font-medium text-[var(--becpg-blue)]"
                                    >
                                        {text.chooseTenant}
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="tenant"
                                            name="tenant"
                                            defaultValue={selected ? selected.id : ''}
                                            className="min-h-[44px] w-full appearance-none rounded-lg border border-[var(--becpg-grey)] bg-white px-3 py-2 pr-9 text-sm text-[var(--becpg-blue)] focus:border-[var(--becpg-blue-light)] focus:outline-none focus:ring-2 focus:ring-[var(--becpg-blue-light)]"
                                        >
                                            {tenants.map((tenant) => (
                                                <option key={tenant.id} value={tenant.id}>
                                                    {tenant.label}
                                                    {tenant.isTest ? ` — ${t(lang, 'test.badge')}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <span
                                            className="material-icons pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--becpg-dark-grey)]"
                                            style={{ fontSize: 18 }}
                                            aria-hidden="true"
                                        >
                                            expand_more
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-[var(--becpg-dark-grey)]">
                                        {text.chooseTenantHelp}
                                    </p>
                                </div>
                            ) : (
                                <input type="hidden" name="tenant" value={selected ? selected.id : ''} />
                            )}

                            <button
                                type="submit"
                                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--becpg-blue)] px-5 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-[var(--becpg-blue-light)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] focus-visible:ring-offset-2"
                            >
                                <span className="material-icons" style={{ fontSize: 20 }} aria-hidden="true">
                                    login
                                </span>
                                {t(lang, 'account.login')}
                            </button>

                            <p className="mt-3 text-center text-xs text-[var(--becpg-dark-grey)]">
                                {text.sso}
                            </p>
                        </form>
                    </div>

                    <p className="mt-5 text-center text-xs text-[var(--becpg-dark-grey)]">
                        <Link href="/help" className="underline underline-offset-2 hover:text-[var(--becpg-blue)]">
                            {text.help}
                        </Link>
                        <span className="mx-2">·</span>
                        <span>beCPG</span>
                    </p>
                </div>
            </div>
        </main>
    );
}
