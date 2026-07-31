# beCPG Supplier Portal V2

Portail fournisseur beCPG : référencement, saisie assistée (wizard), dépôt et renouvellement
des documents, statut d'agrément, et espace de pilotage du parc fournisseurs côté client.

Application **Next.js unique** (pages + route handlers), alignée sur `becpg-regulatory-ui`.
**JavaScript, pas TypeScript.** Pas de backend Java dédié : le portail proxifie et compose
les webscripts beCPG existants.

État d'avancement, défauts connus et trous restants : **[`doc/implementation-status.md`](./doc/implementation-status.md)**.
La spécification fait foi : [`spec.md`](./spec.md).

---

## Démarrage rapide — contre l'instance LOCALE

Un `.env` **est déjà commité** pour ça. Il suppose l'instance beCPG lancée par
`../becpg/run.sh` (compose `becpg_26_1_0`) :

| Service | URL | Compte |
|---|---|---|
| Alfresco | `http://localhost:8080` | `admin` / `becpg` |
| Share | `http://localhost:8180` | `admin` / `becpg` |

```bash
npm install
npm run dev          # http://localhost:3000 — lit ./.env automatiquement
```

C'est tout : ni secret à renseigner, ni client OIDC à déclarer.

**Pourquoi ça marche sans OIDC** : le compose local n'embarque **pas** d'IDS, donc le code
flow de la spec §5.3 ne peut pas s'y dérouler. `.env` active `DEV_FAKE_AUTH=true`, la porte
de sortie documentée : `GET /api/auth/login` saute Keycloak, s'authentifie directement sur
Alfresco avec `BECPG_DEV_USER` / `BECPG_DEV_PASSWORD`, et écrit **exactement le même cookie
de session chiffré** — même forme, même chemin de proxy, seul `authMode: "dev"` diffère. Le
handler **refuse de tourner si `NODE_ENV=production`**, quel que soit le drapeau.

`.env` active aussi `PORTAL_TEST_MODE=true` : le bandeau TEST est visible et
**non masquable** (spec §4.3). C'est voulu — un fournisseur qui remplit un questionnaire sur
une instance de test doit le savoir sur chaque écran.

### Ce que l'instance locale apporte en plus

`BECPG_SHARE_WIZARD_ENDPOINT` y est renseigné, donc le wizard tourne en **mode primaire** :
un seul appel à `GET /share/service/becpg/portal/wizard` rend le wizard, ses étapes **et les
définitions de formulaire résolues** par la cascade beCPG (`formId + entityType + siteId +
list`) — c'est-à-dire avec les surcharges client. Ce webscript n'existe que sur la branche de
travail de `../becpg` ; ailleurs, l'adaptateur retombe sur `config/wizards.default.js`.

---

## Démarrage — contre `dev.becpg.fr`

Un `.env.supplier` existe pour la **perspective fournisseur** sur dev, avec un vrai compte
(`supplier-test@becpg.fr`). Il est **gitignoré** (`.env.*` sauf `env.example`) parce qu'il
contient un mot de passe : ne le commitez pas, et ne recopiez pas ses identifiants ailleurs.

```bash
set -a && . .env.supplier && set +a && npx next dev --port 3100
```

Pourquoi dev et pas le local pour ce cas : le compte fournisseur et les vrais projets de
référencement vivent sur dev. En local le compte **peut** être créé
(`becpg/supplier/create-supplier`), mais son mot de passe est généré et ne peut pas être
réinitialisé sans IDS — donc aucune session fournisseur n'y est ouvrable.

> **Dev est partagé : lecture surtout.** Le parcours ouvre la tâche, charge le wizard et lit
> les définitions résolues. Il ne complète **pas** de tâche, ne signe pas, ne soumet pas de
> formulaire. Un environnement partagé n'est pas une fixture.

### Le piège qui coûte une demi-journée

`BECPG_SHARE_URL` **doit être posé explicitement** dans tout fichier d'environnement visant
dev, même si dev sert `/alfresco` et `/share` sur le même hôte. Raison : **Next.js charge
`.env` en plus du fichier chargé**, et `.env` pointe Share sur `localhost:8180`. Laissé de
côté, le portail prend ses **données sur dev** et sa **configuration sur le Share local** :
il résout un wizard dont il n'a jamais vu les nodeRefs et rend **dix étapes à zéro champ**,
sans une ligne dans les logs. `.env.supplier` le pose déjà.

Sur dev, le webscript wizard n'est **pas** déployé : laissez
`BECPG_SHARE_WIZARD_ENDPOINT` non défini pour sélectionner le mode de repli.

---

## Autres commandes

```bash
npm run build     # sortie `standalone` (pour l'image Docker) — vert, 57 routes
npm start
npm run lint      # = eslint .
```

Tests de bout en bout (Playwright nu, pas le harnais Stagehand+Gemini de
`becpg-boxes/recette` : le DOM React du portail est stable, donc des locators déterministes
sont possibles **et** préférables — et le test juge le succès, jamais un modèle) :

```bash
npx playwright test --config e2e/playwright.config.js
```

Prérequis : l'instance locale **et** le portail (`http://localhost:3000`) tournent. La suite
s'exécute **en série** : elle travaille sur une instance partagée et écrit de vraies données.
Ses artefacts (`e2e/report/`, `e2e/results/`) sont gitignorés et exclus du lint.

Docker :

```bash
docker build -t becpg-supplier-portal:latest --build-arg PORTAL_VERSION=0.0.1 .
cp env.example .env && docker compose up --build     # http://localhost:3000
curl -s http://localhost:3000/api/health             # {"status":"ok","version":"..."}
```

---

## Variables d'environnement

Toutes documentées dans [`env.example`](./env.example) — sans exception, c'est une règle
du projet.

| Groupe | Variables |
|---|---|
| OIDC (IDS / Keycloak) | `OIDC_ISSUER_BASE`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `PORTAL_BASE_URL`, `OIDC_SCOPES`, `OIDC_CLOCK_TOLERANCE`, `OIDC_ISSUER`, `OIDC_REALM` |
| Session | `SESSION_COOKIE_SECRET` (alias `SESSION_SECRET`), `SESSION_COOKIE_NAME`, `SESSION_TTL`, `SESSION_COOKIE_SECURE` |
| Multitenant | `DEFAULT_TENANT`, `TENANT_MAP` (alias `BECPG_TENANTS`), `TENANT_HOST_SUFFIX`, `BECPG_INSTANCE` |
| beCPG | `BECPG_URL`, `BECPG_TIMEOUT`, `BECPG_TICKET_TTL` |
| Share (config du wizard) | `BECPG_SHARE_URL`, `BECPG_SHARE_WIZARD_ENDPOINT` |
| becpg-ai | `BECPG_AI_URL`, `BECPG_AI_API_KEY`, `BECPG_AI_ENABLED` |
| Portail | `PORTAL_TEST_MODE`, `PORTAL_DEFAULT_LANG`, `PORTAL_EXPIRY_NOTICE_DAYS`, `PORTAL_APPROVAL_CACHE_TTL`, `PORTAL_DEBUG` |
| Build | `PORTAL_VERSION` (posée par le Dockerfile / Cloud Build, servie par `/api/health`) |
| Développement seulement | `DEV_FAKE_AUTH`, `BECPG_DEV_USER`, `BECPG_DEV_PASSWORD`, `BECPG_TICKET`, `BECPG_TICKET_MODE` |

Aucun secret n'est exposé en `NEXT_PUBLIC_*` : **il n'existe aucune variable `NEXT_PUBLIC_*`**,
par conception. Il n'y a pas de configuration OIDC côté navigateur.

---

## Architecture en 10 lignes

1. Une seule application Next.js 16 (App Router), React 18, Tailwind 4, framer-motion, `output: 'standalone'`.
2. L'authentification est **entièrement serveur** : code flow OIDC dans des route handlers, jamais `keycloak-js`.
3. La session (token OIDC + ticket Alfresco) est chiffrée en JWE dans un cookie `httpOnly` — clusterisable sans sticky session.
4. Ni le token ni le ticket n'atteignent le navigateur : le portail est un **proxy**, comme `/share/proxy/alfresco`.
5. Multitenant : 1 realm Keycloak par tenant ; claims obligatoires `becpg_url` + `becpg_instance` ; claim absent → 401.
6. Tenant résolu par sous-domaine, puis `/t/<tenant>/…` (réécrit par le proxy, il n'y a **pas** de `app/t/[tenant]/`), puis sélecteur sur `/login`.
7. API interne sous `/api/v1` : **proxy** de webscripts existants ou **composition** dans le route handler.
8. Côté beCPG, le portail n'ajoute qu'un webscript Share (vue `.get.json.ftl` du wizard) ; trois évolutions additives (B2/B3/B6) l'accompagnent, **toutes désactivées par défaut**.
9. Le statut d'agrément est **dérivé à la volée** (requêtes db-afts), jamais persisté : aucune évolution du modèle de données.
10. Pas de couche i18n : les libellés métier viennent de beCPG ; seul le chrome du portail vit dans `config/messages.js`.

Le détail fait foi dans [`spec.md`](./spec.md) — architecture §5, sécurité §6, écrans §4,
contrat d'API §5.4, multitenant §5.3, roadmap §8.

---

## Structure

```
app/                      App Router
  layout.js               root layout (Roboto, cookie de langue, providers)
  error.js                boundary de rendu — retry + digest, jamais le message
  global-error.js         erreur du root layout — son propre <html>, styles inline
  not-found.js            404
  globals.css             Tailwind 4 + utilitaires + baseline :focus-visible
  page.js                 tableau de bord fournisseur
  login/ company/ documents/ messages/ products/[id]/ specs/ tasks/[id]/ help/
  monitor/                espace pilotage — layout.js porte LA porte d'accès
    page.js               vue d'ensemble du parc (§4.6.1)
    suppliers/[id]/       liste + fiche fournisseur (§4.6.2, §4.6.4)
    documents/            matrice fournisseur × type de document (§4.6.3)
    campaigns/ quality/
  share/page/wizard/      point d'entrée depuis Share
  api/                    LE proxy — 38 route handlers
    health/route.js       { status, version } — HEALTHCHECK Docker et sondes k8s
    auth/                 login, callback, logout, session (code flow OIDC)
    v1/                   API interne : tasks, wizard, documents, entities,
                          approval, suggestions, signature, monitor/*, …
components/               86 composants React (Tailwind seul, ni shadcn/ui ni Radix)
  ui/ shell/ form/ datalist/ wizard/ monitor/ documents/ dashboard/ signature/
lib/                      21 modules : session, proxy beCPG, erreurs, tenant,
  adapters/               12 adaptateurs (1 par domaine métier)
config/                   messages du chrome, wizards par défaut
doc/                      implementation-status.md, becpg-api-contracts.md
e2e/                      Playwright — fixtures/, tests/ (report/ et results/ générés)
legacy/                   archives V1 — **lecture seule, ne rien importer**
proxy.js                  rien n'est joignable sans session ; résout le tenant
```

Packaging : `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `deployment.yml`,
`cloudbuild.delivery.yaml`, `release.sh` — une **seule** image Next.js standalone, sans
backend Java (spec §5.1.1, §5.5).

---

## Deux avertissements avant de contribuer

1. **Ce dépôt n'est pas sous git.** Il n'y a aucun `.git` dans `becpg-supplier-portal/` ni
   au-dessus. Rien n'est commité et rien n'est récupérable après un écrasement. À régler
   avant toute autre chose.
2. Les règles non négociables (JavaScript seul, pas de Radix/shadcn, pas de lib i18n, auth
   serveur uniquement, un composant client n'importe **jamais** `@/lib/becpg` ni
   `@/lib/session`) sont dans [`AGENTS.md`](./AGENTS.md). Lisez-le avant de toucher un fichier.
