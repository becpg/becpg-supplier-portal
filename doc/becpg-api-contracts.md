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
    "dataType": "d:double",
    "constraints": [ { "type": "LIST", "parameters": { } } ],
    "columns": [ /* colonnes imbriquées pour les sous-listes */ ]
} ] }
```

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
- `becpg/supplier/sendToSupplier` (POST) — démarrer un projet de référencement
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

⇒ **Il reste au portail à obtenir une session Share.** Le mécanisme existe dans le produit :
`BeCPGAIMSFilter` établit une session Share à partir d'un token OIDC. Le portail doit donc, une
fois par session utilisateur, appeler Share avec son `Authorization: Bearer <access_token>`,
capturer le `JSESSIONID` et le conserver dans son cookie de session chiffré, puis l'envoyer sur
les appels `/share/service/becpg/portal/wizard`.

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
- Authentification : **token OIDC** (pas le ticket Alfresco), headers `X-BecPG-Instance`.

Badges de confiance (spec §4.4) : ≥ 90 vert, 70-89 orange, < 70 rouge, **rien si absent**
(une confiance absente ne doit jamais être lue comme une confiance faible).
