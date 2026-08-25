# Architecture and security model

How the portal is built, and the rules that keep a supplier's credentials — and your
repository's — where they belong. The webscripts it consumes are documented in
[`becpg-api-contracts.md`](./becpg-api-contracts.md).

## Architecture in ten lines

1. One Next.js 16 application (App Router), React 18, Tailwind CSS 4, framer-motion,
   `output: 'standalone'` — **JavaScript only, no TypeScript**.
2. Authentication is **server side only**: OIDC authorization-code flow inside route handlers,
   never `keycloak-js`.
3. The session — OIDC token plus Alfresco ticket — is encrypted as a JWE in an `httpOnly`
   cookie, so any instance can serve any request without sticky sessions.
4. Neither the token nor the ticket ever reaches the browser: the portal is a **proxy**.
5. Multitenant: one Keycloak realm per tenant, with mandatory `becpg_url` and `becpg_instance`
   claims. A missing claim is a 401, never a fallback to a default tenant.
6. The tenant is resolved by subdomain, then by a `/t/<tenant>/…` prefix, then by a selector on
   the login screen.
7. The internal API lives under `/api/v1`: either a proxy of an existing webscript, or a
   composition of several of them in the route handler.
8. On the beCPG side the portal adds a single Share webscript; the accompanying repository
   changes are additive and **ship disabled by default**.
9. Rendering is driven by server-supplied definitions — columns and fields come from the PLM
   cascade, never from a hard-coded list.
10. No i18n library: business labels come from beCPG in the user's locale, and only the
    portal's own chrome strings live in `config/messages.js`.

## Security model in three rules

* The OIDC token and the Alfresco ticket **never** reach the browser, and never appear in a URL.
* A client component **never** imports the beCPG or session modules; client code talks to the
  API and nothing else.
* Everything coming from the browser is untrusted and validated at the boundary, a `nodeRef`
  included.

Found a vulnerability? See [SECURITY.md](../SECURITY.md) — please do not open a public issue.
