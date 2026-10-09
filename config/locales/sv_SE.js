/**
 * Swedish translation of the portal chrome.
 *
 * Generated from the inline French and English labels (`npm run i18n:extract`),
 * then translated. Keys mirror the English source; a key missing here reads
 * English. Edit translations here, and the source labels in their components.
 */
const LOCALE = {
    "app/(home)/page#LOCAL": {
        "state": "Min akt",
        "detail": "Att göra"
    },
    "app/company/page#LABELS": {
        "title": "Mitt företag",
        "noSupplier": "Ingen leverantörspost",
        "noSupplierHint": "Ditt konto är inte kopplat till någon leverantör. Kontakta din kundrepresentant.",
        "approval": "Godkännandestatus",
        "approvalHint": "Beräknas i realtid utifrån dina dokument, projekt och avvikelser.",
        "reasons": {
            "documentExpired": "Ett obligatoriskt dokument har gått ut",
            "documentExpiring": "Ett obligatoriskt dokument går snart ut",
            "documentMissing": "Ett obligatoriskt dokument har inte lämnats in",
            "blockingNc": "En blockerande avvikelse är öppen",
            "openProject": "Ett listningsprojekt pågår",
            "blockingCatalog": "En blockerande katalog är inte uppfylld"
        },
        "metrics": {
            "documentsExpired": "Utgångna dokument",
            "documentsExpiring": "Dokument som snart går ut",
            "documentsMissing": "Saknade dokument",
            "openNc": "Öppna NC",
            "openProjects": "Öppna projekt"
        },
        "sections": {
            "identity": "Identitet",
            "surveyList": "Frågeformulär",
            "contactList": "Kontakter",
            "plant": "Anläggningar",
            "certification": "Certifieringar",
            "documents": "Dokument",
            "specs": "Specifikationer"
        },
        "frozen": "Listan har validerats av kunden — skrivskyddad",
        "emptyList": "Ingen rad",
        "emptyListHint": "Det här avsnittet har inte fyllts i ännu.",
        "questionnaire": "{done} / {total} frågor besvarade",
        "noProperties": "Inga egenskaper att visa",
        "yes": "Ja",
        "no": "Nej",
        "code": "Kod",
        "request": "Begär en uppdatering"
    },
    "app/documents/page#LABELS": {
        "title": "Mina dokument",
        "tabRequirements": "Krav",
        "tabAll": "Alla dokument",
        "tabSigned": "Signerade",
        "deposit": "Ladda upp ett dokument",
        "depositTitle": "Ladda upp ett dokument",
        "depositHint": "Välj den produkt dokumentet hör till och släpp sedan filen. Typ och giltighet härleds av beCPG.",
        "entity": "Tillhörande produkt",
        "chooseEntity": "Välj en produkt…",
        "filters": {
            "open": "Att hantera",
            "blocking": "Blockerande",
            "expiring": "Går snart ut",
            "done": "Inlämnade",
            "all": "Alla"
        },
        "stats": {
            "toProvide": "Att lämna in",
            "expired": "Utgångna",
            "expiring": "Går ut < {days} d",
            "compliance": "Dokumentefterlevnad",
            "mandatory": "{done} / {total} obligatoriska",
            "noScope": "inget omfång att utvärdera"
        },
        "search": "Sök ett dokument",
        "noMatch": "Inget dokument matchar filtret",
        "noMatchHint": "Prova ”Alla” för att se samtliga dokument.",
        "columns": {
            "document": "Dokument",
            "entity": "Produkt",
            "status": "Status",
            "validity": "Giltighet",
            "modified": "Ändrad",
            "ai": "AI-granskning",
            "actions": ""
        },
        "download": "Ladda ned",
        "noFile": "Inte inlämnat ännu",
        "blockingBanner": "{count} obligatoriska dokument hindrar ditt godkännande. De ligger överst i listan.",
        "scopeEmpty": "Ditt konto är inte kopplat till någon leverantör, så inga dokumentkrav kan beräknas. Räknarna ovan är tomma, inte uppfyllda. Kontakta din kundrepresentant."
    },
    "app/error#LABELS": {
        "title": "Sidan kunde inte visas",
        "message": "Ett tekniskt fel uppstod vid visningen. Det du har angett går inte förlorat: det sparas löpande.",
        "retry": "Försök igen",
        "home": "Tillbaka till startsidan",
        "reference": "Referens att uppge för supporten"
    },
    "app/global-error#LABELS": {
        "title": "Portalen kunde inte starta",
        "message": "Ett tekniskt fel hindrar portalen från att visas. Försök igen; om felet kvarstår, kontakta din beCPG-kontakt och uppge referensen nedan.",
        "retry": "Försök igen",
        "reference": "Referens"
    },
    "app/help/page#LABELS": {
        "title": "Hjälp",
        "subtitle": "Så fungerar portalen, steg för steg",
        "scope": "beCPG leverantörsportal",
        "search": "Sök i hjälpen",
        "expandAll": "Visa alla",
        "collapseAll": "Dölj alla",
        "topics": "Innehåll",
        "noResult": "Inget ämne matchar",
        "noResultHint": "Prova ett annat ord: ”dokument”, ”signatur”, ”steg”, ”godkännande”.",
        "anchor": "Länk till det här ämnet",
        "anchorCopied": "Länken har kopierats",
        "goTo": "Gå till",
        "monitorNotice": "Den här hjälpen beskriver leverantörsvyn: de skärmar dina leverantörer ser, där ”din kund” avser ditt eget företag. Uppföljningsytan är inte dokumenterad ännu."
    },
    "app/help/page#TOPICS": [
        {
            "id": "start",
            "icon": "flag",
            "title": "Var börjar jag",
            "summary": "Översikten besvarar en enda fråga: vad förväntas av dig, och när.",
            "blocks": [
                {
                    "p": "Allt börjar på översikten. De fyra korten högst upp sammanfattar din akt hos den här kunden:"
                },
                {
                    "ul": [
                        "**Godkännandestatus** — Godkänd, Pågår, Ska förnyas eller Avstängd, med giltighetsdatum.",
                        "**Fullständighet** — andelen förväntade fält som redan är ifyllda i dina blad.",
                        "**Åtgärder som krävs** — hur många uppgifter som är öppna och hur många som är försenade.",
                        "**Dokument** — hur många som är giltiga, hur många som snart går ut och hur många som saknas."
                    ]
                },
                {
                    "p": "Under dem finns detaljerna i listorna: dina uppgifter, dina produkter, dina dokument, dina diskussioner och dina aviseringar. Klockan i sidhuvudet visar samma aviseringslista från vilken skärm som helst."
                },
                {
                    "note": "Ett konto kan arbeta för flera beCPG-kunder, med en portal per kund. Kundens logotyp och namn visas alltid uppe till vänster: det är så du ser vilken akt du befinner dig i."
                },
                {
                    "warn": "Om en banderoll ”TEST-instans” visas befinner du dig i en testmiljö: inget du anger där är avtalsmässigt bindande."
                },
                {
                    "links": [
                        {
                            "href": "/",
                            "icon": "dashboard",
                            "label": "Översikt"
                        },
                        {
                            "href": "/tasks",
                            "icon": "assignment_turned_in",
                            "label": "Mina uppgifter"
                        },
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "Mina dokument"
                        }
                    ]
                }
            ]
        },
        {
            "id": "tasks",
            "icon": "assignment_turned_in",
            "title": "Så fungerar en listningsuppgift",
            "summary": "En uppgift kommer från ett projekt som kunden har öppnat. Dess typ avgör vilken skärm du hamnar på.",
            "blocks": [
                {
                    "p": "Din kund öppnar ett listningsprojekt, och projektet skickar uppgifter till dig. En uppgift har en titel, den berörda produkten, ett förfallodatum och en typ. Klickar du på en uppgift kommer du direkt till skärmen där den slutförs — det finns ingen mellansida."
                },
                {
                    "ul": [
                        "**Guide** — vägledd inmatning av ett produktblad eller ditt leverantörsblad.",
                        "**Signatur** — läsning av ett PDF-dokument och därefter signering.",
                        "**Dokument** — uppladdning eller förnyelse av ett förväntat dokument.",
                        "**Granskning** — genomläsning av en produkt, utan något att fylla i."
                    ]
                },
                {
                    "p": "En uppgift som är Planerad eller Pågår väntar på dig. En Avvisad uppgift har skickats tillbaka av kunden med en motivering: läs kommentaren innan du skickar in igen. En Slutförd uppgift kräver inget mer."
                },
                {
                    "p": "En uppgift vars förfallodatum har passerats markeras som försenad, både i listan och i aviseringarna. Efter mer än sju dagars försening blir den röd."
                },
                {
                    "note": "Du kan öppna och lämna en uppgift så ofta du behöver: den förblir öppen tills du själv slutför den, och inget går förlorat mellan två besök."
                },
                {
                    "links": [
                        {
                            "href": "/tasks",
                            "icon": "assignment_turned_in",
                            "label": "Mina uppgifter"
                        }
                    ]
                }
            ]
        },
        {
            "id": "wizard",
            "icon": "auto_stories",
            "title": "Ordningen på guidens steg",
            "summary": "Tekniskt datablad i sidhuvudet, en permanent Kontext-panel, kundens avsnitt och sist efterlevnad.",
            "blocks": [
                {
                    "p": "Guiden följer alltid samma ordning. Den är ingen tunnel: så snart ett steg har besökts kan du fritt gå tillbaka till det."
                },
                {
                    "ol": [
                        "**Sidhuvud · Tekniskt datablad** — det första som förväntas av dig. Så länge det saknas visas en röd list ovanför varje steg; när det har laddats upp återstår en rad med dess datum och giltighet. Det är dokumentet som AI läser för att föreslå värden: utan det finns inget att läsa. Om kunden inte har konfigurerat någon sådan dokumenttyp visas listen inte alls.",
                        "**Steg 0 · Kontext** — en panel som alltid är synlig och som blir ett blad ett tryck bort på en mobil. Den innehåller AI-förslagen, den tillämpliga specifikationen, de listor kunden redan har validerat och tidigare avvisningar. Du går aldrig igenom den: den finns där oavsett vilket steg du befinner dig på.",
                        "**Kundens avsnitt** — egenskaper, frågeformulär, ingredienser, näringsämnen, allergener, fysikalisk-kemiska data, påståenden, mikrobiologi, organoleptik, förpackningsmaterial, dokument… Vilka avsnitt som visas, och i vilken ordning, beror på kundens konfiguration och produkttypen: portalen väljer dem inte.",
                        "**Dokument** — steget behåller den plats kunden har gett det, oftast mot slutet. Det är avsiktligt: beCPG härleder de förväntade dokumenten från det du har angett (ett påstående ”GMO-fri” kräver motsvarande intyg), så om frågan ställdes för tidigt skulle listan vara tom eller fel. Endast det tekniska databladet förväntas i samtliga fall, och det finns i sidhuvudet.",
                        "**Efterlevnad** — listan över fält som fortfarande saknas, var och en klickbar för att gå direkt dit, samt ifyllnadspoängen. Om kunden har definierat en blockerande kontroll förblir slutförandet otillgängligt tills den är uppfylld."
                    ]
                },
                {
                    "note": "Varje avsnitt sparas automatiskt, utan någon knapp att trycka på. Indikatorn ”Sparat kl. HH:MM”, längst ned i guiden bredvid navigeringsknapparna, bekräftar det — och du fortsätter exakt där du var om du stänger portalen, byter enhet eller tappar nätverket."
                },
                {
                    "p": "Mellan vissa steg räknas ditt blad om (allergener, näringsämnen, kostnader…). Beräkningen körs i bakgrunden och blockerar dig aldrig: du kan fortsätta skriva medan den pågår."
                },
                {
                    "p": "På en bred skärm döljer ”Bredda inmatningsytan” sidopanelerna och reducerar steglistan till ikoner, för breda tabeller. Valet sparas från ett blad till nästa; panelerna finns kvar ett klick bort, via ikonerna i sidhuvudet."
                },
                {
                    "note": "Om din kontaktperson matar in uppgifter för din räkning anger en banderoll ”du matar in uppgifter för …” detta uttryckligen överst i guiden."
                }
            ]
        },
        {
            "id": "grids",
            "icon": "grid_on",
            "title": "Snabb inmatning i en tabell",
            "summary": "Ingredienser, näringsämnen, allergener: allt görs från tangentbordet, och ett block från ett kalkylark klistras in direkt.",
            "blocks": [
                {
                    "p": "Tabellavsnitten — ingredienser, näringsämnen, allergener, fysikalisk-kemiska data… — fylls i utan att lämna tangentbordet. Tangentbordsknappen ovanför tabellen visar listan igen när som helst."
                },
                {
                    "ul": [
                        "**Tab / Shift+Tab** — nästa / föregående cell.",
                        "**Enter** — sparar raden och flyttar nedåt i samma kolumn; på sista raden läggs en ny till.",
                        "**↑ / ↓** — samma kolumn, raden ovanför / nedanför.",
                        "**Esc** — förkastar ändringarna i raden som redigeras.",
                        "**Ctrl+D** — duplicerar den aktuella raden.",
                        "**Ctrl+V** — klistrar in ett block med celler från ett kalkylark."
                    ]
                },
                {
                    "p": "Inklistring från ett kalkylark tar flera rader och kolumner på en gång, skapar de rader som saknas och talar om vad som inte kunde tas med — ett värde utanför den föreslagna listan, text där ett tal förväntas, en skrivskyddad kolumn. Inget gissas: allt som saknar exakt matchning lämnas tillbaka till dig för korrigering."
                },
                {
                    "note": "Som överallt i guiden sparas en rad så snart du lämnar den — eller vid Enter, eller så snart du markerar en kryssruta. Det finns ingen spara-knapp: det finns inget att bekräfta. Endast en inklistring erbjuder ”Spara de N raderna”, eftersom ingen har gått igenom de raderna."
                },
                {
                    "p": "På en mobil blir tabellen ett kort per rad: samma fält, staplade, utan horisontell rullning."
                }
            ]
        },
        {
            "id": "specs",
            "icon": "menu_book",
            "title": "Specifikation och katalog: vad är skillnaden",
            "summary": "En specifikation läses. En katalog fylls i — och det är den som avgör om du kan slutföra.",
            "blocks": [
                {
                    "p": "Det är två olika objekt, och de används inte i samma skede. Enklast är att ta dem i den ordning du stöter på dem."
                },
                {
                    "ul": [
                        "**Specifikationen** — ett dokument från kunden, kopplat till en produkt eller en produktfamilj. Den anger kundens krav: förbjudna material, godkända ursprung, analytiska gränsvärden, transportvillkor, CSR-åtaganden. Den är en **referenstext** som ska läsas. Portalen visar den i guidens panel ”Kontext”, och skärmen ”Specifikationer” samlar dem alla.",
                        "**Katalogen** — en **lista över obligatoriska fält** som kunden har definierat: ”för att en råvara ska listas hos mig behöver jag ursprung, densitet, EAN-kod, huvudallergen…”. Den är ingen text, den är en kontroll. Portalen beräknar den kontinuerligt och visar dess poäng i steget ”Efterlevnad”."
                    ]
                },
                {
                    "p": "Med andra ord: specifikationen talar om **vad kunden förväntar sig av din produkt**, katalogen kontrollerar **att produktbladet är fullständigt**. Du kan uppfylla specifikationen och ändå ha ett ofullständigt blad, och tvärtom."
                },
                {
                    "p": "Endast en av de två hindrar dig från att skicka in: katalogen. När kunden har angett en blockerande katalog förblir knappen ”Slutför” otillgänglig så länge ett fält saknas, och steget ”Efterlevnad” listar exakt vilka — varje rad leder dig till fältet."
                },
                {
                    "note": "En specifikation kan också kräva dokument (ett ekologiskt certifikat, ett intyg om GMO-frihet). Dessa visas under ”Mina dokument” och i steget Dokument, med sina giltighetsdatum — inte i katalogen."
                },
                {
                    "links": [
                        {
                            "href": "/specs",
                            "icon": "menu_book",
                            "label": "Specifikationer"
                        },
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "Mina dokument"
                        }
                    ]
                }
            ]
        },
        {
            "id": "frozen",
            "icon": "lock",
            "title": "Vad en låst lista innebär",
            "summary": "En lista som har validerats av kunden blir skrivskyddad. Det är avsiktligt, och kan hävas på begäran.",
            "blocks": [
                {
                    "p": "När kunden validerar ett avsnitt — ingredienslistan, frågeformuläret, allergenerna… — blir avsnittet **låst**: du ser det fortfarande med alla värden, men kan inte längre ändra det. Ett hänglås och texten ”Skrivskyddad” visar det."
                },
                {
                    "p": "Det är själva poängen: när ett värde väl är validerat blir det den referens kunden förlitar sig på (märkning, specifikationer, kontroller). Om det kunde ändras utan kundens vetskap skulle valideringen inte betyda något."
                },
                {
                    "p": "Låsta listor visas också i guidens panel ”Kontext”, under ”Validerade listor”: det är det snabbaste sättet att se vad som är fastställt och vad som fortfarande är öppet."
                },
                {
                    "warn": "Har du upptäckt ett fel i en låst lista? Skapa inte ett dubblettblad. Be om att avsnittet öppnas igen via diskussionen kopplad till bladet: kunden låser upp det och du får tillbaka det redigerbart."
                },
                {
                    "p": "Ett helt blad kan också vara skrivskyddat av ett annat skäl: uppgiften är slutförd, projektet är stängt eller du har endast läsbehörighet. Guiden talar om vilket av dessa som gäller."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Diskussioner"
                        }
                    ]
                }
            ]
        },
        {
            "id": "confidence",
            "icon": "auto_awesome",
            "title": "Vad AI föreslår",
            "summary": "Förslag — aldrig värden som skrivs i ditt ställe.",
            "blocks": [
                {
                    "p": "När automatisk extrahering är aktiverad hos kunden läser portalen dina dokument och föreslår de värden den har hittat. De visas i panelen ”Kontext”, till höger om formuläret, och läses om vid varje stegbyte — det du just har angett påverkar vad som återstår att föreslå."
                },
                {
                    "p": "Allt börjar med det **tekniska databladet**, i guidens sidhuvud. Så länge det inte har laddats upp finns det inget att läsa och förslagslistan förblir tom: det är vad den röda listen betyder."
                },
                {
                    "ul": [
                        "**Tillämpa** — värdet skrivs in i bladet. Inget skrivs in före det klicket.",
                        "**Expandera** — för långa analyser som inte får plats i panelen."
                    ]
                },
                {
                    "note": "Ett förslag du inte vill ha behöver inte avvisas: tillämpa det bara inte, vilket redan är standard. Inget värde tillämpas någonsin automatiskt, hur säker läsningen än påstår sig vara. Det är du som står för bladet: beslutet är ditt, fält för fält."
                },
                {
                    "p": "I samtliga fall är det slutliga värdet ditt: du ansvarar för det du validerar, och inget når kunden innan du slutför uppgiften."
                }
            ]
        },
        {
            "id": "documents",
            "icon": "folder_shared",
            "title": "Dokumentens giltighet och förnyelse",
            "summary": "Portalen vet vilka dokument som förväntas, hur länge de är giltiga och vilka som saknas.",
            "blocks": [
                {
                    "p": "De förväntade dokumenten är inte en lista du måste gissa dig till: kunden konfigurerar dem (dokumenttyp, obligatoriskt eller inte, giltighetstid, omfång), och skärmen ”Mina dokument” visar dem som de är, produkt för produkt."
                },
                {
                    "ul": [
                        "**Giltigt** — inlämnat, godkänt och giltighetens slut är inte nära.",
                        "**Ska förnyas** — giltigheten upphör om mindre än 60 dagar (en frist som kunden kan justera).",
                        "**Utgånget** — giltighetens slut har passerats. För ett obligatoriskt dokument innebär det att ditt godkännande stängs av.",
                        "**Saknas** — förväntat men aldrig inlämnat.",
                        "**Avvisat** — inlämnat, men avvisat av kunden: läs motiveringen innan du laddar upp igen."
                    ]
                },
                {
                    "p": "Varje dokument har en giltighetsperiod (början och slut), som visas på dess rad och färgas på samma sätt som i beCPG: **grön** så länge det ligger inom perioden, **orange** när slutdatumet närmar sig, **röd** när det har passerats."
                },
                {
                    "p": "Beroende på typ härleds perioden automatiskt från uppladdningsdatumet och den giltighetstid kunden har konfigurerat, eller så **anger du den själv**: två datumfält visas då i uppladdningsytan och fylls i utifrån dokumentet du laddar upp. De följer med filen och kan ändras i efterhand via ”Redigera” på raden."
                },
                {
                    "warn": "Ett obligatoriskt dokument vars giltighet aldrig har fyllts i markeras med rött, ”Giltighet ska fyllas i”. Utan slutdatum går det aldrig ut, ingen påminnelse skickas och kunden vet inte sedan när det gäller."
                },
                {
                    "p": "Att förnya innebär att ladda upp en ny version på samma rad — aldrig att skapa en andra rad. Den tidigare versionen finns kvar i dokumenthistoriken med sin egen giltighetsperiod: det är den som bevisar att du var täckt vid ett tidigare datum."
                },
                {
                    "note": "Filnamnet och var filen arkiveras spelar ingen roll: portalen byter namn på och arkiverar dokumentet enligt kundens konfiguration. Ladda upp filen som du fick den."
                },
                {
                    "p": "E-postpåminnelser före utgång skickas av beCPG enligt de regler kunden har definierat. Portalen visar alltid det verkliga läget: förlita dig inte på e-postmeddelandet, ”Mina dokument” är referensen."
                },
                {
                    "links": [
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "Mina dokument"
                        }
                    ]
                }
            ]
        },
        {
            "id": "approval",
            "icon": "verified",
            "title": "Godkännandestatus",
            "summary": "Beräknas löpande utifrån dina dokument, dina blad och dina avvikelser. Aldrig låst.",
            "blocks": [
                {
                    "p": "Statusen som visas på översikten är inte ett manuellt inmatat beslut: den beräknas om varje gång den visas, utifrån din akt. Åtgärda orsaken så ändras den."
                },
                {
                    "ul": [
                        "**Avstängd** — minst ett obligatoriskt dokument har gått ut, eller en blockerande avvikelse är öppen.",
                        "**Ska förnyas** — minst ett obligatoriskt dokument går snart ut.",
                        "**Pågår** — ett listningsprojekt är öppet, eller ett obligatoriskt dokument har aldrig lämnats in, eller en blockerande kontroll är inte uppfylld.",
                        "**Godkänd** — inget av ovanstående."
                    ]
                },
                {
                    "p": "Kortet på översikten listar orsakerna bakom statusen: var och en är klickbar och leder dig till det som behöver åtgärdas."
                },
                {
                    "note": "Samma status läses av kundens inköpssystem. Ett utgånget obligatoriskt dokument kan därför blockera en beställning, inte bara visa en orange etikett."
                }
            ]
        },
        {
            "id": "signature",
            "icon": "draw",
            "title": "Så fungerar signeringen",
            "summary": "Du ombeds först läsa och sedan signera. Signaturen tillämpas av beCPG, inte av din webbläsare.",
            "blocks": [
                {
                    "p": "En signeringsuppgift öppnar dokumentet i en visare inbyggd i portalen. Filen lämnar aldrig portalen och går att använda även på en mobil."
                },
                {
                    "ol": [
                        "**Läs hela dokumentet.** Läsningen följs sida för sida: så länge en sida inte har visats förblir signeringen otillgänglig.",
                        "**Rita din signatur** med ett finger, en mus eller en penna, på de platser kunden har förberett. Signatur- och initialfälten har placerats i förväg: du behöver inte placera dem.",
                        "**Markera samtyckesrutan** och skicka sedan. Uppgiften skickas en gång."
                    ]
                },
                {
                    "p": "beCPG signerar dokumentet på sin server, arkiverar den signerade versionen och skickar den med e-post till mottagarna. Portalen utfärdar inget eget certifikat."
                },
                {
                    "note": "Om nätverket bryts under inskickningen, försök igen: begäran har ett unikt id, så en begäran som kommer fram två gånger signerar inte två gånger. Ett redan signerat dokument visas som sådant, med nedladdning, i stället för att du ombeds signera igen."
                },
                {
                    "warn": "En signatur kan inte avvisas eller ångras från portalen. Om dokumentet är felaktigt, signera inte: öppna diskussionen och meddela kunden."
                }
            ]
        },
        {
            "id": "discussion",
            "icon": "forum",
            "title": "Var kundens kommentarer hamnar",
            "summary": "En konversation per blad, men varje meddelande är förankrat i det det gäller.",
            "blocks": [
                {
                    "p": "Ett blads diskussion är densamma på båda sidor: det kunden skriver i beCPG når dig här, och dina svar når kunden där. Det finns ingen separat brevlåda att bevaka."
                },
                {
                    "p": "Ett meddelande kan förankras på tre ställen, och väljaren överst i panelen låter dig välja vilket du läser eller riktar dig till:"
                },
                {
                    "ul": [
                        "**Hela bladet** — hela konversationen, inklusive kommentarer på ett fält eller en tabellrad. Detta är standardvyn.",
                        "**Ett fält** — ”det juridiska namnet är ofullständigt”. En bubbla visas då bredvid fältet i guiden.",
                        "**En tabellrad** — ”det mättade fettet är fel”. Kommentaren följer raden, inte radnumret."
                    ]
                },
                {
                    "note": "Att skriva från ett fält eller en rad i stället för från ”Hela bladet” sparar tid för alla: din kontaktperson ser direkt vad du syftar på, utan att leta bland tvåhundra fält."
                },
                {
                    "p": "Diskussionen blir skrivskyddad när listningen är avslutad: du kan läsa konversationen men inte lägga till något. Skärmen talar om vilket av dessa skäl som gäller."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Diskussioner"
                        }
                    ]
                }
            ]
        },
        {
            "id": "contact",
            "icon": "support_agent",
            "title": "Vem ska jag kontakta",
            "summary": "Din kontakt är din kund. Diskussionen kopplad till bladet är rätt kanal.",
            "blocks": [
                {
                    "p": "Den här portalen har öppnats åt dig av din kund: kunden konfigurerar de förväntade dokumenten, guidens steg, valideringarna och tidsfristerna. Kunden är därför din första kontakt för allt som rör innehållet."
                },
                {
                    "ul": [
                        "**En fråga om ett blad, en kommentar, en rättelse, en lista som ska låsas upp** — använd diskussionen kopplad till bladet eller uppgiften. Ditt meddelande når den som följer din akt och förblir kopplat till den berörda produkten.",
                        "**Ett dokument som avvisats utan tydlig motivering** — svara i produktens diskussion innan du laddar upp igen.",
                        "**En tidsfrist du inte kan hålla** — säg det i diskussionen i stället för att låta uppgiften bli försenad.",
                        "**Ett åtkomstproblem** (lösenord, kollega att lägga till, konto att avsluta) — gå via din kontaktperson hos kunden: konton skapas och avslutas hos kunden, inte från den här portalen."
                    ]
                },
                {
                    "note": "De kontakter du har angett, och kundens kontakter, finns listade i ditt leverantörsblad, fliken Kontakter."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Diskussioner"
                        },
                        {
                            "href": "/company",
                            "icon": "business",
                            "label": "Mitt företag"
                        },
                        {
                            "href": "/specs",
                            "icon": "menu_book",
                            "label": "Specifikationer"
                        }
                    ]
                }
            ]
        }
    ],
    "app/login/page#PAGE_TEXT": {
        "welcome": "Välkommen",
        "intro": "Logga in för att nå ditt leverantörsutrymme: dina uppgifter, dina produkter, dina dokument och din godkännandestatus.",
        "chooseTenant": "Välj din kund",
        "chooseTenantHelp": "Arbetar du för flera beCPG-kunder? Välj den kund vars akt du vill öppna.",
        "sso": "Du omdirigeras till kundens autentiseringstjänst.",
        "testNotice": "TEST-instans — uppgifter som anges här är inte avtalsmässigt bindande.",
        "help": "Behöver du hjälp?",
        "errorTitle": "Inloggningen misslyckades",
        "pitch": "beCPG leverantörsportal",
        "sellingPoints": [
            {
                "icon": "assignment_turned_in",
                "text": "Dina listningsförfrågningar och uppgifter, på ett ställe"
            },
            {
                "icon": "folder_shared",
                "text": "Dina dokument och certifikat, med deras utgångsdatum"
            },
            {
                "icon": "verified",
                "text": "Din godkännandestatus, hållen aktuell av din kund"
            }
        ]
    },
    "app/login/page#ERROR_TEXT": {
        "oidc_not_configured": "Autentisering är inte konfigurerad för den här kunden.",
        "tenant_mismatch": "Din session tillhörde en annan kund. Logga in igen.",
        "dev_auth_misconfigured": "Utvecklingsläget är aktiverat men felkonfigurerat.",
        "session_expired": "Din session har gått ut. Logga in igen."
    },
    "app/messages/page#LABELS": {
        "title": "Diskussioner",
        "subjects": "Ämnen",
        "messageCount": "{count} meddelande(n)",
        "search": "Sök ett ämne",
        "myRecord": "Mitt leverantörsblad",
        "back": "Ämnen",
        "placeholder": "Skriv ett meddelande…",
        "send": "Skicka",
        "sending": "Skickar…",
        "empty": "Inga meddelanden",
        "emptyHint": "Starta diskussionen — kunden aviseras.",
        "noSubject": "Välj ett ämne",
        "noSubjectHint": "Välj en produkt eller ditt blad för att se utbytena.",
        "noSubjects": "Inget diskussionsämne",
        "noSubjectsHint": "Diskussioner är kopplade till dina produkter. Ingen produkt är för närvarande kopplad till dig.",
        "field": "Fält",
        "edited": "redigerat",
        "you": "Du",
        "openSubject": "Öppna bladet",
        "thread": "Diskussion",
        "more": "Läs in fler",
        "loading": "Läser in…",
        "tooLong": "Meddelandet är för långt (högst 20 000 tecken).",
        "denyReasons": {
            "noAssignedTask": "Listningen är avslutad: diskussionen är skrivskyddad.",
            "readAccess": "Du har endast läsbehörighet för det här bladet.",
            "noPermission": "Du har inte behörighet att skriva i den här diskussionen."
        }
    },
    "app/monitor/campaigns/[id]/page#LABELS": {
        "back": "Projekt",
        "notFound": "Projektet hittades inte",
        "notFoundHint": "Projektet finns inte, är inte ett leverantörsprojekt eller ligger utanför ditt omfång.",
        "kpi": {
            "response": "Svarsfrekvens",
            "age": "Öppet sedan",
            "due": "Förfallodatum",
            "tasks": "Öppna uppgifter"
        },
        "hints": {
            "days": "{count} d",
            "noDue": "Inget förfallodatum",
            "overdue": "{count} d försenat",
            "dueIn": "om {count} d",
            "late": "{count} försenade",
            "unanswered": "Inget svar sedan öppnandet"
        },
        "tasks": "Öppna uppgifter",
        "tasksEmpty": "Inga öppna uppgifter i det här projektet.",
        "tasksHint": "Vad arbetsflödet väntar på, och från vem.",
        "noAssignee": "Ej tilldelad",
        "entities": "Vad projektet gäller",
        "entitiesHint": "Öppna bladet för att läsa de uppgifter som matas in och dess diskussion.",
        "entitiesEmpty": "Projektet hänvisar inte till något blad.",
        "unreadable": "Utanför ditt omfång",
        "open": "Öppna",
        "suppliers": "Leverantörer",
        "manager": "Ansvarig",
        "discussion": "Projektdiskussion",
        "state": "Status"
    },
    "app/monitor/campaigns/page#LABELS": {
        "title": "Projekt",
        "subtitle": "Öppna listnings- och förnyelseprojekt. Välj projekt för att påminna eller eskalera till deras leverantörer.",
        "stats": {
            "open": "Öppna projekt",
            "openState": "Projekt · {state}",
            "response": "Svarsfrekvens",
            "unanswered": "Inget svar",
            "reminders": "Påminnelser att skicka"
        },
        "hints": {
            "scanned": "{count} genomsökta",
            "meanCompletion": "Genomsnittligt förlopp {value}%",
            "escalations": "{count} att eskalera",
            "late": "{count} försenade",
            "noEscalation": "Ingen eskalering behövs",
            "answered": "{count} besvarade"
        },
        "startCampaign": "Starta ett projekt",
        "allOpen": "Alla öppna projekt",
        "state": "Projektstatus",
        "sortLabel": "Sortera efter",
        "sorts": {
            "dueDate": "Tidigaste förfallodatum",
            "completion": "Lägsta svarsfrekvens",
            "age": "Längst öppna",
            "name": "Namn"
        },
        "searchSupplier": "Filtrera på leverantör",
        "truncated": "Genomsökningsfönster: beCPG begränsar en lista till 250 rader och {scanned} projekt lästes. Sorteringen och summorna på den här sidan avser det fönstret — begränsa status eller omfång för en fullständig vy.",
        "scopeEmpty": "Ingen leverantör matchar det här omfånget. Inget projekt kan kopplas till det: räknarna ovan är noll per definition, inte mätvärden.",
        "parkScoped": "Räknarna är begränsade till det filtrerade omfånget ({count} leverantör(er)).",
        "noRate": "Inget projekt att poängsätta",
        "unsupported": "Filter som inte stöds av beCPG:s standardmodell: {names}. Konfigurera dem på kundsidan.",
        "pageOf": "{from}-{to} av {total} projekt",
        "previous": "Föregående",
        "next": "Nästa",
        "rows": "Rader",
        "reminder": "Ditt öppna projekt i portalen väntar fortfarande på ditt svar. Slutför de uppgifter som tilldelats dig så snart som möjligt.",
        "hintTargets": "Leverantörer i de valda projekten",
        "noteReminder": "beCPG för ingen påminnelselogg: kolumnen ”Senaste påminnelse” visar den senaste aktiviteten i projektet, det närmaste faktum som faktiskt finns tillgängligt.",
        "truncatedShort": "Fönster: {scanned} projekt lästa"
    },
    "app/monitor/documents/page#LABELS": {
        "title": "Dokumentefterlevnad",
        "subtitle": "Matris leverantör × dokumenttyp. Välj celler eller rader för att skicka en påminnelse i bulk.",
        "search": "Sök en leverantör",
        "allTypes": "Alla dokumenttyper",
        "allStatuses": "Alla statusar",
        "mandatoryOnly": "Endast obligatoriska dokument",
        "export": "Exportera",
        "stats": {
            "suppliers": "Leverantörer",
            "missing": "Saknas",
            "expired": "Utgångna",
            "expiring": "Ska förnyas",
            "refused": "Avvisade"
        },
        "statuses": {
            "valid": "Giltigt",
            "expiring": "Går snart ut",
            "expired": "Utgånget",
            "missing": "Saknas",
            "refused": "Avvisat",
            "toValidate": "Granskas"
        },
        "truncatedShort": "Fönster: {scanned} leverantörer lästa",
        "truncated": "Leverantörsbasen är större än genomsökningsfönstret ({scanned} leverantörer av {total}): begränsa filtren för en fullständig matris.",
        "scopeEmpty": "Ingen leverantör matchar det här omfånget. Ingen dokumentfråga kördes: räknarna ovan är noll per definition, inte mätvärden.",
        "cellsScope": "celler · över de {total} leverantörerna i leverantörsbasen",
        "statusScope": "Visningsfilter ”{status}”: {kept} rad(er) behållna av de {shown} som visas på den här sidan. Räknarna ovan avser de {total} leverantörerna i leverantörsbasen, inte den här sidan.",
        "unsupported": "Filter som inte stöds av beCPG:s standardmodell: {names}. Konfigurera dem på kundsidan.",
        "pageOf": "{from}-{to} av {total} leverantörer",
        "previous": "Föregående",
        "next": "Nästa",
        "rows": "Rader",
        "reminder": "Din leverantörsakt har dokument som behöver uppdateras i portalen: {types}. Ladda upp dem så snart som möjligt.",
        "reminderGeneric": "Din leverantörsakt har obligatoriska dokument som saknas eller har gått ut. Uppdatera dem i portalen.",
        "hintTypes": "{count} dokumenttyp(er) berörda"
    },
    "app/monitor/layout#LABELS": {
        "metaTitle": "Leverantörsuppföljning — beCPG",
        "metaDescription": "Leverantörsbasen i korthet: dokumentefterlevnad och projekt",
        "title": "Uppföljningsyta",
        "denied": "Uppföljningsytan är reserverad för interna team",
        "deniedGroups": "Ditt konto tillhör ingen av de beCPG-grupper som ger åtkomst till uppföljningsytan: {groups}. Be din beCPG-administratör om medlemskap.",
        "backSupplier": "Gå till min översikt"
    },
    "app/monitor/page#LABELS": {
        "title": "Uppföljning av leverantörsbasen",
        "description": "Godkännande, dokumentefterlevnad, utgångar, projekt och avvikelser i din leverantörsbas, i realtid.",
        "generatedAt": "Data per {time}",
        "truncated": "Leverantörsbasen är större än genomsökningsfönstret: {scanned} leverantörer lästa av {total}. Räknare markerade med ”≈” är begränsade; fördelningen och topp 10 avser fönstret.",
        "truncatedShort": "Fönster: {scanned} leverantörer lästa",
        "tablist": "Läsning av leverantörsbasen",
        "tabs": {
            "quality": "Kvalitet",
            "purchasing": "Inköp",
            "rnd": "FoU",
            "csr": "Hållbarhet",
            "assistant": "Assistent"
        },
        "ai": "AI"
    },
    "app/monitor/products/page#LABELS": {
        "title": "Leverantörsprodukter",
        "subtitle": "Produkter som anförtrotts en leverantör. Filtrera på certifikatdatum för att se vad som ska förnyas.",
        "search": "Sök en produkt, en kod, ett juridiskt namn…",
        "state": "Produktstatus",
        "anyState": "Alla statusar",
        "certified": "Certifikatdatum",
        "anyCertified": "Alla datum",
        "certifiedNone": "Inget datum",
        "certifiedYears": "Certifierad för mer än {count} år sedan",
        "columns": {
            "name": "Produkt",
            "code": "Kod",
            "supplierRef": "Leverantörsreferens",
            "suppliers": "Leverantör(er)",
            "plants": "Leverantörens anläggningar",
            "state": "Status",
            "certificate": "Certifikatdatum",
            "modified": "Uppdaterad"
        },
        "age": "för {count} år sedan",
        "ageMonths": "för {count} månad(er) sedan",
        "none": "—",
        "empty": "Inga produkter i det här omfånget",
        "emptyHint": "Ingen produkt har leverantörsaspekten med dessa filter. Produkter visas här så snart en leverantör kopplas till dem.",
        "pageOf": "{from} - {to} av {total}",
        "previous": "Föregående sida",
        "next": "Nästa sida",
        "rows": "Rader per sida",
        "sortScope": "Sorteringen gäller den sida som visas, inte hela leverantörsbasen.",
        "tiles": {
            "total": "Produkter",
            "valid": "Godkända",
            "draft": "Simulering",
            "noCertificate": "Utan listningsdatum"
        }
    },
    "app/monitor/quality/page#LABELS": {
        "title": "Avvikelser",
        "subtitle": "Leverantörsavvikelser, handläggningstid och förlopp för korrigerande åtgärder. Välj avvikelser för att påminna, eskalera eller stänga av berörda leverantörer.",
        "stats": {
            "open": "Öppna NC",
            "blocking": "Blockerande",
            "overdue": "Över måldatum",
            "delay": "Genomsnittlig tid"
        },
        "hints": {
            "total": "{count} totalt",
            "blocking": "Ger godkännandestatusen ”avstängd”",
            "noBlocking": "Inget godkännande blockeras av en NC",
            "actionsLate": "{count} korrigerande åtgärd(er) försenade",
            "noActionsLate": "Inga försenade korrigerande åtgärder",
            "closing": "Genomsnittlig stängning {value} d",
            "noClosing": "Ingen stängd NC i det här omfånget",
            "closingHidden": "{count} stängd(a) avvikelse(r) · klicka för att ta med dem"
        },
        "dayUnit": "d",
        "allStates": "Alla statusar",
        "allTypes": "Alla typer",
        "includeClosed": "Inkludera stängda NC",
        "searchSupplier": "Filtrera på leverantör",
        "truncated": "Fler avvikelser än genomsökningsfönstret ({scanned} genomsökta): begränsa filtren för en fullständig vy.",
        "inexact": "Ungefärliga räknare: motorn returnerade en begränsad summa för minst en fråga.",
        "scopeEmpty": "Ingen leverantör matchar det här omfånget. Ingen fråga kördes: räknarna ovan är noll per definition, inte mätvärden.",
        "unsupported": "Filter som inte stöds av beCPG:s standardmodell: {names}. Konfigurera dem på kundsidan.",
        "pageOf": "{from}-{to} av {total} NC",
        "previous": "Föregående",
        "next": "Nästa",
        "rows": "Rader",
        "reminder": "En öppen avvikelse berör dig. Hantera de tillhörande korrigerande åtgärderna i portalen så snart som möjligt.",
        "hintTargets": "Leverantörer för de valda avvikelserna",
        "note": "Handläggningstid: sedan avvikelsen skapades; för en stängd avvikelse, mellan skapandet och den senaste ändringen — beCPG lagrar inget stängningsdatum.",
        "truncatedShort": "Fönster: {scanned} avvikelser lästa"
    },
    "app/monitor/suppliers/[id]/page#LABELS": {
        "back": "Leverantörer",
        "notFound": "Leverantören hittades inte",
        "notFoundHint": "Leverantören finns inte, eller ligger utanför ditt omfång.",
        "tiles": {
            "label": "Leverantörsindikatorer",
            "nc": "Blockerande NC",
            "ncHint": "öppna",
            "projects": "Pågående projekt",
            "projectsHint": "{count} utan svar",
            "documents": "Obligatoriska dokument",
            "documentsHint": "{expired} utgångna · {missing} saknas",
            "documentsNone": "inga förväntade",
            "products": "Produkter",
            "productsHint": "kopplade",
            "delay": "Svarstid",
            "delayHint": "medelvärde {period}",
            "delayNone": "beslutsmodul",
            "completion": "Fullständighet",
            "completionHint": "{count} aktiva kataloger",
            "completionNone": "ingen aktiv katalog",
            "days": "d"
        },
        "tabs": {
            "label": "Leverantörsblad",
            "overview": "Översikt",
            "nc": "Avvikelser",
            "projects": "Projekt",
            "documents": "Dokument",
            "products": "Produkter",
            "subSuppliers": "Underleverantörer",
            "history": "Historik"
        },
        "status": "Godkännandestatus",
        "statusHelp": "Statusen beräknas vid varje visning och lagras aldrig: den första uppfyllda regeln gäller.",
        "risk": "Riskpoäng",
        "riskHelp": "Varje orsak lägger till sin vikt; varje ytterligare förekomst lägger till ett avtagande tillägg.",
        "riskFrom": "från {from}",
        "reasonNames": {
            "documentExpired": "Utgånget dokument",
            "blockingNc": "Blockerande NC",
            "campaignNoAnswer": "Projekt utan svar",
            "scoreDropping": "Sjunkande poäng",
            "documentExpiring": "Dokument som snart går ut",
            "lateTask": "Försenad uppgift",
            "lowCompletion": "Låg fullständighet",
            "documentMissing": "Saknat dokument",
            "openNc": "Öppen NC"
        },
        "activity": "Aktivitet och svarsförmåga",
        "activityHelp": "Uppgifter tilldelade leverantören och genomsnittlig svarstid per år, hämtade från beslutsmodulen.",
        "identity": "Identitet",
        "identityRows": {
            "code": "Kod",
            "erpCode": "ERP-kod",
            "legalName": "Juridiskt namn",
            "state": "beCPG-status",
            "family": "Familj",
            "subFamily": "Underfamilj",
            "sites": "Anläggningar",
            "subsidiaries": "Dotterbolag",
            "parent": "Överordnad leverantör",
            "catalogs": "Aktiva kataloger"
        },
        "scorecard": "Bedömning",
        "scorecardHelp": "Viktat medelvärde av de bedömda kriterierna i leverantörens senaste projekt.",
        "allNc": "Alla dess NC",
        "exchanges": "Kommunikation",
        "ncFile": "leverantor-nc",
        "projectsFile": "leverantor-projekt",
        "none": "—"
    },
    "app/monitor/suppliers/page#LABELS": {
        "title": "Leverantörer",
        "statuses": {
            "suspended": "Avstängd",
            "toRenew": "Ska förnyas",
            "inProgress": "Pågår",
            "approved": "Godkänd"
        },
        "statusFiltered": "Filter aktivt",
        "export": "Exportera (CSV)",
        "exportCutTitle": "Ofullständig export: {scanned} rader av {total}",
        "exportCutMessage": "beCPG begränsar en lista till 250 rader per fråga, så exporten avser det lästa fönstret, inte hela leverantörsbasen. Begränsa filtren (familj, inköpare, status) och exportera i omgångar för en fullständig fil.",
        "exportCutConfirm": "Exportera fönstret",
        "generatedAt": "Data per {time}",
        "windowOf": "{from}-{to} av {total} leverantörer",
        "previous": "Föregående fönster",
        "next": "Nästa fönster",
        "truncated": "Leverantörsbasen är större än genomsökningsfönstret ({scanned} lästa av {total}): sortering och rangordning avser det fönstret. Begränsa filtren för en exakt rangordning av hela leverantörsbasen.",
        "sortScope": "Sorterat inom det lästa fönstret",
        "sortedBy": "Startsortering: {sort}",
        "reminder": "Hej,\n\nDin leverantörsakt behöver uppdateras (obligatoriska dokument saknas, har gått ut eller väntar).\nLogga in i portalen för att komplettera den.\n\nMed vänliga hälsningar,",
        "countsScope": "Fördelning över de {scanned} lästa leverantörerna",
        "sortNames": {
            "risk": "risk, fallande",
            "name": "namn",
            "code": "kod",
            "status": "godkännandestatus",
            "completion": "fullständighet",
            "expiring": "dokument som snart går ut",
            "expired": "utgångna dokument",
            "nc": "öppna NC",
            "lastActivity": "senaste aktivitet"
        },
        "truncatedShort": "Fönster: {scanned} leverantörer lästa"
    },
    "app/not-found#LABELS": {
        "title": "Sidan hittades inte",
        "message": "Adressen finns inte, eller så är objektet den pekar på inte längre tillgängligt. Om du kom hit från ett e-postmeddelande kan länken ha gått ut.",
        "home": "Tillbaka till startsidan"
    },
    "app/products/[id]/page#LABELS": {
        "sheet": "Blad",
        "notFound": "Produkten hittades inte",
        "notFoundHint": "Bladet finns inte, eller ingår inte i ditt omfång.",
        "back": "Mina produkter",
        "monitorBack": "Leverantörsprodukter",
        "request": "Begär en uppdatering",
        "partial": "Bladet visas ofullständigt: det pekar på minst en uppgift som ditt konto kanske inte får läsa. De berörda fälten saknas på skärmen — vilket inte betyder att de är tomma. Be din beCPG-kontakt om åtkomst om du behöver någon av dem."
    },
    "app/products/page#LABELS": {
        "title": "Mina produkter",
        "search": "Sök en produkt",
        "allStates": "Alla statusar",
        "allTypes": "Alla typer",
        "branch": "Uppdatering",
        "branchFrom": "Uppdatering av version {version}",
        "columns": {
            "name": "Produkt",
            "code": "Kod",
            "type": "Typ",
            "state": "Status",
            "completion": "Ifyllnadsgrad",
            "project": "Projekt",
            "supplierRef": "Leverantörsreferens",
            "certificateDate": "Certifikatdatum",
            "modified": "Uppdaterad",
            "actions": "Åtgärder"
        },
        "stats": {
            "total": "Produkter",
            "valid": "Validerade",
            "pending": "Pågår",
            "completion": "Genomsnittlig ifyllnadsgrad"
        },
        "empty": "Inga produkter",
        "emptyHint": "Ingen produkt är kopplad till dig ännu. Ett blad visas här så snart kunden tilldelar dig ett.",
        "request": "Begär en uppdatering"
    },
    "app/specs/page#LABELS": {
        "title": "Specifikationer",
        "stats": {
            "specs": "Specifikationer",
            "products": "Omfattade produkter"
        },
        "emptyHint": "Ingen specifikation är tillgänglig för dig. Kunden delar en om någon är tillämplig."
    },
    "app/tasks/[id]/page#LABELS": {
        "loading": "Uppgift",
        "notFound": "Uppgiften hittades inte",
        "notFoundHint": "Uppgiften finns inte längre, har redan hanterats eller ingår inte i ditt omfång.",
        "back": "Mina uppgifter",
        "noEntity": "Uppgiften pekar inte på något blad",
        "noEntityHint": "Leveransobjektet som är kopplat till uppgiften hänvisar inte till någon produkt. Kontakta kunden via projektdiskussionen.",
        "documents": "Dokument att lämna in",
        "viewDocument": "Visa dokumentet",
        "due": "Förfaller {date}",
        "late": "Försenad",
        "done": "Slutförd",
        "discussion": "Diskussion"
    },
    "app/tasks/page#LOCAL": {
        "title": "Mina uppgifter",
        "search": "Sök en uppgift, en produkt, en kod…",
        "anyType": "Alla typer",
        "anyPriority": "Alla prioriteter",
        "anyProduct": "Alla produkter",
        "anyDue": "Alla förfallodatum",
        "dueLate": "Försenade",
        "dueToday": "I dag",
        "dueWeek": "Inom 7 dagar",
        "dueMonth": "Inom 30 dagar",
        "dueNone": "Inget förfallodatum",
        "stateOpen": "Pågår",
        "stateDone": "Slutförda",
        "colTask": "Uppgift",
        "colProduct": "Produkt / kund",
        "colType": "Typ",
        "colPriority": "Prioritet",
        "colDue": "Förfallodatum",
        "colProgress": "Förlopp",
        "kpiTotal": "Uppgifter",
        "kpiLate": "Försenade",
        "kpiNext": "Nästa förfallodatum",
        "kpiNone": "Inget",
        "reset": "Återställ",
        "empty": "Inga uppgifter",
        "emptyHint": "Inget förväntas av dig just nu.",
        "emptyFiltered": "Ingen uppgift matchar dessa filter.",
        "truncated": "Endast de första uppgifterna visas. Begränsa filtren för att se resten.",
        "scoped": "Omfång: {supplier}.",
        "scopedAll": "Omfång: alla leverantörer.",
        "orphans": "{count} uppgift(er) är inte kopplade till något av dina leverantörsblad och listas inte här. Välj ”Alla leverantörer” i det övre högra hörnet för att se dem.",
        "priorityHigh": "Hög",
        "priorityMedium": "Medel",
        "priorityLow": "Låg",
        "noPriority": "Ingen prioritet",
        "untitled": "Uppgift utan titel",
        "caption": "Min uppgiftslista"
    },
    "components/dashboard/ActionsCard#LOCAL": {
        "title": "Åtgärder som krävs",
        "open": "öppna uppgift(er)",
        "late": "{count} försenade",
        "onTime": "Inga försenade",
        "nextDue": "Nästa förfallodatum: {date}",
        "noDue": "Inget planerat förfallodatum",
        "none": "Inget att göra just nu",
        "all": "Visa alla mina uppgifter"
    },
    "components/dashboard/ActionsCard#TASK_TYPE_META.wizard": "Guide",
    "components/dashboard/ActionsCard#TASK_TYPE_META.signature": "Signatur",
    "components/dashboard/ActionsCard#TASK_TYPE_META.document": "Dokument",
    "components/dashboard/ActionsCard#TASK_TYPE_META.review": "Granskning",
    "components/dashboard/ApprovalCard#REASONS": {
        "documentExpired": "Obligatoriskt dokument har gått ut",
        "documentExpiring": "Dokument går snart ut",
        "documentMissing": "Förväntat dokument har inte lämnats in",
        "documentRefused": "Dokument avvisat",
        "catalogIncomplete": "Ofullständigt blad",
        "openProject": "Öppet listningsprojekt",
        "openNonConformity": "Öppen avvikelse"
    },
    "components/dashboard/ApprovalCard#LOCAL": {
        "title": "Godkännandestatus",
        "validUntil": "Giltig till {date}",
        "noValidity": "Ingen känd tidsfrist",
        "why": "Varför?",
        "unknown": "Status är inte tillgänglig",
        "unknownHint": "Statusen kunde inte beräknas. Försök igen senare.",
        "allGood": "Inget blockerar"
    },
    "components/dashboard/CompletionCard#LOCAL": {
        "title": "Fullständighet",
        "scope": "{scored} av {total} produkt(er) poängsatta",
        "noScore": "Ingen katalog poängsatt ännu",
        "noScoreHint": "Fullständigheten visas så snart en produkt har formulerats.",
        "seeProducts": "Visa mina produkter",
        "worst": "Minst fullständiga kataloger"
    },
    "components/dashboard/DiscussionList#LOCAL": {
        "title": "Mina diskussioner",
        "empty": "Inga diskussioner",
        "emptyHint": "Kundens kommentarer på dina uppgifter och produkter visas här.",
        "all": "Visa alla",
        "messages": "{count} meddelande(n)",
        "anonymous": "Användare",
        "onField": "för {field}",
        "unread": "Nytt",
        "unreadCount": "{count} olästa"
    },
    "components/dashboard/DocumentList#LOCAL": {
        "title": "Mina dokument",
        "empty": "Inga förväntade dokument",
        "emptyHint": "De certifikat som kunden kräver visas här.",
        "all": "Visa alla",
        "supplierScope": "Leverantör",
        "mandatory": "Obligatoriskt",
        "until": "Till {date}",
        "expiredSince": "Gick ut för {days} d sedan",
        "expiresIn": "Går ut om {days} d",
        "noValidity": "Inget slutdatum",
        "upload": "Ladda upp en ny version",
        "uploadFirst": "Ladda upp dokumentet",
        "download": "Ladda ned",
        "uploading": "Laddar upp…",
        "uploaded": "Dokumentet har laddats upp. Det väntar nu på kundens validering."
    },
    "components/dashboard/DocumentsCard#LOCAL": {
        "title": "Dokument",
        "valid": "Giltiga",
        "expiring": "Går ut < {days} d",
        "expired": "Utgångna",
        "missing": "Saknas",
        "refused": "Avvisade",
        "total": "{count} bevakade dokument",
        "none": "Inga bevakade dokument",
        "unavailable": "Dokumentbevakning är inte tillgänglig på den här instansen.",
        "all": "Visa mina dokument",
        "toHandle": "att hantera"
    },
    "components/dashboard/NotificationList#NOTIFICATION_LABELS": {
        "title": "Mina aviseringar",
        "empty": "Inga aviseringar",
        "emptyHint": "Inget kräver din uppmärksamhet just nu.",
        "overdue": "{days} d försenad",
        "expiresIn": "Om {days} d",
        "types": {
            "task.overdue": "Försenad uppgift",
            "document.expired": "Utgånget dokument",
            "document.expiring": "Dokument att förnya",
            "document.missing": "Saknat dokument",
            "document.refused": "Avvisat dokument"
        },
        "assigned": "Tilldelad mig",
        "mandatory": "Obligatoriskt",
        "isNew": "Nytt",
        "scopeEmpty": {
            "noSupplierIdentity": "Ditt konto är inte kopplat till någon leverantör, så dina dokument kan inte identifieras. Endast dina uppgifter listas. Meddela din kontaktperson hos kunden.",
            "internalAccount": "Internt konto: dokumentvarningar följer den leverantör som ska lämna dokumenten, så din klocka visar endast dina uppgifter. Vyn över hela leverantörsbasen finns under Dokumentefterlevnad.",
            "fallback": "Ditt kontos omfång är tomt: vissa varningar kan inte beräknas."
        },
        "countTitle": "{total} väntande · de {shown} mest brådskande nedan"
    },
    "components/dashboard/ProductList#LOCAL": {
        "title": "Mina produkter",
        "empty": "Inga produkter",
        "emptyHint": "De produkter som kunden anförtror dig visas här.",
        "all": "Visa alla",
        "updatedOn": "Uppdaterad {date}",
        "request": "Begär en uppdatering",
        "noCompletion": "Ej poängsatt",
        "completion": "Fullständighet"
    },
    "components/dashboard/ProductList#STATE_LABELS": {
        "Valid": "Godkänd",
        "ToValidate": "Väntar på godkännande",
        "Refused": "Ska korrigeras",
        "Simulation": "Simulering",
        "Stopped": "Stoppad",
        "Archived": "Arkiverad"
    },
    "components/dashboard/TaskList#LOCAL": {
        "title": "Mina uppgifter",
        "empty": "Inga pågående uppgifter",
        "emptyHint": "Allt är uppdaterat. Nya förfrågningar från kunden visas här.",
        "all": "Visa alla",
        "overdue": "{days} d försenad",
        "overdueToday": "Förfaller i dag",
        "dueIn": "Om {days} d",
        "noDue": "Inget förfallodatum",
        "priorityHigh": "Hög",
        "priorityMedium": "Medel",
        "priorityLow": "Låg",
        "progress": "Förlopp",
        "untitled": "Uppgift utan titel"
    },
    "components/datalist/RowFormModal#LABELS": {
        "title": "Redigera raden",
        "create": "Ny rad",
        "save": "Spara",
        "cancel": "Avbryt",
        "description": "Fält som tabellen inte visar fylls i här.",
        "refused": "Raden sparades inte. Kontrollera de obligatoriska fälten och försök sedan igen."
    },
    "components/datalist/useDataList#DATALIST_LABELS": {
        "rows": "{count} rad(er)",
        "addRow": "Lägg till en rad",
        "deleteRow": "Ta bort raden",
        "editRow": "Redigera raden",
        "moveUp": "Flytta upp",
        "moveDown": "Flytta ned",
        "actions": "Åtgärder",
        "order": "Ordning",
        "row": "Rad {index}",
        "newRow": "Ny rad",
        "totalRow": "Summarad, beräknad av beCPG",
        "incomplete": "Fyll i de obligatoriska fälten för att spara raden",
        "sortBy": "Sortera efter {column}",
        "saving": "Sparar…",
        "saved": "Sparat",
        "discard": "Förkasta ändringar",
        "failed": "Det gick inte att spara",
        "retry": "Försök igen",
        "deleting": "Tar bort…",
        "search": "Sök i listan",
        "readOnly": "Skrivskyddad",
        "frozenTitle": "Listan har validerats av kunden",
        "frozenText": "Kunden har validerat listan: den är nu låst och kan inte längre ändras. Om en rättelse behövs, be om att den öppnas igen via projektdiskussionen.",
        "readAccessTitle": "Endast visning",
        "readAccessText": "Du har endast läsbehörighet för den här entiteten.",
        "noTaskTitle": "Ingen öppen uppgift",
        "noTaskText": "Redigering är endast möjlig medan en uppgift är tilldelad dig. Listan förblir synlig.",
        "wizardReadOnlyTitle": "Skrivskyddad guide",
        "wizardReadOnlyText": "Guiden är konfigurerad för visning: inga ändringar är möjliga.",
        "protectedTitle": "Skyddat fält",
        "protectedText": "Kolumnen ”{column}” är skyddad: dess värde används i kundens efterlevnadskontroller. Bekräfta att du vill ändra den.",
        "protectedUnlock": "Ändra ändå",
        "protectedLocked": "Skyddat fält — klicka för att låsa upp",
        "deleteTitle": "Ta bort raden?",
        "deleteText": "Raden tas bort permanent från listan.",
        "expand": "Visa detaljer",
        "collapse": "Dölj detaljer",
        "nestedEmpty": "Inga poster",
        "empty": "Listan är tom",
        "emptyHint": "Lägg till en första rad för att komma igång.",
        "emptyReadOnly": "Kunden förväntar sig inga rader i den här listan.",
        "mandatory": "Obligatoriskt fält",
        "detail": "Detalj",
        "duplicate": "Duplicera raden",
        "select": "Välj",
        "selectRow": "Välj rad {index}",
        "selectAll": "Välj alla rader på sidan",
        "selected": "{count} rad(er) valda",
        "clearSelection": "Rensa urvalet",
        "bulkMoveUp": "Flytta upp",
        "bulkMoveUpLong": "Flytta upp urvalet",
        "bulkMoveDown": "Flytta ned",
        "bulkMoveDownLong": "Flytta ned urvalet",
        "bulkDuplicate": "Duplicera",
        "bulkDuplicateLong": "Duplicera urvalet",
        "bulkDelete": "Ta bort",
        "bulkDeleteLong": "Ta bort urvalet",
        "accessDenied": "Åtkomst nekad",
        "accessDeniedRow": "Raden innehåller en egenskap som ditt konto inte får läsa: den kan inte redigeras här.",
        "bulkEdit": "Redigera",
        "bulkEditLong": "Redigera urvalet",
        "bulkEditTitle": "Redigera {count} rad(er)",
        "bulkEditDescription": "Samma värden, på varje vald rad, i en enda skrivning.",
        "bulkEditPickFields": "Fält att fylla i",
        "bulkEditSearchField": "Sök ett fält",
        "bulkEditApply": "Tillämpa på {count} rad(er)",
        "bulkEditCancel": "Avbryt",
        "bulkEditEmptyClears": "Ett fält som är markerat men lämnas tomt rensar värdet på alla rader.",
        "bulkEditSkipped": "{count} valda rad(er) kan inte redigeras och lämnas oförändrade.",
        "bulkEditTooMany": "{count} rader valda, högst {max} tillåts. Begränsa urvalet.",
        "bulkEditNoColumn": "Ingen kolumn i den här listan kan fyllas i serie.",
        "deleteSelectedTitle": "Ta bort {count} rad(er)?",
        "deleteSelectedText": "Raderna tas bort permanent från listan.",
        "rowsPerPage": "Rader per sida",
        "shortcuts": "Kortkommandon",
        "shortcutsTitle": "Inmatning med tangentbordet",
        "shortcutList": [
            [
                "Tab / Shift+Tab",
                "nästa / föregående cell"
            ],
            [
                "Enter",
                "sparar raden och flyttar nedåt i samma kolumn"
            ],
            [
                "Enter på sista raden",
                "lägger till en rad"
            ],
            [
                "↑ / ↓",
                "samma kolumn, raden ovanför / nedanför"
            ],
            [
                "Esc",
                "förkastar ändringarna i raden som redigeras"
            ],
            [
                "Ctrl+Enter",
                "lägger till en rad"
            ],
            [
                "Ctrl+D",
                "duplicerar den aktuella raden"
            ],
            [
                "Ctrl+V",
                "klistrar in ett block med celler från ett kalkylark"
            ]
        ],
        "pasteTitle": "Inklistrat från ett kalkylark",
        "pasteApplied": "{cells} värde(n) inklistrade på {rows} rad(er), varav {created} nya.",
        "pasteNothing": "Inget kunde klistras in.",
        "pasteUndo": "Ångra inklistringen",
        "pasteSave": "Spara de {count} raderna",
        "pasteResolving": "Slår upp etiketterna…",
        "pasteUnmatched": "{count} värde(n) togs inte med — korrigera dem manuellt:",
        "pasteExtraColumns": "{count} inklistrade kolumn(er) efter listans sista kolumn: ignoreras.",
        "pasteRefusedRows": "{count} rad(er) efter listans slut: listan tar inte emot nya rader.",
        "pasteLine": "rad {line}",
        "pasteReasons": {
            "number": "ett tal förväntades",
            "integer": "ett heltal förväntades",
            "boolean": "ja / nej förväntades",
            "date": "ett datum förväntades (dd/mm/åååå)",
            "list": "värdet finns inte i den erbjudna listan",
            "readonly": "kolumnen kan inte ändras",
            "association": "ingen exakt matchning i referensdata"
        }
    },
    "components/documents/DepositedDocuments#LABELS": {
        "title": "Inlämnade dokument",
        "subtitle": "Filerna i produktens mapp, oavsett typ.",
        "empty": "Inga filer inlämnade",
        "emptyHint": "Produktens mapp innehåller inga dokument ännu.",
        "signed": "Signerat",
        "download": "Ladda ned",
        "consult": "Visa",
        "modified": "Ändrat {date}"
    },
    "components/documents/DocumentUpload#LABELS": {
        "drop": "Släpp en fil här",
        "or": "eller",
        "browse": "Bläddra",
        "deposit": "Ladda upp",
        "renew": "Förnya",
        "replace": "Ersätt",
        "uploading": "Laddar upp…",
        "analysing": "Analyserar dokumentet…",
        "done": "Filen har laddats upp",
        "doneHint": "Den granskas av kunden. Inget mer förväntas av dig.",
        "retry": "Försök igen",
        "cancel": "Avbryt",
        "tooLarge": "Filen är för stor ({size}). Högst: {max}.",
        "badType": "Format som inte stöds ({name}). Förväntat: {accept}.",
        "empty": "Filen är tom.",
        "failed": "Uppladdningen misslyckades.",
        "locked": "Uppladdning inte tillgänglig",
        "accepted": "Format: {accept} — högst {max}",
        "aiValid": "Kontrollerat av AI",
        "aiToValidate": "Ska kontrolleras",
        "aiRefused": "Avvisat av AI",
        "aiOn": "Analyserat {date}",
        "selected": "Vald fil",
        "validityHint": "Giltighetsdatumen som står i dokumentet.",
        "validityInverted": "Slutdatumet ligger före startdatumet.",
        "validityMissing": "Fyll i giltighetens slut innan du laddar upp filen.",
        "validityNotApplied": "Filen har laddats upp, men giltighetsdatumen sparades inte. Fyll i dem på dokumentets rad."
    },
    "components/documents/DocumentValidity#LABELS": {
        "fromTo": "Giltigt från {from} till {to}",
        "from": "Giltigt sedan {from}",
        "to": "Giltigt till {to}",
        "none": "Inget giltighetsdatum",
        "required": "Giltighet ska fyllas i",
        "expired": "Giltigheten upphörde {to}",
        "fromLabel": "Giltigt från",
        "toLabel": "Giltigt till",
        "edit": "Redigera",
        "setDates": "Fyll i",
        "save": "Spara",
        "cancel": "Avbryt",
        "saved": "Giltigheten har sparats",
        "inverted": "Slutdatumet ligger före startdatumet.",
        "hint": "Datumen som står i dokumentet du laddar upp."
    },
    "components/documents/DocumentViewer#LABELS": {
        "title": "Dokument",
        "download": "Ladda ned",
        "close": "Stäng",
        "unsupported": "Ingen förhandsvisning för den här filtypen",
        "unsupportedHint": "Formatet kan inte förhandsvisas i webbläsaren. Ladda ned filen för att läsa den.",
        "failed": "Dokumentet kunde inte visas",
        "failedHint": "Det kan fortfarande laddas ned.",
        "signed": "Elektroniskt signerat",
        "signedBy": "{name}, den {date}",
        "pending": "Signering pågår",
        "validated": "Validerat den {date}",
        "validatedBy": "Validerat av {name} den {date}"
    },
    "components/documents/ExpiryPill#LABELS": {
        "missing": "Ska lämnas in",
        "refused": "Avvisat",
        "toValidate": "Granskas",
        "valid": "Giltigt",
        "validUntil": "Giltigt till {date}",
        "expiredOn": "Gick ut {date}",
        "expiredSince": "Gick ut för {days} dagar sedan",
        "expiresToday": "Går ut i dag",
        "expiresIn": "Går ut om {days} dagar",
        "noDate": "Inget giltighetsdatum",
        "from": "Från",
        "to": "till",
        "since": "Sedan",
        "until": "Till"
    },
    "components/documents/RequirementChecklist#LABELS": {
        "mandatory": "Obligatoriskt",
        "satisfied": "Inlämnat",
        "upload": "Ladda upp",
        "renew": "Förnya",
        "replace": "Ersätt",
        "download": "Ladda ned",
        "consult": "Visa",
        "details": "Detaljer",
        "hide": "Dölj",
        "of": "{done} / {total} obligatoriska dokument",
        "allDone": "Allt är uppdaterat",
        "allDoneHint": "Inget förväntas av dig för tillfället.",
        "nothing": "Inga dokumentkrav",
        "nothingHint": "Kunden har ännu inte definierat några förväntade dokument för det här omfånget.",
        "openCount": "{count} att hantera",
        "blockingCount": "{count} obligatoriska att åtgärda",
        "category": "Kategori",
        "readOnly": "Uppladdning är stängd för det här bladet.",
        "noEntity": "Leverantörsdokument",
        "aiHints": "Analysanteckningar",
        "deposit": "Ladda upp en fil",
        "file": "Fil"
    },
    "components/documents/SignedDocumentList#LABELS": {
        "document": "Signerat dokument",
        "signedAt": "Signerat den",
        "download": "Ladda ned",
        "search": "Sök ett signerat dokument",
        "empty": "Inga signerade dokument",
        "emptyHint": "Dokument som du signerar från dina uppgifter visas här.",
        "truncated": "Ofullständig lista: alla signerade dokument kunde inte läsas."
    },
    "components/form/FieldRenderer#LABELS": {
        "add": "Lägg till ett värde",
        "remove": "Ta bort värdet"
    },
    "components/form/FormRenderer#LABELS": {
        "empty": "Inga fält att fylla i",
        "emptyHint": "Formulärets konfiguration returnerar inga fält."
    },
    "components/form/controls/AutocompleteControl#LABELS": {
        "search": "Sök…",
        "hint": "Ange namn eller kod för att filtrera",
        "loading": "Söker…",
        "noResult": "Inga resultat",
        "clear": "Rensa",
        "remove": "Ta bort",
        "browse": "Visa värden",
        "error": "Sökningen misslyckades",
        "errorUnconfigured": "Fältet har ingen konfigurerad värdelista. Meddela din kontaktperson hos kunden.",
        "showing": "Visar poster 1 - {count} av {total}",
        "favourite": "Favorit"
    },
    "components/form/controls/BooleanControl#LABELS": {
        "yes": "Ja",
        "no": "Nej",
        "empty": "(tomt)"
    },
    "components/form/controls/MlTextControl#LABELS": {
        "more": "{count} andra språk",
        "less": "Dölj de andra språken",
        "required": "krävs av kunden",
        "missing": "{count} obligatoriska språk är fortfarande tomma"
    },
    "components/form/controls/NumberUnitControl#DURATION_SYMBOLS": {
        "d": "dagar",
        "mo": "månader",
        "y": "år"
    },
    "components/form/controls/NumberUnitControl#LABELS": {
        "unit": "Enhet"
    },
    "components/form/controls/ReadOnlyControl#LABELS": {
        "yes": "Ja",
        "no": "Nej",
        "empty": "—"
    },
    "components/form/controls/SelectControl#LABELS": {
        "placeholder": "Välj…",
        "offList": "värdet finns inte i listan",
        "empty": "Inga värden att välja"
    },
    "components/form/controls/SizeControl#LABELS": {
        "bytes": "byte"
    },
    "components/form/validation#VALIDATION_MESSAGES": {
        "validation.required": "Fältet är obligatoriskt.",
        "validation.number": "Ange ett tal.",
        "validation.integer": "Ange ett heltal.",
        "validation.date": "Ange ett giltigt datum.",
        "validation.boolean": "Ange ja eller nej.",
        "validation.list": "Välj ett värde i listan.",
        "validation.regex": "Det förväntade formatet följs inte.",
        "validation.min": "Värdet måste vara större än eller lika med {min}.",
        "validation.max": "Värdet måste vara mindre än eller lika med {max}.",
        "validation.range": "Värdet måste ligga mellan {min} och {max}.",
        "validation.minLength": "Ange minst {min} tecken.",
        "validation.maxLength": "Ange högst {max} tecken."
    },
    "components/monitor/BulkActionBar#LABELS": {
        "selected": "{count} leverantör vald",
        "selectedPlural": "{count} leverantörer valda",
        "clear": "Rensa urvalet",
        "overflow": "Endast de första {max} behandlas.",
        "loading": "Läser in åtgärder…",
        "unavailable": "Inga åtgärder är tillgängliga för din profil.",
        "actions": {
            "remind": "Påminn",
            "escalate": "Eskalera",
            "suspend": "Stäng av"
        },
        "targets": "Berörda leverantörer",
        "report": "Resultat av åtgärden",
        "reportOk": "{count} leverantör(er) behandlade.",
        "reportKo": "{count} misslyckande(n):",
        "reportSkipped": "{count} leverantör(er) utelämnade: över gränsen på {max}.",
        "reportNone": "Ingen leverantör behandlades.",
        "close": "Stäng",
        "errors": {
            "notFound": "Leverantören ligger utanför ditt omfång"
        }
    },
    "components/monitor/CampaignList#LABELS": {
        "columns": {
            "campaign": "Projekt",
            "suppliers": "Leverantörer",
            "response": "Svarsfrekvens",
            "age": "Ålder",
            "silence": "Senaste påminnelse",
            "due": "Förfallodatum",
            "reminders": "Påminnelser",
            "follow": "Uppföljning",
            "manager": "Ansvarig"
        },
        "days": "{count} d",
        "since": "Öppet i {count} d",
        "lastActivity": "Senaste aktivitet {date}",
        "silenceDays": "för {count} d sedan",
        "silenceToday": "I dag",
        "silenceHint": "beCPG för ingen påminnelselogg: kolumnen visar den senaste aktiviteten i projektet (cm:modified), det närmaste faktum som faktiskt finns tillgängligt.",
        "noSilence": "Ingen daterad aktivitet",
        "noAnswer": "Inget svar",
        "late": "Försenat",
        "onTrack": "Enligt plan",
        "toRemind": "Att påminna",
        "toEscalate": "Att eskalera",
        "lateTasks": "{late} / {open} uppgift(er) försenade",
        "noTasks": "Inga öppna uppgifter",
        "dueIn": "Om {count} d",
        "overdue": "{count} d försenat",
        "noDue": "Inget förfallodatum",
        "others": "+{count}",
        "empty": "Inga öppna projekt i det här omfånget",
        "projectStates": {
            "Planned": "Planerat",
            "InProgress": "Pågår",
            "OnHold": "Pausat",
            "Completed": "Slutfört",
            "Cancelled": "Avbrutet"
        }
    },
    "components/monitor/DocumentMatrix#LABELS": {
        "supplier": "Leverantör",
        "types": "{count} dokumenttyp(er)",
        "notApplicable": "Gäller inte den här leverantören",
        "mandatory": "Obligatoriskt",
        "legend": "Teckenförklaring",
        "expected": "{count} förväntade",
        "selectRow": "Välj {name}",
        "selectCell": "Välj {type} för {name}",
        "download": "Ladda ned",
        "preview": "Visa",
        "empty": "Inga leverantörer i det här omfånget",
        "emptyHint": "Vidga filtren för att se matrisen.",
        "noColumns": "Ingen dokumenttyp är materialiserad i det här omfånget",
        "noColumnsHint": "beCPG materialiserar förväntade dokument vid formuleringen: utan konfigurerade dokumentkrav är matrisen tom.",
        "toggle": "Visa dokument",
        "summary": "{missing} saknas · {expired} utgångna · {expiring} ska förnyas"
    },
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Valid": "Giltig",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Simulation": "Simulering",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.ToValidate": "Ska valideras",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Refused": "Avvisad",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Archived": "Arkiverad",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Stopped": "Stoppad",
    "components/monitor/MonitorFilters#LABELS": {
        "search": "Sök en leverantör, en kod, ett juridiskt namn…",
        "toggle": "Fler filter",
        "reset": "Återställ",
        "close": "Dölj filtren",
        "legend": "Filter för leverantörsbasen",
        "family": "Familj",
        "subFamily": "Underfamilj",
        "site": "Anläggning",
        "subsidiary": "Dotterbolag",
        "market": "Marknad",
        "state": "Leverantörsstatus",
        "any": "Alla",
        "windowScoped": "begränsat till fönstret",
        "windowScopedHelp": "Alfresco indexerar inte associationer: filtret gäller de leverantörer som redan lästs, inte hela leverantörsbasen.",
        "unsupported": "inte konfigurerat",
        "unsupportedHelp": "Ingen standardegenskap i beCPG bär det här begreppet. Aktivera det på kundsidan genom att ange egenskapen i uppföljningskonfigurationen.",
        "noVocabulary": "Inga värden i det inlästa omfånget",
        "active": "{count} aktivt filter",
        "activePlural": "{count} aktiva filter",
        "clearOne": "Ta bort filtret",
        "anyFamily": "Alla familjer",
        "anySubFamily": "Alla underfamiljer",
        "anyState": "Alla statusar"
    },
    "components/monitor/NonConformityList#LABELS": {
        "columns": {
            "nc": "Avvikelse",
            "suppliers": "Leverantörer",
            "state": "Status",
            "priority": "Prioritet",
            "delay": "Handläggningstid",
            "actions": "Korrigerande åtgärder",
            "cost": "Kostnad"
        },
        "states": {
            "new": "Ny",
            "analysis": "Analys",
            "treatment": "Åtgärd",
            "response": "Svar",
            "classification": "Klassificering",
            "closing": "Avslutning",
            "closed": "Stängd"
        },
        "types": {
            "NonConformity": "Avvikelse",
            "Claim": "Reklamation"
        },
        "priorities": {
            "1": "Hög",
            "2": "Medel",
            "3": "Låg"
        },
        "blocking": "Blockerande",
        "blockingHint": "Hög prioritet och fortfarande öppen: det är detta som ger den härledda godkännandestatusen ”avstängd” (beräknad, lagras aldrig).",
        "days": "{count} d",
        "openSince": "Öppen i {count} d",
        "overdue": "Över handläggningsmålet",
        "closedIn": "Hanterad på {count} d",
        "closedApprox": "beCPG lagrar inget stängningsdatum: tiden för en stängd avvikelse mäts mellan dess skapande och dess senaste ändring.",
        "createdOn": "Skapad {date}",
        "noDelay": "Inget skapandedatum",
        "actionsCount": "{done} / {total}",
        "actionsLate": "{count} försenade",
        "noActions": "Inga åtgärder",
        "noActionsHint": "Ingen åtgärdsuppgift är kopplad till den här avvikelsen i beCPG — handlingsplanen är inte öppnad ännu.",
        "actionState": {
            "done": "klar",
            "late": "försenad",
            "open": "pågår"
        },
        "andMore": "… och {count} till",
        "others": "+{count}",
        "noSupplier": "Ingen kopplad leverantör",
        "empty": "Inga avvikelser i det här omfånget",
        "open": "Öppna avvikelsen",
        "detail": {
            "description": "Beskrivning",
            "comment": "Kvalitetskommentar",
            "noText": "Avvikelsen har varken beskrivning eller kommentar i beCPG.",
            "facts": "Fakta",
            "actions": "Korrigerande åtgärder",
            "noActions": "Ingen öppen korrigerande åtgärd.",
            "suppliers": "Berörda leverantörer",
            "discussion": "Diskussion",
            "created": "Skapad",
            "modified": "Senast ändrad",
            "cost": "Kostnad",
            "priority": "Prioritet",
            "state": "Status",
            "type": "Typ"
        }
    },
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.quality.label": "Kvalitet",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.quality.focus": "Dokumentefterlevnad, avvikelser, certifieringar, revisioner",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.purchasing.label": "Inköp",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.purchasing.focus": "Godkännandestatus (blockerar beställning), poäng, svarstid",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.rnd.label": "FoU",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.rnd.focus": "Fullständighet i tekniska data, kataloger, specifikationer",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.csr.label": "CSR",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.csr.focus": "Certifieringar, ursprung, CSR-frågeformulär",
    "components/monitor/ProfileSwitcher#LABELS": {
        "legend": "Verksamhetsvy",
        "hint": "Samma leverantörsbas, fyra perspektiv. Ändrar ordningen på korten och kolumnerna."
    },
    "components/monitor/RiskList#RISK_REASONS.documentExpired": "{count} utgångna dokument",
    "components/monitor/RiskList#RISK_REASONS.documentExpiring": "{count} dokument som snart går ut",
    "components/monitor/RiskList#RISK_REASONS.documentMissing": "{count} saknade dokument",
    "components/monitor/RiskList#RISK_REASONS.blockingNc": "{count} blockerande NC",
    "components/monitor/RiskList#RISK_REASONS.openNc": "{count} öppna NC",
    "components/monitor/RiskList#RISK_REASONS.campaignNoAnswer": "{count} projekt utan svar",
    "components/monitor/RiskList#RISK_REASONS.lateTask": "{count} försenade uppgift(er)",
    "components/monitor/RiskList#RISK_REASONS.lowCompletion": "Låg fullständighet ({score} %)",
    "components/monitor/RiskList#RISK_REASONS.scoreDropping": "Sjunkande poäng",
    "components/monitor/RiskList#RISK_REASONS.openProject": "{count} listning(ar) pågår",
    "components/monitor/RiskList#RISK_REASONS.blockingCatalog": "Blockerande katalog inte uppfylld",
    "components/monitor/RiskList#RISK_LEVELS.critical": "Kritisk",
    "components/monitor/RiskList#RISK_LEVELS.high": "Hög",
    "components/monitor/RiskList#RISK_LEVELS.medium": "Medel",
    "components/monitor/RiskList#RISK_LEVELS.low": "Låg",
    "components/monitor/RiskList#LABELS": {
        "title": "Topp 10 leverantörer i riskzonen",
        "empty": "Inga leverantörer i riskzonen i det här omfånget",
        "emptyHint": "Inga utgångna dokument, blockerande NC eller obesvarade projekt upptäcktes.",
        "riskScore": "Riskpoäng {score}",
        "level": "Risk: {level}",
        "lastActivity": "Senaste aktivitet {date}",
        "completion": "Fullständighet {value} %",
        "openSheet": "Öppna bladet",
        "actions": {
            "remind": "Påminn",
            "escalate": "Eskalera",
            "suspend": "Stäng av"
        },
        "dialog": {
            "remindTitle": "Påminn {target}",
            "escalateTitle": "Eskalera {target}",
            "suspendTitle": "Stäng av {target}",
            "messageLabel": "Meddelande",
            "messageHelp": "Publiceras i leverantörens diskussionstråd, som leverantören läser i portalen och i beCPG.",
            "escalateHelp": "Publiceras internt i leverantörens öppna projekt, aldrig i tråden som leverantören läser.",
            "messageLang": "Meddelandets språk",
            "supplierLang": "leverantörens språk",
            "messageRequired": "Ett meddelande krävs.",
            "suspendWarning": "Godkännandestatusen härleds löpande och lagras aldrig: den här åtgärden skriver inte ”avstängd”. Den startar kundens avstängningsprocess. När beCPG har den blockerande avvikelsen ändras statusen av sig själv.",
            "suspendIrreversible": "En startad process kan inte avbrytas från portalen. Kontrollera urvalet.",
            "process": "Process att starta",
            "noProcess": "Ingen avstängningsprocess är tillåten på den här instansen (PORTAL_PROCESS_TEMPLATES).",
            "targets": "{count} berörda leverantör(er):",
            "send": "Skicka",
            "suspendConfirm": "Starta avstängningen"
        },
        "result": {
            "ok": "{count} åtgärd(er) utförda.",
            "partial": "{ok} lyckades, {failed} misslyckades.",
            "failed": "Ingen åtgärd lyckades."
        },
        "defaults": {
            "remind": "Hej,\n\nDin leverantörsakt behöver uppdateras: {reasons}.\nLogga in i portalen för att komplettera den.\n\nMed vänliga hälsningar,",
            "escalate": "Eskalering: leverantörsakten har fortfarande avvikelser ({reasons}) trots påminnelserna.\nVänligen ta över ärendet.",
            "genericReasons": "väntande dokument och tidsfrister"
        }
    },
    "components/monitor/StartCampaignDialog#LABELS": {
        "title": "Starta ett projekt",
        "supplier": "Leverantör",
        "supplierPlaceholder": "Välj en leverantör…",
        "scope": "Omfång",
        "scopeSupplier": "Själva leverantörsposten",
        "scopeAll": "Alla produkter från den här leverantören",
        "scopeOne": "En produkt",
        "entity": "Produkt",
        "entityPlaceholder": "Välj en produkt…",
        "process": "Projektmall",
        "processPlaceholder": "Välj en mall…",
        "start": "Starta",
        "cancel": "Avbryt",
        "starting": "Startar…",
        "noEntity": "Ingen produkt är kopplad till den här leverantören: inget att skicka.",
        "noProcess": "Ingen projektmall är öppen för portalen på den här instansen.",
        "countAll": "{count} produkt(er) skickas, ett projekt per produkt.",
        "done": "{count} projekt startade",
        "partial": "{done} startade, {failed} misslyckades",
        "failedTitle": "Följande produkter startades inte",
        "countTruncated": "Endast {count} av {total} produkter kan listas här: dessa, och endast dessa, skickas.",
        "suppliersTruncated": "Endast {count} av {total} leverantörer visas. Starta projektet från leverantörens sida om den inte finns i listan.",
        "atLeast": "minst {count}",
        "loadFailed": "Listan kunde inte läsas in.",
        "retry": "Försök igen"
    },
    "components/monitor/SupplierScorecard#LABELS": {
        "title": "Resultatkort",
        "subtitle": "Kriterier, vikter och poäng — konfigurerade på kundsidan",
        "weighted": "Viktad poäng",
        "weightedHint": "{count} kriterier · total vikt {weight}",
        "criterion": "Kriterium",
        "weight": "vikt {weight}",
        "weightShare": "{share} % av totalen",
        "range": "skala {range}",
        "noScore": "Ej poängsatt",
        "scaleNote": "Skalan härleds från konfigurationen (eller från den högsta observerade poängen): råpoängen visas alltid.",
        "unavailable": "Inget resultatkort för den här leverantören",
        "unavailableHint": "Resultatkorten bygger på poängen i leverantörsprojekten. Inget poängsatt projekt hittades i ditt omfång.",
        "completion": "Katalogens fullständighet",
        "completionSubtitle": "De kataloger som är aktiva på leverantörens entiteter",
        "completionEmpty": "Ingen aktiv katalog för den här leverantören",
        "completionScore": "Genomsnittlig fullständighet",
        "approval": "Godkännandestatus",
        "approvalDerived": "Beräknas om vid varje visning",
        "history": "Trend",
        "historyUnavailable": "Historik är inte tillgänglig",
        "historyWhy": "beCPG:s beslutsstödsmodul kunde inte leverera historiken.",
        "historyWhyBy": {
            "supplierAxisUnavailable": "BI-modulen är i drift men skiljer ännu inte på leverantörer: leverantörsdimensionen måste läggas till i kuben och schemat läsas in på nytt.",
            "supplierUnresolved": "Leverantören finns ännu inte i BI-modulen: den visas vid nästa ombyggnad.",
            "noData": "BI-modulen känner till leverantören men har ännu inga punkter för perioden: historiken fylls på allteftersom data tillförs.",
            "unknownQuery": "Den begärda serien är inte deklarerad i portalen: ett konfigurationsfel, inte saknade data.",
            "unreachable": "beCPG:s beslutsstödsmodul svarar inte: den är avaktiverad på denna instans eller servern kan inte nås.",
            "denied": "Ditt konto har ingen åtkomst till beCPG:s beslutsstödsmodul."
        },
        "historyNeeds": "Vad BI-sidan behöver för att aktivera den",
        "dimensions": "Dimensioner",
        "measures": "Mått",
        "statusPartial": "delvis",
        "statusMissing": "ska skapas",
        "trendLast": "Senaste punkt: {value} den {date}",
        "trendCaption": "Viktad poäng över tid"
    },
    "components/monitor/SupplierTable#LABELS": {
        "caption": "Leverantörer i leverantörsbasen, godkännandestatus och härledda indikatorer",
        "columns": {
            "name": "Leverantör",
            "code": "Kod",
            "status": "Godkännande",
            "risk": "Risk",
            "completion": "Fullständighet",
            "documentsExpired": "Utgångna dok.",
            "documentsExpiring": "Dok. som går ut",
            "documentsMissing": "Saknade dok.",
            "openNc": "Öppna NC",
            "openProjects": "Projekt",
            "family": "Familj",
            "sites": "Anläggningar",
            "lastActivity": "Senaste aktivitet"
        },
        "metrics": {
            "documentsExpired": "{count} obligatoriska dokument har gått ut",
            "documentsExpiring": "{count} dokument närmar sig utgångsdatum",
            "documentsMissing": "{count} obligatoriska dokument har inte lämnats in",
            "openNc": "{count} öppna avvikelse(r)",
            "openProjects": "{count} öppna projekt"
        },
        "none": "—",
        "empty": "Inga leverantörer i det här omfånget",
        "emptyHint": "Vidga filtren, eller kontrollera ditt inköparomfång.",
        "emptyFiltered": "Ingen leverantör matchar dessa filter.",
        "compare": "Jämför",
        "compareTitle": "Jämförelse av {count} leverantörer",
        "compareCapped": "Jämförelsen är begränsad till de första {max} valda leverantörerna — därutöver blir kolumnerna oläsliga.",
        "compareRows": {
            "status": "Godkännandestatus",
            "reasons": "Orsaker",
            "risk": "Riskpoäng",
            "completion": "Fullständighet (kataloger)",
            "documentsExpired": "Utgångna dokument",
            "documentsExpiring": "Dokument som snart går ut",
            "documentsMissing": "Saknade dokument",
            "openNc": "Öppna NC",
            "openProjects": "Öppna projekt",
            "state": "Status i beCPG",
            "family": "Familj",
            "sites": "Anläggningar",
            "lastActivity": "Senaste aktivitet"
        },
        "openSheet": "Öppna bladet",
        "selected": "{count} valda",
        "clear": "Rensa urvalet",
        "close": "Stäng",
        "noReason": "Ingen riskorsak"
    },
    "components/monitor/cockpit/AssistantTab#LABELS": {
        "priorities": "Veckans prioriteringar",
        "prioritiesHelp": "Beräknas med regler på leverantörerna med högst risk: kritisk risk med blockerande avvikelse, eskaleras; utgånget dokument, minst fem saknade dokument eller projekt utan svar, påminns.",
        "kinds": {
            "escalate": "Att eskalera",
            "remind": "Att påminna"
        },
        "score": "Risk {score}",
        "openSheet": "Öppna kortet",
        "none": "Inga prioriteringar denna vecka i detta urval.",
        "copilot": "Copilot",
        "wire": "Ska kopplas i beCPG",
        "copilotSoon": "Copiloten svarar på frågor om din leverantörsbas när den har kopplats till beCPG-assistenten.",
        "ask": "Ställ en fråga om din leverantörsbas…",
        "askLabel": "Fråga till copiloten"
    },
    "components/monitor/cockpit/CsrTab#LABELS": {
        "expected": "Förväntade certifikat",
        "expectedHelp": "Dokumenttyper vars benämning innehåller ”certifikat”, en per berörd leverantör.",
        "valid": "Giltiga certifikat",
        "outOf": "/ {total}",
        "origins": "Angivna ursprung",
        "surveys": "Hållbarhetsenkäter",
        "notWired": "beCPG exponerar ännu inte denna information för portalen.",
        "byType": "Efterlevnad per dokumenttyp",
        "byTypeAria": "Dokumentstatus per typ",
        "byTypeHelp": "För varje dokumenttyp en status per berörd leverantör: den minst gynnsamma bland dess dokument.",
        "map": "Försörjningens ursprung",
        "mapEmpty": "Karta över ursprungsländer och leverantörernas anläggningar.",
        "csv": {
            "type": "Dokumenttyp",
            "expected": "Förväntade"
        }
    },
    "components/monitor/cockpit/PurchasingTab#LABELS": {
        "approved": "Godkända leverantörer",
        "outOf": "/ {total}",
        "openProjects": "Öppna projekt",
        "answered": "Besvarade",
        "unanswered": "Obesvarade",
        "openProjectsHelp": "Öppna leverantörsprojekt i hela instansen: ett projekt ligger inte under en leverantör, så filtren för leverantörsbasen gäller inte.",
        "responseRate": "Svarsfrekvens",
        "meanCompletion": "Genomsnittlig framdrift {value} %",
        "lateTasks": "Försenade uppgifter",
        "lateProjects": "{count} försenade projekt",
        "composition": "Leverantörsbasens sammansättning",
        "compositionAria": "Leverantörer per familj, underfamilj och godkännandestatus",
        "compositionHelp": "Inre ring: familjer. Mellersta ring: underfamiljer. Yttre ring: godkännandestatus. Klicka på en familj för att fälla ut den.",
        "reactivity": "Leverantörernas reaktionsförmåga",
        "reactivityAria": "Uppgifter per år och genomsnittlig svarstid",
        "reactivityHelp": "Staplar: uppgifter i leverantörsprojekt per slutår (logaritmisk skala). Linje: genomsnittlig svarstid i dagar.",
        "tasks": "Uppgifter",
        "delay": "Genomsn. svarstid (d)",
        "days": "Dagar",
        "taskStates": "Uppgifter i leverantörsprojekt",
        "taskStatesAria": "Uppgifter per status",
        "taskStatesHelp": "Alla uppgifter i leverantörsprojekt lästa från beslutsstödsmodulen, per status (logaritmisk skala)."
    },
    "components/monitor/cockpit/QualityTab#LABELS": {
        "health": "Leverantörsbasens hälsa",
        "healthAria": "Hälsoindex {value} av 100",
        "healthOutOf": "av 100",
        "healthHelp": "Index av 100: 35 % godkännandegrad, 35 % dokumentefterlevnad, 20 % svarsfrekvens på projekt, 10 % andel leverantörer utan blockerande avvikelse.",
        "healthPartial": "Partiell beräkning, vikter omfördelade: {missing} saknas.",
        "weights": {
            "approval": "Godkännande {weight} %",
            "compliance": "Efterlevnad {weight} %",
            "response": "Svar {weight} %",
            "noBlockingNc": "Utan blockerande avvikelse {weight} %"
        },
        "inputs": {
            "approval": "godkännandegrad",
            "compliance": "dokumentefterlevnad",
            "response": "svarsfrekvens",
            "noBlockingNc": "andel utan blockerande avvikelse"
        },
        "compliance": "Dokumentefterlevnad",
        "compliant": "Uppfyllda",
        "complianceHelp": "Giltiga obligatoriska dokument i förhållande till de obligatoriska dokument som förväntas i urvalet.",
        "complianceNoRate": "Andelen saknas: en räknare nådde läsgränsen i beCPG.",
        "openNc": "Öppna avvikelser",
        "suspended": "Avstängda leverantörer",
        "outOf": "/ {total}",
        "toReview": "Dokument att granska",
        "toReviewHelp": "Dokument att validera och utgångna dokument, ett per leverantör och dokumenttyp.",
        "riskMap": "Riskkarta",
        "riskMapAria": "Leverantörer efter riskpoäng och öppna projekt",
        "riskMapHelp": "Vågrätt: öppna projekt. Lodrätt: riskpoäng. Storlek: avvikelser (saknade och utgångna dokument, blockerande avvikelser). Klicka på en leverantör för att öppna dess kort.",
        "openProjects": "Öppna projekt",
        "riskScore": "Riskpoäng",
        "anomalies": "Storlek: avvikelser",
        "priorities": "Prioriterat område",
        "bubble": "Risk {score} · {projects} öppna projekt · {anomalies} avvikelse(r)",
        "ncAge": "Ålder på öppna avvikelser",
        "ncAgeAria": "Öppna avvikelser efter ålder",
        "ncUndated": "{count} avvikelse(r) utan skapandedatum",
        "csv": {
            "rank": "Rang",
            "supplier": "Leverantör",
            "code": "Kod",
            "status": "Godkännande",
            "level": "Risknivå",
            "score": "Riskpoäng",
            "reasons": "Orsaker",
            "openProjects": "Öppna projekt",
            "anomalies": "Avvikelser"
        }
    },
    "components/monitor/cockpit/RndTab#LABELS": {
        "progress": "Genomsnittlig framdrift {year}",
        "progressNoYear": "Genomsnittlig framdrift",
        "projects": "{count} projekt",
        "tasksInProgress": "Pågående uppgifter",
        "tasksPlanned": "{count} planerade",
        "technicalSheets": "Saknade tekniska datablad",
        "technicalSheetsHint": "{toValidate} att validera · {expired} utgångna",
        "technicalSheetsHelp": "Dokumenttyper vars benämning innehåller ”tekniskt datablad”, en per berörd leverantör.",
        "activeFiles": "Aktiva ärenden",
        "activeSince": "Senaste aktivitet sedan {date}",
        "activeHelp": "Leverantörer ändrade sedan början av föregående kvartal.",
        "projectProgress": "Projektens framdrift",
        "projectProgressAria": "Antal projekt och genomsnittlig framdrift per år",
        "projectProgressHelp": "Staplar: projekt per år för senaste ändring. Linje: genomsnittlig framdrift i %.",
        "projectsSeries": "Projekt",
        "averageSeries": "Genomsn. framdrift (%)",
        "landscape": "Leverantörslandskap",
        "landscapeAria": "Leverantörer per familj och godkännandestatus",
        "landscapeHelp": "Leverantörer per familj och godkännandestatus. 3D-vy när webbläsaren tillåter det, annars grupperade staplar.",
        "freshness": "Ärendenas aktualitet",
        "freshnessAria": "Leverantörer per månad för senaste aktivitet",
        "recent": "Aktiva sedan {date}",
        "older": "Äldre",
        "undated": "{count} leverantör(er) utan aktivitetsdatum",
        "fromCube": "Läst från beCPG:s beslutsstödsmodul, som fylls på i batch."
    },
    "components/monitor/cockpit/parts#LABELS": {
        "export": "Exportera",
        "soon": "Ska kopplas",
        "decisionModule": "Beslutsstödsmodul",
        "chartFailed": "Diagrammet kunde inte läsas in.",
        "window": "Genomsökningsfönster: siffrorna avser de lästa leverantörerna.",
        "unavailable": "Data saknas",
        "empty": "Inget att visa",
        "reasons": {
            "denied": "beCPG nekade åtkomst till denna information.",
            "notFound": "Informationen hittades inte i beCPG.",
            "unavailable": "beCPG svarade inte för detta block. Försök igen om en stund.",
            "noMatchingDocumentType": "Ingen matchande dokumenttyp i detta urval.",
            "noData": "Inga data för detta urval."
        }
    },
    "components/monitor/cockpit/vocabulary#VOCABULARY": {
        "approval": {
            "approved": "Godkända",
            "inProgress": "Pågående",
            "toRenew": "Att förnya",
            "suspended": "Avstängda"
        },
        "documents": {
            "valid": "Giltiga",
            "expiring": "Går snart ut",
            "toValidate": "Att validera",
            "expired": "Utgångna",
            "refused": "Avvisade",
            "missing": "Saknas"
        },
        "taskStates": {
            "planned": "Planerade",
            "inProgress": "Pågående",
            "completed": "Slutförda",
            "cancelled": "Avbrutna",
            "refused": "Avvisade",
            "onHold": "Väntande"
        },
        "ncAges": {
            "under3Months": "< 3 månader",
            "from3To12Months": "3-12 månader",
            "from1To2Years": "1-2 år",
            "over2Years": "> 2 år"
        },
        "nc": {
            "blocking": "Blockerande",
            "nonBlocking": "Ej blockerande"
        },
        "noFamily": "Utan familj",
        "noSubFamily": "Utan underfamilj"
    },
    "components/monitor/supplier/ActivityChart#LABELS": {
        "tasks": "Uppgifter",
        "delay": "Genomsnittlig svarstid (d)",
        "days": "d",
        "aria": "Uppgifter och genomsnittlig svarstid per år för den här leverantören"
    },
    "components/monitor/supplier/RiskScore#LABELS": {
        "ring": "Riskpoäng {score} av 100, nivå {level}",
        "none": "Ingen riskorsak",
        "scale": "Nivåskala",
        "contributions": "Vad poängen består av",
        "points": "+{points}"
    },
    "components/monitor/supplier/SheetLists#LABELS": {
        "documents": {
            "search": "Sök ett dokument",
            "document": "Dokument",
            "mandatory": "Obligatoriskt",
            "validity": "Giltighet",
            "status": "Status",
            "entity": "Kopplat till",
            "download": "Ladda ned",
            "empty": "Inga dokument förväntade eller inlämnade",
            "file": "leverantor-dokument",
            "yes": "Ja",
            "no": "Nej"
        },
        "products": {
            "search": "Sök en produkt",
            "product": "Produkt",
            "code": "Kod",
            "state": "Status",
            "completion": "Fullständighet",
            "modified": "Uppdaterad",
            "empty": "Ingen kopplad produkt",
            "file": "leverantor-produkter"
        },
        "subSuppliers": {
            "search": "Sök en underleverantör",
            "supplier": "Underleverantör",
            "code": "Kod",
            "state": "beCPG-status",
            "file": "underleverantorer"
        },
        "activity": {
            "empty": "Ingen kommunikation registrerad",
            "message": "Meddelande",
            "activity": "Aktivitet"
        },
        "unavailable": "beCPG kunde inte hämta den här listan: den säger ingenting om leverantören."
    },
    "components/monitor/supplier/StatusLadder#LABELS": {
        "current": "Uppfylld regel",
        "next": "Sedan",
        "approvedWhen": "Godkänd när",
        "approvedNow": "Alla villkor är uppfyllda",
        "seeAll": "Visa alla {count}",
        "days": "{count} d",
        "on": "på {name}",
        "conditions": {
            "documentExpired": "Inget obligatoriskt dokument har gått ut",
            "blockingNc": "Ingen blockerande NC",
            "documentExpiring": "Inget dokument att förnya",
            "openProject": "Inget öppet projekt",
            "documentMissing": "Inget obligatoriskt dokument saknas",
            "blockingCatalog": "Blockerande kataloger uppfyllda"
        },
        "met": "uppfyllt",
        "unmet": "ej uppfyllt",
        "progress": "{met} av {total} villkor uppfyllda"
    },
    "components/monitor/supplier/SupplierBand#LABELS": {
        "erp": "ERP {code}",
        "risk": "Risk {level} · {score}",
        "created": "Skapad",
        "lastActivity": "Senaste aktivitet",
        "startProject": "Starta ett projekt",
        "openInBecpg": "Öppna i beCPG",
        "actions": "Leverantörsåtgärder",
        "parent": "Del av",
        "group": "{count} underleverantör(er)"
    },
    "components/products/CatalogPanel#LABELS": {
        "title": "Efterlevnad",
        "overall": "Ifyllnadsgrad",
        "complete": "Fullständig",
        "incomplete": "Ofullständig",
        "missing": "Saknade fält",
        "missingCount": "{count} saknade fält",
        "duplicates": "Värden som redan används",
        "duplicateOn": "Används redan av",
        "duplicateUnnamed": "{count} annan/andra produkt(er)",
        "protectedFields": "{count} fält i den här katalogen fylls i av kunden",
        "protectedFieldsHint": "De räknas in i poängen men efterfrågas inte av dig: du kan inte fylla i dem, det gör kunden.",
        "none": "Ingen tillämplig katalog",
        "noneHint": "Ingen efterlevnadskatalog är konfigurerad för den här produkten, så det finns ingen fullständighetskontroll att klara.",
        "allComplete": "Alla kataloger är fullständiga",
        "allCompleteHint": "Inget blockerar valideringen av produkten när det gäller data.",
        "missingHint": "Fyll i fälten nedan för att nå 100 % — det är de som håller tillbaka valideringen.",
        "goToField": "Gå till fältet",
        "notScored": "Ej poängsatt"
    },
    "components/products/CompletionMeter#LABELS": {
        "title": "Fullständighet",
        "noScore": "Ännu inte bedömd",
        "notCounted": "ingår inte i poängen",
        "more": "+ {count} katalog(er) till"
    },
    "components/products/ProductHeader#LABELS": {
        "code": "Kod",
        "branch": "Uppdatering pågår",
        "branchFrom": "Uppdatering av version {version}",
        "branchTitle": "Bladet är en arbetskopia som skapats för listningen.",
        "branchTitleLocked": "Bladet är den arbetskopia som skapats för listningen. Den godkända versionen finns hos kunden, men du har ingen läsbehörighet till den.",
        "erpCode": "ERP-kod",
        "supplier": "Leverantör",
        "subsidiary": "Dotterbolag",
        "project": "Projekt",
        "modified": "Uppdaterad",
        "created": "Skapad",
        "version": "Version",
        "legalName": "Juridiskt namn",
        "back": "Mina produkter",
        "types": {
            "bcpg:rawMaterial": "Råvara",
            "bcpg:finishedProduct": "Färdig produkt",
            "bcpg:semiFinishedProduct": "Halvfabrikat",
            "bcpg:localSemiFinishedProduct": "Lokalt halvfabrikat",
            "bcpg:packagingMaterial": "Förpackning",
            "bcpg:packagingKit": "Förpackningssats",
            "bcpg:supplier": "Leverantör",
            "bcpg:productSpecification": "Specifikation",
            "qa:nc": "Avvikelse"
        }
    },
    "components/products/ProductSections#LABELS": {
        "sheet": "Blad",
        "compliance": "Efterlevnad",
        "documents": "Dokument",
        "specs": "Specifikationer",
        "sections": "Bladets avsnitt",
        "noProperties": "Inga egenskaper att visa",
        "noPropertiesHint": "Produktens egenskaper exponeras inte av guidens konfiguration.",
        "rawProperties": "Egenskaper",
        "rawNotice": "Tekniska etiketter: guidens konfiguration är inte tillgänglig för den här produkten.",
        "noData": "Inga data inlämnade",
        "noDataHint": "Avsnittet innehåller inga rader för den här produkten.",
        "configTitle": "Konfigurationen är inte tillgänglig",
        "configHint": "Avsnittets konfiguration kunde inte läsas in. De andra flikarna är fortfarande tillgängliga.",
        "yes": "Ja",
        "no": "Nej"
    },
    "components/products/ProductTaskBanner#LABELS": {
        "one": "En uppgift är öppen för det här bladet",
        "many": "Flera uppgifter är öppna för det här bladet",
        "open": "Öppna uppgiften",
        "all": "Visa produktens uppgifter",
        "untitled": "Uppgift utan titel"
    },
    "components/products/UpdateRequestDialog#LABELS": {
        "title": "Begär en uppdatering",
        "intro": "Din kund tar emot begäran och hanterar den som en listning: du får en uppgift att uppdatera bladet, som kunden sedan godkänner. Inget ändras förrän dess.",
        "template": "Typ av begäran",
        "templatePlaceholder": "Välj…",
        "noTemplate": "Din kund har inte öppnat någon typ av begäran för leverantörer. Skriv till kunden via Meddelanden.",
        "reason": "Orsak till begäran",
        "reasonHint": "Nytt recept, nytt ursprung, ny produktionsanläggning, nytt produktblad…",
        "file": "Nytt produktblad (valfritt)",
        "submit": "Skicka begäran",
        "sent": "Begäran skickad. En uppdateringsuppgift har öppnats åt dig.",
        "sentFileFailed": "Begäran skickad, men produktbladet kunde inte laddas upp: ladda upp det från uppgiften."
    },
    "components/shell/Header#LOCAL_LABELS": {
        "menu": "Öppna menyn",
        "account": "Mitt konto",
        "home": "beCPG — portalens startsida"
    },
    "components/shell/Nav#LOCAL_LABELS": {
        "more": "Mer",
        "menu": "Meny",
        "close": "Stäng menyn",
        "supplierSpace": "Leverantörsutrymme",
        "monitorSpace": "Uppföljningsyta",
        "collapse": "Fäll ihop menyn",
        "expand": "Fäll ut menyn"
    },
    "components/shell/NotificationBell#LOCAL": {
        "open": "Aviseringar",
        "panel": "Aviseringar",
        "close": "Stäng",
        "refresh": "Uppdatera",
        "markRead": "Markera som läst",
        "countOne": "1 väntande avisering",
        "countMany": "{count} väntande aviseringar",
        "countNone": "Inga aviseringar",
        "updatedAt": "Uppdaterad kl. {time}",
        "more": "och {count} till — se ”Mina dokument” och ”Mina uppgifter”",
        "moreTasks": "och {count} till — se ”Mina uppgifter”",
        "allTasks": "Mina uppgifter",
        "allDocuments": "Mina dokument"
    },
    "components/shell/SupplierSwitcher#LABELS": {
        "all": "Alla leverantörer",
        "change": "Byt leverantör",
        "current": "Vald leverantör",
        "group": "Mina leverantörsblad",
        "scope": "Omfång"
    },
    "components/signature/PdfViewer#LABELS": {
        "previous": "Föregående sida",
        "next": "Nästa sida",
        "page": "Sida",
        "of": "av {pages}",
        "zoomIn": "Zooma in",
        "zoomOut": "Zooma ut",
        "fit": "Anpassa till bredd",
        "download": "Ladda ned PDF-filen",
        "loading": "Läser in dokumentet…",
        "pageLoading": "Läser in sida {page}…",
        "error": "Dokumentet kunde inte visas",
        "errorHint": "Filen kan vara skyddad eller tillfälligt otillgänglig. Du kan försöka igen, eller ladda ned den för att läsa den.",
        "retry": "Försök igen",
        "pinch": "Nyp för att zooma"
    },
    "components/signature/SignatureDocument#LABELS": {
        "zonesHint": "Ramarna visar var din signatur och dina initialer kommer att placeras.",
        "counter": "Dokument {index} av {total}",
        "read": "Läst",
        "unavailable": "Dokumentet är inte tillgängligt",
        "unavailableHint": "Dokumentet är inte längre åtkomligt i beCPG: det kan ha ersatts efter signeringen, eller så har din åtkomst tagits bort. Be kunden om en kopia om du behöver en."
    },
    "components/signature/SignatureFlow#LABELS": {
        "title": "Signatur",
        "back": "Mina uppgifter",
        "loading": "Öppnar dokumentet…",
        "notFound": "Inget dokument att signera",
        "notFoundHint": "Uppgiften hänvisar inte till något signerbart dokument. Leveransobjektet kan fortfarande vara under förberedelse — kontakta kunden via projektdiskussionen.",
        "readTitle": "Läsning av dokumentet",
        "progress": "{seen} / {pages} sidor lästa",
        "progressDone": "Hela dokumentet är läst",
        "progressHint": "Signeringsknappen låses upp när alla sidor har visats.",
        "readyHint": "Allt är klart: din signatur kommer att tillämpas på dokumentet.",
        "goToPage": "Fortsätt på sida {page}",
        "goToDocumentPage": "Fortsätt på dok. {document}, sida {page}",
        "documentCount": "{count} dokument att signera",
        "toSignature": "Gå till signeringen",
        "signTitle": "Din signatur",
        "initialsTitle": "Dina initialer",
        "initialsHint": "De placeras längst ned på varje sida.",
        "consent": "Jag har läst hela dokumentet och samtycker till att signera det elektroniskt. Jag är medveten om att denna signatur har samma giltighet som en handskriven.",
        "sign": "Signera dokumentet",
        "signing": "Signerar…",
        "blockedRead": "Läs alla sidor för att kunna signera.",
        "blockedSignature": "Lägg till din signatur.",
        "blockedInitials": "Lägg till dina initialer.",
        "blockedConsent": "Markera samtyckesrutan.",
        "successTitle": "Dokumentet har signerats",
        "successBody": "Din signatur har registrerats. beCPG tillämpar den på dokumentet och skickar en kopia till dig via e-post. Du hittar den också under Mina dokument › Signerade.",
        "successNext": "Inget mer förväntas av dig: uppgiften stängs och kunden aviseras.",
        "successDownload": "Ladda ned dokumentet",
        "successBack": "Tillbaka till mina uppgifter",
        "signedTitle": "Dokumentet är redan signerat",
        "signedBody": "En signatur har redan registrerats för den här uppgiften. Inget behöver göras om — du kan ladda ned dokumentet.",
        "signedBodyNoCopy": "En signatur har redan registrerats för den här uppgiften. Inget behöver göras om. Dokumentet är inte längre åtkomligt från portalen; be kunden om en kopia om du behöver en.",
        "signedView": "Visa dokumentet",
        "signedComplete": "Slutför uppgiften",
        "signedCompleteDone": "Uppgiften är slutförd.",
        "signedCompleteError": "Uppgiften kunde inte slutföras.",
        "cancelledTitle": "Signeringen har avbrutits",
        "cancelledBody": "Signeringsbegäran har avbrutits av kunden. Ingen åtgärd förväntas av dig.",
        "closedTitle": "Uppgiften är redan hanterad",
        "closedBody": "Uppgiften är inte längre öppen. Om du anser att detta är ett misstag, kontakta kunden.",
        "externalTitle": "Signering hos din leverantör",
        "externalBody": "Kunden använder en extern signeringstjänst. Dokumentet öppnas i en ny flik; kom tillbaka hit när du är klar.",
        "externalOpen": "Öppna signeringen",
        "failed": "Signaturen kunde inte registreras.",
        "failedNetwork": "Anslutningen bröts under överföringen. Din signatur har inte gått förlorad: försök igen, den registreras inte två gånger.",
        "retry": "Försök igen",
        "refresh": "Uppdatera",
        "leaving": "Signaturen skickas. Om du lämnar sidan nu kan överföringen avbrytas.",
        "document": "Dokument"
    },
    "components/signature/SignaturePad#LABELS": {
        "draw": "Rita",
        "type": "Skriv mitt namn",
        "drawHint": "Signera inom ramen med fingret, en penna eller musen.",
        "typeHint": "Ditt namn används som signatur.",
        "namePlaceholder": "Förnamn EFTERNAMN",
        "nameLabel": "Undertecknarens namn",
        "clear": "Rensa",
        "undo": "Ångra senaste drag",
        "preview": "Förhandsvisning av din signatur",
        "empty": "Ingen signatur ännu",
        "required": "Din signatur krävs för att fortsätta.",
        "initialsType": "Skriv mina initialer",
        "initialsDrawHint": "Rita dina initialer inom ramen.",
        "initialsTypeHint": "Dessa initialer används som parafering.",
        "initialsNameLabel": "Initialer",
        "initialsPlaceholder": "VL",
        "initialsPreview": "Förhandsvisning av dina initialer",
        "initialsEmpty": "Inga initialer ännu"
    },
    "components/signature/SignatureZones#DEFAULT_LABELS": {
        "signature": "Signatur",
        "initials": "Initialer",
        "date": "Datum",
        "text": "Text"
    },
    "components/specs/SpecPanel#LABELS": {
        "title": "Specifikationer",
        "subtitle": "Referensdokument som gäller för dina produkter",
        "consult": "Visa",
        "open": "Öppna",
        "download": "Ladda ned",
        "appliesTo": "Gäller för",
        "andOthers": "och {count} till",
        "updated": "Uppdaterad {date}",
        "search": "Sök en specifikation",
        "none": "Ingen specifikation",
        "noneHint": "Ingen specifikation är kopplad till det här omfånget. Kunden delar en om någon är tillämplig.",
        "noResult": "Ingen specifikation matchar sökningen",
        "count": "{count} dokument",
        "readFirst": "Läs innan du fyller i",
        "unreadable": "{count} specifikation(er) gäller för dina produkter men ditt konto kan inte öppna dem. Be kunden om åtkomst."
    },
    "components/survey/DecisionTree#LABELS": {
        "required": "Obligatorisk fråga",
        "noAnswer": "Ej besvarad",
        "choose": "Välj ett svar",
        "openLink": "Öppna länken",
        "answer": "Svar",
        "blank": "Den här obligatoriska frågan är fortfarande obesvarad."
    },
    "components/tasks/TaskActions#LABELS": {
        "complete": "Slutför uppgiften",
        "refuse": "Avvisa",
        "completeTitle": "Slutföra uppgiften?",
        "completeMessage": "Uppgiften markeras som klar och projektet går vidare till nästa steg.",
        "refuseTitle": "Avvisa uppgiften?",
        "refuseMessage": "Projektet går tillbaka till det steg som avvisningsflödet anger. Motiveringen nedan skickas till leverantören.",
        "refuseReason": "Motivering till avvisningen",
        "refuseReasonHint": "Texten skickas till leverantören: ange vad som ska korrigeras.",
        "refuseReasonRequired": "En motivering krävs för att avvisa.",
        "cancel": "Avbryt",
        "completed": "Uppgiften är slutförd.",
        "refused": "Uppgiften har avvisats."
    },
    "components/ui/DataTable#LOCAL_LABELS": {
        "selectAll": "Välj alla",
        "selectRow": "Välj rad",
        "columns": "Synliga kolumner",
        "rowsPerPage": "Rader per sida",
        "export": "Exportera",
        "legend": "Teckenförklaring"
    },
    "components/ui/EmptyState#SENTENCES": {
        "empty": "Det finns inget att visa här ännu. Poster visas så snart de har skapats eller skickats in.",
        "search": "Ingen post matchar sökningen. Prova färre ord, eller ta bort något av filtren."
    },
    "components/ui/TabScroller#LOCAL": {
        "previous": "Föregående flikar",
        "next": "Nästa flikar"
    },
    "components/wizard/AutoSaveIndicator#LABELS": {
        "pending": "Osparade ändringar",
        "saving": "Sparar…",
        "saved": "sparat kl. {time}",
        "savedShort": "Sparat",
        "error": "Kunde inte spara",
        "retry": "Försök igen",
        "unsaved": "Dina ändringar har inte gått förlorade: de skickas igen."
    },
    "components/wizard/TechnicalSheetBanner#LABELS": {
        "title": "Tekniskt datablad",
        "deposited": "Uppladdat {date}",
        "replace": "Ersätt",
        "cancel": "Avbryt",
        "missing": "Tekniskt datablad saknas",
        "missingHint": "Ladda upp ditt tekniska datablad för att aktivera AI-förslagen.",
        "missingClosed": "Inget tekniskt datablad har laddats upp för det här bladet."
    },
    "components/wizard/Wizard#LABELS": {
        "context": "Kontext",
        "discussion": "Diskussion",
        "documents": "Dokument",
        "technicalSheet": "Tekniskt datablad",
        "suggestions": "Förslag",
        "compliance": "Efterlevnad",
        "properties": "Egenskaper",
        "list": "Lista",
        "survey": "Frågeformulär",
        "readOnly": "Skrivskyddad",
        "readOnlyReasons": {
            "readAccess": "Du har endast läsbehörighet för det här bladet.",
            "noAssignedTask": "Ingen uppgift är tilldelad dig för det här bladet: inmatningen är stängd.",
            "wizardReadOnly": "Guiden är konfigurerad som skrivskyddad."
        },
        "finish": "Slutför",
        "finished": "Uppgiften har skickats till kunden",
        "finishBlocked": "Fyll i de saknade fälten i steget ”Efterlevnad” för att slutföra.",
        "finishMissingStep": "”{step}”: {count} obligatoriska svar saknas.",
        "finishGapStep": "{step} · {count} fält",
        "finishGapCatalog": "{step} · {count} förväntade",
        "finishGapCatalogPlain": "{step} att komplettera",
        "notFound": "Bladet hittades inte",
        "notFoundHint": "Bladet finns inte, eller ingår inte i ditt omfång.",
        "delegated": "Du fyller i på uppdrag av {supplier}",
        "due": "Förfaller {date}",
        "step": "Steg",
        "widen": "Bredda inmatningsytan",
        "widenHint": "Döljer sidopanelerna och reducerar stegen till ikoner.",
        "restore": "Återställ panelerna",
        "steps": "Steg"
    },
    "components/wizard/WizardFooter#LABELS": {
        "previous": "Föregående",
        "next": "Nästa",
        "finish": "Slutför",
        "finishing": "Skickar…",
        "formulating": "Räknar om…",
        "blocked": "Kan inte slutföras ännu",
        "incomplete": "Bladet är ofullständigt"
    },
    "components/wizard/WizardStepper#LABELS": {
        "title": "Steg",
        "step": "Steg {index} av {total}",
        "open": "Välj ett steg",
        "frozen": "Validerat av kunden",
        "readOnly": "Skrivskyddat",
        "done": "Besökt",
        "complete": "Fullständigt",
        "current": "Aktuellt steg",
        "todo": "Inte besökt ännu",
        "locked": "Tillgängligt senare",
        "incomplete": "{count} obligatoriska saknas",
        "catalogGap": "{count} fält förväntas av katalogen",
        "remaining": "{count} avsnitt att komplettera",
        "remainingNone": "Inget rapporteras saknas",
        "remainingHint": "Kunden väntar på den här informationen för att kunna validera bladet.",
        "remainingHintNone": "Du kan när som helst gå tillbaka till vilket steg som helst.",
        "collapse": "Fäll ihop stegen",
        "expand": "Fäll ut stegen"
    },
    "components/wizard/panels/CommentsPanel#LABELS": {
        "title": "Diskussion",
        "subtitle": "Dina utbyten med kunden om det här bladet",
        "placeholder": "Skriv ett meddelande…",
        "send": "Skicka",
        "empty": "Inga meddelanden",
        "emptyHint": "Ställ en fråga till kunden, eller svara på en av kundens kommentarer.",
        "emptyAnchored": "Inga meddelanden om det här objektet",
        "subject": "Ämne",
        "whole": "Hela bladet",
        "onField": "Fält: {label}",
        "onRow": "Rad: {label}",
        "onRowOfList": "Raden ”{label}” i ”{list}”",
        "inList": "En rad i ”{list}”",
        "row": "en rad",
        "anchored": "Om {label}",
        "clear": "Ta bort förankringen",
        "readOnly": "Diskussionen är skrivskyddad.",
        "posting": "Skickar…",
        "count": "{count} meddelande(n)",
        "denyReasons": {
            "noAssignedTask": "Listningen är avslutad: diskussionen är skrivskyddad.",
            "readAccess": "Du har endast läsbehörighet för det här bladet.",
            "noPermission": "Du har inte behörighet att skriva i den här diskussionen."
        }
    },
    "components/wizard/panels/HelpPanel#LABELS": {
        "title": "Kontext",
        "suggestions": "AI-förslag",
        "specs": "Specifikationer",
        "specsEmpty": "Ingen specifikation är kopplad till det här bladet.",
        "specsUnreadable": "En specifikation är kopplad till det här bladet, men ditt konto kan inte öppna den.",
        "refusals": "Tidigare avvisningar",
        "refusalsEmpty": "Inga avvisningar för det här bladet.",
        "refusalsHint": "Dessa steg har skickats tillbaka till dig: läs den tillhörande kommentaren innan du skickar igen.",
        "onField": "för {field}",
        "seeStep": "Öppna",
        "more": "+{count} till"
    },
    "components/wizard/steps/DataListStep#LABELS": {
        "row": "Rad {index}"
    },
    "components/wizard/steps/DocumentsStep#LABELS": {
        "title": "Förväntade dokument",
        "subtitle": "Vad kunden förväntar sig, och när.",
        "otherTitle": "Övriga dokument",
        "otherSubtitle": "Filerna i mappen som inte motsvarar något av kraven ovan. Släpp här alla användbara dokument (foto, analys…).",
        "blocking": "{count} obligatoriska dokument saknas",
        "allGood": "Alla obligatoriska dokument har lämnats in",
        "readOnly": "Du kan inte lämna in dokument för det här bladet."
    },
    "components/wizard/steps/FormStep#LABELS": {
        "comment": "Kommentera fältet",
        "comments": "{count} meddelande(n) om det här fältet",
        "catalogGap": "Förväntas av kundens katalog",
        "catalogGapLocale": "Förväntas av kundens katalog på {locale}",
        "frozenTitle": "Avsnittet har validerats av kunden",
        "frozenText": "Kunden har validerat den här informationen: den är låst och kan inte längre ändras. Om en rättelse behövs, be om att den öppnas igen via diskussionen.",
        "readAccessTitle": "Skrivskyddad",
        "readAccessText": "Du har inte skrivbehörighet för det här bladet.",
        "noTaskTitle": "Ingen öppen uppgift",
        "noTaskText": "Bladet är inte tilldelat dig just nu: du kan läsa det, men inte ändra det.",
        "readOnlyTitle": "Skrivskyddad",
        "readOnlyText": "Det här steget kan inte ändras."
    },
    "components/wizard/steps/ReviewStep#LABELS": {
        "title": "Efterlevnad",
        "subtitle": "Vad som fortfarande saknas innan kunden kan validera bladet.",
        "blocking": "Blockerande katalog(er): {names}",
        "blockingHint": "Fyll i de saknade fälten nedan för att kunna slutföra.",
        "ready": "Alla blockerande kataloger är uppfyllda",
        "incomplete": "Katalog(er) att komplettera: {names}",
        "documents": "Obligatoriska dokument",
        "documentsMissing": "{count} obligatoriska dokument saknas",
        "documentsOk": "Alla obligatoriska dokument har lämnats in",
        "reviewTitle": "Skrivskyddat blad",
        "reviewSubtitle": "Du visar det här bladet: inga ändringar är möjliga.",
        "expand": "Visa",
        "collapse": "Dölj",
        "expandAll": "Visa alla",
        "collapseAll": "Dölj alla",
        "reviewed": "Avsnittet är granskat",
        "reviewedHint": "Markera avsnitten allteftersom: {done} av {total} granskade.",
        "empty": "Inget att visa"
    },
    "components/wizard/steps/SuggestionsStep#LABELS": {
        "title": "Automatisk extrahering",
        "subtitle": "Dessa värden har lästs från de dokument du har lämnat in. Kontrollera dem: du behåller kontrollen.",
        "applied": "Tillämpat automatiskt",
        "appliedHint": "Hög tillförlitlighet: värdet är redan infört, du kan ångra det.",
        "toConfirm": "Att bekräfta",
        "toConfirmHint": "Kontrollera det föreslagna värdet och tillämpa det sedan.",
        "flagged": "Ange det själv",
        "flaggedHint": "Extraheringen är inte tillräckligt tillförlitlig: vi låter hellre dig ange värdet.",
        "unscored": "Förslag",
        "unscoredHint": "Dessa förslag saknar tillförlitlighetspoäng.",
        "apply": "Tillämpa",
        "expand": "Expandera",
        "applyAnyway": "Tillämpa ändå",
        "revoke": "Ångra",
        "restore": "Granska",
        "applying": "Tillämpar…",
        "appliedAt": "Tillämpat",
        "revoked": "Ångrat",
        "dismissed": "Avfärdat",
        "notRevocable": "Det tidigare värdet kan inte återställas automatiskt: redigera fältet direkt vid behov.",
        "empty": "Inga förslag",
        "emptyHint": "Inget att föreslå för det här steget. Det tekniska databladet laddas upp precis ovanför: extraheringen föreslår de värden den hittar där.",
        "emptyEntityLevel": "Analysen kördes, men den gav endast slutsatser dragna från själva bladet, utan stöd i något dokument: de erbjuds inte till dig.",
        "analysing": "Analys pågår",
        "analysingHint": "Portalen läser dina dokument. Förslagen visas här av sig själva, utan att du behöver lämna sidan: läsningen av ett tekniskt datablad tar oftast under en minut.",
        "analysingPlugins": "Körs: {plugins}",
        "refresh": "Kör analysen igen",
        "readOnly": "Bladet är skrivskyddat: förslag kan inte tillämpas.",
        "source": "Källa",
        "changes": "{count} värde(n)",
        "error": "Det gick inte att tillämpa förslaget."
    },
    "components/wizard/steps/SurveyStep#LABELS": {
        "discuss": "Diskussion",
        "answered": "{answered} av {total} besvarade",
        "empty": "Inga frågor",
        "emptyHint": "Kunden har ännu inte publicerat något frågeformulär för det här bladet.",
        "check": "Kontrollera mina svar",
        "complete": "Frågeformuläret är fullständigt",
        "missingTitle": "{count} obligatoriska frågor är fortfarande obesvarade",
        "missingHint": "Välj en för att gå direkt till den. Dina övriga svar är redan sparade.",
        "readOnly": "Endast visning",
        "noneAnswered": "Inga svar registrerade",
        "noneAnsweredHint": "Frågeformuläret växer fram allteftersom du svarar.",
        "dropped": "Kunden har inte angett någon plats att lagra {count} av dina svar: {questions}. De sparas inte — meddela kunden."
    },
    "lib/adapters/monitor#CSV_HEADERS": {
        "code": "Kod",
        "name": "Leverantör",
        "legalName": "Juridiskt namn",
        "approvalStatus": "Godkännandestatus",
        "approvalReasons": "Orsaker",
        "completion": "Fullständighet (%)",
        "risk": "Risk",
        "riskLevel": "Risknivå",
        "documentsExpired": "Utgångna dokument",
        "documentsExpiring": "Dokument som snart går ut",
        "documentsMissing": "Saknade dokument",
        "openNc": "Öppna NC",
        "openProjects": "Öppna projekt",
        "family": "Familj",
        "lastActivity": "Senaste aktivitet",
        "state": "Status",
        "compliance": "Efterlevnad (%)"
    },
    "config/messages#messages": {
        "app.title": "Leverantörsportal",
        "app.shortTitle": "Portal",
        "app.tenantSuffix": "leverantörsutrymme",
        "app.description": "beCPG leverantörsportal — listning, dokument och efterlevnad",
        "nav.dashboard": "Översikt",
        "nav.tasks": "Mina uppgifter",
        "nav.products": "Mina produkter",
        "nav.documents": "Mina dokument",
        "nav.company": "Mitt företag",
        "nav.specs": "Specifikationer",
        "nav.messages": "Diskussioner",
        "nav.notifications": "Aviseringar",
        "nav.help": "Hjälp",
        "nav.monitor": "Uppföljning",
        "nav.monitor.suppliers": "Leverantörer",
        "nav.monitor.products": "Leverantörsprodukter",
        "nav.monitor.documents": "Dokumentefterlevnad",
        "nav.monitor.campaigns": "Projekt",
        "nav.monitor.quality": "Avvikelser",
        "nav.monitor.reports": "Rapporter",
        "nav.monitor.tasks": "Mina uppgifter",
        "account.profile": "Min profil",
        "account.language": "Språk",
        "account.login": "Logga in",
        "account.logout": "Logga ut",
        "account.tenant": "Kund",
        "account.suppliers": "Mina leverantörsblad",
        "account.allSuppliers": "Alla leverantörer",
        "action.save": "Spara",
        "action.cancel": "Avbryt",
        "action.close": "Stäng",
        "action.back": "Tillbaka",
        "action.next": "Nästa",
        "action.previous": "Föregående",
        "action.submit": "Skicka",
        "action.confirm": "Bekräfta",
        "action.delete": "Ta bort",
        "action.download": "Ladda ned",
        "action.upload": "Ladda upp en fil",
        "action.retry": "Försök igen",
        "action.search": "Sök",
        "action.filter": "Filtrera",
        "action.reset": "Återställ",
        "action.export": "Exportera",
        "action.sign": "Signera",
        "action.showMore": "{count} till",
        "action.showLess": "Visa färre",
        "suggestion.replaces": "Ersätter {value}",
        "state.loading": "Läser in…",
        "state.saving": "Sparar…",
        "state.saved": "Sparat",
        "state.empty": "Inget att visa",
        "state.noResults": "Inga resultat för den här sökningen",
        "state.required": "Obligatoriskt fält",
        "state.of": "{from}-{to} av {total}",
        "state.page": "Sida {page} av {pages}",
        "state.atLeast": "minst {total}",
        "error.title": "Något gick fel",
        "error.generic": "Något gick fel. Försök igen.",
        "error.network": "Det går inte att nå servern.",
        "error.upstream": "beCPG returnerade ett fel. Försök igen; om felet kvarstår, rapportera det till din administratör.",
        "error.unauthorized": "Din session har gått ut. Logga in igen.",
        "error.forbidden": "Du har inte behörighet att utföra den här åtgärden.",
        "error.notFound": "Sidan eller objektet finns inte.",
        "error.tenant": "Ingen kund är kopplad till ditt konto.",
        "error.upload": "Filuppladdningen misslyckades.",
        "error.http": "Fel {status}: {message}",
        "status.approved": "Godkänd",
        "status.inProgress": "Pågår",
        "status.toRenew": "Ska förnyas",
        "status.suspended": "Avstängd",
        "status.valid": "Giltig",
        "status.expiring": "Går snart ut",
        "status.expired": "Utgången",
        "status.missing": "Saknas",
        "status.validityMissing": "Giltighet ska fyllas i",
        "status.rejected": "Avvisad",
        "status.pending": "Väntande",
        "status.completed": "Slutförd",
        "status.late": "Försenad",
        "status.draft": "Simulering",
        "status.notApplicable": "Ej tillämplig",
        "test.banner": "TEST-instans — uppgifter som anges här är inte avtalsmässigt bindande",
        "test.badge": "Test",
        "app.monitorSuffix": "leverantörsstyrning"
    },
    "components/monitor/HistoryPanel#LABELS": {
        "title": "Utveckling",
        "help": "Läst från beCPG:s beslutsstödsmodul, laddad i batch: siffrorna kan vara från den senaste laddningen.",
        "period": "Period",
        "measures": {
            "stepsNumber": "Uppgifter",
            "averageActualDurations": "Snittlig faktisk tid (d)",
            "refusalRate": "Avvisningsgrad",
            "avgResponseDelay": "Snittlig svarstid (d)",
            "averageProgress": "Snittligt framsteg",
            "projectsNumber": "Projekt"
        }
    },
    "components/ui/useListExport#LABELS": {
        "done": "{count} rad(er) exporterade.",
        "cut": "Partiell export: {count} rad(er), gränsen för en export. Förfina filtren för resten."
    }
};

export default LOCALE;
