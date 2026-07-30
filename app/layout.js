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

export const metadata = {
    title: "beCPG - Portail Fournisseur",
    description: "Portail fournisseur beCPG — referencement, documents et conformite",
    manifest: "/theme/default/manifest.json",
};

export const viewport = {
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
