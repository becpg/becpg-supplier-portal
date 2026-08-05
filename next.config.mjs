/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    output: 'standalone',
    poweredByHeader: false,

    // pdf.js must stay a real node_modules package on the server side.
    // `lib/pdfSignatureFields.js` loads the legacy build to read the signature
    // widgets out of a prepared PDF (spec §9.2), and pdf.js sets its "fake
    // worker" up by importing `pdf.worker.mjs` through a path relative to its
    // own module URL. Bundled, that path points inside `.next/` and the import
    // fails with `Setting up fake worker failed`. Externalising it is the
    // supported fix — and it changes nothing for the browser bundle, where the
    // worker is a proper bundled asset.
    serverExternalPackages: ['pdfjs-dist'],

    // --- Security headers -------------------------------------------------
    //
    // Measured on portal.becpg.fr the day it went live: the portal answered with
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
