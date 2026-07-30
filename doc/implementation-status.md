# État d'implémentation — Portail Fournisseur V2

> Arrêté au **2026-07-30, 15 h 30**. Document de passation : il vaut par son honnêteté, pas
> par son optimisme. **« Partiel » dit toujours ce qui manque**, en une ligne.
>
> ⚠️ Deux réserves sur ce document lui-même :
>
> 1. **Le portail n'est pas sous gestion de version.** Il n'y a aucun `.git` dans
>    `becpg-supplier-portal/` ni au-dessus. Rien de ce qui est décrit ici n'est commité,
>    donc rien n'est récupérable en cas d'écrasement. **C'est le premier risque du projet**,
>    avant toute dette fonctionnelle.
> 2. Le dépôt a été écrit par **plusieurs agents en parallèle**, dont certains encore en
>    vol au moment de la rédaction (`app/help/`, `components/shell/NotificationBell.js`,
>    la suite `e2e/`). Les lignes qui les concernent sont datées et signalées comme
>    instables.

## Vue d'ensemble

| Élément | État |
|---|---|
| Application | Next.js 16.2.12 (App Router), React 18, Tailwind 4, JavaScript |
| `npx next build` | ✅ **vert**, 57 routes (18 pages + 38 route handlers + `/_not-found`) |
| `npx eslint .` | ✅ **0 erreur**, 1 avertissement assumé (voir §Lint) |
| Fichiers | 18 pages, 38 route handlers, 86 composants, 21 modules `lib/` |
| Gestion de version | ❌ **aucune** — pas de dépôt git |
| beCPG (`../becpg`) | branche **`feature/supplier-portal-v2`**, **13 fichiers modifiés + 1 répertoire non suivi** (tous attribuables à ce projet) |

## Par section de la spec

| Spec | Sujet | État | Ce qui manque |
|---|---|---|---|
| §5.1 | Tout en Next.js, proxy par route handlers | ✅ | — |
| §5.3 | Multitenant, SSO IDS serveur, session JWE | 🟡 | testé contre un Keycloak simulé et via `DEV_FAKE_AUTH` ; **jamais contre l'IDS réel**. Le code flow OIDC n'a donc jamais tourné. |
| §5.4 | 38 route handlers + 12 adaptateurs | ✅ | — |
| §5.4.1 | Webscript Share du wizard | ✅ testé sur instance 26.1.0 | déployé **uniquement** sur la branche locale de beCPG ; absent de dev.becpg.fr, où l'adaptateur retombe sur `config/wizards.default.js` |
| §5.4.2 | Exigences documentaires (déjà matérialisées) | ✅ | — |
| §5.4.3 | Agrément dérivé, requêtes parc | 🟡 | la répartition d'agrément peut **dépasser le total du parc** (défaut P1 ci-dessous) |
| §4.2 | Écrans fournisseur | ✅ 11 pages | `/help` créé aujourd'hui par un agent concurrent, **non relu ici** |
| §4.3 | Dashboard | ✅ | — |
| §4.4 | Wizard, autosave, inversion documents→IA | 🟡 | le parcours a été **joué pour la première fois aujourd'hui contre dev** et **il échoue** (voir §E2E) |
| §4.5 | Documents et check-list d'exigences | ✅ | — |
| §4.6 | Espace pilotage | ✅ **6 écrans montés** | plus de trou d'écran ; restent les défauts P1/P2 et l'absence de `/monitor/reports` (assumée, §4.6.6) |
| §4.6.6 | Historique / cube OLAP | ❌ assumé | chaque payload renvoie `history: { available: false }` avec les dimensions qu'il faudrait. Aucune série historique n'est fabriquée. |
| §9.1 | Accessibilité (clavier, focus, couleur) | ✅ | audité et corrigé ce tour (voir §Durcissement) |
| §9.2 | Visionneuse de signature légère | 🟡 | jamais testée sur Firefox — c'était l'objectif de #35696 |
| — | Durcissement transverse | ✅ | fait ce tour |

## Défauts connus, non corrigés

| # | Défaut | Où | Pourquoi pas corrigé |
|---|---|---|---|
| **P1** | `GET /monitor/overview` renvoie `park.total: 251` mais `park.approved: 256`. **Un compteur dépasse le total auquel il appartient.** La répartition est calculée sur le parc *scanné* (`resolveSupplierScope`, plafonné par `beCPG.remote.maxResults.limit` = 256) tandis que `park.total` vient d'une **requête de comptage distincte** : les deux ne posent pas la même question, donc elles peuvent se contredire. | `lib/adapters/approval.js` (`computeApprovalForPark`, `counts` ligne ~675) + assemblage `park` dans `lib/adapters/monitor.js` | Correctif réel = borner la répartition à `scanned`, ou dériver total **et** répartition d'une seule requête. Hors périmètre de ce tour de durcissement ; l'UI le signale (`breakdownScope === 'window'`) mais **le chiffre reste faux à l'écran**. |
| **P2** | L'export CSV du parc est tronqué à 250 lignes sur 251 sans que le fichier le dise. La route pose `X-Portal-Truncated: true`, mais `download()` est un clic sur `<a>` : **un téléchargement navigateur ne peut pas lire un en-tête de réponse**. | `lib/client.js` (`download`), routes `monitor/suppliers` et `monitor/documents` | Contourné, pas résolu : l'avertissement est affiché **avant** le téléchargement depuis `pagination.truncated`. Correctif propre = un commentaire `#` en tête de CSV, ou passer par `fetch()` + `Blob`. |
| **P3** | La redirection d'un `ExternalUser` hors de `/monitor` **n'a jamais été observée à l'exécution**. `DEV_FAKE_AUTH` ouvre la session `admin`, et aucun compte fournisseur ne peut être créé localement (mot de passe généré, pas d'IDS). | `app/monitor/layout.js` | Correcte par construction contre la forme du 403 de `requireMonitorAccess` (`status: 403`, `details.space === 'supplier'`), mais **non vérifiée**. C'est le contrôle d'accès : il mériterait un test. |
| **P4** | `middleware.js` utilise une convention **dépréciée** en Next.js 16 (`⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`). | `middleware.js` | Renommer implique de toucher le fichier qui porte « rien n'est joignable sans session ». Un avertissement cosmétique ne justifie pas de remuer la barrière d'authentification sans test de non-régression. À faire, mais délibérément pas ici. |

## Durcissement transverse — ce qui a été corrigé ce tour

| Point demandé | Constat | Correctif |
|---|---|---|
| Tout `/api/v1/monitor/*` refuse un `ExternalUser` | ✅ déjà vrai — les 7 points d'entrée exportés de `lib/adapters/monitor.js` appellent `requireMonitorAccess()`, `ExternalUser` refusé **en premier et inconditionnellement**, avant même le test de groupe | aucun (vérifié, pas supposé) |
| Toute page `app/monitor/*` refuse un `ExternalUser` | ✅ déjà vrai — `app/monitor/layout.js` couvre les 6 pages, avec le `redirect()` **hors** du `try/catch` (sinon le catch avalerait le signal) | aucun ; cf. P3 sur la vérification |
| Aucun composant client n'importe `@/lib/becpg` ni `@/lib/session` | ✅ déjà vrai — 0 occurrence, y compris en import relatif | aucun |
| Aucune liste de champs/colonnes codée en dur ne pilote le rendu | ✅ conforme — colonnes et champs viennent **entièrement** de Share (cascade `formId + entityType + siteId + list`). Les 26 occurrences de `bcpg:`/`pjt:` sous `components/` sont : 22 en JSDoc, 2 en légende de provenance, et **1 seul vrai dictionnaire** (`ProductHeader.entityTypeLabel`) | conservé et justifié : c'est un **libellé de repli**, `typeLabel` de beCPG gagne toujours, et un type inconnu dégrade sur la partie locale du QName. Ne pilote aucun branchement. |
| Chargement / vide / erreur sur chaque écran | 🔴 **trou réel** : aucun `error.js`, `global-error.js` ni `not-found.js`. Une erreur de rendu tombait sur la boundary Next par défaut = **trace en dev, page blanche « Application error » en prod** | **3 fichiers ajoutés.** `app/error.js` (retry + retour accueil + `digest`, **message jamais affiché**), `app/global-error.js` (erreur du root layout : son propre `<html>`, styles inline car `globals.css` n'est pas chargé), `app/not-found.js`. Les 15 autres écrans délèguent déjà `loading`/`empty`/`error` à leurs composants de liste — vérifié un par un. |
| Navigation clavier (wizard, éditeur de datalist, matrice documents) | 🟡 **0 `<div onClick>`** dans tout le dépôt, tout est `<button>`/`<a>`/`<input>` réels, `Button`/`IconButton` portent `focus-visible:ring-2`. Mais **aucun style de focus global** : 4 `<button>` bruts (tri de datalist, cellule verrouillée, cellule et dépliage de la matrice) ne comptaient que sur le contour navigateur par défaut, quasi invisible sur les fonds colorés de la matrice | **filet global ajouté** dans `app/globals.css` : `:focus-visible { outline: 2px solid var(--becpg-orange) }`. Choisi comme `outline` et non comme ring `box-shadow` précisément pour que tout composant posant `focus:outline-none` (donc chaque `Button`) l'annule et dessine le sien — **jamais de double anneau**. Variante `forced-colors` pour le contraste élevé Windows. |
| Statut jamais par la couleur seule | ✅ déjà vrai — `StatusPill` résout tout statut vers le triple **(ton, icône, libellé)** ; `ExpiryPill iconOnly` garde un `title` **et** l'icône différenciante ; les cellules de la matrice ajoutent un texte ; `Gauge` est un `role="meter"` avec `aria-valuenow` | aucun |
| Le bandeau TEST ne peut pas être masqué | ✅ déjà vrai — `TestBanner` n'a **ni bouton de fermeture ni état**, le drapeau vient du tenant résolu côté serveur | aucun |
| `confidence` absente ne doit jamais s'afficher « low » | 🟡 correct pour `null`, `undefined`, `''`, non-numérique et `NaN` — mais **`Number(' ') === 0` bucketait une chaîne blanche en `'low'`**, soit « À saisir : l'extraction n'est pas fiable » pour un plugin qui sérialise « pas de score » en espace | **corrigé des deux côtés** (`confidenceBucket` serveur et `confidenceLevelOf` client, qui doivent rester d'accord sinon le badge contredit ce que l'API a auto-appliqué) |

### Autres corrections du même tour

- **3 liens de navigation morts supprimés ou rétablis.** `/monitor/reports` n'existe pas et
  n'existera pas sans le cube OLAP → **entrée supprimée** (promettre un écran que le
  référentiel ne peut pas alimenter est pire que ne rien proposer). `/help` était mort au
  début du tour, un agent concurrent a créé `app/help/page.js` pendant → **entrée
  rétablie** dans les deux espaces. Balayage final : **tout `href` interne résout**.
- **`e2e/report/**` et `e2e/results/**` exclus d'ESLint et ajoutés à `.gitignore`.** Le
  rapport HTML Playwright contient les **bundles minifiés de Playwright** : ils produisaient
  3 erreurs dans du code tiers compilé et ~300 Ko de code minifié en sortie de lint, ce qui
  noyait les vraies erreurs.
- **`react-hooks/rules-of-hooks` désactivé sous `e2e/**`.** Faux positif de collision de
  noms : une fixture Playwright reçoit son callback nommé `use`, la règle croit voir le hook
  React `use()`. Renommer le paramètre pour contourner un linter serait l'inverse du bon sens.
- **3 variables d'environnement documentées** dans `env.example`, qui ne l'étaient pas alors
  que la règle AGENTS.md l'exige : `BECPG_SHARE_URL`, `BECPG_SHARE_WIZARD_ENDPOINT`,
  `PORTAL_VERSION`. Le piège de `BECPG_SHARE_URL` est écrit noir sur blanc : Next.js charge
  `.env` **en plus** d'un `--env-file`, donc un `.env` local qui pointe Share sur `:8180`
  fuit dans un run visant dev — le portail prend alors ses données sur dev et sa
  configuration sur localhost, et rend **dix étapes à zéro champ, silencieusement**.

## Lint — propre

`npx eslint .` → **0 erreur, 1 avertissement**.

Corrigé ce tour :

- `e2e/fixtures/portal.js` — 2 erreurs `react-hooks/rules-of-hooks`. **Faux positif de
  collision de noms** : une fixture Playwright reçoit son callback nommé `use`, la règle croit
  voir le hook React `use()` appelé dans une fonction qui n'est pas un composant. Il n'y a pas
  de React dans ce répertoire. Règles React désactivées sous `e2e/**` plutôt que le paramètre
  renommé pour contourner un linter.
- `e2e/report/trace/assets/*.js` — 3 erreurs **dans les bundles minifiés de Playwright**, plus
  ~300 Ko de code minifié en sortie qui noyaient les vraies erreurs. `e2e/report/**` et
  `e2e/results/**` exclus du lint et ajoutés à `.gitignore` : ce sont des artefacts
  régénérés à chaque exécution, et ce n'est pas notre code.

Restait en fin de tour 3 erreurs dans `components/shell/NotificationBell.js` et
`app/help/page.js`, deux fichiers qu'un **agent concurrent réécrivait pendant ce tour**
(dernière modification observée à la seconde près). Je ne les ai pas corrigées — corriger un
fichier pendant qu'un autre agent le réécrit garantit soit l'écrasement du correctif, soit un
conflit. **Il les a corrigées lui-même avant la fin.** Une intervention de ma part avait été
faite puis rendue caduque par sa refonte (il a remplacé `useState` + effet de montage par un
`ref` lu paresseusement, ce qui évite effectivement l'écart d'hydratation).

Reste **1 avertissement assumé** : `components/ui/DataTable.js:214`
(`react-hooks/incompatible-library`) — `useReactTable()` de TanStack renvoie des fonctions que
le React Compiler ne peut pas mémoïser. Rien à corriger, c'est la bibliothèque.

## E2E — première exécution du parcours fournisseur

La suite Playwright existe (`e2e/`, 5 specs, Playwright nu et non le harnais
Stagehand+Gemini de `becpg-boxes/recette` : le DOM React du portail est stable, donc des
locators déterministes sont possibles **et** préférables, et le test juge le succès, jamais
un modèle).

Dernière exécution — `e2e/results/junit.xml`, **2026-07-30 15:19**, par un agent concurrent :

```
04-supplier-journey.spec.js : 7 tests, 1 échec, 0 ignoré, 29 s
FAIL « l'assistant de sa tâche se charge entièrement »
     GET /api/v1/tasks → 401 (attendu < 300)
```

**Donc : le parcours fournisseur a été tenté pour la première fois, et il ne passe pas.**
Un 401 sur `/api/v1/tasks` avec un compte fournisseur réel sur dev = la session n'est pas
établie, ou le ticket Alfresco n'est pas accepté. Non diagnostiqué ici. C'est **le prochain
sujet**, et il est plus important que tout ce qui reste dans ce document.

La phrase de la version précédente — « aucun parcours fournisseur n'a été joué de bout en
bout » — n'est donc plus tout à fait vraie : il a été joué, et il échoue.

## Côté beCPG — livré

⚠️ **La règle historique « ne pas modifier beCPG » n'est plus respectée** : `../becpg` porte
**13 fichiers modifiés**, tous attribuables à ce projet (B2/B3/B6). La décision a été prise et
documentée par l'agent backend, et les trois évolutions sont **additives et désactivées par
défaut** — mais l'écart avec la règle doit être visible ici, pas seulement dans un historique
de conversation. `AGENTS.md` règle 8 a été réécrite en conséquence.

> **La branche a changé pendant ce tour.** À 15 h 15 le dépôt était sur **`master`** avec
> **15** fichiers modifiés, dont `ProjectFormulationWorker.java` et
> `ProjectWorkflowServiceImpl.java` — 196 lignes ajoutées **préexistantes**, étrangères à ce
> projet. À 15 h 30 il est sur **`feature/supplier-portal-v2`** avec 13 fichiers, ces deux-là
> sortis du lot. Quelqu'un a changé de branche entre les deux relevés.
> **Vérifiez la branche avant de compiler** : ce n'est pas un état stable.

`git status --short` dans `/home/matthieu/becpg-workspace/becpg`, branche
`feature/supplier-portal-v2`, relevé à **15 h 30** :

```
 M becpg-core/.../entity/remote/RemoteEntityService.java
 M becpg-core/.../entity/remote/RemoteParams.java
 M becpg-core/.../entity/remote/extractor/JsonEntityVisitor.java
 M becpg-core/.../web/scripts/remote/AbstractEntityWebScript.java
 M becpg-core/.../web/scripts/remote/ListEntitiesWebScript.java
 M becpg-core/.../becpg-core/becpg-config-core.properties
 M becpg-core/.../webscripts/fr/becpg/remote/entities.get.desc.xml
 M becpg-plm/.../messages/system-configuration.properties
 M becpg-plm/.../messages/system-configuration_en.properties
 M becpg-plm/.../messages/system-configuration_fr.properties
 M becpg-plm/.../admin/system-configuration/system-configuration.get.js
 M becpg-project/.../survey/impl/SurveyServiceImpl.java
 M becpg-project/.../becpg-project-core/becpg-config-project.properties
?? becpg-share/.../site-webscripts/org/alfresco/becpg/portal/
```

Le répertoire non suivi contient les 4 fichiers du webscript wizard :
`wizard.get.desc.xml` · `wizard.get.js` · `wizard.get.json.ftl` · `portal-form.lib.js`

`GET /share/service/becpg/portal/wizard?wizardId=&nodeRef=&entityType=&siteId=&portalTicket=`

Résultat mesuré sur instance 26.1.0 :

```
step1    form             21 champs, formId=supplier
step2    survey            3 champs
step3    entityDataList   17 champs, formId=datagrid-rawMaterial   <- cascade prouvée
step4..9 entityDataList   28, 13, 17, 12, 11, 7 champs
step10   documents        sans objet
```

`datagrid-rawMaterial` au lieu de `datagrid` prouve que la cascade s'applique : **les
surcharges client (Bridor, Aryzta) seront reprises**.

### B2 / B3 / B6 — livrés, mais inertes par défaut

| # | Livré | État réel |
|---|---|---|
| **B2** | `beCPG.remote.maxResults.hardLimit=256` + `maxResultsHardLimit()` | **inerte** : livré **égal** à `maxResults.limit`, donc le comportement est identique au bit près. Ne débloque le fenêtrage qu'une fois relevé par un administrateur. Ne corrige **pas** P1, qui est un défaut du portail. |
| **B3** | `appendParent` sur les lignes `ENTITY_LIST` (`parent`, `path`, `entityId`) | opt-in (`appendParent=true`), défaut `false`. Vérifié : un build déployé plus ancien **ignore** le paramètre inconnu, donc le portail peut l'envoyer inconditionnellement. |
| **B6** | Portée filiale sur les questions de questionnaire, dans `SurveyServiceImpl` | opt-in `beCPG.survey.subsidiaryScope.enabled=false`. Réutilise `bcpg:subsidiaryRef` — **aucun ajout de modèle**. Limite assumée : scoring / `reqCtrlList` / rapports continuent de considérer les questions masquées. |

Compilation vérifiée (`JAVA_HOME` sur JDK 21 obligatoire, le défaut du shell est 17) :
`becpg-core` et `becpg-project-core`/`becpg-plm-core` → **BUILD SUCCESS**.

## Côté beCPG — restant

| # | Besoin | Pourquoi |
|---|---|---|
| B4 | propriété « marché » | filtre de pilotage, signalé aujourd'hui en `filters.unsupported` |
| B5 | recherche par association (`site`, `filiale`) | post-filtrage de fenêtre, signalé en `mode: 'assoc'` |
| — | Livrables `init-repo` (§2bis.3, §2ter.4) | sous-fournisseurs, emballage fournisseur, formulaires `supplier`, modèles de projet, questionnaires types |

## Les quatre pièges à connaître

Découverts en testant, tous documentés dans `becpg-api-contracts.md` §8 :

1. `<import>` doit être en **ligne 1** d'un webscript Surf, sinon il n'est pas substitué.
2. `response.status` est un **objet** : le code est `response.status.code`. Comparer l'objet à
   `401` échoue silencieusement — ça a fait diagnostiquer un faux problème d'authentification.
3. `config.scoped[x]` renvoie `undefined`, pas `null`, et **la clé choisit l'évaluateur** :
   un QName → `model-type`, un nodeRef → `node-type`. beCPG déclare ses listes sous les deux,
   ses types produit sous `node-type` seulement.
4. Le cache d'`<import>` survit à `reset=on` : redémarrer Share après modification d'une lib.

Et le piège de correctness évité : n'utiliser le nodeRef comme clé que pour les étapes
`form`. Pour une datalist il désigne l'**entité**, pas la ligne — la résolution renverrait le
formulaire de l'entité, une définition **fausse** plutôt que vide.

## Ce qui n'a jamais tourné contre du réel

À dire clairement, par ordre de gravité :

1. **Le code flow OIDC contre l'IDS réel.** Tout ce qui a tourné l'a fait via
   `DEV_FAKE_AUTH`, qui court-circuite Keycloak. C'est le mécanisme d'authentification de
   production, et il n'a jamais été exercé.
2. **Le parcours fournisseur complet** — tenté aujourd'hui, **échoue en 401** (§E2E).
3. **Le refus d'un `ExternalUser` sur `/monitor`** (P3) — le contrôle d'accès de l'espace de
   pilotage, correct par construction, jamais observé.
4. **La visionneuse de signature sur Firefox** (#35696).
5. **`app/help/` et `components/shell/NotificationBell.js`**, écrits par un agent concurrent
   pendant ce tour : ils compilent et passent le lint, mais **ils n'ont été ni relus ni testés
   ici**. `NotificationBell` porte de la logique non triviale (lecture paresseuse de
   `localStorage` hors hydratation, throttling de rafraîchissement, piège de focus) qui
   mérite une relecture par quelqu'un.
