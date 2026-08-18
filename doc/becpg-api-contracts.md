# Contracts of the beCPG webscripts consumed by the portal

> Established by reading the code of `../becpg` (2026-07-29). All URLs are relative to
> `<becpgUrl>/alfresco/s/`. The portal reaches them through its proxy `/api/v1/becpg/**`.
> **None of these webscripts is modified by the project** (spec §7.2).

## Conventions

- `format=json` in the query string on every call.
- nodeRefs `workspace://SpacesStore/<uuid>` are written `workspace/SpacesStore/<uuid>`
  in URL paths (helper `nodeRefToPath`).
- Authentication: `alf_ticket=<ticket>` in the query string, ticket obtained by exchanging the
  OIDC token.

---

## 1. Forms and columns — **Share is what resolves them, not the repository**

This is the most important architectural point in the document, and the most counter-intuitive.

**Form configuration lives in Share** (`becpg-*-form-config.xml`,
`becpg-config-custom.xml` and the client overrides). The repository does not read it: the
`configs` list of the `becpgFormService` bean (`becpg-core/.../context/form-context.xml`) is
**entirely commented out**. `becpg/form` on the repository side is therefore **not** a source of
form definition.

The real assembly, visible in
`becpg-share/.../modules/entity-datagrid/config/columns.get.js`:

```
Share (site-webscript)
  1. resolves the form configuration:
       config.scoped[itemType].forms.getForm(formId)
     with the beCPG cascade: formId + entityType + siteId + list, in that order of priority,
     then falls back to the default form
  2. extracts from it the fields visible for the mode (view / edit / create) + the "forced" fields
  3. POST /becpg/form { itemKind, itemId, formId, fields, force, entityNodeRef,
                        skipSecurityRules }   (remote.connect("alfresco"))
       -> the REPOSITORY returns the METADATA of the requested fields:
          dataType, label, mandatory, readOnly, constraints, repeating, control + control-params
  4. merges, adds the user preferences, the sublists (dataList_*),
     the linked entities (entity_*), and serialises to JSON
```

In other words: **Share decides which fields and how; the repository describes those fields.**
Both are needed, and the order matters.

> Consequence for the portal: we **do not parse the XML**, we **do not reimplement the
> cascade** — we let Share do it, and we consume its JSON. See §8.

### Existing endpoint, usable as is

`GET /share/service/module/entity-datagrid/config/columns`

Params: `itemType`, `list`, `formId`, `mode` (`view`\|`edit`\|`create`\|`bulk-edit`\|
`datagrid-prefs`), `siteId`, `entityType`, `entityNodeRef`, `noCache`.

Response (`columns.get.json.ftl`):

```json
{ "columns": [ {
    "type": "property|association|dataList|entity",
    "name": "bcpg:nutListValue",
    "formsName": "prop_bcpg_nutListValue",
    "label": "Valeur",            // ALREADY translated (msg())
    "options": "…",               // help / control parameters
    "mandatory": false, "readOnly": false, "protectedField": false,
    "repeating": false,
    "dataType": "double",
    "constraints": [ { "type": "LIST", "parameters": { } } ],
    "columns": [ /* nested columns for the sublists */ ]
} ] }
```

> ⚠ **`dataType` is NOT prefixed** (corrected on 2026-07-31; this document stated
> `"d:double"`, which was wrong). `columns.get.json.ftl` serialises `"${col.dataType}"` as is,
> and `POST /becpg/form` returns the **local name** of the type. Measured on a 26.1.0:
>
> ```
> {"name":"bcpg:ingListQtyPerc","dataType":"double","type":"property"}
> {"name":"bcpg:depthLevel","dataType":"int","type":"property"}
> ```
>
> Consequence on the portal side, real and long invisible: `DATATYPE_CONTROLS`,
> `components/form/controls/index.js`, `validation.js`, `DateControl`, `ReadOnlyControl`,
> `ProductSections` and `autocomplete.js` all compare against `d:double` / `d:date` /
> `d:noderef` — **none of those comparisons could ever match**, so every property
> fell back to the default text control (a date without a picker, a boolean without a checkbox).
> `lib/adapters/forms.js` now normalises the type in `normalizeField`
> (`qualifyDataType`), at the single funnel through which both sources pass.
>
> When the column is an **association**, the template emits `col.endpointType` in
> `dataType` — hence a value that is already prefixed (`bcpg:ing`), which must not be
> prefixed again.

This is **the datalist column contract** and it natively handles the `formId`s dedicated to the
supplier (`datagrid-supplier-nut` from Aryzta, `supplier` from Bridor).

> Careful: this webscript calls `AlfrescoUtil.getPreferences`, so it runs **as the user** — it
> assumes an authenticated Share session. See §8 for the consequence.

## 2. Datalists — `becpg/entity/datalists/data/node/{store_type}/{store_id}/{id}`

`GET|POST`. Useful params: `dataListName`, `itemType`, `entityNodeRef`, `fields`, `filter`,
`filterData`, `sort`, `sortId`, `page`, `pageSize`, `maxResults`, `metadata`, `locale`.

Response (`JSONDataListOutputWriter`):

```json
{
  "metadata": { "...": "columns, permissions, list type" },
  "items": [
    { "nodeRef": "...", "itemData": { "bcpg:nutListValue": { "value": 12, "displayValue": "12" } } }
  ]
}
```

- Each value is an object `{ value, displayValue }` (or a plain value depending on the type) —
  `displayValue` is **already localised**, and it is the one we display.
- Writing: `POST becpg/entity/datalists/item/node/...` (row creation / update).

## 3. Autocomplete — `becpg/autocomplete/{sourcetype}/...`

URL forms:
- `becpg/autocomplete/{sourcetype}/values/{path}`
- `becpg/autocomplete/{sourcetype}/associations/{className}`
- `becpg/autocomplete/{sourcetype}/reports/{productType}`
- `becpg/autocomplete/{sourcetype}`

Params: `q` (term), `pageSize`, `page`, `className(s)`, `attributeName`, `filter`,
`excludeClassNames`, `excludeProps`, `andProps`, `path`, `parent`, `entityNodeRef`, `isSearch`,
`productType`.

Response:

```json
{
  "result": [
    { "value": "workspace://SpacesStore/x", "name": "Libellé", "cssClass": "",
      "metadatas": [ { "key": "code", "value": "MP001" } ] }
  ],
  "page": "1", "pageSize": "25", "fullListSize": "132"
}
```

> The `ds` of the form control holds the full URL to call (e.g.
> `becpg/autocomplete/targetassoc/associations/bcpg:ingTypeItem`). The
> `autocomplete-association.ftl` control adds a `parentAssoc`: the value of the parent field must
> be passed as a parameter to filter (e.g. plants filtered by supplier).
> This is the spec's `POST /api/v1/autocomplete/{formId}/{fieldId}`: the portal sends the other
> values of the form to resolve those dependencies.

## 4. Security and list state — `becpg/security/entitylists/check/{store_type}/{store_id}/{id}`

`GET`, params: `checkTaskAssignment=true`, `skipSecurityRules=true`.

Response (`EntitySecurityWebScript`):

```json
{ "hasAssignedTask": true, "accessMode": 2, "datalists": [ { "name": "nutList", "state": "Valid" } ] }
```

- `accessMode`: `1` = READ, `2` = WRITE.
- `datalists[].state === "Valid"` ⇒ **list frozen by the client**, not modifiable.
- `View-properties` and `View-documents` are the pseudo-lists of the `form` and `documents` steps.
- `hasAssignedTask` is computed **only if `checkTaskAssignment=true`** is passed, and
  that computation is expensive: measured on the reference instance, **1575 ms against 66 ms** without it.
  The portal therefore asks for it only when it will do something with it (`enforceTask`),
  and republishes `null` — "not requested" — the rest of the time. A `false` means
  beCPG answered no; the two must not be confused.

> This is the call that drives the whole read/write state of the wizard. It must be made **once**
> on load and the result propagated, never re-derived from the DOM (cf. bug #25928).

## 5. Catalogs — `becpg/entity/catalog/node/{store_type}/{store_id}/{id}`

`GET`. Returns the applicable catalogs with the missing fields and the completion score.
Feeds the wizard's compliance panel and the dashboard's completeness gauge.

## 6. Entities — `becpg/remote/*`

- `becpg/remote/entity?nodeRef=` — entity record
- `becpg/remote/entity/list?query=&maxResults=&fields=` — list (FTS syntax; **prefer
  db-afts** to avoid the indexing lag, cf. spec §4.6.6)

  > ⚠ **`fields` caps the response at `beCPG.remote.maxResults.hardLimit` (256 originally),
  > whatever `maxResults` says.** `AbstractEntityWebScript` applies that cap to requests
  > carrying `fields` or `lists`. The cap is **silent** — the response stops at 256
  > rows with no error — but it is **signalled**: `pagination.hasMoreItems` is `true`.
  > It is the only reliable indicator; never read `pagination.totalItems` as a
  > count (cf. §9).
  >
  > Measured on a supplier holding 312 `bcpg:documentAspect` rows:
  >
  > | request | rows | `hasMoreItems` |
  > |---|---|---|
  > | `maxResults=1000` **without** `fields` | 312 | `false` |
  > | `maxResults=1000` **with** `fields` | **256** | **`true`** |
  > | `page=1..4`, `maxResults=100`, with `fields` | 100+100+100+12 = **312** | `false` on the last |
  >
  > Raising `maxResults` does not lift the cap: **only pagination does**.
  > And `page` is **1-based** here, with `page=0` being **an alias of `page=1`** — iterating
  > from 0 re-reads the first window (measured: 100 duplicates over 400 rows).
  >
  > ⚠ **`pagination.totalItems` is not a total.** `JsonEntityVisitor` writes
  > `pagingResult.getTotalResultCount().getFirst()` into it, which `BeCPGQueryBuilder.search()`
  > fills with `ResultSet.getNumberFound()`. Two meanings depending on the path taken by
  > `inDBIfPossible()`:
  >
  > | path | `hasMoreItems` | `totalItems` |
  > |---|---|---|
  > | db-afts (a predicate the database can handle: `TYPE:`, property equality) | `true` | **`count + 1`** — a sentinel meaning "there is at least one more", never a count |
  > | db-afts | `false` | the real total (the window held everything) |
  > | index / SOLR (`ANCESTOR:`, full text…) | `true` or `false` | `numFound`, the real total, constant from one page to the next |
  >
  > Measured, one supplier, a `TYPE:` disjunction: `maxResults=2 → count 2, totalItems 3`;
  > `maxResults=5 → count 5, totalItems 6`; `maxResults=200 → count 173, totalItems 173,
  > hasMoreItems false`. And on the index path, 79 raw materials under one supplier:
  > `totalItems 79` on pages 1…4 while `count` was 25/25/25/4.
  >
  > A reader cannot tell which path was used: the portal therefore decides on the numbers
  > themselves (`readListTotal()`, `lib/adapters/tasks.js`) and publishes **an exact total or
  > no total at all** — `totalItems: null` + `totalAtLeast` (a proven floor). Reading
  > `totalItems` as a count caps every screen at `maxResults + 1`.
  >
  > Consequence if it is ignored: any filter applied *in memory* after the query
  > (`?entity=`, `?status=`) operates on an arbitrary window. On this repository, a brand-new
  > product carrying eight unsatisfied mandatory requirements answered
  > `total: 0, blocking: 0, completeness: 100` — the portal declared the supplier
  > compliant. On the portal side, `searchAllNodes()` (`lib/adapters/documents.js`) now reads
  > until exhaustion.
- `becpg/remote/formulate?nodeRef=&format=json` — reformulation between steps
- `becpg/remote/dictionary?type=` — dictionary (types, properties, labels)

## 7. Projects and tasks

> ⚠ The descriptor **file name** is not the URL. Take the URL declared in
> `<url>`, not `projectTaskInfo` / `completeProjectTask`.

- `becpg/project/task?nodeRef=` — detail of a task
  (file `projectTaskInfo.get.desc.xml`)
- `becpg/project/complete/task?nodeRef=` (POST) — complete a task
  (file `completeProjectTask.post.desc.xml`)
- `becpg/project/path?nodeRef=&path=SupplierDocuments` — resolution of the documents folder
  (used by `nextStepWebScript` between two wizard steps)
- `becpg/supplier/send-to-supplier` (POST) — start a referencing project.
  **⚠ UNUSABLE on 26.1.0**, and it is not a parameter problem: its controller
  `SupplierPortalWebScript` is **declared nowhere as a Spring bean**
  (`becpg-plm-core/.../context/service-context.xml` declares
  `webscript.fr.becpg.supplier.createSupplier.post` and `…updateSupplier.post`, but not
  `…sendToSupplier.post`). Alfresco therefore falls back on a declarative webscript and looks
  for a template that does not exist:

  ```
  HTTP 500 — 06312600 Cannot locate template processor for template
             fr/becpg/supplier/sendToSupplier.post.json
  ```

  Measured live on Alfresco with an admin ticket, portal out of the loop — checked again
  on 2026-07-31 on the local 26.1.0 instance (`HTTP 500`). **`POST /api/v1/process/start` no
  longer calls it**: it composes `becpg/workflow/start-process` (below), like Share.
- `becpg/workflow/start-process?script=create-supplier-project.js&nodeRefs=…` (POST) —
  **the entry point that works**, and the one actually used by Share's
  « Envoyer au fournisseur » dialog (`beCPG/script/workflow/process.json`,
  key `submissionUrl`). The JSON body is the form's `formData`:

  ```json
  { "prop_pjt_projectState": "InProgress",
    "prop_cm_name": "…",
    "prop_pjt_projectPriority": "2",
    "assoc_bcpg_entityTplRef_added": "workspace://SpacesStore/<project template>",
    "assoc_bcpg_supplierAccountRef_added": "workspace://SpacesStore/<account>,…",
    "prop_pjt_tlDue": "2026-08-21T00:00:00.000Z" }
  ```

  Response `{"persistedObject":"workspace://SpacesStore/<project>"}`. The script runs
  `bSupplier.createSupplierProject(...)` — so exactly the same service — then, if
  `prop_pjt_tlDue` is supplied, recomputes the duration of the supplier task.
  `prop_pjt_tlDue` is the only way to give the task a due date: the project template
  carries a fixed duration.

  > The portal's generic proxy (`/api/v1/becpg/**`) exposes only **GET and HEAD**
  > (`app/api/v1/becpg/[...path]/route.js`), and `becpg/workflow/` is deliberately not
  > in `ALLOWED_BECPG_PATH_PREFIXES`: the call is made server-side with
  > `skipAllowList: true` from `app/api/v1/process/start/route.js`, so the surface
  > reachable from the browser stays unchanged.

- `becpg/workflow/start-process?defs=true&nodeRefs=…` (GET) — **the definitions of
  `process.json` whose `condition` and `permissionGroup` pass for those items**, with
  the `formFields` **already evaluated** by `StartProcessWebscript` (`expressionService.eval`).
  This is how the portal obtains `prop_cm_name`
  (`bSupplier.extractSupplierProjectName`) and `assoc_bcpg_supplierAccountRef`
  (`bSupplier.extractSupplierAccountRefs`) without reimplementing a single business rule — and
  it is also a second safeguard: no definition ⇒ beCPG refuses ⇒ the portal answers 403.

  > ⚠ `assoc_bcpg_supplierAccountRef_added` is **mandatory** in practice.
  > `create-supplier-project.js` does
  > `formDataJson.assoc_…_added != null ? ….split(",") : ""`, and Rhino cannot convert
  > `""` to `String[]`:
  > `La méthode 'SupplierPortalHelper.createSupplierProject([ScriptNode;,ScriptNode,string)' est introuvable`.
  > Sending an empty string does not help either (`"".split(",")` ⇒ `[""]` ⇒ `new NodeRef("")`).
  > Hence the preliminary `defs=true` call, and the fact that the field is omitted when empty.

- `becpg/autocomplete/targetassoc/associations/pjt:project?classNames=pjt:project,bcpg:entityTplAspect,bcpg:suppliersAspect&excludeProps=bcpg:entityTplEnabled|false`
  — **how to identify the supplier project templates without a hard-coded nodeRef.**
  This is the data source that Share's own dialog uses
  (`modules/supplier/send-to-supplier.get.html.ftl:44` and the `bcpg:entityTplRef` field of the
  `supplier-process` form, `becpg-plm-form-config.xml:5521`). `bcpg:suppliersAspect`
  (`PLMModel.ASPECT_SUPPLIERS`) is set on the template by the product itself
  (`SupplierPortalInitRepoVisitor:204`). `TargetAssocAutoCompletePlugin.filterByClass()`
  translates each aspect into a `withAspect()`, hence a **mandatory** clause: the query is
  a conjunction. Measured on the local 26.1.0 instance: 62 active `pjt:project` templates,
  **only 1** retained (« Projet de référencement fournisseur »).
  Consumed by `lib/adapters/processTemplates.js`.
- `api/task-instances` — workflow tasks (the source of the `my-tasks` dashlet)
- `api/people/{username}?groups=true` — the user's groups, to resolve
  `GROUP_EXTERNAL_SUPPLIER_<code>`

Careful: on `becpg/project/task`, `entityNodeRef` designates the **project** (it is
`task.parent.parent.parent`), not the product. The product is read from the `nodeRef` parameter
of the deliverable's URL.

## 8. Wizard structure and form definitions — **we let Share do it**

### Principle

We parse no XML and we do not reimplement the form resolution cascade
(§1). The portal consumes JSON produced by Share, which alone knows the effective
configuration, client overrides included.

### The endpoint to add on the Share side

A single Share webscript, modelled on `columns.get.js` (same structure, same
`getFormConfig` / `getVisibleFields` / `createPostBody` / `remote.connect("alfresco")` functions):

```
GET /share/service/becpg/portal/wizard
      ?wizardId=supplier-rawMaterial
      &nodeRef=workspace://SpacesStore/…
      &entityType=bcpg:rawMaterial
      &siteId=supplier-portal
```

It returns, in **a single call**, everything the portal needs:

```json
{
  "wizard": { "id": "supplier-rawMaterial", "draft": true, "comments": true,
              "allSteps": false, "readOnly": false,
              "enforceTask": true, "skipSecurityRules": false },
  "steps": [ {
      "id": "step1", "type": "form", "label": "Propriétés", "title": "…",
      "formId": "supplier", "itemId": "bcpg:rawMaterial", "listId": null,
      "nextStepWebScript": null,
      "definition": {                       // resolved by Share + /becpg/form
         "tabs": [], "sets": [ { "id": "mainInfo", "label": "…", "appearance": "bordered-panel" } ],
         "fields": [ { "name": "bcpg:legalName", "label": "…", "dataType": "d:mltext",
                       "mandatory": false, "readOnly": false, "set": "mainInfo",
                       "control": { "template": "textarea.ftl", "params": { "rows": "2" } },
                       "constraints": [] } ]
      }
  } ]
}
```

Why one webscript and not three calls: resolving the `formId` depends on the pair
(itemType, entityType, siteId, list) and the Share → `/becpg/form` chain is already written in
`columns.get.js`. Rewriting it on the portal side is a guarantee of divergence.

This is the only beCPG-side addition planned by spec §5.4.1, and it is **strictly additive**:
a new file, no modification of anything existing.

### Sources to reuse when writing it

| Need | Where it is already done |
|---|---|
| Form resolution with the cascade | `columns.get.js` → `getFormConfig()` |
| Visible fields per mode + forced fields | `columns.get.js` → `getVisibleFields()`, `createPostBody()` |
| Call to the repository for the metadata | `columns.get.js` → `remote.connect("alfresco").post("/becpg/form", …)` |
| Reading the wizard config | `wizard-mgr.get.js` → `config.scoped["wizard"]["wizards"].childrenMap["wizard"]` |
| JSON serialisation of the fields | `columns.get.json.ftl` (macro `displayColumns`) |

### Until that addition exists

- **Datalist columns**: `module/entity-datagrid/config/columns` **already exists**, we use
  it as is — the datagrids work without adding anything.

  > ⚠ **But only as a fallback.** This webscript calls `AlfrescoUtil.getPreferences`: it
  > runs *as a Share user* and answers **401 without a Share session** — which the portal's
  > server cannot obtain (see below). Re-querying it for fields that the
  > `becpg/portal/wizard` endpoint has **already resolved** turned every datalist
  > and questionnaire step into `share_session_required`. Measured on 26.1.0, entity
  > `17243f08-…`: the wizard endpoint returned 3/17/28/13/17/12/11/7 fields for steps
  > 2 to 9 with `portalTicket` alone, while
  > `GET /api/v1/wizard/{id}/step/step2` answered 401.
  >
  > `lib/adapters/wizard.js` (`stepColumns`) therefore consumes `step.definition` when it
  > exists and falls back to `config/columns` only otherwise. Both sets of fields are the
  > same *by construction*: `portal-form.lib.js` is an extraction of `columns.get.js`
  > and calls the same `getVisibleFields()` / `createPostBody()` / `POST /becpg/form`.
  > Only the serialisation differs — `id` instead of `formsName`, `help` instead of
  > `options` — and `normalizeField` already read both forms.
- **Datalist rows: `rows` contains a row that is not one.** For the lists
  that carry a total (`bcpg:ingList`…), beCPG adds a **synthetic** row to the payload:
  `{ nodeRef: null, itemType: 'total', … }`. It is **not** counted in `total`.
  Measured on 26.1.0, branch `94411b52-…`, a product without any `bcpg:ingList`:

  ```
  GET /api/v1/wizard/{entityId}/step/step3
    → { "total": 0, "rows": [ { "nodeRef": null, "itemType": "total", … } ] }
  ```

  > ⚠ Trusting `rows.length` therefore makes an empty list look like it holds one row. It is
  > `total` that counts the real rows; `rows` must be filtered on
  > `itemType !== 'total'` before any display or any emptiness test. The other lists of the
  > same wizard (allergens, physico-chemical, claims, microbiology, organoleptic)
  > carry no total and answer `rows: []` — hence a behaviour that differs from one
  > step to the next without the configuration explaining it.
- **Wizard structure**: fall back on `config/wizards.default.js` (a transcription of the
  standard shipped config). It does not contain the client overrides — an acknowledged
  development crutch, replaced as soon as the webscript above exists.
- The `lib/adapters/wizardConfig.js` adapter exposes the same interface in both cases, with
  a simple configuration flag to switch.

### Actual state of the endpoint (tested on a 26.1.0 instance, 2026-07-30)

Implemented on the `feature/supplier-portal-v2` branch of `../becpg`:
`becpg-share/.../site-webscripts/org/alfresco/becpg/portal/wizard.get.{desc.xml,js,json.ftl}`
plus `portal-form.lib.js` (extraction of the `columns.get.js` functions).

**What works, verified as HTTP 200:**

- the wizard structure, with `draft` / `comments` / `enforceTask` / `skipSecurityRules`;
- the 10 steps, **labels and instructions already translated by Share**;
- the resolved definition of the 9 `entityDataList` and `survey` steps (3 to 28 fields each).

**Three traps encountered, worth remembering:**

| Trap | Detail |
|---|---|
| `<import>` must be on **line 1** | otherwise the directive is not substituted and stays invalid JS |
| `response.status` is an **object**, not an integer | the numeric code is `response.status.code`; comparing the object to `401` fails silently. The body is `response.response`. |
| `config.scoped[x]` returns `undefined`, not `null` | `undefined !== null` is true in JS: both must be tested |
| The `<import>` cache survives `reset=on` | a Share restart is needed after modifying a lib |

**The `form` steps: resolution key, then Share session**

Two distinct causes, both identified and handled.

*Cause 1 — the resolution key.* `config.scoped[x]` passes `x` as is to
`ConfigService.getConfig(x)` as a context object
(`ConfigModel.ScopedConfigMap`, spring-webscripts). The key therefore decides which evaluator
can fire:

| Key passed | Evaluator that matches |
|---|---|
| a type QName (`bcpg:nutList`) | `evaluator="model-type"` |
| a nodeRef string (`workspace://SpacesStore/…`) | `evaluator="node-type"` — `NodeMetadataBasedEvaluator.applies()` only accepts a String matching `.+://.+/.+`, then resolves the type through `/api/metadata` |

beCPG declares its list forms under **both** evaluators
(`becpg-plm-form-config.xml`: 64 `model-type` blocks, 63 `node-type`), but its **product
types** only under `node-type` (`becpg-plm-rm-form-config.xml`). Passing the QName therefore
found the lists and missed the products.

⇒ Fixed: the nodeRef is used as the key **for `form` steps only**. A datalist step
must on no account use it — its nodeRef is that of the **entity**, not of the row, and the
resolution would silently return the entity's form: a wrong definition, far worse than an
empty one.

*Cause 2 — the Share session.* The `node-type` evaluator calls `/api/metadata` through
Share's **session** connector (`ServiceBasedEvaluator.callService`), swallows
`NotAuthenticatedException` and silently returns `false`. Without a session, no `node-type`
form resolves — whatever the language of the endpoint.

**Verified empirically** on a 26.1.0 instance:

| Call | `step1` (type `form`) |
|---|---|
| with `portalTicket` alone | `error: no-form-config` |
| with a Share session cookie | **21 fields, `formId=supplier`** ✅ |

The 10 steps then resolve, and the cascade is proven: `step3` returns
`formId=datagrid-rawMaterial`, that is the variant specific to the entity type — so the
client overrides will indeed be picked up.

⇒ **It remains for the portal to obtain a Share session.**

> ⚠ **Correction (measured on 2026-07-30 on a 26.1.0 with a local Keycloak and a real token).**
> The paragraph that used to follow here claimed that the portal could call Share with
> `Authorization: Bearer <access_token>` and retrieve the `JSESSIONID` produced by
> `BeCPGAIMSFilter`. **That is false, and the code says so:** there is no occurrence of `Bearer`
> as an input in `BeCPGAIMSFilter.doFilter()` — the only doors are (a) a
> `SPRING_SECURITY_CONTEXT` already in session, (b) an OIDC authorisation response
> (`matchesAuthorizationResponse`), (c) a **302 redirect** to `aims-login`. The
> `autodetectBearerOnly` field of `share-config-custom.xml` is never read by that filter.
>
> Measurements, AIMS enabled, valid token for `supplier.local@becpg.fr`:
>
> | Call | Result |
> |---|---|
> | `GET /share/page/` + `Authorization: Bearer <at>` | `302 → /share/page/aims-login` — token ignored |
> | `GET /share/page/aims-dologin` + Bearer | `302 → Keycloak /auth` — token ignored |
> | `GET /share/page/` + `Authorization: Basic` | `302 → aims-login` (`enableBasicAuth=false`) |
> | `POST /share/page/dologin` (login/password) | `302 → aims-login` — **AIMS removes that door too** |
> | `GET /share/page/?alf_ticket=TICKET_…` | 200 but an **anonymous** session → `no-form-config` |
> | full server-side replay of the authorisation code flow (Share **and** Keycloak cookie jars) | **21 fields** ✅ |
>
> In other words: a Share session is obtained **only** by playing the
> `authorisation code` flow end to end, which presupposes a Keycloak SSO session — which the
> browser has and the portal's server does not. A `JSESSIONID` alone proves nothing:
> Share hands one out to everybody. `lib/shareSession.js` therefore now tells the two apart
> by looking at whether Share redirects to the IdP.
>
> Enabling AIMS on Share is moreover **negative** for the portal (row 4 of the table): do
> not enable it until the point below is settled.
>
> Three possible routes, to be arbitrated:
> 1. an **additive Share endpoint** that exchanges a bearer for a Share session (reusing
>    `BeCPGAIMSFilter.onSuccess` / `getAlfTicket`) — the real product fix;
> 2. the portal **proxies Share on its own origin**, the browser establishes the Share session
>    through SSO and the cookie comes back to the server (this is what `becpg-http` does in
>    production);
> 3. **Keycloak user impersonation** (the `impersonation` role on the portal's service account):
>    it works without changing anything in the product, but it gives the portal the power
>    to open a session for anyone — a security decision, not a technical one.

> Ruled out: duplicating a `model-type` block for the `supplier` form of each product type.
> The client overrides (Bridor, Aryzta) are declared under `node-type` and would not be
> picked up — which would defeat the whole point of the endpoint.

Without a session, the endpoint returns a typed marker
`{ "error": "no-form-config", "lookupKey": …, "requestedFormId": … }` — distinct from
`definition: null`, which means "not applicable" (the `documents` step).

### `completion` — the verdict the portal adds to each step

`GET /api/v1/wizard/{entityId}` strips `definition` and adds, per step:

```json
"completion": { "evaluated": true, "count": 2, "labels": ["Nom légal", "Origine"] }
```

`evaluated: false` means **the portal cannot rule on this step**, and is a real answer: a
datalist declares nothing mandatory, so "the list is empty" is not "the step is incomplete".
It is computed from the definition Share just resolved and the entity that was just read, so
it costs no extra call, and it uses the same predicate the browser applies to the step it has
open — the two can never disagree. Its purpose is the step rail: without it, a reopened task
showed no verdict at all, because the browser only knows the steps it has mounted.

### Authentication towards Share — resolved

The point was open; it is settled and tested.

The `becpg/portal/wizard` endpoint has **no user dependency** (no column preferences, no
`AlfrescoUtil`) and is therefore callable without a Share session.

For the call to the repository, on the other hand, Share's `alfresco` connector authenticates
with the ticket of the **Share session** (`authenticator-id: alfresco-ticket`) and refuses
outright, with a 401, when there is no session. The solution chosen and verified: the portal
passes its own Alfresco ticket in a `portalTicket` parameter, and the endpoint goes through
**`alfresco-noauth`** — the identity-less endpoint that Share itself uses for anonymous access
(cf. `templates/org/alfresco/quickshare.js`) — adding `alf_ticket` to the URL.

Consequence, and it is the right one: `/becpg/form` runs **as the supplier**, so the
field-level security rules applied are the supplier's.

> The parameter is called `portalTicket` and not `alf_ticket`: Share intercepts `alf_ticket` as
> an authentication parameter of its own layer.
>
> Without a ticket, the library falls back on the session connector, which allows it to be
> reused from an authenticated Share page.

### Structure of a step

`id`, `label`/`labelId`, `title`/`titleId`, `type`, `formId`, `itemId`, `listId`,
`nextStepWebScript`, `nodeRefStepIndex`, `read-only`.
Wizard attributes: `draft`, `comments`, `allSteps`, `read-only`, `enforceTask`,
`skipSecurityRules`.
Step types: `form`, `entityDataList`, `survey`, `documents`.

> `listId` can carry an `@N` suffix (e.g. `surveyList@1`): several instances of the same
> list on one entity — this is the mechanism behind Aryzta's multiple questionnaires (spec §2ter.1).

### 8bis. The configuration version signal — **it is missing, and here is what is needed**

The portal caches the wizard structures and the resolved columns
(`lib/adapters/wizardConfig.js`, `WIZARD_CACHE_TTL`, 300 s by default): without that cache, a
ten-step wizard costs one Share resolution per step — **measured on a local 26.1
instance, `GET /api/v1/wizard/{id}`: 1435 ms cold against 50 ms warm**.

The problem is not the cache, it is that it has nothing to hang on to. **Every instance
has its own wizards and they are refreshed** — Upfield versions its wizards by year.
Today, refreshing a wizard in Share leaves the portal serving the old structure
until `WIZARD_CACHE_TTL`.

**Measured, on a 26.1 instance with a real Share session** (and on the reference instance for the
first) — none of these endpoints publishes a version:

| Call | Response |
|---|---|
| `GET module/entity-datagrid/config/columns` | `Cache-Control: max-age=3600, must-revalidate` — **no ETag, no Last-Modified** |
| `GET module/entity-datagrid/config/columns?noCache=<epoch ms>` | adds `Last-Modified: <the value we sent>` — no information |
| `GET becpg/portal/wizard` | `Cache-Control: max-age=300, must-revalidate` — **no ETag, no Last-Modified** |
| `POST becpg/form?reload=true` | `{"SUCCESS": true}` — a trigger, not a version |
| `GET becpg/admin/repository/reload-cache` | admin / `GROUP_SystemMgr` only — a trigger, not a version |

The structure itself comes from `config.scoped["wizard"]` (Surf, `share-config-custom.xml`),
which no webscript dates or versions.

**What needs to be added on the beCPG side** — additive, with no particular right, a single
response line:

```
GET /share/service/becpg/portal/config-version
->  200  ETag: "26.1.0.26-1770135804000"
    { "version": "26.1.0.26-1770135804000", "reloadCount": 7,
      "lastReload": "2026-08-03T18:12:41Z" }
```

The value must change **on every configuration reload**: at startup
(`BecpgFormServiceImpl.afterPropertiesSet`), on `POST /becpg/form?reload=true`
(`FormGetWebScript`) and on `becpg/admin/repository/reload-cache`. A counter incremented in
`reloadConfig()` is enough; exposing it on the Share side additionally allows Surf's
`config.scoped` to be mixed in.

On the portal side, **no beCPG addition is expected**: the configuration cache lives 5 minutes
per tenant and per user (`WIZARD_CACHE_TTL`), and `POST /api/v1/config/refresh` empties it
on demand (`{"scope":"tenant"}` for the whole tenant). The lag is bounded and can be
caught up without a redeployment.

In the meantime, `POST /api/v1/config/refresh` empties the caller's cache — but **only on
the replica that answers**, which is not an operating procedure. That is the main argument
for the addition above.

## 9. Documents and documentary requirements

No dedicated API is needed (spec §5.4.2): `DocumentFormulationHandler` already materialises
the expected documents on the entity. We read the entity's document children with their
properties:

| Property | Meaning |
|---|---|
| `bcpg:documentTypeRef` | document type (assoc) |
| `bcpg:documentIsMandatory` | mandatory (computed, SPEL formula possible) |
| `bcpg:documentState` | `Simulation` = **expected, not supplied**; otherwise supplied |
| `cm:from` / `cm:to` | start / end of validity (`cm:effectivity`) |
| `bcpg:aiValidationState` | `ToValidate` / … — AI analysis of the document |
| `bcpg:aiValidationHints` | AI remarks |

⇒ "what I must supply and by when" = list those documents and present them as a checklist.

## 10. AI — becpg-ai, **behind the repository proxy**

### 10.1 The portal no longer calls becpg-ai. It calls beCPG.

Three operations, served by `AiSuggestionsProxyWebScript` (becpg-core):

| Portal | beCPG | becpg-ai |
|---|---|---|
| `GET becpg/ai/suggestions?nodeRef=&listId=&locale=` | ⟶ | `GET /api/suggestions/{id}` |
| `POST becpg/ai/suggestions/apply` | ⟶ | `POST /api/suggestions/apply` |
| `POST becpg/ai/suggestions/apply-plan` | ⟶ | `POST /api/suggestions/apply-plan` |

**This is the OLAP assembly, for the same reasons.** The repository already holds the
companion service's address (`beCPG.ai.serverUrl`, like `becpg.olap.url.internal`) and already
knows how to authenticate the current user against it. A client calling becpg-ai directly
had to carry three things that are none of its business: the URL, a credential, and the
**format** of that credential.

The portal did exactly that — and **reimplemented in JavaScript** beCPG's composite
token from four environment variables. That token is
`BeCPGTicketService.getCurrentAuthToken()`: a format only beCPG owns, copied
elsewhere, therefore bound to break silently. `BECPG_AI_URL`, `BECPG_AI_API_KEY`,
`BECPG_AI_INSTANCE_NAME` and `BECPG_AI_TENANT` **no longer exist**.

Two properties not to lose:

- **`becpg/ai/` is absent from `ALLOWED_BECPG_PATH_PREFIXES`**, exactly like `becpg/olap/`.
  The proxy exposed to the browser answers **403**; only `lib/adapters/suggestions.js`, which
  runs server-side with `createBecpgClient` (`skipAllowList`), reaches it. Without that
  absence, routing the AI through beCPG would have brought nothing: the browser would have
  tunnelled to it through `/api/v1/becpg/**`. Verified: `403` from the browser, `404` on the
  old route `/api/v1/ai/**`, which is deleted;
- **the operations are closed.** No `path` parameter: a proxy that relays an arbitrary path
  is a generic tunnel to becpg-ai whose destination the caller chooses.
  A fourth operation = one more descriptor, which is the point.

### 10.1.1 What the proxy answers, and how to read it

| Situation | Status | Reading |
|---|---|---|
| `beCPG.ai.serverUrl` empty | **503** `aiNotConfigured` | the instance has no becpg-ai — hide the AI panels |
| webscript missing (older becpg-core) | **404** | same |
| becpg-ai refuses | **401 / 403** relayed as is | a rights problem, not a configuration one |
| becpg-ai answers, but not in JSON | **502** `aiNotJson` + the type received | see below |
| becpg-ai unreachable | **502** `aiUnreachable` | outage |

The upstream status is relayed, never overwritten: "becpg-ai refused you", "becpg-ai is not
configured" and "becpg-ai is down" are different facts.

> ⚠️ **A 200 from becpg-ai is not proof of an answer.** Unauthenticated, becpg-ai serves its
> **OAuth login page as HTTP 200 `text/html`** — measured by pointing a local instance
> at another instance's becpg-ai, one instance's ticket not being valid for another. Relayed as is,
> that page reaches the portal labelled `application/json` and only fails much further on,
> as a "non-JSON payload", without saying anything about the cause. The proxy therefore checks
> the upstream content type and answers `502 aiNotJson`. Same family of trap as OLAP's
> "200 with an empty body" (historical §): a success status that is not an answer.

On the becpg-ai side authentication is unchanged — the webscript is what carries it now,
with the `BECPG_TICKET` header built by `BeCPGTicketService`. The historical trap
(`X-BecPG-Instance` sent alongside the bearer made the request anonymous, measured: `200`
without the header against `401` with it) no longer concerns the portal, which sends none of
those headers.

### 10.2 `GET /api/suggestions/{id}` also accepts a **document**

Undocumented on the becpg-ai side, and yet central: `createSuggestionContext` looks at the type
of the node, sees `cm:content`, keeps it as `currentDocument` and resolves the carrying entity
through `bcpg:documentEntityRef`. This is what lets the portal ask for the review of a document
right after it is uploaded (`POST /api/v1/documents/{id}/ai-review`).

Two measured consequences:

- The `DocumentReview` suggestion returned carries `suggestedChanges` that write
  `bcpg:aiValidationState` / `…Hints` / `…Date` **on the document**, nested in the entity's
  `cm:contains`. It is the only writer of those fields: nothing in beCPG calls becpg-ai.
- If the document has **no** `bcpg:documentEntityRef` (the case of a free upload into
  `Documents fournisseur`), the entity cannot be resolved and `currentEntity` stays the
  document itself: the extraction plugins then propose product properties
  (`bcpg:legalName`, `cm:title`…) **on a `cm:content` node**. Measured on the reference instance. Never
  automatically apply anything other than `DocumentReview`.

### 10.3 Confidence badges

Confidence badges (spec §4.4): ≥ 90 green, 70-89 orange, < 70 red, **nothing if absent**
(an absent confidence must never be read as a low confidence).

Values actually observed on an AI-enabled instance (2026-08-01): `null` on nearly all entity
suggestions (Classification, FieldSuggestion, Organoleptics), **80** on a
`DocumentReview`, **100** on a document extraction. The `low` bucket has never been produced
by the model.

## 11. Signature — what beCPG really exposes (spec §9.2)

Everything below has been **measured** on the local 26.1.0 instance, task
`workspace://SpacesStore/89e840ed-…` (« Signature de documents »,
project *JUnit SignatureService Project test (8)*).

### 11.1 The geometry is in the PDF, not behind an API

`PDFBoxServiceImpl.prepareForSignature()` computes the rectangles (anchor keyword, or
`fromLeftRatio` / `fromBottomRatio` of the MediaBox, then `index * gap` according to
`direction`) and **writes them into the document**: a `PDSignatureField` plus its
`PDAnnotationWidget`, then `saveIncremental()`. Fixed naming:
`<formattedUsername>-signature` on the signature page, `<formattedUsername>` for the initials
on all the others.

The module's only HTTP surface is
`GET /alfresco/s/becpg/signature/node/{store_type}/{store_id}/{id}/{action}` with
`action ∈ {checkout, create-session, checkin, cancel}` — **none of the four returns any
coordinates**. `prepareForSignature(document, recipients, params)` is only reachable from
Java or jscript (`SignatureScriptHelper`).

⇒ The portal therefore reads the widgets **from the bytes it already serves**
(`lib/pdfSignatureFields.js`, pdf.js server-side). This is neither a guess nor a
recomputation: it is the rectangle PDFBox will fill. No widget → `zones: []` →
**no frame drawn**.

Measured on `cb1c7ba8-…` (a prepared working copy, 2 pages, 200,849 bytes):

| field | page | PDF rect | ⇒ ratio (top-left origin) |
|---|---|---|---|
| `matthieuWF` (initials) | 1 | `[459, 79.2, 559, 114.2]` | x 0.750, y 0.856, w 0.163, h 0.044 |
| `matthieuWF-signature` | 2 | `[367.2, 79.2, 567.2, 154.2]` | x 0.600, y 0.805, w 0.327, h 0.095 |

`x = 0.60` and `0.75` land exactly on the defaults `signatureFromLeftRatio=60` and
`initialsFromLeftRatio=75`; `y` on `fromBottomRatio=10`.

### 11.2 The document to display is **not** `deliverable.contents[0]`

`becpg/project/task` returns, for the signature task:

| source | node | AcroForm |
|---|---|---|
| `deliverable.url` → `artworks-viewer?nodeRef=…` | `cb1c7ba8-…` **working copy** | **yes** |
| `deliverable.contents[0]` (`pjt:dlContent`) | `cce86b34-…` original | no |

Displaying `contents[0]` would amount to showing a document without a single signature field.
**It is the view URL that designates the document to render.**

### 11.3 Three deliverables per document and per task

`SignatureProjectServiceImpl` creates, for each document and each recipient:

| deliverable | `pjt:dlScriptExecOrder` | script |
|---|---|---|
| `… - prepare` | `Pre` | `cm:prepare-signature.js` → `bSign.prepareForSignature` + `getSignatureView` |
| `… - url` | *(none)* | carries the view URL — this is the one the portal reads |
| `… - sign` | `Post` | `cm:sign-document.js` → **`bSign.signDocument()`** |

⇒ **Signing = completing the task.** There is no "sign" webscript to proxy;
`POST /api/v1/signature/{taskId}` proxies `becpg/project/complete/task`, and beCPG runs the
post-deliverable script. Verified: after the POST, the `- sign` deliverable goes to
`Completed` and the project moves on to the next task (`- validate`).

### 11.4 States read, and where

| information | source |
|---|---|
| `sign:status` (`Initialized`/`Prepared`/`ReadyToSign`/`Signed`) | `GET api/metadata?nodeRef=…` on the document |
| `sign:recipientsData` | same — JSON `{recipients:[{username, nodeRef, preparationDate, signatureDate}]}` |
| deliverable / task state | `becpg/project/task` |

Two measured traps:

- `api/metadata/node/{store}/{id}` answers **405** on 26.1: only the form
  `api/metadata?nodeRef=…` works;
- a deleted node answers **`200 {}`**, not 404. After signing, `sign-document.js` **deletes
  the working copy**; without handling that case, the download URL of the "already signed"
  screen would point at a vanished node. The portal then falls back on the original, where the
  signed content has been archived.

### 11.5 Installation prerequisites for signing to actually complete

`PDFBoxServiceImpl.signContent()` signs **offline** (PDFBox + BouncyCastle, `SHA256WithRSA`,
`adbe.pkcs7.detached`) with a key read from the **Alfresco metadata keystore**
(`encryption.keystore.location`). On the local instance that keystore contains only the
`metadata` secret key and `beCPG.signature.keystore.alias` is **empty**: `signDocument()`
fails, the exception is swallowed by the `try/catch` of `sign-document.js`, the task completes
anyway and `sign:status` stays `Prepared`.

To really sign:

```
keytool -genkeypair -alias signature -keyalg RSA -keysize 2048 -sigalg SHA256withRSA \
        -storetype JCEKS -keystore <encryption.keystore.location> \
        -storepass <metadata-keystore.password> -keypass <key password> \
        -ext KeyUsage=digitalSignature,nonRepudiation -ext ExtendedKeyUsage=emailProtection
beCPG.signature.keystore.alias=signature
beCPG.signature.keystore.password=<key password>
beCPG.signature.tsaUrl=https://freetsa.org/tsr,http://timestamp.digicert.com   # product default
```

Done on the local instance on 2026-07-31 (alias `signature`, RSA 2048, self-signed). Check:
the final PDF contains `/ByteRange` and `adbe.pkcs7.detached`, the CMS carries the certificate
(`CN=beCPG Supplier Portal Signature (local test)`), a `signingTime` and an
`id-smime-aa-timeStampToken`, and `sign:status` moves to `Signed`.

⚠️ **Do not empty `beCPG.signature.tsaUrl` thinking you are "removing a network dependency".**
Measured: without timestamping, the cryptographic signature is indeed applied (`/ByteRange` +
`adbe.pkcs7.detached` present) but `updateSignatureInformation()` writes
`recipientJson.put("signatureDate", null)` — org.json then **removes** the key —, so
`allSigned()` returns `false` and **`sign:status` stays `Initialized`**. The document is
signed, beCPG does not declare it signed. The portal is not fooled (it also reads the task
state), but anything querying `sign:status` will be.

⚠️ **Second condition, a silent one: the `sign:preparedRecipients` association.**
`signDocument()` loops over `getTargetAssocs(workingCopy, sign:preparedRecipients)`; if it
is empty, it **signs nothing**, checks in anyway, raises no exception and leaves
`sign:status` unchanged — the task completes, the project moves on, and nothing is signed. That
is the state of most of the local instance's JUnit fixtures (working copies prepared on
2026-07-06 whose association has disappeared). Diagnosis:

```
GET /alfresco/api/-default-/public/alfresco/versions/1/nodes/{workingCopy}/targets
→ must contain assocType "sign:preparedRecipients"
```

### 11.6 A task can carry **several** signable documents

`beCPG/signature/sign-document.js` is a **post-deliverable** script, not post-task: completing
the task runs it **once per deliverable**, and therefore signs every prepared document.
Measured: `workspace://SpacesStore/c928cfab-…` (« Signature de documents ») carries two
deliverables `sample_1.pdf` and `sample_2.pdf`, each with its own prepared working copy.

`GET /api/v1/signature/{taskId}` therefore returns **`documents: [...]`** — one object per
signable deliverable, each with its own `zones`, `pageCount`, `signStatus` and `contentUrl`.
`document` remains the first one, for callers that expect only one.

The screen mounts one viewer per document and the reading gauge **adds up their pages**:
displaying only the first would attest to a reading that did not happen on a document that
would, itself, be signed. Closed deliverables are set aside **only if an open one remains** —
otherwise nothing would be left to display on the "already signed" screen, which is the most
frequent revisit of this journey (#34523).

### 11.7 A signature task names **no** product — measured, and worked around

Measured end to end on the reference instance on 2026-08-03, project
`bb82cde1-…` (« PORTALTEST 35846 Nougat de chez Remi … REFERENCING - 2026 »), task
`4c865b96-…` « Signature de documents » assigned to the test supplier account:

| source | answer for the supplier |
|---|---|
| the 3 deliverables (`- prepare`, `- url`, `- sign`) | all designate **the document**, never the product |
| `becpg/project/task` → `task.entityNodeRef` | `"#access_forbidden"` |
| `becpg/remote/entity?nodeRef=<project>` | **401** |
| `api/task-instances?authority=<supplier>` | the task **is not there** (the signature workflow is not listed for them) — only the `pjt:tlResourcesAssocIndex` source sees it |

⇒ There is **no** path, by association or by property, that links the signature task to the
product for that account. The only readable link is the **hierarchy**:
`SupplierPortalServiceImpl.getOrCreateSupplierDocumentsFolder(entityNodeRef)` creates
« Documents fournisseur » as a direct child of the entity, and
`SignatureProjectHelper.findDocumentsToSign()` only looks in there.

`lib/adapters/tasks.js` therefore walks up from the document to the entity, with
`becpg/remote/entity?nodeRef=…&fields=…&lists=none` (546–720 bytes per node, measured), stopping
at the first ancestor that is neither `cm:`/`sys:`/`st:`/`app:` nor `pjt:` — two hops in this
journey. The starting node is **the original** (`contents[0]`), not the working copy: after
signing, `sign-document.js` deletes the latter, and the record of a closed task must keep
naming its product (verified after signing).

⚠️ Related trap: on the reference instance, `=sys:node-uuid:"<uuid>"` on `becpg/remote/entity/list` returns
**0 results** for a freshly created node, where `ID:"<nodeRef>"` finds it — the opposite
of what the "real-time db-afts" path leads one to hope. The walk above reads the node
directly and therefore depends on no index.
