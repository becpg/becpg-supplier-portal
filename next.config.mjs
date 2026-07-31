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

    // NO /api rewrite here, on purpose.
    // Unlike becpg-regulatory-ui, /api/* routes are OUR OWN route handlers
    // (server-side OIDC session + Alfresco proxy). Proxying them to another
    // backend would bypass the session cookie and leak the portal's security model.
};

export default nextConfig;
