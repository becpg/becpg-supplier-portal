/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    output: 'standalone',
    poweredByHeader: false,

    // NO /api rewrite here, on purpose.
    // Unlike becpg-regulatory-ui, /api/* routes are OUR OWN route handlers
    // (server-side OIDC session + Alfresco proxy). Proxying them to another
    // backend would bypass the session cookie and leak the portal's security model.
};

export default nextConfig;
