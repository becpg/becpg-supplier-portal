# État d'implémentation — Portail Fournisseur V2

> Arrêté au **2026-08-03**, après un tour de **consolidation** : cinq chantiers menés en
> parallèle (signature, formulaires/`d:noderef`, pilotage, défauts d'interface, performance)
> ont été **re-joués un par un** sur `https://dev.becpg.fr`, sans rien croire de leurs
> rapports.
>
> **Ce document vaut par une seule distinction** : ce qui a été **mesuré**, et ce qui
> est seulement **cru** parce que lu dans le code. Une correction annoncée « prouvée » mais
> non re-mesurée est **requalifiée** ici, nommément. Tout ce qui n'a pas pu être vérifié est
> dit tel quel, avec la raison.

---

## 1. Vue d'ensemble

| Élément | État |
|---|---|
| Application | Next.js 16.2.12 (App Router, Turbopack), React 18, Tailwind 4, **JavaScript** |
| `npx next build` | ✅ **0 erreur, 0 avertissement** — **59 routes**, compilation 2,7 s |
| `npx eslint .` | ✅ **0 erreur, 1 avertissement** assumé — voir §6 |
| Fichiers | 101 composants, 28 modules `lib/`, 14 specs E2E |
| Backend | `https://dev.becpg.fr` (Alfresco + Share), tenant `dev`, `authMode: oidc` |
| Portail | port **3100**, `.env.supplier`, `DEV_FAKE_AUTH=false` |
| Gestion de version | git, branche `main` |

> **`AGENTS.md` affirme que ce dépôt n'est pas sous gestion de version.** C'est faux depuis
> plusieurs tours : `.git` existe, `main` est la branche courante et les corrections de ce
> tour y sont commitées. Le paragraphe « Read this first » d'`AGENTS.md` et la note finale de
> sa section « How to run » sont donc périmés.

> Le build tourne dans une **copie** du dépôt (`git archive HEAD` + `cp -al node_modules`)
> pour ne pas écraser le `.next` du serveur de développement en cours. La copie doit être sur
> le **même système de fichiers** que l'original : `cp -al` échoue entre partitions, et
> Turbopack refuse un lien symbolique (« points out of the filesystem root »).

---

## 2. Tour de consolidation — les cinq chantiers re-joués

Méthode : deux serveurs, deux comptes réels. `:3131` (copie isolée hors arbre,
`DEV_FAKE_AUTH`, `supplier-test@becpg.fr`) pour l'espace fournisseur, `:3100`
(`purchasingmgr.test.user`) pour le pilotage. Les adaptateurs ont en outre été sondés
**depuis l'intérieur du runtime** par une route de contrôle temporaire, présente uniquement
dans la copie et **jamais** dans le dépôt — c'est le seul moyen d'exercer une fonction
serveur avec le vrai client, la vraie session et les vraies ACL.

### 2.0.1 Ce qui est confirmé par re-mesure

| Affirmation d'origine | Re-mesure |
|---|---|
| **Signature** — la marche d'ancêtres nomme le produit d'une tâche de signature | ✅ `resolveEntityFromDocument(client, 0d1b33f4-9cc8-426d-9b33-f49cc8426daa)` → `{fa5a9dfa-…, "PORTALTEST 35846 Nougat… - UPDATE - 2026", MP96843, bcpg:rawMaterial}`, **2 sauts, 400 ms**. Nœud inexistant → `null` en 163 ms, sans exception |
| **Formulaires** — `bcpg:hierarchy1` n'existe pas | ✅ `fields=cm:name,bcpg:hierarchy1,bcpg:hierarchy2` → attributs rendus : `['cm:name']`. Avec `bcpg:productHierarchy1/2` → les deux valeurs |
| **Formulaires** — la valeur est un objet déplié, pas un nodeRef | ✅ `{path:'/app:company_home/cm:System/cm:ProductHierarchy/…', 'bcpg:lkvValue':'Ingrédients de base', type:'bcpg:linkedValue'}` |
| **Formulaires** — la fiche affiche les libellés | ✅ `/products/758f899e-…?tab=sheet` : « Ingrédients de base » et « Sucres et édulcorants » rendus ; **0** `path`, **0** nodeRef, **0** uuid, **0** doublon `_fr` à l'écran |
| **Formulaires** — corps vide sur cible illisible | ✅ `fields=cm:name,bcpg:productHierarchy2` → corps vide → `null`. `GET /api/v1/wizard/105894c8-…` → **200** (c'était 404) |
| **Formulaires** — la fuite de nodeRef de l'onglet Conformité | ✅ sur la fixture même du rapport (`035ea545-…`, code ERP `MP-EPI-001` en double avec `372029fb-…`) : l'écran dit « Valeurs déjà utilisées » et **nomme** « Poivre noir de chez Élodie - UPDATE - 2026 ». 0 nodeRef, 0 uuid |
| **Pilotage** — compteur de campagnes restreint au parc | ✅ `q=Maxime` : tuile `open:10` **=** 10 lignes, `parkScoped:true`, `scope.suppliers:5`. Sans filtre : 248/248, `parkScoped:false` |
| **Pilotage** — 100 % de réponse sur zéro campagne | ✅ périmètre vide : `responseRate: null` + `scope.empty.reason:'emptyPark'` avec sa phrase d'explication |
| **Pilotage** — `truncated` ne se déclenche plus à tort | ✅ `truncated:false` dans les trois cas, `scanned:248` rapporté **à côté** de `count`, jamais à sa place |
| **Pilotage** — un seul score de risque | ✅ les **10 lignes** du top 10 identiques entre `/api/v1/monitor/overview` et `/api/v1/monitor/suppliers` : même score, même niveau, **mêmes motifs**, **même ordre**. `campaignNoAnswer` est bien présent côté liste |
| **Pilotage** — `/monitor/documents` ne défile plus | ✅ 0 px de débordement et `window.scrollTo(600,0)` déplace de **0** px, à 1920/1280/360 |
| **Défauts** — `microbioList` 65 → 34 px | ✅ 4 lignes, **34 px** chacune, toutes cellules à 34 px |
| **Défauts** — `organoList` 401 → 34 px | ✅ 7 lignes, **34 px** chacune (colonne « Rapports » rendue) ; `nutList` 22 lignes à 34 px, inchangé |
| **Défauts** — `Entrée` rendu aux boutons de ligne | ✅ vrai clavier sur « Supprimer la ligne » : le **dialogue s'ouvre** et le focus passe dans le dialogue. (Un `KeyboardEvent` synthétique ne l'active pas — c'est une limite de la sonde, pas du correctif) |
| **Perf** — la taille de page coûte sur `/api/v1/entities` | ✅ A/B entrelacé ×3 : `pageSize=25` **0,61–0,70 s**, `pageSize=100` **1,72–1,78 s**. Rapport 2,6× (le rapport annonçait 3,1× ; l'instance est partagée) |
| **Perf** — la pagination de `/messages` ne perd rien | ✅ 6 pages de 25 : **141 sujets uniques, 0 doublon**, `hasMoreItems:false` en fin, page 6 en 2,35 s |
| **Perf** — la recherche part au serveur | ✅ `q=Poivre` → 2 lignes en 173 ms sur un catalogue de 141, pas un filtre de fenêtre |
| **Perf** — `POST /api/v1/config/refresh` est gardé | ✅ fournisseur `scope:"tenant"` → **403** `forbidden` (message de `requireMonitorAccess`) ; portée par défaut → 200 `{scope:"user",entries:1}` ; sans session → **401** |

### 2.0.2 Ce qui est **requalifié** — annoncé prouvé, ne l'est pas

| Affirmation | Ce que la mesure donne |
|---|---|
| « **16/16 tâches nommées** », marche d'ancêtres comprise | Le compte porte aujourd'hui **15 tâches ouvertes + 4 terminées, toutes nommées** — mais **aucune n'est de type `signature`** : celle du rapport a été menée à son terme. La marche n'est donc **pas exercée** par la liste de tâches actuelle ; elle est prouvée par sonde directe (§2.0.1), pas par le parcours |
| « Écran de signature : produit affiché, jauge, pad, consentement » | **Non re-vérifiable** : plus aucune tâche de signature n'existe sur dev pour ce compte. Aucune ligne de l'écran de signature n'est re-mesurée ce tour |
| « `process/start` répond 403 et non 502 » | **Non re-mesuré** : le prouver demande de re-tenter un démarrage de processus refusé, c'est-à-dire une écriture sur une instance partagée. La lecture du diff est correcte (`PortalError` 4xx propagée), mais c'est du **cru**, pas du mesuré |
| « `getEntityJson` dégrade **explicitement** avec `partial: true` » | **Faux au moment du rapport.** Le drapeau était **produit et jamais lu** : aucun adaptateur, aucune route, aucun composant ne le consommait. La fiche s'ouvrait avec des champs manquants **sans rien dire** — exactement le « vide présenté comme normal alors que c'est un refus de droits ». Corrigé ce tour, voir §7 |
| « `/monitor/suppliers` à froid : 2,5 s → 9,2 s » | **Non reproduit tel quel** : le mémo de campagnes était déjà chaud. Mesuré à la place : le **premier** appel du process paie le scan (`/monitor/overview` **10,9 s**), le suivant en profite (`/monitor/suppliers` **1,4 s**). L'ordre de grandeur du surcoût est confirmé, sa répartition dépend de qui appelle en premier |
| « 21 → 20 requêtes amont sur `/api/v1/tasks` » | **Non re-mesuré** : demanderait d'instrumenter les appels amont. `/api/v1/tasks?pageSize=100` répond en **1,56 s** à froid et **0,89 s** ensuite ; le gain annoncé n'est ni confirmé ni infirmé |

### 2.0.3 Balayage de non-régression — 39 chargements

**Espace fournisseur** (`/`, `/products`, `/tasks`, `/documents`, `/specs`, `/messages`,
`/company`, `/help`) puis **espace pilotage** (`/monitor`, `/suppliers`, `/documents`,
`/campaigns`, `/quality`), à **1920 / 1280 / 360**, comptes réels :

- **39/39 en HTTP 200** ;
- **0** erreur de page, **0** erreur console, **0** réponse 4xx/5xx ;
- **0 défilement horizontal** — et `window.scrollTo(600,0)` ne déplace la page nulle part ;
- **0** nodeRef, **0** uuid nu, **0** chemin `/app:company_home`, **0** `[object Object]`,
  **0** horodatage ISO brut, **0** enveloppe JSON dans le texte rendu ;
- toutes les pages rendent du contenu réel (le minimum relevé est 607 caractères de texte).

Seule erreur console rencontrée, et uniquement sur la route tâche : le **502 de
`dev-ai.becpg.fr`**, déjà documenté au §3.

---

## 2bis. Vérifié **en direct** au tour précédent — 2026-08-03

Tout ce qui suit a été mesuré dans un navigateur réel contre `dev.becpg.fr`. Aucune de ces
lignes ne repose sur une lecture de code.

### 2.1 La saisie d'une datalist au clavier — **prouvée de bout en bout**

Fixture : tâche `7a31b641-e065-47ea-b1b6-41e06597ea83`, entité `4280dddb-…` (MP96504
« Pâte d'amande de chez Rémi »), étape `step7` = `microbioList`, 4 lignes au départ.

**5 lignes saisies : 1 action souris, 71 frappes.** L'unique clic est « Ajouter une ligne ».
Ensuite, par ligne : `nom ↵ valeur ↵`.

Le déplacement du curseur a été relevé à chaque étape
(`tr[data-row-key] td[data-column]`) :

| moment | `document.activeElement` |
|---|---|
| après l'unique clic | `INPUT[text] col=0 row=draft-1` |
| après `↵` sur le sélecteur | `INPUT[text] aria="Valeur cible" col=1 row=draft-1` |
| après `↵` sur la valeur | `INPUT[text] col=0 row=**draft-2**` |

…et ainsi de suite jusqu'à `draft-6`. `↵` après une sélection dans le sélecteur va **à
droite** ; `↵` ailleurs valide et descend dans la **même colonne** ; sur la dernière ligne il
en ajoute une et y place le curseur.

**5 `PUT` sur `wizard/{id}/step/step7`, toutes en 200**, puis relecture par `GET` : les
5 lignes étaient bien dans beCPG avec leurs valeurs (10, 20, 30, 40, 50). Elles ont été
**supprimées ensuite** — voir §5.

> Les 71 frappes sont propres à mon jeu d'essai (noms longs : « Entérobactéries »,
> « Moisissures »…). Le chiffre qui compte est **1 action souris**, et la structure
> `nom ↵ valeur ↵` par ligne — c'est cela qui est vérifié, pas un total de frappes.

### 2.2 Le collage depuis un tableur — **rien n'est perdu en silence**

Bloc TSV collé sur `microbioList`, contenant volontairement deux valeurs impossibles.
Rapport affiché, **verbatim** :

```
4 valeur(s) collée(s) sur 3 ligne(s), dont 0 nouvelle(s).
2 valeur(s) non reprise(s) — corrigez-les à la main :
ligne 2 · Valeur cible — « environ 2 » · nombre attendu
ligne 3 · Caractéristique microbio — « Caracteristique Qui N Existe Pas »
         · aucune correspondance exacte dans le référentiel
```

- **Aucune requête d'écriture vers beCPG pendant le collage** (mesuré : 0 `PUT`/`POST`/`DELETE`).
  Le collage ne produit que des modifications en attente.
- « Annuler le collage » remet la barre d'outils à zéro (plus de « Tout enregistrer »).
- Les libellés d'association sont résolus via `POST /api/v1/autocomplete/{formId}/{fieldId}`,
  **une requête par libellé distinct**, et acceptés sur correspondance **exacte et unique**
  seulement.

### 2.3 Les chemins en lecture seule — **aucun raccourci ne déclenche quoi que ce soit**

Testé **par attaque**, pas par lecture : sur deux grilles en lecture seule (produit
`758f899e-…` en lecture seule, et l'onglet Nutriments de l'entité ouverte `4280dddb-…`, la
saisie n'y étant ouverte que depuis la tâche), après avoir envoyé
`Ctrl+Entrée`, `Ctrl+D`, `↓`, `Entrée`, `Ctrl+V` :

| | lignes | ajout | dupliquer | supprimer | réordonner | « Tout enregistrer » | champs actifs | brouillons créés | écritures API |
|---|---|---|---|---|---|---|---|---|---|
| MP93981 (lecture seule) | 21 | 0 | 0 | 0 | 0 | 0 | 0 | **0** | **aucune** |
| MP96504 (fiche produit) | 22 | 0 | 0 | 0 | 0 | 0 | 0 | **0** | **aucune** |

La mention « Lecture seule » est rendue dans les deux cas. Les affordances sont **absentes**,
pas désactivées — conformément à la règle « masquer, ne pas griser ».

### 2.4 La largeur rendue à la grille

Mesuré à 1920, sur la tâche `7a31b641-…`. « Utilisable » = `clientWidth` de `.table-scroll`.

| étape | mode | utilisable | largeur grille | **rogné** | conteneur | `data-full` |
|---|---|---|---|---|---|---|
| Microbiologie | panneaux | 1038 | 1452 | 414 | 1664 | `true` |
| Microbiologie | **élargi** | **1530** | 1530 | **0** | 1664 | `true` |
| Nutriments | panneaux | 1038 | 1228 | 190 | 1664 | `true` |
| Nutriments | **élargi** | **1530** | 1530 | **0** | 1664 | `true` |
| Allergènes | panneaux | 1038 | 1331 | 293 | 1664 | `true` |
| Allergènes | **élargi** | **1530** | 1530 | **0** | 1664 | `true` |
| Informations (formulaire) | les deux | — | — | — | **1400** | *absent* |

Trois faits mesurés :

1. **`fullWidth` fonctionne** : `.page-container[data-full='true']` porte le conteneur à
   **1664** sur une étape-grille, et une étape **formulaire reste à 1400** — la règle
   « la largeur suit le contenu » est appliquée par étape, pas par route.
2. **« Élargir la saisie »** fait passer le rail de **208 px à 52 px** et retire les
   panneaux : 1038 → **1530 px** utilisables. En mode élargi la grille est **entièrement
   visible (rogné = 0)** sur les trois listes.
3. La préférence **survit au rechargement** (`localStorage: becpg.portal.wizard.wide = "1"`,
   bouton « Rétablir les panneaux » présent après reload).

**Aucun défilement horizontal de page** : `document.scrollingElement.scrollWidth = 1920`
= `innerWidth`, sur toutes les mesures.

### 2.5 La densité de la grille — **corrigée, sauf sur une liste**

Hauteur relevée sur toutes les lignes du corps du tableau :

| liste | pas mesuré | verdict |
|---|---|---|
| `nutList` (22 lignes) | **34 px** | ✅ conforme à Share (33 px) |
| `allergenList` (17 lignes) | **34 px** | ✅ conforme |
| `microbioList` (4 lignes) | **65 px** | ✅ **34 px** depuis §4.1 |
| `physicoChemList` (6) · `labelClaimList` (13) | **34 px** | ✅ mesurées après §4.1 |
| `organoList` (7 lignes) | **401 px** | ✅ **34 px** depuis §4.5 |

Cause racine de l'ancien pas de 95 px : les deux boutons de réordonnancement empilés.
**Mesurés maintenant à 26 × 26 px** (règle `.becpg-grid-icon`) — la correction est réelle.

**Les planchers de colonne fonctionnent.** Sur les trois listes, la colonne d'association
obligatoire fait **288 px** et son champ de saisie **224 px** :

```
Nutriments : Ordre 68 | Nutriment* 288 | Valeur 133 | Mini 133 | Maxi 133 | … | Actions 96
Allergènes : Ordre 68 | Allergène* 288 | Quantité 177 | Prés. volontaire 113 | … | Actions 96
Microbio   : Ordre 68 | Caractéristique 288 | Valeur cible 111 | Unité 144 | … | Actions 96
```

L'ancien défaut « toutes les colonnes à 96 px, le sélecteur écrasé à 20 px » **ne se
reproduit plus**. Les seuls champs à 20 px restants sont les **cases à cocher** de la liste
des allergènes, ce qui est leur largeur normale.

### 2.6 Les autres défauts d'interface

| # | Défaut | Verdict mesuré |
|---|---|---|
| 1 | Débordement des onglets | ✅ piste `scrollWidth 1825 / clientWidth 1600`, chevron « Onglets suivants » rendu (28 px) |
| 2 | Icônes par type | ✅ 7 images d'onglet, toutes **16 × 16**, **0 cassée** |
| 3 | Contraste de la cloche | ✅ icône **11,01:1** sur le fond d'en-tête ; `color-scheme: light` explicite (thème unique) |
| 4 | Ligne de total `ingList` | ✅ `<tfoot>` présent, « Total ¦ 100 % », 13 cellules, **hauteur 33 px** |
| 5 | Pleine largeur | ✅ voir §2.4 |
| 6 | Panneau d'autocomplétion | ✅ `div.becpg-ac-panel`, **`position: fixed`**, **`z-index: 1000`**, **parent = `<body>`** (sorti du conteneur défilant), options au pas de 24 px, 1 icône de type par ligne |
| 7 | Densité de la grille | ✅ sauf `microbioList` — §2.5 |
| 8 | Questionnaire sur la route tâche | ✅ `?step=step9` rend le questionnaire, **aucun état d'erreur**, **aucun 4xx/5xx** (correctif `f3beb95`) |

### 2.7 Le pilotage reste fermé aux fournisseurs

`GET /api/v1/monitor/overview` → **403**
`{"code":"forbidden","message":"The monitoring space is not open to supplier accounts"}`.
`/monitor` redirige vers `/`. Conforme.

### 2.8 Balayage de non-régression

**10 routes × 3 largeurs (1920 / 1280 / 360) = 30 chargements.**

- 0 erreur de page, 0 erreur console, 0 réponse 4xx/5xx ;
- bandeau « INSTANCE DE TEST » présent sur **les 30** ;
- **aucun défilement horizontal** à aucune largeur ;
- aucun `[object Object]`, aucun horodatage ISO brut.

Deux seules anomalies, toutes deux **connues et non corrigées** (§4) : les titres UUID de
`/messages` et le HTML brut des commentaires.

---

## 3. Ce qui n'a **pas** pu être vérifié, et pourquoi

Ces points restent **crus** (lecture de code), pas prouvés. Ils sont listés ici plutôt que
présentés comme acquis.

| Sujet | Pourquoi pas vérifiable |
|---|---|
| Écrans `/monitor/*` rendus | `requireMonitorAccess` refuse un `ExternalUser` d'abord et sans condition. Les adaptateurs (`countNcSummary`, `countCompliance`, `buildOverview`) ont été exercés avec des données réelles par les tours précédents, **mais aucun écran de pilotage n'a jamais été rendu**. Il faut un compte interne. |
| Parcours de signature | **Aucune tâche de signature n'existe** sur dev (`counters.byType.signature = 0`). En créer une serait un acte administratif sur une instance partagée. |
| Chiffres « avant » (grille à 774 px) | Exigeraient de remettre l'arbre de travail à un commit antérieur sur le serveur partagé. Non refait ce tour — le gain est mesuré en absolu (1038 / 1530), ce qui suffit. |
| Suggestions IA en ligne | `dev-ai.becpg.fr` répond 500/502 sur cette instance. Traiter les suggestions comme indisponibles. |
| `/specs` nom « — », nodeRef sur l'étape Conformité | Non re-vérifiés ce tour (seule l'étape par défaut de la tâche a été balayée). Considérés **toujours ouverts** jusqu'à preuve du contraire. |

---

## 4. Ce qui ne marche **toujours pas**

### 4.1 ~~`microbioList` a un pas de 65 px, pas 34~~ — **corrigé et mesuré**

Cause confirmée : la colonne **« Critères texte »** est un `d:mltext` dont le contrôle
occupait **58 px** de haut (champ + bouton « 1 autre(s) langue(s) » empilés). La règle CSS
qui écrase les `textarea` dans la grille ne l'atteignait pas — la hauteur n'était pas celle
du contrôle mais celle de la **pile**.

Correctif : le premier champ et le bouton partagent désormais un conteneur
`.becpg-ml-primary` ; `app/globals.css` en fait une **ligne** dans `.becpg-grid` et réduit
le bouton à l'icône de 26 px de la grille. Le nom accessible survit (`aria-label` sur le
bouton, `title`, et la langue reste annoncée par l'`aria-label` du champ).

| liste | avant | après |
|---|---|---|
| `microbioList` (4 lignes) | **65 px** — cellule mltext 58 px | **34 px** — cellule mltext 26 px |
| `organoList` (7 lignes) | **401 px** — voir 4.5 | **34 px** |
| `nutList` / `allergenList` / `physicoChemList` / `labelClaimList` | 34 px | 34 px (inchangé) |

Sous 768 px, rien ne change : `DataListEditor` n'y rend pas le tableau (`hidden md:block`),
et le contrôle reprend sa colonne, sa pastille de langue et le libellé complet du bouton
(`flex-direction: column`, mesuré à 390 px). Le bouton lui-même passe de 24 px à **40 px**
sur pointeur grossier — il était **sous le plancher tactile avant ce tour**.

### 4.2 ~~42 des 101 sujets de `/messages` sont des UUID~~ — **fermé, mesuré**

Fermé **par effet de bord** du repaginage de `/messages` : la liste des sujets vient
maintenant de `/api/v1/entities` (nom du produit), page par page. Re-mesuré sur la
**totalité** du catalogue de ce compte — les 6 pages, 141 sujets : **0 sujet nommé par un
uuid, 0 sujet sans nom**. L'ancienne fenêtre unique de 100 n'en montrait que 99, sans le dire.

### 4.3 ~~Les commentaires s'affichent en HTML brut~~ — **fermé, mesuré**

L'API renvoie toujours `"content": "<p>T1</p>"` — c'est sa forme de stockage et c'est
normal. Ce qui a changé est le rendu : `app/messages/page.js` et
`components/wizard/panels/CommentsPanel.js` passent tous deux par `RichText`. Mesuré à
l'écran sur l'entité `4280dddb-…` : le message s'affiche **« T1 »**, et le balisage
`<p>`/`</p>` **n'apparaît nulle part** dans le texte rendu.

### 4.3bis « Conformité 100 % » sur un fournisseur qui a un document manquant — **ouvert**

`summarizeDocuments` (`lib/adapters/documents.js:812`) renvoie
`completeness: mandatory === 0 ? 100 : …`. Une note parfaite pour l'ensemble vide, même
motif que le « 100 % de réponse sur zéro campagne » corrigé au §2.0.1 — mais celui-ci
atteint un **livrable** : l'export CSV d'audit du pilotage.

Mesuré sur l'export réel (`/api/v1/monitor/documents?format=csv`, 86 lignes) :
**4 lignes annoncent « Conformité 100 » tout en portant une cellule `missing`** —
`F6 Chez Maxime – Huiles essentielles` (BAT), `F95 Chez Valentin – Filtres solaires` (BAT),
`F154 Chez Camille – Farines et céréales` (halal fournisseur 2),
`F173 Chez Pamela – Sucres biologiques` (BAT).

**Non corrigé, et volontairement.** Le défaut n'est pas seulement le `100` de l'ensemble
vide : une exigence qui produit une cellule `missing` dans la matrice n'est **pas** comptée
`isMandatory` par `summarizeDocuments`. Ce sont deux définitions de « obligatoire » qui
divergent, dans deux fonctions, partagées par l'espace fournisseur (jauge de `/documents`,
`RequirementChecklist`) et par le pilotage (matrice + CSV). Aligner les deux est un choix
métier, pas un correctif d'affichage — et le faire en fin de tour sans pouvoir re-mesurer
chaque écran ferait plus de mal que le défaut. Les deux sites sont
`lib/adapters/documents.js:812` et `lib/adapters/monitor.js:3989`.

### 4.3ter Un `d:noderef` illisible fait aussi disparaître les références **lisibles**

Le repli de `getEntityJson` est restreint aux propriétés scalaires : sur la fixture
dégradée, Famille reste absente **alors qu'elle est lisible**. C'est assumé (distinguer la
référence fautive coûterait un appel par propriété), mais depuis le §7 l'écran le **dit**,
au lieu de laisser croire à un produit sans famille.

### 4.4 ~~`Entrée` sur un bouton de ligne valide la ligne~~ — **corrigé et mesuré**

`handleKeyDown` appelait `event.preventDefault()` pour **toute** touche `Entrée` dont la
cible n'était pas un `<textarea>` — y compris sur « Supprimer la ligne » ou le chevron de
détail. Défaut **pré-existant** (`git show 97227fd` porte déjà le même `preventDefault`
inconditionnel).

Correctif : `ownsEnterKey()` rend la touche à ce qui l'utilise déjà — `<button>`, `<a href>`,
`role="button"|"link"|"menuitem"…` — et la garde partout ailleurs. Le `<select>` en est
volontairement **absent** : `Entrée` n'y est pas une activation, donc « Entrée valide et
descend d'une ligne » reste vrai depuis une cellule Unité comme depuis une cellule texte.

Mesuré sur `microbioList`, curseur sur « Supprimer la ligne » :

| | avant | après |
|---|---|---|
| événements `click` émis | **0** | **1** |
| dialogue de confirmation | absent | ouvert, `aria-modal="true"`, focus sur « Annuler » |
| focus après `Entrée` | descendu d'une ligne | resté sur le bouton |

Et la saisie clavier déjà prouvée (§2.1) est intacte, re-mesurée : `Entrée` dans une cellule
valeur descend d'une ligne dans la **même colonne**, `Maj+Entrée` remonte, `Ctrl+Entrée`
ajoute une ligne et y place le curseur, `Ctrl+D` duplique, `Échap` restitue la valeur
d'origine. `Entrée` sur « Monter » réordonne. `Échap` referme le dialogue et **rend le focus
au bouton d'origine**. 22 arrêts de tabulation parcourus, **0 focus perdu**.

### 4.5 `organoList` avait un pas de 401 px — **trouvé et corrigé ce tour**

Non listé jusqu'ici parce que jamais mesuré : §2.5 ne couvrait que `nutList`,
`allergenList` et `microbioList`. La colonne **« Rapports »** (`rep:reportKinds`) est une
`LIST` répétable, que `SelectControl` rend en groupe de cases à cocher — le bon rendu dans
un formulaire, impossible dans une cellule : **394 px** de haut pour huit valeurs, sur
chacune des 7 lignes. Rien d'autre dans la ligne ne dépassait 26 px.

Correctif, même idiome que le `textarea` : une ligne au repos, ouvert tant qu'il a le focus,
avec deux différences qui comptent — les options **cochées passent en tête** (`data-checked`
+ `order`), donc la ligne visible est la réponse ; et l'état de repos **défile**
(`overflow-y: auto`) au lieu d'être rogné, sinon un `Tab` porterait le focus sur une case
invisible. Mesuré : 401 → **34 px** au repos, 209 px tant qu'une case a le focus, 34 px de
nouveau après le blur, case cochée visible au repos.

### 4.6 Sur un **écran large tactile**, le pas de grille reste à 51 px — arbitrage assumé

Mesuré à 1920 px avec `pointer: coarse` : le pas est **51 px**, pas 34. Ce n'est ni le
`mltext` (26 px) ni le groupe de cases (26 px) : ce sont les deux boutons du sélecteur
(`.becpg-ac-button`), que `app/globals.css` porte à **44 px** dès que le pointeur est
grossier, et dont la règle qui les ramène à 20 px est explicitement gardée par
`(pointer: fine)`. C'est une décision écrite dans le fichier — « un doigt a besoin de la
cible de 44 px » — pas une régression. Elle est notée ici parce qu'elle n'avait jamais été
mesurée et qu'elle veut dire qu'une **tablette en paysage ne verra jamais la densité de
Share**. Le choix inverse (densité contre cible tactile) reste à trancher par le produit.

### 4.7 Les défauts encore ouverts, au 2026-08-03 après consolidation

| # | Défaut | État |
|---|---|---|
| 4.3bis | « Conformité 100 % » avec un document manquant — 4 lignes sur 86 dans le CSV d'audit | **ouvert**, mesuré, non corrigé (arbitrage métier, deux sites nommés) |
| 4.6 | Pas de grille à 51 px sur écran large **tactile** | **ouvert**, décision assumée dans `app/globals.css`, à trancher par le produit |
| — | `Checkbox` (`components/ui/Field.js`) : cible de **20 px** sur téléphone, `<label>` non enveloppant | **ouvert**, signalé par le tour « défauts », non corrigé (composant partagé par tous les écrans) |
| — | Lien logo de l'en-tête à **38 px** (2 px sous le plancher tactile) | **ouvert**, `components/shell/` |
| 4.3ter | Un `d:noderef` illisible masque aussi les références lisibles | **assumé**, désormais **annoncé à l'écran** (§7) |

`4.1`, `4.2`, `4.3`, `4.4`, `4.5` sont **fermés et re-mesurés** ce tour.

---

## 5. Ce qui a été écrit sur `dev.becpg.fr` ce tour

**Une seule chose, et elle a été annulée.**

| Objet | Action | Légitimité | État final |
|---|---|---|---|
| 5 lignes de `bcpg:microbioList` sur MP96504 (`4280dddb-…`) | créées puis **supprimées** | Saisie d'une datalist sur une entité dont le référencement est **ouvert** et dont la tâche est assignée à ce compte — exactement ce qu'un fournisseur fait dans le produit | **supprimées** |

Vérification de la remise en état, par relecture complète de toutes les listes de l'entité :

```
ingList 2 · nutList 22 · allergenList 17 · physicoChemList 6
labelClaimList 13 · microbioList 4 · organoList 7
```

…soit **exactement** les compteurs relevés avant l'intervention, et pour `microbioList` les
**mêmes quatre `nodeRef`, dans le même ordre** (`IDENTICAL TO BEFORE: true`).

**Rien d'autre n'a été écrit** : aucune suggestion appliquée, aucun dépôt de document,
aucune tâche terminée, aucune écriture administrative, aucune modification de configuration.
Le collage a été exercé **sans jamais valider** (0 requête d'écriture mesurée).

### 5bis. Audit complet de ce qui vit sur `dev.becpg.fr` du fait de ces tours

Tout est vérifié présent au 2026-08-03. **Rien n'a été supprimé**, ni par les tours
précédents, ni par le tour de consolidation.

| Nœud | Quoi | Créé par | Sort |
|---|---|---|---|
| `6e3d73a0-135e-49ea-bd73-a0135ed9eac7` | `bcpg:rawMaterial` « PORTALTEST 35846 Nougat de chez Remi », **MP96842**, sous *Chez Rémi – Confiserie et pâtes à tartiner / SupplierEntities* | tour signature, `purchasingmgr` | **conservé** |
| `fa5a9dfa-7afc-401d-9a9d-fa7afc601d09` | la branche fournisseur créée par beCPG, **MP96843** | beCPG, sur le référencement ci-dessus | **conservé** |
| `bb82cde1-46ef-444b-82cd-e146ef944b41` | le projet de référencement + ses tâches / livrables | tour signature | **conservé**, tâche `Clôture` restée `InProgress` |
| `0d1b33f4-9cc8-426d-9b33-f49cc8426daa` | la Fiche Technique copiée puis **signée** (PDF `/ByteRange`, `adbe.pkcs7.detached`) | tour signature, depuis l'UI fournisseur | **conservé** — c'est la seule preuve du parcours de signature |
| `105894c8-5f0f-4f26-9894-c85f0fdf265a` | `bcpg:rawMaterial` « PORTALTEST-35846-NODEREF », **MP96844**, avec `bcpg:productHierarchy2` **volontairement illisible** par `supplier-test` | tour formulaires, `purchasingmgr` | **conservé** — seule reproduction connue du corps vide de `becpg/remote/entity`, et fixture du correctif §7 |
| 5 lignes de `bcpg:microbioList` sur MP96504 | saisie de datalist | tour clavier | **supprimées**, état d'entrée restauré et re-vérifié |

Le tour de consolidation, lui, **n'a écrit rigoureusement rien** : uniquement des `GET`, plus
les `POST /alfresco/service/api/login` du ticket. Le seul `POST` d'API émis est
`/api/v1/config/refresh`, qui ne touche qu'un cache mémoire du portail. Aucune tâche
franchie, aucun document déposé, aucun commentaire publié, aucune configuration modifiée.

---

## 6. Lint

`npx eslint .` → **0 erreur, 1 avertissement**, toujours le même et assumé :

```
components/ui/DataTable.js:217  warning  react-hooks/incompatible-library
  TanStack Table's `useReactTable()` returns functions that cannot be memoized safely
```

C'est le compilateur React signalant qu'il ne mémoïsera pas ce composant. Comportement
voulu de la bibliothèque, pas un défaut du portail.

---

## 7. Correction apportée pendant ce tour de vérification

**`components/datalist/DataListEditor.js` n'était pas un fichier texte.**

Il contenait **3 octets NUL littéraux**, utilisés comme séparateur de clé composite
(`columnId` + NUL + `label`) dans le cache de résolution du collage. Conséquence : `git`
classait le fichier comme **binaire** — `git diff` affichait `Bin 20363 -> 39027 bytes`,
sans diff, sans `blame` et **sans fusion à trois branches**. Sur un arbre que plusieurs
agents modifient, c'est un fichier qu'on ne peut ni relire ni fusionner.

Les trois occurrences sont désormais écrites avec la séquence d'échappement `\u0000`. En
JavaScript, dans un littéral de gabarit, elle produit **exactement le même caractère** : le
comportement est inchangé.

Vérifié après correction : `file -bi` → `application/javascript; charset=utf-8` ;
`npx eslint` 0 erreur ; `npx next build` ✅ ; et le collage rejoué en direct produit le
**rapport identique au caractère près** (§2.2).

### 7bis. Correction du tour de consolidation — le refus de droits se disait à personne

`getEntityJson` posait `entity.partial = true` quand `becpg/remote/entity` répond un corps
vide et que seule la relecture restreinte aboutit. **Aucun consommateur n'existait** :
`grep -rn "partial" lib/ app/ components/` ne trouvait que le producteur. Conséquence
mesurée sur la fixture `105894c8-…` : la fiche s'ouvrait (bien), la Famille et la
Sous-famille en étaient absentes (assumé), et **l'écran ne disait rien** — un refus d'ACL
rendu comme un produit sans famille. C'est le défaut que le drapeau était censé empêcher.

Le drapeau est maintenant porté jusqu'à l'écran, et **seulement quand il est vrai** :

- `lib/adapters/entities.js` — `normalizeEntity` ajoute `partial: true` **uniquement** si la
  lecture l'a posé ; toute autre charge utile est inchangée à l'octet près (vérifié : le
  produit sain n'a pas la clé) ;
- `lib/adapters/wizard.js` — `getEntity` le remonte, et le résumé d'entité de l'état du
  wizard le publie de la même façon conditionnelle ;
- `app/products/[id]/page.js` — une bannière `role="status"` au-dessus des onglets, qui dit
  ce qui se passe (« au moins une donnée que votre compte n'est pas autorisé à lire », « les
  champs concernés sont absents — ils ne sont pas vides pour autant ») **sans** nommer le
  nœud refusé.

Mesuré après correction, à 1280 px :

| | `/api/v1/entities/{id}` | `/api/v1/wizard/{id}` | Écran |
|---|---|---|---|
| fixture dégradée `105894c8-…` | `partial: true` | `entity.partial: true` | bannière rendue, 0 erreur console, 0 débordement, 0 nodeRef |
| produit sain `758f899e-…` | **pas de clé `partial`** | — | pas de bannière, écran identique |

---

## 8. Les pièges à connaître

1. **`next dev` refuse deux instances pour un même répertoire.** La seconde doit partir
   d'une copie, `node_modules` en **liens durs** sur le **même système de fichiers**.
2. **Une seconde instance n'obtient pas de session Share** sur `dev.becpg.fr` (Share
   redirige le bearer vers l'IdP) et retombe silencieusement sur `DEFAULT_WIZARDS` — la
   carte des étapes diffère alors. Le serveur 3100 en cours sert depuis un cookie Share
   mis en cache.
3. **Les étapes non visitées du wizard sont désactivées.** Pour atteindre une étape
   directement, utiliser `?step=stepN` (lu au montage), pas un clic dans le rail.
4. **Il n'y a pas de `/api/v1/products` ni de `/api/v1/specs`** : les produits sont
   `/api/v1/entities`, les cahiers des charges `/api/v1/entities/{id}/specs`.
   `/api/v1/messages` exige un paramètre `nodeRef`.
5. **`/api/v1/autocomplete/…` attend un `entityNodeRef` complet**
   (`workspace://SpacesStore/…`). Avec un UUID nu il répond 502 — c'est un piège d'appel,
   pas un défaut du produit.
6. **Ce compte agit pour 13 fournisseurs** (et le périmètre documentaire en voit 14).
   Toute assertion de cloisonnement est ambiguë par construction sur cette instance.
7. **Un dossier `app/api/_xxx/` n'est jamais routé.** Next traite un préfixe `_` comme un
   dossier privé : une route de contrôle posée là répond la page 404, pas le handler. Piège
   coûteux quand on croit déboguer une session.
8. **Ne jamais compléter un nodeRef tronqué dans un rapport.** Deux uuid « reconstitués » à
   partir d'un `0d1b33f4-…` de rapport ont donné deux 404 franches, et failli faire conclure
   à une régression. Retrouver le nœud par une requête nommée coûte dix secondes.
9. **Les tuiles de campagne sont chères au premier appel du process.** Le scan de campagnes
   est mémoïsé par process : `/monitor/overview` à froid met **11 s**, `/monitor/suppliers`
   ensuite **1,4 s**. Une mesure « à chaud » ne dit rien du coût réel.

---

## 9. Fixtures utiles sur `dev.becpg.fr`

| Usage | Référence |
|---|---|
| Tâche wizard la plus riche | `7a31b641-e065-47ea-b1b6-41e06597ea83` → entité `4280dddb-d39d-4a7a-80dd-dbd39d5a7ac1` (MP96504) |
| Étapes-listes de cette entité | `step3` nutList · `step4` allergenList · `step5` physicoChemList · `step6` labelClaimList · `step7` microbioList · `step8` organoList |
| Étapes en lecture seule | `step1` (formulaire), `step2` (ingList), `step9` (surveyList) |
| Produit en lecture seule | `758f899e-c492-4793-b8fc-f8a8fceb7e3f` (MP93981) |
| Questionnaire **modifiable** | tâche `62116aaa-bed9-423c-916a-aabed9123ca2`, entité fournisseur F208 |
| Tâche de signature | **aucune n'existe** — celle du tour signature a été menée à son terme |
| Produit portant les deux hiérarchies | `758f899e-c492-4793-b8fc-f8a8fceb7e3f` → « Ingrédients de base » / « Sucres et édulcorants » |
| Doublon de code ERP (onglet Conformité) | `035ea545-381c-42fd-9ea5-45381cd2fd8a` ↔ `372029fb-f1bb-4954-a029-fbf1bb3954b6`, tous deux `MP-EPI-001` |
| **Entité à référence illisible** (corps vide de `becpg/remote/entity`) | `105894c8-5f0f-4f26-9894-c85f0fdf265a` (MP96844) |
| Document signé, pour la marche d'ancêtres | `0d1b33f4-9cc8-426d-9b33-f49cc8426daa` → remonte à `fa5a9dfa-7afc-401d-9a9d-fa7afc601d09` (MP96843) |
