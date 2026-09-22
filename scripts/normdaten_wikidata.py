#!/usr/bin/env python3
"""Gleicht die Unternehmen gegen den Wikidata-Bestand mit Wuppertaler
Ortsbezug ab -- das Gegenstueck zu normdaten_bestand.py (GND).

Zwei Filter machen den Unterschied zwischen brauchbar und wertlos:

**Ortsbezug.** Wuppertal entstand 1929; ein 1908 gegruendeter Betrieb hat
in Wikidata *Barmen* oder *Elberfeld* als Sitz, nicht Wuppertal. Wer nur
auf Q2107 filtert, verliert genau die historischen Betriebe, um die es
geht. Deshalb stehen die Vorgaengerstaedte in ORTE.

**Entitaetstyp.** Der Wuppertal-Bestand besteht zu zwei Dritteln aus
Strassen, Gebaeuden und Stolpersteinen. Ohne Typfilter ordnet der
Namensabgleich "Gebr. Kehrenberg" dem Ortsteil Ehrenberg zu, "Friedrich
Vohwinkel" dem Stadtbezirk Vohwinkel und "Gebr. Doerner" der Doerner
Bruecke. Mit Typfilter faellt das weg: 82 Kandidaten werden zu 21.

    python3 scripts/normdaten_wikidata.py        # --neu holt den Bestand frisch

Schreibt docs/normdaten/machbarkeit-wikidata.md und den Zwischenspeicher
docs/normdaten/wikidata-wuppertal.json (git-ignoriert).
"""
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(WURZEL / "scripts"))
from normdaten_bestand import aehnlichkeit, normalisiere  # noqa: E402

AUSGABE = WURZEL / "docs" / "normdaten"
SPEICHER = AUSGABE / "wikidata-wuppertal.json"
ENDPUNKT = "https://query.wikidata.org/sparql"
UA = ("WuppertalZwangsarbeitKarte/0.1 "
      "(https://github.com/rodouc6/wuppertal-kartenprojekt-zwangsarbeit-unternehmen)")

# Wuppertal und die 1929 eingemeindeten Vorgaengerstaedte. Q1719 ist NICHT
# Wuppertal, sondern Balanga auf den Philippinen -- ein geratener Bezeichner
# lieferte im Test 19 voellig unbrauchbare Treffer.
ORTE = {
    "Q2107": "Wuppertal", "Q153974": "Barmen", "Q702259": "Elberfeld",
    "Q314456": "Vohwinkel", "Q681425": "Ronsdorf", "Q57727510": "Beyenburg",
}

# Wortbestandteile eines Typs, der ein Betrieb sein kann. Bewusst als
# Teilstring und nicht als Liste von Q-Nummern: Wikidata fuehrt Dutzende
# Unterklassen (Automobilhersteller, Brauerei, Werkzeughersteller ...), die
# ueber P279 zwar zusammenhaengen, deren Pfad in der Abfrage aber teuer ist.
BETRIEBSTYP = ("betrieb", "unternehmen", "gesellschaft", "brauerei", "fabrik",
               "werk", "konzern", "hersteller", "bank", "verlag", "firma",
               "industrie", "genossenschaft", "manufaktur", "spinnerei",
               "weberei", "faerberei", "muehle", "huette")

ABFRAGE = """
SELECT DISTINCT ?item ?itemLabel ?typLabel ?gnd ?pm20 ?gruendung ?aufloesung WHERE {
  VALUES ?ort { %s }
  { ?item wdt:P159 ?ort } UNION { ?item wdt:P131 ?ort } UNION { ?item wdt:P276 ?ort }
  ?item wdt:P31 ?typ .
  FILTER NOT EXISTS { ?item wdt:P31 wd:Q5 }
  OPTIONAL { ?item wdt:P227 ?gnd }
  OPTIONAL { ?item wdt:P4293 ?pm20 }
  OPTIONAL { ?item wdt:P571 ?gruendung }
  OPTIONAL { ?item wdt:P576 ?aufloesung }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en". }
}
"""


def frage(sparql):
    daten = urllib.parse.urlencode({"query": sparql}).encode()
    req = urllib.request.Request(
        ENDPUNKT, data=daten,
        headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)["results"]["bindings"]


def hole_bestand():
    werte = " ".join(f"wd:{q}" for q in ORTE)
    items = {}
    for r in frage(ABFRAGE % werte):
        k = r["item"]["value"].rsplit("/", 1)[-1]
        e = items.setdefault(k, {"label": r.get("itemLabel", {}).get("value"),
                                 "typ": [], "gnd": None, "pm20": None,
                                 "gruendung": None, "aufloesung": None})
        t = r.get("typLabel", {}).get("value")
        if t and t not in e["typ"]:
            e["typ"].append(t)
        for feld in ("gnd", "pm20", "gruendung", "aufloesung"):
            if feld in r and not e[feld]:
                e[feld] = r[feld]["value"][:10] if feld in ("gruendung", "aufloesung") \
                    else r[feld]["value"]
    return items


def istbetrieb(typen):
    return any(any(g in t.lower() for g in BETRIEBSTYP) for t in typen)


def lade_unternehmen():
    d = json.loads((WURZEL / "data" / "unternehmen.geojson").read_text(encoding="utf-8"))
    u = {}
    for x in d["features"]:
        u.setdefault(x["properties"]["nr"], x["properties"])
    return u


def main():
    AUSGABE.mkdir(parents=True, exist_ok=True)
    if SPEICHER.exists() and "--neu" not in sys.argv:
        items = json.loads(SPEICHER.read_text(encoding="utf-8"))
        print(f"Wikidata-Bestand aus {SPEICHER.name}: {len(items)} Entitäten")
    else:
        print("Wikidata-Bestand wird geholt …")
        items = hole_bestand()
        SPEICHER.write_text(json.dumps(items, ensure_ascii=False, indent=1),
                            encoding="utf-8")
        print(f"  {len(items)} Entitäten gespeichert")

    betriebe = {k: v for k, v in items.items() if istbetrieb(v["typ"])}
    print(f"  davon mit Betriebstyp: {len(betriebe)}")

    u = lade_unternehmen()
    schluessel = {nr: normalisiere(p["name"]) for nr, p in u.items()}
    treffer = []
    for qid, v in betriebe.items():
        if not v["label"] or v["label"].startswith("Q"):
            continue
        zk = normalisiere(v["label"])
        if not zk:
            continue
        for nr, s in schluessel.items():
            w = aehnlichkeit(zk, s)
            if w >= 0.80:
                treffer.append((w, nr, qid, v))
    treffer.sort(key=lambda t: (-t[0], int("".join(c for c in t[1] if c.isdigit()) or 0)))

    z = [
        "# Machbarkeitstest: Abgleich gegen den Wikidata-Bestand",
        "",
        f"**{len(items)}** Entitäten mit Wuppertaler Ortsbezug (ohne Personen), davon "
        f"**{len(betriebe)}** mit einem Typ, der ein Betrieb sein kann. Daraus "
        f"**{len(treffer)}** Kandidaten ab Ähnlichkeit 0,80, **ungeprüft**.",
        "",
        "Erzeugt von `scripts/normdaten_wikidata.py` — wird bei jedem Lauf "
        "überschrieben. Die Bewertung steht in `machbarkeit-befund.md`.",
        "",
        "| Wert | Nr. | Unternehmen im Datensatz | Wikidata | Bezeichnung | Typ | GND | PM20 |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for w, nr, qid, v in treffer:
        z.append(f"| {w:.2f} | {nr} | {u[nr]['name']} | "
                 f"[{qid}](https://www.wikidata.org/wiki/{qid}) | {v['label']} | "
                 f"{', '.join(v['typ'][:2])} | {v['gnd'] or '—'} | "
                 f"{v['pm20'] or '—'} |")
    (AUSGABE / "machbarkeit-wikidata.md").write_text("\n".join(z) + "\n", encoding="utf-8")
    print(f"{len(treffer)} Kandidaten")
    print("geschrieben: docs/normdaten/machbarkeit-wikidata.md")


if __name__ == "__main__":
    main()
