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
| `index.html` | `js/landing.js` | Landing page with random company spotlight |
| `map.html` | `js/map-app.js` | Interactive map + sidebar (core feature) |
| `about.html` | — | "Über das Projekt" hub |
| `about/bibliographie.html` | — | Bibliography |
| `about/statistiken.html` | `js/statistiken.js` | Diagramme zu Branchen, ZA-Arten, Geschlecht, Stadtteilen |
| `impressum.html` | — | Imprint/contact |

`js/branchen.js` wird auf `map.html` und `about/statistiken.html` vor dem jeweiligen
Seitenskript eingebunden und ist die einzige Quelle für Branchengruppen und Farben.

All pages share `style.css` and an identical `<nav>` with CSS-only dropdown for "Projekt".
The `about/` subdirectory uses `../` relative paths for assets.

### Data Pipeline

```
mainZwangsarbeit.xlsx ──┐
                        ├─ scripts/build_data.py ──→ data/unternehmen.geojson (631 KB)
unternehmenGeocodiert.  │                          → data/meta.json (filter values, stats)
  geojson ──────────────┘
```

**Option B data model**: one GeoJSON Feature per `(Nr., StandortNr)` — 431 features total (420 with geometry). Each feature has a nested `records` array with all time-series data for that company. Multi-location companies (11 with 2+ addresses) appear as separate features sharing the same `nr`.

### map-app.js — Core Logic

**State model:**
- `companies` — `nr → {name, industriezweig, records[], locations[]}` (built from GeoJSON)
- `markerGroupByNr` — `nr → [L.circleMarker, ...]` (enables multi-location highlighting)
- `filters` — `{industriezweig[], zaArt[], geschlecht, stadtteil[], mindestzahl}` (AND-combined).
  Im Industriezweig-Filter stehen 27 Einzelzweige plus der Sentinel `OHNE_ANGABE_WERT`
  („ohne Angabe"), den `companyMatchesFilters()` zu `"xxx"` + `"unbekannt"` auflöst (30 Betriebe)
- `currentDate` — ISO string from timeline slider

**Initialization pipeline** (in `DOMContentLoaded`):
`buildCompanies` → `buildMarkers` → `buildList` → `updateCounter` → `initTimeline` → `initFilters` → `buildLegend` → `handleDeepLink`

**Key behaviors:**
- `getCompanyCount(company, dateISO)` sums records where `datumVon <= date < datumBis`, respecting active ZA-Art and gender filters
- `applyFilters()` is called on every filter/timeline change — updates marker visibility, sidebar cards, and radii
- Marker radius is stepped: ≤0→4px, ≤10→5px, ≤50→8px, ≤100→11px, ≤250→15px, ≤500→19px, >500→24px
- Deep linking: `map.html?nr=54` activates and flies to that company on load

**DatumBis logic** (in `build_data.py`): each record's end date is the next inspection date of the *same ZA-Art* for the same company, or Kriegsende (1945-05-08) if it's the last record of that type.

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
| `verortung` | string | `hausgenau` (271) / `strassengenau` (146) / `ungefaehr` (3) / `ohne` (11) — abgeleitet aus `class`/`type` der Nominatim-Antwort |
| `adresseHeute` | string | heutige Adresse bei **belegter** Umbenennung; kommt ausschließlich aus `data/korrekturen.json` (`"feld": "adresseHeute"`), wird nicht abgeleitet. Derzeit genau ein Eintrag: Nr. 156 |
| `speerSeite` | string | Seite bei Speer 2003, z. B. `"514"` oder `"514–515"` |
| `records` | array | `[{datum, datumVon, datumBis, art, gesamt, m, w}, ...]` |

`data/meta.json` provides pre-extracted filter values (dates, industriezweige, zaArten, stadtteile) and stats, avoiding full GeoJSON scan on load.

## Extending

- **New GeoJSON field**: add to `build_data.py` output → reference in `buildList()`/`makePopup()` in map-app.js
- **New filter**: add to `filters` state → add UI in `map.html` filter panel → add check in `companyMatchesFilters()`
- **Neue Branchengruppe oder Farbe**: nur in `js/branchen.js` ändern, danach
  `node scripts/pruefe_branchen.js` — es prüft, dass jeder Zweig aus `meta.json`
  genau einer Gruppe zugeordnet ist.
- **New page**: create HTML file with same `<nav>` block, link `style.css`, add nav link to all other pages
- **GitHub Pages**: push to `main` branch, enable Pages in repo settings
