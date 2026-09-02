import { Roboto } from "next/font/google";
import { withBasePath } from '@/lib/basePath';
import { cookies } from "next/headers";
import "./globals.css";
import { LANG_COOKIE, normalizeLang } from "@/config/messages";
import { getSession, toPublicSession } from "@/lib/session";
import { getTenant, toPublicTenant } from "@/lib/tenant";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

const roboto = Roboto({
    weight: ["300", "400", "500", "700"],
    subsets: ["latin"],
    display: "swap",
    variable: "--font-roboto",
});

/**
 * Everything below points at `public/theme/default/`, the official beCPG theme
 * tree copied verbatim into this repository — the same icon set, the same
 * manifest and the same `#004254` as Share and the regulatory app. Nothing here
 * is portal-specific artwork: an installed portal must be indistinguishable
 * from the rest of the range in the task switcher and on a home screen.
 */
// Les URL de metadonnees -- manifeste, favicons -- ne passent pas par le
// basePath de Next : il ne s'applique qu'aux URL que Next fabrique lui-meme.
// Servi sous /supplier, un favicon en chemin absolu part chez le core beCPG.
export const metadata = {
    title: "beCPG - Portail Fournisseur",
    description: "Portail fournisseur beCPG — referencement, documents et conformite",
    applicationName: "beCPG Portail Fournisseur",
    manifest: withBasePath("/theme/default/manifest.json"),
    icons: {
        // `favicon.ico` first and with `sizes="any"`: it is the multi-resolution
        // one, and it is what a browser reaching for /favicon.ico gets served.
        icon: [
            { url: withBasePath("/theme/default/icons/favicon.ico"), sizes: "any" },
            { url: withBasePath("/theme/default/icons/favicon-16x16.png"), sizes: "16x16", type: "image/png" },
            { url: withBasePath("/theme/default/icons/favicon-32x32.png"), sizes: "32x32", type: "image/png" },
            { url: withBasePath("/theme/default/icons/favicon-96x96.png"), sizes: "96x96", type: "image/png" },
            { url: withBasePath("/theme/default/icons/android-icon-192x192.png"), sizes: "192x192", type: "image/png" },
        ],
        shortcut: [withBasePath("/theme/default/icons/favicon.ico")],
        apple: [
            { url: withBasePath("/theme/default/icons/apple-icon-120x120.png"), sizes: "120x120", type: "image/png" },
            { url: withBasePath("/theme/default/icons/apple-icon-152x152.png"), sizes: "152x152", type: "image/png" },
            { url: withBasePath("/theme/default/icons/apple-icon-180x180.png"), sizes: "180x180", type: "image/png" },
        ],
    },
    // A supplier who installs the portal on a phone gets the beCPG mark and the
    // blue status bar, not a browser chrome with a screenshot of the page.
    appleWebApp: {
        capable: true,
        title: "beCPG Fournisseur",
        statusBarStyle: "black-translucent",
    },
    other: {
        // Windows tiles: `browserconfig.xml` ships with the theme and already
        // carries the ms-icon set and the #004254 tile colour.
        "msapplication-TileColor": "#004254",
        "msapplication-config": withBasePath("/theme/default/browserconfig.xml"),
    },
};

export const viewport = {
    // `--becpg-blue`. Same value as `theme_color` in the theme manifest and as
    // `TileColor` in browserconfig.xml — three files that must never disagree.
    themeColor: "#004254",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

/**
 * Who the request is, resolved from the session cookie alone.
 *
 * `getSession()` decrypts the JWE and stops there: **no beCPG call, no ticket
 * use, no network at all**, so this costs the same on every page as the language
 * cookie read above. What it returns is deliberately *partial* — the identity
 * (user, tenant, TEST flag), never the space, the groups, the suppliers or the
 * capabilities, which only `/api/v1/session` can compose because they need the
 * repository.
 *
 * It exists because without it the shell had no server-rendered notion of being
 * signed in at all: `SessionProvider` started every document at `session = null`
 * — the signed-out state — and only left it once a client round trip landed. The
 * first paint after a successful login was therefore always signed-out chrome,
 * and any failure of that single request (a timeout on the 50-task scan behind
 * `resolveMySuppliers`, a network blip, an upstream hiccup) left it there with no
 * way out but a manual reload. Seeding removes the dependency instead of racing
 * it.
 *
 * Both projections are the ones `/api/v1/session` already serialises
 * (`toPublicSession` / `toPublicTenant`), so nothing crosses to the browser that
 * did not already: no ticket, no access/refresh/id token (AGENTS.md rule 5).
 *
 * @returns {Promise<{user: Object, tenant: Object|null, isTest: boolean, lang: string}|null>}
 */
async function readIdentity(lang) {
    const session = await getSession();
    if (!session) {
        return null;
    }
    const tenant = getTenant(session.tenantId);
    return {
        user: toPublicSession(session),
        tenant: toPublicTenant(tenant),
        isTest: Boolean(tenant && tenant.isTest),
        lang,
    };
}

export default async function RootLayout({ children }) {
    const cookieStore = await cookies();
    const lang = normalizeLang(cookieStore.get(LANG_COOKIE)?.value);
    const identity = await readIdentity(lang);

    return (
        <html lang={lang}>
            <head>
                {/*
                    Material Icons, linked exactly as `becpg-regulatory-ui`'s root
                    layout links it — one stylesheet, no icon package. `<Icon>`
                    (components/ui/Button.js) is the only consumer, and the whole
                    range therefore draws the same glyph for the same action.
                */}
                <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
            </head>
            <body className={`${roboto.variable} antialiased`}>
                {/*
                    PROVIDERS INSERTION POINT.

                    SessionProvider is seeded with `initialIdentity` — who the
                    server already knows this request to be, from the cookie — and
                    then fetches GET /api/v1/session for what the cookie cannot
                    say: the beCPG groups, the resolved space, the supplier(s) and
                    the capabilities. It carries the tenant, so there is no
                    separate TenantProvider. It also restarts the OIDC flow when
                    any call answers 401.

                    The seed is what makes the shell signed-in from the very first
                    paint after login. It is computed per document, so it is
                    equally correct in the other direction: after a sign-out the
                    cookie is gone, the seed is null, and no cached payload can
                    keep the signed-in shell alive.

                    ToastProvider is nested inside it because a toast can need to
                    resolve a session-dependent message, never the reverse.

                    Both are client components mounted from this server layout, so
                    they survive every client navigation and are not re-created per
                    page. /login renders inside them and simply never triggers the
                    session call.
                */}
                <SessionProvider initialIdentity={identity}>
                    <ToastProvider>{children}</ToastProvider>
                </SessionProvider>
            </body>
        </html>
    );
}
