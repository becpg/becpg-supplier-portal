# Developer guide

How to run, configure and find your way around the beCPG Supplier Portal. For what the portal does, see the [README](../README.md).

## Running the portal

You need Node.js 22 or later, a reachable beCPG PLM (repository and Share) and, for real authentication, an OIDC provider such as Keycloak.

With Docker:

```bash
cp env.example .env      # fill OIDC_CLIENT_SECRET and SESSION_COOKIE_SECRET
docker compose up --build
curl -s http://localhost:3000/api/health     # {"status":"ok","version":"..."}
```

From source:

```bash
npm install
npm run dev              # http://localhost:3000, reads ./.env
```

Point `BECPG_URL` at your repository and `BECPG_SHARE_URL` at your Share instance, and set both explicitly. Next.js loads `.env` on top of any environment file you source, so a half-configured environment mixes the data of one instance with the configuration of another, and the wizard shows no fields with nothing in the logs.

Without an OIDC provider, set `DEV_FAKE_AUTH=true` to sign in straight against the repository with `BECPG_DEV_USER` and `BECPG_DEV_PASSWORD`. It writes the same encrypted session cookie, and refuses to run when `NODE_ENV=production`.

No beCPG instance yet? [beCPG starter](https://github.com/becpg/becpg-starter) runs beCPG Community on your machine in one command.

Other commands:

```bash
npm run build            # standalone output, used by the Docker image
npm start
npm run lint
npm run licenses         # regenerate THIRD-PARTY-LICENSES.md from node_modules
```

## Configuration

Every environment variable is documented in [`env.example`](../env.example).

| Group | Variables |
| --- | --- |
| OIDC | `OIDC_ISSUER_TEMPLATE`, `OIDC_ISSUER_HOSTS`, `OIDC_ISSUER_BASE`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `PORTAL_BASE_URL`, `OIDC_SCOPES`, `OIDC_CLOCK_TOLERANCE`, `OIDC_ISSUER`, `OIDC_REALM` |
| Session | `SESSION_COOKIE_SECRET`, `SESSION_COOKIE_NAME`, `SESSION_TTL`, `SESSION_COOKIE_SECURE` |
| Multitenant | `DEFAULT_TENANT`, `TENANT_MAP`, `TENANT_HOST_SUFFIX`, `BECPG_INSTANCE` |
| beCPG | `BECPG_URL`, `BECPG_TIMEOUT`, `BECPG_TICKET_TTL` |
| Share (wizard configuration) | `BECPG_SHARE_URL`, `BECPG_SHARE_WIZARD_ENDPOINT` |
| Portal | `PORTAL_TEST_MODE`, `PORTAL_DEFAULT_LANG`, `PORTAL_EXPIRY_NOTICE_DAYS`, `PORTAL_APPROVAL_CACHE_TTL`, `PORTAL_DEBUG` |
| Build | `PORTAL_VERSION` (stamped by the image, served by `/api/health`), `PORTAL_BASE_PATH` (path prefix, applied as `basePath`) |
| Development only | `DEV_FAKE_AUTH`, `BECPG_DEV_USER`, `BECPG_DEV_PASSWORD`, `BECPG_TICKET`, `BECPG_TICKET_MODE` |

No secret ever reaches the browser: the only `NEXT_PUBLIC_*` value is the path prefix `NEXT_PUBLIC_PORTAL_BASE_PATH`, and there is no OIDC configuration on the client side.

## Architecture and security

The portal is a single Next.js application: pages and route handlers in one runtime, with no dedicated back end. It proxies and composes the webscripts beCPG PLM already exposes, the way Alfresco Share does with `/share/proxy/alfresco`, and the Alfresco ticket never leaves the server.

* [`doc/architecture.md`](./architecture.md): how it is built, why authentication stays on the server, and the rules that keep a ticket out of the browser.
* [`doc/becpg-api-contracts.md`](./becpg-api-contracts.md): the webscripts the portal consumes, and their traps.

<details>
<summary><b>Repository layout</b></summary>

```
app/                      App Router
  layout.js               root layout (font, language cookie, providers)
  error.js                render boundary: retry and digest, never the message
  globals.css             Tailwind 4, utilities, :focus-visible baseline
  (home)/page.js          supplier dashboard
  login/ company/ documents/ messages/ products/[id]/ specs/ tasks/[id]/ help/
  monitor/                monitoring space; layout.js holds the access gate
  share/page/wizard/      entry point from Share
  api/                    the proxy: route handlers
    health/route.js       { status, version } for the Docker HEALTHCHECK and k8s probes
    auth/                 login, callback, logout, session (OIDC code flow)
    v1/                   internal API, including monitor/*
components/               React components (Tailwind only, no UI kit)
  ui/ shell/ form/ datalist/ wizard/ monitor/ documents/ dashboard/ signature/
  products/ specs/ providers/ review/ survey/ tasks/
lib/                      session, beCPG proxy, errors, tenant
  adapters/               one adapter per business domain
config/                   chrome messages and locales/, default wizards
doc/                      architecture.md, becpg-api-contracts.md, developer-guide.md, images/
proxy.js                  nothing is reachable without a session; resolves the tenant
```

</details>

## Mobile and accessibility

The portal works down to 360 px wide, with the main navigation in a bottom bar inside the safe area. Accessibility is reviewed with every change:

* a status is never shown by colour alone; it always resolves to a tone, an icon and a label, readable in greyscale and by a screen reader;
* every interactive element is a real `<button>`, `<a>` or `<input>`, reachable from the keyboard, with a visible focus ring;
* every screen has a loading, an empty and an error state with a retry, never a blank page or a stack trace.

The full set of rules the code is reviewed against is in [`AGENTS.md`](../AGENTS.md).
