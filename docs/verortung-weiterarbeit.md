# Genauere Verortung: was noch ginge, und woher

**Stand: 3.8.2026. Zurückgestellt** — eine hausnummerngenaue Nachverortung ist
derzeit nicht zu leisten. Dieses Papier hält fest, was dafür geklärt wurde,
damit die Arbeit später nicht bei null anfängt.

Ergänzt `verortung-pruefliste.md`. Jene Datei wird von
`scripts/pruefe_verortung.py` erzeugt und bei jedem Lauf überschrieben; sie
zählt und klassifiziert. Hier steht, was daraus folgt — von Hand geschrieben
und nicht überschrieben.

## Ausgangslage

Von 445 Standorten (431 Unternehmen) sind

| Stufe | Standorte |
|---|---:|
| `hausgenau` | 279 |
| `strassengenau` | 145 |
| `ungefaehr` | 2 |
| `ohne` Koordinate | 19 |

Die 166 unsicheren zerfallen nach `verortung-pruefliste.md` in fünf Klassen
(A 2, B 34, C 103, D 6, E 9 — Zählung vom Stand vor den Nachträgen des
1.8.2026, die Größenordnungen gelten weiter).

## Wer wofür zuständig wäre

Der entscheidende Unterschied verläuft nicht zwischen „Straße" und
„Hausnummer", sondern zwischen zwei Arten von Frage:

**Namensfragen** — wie heißt diese Straße heute? Ein Dokument beantwortet sie
vollständig. Das kann das Stadtarchiv.

**Lagefragen** — wo lag Hausnummer 37, die es heute nicht mehr gibt? Ein Beleg,
*dass* es die Nummer gab, hilft dafür nicht. Nötig ist eine Karte mit
Hausnummern oder Katasterunterlagen. Dafür verweist das Stadtarchiv auf seiner
Website auf das Geodatenzentrum.

Klasse C — 103 Fälle, Straße vorhanden, Hausnummer erloschen — ist fast
vollständig eine Lagefrage. Klasse E — 9 Fälle — ist ganz eine Namensfrage.

## Klasse C ist der große Brocken und der undankbarste

Von den 166 unsicher verorteten Standorten gehören

- **114** zu Betrieben, die es heute nicht mehr gibt,
- **27** zu Betrieben mit unbekanntem Verbleib,
- **24** zu Betrieben, die fortbestehen — darunter Zweigwerke auswärtiger
  Konzerne (Daimler Benz, Dyckerhoff & Widmann, Rhenus), bei denen
  „existiert heute" nichts über den Wuppertaler Standort aussagt.

Der Weg über den Firmennamen hat also höchstens 24 Kandidaten. Und selbst bei
einem fortbestehenden Betrieb bleibt offen, welches Grundstück die erloschene
Nummer bezeichnete: Werksadressen wurden geteilt, zusammengelegt oder nicht
neu vergeben.

**Was C dennoch verbessern könnte:** Der Straßenteil eines Adressbuchs listet
Haus für Haus. Damit ließe sich die Nummernfolge einer Straße rekonstruieren
und eine erloschene Nummer zwischen zwei heute noch existierenden einordnen.
Gegenüber dem Straßenmittelpunkt — dessen Fehler die Prüfliste im Median mit
262 m beziffert — wäre das ein echter Gewinn. Es bleibt aber Interpolation,
kein Beleg, und es sind 103 Fälle.

## Klasse E ist klein und lohnend

Neun Adressen, für die der Straßenname im heutigen Bestand keine Entsprechung
hat. Sieben davon haben gar keine Koordinate, erscheinen also auf keiner Karte
— der Gewinn je gelöstem Fall ist damit größer als bei C, wo sich nur die
Genauigkeit verbessert.

| Nr. | Unternehmen | Adresse in der Quelle |
|---|---|---|
| 81 | AGEB – Aktiengesellschaft für Bergwerksbedarf | Hirtenstr. 1–3 |
| 100 | Friedrich Brockhaus | Bleichstraße 8 |
| 110 | Cramer & Kromberg | Brausenwerther Str. 15 |
| 252 | Emil Krenzler | Fuchsstraße und Sanderstraße |
| 285 | Matthes & Weber AG | Auf dem Dorp |
| 300 | Hans Moog [Deutsches Leucht- u. Signalmittelwerk Dr. Feistel KG] | Flügel 1 |
| 315 | Walter Osthoff | Kiesbergstr. 25 |
| 319 | Wilhelm Pandel Werkzeugfabrik | Nöllenhammerstraße 31 |
| 372 | Hermann Schlenkermann | Straße der Alten Garde 104 (Werth) |

Zwei Spuren stehen schon in der Prüfliste und sind ohne Beleg nicht zu setzen:
*Bleichstraße* ↔ heutige *Bleicherstraße* (ein anderer Name, kein Schreibfehler)
und *Nöllenhammerstraße* ↔ *Nöllenhammerweg*. Bei Nr. 110 hat die Umgestaltung
des Döppersbergs den alten Zuschnitt beseitigt.

## Straßennamen der NS-Zeit

Die einschlägigen Umbenennungen laufen nicht „nach 1945", sondern andersherum:
Die Quellen benutzen die Namen von 1933–1945, die danach zurückgenommen
wurden. In den Quellentexten stehen

- **Straße der SA** (19 Einträge) — Friedrich-Ebert-Straße
- **Adolf-Hitler-Straße/-Allee** (16 Einträge)
- **Straße der Alten Garde** (Nr. 372) — Werth
- **Lettow-Vorbeck-Straße** (Nr. 156)
- **Göringstraße** (Nr. 76, 356)

Speer hat die meisten davon bereits aufgelöst — die Adressspalte trägt den
heutigen Namen, der NS-Name steht nur noch im Quellentext. Bei **Nr. 156 und
Nr. 372 steht er dagegen in der Adressspalte selbst**; das sind die beiden
Fälle, an denen eine Umbenennungskartei unmittelbar etwas ändern würde.

## Was Speer schon getan hat

**Wichtig für jede künftige Anfrage:** Speer hat die Wuppertaler Adressbücher
bereits ausgewertet, und zwar die Jahrgänge **1940/41, 1942, 1950/51 und
1952**. Neun Katalogeinträge sagen es ausdrücklich. Bei mehreren Betrieben
ohne Adresse steht das Ergebnis dabei:

> „lt. Adressbücher 1940/41, 42, 50/51 in Wuppertal nicht nachweisbar"
> — Nr. 116, 118, 147, 346
>
> „Das Unternehmen ist per Adressbuch nicht feststellbar."
> — Nr. 160

Neun Nennungen bei 431 Einträgen belegen keine flächendeckende Durchsicht — er
hatte die Bände zur Hand und zog sie, wenn die Identifizierung strittig war.
Eine systematische zweite Durchsicht ist also nicht sinnlos. Aber eine
Anfrage, die die Adressbücher als neue Idee vorträgt, greift daneben.

## Die Methode „Nachkriegsadressbuch über den Firmennamen"

Sie hat Präzedenz bei Speer selbst. Nr. 130, Julius & August Erbslöh:

> „Wuppertal-Barmen, Schönenstr. 1a (lt. Adressbuch 1952: Berliner Str. 29)"

Das ist eine belegte Umnummerierung: derselbe Betrieb, derselbe Ort, neue
Adresse. Genau dafür hat das Datenmodell das Feld `adresseHeute` samt
`verortungHinweis` — bislang mit einem einzigen Eintrag (Nr. 156).

**Die Grenze der Methode:** Sie belegt die Umnummerierung eines
fortbestehenden Betriebs *am selben Ort*. Ist der Betrieb zwischendurch
umgezogen, liefert sie einen falschen Punkt mit dem Anschein eines Belegs.
Brauchbar ist sie deshalb nur mit einem Nachweis der Ortskontinuität, und dann
für höchstens die 24 fortbestehenden Betriebe. Ohne diesen Nachweis wäre sie
das Gegenteil dessen, was das Projekt sonst tut.

## Wenn die Anfrage später doch geschrieben wird

Drei Fragen, nicht eine allgemeine:

1. **Die neun Straßennamen** aus der Tabelle oben, als Liste in der Mail — so
   ist sie zu beantworten, ohne die Karte aufzurufen. Dazu: Gibt es ein
   Verzeichnis oder eine Kartei der Umbenennungen, besonders für 1933–1945 und
   deren Rücknahme?
2. **Historische Stadtpläne mit Hausnummern oder Katasterunterlagen** — und wo
   sie liegen, im Archiv oder beim Geodatenzentrum. Das ist die Frage, die
   Klasse C beträfe.
3. **Welche Adressbuch-Jahrgänge vorliegen** — ausdrücklich mit dem Hinweis,
   dass Speer 1940/41, 1942, 1950/51 und 1952 bereits ausgewertet hat, und mit
   der Frage nach Bänden dazwischen oder danach.

Ein erheblicher Teil der von Speer ausgewerteten Überlieferung stammt aus dem
Stadtarchiv Wuppertal — die „Belgier-Akte" begegnet in den Quellentexten
laufend. Ein Halbsatz dazu verortet die Anfrage sofort.

Zum Wortlaut: „in denen Zwangsarbeit geleistet wurde" schreibt den
Verschleppten die Handlung zu; „in denen Zwangsarbeiterinnen und
Zwangsarbeiter eingesetzt wurden" trifft es.
