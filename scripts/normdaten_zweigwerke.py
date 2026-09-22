#!/usr/bin/env python3
"""Sucht Normdaten fuer die Zweigwerke auswaertiger Konzerne -- ohne Ortsfilter.

Die drei Bestandsabgleiche (GND, Wikidata, Wikipedia) haben eine gemeinsame
Blindstelle, und sie ist keine Panne, sondern der Preis ihrer Staerke: Sie
ziehen ihren Bestand ueber den Wuppertaler Ortsbezug. Ein Werk, dessen
Mutterhaus in Frankfurt, Oberhausen oder Essen sitzt, hat in der Normdatei
genau diesen auswaertigen Sitz -- und faellt heraus. Der Befund hat das im
August 2026 vorhergesagt ("Der Ortsfilter findet Betriebe, keine Konzerne
mit auswaertigem Sitz. Fuer die elf Zweigwerke auswaertiger Unternehmen im
Datensatz braucht es einen zweiten Weg"); gebaut wurde dieser Weg nie.

I.G. Farbenindustrie AG Werk Elberfeld, Fried. Krupp AG Essen und die
Gutehoffnungshuette haben alle einen Wikipedia-Artikel, eine GND-Nummer und
ein Wikidata-Item -- und keiner der drei Betriebe ist je im Pruefbogen
aufgetaucht.

Hier wird deshalb gesucht statt abgeglichen. Dass die Namenssuche das
schlechteste der Verfahren ist (Abschnitt 1 des Befunds), spielt bei einer
**geschlossenen Liste von gut einem Dutzend Faellen** keine Rolle: Jeder
Vorschlag wird ohnehin von Hand angesehen. Der Ausschuss kostet Sekunden,
nicht Vertrauen.

    python3 scripts/normdaten_zweigwerke.py

Schreibt docs/normdaten/zweigwerke-kandidaten.json (vom Pruefbogen gelesen)
und docs/normdaten/machbarkeit-zweigwerke.md.

Gesucht wird nach dem **Mutterhaus**, nicht nach dem Namen im Datensatz:
"Fried. Krupp AG Essen, Zweigwerk 'Dreherei Wuppertal'" findet nichts,
"Friedrich Krupp" sofort. Was dabei herauskommt, ist in aller Regel der
Konzern und nicht das Wuppertaler Werk -- also eine Beziehung
*gehoert zu / Nachfolger von* und kein *ist dieses Unternehmen*. Diese
Unterscheidung trifft der Pruefbogen, nicht dieses Skript.
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
ZIEL = AUSGABE / "zweigwerke-kandidaten.json"
UA = ("WuppertalZwangsarbeitKarte/0.1 "
      "(https://github.com/rodouc6/wuppertal-kartenprojekt-zwangsarbeit-unternehmen)")
SCHWELLE = 0.72

# Handgeschriebene, nachpruefbare Liste: Nr. -> Name des Mutterhauses.
# Zusammengestellt am 22.9.2026 aus einem Schlagwortdurchlauf ueber alle 431
# Namen (Konzernnamen, "Zweigwerk", "Zweigbetrieb", eckige Klammern) und
# anschliessendem Durchlesen. **Kein Anspruch auf Vollstaendigkeit** -- ein
# Zweigwerk, dessen Datensatzname das Mutterhaus nicht nennt, steht nicht
# darin und ist auch nicht zu finden, solange der Name die einzige Handhabe
# ist. Wer die Liste erweitert, traegt hier ein und laeuft das Skript neu.
ZWEIGWERKE = {
    "68":  ["I.G. Farbenindustrie", "IG Farben"],
    "122": ["Dyckerhoff & Widmann"],
    "162": ["Gutehoffnungshütte"],
    "163": ["Gutehoffnungshütte"],
    "184": ["Herring & Sohn"],
    "257": ["Friedrich Krupp", "Fried. Krupp", "Widia"],
    "300": ["Deutsches Leucht- und Signalmittelwerk", "Feistel"],
    "342": ["Gustav Rafflenbeul", "Rafflenbeul"],
    "345": ["Rautenbach-Werke", "Rudolf Rautenbach"],
    "436": ["Trierer Walzwerk"],
    "75":  ["Bemetall"],
    "222": ["Kabel- und Drahtwerke"],
    "334": ["Presta-Werke", "Presta"],
    "269": ["Linde"],
}


def hole(url, daten=None, kopf=None):
    letzter = None
    for i in range(3):
        try:
            req = urllib.request.Request(
                url, data=daten, headers={"User-Agent": UA, **(kopf or {})})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001
            letzter = e
            time.sleep(2 * (i + 1))
    print(f"    (übersprungen: {letzter})")
    return None


def gnd_suche(begriff):
    url = ("https://lobid.org/gnd/search?q=" + urllib.parse.quote(f'"{begriff}"')
           + "+AND+type%3ACorporateBody&format=json&size=10")
    d = hole(url)
    treffer = []
    for m in (d or {}).get("member", []):
        namen = [m.get("preferredName") or ""] + (m.get("variantName") or [])
        wert = max((aehnlichkeit(normalisiere(begriff), normalisiere(n))
                    for n in namen if n), default=0)
        if wert >= SCHWELLE:
            treffer.append({
                "quelle": "gnd", "id": m.get("gndIdentifier"),
                "url": f"https://d-nb.info/gnd/{m.get('gndIdentifier')}",
                "label": m.get("preferredName"),
                "typ": [t for t in m.get("type", []) if t != "AuthorityResource"],
                "ort": [o.get("label", "") for o in (m.get("placeOfBusiness") or [])],
                "varianten": (m.get("variantName") or [])[:8],
                "wert": round(wert, 2), "zusatz": {},
            })
    return treffer


def wikidata_suche(begriff):
    d = hole("https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode({
        "action": "wbsearchentities", "search": begriff, "language": "de",
        "uselang": "de", "type": "item", "limit": 7, "format": "json"}))
    qids = [t["id"] for t in (d or {}).get("search", [])]
    if not qids:
        return []
    e = hole("https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode({
        "action": "wbgetentities", "ids": "|".join(qids), "format": "json",
        "props": "labels|descriptions|claims|sitelinks", "languages": "de",
        "sitefilter": "dewiki"}))
    treffer = []
    for qid, v in (e or {}).get("entities", {}).items():
        label = (v.get("labels", {}).get("de") or {}).get("value") or qid
        wert = aehnlichkeit(normalisiere(begriff), normalisiere(label))
        if wert < SCHWELLE:
            continue
        anspruch = v.get("claims", {})
        gnd = ((anspruch.get("P227") or [{}])[0].get("mainsnak", {})
               .get("datavalue", {}).get("value"))
        artikel = (v.get("sitelinks", {}).get("dewiki") or {}).get("title")
        zusatz = {}
        if gnd:
            zusatz["GND"] = gnd
        if artikel:
            zusatz["Wikipedia"] = artikel
        beschreibung = (v.get("descriptions", {}).get("de") or {}).get("value")
        treffer.append({
            "quelle": "wikidata", "id": qid,
            "url": f"https://www.wikidata.org/wiki/{qid}",
            "label": label, "typ": [beschreibung] if beschreibung else [],
            "ort": [], "varianten": [], "wert": round(wert, 2), "zusatz": zusatz,
        })
    return treffer


def lade_unternehmen():
    d = json.loads((WURZEL / "data" / "unternehmen.geojson").read_text(encoding="utf-8"))
    u = {}
    for x in d["features"]:
        u.setdefault(x["properties"]["nr"], x["properties"])
    return u


def main():
    AUSGABE.mkdir(parents=True, exist_ok=True)
    u = lade_unternehmen()
    fehlend = [nr for nr in ZWEIGWERKE if nr not in u]
    if fehlend:
        print(f"WARNUNG: nicht im Datensatz: {', '.join(fehlend)}")

    ergebnis = {}
    for nr, begriffe in ZWEIGWERKE.items():
        if nr not in u:
            continue
        print(f"  Nr. {nr} {u[nr]['name'][:46]}")
        gefunden, gesehen = [], set()
        for b in begriffe:
            for k in gnd_suche(b) + wikidata_suche(b):
                if (k["quelle"], k["id"]) in gesehen:
                    continue
                gesehen.add((k["quelle"], k["id"]))
                k["weg"] = f"Namenssuche „{b}“ ohne Ortsfilter"
                gefunden.append(k)
            time.sleep(0.4)
        gefunden.sort(key=lambda k: -k["wert"])
        if gefunden:
            ergebnis[nr] = gefunden[:6]
            print(f"      {len(ergebnis[nr])} Kandidaten")
        else:
            print("      nichts gefunden")

    ZIEL.write_text(json.dumps(ergebnis, ensure_ascii=False, indent=1), encoding="utf-8")

    z = [
        "# Machbarkeitstest: Zweigwerke auswärtiger Konzerne",
        "",
        f"**{len(ZWEIGWERKE)}** Betriebe, deren Mutterhaus auswärts sitzt und die "
        f"deshalb durch jeden Ortsfilter fallen. Gesucht wurde nach dem "
        f"**Mutterhaus**, ohne Ortsbezug; **{len(ergebnis)}** haben Kandidaten, "
        f"**ungeprüft**.",
        "",
        "Erzeugt von `scripts/normdaten_zweigwerke.py` — wird bei jedem Lauf "
        "überschrieben. Die Liste der Betriebe steht von Hand im Skript.",
        "",
        "In aller Regel ist der Treffer der **Konzern**, nicht das Wuppertaler "
        "Werk — also *gehört zu / Nachfolger von* und nicht *ist dieses "
        "Unternehmen*. Die Entscheidung fällt im Prüfbogen.",
        "",
        "| Nr. | Unternehmen im Datensatz | Quelle | Kandidat | Wert |",
        "|---|---|---|---|---|",
    ]
    for nr, ks in ergebnis.items():
        for k in ks:
            z.append(f"| {nr} | {u[nr]['name'][:46]} | {k['quelle'].upper()} | "
                     f"[{k['label']}]({k['url']}) `{k['id']}` | {k['wert']:.2f} |")
    ohne = [nr for nr in ZWEIGWERKE if nr in u and nr not in ergebnis]
    if ohne:
        z += ["", "## Ohne Kandidat", "",
              ", ".join(f"Nr. {nr} {u[nr]['name'][:40]}" for nr in ohne)]
    (AUSGABE / "machbarkeit-zweigwerke.md").write_text("\n".join(z) + "\n", encoding="utf-8")

    print(f"\n{sum(len(v) for v in ergebnis.values())} Kandidaten für "
          f"{len(ergebnis)} von {len(ZWEIGWERKE)} Betrieben")
    print("geschrieben: docs/normdaten/zweigwerke-kandidaten.json, "
          "docs/normdaten/machbarkeit-zweigwerke.md")


if __name__ == "__main__":
    main()
