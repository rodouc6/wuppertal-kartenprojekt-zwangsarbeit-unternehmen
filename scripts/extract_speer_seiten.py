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
        # <= statt <: bei Buchstaben-Nummern wie '363a' ist die Basisnummer
        # 363 selbst der linke Nachbar und darf nicht ausgeschlossen werden.
        vor = [b for b in bekannt if b <= n]
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
