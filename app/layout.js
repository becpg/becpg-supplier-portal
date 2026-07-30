import { Roboto } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { LANG_COOKIE, normalizeLang } from "@/config/messages";
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
export const metadata = {
    title: "beCPG - Portail Fournisseur",
    description: "Portail fournisseur beCPG — referencement, documents et conformite",
    applicationName: "beCPG Portail Fournisseur",
    manifest: "/theme/default/manifest.json",
    icons: {
        // `favicon.ico` first and with `sizes="any"`: it is the multi-resolution
        // one, and it is what a browser reaching for /favicon.ico gets served.
        icon: [
            { url: "/theme/default/icons/favicon.ico", sizes: "any" },
            { url: "/theme/default/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
            { url: "/theme/default/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
            { url: "/theme/default/icons/favicon-96x96.png", sizes: "96x96", type: "image/png" },
            { url: "/theme/default/icons/android-icon-192x192.png", sizes: "192x192", type: "image/png" },
        ],
        shortcut: ["/theme/default/icons/favicon.ico"],
        apple: [
            { url: "/theme/default/icons/apple-icon-120x120.png", sizes: "120x120", type: "image/png" },
            { url: "/theme/default/icons/apple-icon-152x152.png", sizes: "152x152", type: "image/png" },
            { url: "/theme/default/icons/apple-icon-180x180.png", sizes: "180x180", type: "image/png" },
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
        "msapplication-config": "/theme/default/browserconfig.xml",
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

export default async function RootLayout({ children }) {
    const cookieStore = await cookies();
    const lang = normalizeLang(cookieStore.get(LANG_COOKIE)?.value);

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

                    SessionProvider fetches GET /api/v1/session once and holds the
                    user, the tenant (logo, label, TEST flag), the beCPG groups and
                    the resolved space for the whole tab; it also restarts the OIDC
                    flow when any call answers 401. It carries the tenant, so there
                    is no separate TenantProvider.

                    ToastProvider is nested inside it because a toast can need to
                    resolve a session-dependent message, never the reverse.

                    Both are client components mounted from this server layout, so
                    they survive every client navigation and are not re-created per
                    page. /login renders inside them and simply never triggers the
                    session call.
                */}
                <SessionProvider>
                    <ToastProvider>{children}</ToastProvider>
                </SessionProvider>
            </body>
        </html>
    );
}
