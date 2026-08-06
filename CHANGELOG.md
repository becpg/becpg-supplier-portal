## [ 0.0.1 ] - 2026-08-04 16:48:41

* InProgress #35846 - [Feature] Derive the OIDC client from the tenant instance, so each instance carries its own becpg_instance claim
* InProgress #35846 - [Bug] Bring the logo link and the checkbox row to the 44px touch target on phones
* InProgress #35846 - [Bug] Fix the OLAP queries against the real cube, and stop deriving figures from formatted numbers
* InProgress #35846 - [Feature] Serve the historical series through beCPG's OLAP proxy, with server-built MDX and no OLAP URL
* InProgress #35846 - [Cleanup] Record that documents stay out of OLAP, and report per-axis what the cube actually serves
* InProgress #35846 - [Feature] List the files actually deposited on an entity, so the signed sheet stops being invisible
* InProgress #35846 - [Bug] Discover the supplier referencing templates with a search the repository actually answers
* InProgress #35846 - [Bug] Resolve the entity of a task with no deliverable, offer Terminer/Refuser outside the wizard, and restore the config cache helpers
* InProgress #35846 - [Cleanup] Keep the five-minute configuration cache with an explicit flush instead of expecting a version endpoint from beCPG
* InProgress #35846 - [Cleanup] Record what the consolidation round re-measured, what it requalified and everything that lives on dev
* InProgress #35846 - [Bug] Say on the product screen that a reference the account may not read is hiding fields, instead of producing a flag nobody consumes
* InProgress #35846 - [Feature] Page the discussion subjects for real, stop re-resolving task entities a third time, and key the wizard config cache on a configuration version
* InProgress #35846 - [Bug] Give a multilingual and a multi-value column the grid's own row, and hand Enter back to the buttons it was stealing it from
* InProgress #35846 - [Bug] Make the monitoring figures agree with each other: one risk score, park-scoped campaign counters, truncation flags that only fire on truncation
* InProgress #35846 - [Bug] Resolve d:noderef labels from the property beCPG really carries, and keep an unreadable reference from taking the whole product down
* InProgress #35846 - [Feature] Say which product a signature task is about, on the signature screen itself
* InProgress #35846 - [Bug] Name the product on a signature task by climbing from its document, and stop answering a refusal as a network failure
* InProgress #35846 - [Bug] Resolve the supplier hierarchy labels on the monitoring screens instead of showing node identifiers
* InProgress #35846 - [Bug] Resolve a d:noderef property to its label instead of printing the node identifier
* InProgress #35846 - [Cleanup] Update the ticket notes
* InProgress #35846 - [Feature] Spell out what the suggestion channel means for a cross-tenant reuse
* InProgress #35846 - [Feature] Design the cross-tenant raw material reuse in the spec
* InProgress #35846 - [Feature] Scope the product list on the selected supplier record, with an explicit way back to all of them
* InProgress #35846 - [Feature] Let the supplier consult a cahier des charges and the documents deposited on it
* InProgress #35846 - [Feature] Show that a product sheet is the referencing branch of a validated version, and link that version when it is readable
* InProgress #35846 - [Feature] Let a contact switch between its supplier records, and ground AI suggestions in the deposited documents
* InProgress #35846 - [Bug] Run the step's declared webscript on navigation and indent the composition and packaging lists like Share
* InProgress #35846 - [Bug] List only the cahiers des charges the supplier can open, and read them in two calls instead of one per product
* InProgress #35846 - [Bug] Hide lost-and-found debris from the listings and render comment bodies as text instead of raw HTML
* InProgress #35846 - [Fix] Escape the NUL key separators so the datalist editor stops being a binary file, and rewrite the status doc from live measurements
* InProgress #35846 - [Feature] Make datalist entry keyboard-first and give the grid the width it needs
* InProgress #35846 - [Bug] Let the discussions grid shrink so an unresolved subject title stops scrolling the page sideways at 360px
* InProgress #35846 - [Bug] Stop counting becpg-ai's no-suggestion marker as a suggestion
* InProgress #35846 - [Bug] Give a suggestion run the time it needs and stop replaying it three times on a slow answer
* InProgress #35846 - [Bug] Monitor quality: draw the NC tiles from the population the list shows instead of three unscoped counts, and render scope.empty
* InProgress #35846 - [Bug] Encode the entity id in the survey step calls so the questionnaire loads and saves on the task route
* InProgress #35846 - [Bug] Stop sending X-BecPG-Instance with the OIDC bearer, which made every becpg-ai call anonymous
* InProgress #35846 - [Bug] Monitor: never publish a compliance rate its inputs cannot justify, chunk the park scope instead of running unscoped, and render scope.empty
* InProgress #35846 - [Bug] Seed the session from the server layout so the shell is signed in on the first paint after login
* InProgress #35846 - [Feature] Share grid density, charact icons in cells, decision-tree answer gates and tab/bell contrast
* InProgress #35846 - [Fix] Resolve task entity names on the real-time db-afts path, with an index-path retry
* InProgress #35846 - [Bug] Monitor overview: derive the approval breakdown from the scanned park, not a second window
* InProgress #35846 - [Feature] Decision tree view, notification scoping, tab overflow, list icons and bell contrast
* InProgress #35846 - [Feature] Decision-tree questionnaire model, monitor counters and process template discovery
* InProgress #35846 - [Fix] Signature download, discussion deep link, comment write gate, proxy migration, LCP and catalogue keys
* InProgress #35846 - [Feature] Port Share datalist column renderers: labelled nutrient values, formulated values, percentages and states
* InProgress #35846 - [Feature] Portail fournisseur V2 : app Next.js, proxy beCPG, wizard, pilotage et tests E2E
* InProgress #35846 - [Feature] Portail fournisseur V2 : app Next.js, proxy beCPG, wizard, pilotage et tests E2E
## [ 0.0.2 ] - 2026-08-04 17:48:49

* InProgress #35846 - [Bug] Show every configured tenant on the login page, and ask an out-of-scope project once instead of on every load
* InProgress #35846 - [Bug] Stop announcing a beCPG error as a lost connection, and say which one it is
* InProgress #35846 - [Cleanup] Move the portal network policy to the cluster manifest and use the core backend config
* InProgress #35846 - [Bug] Ship the NetworkPolicy the portal needs: default-deny-all was hiding it from the health checker
* [skip ci][Release]: Bump _VERSION to 0.0.2
## [ 0.0.3 ] - 2026-08-05 08:01:04

* InProgress #35846 - [Bug] Rebuild the documents columns when the language changes
* InProgress #35846 - [Cleanup] Stop asking beCPG for fields a row already carries, which quadrupled the cost
* InProgress #35846 - [Security] Serve the security headers the public portal answered without
* InProgress #35846 - [Bug] Render the modification dates the API already served: risk cards, documents column, dead label removed
* InProgress #35846 - [Bug] Read the doclib2 date and person shapes, which are objects and not strings
* [skip ci][Release]: Bump _VERSION to 0.0.3
## [ 0.0.4 ] - 2026-08-05 17:17:49

* InProgress #35846 - [Feature] Open the wizard with the technical sheet instead of documents whose types are not computed yet
* InProgress #35846 - [Bug] Answer null when nobody asked beCPG whether the user holds a task
* InProgress #35846 - [Feature] Sign the e2e suite in through the real OIDC flow when the portal has no dev shortcut
* InProgress #35846 - [Cleanup] Rewrite the questionnaire suite against the decision tree and assert the three closed gaps
* InProgress #35846 - [Cleanup] Give the screen sweep a budget proportional to the number of screens it walks
* InProgress #35846 - [Bug] Load pdf.js client-side only so a page carrying the viewer stops answering 500
* InProgress #35846 - [Bug] Stop offering a wizard tab whose datalist the entity does not carry
* InProgress #35846 - [Cleanup] Start the referencing through the portal now that the route works, and keep the journey re-runnable
* InProgress #35846 - [Cleanup] Name the real cause when the supplier portal is not the one under test, and correct the survey step contract
* InProgress #35846 - [Bug] Floor the day count in the display zone so an expiry is not announced a day early
* InProgress #35846 - [Bug] Stop showing the raw type qname and drop the two tabs that ask nothing on a specification
* InProgress #35846 - [Feature] Let a supplier read a deposited document without leaving the portal
* InProgress #35846 - [Security] Refuse catalogs and documents of an entity the caller may not read
* InProgress #35846 - [Bug] Only offer to download a specification that actually carries content
* [skip ci][Release]: Bump _VERSION to 0.0.4
## [ 0.0.5 ] - 2026-08-06 08:11:29

* InProgress #35846 - [Bug] Do not re-derive suppliers from tasks when the groups already answered
* InProgress #35846 - [Bug] Stop listing fifty tasks to resolve suppliers the groups already name
* [skip ci][Release]: Bump _VERSION to 0.0.5
## [ 0.0.6 ] - 2026-08-06 08:31:31

* InProgress #35846 - [Bug] Enrich only the tasks the dashboard shows instead of one call per task
* InProgress #35846 - [Bug] Fetch the dashboard park with the five attributes it shows, not thirteen
* [skip ci][Release]: Bump _VERSION to 0.0.6
## [ 0.0.7 ] - 2026-08-06 09:18:34

* InProgress #35846 - [Cleanup] A supplier is defined by its group, so stop deriving one from its tasks
* [skip ci][Release]: Bump _VERSION to 0.0.7
## [ 0.0.8 ] - 2026-08-06 11:30:20

* InProgress #35846 - [Bug] Offer the processes the launcher can actually start, name the real reason a history is missing, and open the rows the monitor lists
* InProgress #35846 - [Cleanup] Repair the specs the wizard reordering and the questionnaire rewrite invalidated
* [skip ci][Release]: Bump _VERSION to 0.0.8
## [ 0.0.9 ] - 2026-08-06 12:05:31

* InProgress #35846 - [Bug] Send an internal user to the monitoring space and stop judging the approval of someone who is not a supplier
* [skip ci][Release]: Bump _VERSION to 0.0.9
## [ 0.0.10 ] - 2026-08-06 14:57:03

* InProgress #35846 - [Cleanup] Run the datalist spec anywhere, and state the fixture its assertions need
* InProgress #35846 - [Cleanup] Make the wizard spec runnable against dev, and stop asserting one instance's configuration
* [skip ci][Release]: Bump _VERSION to 0.0.10
