#!/usr/bin/env python3
"""Gleicht die 431 Unternehmen gegen den GND-Bestand mit Wuppertaler
Ortsbezug ab -- vollstaendig, nicht ueber Suchranking.

Der Unterschied zur Namenssuche ist der Punkt: Eine Suche nach "Adolf
Franke" liefert vier gleichnamige Personen und nicht den Cronenberger
Betrieb; eine Suche nach "Kromberg & Schubert" lieferte gar nichts,
obwohl die GND den Eintrag fuehrt. Beides sind Rankingfehler, keine
Luecken der Normdatei. Wer stattdessen alle Koerperschaften mit
Wuppertaler Ortsbezug herunterlaedt (rund 2.500) und lokal vergleicht,
umgeht das Ranking: Der Ortsbezug ist dann kein Filter auf einer
Trefferliste, sondern die Grundgesamtheit.

    python3 scripts/normdaten_bestand.py

Schreibt docs/normdaten/machbarkeit-bestandsabgleich.md und
docs/normdaten/gnd-wuppertal.json (Zwischenspeicher, damit ein zweiter
Lauf nicht wieder 25 Abrufe braucht; mit --neu wird er erneuert).
"""
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from difflib import SequenceMatcher
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
AUSGABE = WURZEL / "docs" / "normdaten"
SPEICHER = AUSGABE / "gnd-wuppertal.json"
UA = ("WuppertalZwangsarbeitKarte/0.1 "
      "(https://github.com/rodouc6/wuppertal-kartenprojekt-zwangsarbeit-unternehmen)")

# Die Stadt entstand 1929 aus diesen Orten; Speer schreibt durchweg die
# Stadtteilnamen, die GND fuehrt beides nebeneinander.
ORTE = ["Wuppertal", "Barmen", "Elberfeld", "Vohwinkel", "Cronenberg",
        "Ronsdorf", "Langerfeld", "Beyenburg", "Sonnborn"]

BALLAST = [
    r"\bGmbH\s*&\s*Co\.?\s*KG\b", r"\bAG\s*&\s*Co\.?\s*KG\b", r"\bGmbH\b",
    r"\bAktiengesellschaft\b", r"\bAG\.?\b", r"\bKG\b", r"\bOHG\b", r"\bKGaA\b",
    r"\bKommanditgesellschaft\b", r"\be\.?\s?G\.?m\.?b\.?H\.?\b",
    r"\bFirma\b", r"\bNachf\.?\b", r"\bvorm\.?\b", r"\bWerk\s+\w+\b",
    r"\bZweigwerk\b", r"\bFabrik\w*\b", r"\bWerke\b",
]


def hole(url, versuche=3):
    letzter = None
    for i in range(versuche):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=45) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001
            letzter = e
            time.sleep(2 * (i + 1))
    raise RuntimeError(f"nach {versuche} Versuchen: {letzter}")


def hole_bestand():
    """Alle Koerperschaften mit Wuppertaler Ortsbezug, seitenweise."""
    orte = "+OR+".join(urllib.parse.quote(o) for o in ORTE)
    basis = ("https://lobid.org/gnd/search?"
             f"q=type%3ACorporateBody+AND+placeOfBusiness.label%3A({orte})"
             "&format=json&size=100")
    eintraege, von = [], 0
    while True:
        d = hole(f"{basis}&from={von}")
        teil = d.get("member", [])
        if not teil:
            break
        for m in teil:
            eintraege.append({
                "id": m.get("gndIdentifier"),
                "name": m.get("preferredName"),
                "varianten": m.get("variantName") or [],
                "ort": [o.get("label", "") for o in (m.get("placeOfBusiness") or [])],
                "typ": [t for t in m.get("type", []) if t != "AuthorityResource"],
            })
        von += len(teil)
        print(f"    {von} / {d.get('totalItems')}", end="\r")
        if von >= (d.get("totalItems") or 0):
            break
        time.sleep(0.5)
    print()
    return eintraege


def normalisiere(s):
    """Fuer den Vergleich: Umlaute aufloesen, Rechtsform und Satzzeichen weg.
    'J. P. Bemberg AG.' und 'J.-P.-Bemberg-Aktiengesellschaft' sollen sich
    treffen -- das ist derselbe Betrieb in zwei Schreibweisen."""
    s = s.lower()
    s = (s.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue")
          .replace("ß", "ss"))
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    for muster in BALLAST:
        s = re.sub(muster, " ", s, flags=re.IGNORECASE)
    s = re.sub(r"\b(gebr|gebrueder|wwe|witwe|sohn|soehne|co|cie|und|u)\b", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(s.split())


def aehnlichkeit(a, b):
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    # Teilmengenbeziehung: "bemberg" steckt in "j p bemberg" -- bei kurzen
    # Firmennamen ist das haeufiger aussagekraeftig als die Zeichenfolge.
    wa, wb = set(a.split()), set(b.split())
    if wa and wb and (wa <= wb or wb <= wa):
        return max(0.86, SequenceMatcher(None, a, b).ratio())
    return SequenceMatcher(None, a, b).ratio()


def lade_unternehmen():
    d = json.loads((WURZEL / "data" / "unternehmen.geojson").read_text(encoding="utf-8"))
    u = {}
    for x in d["features"]:
        u.setdefault(x["properties"]["nr"], x["properties"])
    return u


def main():
    AUSGABE.mkdir(parents=True, exist_ok=True)
    neu = "--neu" in sys.argv
    if SPEICHER.exists() and not neu:
        bestand = json.loads(SPEICHER.read_text(encoding="utf-8"))
        print(f"GND-Bestand aus {SPEICHER.name}: {len(bestand)} Körperschaften")
    else:
        print("GND-Bestand wird geholt …")
        bestand = hole_bestand()
        SPEICHER.write_text(json.dumps(bestand, ensure_ascii=False, indent=1),
                            encoding="utf-8")
        print(f"  {len(bestand)} Körperschaften gespeichert")

    # Vergleichsschluessel einmal vorbereiten, nicht je Paar
    for e in bestand:
        e["_k"] = [normalisiere(e["name"])] + [normalisiere(v) for v in e["varianten"]]

    u = lade_unternehmen()
    zeilen, mit, ohne = [], 0, 0
    for nr, p in sorted(u.items(), key=lambda kv: int("".join(c for c in kv[0] if c.isdigit()) or 0)):
        ziel = normalisiere(p["name"])
        treffer = []
        for e in bestand:
            wert = max((aehnlichkeit(ziel, k) for k in e["_k"] if k), default=0)
            if wert >= 0.72:
                treffer.append((wert, e))
        treffer.sort(key=lambda t: -t[0])
        if treffer:
            mit += 1
            zeilen.append(f"## {nr} — {p['name']}")
            zeilen.append("")
            zeilen.append(f"> {p.get('industriezweig') or '?'} · "
                          f"{p.get('adresse') or ''} {p.get('ort') or ''} · "
                          f"existiert heute: {p.get('existiertHeute') or '?'}")
            zeilen.append("")
            for wert, e in treffer[:4]:
                orte = ", ".join(e["ort"])
                zeilen.append(f"  - `{wert:.2f}` GND `{e['id']}` **{e['name']}**"
                              f" — {', '.join(e['typ'][:2])} · {orte}")
            zeilen.append("")
        else:
            ohne += 1

    kopf = [
        "# Machbarkeitstest: Bestandsabgleich gegen die GND",
        "",
        f"Alle **{len(u)}** Unternehmen gegen **{len(bestand)}** GND-Körperschaften "
        f"mit Wuppertaler Ortsbezug. Kandidaten ab Ähnlichkeit 0,72, **ungeprüft**.",
        "",
        f"**{mit} Unternehmen mit mindestens einem Kandidaten, {ohne} ohne.**",
        "",
        "Erzeugt von `scripts/normdaten_bestand.py` — wird bei jedem Lauf "
        "überschrieben. Die Bewertung steht in `machbarkeit-befund.md`.",
        "",
    ]
    (AUSGABE / "machbarkeit-bestandsabgleich.md").write_text(
        "\n".join(kopf + zeilen) + "\n", encoding="utf-8")
    print(f"\n{mit} von {len(u)} Unternehmen mit Kandidat ({mit * 100 // len(u)} %), {ohne} ohne")
    print("geschrieben: docs/normdaten/machbarkeit-bestandsabgleich.md")


if __name__ == "__main__":
    main()
