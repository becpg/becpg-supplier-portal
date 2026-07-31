# État d'implémentation — Portail Fournisseur V2

> Arrêté au **2026-07-30, 16 h 10**, après un **tour de vérification sur instance vivante**
> (build, suite E2E complète, contrôles curl et navigateur). Document de passation : il vaut
> par son honnêteté, pas par son optimisme. **« Partiel » dit toujours ce qui manque**, en une
> ligne.
>
> Les deux réserves de la version précédente sont **levées** :
>
> 1. **Le portail est désormais sous git.** `git rev-parse --show-toplevel` →
>    `/home/matthieu/becpg-workspace/becpg-supplier-portal`, branche `main`, commit
>    `cdd64f8` « InProgress #35846 — [Feature] Portail fournisseur V2 ». Le travail est
>    récupérable. Ce qui était « le premier risque du projet » n'en est plus un.
> 2. Les fichiers signalés instables (`app/help/`, `components/shell/NotificationBell.js`)
>    ont été **relus et vérifiés à l'exécution** ce tour. Plus aucune ligne de ce document
>    ne repose sur du code qu'un autre agent réécrivait pendant sa rédaction.
>
> ⚠️ **Une seule réserve subsiste, et elle est méthodologique** : tout ce qui est marqué ✅
> ci-dessous l'est via `DEV_FAKE_AUTH`. Voir §« Ce qui n'a jamais tourné contre du réel ».

## Comment reproduire la vérification

La suite exige **deux** instances, ce qui n'était écrit nulle part et a fait conclure à tort
à des échecs de code lors des tours précédents :

| Port | `.env` utilisé | Compte | Sert |
|---|---|---|---|
| **3000** | `.env` | `admin` sur `localhost:8080`, tenant `local` | specs `00` → `03` (`baseURL` par défaut) |
| **3100** | `.env.supplier` | `supplier-test@becpg.fr` sur `dev.becpg.fr`, tenant `dev` | spec `04` seule (`test.use({ baseURL })` en tête de fichier) |

`04-supplier-journey.spec.js` ne peut pas tourner en local : le compte fournisseur y est
créable mais son mot de passe est généré et non réinitialisable sans IDS.

⚠️ **`next dev` refuse deux instances pour un même répertoire** (« Another next dev server is
already running »). La seconde instance doit donc être lancée depuis une **copie** du dépôt
(source copiée, `node_modules` en liens durs — un lien symbolique est refusé par Turbopack :
« Symlink [project]/node_modules is invalid, it points out of the filesystem root », et la
copie doit être sur le **même système de fichiers** pour que `cp -al` fonctionne, donc pas
sous `/tmp`). Sans les deux instances, les 8 tests de la spec `04` échouent en
`ERR_CONNECTION_REFUSED` — ce qui **ne dit rien sur le code**.

## Vue d'ensemble

| Élément | État |
|---|---|
| Application | Next.js 16.2.12 (App Router), React 18, Tailwind 4, JavaScript |
| `npx next build` | ✅ **vert**, 0 erreur, 57 routes (18 pages + 38 route handlers + `/_not-found`) — revérifié le 2026-07-30 à 17 h |
| `npx eslint .` | ✅ **0 erreur**, 1 avertissement assumé (voir §Lint) |
| Suite E2E | ✅ **52/52** (6 specs) — voir §E2E |
| Thème beCPG | ✅ **appliqué et vérifié à l'exécution** — voir §Thème |
| Fichiers | 18 pages, 38 route handlers, 86 composants, 21 modules `lib/` |
| Gestion de version | ✅ git, branche `main` |
| beCPG (`../becpg`) | ✅ **rien à reprendre** — voir ci-dessous |

> **Correction (2026-07-31).** La ligne beCPG disait « branche
> `feature/supplier-portal-v2`, 13 fichiers modifiés ». **C'est faux aujourd'hui, et
> la bonne nouvelle est meilleure que l'ancienne** : `feature/supplier-portal-v2`
> est désormais un **ancêtre strict de `master`** (`git merge-base --is-ancestor`
> → vrai, `git log master..feature/supplier-portal-v2` → vide). Le travail B2/B3/B6
> a été intégré : `master` porte
> `becpg-share/.../org/alfresco/becpg/portal/wizard.get.{desc.xml,js}`. Le dépôt
> `../becpg` est sur `master`, **propre** (un seul fichier non suivi,
> `docker-compose.override.yml.old`, sans rapport). Il n'y a donc **aucune branche
> beCPG à sortir ni à pousser**, et rien n'a été modifié côté beCPG pendant ce tour.

## Par section de la spec

| Spec | Sujet | État | Ce qui manque |
|---|---|---|---|
| §5.1 | Tout en Next.js, proxy par route handlers | ✅ | — |
| §5.3 | Multitenant, SSO IDS serveur, session JWE | 🟡 | testé contre un Keycloak simulé et via `DEV_FAKE_AUTH` ; **jamais contre l'IDS réel**. Le code flow OIDC n'a donc jamais tourné. |
| §5.4 | 38 route handlers + 12 adaptateurs | ✅ | — |
| §5.4.1 | Webscript Share du wizard | ✅ testé sur instance 26.1.0 | déployé **uniquement** sur la branche locale de beCPG ; absent de dev.becpg.fr, où l'adaptateur retombe sur `config/wizards.default.js` |
| §5.4.2 | Exigences documentaires (déjà matérialisées) | ✅ | — |
| §5.4.3 | Agrément dérivé, requêtes parc | 🟡 | la répartition d'agrément peut **dépasser le total du parc** (défaut P1 ci-dessous) |
| §4.2 | Écrans fournisseur | ✅ 11 pages | `/help` **relu et vérifié ce tour** : rend en 200, 9 sujets tous replantés à l'ouverture, `?topic=` déplie la bonne section, lié depuis la barre latérale des **deux** espaces (lien cliqué, navigation effective). Couvert par `SUPPLIER_PAGES`. |
| §4.3 | Dashboard | ✅ | — |
| §4.4 | Wizard, autosave, inversion documents→IA | 🟡 | le parcours fournisseur **passe maintenant de bout en bout** (51/51) : l'échec « 401 » du tour précédent était un artefact d'environnement, pas un défaut. Reste que le test **n'affirme pas les champs** : les résoudre exige une session Share, donc un run OIDC réel (`source ∈ {share, default}` est tout ce qui est vérifié). |
| §4.5 | Documents et check-list d'exigences | ✅ | — |
| §4.6 | Espace pilotage | ✅ **6 écrans montés** | plus de trou d'écran ; restent les défauts P1/P2 et l'absence de `/monitor/reports` (assumée, §4.6.6) |
| §4.6.7 | Cloisonnement fournisseur / pilotage | ✅ **vérifié à l'exécution** | l'invariant « un `ExternalUser` est refusé même s'il détient un groupe de pilotage » n'était **pas réellement appliqué** — corrigé ce tour, voir §Correctifs. Désormais observé sur compte fournisseur réel : API 403 `details.space:"supplier"`, page `/monitor` → **307 vers `/`**. |
| — | Restriction fournisseur du pilotage (`bcpg:suppliersAspect`) | ✅ **mesuré** | campagnes et NC ne comptent plus que ce qui concerne un fournisseur (voir §Restriction fournisseur) |
| — | Cloche de notifications | ✅ **vérifiée au navigateur** | badge, panneau, état vide réel, clavier, annonce vocale (voir §Cloche) |
| §4.6.6 | Historique / cube OLAP | ❌ assumé | chaque payload renvoie `history: { available: false }` avec les dimensions qu'il faudrait. Aucune série historique n'est fabriquée. |
| §9.1 | Accessibilité (clavier, focus, couleur) | ✅ | audité et corrigé ce tour (voir §Durcissement) |
| §9.2 | Visionneuse de signature légère | 🟡 | jamais testée sur Firefox — c'était l'objectif de #35696 |
| — | Durcissement transverse | ✅ | fait ce tour |
| — | Identité visuelle beCPG | ✅ **vérifiée sur instance vivante** | voir §Thème ; réserve unique : les captures ne couvrent que `/` et `/monitor` |

## Thème beCPG — état au 2026-07-30, 17 h

Le portail porte les couleurs et le logo officiels de la gamme. **Vérifié à l'exécution**, pas
seulement relu.

### Les cinq couleurs officielles

`public/theme/default/theme.css` fait autorité, et `app/globals.css` reprend chacune de ses
variables **à l'identique**, plus un jeu dérivé (`blue-light`, `orange-deep`, dégradés, tokens
de statut). Le fond de la barre d'outils est mesuré dans le DOM à `rgb(0, 66, 84)` = `#004254`.

| Variable | Valeur | Rôle |
|---|---|---|
| `--becpg-blue` | `#004254` | barre d'outils, titres, chiffres |
| `--becpg-green` | `#00ffbd` | accent de réussite (jamais porteur de texte : 1,09:1 sur fond clair) |
| `--becpg-grey` | `#e4ecee` | fond de page |
| `--becpg-orange` | `#ff642d` | bandeau TEST, rails, anneau de focus |
| `--becpg-darkGrey` | `#747474` | texte atténué |

⚠️ **Piège à connaître** : `theme.css` écrit `--becpg-darkGrey`, le portail lit
`--becpg-dark-grey` (~342 occurrences). Les propriétés personnalisées sont **sensibles à la
casse** : un alias `--becpg-dark-grey: var(--becpg-darkGrey)` est déclaré dans `globals.css`.
Ne pas le supprimer, et ne pas renommer dans `theme.css` — le fichier doit rester
copiable-collable depuis la gamme.

### Où sont utilisés les assets

Aucun logo dessiné à la main, aucun SVG de substitution, aucun emoji comme marque.

| Asset | Utilisé par | HTTP sur `:3000` |
|---|---|---|
| `theme/default/images/logo.png` | `components/shell/Header.js` (≥ `sm`), `components/shell/Nav.js` (tiroir), `app/login/page.js` | **200** |
| `theme/images/app-logo-48.png` | `components/shell/Header.js` (< `sm`) | **200** |
| `theme/default/images/shape.png` | `app/login/page.js`, utilitaire `.bg-shape`, `components/ui/EmptyState.js` | **200** |
| `theme/default/manifest.json` | `app/layout.js` (`metadata.manifest`) | **200** |
| `theme/default/icons/favicon-96x96.png` | `app/layout.js` (`metadata.icons`) | **200** |

Le logo officiel est **dessiné en `--becpg-blue`** : posé tel quel sur la barre bleue, il
disparaît. Il n'est ni inversé par filtre (cela détruirait le contrepoinçon vert) ni redessiné :
c'est la **surface** qui devient blanche, via `.becpg-brand-plate`.

### Garde-fou E2E

`e2e/tests/03-ui.spec.js` → *« la marque beCPG est chargée dans l'en-tête, pas seulement
référencée »*. Le test affirme, à 1440 px **et** à 360 px (les deux marques) :

1. l'image est visible **et `naturalWidth > 0`** — un 404 produit aussi une balise visible ;
2. l'URL réellement demandée par le navigateur (route `/_next/image`) répond 200 ;
3. **le fichier brut sous `public/` répond 200.**

Le point 3 n'est pas redondant : contrôle négatif effectué en supprimant
`public/theme/default/images/logo.png`, **l'optimiseur d'images de Next a resservi sa variante
en cache** et les points 1 et 2 sont restés verts. Seule la requête sur le fichier brut a viré
au rouge. Un garde-fou qui ne vérifierait que le rendu ne détecterait pas un asset disparu.

### Corrigé ce tour

`components/shell/AppShell.js` — la barre latérale passe de `w-60` (240 px) à **`w-64`**, la
largeur du `Layout.js` de référence. À 240 px l'étiquette disposait de 157 px alors que
« Conformité documentaire » en demande 165 : c'était la seule entrée de navigation rendue
tronquée à 1440 px. Mesuré après correction : **0 nœud de texte tronqué**.

### Ce que la vérification ne dit pas

- Les captures ne couvrent que `/` et `/monitor`, aux deux largeurs. Les 16 autres pages sont
  couvertes par le rendu E2E, **pas par un œil**.
- Le contraste a été calculé et mesuré aux tours précédents ; ce tour ne l'a **pas recalculé**.
  Trois écarts assumés y sont documentés, dont `--becpg-orange` en rail sur blanc à 2,95:1
  (norme : 3:1).
- **`npx next build` tue l'instance `next dev --turbopack` du même répertoire** : les deux
  partagent `.next`. Lancer le build **avant** la suite E2E, puis attendre le redémarrage du
  serveur (`GET /api/health` → 200). Une suite lancée pendant cette fenêtre échoue en
  `ERR_CONNECTION_REFUSED` et **ne dit rien sur le code**.

## Défauts connus, non corrigés

| # | Défaut | Où | Pourquoi pas corrigé |
|---|---|---|---|
| **P1** | `GET /monitor/overview` renvoie `park.total: 251` mais `park.approved: 256`. **Un compteur dépasse le total auquel il appartient.** La répartition est calculée sur le parc *scanné* (`resolveSupplierScope`, plafonné par `beCPG.remote.maxResults.limit` = 256) tandis que `park.total` vient d'une **requête de comptage distincte** : les deux ne posent pas la même question, donc elles peuvent se contredire. | `lib/adapters/approval.js` (`computeApprovalForPark`, `counts` ligne ~675) + assemblage `park` dans `lib/adapters/monitor.js` | Correctif réel = borner la répartition à `scanned`, ou dériver total **et** répartition d'une seule requête. Hors périmètre de ce tour de durcissement ; l'UI le signale (`breakdownScope === 'window'`) mais **le chiffre reste faux à l'écran**. |
| **P2** | L'export CSV du parc est tronqué à 250 lignes sur 251 sans que le fichier le dise. La route pose `X-Portal-Truncated: true`, mais `download()` est un clic sur `<a>` : **un téléchargement navigateur ne peut pas lire un en-tête de réponse**. | `lib/client.js` (`download`), routes `monitor/suppliers` et `monitor/documents` | Contourné, pas résolu : l'avertissement est affiché **avant** le téléchargement depuis `pagination.truncated`. Correctif propre = un commentaire `#` en tête de CSV, ou passer par `fetch()` + `Blob`. |
| ~~**P3**~~ | ~~La redirection d'un `ExternalUser` hors de `/monitor` n'a jamais été observée à l'exécution.~~ **CLOS, et il cachait un vrai défaut** — la redirection ne se produisait pas. Observée ce tour depuis l'instance `:3100` (compte fournisseur réel) : elle échouait, le fournisseur recevait une page verrouillée listant les groupes internes à demander. Corrigé et désormais couvert par deux tests. | `app/monitor/layout.js`, `lib/adapters/monitor.js` | Voir §Correctifs. « Correct par construction, mais non vérifié » s'est révélé faux : c'est exactement pourquoi la formule n'a pas de valeur. |
| **P5** | **À 360 px sur `/monitor`, le nom du tenant est illisible.** Mesuré : le libellé « local » dispose de 27 px alors qu'il en demande 33 — il s'affiche « lo… », et son sous-titre « espace fournisseur » tombe à « es… ». Sur `/` le nom passe entier (seul le sous-titre est tronqué, 73 < 105). La cause est le bouton de rafraîchissement propre au pilotage, qui prend ~46 px dans une barre déjà pleine (menu, marque, tenant, cloche + pastille « 99+ », avatar, chevron). La spec §4.3 veut que le fournisseur sache **toujours** pour quel client il travaille. | `components/shell/Header.js`, `components/shell/TenantBadge.js` | Non corrigé : le texte reste **entier dans le DOM** (le test « le tenant est identifié en permanence » porte sur le contenu, pas sur les pixels, et passe), et arbitrer ce qu'on retire de la barre du pilotage à 360 px est une décision produit, pas un choix de thème. Le sous-titre est le candidat évident. **Ne pas conclure du vert de la suite que le tenant est lisible sur téléphone.** |
| ~~**P4**~~ | ~~`middleware.js` utilise une convention **dépréciée** en Next.js 16.~~ **CLOS.** Migré vers `proxy.js`, et ce n'était pas qu'un renommage : `middleware` tournait en **Edge runtime**, `proxy` tourne en **Node.js**, et l'option `runtime` est refusée dans un fichier proxy. Voir §Migration `middleware` → `proxy`. | `proxy.js` | Le « test de non-régression » qui manquait a été construit : matrice de 27 chemins × (anonyme, authentifié), avant / après, identique au caractère près. |

## Trois défauts de plateforme remontés par la console (2026-07-31)

Trois avertissements du serveur de dev, corrigés ensemble. Aucun n'était
cosmétique.

### Migration `middleware` → `proxy`

`middleware.js` → `proxy.js`, fonction `middleware()` → `proxy()`, `config.matcher`
inchangé au caractère près.

**Ce n'est pas qu'un renommage.** Mesuré en stampant le runtime dans un en-tête de
réponse : sous la convention `middleware` la fonction s'exécutait en
`edge:edge-runtime` ; sous `proxy` elle s'exécute en `node:22.22.1`. La doc Next 16
le confirme et précise que l'option de segment `runtime` est **refusée** dans un
fichier proxy — il n'y a pas de retour en arrière. Rien ici n'en dépendait
(`jose` s'appuie sur WebCrypto, disponible des deux côtés), mais le commentaire
« Edge-safe » en tête de fichier était devenu faux et a été réécrit.

Non-régression, puisque ce fichier porte « rien n'est joignable sans session » :
une matrice de 27 chemins (pages, `/api/v1`, `/api/auth`, `/api/health`, formes
préfixées `/t/<tenant>/`, assets exclus par le matcher, `_next/*`) × deux états
(anonyme, session chiffrée forgée hors ligne avec `lib/session.js`), relevant pour
chacun le statut, la cible de redirection **et** si la fonction s'est exécutée du
tout — un en-tête sonde, seul moyen de distinguer « exclu par le matcher » de
« laissé passer par `isPublicFile()` ». Avant / après : identiques. Rejoué ensuite
sur un build de production : toujours identiques.

### `shape.png` en LCP sur `/login`

La marque décorative du bas-droite (`opacity: .13`, `alt=""`, `aria-hidden`) était
le Largest Contentful Paint. Elle l'**est toujours**, et c'est légitime : à
400 × 400 px visibles elle est un ordre de grandeur plus grande que le plus gros
bloc de texte, sur une page dont la seule autre image est un logotype 200 × 37.
Vérifié qu'on ne peut pas s'en débarrasser en la déplaçant : mesuré sur Chrome,
un `background-image` sur l'élément **et** un `background-image` sur un
pseudo-élément `::after` restent l'un comme l'autre candidats LCP.

Le vrai défaut était ailleurs : sans `priority`, `next/image` pose
`loading="lazy"` — l'élément qui décide du LCP de la page n'était découvert
qu'après la mise en page. `priority` place un `<link rel="preload">` dans le
`<head>`, où le preload scanner le trouve dans les premiers octets du HTML.

Mesuré sur build de production, 1440 × 900, médiane de 7 chargements, réseau
bridé à ~1,6 Mb/s / 150 ms de latence :

| variante | LCP médian |
|---|---|
| `next/image` sans `priority` (état livré) | **1628 ms** |
| `next/image` + `priority` | **780 ms** |
| `background-image` CSS (élément supprimé du DOM) | 1588 ms |

La piste CSS, séduisante sur localhost, ne gagne rien sur un réseau réaliste —
découverte seulement après l'analyse de la feuille de style — et double les
octets (PNG brut 14 Ko contre WebP 6,6 Ko servi par l'optimiseur). Écartée.

Pas de `sizes` : avec `sizes`, `next/image` construit le srcset à partir des seuls
`deviceSizes`, dont le plancher est 640 — exactement la variante que tous les
appareils reçoivent déjà. L'ajouter ne ferait que promettre une adaptativité qui
n'existe pas.

### Clé React dupliquée `incoRawMaterials`

Deux causes distinctes, et il fallait les séparer avant de corriger.

1. **Ce n'est pas un doublon** — `EntityCatalogServiceImpl.formulateCatalog()`
   boucle sur les `rep:reportLocales` de l'entité et émet **une entrée par
   langue**, même `id`, `locale` différent, et surtout `missingFields`
   différents : un libellé légal peut être saisi en français et manquant en
   anglais. Deux lignes réelles, un seul id. La clé devient `id::locale`.
2. **C'en est un** — `EntityCatalogServiceImpl.getCatalogsDef()` concatène
   **tous les fichiers** de `/app:company_home/cm:System/cm:PropertyCatalogs`
   sans dédoublonner sur l'id : un second fichier qui redéclare un id ne
   remplace pas le premier, il en ajoute un jumeau, et les deux sont formulés.
   Observé sur l'instance locale, qui porte un fichier de définition parasite à
   côté de `catalogs.json` : `becpg/entity/catalog/node/…` renvoie
   `incoFinishedProduct` **deux fois**, même locale, même score. Dédoublonné
   dans l'adaptateur, sur `(id, locale)`, en gardant l'entrée **la moins bonne**
   — masquer la plus stricte dirait au fournisseur que son dossier est plus
   complet que ce que beCPG en pense.

Aucune clé indexée nulle part : un `|| index` en dernier recours aurait fait
survivre silencieusement le doublon du cas 2 au lieu de le laisser tomber dans
l'adaptateur.

Les blocs de synthèse (`toCompletion`, `toCatalogCompletion`) collapsent en plus
les locales entre elles : ils affichent un compteur et une liste de pastilles, où
« 2 catalogue(s) » pour un catalogue en deux langues était simplement faux.

**Une occurrence résiduelle, trouvée à la consolidation et corrigée.**
`CompletionCard` clefait encore sur `catalog.id` **seul**, alors que le producteur
(`toCompletion`) dédoublonne sur `id || label`. Un `bcpg:entityScore` portant deux
catalogues sans `id` — cas contre lequel `normalizeCatalog` se défend
explicitement (`id: raw.id || null`) — produisait deux clés `null`. Clef alignée
sur la clef de dédoublonnage : **moins que la clef du producteur rend une
collision possible, plus qu'elle scinderait une ligne déjà fusionnée**. Le
commentaire qui affirmait « ces ids sont uniques par construction » était faux et
a été réécrit.

En revanche `app/monitor/suppliers/[id]/page.js` **garde** son `|| index` :
`details.blockingCatalog` vient de `evaluateBlockingCatalogs()`
(`lib/adapters/approval.js`), pas de `toCatalogCompletion`, et rien n'y garantit
l'unicité. La règle « pas de clef indexée » vaut là où le producteur garantit
l'unicité ; l'appliquer ailleurs remplacerait un filet par un défaut.

## Consolidation du 2026-07-31 — trois défauts fonctionnels

Vérifiés **par lecture seule** : ni serveur, ni navigateur, ni écriture Alfresco
(consigne explicite de l'utilisateur). Voir §« Ce que cette consolidation ne dit
pas » plus bas.

### F4 — un lien « Télécharger » qui répondait 404

`getSignatureView()` savait déjà que le nœud était illisible — `fetchDocumentMeta`
renvoyait `null` — mais la seule conséquence était un repli sur
`deliverable.contents[0]`, vide sur cette tâche. Le nodeRef mort partait quand
même dans `portalContentUrls()`, et `SignatureFlow` en faisait un bouton.

`probeDocument()` (`lib/adapters/signature.js`) rend maintenant un verdict
**à trois valeurs** : `true`, `false` (beCPG répond `200 {}` — supprimé ou refusé)
et `null` (la sonde elle-même a échoué → *inconnu*, on garde l'ancien
comportement, un incident réseau ne doit jamais masquer un document valide).
Conséquences : `contentUrl`/`downloadUrl` à `null`, analyse des zones sautée,
entrées illisibles retirées d'`originals[]`, panneau « Document indisponible » au
lieu d'une visionneuse, et `pageCount: 0` — donc la porte de lecture reste
verrouillée : *un document que personne ne peut ouvrir ne peut pas être attesté lu*.

### F5 — cliquer une discussion ne l'ouvrait pas

`app/messages/page.js` lisait `?nodeRef=` **une fois**, dans l'initialiseur d'un
`useState`, depuis `window.location.search`. Arriver du tableau de bord est une
transition client (`next/link`, `app/page.js:224`) : le composant monte avant que
la nouvelle query string ne soit sur `window.location`, l'initialiseur lit `null`,
et plus rien ne relit jamais l'URL. Rechargement à la main : ça marchait — d'où
l'impression que « rien ne se passait ». La même ligne branchait sur
`typeof window` pendant le rendu, donc chaque ouverture directe d'un lien profond
levait une erreur d'hydratation.

Aligné sur le motif que suivent déjà `/tasks`, `/monitor/suppliers` et
`/products/[id]` : `useSearchParams()` dans un `MessagesScreen`, relu **pendant le
rendu**, export par défaut enveloppé dans `<Suspense>`. Le `history.replaceState`
de la sélection interne est conservé, et le montage est correct que Next
resynchronise `useSearchParams` depuis `replaceState` ou non — les deux chemins
ont été tracés.

### F6 — un bouton « Envoyer » qui ne pouvait qu'échouer

Un fournisseur n'a le droit d'écrire sur une entité que **tant qu'il porte une
tâche assignée** dessus (`SupplierSecurityPlugin`). Le composeur était pourtant
affiché sur tous les fils ; le POST refusé remontait en **502 / `error.network`**
(« Connexion impossible au serveur ») pour un problème de droits.

`GET /api/v1/messages` renvoie désormais `canPost`, `postDenyReason` et
`security: { accessMode, hasAssignedTask }`. **`canPost` vaut
`nodePermissions.create`**, c'est-à-dire le contrôle d'ACL que le POST exécutera
lui-même : le droit annoncé et le droit réel ne peuvent pas diverger. Le couple
`accessMode` / `hasAssignedTask` n'est lu **que sur le chemin refusé**, et
seulement pour *nommer* la raison — `accessMode` seul est mesurablement plus large
que l'ACL du forum et aurait continué à proposer un bouton qui 500.

Côté client (`/messages` et `CommentsPanel`) : ni `<textarea>` ni bouton, une
phrase avec cadenas. La décision est **lue** du payload, jamais redérivée.
Tant que le fil n'a pas répondu, `canPost` est faux : un composeur qui apparaît
une fois le droit connu est honnête, un composeur repris ne l'est pas.

Au passage, `lib/errors.js` : `isPermissionDenial` ne connaissait que l'anglais
alors que le dépôt répond en français (`Access refusé. Vous n'avez pas la
permission de réaliser cette opération.`), et sous un **500**, Alfresco laissant
échapper l'`AccessDeniedException`. Regex étendue aux formes françaises et
nouvelle branche `status >= 500 && isPermissionDenial(message) → 403`. Ce
reclassement **restreint** (un 502 devient un 403), il n'ouvre rien.

## Démarrage d'un processus — la liste n'est plus collée dans la configuration

`POST /api/v1/process/start` n'instancie que des modèles autorisés. La liste
vient maintenant de beCPG (`lib/adapters/processTemplates.js`) au lieu d'un
nodeRef collé dans `PORTAL_PROCESS_TEMPLATES`.

**Le marqueur est celui du produit, pas une heuristique.** Le dialogue Share
« Envoyer au fournisseur » ne demande de nodeRef à personne : il remplit son
sélecteur depuis **une** source d'autocomplétion, déclarée à l'identique dans
`send-to-supplier.get.html.ftl:44` et `becpg-plm-form-config.xml:5521` —
`classNames=pjt:project,bcpg:entityTplAspect,bcpg:suppliersAspect` +
`excludeProps=bcpg:entityTplEnabled|false`. `filterByClass()` transforme chaque
aspect en `withAspect()`, soit un `+ASPECT:"…"` **obligatoire** : c'est une
conjonction, pas un score. Le discriminant est `bcpg:suppliersAspect`, posé par
le produit lui-même dans `SupplierPortalInitRepoVisitor` (`pjtTpl.getAspects()
.add(PLMModel.ASPECT_SUPPLIERS)`).

*Relu dans les sources beCPG à la consolidation* : les deux déclarations existent
bien et sont identiques, la ligne du visitor est bien là, et — contrôle
décisif — `becpg-project-form-config.xml` utilise la **même** source
**sans** `bcpg:suppliersAspect` pour le sélecteur générique de modèles de projet.
L'aspect discrimine donc réellement.

**Précédence :** `PORTAL_PROCESS_TEMPLATES` gagne dès qu'elle est renseignée, et
alors **aucune requête de découverte n'est émise**. Le test porte sur la variable
**brute** : une valeur renseignée mais inutilisable veut dire « ne rien démarrer »,
et ne rend pas la main à la découverte. La découverte ne remplit la liste que si
la variable est absente.

**Ce que la découverte n'élargit pas.** La requête est une constante serveur : le
navigateur ne peut influencer ni le chemin, ni `classNames`, ni `excludeProps`.
Le refus par défaut est intact — une instance sans modèle marqué résout une liste
**vide**, et une liste vide ne démarre rien. Un `?` nommant un autre modèle, par
id ou par nodeRef, est refusé exactement comme avant.

`/api/v1/monitor/actions` (suspension) reste **volontairement en configuration
seule** : beCPG ne pose aucun marqueur pour un modèle de *suspension*, donc un
repli sur la découverte démarrerait en silence un projet de référencement.

**Le chemin de démarrage a dû changer.** `becpg/supplier/send-to-supplier` répond
500 (classe non déclarée en bean Spring). Le portail compose ce que fait Share :
`GET becpg/workflow/start-process?defs=true&nodeRefs=…` (beCPG évalue lui-même
`bSupplier.extract*` — aucune logique métier ne migre dans le portail, règle R2),
puis `POST …?script=create-supplier-project.js`. Les deux avec
`skipAllowList: true` : **`becpg/workflow/` n'est donc pas ajouté à la liste
blanche joignable depuis le navigateur** — vérifié, `ALLOWED_BECPG_PATH_PREFIXES`
ne la contient pas, et `/api/v1/becpg/[...path]` n'expose de toute façon que
`GET`/`HEAD`. L'appel `defs=true` est un second verrou gratuit : pas de
définition (condition/`permissionGroup` refusés par beCPG) → 403, rien n'est
démarré.

Cache par **tenant + utilisateur** (la requête est filtrée par les permissions,
la réponse dépend donc réellement de l'appelant), TTL
`PORTAL_PROCESS_TEMPLATES_TTL`. `stale` sert la dernière bonne réponse plutôt que
de faire disparaître un bouton qui marchait.

États d'échec distingués, et c'est le point : « rien n'est ouvert ici » est un
**403** définitif, « on n'a pas pu demander » un **502** — l'UI ne dit jamais à un
fournisseur que son type de demande n'existe pas parce que Solr a hoqueté
(`ProductList` : `processUnavailable` vs `noProcess`).

⚠️ **Réserve sur l'identité des ids.** `templateId()` donne
`supplier-referencing` au **premier** modèle de la liste triée par nodeRef. Sur
une instance à plusieurs modèles marqués, importer un modèle dont le nodeRef trie
avant l'actuel **réassigne cet id**. Sans conséquence de sécurité (les deux sont
des modèles fournisseur marqués) et la fenêtre est courte — l'UI renvoie l'id issu
du `GET` du même chargement de page — mais l'id n'est pas aussi stable que son nom
le laisse croire. Correctif propre si le cas se présente : dériver l'id de l'uuid
**toujours**, et ne garder `supplier-referencing` comme alias que lorsqu'il n'y a
qu'un seul candidat.

## Correctifs du tour de vérification (2026-07-30, 16 h)

### Le cloisonnement fournisseur / pilotage ne tenait pas

`requireMonitorAccess()` **réimplémentait localement** le test « est-ce un compte
fournisseur ? » :

```js
const isExternalUser = groups.includes(EXTERNAL_USER_GROUP)     // 'GROUP_ExternalUser'
    || capabilities.isbeCPGExternalUser === true;
```

Or `lib/adapters/session.js` documente, **mesure en main**, que ce marqueur générique ne
suffit pas : `supplier-test@becpg.fr` détient **treize** groupes
`GROUP_EXTERNAL_SUPPLIER_<code>` et **aucun** `GROUP_ExternalUser`. Le fournisseur réel était
donc classé **interne**, tombait dans la branche « aucun groupe de pilotage » et se voyait
répondre :

```
"Votre compte n'appartient à aucun des groupes beCPG qui ouvrent le pilotage :
 GROUP_QualityMgr, GROUP_QualityUser, GROUP_PurchasingMgr, … Demandez le
 rattachement à votre administrateur beCPG."
```

Deux conséquences, aucune visible d'un simple contrôle de code HTTP :

1. **l'invariant §4.6.7 n'était pas appliqué.** « Un `ExternalUser` est refusé *même s'il*
   détient un groupe de pilotage » : le refus venait du test de groupe, donc un compte
   fournisseur possédant aussi `GROUP_RDUser` serait **passé**. Le cas précis contre lequel le
   code déclare se défendre ;
2. **des noms de groupes internes livrés à un utilisateur externe**, avec un conseil absurde
   (« demandez le rattachement »), et la page `/monitor` rendue au lieu de la redirection.

Correctif — une seule ligne, l'unique prédicat déjà partagé avec `resolveSpace()` :

```js
const isExternalUser = isSupplierAccount(groups, capabilities);
```

Mesuré avant / après sur `:3100`, compte fournisseur réel :

| | avant | après |
|---|---|---|
| `/api/v1/monitor/*` | 403 `details.required:[GROUP_QualityMgr,…]` | 403 `details.space:"supplier"` |
| page `/monitor` | **200**, page verrouillée, groupes internes affichés | **307 → `/`**, aucun nom de groupe |
| `admin` sur `:3000` | 200 | 200 (inchangé) |

**Le test existant passait au vert sur le mauvais refus** : il s'arrêtait au code 403.
`04-supplier-journey.spec.js` affirme maintenant le discriminant (`details.space === 'supplier'`),
l'absence de fuite de groupes internes, **et** la redirection de la page. Les deux tests ont été
vérifiés **rouges** en réappliquant l'ancien prédicat, puis verts après restauration : ce ne sont
pas des tests vides.

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
  `.env` **en plus** du fichier d'environnement chargé, donc un `.env` local qui pointe Share sur `:8180`
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

Les 3 erreurs qui restaient dans `components/shell/NotificationBell.js` et `app/help/page.js`
— deux fichiers qu'un agent concurrent réécrivait alors — **ont été corrigées par lui** et le
lint est confirmé propre sur les deux au tour de vérification.

Reste **1 avertissement assumé** : `components/ui/DataTable.js:214`
(`react-hooks/incompatible-library`) — `useReactTable()` de TanStack renvoie des fonctions que
le React Compiler ne peut pas mémoïser. Rien à corriger, c'est la bibliothèque.

## E2E — suite complète au vert

La suite Playwright (`e2e/`, 5 specs, Playwright nu et non le harnais Stagehand+Gemini de
`becpg-boxes/recette` : le DOM React du portail est stable, donc des locators déterministes
sont possibles **et** préférables, et le test juge le succès, jamais un modèle).

**Exécution du 2026-07-30, 17 h — `52 passed`, 0 échec, 1 min 48 s**, les deux instances en
place (voir §Comment reproduire) :

| Spec | Tests | Couvre |
|---|---|---|
| `00-chain.spec.js` | 7 | chaîne portail → beCPG, refus non authentifié, allow-list du proxy, non-injection d'identifiants |
| `01-api-contracts.spec.js` | 12 | contrats `/api/v1`, dont **3 tests de la restriction `bcpg:suppliersAspect`** |
| `02-wizard-share.spec.js` | 5 | webscript Share du wizard, cascade de résolution |
| `03-ui.spec.js` | 18 | 13 écrans dont **`/help`**, bandeau TEST, tenant, 360 px sans débordement, clavier, **chargement effectif de la marque beCPG** (voir §Thème) |
| `04-supplier-journey.spec.js` | 8 | parcours fournisseur réel sur dev, dont **2 nouveaux tests de cloisonnement** |
| `05-no-redirect-loop.spec.js` | 2 | pas de boucle de login sur échec d'étape ; panne amont Share ≠ 401 |

⚠️ **L'arbre de travail bougeait pendant cette exécution** : `05-no-redirect-loop.spec.js` est
apparu à 16 h 05, et six fichiers source (`app/api/auth/login/route.js`, `app/page.js`,
`components/dashboard/ApprovalCard.js`, `components/providers/SessionProvider.js`,
`lib/adapters/wizardConfig.js`, `lib/errors.js`) ont été modifiés par un agent concurrent
**après** le début de la vérification. Le 51/51 a été reproduit à **16 h 17**, l'instance
`:3100` resynchronisée sur l'arbre courant ; il inclut la spec `05` de cet agent, mais **son
travail n'est pas terminé** (35 fichiers modifiés à 16 h 17, contre 20 au départ). À revérifier
lorsqu'il aura rendu la main.

Une exécution intermédiaire a rendu **3 échecs dans `03-ui.spec.js`** (tenant, 360 px, clavier)
puis **17/17 au vert** en réexécutant la seule spec, sans aucune modification entre les deux :
le serveur de dev `:3000` recompilait pendant que l'agent concurrent enregistrait des
composants du shell. **Un échec isolé pendant que quelqu'un d'autre édite l'arbre n'est pas un
défaut** — le rejouer seul avant de conclure est le réflexe correct.

### Ce que le vert ne dit pas

Trois réserves à conserver, sinon le chiffre « 52/52 » se lit pour plus qu'il ne vaut :

1. **`« l'assistant de sa tâche se charge entièrement »` n'affirme pas les champs.** Il vérifie
   la **structure** et l'**état d'accès** sur données réelles, et accepte
   `source ∈ {share, default}`. Résoudre les champs exige une session Share (le connecteur lit
   `/api/metadata`, et `entity-datagrid/config/columns` appelle `AlfrescoUtil.getPreferences`) :
   les deux répondent 401 sans elle, et `DEV_FAKE_AUTH` n'en a pas. C'est écrit dans le test,
   pas caché derrière son vert.
2. **L'échec « 401 » du tour précédent n'était pas un défaut de code.** La suite pointait sur
   une instance absente ou mal configurée. Aucun correctif n'a été nécessaire pour le faire
   passer — seulement les deux instances attendues. À l'inverse, le vert de
   `« l'espace de pilotage lui est fermé »` **masquait** un vrai défaut (§Correctifs) : le
   rouge peut mentir dans un sens, le vert dans l'autre.
3. La suite **écrit sur des environnements partagés**. `04` est lecture seule par conception
   (elle ouvre la tâche et lit les définitions, ne complète rien, ne signe rien) ; les autres
   tournent sur l'instance locale.

## Restriction fournisseur du pilotage — mesurée

`pjt:project` et `qa:nc` ne sont **pas** des entités fournisseur : lues par type seul elles
couvraient toute l'instance. Elles sont restreintes à `ASPECT:"bcpg:suppliersAspect"`
(`PLMModel.ASPECT_SUPPLIERS`), **dans la requête db-afts** et non par post-filtrage — sinon
chaque compteur aurait été silencieusement plafonné à `scanLimit`.

Comptes relevés le 2026-07-30 à 16 h, directement contre Alfresco local (admin, `maxResults=300`,
`hasMoreItems:false` donc exacts) :

| Requête | Sans la clause | Avec la clause |
|---|---|---|
| `TYPE:"pjt:project"` | **173** | **27** |
| `… AND (Planned OR InProgress OR OnHold)` | **131** | **0** |
| `TYPE:"qa:nc" AND -=qa:ncState:"closed"` | **2** | **0** |

**La clause est juste, pas seulement restrictive** — c'est le point à ne pas confondre :

- les **27** projets marqués sont de vraies campagnes fournisseur
  (`Junit Supplier test - REFERENCING - 2026`, …) et **27/27 ont `bcpg:suppliers` peuplé** ;
  `/monitor/campaigns?states=Completed` les renvoie bien (`byState:{Completed:27}`). Toutes
  sont `Completed`, **donc le 0 par défaut est légitime**, pas un filtre cassé ;
- les 131 projets auparavant comptés étaient des projets R&D / démo à `bcpg:suppliers` **vide** ;
  les 13 % de « taux de réponse » de la vue d'ensemble en étaient intégralement dérivés ;
- les **2** NC exclues (`2026-NC-53`, `2026-NC-54`, état `closing`) ont été inspectées une par
  une : **aucune n'a d'attribut `bcpg:suppliers`**. Les exclure est correct, ce n'est pas un
  faux négatif.

Les trois points d'entrée (`/monitor/campaigns`, `/monitor/quality`, `/monitor/overview`)
déclarent la restriction dans leur payload (`supplierScope.applied: true`), ce qui rend un
filtre levé visible depuis l'API et pas seulement dans l'adaptateur.

**Deux exceptions assumées, documentées au point d'appel** — les ajouter aurait cassé des
compteurs qui marchent :

- `overview.queries.lateTasks` (`pjt:taskList`) : une ligne de tâche ne porte aucun aspect
  (`TYPE:"pjt:taskList" AND ASPECT:"bcpg:suppliersAspect"` = **0**) ; les tâches sont cadrées
  par la campagne qui les porte ;
- la jointure des actions correctives dans `listQuality()` (`supplierOnly: false` explicite) :
  les projets de traitement de NC viennent des modèles qualité, qui ne portent pas l'aspect.
  Chaque ligne n'est conservée que si son `pjt:projectEntity` est l'une des NC **déjà
  restreintes**, donc rien ne fuit.

`supplierAspect: null` dans une surcharge de tenant lève la restriction, et le payload rapporte
alors `applied: false`.

## Cloche de notifications — vérifiée au navigateur

Deux défauts indépendants existaient : `Header.js` pointait un `<Link href="/notifications">`
vers une route **inexistante** (404), et le badge venait d'une prop `notificationCount`
qu'**aucune page ne passait** (`AppShell` la laissait à 0), donc jamais affiché.

`components/shell/NotificationBell.js` remplace ce lien mort. Relevés à l'exécution sur
`:3000` (session admin, `total: 455`) :

| Contrôle | Mesuré |
|---|---|
| Icône + badge | `notifications_active` + badge, `aria-label` « Notifications — 455 notifications en attente » |
| Annonce vocale | `role="status"` poli portant le compte ; le badge est `aria-hidden` |
| Clavier | `Entrée` ouvre (22 lignes), `Échap` ferme **et rend le focus à la cloche** (vérifié) |
| **État vide réel** | route stubbée à `total: 0` → icône `notifications_none`, **aucun nœud de badge**, `aria-label` « Aucune notification », panneau « Aucune notification / Rien ne requiert votre attention pour le moment. » |
| Erreurs console | **aucune** |

L'API ne stocke **aucun état de lecture** (spec §7.1) : le badge compte ce qui est **en
souffrance**, et le « nouveau depuis la dernière lecture » est un jeu d'identifiants en
`localStorage`, donc purement navigateur.

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

À dire clairement, par ordre de gravité. La liste a **raccourci** ce tour, et ce qui reste est
ce qui reste vraiment.

1. **Le code flow OIDC contre l'IDS réel.** Tout ce qui a tourné l'a fait via
   `DEV_FAKE_AUTH`, qui court-circuite Keycloak. C'est le mécanisme d'authentification de
   production et **il n'a jamais été exercé** — reste de loin le premier trou. Il porte deux
   conséquences déjà visibles : sans session Share dérivée du jeton, les champs du wizard ne
   se résolvent pas (§E2E réserve 1), et le cloisonnement ne s'est vérifié que sur des
   sessions ouvertes par le raccourci.
2. **L'écriture réelle par un fournisseur.** `04` est **lecture seule par conception** : aucune
   tâche n'a été complétée, aucun formulaire soumis, aucune signature apposée par un compte
   fournisseur. Le parcours se *charge* de bout en bout ; il n'a jamais été *joué* jusqu'à
   l'écriture. C'est la phrase à ne pas laisser glisser vers « le parcours fournisseur est
   validé ».
3. **La visionneuse de signature sur Firefox** (#35696).
4. **Les défauts P1 et P2** (compteur d'agrément qui dépasse son total, CSV tronqué en
   silence) : connus, mesurés, non corrigés.

Sorties de cette liste ce tour, parce que réellement exercées :

- ~~le parcours fournisseur échoue en 401~~ → **51/51**, l’échec était d'environnement ;
- ~~le refus d'un `ExternalUser` sur `/monitor`, jamais observé~~ → observé, **il était cassé**,
  corrigé et couvert par deux tests vérifiés rouges sans le correctif (§Correctifs) ;
- ~~`app/help/` et `NotificationBell.js` ni relus ni testés~~ → relus, exercés au navigateur
  (§Cloche, §4.2), `/help` ajouté à `SUPPLIER_PAGES` donc couvert par la suite.

## Ce que cette consolidation ne dit pas (2026-07-31)

Le tour de consolidation a tourné **à l'aveugle, sur consigne explicite** : aucun
serveur de dev, aucun navigateur, aucune écriture Alfresco. La seule vérification
exécutée est `npx next build` + `npx eslint .` dans une copie `rsync` isolée.
Tout le reste a été vérifié **par lecture du code et des sources beCPG**.

Ce que cela couvre honnêtement :

- une cause supprimée est vérifiable par lecture (F5 : plus aucun lecteur de
  `window.location.search` ; F1 : plus aucun fichier de convention `middleware`) ;
- une décision serveur est vérifiable par lecture (F6 : `canPost` vient de
  `nodePermissions.create` ; F4 : `available:false` ⇒ `downloadUrl: null`) ;
- une chaîne d'appels est traçable (dashboard → `next/link` → `useSearchParams`).

Ce que cela **ne** couvre **pas**, et qu'il ne faut pas lire comme mesuré :

1. **Les trois avertissements de console sont non vérifiés à l'exécution.** On a
   vérifié structurellement qu'ils *ne peuvent plus* se produire (convention de
   fichier absente, `priority` posé, clefs uniques par construction) ; personne
   n'a rouvert une console pour constater leur disparition.
2. **Aucun rendu n'a été observé.** Les panneaux « Document indisponible »,
   « discussion en lecture seule », `processUnavailable` sont lus dans le JSX,
   pas vus à l'écran. Aucune mesure de responsive, aucune vérification
   d'hydratation à l'exécution.
3. **Les chiffres LCP de §`shape.png`** viennent du tour précédent et n'ont pas
   été rejoués.
4. **La découverte de modèles n'a pas été rejouée contre une instance.** Le
   marqueur, lui, a été **relu dans les sources beCPG** ce tour (les deux
   déclarations de la source d'autocomplétion, la ligne du visitor, et le
   contre-exemple `becpg-project-form-config.xml` sans l'aspect). Les nombres
   « 62 modèles → 1 » du tour précédent n'ont pas été remesurés.
5. **Aucune couverture E2E n'a été ajoutée** (Playwright laissé de côté sur
   consigne). Ce qu'un tour de test devra couvrir en priorité :
   - matrice d'authentification du `proxy` (anonyme → 307, `/api/*` → 401,
     tenant discordant, exclusions du matcher) ;
   - clic sur une discussion **depuis le tableau de bord** (transition client,
     pas un rechargement), lien profond à 360 px, `?nodeRef=` inconnu et malformé ;
   - `canPost` vrai/faux : composeur et bouton **absents** (pas seulement
     désactivés) + phrase de raison ; POST refusé en cours de session → 403 et
     disparition du composeur ; compte interne qui garde son composeur ;
   - tâche de signature signée dont la copie de travail a disparu → aucun lien de
     téléchargement ; tâche ouverte lisible → visionneuse + téléchargement ;
   - découverte peuplant le sélecteur de type de demande ; override supprimant la
     découverte ; modèle non fournisseur refusé en 403 ; les trois états dégradés ;
   - un produit avec `rep:reportLocales` renseigné → deux cartes catalogue, badges
     de locale distincts, console propre.

## Défauts signalés à la consolidation, non corrigés

| # | Défaut | Où | Pourquoi pas corrigé |
|---|---|---|---|
| **P6** | `uploadTarget` est construit **inconditionnellement**, donc `/documents` et le `DocumentList` du tableau de bord proposent **Déposer** sur toute exigence du périmètre, y compris sur des entités sans tâche ouverte. Même forme que F6 : on propose, puis beCPG refuse. | `lib/adapters/documents.js` (~ligne 761) | Structurel, non démontré : le jeu de données local n'a d'exigence que sur l'entité inscriptible. Correctif symétrique de F6 — un `canUpload` par entité, issu du même `becpg/security/entitylists/check`, mémoïsé par requête, et pas de `uploadTarget` quand il est faux. Secondairement, filtrer par le même drapeau la liste déroulante d'entités du dépôt libre. |
| **P7** | `/messages` rend le contenu des messages en **texte brut** : le HTML écrit depuis Share s'affiche `<p>test</p>`. | `app/messages/page.js` | Hors périmètre des six défauts. Assainir puis rendre, ou convertir en texte à l'adaptation — décision produit. |
| **P8** | Une branche `status >= 500` reclassée en 403 perd `upstreamStatus` dans ses `details` (seule la branche `UpstreamError` l'ajoute). Le support ne voit plus que c'était un 500. | `lib/errors.js`, `errorFromStatus` | Cohérent avec la branche 401 préexistante, qui a le même trou. À corriger ensemble, pas à moitié. |
| **P9** | L'id `supplier-referencing` peut se réassigner si un second modèle marqué est importé — voir la réserve en §Démarrage d'un processus. | `lib/adapters/processTemplates.js`, `templateId()` | Sans conséquence de sécurité, fenêtre courte. Correctif propre décrit sur place. |
