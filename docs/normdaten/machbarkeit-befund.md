# Normdaten: Befund des Machbarkeitstests

**Stand: 3.8.2026.** Geprüft wurde, ob sich für die 431 Unternehmen und für
die Rüstungsbegriffe verlässlich GND-Nummern, Wikidata-Items und
Wikipedia-Artikel erheben lassen. Gemessen, nicht geschätzt.

Die Rohdaten stehen daneben und werden bei jedem Lauf überschrieben:
`machbarkeit-unternehmen.md` (Stichprobe), `machbarkeit-begriffe.md`,
`machbarkeit-bestandsabgleich.md` (alle 431), `machbarkeit-pm20.md`. Dieser Bericht ist von Hand
geschrieben und bleibt.

## Das Ergebnis in einem Satz

**Die Rüstungsbegriffe lohnen sich, die Unternehmen nur in Maßen** — und
bei den Unternehmen entscheidet nicht die Normdatei über den Ertrag,
sondern das Verfahren. Drei Wege zusammen erreichen 126 von 431 Betrieben
(29 %); belastbar sind davon die 19, die mehr als eine Quelle stützt.

**Nachtrag 22.9.2026:** Inzwischen sind alle Vorschläge durchgesehen und
zwei weitere Wege hinzugekommen (Wikipedia-Kategorienbaum, Zweigwerke
auswärtiger Konzerne). **71 der 431 Betriebe haben eine geprüfte
Zuordnung**, 303 Urteile liegen vor; die Trefferquoten aller fünf Verfahren
stehen in 1f und 1g. Der folgende Satz beschreibt den Stand vom 4.8.2026.

Jeder Weg findet, was die anderen übersehen: PM20 ist kuratiert und
korrigiert Fehler der Namenssuche, reicht aber nur für zwölf Betriebe;
Wikidata findet neun weitere, die heute noch bekannt sind; der
GND-Bestandsabgleich hat die größte Reichweite und die meisten Fehler.

## 1. Unternehmen

### Drei Verfahren, gemessen

| Verfahren | Kandidat gefunden | Fehlkandidaten |
|---|---|---|
| Namenssuche, 30er-Stichprobe | 5 von 30 (17 %) | 6 von 30 (20 %) |
| Namenssuche mit Ortsfilter | — | nahe null |
| GND-Bestandsabgleich, alle 431 | 114 von 431 (26 %) | siehe Kollisionen |
| Pressearchiv PM20 | 12 von 431 (2,8 %) | nahe null, siehe 1b |
| Wikidata-Bestand mit Typfilter | 27 Kandidaten, siehe 1c | gering |
| **alle drei zusammen** | **126 von 431 (29 %)** | 19 mehrfach gestützt |

**Die naive Namenssuche ist das schlechteste Verfahren.** Sie findet wenig
und irrt oft. Beide Fehler haben dieselbe Ursache: Sie kennt nur den Namen.

- *Falsche Treffer:* „Adolf Franke" liefert vier gleichnamige Personen,
  „Jack Adams" einen Eishockeyspieler, „Heinrich Röttger" die Firma
  K. F. Koehler. **57 % der 431 Firmennamen sind reine Personennamen** —
  das ist die gefährlichste Gruppe, weil ein Treffer wie „Otto Henrich,
  deutscher Ingenieur und Unternehmer" plausibel aussieht und es nicht ist.
- *Falsche Nulltreffer:* „I.G. Farbenindustrie AG Werk Elberfeld" findet
  nichts, „I.G. Farbenindustrie" sofort GND 16005-2 und Wikidata Q156152.
  „Kromberg & Schubert" und „Joh. Hermann Picard" galten als nicht
  vorhanden und stehen beide in der GND.

### Der Ortsbezug ist das eigentliche Prüfmittel

Die GND führt **2.476 Körperschaften** mit Wuppertaler Ortsbezug
(`placeOfBusiness`, einschließlich Barmen, Elberfeld, Vohwinkel,
Cronenberg, Ronsdorf, Langerfeld, Beyenburg, Sonnborn). Das ist wenig
genug, um den Bestand vollständig zu holen und lokal abzugleichen, statt
sich auf ein Suchranking zu verlassen.

In der Stichprobe trennt der Ortsbezug sauber: **alle vier richtigen
Treffer** tragen Wuppertal, Barmen oder Vohwinkel im GND-Eintrag,
**alle vier falschen** München, Bremerhaven, London oder Polen. Mit
Ortsfilter liefert „Adolf Franke" null statt vier Fehlkandidaten.

Der Preis dafür steht im selben Test: **I.G. Farben fällt heraus**, weil
der GND-Eintrag Frankfurt am Main als Sitz führt. Der Ortsfilter findet
Betriebe, keine Konzerne mit auswärtigem Sitz. Für die elf Zweigwerke
auswärtiger Unternehmen im Datensatz braucht es einen zweiten Weg.

### Kollisionen: das zweite Prüfsignal, und die schlechte Nachricht

Von den 114 Unternehmen mit Kandidat sind **49 (43 %) von Kollisionen
betroffen** — 17 GND-Einträge werden mehreren Betrieben zugleich als bester
Treffer zugewiesen. Bei jeder Kollision ist höchstens einer richtig:

| GND-Eintrag | zugeordnet zu |
|---|---|
| Reinhart-Schmidt-GmbH | Nr. 85, 141, **380**, 381, **382**, 383 |
| Seiler-Papier | Nr. 72, 216, 229, 272, 303 |
| Körting Nachf. Wilhelm Steeger | Nr. 243, 256, 404, **416** |
| Ermen & Engels | Nr. 352, 362, 429, 472 |
| Firma Vorwerk & Sohn | Nr. **447**, **448**, 448.1 |

Zwei dieser Kollisionen treten sogar bei Ähnlichkeit 1,00 auf. Der Fall
Vorwerk ist der lehrreichste: Nr. 447 (Vorwerk & Co.) und Nr. 448
(Vorwerk & Sohn) sind **verschiedene Betriebe**, und der Abgleich wirft
beiden denselben Eintrag zu.

**Kollisionen sind automatisch erkennbar** und sollten in jedem künftigen
Lauf markiert werden. Sie ersetzen keine Prüfung, aber sie zeigen, wo
zuerst zu prüfen ist.

### Was realistisch übrig bleibt

Nach Abzug der Kollisionen und des Rauschens im unteren Ähnlichkeitsband
(0,72–0,79 ist fast durchweg Zufall: „Ferdinand Deisel" → Ferdinand
Weskott, „Carl Helsper" → Carl Schäfer — gemeinsamer Vorname, sonst
nichts) bleiben schätzungsweise **50 bis 70 belegbare Zuordnungen von
431, also 12 bis 16 %.** Das deckt sich mit der unabhängig gezogenen
30er-Stichprobe.

Die Verteilung der besten Ähnlichkeitswerte zeigt, wo der Aufwand liegt:

| Wert | Fälle | Einschätzung |
|---|---|---|
| 1,00 | 23 | überwiegend richtig, aber 2 Kollisionen darunter |
| 0,90–0,99 | 4 | prüfen |
| 0,80–0,89 | 54 | einzeln prüfen, gemischt |
| 0,72–0,79 | 33 | fast durchweg Rauschen |

**„Existiert heute" ist kein guter Prädiktor** — entgegen meiner Annahme
vor dem Test. In der Schicht der fortbestehenden Betriebe war die Quote
mit 1 von 10 am schlechtesten; bei den großen lag sie bei 4 von 10.
Fortbestand schützt nicht davor, dass ein Handwerksbetrieb nie in eine
Normdatei gelangt ist.

## 1b. Pressearchiv PM20 (ZBW) — klein, aber die beste Qualität

Nachgereicht am 3.8.2026 auf Anregung hin. PM20 ist das digitalisierte
HWWA-Pressearchiv: Firmendossiers aus Zeitungsausschnitten mit Schwerpunkt
auf der ersten Jahrhunderthälfte — also auf genau den Betrieben, bei denen
GND und Wikidata versagen.

**36 Firmenordner** mit Wuppertaler Ortsbezug, davon **12 im Datensatz**.
Das ist wenig (2,8 % von 431), und der Grund ist strukturell: Die
Wirtschaftspresse berichtete über Aktiengesellschaften, nicht über
Cronenberger Werkzeugschmieden. Was herausfällt — Barmenia, Schwebebahn,
Stadtwerke, Kaiserhof Hotel — fehlt zu Recht, denn Speer verzeichnet
Rüstungsbetriebe.

### Warum es trotzdem die beste Quelle ist

PM20 ist **redaktionell kuratiert**: Ein Mensch hat die Firma identifiziert
und ihr die Normdaten zugewiesen. Das ist etwas anderes als
Zeichenkettenähnlichkeit, und der Vergleich mit dem GND-Bestandsabgleich
zeigt den Unterschied:

| | Fälle | |
|---|---|---|
| identisch bestätigt | 7 | zwei unabhängige Verfahren, dieselbe GND-Nummer |
| abweichend | 3 | **in allen drei Fällen ist PM20 im Recht** |
| neu gefunden | 2 | Nr. 81 und Nr. 463 hatte der GND-Abgleich nicht |

Die drei Abweichungen sind die eigentliche Lehre:

- **Nr. 438 Vereinigte Glanzstoff-Fabriken** — der Namensabgleich fand
  „Glanzstoff AG. Werk Kelsterbach" (GND 17923-1), also ein **anderes
  Werk**. PM20: GND 2025463-5. Richtig.
- **Nr. 447 Vorwerk & Co.** — der Namensabgleich fand „Firma Vorwerk &
  Sohn" (GND 5560357-9), also den **Schwesterbetrieb Nr. 448**. PM20:
  GND 2038800-7 / Q449852. Richtig.
- **Nr. 74 J. P. Bemberg** — Namensabgleich GND 116503-3, PM20
  GND 4601845-1. Die GND führt vier Bemberg-Einträge; hier ist eine
  Fachentscheidung nötig, und PM20 ist die kuratierte Stimme.

**Und PM20 liefert GND und Wikidata zugleich** — es ist der Brückenkopf zu
beiden Normdateien, nicht eine dritte Liste daneben.

### Die zwölf Zuordnungen

Praktisch fertig, nur noch gegenzulesen. GND und Wikidata-Item stehen in
`machbarkeit-pm20.md`; die Dokumentzahl ist die Zahl frei zugänglicher
Presseausschnitte.

| Nr. | Unternehmen | GND | Wikidata | Dok. |
|---|---|---|---|---|
| 65 | Barmer Maschinenfabrik | 112955-7 | Q107138754 | 17 |
| 74 | J. P. Bemberg | 4601845-1 | Q49692964 | **265** |
| 81 | AGEB | — | Q107176924 | 1 |
| 126 | Elberfelder Papierfabrik | 1069423416 | Q107102985 | 23 |
| 127 | Elberfelder Textilwerke | 5027954-3 | Q107088135 | 35 |
| 192 | Hindrichs-Auffermann | 211761-7 | Q63400222 | **105** |
| 348 | Kabelwerk Reinshagen | 4753112-5 | — | ? |
| 353 | Rhein. Möbelstoffweberei | 1073290441 | Q104554138 | 57 |
| 354 | Rheinische Textilfabriken | 5022966-7 | Q47359073 | 55 |
| 438 | Vereinigte Glanzstoff-Fabriken | 2025463-5 | Q875320 | **354** |
| 447 | Vorwerk & Co. | 2038800-7 | Q449852 | ? |
| 463 | Wicküler-Küpper-Brauerei | 211475-6 | Q2567692 | 78 |

**Zwei Zuordnungen des Skripts sind von Hand zu berichtigen** — es ordnet
„Vorwerk & Co" der Nr. 448 statt 447 zu (die beiden Vorwerk-Namen sind
einander ähnlicher als dem jeweils richtigen Partner), und „Schlieper &
Baum AG" ist **nicht** Nr. 373 „Schlieper & Laag GmbH". Dieselbe
Kollisionsfalle wie beim GND-Abgleich, nur in kleinerem Maßstab.

### Nebenfund: die Dossiers könnten der Verortung helfen

**Sechs der zwölf sind nicht hausgenau verortet**, und Nr. 81 (AGEB,
„Hirtenstr. 1–3") hat überhaupt keine Koordinate — sie ist einer der neun
Klasse-E-Fälle aus `../verortung-weiterarbeit.md`, deren Straßenname im
heutigen Bestand fehlt. Presseausschnitte nennen Firmenadressen häufig
(Briefköpfe, Geschäftsberichte, Anzeigen). Bei Bemberg, Glanzstoff und
Hindrichs-Auffermann liegen zusammen über 700 frei zugängliche Dokumente.

Das ist keine Zusage, dass sich damit etwas verorten lässt — geprüft ist
es nicht. Aber es ist der erste Hinweis seit dem 3.8.2026, dass die
zurückgestellte Verortungsarbeit eine Quelle hätte, die nicht im
Stadtarchiv liegt und keine Anfrage braucht.

### Zugang: der Schutz wird nicht umgangen

Die Webseiten unter `pm20.zbw.eu` sind mit einem Proof-of-Work-Verfahren
(Anubis) gegen Scraper geschützt. Dieser Schutz ist zu respektieren.
Abgefragt wird deshalb ausschließlich der **SPARQL-Endpunkt**
`https://zbw.eu/beta/sparql/pm20/query`, der genau für maschinelle Abfragen
bereitsteht. Einzelne Dossiers lassen sich im Browser ansehen, wo die
Prüfung normal durchläuft.

## 1c. Wikidata als Bestand — zwei Filter entscheiden alles

Nachgeholt am 4.8.2026; im ersten Durchgang war Wikidata nur per
Namenssuche geprüft. Der Bestandsabgleich braucht zwei Filter, und ohne
sie ist er wertlos.

**Erstens der Ortsbezug — mit den Vorgängerstädten.** Wuppertal entstand
1929. Ein 1908 gegründeter Betrieb hat in Wikidata *Barmen* (Q153974) oder
*Elberfeld* (Q702259) als Sitz, nicht Wuppertal (Q2107). Wer nur auf
Wuppertal filtert, verliert genau die historischen Betriebe.

> **Fehler im ersten Anlauf, festgehalten als Warnung:** Ich hatte Q1719
> als Wuppertal angenommen. Q1719 ist **Balanga auf den Philippinen**. Die
> Abfrage lieferte 19 Treffer, sah plausibel aus und war vollständig
> wertlos. Ein geratener Bezeichner ist in einer SPARQL-Abfrage nicht
> erkennbar falsch — er liefert einfach ein anderes Ergebnis.

**Zweitens der Entitätstyp.** Der Wuppertal-Bestand umfasst 5.171
Entitäten ohne Personen, davon 2.154 Innerortsstraßen, 540 Wohngebäude und
207 Stolpersteine. Nur **249 haben einen Typ, der ein Betrieb sein kann**.
Ohne diesen Filter ordnet der Namensabgleich zu:

| Unternehmen | falscher Treffer | Typ |
|---|---|---|
| Gebr. Kehrenberg | Ehrenberg | Ortsteil |
| Friedrich Vohwinkel | Vohwinkel | Stadtbezirk |
| Gebr. Dörner | Dörner Brücke | Stahlbrücke |
| Kolk & Co. | Alte lutherische Kirche am Kolk | Kirchengebäude |
| Gutehoffnungshütte | Lüntenbeck | Fließgewässer |

Mit Typfilter fallen 82 Kandidaten auf 27 — und das Rauschen fast
vollständig weg.

**Neun Betriebe findet nur Wikidata**, weder GND-Abgleich noch PM20:
Knipex (Q427800), Tornax (Q314437), Picard (Q1408416), G. H. Sachsenröder
(Q1450499), C. Blumhardt Fahrzeugwerke (Q1022426), Brauerei Carl Bremme
(Q900144), Gebr. Becker (Q15811438), August Jung & Söhne (Q127596759),
Wagener & Simon (Q2539057). Das Muster: Betriebe, die heute noch bekannt
sind, aber zu klein für ein Firmendossier im Pressearchiv waren.

## 1d. Die drei Wege zusammengeführt

| | Unternehmen |
|---|---|
| mindestens ein Kandidat | **126 von 431 (29 %)** |
| nur GND-Bestandsabgleich | 97 |
| nur Wikidata | 9 |
| nur PM20 | 1 |
| GND + Wikidata | 7 |
| GND + PM20 | 4 |
| PM20 + Wikidata | 2 |
| **alle drei** | **6** |

**Die 19 mehrfach gestützten Fälle sind der belastbare Kern** — Nr. 65, 69,
70, 74, 81, 126, 127, 171, 192, 326, 348, 353, 354, 435, 438, 447, 448,
448.1 und 463.

Aber auch das ist kein Automatismus, und zwei Gegenbeispiele stehen schon
in der Liste:

- **Nr. 171 Halstenbach & Co.** wird von GND und Wikidata gestützt — der
  Wikidata-Treffer ist die *Villa Halstenbach*, ein Gebäude.
- **Nr. 69 Karl Becker** und **Nr. 70 Gebr. Becker** sind beide
  doppelt gestützt und stehen in unmittelbarer Verwechslungsgefahr
  zueinander.

Zwei Quellen, die denselben Namen falsch auflösen, bestätigen einander
nicht — sie machen denselben Fehler zweimal. Die Mehrfachstützung sagt,
wo zuerst zu prüfen ist, nicht was richtig ist.

## 1e. Ein Normdatensatz kann auf fehlende Standorte hinweisen

Der aufschlussreichste Einzelfund des ganzen Tests. Für Nr. 192
Hindrichs-Auffermann nennen die Quellen **zwei verschiedene GND-Nummern**,
und beide sind richtig:

| GND | Bezeichnung | Ort |
|---|---|---|
| 211761-7 (via PM20) | Hindrichs-Auffermann-Aktiengesellschaft | Wuppertal |
| 1303992-1 (via Wikidata) | Munitionsmaterial- und Metallwerke Hindrichs-Auffermann | **Barmen; Beyenburg** |

Es sind zwei Zustände desselben Unternehmens. Für den Zeitraum des
Projekts spricht einiges für 1303992-1: Speer verzeichnet für Nr. 192 die
Fertigung des „Geräts SD 2" — Splitterbomben, also Munitionsmaterial.

**Und der Datensatz kennt für Nr. 192 nur einen Standort** (Heckinghauser
Str. 118–120, Barmen). Die GND führt Barmen **und Beyenburg**. Ob dort im
fraglichen Zeitraum produziert wurde, ist damit nicht belegt — der
GND-Eintrag datiert seine Orte nicht. Aber es ist ein prüfenswerter
Hinweis auf einen möglicherweise fehlenden zweiten Standort, und er kam
aus einer Quelle, die für etwas ganz anderes abgefragt wurde.

## 1f. Die Durchsicht — 21.9.2026

Alles oberhalb dieser Zeile ist Schätzung aus der Anschauung. Hier steht die
Messung: Am 21.9.2026 sind **alle 209 Vorschläge von Hand beurteilt** worden,
im Prüfbogen (`scripts/normdaten_pruefbogen.py` → `pruefbogen.html`), mit vier
Werten — *ist dieses Unternehmen*, *gehört zu / Nachfolger von*, *nein*,
*unklar*. Die Urteile stehen in `urteile.json` und werden beim Neubauen des
Bogens wieder eingelesen.

| | Betriebe |
|---|---|
| mit geprüfter Zuordnung | **57** |
| geprüft und verworfen (alle Kandidaten „nein") | 63 |
| nur „unklar" übrig | 6 |

57 von 431 sind **13,2 %**. Die Empfehlung oben hatte „50 bis 70 Zuordnungen"
und „etwa jeden siebten Betrieb" veranschlagt; das hat gehalten. Von den 57
stützen sich 44 auf eine Quelle, 8 auf zwei, 5 auf alle drei.

### Die Trefferquoten, jetzt beziffert

| Verfahren | richtig | Vorschläge | Quote |
|---|---|---|---|
| PM20 | 11 | 14 | **78 %** |
| Wikidata | 17 | 27 | **62 %** |
| GND-Bestandsabgleich | 49 | 168 | **29 %** |

Die Rangfolge ist die vermutete, und die Zahlen sagen mehr als die Rangfolge:
Der GND-Abgleich liefert 168 der 303 Vorschläge und 48 der 108 Treffer — die
größte Reichweite und zugleich 112 Fehlvorschläge. Wer nur auf die Quote
sieht, unterschätzt ihn; wer nur auf die Reichweite sieht, überschätzt ihn.

**Die beiden „nein" bei PM20 sind keine Fehler des Archivs.** Beide hängen an
Nr. 448: Der Namensabgleich hatte den Ordner „Vorwerk & Co" der 448 statt der
447 zugewiesen — genau die Berichtigung, die in 1b angekündigt war. Das
Pressearchiv hatte recht, das Skript nicht. Rechnet man das heraus, irrt PM20
in keinem einzigen Fall.

### Die 19 Prüfsteine haben getan, wozu sie da waren

17 der 19 mehrfach gestützten Fälle haben eine Zuordnung bekommen.
Durchgefallen sind **Nr. 69 Karl Becker** und **Nr. 171 Halstenbach & Co.** —
punktgenau die beiden, die in 1d als Gegenbeispiele benannt waren (die *Villa*
Halstenbach; die Verwechslung Karl Becker / Gebr. Becker). Dass zwei Quellen,
die denselben Namen falsch auflösen, einander nicht bestätigen, ist damit
keine Warnung mehr, sondern ein Befund.

Auch die Vorwerk-Falle ist aufgelöst: Nr. 447 trägt GND 2038800-7 und Q449852,
Nr. 448 die GND 5560357-9.

### Drei geteilte Normdatensätze — und warum keiner davon ein Fehler ist

| Datensatz | zugeordnet zu | |
|---|---|---|
| GND 5560357-9 | Nr. 448 und 448.1 | Zweigbetrieb, im Datensatz zwei Nummern |
| Wikidata Q1450499 | Nr. 363 und 363a | dasselbe |
| GND 1300395915 | Nr. 416 und 243 | **Fusionsdatensatz** |

Der dritte Fall ist der interessante. Der Eintrag heißt „Körting Nachfolger
Wilhelm Steeger GmbH & Co. KG": Nr. 243 Wilhelm Körting und Nr. 416 Wilhelm
Steeger sind fusioniert, und die GND führt bislang nur diesen einen
Datensatz für beide (geprüft 21.9.2026). Das ist der Grund, warum der Bogen
*ist dieses Unternehmen* von *gehört zu / Nachfolger von* trennt — genau
hierfür. Wer die Unterscheidung schärfen will, hat in Nr. 243 den Fall dafür.

Eine vierte Doppelvergabe war ein echter Fehler und ist berichtigt: GND
16021893-7 gehört zu **Nr. 91 Bocklenberg & Motte** (der Eintrag führt
„BOMORO" als Variante), nicht zu Nr. 92.

### Was offen bleibt

- **9 Urteile „unklar"** bei 8 Betrieben.
- **Nr. 447 hat keine PM20-Zuordnung**, obwohl der Ordner `co/069772` ihr
  gehört — der Bogen konnte ihn nicht anbieten, weil der Abgleich ihn an
  Nr. 448 gehängt hatte. Ein richtiger Treffer, der außerhalb der Liste liegt:
  **Der Prüfbogen kann nur beurteilen, was vorgeschlagen wurde.** Wie viele
  solche Fälle es gibt, ist ungeprüft.
- **GND 1037080513 „Bocklenberg Söhne"** steht bei Nr. 91 und Nr. 92 auf
  „unklar". Der Name spricht für Nr. 92 Carl Bocklenberg & Söhne; geprüft ist
  es nicht.
- **Nr. 355 Rheinisch-Westfälische Kalkwerke** und **Nr. 312 H. Oetelshofen**
  haben je zwei GND-Nummern bekommen — das Muster aus 1e. Ob dahinter wie bei
  Nr. 192 ein Hinweis auf einen zweiten Standort steckt, wäre zu prüfen.
- **Nur vier der 209 Urteile tragen eine Begründung.** Für eine
  veröffentlichte Zuordnung ist das zu wenig: Ohne das „woran erkannt" ist in
  einem halben Jahr nicht mehr zu unterscheiden, was belegt und was für
  plausibel gehalten wurde. Die Urteile selbst stammen aus der Anschauung von
  Name, Ort, Typ und Branche, nur in einzelnen Fällen aus einer Nachprüfung.

## 1g. Der zweite Durchgang — 22.9.2026

Der erste Durchgang hatte eine Zahl geliefert, die das Falsche maß. Auf die
Frage, wie viele Unternehmen einen Wikipedia-Artikel haben, lautete die
Antwort „acht" — gezählt worden waren aber nur die Wikidata-Items, die den
Ortsfilter, den Typfilter und die Durchsicht überstanden hatten. **Wikipedia
war nie eigens geprüft worden.** Es stand von Anfang an in der
Aufgabenstellung, aber gebaut waren nur drei Skripte; jede Wikipedia-Angabe
fiel bis dahin nebenbei ab.

Zugleich kam die Blindstelle wieder hoch, die Abschnitt 1 selbst benannt
hatte: Der Ortsfilter findet Betriebe, keine Konzerne mit auswärtigem Sitz.
I.G. Farbenindustrie AG Werk Elberfeld, Fried. Krupp und die
Gutehoffnungshütte haben alle einen Wikipedia-Artikel, eine GND-Nummer und
ein Wikidata-Item — und keiner der drei war je im Prüfbogen aufgetaucht.

Beides ist am 22.9.2026 nachgeholt worden.

### Zwei neue Wege

**Wikipedia als Bestand** (`scripts/normdaten_wikipedia.py`). Dieselbe
Methode wie bei GND und Wikidata — Bestand ziehen statt suchen —, nur hat
Wikipedia dafür etwas Besseres als einen Ortsfilter: Kategorien. Der Baum
unter „Kategorie:Unternehmen (Wuppertal)" umfasst 15 Kategorien mit 163
Artikeln, davon 146 mit Wikidata-Item und 23 mit GND-Nummer. Ein Treffer
bringt also alle drei Nachweise mit, wie PM20.

**Zweigwerke per Namenssuche** (`scripts/normdaten_zweigwerke.py`). Für 14
namentlich bekannte Fälle wurde in GND und Wikidata nach dem **Mutterhaus**
gesucht, ohne Ortsbezug. Dass die Namenssuche das schlechteste Verfahren
ist, spielt bei einer geschlossenen Liste keine Rolle: Jeder Vorschlag wird
ohnehin von Hand angesehen. Die Liste steht im Skript, nicht im Code
verborgen, und erhebt keinen Anspruch auf Vollständigkeit — ein Zweigwerk,
dessen Datensatzname das Mutterhaus nicht nennt, ist über den Namen nicht
zu finden.

### Alle fünf Verfahren, gemessen

94 neue Vorschläge kamen dazu, alle beurteilt; zusammen mit dem ersten
Durchgang sind es **303 Urteile über 146 Betriebe**.

| Verfahren | richtig | Vorschläge | Quote |
|---|---|---|---|
| PM20 | 11 | 14 | **78 %** |
| Wikidata (Bestand) | 17 | 27 | **62 %** |
| Wikipedia (Kategorienbaum) | 22 | 40 | **55 %** |
| GND (Bestand) | 48 | 168 | **28 %** |
| Zweigwerke (Namenssuche) | 10 | 54 | **18 %** |
| **zusammen** | **108** | **303** | **35 %** |

Die Rangfolge bestätigt, was Abschnitt 1 vermutet hatte, und ergänzt sie um
zwei Beobachtungen. **Wikipedia liegt zwischen Wikidata und GND** — die
redaktionelle Kategorienpflege ist ein besseres Prüfsignal als ein
Ortsfeld, aber ein schlechteres als ein kuratiertes Firmendossier. Und
**die Namenssuche bestätigt mit 18 % ihren Ruf als schlechtestes
Verfahren**; sie war hier trotzdem richtig, weil sie auf eine geschlossene
Liste angewandt wurde, bei der der Ausschuss Sekunden kostet.

### Was die neuen Wege erschlossen haben

**70 von 431 Betrieben (16,2 %)** haben einen geprüften Nachweis, nach 57
(13,2 %) im ersten Durchgang. Die 14 dazugekommenen verdanken ihn
fast alle einem der beiden neuen Wege:

- **Acht allein über Wikipedia** — Nr. 166 Ferd. von Hagen Söhne & Koch,
  173 Happich, 202 Hotel zur Post, **255 Kromberg & Schubert**, 300 Moog,
  340 und 341 Quante, 373 Schlieper & Laag.
- **Sechs allein über die Zweigwerksuche** — Nr. 68 I.G. Farben Werk
  Elberfeld, 122 Dyckerhoff & Widmann, 162 und 163 Gutehoffnungshütte,
  257 Fried. Krupp, 436 Trierer Walzwerk.

Nr. 255 ist der Prüfstein dieses Durchgangs. Abschnitt 4 führt Kromberg &
Schubert als bekannten Ausfall: „steht in der GND und fällt im
Bestandsabgleich trotzdem durch, weil ‚(Kroschu)' im Datensatznamen und
‚Kabelwerke' im GND-Namen die Zeichenfolge auseinandertreiben". Über den
Kategorienbaum war er sofort da. Der Fehler lag nie an der Normdatei,
sondern am Zugriffsweg — und ein vierter Weg findet, was drei übersehen.

### Eine neue Urteilsart wird zum ersten Mal gebraucht

Der Prüfbogen kennt seit dem ersten Durchgang den Wert *gehört zu /
Nachfolger von*; im ersten Durchgang wurde er **kein einziges Mal**
vergeben. Mit den Zweigwerken ist er unvermeidlich geworden: **elf Urteile
bei sieben Betrieben.**

| Nr. | Betrieb | gehört zu |
|---|---|---|
| 68 | I.G. Farbenindustrie AG Werk Elberfeld | I.G. Farbenindustrie AG |
| 162 | GHH, Dolomit-Steinbruch Lüntenbeck | Gutehoffnungshütte |
| 163 | GHH Oberhausen | Gutehoffnungshütte |
| 257 | Fried. Krupp, Zweigwerk „Dreherei Wuppertal" | Fried. Krupp |
| 355 | Rheinisch-Westfälische Kalkwerke | RWK Kalk AG (heutiger Nachfolger) |
| 436 | Trierer Walzwerk AG | Trierer Walzwerk |
| 463 | Wicküler Küpper Brauerei | Küpper-Brauerei |

Dass diese Unterscheidung nicht bloß Feinsinn ist, deckt sich mit der
Praxis der einschlägigen Regelwerke (recherchiert am 22.9.2026):

- **GND-Übergangsregel K11** führt untergeordnete Körperschaften als eigene
  Datensätze in selbstständiger Namensform und verknüpft sie nach oben
  (`510 $4adue`), den Ort getrennt davon (`551 $4orta`). Benannte Werke
  bekommen einen eigenen Eintrag — „Gutehoffnungshütte Sterkrade" steht als
  GND 2012656-6 neben dem Konzern.
- **ICA Records in Contexts** trennt `Agent` und `Place` und kennt
  `isOrWasSubordinateTo` und `wasMergedInto` als eigene Relationen.
- **Wikidata** ordnet nach Rechtsstatus: `P749` für den Konzern, `P199`
  ausdrücklich für Einheiten ohne eigene Rechtspersönlichkeit.

Der gemeinsame Nenner: Die Körperschaft ist nicht der Ort, und ein eigener
Datensatz entsteht dort, wo die Einheit einen eigenen Namen trägt. Ein
Dolomit-Steinbruch hat keinen. Nr. 162 *ist* deshalb nicht die
Gutehoffnungshütte, sie *gehört zu* ihr.

**Nr. 68 I.G. Farbenindustrie AG Werk Elberfeld** ist am 22.9.2026 aus
demselben Grund von *ist* auf *gehört zu* berichtigt worden. GND 16005-2
ist der Konzern mit Sitz in Frankfurt am Main; einen eigenen Datensatz für
das Werk Elberfeld gibt es nicht. Der Fall ist der Anlass gewesen, die
Regelwerke überhaupt nachzuschlagen — im Urteil stand von Anfang an die
Notiz „allerdings das Zweigwerk in Elberfeld", nur trug der gewählte Wert
sie nicht.

### In der Karte

`scripts/normdaten_uebernehmen.py` destilliert die Urteile zu
`data/normdaten.json` — je Unternehmen die bestätigten Nachweise samt
Beziehungsart, ohne den Ausschuss. Die Seitenleiste zeigt sie als dritten
aufklappbaren Block neben „Zwangsarbeiter" und „Rüstungsproduktion", nur
vorhanden, wenn es etwas gibt: Eine fehlende Zählung ist eine Aussage über
die Quelle, ein fehlender GND-Eintrag nur eine über die Normdatei.

Zeilen mit *gehört zu* stehen eingerückt, mit Strich an der Seite und dem
Wort im Klartext — Farbe allein trägt die Unterscheidung nicht. Die 21
Wikipedia-Artikel stehen außerdem als Schriftzug unten rechts im Eintrag,
der einzige der vier Nachweise, der sich an einen Leser richtet statt an
ein anderes Projekt. Führt der Artikel nur zum Konzern, sagt die
Beschriftung das.

`data/normdaten.json` wird bewusst **nicht** in `unternehmen.geojson`
eingebaut, sondern von `map-app.js` eigens geladen. Die Zuordnungen sind
ein eigener Arbeitsstand mit eigener Prüfgeschichte; die versionierten
Bau-Ergebnisse bleiben davon unberührt, solange nichts veröffentlicht ist.

### Was offen bleibt

- **14 Urteile „unklar"**, bei sieben Betrieben ist es das einzige Ergebnis.
- **Begründungen tragen nur acht der Urteile — und mehr braucht es nicht.**
  Anders als beim Verortungshinweis, dem man das Zustandekommen nicht
  ansieht, steht ein Normdatensatz hinter einem Link: Name, Ort und Typ
  sind dort nachzulesen, die Zuordnung ist selbsttragend. Von den
  bestätigten Zuordnungen beruhen elf auf einem kuratierten PM20-Dossier,
  elf sind Zweigwerke (dort steht die Beziehung im Urteilswert selbst),
  die übrigen auf Namensgleichheit plus Wuppertaler Ortsbezug — bei
  Wikidata, Wikipedia und PM20 liegt der schon in der Konstruktion des
  Bestands, bei GND im Datensatzfeld.

  Eine Begründung lohnt allein dort, wo beide Namen **kein einziges Wort
  teilen**; ein Durchlauf fand drei solche Fälle, und die Durchsicht am
  22.9.2026 hat alle drei aufgelöst:

  | Nr. | Datensatz | Normdatensatz | |
  |---|---|---|---|
  | 251 | Kremer, Sondermann & Cie. | KRESO | Kürzel der Firma, richtig |
  | 355 | Rheinisch-Westfälische Kalkwerke | RWK Kalk AG | heutiger Nachfolger → *gehört zu* |
  | 229 | Wilhelm Keil | Seiler-Papier | **falsch**, jetzt verworfen |

  Nr. 229 ist der einzige Fehler, den die Durchsicht selbst produziert hat:
  Der Treffer entstand über die Variante „Wilhelm Seiler GmbH", also über
  den Vornamen. Dass er auffiel, verdankt sich nicht einer Begründung,
  sondern dem Fehlen einer — die Suche nach unbegründbaren Zuordnungen war
  das Prüfmittel.
- **Der Kategorienbaum findet nur, was nach Wuppertal einsortiert ist.** Ein
  Artikel über einen Wuppertaler Betrieb, der allein unter „Ehemaliges
  Unternehmen (Nordrhein-Westfalen)" steht, fehlt darin — dieselbe Art
  Lücke wie beim GND-Ortsbezug, nur an anderer Stelle. Wie viele Artikel es
  gibt, wissen wir weiterhin nicht; wir wissen, wie viele der Baum bringt.
- **Die Zweigwerkliste ist handgeschrieben.** Zwei der 14 Betriebe
  (Nr. 75 Bemetall-Werk, Nr. 184 Heson Werk) ergaben überhaupt keinen
  Kandidaten.

## 2. Rüstungsbegriffe

Hier ist das Bild ein anderes, und es zerfällt scharf in drei Klassen.

### Programme und Aktionen: unter ihrem Quellennamen nicht auffindbar

Von neun geprüften Programmnamen aus den Quellentexten: **null Treffer**,
weder GND noch Wikidata. „Brandt-Programm" liefert einen Heinrich Brandt.

Sie sind aber sehr wohl beschrieben — **unter einem anderen Lemma**:

| in der Quelle | erfasst als |
|---|---|
| Geilenberg-Programm | **Mineralölsicherungsplan**, Wikidata Q1370059 |
| Jägerprogramm | **Jägerstab** (das Leitungsorgan), Wikidata Q1714907 |

Beide haben einen deutschen Wikipedia-Artikel und **keine GND-Nummer**.
Diese Übersetzung leistet keine Suche — sie ist eine fachliche
Entscheidung. Bei rund 18 Programmen ist das von Hand zu machen, aber es
ist Sacharbeit, keine Datenverarbeitung.

### Waffen und Geräte: gute Abdeckung

9 von 11 auflösbar. Drei davon mit **wechselseitiger Bestätigung** —
das Wikidata-Item nennt dieselbe GND-Nummer, die die GND-Suche geliefert
hat (P227). Das ist der stärkste Beleg, den dieses Verfahren hergibt.

| Begriff | GND | Wikidata | wechselseitig |
|---|---|---|---|
| Me 262 | 4169172-6 | Q140254 | ✓ |
| Bf 109 | 4139345-4 | Q155639 | ✓ |
| 8,8-cm-Flak | 4614122-4 | Q154137 | ✓ |
| Ju 88 | 4162784-2 | Q155661 | — |
| Tiger | — | Q151221 | — |
| Faustpatrone | — | Q321619 | — |
| Granatwerfer 34 | — | Q614873 | — |
| Volkssturmgewehr | — | Q701249 | — |
| V-Waffe | 4064090-5 | Q650153 | — |

Die zwei Ausfälle lagen an meiner Suchformulierung, nicht an der
Normdatei: „Panzerkampfwagen Panther" heißt dort *Panzerkampfwagen V
Panther*.

Zwei Fallen bleiben: **Faustpatrone und Panzerfaust** sind verschiedene
Waffen und werden beide angeboten; beim **Volkssturmgewehr** gibt es zwei
Items (die Waffe VG 1-5 und der Sammelbegriff).

### Organisationen und Auftraggeber: beste Abdeckung, aber Auswahl nötig

9 von 9 auflösbar, fünf mit wechselseitiger Bestätigung: Organisation Todt
(GND 5097779-9 / Q155433), Reichsluftfahrtministerium (1015834-0 /
Q698081), Oberkommando des Heeres (4222755-0 / Q155870), Deutsche
Reichsbahn (2008004-9 / Q698082), Heereswaffenamt (2045493-4 / Q655369).

Praktisch immer ist zwischen mehreren Einträgen zu wählen: Das RLM steht
viermal in der GND (Ministerium, Werkstoffabteilung, Forschungsamt,
Technisches Amt), das DRK ebenfalls mehrfach.

**Ein Warnfall:** Die wechselseitige Bestätigung ist nicht hinreichend.
Wikidata Q698082 (Reichsbahn 1920–1945) **und** Q700563 (Reichsbahn der
DDR 1945–1993) tragen beide die GND 2008004-9. Wer nur auf die
Übereinstimmung schaut, verknüpft womöglich die falsche Epoche.

## 3. Empfehlung

**Zuerst die Rüstungsbegriffe, dann erst die Unternehmen.** Der Ertrag pro
Arbeitsstunde ist um ein Vielfaches höher:

- Ein Begriff wird **einmal** zugeordnet und erscheint bei **vielen**
  Betrieben — „Organisation Todt", „8,8-cm-Flak", „Me 262" kommen in den
  117 Rüstungsgütertexten mehrfach vor.
- Ein Unternehmen wird einmal zugeordnet und erscheint einmal.
- Die Quote ist etwa 70 % gegen 15 %.

Der vorgelagerte Schritt bleibt derselbe wie vor dem Test: **ein
kontrolliertes Vokabular**. Die Freitexte enthalten 25 Schreibweisen für
etwa 18 Programme, dazu OCR-Fehler („FührerNotprogramm",
„DringlichkeitsProgramm", „Generator-Law" für Lkw). Ohne diese Liste gibt
es nichts, woran eine ID hängen könnte.

**Für die Unternehmen** empfehle ich, in dieser Reihenfolge vorzugehen:

1. **PM20 zuerst.** Zwölf Betriebe, kuratiert, mit GND und Wikidata in
   einem Zug — und mit Presseausschnitten als eigenem Ertrag. Das ist eine
   Stunde Gegenlesen für zwölf sichere Zuordnungen, darunter die größten
   Betriebe des Datensatzes.
2. **Danach der GND-Bestandsabgleich** für den Rest, mit Ortsbezug und
   Kollisionsmarkierung als Vorfilter. Erwartung: 50 bis 70 Zuordnungen
   insgesamt, jede von Hand geprüft, ein bis zwei Arbeitstage Durchsicht
   für einen Ertrag, der etwa jeden siebten Betrieb erreicht.

Die Reihenfolge ist nicht beliebig: Die zwölf PM20-Fälle sind zugleich
**Prüfsteine für den zweiten Schritt**. Sieben davon hat der
Bestandsabgleich richtig, drei falsch, zwei gar nicht gefunden — wer sie
zuerst festmacht, kennt die Fehlerarten des Verfahrens, bevor er die
übrigen 419 durchsieht.

Ob sich Schritt 2 lohnt, ist eine Frage an das Projekt, keine an die
Daten.

**Was in beiden Fällen gilt:** Die Zuordnung muss zwei Beziehungen
unterscheiden können — *ist dieses Unternehmen* und *gehört zu / ist
Nachfolger von*. I.G. Farben Werk Elberfeld ist nicht der Konzern
I.G. Farben, und Vorwerk & Co. ist nicht die Vorwerk SE. Ohne diese
Unterscheidung entstehen Verknüpfungen, die wie Belege aussehen und keine
sind — dasselbe Problem wie bei der Methode „Nachkriegsadressbuch über den
Firmennamen" in `../verortung-weiterarbeit.md`.

## 4. Grenzen dieses Tests

- Die Ähnlichkeitsschwelle (0,72) und die Namensnormalisierung sind nicht
  optimiert. Kromberg & Schubert steht in der GND und fällt im
  Bestandsabgleich trotzdem durch, weil „(Kroschu)" im Datensatznamen und
  „Kabelwerke" im GND-Namen die Zeichenfolge auseinandertreiben.
- Der GND-Bestand ist über `placeOfBusiness` gezogen. Körperschaften ohne
  Ortsangabe fehlen darin vollständig; wie viele das sind, ist ungeprüft.
- Die Bewertung „richtig/falsch" ist jetzt gefällt (1f), beruht aber
  weiterhin überwiegend auf Name, Ort und Branche, nicht auf einer
  Quellenprüfung am Einzelfall.
