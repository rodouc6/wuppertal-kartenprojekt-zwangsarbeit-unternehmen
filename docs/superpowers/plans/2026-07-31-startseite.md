# Startseite: Umsetzungsplan

> **Für agentische Bearbeiter:** Dieser Plan wird mit
> `superpowers:subagent-driven-development` abgearbeitet — eine frische
> Instanz je Aufgabe, Prüfung nach jeder. Schritte sind als Kästchen notiert.

**Ziel:** Die Startseite bekommt zwei Zugänge nebeneinander — eine Kartenvorschau
und ein Eintragsbeispiel — dazwischen drei belegte Kennzahlen.

**Aufbau:** Statisches HTML, kein Bauschritt. Die Rechenlogik, die Vorschau und
Hauptkarte teilen, zieht vorab in eine eigene Datei; die Startseite bekommt ein
eigenes Skript, das nur die Vorschau und die Kennzahlen bedient.

**Technik:** HTML, CSS, Vanilla JS, Leaflet 1.9.4. Keine Abhängigkeiten, keine
Fremdaufrufe.

**Spezifikation:** `docs/superpowers/specs/2026-07-31-startseite-design.md` — sie
gilt für alle Werte, Texte und Farben. Bei Abweichung zwischen Plan und Spec gilt
die Spec.

## Verbindliche Vorgaben

Diese Punkte binden **jede** Aufgabe:

- **Keine Fremdaufrufe.** Keine Schriftdateien, keine CDN-Bilder, kein Google. Die
  bestehende Angabe `'Inter', system-ui, -apple-system, sans-serif` bleibt
  unverändert. Leaflet liegt wie bisher.
- **Nur Grauwerte.** Palette aus der Spec: `#17181a` `#4a4b4e` `#77787a` `#8a8a88`
  `#e8e8e8` `#d4d4d2` `#f0f0f0` `#ffffff`, Kartenpunkte `#26272a`. Kein Rot, kein
  Farbakzent. Ausgenommen: die Badges „existiert heute" (Grün/Gelbbraun) und die
  Branchenfarben in `js/branchen.js` — beide kodieren Daten.
- **Kantig.** Kein `border-radius` an neuen Elementen der Startseite, keine
  Schatten. Trennlinien statt Kästen.
- **Zahlen kommen aus `data/meta.json`**, niemals fest eingetragen.
- **Kein Zeitregler, kein Abspielknopf** auf der Startseite.
- **Texte wörtlich aus der Spec**, Abschnitt „Texte". Nicht aus den
  Design-Handoffs — die schreiben die Quellen dem Stadtarchiv Wuppertal zu, was
  nicht zutrifft.
- **Prüfung erfolgt im Browser**, nicht durch Testläufe: `python3 -m http.server
  8080`, dann die betroffenen Seiten ansehen und die Konsole auf Fehler prüfen. Es
  gibt in diesem Projekt keinen Testrunner.
- **Nach jeder Aufgabe committen.** Deutsche Commit-Nachricht, Betreffzeile unter
  72 Zeichen.

## Dateien

| Datei | Rolle |
|---|---|
| `js/daten.js` | **neu** — geteilte Rechenlogik für Vorschau und Karte |
| `js/startseite.js` | **neu** — Kennzahlen, Kartenvorschau, Eintragsbeispiel |
| `js/map-app.js` | ändern — nutzt `daten.js` statt eigener Kopien |
| `js/landing.js` | entfällt — geht in `startseite.js` auf |
| `index.html` | ersetzen — neuer Aufbau |
| `map.html` | ändern — bindet `daten.js` ein |
| `style.css` | erweitern — Abschnitt für die Startseite |

---

### Aufgabe 1: `js/daten.js` — geteilte Rechenlogik

Zuerst, weil alles Weitere darauf steht. Diese Aufgabe ändert **kein** Verhalten:
Der Code zieht um, die Karte muss sich hinterher exakt wie vorher verhalten.

**Dateien:** neu `js/daten.js` · ändern `js/map-app.js`, `map.html`

**Schnittstellen — was spätere Aufgaben benutzen:**

```javascript
MIN_RADIUS, RADIUS_MAX, RADIUS_STEPS   // Konstanten
radiusForCount(count) -> number
getCompanyCount(company, dateISO) -> number
buildCompanies(features) -> Object     // nr -> {name, industriezweig, records, locations}
formatDateDE(iso) -> string
OHNE_ANGABE_ZWEIGE                     // ["xxx", "unbekannt"]
hoechststand(company) -> number        // neu
```

- [ ] **Schritt 1: Bestandsaufnahme.** In `js/map-app.js` die Zeilenbereiche von
      `MIN_RADIUS`, `RADIUS_STEPS`, `RADIUS_MAX`, `radiusForCount`, `MONTH_NAMES`,
      `formatDateDE`, `buildCompanies`, `getCompanyCount` und `OHNE_ANGABE_ZWEIGE`
      notieren. Sie stehen dort etwa zwischen Zeile 26 und 182.

- [ ] **Schritt 2: `js/daten.js` anlegen.** Die genannten Konstanten und Funktionen
      **wörtlich unverändert** hineinkopieren, dazu ein Kopfkommentar im Stil der
      übrigen Dateien, der sagt: diese Datei beantwortet Fragen über die Daten, nicht
      über ihre Darstellung; sie wird vor `map-app.js` und `startseite.js`
      eingebunden.

- [ ] **Schritt 3: `hoechststand` ergänzen.**

```javascript
/* Groesster ueberlieferter Wert ueber alle Zaehlungen eines Unternehmens.
   Die Vorschau auf der Startseite hat keinen Zeitregler und zeigt deshalb
   nicht einen Stichtag, sondern den Hoechststand -- dieselbe Aggregation,
   die das Eintragsbeispiel mit "Bis zu N Zwangsarbeiter" benennt. */
function hoechststand(company) {
  let max = 0;
  company.records.forEach((r) => {
    if (r.gesamt && r.gesamt > max) max = r.gesamt;
  });
  return max;
}
```

- [ ] **Schritt 4: Aus `map-app.js` entfernen**, was jetzt in `daten.js` steht. Die
      Aufrufstellen bleiben unverändert — die Namen sind dieselben.

- [ ] **Schritt 5: `map.html` ergänzen.** `<script src="js/daten.js"></script>` **vor**
      `js/branchen.js` und `js/map-app.js` einhängen.

- [ ] **Schritt 6: Prüfen.** Server starten, `map.html` öffnen. Erwartet: Karte lädt,
      Konsole ohne Fehler, 431 Standorte, Zeitregler bewegt die Punktgrößen,
      Filter wirken, Seitenleiste zeigt Zahlen. Ein Unternehmen mit mehreren
      Standorten (etwa Nr. 54) anklicken und die Zahlen mit dem Zustand vor der
      Änderung vergleichen — sie müssen gleich sein.

- [ ] **Schritt 7:** `node scripts/pruefe_branchen.js` — erwartet `29 Zweige,
      10 Gruppen, 0 Fehler`.

- [ ] **Schritt 8: Committen.**

```bash
git add js/daten.js js/map-app.js map.html
git commit -m "Geteilte Rechenlogik in js/daten.js"
```

---

### Aufgabe 2: Gerüst und Kennzahlen

**Dateien:** ersetzen `index.html` · neu `js/startseite.js` · erweitern `style.css`

**Verbraucht:** aus Aufgabe 1 nichts — diese Aufgabe rührt die Daten nur über
`meta.json` an.

**Erzeugt:** die HTML-Struktur, auf die Aufgabe 3 und 4 ihre Inhalte setzen —
`<div id="kartenvorschau">`, `<div id="eintrag">`, `<dl id="kennzahlen">`.

- [ ] **Schritt 1: `index.html` neu schreiben.** Navigation unverändert aus der
      bisherigen Fassung übernehmen. Darunter die Struktur nach Spec, Abschnitt
      „Aufbau": Intro mit Overline, H1, zwei Absätzen und zwei Schaltflächen; rechts
      daneben `<dl id="kennzahlen">` mit drei leeren Zeilen; darunter
      `<div id="kartenvorschau">`; darunter der zweispaltige Abschnitt mit
      `<div id="eintrag">` links und dem Statistiken-Verweis rechts; Fußzeile.

      Die Texte wörtlich aus der Spec. Der bisherige `<main>`-Container mit
      `max-width: 720px` passt nicht — die Startseite läuft über die volle Breite und
      bekommt eine eigene Klasse, damit die übrigen Seiten unberührt bleiben.

- [ ] **Schritt 2: `js/startseite.js` anlegen** mit dem Laden der Kennzahlen:

```javascript
/* Die drei Zahlen kommen aus meta.json, damit sie nicht veralten koennen.
   Genau das war beim Entwurf passiert: er nannte 30 Industriezweige, weil
   die Zahl aus einer aelteren Fassung stammte. */
async function ladeKennzahlen() {
  const meta = await (await fetch("data/meta.json")).json();
  const zeilen = [
    ["Dokumentierte Unternehmen", meta.stats.totalCompanies],
    ["Standorte auf der Karte", meta.stats.totalLocations],
    ["Stichtage 1940–1945", meta.dates.filter(Boolean).length],
  ];
  document.getElementById("kennzahlen").innerHTML = zeilen
    .map(([label, wert]) =>
      `<div class="kennzahl"><dt>${label}</dt><dd>${wert}</dd></div>`)
    .join("");
}
```

- [ ] **Schritt 3: Stile ergänzen** in `style.css`, in einem eigenen, mit Kommentar
      abgesetzten Abschnitt „STARTSEITE". Maße und Farben aus der Spec. Kein
      `border-radius`, keine Schatten.

- [ ] **Schritt 4: Prüfen.** `index.html` im Browser: Die drei Zahlen stehen als
      417 / 431 / 47 da, das Raster hält bei 1280px Breite, Konsole ohne Fehler.

- [ ] **Schritt 5: Committen.**

---

### Aufgabe 3: Kartenvorschau

**Dateien:** ändern `js/startseite.js`, `style.css`

**Verbraucht:** `buildCompanies`, `hoechststand`, `radiusForCount` aus `daten.js`

- [ ] **Schritt 1: `daten.js` in `index.html` einhängen**, vor `startseite.js`.

- [ ] **Schritt 2: Vorschau bauen.** Leaflet-Karte in `#kartenvorschau`, sämtliche
      Interaktion aus:

```javascript
const karte = L.map("kartenvorschau", {
  zoomControl: false, dragging: false, scrollWheelZoom: false,
  doubleClickZoom: false, boxZoom: false, keyboard: false,
  touchZoom: false, attributionControl: true,
}).setView([51.258, 7.175], 12);
```

      Kacheln wie in `map-app.js` (dieselbe URL, dieselbe Attribution). Punkte als
      `circleMarker`: Farbe `#26272a`, `fillOpacity: 0.55`, Kontur `#17181a`,
      `weight: 1`, `interactive: false`.

- [ ] **Schritt 3: Radius.** `radiusForCount(hoechststand(company))`, das Ergebnis mit
      einem Faktor verkleinert. Den Faktor als benannte Konstante mit Kommentar
      anlegen — 420 Punkte auf 300px Höhe laufen bei voller Größe ineinander.
      Startwert `0.6`, in Schritt 6 visuell nachjustieren.

- [ ] **Schritt 4: Die ganze Fläche klickbar** machen → `map.html`. Als `<a>` um den
      Kartencontainer oder per `click`-Handler mit `cursor: pointer`; die Vorschau
      hat keine eigenen Klickziele.

- [ ] **Schritt 5: Hinweis oben rechts** einsetzen: „Punktgröße = höchste überlieferte
      Zahl je Standort", weißer Kasten, Rahmen `#e8e8e8`, 12px, absolut positioniert.

- [ ] **Schritt 6: Prüfen und Faktor festlegen.** Vorschau ansehen: Wuppertal füllt
      den Ausschnitt, Punkte sind unterscheidbar, die größten erschlagen die kleinen
      nicht. Faktor anpassen, bis das Bild trägt. Ziehen und Zoomen dürfen nicht
      gehen, ein Klick muss zur Karte führen.

- [ ] **Schritt 7: Committen.**

---

### Aufgabe 4: Eintragsbeispiel und Statistiken-Verweis

**Dateien:** ändern `js/startseite.js`, `index.html`, `style.css` · löschen
`js/landing.js`

**Verbraucht:** `OHNE_ANGABE_ZWEIGE` aus `daten.js`

- [ ] **Schritt 1: Die Logik aus `js/landing.js` übernehmen** — Zufallsauswahl unter
      den Einträgen mit Geometrie und mindestens einer Zählung über null, Höchstwert
      samt Art und Datum, Link nach `map.html?nr=…`. Die Auswahlregeln bleiben
      unverändert; nur das Markup folgt der neuen Struktur, und
      `OHNE_ANGABE_ZWEIGE` kommt jetzt aus `daten.js` statt aus einer lokalen Kopie.

- [ ] **Schritt 2: Markup nach Spec.** Rubrik „AUS DEN EINTRÄGEN", Titelzeile
      „Nr. X · Name", Metazeile mit Adresse, Branche und „Bis zu N Zwangsarbeiter",
      Link.

- [ ] **Schritt 3: Statistiken-Spalte** als statisches HTML in `index.html`: Rubrik
      „STATISTIKEN", der Text aus der Spec, Link nach `about/statistiken.html`.

- [ ] **Schritt 4: `js/landing.js` löschen** und die Einbindung aus `index.html`
      entfernen. Prüfen, dass keine andere Seite darauf verweist:
      `grep -rn "landing.js" --include=*.html .`

- [ ] **Schritt 5: Prüfen.** Mehrfach neu laden: Es erscheinen verschiedene Einträge,
      keiner ohne Zahl, der Link führt zum richtigen Unternehmen auf der Karte.
      Die Spalten stehen nebeneinander gleich hoch.

- [ ] **Schritt 6: Committen.**

---

### Aufgabe 5: Schmale Fenster und Abschluss

**Dateien:** ändern `style.css`, gegebenenfalls `index.html`

- [ ] **Schritt 1: Umbruch.** Unter etwa 900px werden aus den beiden Rastern je eine
      Spalte: Kennzahlen unter das Intro, Eintragsbeispiel über den
      Statistiken-Verweis. Innenabstände von 48px auf 24px zurücknehmen, H1 von 44px
      auf einen Wert, der nicht umbricht.

- [ ] **Schritt 2: Vorschauhöhe** auf schmalen Fenstern prüfen — 300px bleiben, aber
      der Hinweiskasten darf die Fläche nicht zudecken.

- [ ] **Schritt 3: Durchsehen.** Alle sechs Seiten bei 1280px und bei 390px öffnen:
      `index.html`, `map.html`, `about.html`, `about/bibliographie.html`,
      `about/statistiken.html`, `impressum.html`. Achten auf: nirgends mehr Rot,
      Links überall als solche erkennbar, keine Konsolenfehler.

- [ ] **Schritt 4: Zählwerte gegenprüfen.** Die drei Kennzahlen gegen `meta.json`
      halten und gegen das, was `map.html` unten anzeigt.

- [ ] **Schritt 5: Committen.**

---

## Nicht in diesem Plan

Die Seite „Über das Projekt" mit Hintergrund, dem Weg von der Druckseite zum
Datensatz und dem Ausblick. Die historischen Fotos. Ein Redesign von `map.html`
über die Farbumstellung hinaus.
