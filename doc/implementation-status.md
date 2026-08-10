# État d'implémentation — Portail Fournisseur V2

> Arrêté au **2026-08-06**, après trois jours de corrections livrées en continu
> (versions **0.0.3 → 0.0.10**), une remise à plat de la suite E2E, puis une passe
> sur le `TODO.md` du 6 août — §2bis.
>
> **Mis à jour le 2026-08-10**, après la livraison de `dev.becpg.fr` **26.1.0.31** et du
> portail **0.0.12** : ré-exécution complète de la suite E2E (§3), état réel de la chaîne IA
> sur dev (§5.3) et **retournement du diagnostic OLAP** (§5.1) — le cube n'était pas en panne,
> c'est le compte avec lequel il avait été interrogé qui ne recevait rien.
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
| `npx playwright test` | ✅ **102 passés / 4 échecs / 3 abstentions** en 12 min 18 s, pile locale, 10/08 — les 4 sont détaillés en §3, aucun n'est une régression |
| Version publiée | **0.0.12** (tag poussé, `portal.becpg.fr` sert `0.0.12-b009a75`) ; `_VERSION` prêt pour 0.0.13 |
| Gestion de version | git, branche `main`, dépôt distant Google Source |
| Production | `https://portal.becpg.fr` → tenant `dev`, OIDC réel (`ids-test.becpg.fr`, client `dev-supplier-portal`) |
| beCPG dev | `26.1.0.31` (10/08) — contient les correctifs portail côté serveur (formulaire A5, NPE datalist, API remote, cache d'associations) **et les trois changements de §2bis.4** : `portal-form.lib.js`, `SupplierPortalInitRepoVisitor`, `AiSuggestionsProxyWebScript` |

---

## 2. Corrigé et **mesuré** sur l'instance, ce tour

### 2.1 Défauts visibles

| Défaut | Preuve |
|---|---|
| **500 sur toute page portant la visionneuse** | `pdfjs-dist` était importé statiquement ; `'use client'` n'empêche pas le rendu serveur, et pdf.js touche `DOMMatrix`. Mesuré : page de tâche **500 → 200 en 0,5 s**, idem fiche produit, `/documents`, `/tasks` |
| **Onglet d'assistant mort** | L'assistant déclarait une étape `supplierPackagingList` que l'entité ne porte pas : `404 Entity carries no datalist`. `step10` était le seul avec `listNodeRef: null`. Filtré ; le portail ne crée jamais de datalist, donc rien n'est perdu |
| ~~**Un utilisateur interne atterrissait dans l'espace fournisseur**~~ | **Annoncé corrigé, ne l'était pas.** Voir §2bis : la redirection testait `session.space`, une clé que la session chiffrée ne porte pas. `undefined !== 'monitor'` : le code n'a jamais tiré |
| **« Suspendu » affiché à un non-fournisseur** | `deriveApprovalStatus` lisait des compteurs vides et concluait « suspendu ». Sans fournisseur, `null` |
| **« Lancer un processus » annonçait « aucun processus autorisé »** | Le panneau lisait la liste des *suspensions* et postait sur celle des *référencements*. Mesuré : `/process/start` renvoyait 1 modèle pendant que l'écran disait zéro |
| **Échéance annoncée un jour trop tôt** | `daysUntil` arrondissait en UTC alors que l'affichage est en Europe/Paris. Reproduit puis corrigé, 6 cas dont un changement d'heure |
| **Qname brut à l'écran** (`bcpg:rawMaterial`) | Fuite dans `RequirementChecklist` quand l'entité n'a pas de code |
| **Onglets sans objet sur un cahier des charges** | « Conformité » et « Cahiers des charges » poussés sans condition sur un `bcpg:productSpecification` |
| **Lignes non cliquables du pilotage** | « Produits liés » mène à la fiche ; les campagnes menaient à la liste filtrée (`?q=`), faute de page par campagne. Cette page existe désormais — §2bis |
| **Historique : mauvaise explication** | L'API répond `reason: "supplierAxisUnavailable"`, l'écran affichait le texte « pas de cube ». Les quatre raisons ont maintenant chacune la leur |

### 2.1bis Passe `TODO.md` du 6 août — voir §2bis pour le détail

---

## 2bis. La passe `TODO.md` du 6 août

Quinze remarques relevées à l'usage, sur les deux espaces. Toutes reproduites avant
correction ; la preuve est dans la colonne de droite, et ce qui n'a pas pu être re-mesuré
est dit en §4.

### 2bis.1 Compte interne (pilotage)

| Défaut | Cause, et preuve |
|---|---|
| **Le tableau de bord fournisseur s'affichait à un interne** | La redirection de `app/page.js` lisait `session.space` — **la session chiffrée dans le cookie ne porte pas cette clé**, seul le payload de `/api/v1/session` la calcule. Mesuré : compte `admin`, `space: "monitor"` sur `/api/v1/session`, `GET /` → **200 avec l'espace fournisseur**. L'espace est désormais calculé côté serveur (`getMyGroups` est mémoïsé et `buildDashboard` l'appelle juste après : aucun appel amont de plus). Re-mesuré : `GET /` → **307 → `/monitor`** |
| **Pas de liste de tâches dans le pilotage** | `MONITOR_NAV` n'avait aucune entrée « Mes tâches », alors que `/api/v1/tasks` sert un compte interne (mesuré sur l'instance locale). C'est pourtant de là qu'un valideur fait avancer un référencement. Entrée ajoutée ; `monitor-documents` quitte les quatre primaires pour que la barre du téléphone en garde quatre |
| **La relecture n'ouvrait aucune discussion** | La tâche « Validation » tombe sur `ReviewStep`, qui n'avait pas de fil. Signaler une coquille voulait dire quitter la tâche — ou refuser en espérant que le motif se devine (`TaskActions` dit lui-même qu'un motif de refus n'est pas enregistré). `CommentsPanel` sur l'entité, en colonne à partir de `lg`, sous la fiche en dessous |
| **Cloche : message absurde** | « Votre compte n'est rattaché à aucun fournisseur […] Signalez-le à votre contact chez le client » s'affichait à un responsable référencement — **qui est le client**. `scope.empty.reason` distingue maintenant `noSupplierIdentity` (anomalie, fournisseur) de `internalAccount` (normal, interne), avec un fond neutre et non le fond d'alerte. Mesuré : `/api/v1/notifications` renvoie bien `reason: "internalAccount"` sur le compte `admin` |
| **Campagne non cliquable** | Les lignes étaient inertes **alors que la charge utile publiait déjà `href: /monitor/campaigns/<ref>`** — une route que rien ne servait. Ajout de `GET /api/v1/monitor/campaigns/{id}` (3 requêtes db-afts) et de la page : mêmes faits que la ligne (`toCampaignRow`, donc pas de second modèle), plus les tâches en cours avec leurs assignés, les entités avec la route qui les ouvre — **choisie sur le type**, un `bcpg:supplier` menant à la fiche fournisseur — et le fil de discussion du projet. Mesuré sur `supplier1 - REFERENCING - 2026` |
| **Non-conformités non consultables** | L'écran listait un code et un verdict sans jamais donner le texte. `qa:ncComment` était déclaré dans la configuration et demandé nulle part : ajouté à la projection déjà émise, avec `cm:description` — **aucun appel supplémentaire**. Ouverture en fenêtre (on en consulte trois de suite : une navigation ferait perdre filtre, tri et sélection) avec les faits, les actions correctives et le fil |

### 2bis.2 Compte fournisseur (assistant)

| Défaut | Cause, et preuve |
|---|---|
| **« La recherche a échoué » sur les autocomplétions** | La route résolvait le champ par `module/entity-datagrid/config/columns`, qui répond **`{"columns": []}` — 200, pas une erreur** — pour `itemType=bcpg:rawMaterial&formId=supplier` : les formulaires produit sont déclarés sous un évaluateur `node-type` qui n'existe pas hors session Share. Le repli `POST /becpg/form` ne servait à rien non plus : il renvoie l'**override** beCPG, et un formulaire sans override répond `{"override": false}`, sans clé `fields`. Résultat mesuré : `404 Form "supplier" carries no field "assoc_bcpg_productGeoOrigin"` sur *Origines géographiques*, *Catégorie réglementaire*, *Conditions de conservation*, *Usines fournisseurs*. Le champ est maintenant cherché **dans les définitions de l'assistant** — la source même qui a peint le contrôle — avant le repli dépôt. Re-mesuré : les quatre répondent |
| **Aucun contrôle des obligatoires, et *Terminer* passait quand même** | `finishDisabled` ne lisait que les catalogues, **et ceux-ci n'étaient chargés qu'après passage par l'étape Conformité** : qui ne l'ouvrait pas avait `blocking === []` et un bouton actif. Deux verdicts désormais, avant clôture : les obligatoires vides des étapes ouvertes (formulaire et questionnaire remontent au parent), puis les catalogues **relus à la demande** dans `finish()`. Le refus emmène à l'étape fautive ; le rail marque l'étape (icône `error_outline` + libellé, jamais la couleur seule) et ne peut plus l'afficher « vue » |
| **↳ et la correction a d'abord été trop large, deux fois** | **(a)** Rendre ce garde-fou réel a révélé que `blockingCatalogs` traitait un catalogue **non déclaré** comme bloquant. Invisible tant que le code était mort ; appliqué, il rendait **tout assistant impossible à terminer**. Mesuré : `/api/v1/entities/{id}/catalogs` ne porte **aucune clé `blocking`** — beCPG n'en publie pas — et `incoRawMaterials` est à un champ près sur chaque matière première du seed. Le cas E2E `07-wizard-steps › 3b` l'a attrapé : *Terminer* avait cessé d'appeler la complétion. Un catalogue ne bloque désormais que s'il est **déclaré** tel (par beCPG, ou par `PORTAL_BLOCKING_CATALOGS`, `all` accepté) ; un catalogue seulement incomplet s'affiche « à compléter » et laisse beCPG trancher (règle R2). `blockingCatalogIds` était jusque-là une prop que personne ne renseignait, donc un réglage qui n'existait pas. **(b)** Le même cas E2E a ensuite refusé une deuxième fois : le blocage sur les obligatoires vides contredisait `draft`, l'attribut par lequel le client déclare qu'on peut rendre depuis n'importe quelle étape — donc qu'une fiche partielle lui est recevable. En mode brouillon le manque est **signalé** (rail, et note sous le bouton) et non opposé. **C'est la suite qui a dit non les deux fois, pas une relecture** |
| **« Aucune suggestion » pendant que l'IA travaillait** | `becpg-ai` répond immédiatement avec ses enveloppes `Loading` / `LoadingComplete` et calcule en asynchrone. Elles étaient jetées en bloc, donc « ça tourne » et « rien trouvé » rendaient pareil. `analysisProgress()` compte les greffons ouverts (`Closing` ferme tout, quoi qu'il reste) ; l'étape l'affiche, les nomme, et se relit toute seule toutes les 8 s, plafonnée à 15 fois. **Vérifié en isolant la fonction pure** (6 cas, dont les deux enveloppes exactes mesurées sur dev-ai) — pas de bout en bout : `becpg-ai` n'est pas joignable depuis la pile locale |

### 2bis.3 Général

| Défaut | Cause, et preuve |
|---|---|
| **« Ouvrir la discussion » ne faisait rien** | `openComments()` n'ouvrait la feuille qu'en dessous de 1024 px. Sur desktop panneaux affichés il ne changeait qu'une ancre invisible ; en mode « Élargir la saisie » il n'y a **pas d'`aside` du tout**, donc rien. La règle suit maintenant la **mise en page** et non la largeur : feuille quand la colonne n'est pas à l'écran, sinon on y amène le lecteur et on y met le focus |
| **Icône cassée au choix du tenant** | Le bandeau de `/login` rendait le logo du tenant en `<img>` **sans `onError`** — la page est un composant serveur — et sa liste de repli était plus courte que celle de `TenantBadge` (il lui manquait `/theme/images/logo.png`). Une URL venant de `TENANT_MAP` qui n'aboutit pas donnait donc l'icône « image cassée » du navigateur, sur le premier écran vu par un fournisseur, et elle changeait avec le tenant choisi. Extrait en `TenantLogo` (client), repli sur la marque neutre ; la liste de repli est désormais partagée |
| **La déconnexion affichait une erreur** | **Mesuré sur `ids-test.becpg.fr`, réalm `dev`, client `dev-supplier-portal`** : `logout?…&post_logout_redirect_uri=http://localhost:3000/login` → **400 « Invalid redirect uri »**, et `…/api/auth/callback` → **400** aussi (la liste *post logout* n'est pas celle des redirections). Sans le paramètre : **200**. J'en avais conclu que la liste du client était vide : **c'était faux**, et la mesure du 2026-08-07 sur l'URI de production le montre — `https://portal.becpg.fr/login` → **302**, l'URI est déclarée. Ce qui tombait sur la page d'erreur Keycloak, c'était la déconnexion **en développement local**, dont l'URI n'est pas déclarée. La découverte OIDC n'annonce rien à ce sujet : le portail sonde une fois par émetteur, retient la réponse, et retire le paramètre quand il est refusé (`OIDC_POST_LOGOUT_REDIRECT`, défaut `auto`). **La vraie réparation reste côté Keycloak** — un champ, à `+` |
| **Pas de `help-id` sur les champs** | Côté beCPG : `portal-form.lib.js` ne lisait que `getHelpText()` (l'attribut `help`), alors que beCPG déclare `help-id` (une clé de message) sur ~90 champs et `help` sur aucun. Corrigé, et **mesuré après déploiement à chaud sur la pile locale** : `step1` de `bcpg:rawMaterial` passe de **0 à 9 champs sur 21** portant leur aide. Le rendu était déjà câblé (`FieldRenderer`) — seule la donnée manquait |
| **Cahier des charges vs catalogue** | Ce n'était pas un défaut mais une question, et l'absence de réponse en est un : les deux se touchent à l'écran (Contexte / Conformité) et rien ne les distinguait. Rubrique ajoutée à `/help`, fr et en |

### 2bis.4 Les changements `../becpg`

| Changement | Portée |
|---|---|
| **`portal-form.lib.js` transmet le `<control>` et le `help-id`** | Le `ds` d'un sélecteur ne vit que dans `<control-param name="ds">`. Sans lui le portail savait déduire la source d'une **vraie association** (`…/targetassoc/associations/<endpointType>`) mais pas celle d'une **propriété `d:noderef`** : `bcpg:ingTypeV2` (*Catégorie réglementaire*) pointe sur `bcpg:ingTypeItem`, que seul ce `ds` nomme. **Mesuré après déploiement à chaud** : le champ répond, quatre valeurs `bcpg:ingTypeItem`. Le portail n'a eu besoin d'aucune modification — `normalizeField` lisait déjà `raw.control` |
| **`SupplierPortalInitRepoVisitor` sème le type « Fiche technique fournisseur »** | Lié à `bcpg:rawMaterial`, **non obligatoire**, create-if-absent, et **sans drapeau**. Il avait d'abord été mis derrière `beCPG.supplierPortal.createDefaultTechnicalSheetType` par prudence ; le drapeau a été retiré, et il était mal placé : le visiteur crée déjà le site fournisseur, le modèle de projet et le cahier des charges par défaut sans rien demander. La vraie protection n'est pas l'option, c'est le **non obligatoire** — `DocumentFormulationHandler` matérialise bien un document attendu sur chaque matière première, mais un attendu non obligatoire ajoute une ligne à la check-list sans déplacer aucune complétude documentaire ni aucun statut d'agrément. Compile ; **non déployé** — voir §4 |
| **`AiSuggestionsProxyWebScript` met l'IA derrière le dépôt** | Trois opérations closes sous `becpg/ai/`, l'adresse (`beCPG.ai.serverUrl`) et le jeton d'appel restant dans beCPG. Détail en §2bis.5. Compile, et **déployé à chaud sur la pile locale pour la vérification** — cet override disparaît si le conteneur est recréé |

### 2bis.5 L'IA passe désormais par le dépôt, comme OLAP

Le portail **n'appelle plus becpg-ai**. Trois opérations closes, servies par un nouveau
`AiSuggestionsProxyWebScript` (becpg-core) : `becpg/ai/suggestions`, `…/apply`,
`…/apply-plan`.

Ce que cela retire du portail :

- `BECPG_AI_URL`, `BECPG_AI_API_KEY`, `BECPG_AI_INSTANCE_NAME`, `BECPG_AI_TENANT` — supprimées ;
- `aiFetch` / `aiJson` / `aiAuthHeaders` / `proxyToAi` / `ALLOWED_AI_PATH_PREFIXES` / `AI_API_BASE` ;
- la route `/api/v1/ai/**`, un tunnel navigateur → becpg-ai que **rien n'utilisait** (vérifié) ;
- et surtout une **réimplémentation en JavaScript du jeton composite de beCPG**
  (`<instance>$<login>@<tenant>#<TICKET_…>`, base64). Ce jeton est
  `BeCPGTicketService.getCurrentAuthToken()` : un format que seul beCPG possède, recopié
  dans un autre dépôt, donc voué à casser en silence. `becpg/remote/ai/token` l'exposait
  déjà — la copie n'avait aucune raison d'exister.

**Vérifié de bout en bout**, le webscript ayant été déployé à chaud dans le conteneur Alfresco
local (classe dans `WEB-INF/classes`, descripteurs, et un contexte Spring dans
`shared/classes/alfresco/extension/` — puis redémarrage) :

| Contrôle | Attendu | Mesuré |
|---|---|---|
| les trois opérations sont enregistrées | 3 routes | ✅ `GET suggestions`, `POST apply`, `POST apply-plan` |
| endpoint non authentifié | refusé | **401** |
| `beCPG.ai.serverUrl` vide | dit non, sans échouer | **503** `{"error":"aiNotConfigured"}` sur les trois |
| avec une URL becpg-ai réelle | l'appel part vraiment | ✅ atteint `dev-ai.becpg.fr` et relaie sa réponse |
| chaîne complète portail → beCPG → becpg-ai | raison précise | ✅ `upstreamStatus: 502`, `aiNotJson` — et la fiche produit répond **200** |
| webscript absent (avant déploiement) | dégradation propre | **404**, fiche produit **200** : l'étape Suggestions disparaît au lieu d'échouer |
| tunnel navigateur vers `becpg/ai/` | refusé | **403** (`becpg/ai/` reste hors de `ALLOWED_BECPG_PATH_PREFIXES`, comme `becpg/olap/`) |
| ancienne route `/api/v1/ai/**` | supprimée | **404** |

**Un défaut trouvé en testant, et corrigé.** Le proxy relayait la réponse amont telle quelle. Or
**un becpg-ai non authentifié sert sa page de connexion OAuth en HTTP 200 `text/html`** — mesuré,
en pointant l'instance locale sur dev-ai : le ticket d'une instance ne vaut pas pour une autre.
Relayée ainsi, cette page arrivait au portail étiquetée `application/json` et échouait bien plus
loin en « non-JSON payload », sans rien dire de la cause. Le type de contenu amont est désormais
vérifié : autre chose que du JSON donne **502 `aiNotJson`** avec le type reçu. C'est le même
piège que le « 200 vide » d'OLAP — un statut de succès qui n'est pas une réponse.

Le proxy distingue donc quatre situations, au lieu de les écraser en une : `503 aiNotConfigured`
(pas de becpg-ai sur l'instance), le `401`/`403` de becpg-ai tel quel (droits), `502 aiNotJson`
(becpg-ai répond mais pas à nous), `502 aiUnreachable` (panne).

**Reste non testé** : un aller-retour *réussi*, qui demande un becpg-ai acceptant les tickets de
l'instance appelante — la pile locale n'en a pas.

**Configuration k8s — modifiée, pas appliquée.** Deux fichiers, et le second est celui qu'on
oublie :

| Fichier | Ajout |
|---|---|
| `becpg/becpg-enterprise/deployment.yml` | `-DbeCPG.ai.serverUrl=http://becpg-ai-dev` dans les `CATALINA_OPTS` du dépôt, à côté des options OLAP |
| `becpg-saas/kb-instances/becpg-test2/policies/deployment.yml` | `becpg-core-to-ai-netpol`, calqué sur `becpg-core-to-report-netpol` |

**La règle réseau n'est pas un détail.** Vérifié sur le cluster `becpg-test2` : l'egress de
`becpg-core-dev` n'autorise que MySQL (127.0.0.1:3306), `becpg-search-master2:8983`,
`becpg-mail:25`, les IP de métadonnées, le DNS et le 443 sortant. **`becpg-ai-dev:8080` est
bloqué** — Share a la règle, le dépôt ne l'avait pas, parce que jusqu'ici le dépôt n'appelait
jamais becpg-ai. Sans elle le proxy expire en `502 aiUnreachable` et la configuration a l'air
juste. Côté becpg-ai, rien à faire : son ingress est déjà `from: []` sur 8080.

Elle vit dans les *policies* du cluster, pas dans le manifeste d'instance : c'est là que sont
déjà `becpg-core-to-transformers-netpol` et `becpg-core-to-report-netpol`, et une règle
transverse n'a pas à être recopiée par instance.

**Un piège de sélecteur, évité en vérifiant plutôt qu'en supposant** : les pods becpg-ai portent
`app.kubernetes.io/component: backend`. Le label `component: ai` n'existe que sur l'objet
NetworkPolicy lui-même — une règle qui le sélectionnerait ne matcherait **rien**, en silence.
La règle sélectionne donc `app.kubernetes.io/name: becpg-ai`, porté par les pods de `becpg-ai`
comme de `becpg-ai-dev`, sur le port **8080** (le port du conteneur ; le Service expose 80).

**Rien n'a été appliqué au cluster** : `kubectl` en écriture est refusé par la politique de
permissions de l'agent. Les commandes sont dans `TODO.md`. À savoir : la règle réseau est
immédiate et ne redémarre rien ; le patch des `CATALINA_OPTS` **redémarre `dev.becpg.fr`** et
n'apporte rien tant que l'image becpg-core ne contient pas le webscript.

**Les cinq fichiers de policies qui portent le motif transverse l'ont désormais** —
`becpg-test2`, `becpg-saas`, `becpg-saas2`, `becpg-test3` et le `cluster-template` qui amorce
les nouveaux clusters. Même `spec` partout (vérifié : un seul spec distinct sur les cinq), seul
le label `environment` suit la convention locale (`test` / `prod`).

**`becpg-saas-us` est laissé de côté, et c'est un choix.** Son fichier ne gère pas l'egress du
dépôt : zéro occurrence de `becpg-core`, aucun sélecteur `part-of: becpg`, aucune policy
`becpg-core-to-*`. Y poser la règle transverse reviendrait à introduire un motif que ce cluster
n'utilise pas, en sélectionnant des pods sur un label que je n'ai pas pu vérifier là-bas — et
une policy qui ne matche rien ne le dit pas. `becpg-connectors`, `becpg-front`,
`becpg-integration` et `becpg-test` n'hébergent pas becpg-ai du tout.


---

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

Exécution complète du 2026-08-06 contre la pile locale, `workers: 1` :
**95 passés, 5 échecs, 1 abstention, 9 min 20 s.**

**Ré-exécution du 2026-08-10**, après la livraison de `dev.becpg.fr` 26.1.0.31 et du portail
0.0.12, même pile locale : **102 passés, 4 échecs, 3 abstentions, 46 non exécutés, 12 min 18 s**
(le fichier est en `mode: 'serial'`, un échec arrête la suite du fichier). Les quatre échecs :

| Cas | Statut |
|---|---|
| `04-supplier-journey` — atterrissage du fournisseur | **attendu** : exige le second portail OIDC sur `:3100`, absent de cette exécution. Le `beforeAll` échoue une fois en nommant la cause, ce qui est son rôle |
| `06-full-process › 2` — la tâche du fournisseur | **connu, non résolu** — §4, inchangé |
| `07-wizard-steps › 0` — création du projet | **connu et élucidé** : `/api/v1/tasks?pageSize=100` renvoie 100 éléments pour `counters.total = 101`. Le dépôt local reste au-dessus du seuil ; les tâches « Référencement » ouvertes sur `MPSEED001` n'ont toujours pas été fermées |
| `08-datalists › 3` — association multivaluée au clavier | **nouveau** : l'`input` annonce `aria-activedescendant="_r_c_-3"` là où le test attend l'`id` de l'option qu'il vient de mettre en surbrillance, valeur stable sur 34 tentatives. À élucider — c'est ce qu'un lecteur d'écran annonce. Le cas 2 passe |

Aucune régression : les 102 verts couvrent `00`, `01`, `02`, `03`, `05`, `06-product-sheet`,
`07-date-formatting`, `08-signature`, `09-survey`, `10-documents` et les onze cas de
`11-todo-2026-08-06`.

| Fichier | État | Où |
|---|---|---|
| `00`, `02`, `03`, `05`, `06-product-sheet`, `07-date-formatting`, `09-survey`, `10-documents` | ✅ passent | pile locale |
| `11-todo-2026-08-06` | ✅ **nouveau** — un cas par défaut du relevé (§2bis) | pile locale |
| `01-api-contracts` | ✅ après correction du test — voir ci-dessous | pile locale |
| `07-wizard-steps` | ✅ après retrait d'un défaut épinglé — voir ci-dessous | `portal.becpg.fr` + `dev.becpg.fr` |
| `07-wizard-steps` | ❌ **instable — l'échec se déplace de cas en cas, et ce n'est pas cette passe** — voir ci-dessous | local |
| `04-supplier-journey` | ⏸ prêt, exige un portail OIDC | dev |
| `08-datalists` | ⏸ **réservé à la pile locale** — voir §4 | local |
| `06-full-process` | ❌ **non résolu** — voir §4 | — |

**Deux tests étaient faux, et pas le produit.** Les distinguer est tout l'intérêt d'une
exécution complète :

- `01-api-contracts › dashboard` assertait `approval.status` **sans condition**. Or
  `approval` vaut `null` dès que le compte n'est pas fournisseur — c'est la correction
  de « Suspendu affiché à un non-fournisseur » (§2.1), et la suite tourne par défaut
  sous un compte interne sur la pile locale. Le test assertait donc une forme que le
  produit avait cessé d'avoir : il échouait sans rien signaler de réel. Il vérifie
  maintenant les deux branches, et que `approval: null` va bien avec `supplier: null` ;
- `07-wizard-steps › 2` portait un **défaut épinglé** — une liste vide qui rend quand
  même sa ligne de total — avec la consigne écrite dans le test : « ces assertions
  tiennent *à cause* du défaut et échouent le jour où il est corrigé ; cet échec est le
  signal attendu ». Il l'a été : `useDataList` distribue désormais les lignes de synthèse
  à part (`isTotalRow`), travail de la piste datalist menée en parallèle. Les deux
  branches ont convergé, le test n'en a plus qu'une.

**`07-wizard-steps` échoue, mais pas deux fois au même endroit — et l'imputation a
été vérifiée, pas supposée.**

Sur six exécutions consécutives du fichier, l'échec s'est déplacé : cas 2, puis 3b,
puis 8b trois fois, puis le cas **0** — celui qui crée le projet. Le fichier est en
`mode: 'serial'`, donc un échec arrête le reste, ce qui explique les « n did not
run ».

Ce qui est établi :

- **ce n'est pas cette passe.** Les six fichiers `components/wizard/**` remis à leur
  état d'avant (`git stash`), `8b` échoue **à l'identique**, au même endroit,
  12 passés. Le code de cette passe n'y est pour rien ;
- **le cas 0 est expliqué, et mesuré.** Il échoue sur « la tâche créée n'apparaît
  pas dans `/api/v1/tasks` », et le test **documente lui-même** ce mode de
  défaillance : la fixture demande une échéance à trois semaines, sa tâche trie
  donc **en dernier**, et elle disparaît dès que l'instance porte plus de tâches
  ouvertes que la page demandée. Le cas avait déjà été durci une fois, de
  `pageSize=25` à `pageSize=100`. Mesuré maintenant :

  ```
  /api/v1/tasks?pageSize=100 → 100 items,  counters.total = 101
  ```

  **101 tâches ouvertes pour une page de 100** : la tâche de la fixture est
  l'élément 101, elle ne revient jamais. La cause de l'accumulation est dans le
  commentaire du test — « only a *successful* run closes the one it opened » — et
  elle est de mon fait : une huitaine d'exécutions de ce fichier interrompues en
  cours de route ont chacune laissé leur tâche ouverte derrière elles.

  Ce n'est donc **ni le produit ni cette passe** : c'est le dépôt local qui a
  franchi le seuil que le test se garde de justesse. Le remède est de fermer les
  tâches « Référencement » laissées ouvertes sur `MPSEED001` (ou de remonter la
  page de la fixture) — je n'ai rien supprimé.

Ce qui **ne** l'est pas — deux hypothèses formulées puis **réfutées**, plutôt que
laissées dans le texte comme si elles tenaient :

- « Fast Refresh recompile pendant le test » : réfutée, une exécution sans aucune
  édition en cours contient **zéro** événement `[Fast Refresh]` et échoue pareil ;
- « la barre d'actions grandit sous le curseur au moment du clic » (l'indicateur
  d'enregistrement passe de `null` à une ligne). La trace montre bien le clic
  dispatché en (880, 601,5), l'indicateur muté entre le début et la fin de
  l'action, le `PUT` de la ligne en 200 et **aucun appel de l'étape suivante**.
  Mais réserver la hauteur ne corrige rien : hypothèse **non retenue**, et le
  correctif correspondant a été retiré plutôt que livré sur une justification
  fausse.

Reste donc à trancher pour `8b` seul, sur une pile locale assainie — le cas 0, lui,
est élucidé.

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
| **`SupplierPortalInitRepoVisitor` — le type semé** | **Livré le 10/08 dans dev 26.1.0.31** ; l'effet sur l'instance — un type « Fiche technique fournisseur » présent et non obligatoire — n'a pas encore été re-mesuré. Ce qui suit décrit l'état au 06/08 : compile (`mvn -pl becpg-plm/becpg-plm-core compile`, JDK 21) mais **non déployé**, cela demandait un redémarrage d'Alfresco. Le *mécanisme* est vérifié — les quatre types `(portail)` du seed ont exactement cette forme (`docTypeLinkedTypes: ["bcpg:rawMaterial"]`) et se matérialisent bien en exigences. Ce qui n'a pas pu l'être : un type créé **à chaud** n'apparaît pas après reformulation, cache des caractéristiques probable ; sans conséquence pour un visiteur qui s'exécute au démarrage, mais non prouvé. Le nœud d'essai créé sur l'instance locale a été supprimé |
| **Rendu visuel des écrans nouveaux ou modifiés** | L'extension Chrome n'était pas connectée. Vérifié autrement : `next build` vert, `eslint` propre, chaque écran répond 200 et rend son squelette sans toucher la frontière d'erreur, et chaque endpoint a été appelé et sa charge utile lue. **Aucune capture d'écran** |

---

## 5. Ce qui reste à faire

### 5.1 Défauts ouverts

**L'extraction IA ne dit pas qu'elle travaille** — ✅ **fermé**, voir §2bis.2. Reste à re-mesurer
contre un vrai `becpg-ai` : la logique a été vérifiée en isolant la fonction pure, l'affichage ne
l'a pas été.

**OLAP — ce n'était ni le cube, ni la base, ni le canal : c'était le compte de mesure.**

> **Mesuré le 10/08/2026.** Le paragraphe qui suit garde l'enquête du 07/08 parce qu'elle
> reste juste sur ce qu'elle a établi, mais sa conclusion — « toutes les requêtes MDX
> renvoient zéro ligne sur dev » — n'était vraie que **sous `admin.test.user`**, le compte
> avec lequel elle a été menée de bout en bout, et le confondant qu'elle signalait elle-même
> sans le lever. Même endpoint, même statement, quatre comptes :
>
> | Compte | `taskStates` sur `projectsSteps` |
> |---|---|
> | `admin.test.user` | 200, `{"metadatas":[],"resultsets":[]}` |
> | `purchasingmgr.test.user` | 200, **6 lignes** (Annulé 308, Terminé 1157, En cours 2100, …) |
> | `qualitymgr.test.user` | 200, 6 lignes |
> | `rduser.test.user` | 200, 6 lignes |
>
> Les quatre statements du module répondent, et leurs comptes retrouvent ceux que leurs
> commentaires enregistrent : `taskTrend` **10** lignes depuis 2019 (11 au jour de l'écriture),
> `taskStates` **6**, `completion` **3** (2024 : 1250 projets, avancement moyen 4,47 %),
> incidents par fournisseur **18**. **La base `becpg_olap_dev` n'est pas vide et la
> synchronisation n'est pas en panne** : la piste n°1 du 07/08 est réfutée, il n'y a rien à
> réparer de ce côté.
>
> Ce qui reste vrai et intéressant : la source de données Saiku est déclarée
> `security.enabled=true`, `security.type=one2one`, `security.mapping=OlapUser=OlapUser`, et
> `runMdxQuery` construit l'URL REST avec le nom de l'appelant. **L'administrateur est le seul
> compte à qui le cube ne répond rien** — à regarder si l'on veut qu'il le voie, mais cela ne
> gêne aucun utilisateur du portail, qui appelle avec son propre ticket.
>
> Vérifié aussi, contre l'hypothèse « deux bases » : le connecteur (CronJob
> `olap-connector-dev-cron`, toutes les 2 h) écrit dans le Cloud SQL
> `becpg-314807:europe-west9:becpg-olap-test1-db`, schéma `becpg_olap_dev` ; et
> `becpg.olap.url.internal=https://olap-dev.becpg.fr/saiku` mène par l'ingress au déploiement
> `becpg-olap-test1`, dont le sidecar cloud-sql-proxy pointe **la même** instance. Les deux
> côtés lisent et écrivent au même endroit.
>
> **Et l'axe fournisseur est là où le module dit qu'il n'est pas encore.** Mesuré sous
> `purchasingmgr` : `[suppliers].[name].Members` en lignes renvoie **133** lignes sur
> `projectsSteps` **et** sur `projects`, et un `WHERE ([suppliers].[name].…)` sur
> `projectsSteps` s'exécute. Les trois requêtes en `supplierScope: 'none'` peuvent donc passer
> à `'slicer'` : la doctrine du module — un statement n'est livré qu'après avoir été exécuté
> contre le vrai cube — est remplie. **Rien n'a été changé dans le code**, c'est le travail
> qui reste.

L'enquête du 07/08 disait : « le cube répond, il lui manque la dimension ; elle est dans la
26.1.0.28 déployée mais le serveur OLAP sert encore l'ancien schéma ». **Testé sur dev le
07/08/2026**, avec un ticket `admin.test.user` :

- **la dimension `suppliers` est bien servie**, sur les quatre cubes.
  `GET becpg/olap/v4/schema?instance=dev` renvoie 87 Ko et **4** `DimensionUsage name="suppliers"`,
  sur `incidents`, `projectsSteps`, `projects` et `products`. Il n'y a donc rien à recharger ;
- **le portail n'a jamais interrogé le cube pour le dire.** `supplierAxisUnavailable` sort d'une
  **constante** : `OLAP_QUERIES.taskTrend/taskStates/completion` déclarent `supplierScope: 'none'`
  et `getHistory()` court-circuite sur ce champ *avant* tout appel. Le verdict décrivait la table
  du portail, pas l'état du serveur — et il ne pouvait pas changer quand le schéma, lui, changeait.

**Ce qui a été pris pour le vrai blocage — et qui n'en était pas un.** Toutes les requêtes,
y compris les statements de contrôle **sans** axe fournisseur dont les commentaires du module
notent les résultats du jour où ils ont été écrits, répondaient `{"metadatas":[],"resultsets":[]}`
en HTTP 200 — **sous `admin.test.user` uniquement**, ce que l'encadré ci-dessus mesure :

| Requête | attendu (commentaire du module) | 07/08 (`admin.test.user`) | 10/08 (`purchasingmgr`) |
|---|---|---|---|
| `projectsSteps` par année | 11 lignes | **0** | ✅ **10** |
| `projectsSteps` par état | 6 lignes | **0** | ✅ **6** |
| `projects` complétude par année | 3 lignes | **0** | ✅ **3** |
| `incidents` par fournisseur | 18 lignes | **0** | ✅ **18** |

Le piège n°1 du module s'applique : Saiku répond `{"cellset": null}`, `OlapServiceImpl` journalise
`Incorrect data return by saiku` et le webscript renvoie un corps vide en 200 — de l'extérieur,
cube absent, connexion introuvable et statement faux sont indiscernables.

**Où chercher, et pourquoi.** La source de données Saiku
(`becpg-olap/saiku/src/main/resources/saiku-datasources/becpg`) dit ceci :

```
name=beCPG
location=jdbc:mondrian:Catalog=AlfrescoCatalog;
         DynamicSchemaProcessor=fr.becpg.olap.mondrian.AlfrescoSchemaProcessor;…
         Jdbc="jdbc:mysql://…/becpg_olap_${db.name}?…"
```

Deux choses en découlent :

1. **le schéma et les données ne viennent pas du même endroit.** Le schéma est tiré d'Alfresco à
   la volée par `AlfrescoSchemaProcessor` ; les **faits** sont dans une base MySQL séparée,
   `becpg_olap_<instance>`, alimentée par une synchronisation. Un cube dont le schéma est parfait
   et la base vide répondrait exactement ce qui était observé — **c'est cette piste qui a été
   suivie, et elle est fausse** : la base répond, dès qu'on la demande sous un autre compte
   (encadré du 10/08). Les journaux du pod `becpg-olap-test1` le montrent aussi en creux — une
   table réellement absente **est** journalisée avec sa trace
   (`Table 'becpg_olap_test36.becpg_dimdate' doesn't exist`, vu pour une autre instance), et rien
   de tel n'apparaît pour `dev` : le connecteur `dev` est créé, le schéma chargé, aucune erreur ;
2. les noms doivent concorder. `runMdxQuery` déclare `connection="beCPG"` (✅ `name=beCPG`),
   `schema="beCPG OLAP Schema"` (✅ `<Schema name="beCPG OLAP Schema">`) et
   `catalog="beCPG OLAP Schema"` — alors que la source déclare `Catalog=AlfrescoCatalog`.
   Puisque le cube répond, **la question est close** : Saiku ne valide pas ce dernier.

Et le confondant que ce paragraphe signalait — « mes mesures ont toutes été faites avec
`admin.test.user` » — **était toute l'explication**. Le nom de l'appelant entre dans l'URL REST
(`/rest/saiku/<user>/query/…`) et la source est en `security.type=one2one` : ce compte-là ne
reçoit rien, les autres reçoivent tout. La leçon tient en une ligne : **un endpoint qui répond
200 vide doit être réinterrogé sous un second compte avant d'accuser la donnée.**

**À faire côté portail** : les trois requêtes `supplierScope: 'none'` passent à `'slicer'` —
l'axe fournisseur répond sur `projectsSteps` et `projects` (133 lignes chacun, mesuré le 10/08
sous `purchasingmgr`), et la doctrine du module — **chaque statement est exécuté contre le vrai
cube avant d'être livré** — est désormais remplie pour les deux formes, en lignes et en slicer.
Rien n'a encore été changé dans le code.

**Une défaillance voisine, trouvée en chemin et non corrigée : le canal de publication de dev
tourne à vide, et son statut dit le contraire.** `bp:pubChannelId=becpg-olap` porte **25 entités
archivées** que le connecteur ne peut jamais publier — `401 - 07105963 You cannot update this
entity since it is archived` — et qu'il relit à chaque exécution : `readCount = 27` pour 25
bloquées, sur un lot qui devrait charrier les entités récemment modifiées. Le pas `importEntities`
est en `.skip(Exception.class)` avec `skipLimit=Integer.MAX_VALUE` : elles sont donc **sautées
sans bruit**, et le canal se déclare `COMPLETED`, `failCount = 0`, `lastSuccessBatchId = batchId`.
Seul `bp:pubChannelError` garde la trace, dans une trace Java de 6 Ko que rien ne lit.
La configuration du canal, elle, **est correcte et complète** : elle est identique aux valeurs par
défaut du connecteur (requête sur les cinq types, toutes les clés `mapping.olap.*`, `bcpg:suppliers`
et `mapping.olap.bcpg_supplier` compris). À savoir pour la suite : `OlapSchemaInitializer` n'écrit
la configuration du connecteur **que si le canal est absent** ou si `connector.olap.resetChannel`
est vrai — sinon il *lit* la sienne dans le canal. Un canal périmé gouvernerait donc l'extraction
en silence ; ce n'est pas le cas ici, mais c'est le premier endroit où regarder la prochaine fois.

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

> **Point du 2026-08-10.** `dev.becpg.fr` est en **26.1.0.31** (build 16:54) et
> `portal.becpg.fr` sert **0.0.12-b009a75** (`/api/health`). Les trois changements `../becpg`
> sont poussés sur `master` et embarqués. Vérifié sur l'instance : `becpg/ai/suggestions`
> répond **401** sans ticket — il est donc enregistré, il ne répond plus 404 — et
> `-DbeCPG.ai.serverUrl=http://becpg-ai-dev` est bien dans les `CATALINA_OPTS` de
> `becpg-core-dev`.
>
> **Il reste un geste, et un seul, pour que l'IA fonctionne : la NetworkPolicy.** Avec un
> ticket valide, `becpg/ai/suggestions` répond **`502 {"error":"aiUnreachable"}` en 5,1 s** —
> la signature d'un paquet jeté, pas d'un refus. Vérifié dans `becpg-test2` :
> `becpg-core-to-ai-netpol` **n'existe pas**, et l'egress de `becpg-core-dev-netpol` se limite
> à MySQL `127.0.0.1:3306`, `becpg-search-master2:8983`, `becpg-mail:25`, les IP de métadonnées
> (169.254.169.254 / .252), le DNS et le 443 sortant. C'est exactement ce que §2bis.5
> annonçait, mesuré cette fois du côté qui échoue.

- **14 commits beCPG** attendent d'être poussés, dont le correctif de `create-supplier-project.js`
  (`[]` au lieu de `""` : la signature attend `String[]`, et cette branche ne pouvait jamais
  fonctionner) — **périmé au 10/08** : les trois changements portail sont poussés, il ne reste
  que 4 commits locaux sur `../becpg`, sans rapport avec ce ticket ;
- **`PORTAL_PROCESS_TEMPLATES`** reste à renseigner sur `portal.becpg.fr` pour la suspension depuis
  le pilotage. La découverte ne peut pas s'en charger : elle trouve des modèles de *référencement*,
  et beCPG n'expose aucun marqueur de modèle de *suspension* — la restriction est délibérée ;
- **`PORTAL_TECHNICAL_SHEET_TYPES`** s'ajoute au Secret `becpg-supplier-portal-secrets` si le type
  « fiche technique » de l'instance porte un autre nom que les valeurs par défaut ;
- ~~**Keycloak : « Valid post logout redirect URIs » du client `dev-supplier-portal` est vide.**~~
  **Faux, corrigé le 2026-08-07.** Mesuré sur l'émetteur de production
  (`ids-test.becpg.fr`, réalm `dev`, client `dev-supplier-portal`) :
  `post_logout_redirect_uri=https://portal.becpg.fr/login` → **302 vers `/login`**, donc
  **déclaré**. Ce qui est refusé (400 « Invalid redirect uri ») : `…/api/auth/callback`,
  `…/zzz`, et `http://localhost:3000/login`. La liste n'est donc pas vide : elle contient
  l'URI de production en clair, et c'est l'URI **locale** qui avait été mesurée. Rien à
  faire côté Keycloak pour `portal.becpg.fr` ; la sonde de `lib/oidc.js` reste utile pour
  les autres émetteurs et pour le développement local (§2bis.3) ;
- **Trois changements `../becpg` à construire et déployer** (§2bis.4, §2bis.5) — dont
  `AiSuggestionsProxyWebScript`, **sans lequel le portail n'a plus d'IA du tout** : c'est le
  seul chemin, par construction. Renseigner aussi `beCPG.ai.serverUrl` sur l'instance. Le premier —
  `portal-form.lib.js` — a été **déployé à chaud dans le conteneur Share local** pour la mesure
  (`WEB-INF/classes/…`, qui prime sur le JAR) : cet override disparaît au redémarrage du
  conteneur, il ne remplace pas une vraie livraison ;
- **Le type « Fiche technique fournisseur » n'a plus de drapeau** : il arrive avec la prochaine
  livraison de `becpg-plm-core`, et l'assistant ouvrira dès lors sur une exigence nommée plutôt
  que sur un dépôt libre. Rien à activer.

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

**Un champ résolu par l'assistant se cherche dans les définitions de l'assistant.** Demander à une
*seconde* source, plus faible, un champ que la *première* a déjà décrit était le défaut des
autocomplétions (§2bis.2) : `module/entity-datagrid/config/columns` répond 200 avec zéro colonne
là où le endpoint wizard répond correctement. L'ordre est désormais : Share (qui porte les
surcharges client) → **définitions de l'assistant** → dépôt.

**Une propriété `d:noderef` ne reçoit pas de source de données par défaut.** La règle du gabarit
Share est `…/associations/${field.dataType}`, ce qui pour une propriété donne le littéral
`d:noderef`. Deviner ici interrogerait un webscript inexistant et transformerait une
*configuration incomplète* en *panne amont*. Le champ répond donc 400, et le contrôle le dit avec
ses mots (« ce champ n'a pas de liste de valeurs configurée ») au lieu de « la recherche a
échoué », qui invite à réessayer ce qui ne peut pas marcher.

**Le bouton se grise sur ce qui est su, la clôture refuse sur ce qui est vrai.** Les deux
ensembles ne coïncident pas : les catalogues ne sont lus que tard (leur lecture reformule), donc
`finish()` les relit lui-même. Un garde-fou qui ne garde que ceux qui sont déjà passés devant
n'en est pas un.

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
  paramètres. Modifier l'autre ne fait rien — et rien ne le signale ;
- **La session chiffrée du cookie ne porte QUE l'identité.** `space`, `groups`, `suppliers`,
  `capabilities` n'existent que dans le payload de `/api/v1/session`, qui les calcule. Lire
  `session.space` sur le retour de `getLiveSession()` donne `undefined`, silencieusement — un
  `if` qui ne tire jamais et un défaut qu'on croit corrigé (§2bis.1) ;
- **`POST /becpg/form` renvoie l'*override* beCPG, pas la définition du formulaire.** Un
  formulaire sans surcharge répond `{"override": false}` — pas de clé `fields`, et donc rien à se
  mettre sous la dent pour un repli qui espérait une définition complète ;
- **`module/entity-datagrid/config/columns` répond 200 avec `columns: []`** pour les formulaires
  produit hors session Share : ce n'est pas une erreur qu'un `catch` rattrapera, c'est une
  réponse vide qu'il faut tester ;
- **Déployer un webscript Share à chaud** : `WEB-INF/classes/…` prime sur `WEB-INF/lib/*.jar`,
  `shared/classes` **non** (le chargeur de la webapp passe avant son parent). Un `<import
  resource="classpath:/alfresco/site-webscripts/…">` ne consulte jamais
  `web-extension/site-webscripts`. Rafraîchissement par `POST /share/page/index` avec
  `reset=on` et une session Share ; `/share/service/index` répond 401 ;
- **Une caractéristique beCPG créée à chaud n'est pas vue tout de suite** par
  `DocumentFormulationHandler` (`@AlfCacheable(isCharact = true)`) : une reformulation juste
  après ne matérialise rien, et cela ne dit rien sur la validité du modèle.

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
