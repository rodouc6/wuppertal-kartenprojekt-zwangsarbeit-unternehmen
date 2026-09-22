#!/usr/bin/env python3
"""Gleicht die Unternehmen gegen den Wikipedia-Bestand zu Wuppertal ab.

Wikipedia stand von Anfang an in der Aufgabenstellung des Experiments, war
aber als einzige der vier Quellen nie eigens geprueft. Was an
Wikipedia-Artikeln bekannt war, fiel bis zum 22.9.2026 nur nebenbei ab:
wenn ein Wikidata-Item den Ortsfilter, den Typfilter und die Durchsicht
ueberstanden hatte. Ein Betrieb mit Artikel, aber ohne Wuppertaler
Ortsangabe in Wikidata, konnte uns gar nicht begegnen.

Das Verfahren ist dasselbe wie bei GND und Wikidata -- Bestand ziehen
statt suchen --, nur hat Wikipedia dafuer etwas Besseres als einen
Ortsfilter: **Kategorien**. Der Baum unter "Kategorie:Unternehmen
(Wuppertal)" ist redaktionell gepflegt, und wer darin steht, steht dort,
weil ein Mensch ihn einsortiert hat.

Ein Wikipedia-Treffer liefert zugleich das Wikidata-Item und ueber dieses
die GND-Nummer -- wie PM20 ein Brueckenkopf zu den anderen Normdateien
und keine vierte Liste daneben.

    python3 scripts/normdaten_wikipedia.py        # --neu holt den Bestand frisch

Schreibt docs/normdaten/machbarkeit-wikipedia.md und den Zwischenspeicher
docs/normdaten/wikipedia-wuppertal.json.

GRENZE: Der Baum findet nur, was nach Wuppertal einsortiert ist. Ein
Artikel ueber einen Wuppertaler Betrieb, der allein in "Ehemaliges
Unternehmen (Nordrhein-Westfalen)" steht, fehlt darin -- dieselbe Art
Luecke wie beim GND-Ortsbezug, nur an anderer Stelle.
"""
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(WURZEL / "scripts"))
from normdaten_bestand import aehnlichkeit, normalisiere  # noqa: E402

AUSGABE = WURZEL / "docs" / "normdaten"
SPEICHER = AUSGABE / "wikipedia-wuppertal.json"
WP = "https://de.wikipedia.org/w/api.php"
WD = "https://www.wikidata.org/w/api.php"
SPARQL = "https://query.wikidata.org/sparql"
UA = ("WuppertalZwangsarbeitKarte/0.1 "
      "(https://github.com/rodouc6/wuppertal-kartenprojekt-zwangsarbeit-unternehmen)")

WURZELKATEGORIE = "Kategorie:Unternehmen (Wuppertal)"
SCHWELLE = 0.72


def hole(url, versuche=4):
    """Wikipedia drosselt hart; ohne Kontakt im User-Agent gibt es 429."""
    letzter = None
    for i in range(versuche):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001
            letzter = e
            time.sleep(3 * (i + 1))
    raise RuntimeError(f"nach {versuche} Versuchen: {letzter}")


def api(basis, **p):
    p.setdefault("format", "json")
    p.setdefault("action", "query")
    return hole(basis + "?" + urllib.parse.urlencode(p))


def hole_kategorienbaum():
    """Artikel im Baum unter WURZELKATEGORIE.

    Unterkategorien werden nur verfolgt, wenn "Wuppertal" im Titel steht --
    sonst wandert die Rekursion ueber "Produzierendes Unternehmen
    (Deutschland)" ins Uferlose.
    """
    offen, gesehen, seiten = [WURZELKATEGORIE], set(), {}
    while offen:
        kat = offen.pop()
        if kat in gesehen:
            continue
        gesehen.add(kat)
        weiter = {}
        while True:
            d = api(WP, list="categorymembers", cmtitle=kat, cmlimit=500, **weiter)
            for m in d["query"]["categorymembers"]:
                if m["ns"] == 14 and "Wuppertal" in m["title"]:
                    offen.append(m["title"])
                elif m["ns"] == 0:
                    seiten.setdefault(m["title"], kat)
            if "continue" not in d:
                break
            weiter = d["continue"]
            time.sleep(0.3)
        time.sleep(0.3)
    print(f"  {len(gesehen)} Kategorien, {len(seiten)} Artikel")
    return {t: {"kategorie": k, "qid": None, "gnd": None} for t, k in seiten.items()}


def ergaenze_wikidata(seiten):
    """Wikidata-Item je Artikel (pageprops), dann GND je Item (SPARQL)."""
    titel = list(seiten)
    for i in range(0, len(titel), 50):
        d = api(WP, prop="pageprops", titles="|".join(titel[i:i + 50]), redirects=1)
        for s in d["query"]["pages"].values():
            t = s.get("title")
            q = (s.get("pageprops") or {}).get("wikibase_item")
            if t in seiten and q:
                seiten[t]["qid"] = q
        time.sleep(0.3)
    qids = sorted({v["qid"] for v in seiten.values() if v["qid"]})
    print(f"  {len(qids)} davon mit Wikidata-Item")

    abfrage = ("SELECT ?item ?gnd WHERE { VALUES ?item { %s } ?item wdt:P227 ?gnd }"
               % " ".join(f"wd:{q}" for q in qids))
    req = urllib.request.Request(
        SPARQL, data=urllib.parse.urlencode({"query": abfrage}).encode(),
        headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        treffer = {b["item"]["value"].rsplit("/", 1)[-1]: b["gnd"]["value"]
                   for b in json.load(r)["results"]["bindings"]}
    for v in seiten.values():
        if v["qid"] in treffer:
            v["gnd"] = treffer[v["qid"]]
    print(f"  {len(treffer)} davon mit GND-Nummer")
    return seiten


def lade_unternehmen():
    d = json.loads((WURZEL / "data" / "unternehmen.geojson").read_text(encoding="utf-8"))
    u = {}
    for x in d["features"]:
        u.setdefault(x["properties"]["nr"], x["properties"])
    return u


def kandidaten(seiten, u):
    schluessel = {nr: normalisiere(p["name"]) for nr, p in u.items()}
    treffer = []
    for titel, v in seiten.items():
        # Klammerzusaetze wie "Vorwerk (Unternehmen)" stoeren den Vergleich
        blank = titel.split(" (")[0]
        zk = normalisiere(blank)
        if not zk:
            continue
        for nr, s in schluessel.items():
            wert = aehnlichkeit(zk, s)
            if wert >= SCHWELLE:
                treffer.append((wert, nr, titel, v))
    treffer.sort(key=lambda t: (-t[0], t[1]))
    return treffer


def main():
    AUSGABE.mkdir(parents=True, exist_ok=True)
    if SPEICHER.exists() and "--neu" not in sys.argv:
        seiten = json.loads(SPEICHER.read_text(encoding="utf-8"))
        print(f"Wikipedia-Bestand aus {SPEICHER.name}: {len(seiten)} Artikel")
    else:
        print("Wikipedia-Kategorienbaum wird geholt …")
        seiten = ergaenze_wikidata(hole_kategorienbaum())
        SPEICHER.write_text(json.dumps(seiten, ensure_ascii=False, indent=1),
                            encoding="utf-8")

    u = lade_unternehmen()
    treffer = kandidaten(seiten, u)
    betriebe = {nr for _, nr, _, _ in treffer}

    z = [
        "# Machbarkeitstest: Abgleich gegen den Wikipedia-Bestand",
        "",
        f"**{len(seiten)}** Artikel im Kategorienbaum unter „{WURZELKATEGORIE}“, "
        f"daraus **{len(treffer)}** Kandidaten für **{len(betriebe)}** Betriebe "
        f"ab Ähnlichkeit {SCHWELLE:.2f}, **ungeprüft**.",
        "",
        "Erzeugt von `scripts/normdaten_wikipedia.py` — wird bei jedem Lauf "
        "überschrieben. Die Bewertung steht in `machbarkeit-befund.md`.",
        "",
        "| Wert | Nr. | Unternehmen im Datensatz | Wikipedia-Artikel | Kategorie | Wikidata | GND |",
        "|---|---|---|---|---|---|---|",
    ]
    for wert, nr, titel, v in treffer:
        pfad = urllib.parse.quote(titel.replace(" ", "_"))
        z.append(f"| {wert:.2f} | {nr} | {u[nr]['name']} | "
                 f"[{titel}](https://de.wikipedia.org/wiki/{pfad}) | "
                 f"{v['kategorie'].replace('Kategorie:', '')} | "
                 f"{v['qid'] or '—'} | {v['gnd'] or '—'} |")
    (AUSGABE / "machbarkeit-wikipedia.md").write_text("\n".join(z) + "\n", encoding="utf-8")
    print(f"\n{len(treffer)} Kandidaten für {len(betriebe)} Betriebe")
    print("geschrieben: docs/normdaten/machbarkeit-wikipedia.md")


if __name__ == "__main__":
    main()
