# Überarbeitung Kartenteil — Design

Stand: 30. Juli 2026
Grundlage: `überarbeitung-30.7.2026`, Abschnitt „Feinheiten" (Punkte 19–25)

## Ziel

Der Kartenteil soll aufhören, mehr Genauigkeit zu behaupten, als die Quelle hergibt, und
lesbar werden, wo er heute überladen ist. Drei Befunde tragen die Überarbeitung:

1. **30 Branchenfarben** sind nicht unterscheidbar — sieben der acht häufigsten liegen im
   selben Rot-Orange-Bereich.
2. **146 von 431 Standorten sind nur straßengenau verortet**, werden aber wie hausgenaue
   dargestellt.
3. **Der Quellentext klappt in einer 35 %-Spalte auf** und wird dadurch weder gelesen noch
   zitierbar.

Nicht Teil dieses Schrittes: Startseite, „Über das Projekt", Bibliographie, Impressum,
Anreicherung um Rüstungsgüter und Fotos. Diese folgen in einer eigenen Spec.

## Entscheidungen

| Punkt | Entscheidung |
|---|---|
| 19 | „nicht mehr" → „existiert nicht mehr"; „xxx" → „ohne Angabe" |
| 20 | Neun Branchengruppen statt 30 Einzelzweige, plus neutrale Gruppe „ohne Angabe" |
| 21 | Verortungsgenauigkeit sichtbar: gestrichelter Rand auf der Karte, Klartext in der Sidebar; moderne Adresse nur bei Abweichung |
| 22 | Quellentext als Overlay über der Karte, betitelt „Quellen nach Speer (2003)", mit Seitenangabe |
| 23 | Speer-Nummer verschwindet aus Sidebar und Startseite, erscheint nur noch im Quellenfenster als Beleg |
| 24 | Gesamtzahl führend, Aufteilung als Nebensatz: „50 · davon 49 männlich, 1 weiblich" |
| 25 | Kreise bleiben — die Form ist nicht das Problem |

Zu Punkt 25: Proportionale Kreise sind für Mengenvergleiche die belastbarste Symbolform;
Flächen lassen sich bei ihnen zuverlässiger schätzen als bei Quadraten oder Rauten. Geändert
wird deshalb nicht die Form, sondern Farbe und Randgestaltung. Eine Wabenaggregation für die
herausgezoomte Übersicht bleibt als spätere Ergänzung möglich, ohne dieser Entscheidung zu
widersprechen.

## Branchengruppen

Die Gruppierung betrifft **nur die Farbe auf der Karte und im Statistik-Diagramm**. Im Filter
bleiben alle 30 Zweige einzeln wählbar, in der Sidebar steht weiterhin der genaue Zweig.
Farben müssen unterscheidbar sein, Auswahllisten nicht.

| Gruppe | Farbe | umfasst | Betriebe |
|---|---|---|---|
| Metall & Metallwaren | `#b02418` | Metallindustrie, NE-Metallindustrie | 114 |
| Maschinen- & Fahrzeugbau | `#e07b1f` | Maschinenbau, Kraftfahrzeug-, Fahrrad-, Luftfahrtindustrie | 74 |
| Textil | `#7d3c98` | Textilindustrie | 57 |
| Handel, Verkehr & Dienste | `#5d6d7e` | Handel, Handel / Dienstleistungen, Handwerk, Logistik, öffentliche Behörde | 37 |
| Bau, Steine & Erden | `#8a5a2b` | Bauunternehmen, Baustoffe, Industrie der Steine und Erden, Ziegelei | 32 |
| Nahrung, Genuss & Landwirtschaft | `#2f7d3a` | Lebensmittel-, Genussmittelindustrie, Gärtnerei, Gastgewerbe | 30 |
| Chemie & Kunststoff | `#1a6faf` | Chemie, Kunststoffindustrie, Pyrotechnik | 17 |
| Elektrotechnik | `#b8960c` | Elektrotechnik | 13 |
| Papier, Druck & Holz | `#0e8a86` | Papierindustrie, Druckwesen, Möbelindustrie, Herstellung von Musikinstrumenten | 13 |
| ohne Angabe | `#b9bfc4` | bisher „xxx" (24) und „unbekannt" (6) | 30 |

Braun (`#8a5a2b`) und Orange (`#e07b1f`) liegen am nächsten beieinander. Sie werden am
gerenderten Kartenbild bei kleinstem Markerradius gegengeprüft; falls sie sich beißen, wird
„Bau, Steine & Erden" nach `#6b4a26` abgedunkelt.

## Verortungsgenauigkeit

Aus `class` und `type` der Nominatim-Antwort wird eine neue Eigenschaft `verortung` abgeleitet:

| `verortung` | Regel | Standorte | Darstellung |
|---|---|---|---|
| `hausgenau` | alles außer den folgenden | 271 | voller Kreis, weißer Rand |
| `strassengenau` | `class = highway` | 146 | gestrichelter Rand, Füllung auf 50 % |
| `ungefaehr` | `place` mit `hamlet`, `suburb`, `neighbourhood` | 3 | wie `strassengenau`, eigener Text |
| `ohne` | keine Geometrie | 11 | kein Marker, nur Listeneintrag |

Die Legende erhält dafür einen zweiten Block „Verortung" unter den Größenstufen.

Sidebar-Text je Stufe:

- `hausgenau` — „Hausgenau verortet"
- `strassengenau` — „Nur straßengenau verortet — die Hausnummer ließ sich nicht auflösen"
- `ungefaehr` — „Nur ungefähr verortet"
- `ohne`, ohne überlieferte Adresse — „Kein Standort bekannt"
- `ohne`, mit überlieferter Adresse — „Adresse überliefert, heute nicht eindeutig zuzuordnen"

## Adressdarstellung

Die historische Adresse aus Speer führt. Die heutige Schreibweise erscheint als zusätzliche
Zeile „Heute: …" nur dann, wenn der Straßenname von `road` abweicht — 21 von 431 Fällen.
Darunter sind echte Umbenennungen (Nr. 156: Lettow-Vorbeck-Straße → Edith-Stein-Straße),
die inhaltlich bedeutsam sind und zwischen den übrigen 410 wortgleichen Wiederholungen
untergingen.

Reine Schreibvarianten (Warndstraße/Warndtstraße, Kemmanstr./Kemmannstraße) werden über
einen Normalisierungsvergleich unterdrückt: Groß-/Kleinschreibung, „straße/str.", Bindestriche
und Doppelkonsonanten werden vor dem Vergleich vereinheitlicht.

## Quellenfenster

Ein Overlay über der Karte, ausgelöst durch „→ Quellen nach Speer (2003)" in der Sidebar-Karte.

- Kopf: Bezeichnung, Firmenname, Beleg „Speer 2003, Nr. 54, S. 514"
- Körper: `speerText` unverändert, in Serifenschrift, scrollbar
- Schließen über ✕, Klick auf den Hintergrund und Escape
- Fokus wandert beim Öffnen in den Dialog und beim Schließen zurück auf den auslösenden Button
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` auf die Überschrift

Die Sidebar selbst bleibt unverändert in Breite und Verhalten.

## Seitenzahlen

Neues Skript `scripts/extract_speer_seiten.py` liest die OCR-PDF des Speer-Anhangs
(58 Doppelseiten, je vier Spalten, Seitenzahl in der Fußzeile) und erzeugt
`data/speer_seiten.json` mit `{ "54": "514", … }`.

Verfahren: Jede PDF-Seite wird in vier Spalten à 319 pt zerlegt. Die Fußzeile der linken
Buchseite steht in den Spalten bei x = 0/319, die der rechten bei x = 638/957. Aus den
untersten Zeilen wird die dreistellige Seitenzahl gelesen; Ausreißer werden verworfen, indem
nur monoton und lückenlos fortlaufende Werte als Anker gelten, alle übrigen Seiten werden
daraus interpoliert. Eintragsköpfe werden in Lesereihenfolge der Spalten erkannt und der
Buchseite ihrer Spalte zugeordnet.

Ergebnis, verifiziert gegen die PDF (Nr. 54 → S. 514, geprüft an der Doppelseite 514/515):

- 371 Einträge direkt gelesen
- 34 eindeutig erschlossen, weil die Nachbareinträge auf derselben Seite stehen
- 12 nur als Spanne bestimmbar, notiert als „514–515"
- 0 unbestimmbar

Der PDF-Pfad wird als Argument übergeben, nicht fest verdrahtet — die Scans liegen außerhalb
des Repositorys. Ohne vorhandene `data/speer_seiten.json` baut `build_data.py` weiterhin
durch, das Quellenfenster zeigt dann nur „Speer 2003, Nr. 54".

## Datenkorrekturen

Neue Datei `data/korrekturen.json`, die `build_data.py` nach dem Einlesen der XLSX anwendet.
Jeder Eintrag nennt Feld, alten Wert, neuen Wert, Begründung und Fundstelle. Damit überleben
die Korrekturen jedes Neuerzeugen der Daten, bleiben nachvollziehbar und lassen sich auf der
Website ausweisen.

| Nr. | Feld | alt | neu | Grund |
|---|---|---|---|---|
| 88 | `Adresse` | Ascheweg 7 | Ascheweg 14 | Speer nennt Ascheweg 14 an fünf Stellen; die 7 ist ein Erfassungsfehler |
| 88 | Geometrie | 40.9862, 29.0253 | 51.2270691, 7.2017262 | `volladresse` enthielt „nein" — den Wert aus `ExistiertHeute`; Nominatim traf einen Laden in Istanbul |
| 341 | `Adresse` | Vohwinkeler Str. 154 | Uellendahler Str. 353 | Speer: „Wuppertal-Elberfeld, Uellendahler Str. 353"; der Marker sitzt bereits richtig |
| 381 | `Adresse` | Neuenteich 85-89 | Vereinstr. 14 | Speer: „Wuppertal-Elberfeld, Vereinstr. 14"; der Marker sitzt bereits richtig |
| 394 | `Adresse` | leer | Hauptstr. 23 | steht in `volladresse` und deckt sich mit Speer |
| 410 | Geometrie | 51.2652, 7.1441 | *entfernt* | Speer nennt „Nordstr. 27"; Elberfeld-Nordstadt hat heute Nordstraße *und* Neue Nordstraße, rund 500 m auseinander. Ohne historisches Adressbuch nicht entscheidbar — daher lieber keine Verortung als eine falsche |

Nr. 410 rückt damit in die Klasse `verortung: "ohne"` mit dem Hinweis „Adresse überliefert,
heute nicht eindeutig zuzuordnen".

## Statistiken

**Fehlerbehebung.** `computeTimeSeries()` iteriert über alle 431 Features. Bei Mehrfach-Standorten
hängt an jedem Standort dieselbe `records`-Liste, wodurch 11 Unternehmen doppelt bis dreifach
in die Zeitreihen eingehen — Gottlob Espenlaub mit 1.023 Personen dreifach.

| | bisher | korrekt | Abweichung |
|---|---|---|---|
| Höchstwert männlich | 22.889 | 19.335 | −18,4 % |
| Höchstwert weiblich | 13.880 | 12.245 | −13,4 % |

Behebung: `computeTimeSeries()` bekommt dieselbe Filterung auf `standortNr === 1` wie die
übrigen Auswertungen. Betrifft das ZA-Art-Verlaufsdiagramm, das Geschlechter-Verlaufsdiagramm
und den Geschlechter-Ring; die Balkendiagramme nach Branche und Stadtteil waren korrekt.

**Umstellung.** Das Branchendiagramm wechselt von Chart.js auf dieselbe HTML/CSS-Balkendarstellung,
die im Entwurf gezeigt wurde: Farbpunkt, Gruppenname, enthaltene Zweige, Balken, Zahl. Das
bisherige Abschneiden auf „Top 15" entfällt, weil nur noch zehn Zeilen übrig bleiben. Vorteile
gegenüber Chart.js an dieser Stelle: die Zuordnung der Einzelzweige wird sichtbar, der Text
ist markier- und durchsuchbar, und es entfällt eine Abhängigkeit im kritischen Pfad.

## Aufräumen

`INDUSTRY_COLORS` steht heute wortgleich in `map-app.js` und `statistiken.js`. Beide beziehen
die Gruppen künftig aus `js/branchen.js`, das die Gruppendefinition, die Farben und die
Funktion `gruppeFuerZweig(zweig)` exportiert. Die Datei wird per `<script>` vor den
Seitenskripten eingebunden — kein Build-Schritt, konsistent mit dem Rest des Projekts.

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `js/branchen.js` | neu — Gruppendefinition, Farben, Zuordnungsfunktion |
| `js/map-app.js` | Branchengruppen, Verortungsdarstellung, Quellenfenster, Sidebar-Karte, Legende |
| `js/statistiken.js` | Doppelzählung behoben, Branchendiagramm umgestellt, Farbtabelle entfernt |
| `js/landing.js` | „Nr. 54 —" aus dem Spotlight entfernen |
| `map.html` | Markup für das Quellenfenster |
| `about/statistiken.html` | Container für das neue Branchendiagramm |
| `style.css` | Quellenfenster, Verortungshinweise, Balkendarstellung, Sidebar-Karte |
| `scripts/build_data.py` | `korrekturen.json` und `speer_seiten.json` einlesen, `verortung` und `adresseHeute` ableiten |
| `scripts/extract_speer_seiten.py` | neu |
| `data/korrekturen.json` | neu |
| `data/speer_seiten.json` | neu, erzeugt |
| `CLAUDE.md` | Statistikseite dokumentieren, neue Felder und Skripte nachtragen |

## Verifikation

Ohne Testinfrastruktur im Projekt wird gegen nachprüfbare Zahlen abgeglichen:

1. `build_data.py` läuft durch und meldet weiterhin 417 Unternehmen / 431 Standorte.
2. Verortungsklassen summieren sich zu 271 / 146 / 3 / 11.
3. Jedes Unternehmen fällt in genau eine Branchengruppe; kein Zweig bleibt unzugeordnet.
4. Die vier korrigierten Nummern zeigen in der Sidebar die neuen Adressen; Nr. 88 liegt in
   Ronsdorf, Nr. 410 hat keinen Marker.
5. Der Höchstwert im Geschlechter-Verlauf liegt bei 19.335 männlich / 12.245 weiblich.
6. Das Quellenfenster öffnet und schließt über ✕, Hintergrundklick und Escape; der Fokus
   kehrt auf den auslösenden Button zurück.
7. Nr. 54 zeigt „Speer 2003, Nr. 54, S. 514".

## Offen

- Das ungültige Datum `1942-11-38` bei Nr. 218 (C. + P. Joest) ist gegen die Quelle zu prüfen.
  Nicht Teil dieses Schrittes, aber vorgemerkt.
- Die 139 Records ohne Datum tragen qualitativ reiche Angaben (Lagergröße, Nationalitäten,
  Tätigkeiten), beeinflussen die Karte aber nicht. Ob und wie sie sichtbar werden, gehört in
  die Spec zum zweiten Block.
