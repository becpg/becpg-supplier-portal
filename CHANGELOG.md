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
## [ 0.0.11 ] - 2026-08-07 15:32:33

* InProgress #35846 - [Cleanup] Record the round: the AI now goes through beCPG, and the OLAP diagnosis was wrong on both counts
* InProgress #35846 - [Feature] Explain specifications against catalogues in the help, and pin the round's defects with an E2E case each
* InProgress #35846 - [Bug] Stop the broken tenant logo on the sign-in card and let sign-out survive an unregistered post-logout URI
* InProgress #35846 - [Feature] Ask beCPG for the AI suggestions instead of calling becpg-ai, and say when the analysis is still running
* InProgress #35846 - [Feature] Mark the steps whose mandatory answers are missing and gate Terminer on what really blocks
* InProgress #35846 - [Bug] Resolve an autocomplete field from the wizard definitions instead of a source that answers no columns
* InProgress #35846 - [Feature] Open a campaign from the pilotage and let a non-conformity be read
* InProgress #35846 - [Bug] Send an internal account to the monitoring space, give it its tasks and stop addressing it as a supplier
* InProgress #35846 - [Cleanup] Bring the status document up to date and correct two claims the docs had outlived
* InProgress #33085 - [Feature] Specify mandatory languages as a catalog requirement rather than a portal setting
* [skip ci][Release]: Bump _VERSION to 0.0.11
## [ 0.0.12 ] - 2026-08-10 17:01:12

* InProgress #35846 - [Cleanup] Correct the post-logout diagnosis: the production URI is registered, the local one is not
* [skip ci][Release]: Bump _VERSION to 0.0.12
## [ 0.0.13 ] - 2026-08-12 09:31:56

* InProgress #35846 - [Cleanup] Record the 11/08 round and what it left open
* Fix #35846 - [Bug] Write multilingual values through the endpoint that builds an MLText
* InProgress #35846 - [Bug] Read the wizard catalogue from the deliverable URL, as Share does
* InProgress #35846 - [Feature] Ask for the wizard's own catalogue, without hiding the customer's
* InProgress #35846 - [Feature] Resolve the task and its wizard together instead of one after the other
* InProgress #33085 - [Feature] Take the entry languages from the wizard catalogue, or from the repository's own locales
* Fix #35846 - [Bug] Recognise the technical sheet on the field that actually carries the type label
* InProgress #35846 - [Bug] Stop serialising the two independent reads a single task needs
* InProgress #35846 - [Feature] Scope the task list on the supplier chosen in the toolbar, and say which one it is
* InProgress #35846 - [Cleanup] Retract the OLAP diagnosis: the cube answers, it was the account it was asked under
* [skip ci][Release]: Bump _VERSION to 0.0.13
## [ 0.0.14 ] - 2026-08-13 16:17:15

* InProgress #35696 - [Feature] Add document viewer and task completion on the already-signed card
* [Cleanup] Require English in the source and add the coding conventions, with CLAUDE.md and GEMINI.md as symlinks
* [Cleanup] Record the three security findings of the 26.1.0.22 review in the TODO
* Fix #35846 - [Feature] Show the supplier why their sheet came back, from the comment the engine leaves on their task
* InProgress #35846 - [Cleanup] Say what actually feeds the refusals of a task, and what does not
* Fix #35846 - [Feature] Let a reviewer read the task document instead of downloading it
* Fix #35846 - [Bug] Refuse through the workflow so the reason reaches the supplier, and require it
* Fix #35846 - [Bug] Read the refusals from the project task list, and drop the remarks section that duplicated the discussion
* Fix #35846 - [Bug] Stop draft mode from allowing an incomplete sheet to be submitted
* Fix #35846 - [Bug] Send the supplier-portal site so Share can resolve portal-specific grid columns
* Fix #35846 - [Bug] Gate the finish on the deliverable catalogue as Share does, and stop showing raw HTML in the AI hints
* Fix #35846 - [Bug] Stop the browser cutting an AI run the server still allows, drop "Ignorer", tighten the technical sheet block
* InProgress #35846 - [Cleanup] Reword the empty suggestions state, which pointed at a step that no longer exists
* Fix #35846 - [Bug] Hide "Appliquer" on a suggestion that has nothing to write
* Fix #35846 - [Feature] Scope the AI suggestions to the open step and move the technical sheet into the context panel
* Fix #35846 - [Bug] Drop the content of style and script blocks when rendering stored HTML as text
* InProgress #35846 - [Cleanup] Stop repeating a suggestion in qnames under its own readable body
* Fix #35846 - [Feature] Drop the confidence badges and auto-application, render each suggestion by its becpg-ai type
* InProgress #35846 - [Cleanup] Tighten the suggestion card when it renders in the narrow context panel
* Fix #35846 - [Feature] Move the AI suggestions into the context panel, recompute them on each step, drop "Aller au champ"
* Fix #35846 - [Bug] Enrich the whole task scan under a supplier scope, so its tasks are not truncated away
* Fix #35846 - [Bug] Scope the dashboard tasks by their product, not by an enrichment only twelve of them get
* Fix #35846 - [Bug] Recover multilingual values stored as text and show which discussions carry messages
* Fix #35846 - [Bug] Unfreeze the wizard step body and scope the dashboard to the selected supplier
* Fix #35846 - [Bug] Keep the nav counters when leaving the screen that computed them
* Fix #35846 - [Bug] Decide the completeness catalogue fallback once for the dashboard, not once per product
* Fix #35846 - [Bug] Count the documents the dashboard was missing, scope its completeness to the portal catalogues, and mark unread discussions
* InProgress #35846 - [Feature] Drop from the product list the associations it never shows
* Fix #35846 - [Feature] Build the wizard state once per session instead of once per tab
* InProgress #35846 - [Feature] Ask once whether the supplier holds the task, not on every step
* Fix #35846 - [Bug] Stop refetching the wizard the task route just resolved
* Fix #35846 - [Bug] Tell the three English locales apart, and land on the list a suggestion is about
* Fix #35846 - [Bug] Stop dumping the AI's HTML and JSON on the suggestion cards, and never apply one without a click
* InProgress #35846 - [Cleanup] State what the portal deployment really is, not what I assumed
* InProgress #35846 - [Setup] Add a fast deploy for the portal, and say that its only target is production
* Fix #35846 - [Bug] Make the monitoring refresh button say that it is working
* Fix #35846 - [Bug] Read the requirement list under the key the endpoint actually returns
* Fix #35846 - [Bug] Show the supplier the catalogues that are his, not only score them
* [skip ci][Release]: Bump _VERSION to 0.0.14
## [ 0.0.15 ] - 2026-08-18 17:32:02

* Fix #35846 - [Bug] Keep the brand ink on a coloured row while it passes AA and fall back to black or white below it
* Fix #35846 - [Bug] Write a coloured row with an ink chosen against its background, a customer colour being validated for nothing else
* [Cleanup] Translate the remaining French comments in the read-only multilingual control, the campaign dialog and the monitor adapter
* Fix #35846 - [Cleanup] Drop the model qnames from the monitoring wording, which name nothing to the user reading them
* InProgress #35846 - [Bug] Start a supplier project through the process everywhere, the send-to-supplier webscript being gone from beCPG
* InProgress #35846 - [Bug] Wait as long as beCPG asks when its remote API throttles the portal
* InProgress #35846 - [Feature] Start a referencing campaign from the monitoring space, on a supplier, its whole park or one product
* InProgress #35846 - [Feature] Show every translation on the read-only sheet, and let a reviewer expand and tick section by section
* InProgress #35846 - [Feature] Score the park on the portal catalogues, serve monitoring figures while they refresh, and keep the matrix to the types the portal expects
* InProgress #35846 - [Feature] Put the fields a catalogue is missing before the catalogue's own name
* [Cleanup] Say what a monitoring screen means instead of quoting the specification
* InProgress #35846 - [Bug] Stop the notification bell from scanning every task for a result it throws away
* InProgress #35846 - [Bug] Do not mark a step checked when the supplier only walked past it
* InProgress #35846 - [Bug] Stop the allergen source picker from searching the whole repository, and cap the wait
* InProgress #35846 - [Feature] Restore the colour a customer paints a list row with, in the grids and in the questionnaire
* [Cleanup] Bring the help back in line with the assistant, the documents and the discussion as they now work
* InProgress #35846 - [Feature] Ask Share for the field control, so a datagrid picker knows its datasource
* InProgress #35846 - [Feature] Keep the marks a customer writes his questions with, without ever rendering HTML
* [Setup] Prepare the open source publication - English sources, generic comments and public repository files
* Fix #33085 - [Feature] Read the supplier input languages from the catalogue and mark the required ones
* [skip ci][Release]: Bump _VERSION to 0.0.15
## [ 0.0.16 ] - 2026-08-19 11:54:13

* Fix #35846 - [Cleanup] Assert the header names the tenant the session reports, not one instance's name
* Fix #35846 - [Bug] Correct the twenty-six defects an adversarial review confirmed in this batch, the multilingual write path first
* Fix #35846 - [Cleanup] Pin the two readings this recette got wrong: the locale map of a d:mltext, and which tab a catalogue gap belongs to
* Fix #35846 - [Feature] Offer the row editor Share has, so a supplier can set the fields the grid does not show - the parent of an ingredient first
* Fix #35846 - [Feature] Mark in the rail the tabs a catalogue reports incomplete, once the conformity analysis has run
* Fix #35846 - [Bug] Name the list a remark came from, so a comment written in beCPG stops arriving in the sheet-wide view with no origin
* Fix #35846 - [Bug] Read the model default of a column, so a boolean beCPG already answers is a box to tick and not a question to answer
* Fix #35846 - [Bug] Rule on every step server-side, so a reopened task keeps its verdicts and Documents stops going green with a mandatory file missing
* Fix #35846 - [Bug] Stop promising a save that already happened, and stop confirming a questionnaire answer beCPG stored nowhere
* Fix #35846 - [Bug] Keep every translation a supplier types, which the form step wrote in one language and read back in another
* Fix #35846 - [Bug] Formulate on leaving a step the supplier wrote on, so beCPG still materialises the documents it requires
* [Cleanup] Write the step-verdict comment in English, as every comment in this repository is
* [skip ci][Release]: Bump _VERSION to 0.0.16
## [ 0.0.17 ] - 2026-08-25 15:23:55

* [Setup] Remove replica
* Fix #35846 - [Feature] Declare the read-only wizard that lets a supplier consult a product specification
* Fix #35846 - [Bug] Print a date extracted by the AI as a date, not as a timestamp
* Fix #35846 - [Bug] Ask beCPG for the language the supplier chose in the portal, not the browser's
* Fix #35846 - [Bug] Hold back a datalist row whose edit empties a mandatory column
* Fix #35846 - [Cleanup] Show a document once: the folder listing folds into the requirement check-list
* Fix #35846 - [Cleanup] Drop the context panel's repeated sections and its nested boxes
* Fix #35846 - [Feature] Let the navigation sidebar fold to its icons, and remember it
* Fix #35846 - [Feature] Replace the wizard step ordinal with the sections left to complete, and fold the rail
* Fix #35846 - [Cleanup] Drop the per-supplier pricing claim from the README, the enterprise edition is licensed
* Fix #35846 - [Cleanup] Make the public README a showcase: screenshots, comparison, architecture and security moved to doc/architecture.md
* Fix #35846 - [Cleanup] Tell a GitHub reader which paths of AGENTS.md live only in the private repository
* Fix #35846 - [Bug] Check out main before stripping, the mirror was exported from the empty master branch
* Fix #35846 - [Bug] Route the three checks the portal catalogues shipped before they named their list, so the tab is marked without re-importing the file
* Fix #35846 - [Bug] Correct the eight defects of the 21/08 recette: the invisible quantity, the row editor, the marks that did not survive, and the formulation that ran beside the write
* [skip ci][Release]: Bump _VERSION to 0.0.17
## [ 0.0.18 ] - 2026-09-01 12:33:06

* Fix #36246 - [Bug] Leave the portal base URL empty in the cell so each host builds its own callback
* Fix #36246 - [Bug] Build the portal redirect URLs with its base path, and probe the health route under it
* [Feature] Serve the app under /<path> of each instance host in the cell
* [Setup] Deploy every release into the becpg-dev cell of becpg-test1
* InProgress #35846 - [Bug] Trim the empty space around the signature so it fills its box
* InProgress #35846 - [Feature] Capture the initials as initials, not as a second signature
* InProgress #35846 - [Feature] Stamp the supplier's signature and initials into the prepared PDF
* InProgress #35846 - [Bug] Ship the pdf.js worker in the standalone image
* Fix #35846 - [Bug] Draw the signature zones again: pdf.js could not load without a canvas polyfill
* InProgress #35846 - [Bug] Paint the dashboard skeleton immediately instead of waiting for beCPG
* InProgress #35846 - [Bug] Reload the step and the panel when a suggestion is applied
* InProgress #35846 - [Bug] Show the value an AI suggestion replaces
* InProgress #35846 - [Bug] Stop truncating the field name of a suggested value
* InProgress #35718 - [Feature] Render the extraction rows becpg-ai flags as not applicable
* InProgress #35846 - [Bug] Fix the AI suggestion panel: re-run feedback, stale applied state, formulation before the documents step, review rendering and expandable lists
* Fix #24931 - [Bug] Read the supplier axis and the native refusal rate, both now deployed in the cube
* [Cleanup] Reword the README headings and intro for clarity
* [Bug] Send the open step's list to becpg-ai instead of a portal-side allow list
* [skip ci][Release]: Bump _VERSION to 0.0.18
## [ 0.0.19 ] - 2026-09-01 15:04:10

* Fix #36292 - [Bug] Build the portal on the default machine, the regional pool leaves E2_HIGHCPU_8 pending forever
* [skip ci][Release]: Bump _VERSION to 0.0.19
## [ 0.0.20 ] - 2026-09-02 12:02:44

* Fix #36246 - [Bug] Prefix the paths Next does not: form action, image sources and metadata URLs
* [skip ci][Release]: Bump _VERSION to 0.0.20
