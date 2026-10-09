/**
 * German translation of the portal chrome.
 *
 * Generated from the inline French and English labels (`npm run i18n:extract`),
 * then translated. Keys mirror the English source; a key missing here reads
 * English. Edit translations here, and the source labels in their components.
 */
const LOCALE = {
    "app/(home)/page#LOCAL": {
        "state": "Meine Akte",
        "detail": "Zu erledigen"
    },
    "app/company/page#LABELS": {
        "title": "Mein Unternehmen",
        "noSupplier": "Kein Lieferantendatensatz",
        "noSupplierHint": "Ihr Konto ist mit keinem Lieferanten verknüpft. Wenden Sie sich an Ihren Ansprechpartner beim Kunden.",
        "approval": "Freigabestatus",
        "approvalHint": "In Echtzeit aus Ihren Dokumenten, Projekten und Abweichungen berechnet.",
        "reasons": {
            "documentExpired": "Ein Pflichtdokument ist abgelaufen",
            "documentExpiring": "Ein Pflichtdokument läuft bald ab",
            "documentMissing": "Ein Pflichtdokument wurde nicht bereitgestellt",
            "blockingNc": "Eine blockierende Abweichung ist offen",
            "openProject": "Ein Listungsprojekt läuft",
            "blockingCatalog": "Ein blockierender Katalog ist nicht erfüllt"
        },
        "metrics": {
            "documentsExpired": "Abgelaufene Dokumente",
            "documentsExpiring": "Bald ablaufende Dokumente",
            "documentsMissing": "Fehlende Dokumente",
            "openNc": "Offene NC",
            "openProjects": "Offene Projekte"
        },
        "sections": {
            "identity": "Identität",
            "surveyList": "Fragebogen",
            "contactList": "Kontakte",
            "plant": "Standorte",
            "certification": "Zertifizierungen",
            "documents": "Dokumente",
            "specs": "Spezifikationen"
        },
        "frozen": "Vom Kunden validierte Liste — schreibgeschützt",
        "emptyList": "Keine Zeile",
        "emptyListHint": "Dieser Abschnitt wurde noch nicht ausgefüllt.",
        "questionnaire": "{done} / {total} Fragen beantwortet",
        "noProperties": "Keine Eigenschaft anzuzeigen",
        "yes": "Ja",
        "no": "Nein",
        "code": "Code",
        "request": "Aktualisierung anfordern"
    },
    "app/documents/page#LABELS": {
        "title": "Meine Dokumente",
        "tabRequirements": "Anforderungen",
        "tabAll": "Alle Dokumente",
        "tabSigned": "Unterzeichnet",
        "deposit": "Dokument hochladen",
        "depositTitle": "Dokument hochladen",
        "entity": "Zugehöriges Produkt",
        "chooseEntity": "Produkt auswählen…",
        "filters": {
            "open": "Zu bearbeiten",
            "blocking": "Blockierend",
            "expiring": "Läuft ab",
            "done": "Bereitgestellt",
            "all": "Alle"
        },
        "stats": {
            "toProvide": "Bereitzustellen",
            "expired": "Abgelaufen",
            "expiring": "Läuft ab < {days} T",
            "compliance": "Dokumentenkonformität",
            "mandatory": "{done} / {total} verpflichtend",
            "noScope": "kein Umfang zu bewerten"
        },
        "search": "Dokument suchen",
        "noMatch": "Kein Dokument entspricht diesem Filter",
        "noMatchHint": "Wählen Sie „Alle“, um alle Dokumente zu sehen.",
        "columns": {
            "document": "Dokument",
            "entity": "Produkt",
            "status": "Status",
            "validity": "Gültigkeit",
            "modified": "Geändert",
            "ai": "KI-Prüfung",
            "actions": ""
        },
        "download": "Herunterladen",
        "noFile": "Noch nicht bereitgestellt",
        "blockingBanner": "{count} Pflichtdokument(e) halten Ihre Freigabe zurück. Sie stehen oben in der Liste.",
        "scopeEmpty": "Ihr Konto ist keinem Lieferanten zugeordnet, daher kann keine Dokumentenanforderung berechnet werden. Die Zähler oben sind leer, nicht erfüllt. Wenden Sie sich an Ihren Ansprechpartner beim Kunden."
    },
    "app/error#LABELS": {
        "title": "Diese Seite konnte nicht angezeigt werden",
        "message": "Beim Rendern ist ein technischer Fehler aufgetreten. Ihre Eingaben gehen nicht verloren: Sie werden fortlaufend gespeichert.",
        "retry": "Erneut versuchen",
        "home": "Zurück zur Startseite",
        "reference": "Referenz für den Support"
    },
    "app/global-error#LABELS": {
        "title": "Das Portal konnte nicht gestartet werden",
        "message": "Ein technischer Fehler verhindert die Anzeige des Portals. Versuchen Sie es erneut; falls das Problem weiterhin besteht, wenden Sie sich mit der unten stehenden Referenz an Ihren beCPG-Ansprechpartner.",
        "retry": "Erneut versuchen",
        "reference": "Referenz"
    },
    "app/help/page#LABELS": {
        "title": "Hilfe",
        "subtitle": "So funktioniert das Portal, Schritt für Schritt",
        "scope": "beCPG-Lieferantenportal",
        "search": "Hilfe durchsuchen",
        "expandAll": "Alle aufklappen",
        "collapseAll": "Alle zuklappen",
        "topics": "Inhalt",
        "noResult": "Kein passendes Thema",
        "noResultHint": "Versuchen Sie ein anderes Wort: „Dokument“, „Signatur“, „Schritt“, „Freigabe“.",
        "anchor": "Link zu diesem Thema",
        "anchorCopied": "Link kopiert",
        "goTo": "Gehe zu",
        "monitorNotice": "Diese Hilfe beschreibt die Lieferantenansicht: die Bildschirme, die Ihre Lieferanten sehen, wobei „Ihr Kunde“ Ihr eigenes Unternehmen bezeichnet. Der Überwachungsbereich ist noch nicht dokumentiert."
    },
    "app/help/page#TOPICS": [
        {
            "id": "start",
            "icon": "flag",
            "title": "Wo Sie beginnen",
            "summary": "Das Dashboard beantwortet eine einzige Frage: Was wird von Ihnen erwartet, und bis wann.",
            "blocks": [
                {
                    "p": "Alles beginnt auf dem Dashboard. Die vier Karten oben fassen Ihre Akte bei diesem Kunden zusammen:"
                },
                {
                    "ul": [
                        "**Freigabestatus** — Freigegeben, In Bearbeitung, Zu erneuern oder Gesperrt, mit dem Gültigkeitsdatum.",
                        "**Vollständigkeit** — der Anteil der erwarteten Felder, die in Ihren Datenblättern bereits ausgefüllt sind.",
                        "**Erforderliche Aktionen** — wie viele Aufgaben offen sind und wie viele überfällig.",
                        "**Dokumente** — wie viele gültig sind, wie viele bald ablaufen und wie viele fehlen."
                    ]
                },
                {
                    "p": "Darunter zeigen die Listen die Details: Ihre Aufgaben, Ihre Produkte, Ihre Dokumente, Ihre Diskussionen und Ihre Benachrichtigungen. Die Glocke in der Kopfzeile zeigt dieselbe Benachrichtigungsliste auf jedem Bildschirm."
                },
                {
                    "note": "Ein Konto kann für mehrere beCPG-Kunden arbeiten, mit einem Portal pro Kunde. Logo und Name des Kunden werden immer oben links angezeigt: Daran erkennen Sie, in welcher Akte Sie sich befinden."
                },
                {
                    "warn": "Wenn ein Banner „TEST-Instanz“ angezeigt wird, befinden Sie sich in einer Testumgebung: Nichts, was Sie dort eingeben, ist vertraglich verbindlich."
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
                            "label": "Meine Aufgaben"
                        },
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "Meine Dokumente"
                        }
                    ]
                }
            ]
        },
        {
            "id": "tasks",
            "icon": "assignment_turned_in",
            "title": "So funktioniert eine Listungsaufgabe",
            "summary": "Eine Aufgabe stammt aus einem Projekt, das Ihr Kunde eröffnet hat. Ihr Typ bestimmt, auf welchem Bildschirm Sie landen.",
            "blocks": [
                {
                    "p": "Ihr Kunde eröffnet ein Listungsprojekt, und dieses Projekt sendet Ihnen Aufgaben. Eine Aufgabe hat einen Titel, das betroffene Produkt, ein Fälligkeitsdatum und einen Typ. Ein Klick auf eine Aufgabe führt Sie direkt zu dem Bildschirm, auf dem Sie sie erledigen — ohne Zwischenseite."
                },
                {
                    "ul": [
                        "**Assistent** — geführte Dateneingabe für ein Produktdatenblatt oder Ihr Lieferantendatenblatt.",
                        "**Signatur** — ein PDF-Dokument lesen und anschließend unterzeichnen.",
                        "**Dokument** — ein erwartetes Dokument hochladen oder erneuern.",
                        "**Prüfung** — ein Produkt durchlesen, ohne Eingabe."
                    ]
                },
                {
                    "p": "Eine Aufgabe im Status Geplant oder In Bearbeitung wartet auf Sie. Eine abgelehnte Aufgabe wurde von Ihrem Kunden mit einer Begründung zurückgesandt: Lesen Sie die Anmerkung, bevor Sie erneut einreichen. Eine abgeschlossene Aufgabe erfordert nichts weiter."
                },
                {
                    "p": "Eine Aufgabe nach ihrem Fälligkeitsdatum wird als überfällig gekennzeichnet, sowohl in der Liste als auch in den Benachrichtigungen. Ab sieben Tagen Verzug wird sie rot."
                },
                {
                    "note": "Sie können eine Aufgabe so oft öffnen und verlassen, wie Sie möchten: Sie bleibt offen, bis Sie sie selbst abschließen, und zwischen zwei Besuchen geht nichts verloren."
                },
                {
                    "links": [
                        {
                            "href": "/tasks",
                            "icon": "assignment_turned_in",
                            "label": "Meine Aufgaben"
                        }
                    ]
                }
            ]
        },
        {
            "id": "wizard",
            "icon": "auto_stories",
            "title": "Die Reihenfolge der Assistentenschritte",
            "summary": "Technisches Datenblatt in der Kopfzeile, ein dauerhaftes Kontext-Panel, die Abschnitte Ihres Kunden, dann die Konformität.",
            "blocks": [
                {
                    "p": "Der Assistent folgt immer derselben Reihenfolge. Er ist kein Tunnel: Sobald ein Schritt besucht wurde, können Sie frei dorthin zurückkehren."
                },
                {
                    "ol": [
                        "**Kopfzeile · Technisches Datenblatt** — der erste Schritt, der von Ihnen erwartet wird. Solange es fehlt, weist ein rotes Band über jedem Schritt darauf hin; nach dem Hochladen bleibt eine Zeile mit Datum und Gültigkeit. Es ist das Dokument, das die KI liest, um Werte vorzuschlagen: Ohne es gibt es nichts zu lesen. Hat Ihr Kunde keinen solchen Dokumenttyp konfiguriert, wird das Band gar nicht angezeigt.",
                        "**Schritt 0 · Kontext** — ein Panel, das immer sichtbar ist und auf dem Smartphone mit einem Tippen als Blatt erscheint. Es enthält die KI-Vorschläge, die geltende Spezifikation, die bereits von Ihrem Kunden validierten Listen und frühere Ablehnungen. Sie durchlaufen es nie: Es ist da, egal auf welchem Schritt Sie sich befinden.",
                        "**Die Abschnitte Ihres Kunden** — Eigenschaften, Fragebogen, Zutaten, Nährwerte, Allergene, Physikalisch-Chemisches, Claims, Mikrobiologie, Organoleptik, Verpackungsmaterialien, Dokumente… Welche Abschnitte erscheinen und in welcher Reihenfolge, ergibt sich aus der Konfiguration Ihres Kunden und dem Produkttyp: Das Portal wählt sie nicht aus.",
                        "**Dokumente** — der Schritt behält den Platz, den Ihr Kunde ihm gegeben hat, meist gegen Ende. Das ist gewollt: beCPG leitet die erwarteten Dokumente aus Ihren Eingaben ab (ein Claim „gentechnikfrei“ erfordert die entsprechende Bescheinigung), zu früh abgefragt wäre die Liste leer oder falsch. Nur das technische Datenblatt wird in jedem Fall erwartet, und es befindet sich in der Kopfzeile.",
                        "**Konformität** — die Liste der noch fehlenden Felder, jedes anklickbar, um direkt dorthin zu springen, sowie der Vollständigkeitswert. Hat Ihr Kunde eine blockierende Prüfung definiert, bleibt der Abschluss nicht verfügbar, bis sie erfüllt ist."
                    ]
                },
                {
                    "note": "Jeder Abschnitt wird automatisch gespeichert, ohne dass Sie eine Schaltfläche drücken müssen. Die Anzeige „Gespeichert um HH:MM“ unten im Assistenten neben den Navigationsschaltflächen bestätigt es — und Sie machen genau dort weiter, wo Sie waren, wenn Sie das Portal schließen, das Gerät wechseln oder die Netzverbindung verlieren."
                },
                {
                    "p": "Zwischen einigen Schritten wird Ihr Datenblatt neu berechnet (Allergene, Nährwerte, Kosten…). Diese Berechnung läuft im Hintergrund und blockiert Sie nie: Sie können währenddessen weiter eingeben."
                },
                {
                    "p": "Auf einem breiten Bildschirm blendet „Eingabebereich vergrößern“ die Seitenpanels aus und reduziert die Schrittliste auf ihre Symbole, für breite Tabellen. Die Wahl wird von einem Datenblatt zum nächsten gespeichert; die Panels bleiben über die Symbole in der Kopfzeile einen Klick entfernt."
                },
                {
                    "note": "Wenn Ihr Ansprechpartner Daten in Ihrem Namen eingibt, weist ein Banner „Sie geben Daten ein für …“ oben im Assistenten ausdrücklich darauf hin."
                }
            ]
        },
        {
            "id": "grids",
            "icon": "grid_on",
            "title": "Schnelle Eingabe in einer Tabelle",
            "summary": "Zutaten, Nährwerte, Allergene: Alles geht über die Tastatur, und ein Tabellenblock lässt sich direkt einfügen.",
            "blocks": [
                {
                    "p": "Die Tabellenabschnitte — Zutaten, Nährwerte, Allergene, Physikalisch-Chemisches… — werden ausgefüllt, ohne die Tastatur zu verlassen. Die Tastatur-Schaltfläche über der Tabelle zeigt die Liste jederzeit wieder an."
                },
                {
                    "ul": [
                        "**Tab / Shift+Tab** — nächste / vorherige Zelle.",
                        "**Enter** — speichert die Zeile und geht in derselben Spalte nach unten; in der letzten Zeile wird eine neue hinzugefügt.",
                        "**↑ / ↓** — dieselbe Spalte, Zeile darüber / darunter.",
                        "**Esc** — verwirft die Änderungen der bearbeiteten Zeile.",
                        "**Ctrl+D** — dupliziert die aktuelle Zeile.",
                        "**Ctrl+V** — fügt einen Zellblock aus einer Tabellenkalkulation ein."
                    ]
                },
                {
                    "p": "Das Einfügen aus einer Tabellenkalkulation übernimmt mehrere Zeilen und Spalten auf einmal, legt fehlende Zeilen an und teilt Ihnen mit, was nicht übernommen werden konnte — ein Wert außerhalb der vorgeschlagenen Liste, Text, wo eine Zahl erwartet wird, eine schreibgeschützte Spalte. Nichts wird erraten: Was keine exakte Entsprechung hat, wird Ihnen zur Korrektur zurückgegeben."
                },
                {
                    "note": "Wie überall im Assistenten wird eine Zeile gespeichert, sobald Sie sie verlassen — oder mit Enter, oder sobald Sie ein Kästchen ankreuzen. Es gibt keine Speichern-Schaltfläche: Es gibt nichts zu bestätigen. Nur beim Einfügen wird „N Zeilen speichern“ angeboten, weil niemand diese Zeilen durchgesehen hat."
                },
                {
                    "p": "Auf dem Smartphone wird die Tabelle zu einer Karte pro Zeile: dieselben Felder, untereinander, ohne horizontales Scrollen."
                }
            ]
        },
        {
            "id": "specs",
            "icon": "menu_book",
            "title": "Spezifikation und Katalog: Was ist der Unterschied",
            "summary": "Eine Spezifikation wird gelesen. Ein Katalog wird ausgefüllt — und er entscheidet, ob Sie abschließen können.",
            "blocks": [
                {
                    "p": "Es handelt sich um zwei verschiedene Objekte, die nicht demselben Zeitpunkt dienen. Am einfachsten nehmen Sie sie in der Reihenfolge, in der Sie ihnen begegnen."
                },
                {
                    "ul": [
                        "**Die Spezifikation** — ein Dokument Ihres Kunden, das einem Produkt oder einer Produktfamilie zugeordnet ist. Es beschreibt seine Anforderungen: verbotene Stoffe, akzeptierte Herkünfte, analytische Grenzwerte, Transportbedingungen, CSR-Verpflichtungen. Es ist ein **Referenztext**, der gelesen wird. Das Portal zeigt ihn im Panel „Kontext“ des Assistenten, und der Bildschirm „Spezifikationen“ fasst alle zusammen.",
                        "**Der Katalog** — eine **Liste von Pflichtfeldern**, die Ihr Kunde definiert hat: „Damit ein Rohstoff bei mir gelistet wird, benötige ich Herkunft, Dichte, EAN-Code, Hauptallergen…“. Es ist kein Text, sondern eine Prüfung. Das Portal berechnet ihn fortlaufend und zeigt Ihnen seinen Wert im Schritt „Konformität“."
                    ]
                },
                {
                    "p": "Mit anderen Worten: Die Spezifikation sagt Ihnen, **was Ihr Kunde von Ihrem Produkt erwartet**, der Katalog prüft, **ob dessen Datenblatt vollständig ist**. Sie können die Spezifikation erfüllen und dennoch ein unvollständiges Datenblatt haben, und umgekehrt."
                },
                {
                    "p": "Nur einer der beiden hindert Sie am Einreichen: der Katalog. Hat Ihr Kunde einen blockierenden Katalog festgelegt, bleibt die Schaltfläche „Abschließen“ nicht verfügbar, solange ein Feld fehlt, und der Schritt „Konformität“ listet genau auf, welche — jede Zeile führt Sie zum Feld."
                },
                {
                    "note": "Eine Spezifikation kann auch Dokumente verlangen (ein Bio-Zertifikat, eine Bescheinigung über Gentechnikfreiheit). Diese erscheinen unter „Meine Dokumente“ und im Schritt Dokumente, mit ihren Gültigkeitsdaten — nicht im Katalog."
                },
                {
                    "links": [
                        {
                            "href": "/specs",
                            "icon": "menu_book",
                            "label": "Spezifikationen"
                        },
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "Meine Dokumente"
                        }
                    ]
                }
            ]
        },
        {
            "id": "frozen",
            "icon": "lock",
            "title": "Was eine gesperrte Liste bedeutet",
            "summary": "Eine von Ihrem Kunden validierte Liste wird schreibgeschützt. Das ist gewollt und auf Anfrage umkehrbar.",
            "blocks": [
                {
                    "p": "Wenn Ihr Kunde einen Abschnitt validiert — die Zutatenliste, den Fragebogen, die Allergene… — wird dieser Abschnitt **gesperrt**: Sie sehen ihn weiterhin mit allen Werten, können ihn aber nicht mehr ändern. Ein Vorhängeschloss und der Hinweis „Schreibgeschützt“ zeigen dies an."
                },
                {
                    "p": "Genau darum geht es: Sobald ein Wert validiert ist, wird er zur Referenz, auf die sich Ihr Kunde stützt (Kennzeichnung, Spezifikationen, Kontrollen). Könnte er sich ohne sein Wissen ändern, wäre seine Validierung wertlos."
                },
                {
                    "p": "Gesperrte Listen werden auch im Panel „Kontext“ des Assistenten unter „Validierte Listen“ aufgeführt: So sehen Sie am schnellsten, was feststeht und was noch offen ist."
                },
                {
                    "warn": "Einen Fehler in einer gesperrten Liste entdeckt? Legen Sie kein doppeltes Datenblatt an. Bitten Sie über die dem Datenblatt zugeordnete Diskussion um die Wiederöffnung des Abschnitts: Ihr Kunde entsperrt ihn und Sie können ihn wieder bearbeiten."
                },
                {
                    "p": "Ein ganzes Datenblatt kann auch aus einem anderen Grund schreibgeschützt sein: Die Aufgabe ist abgeschlossen, das Projekt ist geschlossen oder Sie haben nur Lesezugriff. Der Assistent zeigt an, welcher Fall vorliegt."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Diskussionen"
                        }
                    ]
                }
            ]
        },
        {
            "id": "confidence",
            "icon": "auto_awesome",
            "title": "Was die KI vorschlägt",
            "summary": "Vorschläge — niemals Werte, die an Ihrer Stelle eingetragen werden.",
            "blocks": [
                {
                    "p": "Wenn bei Ihrem Kunden die automatische Extraktion aktiviert ist, liest das Portal Ihre Dokumente und schlägt die gefundenen Werte vor. Sie erscheinen im Panel „Kontext“ rechts neben dem Formular und werden bei jedem Schrittwechsel neu gelesen — was Sie gerade eingegeben haben, verändert, was noch vorzuschlagen bleibt."
                },
                {
                    "p": "Alles beginnt mit dem **technischen Datenblatt** in der Kopfzeile des Assistenten. Solange es nicht hochgeladen ist, gibt es nichts zu lesen und die Vorschlagsliste bleibt leer: Das bedeutet das rote Band."
                },
                {
                    "ul": [
                        "**Übernehmen** — der Wert wird in das Datenblatt geschrieben. Vor diesem Klick wird nichts geschrieben.",
                        "**Erweitern** — für lange Analysen, die nicht in das Panel passen."
                    ]
                },
                {
                    "note": "Einen Vorschlag, den Sie nicht möchten, müssen Sie nicht ablehnen: Übernehmen Sie ihn einfach nicht, das ist bereits der Standard. Kein Wert wird jemals automatisch übernommen, wie sicher die Auslesung auch zu sein behauptet. Sie verantworten das Datenblatt: Die Entscheidung liegt bei Ihnen, Feld für Feld."
                },
                {
                    "p": "In jedem Fall ist der endgültige Wert Ihrer: Sie bleiben verantwortlich für das, was Sie validieren, und nichts erreicht Ihren Kunden, bevor Sie die Aufgabe abschließen."
                }
            ]
        },
        {
            "id": "documents",
            "icon": "folder_shared",
            "title": "Gültigkeit und Erneuerung von Dokumenten",
            "summary": "Das Portal weiß, welche Dokumente erwartet werden, wie lange sie gültig sind und welche fehlen.",
            "blocks": [
                {
                    "p": "Die erwarteten Dokumente sind keine Liste, die Sie erraten müssen: Ihr Kunde konfiguriert sie (Dokumenttyp, verpflichtend oder nicht, Gültigkeitsdauer, Umfang), und der Bildschirm „Meine Dokumente“ zeigt sie Ihnen unverändert an, Produkt für Produkt."
                },
                {
                    "ul": [
                        "**Gültig** — bereitgestellt, akzeptiert, und das Gültigkeitsende ist nicht nah.",
                        "**Zu erneuern** — das Gültigkeitsende liegt weniger als 60 Tage entfernt (eine Frist, die Ihr Kunde anpassen kann).",
                        "**Abgelaufen** — das Gültigkeitsende ist überschritten. Bei einem Pflichtdokument wird dadurch Ihre Freigabe ausgesetzt.",
                        "**Fehlend** — erwartet und nie bereitgestellt.",
                        "**Abgelehnt** — bereitgestellt, aber von Ihrem Kunden abgelehnt: Lesen Sie die Begründung, bevor Sie erneut hochladen."
                    ]
                },
                {
                    "p": "Jedes Dokument hat einen Gültigkeitszeitraum (Beginn und Ende), der in seiner Zeile angezeigt und so eingefärbt wird wie in beCPG: **grün**, solange es innerhalb seines Zeitraums liegt, **orange**, wenn die Frist näher rückt, **rot**, sobald sie überschritten ist."
                },
                {
                    "p": "Je nach Typ wird dieser Zeitraum automatisch aus dem Hochladedatum und der von Ihrem Kunden konfigurierten Dauer abgeleitet, oder **Sie geben ihn selbst ein**: Dann erscheinen im Hochladebereich zwei Datumsfelder, die Sie anhand des hochgeladenen Dokuments ausfüllen. Sie werden mit der Datei übertragen und bleiben danach über „Bearbeiten“ in der Zeile änderbar."
                },
                {
                    "warn": "Ein Pflichtdokument, dessen Gültigkeit nie ausgefüllt wurde, wird rot mit „Gültigkeit auszufüllen“ markiert. Ohne Enddatum läuft es nie ab, es wird keine Erinnerung versendet, und Ihr Kunde weiß nicht, seit wann es gilt."
                },
                {
                    "p": "Erneuern bedeutet, eine neue Version in derselben Zeile hochzuladen — niemals eine zweite Zeile anzulegen. Die vorherige Version bleibt mit ihrem eigenen Gültigkeitszeitraum in der Dokumenthistorie: Damit wird nachgewiesen, dass Sie zu einem früheren Zeitpunkt abgedeckt waren."
                },
                {
                    "note": "Dateiname und Ablageort spielen keine Rolle: Das Portal benennt und legt das Dokument gemäß der Konfiguration Ihres Kunden ab. Laden Sie die Datei so hoch, wie sie Ihnen übergeben wurde."
                },
                {
                    "p": "Erinnerungs-E-Mails vor dem Ablauf werden von beCPG nach den von Ihrem Kunden definierten Regeln versendet. Das Portal zeigt immer den tatsächlichen Stand: Verlassen Sie sich nicht auf die E-Mail, „Meine Dokumente“ ist die Referenz."
                },
                {
                    "links": [
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "Meine Dokumente"
                        }
                    ]
                }
            ]
        },
        {
            "id": "approval",
            "icon": "verified",
            "title": "Der Freigabestatus",
            "summary": "Live aus Ihren Dokumenten, Datenblättern und Abweichungen berechnet. Nie eingefroren.",
            "blocks": [
                {
                    "p": "Der auf dem Dashboard angezeigte Status ist keine von Hand eingegebene Entscheidung: Er wird bei jeder Anzeige aus Ihrer Akte neu berechnet. Beheben Sie die Ursache, und er ändert sich."
                },
                {
                    "ul": [
                        "**Gesperrt** — mindestens ein Pflichtdokument ist abgelaufen oder eine blockierende Abweichung ist offen.",
                        "**Zu erneuern** — mindestens ein Pflichtdokument läuft bald ab.",
                        "**In Bearbeitung** — ein Listungsprojekt ist offen, ein Pflichtdokument wurde nie bereitgestellt oder eine blockierende Prüfung ist nicht erfüllt.",
                        "**Freigegeben** — keiner der obigen Fälle."
                    ]
                },
                {
                    "p": "Die Dashboard-Karte listet die Gründe für den Status auf: Jeder ist anklickbar und führt Sie zu dem, was behoben werden muss."
                },
                {
                    "note": "Derselbe Status wird von den Einkaufssystemen Ihres Kunden gelesen. Ein abgelaufenes Pflichtdokument kann daher eine Bestellung blockieren, nicht nur eine orangefarbene Markierung anzeigen."
                }
            ]
        },
        {
            "id": "signature",
            "icon": "draw",
            "title": "So funktioniert die Signatur",
            "summary": "Sie werden zuerst zum Lesen und dann zum Unterzeichnen aufgefordert. Die Signatur wird von beCPG angebracht, nicht von Ihrem Browser.",
            "blocks": [
                {
                    "p": "Eine Signaturaufgabe öffnet das Dokument in einem im Portal integrierten Viewer. Die Datei verlässt das Portal nie und bleibt auf dem Smartphone nutzbar."
                },
                {
                    "ol": [
                        "**Lesen Sie das gesamte Dokument.** Der Lesefortschritt wird Seite für Seite erfasst: Solange eine Seite nicht angezeigt wurde, bleibt das Unterzeichnen nicht verfügbar.",
                        "**Zeichnen Sie Ihre Unterschrift** mit dem Finger, der Maus oder einem Stift an den von Ihrem Kunden vorbereiteten Stellen. Unterschrifts- und Paraphenfelder wurden vorab positioniert: Sie müssen sie nicht platzieren.",
                        "**Kreuzen Sie das Einverständniskästchen an** und senden Sie dann ab. Die Aufgabe wird einmal gesendet."
                    ]
                },
                {
                    "p": "beCPG signiert das Dokument auf seinem Server, archiviert die unterzeichnete Version und sendet sie per E-Mail an die Empfänger. Das Portal stellt kein eigenes Zertifikat aus."
                },
                {
                    "note": "Bricht das Netz während des Absendens ab, versuchen Sie es erneut: Die Anfrage trägt eine eindeutige Kennung, sodass eine doppelt eingegangene Anfrage nicht doppelt signiert. Ein bereits unterzeichnetes Dokument wird als solches mit seinem Download angezeigt, statt Sie erneut zur Unterschrift aufzufordern."
                },
                {
                    "warn": "Eine Signatur kann im Portal weder abgelehnt noch rückgängig gemacht werden. Ist das Dokument fehlerhaft, unterzeichnen Sie nicht: Öffnen Sie die Diskussion und informieren Sie Ihren Kunden."
                }
            ]
        },
        {
            "id": "discussion",
            "icon": "forum",
            "title": "Wo die Anmerkungen Ihres Kunden ankommen",
            "summary": "Eine Unterhaltung pro Datenblatt, aber jede Nachricht ist an ihr Thema gebunden.",
            "blocks": [
                {
                    "p": "Die Diskussion eines Datenblatts ist auf beiden Seiten dieselbe: Was Ihr Kunde in beCPG schreibt, erreicht Sie hier, und Ihre Antworten erreichen ihn dort. Es gibt kein separates Postfach zu überwachen."
                },
                {
                    "p": "Eine Nachricht kann an drei Stellen verankert werden, und die Auswahl oben im Panel lässt Sie wählen, welche Sie lesen oder adressieren:"
                },
                {
                    "ul": [
                        "**Das gesamte Datenblatt** — die vollständige Unterhaltung, einschließlich der Anmerkungen zu einem Feld oder einer Tabellenzeile. Das ist die Standardansicht.",
                        "**Ein Feld** — „die Firmierung ist unvollständig“. Neben diesem Feld erscheint dann eine Sprechblase im Assistenten.",
                        "**Eine Tabellenzeile** — „die gesättigten Fettsäuren sind falsch“. Die Anmerkung folgt der Zeile, nicht der Zeilennummer."
                    ]
                },
                {
                    "note": "Von einem Feld oder einer Zeile aus statt von „Das gesamte Datenblatt“ zu schreiben spart allen Zeit: Ihr Ansprechpartner sieht sofort, worum es geht, ohne zweihundert Felder zu durchsuchen."
                },
                {
                    "p": "Die Diskussion ist schreibgeschützt, sobald die Listung abgeschlossen ist: Sie können den Austausch nachlesen, aber nichts hinzufügen. Der Bildschirm zeigt an, welcher Grund vorliegt."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Diskussionen"
                        }
                    ]
                }
            ]
        },
        {
            "id": "contact",
            "icon": "support_agent",
            "title": "An wen Sie sich wenden",
            "summary": "Ihr Ansprechpartner ist Ihr Kunde. Die dem Datenblatt zugeordnete Diskussion ist der richtige Kanal.",
            "blocks": [
                {
                    "p": "Dieses Portal wird Ihnen von Ihrem Kunden bereitgestellt: Er konfiguriert die erwarteten Dokumente, die Assistentenschritte, die Validierungen und die Fristen. Er ist daher Ihr erster Ansprechpartner für alle inhaltlichen Fragen."
                },
                {
                    "ul": [
                        "**Eine Frage zu einem Datenblatt, eine Anmerkung, eine Korrektur, eine zu entsperrende Liste** — nutzen Sie die dem Datenblatt oder der Aufgabe zugeordnete Diskussion. Ihre Nachricht erreicht die Person, die Ihre Akte betreut, und bleibt dem betroffenen Produkt zugeordnet.",
                        "**Ein ohne klare Begründung abgelehntes Dokument** — antworten Sie in der Produktdiskussion, bevor Sie erneut hochladen.",
                        "**Eine Frist, die Sie nicht einhalten können** — sagen Sie es in der Diskussion, statt die Aufgabe überfällig werden zu lassen.",
                        "**Ein Zugangsproblem** (Passwort, Kollege hinzuzufügen, Konto zu schließen) — wenden Sie sich an Ihren Ansprechpartner beim Kunden: Konten werden auf seiner Seite angelegt und geschlossen, nicht über dieses Portal."
                    ]
                },
                {
                    "note": "Die von Ihnen angegebenen Kontakte und die Kontakte Ihres Kunden sind in Ihrem Lieferantendatenblatt auf der Registerkarte Kontakte aufgeführt."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Diskussionen"
                        },
                        {
                            "href": "/company",
                            "icon": "business",
                            "label": "Mein Unternehmen"
                        },
                        {
                            "href": "/specs",
                            "icon": "menu_book",
                            "label": "Spezifikationen"
                        }
                    ]
                }
            ]
        }
    ],
    "app/login/page#PAGE_TEXT": {
        "welcome": "Willkommen",
        "intro": "Melden Sie sich an, um Ihren Lieferantenbereich zu öffnen: Ihre Aufgaben, Ihre Produkte, Ihre Dokumente und Ihren Freigabestatus.",
        "chooseTenant": "Kunden auswählen",
        "chooseTenantHelp": "Sie arbeiten für mehrere beCPG-Kunden? Wählen Sie den Kunden, dessen Akte Sie öffnen möchten.",
        "sso": "Sie werden zum Authentifizierungsdienst Ihres Kunden weitergeleitet.",
        "testNotice": "TEST-Instanz — hier eingegebene Daten sind nicht vertraglich verbindlich.",
        "help": "Benötigen Sie Hilfe?",
        "errorTitle": "Anmeldung fehlgeschlagen",
        "pitch": "Das beCPG-Lieferantenportal",
        "sellingPoints": [
            {
                "icon": "assignment_turned_in",
                "text": "Ihre Listungsanfragen und Aufgaben an einem Ort"
            },
            {
                "icon": "folder_shared",
                "text": "Ihre Dokumente und Zertifikate mit ihren Ablaufdaten"
            },
            {
                "icon": "verified",
                "text": "Ihr Freigabestatus, von Ihrem Kunden aktuell gehalten"
            }
        ]
    },
    "app/login/page#ERROR_TEXT": {
        "oidc_not_configured": "Die Authentifizierung ist für diesen Kunden nicht konfiguriert.",
        "tenant_mismatch": "Ihre Sitzung gehörte zu einem anderen Kunden. Bitte melden Sie sich erneut an.",
        "dev_auth_misconfigured": "Der Entwicklungsmodus ist aktiv, aber falsch konfiguriert.",
        "session_expired": "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an."
    },
    "app/messages/page#LABELS": {
        "title": "Diskussionen",
        "subjects": "Themen",
        "messageCount": "{count} Nachricht(en)",
        "search": "Thema suchen",
        "myRecord": "Mein Lieferantendatensatz",
        "back": "Themen",
        "placeholder": "Nachricht schreiben…",
        "send": "Senden",
        "sending": "Wird gesendet…",
        "empty": "Keine Nachricht",
        "emptyHint": "Beginnen Sie die Diskussion — der Kunde wird benachrichtigt.",
        "noSubject": "Thema auswählen",
        "noSubjectHint": "Wählen Sie ein Produkt oder Ihren Datensatz, um den Austausch zu sehen.",
        "noSubjects": "Kein Diskussionsthema",
        "noSubjectsHint": "Diskussionen hängen an Ihren Produkten. Derzeit ist Ihnen kein Produkt zugeordnet.",
        "field": "Feld",
        "edited": "bearbeitet",
        "you": "Sie",
        "openSubject": "Datenblatt öffnen",
        "thread": "Diskussion",
        "more": "Mehr laden",
        "loading": "Wird geladen…",
        "tooLong": "Nachricht zu lang (maximal 20.000 Zeichen).",
        "denyReasons": {
            "noAssignedTask": "Die Listung ist abgeschlossen: Diese Diskussion ist schreibgeschützt.",
            "readAccess": "Sie haben nur Lesezugriff auf dieses Datenblatt.",
            "noPermission": "Sie dürfen in dieser Diskussion nicht schreiben."
        }
    },
    "app/monitor/campaigns/[id]/page#LABELS": {
        "back": "Projekte",
        "notFound": "Projekt nicht gefunden",
        "notFoundHint": "Dieses Projekt existiert nicht, ist kein Lieferantenprojekt oder liegt außerhalb Ihres Bereichs.",
        "kpi": {
            "response": "Antwortquote",
            "age": "Offen seit",
            "due": "Fälligkeitsdatum",
            "tasks": "Offene Aufgaben"
        },
        "hints": {
            "days": "{count} T",
            "noDue": "Kein Fälligkeitsdatum",
            "overdue": "{count} T überfällig",
            "dueIn": "in {count} T",
            "late": "{count} überfällig",
            "unanswered": "Keine Antwort seit der Eröffnung"
        },
        "tasks": "Offene Aufgaben",
        "tasksEmpty": "Keine offene Aufgabe in diesem Projekt.",
        "tasksHint": "Worauf der Workflow wartet, und von wem.",
        "noAssignee": "Nicht zugewiesen",
        "entities": "Worum es im Projekt geht",
        "entitiesHint": "Öffnen Sie das Datenblatt, um die eingegebenen Daten und die Diskussion zu lesen.",
        "entitiesEmpty": "Dieses Projekt verweist auf kein Datenblatt.",
        "unreadable": "Außerhalb Ihres Bereichs",
        "open": "Öffnen",
        "suppliers": "Lieferanten",
        "manager": "Verantwortlicher",
        "discussion": "Projektdiskussion",
        "state": "Status"
    },
    "app/monitor/campaigns/page#LABELS": {
        "title": "Projekte",
        "subtitle": "Offene Listungs- und Erneuerungsprojekte. Wählen Sie Projekte aus, um deren Lieferanten zu erinnern oder zu eskalieren.",
        "stats": {
            "open": "Offene Projekte",
            "openState": "Projekte · {state}",
            "response": "Antwortquote",
            "unanswered": "Keine Antwort",
            "reminders": "Fällige Erinnerungen"
        },
        "hints": {
            "scanned": "{count} durchsucht",
            "meanCompletion": "Durchschnittlicher Fortschritt {value}%",
            "escalations": "{count} zu eskalieren",
            "late": "{count} überfällig",
            "noEscalation": "Keine Eskalation erforderlich",
            "answered": "{count} beantwortet"
        },
        "startCampaign": "Projekt starten",
        "allOpen": "Alle offenen Projekte",
        "state": "Projektstatus",
        "sortLabel": "Sortieren nach",
        "sorts": {
            "dueDate": "Frühestes Fälligkeitsdatum",
            "completion": "Niedrigste Antwortquote",
            "age": "Am längsten offen",
            "name": "Name"
        },
        "searchSupplier": "Nach Lieferant filtern",
        "truncated": "Suchfenster: beCPG begrenzt eine Auflistung auf 250 Zeilen, und {scanned} Projekt(e) wurden gelesen. Sortierung und Summen auf dieser Seite beziehen sich auf dieses Fenster — schränken Sie Status oder Bereich ein, um eine vollständige Ansicht zu erhalten.",
        "scopeEmpty": "Kein Lieferant entspricht diesem Bereich. Kein Projekt kann ihm zugeordnet werden: Die Zähler oben sind konstruktionsbedingt null, keine Messwerte.",
        "parkScoped": "Zähler auf den gefilterten Bereich beschränkt ({count} Lieferant(en)).",
        "noRate": "Kein Projekt zu bewerten",
        "unsupported": "Vom beCPG-Standardmodell nicht unterstützte(r) Filter: {names}. Konfigurieren Sie ihn kundenseitig.",
        "pageOf": "{from}-{to} von {total} Projekten",
        "previous": "Zurück",
        "next": "Weiter",
        "rows": "Zeilen",
        "reminder": "Ihr offenes Projekt im Portal wartet noch auf Ihre Antwort. Bitte erledigen Sie die Ihnen zugewiesenen Aufgaben so bald wie möglich.",
        "hintTargets": "Lieferanten der ausgewählten Projekte",
        "noteReminder": "beCPG führt kein Erinnerungsprotokoll: Die Spalte „Letzte Erinnerung“ zeigt die letzte Aktivität im Projekt, die nächstliegende tatsächlich verfügbare Information.",
        "truncatedShort": "Fenster: {scanned} Projekte gelesen"
    },
    "app/monitor/documents/page#LABELS": {
        "title": "Dokumentenkonformität",
        "views": "Konformitätsansichten",
        "matrixView": "Matrix",
        "sceneView": "3D-Ansicht",
        "subtitle": "Matrix Lieferant × Dokumenttyp. Wählen Sie Zellen oder Zeilen aus, um eine Sammelerinnerung zu senden.",
        "search": "Lieferanten suchen",
        "allTypes": "Alle Dokumenttypen",
        "allStatuses": "Alle Status",
        "mandatoryOnly": "Nur Pflichtdokumente",
        "export": "Exportieren",
        "stats": {
            "suppliers": "Lieferanten",
            "missing": "Fehlend",
            "expired": "Abgelaufen",
            "expiring": "Zu erneuern",
            "refused": "Abgelehnt"
        },
        "statuses": {
            "valid": "Gültig",
            "expiring": "Läuft bald ab",
            "expired": "Abgelaufen",
            "missing": "Fehlend",
            "refused": "Abgelehnt",
            "toValidate": "In Prüfung"
        },
        "truncatedShort": "Fenster: {scanned} Lieferanten gelesen",
        "truncated": "Lieferantenbestand größer als das Suchfenster ({scanned} von {total} Lieferanten): Schränken Sie die Filter ein, um eine vollständige Matrix zu erhalten.",
        "scopeEmpty": "Kein Lieferant entspricht diesem Bereich. Es wurde keine Dokumentenabfrage ausgeführt: Die Zähler oben sind konstruktionsbedingt null, keine Messwerte.",
        "cellsScope": "Zellen · über die {total} Lieferanten des Bestands",
        "statusScope": "Anzeigefilter „{status}“: {kept} von {shown} auf dieser Seite angezeigten Zeile(n) beibehalten. Die Zähler oben beziehen sich auf die {total} Lieferanten des Bestands, nicht auf diese Seite.",
        "unsupported": "Vom beCPG-Standardmodell nicht unterstützte(r) Filter: {names}. Konfigurieren Sie ihn kundenseitig.",
        "pageOf": "{from}-{to} von {total} Lieferanten",
        "previous": "Zurück",
        "next": "Weiter",
        "rows": "Zeilen",
        "reminder": "In Ihrer Lieferantenakte sind Dokumente im Portal zu aktualisieren: {types}. Bitte laden Sie sie so bald wie möglich hoch.",
        "reminderGeneric": "In Ihrer Lieferantenakte fehlen Pflichtdokumente oder sind abgelaufen. Bitte aktualisieren Sie sie im Portal.",
        "hintTypes": "{count} Dokumenttyp(en) betroffen"
    },
    "app/monitor/layout#LABELS": {
        "metaTitle": "Lieferantenüberwachung — beCPG",
        "metaDescription": "Der Lieferantenbestand auf einen Blick: Dokumentenkonformität und Projekte",
        "title": "Überwachungsbereich",
        "denied": "Der Überwachungsbereich ist internen Teams vorbehalten",
        "deniedGroups": "Ihr Konto gehört keiner der beCPG-Gruppen an, die den Überwachungsbereich öffnen: {groups}. Bitten Sie Ihren beCPG-Administrator um die Mitgliedschaft.",
        "backSupplier": "Zu meinem Dashboard"
    },
    "app/monitor/page#LABELS": {
        "title": "Überwachung des Lieferantenbestands",
        "description": "Freigabe, Dokumentenkonformität, Abläufe, Projekte und Abweichungen Ihres Lieferantenstamms, in Echtzeit.",
        "generatedAt": "Datenstand {time}",
        "truncated": "Lieferantenbestand größer als das Suchfenster: {scanned} von {total} Lieferanten gelesen. Mit „≈“ markierte Zähler sind begrenzt; die Aufschlüsselung und die Top 10 beziehen sich auf das Fenster.",
        "truncatedShort": "Fenster: {scanned} Lieferanten gelesen",
        "tablist": "Auswertung des Lieferantenbestands",
        "tabs": {
            "quality": "Qualität",
            "purchasing": "Einkauf",
            "rnd": "F&E",
            "csr": "CSR",
            "assistant": "Assistent"
        },
        "ai": "KI"
    },
    "app/monitor/products/page#LABELS": {
        "title": "Lieferantenprodukte",
        "subtitle": "Die einem Lieferanten anvertrauten Produkte. Filtern Sie nach dem Zertifikatsdatum, um zu sehen, was zur Erneuerung ansteht.",
        "search": "Produkt, Code, Firmierung suchen…",
        "state": "Produktstatus",
        "anyState": "Alle Status",
        "certified": "Zertifikatsdatum",
        "anyCertified": "Alle Daten",
        "certifiedNone": "Kein Datum",
        "certifiedYears": "Vor mehr als {count} Jahr(en) zertifiziert",
        "columns": {
            "name": "Produkt",
            "code": "Code",
            "supplierRef": "Lieferantenreferenz",
            "suppliers": "Lieferant(en)",
            "plants": "Lieferantenwerke",
            "state": "Status",
            "certificate": "Zertifikatsdatum",
            "modified": "Aktualisiert"
        },
        "age": "vor {count} Jahr(en)",
        "ageMonths": "vor {count} Monat(en)",
        "none": "—",
        "empty": "Kein Produkt in diesem Bereich",
        "emptyHint": "Mit diesen Filtern trägt keine Produktentität den Lieferantenaspekt. Produkte erscheinen hier, sobald ihnen ein Lieferant zugeordnet ist.",
        "pageOf": "{from} - {to} von {total}",
        "previous": "Vorherige Seite",
        "next": "Nächste Seite",
        "rows": "Zeilen pro Seite",
        "sortScope": "Die Sortierung gilt für die angezeigte Seite, nicht für den gesamten Bestand.",
        "tiles": {
            "total": "Produkte",
            "valid": "Freigegeben",
            "draft": "Simulation",
            "noCertificate": "Ohne Listungsdatum"
        }
    },
    "app/monitor/quality/[id]/page#LABELS": {
        "back": "Abweichungen",
        "notFound": "Abweichung nicht gefunden",
        "notFoundHint": "Sie existiert nicht oder liegt außerhalb Ihres Bereichs.",
        "blocking": "Blockierend",
        "priority": "Priorität",
        "product": "Produkt",
        "suppliers": "Lieferanten",
        "batch": "Charge",
        "created": "Erstellt am",
        "modified": "Aktualisiert",
        "cost": "Kosten",
        "discussion": "Diskussion"
    },
    "app/monitor/quality/page#LABELS": {
        "title": "Abweichungen",
        "startNc": "Abweichung starten",
        "subtitle": "Lieferanten-NCs, Bearbeitungsdauer und Fortschritt der Korrekturmaßnahmen. Wählen Sie NCs aus, um die betroffenen Lieferanten zu erinnern, zu eskalieren oder zu sperren.",
        "stats": {
            "open": "Offene NCs",
            "blocking": "Blockierend",
            "overdue": "Ziel überschritten",
            "delay": "Mittlere Dauer"
        },
        "hints": {
            "total": "{count} insgesamt",
            "blocking": "Setzt den Freigabestatus auf „gesperrt“",
            "noBlocking": "Keine Freigabe durch eine NC blockiert",
            "actionsLate": "{count} Korrekturmaßnahme(n) überfällig",
            "noActionsLate": "Keine überfällige Korrekturmaßnahme",
            "closing": "Mittlere Abschlussdauer {value} T",
            "noClosing": "Keine geschlossene NC in diesem Bereich",
            "closingHidden": "{count} geschlossene Abweichung(en) · klicken, um sie einzubeziehen"
        },
        "dayUnit": "T",
        "allStates": "Alle Status",
        "allTypes": "Alle Typen",
        "includeClosed": "Geschlossene NCs einbeziehen",
        "searchSupplier": "Nach Lieferant filtern",
        "truncatedShort": "Fenster: {scanned} Abweichungen gelesen",
        "truncated": "Mehr NCs als das Suchfenster ({scanned} durchsucht): Schränken Sie die Filter ein, um eine vollständige Ansicht zu erhalten.",
        "inexact": "Ungefähre Zähler: Die Suchmaschine hat für mindestens eine Abfrage eine begrenzte Summe zurückgegeben.",
        "scopeEmpty": "Kein Lieferant entspricht diesem Bereich. Es wurde keine Abfrage ausgeführt: Die Zähler oben sind konstruktionsbedingt null, keine Messwerte.",
        "unsupported": "Vom beCPG-Standardmodell nicht unterstützte(r) Filter: {names}. Konfigurieren Sie ihn kundenseitig.",
        "pageOf": "{from}-{to} von {total} NCs",
        "previous": "Zurück",
        "next": "Weiter",
        "rows": "Zeilen",
        "reminder": "Eine offene Abweichung betrifft Sie. Bitte bearbeiten Sie die zugehörigen Korrekturmaßnahmen so bald wie möglich im Portal.",
        "hintTargets": "Lieferanten der ausgewählten NCs",
        "note": "Bearbeitungsdauer: seit Anlage der NC; bei einer geschlossenen NC zwischen ihrer Anlage und ihrer letzten Änderung — beCPG speichert kein Abschlussdatum."
    },
    "app/monitor/suppliers/[id]/page#LABELS": {
        "back": "Lieferanten",
        "notFound": "Lieferant nicht gefunden",
        "notFoundHint": "Dieser Lieferant existiert nicht oder liegt außerhalb Ihres Bereichs.",
        "tiles": {
            "label": "Lieferantenkennzahlen",
            "nc": "Blockierende NCs",
            "ncHint": "offen",
            "projects": "Laufende Projekte",
            "projectsHint": "{count} ohne Antwort",
            "documents": "Pflichtdokumente",
            "documentsHint": "{expired} abgelaufen · {missing} fehlend",
            "documentsNone": "keine erwartet",
            "products": "Produkte",
            "productsHint": "verknüpft",
            "delay": "Antwortzeit",
            "delayHint": "Mittelwert {period}",
            "delayNone": "Entscheidungsmodul",
            "completion": "Vollständigkeit",
            "completionHint": "{count} aktive(r) Katalog(e)",
            "completionNone": "kein aktiver Katalog",
            "days": "T"
        },
        "tabs": {
            "label": "Lieferantenblatt",
            "overview": "Übersicht",
            "nc": "Abweichungen",
            "projects": "Projekte",
            "documents": "Dokumente",
            "products": "Produkte",
            "subSuppliers": "Unterlieferanten",
            "history": "Verlauf"
        },
        "status": "Freigabestatus",
        "statusHelp": "Der Status wird bei jeder Anzeige berechnet, nie gespeichert: Die erste erfüllte Regel gilt.",
        "risk": "Risikoscore",
        "riskHelp": "Jeder Grund fügt sein Gewicht hinzu; jedes weitere Auftreten fügt einen abnehmenden Zuschlag hinzu.",
        "riskFrom": "ab {from}",
        "reasonNames": {
            "documentExpired": "Abgelaufenes Dokument",
            "blockingNc": "Blockierende NC",
            "campaignNoAnswer": "Projekt ohne Antwort",
            "scoreDropping": "Sinkende Bewertung",
            "documentExpiring": "Ablaufendes Dokument",
            "lateTask": "Überfällige Aufgabe",
            "lowCompletion": "Geringe Vollständigkeit",
            "documentMissing": "Fehlendes Dokument",
            "openNc": "Offene NC"
        },
        "activity": "Aktivität und Reaktionsfähigkeit",
        "activityHelp": "Dem Lieferanten zugewiesene Aufgaben und mittlere Antwortzeit pro Jahr, aus dem Entscheidungsmodul gelesen.",
        "identity": "Identität",
        "identityRows": {
            "code": "Code",
            "erpCode": "ERP-Code",
            "legalName": "Firmenname",
            "state": "beCPG-Status",
            "family": "Familie",
            "subFamily": "Unterfamilie",
            "sites": "Standorte",
            "subsidiaries": "Tochtergesellschaften",
            "parent": "Übergeordneter Lieferant",
            "catalogs": "Aktive Kataloge"
        },
        "scorecard": "Bewertung",
        "scorecardHelp": "Gewichteter Mittelwert der bewerteten Kriterien aus den letzten Projekten des Lieferanten.",
        "allNc": "Alle NCs",
        "startNc": "NC starten",
        "exchanges": "Austausch",
        "ncFile": "lieferanten-ncs",
        "projectsFile": "lieferanten-projekte",
        "none": "—"
    },
    "app/monitor/suppliers/page#LABELS": {
        "title": "Lieferanten",
        "statuses": {
            "suspended": "Gesperrt",
            "toRenew": "Zu erneuern",
            "inProgress": "In Bearbeitung",
            "approved": "Freigegeben"
        },
        "statusFiltered": "Filter aktiv",
        "export": "Export (CSV)",
        "exportCutTitle": "Unvollständiger Export: {scanned} von {total} Zeilen",
        "exportCutMessage": "beCPG begrenzt eine Auflistung auf 250 Zeilen pro Abfrage, daher umfasst der Export das gelesene Fenster, nicht den gesamten Bestand. Schränken Sie die Filter ein (Familie, Einkäufer, Status) und exportieren Sie in Teilen, um eine vollständige Datei zu erhalten.",
        "exportCutConfirm": "Fenster exportieren",
        "generatedAt": "Datenstand {time}",
        "windowOf": "{from}-{to} von {total} Lieferanten",
        "previous": "Vorheriges Fenster",
        "next": "Nächstes Fenster",
        "truncated": "Lieferantenbestand größer als das Suchfenster ({scanned} von {total} gelesen): Sortierung und Rangfolge beziehen sich auf dieses Fenster. Schränken Sie die Filter ein, um eine exakte Rangfolge über den gesamten Bestand zu erhalten.",
        "sortScope": "Innerhalb des gelesenen Fensters sortiert",
        "sortedBy": "Anfangssortierung: {sort}",
        "reminder": "Guten Tag,\n\nIhre Lieferantenakte muss aktualisiert werden (Pflichtdokumente fehlen, sind abgelaufen oder ausstehend).\nBitte melden Sie sich im Portal an, um sie zu vervollständigen.\n\nMit freundlichen Grüßen",
        "countsScope": "Aufschlüsselung über die {scanned} gelesenen Lieferanten",
        "sortNames": {
            "risk": "Risiko, absteigend",
            "name": "Name",
            "code": "Code",
            "status": "Freigabestatus",
            "completion": "Vollständigkeit",
            "expiring": "ablaufende Dokumente",
            "expired": "abgelaufene Dokumente",
            "nc": "offene NCs",
            "lastActivity": "letzte Aktivität"
        },
        "truncatedShort": "Fenster: {scanned} Lieferanten gelesen"
    },
    "app/not-found#LABELS": {
        "title": "Seite nicht gefunden",
        "message": "Diese Adresse existiert nicht, oder das Element, auf das sie verweist, ist nicht mehr zugänglich. Wenn Sie über eine E-Mail hierher gelangt sind, ist der Link möglicherweise abgelaufen.",
        "home": "Zurück zur Startseite"
    },
    "app/products/[id]/page#LABELS": {
        "sheet": "Datenblatt",
        "notFound": "Produkt nicht gefunden",
        "notFoundHint": "Dieses Datenblatt existiert nicht oder gehört nicht zu Ihrem Bereich.",
        "back": "Meine Produkte",
        "monitorBack": "Lieferantenprodukte",
        "versionTitle": "Version {label} vom {date}",
        "versionBy": "von {author}",
        "versionBack": "Zurück zur aktuellen Version",
        "versionFailed": "Diese Version konnte nicht gelesen werden.",
        "request": "Aktualisierung anfordern",
        "startProject": "Projekt starten",
        "partial": "Dieses Datenblatt wird unvollständig angezeigt: Es verweist auf mindestens eine Information, die Ihr Konto nicht lesen darf. Die betroffenen Felder fehlen auf dem Bildschirm — was nicht bedeutet, dass sie leer sind. Bitten Sie Ihren beCPG-Ansprechpartner um Zugriff, wenn Sie eines davon benötigen."
    },
    "app/products/page#LABELS": {
        "title": "Meine Produkte",
        "search": "Produkt suchen",
        "allStates": "Alle Status",
        "allTypes": "Alle Typen",
        "branch": "Aktualisierung",
        "branchFrom": "Aktualisierung der Version {version}",
        "columns": {
            "name": "Produkt",
            "code": "Code",
            "type": "Typ",
            "state": "Status",
            "completion": "Vollständigkeit",
            "project": "Projekt",
            "supplierRef": "Lieferantenreferenz",
            "certificateDate": "Zertifikatsdatum",
            "modified": "Aktualisiert",
            "actions": "Aktionen"
        },
        "stats": {
            "total": "Produkte",
            "valid": "Validiert",
            "pending": "In Bearbeitung",
            "completion": "Durchschnittliche Vollständigkeit"
        },
        "empty": "Kein Produkt",
        "emptyHint": "Ihnen ist noch kein Produkt zugeordnet. Ein Datenblatt erscheint hier, sobald der Kunde eines zuweist.",
        "request": "Aktualisierung anfordern"
    },
    "app/specs/page#LABELS": {
        "title": "Spezifikationen",
        "stats": {
            "specs": "Spezifikationen",
            "products": "Abgedeckte Produkte"
        },
        "emptyHint": "Für Sie ist keine Spezifikation verfügbar. Der Kunde teilt eine mit Ihnen, falls eine zutrifft."
    },
    "app/tasks/[id]/page#LABELS": {
        "loading": "Aufgabe",
        "notFound": "Aufgabe nicht gefunden",
        "notFoundHint": "Diese Aufgabe existiert nicht mehr, wurde bereits bearbeitet oder gehört nicht zu Ihrem Bereich.",
        "back": "Meine Aufgaben",
        "noEntity": "Diese Aufgabe verweist auf kein Datenblatt",
        "noEntityHint": "Das dieser Aufgabe zugeordnete Ergebnis verweist auf kein Produkt. Wenden Sie sich über die Projektdiskussion an Ihren Kunden.",
        "documents": "Bereitzustellende Dokumente",
        "viewDocument": "Dokument anzeigen",
        "due": "Fällig am {date}",
        "late": "Überfällig",
        "done": "Abgeschlossen",
        "discussion": "Diskussion"
    },
    "app/tasks/page#LOCAL": {
        "title": "Meine Aufgaben",
        "search": "Aufgabe, Produkt, Code suchen…",
        "anyType": "Alle Typen",
        "anyPriority": "Alle Prioritäten",
        "anyProduct": "Alle Produkte",
        "anyDue": "Alle Fälligkeiten",
        "dueLate": "Überfällig",
        "dueToday": "Heute",
        "dueWeek": "Innerhalb von 7 Tagen",
        "dueMonth": "Innerhalb von 30 Tagen",
        "dueNone": "Kein Fälligkeitsdatum",
        "stateOpen": "In Bearbeitung",
        "stateDone": "Abgeschlossen",
        "colTask": "Aufgabe",
        "colProduct": "Produkt / Kunde",
        "colType": "Typ",
        "colPriority": "Priorität",
        "colDue": "Fälligkeitsdatum",
        "colProgress": "Fortschritt",
        "kpiTotal": "Aufgaben",
        "kpiLate": "Überfällig",
        "kpiReview": "Zu prüfen",
        "kpiNext": "Nächste Fälligkeit",
        "kpiNone": "Keine",
        "reset": "Zurücksetzen",
        "empty": "Keine Aufgabe",
        "emptyHint": "Derzeit wird nichts von Ihnen erwartet.",
        "emptyFiltered": "Keine Aufgabe entspricht diesen Filtern.",
        "truncated": "Nur die ersten Aufgaben werden angezeigt. Schränken Sie die Filter ein, um den Rest zu sehen.",
        "scoped": "Bereich: {supplier}.",
        "scopedAll": "Bereich: alle Lieferanten.",
        "orphans": "{count} Aufgabe(n) sind keinem Ihrer Lieferantendatensätze zugeordnet und werden hier nicht aufgeführt. Wählen Sie oben rechts „Alle Lieferanten“, um sie zu sehen.",
        "priorityHigh": "Hoch",
        "priorityMedium": "Mittel",
        "priorityLow": "Niedrig",
        "noPriority": "Keine Priorität",
        "untitled": "Aufgabe ohne Titel",
        "caption": "Meine Aufgabenliste"
    },
    "components/dashboard/ActionsCard#LOCAL": {
        "title": "Erforderliche Aktionen",
        "open": "offene Aufgabe(n)",
        "late": "{count} überfällig",
        "onTime": "Keine überfällig",
        "nextDue": "Nächste Fälligkeit: {date}",
        "noDue": "Keine geplante Fälligkeit",
        "none": "Derzeit nichts zu tun",
        "all": "Alle meine Aufgaben anzeigen"
    },
    "components/dashboard/ActionsCard#TASK_TYPE_META.wizard": "Assistent",
    "components/dashboard/ActionsCard#TASK_TYPE_META.signature": "Signatur",
    "components/dashboard/ActionsCard#TASK_TYPE_META.document": "Dokument",
    "components/dashboard/ActionsCard#TASK_TYPE_META.review": "Prüfung",
    "components/dashboard/ApprovalCard#REASONS": {
        "documentExpired": "Pflichtdokument abgelaufen",
        "documentExpiring": "Dokument läuft bald ab",
        "documentMissing": "Erwartetes Dokument nicht bereitgestellt",
        "documentRefused": "Dokument abgelehnt",
        "catalogIncomplete": "Unvollständiger Datensatz",
        "openProject": "Offenes Listungsprojekt",
        "openNonConformity": "Offene Abweichung"
    },
    "components/dashboard/ApprovalCard#LOCAL": {
        "title": "Freigabestatus",
        "validUntil": "Gültig bis {date}",
        "noValidity": "Keine bekannte Frist",
        "why": "Warum?",
        "unknown": "Status nicht verfügbar",
        "unknownHint": "Der Status konnte nicht berechnet werden. Bitte versuchen Sie es später erneut.",
        "allGood": "Nichts blockiert"
    },
    "components/dashboard/CompletionCard#LOCAL": {
        "title": "Vollständigkeit",
        "scope": "{scored} von {total} Produkt(en) bewertet",
        "noScore": "Noch kein Katalog bewertet",
        "noScoreHint": "Die Vollständigkeit erscheint, sobald ein Produkt formuliert wurde.",
        "seeProducts": "Meine Produkte anzeigen",
        "worst": "Am wenigsten vollständige Kataloge"
    },
    "components/dashboard/DiscussionList#LOCAL": {
        "title": "Meine Diskussionen",
        "empty": "Keine Diskussion",
        "emptyHint": "Die Anmerkungen Ihres Kunden zu Ihren Aufgaben und Produkten erscheinen hier.",
        "all": "Alle anzeigen",
        "messages": "{count} Nachricht(en)",
        "anonymous": "Benutzer",
        "onField": "zu {field}",
        "unread": "Neu",
        "unreadCount": "{count} ungelesen"
    },
    "components/dashboard/DocumentList#LOCAL": {
        "title": "Meine Dokumente",
        "empty": "Kein erwartetes Dokument",
        "emptyHint": "Die von Ihrem Kunden geforderten Zertifikate erscheinen hier.",
        "all": "Alle anzeigen",
        "supplierScope": "Lieferant",
        "mandatory": "Verpflichtend",
        "until": "Bis {date}",
        "expiredSince": "Seit {days} T abgelaufen",
        "expiresIn": "Läuft in {days} T ab",
        "noValidity": "Kein Enddatum",
        "upload": "Neue Version hochladen",
        "uploadFirst": "Dokument hochladen",
        "download": "Herunterladen",
        "uploading": "Wird hochgeladen…",
        "uploaded": "Dokument hochgeladen. Es wartet nun auf die Validierung durch Ihren Kunden."
    },
    "components/dashboard/DocumentsCard#LOCAL": {
        "title": "Dokumente",
        "valid": "Gültig",
        "expiring": "Läuft ab < {days} T",
        "expired": "Abgelaufen",
        "missing": "Fehlend",
        "refused": "Abgelehnt",
        "total": "{count} verfolgte(s) Dokument(e)",
        "none": "Kein verfolgtes Dokument",
        "unavailable": "Die Dokumentenverfolgung ist auf dieser Instanz nicht verfügbar.",
        "all": "Meine Dokumente anzeigen",
        "toHandle": "zu bearbeiten"
    },
    "components/dashboard/NotificationList#NOTIFICATION_LABELS": {
        "title": "Meine Benachrichtigungen",
        "empty": "Keine Benachrichtigung",
        "emptyHint": "Derzeit erfordert nichts Ihre Aufmerksamkeit.",
        "overdue": "{days} T überfällig",
        "expiresIn": "In {days} T",
        "types": {
            "task.overdue": "Überfällige Aufgabe",
            "document.expired": "Abgelaufenes Dokument",
            "document.expiring": "Zu erneuerndes Dokument",
            "document.missing": "Fehlendes Dokument",
            "document.refused": "Abgelehntes Dokument"
        },
        "assigned": "Mir zugewiesen",
        "mandatory": "Verpflichtend",
        "isNew": "Neu",
        "scopeEmpty": {
            "noSupplierIdentity": "Ihr Konto ist keinem Lieferanten zugeordnet, daher können Ihre Dokumente nicht ermittelt werden. Nur Ihre Aufgaben werden aufgeführt. Melden Sie dies Ihrem Ansprechpartner beim Kunden.",
            "internalAccount": "Internes Konto: Dokumentenwarnungen folgen dem Lieferanten, der sie schuldet, daher listet Ihre Glocke nur Ihre Aufgaben. Die Ansicht über den gesamten Bestand finden Sie unter Dokumentenkonformität.",
            "fallback": "Der Bereich Ihres Kontos ist leer: Einige Warnungen können nicht berechnet werden."
        },
        "countTitle": "{total} ausstehend · die {shown} dringendsten unten"
    },
    "components/dashboard/ProductList#LOCAL": {
        "title": "Meine Produkte",
        "empty": "Kein Produkt",
        "emptyHint": "Die Produkte, die Ihr Kunde Ihnen anvertraut, erscheinen hier.",
        "all": "Alle anzeigen",
        "updatedOn": "Aktualisiert am {date}",
        "request": "Aktualisierung anfordern",
        "noCompletion": "Nicht bewertet",
        "completion": "Vollständigkeit"
    },
    "components/dashboard/ProductList#STATE_LABELS": {
        "Valid": "Freigegeben",
        "ToValidate": "Freigabe ausstehend",
        "Refused": "Zu korrigieren",
        "Simulation": "Simulation",
        "Stopped": "Gestoppt",
        "Archived": "Archiviert"
    },
    "components/dashboard/TaskList#LOCAL": {
        "title": "Meine Aufgaben",
        "empty": "Keine Aufgabe in Bearbeitung",
        "emptyHint": "Alles ist auf dem neuesten Stand. Neue Kundenanfragen erscheinen hier.",
        "all": "Alle anzeigen",
        "overdue": "{days} T überfällig",
        "overdueToday": "Heute fällig",
        "dueIn": "In {days} T",
        "noDue": "Kein Fälligkeitsdatum",
        "priorityHigh": "Hoch",
        "priorityMedium": "Mittel",
        "priorityLow": "Niedrig",
        "progress": "Fortschritt",
        "untitled": "Aufgabe ohne Titel"
    },
    "components/datalist/RowFormModal#LABELS": {
        "title": "Zeile bearbeiten",
        "create": "Neue Zeile",
        "save": "Speichern",
        "cancel": "Abbrechen",
        "refused": "Die Zeile wurde nicht gespeichert. Prüfen Sie die Pflichtfelder und versuchen Sie es erneut."
    },
    "components/datalist/renderers/signals#RENDERER_LABELS": {
        "formulated": "Formulierter Wert",
        "requirementBroken": "Anforderung nicht erfüllt",
        "claimDescription": "Beschreibung der Auslobung",
        "nutrientDetails": "Nährstoffdetails ({country})",
        "roundedFor": "Gemäß Vorschriften gerundeter Wert: {country}",
        "valueLine": "Wert: {value}",
        "toleranceMin": "Minimale Toleranz: {value}",
        "toleranceMax": "Maximale Toleranz: {value}",
        "minimum": "Mindestwert: {value}",
        "maximum": "Höchstwert: {value}",
        "gda": "% RI: {value}",
        "perServing": "Wert pro Portion: {value}",
        "missingSources": "{count} Quelle(n) ohne diese Auslobung",
        "missingSourcesList": "Quellen ohne diese Auslobung:",
        "omitted": "Zutat in der Deklaration ausgelassen",
        "packagingLevel": {
            "Primary": "Primär",
            "Inner": "Zwischenverpackung",
            "Secondary": "Sekundär",
            "Tertiary": "Tertiär"
        }
    },
    "components/datalist/useDataList#DATALIST_LABELS": {
        "rows": "{count} Zeile(n)",
        "addRow": "Zeile hinzufügen",
        "deleteRow": "Zeile löschen",
        "editRow": "Zeile bearbeiten",
        "moveUp": "Nach oben",
        "moveDown": "Nach unten",
        "actions": "Aktionen",
        "order": "Reihenfolge",
        "row": "Zeile {index}",
        "newRow": "Neue Zeile",
        "totalRow": "Summenzeile, von beCPG berechnet",
        "incomplete": "Füllen Sie die Pflichtfelder aus, um diese Zeile zu speichern",
        "sortBy": "Nach {column} sortieren",
        "saving": "Wird gespeichert…",
        "saved": "Gespeichert",
        "discard": "Änderungen verwerfen",
        "failed": "Speichern fehlgeschlagen",
        "retry": "Erneut versuchen",
        "deleting": "Wird gelöscht…",
        "search": "In der Liste suchen",
        "readOnly": "Schreibgeschützt",
        "frozenTitle": "Von Ihrem Kunden validierte Liste",
        "frozenText": "Ihr Kunde hat diese Liste validiert: Sie ist nun gesperrt und kann nicht mehr geändert werden. Falls eine Korrektur nötig ist, bitten Sie über die Projektdiskussion um ihre Wiederöffnung.",
        "readAccessTitle": "Nur Ansicht",
        "readAccessText": "Sie haben nur Lesezugriff auf diese Entität.",
        "noTaskTitle": "Keine offene Aufgabe",
        "noTaskText": "Die Bearbeitung ist nur möglich, solange Ihnen eine Aufgabe zugewiesen ist. Diese Liste bleibt sichtbar.",
        "wizardReadOnlyTitle": "Schreibgeschützter Assistent",
        "wizardReadOnlyText": "Dieser Assistent ist zur Ansicht konfiguriert: Keine Änderung ist möglich.",
        "protectedTitle": "Geschütztes Feld",
        "protectedText": "Die Spalte „{column}“ ist geschützt: Ihr Wert fließt in die Konformitätsprüfungen Ihres Kunden ein. Bitte bestätigen Sie, dass Sie ihn ändern möchten.",
        "protectedUnlock": "Trotzdem ändern",
        "protectedLocked": "Geschütztes Feld — zum Entsperren klicken",
        "deleteTitle": "Diese Zeile löschen?",
        "deleteText": "Diese Zeile wird endgültig aus der Liste entfernt.",
        "expand": "Details anzeigen",
        "collapse": "Details ausblenden",
        "nestedEmpty": "Kein Element",
        "empty": "Diese Liste ist leer",
        "emptyHint": "Fügen Sie eine erste Zeile hinzu, um zu beginnen.",
        "emptyReadOnly": "Ihr Kunde erwartet keine Zeile in dieser Liste.",
        "mandatory": "Pflichtfeld",
        "detail": "Detail",
        "duplicate": "Diese Zeile duplizieren",
        "select": "Auswählen",
        "selectRow": "Zeile {index} auswählen",
        "selectAll": "Alle Zeilen dieser Seite auswählen",
        "selected": "{count} Zeile(n) ausgewählt",
        "clearSelection": "Auswahl aufheben",
        "bulkMoveUp": "Nach oben",
        "bulkMoveUpLong": "Auswahl nach oben verschieben",
        "bulkMoveDown": "Nach unten",
        "bulkMoveDownLong": "Auswahl nach unten verschieben",
        "bulkDuplicate": "Duplizieren",
        "bulkDuplicateLong": "Auswahl duplizieren",
        "bulkDelete": "Löschen",
        "bulkDeleteLong": "Auswahl löschen",
        "accessDenied": "Zugriff verweigert",
        "accessDeniedRow": "Diese Zeile enthält ein Merkmal, das Ihr Konto nicht lesen darf: Sie kann hier nicht bearbeitet werden.",
        "bulkEdit": "Bearbeiten",
        "bulkEditLong": "Auswahl bearbeiten",
        "bulkEditTitle": "{count} Zeile(n) bearbeiten",
        "bulkEditPickFields": "Auszufüllende Felder",
        "bulkEditSearchField": "Feld suchen",
        "bulkEditApply": "Auf {count} Zeile(n) anwenden",
        "bulkEditCancel": "Abbrechen",
        "bulkEditEmptyClears": "Ein angekreuztes, aber leer gelassenes Feld löscht den Wert in jeder Zeile.",
        "bulkEditSkipped": "{count} ausgewählte Zeile(n) können nicht bearbeitet werden und bleiben unverändert.",
        "bulkEditTooMany": "{count} Zeilen ausgewählt, das Maximum ist {max}. Schränken Sie die Auswahl ein.",
        "bulkEditNoColumn": "Keine Spalte dieser Liste kann in Serie ausgefüllt werden.",
        "deleteSelectedTitle": "{count} Zeile(n) löschen?",
        "deleteSelectedText": "Diese Zeilen werden endgültig aus der Liste entfernt.",
        "rowsPerPage": "Zeilen pro Seite",
        "shortcuts": "Tastenkürzel",
        "shortcutsTitle": "Eingabe über die Tastatur",
        "shortcutList": [
            [
                "Tab / Shift+Tab",
                "nächste / vorherige Zelle"
            ],
            [
                "Enter",
                "speichert die Zeile und geht in derselben Spalte nach unten"
            ],
            [
                "Enter in der letzten Zeile",
                "fügt eine Zeile hinzu"
            ],
            [
                "↑ / ↓",
                "dieselbe Spalte, Zeile darüber / darunter"
            ],
            [
                "Esc",
                "verwirft die Änderungen der bearbeiteten Zeile"
            ],
            [
                "Ctrl+Enter",
                "fügt eine Zeile hinzu"
            ],
            [
                "Ctrl+D",
                "dupliziert die aktuelle Zeile"
            ],
            [
                "Ctrl+V",
                "fügt einen Zellblock aus einer Tabellenkalkulation ein"
            ]
        ],
        "pasteTitle": "Aus einer Tabellenkalkulation eingefügt",
        "pasteApplied": "{cells} Wert(e) in {rows} Zeile(n) eingefügt, davon {created} neu.",
        "pasteNothing": "Es konnte nichts eingefügt werden.",
        "pasteUndo": "Einfügen rückgängig machen",
        "pasteSave": "Die {count} Zeile(n) speichern",
        "pasteResolving": "Bezeichnungen werden gesucht…",
        "pasteUnmatched": "{count} Wert(e) nicht übernommen — korrigieren Sie sie manuell:",
        "pasteExtraColumns": "{count} eingefügte Spalte(n) jenseits der letzten Spalte der Liste: ignoriert.",
        "pasteRefusedRows": "{count} Zeile(n) jenseits des Listenendes: Diese Liste akzeptiert keine neue Zeile.",
        "pasteLine": "Zeile {line}",
        "pasteReasons": {
            "number": "eine Zahl wurde erwartet",
            "integer": "eine ganze Zahl wurde erwartet",
            "boolean": "ja / nein wurde erwartet",
            "date": "ein Datum wurde erwartet (TT/MM/JJJJ)",
            "list": "Wert außerhalb der angebotenen Liste",
            "readonly": "Spalte kann nicht geändert werden",
            "association": "keine exakte Entsprechung in den Referenzdaten"
        }
    },
    "components/documents/DepositedDocuments#LABELS": {
        "title": "Hinterlegte Dokumente",
        "subtitle": "Die Dateien im Ordner dieses Produkts, unabhängig von ihrem Typ.",
        "empty": "Keine Datei hinterlegt",
        "emptyHint": "Der Ordner dieses Produkts enthält noch kein Dokument.",
        "signed": "Unterzeichnet",
        "download": "Herunterladen",
        "consult": "Anzeigen",
        "modified": "Geändert am {date}"
    },
    "components/documents/DocumentUpload#LABELS": {
        "drop": "Datei hier ablegen",
        "or": "oder",
        "browse": "Durchsuchen",
        "deposit": "Hochladen",
        "renew": "Erneuern",
        "replace": "Ersetzen",
        "uploading": "Wird hochgeladen…",
        "analysing": "Dokument wird analysiert…",
        "done": "Datei hochgeladen",
        "doneHint": "Sie wird vom Kunden geprüft. Weiter wird nichts von Ihnen erwartet.",
        "retry": "Erneut versuchen",
        "cancel": "Abbrechen",
        "tooLarge": "Datei zu groß ({size}). Maximum: {max}.",
        "badType": "Nicht unterstütztes Format ({name}). Erwartet: {accept}.",
        "empty": "Die Datei ist leer.",
        "failed": "Das Hochladen ist fehlgeschlagen.",
        "locked": "Hochladen nicht verfügbar",
        "accepted": "Formate: {accept} — max. {max}",
        "aiValid": "Von der KI geprüft",
        "aiToValidate": "Zu prüfen",
        "aiRefused": "Von der KI abgelehnt",
        "aiOn": "Analysiert am {date}",
        "selected": "Ausgewählte Datei",
        "validityHint": "Die auf dem Dokument angegebenen Gültigkeitsdaten.",
        "validityInverted": "Das Enddatum liegt vor dem Anfangsdatum.",
        "validityMissing": "Geben Sie das Gültigkeitsende ein, bevor Sie die Datei hochladen.",
        "validityNotApplied": "Die Datei wurde hochgeladen, aber ihre Gültigkeitsdaten wurden nicht gespeichert. Tragen Sie sie in der Dokumentzeile ein."
    },
    "components/documents/DocumentValidity#LABELS": {
        "fromTo": "Gültig vom {from} bis {to}",
        "from": "Gültig seit {from}",
        "to": "Gültig bis {to}",
        "none": "Kein Gültigkeitsdatum",
        "required": "Gültigkeit auszufüllen",
        "expired": "Gültigkeit abgelaufen am {to}",
        "fromLabel": "Gültig ab",
        "toLabel": "Gültig bis",
        "edit": "Bearbeiten",
        "setDates": "Ausfüllen",
        "save": "Speichern",
        "cancel": "Abbrechen",
        "saved": "Gültigkeit gespeichert",
        "inverted": "Das Enddatum liegt vor dem Anfangsdatum.",
        "hint": "Die auf dem hochgeladenen Dokument angegebenen Daten."
    },
    "components/documents/DocumentViewer#LABELS": {
        "title": "Dokument",
        "download": "Herunterladen",
        "close": "Schließen",
        "unsupported": "Keine Vorschau für diesen Dateityp",
        "unsupportedHint": "Dieses Format kann im Browser nicht angezeigt werden. Laden Sie es herunter, um es zu lesen.",
        "failed": "Das Dokument konnte nicht angezeigt werden",
        "failedHint": "Es kann weiterhin heruntergeladen werden.",
        "signed": "Elektronisch signiert",
        "signedBy": "{name}, am {date}",
        "pending": "Signatur läuft",
        "validated": "Freigegeben am {date}",
        "validatedBy": "Freigegeben von {name} am {date}"
    },
    "components/documents/ExpiryPill#LABELS": {
        "missing": "Bereitzustellen",
        "refused": "Abgelehnt",
        "toValidate": "In Prüfung",
        "valid": "Gültig",
        "validUntil": "Gültig bis {date}",
        "expiredOn": "Abgelaufen am {date}",
        "expiredSince": "Seit {days} Tagen abgelaufen",
        "expiresToday": "Läuft heute ab",
        "expiresIn": "Läuft in {days} Tagen ab",
        "noDate": "Kein Gültigkeitsdatum",
        "from": "Vom",
        "to": "bis",
        "since": "Seit",
        "until": "Bis"
    },
    "components/documents/RequirementChecklist#LABELS": {
        "mandatory": "Verpflichtend",
        "satisfied": "Bereitgestellt",
        "upload": "Hochladen",
        "renew": "Erneuern",
        "replace": "Ersetzen",
        "download": "Herunterladen",
        "consult": "Anzeigen",
        "details": "Details",
        "hide": "Ausblenden",
        "of": "{done} / {total} Pflichtdokumente",
        "allDone": "Alles ist aktuell",
        "allDoneHint": "Derzeit wird nichts von Ihnen erwartet.",
        "nothing": "Keine Dokumentenanforderung",
        "nothingHint": "Der Kunde hat für diesen Bereich noch kein erwartetes Dokument definiert.",
        "openCount": "{count} zu bearbeiten",
        "blockingCount": "{count} verpflichtend zu beheben",
        "category": "Kategorie",
        "readOnly": "Hochladen ist für dieses Datenblatt geschlossen.",
        "noEntity": "Lieferantendokumente",
        "aiHints": "Analysehinweise",
        "deposit": "Datei hochladen",
        "file": "Datei"
    },
    "components/documents/SignedDocumentList#LABELS": {
        "document": "Unterzeichnetes Dokument",
        "signedAt": "Unterzeichnet am",
        "download": "Herunterladen",
        "search": "Unterzeichnetes Dokument suchen",
        "empty": "Kein unterzeichnetes Dokument",
        "emptyHint": "Die Dokumente, die Sie über Ihre Aufgaben unterzeichnen, erscheinen hier.",
        "truncated": "Unvollständige Liste: Nicht alle unterzeichneten Dokumente konnten gelesen werden."
    },
    "components/form/FieldRenderer#LABELS": {
        "add": "Wert hinzufügen",
        "remove": "Diesen Wert entfernen"
    },
    "components/form/FormRenderer#LABELS": {
        "empty": "Kein Feld auszufüllen",
        "emptyHint": "Die Konfiguration dieses Formulars liefert kein Feld."
    },
    "components/form/controls/AutocompleteControl#LABELS": {
        "search": "Suchen…",
        "hint": "Name oder Code eingeben, um die Daten zu filtern",
        "loading": "Suche läuft…",
        "noResult": "Kein Ergebnis",
        "clear": "Leeren",
        "remove": "Entfernen",
        "browse": "Werte anzeigen",
        "error": "Die Suche ist fehlgeschlagen",
        "errorUnconfigured": "Für dieses Feld ist keine Werteliste konfiguriert. Melden Sie dies Ihrem Ansprechpartner beim Kunden.",
        "showing": "Elemente 1 - {count} von {total}",
        "favourite": "Favorit"
    },
    "components/form/controls/BooleanControl#LABELS": {
        "yes": "Ja",
        "no": "Nein",
        "empty": "(leer)"
    },
    "components/form/controls/MlTextControl#LABELS": {
        "more": "{count} weitere Sprache(n)",
        "less": "Andere Sprachen ausblenden",
        "required": "vom Kunden gefordert",
        "missing": "{count} geforderte Sprache(n) noch leer"
    },
    "components/form/controls/NumberUnitControl#DURATION_SYMBOLS": {
        "d": "Tage",
        "mo": "Monate",
        "y": "Jahre"
    },
    "components/form/controls/NumberUnitControl#LABELS": {
        "unit": "Einheit"
    },
    "components/form/controls/ReadOnlyControl#LABELS": {
        "yes": "Ja",
        "no": "Nein",
        "empty": "—"
    },
    "components/form/controls/SelectControl#LABELS": {
        "placeholder": "Auswählen…",
        "offList": "Wert nicht in der Liste",
        "empty": "Kein Wert angeboten"
    },
    "components/form/controls/SizeControl#LABELS": {
        "bytes": "Bytes"
    },
    "components/form/validation#VALIDATION_MESSAGES": {
        "validation.required": "Dieses Feld ist erforderlich.",
        "validation.number": "Geben Sie eine Zahl ein.",
        "validation.integer": "Geben Sie eine ganze Zahl ein.",
        "validation.date": "Geben Sie ein gültiges Datum ein.",
        "validation.boolean": "Geben Sie ja oder nein ein.",
        "validation.list": "Wählen Sie einen Wert aus der Liste.",
        "validation.regex": "Das erwartete Format wird nicht eingehalten.",
        "validation.min": "Der Wert muss größer oder gleich {min} sein.",
        "validation.max": "Der Wert muss kleiner oder gleich {max} sein.",
        "validation.range": "Der Wert muss zwischen {min} und {max} liegen.",
        "validation.minLength": "Geben Sie mindestens {min} Zeichen ein.",
        "validation.maxLength": "Geben Sie höchstens {max} Zeichen ein."
    },
    "components/monitor/BulkActionBar#LABELS": {
        "selected": "{count} Lieferant ausgewählt",
        "selectedPlural": "{count} Lieferanten ausgewählt",
        "clear": "Auswahl aufheben",
        "overflow": "Nur die ersten {max} werden verarbeitet.",
        "loading": "Aktionen werden geladen…",
        "unavailable": "Für Ihr Profil ist keine Aktion verfügbar.",
        "actions": {
            "remind": "Erinnern",
            "escalate": "Eskalieren",
            "suspend": "Sperren"
        },
        "targets": "Betroffene Lieferanten",
        "report": "Ergebnis der Aktion",
        "reportOk": "{count} Lieferant(en) erfolgreich verarbeitet.",
        "reportKo": "{count} Fehler:",
        "reportSkipped": "{count} Lieferant(en) ausgelassen: über dem Limit von {max}.",
        "reportNone": "Kein Lieferant wurde verarbeitet.",
        "close": "Schließen",
        "errors": {
            "notFound": "Lieferant außerhalb Ihres Bereichs"
        }
    },
    "components/monitor/CampaignList#LABELS": {
        "columns": {
            "campaign": "Projekt",
            "suppliers": "Lieferanten",
            "response": "Antwortquote",
            "age": "Alter",
            "silence": "Letzte Erinnerung",
            "due": "Fälligkeitsdatum",
            "reminders": "Erinnerungen",
            "follow": "Nachverfolgung",
            "manager": "Verantwortlicher"
        },
        "days": "{count} T",
        "since": "Seit {count} T offen",
        "lastActivity": "Letzte Aktivität {date}",
        "silenceDays": "vor {count} T",
        "silenceToday": "Heute",
        "silenceHint": "beCPG führt kein Erinnerungsprotokoll: Diese Spalte zeigt die letzte Aktivität im Projekt (cm:modified), die nächstliegende tatsächlich verfügbare Information.",
        "noSilence": "Keine datierte Aktivität",
        "noAnswer": "Keine Antwort",
        "late": "Überfällig",
        "onTrack": "Im Plan",
        "toRemind": "Zu erinnern",
        "toEscalate": "Zu eskalieren",
        "lateTasks": "{late} / {open} Aufgabe(n) überfällig",
        "noTasks": "Keine offene Aufgabe",
        "dueIn": "In {count} T",
        "overdue": "{count} T überfällig",
        "noDue": "Kein Fälligkeitsdatum",
        "others": "+{count}",
        "empty": "Kein offenes Projekt in diesem Bereich",
        "projectStates": {
            "Planned": "Geplant",
            "InProgress": "In Bearbeitung",
            "OnHold": "Angehalten",
            "Completed": "Abgeschlossen",
            "Cancelled": "Abgebrochen"
        }
    },
    "components/monitor/DocumentMatrix#LABELS": {
        "supplier": "Lieferant",
        "types": "{count} Dokumenttyp(en)",
        "notApplicable": "Gilt nicht für diesen Lieferanten",
        "mandatory": "Verpflichtend",
        "legend": "Legende",
        "expected": "{count} erwartet",
        "selectRow": "{name} auswählen",
        "selectCell": "{type} für {name} auswählen",
        "download": "Herunterladen",
        "preview": "Ansehen",
        "empty": "Kein Lieferant in diesem Bereich",
        "emptyHint": "Erweitern Sie die Filter, um die Matrix zu sehen.",
        "noColumns": "In diesem Bereich ist kein Dokumenttyp materialisiert",
        "noColumnsHint": "beCPG materialisiert erwartete Dokumente bei der Formulierung: Ohne konfigurierte Dokumentenanforderung ist die Matrix leer.",
        "toggle": "Dokumente anzeigen",
        "summary": "{missing} fehlend · {expired} abgelaufen · {expiring} zu erneuern",
        "completeness": "{value} % konform",
        "status": {
            "missing": "Fehlt",
            "expired": "Abgelaufen",
            "refused": "Abgelehnt",
            "expiring": "Zu erneuern",
            "toValidate": "Zu prüfen",
            "valid": "Gültig"
        }
    },
    "components/monitor/DocumentScene#LABELS": {
        "relief": "Relief",
        "constellation": "Konstellation",
        "mode": "Anzeigemodus",
        "filters": "Angezeigte Status",
        "statuses": {
            "expired": "Abgelaufen",
            "missing": "Fehlend",
            "refused": "Abgelehnt",
            "expiring": "Läuft bald ab",
            "toValidate": "Zu validieren",
            "valid": "Gültig"
        },
        "aria": "Lieferanten und erwartete Dokumente, dreidimensional",
        "rotate": "Ziehen zum Drehen",
        "zoom": "Mausrad zum Zoomen",
        "pick": "Lieferanten anklicken, um zu handeln",
        "pickTitle": "Klicken Sie in der Szene auf einen Lieferanten",
        "waiting": "{count} Dokument(e) ausstehend",
        "waitingAxis": "Ausstehend",
        "family": "Familie",
        "severity": "Schweregrad",
        "noFamily": "Ohne Familie",
        "openSheet": "Datenblatt öffnen",
        "view": "Ansehen",
        "empty": "Kein Dokument in diesem Bereich erwartet"
    },
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Valid": "Gültig",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Simulation": "Simulation",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.ToValidate": "Zu validieren",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Refused": "Abgelehnt",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Archived": "Archiviert",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Stopped": "Gestoppt",
    "components/monitor/MonitorFilters#LABELS": {
        "search": "Lieferant, Code, Firmierung suchen…",
        "toggle": "Weitere Filter",
        "reset": "Zurücksetzen",
        "close": "Filter ausblenden",
        "legend": "Bestandsfilter",
        "family": "Familie",
        "subFamily": "Unterfamilie",
        "site": "Standort",
        "subsidiary": "Tochtergesellschaft",
        "market": "Markt",
        "state": "Lieferantenstatus",
        "any": "Alle",
        "windowScoped": "auf das Fenster beschränkt",
        "windowScopedHelp": "Alfresco indiziert keine Assoziationen: Dieser Filter gilt für die bereits gelesenen Lieferanten, nicht für den gesamten Bestand.",
        "unsupported": "nicht konfiguriert",
        "unsupportedHelp": "Keine beCPG-Standardeigenschaft bildet diesen Begriff ab. Aktivieren Sie ihn kundenseitig, indem Sie die Eigenschaft in der Überwachungskonfiguration angeben.",
        "noVocabulary": "Kein Wert im geladenen Bereich",
        "active": "{count} aktiver Filter",
        "activePlural": "{count} aktive Filter",
        "clearOne": "Diesen Filter entfernen",
        "anyFamily": "Alle Familien",
        "anySubFamily": "Alle Unterfamilien",
        "anyState": "Alle Status"
    },
    "components/monitor/NonConformityList#LABELS": {
        "columns": {
            "nc": "Abweichung",
            "suppliers": "Lieferanten",
            "state": "Status",
            "priority": "Priorität",
            "delay": "Bearbeitungsdauer",
            "actions": "Korrekturmaßnahmen",
            "cost": "Kosten"
        },
        "states": {
            "new": "Neu",
            "analysis": "Analyse",
            "treatment": "Behandlung",
            "response": "Antwort",
            "classification": "Klassifizierung",
            "closing": "Abschluss",
            "closed": "Geschlossen"
        },
        "types": {
            "NonConformity": "Abweichung",
            "Claim": "Reklamation"
        },
        "priorities": {
            "1": "Hoch",
            "2": "Mittel",
            "3": "Niedrig"
        },
        "blocking": "Blockierend",
        "blockingHint": "Hohe Priorität und noch offen: Dadurch wird der abgeleitete Freigabestatus „gesperrt“ (berechnet, nie gespeichert).",
        "days": "{count} T",
        "openSince": "Seit {count} T offen",
        "overdue": "Bearbeitungsziel überschritten",
        "closedIn": "In {count} T bearbeitet",
        "closedApprox": "beCPG speichert kein Abschlussdatum: Die Dauer einer geschlossenen NC wird zwischen ihrer Anlage und ihrer letzten Änderung gemessen.",
        "createdOn": "Angelegt am {date}",
        "noDelay": "Kein Anlagedatum",
        "actionsCount": "{done} / {total}",
        "actionsLate": "{count} überfällig",
        "noActions": "Keine Maßnahme",
        "noActionsHint": "Keine Behandlungsaufgabe ist in beCPG mit dieser NC verknüpft — der Maßnahmenplan ist noch nicht eröffnet.",
        "actionState": {
            "done": "erledigt",
            "late": "überfällig",
            "open": "in Bearbeitung"
        },
        "andMore": "… und {count} weitere",
        "others": "+{count}",
        "noSupplier": "Kein Lieferant verknüpft",
        "empty": "Keine Abweichung in diesem Bereich",
        "open": "Diese Abweichung öffnen"
    },
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.quality.label": "Qualität",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.quality.focus": "Dokumentenkonformität, Abweichungen, Zertifizierungen, Audits",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.purchasing.label": "Einkauf",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.purchasing.focus": "Freigabestatus (blockiert Bestellungen), Score, Reaktionsfähigkeit",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.rnd.label": "F&E",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.rnd.focus": "Vollständigkeit der technischen Daten, Kataloge, Spezifikationen",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.csr.label": "CSR",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.csr.focus": "Zertifizierungen, Herkünfte, CSR-Fragebögen",
    "components/monitor/ProfileSwitcher#LABELS": {
        "legend": "Fachansicht",
        "hint": "Derselbe Bestand, vier Lesarten. Ordnet die Karten und Spalten neu an."
    },
    "components/monitor/RiskList#RISK_REASONS.documentExpired": "{count} abgelaufene(s) Dokument(e)",
    "components/monitor/RiskList#RISK_REASONS.documentExpiring": "{count} ablaufende(s) Dokument(e)",
    "components/monitor/RiskList#RISK_REASONS.documentMissing": "{count} fehlende(s) Dokument(e)",
    "components/monitor/RiskList#RISK_REASONS.blockingNc": "{count} blockierende NC(s)",
    "components/monitor/RiskList#RISK_REASONS.openNc": "{count} offene NC(s)",
    "components/monitor/RiskList#RISK_REASONS.campaignNoAnswer": "{count} Projekt(e) ohne Antwort",
    "components/monitor/RiskList#RISK_REASONS.lateTask": "{count} überfällige Aufgabe(n)",
    "components/monitor/RiskList#RISK_REASONS.lowCompletion": "Geringe Vollständigkeit ({score} %)",
    "components/monitor/RiskList#RISK_REASONS.scoreDropping": "Score sinkt",
    "components/monitor/RiskList#RISK_REASONS.openProject": "{count} Listung(en) in Bearbeitung",
    "components/monitor/RiskList#RISK_REASONS.blockingCatalog": "Blockierender Katalog nicht erfüllt",
    "components/monitor/RiskList#RISK_LEVELS.critical": "Kritisch",
    "components/monitor/RiskList#RISK_LEVELS.high": "Hoch",
    "components/monitor/RiskList#RISK_LEVELS.medium": "Mittel",
    "components/monitor/RiskList#RISK_LEVELS.low": "Niedrig",
    "components/monitor/RiskList#LABELS": {
        "title": "Top 10 der Risikolieferanten",
        "empty": "Kein Risikolieferant in diesem Bereich",
        "emptyHint": "Kein abgelaufenes Dokument, keine blockierende NC und kein unbeantwortetes Projekt festgestellt.",
        "riskScore": "Risikoscore {score}",
        "level": "Risiko {level}",
        "lastActivity": "Letzte Aktivität am {date}",
        "completion": "Vollständigkeit {value} %",
        "openSheet": "Datenblatt öffnen",
        "actions": {
            "remind": "Erinnern",
            "escalate": "Eskalieren",
            "suspend": "Sperren"
        },
        "dialog": {
            "remindTitle": "{target} erinnern",
            "escalateTitle": "{target} eskalieren",
            "suspendTitle": "{target} sperren",
            "messageLabel": "Nachricht",
            "messageHelp": "Wird im Diskussionsverlauf des Lieferanten veröffentlicht, den er im Portal und in beCPG liest.",
            "escalateHelp": "Wird intern im offenen Projekt des Lieferanten veröffentlicht, nie in dem Verlauf, den er liest.",
            "messageLang": "Sprache der Nachricht",
            "supplierLang": "Sprache des Lieferanten",
            "messageRequired": "Eine Nachricht ist erforderlich.",
            "suspendWarning": "Der Freigabestatus wird laufend abgeleitet, nie gespeichert: Diese Aktion schreibt nicht „gesperrt“. Sie startet den Sperrprozess des Kunden. Sobald beCPG die blockierende NC enthält, ändert sich der Status von selbst.",
            "suspendIrreversible": "Ein gestarteter Prozess kann im Portal nicht abgebrochen werden. Prüfen Sie die Auswahl.",
            "process": "Zu startender Prozess",
            "noProcess": "Auf dieser Instanz ist kein Sperrprozess erlaubt (PORTAL_PROCESS_TEMPLATES).",
            "targets": "{count} Lieferant(en) betroffen:",
            "send": "Senden",
            "suspendConfirm": "Sperrung starten"
        },
        "result": {
            "ok": "{count} Aktion(en) ausgeführt.",
            "partial": "{ok} erfolgreich, {failed} fehlgeschlagen.",
            "failed": "Keine Aktion war erfolgreich."
        },
        "defaults": {
            "remind": "Guten Tag,\n\nIhre Lieferantenakte muss aktualisiert werden: {reasons}.\nBitte melden Sie sich im Portal an, um sie zu vervollständigen.\n\nMit freundlichen Grüßen",
            "escalate": "Eskalation: Die Lieferantenakte weist trotz der Erinnerungen weiterhin Auffälligkeiten auf ({reasons}).\nBitte übernehmen Sie.",
            "genericReasons": "ausstehende Dokumente und Fristen"
        }
    },
    "components/monitor/StartCampaignDialog#LABELS": {
        "title": "Projekt starten",
        "supplier": "Lieferant",
        "supplierPlaceholder": "Lieferanten auswählen…",
        "scope": "Umfang",
        "scopeSupplier": "Der Lieferantendatensatz selbst",
        "scopeAll": "Alle Produkte dieses Lieferanten",
        "scopeOne": "Ein Produkt",
        "entity": "Produkt",
        "entityPlaceholder": "Produkt auswählen…",
        "process": "Projektvorlage",
        "processPlaceholder": "Vorlage auswählen…",
        "start": "Starten",
        "cancel": "Abbrechen",
        "starting": "Wird gestartet…",
        "noEntity": "Diesem Lieferanten ist kein Produkt zugeordnet: nichts zu senden.",
        "noProcess": "Auf dieser Instanz steht dem Portal keine Projektvorlage offen.",
        "countAll": "{count} Produkt(e) werden gesendet, jeweils ein Projekt.",
        "done": "{count} Projekt(e) gestartet",
        "partial": "{done} gestartet, {failed} fehlgeschlagen",
        "failedTitle": "Diese Produkte wurden nicht gestartet",
        "countTruncated": "Nur {count} von {total} Produkten können hier aufgeführt werden: Diese, und nur diese, werden gesendet.",
        "suppliersTruncated": "Nur {count} von {total} Lieferanten werden angeboten. Starten Sie das Projekt von der Seite des Lieferanten, wenn er nicht aufgeführt ist.",
        "atLeast": "mindestens {count}",
        "loadFailed": "Die Liste konnte nicht geladen werden.",
        "retry": "Erneut versuchen"
    },
    "components/monitor/StartNcDialog#LABELS": {
        "title": "Abweichung starten",
        "supplier": "Lieferant",
        "supplierPlaceholder": "Lieferanten auswählen…",
        "product": "Produkt",
        "productNone": "Kein bestimmtes Produkt",
        "batch": "Charge",
        "priority": "Priorität",
        "priorities": {
            "1": "Hoch (blockierend)",
            "2": "Mittel",
            "3": "Niedrig"
        },
        "dueDate": "Fälligkeitsdatum",
        "description": "Beschreibung",
        "cancel": "Abbrechen",
        "start": "Starten",
        "started": "Abweichung gestartet: beCPG erfasst sie und eröffnet ihre Analyse."
    },
    "components/monitor/SupplierScorecard#LABELS": {
        "title": "Scorecard",
        "subtitle": "Kriterien, Gewichtungen und Scores — kundenseitig konfiguriert",
        "weighted": "Gewichteter Score",
        "weightedHint": "{count} Kriterien · Gesamtgewicht {weight}",
        "criterion": "Kriterium",
        "weight": "Gewicht {weight}",
        "weightShare": "{share} % der Summe",
        "range": "Skala {range}",
        "noScore": "Nicht bewertet",
        "scaleNote": "Skala aus der Konfiguration (oder dem höchsten beobachteten Score) abgeleitet: Der Rohwert wird immer angezeigt.",
        "unavailable": "Keine Scorecard für diesen Lieferanten",
        "unavailableHint": "Scorecards werden aus den Scores der Lieferantenprojekte gespeist. In Ihrem Bereich wurde kein bewertetes Projekt gefunden.",
        "completion": "Katalogvollständigkeit",
        "completionSubtitle": "Die auf den Lieferantenentitäten aktiven Kataloge",
        "completionEmpty": "Kein aktiver Katalog für diesen Lieferanten",
        "completionScore": "Durchschnittliche Vollständigkeit",
        "approval": "Freigabestatus",
        "approvalDerived": "Bei jeder Anzeige neu berechnet",
        "history": "Entwicklung",
        "historyUnavailable": "Verlauf nicht verfügbar",
        "historyWhy": "Das beCPG-Entscheidungsmodul konnte den Verlauf nicht liefern.",
        "historyWhyBy": {
            "supplierAxisUnavailable": "Das BI-Modul ist aktiv, unterscheidet aber noch nicht zwischen Lieferanten: Die Lieferantenachse muss dem Cube hinzugefügt und das Schema neu geladen werden.",
            "supplierUnresolved": "Dieser Lieferant ist noch nicht im BI-Modul: Er erscheint beim nächsten Neuaufbau.",
            "noData": "Das BI-Modul kennt diesen Lieferanten, enthält aber noch keinen Datenpunkt für den Zeitraum: Der Verlauf füllt sich, sobald Daten einfließen.",
            "unknownQuery": "Die angeforderte Reihe ist im Portal nicht deklariert: ein Konfigurationsfehler, keine fehlenden Daten.",
            "unreachable": "Das beCPG-Entscheidungsmodul antwortet nicht: Es ist auf dieser Instanz deaktiviert oder sein Server ist nicht erreichbar.",
            "denied": "Ihr Konto hat keinen Zugriff auf das beCPG-Entscheidungsmodul."
        },
        "historyNeeds": "Was auf BI-Seite zur Aktivierung benötigt wird",
        "dimensions": "Dimensionen",
        "measures": "Kennzahlen",
        "statusPartial": "teilweise",
        "statusMissing": "anzulegen",
        "trendLast": "Letzter Punkt: {value} am {date}",
        "trendCaption": "Gewichteter Score im Zeitverlauf"
    },
    "components/monitor/SupplierTable#LABELS": {
        "caption": "Lieferanten des Bestands, Freigabestatus und abgeleitete Indikatoren",
        "columns": {
            "name": "Lieferant",
            "code": "Code",
            "status": "Freigabe",
            "risk": "Risiko",
            "completion": "Vollständigkeit",
            "documentsExpired": "Abgel. Dok.",
            "documentsExpiring": "Ablauf. Dok.",
            "documentsMissing": "Fehl. Dok.",
            "openNc": "Offene NCs",
            "openProjects": "Projekte",
            "family": "Familie",
            "sites": "Standorte",
            "lastActivity": "Letzte Aktivität"
        },
        "metrics": {
            "documentsExpired": "{count} Pflichtdokument(e) abgelaufen",
            "documentsExpiring": "{count} Dokument(e) kurz vor Ablauf",
            "documentsMissing": "{count} Pflichtdokument(e) nicht bereitgestellt",
            "openNc": "{count} offene Abweichung(en)",
            "openProjects": "{count} offene(s) Projekt(e)"
        },
        "none": "—",
        "empty": "Kein Lieferant in diesem Bereich",
        "emptyHint": "Erweitern Sie die Filter oder prüfen Sie Ihren Einkäuferbereich.",
        "emptyFiltered": "Kein Lieferant entspricht diesen Filtern.",
        "compare": "Vergleichen",
        "compareTitle": "Vergleich von {count} Lieferanten",
        "compareCapped": "Vergleich auf die ersten {max} ausgewählten Lieferanten beschränkt — darüber hinaus sind die Spalten nicht mehr lesbar.",
        "compareRows": {
            "status": "Freigabestatus",
            "reasons": "Gründe",
            "risk": "Risikoscore",
            "completion": "Vollständigkeit (Kataloge)",
            "documentsExpired": "Abgelaufene Dokumente",
            "documentsExpiring": "Ablaufende Dokumente",
            "documentsMissing": "Fehlende Dokumente",
            "openNc": "Offene NCs",
            "openProjects": "Offene Projekte",
            "state": "beCPG-Status",
            "family": "Familie",
            "sites": "Standorte",
            "lastActivity": "Letzte Aktivität"
        },
        "openSheet": "Datenblatt öffnen",
        "selected": "{count} ausgewählt",
        "clear": "Auswahl aufheben",
        "close": "Schließen",
        "noReason": "Kein Risikogrund"
    },
    "components/monitor/cockpit/AssistantTab#LABELS": {
        "priorities": "Prioritäten der Woche",
        "prioritiesHelp": "Regelbasiert für die Lieferanten mit dem höchsten Risiko berechnet: kritisches Risiko mit blockierender Abweichung, zu eskalieren; abgelaufenes Dokument, mindestens fünf fehlende Dokumente oder Projekt ohne Antwort, nachzufassen.",
        "kinds": {
            "escalate": "Zu eskalieren",
            "remind": "Nachzufassen"
        },
        "score": "Risiko {score}",
        "openSheet": "Datenblatt öffnen",
        "none": "Keine Priorität in diesem Umfang diese Woche.",
        "copilot": "Copilot",
        "wire": "In beCPG anzubinden",
        "copilotSoon": "Der Copilot beantwortet Fragen zu Ihrem Lieferantenbestand, sobald er an den beCPG-Assistenten angebunden ist.",
        "ask": "Stellen Sie eine Frage zu Ihrem Lieferantenbestand…",
        "askLabel": "Frage an den Copilot"
    },
    "components/monitor/cockpit/CsrTab#LABELS": {
        "expected": "Erwartete Zertifikate",
        "expectedHelp": "Dokumenttypen, deren Bezeichnung „Zertifikat“ enthält, einer pro betroffenem Lieferanten.",
        "valid": "Gültige Zertifikate",
        "outOf": "/ {total}",
        "origins": "Angegebene Herkunft",
        "surveys": "CSR-Fragebögen",
        "notWired": "Diese Information wird von beCPG noch nicht für das Portal bereitgestellt.",
        "byType": "Konformität nach Dokumenttyp",
        "byTypeAria": "Dokumentstatus nach Typ",
        "byTypeHelp": "Für jeden Dokumenttyp ein Status pro betroffenem Lieferanten: der ungünstigste seiner Dokumente.",
        "map": "Herkunft der Beschaffung",
        "mapEmpty": "Karte der Herkunftsländer und der Lieferantenstandorte.",
        "csv": {
            "type": "Dokumenttyp",
            "expected": "Erwartet"
        }
    },
    "components/monitor/cockpit/PurchasingTab#LABELS": {
        "approved": "Freigegebene Lieferanten",
        "outOf": "/ {total}",
        "openProjects": "Offene Projekte",
        "answered": "Mit Antwort",
        "unanswered": "Ohne Antwort",
        "openProjectsHelp": "Offene Lieferantenprojekte der gesamten Instanz: Ein Projekt ist keinem Lieferanten zugeordnet, daher gelten die Bestandsfilter nicht.",
        "responseRate": "Antwortquote",
        "meanCompletion": "Durchschnittlicher Fortschritt {value} %",
        "lateTasks": "Verspätete Aufgaben",
        "lateProjects": "{count} verspätete(s) Projekt(e)",
        "composition": "Zusammensetzung des Bestands",
        "compositionAria": "Lieferanten nach Familie, Unterfamilie und Freigabestatus",
        "compositionHelp": "Innerer Ring: Familien. Mittlerer Ring: Unterfamilien. Äußerer Ring: Freigabestatus. Klicken Sie auf eine Familie, um sie aufzuklappen.",
        "reactivity": "Reaktionsfähigkeit der Lieferanten",
        "reactivityAria": "Aufgaben pro Jahr und durchschnittliche Antwortzeit",
        "reactivityHelp": "Balken: Aufgaben der Lieferantenprojekte nach Endjahr (logarithmische Skala). Linie: durchschnittliche Antwortzeit in Tagen.",
        "tasks": "Aufgaben",
        "delay": "Ø Antwortzeit (T)",
        "days": "Tage",
        "taskStates": "Aufgaben der Lieferantenprojekte",
        "taskStatesAria": "Aufgaben nach Status",
        "taskStatesHelp": "Alle Aufgaben der Lieferantenprojekte aus dem Entscheidungsmodul, nach Status (logarithmische Skala)."
    },
    "components/monitor/cockpit/QualityTab#LABELS": {
        "health": "Gesundheit des Bestands",
        "healthAria": "Gesundheitsindex {value} von 100",
        "healthOutOf": "von 100",
        "healthHelp": "Index von 100: 35 % Freigabequote, 35 % Dokumentenkonformität, 20 % Antwortquote bei Projekten, 10 % Anteil der Lieferanten ohne blockierende Abweichung.",
        "healthPartial": "Teilberechnung, Gewichte umverteilt: {missing} nicht verfügbar.",
        "weights": {
            "approval": "Freigabe {weight} %",
            "compliance": "Konformität {weight} %",
            "response": "Antwort {weight} %",
            "noBlockingNc": "Ohne blockierende Abweichung {weight} %"
        },
        "inputs": {
            "approval": "Freigabequote",
            "compliance": "Dokumentenkonformität",
            "response": "Antwortquote",
            "noBlockingNc": "Anteil ohne blockierende Abweichung"
        },
        "compliance": "Dokumentenkonformität",
        "compliant": "Konform",
        "complianceHelp": "Gültige Pflichtdokumente im Verhältnis zu den im Umfang erwarteten Pflichtdokumenten.",
        "complianceNoRate": "Quote nicht verfügbar: Ein Zähler hat das Leselimit von beCPG erreicht.",
        "openNc": "Offene Abweichungen",
        "suspended": "Gesperrte Lieferanten",
        "outOf": "/ {total}",
        "toReview": "Zu prüfende Dokumente",
        "toReviewHelp": "Zu prüfende und abgelaufene Dokumente, eines pro Lieferant und Dokumenttyp.",
        "riskMap": "Risikokarte",
        "riskMapAria": "Lieferanten nach Risikoscore und offenen Projekten",
        "riskMapHelp": "Horizontal: offene Projekte. Vertikal: Risikoscore. Größe: Auffälligkeiten (fehlende und abgelaufene Dokumente, blockierende Abweichungen). Klicken Sie auf einen Lieferanten, um sein Datenblatt zu öffnen.",
        "openProjects": "Offene Projekte",
        "riskScore": "Risikoscore",
        "anomalies": "Größe: Auffälligkeiten",
        "priorities": "Prioritätszone",
        "bubble": "Risiko {score} · {projects} offene(s) Projekt(e) · {anomalies} Auffälligkeit(en)",
        "ncAge": "Alter der offenen Abweichungen",
        "ncAgeAria": "Offene Abweichungen nach Alter",
        "ncUndated": "{count} Abweichung(en) ohne Erstellungsdatum",
        "csv": {
            "rank": "Rang",
            "supplier": "Lieferant",
            "code": "Code",
            "status": "Freigabe",
            "level": "Risikostufe",
            "score": "Risikoscore",
            "reasons": "Gründe",
            "openProjects": "Offene Projekte",
            "anomalies": "Auffälligkeiten"
        }
    },
    "components/monitor/cockpit/RndTab#LABELS": {
        "progress": "Durchschnittlicher Fortschritt {year}",
        "progressNoYear": "Durchschnittlicher Fortschritt",
        "projects": "{count} Projekt(e)",
        "tasksInProgress": "Laufende Aufgaben",
        "tasksPlanned": "{count} geplant",
        "technicalSheets": "Fehlende technische Datenblätter",
        "technicalSheetsHint": "{toValidate} zu prüfen · {expired} abgelaufen",
        "technicalSheetsHelp": "Dokumenttypen, deren Bezeichnung „technisches Datenblatt“ enthält, einer pro betroffenem Lieferanten.",
        "activeFiles": "Aktive Akten",
        "activeSince": "Letzte Aktivität seit dem {date}",
        "activeHelp": "Seit Beginn des vorherigen Quartals geänderte Lieferanten.",
        "projectProgress": "Projektfortschritt",
        "projectProgressAria": "Anzahl der Projekte und durchschnittlicher Fortschritt pro Jahr",
        "projectProgressHelp": "Balken: Projekte nach Jahr der letzten Änderung. Linie: durchschnittlicher Fortschritt in %.",
        "projectsSeries": "Projekte",
        "averageSeries": "Ø Fortschritt (%)",
        "landscape": "Landschaft des Bestands",
        "landscapeAria": "Lieferanten nach Familie und Freigabestatus",
        "landscapeHelp": "Lieferanten nach Familie und Freigabestatus. 3D-Ansicht, wenn der Browser es erlaubt, sonst gruppierte Balken.",
        "freshness": "Aktualität der Akten",
        "freshnessAria": "Lieferanten nach Monat der letzten Aktivität",
        "recent": "Aktiv seit dem {date}",
        "older": "Älter",
        "undated": "{count} Lieferant(en) ohne Aktivitätsdatum",
        "fromCube": "Aus dem beCPG-Entscheidungsmodul gelesen, per Batch befüllt."
    },
    "components/monitor/cockpit/parts#LABELS": {
        "export": "Exportieren",
        "soon": "Anzubinden",
        "decisionModule": "Entscheidungsmodul",
        "chartFailed": "Das Diagramm konnte nicht geladen werden.",
        "window": "Suchfenster: Die Zahlen beziehen sich auf die gelesenen Lieferanten.",
        "unavailable": "Daten nicht verfügbar",
        "empty": "Nichts anzuzeigen",
        "reasons": {
            "denied": "beCPG hat den Zugriff auf diese Information verweigert.",
            "notFound": "Information in beCPG nicht gefunden.",
            "unavailable": "beCPG hat für diesen Block nicht geantwortet. Versuchen Sie es gleich noch einmal.",
            "noMatchingDocumentType": "Kein passender Dokumenttyp in diesem Umfang.",
            "noData": "Keine Daten für diesen Umfang."
        }
    },
    "components/monitor/cockpit/vocabulary#VOCABULARY": {
        "approval": {
            "approved": "Freigegeben",
            "inProgress": "In Bearbeitung",
            "toRenew": "Zu erneuern",
            "suspended": "Gesperrt"
        },
        "documents": {
            "valid": "Gültig",
            "expiring": "Laufen bald ab",
            "toValidate": "Zu prüfen",
            "expired": "Abgelaufen",
            "refused": "Abgelehnt",
            "missing": "Fehlend"
        },
        "taskStates": {
            "planned": "Geplant",
            "inProgress": "In Bearbeitung",
            "completed": "Abgeschlossen",
            "cancelled": "Abgebrochen",
            "refused": "Abgelehnt",
            "onHold": "Wartend"
        },
        "ncAges": {
            "under3Months": "< 3 Monate",
            "from3To12Months": "3-12 Monate",
            "from1To2Years": "1-2 Jahre",
            "over2Years": "> 2 Jahre"
        },
        "nc": {
            "blocking": "Blockierend",
            "nonBlocking": "Nicht blockierend"
        },
        "noFamily": "Ohne Familie",
        "noSubFamily": "Ohne Unterfamilie"
    },
    "components/monitor/supplier/ActivityChart#LABELS": {
        "tasks": "Aufgaben",
        "delay": "Mittlere Antwortzeit (T)",
        "days": "T",
        "aria": "Aufgaben und mittlere Antwortzeit pro Jahr für diesen Lieferanten"
    },
    "components/monitor/supplier/RiskScore#LABELS": {
        "ring": "Risikoscore {score} von 100, Stufe {level}",
        "none": "Kein Risikogrund",
        "scale": "Stufenskala",
        "contributions": "Woraus sich der Score ergibt",
        "points": "+{points}"
    },
    "components/monitor/supplier/SheetLists#LABELS": {
        "documents": {
            "search": "Dokument suchen",
            "document": "Dokument",
            "mandatory": "Pflicht",
            "validity": "Gültigkeit",
            "status": "Status",
            "entity": "Zugeordnet zu",
            "download": "Herunterladen",
            "empty": "Kein Dokument erwartet oder bereitgestellt",
            "file": "lieferanten-dokumente",
            "yes": "Ja",
            "no": "Nein"
        },
        "products": {
            "search": "Produkt suchen",
            "product": "Produkt",
            "code": "Code",
            "state": "Status",
            "completion": "Vollständigkeit",
            "modified": "Aktualisiert",
            "empty": "Kein verknüpftes Produkt",
            "file": "lieferanten-produkte"
        },
        "subSuppliers": {
            "search": "Unterlieferanten suchen",
            "supplier": "Unterlieferant",
            "code": "Code",
            "state": "beCPG-Status",
            "file": "unterlieferanten"
        },
        "activity": {
            "empty": "Kein Austausch erfasst",
            "message": "Nachricht",
            "activity": "Aktivität"
        },
        "unavailable": "beCPG konnte diese Liste nicht liefern: Sie sagt nichts über diesen Lieferanten aus."
    },
    "components/monitor/supplier/StatusLadder#LABELS": {
        "current": "Erfüllte Regel",
        "next": "Danach",
        "approvedWhen": "Freigegeben, wenn",
        "approvedNow": "Alle Bedingungen sind erfüllt",
        "seeAll": "Alle {count} anzeigen",
        "days": "{count} T",
        "on": "zu {name}",
        "conditions": {
            "documentExpired": "Kein Pflichtdokument abgelaufen",
            "blockingNc": "Keine blockierende NC",
            "documentExpiring": "Kein Dokument zu erneuern",
            "openProject": "Kein offenes Projekt",
            "documentMissing": "Kein Pflichtdokument fehlt",
            "blockingCatalog": "Blockierende Kataloge erfüllt"
        },
        "met": "erfüllt",
        "unmet": "nicht erfüllt",
        "progress": "{met} von {total} Bedingung(en) erfüllt"
    },
    "components/monitor/supplier/SupplierBand#LABELS": {
        "erp": "ERP {code}",
        "risk": "Risiko {level} · {score}",
        "created": "Erstellt am",
        "lastActivity": "Letzte Aktivität",
        "startProject": "Projekt starten",
        "openInBecpg": "In beCPG öffnen",
        "actions": "Lieferantenaktionen",
        "parent": "Gehört zu",
        "group": "{count} Unterlieferant(en)"
    },
    "components/products/CatalogPanel#LABELS": {
        "title": "Konformität",
        "overall": "Vollständigkeit",
        "complete": "Vollständig",
        "incomplete": "Unvollständig",
        "missing": "Fehlende Felder",
        "missingCount": "{count} fehlende(s) Feld(er)",
        "duplicates": "Bereits verwendete Werte",
        "duplicateOn": "Bereits verwendet von",
        "duplicateUnnamed": "{count} andere(s) Produkt(e)",
        "protectedFields": "{count} Feld(er) dieses Katalogs werden von Ihrem Kunden ausgefüllt",
        "protectedFieldsHint": "Sie zählen zum Score, werden aber nicht von Ihnen verlangt: Sie können sie nicht eingeben, Ihr Kunde tut dies.",
        "none": "Kein anwendbarer Katalog",
        "noneHint": "Für dieses Produkt ist kein Konformitätskatalog konfiguriert, daher gibt es keine Vollständigkeitsprüfung zu bestehen.",
        "allComplete": "Alle Kataloge sind vollständig",
        "allCompleteHint": "Datenseitig blockiert nichts die Validierung dieses Produkts.",
        "missingHint": "Füllen Sie die folgenden Felder aus, um 100 % zu erreichen — sie halten die Validierung zurück.",
        "goToField": "Zum Feld",
        "notScored": "Nicht bewertet"
    },
    "components/products/CompletionMeter#LABELS": {
        "title": "Vollständigkeit",
        "noScore": "Noch nicht bewertet",
        "notCounted": "nicht in der Bewertung",
        "more": "+ {count} weitere(r) Katalog(e)"
    },
    "components/products/ProductHeader#LABELS": {
        "code": "Code",
        "branch": "Aktualisierung in Bearbeitung",
        "branchFrom": "Aktualisierung der Version {version}",
        "branchTitle": "Dieses Datenblatt ist eine für die Listung erstellte Arbeitskopie.",
        "branchTitleLocked": "Dieses Datenblatt ist die für die Listung erstellte Arbeitskopie. Die freigegebene Version existiert auf Kundenseite, Sie haben jedoch keinen Lesezugriff darauf.",
        "erpCode": "ERP-Code",
        "supplier": "Lieferant",
        "subsidiary": "Tochtergesellschaft",
        "project": "Projekt",
        "modified": "Aktualisiert",
        "created": "Angelegt am",
        "version": "Version",
        "legalName": "Firmierung",
        "back": "Meine Produkte",
        "types": {
            "bcpg:rawMaterial": "Rohstoff",
            "bcpg:finishedProduct": "Fertigprodukt",
            "bcpg:semiFinishedProduct": "Halbfertigprodukt",
            "bcpg:localSemiFinishedProduct": "Lokales Halbfertigprodukt",
            "bcpg:packagingMaterial": "Verpackung",
            "bcpg:packagingKit": "Verpackungskit",
            "bcpg:supplier": "Lieferant",
            "bcpg:productSpecification": "Spezifikation",
            "qa:nc": "Abweichung"
        }
    },
    "components/products/ProductSections#LABELS": {
        "sheet": "Datenblatt",
        "compliance": "Konformität",
        "documents": "Dokumente",
        "specs": "Spezifikationen",
        "sections": "Abschnitte des Datenblatts",
        "noProperties": "Keine Eigenschaft anzuzeigen",
        "noPropertiesHint": "Die Eigenschaften dieses Produkts werden von der Assistentenkonfiguration nicht bereitgestellt.",
        "rawProperties": "Eigenschaften",
        "rawNotice": "Technische Bezeichnungen: Die Assistentenkonfiguration ist für dieses Produkt nicht verfügbar.",
        "noData": "Keine Daten bereitgestellt",
        "noDataHint": "Dieser Abschnitt enthält keine Zeile für dieses Produkt.",
        "configTitle": "Konfiguration nicht verfügbar",
        "configHint": "Die Konfiguration dieses Abschnitts konnte nicht geladen werden. Die anderen Registerkarten bleiben verfügbar.",
        "yes": "Ja",
        "no": "Nein",
        "versionLoading": "Version wird gelesen…",
        "versionUnavailable": "Nicht in Versionen gespeichert",
        "versionUnavailableHint": "Dieser Abschnitt ist in der aktuellen Version des Datenblatts einsehbar.",
        "versionRows": "{count} Zeile(n)"
    },
    "components/products/ProductTaskBanner#LABELS": {
        "one": "Zu diesem Datenblatt ist eine Aufgabe offen",
        "many": "Zu diesem Datenblatt sind mehrere Aufgaben offen",
        "open": "Aufgabe öffnen",
        "all": "Aufgaben dieses Produkts anzeigen",
        "untitled": "Aufgabe ohne Titel"
    },
    "components/products/UpdateRequestDialog#LABELS": {
        "title": "Aktualisierung anfordern",
        "template": "Art der Anfrage",
        "templatePlaceholder": "Auswählen…",
        "noTemplate": "Ihr Kunde hat Lieferanten keine Art von Anfrage freigegeben. Schreiben Sie ihm über Nachrichten.",
        "reason": "Grund der Anfrage",
        "reasonHint": "Neue Rezeptur, neue Herkunft, neuer Produktionsstandort, neues technisches Datenblatt…",
        "submit": "Anfrage senden",
        "sent": "Anfrage gesendet. Eine Aktualisierungsaufgabe wurde für Sie eröffnet."
    },
    "components/products/VersionPicker#LABELS": {
        "open": "Versionen des Datenblatts",
        "current": "aktuell",
        "failed": "Der Verlauf konnte nicht gelesen werden.",
        "none": "Keine frühere Version",
        "by": "von {author}"
    },
    "components/review/ReviewChanges#LABELS": {
        "title": "{count} Änderung(en) seit der Referenz",
        "none": "Keine Änderung seit der Referenz",
        "added": "Hinzugefügt",
        "removed": "Entfernt",
        "empty": "leer",
        "flag": "Markieren",
        "flagged": "Markiert",
        "flagText": "zu prüfen ({before} → {after})",
        "addedText": "Zeile hinzugefügt, zu prüfen",
        "removedText": "Zeile entfernt, zu prüfen",
        "show": "Änderungen anzeigen",
        "hide": "Änderungen ausblenden"
    },
    "components/review/ReviewWorkspace#LABELS": {
        "due": "Fällig am {date}",
        "late": "Überfällig",
        "comparedBranch": "Verglichen mit dem validierten Datenblatt",
        "comparedVersion": "Verglichen mit Version {label} vom {date}",
        "noReference": "Erste Version: nichts zu vergleichen",
        "progress": "{done} von {total} Abschnitt(en) geprüft",
        "validateHint": "„Datenblatt validieren“ wird aktiv, sobald jeder Abschnitt akzeptiert ist",
        "sendBack": "An den Lieferanten zurücksenden ({count})",
        "validate": "Datenblatt validieren",
        "sections": "Zu prüfende Abschnitte",
        "compliance": "Konformität",
        "accepted": "akzeptiert",
        "returned": "Korrektur angefordert",
        "toRead": "zu prüfen",
        "legendAccepted": "akzeptiert",
        "legendReturned": "Korrektur angefordert",
        "legendChanged": "Änderungen seit der Referenz",
        "frozen": "Validierte Liste",
        "accept": "Akzeptieren und weiter",
        "acceptLast": "Akzeptieren",
        "askCorrection": "Korrektur anfordern",
        "correctionPlaceholder": "Was der Lieferant in diesem Abschnitt korrigieren muss…",
        "addRemark": "Zur Rückmeldung hinzufügen",
        "cancel": "Abbrechen",
        "returnTitle": "Rückmeldung an den Lieferanten",
        "returnEmpty": "Keine Korrektur angefordert. Markieren Sie eine Zeile oder fordern Sie eine Korrektur für einen Abschnitt an.",
        "remove": "Entfernen",
        "messageLabel": "An den Lieferanten gesendete Nachricht",
        "messageIntro": "Guten Tag,\n\nvor der Validierung des Datenblatts „{name}“ bitten wir Sie, Folgendes zu korrigieren:",
        "messageOutro": "\n\nMit freundlichen Grüßen",
        "sendBackTitle": "Datenblatt an den Lieferanten zurücksenden?",
        "sendBackConfirm": "Zurücksenden",
        "validateTitle": "Datenblatt validieren?",
        "validateMessage": "Die Aufgabe ist abgeschlossen und das Projekt geht zum nächsten Schritt über.",
        "sent": "Datenblatt an den Lieferanten zurückgesendet.",
        "validated": "Datenblatt validiert.",
        "discussion": "Austausch mit dem Lieferanten",
        "closed": "Diese Aufgabe ist abgeschlossen: Die Prüfung ist schreibgeschützt."
    },
    "components/shell/Header#LOCAL_LABELS": {
        "menu": "Menü öffnen",
        "account": "Mein Konto",
        "home": "beCPG — Startseite des Portals"
    },
    "components/shell/Nav#LOCAL_LABELS": {
        "more": "Mehr",
        "menu": "Menü",
        "close": "Menü schließen",
        "supplierSpace": "Lieferantenbereich",
        "monitorSpace": "Überwachungsbereich",
        "collapse": "Menü einklappen",
        "expand": "Menü ausklappen"
    },
    "components/shell/NotificationBell#LOCAL": {
        "open": "Benachrichtigungen",
        "panel": "Benachrichtigungen",
        "close": "Schließen",
        "refresh": "Aktualisieren",
        "markRead": "Als gelesen markieren",
        "countOne": "1 ausstehende Benachrichtigung",
        "countMany": "{count} ausstehende Benachrichtigungen",
        "countNone": "Keine Benachrichtigung",
        "updatedAt": "Aktualisiert um {time}",
        "more": "und {count} weitere — siehe „Meine Dokumente“ und „Meine Aufgaben“",
        "moreTasks": "und {count} weitere — siehe „Meine Aufgaben“",
        "allTasks": "Meine Aufgaben",
        "allDocuments": "Meine Dokumente"
    },
    "components/shell/SupplierSwitcher#LABELS": {
        "all": "Alle Lieferanten",
        "change": "Lieferanten wechseln",
        "current": "Ausgewählter Lieferant",
        "group": "Meine Lieferantendatensätze",
        "scope": "Bereich"
    },
    "components/signature/PdfViewer#LABELS": {
        "previous": "Vorherige Seite",
        "next": "Nächste Seite",
        "page": "Seite",
        "of": "von {pages}",
        "zoomIn": "Vergrößern",
        "zoomOut": "Verkleinern",
        "fit": "An Breite anpassen",
        "download": "PDF herunterladen",
        "loading": "Dokument wird geladen…",
        "pageLoading": "Seite {page} wird geladen…",
        "error": "Dieses Dokument konnte nicht angezeigt werden",
        "errorHint": "Die Datei ist möglicherweise geschützt oder vorübergehend nicht verfügbar. Sie können es erneut versuchen oder sie herunterladen, um sie zu lesen.",
        "retry": "Erneut versuchen",
        "pinch": "Zum Zoomen zusammenziehen"
    },
    "components/signature/SignatureDocument#LABELS": {
        "zonesHint": "Die Rahmen zeigen, wo Ihre Unterschrift und Ihre Paraphe angebracht werden.",
        "counter": "Dokument {index} von {total}",
        "read": "Gelesen",
        "unavailable": "Dokument nicht verfügbar",
        "unavailableHint": "Dieses Dokument ist in beCPG nicht mehr zugänglich: Es wurde möglicherweise nach der Unterzeichnung ersetzt, oder Ihr Zugriff darauf wurde entfernt. Bitten Sie Ihren Kunden um eine Kopie, falls Sie eine benötigen."
    },
    "components/signature/SignatureFlow#LABELS": {
        "title": "Signatur",
        "back": "Meine Aufgaben",
        "loading": "Dokument wird geöffnet…",
        "notFound": "Kein Dokument zu unterzeichnen",
        "notFoundHint": "Diese Aufgabe verweist auf kein signierbares Dokument. Das Ergebnis ist möglicherweise noch in Vorbereitung — wenden Sie sich über die Projektdiskussion an Ihren Kunden.",
        "readTitle": "Lesen des Dokuments",
        "progress": "{seen} / {pages} Seiten gelesen",
        "progressDone": "Gesamtes Dokument gelesen",
        "progressHint": "Die Schaltfläche zum Unterzeichnen wird freigeschaltet, sobald jede Seite angezeigt wurde.",
        "readyHint": "Alles bereit: Ihre Unterschrift wird auf dem Dokument angebracht.",
        "goToPage": "Auf Seite {page} fortfahren",
        "goToDocumentPage": "Bei Dok. {document}, Seite {page} fortfahren",
        "documentCount": "{count} Dokumente zu unterzeichnen",
        "toSignature": "Zur Unterschrift",
        "signTitle": "Ihre Unterschrift",
        "initialsTitle": "Ihre Paraphe",
        "initialsHint": "Sie wird unten auf jeder Seite angebracht.",
        "consent": "Ich habe das gesamte Dokument gelesen und stimme zu, es elektronisch zu unterzeichnen. Ich erkenne an, dass diese Unterschrift denselben Wert wie eine handschriftliche hat.",
        "sign": "Dokument unterzeichnen",
        "signing": "Wird unterzeichnet…",
        "blockedRead": "Lesen Sie jede Seite, um unterzeichnen zu können.",
        "blockedSignature": "Fügen Sie Ihre Unterschrift hinzu.",
        "blockedInitials": "Fügen Sie Ihre Paraphe hinzu.",
        "blockedConsent": "Kreuzen Sie das Einverständniskästchen an.",
        "successTitle": "Dokument unterzeichnet",
        "successBody": "Ihre Unterschrift wurde erfasst. beCPG bringt sie auf dem Dokument an und sendet Ihnen eine Kopie per E-Mail. Sie finden sie auch unter Meine Dokumente › Unterzeichnet.",
        "successNext": "Weiter wird nichts von Ihnen erwartet: Die Aufgabe wird geschlossen und Ihr Kunde benachrichtigt.",
        "successDownload": "Dokument herunterladen",
        "successBack": "Zurück zu meinen Aufgaben",
        "signedTitle": "Dieses Dokument ist bereits unterzeichnet",
        "signedBody": "Für diese Aufgabe wurde bereits eine Unterschrift erfasst. Nichts zu wiederholen — Sie können das Dokument herunterladen.",
        "signedBodyNoCopy": "Für diese Aufgabe wurde bereits eine Unterschrift erfasst. Nichts zu wiederholen. Das Dokument ist über das Portal nicht mehr erreichbar; bitten Sie Ihren Kunden um eine Kopie, falls Sie eine benötigen.",
        "signedView": "Dokument anzeigen",
        "signedComplete": "Aufgabe abschließen",
        "signedCompleteDone": "Aufgabe abgeschlossen.",
        "signedCompleteError": "Die Aufgabe konnte nicht abgeschlossen werden.",
        "cancelledTitle": "Signatur abgebrochen",
        "cancelledBody": "Diese Signaturanfrage wurde von Ihrem Kunden abgebrochen. Es wird keine Aktion von Ihnen erwartet.",
        "closedTitle": "Aufgabe bereits bearbeitet",
        "closedBody": "Diese Aufgabe ist nicht mehr offen. Wenn Sie glauben, dass es sich um einen Fehler handelt, wenden Sie sich an Ihren Kunden.",
        "externalTitle": "Signatur bei Ihrem Anbieter",
        "externalBody": "Ihr Kunde nutzt einen externen Signaturdienst. Das Dokument wird in einem neuen Tab geöffnet; kehren Sie danach hierher zurück.",
        "externalOpen": "Signatur öffnen",
        "failed": "Die Unterschrift konnte nicht erfasst werden.",
        "failedNetwork": "Die Verbindung ist während des Hochladens abgebrochen. Ihre Unterschrift ist nicht verloren: Versuchen Sie es erneut, sie wird nicht doppelt erfasst.",
        "retry": "Erneut versuchen",
        "refresh": "Aktualisieren",
        "leaving": "Die Unterschrift wird gesendet. Wenn Sie die Seite jetzt verlassen, kann der Vorgang unterbrochen werden.",
        "document": "Dokument"
    },
    "components/signature/SignaturePad#LABELS": {
        "draw": "Zeichnen",
        "type": "Meinen Namen eingeben",
        "drawHint": "Unterschreiben Sie im Rahmen mit dem Finger, einem Stift oder der Maus.",
        "typeHint": "Ihr Name wird als Unterschrift angebracht.",
        "namePlaceholder": "Vorname NACHNAME",
        "nameLabel": "Name des Unterzeichners",
        "clear": "Leeren",
        "undo": "Letzten Strich rückgängig machen",
        "preview": "Vorschau Ihrer Unterschrift",
        "empty": "Noch keine Unterschrift",
        "required": "Ihre Unterschrift ist erforderlich, um fortzufahren.",
        "initialsType": "Meine Initialen eingeben",
        "initialsDrawHint": "Zeichnen Sie Ihre Initialen im Rahmen.",
        "initialsTypeHint": "Diese Initialen werden als Paraphe angebracht.",
        "initialsNameLabel": "Initialen",
        "initialsPlaceholder": "VL",
        "initialsPreview": "Vorschau Ihrer Initialen",
        "initialsEmpty": "Noch keine Initialen"
    },
    "components/signature/SignatureZones#DEFAULT_LABELS": {
        "signature": "Unterschrift",
        "initials": "Paraphe",
        "date": "Datum",
        "text": "Text"
    },
    "components/specs/SpecPanel#LABELS": {
        "title": "Spezifikationen",
        "subtitle": "Für Ihre Produkte geltende Referenzdokumente",
        "consult": "Anzeigen",
        "open": "Öffnen",
        "download": "Herunterladen",
        "appliesTo": "Gilt für",
        "andOthers": "und {count} weitere",
        "updated": "Aktualisiert am {date}",
        "search": "Spezifikation suchen",
        "none": "Keine Spezifikation",
        "noneHint": "Diesem Bereich ist keine Spezifikation zugeordnet. Der Kunde teilt eine mit Ihnen, falls eine zutrifft.",
        "noResult": "Keine Spezifikation entspricht dieser Suche",
        "count": "{count} Dokument(e)",
        "readFirst": "Vor dem Ausfüllen lesen",
        "unreadable": "{count} Spezifikation(en) gelten für Ihre Produkte, aber Ihr Konto kann sie nicht öffnen. Bitten Sie Ihren Kunden um Zugriff."
    },
    "components/survey/DecisionTree#LABELS": {
        "required": "Pflichtfrage",
        "noAnswer": "Nicht beantwortet",
        "choose": "Antwort auswählen",
        "openLink": "Link öffnen",
        "answer": "Antwort",
        "blank": "Diese Pflichtfrage ist noch unbeantwortet."
    },
    "components/tasks/TaskActions#LABELS": {
        "complete": "Aufgabe abschließen",
        "refuse": "Ablehnen",
        "completeTitle": "Diese Aufgabe abschließen?",
        "completeMessage": "Die Aufgabe wird als erledigt markiert und das Projekt geht zum nächsten Schritt über.",
        "refuseTitle": "Diese Aufgabe ablehnen?",
        "refuseReason": "Grund der Ablehnung",
        "refuseReasonHint": "Dieser Text wird an den Lieferanten gesendet: Teilen Sie ihm mit, was zu korrigieren ist.",
        "refuseReasonRequired": "Für eine Ablehnung ist eine Begründung erforderlich.",
        "cancel": "Abbrechen",
        "completed": "Aufgabe abgeschlossen.",
        "refused": "Aufgabe abgelehnt."
    },
    "components/ui/DataTable#LOCAL_LABELS": {
        "selectAll": "Alle auswählen",
        "selectRow": "Zeile auswählen",
        "columns": "Sichtbare Spalten",
        "rowsPerPage": "Zeilen pro Seite",
        "export": "Exportieren",
        "legend": "Legende"
    },
    "components/ui/EmptyState#SENTENCES": {
        "empty": "Hier gibt es noch nichts anzuzeigen. Elemente erscheinen, sobald sie angelegt oder eingereicht werden.",
        "search": "Kein Element entspricht Ihrer Suche. Versuchen Sie es mit weniger Wörtern oder entfernen Sie einen der Filter."
    },
    "components/ui/TabScroller#LOCAL": {
        "previous": "Vorherige Registerkarten",
        "next": "Nächste Registerkarten"
    },
    "components/wizard/AutoSaveIndicator#LABELS": {
        "pending": "Ausstehende Änderungen",
        "saving": "Wird gespeichert…",
        "saved": "gespeichert um {time}",
        "savedShort": "Gespeichert",
        "error": "Speichern nicht möglich",
        "retry": "Erneut versuchen",
        "unsaved": "Ihre Änderungen gehen nicht verloren: Sie werden erneut gesendet."
    },
    "components/wizard/TechnicalSheetBanner#LABELS": {
        "title": "Technisches Datenblatt",
        "deposited": "Hochgeladen am {date}",
        "replace": "Ersetzen",
        "cancel": "Abbrechen",
        "missing": "Technisches Datenblatt fehlt",
        "missingHint": "Laden Sie Ihr technisches Datenblatt hoch, um die KI-Vorschläge zu aktivieren.",
        "missingClosed": "Für dieses Datenblatt wurde kein technisches Datenblatt hochgeladen."
    },
    "components/wizard/Wizard#LABELS": {
        "context": "Kontext",
        "discussion": "Diskussion",
        "documents": "Dokumente",
        "technicalSheet": "Technisches Datenblatt",
        "suggestions": "Vorschläge",
        "compliance": "Konformität",
        "properties": "Eigenschaften",
        "list": "Liste",
        "survey": "Fragebogen",
        "readOnly": "Schreibgeschützt",
        "readOnlyReasons": {
            "readAccess": "Sie haben nur Lesezugriff auf dieses Datenblatt.",
            "noAssignedTask": "Ihnen ist zu diesem Datenblatt keine Aufgabe zugewiesen: Die Eingabe ist geschlossen.",
            "wizardReadOnly": "Dieser Assistent ist als schreibgeschützt konfiguriert."
        },
        "finish": "Abschließen",
        "finished": "Aufgabe an Ihren Kunden gesendet",
        "finishBlocked": "Füllen Sie die fehlenden Felder des Schritts „Konformität“ aus, um abzuschließen.",
        "finishMissingStep": "„{step}“: {count} Pflichtantwort(en) fehlen.",
        "finishGapStep": "{step} · {count} Feld(er)",
        "finishGapCatalog": "{step} · {count} erwartet",
        "finishGapCatalogPlain": "{step} zu vervollständigen",
        "notFound": "Datenblatt nicht gefunden",
        "notFoundHint": "Dieses Datenblatt existiert nicht oder gehört nicht zu Ihrem Bereich.",
        "delegated": "Sie füllen im Namen von {supplier} aus",
        "due": "Fällig am {date}",
        "step": "Schritt",
        "widen": "Eingabebereich vergrößern",
        "widenHint": "Blendet die Seitenpanels aus und reduziert die Schritte auf ihre Symbole.",
        "restore": "Panels wiederherstellen",
        "steps": "Schritte"
    },
    "components/wizard/WizardFooter#LABELS": {
        "previous": "Zurück",
        "next": "Weiter",
        "finish": "Abschließen",
        "finishing": "Wird gesendet…",
        "formulating": "Wird neu berechnet…",
        "blocked": "Abschluss noch nicht möglich",
        "incomplete": "Datenblatt unvollständig"
    },
    "components/wizard/WizardStepper#LABELS": {
        "title": "Schritte",
        "step": "Schritt {index} von {total}",
        "open": "Schritt auswählen",
        "frozen": "Vom Kunden validiert",
        "readOnly": "Schreibgeschützt",
        "done": "Besucht",
        "complete": "Vollständig",
        "current": "Aktueller Schritt",
        "todo": "Noch nicht besucht",
        "locked": "Später verfügbar",
        "incomplete": "{count} Pflichtangabe(n) fehlen",
        "catalogGap": "{count} vom Katalog erwartete(s) Feld(er)",
        "remaining": "{count} Abschnitt(e) zu vervollständigen",
        "remainingNone": "Nichts als fehlend gemeldet",
        "remainingHint": "Ihr Kunde wartet auf diese Informationen, um das Datenblatt zu validieren.",
        "remainingHintNone": "Sie können jederzeit zu jedem Schritt zurückkehren.",
        "collapse": "Schritte einklappen",
        "expand": "Schritte ausklappen"
    },
    "components/wizard/panels/CommentsPanel#LABELS": {
        "title": "Diskussion",
        "subtitle": "Ihr Austausch mit Ihrem Kunden zu diesem Datenblatt",
        "subtitleInternal": "Ihr Austausch mit dem Lieferanten zu diesem Datenblatt",
        "emptyHintInternal": "Stellen Sie dem Lieferanten eine Frage oder antworten Sie auf eine seiner Anmerkungen.",
        "placeholder": "Nachricht schreiben…",
        "send": "Senden",
        "empty": "Keine Nachricht",
        "emptyHint": "Stellen Sie Ihrem Kunden eine Frage oder antworten Sie auf eine seiner Anmerkungen.",
        "emptyAnchored": "Keine Nachricht zu diesem Element",
        "subject": "Thema",
        "whole": "Das gesamte Datenblatt",
        "onField": "Feld: {label}",
        "onRow": "Zeile: {label}",
        "onRowOfList": "Zeile „{label}“ von „{list}“",
        "inList": "Eine Zeile von „{list}“",
        "row": "eine Zeile",
        "anchored": "Zu {label}",
        "clear": "Verankerung entfernen",
        "readOnly": "Die Diskussion ist schreibgeschützt.",
        "posting": "Wird gesendet…",
        "count": "{count} Nachricht(en)",
        "denyReasons": {
            "noAssignedTask": "Die Listung ist abgeschlossen: Diese Diskussion ist schreibgeschützt.",
            "readAccess": "Sie haben nur Lesezugriff auf dieses Datenblatt.",
            "noPermission": "Sie dürfen in dieser Diskussion nicht schreiben."
        }
    },
    "components/wizard/panels/HelpPanel#LABELS": {
        "title": "Kontext",
        "suggestions": "KI-Vorschläge",
        "specs": "Spezifikationen",
        "specsEmpty": "Diesem Datenblatt ist keine Spezifikation zugeordnet.",
        "specsUnreadable": "Diesem Datenblatt ist eine Spezifikation zugeordnet, aber Ihr Konto kann sie nicht öffnen.",
        "refusals": "Frühere Ablehnungen",
        "refusalsEmpty": "Keine Ablehnung zu diesem Datenblatt.",
        "refusalsHint": "Diese Schritte wurden an Sie zurückgesandt: Lesen Sie die zugehörige Anmerkung, bevor Sie erneut senden.",
        "onField": "zu {field}",
        "seeStep": "Öffnen",
        "more": "+{count} weitere"
    },
    "components/wizard/steps/DataListStep#LABELS": {
        "row": "Zeile {index}"
    },
    "components/wizard/steps/DocumentsStep#LABELS": {
        "title": "Erwartete Dokumente",
        "subtitle": "Was Ihr Kunde erwartet, und bis wann.",
        "otherTitle": "Weitere Dokumente",
        "otherSubtitle": "Die Dateien im Ordner, die keiner der obigen Anforderungen entsprechen. Legen Sie hier jedes nützliche Dokument ab (Foto, Analyse…).",
        "blocking": "{count} Pflichtdokument(e) fehlen",
        "allGood": "Alle Pflichtdokumente sind bereitgestellt",
        "readOnly": "Sie können zu diesem Datenblatt kein Dokument hinterlegen."
    },
    "components/wizard/steps/FormStep#LABELS": {
        "comment": "Dieses Feld kommentieren",
        "comments": "{count} Nachricht(en) zu diesem Feld",
        "catalogGap": "Vom Katalog Ihres Kunden erwartet",
        "catalogGapLocale": "Vom Katalog Ihres Kunden in {locale} erwartet",
        "frozenTitle": "Von Ihrem Kunden validierter Abschnitt",
        "frozenText": "Ihr Kunde hat diese Informationen validiert: Sie sind gesperrt und können nicht mehr geändert werden. Falls eine Korrektur nötig ist, bitten Sie über die Diskussion um die Wiederöffnung.",
        "readAccessTitle": "Schreibgeschützt",
        "readAccessText": "Sie haben keinen Schreibzugriff auf dieses Datenblatt.",
        "noTaskTitle": "Keine offene Aufgabe",
        "noTaskText": "Dieses Datenblatt ist Ihnen derzeit nicht zugewiesen: Sie können es lesen, aber nicht ändern.",
        "readOnlyTitle": "Schreibgeschützt",
        "readOnlyText": "Dieser Schritt kann nicht geändert werden."
    },
    "components/wizard/steps/ReviewStep#LABELS": {
        "title": "Konformität",
        "subtitle": "Was noch fehlt, bevor Ihr Kunde das Datenblatt validieren kann.",
        "subtitleInternal": "Was im Datenblatt des Lieferanten noch fehlt.",
        "blocking": "Blockierende(r) Katalog(e): {names}",
        "blockingHint": "Füllen Sie die fehlenden Felder unten aus, um abschließen zu können.",
        "ready": "Alle blockierenden Kataloge sind erfüllt",
        "incomplete": "Zu vervollständigende(r) Katalog(e): {names}",
        "documents": "Pflichtdokumente",
        "documentsMissing": "{count} Pflichtdokument(e) fehlen",
        "documentsOk": "Alle Pflichtdokumente sind bereitgestellt",
        "reviewTitle": "Schreibgeschütztes Datenblatt",
        "reviewSubtitle": "Sie sehen dieses Datenblatt ein: Keine Änderung ist möglich.",
        "expand": "Anzeigen",
        "collapse": "Ausblenden",
        "expandAll": "Alle aufklappen",
        "collapseAll": "Alle zuklappen",
        "reviewed": "Abschnitt geprüft",
        "reviewedHint": "Haken Sie die Abschnitte nach und nach ab: {done} von {total} geprüft.",
        "empty": "Nichts anzuzeigen"
    },
    "components/wizard/steps/SuggestionsStep#LABELS": {
        "title": "Automatische Extraktion",
        "subtitle": "Diese Werte wurden aus den von Ihnen hinterlegten Dokumenten gelesen. Prüfen Sie sie: Sie behalten die Kontrolle.",
        "applied": "Automatisch übernommen",
        "appliedHint": "Hohe Konfidenz: Der Wert ist bereits eingetragen, Sie können ihn rückgängig machen.",
        "toConfirm": "Zu bestätigen",
        "toConfirmHint": "Prüfen Sie den vorgeschlagenen Wert und übernehmen Sie ihn dann.",
        "flagged": "Selbst eingeben",
        "flaggedHint": "Die Extraktion ist nicht zuverlässig genug: Wir überlassen Ihnen lieber die Eingabe.",
        "unscored": "Vorschläge",
        "unscoredHint": "Diese Vorschläge haben keinen Konfidenzwert.",
        "apply": "Übernehmen",
        "expand": "Erweitern",
        "applyAnyway": "Trotzdem übernehmen",
        "revoke": "Rückgängig",
        "restore": "Überprüfen",
        "applying": "Wird übernommen…",
        "appliedAt": "Übernommen",
        "revoked": "Rückgängig gemacht",
        "dismissed": "Verworfen",
        "notRevocable": "Der vorherige Wert kann nicht automatisch wiederhergestellt werden: Bearbeiten Sie das Feld bei Bedarf direkt.",
        "empty": "Kein Vorschlag",
        "emptyHint": "Für diesen Schritt gibt es nichts vorzuschlagen. Das technische Datenblatt ist direkt darüber hochgeladen: Die Extraktion schlägt die dort gefundenen Werte vor.",
        "emptyEntityLevel": "Die Analyse wurde ausgeführt, hat aber nur Ableitungen aus dem Datenblatt selbst ergeben, ohne stützendes Dokument: Sie werden Ihnen nicht angeboten.",
        "analysing": "Analyse läuft",
        "analysingHint": "Das Portal liest Ihre Dokumente. Die Vorschläge erscheinen hier von selbst, ohne dass Sie die Seite verlassen: Das Lesen eines technischen Datenblatts dauert in der Regel weniger als eine Minute.",
        "analysingPlugins": "Läuft: {plugins}",
        "refresh": "Analyse erneut ausführen",
        "readOnly": "Dieses Datenblatt ist schreibgeschützt: Vorschläge können nicht übernommen werden.",
        "source": "Quelle",
        "changes": "{count} Wert(e)",
        "error": "Die Übernahme des Vorschlags ist fehlgeschlagen."
    },
    "components/wizard/steps/SurveyStep#LABELS": {
        "discuss": "Diskussion",
        "answered": "{answered} von {total} beantwortet",
        "empty": "Keine Frage",
        "emptyHint": "Ihr Kunde hat für dieses Datenblatt noch keinen Fragebogen veröffentlicht.",
        "check": "Meine Antworten prüfen",
        "complete": "Fragebogen vollständig",
        "missingTitle": "{count} Pflichtfrage(n) noch unbeantwortet",
        "missingHint": "Wählen Sie eine aus, um direkt dorthin zu springen. Ihre anderen Antworten sind bereits gespeichert.",
        "readOnly": "Nur Ansicht",
        "noneAnswered": "Keine Antwort erfasst",
        "noneAnsweredHint": "Der Fragebogen entfaltet sich, während Sie ihn beantworten.",
        "dropped": "Ihr Kunde hat keinen Speicherort für {count} Ihrer Antworten vorgesehen: {questions}. Sie werden nicht gespeichert — informieren Sie Ihren Kunden."
    },
    "lib/adapters/monitor#CSV_HEADERS": {
        "code": "Code",
        "name": "Lieferant",
        "legalName": "Firmierung",
        "approvalStatus": "Freigabestatus",
        "approvalReasons": "Gründe",
        "completion": "Vollständigkeit (%)",
        "risk": "Risiko",
        "riskLevel": "Risikostufe",
        "documentsExpired": "Abgelaufene Dokumente",
        "documentsExpiring": "Ablaufende Dokumente",
        "documentsMissing": "Fehlende Dokumente",
        "openNc": "Offene NCs",
        "openProjects": "Offene Projekte",
        "family": "Familie",
        "lastActivity": "Letzte Aktivität",
        "state": "Status",
        "compliance": "Konformität (%)"
    },
    "config/messages#messages": {
        "app.title": "Lieferantenportal",
        "app.shortTitle": "Portal",
        "app.tenantSuffix": "Lieferantenbereich",
        "app.description": "beCPG-Lieferantenportal — Listung, Dokumente und Konformität",
        "nav.dashboard": "Dashboard",
        "nav.tasks": "Meine Aufgaben",
        "nav.products": "Meine Produkte",
        "nav.documents": "Meine Dokumente",
        "nav.company": "Mein Unternehmen",
        "nav.specs": "Spezifikationen",
        "nav.messages": "Diskussionen",
        "nav.notifications": "Benachrichtigungen",
        "nav.help": "Hilfe",
        "nav.monitor": "Überwachung",
        "nav.monitor.suppliers": "Lieferanten",
        "nav.monitor.products": "Lieferantenprodukte",
        "nav.monitor.documents": "Dokumentenkonformität",
        "nav.monitor.campaigns": "Projekte",
        "nav.monitor.quality": "Abweichungen",
        "nav.monitor.reports": "Berichte",
        "nav.monitor.tasks": "Meine Aufgaben",
        "account.profile": "Mein Profil",
        "account.language": "Sprache",
        "account.login": "Anmelden",
        "account.logout": "Abmelden",
        "account.tenant": "Kunde",
        "account.suppliers": "Meine Lieferantendatensätze",
        "account.allSuppliers": "Alle Lieferanten",
        "action.save": "Speichern",
        "action.cancel": "Abbrechen",
        "action.close": "Schließen",
        "action.back": "Zurück",
        "action.next": "Weiter",
        "action.previous": "Zurück",
        "action.submit": "Absenden",
        "action.confirm": "Bestätigen",
        "action.delete": "Löschen",
        "action.download": "Herunterladen",
        "action.upload": "Datei hochladen",
        "action.retry": "Erneut versuchen",
        "action.search": "Suchen",
        "action.filter": "Filtern",
        "action.reset": "Zurücksetzen",
        "action.export": "Exportieren",
        "action.sign": "Unterzeichnen",
        "action.showMore": "{count} weitere",
        "action.showLess": "Weniger anzeigen",
        "suggestion.replaces": "Ersetzt {value}",
        "state.loading": "Wird geladen…",
        "state.saving": "Wird gespeichert…",
        "state.saved": "Gespeichert",
        "state.empty": "Nichts anzuzeigen",
        "state.noResults": "Kein Ergebnis für diese Suche",
        "state.required": "Pflichtfeld",
        "state.of": "{from}-{to} von {total}",
        "state.page": "Seite {page} von {pages}",
        "state.atLeast": "mindestens {total}",
        "error.title": "Ein Fehler ist aufgetreten",
        "error.generic": "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
        "error.network": "Der Server ist nicht erreichbar.",
        "error.upstream": "beCPG hat einen Fehler zurückgegeben. Versuchen Sie es erneut; falls das Problem weiterhin besteht, melden Sie es Ihrem Administrator.",
        "error.unauthorized": "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.",
        "error.forbidden": "Sie sind nicht berechtigt, diese Aktion auszuführen.",
        "error.notFound": "Diese Seite oder dieses Element existiert nicht.",
        "error.tenant": "Ihrem Konto ist kein Kunde zugeordnet.",
        "error.upload": "Das Hochladen der Datei ist fehlgeschlagen.",
        "error.http": "Fehler {status}: {message}",
        "status.approved": "Freigegeben",
        "status.inProgress": "In Bearbeitung",
        "status.toRenew": "Zu erneuern",
        "status.suspended": "Gesperrt",
        "status.valid": "Gültig",
        "status.expiring": "Läuft bald ab",
        "status.expired": "Abgelaufen",
        "status.missing": "Fehlend",
        "status.validityMissing": "Gültigkeit auszufüllen",
        "status.rejected": "Abgelehnt",
        "status.pending": "Ausstehend",
        "status.completed": "Abgeschlossen",
        "status.late": "Überfällig",
        "status.draft": "Simulation",
        "status.notApplicable": "Nicht zutreffend",
        "test.banner": "TEST-Instanz — hier eingegebene Daten sind nicht vertraglich verbindlich",
        "test.badge": "Test",
        "app.monitorSuffix": "Lieferantensteuerung"
    },
    "components/monitor/HistoryPanel#LABELS": {
        "title": "Entwicklung",
        "help": "Aus dem beCPG-Entscheidungsmodul gelesen, per Batch geladen: Die Zahlen können vom letzten Ladevorgang stammen.",
        "period": "Zeitraum",
        "measures": {
            "stepsNumber": "Aufgaben",
            "averageActualDurations": "Ø tatsächliche Dauer (T)",
            "refusalRate": "Ablehnungsquote",
            "avgResponseDelay": "Ø Antwortzeit (T)",
            "averageProgress": "Ø Fortschritt",
            "projectsNumber": "Projekte"
        }
    },
    "components/ui/useListExport#LABELS": {
        "done": "{count} Zeile(n) exportiert.",
        "cut": "Teilexport: {count} Zeile(n), die Grenze eines Exports. Verfeinern Sie die Filter für den Rest."
    }
};

export default LOCALE;
