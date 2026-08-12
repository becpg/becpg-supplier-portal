# AGENTS.md — beCPG Supplier Portal V2

Instructions for any AI agent working in this repository. Read this before touching a file.
`spec.md` is the authoritative specification; this file is only the short form of the rules.
Current state, known defects and remaining gaps: `doc/implementation-status.md`.

## Read this first

**This repository IS under version control** — `main`, pushed to Google Source. That was not
always true, and this paragraph said the opposite until 2026-08-06; if you find advice
elsewhere that assumes no `.git`, it is stale.

- commit your work: `git diff`, revert and branch all behave normally;
- **other agents may be editing the same files at the same time.** If a file changes under
  you mid-task, do not fight for it: finish what you own, and report the conflict instead of
  overwriting someone's in-flight work.

## Hard rules (non negotiable)

1. **JavaScript only.** No TypeScript. No `.ts` / `.tsx` file anywhere, ever — including
   config files and scripts.
2. **Stack is fixed**: Next.js 16 (App Router), React 18, Tailwind CSS 4, framer-motion,
   `output: 'standalone'`. Do not introduce another router, another CSS framework or another
   state library.
3. **No shadcn/ui, no Radix**, no headless UI kit. Tailwind + the portal's own components only,
   aligned on `becpg-regulatory-ui`.
4. **No i18n library.** Business labels (fields, lists, catalogs, questionnaires) come from
   beCPG in the user's locale. Only the portal's own chrome strings live in `config/messages.js`
   (`fr`, `en`).
5. **Authentication is server side only.** OIDC code flow in route handlers, session encrypted
   as a JWE in an httpOnly cookie (`jose`). The OIDC token and the Alfresco ticket must **never**
   reach the browser. No `keycloak-js`, no `NEXT_PUBLIC_*` OIDC config, no token in
   `localStorage`.
6. **The portal is a proxy** — the same role as Share's `/share/proxy/alfresco`. Alfresco is
   never exposed to the browser; every call goes through `app/api/*`.
   **And the portal talks to beCPG only.** Not to Saiku, not to becpg-ai: those are reached
   through repository webscripts (`becpg/olap/chart`, `becpg/ai/*`) that hold their address and
   build their credential. A companion service's URL, credential — or worse, the *format* of
   that credential — must never live here. The portal held four `BECPG_AI_*` variables and a
   JavaScript copy of `BeCPGTicketService.getCurrentAuthToken()`; both are gone.
   `becpg/olap/` and `becpg/ai/` are deliberately absent from `ALLOWED_BECPG_PATH_PREFIXES`,
   so the browser-facing proxy refuses them and only server-side adapters get in.
7. **A client component never imports `@/lib/becpg` nor `@/lib/session`.** Client code talks
   to the API through `@/lib/client` and nothing else. This is currently true with zero
   exceptions — keep it that way; it is the line that keeps tickets server-side.
8. **beCPG changes are additive and default-off.** The original rule was "do not modify
   beCPG at all"; it no longer holds — B2/B3/B6 were implemented in `../becpg` (13 files, on
   branch `feature/supplier-portal-v2`; **check the branch before building, it has been
   switched mid-session**). The rule that replaces it is stricter in spirit: a need is solved by
   *composing existing webscripts* in the proxy (rule R1), business logic stays in beCPG and
   does not migrate into the portal (rule R2), and **any** repository change must be opt-in
   behind a property that ships disabled, so an existing instance serves byte-identical
   responses until an administrator flips it. See spec §5.1.1 and §7.2.
9. **Multitenant**: one Keycloak realm per tenant; the JWT must carry `becpg_url` and
   `becpg_instance`. A missing claim is a **401**, never a fallback to a default tenant.
10. **`legacy/` is archived.** Read it for reference if you must, never modify it, never import
    from it, and it is excluded from lint and from the Docker build context.
11. **No summary Markdown files.** Do not generate implementation summaries, recaps or change
    logs unless the user explicitly asks. Answer in the conversation, write code in the repo.
    (`README.md`, `AGENTS.md`, `doc/*` are maintained documents, not summaries.)

## Non-negotiable UX rules

These are audited; regressions get caught. Details in `doc/implementation-status.md`.

- **Responsive down to 360 px.** One-handed use on a phone: primary navigation is a bottom
  bar inside the safe area, never a top-left hamburger.
- **No bare white page and no raw stack trace, ever.** Every screen has a `loading`, `empty`
  and `error` state with a retry. `app/error.js` / `app/global-error.js` / `app/not-found.js`
  are the net under that: they render a `digest` for support and **never the error message**,
  which can carry a nodeRef or a webscript URL.
- **Status is never conveyed by colour alone.** Everything goes through `StatusPill`, which
  resolves any status to the triple **(tone, icon, label)** — readable in greyscale, for a
  colour-blind user and for a screen reader. Add new statuses to its vocabulary, not beside it.
- **Every interactive element is keyboard reachable with a visible focus ring.** Use real
  `<button>` / `<a>` / `<input>`, never a `<div onClick>` (there are currently zero).
  `app/globals.css` declares a `:focus-visible` **outline** baseline; a component that sets
  `focus:outline-none` must draw its own ring (`Button` and `IconButton` do). The baseline is
  an outline and not a `box-shadow` ring precisely so the two never stack.
- **The TEST banner cannot be dismissed.** `TestBanner` has no close button and no state, on
  purpose. Do not add one.
- **An absent AI confidence is never rendered as a low confidence.** `confidenceBucket()`
  (server) and `confidenceLevelOf()` (client) must stay in agreement and both return `null`
  for `null`, `undefined`, `''`, a blank string, a non-numeric value and `NaN`. A plugin that
  returns no score must not make every extracted field look untrustworthy.
- **Rendering is driven by server-supplied definitions, never by a hard-coded field or column
  list.** Columns and fields come from Share's cascade (`formId + entityType + siteId + list`),
  which is what carries client overrides. The one dictionary in `components/` —
  `ProductHeader.entityTypeLabel` — is a *display-label fallback* that beCPG's `typeLabel`
  always overrides, and it branches nothing.
- **`/monitor` is closed to supplier accounts.** `requireMonitorAccess()` is the single gate,
  called by every exported function of `lib/adapters/monitor.js` (so no route can forget it)
  and by `app/monitor/layout.js` (so no page paints a wall of red errors). An `ExternalUser`
  is refused **first and unconditionally**, before the group test. Never re-implement the
  check — call it.

## Folder layout

```
app/                      App Router
  layout.js               root layout (Roboto, lang cookie, providers)
  error.js                render boundary — retry + digest, never the message
  global-error.js         root-layout error — its own <html>, inline styles
  not-found.js            404
  globals.css             Tailwind 4 (@import + @theme inline), utilities, focus baseline
  page.js                 supplier dashboard
  login/ company/ documents/ messages/ products/[id]/ specs/ tasks/[id]/ help/
  monitor/                monitoring space — layout.js holds THE access gate
    page.js suppliers/[id]/ documents/ campaigns/ quality/
  share/page/wizard/      entry point from Share
  api/                    THE proxy — 46 route handlers
    health/route.js       { status, version } — Docker HEALTHCHECK and k8s probes
    auth/                 login, callback, logout, session
    v1/                   internal API, incl. monitor/*
components/               107 components — ui/ shell/ form/ datalist/ wizard/ monitor/
                          documents/ dashboard/ signature/ products/ specs/ providers/
lib/                      21 modules; adapters/ holds the 12 domain adapters
config/                   chrome messages, default wizards
doc/                      implementation-status.md, becpg-api-contracts.md
e2e/                      Playwright — fixtures/, tests/; report/ and results/ are generated
legacy/                   archived V1 portal — read only
proxy.js                  nothing is reachable without a session; resolves the tenant
spec.md                   authoritative specification
```

Packaging: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `deployment.yml`,
`cloudbuild.delivery.yaml`, `release.sh` — a **single** Next.js standalone image, no Java
backend (spec §5.1.1, §5.5).

## Conventions

- Mirror `becpg-regulatory-ui`: 4-space indent, named exports, semicolons,
  double quotes in JSX attributes / single quotes in JS.
- Design tokens live in `app/globals.css` and must match regulatory:
  `--becpg-blue: #004254`, `--becpg-green: #00ffbd`, `--becpg-grey: #e4ecee`,
  `--becpg-orange: #ff642d`, `--becpg-darkGrey: #747474`. Font: Roboto via `next/font/google`.
- Shared contracts other modules rely on: `LANG_COOKIE = 'becpg_portal_lang'`,
  `SESSION_COOKIE_NAME = 'becpg_portal_session'`, env `SESSION_COOKIE_SECRET`, env `TENANT_MAP`,
  CSS classes `.pill-{ok,warn,danger,neutral,info}`, `.test-banner`, `.skeleton`.
- **Every environment variable must be documented in `env.example`.** No exception; three had
  drifted and were added back. No secret in `NEXT_PUBLIC_*` — there is no `NEXT_PUBLIC_*`
  variable at all, by design.
- Write complete, working code. No `TODO` stub for something you were asked to implement.
- When the repository cannot answer a question honestly, **degrade explicitly** rather than
  fabricate: `history: { available: false }`, `filters.unsupported`, `pagination.truncated`,
  `sortScope: 'window'`. Never invent a series, a date or a count.

## How to run

Against the **local** instance — a `.env` is already committed for it, and
`../becpg/run.sh` must be up (Alfresco `:8080`, Share `:8180`, `admin`/`becpg`):

```bash
npm install
npm run dev        # http://localhost:3000, reads ./.env (DEV_FAKE_AUTH, no OIDC needed)
```

Against **dev.becpg.fr**, supplier perspective (`.env.supplier`, gitignored, holds a real
password — do not commit it or copy its credentials):

```bash
set -a && . .env.supplier && set +a && npx next dev --port 3100
```

`BECPG_SHARE_URL` **must be set explicitly** in any env file aimed at dev: Next.js loads
`.env` *in addition to* the custom loaded environment, so the local `.env` would otherwise point Share at
`localhost:8180`, and the portal would take its data from dev and its configuration from
localhost — rendering ten wizard steps with zero fields, silently, with nothing in the logs.

```bash
npm run build      # standalone output — green, 57 routes
npm start
npm run lint       # eslint .
npx playwright test --config e2e/playwright.config.js    # needs local instance + portal up
```

Docker:

```bash
docker build -t becpg-supplier-portal:latest --build-arg PORTAL_VERSION=0.0.1 .
cp env.example .env && docker compose up --build     # http://localhost:3000
curl -s http://localhost:3000/api/health             # {"status":"ok","version":"..."}
```

Release: `./release.sh` (must run from `main`, clean tree) tags the current
`_VERSION` of `cloudbuild.delivery.yaml`, appends to `CHANGELOG.md`, then bumps the version.
It pushes the branch and the tag, so it needs valid `gcloud` credentials — when they expire the
tag is created locally and only the push fails.

Fast deploy: `./deploy-fast.sh --yes` builds the image from the working tree, pushes it under
`<_VERSION>-<sha>` and rolls the Deployment over — no tag, no CHANGELOG, no version bump.
**It deploys to production**: the only `becpg-supplier-portal` Deployment lives on cluster
`becpg-front` (zone `europe-west9-a`) and serves `portal.becpg.fr`. There is no staging portal,
which is why `--yes` is mandatory; the tag is stamped into `/api/health` so an unreleased image
is recognisable from outside. `latest` is never retagged — that one belongs to Cloud Build.

## Git commits

One line, English, format `[Optional: InProgress/Fix #ticket] - [Type] Description` with type in
`[Feature] [Bug] [Setup] [Cleanup] [Migration] [Security] [Merge]`.
Never add a `Co-Authored-By` line nor any "Generated with" footer.
