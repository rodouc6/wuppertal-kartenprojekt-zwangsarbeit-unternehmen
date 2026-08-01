# Suchfunktion: Umsetzungsplan

> **Für agentische Bearbeiter:** Abarbeitung mit
> `superpowers:subagent-driven-development` — eine frische Instanz je Aufgabe,
> Prüfung nach jeder.

**Ziel:** Ein Feld im Kopf der Seitenleiste engt Liste und Karte auf Namen,
Adressen, Orte, Stadtteile und Nummern ein.

**Spezifikation:** `docs/superpowers/specs/2026-08-01-suchfunktion-design.md` —
sie gilt für alle Entscheidungen. Bei Abweichung zwischen Plan und Spec gilt
die Spec.

**Technik:** Statische Seite, kein Build, kein Paketmanager. Vanilla JS,
Leaflet 1.9.4.

## Verbindliche Vorgaben

- **Keine Änderung** an Daten, Farben, Radiusstufen oder der bestehenden
  Filterlogik. Die Suche tritt neben die Filter, sie ersetzt keinen.
- **Kein Entprellen.** Gemessen am 1.8.2026: `applyFilters()` läuft in 23ms
  (Median, min 9,8 / max 26,5 bei 418 Karten und 423 Markern). Das trägt eine
  Eingabe pro Tastendruck. Sollte sich das auf dem Telefon anders anfühlen,
  ist Entprellen nachrüstbar — aber nicht auf Verdacht einbauen.
- **Kommentare auf Deutsch**, Umlaute im Quelltext als `ae`/`oe`/`ue`. In
  sichtbaren Texten echte Umlaute.
- **Bedienelemente mindestens 44px** in der kleineren Richtung auf schmalen
  Schirmen (Schwelle 760px, Abschnitt „SCHMALE SCHIRME" in `style.css`).
- **Prüfung im Browser** — es gibt keinen Testrunner. Server:
  `python3 -m http.server 8099`. Bei 1280px **und** 390px prüfen.
- Nach jeder Aufgabe committen, deutsche Nachricht, Betreff unter 72 Zeichen.

## Ausgangszustand

| Stelle | heute |
|---|---|
| `map.html:72` | `</div>` schließt `#sidebar-header`; danach folgt `#filter-panel` |
| `map.html:111` | `<div id="entries-container">` |
| `map.html:107` | `<button id="filter-reset">Zurücksetzen</button>` |
| `js/map-app.js:16` | globales `filters` — `{industriezweig[], zaArt[], geschlecht, stadtteil[], mindestzahl}` |
| `js/map-app.js:1403` | `companyMatchesFilters(company)` — UND-verknüpfte Prüfungen, `return false` bei Nichttreffer |
| `js/map-app.js:1489` | Leermeldung: `#entries-empty`, Text „Keine Einträge für diese Filterauswahl." |
| `js/map-app.js:1493` | `hasActiveFilter` — Oder-Verknüpfung über alle fünf Filter |
| `js/map-app.js:896` | `buildList()` erzeugt `#entries-empty` als `<p>` mit `textContent` |
| Reset-Handler | leert die fünf Filter und ruft `applyFilters()` |

---

### Aufgabe 1: Normalisierung und Suchindex

**Dateien:** `js/map-app.js`

Diese Aufgabe hat noch keine sichtbare Wirkung — sie legt die Rechenbasis und
wird über die Konsole geprüft.

- [ ] **Schritt 1: Zustand ergänzen.** `filters` bekommt ein sechstes Feld:

```javascript
  mindestzahl: 0,            // numeric
  suche: "",                 // normalisierter Suchtext, siehe normalisiere()
```

- [ ] **Schritt 2: Die Normalisierung.** Neue Funktion in `js/map-app.js`, vor
      `companyMatchesFilters()`:

```javascript
/* Suchtext und Sucheingabe durchlaufen dieselbe Normalisierung. Ohne sie
   scheitert die Suche an diesem Bestand: 227 Adressen schreiben "Str.", 97
   schreiben "straße" aus -- 21 Strassen kommen in BEIDEN Schreibweisen vor
   (Kaiser-, Berliner-, Koelner-, Kuellenhahner- und weitere). Wer "Kaiserstraße"
   tippt, faende sonst nur zwei der sechs Betriebe dort, ohne dass die Karte
   das anzeigt.
   Ebenso: 102 Eintraege enthalten ss-Laute, 141 Umlaute, und Namen tragen
   "&", Punkte, Klammern und typografische Anfuehrungszeichen ("Lago"). */
function normalisiere(text) {
  return (text || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    // "Kaiserstr. 8" und "Kaiserstraße 29" muessen dasselbe ergeben.
    // Bewusst ohne Wortgrenze davor: "Kaiserstr." ist ein Wort.
    .replace(/str\./g, "strasse")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
```

- [ ] **Schritt 3: Der Index.** Einmal beim Aufbau gebildet, nicht bei jedem
      Tastendruck. Neue Funktion direkt dahinter:

```javascript
/* Ein normalisierter Suchtext je Unternehmen, ueber ALLE seine Standorte:
   ein Betrieb mit zwei Adressen ist ueber beide auffindbar. Enthaelt auch
   die Nummer, damit "363a" direkt zum Eintrag fuehrt -- nuetzlich fuer alle,
   die daneben den gedruckten Katalog aufgeschlagen haben. */
function baueSuchindex() {
  Object.values(companies).forEach((c) => {
    const teile = [c.nr, c.name];
    c.locations.forEach((loc) => {
      teile.push(loc.adresse, loc.ort, loc.stadtteil, loc.adresseHeute);
    });
    c._suchtext = normalisiere(teile.filter(Boolean).join(" "));
  });
}
```

- [ ] **Schritt 4: Aufrufen.** In `DOMContentLoaded`, direkt nach
      `buildCompanies(...)` und vor `buildMarkers()`.

- [ ] **Schritt 5: Prüfen in der Konsole.** Die Gegenprobe aus der Spec —
      alle vier Schreibweisen müssen dieselben sechs Betriebe liefern:

```javascript
const treffer = q => Object.values(companies)
  .filter(c => c._suchtext.includes(normalisiere(q)))
  .map(c => c.nr).sort();

["kaiserstraße", "kaiserstrasse", "kaiserstr.", "kaiserstr"]
  .map(q => [q, treffer(q).join(",")]);
```

      Erwartet: **viermal** `120,246,281,327,454,476`.

      Dazu einzeln prüfen:

| Aufruf | erwartet |
|---|---|
| `treffer("lago")` | `["262"]` |
| `treffer("rafflenbeul")` | `["342"]` |
| `treffer("363a")` | `["363a"]` |
| `treffer("heckinghausen").length` | `29` — es sind 30 Standorte, aber Nr. 351 hat zwei davon; gezählt werden Unternehmen |

- [ ] **Schritt 6: Committen.**

---

### Aufgabe 2: Das Feld

**Dateien:** `map.html`, `style.css`, `js/map-app.js`

- [ ] **Schritt 1: HTML.** Zwischen dem schließenden `</div>` von
      `#sidebar-header` (`map.html:72`) und `<div id="filter-panel" ...>`:

```html
    <div id="suche-zeile">
      <label class="visuell-verborgen" for="suche">Unternehmen, Adresse oder Nummer suchen</label>
      <input
        type="search"
        id="suche"
        placeholder="Name, Adresse, Nummer …"
        autocomplete="off"
        spellcheck="false"
      >
      <button id="suche-loeschen" type="button" hidden aria-label="Suche löschen">&times;</button>
    </div>
```

- [ ] **Schritt 2: Aussehen.** In `style.css` hinter den Regeln zu
      `#sidebar-header`:

```css
/* ---- Suchfeld ---- */
/* Eigene Zeile unter dem Kopf, nicht IM Kopf: der traegt schon Titel,
   Trefferzahl und Filterknopf, und auf schmalen Schirmen bestimmt seine
   Hoehe die Griffleiste (setzeGriffhoehe in map-app.js). */
#suche-zeile {
  position: relative;
  padding: 0 16px 10px;
  flex-shrink: 0;
}

#suche {
  width: 100%;
  font: inherit;
  font-size: 13px;
  padding: 7px 28px 7px 10px;
  border: 1px solid #d4d4d2;
  border-radius: 6px;
  background: #fff;
  color: #17181a;
}

#suche:focus {
  outline: none;
  border-color: #17181a;
}

/* Der eingebaute Loeschknopf von type="search" erscheint nicht in allen
   Browsern -- deshalb ein eigener, und der eingebaute wird abgeschaltet,
   damit nicht zwei nebeneinander stehen. */
#suche::-webkit-search-cancel-button {
  -webkit-appearance: none;
  appearance: none;
}

#suche-loeschen {
  position: absolute;
  right: 22px;
  top: 50%;
  transform: translateY(-50%);
  margin-top: -5px;
  border: none;
  background: none;
  color: #6b6c6e;
  font-size: 18px;
  line-height: 1;
  padding: 2px 4px;
  cursor: pointer;
}

#suche-loeschen:hover {
  color: #17181a;
}

#suche-loeschen[hidden] {
  display: none;
}

/* Optisch verborgen, fuer Screenreader vorhanden. */
.visuell-verborgen {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Schritt 3: Treffbarkeit auf schmalen Schirmen.** Im Abschnitt
      „SCHMALE SCHIRME" (`@media (max-width: 760px)`):

```css
  /* Wie Abspielknopf und Zaehlweise-Umschalter: mindestens 44px in der
     kleineren Richtung. */
  #suche {
    min-height: 44px;
    font-size: 16px;  /* unter 16px zoomt iOS beim Fokus in das Feld hinein */
  }

  #suche-loeschen {
    min-width: 44px;
    min-height: 44px;
  }
```

- [ ] **Schritt 4: Verdrahten.** Neue Funktion in `js/map-app.js`, hinter
      `initFilters()`:

```javascript
/* Gefiltert wird beim Tippen -- kein Absenden, kein Knopf "Suchen".
   Entprellen ist bewusst nicht eingebaut: applyFilters() laeuft in 23ms
   (Median, gemessen am 1.8.2026 bei 418 Karten und 423 Markern). */
function initSuche() {
  const feld = document.getElementById("suche");
  const loeschen = document.getElementById("suche-loeschen");
  if (!feld) return;

  function uebernehmen() {
    filters.suche = normalisiere(feld.value);
    loeschen.hidden = feld.value === "";
    applyFilters();
  }

  feld.addEventListener("input", uebernehmen);

  feld.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || feld.value === "") return;
    // Nur leeren, nicht weiterreichen: Escape schliesst sonst zugleich
    // die Legende auf schmalen Schirmen (siehe buildLegend).
    e.stopPropagation();
    feld.value = "";
    uebernehmen();
  });

  loeschen.addEventListener("click", () => {
    feld.value = "";
    uebernehmen();
    feld.focus();
  });
}
```

- [ ] **Schritt 5: Aufrufen.** In `DOMContentLoaded`, direkt nach
      `initFilters()`.

- [ ] **Schritt 6: Den Zurücksetzen-Handler zu einer Funktion machen.**
      Aufgabe 4 muss die Filter leeren, **ohne** die Suche mitzunehmen — dafür
      braucht es einen benannten Einstieg statt eines anonymen Klick-Handlers.
      Der bisherige Rumpf von `resetBtn.addEventListener("click", ...)` wandert
      unverändert in eine Funktion, die ein Argument bekommt:

```javascript
/* auchSuche=false leert nur die Filter und laesst den Suchbegriff stehen --
   so kann die Leermeldung "Ohne die gesetzten Filter waeren es 6" anbieten,
   ohne die Eingabe wegzunehmen, die dorthin gefuehrt hat. */
function setzeFilterZurueck(auchSuche = true) {
  filters.industriezweig = [];
  filters.zaArt = [];
  filters.geschlecht = null;
  filters.stadtteil = [];
  filters.mindestzahl = 0;

  // Reset UI
  document.querySelectorAll(".dropdown-list input[type='checkbox']").forEach((cb) => {
    cb.checked = false;
  });
  document.querySelectorAll(".dropdown-btn").forEach((btn) => {
    const span = btn.querySelector(".dd-arrow");
    btn.textContent = "Alle ";
    btn.appendChild(span);
  });
  document.querySelectorAll(".filter-btn[data-gender]").forEach((b) =>
    b.classList.remove("active")
  );
  document.getElementById("filter-mindestzahl").value = "";

  if (auchSuche) {
    filters.suche = "";
    const feld = document.getElementById("suche");
    if (feld) {
      feld.value = "";
      document.getElementById("suche-loeschen").hidden = true;
    }
  }

  applyFilters();
}
```

      **Achtung:** Der bisherige Rumpf greift auf `minInput` zu, eine lokale
      Variable von `initFilters()`. Ausserhalb steht sie nicht zur Verfügung —
      deshalb oben `document.getElementById("filter-mindestzahl")`. Prüfen,
      dass das Feld diese ID trägt (`map.html:103`).

      Der Handler schrumpft auf:

```javascript
  resetBtn.addEventListener("click", () => setzeFilterZurueck(true));
```

- [ ] **Schritt 7: Prüfen bei 1280px.** Feld sichtbar unter „Unternehmen",
      Löschknopf erscheint beim Tippen und verschwindet beim Leeren, Escape
      leert. Die Liste ändert sich noch **nicht** — das kommt in Aufgabe 3.

- [ ] **Schritt 8: Prüfen bei 390px.** Feld im geöffneten Blatt über der
      Liste, mindestens 44px hoch, Panel bricht nicht. Bei geschlossenem Blatt
      ist es erwartungsgemäß nicht sichtbar. Prüfen, dass sich die Höhe der
      Griffleiste **nicht** geändert hat — `setzeGriffhoehe()` misst
      `#sidebar-header`, und das Feld steht außerhalb davon.

- [ ] **Schritt 9: Committen.**

---

### Aufgabe 3: Die Suche wirkt

**Dateien:** `js/map-app.js`

- [ ] **Schritt 1: Prüfung in `companyMatchesFilters()`.** Als erste Prüfung
      der Funktion — sie schließt am meisten aus und ist am billigsten:

```javascript
function companyMatchesFilters(company) {
  // Suche: normalisierter Teilstring ueber Name, alle Adressen, Ort,
  // Stadtteil und Nummer (siehe baueSuchindex)
  if (filters.suche && !company._suchtext.includes(filters.suche)) return false;
```

- [ ] **Schritt 2: `hasActiveFilter` erweitern** (`js/map-app.js:1493`), damit
      der Zähler „X von 417" auch bei reiner Suche erscheint:

```javascript
  const hasActiveFilter =
    filters.industriezweig.length > 0 ||
    filters.zaArt.length > 0 ||
    filters.geschlecht !== null ||
    filters.stadtteil.length > 0 ||
    filters.mindestzahl > 0 ||
    filters.suche !== "";
```

- [ ] **Schritt 3: Prüfen bei 1280px.** Die Gegenproben aus der Spec, diesmal
      im Feld getippt statt in der Konsole:

| Eingabe | Liste zeigt | Karte zeigt |
|---|---|---|
| `kaiserstraße` | 6 Einträge (120, 246, 281, 327, 454, 476) | dieselben Punkte |
| `kaiserstr` | dieselben 6 | dieselben |
| `lago` | Nr. 262 | ein Punkt |
| `rafflenbeul` | Nr. 342 | ein Punkt |
| `363a` | Nr. 363a | ein Punkt |
| `heckinghausen` | 29 Einträge | 30 Punkte (Nr. 351 hat dort zwei Standorte) |

      **Die Marker müssen mitgehen** — die Suche ist kein reiner Listenfilter.
      Gegenprobe in der Konsole:

```javascript
Object.values(markerGroupByNr).flat().filter(m => map.hasLayer(m)).length
```

- [ ] **Schritt 4: Suche und Filter zusammen.** Einen Stadtteil-Filter setzen,
      der die Suchtreffer ausschließt — die Liste muss leer werden. Filter
      lösen, die Treffer kommen zurück. Der Zähler zeigt durchgehend
      „X von 417".

- [ ] **Schritt 5: Zeitregler und Suche zusammen.** Die Suche darf sich beim
      Verschieben des Reglers nicht zurücksetzen, und die Zählweise-Knöpfe
      dürfen sie nicht leeren.

- [ ] **Schritt 6: Committen.**

---

### Aufgabe 4: Der Hinweis bei null Treffern

**Dateien:** `js/map-app.js`

Heute steht dort „Keine Einträge für diese Filterauswahl." Wer sucht und wegen
eines vergessenen Filters nichts findet, erfährt nicht, woran es liegt.

- [ ] **Schritt 1: `#entries-empty` aufnahmefähig machen.** In `buildList()`
      (`js/map-app.js:896`) trägt das Element `textContent`; der Hinweis
      braucht einen Knopf. Statt `textContent` ein leeres Element, das
      `applyFilters()` füllt:

```javascript
  // Empty state element (gefuellt von applyFilters -- der Text haengt davon
  // ab, ob neben der Suche auch Filter gesetzt sind)
  const emptyEl = document.createElement("div");
  emptyEl.id = "entries-empty";
  emptyEl.className = "empty-state-msg";
  emptyEl.style.display = "none";
  container.appendChild(emptyEl);
```

- [ ] **Schritt 2: Die Zählung ohne Filter.** In `applyFilters()`, an der
      Stelle der bisherigen Leermeldung (`js/map-app.js:1489`):

```javascript
  // Leermeldung. Verbirgt ein gesetzter Filter die Suchtreffer, soll das
  // dastehen -- sonst sucht man weiter und findet nie etwas.
  const emptyEl = document.getElementById("entries-empty");
  if (emptyEl) {
    emptyEl.style.display = visibleCount === 0 ? "" : "none";
    if (visibleCount === 0) {
      const nurSuche = filters.suche
        ? Object.values(companies).filter((c) => c._suchtext.includes(filters.suche)).length
        : 0;
      const filterGesetzt =
        filters.industriezweig.length > 0 ||
        filters.zaArt.length > 0 ||
        filters.geschlecht !== null ||
        filters.stadtteil.length > 0 ||
        filters.mindestzahl > 0;

      emptyEl.textContent = "";
      if (filters.suche && filterGesetzt && nurSuche > 0) {
        emptyEl.append(
          `Keine Treffer. Ohne die gesetzten Filter ${
            nurSuche === 1 ? "wäre es einer" : `wären es ${nurSuche}`
          }. `
        );
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "leer-reset";
        btn.textContent = "Filter zurücksetzen";
        // false: Suche stehen lassen -- wer gesucht hat, will den Begriff
        // behalten. setzeFilterZurueck() ruft applyFilters() selbst auf und
        // baut diese Meldung dabei neu; der Knopf hier verschwindet also
        // mit dem Klick, was richtig ist.
        btn.addEventListener("click", () => setzeFilterZurueck(false));
        emptyEl.appendChild(btn);
      } else if (filters.suche) {
        emptyEl.textContent = "Keine Treffer für diese Suche.";
      } else {
        emptyEl.textContent = "Keine Einträge für diese Filterauswahl.";
      }
    }
  }
```

- [ ] **Schritt 3: Aussehen des Knopfes.** In `style.css` bei der Regel zu
      `.empty-state-msg`:

```css
/* Knopf in der Leermeldung -- als Textlink gestaltet, damit er die Meldung
   nicht dominiert. */
.leer-reset {
  font: inherit;
  font-size: inherit;
  border: none;
  background: none;
  padding: 0;
  color: #17181a;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
```

- [ ] **Schritt 3b: Zwei Nebenwirkungen prüfen.** Aus `<p>` wird `<div>`: Die
      Regel `.empty-state-msg` (`style.css:1031`) setzt `padding`, aber kein
      `margin` — ein `<p>` bringt browsereigene Ränder mit, ein `<div>` nicht.
      Der Abstand ändert sich also leicht; ansehen und, wenn es enger wirkt,
      `margin: 0` ergänzen statt es zu belassen.

      Ausserdem steht dort `color: #aaa`. Für eine Meldung, die jetzt eine
      Erklärung samt Knopf trägt, ist das sehr blass (Kontrast rund 2,3:1 auf
      Weiß, unter der WCAG-Schwelle). **Nicht in dieser Aufgabe ändern** — im
      Bericht nennen, damit darüber entschieden werden kann.

- [ ] **Schritt 4: Prüfen.** Drei Fälle:

| Lage | Meldung |
|---|---|
| `kaiserstr` + Stadtteil-Filter „Ronsdorf" | „Keine Treffer. Ohne die gesetzten Filter wären es 6." mit Knopf |
| `xyzabc` ohne Filter | „Keine Treffer für diese Suche." |
| kein Suchtext, Filter ohne Ergebnis | „Keine Einträge für diese Filterauswahl." |

      Der Knopf muss die Filter leeren und den Suchbegriff **behalten** — nach
      dem Klick stehen die sechs Kaiserstraßen-Betriebe in der Liste und
      `kaiserstr` weiterhin im Feld.

- [ ] **Schritt 5: Committen.**

---

### Aufgabe 5: Abschlussdurchsicht

- [ ] **Schritt 1: Alle sechs Seiten** bei 1280px und 390px, Konsole
      fehlerfrei, kein waagerechtes Scrollen.

- [ ] **Schritt 2: Tastaturbedienung.** Mit Tab ins Feld, tippen, Escape,
      Tab weiter — die Reihenfolge muss sinnvoll bleiben. Escape im Feld darf
      **nicht** zugleich die Legende schließen (auf schmalen Schirmen hängt
      dort ein `keydown`-Zuhörer am `document`).

- [ ] **Schritt 3: Die Suche überlebt.** Suchbegriff eingeben, dann
      nacheinander: Zeitregler verschieben, Zählweise umschalten, Marker
      anklicken, Eintrag in der Liste anklicken, Quellenfenster öffnen und
      schließen. Der Begriff bleibt im Feld, die Auswahl bleibt eingeengt.

- [ ] **Schritt 4: Deep Link.** `map.html?nr=54` — die Suche ist leer, der
      Eintrag wird ausgewählt und angeflogen wie bisher.

- [ ] **Schritt 5: Messung wiederholen.** Nach allen Änderungen:

```javascript
const t = performance.now(); for (let i=0;i<10;i++) applyFilters();
(performance.now()-t)/10
```

      Bleibt der Wert unter etwa 30ms, war der Verzicht aufs Entprellen
      richtig. Liegt er deutlich darüber, im Bericht nennen.

- [ ] **Schritt 6: `CLAUDE.md` ergänzen** — `filters.suche` im State-Modell,
      `normalisiere()` und `baueSuchindex()` bei den Schlüsselfunktionen, und
      der Hinweis, dass `adresseHeute` nur einen Eintrag hat und die Suche
      deshalb faktisch historische Adressen erschließt.

- [ ] **Schritt 7: Committen.**

## Nicht in diesem Plan

Hervorheben der Fundstelle, Suche im Speer-Quellentext, Relevanzsortierung,
Suchbegriff in der Adresszeile. Ebenso die übrigen vier Punkte der Liste vom
31.7.2026: Quellenverweis unter die ZA-Zählung, Kontrast der Kartenpunkte,
Formulierung des Eintragsbeispiels, Overline der Startseite.
