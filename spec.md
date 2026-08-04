# beCPG — Portail Fournisseur V2

> Spécification consolidée — refonte UI du portail fournisseur beCPG en React.
> Date : 2026-07-29 · Statut : draft de cadrage (remplace `v2/SPEC_V2.md` et `v2/specs.md`)

---

## 0. Résumé exécutif

Le portail fournisseur beCPG existe et fonctionne. Il repose sur un socle métier solide
(projets PLM, branches d'entité, workflow de validation, signature électronique, catalogues de
conformité, questionnaires). Ce qui est daté, c'est **exclusivement la couche de présentation**
(Alfresco Share / YUI 2, non responsive, non mobile, ergonomie de 2015).

**Contrainte structurante, qui prime sur tout le reste :**

> **Le moins de modification possible dans beCPG. Tous les référencements en cours doivent
> continuer à fonctionner, indifféremment sur l'ancien ou le nouveau portail.**

Les deux portails cohabitent sans bascule et sans migration de données (§7). Toute modification
côté beCPG est **strictement additive** : une nouvelle vue JSON, un nouveau modèle livré par
`init-repo`, jamais un changement de comportement existant. **Aucune évolution du modèle de
données** : même le statut d'agrément est dérivé à la demande (§5.4.3).

**Décision de cadrage : on conserve 100 % du moteur métier existant (becpg-core / becpg-plm) et
on remplace la couche UI par une application React/Next.js autonome**, sur la même stack que
`becpg-regulatory-ui` : **une application Next.js unique**, dont les route handlers font office
de proxy authentifié vers Alfresco / Share / becpg-ai — exactement comme le proxy de Share
aujourd'hui. Pas de backend Java dédié ; toute logique non-présentation va dans
`becpg-plm-core`.

Le benchmark Tracklab et Specright montre que le différenciant du marché n'est plus le
formulaire de saisie (beCPG le fait déjà mieux : formulation, catalogues, cahiers des charges)
mais deux choses que beCPG possède sans les exposer :

1. **Le cycle de vie documentaire continu** — exigences documentaires paramétrables, relances
   automatiques, détection d'expiration, extraction IA, statut d'agrément opposable.
2. **Le pilotage côté client** — c'est l'écran qui est vendu, démontré et regardé tous les
   jours. Aujourd'hui un référent qualité beCPG doit ouvrir projet par projet dans Share pour
   savoir où en est son parc fournisseurs.

**L'application couvre donc deux espaces derrière le même SSO** : l'espace fournisseur
(saisie, documents, signature) et l'espace de pilotage (Qualité, Achats, R&D, RSE).

Les cas Bridor (§2bis) et Aryzta (§2ter) servent de maquette grandeur nature. Leur paramétrage
contient une série d'idées génériques — sous-fournisseurs, emballage fournisseur, jeu complet de
formulaires `supplier`, questionnaires multiples, documents conditionnels, process déclaratifs,
portée par filiale — qui doivent être livrées en standard par `init-repo` plutôt que refaites
chez chaque client.

---

## 1. Analyse de l'existant (`../becpg`)

### 1.1 Vue d'ensemble du processus de référencement

```
[Client] Produit / MP / Fournisseur
   └─ Action Share « Envoyer au fournisseur » (choix d'un modèle de projet)
        POST becpg/supplier/sendToSupplier
        └─ SupplierPortalServiceImpl.createSupplierProject()
             ├─ createBranch(entité)  → copie de travail dans l'espace fournisseur
             │    + assoc bcpg:autoMergeTo, autoMergeVersionType=MAJOR
             ├─ création du projet pjt:project (état InProgress) dans la doclib du site
             └─ assoc bcpg:suppliers + bcpg:supplierAccounts
   └─ Tâche 1 « Fournisseur » (5j)
        ├─ livrable script Pre : supplierPortalScript.js → bSupplier.assignToSupplier()
        │     · assigne les comptes fournisseur à la tâche
        │     · déplace l'entité dans l'espace du fournisseur
        │     · crée/alimente le groupe GROUP_EXTERNAL_SUPPLIER_<code>
        │     · permissions : Consumer sur l'entité (groupe), Contributor sur tâche + livrables
        └─ livrable URL : /share/page/wizard?id=supplier-{type}&nodeRef={entité}
   └─ Tâche 2 « Validation » (5j, groupe QualityMgr, refusedTask → Tâche 1)
        └─ livrable script Pre : supplierPortalPrepareSignatures.js
              → SupplierSignatureProjectPlugin (projectType = "supplierReferencing")
                 · génère/rafraîchit le rapport de type SupplierSheet
                 · le copie dans « Documents fournisseur »
                 · prépare la signature (bSign.prepareForSignature) + destinataires
                 · crée la tâche de clôture assignée au créateur du projet
   └─ Tâche « Signature » (fournisseur, PDFTron, toutes les pages, refus impossible)
   └─ Tâche « Clôture » (créateur)
        └─ livrable script Post : validateProjectEntity.js
              · merge de la branche vers l'entité d'origine
              · bcpg:productState / bcpg:supplierState → Valid
              · activité de changement d'état
```

### 1.2 Composants clés et fichiers de référence

| Domaine | Fichier |
|---|---|
| Service principal | `becpg-plm/becpg-plm-core/.../repo/supplier/impl/SupplierPortalServiceImpl.java` |
| API JS workflow | `becpg-plm/becpg-plm-core/.../repo/jscript/SupplierPortalHelper.java` |
| Sécurité externe | `becpg-plm/becpg-plm-core/.../repo/supplier/security/SupplierSecurityPlugin.java` |
| Signature | `becpg-plm/becpg-plm-core/.../repo/supplier/impl/SupplierSignatureProjectPlugin.java` |
| Bootstrap site + tpl projet | `becpg-plm/becpg-plm-core/.../repo/admin/SupplierPortalInitRepoVisitor.java` |
| Webscript création projet | `becpg-plm/becpg-plm-core/.../repo/web/scripts/supplier/SupplierPortalWebScript.java` |
| Scripts workflow | `becpg-plm/becpg-plm-core/src/main/resources/beCPG/supplier/*.js` |
| Config des wizards | `becpg-plm/becpg-plm-share/src/main/resources/alfresco/becpg-plm-share-config.xml` (`condition="wizard"`) |
| Runtime wizard | `becpg-share/src/main/assembly/web/components/wizard/wizard-mgr.js` |
| Panneau catalogue | `becpg-share/src/main/assembly/web/components/entity-catalog/entity-catalog.js` |
| Dashboard fournisseur | `becpg-plm/becpg-plm-share/.../site-data/presets/supplier-presets.xml` (`external-dashboard`) |
| Documentation | `becpg-docs/becpg-plm/latest/fr/utilization/supplier-portal-{client,supplier}-tuto.md`, `supplier-portal-advanced.md` |

### 1.3 Modèle de données existant (à conserver tel quel)

- **Fournisseur** : `bcpg:supplier`, déplacé dans la document library du site `supplier-portal`.
  Sous-listes : `bcpg:contactList`, `bcpg:plant`, `bcpg:certification`, `survey:surveyList`.
- **Documents** : aspect `bcpg:documentAspect` — `bcpg:documentState`, `bcpg:documentCategory`,
  `bcpg:documentIsMandatory`, assoc `bcpg:documentTypeRef` / `bcpg:documentEntityRef`, et
  **aspects obligatoires `cm:effectivity` (dates de début/fin de validité) et
  `bcpg:aiValidationAspect`** (`bcpg:aiValidationState` = ToValidate/…, `aiValidationHints`,
  `aiValidationDate`).
- **Type de document** : `bcpg:documentType` (caractéristique de référentiel) —
  `docTypeCategory`, `docTypeIsMandatory`, `docTypeEffectivityType`,
  `docTypeAutoExpirationDelay`, `docTypeFormula`, `docTypeNameFormat`, `docTypeLinkedTypes`,
  `docTypeDestPath`, assoc `docTypeLinkedCharacts` / `docTypeLinkedHierarchy`, aspect
  `bcpg:aiAspect` (`aiExtraPrompt`, `aiSuggestedFields`, `aiValidationCriteria`).
- **Comptes fournisseur** : personnes Alfresco du groupe `GROUP_EXTERNAL_USER`, liées par
  l'association `bcpg:supplierAccounts` (sur le fournisseur *et* sur la ligne de contact).
  Création via `createExternalUser()` (requiert `ExternalUserMgr`), synchronisation IDS activée,
  désactivation automatique du compte quand plus aucune association ne subsiste.
- **Groupe par fournisseur** : `GROUP_EXTERNAL_SUPPLIER_<bcpg:code>`, porté par
  `bcpg:externalAccessGroup` sur l'entité.
- **Projet** : `pjt:project` avec aspect `bcpg:suppliersAspect`, associations `bcpg:suppliers`
  et `bcpg:supplierAccounts`, listes `pjt:taskList` / `pjt:deliverableList` / `bcpg:activityList`.
- **Entité travaillée** : branche (`bcpg:entityBranch`) de la MP/PF/emballage, rangée dans
  `Fournisseur > Entités`, avec sous-dossier `Documents fournisseur`.
- **Nommage** configurable :
  `beCPG.sendToSupplier.projectName.format` = `{entity_cm:name} - {supplier_cm:name} - REFERENCING - {date_YYYY}`
  `beCPG.sendToSupplier.entityName.format` = `{entity_cm:name} - UPDATE - {date_YYYY}`
  Placeholders `{entity_*}`, `{supplier_*}`, `{date_*}`, alternatives via `|`.
- **Permission fournisseur** : `beCPG.security.supplierPermission` (défaut `Coordinator`).

### 1.4 Le wizard actuel : ce qu'il fait vraiment

Configuration déclarative XML, un wizard par type d'entité
(`supplier-rawMaterial`, `-finishedProduct`, `-semiFinishedProduct`, `-packagingMaterial`,
`-packagingKit`, `-supplier`, `-content`, `-nc`).

Attributs de wizard : `draft` (bouton Terminer toujours visible), `comments`, `allSteps`,
`read-only`, `enforceTask` (écriture uniquement si tâche assignée), `skipSecurityRules`.

Types d'étape :

| type | rendu | source |
|---|---|---|
| `form` | formulaire d'entité (`formId=supplier`) | `components/form` |
| `entityDataList` | datagrid de liste (ingList, nutList, allergenList, physicoChemList, labelClaimList, microbioList, organoList, packMaterialList, certification, plant, contactList) | `entity-charact-views/simple-view` |
| `survey` | questionnaire | `survey/survey-form` |
| `documents` | dépôt documentaire | `entity-charact-views/simple-documents-view` |

`nextStepWebScript` permet de reformuler entre deux étapes
(`becpg/remote/formulate?nodeRef=…`) ou de basculer sur le dossier des documents fournisseur
(`becpg/project/path?nodeRef=…&path=SupplierDocuments`).

**Validation partielle** — le mécanisme le plus important à conserver :
`becpg/security/entitylists/check/<nodeRef>` renvoie `accessMode` + l'état de chaque datalist.
Une liste marquée `Valid` par le client devient **non modifiable** côté fournisseur (le pas est
affiché avec la classe `Valid`). Le client peut aussi verrouiller ligne à ligne et commenter
au niveau tâche / entité / liste.

**Catalogues** : si `catalogId` est passé, le panneau « Complétion des propriétés »
(`beCPG.component.EntityCatalog`) affiche en temps réel les champs obligatoires manquants et
met en évidence les champs du formulaire. Les catalogues sont du JSON stocké dans
`Entrepôt > Système > Catalogues de propriétés` (cf. `becpg-docs/.../development/catalog.md`) :
`fields`, `uniqueFields`, `auditedFields`, `entityFilter` (SPEL), `locales`, `i18nMessages`,
formules `formula1|spel(...)`, `protectedFields`, `color`.

### 1.5 Ce qui existe déjà et qu'il faut REPRENDRE (pas réinventer)

C'est le point le plus important de ce document : **la quasi-totalité des briques métier
existent**. Le chantier est un chantier d'**exposition et d'ergonomie**, pas de construction.

| Brique | Où | État |
|---|---|---|
| **Tableau de bord fournisseur** avec Mes tâches, Mes discussions, Mes produits | preset Share `external-dashboard` : dashlets `my-tasks`, `forum-summary`, `product-catalog` (`supplier-presets.xml`) | ✅ existe — à **remettre en forme**, pas à créer |
| **Notifications** | `NotificationRuleService` + `NotificationRuleJob` (quartz, multi-tenant) ; règles paramétrables en administration : type de nœud, champ date, conditions, nb de jours, destinataires, fréquence/récurrence, template email, script, rapports joints. Une règle standard livrée : **documents périmés dans moins de 90 j** (`becpg-docs/.../utilization/ged.md`) | ✅ existe — à **brancher sur le portail** (notifications in-app + préférences fournisseur) |
| **Types de documents et exigences** | `bcpg:documentType` : `docTypeIsMandatory`, `docTypeEffectivityType`, `docTypeAutoExpirationDelay`, `docTypeFormula` (applicabilité), `docTypeNameFormat`, `docTypeLinkedTypes`, `docTypeLinkedCharacts`, `docTypeLinkedHierarchy`, `docTypeDestPath` | ✅ existe — à **exposer au fournisseur** (« voici ce que vous devez fournir, et pour quand ») |
| **Dates de validité des documents** | `cm:effectivity` obligatoire sur `bcpg:documentAspect` | ✅ existe |
| **Analyse IA des documents** | `bcpg:aiValidationAspect` sur les documents, `bcpg:aiAspect` sur les types (`aiExtraPrompt`, `aiSuggestedFields`, `aiValidationCriteria`), plugins becpg-ai `DocumentExtractionSuggestionPlugin` / `DocumentReviewSuggestionPlugin` avec scores de confiance | ✅ existe — **mais pas disponible au fournisseur dans le wizard** |
| **Catalogues de conformité** | JSON (`fields`, `entityFilter` SPEL, formules, `protectedFields`, couleurs) + composant `EntityCatalog` déjà branchable dans le wizard via `catalogId` | ✅ existe — à **activer par défaut** dans le parcours fournisseur |
| **Cahiers des charges** | entité Spécification produit, niveaux d'exigence, contrôle automatique (`reqCtrlList`) | ✅ existe — à **exposer en lecture au fournisseur** |
| **Scoring** | `pjt:scoreList` (critère / poids / note / plage), export `ExportSupplierScoreList` | ✅ existe — restitution à construire |
| **Branche + auto-merge** | le fournisseur ne touche jamais la donnée de production | ✅ intouchable |
| **Sécurité pilotée par la tâche** | `SupplierSecurityPlugin` : écriture seulement pendant une tâche wizard active | ✅ intouchable |
| **Validation liste-par-liste + gel** | `becpg/security/entitylists/check` | ✅ intouchable |
| **Signature électronique** | paramétrage fin (ancrage, paraphes, position) | ✅ intouchable |
| **Modèles de projet** | tout le process est paramétrable par client | ✅ intouchable |
| **Authentification** | IDS (Keycloak) devant Alfresco — realm `dev`, client `dev-openid` sur dev.becpg.fr | ✅ existe |

### 1.6 Faiblesses réelles (le vrai backlog)

| # | Problème | Impact |
|---|---|---|
| F1 | UI Share/YUI2, non responsive, inutilisable sur mobile | adoption fournisseur |
| F2 | Sauvegarde du wizard non fiable (« les infos de la dernière fenêtre ne sont pas enregistrées ») | perte de saisie, abandon |
| F3 | Le tableau de bord existe mais reste **générique Share** : pas de statut d'agrément, pas de complétude, pas de vue « mes documents » avec dates de validité, pas de priorisation | le fournisseur voit ses tâches, mais pas *où il en est* |
| F4 | Les notifications existent mais sont **email uniquement, côté client** : pas de restitution in-app côté fournisseur, pas de relance graduée (J-90/60/30) ni d'escalade interne prête à l'emploi pour le référencement | le fournisseur reçoit un mail et n'a nulle part où atterrir |
| F5 | Les types de documents et leur applicabilité (`docTypeFormula`) existent mais **ne sont pas restitués au fournisseur** comme une liste d'exigences à satisfaire | le fournisseur ne sait pas ce qu'on attend de lui |
| F6 | L'analyse/extraction IA des documents existe mais **n'est pas disponible au fournisseur dans le wizard** | ressaisie intégrale alors que la FT contient tout |
| F7 | Le scoring `pjt:scoreList` existe mais sans restitution ni alimentation automatique | pas de décision d'achat objectivée |
| F8 | Pas de multitenant explicite ni de branding côté portail | un fournisseur multi-clients ne sait pas où il est |
| F9 | Les catalogues existent et sont branchables dans le wizard, mais **ne sont pas activés dans le parcours fournisseur standard** ; les cahiers des charges ne sont pas exposés en lecture | le fournisseur découvre les exigences à l'erreur de validation |
| F10 | Le fournisseur ne peut **rien initier** : pas de moyen de démarrer un projet (mise à jour de FT, changement de site, renouvellement de certificat) | données figées entre deux campagnes |

---

## 2. Benchmark Tracklab & Specright

[Tracklab](https://www.tracklab.co/en) (SaaS français, 2022) — plateforme de conformité
documentaire fournisseur pour l'agroalimentaire, l'alimentation animale, les arômes,
l'emballage et la chimie.

### 2.1 Modules et fonctionnalités

| Module Tracklab | Contenu | Équivalent beCPG | Verdict |
|---|---|---|---|
| **Supplier & Product database** | objets standardisés fournisseur / produit / relation fournisseur-produit, champs personnalisables, versioning, historique complet, recherche + filtres avancés, accès par rôle | `bcpg:supplier`, `bcpg:rawMaterial`, modèle de données extensible, versions d'entité, ACL | ✅ **beCPG est déjà supérieur** (formulation, nomenclature, listes typées) |
| **Supplier & Product onboarding** | exigences documentaires définies **par type de fournisseur / produit / site / marché**, espace fournisseur structuré, relances auto jusqu'à complétude, **statut d'agrément opposable avant toute commande**, alerte acheteur en cas d'approbation/suspension | `bcpg:documentType` (`docTypeIsMandatory`, `docTypeFormula`, `docTypeLinkedHierarchy`) + modèles de projet + wizard | 🟡 **le paramétrage existe, la restitution au fournisseur non** ; le statut d'agrément consolidé reste à créer |
| **Document renewal engine** | suivi automatique des dates d'expiration par fournisseur et par produit, notifications anticipées configurables, relance auto du fournisseur, **escalade interne** vers l'acheteur, comparaison automatique de versions, pré-validation IA | `cm:effectivity` + `docTypeAutoExpirationDelay` + `NotificationRuleService`/`NotificationRuleJob` (règle standard « périmés < 90 j ») + `bcpg:aiValidationAspect` | 🟡 **toutes les briques existent** ; manquent l'orchestration graduée (J-90/60/30 → escalade), la boucle de relance côté portail et le diff de versions |
| **Intelligent risk detection** | classification auto des documents, vérification des mentions obligatoires par type de document, extraction dates/seuils/valeurs, comparaison de versions ciblée sur ce qui impacte la conformité, contrôle des résultats labo vs seuils tolérés | `reqCtrlList`, cahiers des charges, becpg-regulatory, `aiValidationCriteria` sur `bcpg:documentType`, `DocumentReviewSuggestionPlugin` | 🟡 **présent, non exposé au fournisseur** ; manque le diff de versions |
| **Supplier evaluation & dashboards** | scoring configurable (niveau fournisseur ET fournisseur-produit), dashboards dynamiques avec évolution dans le temps, vues par service (Qualité, Achats, R&D, RSE), comparaison multi-fournisseurs, alertes fournisseurs à risque | `pjt:scoreList` (critères/poids/note), export `ExportSupplierScoreList`, OLAP | 🟡 **socle présent, restitution absente** |
| **Enhanced laboratory analyses** | traitement des bulletins d'analyse, extraction des valeurs, contrôle vs seuils | `bcpg:microbioList`, `bcpg:physicoChemList`, `qa:`, extraction IA | 🟡 modèle + extraction présents, chaînage bulletin → liste → seuil à câbler |
| **Certification compliance** | connexion aux bases de certification (IFS, BRC, GLOBALG.A.P., MSC/ASC…) pour récupérer les certificats sans passer par le fournisseur | `bcpg:certification` saisi à la main | ❌ **à construire** (connecteurs) |
| **Integrations** | sync ERP bidirectionnelle des référentiels, **renvoi du statut d'agrément vers l'ERP**, push des données techniques vers le PLM | `becpg-connector`, `becpg-sap-connector`, remote API | ✅ acquis, reste à câbler le statut d'agrément |
| **Tracklab Hub** | réseau mutualisé : >10 000 fournisseurs, le fournisseur dépose sa doc **une fois** et la partage avec tous ses clients | aucun | ❌ hors périmètre V1, mais **c'est le moat de Tracklab** — à noter en vision produit |

### 2.2 Ce que Tracklab fait mieux, et pourquoi

L'écart n'est presque jamais un écart de **fonctionnalité** — c'est un écart d'**exposition
au fournisseur**. beCPG a les données, les règles et les moteurs ; il ne les montre pas au bon
acteur, au bon moment.

1. **Le document est le point d'entrée, pas le formulaire.** Chez Tracklab le fournisseur
   dépose un PDF, l'IA classe, extrait, remplit. beCPG **sait faire tout cela**
   (`DocumentExtractionSuggestionPlugin`, `aiValidationCriteria`) mais le fournisseur n'y a pas
   accès dans le wizard : il remplit 9 listes à la main.
   → **inversion du wizard : documents d'abord + IA exposée au fournisseur.**
2. **Le cycle est continu, pas événementiel.** beCPG a les dates de validité
   (`cm:effectivity`), le délai d'expiration par type (`docTypeAutoExpirationDelay`) et un
   moteur de notification planifié — mais la boucle s'arrête à un email au client. Il manque
   la relance graduée vers le fournisseur, l'escalade interne et l'atterrissage dans le portail.
3. **Le statut est opposable.** « clear, shared, and enforceable status before any order is
   placed » — le statut d'agrément fournisseur/produit est renvoyé à l'ERP et bloque l'achat.
4. **La restitution est par métier.** Qualité, Achats, R&D et RSE ont chacun leur dashboard sur
   la même donnée.

### 2.3 Specright — le pilotage comme produit

[Specright](https://www.specright.com/) (Specification Data Management) confirme et complète
Tracklab sur le volet **pilotage côté client**, qui est le module que beCPG n'expose pas du tout.

| Capacité Specright | Détail | Équivalent beCPG |
|---|---|---|
| **Supplier Network / soumission libre** | le fournisseur envoie de l'Excel, du PDF ou depuis ses propres systèmes ; l'IA mappe et valide contre les champs attendus et écrit une spec structurée | extraction IA présente (`DocumentExtractionSuggestionPlugin`), mais pas le mapping « fichier libre → champs attendus » |
| **Scorecards qualité fournisseur automatisées** | notation calculée, pas saisie | `pjt:scoreList` existe, l'alimentation automatique non |
| **Dashboards temps réel** qualité / conformité / durabilité | live reports sur toute la base fournisseurs | ❌ **absent** |
| **SCAR / CAR / non-conformités** avec workflow et approbation | boucle d'action corrective fournisseur tracée | `qa:nc` + wizard `supplier-nc` existent, non exposés en pilotage |
| **COA et résultats d'analyse** rattachés à la spec, traçabilité au lot | | `qa:batch*`, microbio/physico-chimie |
| **Permissions au niveau champ** | le fournisseur ne voit que ce qui le concerne | formulaires `supplier` dédiés (cf. Bridor §2bis.1) + `SecurityService` |
| **Alertes d'expiration + rappels de mise à jour** | posés par le fournisseur lui-même | `cm:effectivity` + `NotificationRuleService` |
| **Gestion des appels d'offres (bids)** | le fournisseur répond à une spec d'emballage | hors périmètre |
| **Données d'inspection FDA** | source externe branchée sur le référentiel | hors périmètre (équivalent : connecteurs de certification) |

**L'enseignement commun à Tracklab et Specright** : la valeur perçue ne vient pas seulement de
l'écran fournisseur, elle vient du **dashboard client**. C'est ce qui est vendu, démontré et
regardé tous les jours. Le portail beCPG doit donc servir **deux audiences**.

### 2.4 Ce que beCPG fait mieux (à mettre en avant)

- Formulation réelle (ingrédients, nutriments, allergènes, coûts, étiquetage INCO) — Tracklab
  ne fait que de l'extraction documentaire.
- Cahiers des charges clients avec niveaux d'exigence et contrôle automatique
  (`becpg-docs/.../utilization/specification.md`).
- Conformité réglementaire multi-pays (becpg-regulatory, Decernis).
- Signature électronique intégrée au process.
- Modèle de données ouvert et modèles de projet entièrement paramétrables.

---

## 2bis. Cas client Bridor — les bonnes idées à reprendre en standard

Bridor est le client le plus avancé sur le portail fournisseur (lots DEV-752 puis DEV-918,
~90 h de prestation cumulées). Son paramétrage est une **maquette grandeur nature de ce que le
produit devrait livrer par défaut**. Sources : `../bridor/data/`, tickets Redmine du projet 56.

### 2bis.1 Les idées Bridor à généraliser

| Idée mise en place chez Bridor | Où | Pourquoi c'est générique |
|---|---|---|
| **Sous-fournisseurs** : fournisseur parent / enfants + liste « sous-fournisseurs » (`bcpg:parentEntityRef`) | #31938, #29273 | Tout industriel achète via des groupes, des filiales ou des négociants. Le besoin est universel, l'implémentation Bridor est propre (elle réutilise un champ existant). |
| **Liste emballage fournisseur** (SupplierPackaging) sur MP / EMB / produit de négoce | #29273 | L'emballage du produit acheté est une donnée que tout le monde demande au fournisseur. |
| **Formulaire `supplier` dédié par type d'entité** (MP, SF, PF), distinct du formulaire interne | `bri-mp-form-config.xml:874`, `bri-sf-form-config.xml:238`, `bri-pf-form-config.xml:753` | C'est **le bon pattern** : on ne montre au fournisseur que ce qu'on attend de lui, avec ses propres libellés, aides et unités. À livrer en standard pour chaque type. |
| **Questionnaire en fin de parcours** plutôt qu'en étape 2 (sur `supplier-rawMaterial`) | `becpg-config-custom.xml` | Bon réflexe UX : on commence par les données factuelles, on finit par les questions ouvertes. À reprendre comme ordre par défaut — et cohérent avec l'inversion du wizard (§4.4). |
| **Questionnaires riches** (les « 90 champs » paramétrés côté client) | #29273 | Valide que `survey:surveyList` tient la charge d'un vrai questionnaire d'agrément. À livrer avec des questionnaires types (agrément fournisseur, RSE, food defense). |
| **Génération conditionnelle de documents** : allégation « halal » certifiée → document exigé | #32395 | C'est exactement l'exigence documentaire conditionnelle du §4.5. Le mécanisme est produit, il ne marchait simplement pas sur `bcpg:supplier` — corrigé en 23.4.2. |
| **Rapport « Fiche Technique Fournisseur » dédié**, signé en fin de process | `data/reports/` | Le livrable contractuel du référencement. À livrer en standard (le type `SupplierSheet` existe déjà). |
| **Classement des fournisseurs par famille / sous-famille** dans le site portail | script de règle #24097 | Sans classement, la doclib du site devient un dossier plat de plusieurs milliers de fournisseurs. Devrait être un comportement d'`init-repo`. |
| **Formulaires de process dédiés** (`supplier-process`, `sign-process`) | #24097 | Le formulaire de lancement de process mérite d'être guidé, pas générique. |

### 2bis.2 Ce que les tickets Bridor disent du produit

| Ticket | Sujet | Enseignement |
|---|---|---|
| #35696 (ouvert) | Liseuse PDF plante sur Firefox → signature du CDC impossible ; le mail de création de compte recommande justement Firefox | La signature est le **point de rupture le plus coûteux** du parcours : elle est en fin de process, non contournable, et non refusable. À traiter en priorité dans la refonte. |
| #34523 | Après signature, le document reste bloqué en édition dans « Documents fournisseur » | idem |
| #33582 (haut, 8 h) | Impossible d'envoyer un référencement à un fournisseur depuis la PROD | fragilité de `sendToSupplier` |
| #32395 (haut) | Document conditionnel non généré sur `bcpg:supplier` alors que ça marche sur MP/EMB | **le moteur d'exigence documentaire conditionnelle existe mais était incomplet** — confirme §4.5 |
| #31283 (haut) | `supplierPortalPrepareSignatures` : la tâche de clôture remonte en première position | fragilité des scripts de livrable |
| #30111 | Création de compte fournisseur KO : `unauthorized_client` côté IDS | le couplage création de compte ↔ IDS est un point de fragilité — argument de plus pour ne **rien** changer à ce mécanisme |
| #25928 (haut, **19 h**) | Onglets du wizard qui ne passent pas au vert si on navigue vite : la pastille dépend du chargement asynchrone de la liste | **bug d'architecture du wizard actuel**, exactement ce que la refonte React élimine par construction (état dérivé du serveur, pas du DOM) |
| #34802 (rejeté) | Affichage « Nom fournisseur (username) » souhaité en « Nom fournisseur (email) » ; le username est figé à la création, donc un changement d'email oblige à recréer le compte | **vrai manque produit** : gérer le changement d'email d'un compte fournisseur sans recréation |

### 2bis.3 Ce qui doit remonter dans `init-repo`

Ta conclusion est la bonne : aujourd'hui trop de choses sont refaites chez chaque client alors
qu'elles sont génériques. À rapatrier dans `SupplierPortalInitRepoVisitor` et le modèle standard :

| À livrer en standard | Aujourd'hui |
|---|---|
| **Sous-fournisseurs** : type + liste sur `bcpg:supplier` | modèle Bridor, aspect ajouté à la main (#31938) |
| **Liste emballage fournisseur** (SupplierPackaging) | spécifique Bridor (#29273) |
| **Formulaires `supplier` par type d'entité** (MP, SF, PF, EMB, fournisseur) | refaits chez chaque client |
| **Questionnaires types** : agrément fournisseur, RSE, food defense | paramétrés à la main (#29273) |
| **Classement des fournisseurs par famille / sous-famille** | script de règle Bridor (#24097) |
| **Modèles de projet prêts à l'emploi** : référencement MP, référencement fournisseur, renouvellement documentaire, réclamation | un seul modèle générique, recréé à la main chez chaque client (#24097 : « suppression de l'actuel modèle et recréation ») |
| **Rapport Fiche Technique Fournisseur** (type `SupplierSheet`) prêt à signer | refait chez chaque client |
| **Neutralisation des règles de renommage client sur les branches fournisseur** | script Bridor (#24097) ; le produit renomme déjà via `beCPG.sendToSupplier.entityName.format`, il manque juste le moyen standard de dire « ne pas appliquer les règles client ici » |
| **Génération conditionnelle de documents sur `bcpg:supplier`** | ✅ déjà rapatrié en 23.4.2 (#32395) |

**Critère de décision** pour trancher « spécifique ou produit » : si le paramétrage répond à un
besoin qu'au moins deux clients auraient, il remonte dans `init-repo`. Sur la liste ci-dessus,
tout coche la case.

---

## 2ter. Cas client Aryzta — questionnaires, multi-filiale et process configurables

Aryzta (Germany, Fornetti, Coup de pates, I2L) est le second gros utilisateur du portail, avec
une approche complémentaire de celle de Bridor : là où Bridor a poussé le **modèle de données**,
Aryzta a poussé les **questionnaires**, le **multi-filiale** et la **configuration déclarative
des process**. Sources : `../aryzta/data/`, projets Redmine 95 / 126 / 152 / 170.

Le compte `supplier-test@becpg.fr` fourni pour la recette est d'ailleurs le compte de test
Aryzta Germany (cf. #19075).

### 2ter.1 Les idées Aryzta à généraliser

| Idée mise en place chez Aryzta | Où | Pourquoi c'est générique |
|---|---|---|
| **Plusieurs questionnaires par entité** : `surveyList`, `surveyList@1`, `surveyList@2`, `surveyList@3` en 4 étapes distinctes du wizard | `becpg-config-custom.xml` étapes 9-12 de `supplier-rawMaterial` | Un agrément fournisseur, ce n'est pas un questionnaire mais une **famille** de questionnaires (qualité, RSE, food defense, logistique). Le mécanisme `listId@N` existe déjà : il faut le documenter, le livrer en standard et le rendre lisible dans le nouveau wizard (un questionnaire = une section, pas une étape opaque). |
| **Formulaires de datagrid dédiés au fournisseur, liste par liste** : `datagrid-supplier-nut`, `datagrid-supplier-physico`, `datagrid-supplier-claim`, `datagrid-supplier-microbio` | idem | **La meilleure idée des deux clients.** Bridor restreint les *propriétés* vues par le fournisseur ; Aryzta restreint les *colonnes de chaque liste*. Ensemble, ça forme un **jeu de formulaires `supplier` complet** (propriétés + chaque datalist) à livrer en standard pour chaque type d'entité. |
| **Titre et consigne métier par étape** (`aryzta.wizard.supplierRM.stepN.title`) | idem | Chaque étape explique ce qu'on attend, au lieu d'afficher le nom technique de la liste. C'est exactement l'aide contextuelle demandée dans `SPEC_V2`. À livrer avec des textes par défaut, surchargeables. |
| **`process.json` : déclaration configurable des process** — conditions JS, pré-remplissage, champs masqués, `permissionGroup`, `redirectUrl`, `submissionUrl` | `data/process/process.json` (dont `send-to-supplier`, `formId: supplier-process`, pré-remplissage via `bSupplier.extractSupplierProjectName` / `extractSupplierAccountRefs`) | **C'est le modèle exact dont F10 a besoin** : « le fournisseur déclenche un processus autorisé ». Le mécanisme existe et est déjà déclaratif — il suffit de l'exposer côté portail avec un filtre sur les process ouverts aux externes. |
| **Email de création de compte complet et multilingue** (350 lignes, FR + DE) | `data/emails/importuser-email.ftl` | Le premier contact avec le fournisseur. Aujourd'hui refait chez chaque client. À livrer en standard, multilingue — et à corriger : celui de Bridor recommande encore Firefox (#35696). |
| **Import en masse de fournisseurs et de questionnaires** (Excel/CSV) | `data/imports/supplier.csv`, `Import_survey_admin.xlsx` | L'onboarding initial d'un parc de plusieurs centaines de fournisseurs ne se fait pas à la main. Le mécanisme d'import existe ; il doit être un parcours documenté du portail. |
| **Multi-filiale** : sites `germany-*` vs autres, destination du projet calculée par condition | `process.json` | Cf. §2ter.2 — c'est un besoin structurant. |

### 2ter.2 Le besoin multi-filiale (DEV-813, #25461, priorité haute)

Aryzta Germany et Fornetti veulent **partager les mêmes modèles d'entité et les mêmes
questionnaires**, tout en n'affichant à chaque fournisseur que les questions de sa filiale.
La demande est explicite : « *ensuring that subsidiary-specific questions are not displayed to
users from the other subsidiary* ».

C'est un cran en dessous du multitenant (même instance, même référentiel) mais ça a les mêmes
conséquences côté portail :

- le fournisseur doit voir **pour quelle filiale** il travaille (logo, nom) — même problème que
  le multitenant du §5.3, même solution ;
- les questionnaires, les exigences documentaires et les catalogues doivent pouvoir être
  **filtrés par filiale** — le mécanisme existe déjà partout ailleurs sous forme de filtre SPEL
  (`entityFilter` des catalogues, `docTypeFormula` des types de document) ; il manque sur les
  questions de questionnaire.

**À retenir pour la spec** : le portail doit traiter *tenant* et *filiale* comme deux niveaux du
même mécanisme de portée, pas comme deux fonctionnalités différentes.

### 2ter.3 Ce que les tickets Aryzta disent du produit

| Ticket | Sujet | Enseignement |
|---|---|---|
| #19293 (Germany, rejeté) | Le bandeau Share « créer un site » s'affiche aux comptes fournisseurs, et **on ne peut pas le retirer** parce qu'ils n'ont pas accès au tableau de bord pour le faire | **Argument massif pour le portail dédié** : aujourd'hui le fournisseur externe voit du chrome Share interne qui ne le concerne pas, et c'est structurellement non corrigeable. |
| #17985 (Germany) | « Portail fournisseur - List - accès denied - **comportement aléatoire** », résolu en supprimant les règles de sécurité | Le modèle ACL du portail est fragile et non déterministe côté Share. La refonte doit rendre l'état d'accès **explicite et lisible** (ce que renvoie `becpg/security/entitylists/check`), pas subi. |
| #19075 (Germany, rejeté) | Les champs à liste en bas du wizard s'affichent mal | Conséquence directe de l'embarquement de formulaires Share dans un wizard jQuery-steps. Disparaît par construction avec React. |
| #24285 (Fornetti, **urgent**) | Ticket parapluie « Supplier portal » ouvert 6 mois pour recenser les problèmes | Signal de fond : le portail génère assez de friction pour justifier un ticket permanent. |
| #25071 (Coup de pates) | « Stocker les fournisseurs validés dans le portail fournisseur » → modification des règles de classement | **Même besoin que Bridor** (§2bis.3) : le classement des fournisseurs dans le site portail doit être un comportement standard, pas une règle refaite chez chaque client. |

### 2ter.4 Complément à la liste `init-repo`

En plus du §2bis.3 :

| À livrer en standard | Aujourd'hui |
|---|---|
| **Jeu complet de formulaires `supplier`** : propriétés **et** datagrid de chaque liste (nut, physico, claim, microbio, ingList, organo…) | moitié chez Bridor, moitié chez Aryzta, refait à chaque fois |
| **Questionnaires multiples** (`surveyList@N`) documentés et livrés : agrément, RSE, food defense, logistique | paramétrés à la main (#29273, Aryzta 4 questionnaires) |
| **Portée par filiale** sur les questions de questionnaire | DEV-813 (#25461), spécifique Fornetti |
| **Titres et consignes d'étape par défaut** dans le wizard | clés i18n spécifiques par client |
| **Process déclaratifs ouverts aux externes** (base `process.json`) | `process.json` client, non exposé au fournisseur |
| **Email de création de compte multilingue** | refait chez chaque client, et daté (recommande Firefox) |
| **Classement des fournisseurs dans le site portail** | règle refaite chez Bridor **et** chez Coup de pates |

---

## 3. Tri des idées des specs V1/V2

### 3.1 À conserver (bonnes idées)

| Idée | Source | Commentaire |
|---|---|---|
| React / Next.js / Tailwind | `specs.md` | ✅ mais **aligner sur `becpg-regulatory-ui`** (Next 16, React 18, Tailwind 4, framer-motion) — **sans shadcn/ui ni Radix** |
| OAuth2 Keycloak (IDS) | `specs.md`, `SPEC_V2.md` | ✅ pattern `becpg-ai` : realm par tenant + claims `becpg_url` / `becpg_instance`. Vérifié sur dev : `ids-test.becpg.fr/auth/realms/dev`, client `dev-openid` |
| i18n complet | `specs.md` | ✅ obligatoire (fournisseurs internationaux) |
| Dashboard : Mes tâches / Mes discussions / Mes produits / Mes documents | `specs.md` | ✅ bonne décomposition, à enrichir de la conformité |
| Endpoints `/supplier/*` qui routent vers Alfresco | `specs.md` | ✅ **excellente idée** — n'expose jamais Alfresco au fournisseur. Réalisé par les route handlers Next.js, pas par un backend séparé (§5.1.1) |
| Autocomplete côté backend avec le contexte du formulaire | `specs.md` | ✅ à aligner sur `becpg/autocomplete/...` existant |
| Wizard : **documents → suggestion IA → complétion → catalogue → signature** | `SPEC_V2.md` | ✅✅ **c'est l'idée centrale**, et elle est déjà outillée (`DocumentExtractionSuggestionPlugin`) |
| Seuil de confiance IA pour décider ce qui est à vérifier | `SPEC_V2.md` | ✅ déjà implémenté : score par ligne (100 / 80-99 / 50-79 / <50) + moyenne dans `Suggestion.confidence` |
| Volet d'aide affichant le cahier des charges | `specs.md` | ✅ répond directement à F9 |
| Catalogues valident la conformité avant signature | `SPEC_V2.md` | ✅ le mécanisme existe (`entity-catalog`), à porter |
| Multitenant + URL par tenant + logo tenant + bandeau « TEST » | `SPEC_V2.md` | ✅ répond à F8, indispensable pour un fournisseur multi-clients |
| Tooltips d'aide visibles, process simple, mobile | `SPEC_V2.md` | ✅ critère d'acceptation, pas un détail |
| Vue PDF pour la signature | `specs.md` | ✅ réutiliser `bSign.getSignatureView(document, recipient, taskNodeRef)` |
| Le client peut aussi utiliser le portail pour importer à la place du fournisseur | `SPEC_V2.md` | ✅ mode « saisie déléguée » — très demandé en pratique |

### 3.2 À jeter ou à retravailler

| Idée | Verdict | Pourquoi / remplacement |
|---|---|---|
| « Gestion des utilisateurs dans Keycloak » | ❌ **abandonné** | **Aucune gestion d'utilisateurs dans IDS.** On conserve exactement le fonctionnement actuel : les comptes sont créés et gérés **dans Alfresco** (`createExternalUser()`, groupe `EXTERNAL_USER`, assoc `bcpg:supplierAccounts`, groupe `EXTERNAL_SUPPLIER_<code>`, activation/désactivation automatique via `updateSupplierAccount()` / `deleteExternalUser()`). **IDS ne sert qu'à l'authentification** (SSO OIDC), alimenté par la synchro existante (`setSynchronizeWithIDS(true)`). Le portail ne crée, ne modifie et ne supprime aucun compte. |
| « Pas de vue générale des tâches / livrables » | ❌ **faux besoin** | Le tableau de bord fournisseur **existe déjà** (dashlets Mes tâches / Mes discussions / Mes produits). On garde l'accès direct depuis une tâche **et** on modernise cette vue avec filtres, priorisation et échéances. |
| Cloner le dashboard/tasks d'exemple shadcn | ❌ | Un exemple de démo n'est pas une spec produit. Le dashboard doit être orienté conformité : complétude, documents expirant sous 30/60/90 j, tâches en retard, statut d'agrément. |
| shadcn/ui + Radix | ❌ **écarté** | `becpg-regulatory-ui` n'utilise ni shadcn ni Radix (Tailwind pur + framer-motion). Ajouter shadcn créerait une divergence de design system dans la gamme beCPG. → **Tailwind + composants beCPG partagés.** |
| Prototype `v2/becpg-supplier-portal/` | ❌ **supprimé** | Squelette `create-next-app` vide (3 fichiers utiles), Next 15 / React 19 / Tailwind 3 — divergent de la cible. Supprimé le 2026-07-29. |
| « Laisser générer le plus d'UI possible par l'IA » | ⚠️ | Méthode acceptable **après** avoir figé le design system, les contrats d'API et les 3 écrans pivots. Générer avant → dette immédiate. |
| « Envoyer en processus : demande de correction » initié par le fournisseur | ✅ **retenu, à cadrer** | Répond à F10, qui est un vrai manque. Le fournisseur déclenche une **demande** (mise à jour de FT, renouvellement de certificat, changement de site) qui instancie un **modèle de projet dédié**, choisi dans une liste autorisée par le client, avec validation client obligatoire. Jamais d'écriture directe sur la donnée de production. |
| « En un mois on pourrait avoir une V1 » | ⚠️ | Réaliste seulement pour le lot 1 (dashboard + wizard + signature) sans le moteur documentaire. Cf. roadmap §8. |
| `v2/supplier-portal.odg` | 📎 | Schéma legacy, à reprendre comme source d'inspiration uniquement. |

---

## 4. Périmètre fonctionnel cible

### 4.1 Personas

| Persona | Où | Besoins |
|---|---|---|
| **Fournisseur** (utilisateur externe) | portail | savoir ce qu'on attend de lui, le faire vite, sur mobile, sans ressaisie, savoir où il en est |
| **Contact fournisseur secondaire** | portail | accès délégué à une partie du dossier (site, gamme) |
| **Chargé de référencement** (client) | portail + beCPG | lancer les campagnes, suivre l'avancement, relancer |
| **Qualité** (client) | portail + beCPG | valider, refuser, commenter, geler des listes, piloter les expirations |
| **Acheteur** (client) | portail (lecture) + ERP | connaître le statut d'agrément avant de commander |

### 4.2 Écrans

L'application sert **deux espaces** derrière le même SSO, distingués par les groupes beCPG de
l'utilisateur (`ExternalUser` → espace fournisseur ; `QualityMgr` / `PurchasingMgr` /
`ReferencingMgr` → espace pilotage).

**Espace fournisseur** (utilisateur externe)

```
/                          → Mon tableau de bord (§4.3)
/login                     → sélection tenant (si non porté par l'URL) + SSO IDS
/tasks                     → Mes tâches (liste + filtres : type, échéance, priorité, produit)
/products/[id]/import      → reprise d'une MP depuis un autre tenant (§4.7)
/tasks/[id]                → routage par type de tâche :
     · wizard              → assistant de saisie (§4.4)
     · signature           → visionneuse PDF + signature
     · document            → dépôt / renouvellement d'un document
     · review              → consultation d'un produit
/products                  → Mes produits (code, nom, état, complétude, dernière MAJ, client)
/products/[id]             → fiche produit (lecture, historique, documents, conformité)
/documents                 → Mes documents (type, produit/fournisseur, validité, statut, action)
/company                   → Ma fiche fournisseur (propriétés, contacts, sites, certifications,
                             sous-fournisseurs, questionnaire)
/specs                     → Cahiers des charges applicables (lecture seule, téléchargeables)
/messages                  → Discussions
/help                      → Aide contextuelle, tutoriels
```

**Espace pilotage** (Qualité, Achats, R&D, RSE) — §4.6

```
/monitor                       → Vue d'ensemble du parc fournisseurs
/monitor/suppliers             → Liste fournisseurs : statut d'agrément, score, complétude,
                                 documents expirants, NC ouvertes, dernière activité
/monitor/suppliers/[id]        → Fiche de pilotage : historique, scorecard, documents,
                                 produits liés, échanges, projets en cours
/monitor/documents             → Conformité documentaire du parc (matrice attendu / fourni /
                                 expirant / expiré), export
/monitor/campaigns             → Campagnes de référencement et de renouvellement en cours,
                                 taux de réponse, relances, escalades
/monitor/quality               → Non-conformités fournisseur (`qa:nc`), actions correctives,
                                 délai de traitement
/monitor/reports               → Exports et rapports (BIRT existants)
```

### 4.3 Dashboard (refonte de l'existant)

Le tableau de bord fournisseur existe (preset `external-dashboard` : Mes tâches,
Mes discussions, Mes produits). On **conserve sa structure**, on la modernise et on l'enrichit
de la dimension conformité qui manque aujourd'hui.

Zone haute — **état de mon dossier**, en cartes animées (nouveau) :

- **Statut d'agrément** : Agréé / En cours / À renouveler / Suspendu (+ date de validité)
- **Complétude** : jauge % (dérivée des catalogues actifs sur mes entités)
- **Actions requises** : nb de tâches ouvertes, dont en retard
- **Documents** : nb valides / expirant < 60 j / expirés

Zone centrale (existant modernisé) :

- **Mes tâches** *(existe — dashlet `my-tasks`)* — nom, produit/client, type (assistant /
  signature / document / revue), priorité, échéance, avancement. Tri par urgence.
  Clic → route directe (pas d'écran intermédiaire).
- **Mes produits** *(existe — dashlet `product-catalog`)* — code, nom, état (Validé / En cours
  d'approbation / À corriger / Brouillon), complétude, date. Nouveau : action « demander une
  mise à jour » (F10).
- **Mes documents** *(nouveau)* — type de document, portée (fournisseur / site / produit), date
  de fin de validité (`cm:effectivity`) avec pastille, statut (valide / à renouveler / refusé /
  manquant), action « déposer une nouvelle version ». Alimenté par les exigences dérivées de
  `bcpg:documentType`.
- **Mes discussions** *(existe — dashlet `forum-summary`)* — sujets où je suis impliqué.
- **Mes notifications** *(nouveau)* — restitution in-app des notifications déjà émises par
  `NotificationRuleService`, aujourd'hui uniquement envoyées par email.

Règles UI transverses :

- Bandeau `TEST` permanent et non masquable sur les instances non-prod.
- Logo + nom du tenant dans le header, systématiquement (lève l'ambiguïté multi-clients).
- Tooltips d'aide (`?`) sur chaque champ, alimentés par le dictionnaire beCPG + surcharge
  i18n client.
- Responsive : le wizard doit être complétable au téléphone (mono-colonne, étapes en accordéon).
- Animations sobres (framer-motion) : transitions d'étape, apparition des suggestions IA,
  progression des jauges.

### 4.4 L'assistant (wizard) — inversion du flux

```
Étape 0 · Contexte           panneau latéral permanent :
                             cahier des charges applicable, commentaires du client,
                             listes déjà validées (gelées), historique des refus

Étape 1 · Documents          dépôt drag & drop ; les types de documents attendus sont
                             affichés explicitement (exigences documentaires §4.5),
                             avec date de validité demandée par document

Étape 2 · Suggestions IA     extraction automatique (becpg-ai) :
                             · ≥ 90 % de confiance  → appliqué, badge vert, révocable
                             · 70-89 %              → proposé, à confirmer, badge orange
                             · < 70 %               → signalé, saisie manuelle, badge rouge
                             · pas de score renvoyé → aucun badge (jamais interprété comme
                               une confiance faible)

Étapes 3..n · Sections       propriétés, questionnaire, ingrédients, nutriments, allergènes,
                             physico-chimie, allégations, microbiologie, organoleptique…
                             générées depuis la configuration serveur du wizard
                             (les listes gelées par le client sont en lecture seule)

Étape n+1 · Conformité       contrôle catalogue : liste des champs manquants, cliquables,
                             score de complétion ; blocage de la finalisation si le
                             catalogue bloquant n'est pas satisfait

Étape n+2 · Signature        visionneuse PDF, signature de toutes les pages, puis clôture
```

Exigences de comportement :

- **Autosave par section** (F2) : aucune saisie ne peut être perdue. Indicateur
  « enregistré à HH:MM ». Reprise exacte à l'étape en cours.
- **Reformulation** entre étapes conservée (`becpg/remote/formulate`) mais asynchrone et non
  bloquante visuellement.
- Étapes **navigables librement** une fois visitées, pas de tunnel strict.
- Les commentaires du client sont ancrés **au niveau du champ / de la ligne**, pas seulement
  au niveau tâche.
- Le mode **saisie déléguée** (client saisissant pour le fournisseur) est le même écran, avec
  un bandeau explicite « vous saisissez au nom de <fournisseur> ».

### 4.5 Exigences documentaires et renouvellement — **exposer l'existant, combler 3 trous**

Le socle est déjà là. Ce qu'il faut construire est limité et bien identifié.

**Déjà disponible, à réutiliser sans modification de modèle :**

| Besoin | Brique existante |
|---|---|
| Quels documents sont attendus | `bcpg:documentType` + `docTypeIsMandatory` |
| Pour qui / dans quel cas | `docTypeFormula` (SPEL), `docTypeLinkedTypes`, `docTypeLinkedCharacts`, `docTypeLinkedHierarchy` |
| Durée de validité | `cm:effectivity` (from/to) + `docTypeAutoExpirationDelay` + `docTypeEffectivityType` |
| Où ranger, comment nommer | `docTypeDestPath`, `docTypeNameFormat` |
| Contrôle du contenu | `aiValidationCriteria`, `aiExtraPrompt`, `aiSuggestedFields` (aspect `bcpg:aiAspect`) → `bcpg:aiValidationState` / `aiValidationHints` |
| Relances planifiées | `NotificationRuleService` + `NotificationRuleJob` (type de nœud, champ date, conditions, nb de jours, destinataires, fréquence, template email, script) — règle « périmés < 90 j » livrée |

**Les 3 trous à combler :**

1. **Restitution au fournisseur** *(le plus gros gain, le moins coûteux)* — un service qui,
   pour un fournisseur donné, évalue les `bcpg:documentType` applicables (via `docTypeFormula`)
   sur ses entités et renvoie : `attendu / fourni / date de validité / statut`. C'est
   `GET /documents/requirements`. Aucune nouvelle donnée, juste une évaluation + une vue.
2. **Relance graduée et escalade** — aujourd'hui une règle de notification envoie un mail.
   Il faut : préavis multiples (J-90 / J-60 / J-30) **vers le fournisseur**, atterrissage dans
   le portail, et **escalade interne** vers l'acheteur/qualité après N relances sans réponse.
   Implémentation : règles de notification supplémentaires + un modèle de projet
   « renouvellement documentaire » (on ne crée **pas** de mécanisme parallèle aux projets).
3. **Statut d'agrément consolidé** — dérivé de : documents obligatoires présents et valides,
   catalogues bloquants satisfaits, questionnaire complété, absence de NC ouverte.
   Valeurs : Agréé / En cours / À renouveler / Suspendu. **Calculé à la volée, non persisté**
   (§5.4.3), au niveau fournisseur et fournisseur-produit, exposé au fournisseur et **lu par
   l'ERP** via `/approval` (`becpg-connector`).

**Bonus (lot 3+)** : diff IA entre deux versions d'un même document, ciblé sur ce qui impacte
la conformité (Tracklab en fait un argument fort, et `DocumentReviewSuggestionPlugin` fournit
déjà la moitié du chemin).

### 4.6 Espace de pilotage fournisseurs (côté client)

**C'est un périmètre de premier rang, pas un bonus.** Tracklab et Specright vendent d'abord
cet écran-là (§2.2, §2.3). Aujourd'hui beCPG a toutes les données et n'en restitue aucune :
le référent qualité doit ouvrir projet par projet dans Share pour savoir où en est son parc.

#### 4.6.1 Vue d'ensemble (`/monitor`)

Cartes d'en-tête, filtrables par famille de fournisseur, site, acheteur, marché :

| Indicateur | Calcul |
|---|---|
| Fournisseurs agréés / en cours / à renouveler / suspendus | statut d'agrément (§4.5) |
| Conformité documentaire du parc | % de documents obligatoires présents et valides |
| Documents expirant sous 30 / 60 / 90 j | `cm:effectivity` + `docTypeAutoExpirationDelay` |
| Campagnes en cours et taux de réponse | projets de référencement / renouvellement ouverts |
| Tâches fournisseur en retard | `pjt:taskList` échues |
| NC fournisseur ouvertes | `qa:nc` |

Sous les cartes : **le top 10 des fournisseurs à risque**, avec le motif (documents expirés, NC
ouverte, campagne sans réponse, score en baisse) et l'action directe — relancer, escalader,
suspendre.

#### 4.6.2 Liste et fiche fournisseur

- **Liste** (`/monitor/suppliers`) : tri et filtres multi-critères, comparaison de plusieurs
  fournisseurs côte à côte, export. Colonnes : statut d'agrément, score, complétude, documents
  expirants, NC ouvertes, dernière activité, acheteur référent.
- **Fiche** (`/monitor/suppliers/[id]`) : scorecard, évolution dans le temps, documents avec
  validité, produits liés, sous-fournisseurs, projets en cours, historique des échanges.
  Actions : lancer un référencement, lancer un renouvellement, ouvrir une NC, suspendre.

#### 4.6.3 Conformité documentaire (`/monitor/documents`)

Matrice **fournisseur × type de document** : attendu / fourni / valide jusqu'au / expiré /
refusé. C'est la vue que les équipes qualité impriment avant un audit. Filtrable par type de
document, exportable, avec relance en masse depuis la sélection.

#### 4.6.4 Scorecards

- Base : `pjt:scoreList` (critère / poids / note / plage), déjà exploité par
  `ExportSupplierScoreList` — les critères restent **paramétrables par le client**.
- Nouveauté : **alimentation automatique** des critères mesurables — réactivité (délai de
  réponse aux tâches), qualité documentaire (taux de refus, taux de documents expirés),
  complétude (catalogues), respect des échéances, non-conformités.
- Scoring **au niveau fournisseur et au niveau fournisseur-produit** (comme Tracklab).
- **Le fournisseur voit son propre score** dans son espace : la transparence est le principal
  levier d'adoption, et elle évite les contestations.

#### 4.6.5 Vues par métier

Même donnée, quatre lectures — sélecteur de profil, pas quatre applications :

| Profil | Ce qu'il regarde en premier |
|---|---|
| **Qualité** | conformité documentaire, NC, certifications, audits |
| **Achats** | statut d'agrément (bloquant pour commander), score, réactivité |
| **R&D** | complétude des données techniques, catalogues, cahiers des charges |
| **RSE** | certifications, origines, questionnaires RSE |

#### 4.6.6 Source des données

- **db-afts en premier** : requêtes directes (`becpg/search`, `becpg/remote/entity/list`), temps
  réel, sécurité et tenant hérités de beCPG, aucune dépendance supplémentaire. Suffisant pour
  les compteurs, les listes et la matrice documentaire.
- **Cube OLAP en complément, quand il est présent** (`becpg-olap`) : évolution dans le temps,
  comparaisons multi-fournisseurs, agrégats lourds sur de gros parcs.
- Dimensions et mesures côté OLAP — **fait** (`olapSchema_4_0.get.xml.ftl`) : la dimension
  partagée `suppliersDimension` est branchée sur les cubes `projects` et `projectsSteps`, ce qui
  apporte d'un coup **fournisseur**, **statut d'agrément** (`bcpg:supplierState`) et **filiale**
  (`supplierHierarchy1/2`) ; s'y ajoutent les mesures **taux de refus** (`refusalRate`, rapporté
  aux tâches répondues et non à toutes) et **délai de réponse** (`avgResponseDelay`,
  `DATEDIFF(tlEnd, tlTargetEnd)`, NULL tant que la tâche est ouverte). La **complétude** était
  déjà là (`averageProgress` sur `pjt:completionPercent`) ; il lui manquait seulement l'axe
  fournisseur.
- **Les documents restent hors OLAP** — décision assumée, pas un oubli. Le connecteur
  (`becpg-olap-connector`) crée ses tables à partir de trois listes de configuration
  (`entitiesToExtract` / `dataListsToExtract` / `assocsToExtract`), et un document n'est ni une
  entité déclarée, ni une datalist, ni une association : `cm:contains` ne sérialise que les
  **dossiers**, sur un seul niveau. La voie technique existe — `becpg/remote/entity` répond sur
  un `cm:content` porteur de `bcpg:documentAspect`, et `bcpg:documentEntityRef` fournit la clé
  de jointure vers le produit, donc vers le fournisseur — mais elle suppose d'extraire des
  `cm:content` dans le canal de publication, ce qui n'est pas arbitré. Conséquence : la
  dimension **type de document** et la mesure **documents expirants** n'existent pas côté cube,
  et **l'axe documentaire du pilotage reste servi par db-afts uniquement**.
- Le portail dégrade proprement : sans cube, on perd les vues historiques, pas les vues
  courantes.

**Contrainte connue, découverte à l'implémentation** : `beCPG.remote.maxResults.limit` vaut
**256** (`becpg-config-core.properties`) et borne toute liste de la remote API demandant des
`fields` (`AbstractEntityWebScript`). Conséquence sur `/monitor` :

| Ce qui reste exact | Ce qui devient fenêtré au-delà de ~250 fournisseurs |
|---|---|
| tous les **compteurs** (le moteur renvoie son propre `totalItems`) | la **liste** affichée, donc la répartition des statuts d'agrément et l'**ordre de tri** |

Le portail expose l'écart au lieu de le masquer : `truncated`, `breakdownScope`,
`sortScope: 'window'`, et un en-tête `X-Portal-Truncated` sur les exports CSV. Trier un parc de
plusieurs milliers de fournisseurs par score demandera, côté beCPG, soit de relever cette limite
pour un usage de pilotage, soit un endpoint de recherche paginé côté serveur. **À arbitrer dans
la seconde phase beCPG** — ce n'est pas contournable proprement côté portail.

#### 4.6.7 Sécurité de l'espace pilotage

L'espace pilotage est **en lecture consolidée** : il n'écrit rien directement, il déclenche des
actions qui passent par les mécanismes existants (création de projet, ouverture de NC,
notification). Les données restent filtrées par les ACL beCPG de l'utilisateur — un acheteur ne
voit que son périmètre.

### 4.7 Reprise d'une matière première depuis un autre tenant

**Le problème.** Un fournisseur vend souvent la même matière première à plusieurs clients beCPG.
Chaque client a son tenant — un realm Keycloak, une instance beCPG, un référentiel séparé (§5.3).
Le fournisseur ressaisit donc *la même* fiche technique autant de fois qu'il a de clients : mêmes
ingrédients, mêmes allergènes, mêmes analyses, mêmes certificats. C'est le premier poste de
ressaisie du portail, et celui que le fournisseur vit le plus mal, parce qu'il sait que la donnée
existe déjà.

**Ce qui rend l'exercice non trivial** : les deux tenants ne demandent pas la même chose. Le
wizard, les catalogues de conformité, les questionnaires et les types de documents sont
configurés par *chaque* client (Aryzta a 4 questionnaires sur la MP, Bridor un seul, Upfield
aucun — §2ter). Une copie nœud à nœud n'a donc aucun sens : ce qui se transporte, ce sont des
**valeurs de propriétés**, pas une structure.

#### 4.7.1 Ce qui rend la chose possible : le modèle est commun

Les deux instances tournent sur le **même modèle beCPG**. `bcpg:nutListValue` désigne la même
grandeur chez Aryzta et chez Bridor, `bcpg:allergenListInVoluntary` la même déclaration. Le
mapping est donc, pour l'essentiel, **l'identité sur les QName** — et c'est ce qui distingue cette
fonctionnalité d'un import ERP, qui demanderait une table de correspondance par client.

Ce qui diffère n'est pas le sens des champs, c'est **lesquels sont demandés** :

| Cas | Traitement |
|---|---|
| Le champ existe des deux côtés | valeur reprise |
| Demandé par la cible, absent de la source | laissé vide, **signalé** comme restant à saisir |
| Présent dans la source, non demandé par la cible | **ignoré** — il n'a pas de place où aller |
| Caractéristique absente du référentiel cible (un ingrédient, un allergène) | ligne **non reprise**, listée à part : créer une caractéristique dans le référentiel du client est une décision du client, pas du fournisseur |

Le dernier cas est le plus fréquent en pratique et ne doit surtout pas être « résolu » par une
création automatique : les référentiels de caractéristiques sont la propriété du client.

#### 4.7.2 Ce qui ne se transporte jamais

**Deux clients d'un même fournisseur sont souvent concurrents.** La liste de ce qui traverse est
donc une **liste blanche**, jamais une liste d'exclusions — un champ nouveau dans le modèle beCPG
doit être invisible à la reprise tant que personne ne l'a explicitement autorisé.

Ne traversent pas, et la raison :

- **`bcpg:costList`, prix, remises, conditions commerciales** — ce sont les conditions négociées
  avec l'autre client. Une fuite ici est la pire que le portail puisse produire.
- **Les données de jugement du client source** : `bcpg:reqCtrlList`, `bcpg:aiValidationState`,
  `pjt:scoreList`, états de validation, gel de listes. C'est l'avis du client A sur le
  fournisseur ; il n'a aucune valeur — et aucune légitimité — chez le client B.
- **Les cahiers des charges, les projets, les tâches, les discussions, les commentaires.** Ce sont
  les documents et les échanges du client A.
- **Tout ce qui identifie le client A** : codes internes, `bcpg:clients`, hiérarchies produit,
  arborescences de classement.

Traversent, parce que ce sont les données que le fournisseur produit sur son propre produit :

- les propriétés de la fiche (nom légal, unité, durée de vie, conditions de stockage) ;
- `bcpg:ingList`, `bcpg:allergenList`, `bcpg:nutList`, `bcpg:physicoChemList`,
  `bcpg:microbioList`, `bcpg:organoList`, `bcpg:labelClaimList` ;
- les réponses de questionnaire, **question par question**, quand la même question existe des deux
  côtés (rapprochement sur `bcpg:code` de `survey:surveyQuestion`, cf. §4.7.5) ;
- les **documents** déposés par le fournisseur et leurs dates d'effectivité — un certificat IFS
  est le certificat du fournisseur, pas celui du client.

#### 4.7.3 Le modèle de confiance

**Le fournisseur est le seul à pouvoir déclencher la reprise, et il doit être authentifié des deux
côtés.** Le tenant cible n'obtient jamais d'accès au tenant source : il ne reçoit que le paquet
que le fournisseur a explicitement approuvé.

```
   Portail (tenant CIBLE)                          Tenant SOURCE
   ─────────────────────                           ──────────────
   1. « Reprendre une MP d'un autre client »
   2. choix du tenant source  ────── OIDC ──────►  realm de la source
                                                   le fournisseur s'authentifie
   3. ◄──── ticket Alfresco source (serveur) ─────
   4. lecture des MP du fournisseur sur la source
      (ACL de la source, donc son propre périmètre)
   5. le fournisseur choisit LA MP et voit le
      détail champ par champ de ce qui sera repris
   6. il approuve  ───► écriture sur la CIBLE
```

Points non négociables :

1. **Le ticket source ne quitte jamais le serveur du portail** et n'est pas persisté au-delà de la
   session de reprise — même règle qu'au §5.3 pour le ticket courant.
2. **Le client cible ne voit jamais le nom du tenant source.** Il voit qu'une valeur a été reprise
   d'un autre dossier, pas de chez qui. Révéler que son fournisseur travaille pour tel concurrent
   est une information commerciale qui ne lui appartient pas.
3. **Rien n'est écrit sans approbation explicite, champ par champ.** La reprise emprunte le canal
   des **suggestions** (§4.4) : chaque valeur arrive comme une proposition que le fournisseur
   applique ou écarte. Aucun nouveau modèle de revue à inventer, et le fournisseur voit ce qu'il
   transfère avant qu'il ne parte. Deux précisions, sans lesquelles la formule est un piège —
   voir §4.7.4.
4. **Traçabilité côté client.** Une valeur reprise est marquée comme telle dans
   `bcpg:activityList` : le qualiticien doit pouvoir distinguer une donnée saisie pour lui d'une
   donnée recopiée d'un autre dossier — cela change la lecture qu'il en fait.

#### 4.7.4 « Canal suggestion » : ce que ça veut dire exactement

Reprendre le canal des suggestions veut dire **reprendre le modèle de revue et son écran** — une
proposition, une provenance, une valeur avant/après, appliquer ou écarter. Cela ne veut pas dire
reprendre la plomberie de `becpg-ai`, et deux points doivent être explicites sinon
l'implémentation se trompe.

**a. L'écriture ne passe pas par becpg-ai.** Aujourd'hui `applySuggestion()` poste sur
`becpg-ai /api/suggestions/apply`, qui écrit ensuite dans beCPG. C'est correct pour une
proposition *produite* par le modèle. Pour une reprise inter-tenant ce serait un détour :

- la reprise ne doit pas dépendre de la disponibilité de becpg-ai — c'est un service optionnel ;
- surtout, cela ferait **transiter par un tiers** des données que le fournisseur déplace entre
  deux clients concurrents. Le hop n'apporte rien et ajoute une surface.

Une valeur reprise s'écrit donc par le **chemin normal du wizard**
(`PUT /wizard/{entityId}/step/{stepId}`), celui qu'emprunte la saisie manuelle du fournisseur.
Même contrôle de sécurité, même gel de listes, même journalisation.

**b. La provenance est une troisième catégorie, et le filtre doit l'admettre.** Le portail ne
présente au fournisseur que les suggestions **adossées à un document** : une déduction faite par
le modèle sur la fiche elle-même, sans pièce à l'appui, n'est pas proposée (§4.4). Une suggestion
de reprise n'est ni l'une ni l'autre — elle est adossée à **une valeur que le fournisseur a
lui-même déclarée dans un autre dossier**, ce qui est une justification au moins aussi forte
qu'un document.

La règle doit donc s'énoncer « pas de déduction non justifiée », et non « rien d'autre que des
documents » : formulée en excluant tout ce qui n'a pas de `documentId`, elle **avalerait
silencieusement les reprises**. Trois provenances, trois traitements :

| Provenance | Justification | Proposé au fournisseur |
|---|---|---|
| extraction / relecture d'un document déposé | la pièce elle-même | oui, avec l'indice de confiance |
| **reprise depuis un autre tenant** | la valeur déclarée par le fournisseur ailleurs | **oui**, sans indice de confiance : ce n'est pas une estimation, c'est une recopie |
| déduction du modèle sur la fiche | aucune | non |

L'indice de confiance n'a pas de sens sur une reprise et ne doit pas être simulé : afficher « 100 % »
sur une recopie ferait passer pour une certitude du modèle ce qui n'est qu'un transfert. L'écran
affiche la provenance, pas un score.

#### 4.7.5 Rapprochement des questionnaires

Le cas des questionnaires est le plus délicat, parce que le rapprochement se fait sur
`bcpg:code` de `survey:surveyQuestion`, et que ce code n'est **garanti stable que pour les
questions livrées en standard** (banque `becpg-data`, plages réservées). Une question créée à la
main par un client porte un code arbitraire qui ne veut rien dire ailleurs.

Règle : on ne reprend une réponse que si **le code *et* le libellé** concordent. Une correspondance
de code seule, sur deux libellés différents, est un faux ami — répondre « Oui » à la mauvaise
question dans un dossier d'agrément est pire que ne pas répondre. Les questions non rapprochées
sont listées comme restant à saisir.

#### 4.7.6 Ce que ça demande à beCPG

Rien de nouveau côté écriture : la reprise écrit par le chemin habituel du wizard. Côté lecture,
un seul besoin, sur l'instance **source** :

- un webscript d'export « ma fiche, périmètre fournisseur » qui renvoie les listes autorisées
  ci-dessus pour une entité dont l'appelant est le fournisseur, en refusant tout le reste.
  L'alternative — laisser le portail composer l'export depuis `becpg/remote/entity` — mettrait la
  liste blanche dans le portail, donc du côté qui ne fait pas autorité (règle R1, §5.1.1). **La
  liste de ce qui a le droit de sortir doit être dans beCPG.**

#### 4.7.7 Limites assumées

- **Deux tenants sur des versions de modèle différentes** : le rapprochement par QName dégrade
  proprement (le champ inconnu est ignoré), mais une propriété dont la *sémantique* a changé entre
  deux versions majeures passerait inaperçue. À couvrir par un contrôle de version du modèle dans
  l'export.
- **Le fournisseur peut ne pas avoir de compte sur la source** au moment où il en a besoin (compte
  désactivé après la fin d'un référencement, cf. §6.5). La reprise devient alors impossible ; il
  n'y a pas de contournement acceptable, et il ne faut pas en inventer un.
- **Ce n'est pas une synchronisation.** La reprise est ponctuelle et unidirectionnelle : une
  correction faite ensuite chez la source ne se propage pas. Un lien vivant entre deux dossiers
  clients concurrents serait un tout autre sujet, avec un tout autre modèle de confiance.

---

## 5. Architecture technique

### 5.1 Vue d'ensemble — **tout en Next.js, pas de backend Java dédié**

Le portail est une **application Next.js unique**. Ses route handlers jouent exactement le rôle
que joue aujourd'hui le proxy de Share (`/share/proxy/alfresco/...`) : ils portent le secret
d'authentification, routent vers la bonne cible, et n'exposent jamais Alfresco au navigateur.

```
   Navigateur (fournisseur, mobile ou desktop)
        │  HTTPS — cookie httpOnly, aucun ticket ni token côté client
        ▼
   becpg-supplier-portal                 Next.js 16 standalone (une seule image)
        ├─ app/(pages)                   React 18 + Tailwind 4 + framer-motion
        └─ app/api/*  (route handlers)   = LE proxy
             ├─ résolution tenant (claims JWT becpg_url / becpg_instance)
             ├─ échange token OIDC → ticket Alfresco, gardé côté serveur
             ├─ normalisation des réponses (JSON propre, jamais du format Share)
             └─ routage par cible :
                  /api/becpg/*  → <becpg_url>/alfresco/s/becpg/...
                  /api/ai/*     → becpg-ai /api/suggestions/...
                  /api/share/*  → Share, uniquement si un rendu Share est inévitable
        ├──────────────────────────────────────────────┐
        ▼                                              ▼
   beCPG (Alfresco) — becpg-core / becpg-plm      becpg-ai
   webscripts becpg/remote/*, becpg/project/*     /api/suggestions/*
   becpg/entitylists/*, becpg/security/*          extraction, review, classification
   becpg/autocomplete/*, becpg/survey/*
        ▲
        │
   IDS / Keycloak — 1 realm par tenant
```

### 5.1.1 Pourquoi pas un backend Spring dédié

Un BFF Java a été envisagé puis **écarté**. Analyse :

| Ce qu'un BFF Spring aurait apporté | Verdict |
|---|---|
| Proxy authentifié vers Alfresco | Un route handler Next.js le fait aussi bien — c'est exactement le pattern du proxy Share |
| Résolution du tenant depuis les claims JWT | Trivial en middleware Next.js |
| Échange token OIDC → ticket Alfresco | Un `fetch` côté serveur |
| Agrégation / normalisation / cache | Node le fait très bien (`revalidate`, cache mémoire) |
| Jobs planifiés (renouvellement documentaire) | **N'a rien à faire dans un BFF** : ça appartient à `NotificationRuleJob` côté beCPG, où c'est déjà multi-tenant et transactionnel |
| Logique métier (exigences documentaires, statut d'agrément) | **N'a rien à faire dans un BFF non plus** : ça appartient à `becpg-plm-core`, sous forme de webscripts, pour être testable, réutilisable par le connecteur ERP et par Share |

Il ne restait donc au BFF que le rôle de proxy — ce qui ne justifie ni une seconde image, ni un
second runtime, ni un second cycle de release.

**Deux règles d'architecture, dans cet ordre :**

> **R1 — On ne modifie pas beCPG.** Par défaut, un besoin se résout en **composant les
> webscripts existants** dans le proxy. Si c'est impossible, on ajoute une **vue JSON** à un
> webscript existant (additif, aucun impact sur l'existant). En dernier recours seulement, un
> nouveau webscript — jamais une modification d'un webscript ou d'un service en place.
>
> **R2 — La logique métier ne va pas dans le portail.** Ce qui ne peut pas être composé et qui
> relève du domaine (évaluation de règles, calcul d'état) reste côté beCPG, pour être testable
> et réutilisable par Share, le connecteur ERP et le portail.

R1 prime sur R2 : entre « ajouter une évaluation métier dans beCPG » et « composer trois appels
existants dans le proxy », on compose. On ne remonte dans beCPG que ce qui est **impossible
autrement** ou **nécessaire à la sécurité**.

Appliquées au §5.4, ces règles réduisent le chantier serveur à **une seule addition** :
une vue JSON sur le webscript de wizard existant.

### 5.2 Stack

Une seule application, alignée sur `becpg-regulatory-ui`
(`/home/matthieu/becpg-workspace/becpg-regulatory/becpg-regulatory-ui`) :

```json
next ^16   react ^18   tailwindcss ^4   framer-motion ^12
react-markdown + remark-gfm (aide / cahier des charges)
output: 'standalone'
```

Différence notable avec regulatory : **l'authentification est gérée côté serveur** (route
handlers + cookie httpOnly), pas avec `keycloak-js` dans le navigateur. Le portail est exposé
à des utilisateurs externes ; ni le token OIDC ni le ticket Alfresco ne doivent atteindre le
client. C'est également ce qui permet au proxy de fonctionner.

**JavaScript, pas TypeScript** — aligné sur regulatory.

**Pas de shadcn/ui ni de Radix** : on reste sur Tailwind + composants beCPG partagés, pour ne
pas diverger du design system de `becpg-regulatory-ui`.

**Pas de couche i18n.** Les libellés métier — champs, listes, catalogues, questionnaires,
consignes d'étape — sont déjà traduits dans beCPG et servis dans la locale de l'utilisateur par
les formulaires et le dictionnaire. Le portail ne porte que les quelques clés de son propre
chrome, dans un fichier de messages par langue. C'est aussi ce qui garantit qu'un client qui
traduit un champ dans beCPG le voit traduit dans le portail, sans redéploiement.

À ajouter : `@tanstack/react-table` (datagrids de listes) et `react-pdf` + `signature_pad` pour
la signature (§9.2).

### 5.3 Multitenant

**Principe non négociable : IDS ne fait que de l'authentification.** Les comptes fournisseurs
restent créés et gérés dans Alfresco comme aujourd'hui (cf. §3.2). Le portail ne provisionne
rien dans Keycloak.

Réutiliser strictement le mécanisme `becpg-ai`
(`becpg-ai/doc/authentication_fr.md`) — vérifié sur dev : realm `dev` sur
`ids-test.becpg.fr/auth`, client `dev-openid`, redirect vers `/share/page/aims-dologin` :

- 1 realm Keycloak par tenant ;
- claims obligatoires dans le JWT : `becpg_url` (ex. `https://demo.becpg.fr`) et
  `becpg_instance` (ex. `demo`) ; absence de claim → 401 ;
- le route handler Next.js échange le token contre un ticket Alfresco via
  `<becpg_url>/alfresco/api/-default-/public/authentication/versions/1/tickets`, et le
  **conserve côté serveur** (cookie de session httpOnly, jamais renvoyé au navigateur) ;
- alternative : headers `BECPG_TICKET` + `X-BecPG-Instance` (intégrations internes).

Résolution du tenant, par ordre de priorité :

1. sous-domaine (`https://<tenant>.portail.becpg.fr`) ;
2. paramètre de chemin (`/t/<tenant>/…`) ;
3. sélecteur explicite sur `/login` (avec mémorisation locale).

Après connexion : **logo + nom du tenant dans le header**, thème dérivé du tenant, bandeau
`TEST` si l'instance n'est pas de production.

### 5.4 Contrat d'API (route handlers Next.js)

Base : `/api/v1`. Tout est scopé au fournisseur de l'utilisateur connecté (jamais de nodeRef
arbitraire accepté sans contrôle).

Colonne « Cible » : **proxy** = appel direct d'un webscript existant ; **composition** =
plusieurs appels existants agrégés dans le route handler ; **additif** = ajout à beCPG.

| Endpoint | Méthode | Rôle | Cible |
|---|---|---|---|
| `/session` | GET | tenant, logo, isTest, utilisateur, fournisseur(s), locales | composition (claims JWT + person + projets liés) |
| `/dashboard` | GET | compteurs, complétude, échéances | composition (`/tasks` + `/entities` + `/documents`) |
| `/tasks` | GET | mes tâches (filtres, tri, pagination) | proxy : workflow + `pjt:taskList` |
| `/tasks/{id}` | GET | détail + type + cible de routage | proxy `becpg/project/projectTaskInfo` |
| `/tasks/{id}/complete` | POST | valider la tâche | proxy `becpg/project/completeProjectTask` |
| `/wizard/{entityId}` | GET | structure du wizard (étapes, types, listes, read-only, listes gelées) | **additif** : vue `.json` sur le webscript Share existant `components/wizard/wizard-mgr` — cf. §5.4.1 |
| `/wizard/{entityId}/step/{stepId}` | GET/PUT | données et sauvegarde d'une étape (autosave) | proxy `becpg/entity/datalist/data` + form definition |
| `/wizard/{entityId}/formulate` | POST | reformulation | proxy `becpg/remote/formulate` |
| `/entities` | GET | mes produits | proxy `becpg/remote/entity/list` |
| `/entities/{id}` | GET | fiche produit | proxy `becpg/remote/entity` |
| `/entities/{id}/catalogs` | GET | complétion / champs manquants | proxy `becpg/entity/entityCatalog` |
| `/entities/{id}/specs` | GET | cahiers des charges applicables | proxy (assoc spécification) |
| `/entities/{id}/import` | POST | reprise d'une MP depuis un autre tenant — renvoie des **suggestions**, n'écrit rien (§4.7) | OIDC sur le tenant source + webscript d'export |
| `/documents` | GET | mes documents + `cm:effectivity` + `bcpg:aiValidationState` | proxy (`bcpg:documentAspect`) |
| `/documents` | POST | dépôt / nouvelle version | proxy (upload Alfresco) |
| `/documents/requirements` | GET | ce que je dois fournir et pour quand | **proxy** — cf. §5.4.2, la donnée est déjà matérialisée |
| `/notifications` | GET | notifications in-app | composition (tâches échues + documents expirants), pas de nouveau moteur |
| `/approval` | GET | statut d'agrément (fournisseur + par produit) | composition (documents obligatoires + catalogues + NC) — voir §5.4.3 |
| `/monitor/overview` | GET | compteurs du parc, top fournisseurs à risque | composition sur `becpg/search` |
| `/monitor/suppliers` | GET | liste de pilotage (filtres, tri, comparaison, export) | composition sur `becpg/remote/entity/list` |
| `/monitor/suppliers/{id}` | GET | fiche de pilotage + scorecard + historique | proxy (`pjt:scoreList`, `bcpg:activityList`) |
| `/monitor/documents` | GET | matrice fournisseur × type de document | composition sur `/documents/requirements` |
| `/monitor/actions` | POST | relance en masse, escalade, suspension | proxy (notifications + `sendToSupplier`) |
| `/suggestions/{entityId}` | GET | suggestions IA + scores de confiance | proxy becpg-ai `/api/suggestions/{id}` |
| `/suggestions/apply` | POST | appliquer une suggestion | proxy becpg-ai `/api/suggestions/apply` |
| `/signature/{taskId}` | GET | URL de signature | proxy `bSign.getSignatureView` |
| `/autocomplete/{formId}/{fieldId}` | POST | datasource contextuelle | proxy `becpg/autocomplete/*` |
| `/process/start` | POST | demander un processus autorisé | proxy `becpg/supplier/sendToSupplier` |
| `/messages` | GET/POST | discussions | proxy (forum Alfresco) |

**Bilan : une seule addition côté beCPG** — une vue JSON sur un webscript Share existant.
Tout le reste est du proxy ou de la composition dans le portail.

#### 5.4.1 La seule addition : vue JSON du wizard

`components/wizard/wizard-mgr.get.js` construit déjà le modèle complet (étapes, types, listes,
`readOnly`, `enforceTask`, `skipSecurityRules`) et le rend en HTML via `.get.html.ftl`. On
ajoute un **`.get.json.ftl`** à côté. Ajout de fichier pur : le rendu HTML existant, donc
l'ancien portail, n'est pas touché d'une ligne.

Bénéfice secondaire : la config client (surcharges Bridor, Aryzta…) est résolue par Share comme
aujourd'hui, donc le nouveau portail hérite automatiquement de tous les paramétrages en place.

#### 5.4.2 Pourquoi `/documents/requirements` ne demande aucun développement

`DocumentFormulationHandler` (`becpg-plm-core`) fait **déjà** tout le travail à chaque
formulation :

- il parcourt les `bcpg:documentType` et évalue lesquels s'appliquent (`isDocTypeMatchProduct`) —
  matching par **type de produit, hiérarchie, caractéristiques liées, filiale et usines** ;
- il **crée les documents attendus** manquants (`createDocument`, nommage via `docTypeNameFormat`) ;
- il calcule `bcpg:documentIsMandatory` pour chacun, y compris par formule SPEL
  (`calculateDocumentIsMandatory`) ;
- il maintient `bcpg:documentState` (`Simulation` = attendu non fourni) et supprime les
  placeholders devenus non applicables.

Autrement dit **les exigences documentaires sont déjà matérialisées sur l'entité**. L'endpoint
se contente de lister les documents de l'entité avec `documentIsMandatory`, `documentState`,
`documentTypeRef` et `cm:effectivity`, et de les présenter comme une check-list.

C'est aussi ce qui valide le §2ter.2 : le matching **par filiale existe déjà** dans le produit.

#### 5.4.3 Statut d'agrément : calculé à la volée, jamais persisté

**Décision : le statut d'agrément n'est pas une propriété.** Il est dérivé, à la demande, de
données qui existent déjà. Conséquence directe : **aucune évolution du modèle de données beCPG
sur tout le projet.**

Règle de dérivation (paramétrable par tenant, pas codée en dur) :

| Statut | Condition |
|---|---|
| **Suspendu** | au moins un document obligatoire expiré, ou une NC bloquante ouverte |
| **À renouveler** | au moins un document obligatoire expirant dans le préavis |
| **En cours** | référencement ouvert, ou document obligatoire attendu non fourni (`documentState = Simulation`), ou catalogue bloquant non satisfait |
| **Agréé** | aucune des conditions ci-dessus |

**Le point de conception qui rend ça tenable à l'échelle** : on n'itère pas sur les fournisseurs
pour calculer un statut chacun. On exprime chaque condition comme **une requête db-afts sur le
parc**, et on en déduit les ensembles. Toutes les propriétés nécessaires sont indexées :
`bcpg:documentState`, `bcpg:documentIsMandatory`, `cm:from` / `cm:to` (`cm:effectivity`),
`bcpg:documentTypeRef`.

Ainsi « les fournisseurs à renouveler » est **une requête**, pas N calculs — ce qui rend aussi
possible le tri, le filtrage et les compteurs du §4.6 sans dénormalisation.

Le résultat est mis en cache dans le portail avec un TTL court (le parc ne change pas à la
seconde) et invalidé sur dépôt de document ou clôture de projet.

**Pour l'ERP** : le connecteur appelle `/approval` (ou son équivalent webscript) au lieu de lire
une propriété. Pas de champ à synchroniser, donc pas de risque de désynchronisation entre le
statut affiché et le statut exporté.

**Limite assumée** : on ne peut pas rechercher un fournisseur par statut d'agrément dans Share,
ni tracer l'historique des changements de statut. Si l'un des deux devient nécessaire, la
persistance se rediscutera — mais elle n'est pas au périmètre.

Règles : réponses JSON normalisées (jamais du format Share), pagination systématique,
`ETag`/`If-None-Match` sur les référentiels, erreurs typées avec message i18n.

### 5.5 Déploiement

Sur le modèle `becpg-regulatory` : `Dockerfile`, `docker-compose.yml`, `deployment.yml`,
`cloudbuild.delivery.yaml`, `release.sh` — mais **une seule image** (Next.js `standalone`).
Session en cookie httpOnly signé, ticket Alfresco stocké côté serveur ; pour rester
clusterisable sans état partagé, le ticket est chiffré **dans** le cookie (JWE) plutôt que dans
une session mémoire. Scalabilité horizontale sans sticky session.

---

## 6. Sécurité

1. **Aucun accès direct à Alfresco depuis le navigateur du fournisseur.** Tout passe par les
   route handlers ; ni le token OIDC ni le ticket Alfresco n'atteignent le client.
2. Conserver le principe de `SupplierSecurityPlugin` : **écriture uniquement si une tâche
   wizard active est assignée** à l'utilisateur ; sinon lecture seule. Le contrôle réel reste
   côté beCPG — le portail ne fait jamais autorité.
3. Le proxy valide que toute entité demandée appartient bien au périmètre du fournisseur
   connecté (`isCurrentUserInSupplierGroup`), en plus du contrôle beCPG.
4. Listes gelées (`state = Valid`) et lignes verrouillées : non modifiables, y compris via API.
5. Comptes désactivés automatiquement quand la dernière association `bcpg:supplierAccounts`
   disparaît — comportement à conserver.
6. `protectedFields` des catalogues → ré-authentification requise, à porter dans le nouveau front.
7. Journalisation : toute action fournisseur reste tracée dans `bcpg:activityList`.
8. **Reprise inter-tenant (§4.7)** : liste blanche côté beCPG, jamais côté portail ; coûts et
   données de jugement du client source exclus par construction ; le ticket du tenant source ne
   quitte pas le serveur et n'est pas persisté ; le client cible n'apprend jamais l'identité du
   tenant source.

---

## 7. Cohabitation des deux portails

**Exigence : un référencement démarré avant la mise en service du nouveau portail doit pouvoir
être terminé indifféremment sur l'ancien ou sur le nouveau, y compris en alternant.**

### 7.1 Ce qui rend la cohabitation possible

Le nouveau portail n'introduit **aucun état qui lui soit propre**. Tout ce qu'il lit et écrit —
entités, branches, projets, tâches, listes, documents, commentaires, signatures — est la donnée
beCPG existante, dans le même format. Deux utilisateurs peuvent travailler sur le même projet
depuis les deux interfaces sans divergence possible : il n'y a qu'une seule source de vérité.

### 7.2 Les cinq invariants à ne pas casser

| # | Invariant | Pourquoi |
|---|---|---|
| I1 | **L'URL de livrable reste `/share/page/wizard?id=supplier-{type}&nodeRef={entity}`** | C'est elle que `SupplierSecurityPlugin` reconnaît (`SUPPLIER_WIZARD_PREFIX`) pour accorder l'écriture. On ne la réécrit pas et on ne la remplace pas : **le nouveau portail reconnaît cette URL et route en interne**. Aucune modification de `SupplierPortalInitRepoVisitor`, aucune migration des projets en cours. |
| I2 | **Aucune modification de `SupplierSecurityPlugin`** | Le contrôle d'accès reste strictement identique pour les deux portails. Le modifier créerait un risque de régression sur des référencements en production. |
| I3 | **Aucune modification des scripts de livrable** (`supplierPortalScript.js`, `supplierPortalPrepareSignatures.js`, `validateProjectEntity.js`) | Ils sont attachés aux projets **déjà instanciés**. Les modifier changerait le comportement de référencements en cours. |
| I4 | **Aucune modification des modèles de projet existants** | Les projets en cours pointent dessus. Les modèles livrés par `init-repo` (lot 0) sont **ajoutés à côté**, jamais substitués. |
| I5 | **La configuration Share des wizards reste la source de vérité**, surcharges clients comprises | Le nouveau portail lit la config résolue par Share (§5.4.1). Bridor, Aryzta et les autres gardent leur paramétrage sans y toucher. |

### 7.3 Mise en service

- **Pas de bascule globale.** Le nouveau portail a sa propre URL ; le lien envoyé au fournisseur
  dans les notifications reste configurable par tenant.
- **Activation progressive** : par tenant, puis par fournisseur pilote si besoin.
- **Retour arrière immédiat** : il suffit de renvoyer le lien vers Share. Aucune donnée à
  restaurer, puisque rien n'a été migré.
- Share reste accessible aux utilisateurs internes pendant toute la transition, et au-delà pour
  tout ce que le portail ne couvre pas.

### 7.4 Explicitement hors périmètre

Pour tenir la contrainte, on **ne fait pas** : de migration de données, **de changement de
modèle de données** (le statut d'agrément est dérivé, §5.4.3), de modification d'un webscript ou
d'un service existant, de changement d'URL de livrable, ni de refonte du mécanisme de comptes
fournisseurs (§3.2).

La seule addition beCPG du projet est une vue JSON sur un webscript Share existant (§5.4.1),
plus les livraisons additives d'`init-repo` (lot 0).

---

## 8. Roadmap

### Lot 0 — Rapatriement produit (en parallèle, côté `becpg-plm-core`)
- Livraison standard par `init-repo` (§2bis.3 + §2ter.4) : sous-fournisseurs, liste emballage
  fournisseur, **jeu complet de formulaires `supplier`** (propriétés + chaque datagrid),
  questionnaires types multiples, modèles de projet, rapport Fiche Technique Fournisseur,
  classement des fournisseurs, email de création de compte multilingue.
- **La seule addition beCPG** : la vue JSON du wizard (§5.4.1).
- Portée par filiale sur les questions de questionnaire (DEV-813, #25461).
- Dimensions et mesures OLAP fournisseur (§4.6.6) — livrées, hors axe documentaire.

Tout dans ce lot est **strictement additif** : nouveaux modèles et nouveaux fichiers, aucune
modification d'un modèle, d'un script ou d'un webscript existant (§7.2). Ce lot n'est pas un
prérequis bloquant du lot 1 : le portail fonctionne avec le paramétrage actuel des clients.

#### Liste arrêtée des besoins côté beCPG, constatés à l'implémentation

Le portail tourne sans aucun de ces points ; chacun lève une limitation identifiée et mesurée.
Par ordre de valeur :

| # | Besoin | Pourquoi | Nature |
|---|---|---|---|
| B1 | **Webscript Share `becpg/portal/wizard`** (§5.4.1, contrats §8) | sans lui, la structure du wizard vient d'une transcription figée qui **ignore les surcharges client** (Bridor, Aryzta). Les définitions de champs, elles, sont déjà correctes via `module/entity-datagrid/config/columns`. | nouveau fichier Share, calqué sur `columns.get.js` |
| B2 | **Limite `beCPG.remote.maxResults.limit` (256)** pour le pilotage (§4.6.6) | les compteurs du parc sont exacts, mais la **liste et le tri** sont fenêtrés au-delà de ~250 fournisseurs | relever la limite pour cet usage, ou exposer une recherche paginée serveur |
| B3 | **Attribution tâche → projet dans la remote API** | le visiteur n'émet ni `path` ni `parentId` sur les lignes `ENTITY_LIST` ; l'attribution passe par `pjt:projectCurrentTasks` côté projet, plus une lecture supplémentaire | ajouter le parent dans la sérialisation |
| B4 | **Propriété « marché »** sur le fournisseur | filtre demandé par le pilotage, aucune propriété standard ne le porte. Le portail le signale dans `filters.unsupported` au lieu de l'ignorer silencieusement, et l'active dès qu'une propriété est nommée en configuration. | choix de modèle, ou convention documentée |
| B5 | **Recherche par association** (`site`, `filiale`) | Alfresco ne sait pas chercher sur une association : ces filtres post-filtrent la fenêtre et le signalent (`mode: 'assoc'`) | indexer, ou dénormaliser la propriété |
| B6 | **Portée par filiale sur les questions de questionnaire** (DEV-813, #25461) | le filtrage par filiale existe déjà partout ailleurs (`docTypeFormula`, `entityFilter`) sauf sur les questions | filtre SPEL sur la question |

### Lot 1 — Parité fonctionnelle + UI moderne (~1 mois, l'objectif « V1 »)
- Socle : application Next.js unique (pages + route handlers proxy), SSO IDS multitenant,
  branding tenant, bandeau TEST, i18n, responsive.
- Dashboard : reprise des dashlets existants (tâches, produits, discussions) + cartes d'état.
- Wizard porté à l'identique + **autosave** (F2) + panneau cahier des charges + activation du
  panneau catalogue de conformité (F9).
- Signature PDF avec la visionneuse légère (§9.2).
- Vue **Mes documents** avec dates de validité (F3, F5) et notifications in-app (F4).

### Lot 2 — Le document d'abord + IA (~1 mois)
- Inversion du wizard : étape Documents en premier.
- **Exposition de l'IA existante au fournisseur** (F6) : extraction, badges de confiance,
  application des suggestions, `aiValidationState` sur les documents déposés.
- `GET /documents/requirements` : les exigences documentaires calculées et restituées (F5).
- Demande de projet à l'initiative du fournisseur (F10).

### Lot 3 — Renouvellement et pilotage (~1,5 mois)
- Relance graduée J-90/60/30 vers le fournisseur + escalade interne (F4), via règles de
  notification + modèle de projet « renouvellement documentaire ».
- Statut d'agrément fournisseur / produit (dérivé, §5.4.3) et lecture par le connecteur ERP.
- Scoring fournisseur alimenté automatiquement + dashboards par service (F7).

### Lot 4 — Ouverture
- Connecteurs bases de certification (IFS, BRC, GLOBALG.A.P., MSC/ASC).
- Bulletins d'analyse labo : chaînage extraction → liste microbio/physico-chimie → seuils.
- Diff IA entre deux versions d'un document.
- Vision : mutualisation type « Hub » (un dépôt, plusieurs clients).

---

## 9. Décisions à prendre

**Tranché :**

- **Architecture** : tout en Next.js. Les route handlers font le proxy vers Alfresco / Share /
  becpg-ai, sur le modèle du proxy Share. **Pas de backend Spring dédié.**
- **Où va la logique** : toute logique non-présentation va dans `becpg-plm-core` sous forme de
  webscript, pas dans le portail (§5.1.1).
- **Design system** : Tailwind + composants beCPG partagés, comme `becpg-regulatory-ui`.
  Pas de shadcn/ui, pas de Radix.
- **Comptes utilisateurs** : gérés dans Alfresco comme aujourd'hui. IDS = authentification
  uniquement, aucun provisioning depuis le portail.
- **Prototype `v2/becpg-supplier-portal`** : supprimé.

- **i18n** : pas de couche de traduction dans le portail. **Les libellés viennent de beCPG** —
  formulaires, dictionnaire, catalogues, questionnaires sont déjà traduits et servis dans la
  locale de l'utilisateur. Le portail ne porte que les quelques clés de son propre chrome
  (navigation, boutons, messages d'erreur), dans un simple fichier de messages par langue.
  Pas de `next-intl`, pas de `i18next`.
- **JavaScript**, pas TypeScript — aligné sur `becpg-regulatory-ui`.
- **Repo** : l'Angular ADF de 2018 est archivé dans `legacy/` (cf. §9.1), le nouveau code
  démarre à la racine.
- **Source des dashboards de pilotage** : **db-afts** en premier (temps réel, sécurité et
  tenant hérités), **plus le cube OLAP** quand il est présent pour les analyses historiques et
  les agrégats lourds. Les axes fournisseur / statut d'agrément / filiale, le taux de refus et
  le délai de réponse sont livrés dans le schéma OLAP ; **l'axe documentaire reste db-afts**
  (§4.6.6).

- **Statut d'agrément** : **calculé à la volée**, jamais persisté (§5.4.3). Exprimé comme des
  requêtes db-afts sur le parc, pas comme un calcul par fournisseur. L'ERP l'obtient via
  `/approval`. **Conséquence : zéro évolution du modèle de données beCPG sur tout le projet.**

**Aucune décision ouverte.**

### 9.1 Ce qui a été archivé dans `legacy/`

L'application Angular présente à la racine du repo était le **template ADF standard**
(`adf-cli-acs-template` 2.3.0, Angular 5, mai 2018) : trois composants générés
(`login`, `home`, `documentlist`), aucune ligne spécifique à beCPG, aucune notion de
fournisseur, de wizard ou de projet. **Rien n'est réutilisable** pour le nouveau portail.

Conservé dans `legacy/` malgré tout, à titre de référence : `proxy.conf.json` (le principe du
proxy de dev vers `/alfresco`), `nginx.conf` + `Dockerfile` (packaging statique), et
`supplier-portal.odg` (le schéma de cadrage de 2024).

### 9.2 Proposition pour la visionneuse de signature

**Constat qui simplifie beaucoup le sujet** : dans beCPG, la signature est appliquée
**côté serveur**. `SignatureService.prepareForSignature(document, recipients, params)` positionne
signature et paraphes (page, ancrage par mot-clé, ratios, direction), et
`PDFBoxServiceImpl.signDocument()` réalise la signature cryptographique — avec en plus des
implémentations DocuSign et YouSign. Le client ne fait donc **que de l'affichage et du
consentement**.

Or l'actuel embarque **PDFTron / Apryse WebViewer**, un SDK d'annotation complet
(`becpg-artworks-share/.../artworks-viewer/pdftron/lib/webviewer.min.js`) — d'où le
ralentissement fatal sur Firefox (#35696). C'est un composant surdimensionné pour l'usage.

**Proposition pour le portail** — visionneuse légère :

| Besoin | Solution |
|---|---|
| Afficher le PDF, toutes pages, sur mobile comme sur desktop | `pdf.js` via `react-pdf` (Mozilla, MIT, pas de licence, pas de WASM lourd) |
| Montrer **où** signature et paraphes seront apposés | les coordonnées sont déjà connues côté serveur (`prepareForSignature`) → on les renvoie et on dessine un simple cadre en surimpression |
| Capturer la signature | `signature_pad` (tracé) ou saisie du nom (signature dactylographiée), au choix du client |
| Attester la lecture de toutes les pages | compteur de pages vues, condition d'activation du bouton — remplace l'obligation actuelle de signer chaque page |
| Signer | POST unique → `signDocument()` côté serveur, inchangé |

Bénéfices : mobile-compatible, pas de licence Apryse pour le portail, pas de SDK de plusieurs
Mo, et le bug Firefox disparaît. PDFTron reste en place dans `becpg-artworks` pour l'annotation
d'artworks, qui est son vrai usage.

**Si cette proposition n'est pas retenue**, PDFTron convient — mais il faudra alors traiter
#35696 séparément et accepter la contrainte mobile.

---

## 10. Critères d'acceptation V1

1. Un fournisseur reçoit un email, se connecte via SSO, voit **immédiatement** ce qu'on attend
   de lui, sans formation.
2. Il complète un référencement de matière première **depuis un téléphone**, en plusieurs
   sessions, **sans jamais perdre de saisie**.
3. Il sait à tout moment **pour quel client et quelle filiale** il travaille (logo, nom).
4. Il voit **pourquoi** un champ est demandé (cahier des charges, tooltip, consigne d'étape).
5. Il ne voit **aucun élément d'interface interne** qui ne le concerne pas (cf. #19293).
6. Il ne peut pas finaliser tant que le catalogue de conformité bloquant n'est pas satisfait.
7. Il signe son document et le projet se clôture sans intervention manuelle côté client.
8. Côté client, un référent qualité voit **en un écran** l'état de son parc fournisseurs :
   agréments, documents expirants, campagnes en cours, fournisseurs à risque — sans ouvrir un
   seul projet.
9. **Un référencement démarré dans Share se termine dans le nouveau portail, et inversement**,
   sans manipulation ni migration.
10. Aucune régression sur les modèles de projet clients existants, et aucune modification d'un
    webscript, script ou modèle beCPG en place (§7.2).

---

## Sources

- Code : `/home/matthieu/becpg-workspace/becpg` (becpg-plm, becpg-share)
- Paramétrage client : `/home/matthieu/becpg-workspace/bridor/data/`,
  `/home/matthieu/becpg-workspace/aryzta/data/`
- Tickets Bridor (Redmine projet 56) : #24097, #25928, #28951, #29273, #30111, #31283, #31938,
  #32395, #33582, #34523, #34802, #35696
- Tickets Aryzta (projets 95 / 126 / 152) : #17985, #19075, #19293, #24285, #25071, #25461
- Compte de recette fournisseur : `supplier` dans
  `becpg-boxes/recette/src/fixtures/users.local.json`
- Documentation : `/home/matthieu/becpg-workspace/becpg-docs/becpg-plm/latest/fr/`
- Référence stack : `/home/matthieu/becpg-workspace/becpg-regulatory/becpg-regulatory-ui`
- Référence multitenant + IA : `/home/matthieu/becpg-workspace/becpg-ai/doc/`
- Benchmark : [Tracklab — Plateforme](https://www.tracklab.co/en),
  [Onboarding](https://www.tracklab.co/en/platform/listing-supplier-product),
  [Renouvellement documentaire](https://www.tracklab.co/en/platform/document-renewal),
  [Détection de risques](https://www.tracklab.co/en/platform/risk-detection),
  [Évaluation & dashboards](https://www.tracklab.co/en/platform/dashboard-scoring),
  [Base fournisseurs & produits](https://www.tracklab.co/en/platform/supplier-product-database),
  [Intégrations](https://www.tracklab.co/en/platform/integrations)
