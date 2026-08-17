# beCPG Supplier Portal – Open Source Supplier Collaboration for beCPG PLM

[![License: LGPL v3](https://img.shields.io/badge/License-LGPL_v3-blue.svg)](https://www.gnu.org/licenses/lgpl-3.0)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Node](https://img.shields.io/badge/Node-22+-green.svg)](https://nodejs.org/)
[![GitHub issues](https://img.shields.io/github/issues/becpg/becpg-supplier-portal)](https://github.com/becpg/becpg-supplier-portal/issues)
[![Documentation](https://img.shields.io/badge/docs-docs.becpg.fr-brightgreen)](https://docs.becpg.fr)
[![Website](https://img.shields.io/badge/website-becpg.net-blue)](https://www.becpg.net)

---

## 🚀 What is the beCPG Supplier Portal?

The **beCPG Supplier Portal** is the supplier-facing front end of
[**beCPG PLM**](https://github.com/becpg/becpg-community), the open-source PLM platform for the
Food, Beverage and Cosmetics industries.

Suppliers log in with their own account and complete the work a manufacturer needs from them:
onboarding questionnaires, product technical sheets, certificates and audit documents,
electronic signature of agreements. On the other side, quality and purchasing teams get a
monitoring space showing, at a glance, which supplier is compliant and which document is
about to expire.

It is a **single Next.js application**: pages and route handlers in one runtime, no dedicated
Java back end. The portal proxies and composes the webscripts that beCPG PLM already exposes —
the same role Alfresco Share plays with `/share/proxy/alfresco`.

👉 [**Request a Live Demo**](https://www.becpg.net/community/) | [**Contact Us**](https://www.becpg.net/contact-us/)

---

## 🌟 What it does

* **Supplier onboarding** – a guided wizard whose steps, fields and validations come from the
  PLM configuration, not from hard-coded forms; client-specific overrides are honoured.
* **Documents** – upload, renewal and expiry tracking of certificates, insurance policies and
  audit reports, with a per-document validity window.
* **Product technical sheets** – suppliers fill in specifications, composition and claims
  directly against the manufacturer's data model, in their own language.
* **Approval status** – derived on the fly from the repository, never persisted: no data model
  change, no state to keep in sync.
* **Electronic signature** – draw-to-sign agreements, with the signed artefact stored back in
  the PLM.
* **Monitoring space** – supplier park overview, supplier × document-type matrix, campaigns and
  quality indicators, closed to supplier accounts.
* **AI-assisted capture** – optional: extracted values are shown with a confidence level, and a
  missing confidence is never rendered as a low one.

---

## 🏗 Architecture in ten lines

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

---

## 📚 Getting started

### Requirements

* **Node.js 22+** and npm
* A reachable **beCPG PLM** instance (Alfresco repository + Share)
* An **OIDC provider** (Keycloak / Alfresco Identity Service) for real authentication

### Run with Docker

```bash
cp env.example .env      # fill OIDC_CLIENT_SECRET and SESSION_COOKIE_SECRET
docker compose up --build
curl -s http://localhost:3000/api/health     # {"status":"ok","version":"..."}
```

### Run from source

```bash
npm install
npm run dev              # http://localhost:3000, reads ./.env
```

Point `BECPG_URL` at your repository and `BECPG_SHARE_URL` at your Share instance. Both must be
set explicitly: Next.js loads `.env` **in addition to** any environment file you source, so a
half-configured environment silently mixes the data of one instance with the configuration of
another — and renders a wizard with zero fields, with nothing in the logs.

Without an OIDC provider, set `DEV_FAKE_AUTH=true` to authenticate straight against the
repository with `BECPG_DEV_USER` / `BECPG_DEV_PASSWORD`. It writes exactly the same encrypted
session cookie, and **refuses to run when `NODE_ENV=production`**.

### Other commands

```bash
npm run build            # standalone output, used by the Docker image
npm start
npm run lint             # eslint .
npm run licenses         # regenerate THIRD-PARTY-LICENSES.md from node_modules
```

---

## ⚙️ Configuration

Every environment variable is documented in [`env.example`](./env.example) — without exception,
that is a project rule.

| Group | Variables |
|---|---|
| OIDC | `OIDC_ISSUER_BASE`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `PORTAL_BASE_URL`, `OIDC_SCOPES`, `OIDC_CLOCK_TOLERANCE`, `OIDC_ISSUER`, `OIDC_REALM` |
| Session | `SESSION_COOKIE_SECRET`, `SESSION_COOKIE_NAME`, `SESSION_TTL`, `SESSION_COOKIE_SECURE` |
| Multitenant | `DEFAULT_TENANT`, `TENANT_MAP`, `TENANT_HOST_SUFFIX`, `BECPG_INSTANCE` |
| beCPG | `BECPG_URL`, `BECPG_TIMEOUT`, `BECPG_TICKET_TTL` |
| Share (wizard configuration) | `BECPG_SHARE_URL`, `BECPG_SHARE_WIZARD_ENDPOINT` |
| Portal | `PORTAL_TEST_MODE`, `PORTAL_DEFAULT_LANG`, `PORTAL_EXPIRY_NOTICE_DAYS`, `PORTAL_APPROVAL_CACHE_TTL`, `PORTAL_DEBUG` |
| Build | `PORTAL_VERSION` (stamped by the image, served by `/api/health`) |
| Development only | `DEV_FAKE_AUTH`, `BECPG_DEV_USER`, `BECPG_DEV_PASSWORD`, `BECPG_TICKET`, `BECPG_TICKET_MODE` |

**No secret is ever exposed to the browser**: there is no `NEXT_PUBLIC_*` variable at all, by
design, and no OIDC configuration on the client side.

---

## 📁 Repository layout

```
app/                      App Router
  layout.js               root layout (font, language cookie, providers)
  error.js                render boundary — retry + digest, never the message
  globals.css             Tailwind 4, utilities, :focus-visible baseline
  page.js                 supplier dashboard
  login/ company/ documents/ messages/ products/[id]/ specs/ tasks/[id]/ help/
  monitor/                monitoring space — layout.js holds the access gate
  share/page/wizard/      entry point from Share
  api/                    THE proxy — route handlers
    health/route.js       { status, version } — Docker HEALTHCHECK and k8s probes
    auth/                 login, callback, logout, session (OIDC code flow)
    v1/                   internal API, incl. monitor/*
components/               React components (Tailwind only, no UI kit)
  ui/ shell/ form/ datalist/ wizard/ monitor/ documents/ dashboard/ signature/
lib/                      session, beCPG proxy, errors, tenant
  adapters/               one adapter per business domain
config/                   chrome messages, default wizards
doc/                      becpg-api-contracts.md
proxy.js                  nothing is reachable without a session; resolves the tenant
```

The webscripts the portal consumes, and the traps they hide:
[`doc/becpg-api-contracts.md`](./doc/becpg-api-contracts.md).

---

## 🔐 Security model in three rules

* The OIDC token and the Alfresco ticket **never** reach the browser, and never appear in a URL.
* A client component **never** imports the beCPG or session modules; client code talks to the
  API and nothing else.
* Everything coming from the browser is untrusted and validated at the boundary, a `nodeRef`
  included.

Found a vulnerability? See [SECURITY.md](SECURITY.md) — please do not open a public issue.

---

## 🤝 Community & contributing

Contributions are welcome. Before touching a file, read [`AGENTS.md`](./AGENTS.md): it carries
the non-negotiable rules of this codebase (JavaScript only, no UI kit, no i18n library,
server-side authentication, accessibility baseline) and the conventions we review against.

* [Contributing Guidelines](CONTRIBUTING.md)
* [Code of Conduct](CODE_OF_CONDUCT.md)
* [Security Policy](SECURITY.md)

---

## 📄 License

Licensed under the **GNU Lesser General Public License v3.0 or later** — see [LICENSE](LICENSE)
and [NOTICE](NOTICE). Third-party dependencies are listed in
[THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md).

---

## 📩 Contact

* 🌐 [Website](https://www.becpg.net)
* 📖 [Documentation](https://docs.becpg.fr)
* 🎮 [Live Demo](https://www.becpg.net/community/)
* ✉️ [Contact Us](https://www.becpg.net/contact-us/)

---

⚡ **beCPG – Accelerate innovation, stay compliant, and reduce PLM costs for CPG companies.**
