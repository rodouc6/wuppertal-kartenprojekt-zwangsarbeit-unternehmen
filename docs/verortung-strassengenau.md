# Prüfliste: nur straßengenau verortete Standorte

146 von 431 Standorten

## Worum es geht

`verortung: strassengenau` heißt: die Geokodierung hat nur die Straße getroffen,
nicht das Haus. Der Punkt sitzt auf dem Straßenmittelpunkt und kann einige hundert
Meter neben dem tatsächlichen Betriebsgelände liegen. Diese Liste sagt für jeden
dieser 146 Standorte, **warum** das so ist und **ob** sich daran etwas
ändern lässt.

## Wie geprüft wurde

Der heutige Adressbestand Wuppertals wurde über die Overpass-API aus OpenStreetMap
geholt (61.706 Adressen mit Straße und
Hausnummer) und lokal gegen die
Quelladressen abgeglichen — mit normalisierten Straßennamen (`Str.` ↔ `Straße`,
Zusammen-/Getrenntschreibung, Umlaute) und aufgelösten Hausnummernbereichen.

**Kalibrierung:** derselbe Abgleich findet 185 von 196 (94 %)
der bereits *hausgenau* verorteten Adressen wieder. Die Methode ist also belastbar;
wenn sie eine Adresse nicht findet, liegt das nicht am Verfahren.

Bei den straßengenauen findet sie dagegen nur 6 von 81
(7 %). **Das ist der zentrale Befund: diese Adressen sind nicht
schlecht geokodiert, sie existieren heute überwiegend nicht mehr.** Kriegszerstörung,
Neubebauung, Umnummerierung.

## Befunde im Überblick

| Klasse | Bedeutung | Anzahl |
|---|---|---:|
| **A** | Hausnummer existiert heute — hausgenau nachverortbar | 6 |
| **B** | Nummer selbst weg, aber eine Nummer aus dem angegebenen Bereich bzw. die Nummer ohne Zusatz existiert | 32 |
| **C** | Straße existiert, diese Hausnummer heute nicht mehr | 100 |
| **D** | Die Quelle nennt gar keine Hausnummer | 6 |
| **E** | Straßenname heute nicht auffindbar | 2 |
| | **gesamt** | **146** |

## A — hausgenau nachverortbar

Hier gibt es die Hausnummer heute noch. Die bisherige Koordinate ließe sich durch
die des Gebäudes ersetzen. Die Geokodierung ist durchweg an Schreibweisen
gescheitert (`Mettmannerstr.` statt `Mettmanner Straße`, `Blombacherbach` statt
`Blombacher Bach`).

| Nr. | Unternehmen | Adresse (Quelle) | Stadtteil | heutiger OSM-Treffer | Koordinate |
|---|---|---|---|---|---|
| 122 | Dyckerhoff & Widmann KG [Baubüro Jägerwerke] | Mettmannerstr. 79 | Elberfeld-West | Mettmanner Straße 79 | 51.25177, 7.092284 |
| 145 | Wilhelm Franke | Küllenhahner Str. 20 | Küllenhahn | Küllenhahner Straße 20 | 51.229216, 7.148254 |
| 168 | Halbach, Braun & Co. | Blombacherbach 32 | Heckinghausen | Blombacher Bach 32 | 51.254659, 7.22893 |
| 255 | Kromberg & Schubert (Kroschu) | Spitzenstr. 37 | Langerfeld-Beyenburg | Spitzenstraße 37 | 51.275964, 7.237354 |
| 404 | Wilhelm Soennecken | Blombacherbach 12 | Heckinghausen | Blombacher Bach 12 | 51.255876, 7.230861 |
| 459 | Fritz Weeren | Rauental 72 | Heckinghausen | Rauental 72 | 51.270617, 7.232843 |

Abstand zur bisherigen Koordinate:

| Nr. | bisher (lon, lat) | neu (lat, lon) | Abweichung |
|---|---|---|---|
| 122 | 7.098564, 51.2543798 | 51.25177, 7.092284 | ~524 m |
| 145 | 7.1467616, 51.229407 | 51.229216, 7.148254 | ~106 m |
| 168 | 7.2300849, 51.2577109 | 51.254659, 7.22893 | ~347 m |
| 255 | 7.2425376, 51.2757208 | 51.275964, 7.237354 | ~362 m |
| 404 | 7.2300849, 51.2577109 | 51.255876, 7.230861 | ~210 m |
| 459 | 7.2267237, 51.2735209 | 51.270617, 7.232843 | ~534 m |

**Gegenprobe über Nominatim** (unabhängig vom Overpass-Abzug, abgefragt am
1. August 2026): Für Nr. 145, 168, 404 und 459 liefert Nominatim ein Gebäude an
derselben Stelle (0–6 m Abweichung) — diese vier sind belegt.

Für **Nr. 122** (Mettmanner Straße 79) und **Nr. 255** (Spitzenstraße 37) findet
Nominatim die Hausnummer nicht und fällt auf die Straße zurück — genau der Grund,
warum sie bisher `strassengenau` sind. Im OSM-Rohbestand existiert die Nummer aber
sehr wohl, und beide Straßennamen kommen in Wuppertal nur einmal vor; die
Nummernfolge ist an beiden Stellen stimmig. Die Treffer sind damit plausibel,
stützen sich jedoch auf eine einzige Quelle. Vor einer Übernahme nach
`data/korrekturen.json` sollten sie an einer zweiten Quelle geprüft werden.

## B — Nummer benachbart oder im Bereich vorhanden

Die Quelle nennt einen Bereich (`87-93`) oder einen Buchstabenzusatz (`118 a`).
Die angegebene Nummer selbst gibt es heute nicht, wohl aber eine benachbarte.

**Diese 32 Standorte ließen sich besser kartieren als bisher.** Der
Ersatzpunkt liegt im Median 276 m vom heutigen Straßenmittelpunkt entfernt —
bei langen Straßen ist dieser Mittelpunkt praktisch beliebig, die Hausnummer nicht.
Für die Stufe `hausgenau` reicht es trotzdem nicht: welches Haus des Bereichs der
Betrieb belegte, sagt die Quelle nicht.

Die Gruppe ist nicht einheitlich:

- **17 Fälle mit Buchstabenzusatz** (`143 a` → `143`). In der Regel
  Anbau, Hinterhaus oder geteiltes Grundstück, also unmittelbar benachbart. Das ist
  der verlässlichere Teil der Gruppe.
- **15 Bereichsangaben.** Hier ist der Punkt der Schwerpunkt aller
  Nummern des Bereichs, die es heute noch gibt. Wie belastbar das ist, hängt daran,
  wie viele das sind — die Spalte „belegt“ nennt es. Bei nur einer belegten Nummer
  aus einem weiten Bereich ist der Punkt eher Interpolation als Beleg.

Hausnummernbereiche werden dabei paritätsgerecht aufgelöst: `87-93` meint 87, 89,
91, 93 — Nr. 88 läge auf der gegenüberliegenden Straßenseite und zählt nicht.

| Nr. | Unternehmen | Adresse (Quelle) | Stadtteil | heutige Nummern | belegt | Koordinate |
|---|---|---|---|---|---|---|
| 74 | J. P. Bemberg AG. | Oehder Str. 14-28 | Langerfeld-Beyenburg | Öhder Straße 16, 18, 28 | 3 von 8 | 51.264163, 7.236577 |
| 83 | Otto Berns | Cronenbergerstr. 325 a | Elberfeld | Cronenberger Straße 325 | — | 51.231541, 7.147599 |
| 89 | Block & Vaupel | Heckinghauser Str. 143 a | Barmen | Heckinghauser Straße 143 | — | 51.271377, 7.219219 |
| 101 | Carl Brose & Co. | Opphofer Str. 13-17 | Elberfeld | Opphofer Straße 15 | 1 von 3 | 51.266331, 7.152277 |
| 125 | Paul Eigenbrodt | Vor d. Beule 37-39 | Oberbarmen | Vor der Beule 37, 39 | 2 von 2 | 51.288801, 7.231792 |
| 139 | Walter Finkeldei | Berliner Str. 130 a | Oberbarmen | Berliner Straße 130 | — | 51.274773, 7.217221 |
| 173 | Gebr. Happich GmbH | Neuenteich 64-76 | Elberfeld | Neuenteich 68, 70, 72, 74, 76 | 5 von 7 | 51.260516, 7.153897 |
| 190 | Gebr. Hilgeland | Im Rehsiepen 33-35 | Ronsdorf | Im Rehsiepen 35 | 1 von 2 | 51.224148, 7.21781 |
| 191 | Dr. Fritz Hillringhaus | Rauental 51-59 | Heckinghausen | Rauental 51, 53, 55, 57, 59 | 5 von 5 | 51.272375, 7.230526 |
| 193 | Dr. Hans Höring | Viehhofstr. 33 A | Elberfeld-West | Viehhofstraße 33 | — | 51.247533, 7.138172 |
| 196 | J. & A. Homberg | Zur Scheuren 24-30 | Barmen | Zur Scheuren 28 | 1 von 4 | 51.275618, 7.20171 |
| 203 | Walter Hufstadt | Hahnerbergerstraße 30-32 | Elberfeld | Hahnerberger Straße 32 | 1 von 2 | 51.227237, 7.15031 |
| 212 | G. & J. Jaeger GmbH | Mettmanner Str. 79-99 | Elberfeld-West | Mettmanner Straße 79, 89 | 2 von 11 | 51.252105, 7.092692 |
| 224 | Käseberg & Co. KG | Linderhauser Str. 42 a | Oberbarmen | Linderhauser Straße 42 | — | 51.292188, 7.239126 |
| 237 | Hermann Kluge | Wuppermannstr. 23-27 | Barmen | Wuppermannstraße 25 | 1 von 3 | 51.276668, 7.201483 |
| 243 | Wilhelm Körting | Siegesstraße 90a | Barmen | Siegesstraße 90 | — | 51.262672, 7.18233 |
| 250 | Robert Kremer | Hahnerbergerstraße 72a | Küllenhahn | Hahnerberger Straße 72 | — | 51.225401, 7.151074 |
| 266 | Siegfried Leithäuser | Hofaue 47-49 | Elberfeld | Hofaue 49 | 1 von 2 | 51.257126, 7.152761 |
| 275 | Lohmann & Stuhlmann | Oberkamperstr. 22A | Cronenberg | Oberkamper Straße 22 | — | 51.210668, 7.142782 |
| 288 | Melchior & Jörgens | Wittener Str. 37 A | Oberbarmen | Wittener Straße 37 | — | 51.28804, 7.232632 |
| 308 | Werner Neumann | Peterstr. 8 A | Barmen | Peterstraße 8 | — | 51.264032, 7.195188 |
| 311 | Willi Nouvortne | Hofkamp 48-56 | Elberfeld | Hofkamp 50 | 1 von 5 | 51.258733, 7.151283 |
| 317 | Gebr. Pandel | Küllenhahner Str. 33 b | Küllenhahn | Küllenhahner Straße 33 | — | 51.229036, 7.147702 |
| 352 | E. u. W. Reitz | Langerfelder Str. 129 c | Langerfeld-Beyenburg | Langerfelder Straße 129 | — | 51.274277, 7.240657 |
| 357 | Rhenus | Friedrich-Ebert-Straße 149a | Elberfeld | Friedrich-Ebert-Straße 149 | — | 51.249818, 7.126657 |
| 377 | Schmahl & Schulz | Klingelholl 108-110 | Barmen | Klingelholl 110 | 1 von 2 | 51.280527, 7.203617 |
| 380 | Gebr. Schmidt | [Gräfrather Str. 104-106??] | Vohwinkel | Gräfrather Straße 106 | 1 von 2 | 51.224181, 7.070313 |
| 415 | Rudolf Staehely | Linderhauser Str. 32c | Oberbarmen | Linderhauser Straße 32 | — | 51.29085, 7.237436 |
| 423 | Stocko | Kirchhofstraße 52 a | Elberfeld-West | Kirchhofstraße 52 | — | 51.24188, 7.101955 |
| 431 | Maschinenfabrik Tienes | Löhrerlen 117 b | Oberbarmen | Löhrerlen 117 | — | 51.291136, 7.239446 |
| 441 | „Vauco“ Lederwarenfabrik Viehoff & Co. | Wichlinghauser Str. 47a | Oberbarmen | Wichlinghauser Straße 47 | — | 51.279002, 7.21859 |
| 447 | Vorwerk & Co. | Mühlenweg 23-25 | Barmen | Mühlenweg 25 | 1 von 2 | 51.274023, 7.200187 |

## C — Hausnummer heute nicht vergeben

Die Straße gibt es, die Hausnummer nicht mehr. Ohne historische Quellen
(Adressbücher, Katasterpläne, Luftbilder) ist hier nichts zu machen —
`strassengenau` ist die ehrliche Angabe.

| Nr. | Unternehmen | Adresse (Quelle) | Stadtteil |
|---|---|---|---|
| 54 | Ackermann Fahrzeugbau | Vohwinkeler Str. 87-93 | Vohwinkel |
| 60 | Oswald Attin | Warndstraße 4 | Barmen |
| 65 | Barmer Maschinenfabrik KG | Mohrenstr. 12-28 | Heckinghausen |
| 66 | Bastfaser GmbH | Auf der Bleiche 43 | Heckinghausen |
| 67 | Carl Bauer | Solinger Str. 28 | Cronenberg |
| 76 | Kurt Berger | Neumarktstaße 25-27 | Elberfeld |
| 77 | Hans Berger | Barmer Str. 34 | Elberfeld |
| 78 | Emil Berges | Oberbergische Str. 197 | Barmen |
| 80 | Bergisches Kabelwerk | Wartburgstr. 118 a | Barmen |
| 82 | Ferdinand Berns | Theishahnerstr. 112 | Küllenhahn |
| 91 | Bocklenberg & Motte (BOMORO) | Schöne Aussicht 12 | Ronsdorf |
| 92 | Carl Bocklenberg & Söhne (Cebor) | Erbschlöerstr. 27 | Ronsdorf |
| 94 | Boltz KG | Friedrich-Ebert-Straße 103 a | Elberfeld |
| 98 | Hermann Bremer | Mühle 49-51 | Ronsdorf |
| 106 | Hermann Busche KG | Alfredstraße 5 | Barmen |
| 114 | Daimler Benz AG | Tannenbergstr. 20-24 | Elberfeld-West |
| 123 | Karl Egert | Meckelstr. 16 A | Barmen |
| 134 | Eylert KG. | Unten vorm Steeg 138 | Elberfeld-West |
| 141 | Fischer & Schmidt | Westkotter Straße 16 | Oberbarmen |
| 143 | M. Flues & Co. | Deutscher Ring 66 | Elberfeld-West |
| 165 | Hagen & Wolff | Haspeler Str. 216 | Barmen |
| 166 | Ferdinand von Hagen Söhne & Koch | Vohwinkeler Str. 97 | Vohwinkel |
| 169 | Ernst Halfmann | Höchsten 76 | Elberfeld |
| 172 | Hamba Hans A. Müller GmbH & Co. KG | Höhne 42 | Barmen |
| 179 | Sebastian Helmstädter | Alter Markt 619-621 | Barmen |
| 183 | Otto Henrich | Schorfer Str. 10 | Cronenberg |
| 187 | Wilhelm Hermes KG | Beule 8 b | Oberbarmen |
| 192 | Hindrichs-Auffermann A.G. | Heckinghauser Str. 118-120 | Barmen |
| 194 | Hogarten & Co. KG | Nibelungenstr. 67 | Ronsdorf |
| 200 | Hugo Hösterey | Sudberger Str. 49 | Cronenberg |
| 208 | Imo-Großdruckerei Carl H. Vollmer | Kleiner Werth 46 | Barmen |
| 210 | Gebr. Itter | Theishahner Straße 45 a | Küllenhahn |
| 214 | Leo Janssen | Viehhofstraße 112 | Elberfeld-West |
| 215 | Gebr. Jeude | Küllenhahner Str. 27 | Küllenhahn |
| 219 | August Jung Söhne | Rauer Werth 7a | Oberbarmen |
| 222 | Kabel- und Drahtwerk AG (an anderer Stelle: Kabel- und Gummiwerk AG) | Vohwinkeler Str. 71-83 | Vohwinkel |
| 225 | Fritz Karthaus | Loher Str. 29 a | Barmen |
| 226 | J. C. E.Kaufmann | Vohwinkeler Str. 161 | Vohwinkel |
| 231 | Peter Kikuth | Gosenburg 47 | Heckinghausen |
| 241 | Herbert Kölker | Friedrich-Ebert-Straße 101 | Elberfeld |
| 242 | Christoph Köppel | Oberdörnen 101 | Barmen |
| 244 | Otto Kötter GmbH | Unterdörnen 11-17 | Barmen |
| 244 (2) | Otto Kötter GmbH | Oberdörnen 8 | Barmen |
| 247 | Alfred Koll | Holenscheidter Str. 57 | Hahnerberg |
| 260 | Kuntze & Söhne | Theishahner Str. 25 | Cronenberg |
| 267 | Carl Lenzner | Sanderstraße 30 | Barmen |
| 271 | Johann Linnenbürger | Marktstr. 11 | Ronsdorf |
| 273 | August Lohe | Friedrich-Engels-Allee 118 | Barmen |
| 281 | J. Machwürth | Kaiserstr. 195 | Vohwinkel |
| 287 (3) | August Meckenstock | Hospitalstr. 24 | Elberfeld |
| 289 | Autohaus Merkur | Werther Brücke 11 | Heckinghausen |
| 290 | Metzenauer & Jung | Charlottenstr. 88 | Elberfeld |
| 296 | Theodor Möhle | Neuenteich 93 | Elberfeld |
| 297 | Mülder [Inhaber: Bruno Holl] | Friedrich-Ebert-Straße 99-101 | Elberfeld |
| 298 | Simon Möller | Berliner Straße 202 a | Oberbarmen |
| 303 | Wilhelm Müller | Simonsstraße 13 | Elberfeld-West |
| 309 | Alfred Nolte „Hotel zum Römer“ | Kipdorf 77 | Elberfeld |
| 313 | Gustav Ohlig | Kölner Straße 96 | Elberfeld |
| 316 | Wilhelm Paashaus „Mechanische Weberei Barmen“ | Schützenstr. 25 | Barmen |
| 318 | Abraham & Alex Pandel | Küllenhahner Str. 42 | Küllenhahn |
| 320 | Friedrich Pass | Küllenhahner Str. 48 | Küllenhahn |
| 321 | Wilhelm Pass | Küllenhahner Str. 52 | Küllenhahn |
| 328 | Rudolf Piel & Söhne | Klotzbahn 30 | Elberfeld |
| 333 | Paul Prause | Norrenberg Str. 28 | Heckinghausen |
| 335 | Prinz & Kremer | Borner Str. 30 | Cronenberg |
| 339 | Ernst Quambusch | Friedrich-Engels-Allee 87 | Barmen |
| 342 (2) | Gustav Rafflenbeul, Schwelm [=Hansa-Werk und Raffawerk Gustav Rafflenbeul] | Oberdörnen 72 | Barmen |
| 347 | Reichmann & Co. | Bendahlerstr. 30 | Barmen |
| 350 | Otto Reinshagen | Dörpfeldstr. 49-51 | Ronsdorf |
| 359 | Heinrich Röttger | Kölner Str. 88 | Elberfeld |
| 360 | Rosenkranz & Co. | Am Diek 97 a | Oberbarmen |
| 373 | Schlieper & Laag GmbH | Buchenhofener Str. 49 | Vohwinkel |
| 374 | J. Schlipkötter | Nützenberger Str. 398 a | Elberfeld-West |
| 375 | Werner Schlüter | Breslauer Str. 62 | Oberbarmen |
| 379 | Hans Schmeken | Boltenheide 5 | Vohwinkel |
| 386 | Otto Schnicks | Dammstr. 16 | Elberfeld-West |
| 399 | Gebrüder Schutte | Reichsstraße 45 | Heckinghausen |
| 400 | Hubert Schwedt | Laurentiusstraße 33 | Elberfeld |
| 406 | Wilhelm Sopp | Wupperstr. 35 | Elberfeld |
| 409 | H. Spelleken Nachf. KG | Rheinische Straße 14 | Oberbarmen |
| 412 | Paul Spieker | Schlössersgasse 4 | Elberfeld |
| 416 | Wilhelm Steeger GmbH | Bahnstr. 47 | Vohwinkel |
| 418 | Otto von den Steinen | Kuchhausen 102 | Cronenberg |
| 427 | Svensson & Kuhler | Simonsstr. 1a-3a | Elberfeld-West |
| 433 | Lebrecht Töllner | Eich 1 | Cronenberg |
| 434 | Adolf Toenges | Vereinstraße 17a | Elberfeld |
| 438 | Vereinigte Glanzstoff-Fabriken A.G. | Auer-Schulstraße 14-16 | Elberfeld |
| 439 | Vereinigung Wuppertaler Kohlenhändler | Kölner Str. 94 | Elberfeld |
| 443 | Friedrich Vohwinkel | Im Ostersiepen 1 | Elberfeld |
| 444 | Wilhelm Vonzumhoff | Gutenbergstr. 38 | Elberfeld-West |
| 449 | Wachs & Asmann | Westkotterstr. 46-48 | Oberbarmen |
| 451 | Martin Wagner | Küllenhahner Str. 23 | Küllenhahn |
| 454 | Alfred Wahl | Kaiserstr. 195 | Vohwinkel |
| 457 | Karl Watermann | Schützenstr. 92 | Barmen |
| 464 | Wiedenhoff & Wirtz | Kratzkopfstr. 32 | Ronsdorf |
| 467 | Emil Windgassen | Am Stadtbahnhof 6 | Ronsdorf |
| 472 | E.O. Wöhler & Co. | Warndstraße 4-12 | Barmen |
| 476 | Hermann Wülfing | Kaiserstraße 90 | Vohwinkel |
| 477 | Wuppermetall GmbH | Beckacker Schulstr. 35a | Oberbarmen |
| 478 | Hugo Wippermann | Beule 20 | Oberbarmen |

## D — Quelle nennt keine Hausnummer

Bei diesen Einträgen steht in der Quelle nur die Straße. `strassengenau` ist hier
keine Schwäche der Geokodierung, sondern gibt den Kenntnisstand korrekt wieder.

| Nr. | Unternehmen | Adresse (Quelle) | Stadtteil |
|---|---|---|---|
| 116 | Ferdinand Deisel | Feldstr. | Oberbarmen |
| 261 | Lagergemeinschaft Opphof | Opphofer Straße | Elberfeld |
| 287 | August Meckenstock | Ferdinand Schrey Str. | Elberfeld |
| 414 | Stadthallen Gaststätte [Inhaber: W. Evers] | Johannisberg | Elberfeld |
| 442 | Visser & Co. | Funckstraße o. Nr. | Elberfeld-West |
| 475 | August Wülfing & Sohn | Breslauer Str. | Oberbarmen |

## E — Straßenname heute nicht auffindbar

Ausgangspunkt waren acht Adressen, deren Straßenname sich im heutigen Bestand nicht
fand. Für sechs ließ sich per Ähnlichkeitsabgleich die heutige Schreibweise belegen
(siehe `ALIAS` in `scripts/pruefe_verortung.py`); sie stehen oben unter B bzw. C.
Hier bleiben die Fälle, für die es keinen heutigen Namen gibt.

| Nr. | Unternehmen | Adresse (Quelle) | Stadtteil |
|---|---|---|---|
| 110 | Cramer & Kromberg | Brausenwerther Str. 15 | Elberfeld |
| 319 | Wilhelm Pandel Werkzeugfabrik | Nöllenhammerstraße 31 | Cronenberg |

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

## Vollständige Liste (alle 146)

| Nr. | Unternehmen | Adresse (Quelle) | Stadtteil | Form | Befund |
|---|---|---|---|---|---|
| 54 | Ackermann Fahrzeugbau | Vohwinkeler Str. 87-93 | Vohwinkel | Bereich | C |
| 60 | Oswald Attin | Warndstraße 4 | Barmen | einfache Nummer | C |
| 65 | Barmer Maschinenfabrik KG | Mohrenstr. 12-28 | Heckinghausen | Bereich | C |
| 66 | Bastfaser GmbH | Auf der Bleiche 43 | Heckinghausen | einfache Nummer | C |
| 67 | Carl Bauer | Solinger Str. 28 | Cronenberg | einfache Nummer | C |
| 74 | J. P. Bemberg AG. | Oehder Str. 14-28 | Langerfeld-Beyenburg | Bereich | B |
| 76 | Kurt Berger | Neumarktstaße 25-27 | Elberfeld | Bereich | C |
| 77 | Hans Berger | Barmer Str. 34 | Elberfeld | einfache Nummer | C |
| 78 | Emil Berges | Oberbergische Str. 197 | Barmen | einfache Nummer | C |
| 80 | Bergisches Kabelwerk | Wartburgstr. 118 a | Barmen | Nummer mit Zusatz | C |
| 82 | Ferdinand Berns | Theishahnerstr. 112 | Küllenhahn | einfache Nummer | C |
| 83 | Otto Berns | Cronenbergerstr. 325 a | Elberfeld | Nummer mit Zusatz | B |
| 89 | Block & Vaupel | Heckinghauser Str. 143 a | Barmen | Nummer mit Zusatz | B |
| 91 | Bocklenberg & Motte (BOMORO) | Schöne Aussicht 12 | Ronsdorf | einfache Nummer | C |
| 92 | Carl Bocklenberg & Söhne (Cebor) | Erbschlöerstr. 27 | Ronsdorf | einfache Nummer | C |
| 94 | Boltz KG | Friedrich-Ebert-Straße 103 a | Elberfeld | Nummer mit Zusatz | C |
| 98 | Hermann Bremer | Mühle 49-51 | Ronsdorf | Bereich | C |
| 101 | Carl Brose & Co. | Opphofer Str. 13-17 | Elberfeld | Bereich | B |
| 106 | Hermann Busche KG | Alfredstraße 5 | Barmen | einfache Nummer | C |
| 110 | Cramer & Kromberg | Brausenwerther Str. 15 | Elberfeld | einfache Nummer | E |
| 114 | Daimler Benz AG | Tannenbergstr. 20-24 | Elberfeld-West | Bereich | C |
| 116 | Ferdinand Deisel | Feldstr. | Oberbarmen | ohne Hausnummer | D |
| 122 | Dyckerhoff & Widmann KG [Baubüro Jägerwerke] | Mettmannerstr. 79 | Elberfeld-West | einfache Nummer | A |
| 123 | Karl Egert | Meckelstr. 16 A | Barmen | Nummer mit Zusatz | C |
| 125 | Paul Eigenbrodt | Vor d. Beule 37-39 | Oberbarmen | Bereich | B |
| 134 | Eylert KG. | Unten vorm Steeg 138 | Elberfeld-West | einfache Nummer | C |
| 139 | Walter Finkeldei | Berliner Str. 130 a | Oberbarmen | Nummer mit Zusatz | B |
| 141 | Fischer & Schmidt | Westkotter Straße 16 | Oberbarmen | einfache Nummer | C |
| 143 | M. Flues & Co. | Deutscher Ring 66 | Elberfeld-West | einfache Nummer | C |
| 145 | Wilhelm Franke | Küllenhahner Str. 20 | Küllenhahn | einfache Nummer | A |
| 165 | Hagen & Wolff | Haspeler Str. 216 | Barmen | einfache Nummer | C |
| 166 | Ferdinand von Hagen Söhne & Koch | Vohwinkeler Str. 97 | Vohwinkel | einfache Nummer | C |
| 168 | Halbach, Braun & Co. | Blombacherbach 32 | Heckinghausen | einfache Nummer | A |
| 169 | Ernst Halfmann | Höchsten 76 | Elberfeld | einfache Nummer | C |
| 172 | Hamba Hans A. Müller GmbH & Co. KG | Höhne 42 | Barmen | einfache Nummer | C |
| 173 | Gebr. Happich GmbH | Neuenteich 64-76 | Elberfeld | Bereich | B |
| 179 | Sebastian Helmstädter | Alter Markt 619-621 | Barmen | Bereich | C |
| 183 | Otto Henrich | Schorfer Str. 10 | Cronenberg | einfache Nummer | C |
| 187 | Wilhelm Hermes KG | Beule 8 b | Oberbarmen | Nummer mit Zusatz | C |
| 190 | Gebr. Hilgeland | Im Rehsiepen 33-35 | Ronsdorf | Bereich | B |
| 191 | Dr. Fritz Hillringhaus | Rauental 51-59 | Heckinghausen | Bereich | B |
| 192 | Hindrichs-Auffermann A.G. | Heckinghauser Str. 118-120 | Barmen | Bereich | C |
| 193 | Dr. Hans Höring | Viehhofstr. 33 A | Elberfeld-West | Nummer mit Zusatz | B |
| 194 | Hogarten & Co. KG | Nibelungenstr. 67 | Ronsdorf | einfache Nummer | C |
| 196 | J. & A. Homberg | Zur Scheuren 24-30 | Barmen | Bereich | B |
| 200 | Hugo Hösterey | Sudberger Str. 49 | Cronenberg | einfache Nummer | C |
| 203 | Walter Hufstadt | Hahnerbergerstraße 30-32 | Elberfeld | Bereich | B |
| 208 | Imo-Großdruckerei Carl H. Vollmer | Kleiner Werth 46 | Barmen | einfache Nummer | C |
| 210 | Gebr. Itter | Theishahner Straße 45 a | Küllenhahn | Nummer mit Zusatz | C |
| 212 | G. & J. Jaeger GmbH | Mettmanner Str. 79-99 | Elberfeld-West | Bereich | B |
| 214 | Leo Janssen | Viehhofstraße 112 | Elberfeld-West | einfache Nummer | C |
| 215 | Gebr. Jeude | Küllenhahner Str. 27 | Küllenhahn | einfache Nummer | C |
| 219 | August Jung Söhne | Rauer Werth 7a | Oberbarmen | Nummer mit Zusatz | C |
| 222 | Kabel- und Drahtwerk AG (an anderer Stelle: Kabel- und Gummiwerk AG) | Vohwinkeler Str. 71-83 | Vohwinkel | Bereich | C |
| 224 | Käseberg & Co. KG | Linderhauser Str. 42 a | Oberbarmen | Nummer mit Zusatz | B |
| 225 | Fritz Karthaus | Loher Str. 29 a | Barmen | Nummer mit Zusatz | C |
| 226 | J. C. E.Kaufmann | Vohwinkeler Str. 161 | Vohwinkel | einfache Nummer | C |
| 231 | Peter Kikuth | Gosenburg 47 | Heckinghausen | einfache Nummer | C |
| 237 | Hermann Kluge | Wuppermannstr. 23-27 | Barmen | Bereich | B |
| 241 | Herbert Kölker | Friedrich-Ebert-Straße 101 | Elberfeld | einfache Nummer | C |
| 242 | Christoph Köppel | Oberdörnen 101 | Barmen | einfache Nummer | C |
| 243 | Wilhelm Körting | Siegesstraße 90a | Barmen | Nummer mit Zusatz | B |
| 244 | Otto Kötter GmbH | Unterdörnen 11-17 | Barmen | Bereich | C |
| 244 (2) | Otto Kötter GmbH | Oberdörnen 8 | Barmen | einfache Nummer | C |
| 247 | Alfred Koll | Holenscheidter Str. 57 | Hahnerberg | einfache Nummer | C |
| 250 | Robert Kremer | Hahnerbergerstraße 72a | Küllenhahn | Nummer mit Zusatz | B |
| 255 | Kromberg & Schubert (Kroschu) | Spitzenstr. 37 | Langerfeld-Beyenburg | einfache Nummer | A |
| 260 | Kuntze & Söhne | Theishahner Str. 25 | Cronenberg | einfache Nummer | C |
| 261 | Lagergemeinschaft Opphof | Opphofer Straße | Elberfeld | ohne Hausnummer | D |
| 266 | Siegfried Leithäuser | Hofaue 47-49 | Elberfeld | Bereich | B |
| 267 | Carl Lenzner | Sanderstraße 30 | Barmen | einfache Nummer | C |
| 271 | Johann Linnenbürger | Marktstr. 11 | Ronsdorf | einfache Nummer | C |
| 273 | August Lohe | Friedrich-Engels-Allee 118 | Barmen | einfache Nummer | C |
| 275 | Lohmann & Stuhlmann | Oberkamperstr. 22A | Cronenberg | Nummer mit Zusatz | B |
| 281 | J. Machwürth | Kaiserstr. 195 | Vohwinkel | einfache Nummer | C |
| 287 | August Meckenstock | Ferdinand Schrey Str. | Elberfeld | ohne Hausnummer | D |
| 287 (3) | August Meckenstock | Hospitalstr. 24 | Elberfeld | einfache Nummer | C |
| 288 | Melchior & Jörgens | Wittener Str. 37 A | Oberbarmen | Nummer mit Zusatz | B |
| 289 | Autohaus Merkur | Werther Brücke 11 | Heckinghausen | einfache Nummer | C |
| 290 | Metzenauer & Jung | Charlottenstr. 88 | Elberfeld | einfache Nummer | C |
| 296 | Theodor Möhle | Neuenteich 93 | Elberfeld | einfache Nummer | C |
| 297 | Mülder [Inhaber: Bruno Holl] | Friedrich-Ebert-Straße 99-101 | Elberfeld | Bereich | C |
| 298 | Simon Möller | Berliner Straße 202 a | Oberbarmen | Nummer mit Zusatz | C |
| 303 | Wilhelm Müller | Simonsstraße 13 | Elberfeld-West | einfache Nummer | C |
| 308 | Werner Neumann | Peterstr. 8 A | Barmen | Nummer mit Zusatz | B |
| 309 | Alfred Nolte „Hotel zum Römer“ | Kipdorf 77 | Elberfeld | einfache Nummer | C |
| 311 | Willi Nouvortne | Hofkamp 48-56 | Elberfeld | Bereich | B |
| 313 | Gustav Ohlig | Kölner Straße 96 | Elberfeld | einfache Nummer | C |
| 316 | Wilhelm Paashaus „Mechanische Weberei Barmen“ | Schützenstr. 25 | Barmen | einfache Nummer | C |
| 317 | Gebr. Pandel | Küllenhahner Str. 33 b | Küllenhahn | Nummer mit Zusatz | B |
| 318 | Abraham & Alex Pandel | Küllenhahner Str. 42 | Küllenhahn | einfache Nummer | C |
| 319 | Wilhelm Pandel Werkzeugfabrik | Nöllenhammerstraße 31 | Cronenberg | einfache Nummer | E |
| 320 | Friedrich Pass | Küllenhahner Str. 48 | Küllenhahn | einfache Nummer | C |
| 321 | Wilhelm Pass | Küllenhahner Str. 52 | Küllenhahn | einfache Nummer | C |
| 328 | Rudolf Piel & Söhne | Klotzbahn 30 | Elberfeld | einfache Nummer | C |
| 333 | Paul Prause | Norrenberg Str. 28 | Heckinghausen | einfache Nummer | C |
| 335 | Prinz & Kremer | Borner Str. 30 | Cronenberg | einfache Nummer | C |
| 339 | Ernst Quambusch | Friedrich-Engels-Allee 87 | Barmen | einfache Nummer | C |
| 342 (2) | Gustav Rafflenbeul, Schwelm [=Hansa-Werk und Raffawerk Gustav Rafflenbeul] | Oberdörnen 72 | Barmen | einfache Nummer | C |
| 347 | Reichmann & Co. | Bendahlerstr. 30 | Barmen | einfache Nummer | C |
| 350 | Otto Reinshagen | Dörpfeldstr. 49-51 | Ronsdorf | Bereich | C |
| 352 | E. u. W. Reitz | Langerfelder Str. 129 c | Langerfeld-Beyenburg | Nummer mit Zusatz | B |
| 357 | Rhenus | Friedrich-Ebert-Straße 149a | Elberfeld | Nummer mit Zusatz | B |
| 359 | Heinrich Röttger | Kölner Str. 88 | Elberfeld | einfache Nummer | C |
| 360 | Rosenkranz & Co. | Am Diek 97 a | Oberbarmen | Nummer mit Zusatz | C |
| 373 | Schlieper & Laag GmbH | Buchenhofener Str. 49 | Vohwinkel | einfache Nummer | C |
| 374 | J. Schlipkötter | Nützenberger Str. 398 a | Elberfeld-West | Nummer mit Zusatz | C |
| 375 | Werner Schlüter | Breslauer Str. 62 | Oberbarmen | einfache Nummer | C |
| 377 | Schmahl & Schulz | Klingelholl 108-110 | Barmen | Bereich | B |
| 379 | Hans Schmeken | Boltenheide 5 | Vohwinkel | einfache Nummer | C |
| 380 | Gebr. Schmidt | [Gräfrather Str. 104-106??] | Vohwinkel | Bereich | B |
| 386 | Otto Schnicks | Dammstr. 16 | Elberfeld-West | einfache Nummer | C |
| 399 | Gebrüder Schutte | Reichsstraße 45 | Heckinghausen | einfache Nummer | C |
| 400 | Hubert Schwedt | Laurentiusstraße 33 | Elberfeld | einfache Nummer | C |
| 404 | Wilhelm Soennecken | Blombacherbach 12 | Heckinghausen | einfache Nummer | A |
| 406 | Wilhelm Sopp | Wupperstr. 35 | Elberfeld | einfache Nummer | C |
| 409 | H. Spelleken Nachf. KG | Rheinische Straße 14 | Oberbarmen | einfache Nummer | C |
| 412 | Paul Spieker | Schlössersgasse 4 | Elberfeld | einfache Nummer | C |
| 414 | Stadthallen Gaststätte [Inhaber: W. Evers] | Johannisberg | Elberfeld | ohne Hausnummer | D |
| 415 | Rudolf Staehely | Linderhauser Str. 32c | Oberbarmen | Nummer mit Zusatz | B |
| 416 | Wilhelm Steeger GmbH | Bahnstr. 47 | Vohwinkel | einfache Nummer | C |
| 418 | Otto von den Steinen | Kuchhausen 102 | Cronenberg | einfache Nummer | C |
| 423 | Stocko | Kirchhofstraße 52 a | Elberfeld-West | Nummer mit Zusatz | B |
| 427 | Svensson & Kuhler | Simonsstr. 1a-3a | Elberfeld-West | Nummer mit Zusatz | C |
| 431 | Maschinenfabrik Tienes | Löhrerlen 117 b | Oberbarmen | Nummer mit Zusatz | B |
| 433 | Lebrecht Töllner | Eich 1 | Cronenberg | einfache Nummer | C |
| 434 | Adolf Toenges | Vereinstraße 17a | Elberfeld | Nummer mit Zusatz | C |
| 438 | Vereinigte Glanzstoff-Fabriken A.G. | Auer-Schulstraße 14-16 | Elberfeld | Bereich | C |
| 439 | Vereinigung Wuppertaler Kohlenhändler | Kölner Str. 94 | Elberfeld | einfache Nummer | C |
| 441 | „Vauco“ Lederwarenfabrik Viehoff & Co. | Wichlinghauser Str. 47a | Oberbarmen | Nummer mit Zusatz | B |
| 442 | Visser & Co. | Funckstraße o. Nr. | Elberfeld-West | ohne Hausnummer | D |
| 443 | Friedrich Vohwinkel | Im Ostersiepen 1 | Elberfeld | einfache Nummer | C |
| 444 | Wilhelm Vonzumhoff | Gutenbergstr. 38 | Elberfeld-West | einfache Nummer | C |
| 447 | Vorwerk & Co. | Mühlenweg 23-25 | Barmen | Bereich | B |
| 449 | Wachs & Asmann | Westkotterstr. 46-48 | Oberbarmen | Bereich | C |
| 451 | Martin Wagner | Küllenhahner Str. 23 | Küllenhahn | einfache Nummer | C |
| 454 | Alfred Wahl | Kaiserstr. 195 | Vohwinkel | einfache Nummer | C |
| 457 | Karl Watermann | Schützenstr. 92 | Barmen | einfache Nummer | C |
| 459 | Fritz Weeren | Rauental 72 | Heckinghausen | einfache Nummer | A |
| 464 | Wiedenhoff & Wirtz | Kratzkopfstr. 32 | Ronsdorf | einfache Nummer | C |
| 467 | Emil Windgassen | Am Stadtbahnhof 6 | Ronsdorf | einfache Nummer | C |
| 472 | E.O. Wöhler & Co. | Warndstraße 4-12 | Barmen | Bereich | C |
| 475 | August Wülfing & Sohn | Breslauer Str. | Oberbarmen | ohne Hausnummer | D |
| 476 | Hermann Wülfing | Kaiserstraße 90 | Vohwinkel | einfache Nummer | C |
| 477 | Wuppermetall GmbH | Beckacker Schulstr. 35a | Oberbarmen | Nummer mit Zusatz | C |
| 478 | Hugo Wippermann | Beule 20 | Oberbarmen | einfache Nummer | C |

---

Erzeugt von `scripts/pruefe_verortung.py`. Die Datei ist eine Arbeitsgrundlage,
keine Datenquelle — Korrekturen gehören nach `data/korrekturen.json`.
