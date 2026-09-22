#!/usr/bin/env python3
"""Destilliert die Urteile des Pruefbogens zu data/normdaten.json.

`docs/normdaten/urteile.json` ist nach Kandidaten geschluesselt
(`nr|quelle|id`) und enthaelt auch alle Verwerfungen -- das ist die
Arbeitsdatei der Durchsicht und gehoert zum Experiment. Die Karte braucht
etwas anderes: je Unternehmen die bestaetigten Nachweise, mit Bezeichnung
und Beziehungsart, ohne den Ausschuss.

    python3 scripts/normdaten_uebernehmen.py

Liest  docs/normdaten/urteile.json (+ die Zwischenspeicher fuer die Namen)
Schreibt data/normdaten.json

DIE BEZIEHUNGSART WIRD MITGEFUEHRT, und das ist der ganze Punkt dieser
Datei. Die Regelwerke sind sich darin einig:

- **GND-Uebergangsregel K11** fuehrt untergeordnete Koerperschaften als
  eigene Datensaetze und verknuepft sie nach oben (`510 $4adue`), den Ort
  getrennt davon (`551 $4orta`).
- **ICA Records in Contexts** trennt `Agent` und `Place` und kennt
  `isOrWasSubordinateTo` sowie `wasMergedInto` als eigene Relationen.
- **Wikidata** ordnet nach Rechtsstatus: `P749` fuer den Konzern, `P199`
  ausdruecklich fuer Einheiten ohne eigene Rechtspersoenlichkeit.

Uebersetzt heisst das: Nr. 162 *ist nicht* die Gutehoffnungshuette, sie
*gehoert zu* ihr -- der Dolomit-Steinbruch Luentenbeck ist keine
juristische Person und hat keinen eigenen Normdatensatz. Wer beides gleich
anzeigt, behauptet etwas, das die Quelle nicht hergibt. Deshalb steht in
jedem Nachweis ein `beziehung`-Feld, und die Seitenleiste liest es aus.

Werte: "ist" (ist dieses Unternehmen) und "gehoertZu" (gehoert zu /
Nachfolger von). "nein" und "unklar" erzeugen keinen Nachweis.
"""
import json
import sys
import urllib.parse
from datetime import date
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
QUELLE = WURZEL / "docs" / "normdaten"
URTEILE = QUELLE / "urteile.json"
ZIEL = WURZEL / "data" / "normdaten.json"

BEZIEHUNG = {"ist": "ist", "nachfolger": "gehoertZu"}


def lade(name):
    p = QUELLE / name
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


def bezeichnungen():
    """(quelle, id) -> Bezeichnung, aus den Zwischenspeichern der Laeufe."""
    n = {}
    for e in lade("gnd-wuppertal.json") or []:
        n[("gnd", e["id"])] = e["name"]
    for qid, v in (lade("wikidata-wuppertal.json") or {}).items():
        n[("wikidata", qid)] = v.get("label") or qid
    for e in (lade("pm20-wuppertal.json") or {}).values():
        n[("pm20", e["id"])] = e["label"]
    for titel in (lade("wikipedia-wuppertal.json") or {}):
        n[("wikipedia", titel)] = titel
    # Die Zweigwerk-Kandidaten stehen in keinem Bestand: Sie stammen aus der
    # Namenssuche ohne Ortsfilter und bringen ihre Bezeichnung selbst mit.
    for ks in (lade("zweigwerke-kandidaten.json") or {}).values():
        for k in ks:
            n[(k["quelle"], k["id"])] = k["label"]
    return n


def adresse(quelle, kennung):
    if quelle == "gnd":
        return f"https://d-nb.info/gnd/{kennung}"
    if quelle == "wikidata":
        return f"https://www.wikidata.org/wiki/{kennung}"
    if quelle == "pm20":
        return f"https://pm20.zbw.eu/folder/co/{kennung}"
    if quelle == "wikipedia":
        return "https://de.wikipedia.org/wiki/" + urllib.parse.quote(
            kennung.replace(" ", "_"))
    return None


def main():
    if not URTEILE.exists():
        sys.exit(f"{URTEILE} fehlt — erst im Prüfbogen urteilen und exportieren.")
    urteile = json.loads(URTEILE.read_text(encoding="utf-8"))["urteile"]
    namen = bezeichnungen()

    je_nr = {}
    for schluessel, v in urteile.items():
        beziehung = BEZIEHUNG.get(v["urteil"])
        if not beziehung:
            continue
        nr, quelle, kennung = schluessel.split("|", 2)
        je_nr.setdefault(nr, []).append({
            "art": quelle,
            "id": kennung,
            "label": namen.get((quelle, kennung), kennung),
            "url": adresse(quelle, kennung),
            "beziehung": beziehung,
            "grund": v.get("grund") or None,
        })

    # Reihenfolge in der Anzeige: eigene Nachweise vor zugehoerigen, darin
    # GND zuerst -- die stabilste Kennung steht oben.
    rang = {"gnd": 0, "wikidata": 1, "wikipedia": 2, "pm20": 3}
    for liste in je_nr.values():
        liste.sort(key=lambda n: (n["beziehung"] != "ist", rang.get(n["art"], 9)))

    daten = {
        "erzeugt": date.today().isoformat(),
        "hinweis": ("Von Hand geprüfte Normdaten-Nachweise, destilliert aus "
                    "docs/normdaten/urteile.json durch "
                    "scripts/normdaten_uebernehmen.py. `beziehung` "
                    "unterscheidet „ist dieses Unternehmen“ von „gehört zu / "
                    "Nachfolger von“ — ein Zweigwerk ist nicht sein Konzern."),
        "unternehmen": dict(sorted(
            je_nr.items(),
            key=lambda kv: int("".join(c for c in kv[0] if c.isdigit()) or 0))),
    }
    ZIEL.write_text(json.dumps(daten, ensure_ascii=False, indent=1) + "\n",
                    encoding="utf-8")

    ist = sum(1 for ns in je_nr.values() for n in ns if n["beziehung"] == "ist")
    zu = sum(1 for ns in je_nr.values() for n in ns if n["beziehung"] == "gehoertZu")
    wp = sum(1 for ns in je_nr.values() for n in ns if n["art"] == "wikipedia")
    print(f"{len(je_nr)} Unternehmen mit Nachweis")
    print(f"  „ist dieses Unternehmen“:   {ist}")
    print(f"  „gehört zu / Nachfolger“:   {zu}")
    print(f"  darunter Wikipedia-Artikel: {wp}")
    print(f"geschrieben: {ZIEL.relative_to(WURZEL)}")


if __name__ == "__main__":
    main()
