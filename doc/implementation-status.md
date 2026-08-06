# État d'implémentation — Portail Fournisseur V2

> Arrêté au **2026-08-06**, après trois jours de corrections livrées en continu
> (versions **0.0.3 → 0.0.10**) et une remise à plat de la suite E2E.
>
> **Ce document vaut par une seule distinction** : ce qui a été **mesuré**, et ce qui est
> seulement **cru** parce que lu dans le code. Une correction annoncée mais non re-mesurée
> est requalifiée ici, nommément. Ce qui n'a pas pu être vérifié est dit tel quel, avec la
> raison — et jamais compté comme acquis.

---

## 1. Vue d'ensemble

| Élément | État |
|---|---|
| Application | Next.js 16.2.12 (App Router, Turbopack), React 18, Tailwind 4, **JavaScript** |
| `npx next build` | ✅ compile, 0 erreur |
| `npx eslint .` | ✅ 0 erreur, 1 avertissement assumé (`react-hooks/incompatible-library`) |
| Version publiée | **0.0.10** (tag poussé) ; `_VERSION` prêt pour 0.0.11 |
| Gestion de version | git, branche `main`, dépôt distant Google Source |
| Production | `https://portal.becpg.fr` → tenant `dev`, OIDC réel (`ids-test.becpg.fr`, client `dev-supplier-portal`) |
| beCPG dev | `26.1.0.28` — contient les correctifs portail côté serveur (formulaire A5, NPE datalist, API remote, cache d'associations) |

---

## 2. Corrigé et **mesuré** sur l'instance, ce tour

### 2.1 Défauts visibles

| Défaut | Preuve |
|---|---|
| **500 sur toute page portant la visionneuse** | `pdfjs-dist` était importé statiquement ; `'use client'` n'empêche pas le rendu serveur, et pdf.js touche `DOMMatrix`. Mesuré : page de tâche **500 → 200 en 0,5 s**, idem fiche produit, `/documents`, `/tasks` |
| **Onglet d'assistant mort** | L'assistant déclarait une étape `supplierPackagingList` que l'entité ne porte pas : `404 Entity carries no datalist`. `step10` était le seul avec `listNodeRef: null`. Filtré ; le portail ne crée jamais de datalist, donc rien n'est perdu |
| **Un utilisateur interne atterrissait dans l'espace fournisseur** | Session correcte (`space: monitor`, aucun fournisseur) mais `app/page.js` ne la lisait pas. Redirection vers `/monitor` |
| **« Suspendu » affiché à un non-fournisseur** | `deriveApprovalStatus` lisait des compteurs vides et concluait « suspendu ». Sans fournisseur, `null` |
| **« Lancer un processus » annonçait « aucun processus autorisé »** | Le panneau lisait la liste des *suspensions* et postait sur celle des *référencements*. Mesuré : `/process/start` renvoyait 1 modèle pendant que l'écran disait zéro |
| **Échéance annoncée un jour trop tôt** | `daysUntil` arrondissait en UTC alors que l'affichage est en Europe/Paris. Reproduit puis corrigé, 6 cas dont un changement d'heure |
| **Qname brut à l'écran** (`bcpg:rawMaterial`) | Fuite dans `RequirementChecklist` quand l'entité n'a pas de code |
| **Onglets sans objet sur un cahier des charges** | « Conformité » et « Cahiers des charges » poussés sans condition sur un `bcpg:productSpecification` |
| **Lignes non cliquables du pilotage** | « Produits liés » mène à la fiche ; les campagnes mènent à la liste filtrée (`?q=`), faute de page par campagne — inventer la route aurait donné un 404 |
| **Historique : mauvaise explication** | L'API répond `reason: "supplierAxisUnavailable"`, l'écran affichait le texte « pas de cube ». Les quatre raisons ont maintenant chacune la leur |

### 2.2 Performances

Profilage d'un rendu du tableau de bord, avant / après :

| | avant | après |
|---|---|---|
| Appels amont par rendu | **153** | **29** |
| `GET /` (serveur local, même beCPG) | 6,0 s | **2,4 s** |
| `/api/v1/session` (production) | 1,8 s | **0,17 s** |
| Requête la plus lente | 4248 ms | 944 ms |

Trois causes, toutes mesurées :

- **`/api/v1/session` chargeait 50 tâches** pour en déduire les fournisseurs, que les groupes
  `GROUP_EXTERNAL_SUPPLIER_*` nomment déjà. Cette stratégie a ensuite été **supprimée** et non
  mise en repli : un compte hors de ces groupes n'est pas fournisseur, elle ne pouvait donc rien
  rapporter que les groupes aient manqué ;
- **13 attributs demandés par produit pour en afficher 4** — mesuré 952-1074 ms contre 159-167 ms
  avec la projection réduite au strict nécessaire du tableau de bord ;
- **un appel `becpg/project/task` par tâche** (31 pour en afficher 6). La tête de liste est
  choisie *avant* enrichissement, les tris par défaut ne s'appuyant que sur des faits que le
  candidat porte déjà. Les compteurs restent **exacts** sans appel supplémentaire ; seul
  `byType`, qui exige l'enrichissement, est **omis** plutôt que sous-évalué.

### 2.3 Contrats devenus sincères

- **`hasAssignedTask` vaut `null` quand la question n'a pas été posée.** beCPG ne le calcule que
  sous `checkTaskAssignment`, à **1575 ms contre 66 ms** ; le portail ne demande donc que sous
  `enforceTask`. Il publiait `false` — « non » et « je n'ai pas demandé » confondus, ce qui
  faisait contredire le dépôt par le portail sur dev ;
- **l'étape questionnaire n'est plus une datalist** : `{questions, answers, disabled}`, l'arbre de
  décision de `becpg/survey`. Le commentaire de contrat de la route disait encore l'inverse.

---

## 3. La suite E2E

| Fichier | État | Où |
|---|---|---|
| `00`, `01`, `02`, `03`, `05`, `06-product-sheet`, `07-date-formatting`, `10-documents` | ✅ passent | pile locale |
| `09-survey` | ✅ **14 passés, 1 abstention** | pile locale |
| `07-wizard-steps` | ✅ **17 passés, 2 abstentions** | `portal.becpg.fr` + `dev.becpg.fr` |
| `04-supplier-journey` | ⏸ prêt, exige un portail OIDC | dev |
| `08-datalists` | ⏸ **réservé à la pile locale** — voir §4 | local |
| `06-full-process` | ❌ **non résolu** — voir §4 | — |

**La suite tourne désormais sans déploiement local** : `fixtures/oidc.js` ouvre une vraie session
Keycloak et **détecte** le mode d'authentification au lieu qu'on le lui dise (une suite qu'il faut
prévenir finit par être mal prévenue). Les identifiants admin viennent du harnais recette, jamais
d'une ligne de commande. Contre `portal.becpg.fr + dev.becpg.fr`, l'exécution laisse **15 Go**
libres au lieu de 846 Mo.

`09-survey` a été **réécrit** (1834 lignes → 603) contre l'arbre de décision, et atteste que les
trois lacunes qu'il documentait sont fermées — le sélecteur ne propose plus les 42 questions de
l'instance, nombre et date sont exposés avec leur type, le type de réponse parvient au portail.
Deux invariants nouveaux : le **jeu de réponses complet** (une écriture partielle efface le reste)
et le refus d'un corps de datalist.

---

## 4. Ce qui n'a **pas** pu être vérifié, et pourquoi

| Sujet | Pourquoi |
|---|---|
| **`06-full-process` étape 2** | La tâche du fournisseur ne résout jamais le nom de son produit. J'avais avancé la contention machine, puis le retard d'index : **les deux sont faux**, l'échec se reproduit machine au repos et Solr UP. Mesuré : le dépôt contient bien une tâche « Référencement » `InProgress` assignée à `seed.supplier@becpg.fr`, et `/api/v1/tasks` renvoie **zéro tâche**. Soit un défaut visible pour un fournisseur, soit une propriété de la base restaurée du 6 août — **non tranché** |
| **`08-datalists` au-delà du cas 2** | Ses assertions supposent une branche aux **listes vides** ; mesuré sur dev, une branche hérite d'une ligne du modèle d'entité même quand le produit source n'en a aucune. Propriété du seed local, pas du portail. Il refuse de conclure plutôt que de valider des lignes qu'il n'a pas écrites |
| **`04-supplier-journey`** | Exige un portail servi en OIDC réel, distinct de celui qui sert la pile locale (Next refuse deux serveurs depuis un même dossier) |
| **Parcours de signature** | Aucune tâche de signature n'existe sur dev |
| **Reconnaissance de la fiche technique en production** | Vérifiée contre les quatre types du seed local (`Fiche technique fournisseur (portail)` → vrai, les trois autres → faux). **Le vocabulaire de dev n'a pas été confronté** : aucun type « fiche technique » n'y est configuré, l'étape tombe donc sur son dépôt libre |

---

## 5. Ce qui reste à faire

### 5.1 Défauts ouverts

**L'extraction IA ne dit pas qu'elle travaille.** Mesuré : après dépôt d'une vraie fiche technique
sur dev, `becpg-ai` renvoie deux suggestions à l'état `Loading` (« DocumentClassification 1/2 »,
« Extraction de document 2/2 ») — l'analyse tourne, en asynchrone. Pendant ce temps l'écran affiche
« Aucune suggestion ». Le portail dispose de l'information (`type: "Loading"`) et ne l'affiche pas.
C'est ce silence que l'on prend pour une panne.

**L'axe fournisseur du cube OLAP.** `/api/v1/monitor/history` répond
`available: false, reason: "supplierAxisUnavailable"` : le cube répond, il lui manque la dimension.
Celle-ci est dans la 26.1.0.28 déployée, mais le serveur OLAP sert encore l'ancien schéma — un
rechargement de schéma côté `olap-dev` devrait suffire.

**Les 29 appels amont restants** par rendu du tableau de bord, dont une douzaine de
`becpg/project/task` et un lot de lectures d'entité — même travail de profilage que §2.2, sur les
documents et les discussions cette fois. Une piste a été **écartée après examen** : réutiliser le
balayage du parc pour `loadDiscussions` (451 ms) obligerait à faire passer `fm:commentCount` dans
une forme partagée avec la page produits, pour 451 ms sur 2400.

### 5.2 Sécurité — non traité, en attente d'arbitrage

`/alfresco/s/becpg/check` est déclaré `authentication=none` et ne se protège que par une égalité
de chaîne sur l'en-tête `User-Agent`, trivialement falsifiable, avant un `runAsSystem`. Vérifié
sans aucun ticket depuis l'internet public : nom de licence, utilisateurs connectés, disque,
mémoire, quotas, et avec `?volumetry=true` **309 lignes de comptage de nœuds** issues d'un
`GROUP BY` sur tout `alf_node` — 0,59 s contre 0,09 s sans, soit un levier d'amplification gratuit
dont le coût croît avec la taille du dépôt.

Deux options, non tranchées parce qu'elles engagent une trentaine d'instances : filtrer le chemin
à l'ingress sauf depuis la source des moniteurs (sans code), ou un secret partagé optionnel côté
webscript (rétrocompatible, absent = comportement actuel).

### 5.3 Livraison et configuration

- **14 commits beCPG** attendent d'être poussés, dont le correctif de `create-supplier-project.js`
  (`[]` au lieu de `""` : la signature attend `String[]`, et cette branche ne pouvait jamais
  fonctionner) ;
- **`PORTAL_PROCESS_TEMPLATES`** reste à renseigner sur `portal.becpg.fr` pour la suspension depuis
  le pilotage. La découverte ne peut pas s'en charger : elle trouve des modèles de *référencement*,
  et beCPG n'expose aucun marqueur de modèle de *suspension* — la restriction est délibérée ;
- **`PORTAL_TECHNICAL_SHEET_TYPES`** s'ajoute au Secret `becpg-supplier-portal-secrets` si le type
  « fiche technique » de l'instance porte un autre nom que les valeurs par défaut.

---

## 6. Décisions de conception prises ce tour

**L'assistant s'ouvre sur la fiche technique, plus sur les documents** (spec §4.4). Les types de
documents attendus sont **calculés à partir des données saisies** — une allégation « sans OGM »
appelle son attestation — donc en première étape la liste est vide ou fausse. Seule la fiche
technique est demandée dans tous les cas ; elle porte donc l'entrée, et elle seule nourrit les
suggestions d'extraction. Les autres documents gardent la place que la configuration leur donne,
avec leur propre aide IA : leur type et leurs dates, pas les propriétés du produit.

**Un compte est fournisseur si et seulement s'il appartient à un `GROUP_EXTERNAL_SUPPLIER_*`.**
La stratégie de repli par les tâches est supprimée, pas désactivée.

**Les langues obligatoires seront portées par le catalogue** (#33085, spec §4.4.1), pas par une
configuration du portail : elles dépendent du client et du marché, une variable d'environnement
donnerait la même réponse à tous les catalogues d'une instance.

---

## 7. Les pièges à connaître

- **`import.meta` est une erreur de syntaxe dans les specs** : Playwright transpile en CommonJS
  faute de `"type": "module"`, et cela ne se manifeste que par « 0 tests in 0 files » ;
- **Next refuse deux serveurs de développement depuis le même dossier** — le second passe par un
  `git worktree`, et `node_modules` doit y être lié en dur sur le **même** système de fichiers
  (Turbopack rejette un lien symbolique sortant de la racine, et `/tmp` est en tmpfs) ;
- **`pkill -f "next dev"` tue le shell appelant** : passer par le PID qui écoute le port ;
- **`+TYPE:"…" +=cm:name:"…"` détruit la correspondance exacte** au lieu de la restreindre :
  mesuré, cinq projets sans rapport au lieu du bon. Le terme exact seul, puis filtrage en JS ;
- **`fields=` bascule l'extracteur beCPG en mode par nœud** et coûte 4× ; la clé `@` d'un datalist
  y désigne le **type d'élément imbriqué**, jamais un rang ;
- **Deux appelants partageant une clé de mémo** : celui qui s'exécute en premier impose ses
  paramètres. Modifier l'autre ne fait rien — et rien ne le signale.

---

## 8. Fixtures utiles

| Usage | Référence |
|---|---|
| Produit source, parcours sur dev | `MP93981` — `758f899e-c492-4793-b8fc-f8a8fceb7e3f` |
| Produits dev à liste d'ingrédients vide | `MP95683`, `MP96518`, `MP96534` (la **branche** en hérite quand même une) |
| Compte fournisseur dev | `supplier-test@becpg.fr` — 13 groupes, 13 fournisseurs |
| Compte pilotage dev | `purchasingmgr.test.user` — `space: monitor` |
| Comptes de test | `../becpg-boxes/recette/src/fixtures/users.local.json` (skill `becpg-test-ticket`) |
| Version déployée d'une instance | `becpg/scripts/becpg-version.sh dev.becpg.fr` — lit `becpgSchema` via l'en-tête `beCPG Monitors` |
