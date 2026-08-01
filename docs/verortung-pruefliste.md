# Prüfliste: unsicher verortete Standorte

154 von 431 Standorten

## Worum es geht

Geprüft wird alles, was nicht `hausgenau` verortet ist:

- **`strassengenau`** (144) — die Geokodierung traf
  nur die Straße. Der Punkt sitzt auf dem Straßenmittelpunkt und kann einige
  hundert Meter neben dem tatsächlichen Betriebsgelände liegen.
- **`ungefaehr`** (2) — nur der Ortsteil ist getroffen.
- **`ohne`** (8) — gar keine Koordinate. Diese Standorte
  erscheinen auf keiner Karte.

Die Liste sagt für jeden dieser 154 Standorte, **warum** das so ist und
**ob** sich daran etwas ändern lässt.

## Wie geprüft wurde

Der heutige Adressbestand Wuppertals wurde über die Overpass-API aus OpenStreetMap
geholt (61.706 Adressen mit Straße und Hausnummer) und lokal gegen die
Quelladressen abgeglichen — mit normalisierten Straßennamen (`Str.` ↔ `Straße`,
Zusammen-/Getrenntschreibung, Umlaute) und aufgelösten Hausnummernbereichen.

**Kalibrierung:** derselbe Abgleich findet 191 von 202 (95 %)
der bereits *hausgenau* verorteten Adressen wieder. Die Methode ist also belastbar;
wenn sie eine Adresse nicht findet, liegt das nicht am Verfahren.

Bei den unsicheren findet sie dagegen nur 2 von 83
(2 %). **Das ist der zentrale Befund: diese Adressen sind nicht
schlecht geokodiert, sie existieren heute überwiegend nicht mehr.** Kriegszerstörung,
Neubebauung, Umnummerierung.

## Befunde im Überblick

| Klasse | Bedeutung | Anzahl |
|---|---|---:|
| **A** | Hausnummer existiert heute — hausgenau nachverortbar | 2 |
| **B** | Nummer selbst weg, aber eine Nummer aus dem angegebenen Bereich bzw. die Nummer ohne Zusatz existiert | 34 |
| **C** | Straße existiert, diese Hausnummer heute nicht mehr | 103 |
| **D** | Die Quelle nennt gar keine Hausnummer | 6 |
| **E** | Straßenname heute nicht auffindbar | 9 |
| | **gesamt** | **154** |

## A — hausgenau nachverortbar

Hier gibt es die Hausnummer heute noch. Die Geokodierung ist durchweg an
Schreibweisen gescheitert (`Mettmannerstr.` statt `Mettmanner Straße`,
`Blombacherbach` statt `Blombacher Bach`) und auf die Straßenmitte zurückgefallen.

**6 dieser Standorte sind inzwischen auf `hausgenau` hochgestuft**
und erscheinen deshalb nicht mehr in dieser Liste — sie zählt nur
noch, was straßengenau geblieben ist. Übernommen wurden sie, weil eine
unabhängige Nominatim-Abfrage dort ein Gebäude liefert (0–6 m Abweichung), der
Beleg also nicht allein am Overpass-Abzug hängt:

| Nr. | Unternehmen | Adresse (Quelle) | heute | neue Koordinate |
|---|---|---|---|---|
| 120 | Gebr. Dörner | Kaiserstr. 126 | Möbecker Straße 4 | 51.237923, 7.092362 |
| 145 | Wilhelm Franke | Küllenhahner Str. 20 | Küllenhahner Straße 20 | 51.229216, 7.148254 |
| 168 | Halbach, Braun & Co. | Blombacherbach 32 | Blombacher Bach 32 | 51.254659, 7.22893 |
| 385 | August Schnakenberg & Co.° | Beyenburger Str. 164 | Beyenburger Straße 164 | 51.255143, 7.255745 |
| 404 | Wilhelm Soennecken | Blombacherbach 12 | Blombacher Bach 12 | 51.255876, 7.230861 |
| 459 | Fritz Weeren | Rauental 72 | Rauental 72 | 51.270617, 7.232843 |

Offen sind noch diese Fälle:

| Nr. | Unternehmen | Adresse (Quelle) | Stadtteil | bisher | heutiger OSM-Treffer | Koordinate |
|---|---|---|---|---|---|---|
| 122 | Dyckerhoff & Widmann KG [Baubüro Jägerwerke] | Mettmannerstr. 79 | Elberfeld-West | Straße | Mettmanner Straße 79 | 51.25177, 7.092284 |
| 255 | Kromberg & Schubert (Kroschu) | Spitzenstr. 37 | Langerfeld-Beyenburg | Straße | Spitzenstraße 37 | 51.275964, 7.237354 |

Abstand zur bisherigen Koordinate:

| Nr. | bisher (lon, lat) | neu (lat, lon) | Abweichung |
|---|---|---|---|
| 122 | 7.098564, 51.2543798 | 51.25177, 7.092284 | ~524 m |
| 255 | 7.2425376, 51.2757208 | 51.275964, 7.237354 | ~362 m |

Bei **Nr. 122** (Mettmanner Straße 79) und **Nr. 255** (Spitzenstraße 37) findet
Nominatim die Hausnummer nicht und fällt auf die Straße zurück — genau der Grund,
warum sie `strassengenau` sind. Im OSM-Rohbestand existiert die Nummer sehr wohl,
beide Straßennamen kommen in Wuppertal nur einmal vor, und die Nummernfolge ist
an beiden Stellen stimmig. Die Treffer sind damit plausibel, stützen sich aber
auf eine einzige Quelle. Vor einer Übernahme sollten sie an einer zweiten
geprüft werden — ein historisches Adressbuch oder ein Katasterplan.

## B — Nummer benachbart oder im Bereich vorhanden

Die Quelle nennt einen Bereich (`87-93`) oder einen Buchstabenzusatz (`118 a`).
Die angegebene Nummer selbst gibt es heute nicht, wohl aber eine benachbarte.

**Diese 34 Standorte ließen sich besser kartieren als bisher.** Der
Ersatzpunkt liegt im Median 262 m vom heutigen Straßenmittelpunkt entfernt —
bei langen Straßen ist dieser Mittelpunkt praktisch beliebig, die Hausnummer nicht.

Die Stufe bleibt `strassengenau`: sie sagt, wie genau der Ort bekannt ist, nicht,
wie der Punkt entstanden ist. Welches Haus des Bereichs der Betrieb belegte, sagt
die Quelle nicht. Jeder Standort trägt zusätzlich ein Feld `verortungHinweis`, das
die verwendete Hausnummer nennt und in der Seitenleiste erscheint.

Die Gruppe ist nicht einheitlich:

- **18 Fälle mit Buchstabenzusatz** (`143 a` → `143`). In der Regel
  Anbau, Hinterhaus oder geteiltes Grundstück, also unmittelbar benachbart. Das ist
  der verlässlichere Teil der Gruppe.
- **16 Bereichsangaben.** Hier ist der Punkt der Schwerpunkt aller
  Nummern des Bereichs, die es heute noch gibt. Wie belastbar das ist, hängt daran,
  wie viele das sind — die Spalte „belegt“ nennt es. Bei nur einer belegten Nummer
  aus einem weiten Bereich ist der Punkt eher Interpolation als Beleg.

Hausnummernbereiche werden dabei paritätsgerecht aufgelöst: `87-93` meint 87, 89,
91, 93 — Nr. 88 läge auf der gegenüberliegenden Straßenseite und zählt nicht.

| Nr. | Unternehmen | Adresse (Quelle) | Stadtteil | bisher | heutige Nummern | belegt | Koordinate |
|---|---|---|---|---|---|---|---|
| 74 | J. P. Bemberg AG. | Oehder Str. 14-28 | Langerfeld-Beyenburg | Straße | Öhder Straße 16, 18, 28 | 3 von 8 | 51.264163, 7.236577 |
| 83 | Otto Berns | Cronenbergerstr. 325 a | Elberfeld | Straße | Cronenberger Straße 325 | — | 51.231541, 7.147599 |
| 89 | Block & Vaupel | Heckinghauser Str. 143 a | Barmen | Straße | Heckinghauser Straße 143 | — | 51.271377, 7.219219 |
| 101 | Carl Brose & Co. | Opphofer Str. 13-17 | Elberfeld | Straße | Opphofer Straße 15 | 1 von 3 | 51.266331, 7.152277 |
| 125 | Paul Eigenbrodt | Vor d. Beule 37-39 | Oberbarmen | Straße | Vor der Beule 37, 39 | 2 von 2 | 51.288801, 7.231792 |
| 139 | Walter Finkeldei | Berliner Str. 130 a | Oberbarmen | Straße | Berliner Straße 130 | — | 51.274773, 7.217221 |
| 157 | August Görts KG | Unterkirchen 23 a | Cronenberg | Straße | Unterkirchen 23 | — | 51.202993, 7.12898 |
| 173 | Gebr. Happich GmbH | Neuenteich 64-76 | Elberfeld | Straße | Neuenteich 68, 70, 72, 74, 76 | 5 von 7 | 51.260516, 7.153897 |
| 190 | Gebr. Hilgeland | Im Rehsiepen 33-35 | Ronsdorf | Straße | Im Rehsiepen 35 | 1 von 2 | 51.224148, 7.21781 |
| 191 | Dr. Fritz Hillringhaus | Rauental 51-59 | Heckinghausen | Straße | Rauental 51, 53, 55, 57, 59 | 5 von 5 | 51.272375, 7.230526 |
| 193 | Dr. Hans Höring | Viehhofstr. 33 A | Elberfeld-West | Straße | Viehhofstraße 33 | — | 51.247533, 7.138172 |
| 196 | J. & A. Homberg | Zur Scheuren 24-30 | Barmen | Straße | Zur Scheuren 28 | 1 von 4 | 51.275618, 7.20171 |
| 203 | Walter Hufstadt | Hahnerbergerstraße 30-32 | Elberfeld | Straße | Hahnerberger Straße 32 | 1 von 2 | 51.227237, 7.15031 |
| 212 | G. & J. Jaeger GmbH | Mettmanner Str. 79-99 | Elberfeld-West | Straße | Mettmanner Straße 79, 89 | 2 von 11 | 51.252105, 7.092692 |
| 224 | Käseberg & Co. KG | Linderhauser Str. 42 a | Oberbarmen | Straße | Linderhauser Straße 42 | — | 51.292188, 7.239126 |
| 237 | Hermann Kluge | Wuppermannstr. 23-27 | Barmen | Straße | Wuppermannstraße 25 | 1 von 3 | 51.276668, 7.201483 |
| 243 | Wilhelm Körting | Siegesstraße 90a | Barmen | Straße | Siegesstraße 90 | — | 51.262672, 7.18233 |
| 250 | Robert Kremer | Hahnerbergerstraße 72a | Küllenhahn | Straße | Hahnerberger Straße 72 | — | 51.225401, 7.151074 |
| 266 | Siegfried Leithäuser | Hofaue 47-49 | Elberfeld | Straße | Hofaue 49 | 1 von 2 | 51.257126, 7.152761 |
| 275 | Lohmann & Stuhlmann | Oberkamperstr. 22A | Cronenberg | Straße | Oberkamper Straße 22 | — | 51.210668, 7.142782 |
| 288 | Melchior & Jörgens | Wittener Str. 37 A | Oberbarmen | Straße | Wittener Straße 37 | — | 51.28804, 7.232632 |
| 308 | Werner Neumann | Peterstr. 8 A | Barmen | Straße | Peterstraße 8 | — | 51.264032, 7.195188 |
| 311 | Willi Nouvortne | Hofkamp 48-56 | Elberfeld | Straße | Hofkamp 50 | 1 von 5 | 51.258733, 7.151283 |
| 317 | Gebr. Pandel | Küllenhahner Str. 33 b | Küllenhahn | Straße | Küllenhahner Straße 33 | — | 51.229036, 7.147702 |
| 352 | E. u. W. Reitz | Langerfelder Str. 129 c | Langerfeld-Beyenburg | Straße | Langerfelder Straße 129 | — | 51.274277, 7.240657 |
| 357 | Rhenus | Friedrich-Ebert-Straße 149a | Elberfeld | Straße | Friedrich-Ebert-Straße 149 | — | 51.249818, 7.126657 |
| 377 | Schmahl & Schulz | Klingelholl 108-110 | Barmen | Straße | Klingelholl 110 | 1 von 2 | 51.280527, 7.203617 |
| 380 | Gebr. Schmidt | [Gräfrather Str. 104-106??] | Vohwinkel | Straße | Gräfrather Straße 106 | 1 von 2 | 51.224181, 7.070313 |
| 415 | Rudolf Staehely | Linderhauser Str. 32c | Oberbarmen | Straße | Linderhauser Straße 32 | — | 51.29085, 7.237436 |
| 423 | Stocko | Kirchhofstraße 52 a | Elberfeld-West | Straße | Kirchhofstraße 52 | — | 51.24188, 7.101955 |
| 431 | Maschinenfabrik Tienes | Löhrerlen 117 b | Oberbarmen | Straße | Löhrerlen 117 | — | 51.291136, 7.239446 |
| 441 | „Vauco“ Lederwarenfabrik Viehoff & Co. | Wichlinghauser Str. 47a | Oberbarmen | Straße | Wichlinghauser Straße 47 | — | 51.279002, 7.21859 |
| 447 | Vorwerk & Co. | Mühlenweg 23-25 | Barmen | Straße | Mühlenweg 25 | 1 von 2 | 51.274023, 7.200187 |
| 452 | Wagner & Co. | Lenneper Str. 130-130a | Langerfeld | Straße | Lenneper Straße 130 | 1 von 1 | 51.259795, 7.229473 |

## C — Hausnummer heute nicht vergeben

Die Straße gibt es, die Hausnummer nicht mehr. Ohne historische Quellen
(Adressbücher, Katasterpläne, Luftbilder) ist hier nichts zu machen —
`strassengenau` ist die ehrliche Angabe.

| Nr. | Unternehmen | Adresse (Quelle) | Stadtteil | bisher |
|---|---|---|---|---|
| 54 | Ackermann Fahrzeugbau | Vohwinkeler Str. 87-93 | Vohwinkel | Straße |
| 60 | Oswald Attin | Warndstraße 4 | Barmen | Straße |
| 65 | Barmer Maschinenfabrik KG | Mohrenstr. 12-28 | Heckinghausen | Straße |
| 66 | Bastfaser GmbH | Auf der Bleiche 43 | Heckinghausen | Straße |
| 67 | Carl Bauer | Solinger Str. 28 | Cronenberg | Straße |
| 76 | Kurt Berger | Neumarktstaße 25-27 | Elberfeld | Straße |
| 77 | Hans Berger | Barmer Str. 34 | Elberfeld | Straße |
| 78 | Emil Berges | Oberbergische Str. 197 | Barmen | Straße |
| 80 | Bergisches Kabelwerk | Wartburgstr. 118 a | Barmen | Straße |
| 82 | Ferdinand Berns | Theishahnerstr. 112 | Küllenhahn | Straße |
| 91 | Bocklenberg & Motte (BOMORO) | Schöne Aussicht 12 | Ronsdorf | Straße |
| 92 | Carl Bocklenberg & Söhne (Cebor) | Erbschlöerstr. 27 | Ronsdorf | Straße |
| 94 | Boltz KG | Friedrich-Ebert-Straße 103 a | Elberfeld | Straße |
| 98 | Hermann Bremer | Mühle 49-51 | Ronsdorf | Straße |
| 106 | Hermann Busche KG | Alfredstraße 5 | Barmen | Straße |
| 114 | Daimler Benz AG | Tannenbergstr. 20-24 | Elberfeld-West | Straße |
| 123 | Karl Egert | Meckelstr. 16 A | Barmen | Straße |
| 134 | Eylert KG. | Unten vorm Steeg 138 | Elberfeld-West | Straße |
| 141 | Fischer & Schmidt | Westkotter Straße 16 | Oberbarmen | Straße |
| 143 | M. Flues & Co. | Deutscher Ring 66 | Elberfeld-West | Straße |
| 162 | Gutehoffnungshütte AG Oberhausen [Dolomit-Steinbruch Lüntenbeck] | Lüntenbeck 2c | Vohwinkel | Ortsteil |
| 165 | Hagen & Wolff | Haspeler Str. 216 | Barmen | Straße |
| 166 | Ferdinand von Hagen Söhne & Koch | Vohwinkeler Str. 97 | Vohwinkel | Straße |
| 169 | Ernst Halfmann | Höchsten 76 | Elberfeld | Straße |
| 172 | Hamba Hans A. Müller GmbH & Co. KG | Höhne 42 | Barmen | Straße |
| 179 | Sebastian Helmstädter | Alter Markt 619-621 | Barmen | Straße |
| 183 | Otto Henrich | Schorfer Str. 10 | Cronenberg | Straße |
| 187 | Wilhelm Hermes KG | Beule 8 b | Oberbarmen | Straße |
| 192 | Hindrichs-Auffermann A.G. | Heckinghauser Str. 118-120 | Barmen | Straße |
| 194 | Hogarten & Co. KG | Nibelungenstr. 67 | Ronsdorf | Straße |
| 200 | Hugo Hösterey | Sudberger Str. 49 | Cronenberg | Straße |
| 208 | Imo-Großdruckerei Carl H. Vollmer | Kleiner Werth 46 | Barmen | Straße |
| 210 | Gebr. Itter | Theishahner Straße 45 a | Küllenhahn | Straße |
| 214 | Leo Janssen | Viehhofstraße 112 | Elberfeld-West | Straße |
| 215 | Gebr. Jeude | Küllenhahner Str. 27 | Küllenhahn | Straße |
| 219 | August Jung Söhne | Rauer Werth 7a | Oberbarmen | Straße |
| 222 | Kabel- und Drahtwerk AG (an anderer Stelle: Kabel- und Gummiwerk AG) | Vohwinkeler Str. 71-83 | Vohwinkel | Straße |
| 225 | Fritz Karthaus | Loher Str. 29 a | Barmen | Straße |
| 226 | J. C. E.Kaufmann | Vohwinkeler Str. 161 | Vohwinkel | Straße |
| 231 | Peter Kikuth | Gosenburg 47 | Heckinghausen | Straße |
| 241 | Herbert Kölker | Friedrich-Ebert-Straße 101 | Elberfeld | Straße |
| 242 | Christoph Köppel | Oberdörnen 101 | Barmen | Straße |
| 244 | Otto Kötter GmbH | Unterdörnen 11-17 | Barmen | Straße |
| 244 (2) | Otto Kötter GmbH | Oberdörnen 8 | Barmen | Straße |
| 247 | Alfred Koll | Holenscheidter Str. 57 | Hahnerberg | Straße |
| 260 | Kuntze & Söhne | Theishahner Str. 25 | Cronenberg | Straße |
| 267 | Carl Lenzner | Sanderstraße 30 | Barmen | Straße |
| 271 | Johann Linnenbürger | Marktstr. 11 | Ronsdorf | Straße |
| 273 | August Lohe | Friedrich-Engels-Allee 118 | Barmen | Straße |
| 281 | J. Machwürth | Kaiserstr. 195 | Vohwinkel | Straße |
| 287 (3) | August Meckenstock | Hospitalstr. 24 | Elberfeld | Straße |
| 289 | Autohaus Merkur | Werther Brücke 11 | Heckinghausen | Straße |
| 290 | Metzenauer & Jung | Charlottenstr. 88 | Elberfeld | Straße |
| 296 | Theodor Möhle | Neuenteich 93 | Elberfeld | Straße |
| 297 | Mülder [Inhaber: Bruno Holl] | Friedrich-Ebert-Straße 99-101 | Elberfeld | Straße |
| 298 | Simon Möller | Berliner Straße 202 a | Oberbarmen | Straße |
| 303 | Wilhelm Müller | Simonsstraße 13 | Elberfeld-West | Straße |
| 309 | Alfred Nolte „Hotel zum Römer“ | Kipdorf 77 | Elberfeld | Straße |
| 313 | Gustav Ohlig | Kölner Straße 96 | Elberfeld | Straße |
| 316 | Wilhelm Paashaus „Mechanische Weberei Barmen“ | Schützenstr. 25 | Barmen | Straße |
| 318 | Abraham & Alex Pandel | Küllenhahner Str. 42 | Küllenhahn | Straße |
| 320 | Friedrich Pass | Küllenhahner Str. 48 | Küllenhahn | Straße |
| 321 | Wilhelm Pass | Küllenhahner Str. 52 | Küllenhahn | Straße |
| 328 | Rudolf Piel & Söhne | Klotzbahn 30 | Elberfeld | Straße |
| 333 | Paul Prause | Norrenberg Str. 28 | Heckinghausen | Straße |
| 335 | Prinz & Kremer | Borner Str. 30 | Cronenberg | Straße |
| 339 | Ernst Quambusch | Friedrich-Engels-Allee 87 | Barmen | Straße |
| 342 (2) | Gustav Rafflenbeul, Schwelm [=Hansa-Werk und Raffawerk Gustav Rafflenbeul] | Oberdörnen 72 | Barmen | Straße |
| 347 | Reichmann & Co. | Bendahlerstr. 30 | Barmen | Straße |
| 350 | Otto Reinshagen | Dörpfeldstr. 49-51 | Ronsdorf | Straße |
| 359 | Heinrich Röttger | Kölner Str. 88 | Elberfeld | Straße |
| 360 | Rosenkranz & Co. | Am Diek 97 a | Oberbarmen | Straße |
| 373 | Schlieper & Laag GmbH | Buchenhofener Str. 49 | Vohwinkel | Straße |
| 374 | J. Schlipkötter | Nützenberger Str. 398 a | Elberfeld-West | Straße |
| 375 | Werner Schlüter | Breslauer Str. 62 | Oberbarmen | Straße |
| 379 | Hans Schmeken | Boltenheide 5 | Vohwinkel | Straße |
| 386 | Otto Schnicks | Dammstr. 16 | Elberfeld-West | Straße |
| 399 | Gebrüder Schutte | Reichsstraße 45 | Heckinghausen | Straße |
| 400 | Hubert Schwedt | Laurentiusstraße 33 | Elberfeld | Straße |
| 406 | Wilhelm Sopp | Wupperstr. 35 | Elberfeld | Straße |
| 409 | H. Spelleken Nachf. KG | Rheinische Straße 14 | Oberbarmen | Straße |
| 410 | Ewald Speth | Nordstr. 27 | Elberfeld | **keine** |
| 412 | Paul Spieker | Schlössersgasse 4 | Elberfeld | Straße |
| 416 | Wilhelm Steeger GmbH | Bahnstr. 47 | Vohwinkel | Straße |
| 418 | Otto von den Steinen | Kuchhausen 102 | Cronenberg | Straße |
| 427 | Svensson & Kuhler | Simonsstr. 1a-3a | Elberfeld-West | Straße |
| 428 | Carl Aug. Tesche | Teschensudberg 6 | Cronenberg | Ortsteil |
| 433 | Lebrecht Töllner | Eich 1 | Cronenberg | Straße |
| 434 | Adolf Toenges | Vereinstraße 17a | Elberfeld | Straße |
| 438 | Vereinigte Glanzstoff-Fabriken A.G. | Auer-Schulstraße 14-16 | Elberfeld | Straße |
| 439 | Vereinigung Wuppertaler Kohlenhändler | Kölner Str. 94 | Elberfeld | Straße |
| 443 | Friedrich Vohwinkel | Im Ostersiepen 1 | Elberfeld | Straße |
| 444 | Wilhelm Vonzumhoff | Gutenbergstr. 38 | Elberfeld-West | Straße |
| 449 | Wachs & Asmann | Westkotterstr. 46-48 | Oberbarmen | Straße |
| 451 | Martin Wagner | Küllenhahner Str. 23 | Küllenhahn | Straße |
| 454 | Alfred Wahl | Kaiserstr. 195 | Vohwinkel | Straße |
| 457 | Karl Watermann | Schützenstr. 92 | Barmen | Straße |
| 464 | Wiedenhoff & Wirtz | Kratzkopfstr. 32 | Ronsdorf | Straße |
| 467 | Emil Windgassen | Am Stadtbahnhof 6 | Ronsdorf | Straße |
| 472 | E.O. Wöhler & Co. | Warndstraße 4-12 | Barmen | Straße |
| 476 | Hermann Wülfing | Kaiserstraße 90 | Vohwinkel | Straße |
| 477 | Wuppermetall GmbH | Beckacker Schulstr. 35a | Oberbarmen | Straße |
| 478 | Hugo Wippermann | Beule 20 | Oberbarmen | Straße |

## D — Quelle nennt keine Hausnummer

Bei diesen Einträgen steht in der Quelle nur die Straße. `strassengenau` ist hier
keine Schwäche der Geokodierung, sondern gibt den Kenntnisstand korrekt wieder.

| Nr. | Unternehmen | Adresse (Quelle) | Stadtteil | bisher |
|---|---|---|---|---|
| 116 | Ferdinand Deisel | Feldstr. | Oberbarmen | Straße |
| 261 | Lagergemeinschaft Opphof | Opphofer Straße | Elberfeld | Straße |
| 287 | August Meckenstock | Ferdinand Schrey Str. | Elberfeld | Straße |
| 414 | Stadthallen Gaststätte [Inhaber: W. Evers] | Johannisberg | Elberfeld | Straße |
| 442 | Visser & Co. | Funckstraße o. Nr. | Elberfeld-West | Straße |
| 475 | August Wülfing & Sohn | Breslauer Str. | Oberbarmen | Straße |

## E — Straßenname heute nicht auffindbar

Der Straßenname selbst findet sich im heutigen Bestand nicht. Wo ein
Ähnlichkeitsabgleich die heutige Schreibweise eindeutig belegte, ist der Fall
aufgelöst und steht oben unter B oder C (siehe `ALIAS` in
`scripts/pruefe_verortung.py`). Hier bleibt, wofür es keinen heutigen Namen gibt.

| Nr. | Unternehmen | Adresse (Quelle) | Stadtteil | bisher |
|---|---|---|---|---|
| 81 | AGEB - Aktiengesellschaft für Bergwerksbedarf | Hirtenstr. 1-3 | Elberfeld | **keine** |
| 100 | Friedrich Brockhaus | Bleichstraße 8 | Elberfeld | **keine** |
| 110 | Cramer & Kromberg | Brausenwerther Str. 15 | Elberfeld | Straße |
| 252 | Emil Krenzler | Fuchsstraße und Sanderstraße | Barmen | **keine** |
| 285 | Matthes & Weber AG | Auf dem Dorp | Elberfeld | **keine** |
| 300 | Hans Moog [=Deutsches Leucht- u. Signalmittelwerk Dr. Feistel KG] | Flügel 1 | Ronsdorf | **keine** |
| 315 | Walter Osthoff | Kiesbergstr. 25 | Elberfeld | **keine** |
| 319 | Wilhelm Pandel Werkzeugfabrik | Nöllenhammerstraße 31 | Cronenberg | Straße |
| 372 | Hermann Schlenkermann | Straße der Alten Garde 104 (Werth) | Barmen | **keine** |

Zu den geprüften Schreibvarianten im Einzelnen:

- **Warndstraße** (Nr. 60, 472) → heute *Warndtstraße*; dort existiert nur noch Nr. 7.
- **Neumarktstaße** (Nr. 76) → Tippfehler für *Neumarktstraße*; 25–27 sind heute
  nicht vergeben.
- **Vor d. Beule** (Nr. 125) → *Vor der Beule*; **Nr. 37 existiert** und liegt bei
  51.28884, 7.23135. Geführt unter B, weil die Quelle einen Bereich (37–39) nennt.
- **Holenscheidter Str.** (Nr. 247) → *Hohlenscheidter Straße*; Nr. 57 nicht vergeben.
- **Werther Brücke** (Nr. 289) → *Zur Werther Brücke*; Nr. 11 nicht vergeben.
- **Nöllenhammerstraße** (Nr. 319) → ähnlich ist nur *Nöllenhammerweg*. Straße/Weg
  ist keine bloße Schreibvariante, deshalb nicht als Alias geführt; Nr. 31 gibt es
  dort ohnehin nicht.
- **Brausenwerther Straße** (Nr. 110) → kein ähnlicher heutiger Name. Die Straße lag
  am Döppersberg, dessen Umgestaltung den alten Zuschnitt beseitigt hat.

Zu den sieben Standorten ohne jede Koordinate lieferte der Ähnlichkeitsabgleich
nichts Belastbares. Zwei Spuren wären eine Archivrecherche wert, sind aber ohne
Beleg nicht zu setzen:

- **Bleichstraße 8** (Nr. 100) — ähnlich ist die heutige *Bleicherstraße*. Das ist
  ein anderer Name, kein Schreibfehler; ohne Quelle bliebe es geraten.
- **Straße der Alten Garde 104 (Werth)** (Nr. 372) — der Name stammt aus der
  NS-Zeit und wurde nach 1945 ersetzt. Der Zusatz „(Werth)“ in der Quelle deutet
  auf den Barmer Werth; welcher Abschnitt gemeint ist und wie die Nummerierung
  danach lief, sagt der Eintrag nicht.

## Vollständige Liste (alle 154)

| Nr. | Unternehmen | Adresse (Quelle) | Stadtteil | bisher | Form | Befund |
|---|---|---|---|---|---|---|
| 54 | Ackermann Fahrzeugbau | Vohwinkeler Str. 87-93 | Vohwinkel | Straße | Bereich | C |
| 60 | Oswald Attin | Warndstraße 4 | Barmen | Straße | einfache Nummer | C |
| 65 | Barmer Maschinenfabrik KG | Mohrenstr. 12-28 | Heckinghausen | Straße | Bereich | C |
| 66 | Bastfaser GmbH | Auf der Bleiche 43 | Heckinghausen | Straße | einfache Nummer | C |
| 67 | Carl Bauer | Solinger Str. 28 | Cronenberg | Straße | einfache Nummer | C |
| 74 | J. P. Bemberg AG. | Oehder Str. 14-28 | Langerfeld-Beyenburg | Straße | Bereich | B |
| 76 | Kurt Berger | Neumarktstaße 25-27 | Elberfeld | Straße | Bereich | C |
| 77 | Hans Berger | Barmer Str. 34 | Elberfeld | Straße | einfache Nummer | C |
| 78 | Emil Berges | Oberbergische Str. 197 | Barmen | Straße | einfache Nummer | C |
| 80 | Bergisches Kabelwerk | Wartburgstr. 118 a | Barmen | Straße | Nummer mit Zusatz | C |
| 81 | AGEB - Aktiengesellschaft für Bergwerksbedarf | Hirtenstr. 1-3 | Elberfeld | **keine** | Bereich | E |
| 82 | Ferdinand Berns | Theishahnerstr. 112 | Küllenhahn | Straße | einfache Nummer | C |
| 83 | Otto Berns | Cronenbergerstr. 325 a | Elberfeld | Straße | Nummer mit Zusatz | B |
| 89 | Block & Vaupel | Heckinghauser Str. 143 a | Barmen | Straße | Nummer mit Zusatz | B |
| 91 | Bocklenberg & Motte (BOMORO) | Schöne Aussicht 12 | Ronsdorf | Straße | einfache Nummer | C |
| 92 | Carl Bocklenberg & Söhne (Cebor) | Erbschlöerstr. 27 | Ronsdorf | Straße | einfache Nummer | C |
| 94 | Boltz KG | Friedrich-Ebert-Straße 103 a | Elberfeld | Straße | Nummer mit Zusatz | C |
| 98 | Hermann Bremer | Mühle 49-51 | Ronsdorf | Straße | Bereich | C |
| 100 | Friedrich Brockhaus | Bleichstraße 8 | Elberfeld | **keine** | einfache Nummer | E |
| 101 | Carl Brose & Co. | Opphofer Str. 13-17 | Elberfeld | Straße | Bereich | B |
| 106 | Hermann Busche KG | Alfredstraße 5 | Barmen | Straße | einfache Nummer | C |
| 110 | Cramer & Kromberg | Brausenwerther Str. 15 | Elberfeld | Straße | einfache Nummer | E |
| 114 | Daimler Benz AG | Tannenbergstr. 20-24 | Elberfeld-West | Straße | Bereich | C |
| 116 | Ferdinand Deisel | Feldstr. | Oberbarmen | Straße | ohne Hausnummer | D |
| 122 | Dyckerhoff & Widmann KG [Baubüro Jägerwerke] | Mettmannerstr. 79 | Elberfeld-West | Straße | einfache Nummer | A |
| 123 | Karl Egert | Meckelstr. 16 A | Barmen | Straße | Nummer mit Zusatz | C |
| 125 | Paul Eigenbrodt | Vor d. Beule 37-39 | Oberbarmen | Straße | Bereich | B |
| 134 | Eylert KG. | Unten vorm Steeg 138 | Elberfeld-West | Straße | einfache Nummer | C |
| 139 | Walter Finkeldei | Berliner Str. 130 a | Oberbarmen | Straße | Nummer mit Zusatz | B |
| 141 | Fischer & Schmidt | Westkotter Straße 16 | Oberbarmen | Straße | einfache Nummer | C |
| 143 | M. Flues & Co. | Deutscher Ring 66 | Elberfeld-West | Straße | einfache Nummer | C |
| 157 | August Görts KG | Unterkirchen 23 a | Cronenberg | Straße | Nummer mit Zusatz | B |
| 162 | Gutehoffnungshütte AG Oberhausen [Dolomit-Steinbruch Lüntenbeck] | Lüntenbeck 2c | Vohwinkel | Ortsteil | Nummer mit Zusatz | C |
| 165 | Hagen & Wolff | Haspeler Str. 216 | Barmen | Straße | einfache Nummer | C |
| 166 | Ferdinand von Hagen Söhne & Koch | Vohwinkeler Str. 97 | Vohwinkel | Straße | einfache Nummer | C |
| 169 | Ernst Halfmann | Höchsten 76 | Elberfeld | Straße | einfache Nummer | C |
| 172 | Hamba Hans A. Müller GmbH & Co. KG | Höhne 42 | Barmen | Straße | einfache Nummer | C |
| 173 | Gebr. Happich GmbH | Neuenteich 64-76 | Elberfeld | Straße | Bereich | B |
| 179 | Sebastian Helmstädter | Alter Markt 619-621 | Barmen | Straße | Bereich | C |
| 183 | Otto Henrich | Schorfer Str. 10 | Cronenberg | Straße | einfache Nummer | C |
| 187 | Wilhelm Hermes KG | Beule 8 b | Oberbarmen | Straße | Nummer mit Zusatz | C |
| 190 | Gebr. Hilgeland | Im Rehsiepen 33-35 | Ronsdorf | Straße | Bereich | B |
| 191 | Dr. Fritz Hillringhaus | Rauental 51-59 | Heckinghausen | Straße | Bereich | B |
| 192 | Hindrichs-Auffermann A.G. | Heckinghauser Str. 118-120 | Barmen | Straße | Bereich | C |
| 193 | Dr. Hans Höring | Viehhofstr. 33 A | Elberfeld-West | Straße | Nummer mit Zusatz | B |
| 194 | Hogarten & Co. KG | Nibelungenstr. 67 | Ronsdorf | Straße | einfache Nummer | C |
| 196 | J. & A. Homberg | Zur Scheuren 24-30 | Barmen | Straße | Bereich | B |
| 200 | Hugo Hösterey | Sudberger Str. 49 | Cronenberg | Straße | einfache Nummer | C |
| 203 | Walter Hufstadt | Hahnerbergerstraße 30-32 | Elberfeld | Straße | Bereich | B |
| 208 | Imo-Großdruckerei Carl H. Vollmer | Kleiner Werth 46 | Barmen | Straße | einfache Nummer | C |
| 210 | Gebr. Itter | Theishahner Straße 45 a | Küllenhahn | Straße | Nummer mit Zusatz | C |
| 212 | G. & J. Jaeger GmbH | Mettmanner Str. 79-99 | Elberfeld-West | Straße | Bereich | B |
| 214 | Leo Janssen | Viehhofstraße 112 | Elberfeld-West | Straße | einfache Nummer | C |
| 215 | Gebr. Jeude | Küllenhahner Str. 27 | Küllenhahn | Straße | einfache Nummer | C |
| 219 | August Jung Söhne | Rauer Werth 7a | Oberbarmen | Straße | Nummer mit Zusatz | C |
| 222 | Kabel- und Drahtwerk AG (an anderer Stelle: Kabel- und Gummiwerk AG) | Vohwinkeler Str. 71-83 | Vohwinkel | Straße | Bereich | C |
| 224 | Käseberg & Co. KG | Linderhauser Str. 42 a | Oberbarmen | Straße | Nummer mit Zusatz | B |
| 225 | Fritz Karthaus | Loher Str. 29 a | Barmen | Straße | Nummer mit Zusatz | C |
| 226 | J. C. E.Kaufmann | Vohwinkeler Str. 161 | Vohwinkel | Straße | einfache Nummer | C |
| 231 | Peter Kikuth | Gosenburg 47 | Heckinghausen | Straße | einfache Nummer | C |
| 237 | Hermann Kluge | Wuppermannstr. 23-27 | Barmen | Straße | Bereich | B |
| 241 | Herbert Kölker | Friedrich-Ebert-Straße 101 | Elberfeld | Straße | einfache Nummer | C |
| 242 | Christoph Köppel | Oberdörnen 101 | Barmen | Straße | einfache Nummer | C |
| 243 | Wilhelm Körting | Siegesstraße 90a | Barmen | Straße | Nummer mit Zusatz | B |
| 244 | Otto Kötter GmbH | Unterdörnen 11-17 | Barmen | Straße | Bereich | C |
| 244 (2) | Otto Kötter GmbH | Oberdörnen 8 | Barmen | Straße | einfache Nummer | C |
| 247 | Alfred Koll | Holenscheidter Str. 57 | Hahnerberg | Straße | einfache Nummer | C |
| 250 | Robert Kremer | Hahnerbergerstraße 72a | Küllenhahn | Straße | Nummer mit Zusatz | B |
| 252 | Emil Krenzler | Fuchsstraße und Sanderstraße | Barmen | **keine** | ohne Hausnummer | E |
| 255 | Kromberg & Schubert (Kroschu) | Spitzenstr. 37 | Langerfeld-Beyenburg | Straße | einfache Nummer | A |
| 260 | Kuntze & Söhne | Theishahner Str. 25 | Cronenberg | Straße | einfache Nummer | C |
| 261 | Lagergemeinschaft Opphof | Opphofer Straße | Elberfeld | Straße | ohne Hausnummer | D |
| 266 | Siegfried Leithäuser | Hofaue 47-49 | Elberfeld | Straße | Bereich | B |
| 267 | Carl Lenzner | Sanderstraße 30 | Barmen | Straße | einfache Nummer | C |
| 271 | Johann Linnenbürger | Marktstr. 11 | Ronsdorf | Straße | einfache Nummer | C |
| 273 | August Lohe | Friedrich-Engels-Allee 118 | Barmen | Straße | einfache Nummer | C |
| 275 | Lohmann & Stuhlmann | Oberkamperstr. 22A | Cronenberg | Straße | Nummer mit Zusatz | B |
| 281 | J. Machwürth | Kaiserstr. 195 | Vohwinkel | Straße | einfache Nummer | C |
| 285 | Matthes & Weber AG | Auf dem Dorp | Elberfeld | **keine** | ohne Hausnummer | E |
| 287 | August Meckenstock | Ferdinand Schrey Str. | Elberfeld | Straße | ohne Hausnummer | D |
| 287 (3) | August Meckenstock | Hospitalstr. 24 | Elberfeld | Straße | einfache Nummer | C |
| 288 | Melchior & Jörgens | Wittener Str. 37 A | Oberbarmen | Straße | Nummer mit Zusatz | B |
| 289 | Autohaus Merkur | Werther Brücke 11 | Heckinghausen | Straße | einfache Nummer | C |
| 290 | Metzenauer & Jung | Charlottenstr. 88 | Elberfeld | Straße | einfache Nummer | C |
| 296 | Theodor Möhle | Neuenteich 93 | Elberfeld | Straße | einfache Nummer | C |
| 297 | Mülder [Inhaber: Bruno Holl] | Friedrich-Ebert-Straße 99-101 | Elberfeld | Straße | Bereich | C |
| 298 | Simon Möller | Berliner Straße 202 a | Oberbarmen | Straße | Nummer mit Zusatz | C |
| 300 | Hans Moog [=Deutsches Leucht- u. Signalmittelwerk Dr. Feistel KG] | Flügel 1 | Ronsdorf | **keine** | einfache Nummer | E |
| 303 | Wilhelm Müller | Simonsstraße 13 | Elberfeld-West | Straße | einfache Nummer | C |
| 308 | Werner Neumann | Peterstr. 8 A | Barmen | Straße | Nummer mit Zusatz | B |
| 309 | Alfred Nolte „Hotel zum Römer“ | Kipdorf 77 | Elberfeld | Straße | einfache Nummer | C |
| 311 | Willi Nouvortne | Hofkamp 48-56 | Elberfeld | Straße | Bereich | B |
| 313 | Gustav Ohlig | Kölner Straße 96 | Elberfeld | Straße | einfache Nummer | C |
| 315 | Walter Osthoff | Kiesbergstr. 25 | Elberfeld | **keine** | einfache Nummer | E |
| 316 | Wilhelm Paashaus „Mechanische Weberei Barmen“ | Schützenstr. 25 | Barmen | Straße | einfache Nummer | C |
| 317 | Gebr. Pandel | Küllenhahner Str. 33 b | Küllenhahn | Straße | Nummer mit Zusatz | B |
| 318 | Abraham & Alex Pandel | Küllenhahner Str. 42 | Küllenhahn | Straße | einfache Nummer | C |
| 319 | Wilhelm Pandel Werkzeugfabrik | Nöllenhammerstraße 31 | Cronenberg | Straße | einfache Nummer | E |
| 320 | Friedrich Pass | Küllenhahner Str. 48 | Küllenhahn | Straße | einfache Nummer | C |
| 321 | Wilhelm Pass | Küllenhahner Str. 52 | Küllenhahn | Straße | einfache Nummer | C |
| 328 | Rudolf Piel & Söhne | Klotzbahn 30 | Elberfeld | Straße | einfache Nummer | C |
| 333 | Paul Prause | Norrenberg Str. 28 | Heckinghausen | Straße | einfache Nummer | C |
| 335 | Prinz & Kremer | Borner Str. 30 | Cronenberg | Straße | einfache Nummer | C |
| 339 | Ernst Quambusch | Friedrich-Engels-Allee 87 | Barmen | Straße | einfache Nummer | C |
| 342 (2) | Gustav Rafflenbeul, Schwelm [=Hansa-Werk und Raffawerk Gustav Rafflenbeul] | Oberdörnen 72 | Barmen | Straße | einfache Nummer | C |
| 347 | Reichmann & Co. | Bendahlerstr. 30 | Barmen | Straße | einfache Nummer | C |
| 350 | Otto Reinshagen | Dörpfeldstr. 49-51 | Ronsdorf | Straße | Bereich | C |
| 352 | E. u. W. Reitz | Langerfelder Str. 129 c | Langerfeld-Beyenburg | Straße | Nummer mit Zusatz | B |
| 357 | Rhenus | Friedrich-Ebert-Straße 149a | Elberfeld | Straße | Nummer mit Zusatz | B |
| 359 | Heinrich Röttger | Kölner Str. 88 | Elberfeld | Straße | einfache Nummer | C |
| 360 | Rosenkranz & Co. | Am Diek 97 a | Oberbarmen | Straße | Nummer mit Zusatz | C |
| 372 | Hermann Schlenkermann | Straße der Alten Garde 104 (Werth) | Barmen | **keine** | einfache Nummer | E |
| 373 | Schlieper & Laag GmbH | Buchenhofener Str. 49 | Vohwinkel | Straße | einfache Nummer | C |
| 374 | J. Schlipkötter | Nützenberger Str. 398 a | Elberfeld-West | Straße | Nummer mit Zusatz | C |
| 375 | Werner Schlüter | Breslauer Str. 62 | Oberbarmen | Straße | einfache Nummer | C |
| 377 | Schmahl & Schulz | Klingelholl 108-110 | Barmen | Straße | Bereich | B |
| 379 | Hans Schmeken | Boltenheide 5 | Vohwinkel | Straße | einfache Nummer | C |
| 380 | Gebr. Schmidt | [Gräfrather Str. 104-106??] | Vohwinkel | Straße | Bereich | B |
| 386 | Otto Schnicks | Dammstr. 16 | Elberfeld-West | Straße | einfache Nummer | C |
| 399 | Gebrüder Schutte | Reichsstraße 45 | Heckinghausen | Straße | einfache Nummer | C |
| 400 | Hubert Schwedt | Laurentiusstraße 33 | Elberfeld | Straße | einfache Nummer | C |
| 406 | Wilhelm Sopp | Wupperstr. 35 | Elberfeld | Straße | einfache Nummer | C |
| 409 | H. Spelleken Nachf. KG | Rheinische Straße 14 | Oberbarmen | Straße | einfache Nummer | C |
| 410 | Ewald Speth | Nordstr. 27 | Elberfeld | **keine** | einfache Nummer | C |
| 412 | Paul Spieker | Schlössersgasse 4 | Elberfeld | Straße | einfache Nummer | C |
| 414 | Stadthallen Gaststätte [Inhaber: W. Evers] | Johannisberg | Elberfeld | Straße | ohne Hausnummer | D |
| 415 | Rudolf Staehely | Linderhauser Str. 32c | Oberbarmen | Straße | Nummer mit Zusatz | B |
| 416 | Wilhelm Steeger GmbH | Bahnstr. 47 | Vohwinkel | Straße | einfache Nummer | C |
| 418 | Otto von den Steinen | Kuchhausen 102 | Cronenberg | Straße | einfache Nummer | C |
| 423 | Stocko | Kirchhofstraße 52 a | Elberfeld-West | Straße | Nummer mit Zusatz | B |
| 427 | Svensson & Kuhler | Simonsstr. 1a-3a | Elberfeld-West | Straße | Nummer mit Zusatz | C |
| 428 | Carl Aug. Tesche | Teschensudberg 6 | Cronenberg | Ortsteil | einfache Nummer | C |
| 431 | Maschinenfabrik Tienes | Löhrerlen 117 b | Oberbarmen | Straße | Nummer mit Zusatz | B |
| 433 | Lebrecht Töllner | Eich 1 | Cronenberg | Straße | einfache Nummer | C |
| 434 | Adolf Toenges | Vereinstraße 17a | Elberfeld | Straße | Nummer mit Zusatz | C |
| 438 | Vereinigte Glanzstoff-Fabriken A.G. | Auer-Schulstraße 14-16 | Elberfeld | Straße | Bereich | C |
| 439 | Vereinigung Wuppertaler Kohlenhändler | Kölner Str. 94 | Elberfeld | Straße | einfache Nummer | C |
| 441 | „Vauco“ Lederwarenfabrik Viehoff & Co. | Wichlinghauser Str. 47a | Oberbarmen | Straße | Nummer mit Zusatz | B |
| 442 | Visser & Co. | Funckstraße o. Nr. | Elberfeld-West | Straße | ohne Hausnummer | D |
| 443 | Friedrich Vohwinkel | Im Ostersiepen 1 | Elberfeld | Straße | einfache Nummer | C |
| 444 | Wilhelm Vonzumhoff | Gutenbergstr. 38 | Elberfeld-West | Straße | einfache Nummer | C |
| 447 | Vorwerk & Co. | Mühlenweg 23-25 | Barmen | Straße | Bereich | B |
| 449 | Wachs & Asmann | Westkotterstr. 46-48 | Oberbarmen | Straße | Bereich | C |
| 451 | Martin Wagner | Küllenhahner Str. 23 | Küllenhahn | Straße | einfache Nummer | C |
| 452 | Wagner & Co. | Lenneper Str. 130-130a | Langerfeld | Straße | Bereich | B |
| 454 | Alfred Wahl | Kaiserstr. 195 | Vohwinkel | Straße | einfache Nummer | C |
| 457 | Karl Watermann | Schützenstr. 92 | Barmen | Straße | einfache Nummer | C |
| 464 | Wiedenhoff & Wirtz | Kratzkopfstr. 32 | Ronsdorf | Straße | einfache Nummer | C |
| 467 | Emil Windgassen | Am Stadtbahnhof 6 | Ronsdorf | Straße | einfache Nummer | C |
| 472 | E.O. Wöhler & Co. | Warndstraße 4-12 | Barmen | Straße | Bereich | C |
| 475 | August Wülfing & Sohn | Breslauer Str. | Oberbarmen | Straße | ohne Hausnummer | D |
| 476 | Hermann Wülfing | Kaiserstraße 90 | Vohwinkel | Straße | einfache Nummer | C |
| 477 | Wuppermetall GmbH | Beckacker Schulstr. 35a | Oberbarmen | Straße | Nummer mit Zusatz | C |
| 478 | Hugo Wippermann | Beule 20 | Oberbarmen | Straße | einfache Nummer | C |

---

Erzeugt von `scripts/pruefe_verortung.py`. Die Datei ist eine Arbeitsgrundlage,
keine Datenquelle — Korrekturen gehören nach `data/korrekturen.json`.
