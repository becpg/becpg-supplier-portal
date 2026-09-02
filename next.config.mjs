/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    output: 'standalone',
    poweredByHeader: false,

    // Servi sous le chemin /supplier de l'hote de chaque instance
    // (https://dev.becpg.fr/supplier), et non sur un hote dedie : l'hote porte
    // l'identite du tenant, tous ses services sont dessous (#36246 §1).
    //
    // L'ingress GKE ne reecrit pas les chemins -- il n'a pas d'equivalent au
    // rewrite-target de nginx. C'est donc a l'application de se servir sous son
    // prefixe : sans basePath, ses assets et sa route de callback pointeraient
    // vers la racine de l'hote, ou repond le core beCPG.
    //
    // Vide en developpement local, ou le portail ecoute a la racine.
    basePath: process.env.PORTAL_BASE_PATH || '',

    // Le meme prefixe, lisible depuis le navigateur. `basePath` ne s'applique
    // qu'aux URL que Next fabrique lui-meme -- next/link, next/router, les
    // assets. Un <form action="/api/...">, un <a href> ou une URL assemblee a
    // la main partent sans prefixe et atterrissent hors du portail : sur
    // l'hote d'une instance, c'est le core beCPG qui repond 404.
    env: {
        NEXT_PUBLIC_PORTAL_BASE_PATH: process.env.PORTAL_BASE_PATH || '',
    },

    // pdf.js must stay a real node_modules package on the server side.
    // `lib/pdfSignatureFields.js` loads the legacy build to read the signature
    // widgets out of a prepared PDF (spec §9.2), and pdf.js sets its "fake
    // worker" up by importing `pdf.worker.mjs` through a path relative to its
    // own module URL. Bundled, that path points inside `.next/` and the import
    // fails with `Setting up fake worker failed`. Externalising it is the
    // supported fix — and it changes nothing for the browser bundle, where the
    // worker is a proper bundled asset.
    serverExternalPackages: ['pdfjs-dist'],

    // ... and the worker file has to BE THERE, which externalising does not
    // guarantee. The tracer copies what it can see imported; pdf.js reaches its
    // worker through a URL computed from its own module URL, so the standalone
    // image shipped `pdf.mjs` alone and every signature document came back
    // `parse-error: Setting up fake worker failed`. Naming the file is the
    // documented way to put it back, and it is needed on the one route that
    // parses a PDF — `/api/v1/documents/[id]/content` imports the same module
    // for `authorizeTaskDocument` and never reads a byte of PDF itself.
    //
    // The key is a glob and not the route id: `[taskId]` would be read as a glob
    // character class, so the literal path matches nothing and the file silently
    // stays behind.
    outputFileTracingIncludes: {
        '/api/v1/signature/**': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
    },

    // --- Security headers -------------------------------------------------
    //
    // Measured on the deployed portal the day it went live: the portal answered with
    // NO security header at all — no framing protection, no MIME sniffing
    // protection, no HSTS. On a public host serving supplier data that is the
    // widest and cheapest gap to close.
    //
    // The four headers below are applied for real: none of them can break a
    // same-origin application, and they close clickjacking, MIME confusion,
    // referrer leakage to third parties and protocol downgrade.
    //
    // The Content-Security-Policy is deliberately sent in **Report-Only** for
    // now. The portal is same-origin by construction — every call goes through
    // its own /api routes, images and fonts are local — so the policy below
    // should hold as-is; but a CSP that breaks one screen in production is worse
    // than no CSP, and nothing here has been exercised against every screen yet.
    // Report-Only collects the violations without blocking; flip the header name
    // to `Content-Security-Policy` once the reports come back empty.
    //
    // `'unsafe-inline'` on styles is not negotiable with Tailwind's injected
    // styles; on scripts it is what Next's inline bootstrap needs short of
    // wiring a nonce through every route.
    async headers() {
        const csp = [
            "default-src 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "object-src 'none'",
            "img-src 'self' data: blob:",
            "font-src 'self' data:",
            "style-src 'self' 'unsafe-inline'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "connect-src 'self'",
            "worker-src 'self' blob:",
        ].join('; ');

        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains',
                    },
                    { key: 'Content-Security-Policy-Report-Only', value: csp },
                ],
            },
        ];
    },

    // NO /api rewrite here, on purpose.
    // Unlike becpg-regulatory-ui, /api/* routes are OUR OWN route handlers
    // (server-side OIDC session + Alfresco proxy). Proxying them to another
    // backend would bypass the session cookie and leak the portal's security model.
};

export default nextConfig;
