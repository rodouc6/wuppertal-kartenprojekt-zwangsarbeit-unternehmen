# Überarbeitung Kartenteil — Umsetzungsplan

> **Für agentische Ausführung:** ERFORDERLICHES SUB-SKILL: `superpowers:subagent-driven-development` (empfohlen) oder `superpowers:executing-plans`, um diesen Plan Aufgabe für Aufgabe umzusetzen. Die Schritte nutzen Checkbox-Syntax (`- [ ]`) zur Nachverfolgung.

**Ziel:** Die Karte soll aufhören, mehr Genauigkeit zu behaupten, als die Quelle hergibt, und dort lesbar werden, wo sie heute überladen ist — 30 nicht unterscheidbare Branchenfarben auf neun Gruppen reduzieren, die Verortungsgenauigkeit sichtbar machen, den Quellentext aus der Seitenleiste in ein Overlay mit Seitenangabe verlagern.

**Architektur:** Reine statische Website ohne Build-Schritt. Die Datenaufbereitung läuft in Python (`scripts/`), die Darstellung in Vanilla-JS mit globalen Funktionen, eingebunden per `<script>`. Neu hinzu kommen ein gemeinsames Branchen-Modul (`js/branchen.js`), eine nachvollziehbare Korrekturdatei (`data/korrekturen.json`) und ein Extraktionsskript für die Speer-Seitenzahlen.

**Tech-Stack:** HTML/CSS/Vanilla-JS, Leaflet 1.9.4, Chart.js 4.4.0 (nur noch für die verbleibenden Statistik-Diagramme), Python 3 mit `openpyxl`, `pdftotext` aus poppler-utils.

## Globale Randbedingungen

- **Kein Build-Schritt, kein Paketmanager.** Neue JS-Dateien werden per `<script src="…">` vor den Seitenskripten eingebunden und exportieren globale Namen. Keine ES-Module, kein `import`/`export`.
- **Alle Nutzertexte auf Deutsch**, mit korrekten Umlauten und ß.
- **Lokaler Server erforderlich:** `python3 -m http.server 8080`, weil `fetch()` die GeoJSON lädt.
- **Pfad zur Speer-PDF wird niemals fest verdrahtet** — immer als Argument. Die Scans liegen außerhalb des Repositorys unter `/home/christos/Dokumente/Studium/MASTER_BUW/1_SoSe 25/HS Industrialisierung Bergisches Land/Zwangsarbeit/Hausarbeit Erinnerung Zwangsarbeit/Kartierung Zwangsarbeit Wuppertal/Speer_Zwangsarbeit_Scans/Speer_Zwangsarbeit_Anhang_2003_ocred_pdf24_verkleinert.pdf`.
- **`data/unternehmen.geojson` und `data/meta.json` werden nie von Hand bearbeitet** — sie sind Erzeugnisse von `scripts/build_data.py`.
- **Alle Datenkorrekturen laufen über `data/korrekturen.json`**, niemals über direkte Änderungen an `mainZwangsarbeit.xlsx` oder `unternehmenGeocodiert.geojson`.
- **Zielzahlen, die nach jedem Datenlauf gelten müssen:** 417 Unternehmen, 431 Standorte, Verortungsklassen 271 hausgenau / 146 straßengenau / 3 ungefähr / 11 ohne.
- **Es gibt keine Testinfrastruktur im Projekt.** Verifikation erfolgt über ausführbare Prüfskripte (`python3 -c`, `node -e`) gegen die erzeugten Daten sowie über benannte Sichtprüfungen im Browser.

---

## Dateistruktur

| Datei | Verantwortung |
|---|---|
| `js/branchen.js` | **neu** — einzige Quelle für Branchengruppen, Farben und die Zuordnung Einzelzweig → Gruppe. Wird von `map-app.js` und `statistiken.js` genutzt. |
| `scripts/extract_speer_seiten.py` | **neu** — liest die OCR-PDF spaltenweise, erzeugt `data/speer_seiten.json`. Einmalig bzw. bei neuem Scan auszuführen. |
| `data/korrekturen.json` | **neu** — belegte Korrekturen an Quelldaten, mit Grund und Fundstelle. |
| `data/speer_seiten.json` | **neu, erzeugt** — Zuordnung Unternehmensnummer → Seite bei Speer. |
| `scripts/build_data.py` | Korrekturen anwenden, `verortung`, `adresseHeute` und `speerSeite` ableiten. |
| `js/map-app.js` | Branchengruppen nutzen, Verortung darstellen, Sidebar-Karte umbauen, Quellenfenster steuern. |
| `js/statistiken.js` | Doppelzählung beheben, Branchendiagramm umstellen, eigene Farbtabelle entfernen. |
| `js/landing.js` | Speer-Nummer aus dem Spotlight entfernen. |
| `map.html` | Markup des Quellenfensters, Einbindung von `branchen.js`. |
| `about/statistiken.html` | Container für das neue Branchendiagramm, Einbindung von `branchen.js`. |
| `style.css` | Quellenfenster, Verortungshinweise, Balkendarstellung, überarbeitete Sidebar-Karte. |
| `CLAUDE.md` | Statistikseite, neue Felder, neue Skripte nachtragen. |

---

## Aufgabe 1: Branchen-Modul

**Dateien:**
- Anlegen: `js/branchen.js`
- Prüfskript: `scripts/pruefe_branchen.js` (neu, bleibt im Repo)

**Schnittstellen:**
- Verbraucht: nichts
- Stellt bereit:
  - `BRANCHEN_GRUPPEN` — Array von `{id: string, name: string, farbe: string, zweige: string[]}`
  - `gruppeFuerZweig(zweig: string|null) → {id, name, farbe, zweige}` — liefert immer ein Objekt; unbekannte oder leere Zweige fallen auf die Gruppe `ohne-angabe` zurück
  - `farbeFuerZweig(zweig: string|null) → string` — Hex-Farbe der zugehörigen Gruppe

- [ ] **Schritt 1: `js/branchen.js` anlegen**

```javascript
/* =========================================================
   branchen.js  –  Branchengruppen, Farben und Zuordnung
   Einzige Quelle für die Farbgebung von Karte und Statistik.
   Die 30 Einzelzweige der Quelle bleiben im Filter erhalten;
   gruppiert wird ausschließlich für die farbliche Darstellung.
   ========================================================= */

const BRANCHEN_GRUPPEN = [
  {
    id: "metall",
    name: "Metall & Metallwaren",
    farbe: "#b02418",
    zweige: ["Metallindustrie", "NE-Metallindustrie"],
  },
  {
    id: "maschinenbau",
    name: "Maschinen- & Fahrzeugbau",
    farbe: "#e07b1f",
    zweige: ["Maschinenbau", "Kraftfahrzeugindustrie", "Fahrradindustrie", "Luftfahrtindustrie"],
  },
  {
    id: "textil",
    name: "Textil",
    farbe: "#7d3c98",
    zweige: ["Textilindustrie"],
  },
  {
    id: "handel",
    name: "Handel, Verkehr & Dienste",
    farbe: "#5d6d7e",
    zweige: ["Handel", "Handel / Dienstleistungen", "Handwerk", "Logistik", "öffentliche Behörde"],
  },
  {
    id: "bau",
    name: "Bau, Steine & Erden",
    farbe: "#8a5a2b",
    zweige: ["Bauunternehmen", "Baustoffe", "Industrie der Steine und Erden", "Ziegelei"],
  },
  {
    id: "nahrung",
    name: "Nahrung, Genuss & Landwirtschaft",
    farbe: "#2f7d3a",
    zweige: ["Lebensmittelindustrie", "Genussmittelindustrie", "Gärtnerei", "Gastgewerbe"],
  },
  {
    id: "chemie",
    name: "Chemie & Kunststoff",
    farbe: "#1a6faf",
    zweige: ["Chemie", "Kunststoffindustrie", "Pyrotechnik"],
  },
  {
    id: "elektro",
    name: "Elektrotechnik",
    farbe: "#b8960c",
    zweige: ["Elektrotechnik"],
  },
  {
    id: "papier",
    name: "Papier, Druck & Holz",
    farbe: "#0e8a86",
    zweige: ["Papierindustrie", "Druckwesen", "Möbelindustrie", "Herstellung von Musikinstrumenten"],
  },
  {
    id: "ohne-angabe",
    name: "ohne Angabe",
    farbe: "#b9bfc4",
    zweige: ["unbekannt", "xxx"],
  },
];

const GRUPPE_OHNE_ANGABE = BRANCHEN_GRUPPEN[BRANCHEN_GRUPPEN.length - 1];

// Nachschlagetabelle Einzelzweig -> Gruppe, einmalig aufgebaut
const _ZWEIG_ZU_GRUPPE = {};
BRANCHEN_GRUPPEN.forEach((g) => {
  g.zweige.forEach((z) => {
    _ZWEIG_ZU_GRUPPE[z] = g;
  });
});

function gruppeFuerZweig(zweig) {
  if (!zweig) return GRUPPE_OHNE_ANGABE;
  return _ZWEIG_ZU_GRUPPE[zweig] || GRUPPE_OHNE_ANGABE;
}

function farbeFuerZweig(zweig) {
  return gruppeFuerZweig(zweig).farbe;
}

// Für Node-Prüfskripte; im Browser wirkungslos.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BRANCHEN_GRUPPEN, gruppeFuerZweig, farbeFuerZweig };
}
```

- [ ] **Schritt 2: Prüfskript `scripts/pruefe_branchen.js` anlegen**

```javascript
/* Prüft: jeder in meta.json vorkommende Industriezweig ist genau einer
   Gruppe zugeordnet, und keine Gruppe nennt einen Zweig, den es nicht gibt.
   Aufruf: node scripts/pruefe_branchen.js */
const fs = require("fs");
const path = require("path");
const { BRANCHEN_GRUPPEN, gruppeFuerZweig } = require(path.join(__dirname, "..", "js", "branchen.js"));

const meta = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "meta.json"), "utf8"));
const ausDaten = meta.industriezweige;

let fehler = 0;

// 1. Jeder Zweig aus den Daten landet in einer echten Gruppe
const unzugeordnet = ausDaten.filter((z) => gruppeFuerZweig(z).id === "ohne-angabe" && !["unbekannt", "xxx"].includes(z));
if (unzugeordnet.length) {
  console.error("FEHLER: nicht zugeordnete Zweige:", unzugeordnet);
  fehler++;
}

// 2. Kein Zweig steht in zwei Gruppen
const gesehen = new Map();
BRANCHEN_GRUPPEN.forEach((g) => {
  g.zweige.forEach((z) => {
    if (gesehen.has(z)) {
      console.error(`FEHLER: "${z}" steht in "${gesehen.get(z)}" und "${g.id}"`);
      fehler++;
    }
    gesehen.set(z, g.id);
  });
});

// 3. Keine Gruppe nennt einen Zweig, den die Daten nicht kennen
const unbekannt = [...gesehen.keys()].filter((z) => !ausDaten.includes(z));
if (unbekannt.length) {
  console.error("FEHLER: Zweige ohne Entsprechung in den Daten:", unbekannt);
  fehler++;
}

// 4. Farben sind eindeutig
const farben = BRANCHEN_GRUPPEN.map((g) => g.farbe);
if (new Set(farben).size !== farben.length) {
  console.error("FEHLER: doppelte Farbwerte");
  fehler++;
}

console.log(`${ausDaten.length} Zweige, ${BRANCHEN_GRUPPEN.length} Gruppen, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
```

- [ ] **Schritt 3: Prüfskript ausführen**

Aufruf: `node scripts/pruefe_branchen.js`
Erwartet: `30 Zweige, 10 Gruppen, 0 Fehler`, Rückgabewert 0.

- [ ] **Schritt 4: Committen**

```bash
git add js/branchen.js scripts/pruefe_branchen.js
git commit -m "Branchengruppen als gemeinsames Modul

Fasst die 30 Industriezweige zu neun farblich unterscheidbaren Gruppen
plus einer neutralen Gruppe für fehlende Angaben zusammen. Ersetzt die
wortgleich in map-app.js und statistiken.js kopierte Farbtabelle."
```

---

## Aufgabe 2: Seitenzahlen aus der Speer-PDF

**Dateien:**
- Anlegen: `scripts/extract_speer_seiten.py`
- Erzeugt: `data/speer_seiten.json`

**Schnittstellen:**
- Verbraucht: `mainZwangsarbeit.xlsx` (Spalte `Nr.`), die OCR-PDF (Pfad als Argument)
- Stellt bereit: `data/speer_seiten.json` — flaches Objekt `{"54": "514", "55": "514–515", …}`, Schlüssel sind exakt die Unternehmensnummern aus der XLSX (auch `"363a"`, `"448.1"`), Werte sind entweder eine Seitenzahl oder eine Spanne mit Halbgeviertstrich

**Warum die XLSX und nicht `unternehmen.geojson`:** Die XLSX führt **431** Nummern, das
geokodierte GeoJSON nur 417 — vierzehn Nummern (86, 118, 147, 163, 164, 175, 184, 227, 312,
346, 355, 394, 424, 458) wurden nie geokodiert und erscheinen deshalb gar nicht auf der
Website. Die Seitentabelle bildet den Katalog ab, nicht den Kartenbestand: sie ist bewusst
eine Obermenge. Werden diese vierzehn später nachgetragen, ist ihre Seitenzahl bereits da.
`build_data.py` schlägt schlicht nach und ignoriert, was es nicht braucht.

**Hintergrund für die Umsetzung:** Die PDF hat 58 Seiten, jede ist eine **Doppelseite** mit vier Textspalten à 319 pt (Seitengröße 1276 × 843 pt). Die Buchseitenzahl steht in der **Fußzeile**: linke Buchseite in den Spalten bei x = 0/319, rechte bei x = 638/957. Verifiziert: PDF-Seite 4 trägt unten `514` links und `515` rechts, und Eintrag „54. Ackermann Fahrzeugbau" steht in der zweiten Spalte, also auf Buchseite **514**.

- [ ] **Schritt 1: `scripts/extract_speer_seiten.py` anlegen**

```python
#!/usr/bin/env python3
"""
Liest die OCR-PDF des Speer-Anhangs und ordnet jeder Unternehmensnummer
die Buchseite zu, auf der ihr Katalogeintrag beginnt.

Die PDF enthält Doppelseiten mit je vier Textspalten. Die Buchseitenzahl
steht in der Fußzeile der jeweiligen Buchseitenhälfte.

Aufruf:
    python3 scripts/extract_speer_seiten.py /pfad/zu/Speer_..._ocred.pdf
"""

import collections
import json
import os
import re
import subprocess
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX_PATH = os.path.join(BASE, "mainZwangsarbeit.xlsx")
OUT_PATH = os.path.join(BASE, "data", "speer_seiten.json")

PDF_SEITEN = 58
SPALTEN_X = (0, 319, 638, 957)   # vier Textspalten
SPALTEN_BREITE = 319
SEITEN_HOEHE = 843
SEITE_MIN, SEITE_MAX = 505, 630  # plausibler Bereich der Buchseitenzahlen
NR_MIN, NR_MAX = 54, 482         # Nummernbereich von Abschnitt 16.4


def spalte_lesen(pdf, seite, x):
    """Text einer einzelnen Spalte, leere Zeilen entfernt."""
    out = subprocess.run(
        ["pdftotext", "-f", str(seite), "-l", str(seite),
         "-x", str(x), "-y", "0", "-W", str(SPALTEN_BREITE), "-H", str(SEITEN_HOEHE),
         pdf, "-"],
        capture_output=True, text=True,
    )
    return [z for z in out.stdout.split("\n") if z.strip()]


def buchseiten_bestimmen(spalten):
    """Ordnet jeder Buchseitenhälfte (pdf_seite, 'L'|'R') ihre Seitenzahl zu."""
    roh = {}
    for (p, x), zeilen in spalten.items():
        key = (p, "L" if x < 638 else "R")
        for z in zeilen[-2:]:                     # nur die untersten Zeilen
            if re.fullmatch(r"\s*\d{3}\s*", z):
                n = int(z.strip())
                if SEITE_MIN <= n <= SEITE_MAX:
                    roh[key] = n

    folge = [(p, h) for p in range(1, PDF_SEITEN + 1) for h in ("L", "R")]

    # Nur lückenlos fortlaufende Werte gelten als Anker; alles andere ist OCR-Rauschen
    anker, letzte = [], None
    for i, k in enumerate(folge):
        if k not in roh:
            continue
        s = roh[k]
        if letzte is None or (s > letzte[1] and s - letzte[1] == i - letzte[0]):
            anker.append((i, s))
            letzte = (i, s)

    if not anker:
        sys.exit("FEHLER: keine verwertbaren Seitenzahlen in der PDF gefunden.")

    buch = {}
    for i, k in enumerate(folge):
        j, s = min(anker, key=lambda t: abs(t[0] - i))
        buch[k] = s + (i - j)
    return buch


def eintraege_zuordnen(spalten, buch):
    """Eintragskopf -> Buchseite, in Lesereihenfolge der Spalten."""
    eintraege = {}
    erwartet = NR_MIN
    for p in range(1, PDF_SEITEN + 1):
        for x in SPALTEN_X:
            seite = buch[(p, "L" if x < 638 else "R")]
            for z in spalten.get((p, x), []):
                m = re.match(r"^\s*(\d{2,3})\.\s+(\S.*)$", z)
                if not m:
                    continue
                nr = int(m.group(1))
                # Kleine Lücken tolerieren, aber niemals zurückspringen:
                # so werden Datumsangaben wie "22. 4.1943" nicht als Kopf gelesen.
                if erwartet <= nr <= min(erwartet + 5, NR_MAX):
                    eintraege[nr] = seite
                    erwartet = nr + 1
    return eintraege


def unternehmensnummern():
    """Alle Nr.-Werte aus der XLSX, als String, in der Reihenfolge der Quelle."""
    import openpyxl
    wb = openpyxl.load_workbook(XLSX_PATH, read_only=True, data_only=True)
    ws = wb.active
    rows = ws.iter_rows(values_only=True)
    kopf = [str(h).strip() if h else "" for h in next(rows)]
    i_nr = kopf.index("Nr.")
    nrs = []
    for r in rows:
        v = r[i_nr]
        if v is None:
            continue
        try:
            f = float(v)
            s = str(int(f)) if f == int(f) else str(f)
        except (TypeError, ValueError):
            s = str(v).strip()
        if s not in nrs:
            nrs.append(s)
    wb.close()
    return nrs


def zahlwert(nr):
    """'363a' -> 363.0, '448.1' -> 448.1 — für die Einordnung zwischen Nachbarn."""
    m = re.match(r"^(\d+(?:\.\d+)?)", nr)
    return float(m.group(1)) if m else None


def main():
    if len(sys.argv) != 2:
        sys.exit("Aufruf: python3 scripts/extract_speer_seiten.py <pfad-zur-pdf>")
    pdf = sys.argv[1]
    if not os.path.exists(pdf):
        sys.exit(f"FEHLER: PDF nicht gefunden: {pdf}")

    print("Lese PDF spaltenweise ...")
    spalten = collections.OrderedDict()
    for p in range(1, PDF_SEITEN + 1):
        for x in SPALTEN_X:
            spalten[(p, x)] = spalte_lesen(pdf, p, x)
    print(f"  {len(spalten)} Spalten gelesen")

    buch = buchseiten_bestimmen(spalten)
    print(f"  Buchseiten {min(buch.values())}–{max(buch.values())}")

    eintraege = eintraege_zuordnen(spalten, buch)
    print(f"  {len(eintraege)} Eintragsköpfe direkt gelesen")

    if eintraege.get(54) != 514:
        sys.exit(f"FEHLER: Nr. 54 müsste auf S. 514 liegen, gefunden: {eintraege.get(54)}")

    bekannt = sorted(eintraege)
    ergebnis, direkt, erschlossen, spanne = {}, 0, 0, 0

    for nr in unternehmensnummern():
        n = zahlwert(nr)
        if n is None:
            continue
        if nr.isdigit() and int(nr) in eintraege:
            ergebnis[nr] = str(eintraege[int(nr)])
            direkt += 1
            continue
        vor = [b for b in bekannt if b < n]
        nach = [b for b in bekannt if b > n]
        if not vor or not nach:
            continue
        p, q = eintraege[vor[-1]], eintraege[nach[0]]
        if p == q:
            ergebnis[nr] = str(p)
            erschlossen += 1
        else:
            ergebnis[nr] = f"{p}–{q}"   # Halbgeviertstrich
            spanne += 1

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(ergebnis, f, ensure_ascii=False, indent=1)

    print(f"\nGeschrieben: {OUT_PATH}")
    print(f"  direkt gelesen:        {direkt}")
    print(f"  eindeutig erschlossen: {erschlossen}")
    print(f"  nur als Spanne:        {spanne}")
    print(f"  gesamt:                {len(ergebnis)}")


if __name__ == "__main__":
    main()
```

- [ ] **Schritt 2: Skript ausführen**

```bash
python3 scripts/extract_speer_seiten.py \
  "/home/christos/Dokumente/Studium/MASTER_BUW/1_SoSe 25/HS Industrialisierung Bergisches Land/Zwangsarbeit/Hausarbeit Erinnerung Zwangsarbeit/Kartierung Zwangsarbeit Wuppertal/Speer_Zwangsarbeit_Scans/Speer_Zwangsarbeit_Anhang_2003_ocred_pdf24_verkleinert.pdf"
```

Erwartet: Buchseiten 508–623, `direkt gelesen: 383`, `eindeutig erschlossen: 36`, `nur als Spanne: 12`, `gesamt: 431`. Läuft das Skript in den Abbruch „Nr. 54 müsste auf S. 514 liegen", stimmt die Spaltengeometrie nicht — dann `SPALTEN_X` gegen `pdfinfo | grep "Page size"` prüfen.

Der Lauf ruft `pdftotext` 232-mal auf einer 46-MB-PDF auf und dauert mehrere Minuten.

- [ ] **Schritt 3: Ergebnis stichprobenartig prüfen**

```bash
python3 -c "
import json
s = json.load(open('data/speer_seiten.json'))
erwartet = {'54':'514','88':'519','130':'522','156':'525','259':'536','341':'543','381':'547','403':'549','410':'550','482':'558'}
for nr, soll in erwartet.items():
    ist = s.get(nr)
    print(('OK  ' if ist == soll else 'FEHL'), f'Nr. {nr:<5} soll {soll:<8} ist {ist}')
assert all(s.get(n) == v for n, v in erwartet.items()), 'Stichprobe fehlgeschlagen'
assert len(s) == 431, f'431 Einträge erwartet, {len(s)} gefunden'
spannen = [k for k, v in s.items() if '–' in v]
assert len(spannen) == 12, f'12 Spannen erwartet, {len(spannen)} gefunden'
print(f'{len(s)} Einträge, davon {len(spannen)} Spannen — Stichprobe bestanden')
"
```

Erwartet: zehnmal `OK`, dann `Stichprobe bestanden`.

- [ ] **Schritt 4: Committen**

```bash
git add scripts/extract_speer_seiten.py data/speer_seiten.json
git commit -m "Seitenzahlen aus der Speer-PDF extrahieren

Zerlegt die Doppelseiten der OCR-PDF in ihre vier Textspalten und liest
die Buchseitenzahl aus der Fußzeile. 371 Einträge werden direkt gelesen,
34 über Nachbareinträge auf derselben Seite erschlossen, 12 bleiben eine
Zweiseitenspanne. Grundlage für den Beleg im Quellenfenster."
```

---

## Aufgabe 3: Datenkorrekturen

**Dateien:**
- Anlegen: `data/korrekturen.json`
- Ändern: `scripts/build_data.py` — neue Funktionen `lade_korrekturen()` und `korrekturen_anwenden()`, Aufruf in `main()` und `build_merged_geojson()`

**Schnittstellen:**
- Verbraucht: nichts aus vorherigen Aufgaben
- Stellt bereit:
  - `data/korrekturen.json` — Objekt `{"<nr>": [{"feld", "alt", "neu", "grund", "beleg"}, …]}`. `feld` ist entweder ein XLSX-Spaltenname (`"Adresse"`) oder das Sonderfeld `"geometrie"`. Bei `"geometrie"` sind `alt` und `neu` entweder `[lon, lat]` oder `null` (kein Standort).
  - In `build_data.py`: `lade_korrekturen() → dict`, `xlsx_korrekturen_anwenden(rows, korrekturen) → int`, `geometrie_korrektur(korrekturen, nr) → ("setzen", [lon, lat]) | ("entfernen", None) | (None, None)`

- [ ] **Schritt 1: `data/korrekturen.json` anlegen**

```json
{
  "_hinweis": "Belegte Korrekturen an den Quelldaten. Werden von scripts/build_data.py beim Erzeugen angewendet, damit mainZwangsarbeit.xlsx und unternehmenGeocodiert.geojson unverändert bleiben und die Änderungen nachvollziehbar sind.",
  "88": [
    {
      "feld": "Adresse",
      "alt": "Ascheweg 7",
      "neu": "Ascheweg 14",
      "grund": "Die Hausnummer 7 ist ein Erfassungsfehler. Speer nennt Ascheweg 14 an fünf Stellen des Eintrags: in der Adresszeile, beim Firmenlager, im CCP-Lagerkatalog und zweimal in den Arbeitgeberangaben.",
      "beleg": "Speer 2003, Nr. 88, S. 519"
    },
    {
      "feld": "geometrie",
      "alt": [29.0252635, 40.9862283],
      "neu": [7.2017262, 51.2270691],
      "grund": "In der Spalte volladresse stand der Wert 'nein' aus ExistiertHeute. Nominatim traf damit ein Bekleidungsgeschäft namens 'Nein' an der Moda Caddesi in Istanbul-Kadıköy. Neu geokodiert auf Ascheweg 14, Wuppertal-Ronsdorf, hausgenau.",
      "beleg": "Nominatim, Ascheweg 14, Ronsdorf, Wuppertal"
    }
  ],
  "341": [
    {
      "feld": "Adresse",
      "alt": "Vohwinkeler Str. 154",
      "neu": "Uellendahler Str. 353",
      "grund": "Speer nennt für Wilhelm Quante die Uellendahler Str. 353 in Elberfeld. Die Geokodierung sitzt bereits dort richtig, nur die Adressspalte widersprach ihr.",
      "beleg": "Speer 2003, Nr. 341, S. 543"
    }
  ],
  "381": [
    {
      "feld": "Adresse",
      "alt": "Neuenteich 85-89",
      "neu": "Vereinstr. 14",
      "grund": "Speer nennt für Peter Ludwig Schmidt die Vereinstr. 14 in Elberfeld. Die Geokodierung sitzt bereits dort richtig, nur die Adressspalte widersprach ihr.",
      "beleg": "Speer 2003, Nr. 381, S. 547"
    }
  ],
  "394": [
    {
      "feld": "Adresse",
      "alt": null,
      "neu": "Hauptstr. 23",
      "grund": "Die Adressspalte war leer, obwohl die Adresse in volladresse steht und sich mit Speer deckt. Hinweis: Nr. 394 ist eine der vierzehn nie geokodierten Nummern und erscheint nicht in unternehmen.geojson. Die Korrektur bleibt trotzdem, damit sie greift, sobald der Standort nachgetragen wird.",
      "beleg": "Speer 2003, Nr. 394"
    }
  ],
  "410": [
    {
      "feld": "geometrie",
      "alt": [7.1441321, 51.2651929],
      "neu": null,
      "grund": "Speer nennt 'Nordstr. 27'. Elberfeld-Nordstadt hat heute eine Nordstraße und eine Neue Nordstraße, rund 500 m auseinander; Nominatim wählte die Neue Nordstraße. Ohne historisches Adressbuch ist nicht entscheidbar, welche gemeint ist. Lieber keine Verortung als eine falsche.",
      "beleg": "Speer 2003, Nr. 410, S. 550"
    }
  ]
}
```

- [ ] **Schritt 2: Korrekturlogik in `scripts/build_data.py` ergänzen**

Nach der Konstante `OUT_META` (etwa Zeile 21) den Pfad ergänzen:

```python
KORREKTUREN_PATH = os.path.join(BASE, "data", "korrekturen.json")
```

Vor `build_merged_geojson()` diese drei Funktionen einfügen:

```python
def lade_korrekturen():
    """Liest data/korrekturen.json. Fehlt die Datei, wird ohne Korrekturen gebaut."""
    if not os.path.exists(KORREKTUREN_PATH):
        print("  (keine korrekturen.json gefunden — ungeändert)")
        return {}
    with open(KORREKTUREN_PATH, "r", encoding="utf-8") as f:
        roh = json.load(f)
    return {k: v for k, v in roh.items() if not k.startswith("_")}


def xlsx_korrekturen_anwenden(rows, korrekturen):
    """Setzt korrigierte Spaltenwerte auf allen Zeilen der jeweiligen Nr.

    Gibt die Zahl der geänderten Zellen zurück. Weicht der vorgefundene Wert
    vom in 'alt' notierten ab, wird gewarnt und nicht geändert -- so fällt auf,
    wenn die XLSX inzwischen selbst korrigiert wurde.
    """
    geaendert = 0
    for row in rows:
        nr = nr_key(row.get("Nr."))
        for eintrag in korrekturen.get(nr, []):
            feld = eintrag["feld"]
            if feld == "geometrie":
                continue
            ist = safe_str(row.get(feld))
            soll_alt = safe_str(eintrag.get("alt"))
            if ist != soll_alt:
                print(f"  WARNUNG: Nr. {nr}, Feld {feld}: erwartet {soll_alt!r}, "
                      f"vorgefunden {ist!r} -- Korrektur übersprungen")
                continue
            row[feld] = eintrag["neu"]
            geaendert += 1
    return geaendert


def geometrie_korrektur(korrekturen, nr):
    """('setzen', [lon, lat]) | ('entfernen', None) | (None, None)"""
    for eintrag in korrekturen.get(nr, []):
        if eintrag["feld"] != "geometrie":
            continue
        neu = eintrag.get("neu")
        return ("entfernen", None) if neu is None else ("setzen", neu)
    return (None, None)
```

- [ ] **Schritt 3: Korrekturen in `main()` und `build_merged_geojson()` einhängen**

In `build_merged_geojson(xlsx_rows, geo_data)` die Signatur um den Parameter erweitern:

```python
def build_merged_geojson(xlsx_rows, geo_data, korrekturen):
```

In derselben Funktion, im Block „--- 3. Merged Features erzeugen ---", direkt nach `geom = feat.get("geometry")` einfügen:

```python
        aktion, koord = geometrie_korrektur(korrekturen, nr)
        if aktion == "entfernen":
            geom = None
        elif aktion == "setzen":
            geom = {"type": "Point", "coordinates": koord}
```

In `main()` nach `print(f"  {len(geo_data['features'])} Features geladen")` einfügen:

```python
    print("Wende Korrekturen an...")
    korrekturen = lade_korrekturen()
    n = xlsx_korrekturen_anwenden(xlsx_rows, korrekturen)
    print(f"  {n} Zellen korrigiert, "
          f"{sum(1 for eintraege in korrekturen.values() for e in eintraege if e['feld'] == 'geometrie')} "
          f"Geometrie-Korrekturen vorgemerkt")
```

und den Aufruf anpassen:

```python
    merged = build_merged_geojson(xlsx_rows, geo_data, korrekturen)
```

- [ ] **Schritt 4: Daten neu bauen**

Aufruf: `python3 scripts/build_data.py`
Erwartet: `4 Zellen korrigiert, 2 Geometrie-Korrekturen vorgemerkt`, danach unverändert `417 Unternehmen`, `431 Features erzeugt`, keine WARNUNG-Zeile.

- [ ] **Schritt 5: Wirkung prüfen**

```bash
python3 -c "
import json
g = json.load(open('data/unternehmen.geojson'))
p = {f['properties']['nr']: f for f in g['features'] if f['properties']['standortNr'] == 1}
fehler = 0

def adresse_ist(nr, soll):
    global fehler
    ist = p[nr]['properties']['adresse']
    ok = ist == soll
    fehler += not ok
    print(('OK  ' if ok else 'FEHL'), f'Nr. {nr:<5} Adresse {ist!r}')

adresse_ist('88',  'Ascheweg 14')
adresse_ist('341', 'Uellendahler Str. 353')
adresse_ist('381', 'Vereinstr. 14')
# Nr. 394 fehlt bewusst: das Unternehmen ist nicht geokodiert und erscheint
# deshalb gar nicht in unternehmen.geojson. Die Korrektur greift trotzdem an
# der XLSX-Zeile und wird von build_data.py mitgezählt.
assert '394' not in p, 'Nr. 394 ist unerwartet in der Karte aufgetaucht'
print('OK   Nr. 394   nicht geokodiert, Korrektur ohne Kartenwirkung')

# Nr. 88 muss von Istanbul nach Ronsdorf gewandert sein
lon, lat = p['88']['geometry']['coordinates']
ok = abs(lat - 51.2270691) < 1e-4 and abs(lon - 7.2017262) < 1e-4
fehler += not ok
print(('OK  ' if ok else 'FEHL'), f'Nr. 88    Koordinate {lat:.5f}, {lon:.5f}')

# Nr. 410 wird nicht mehr verortet
ok = p['410']['geometry'] is None
fehler += not ok
print(('OK  ' if ok else 'FEHL'), f'Nr. 410   Geometrie {p[\"410\"][\"geometry\"]!r}')

# Die anderen Geometrien blieben unangetastet
for nr, soll in (('341', (51.2788329, 7.1598599)), ('381', (51.2531056, 7.1530168))):
    lon, lat = p[nr]['geometry']['coordinates']
    ok = abs(lat - soll[0]) < 1e-4 and abs(lon - soll[1]) < 1e-4
    fehler += not ok
    print(('OK  ' if ok else 'FEHL'), f'Nr. {nr:<5} Koordinate unverändert {lat:.5f}, {lon:.5f}')

print()
print('Alle Korrekturen wirksam' if not fehler else f'{fehler} FEHLER')
raise SystemExit(1 if fehler else 0)
"
```

Erwartet: acht `OK`-Zeilen, dann `Alle Korrekturen wirksam`. Nr. 88 muss bei Breite ≈ 51.227 und Länge ≈ 7.202 liegen — also in Ronsdorf und nicht mehr in Istanbul.

- [ ] **Schritt 6: Committen**

```bash
git add data/korrekturen.json scripts/build_data.py data/unternehmen.geojson data/meta.json
git commit -m "Belegte Datenkorrekturen über korrekturen.json

Nr. 88 war nach Istanbul geokodiert, weil in der Spalte volladresse der
Wert 'nein' aus ExistiertHeute stand; zusätzlich war die Hausnummer falsch.
Bei Nr. 341 und 381 widersprach die Adressspalte der korrekt gesetzten
Geokodierung. Nr. 410 wird nicht mehr verortet, weil zwischen Nordstraße
und Neuer Nordstraße nicht entscheidbar ist.

Die Korrekturen liegen in einer eigenen Datei mit Grund und Fundstelle,
damit die Quelldateien unverändert bleiben."
```

---

## Aufgabe 4: Verortung, moderne Adresse und Seitenzahl in die Daten

**Dateien:**
- Ändern: `scripts/build_data.py` — neue Funktionen `verortungsstufe()`, `moderne_adresse()`, `lade_speer_seiten()`; drei neue Eigenschaften in `new_props`
- Ändern: `scripts/build_data.py` — `build_meta()` um eine Verortungsstatistik erweitern

**Schnittstellen:**
- Verbraucht: `data/speer_seiten.json` aus Aufgabe 2, Korrekturlogik aus Aufgabe 3
- Stellt bereit: drei neue Eigenschaften je Feature in `data/unternehmen.geojson`:
  - `verortung: "hausgenau" | "strassengenau" | "ungefaehr" | "ohne"`
  - `adresseHeute: string | null` — gesetzt nur, wenn der heutige Straßenname vom historischen abweicht
  - `speerSeite: string | null` — z. B. `"514"` oder `"514–515"`
  - sowie `meta.stats.verortung` — Objekt mit den vier Klassenzahlen

- [ ] **Schritt 1: Ableitungsfunktionen in `scripts/build_data.py` ergänzen**

Nach der Konstante `KORREKTUREN_PATH` ergänzen:

```python
SPEER_SEITEN_PATH = os.path.join(BASE, "data", "speer_seiten.json")

# Nominatim-Treffer dieser Art benennen nur einen Ortsteil, kein Gebäude
GROBE_TREFFER = {
    ("place", "hamlet"),
    ("place", "suburb"),
    ("place", "neighbourhood"),
    ("place", "village"),
    ("boundary", "administrative"),
}
```

Vor `build_merged_geojson()` einfügen:

```python
def verortungsstufe(props, hat_geometrie):
    """Wie genau ist der Standort bekannt?

    hausgenau     -- Gebäude oder benannter Ort mit Hausnummer
    strassengenau -- Nominatim traf nur die Straße (class = highway)
    ungefaehr     -- nur ein Ortsteil
    ohne          -- keine Geometrie
    """
    if not hat_geometrie:
        return "ohne"
    c, t = props.get("class"), props.get("type")
    if (c, t) in GROBE_TREFFER:
        return "ungefaehr"
    if c == "highway":
        return "strassengenau"
    return "hausgenau"


def _strassenname(wert):
    """Normalisiert einen Straßennamen für den Vergleich historisch/heute."""
    s = (wert or "").lower()
    s = re.sub(r"\s*\d.*$", "", s)          # Hausnummer und alles danach weg
    s = s.replace("straße", "str").replace("strasse", "str").replace("str.", "str")
    s = re.sub(r"([a-zä-ü])\1", r"\1", s)   # Doppelkonsonanten vereinheitlichen
    return re.sub(r"[^a-zä-ü0-9]", "", s)


def moderne_adresse(historisch, props):
    """Heutige Schreibweise -- aber nur, wenn sie vom Überlieferten abweicht.

    Reine Schreibvarianten (Warndstraße/Warndtstraße, Kemmanstr./Kemmannstraße)
    werden unterdrückt, echte Umbenennungen bleiben sichtbar.
    """
    heute = safe_str(props.get("road"))
    if not heute or not historisch:
        return None
    if _strassenname(historisch) == _strassenname(heute):
        return None
    teile = [heute]
    plz = safe_str(props.get("postcode"))
    ort = safe_str(props.get("city_district")) or safe_str(props.get("city"))
    if plz and ort:
        teile.append(f"{plz} Wuppertal-{ort}" if ort != "Wuppertal" else f"{plz} Wuppertal")
    elif ort:
        teile.append(ort)
    return ", ".join(teile)


def lade_speer_seiten():
    """Liest data/speer_seiten.json. Fehlt sie, entfällt die Seitenangabe."""
    if not os.path.exists(SPEER_SEITEN_PATH):
        print("  (keine speer_seiten.json gefunden — Quellenfenster ohne Seitenangabe)")
        return {}
    with open(SPEER_SEITEN_PATH, "r", encoding="utf-8") as f:
        return json.load(f)
```

Ganz oben bei den Importen `re` ergänzen, falls noch nicht vorhanden:

```python
import re
```

- [ ] **Schritt 2: Die drei Eigenschaften in `new_props` aufnehmen**

`build_merged_geojson()` erhält einen weiteren Parameter:

```python
def build_merged_geojson(xlsx_rows, geo_data, korrekturen, speer_seiten):
```

Im Block „--- 3. Merged Features erzeugen ---", nach der Geometrie-Korrektur und vor `new_props = {`, einfügen:

```python
        stufe = verortungsstufe(props, geom is not None)
        adr_heute = moderne_adresse(adresse, props) if geom is not None else None
```

In `new_props` nach `"stadtteil": stadtteil,` ergänzen:

```python
            "verortung": stufe,
            "adresseHeute": adr_heute,
            "speerSeite": speer_seiten.get(nr),
```

In `main()` den Aufruf anpassen:

```python
    speer_seiten = lade_speer_seiten()
    merged = build_merged_geojson(xlsx_rows, geo_data, korrekturen, speer_seiten)
```

- [ ] **Schritt 3: Verortungsstatistik in `build_meta()` ergänzen**

In `build_meta()` vor der Schleife einfügen:

```python
    verortung_zaehler = {"hausgenau": 0, "strassengenau": 0, "ungefaehr": 0, "ohne": 0}
```

In der Schleife über `features`, nach `p = feat["properties"]`:

```python
        stufe = p.get("verortung")
        if stufe in verortung_zaehler:
            verortung_zaehler[stufe] += 1
```

Im `return`-Dictionary innerhalb von `"stats"` ergänzen:

```python
            "verortung": verortung_zaehler,
```

- [ ] **Schritt 4: Daten neu bauen und Zahlen prüfen**

Aufruf: `python3 scripts/build_data.py`

```bash
python3 -c "
import json
m = json.load(open('data/meta.json'))
v = m['stats']['verortung']
soll = {'hausgenau': 271, 'strassengenau': 146, 'ungefaehr': 3, 'ohne': 11}
for k, s in soll.items():
    print(('OK  ' if v[k] == s else 'FEHL'), f'{k:<15} soll {s:<5} ist {v[k]}')
assert v == soll, f'Verortungsklassen weichen ab: {v}'
assert sum(v.values()) == 431
print('Verortungsklassen stimmen')

g = json.load(open('data/unternehmen.geojson'))
props = {f['properties']['nr']: f['properties'] for f in g['features'] if f['properties']['standortNr'] == 1}
assert props['54']['speerSeite'] == '514', props['54']['speerSeite']
assert props['410']['verortung'] == 'ohne'
assert props['156']['adresseHeute'] and 'Edith-Stein' in props['156']['adresseHeute'], props['156']['adresseHeute']
assert props['54']['adresseHeute'] is None, props['54']['adresseHeute']
assert props['108']['adresseHeute'] is None, 'Kemmanstr./Kemmannstraße ist eine Schreibvariante, keine Umbenennung'
mit = sum(1 for p in props.values() if p['adresseHeute'])
print(f'Moderne Adresse gesetzt bei {mit} Unternehmen')
print('Alle Stichproben bestanden')
"
```

Erwartet: vier `OK`-Zeilen, `Verortungsklassen stimmen`, eine Zahl zwischen 10 und 25 bei „Moderne Adresse gesetzt", `Alle Stichproben bestanden`.

- [ ] **Schritt 5: Committen**

```bash
git add scripts/build_data.py data/unternehmen.geojson data/meta.json
git commit -m "Verortungsgenauigkeit, moderne Adresse und Seitenzahl in die Daten

Leitet aus class/type der Nominatim-Antwort ab, wie genau ein Standort
bekannt ist: 271 hausgenau, 146 nur straßengenau, 3 ungefähr, 11 ohne.
Die heutige Adresse wird nur gesetzt, wenn der Straßenname wirklich
abweicht -- Schreibvarianten werden über einen Normalisierungsvergleich
unterdrückt, echte Umbenennungen wie Lettow-Vorbeck-Straße zu
Edith-Stein-Straße bleiben sichtbar."
```

---

## Aufgabe 5: Branchengruppen in der Karte

**Dateien:**
- Ändern: `map.html` — `<script src="js/branchen.js">` vor `map-app.js`
- Ändern: `js/map-app.js:29-74` — `INDUSTRY_COLORS` und `colorForIndustrie()` entfernen, `buildIndustryLegend()` (Zeilen 383–414) auf Gruppen umstellen
- Ändern: `style.css` — Legendeneintrag mit Gruppenname

**Schnittstellen:**
- Verbraucht: `BRANCHEN_GRUPPEN`, `farbeFuerZweig()` aus Aufgabe 1
- Stellt bereit: nichts Neues

- [ ] **Schritt 1: `branchen.js` in `map.html` einbinden**

In `map.html` die letzte Zeile vor `</body>` ersetzen:

```html
<script src="js/branchen.js"></script>
<script src="js/map-app.js"></script>
```

- [ ] **Schritt 2: Alte Farbtabelle aus `map-app.js` entfernen**

In `js/map-app.js` den gesamten Block von `// Farben je Industriezweig (thematisch gruppiert)` bis zum Ende von `colorForIndustrie()` (Zeilen 28–74) löschen und durch diesen Kommentar ersetzen:

```javascript
// Farben kommen aus js/branchen.js: farbeFuerZweig() und BRANCHEN_GRUPPEN
```

Alle Aufrufe von `colorForIndustrie(` durch `farbeFuerZweig(` ersetzen — sie stehen in `buildMarkers()` und in `buildList()`.

- [ ] **Schritt 3: `buildIndustryLegend()` auf Gruppen umstellen**

`buildIndustryLegend()` vollständig ersetzen durch:

```javascript
// ---- Legende der Branchengruppen ----
function buildIndustryLegend() {
  const legend = L.control({ position: "bottomleft" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend-control legend-industry");
    L.DomEvent.disableScrollPropagation(div);
    L.DomEvent.disableClickPropagation(div);

    div.innerHTML =
      '<h4 class="legend-industry-toggle" title="Ein-/ausklappen">Branchen &#9660;</h4>';
    const listDiv = L.DomUtil.create("div", "legend-industry-list", div);

    BRANCHEN_GRUPPEN.forEach((g) => {
      const row = document.createElement("div");
      row.className = "legend-row";
      row.title = g.zweige.join(", ");
      row.innerHTML =
        `<span class="legend-circle" style="width:12px;height:12px;background:${g.farbe};"></span>` +
        `<span>${g.name}</span>`;
      listDiv.appendChild(row);
    });

    const toggle = div.querySelector(".legend-industry-toggle");
    toggle.addEventListener("click", () => {
      const offen = listDiv.style.display !== "none";
      listDiv.style.display = offen ? "none" : "";
      toggle.innerHTML = `Branchen ${offen ? "&#9654;" : "&#9660;"}`;
    });

    return div;
  };

  legend.addTo(map);
}
```

- [ ] **Schritt 4: CSS für den Legendenkopf ergänzen**

Ans Ende von `style.css` anfügen:

```css
/* =============================================
   KARTE – BRANCHENLEGENDE
============================================= */
.legend-industry-toggle {
  cursor: pointer;
  user-select: none;
}

.legend-industry .legend-row {
  cursor: help;
}
```

Falls die alten Inline-Styles `style="cursor:pointer;user-select:none;"` im Legenden-Markup noch vorhanden sind, wurden sie in Schritt 3 bereits mitentfernt.

- [ ] **Schritt 5: Sichtprüfung im Browser**

```bash
python3 -m http.server 8080
```

`http://localhost:8080/map.html` öffnen. Erwartet:
1. Die Legende unten links heißt „Branchen" und listet **zehn** Zeilen, endend mit „ohne Angabe".
2. Beim Überfahren einer Zeile erscheint als Tooltip die Liste der enthaltenen Einzelzweige.
3. Die Marker tragen nur noch die zehn Gruppenfarben — Textilbetriebe violett, Metall rot, Maschinenbau orange.
4. Die Browser-Konsole meldet keine Fehler.

- [ ] **Schritt 6: Committen**

```bash
git add map.html js/map-app.js style.css
git commit -m "Karte auf neun Branchengruppen umstellen

Ersetzt die 30 kaum unterscheidbaren Einzelfarben. Die Legende nennt
die Gruppen und zeigt die enthaltenen Zweige als Tooltip; im Filter
bleiben alle 30 Zweige einzeln wählbar."
```

---

## Aufgabe 6: Verortungsgenauigkeit auf der Karte

**Dateien:**
- Ändern: `js/map-app.js` — `buildMarkers()`, `dimInactiveMarkers()`, `highlightMarkers()`, `buildLegend()`
- Ändern: `style.css` — Verortungsblock der Legende

**Schnittstellen:**
- Verbraucht: `verortung` aus Aufgabe 4
- Stellt bereit: Markerstil-Helfer `markerGrundstil(marker)` — liefert das Style-Objekt für den Ruhezustand eines Markers, damit Hover und Ausgrauen ihn nicht überschreiben

- [ ] **Schritt 1: Markerstil-Helfer und Markererzeugung anpassen**

In `js/map-app.js` vor `buildMarkers()` einfügen:

```javascript
// ---- Markerstil je nach Verortungsgenauigkeit ----
// Straßen- und ortsteilgenaue Standorte bekommen einen gestrichelten Rand
// und blassere Füllung: die Karte soll nicht mehr Genauigkeit behaupten,
// als die Quelle hergibt.
function istUnsicher(verortung) {
  return verortung === "strassengenau" || verortung === "ungefaehr";
}

function markerGrundstil(m) {
  if (istUnsicher(m._verortung)) {
    return {
      fillColor: m._izColor,
      color: m._izColor,
      weight: 2,
      dashArray: "5 4",
      fillOpacity: 0.45,
    };
  }
  return {
    fillColor: m._izColor,
    color: "#fff",
    weight: 1.5,
    dashArray: null,
    fillOpacity: 0.85,
  };
}
```

In `buildMarkers()` die Markererzeugung ersetzen — aus

```javascript
      const marker = L.circleMarker(latlng, {
        radius: MIN_RADIUS,
        fillColor: izColor,
        color: "#fff",
        weight: 1.5,
        fillOpacity: 0.85,
      }).addTo(map);

      marker._companyNr = c.nr;
      marker._standortNr = loc.standortNr;
      marker._baseRadius = MIN_RADIUS;
      marker._izColor = izColor;
```

wird

```javascript
      const marker = L.circleMarker(latlng, { radius: MIN_RADIUS }).addTo(map);

      marker._companyNr = c.nr;
      marker._standortNr = loc.standortNr;
      marker._baseRadius = MIN_RADIUS;
      marker._izColor = izColor;
      marker._verortung = loc.verortung;
      marker.setStyle(markerGrundstil(marker));
```

- [ ] **Schritt 2: `verortung` in die Standortobjekte übernehmen**

In `buildCompanies()` das Objekt in `byNr[nr].locations.push({…})` um zwei Felder erweitern:

```javascript
    byNr[nr].locations.push({
      standortNr: p.standortNr,
      geometry: f.geometry,
      adresse: p.adresse,
      ort: p.ort,
      stadtteil: p.stadtteil,
      verortung: p.verortung,
      adresseHeute: p.adresseHeute,
    });
```

Zusätzlich im Company-Objekt `speerSeite` mitführen — in dem Block, der `byNr[nr]` anlegt, nach `speerText: p.speerText,` ergänzen:

```javascript
        speerSeite: p.speerSeite,
```

- [ ] **Schritt 3: Ausgrauen und Hover auf den Grundstil stützen**

In `dimInactiveMarkers()` die drei Zweige ersetzen:

```javascript
    if (!activeNr) {
      markers.forEach((m) => m.setStyle(markerGrundstil(m)));
    } else if (c.nr === activeNr) {
      markers.forEach((m) => {
        m.setStyle(Object.assign(markerGrundstil(m), {
          radius: m._baseRadius + 3,
          weight: 3,
          fillOpacity: istUnsicher(m._verortung) ? 0.6 : 1.0,
        }));
        m.bringToFront();
      });
    } else {
      markers.forEach((m) => {
        m.setStyle(Object.assign(markerGrundstil(m), {
          fillOpacity: 0.12,
          weight: 0.5,
          color: "#ccc",
        }));
      });
    }
```

In `highlightMarkers()` beide Zweige ersetzen:

```javascript
    if (on) {
      m.setStyle(Object.assign(markerGrundstil(m), {
        radius: m._baseRadius + 2,
        weight: 2.5,
      }));
      m.bringToFront();
    } else if (activeNr) {
      m.setStyle(Object.assign(markerGrundstil(m), {
        fillOpacity: 0.12,
        weight: 0.5,
        color: "#ccc",
      }));
    } else {
      m.setStyle(Object.assign(markerGrundstil(m), { radius: m._baseRadius }));
    }
```

- [ ] **Schritt 4: Legende um den Verortungsblock erweitern**

In `buildLegend()` vor `return div;` einfügen:

```javascript
    div.innerHTML += `
      <h4 class="legend-sub">Verortung</h4>
      <div class="legend-row">
        <span class="legend-circle legend-verortung-genau"></span>
        <span>hausgenau</span>
      </div>
      <div class="legend-row">
        <span class="legend-circle legend-verortung-unsicher"></span>
        <span>nur straßengenau</span>
      </div>`;
```

- [ ] **Schritt 5: CSS ergänzen**

Ans Ende von `style.css` anfügen:

```css
/* =============================================
   KARTE – LEGENDE VERORTUNG
============================================= */
.legend-control h4.legend-sub {
  margin-top: 8px;
  padding-top: 7px;
  border-top: 1px solid #e5e5e5;
}

.legend-circle.legend-verortung-genau,
.legend-circle.legend-verortung-unsicher {
  width: 15px;
  height: 15px;
  background: #777;
}

.legend-circle.legend-verortung-genau {
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px #ccc;
}

.legend-circle.legend-verortung-unsicher {
  background: rgba(119, 119, 119, 0.45);
  border: 2px dashed #777;
  box-shadow: none;
}
```

- [ ] **Schritt 6: Sichtprüfung im Browser**

`http://localhost:8080/map.html` neu laden. Erwartet:
1. Ein knappes Drittel der Marker hat einen gestrichelten Rand in der Branchenfarbe und ist sichtbar blasser.
2. Die Legende unten rechts zeigt unter den Größenstufen einen Block „Verortung" mit zwei Einträgen.
3. Klick auf einen gestrichelten Marker hebt ihn hervor, ohne den gestrichelten Rand zu verlieren.
4. Klick auf leere Kartenfläche stellt bei allen Markern den Grundstil wieder her — auch bei den gestrichelten.
5. Beispiel zum Nachprüfen: „Wilhelm Hermes KG" (Beule 8 b) ist gestrichelt, „Ackermann Fahrzeugbau" nicht.

- [ ] **Schritt 7: Committen**

```bash
git add js/map-app.js style.css
git commit -m "Verortungsgenauigkeit auf der Karte sichtbar machen

146 der 431 Standorte sind nur straßengenau bekannt, wurden bisher aber
wie hausgenaue dargestellt. Sie bekommen einen gestrichelten Rand und
blassere Füllung; die Legende erklärt den Unterschied."
```

---

## Aufgabe 7: Quellenfenster

**Dateien:**
- Ändern: `map.html` — Dialog-Markup vor `</body>`
- Ändern: `js/map-app.js` — `initQuellenfenster()`, `oeffneQuellenfenster()`, `schliesseQuellenfenster()`; alter Aufklapp-Block in `buildList()` entfällt
- Ändern: `style.css` — Dialog, Schließen aus dem Sidebar-Bereich `.card-speer`

**Schnittstellen:**
- Verbraucht: `speerText` und `speerSeite` aus dem Company-Objekt (Aufgabe 6, Schritt 2)
- Stellt bereit: `oeffneQuellenfenster(nr, ausloeser)` — `ausloeser` ist das Element, auf das der Fokus beim Schließen zurückkehrt

- [ ] **Schritt 1: Dialog-Markup in `map.html` ergänzen**

Unmittelbar vor `<script src="js/branchen.js"></script>` einfügen:

```html
<div id="quellen-overlay" class="quellen-overlay" hidden>
  <div class="quellen-dialog" role="dialog" aria-modal="true" aria-labelledby="quellen-titel">
    <div class="quellen-kopf">
      <div>
        <div class="quellen-label">Quellen nach Speer (2003)</div>
        <h3 id="quellen-titel" class="quellen-name"></h3>
        <div id="quellen-beleg" class="quellen-beleg"></div>
      </div>
      <button id="quellen-schliessen" class="quellen-schliessen" title="Schließen" aria-label="Schließen">&#10005;</button>
    </div>
    <div id="quellen-text" class="quellen-text"></div>
  </div>
</div>
```

- [ ] **Schritt 2: Aufklapp-Block aus `buildList()` durch einen Auslöser ersetzen**

In `js/map-app.js`, in `buildList()`, den Block, der mit `// SpeerText section` beginnt, bis einschließlich `card.innerHTML = …` so ersetzen:

```javascript
    // Auslöser für das Quellenfenster — der Quellentext bekommt Platz
    // über der Karte statt in der 35 %-Spalte
    let speerHtml = "";
    if (c.speerText) {
      speerHtml = `<div class="card-speer">
        <button class="quellen-btn" data-nr="${c.nr}">&rarr; Quellen nach Speer (2003)</button>
      </div>`;
    }

    card.innerHTML = headerHtml + metaHtml + noGeoHtml + countHtml + recordsHtml + speerHtml;
```

Den darauf folgenden Block, der mit `// Fill SpeerText via textContent` beginnt und den `.speer-toggle`-Listener registriert, vollständig ersetzen durch:

```javascript
    const quellenBtn = card.querySelector(".quellen-btn");
    if (quellenBtn) {
      quellenBtn.addEventListener("click", (e) => {
        e.stopPropagation();          // Kartenklick soll nicht mitfeuern
        oeffneQuellenfenster(c.nr, quellenBtn);
      });
    }
```

- [ ] **Schritt 3: Steuerung des Quellenfensters ergänzen**

Ans Ende von `js/map-app.js` anfügen:

```javascript
/* =========================================================
   Quellenfenster
   Der Quellentext ist zu umfangreich für die Seitenleiste --
   er bekommt ein eigenes Fenster über der Karte.
   ========================================================= */

let quellenAusloeser = null;

function oeffneQuellenfenster(nr, ausloeser) {
  const c = companies[nr];
  if (!c || !c.speerText) return;

  document.getElementById("quellen-titel").textContent = c.name;

  const beleg = c.speerSeite
    ? `Speer 2003, Nr. ${nr}, S. ${c.speerSeite}`
    : `Speer 2003, Nr. ${nr}`;
  document.getElementById("quellen-beleg").textContent = beleg;

  // textContent statt innerHTML: der Quellentext ist unbereinigt
  const textEl = document.getElementById("quellen-text");
  textEl.textContent = c.speerText;
  textEl.scrollTop = 0;

  const overlay = document.getElementById("quellen-overlay");
  overlay.hidden = false;

  quellenAusloeser = ausloeser || null;
  document.getElementById("quellen-schliessen").focus();
}

function schliesseQuellenfenster() {
  const overlay = document.getElementById("quellen-overlay");
  if (overlay.hidden) return;
  overlay.hidden = true;
  if (quellenAusloeser) {
    quellenAusloeser.focus();
    quellenAusloeser = null;
  }
}

function initQuellenfenster() {
  const overlay = document.getElementById("quellen-overlay");

  document
    .getElementById("quellen-schliessen")
    .addEventListener("click", schliesseQuellenfenster);

  // Klick auf den abgedunkelten Hintergrund, nicht auf den Dialog selbst
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) schliesseQuellenfenster();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") schliesseQuellenfenster();
  });
}
```

In der Initialisierungskette in `DOMContentLoaded` `initQuellenfenster();` vor `handleDeepLink();` einfügen.

- [ ] **Schritt 4: CSS für das Quellenfenster**

Den bestehenden Block `KARTE – SPEER-TEXT` in `style.css` (`.card-speer`, `.speer-toggle`, `.speer-arrow`, `.speer-content` samt zugehöriger Regeln) löschen und durch Folgendes ersetzen:

```css
/* =============================================
   KARTE – QUELLENFENSTER
============================================= */
.card-speer {
  margin-top: 6px;
  border-top: 1px solid #eee;
  padding-top: 6px;
}

.quellen-btn {
  background: none;
  border: none;
  color: #b02418;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  padding: 0;
  text-align: left;
}

.quellen-btn:hover {
  text-decoration: underline;
}

.quellen-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.42);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.quellen-overlay[hidden] {
  display: none;
}

.quellen-dialog {
  background: #fff;
  border-radius: 5px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  width: min(620px, 100%);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.quellen-kopf {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid #e8e8e8;
}

.quellen-label {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #999;
}

.quellen-name {
  font-size: 15px;
  font-weight: 600;
  color: #111;
  margin: 2px 0 0;
}

.quellen-beleg {
  font-size: 11.5px;
  color: #888;
  margin-top: 2px;
}

.quellen-schliessen {
  background: none;
  border: none;
  color: #999;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
}

.quellen-schliessen:hover {
  background: #f0f0f0;
  color: #333;
}

.quellen-text {
  padding: 14px 18px 18px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 12.5px;
  line-height: 1.75;
  color: #333;
  white-space: pre-wrap;
  overflow-y: auto;
}
```

- [ ] **Schritt 5: Sichtprüfung im Browser**

`http://localhost:8080/map.html` neu laden. Erwartet:
1. In der Sidebar steht bei Einträgen mit Quellentext „→ Quellen nach Speer (2003)" statt des Aufklappers „Quellentext".
2. Ein Klick darauf öffnet das Fenster über der Karte; die Sidebar bleibt unverändert breit.
3. Bei Ackermann Fahrzeugbau steht im Kopf „Speer 2003, Nr. 54, S. 514".
4. Der Quellentext behält seine Zeilenumbrüche (`white-space: pre-wrap`).
5. Schließen funktioniert über ✕, Klick auf den dunklen Hintergrund und Escape.
6. Nach dem Schließen liegt der Tastaturfokus wieder auf dem auslösenden Button — mit `Tab` prüfbar.
7. Der Klick auf den Auslöser wählt das Unternehmen **nicht** zusätzlich aus und lässt die Karte nicht springen.

- [ ] **Schritt 6: Committen**

```bash
git add map.html js/map-app.js style.css
git commit -m "Quellentext aus der Seitenleiste in ein eigenes Fenster

Der Quellentext umfasst bis zu vierzig Zeilen und wurde bisher in einer
35-Prozent-Spalte aufgeklappt. Er bekommt nun ein Fenster über der Karte,
betitelt 'Quellen nach Speer (2003)' und mit Seitenangabe als Beleg.
Bedienbar per Maus, Escape und Tastaturfokus."
```

---

## Aufgabe 8: Sidebar-Karte neu aufbauen

**Dateien:**
- Ändern: `js/map-app.js` — `buildList()`, `makePopup()`, `updateSidebarCounts()`
- Ändern: `style.css` — Karten- und Recordsdarstellung

**Schnittstellen:**
- Verbraucht: `verortung`, `adresseHeute` aus Aufgabe 4; `gruppeFuerZweig()` aus Aufgabe 1
- Stellt bereit: `verortungsHinweis(location, hatAdresse) → string` — der Klartext zur Verortung; `formatRecord(r) → string` — eine Zeile Zählung

- [ ] **Schritt 1: Hilfsfunktionen ergänzen**

In `js/map-app.js` vor `buildList()` einfügen:

```javascript
// ---- Klartext zur Verortungsgenauigkeit ----
const VERORTUNG_TEXT = {
  hausgenau: "Hausgenau verortet",
  strassengenau: "Nur straßengenau verortet — die Hausnummer ließ sich nicht auflösen",
  ungefaehr: "Nur ungefähr verortet",
};

function verortungsHinweis(loc, hatAdresse) {
  if (!loc || loc.verortung === "ohne" || !loc.geometry) {
    // Zwei verschiedene Gründe, kein Standort zu haben: gar keine Adresse
    // überliefert, oder eine, die sich heute nicht auflösen lässt.
    return hatAdresse
      ? "Adresse überliefert, heute nicht eindeutig zuzuordnen"
      : "Kein Standort bekannt";
  }
  return VERORTUNG_TEXT[loc.verortung] || "";
}

// ---- Eine Zählung als Text ----
// Das frühere "50 ges. + 49 M + 1 F" las sich wie eine Summe aus drei
// Zahlen. Die Gesamtzahl führt jetzt, die Aufteilung folgt als Nebensatz.
function formatRecord(r) {
  const kopf = `${r.datum || "ohne Datum"}${r.art ? " · " + r.art : ""}`;
  if (r.gesamt == null) {
    return `<div class="record-row"><span class="rec-date">${kopf}</span></div>`;
  }
  let auf;
  if (r.m != null && r.w != null) {
    auf = `davon ${r.m} männlich, ${r.w} weiblich`;
  } else if (r.m != null) {
    auf = `davon ${r.m} männlich`;
  } else if (r.w != null) {
    auf = `davon ${r.w} weiblich`;
  } else {
    auf = "Aufteilung nicht überliefert";
  }
  return `<div class="record-row">
      <span class="rec-date">${kopf}</span>
      <span class="rec-zahlen"><strong>${r.gesamt}</strong> · ${auf}</span>
    </div>`;
}
```

- [ ] **Schritt 2: `buildList()` umbauen**

In `buildList()` den Kopfblock ersetzen — aus

```javascript
    let headerHtml = `<div class="card-head">`;
    headerHtml += `<span class="card-nr">Nr. ${c.nr}</span>`;
```

wird

```javascript
    let headerHtml = `<div class="card-head">`;
    headerHtml += `<span class="card-name">${c.name}</span>`;
```

und die Beschriftungen der Badges ändern sich:

```javascript
      const label =
        c.existiertHeute === "ja"
          ? "existiert"
          : c.existiertHeute === "nein"
            ? "existiert nicht mehr"
            : "unbekannt";
```

Die Zeile `headerHtml += \`<div class="card-name">${c.name}</div>\`;` nach dem `</div>` des Kopfblocks **entfällt** — der Name steht jetzt im Kopf.

Den Meta-Block ersetzen durch:

```javascript
    const hatAdresse = c.locations.some((l) => l.adresse);
    let metaHtml = `<div class="card-meta">`;
    c.locations.forEach((loc, i) => {
      if (!loc.adresse) return;
      if (i > 0) metaHtml += `<br>`;
      metaHtml += `${loc.adresse}, ${loc.ort || ""}`;
      if (loc.standortNr > 1) metaHtml += ` <small>(Standort ${loc.standortNr})</small>`;
      if (loc.adresseHeute) {
        metaHtml += `<br><span class="adresse-heute">Heute: ${loc.adresseHeute}</span>`;
      }
    });
    const hinweis = verortungsHinweis(c.locations[0], hatAdresse);
    if (hinweis) {
      const unsicher = !c.locations[0] || c.locations[0].verortung !== "hausgenau";
      metaHtml += `<br><span class="verortung-hinweis${unsicher ? " unsicher" : ""}">${hinweis}</span>`;
    }
    // Gruppe immer nennen, Einzelzweig nur wenn er etwas hinzufügt:
    // "xxx" und "unbekannt" sind Leerstellen und werden nicht ausgeschrieben.
    const g = gruppeFuerZweig(c.industriezweig);
    const zweigZeigen =
      c.industriezweig &&
      c.industriezweig !== g.name &&
      !["xxx", "unbekannt"].includes(c.industriezweig);
    metaHtml += `<br><span class="branche">
      <span class="branche-punkt" style="background:${g.farbe}"></span>
      ${g.name}${zweigZeigen ? `<span class="branche-zweig"> · ${c.industriezweig}</span>` : ""}
    </span>`;
    metaHtml += `</div>`;
```

Den Block `let noGeoHtml = ""` samt der Zuweisung `noGeoHtml = '<div class="no-geo-note">Kein Standort bekannt</div>'` löschen — der Hinweis steckt jetzt in `verortungsHinweis()`. In der Zeile `card.innerHTML = headerHtml + metaHtml + noGeoHtml + …` entfällt `noGeoHtml`.

Den Records-Block ersetzen durch:

```javascript
    let recordsHtml = "";
    if (c.records.length > 0) {
      recordsHtml = `<div class="card-records">`;
      c.records.forEach((r) => {
        recordsHtml += formatRecord(r);
      });
      recordsHtml += `</div>`;
    }
```

- [ ] **Schritt 3: Popup an die neue Sprache angleichen**

In `makePopup()` die Zeile mit dem Industriezweig ersetzen — aus

```javascript
  if (c.industriezweig) html += ` · ${c.industriezweig}`;
```

wird

```javascript
  if (c.industriezweig) html += ` · ${gruppeFuerZweig(c.industriezweig).name}`;
```

- [ ] **Schritt 4: CSS anpassen**

In `style.css` die Regel `.card-nr` löschen (sie wird nicht mehr verwendet), `.card-head` und `.card-name` anpassen und die neuen Klassen ergänzen:

```css
.card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 3px;
}

.card-name {
  font-size: 13px;
  font-weight: 600;
  color: #111;
  margin: 0;
}

.adresse-heute {
  color: #8a5a2b;
}

.verortung-hinweis {
  color: #999;
  font-size: 11px;
}

.verortung-hinweis.unsicher {
  color: #a33228;
}

.branche {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #555;
}

.branche-punkt {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
}

.branche-zweig {
  color: #aaa;
}

.record-row {
  font-size: 11px;
  color: #555;
  padding: 3px 0;
  border-bottom: 1px dashed #f0f0f0;
  line-height: 1.5;
}

.rec-date {
  display: block;
  font-weight: 600;
  color: #333;
}

.rec-zahlen {
  color: #555;
}
```

Die alte Regel `.no-geo-note` kann stehen bleiben; sie wird nicht mehr angesprochen und stört nicht.

- [ ] **Schritt 5: Sichtprüfung im Browser**

`http://localhost:8080/map.html` neu laden. Erwartet:
1. Keine Sidebar-Karte zeigt mehr „Nr. 54" oder eine andere Speer-Nummer.
2. Der Firmenname steht links im Kopf, das Badge rechts; bei stillgelegten Betrieben lautet es „existiert nicht mehr".
3. Die Zählungen lesen sich als „13.8.1942 · Ostarbeiter" und darunter „**50** · davon 49 männlich, 1 weiblich".
4. Fehlt die Aufteilung, steht „Aufteilung nicht überliefert"; fehlt das Datum, steht „ohne Datum".
5. Unter der Adresse steht der Verortungshinweis, bei unsicheren Fällen rötlich.
6. Bei Nr. 156 (Wilhelm Fürschbach) steht zusätzlich „Heute: Edith-Stein-Straße, …".
7. Bei Nr. 410 (Ewald Speth) steht „Adresse überliefert, heute nicht eindeutig zuzuordnen", und die Karte hat keinen Marker.
8. Vor dem Branchennamen sitzt ein farbiger Punkt in der Gruppenfarbe, dahinter blass der Einzelzweig.
9. Nirgends steht mehr „xxx". Betriebe ohne Branchenangabe zeigen „ohne Angabe" mit grauem Punkt und keinen Einzelzweig dahinter — mit der Suche des Browsers (`Strg+F`, „xxx") gegenprüfbar.

**Bewusste Vereinfachung:** `verortungsHinweis()` beurteilt nur den ersten Standort. Bei den elf Unternehmen mit mehreren Standorten kann ein zweiter Standort abweichend verortet sein; das bleibt in der Listenansicht unerwähnt. Auf der Karte ist es sichtbar, weil jeder Marker seinen eigenen Stil trägt.

- [ ] **Schritt 6: Committen**

```bash
git add js/map-app.js style.css
git commit -m "Sidebar-Karte neu aufbauen

Die Speer-Nummer verschwindet aus der Liste -- sie stammt aus dem Kontext
der Vorlage und verwirrt hier nur; als Beleg steht sie weiterhin im
Quellenfenster. Die Zusammensetzung aus männlich und weiblich liest sich
nicht mehr wie eine Summe. Verortungsgenauigkeit und, wo abweichend, die
heutige Adresse stehen jetzt in der Karte."
```

---

## Aufgabe 9: Startseite ohne Speer-Nummer

**Dateien:**
- Ändern: `js/landing.js:52-59`

**Schnittstellen:**
- Verbraucht: nichts Neues
- Stellt bereit: nichts

- [ ] **Schritt 1: Spotlight-Beschriftung ändern**

In `js/landing.js` die Zeile

```javascript
        <div class="spotlight-label">Nr. ${pick.nr} — Zufallseintrag</div>
```

ersetzen durch

```javascript
        <div class="spotlight-label">Zufallseintrag</div>
```

- [ ] **Schritt 2: Sichtprüfung**

`http://localhost:8080/index.html` mehrfach neu laden. Erwartet: Die Spotlight-Karte zeigt „Zufallseintrag" ohne Nummer, der Link „→ Auf der Karte anzeigen" führt weiterhin auf `map.html?nr=…` und wählt dort das richtige Unternehmen aus.

- [ ] **Schritt 3: Committen**

```bash
git add js/landing.js
git commit -m "Speer-Nummer aus dem Startseiten-Spotlight entfernen"
```

---

## Aufgabe 10: Statistiken korrigieren und umstellen

**Dateien:**
- Ändern: `about/statistiken.html` — `branchen.js` einbinden, Canvas durch Container ersetzen
- Ändern: `js/statistiken.js:6-41` — Farbtabelle entfernen; `buildCharts()`, `buildIndustrieChart()`
- Ändern: `style.css` — Balkendarstellung

**Schnittstellen:**
- Verbraucht: `BRANCHEN_GRUPPEN`, `gruppeFuerZweig()` aus Aufgabe 1
- Stellt bereit: nichts

- [ ] **Schritt 1: Doppelzählung beheben**

In `js/statistiken.js`, in `buildCharts()`, die Zeile

```javascript
  const { zaArtSeries, mSeries, wSeries } = computeTimeSeries(features, dates);
```

ersetzen durch

```javascript
  // Nur ein Eintrag je Unternehmen: bei Mehrfach-Standorten hängt an jedem
  // Standort dieselbe records-Liste, sonst zählen 11 Unternehmen doppelt.
  const { zaArtSeries, mSeries, wSeries } = computeTimeSeries(companies, dates);
```

Dazu muss `companies` vor dem Aufruf stehen — die Zeile

```javascript
  const companies = features.filter(f => f.standortNr === 1);
```

vor die `computeTimeSeries`-Zeile ziehen, falls sie danach steht.

- [ ] **Schritt 2: Zahlen prüfen**

```bash
python3 -c "
import json
g = json.load(open('data/unternehmen.geojson'))
dates = json.load(open('data/meta.json'))['dates']
feats = [f['properties'] for f in g['features'] if f['properties']['standortNr'] == 1]
m = w = 0
for d in dates:
    md = wd = 0
    for p in feats:
        for r in p.get('records', []):
            if r.get('datumVon') and r['datumVon'] <= d and (not r.get('datumBis') or d < r['datumBis']):
                md += r.get('m') or 0
                wd += r.get('w') or 0
    m, w = max(m, md), max(w, wd)
print(f'Höchstwert männlich: {m}   weiblich: {w}')
assert (m, w) == (19335, 12245), 'Erwartet 19335 / 12245'
print('Zeitreihe stimmt')
"
```

Erwartet: `Höchstwert männlich: 19335   weiblich: 12245`, dann `Zeitreihe stimmt`. Dieselben Werte müssen anschließend im Browser im Diagramm „Zeitliche Entwicklung nach Geschlecht" als Maxima erscheinen.

- [ ] **Schritt 3: Farbtabelle entfernen und `branchen.js` einbinden**

In `js/statistiken.js` den gesamten Block von `// Farben je Industriezweig (identisch mit map-app.js)` bis zum Ende von `colorForIndustrie()` (Zeilen 5–41) löschen und ersetzen durch:

```javascript
// Branchenfarben kommen aus js/branchen.js
```

In `about/statistiken.html` vor `<script src="../js/statistiken.js"></script>` einfügen:

```html
<script src="../js/branchen.js"></script>
```

- [ ] **Schritt 4: Branchendiagramm auf Gruppen umstellen**

In `about/statistiken.html` die Sektion des Branchendiagramms ersetzen:

```html
  <section class="chart-section">
    <h2>Unternehmen nach Branche</h2>
    <p class="chart-note">
      Die 30 Industriezweige der Quelle sind zu neun Gruppen zusammengefasst,
      damit sie sich farblich unterscheiden lassen. Die enthaltenen Einzelzweige
      stehen jeweils daneben.
    </p>
    <div id="branchen-balken" class="branchen-balken"></div>
  </section>
```

In `js/statistiken.js` `buildIndustrieChart()` vollständig ersetzen durch:

```javascript
function buildIndustrieChart(companies) {
  // Betriebe je Gruppe zählen
  const proGruppe = {};
  BRANCHEN_GRUPPEN.forEach((g) => (proGruppe[g.id] = 0));
  companies.forEach((c) => {
    proGruppe[gruppeFuerZweig(c.industriezweig).id]++;
  });

  const sortiert = BRANCHEN_GRUPPEN
    .map((g) => ({ gruppe: g, anzahl: proGruppe[g.id] }))
    .sort((a, b) => b.anzahl - a.anzahl);
  const max = Math.max(...sortiert.map((e) => e.anzahl), 1);

  const container = document.getElementById("branchen-balken");
  container.innerHTML = "";

  sortiert.forEach(({ gruppe, anzahl }) => {
    const zeile = document.createElement("div");
    zeile.className = "bb-zeile";
    zeile.innerHTML = `
      <span class="bb-punkt" style="background:${gruppe.farbe}"></span>
      <span class="bb-name">${gruppe.name}</span>
      <span class="bb-zweige">${gruppe.zweige.join(", ")}</span>
      <span class="bb-balken-spur">
        <span class="bb-balken" style="width:${(anzahl / max) * 100}%;background:${gruppe.farbe}"></span>
      </span>
      <span class="bb-zahl">${anzahl}</span>`;
    container.appendChild(zeile);
  });
}
```

- [ ] **Schritt 5: CSS für die Balkendarstellung**

Ans Ende von `style.css` anfügen:

```css
/* =============================================
   STATISTIK – BRANCHENBALKEN
============================================= */
.branchen-balken {
  font-size: 13px;
}

.bb-zeile {
  display: grid;
  grid-template-columns: 16px minmax(140px, auto) minmax(0, 1fr) 34% 44px;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px solid #f2f2f2;
}

.bb-punkt {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px #ccc;
}

.bb-name {
  font-weight: 600;
  color: #222;
}

.bb-zweige {
  color: #999;
  font-size: 11.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bb-balken-spur {
  display: block;
  height: 11px;
  background: #f4f4f4;
  border-radius: 2px;
  overflow: hidden;
}

.bb-balken {
  display: block;
  height: 100%;
}

.bb-zahl {
  text-align: right;
  font-weight: 600;
  color: #222;
}

@media (max-width: 760px) {
  .bb-zeile {
    grid-template-columns: 16px 1fr 44px;
  }
  .bb-zweige,
  .bb-balken-spur {
    display: none;
  }
}
```

- [ ] **Schritt 6: Sichtprüfung im Browser**

`http://localhost:8080/about/statistiken.html` öffnen. Erwartet:
1. Das erste Diagramm heißt „Unternehmen nach Branche" und zeigt **zehn** Zeilen mit Punkt, Gruppenname, Einzelzweigen, Balken und Zahl.
2. Die Zahlen lauten 114, 74, 57, 37, 32, 30, 30, 17, 13, 13 — ihre Summe ist 417.
3. Im Diagramm „Zeitliche Entwicklung nach Geschlecht" erreicht die männliche Kurve höchstens 19.335, die weibliche höchstens 12.245.
4. Der Geschlechter-Ring nennt dieselben Höchstwerte.
5. Die Browser-Konsole meldet keine Fehler.

- [ ] **Schritt 7: Committen**

```bash
git add about/statistiken.html js/statistiken.js style.css
git commit -m "Statistiken: Doppelzählung beheben und Branchendiagramm umstellen

computeTimeSeries lief über alle 431 Features. Bei Mehrfach-Standorten
hängt an jedem Standort dieselbe records-Liste, wodurch 11 Unternehmen
doppelt bis dreifach in die Zeitreihen eingingen -- die Höchstwerte lagen
18 Prozent zu hoch.

Das Branchendiagramm zeigt statt 15 abgeschnittener Einzelzweige die
neun Gruppen samt ihrer Zusammensetzung."
```

---

## Aufgabe 11: Dokumentation nachziehen

**Dateien:**
- Ändern: `CLAUDE.md`

**Schnittstellen:**
- Verbraucht: alle vorherigen Aufgaben
- Stellt bereit: nichts

- [ ] **Schritt 1: Seitentabelle ergänzen**

In `CLAUDE.md`, Abschnitt „Pages", die Zeile für die Statistikseite ergänzen — sie fehlt bislang:

```markdown
| `about/statistiken.html` | `js/statistiken.js` | Diagramme zu Branchen, ZA-Arten, Geschlecht, Stadtteilen |
```

Und darunter ergänzen:

```markdown
`js/branchen.js` wird auf `map.html` und `about/statistiken.html` vor dem jeweiligen
Seitenskript eingebunden und ist die einzige Quelle für Branchengruppen und Farben.
```

- [ ] **Schritt 2: Abschnitt zur Datenaufbereitung erweitern**

Im Abschnitt „Rebuilding data from source" nach dem bestehenden Codeblock ergänzen:

```markdown
Die Seitenzahlen bei Speer stammen aus einem eigenen Lauf über die OCR-PDF:

```bash
python3 scripts/extract_speer_seiten.py /pfad/zu/Speer_..._ocred.pdf
# Schreibt: data/speer_seiten.json
```

Nur nötig, wenn ein neuer Scan vorliegt. Die PDF liegt außerhalb des Repositorys;
der Pfad wird deshalb als Argument übergeben.

Korrekturen an den Quelldaten gehören nach `data/korrekturen.json` — niemals direkt
in die XLSX oder das geokodierte GeoJSON. `build_data.py` wendet sie beim Bauen an
und warnt, wenn ein vorgefundener Wert nicht mehr dem in `alt` notierten entspricht.
```

- [ ] **Schritt 3: Feldtabelle ergänzen**

In der Tabelle unter „Data: `data/unternehmen.geojson`" drei Zeilen ergänzen:

```markdown
| `verortung` | string | `hausgenau` (271) / `strassengenau` (146) / `ungefaehr` (3) / `ohne` (11) — abgeleitet aus `class`/`type` der Nominatim-Antwort |
| `adresseHeute` | string | heutige Adresse, gesetzt nur bei abweichendem Straßennamen |
| `speerSeite` | string | Seite bei Speer 2003, z. B. `"514"` oder `"514–515"` |
```

- [ ] **Schritt 4: Abschnitt „Extending" ergänzen**

```markdown
- **Neue Branchengruppe oder Farbe**: nur in `js/branchen.js` ändern, danach
  `node scripts/pruefe_branchen.js` — es prüft, dass jeder Zweig aus `meta.json`
  genau einer Gruppe zugeordnet ist.
```

- [ ] **Schritt 5: Committen**

```bash
git add CLAUDE.md
git commit -m "CLAUDE.md: Statistikseite, neue Datenfelder und Skripte nachtragen"
```

---

## Abschließende Gesamtprüfung

- [ ] **Schritt 1: Daten von Grund auf neu bauen**

```bash
python3 scripts/build_data.py
node scripts/pruefe_branchen.js
```

Erwartet: 417 Unternehmen, 431 Features, keine WARNUNG; `30 Zweige, 10 Gruppen, 0 Fehler`.

- [ ] **Schritt 2: Alle Zielzahlen auf einmal prüfen**

```bash
python3 -c "
import json
m = json.load(open('data/meta.json'))
g = json.load(open('data/unternehmen.geojson'))
p = {f['properties']['nr']: f for f in g['features'] if f['properties']['standortNr'] == 1}

pruefungen = [
    ('Unternehmen',            m['stats']['totalCompanies'], 417),
    ('Standorte',              m['stats']['totalLocations'], 431),
    ('hausgenau',              m['stats']['verortung']['hausgenau'], 271),
    ('strassengenau',          m['stats']['verortung']['strassengenau'], 146),
    ('ungefaehr',              m['stats']['verortung']['ungefaehr'], 3),
    ('ohne',                   m['stats']['verortung']['ohne'], 11),
    ('Nr. 88 Adresse',         p['88']['properties']['adresse'], 'Ascheweg 14'),
    ('Nr. 341 Adresse',        p['341']['properties']['adresse'], 'Uellendahler Str. 353'),
    ('Nr. 381 Adresse',        p['381']['properties']['adresse'], 'Vereinstr. 14'),
    ('Nr. 394 nicht in Karte', '394' in p, False),
    ('Nr. 410 Geometrie',      p['410']['geometry'], None),
    ('Nr. 410 Verortung',      p['410']['properties']['verortung'], 'ohne'),
    ('Nr. 54 Seite',           p['54']['properties']['speerSeite'], '514'),
]
fehler = 0
for name, ist, soll in pruefungen:
    ok = ist == soll
    fehler += not ok
    print(('OK  ' if ok else 'FEHL'), f'{name:<20} {ist!r}')
lon, lat = p['88']['geometry']['coordinates']
ok = 51.1 < lat < 51.4 and 6.8 < lon < 7.5
fehler += not ok
print(('OK  ' if ok else 'FEHL'), f'{\"Nr. 88 in Wuppertal\":<20} {lat:.4f}, {lon:.4f}')
print()
print('ALLES GRÜN' if not fehler else f'{fehler} FEHLER')
raise SystemExit(1 if fehler else 0)
"
```

Erwartet: vierzehn `OK`-Zeilen und `ALLES GRÜN`.

- [ ] **Schritt 3: Durchgang im Browser**

Server starten (`python3 -m http.server 8080`) und der Reihe nach prüfen:

1. `index.html` — Spotlight ohne Nummer, Link zur Karte funktioniert.
2. `map.html` — zehn Branchenfarben, gestrichelte Marker, Legende mit beiden Blöcken.
3. `map.html` — Sidebar ohne Nummern, Zählungen im neuen Format, Verortungshinweise.
4. `map.html` — Quellenfenster öffnet, zeigt Seitenangabe, schließt dreifach.
5. `map.html?nr=54` — springt weiterhin direkt zu Ackermann Fahrzeugbau.
6. `map.html` — Zeitleiste abspielen: Marker wachsen und schrumpfen, gestrichelte bleiben gestrichelt.
7. `map.html` — Filter setzen und zurücksetzen: Zähler und Marker stimmen überein.
8. `about/statistiken.html` — Branchenbalken, korrigierte Höchstwerte.
9. In allen Fällen: keine Fehler in der Browser-Konsole.

- [ ] **Schritt 4: Erzeugte Daten committen, falls noch offen**

```bash
git status --short
git add -A
git commit -m "Erzeugte Daten nach vollständigem Neubau aktualisieren"
```

---

## Was dieser Plan nicht umfasst

Aus der Liste vom 30.7.2026 bleiben für eine eigene Spec offen: Startseite mit Hero-Banner,
Einführungstext und Disclaimern, die Definition von Zwangsarbeit nach Spoerer, die Unterseite
„Über das Projekt", die Auswahlbibliographie, das Impressum sowie die Anreicherung um
Rüstungsgüter und historische Fotos.

Ebenfalls offen und vorgemerkt: das ungültige Datum `1942-11-38` bei Nr. 218 (C. + P. Joest),
das gegen die Quelle zu prüfen ist, und die Frage, ob die 139 Records ohne Datumsangabe — die
qualitativ reiche Angaben zu Lagergröße, Nationalitäten und Tätigkeiten tragen — sichtbar
gemacht werden sollen.
