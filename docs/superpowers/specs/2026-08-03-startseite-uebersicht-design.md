# Startseite: Übersichtskarte und Beispielkarussell

**Stand:** 3.8.2026 · betrifft `index.html`, `js/startseite.js`, `style.css`,
`impressum.html`, neu `data/beispiele.json`, neu (bereits im Repo)
`data/wuppertal-umriss.geojson`

---

## 1 · Die Kartenvorschau wird eine gezeichnete Fläche

### Befund

Die Vorschau ist heute eine Leaflet-Karte mit fester Mitte und fester
Zoomstufe (`setView([51.258, 7.175], 12)`). Der Ausschnitt hängt damit an der
Containerbreite: auf dem Laptop passt er ungefähr, auf 390px sieht man die
Mitte, und Vohwinkel, Ronsdorf und Langerfeld liegen außerhalb. Dazu kommen
Leaflet und Kachelanfragen an OpenStreetMap für ein Bild, das niemand bedienen
kann.

### Entscheidung

Ein SVG, aus den vorhandenen Daten beim Laden gezeichnet. Eine `viewBox`
skaliert von 390px bis 1600px verlustfrei und zeigt auf jeder Breite denselben
Ausschnitt. **Alle Punkte gleich groß** — die Vorschau zeigt die Verteilung der
Betriebe im Stadtgebiet, nicht den Umfang der Zwangsarbeit. **Keine
Bildunterschrift.**

Gezeichnet statt gebaut: Eine fertige SVG-Datei im Repository wäre schneller
sichtbar, müsste aber bei jeder Datenänderung neu erzeugt werden. Am 1.8.2026
kamen vierzehn Betriebe hinzu; eine Vorschau, die das nicht mitbekommt, ist
schlechter als eine, die eine Zehntelsekunde später erscheint.

### Datengrundlage

`data/wuppertal-umriss.geojson` **liegt bereits im Repository** und muss nicht
erzeugt werden. Aufbau:

```
FeatureCollection
  properties.quelle    Herkunftsangabe (OSM Relation 62478, ODbL)
  properties.abgerufen "2026-08-03"
  features[0]  properties.rolle = "stadtgrenze"  Polygon, 849 Punkte
  features[1]  properties.rolle = "fluss"        MultiLineString, 8 Linien
```

Die Wupper ist auf das Stadtgebiet beschnitten und mit Douglas-Peucker
vereinfacht (ε = 0,00008°). Zusammen 20 KB.

### Umsetzung

**`index.html`:**

- `<link rel="stylesheet" href="vendor/leaflet-1.9.4/leaflet.css">` und
  `<script src="vendor/leaflet-1.9.4/leaflet.js">` entfernen — die Startseite
  braucht Leaflet nicht mehr. (`map.html` behält beides.)
- `<div class="kartenvorschau-hinweis">…</div>` entfernen.
- `#kartenvorschau` behält `tabindex="0"`, `role="link"`; das `aria-label` wird
  zu `"Zur interaktiven Karte — Übersicht der Standorte im Stadtgebiet"`.

**`js/startseite.js`** — `ladeKartenvorschau()` wird ersetzt durch
`baueUebersichtskarte()`. Der Klick- und Tastaturteil am Ende der Funktion
bleibt erhalten, kann aber vereinfacht werden: Ohne Leaflet gibt es keine
Attribution mit eigenem Link mehr im Bild, die `closest("a")`-Prüfung wird
gegenstandslos. Der Kommentar dazu muss mit.

Projektion (dieselbe wie Leaflet, Web Mercator):

```js
function merc(lon, lat) {
  return [lon, Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2)) * 180 / Math.PI];
}
```

Rahmen aus der Bounding Box der **Stadtgrenze** (nicht der Punkte), zuzüglich
0,004° Rand auf allen Seiten. Breite der `viewBox` 1000, Höhe daraus
proportional — bei den vorliegenden Daten rund 818, also ein Verhältnis von
1,22 : 1. Nicht fest eintragen, sondern rechnen.

Zeichenreihenfolge und Werte:

| Ebene | Darstellung |
|---|---|
| Stadtgrenze | `fill: #f2f2ef`, `stroke: #c9c9c4`, `stroke-width: 1.5` |
| Wupper | `fill: none`, `stroke: #a8bac6`, `stroke-width: 2.5`, runde Enden und Ecken |
| Standorte | `r: 4`, `fill: #26272a`, `fill-opacity: 0.72`, `stroke: #fff`, `stroke-width: 0.9` |

Das Blaugrau der Wupper ist der einzige Farbwert der Seite. Die
Startseiten-Spezifikation vom 31.7.2026 legt sich auf Grauwerte fest; ein Fluss
ohne jede Andeutung von Blau ist von der Stadtgrenze aber kaum zu
unterscheiden. `#a8bac6` ist stark entsättigt und als Kompromiss zu verstehen —
wenn er stört, ist ein Grauton der zulässige Rückfall.

Ein Punkt je **Standort mit Geometrie** (426), nicht je Unternehmen: Die
Vorschau zeigt Orte. Gezogen aus `companies` (schon von `ladeDaten()`
gefüllt) über `c.locations`, wie es die bisherige Vorschau tut.

Zugänglichkeit: `<svg aria-hidden="true">`. Der umgebende Container trägt
Rolle und Beschriftung; ein zweites Mal vorgelesen zu werden hilft niemandem.

**`style.css`:**

- `#kartenvorschau`: `height: 300px` entfällt, die Höhe folgt dem Bild. Rahmen,
  Ränder und der Fokusring bleiben. Der Kommentar über `:focus-visible` nennt
  die Leaflet-Attribution als Grund für `role="link"` — er muss nachgeführt
  werden, der Grund ist entfallen.
- `.kartenvorschau-hinweis` und die zugehörige Regel im Mobilblock ersatzlos
  löschen.
- `#kartenvorschau svg { display: block; width: 100%; height: auto; }`
- Unter 600px sind die Punkte bei `r: 4` nur noch gut 3px groß. Dort auf
  `r: 5.5` anheben — als CSS-Regel (`#kartenvorschau circle { r: 5.5; }` in
  einer `@media`-Abfrage), nicht durch ein zweites Zeichnen.

**`impressum.html`:** Die Herkunft der Grenz- und Flussdaten ergänzen, etwa im
Absatz, der heute Leaflet und die Kartendaten nennt: Stadtgrenze und Wupper der
Übersichtskarte stammen aus OpenStreetMap (ODbL), abgerufen am 3.8.2026. Der
Datenschutzabsatz („beim Aufruf der Karte werden Kartenkacheln geladen") bleibt
richtig, betrifft aber nur noch `map.html` — das ist im Satz klarzustellen.

**`CLAUDE.md`:** In der Architekturübersicht vermerken, dass `index.html` kein
Leaflet mehr lädt und woher `data/wuppertal-umriss.geojson` kommt.

### Prüfung

- 1280px und 390px: Das ganze Stadtgebiet ist sichtbar, kein Punkt liegt
  außerhalb der Fläche, das Bild bricht nicht aus der Spalte aus
- Keine Netzwerkanfrage an `tile.openstreetmap.org` mehr auf der Startseite
  (Netzwerkpanel)
- Klick und Enter führen weiterhin auf `map.html`
- Der Fokusring ist sichtbar

---

## 2 · „Aus den Einträgen" wird ein Karussell

### Befund

Der Zufallseintrag zieht aus rund 300 Kandidaten; die meisten sind ein Name mit
einer Zahl. Er nennt außerdem die Unternehmensnummer aus der Speer-Studie — ein
Arbeitsmittel, das in der Seitenleiste der Karte bereits entfernt wurde.

Und die genannte Zahl sagt nicht, woraus sie besteht. Bei den großen Betrieben
stellen dienstverpflichtete Deutsche die Mehrheit:

| Betrieb | Höchststand | davon Deutsche |
|---|---:|---:|
| Gottlob Espenlaub | 2.253 | 1.023 |
| I.G. Farbenindustrie Werk Elberfeld | 1.544 | 1.044 |
| Vorwerk & Co. | 1.362 | 821 |

Dass diese Kategorie mitzählt, ist entschieden und begründet (Spezifikation vom
31.7.2026, Abschnitt „Zur Kategorie Deutsche"). Auf der Karte fängt der
ZA-Art-Filter das auf. Auf einer ausgewählten Beispielkarte gibt es keinen
Filter — dort stünde „1.544 Zwangsarbeiter", während zwei Drittel davon
Deutsche sind.

### Entscheidung

Fünf ausgewählte Beispiele in einem Karussell, ohne Unternehmensnummer, **mit
einer Zeile, die die Zahl aufschlüsselt.** Die Aufschlüsselung löst beides: Sie
macht die Zahl ehrlich und gibt der Karte einen Inhalt, der über Name und
Ziffer hinausgeht.

### Die fünf Beispiele

Absteigend nach Größe, mit dem Bruch am Ende:

| Nr. | Betrieb | Warum |
|---|---|---|
| 132 | Gottlob Espenlaub, Flugzeugbau, Langerfeld | Höchster Stand im Datensatz; dass in Wuppertal Flugzeuge gebaut wurden, überrascht |
| 68 | I.G. Farbenindustrie, Werk Elberfeld | Der bekannte Name am bekannten Ort |
| 447 | Vorwerk & Co., Textil, Barmen | Weltbekannt, existiert heute |
| 463 | Wicküler Küpper Brauerei, Barmen | Stadtbekannte Marke — und eine Zählung **ohne Datum**, also ein Fall, der die Lücke der Quelle zeigt |
| 58 | Georg Arends, Staudengärtnerei, Ronsdorf | Zehn Kriegsgefangene in einer Gärtnerei, früheste Meldung im Datensatz (23.1.1941), aus einer anderen Quelle als die Kammermitteilungen |

Die Auswahl steht in **`data/beispiele.json`**, damit sie ohne Codeänderung zu
ändern ist:

```json
{
  "quelle": "Handverlesene Beispiele fuer das Karussell der Startseite.",
  "nummern": ["132", "68", "447", "463", "58"]
}
```

Fehlt eine Nummer in den Daten, wird sie übersprungen und einmal auf der
Konsole gemeldet — die Startseite darf daran nicht scheitern. Fehlt die Datei
ganz, greift der bisherige Zufallseintrag als einzelne Karte.

### Was auf einer Karte steht

```
Vorwerk & Co.
Barmen, Mühlenweg 23–25 · Textilindustrie

Höchststand 1.362 am 31.12.1944
821 Deutsche · 191 Westarbeiter · 133 Ostarbeiter ·
195 Ausländer ohne Nationalitätenangabe · 22 russische Kriegsgefangene

Auf der Karte anzeigen →
```

Keine Unternehmensnummer. Der Link bleibt `map.html?nr=…` — die Nummer steht
weiterhin in der Adresse, nur nicht mehr im Text.

**Regeln für die Zahlenzeilen:**

1. `hoechststandMitZeitpunkt()` aus `js/daten.js` liefert Höchstwert und
   Zeitpunkt. Zur Aufschlüsselung werden die Meldungen gebraucht, die zu
   diesem Zeitpunkt laufen — dieselbe halboffene Prüfung
   (`datumVon <= t < datumBis`), Zählungen über null, absteigend nach Zahl.
2. Trägt die Aufschlüsselung **genau einen** Posten, entfällt die zweite Zeile
   und die Art wandert in die erste: *„Höchststand 10 Kriegsgefangene am
   23.1.1941"* (Nr. 58).
3. Ist der Höchststand **0**, es gibt aber undatierte Zählungen (Nr. 463):
   *„26 Ostarbeiter (11 M / 15 F) — ohne Datum überliefert"*. Die Angabe zu
   Geschlechtern nur, wenn `m` oder `w` gesetzt sind.
4. Ist beides leer, steht dort *„keine Zählung überliefert"* — derselbe Wortlaut
   wie in der Seitenleiste der Karte. Bei den fünf gewählten Beispielen tritt
   der Fall nicht auf; die Regel schützt gegen eine spätere Änderung der
   Auswahl.

Dafür wird in `js/startseite.js` eine eigene kleine Funktion gebraucht, die die
undatierten Zählungen eines Unternehmens summiert. **`undatierteSumme()` aus
`js/map-app.js` nicht verschieben und nicht aufrufen** — sie liest das globale
`filters`, das es nur auf `map.html` gibt. Die Startseite kennt keine Filter und
summiert ungefiltert.

Zahlen ab 1000 mit Tausenderpunkt (`toLocaleString("de-DE")`).

### Das Karussell

Fachbegriff: Karussell; die einzelne Karte ist eine *Slide*.

- Ein Streifen mit `scroll-snap-type: x mandatory`, jede Karte
  `scroll-snap-align: start`, `overflow-x: auto`. Auf dem Handy ist er damit
  ohne eine Zeile JavaScript wischbar, und die Trägheit stimmt, weil sie vom
  Browser kommt.
- Darunter fünf Punkte als Knöpfe (`aria-label="Beispiel 3 von 5"`,
  `aria-current` auf dem aktiven). Sie springen per `scrollIntoView`. Der
  aktive Punkt folgt dem Scrollen, nicht umgekehrt — Zustand aus dem
  `scroll`-Ereignis lesen, nicht mitzählen.
- Auf breiten Schirmen zusätzlich zwei flache Pfeilknöpfe links und rechts.
- **Selbsttätiger Weiterlauf alle 8 Sekunden.** Er hält an, sobald jemand
  wischt, einen Punkt drückt, mit der Maus über dem Streifen ist oder den Fokus
  hineinsetzt — und läuft dann **nicht** wieder an. Wer eingegriffen hat, liest
  gerade.
- `@media (prefers-reduced-motion: reduce)`: kein Weiterlauf, kein weiches
  Scrollen.
- Der Streifen bekommt `aria-roledescription="Karussell"` und ein
  `aria-label`; die Karten `aria-roledescription="Beispiel"`.
- Die Rubrik „AUS DEN EINTRÄGEN" bleibt, wie sie ist.

Die Spalte ist die schmalere Hälfte eines Zweispalters (`.spalten`,
`grid-template-columns: 1fr 1fr`). Die Karten müssen darin ohne Höhensprung
nebeneinander liegen: gleiche Mindesthöhe für alle fünf, bemessen an der
längsten Aufschlüsselung (Nr. 447 mit fünf Posten). Sonst springt die Seite bei
jedem Weiterlauf.

### Prüfung

- 1280px und 390px: Alle fünf Karten erreichbar, kein Höhensprung beim
  Weiterlauf, der Streifen bricht nicht aus der Spalte aus
- Wischen auf 390px funktioniert und hält den Weiterlauf an
- Tastatur: Die Punkte sind erreichbar und schalten um
- Nr. 463 zeigt die undatierte Zahl mit dem Zusatz, Nr. 58 die einzeilige Form
- Die Zahlen gegen die Quelle prüfen: Nr. 447 muss 1.362 am 31.12.1944 zeigen,
  aufgeschlüsselt in 821 / 191 / 133 / 195 / 22
- Keine Unternehmensnummer im sichtbaren Text

---

## Was nicht dazugehört

- Keine Änderung an `map.html`, `js/map-app.js` oder `js/daten.js`
- Keine Änderung an den Kennzahlen und ihrer Zusatzzeile
- Keine erklärenden Sätze zu den fünf Beispielen — die Daten tragen die Karte.
  Falls sich beim Bauen zeigt, dass eine Karte ohne Satz leer wirkt, ist das zu
  melden, nicht zu erfinden
- Kein Merken der zuletzt gezeigten Karte über Sitzungen hinweg
- Die Navigation wird in einem eigenen Auftrag geändert
  (`2026-08-03-karte-und-navigation-design.md`), der `index.html` und
  `style.css` ebenfalls anfasst. **Nicht parallel bearbeiten.**
