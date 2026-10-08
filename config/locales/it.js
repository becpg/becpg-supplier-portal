/**
 * Italian translation of the portal chrome.
 *
 * Generated from the inline French and English labels (`npm run i18n:extract`),
 * then translated. Keys mirror the English source; a key missing here reads
 * English. Edit translations here, and the source labels in their components.
 */
const LOCALE = {
    "app/(home)/page#LOCAL": {
        "state": "Il mio fascicolo in sintesi",
        "stateHint": "Qualifica, completezza, azioni e documenti — ricalcolati a ogni visualizzazione.",
        "detail": "Il dettaglio",
        "detailHint": "Ciò che vi attende, prodotto per prodotto e documento per documento."
    },
    "app/company/page#LABELS": {
        "title": "La mia azienda",
        "subtitle": "Le informazioni che il cliente detiene sulla vostra azienda",
        "noSupplier": "Nessuna scheda fornitore",
        "noSupplierHint": "Il vostro account non è collegato ad alcun fornitore. Contattate il vostro referente presso il cliente.",
        "approval": "Stato di qualifica",
        "approvalHint": "Calcolato in tempo reale a partire dai vostri documenti, progetti e non conformità.",
        "reasons": {
            "documentExpired": "Un documento obbligatorio è scaduto",
            "documentExpiring": "Un documento obbligatorio è in scadenza",
            "documentMissing": "Un documento obbligatorio non è stato fornito",
            "blockingNc": "È aperta una non conformità bloccante",
            "openProject": "È in corso un progetto di referenziamento",
            "blockingCatalog": "Un catalogo bloccante non è soddisfatto"
        },
        "metrics": {
            "documentsExpired": "Documenti scaduti",
            "documentsExpiring": "Documenti in scadenza",
            "documentsMissing": "Documenti mancanti",
            "openNc": "NC aperte",
            "openProjects": "Progetti aperti"
        },
        "sections": {
            "identity": "Identità",
            "surveyList": "Questionario",
            "contactList": "Contatti",
            "plant": "Siti",
            "certification": "Certificazioni",
            "documents": "Documenti",
            "specs": "Capitolati"
        },
        "frozen": "Elenco convalidato dal cliente — sola lettura",
        "emptyList": "Nessuna riga",
        "emptyListHint": "Questa sezione non è ancora stata compilata.",
        "questionnaire": "{done} / {total} domande con risposta",
        "noProperties": "Nessuna proprietà da visualizzare",
        "yes": "Sì",
        "no": "No",
        "code": "Codice",
        "request": "Richiedere un aggiornamento"
    },
    "app/documents/page#LABELS": {
        "title": "I miei documenti",
        "subtitle": "Ciò che il cliente si aspetta da voi, ed entro quando",
        "tabRequirements": "Requisiti",
        "tabAll": "Tutti i documenti",
        "tabSigned": "Firmati",
        "deposit": "Carica un documento",
        "depositTitle": "Carica un documento",
        "depositHint": "Scegliete il prodotto a cui si riferisce, poi trascinate il file. Tipo e validità sono dedotti da beCPG.",
        "entity": "Prodotto collegato",
        "chooseEntity": "Scegliete un prodotto…",
        "filters": {
            "open": "Da gestire",
            "blocking": "Bloccanti",
            "expiring": "In scadenza",
            "done": "Forniti",
            "all": "Tutti"
        },
        "stats": {
            "toProvide": "Da fornire",
            "expired": "Scaduti",
            "expiring": "In scadenza < {days} g",
            "compliance": "Conformità documentale",
            "mandatory": "{done} / {total} obbligatori",
            "noScope": "nessun perimetro da valutare"
        },
        "search": "Cerca un documento",
        "noMatch": "Nessun documento corrisponde a questo filtro",
        "noMatchHint": "Provate «Tutti» per vedere ogni documento.",
        "columns": {
            "document": "Documento",
            "entity": "Prodotto",
            "status": "Stato",
            "validity": "Validità",
            "modified": "Modificato",
            "ai": "Verifica IA",
            "actions": ""
        },
        "download": "Scarica",
        "noFile": "Non ancora fornito",
        "blockingBanner": "{count} documento/i obbligatorio/i bloccano la vostra qualifica. Sono in cima all'elenco.",
        "scopeEmpty": "Il vostro account non è collegato ad alcun fornitore, quindi non è possibile calcolare alcun requisito documentale. I contatori qui sopra sono vuoti, non soddisfatti. Contattate il vostro referente presso il cliente."
    },
    "app/error#LABELS": {
        "title": "Impossibile visualizzare questa pagina",
        "message": "Si è verificato un errore tecnico durante la visualizzazione. Quanto avevate inserito non è perso: viene salvato man mano.",
        "retry": "Riprova",
        "home": "Torna alla home",
        "reference": "Riferimento da comunicare all'assistenza"
    },
    "app/global-error#LABELS": {
        "title": "Impossibile avviare il portale",
        "message": "Un errore tecnico impedisce la visualizzazione del portale. Riprovate; se il problema persiste, contattate il vostro referente beCPG indicando il riferimento qui sotto.",
        "retry": "Riprova",
        "reference": "Riferimento"
    },
    "app/help/page#LABELS": {
        "title": "Guida",
        "subtitle": "Come funziona il portale, passo dopo passo",
        "scope": "Portale fornitori beCPG",
        "search": "Cerca nella guida",
        "expandAll": "Espandi tutto",
        "collapseAll": "Comprimi tutto",
        "topics": "Indice",
        "noResult": "Nessun argomento corrispondente",
        "noResultHint": "Provate un'altra parola: «documento», «firma», «fase», «qualifica».",
        "anchor": "Link a questo argomento",
        "anchorCopied": "Link copiato",
        "goTo": "Vai a",
        "monitorNotice": "Questa guida descrive la vista fornitore: le schermate che vedono i vostri fornitori, dove «il vostro cliente» indica la vostra azienda. Lo spazio di monitoraggio non è ancora documentato."
    },
    "app/help/page#TOPICS": [
        {
            "id": "start",
            "icon": "flag",
            "title": "Da dove iniziare",
            "summary": "La dashboard risponde a una sola domanda: che cosa ci si aspetta da voi, ed entro quando.",
            "blocks": [
                {
                    "p": "Tutto inizia dalla dashboard. Le quattro schede in alto riassumono il vostro fascicolo presso questo cliente:"
                },
                {
                    "ul": [
                        "**Stato di qualifica** — Qualificato, In corso, Da rinnovare o Sospeso, con la data di validità.",
                        "**Completezza** — la quota di campi attesi già compilati nelle vostre schede.",
                        "**Azioni richieste** — quante attività sono aperte e quante sono in ritardo.",
                        "**Documenti** — quanti sono validi, quanti scadono a breve, quanti mancano."
                    ]
                },
                {
                    "p": "Sotto, gli elenchi riportano il dettaglio: le vostre attività, i vostri prodotti, i vostri documenti, le vostre discussioni e le vostre notifiche. La campanella nell'intestazione mostra lo stesso elenco di notifiche da qualsiasi schermata."
                },
                {
                    "note": "Un account può lavorare per più clienti beCPG, con un portale per cliente. Il logo e il nome del cliente sono sempre visualizzati in alto a sinistra: sono loro a indicarvi in quale fascicolo vi trovate."
                },
                {
                    "warn": "Se è visualizzato un banner «Istanza di TEST», vi trovate in un ambiente di prova: nulla di quanto vi inserite ha valore contrattuale."
                },
                {
                    "links": [
                        {
                            "href": "/",
                            "icon": "dashboard",
                            "label": "Dashboard"
                        },
                        {
                            "href": "/tasks",
                            "icon": "assignment_turned_in",
                            "label": "Le mie attività"
                        },
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "I miei documenti"
                        }
                    ]
                }
            ]
        },
        {
            "id": "tasks",
            "icon": "assignment_turned_in",
            "title": "Come funziona un'attività di referenziamento",
            "summary": "Un'attività proviene da un progetto aperto dal vostro cliente. Il suo tipo determina la schermata in cui arrivate.",
            "blocks": [
                {
                    "p": "Il vostro cliente apre un progetto di referenziamento, e quel progetto vi invia delle attività. Un'attività riporta un titolo, il prodotto interessato, una data di scadenza e un tipo. Facendo clic su un'attività si arriva direttamente alla schermata che permette di completarla — non c'è alcuna pagina intermedia."
                },
                {
                    "ul": [
                        "**Procedura guidata** — inserimento guidato di una scheda prodotto o della vostra scheda fornitore.",
                        "**Firma** — lettura di un documento PDF, poi firma.",
                        "**Documento** — caricamento o rinnovo di un documento atteso.",
                        "**Revisione** — lettura completa di un prodotto, senza nulla da inserire."
                    ]
                },
                {
                    "p": "Un'attività Pianificata o In corso vi sta aspettando. Un'attività Rifiutata è stata rinviata dal vostro cliente con una motivazione: leggete l'osservazione prima di inviare di nuovo. Un'attività Completata non richiede altro."
                },
                {
                    "p": "Un'attività oltre la data di scadenza è segnalata come in ritardo, sia nell'elenco sia nelle notifiche. Oltre sette giorni di ritardo diventa rossa."
                },
                {
                    "note": "Potete aprire e lasciare un'attività tutte le volte che è necessario: resta aperta finché non la completate voi stessi, e nulla va perso tra due visite."
                },
                {
                    "links": [
                        {
                            "href": "/tasks",
                            "icon": "assignment_turned_in",
                            "label": "Le mie attività"
                        }
                    ]
                }
            ]
        },
        {
            "id": "wizard",
            "icon": "auto_stories",
            "title": "L'ordine delle fasi della procedura guidata",
            "summary": "Scheda tecnica nell'intestazione, un pannello Contesto permanente, le sezioni del vostro cliente, poi la conformità.",
            "blocks": [
                {
                    "p": "La procedura guidata segue sempre lo stesso ordine. Non è un percorso obbligato: non appena una fase è stata visitata, potete tornarci liberamente."
                },
                {
                    "ol": [
                        "**Intestazione · Scheda tecnica** — la prima azione che vi viene richiesta. Finché manca, una fascia rossa lo segnala sopra ogni fase; una volta caricata, resta una riga con la data e la validità. È il documento che l'IA legge per proporre valori: senza di esso non c'è nulla da leggere. Se il vostro cliente non ha configurato questo tipo di documento, la fascia non viene affatto visualizzata.",
                        "**Fase 0 · Contesto** — un pannello sempre visibile, che su telefono diventa un foglio a portata di tocco. Contiene le proposte dell'IA, il capitolato applicabile, gli elenchi già convalidati dal vostro cliente e i rifiuti precedenti. Non lo si percorre mai: è presente qualunque sia la fase in cui vi trovate.",
                        "**Le sezioni del vostro cliente** — proprietà, questionario, ingredienti, nutrienti, allergeni, parametri chimico-fisici, claim, microbiologia, caratteristiche organolettiche, materiali di imballaggio, documenti… Quali sezioni compaiono, e in quale ordine, dipende dalla configurazione del vostro cliente e dal tipo di prodotto: non è il portale a sceglierle.",
                        "**Documenti** — la fase mantiene la posizione assegnata dal vostro cliente, di solito verso la fine. È voluto: beCPG deduce i documenti attesi da quanto avete inserito (un claim «senza OGM» richiede la relativa attestazione), quindi, se richiesto troppo presto, l'elenco sarebbe vuoto o errato. Solo la scheda tecnica è attesa in ogni caso, e si trova nell'intestazione.",
                        "**Conformità** — l'elenco dei campi ancora mancanti, ciascuno cliccabile per raggiungerlo direttamente, più il punteggio di completamento. Se il vostro cliente ha definito un controllo bloccante, il completamento resta non disponibile finché non è soddisfatto."
                    ]
                },
                {
                    "note": "Ogni sezione viene salvata automaticamente, senza alcun pulsante da premere. L'indicatore «Salvato alle HH:MM», in fondo alla procedura guidata accanto ai pulsanti di navigazione, lo conferma — e riprendete esattamente da dove eravate se chiudete il portale, cambiate dispositivo o perdete la rete."
                },
                {
                    "p": "Tra alcune fasi la vostra scheda viene ricalcolata (allergeni, nutrienti, costi…). Questo calcolo viene eseguito in background e non vi blocca mai: potete continuare a digitare mentre è in corso."
                },
                {
                    "p": "Su uno schermo ampio, «Allarga l'area di inserimento» nasconde i pannelli laterali e riduce l'elenco delle fasi alle sole icone, per le tabelle larghe. La scelta viene ricordata da una scheda all'altra; i pannelli restano a portata di clic, tramite le icone dell'intestazione."
                },
                {
                    "note": "Se il vostro referente inserisce dati per vostro conto, un banner «state inserendo dati per …» lo indica esplicitamente in cima alla procedura guidata."
                }
            ]
        },
        {
            "id": "grids",
            "icon": "grid_on",
            "title": "Inserire rapidamente in una tabella",
            "summary": "Ingredienti, nutrienti, allergeni: tutto si fa da tastiera, e un blocco di foglio di calcolo si incolla direttamente.",
            "blocks": [
                {
                    "p": "Le sezioni a tabella — ingredienti, nutrienti, allergeni, parametri chimico-fisici… — si compilano senza lasciare la tastiera. Il pulsante tastiera sopra la tabella richiama l'elenco in qualsiasi momento."
                },
                {
                    "ul": [
                        "**Tab / Shift+Tab** — cella successiva / precedente.",
                        "**Enter** — salva la riga e scende nella stessa colonna; sull'ultima riga, ne aggiunge una.",
                        "**↑ / ↓** — stessa colonna, riga sopra / sotto.",
                        "**Esc** — annulla le modifiche della riga in corso di modifica.",
                        "**Ctrl+D** — duplica la riga corrente.",
                        "**Ctrl+V** — incolla un blocco di celle da un foglio di calcolo."
                    ]
                },
                {
                    "p": "L'incolla da un foglio di calcolo accetta più righe e colonne in una volta, crea le righe mancanti e vi indica ciò che non ha potuto acquisire — un valore fuori dall'elenco proposto, un numero atteso dove c'è testo, una colonna in sola lettura. Nulla viene indovinato: ciò che non ha una corrispondenza esatta vi viene restituito da correggere."
                },
                {
                    "note": "Come ovunque nella procedura guidata, una riga viene salvata non appena la lasciate — oppure con Enter, o non appena spuntate una casella. Non c'è alcun pulsante di salvataggio: non c'è nulla da confermare. Solo un incolla propone «Salva le N righe», perché nessuno ha esaminato quelle righe."
                },
                {
                    "p": "Su telefono la tabella diventa una scheda per riga: gli stessi campi, impilati, senza scorrimento orizzontale."
                }
            ]
        },
        {
            "id": "specs",
            "icon": "menu_book",
            "title": "Capitolato e catalogo: qual è la differenza",
            "summary": "Un capitolato si legge. Un catalogo si compila — ed è lui a decidere se potete terminare.",
            "blocks": [
                {
                    "p": "Sono due oggetti diversi, e non servono nello stesso momento. Il modo più semplice è considerarli nell'ordine in cui li incontrate."
                },
                {
                    "ul": [
                        "**Il capitolato** — un documento del vostro cliente, collegato a un prodotto o a una famiglia di prodotti. Ne enuncia i requisiti: materiali vietati, origini accettate, soglie analitiche, condizioni di trasporto, impegni RSI. È un **testo di riferimento**, da leggere. Il portale lo mostra nel pannello «Contesto» della procedura guidata, e la schermata «Capitolati» li raccoglie tutti.",
                        "**Il catalogo** — un **elenco di campi obbligatori** definito dal vostro cliente: «per referenziare una materia prima presso di me, mi servono l'origine, la densità, il codice EAN, l'allergene principale…». Non è un testo, è un controllo. Il portale lo calcola continuamente e ve ne fornisce il punteggio nella fase «Conformità»."
                    ]
                },
                {
                    "p": "In altre parole: il capitolato vi dice **che cosa il vostro cliente si aspetta dal vostro prodotto**, il catalogo verifica **che la sua scheda sia completa**. Potete rispettare il capitolato e avere comunque una scheda incompleta, e viceversa."
                },
                {
                    "p": "Solo uno dei due vi impedisce di inviare: il catalogo. Quando il vostro cliente ne ha dichiarato uno bloccante, il pulsante «Termina» resta non disponibile finché manca un campo, e la fase «Conformità» elenca esattamente quali — ogni riga vi porta al campo."
                },
                {
                    "note": "Un capitolato può anche richiedere documenti (un certificato biologico, un'attestazione senza OGM). Questi compaiono in «I miei documenti» e nella fase Documenti, con le loro date di validità — non nel catalogo."
                },
                {
                    "links": [
                        {
                            "href": "/specs",
                            "icon": "menu_book",
                            "label": "Capitolati"
                        },
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "I miei documenti"
                        }
                    ]
                }
            ]
        },
        {
            "id": "frozen",
            "icon": "lock",
            "title": "Che cosa significa un elenco bloccato",
            "summary": "Un elenco convalidato dal vostro cliente diventa di sola lettura. È voluto, e reversibile su richiesta.",
            "blocks": [
                {
                    "p": "Quando il vostro cliente convalida una sezione — l'elenco degli ingredienti, il questionario, gli allergeni… — quella sezione viene **bloccata**: la vedete ancora con tutti i suoi valori, ma non potete più modificarla. Un lucchetto e la dicitura «Sola lettura» lo indicano."
                },
                {
                    "p": "È proprio questo lo scopo: una volta convalidato, un valore diventa il riferimento su cui il vostro cliente si basa (etichettatura, capitolati, controlli). Se potesse cambiare a sua insaputa, la sua convalida non avrebbe alcun significato."
                },
                {
                    "p": "Gli elenchi bloccati sono riportati anche nel pannello «Contesto» della procedura guidata, sotto «Elenchi convalidati»: è il modo più rapido per vedere ciò che è definito e ciò che è ancora aperto."
                },
                {
                    "warn": "Avete notato un errore in un elenco bloccato? Non create una scheda duplicata. Chiedete la riapertura della sezione tramite la discussione collegata alla scheda: il vostro cliente la sblocca e la ritrovate modificabile."
                },
                {
                    "p": "Un'intera scheda può anche essere in sola lettura per un altro motivo: l'attività è completata, il progetto è chiuso, oppure disponete solo dell'accesso in lettura. La procedura guidata vi indica quale di questi casi si applica."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Discussioni"
                        }
                    ]
                }
            ]
        },
        {
            "id": "confidence",
            "icon": "auto_awesome",
            "title": "Che cosa propone l'IA",
            "summary": "Proposte — mai valori scritti al vostro posto.",
            "blocks": [
                {
                    "p": "Quando l'estrazione automatica è attivata presso il vostro cliente, il portale legge i vostri documenti e propone i valori trovati. Compaiono nel pannello «Contesto», a destra del modulo, e vengono riletti a ogni cambio di fase — ciò che avete appena inserito modifica ciò che resta da proporre."
                },
                {
                    "p": "Tutto parte dalla **scheda tecnica**, nell'intestazione della procedura guidata. Finché non è caricata non c'è nulla da leggere e l'elenco delle proposte resta vuoto: è questo il significato della fascia rossa."
                },
                {
                    "ul": [
                        "**Applica** — il valore viene scritto nella scheda. Nulla viene scritto prima di quel clic.",
                        "**Espandi** — per le analisi lunghe che non entrano nel pannello."
                    ]
                },
                {
                    "note": "Una proposta che non volete non va rifiutata: basta non applicarla, che è già il comportamento predefinito. Nessun valore viene mai applicato automaticamente, per quanto certa si dichiari la lettura. Siete voi a impegnarvi sulla scheda: la decisione è vostra, campo per campo."
                },
                {
                    "p": "In ogni caso il valore finale è vostro: restate responsabili di ciò che convalidate, e nulla raggiunge il vostro cliente prima che completiate l'attività."
                }
            ]
        },
        {
            "id": "documents",
            "icon": "folder_shared",
            "title": "Validità e rinnovo dei documenti",
            "summary": "Il portale sa quali documenti sono attesi, per quanto tempo sono validi e quali mancano.",
            "blocks": [
                {
                    "p": "I documenti attesi non sono un elenco da indovinare: li configura il vostro cliente (tipo di documento, obbligatorio o meno, durata di validità, ambito), e la schermata «I miei documenti» ve li restituisce così come sono, prodotto per prodotto."
                },
                {
                    "ul": [
                        "**Valido** — fornito, accettato, e la sua fine di validità non è vicina.",
                        "**Da rinnovare** — la fine di validità è a meno di 60 giorni (un termine che il vostro cliente può modificare).",
                        "**Scaduto** — la fine di validità è superata. Per un documento obbligatorio, ciò sospende la vostra qualifica.",
                        "**Mancante** — atteso e mai fornito.",
                        "**Rifiutato** — fornito, ma rifiutato dal vostro cliente: leggete la motivazione prima di caricarlo di nuovo."
                    ]
                },
                {
                    "p": "Ogni documento riporta un periodo di validità (inizio e fine), visualizzato sulla sua riga e colorato come lo colora beCPG: **verde** finché è all'interno del periodo, **arancione** quando la scadenza si avvicina, **rosso** una volta superata."
                },
                {
                    "p": "A seconda del tipo, questo periodo è dedotto automaticamente dalla data di caricamento e dalla durata configurata dal vostro cliente, oppure **spetta a voi inserirlo**: compaiono allora due caselle di data nell'area di caricamento, da compilare in base al documento che caricate. Viaggiano con il file e restano modificabili in seguito tramite «Modifica» sulla riga."
                },
                {
                    "warn": "Un documento obbligatorio la cui validità non è mai stata inserita è segnalato in rosso, «Validità da inserire». Senza data di fine non scadrà mai, non verrà inviato alcun promemoria e il vostro cliente non saprà da quando è valido."
                },
                {
                    "p": "Rinnovare significa caricare una nuova versione sulla stessa riga — mai creare una seconda riga. La versione precedente resta nella cronologia del documento con il proprio periodo di validità: è ciò che dimostra che eravate coperti a una data passata."
                },
                {
                    "note": "Il nome del file e la sua collocazione non hanno importanza: il portale rinomina e archivia il documento secondo la configurazione del vostro cliente. Caricate il file così come vi è stato consegnato."
                },
                {
                    "p": "I promemoria via email prima della scadenza sono inviati da beCPG secondo le regole definite dal vostro cliente. Il portale mostra sempre lo stato reale: non affidatevi all'email, il riferimento è «I miei documenti»."
                },
                {
                    "links": [
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "I miei documenti"
                        }
                    ]
                }
            ]
        },
        {
            "id": "approval",
            "icon": "verified",
            "title": "Lo stato di qualifica",
            "summary": "Calcolato in tempo reale dai vostri documenti, dalle vostre schede e dalle vostre non conformità. Mai bloccato.",
            "blocks": [
                {
                    "p": "Lo stato mostrato nella dashboard non è una decisione inserita a mano: viene ricalcolato a ogni visualizzazione, a partire dal vostro fascicolo. Correggete la causa e cambia."
                },
                {
                    "ul": [
                        "**Sospeso** — almeno un documento obbligatorio è scaduto, oppure è aperta una non conformità bloccante.",
                        "**Da rinnovare** — almeno un documento obbligatorio è in scadenza.",
                        "**In corso** — è aperto un progetto di referenziamento, oppure un documento obbligatorio non è mai stato fornito, oppure un controllo bloccante non è soddisfatto.",
                        "**Qualificato** — nessuno dei casi precedenti."
                    ]
                },
                {
                    "p": "La scheda della dashboard elenca le ragioni dello stato: ciascuna è cliccabile e vi porta a ciò che va corretto."
                },
                {
                    "note": "Questo stesso stato viene letto dai sistemi di acquisto del vostro cliente. Un documento obbligatorio scaduto può quindi bloccare un ordine, non solo mostrare un indicatore arancione."
                }
            ]
        },
        {
            "id": "signature",
            "icon": "draw",
            "title": "Come funziona la firma",
            "summary": "Vi viene chiesto prima di leggere, poi di firmare. La firma è apposta da beCPG, non dal vostro browser.",
            "blocks": [
                {
                    "p": "Un'attività di Firma apre il documento in un visualizzatore integrato nel portale. Il file non lascia mai il portale e resta utilizzabile su telefono."
                },
                {
                    "ol": [
                        "**Leggete l'intero documento.** L'avanzamento della lettura è monitorato pagina per pagina: finché una pagina non è stata visualizzata, la firma resta non disponibile.",
                        "**Tracciate la vostra firma** con un dito, un mouse o uno stilo, negli spazi preparati dal vostro cliente. Le zone di firma e di sigla sono state posizionate in anticipo: non dovete collocarle voi.",
                        "**Spuntate la casella di consenso**, poi inviate. L'attività viene inviata una sola volta."
                    ]
                },
                {
                    "p": "beCPG firma il documento sul proprio server, archivia la versione firmata e la invia via email ai destinatari. Il portale non emette alcun certificato proprio."
                },
                {
                    "note": "Se la rete si interrompe durante l'invio, riprovate: la richiesta riporta un identificativo univoco, quindi una richiesta arrivata due volte non firma due volte. Un documento già firmato viene mostrato come tale, con il relativo download, invece di chiedervi di firmare di nuovo."
                },
                {
                    "warn": "Una firma non può essere rifiutata né annullata dal portale. Se il documento è errato, non firmate: aprite la discussione e informate il vostro cliente."
                }
            ]
        },
        {
            "id": "discussion",
            "icon": "forum",
            "title": "Dove arrivano le osservazioni del vostro cliente",
            "summary": "Una conversazione per scheda, ma ogni messaggio è ancorato a ciò a cui si riferisce.",
            "blocks": [
                {
                    "p": "La discussione di una scheda è la stessa da entrambe le parti: ciò che il vostro cliente scrive da beCPG vi arriva qui, e le vostre risposte gli arrivano lì. Non c'è una casella di posta separata da controllare."
                },
                {
                    "p": "Un messaggio può essere ancorato in tre punti, e il selettore in cima al pannello vi permette di scegliere quale leggere o a quale indirizzarvi:"
                },
                {
                    "ul": [
                        "**L'intera scheda** — la conversazione completa, comprese le osservazioni lasciate su un campo o su una riga di tabella. È la vista predefinita.",
                        "**Un campo** — «la ragione sociale è incompleta». Compare allora una nuvoletta accanto a quel campo nella procedura guidata.",
                        "**Una riga di tabella** — «i grassi saturi sono errati». L'osservazione segue la riga, non il numero di riga."
                    ]
                },
                {
                    "note": "Scrivere da un campo o da una riga anziché da «L'intera scheda» fa risparmiare tempo a tutti: il vostro referente vede subito di che cosa parlate, senza cercare tra duecento campi."
                },
                {
                    "p": "La discussione è in sola lettura una volta chiuso il referenziamento: potete rileggere lo scambio, non aggiungervi nulla. La schermata vi indica quale di queste ragioni si applica."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Discussioni"
                        }
                    ]
                }
            ]
        },
        {
            "id": "contact",
            "icon": "support_agent",
            "title": "Chi contattare",
            "summary": "Il vostro referente è il vostro cliente. La discussione collegata alla scheda è il canale giusto.",
            "blocks": [
                {
                    "p": "Questo portale vi viene aperto dal vostro cliente: è lui a configurare i documenti attesi, le fasi della procedura guidata, le convalide e le scadenze. È quindi il vostro primo interlocutore per tutto ciò che riguarda i contenuti."
                },
                {
                    "ul": [
                        "**Una domanda su una scheda, un'osservazione, una correzione, un elenco da sbloccare** — usate la discussione collegata alla scheda o all'attività. Il vostro messaggio raggiunge la persona che segue il vostro fascicolo e resta collegato al prodotto interessato.",
                        "**Un documento rifiutato senza una motivazione chiara** — rispondete nella discussione del prodotto prima di caricarlo di nuovo.",
                        "**Una scadenza che non potete rispettare** — ditelo nella discussione anziché lasciare che l'attività vada in ritardo.",
                        "**Un problema di accesso** (password, collega da aggiungere, account da chiudere) — rivolgetevi al vostro referente presso il cliente: gli account vengono creati e chiusi da lui, non da questo portale."
                    ]
                },
                {
                    "note": "I contatti che avete dichiarato, e quelli del vostro cliente, sono elencati nella vostra scheda fornitore, scheda Contatti."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Discussioni"
                        },
                        {
                            "href": "/company",
                            "icon": "business",
                            "label": "La mia azienda"
                        },
                        {
                            "href": "/specs",
                            "icon": "menu_book",
                            "label": "Capitolati"
                        }
                    ]
                }
            ]
        }
    ],
    "app/login/page#PAGE_TEXT": {
        "welcome": "Benvenuto",
        "intro": "Accedete al vostro spazio fornitore: le vostre attività, i vostri prodotti, i vostri documenti e il vostro stato di qualifica.",
        "chooseTenant": "Selezionate il vostro cliente",
        "chooseTenantHelp": "Lavorate per più clienti beCPG? Scegliete quello di cui volete aprire il fascicolo.",
        "sso": "Sarete reindirizzati al servizio di autenticazione del vostro cliente.",
        "testNotice": "Istanza di TEST — i dati inseriti qui non hanno valore contrattuale.",
        "help": "Serve aiuto?",
        "errorTitle": "Accesso non riuscito",
        "pitch": "Il portale fornitori beCPG",
        "sellingPoints": [
            {
                "icon": "assignment_turned_in",
                "text": "Le vostre richieste di referenziamento e le vostre attività, in un unico posto"
            },
            {
                "icon": "folder_shared",
                "text": "I vostri documenti e certificati, con le relative date di scadenza"
            },
            {
                "icon": "verified",
                "text": "Il vostro stato di qualifica, mantenuto aggiornato dal vostro cliente"
            }
        ]
    },
    "app/login/page#ERROR_TEXT": {
        "oidc_not_configured": "L'autenticazione non è configurata per questo cliente.",
        "tenant_mismatch": "La vostra sessione apparteneva a un altro cliente. Effettuate di nuovo l'accesso.",
        "dev_auth_misconfigured": "La modalità di sviluppo è attiva ma configurata in modo errato.",
        "session_expired": "La vostra sessione è scaduta. Effettuate di nuovo l'accesso."
    },
    "app/messages/page#LABELS": {
        "title": "Discussioni",
        "subtitle": "Gli scambi con il cliente, prodotto per prodotto",
        "subjects": "Argomenti",
        "messageCount": "{count} messaggio/i",
        "search": "Cerca un argomento",
        "myRecord": "La mia scheda fornitore",
        "back": "Argomenti",
        "placeholder": "Scrivete un messaggio…",
        "send": "Invia",
        "sending": "Invio in corso…",
        "empty": "Nessun messaggio",
        "emptyHint": "Avviate la discussione — il cliente riceverà una notifica.",
        "noSubject": "Scegliete un argomento",
        "noSubjectHint": "Selezionate un prodotto o la vostra scheda per vedere gli scambi.",
        "noSubjects": "Nessun argomento di discussione",
        "noSubjectsHint": "Le discussioni sono legate ai vostri prodotti. Al momento nessun prodotto è collegato a voi.",
        "field": "Campo",
        "edited": "modificato",
        "you": "Voi",
        "openSubject": "Apri la scheda",
        "thread": "Discussione",
        "more": "Carica altri",
        "loading": "Caricamento…",
        "tooLong": "Messaggio troppo lungo (massimo 20.000 caratteri).",
        "denyReasons": {
            "noAssignedTask": "Il referenziamento è chiuso: questa discussione è in sola lettura.",
            "readAccess": "Disponete solo dell'accesso in lettura a questa scheda.",
            "noPermission": "Non siete autorizzati a scrivere in questa discussione."
        }
    },
    "app/monitor/campaigns/[id]/page#LABELS": {
        "back": "Progetti",
        "notFound": "Progetto non trovato",
        "notFoundHint": "Questo progetto non esiste, non è un progetto fornitore oppure è fuori dal vostro perimetro.",
        "kpi": {
            "response": "Tasso di risposta",
            "age": "Aperto da",
            "due": "Scadenza",
            "tasks": "Attività aperte"
        },
        "hints": {
            "days": "{count} g",
            "noDue": "Nessuna scadenza",
            "overdue": "{count} g di ritardo",
            "dueIn": "tra {count} g",
            "late": "{count} in ritardo",
            "unanswered": "Nessuna risposta dall'apertura"
        },
        "tasks": "Attività aperte",
        "tasksEmpty": "Nessuna attività aperta su questo progetto.",
        "tasksHint": "Ciò che il workflow attende, e da chi.",
        "noAssignee": "Non assegnata",
        "entities": "Oggetto del progetto",
        "entitiesHint": "Aprite la scheda per leggere i dati in corso di inserimento e la relativa discussione.",
        "entitiesEmpty": "Questo progetto non fa riferimento ad alcuna scheda.",
        "unreadable": "Fuori dal vostro perimetro",
        "open": "Apri",
        "suppliers": "Fornitori",
        "manager": "Responsabile",
        "discussion": "Discussione del progetto",
        "state": "Stato"
    },
    "app/monitor/campaigns/page#LABELS": {
        "title": "Progetti",
        "subtitle": "Progetti di referenziamento e di rinnovo aperti. Selezionate dei progetti per sollecitare o fare escalation verso i relativi fornitori.",
        "stats": {
            "open": "Progetti aperti",
            "openState": "Progetti · {state}",
            "response": "Tasso di risposta",
            "unanswered": "Nessuna risposta",
            "reminders": "Solleciti da inviare"
        },
        "hints": {
            "scanned": "{count} analizzati",
            "meanCompletion": "Avanzamento medio {value}%",
            "escalations": "{count} da sottoporre a escalation",
            "late": "{count} in ritardo",
            "noEscalation": "Nessuna escalation necessaria",
            "answered": "{count} con risposta"
        },
        "startCampaign": "Avvia un progetto",
        "allOpen": "Tutti i progetti aperti",
        "state": "Stato del progetto",
        "sortLabel": "Ordina per",
        "sorts": {
            "dueDate": "Scadenza più vicina",
            "completion": "Tasso di risposta più basso",
            "age": "Aperti da più tempo",
            "name": "Nome"
        },
        "searchSupplier": "Filtra per fornitore",
        "truncated": "Finestra di analisi: beCPG limita un elenco a 250 righe e sono stati letti {scanned} progetto/i. L'ordinamento e i totali di questa pagina coprono quella finestra — restringete lo stato o il perimetro per una vista completa.",
        "scopeEmpty": "Nessun fornitore corrisponde a questo perimetro. Nessun progetto può esservi collegato: i contatori qui sopra sono zero per costruzione, non misurazioni.",
        "parkScoped": "Contatori limitati al perimetro filtrato ({count} fornitore/i).",
        "noRate": "Nessun progetto da valutare",
        "unsupported": "Filtro/i non supportato/i dal modello beCPG standard: {names}. Configurateli lato cliente.",
        "pageOf": "{from}-{to} di {total} progetti",
        "previous": "Precedente",
        "next": "Successivo",
        "rows": "Righe",
        "reminder": "Il vostro progetto aperto sul portale è ancora in attesa della vostra risposta. Vi preghiamo di completare al più presto le attività che vi sono assegnate.",
        "hintTargets": "Fornitori dei progetti selezionati",
        "noteReminder": "beCPG non conserva alcun registro dei solleciti: la colonna «Ultimo sollecito» mostra l'ultima attività sul progetto, il dato effettivamente disponibile più vicino."
    },
    "app/monitor/documents/page#LABELS": {
        "title": "Conformità documentale",
        "subtitle": "Matrice fornitore × tipo di documento. Selezionate celle o righe per inviare un sollecito multiplo.",
        "search": "Cerca un fornitore",
        "allTypes": "Tutti i tipi di documento",
        "allStatuses": "Tutti gli stati",
        "mandatoryOnly": "Solo documenti obbligatori",
        "export": "Esporta (CSV)",
        "stats": {
            "suppliers": "Fornitori",
            "missing": "Mancanti",
            "expired": "Scaduti",
            "expiring": "Da rinnovare",
            "refused": "Rifiutati"
        },
        "statuses": {
            "valid": "Valido",
            "expiring": "In scadenza",
            "expired": "Scaduto",
            "missing": "Mancante",
            "refused": "Rifiutato",
            "toValidate": "In verifica"
        },
        "truncated": "Parco più ampio della finestra di analisi ({scanned} fornitori su {total}): restringete i filtri per una matrice completa.",
        "scopeEmpty": "Nessun fornitore corrisponde a questo perimetro. Non è stata eseguita alcuna interrogazione sui documenti: i contatori qui sopra sono zero per costruzione, non misurazioni.",
        "cellsScope": "celle · sui {total} fornitori del parco",
        "statusScope": "Filtro di visualizzazione «{status}»: {kept} riga/righe mantenuta/e sulle {shown} mostrate in questa pagina. I contatori qui sopra coprono i {total} fornitori del parco, non questa pagina.",
        "unsupported": "Filtro/i non supportato/i dal modello beCPG standard: {names}. Configurateli lato cliente.",
        "pageOf": "{from}-{to} di {total} fornitori",
        "previous": "Precedente",
        "next": "Successivo",
        "rows": "Righe",
        "reminder": "Il vostro fascicolo fornitore contiene documenti da aggiornare sul portale: {types}. Vi preghiamo di caricarli al più presto.",
        "reminderGeneric": "Nel vostro fascicolo fornitore mancano documenti obbligatori o sono scaduti. Vi preghiamo di aggiornarli sul portale.",
        "hintTypes": "{count} tipo/i di documento interessato/i"
    },
    "app/monitor/layout#LABELS": {
        "metaTitle": "Monitoraggio fornitori — beCPG",
        "metaDescription": "Il parco fornitori in sintesi: conformità documentale e progetti",
        "title": "Spazio di monitoraggio",
        "denied": "Lo spazio di monitoraggio è riservato ai team interni",
        "deniedGroups": "Il vostro account non appartiene ad alcuno dei gruppi beCPG che danno accesso allo spazio di monitoraggio: {groups}. Chiedete l'iscrizione al vostro amministratore beCPG.",
        "backSupplier": "Vai alla mia dashboard"
    },
    "app/monitor/page#LABELS": {
        "title": "Monitoraggio del parco fornitori",
        "description": "Il parco in una pagina: qualifica, conformità documentale, scadenze, progetti e non conformità. In tempo reale, senza cubo.",
        "generatedAt": "Dati aggiornati alle {time}",
        "openList": "Vedi l'elenco completo",
        "openDocuments": "Conformità documentale",
        "openCampaigns": "Progetti",
        "openQuality": "Non conformità",
        "truncated": "Parco più ampio della finestra di analisi: letti {scanned} fornitori su {total}. I contatori contrassegnati con «≈» sono limitati; la ripartizione e la top 10 coprono la finestra."
    },
    "app/monitor/products/page#LABELS": {
        "title": "Prodotti fornitore",
        "subtitle": "I prodotti affidati a un fornitore. Filtrate sulla data del certificato per vedere ciò che è da rinnovare.",
        "search": "Cerca un prodotto, un codice, una denominazione legale…",
        "state": "Stato del prodotto",
        "anyState": "Tutti gli stati",
        "certified": "Data del certificato",
        "anyCertified": "Tutte",
        "certifiedNone": "Nessuna data",
        "certifiedYears": "Certificato da più di {count} anno/i",
        "columns": {
            "name": "Prodotto",
            "code": "Codice",
            "supplierRef": "Riferimento fornitore",
            "suppliers": "Fornitore/i",
            "plants": "Stabilimenti del fornitore",
            "state": "Stato",
            "certificate": "Data del certificato",
            "modified": "Aggiornato"
        },
        "age": "{count} anno/i fa",
        "ageMonths": "{count} mese/i fa",
        "none": "—",
        "empty": "Nessun prodotto in questo perimetro",
        "emptyHint": "Nessuna entità prodotto presenta l'aspetto fornitore con questi filtri. I prodotti compaiono qui non appena vi viene collegato un fornitore.",
        "pageOf": "{from} - {to} di {total}",
        "previous": "Pagina precedente",
        "next": "Pagina successiva",
        "rows": "Righe per pagina",
        "sortScope": "L'ordinamento si applica alla pagina visualizzata, non all'intero parco."
    },
    "app/monitor/quality/page#LABELS": {
        "title": "Non conformità",
        "subtitle": "NC fornitori, tempi di trattamento e avanzamento delle azioni correttive. Selezionate delle NC per sollecitare, fare escalation o sospendere i fornitori interessati.",
        "stats": {
            "open": "NC aperte",
            "blocking": "Bloccanti",
            "overdue": "Oltre l'obiettivo",
            "delay": "Tempo medio"
        },
        "hints": {
            "total": "{count} in totale",
            "blocking": "Porta lo stato di qualifica a «sospeso»",
            "noBlocking": "Nessuna qualifica bloccata da una NC",
            "actionsLate": "{count} azione/i correttiva/e in ritardo",
            "noActionsLate": "Nessuna azione correttiva in ritardo",
            "closing": "Chiusura media {value} g",
            "noClosing": "Nessuna NC chiusa in questo perimetro",
            "closingHidden": "{count} NC chiuse — spuntate «Includi NC chiuse» per il tempo di chiusura"
        },
        "dayUnit": "g",
        "allStates": "Tutti gli stati",
        "allTypes": "Tutti i tipi",
        "includeClosed": "Includi NC chiuse",
        "searchSupplier": "Filtra per fornitore",
        "truncated": "Più NC della finestra di analisi ({scanned} analizzate): restringete i filtri per una vista completa.",
        "inexact": "Contatori approssimativi: il motore ha restituito un totale limitato per almeno un'interrogazione.",
        "scopeEmpty": "Nessun fornitore corrisponde a questo perimetro. Non è stata eseguita alcuna interrogazione: i contatori qui sopra sono zero per costruzione, non misurazioni.",
        "unsupported": "Filtro/i non supportato/i dal modello beCPG standard: {names}. Configurateli lato cliente.",
        "pageOf": "{from}-{to} di {total} NC",
        "previous": "Precedente",
        "next": "Successivo",
        "rows": "Righe",
        "reminder": "Una non conformità aperta vi riguarda. Vi preghiamo di gestire al più presto sul portale le relative azioni correttive.",
        "hintTargets": "Fornitori delle NC selezionate",
        "note": "Tempo di trattamento: dalla creazione della NC; per una NC chiusa, tra la creazione e l'ultima modifica — beCPG non memorizza alcuna data di chiusura."
    },
    "app/monitor/suppliers/[id]/page#LABELS": {
        "unavailable": {
            "title": "Dati non disponibili",
            "message": "beCPG non ha potuto restituire questo blocco: l'elenco vuoto non dice nulla su questo fornitore."
        },
        "back": "Fornitori",
        "startCampaign": "Avvia un progetto",
        "notFound": "Fornitore non trovato",
        "notFoundHint": "Questo fornitore non esiste, oppure è fuori dal vostro perimetro: il portale non rivela mai un nodo non coperto dai vostri diritti beCPG.",
        "kpi": {
            "approval": "Stato di qualifica",
            "completion": "Completezza",
            "documents": "Documenti obbligatori",
            "nc": "NC bloccanti",
            "campaigns": "Progetti aperti"
        },
        "kpiHints": {
            "derived": "Calcolato, mai memorizzato",
            "documents": "{expired} scaduti · {expiring} in scadenza · {missing} mancanti",
            "completion": "{count} catalogo/i attivo/i",
            "campaigns": "{late} in ritardo",
            "cached": "stato fornito dalla cache"
        },
        "why": {
            "title": "Perché questo stato",
            "subtitle": "Le righe che determinano lo stato",
            "empty": "Nessuna anomalia: documenti obbligatori validi, nessuna NC bloccante, nessun catalogo bloccante.",
            "more": "… e altri {count}",
            "entity": "su {name}",
            "priority": "priorità {priority}",
            "catalog": "Catalogo bloccante non soddisfatto"
        },
        "documents": {
            "title": "Documenti",
            "subtitle": "Documenti attesi e date di validità",
            "empty": "Nessun documento atteso o fornito per questo fornitore",
            "mandatory": "obbligatorio",
            "download": "Scarica",
            "summary": "{satisfied}/{mandatory} obbligatori soddisfatti · {total} documenti"
        },
        "products": {
            "title": "Prodotti collegati",
            "subtitle": "Entità collegate al fornitore",
            "empty": "Nessun prodotto collegato",
            "emptyHint": "Si possono trovare solo i prodotti archiviati sotto il fornitore, o collegati a uno dei suoi progetti o documenti: un'entità collegata tramite «Fornitori» e archiviata altrove non è indicizzata da Alfresco."
        },
        "subSuppliers": {
            "title": "Subfornitori",
            "empty": "Nessun subfornitore dichiarato"
        },
        "projects": {
            "title": "Progetti aperti",
            "empty": "Nessun progetto aperto",
            "manager": "Responsabile: {name}",
            "due": "Scadenza {date}",
            "late": "In ritardo",
            "unanswered": "Nessuna risposta da {days} giorni"
        },
        "activity": {
            "title": "Cronologia degli scambi",
            "empty": "Nessuno scambio registrato",
            "message": "Messaggio",
            "activity": "Attività"
        },
        "process": {
            "title": "Avvia un processo",
            "hint": "Referenziamento, rinnovo, apertura di una NC… a seconda di ciò che l'istanza consente.",
            "none": "Nessun processo è consentito su questa istanza (PORTAL_PROCESS_TEMPLATES).",
            "launch": "Avvia",
            "confirmTitle": "Avviare «{process}»?",
            "confirmMessage": "Verrà creato un progetto beCPG per questo fornitore a partire dal modello autorizzato. Un processo avviato non può essere annullato dal portale.",
            "started": "Processo avviato."
        },
        "identity": {
            "code": "Codice",
            "erpCode": "Codice ERP",
            "legalName": "Ragione sociale",
            "state": "Stato beCPG",
            "family": "Famiglia",
            "subFamily": "Sottofamiglia",
            "sites": "Siti",
            "subsidiaries": "Filiali",
            "buyer": "Buyer di riferimento",
            "email": "Contatto",
            "lastActivity": "Ultima attività",
            "parent": "Fornitore padre",
            "none": "—"
        },
        "generatedAt": "Dati aggiornati alle {time}"
    },
    "app/monitor/suppliers/page#LABELS": {
        "title": "Fornitori",
        "description": "Il parco, colonna per colonna. Selezionate delle righe per confrontare, sollecitare, fare escalation o sospendere.",
        "statuses": {
            "suspended": "Sospeso",
            "toRenew": "Da rinnovare",
            "inProgress": "In corso",
            "approved": "Qualificato"
        },
        "statusHint": "Fate clic per filtrare",
        "statusFiltered": "Filtro attivo",
        "export": "Esporta (CSV)",
        "exportCutTitle": "Esportazione incompleta: {scanned} righe su {total}",
        "exportCutMessage": "beCPG limita un elenco a 250 righe per interrogazione, quindi l'esportazione copre la finestra letta, non l'intero parco. Restringete i filtri (famiglia, buyer, stato) ed esportate a lotti per ottenere un file completo.",
        "exportCutConfirm": "Esporta la finestra",
        "generatedAt": "Dati aggiornati alle {time}",
        "windowOf": "{from}-{to} di {total} fornitori",
        "previous": "Finestra precedente",
        "next": "Finestra successiva",
        "truncated": "Parco più ampio della finestra di analisi ({scanned} letti su {total}): ordinamento e classifica coprono quella finestra. Restringete i filtri per una classifica esatta sull'intero parco.",
        "sortScope": "Ordinato all'interno della finestra letta",
        "sortedBy": "Ordinamento iniziale: {sort}",
        "reminder": "Buongiorno,\n\nil vostro fascicolo fornitore richiede un aggiornamento (documenti obbligatori mancanti, scaduti o in attesa).\nVi preghiamo di accedere al portale per completarlo.\n\nCordiali saluti,",
        "countsScope": "Ripartizione sui {scanned} fornitori letti",
        "sortNames": {
            "risk": "rischio, decrescente",
            "name": "nome",
            "code": "codice",
            "status": "stato di qualifica",
            "completion": "completezza",
            "expiring": "documenti in scadenza",
            "expired": "documenti scaduti",
            "nc": "NC aperte",
            "lastActivity": "ultima attività",
            "buyer": "buyer"
        }
    },
    "app/not-found#LABELS": {
        "title": "Pagina non trovata",
        "message": "Questo indirizzo non esiste, oppure l'elemento a cui rimanda non è più accessibile. Se siete arrivati da un'email, il link potrebbe essere scaduto.",
        "home": "Torna alla home"
    },
    "app/products/[id]/page#LABELS": {
        "sheet": "Scheda",
        "notFound": "Prodotto non trovato",
        "notFoundHint": "Questa scheda non esiste, oppure non rientra nel vostro perimetro.",
        "back": "I miei prodotti",
        "partial": "Questa scheda è visualizzata in modo incompleto: fa riferimento ad almeno un dato che il vostro account potrebbe non poter leggere. I campi interessati sono assenti dalla schermata — il che non significa che siano vuoti. Chiedete l'accesso al vostro referente beCPG se vi serve uno di essi.",
        "request": "Richiedere un aggiornamento"
    },
    "app/products/page#LABELS": {
        "title": "I miei prodotti",
        "subtitle": "Le schede che il cliente vi chiede di mantenere aggiornate",
        "search": "Cerca un prodotto",
        "allStates": "Tutti gli stati",
        "allTypes": "Tutti i tipi",
        "branch": "Aggiornamento",
        "branchFrom": "Aggiornamento della versione {version}",
        "columns": {
            "name": "Prodotto",
            "code": "Codice",
            "type": "Tipo",
            "state": "Stato",
            "completion": "Completamento",
            "project": "Progetto",
            "supplierRef": "Riferimento fornitore",
            "certificateDate": "Data del certificato",
            "modified": "Aggiornato",
            "actions": "Azioni"
        },
        "stats": {
            "total": "Prodotti",
            "valid": "Convalidati",
            "pending": "In corso",
            "completion": "Completamento medio"
        },
        "empty": "Nessun prodotto",
        "emptyHint": "Nessun prodotto è ancora collegato a voi. Una scheda compare qui non appena il cliente ve ne assegna una.",
        "request": "Richiedere un aggiornamento"
    },
    "app/specs/page#LABELS": {
        "title": "Capitolati",
        "subtitle": "I documenti di riferimento che il cliente applica ai vostri prodotti",
        "stats": {
            "specs": "Capitolati",
            "products": "Prodotti coperti"
        },
        "emptyHint": "Nessun capitolato è disponibile per voi. Il cliente ve ne condividerà uno se applicabile."
    },
    "app/tasks/[id]/page#LABELS": {
        "loading": "Attività",
        "notFound": "Attività non trovata",
        "notFoundHint": "Questa attività non esiste più, è già stata gestita oppure non rientra nel vostro perimetro.",
        "back": "Le mie attività",
        "noEntity": "Questa attività non fa riferimento ad alcuna scheda",
        "noEntityHint": "Il deliverable collegato a questa attività non fa riferimento ad alcun prodotto. Contattate il vostro cliente tramite la discussione del progetto.",
        "documents": "Documenti da fornire",
        "viewDocument": "Visualizza il documento",
        "due": "Scadenza il {date}",
        "late": "In ritardo",
        "done": "Completata",
        "discussion": "Discussione"
    },
    "app/tasks/page#LOCAL": {
        "title": "Le mie attività",
        "description": "Tutto ciò che il vostro cliente si aspetta da voi, filtrabile e ordinato per urgenza.",
        "search": "Cerca un'attività, un prodotto, un codice…",
        "anyType": "Tutti i tipi",
        "anyPriority": "Tutte le priorità",
        "anyProduct": "Tutti i prodotti",
        "anyDue": "Tutte le scadenze",
        "dueLate": "In ritardo",
        "dueToday": "Oggi",
        "dueWeek": "Entro 7 giorni",
        "dueMonth": "Entro 30 giorni",
        "dueNone": "Nessuna scadenza",
        "stateOpen": "In corso",
        "stateDone": "Completate",
        "colTask": "Attività",
        "colProduct": "Prodotto / cliente",
        "colType": "Tipo",
        "colPriority": "Priorità",
        "colDue": "Scadenza",
        "colProgress": "Avanzamento",
        "kpiTotal": "Attività",
        "kpiLate": "In ritardo",
        "kpiNext": "Prossima scadenza",
        "kpiNone": "Nessuna",
        "reset": "Reimposta",
        "empty": "Nessuna attività",
        "emptyHint": "Al momento non vi è richiesto nulla.",
        "emptyFiltered": "Nessuna attività corrisponde a questi filtri.",
        "truncated": "Sono mostrate solo le prime attività. Restringete i filtri per vedere le altre.",
        "scoped": "Perimetro: {supplier}.",
        "scopedAll": "Perimetro: tutti i fornitori.",
        "scopedChange": "Il fornitore si sceglie nell'angolo in alto a destra.",
        "orphans": "{count} attività non sono collegate ad alcuna delle vostre schede fornitore e non sono elencate qui. Scegliete «Tutti i fornitori» nell'angolo in alto a destra per vederle.",
        "priorityHigh": "Alta",
        "priorityMedium": "Media",
        "priorityLow": "Bassa",
        "noPriority": "Nessuna priorità",
        "untitled": "Attività senza titolo",
        "caption": "Il mio elenco di attività"
    },
    "components/dashboard/ActionsCard#LOCAL": {
        "title": "Azioni richieste",
        "open": "attività aperta/e",
        "late": "{count} in ritardo",
        "onTime": "Nessuna in ritardo",
        "nextDue": "Prossima scadenza: {date}",
        "noDue": "Nessuna scadenza prevista",
        "none": "Nulla da fare al momento",
        "all": "Vedi tutte le mie attività"
    },
    "components/dashboard/ActionsCard#TASK_TYPE_META.wizard": "Procedura guidata",
    "components/dashboard/ActionsCard#TASK_TYPE_META.signature": "Firma",
    "components/dashboard/ActionsCard#TASK_TYPE_META.document": "Documento",
    "components/dashboard/ActionsCard#TASK_TYPE_META.review": "Revisione",
    "components/dashboard/ApprovalCard#REASONS": {
        "documentExpired": "Documento obbligatorio scaduto",
        "documentExpiring": "Documento in scadenza",
        "documentMissing": "Documento atteso non fornito",
        "documentRefused": "Documento rifiutato",
        "catalogIncomplete": "Scheda incompleta",
        "openProject": "Progetto di referenziamento aperto",
        "openNonConformity": "Non conformità aperta"
    },
    "components/dashboard/ApprovalCard#LOCAL": {
        "title": "Stato di qualifica",
        "validUntil": "Valido fino al {date}",
        "noValidity": "Nessuna scadenza nota",
        "why": "Perché?",
        "unknown": "Stato non disponibile",
        "unknownHint": "Non è stato possibile calcolare lo stato. Riprovate più tardi.",
        "allGood": "Nulla è bloccante"
    },
    "components/dashboard/CompletionCard#LOCAL": {
        "title": "Completezza",
        "scope": "{scored} prodotto/i valutato/i su {total}",
        "noScore": "Nessun catalogo ancora valutato",
        "noScoreHint": "La completezza compare non appena un prodotto è stato formulato.",
        "seeProducts": "Vedi i miei prodotti",
        "worst": "Cataloghi meno completi"
    },
    "components/dashboard/DiscussionList#LOCAL": {
        "title": "Le mie discussioni",
        "empty": "Nessuna discussione",
        "emptyHint": "Le osservazioni del vostro cliente sulle vostre attività e sui vostri prodotti compariranno qui.",
        "all": "Vedi tutto",
        "messages": "{count} messaggio/i",
        "anonymous": "Utente",
        "onField": "su {field}",
        "unread": "Nuovo",
        "unreadCount": "{count} non letti"
    },
    "components/dashboard/DocumentList#LOCAL": {
        "title": "I miei documenti",
        "empty": "Nessun documento atteso",
        "emptyHint": "I certificati richiesti dal vostro cliente compariranno qui.",
        "all": "Vedi tutto",
        "supplierScope": "Fornitore",
        "mandatory": "Obbligatorio",
        "until": "Fino al {date}",
        "expiredSince": "Scaduto da {days} g",
        "expiresIn": "Scade tra {days} g",
        "noValidity": "Nessuna data di fine",
        "upload": "Carica una nuova versione",
        "uploadFirst": "Carica il documento",
        "download": "Scarica",
        "uploading": "Caricamento in corso…",
        "uploaded": "Documento caricato. È ora in attesa della convalida del vostro cliente."
    },
    "components/dashboard/DocumentsCard#LOCAL": {
        "title": "Documenti",
        "valid": "Validi",
        "expiring": "In scadenza < {days} g",
        "expired": "Scaduti",
        "missing": "Mancanti",
        "refused": "Rifiutati",
        "total": "{count} documento/i monitorato/i",
        "none": "Nessun documento monitorato",
        "unavailable": "Il monitoraggio dei documenti non è disponibile su questa istanza.",
        "all": "Vedi i miei documenti",
        "toHandle": "da gestire"
    },
    "components/dashboard/NotificationList#NOTIFICATION_LABELS": {
        "title": "Le mie notifiche",
        "subtitle": "Prima le più urgenti",
        "empty": "Nessuna notifica",
        "emptyHint": "Al momento nulla richiede la vostra attenzione.",
        "overdue": "{days} g di ritardo",
        "expiresIn": "Tra {days} g",
        "types": {
            "task.overdue": "Attività in ritardo",
            "document.expired": "Documento scaduto",
            "document.expiring": "Documento da rinnovare",
            "document.missing": "Documento mancante",
            "document.refused": "Documento rifiutato"
        },
        "assigned": "Assegnata a me",
        "mandatory": "Obbligatorio",
        "isNew": "Nuovo",
        "scopeEmpty": {
            "noSupplierIdentity": "Il vostro account non è collegato ad alcun fornitore, quindi non è possibile identificare i vostri documenti. Sono elencate solo le vostre attività. Segnalatelo al vostro referente presso il cliente.",
            "internalAccount": "Account interno: gli avvisi sui documenti seguono il fornitore che li deve, quindi la vostra campanella elenca solo le vostre attività. La vista sull'intero parco si trova in Conformità documentale.",
            "fallback": "Il perimetro del vostro account è vuoto: alcuni avvisi non possono essere calcolati."
        },
        "countTitle": "{total} in sospeso · le {shown} più urgenti qui sotto"
    },
    "components/dashboard/ProductList#LOCAL": {
        "title": "I miei prodotti",
        "empty": "Nessun prodotto",
        "emptyHint": "I prodotti che il vostro cliente vi affida compariranno qui.",
        "all": "Vedi tutto",
        "updatedOn": "Aggiornato il {date}",
        "request": "Richiedi un aggiornamento",
        "noCompletion": "Non valutato",
        "completion": "Completezza"
    },
    "components/dashboard/ProductList#STATE_LABELS": {
        "Valid": "Approvato",
        "ToValidate": "In attesa di approvazione",
        "Refused": "Da correggere",
        "Simulation": "Bozza",
        "Stopped": "Interrotto",
        "Archived": "Archiviato"
    },
    "components/dashboard/TaskList#LOCAL": {
        "title": "Le mie attività",
        "subtitle": "Ordinate per urgenza",
        "empty": "Nessuna attività in corso",
        "emptyHint": "Tutto è aggiornato. Le nuove richieste del cliente compariranno qui.",
        "all": "Vedi tutto",
        "overdue": "{days} g di ritardo",
        "overdueToday": "Scade oggi",
        "dueIn": "Tra {days} g",
        "noDue": "Nessuna scadenza",
        "priorityHigh": "Alta",
        "priorityMedium": "Media",
        "priorityLow": "Bassa",
        "progress": "Avanzamento",
        "untitled": "Attività senza titolo"
    },
    "components/datalist/RowFormModal#LABELS": {
        "title": "Modifica la riga",
        "create": "Nuova riga",
        "save": "Salva",
        "cancel": "Annulla",
        "description": "I campi che la griglia non mostra si inseriscono qui.",
        "refused": "La riga non è stata salvata. Verificate i campi obbligatori, poi riprovate."
    },
    "components/datalist/useDataList#DATALIST_LABELS": {
        "rows": "{count} riga/righe",
        "addRow": "Aggiungi una riga",
        "deleteRow": "Elimina la riga",
        "editRow": "Modifica la riga",
        "moveUp": "Sposta su",
        "moveDown": "Sposta giù",
        "actions": "Azioni",
        "order": "Ordine",
        "row": "Riga {index}",
        "newRow": "Nuova riga",
        "totalRow": "Riga del totale, calcolata da beCPG",
        "incomplete": "Compilate i campi obbligatori per salvare questa riga",
        "sortBy": "Ordina per {column}",
        "saving": "Salvataggio…",
        "saved": "Salvato",
        "discard": "Annulla le modifiche",
        "failed": "Salvataggio non riuscito",
        "retry": "Riprova",
        "deleting": "Eliminazione…",
        "search": "Cerca nell'elenco",
        "readOnly": "Sola lettura",
        "frozenTitle": "Elenco convalidato dal vostro cliente",
        "frozenText": "Il vostro cliente ha convalidato questo elenco: ora è bloccato e non può più essere modificato. Se è necessaria una correzione, chiedetene la riapertura tramite la discussione del progetto.",
        "readAccessTitle": "Sola consultazione",
        "readAccessText": "Disponete solo dell'accesso in lettura a questa entità.",
        "noTaskTitle": "Nessuna attività aperta",
        "noTaskText": "La modifica è possibile solo finché vi è assegnata un'attività. Questo elenco resta visibile.",
        "wizardReadOnlyTitle": "Procedura guidata in sola lettura",
        "wizardReadOnlyText": "Questa procedura guidata è configurata per la consultazione: non è possibile alcuna modifica.",
        "protectedTitle": "Campo protetto",
        "protectedText": "La colonna «{column}» è protetta: il suo valore alimenta i controlli di conformità del vostro cliente. Confermate di volerla modificare.",
        "protectedUnlock": "Modifica comunque",
        "protectedLocked": "Campo protetto — fate clic per sbloccare",
        "deleteTitle": "Eliminare questa riga?",
        "deleteText": "Questa riga verrà rimossa definitivamente dall'elenco.",
        "expand": "Mostra i dettagli",
        "collapse": "Nascondi i dettagli",
        "nestedEmpty": "Nessun elemento",
        "empty": "Questo elenco è vuoto",
        "emptyHint": "Aggiungete una prima riga per iniziare.",
        "emptyReadOnly": "Il vostro cliente non attende alcuna riga in questo elenco.",
        "mandatory": "Campo obbligatorio",
        "detail": "Dettaglio",
        "duplicate": "Duplica questa riga",
        "select": "Seleziona",
        "selectRow": "Seleziona la riga {index}",
        "selectAll": "Seleziona tutte le righe di questa pagina",
        "selected": "{count} riga/righe selezionata/e",
        "clearSelection": "Annulla la selezione",
        "bulkMoveUp": "Sposta su",
        "bulkMoveUpLong": "Sposta su la selezione",
        "bulkMoveDown": "Sposta giù",
        "bulkMoveDownLong": "Sposta giù la selezione",
        "bulkDuplicate": "Duplica",
        "bulkDuplicateLong": "Duplica la selezione",
        "bulkDelete": "Elimina",
        "bulkDeleteLong": "Elimina la selezione",
        "accessDenied": "Accesso negato",
        "accessDeniedRow": "Questa riga riporta una caratteristica che il vostro account non può leggere: non può essere modificata qui.",
        "bulkEdit": "Modifica",
        "bulkEditLong": "Modifica la selezione",
        "bulkEditTitle": "Modifica {count} riga/righe",
        "bulkEditDescription": "Gli stessi valori, su ogni riga selezionata, in un'unica scrittura.",
        "bulkEditPickFields": "Campi da compilare",
        "bulkEditSearchField": "Cerca un campo",
        "bulkEditApply": "Applica a {count} riga/righe",
        "bulkEditCancel": "Annulla",
        "bulkEditEmptyClears": "Un campo spuntato ma lasciato vuoto cancella il valore su ogni riga.",
        "bulkEditSkipped": "{count} riga/righe selezionata/e non può/possono essere modificata/e e resterà/resteranno invariata/e.",
        "bulkEditTooMany": "{count} righe selezionate, il massimo è {max}. Restringete la selezione.",
        "bulkEditNoColumn": "Nessuna colonna di questo elenco può essere compilata in serie.",
        "deleteSelectedTitle": "Eliminare {count} riga/righe?",
        "deleteSelectedText": "Queste righe verranno rimosse definitivamente dall'elenco.",
        "rowsPerPage": "Righe per pagina",
        "shortcuts": "Scorciatoie da tastiera",
        "shortcutsTitle": "Inserire con la tastiera",
        "shortcutList": [
            [
                "Tab / Shift+Tab",
                "cella successiva / precedente"
            ],
            [
                "Enter",
                "salva la riga e scende nella stessa colonna"
            ],
            [
                "Enter sull'ultima riga",
                "aggiunge una riga"
            ],
            [
                "↑ / ↓",
                "stessa colonna, riga sopra / sotto"
            ],
            [
                "Esc",
                "annulla le modifiche della riga in corso di modifica"
            ],
            [
                "Ctrl+Enter",
                "aggiunge una riga"
            ],
            [
                "Ctrl+D",
                "duplica la riga corrente"
            ],
            [
                "Ctrl+V",
                "incolla un blocco di celle da un foglio di calcolo"
            ]
        ],
        "pasteTitle": "Incollato da un foglio di calcolo",
        "pasteApplied": "{cells} valore/i incollato/i su {rows} riga/righe, di cui {created} nuova/e.",
        "pasteNothing": "Non è stato possibile incollare nulla.",
        "pasteUndo": "Annulla l'incolla",
        "pasteSave": "Salva le {count} riga/righe",
        "pasteResolving": "Ricerca delle etichette…",
        "pasteUnmatched": "{count} valore/i non acquisito/i — correggeteli a mano:",
        "pasteExtraColumns": "{count} colonna/e incollata/e oltre l'ultima colonna dell'elenco: ignorata/e.",
        "pasteRefusedRows": "{count} riga/righe oltre la fine dell'elenco: questo elenco non accetta nuove righe.",
        "pasteLine": "riga {line}",
        "pasteReasons": {
            "number": "era atteso un numero",
            "integer": "era atteso un numero intero",
            "boolean": "era atteso sì / no",
            "date": "era attesa una data (gg/mm/aaaa)",
            "list": "valore fuori dall'elenco proposto",
            "readonly": "colonna non modificabile",
            "association": "nessuna corrispondenza esatta nei dati di riferimento"
        }
    },
    "components/documents/DepositedDocuments#LABELS": {
        "title": "Documenti depositati",
        "subtitle": "I file presenti nella cartella di questo prodotto, qualunque sia il loro tipo.",
        "empty": "Nessun file depositato",
        "emptyHint": "La cartella di questo prodotto non contiene ancora alcun documento.",
        "signed": "Firmato",
        "download": "Scarica",
        "consult": "Visualizza",
        "modified": "Modificato il {date}"
    },
    "components/documents/DocumentUpload#LABELS": {
        "drop": "Trascinate un file qui",
        "or": "oppure",
        "browse": "Sfoglia",
        "deposit": "Carica",
        "renew": "Rinnova",
        "replace": "Sostituisci",
        "uploading": "Caricamento in corso…",
        "analysing": "Analisi del documento…",
        "done": "File caricato",
        "doneHint": "Verrà esaminato dal cliente. Non vi è richiesto nient'altro.",
        "retry": "Riprova",
        "cancel": "Annulla",
        "tooLarge": "File troppo grande ({size}). Massimo: {max}.",
        "badType": "Formato non supportato ({name}). Atteso: {accept}.",
        "empty": "Il file è vuoto.",
        "failed": "Il caricamento non è riuscito.",
        "locked": "Caricamento non disponibile",
        "accepted": "Formati: {accept} — {max} max",
        "aiValid": "Verificato dall'IA",
        "aiToValidate": "Da verificare",
        "aiRefused": "Rifiutato dall'IA",
        "aiOn": "Analizzato il {date}",
        "selected": "File selezionato",
        "validityHint": "Le date di validità riportate sul documento.",
        "validityInverted": "La data di fine precede la data di inizio.",
        "validityMissing": "Inserite la fine di validità prima di caricare il file.",
        "validityNotApplied": "Il file è stato caricato, ma le sue date di validità non sono state salvate. Inseritele sulla riga del documento."
    },
    "components/documents/DocumentValidity#LABELS": {
        "fromTo": "Valido dal {from} al {to}",
        "from": "Valido dal {from}",
        "to": "Valido fino al {to}",
        "none": "Nessuna data di validità",
        "required": "Validità da inserire",
        "expired": "Validità scaduta il {to}",
        "fromLabel": "Valido dal",
        "toLabel": "Valido fino al",
        "edit": "Modifica",
        "setDates": "Inserisci",
        "save": "Salva",
        "cancel": "Annulla",
        "saved": "Validità salvata",
        "inverted": "La data di fine precede la data di inizio.",
        "hint": "Le date riportate sul documento che state caricando."
    },
    "components/documents/DocumentViewer#LABELS": {
        "title": "Documento",
        "download": "Scarica",
        "close": "Chiudi",
        "unsupported": "Nessuna anteprima per questo tipo di file",
        "unsupportedHint": "Questo formato non può essere visualizzato in anteprima nel browser. Scaricatelo per leggerlo.",
        "failed": "Impossibile visualizzare il documento",
        "failedHint": "È comunque possibile scaricarlo."
    },
    "components/documents/ExpiryPill#LABELS": {
        "missing": "Da fornire",
        "refused": "Rifiutato",
        "toValidate": "In verifica",
        "valid": "Valido",
        "validUntil": "Valido fino al {date}",
        "expiredOn": "Scaduto il {date}",
        "expiredSince": "Scaduto da {days} giorni",
        "expiresToday": "Scade oggi",
        "expiresIn": "Scade tra {days} giorni",
        "noDate": "Nessuna data di validità",
        "from": "Dal",
        "to": "al",
        "since": "Dal",
        "until": "Fino al"
    },
    "components/documents/RequirementChecklist#LABELS": {
        "mandatory": "Obbligatorio",
        "satisfied": "Fornito",
        "upload": "Carica",
        "renew": "Rinnova",
        "replace": "Sostituisci",
        "download": "Scarica",
        "consult": "Visualizza",
        "details": "Dettagli",
        "hide": "Nascondi",
        "of": "{done} / {total} documenti obbligatori",
        "allDone": "Tutto è aggiornato",
        "allDoneHint": "Al momento non vi è richiesto nulla.",
        "nothing": "Nessun requisito documentale",
        "nothingHint": "Il cliente non ha ancora definito alcun documento atteso per questo perimetro.",
        "openCount": "{count} da gestire",
        "blockingCount": "{count} obbligatori da correggere",
        "category": "Categoria",
        "readOnly": "I caricamenti sono chiusi su questa scheda.",
        "noEntity": "Documenti del fornitore",
        "aiHints": "Note di analisi",
        "deposit": "Carica un file",
        "file": "File"
    },
    "components/documents/SignedDocumentList#LABELS": {
        "document": "Documento firmato",
        "signedAt": "Firmato il",
        "download": "Scarica",
        "search": "Cerca un documento firmato",
        "empty": "Nessun documento firmato",
        "emptyHint": "I documenti che firmate dalle vostre attività compaiono qui.",
        "truncated": "Elenco parziale: non è stato possibile leggere tutti i documenti firmati."
    },
    "components/form/FieldRenderer#LABELS": {
        "add": "Aggiungi un valore",
        "remove": "Rimuovi questo valore"
    },
    "components/form/FormRenderer#LABELS": {
        "empty": "Nessun campo da compilare",
        "emptyHint": "La configurazione di questo modulo non restituisce alcun campo."
    },
    "components/form/controls/AutocompleteControl#LABELS": {
        "search": "Cerca…",
        "hint": "Inserite nome o codice per filtrare i dati",
        "loading": "Ricerca in corso…",
        "noResult": "Nessun risultato",
        "clear": "Cancella",
        "remove": "Rimuovi",
        "browse": "Mostra i valori",
        "error": "La ricerca non è riuscita",
        "errorUnconfigured": "Questo campo non ha alcun elenco di valori configurato. Segnalatelo al vostro referente presso il cliente.",
        "showing": "Elementi visualizzati 1 - {count} di {total}",
        "favourite": "Preferito"
    },
    "components/form/controls/BooleanControl#LABELS": {
        "yes": "Sì",
        "no": "No",
        "empty": "(vuoto)"
    },
    "components/form/controls/MlTextControl#LABELS": {
        "more": "{count} altra/e lingua/e",
        "less": "Nascondi le altre lingue",
        "required": "richiesta dal cliente",
        "missing": "{count} lingua/e richiesta/e ancora vuota/e"
    },
    "components/form/controls/NumberUnitControl#DURATION_SYMBOLS": {
        "d": "giorni",
        "mo": "mesi",
        "y": "anni"
    },
    "components/form/controls/NumberUnitControl#LABELS": {
        "unit": "Unità"
    },
    "components/form/controls/ReadOnlyControl#LABELS": {
        "yes": "Sì",
        "no": "No",
        "empty": "—"
    },
    "components/form/controls/SelectControl#LABELS": {
        "placeholder": "Scegliete…",
        "offList": "valore non presente nell'elenco",
        "empty": "Nessun valore proposto"
    },
    "components/form/controls/SizeControl#LABELS": {
        "bytes": "byte"
    },
    "components/form/validation#VALIDATION_MESSAGES": {
        "validation.required": "Questo campo è obbligatorio.",
        "validation.number": "Inserite un numero.",
        "validation.integer": "Inserite un numero intero.",
        "validation.date": "Inserite una data valida.",
        "validation.boolean": "Inserite sì o no.",
        "validation.list": "Scegliete un valore dall'elenco.",
        "validation.regex": "Il formato atteso non è rispettato.",
        "validation.min": "Il valore deve essere maggiore o uguale a {min}.",
        "validation.max": "Il valore deve essere minore o uguale a {max}.",
        "validation.range": "Il valore deve essere compreso tra {min} e {max}.",
        "validation.minLength": "Inserite almeno {min} carattere/i.",
        "validation.maxLength": "Inserite al massimo {max} carattere/i."
    },
    "components/monitor/BulkActionBar#LABELS": {
        "selected": "{count} fornitore selezionato",
        "selectedPlural": "{count} fornitori selezionati",
        "clear": "Annulla la selezione",
        "overflow": "Verranno elaborati solo i primi {max}.",
        "loading": "Caricamento delle azioni…",
        "unavailable": "Nessuna azione disponibile per il vostro profilo.",
        "actions": {
            "remind": "Sollecita",
            "escalate": "Escalation",
            "suspend": "Sospendi"
        },
        "confirm": {
            "remind": "Sollecita {count} fornitore/i",
            "escalate": "Escalation per {count} fornitore/i",
            "suspend": "Sospendi {count} fornitore/i"
        },
        "mechanism": {
            "remind": "Il messaggio viene pubblicato nella discussione del fornitore — quella già visualizzata dal portale e da Share. Non viene creato alcun altro canale.",
            "escalate": "Il messaggio viene pubblicato internamente sul progetto aperto del fornitore, menzionandone il project manager. Il fornitore non lo vede. In assenza di un progetto aperto, non viene pubblicato nulla.",
            "suspend": "Lo stato di qualifica è calcolato, mai memorizzato: la sospensione avvia il processo di sospensione configurato in beCPG. Lo stato cambia da solo."
        },
        "message": "Messaggio",
        "messageRequired": "Il messaggio è obbligatorio.",
        "process": "Processo da avviare",
        "targets": "Fornitori interessati",
        "andMore": "… e altri {count}",
        "send": "Invia",
        "suspendConfirm": "Sospendi",
        "report": "Esito dell'azione",
        "reportOk": "{count} fornitore/i elaborato/i correttamente.",
        "reportKo": "{count} errore/i:",
        "reportSkipped": "{count} fornitore/i esclusi: oltre il limite di {max}.",
        "reportNone": "Nessun fornitore è stato elaborato.",
        "close": "Chiudi",
        "successToast": {
            "remind": "{ok} fornitore/i sollecitato/i",
            "escalate": "{ok} escalation inviata/e",
            "suspend": "{ok} sospensione/i avviata/e"
        },
        "successToastFallback": "{ok} fornitore/i elaborato/i",
        "partialToast": "{ok} elaborati, {ko} non riusciti",
        "errors": {
            "notFound": "Fornitore fuori dal vostro perimetro"
        }
    },
    "components/monitor/CampaignList#LABELS": {
        "columns": {
            "campaign": "Progetto",
            "suppliers": "Fornitori",
            "response": "Tasso di risposta",
            "age": "Età",
            "silence": "Ultimo sollecito",
            "due": "Scadenza",
            "reminders": "Solleciti",
            "follow": "Follow-up",
            "manager": "Responsabile"
        },
        "days": "{count} g",
        "since": "Aperto da {count} g",
        "lastActivity": "Ultima attività {date}",
        "silenceDays": "{count} g fa",
        "silenceToday": "Oggi",
        "silenceHint": "beCPG non conserva alcun registro dei solleciti: questa colonna mostra l'ultima attività sul progetto (cm:modified), il dato effettivamente disponibile più vicino.",
        "noSilence": "Nessuna attività datata",
        "noAnswer": "Nessuna risposta",
        "late": "In ritardo",
        "onTrack": "Nei tempi",
        "toRemind": "Da sollecitare",
        "toEscalate": "Da sottoporre a escalation",
        "lateTasks": "{late} / {open} attività in ritardo",
        "noTasks": "Nessuna attività aperta",
        "dueIn": "Tra {count} g",
        "overdue": "{count} g di ritardo",
        "noDue": "Nessuna scadenza",
        "others": "+{count}",
        "search": "Cerca un progetto",
        "empty": "Nessun progetto aperto in questo perimetro",
        "projectStates": {
            "Planned": "Pianificato",
            "InProgress": "In corso",
            "OnHold": "In sospeso",
            "Completed": "Completato",
            "Cancelled": "Annullato"
        }
    },
    "components/monitor/DocumentMatrix#LABELS": {
        "supplier": "Fornitore",
        "types": "{count} tipo/i di documento",
        "notApplicable": "Non applicabile a questo fornitore",
        "mandatory": "Obbligatorio",
        "expected": "{count} attesi",
        "selectRow": "Seleziona {name}",
        "selectCell": "Seleziona {type} per {name}",
        "download": "Scarica",
        "empty": "Nessun fornitore in questo perimetro",
        "emptyHint": "Ampliate i filtri per vedere la matrice.",
        "noColumns": "Nessun tipo di documento è materializzato in questo perimetro",
        "noColumnsHint": "beCPG materializza i documenti attesi durante la formulazione: senza alcun requisito documentale configurato, la matrice è vuota.",
        "toggle": "Mostra i documenti",
        "summary": "{missing} mancanti · {expired} scaduti · {expiring} da rinnovare"
    },
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Valid": "Valido",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Simulation": "Bozza",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.ToValidate": "Da convalidare",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Refused": "Rifiutato",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Archived": "Archiviato",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Stopped": "Interrotto",
    "components/monitor/MonitorFilters#LABELS": {
        "search": "Cerca un fornitore, un codice, una ragione sociale…",
        "toggle": "Filtri",
        "reset": "Reimposta",
        "close": "Nascondi i filtri",
        "legend": "Filtri del parco",
        "family": "Famiglia",
        "subFamily": "Sottofamiglia",
        "site": "Sito",
        "subsidiary": "Filiale",
        "buyer": "Buyer di riferimento",
        "market": "Mercato",
        "state": "Stato del fornitore",
        "any": "Tutti",
        "anyBuyer": "Tutti i buyer",
        "buyerHint": "Nome utente beCPG (cm:owner)",
        "windowScoped": "limitato alla finestra",
        "windowScopedHelp": "Alfresco non indicizza le associazioni: questo filtro si applica ai fornitori già letti, non all'intero parco.",
        "unsupported": "non configurato",
        "unsupportedHelp": "Nessuna proprietà beCPG standard gestisce questa nozione. Attivatela lato cliente dichiarando la proprietà nella configurazione del monitoraggio.",
        "noVocabulary": "Nessun valore nel perimetro caricato",
        "active": "{count} filtro attivo",
        "activePlural": "{count} filtri attivi",
        "clearOne": "Rimuovi questo filtro"
    },
    "components/monitor/NonConformityList#LABELS": {
        "columns": {
            "nc": "Non conformità",
            "suppliers": "Fornitori",
            "state": "Stato",
            "priority": "Priorità",
            "delay": "Tempo di trattamento",
            "actions": "Azioni correttive",
            "cost": "Costo"
        },
        "states": {
            "new": "Nuova",
            "analysis": "Analisi",
            "treatment": "Trattamento",
            "response": "Risposta",
            "classification": "Classificazione",
            "closing": "Chiusura",
            "closed": "Chiusa"
        },
        "types": {
            "NonConformity": "Non conformità",
            "Claim": "Reclamo"
        },
        "priorities": {
            "1": "Alta",
            "2": "Media",
            "3": "Bassa"
        },
        "blocking": "Bloccante",
        "blockingHint": "Priorità alta e ancora aperta: è ciò che porta lo stato di qualifica calcolato a «sospeso» (calcolato, mai memorizzato).",
        "days": "{count} g",
        "openSince": "Aperta da {count} g",
        "overdue": "Oltre l'obiettivo di trattamento",
        "closedIn": "Trattata in {count} g",
        "closedApprox": "beCPG non memorizza alcuna data di chiusura: il tempo di una NC chiusa è misurato tra la sua creazione e la sua ultima modifica.",
        "createdOn": "Creata il {date}",
        "noDelay": "Nessuna data di creazione",
        "actionsCount": "{done} / {total}",
        "actionsLate": "{count} in ritardo",
        "noActions": "Nessuna azione",
        "noActionsHint": "Nessuna attività di trattamento collegata a questa NC in beCPG — il piano d'azione non è ancora aperto.",
        "actionState": {
            "done": "completata",
            "late": "in ritardo",
            "open": "in corso"
        },
        "andMore": "… e altre {count}",
        "others": "+{count}",
        "noSupplier": "Nessun fornitore collegato",
        "search": "Cerca una non conformità",
        "empty": "Nessuna non conformità in questo perimetro",
        "open": "Apri questa non conformità",
        "detail": {
            "description": "Descrizione",
            "comment": "Commento qualità",
            "noText": "Questa non conformità non riporta né una descrizione né un commento in beCPG.",
            "facts": "Fatti",
            "actions": "Azioni correttive",
            "noActions": "Nessuna azione correttiva aperta.",
            "suppliers": "Fornitori interessati",
            "discussion": "Discussione",
            "created": "Creata il",
            "modified": "Ultima modifica",
            "cost": "Costo",
            "priority": "Priorità",
            "state": "Stato",
            "type": "Tipo"
        }
    },
    "components/monitor/ParkStats#LABELS": {
        "tiles": {
            "approved": "Qualificati",
            "toRenew": "Da rinnovare",
            "suspended": "Sospesi",
            "compliance": "Conformità doc.",
            "expiring30": "In scadenza < 30 g",
            "campaigns": "Progetti",
            "lateTasks": "Attività in ritardo",
            "nc": "NC aperte"
        },
        "hints": {
            "ofPark": "su {total} fornitori",
            "ofScanned": "sui {scanned} fornitori letti",
            "complianceDetail": "{missing} mancanti · {expired} scaduti · {refused} rifiutati",
            "complianceMandatory": "{compliant} / {total} documenti obbligatori",
            "noRate": {
                "countsCapped": "Tasso non calcolabile: beCPG ha limitato il conteggio dei documenti.",
                "scopeTruncated": "Tasso non calcolabile: non è stato possibile interrogare {dropped} fornitore/i del parco.",
                "emptyScope": "Nessun fornitore in questo perimetro: non c'è nulla da valutare."
            },
            "notParkScoped": "intero parco fornitori (filtro non applicabile)",
            "supplierLinkedOnly": "solo quelli collegati a un fornitore",
            "expiring": "documenti · {d60} a 60 g, {d90} a 90 g",
            "campaigns": "aperti · {rate} % con risposta, {late} in ritardo",
            "campaignsNoRate": "aperti · nessun tasso di risposta da calcolare, {late} in ritardo",
            "lateTasks": "scadute",
            "nc": "di cui {blocking} bloccanti",
            "inProgress": "{count} in corso di referenziamento",
            "noNotice": "avviso con {days} g di anticipo"
        },
        "park": {
            "title": "Composizione del parco",
            "subtitle": "Ricalcolata a ogni visualizzazione, a partire dai fascicoli stessi",
            "empty": "Nessun fornitore in questo perimetro",
            "share": "{share} %",
            "unknown": "{count} fornitore/i letto/i senza stato di qualifica valutato: non rientrano in nessuna delle barre.",
            "windowScope": "Ripartizione calcolata sui {scanned} fornitori letti (il parco ne conta {total}): restringete i filtri per una ripartizione esatta."
        },
        "expiry": {
            "title": "Orizzonte di scadenza",
            "subtitle": "Documenti forniti la cui validità termina",
            "cumulative": "Cumulativo: un documento conteggiato a 30 g è conteggiato anche a 60 e 90 g.",
            "bucket": "< {days} g",
            "empty": "Nessun documento scade entro 90 giorni",
            "unit": "documenti",
            "seeAll": "Vedi la conformità documentale"
        },
        "approx": "Contatore approssimativo: beCPG ha limitato il conteggio.",
        "approxShort": "approssimativo",
        "scopeEmpty": "Nessun fornitore corrisponde a questo perimetro. Non è stato calcolato alcun contatore: le cifre qui sopra sono zero per costruzione, non misurazioni.",
        "scopeDropped": "Non è stato possibile interrogare {dropped} fornitore/i del parco (limite di {chunks} interrogazioni): i contatori sono valori minimi.",
        "unsupported": "Filtro non disponibile su questa istanza: {names}. Nessuna proprietà beCPG standard lo gestisce.",
        "assocScope": "Filtro {names} applicato alla finestra letta (Alfresco non indicizza le associazioni).",
        "generatedAt": "Dati aggiornati alle {time}"
    },
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.quality.label": "Qualità",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.quality.focus": "Conformità documentale, non conformità, certificazioni, audit",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.purchasing.label": "Acquisti",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.purchasing.focus": "Stato di qualifica (blocca gli ordini), punteggio, reattività",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.rnd.label": "R&S",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.rnd.focus": "Completezza dei dati tecnici, cataloghi, capitolati",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.csr.label": "RSI",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.csr.focus": "Certificazioni, origini, questionari RSI",
    "components/monitor/ProfileSwitcher#LABELS": {
        "legend": "Vista per funzione",
        "hint": "Stesso parco, quattro letture. Riordina le schede e le colonne."
    },
    "components/monitor/RiskList#RISK_REASONS.documentExpired": "{count} documento/i scaduto/i",
    "components/monitor/RiskList#RISK_REASONS.documentExpiring": "{count} documento/i in scadenza",
    "components/monitor/RiskList#RISK_REASONS.documentMissing": "{count} documento/i mancante/i",
    "components/monitor/RiskList#RISK_REASONS.blockingNc": "{count} NC bloccante/i",
    "components/monitor/RiskList#RISK_REASONS.openNc": "{count} NC aperta/e",
    "components/monitor/RiskList#RISK_REASONS.campaignNoAnswer": "{count} progetto/i senza risposta",
    "components/monitor/RiskList#RISK_REASONS.lateTask": "{count} attività in ritardo",
    "components/monitor/RiskList#RISK_REASONS.lowCompletion": "Completezza bassa ({score} %)",
    "components/monitor/RiskList#RISK_REASONS.scoreDropping": "Punteggio in calo",
    "components/monitor/RiskList#RISK_REASONS.openProject": "{count} referenziamento/i in corso",
    "components/monitor/RiskList#RISK_REASONS.blockingCatalog": "Catalogo bloccante non soddisfatto",
    "components/monitor/RiskList#RISK_LEVELS.critical": "Critico",
    "components/monitor/RiskList#RISK_LEVELS.high": "Alto",
    "components/monitor/RiskList#RISK_LEVELS.medium": "Medio",
    "components/monitor/RiskList#RISK_LEVELS.low": "Basso",
    "components/monitor/RiskList#LABELS": {
        "title": "Top 10 fornitori a rischio",
        "subtitle": "Motivo, punteggio di rischio e azione diretta",
        "empty": "Nessun fornitore a rischio in questo perimetro",
        "emptyHint": "Nessun documento scaduto, NC bloccante o progetto senza risposta rilevato.",
        "riskScore": "Punteggio di rischio {score}",
        "level": "Rischio {level}",
        "buyer": "Buyer: {name}",
        "noBuyer": "Nessun buyer di riferimento",
        "lastActivity": "Ultima attività il {date}",
        "completion": "Completezza {value} %",
        "openSheet": "Apri la scheda",
        "actions": {
            "remind": "Sollecita",
            "escalate": "Escalation",
            "suspend": "Sospendi"
        },
        "dialog": {
            "remindTitle": "Sollecita {target}",
            "escalateTitle": "Escalation per {target}",
            "suspendTitle": "Sospendi {target}",
            "messageLabel": "Messaggio",
            "messageHelp": "Pubblicato nella discussione del fornitore — la stessa mostrata dal portale e da Share. Il fornitore lo riceve tramite le proprie sottoscrizioni Alfresco.",
            "escalateHelp": "Pubblicato internamente sul progetto aperto del fornitore, mai nella discussione che il fornitore legge, menzionando il referente. In assenza di un progetto aperto, non viene pubblicato nulla.",
            "messageRequired": "Il messaggio è obbligatorio.",
            "suspendWarning": "Lo stato di qualifica è calcolato al volo, mai memorizzato: questa azione non scrive «sospeso». Avvia il processo di sospensione del cliente. Non appena beCPG registra la NC bloccante, lo stato cambia da solo.",
            "suspendIrreversible": "Un processo avviato non può essere annullato dal portale. Verificate la selezione.",
            "process": "Processo da avviare",
            "noProcess": "Nessun processo di sospensione è consentito su questa istanza (PORTAL_PROCESS_TEMPLATES).",
            "targets": "{count} fornitore/i interessato/i:",
            "send": "Invia",
            "suspendConfirm": "Avvia la sospensione"
        },
        "result": {
            "ok": "{count} azione/i eseguita/e.",
            "partial": "{ok} riuscite, {failed} non riuscite.",
            "failed": "Nessuna azione è riuscita."
        },
        "defaults": {
            "remind": "Buongiorno,\n\nil vostro fascicolo fornitore richiede un aggiornamento: {reasons}.\nVi preghiamo di accedere al portale per completarlo.\n\nCordiali saluti,",
            "escalate": "Escalation: il fascicolo fornitore è ancora in anomalia ({reasons}) nonostante i solleciti.\nVi preghiamo di prenderlo in carico.",
            "genericReasons": "documenti e scadenze in sospeso"
        }
    },
    "components/monitor/StartCampaignDialog#LABELS": {
        "title": "Avvia un progetto",
        "subtitle": "Un progetto di referenziamento per prodotto, come fa «Invia al fornitore» in beCPG.",
        "supplier": "Fornitore",
        "supplierPlaceholder": "Scegliete un fornitore…",
        "scope": "Perimetro",
        "scopeAll": "Tutti i prodotti di questo fornitore",
        "scopeOne": "Un prodotto",
        "entity": "Prodotto",
        "entityPlaceholder": "Scegliete un prodotto…",
        "process": "Modello di progetto",
        "processPlaceholder": "Scegliete un modello…",
        "start": "Avvia",
        "cancel": "Annulla",
        "starting": "Avvio in corso…",
        "noEntity": "Nessun prodotto è collegato a questo fornitore: nulla da inviare.",
        "noProcess": "Nessun modello di progetto è aperto al portale su questa istanza.",
        "countAll": "Verrà/verranno inviato/i {count} prodotto/i, un progetto ciascuno.",
        "done": "{count} progetto/i avviato/i",
        "partial": "{done} avviati, {failed} non riusciti",
        "failedTitle": "Questi prodotti non sono stati avviati",
        "countTruncated": "Qui è possibile elencare solo {count} prodotti su {total}: verranno inviati quelli, e solo quelli.",
        "suppliersTruncated": "Sono proposti solo {count} fornitori su {total}. Avviate il progetto dalla pagina del fornitore se non è elencato.",
        "atLeast": "almeno {count}",
        "loadFailed": "Impossibile caricare l'elenco.",
        "retry": "Riprova"
    },
    "components/monitor/SupplierScorecard#LABELS": {
        "title": "Scorecard",
        "subtitle": "Criteri, pesi e punteggi — configurati lato cliente",
        "weighted": "Punteggio ponderato",
        "weightedHint": "{count} criteri · peso totale {weight}",
        "criterion": "Criterio",
        "weight": "peso {weight}",
        "weightShare": "{share} % del totale",
        "range": "scala {range}",
        "noScore": "Non valutato",
        "scaleNote": "Scala dedotta dalla configurazione (o dal punteggio più alto osservato): il punteggio grezzo è sempre mostrato.",
        "unavailable": "Nessuna scorecard per questo fornitore",
        "unavailableHint": "Le scorecard sono alimentate dai punteggi riportati dai progetti fornitore. Nel vostro perimetro non è stato trovato alcun progetto valutato.",
        "completion": "Completezza dei cataloghi",
        "completionSubtitle": "I cataloghi attivi sulle entità del fornitore",
        "completionEmpty": "Nessun catalogo attivo su questo fornitore",
        "completionScore": "Completezza media",
        "approval": "Stato di qualifica",
        "approvalDerived": "Ricalcolato a ogni visualizzazione",
        "history": "Andamento",
        "historyUnavailable": "Cronologia non disponibile",
        "historyWhy": "Seguire qualifiche e punteggi nel tempo richiede il modulo di business intelligence (BI) di beCPG, che non è attivato su questa istanza.",
        "historyWhyBy": {
            "supplierAxisUnavailable": "Il modulo BI è attivo ma non distingue ancora i fornitori: l'asse fornitore deve essere aggiunto al cubo e lo schema ricaricato.",
            "supplierUnresolved": "Questo fornitore non è ancora presente nel modulo BI: comparirà alla prossima ricostruzione.",
            "noData": "Il modulo BI conosce questo fornitore ma non contiene ancora alcun punto per il periodo: la cronologia si riempie man mano che viene alimentata.",
            "unknownQuery": "La serie richiesta non è dichiarata nel portale: un difetto di configurazione, non dati mancanti."
        },
        "historyNeeds": "Ciò che serve lato BI per attivarla",
        "dimensions": "Dimensioni",
        "measures": "Misure",
        "statusPartial": "parziale",
        "statusMissing": "da creare",
        "trendLast": "Ultimo punto: {value} il {date}",
        "trendCaption": "Punteggio ponderato nel tempo"
    },
    "components/monitor/SupplierTable#LABELS": {
        "search": "Filtra i fornitori caricati…",
        "caption": "Fornitori del parco, stato di qualifica e indicatori calcolati",
        "columns": {
            "name": "Fornitore",
            "code": "Codice",
            "status": "Qualifica",
            "risk": "Rischio",
            "completion": "Completezza",
            "documentsExpired": "Doc. scaduti",
            "documentsExpiring": "Doc. in scadenza",
            "documentsMissing": "Doc. mancanti",
            "openNc": "NC aperte",
            "openProjects": "Progetti",
            "family": "Famiglia",
            "sites": "Siti",
            "buyer": "Buyer",
            "lastActivity": "Ultima attività"
        },
        "metrics": {
            "documentsExpired": "{count} documento/i obbligatorio/i scaduto/i",
            "documentsExpiring": "{count} documento/i in scadenza",
            "documentsMissing": "{count} documento/i obbligatorio/i non fornito/i",
            "openNc": "{count} non conformità aperta/e",
            "openProjects": "{count} progetto/i aperto/i"
        },
        "none": "—",
        "noBuyer": "Non assegnato",
        "empty": "Nessun fornitore in questo perimetro",
        "emptyHint": "Ampliate i filtri, oppure verificate il vostro perimetro buyer.",
        "emptyFiltered": "Nessun fornitore corrisponde a questi filtri.",
        "compare": "Confronta",
        "compareTitle": "Confronto di {count} fornitori",
        "compareCapped": "Confronto limitato ai primi {max} fornitori selezionati — oltre, le colonne non sono più leggibili.",
        "compareRows": {
            "status": "Stato di qualifica",
            "reasons": "Motivi",
            "risk": "Punteggio di rischio",
            "completion": "Completezza (cataloghi)",
            "documentsExpired": "Documenti scaduti",
            "documentsExpiring": "Documenti in scadenza",
            "documentsMissing": "Documenti mancanti",
            "openNc": "NC aperte",
            "openProjects": "Progetti aperti",
            "state": "Stato beCPG",
            "family": "Famiglia",
            "sites": "Siti",
            "buyer": "Buyer di riferimento",
            "lastActivity": "Ultima attività"
        },
        "openSheet": "Apri la scheda",
        "selected": "{count} selezionati",
        "clear": "Annulla la selezione",
        "close": "Chiudi",
        "noReason": "Nessun motivo di rischio"
    },
    "components/products/CatalogPanel#LABELS": {
        "title": "Conformità",
        "overall": "Completamento",
        "complete": "Completo",
        "incomplete": "Incompleto",
        "missing": "Campi mancanti",
        "missingCount": "{count} campo/i mancante/i",
        "duplicates": "Valori già utilizzati",
        "duplicateOn": "Già utilizzato da",
        "duplicateUnnamed": "{count} altro/i prodotto/i",
        "protectedFields": "{count} campo/i di questo catalogo è/sono compilato/i dal vostro cliente",
        "protectedFieldsHint": "Contano per il punteggio ma non vi vengono richiesti: non potete inserirli, lo fa il vostro cliente.",
        "none": "Nessun catalogo applicabile",
        "noneHint": "Per questo prodotto non è configurato alcun catalogo di conformità, quindi non c'è alcun controllo di completezza da superare.",
        "allComplete": "Tutti i cataloghi sono completi",
        "allCompleteHint": "Lato dati, nulla blocca la convalida di questo prodotto.",
        "missingHint": "Compilate i campi qui sotto per raggiungere il 100 % — sono quelli che bloccano la convalida.",
        "goToField": "Vai al campo",
        "notScored": "Non valutato"
    },
    "components/products/CompletionMeter#LABELS": {
        "title": "Completezza",
        "noScore": "Non ancora valutata",
        "notCounted": "escluso dal punteggio",
        "more": "+ altri {count} cataloghi"
    },
    "components/products/ProductHeader#LABELS": {
        "code": "Codice",
        "branch": "Aggiornamento in corso",
        "branchFrom": "Aggiornamento della versione {version}",
        "branchTitle": "Questa scheda è una copia di lavoro creata per il referenziamento.",
        "branchTitleLocked": "Questa scheda è la copia di lavoro creata per il referenziamento. La versione approvata esiste lato cliente, ma non disponete dell'accesso in lettura.",
        "erpCode": "Codice ERP",
        "supplier": "Fornitore",
        "subsidiary": "Filiale",
        "project": "Progetto",
        "modified": "Aggiornato",
        "created": "Creato il",
        "version": "Versione",
        "legalName": "Denominazione legale",
        "back": "I miei prodotti",
        "types": {
            "bcpg:rawMaterial": "Materia prima",
            "bcpg:finishedProduct": "Prodotto finito",
            "bcpg:semiFinishedProduct": "Semilavorato",
            "bcpg:localSemiFinishedProduct": "Semilavorato locale",
            "bcpg:packagingMaterial": "Imballaggio",
            "bcpg:packagingKit": "Kit di imballaggio",
            "bcpg:supplier": "Fornitore",
            "bcpg:productSpecification": "Capitolato",
            "qa:nc": "Non conformità"
        }
    },
    "components/products/ProductSections#LABELS": {
        "sheet": "Scheda",
        "compliance": "Conformità",
        "documents": "Documenti",
        "specs": "Capitolati",
        "sections": "Sezioni della scheda",
        "noProperties": "Nessuna proprietà da visualizzare",
        "noPropertiesHint": "Le proprietà di questo prodotto non sono esposte dalla configurazione della procedura guidata.",
        "rawProperties": "Proprietà",
        "rawNotice": "Etichette tecniche: la configurazione della procedura guidata non è disponibile per questo prodotto.",
        "noData": "Nessun dato fornito",
        "noDataHint": "Questa sezione non contiene alcuna riga per questo prodotto.",
        "configTitle": "Configurazione non disponibile",
        "configHint": "Non è stato possibile caricare la configurazione di questa sezione. Le altre schede restano disponibili.",
        "documentsHint": "Ciò che il vostro cliente si aspetta su questo prodotto, ed entro quando.",
        "readOnly": "Sola consultazione: l'inserimento dei dati avviene dall'attività che vi è assegnata.",
        "yes": "Sì",
        "no": "No"
    },
    "components/products/ProductTaskBanner#LABELS": {
        "one": "Un'attività è aperta su questa scheda",
        "many": "Diverse attività sono aperte su questa scheda",
        "open": "Apri l'attività",
        "all": "Vedi le attività di questo prodotto",
        "untitled": "Attività senza titolo"
    },
    "components/products/UpdateRequestDialog#LABELS": {
        "title": "Richiedere un aggiornamento",
        "intro": "Il cliente riceve la richiesta e la gestisce come una referenziazione: riceverà un’attività per aggiornare la scheda, che il cliente convaliderà. Fino ad allora non cambia nulla.",
        "template": "Tipo di richiesta",
        "templatePlaceholder": "Scegliere…",
        "noTemplate": "Il cliente non ha aperto alcun tipo di richiesta ai fornitori. Gli scriva da Messaggi.",
        "reason": "Motivo della richiesta",
        "reasonHint": "Nuova ricetta, nuova origine, nuovo stabilimento, nuova scheda tecnica…",
        "file": "Nuova scheda tecnica (facoltativa)",
        "submit": "Inviare la richiesta",
        "sent": "Richiesta inviata. È stata aperta per lei un’attività di aggiornamento.",
        "sentFileFailed": "Richiesta inviata, ma la scheda tecnica non è stata caricata: la carichi dall’attività."
    },
    "components/shell/Header#LOCAL_LABELS": {
        "menu": "Apri il menu",
        "account": "Il mio account",
        "home": "beCPG — home del portale"
    },
    "components/shell/Nav#LOCAL_LABELS": {
        "more": "Altro",
        "menu": "Menu",
        "close": "Chiudi il menu",
        "supplierSpace": "Spazio fornitore",
        "monitorSpace": "Spazio di monitoraggio",
        "collapse": "Comprimi il menu",
        "expand": "Espandi il menu"
    },
    "components/shell/NotificationBell#LOCAL": {
        "open": "Notifiche",
        "panel": "Notifiche",
        "close": "Chiudi",
        "refresh": "Aggiorna",
        "markRead": "Segna come letta",
        "countOne": "1 notifica in sospeso",
        "countMany": "{count} notifiche in sospeso",
        "countNone": "Nessuna notifica",
        "updatedAt": "Aggiornato alle {time}",
        "more": "e altre {count} — vedete «I miei documenti» e «Le mie attività»",
        "allTasks": "Le mie attività",
        "allDocuments": "I miei documenti"
    },
    "components/shell/SupplierSwitcher#LABELS": {
        "all": "Tutti i fornitori",
        "change": "Cambia fornitore",
        "current": "Fornitore selezionato",
        "group": "Le mie schede fornitore",
        "scope": "Perimetro"
    },
    "components/signature/PdfViewer#LABELS": {
        "previous": "Pagina precedente",
        "next": "Pagina successiva",
        "page": "Pagina",
        "of": "di {pages}",
        "zoomIn": "Ingrandisci",
        "zoomOut": "Riduci",
        "fit": "Adatta alla larghezza",
        "download": "Scarica il PDF",
        "loading": "Caricamento del documento…",
        "pageLoading": "Caricamento della pagina {page}…",
        "error": "Impossibile visualizzare questo documento",
        "errorHint": "Il file potrebbe essere protetto o temporaneamente non disponibile. Potete riprovare, oppure scaricarlo per leggerlo.",
        "retry": "Riprova",
        "pinch": "Avvicinate le dita per lo zoom"
    },
    "components/signature/SignatureDocument#LABELS": {
        "zonesHint": "I riquadri indicano dove verranno apposte la vostra firma e la vostra sigla.",
        "counter": "Documento {index} di {total}",
        "read": "Letto",
        "unavailable": "Documento non disponibile",
        "unavailableHint": "Questo documento non è più accessibile in beCPG: potrebbe essere stato sostituito dopo la firma, oppure il vostro accesso è stato revocato. Chiedete una copia al vostro cliente se ne avete bisogno."
    },
    "components/signature/SignatureFlow#LABELS": {
        "title": "Firma",
        "back": "Le mie attività",
        "loading": "Apertura del documento…",
        "notFound": "Nessun documento da firmare",
        "notFoundHint": "Questa attività non fa riferimento ad alcun documento firmabile. Il deliverable potrebbe essere ancora in preparazione — contattate il vostro cliente tramite la discussione del progetto.",
        "readTitle": "Lettura del documento",
        "progress": "{seen} / {pages} pagine lette",
        "progressDone": "Documento letto per intero",
        "progressHint": "Il pulsante di firma si sblocca una volta visualizzate tutte le pagine.",
        "readyHint": "Tutto pronto: la vostra firma verrà apposta sul documento.",
        "goToPage": "Riprendi da pagina {page}",
        "goToDocumentPage": "Riprendi dal doc. {document}, pagina {page}",
        "documentCount": "{count} documenti da firmare",
        "toSignature": "Vai alla firma",
        "signTitle": "La vostra firma",
        "initialsTitle": "La vostra sigla",
        "initialsHint": "Verrà apposta in fondo a ogni pagina.",
        "consent": "Ho letto l'intero documento e accetto di firmarlo elettronicamente. Riconosco che questa firma ha lo stesso valore di una firma autografa.",
        "sign": "Firma il documento",
        "signing": "Firma in corso…",
        "blockedRead": "Leggete tutte le pagine per poter firmare.",
        "blockedSignature": "Aggiungete la vostra firma.",
        "blockedInitials": "Aggiungete la vostra sigla.",
        "blockedConsent": "Spuntate la casella di consenso.",
        "successTitle": "Documento firmato",
        "successBody": "La vostra firma è stata registrata. beCPG la appone sul documento e ve ne invia una copia via email. La troverete anche in I miei documenti › Firmati.",
        "successNext": "Non vi è richiesto nient'altro: l'attività si chiude e il vostro cliente riceve una notifica.",
        "successDownload": "Scarica il documento",
        "successBack": "Torna alle mie attività",
        "signedTitle": "Questo documento è già firmato",
        "signedBody": "Per questa attività è già stata registrata una firma. Nulla da rifare — potete scaricare il documento.",
        "signedBodyNoCopy": "Per questa attività è già stata registrata una firma. Nulla da rifare. Il documento non è più raggiungibile dal portale; chiedetene una copia al vostro cliente se ne avete bisogno.",
        "signedView": "Visualizza il documento",
        "signedComplete": "Completa l'attività",
        "signedCompleteDone": "Attività completata.",
        "signedCompleteError": "Impossibile completare l'attività.",
        "cancelledTitle": "Firma annullata",
        "cancelledBody": "Questa richiesta di firma è stata annullata dal vostro cliente. Non vi è richiesta alcuna azione.",
        "closedTitle": "Attività già gestita",
        "closedBody": "Questa attività non è più aperta. Se ritenete che si tratti di un errore, contattate il vostro cliente.",
        "externalTitle": "Firma presso il vostro provider",
        "externalBody": "Il vostro cliente utilizza un servizio di firma esterno. Il documento si apre in una nuova scheda; tornate qui una volta terminato.",
        "externalOpen": "Apri la firma",
        "failed": "Impossibile registrare la firma.",
        "failedNetwork": "La connessione si è interrotta durante l'invio. La vostra firma non è persa: riprovate, non verrà registrata due volte.",
        "retry": "Riprova",
        "refresh": "Aggiorna",
        "leaving": "La firma è in corso di invio. Uscire ora potrebbe interromperla.",
        "document": "Documento"
    },
    "components/signature/SignaturePad#LABELS": {
        "draw": "Disegna",
        "type": "Digita il mio nome",
        "drawHint": "Firmate all'interno del riquadro con il dito, uno stilo o il mouse.",
        "typeHint": "Il vostro nome verrà apposto come firma.",
        "namePlaceholder": "Nome COGNOME",
        "nameLabel": "Nome del firmatario",
        "clear": "Cancella",
        "undo": "Annulla l'ultimo tratto",
        "preview": "Anteprima della vostra firma",
        "empty": "Nessuna firma ancora",
        "required": "La vostra firma è necessaria per continuare.",
        "initialsType": "Digita le mie iniziali",
        "initialsDrawHint": "Tracciate le vostre iniziali all'interno del riquadro.",
        "initialsTypeHint": "Queste iniziali verranno apposte come sigla.",
        "initialsNameLabel": "Iniziali",
        "initialsPlaceholder": "VL",
        "initialsPreview": "Anteprima delle vostre iniziali",
        "initialsEmpty": "Nessuna iniziale ancora"
    },
    "components/signature/SignatureZones#DEFAULT_LABELS": {
        "signature": "Firma",
        "initials": "Sigla",
        "date": "Data",
        "text": "Testo"
    },
    "components/specs/SpecPanel#LABELS": {
        "title": "Capitolati",
        "subtitle": "Documenti di riferimento applicabili ai vostri prodotti",
        "consult": "Visualizza",
        "open": "Apri",
        "download": "Scarica",
        "appliesTo": "Si applica a",
        "andOthers": "e altri {count}",
        "updated": "Aggiornato il {date}",
        "search": "Cerca un capitolato",
        "none": "Nessun capitolato",
        "noneHint": "Nessun capitolato è collegato a questo perimetro. Il cliente ve ne condividerà uno se applicabile.",
        "noResult": "Nessun capitolato corrisponde a questa ricerca",
        "count": "{count} documento/i",
        "readFirst": "Da leggere prima della compilazione",
        "unreadable": "{count} capitolato/i si applica/applicano ai vostri prodotti ma il vostro account non può aprirlo/i. Chiedete l'accesso al vostro cliente."
    },
    "components/survey/DecisionTree#LABELS": {
        "required": "Domanda obbligatoria",
        "noAnswer": "Nessuna risposta",
        "choose": "Selezionate una risposta",
        "openLink": "Apri il link",
        "answer": "Risposta",
        "blank": "Questa domanda obbligatoria non ha ancora una risposta."
    },
    "components/tasks/TaskActions#LABELS": {
        "complete": "Completa l'attività",
        "refuse": "Rifiuta",
        "completeTitle": "Completare questa attività?",
        "completeMessage": "L'attività verrà contrassegnata come completata e il progetto passerà alla fase successiva.",
        "refuseTitle": "Rifiutare questa attività?",
        "refuseMessage": "Il progetto torna alla fase definita dal percorso di rifiuto. La motivazione qui sotto viene inviata al fornitore.",
        "refuseReason": "Motivazione del rifiuto",
        "refuseReasonHint": "Questo testo viene inviato al fornitore: indicategli che cosa correggere.",
        "refuseReasonRequired": "Per rifiutare è necessaria una motivazione.",
        "cancel": "Annulla",
        "completed": "Attività completata.",
        "refused": "Attività rifiutata."
    },
    "components/ui/DataTable#LOCAL_LABELS": {
        "selectAll": "Seleziona tutto",
        "selectRow": "Seleziona la riga",
        "columns": "Colonne visibili",
        "rowsPerPage": "Righe per pagina"
    },
    "components/ui/EmptyState#SENTENCES": {
        "empty": "Non c'è ancora nulla da mostrare qui. Gli elementi compariranno non appena verranno creati o inviati.",
        "search": "Nessun elemento corrisponde alla vostra ricerca. Provate con meno parole, oppure rimuovete uno dei filtri.",
        "error": null,
        "success": null
    },
    "components/ui/TabScroller#LOCAL": {
        "previous": "Schede precedenti",
        "next": "Schede successive"
    },
    "components/wizard/AutoSaveIndicator#LABELS": {
        "pending": "Modifiche in sospeso",
        "saving": "Salvataggio…",
        "saved": "salvato alle {time}",
        "savedShort": "Salvato",
        "error": "Salvataggio non riuscito",
        "retry": "Riprova",
        "unsaved": "Le vostre modifiche non sono perse: verranno inviate di nuovo."
    },
    "components/wizard/TechnicalSheetBanner#LABELS": {
        "title": "Scheda tecnica",
        "deposited": "Caricata il {date}",
        "replace": "Sostituisci",
        "cancel": "Annulla",
        "missing": "Scheda tecnica mancante",
        "missingHint": "Caricate la vostra scheda tecnica per attivare i suggerimenti dell'IA.",
        "missingClosed": "Su questa scheda non è stata caricata alcuna scheda tecnica."
    },
    "components/wizard/Wizard#LABELS": {
        "context": "Contesto",
        "discussion": "Discussione",
        "documents": "Documenti",
        "technicalSheet": "Scheda tecnica",
        "suggestions": "Suggerimenti",
        "compliance": "Conformità",
        "properties": "Proprietà",
        "list": "Elenco",
        "survey": "Questionario",
        "readOnly": "Sola lettura",
        "readOnlyReasons": {
            "readAccess": "Disponete solo dell'accesso in lettura a questa scheda.",
            "noAssignedTask": "Nessuna attività vi è assegnata su questa scheda: l'inserimento è chiuso.",
            "wizardReadOnly": "Questa procedura guidata è configurata in sola lettura."
        },
        "finish": "Termina",
        "finished": "Attività inviata al vostro cliente",
        "finishBlocked": "Compilate i campi mancanti della fase «Conformità» per terminare.",
        "finishMissingStep": "«{step}»: {count} risposta/e obbligatoria/e mancante/i.",
        "finishGapStep": "{step} · {count} campo/i",
        "finishGapCatalog": "{step} · {count} attesi",
        "finishGapCatalogPlain": "{step} da completare",
        "notFound": "Scheda non trovata",
        "notFoundHint": "Questa scheda non esiste, oppure non rientra nel vostro perimetro.",
        "delegated": "State compilando per conto di {supplier}",
        "due": "Scadenza il {date}",
        "step": "Fase",
        "widen": "Allarga l'area di inserimento",
        "widenHint": "Nasconde i pannelli laterali e riduce le fasi alle sole icone.",
        "restore": "Ripristina i pannelli",
        "steps": "Fasi"
    },
    "components/wizard/WizardFooter#LABELS": {
        "previous": "Precedente",
        "next": "Successivo",
        "finish": "Termina",
        "finishing": "Invio in corso…",
        "formulating": "Ricalcolo in corso…",
        "blocked": "Non è ancora possibile terminare",
        "incomplete": "Scheda incompleta"
    },
    "components/wizard/WizardStepper#LABELS": {
        "title": "Fasi",
        "step": "Fase {index} di {total}",
        "open": "Scegliete una fase",
        "frozen": "Convalidata dal cliente",
        "readOnly": "Sola lettura",
        "done": "Visitata",
        "complete": "Completa",
        "current": "Fase corrente",
        "todo": "Non ancora visitata",
        "locked": "Disponibile più tardi",
        "incomplete": "{count} obbligatori mancanti",
        "catalogGap": "{count} campo/i atteso/i dal catalogo",
        "remaining": "{count} sezione/i da completare",
        "remainingNone": "Nessuna mancanza segnalata",
        "remainingHint": "Il vostro cliente attende queste informazioni per convalidare la scheda.",
        "remainingHintNone": "Potete tornare a qualsiasi fase in qualsiasi momento.",
        "collapse": "Comprimi le fasi",
        "expand": "Espandi le fasi"
    },
    "components/wizard/panels/CommentsPanel#LABELS": {
        "title": "Discussione",
        "subtitle": "I vostri scambi con il cliente su questa scheda",
        "placeholder": "Scrivete un messaggio…",
        "send": "Invia",
        "empty": "Nessun messaggio",
        "emptyHint": "Ponete una domanda al vostro cliente, oppure rispondete a una sua osservazione.",
        "emptyAnchored": "Nessun messaggio su questo elemento",
        "subject": "Argomento",
        "whole": "L'intera scheda",
        "onField": "Campo: {label}",
        "onRow": "Riga: {label}",
        "onRowOfList": "Riga «{label}» di «{list}»",
        "inList": "Una riga di «{list}»",
        "row": "una riga",
        "anchored": "Su {label}",
        "clear": "Rimuovi l'ancoraggio",
        "readOnly": "La discussione è in sola lettura.",
        "posting": "Invio in corso…",
        "count": "{count} messaggio/i",
        "denyReasons": {
            "noAssignedTask": "Il referenziamento è chiuso: questa discussione è in sola lettura.",
            "readAccess": "Disponete solo dell'accesso in lettura a questa scheda.",
            "noPermission": "Non siete autorizzati a scrivere in questa discussione."
        }
    },
    "components/wizard/panels/HelpPanel#LABELS": {
        "title": "Contesto",
        "suggestions": "Suggerimenti dell'IA",
        "specs": "Capitolati",
        "specsEmpty": "Nessun capitolato collegato a questa scheda.",
        "specsUnreadable": "A questa scheda è collegato un capitolato, ma il vostro account non può aprirlo.",
        "refusals": "Rifiuti precedenti",
        "refusalsEmpty": "Nessun rifiuto su questa scheda.",
        "refusalsHint": "Queste fasi vi sono state rinviate: leggete l'osservazione associata prima di inviare di nuovo.",
        "onField": "su {field}",
        "seeStep": "Apri",
        "more": "+ altri {count}"
    },
    "components/wizard/steps/DataListStep#LABELS": {
        "row": "Riga {index}"
    },
    "components/wizard/steps/DocumentsStep#LABELS": {
        "title": "Documenti attesi",
        "subtitle": "Ciò che il vostro cliente si aspetta, ed entro quando.",
        "otherTitle": "Altri documenti",
        "otherSubtitle": "I file della cartella che non rispondono ad alcuno dei requisiti qui sopra. Depositate qui qualsiasi documento utile (foto, analisi…).",
        "blocking": "{count} documento/i obbligatorio/i mancante/i",
        "allGood": "Tutti i documenti obbligatori sono stati forniti",
        "readOnly": "Non potete depositare documenti su questa scheda."
    },
    "components/wizard/steps/FormStep#LABELS": {
        "comment": "Commenta questo campo",
        "comments": "{count} messaggio/i su questo campo",
        "catalogGap": "Atteso dal catalogo del vostro cliente",
        "catalogGapLocale": "Atteso dal catalogo del vostro cliente in {locale}",
        "frozenTitle": "Sezione convalidata dal vostro cliente",
        "frozenText": "Il vostro cliente ha convalidato queste informazioni: sono bloccate e non possono più essere modificate. Se è necessaria una correzione, chiedetene la riapertura tramite la discussione.",
        "readAccessTitle": "Sola lettura",
        "readAccessText": "Non disponete dell'accesso in scrittura a questa scheda.",
        "noTaskTitle": "Nessuna attività aperta",
        "noTaskText": "Al momento questa scheda non vi è assegnata: potete leggerla, non modificarla.",
        "readOnlyTitle": "Sola lettura",
        "readOnlyText": "Questa fase non può essere modificata."
    },
    "components/wizard/steps/ReviewStep#LABELS": {
        "title": "Conformità",
        "subtitle": "Ciò che manca ancora prima che il vostro cliente possa convalidare la scheda.",
        "blocking": "Catalogo/i bloccante/i: {names}",
        "blockingHint": "Compilate i campi mancanti qui sotto per poter terminare.",
        "ready": "Tutti i cataloghi bloccanti sono soddisfatti",
        "incomplete": "Catalogo/i da completare: {names}",
        "documents": "Documenti obbligatori",
        "documentsMissing": "{count} documento/i obbligatorio/i mancante/i",
        "documentsOk": "Tutti i documenti obbligatori sono stati forniti",
        "reviewTitle": "Scheda in sola lettura",
        "reviewSubtitle": "State consultando questa scheda: non è possibile alcuna modifica.",
        "expand": "Mostra",
        "collapse": "Nascondi",
        "expandAll": "Espandi tutto",
        "collapseAll": "Comprimi tutto",
        "reviewed": "Sezione esaminata",
        "reviewedHint": "Spuntate le sezioni man mano: {done} su {total} esaminate.",
        "empty": "Nulla da visualizzare"
    },
    "components/wizard/steps/SuggestionsStep#LABELS": {
        "title": "Estrazione automatica",
        "subtitle": "Questi valori sono stati letti dai documenti che avete depositato. Verificateli: il controllo resta vostro.",
        "applied": "Applicati automaticamente",
        "appliedHint": "Affidabilità elevata: il valore è già inserito, potete annullarlo.",
        "toConfirm": "Da confermare",
        "toConfirmHint": "Verificate il valore proposto, poi applicatelo.",
        "flagged": "Da inserire manualmente",
        "flaggedHint": "L'estrazione non è abbastanza affidabile: preferiamo lasciarlo inserire a voi.",
        "unscored": "Proposte",
        "unscoredHint": "Queste proposte sono prive di un punteggio di affidabilità.",
        "apply": "Applica",
        "expand": "Espandi",
        "applyAnyway": "Applica comunque",
        "revoke": "Annulla",
        "restore": "Rivedi",
        "applying": "Applicazione in corso…",
        "appliedAt": "Applicato",
        "revoked": "Annullato",
        "dismissed": "Scartato",
        "notRevocable": "Il valore precedente non può essere ripristinato automaticamente: modificate direttamente il campo se necessario.",
        "empty": "Nessun suggerimento",
        "emptyHint": "Nulla da proporre per questa fase. La scheda tecnica è caricata qui sopra: l'estrazione proporrà i valori che vi trova.",
        "emptyEntityLevel": "L'analisi è stata eseguita, ma ha prodotto solo deduzioni ricavate dalla scheda stessa, senza alcun documento a supporto: non vi vengono proposte.",
        "analysing": "Analisi in corso",
        "analysingHint": "Il portale sta leggendo i vostri documenti. Le proposte compariranno qui da sole, senza lasciare la pagina: la lettura di una scheda tecnica richiede di solito meno di un minuto.",
        "analysingPlugins": "In esecuzione: {plugins}",
        "refresh": "Esegui di nuovo l'analisi",
        "readOnly": "Questa scheda è in sola lettura: i suggerimenti non possono essere applicati.",
        "source": "Fonte",
        "changes": "{count} valore/i",
        "error": "L'applicazione del suggerimento non è riuscita."
    },
    "components/wizard/steps/SurveyStep#LABELS": {
        "discuss": "Discussione",
        "answered": "{answered} su {total} con risposta",
        "empty": "Nessuna domanda",
        "emptyHint": "Il vostro cliente non ha ancora pubblicato un questionario per questa scheda.",
        "check": "Verifica le mie risposte",
        "complete": "Questionario completo",
        "missingTitle": "{count} domanda/e obbligatoria/e ancora senza risposta",
        "missingHint": "Sceglietene una per raggiungerla. Le vostre altre risposte sono già salvate.",
        "readOnly": "Sola consultazione",
        "noneAnswered": "Nessuna risposta registrata",
        "noneAnsweredHint": "Il questionario si sviluppa man mano che rispondete.",
        "dropped": "Il vostro cliente non ha previsto dove memorizzare {count} delle vostre risposte: {questions}. Non sono salvate — informate il vostro cliente."
    },
    "lib/adapters/monitor#CSV_HEADERS": {
        "code": "Codice",
        "name": "Fornitore",
        "legalName": "Ragione sociale",
        "approvalStatus": "Stato di qualifica",
        "approvalReasons": "Motivi",
        "completion": "Completezza (%)",
        "risk": "Rischio",
        "riskLevel": "Livello di rischio",
        "documentsExpired": "Documenti scaduti",
        "documentsExpiring": "Documenti in scadenza",
        "documentsMissing": "Documenti mancanti",
        "openNc": "NC aperte",
        "openProjects": "Progetti aperti",
        "family": "Famiglia",
        "buyer": "Buyer",
        "lastActivity": "Ultima attività",
        "state": "Stato",
        "compliance": "Conformità (%)"
    },
    "config/messages#messages": {
        "app.title": "Portale fornitori",
        "app.shortTitle": "Portale",
        "app.tenantSuffix": "spazio fornitore",
        "app.description": "Portale fornitori beCPG — referenziamento, documenti e conformità",
        "nav.dashboard": "Dashboard",
        "nav.tasks": "Le mie attività",
        "nav.products": "I miei prodotti",
        "nav.documents": "I miei documenti",
        "nav.company": "La mia azienda",
        "nav.specs": "Capitolati",
        "nav.messages": "Discussioni",
        "nav.notifications": "Notifiche",
        "nav.help": "Guida",
        "nav.monitor": "Monitoraggio",
        "nav.monitor.suppliers": "Fornitori",
        "nav.monitor.products": "Prodotti fornitore",
        "nav.monitor.documents": "Conformità documentale",
        "nav.monitor.campaigns": "Progetti",
        "nav.monitor.quality": "Non conformità",
        "nav.monitor.reports": "Report",
        "nav.monitor.tasks": "Le mie attività",
        "account.profile": "Il mio profilo",
        "account.language": "Lingua",
        "account.login": "Accedi",
        "account.logout": "Esci",
        "account.tenant": "Cliente",
        "account.suppliers": "Le mie schede fornitore",
        "account.allSuppliers": "Tutti i fornitori",
        "action.save": "Salva",
        "action.cancel": "Annulla",
        "action.close": "Chiudi",
        "action.back": "Indietro",
        "action.next": "Successivo",
        "action.previous": "Precedente",
        "action.submit": "Invia",
        "action.confirm": "Conferma",
        "action.delete": "Elimina",
        "action.download": "Scarica",
        "action.upload": "Carica un file",
        "action.retry": "Riprova",
        "action.search": "Cerca",
        "action.filter": "Filtra",
        "action.reset": "Reimposta",
        "action.export": "Esporta",
        "action.sign": "Firma",
        "action.showMore": "Altri {count}",
        "action.showLess": "Mostra meno",
        "suggestion.replaces": "Sostituisce {value}",
        "state.loading": "Caricamento…",
        "state.saving": "Salvataggio…",
        "state.saved": "Salvato",
        "state.empty": "Nulla da visualizzare",
        "state.noResults": "Nessun risultato per questa ricerca",
        "state.required": "Campo obbligatorio",
        "state.of": "{from}-{to} di {total}",
        "state.page": "Pagina {page} di {pages}",
        "state.atLeast": "almeno {total}",
        "error.title": "Si è verificato un problema",
        "error.generic": "Si è verificato un problema. Riprovate.",
        "error.network": "Impossibile raggiungere il server.",
        "error.upstream": "beCPG ha restituito un errore. Riprovate; se il problema persiste, segnalatelo al vostro amministratore.",
        "error.unauthorized": "La vostra sessione è scaduta. Effettuate di nuovo l'accesso.",
        "error.forbidden": "Non siete autorizzati a eseguire questa azione.",
        "error.notFound": "Questa pagina o questo elemento non esiste.",
        "error.tenant": "Nessun cliente è associato al vostro account.",
        "error.upload": "Il caricamento del file non è riuscito.",
        "error.http": "Errore {status}: {message}",
        "status.approved": "Qualificato",
        "status.inProgress": "In corso",
        "status.toRenew": "Da rinnovare",
        "status.suspended": "Sospeso",
        "status.valid": "Valido",
        "status.expiring": "In scadenza",
        "status.expired": "Scaduto",
        "status.missing": "Mancante",
        "status.validityMissing": "Validità da inserire",
        "status.rejected": "Rifiutato",
        "status.pending": "In attesa",
        "status.completed": "Completato",
        "status.late": "In ritardo",
        "status.draft": "Bozza",
        "status.notApplicable": "Non applicabile",
        "test.banner": "Istanza di TEST — i dati inseriti qui non hanno valore contrattuale",
        "test.badge": "Test"
    }
};

export default LOCALE;
