# État d'implémentation — Portail Fournisseur V2

> Arrêté au **2026-08-03**, après un tour de **vérification en direct** sur
> `https://dev.becpg.fr` (OIDC réel, compte `supplier-test@becpg.fr`, Chromium piloté).
>
> **Ce document vaut par une seule distinction** : ce qui a été **mesuré** ce tour, et ce qui
> est seulement **cru** parce que lu dans le code. Les quatre tours précédents ont été menés
> à l'aveugle — sans navigateur — et leurs conclusions ne sont reprises ici *que* lorsqu'elles
> ont été re-mesurées. Tout ce qui n'a pas pu l'être est dit tel quel, avec la raison.

---

## 1. Vue d'ensemble

| Élément | État |
|---|---|
| Application | Next.js 16.2.12 (App Router, Turbopack), React 18, Tailwind 4, **JavaScript** |
| `npx next build` | ✅ **0 erreur, 0 avertissement** — 57 routes (18 pages + 39 route handlers), compilation 4,2 s |
| `npx eslint .` | ✅ **0 erreur, 1 avertissement** assumé — voir §6 |
| Fichiers | 101 composants, 28 modules `lib/`, 14 specs E2E |
| Backend | `https://dev.becpg.fr` (Alfresco + Share), tenant `dev`, `authMode: oidc` |
| Portail | port **3100**, `.env.supplier`, `DEV_FAKE_AUTH=false` |
| Gestion de version | git, branche `main` |

> Le build tourne dans une **copie** du dépôt (`git archive HEAD` + `cp -al node_modules`)
> pour ne pas écraser le `.next` du serveur de développement en cours. La copie doit être sur
> le **même système de fichiers** que l'original : `cp -al` échoue entre partitions, et
> Turbopack refuse un lien symbolique (« points out of the filesystem root »).

---

## 2. Vérifié **en direct** ce tour — 2026-08-03

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
| `microbioList` (4 lignes) | **65 px** | ⚠️ voir §4.1 |

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

### 4.1 `microbioList` a un pas de 65 px, pas 34

Mesuré, cause identifiée : la colonne **« Critères texte »** est un `d:mltext` dont le
contrôle occupe **58 px** de haut (champ + bouton « 1 autre(s) langue(s) »). La règle CSS
qui écrase les `textarea` dans la grille ne l'atteint pas. Les autres cellules de la même
ligne font 26 px.

C'est **une amélioration réelle** (95 → 65) mais l'objectif Share n'est pas atteint sur
toute liste comportant une colonne multilingue.

### 4.2 42 des 101 sujets de `/messages` sont des UUID

Reproduit aux trois largeurs. La résolution du nom d'entité retombe sur l'identifiant du
nœud. Inchangé depuis le tour précédent.

### 4.3 Les commentaires s'affichent en HTML brut

`<p>T1</p>` imprimé littéralement dans le panneau « Remarques de votre client » et dans la
discussion. L'API renvoie `"content": "<p>T1</p>"` ; rien ne le désérialise. Détecté par le
balayage sur la route tâche à 1920 et 1280.

### 4.4 `Entrée` sur un bouton de ligne valide la ligne au lieu d'activer le bouton

`handleKeyDown` appelle `event.preventDefault()` pour **toute** touche `Entrée` dont la
cible n'est pas un `<textarea>` — y compris quand le curseur est sur « Supprimer la ligne »
ou sur le chevron de détail. Le clic n'est donc jamais émis.

**Défaut pré-existant**, présent avant le travail de ce tour (`git show 97227fd` porte déjà
le même `preventDefault` inconditionnel). `Espace` continue de fonctionner. Non corrigé ici
pour ne pas mêler une correction d'accessibilité à un tour de vérification.

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

---

## 9. Fixtures utiles sur `dev.becpg.fr`

| Usage | Référence |
|---|---|
| Tâche wizard la plus riche | `7a31b641-e065-47ea-b1b6-41e06597ea83` → entité `4280dddb-d39d-4a7a-80dd-dbd39d5a7ac1` (MP96504) |
| Étapes-listes de cette entité | `step3` nutList · `step4` allergenList · `step5` physicoChemList · `step6` labelClaimList · `step7` microbioList · `step8` organoList |
| Étapes en lecture seule | `step1` (formulaire), `step2` (ingList), `step9` (surveyList) |
| Produit en lecture seule | `758f899e-c492-4793-b8fc-f8a8fceb7e3f` (MP93981) |
| Questionnaire **modifiable** | tâche `62116aaa-bed9-423c-916a-aabed9123ca2`, entité fournisseur F208 |
| Tâche de signature | **aucune n'existe** |
