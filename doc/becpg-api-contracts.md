# Contrats des webscripts beCPG consommés par le portail

> Établi par lecture du code de `../becpg` (2026-07-29). Toutes les URL sont relatives à
> `<becpgUrl>/alfresco/s/`. Le portail les atteint via son proxy `/api/v1/becpg/**`.
> **Aucun de ces webscripts n'est modifié par le projet** (spec §7.2).

## Conventions

- `format=json` en query sur tous les appels.
- Les nodeRef `workspace://SpacesStore/<uuid>` s'écrivent `workspace/SpacesStore/<uuid>`
  dans les chemins d'URL (helper `nodeRefToPath`).
- Authentification : `alf_ticket=<ticket>` en query, ticket obtenu par échange du token OIDC.

---

## 1. Formulaires et colonnes — **c'est Share qui résout, pas le dépôt**

C'est le point d'architecture le plus important du document, et le plus contre-intuitif.

**La configuration des formulaires vit dans Share** (`becpg-*-form-config.xml`,
`becpg-config-custom.xml` et les surcharges client). Le dépôt ne la lit pas : la liste `configs`
du bean `becpgFormService` (`becpg-core/.../context/form-context.xml`) est **entièrement
commentée**. `becpg/form` côté dépôt n'est donc **pas** une source de définition de formulaire.

Le montage réel, visible dans
`becpg-share/.../modules/entity-datagrid/config/columns.get.js` :

```
Share (site-webscript)
  1. résout la configuration du formulaire :
       config.scoped[itemType].forms.getForm(formId)
     avec la cascade beCPG : formId + entityType + siteId + list, dans cet ordre de priorité,
     puis repli sur le formulaire par défaut
  2. en extrait les champs visibles pour le mode (view / edit / create) + les champs "forcés"
  3. POST /becpg/form { itemKind, itemId, formId, fields, force, entityNodeRef,
                        skipSecurityRules }   (remote.connect("alfresco"))
       -> le DÉPÔT renvoie les MÉTADONNÉES des champs demandés :
          dataType, label, mandatory, readOnly, constraints, repeating, control + control-params
  4. fusionne, ajoute les préférences utilisateur, les sous-listes (dataList_*),
     les entités liées (entity_*), et sérialise en JSON
```

Autrement dit : **Share décide quels champs et comment ; le dépôt décrit ces champs.**
Les deux sont nécessaires, et l'ordre compte.

> Conséquence pour le portail : on **ne parse pas les XML**, on **ne réimplémente pas la
> cascade** — on laisse Share faire, et on consomme son JSON. Voir §8.

### Endpoint existant, utilisable tel quel

`GET /share/service/module/entity-datagrid/config/columns`

Params : `itemType`, `list`, `formId`, `mode` (`view`\|`edit`\|`create`\|`bulk-edit`\|
`datagrid-prefs`), `siteId`, `entityType`, `entityNodeRef`, `noCache`.

Réponse (`columns.get.json.ftl`) :

```json
{ "columns": [ {
    "type": "property|association|dataList|entity",
    "name": "bcpg:nutListValue",
    "formsName": "prop_bcpg_nutListValue",
    "label": "Valeur",            // DÉJÀ traduit (msg())
    "options": "…",               // help / paramètres de contrôle
    "mandatory": false, "readOnly": false, "protectedField": false,
    "repeating": false,
    "dataType": "double",
    "constraints": [ { "type": "LIST", "parameters": { } } ],
    "columns": [ /* colonnes imbriquées pour les sous-listes */ ]
} ] }
```

> ⚠ **`dataType` n'est PAS préfixé** (corrigé le 2026-07-31 ; ce document indiquait
> `"d:double"`, c'était faux). `columns.get.json.ftl` sérialise `"${col.dataType}"` tel quel,
> et `POST /becpg/form` renvoie le **nom local** du type. Mesuré sur une 26.1.0 :
>
> ```
> {"name":"bcpg:ingListQtyPerc","dataType":"double","type":"property"}
> {"name":"bcpg:depthLevel","dataType":"int","type":"property"}
> ```
>
> Conséquence côté portail, réelle et longtemps invisible : `DATATYPE_CONTROLS`,
> `components/form/controls/index.js`, `validation.js`, `DateControl`, `ReadOnlyControl`,
> `ProductSections` et `autocomplete.js` comparent tous à `d:double` / `d:date` /
> `d:noderef` — **aucune de ces comparaisons ne pouvait matcher**, donc chaque propriété
> retombait sur le contrôle texte par défaut (une date sans sélecteur, un booléen sans case).
> `lib/adapters/forms.js` normalise désormais le type dans `normalizeField`
> (`qualifyDataType`), à l'unique entonnoir par lequel passent les deux sources.
>
> Quand la colonne est une **association**, le template émet `col.endpointType` dans
> `dataType` — donc une valeur déjà préfixée (`bcpg:ing`), qu'il ne faut pas re-préfixer.

C'est **le contrat des colonnes de datalist** et il gère nativement les `formId` dédiés au
fournisseur (`datagrid-supplier-nut` d'Aryzta, `supplier` de Bridor).

> Attention : ce webscript appelle `AlfrescoUtil.getPreferences`, donc il s'exécute **en tant
> qu'utilisateur** — il suppose une session Share authentifiée. Voir §8 pour la conséquence.

## 2. Datalists — `becpg/entity/datalists/data/node/{store_type}/{store_id}/{id}`

`GET|POST`. Params utiles : `dataListName`, `itemType`, `entityNodeRef`, `fields`, `filter`,
`filterData`, `sort`, `sortId`, `page`, `pageSize`, `maxResults`, `metadata`, `locale`.

Réponse (`JSONDataListOutputWriter`) :

```json
{
  "metadata": { "...": "colonnes, permissions, type de liste" },
  "items": [
    { "nodeRef": "...", "itemData": { "bcpg:nutListValue": { "value": 12, "displayValue": "12" } } }
  ]
}
```

- Chaque valeur est un objet `{ value, displayValue }` (ou une valeur simple selon le type) —
  `displayValue` est **déjà localisé**, c'est lui qu'on affiche.
- Écriture : `POST becpg/entity/datalists/item/node/...` (création / mise à jour de ligne).

## 3. Autocomplete — `becpg/autocomplete/{sourcetype}/...`

Formes d'URL :
- `becpg/autocomplete/{sourcetype}/values/{path}`
- `becpg/autocomplete/{sourcetype}/associations/{className}`
- `becpg/autocomplete/{sourcetype}/reports/{productType}`
- `becpg/autocomplete/{sourcetype}`

Params : `q` (terme), `pageSize`, `page`, `className(s)`, `attributeName`, `filter`,
`excludeClassNames`, `excludeProps`, `andProps`, `path`, `parent`, `entityNodeRef`, `isSearch`,
`productType`.

Réponse :

```json
{
  "result": [
    { "value": "workspace://SpacesStore/x", "name": "Libellé", "cssClass": "",
      "metadatas": [ { "key": "code", "value": "MP001" } ] }
  ],
  "page": "1", "pageSize": "25", "fullListSize": "132"
}
```

> Le `ds` du contrôle de formulaire contient l'URL complète à appeler (ex.
> `becpg/autocomplete/targetassoc/associations/bcpg:ingTypeItem`). Le contrôle
> `autocomplete-association.ftl` ajoute un `parentAssoc` : la valeur du champ parent doit être
> passée en paramètre pour filtrer (ex. usines filtrées par fournisseur).
> C'est le `POST /api/v1/autocomplete/{formId}/{fieldId}` de la spec : le portail envoie les
> autres valeurs du formulaire pour résoudre ces dépendances.

## 4. Sécurité et état des listes — `becpg/security/entitylists/check/{store_type}/{store_id}/{id}`

`GET`, params : `checkTaskAssignment=true`, `skipSecurityRules=true`.

Réponse (`EntitySecurityWebScript`) :

```json
{ "hasAssignedTask": true, "accessMode": 2, "datalists": [ { "name": "nutList", "state": "Valid" } ] }
```

- `accessMode` : `1` = READ, `2` = WRITE.
- `datalists[].state === "Valid"` ⇒ **liste gelée par le client**, non modifiable.
- `View-properties` et `View-documents` sont les pseudo-listes des étapes `form` et `documents`.

> C'est l'appel qui pilote tout l'état lecture/écriture du wizard. Il doit être fait **une fois**
> au chargement et le résultat propagé, jamais re-déduit du DOM (cf. bug #25928).

## 5. Catalogues — `becpg/entity/catalog/node/{store_type}/{store_id}/{id}`

`GET`. Renvoie les catalogues applicables avec les champs manquants et le score de complétion.
Alimente le panneau de conformité du wizard et la jauge de complétude du dashboard.

## 6. Entités — `becpg/remote/*`

- `becpg/remote/entity?nodeRef=` — fiche entité
- `becpg/remote/entity/list?query=&maxResults=&fields=` — liste (syntaxe FTS ; **préférer
  db-afts** pour éviter le décalage d'indexation, cf. spec §4.6.6)

  > ⚠ **`fields` plafonne la réponse à `beCPG.remote.maxResults.hardLimit` (256 d'origine),
  > quel que soit `maxResults`.** `AbstractEntityWebScript` applique ce plafond aux requêtes
  > portant `fields` ou `lists`. Le plafond est **silencieux** — la réponse s'arrête à 256
  > lignes sans erreur — mais il est **signalé** : `pagination.hasMoreItems` vaut `true`.
  > C'est le seul indicateur fiable ; ne jamais lire `pagination.totalItems` comme un
  > compte (cf. §9).
  >
  > Mesuré sur un fournisseur détenant 312 lignes `bcpg:documentAspect` :
  >
  > | requête | lignes | `hasMoreItems` |
  > |---|---|---|
  > | `maxResults=1000` **sans** `fields` | 312 | `false` |
  > | `maxResults=1000` **avec** `fields` | **256** | **`true`** |
  > | `page=1..4`, `maxResults=100`, avec `fields` | 100+100+100+12 = **312** | `false` au dernier |
  >
  > Augmenter `maxResults` ne lève pas le plafond : **seule la pagination y parvient**.
  > Et `page` est ici **1-based**, avec `page=0` qui **est un alias de `page=1`** — itérer
  > à partir de 0 relit la première fenêtre (mesuré : 100 doublons sur 400 lignes).
  >
  > ⚠ **`pagination.totalItems` n'est pas un total.** `JsonEntityVisitor` y écrit
  > `pagingResult.getTotalResultCount().getFirst()`, que `BeCPGQueryBuilder.search()`
  > remplit avec `ResultSet.getNumberFound()`. Deux sens selon le chemin pris par
  > `inDBIfPossible()` :
  >
  > | chemin | `hasMoreItems` | `totalItems` |
  > |---|---|---|
  > | db-afts (prédicat que la base sait traiter : `TYPE:`, égalité de propriété) | `true` | **`count + 1`** — sentinelle « il en reste au moins un », jamais un compte |
  > | db-afts | `false` | le vrai total (la fenêtre tenait tout) |
  > | index / SOLR (`ANCESTOR:`, plein texte…) | `true` ou `false` | `numFound`, le vrai total, constant d'une page à l'autre |
  >
  > Mesuré, un fournisseur, disjonction `TYPE:` : `maxResults=2 → count 2, totalItems 3` ;
  > `maxResults=5 → count 5, totalItems 6` ; `maxResults=200 → count 173, totalItems 173,
  > hasMoreItems false`. Et sur le chemin index, 79 matières premières sous un fournisseur :
  > `totalItems 79` sur les pages 1…4 pendant que `count` valait 25/25/25/4.
  >
  > Un lecteur ne sait pas quel chemin a servi : le portail tranche donc sur les nombres
  > eux-mêmes (`readListTotal()`, `lib/adapters/tasks.js`) et publie **un total exact ou
  > pas de total** — `totalItems: null` + `totalAtLeast` (plancher prouvé). Lire
  > `totalItems` comme un compte plafonne tout écran à `maxResults + 1`.
  >
  > Conséquence si on l'ignore : tout filtre appliqué *en mémoire* après la requête
  > (`?entity=`, `?status=`) porte sur une fenêtre arbitraire. Sur ce dépôt, un produit
  > neuf portant huit exigences obligatoires non satisfaites répondait
  > `total: 0, blocking: 0, completeness: 100` — le portail déclarait le fournisseur en
  > règle. Côté portail, `searchAllNodes()` (`lib/adapters/documents.js`) lit désormais
  > jusqu'à épuisement.
- `becpg/remote/formulate?nodeRef=&format=json` — reformulation entre étapes
- `becpg/remote/dictionary?type=` — dictionnaire (types, propriétés, libellés)

## 7. Projets et tâches

> ⚠ Le **nom du fichier** de descripteur n'est pas l'URL. Prendre l'URL déclarée dans
> `<url>`, pas `projectTaskInfo` / `completeProjectTask`.

- `becpg/project/task?nodeRef=` — détail d'une tâche
  (fichier `projectTaskInfo.get.desc.xml`)
- `becpg/project/complete/task?nodeRef=` (POST) — valider une tâche
  (fichier `completeProjectTask.post.desc.xml`)
- `becpg/project/path?nodeRef=&path=SupplierDocuments` — résolution du dossier documents
  (utilisé par `nextStepWebScript` entre deux étapes du wizard)
- `becpg/supplier/send-to-supplier` (POST) — démarrer un projet de référencement.
  **⚠ INUTILISABLE sur 26.1.0**, et ce n'est pas un problème de paramètres : son contrôleur
  `SupplierPortalWebScript` n'est **déclaré nulle part comme bean Spring**
  (`becpg-plm-core/.../context/service-context.xml` déclare
  `webscript.fr.becpg.supplier.createSupplier.post` et `…updateSupplier.post`, mais pas
  `…sendToSupplier.post`). Alfresco retombe donc sur un webscript déclaratif et cherche un
  template inexistant :

  ```
  HTTP 500 — 06312600 Cannot locate template processor for template
             fr/becpg/supplier/sendToSupplier.post.json
  ```

  Mesuré en direct sur Alfresco avec un ticket admin, portail hors circuit — encore vérifié
  le 31/07/2026 sur l'instance locale 26.1.0 (`HTTP 500`). **`POST /api/v1/process/start` ne
  l'appelle plus** : il compose `becpg/workflow/start-process` (ci-dessous), comme Share.
- `becpg/workflow/start-process?script=create-supplier-project.js&nodeRefs=…` (POST) —
  **le point d'entrée qui fonctionne**, et celui qu'utilise réellement la boîte de dialogue
  « Envoyer au fournisseur » de Share (`beCPG/script/workflow/process.json`,
  clé `submissionUrl`). Le corps JSON est le `formData` du formulaire :

  ```json
  { "prop_pjt_projectState": "InProgress",
    "prop_cm_name": "…",
    "prop_pjt_projectPriority": "2",
    "assoc_bcpg_entityTplRef_added": "workspace://SpacesStore/<modèle de projet>",
    "assoc_bcpg_supplierAccountRef_added": "workspace://SpacesStore/<compte>,…",
    "prop_pjt_tlDue": "2026-08-21T00:00:00.000Z" }
  ```

  Réponse `{"persistedObject":"workspace://SpacesStore/<projet>"}`. Le script exécute
  `bSupplier.createSupplierProject(...)` — donc exactement le même service — puis, si
  `prop_pjt_tlDue` est fourni, recalcule la durée de la tâche fournisseur.
  `prop_pjt_tlDue` est le seul moyen de donner une échéance à la tâche : le modèle de projet
  porte une durée fixe.

  > Le proxy générique du portail (`/api/v1/becpg/**`) n'expose que **GET et HEAD**
  > (`app/api/v1/becpg/[...path]/route.js`), et `becpg/workflow/` n'est volontairement pas
  > dans `ALLOWED_BECPG_PATH_PREFIXES` : l'appel est fait côté serveur avec
  > `skipAllowList: true` depuis `app/api/v1/process/start/route.js`, donc la surface
  > joignable depuis le navigateur reste inchangée.

- `becpg/workflow/start-process?defs=true&nodeRefs=…` (GET) — **les définitions de
  `process.json` dont la `condition` et le `permissionGroup` passent pour ces items**, avec
  les `formFields` **déjà évalués** par `StartProcessWebscript` (`expressionService.eval`).
  C'est ainsi que le portail obtient `prop_cm_name`
  (`bSupplier.extractSupplierProjectName`) et `assoc_bcpg_supplierAccountRef`
  (`bSupplier.extractSupplierAccountRefs`) sans réimplémenter la moindre règle métier — et
  c'est aussi un second garde-fou : pas de définition ⇒ beCPG refuse ⇒ le portail répond 403.

  > ⚠ `assoc_bcpg_supplierAccountRef_added` est **obligatoire** en pratique.
  > `create-supplier-project.js` fait
  > `formDataJson.assoc_…_added != null ? ….split(",") : ""`, et Rhino ne sait pas convertir
  > `""` en `String[]` :
  > `La méthode 'SupplierPortalHelper.createSupplierProject([ScriptNode;,ScriptNode,string)' est introuvable`.
  > Envoyer une chaîne vide n'aide pas non plus (`"".split(",")` ⇒ `[""]` ⇒ `new NodeRef("")`).
  > D'où l'appel `defs=true` préalable, et le fait que le champ est omis quand il est vide.

- `becpg/autocomplete/targetassoc/associations/pjt:project?classNames=pjt:project,bcpg:entityTplAspect,bcpg:suppliersAspect&excludeProps=bcpg:entityTplEnabled|false`
  — **comment identifier les modèles de projet fournisseur sans nodeRef codé en dur.**
  C'est la source de données que la boîte de dialogue de Share utilise elle-même
  (`modules/supplier/send-to-supplier.get.html.ftl:44` et le champ `bcpg:entityTplRef` du
  formulaire `supplier-process`, `becpg-plm-form-config.xml:5521`). `bcpg:suppliersAspect`
  (`PLMModel.ASPECT_SUPPLIERS`) est posé sur le modèle par le produit lui-même
  (`SupplierPortalInitRepoVisitor:204`). `TargetAssocAutoCompletePlugin.filterByClass()`
  traduit chaque aspect en `withAspect()`, donc une clause **obligatoire** : la requête est
  une conjonction. Mesuré sur l'instance locale 26.1.0 : 62 modèles `pjt:project` actifs,
  **1 seul** retenu (« Projet de référencement fournisseur »).
  Consommé par `lib/adapters/processTemplates.js`.
- `api/task-instances` — tâches de workflow (la source du dashlet `my-tasks`)
- `api/people/{username}?groups=true` — groupes de l'utilisateur, pour résoudre
  `GROUP_EXTERNAL_SUPPLIER_<code>`

Attention : sur `becpg/project/task`, `entityNodeRef` désigne le **projet** (c'est
`task.parent.parent.parent`), pas le produit. Le produit se lit dans le paramètre `nodeRef` de
l'URL du livrable.

## 8. Structure du wizard et définitions de formulaire — **on laisse faire Share**

### Principe

On ne parse aucun XML et on ne réimplémente pas la cascade de résolution des formulaires
(§1). Le portail consomme du JSON produit par Share, qui est le seul à connaître la
configuration effective, surcharges client comprises.

### L'endpoint à ajouter côté Share

Un seul webscript Share, modelé sur `columns.get.js` (même structure, mêmes fonctions
`getFormConfig` / `getVisibleFields` / `createPostBody` / `remote.connect("alfresco")`) :

```
GET /share/service/becpg/portal/wizard
      ?wizardId=supplier-rawMaterial
      &nodeRef=workspace://SpacesStore/…
      &entityType=bcpg:rawMaterial
      &siteId=supplier-portal
```

Il renvoie en **un seul appel** tout ce dont le portail a besoin :

```json
{
  "wizard": { "id": "supplier-rawMaterial", "draft": true, "comments": true,
              "allSteps": false, "readOnly": false,
              "enforceTask": true, "skipSecurityRules": false },
  "steps": [ {
      "id": "step1", "type": "form", "label": "Propriétés", "title": "…",
      "formId": "supplier", "itemId": "bcpg:rawMaterial", "listId": null,
      "nextStepWebScript": null,
      "definition": {                       // résolu par Share + /becpg/form
         "tabs": [], "sets": [ { "id": "mainInfo", "label": "…", "appearance": "bordered-panel" } ],
         "fields": [ { "name": "bcpg:legalName", "label": "…", "dataType": "d:mltext",
                       "mandatory": false, "readOnly": false, "set": "mainInfo",
                       "control": { "template": "textarea.ftl", "params": { "rows": "2" } },
                       "constraints": [] } ]
      }
  } ]
}
```

Pourquoi un webscript et pas trois appels : la résolution du `formId` dépend du couple
(itemType, entityType, siteId, list) et l'enchaînement Share → `/becpg/form` est déjà écrit dans
`columns.get.js`. Le refaire côté portail, c'est garantir la divergence.

C'est l'unique ajout côté beCPG prévu par la spec §5.4.1, et il est **strictement additif** :
nouveau fichier, aucune modification de l'existant.

### Sources à reprendre pour l'écrire

| Besoin | Où c'est déjà fait |
|---|---|
| Résolution du formulaire avec la cascade | `columns.get.js` → `getFormConfig()` |
| Champs visibles par mode + champs forcés | `columns.get.js` → `getVisibleFields()`, `createPostBody()` |
| Appel au dépôt pour les métadonnées | `columns.get.js` → `remote.connect("alfresco").post("/becpg/form", …)` |
| Lecture de la config wizard | `wizard-mgr.get.js` → `config.scoped["wizard"]["wizards"].childrenMap["wizard"]` |
| Sérialisation JSON des champs | `columns.get.json.ftl` (macro `displayColumns`) |

### En attendant cet ajout

- **Colonnes de datalist** : `module/entity-datagrid/config/columns` **existe déjà**, on
  l'utilise tel quel — les datagrids fonctionnent sans rien ajouter.

  > ⚠ **Mais uniquement en repli.** Ce webscript appelle `AlfrescoUtil.getPreferences` : il
  > s'exécute *en tant qu'utilisateur Share* et répond **401 sans session Share** — que le
  > serveur du portail ne peut pas obtenir (voir plus bas). Le ré-interroger pour des champs
  > que l'endpoint `becpg/portal/wizard` a **déjà résolus** transformait chaque étape
  > datalist et questionnaire en `share_session_required`. Mesuré sur 26.1.0, entité
  > `17243f08-…` : l'endpoint wizard renvoyait 3/17/28/13/17/12/11/7 champs pour les étapes
  > 2 à 9 avec le seul `portalTicket`, pendant que
  > `GET /api/v1/wizard/{id}/step/step2` répondait 401.
  >
  > `lib/adapters/wizard.js` (`stepColumns`) consomme donc `step.definition` quand elle
  > existe et ne retombe sur `config/columns` que sinon. Les deux jeux de champs sont les
  > mêmes *par construction* : `portal-form.lib.js` est une extraction de `columns.get.js`
  > et appelle les mêmes `getVisibleFields()` / `createPostBody()` / `POST /becpg/form`.
  > Seule la sérialisation diffère — `id` au lieu de `formsName`, `help` au lieu de
  > `options` —, et `normalizeField` lisait déjà les deux formes.
- **Lignes de datalist : `rows` contient une ligne qui n'en est pas une.** Pour les listes
  qui portent un total (`bcpg:ingList`…), beCPG ajoute une ligne **synthétique** au payload :
  `{ nodeRef: null, itemType: 'total', … }`. Elle n'est **pas** comptée dans `total`.
  Mesuré sur 26.1.0, branche `94411b52-…`, produit sans aucun `bcpg:ingList` :

  ```
  GET /api/v1/wizard/{entityId}/step/step3
    → { "total": 0, "rows": [ { "nodeRef": null, "itemType": "total", … } ] }
  ```

  > ⚠ Se fier à `rows.length` fait donc croire qu'une liste vide contient une ligne. C'est
  > `total` qui compte les vraies lignes ; `rows` doit être filtré sur
  > `itemType !== 'total'` avant tout affichage ou tout test de vacuité. Les autres listes du
  > même wizard (allergènes, physico-chimiques, allégations, microbiologie, organoleptique)
  > ne portent pas de total et répondent `rows: []` — d'où un comportement qui diffère d'une
  > étape à l'autre sans que la configuration ne l'explique.
- **Structure du wizard** : repli sur `config/wizards.default.js` (transcription de la config
  standard livrée). Elle ne contient pas les surcharges client — c'est une béquille de
  développement assumée, remplacée dès que le webscript ci-dessus existe.
- L'adaptateur `lib/adapters/wizardConfig.js` expose la même interface dans les deux cas, avec
  un simple drapeau de configuration pour basculer.

### État réel de l'endpoint (testé sur une instance 26.1.0, 2026-07-30)

Implémenté sur la branche `feature/supplier-portal-v2` de `../becpg` :
`becpg-share/.../site-webscripts/org/alfresco/becpg/portal/wizard.get.{desc.xml,js,json.ftl}`
plus `portal-form.lib.js` (extraction des fonctions de `columns.get.js`).

**Ce qui fonctionne, vérifié en HTTP 200 :**

- la structure du wizard, avec `draft` / `comments` / `enforceTask` / `skipSecurityRules` ;
- les 10 étapes, **libellés et consignes déjà traduits par Share** ;
- la définition résolue des 9 étapes `entityDataList` et `survey` (3 à 28 champs chacune).

**Trois pièges rencontrés, à retenir :**

| Piège | Détail |
|---|---|
| `<import>` doit être en **ligne 1** | sinon la directive n'est pas substituée et reste du JS invalide |
| `response.status` est un **objet**, pas un entier | le code numérique est `response.status.code` ; comparer l'objet à `401` échoue silencieusement. Le corps est `response.response`. |
| `config.scoped[x]` renvoie `undefined`, pas `null` | `undefined !== null` est vrai en JS : les deux doivent être testés |
| Le cache d'`<import>` survit à `reset=on` | un redémarrage de Share est nécessaire après modification d'une lib |

**Les étapes de type `form` : clé de résolution, puis session Share**

Deux causes distinctes, toutes deux identifiées et traitées.

*Cause 1 — la clé de résolution.* `config.scoped[x]` passe `x` tel quel à
`ConfigService.getConfig(x)` comme objet de contexte
(`ConfigModel.ScopedConfigMap`, spring-webscripts). La clé décide donc de l'évaluateur
qui peut se déclencher :

| Clé passée | Évaluateur qui matche |
|---|---|
| un QName de type (`bcpg:nutList`) | `evaluator="model-type"` |
| une chaîne nodeRef (`workspace://SpacesStore/…`) | `evaluator="node-type"` — `NodeMetadataBasedEvaluator.applies()` n'accepte qu'une String au motif `.+://.+/.+`, puis résout le type via `/api/metadata` |

beCPG déclare ses formulaires de liste sous **les deux** évaluateurs
(`becpg-plm-form-config.xml` : 64 blocs `model-type`, 63 `node-type`), mais ses **types
produit** uniquement sous `node-type` (`becpg-plm-rm-form-config.xml`). Passer le QName
trouvait donc les listes et manquait les produits.

⇒ Corrigé : le nodeRef sert de clé **pour les étapes `form` uniquement**. Une étape datalist
ne doit surtout pas l'utiliser — son nodeRef est celui de l'**entité**, pas de la ligne, et la
résolution renverrait silencieusement le formulaire de l'entité : une définition fausse, bien
pire qu'une définition vide.

*Cause 2 — la session Share.* L'évaluateur `node-type` appelle `/api/metadata` via le
connecteur de **session** Share (`ServiceBasedEvaluator.callService`), avale
`NotAuthenticatedException` et renvoie `false` en silence. Sans session, aucun formulaire
`node-type` ne se résout — quel que soit le langage de l'endpoint.

**Vérifié empiriquement** sur une instance 26.1.0 :

| Appel | `step1` (type `form`) |
|---|---|
| avec `portalTicket` seul | `error: no-form-config` |
| avec un cookie de session Share | **21 champs, `formId=supplier`** ✅ |

Les 10 étapes se résolvent alors, et la cascade est prouvée : `step3` renvoie
`formId=datagrid-rawMaterial`, c'est-à-dire la variante spécifique au type d'entité — donc les
surcharges client seront bien reprises.

⇒ **Il reste au portail à obtenir une session Share.**

> ⚠ **Correction (mesuré le 2026-07-30 sur une 26.1.0 avec un Keycloak local et un vrai token).**
> Le paragraphe qui suivait ici affirmait que le portail pouvait appeler Share avec
> `Authorization: Bearer <access_token>` et récupérer le `JSESSIONID` produit par
> `BeCPGAIMSFilter`. **C'est faux, et le code le dit :** il n'y a aucune occurrence de `Bearer`
> en entrée dans `BeCPGAIMSFilter.doFilter()` — les seules portes sont (a) un
> `SPRING_SECURITY_CONTEXT` déjà en session, (b) une réponse d'autorisation OIDC
> (`matchesAuthorizationResponse`), (c) une **redirection 302** vers `aims-login`. Le champ
> `autodetectBearerOnly` de `share-config-custom.xml` n'est jamais lu par ce filtre.
>
> Mesures, AIMS activé, token valide de `supplier.local@becpg.fr` :
>
> | Appel | Résultat |
> |---|---|
> | `GET /share/page/` + `Authorization: Bearer <at>` | `302 → /share/page/aims-login` — token ignoré |
> | `GET /share/page/aims-dologin` + Bearer | `302 → Keycloak /auth` — token ignoré |
> | `GET /share/page/` + `Authorization: Basic` | `302 → aims-login` (`enableBasicAuth=false`) |
> | `POST /share/page/dologin` (login/mdp) | `302 → aims-login` — **AIMS supprime aussi cette porte** |
> | `GET /share/page/?alf_ticket=TICKET_…` | 200 mais session **anonyme** → `no-form-config` |
> | rejeu serveur complet du flux code d'autorisation (jar de cookies Share **et** Keycloak) | **21 champs** ✅ |
>
> Autrement dit : une session Share s'obtient **uniquement** en jouant le flux
> `code d'autorisation` de bout en bout, ce qui suppose une session SSO Keycloak — que le
> navigateur possède et que le serveur du portail n'a pas. Un `JSESSIONID` seul ne prouve rien :
> Share en distribue un à tout le monde. `lib/shareSession.js` distingue donc désormais les deux
> en regardant si Share redirige vers l'IdP.
>
> Activer AIMS sur Share est par ailleurs **négatif** pour le portail (ligne 4 du tableau) : ne
> pas l'activer tant que le point ci-dessous n'est pas tranché.
>
> Trois voies possibles, à arbitrer :
> 1. un **endpoint Share additif** qui échange un bearer contre une session Share (réutilise
>    `BeCPGAIMSFilter.onSuccess` / `getAlfTicket`) — la vraie correction produit ;
> 2. le portail **proxifie Share sur sa propre origine**, le navigateur établit la session Share
>    via SSO et le cookie revient au serveur (c'est ce que fait `becpg-http` en production) ;
> 3. l'**imitation d'utilisateur Keycloak** (rôle `impersonation` sur le compte de service du
>    portail) : fonctionne sans rien changer au produit, mais donne au portail le pouvoir
>    d'ouvrir une session pour n'importe qui — décision de sécurité, pas décision technique.

> Écarté : dupliquer un bloc `model-type` pour le formulaire `supplier` de chaque type produit.
> Les surcharges client (Bridor, Aryzta) sont déclarées sous `node-type` et ne seraient pas
> reprises — ce qui annulerait tout l'intérêt de l'endpoint.

En l'absence de session, l'endpoint renvoie un marqueur typé
`{ "error": "no-form-config", "lookupKey": …, "requestedFormId": … }` — distinct de
`definition: null` qui signifie « sans objet » (étape `documents`).

### Authentification vers Share — résolu

Le point était ouvert ; il est tranché et testé.

L'endpoint `becpg/portal/wizard` n'a **aucune dépendance utilisateur** (pas de préférences de
colonnes, pas d'`AlfrescoUtil`) et est donc appelable sans session Share.

Pour l'appel au dépôt, en revanche, le connecteur `alfresco` de Share s'authentifie avec le
ticket de la **session Share** (`authenticator-id: alfresco-ticket`) et refuse d'emblée, par un
401, quand il n'y a pas de session. Solution retenue et vérifiée : le portail transmet son propre
ticket Alfresco en paramètre `portalTicket`, et l'endpoint passe par **`alfresco-noauth`** —
l'endpoint sans identité que Share utilise lui-même pour l'accès anonyme
(cf. `templates/org/alfresco/quickshare.js`) — en ajoutant `alf_ticket` à l'URL.

Conséquence, et c'est la bonne : `/becpg/form` s'exécute **en tant que fournisseur**, donc les
règles de sécurité au niveau champ appliquées sont les siennes.

> Le paramètre s'appelle `portalTicket` et non `alf_ticket` : Share intercepte `alf_ticket` comme
> paramètre d'authentification de sa propre couche.
>
> Sans ticket, la bibliothèque retombe sur le connecteur de session, ce qui permet de la réutiliser
> depuis une page Share authentifiée.

### Structure d'une étape

`id`, `label`/`labelId`, `title`/`titleId`, `type`, `formId`, `itemId`, `listId`,
`nextStepWebScript`, `nodeRefStepIndex`, `read-only`.
Attributs de wizard : `draft`, `comments`, `allSteps`, `read-only`, `enforceTask`,
`skipSecurityRules`.
Types d'étape : `form`, `entityDataList`, `survey`, `documents`.

> `listId` peut porter un suffixe `@N` (ex. `surveyList@1`) : plusieurs instances de la même
> liste sur une entité — c'est le mécanisme des questionnaires multiples d'Aryzta (spec §2ter.1).

## 9. Documents et exigences documentaires

Aucune API dédiée n'est nécessaire (spec §5.4.2) : `DocumentFormulationHandler` matérialise
déjà les documents attendus sur l'entité. On lit les enfants documentaires de l'entité avec
leurs propriétés :

| Propriété | Sens |
|---|---|
| `bcpg:documentTypeRef` | type de document (assoc) |
| `bcpg:documentIsMandatory` | obligatoire (calculé, formule SPEL possible) |
| `bcpg:documentState` | `Simulation` = **attendu, non fourni** ; sinon fourni |
| `cm:from` / `cm:to` | début / fin de validité (`cm:effectivity`) |
| `bcpg:aiValidationState` | `ToValidate` / … — analyse IA du document |
| `bcpg:aiValidationHints` | remarques de l'IA |

⇒ « ce que je dois fournir et pour quand » = lister ces documents et les présenter en check-list.

## 10. IA — becpg-ai

- `GET /api/suggestions/{entityId}` — suggestions avec `confidence` (par ligne et moyenne)
- `POST /api/suggestions/apply` — appliquer

### 10.1 Authentification : le bearer OIDC **seul**

**Token OIDC** (jamais le ticket Alfresco) dans `Authorization: Bearer …`, et **rien d'autre**.

> ⚠️ **Ne jamais envoyer `X-BecPG-Instance` à côté du bearer.** Cette page l'a longtemps
> prescrit ; c'est faux, et c'est la raison pour laquelle le portail n'a **jamais** atteint
> becpg-ai. Côté becpg-ai ce header est le *principal* de `RequestHeaderAuthenticationFilter`
> (alias de `BECPG_TICKET`), et ce filtre passe **avant** le filtre bearer : une simple valeur
> `dev` y est interprétée comme un jeton composite `<instance>$<login>@<tenant>#<ticket>`, échoue
> dans `UserNameHelper`, et la requête reste **anonyme** — le bearer n'est jamais regardé.
>
> Mesuré sur dev-ai.becpg.fr, même token valide :
>
> | Appel | sans le header | avec `X-BecPG-Instance: dev` |
> |---|---|---|
> | `GET /api/auth/me` | **200** `{"username":"6bae8a39-…","isAdmin":false}` | **401** |
> | `GET /api/suggestions/{id}` | **200**, 29 suggestions | **500** |
>
> Le tenant n'a pas besoin d'être transmis : il voyage **dans le token**, en claims
> `becpg_instance` et `becpg_url` (vérifié : `"becpg_instance":"dev"`,
> `"becpg_url":"https://dev.becpg.fr"`), que `OAuth2DelegatedAuthenticationProvider` lit pour
> réécrire l'URL de l'appel descendant vers beCPG.

Le header `BECPG_TICKET` (base64 de `<instance>$<login>@<tenant>#<TICKET_…>`) reste le second
schéma accepté par becpg-ai ; il ne sert qu'au mode `DEV_FAKE_AUTH`, où la session ne porte pas
de bearer.

### 10.2 `GET /api/suggestions/{id}` accepte aussi un **document**

Non documenté côté becpg-ai, et pourtant central : `createSuggestionContext` regarde le type du
nœud, voit `cm:content`, le garde comme `currentDocument` et résout l'entité porteuse via
`bcpg:documentEntityRef`. C'est ce qui permet au portail de demander la revue d'un document
juste après son dépôt (`POST /api/v1/documents/{id}/ai-review`).

Deux conséquences mesurées :

- La suggestion `DocumentReview` renvoyée porte des `suggestedChanges` qui écrivent
  `bcpg:aiValidationState` / `…Hints` / `…Date` **sur le document**, imbriqués dans le
  `cm:contains` de l'entité. C'est le seul écrivain de ces champs : rien dans beCPG n'appelle
  becpg-ai.
- Si le document n'a **pas** de `bcpg:documentEntityRef` (cas d'un dépôt libre dans
  `Documents fournisseur`), l'entité ne peut pas être résolue et `currentEntity` reste le
  document lui-même : les plugins d'extraction proposent alors des propriétés produit
  (`bcpg:legalName`, `cm:title`…) **sur un nœud `cm:content`**. Mesuré sur dev. Ne jamais
  appliquer automatiquement autre chose que `DocumentReview`.

### 10.3 Badges de confiance

Badges de confiance (spec §4.4) : ≥ 90 vert, 70-89 orange, < 70 rouge, **rien si absent**
(une confiance absente ne doit jamais être lue comme une confiance faible).

Valeurs réellement observées sur dev-ai (2026-08-01) : `null` sur la quasi-totalité des
suggestions d'entité (Classification, FieldSuggestion, Organoleptics), **80** sur un
`DocumentReview`, **100** sur une extraction de document. Le seau `low` n'a jamais été produit
par le modèle.

## 11. Signature — ce que beCPG expose vraiment (spec §9.2)

Tout ci-dessous a été **mesuré** sur l'instance locale 26.1.0, tâche
`workspace://SpacesStore/89e840ed-…` (« Signature de documents »,
projet *JUnit SignatureService Project test (8)*).

### 11.1 La géométrie est dans le PDF, pas derrière une API

`PDFBoxServiceImpl.prepareForSignature()` calcule les rectangles (mot-clé d'ancrage, ou
`fromLeftRatio` / `fromBottomRatio` du MediaBox, puis `index * gap` selon `direction`) et les
**écrit dans le document** : un `PDSignatureField` + son `PDAnnotationWidget`, puis
`saveIncremental()`. Nommage figé : `<formattedUsername>-signature` sur la page de signature,
`<formattedUsername>` pour les paraphes sur toutes les autres.

La seule surface HTTP du module est
`GET /alfresco/s/becpg/signature/node/{store_type}/{store_id}/{id}/{action}` avec
`action ∈ {checkout, create-session, checkin, cancel}` — **aucune des quatre ne renvoie de
coordonnées**. `prepareForSignature(document, recipients, params)` n'est atteignable que depuis
Java ou jscript (`SignatureScriptHelper`).

⇒ Le portail lit donc les widgets **dans les octets qu'il sert déjà**
(`lib/pdfSignatureFields.js`, pdf.js côté serveur). Ce n'est ni une devinette ni un recalcul :
c'est le rectangle que PDFBox remplira. Pas de widget → `zones: []` → **aucun cadre dessiné**.

Mesuré sur `cb1c7ba8-…` (copie de travail préparée, 2 pages, 200 849 o) :

| champ | page | rect PDF | ⇒ ratio (origine haut-gauche) |
|---|---|---|---|
| `matthieuWF` (paraphes) | 1 | `[459, 79.2, 559, 114.2]` | x 0.750, y 0.856, l 0.163, h 0.044 |
| `matthieuWF-signature` | 2 | `[367.2, 79.2, 567.2, 154.2]` | x 0.600, y 0.805, l 0.327, h 0.095 |

`x = 0.60` et `0.75` retombent exactement sur les défauts `signatureFromLeftRatio=60` et
`initialsFromLeftRatio=75` ; `y` sur `fromBottomRatio=10`.

### 11.2 Le document à afficher n'est **pas** `deliverable.contents[0]`

`becpg/project/task` renvoie, pour la tâche de signature :

| source | nœud | AcroForm |
|---|---|---|
| `deliverable.url` → `artworks-viewer?nodeRef=…` | `cb1c7ba8-…` **copie de travail** | **oui** |
| `deliverable.contents[0]` (`pjt:dlContent`) | `cce86b34-…` original | non |

Afficher `contents[0]` reviendrait à montrer un document sans le moindre champ de signature.
**C'est l'URL de la vue qui désigne le document à rendre.**

### 11.3 Trois livrables par document et par tâche

`SignatureProjectServiceImpl` crée, pour chaque document et chaque destinataire :

| livrable | `pjt:dlScriptExecOrder` | script |
|---|---|---|
| `… - prepare` | `Pre` | `cm:prepare-signature.js` → `bSign.prepareForSignature` + `getSignatureView` |
| `… - url` | *(aucun)* | porte l'URL de la vue — c'est celui que le portail lit |
| `… - sign` | `Post` | `cm:sign-document.js` → **`bSign.signDocument()`** |

⇒ **Signer = compléter la tâche.** Il n'existe aucun webscript « signer » à proxyfier ;
`POST /api/v1/signature/{taskId}` proxyfie `becpg/project/complete/task`, et beCPG exécute le
script post-livrable. Vérifié : après le POST, le livrable `- sign` passe à `Completed` et le
projet avance à la tâche suivante (`- validate`).

### 11.4 États lus, et où

| information | source |
|---|---|
| `sign:status` (`Initialized`/`Prepared`/`ReadyToSign`/`Signed`) | `GET api/metadata?nodeRef=…` sur le document |
| `sign:recipientsData` | idem — JSON `{recipients:[{username, nodeRef, preparationDate, signatureDate}]}` |
| état du livrable / de la tâche | `becpg/project/task` |

Deux pièges mesurés :

- `api/metadata/node/{store}/{id}` répond **405** sur 26.1 : seule la forme
  `api/metadata?nodeRef=…` fonctionne ;
- un nœud supprimé répond **`200 {}`**, pas 404. Après signature `sign-document.js` **supprime
  la copie de travail** ; sans traiter ce cas, l'URL de téléchargement de l'écran « déjà signé »
  pointerait sur un nœud disparu. Le portail retombe alors sur l'original, où le contenu signé
  a été archivé.

### 11.5 Prérequis d'installation pour que la signature aboutisse vraiment

`PDFBoxServiceImpl.signContent()` signe **hors ligne** (PDFBox + BouncyCastle, `SHA256WithRSA`,
`adbe.pkcs7.detached`) avec une clé lue dans le **keystore de métadonnées Alfresco**
(`encryption.keystore.location`). Sur l'instance locale ce keystore ne contient que la clé
secrète `metadata` et `beCPG.signature.keystore.alias` est **vide** : `signDocument()` échoue,
l'exception est avalée par le `try/catch` de `sign-document.js`, la tâche se termine quand même
et `sign:status` reste `Prepared`.

Pour signer réellement :

```
keytool -genkeypair -alias signature -keyalg RSA -keysize 2048 -sigalg SHA256withRSA \
        -storetype JCEKS -keystore <encryption.keystore.location> \
        -storepass <metadata-keystore.password> -keypass <mot de passe de la clé> \
        -ext KeyUsage=digitalSignature,nonRepudiation -ext ExtendedKeyUsage=emailProtection
beCPG.signature.keystore.alias=signature
beCPG.signature.keystore.password=<mot de passe de la clé>
beCPG.signature.tsaUrl=https://freetsa.org/tsr,http://timestamp.digicert.com   # défaut produit
```

Fait sur l'instance locale le 2026-07-31 (alias `signature`, RSA 2048, auto-signé). Contrôle :
le PDF final contient `/ByteRange` et `adbe.pkcs7.detached`, le CMS porte le certificat
(`CN=beCPG Supplier Portal Signature (local test)`), un `signingTime` et un
`id-smime-aa-timeStampToken`, et `sign:status` passe à `Signed`.

⚠️ **Ne pas vider `beCPG.signature.tsaUrl` en pensant « supprimer une dépendance réseau ».**
Mesuré : sans horodatage, la signature cryptographique est bien apposée (`/ByteRange` +
`adbe.pkcs7.detached` présents) mais `updateSignatureInformation()` écrit
`recipientJson.put("signatureDate", null)` — org.json **supprime** alors la clé —, donc
`allSigned()` renvoie `false` et **`sign:status` reste `Initialized`**. Le document est signé,
beCPG ne le déclare pas signé. Le portail ne s'y trompe pas (il lit aussi l'état de la tâche),
mais tout ce qui interroge `sign:status` s'y trompera.

⚠️ **Deuxième condition, silencieuse : l'association `sign:preparedRecipients`.**
`signDocument()` boucle sur `getTargetAssocs(copieDeTravail, sign:preparedRecipients)` ; si elle
est vide, il **ne signe rien**, checkine quand même, ne lève aucune exception et laisse
`sign:status` inchangé — la tâche se termine, le projet avance, et rien n'est signé. C'est
l'état de la plupart des fixtures JUnit de l'instance locale (copies de travail préparées le
2026-07-06 dont l'association a disparu). Diagnostic :

```
GET /alfresco/api/-default-/public/alfresco/versions/1/nodes/{copieDeTravail}/targets
→ doit contenir assocType "sign:preparedRecipients"
```

### 11.6 Une tâche peut porter **plusieurs** documents signables

`beCPG/signature/sign-document.js` est un script **post-livrable**, pas post-tâche : compléter
la tâche l'exécute **une fois par livrable**, et signe donc tous les documents préparés.
Mesuré : `workspace://SpacesStore/c928cfab-…` (« Signature de documents ») porte deux livrables
`sample_1.pdf` et `sample_2.pdf`, chacun avec sa propre copie de travail préparée.

`GET /api/v1/signature/{taskId}` renvoie donc **`documents: [...]`** — un objet par livrable
signable, chacun avec ses propres `zones`, `pageCount`, `signStatus` et `contentUrl`.
`document` reste le premier, pour les appelants qui n'en attendent qu'un.

L'écran monte une visionneuse par document et la jauge de lecture **additionne leurs pages** :
n'afficher que le premier ferait attester une lecture qui n'a pas eu lieu sur un document qui,
lui, serait signé. Les livrables clos sont écartés **seulement s'il en reste un ouvert** — sinon
il ne resterait rien à afficher sur l'écran « déjà signé », qui est la revisite la plus fréquente
de ce parcours (#34523).

### 11.7 Une tâche de signature ne nomme **aucun** produit — mesuré, et contourné

Mesuré de bout en bout sur dev.becpg.fr le 03/08/2026, projet
`bb82cde1-…` (« PORTALTEST 35846 Nougat de chez Remi … REFERENCING - 2026 »), tâche
`4c865b96-…` « Signature de documents » assignée à `supplier-test@becpg.fr` :

| source | réponse pour le fournisseur |
|---|---|
| les 3 livrables (`- prepare`, `- url`, `- sign`) | désignent tous **le document**, jamais le produit |
| `becpg/project/task` → `task.entityNodeRef` | `"#access_forbidden"` |
| `becpg/remote/entity?nodeRef=<projet>` | **401** |
| `api/task-instances?authority=<fournisseur>` | la tâche **n'y est pas** (le workflow de signature n'est pas listé pour lui) — seule la source `pjt:tlResourcesAssocIndex` la voit |

⇒ Il n'existe **aucun** chemin par association ou par propriété qui relie, pour ce compte,
la tâche de signature au produit. Le seul lien lisible est la **hiérarchie** :
`SupplierPortalServiceImpl.getOrCreateSupplierDocumentsFolder(entityNodeRef)` crée
« Documents fournisseur » comme enfant direct de l'entité, et
`SignatureProjectHelper.findDocumentsToSign()` ne cherche que là-dedans.

`lib/adapters/tasks.js` remonte donc du document vers l'entité, avec
`becpg/remote/entity?nodeRef=…&fields=…&lists=none` (546–720 octets par nœud, mesuré), en
s'arrêtant au premier ancêtre qui n'est ni `cm:`/`sys:`/`st:`/`app:` ni `pjt:` — deux sauts
dans ce parcours. Le nœud de départ est **l'original** (`contents[0]`), pas la copie de
travail : après signature `sign-document.js` supprime celle-ci, et la fiche d'une tâche close
doit continuer à nommer son produit (vérifié après signature).

⚠️ Piège associé : sur dev, `=sys:node-uuid:"<uuid>"` sur `becpg/remote/entity/list` renvoie
**0 résultat** pour un nœud fraîchement créé, là où `ID:"<nodeRef>"` le trouve — le contraire
de ce que le chemin « db-afts temps réel » laisse espérer. La marche ci-dessus lit le nœud
directement et ne dépend donc d'aucun index.

