#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prüft die unsicher verorteten Standorte gegen den heutigen Adressbestand
Wuppertals und schreibt docs/verortung-pruefliste.md.

Geprüft wird alles, was nicht `hausgenau` ist: `strassengenau` (die
Geokodierung traf nur die Straße), `ungefaehr` (nur den Ortsteil) und `ohne`
(gar keine Koordinate — diese Standorte fehlen auf der Karte vollständig).
Für jeden beantwortet das Skript die Frage, woran es liegt: existiert die
Hausnummer heute noch (dann ließe sich hausgenau nachverorten), ist nur die
Straße geblieben, oder fehlt in der Quelle von vornherein eine Hausnummer?

Der Adressbestand kommt über die Overpass-API aus OpenStreetMap und wird lokal
zwischengespeichert (data/.cache/osm_adressen_wuppertal.tsv). Mit --neu wird
er neu geholt.

    python3 scripts/pruefe_verortung.py [--neu]

Das Ergebnis ist eine Arbeitsgrundlage, keine Datenquelle. Korrekturen an den
Daten gehören nach data/korrekturen.json.
"""

import argparse
import csv
import json
import math
import os
import re
import sys
import urllib.parse
import urllib.request
from collections import Counter, defaultdict

BASIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEOJSON_PATH = os.path.join(BASIS, "data", "unternehmen.geojson")
CACHE_PATH = os.path.join(BASIS, "data", ".cache", "osm_adressen_wuppertal.tsv")
AUSGABE_PATH = os.path.join(BASIS, "docs", "verortung-pruefliste.md")

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OVERPASS_QUERY = """
[out:csv("addr:street","addr:housenumber",::lat,::lon;false)][timeout:600];
area["name"="Wuppertal"]["boundary"="administrative"]["admin_level"="6"]->.a;
nwr(area.a)["addr:housenumber"]["addr:street"];
out center;
"""

# Schreibvarianten der Quelle gegenüber dem heutigen Namen. Über einen
# Ähnlichkeitsabgleich gefunden und einzeln geprüft — nur eindeutige Fälle.
# "Nöllenhammerstraße" (Nr. 319) steht bewusst nicht hier: der ähnlichste
# heutige Name ist "Nöllenhammerweg", und Straße/Weg ist keine Schreibvariante.
ALIAS = {
    "warndstrasse": "Warndtstraße",
    "neumarktstasse": "Neumarktstraße",
    "vordbeule": "Vor der Beule",
    "holenscheidterstrasse": "Hohlenscheidter Straße",
    "wertherbruecke": "Zur Werther Brücke",
}

# Alles, was nicht hausgenau ist, gehoert auf die Prueflist -- auch die
# Standorte ohne jede Koordinate. Gerade sie sind der groesste Hebel: sie
# erscheinen bislang auf keiner Karte.
UNSICHERE_STUFEN = ("strassengenau", "ungefaehr", "ohne")

BEFUNDE = {
    "A": "Hausnummer existiert heute — hausgenau nachverortbar",
    "B": "Nummer selbst weg, aber eine Nummer aus dem angegebenen Bereich "
         "bzw. die Nummer ohne Zusatz existiert",
    "C": "Straße existiert, diese Hausnummer heute nicht mehr",
    "D": "Die Quelle nennt gar keine Hausnummer",
    "E": "Straßenname heute nicht auffindbar",
}


# --------------------------------------------------------------- Adressbestand

def hole_adressbestand(neu=False):
    """Liefert den Pfad zur TSV mit allen Wuppertaler Adressen."""
    if os.path.exists(CACHE_PATH) and not neu:
        return CACHE_PATH
    print("  Overpass-Abfrage läuft (das dauert eine Weile) …")
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    daten = urllib.parse.urlencode({"data": OVERPASS_QUERY}).encode("utf-8")
    anfrage = urllib.request.Request(
        OVERPASS_URL, data=daten,
        headers={"User-Agent": "wuppertal-kartenprojekt/verortungspruefung"})
    with urllib.request.urlopen(anfrage, timeout=600) as antwort:
        inhalt = antwort.read().decode("utf-8")
    if len(inhalt) < 1000:
        sys.exit("Overpass lieferte zu wenig Daten — Abfrage fehlgeschlagen:\n" + inhalt[:500])
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        f.write(inhalt)
    return CACHE_PATH


def lies_adressbestand(pfad):
    """-> (adressen: strasse -> hausnummer -> zeile, namen: strasse -> Anzeigename)"""
    adressen = defaultdict(dict)
    namen = {}
    with open(pfad, encoding="utf-8") as f:
        for zeile in csv.reader(f, delimiter="\t"):
            if len(zeile) < 4 or not zeile[0]:
                continue
            schluessel = norm_strasse(zeile[0])
            namen.setdefault(schluessel, zeile[0])
            adressen[schluessel][norm_hausnummer(zeile[1])] = zeile
    return adressen, namen


# ------------------------------------------------------------- Normalisierung

def norm_strasse(s):
    """Vergleichsform: 'Solinger Str.' und 'Solinger Straße' fallen zusammen."""
    s = s.lower().strip()
    s = (s.replace("ß", "ss").replace("ä", "ae")
          .replace("ö", "oe").replace("ü", "ue"))
    s = re.sub(r"str\.", "strasse", s)   # "Feldstr." / "Solinger Str."
    s = re.sub(r"str$", "strasse", s)    # "Feldstr" ohne Punkt
    return re.sub(r"[^a-z0-9]", "", s)


def norm_hausnummer(h):
    return re.sub(r"\s+", "", h.lower().strip())


def zerlege(adresse):
    """Trennt Straße und Hausnummer -> (strasse, kandidaten, form).

    Die Kandidatenliste ist absteigend nach Genauigkeit sortiert: der erste
    Eintrag ist die Nummer, die die Quelle wörtlich nennt.
    """
    a = re.sub(r"\bo\.\s*Nr\.?\b", "", adresse, flags=re.I).strip()
    treffer = re.search(r"^(.*?)[\s,]+(\d.*)$", a)
    if not treffer:
        return a, [], "ohne Hausnummer"
    strasse, rest = treffer.group(1), treffer.group(2).strip()

    bereich = re.match(r"^(\d+)\s*[-–/]\s*(\d+)", rest)
    if bereich:
        von, bis = int(bereich.group(1)), int(bereich.group(2))
        if bis < von:
            von, bis = bis, von
        if bis - von > 60:          # unplausibel weit, nur den Anfang prüfen
            return strasse, [str(von)], "Bereich"
        # Haben beide Grenzen dieselbe Parität, meint "87-93" die Nummern
        # 87, 89, 91, 93 — Nr. 88 liegt auf der gegenüberliegenden
        # Straßenseite und gehört nicht zum Grundstück.
        schritt = 2 if von % 2 == bis % 2 else 1
        return strasse, [str(n) for n in range(von, bis + 1, schritt)], "Bereich"

    einzeln = re.match(r"^(\d+)\s*([a-zA-Z]?)", rest)
    if einzeln:
        nummer, zusatz = einzeln.group(1), einzeln.group(2).lower()
        if zusatz:
            return strasse, [nummer + zusatz, nummer], "Nummer mit Zusatz"
        return strasse, [nummer], "einfache Nummer"

    return strasse, [], "ohne Hausnummer"


# ------------------------------------------------------------------- Prüfung

def lade_ausgangskoordinaten():
    """Die Koordinaten vor jeder Geometrie-Korrektur, aus korrekturen.json.

    Sobald eine Korrektur aus dieser Prüfung übernommen wurde, steht im
    GeoJSON der neue Punkt. Ein erneuter Lauf würde dann eine Verschiebung
    von null Metern ausweisen und den Nutzen der Korrektur verschleiern.
    Der Vergleich muss deshalb gegen den ursprünglichen Wert laufen.
    """
    pfad = os.path.join(BASIS, "data", "korrekturen.json")
    if not os.path.exists(pfad):
        return {}
    with open(pfad, encoding="utf-8") as f:
        roh = json.load(f)
    ausgang = {}
    for nr, eintraege in roh.items():
        if nr.startswith("_"):
            continue
        for e in eintraege:
            if e["feld"] == "geometrie" and e.get("alt"):
                ausgang[nr] = e["alt"]
    return ausgang


def lade_hochgestufte(features):
    """Standorte, die diese Prüfung von strassengenau auf hausgenau gehoben hat.

    Sie fallen damit aus der Liste heraus. Ohne einen Nachweis sähe es aus,
    als wären sie nie geprüft worden — deshalb bleiben sie dokumentiert.
    """
    pfad = os.path.join(BASIS, "data", "korrekturen.json")
    if not os.path.exists(pfad):
        return {}
    with open(pfad, encoding="utf-8") as f:
        roh = json.load(f)
    nach_nr = {}
    for feature in features:
        nach_nr.setdefault(feature["properties"]["nr"], feature["properties"])
    hoch = {}
    for nr, eintraege in roh.items():
        if nr.startswith("_"):
            continue
        for e in eintraege:
            if e["feld"] != "geometrie" or e.get("verortung") != "hausgenau":
                continue
            p = nach_nr.get(nr)
            # Nr. 88 wurde aus einem ganz anderen Grund korrigiert (Fehltreffer
            # in Istanbul) und gehoert nicht in diese Liste.
            if p is None or "Overpass-Abzug" not in (e.get("beleg") or ""):
                continue
            heute = re.sub(r"^OpenStreetMap,\s*", "", e.get("beleg", ""))
            heute = re.sub(r",\s*Wuppertal.*$", "", heute)
            hoch[nr] = {"name": p.get("name"), "adresse": p.get("adresse"),
                        "heute": heute, "neu": e["neu"]}
    return hoch


def pruefe(features, adressen, namen, ausgang=None):
    ausgang = ausgang or {}
    zeilen = []
    for feature in features:
        p = feature["properties"]
        adresse = (p.get("adresse") or "").strip()
        strasse, kandidaten, form = zerlege(adresse)

        schluessel = norm_strasse(strasse)
        alias = ALIAS.get(schluessel)
        if alias:
            schluessel = norm_strasse(alias)
        strasse_vorhanden = schluessel in namen

        treffer, exakt = None, False
        if strasse_vorhanden and form == "Bereich":
            # Der Betrieb belegte den ganzen Bereich. Statt einer beliebigen
            # Nummer daraus ist der Schwerpunkt aller heute noch vorhandenen
            # Nummern die beste Schätzung für die Mitte des Grundstücks.
            gefunden = [adressen[schluessel][norm_hausnummer(k)]
                        for k in kandidaten
                        if norm_hausnummer(k) in adressen[schluessel]]
            if gefunden:
                treffer = {
                    "strasse": gefunden[0][0],
                    "hnr": ", ".join(z[1] for z in gefunden),
                    "lat": round(sum(float(z[2]) for z in gefunden) / len(gefunden), 6),
                    "lon": round(sum(float(z[3]) for z in gefunden) / len(gefunden), 6),
                    "anzahl": len(gefunden), "von": len(kandidaten),
                }
        elif strasse_vorhanden:
            for i, kandidat in enumerate(kandidaten):
                zeile = adressen[schluessel].get(norm_hausnummer(kandidat))
                if zeile:
                    treffer = {"strasse": zeile[0], "hnr": zeile[1],
                               "lat": round(float(zeile[2]), 6),
                               "lon": round(float(zeile[3]), 6),
                               "anzahl": 1, "von": 1}
                    exakt = (i == 0)
                    break

        if not strasse_vorhanden:
            befund = "E"
        elif form == "ohne Hausnummer":
            befund = "D"
        elif treffer and exakt:
            befund = "A"
        elif treffer:
            befund = "B"
        else:
            befund = "C"

        zeilen.append({
            "nr": p["nr"], "standortNr": p.get("standortNr"), "name": p["name"],
            "stufe": p.get("verortung"),
            "adresse": adresse, "stadtteil": p.get("stadtteil") or "",
            "form": form, "befund": befund, "alias": alias,
            "treffer": treffer,
            "koordinate_bisher": (ausgang.get(p["nr"])
                                  or (feature["geometry"]["coordinates"]
                                      if feature.get("geometry") else None)),
            "bereits_korrigiert": p["nr"] in ausgang,
        })
    return zeilen


def kalibriere(features_hausgenau, adressen, namen):
    """Wie viele der bereits hausgenauen Adressen findet der Abgleich wieder?

    Ohne diese Gegenprobe wäre eine niedrige Trefferquote nicht deutbar: sie
    könnte ebenso am Verfahren wie an den Daten liegen.
    """
    geprueft = gefunden = 0
    for feature in features_hausgenau:
        adresse = (feature["properties"].get("adresse") or "").strip()
        strasse, kandidaten, form = zerlege(adresse)
        if form != "einfache Nummer":
            continue
        geprueft += 1
        schluessel = norm_strasse(strasse)
        if schluessel in namen and any(
                norm_hausnummer(k) in adressen[schluessel] for k in kandidaten):
            gefunden += 1
    return gefunden, geprueft


def verschiebung_m(zeile):
    """Wie weit wandert der Punkt? None, wenn es vorher gar keinen gab."""
    b, t = zeile.get("koordinate_bisher"), zeile.get("treffer")
    if not b or not t:
        return None
    return entfernung_m(b[0], b[1], t["lat"], t["lon"])


def entfernung_m(lon1, lat1, lat2, lon2):
    dx = (lon2 - lon1) * math.cos(math.radians(lat2)) * 111320
    dy = (lat2 - lat1) * 110540
    return round(math.hypot(dx, dy))


# ------------------------------------------------------------------ Ausgabe

# Kurzform der Ausgangsstufe fuer die Tabellen. "keine" ist der wichtigste
# Wert: diese Standorte erscheinen bislang auf keiner Karte.
STUFE_KURZ = {"strassengenau": "Straße", "ungefaehr": "Ortsteil", "ohne": "**keine**"}


def tabelle(zeilen, mit_treffer=True):
    kopf = "| Nr. | Unternehmen | Adresse (Quelle) | Stadtteil | bisher |"
    trenn = "|---|---|---|---|---|"
    if mit_treffer:
        kopf += " heutiger OSM-Treffer | Koordinate |"
        trenn += "---|---|"
    aus = [kopf, trenn]
    for z in zeilen:
        snr = f" ({z['standortNr']})" if (z["standortNr"] or 1) != 1 else ""
        stufe = STUFE_KURZ.get(z.get("stufe"), z.get("stufe") or "—")
        zeile = (f"| {z['nr']}{snr} | {z['name']} | {z['adresse']} "
                 f"| {z['stadtteil']} | {stufe} |")
        if mit_treffer:
            t = z["treffer"]
            zeile += (f" {t['strasse']} {t['hnr']} | {t['lat']}, {t['lon']} |"
                      if t else "  | — |")
        aus.append(zeile)
    return aus


def schreibe_markdown(zeilen, kalib, anzahl_adressen, gesamt_features,
                      hochgestuft=None):
    hochgestuft = hochgestuft or {}
    zaehler = Counter(z["befund"] for z in zeilen)
    gefunden, geprueft = kalib
    quote_hausgenau = round(gefunden / geprueft * 100) if geprueft else 0
    einfache = [z for z in zeilen if z["form"] == "einfache Nummer"]
    einfache_treffer = sum(1 for z in einfache if z["befund"] == "A")
    quote_strassengenau = (round(einfache_treffer / len(einfache) * 100)
                           if einfache else 0)

    L = []
    w = L.append
    stufen = Counter(z.get("stufe") for z in zeilen)
    w("# Prüfliste: unsicher verortete Standorte\n")
    w(f"{len(zeilen)} von {gesamt_features} Standorten\n")

    w("## Worum es geht\n")
    w("Geprüft wird alles, was nicht `hausgenau` verortet ist:\n")
    w(f"- **`strassengenau`** ({stufen.get('strassengenau', 0)}) — die Geokodierung traf")
    w("  nur die Straße. Der Punkt sitzt auf dem Straßenmittelpunkt und kann einige")
    w("  hundert Meter neben dem tatsächlichen Betriebsgelände liegen.")
    w(f"- **`ungefaehr`** ({stufen.get('ungefaehr', 0)}) — nur der Ortsteil ist getroffen.")
    w(f"- **`ohne`** ({stufen.get('ohne', 0)}) — gar keine Koordinate. Diese Standorte")
    w("  erscheinen auf keiner Karte.\n")
    w(f"Die Liste sagt für jeden dieser {len(zeilen)} Standorte, **warum** das so ist und")
    w("**ob** sich daran etwas ändern lässt.\n")

    w("## Wie geprüft wurde\n")
    w("Der heutige Adressbestand Wuppertals wurde über die Overpass-API aus OpenStreetMap")
    w(f"geholt ({f'{anzahl_adressen:,}'.replace(',', '.')} Adressen mit Straße und "
      f"Hausnummer) und lokal gegen die")
    w("Quelladressen abgeglichen — mit normalisierten Straßennamen (`Str.` ↔ `Straße`,")
    w("Zusammen-/Getrenntschreibung, Umlaute) und aufgelösten Hausnummernbereichen.\n")
    w(f"**Kalibrierung:** derselbe Abgleich findet {gefunden} von {geprueft} ({quote_hausgenau} %)")
    w("der bereits *hausgenau* verorteten Adressen wieder. Die Methode ist also belastbar;")
    w("wenn sie eine Adresse nicht findet, liegt das nicht am Verfahren.\n")
    w(f"Bei den unsicheren findet sie dagegen nur {einfache_treffer} von {len(einfache)}")
    w(f"({quote_strassengenau} %). **Das ist der zentrale Befund: diese Adressen sind nicht")
    w("schlecht geokodiert, sie existieren heute überwiegend nicht mehr.** Kriegszerstörung,")
    w("Neubebauung, Umnummerierung.\n")

    w("## Befunde im Überblick\n")
    w("| Klasse | Bedeutung | Anzahl |")
    w("|---|---|---:|")
    for k in sorted(BEFUNDE):
        w(f"| **{k}** | {BEFUNDE[k]} | {zaehler.get(k, 0)} |")
    w(f"| | **gesamt** | **{len(zeilen)}** |\n")

    gruppe_a = [z for z in zeilen if z["befund"] == "A"]
    w("## A — hausgenau nachverortbar\n")
    w("Hier gibt es die Hausnummer heute noch. Die Geokodierung ist durchweg an")
    w("Schreibweisen gescheitert (`Mettmannerstr.` statt `Mettmanner Straße`,")
    w("`Blombacherbach` statt `Blombacher Bach`) und auf die Straßenmitte zurückgefallen.\n")
    if hochgestuft:
        w(f"**{len(hochgestuft)} dieser Standorte sind inzwischen auf `hausgenau` "
          f"hochgestuft**")
        w("und erscheinen deshalb nicht mehr in dieser Liste — sie zählt nur")
        w("noch, was straßengenau geblieben ist. Übernommen wurden sie, weil eine")
        w("unabhängige Nominatim-Abfrage dort ein Gebäude liefert (0–6 m Abweichung), der")
        w("Beleg also nicht allein am Overpass-Abzug hängt:\n")
        w("| Nr. | Unternehmen | Adresse (Quelle) | heute | neue Koordinate |")
        w("|---|---|---|---|---|")
        for nr, e in sorted(hochgestuft.items(), key=lambda p: int(re.match(r"\d+", p[0]).group())):
            w(f"| {nr} | {e['name']} | {e['adresse']} | {e['heute']} "
              f"| {e['neu'][1]}, {e['neu'][0]} |")
        w("")
    if gruppe_a:
        w("Offen sind noch diese Fälle:\n")
        L.extend(tabelle(gruppe_a))
        w("")
        w("Abstand zur bisherigen Koordinate:\n")
        w("| Nr. | bisher (lon, lat) | neu (lat, lon) | Abweichung |")
        w("|---|---|---|---|")
        for z in gruppe_a:
            b, t = z["koordinate_bisher"], z["treffer"]
            d = verschiebung_m(z)
            w(f"| {z['nr']} | {f'{b[0]}, {b[1]}' if b else '— (keine)'} "
              f"| {t['lat']}, {t['lon']} | {f'~{d} m' if d is not None else 'erstmals verortet'} |")
        w("")
        w("Bei **Nr. 122** (Mettmanner Straße 79) und **Nr. 255** (Spitzenstraße 37) findet")
        w("Nominatim die Hausnummer nicht und fällt auf die Straße zurück — genau der Grund,")
        w("warum sie `strassengenau` sind. Im OSM-Rohbestand existiert die Nummer sehr wohl,")
        w("beide Straßennamen kommen in Wuppertal nur einmal vor, und die Nummernfolge ist")
        w("an beiden Stellen stimmig. Die Treffer sind damit plausibel, stützen sich aber")
        w("auf eine einzige Quelle. Vor einer Übernahme sollten sie an einer zweiten")
        w("geprüft werden — ein historisches Adressbuch oder ein Katasterplan.\n")

    gruppe_b = [z for z in zeilen if z["befund"] == "B"]
    bereiche = [z for z in gruppe_b if z["form"] == "Bereich"]
    zusaetze = [z for z in gruppe_b if z["form"] == "Nummer mit Zusatz"]
    verschiebungen = sorted(d for d in (verschiebung_m(z) for z in gruppe_b)
                            if d is not None)
    median = verschiebungen[len(verschiebungen) // 2] if verschiebungen else 0

    w("## B — Nummer benachbart oder im Bereich vorhanden\n")
    w("Die Quelle nennt einen Bereich (`87-93`) oder einen Buchstabenzusatz (`118 a`).")
    w("Die angegebene Nummer selbst gibt es heute nicht, wohl aber eine benachbarte.\n")
    uebernommen = sum(1 for z in gruppe_b if z.get("bereits_korrigiert"))
    if uebernommen == len(gruppe_b):
        w(f"**Diese {len(gruppe_b)} Standorte sind übernommen** — die Koordinaten stehen in")
        w("`data/korrekturen.json`, jeder Eintrag mit Begründung und Beleg. Der neue Punkt")
        w(f"liegt im Median {median} m vom früheren Straßenmittelpunkt entfernt; bei langen")
        w("Straßen ist dieser Mittelpunkt praktisch beliebig, die Hausnummer nicht.")
    else:
        w(f"**Diese {len(gruppe_b)} Standorte ließen sich besser kartieren als bisher.** Der")
        w(f"Ersatzpunkt liegt im Median {median} m vom heutigen Straßenmittelpunkt entfernt —")
        w("bei langen Straßen ist dieser Mittelpunkt praktisch beliebig, die Hausnummer nicht.")
    w("")
    w("Die Stufe bleibt `strassengenau`: sie sagt, wie genau der Ort bekannt ist, nicht,")
    w("wie der Punkt entstanden ist. Welches Haus des Bereichs der Betrieb belegte, sagt")
    w("die Quelle nicht. Jeder Standort trägt zusätzlich ein Feld `verortungHinweis`, das")
    w("die verwendete Hausnummer nennt und in der Seitenleiste erscheint.\n")
    w("Die Gruppe ist nicht einheitlich:\n")
    w(f"- **{len(zusaetze)} Fälle mit Buchstabenzusatz** (`143 a` → `143`). In der Regel")
    w("  Anbau, Hinterhaus oder geteiltes Grundstück, also unmittelbar benachbart. Das ist")
    w("  der verlässlichere Teil der Gruppe.")
    w(f"- **{len(bereiche)} Bereichsangaben.** Hier ist der Punkt der Schwerpunkt aller")
    w("  Nummern des Bereichs, die es heute noch gibt. Wie belastbar das ist, hängt daran,")
    w("  wie viele das sind — die Spalte „belegt“ nennt es. Bei nur einer belegten Nummer")
    w("  aus einem weiten Bereich ist der Punkt eher Interpolation als Beleg.\n")
    w("Hausnummernbereiche werden dabei paritätsgerecht aufgelöst: `87-93` meint 87, 89,")
    w("91, 93 — Nr. 88 läge auf der gegenüberliegenden Straßenseite und zählt nicht.\n")
    kopf = ("| Nr. | Unternehmen | Adresse (Quelle) | Stadtteil | bisher | "
            "heutige Nummern | belegt | Koordinate |")
    L.append(kopf)
    L.append("|---|---|---|---|---|---|---|---|")
    for z in gruppe_b:
        snr = f" ({z['standortNr']})" if (z["standortNr"] or 1) != 1 else ""
        t = z["treffer"]
        belegt = (f"{t['anzahl']} von {t['von']}" if z["form"] == "Bereich" else "—")
        stufe = STUFE_KURZ.get(z.get("stufe"), "—")
        L.append(f"| {z['nr']}{snr} | {z['name']} | {z['adresse']} | {z['stadtteil']} "
                 f"| {stufe} | {t['strasse']} {t['hnr']} | {belegt} | {t['lat']}, {t['lon']} |")
    w("")

    w("## C — Hausnummer heute nicht vergeben\n")
    w("Die Straße gibt es, die Hausnummer nicht mehr. Ohne historische Quellen")
    w("(Adressbücher, Katasterpläne, Luftbilder) ist hier nichts zu machen —")
    w("`strassengenau` ist die ehrliche Angabe.\n")
    L.extend(tabelle([z for z in zeilen if z["befund"] == "C"], mit_treffer=False))
    w("")

    w("## D — Quelle nennt keine Hausnummer\n")
    w("Bei diesen Einträgen steht in der Quelle nur die Straße. `strassengenau` ist hier")
    w("keine Schwäche der Geokodierung, sondern gibt den Kenntnisstand korrekt wieder.\n")
    L.extend(tabelle([z for z in zeilen if z["befund"] == "D"], mit_treffer=False))
    w("")

    w("## E — Straßenname heute nicht auffindbar\n")
    w("Der Straßenname selbst findet sich im heutigen Bestand nicht. Wo ein")
    w("Ähnlichkeitsabgleich die heutige Schreibweise eindeutig belegte, ist der Fall")
    w("aufgelöst und steht oben unter B oder C (siehe `ALIAS` in")
    w("`scripts/pruefe_verortung.py`). Hier bleibt, wofür es keinen heutigen Namen gibt.\n")
    L.extend(tabelle([z for z in zeilen if z["befund"] == "E"], mit_treffer=False))
    w("")
    w("Zu den geprüften Schreibvarianten im Einzelnen:\n")
    w("- **Warndstraße** (Nr. 60, 472) → heute *Warndtstraße*; dort existiert nur noch Nr. 7.")
    w("- **Neumarktstaße** (Nr. 76) → Tippfehler für *Neumarktstraße*; 25–27 sind heute")
    w("  nicht vergeben.")
    w("- **Vor d. Beule** (Nr. 125) → *Vor der Beule*; **Nr. 37 existiert** und liegt bei")
    w("  51.28884, 7.23135. Geführt unter B, weil die Quelle einen Bereich (37–39) nennt.")
    w("- **Holenscheidter Str.** (Nr. 247) → *Hohlenscheidter Straße*; Nr. 57 nicht vergeben.")
    w("- **Werther Brücke** (Nr. 289) → *Zur Werther Brücke*; Nr. 11 nicht vergeben.")
    w("- **Nöllenhammerstraße** (Nr. 319) → ähnlich ist nur *Nöllenhammerweg*. Straße/Weg")
    w("  ist keine bloße Schreibvariante, deshalb nicht als Alias geführt; Nr. 31 gibt es")
    w("  dort ohnehin nicht.")
    w("- **Brausenwerther Straße** (Nr. 110) → kein ähnlicher heutiger Name. Die Straße lag")
    w("  am Döppersberg, dessen Umgestaltung den alten Zuschnitt beseitigt hat.\n")
    w("Zu den sieben Standorten ohne jede Koordinate lieferte der Ähnlichkeitsabgleich")
    w("nichts Belastbares. Zwei Spuren wären eine Archivrecherche wert, sind aber ohne")
    w("Beleg nicht zu setzen:\n")
    w("- **Bleichstraße 8** (Nr. 100) — ähnlich ist die heutige *Bleicherstraße*. Das ist")
    w("  ein anderer Name, kein Schreibfehler; ohne Quelle bliebe es geraten.")
    w("- **Straße der Alten Garde 104 (Werth)** (Nr. 372) — der Name stammt aus der")
    w("  NS-Zeit und wurde nach 1945 ersetzt. Der Zusatz „(Werth)“ in der Quelle deutet")
    w("  auf den Barmer Werth; welcher Abschnitt gemeint ist und wie die Nummerierung")
    w("  danach lief, sagt der Eintrag nicht.\n")

    w(f"## Vollständige Liste (alle {len(zeilen)})\n")
    w("| Nr. | Unternehmen | Adresse (Quelle) | Stadtteil | bisher | Form | Befund |")
    w("|---|---|---|---|---|---|---|")
    for z in zeilen:
        snr = f" ({z['standortNr']})" if (z["standortNr"] or 1) != 1 else ""
        stufe = STUFE_KURZ.get(z.get("stufe"), "—")
        w(f"| {z['nr']}{snr} | {z['name']} | {z['adresse']} | {z['stadtteil']} "
          f"| {stufe} | {z['form']} | {z['befund']} |")
    w("")
    w("---\n")
    w("Erzeugt von `scripts/pruefe_verortung.py`. Die Datei ist eine Arbeitsgrundlage,")
    w("keine Datenquelle — Korrekturen gehören nach `data/korrekturen.json`.")

    os.makedirs(os.path.dirname(AUSGABE_PATH), exist_ok=True)
    with open(AUSGABE_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    return zaehler


def sortierschluessel(feature):
    p = feature["properties"]
    m = re.match(r"(\d+)(.*)", p["nr"])
    return (int(m.group(1)) if m else 0,
            m.group(2) if m else p["nr"],
            p.get("standortNr") or 0)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--neu", action="store_true",
                        help="Adressbestand neu von Overpass holen")
    args = parser.parse_args()

    print("Prüfe unsichere Verortungen …")
    pfad = hole_adressbestand(args.neu)
    adressen, namen = lies_adressbestand(pfad)
    anzahl = sum(len(v) for v in adressen.values())
    print(f"  {anzahl} Adressen im heutigen Bestand, {len(namen)} Straßen")

    with open(GEOJSON_PATH, encoding="utf-8") as f:
        daten = json.load(f)
    features = daten["features"]
    unsicher = sorted(
        (f for f in features if f["properties"].get("verortung") in UNSICHERE_STUFEN),
        key=sortierschluessel)
    hausgenau = [f for f in features if f["properties"].get("verortung") == "hausgenau"]

    kalib = kalibriere(hausgenau, adressen, namen)
    print(f"  Kalibrierung an hausgenauen Adressen: {kalib[0]}/{kalib[1]} wiedergefunden")

    ausgang = lade_ausgangskoordinaten()
    if ausgang:
        print(f"  {len(ausgang)} Standorte haben bereits eine Geometrie-Korrektur; "
              f"verglichen wird gegen deren Ausgangswert")
    zeilen = pruefe(unsicher, adressen, namen, ausgang)
    hochgestuft = lade_hochgestufte(features)
    if hochgestuft:
        print(f"  {len(hochgestuft)} Standorte wurden auf hausgenau hochgestuft "
              f"und stehen nicht mehr in der Liste")
    zaehler = schreibe_markdown(zeilen, kalib, anzahl, len(features), hochgestuft)

    for k in sorted(BEFUNDE):
        print(f"  {k}: {zaehler.get(k, 0):3}  {BEFUNDE[k]}")
    print(f"\nGeschrieben: {os.path.relpath(AUSGABE_PATH, BASIS)}")


if __name__ == "__main__":
    main()
