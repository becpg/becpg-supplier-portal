# TODO

Deux relevés d'usage, du plus récent au plus ancien. Ce qui reste ouvert est en
fin de fichier.

---

## Relevé du 2026-08-11 — traité, livré sur dev en 26.1.0.32-SNAPSHOT-29900b9c17

| Point | Cause réelle | Où |
|---|---|---|
| Liste des tâches non filtrée par fournisseur, périmètre invisible | le sélecteur existait mais était enterré dans le menu compte, et seul *Mes produits* s'en servait | portail — `SupplierSwitcher`, `scopedSupplier` |
| Pas d'accès à la tâche depuis la fiche produit | la fiche est en lecture seule et cachait son propre chemin d'écriture | portail — `ProductTaskBanner` |
| « Aucun type fiche technique configuré » alors que le type existe | `isTechnicalSheet()` lisait `type.name/code/title`, qui n'existent pas : `assocRef()` produit `label`. **Renvoyait donc toujours `false`, sur toute instance** | portail — `technicalSheet.js` |
| `d:mltext` stockés en JSON littéral (`{"fr":"Sucre cristal"}`) | le portail sérialisait la carte pour le form processor, en croyant que c'est ce que poste Share. Share utilise un endpoint dédié | portail — `saveForm` ; beCPG — `MultilingualFormFilter` |
| Vue tâche lente | `/tasks/{id}` puis `/wizard/{id}` en file indienne, plus deux lectures sérialisées dans `getTask` | portail — `?withWizard=1`, `peekTaskEntity` |
| Type de document coché « supprimé » recréé à la formulation | `DocumentFormulationHandler` ne lisait jamais `bcpg:isDeleted` | beCPG |
| Complétude calculée sur les catalogues du client | rien ne rattachait un catalogue au portail | beCPG — catalogues `supplierPortal-*` ; portail — moyenne restreinte au préfixe |
| Langues de saisie limitées à fr/en | repli sur `SUPPORTED_LANGS`, les langues du *chrome* du portail | portail — `contentLocales.js` ; beCPG — `locales` du catalogue |

**Vérifié sur dev le 12/08** : catalogue portail dans `bcpg:entityScore` (66,67 %), libellé
traduit, `Halal - TODELETE.pdf` disparu à la reformulation, `fr`/`en` stockées séparément
depuis la charge utile fautive.

**Non vérifié de bout en bout** : la chaîne référencement → tâche → `catalogId` (voir
« Reste ouvert »).

---

## Relevé du 2026-08-06 — traité

Le détail, la cause et la preuve de chacun sont dans
[`doc/implementation-status.md` §2bis](./doc/implementation-status.md).

---

## Lorsque je ne suis pas fournisseur

- [x] **Je ne devrais pas voir le tableau de bord fournisseur, mais le pilotage.**
      La redirection existait et ne tirait jamais : elle lisait `session.space`, une
      clé que la session chiffrée du cookie ne porte pas. L'espace est maintenant
      calculé côté serveur.
- [x] **Je devrais avoir la liste de mes tâches** pour faire avancer / valider les
      projets de référencement, consulter les données saisies, valider les listes et
      les documents, corriger des coquilles, discuter avec le fournisseur.
      Entrée « Mes tâches » ajoutée au pilotage ; l'écran de relecture porte
      désormais le fil de discussion de la fiche.
      *Réserve : la correction d'une coquille se fait en écriture, et l'écran de
      relecture reste en lecture seule — voir « Reste ouvert » ci-dessous.*
- [x] **Dans la vue campagne, pouvoir cliquer sur le projet** pour afficher les
      données en cours de saisie et voir les discussions.
      `GET /api/v1/monitor/campaigns/{id}` + `/monitor/campaigns/[id]` : tâches en
      cours, entités (avec la route qui les ouvre) et fil du projet.
- [x] **Non-conformités consultables.** Ouverture en fenêtre depuis la liste, avec
      la description, le commentaire qualité, les actions correctives et le fil.
- [x] **La cloche devrait être différente.** « Votre compte n'est rattaché à aucun
      fournisseur […] Signalez-le à votre contact chez le client » s'adressait à un
      fournisseur ; un compte interne lit maintenant un message qui le concerne.
- [x] **Se déconnecter affiche une erreur.** Mesuré : Keycloak répond
      400 « Invalid redirect uri » pour une URI non déclarée. Le portail détecte le
      refus et retire le paramètre. Sur `portal.becpg.fr` l'URI **est** déclarée
      (`/login` → 302, vérifié le 2026-08-07) ; c'est le développement local qui
      tombait sur la page d'erreur.

## Lorsque je suis fournisseur

- [x] **« Aucun type fiche technique configuré ».** Type semé par
      `SupplierPortalInitRepoVisitor`, **sans drapeau** — comme le site fournisseur et le
      cahier des charges par défaut que ce visiteur crée déjà. Créé **non obligatoire** :
      c'est cela, et non une option, qui le rend sûr sur un dépôt existant.
- [x] **« La recherche a échoué » dans les autocomplétions** (Origine géo,
      catégorie réglementaire…). Deux causes, toutes deux corrigées : le portail
      interrogeait une source plus faible que celle qui avait peint le contrôle, et
      le `ds` déclaré côté Share ne lui parvenait pas.
- [x] **Pas de contrôle des champs obligatoires, mal indiqué en changeant d'onglet.**
      Les étapes remontent leurs manques ; le rail les marque.
- [x] **Pouvoir terminer avec des obligatoires vides ou une conformité < 100 %.**
      `finish()` vérifie les deux avant de clôturer et emmène à l'étape fautive.
      *Deux nuances, toutes deux imposées par la suite E2E :*
      - *beCPG ne dit jamais qu'un catalogue « bloque ». Le refuser d'office rendait
        tout assistant impossible à terminer. C'est donc l'instance qui le déclare —
        `PORTAL_BLOCKING_CATALOGS=all` pour exiger 100 % — et par défaut le
        fournisseur voit son score et ses champs manquants, beCPG restant l'arbitre ;*
      - *en mode brouillon (`draft`, actif sur toutes les configurations standard),
        le client déclare qu'on peut rendre depuis n'importe quelle étape : le
        manque y est **signalé**, pas opposé.*
- [x] **Pas de suggestion IA après dépôt de la fiche technique.** L'analyse est
      asynchrone : elle est maintenant annoncée, et l'étape se relit toute seule.

## Général

- [x] **Manque les help-id sur les champs.** Côté beCPG, seul l'attribut `help`
      était lu, alors que beCPG déclare `help-id`. Mesuré après correction :
      0 → 9 champs sur 21 portent leur aide sur `step1`.
- [x] **Cahier des charges : réexpliquer, et la différence avec les catalogues.**
      Rubrique dédiée dans `/help` (fr/en). En un mot : le cahier des charges se
      **lit**, le catalogue se **remplit** — et seul le second bloque « Terminer ».
- [x] **Le lien « Ouvrir la discussion » ne fonctionne pas.** Il n'ouvrait la feuille
      qu'en dessous de 1024 px ; sur desktop il était muet, et inerte en mode
      « Élargir la saisie ».

---

## Reste ouvert

### Ouvert depuis le relevé du 11/08

- **La chaîne référencement → tâche → `catalogId` n'a pas été vue tourner.** Les deux
  extrémités sont vérifiées séparément : le livrable du modèle de dev porte bien
  `&catalogId=supplierPortal-{pjt:projectEntity|@type}` (posé à la main, voir ci-dessous), et
  `parseDeliverableUrl()` en extrait `supplierPortal-rawMaterial` sur l'URL réelle. Le milieu
  est du code beCPG non modifié. **Pour conclure : lancer un « Envoyer au fournisseur » depuis
  Share sur une MP** — deux clics valent mieux qu'une reconstitution de formulaire.
- **`becpg/supplier/send-to-supplier` est du code mort, sur toutes les instances.**
  `SupplierPortalWebScript` étend `AbstractWebScript`, mais aucun bean
  `webscript.fr.becpg.supplier.sendToSupplier.post` n'est déclaré : `service-context.xml`
  n'enregistre que `createSupplier` et `updateSupplier`. Alfresco retombe donc sur le rendu
  déclaratif et répond **500 « Cannot locate template processor »**. Aucun fichier du dépôt
  n'appelle cette URL — le vrai chemin est `beCPG/script/workflow/create-supplier-project.js`.
  Soit on enregistre le bean, soit on supprime le descripteur ; en l'état il promet une API
  qui ne répond pas.
- **Le `catalogId` du livrable ne concerne que les instances neuves.** Dans
  `SupplierPortalInitRepoVisitor.visitContainer`, le livrable n'est construit que dans
  `if (projectTplNodeRef == null)`. Sur une instance qui a déjà son modèle — dev, et toutes
  les autres — l'URL garde son ancienne valeur. Corrigé à la main sur dev ; il faut un patch
  de reprise si l'on veut que la livraison le fasse.
- **`locales` sur un catalogue multiplie les lignes stockées.** Ce n'est pas « les langues à
  proposer à la saisie » mais « évaluer ce catalogue une fois par langue » : mesuré sur dev,
  11 locales donnaient 12 lignes et 9,5 Ko dans `bcpg:entityScore` d'une seule MP, contre
  ~1 Ko avant. Ramené à quatre (`en, fr, es, de`) → 5 lignes, 3,6 Ko. À garder en tête avant
  d'en ajouter.
- **Trois projets de test à supprimer sur dev** : `testtest` (2020, site `archived`),
  `test_commentaire` et `Test commentaire` (2022 et 2024, site `simulation`). Tous
  `pjt:project`, sans entité rattachée. La suppression a été refusée par la politique de
  permissions de l'agent ; les trois questions de test, elles, sont retirées
  (`bcpg:isDeleted = true`, vérifié).
- **Un flag `bcpg:isDeleted` qui ne tient pas du premier coup.** Les trois PUT sur les
  questions de test ont répondu `true`, et une relecture quelques secondes plus tard donnait
  `false` sur les trois. La seconde salve a tenu. Aucune policy beCPG ne touche cette
  propriété — vérifié. À élucider.
- **Les trois listes de questions de dev** — `surveyQuestion`, `surveyQuestion@5` et
  `SurveyQuestions` — devraient n'en faire qu'une. C'est probablement ce qui rend les
  questionnaires incohérents, plus que les questions de test elles-mêmes.
- **`deploy-fast.sh` a un bug d'ordonnancement.** Ses quatre cibles dans un seul
  `docker compose build` partent en parallèle, et `becpg-plm-core` échoue parce que
  `becpg-base-core`, dont il hérite, n'existe pas encore. Correction : deux invocations.
  Par ailleurs le build exige `JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64` — le 17 par
  défaut ne sait pas produire du `release 21`.
- **Les visiteurs d'init ne tournent pas au démarrage.** `InitVisitorService` est piloté par
  `GET becpg/admin/repository/init-repo` (`AdminModuleWebScript`, ~55 s). Un déploiement seul
  ne sème rien. Le Javadoc du visiteur affirmait le contraire ; corrigé.

### Ouvert depuis le relevé du 06/08

- **Réfuté depuis** : la formulation qui échouait sur `Type is not queryable
  bcpg:regulatoryUsage` (42 occurrences en 6 h dans les logs de dev, cause des 34 échecs du
  batch `reformulateChangedEntities`) est corrigée par `11363c6d Fix #35938`, embarqué dans
  la livraison du 12/08.

- **OLAP — il n'y avait rien à réparer : c'était le compte de mesure.** Re-testé le 10/08.
  Le cube de dev répond, avec de vrais chiffres (`taskTrend` 10 lignes depuis 2019,
  `taskStates` 6, `completion` 3, incidents par fournisseur 18) — **mais uniquement pour un
  compte autre qu'`admin.test.user`**, le seul avec lequel les mesures du 07/08 avaient été
  faites. Sous `admin.test.user` chaque requête répond `{"metadatas":[],"resultsets":[]}` en
  200 ; sous `purchasingmgr`, `qualitymgr` ou `rduser`, les mêmes statements renvoient leurs
  lignes. La source de données Saiku est en `security.type=one2one` : c'est là qu'il faut
  regarder si l'on veut qu'un administrateur voie le cube. **Rien à faire côté base ni côté
  synchronisation** — la piste « `becpg_olap_dev` vide » est réfutée.
  **Reste à faire côté portail** : `taskTrend`, `taskStates` et `completion` déclarent
  `supplierScope: 'none'` alors que l'axe fournisseur répond désormais sur `projectsSteps`
  **et** `projects` (133 lignes chacun, mesuré). Les passer à `'slicer'` — la doctrine du
  module est remplie, chaque statement a été exécuté contre le vrai cube. Détail en §5.1.
- **Appliquer la NetworkPolicy de l'IA — c'est le seul geste qui manque, et il est mesuré.**
  Livraison du 10/08 vérifiée sur dev : `becpg/ai/suggestions` est enregistré (401 sans
  ticket, plus 404) et `-DbeCPG.ai.serverUrl=http://becpg-ai-dev` est bien dans les
  `CATALINA_OPTS` de `becpg-core-dev`. Mais l'appel répond **`502 {"error":"aiUnreachable"}`
  en 5,1 s** — le délai d'un paquet jeté, pas d'un refus. Vérifié : `becpg-core-to-ai-netpol`
  **n'existe pas** dans `becpg-test2`, et l'egress de `becpg-core-dev-netpol` n'autorise que
  MySQL (127.0.0.1:3306), `becpg-search-master2:8983`, `becpg-mail:25`, les IP de métadonnées,
  le DNS et le 443 sortant. Tant que la règle n'est pas posée, **l'IA ne marche pas sur dev**,
  avec une configuration qui a pourtant l'air juste. Les fichiers sont **modifiés**, rien n'a
  été appliqué : `kubectl` en écriture est refusé par la politique de permissions de l'agent.
  Deux fichiers, deux rôles :

  | Fichier | Ce qui y a été ajouté |
  |---|---|
  | `becpg/becpg-enterprise/deployment.yml` | `-DbeCPG.ai.serverUrl=http://becpg-ai-dev` dans les `CATALINA_OPTS` du dépôt (service `becpg-ai-dev` : `80 → 8080`) |
  | `becpg-saas/kb-instances/becpg-test2/policies/deployment.yml` | `becpg-core-to-ai-netpol`, sur le modèle de `becpg-core-to-report-netpol` |

  **Pourquoi la NetworkPolicy est indispensable** : l'egress de `becpg-core-*-netpol`
  n'autorise que MySQL, Solr, le mail, les IP de métadonnées, le DNS et le 443 sortant.
  Seul Share avait le droit de joindre becpg-ai — le dépôt ne l'appelait jamais avant.
  Sans la règle, l'appel expire et le proxy répond `502 aiUnreachable`, avec une
  configuration qui a pourtant l'air juste. (Côté becpg-ai rien à faire : son ingress est
  déjà `from: []` sur 8080.)

  ```bash
  # La règle réseau : immédiate, sans redémarrage. Extraire le seul document ajouté.
  cd becpg-saas/kb-instances/becpg-test2/policies
  awk '/name: becpg-core-to-ai-netpol/{f=1} f' deployment.yml \
    | sed '1i apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:' | kubectl apply -f -
  # …ou, plus simplement, réappliquer tout le fichier (déclaratif, déjà déployé) :
  #   kubectl apply -f deployment.yml
  ```

  **Le patch des `CATALINA_OPTS` redémarre `dev.becpg.fr`** — et n'apporte rien tant que
  l'image becpg-core ne contient pas `AiSuggestionsProxyWebScript` ; la prochaine livraison
  emportera de toute façon la valeur depuis `deployment.yml`. Pour la poser à chaud sans
  redémarrage : `POST /becpg/admin/system/config/update
  {"key":"beCPG.ai.serverUrl","value":"http://becpg-ai-dev"}` (`confValue` lit l'attribut en
  base avant les propriétés — c'est ainsi que le test local a été fait).

  **Attention au sélecteur** : les pods becpg-ai portent `app.kubernetes.io/component:
  backend`, pas `ai` — ce dernier n'existe que sur l'objet NetworkPolicy. La règle sélectionne
  donc `app.kubernetes.io/name: becpg-ai`, qui couvre `becpg-ai` et `becpg-ai-dev`. Un
  sélecteur sur `component: ai` ne matcherait rien, sans le dire.

  **Couverture des clusters** — la règle est ajoutée partout où le motif transverse existe,
  avec le même `spec` (vérifié : un seul spec distinct sur les 5 fichiers), seul le label
  `environment` suivant la convention locale :

  | Fichier | `environment` | Décision |
  |---|---|---|
  | `kb-instances/becpg-test2/policies` | `test` | ✅ ajouté — c'est là que tourne dev.becpg.fr |
  | `kb-instances/becpg-saas/policies` | `prod` | ✅ ajouté |
  | `kb-instances/becpg-saas2/policies` | `prod` | ✅ ajouté |
  | `kb-instances/becpg-test3/policies` | `test` | ✅ ajouté |
  | `terraform/…/cluster-template/policies` | `test` | ✅ ajouté — amorce les nouveaux clusters |
  | `kb-instances/becpg-saas-us/policies` | `prod` | ⚠️ **non ajouté** — voir ci-dessous |
  | `becpg-connectors`, `becpg-front`, `becpg-integration`, `becpg-test` | — | pas de becpg-ai (`becpg-front` n'en a qu'une mention en commentaire) |

  **`becpg-saas-us` demande un autre geste.** Son fichier de policies ne gère pas du tout
  l'egress du dépôt : zéro occurrence de `becpg-core`, aucun sélecteur `part-of: becpg`, et
  aucune policy `becpg-core-to-*`. Y déposer la règle transverse reviendrait à introduire un
  motif absent de ce cluster, en sélectionnant des pods sur un label que je n'ai pas pu
  vérifier là-bas. À traiter par quelqu'un qui sait comment l'egress du dépôt y est accordé.
  Son `becpg-ai-netpol` est en revanche déjà ouvert en ingress aux pods portant un label
  `app`, donc côté AI il n'y a rien à faire.

  **Rien n'est déployé** : les cinq fichiers sont modifiés, aucun `kubectl apply` n'a été
  passé.
- ~~**Déployer `AiSuggestionsProxyWebScript`** et renseigner `beCPG.ai.serverUrl`~~ :
  **fait le 10/08** (`dev.becpg.fr` 26.1.0.31). Les deux sont vérifiés sur l'instance ; il ne
  reste que la règle réseau ci-dessus. L'aller-retour *réussi* attend donc toujours, mais pour
  une seule raison désormais nommée et mesurée.

- **Une nouvelle défaillance, trouvée en cherchant OLAP : le canal de publication de dev est
  bloqué.** `bp:pubChannelId=becpg-olap` porte **25 entités archivées** que le connecteur ne
  peut jamais publier — `401 - 07105963 You cannot update this entity since it is archived` —
  et qu'il relit à chaque exécution (`readCount = 27` pour 25 bloquées). Le pas de batch est
  en `.skip(Exception.class)` / `skipLimit=Integer.MAX_VALUE` : elles sont donc **sautées en
  silence**, et le canal se déclare `COMPLETED` avec `failCount = 0`. Rien dans le statut ne
  dit qu'il tourne à vide. Deux gestes possibles : purger ces 25 lignes de la liste de
  publication, ou faire que le connecteur retire de la file une entité archivée au lieu de la
  réessayer indéfiniment. Sans conséquence sur les mesures ci-dessus — le cube répond — mais
  les entités modifiées après elles n'entrent pas dans les faits.

- ~~**Keycloak** — renseigner « Valid post logout redirect URIs »~~ : déjà fait pour
  `portal.becpg.fr` (vérifié le 2026-08-07). À renseigner en revanche sur tout autre
  émetteur, et pour le développement local (`http://localhost:3000/login`, refusé).
- ~~**Livrer les trois changements `../becpg`**~~ (`portal-form.lib.js`,
  `SupplierPortalInitRepoVisitor`, `AiSuggestionsProxyWebScript`) : **fait le 10/08** —
  poussés sur `master` et embarqués dans `dev.becpg.fr` 26.1.0.31 (build 16:54).
- **Correction d'une coquille par un interne** : l'écran de relecture d'une tâche
  de validation reste en lecture seule. Ouvrir la saisie à un valideur est une
  décision de sécurité côté beCPG (`SupplierSecurityPlugin`), pas un réglage
  d'affichage — à arbitrer avant de l'implémenter.
- **Rendu visuel non vérifié** : l'extension navigateur n'était pas connectée ce
  tour. Build, lint, réponses HTTP et charges utiles l'ont été.
- **Nouveau, à élucider : `08-datalists › 3` échoue sur la navigation clavier.**
  Exécution du 10/08 : l'association multivaluée annonce `aria-activedescendant="_r_c_-3"`
  alors que le test attend l'`id` de l'option qu'il vient de mettre en surbrillance
  (34 tentatives, valeur stable). Soit la liste se refiltre entre la flèche et l'assertion,
  soit l'index de surbrillance ne suit pas la liste rendue — et c'est exactement ce qu'un
  lecteur d'écran annonce, donc l'invariant compte. Le cas 2 passe.
- **`07-wizard-steps` est instable sur la pile locale.** Sur six exécutions
  consécutives l'échec s'est déplacé : cas 2, 3b, 8b (×3), puis le cas **0**.
  **Vérifié : ce n'est pas cette passe** — les six fichiers `components/wizard/**`
  remis à leur état d'avant, le même cas échoue à l'identique.
  **Le cas 0 est élucidé et mesuré** : `/api/v1/tasks?pageSize=100` renvoie 100
  éléments pour `counters.total = 101`, et la tâche de la fixture — échéance à
  trois semaines, donc triée en dernier — est l'élément 101. Le dépôt local a
  accumulé des tâches « Référencement » ouvertes, une par exécution interrompue,
  et il a franchi le seuil que le test se garde. **À faire : fermer ces tâches sur
  `MPSEED001`** (je n'ai rien supprimé). Reste `8b` seul à élucider ; deux
  explications ont été formulées puis **réfutées** (Fast Refresh, barre d'actions
  qui bouge sous le curseur) — le détail est dans le statut, pour ne pas les
  reproposer.
