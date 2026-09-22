#!/usr/bin/env python3
"""Baut aus den Kandidatenlisten einen Prüfbogen zum Durchklicken.

Die vier Bestandsabgleiche (GND, Wikidata, PM20, Wikipedia) und die
Zweigwerk-Namenssuche schreiben je eine eigene Markdown-Datei. Zum Lesen taugt das; zum Prüfen nicht. Wer
über Nr. 70 „Gebr. Becker" gegen „SISYPHOS Verlag" entscheiden will,
braucht Speers Angaben, den Normdatensatz und die Nachbarnummer 69
gleichzeitig vor Augen — und die stehen an drei Stellen. Dieses Skript
stellt sie zusammen: eine Karte je Unternehmen, darin alle Kandidaten aus
allen Quellen, mit Tastaturbedienung und vier Urteilswerten.

    python3 scripts/normdaten_pruefbogen.py

Schreibt docs/normdaten/pruefbogen.html — eine einzelne, in sich
geschlossene Datei (die Daten stecken als JSON darin, kein fetch, keine
Nachbardateien). Zum Arbeiten über den lokalen Server öffnen:

    python3 -m http.server 8080
    → http://localhost:8080/docs/normdaten/pruefbogen.html

Über file:// sperrt Chrome den localStorage, und dann kostet ein Reload
die ganze Sitzung.

ERZEUGT GEGEN HANDGEMACHT — der Grund für den Zuschnitt:

    pruefbogen.html   wird bei jedem Lauf überschrieben
    urteile.json      wird NUR GELESEN, nie geschrieben

Dieselbe Trennung wie data/korrekturen.json gegen das gebaute GeoJSON.
Die Urteile entstehen im Browser, werden von dort als Datei exportiert und
von Hand nach docs/normdaten/urteile.json gelegt. Beim nächsten Lauf liest
dieses Skript sie wieder ein und setzt sie in der Seite vor: Wer die
Ähnlichkeitsschwelle ändert, prüft dann nur noch die Differenz.

Die Kandidaten werden neu gerechnet, nicht aus den Markdown-Dateien
gelesen — dieselben Funktionen, dieselben Schwellen wie in den
Geschwisterskripten, damit Bogen und Listen nicht auseinanderlaufen.
Einzige Ausnahme sind die Zweigwerke: Deren Kandidaten stammen aus einer
Namenssuche ohne Ortsfilter und werden als fertige Liste übernommen.
"""
import json
import sys
import urllib.parse
from datetime import date
from html import escape
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(WURZEL / "scripts"))

from normdaten_bestand import aehnlichkeit, normalisiere  # noqa: E402
import normdaten_wikidata as nwd  # noqa: E402
import normdaten_pm20 as npm  # noqa: E402

AUSGABE = WURZEL / "docs" / "normdaten"
SEITE = AUSGABE / "pruefbogen.html"
URTEILE = AUSGABE / "urteile.json"
GND_SPEICHER = AUSGABE / "gnd-wuppertal.json"
WD_SPEICHER = AUSGABE / "wikidata-wuppertal.json"
PM_SPEICHER = AUSGABE / "pm20-wuppertal.json"
WP_SPEICHER = AUSGABE / "wikipedia-wuppertal.json"
ZWEIGWERKE = AUSGABE / "zweigwerke-kandidaten.json"

SCHWELLE_GND = 0.72
SCHWELLE_WD = 0.80
SCHWELLE_PM = 0.72
SCHWELLE_WP = 0.72
MAX_GND = 4

# Wortbestandteile, die einen Wikidata-Typ zweifelsfrei als Betrieb
# ausweisen. Strenger als BETRIEBSTYP in normdaten_wikidata.py, und das mit
# Absicht: Dort steht "werk" als Teilstring, und genau daran rutschen
# "Fachwerkhaus" (Villa Halstenbach, Café vom Cleff) durch den Vorfilter.
KLARER_BETRIEB = (
    "unternehmen", "gewerbebetrieb", "brauerei", "hersteller", "fabrik",
    "konzern", "gesellschaft", "verlag", "bank", "industrie", "manufaktur",
    "spinnerei", "weberei", "färberei", "mühle", "hütte", "genossenschaft",
    "werke", "firma", "organisation", "bergwerk", "zeche",
)

# Typen, die ein Ort oder ein Bauwerk sind und kein Betrieb. Trifft einer
# davon zu und keiner aus KLARER_BETRIEB, schlägt der Bogen "nein" vor —
# sichtbar und mit Begründung, nicht stillschweigend.
KEIN_BETRIEB = (
    "fachwerkhaus", "villa", "wohn- und geschäftshaus", "geschäftshaus",
    "ortsteil", "stadtbezirk", "stadtteil", "brücke", "kirchengebäude",
    "fließgewässer", "naturschutzgebiet", "schutzgebiet", "baudenkmal",
    "baumdenkmal", "denkmal", "stolperstein", "straße", "bauensemble",
    "wohngebäude", "gebäude", "platz", "park", "friedhof", "museum",
    "bahnhof", "schule", "kirche", "turm",
)


def lade_unternehmen():
    """nr -> Stammdaten samt aller Standorte.

    Anders als in den Geschwisterskripten, die je Nummer die erste Zeile
    nehmen: Elf Unternehmen haben mehrere Standorte, und beim Prüfen ist
    gerade der zweite Standort das, was einen Normdatensatz bestätigt oder
    ausschließt (die GND führt für Nr. 192 Barmen *und* Beyenburg).
    """
    d = json.loads((WURZEL / "data" / "unternehmen.geojson").read_text(encoding="utf-8"))
    u = {}
    for f in d["features"]:
        p = f["properties"]
        e = u.setdefault(p["nr"], {
            "nr": p["nr"],
            "name": p["name"],
            "industriezweig": p.get("industriezweig"),
            "existiertHeute": p.get("existiertHeute"),
            "speerText": p.get("speerText"),
            "speerSeite": p.get("speerSeite"),
            "standorte": [],
        })
        ort = " ".join(x for x in (p.get("adresse"), p.get("ort")) if x).strip()
        if p.get("stadtteil") and p.get("stadtteil") != p.get("ort"):
            ort = f"{ort} ({p['stadtteil']})" if ort else p["stadtteil"]
        if p.get("adresseHeute"):
            ort += f" · heute: {p['adresseHeute']}"
        if ort and ort not in e["standorte"]:
            e["standorte"].append(ort)
    return u


def sortierzahl(nr):
    return int("".join(c for c in nr if c.isdigit()) or 0)


def gnd_kandidaten(u):
    """Wie normdaten_bestand.main(), nur ohne Markdown drumherum."""
    bestand = json.loads(GND_SPEICHER.read_text(encoding="utf-8"))
    for e in bestand:
        e["_k"] = [normalisiere(e["name"])] + [normalisiere(v) for v in e["varianten"]]
    je_nr = {}
    for nr, p in u.items():
        ziel = normalisiere(p["name"])
        treffer = []
        for e in bestand:
            wert = max((aehnlichkeit(ziel, k) for k in e["_k"] if k), default=0)
            if wert >= SCHWELLE_GND:
                treffer.append((wert, e))
        treffer.sort(key=lambda t: -t[0])
        gesehen = set()
        for wert, e in treffer[:MAX_GND]:
            if e["id"] in gesehen:
                continue  # der Bestand führt einzelne Einträge doppelt
            gesehen.add(e["id"])
            je_nr.setdefault(nr, []).append({
                "quelle": "gnd",
                "id": e["id"],
                "url": f"https://d-nb.info/gnd/{e['id']}",
                "label": e["name"],
                "typ": e["typ"],
                "ort": e["ort"],
                "varianten": e["varianten"][:8],
                "wert": round(wert, 2),
                "zusatz": {},
            })
    return je_nr, len(bestand)


def wikidata_kandidaten(u):
    items = json.loads(WD_SPEICHER.read_text(encoding="utf-8"))
    betriebe = {k: v for k, v in items.items() if nwd.istbetrieb(v["typ"])}
    schluessel = {nr: normalisiere(p["name"]) for nr, p in u.items()}
    je_nr = {}
    for qid, v in betriebe.items():
        if not v["label"] or v["label"].startswith("Q"):
            continue
        zk = normalisiere(v["label"])
        if not zk:
            continue
        for nr, s in schluessel.items():
            wert = aehnlichkeit(zk, s)
            if wert < SCHWELLE_WD:
                continue
            # Der Zwischenspeicher trägt je nach Alter "grd"/"auf" oder
            # "gruendung"/"aufloesung"; beide Schreibweisen zulassen.
            grd = v.get("gruendung") or v.get("grd") or ""
            auf = v.get("aufloesung") or v.get("auf") or ""
            je_nr.setdefault(nr, []).append({
                "quelle": "wikidata",
                "id": qid,
                "url": f"https://www.wikidata.org/wiki/{qid}",
                "label": v["label"],
                "typ": v["typ"],
                "ort": [],
                "varianten": [],
                "wert": round(wert, 2),
                "zusatz": {k: x for k, x in (
                    ("GND", v.get("gnd")), ("PM20", v.get("pm20")),
                    ("gegründet", grd[:10]), ("aufgelöst", auf[:10])) if x},
            })
    for liste in je_nr.values():
        liste.sort(key=lambda k: -k["wert"])
    return je_nr, len(items), len(betriebe)


def hole_pm20():
    """Zwischenspeicher, sonst SPARQL, sonst nichts.

    PM20 hatte als einziger der drei Läufe keinen Zwischenspeicher — das
    Skript fragte bei jedem Lauf frisch ab. Für den Prüfbogen ist das
    unbrauchbar: Er soll sich auch ohne Netz neu bauen lassen.
    """
    if PM_SPEICHER.exists() and "--neu" not in sys.argv:
        print(f"PM20 aus {PM_SPEICHER.name}")
        return json.loads(PM_SPEICHER.read_text(encoding="utf-8"))
    try:
        print("PM20-Firmenordner werden geholt …")
        ordner = npm.hole_ordner()
    except Exception as e:  # noqa: BLE001
        print(f"  PM20 nicht erreichbar ({e}) — Quelle fehlt im Bogen")
        return {}
    for v in ordner.values():  # Mengen sind nicht JSON-fähig
        v["temporal"] = sorted(v["temporal"])
        v["industry"] = sorted(v["industry"])
    PM_SPEICHER.write_text(json.dumps(ordner, ensure_ascii=False, indent=1),
                           encoding="utf-8")
    print(f"  {len(ordner)} Ordner gespeichert")
    return ordner


def pm20_kandidaten(u, ordner):
    schluessel = {nr: normalisiere(p["name"]) for nr, p in u.items()}
    je_nr = {}
    for e in ordner.values():
        zk = normalisiere(e["label"])
        wert, nr = max(((aehnlichkeit(zk, s), n) for n, s in schluessel.items()),
                       default=(0, None))
        if wert < SCHWELLE_PM or nr is None:
            continue
        wd = (e.get("wd") or "").rsplit("/", 1)[-1]
        je_nr.setdefault(nr, []).append({
            "quelle": "pm20",
            "id": e["id"],
            "url": e["url"],
            "label": e["label"],
            "typ": ["Firmenordner"],
            "ort": [],
            "varianten": [],
            "wert": round(wert, 2),
            "zusatz": {k: x for k, x in (
                ("GND", e.get("gnd")), ("Wikidata", wd),
                ("Dokumente", e.get("docs")),
                ("Zeitraum", ", ".join(e.get("temporal") or []))) if x},
        })
    return je_nr


def wikipedia_kandidaten(u):
    """Vierter Bestandsabgleich: der Kategorienbaum „Unternehmen (Wuppertal)".

    Ein Wikipedia-Treffer bringt Wikidata-Item und GND-Nummer mit; sie
    stehen als Zusatz in der Zeile, damit beim Urteil sichtbar ist, worauf
    der Artikel selbst verweist.
    """
    if not WP_SPEICHER.exists():
        print("  (kein Wikipedia-Bestand — erst normdaten_wikipedia.py laufen lassen)")
        return {}, 0
    seiten = json.loads(WP_SPEICHER.read_text(encoding="utf-8"))
    schluessel = {nr: normalisiere(p["name"]) for nr, p in u.items()}
    je_nr = {}
    for titel, v in seiten.items():
        zk = normalisiere(titel.split(" (")[0])   # "Vorwerk (Unternehmen)"
        if not zk:
            continue
        for nr, s in schluessel.items():
            wert = aehnlichkeit(zk, s)
            if wert < SCHWELLE_WP:
                continue
            je_nr.setdefault(nr, []).append({
                "quelle": "wikipedia",
                "id": titel,
                "url": "https://de.wikipedia.org/wiki/"
                       + urllib.parse.quote(titel.replace(" ", "_")),
                "label": titel,
                "typ": [v["kategorie"].replace("Kategorie:", "")],
                "ort": [],
                "varianten": [],
                "wert": round(wert, 2),
                "zusatz": {k: x for k, x in (("Wikidata", v.get("qid")),
                                             ("GND", v.get("gnd"))) if x},
            })
    for liste in je_nr.values():
        liste.sort(key=lambda k: -k["wert"])
    return je_nr, len(seiten)


def zweigwerk_kandidaten():
    """Treffer aus der Namenssuche ohne Ortsfilter (normdaten_zweigwerke.py).

    Sie tragen ein eigenes Feld `weg`, weil sie anders zu lesen sind als ein
    Bestandstreffer: Gefunden wird das Mutterhaus, nicht das Wuppertaler
    Werk. Ohne diese Angabe sähe im Bogen ein Krupp-Konzerneintrag aus wie
    ein gewöhnlicher Kandidat.
    """
    if not ZWEIGWERKE.exists():
        return {}
    return json.loads(ZWEIGWERKE.read_text(encoding="utf-8"))


def vorentscheid(k):
    """Schlägt 'nein' vor, wo der Typ es hergibt — mit Begründung."""
    if k["quelle"] != "wikidata":
        return None, None
    typen = [t.lower() for t in k["typ"]]
    if any(any(g in t for g in KLARER_BETRIEB) for t in typen):
        return None, None
    treffer = [t for t in k["typ"] if any(g in t.lower() for g in KEIN_BETRIEB)]
    if not treffer:
        return None, None
    return "nein", f"Typ „{treffer[0]}“ — ein Ort oder Bauwerk, kein Betrieb"


def baue_karten(u):
    gnd, gnd_n = gnd_kandidaten(u)
    wd, wd_n, wd_betriebe = wikidata_kandidaten(u)
    pm = pm20_kandidaten(u, hole_pm20())
    wp, wp_n = wikipedia_kandidaten(u)
    zw = zweigwerk_kandidaten()

    karten = []
    for nr in u:
        kandidaten = (gnd.get(nr, []) + wd.get(nr, []) + pm.get(nr, [])
                      + wp.get(nr, []) + zw.get(nr, []))
        if not kandidaten:
            continue
        for k in kandidaten:
            k["schluessel"] = f"{nr}|{k['quelle']}|{k['id']}"
            k["vorschlag"], k["vorschlagGrund"] = vorentscheid(k)
            k.setdefault("weg", None)
        p = u[nr]
        karten.append({
            "nr": nr,
            "name": p["name"],
            "industriezweig": p["industriezweig"],
            "existiertHeute": p["existiertHeute"],
            "speerText": p["speerText"],
            "speerSeite": p["speerSeite"],
            "standorte": p["standorte"],
            "kandidaten": kandidaten,
            "quellenzahl": len({k["quelle"] for k in kandidaten}),
        })

    # Umstritten: derselbe Normdatensatz ist mehreren Betrieben zugewiesen.
    # 17 GND-Einträge treffen 49 Betriebe; nacheinander entschieden sind das
    # 49 Entscheidungen, von denen höchstens 17 richtig ausgehen können.
    wem = {}
    for karte in karten:
        for k in karte["kandidaten"]:
            wem.setdefault(f"{k['quelle']}|{k['id']}", []).append(karte["nr"])
    namen = {karte["nr"]: karte["name"] for karte in karten}
    for karte in karten:
        for k in karte["kandidaten"]:
            andere = [n for n in wem[f"{k['quelle']}|{k['id']}"] if n != karte["nr"]]
            k["umstritten"] = [{"nr": n, "name": namen[n]} for n in andere]

    # Reihenfolge: erst die mehrfach gestützten — an ihnen lernt man die
    # Fehlerarten des Verfahrens, bevor der lange Schwanz drankommt.
    karten.sort(key=lambda karte: (
        -(karte["quellenzahl"] >= 2),
        -max(k["wert"] for k in karte["kandidaten"]),
        sortierzahl(karte["nr"]),
    ))
    return karten, {"gnd": gnd_n, "wikidata": wd_n, "wikidataBetriebe": wd_betriebe,
                    "wikipedia": wp_n}


def lade_urteile():
    if not URTEILE.exists():
        return {}
    d = json.loads(URTEILE.read_text(encoding="utf-8"))
    return d.get("urteile", d)


def main():
    AUSGABE.mkdir(parents=True, exist_ok=True)
    u = lade_unternehmen()
    karten, zahlen = baue_karten(u)
    urteile = lade_urteile()

    daten = {
        "erzeugt": date.today().isoformat(),
        "unternehmen": karten,
        "urteile": urteile,
        "zahlen": zahlen,
    }
    nutzlast = json.dumps(daten, ensure_ascii=False, separators=(",", ":"))
    # </script> im Quellentext würde das Skriptelement vorzeitig schließen.
    nutzlast = nutzlast.replace("</", "<\\/")

    vorlage = (Path(__file__).parent / "normdaten_pruefbogen.html").read_text(encoding="utf-8")
    kandidatenzahl = sum(len(k["kandidaten"]) for k in karten)
    seite = (vorlage
             .replace("__DATEN__", nutzlast)
             .replace("__STAND__", escape(date.today().strftime("%d.%m.%Y")))
             .replace("__BETRIEBE__", str(len(karten)))
             .replace("__KANDIDATEN__", str(kandidatenzahl)))
    SEITE.write_text(seite, encoding="utf-8")

    print(f"\n{len(karten)} Betriebe mit Kandidat, {kandidatenzahl} Entscheidungen")
    print(f"  davon mehrfach gestützt: {sum(1 for k in karten if k['quellenzahl'] >= 2)}")
    print(f"  Vorschlag „nein“ aus dem Typ: "
          f"{sum(1 for karte in karten for k in karte['kandidaten'] if k['vorschlag'])}")
    print(f"  umstritten (mehreren Betrieben zugewiesen): "
          f"{sum(1 for karte in karten for k in karte['kandidaten'] if k['umstritten'])}")
    from collections import Counter
    je_quelle = Counter(k["quelle"] for karte in karten for k in karte["kandidaten"])
    print("  je Quelle: " + ", ".join(f"{q} {n}" for q, n in sorted(je_quelle.items())))
    print(f"  bereits beurteilt: {len(urteile)}")
    print(f"geschrieben: {SEITE.relative_to(WURZEL)} ({SEITE.stat().st_size // 1024} KB)")
    print("öffnen über: python3 -m http.server 8080 → "
          "http://localhost:8080/docs/normdaten/pruefbogen.html")


if __name__ == "__main__":
    main()
