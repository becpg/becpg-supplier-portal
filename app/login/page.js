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
 * (the selector, or the proxy's tenant-mismatch redirect), then the
 * sub-domain, then the `becpg_portal_tenant` cookie, then the default. The
 * selector is only rendered when the choice is actually open — i.e. when the
 * portal serves several tenants and the URL does not already carry one.
 *
 * Nothing here touches the session: the proxy lets `/login` through
 * unauthenticated, and `/api/auth/login` owns the whole OIDC dance.
 */

import Image from 'next/image';
import { withBasePath } from '@/lib/basePath';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { TenantLogo } from '@/components/shell/TenantLogo';
import {
    TENANT_COOKIE,
    defaultTenantId,
    getTenant,
    listTenants,
    stripTenantPrefix,
    tenantIdFromHost,
} from '@/lib/tenant';
import { t } from '@/config/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';
import { resolveLang } from '@/lib/lang';

export const dynamic = 'force-dynamic';

/** The tab title, in the reader's language like the rest of the page. */
export async function generateMetadata() {
    // The root layout's template appends the product name.
    return { title: t(await resolveLang(), 'account.login') };
}

/** Chrome strings owned by this page only (they never appear anywhere else). */
const PAGE_TEXT = defineLabels('app/login/page#PAGE_TEXT', {
    fr: {
        welcome: 'Bienvenue',
        intro: 'Connectez-vous pour accéder à votre espace fournisseur : vos tâches, vos produits, vos documents et votre statut d’agrément.',
        chooseTenant: 'Sélectionnez votre client',
        chooseTenantHelp: 'Vous travaillez pour plusieurs clients beCPG ? Choisissez celui dont vous voulez ouvrir le dossier.',
        sso: 'Vous serez redirigé vers le service d’authentification de votre client.',
        testNotice: 'Instance de TEST — les données saisies ici ne sont pas contractuelles.',
        help: 'Besoin d’aide ?',
        errorTitle: 'La connexion a échoué',
        pitch: 'Le portail fournisseur beCPG',
        sellingPoints: [
            { icon: 'assignment_turned_in', text: 'Vos demandes de référencement et vos tâches, au même endroit' },
            { icon: 'folder_shared', text: 'Vos documents et certificats, avec leurs dates de validité' },
            { icon: 'verified', text: 'Votre statut d’agrément, tenu à jour par votre client' },
        ],
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
        pitch: 'The beCPG supplier portal',
        sellingPoints: [
            { icon: 'assignment_turned_in', text: 'Your referencing requests and your tasks, in one place' },
            { icon: 'folder_shared', text: 'Your documents and certificates, with their expiry dates' },
            { icon: 'verified', text: 'Your approval status, kept up to date by your customer' },
        ],
    },
});

/** Sign-in failures worth explaining; anything else falls back to the generic one. */
const ERROR_TEXT = defineLabels('app/login/page#ERROR_TEXT', {
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
});

/**
 * Best-effort tenant carried by the URL. The proxy rewrites
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

    const lang = await resolveLang();
    const text = pickLabels(PAGE_TEXT, lang);
    const errors = pickLabels(ERROR_TEXT, lang);

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
        /*
         * The first screen a supplier ever sees, so it is the product's own
         * surface: `--becpg-blue` → `--becpg-blue-light` gradient with the green
         * reaching only the bottom-right corner, where `shape.png` — the range's
         * background mark — sits (`.brand-hero` in globals.css, which also
         * carries the contrast measurements). The sign-in card is white, which is
         * what lets the official logo appear at its real colours instead of being
         * inverted or reduced to a silhouette.
         */
        <main className="brand-hero relative flex min-h-dvh flex-col overflow-hidden">
            {selected && selected.isTest ? (
                <div className="test-banner" role="status">
                    <span className="test-banner-text">
                        {/* The server page cannot import the client `Icon`; the
                            glyph is the same one `TestBanner` uses, and the
                            `.test-banner-text` rule colours both. */}
                        <span className="material-icons" style={{ fontSize: 14 }} aria-hidden="true">
                            science
                        </span>
                        {text.testNotice}
                    </span>
                </div>
            ) : null}

            {/* The range's background mark, bottom-right as theme.css places it.
                Decorative: empty alt, no tab stop, and `z-10` on the content
                below so it can never sit over a label.

                `priority` even though it is decorative, because it *is* this
                page's Largest Contentful Paint and there is no way around that:
                at 400x400 visible it is an order of magnitude larger than the
                biggest text block, on a page whose only other image is a 200x37
                wordmark. Moving it to CSS does not help — measured on Chrome,
                a `background-image` on the element and one on a `::after`
                pseudo-element are both still LCP candidates, so the mark keeps
                winning whatever we render it with; only shrinking the brand
                mark would change that, and that is a design decision.

                So it is treated as what it is. Without `priority` next/image
                defaults to `loading="lazy"`, i.e. the element that decides this
                page's LCP was discovered only after layout; `priority` puts a
                `<link rel="preload">` in the document head where the preload
                scanner finds it in the first bytes. Measured on a production
                build throttled to slow 4G, 1440x900, median of 7 loads:
                LCP 1628 ms lazy -> 780 ms with `priority`.

                No `sizes`: with `sizes` set, next/image builds the srcset from
                `deviceSizes` alone, whose floor is 640 — the same 640w variant
                every device already gets — so it would only add a misleading
                promise of responsiveness. */}
            <Image
                src={withBasePath("/theme/default/images/shape.png")}
                unoptimized
                alt=""
                aria-hidden="true"
                width={500}
                height={500}
                priority
                className="brand-hero-shape"
            />

            <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8 lg:flex-row lg:items-center lg:gap-16 lg:px-10">
                {/* ------------------------------------------------ brand side.
                    White on the gradient: 11.0:1 over #004254, 7.0:1 over
                    #006080 — AA everywhere the text can land. Hidden below `lg`
                    only in its long form; the card keeps the logo and the tenant
                    name, so the branding never disappears on a phone. */}
                <section className="hidden max-w-lg text-white lg:block">
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--becpg-green)]">
                        {text.pitch}
                    </p>
                    <h2 className="mt-3 text-4xl font-light leading-tight">
                        {text.welcome}
                        {selected ? (
                            <>
                                <br />
                                <span className="font-medium">{selected.label}</span>
                            </>
                        ) : null}
                    </h2>
                    <ul className="mt-8 space-y-4">
                        {text.sellingPoints.map((point) => (
                            <li key={point.icon} className="flex items-start gap-3">
                                <span
                                    className="material-icons mt-0.5 shrink-0 text-[var(--becpg-green)]"
                                    style={{ fontSize: 22 }}
                                    aria-hidden="true"
                                >
                                    {point.icon}
                                </span>
                                <span className="text-[0.9375rem] leading-relaxed text-white/90">
                                    {point.text}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>

                <div className="animate-fade-in w-full max-w-md">
                    {/* ------------------------------------------------- card */}
                    <div className="rounded-2xl border border-white/20 bg-white p-5 shadow-[0_18px_50px_rgba(0,20,28,0.35)] sm:p-6">
                        {/* The official 200×37 wordmark, at native colours on the
                            white card — no filter, no substitute. `priority`:
                            above the fold, and the one image the supplier is
                            actually waiting for. */}
                        <div className="mb-4 flex items-center gap-3 border-b border-[var(--becpg-grey)] pb-4">
                            <Image
                                src={withBasePath("/theme/default/images/logo.png")}
                                unoptimized
                                alt="beCPG"
                                width={200}
                                height={37}
                                priority
                                className="h-7 w-auto sm:h-8"
                            />
                            {/* The customer's own mark, when it has one. A client
                                component on purpose: this page cannot carry the
                                `onError` a URL coming from `TENANT_MAP` needs, and
                                without it a mistyped or moved logo drew the
                                browser's broken-image icon on the sign-in card —
                                changing as the tenant was picked. */}
                            <TenantLogo tenant={selected} />
                        </div>

                        <h1 className="text-lg font-medium text-[var(--becpg-blue)]">
                            {text.welcome}
                        </h1>
                        <p className="mt-0.5 text-sm font-medium text-[var(--becpg-blue)]">
                            {selected ? selected.label : t(lang, 'app.title')}
                            <span className="text-[var(--becpg-dark-grey)]">
                                {' · '}
                                {t(lang, 'app.tenantSuffix')}
                            </span>
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-[var(--becpg-dark-grey)]">
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

                        <form action={withBasePath("/api/auth/login")} method="get" className="mt-5">
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
                                            className="min-h-[44px] w-full appearance-none rounded-[0.625rem] border border-[var(--becpg-field-border)] bg-white px-3 py-2 pe-9 text-sm text-[var(--becpg-blue)] focus:border-[var(--becpg-blue-light)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] focus-visible:ring-offset-1"
                                        >
                                            {tenants.map((tenant) => (
                                                <option key={tenant.id} value={tenant.id}>
                                                    {tenant.label}
                                                    {tenant.isTest ? ` — ${t(lang, 'test.badge')}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <span
                                            className="material-icons pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-[var(--becpg-dark-grey)]"
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

                            {/* The call to action stays `--becpg-blue`, not the
                                orange the palette reserves for accents: white on
                                #ff642d is 2.95:1 and blue on it 3.73:1, so a solid
                                orange button cannot carry a readable 16px label.
                                The orange is on the focus ring instead — 3.73:1
                                against the button, above the 3:1 asked of a
                                non-text indicator. */}
                            <button
                                type="submit"
                                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[var(--becpg-blue)] px-5 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-[var(--becpg-blue-light)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] focus-visible:ring-offset-2"
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

                    {/* On the gradient, so white/85 (≥ 8:1) and not
                        `--becpg-dark-grey`, which would sit at 2.4:1 there. */}
                    <p className="mt-5 text-center text-xs text-white/85">
                        <Link
                            href="/help"
                            className="rounded underline underline-offset-2 hover:text-[var(--becpg-green)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] focus-visible:ring-offset-2"
                        >
                            {text.help}
                        </Link>
                        <span className="mx-2" aria-hidden="true">
                            ·
                        </span>
                        <span>beCPG</span>
                    </p>
                </div>
            </div>
        </main>
    );
}
