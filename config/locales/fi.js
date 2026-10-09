/**
 * Finnish translation of the portal chrome.
 *
 * Generated from the inline French and English labels (`npm run i18n:extract`),
 * then translated. Keys mirror the English source; a key missing here reads
 * English. Edit translations here, and the source labels in their components.
 */
const LOCALE = {
    "app/(home)/page#LOCAL": {
        "description": "Missä vaiheessa kansionne on asiakkaallanne ja mitä asiakas odottaa teiltä.",
        "generatedAt": "Tiedot ajalta {time}"
    },
    "app/company/page#LABELS": {
        "title": "Yritykseni",
        "noSupplier": "Ei toimittajatietuetta",
        "noSupplierHint": "Tiliänne ei ole liitetty mihinkään toimittajaan. Ottakaa yhteyttä asiakkaan yhteyshenkilöön.",
        "approval": "Hyväksynnän tila",
        "approvalHint": "Lasketaan reaaliaikaisesti asiakirjojenne, projektienne ja poikkeamienne perusteella.",
        "reasons": {
            "documentExpired": "Pakollinen asiakirja on vanhentunut",
            "documentExpiring": "Pakollinen asiakirja on vanhenemassa",
            "documentMissing": "Pakollista asiakirjaa ei ole toimitettu",
            "blockingNc": "Estävä poikkeama on avoinna",
            "openProject": "Listausprojekti on käynnissä",
            "blockingCatalog": "Estävän luettelon vaatimukset eivät täyty"
        },
        "metrics": {
            "documentsExpired": "Vanhentuneet asiakirjat",
            "documentsExpiring": "Vanhenemassa olevat asiakirjat",
            "documentsMissing": "Puuttuvat asiakirjat",
            "openNc": "Avoimet NC",
            "openProjects": "Avoimet projektit"
        },
        "sections": {
            "identity": "Perustiedot",
            "surveyList": "Kyselylomake",
            "contactList": "Yhteyshenkilöt",
            "plant": "Toimipaikat",
            "certification": "Sertifioinnit",
            "documents": "Asiakirjat",
            "specs": "Vaatimusmäärittelyt"
        },
        "frozen": "Asiakkaan hyväksymä luettelo — vain luku",
        "emptyList": "Ei rivejä",
        "emptyListHint": "Tätä osiota ei ole vielä täytetty.",
        "questionnaire": "Vastatut kysymykset: {done} / {total}",
        "noProperties": "Ei näytettäviä ominaisuuksia",
        "yes": "Kyllä",
        "no": "Ei",
        "code": "Koodi",
        "request": "Pyydä päivitystä"
    },
    "app/documents/page#LABELS": {
        "title": "Asiakirjani",
        "tabRequirements": "Vaatimukset",
        "tabAll": "Kaikki asiakirjat",
        "tabSigned": "Allekirjoitetut",
        "deposit": "Lataa asiakirja",
        "depositTitle": "Lataa asiakirja",
        "entity": "Liittyvä tuote",
        "chooseEntity": "Valitse tuote…",
        "filters": {
            "open": "Käsiteltävät",
            "blocking": "Estävät",
            "expiring": "Vanhenemassa",
            "done": "Toimitetut",
            "all": "Kaikki"
        },
        "stats": {
            "toProvide": "Toimitettavat",
            "expired": "Vanhentuneet",
            "expiring": "Vanhenee < {days} pv",
            "compliance": "Asiakirjojen vaatimustenmukaisuus",
            "mandatory": "Pakolliset: {done} / {total}",
            "noScope": "ei arvioitavaa laajuutta"
        },
        "search": "Hae asiakirjaa",
        "noMatch": "Mikään asiakirja ei vastaa tätä suodatinta",
        "noMatchHint": "Valitse \"Kaikki\" nähdäksenne kaikki asiakirjat.",
        "columns": {
            "document": "Asiakirja",
            "entity": "Tuote",
            "status": "Tila",
            "validity": "Voimassaolo",
            "modified": "Muokattu",
            "ai": "Tekoälyn tarkistus",
            "actions": ""
        },
        "download": "Lataa",
        "view": "Näytä",
        "noFile": "Ei vielä toimitettu",
        "blockingBanner": "Hyväksyntäänne estäviä pakollisia asiakirjoja: {count}. Ne ovat luettelon alussa.",
        "scopeEmpty": "Tiliänne ei ole liitetty mihinkään toimittajaan, joten asiakirjavaatimuksia ei voida laskea. Yllä olevat laskurit ovat tyhjiä, eivät täytettyjä. Ottakaa yhteyttä asiakkaan yhteyshenkilöön."
    },
    "app/error#LABELS": {
        "title": "Tätä sivua ei voitu näyttää",
        "message": "Näytettäessä tapahtui tekninen virhe. Syöttämänne tiedot eivät ole kadonneet: ne tallennetaan sitä mukaa kuin etenette.",
        "retry": "Yritä uudelleen",
        "home": "Takaisin etusivulle",
        "reference": "Tukipalvelulle ilmoitettava viite"
    },
    "app/global-error#LABELS": {
        "title": "Portaalia ei voitu käynnistää",
        "message": "Tekninen virhe estää portaalin näyttämisen. Yrittäkää uudelleen; jos ongelma jatkuu, ottakaa yhteyttä beCPG-yhteyshenkilöönne ja ilmoittakaa alla oleva viite.",
        "retry": "Yritä uudelleen",
        "reference": "Viite"
    },
    "app/help/page#LABELS": {
        "title": "Ohje",
        "subtitle": "Miten portaali toimii, vaihe vaiheelta",
        "scope": "beCPG-toimittajaportaali",
        "search": "Hae ohjeesta",
        "expandAll": "Laajenna kaikki",
        "collapseAll": "Tiivistä kaikki",
        "topics": "Sisällys",
        "noResult": "Yksikään aihe ei vastaa hakua",
        "noResultHint": "Kokeilkaa toista sanaa: \"asiakirja\", \"allekirjoitus\", \"vaihe\", \"hyväksyntä\".",
        "anchor": "Linkki tähän aiheeseen",
        "anchorCopied": "Linkki kopioitu",
        "goTo": "Siirry",
        "monitorNotice": "Tämä ohje kuvaa toimittajanäkymää: näyttöjä, jotka toimittajanne näkevät ja joissa \"asiakkaanne\" tarkoittaa omaa yritystänne. Seurantatilaa ei ole vielä dokumentoitu."
    },
    "app/help/page#TOPICS": [
        {
            "id": "start",
            "icon": "flag",
            "title": "Mistä aloittaa",
            "summary": "Koostenäkymä vastaa yhteen kysymykseen: mitä teiltä odotetaan ja mihin mennessä.",
            "blocks": [
                {
                    "p": "Kaikki alkaa koostenäkymästä. Ylimmät neljä korttia tiivistävät tämän asiakkaan kanssa hoidettavan asiakokonaisuutenne:"
                },
                {
                    "ul": [
                        "**Hyväksynnän tila** — Hyväksytty, Käynnissä, Uusittava tai Keskeytetty, voimassaoloaikoineen.",
                        "**Täydellisyys** — kuinka suuri osa odotetuista kentistä on jo täytetty korteillanne.",
                        "**Vaaditut toimet** — kuinka monta tehtävää on avoinna ja kuinka moni niistä on myöhässä.",
                        "**Asiakirjat** — kuinka moni on voimassa, kuinka moni vanhenee pian ja kuinka moni puuttuu."
                    ]
                },
                {
                    "p": "Korttien alla olevat luettelot sisältävät yksityiskohdat: tehtävänne, tuotteenne, asiakirjanne, keskustelunne ja ilmoituksenne. Otsikkopalkin kellokuvake näyttää saman ilmoitusluettelon miltä tahansa näytöltä."
                },
                {
                    "note": "Yhdellä tilillä voi työskennellä usealle beCPG-asiakkaalle, ja jokaisella asiakkaalla on oma portaalinsa. Asiakkaan logo ja nimi näkyvät aina vasemmassa yläkulmassa: niistä näette, minkä asiakkaan asiakokonaisuutta käsittelette."
                },
                {
                    "warn": "Jos näytöllä on ”TESTI-instanssi”-palkki, olette testiympäristössä: mikään sinne syötetty tieto ei ole sopimuksellisesti sitova."
                },
                {
                    "links": [
                        {
                            "href": "/",
                            "icon": "dashboard",
                            "label": "Koostenäkymä"
                        },
                        {
                            "href": "/tasks",
                            "icon": "assignment_turned_in",
                            "label": "Omat tehtävät"
                        },
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "Omat asiakirjat"
                        }
                    ]
                }
            ]
        },
        {
            "id": "tasks",
            "icon": "assignment_turned_in",
            "title": "Miten listaustehtävä toimii",
            "summary": "Tehtävä tulee asiakkaanne avaamasta projektista. Tehtävän tyyppi ratkaisee, mille näytölle päädytte.",
            "blocks": [
                {
                    "p": "Asiakkaanne avaa listausprojektin, ja projekti lähettää teille tehtäviä. Tehtävällä on otsikko, kyseinen tuote, määräpäivä ja tyyppi. Tehtävää napsauttamalla siirrytte suoraan näytölle, jolla se suoritetaan — välisivua ei ole."
                },
                {
                    "ul": [
                        "**Ohjattu toiminto** — ohjattu tietojen syöttö tuotekorttiin tai toimittajakorttiinne.",
                        "**Allekirjoitus** — PDF-asiakirjan lukeminen ja sen jälkeen allekirjoittaminen.",
                        "**Asiakirja** — odotetun asiakirjan lataaminen tai uusiminen.",
                        "**Tarkastelu** — tuotteen läpiluku ilman syötettävää."
                    ]
                },
                {
                    "p": "Suunniteltu tai Käynnissä-tilassa oleva tehtävä odottaa teitä. Hylätty tehtävä on asiakkaanne palauttama perusteluineen: lukekaa huomautus ennen kuin lähetätte uudelleen. Valmis tehtävä ei vaadi enempää."
                },
                {
                    "p": "Määräpäivän ylittänyt tehtävä merkitään myöhästyneeksi sekä luettelossa että ilmoituksissa. Kun myöhästymistä on yli seitsemän päivää, merkintä muuttuu punaiseksi."
                },
                {
                    "note": "Voitte avata ja jättää tehtävän kesken niin usein kuin tarvitsette: se pysyy avoinna, kunnes itse suoritatte sen, eikä mitään katoa käyntien välillä."
                },
                {
                    "links": [
                        {
                            "href": "/tasks",
                            "icon": "assignment_turned_in",
                            "label": "Omat tehtävät"
                        }
                    ]
                }
            ]
        },
        {
            "id": "wizard",
            "icon": "auto_stories",
            "title": "Ohjatun toiminnon vaiheiden järjestys",
            "summary": "Tekninen tuotekortti otsikossa, pysyvä Konteksti-paneeli, asiakkaanne osiot ja lopuksi vaatimustenmukaisuus.",
            "blocks": [
                {
                    "p": "Ohjattu toiminto etenee aina samassa järjestyksessä. Se ei ole umpikuja: kun vaiheessa on kerran käyty, siihen voi palata vapaasti."
                },
                {
                    "ol": [
                        "**Otsikko · Tekninen tuotekortti** — ensimmäinen teiltä odotettu toimenpide. Niin kauan kuin se puuttuu, punainen palkki ilmoittaa siitä jokaisen vaiheen yläpuolella; latauksen jälkeen jäljelle jää yksi rivi, jossa näkyvät sen päivämäärä ja voimassaolo. Tekoäly lukee tätä asiakirjaa ehdottaakseen arvoja: ilman sitä luettavaa ei ole. Jos asiakkaanne ei ole määrittänyt tällaista asiakirjatyyppiä, palkkia ei näytetä lainkaan.",
                        "**Vaihe 0 · Konteksti** — aina näkyvissä oleva paneeli, joka puhelimessa avautuu yhdellä napautuksella. Siinä ovat tekoälyn ehdotukset, sovellettava vaatimusmäärittely, asiakkaanne jo hyväksymät luettelot ja aiemmat hylkäykset. Sitä ei käydä läpi vaiheena: se on käytettävissä missä vaiheessa tahansa.",
                        "**Asiakkaanne osiot** — ominaisuudet, kyselylomake, ainesosat, ravintoaineet, allergeenit, fysikaalis-kemialliset tiedot, väittämät, mikrobiologia, aistinvaraiset ominaisuudet, pakkausmateriaalit, asiakirjat… Se, mitkä osiot näytetään ja missä järjestyksessä, määräytyy asiakkaanne määritysten ja tuotetyypin mukaan: portaali ei valitse niitä.",
                        "**Asiakirjat** — vaihe pysyy asiakkaanne sille antamalla paikalla, yleensä loppupuolella. Tämä on tarkoituksellista: beCPG johtaa odotetut asiakirjat syöttämistänne tiedoista (”GMO-vapaa”-väittämä edellyttää vastaavaa todistusta), joten liian aikaisin kysyttynä luettelo olisi tyhjä tai virheellinen. Vain teknistä tuotekorttia odotetaan joka tapauksessa, ja se on otsikossa.",
                        "**Vaatimustenmukaisuus** — luettelo vielä puuttuvista kentistä, joista kutakin napsauttamalla pääsee suoraan kenttään, sekä valmiusasteen pisteet. Jos asiakkaanne on määrittänyt estävän tarkistuksen, toimintoa ei voi viimeistellä ennen kuin tarkistus täyttyy."
                    ]
                },
                {
                    "note": "Jokainen osio tallennetaan automaattisesti, eikä mitään painiketta tarvitse painaa. Ohjatun toiminnon alareunassa navigointipainikkeiden vieressä oleva ”Tallennettu klo HH:MM” -ilmaisin vahvistaa tämän — ja jatkatte täsmälleen siitä, mihin jäitte, vaikka sulkisitte portaalin, vaihtaisitte laitetta tai verkkoyhteys katkeaisi."
                },
                {
                    "p": "Joidenkin vaiheiden välillä korttinne lasketaan uudelleen (allergeenit, ravintoaineet, kustannukset…). Laskenta tapahtuu taustalla eikä koskaan estä työskentelyänne: voitte jatkaa kirjoittamista sen aikana."
                },
                {
                    "p": "Leveällä näytöllä ”Levennä syöttöaluetta” piilottaa sivupaneelit ja supistaa vaiheluettelon kuvakkeiksi leveitä taulukoita varten. Valinta muistetaan kortilta toiselle; paneelit ovat yhden napsautuksen päässä otsikkopalkin kuvakkeiden kautta."
                },
                {
                    "note": "Jos yhteyshenkilönne syöttää tietoja puolestanne, ohjatun toiminnon yläreunassa oleva palkki ”syötätte tietoja seuraavan puolesta: …” ilmoittaa siitä selvästi."
                }
            ]
        },
        {
            "id": "grids",
            "icon": "grid_on",
            "title": "Nopea syöttö taulukossa",
            "summary": "Ainesosat, ravintoaineet, allergeenit: kaiken voi tehdä näppäimistöltä, ja taulukkolaskentaohjelman solualueen voi liittää suoraan.",
            "blocks": [
                {
                    "p": "Taulukko-osiot — ainesosat, ravintoaineet, allergeenit, fysikaalis-kemialliset tiedot… — täytetään irrottamatta käsiä näppäimistöltä. Taulukon yläpuolella oleva näppäimistöpainike tuo pikanäppäinluettelon esiin milloin tahansa."
                },
                {
                    "ul": [
                        "**Tab / Shift+Tab** — seuraava / edellinen solu.",
                        "**Enter** — tallentaa rivin ja siirtyy alaspäin samassa sarakkeessa; viimeisellä rivillä lisää uuden rivin.",
                        "**↑ / ↓** — sama sarake, ylempi / alempi rivi.",
                        "**Esc** — hylkää muokattavana olevan rivin muutokset.",
                        "**Ctrl+D** — kopioi nykyisen rivin.",
                        "**Ctrl+V** — liittää solualueen taulukkolaskentaohjelmasta."
                    ]
                },
                {
                    "p": "Taulukkolaskentaohjelmasta liitettäessä otetaan kerralla useita rivejä ja sarakkeita, puuttuvat rivit luodaan, ja portaali kertoo, mitä se ei voinut ottaa vastaan — ehdotetun luettelon ulkopuolinen arvo, tekstiä siellä, missä odotetaan lukua, vain luku -sarake. Mitään ei arvata: kaikki, millä ei ole tarkkaa vastinetta, palautetaan teille korjattavaksi."
                },
                {
                    "note": "Kuten kaikkialla ohjatussa toiminnossa, rivi tallennetaan heti, kun siirrytte siitä pois — tai Enter-näppäimellä tai heti, kun valitsette valintaruudun. Tallennuspainiketta ei ole: vahvistettavaa ei ole. Vain liittäminen tarjoaa vaihtoehdon ”Tallenna N riviä”, koska kukaan ei ole käynyt näitä rivejä läpi."
                },
                {
                    "p": "Puhelimessa taulukko muuttuu yhdeksi kortiksi riviä kohden: samat kentät allekkain, ilman vaakavieritystä."
                }
            ]
        },
        {
            "id": "specs",
            "icon": "menu_book",
            "title": "Vaatimusmäärittely ja luettelo: mikä ero niillä on",
            "summary": "Vaatimusmäärittely luetaan. Luettelo täytetään — ja juuri se ratkaisee, voitteko viimeistellä.",
            "blocks": [
                {
                    "p": "Kyse on kahdesta eri asiasta, joita tarvitaan eri vaiheissa. Yksinkertaisinta on käsitellä ne siinä järjestyksessä, jossa ne tulevat vastaan."
                },
                {
                    "ul": [
                        "**Vaatimusmäärittely** — asiakkaanne asiakirja, joka on liitetty tuotteeseen tai tuoteperheeseen. Siinä esitetään asiakkaan vaatimukset: kielletyt materiaalit, hyväksytyt alkuperät, analyyttiset raja-arvot, kuljetusolosuhteet, yritysvastuusitoumukset. Se on **viiteteksti**, joka luetaan. Portaali näyttää sen ohjatun toiminnon ”Konteksti”-paneelissa, ja ”Vaatimusmäärittelyt”-näyttö kokoaa ne kaikki yhteen.",
                        "**Luettelo** — asiakkaanne määrittämä **pakollisten kenttien luettelo**: ”jotta raaka-aine voidaan listata meillä, tarvitsen alkuperän, tiheyden, EAN-koodin, pääallergeenin…”. Se ei ole teksti vaan tarkistus. Portaali laskee sen jatkuvasti ja näyttää sen pisteet ”Vaatimustenmukaisuus”-vaiheessa."
                    ]
                },
                {
                    "p": "Toisin sanoen: vaatimusmäärittely kertoo, **mitä asiakkaanne odottaa tuotteeltanne**, ja luettelo varmistaa, **että tuotteen kortti on täydellinen**. Voitte täyttää vaatimusmäärittelyn ja silti kortti voi olla puutteellinen, ja päinvastoin."
                },
                {
                    "p": "Vain toinen näistä voi estää lähettämisen: luettelo. Kun asiakkaanne on määrittänyt estävän luettelon, ”Valmis”-painike ei ole käytettävissä niin kauan kuin jokin kenttä puuttuu, ja ”Vaatimustenmukaisuus”-vaihe luettelee tarkasti mitkä — jokainen rivi vie kyseiseen kenttään."
                },
                {
                    "note": "Vaatimusmäärittely voi myös edellyttää asiakirjoja (luomusertifikaatti, GMO-vapaustodistus). Ne näkyvät kohdassa ”Omat asiakirjat” ja Asiakirjat-vaiheessa voimassaoloaikoineen — eivät luettelossa."
                },
                {
                    "links": [
                        {
                            "href": "/specs",
                            "icon": "menu_book",
                            "label": "Vaatimusmäärittelyt"
                        },
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "Omat asiakirjat"
                        }
                    ]
                }
            ]
        },
        {
            "id": "frozen",
            "icon": "lock",
            "title": "Mitä lukittu luettelo tarkoittaa",
            "summary": "Asiakkaanne hyväksymä luettelo muuttuu vain luku -tilaan. Tämä on tarkoituksellista, ja sen voi pyynnöstä perua.",
            "blocks": [
                {
                    "p": "Kun asiakkaanne hyväksyy osion — ainesosaluettelon, kyselylomakkeen, allergeenit… — osio **lukitaan**: näette sen edelleen kaikkine arvoineen, mutta ette voi enää muuttaa sitä. Riippulukko ja merkintä ”Vain luku” osoittavat tämän."
                },
                {
                    "p": "Juuri tämä on tarkoitus: hyväksytystä arvosta tulee viite, johon asiakkaanne luottaa (pakkausmerkinnät, vaatimusmäärittelyt, tarkastukset). Jos arvo voisi muuttua asiakkaan tietämättä, hyväksyntä ei merkitsisi mitään."
                },
                {
                    "p": "Lukitut luettelot näkyvät myös ohjatun toiminnon ”Konteksti”-paneelissa kohdassa ”Hyväksytyt luettelot”: siitä näkee nopeimmin, mikä on jo sovittu ja mikä on vielä avoinna."
                },
                {
                    "warn": "Huomasitteko virheen lukitussa luettelossa? Älkää luoko kaksoiskorttia. Pyytäkää osion avaamista uudelleen kortin keskustelussa: asiakkaanne poistaa lukituksen, ja osio palautuu teille muokattavaksi."
                },
                {
                    "p": "Koko kortti voi olla vain luku -tilassa myös muusta syystä: tehtävä on suoritettu, projekti on suljettu tai teillä on vain lukuoikeus. Ohjattu toiminto kertoo, mikä näistä on kyseessä."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Keskustelut"
                        }
                    ]
                }
            ]
        },
        {
            "id": "confidence",
            "icon": "auto_awesome",
            "title": "Mitä tekoäly ehdottaa",
            "summary": "Ehdotuksia — ei koskaan arvoja, jotka kirjoitetaan puolestanne.",
            "blocks": [
                {
                    "p": "Kun automaattinen tietojen poiminta on käytössä asiakkaallanne, portaali lukee asiakirjanne ja ehdottaa löytämiään arvoja. Ne näkyvät ”Konteksti”-paneelissa lomakkeen oikealla puolella, ja ne luetaan uudelleen aina vaihetta vaihdettaessa — juuri syöttämänne tiedot vaikuttavat siihen, mitä on vielä ehdotettavana."
                },
                {
                    "p": "Kaikki alkaa **teknisestä tuotekortista** ohjatun toiminnon otsikossa. Niin kauan kuin sitä ei ole ladattu, luettavaa ei ole ja ehdotusluettelo pysyy tyhjänä: sitä punainen palkki tarkoittaa."
                },
                {
                    "ul": [
                        "**Käytä** — arvo kirjoitetaan korttiin. Mitään ei kirjoiteta ennen tätä napsautusta.",
                        "**Laajenna** — pitkille analyyseille, jotka eivät mahdu paneeliin."
                    ]
                },
                {
                    "note": "Ei-toivottua ehdotusta ei tarvitse hylätä: jättäkää se käyttämättä, mikä on jo oletus. Mitään arvoa ei koskaan oteta käyttöön automaattisesti, olipa luennan ilmoitettu luotettavuus kuinka suuri tahansa. Te vastaatte kortista: päätös on teidän, kenttä kentältä."
                },
                {
                    "p": "Lopullinen arvo on joka tapauksessa teidän: vastaatte hyväksymistänne tiedoista, eikä mitään välity asiakkaallenne ennen kuin suoritatte tehtävän."
                }
            ]
        },
        {
            "id": "documents",
            "icon": "folder_shared",
            "title": "Asiakirjojen voimassaolo ja uusiminen",
            "summary": "Portaali tietää, mitä asiakirjoja odotetaan, kuinka kauan ne ovat voimassa ja mitkä puuttuvat.",
            "blocks": [
                {
                    "p": "Odotettuja asiakirjoja ei tarvitse arvailla: asiakkaanne määrittää ne (asiakirjatyyppi, pakollinen vai ei, voimassaoloaika, soveltamisala), ja ”Omat asiakirjat” -näyttö näyttää ne teille sellaisinaan, tuote kerrallaan."
                },
                {
                    "ul": [
                        "**Voimassa** — toimitettu, hyväksytty, eikä voimassaolon päättyminen ole lähellä.",
                        "**Uusittava** — voimassaolo päättyy alle 60 päivän kuluttua (asiakkaanne voi muuttaa tätä aikaa).",
                        "**Vanhentunut** — voimassaolo on päättynyt. Pakollisen asiakirjan kohdalla tämä keskeyttää hyväksyntänne.",
                        "**Puuttuva** — odotettu, mutta ei koskaan toimitettu.",
                        "**Hylätty** — toimitettu, mutta asiakkaanne on hylännyt sen: lukekaa perustelu ennen kuin lataatte uudelleen."
                    ]
                },
                {
                    "p": "Jokaisella asiakirjalla on voimassaoloaika (alku ja loppu), joka näkyy sen rivillä ja väritetään samoin kuin beCPG:ssä: **vihreä**, kun asiakirja on voimassa, **oranssi**, kun määräaika lähestyy, ja **punainen**, kun se on ylittynyt."
                },
                {
                    "p": "Tyypistä riippuen voimassaoloaika johdetaan automaattisesti latauspäivästä ja asiakkaanne määrittämästä kestosta, tai **teidän on syötettävä se itse**: tällöin latausalueelle ilmestyy kaksi päivämääräkenttää, jotka täytetään lataamanne asiakirjan perusteella. Ne kulkevat tiedoston mukana, ja niitä voi myöhemmin muokata rivin ”Muokkaa”-toiminnolla."
                },
                {
                    "warn": "Pakollinen asiakirja, jonka voimassaoloa ei ole koskaan täytetty, merkitään punaisella: ”Voimassaolo täytettävä”. Ilman päättymispäivää se ei koskaan vanhene, muistutusta ei lähetetä, eikä asiakkaanne tiedä, mistä lähtien se on voimassa."
                },
                {
                    "p": "Uusiminen tarkoittaa uuden version lataamista samalle riville — ei koskaan toisen rivin luomista. Edellinen versio säilyy asiakirjahistoriassa omine voimassaoloaikoineen: sillä osoitetaan, että olitte katettuna tiettynä aiempana ajankohtana."
                },
                {
                    "note": "Tiedoston nimellä ja tallennuspaikalla ei ole merkitystä: portaali nimeää ja arkistoi asiakirjan asiakkaanne määritysten mukaisesti. Ladatkaa tiedosto sellaisena kuin se on teille toimitettu."
                },
                {
                    "p": "beCPG lähettää sähköpostimuistutukset ennen vanhenemista asiakkaanne määrittämien sääntöjen mukaisesti. Portaali näyttää aina todellisen tilan: älkää luottako sähköpostiin, ”Omat asiakirjat” on ensisijainen lähde."
                },
                {
                    "links": [
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "Omat asiakirjat"
                        }
                    ]
                }
            ]
        },
        {
            "id": "approval",
            "icon": "verified",
            "title": "Hyväksynnän tila",
            "summary": "Lasketaan reaaliaikaisesti asiakirjoistanne, korteistanne ja poikkeamistanne. Ei koskaan lukittu.",
            "blocks": [
                {
                    "p": "Koostenäkymässä näkyvä tila ei ole käsin syötetty päätös: se lasketaan uudelleen aina näytettäessä asiakokonaisuutenne perusteella. Korjatkaa syy, niin tila muuttuu."
                },
                {
                    "ul": [
                        "**Keskeytetty** — vähintään yksi pakollinen asiakirja on vanhentunut tai estävä poikkeama on avoinna.",
                        "**Uusittava** — vähintään yksi pakollinen asiakirja on vanhenemassa.",
                        "**Käynnissä** — listausprojekti on avoinna, pakollista asiakirjaa ei ole koskaan toimitettu tai estävä tarkistus ei täyty.",
                        "**Hyväksytty** — mikään edellä mainituista ei päde."
                    ]
                },
                {
                    "p": "Koostenäkymän kortti luettelee tilan syyt: kutakin voi napsauttaa, ja se vie korjattavaan kohtaan."
                },
                {
                    "note": "Asiakkaanne ostojärjestelmät lukevat saman tilan. Vanhentunut pakollinen asiakirja voi siis estää tilauksen eikä vain näyttää oranssia merkkiä."
                }
            ]
        },
        {
            "id": "signature",
            "icon": "draw",
            "title": "Miten allekirjoitus toimii",
            "summary": "Teitä pyydetään ensin lukemaan ja sitten allekirjoittamaan. Allekirjoituksen tekee beCPG, ei selaimenne.",
            "blocks": [
                {
                    "p": "Allekirjoitustehtävä avaa asiakirjan portaaliin sisäänrakennetussa katseluohjelmassa. Tiedosto ei koskaan poistu portaalista, ja sitä voi käyttää myös puhelimella."
                },
                {
                    "ol": [
                        "**Lukekaa koko asiakirja.** Lukemisen etenemistä seurataan sivu sivulta: niin kauan kuin jotakin sivua ei ole näytetty, allekirjoittaminen ei ole mahdollista.",
                        "**Piirtäkää allekirjoituksenne** sormella, hiirellä tai kynällä asiakkaanne valmistelemiin kohtiin. Allekirjoitus- ja nimikirjainalueet on sijoitettu etukäteen: teidän ei tarvitse sijoittaa niitä.",
                        "**Valitkaa suostumusruutu** ja lähettäkää. Tehtävä lähetetään kerran."
                    ]
                },
                {
                    "p": "beCPG allekirjoittaa asiakirjan palvelimellaan, arkistoi allekirjoitetun version ja lähettää sen sähköpostitse vastaanottajille. Portaali ei myönnä omaa sertifikaattiaan."
                },
                {
                    "note": "Jos verkkoyhteys katkeaa lähetyksen aikana, yrittäkää uudelleen: pyynnöllä on yksilöllinen tunniste, joten kahdesti perille tullut pyyntö ei allekirjoita kahdesti. Jo allekirjoitettu asiakirja näytetään sellaisena latauslinkkeineen, eikä teitä pyydetä allekirjoittamaan uudelleen."
                },
                {
                    "warn": "Allekirjoitusta ei voi hylätä eikä perua portaalista. Jos asiakirja on virheellinen, älkää allekirjoittako: avatkaa keskustelu ja ilmoittakaa asiakkaallenne."
                }
            ]
        },
        {
            "id": "discussion",
            "icon": "forum",
            "title": "Minne asiakkaanne huomautukset tulevat",
            "summary": "Yksi keskustelu korttia kohden, mutta jokainen viesti on kiinnitetty siihen kohtaan, jota se koskee.",
            "blocks": [
                {
                    "p": "Kortin keskustelu on sama molemmilla osapuolilla: mitä asiakkaanne kirjoittaa beCPG:ssä, tulee teille tänne, ja vastauksenne menevät asiakkaalle sinne. Erillistä postilaatikkoa ei tarvitse seurata."
                },
                {
                    "p": "Viestin voi kiinnittää kolmeen paikkaan, ja paneelin yläreunan valitsimella valitsette, mitä luette tai mihin kirjoitatte:"
                },
                {
                    "ul": [
                        "**Koko kortti** — koko keskustelu, mukaan lukien kenttiin ja taulukon riveihin jätetyt huomautukset. Tämä on oletusnäkymä.",
                        "**Kenttä** — ”virallinen nimi on puutteellinen”. Kentän viereen ilmestyy tällöin puhekupla ohjatussa toiminnossa.",
                        "**Taulukon rivi** — ”tyydyttyneen rasvan arvo on väärin”. Huomautus seuraa riviä, ei rivinumeroa."
                    ]
                },
                {
                    "note": "Kun kirjoitatte kentästä tai riviltä ”Koko kortti” -näkymän sijaan, säästätte kaikkien aikaa: yhteyshenkilönne näkee heti, mistä puhutte, eikä hänen tarvitse etsiä kahdensadan kentän joukosta."
                },
                {
                    "p": "Keskustelu on vain luku -tilassa, kun listaus on suljettu: voitte lukea viestinvaihdon, mutta ette lisätä siihen. Näyttö kertoo, mikä syy on kyseessä."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Keskustelut"
                        }
                    ]
                }
            ]
        },
        {
            "id": "contact",
            "icon": "support_agent",
            "title": "Keneen ottaa yhteyttä",
            "summary": "Yhteyshenkilönne on asiakkaanne. Korttiin liitetty keskustelu on oikea kanava.",
            "blocks": [
                {
                    "p": "Asiakkaanne on avannut tämän portaalin teille: hän määrittää odotetut asiakirjat, ohjatun toiminnon vaiheet, hyväksynnät ja määräajat. Siksi hän on ensisijainen yhteyshenkilönne kaikissa sisältöä koskevissa asioissa."
                },
                {
                    "ul": [
                        "**Korttia koskeva kysymys, huomautus, korjaus, lukituksen poistoa vaativa luettelo** — käyttäkää korttiin tai tehtävään liitettyä keskustelua. Viestinne tavoittaa asiakokonaisuuttanne seuraavan henkilön ja pysyy liitettynä kyseiseen tuotteeseen.",
                        "**Ilman selvää perustelua hylätty asiakirja** — vastatkaa tuotteen keskustelussa ennen kuin lataatte uudelleen.",
                        "**Määräaika, jota ette pysty noudattamaan** — kertokaa siitä keskustelussa sen sijaan, että antaisitte tehtävän myöhästyä.",
                        "**Käyttöoikeusongelma** (salasana, lisättävä kollega, suljettava tili) — ottakaa yhteyttä asiakkaanne yhteyshenkilöön: tilit luodaan ja suljetaan asiakkaan puolella, ei tästä portaalista."
                    ]
                },
                {
                    "note": "Ilmoittamanne yhteyshenkilöt sekä asiakkaanne yhteyshenkilöt on lueteltu toimittajakorttinne Yhteyshenkilöt-välilehdellä."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Keskustelut"
                        },
                        {
                            "href": "/company",
                            "icon": "business",
                            "label": "Oma yritys"
                        },
                        {
                            "href": "/specs",
                            "icon": "menu_book",
                            "label": "Vaatimusmäärittelyt"
                        }
                    ]
                }
            ]
        }
    ],
    "app/login/page#PAGE_TEXT": {
        "welcome": "Tervetuloa",
        "intro": "Kirjautukaa sisään toimittajatilaanne: tehtävänne, tuotteenne, asiakirjanne ja hyväksyntänne tila.",
        "chooseTenant": "Valitse asiakas",
        "chooseTenantHelp": "Työskenteletteko usealle beCPG-asiakkaalle? Valitkaa asiakas, jonka asiakokonaisuuden haluatte avata.",
        "sso": "Teidät ohjataan asiakkaanne tunnistautumispalveluun.",
        "testNotice": "TESTI-instanssi — täällä syötetyt tiedot eivät ole sopimuksellisesti sitovia.",
        "help": "Tarvitsetteko apua?",
        "errorTitle": "Kirjautuminen epäonnistui",
        "pitch": "beCPG-toimittajaportaali",
        "sellingPoints": [
            {
                "icon": "assignment_turned_in",
                "text": "Listauspyyntönne ja tehtävänne yhdessä paikassa"
            },
            {
                "icon": "folder_shared",
                "text": "Asiakirjanne ja sertifikaattinne vanhenemispäivineen"
            },
            {
                "icon": "verified",
                "text": "Hyväksyntänne tila, jota asiakkaanne pitää ajan tasalla"
            }
        ]
    },
    "app/login/page#ERROR_TEXT": {
        "oidc_not_configured": "Tunnistautumista ei ole määritetty tälle asiakkaalle.",
        "tenant_mismatch": "Istuntonne kuului toiselle asiakkaalle. Kirjautukaa sisään uudelleen.",
        "dev_auth_misconfigured": "Kehitystila on käytössä, mutta sen määritys on virheellinen.",
        "session_expired": "Istuntonne on vanhentunut. Kirjautukaa sisään uudelleen."
    },
    "app/messages/page#LABELS": {
        "title": "Keskustelut",
        "subjects": "Aiheet",
        "messageCount": "Viestejä: {count}",
        "search": "Hae aihetta",
        "myRecord": "Toimittajatietoni",
        "back": "Aiheet",
        "placeholder": "Kirjoita viesti…",
        "send": "Lähetä",
        "sending": "Lähetetään…",
        "empty": "Ei viestejä",
        "emptyHint": "Aloita keskustelu — asiakas saa ilmoituksen.",
        "noSubject": "Valitse aihe",
        "noSubjectHint": "Valitse tuote tai toimittajatietosi nähdäksesi viestinvaihdon.",
        "noSubjects": "Ei keskusteluaiheita",
        "noSubjectsHint": "Keskustelut liittyvät tuotteisiinne. Teihin ei ole tällä hetkellä liitetty yhtään tuotetta.",
        "field": "Kenttä",
        "edited": "muokattu",
        "you": "Te",
        "openSubject": "Avaa tuotekortti",
        "thread": "Keskustelu",
        "more": "Lataa lisää",
        "loading": "Ladataan…",
        "tooLong": "Viesti on liian pitkä (enintään 20 000 merkkiä).",
        "denyReasons": {
            "noAssignedTask": "Listaus on päättynyt: tämä keskustelu on vain luku -tilassa.",
            "readAccess": "Teillä on tähän tuotekorttiin vain lukuoikeus.",
            "noPermission": "Teillä ei ole oikeutta kirjoittaa tähän keskusteluun."
        }
    },
    "app/monitor/campaigns/[id]/page#LABELS": {
        "back": "Projektit",
        "notFound": "Projektia ei löytynyt",
        "notFoundHint": "Tätä projektia ei ole olemassa, se ei ole toimittajaprojekti tai se on rajauksenne ulkopuolella.",
        "kpi": {
            "response": "Vastausprosentti",
            "age": "Avoinna",
            "due": "Määräaika",
            "tasks": "Avoimet tehtävät"
        },
        "hints": {
            "days": "{count} pv",
            "noDue": "Ei määräaikaa",
            "overdue": "{count} pv myöhässä",
            "dueIn": "{count} pv:n kuluttua",
            "late": "Myöhässä: {count}",
            "unanswered": "Ei vastausta avaamisen jälkeen"
        },
        "tasks": "Avoimet tehtävät",
        "tasksEmpty": "Tässä projektissa ei ole avoimia tehtäviä.",
        "tasksHint": "Mitä työnkulku odottaa ja keneltä.",
        "noAssignee": "Ei vastuuhenkilöä",
        "entities": "Projektin kohteet",
        "entitiesHint": "Avaa tuotekortti nähdäksesi syötettävät tiedot ja niihin liittyvän keskustelun.",
        "entitiesEmpty": "Tähän projektiin ei liity yhtään tuotekorttia.",
        "unreadable": "Rajauksenne ulkopuolella",
        "open": "Avaa",
        "suppliers": "Toimittajat",
        "manager": "Vastuuhenkilö",
        "discussion": "Projektin keskustelu",
        "state": "Tila"
    },
    "app/monitor/campaigns/page#LABELS": {
        "title": "Projektit",
        "subtitle": "Avoimet listaus- ja uusimisprojektit. Valitse projektit muistuttaaksesi niiden toimittajia tai eskaloidaksesi asian.",
        "stats": {
            "open": "Avoimet projektit",
            "openState": "Projektit · {state}",
            "response": "Vastausprosentti",
            "unanswered": "Ei vastausta",
            "reminders": "Erääntyneet muistutukset"
        },
        "hints": {
            "scanned": "Läpikäyty: {count}",
            "meanCompletion": "Keskimääräinen eteneminen {value} %",
            "escalations": "Eskaloitavia: {count}",
            "late": "Myöhässä: {count}",
            "noEscalation": "Eskalointia ei tarvita",
            "answered": "Vastattu: {count}"
        },
        "startCampaign": "Käynnistä projekti",
        "allOpen": "Kaikki avoimet projektit",
        "state": "Projektin tila",
        "sortLabel": "Lajitteluperuste",
        "sorts": {
            "dueDate": "Aikaisin määräaika",
            "completion": "Alhaisin vastausprosentti",
            "age": "Pisimpään avoinna",
            "name": "Nimi"
        },
        "searchSupplier": "Suodata toimittajan mukaan",
        "truncated": "Hakuikkuna: beCPG rajaa listauksen 250 riviin, ja projekteja luettiin {scanned}. Tämän sivun lajittelu ja kokonaismäärät koskevat vain tätä ikkunaa — rajaa tilaa tai kohdejoukkoa saadaksesi kattavan näkymän.",
        "scopeEmpty": "Yksikään toimittaja ei vastaa tätä rajausta. Siihen ei voi liittyä projekteja: yllä olevat laskurit ovat nollia rakenteellisesti, eivät mittaustuloksia.",
        "parkScoped": "Laskurit rajattu suodatettuun joukkoon (toimittajia: {count}).",
        "noRate": "Ei arvioitavia projekteja",
        "unsupported": "beCPG:n vakiomalli ei tue seuraavia suodattimia: {names}. Määritä ne asiakaskohtaisesti.",
        "pageOf": "{from}-{to} / {total} projektia",
        "previous": "Edellinen",
        "next": "Seuraava",
        "rows": "Rivejä",
        "reminder": "Avoin projektinne portaalissa odottaa edelleen vastaustanne. Pyydämme teitä suorittamaan teille osoitetut tehtävät mahdollisimman pian.",
        "hintTargets": "Valittujen projektien toimittajat",
        "noteReminder": "beCPG ei tallenna muistutushistoriaa: sarake ”Viimeisin muistutus” näyttää projektin viimeisimmän toiminnon, joka on lähin todellisuudessa saatavilla oleva tieto.",
        "truncatedShort": "Ikkuna: {scanned} projektia luettu"
    },
    "app/monitor/documents/page#LABELS": {
        "title": "Asiakirjojen vaatimustenmukaisuus",
        "views": "Vaatimustenmukaisuuden näkymät",
        "matrixView": "Matriisi",
        "sceneView": "3D-näkymä",
        "subtitle": "Toimittaja × asiakirjatyyppi -matriisi. Valitse soluja tai rivejä lähettääksesi joukkomuistutuksen.",
        "search": "Hae toimittajaa",
        "allTypes": "Kaikki asiakirjatyypit",
        "allStatuses": "Kaikki tilat",
        "mandatoryOnly": "Vain pakolliset asiakirjat",
        "export": "Vie",
        "stats": {
            "suppliers": "Toimittajat",
            "missing": "Puuttuvat",
            "expired": "Vanhentuneet",
            "expiring": "Uusittavat",
            "refused": "Hylätyt"
        },
        "statuses": {
            "valid": "Voimassa",
            "expiring": "Vanhenemassa pian",
            "expired": "Vanhentunut",
            "missing": "Puuttuu",
            "refused": "Hylätty",
            "toValidate": "Tarkistettavana"
        },
        "truncatedShort": "Ikkuna: {scanned} toimittajaa luettu",
        "truncated": "Toimittajajoukko on hakuikkunaa suurempi ({scanned}/{total} toimittajaa): rajaa suodattimia saadaksesi täydellisen matriisin.",
        "scopeEmpty": "Yksikään toimittaja ei vastaa tätä rajausta. Asiakirjahakua ei suoritettu: yllä olevat laskurit ovat nollia rakenteellisesti, eivät mittaustuloksia.",
        "cellsScope": "solua · toimittajajoukon kaikista toimittajista (yhteensä {total})",
        "statusScope": "Näyttösuodatin ”{status}”: {kept}/{shown} tällä sivulla näytetystä rivistä säilytetty. Yllä olevat laskurit koskevat koko toimittajajoukkoa ({total} toimittajaa), eivät tätä sivua.",
        "unsupported": "beCPG:n vakiomalli ei tue seuraavia suodattimia: {names}. Määritä ne asiakaskohtaisesti.",
        "pageOf": "{from}-{to} / {total} toimittajaa",
        "previous": "Edellinen",
        "next": "Seuraava",
        "rows": "Rivejä",
        "reminder": "Toimittajatiedoissanne on portaalissa päivitettäviä asiakirjoja: {types}. Pyydämme teitä lataamaan ne mahdollisimman pian.",
        "reminderGeneric": "Toimittajatiedoistanne puuttuu pakollisia asiakirjoja tai niitä on vanhentunut. Pyydämme teitä päivittämään ne portaalissa.",
        "hintTypes": "Kohdistettuja asiakirjatyyppejä: {count}"
    },
    "app/monitor/layout#LABELS": {
        "metaTitle": "Toimittajaseuranta — beCPG",
        "metaDescription": "Toimittajajoukko yhdellä silmäyksellä: asiakirjojen vaatimustenmukaisuus ja projektit",
        "title": "Seurantanäkymä",
        "denied": "Seurantanäkymä on varattu sisäisille tiimeille",
        "deniedGroups": "Tilinne ei kuulu mihinkään seurantanäkymän avaavista beCPG-ryhmistä: {groups}. Pyydä jäsenyyttä beCPG-pääkäyttäjältäsi.",
        "backSupplier": "Siirry koostenäkymääni"
    },
    "app/monitor/page#LABELS": {
        "title": "Toimittajajoukon seuranta",
        "description": "Toimittajakantasi hyväksyntä, dokumenttien vaatimustenmukaisuus, vanhenemiset, projektit ja poikkeamat reaaliajassa.",
        "generatedAt": "Tiedot ajankohdalta {time}",
        "truncated": "Toimittajajoukko on hakuikkunaa suurempi: luettu {scanned}/{total} toimittajaa. ”≈”-merkityt laskurit on rajattu; jakauma ja top 10 koskevat hakuikkunaa.",
        "truncatedShort": "Ikkuna: {scanned} toimittajaa luettu",
        "tablist": "Toimittajajoukon tarkastelu",
        "tabs": {
            "quality": "Laatu",
            "purchasing": "Hankinta",
            "rnd": "T&K",
            "csr": "Vastuullisuus",
            "assistant": "Avustaja"
        },
        "ai": "Tekoäly"
    },
    "app/monitor/products/page#LABELS": {
        "title": "Toimittajien tuotteet",
        "subtitle": "Toimittajille osoitetut tuotteet. Suodata sertifikaatin päivämäärän mukaan nähdäksesi uusittavat.",
        "search": "Hae tuotetta, koodia, virallista nimeä…",
        "state": "Tuotteen tila",
        "anyState": "Kaikki tilat",
        "certified": "Sertifikaatin päivämäärä",
        "anyCertified": "Kaikki päivämäärät",
        "certifiedNone": "Ei päivämäärää",
        "certifiedYears": "Sertifioitu yli {count} v sitten",
        "columns": {
            "name": "Tuote",
            "code": "Koodi",
            "supplierRef": "Toimittajan viite",
            "suppliers": "Toimittaja(t)",
            "plants": "Toimittajan toimipaikat",
            "state": "Tila",
            "certificate": "Sertifikaatin päivämäärä",
            "modified": "Päivitetty"
        },
        "age": "{count} v sitten",
        "ageMonths": "{count} kk sitten",
        "none": "—",
        "empty": "Tässä rajauksessa ei ole tuotteita",
        "emptyHint": "Yhdelläkään tuote-entiteetillä ei ole toimittaja-aspektia näillä suodattimilla. Tuotteet näkyvät täällä heti, kun niihin liitetään toimittaja.",
        "pageOf": "{from} - {to} / {total}",
        "previous": "Edellinen sivu",
        "next": "Seuraava sivu",
        "rows": "Rivejä sivulla",
        "sortScope": "Lajittelu koskee näytettävää sivua, ei koko toimittajajoukkoa.",
        "tiles": {
            "total": "Tuotteet",
            "valid": "Hyväksytyt",
            "draft": "Simulointi",
            "noCertificate": "Ei listauspäivää"
        }
    },
    "app/monitor/quality/[id]/page#LABELS": {
        "back": "Poikkeamat",
        "notFound": "Poikkeamaa ei löytynyt",
        "notFoundHint": "Sitä ei ole olemassa, tai se on rajauksesi ulkopuolella.",
        "blocking": "Estävä",
        "priority": "Prioriteetti",
        "product": "Tuote",
        "suppliers": "Toimittajat",
        "batch": "Erä",
        "created": "Luotu",
        "modified": "Päivitetty",
        "cost": "Kustannus",
        "discussion": "Keskustelu"
    },
    "app/monitor/quality/page#LABELS": {
        "title": "Poikkeamat",
        "startNc": "Käynnistä poikkeama",
        "subtitle": "Toimittajien NC:t, käsittelyaika ja korjaavien toimenpiteiden eteneminen. Valitse NC:t muistuttaaksesi, eskaloidaksesi tai keskeyttääksesi kyseiset toimittajat.",
        "stats": {
            "open": "Avoimet NC:t",
            "blocking": "Estävät",
            "overdue": "Tavoiteaika ylitetty",
            "delay": "Keskimääräinen viive"
        },
        "hints": {
            "total": "Yhteensä: {count}",
            "blocking": "Muuttaa hyväksynnän tilaksi ”keskeytetty”",
            "noBlocking": "Mikään NC ei estä hyväksyntää",
            "actionsLate": "Myöhässä olevia korjaavia toimenpiteitä: {count}",
            "noActionsLate": "Ei myöhässä olevia korjaavia toimenpiteitä",
            "closing": "Keskimääräinen sulkemisaika {value} pv",
            "noClosing": "Tässä rajauksessa ei ole suljettuja NC:itä",
            "closingHidden": "{count} suljettua poikkeamaa · napsauta sisällyttääksesi ne"
        },
        "dayUnit": "pv",
        "allStates": "Kaikki tilat",
        "allTypes": "Kaikki tyypit",
        "includeClosed": "Sisällytä suljetut NC:t",
        "searchSupplier": "Suodata toimittajan mukaan",
        "truncatedShort": "Ikkuna: {scanned} poikkeamaa luettu",
        "truncated": "NC:itä on enemmän kuin hakuikkunaan mahtuu (läpikäyty {scanned}): rajaa suodattimia saadaksesi kattavan näkymän.",
        "inexact": "Likimääräiset laskurit: hakukone palautti rajatun kokonaismäärän vähintään yhdelle kyselylle.",
        "scopeEmpty": "Yksikään toimittaja ei vastaa tätä rajausta. Kyselyä ei suoritettu: yllä olevat laskurit ovat nollia rakenteellisesti, eivät mittaustuloksia.",
        "unsupported": "beCPG:n vakiomalli ei tue seuraavia suodattimia: {names}. Määritä ne asiakaskohtaisesti.",
        "pageOf": "{from}-{to} / {total} NC:tä",
        "previous": "Edellinen",
        "next": "Seuraava",
        "rows": "Rivejä",
        "reminder": "Teitä koskee avoin poikkeama. Pyydämme teitä käsittelemään siihen liittyvät korjaavat toimenpiteet portaalissa mahdollisimman pian.",
        "hintTargets": "Valittujen NC:iden toimittajat",
        "note": "Käsittelyaika: NC:n luomisesta lähtien; suljetulle NC:lle sen luomisen ja viimeisimmän muokkauksen välinen aika — beCPG ei tallenna sulkemispäivää."
    },
    "app/monitor/suppliers/[id]/page#LABELS": {
        "back": "Toimittajat",
        "notFound": "Toimittajaa ei löytynyt",
        "notFoundHint": "Tätä toimittajaa ei ole olemassa tai se on rajauksenne ulkopuolella.",
        "tiles": {
            "label": "Toimittajan tunnusluvut",
            "nc": "Estävät NC:t",
            "ncHint": "avoinna",
            "projects": "Käynnissä olevat projektit",
            "projectsHint": "{count} vastaamatta",
            "documents": "Pakolliset asiakirjat",
            "documentsHint": "{expired} vanhentunut · {missing} puuttuu",
            "documentsNone": "ei odotettuja",
            "products": "Tuotteet",
            "productsHint": "liitetty",
            "delay": "Vastausaika",
            "delayHint": "keskiarvo {period}",
            "delayNone": "päätöksenteon moduuli",
            "completion": "Täydellisyys",
            "completionHint": "{count} aktiivista katalogia",
            "completionNone": "ei aktiivista katalogia",
            "days": "pv"
        },
        "tabs": {
            "label": "Toimittajakortti",
            "overview": "Yleiskatsaus",
            "nc": "Poikkeamat",
            "projects": "Projektit",
            "documents": "Asiakirjat",
            "products": "Tuotteet",
            "subSuppliers": "Alitoimittajat",
            "history": "Historia"
        },
        "status": "Hyväksyntätila",
        "statusHelp": "Tila lasketaan jokaisella näyttökerralla eikä sitä tallenneta: ensimmäinen täyttyvä sääntö ratkaisee.",
        "risk": "Riskipistemäärä",
        "riskHelp": "Jokainen syy lisää oman painonsa; jokainen lisäesiintymä lisää pienenevän lisän.",
        "riskFrom": "alkaen {from}",
        "reasonNames": {
            "documentExpired": "Vanhentunut asiakirja",
            "blockingNc": "Estävä NC",
            "campaignNoAnswer": "Vastaamaton projekti",
            "scoreDropping": "Laskeva pistemäärä",
            "documentExpiring": "Vanhenemassa oleva asiakirja",
            "lateTask": "Myöhässä oleva tehtävä",
            "lowCompletion": "Heikko täydellisyys",
            "documentMissing": "Puuttuva asiakirja",
            "openNc": "Avoin NC"
        },
        "activity": "Aktiivisuus ja reagointikyky",
        "activityHelp": "Toimittajalle annetut tehtävät ja keskimääräinen vastausaika vuosittain, luettu päätöksenteon moduulista.",
        "identity": "Perustiedot",
        "identityRows": {
            "code": "Koodi",
            "erpCode": "ERP-koodi",
            "legalName": "Virallinen nimi",
            "state": "beCPG-tila",
            "family": "Perhe",
            "subFamily": "Alaperhe",
            "sites": "Toimipaikat",
            "subsidiaries": "Tytäryhtiöt",
            "parent": "Päätoimittaja",
            "catalogs": "Aktiiviset katalogit"
        },
        "scorecard": "Arviointi",
        "scorecardHelp": "Toimittajan viimeisimmissä projekteissa arvioitujen kriteerien painotettu keskiarvo.",
        "allNc": "Kaikki sen NC:t",
        "startNc": "Käynnistä NC",
        "exchanges": "Viestintä",
        "ncFile": "toimittaja-nc",
        "projectsFile": "toimittaja-projektit",
        "none": "—"
    },
    "app/monitor/suppliers/page#LABELS": {
        "title": "Toimittajat",
        "statuses": {
            "suspended": "Keskeytetty",
            "toRenew": "Uusittava",
            "inProgress": "Käynnissä",
            "approved": "Hyväksytty"
        },
        "statusFiltered": "Suodatin käytössä",
        "export": "Vie (CSV)",
        "exportCutTitle": "Vienti on puutteellinen: {scanned}/{total} riviä",
        "exportCutMessage": "beCPG rajaa listauksen 250 riviin kyselyä kohden, joten vienti kattaa luetun ikkunan, ei koko toimittajajoukkoa. Rajaa suodattimia (ryhmä, ostaja, tila) ja vie erissä saadaksesi täydellisen tiedoston.",
        "exportCutConfirm": "Vie ikkuna",
        "generatedAt": "Tiedot ajankohdalta {time}",
        "windowOf": "{from}-{to} / {total} toimittajaa",
        "previous": "Edellinen ikkuna",
        "next": "Seuraava ikkuna",
        "truncated": "Toimittajajoukko on hakuikkunaa suurempi (luettu {scanned}/{total}): lajittelu ja järjestys koskevat tätä ikkunaa. Rajaa suodattimia saadaksesi tarkan koko toimittajajoukon järjestyksen.",
        "sortScope": "Lajiteltu luetun ikkunan sisällä",
        "sortedBy": "Oletuslajittelu: {sort}",
        "reminder": "Hyvä vastaanottaja,\n\nToimittajatietonne on päivitettävä (pakollisia asiakirjoja puuttuu, ne ovat vanhentuneet tai odottavat käsittelyä).\nPyydämme teitä kirjautumaan portaaliin ja täydentämään tiedot.\n\nYstävällisin terveisin,",
        "countsScope": "Jakauma luetuista toimittajista ({scanned})",
        "sortNames": {
            "risk": "riski, laskeva",
            "name": "nimi",
            "code": "koodi",
            "status": "hyväksynnän tila",
            "completion": "täydellisyys",
            "expiring": "vanhenemassa olevat asiakirjat",
            "expired": "vanhentuneet asiakirjat",
            "nc": "avoimet NC:t",
            "lastActivity": "viimeisin toiminto"
        },
        "truncatedShort": "Ikkuna: {scanned} toimittajaa luettu"
    },
    "app/not-found#LABELS": {
        "title": "Sivua ei löytynyt",
        "message": "Tätä osoitetta ei ole olemassa, tai kohteeseen, johon se viittaa, ei enää ole pääsyä. Jos saavuitte sähköpostin kautta, linkki on voinut vanhentua.",
        "home": "Takaisin etusivulle"
    },
    "app/products/[id]/page#LABELS": {
        "sheet": "Tuotekortti",
        "notFound": "Tuotetta ei löytynyt",
        "notFoundHint": "Tätä tuotekorttia ei ole olemassa tai se ei kuulu rajaukseenne.",
        "back": "Omat tuotteet",
        "monitorBack": "Toimittajien tuotteet",
        "versionTitle": "Versio {label}, {date}",
        "versionBy": "tekijä {author}",
        "versionBack": "Palaa nykyiseen versioon",
        "versionFailed": "Tätä versiota ei voitu lukea.",
        "request": "Pyydä päivitystä",
        "startProject": "Käynnistä projekti",
        "partial": "Tämä tuotekortti näytetään puutteellisena: se viittaa vähintään yhteen tietoon, jota tilinne ei ehkä voi lukea. Kyseiset kentät puuttuvat näytöltä — mikä ei tarkoita, että ne olisivat tyhjiä. Pyydä käyttöoikeutta beCPG-yhteyshenkilöltäsi, jos tarvitset jotakin niistä."
    },
    "app/products/page#LABELS": {
        "title": "Omat tuotteet",
        "search": "Hae tuotetta",
        "allStates": "Kaikki tilat",
        "allTypes": "Kaikki tyypit",
        "branch": "Päivitys",
        "branchFrom": "Version {version} päivitys",
        "columns": {
            "name": "Tuote",
            "code": "Koodi",
            "type": "Tyyppi",
            "state": "Tila",
            "completion": "Valmiusaste",
            "project": "Projekti",
            "supplierRef": "Toimittajan viite",
            "certificateDate": "Sertifikaatin päivämäärä",
            "modified": "Päivitetty",
            "actions": "Toiminnot"
        },
        "stats": {
            "total": "Tuotteet",
            "valid": "Hyväksytyt",
            "pending": "Käynnissä",
            "completion": "Keskimääräinen valmiusaste"
        },
        "empty": "Ei tuotteita",
        "emptyHint": "Teihin ei ole vielä liitetty yhtään tuotetta. Tuotekortti näkyy täällä heti, kun asiakas osoittaa sen teille.",
        "request": "Pyydä päivitystä"
    },
    "app/specs/page#LABELS": {
        "title": "Vaatimusmäärittelyt",
        "stats": {
            "specs": "Vaatimusmäärittelyt",
            "products": "Katetut tuotteet"
        },
        "emptyHint": "Teille ei ole saatavilla vaatimusmäärittelyjä. Asiakas jakaa sellaisen, jos jokin koskee teitä."
    },
    "app/tasks/[id]/page#LABELS": {
        "loading": "Tehtävä",
        "notFound": "Tehtävää ei löytynyt",
        "notFoundHint": "Tätä tehtävää ei enää ole, se on jo käsitelty tai se ei kuulu rajaukseenne.",
        "back": "Omat tehtävät",
        "noEntity": "Tämä tehtävä ei viittaa mihinkään tuotekorttiin",
        "noEntityHint": "Tähän tehtävään liitetty tuotos ei viittaa mihinkään tuotteeseen. Ota yhteyttä asiakkaaseen projektin keskustelun kautta.",
        "documents": "Toimitettavat asiakirjat",
        "viewDocument": "Näytä asiakirja",
        "due": "Määräaika: {date}",
        "late": "Myöhässä",
        "done": "Valmis",
        "discussion": "Keskustelu"
    },
    "app/tasks/page#LOCAL": {
        "title": "Omat tehtävät",
        "search": "Hae tehtävää, tuotetta, koodia…",
        "anyType": "Kaikki tyypit",
        "anyPriority": "Kaikki prioriteetit",
        "anyProduct": "Kaikki tuotteet",
        "anyDue": "Kaikki määräajat",
        "dueLate": "Myöhässä",
        "dueToday": "Tänään",
        "dueWeek": "7 päivän sisällä",
        "dueMonth": "30 päivän sisällä",
        "dueNone": "Ei määräaikaa",
        "stateOpen": "Käynnissä",
        "stateDone": "Valmis",
        "colTask": "Tehtävä",
        "colProduct": "Tuote / asiakas",
        "colType": "Tyyppi",
        "colPriority": "Prioriteetti",
        "colDue": "Määräaika",
        "colProgress": "Eteneminen",
        "kpiTotal": "Tehtävät",
        "kpiLate": "Myöhässä",
        "kpiReview": "Tarkistettavana",
        "kpiNext": "Seuraava määräaika",
        "kpiNone": "Ei mitään",
        "reset": "Tyhjennä",
        "empty": "Ei tehtäviä",
        "emptyHint": "Teiltä ei odoteta tällä hetkellä mitään.",
        "emptyFiltered": "Yksikään tehtävä ei vastaa näitä suodattimia.",
        "truncated": "Vain ensimmäiset tehtävät näytetään. Rajaa suodattimia nähdäksesi loput.",
        "scoped": "Rajaus: {supplier}.",
        "scopedAll": "Rajaus: kaikki toimittajat.",
        "orphans": "Tehtäviä, joita ei ole liitetty mihinkään toimittajatietoihinne eikä siksi näytetä tässä: {count}. Valitse oikeasta yläkulmasta ”Kaikki toimittajat” nähdäksesi ne.",
        "priorityHigh": "Korkea",
        "priorityMedium": "Keskitaso",
        "priorityLow": "Matala",
        "noPriority": "Ei prioriteettia",
        "untitled": "Nimetön tehtävä",
        "caption": "Tehtäväluetteloni"
    },
    "components/dashboard/DashboardCharts#LOCAL": {
        "schedule": "Määräaikani",
        "scheduleAria": "Erääntyvät tehtävät ja vanhenevat asiakirjat viikoittain",
        "tasks": "Erääntyvät tehtävät",
        "documents": "Vanhenevat asiakirjat",
        "overdue": "Myöhässä",
        "thisWeek": "Tällä viikolla",
        "later": "Myöhemmin",
        "undated": "{count} tehtävää ilman määräpäivää",
        "catalogs": "Täydellisyys katalogeittain",
        "catalogsAria": "Vähiten täydellisen tuotteen täydellisyyspisteet katalogeittain",
        "catalogsHint": "Kunkin katalogin vähiten täydellisen tuotteen pisteet."
    },
    "components/dashboard/DashboardKpis#LOCAL": {
        "approval": "Hyväksynnän tila",
        "approvalUnknown": "Ei saatavilla",
        "approvalSuppliers": "{count} toimittajaa",
        "approvalPickSupplier": "Valitkaa toimittaja näytön yläosasta nähdäksenne sen tilan.",
        "validUntil": "Voimassa asti: {date}",
        "noValidity": "Ei tiedossa olevaa määräaikaa",
        "allGood": "Ei estäviä tekijöitä",
        "completion": "Täydellisyys",
        "completionScope": "Pisteytetty {scored}/{total} tuotetta",
        "completionNone": "Ei pisteytettyjä tuotteita",
        "tasks": "Avoimet tehtävät",
        "late": "Myöhässä",
        "onTime": "Aikataulussa",
        "nextDue": "Seuraava määräpäivä {date}",
        "noTask": "Ei tehtävää tällä hetkellä",
        "documents": "Käsiteltävät asiakirjat",
        "documentsOf": "/ {total}",
        "documentsUnavailable": "Asiakirjaseuranta ei ole saatavilla",
        "valid": "Voimassa",
        "expiring": "Vanhenee pian",
        "refused": "Hylätty",
        "expired": "Vanhentunut",
        "missing": "Puuttuu",
        "more": "+{count}"
    },
    "components/dashboard/taskTypes#TASK_TYPE_META.wizard": "Ohjattu toiminto",
    "components/dashboard/taskTypes#TASK_TYPE_META.signature": "Allekirjoitus",
    "components/dashboard/taskTypes#TASK_TYPE_META.document": "Asiakirja",
    "components/dashboard/taskTypes#TASK_TYPE_META.review": "Tarkistus",
    "components/dashboard/taskTypes#TASK_TYPE_META.workflow": "Työnkulku",
    "components/dashboard/DashboardKpis#REASONS": {
        "documentExpired": "Pakollinen asiakirja vanhentunut",
        "documentExpiring": "Asiakirja vanhenemassa",
        "documentMissing": "Odotettua asiakirjaa ei ole toimitettu",
        "documentRefused": "Asiakirja hylätty",
        "catalogIncomplete": "Puutteelliset tiedot",
        "openProject": "Avoin listausprojekti",
        "openNonConformity": "Avoin poikkeama"
    },
    "components/dashboard/DashboardTabs#LOCAL": {
        "label": "Oma koontinäyttö",
        "todo": "Tehtävää",
        "followUp": "Seuranta"
    },
    "components/dashboard/DiscussionList#LOCAL": {
        "title": "Omat keskustelut",
        "empty": "Ei keskusteluja",
        "emptyHint": "Asiakkaan huomautukset tehtävistänne ja tuotteistanne näkyvät täällä.",
        "all": "Näytä kaikki",
        "messages": "Viestejä: {count}",
        "anonymous": "Käyttäjä",
        "onField": "kenttä: {field}",
        "unread": "Uusi",
        "unreadCount": "Lukemattomia: {count}"
    },
    "components/dashboard/DocumentList#LOCAL": {
        "title": "Omat asiakirjat",
        "empty": "Ei odotettuja asiakirjoja",
        "emptyHint": "Asiakkaan vaatimat sertifikaatit näkyvät täällä.",
        "all": "Näytä kaikki",
        "supplierScope": "Toimittaja",
        "mandatory": "Pakollinen",
        "until": "Voimassa asti: {date}",
        "expiredSince": "Vanhentunut {days} pv sitten",
        "expiresIn": "Vanhenee {days} pv:n kuluttua",
        "noValidity": "Ei päättymispäivää",
        "upload": "Lataa uusi versio",
        "uploadFirst": "Lataa asiakirja",
        "download": "Lataa",
        "view": "Näytä",
        "uploading": "Ladataan…",
        "uploaded": "Asiakirja ladattu. Se odottaa nyt asiakkaan hyväksyntää."
    },
    "components/dashboard/NonConformityCard#LOCAL": {
        "title": "Avoimet poikkeamat",
        "hint": "Asiakkaanne kirjaamia; asiakas ottaa teihin yhteyttä niiden käsittelystä.",
        "declared": "Ilmoitettu {date}",
        "priority": "Prioriteetti {level}"
    },
    "components/dashboard/NotificationList#NOTIFICATION_LABELS": {
        "title": "Omat ilmoitukset",
        "empty": "Ei ilmoituksia",
        "emptyHint": "Mikään ei vaadi huomiotanne tällä hetkellä.",
        "overdue": "{days} pv myöhässä",
        "expiresIn": "{days} pv:n kuluttua",
        "types": {
            "task.overdue": "Myöhässä oleva tehtävä",
            "document.expired": "Vanhentunut asiakirja",
            "document.expiring": "Uusittava asiakirja",
            "document.missing": "Puuttuva asiakirja",
            "document.refused": "Hylätty asiakirja"
        },
        "assigned": "Osoitettu minulle",
        "mandatory": "Pakollinen",
        "isNew": "Uusi",
        "scopeEmpty": {
            "noSupplierIdentity": "Tiliänne ei ole liitetty yhteenkään toimittajaan, joten asiakirjojanne ei voida tunnistaa. Vain tehtävänne näytetään. Ilmoita asiasta yhteyshenkilöllesi asiakkaan puolella.",
            "internalAccount": "Sisäinen tili: asiakirjahälytykset kohdistuvat toimittajaan, jolta asiakirja odotetaan, joten ilmoituksissanne näkyvät vain tehtävänne. Koko toimittajajoukon näkymä löytyy kohdasta Asiakirjojen vaatimustenmukaisuus.",
            "fallback": "Tilinne rajaus on tyhjä: joitakin hälytyksiä ei voida laskea."
        },
        "countTitle": "Odottaa: {total} · alla {shown} kiireellisintä"
    },
    "components/dashboard/ProductList#LOCAL": {
        "title": "Omat tuotteet",
        "empty": "Ei tuotteita",
        "emptyHint": "Asiakkaanne teille osoittamat tuotteet näkyvät tässä.",
        "all": "Näytä kaikki",
        "updatedOn": "Päivitetty: {date}",
        "request": "Pyydä päivitystä",
        "noCompletion": "Ei arvioitu",
        "completion": "Täydellisyys"
    },
    "components/dashboard/ProductList#STATE_LABELS": {
        "Valid": "Hyväksytty",
        "ToValidate": "Odottaa hyväksyntää",
        "Refused": "Korjattava",
        "Simulation": "Simulointi",
        "Stopped": "Pysäytetty",
        "Archived": "Arkistoitu"
    },
    "components/dashboard/TaskList#LOCAL": {
        "title": "Omat tehtävät",
        "empty": "Ei käynnissä olevia tehtäviä",
        "emptyHint": "Kaikki on ajan tasalla. Asiakkaiden uudet pyynnöt näkyvät tässä.",
        "all": "Näytä kaikki",
        "overdue": "Myöhässä: {days} pv",
        "overdueToday": "Erääntyy tänään",
        "dueIn": "Aikaa: {days} pv",
        "noDue": "Ei määräaikaa",
        "priorityHigh": "Korkea",
        "priorityMedium": "Keskitaso",
        "priorityLow": "Matala",
        "progress": "Edistyminen",
        "untitled": "Nimetön tehtävä"
    },
    "components/datalist/RowFormModal#LABELS": {
        "title": "Muokkaa riviä",
        "create": "Uusi rivi",
        "save": "Tallenna",
        "cancel": "Peruuta",
        "refused": "Riviä ei tallennettu. Tarkistakaa pakolliset kentät ja yrittäkää uudelleen."
    },
    "components/datalist/renderers/signals#RENDERER_LABELS": {
        "formulated": "Formuloitu arvo",
        "requirementBroken": "Vaatimus ei täyty",
        "claimDescription": "Väitteen kuvaus",
        "nutrientDetails": "Ravintoaineen tiedot ({country})",
        "roundedFor": "Säädösten mukaan pyöristetty arvo: {country}",
        "valueLine": "Arvo: {value}",
        "toleranceMin": "Vähimmäistoleranssi: {value}",
        "toleranceMax": "Enimmäistoleranssi: {value}",
        "minimum": "Vähimmäisarvo: {value}",
        "maximum": "Enimmäisarvo: {value}",
        "gda": "% RI: {value}",
        "perServing": "Arvo annosta kohden: {value}",
        "missingSources": "{count} lähdettä ilman tätä väitettä",
        "missingSourcesList": "Lähteet ilman tätä väitettä:",
        "omitted": "Ainesosa jätetty pois ilmoituksesta",
        "packagingLevel": {
            "Primary": "Ensisijainen",
            "Inner": "Välipakkaus",
            "Secondary": "Toissijainen",
            "Tertiary": "Kolmas taso"
        }
    },
    "components/datalist/useDataList#DATALIST_LABELS": {
        "rows": "Rivejä: {count}",
        "addRow": "Lisää rivi",
        "deleteRow": "Poista rivi",
        "editRow": "Muokkaa riviä",
        "moveUp": "Siirrä ylös",
        "moveDown": "Siirrä alas",
        "actions": "Toiminnot",
        "order": "Järjestys",
        "row": "Rivi {index}",
        "newRow": "Uusi rivi",
        "totalRow": "Summarivi, beCPG laskee",
        "incomplete": "Täyttäkää pakolliset kentät tallentaaksenne tämän rivin",
        "sortBy": "Lajittele: {column}",
        "saving": "Tallennetaan…",
        "saved": "Tallennettu",
        "discard": "Hylkää muutokset",
        "failed": "Tallennus epäonnistui",
        "retry": "Yritä uudelleen",
        "deleting": "Poistetaan…",
        "search": "Hae luettelosta",
        "readOnly": "Vain luku",
        "frozenTitle": "Asiakkaanne hyväksymä luettelo",
        "frozenText": "Asiakkaanne on hyväksynyt tämän luettelon: se on nyt lukittu eikä sitä voi enää muokata. Jos korjaus tarvitaan, pyytäkää luettelon avaamista uudelleen projektin keskustelussa.",
        "readAccessTitle": "Vain katselu",
        "readAccessText": "Teillä on tähän kohteeseen vain lukuoikeus.",
        "noTaskTitle": "Ei avointa tehtävää",
        "noTaskText": "Muokkaus on mahdollista vain, kun teille on osoitettu tehtävä. Luettelo pysyy näkyvissä.",
        "wizardReadOnlyTitle": "Vain luku -tilassa oleva ohjattu toiminto",
        "wizardReadOnlyText": "Tämä ohjattu toiminto on määritetty vain katseluun: muutoksia ei voi tehdä.",
        "protectedTitle": "Suojattu kenttä",
        "protectedText": "Sarake \"{column}\" on suojattu: sen arvoa käytetään asiakkaanne vaatimustenmukaisuustarkistuksissa. Vahvistakaa, että haluatte muuttaa sitä.",
        "protectedUnlock": "Muuta silti",
        "protectedLocked": "Suojattu kenttä — avaa lukitus napsauttamalla",
        "deleteTitle": "Poistetaanko tämä rivi?",
        "deleteText": "Rivi poistetaan luettelosta pysyvästi.",
        "expand": "Näytä tiedot",
        "collapse": "Piilota tiedot",
        "nestedEmpty": "Ei kohteita",
        "empty": "Tämä luettelo on tyhjä",
        "emptyHint": "Aloittakaa lisäämällä ensimmäinen rivi.",
        "emptyReadOnly": "Asiakkaanne ei odota tähän luetteloon rivejä.",
        "mandatory": "Pakollinen kenttä",
        "detail": "Tiedot",
        "duplicate": "Monista tämä rivi",
        "select": "Valitse",
        "selectRow": "Valitse rivi {index}",
        "selectAll": "Valitse kaikki tämän sivun rivit",
        "selected": "Valittuja rivejä: {count}",
        "clearSelection": "Tyhjennä valinta",
        "bulkMoveUp": "Ylös",
        "bulkMoveUpLong": "Siirrä valinta ylös",
        "bulkMoveDown": "Alas",
        "bulkMoveDownLong": "Siirrä valinta alas",
        "bulkDuplicate": "Monista",
        "bulkDuplicateLong": "Monista valinta",
        "bulkDelete": "Poista",
        "bulkDeleteLong": "Poista valinta",
        "accessDenied": "Pääsy evätty",
        "accessDeniedRow": "Tällä rivillä on ominaisuus, jota tilinne ei saa lukea: riviä ei voi muokata täällä.",
        "bulkEdit": "Muokkaa",
        "bulkEditLong": "Muokkaa valintaa",
        "bulkEditTitle": "Muokattavia rivejä: {count}",
        "bulkEditPickFields": "Täytettävät kentät",
        "bulkEditSearchField": "Hae kenttää",
        "bulkEditApply": "Käytä riveihin ({count})",
        "bulkEditCancel": "Peruuta",
        "bulkEditEmptyClears": "Valittu mutta tyhjäksi jätetty kenttä tyhjentää arvon kaikilta riveiltä.",
        "bulkEditSkipped": "Valittuja rivejä, joita ei voi muokata ja jotka jätetään ennalleen: {count}.",
        "bulkEditTooMany": "Valittuja rivejä: {count}, enimmäismäärä on {max}. Rajatkaa valintaa.",
        "bulkEditNoColumn": "Tämän luettelon mitään saraketta ei voi täyttää sarjana.",
        "deleteSelectedTitle": "Poistetaanko rivit ({count})?",
        "deleteSelectedText": "Nämä rivit poistetaan luettelosta pysyvästi.",
        "rowsPerPage": "Rivejä sivulla",
        "shortcuts": "Pikanäppäimet",
        "shortcutsTitle": "Syöttäminen näppäimistöllä",
        "shortcutList": [
            [
                "Tab / Shift+Tab",
                "seuraava / edellinen solu"
            ],
            [
                "Enter",
                "tallentaa rivin ja siirtyy alas samassa sarakkeessa"
            ],
            [
                "Enter viimeisellä rivillä",
                "lisää rivin"
            ],
            [
                "↑ / ↓",
                "sama sarake, rivi ylempänä / alempana"
            ],
            [
                "Esc",
                "hylkää muokattavan rivin muutokset"
            ],
            [
                "Ctrl+Enter",
                "lisää rivin"
            ],
            [
                "Ctrl+D",
                "monistaa nykyisen rivin"
            ],
            [
                "Ctrl+V",
                "liittää solualueen taulukkolaskentaohjelmasta"
            ]
        ],
        "pasteTitle": "Liitetty taulukkolaskentaohjelmasta",
        "pasteApplied": "Liitettyjä arvoja: {cells}, rivejä: {rows}, joista uusia: {created}.",
        "pasteNothing": "Mitään ei voitu liittää.",
        "pasteUndo": "Kumoa liittäminen",
        "pasteSave": "Tallenna rivit ({count})",
        "pasteResolving": "Haetaan nimikkeitä…",
        "pasteUnmatched": "Hylättyjä arvoja: {count} — korjatkaa ne käsin:",
        "pasteExtraColumns": "Luettelon viimeisen sarakkeen jälkeen liitettyjä sarakkeita: {count}. Ne ohitettiin.",
        "pasteRefusedRows": "Luettelon lopun jälkeisiä rivejä: {count}. Tähän luetteloon ei voi lisätä uusia rivejä.",
        "pasteLine": "rivi {line}",
        "pasteReasons": {
            "number": "odotettiin numeroa",
            "integer": "odotettiin kokonaislukua",
            "boolean": "odotettiin kyllä / ei",
            "date": "odotettiin päivämäärää (pp/kk/vvvv)",
            "list": "arvo ei ole tarjotussa luettelossa",
            "readonly": "saraketta ei voi muuttaa",
            "association": "viitetiedoista ei löytynyt tarkkaa vastinetta"
        }
    },
    "components/documents/AiVerdictContest#LABELS": {
        "advisory": "Vain tekoälyn neuvo: se ei estä valmiiksi saattamista, asiakkaanne päättää.",
        "contest": "Kiistä analyysi",
        "contestFor": "Kiistä tekoälyn analyysi asiakirjasta \"{document}\"",
        "reasonLabel": "Miksi analyysi ei koske tätä asiakirjaa",
        "reasonPlaceholder": "Esim. Halal-sertifikaatissa ei ole ainesosaluetteloa eikä nettopainoa.",
        "send": "Lähetä asiakkaalleni",
        "cancel": "Peruuta",
        "sent": "Kiistäminen lähetetty asiakkaallenne",
        "contested": "Kiistetty - odottaa asiakastanne",
        "messageIntro": "Kiistän asiakirjan \"{document}\" automaattisen analyysin.",
        "messageVerdict": "Tekoälyn arvio:",
        "messageReason": "Selitykseni:"
    },
    "components/documents/DepositedDocuments#LABELS": {
        "title": "Toimitetut asiakirjat",
        "subtitle": "Kaikki tämän tuotteen kansiossa olevat tiedostot tyypistä riippumatta.",
        "empty": "Ei toimitettuja tiedostoja",
        "emptyHint": "Tämän tuotteen kansiossa ei ole vielä asiakirjoja.",
        "signed": "Allekirjoitettu",
        "download": "Lataa",
        "consult": "Näytä",
        "modified": "Muokattu: {date}",
        "actionOn": "{action}: {document}"
    },
    "components/documents/DocumentUpload#LABELS": {
        "drop": "Pudota tiedosto tähän",
        "or": "tai",
        "browse": "Selaa",
        "deposit": "Lataa",
        "renew": "Uusi",
        "replace": "Korvaa",
        "uploading": "Ladataan…",
        "analysing": "Analysoidaan asiakirjaa…",
        "done": "Tiedosto ladattu",
        "doneHint": "Asiakas tarkistaa sen. Teiltä ei odoteta muuta.",
        "retry": "Yritä uudelleen",
        "cancel": "Peruuta",
        "tooLarge": "Tiedosto on liian suuri ({size}). Enimmäiskoko: {max}.",
        "badType": "Muotoa ei tueta ({name}). Odotettu: {accept}.",
        "empty": "Tiedosto on tyhjä.",
        "failed": "Lataus epäonnistui.",
        "locked": "Lataus ei käytettävissä",
        "accepted": "Muodot: {accept} — enintään {max}",
        "aiValid": "Tekoälyn tarkistama",
        "aiToValidate": "Tarkistettavana",
        "aiRefused": "Tekoälyn hylkäämä",
        "aiOn": "Analysoitu: {date}",
        "selected": "Valittu tiedosto",
        "validityHint": "Asiakirjaan merkityt voimassaolopäivät.",
        "validityInverted": "Päättymispäivä on ennen alkamispäivää.",
        "validityMissing": "Täyttäkää voimassaolon päättymispäivä ennen tiedoston lataamista.",
        "validityPast": "Voimassaolon päättymispäivä on jo mennyt: asiakirja pysyisi vanhentuneena.",
        "fileInput": "Valitse ladattava tiedosto",
        "validityNotApplied": "Tiedosto on ladattu, mutta sen voimassaolopäiviä ei tallennettu. Täyttäkää ne asiakirjan rivillä."
    },
    "components/documents/DocumentValidity#LABELS": {
        "fromTo": "Voimassa: {from} - {to}",
        "from": "Voimassa alkaen: {from}",
        "to": "Voimassa asti: {to}",
        "none": "Ei voimassaoloaikaa",
        "required": "Voimassaoloaika täytettävä",
        "expired": "Voimassaolo päättyi: {to}",
        "fromLabel": "Voimassa alkaen",
        "toLabel": "Voimassa asti",
        "edit": "Muokkaa",
        "setDates": "Täytä",
        "save": "Tallenna",
        "cancel": "Peruuta",
        "saved": "Voimassaoloaika tallennettu",
        "inverted": "Päättymispäivä on ennen alkamispäivää.",
        "hint": "Lataamaanne asiakirjaan merkityt päivämäärät."
    },
    "components/documents/DocumentViewer#LABELS": {
        "title": "Asiakirja",
        "download": "Lataa",
        "close": "Sulje",
        "unsupported": "Tälle tiedostotyypille ei ole esikatselua",
        "unsupportedHint": "Tätä muotoa ei voi esikatsella selaimessa. Ladatkaa tiedosto lukeaksenne sen.",
        "failed": "Asiakirjaa ei voitu näyttää",
        "failedHint": "Sen voi silti ladata.",
        "signed": "Sähköisesti allekirjoitettu",
        "signedBy": "{name}, {date}",
        "pending": "Allekirjoitus kesken",
        "validated": "Hyväksytty {date}",
        "validatedBy": "Hyväksynyt {name} {date}"
    },
    "components/documents/ExpiryPill#LABELS": {
        "missing": "Toimitettava",
        "refused": "Hylätty",
        "toValidate": "Tarkistettavana",
        "valid": "Voimassa",
        "validUntil": "Voimassa asti: {date}",
        "expiredOn": "Vanhentunut: {date}",
        "expiredSince": "Vanhentunut {days} päivää sitten",
        "expiresToday": "Vanhenee tänään",
        "expiresIn": "Vanhenee: {days} pv",
        "noDate": "Ei voimassaoloaikaa",
        "from": "Alkaen",
        "to": "asti",
        "since": "Alkaen",
        "until": "Asti"
    },
    "components/documents/RequirementChecklist#LABELS": {
        "mandatory": "Pakollinen",
        "satisfied": "Toimitettu",
        "upload": "Lataa",
        "renew": "Uusi",
        "replace": "Korvaa",
        "download": "Lataa",
        "consult": "Näytä",
        "details": "Tiedot",
        "hide": "Piilota",
        "of": "Pakolliset asiakirjat: {done} / {total}",
        "allDone": "Kaikki on ajan tasalla",
        "allDoneHint": "Teiltä ei odoteta tällä hetkellä mitään.",
        "nothing": "Ei asiakirjavaatimuksia",
        "nothingHint": "Asiakas ei ole vielä määrittänyt tälle rajaukselle odotettuja asiakirjoja.",
        "openCount": "Käsiteltäviä: {count}",
        "blockingCount": "Korjattavia pakollisia: {count}",
        "category": "Luokka",
        "readOnly": "Lataukset on suljettu tällä kortilla.",
        "noEntity": "Toimittajan asiakirjat",
        "aiHints": "Analyysihuomiot",
        "deposit": "Lataa tiedosto",
        "file": "Tiedosto",
        "actionOn": "{action}: {document}"
    },
    "components/documents/SignedDocumentList#LABELS": {
        "document": "Allekirjoitettu asiakirja",
        "signedAt": "Allekirjoitettu",
        "download": "Lataa",
        "search": "Hae allekirjoitettua asiakirjaa",
        "empty": "Ei allekirjoitettuja asiakirjoja",
        "emptyHint": "Tehtävissänne allekirjoittamanne asiakirjat näkyvät tässä.",
        "truncated": "Osittainen luettelo: kaikkia allekirjoitettuja asiakirjoja ei voitu lukea."
    },
    "components/form/FieldRenderer#LABELS": {
        "add": "Lisää arvo",
        "remove": "Poista tämä arvo"
    },
    "components/form/FormRenderer#LABELS": {
        "empty": "Ei täytettäviä kenttiä",
        "emptyHint": "Tämän lomakkeen määritys ei palauta yhtään kenttää."
    },
    "components/form/controls/AutocompleteControl#LABELS": {
        "search": "Hae…",
        "hint": "Suodata tietoja kirjoittamalla nimi tai koodi",
        "loading": "Haetaan…",
        "noResult": "Ei tuloksia",
        "clear": "Tyhjennä",
        "remove": "Poista",
        "browse": "Näytä arvot",
        "error": "Haku epäonnistui",
        "errorUnconfigured": "Tälle kentälle ei ole määritetty arvoluetteloa. Ilmoittakaa asiasta asiakkaan yhteyshenkilöllenne.",
        "showing": "Näytetään kohteet 1 - {count} / {total}",
        "favourite": "Suosikki"
    },
    "components/form/controls/BooleanControl#LABELS": {
        "yes": "Kyllä",
        "no": "Ei",
        "empty": "(tyhjä)"
    },
    "components/form/controls/MlTextControl#LABELS": {
        "more": "Muita kieliä: {count}",
        "less": "Piilota muut kielet",
        "required": "asiakkaan vaatima",
        "missing": "Vaadittuja kieliä vielä tyhjänä: {count}"
    },
    "components/form/controls/NumberUnitControl#DURATION_SYMBOLS": {
        "d": "päivää",
        "mo": "kuukautta",
        "y": "vuotta"
    },
    "components/form/controls/NumberUnitControl#LABELS": {
        "unit": "Yksikkö"
    },
    "components/form/controls/ReadOnlyControl#LABELS": {
        "yes": "Kyllä",
        "no": "Ei",
        "empty": "—"
    },
    "components/form/controls/SelectControl#LABELS": {
        "placeholder": "Valitse…",
        "offList": "arvo ei ole luettelossa",
        "empty": "Ei tarjottuja arvoja"
    },
    "components/form/controls/SizeControl#LABELS": {
        "bytes": "tavua"
    },
    "components/form/validation#VALIDATION_MESSAGES": {
        "validation.required": "Tämä kenttä on pakollinen.",
        "validation.number": "Syöttäkää numero.",
        "validation.integer": "Syöttäkää kokonaisluku.",
        "validation.date": "Syöttäkää kelvollinen päivämäärä.",
        "validation.boolean": "Syöttäkää kyllä tai ei.",
        "validation.list": "Valitkaa arvo luettelosta.",
        "validation.regex": "Odotettua muotoa ei noudateta.",
        "validation.min": "Arvon on oltava vähintään {min}.",
        "validation.max": "Arvon on oltava enintään {max}.",
        "validation.range": "Arvon on oltava välillä {min} - {max}.",
        "validation.minLength": "Merkkejä vähintään: {min}.",
        "validation.maxLength": "Merkkejä enintään: {max}."
    },
    "components/monitor/AiDrafts#LABELS": {
        "draft": "Mukauta toimittajakohtaisesti tekoälyllä",
        "drafting": "Laaditaan viestejä…",
        "unavailable": "Tekoälyavustaja ei ole käytettävissä tässä instanssissa.",
        "common": "Palaa yhteiseen viestiin",
        "none": "Tekoäly ei ehdottanut yhtään viestiä.",
        "help": "Yksi viesti toimittajaa kohden, toimittajan kielellä, sen perusteella, mikä toimittajalta on myöhässä tai puuttuu. Lukekaa ja muokatkaa ennen lähettämistä."
    },
    "components/monitor/BulkActionBar#LABELS": {
        "selected": "Valittu toimittaja: {count}",
        "selectedPlural": "Valittuja toimittajia: {count}",
        "clear": "Tyhjennä valinta",
        "overflow": "Vain ensimmäiset {max} käsitellään.",
        "loading": "Ladataan toimintoja…",
        "unavailable": "Profiilillenne ei ole käytettävissä toimintoja.",
        "actions": {
            "remind": "Muistuta",
            "escalate": "Eskaloi",
            "suspend": "Keskeytä"
        },
        "targets": "Asianomaiset toimittajat",
        "report": "Toiminnon tulos",
        "reportOk": "Onnistuneesti käsiteltyjä toimittajia: {count}.",
        "reportKo": "Epäonnistumisia: {count}:",
        "reportSkipped": "Pois jätettyjä toimittajia: {count} (yli rajan {max}).",
        "reportNone": "Yhtään toimittajaa ei käsitelty.",
        "close": "Sulje",
        "errors": {
            "notFound": "Toimittaja on rajauksenne ulkopuolella"
        }
    },
    "components/monitor/CampaignList#LABELS": {
        "columns": {
            "campaign": "Projekti",
            "suppliers": "Toimittajat",
            "response": "Vastausprosentti",
            "age": "Ikä",
            "silence": "Viimeisin muistutus",
            "due": "Määräaika",
            "reminders": "Muistutukset",
            "follow": "Seuranta",
            "manager": "Vastuuhenkilö"
        },
        "days": "{count} pv",
        "since": "Avoinna: {count} pv",
        "lastActivity": "Viimeisin toiminta: {date}",
        "silenceDays": "{count} pv sitten",
        "silenceToday": "Tänään",
        "silenceHint": "beCPG ei pidä muistutuslokia: tämä sarake näyttää projektin viimeisimmän toiminnan (cm:modified), joka on lähin todellisuudessa saatavilla oleva tieto.",
        "noSilence": "Ei päivättyä toimintaa",
        "noAnswer": "Ei vastausta",
        "late": "Myöhässä",
        "onTrack": "Aikataulussa",
        "toRemind": "Muistutettava",
        "toEscalate": "Eskaloitava",
        "lateTasks": "Myöhässä olevia tehtäviä: {late} / {open}",
        "noTasks": "Ei avointa tehtävää",
        "dueIn": "Aikaa: {count} pv",
        "overdue": "Myöhässä: {count} pv",
        "noDue": "Ei määräaikaa",
        "others": "+{count}",
        "empty": "Tällä rajauksella ei ole avoimia projekteja",
        "projectStates": {
            "Planned": "Suunniteltu",
            "InProgress": "Käynnissä",
            "OnHold": "Odottaa",
            "Completed": "Valmis",
            "Cancelled": "Peruttu"
        }
    },
    "components/monitor/DocumentMatrix#LABELS": {
        "supplier": "Toimittaja",
        "types": "Asiakirjatyyppejä: {count}",
        "notApplicable": "Ei koske tätä toimittajaa",
        "mandatory": "Pakollinen",
        "legend": "Selite",
        "expected": "Odotettuja: {count}",
        "selectRow": "Valitse {name}",
        "selectCell": "Valitse {type} ({name})",
        "download": "Lataa",
        "preview": "Näytä",
        "empty": "Tällä rajauksella ei ole toimittajia",
        "emptyHint": "Laajentakaa suodattimia nähdäksenne matriisin.",
        "noColumns": "Tällä rajauksella ei ole muodostettuja asiakirjatyyppejä",
        "noColumnsHint": "beCPG muodostaa odotetut asiakirjat formuloinnin aikana: ilman määritettyjä asiakirjavaatimuksia matriisi on tyhjä.",
        "toggle": "Näytä asiakirjat",
        "summary": "Puuttuvia: {missing} · vanhentuneita: {expired} · uusittavia: {expiring}",
        "completeness": "{value} % kunnossa",
        "status": {
            "missing": "Puuttuu",
            "expired": "Vanhentunut",
            "refused": "Hylätty",
            "expiring": "Uusittava",
            "toValidate": "Tarkistettava",
            "valid": "Voimassa"
        }
    },
    "components/monitor/DocumentScene#LABELS": {
        "relief": "Kohokuva",
        "constellation": "Tähdistö",
        "mode": "Näyttötila",
        "filters": "Näytettävät tilat",
        "statuses": {
            "expired": "Vanhentunut",
            "missing": "Puuttuu",
            "refused": "Hylätty",
            "expiring": "Vanhenemassa pian",
            "toValidate": "Odottaa hyväksyntää",
            "valid": "Voimassa"
        },
        "aria": "Toimittajat ja odotetut asiakirjat kolmiulotteisesti",
        "rotate": "Kierrä vetämällä",
        "zoom": "Zoomaa vierittämällä",
        "pick": "Napsauta toimittajaa toimiaksesi",
        "pickTitle": "Napsauta toimittajaa näkymässä",
        "waiting": "{count} asiakirjaa odottaa",
        "waitingAxis": "Odottaa",
        "family": "Perhe",
        "severity": "Vakavuus",
        "noFamily": "Ei perhettä",
        "openSheet": "Avaa kortti",
        "view": "Näytä",
        "empty": "Tässä rajauksessa ei odoteta asiakirjoja"
    },
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Valid": "Hyväksytty",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Simulation": "Simulointi",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.ToValidate": "Odottaa hyväksyntää",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Refused": "Hylätty",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Archived": "Arkistoitu",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Stopped": "Pysäytetty",
    "components/monitor/MonitorFilters#LABELS": {
        "search": "Hae toimittajaa, koodia tai virallista nimeä…",
        "toggle": "Lisää suodattimia",
        "reset": "Nollaa",
        "close": "Piilota suodattimet",
        "legend": "Toimittajakannan suodattimet",
        "family": "Tuoteryhmä",
        "subFamily": "Alaryhmä",
        "site": "Toimipaikka",
        "subsidiary": "Tytäryhtiö",
        "market": "Markkina",
        "state": "Toimittajan tila",
        "any": "Kaikki",
        "windowScoped": "koskee luettua otosta",
        "windowScopedHelp": "Alfresco ei indeksoi assosiaatioita: tämä suodatin koskee jo luettuja toimittajia, ei koko toimittajakantaa.",
        "unsupported": "ei määritetty",
        "unsupportedHelp": "Mikään beCPG:n vakio-ominaisuus ei kata tätä käsitettä. Ottakaa se käyttöön asiakaspuolella määrittämällä ominaisuus seurannan asetuksiin.",
        "noVocabulary": "Ladatussa rajauksessa ei ole arvoja",
        "active": "Aktiivisia suodattimia: {count}",
        "activePlural": "Aktiivisia suodattimia: {count}",
        "clearOne": "Poista tämä suodatin",
        "anyFamily": "Kaikki tuoteperheet",
        "anySubFamily": "Kaikki alaperheet",
        "anyState": "Kaikki tilat"
    },
    "components/monitor/NonConformityList#LABELS": {
        "columns": {
            "nc": "Poikkeama",
            "suppliers": "Toimittajat",
            "state": "Tila",
            "priority": "Prioriteetti",
            "delay": "Käsittelyaika",
            "actions": "Korjaavat toimenpiteet",
            "cost": "Kustannus"
        },
        "states": {
            "new": "Uusi",
            "analysis": "Analyysi",
            "treatment": "Käsittely",
            "response": "Vastaus",
            "classification": "Luokittelu",
            "closing": "Sulkeminen",
            "closed": "Suljettu"
        },
        "types": {
            "NonConformity": "Poikkeama",
            "Claim": "Reklamaatio"
        },
        "priorities": {
            "1": "Korkea",
            "2": "Keskitaso",
            "3": "Matala"
        },
        "blocking": "Estävä",
        "blockingHint": "Korkea prioriteetti ja yhä avoinna: juuri tämä tekee johdetusta hyväksyntätilasta \"keskeytetty\" (laskettu, ei koskaan tallennettu).",
        "days": "{count} pv",
        "openSince": "Avoinna: {count} pv",
        "overdue": "Käsittelytavoite ylitetty",
        "closedIn": "Käsittelyaika: {count} pv",
        "closedApprox": "beCPG ei tallenna sulkemispäivää: suljetun NC:n käsittelyaika mitataan sen luonnin ja viimeisimmän muokkauksen välillä.",
        "createdOn": "Luotu: {date}",
        "noDelay": "Ei luontipäivää",
        "actionsCount": "{done} / {total}",
        "actionsLate": "Myöhässä: {count}",
        "noActions": "Ei toimenpiteitä",
        "noActionsHint": "Tähän NC:hen ei ole beCPG:ssä linkitetty käsittelytehtävää — toimenpidesuunnitelmaa ei ole vielä avattu.",
        "actionState": {
            "done": "tehty",
            "late": "myöhässä",
            "open": "käynnissä"
        },
        "andMore": "… ja {count} muuta",
        "others": "+{count}",
        "noSupplier": "Ei linkitettyä toimittajaa",
        "empty": "Tällä rajauksella ei ole poikkeamia",
        "open": "Avaa tämä poikkeama"
    },
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.quality.label": "Laatu",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.quality.focus": "Asiakirjojen vaatimustenmukaisuus, poikkeamat, sertifioinnit, auditoinnit",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.purchasing.label": "Osto",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.purchasing.focus": "Hyväksyntätila (estää tilaamisen), pisteet, reagointikyky",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.rnd.label": "T&K",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.rnd.focus": "Teknisten tietojen täydellisyys, luettelot, vaatimusmäärittelyt",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.csr.label": "Yritysvastuu",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.csr.focus": "Sertifioinnit, alkuperät, yritysvastuun kyselylomakkeet",
    "components/monitor/ProfileSwitcher#LABELS": {
        "legend": "Liiketoimintanäkymä",
        "hint": "Sama toimittajakanta, neljä näkökulmaa. Järjestää kortit ja sarakkeet uudelleen."
    },
    "components/monitor/RiskList#RISK_REASONS.documentExpired": "Vanhentuneita asiakirjoja: {count}",
    "components/monitor/RiskList#RISK_REASONS.documentExpiring": "Vanhenemassa olevia asiakirjoja: {count}",
    "components/monitor/RiskList#RISK_REASONS.documentMissing": "Puuttuvia asiakirjoja: {count}",
    "components/monitor/RiskList#RISK_REASONS.blockingNc": "Estäviä NC:itä: {count}",
    "components/monitor/RiskList#RISK_REASONS.openNc": "Avoimia NC:itä: {count}",
    "components/monitor/RiskList#RISK_REASONS.campaignNoAnswer": "Projekteja ilman vastausta: {count}",
    "components/monitor/RiskList#RISK_REASONS.lateTask": "Myöhässä olevia tehtäviä: {count}",
    "components/monitor/RiskList#RISK_REASONS.lowCompletion": "Matala valmiusaste ({score} %)",
    "components/monitor/RiskList#RISK_REASONS.scoreDropping": "Pisteet laskussa",
    "components/monitor/RiskList#RISK_REASONS.openProject": "Käynnissä olevia listausprojekteja: {count}",
    "components/monitor/RiskList#RISK_REASONS.blockingCatalog": "Estävä luettelo ei täyty",
    "components/monitor/RiskList#RISK_LEVELS.critical": "Kriittinen",
    "components/monitor/RiskList#RISK_LEVELS.high": "Korkea",
    "components/monitor/RiskList#RISK_LEVELS.medium": "Keskitaso",
    "components/monitor/RiskList#RISK_LEVELS.low": "Matala",
    "components/monitor/RiskList#LABELS": {
        "title": "Top 10 riskitoimittajat",
        "empty": "Tässä rajauksessa ei ole riskitoimittajia",
        "emptyHint": "Vanhentuneita asiakirjoja, estäviä NC-poikkeamia tai vastaamattomia projekteja ei havaittu.",
        "riskScore": "Riskipisteet {score}",
        "level": "Riskitaso: {level}",
        "lastActivity": "Viimeisin toiminta: {date}",
        "completion": "Valmiusaste {value} %",
        "openSheet": "Avaa kortti",
        "actions": {
            "remind": "Muistuta",
            "escalate": "Eskaloi",
            "suspend": "Keskeytä"
        },
        "dialog": {
            "remindTitle": "Muistuta: {target}",
            "escalateTitle": "Eskaloi: {target}",
            "suspendTitle": "Keskeytä: {target}",
            "messageLabel": "Viesti",
            "messageHelp": "Julkaistaan toimittajan keskusteluketjuun, jota toimittaja lukee portaalissa ja beCPG:ssä.",
            "escalateHelp": "Julkaistaan sisäisesti toimittajan avoimeen projektiin, ei koskaan toimittajan lukemaan ketjuun.",
            "messageLang": "Viestin kieli",
            "supplierLang": "toimittajan kieli",
            "messageRequired": "Viesti on pakollinen.",
            "suspendWarning": "Hyväksynnän tila johdetaan lennossa eikä sitä koskaan tallenneta: tämä toimenpide ei kirjoita tilaa \"keskeytetty\". Se käynnistää asiakkaan keskeytysprosessin. Kun beCPG:ssä on estävä NC, tila vaihtuu itsestään.",
            "suspendIrreversible": "Käynnistettyä prosessia ei voi peruuttaa portaalista. Tarkista valinta.",
            "process": "Käynnistettävä prosessi",
            "noProcess": "Tässä instanssissa ei ole sallittu yhtään keskeytysprosessia (PORTAL_PROCESS_TEMPLATES).",
            "targets": "Kohteena olevat toimittajat: {count}",
            "send": "Lähetä",
            "suspendConfirm": "Käynnistä keskeytys"
        },
        "result": {
            "ok": "Suoritettuja toimenpiteitä: {count}.",
            "partial": "Onnistui: {ok}, epäonnistui: {failed}.",
            "failed": "Yksikään toimenpide ei onnistunut."
        },
        "defaults": {
            "remind": "Hyvä vastaanottaja,\n\nToimittajatietonne on päivitettävä: {reasons}.\nKirjautukaa portaaliin täydentääksenne tiedot.\n\nYstävällisin terveisin",
            "escalate": "Eskalointi: toimittajatiedoissa on edelleen poikkeamia ({reasons}) muistutuksista huolimatta.\nOttakaa asia hoitaaksenne.",
            "genericReasons": "odottavat asiakirjat ja määräajat"
        }
    },
    "components/monitor/StartCampaignDialog#LABELS": {
        "title": "Käynnistä projekti",
        "supplier": "Toimittaja",
        "scope": "Laajuus",
        "scopeSupplier": "Itse toimittajatietue",
        "scopeAll": "Kaikki tämän toimittajan tuotteet",
        "scopeOne": "Yksi tuote",
        "entity": "Tuote",
        "entityPlaceholder": "Valitse tuote…",
        "process": "Projektimalli",
        "processPlaceholder": "Valitse malli…",
        "start": "Käynnistä",
        "cancel": "Peruuta",
        "starting": "Käynnistetään…",
        "noEntity": "Tähän toimittajaan ei ole liitetty tuotteita: ei mitään lähetettävää.",
        "noProcess": "Tässä instanssissa yksikään projektimalli ei ole avoinna portaalille.",
        "countAll": "Lähetettäviä tuotteita: {count}, kullekin oma projekti.",
        "done": "Käynnistettyjä projekteja: {count}",
        "partial": "Käynnistetty: {done}, epäonnistui: {failed}",
        "failedTitle": "Näiden tuotteiden käynnistys epäonnistui",
        "countTruncated": "Tässä voidaan luetella vain {count}/{total} tuotetta: vain ne lähetetään.",
        "suppliersTruncated": "Tarjolla on vain {count}/{total} toimittajaa. Jos toimittajaa ei ole luettelossa, käynnistä projekti toimittajan sivulta.",
        "atLeast": "vähintään {count}",
        "loadFailed": "Luetteloa ei voitu ladata.",
        "retry": "Yritä uudelleen"
    },
    "components/monitor/StartNcDialog#LABELS": {
        "title": "Käynnistä poikkeama",
        "supplier": "Toimittaja",
        "product": "Tuote",
        "productNone": "Ei tiettyä tuotetta",
        "batch": "Erä",
        "priority": "Prioriteetti",
        "priorities": {
            "1": "Korkea (estävä)",
            "2": "Keskitaso",
            "3": "Matala"
        },
        "dueDate": "Määräpäivä",
        "description": "Kuvaus",
        "cancel": "Peruuta",
        "start": "Käynnistä",
        "started": "Poikkeama käynnistetty: beCPG kirjaa sen ja avaa sen analyysin."
    },
    "components/monitor/SupplierPicker#LOCAL": {
        "search": "Hae toimittajaa (nimi, koodi)…",
        "none": "Yksikään toimittaja ei vastaa hakua.",
        "more": "{count} muuta: tarkentakaa hakua.",
        "clear": "Vaihda toimittajaa",
        "loading": "Ladataan toimittajia…"
    },
    "components/monitor/SupplierScorecard#LABELS": {
        "title": "Tuloskortti",
        "subtitle": "Kriteerit, painotukset ja pisteet — määritetty asiakkaan puolella",
        "weighted": "Painotetut pisteet",
        "weightedHint": "Kriteerejä: {count} · kokonaispaino {weight}",
        "criterion": "Kriteeri",
        "weight": "paino {weight}",
        "weightShare": "{share} % kokonaismäärästä",
        "range": "asteikko {range}",
        "noScore": "Ei pisteytetty",
        "scaleNote": "Asteikko on päätelty määrityksistä (tai korkeimmasta havaitusta pistemäärästä): raakapisteet näytetään aina.",
        "unavailable": "Tälle toimittajalle ei ole tuloskorttia",
        "unavailableHint": "Tuloskortit muodostetaan toimittajaprojektien pisteistä. Rajauksestanne ei löytynyt pisteytettyä projektia.",
        "completion": "Luettelon valmiusaste",
        "completionSubtitle": "Toimittajan entiteeteillä aktiiviset luettelot",
        "completionEmpty": "Tällä toimittajalla ei ole aktiivista luetteloa",
        "completionScore": "Keskimääräinen valmiusaste",
        "approval": "Hyväksynnän tila",
        "approvalDerived": "Lasketaan uudelleen jokaisella näyttökerralla",
        "history": "Kehitys",
        "historyUnavailable": "Historia ei ole saatavilla",
        "historyWhy": "beCPG:n päätöksentukimoduuli ei voinut toimittaa historiaa.",
        "historyWhyBy": {
            "supplierAxisUnavailable": "BI-moduuli on käytössä, mutta se ei vielä erottele toimittajia: toimittaja-akseli on lisättävä kuutioon ja skeema ladattava uudelleen.",
            "supplierUnresolved": "Tämä toimittaja ei ole vielä BI-moduulissa: se tulee näkyviin seuraavassa uudelleenmuodostuksessa.",
            "noData": "BI-moduuli tuntee tämän toimittajan, mutta jaksolle ei ole vielä datapisteitä: historia täydentyy tietojen kertyessä.",
            "unknownQuery": "Pyydettyä sarjaa ei ole määritetty portaalissa: kyseessä on määritysvirhe, ei puuttuva data.",
            "unreachable": "beCPG:n päätöksentukimoduuli ei vastaa: se on poistettu käytöstä tässä instanssissa tai sen palvelinta ei tavoiteta.",
            "denied": "Tililläsi ei ole pääsyä beCPG:n päätöksentukimoduuliin."
        },
        "historyNeeds": "Mitä BI-puolella tarvitaan sen käyttöönottoon",
        "dimensions": "Dimensiot",
        "measures": "Mittarit",
        "statusPartial": "osittainen",
        "statusMissing": "luotava",
        "trendLast": "Viimeisin piste: {value} ({date})",
        "trendCaption": "Painotetut pisteet ajan mittaan"
    },
    "components/monitor/SupplierTable#LABELS": {
        "caption": "Toimittajakannan toimittajat, hyväksynnän tila ja johdetut indikaattorit",
        "columns": {
            "name": "Toimittaja",
            "code": "Koodi",
            "status": "Hyväksyntä",
            "risk": "Riski",
            "completion": "Valmiusaste",
            "documentsExpired": "Vanhentuneet as.",
            "documentsExpiring": "Vanhenemassa as.",
            "documentsMissing": "Puuttuvat as.",
            "openNc": "Avoimet NC:t",
            "openProjects": "Projektit",
            "family": "Ryhmä",
            "sites": "Toimipaikat",
            "lastActivity": "Viimeisin toiminta"
        },
        "metrics": {
            "documentsExpired": "Vanhentuneita pakollisia asiakirjoja: {count}",
            "documentsExpiring": "Vanhenemassa olevia asiakirjoja: {count}",
            "documentsMissing": "Toimittamattomia pakollisia asiakirjoja: {count}",
            "openNc": "Avoimia poikkeamia: {count}",
            "openProjects": "Avoimia projekteja: {count}"
        },
        "none": "—",
        "empty": "Tässä rajauksessa ei ole toimittajia",
        "emptyHint": "Laajentakaa suodattimia tai tarkistakaa ostajarajauksenne.",
        "emptyFiltered": "Yksikään toimittaja ei vastaa näitä suodattimia.",
        "compare": "Vertaa",
        "compareTitle": "Verrattavia toimittajia: {count}",
        "compareCapped": "Vertailu rajoitettu {max} ensimmäiseen valittuun toimittajaan — sitä useammilla sarakkeet eivät enää ole luettavia.",
        "compareRows": {
            "status": "Hyväksynnän tila",
            "reasons": "Syyt",
            "risk": "Riskipisteet",
            "completion": "Valmiusaste (luettelot)",
            "documentsExpired": "Vanhentuneet asiakirjat",
            "documentsExpiring": "Vanhenemassa olevat asiakirjat",
            "documentsMissing": "Puuttuvat asiakirjat",
            "openNc": "Avoimet NC:t",
            "openProjects": "Avoimet projektit",
            "state": "Tila beCPG:ssä",
            "family": "Ryhmä",
            "sites": "Toimipaikat",
            "lastActivity": "Viimeisin toiminta"
        },
        "openSheet": "Avaa kortti",
        "selected": "Valittu: {count}",
        "clear": "Tyhjennä valinta",
        "close": "Sulje",
        "noReason": "Ei riskisyytä"
    },
    "components/monitor/WorkflowTasks#LABELS": {
        "title": "Käynnissä olevat tehtävät",
        "none": "Ei käynnissä olevia tehtäviä",
        "pooled": "Otettavissa",
        "unassigned": "Ei osoitettu",
        "due": "Määräpäivä",
        "open": "Avaa",
        "history": "Historia ({count})",
        "hideHistory": "Piilota historia",
        "doneBy": "tekijä {who}"
    },
    "components/monitor/cockpit/AssistantTab#LABELS": {
        "priorities": "Viikon prioriteetit",
        "prioritiesHelp": "Laskettu säännöillä riskialtteimmille toimittajille: kriittinen riski ja estävä poikkeama, eskaloitava; vanhentunut dokumentti, vähintään viisi puuttuvaa dokumenttia tai vastaamaton projekti, muistutettava.",
        "kinds": {
            "escalate": "Eskaloitava",
            "remind": "Muistutettava"
        },
        "score": "Riski {score}",
        "openSheet": "Avaa kortti",
        "none": "Ei prioriteetteja tällä viikolla tässä rajauksessa.",
        "copilot": "Copilot",
        "wire": "Kytkettävä beCPG:hen",
        "copilotSoon": "Copilot vastaa toimittajajoukkoasi koskeviin kysymyksiin, kun se on kytketty beCPG-avustajaan.",
        "ask": "Kysy toimittajajoukostasi…",
        "askLabel": "Kysymys copilotille"
    },
    "components/monitor/cockpit/CsrTab#LABELS": {
        "expected": "Odotetut sertifikaatit",
        "expectedHelp": "Dokumenttityypit, joiden nimessä on ”sertifikaatti”, yksi kutakin asianomaista toimittajaa kohden.",
        "valid": "Voimassa olevat sertifikaatit",
        "outOf": "/ {total}",
        "origins": "Ilmoitetut alkuperät",
        "surveys": "Vastuullisuuskyselyt",
        "notWired": "beCPG ei vielä välitä tätä tietoa portaaliin.",
        "byType": "Vaatimustenmukaisuus dokumenttityypeittäin",
        "byTypeAria": "Dokumenttien tila tyypeittäin",
        "byTypeHelp": "Kullekin dokumenttityypille yksi tila asianomaista toimittajaa kohden: sen dokumenttien epäedullisin.",
        "map": "Hankintojen alkuperä",
        "mapEmpty": "Kartta alkuperämaista ja toimittajien toimipaikoista.",
        "csv": {
            "type": "Dokumenttityyppi",
            "expected": "Odotetut"
        }
    },
    "components/monitor/cockpit/PurchasingTab#LABELS": {
        "approved": "Hyväksytyt toimittajat",
        "outOf": "/ {total}",
        "openProjects": "Avoimet projektit",
        "answered": "Vastatut",
        "unanswered": "Vastaamattomat",
        "openProjectsHelp": "Koko instanssin avoimet toimittajaprojektit: projekti ei sijaitse toimittajan alla, joten toimittajajoukon suodattimet eivät koske sitä.",
        "responseRate": "Vastausaste",
        "meanCompletion": "Keskimääräinen edistyminen {value} %",
        "lateTasks": "Myöhässä olevat tehtävät",
        "lateProjects": "{count} myöhässä olevaa projektia",
        "composition": "Toimittajajoukon rakenne",
        "compositionAria": "Toimittajat perheittäin, alaperheittäin ja hyväksyntätilan mukaan",
        "compositionHelp": "Sisärengas: perheet. Keskirengas: alaperheet. Ulkorengas: hyväksyntätila. Laajenna perhe napsauttamalla sitä.",
        "reactivity": "Toimittajien reagointikyky",
        "reactivityAria": "Tehtävät vuosittain ja keskimääräinen vastausaika",
        "reactivityHelp": "Pylväät: toimittajaprojektien tehtävät päättymisvuoden mukaan (logaritminen asteikko). Viiva: keskimääräinen vastausaika päivinä.",
        "tasks": "Tehtävät",
        "delay": "Keskim. vastausaika (pv)",
        "days": "Päivät",
        "taskStates": "Toimittajaprojektien tehtävät",
        "taskStatesAria": "Tehtävät tilan mukaan",
        "taskStatesHelp": "Kaikki päätöstukimoduulista luetut toimittajaprojektien tehtävät tilan mukaan (logaritminen asteikko)."
    },
    "components/monitor/cockpit/QualityTab#LABELS": {
        "health": "Toimittajajoukon kunto",
        "healthAria": "Kuntoindeksi {value}/100",
        "healthOutOf": "/ 100",
        "healthHelp": "Indeksi 100:sta: 35 % hyväksyntäaste, 35 % dokumenttien vaatimustenmukaisuus, 20 % projektien vastausaste, 10 % toimittajat ilman estävää poikkeamaa.",
        "healthPartial": "Osittainen laskenta, painot jaettu uudelleen: {missing} ei saatavilla.",
        "weights": {
            "approval": "Hyväksyntä {weight} %",
            "compliance": "Vaatimustenmukaisuus {weight} %",
            "response": "Vastaus {weight} %",
            "noBlockingNc": "Ei estävää poikkeamaa {weight} %"
        },
        "inputs": {
            "approval": "hyväksyntäaste",
            "compliance": "dokumenttien vaatimustenmukaisuus",
            "response": "vastausaste",
            "noBlockingNc": "osuus ilman estävää poikkeamaa"
        },
        "compliance": "Dokumenttien vaatimustenmukaisuus",
        "compliant": "Vaatimustenmukaiset",
        "complianceHelp": "Voimassa olevat pakolliset dokumentit suhteessa rajauksen odotettuihin pakollisiin dokumentteihin.",
        "complianceNoRate": "Aste ei saatavilla: laskuri saavutti beCPG:n lukurajan.",
        "openNc": "Avoimet poikkeamat",
        "suspended": "Keskeytetyt toimittajat",
        "outOf": "/ {total}",
        "toReview": "Tarkistettavat dokumentit",
        "toReviewHelp": "Hyväksyttävät ja vanhentuneet dokumentit, yksi toimittajaa ja dokumenttityyppiä kohden.",
        "riskMap": "Riskikartta",
        "riskMapAria": "Toimittajat riskipisteiden ja avoimien projektien mukaan",
        "riskMapHelp": "Vaaka-akseli: avoimet projektit. Pystyakseli: riskipisteet. Koko: poikkeamat (puuttuvat ja vanhentuneet dokumentit, estävät poikkeamat). Avaa toimittajan kortti napsauttamalla sitä.",
        "openProjects": "Avoimet projektit",
        "riskScore": "Riskipisteet",
        "anomalies": "Koko: poikkeamat",
        "priorities": "Ensisijainen alue",
        "bubble": "Riski {score} · {projects} avointa projektia · {anomalies} poikkeamaa",
        "ncAge": "Avoimien poikkeamien ikä",
        "ncAgeAria": "Avoimet poikkeamat iän mukaan",
        "ncUndated": "{count} poikkeamaa ilman luontipäivää",
        "csv": {
            "rank": "Sija",
            "supplier": "Toimittaja",
            "code": "Koodi",
            "status": "Hyväksyntä",
            "level": "Riskitaso",
            "score": "Riskipisteet",
            "reasons": "Syyt",
            "openProjects": "Avoimet projektit",
            "anomalies": "Poikkeamat"
        }
    },
    "components/monitor/cockpit/RndTab#LABELS": {
        "progress": "Keskimääräinen edistyminen {year}",
        "progressNoYear": "Keskimääräinen edistyminen",
        "projects": "{count} projektia",
        "tasksInProgress": "Käynnissä olevat tehtävät",
        "tasksPlanned": "{count} suunniteltua",
        "technicalSheets": "Puuttuvat tekniset tuotekortit",
        "technicalSheetsHint": "{toValidate} hyväksyttävänä · {expired} vanhentunutta",
        "technicalSheetsHelp": "Dokumenttityypit, joiden nimessä on ”tekninen tuotekortti”, yksi kutakin asianomaista toimittajaa kohden.",
        "activeFiles": "Aktiiviset kansiot",
        "activeSince": "Viimeisin toiminta {date} alkaen",
        "activeHelp": "Edellisen vuosineljänneksen alusta lähtien muokatut toimittajat.",
        "projectProgress": "Projektien edistyminen",
        "projectProgressAria": "Projektien määrä ja keskimääräinen edistyminen vuosittain",
        "projectProgressHelp": "Pylväät: projektit viimeisimmän muokkausvuoden mukaan. Viiva: keskimääräinen edistyminen %.",
        "projectsSeries": "Projektit",
        "averageSeries": "Keskim. edistyminen (%)",
        "landscape": "Toimittajamaisema",
        "landscapeAria": "Toimittajat perheittäin ja hyväksyntätilan mukaan",
        "landscapeHelp": "Toimittajat perheittäin ja hyväksyntätilan mukaan. 3D-näkymä, jos selain sallii, muuten ryhmitellyt pylväät.",
        "freshness": "Kansioiden ajantasaisuus",
        "freshnessAria": "Toimittajat viimeisimmän toimintakuukauden mukaan",
        "recent": "Aktiivisia {date} alkaen",
        "older": "Vanhemmat",
        "undated": "{count} toimittajaa ilman toimintapäivää",
        "fromCube": "Luettu beCPG:n päätöstukimoduulista, joka päivitetään eräajona."
    },
    "components/monitor/cockpit/parts#LABELS": {
        "export": "Vie",
        "soon": "Kytkettävä",
        "decisionModule": "Päätöstukimoduuli",
        "chartFailed": "Kaaviota ei voitu ladata.",
        "window": "Hakuikkuna: luvut koskevat luettuja toimittajia.",
        "unavailable": "Tietoja ei saatavilla",
        "empty": "Ei näytettävää",
        "reasons": {
            "denied": "beCPG esti pääsyn tähän tietoon.",
            "notFound": "Tietoa ei löytynyt beCPG:stä.",
            "unavailable": "beCPG ei vastannut tämän lohkon osalta. Yritä hetken kuluttua uudelleen.",
            "noMatchingDocumentType": "Ei vastaavaa dokumenttityyppiä tässä rajauksessa.",
            "noData": "Ei tietoja tälle rajaukselle."
        }
    },
    "components/monitor/cockpit/vocabulary#VOCABULARY": {
        "approval": {
            "approved": "Hyväksytyt",
            "inProgress": "Käynnissä",
            "toRenew": "Uusittava",
            "suspended": "Keskeytetyt"
        },
        "documents": {
            "valid": "Voimassa",
            "expiring": "Vanhenee pian",
            "toValidate": "Hyväksyttävänä",
            "expired": "Vanhentuneet",
            "refused": "Hylätyt",
            "missing": "Puuttuvat"
        },
        "taskStates": {
            "planned": "Suunnitellut",
            "inProgress": "Käynnissä",
            "completed": "Valmiit",
            "cancelled": "Peruutetut",
            "refused": "Hylätyt",
            "onHold": "Odottaa"
        },
        "ncAges": {
            "under3Months": "< 3 kk",
            "from3To12Months": "3-12 kk",
            "from1To2Years": "1-2 v",
            "over2Years": "> 2 v"
        },
        "nc": {
            "blocking": "Estävät",
            "nonBlocking": "Ei-estävät"
        },
        "noFamily": "Ei perhettä",
        "noSubFamily": "Ei alaperhettä"
    },
    "components/monitor/supplier/ActivityChart#LABELS": {
        "tasks": "Tehtävät",
        "delay": "Keskimääräinen vastausaika (pv)",
        "days": "pv",
        "aria": "Tämän toimittajan tehtävät ja keskimääräinen vastausaika vuosittain"
    },
    "components/monitor/supplier/RiskScore#LABELS": {
        "ring": "Riskipistemäärä {score}/100, taso {level}",
        "none": "Ei riskin syitä",
        "scale": "Tasoasteikko",
        "contributions": "Mistä pistemäärä muodostuu",
        "points": "+{points}"
    },
    "components/monitor/supplier/SheetLists#LABELS": {
        "documents": {
            "search": "Hae asiakirjaa",
            "document": "Asiakirja",
            "mandatory": "Pakollinen",
            "validity": "Voimassaolo",
            "status": "Tila",
            "entity": "Liitetty kohteeseen",
            "download": "Lataa",
            "empty": "Ei odotettuja eikä toimitettuja asiakirjoja",
            "file": "toimittaja-asiakirjat",
            "yes": "Kyllä",
            "no": "Ei"
        },
        "products": {
            "search": "Hae tuotetta",
            "product": "Tuote",
            "code": "Koodi",
            "state": "Tila",
            "completion": "Täydellisyys",
            "modified": "Päivitetty",
            "empty": "Ei liitettyjä tuotteita",
            "file": "toimittaja-tuotteet"
        },
        "subSuppliers": {
            "search": "Hae alitoimittajaa",
            "supplier": "Alitoimittaja",
            "code": "Koodi",
            "state": "beCPG-tila",
            "file": "alitoimittajat"
        },
        "activity": {
            "empty": "Ei kirjattua viestintää",
            "message": "Viesti",
            "activity": "Toiminta"
        },
        "unavailable": "beCPG ei pystynyt palauttamaan tätä luetteloa: se ei kerro tästä toimittajasta mitään."
    },
    "components/monitor/supplier/StatusLadder#LABELS": {
        "current": "Täyttynyt sääntö",
        "next": "Sitten",
        "approvedWhen": "Hyväksytty, kun",
        "approvedNow": "Kaikki ehdot täyttyvät",
        "seeAll": "Näytä kaikki {count}",
        "days": "{count} pv",
        "on": "kohteessa {name}",
        "conditions": {
            "documentExpired": "Ei vanhentuneita pakollisia asiakirjoja",
            "blockingNc": "Ei estäviä NC:itä",
            "documentExpiring": "Ei uusittavia asiakirjoja",
            "openProject": "Ei avoimia projekteja",
            "documentMissing": "Ei puuttuvia pakollisia asiakirjoja",
            "blockingCatalog": "Estävät katalogit täytetty"
        },
        "met": "täyttyy",
        "unmet": "ei täyty",
        "progress": "{met}/{total} ehtoa täyttyy"
    },
    "components/monitor/supplier/SupplierBand#LABELS": {
        "erp": "ERP {code}",
        "risk": "Riski {level} · {score}",
        "created": "Luotu",
        "lastActivity": "Viimeisin toiminta",
        "startProject": "Aloita projekti",
        "openInBecpg": "Avaa beCPG:ssä",
        "actions": "Toimittajan toiminnot",
        "parent": "Kuuluu:",
        "group": "{count} alitoimittaja(a)"
    },
    "components/products/CatalogPanel#LABELS": {
        "title": "Vaatimustenmukaisuus",
        "overall": "Valmiusaste",
        "complete": "Valmis",
        "incomplete": "Keskeneräinen",
        "missing": "Puuttuvat kentät",
        "missingCount": "Puuttuvia kenttiä: {count}",
        "duplicates": "Jo käytössä olevat arvot",
        "duplicateOn": "Jo käytössä kohteessa",
        "duplicateUnnamed": "Muita tuotteita: {count}",
        "protectedFields": "Tämän luettelon kentistä {count} täyttää asiakkaanne",
        "protectedFieldsHint": "Ne lasketaan mukaan pisteisiin, mutta niitä ei pyydetä teiltä: ette voi syöttää niitä, asiakkaanne syöttää ne.",
        "none": "Ei sovellettavaa luetteloa",
        "noneHint": "Tälle tuotteelle ei ole määritetty vaatimustenmukaisuusluetteloa, joten täydellisyystarkistusta ei tarvitse läpäistä.",
        "allComplete": "Kaikki luettelot ovat valmiita",
        "allCompleteHint": "Mikään tieto ei estä tämän tuotteen hyväksyntää.",
        "missingHint": "Täyttäkää alla olevat kentät saavuttaaksenne 100 % — ne estävät hyväksynnän.",
        "goToField": "Siirry kenttään",
        "notScored": "Ei pisteytetty"
    },
    "components/products/CompletionMeter#LABELS": {
        "title": "Täydellisyys",
        "noScore": "Ei vielä arvioitu",
        "notCounted": "ei mukana pisteissä",
        "more": "+ {count} muuta luetteloa"
    },
    "components/products/ProductHeader#LABELS": {
        "code": "Koodi",
        "branch": "Päivitys käynnissä",
        "branchFrom": "Version {version} päivitys",
        "branchTitle": "Tämä kortti on listausta varten luotu työkopio.",
        "branchTitleLocked": "Tämä kortti on listausta varten luotu työkopio. Hyväksytty versio on asiakkaan puolella, mutta teillä ei ole siihen lukuoikeutta.",
        "erpCode": "ERP-koodi",
        "supplier": "Toimittaja",
        "subsidiary": "Tytäryhtiö",
        "project": "Projekti",
        "modified": "Päivitetty",
        "created": "Luotu",
        "version": "Versio",
        "legalName": "Virallinen nimi",
        "back": "Omat tuotteet",
        "types": {
            "bcpg:rawMaterial": "Raaka-aine",
            "bcpg:finishedProduct": "Valmis tuote",
            "bcpg:semiFinishedProduct": "Puolivalmiste",
            "bcpg:localSemiFinishedProduct": "Paikallinen puolivalmiste",
            "bcpg:packagingMaterial": "Pakkaus",
            "bcpg:packagingKit": "Pakkaussarja",
            "bcpg:supplier": "Toimittaja",
            "bcpg:productSpecification": "Vaatimusmäärittely",
            "qa:nc": "Poikkeama"
        }
    },
    "components/products/ProductSections#LABELS": {
        "sheet": "Kortti",
        "compliance": "Vaatimustenmukaisuus",
        "documents": "Asiakirjat",
        "specs": "Vaatimusmäärittelyt",
        "sections": "Kortin osiot",
        "noProperties": "Ei näytettäviä ominaisuuksia",
        "noPropertiesHint": "Ohjatun toiminnon määritykset eivät tuo esiin tämän tuotteen ominaisuuksia.",
        "rawProperties": "Ominaisuudet",
        "rawNotice": "Tekniset nimikkeet: ohjatun toiminnon määritykset eivät ole saatavilla tälle tuotteelle.",
        "noData": "Tietoja ei ole toimitettu",
        "noDataHint": "Tässä osiossa ei ole rivejä tälle tuotteelle.",
        "configTitle": "Määritykset eivät ole saatavilla",
        "configHint": "Tämän osion määrityksiä ei voitu ladata. Muut välilehdet ovat edelleen käytettävissä.",
        "yes": "Kyllä",
        "no": "Ei",
        "versionLoading": "Luetaan versiota…",
        "versionUnavailable": "Ei tallennettu versioihin",
        "versionUnavailableHint": "Tämä osio näkyy tuotekortin nykyisessä versiossa.",
        "versionRows": "{count} riviä"
    },
    "components/products/ProductTaskBanner#LABELS": {
        "one": "Tällä kortilla on avoin tehtävä",
        "many": "Tällä kortilla on useita avoimia tehtäviä",
        "open": "Avaa tehtävä",
        "all": "Näytä tämän tuotteen tehtävät",
        "untitled": "Nimetön tehtävä"
    },
    "components/products/UpdateRequestDialog#LABELS": {
        "title": "Pyydä päivitystä",
        "template": "Pyynnön tyyppi",
        "templatePlaceholder": "Valitse…",
        "noTemplate": "Asiakkaasi ei ole avannut toimittajille yhtään pyyntötyyppiä. Kirjoita asiakkaalle Viestit-osiossa.",
        "reason": "Pyynnön syy",
        "reasonHint": "Uusi resepti, uusi alkuperä, uusi tuotantopaikka, uusi tekninen tietolomake…",
        "submit": "Lähetä pyyntö",
        "sent": "Pyyntö lähetetty. Sinulle on avattu päivitystehtävä."
    },
    "components/products/VersionPicker#LABELS": {
        "open": "Tuotekortin versiot",
        "current": "nykyinen",
        "failed": "Historiaa ei voitu lukea.",
        "none": "Ei aiempia versioita",
        "by": "tekijä {author}"
    },
    "components/review/AiPrecheck#LABELS": {
        "title": "Tekoälyn esitarkistus",
        "running": "Luetaan tuotekorttia…",
        "verdicts": {
            "blocking": "Korjattava ennen hyväksyntää",
            "toCheck": "Tarkistettavat kohdat",
            "clear": "Ei estäviä kohtia"
        },
        "severities": {
            "error": "Virhe",
            "warning": "Tarkistettava",
            "ok": "Vaatimustenmukainen"
        },
        "addToFeedback": "Lisää palautteeseen",
        "added": "Lisätty",
        "open": "Avaa osio",
        "proposed": "Ehdotettu palaute toimittajalle",
        "reformulate": "Muotoile uudelleen",
        "translate": "Käännä",
        "useMessage": "Käytä tätä viestiä",
        "help": "Tekoäly lukee tuotekortin ennen teitä: arvojen johdonmukaisuus, massatase, allergeenit, pakolliset asiakirjat. Se ei päätä mitään: jokainen kohta on tarkistettava, ja te lisäätte sen palautteeseen.",
        "failed": "Esitarkistus ei valmistunut.",
        "retry": "Yritä uudelleen"
    },
    "components/review/ReviewChanges#LABELS": {
        "title": "{count} muutosta viitteen jälkeen",
        "none": "Ei muutoksia viitteen jälkeen",
        "added": "Lisätty",
        "removed": "Poistettu",
        "empty": "tyhjä",
        "flag": "Merkitse",
        "flagged": "Merkitty",
        "flagText": "tarkistettava ({before} → {after})",
        "addedText": "rivi lisätty, tarkistettava",
        "removedText": "rivi poistettu, tarkistettava",
        "show": "Näytä muutokset",
        "hide": "Piilota muutokset"
    },
    "components/review/ReviewWorkspace#LABELS": {
        "due": "Määräpäivä {date}",
        "late": "Myöhässä",
        "comparedBranch": "Verrattu hyväksyttyyn tuotekorttiin",
        "comparedVersion": "Verrattu versioon {label}, {date}",
        "noReference": "Ensimmäinen versio: ei vertailtavaa",
        "progress": "{done}/{total} osiota tarkistettu",
        "validateHint": "\"Hyväksy tuotekortti\" otetaan käyttöön, kun jokainen osio on hyväksytty",
        "sendBack": "Palauta toimittajalle ({count})",
        "validate": "Hyväksy tuotekortti",
        "sections": "Tarkistettavat osiot",
        "compliance": "Vaatimustenmukaisuus",
        "accepted": "hyväksytty",
        "returned": "korjausta pyydetty",
        "toRead": "tarkistettavana",
        "legendChanged": "muutokset viitteen jälkeen",
        "aiPoints": "tekoälyn havaitsemat kohdat",
        "trailChanges": "{count} muutosta",
        "frozen": "Hyväksytty luettelo",
        "accept": "Hyväksy ja jatka",
        "acceptLast": "Hyväksy",
        "askCorrection": "Pyydä korjausta",
        "correctionPlaceholder": "Mitä toimittajan on korjattava tässä osiossa…",
        "addRemark": "Lisää palautteeseen",
        "cancel": "Peruuta",
        "returnTitle": "Palaute toimittajalle",
        "returnEmpty": "Korjauksia ei ole pyydetty. Merkitse rivi tai pyydä korjausta osioon.",
        "remove": "Poista",
        "messageLabel": "Toimittajalle lähetettävä viesti",
        "messageIntro": "Hei,\n\nEnnen kuin tuotekortti \"{name}\" voidaan hyväksyä, pyydämme korjaamaan:",
        "messageOutro": "\n\nYstävällisin terveisin",
        "sendBackTitle": "Palautetaanko tuotekortti toimittajalle?",
        "sendBackConfirm": "Palauta",
        "validateTitle": "Hyväksytäänkö tuotekortti?",
        "validateMessage": "Tehtävä päättyy ja projekti siirtyy seuraavaan vaiheeseen.",
        "sent": "Tuotekortti palautettu toimittajalle.",
        "validated": "Tuotekortti hyväksytty.",
        "discussion": "Viestinvaihto toimittajan kanssa",
        "closed": "Tämä tehtävä on suljettu: tarkistus on vain luku -tilassa."
    },
    "components/shell/Header#LOCAL_LABELS": {
        "menu": "Avaa valikko",
        "account": "Oma tili",
        "home": "beCPG — portaalin etusivu"
    },
    "components/shell/Nav#LOCAL_LABELS": {
        "more": "Lisää",
        "menu": "Valikko",
        "close": "Sulje valikko",
        "supplierSpace": "Toimittajatila",
        "monitorSpace": "Seurantatila",
        "collapse": "Pienennä valikko",
        "expand": "Laajenna valikko"
    },
    "components/shell/NotificationBell#LOCAL": {
        "open": "Ilmoitukset",
        "panel": "Ilmoitukset",
        "close": "Sulje",
        "refresh": "Päivitä",
        "markRead": "Merkitse luetuksi",
        "countOne": "1 odottava ilmoitus",
        "countMany": "Odottavia ilmoituksia: {count}",
        "countNone": "Ei ilmoituksia",
        "updatedAt": "Päivitetty klo {time}",
        "more": "ja {count} muuta — katso \"Omat asiakirjat\" ja \"Omat tehtävät\"",
        "moreTasks": "ja {count} muuta — katso \"Omat tehtävät\"",
        "allTasks": "Omat tehtävät",
        "allDocuments": "Omat asiakirjat"
    },
    "components/shell/SupplierSwitcher#LABELS": {
        "all": "Kaikki toimittajat",
        "change": "Vaihda toimittaja",
        "current": "Valittu toimittaja",
        "group": "Omat toimittajatiedot",
        "scope": "Laajuus"
    },
    "components/signature/PdfViewer#LABELS": {
        "previous": "Edellinen sivu",
        "next": "Seuraava sivu",
        "page": "Sivu",
        "of": "/ {pages}",
        "zoomIn": "Lähennä",
        "zoomOut": "Loitonna",
        "fit": "Sovita leveyteen",
        "download": "Lataa PDF",
        "loading": "Ladataan asiakirjaa…",
        "pageLoading": "Ladataan sivua {page}…",
        "error": "Tätä asiakirjaa ei voitu näyttää",
        "errorHint": "Tiedosto voi olla suojattu tai tilapäisesti poissa käytöstä. Voitte yrittää uudelleen tai ladata sen luettavaksi.",
        "retry": "Yritä uudelleen",
        "pinch": "Zoomaa nipistämällä"
    },
    "components/signature/SignatureDocument#LABELS": {
        "zonesHint": "Kehykset osoittavat, mihin allekirjoituksenne ja nimikirjaimenne sijoitetaan.",
        "counter": "Asiakirja {index}/{total}",
        "read": "Luettu",
        "unavailable": "Asiakirja ei ole saatavilla",
        "unavailableHint": "Tähän asiakirjaan ei enää pääse beCPG:ssä: se on ehkä korvattu allekirjoituksen jälkeen tai käyttöoikeutenne on poistettu. Pyytäkää tarvittaessa kopio asiakkaaltanne."
    },
    "components/signature/SignatureFlow#LABELS": {
        "title": "Allekirjoitus",
        "back": "Omat tehtävät",
        "loading": "Avataan asiakirjaa…",
        "notFound": "Ei allekirjoitettavaa asiakirjaa",
        "notFoundHint": "Tähän tehtävään ei liity allekirjoitettavaa asiakirjaa. Toimitus voi olla vielä valmisteilla — ottakaa yhteyttä asiakkaaseenne projektin keskustelussa.",
        "readTitle": "Asiakirjan lukeminen",
        "progress": "Luettu {seen} / {pages} sivua",
        "progressDone": "Koko asiakirja luettu",
        "progressHint": "Allekirjoituspainike avautuu, kun kaikki sivut on katsottu.",
        "readyHint": "Valmista: allekirjoituksenne lisätään asiakirjaan.",
        "goToPage": "Jatka sivulta {page}",
        "goToDocumentPage": "Jatka: as. {document}, sivu {page}",
        "documentCount": "Allekirjoitettavia asiakirjoja: {count}",
        "toSignature": "Siirry allekirjoitukseen",
        "signTitle": "Allekirjoituksenne",
        "initialsTitle": "Nimikirjaimenne",
        "initialsHint": "Ne lisätään jokaisen sivun alareunaan.",
        "consent": "Olen lukenut koko asiakirjan ja hyväksyn sen allekirjoittamisen sähköisesti. Ymmärrän, että tällä allekirjoituksella on sama arvo kuin käsin kirjoitetulla allekirjoituksella.",
        "sign": "Allekirjoita asiakirja",
        "signing": "Allekirjoitetaan…",
        "blockedRead": "Lukekaa kaikki sivut voidaksenne allekirjoittaa.",
        "blockedSignature": "Lisätkää allekirjoituksenne.",
        "blockedInitials": "Lisätkää nimikirjaimenne.",
        "blockedConsent": "Valitkaa suostumusruutu.",
        "successTitle": "Asiakirja allekirjoitettu",
        "successBody": "Allekirjoituksenne on tallennettu. beCPG lisää sen asiakirjaan ja lähettää teille kopion sähköpostitse. Löydätte sen myös kohdasta Omat asiakirjat › Allekirjoitetut.",
        "successNext": "Teiltä ei odoteta muuta: tehtävä suljetaan ja asiakkaallenne ilmoitetaan.",
        "successDownload": "Lataa asiakirja",
        "successBack": "Takaisin omiin tehtäviin",
        "signedTitle": "Tämä asiakirja on jo allekirjoitettu",
        "signedBody": "Tälle tehtävälle on jo tallennettu allekirjoitus. Mitään ei tarvitse tehdä uudelleen — voitte ladata asiakirjan.",
        "signedBodyNoCopy": "Tälle tehtävälle on jo tallennettu allekirjoitus. Mitään ei tarvitse tehdä uudelleen. Asiakirjaan ei enää pääse portaalista; pyytäkää tarvittaessa kopio asiakkaaltanne.",
        "signedView": "Näytä asiakirja",
        "signedComplete": "Suorita tehtävä",
        "signedCompleteDone": "Tehtävä suoritettu.",
        "signedCompleteError": "Tehtävää ei voitu suorittaa.",
        "cancelledTitle": "Allekirjoitus peruttu",
        "cancelledBody": "Asiakkaanne on perunut tämän allekirjoituspyynnön. Teiltä ei odoteta toimenpiteitä.",
        "closedTitle": "Tehtävä on jo käsitelty",
        "closedBody": "Tämä tehtävä ei ole enää avoinna. Jos kyseessä on mielestänne virhe, ottakaa yhteyttä asiakkaaseenne.",
        "externalTitle": "Allekirjoitus palveluntarjoajalla",
        "externalBody": "Asiakkaanne käyttää ulkoista allekirjoituspalvelua. Asiakirja avautuu uuteen välilehteen; palatkaa tänne, kun olette valmis.",
        "externalOpen": "Avaa allekirjoitus",
        "failed": "Allekirjoitusta ei voitu tallentaa.",
        "failedNetwork": "Yhteys katkesi lähetyksen aikana. Allekirjoituksenne ei ole kadonnut: yrittäkää uudelleen, sitä ei tallenneta kahdesti.",
        "retry": "Yritä uudelleen",
        "refresh": "Päivitä",
        "leaving": "Allekirjoitusta lähetetään. Sivulta poistuminen nyt voi keskeyttää sen.",
        "document": "Asiakirja"
    },
    "components/signature/SignaturePad#LABELS": {
        "draw": "Piirrä",
        "type": "Kirjoita nimeni",
        "drawHint": "Allekirjoittakaa kehyksen sisään sormella, kynällä tai hiirellä.",
        "typeHint": "Nimenne lisätään allekirjoitukseksi.",
        "namePlaceholder": "Etunimi SUKUNIMI",
        "nameLabel": "Allekirjoittajan nimi",
        "clear": "Tyhjennä",
        "undo": "Kumoa viimeinen veto",
        "preview": "Allekirjoituksenne esikatselu",
        "empty": "Ei vielä allekirjoitusta",
        "required": "Allekirjoituksenne vaaditaan jatkaaksenne.",
        "initialsType": "Kirjoita nimikirjaimeni",
        "initialsDrawHint": "Piirtäkää nimikirjaimenne kehyksen sisään.",
        "initialsTypeHint": "Nämä nimikirjaimet lisätään sivukuittaukseksi.",
        "initialsNameLabel": "Nimikirjaimet",
        "initialsPlaceholder": "VL",
        "initialsPreview": "Nimikirjaimienne esikatselu",
        "initialsEmpty": "Ei vielä nimikirjaimia"
    },
    "components/signature/SignatureZones#DEFAULT_LABELS": {
        "signature": "Allekirjoitus",
        "initials": "Nimikirjaimet",
        "date": "Päivämäärä",
        "text": "Teksti"
    },
    "components/specs/SpecPanel#LABELS": {
        "title": "Vaatimusmäärittelyt",
        "subtitle": "Tuotteisiinne sovellettavat viiteasiakirjat",
        "consult": "Näytä",
        "open": "Avaa",
        "download": "Lataa",
        "appliesTo": "Koskee",
        "andOthers": "ja {count} muuta",
        "updated": "Päivitetty {date}",
        "search": "Hae vaatimusmäärittelyä",
        "none": "Ei vaatimusmäärittelyjä",
        "noneHint": "Tähän laajuuteen ei ole liitetty vaatimusmäärittelyä. Asiakas jakaa sellaisen, jos jokin on sovellettavissa.",
        "noResult": "Yksikään vaatimusmäärittely ei vastaa hakua",
        "count": "Asiakirjoja: {count}",
        "readFirst": "Lue ennen täyttämistä",
        "unreadable": "Tuotteisiinne sovelletaan vaatimusmäärittelyjä ({count}), mutta tilinne ei voi avata niitä. Pyytäkää käyttöoikeutta asiakkaaltanne."
    },
    "components/survey/DecisionTree#LABELS": {
        "required": "Pakollinen kysymys",
        "noAnswer": "Ei vastattu",
        "choose": "Valitse vastaus",
        "openLink": "Avaa linkki",
        "answer": "Vastaus",
        "blank": "Tähän pakolliseen kysymykseen ei ole vielä vastattu."
    },
    "components/tasks/NcAssist#LABELS": {
        "title": "Tekoälyapu",
        "help": "Tekoälyn ehdotuksia poikkeaman, tuotteen, toimittajan ja aiempien poikkeamien perusteella. Mitään ei tallenneta ennen kuin vastaatte tehtävään.",
        "answers": "Ehdotetut vastaukset",
        "apply": "Käytä",
        "applied": "Käytetty",
        "applyAll": "Käytä kaikki",
        "causes": "Todennäköiset juurisyyt",
        "actions": "Ehdotetut korjaavat toimenpiteet",
        "addToComment": "Lisää kommenttiin",
        "similar": "Samankaltaiset poikkeamat",
        "likelihood": {
            "high": "todennäköinen",
            "medium": "mahdollinen",
            "low": "epätodennäköinen"
        },
        "yes": "Kyllä",
        "no": "Ei"
    },
    "components/tasks/TaskActions#LABELS": {
        "complete": "Suorita tehtävä",
        "refuse": "Hylkää",
        "completeTitle": "Suoritetaanko tämä tehtävä?",
        "completeMessage": "Tehtävä merkitään tehdyksi ja projekti siirtyy seuraavaan vaiheeseen.",
        "refuseTitle": "Hylätäänkö tämä tehtävä?",
        "refuseReason": "Hylkäyksen syy",
        "refuseReasonHint": "Tämä teksti lähetetään toimittajalle: kertokaa, mitä on korjattava.",
        "refuseReasonRequired": "Hylkääminen edellyttää syytä.",
        "cancel": "Peruuta",
        "completed": "Tehtävä suoritettu.",
        "refused": "Tehtävä hylätty."
    },
    "components/tasks/WorkflowTaskScreen#LABELS": {
        "back": "Omat tehtävät",
        "assignee": "Osoitettu",
        "pooled": "Otettavissa",
        "due": "Määräpäivä",
        "startedBy": "Käynnistäjä",
        "concerns": "Koskee",
        "answer": "Vastauksenne",
        "claim": "Ota tehtävä",
        "release": "Palauta pooliin",
        "claimed": "Tehtävä on teidän",
        "released": "Tehtävä on palautettu pooliin",
        "save": "Tallenna",
        "saved": "Vastaus tallennettu",
        "done": "Tehtävä valmis",
        "completed": "Tehtävä valmis, työnkulku jatkuu",
        "claimFirst": "Ottakaa tehtävä vastataksenne siihen.",
        "closed": "Tämä tehtävä on valmis.",
        "discussion": "Keskustelu"
    },
    "components/ui/DataTable#LOCAL_LABELS": {
        "selectAll": "Valitse kaikki",
        "selectRow": "Valitse rivi",
        "columns": "Näkyvät sarakkeet",
        "rowsPerPage": "Rivejä sivulla",
        "export": "Vie",
        "legend": "Selite"
    },
    "components/ui/EmptyState#SENTENCES": {
        "empty": "Täällä ei ole vielä mitään näytettävää. Kohteet tulevat näkyviin heti, kun ne luodaan tai lähetetään.",
        "search": "Yksikään kohde ei vastaa hakua. Kokeilkaa vähemmillä sanoilla tai poistakaa jokin suodattimista."
    },
    "components/ui/TabScroller#LOCAL": {
        "previous": "Edelliset välilehdet",
        "next": "Seuraavat välilehdet"
    },
    "components/wizard/AutoSaveIndicator#LABELS": {
        "pending": "Tallentamattomia muutoksia",
        "saving": "Tallennetaan…",
        "saved": "tallennettu klo {time}",
        "savedShort": "Tallennettu",
        "error": "Tallennus epäonnistui",
        "retry": "Yritä uudelleen",
        "unsaved": "Muutoksenne eivät ole kadonneet: ne lähetetään uudelleen."
    },
    "components/wizard/SuggestionSources#LABELS": {
        "source": "Lähde",
        "conflict": "Asiakirjat eivät anna samaa arvoa",
        "choose": "Käytä tätä valintaa",
        "version": "v{version}"
    },
    "components/wizard/TechnicalSheetBanner#LABELS": {
        "title": "Tekninen tuotekortti",
        "deposited": "Ladattu {date}",
        "replace": "Korvaa",
        "replaceSheet": "Korvaa tekninen tuotekortti",
        "cancel": "Peruuta",
        "missing": "Tekninen tuotekortti puuttuu",
        "missingHint": "Ladatkaa tekninen tuotekorttinne ottaaksenne tekoälyn ehdotukset käyttöön.",
        "missingClosed": "Tähän korttiin ei ole ladattu teknistä tuotekorttia."
    },
    "components/wizard/Wizard#LABELS": {
        "context": "Konteksti",
        "discussion": "Keskustelu",
        "documents": "Asiakirjat",
        "technicalSheet": "Tekninen tuotekortti",
        "suggestions": "Ehdotukset",
        "compliance": "Vaatimustenmukaisuus",
        "properties": "Ominaisuudet",
        "list": "Luettelo",
        "survey": "Kyselylomake",
        "readOnly": "Vain luku",
        "readOnlyReasons": {
            "readAccess": "Teillä on tähän korttiin vain lukuoikeus.",
            "noAssignedTask": "Teille ei ole osoitettu tehtävää tällä kortilla: tietojen syöttö on suljettu.",
            "wizardReadOnly": "Tämä ohjattu toiminto on määritetty vain luku -tilaan."
        },
        "finish": "Valmis",
        "finished": "Tehtävä lähetetty asiakkaallenne",
        "finishBlocked": "Täyttäkää vaiheen \"Vaatimustenmukaisuus\" puuttuvat kentät viimeistelläksenne.",
        "finishMissingStep": "\"{step}\": pakollisia vastauksia puuttuu {count}.",
        "finishGapStep": "{step} · kenttiä: {count}",
        "finishGapCatalog": "{step} · odotettuja: {count}",
        "finishGapCatalogPlain": "{step}: täydennettävä",
        "notFound": "Korttia ei löytynyt",
        "notFoundHint": "Tätä korttia ei ole olemassa tai se ei kuulu laajuuteenne.",
        "unknownWizard": "Syötön ohjattua toimintoa ei ole määritetty",
        "unknownWizardHint": "Tämä tehtävä edellyttää ohjattua toimintoa \"{wizard}\", jota ei ole määritetty tässä instanssissa. Ilmoittakaa asiasta beCPG-järjestelmänvalvojallenne.",
        "backToTasks": "Takaisin tehtäviin",
        "uploadSheet": "Lataa tekninen tuotekortti",
        "renewSheet": "Teknisen tuotekortin uusi versio",
        "addDocument": "Lisää täydentävä asiakirja",
        "delegated": "Täytätte tietoja toimittajan puolesta: {supplier}",
        "due": "Määräaika: {date}",
        "step": "Vaihe",
        "widen": "Laajenna syöttöaluetta",
        "widenHint": "Piilottaa sivupaneelit ja pienentää vaiheet kuvakkeiksi.",
        "restore": "Palauta paneelit",
        "steps": "Vaiheet"
    },
    "components/wizard/WizardFooter#LABELS": {
        "previous": "Edellinen",
        "next": "Seuraava",
        "finish": "Valmis",
        "finishing": "Lähetetään…",
        "formulating": "Lasketaan uudelleen…",
        "blocked": "Ei voi vielä viimeistellä",
        "incomplete": "Kortti keskeneräinen"
    },
    "components/wizard/WizardStepper#LABELS": {
        "title": "Vaiheet",
        "step": "Vaihe {index}/{total}",
        "open": "Valitse vaihe",
        "frozen": "Asiakkaan hyväksymä",
        "readOnly": "Vain luku",
        "done": "Käyty",
        "complete": "Valmis",
        "current": "Nykyinen vaihe",
        "todo": "Ei vielä käyty",
        "locked": "Saatavilla myöhemmin",
        "incomplete": "Pakollisia puuttuu: {count}",
        "catalogGap": "Luettelon odottamia kenttiä: {count}",
        "remaining": "Täydennettäviä osioita: {count}",
        "remainingNone": "Puutteita ei ole ilmoitettu",
        "remainingHint": "Asiakkaanne odottaa näitä tietoja hyväksyäkseen kortin.",
        "remainingHintNone": "Voitte palata mihin tahansa vaiheeseen milloin tahansa.",
        "collapse": "Pienennä vaiheet",
        "expand": "Laajenna vaiheet"
    },
    "components/wizard/panels/CommentsPanel#LABELS": {
        "title": "Keskustelu",
        "subtitle": "Viestinvaihtonne asiakkaan kanssa tästä kortista",
        "subtitleInternal": "Viestinvaihtonne toimittajan kanssa tästä kortista",
        "emptyHintInternal": "Esittäkää kysymys toimittajalle tai vastatkaa johonkin sen huomautuksista.",
        "placeholder": "Kirjoita viesti…",
        "send": "Lähetä",
        "empty": "Ei viestejä",
        "emptyHint": "Esittäkää kysymys asiakkaallenne tai vastatkaa johonkin hänen huomautuksistaan.",
        "emptyAnchored": "Tästä kohteesta ei ole viestejä",
        "subject": "Aihe",
        "whole": "Koko kortti",
        "onField": "Kenttä: {label}",
        "onRow": "Rivi: {label}",
        "onRowOfList": "Rivi \"{label}\" luettelossa \"{list}\"",
        "inList": "Rivi luettelossa \"{list}\"",
        "row": "rivi",
        "anchored": "Kohde: {label}",
        "clear": "Poista ankkurointi",
        "readOnly": "Keskustelu on vain luku -tilassa.",
        "posting": "Lähetetään…",
        "count": "Viestejä: {count}",
        "denyReasons": {
            "noAssignedTask": "Listaus on suljettu: tämä keskustelu on vain luku -tilassa.",
            "readAccess": "Teillä on tähän korttiin vain lukuoikeus.",
            "noPermission": "Teillä ei ole oikeutta kirjoittaa tähän keskusteluun."
        }
    },
    "components/wizard/panels/HelpPanel#LABELS": {
        "title": "Konteksti",
        "suggestions": "Tekoälyn ehdotukset",
        "specs": "Vaatimusmäärittelyt",
        "specsUnreadable": "Tähän tuotekorttiin on liitetty vaatimusmäärittely, mutta tililläsi ei ole oikeutta avata sitä.",
        "refusals": "Aiemmat hylkäykset",
        "refusedBy": "Hylännyt: {by}",
        "refused": "Hylätty",
        "more": "+{count} lisää"
    },
    "components/wizard/steps/DataListStep#LABELS": {
        "row": "Rivi {index}"
    },
    "components/wizard/steps/DocumentsStep#LABELS": {
        "title": "Odotetut asiakirjat",
        "otherTitle": "Muut asiakirjat",
        "otherSubtitle": "Kansion tiedostot, jotka eivät vastaa mihinkään yllä olevista vaatimuksista. Pudottakaa tähän mikä tahansa hyödyllinen asiakirja (valokuva, analyysi…).",
        "blocking": "Puuttuvat pakolliset asiakirjat: {count}",
        "allGood": "Kaikki pakolliset asiakirjat on toimitettu",
        "readOnly": "Tähän tuotekorttiin ei voi toimittaa asiakirjoja."
    },
    "components/wizard/steps/FormStep#LABELS": {
        "comment": "Kommentoi tätä kenttää",
        "comments": "Viestejä tässä kentässä: {count}",
        "catalogGap": "Asiakkaanne luettelo edellyttää tätä",
        "catalogGapLocale": "Asiakkaanne luettelo edellyttää tätä kielellä {locale}",
        "frozenTitle": "Asiakkaanne on hyväksynyt osion",
        "frozenText": "Asiakkaanne on hyväksynyt nämä tiedot: ne on lukittu eikä niitä voi enää muokata. Jos korjaus on tarpeen, pyytäkää osion avaamista uudelleen keskustelun kautta.",
        "readAccessTitle": "Vain luku",
        "readAccessText": "Teillä ei ole kirjoitusoikeutta tähän tuotekorttiin.",
        "noTaskTitle": "Ei avointa tehtävää",
        "noTaskText": "Tätä tuotekorttia ei ole tällä hetkellä osoitettu teille: voitte tarkastella sitä, mutta ette muokata.",
        "readOnlyTitle": "Vain luku",
        "readOnlyText": "Tätä vaihetta ei voi muokata."
    },
    "components/wizard/steps/ReviewStep#LABELS": {
        "title": "Vaatimustenmukaisuus",
        "subtitle": "Mitä vielä puuttuu, ennen kuin asiakkaanne voi hyväksyä tuotekortin.",
        "subtitleInternal": "Mitä toimittajan tuotekortista vielä puuttuu.",
        "blocking": "Estävät luettelot: {names}",
        "blockingHint": "Täyttäkää alla olevat puuttuvat kentät, jotta voitte viimeistellä.",
        "ready": "Kaikki estävät luettelot täyttyvät",
        "incomplete": "Täydennettävät luettelot: {names}",
        "documents": "Pakolliset asiakirjat",
        "documentsMissing": "Puuttuvat pakolliset asiakirjat: {count}",
        "documentsOk": "Kaikki pakolliset asiakirjat on toimitettu",
        "reviewTitle": "Vain luku -tuotekortti",
        "reviewSubtitle": "Tarkastelette tätä tuotekorttia: muutokset eivät ole mahdollisia.",
        "expand": "Näytä",
        "collapse": "Piilota",
        "expandAll": "Laajenna kaikki",
        "collapseAll": "Tiivistä kaikki",
        "reviewed": "Osio tarkistettu",
        "reviewedHint": "Merkitkää osiot sitä mukaa kuin etenette: tarkistettu {done}/{total}.",
        "empty": "Ei näytettävää"
    },
    "components/wizard/steps/SuggestionsStep#LABELS": {
        "title": "Automaattinen poiminta",
        "subtitle": "Nämä arvot luettiin toimittamistanne asiakirjoista. Tarkistakaa ne: päätösvalta on teillä.",
        "applied": "Otettu käyttöön automaattisesti",
        "appliedHint": "Korkea luotettavuus: arvo on jo paikallaan, voitte kumota sen.",
        "toConfirm": "Vahvistettavat",
        "toConfirmHint": "Tarkistakaa ehdotettu arvo ja ottakaa se sitten käyttöön.",
        "flagged": "Syöttäkää itse",
        "flaggedHint": "Poiminta ei ole riittävän luotettava: annamme mieluummin teidän syöttää arvon itse.",
        "unscored": "Ehdotukset",
        "unscoredHint": "Näillä ehdotuksilla ei ole luotettavuuspisteitä.",
        "apply": "Ota käyttöön",
        "expand": "Laajenna",
        "applyAnyway": "Ota käyttöön silti",
        "revoke": "Kumoa",
        "restore": "Tarkista",
        "applying": "Otetaan käyttöön…",
        "appliedAt": "Otettu käyttöön",
        "revoked": "Kumottu",
        "dismissed": "Ohitettu",
        "notRevocable": "Aiempaa arvoa ei voi palauttaa automaattisesti: muokatkaa kenttää tarvittaessa suoraan.",
        "empty": "Ei ehdotuksia",
        "emptyShort": "Tähän vaiheeseen ei ole ehdotettavaa.",
        "emptyHint": "Tähän vaiheeseen ei ole ehdotettavaa. Tekninen tuotekortti ladataan heti yläpuolella: poiminta ehdottaa siitä löytämiään arvoja.",
        "emptyEntityLevel": "Analyysi suoritettiin, mutta se tuotti vain itse tuotekortista tehtyjä päätelmiä ilman niitä tukevaa asiakirjaa: niitä ei ehdoteta teille.",
        "analysing": "Analyysi käynnissä",
        "analysingHint": "Portaali lukee asiakirjojanne. Ehdotukset ilmestyvät tähän itsestään, sivulta poistumatta: teknisen tuotekortin lukeminen kestää yleensä alle minuutin.",
        "analysingPlugins": "Käynnissä: {plugins}",
        "refresh": "Suorita analyysi uudelleen",
        "readOnly": "Tämä tuotekortti on vain luku -tilassa: ehdotuksia ei voi ottaa käyttöön.",
        "source": "Lähde",
        "changes": "Arvoja: {count}",
        "error": "Ehdotuksen käyttöönotto epäonnistui.",
        "reading": "Luetaan ehdotuksia…",
        "searchingElsewhere": "Ei mitään tähän vaiheeseen. Haetaan ehdotuksia muista vaiheista…",
        "elsewhere": "Ei mitään tähän vaiheeseen, mutta {count} ehdotusta muissa vaiheissa:",
        "elsewhereStep": "{label} ({count})",
        "runningElsewhere": "Ei vielä mitään tähän vaiheeseen: analyysi jatkuu muissa vaiheissa.",
        "nothingFound": "Analyysi ei löytänyt asiakirjoistanne mitään ehdotettavaa.",
        "runDone": "Analyysi valmis: {count} ehdotusta tähän vaiheeseen.",
        "readAt": "Ehdotukset luettu klo {time}",
        "extractedFrom": "Asiakirjasta \"{document}\" luetut arvot{type}",
        "imageFrom": "Asiakirjasta \"{document}\" löydetty kuva{type}",
        "documentFieldsFrom": "Asiakirjan \"{document}\" tiedot{type}"
    },
    "components/wizard/steps/SurveyStep#LABELS": {
        "discuss": "Keskustelu",
        "answered": "Vastattu {answered}/{total}",
        "empty": "Ei kysymyksiä",
        "emptyHint": "Asiakkaanne ei ole vielä julkaissut kyselylomaketta tälle tuotekortille.",
        "check": "Tarkista vastaukseni",
        "complete": "Kyselylomake valmis",
        "missingTitle": "Vastaamattomat pakolliset kysymykset: {count}",
        "missingHint": "Valitkaa kysymys siirtyäksenne siihen. Muut vastauksenne on jo tallennettu.",
        "readOnly": "Vain luku",
        "noneAnswered": "Ei tallennettuja vastauksia",
        "noneAnsweredHint": "Kyselylomake avautuu sitä mukaa kuin vastaatte.",
        "dropped": "Asiakkaanne ei ole varannut tallennuspaikkaa osalle vastauksistanne ({count}): {questions}. Niitä ei ole tallennettu — ilmoittakaa asiasta asiakkaallenne."
    },
    "lib/adapters/monitor#CSV_HEADERS": {
        "code": "Koodi",
        "name": "Toimittaja",
        "legalName": "Virallinen nimi",
        "approvalStatus": "Hyväksynnän tila",
        "approvalReasons": "Perusteet",
        "completion": "Valmiusaste (%)",
        "risk": "Riski",
        "riskLevel": "Riskitaso",
        "documentsExpired": "Vanhentuneet asiakirjat",
        "documentsExpiring": "Vanhenemassa olevat asiakirjat",
        "documentsMissing": "Puuttuvat asiakirjat",
        "openNc": "Avoimet NC:t",
        "openProjects": "Avoimet projektit",
        "family": "Tuoteperhe",
        "lastActivity": "Viimeisin toiminta",
        "state": "Tila",
        "compliance": "Vaatimustenmukaisuus (%)"
    },
    "config/messages#messages": {
        "app.title": "Toimittajaportaali",
        "app.shortTitle": "Portaali",
        "app.tenantSuffix": "toimittajatila",
        "app.description": "beCPG-toimittajaportaali — listaus, asiakirjat ja vaatimustenmukaisuus",
        "nav.dashboard": "Koostenäkymä",
        "nav.tasks": "Omat tehtävät",
        "nav.products": "Omat tuotteet",
        "nav.documents": "Omat asiakirjat",
        "nav.company": "Oma yritys",
        "nav.specs": "Vaatimusmäärittelyt",
        "nav.messages": "Keskustelut",
        "nav.notifications": "Ilmoitukset",
        "nav.help": "Ohje",
        "nav.monitor": "Seuranta",
        "nav.monitor.suppliers": "Toimittajat",
        "nav.monitor.products": "Toimittajien tuotteet",
        "nav.monitor.documents": "Asiakirjojen vaatimustenmukaisuus",
        "nav.monitor.campaigns": "Projektit",
        "nav.monitor.quality": "Poikkeamat",
        "nav.monitor.reports": "Raportit",
        "nav.monitor.tasks": "Omat tehtävät",
        "account.profile": "Oma profiili",
        "account.language": "Kieli",
        "account.login": "Kirjaudu sisään",
        "account.logout": "Kirjaudu ulos",
        "account.tenant": "Asiakas",
        "account.suppliers": "Omat toimittajatiedot",
        "account.allSuppliers": "Kaikki toimittajat",
        "action.save": "Tallenna",
        "action.cancel": "Peruuta",
        "action.close": "Sulje",
        "action.back": "Takaisin",
        "action.next": "Seuraava",
        "action.previous": "Edellinen",
        "action.submit": "Lähetä",
        "action.confirm": "Vahvista",
        "action.delete": "Poista",
        "action.download": "Lataa",
        "action.upload": "Lataa tiedosto",
        "action.retry": "Yritä uudelleen",
        "action.search": "Hae",
        "action.filter": "Suodata",
        "action.reset": "Palauta",
        "action.export": "Vie",
        "action.sign": "Allekirjoita",
        "action.showMore": "+{count} lisää",
        "action.showLess": "Näytä vähemmän",
        "suggestion.replaces": "Korvaa arvon {value}",
        "state.loading": "Ladataan…",
        "state.saving": "Tallennetaan…",
        "state.saved": "Tallennettu",
        "state.empty": "Ei näytettävää",
        "state.noResults": "Haulla ei löytynyt tuloksia",
        "state.required": "Pakollinen kenttä",
        "state.of": "{from}-{to} / {total}",
        "state.page": "Sivu {page} / {pages}",
        "state.atLeast": "vähintään {total}",
        "error.title": "Jokin meni vikaan",
        "error.generic": "Jokin meni vikaan. Yrittäkää uudelleen.",
        "error.network": "Palvelimeen ei saada yhteyttä.",
        "error.upstream": "beCPG palautti virheen. Yrittäkää uudelleen; jos ongelma jatkuu, ilmoittakaa siitä järjestelmänvalvojalle.",
        "error.unauthorized": "Istuntonne on vanhentunut. Kirjautukaa sisään uudelleen.",
        "error.forbidden": "Teillä ei ole oikeutta suorittaa tätä toimintoa.",
        "error.notFound": "Tätä sivua tai kohdetta ei ole olemassa.",
        "error.tenant": "Tiliinne ei ole liitetty asiakasta.",
        "error.upload": "Tiedoston lataus epäonnistui.",
        "error.projectAlreadyOpen": "Tälle tietueelle on jo avattu listausprojekti. Sulkekaa se ennen uuden käynnistämistä.",
        "error.http": "Virhe {status}: {message}",
        "status.approved": "Hyväksytty",
        "status.inProgress": "Käynnissä",
        "status.toRenew": "Uusittava",
        "status.suspended": "Keskeytetty",
        "status.valid": "Voimassa",
        "status.expiring": "Vanhenemassa",
        "status.expired": "Vanhentunut",
        "status.missing": "Puuttuva",
        "status.validityMissing": "Voimassaoloaika täytettävä",
        "status.rejected": "Hylätty",
        "status.pending": "Odottaa",
        "status.completed": "Valmis",
        "status.late": "Myöhässä",
        "status.draft": "Simulointi",
        "status.notApplicable": "Ei sovellettavissa",
        "test.banner": "TEST-instanssi — tänne syötetyt tiedot eivät ole sitovia",
        "test.badge": "Testi",
        "app.monitorSuffix": "toimittajaseuranta"
    },
    "components/monitor/HistoryPanel#LABELS": {
        "title": "Kehitys",
        "help": "Luettu beCPG:n päätöksentukimoduulista, ladataan erissä: luvut voivat olla edellisestä latauksesta.",
        "period": "Jakso",
        "measures": {
            "stepsNumber": "Tehtävät",
            "averageActualDurations": "Toteutunut kesto keskim. (pv)",
            "refusalRate": "Hylkäysaste",
            "avgResponseDelay": "Vastausaika keskim. (pv)",
            "averageProgress": "Edistyminen keskim.",
            "projectsNumber": "Projektit"
        }
    },
    "components/ui/useListExport#LABELS": {
        "done": "{count} riviä viety.",
        "cut": "Osittainen vienti: {count} riviä, viennin enimmäismäärä. Tarkenna suodattimia lopuille."
    }
};

export default LOCALE;
