#!/usr/bin/env python3
"""Holt Normdaten-KANDIDATEN aus GND (lobid) und Wikidata.

Dieses Skript entscheidet nichts. Es schlaegt vor, und zwar absichtlich
grosszuegig: lieber vier Kandidaten zur Durchsicht als ein automatisch
gesetzter falscher Treffer. Die Entscheidung faellt von Hand und gehoert
nach data/normdaten.json -- so, wie Korrekturen an den Quelldaten nach
data/korrekturen.json gehoeren und nicht in die XLSX.

    python3 scripts/normdaten_kandidaten.py unternehmen  # geschichtete Stichprobe
    python3 scripts/normdaten_kandidaten.py begriffe     # Ruestungsbegriffe

Schreibt nach docs/normdaten/. Braucht Netz, sonst nichts.

Warum drei Suchvarianten je Unternehmen: "I.G. Farbenindustrie AG Werk
Elberfeld" findet nichts, "I.G. Farbenindustrie" findet auf Anhieb GND
16005-2 und Wikidata Q156152. Der Nulltreffer laege also am Namen, nicht
an der Normdatei -- und ein Verfahren, das solche Faelle als "nicht
vorhanden" verbucht, misst sich selbst.
"""
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
AUSGABE = WURZEL / "docs" / "normdaten"
UA = ("WuppertalZwangsarbeitKarte/0.1 "
      "(https://github.com/rodouc6/wuppertal-kartenprojekt-zwangsarbeit-unternehmen)")

# Rechtsformen und Werkszusaetze, die eine Namenssuche verstellen. Die
# Reihenfolge zaehlt: laengere Formen zuerst, sonst bleibt von
# "GmbH & Co. KG" ein "& Co." stehen.
BALLAST = [
    r"\bGmbH\s*&\s*Co\.?\s*KG\b", r"\bAG\s*&\s*Co\.?\s*KG\b",
    r"\bGmbH\b", r"\bAktiengesellschaft\b", r"\bAG\.?\b", r"\bKG\b",
    r"\bOHG\b", r"\bKGaA\b", r"\be\.?\s?G\.?m\.?b\.?H\.?\b",
    r"\bWerk\s+\w+\b", r"\bZweigwerk\b", r"\bFiliale\b",
    r"\bNachf\.?\b", r"\bvorm\.?\b", r"\bInh\.?\s+\w+\b",
]


def hole(url, versuche=3):
    """Ein GET mit Wiederholung. Wikidata bricht bei schneller Folge ab;
    ein stiller Fehler wuerde hier als 'kein Normdatensatz' durchgehen und
    genau die Zahl verfaelschen, die gemessen werden soll."""
    letzter = None
    for i in range(versuche):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001 -- Netz, alles kann kommen
            letzter = e
            time.sleep(1.5 * (i + 1))
    raise RuntimeError(f"nach {versuche} Versuchen: {letzter}")


def namensvarianten(name):
    """Voller Name, Name ohne Rechtsform/Werkszusatz, erstes Namenswort."""
    varianten = [name]
    knapp = name
    for muster in BALLAST:
        knapp = re.sub(muster, " ", knapp, flags=re.IGNORECASE)
    knapp = re.sub(r"[.,;]+\s*$", "", re.sub(r"\s{2,}", " ", knapp)).strip()
    if knapp and knapp.lower() != name.lower():
        varianten.append(knapp)
    return varianten


def gnd_suche(begriff, typ=None):
    url = ("https://lobid.org/gnd/search?"
           f"q={urllib.parse.quote(begriff)}&format=json&size=4")
    if typ:
        url += f"&filter=type:{typ}"
    d = hole(url)
    treffer = []
    for m in d.get("member", []):
        typen = [t for t in m.get("type", [])
                 if t not in ("AuthorityResource", "DifferentiatedPerson")]
        treffer.append({
            "id": m.get("gndIdentifier"),
            "name": m.get("preferredName"),
            "typ": ", ".join(typen[:3]),
            "ort": ", ".join(o.get("label", "") for o in (m.get("placeOfBusiness") or []))
                   or ", ".join(o.get("label", "") for o in (m.get("geographicAreaCode") or [])),
        })
    return treffer


def wikidata_suche(begriff):
    url = ("https://www.wikidata.org/w/api.php?action=wbsearchentities"
           f"&search={urllib.parse.quote(begriff)}"
           "&language=de&uselang=de&format=json&limit=4&type=item")
    d = hole(url)
    return [{"id": r["id"], "name": r.get("label"),
             "beschreibung": (r.get("description") or "")}
            for r in d.get("search", [])]


def wikidata_details(ids):
    """P31 (ist ein), P227 (GND-Nummer) und der deutsche Wikipedia-Artikel.

    P227 ist das eigentliche Pruefmittel: Nennt ein Wikidata-Item dieselbe
    GND-Nummer, die die GND-Suche geliefert hat, bestaetigen sich zwei
    unabhaengige Quellen. Das ist deutlich mehr wert als zwei Namenstreffer."""
    if not ids:
        return {}
    url = ("https://www.wikidata.org/w/api.php?action=wbgetentities"
           f"&ids={'|'.join(ids)}&props=claims|sitelinks"
           "&sitefilter=dewiki&format=json")
    d = hole(url)
    ergebnis = {}
    for wid, ent in (d.get("entities") or {}).items():
        anspruch = ent.get("claims") or {}

        def werte(prop):
            raus = []
            for c in anspruch.get(prop, []):
                v = ((c.get("mainsnak") or {}).get("datavalue") or {}).get("value")
                if isinstance(v, dict) and "id" in v:
                    raus.append(v["id"])
                elif isinstance(v, str):
                    raus.append(v)
            return raus

        artikel = ((ent.get("sitelinks") or {}).get("dewiki") or {}).get("title")
        ergebnis[wid] = {
            "istEin": werte("P31"),
            "gnd": werte("P227"),
            "wikipedia": artikel,
        }
    return ergebnis


def sammle(begriff, typ=None):
    """Alle Varianten durchsuchen, Treffer vereinen, Wikidata anreichern."""
    gnd, wd, gesehen_g, gesehen_w = [], [], set(), set()
    for v in namensvarianten(begriff):
        for t in gnd_suche(v, typ):
            if t["id"] and t["id"] not in gesehen_g:
                gesehen_g.add(t["id"])
                t["gefundenMit"] = v
                gnd.append(t)
        time.sleep(0.4)
        for t in wikidata_suche(v):
            if t["id"] not in gesehen_w:
                gesehen_w.add(t["id"])
                t["gefundenMit"] = v
                wd.append(t)
        time.sleep(0.8)
    details = wikidata_details([t["id"] for t in wd][:8])
    for t in wd:
        t.update(details.get(t["id"], {}))
    # Wechselseitige Bestaetigung markieren
    gnd_ids = {t["id"] for t in gnd}
    for t in wd:
        t["bestaetigt"] = bool(set(t.get("gnd") or []) & gnd_ids)
    return {"gnd": gnd, "wikidata": wd}


def zeile(t, art):
    if art == "gnd":
        ort = f" · {t['ort']}" if t.get("ort") else ""
        return (f"  - GND `{t['id']}` **{t['name']}** — {t['typ'] or '?'}{ort}  "
                f"<sub>gesucht: {t['gefundenMit']}</sub>")
    marke = " ✓**GND-bestätigt**" if t.get("bestaetigt") else ""
    wp = f" · [de:{t['wikipedia']}]" if t.get("wikipedia") else " · _kein de-Artikel_"
    gnd = f" · GND {', '.join(t['gnd'])}" if t.get("gnd") else ""
    return (f"  - WD `{t['id']}` **{t['name']}** — {t['beschreibung'] or '?'}"
            f"{gnd}{wp}{marke}  <sub>gesucht: {t['gefundenMit']}</sub>")


def schreibe(pfad, titel, vorspann, eintraege):
    zeilen = [f"# {titel}", "", vorspann, ""]
    for e in eintraege:
        zeilen.append(f"## {e['titel']}")
        if e.get("kontext"):
            zeilen.append("")
            zeilen.append(f"> {e['kontext']}")
        zeilen.append("")
        for art in ("gnd", "wikidata"):
            treffer = e["fund"][art]
            if not treffer:
                zeilen.append(f"  - {art.upper()}: **kein Treffer**")
                continue
            for t in treffer[:4]:
                zeilen.append(zeile(t, art))
        zeilen.append("")
    pfad.write_text("\n".join(zeilen) + "\n", encoding="utf-8")
    print(f"geschrieben: {pfad.relative_to(WURZEL)}  ({len(eintraege)} Einträge)")


def lade_unternehmen():
    d = json.loads((WURZEL / "data" / "unternehmen.geojson").read_text(encoding="utf-8"))
    u = {}
    for x in d["features"]:
        u.setdefault(x["properties"]["nr"], x["properties"])
    return u


def stichprobe(u, je=10):
    """Geschichtet, nicht zufaellig: die Trefferquote unterscheidet sich
    stark zwischen grossen, fortbestehenden und erloschenen Betrieben. Eine
    reine Zufallsstichprobe aus 431 traefe fast nur den langen Schwanz und
    verdeckte, dass der Anfang sich lohnt."""
    def groesse(p):
        return max([r.get("gesamt") or 0 for r in p["records"]] or [0])

    def nr_zahl(p):
        return int("".join(c for c in p["nr"] if c.isdigit()) or 0)

    gross = sorted(u.values(), key=groesse, reverse=True)[:je]
    vergeben = {p["nr"] for p in gross}
    heute = [p for p in sorted(u.values(), key=nr_zahl)
             if p.get("existiertHeute") == "ja" and p["nr"] not in vergeben]
    heute = heute[::max(1, len(heute) // je)][:je]
    vergeben |= {p["nr"] for p in heute}
    rest = [p for p in sorted(u.values(), key=nr_zahl) if p["nr"] not in vergeben]
    rest = rest[::max(1, len(rest) // je)][:je]
    return [("groß", gross), ("besteht heute", heute), ("übrige", rest)]


# Begriffe aus den 117 Ruestungsguetertexten, in drei Klassen. Von Hand
# gezogen, nicht per Regex: "Jaegerprogramm" und "Aktion 88" haben dieselbe
# Textgestalt wie "Munitionsprogramm", meinen aber Verschiedenes, und die
# Waffensysteme stehen als Typenkuerzel da ("Me 262", "SD 2"), die keine
# Mustersuche als Begriff erkennt.
BEGRIFFE = {
    "Programme und Aktionen": [
        "Geilenberg-Programm", "Jägerprogramm", "Führer-Notprogramm",
        "Brandt-Programm", "Rüstungs-Notprogramm", "Panzerprogramm",
        "Volksgewehr-Aktion", "Kugellager-Schnellaktion", "Ostprogramm",
        "Mineralölsicherungsplan", "Jägerstab",
    ],
    "Waffen und Geräte": [
        "Messerschmitt Me 262", "Messerschmitt Bf 109", "Junkers Ju 88",
        "Panzerkampfwagen Tiger", "Panzerkampfwagen Panther",
        "8,8-cm-FlaK", "Faustpatrone", "Volkssturmgewehr",
        "Granatwerfer 34", "SD 2 Splitterbombe", "V-Waffe",
    ],
    "Organisationen und Auftraggeber": [
        "Organisation Todt", "Reichsluftfahrtministerium",
        "Heereswaffenamt", "Oberkommando des Heeres", "Deutsche Reichsbahn",
        "Ford-Werke Köln", "Atlas-Werke Bremen",
        "Gutehoffnungshütte Oberhausen", "Deutsches Rotes Kreuz",
    ],
}


def lauf_unternehmen():
    u = lade_unternehmen()
    eintraege = []
    for schicht, betriebe in stichprobe(u):
        for p in betriebe:
            name = p["name"]
            print(f"  … {p['nr']} {name}")
            try:
                fund = sammle(name, typ="CorporateBody")
            except RuntimeError as e:
                print(f"     ABBRUCH: {e}")
                fund = {"gnd": [], "wikidata": []}
            kontext = (f"Nr. {p['nr']} · {schicht} · "
                       f"{p.get('industriezweig') or '?'} · "
                       f"existiert heute: {p.get('existiertHeute') or '?'} · "
                       f"{p.get('adresse') or ''} {p.get('ort') or ''}".strip())
            eintraege.append({"titel": f"{p['nr']} — {name}",
                              "kontext": kontext, "fund": fund})
    schreibe(AUSGABE / "machbarkeit-unternehmen.md",
             "Machbarkeitstest: Normdaten für Unternehmen",
             "Kandidaten aus GND (lobid) und Wikidata, **ungeprüft**. Erzeugt von "
             "`scripts/normdaten_kandidaten.py unternehmen` — wird bei jedem Lauf "
             "überschrieben. Die Bewertung steht in `machbarkeit-befund.md`.",
             eintraege)


def lauf_begriffe():
    eintraege = []
    for klasse, begriffe in BEGRIFFE.items():
        for b in begriffe:
            print(f"  … {b}")
            try:
                fund = sammle(b)
            except RuntimeError as e:
                print(f"     ABBRUCH: {e}")
                fund = {"gnd": [], "wikidata": []}
            eintraege.append({"titel": b, "kontext": klasse, "fund": fund})
    schreibe(AUSGABE / "machbarkeit-begriffe.md",
             "Machbarkeitstest: Normdaten für Rüstungsbegriffe",
             "Kandidaten aus GND (lobid) und Wikidata, **ungeprüft**. Erzeugt von "
             "`scripts/normdaten_kandidaten.py begriffe` — wird bei jedem Lauf "
             "überschrieben. Die Bewertung steht in `machbarkeit-befund.md`.",
             eintraege)


if __name__ == "__main__":
    AUSGABE.mkdir(parents=True, exist_ok=True)
    modus = sys.argv[1] if len(sys.argv) > 1 else ""
    if modus == "unternehmen":
        lauf_unternehmen()
    elif modus == "begriffe":
        lauf_begriffe()
    else:
        sys.exit(__doc__)
