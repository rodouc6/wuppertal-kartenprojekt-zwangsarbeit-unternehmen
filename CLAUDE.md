# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Local Development

Pure static website — no build step, no package manager.

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

A local server is required because `fetch()` loads GeoJSON data (won't work with `file://`).

### Rebuilding data from source

```bash
python3 scripts/build_data.py
# Reads: mainZwangsarbeit.xlsx + unternehmenGeocodiert.geojson
# Writes: data/unternehmen.geojson + data/meta.json
```

Requires `openpyxl`. Only needed when the XLSX or geocoded GeoJSON changes.

Die Seitenzahlen bei Speer stammen aus einem eigenen Lauf über die OCR-PDF:

```bash
python3 scripts/extract_speer_seiten.py /pfad/zu/Speer_..._ocred.pdf
# Schreibt: data/speer_seiten.json
```

Nur nötig, wenn ein neuer Scan vorliegt. Die PDF liegt außerhalb des Repositorys;
der Pfad wird deshalb als Argument übergeben.

Die Prüfliste der unsicher verorteten Standorte (`strassengenau`, `ungefaehr`, `ohne`)
entsteht aus einem Abgleich gegen den heutigen Wuppertaler Adressbestand:

```bash
python3 scripts/pruefe_verortung.py        # --neu holt den OSM-Bestand frisch
# Schreibt: docs/verortung-pruefliste.md
```

Korrekturen an den Quelldaten gehören nach `data/korrekturen.json` — niemals direkt
in die XLSX oder das geokodierte GeoJSON. `build_data.py` wendet sie beim Bauen an
und warnt, wenn ein vorgefundener Wert nicht mehr dem in `alt` notierten entspricht —
für alle drei Feldarten: XLSX-Spalten, `geometrie` (Koordinatenvergleich mit Toleranz
`1e-6`) und `adresseHeute` (dort muss `alt` null sein, weil nichts mehr abgeleitet wird).
Schlägt der Wächter an, wird die Korrektur übersprungen, nicht stillschweigend angewendet.

## Architecture

### Pages

| Page | JS | Purpose |
|---|---|---|
| `index.html` | `js/daten.js`, `js/startseite.js` | Landing page: Kennzahlen, statische Kartenvorschau, random company spotlight |
| `map.html` | `js/daten.js`, `js/map-app.js` | Interactive map + sidebar (core feature) |
| `about.html` | — | "Über das Projekt" hub |
| `about/bibliographie.html` | — | Bibliography |
| `about/statistiken.html` | `js/statistiken.js` | Diagramme zu Branchen, ZA-Arten, Geschlecht, Stadtteilen |
| `impressum.html` | — | Imprint/contact |

`js/branchen.js` wird auf `map.html` und `about/statistiken.html` vor dem jeweiligen
Seitenskript eingebunden und ist die einzige Quelle für Branchengruppen und Farben.
`js/daten.js` wird ebenso vor `map-app.js` bzw. `startseite.js` eingebunden — die
gemeinsame Rechenlogik über die Daten, getrennt von deren Darstellung (siehe unten).

All pages share `style.css` and an identical `<nav>` with CSS-only dropdown for "Projekt".
The `about/` subdirectory uses `../` relative paths for assets.

### Data Pipeline

```
mainZwangsarbeit.xlsx ──┐
                        ├─ scripts/build_data.py ──→ data/unternehmen.geojson (631 KB)
unternehmenGeocodiert.  │                          → data/meta.json (filter values, stats)
  geojson ──────────────┘
```

**Option B data model**: one GeoJSON Feature per `(Nr., StandortNr)` — 431 features total (423 with geometry). Each feature has a nested `records` array with all time-series data for that company. Multi-location companies (11 with 2+ addresses) appear as separate features sharing the same `nr`.

### js/daten.js — Shared Logic

Beantwortet Fragen über die Daten, nicht über ihre Darstellung (keine Markerstile,
Legende, Seitenleiste, Popups — die bleiben in `map-app.js`). Jede Seite legt ihr
eigenes `let companies = {}` an, bevor sie `daten.js` einbindet.

- `buildCompanies(features)` — füllt `companies`: `nr → {name, industriezweig,
  records[], locations[]}`
- `recordGiltAm(r, dateISO)` — entscheidet nach der gewählten Zählweise, ob eine
  Meldung an einem Stichtag zählt: `zaehlmodus === "stichtag"` prüft
  `datumVon === date`, sonst `datumVon <= date < datumBis` (Fortschreibung bis zur
  nächsten Meldung derselben Art). `zaehlmodus` ist wie `filters` ein globaler
  Zustand aus `map-app.js`
- `getCompanyCountMitStand(company, dateISO)` → `{count, stand}` — die Summe plus
  das **jüngste** `datumVon` der beitragenden Meldungen. Der `stand` ist das, was
  die Seitenleiste nennt: im fortgeschriebenen Modus liegt er fast immer vor dem
  Reglerdatum, und genau das soll sichtbar sein. Setzt sich die Zahl aus mehreren
  ZA-Arten mit verschiedenen Daten zusammen, ist das jüngste eine Konvention,
  kein überlieferter Wert
- `getCompanyCount(company, dateISO)` — nur die Zahl daraus; respektiert die
  aktiven ZA-Art- und Geschlechterfilter, liest dafür das globale `filters`,
  das es nur auf `map.html` gibt; **nicht** von der Startseite aufrufbar
- `hoechststand(company)` / `hoechststandMitZeitpunkt(company)` — höchster Stand, den
  ein Unternehmen zu irgendeinem Zeitpunkt *gleichzeitig* erreicht hat: Summe aller
  dann laufenden Zählungen über alle Arten hinweg, ungefiltert, an den `datumVon`-
  Zeitpunkten der eigenen Records gebildet (dieselbe halboffene Intervallprüfung wie
  `getCompanyCount`). Getrennt von `getCompanyCount`, weil diese Funktion auch ohne
  `filters` laufen muss (Startseite) und einen anderen Zweck hat (Maximum über alle
  Zeitpunkte statt Wert an einem Stichtag). Genutzt von der Kartenvorschau und dem
  Eintragsbeispiel auf `index.html`
- `radiusForCount(count)` / `RADIUS_STEPS` / `MIN_RADIUS` / `RADIUS_MAX` — marker radius
  is stepped: ≤0→4px, ≤10→5px, ≤50→8px, ≤100→11px, ≤250→15px, ≤500→19px, >500→24px
- `formatDateDE(iso)`, `OHNE_ANGABE_ZWEIGE` (Sentinel-Leerstellen `"xxx"`/`"unbekannt"`)

### map-app.js — Core Logic

**State model:**
- `companies` — gebaut von `buildCompanies()` aus `daten.js`
- `markerGroupByNr` — `nr → [L.circleMarker, ...]` (enables multi-location highlighting)
- `filters` — `{industriezweig[], zaArt[], geschlecht, stadtteil[], mindestzahl, suche}` (AND-combined).
  Im Industriezweig-Filter stehen 27 Einzelzweige plus der Sentinel `OHNE_ANGABE_WERT`
  („ohne Angabe"), den `companyMatchesFilters()` zu `"xxx"` + `"unbekannt"` auflöst (30 Betriebe)
- `currentDate` — ISO string from timeline slider
- `zaehlmodus` — `"fortgeschrieben"` (Voreinstellung, bisheriges Verhalten) oder
  `"stichtag"`. Umgeschaltet über zwei Knöpfe im Zeitregler (`#timeline-mode`),
  ausgewertet in `recordGiltAm()` in `daten.js`. Im Stichtag-Modus zeichnet
  `markerGrundstil()` Betriebe ohne Meldung an diesem Tag blasser, und neben dem
  Datum steht, wie viele Betriebe gemeldet haben und wie viele davon mit Zahl.
  Siehe `docs/superpowers/specs/2026-08-01-zaehlweise-stichtag-fortgeschrieben-design.md`

**Initialization pipeline** (in `DOMContentLoaded`):
`buildCompanies` → `buildMarkers` → `buildList` → `updateCounter` → `initTimeline` → `initFilters` → `buildLegend` → `handleDeepLink`

**Key behaviors:**
- `applyFilters()` is called on every filter/timeline change — updates marker visibility, sidebar cards, and radii
- Deep linking: `map.html?nr=54` activates and flies to that company on load
- **Suche** (`#suche`, eigene Zeile unter `#sidebar-header`, nicht darin — dessen
  Höhe bestimmt auf schmalen Schirmen die Griffleiste): `normalisiere()` gleicht
  „Str." und „straße" an, löst Umlaute, ß und Satzzeichen auf; `baueSuchindex()`
  legt je Unternehmen ein `_suchtext` über Nummer, Name und **alle** Standorte
  (Adresse, Ort, Stadtteil, adresseHeute) an — einmal beim Aufbau, nicht je
  Tastendruck. Die Angleichung ist nicht optional: 21 Straßen kommen in beiden
  Schreibweisen vor, `adresseHeute` dagegen nur einmal (Nr. 156), sodass die
  Suche faktisch die **historischen** Adressen erschließt.
  Kein Entprellen — `applyFilters()` läuft in 10–14ms (gemessen 1.8.2026).
  Siehe `docs/superpowers/specs/2026-08-01-suchfunktion-design.md`
- `setzeFilterZurueck(auchSuche)` — leert die Filter; mit `false` bleibt der
  Suchbegriff stehen. Genutzt vom Knopf „Zurücksetzen" (mit `true`) und vom
  Knopf in der Leermeldung (mit `false`)
- Der Verortungshinweis in `buildList()` steht **je Standort** unter der zugehörigen
  Adresse, nicht je Unternehmen — fünf der elf Mehrfachstandort-Unternehmen haben
  je Standort eine andere Stufe; der unsichere Fall (`strassengenau`/`ungefaehr`) ist
  über Kursivstellung samt vorangestelltem Zeichen erkennbar, nicht über Farbe — die
  Grautöne allein sind bei 11px nicht zu unterscheiden

**DatumBis logic** (in `build_data.py`): each record's end date is the next inspection date of the *same ZA-Art* for the same company, or Kriegsende (1945-05-08) if it's the last record of that type.

### js/startseite.js — Landing Page

Lädt `data/meta.json` (Kennzahlen) und `data/unternehmen.geojson` (via `buildCompanies`)
je einmal. Baut die nicht interaktive Kartenvorschau (ein Leaflet-Zustand ohne
Zeitregler, Punktradius aus `hoechststand()`) und den Zufallseintrag „AUS DEN
EINTRÄGEN" (ein Kandidat je Unternehmensnummer, Hoechststand samt Zeitpunkt aus
`hoechststandMitZeitpunkt()`).

### Data: `data/unternehmen.geojson`

Feature properties:

| Field | Type | Notes |
|---|---|---|
| `nr` | string | Company number ("54", "363a"); sort key |
| `name` | string | Company name |
| `industriezweig` | string | Sector |
| `existiertHeute` | string | "ja" / "nein" / "unbekannt" / null |
| `adresse`, `ort`, `stadtteil` | string | Location for this specific StandortNr |
| `standortNr` | int | 1, 2, or 3 |
| `standortNrList` | int[] | All StandortNr values for this company |
| `speerText` | string | Historical SPEER inspection text |
| `verortung` | string | `hausgenau` (277) / `strassengenau` (144) / `ungefaehr` (2) / `ohne` (8) — abgeleitet aus `class`/`type` der Nominatim-Antwort, sofern `korrekturen.json` die Stufe nicht selbst setzt |
| `verortungHinweis` | string | Klartext, wie ein korrigierter Punkt zustande kam, z. B. „über die Nachbarnummer 143 verortet". Nur aus `data/korrekturen.json` (im `geometrie`-Eintrag), sonst `null`. Ersetzt in der Seitenleiste den pauschalen Text zur Stufe. Derzeit 34 Einträge |
| `adresseHeute` | string | heutige Adresse bei **belegter** Umbenennung; kommt ausschließlich aus `data/korrekturen.json` (`"feld": "adresseHeute"`), wird nicht abgeleitet. Derzeit genau ein Eintrag: Nr. 156 |
| `speerSeite` | string | Seite bei Speer 2003, z. B. `"514"` oder `"514–515"` |
| `records` | array | `[{datum, datumVon, datumBis, art, gesamt, m, w}, ...]` |

`data/meta.json` provides pre-extracted filter values (dates, industriezweige, zaArten, stadtteile) and stats, avoiding full GeoJSON scan on load.

Dazu zwei Listen parallel zu `dates`: `meldungenJeStichtag` und
`meldungenMitZahlJeStichtag` — wie viele **Unternehmen** (nicht Standorte) an
einem Stichtag melden und wie viele davon mit Zahlenangabe. Die Differenz ist
keine Lücke im Datensatz, sondern in der Quelle: Speer verzeichnet mitunter nur
die Art der Zwangsarbeit. Am 5.7.1944 melden 56 Betriebe, keiner mit Ziffer.
Genutzt vom Zeitregler auf `map.html` und vom Diagramm „Erhebungstage" auf
`about/statistiken.html` — vorberechnet, weil `js/daten.js` auf der
Statistikseite nicht eingebunden ist.

## Extending

- **New GeoJSON field**: add to `build_data.py` output → reference in `buildList()`/`makePopup()` in map-app.js
- **New filter**: add to `filters` state → add UI in `map.html` filter panel → add check in `companyMatchesFilters()`
- **Neue Branchengruppe oder Farbe**: nur in `js/branchen.js` ändern, danach
  `node scripts/pruefe_branchen.js` — es prüft, dass jeder Zweig aus `meta.json`
  genau einer Gruppe zugeordnet ist.
- **New page**: create HTML file with same `<nav>` block, link `style.css`, add nav link to all other pages
- **GitHub Pages**: push to `main` branch, enable Pages in repo settings
