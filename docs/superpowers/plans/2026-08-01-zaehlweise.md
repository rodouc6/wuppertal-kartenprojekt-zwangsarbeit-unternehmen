# Zwei Zählweisen: Umsetzungsplan

> **Für agentische Bearbeiter:** Abarbeitung mit
> `superpowers:subagent-driven-development` — eine frische Instanz je Aufgabe,
> Prüfung nach jeder.

**Ziel:** Am Zeitregler lässt sich wählen, ob die Karte nur zeigt, was für einen
Stichtag überliefert ist, oder die bisherige Fortschreibung.

**Spezifikation:** `docs/superpowers/specs/2026-08-01-zaehlweise-stichtag-fortgeschrieben-design.md`
— sie gilt für alle Entscheidungen. Bei Abweichung zwischen Plan und Spec gilt
die Spec.

**Technik:** Statische Seite, kein Build, kein Paketmanager. Vanilla JS,
Leaflet 1.9.4, Chart.js 4.4.0 (beide unter `vendor/`), Python 3 mit `openpyxl`
für den Datenbau.

## Verbindliche Vorgaben

- **Keine Änderung** an Daten, Filterlogik, Farben oder Radiusstufen
  (`RADIUS_STEPS`, `radiusForCount()`). Die Punktgröße kodiert Daten.
- **Korrekturen an Quelldaten** gehören nach `data/korrekturen.json`, niemals
  in die XLSX oder das geokodierte GeoJSON. In diesem Plan fällt keine an.
- **Kommentare auf Deutsch**, Umlaute im Quelltext als `ae`/`oe`/`ue`. In
  sichtbaren Texten (HTML, Beschriftungen) echte Umlaute.
- **`hoechststand()` und `hoechststandMitZeitpunkt()` bleiben unberührt** — sie
  laufen auf der Startseite, wo weder `filters` noch `zaehlmodus` existieren.
- **Prüfung im Browser** — es gibt keinen Testrunner. Server:
  `python3 -m http.server 8099` (8080 kann belegt sein). Bei 1280px **und**
  390px prüfen; das schmale Layout hat eine eigene Gitteranordnung für den
  Zeitregler (`style.css`, Abschnitt „SCHMALE SCHIRME").
- Nach jeder Aufgabe committen, deutsche Nachricht, Betreff unter 72 Zeichen.
- `data/unternehmen.geojson` und `data/meta.json` sind erzeugte Dateien; wer
  `build_data.py` ändert, committet den neuen Stand mit.

## Ausgangszustand

| Stelle | heute |
|---|---|
| `js/daten.js:86` | `getCompanyCount(company, dateISO)` — prüft `datumVon <= D < datumBis`, liest global `filters` |
| `js/map-app.js:16` | globales `filters` — Muster für den neuen globalen Zustand |
| `js/map-app.js:261` | `updateMarkerRadii()` — setzt `m._baseRadius` und `m._count` |
| `js/map-app.js:282` | `updateSidebarCounts()` — schreibt „N Zwangsarbeiter am \<Reglerdatum\>" |
| `js/map-app.js:186` | `markerGrundstil(m)` — zwei Fälle nach `istUnsicher()` |
| `js/map-app.js:297` | `initTimeline()` — Regler und Abspielknopf |
| `js/map-app.js:1386` | `applyFilters()` ruft `updateMarkerRadii` → `updateSidebarCounts` → `dimInactiveMarkers` in dieser Reihenfolge |
| `map.html` | `<span id="timeline-mode">Stichtag</span>` — statisch, von keinem Skript angefasst |
| `style.css:306` | `#timeline-mode` — 11px, `#aaa` |
| `style.css:1783` | `#timeline-mode` im schmalen Gitter: `grid-column: 2; grid-row: 1` |
| `scripts/build_data.py:460` | `build_meta()` — erzeugt `dates`, `stats` u. a. |
| `js/statistiken.js:83` | `computeTimeSeries()` — dieselbe Fortschreibung wie die Karte |
| `about/statistiken.html:45` | erster Zeitverlaufs-Abschnitt (`chart-zaart`) |

---

### Aufgabe 1: Meldezahlen je Stichtag in `meta.json`

**Dateien:** `scripts/build_data.py`, `data/meta.json` (erzeugt)

- [ ] **Schritt 1: Zähler anlegen.** In `build_meta()`, bei den übrigen
      Mengen vor der Feature-Schleife (nach `nrs_mit_zahl = set()`):

```python
    # Zahl der Unternehmen, die an einem Stichtag melden -- einmal alle,
    # einmal nur die mit Zahlenangabe. Speer verzeichnet mitunter die Art
    # der Zwangsarbeit ohne Ziffer; am 5.7.1944 melden 56 Betriebe, keiner
    # mit Zahl. Karte und Statistikseite brauchen beide Werte, deshalb hier
    # vorberechnet statt zweimal im Browser.
    # Gezaehlt werden Unternehmensnummern, nicht Standorte: an jedem
    # Standort eines Unternehmens haengt dieselbe records-Liste.
    meldungen = {}            # datumVon -> set(nr)
    meldungen_mit_zahl = {}   # datumVon -> set(nr)
```

- [ ] **Schritt 2: Befüllen.** In der Record-Schleife, direkt nach
      `dates_set.add(dv)`:

```python
                meldungen.setdefault(dv, set()).add(nr)
                if rec.get("gesamt") is not None:
                    meldungen_mit_zahl.setdefault(dv, set()).add(nr)
```

- [ ] **Schritt 3: Ausgeben.** Der `return`-Block bekommt zwei Felder parallel
      zu `dates`. Dafür `dates` einmal in eine Variable ziehen, damit beide
      Listen dieselbe Reihenfolge haben:

```python
    dates_sortiert = sorted(dates_set)

    return {
        "dates": dates_sortiert,
        "meldungenJeStichtag": [
            len(meldungen.get(d, ())) for d in dates_sortiert
        ],
        "meldungenMitZahlJeStichtag": [
            len(meldungen_mit_zahl.get(d, ())) for d in dates_sortiert
        ],
        "industriezweige": sorted(industriezweige_set),
```

      Der Rest des Blocks bleibt unverändert.

- [ ] **Schritt 4: Bauen und gegenrechnen.**

```bash
python3 scripts/build_data.py
python3 - <<'PY'
import json
m = json.load(open('data/meta.json'))
d, a, z = m['dates'], m['meldungenJeStichtag'], m['meldungenMitZahlJeStichtag']
assert len(d) == len(a) == len(z), 'Listenlaengen weichen ab'
probe = {'1943-04-27': (247, 131), '1944-07-05': (56, 0),
         '1945-02-28': (1, 1), '1944-03-11': (109, 107)}
for tag, (soll_a, soll_z) in probe.items():
    i = d.index(tag)
    assert (a[i], z[i]) == (soll_a, soll_z), f'{tag}: {a[i]}/{z[i]} statt {soll_a}/{soll_z}'
print('ok —', len(d), 'Stichtage,', sum(a), 'Meldungen gesamt')
PY
```

      Erwartet: `ok — 47 Stichtage, 913 Meldungen gesamt`.

- [ ] **Schritt 5: Prüfen, dass sonst nichts kippt.** `git diff --stat` darf
      außer `scripts/build_data.py` nur `data/meta.json` nennen. Ändert sich
      `data/unternehmen.geojson`, ist etwas schiefgegangen — dieser Schritt
      rührt es nicht an.

- [ ] **Schritt 6: Beide Seiten im Browser öffnen** (`map.html`,
      `about/statistiken.html`), Konsole fehlerfrei. Es hat sich noch nichts
      sichtbar geändert; geprüft wird nur, dass die größere `meta.json` nichts
      bricht.

- [ ] **Schritt 7: Committen.**

---

### Aufgabe 2: Die Zählweise und ihr Umschalter

**Dateien:** `js/daten.js`, `js/map-app.js`, `map.html`, `style.css`

- [ ] **Schritt 1: Zählung in `js/daten.js`.** `getCompanyCount()` wird zum
      Vorderende einer Funktion, die auch das Datum der jüngsten beitragenden
      Meldung liefert — Aufgabe 4 braucht es. Der bisherige Rumpf wird ersetzt
      durch:

```javascript
/* Zwei Lesarten derselben Daten -- siehe
   docs/superpowers/specs/2026-08-01-zaehlweise-stichtag-fortgeschrieben-design.md
   "stichtag": nur, was fuer genau diesen Tag ueberliefert ist.
   "fortgeschrieben": jede Meldung gilt weiter, bis derselbe Betrieb dieselbe
   Art neu meldet -- die bisherige und weiterhin voreingestellte Lesart.
   `zaehlmodus` ist wie `filters` ein globaler Zustand, den nur map.html
   setzt; beide Funktionen sind deshalb von der Startseite aus nicht
   aufrufbar. */
function recordGiltAm(r, dateISO) {
  if (!r.datumVon) return false;
  if (zaehlmodus === "stichtag") return r.datumVon === dateISO;
  return Boolean(r.datumBis) && r.datumVon <= dateISO && dateISO < r.datumBis;
}

/* Liefert die Zahl und das juengste datumVon der Meldungen, die zu ihr
   beitragen. Setzt sich die Zahl aus mehreren Arten mit verschiedenen Daten
   zusammen, ist `stand` das juengste davon -- eine Konvention, kein
   ueberlieferter Wert. */
function getCompanyCountMitStand(company, dateISO) {
  if (!dateISO) return { count: 0, stand: null };
  let total = 0;
  let stand = null;
  company.records.forEach((r) => {
    if (!recordGiltAm(r, dateISO)) return;
    // ZA-Art-Filter beachten
    if (filters.zaArt.length > 0 && r.art && !filters.zaArt.includes(r.art)) return;
    // Geschlechterfilter beachten
    let wert;
    if (filters.geschlecht === "m") {
      wert = r.m || 0;
    } else if (filters.geschlecht === "w") {
      wert = r.w || 0;
    } else {
      wert = r.gesamt || 0;
    }
    total += wert;
    if (wert > 0 && (stand === null || r.datumVon > stand)) stand = r.datumVon;
  });
  return { count: total, stand };
}

function getCompanyCount(company, dateISO) {
  return getCompanyCountMitStand(company, dateISO).count;
}
```

- [ ] **Schritt 2: Globaler Zustand in `js/map-app.js`.** Direkt hinter dem
      `filters`-Block (etwa Zeile 22):

```javascript
/* Zaehlweise des Zeitreglers: "fortgeschrieben" (Voreinstellung, bisheriges
   Verhalten) oder "stichtag". Ausgewertet in getCompanyCount() in
   js/daten.js, das diese Variable wie `filters` global liest. */
let zaehlmodus = "fortgeschrieben";
```

- [ ] **Schritt 3: Umschalter in `map.html`.** Die Zeile
      `<span id="timeline-mode">Stichtag</span>` wird ersetzt durch:

```html
      <div id="timeline-mode" role="group" aria-label="Zählweise">
        <button
          type="button"
          data-modus="stichtag"
          aria-pressed="false"
          title="Nur die Zahlen, die für diesen Tag überliefert sind."
        >Stichtag</button>
        <button
          type="button"
          data-modus="fortgeschrieben"
          aria-pressed="true"
          title="Visualisiert wird hier unter der Annahme, dass die Mitteilungen zum Stichtag in der Folgezeit stabil waren."
        >Fortgeschrieben</button>
      </div>
```

- [ ] **Schritt 4: Aussehen in `style.css`.** Die bestehende Regel
      `#timeline-mode` (Zeile 306) wird ersetzt. Graustufen wie der Rest der
      Oberfläche, keine Farbe:

```css
/* Zaehlweise-Umschalter im Zeitregler. Ein Knopf ist immer aktiv; der
   Zustand haengt an aria-pressed, damit er auch ohne Blick auf die Farbe
   erkennbar ist. */
#timeline-mode {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  background: #f0f0ee;
  border-radius: 999px;
  padding: 2px;
}

#timeline-mode button {
  font: inherit;
  font-size: 11px;
  line-height: 1;
  padding: 5px 9px;
  border: none;
  border-radius: 999px;
  background: none;
  color: #6b6c6e;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}

#timeline-mode button:hover {
  color: #17181a;
}

#timeline-mode button[aria-pressed="true"] {
  background: #17181a;
  color: #fff;
}
```

- [ ] **Schritt 5: Verdrahten.** Neue Funktion in `js/map-app.js`, direkt hinter
      `initTimeline()`:

```javascript
/* Der Umschalter aendert nur die Zaehlung -- Filter, Auswahl und
   Kartenausschnitt bleiben, wie sie sind. applyFilters() setzt Radien,
   Seitenleiste und Ausgrauen in einem Zug neu. */
function initZaehlmodus() {
  const gruppe = document.getElementById("timeline-mode");
  if (!gruppe) return;

  gruppe.querySelectorAll("button[data-modus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const gewaehlt = btn.dataset.modus;
      if (gewaehlt === zaehlmodus) return;
      zaehlmodus = gewaehlt;
      gruppe.querySelectorAll("button[data-modus]").forEach((b) => {
        b.setAttribute("aria-pressed", String(b.dataset.modus === zaehlmodus));
      });
      applyFilters();
    });
  });
}
```

- [ ] **Schritt 6: Aufrufen.** In `DOMContentLoaded`, in der
      Initialisierungskette direkt nach `initTimeline()`:

```javascript
  initZaehlmodus();
```

- [ ] **Schritt 7: Prüfen bei 1280px.** `map.html` öffnen, Regler auf den
      27.4.1943 stellen. Beim Umschalten auf „Stichtag" müssen die Punkte
      erkennbar kleiner werden; zurück auf „Fortgeschrieben" der alte Stand.
      Regler auf den 28.2.1945: im Stichtag-Modus darf genau **ein** Betrieb
      eine Zahl haben. Zur Gegenprobe in der Konsole:

```javascript
Object.values(companies).filter(c => getCompanyCount(c, currentDate) > 0).length
```

      Erwartet: `1` im Stichtag-Modus, `337` im fortgeschriebenen.

- [ ] **Schritt 8: Prüfen, dass der Umschalter das Panel nicht sprengt** —
      bei 1280px darf der Regler nicht auf unter etwa 120px zusammenschrumpfen.
      Der Slider hat `flex: 1` und gibt als Erster nach.

- [ ] **Schritt 9: Prüfen bei 390px.** `#timeline-panel` ist dort ein Gitter
      mit zwei Spalten; `#timeline-mode` sitzt in Spalte 2, Zeile 1. Prüfen,
      ob beide Knöpfe neben dem Datum Platz finden. Wenn nicht, in der Media
      Query bei `style.css:1783` dem Umschalter eine eigene Zeile geben
      (`grid-column: 1 / -1; grid-row: 1;`) und Datum sowie Regler um eine
      Zeile nach unten schieben — nicht die Schrift verkleinern.

- [ ] **Schritt 10: Konsole fehlerfrei**, auch auf `index.html` — die Startseite
      bindet `js/daten.js` ebenfalls ein und darf von `zaehlmodus` nichts
      merken, weil sie `getCompanyCount()` nicht aufruft.

- [ ] **Schritt 11: Committen.**

---

### Aufgabe 3: Was der Stichtag-Modus zeigt

**Dateien:** `js/map-app.js`, `style.css`

- [ ] **Schritt 1: Betriebe ohne Meldung blasser.** `markerGrundstil()` in
      `js/map-app.js:186` bekommt einen dritten Fall. `m._count` wird von
      `updateMarkerRadii()` gesetzt, das in `applyFilters()` vor
      `dimInactiveMarkers()` läuft — die Reihenfolge trägt:

```javascript
function markerGrundstil(m) {
  /* Im Stichtag-Modus hat die Mehrzahl der Betriebe an einem beliebigen Tag
     keine Meldung. Sie bleiben als Mindestpunkt stehen -- der Standort ist
     ja bekannt --, werden aber blasser gezeichnet, damit "an diesem Tag
     nichts ueberliefert" nicht wie "hier waren wenige" aussieht. */
  const ohneMeldung = zaehlmodus === "stichtag" && !m._count;

  if (istUnsicher(m._verortung)) {
    return {
      fillColor: m._izColor,
      color: m._izColor,
      weight: 2,
      dashArray: "5 4",
      fillOpacity: ohneMeldung ? 0.15 : 0.45,
    };
  }
  return {
    fillColor: m._izColor,
    color: ohneMeldung ? "#d4d4d2" : "#fff",
    weight: 1.5,
    dashArray: null,
    fillOpacity: ohneMeldung ? 0.3 : 0.85,
  };
}
```

- [ ] **Schritt 2: Meldezahl aufnehmen.** `js/map-app.js` liest `meta` bereits
      in `let meta = {}`. Neue Funktion hinter `initZaehlmodus()`:

```javascript
/* Im Stichtag-Modus steht neben dem Datum, was an ihm ueberliefert ist.
   Ohne die zweite Zahl saehe der 5.7.1944 -- 56 Meldungen, keine mit Ziffer
   -- nach einem Anzeigefehler aus. Im fortgeschriebenen Modus erklaert die
   Angabe nichts und entfaellt.
   Die Zahlen stammen aus meta.json und sind ungefiltert: sie beschreiben die
   Quellenlage, nicht die getroffene Auswahl. */
function aktualisiereMeldezahl() {
  const el = document.getElementById("timeline-meldungen");
  if (!el) return;

  const alle = (meta.meldungenJeStichtag || [])[currentDateIdx];
  const mitZahl = (meta.meldungenMitZahlJeStichtag || [])[currentDateIdx];

  if (zaehlmodus !== "stichtag" || alle === undefined) {
    el.textContent = "";
    el.hidden = true;
    return;
  }

  el.hidden = false;
  el.textContent = SCHMALE_SCHIRM_ABFRAGE.matches
    ? `${alle} ${alle === 1 ? "Meldung" : "Meldungen"}`
    : `${alle} ${alle === 1 ? "Meldung" : "Meldungen"}, davon ${mitZahl} mit Zahl`;
}
```

- [ ] **Schritt 3: Abfrage für schmale Schirme.** Eine Konstante bei den
      übrigen oben in `js/map-app.js`, gleich benannt wie die in
      `js/statistiken.js`:

```javascript
/* Dieselbe Schwelle wie im Abschnitt "SCHMALE SCHIRME" von style.css. */
const SCHMALE_SCHIRM_ABFRAGE = window.matchMedia("(max-width: 760px)");
```

      Die elf vorhandenen `window.matchMedia("(max-width: 760px)")`-Aufrufe in
      der Datei **bleiben, wie sie sind** — sie umzustellen wäre eine
      Umbauarbeit an Blatt- und Legendenzustand, die mit dieser Aufgabe nichts
      zu tun hat. Die Konstante gilt nur für den neuen Code.

- [ ] **Schritt 3b: Beim Schwellenwechsel die Länge anpassen.** Ein eigener
      Zuhörer, nicht in den bestehenden gehängt (der verwaltet den
      Blatt-Zustand und soll unangetastet bleiben):

```javascript
  /* Beim Drehen des Geraets wechselt der Text zwischen Kurz- und Langfassung. */
  SCHMALE_SCHIRM_ABFRAGE.addEventListener("change", aktualisiereMeldezahl);
```

- [ ] **Schritt 4: Element in `map.html`.** Hinter `<span id="timeline-date">`:

```html
      <span id="timeline-meldungen" hidden></span>
```

- [ ] **Schritt 5: Aussehen.** In `style.css` hinter der `#timeline-date`-Regel:

```css
/* Angabe zur Quellenlage am gewaehlten Stichtag -- zurueckhaltender als das
   Datum, weil sie es ergaenzt und nicht ersetzt. */
#timeline-meldungen {
  font-size: 11px;
  color: #6b6c6e;
  white-space: nowrap;
  flex-shrink: 0;
}

#timeline-meldungen[hidden] {
  display: none;
}
```

- [ ] **Schritt 6: Aufrufen.** `aktualisiereMeldezahl()` muss laufen, wenn sich
      Datum **oder** Modus ändert. Der einfachste Ort ist `applyFilters()`,
      direkt hinter `updateSidebarCounts()` — beide Auslöser gehen dort
      hindurch. Zusätzlich einmal am Ende von `initTimeline()`, weil der
      Startzustand `applyFilters()` nicht durchläuft.

- [ ] **Schritt 7: Prüfen bei 1280px.** Im Stichtag-Modus auf den 27.4.1943:
      „247 Meldungen, davon 131 mit Zahl". Auf den 5.7.1944: „56 Meldungen,
      davon 0 mit Zahl", und die Karte zeigt nur blasse Mindestpunkte. Im
      fortgeschriebenen Modus verschwindet die Angabe ganz. Die blassen Punkte
      müssen von den gefüllten unterscheidbar sein, auch bei Zoomstufe 16.

- [ ] **Schritt 8: Prüfen bei 390px** — Kurzfassung „247 Meldungen", Panel
      bricht nicht.

- [ ] **Schritt 9: Prüfen, dass der fortgeschriebene Modus unverändert
      aussieht** — kein blasser Punkt, keine Meldezahl, gleiche Radien wie vor
      dieser Aufgabe.

- [ ] **Schritt 10: Committen.**

---

### Aufgabe 4: Der Zähler in der Seitenleiste nennt das Datum der Meldung

**Dateien:** `js/map-app.js`

Heute steht dort „50 Zwangsarbeiter am 28.2.1945", auch wenn der Wert vom
13.8.1942 stammt — die Zahl wird einem Tag zugeschrieben, für den sie nicht
überliefert ist.

- [ ] **Schritt 1: `updateSidebarCounts()` ersetzen** (`js/map-app.js:282`):

```javascript
// ---- Zahl je Eintrag in der Seitenleiste ----
/* Das genannte Datum ist das der zugrundeliegenden Meldung, nicht das des
   Reglers. Im fortgeschriebenen Modus liegt es fast immer davor -- genau das
   soll sichtbar sein. */
function updateSidebarCounts() {
  if (!currentDate) return;
  Object.values(companies).forEach((c) => {
    const el = document.getElementById(`count-${c.nr}`);
    if (!el) return;
    const { count, stand } = getCompanyCountMitStand(c, currentDate);
    if (count === 0) {
      el.textContent = "";
      return;
    }
    const datum = formatDateDE(stand || currentDate);
    el.textContent =
      zaehlmodus === "stichtag"
        ? `${count} Zwangsarbeiter am ${datum}`
        : `${count} Zwangsarbeiter — Stand ${datum}`;
  });
}
```

- [ ] **Schritt 2: Prüfen an Nr. 54.** Der Betrieb meldet Ostarbeiter am
      13.8.1942 (50), am 28.10.1942 (38) und am 27.4.1943 (30).

| Regler steht auf | Stichtag-Modus | Fortgeschrieben |
|---|---|---|
| 13.8.1942 | 50 Zwangsarbeiter am 13.8.1942 | 50 Zwangsarbeiter — Stand 13.8.1942 |
| 1.9.1942 | *(leer)* | 50 Zwangsarbeiter — Stand 13.8.1942 |
| 28.10.1942 | 38 Zwangsarbeiter am 28.10.1942 | 38 Zwangsarbeiter — Stand 28.10.1942 |
| 28.2.1945 | *(leer)* | 30 Zwangsarbeiter — Stand 27.4.1943 |

      Alle acht Fälle im Browser durchgehen. Deep Link: `map.html?nr=54`.

- [ ] **Schritt 3: Prüfen an einem Betrieb mit mehreren Arten.** Einen suchen,
      dessen Zahl sich aus Meldungen verschiedener Daten zusammensetzt, und
      belegen, dass das **jüngste** beitragende Datum genannt wird:

```javascript
Object.values(companies).find(c => {
  const d = new Set(c.records.filter(r => (r.gesamt || 0) > 0).map(r => r.datumVon));
  return d.size > 1 && new Set(c.records.map(r => r.art)).size > 1;
})?.nr
```

- [ ] **Schritt 4: Prüfen, dass die Geschlechterfilter mitziehen** — bei „nur
      weiblich" darf `stand` das Datum einer Meldung nennen, die tatsächlich
      Frauen ausweist, nicht das einer rein männlichen.

- [ ] **Schritt 5: Committen.**

---

### Aufgabe 5: Erhebungstage auf der Statistikseite

**Dateien:** `about/statistiken.html`, `js/statistiken.js`

- [ ] **Schritt 1: Abschnitt im HTML**, **vor** dem bestehenden
      `chart-zaart`-Abschnitt (`about/statistiken.html:45`):

```html
  <section class="chart-section">
    <h2>Erhebungstage</h2>
    <p class="chart-note">
      Zahl der Unternehmen, die an einem Stichtag eine Meldung überliefert haben.
      Die Erhebung kommt in Schüben: An 30 der 47 Stichtage melden weniger als
      15 Betriebe, an sieben genau einer. Nicht jede Meldung trägt eine Zahl —
      mitunter verzeichnet die Quelle nur die Art der Zwangsarbeit.
    </p>
    <canvas id="chart-erhebungstage"></canvas>
  </section>
```

- [ ] **Schritt 2: Hinweis an den beiden Verlaufskurven.** Die `chart-note` des
      `chart-zaart`-Abschnitts endet heute mit „Ein Wert gilt bis zur nächsten
      Zählung derselben Art beim selben Unternehmen." Dahinter ergänzen:

```html
      Die Kurve steigt deshalb auch dann, wenn an einem Stichtag kaum jemand
      gemeldet hat — sie zeigt fortgeschriebene Werte. Auf der
      <a href="../map.html">Karte</a> lässt sich zwischen dieser Lesart und den
      allein für den Tag überlieferten Zahlen umschalten.
```

      An den Geschlechter-Verlauf gekürzt dasselbe:

```html
      Auch diese Kurve zeigt fortgeschriebene Werte — siehe den Hinweis oben.
```

- [ ] **Schritt 3: Diagramm bauen.** Neue Funktion in `js/statistiken.js`,
      vor `buildZaArtVerlaufChart()`. Die Werte kommen fertig aus `meta.json`
      (Aufgabe 1) — nicht neu berechnen:

```javascript
/* Gestapelte Balken: unten die Meldungen mit Zahlenangabe, oben die ohne.
   Die Lücke ist der Punkt dieses Diagramms -- am 5.7.1944 melden 56
   Betriebe, keiner mit Ziffer. */
function buildErhebungstageChart(meta) {
  const alle = meta.meldungenJeStichtag || [];
  const mitZahl = meta.meldungenMitZahlJeStichtag || [];
  if (alle.length === 0) return;

  const ohneZahl = alle.map((n, i) => n - (mitZahl[i] || 0));

  new Chart(document.getElementById('chart-erhebungstage'), {
    type: 'bar',
    data: {
      labels: meta.dates.map(shortDateDE),
      datasets: [
        {
          label: 'mit Zahlenangabe',
          data: mitZahl,
          backgroundColor: '#8b0000',
        },
        {
          label: 'ohne Zahlenangabe',
          data: ohneZahl,
          backgroundColor: '#c9a9a9',
        },
      ],
    },
    options: {
      responsive: true,
      aspectRatio: SCHMALER_SCHIRM ? 1.1 : 2,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 14 } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} Unternehmen`,
          },
        },
      },
      scales: {
        x: { stacked: true, ticks: { maxTicksLimit: 12, font: { size: 10 }, maxRotation: 45 } },
        y: { stacked: true, title: { display: true, text: 'Anzahl Unternehmen' }, min: 0 },
      },
    },
  });
}
```

- [ ] **Schritt 4: Aufrufen.** `buildCharts()` bekommt das ganze `meta`-Objekt
      statt nur `dates`. In `loadData()` die letzte Zeile ändern:

```javascript
  buildCharts(features, meta);
```

      und in `buildCharts()` Kopf und Aufrufliste:

```javascript
function buildCharts(features, meta) {
  const dates = meta.dates || [];
  // Unternehmens-Statistiken: nur standortNr === 1 (ein Eintrag je Unternehmen)
  const companies = features.filter(f => f.standortNr === 1);

  // Zeitreihendaten für ZA-Art und Geschlecht berechnen
  // Nur ein Eintrag je Unternehmen: bei Mehrfach-Standorten hängt an jedem
  // Standort dieselbe records-Liste, sonst zählen 11 Unternehmen doppelt.
  const { zaArtSeries, mSeries, wSeries } = computeTimeSeries(companies, dates);

  buildIndustrieChart(companies);
  buildErhebungstageChart(meta);
  buildZaArtVerlaufChart(zaArtSeries, dates);
  buildGeschlechtVerlaufChart(mSeries, wSeries, dates);
  buildGeschlechtChart(mSeries, wSeries);
  buildExistiertChart(companies);
  buildStadtteilChart(companies);
}
```

- [ ] **Schritt 5: Prüfen bei 1280px.** Acht deutlich höhere Balken;
      27.4.1943 mit sichtbar hellem Anteil (116 von 247), 5.7.1944 vollständig
      hell (56 von 56). Beim Überfahren nennt der Tooltip beide Anteile.

- [ ] **Schritt 6: Prüfen bei 390px** — das Diagramm nutzt `aspectRatio`
      wie die übrigen; die Beschriftungen dürfen sich nicht überlagern.

- [ ] **Schritt 7: Konsole fehlerfrei**, die fünf bestehenden Diagramme
      unverändert.

- [ ] **Schritt 8: Committen.**

---

### Aufgabe 6: Abschlussdurchsicht

- [ ] **Schritt 1: Die drei Seiten bei 1280px und 390px** — `index.html`,
      `map.html`, `about/statistiken.html`. Konsole überall fehlerfrei.

- [ ] **Schritt 2: Der fortgeschriebene Modus ist unverändert.** Er ist die
      Voreinstellung; wer die Seite öffnet, muss dasselbe sehen wie vorher —
      bis auf den neuen Umschalter und das korrigierte Datum in der
      Seitenleiste. Gegen `git stash` prüfen oder gegen die veröffentlichte
      Fassung.

- [ ] **Schritt 3: Filter und Zählweise zusammen.** Einen Industriezweig
      wählen, einen ZA-Art-Filter setzen, Geschlecht auf „weiblich", dann
      umschalten. Die Zahlen müssen beiden Bedingungen folgen, die Meldezahl am
      Regler dagegen ungefiltert bleiben — sie beschreibt die Quellenlage.

- [ ] **Schritt 4: Abspielknopf im Stichtag-Modus.** Die Karte springt zwischen
      fast leeren und vollen Tagen. Prüfen, dass nichts hängenbleibt und die
      Meldezahl mitläuft.

- [ ] **Schritt 5: Deep Link.** `map.html?nr=54` — Auswahl und Kartenflug
      funktionieren in beiden Modi.

- [ ] **Schritt 6: Treffbarkeit** der beiden Umschaltknöpfe bei 390px prüfen.
      Sie liegen unter 44px Höhe; das ist hinnehmbar, weil sie nebeneinander
      und weit von anderen Bedienelementen liegen — im Bericht nennen, wenn
      sie sich beim Tippen als schwer treffbar erweisen.

- [ ] **Schritt 7: `CLAUDE.md` ergänzen.** Der Abschnitt zu `js/daten.js`
      beschreibt `getCompanyCount()`; die neue Fallunterscheidung und
      `getCompanyCountMitStand()` gehören dort hin, ebenso die zwei neuen
      Felder in der `meta.json`-Beschreibung.

- [ ] **Schritt 8: Committen.**

## Nicht in diesem Plan

Die übrigen fünf Punkte der Liste vom 31.7.2026 — Suchfunktion, Quellenverweis
unter die ZA-Zählung, Kontrast der Kartenpunkte, Formulierung des
Eintragsbeispiels, Overline der Startseite. Ebenso die offenen
Bibliographie-Titel, die historischen Fotos und die Datenfragen (ungültiges
Datum bei Nr. 218, Zählungen ohne Datum, nie geokodierte Unternehmen).
