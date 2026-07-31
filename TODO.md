A corriger : 
▲ Next.js 16.2.12 (Turbopack)
- Local:         http://localhost:3000
- Network:       http://192.168.1.31:3000
- Environments: .env
✓ Ready in 272ms
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead. Learn more: https://nextjs.org/docs/messages/middleware-to-proxy


[browser] Image with src "/theme/default/images/shape.png" was detected as the Largest Contentful Paint (LCP). Please add the `loading="eager"` property if this image is above the fold.
Read more: https://nextjs.org/docs/app/api-reference/components/image#loading


Encountered two children with the same key, `incoRawMaterials`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
http://localhost:3100/api/v1/documents/d3112aa0-6384-4ae4-912a-a063840ae4c5/content?task=0c463cc4-c72c-4829-863c-c4c72c9829f4&download=1 

    
error   
code    "notFound"
message "Document not found in this perimeter"
messageKey  "error.notFound"
details 
document    "workspace://SpacesStore/d3112aa0-6384-4ae4-912a-a063840ae4c5"


Quand je click sur une discussion celle-ci ne s'affiche pas exemple : http://localhost:3100/messages?nodeRef=workspace%3A%2F%2FSpacesStore%2F4280dddb-d39d-4a7a-80dd-dbd39d5a7ac1

 GET /api/v1/notifications?limit=20 200 in 362ms (next.js: 2ms, proxy.ts: 4ms, application-code: 356ms)
{"ts":"2026-07-31T08:53:45.522Z","level":"debug","event":"upstream.request","label":"becpg","method":"POST","url":"https://dev.becpg.fr/alfresco/s/api/node/workspace/SpacesStore/758f899e-c492-4793-b8fc-f8a8fceb7e3f/comments?format=json&alf_ticket=***","attempt":0}
{"ts":"2026-07-31T08:53:45.729Z","level":"warn","event":"upstream.response","label":"becpg","method":"POST","url":"https://dev.becpg.fr/alfresco/s/api/node/workspace/SpacesStore/758f899e-c492-4793-b8fc-f8a8fceb7e3f/comments?format=json&alf_ticket=***","status":500,"duration":207,"attempt":0}
{"event":"api.error","code":"upstream","status":502,"message":"063115324 Wrapped Exception (with status template): 0631136696 Access refusé. Vous n'avez pas la permission de réaliser cette opération.","route":"messages","method":"POST"} 
 POST /api/v1/messages 502 in 224ms (next.js: 3ms, proxy.ts: 4ms, application-code: 217ms)
{"ts":"2026-07-31T08:53:51.289Z","level":"debug","event":"upstream.request","label":"becpg","method":"GET","url":"https://dev.becpg.fr/alfresco/s/becpg/remote/entity/list?format=json&query=TYPE%3A%22bcpg%3Asupplier%22&fields=bcpg%3Acode&maxResults=1000&alf_ticket=***","attempt":0}
{"ts":"2026-07-31T08:53:51.458Z","level":"debug","event":"upstream.response","label":"becpg","method":"GET","url":"https://dev.becpg.fr/alfresco/s/becpg/remote/entity/list?format=json&query=TYPE%3A%22bcpg%3Asupplier%22&fields=bcpg%3Acode&maxResults=1000&alf_ticket=***","status":200,"duration":169,"attempt":0}

PB de droit ne pas affihcer envoyer sur les discussions ou on a pas les perm (pas en cours de référencement)
