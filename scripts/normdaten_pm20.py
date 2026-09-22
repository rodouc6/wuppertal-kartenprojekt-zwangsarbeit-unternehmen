#!/usr/bin/env python3
"""Gleicht die Unternehmen gegen das Hamburger Pressearchiv (PM20) der ZBW ab.

PM20 ist das digitalisierte HWWA-Pressearchiv: Firmendossiers aus
Zeitungsausschnitten, Schwerpunkt erste Jahrhunderthaelfte. Fuer dieses
Projekt hat es drei Eigenschaften, die GND und Wikidata nicht haben:

1. Es ist **redaktionell kuratiert**. Ein Mensch hat die Firma
   identifiziert und ihr die Normdaten zugewiesen -- kein Namensranking.
   Im Test korrigierte PM20 zwei Fehlzuordnungen des GND-Abgleichs
   (Nr. 438 Glanzstoff wurde dort dem Werk Kelsterbach zugeordnet,
   Nr. 447 Vorwerk & Co. dem Schwesterbetrieb Vorwerk & Sohn).
2. Es liefert **GND und Wikidata zugleich** und ist damit der Brueckenkopf
   zu beiden.
3. Die Dossiers sind **selbst eine Quelle**: 105 Presseausschnitte zu
   Hindrichs-Auffermann, 265 zu Bemberg, 354 zu Glanzstoff, frei
   zugaenglich.

Der Preis ist die Reichweite: PM20 kennt 36 Wuppertaler Firmen, von denen
12 im Datensatz vorkommen. Presse berichtete ueber Aktiengesellschaften,
nicht ueber Cronenberger Werkzeugschmieden.

    python3 scripts/normdaten_pm20.py

Schreibt docs/normdaten/machbarkeit-pm20.md.

ZUGANG: Abgefragt wird ausschliesslich der SPARQL-Endpunkt, der genau
dafuer da ist. Die Webseiten unter pm20.zbw.eu sind mit einem
Proof-of-Work (Anubis) gegen Scraper geschuetzt -- diesen Schutz umgeht
dieses Skript nicht und darf es nicht. Wer ein einzelnes Dossier ansehen
will, ruft es im Browser auf; dort laeuft die Pruefung normal durch.
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
ENDPUNKT = "https://zbw.eu/beta/sparql/pm20/query"
UA = ("WuppertalZwangsarbeitKarte/0.1 "
      "(https://github.com/rodouc6/wuppertal-kartenprojekt-zwangsarbeit-unternehmen)")

# Speer schreibt die Stadtteilnamen, PM20 fuehrt meist "Wuppertal" -- beide
# Schreibweisen muessen in den Filter, sonst fehlen die Altbestaende, die
# noch auf Barmen oder Elberfeld lauten.
ORTE = ["Wuppertal", "Barmen", "Elberfeld", "Vohwinkel", "Cronenberg",
        "Ronsdorf", "Langerfeld"]

ABFRAGE = """
PREFIX zbwext: <http://zbw.eu/namespaces/zbw-extensions/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX gndo: <https://d-nb.info/standards/elementset/gnd#>
PREFIX schema: <http://schema.org/>
PREFIX dcterms: <http://purl.org/dc/terms/>
SELECT ?f ?label ?gnd ?wd ?docs ?temporal ?industry WHERE {
  ?f a zbwext:CompanyFolder ; skos:prefLabel ?label ; schema:location ?ort .
  FILTER(%s)
  OPTIONAL { ?f gndo:gndIdentifier ?gnd }
  OPTIONAL { ?f skos:exactMatch ?wd }
  OPTIONAL { ?f zbwext:totalDocCount ?docs }
  OPTIONAL { ?f dcterms:temporal ?temporal }
  OPTIONAL { ?f schema:industry ?industry }
}
"""


def frage(sparql):
    daten = urllib.parse.urlencode({"query": sparql}).encode()
    req = urllib.request.Request(
        ENDPUNKT, data=daten,
        headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)["results"]["bindings"]


def hole_ordner():
    filt = " || ".join(f'CONTAINS(STR(?ort),"{o}")' for o in ORTE)
    ordner = {}
    for r in frage(ABFRAGE % filt):
        k = r["f"]["value"]
        e = ordner.setdefault(k, {
            "id": k.rsplit("/", 1)[-1], "url": k, "label": r["label"]["value"],
            "gnd": None, "wd": None, "docs": None, "temporal": set(),
            "industry": set(),
        })
        for feld, schluessel in (("gnd", "gnd"), ("wd", "wd"), ("docs", "docs")):
            if feld in r and not e[schluessel]:
                e[schluessel] = r[feld]["value"]
        if "temporal" in r:
            e["temporal"].add(r["temporal"]["value"])
        if "industry" in r:
            e["industry"].add(r["industry"]["value"])
    return ordner


def lade_unternehmen():
    d = json.loads((WURZEL / "data" / "unternehmen.geojson").read_text(encoding="utf-8"))
    u = {}
    for x in d["features"]:
        u.setdefault(x["properties"]["nr"], x["properties"])
    return u


def main():
    AUSGABE.mkdir(parents=True, exist_ok=True)
    print("PM20-Firmenordner werden geholt …")
    ordner = hole_ordner()
    print(f"  {len(ordner)} Ordner mit Wuppertaler Ortsbezug")

    u = lade_unternehmen()
    schluessel = {nr: normalisiere(p["name"]) for nr, p in u.items()}

    zuordnung, ohne = [], []
    for e in ordner.values():
        zk = normalisiere(e["label"])
        best = max(((aehnlichkeit(zk, s), nr) for nr, s in schluessel.items()),
                   default=(0, None))
        if best[0] >= 0.72:
            zuordnung.append((best[0], best[1], e))
        else:
            ohne.append((best[0], e))
    zuordnung.sort(key=lambda t: -t[0])
    ohne.sort(key=lambda t: -t[0])

    z = [
        "# Machbarkeitstest: Abgleich gegen das Pressearchiv PM20 (ZBW)",
        "",
        f"**{len(ordner)}** Firmenordner mit Wuppertaler Ortsbezug, davon "
        f"**{len(zuordnung)}** mit einer Entsprechung im Datensatz (Ähnlichkeit ≥ 0,72).",
        "",
        "Erzeugt von `scripts/normdaten_pm20.py` über den SPARQL-Endpunkt der ZBW. "
        "Kandidaten **ungeprüft**; die Bewertung steht in `machbarkeit-befund.md`.",
        "",
        "## Zuordnungen",
        "",
        "| Wert | Nr. | Unternehmen im Datensatz | PM20-Ordner | GND | Wikidata | Dok. |",
        "|---|---|---|---|---|---|---|",
    ]
    for wert, nr, e in zuordnung:
        wd = (e["wd"] or "").rsplit("/", 1)[-1]
        z.append(f"| {wert:.2f} | {nr} | {u[nr]['name']} | "
                 f"[{e['label']}]({e['url']}) | {e['gnd'] or '—'} | "
                 f"{wd or '—'} | {e['docs'] or '?'} |")

    z += ["", "## Ordner ohne Entsprechung im Datensatz", "",
          "Erwartbar: Speer verzeichnet Rüstungsbetriebe mit Zwangsarbeit, "
          "das Pressearchiv sammelt, worüber die Wirtschaftspresse schrieb. "
          "Versicherungen, Verkehrsbetriebe und Hotels fallen deshalb heraus.", ""]
    for wert, e in ohne:
        wd = (e["wd"] or "").rsplit("/", 1)[-1]
        z.append(f"- **{e['label']}** — GND {e['gnd'] or '—'}, {wd or 'kein Wikidata-Item'}, "
                 f"{e['docs'] or '?'} Dokumente")

    (AUSGABE / "machbarkeit-pm20.md").write_text("\n".join(z) + "\n", encoding="utf-8")
    print(f"{len(zuordnung)} Zuordnungen, {len(ohne)} ohne Entsprechung")
    print("geschrieben: docs/normdaten/machbarkeit-pm20.md")


if __name__ == "__main__":
    main()
