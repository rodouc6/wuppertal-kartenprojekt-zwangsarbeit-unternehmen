#!/usr/bin/env python3
"""
Merge-Skript: Erzeugt data/unternehmen.geojson und data/meta.json
aus mainZwangsarbeit.xlsx + unternehmenGeocodiert.geojson.

Option B: Ein Feature pro (Nr., StandortNr) mit verschachteltem records-Array.
"""

import csv
import json
import os
import re

import openpyxl

# ---------- Pfade ----------
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX_PATH = os.path.join(BASE, "mainZwangsarbeit.xlsx")
GEO_PATH = os.path.join(BASE, "unternehmenGeocodiert.geojson")
OUT_GEOJSON = os.path.join(BASE, "data", "unternehmen.geojson")
OUT_META = os.path.join(BASE, "data", "meta.json")
OUT_CSV = os.path.join(BASE, "data", "unternehmen.csv")
KORREKTUREN_PATH = os.path.join(BASE, "data", "korrekturen.json")
SPEER_SEITEN_PATH = os.path.join(BASE, "data", "speer_seiten.json")
RUESTUNG_PATH = os.path.join(BASE, "data", "ruestungsgueter.csv")

# Nominatim-Treffer dieser Art benennen nur einen Ortsteil, kein Gebäude
GROBE_TREFFER = {
    ("place", "hamlet"),
    ("place", "suburb"),
    ("place", "neighbourhood"),
    ("place", "village"),
    ("boundary", "administrative"),
}


def read_xlsx(path):
    """Liest die XLSX und gibt eine Liste von Dicts zurück."""
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    headers = [str(h).strip() if h else f"col_{i}" for i, h in enumerate(rows[0])]
    data = []
    for row in rows[1:]:
        d = {}
        for i, val in enumerate(row):
            key = headers[i] if i < len(headers) else f"col_{i}"
            d[key] = val
        data.append(d)
    wb.close()
    return data


def safe_str(val):
    if val is None:
        return None
    s = str(val).strip()
    return s if s else None


def safe_int(val):
    if val is None:
        return None
    try:
        n = int(float(val))
        return n
    except (ValueError, TypeError):
        return None


def nr_key(val):
    """Normalisiert Nr.-Werte zu String (z.B. 54.0 -> '54', 363.1 -> '363.1', '363a' -> '363a')."""
    if val is None:
        return None
    try:
        f = float(val)
        if f == int(f):
            return str(int(f))
        return str(f)
    except (ValueError, TypeError):
        return str(val).strip()


def nr_sort(nr):
    """Sortierschluessel fuer Unternehmensnummern ('54' < '363a' < '448.1')."""
    zahl = re.match(r"^\d+", str(nr))
    return (int(zahl.group(0)) if zahl else 9999, str(nr))


def read_geojson(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def lade_korrekturen():
    """Liest data/korrekturen.json. Fehlt die Datei, wird ohne Korrekturen gebaut."""
    if not os.path.exists(KORREKTUREN_PATH):
        print("  (keine korrekturen.json gefunden — ungeändert)")
        return {}
    with open(KORREKTUREN_PATH, "r", encoding="utf-8") as f:
        roh = json.load(f)
    return {k: v for k, v in roh.items() if not k.startswith("_")}


def xlsx_korrekturen_anwenden(rows, korrekturen):
    """Setzt korrigierte Spaltenwerte auf allen Zeilen der jeweiligen Nr.

    Gibt die Zahl der geänderten Zellen zurück. Weicht der vorgefundene Wert
    vom in 'alt' notierten ab, wird gewarnt und nicht geändert -- so fällt auf,
    wenn die XLSX inzwischen selbst korrigiert wurde.

    Welche Felder hier greifen, wird aus der XLSX selbst abgeleitet statt aus
    einer gepflegten Liste: eine neue Korrekturart, die niemand einträgt, würde
    sonst stillschweigend als Pseudo-Spalte durchrutschen. Unbekannte Feldnamen
    werden gemeldet -- sie sind entweder ein Tippfehler oder gehören in den
    Merge-Schritt.
    """
    spalten = set(rows[0].keys()) if rows else set()
    # "zusatzzeile" wird von zusatzzeilen_anlegen() behandelt, die uebrigen
    # beim Merge -- hier sind sie nur bekannt, damit sie keine Warnung ausloesen.
    merge_felder = {"geometrie", "adresseHeute", "zusatzzeile",
                    "quellentextAnmerkung", "zeileEntfernen"}
    geaendert = 0
    unbekannt = set()
    # Der Wert in 'alt' waehlt zugleich die Zeilen aus: eine Nummer hat eine
    # Zeile je Zaehlung, und ein Datum gilt nur fuer einige davon (Nr. 409 hat
    # 18 Zeilen, drei tragen den betroffenen Stichtag). Gewarnt wird deshalb
    # erst, wenn KEINE Zeile passt -- dann ist die Korrektur ueberholt.
    getroffen = {}
    for row in rows:
        nr = nr_key(row.get("Nr."))
        for i, eintrag in enumerate(korrekturen.get(nr, [])):
            feld = eintrag["feld"]
            if feld not in spalten:
                if feld not in merge_felder:
                    unbekannt.add((nr, feld))
                continue
            getroffen.setdefault((nr, i), 0)
            if safe_str(row.get(feld)) != safe_str(eintrag.get("alt")):
                continue
            row[feld] = eintrag["neu"]
            getroffen[(nr, i)] += 1
            geaendert += 1
    for (nr, i), treffer in sorted(getroffen.items()):
        if treffer == 0:
            eintrag = korrekturen[nr][i]
            print(f"  WARNUNG: Nr. {nr}, Feld {eintrag['feld']}: keine Zeile trägt "
                  f"den erwarteten Wert {eintrag.get('alt')!r} -- Korrektur übersprungen")
    for nr, feld in sorted(unbekannt):
        print(f"  WARNUNG: Nr. {nr}, Feld {feld!r} ist weder eine XLSX-Spalte noch "
              f"ein bekanntes Merge-Feld -- Korrektur ignoriert")
    return geaendert


def zusatzzeilen_anlegen(rows, korrekturen):
    """Legt Zaehlungen an, die beim Parsen des Katalogs verlorengingen.

    Der bisherige Korrekturweg aendert Zellen bestehender Zeilen; eine ganz
    fehlende Zaehlung liess sich damit nicht nachtragen. Fall Nr. 218: Der
    Quellentext nennt "43 Deutsche (41 M +2 F), 1 Westarbeiter (1 M)", die
    XLSX fuehrt nur die Deutschen -- der zweite Eintrag ging am Zeilenumbruch
    zwischen "1" und "Westarbeiter" verloren.

    Die neue Zeile erbt alle Stammdaten (Name, Adresse, Quellentext) von der
    ersten Zeile der Nummer; im Korrektureintrag stehen nur die Felder der
    Zaehlung selbst. Angelegt wird nur, wenn es die Zeile noch nicht gibt --
    sonst entstuenden bei jedem Lauf neue.
    """
    angelegt = []
    for nr, eintraege in korrekturen.items():
        for eintrag in eintraege:
            if eintrag.get("feld") != "zusatzzeile":
                continue
            vorlage = next((r for r in rows if nr_key(r.get("Nr.")) == nr), None)
            if vorlage is None:
                print(f"  WARNUNG: Nr. {nr} hat keine Zeile als Vorlage -- "
                      f"Zusatzzeile übersprungen")
                continue
            neu = eintrag["neu"]
            schon_da = any(
                nr_key(r.get("Nr.")) == nr
                and all(safe_str(r.get(k)) == safe_str(v) for k, v in neu.items())
                for r in rows
            )
            if schon_da:
                print(f"  WARNUNG: Nr. {nr}: Zusatzzeile ist bereits vorhanden -- "
                      f"übersprungen (steht sie inzwischen in der XLSX?)")
                continue
            zeile = dict(vorlage)
            zeile.update(neu)
            rows.append(zeile)
            angelegt.append(nr)
    if angelegt:
        print(f"  {len(angelegt)} fehlende Zählung(en) nachgetragen (Nr. {', '.join(angelegt)})")
    return len(angelegt)


def zeilen_entfernen(rows, korrekturen):
    """Entfernt Zeilen, die keine Zaehlung sind.

    Gegenstueck zu zusatzzeilen_anlegen(). Gedacht fuer Angaben, die beim
    Parsen als Zaehlung erfasst wurden, obwohl sie keine sind: Nr. 184 fuehrt
    "keine Ausländer" als Art der Zwangsarbeit -- das ist eine Negativmeldung
    und stuende sonst im ZA-Art-Filter neben "Ostarbeiter". Die Aussage bleibt
    im Quellentext lesbar.

    Der Eintrag beschreibt die Zeile ueber ihre Feldwerte; entfernt wird nur,
    was in allen genannten Feldern uebereinstimmt. Trifft er nichts, wird
    gewarnt -- die Korrektur ist dann ueberholt.
    """
    entfernt = []
    for nr, eintraege in korrekturen.items():
        for eintrag in eintraege:
            if eintrag.get("feld") != "zeileEntfernen":
                continue
            muster = eintrag["alt"]
            treffer = [
                r for r in rows
                if nr_key(r.get("Nr.")) == nr
                and all(safe_str(r.get(feld)) == safe_str(wert)
                        for feld, wert in muster.items())
            ]
            if not treffer:
                print(f"  WARNUNG: Nr. {nr}: keine Zeile passt auf {muster!r} -- "
                      f"Entfernung übersprungen")
                continue
            for r in treffer:
                rows.remove(r)
            entfernt.append(f"{nr} ({len(treffer)})")
    if entfernt:
        print(f"  {len(entfernt)} Zeilenmuster entfernt (Nr. {', '.join(entfernt)})")
    return len(entfernt)


def quellentext_anmerkungen(rows, korrekturen):
    """Haengt eine editorische Anmerkung an den Quellentext.

    Fuer Faelle, in denen die Quelle selbst erklaerungsbeduerftig ist -- etwa
    weil der Katalog dieselbe Meldung zweimal fuehrt. Die Anmerkung steht in
    eckigen Klammern am Ende des Textes und ist damit als Zutat erkennbar;
    der Katalogtext selbst bleibt Wort fuer Wort erhalten.

    Eigene Korrekturart, weil ein "SpeerText"-Ersatz den ganzen Text (bei
    Nr. 184 ueber 700 Zeichen) ein zweites Mal in korrekturen.json legen
    wuerde -- einmal als 'alt', einmal als 'neu'.
    """
    anmerkungen = {}
    for nr, eintraege in korrekturen.items():
        for eintrag in eintraege:
            if eintrag.get("feld") == "quellentextAnmerkung":
                anmerkungen[nr] = eintrag["neu"]
    if not anmerkungen:
        return 0

    gesetzt = set()
    for row in rows:
        nr = nr_key(row.get("Nr."))
        if nr not in anmerkungen:
            continue
        text = safe_str(row.get("SpeerText"))
        if not text:
            continue
        if anmerkungen[nr] in text:
            gesetzt.add(nr)
            continue
        row["SpeerText"] = text + "\n" + anmerkungen[nr]
        gesetzt.add(nr)
    for nr in anmerkungen:
        if nr not in gesetzt:
            print(f"  WARNUNG: Nr. {nr} hat keinen Quellentext -- Anmerkung übersprungen")
    if gesetzt:
        print(f"  {len(gesetzt)} Anmerkung(en) an Quellentexte angefügt "
              f"(Nr. {', '.join(sorted(gesetzt, key=nr_sort))})")
    return len(gesetzt)


KOORD_TOLERANZ = 1e-6


def koordinaten_gleich(a, b):
    """Vergleicht zwei [lon, lat]-Paare mit Toleranz; None nur gleich None."""
    if a is None or b is None:
        return a is None and b is None
    if len(a) != len(b):
        return False
    return all(abs(float(x) - float(y)) <= KOORD_TOLERANZ for x, y in zip(a, b))


def _korrektur_fuer(korrekturen, nr, snr, feld):
    """Sucht den Korrektureintrag fuer (Nr., StandortNr) und Feld.

    Traegt ein Eintrag ein Feld "standortNr", gilt er nur fuer diesen Standort.
    Fehlt es, gilt er fuer alle Standorte der Nummer -- was bei den elf
    Unternehmen mit mehreren Adressen selten gemeint ist. Diese Faelle werden
    deshalb gemeldet.
    """
    for eintrag in korrekturen.get(nr, []):
        if eintrag["feld"] != feld:
            continue
        gemeint = eintrag.get("standortNr")
        if gemeint is not None and str(gemeint) != str(snr):
            continue
        if gemeint is None:
            _korrektur_fuer.ohne_standort.add((nr, feld))
        return eintrag
    return None


_korrektur_fuer.ohne_standort = set()


def geometrie_korrektur(korrekturen, nr, snr):
    """Liefert den Geometrie-Korrektureintrag dieser Nr., sonst None.

    Der ganze Eintrag statt nur der Koordinate: nach einer Korrektur sind
    die alten Nominatim-Angaben wertlos, weil sie den falschen Treffer
    beschreiben. Der Eintrag trägt deshalb die Verortungsstufe selbst mit.
    """
    return _korrektur_fuer(korrekturen, nr, snr, "geometrie")


def verortungsstufe(props, hat_geometrie):
    """Wie genau ist der Standort bekannt?

    hausgenau     -- Gebäude oder benannter Ort mit Hausnummer
    strassengenau -- Nominatim traf nur die Straße (class = highway)
    ungefaehr     -- nur ein Ortsteil
    ohne          -- keine Geometrie
    """
    if not hat_geometrie:
        return "ohne"
    c, t = props.get("class"), props.get("type")
    if (c, t) in GROBE_TREFFER:
        return "ungefaehr"
    if c == "highway":
        return "strassengenau"
    return "hausgenau"


def adresse_heute_korrektur(korrekturen, nr, snr):
    """Liefert den adresseHeute-Korrektureintrag dieser Nr., sonst None.

    Eine Zeile "Heute: ..." behauptet Kontinuität zwischen damals und heute.
    Diese Behauptung muss belegt sein, deshalb wird sie nicht mehr aus der
    Nominatim-Antwort abgeleitet, sondern in korrekturen.json gepflegt.
    """
    return _korrektur_fuer(korrekturen, nr, snr, "adresseHeute")


def lade_speer_seiten():
    """Liest data/speer_seiten.json. Fehlt sie, entfällt die Seitenangabe."""
    if not os.path.exists(SPEER_SEITEN_PATH):
        print("  (keine speer_seiten.json gefunden — Quellenfenster ohne Seitenangabe)")
        return {}
    with open(SPEER_SEITEN_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def lade_ruestungsgueter():
    """Liest data/ruestungsgueter.csv und gruppiert nach Unternehmensnamen.

    Die Tabelle stammt aus Speers Abschnitt 18.2 (Wuppertaler Firmen im Zweiten
    Weltkrieg, Buchseiten 616-621). Sie wurde per OCR gewonnen und von Hand
    nachgearbeitet; die Spalte kartenname traegt die geprueften Zuordnungen zu
    den Unternehmen dieser Karte. Zeilen ohne kartenname gehoeren zu Firmen, die
    nicht im Zwangsarbeit-Katalog stehen -- sie bleiben unberuecksichtigt.

    Rueckgabe: Unternehmensname -> Liste von {produkt, quelle, seite, speerName}
    """
    if not os.path.exists(RUESTUNG_PATH):
        print("  (keine ruestungsgueter.csv gefunden — ohne Rüstungsangaben)")
        return {}
    nach_name = {}
    with open(RUESTUNG_PATH, encoding="utf-8-sig", newline="") as f:
        for zeile in csv.DictReader(f, delimiter=";"):
            name = (zeile.get("kartenname") or "").strip()
            if not name:
                continue
            nach_name.setdefault(name, []).append({
                "produkt": safe_str(zeile.get("produkt")),
                "quelle": safe_str(zeile.get("quelle")),
                "seite": safe_str(zeile.get("seite")),
                "speerName": safe_str(zeile.get("speerName")),
            })
    return nach_name


def ruestung_fuer(ruestung, name):
    """Schlaegt die Ruestungsangaben zum Unternehmensnamen nach.

    Zuerst mit dem vollen Namen. Traegt er einen Klammerzusatz, der in der
    CSV nicht steht -- etwa "G. H. Sachsenröder [Zweigbetrieb
    Friedrich-Engels-Allee 357]" --, wird ohne ihn nachgeschlagen. Ohne
    diesen zweiten Versuch verliert ein Betrieb seine Ruestungsangaben,
    sobald sein Name in korrekturen.json einen Zusatz bekommt; die CSV
    fuehrt vier Namen, die den Zusatz selbst tragen, deshalb bleibt der
    Versuch mit dem vollen Namen der erste.
    """
    if not ruestung:
        return []
    if name in ruestung:
        return ruestung[name]
    ohne_zusatz = re.sub(r"\s*\[.*?\]\s*$", "", name or "").strip()
    if ohne_zusatz and ohne_zusatz != name:
        return ruestung.get(ohne_zusatz, [])
    return []


def speertexte_auftrennen(rows):
    """Katalogeintraege trennen, die beim Parsen zusammengefallen sind.

    Speer druckt die Nummer eines Eintrags ohne Punkt ("244 Otto Kötter
    GmbH"), gelegentlich mit Komma ("93, Friedrich Bohne"). Beim Parsen des
    OCR-Texts wurde ein solcher Anfang nicht immer als neuer Eintrag erkannt --
    der Text des Folgeunternehmens landete dann beim Vorgaenger, und das
    Folgeunternehmen blieb ohne eigenen. Betroffen sind sieben Stellen, bei
    Nr. 214 gleich zwei (215 und 216).

    Die Zaehlungen sind davon nicht beruehrt; die stehen in eigenen Zeilen der
    XLSX. Es geht allein um den Quellentext.

    Getrennt wird nur, wenn Nummer UND Firmenname der Zeile mit einem
    bekannten Eintrag uebereinstimmen und dieser noch keinen eigenen Text hat.
    Eine blosse Zahl am Zeilenanfang genuegt nicht -- "20 Westarbeiter (18 M +
    2 F)" nach einem Zeilenumbruch saehe sonst aus wie Eintrag Nr. 20.
    """
    texte = {}      # nr -> Text (der erste gefundene je Nummer)
    namen = {}      # nr -> Firmenname
    for row in rows:
        nr = nr_key(row.get("Nr."))
        if nr is None:
            continue
        nr = str(row.get("Nr.")).strip()
        namen.setdefault(nr, safe_str(row.get("Unternehmen")) or "")
        t = safe_str(row.get("SpeerText"))
        if t and nr not in texte:
            texte[nr] = t

    def anker(name):
        """Erste zwei Woerter ohne Klammerzusatz -- als Namensprobe."""
        n = re.sub(r"\[.*", "", name or "").strip()
        return " ".join(n.split()[:2]).lower()

    # Trennstellen sammeln: quelle -> [(zeilenindex, ziel-nr), ...]
    schnitte = {}
    for nr, text in texte.items():
        for idx, zeile in enumerate(text.split("\n")):
            m = re.match(r"^\s*(\d{1,3}[a-z]?)[,.]?\s+(\S.*)$", zeile)
            if not m:
                continue
            ziel, rest = m.group(1), m.group(2)
            if ziel == nr or ziel not in namen:
                continue
            probe = anker(namen[ziel])
            if not probe or not rest.lower().startswith(probe):
                continue
            if texte.get(ziel):
                print(f"  WARNUNG: Nr. {ziel} hat bereits einen Quellentext - "
                      f"Trennstelle in Nr. {nr} uebersprungen")
                continue
            schnitte.setdefault(nr, []).append((idx, ziel))

    # Von hinten schneiden, damit die Indizes gueltig bleiben.
    # Die Trennzeile selbst ("244 Otto Kötter GmbH") faellt weg: Bei allen
    # uebrigen Eintraegen hat der urspruengliche Parser sie als Trenner
    # verbraucht, dort beginnt der Text mit der Branche. Ohne diesen Schnitt
    # saehen genau diese sieben anders aus als die anderen 414.
    neue_texte = {}
    for nr, stellen in schnitte.items():
        zeilen = texte[nr].split("\n")
        for idx, ziel in sorted(stellen, reverse=True):
            neue_texte[ziel] = "\n".join(zeilen[idx + 1:]).strip()
            zeilen = zeilen[:idx]
        neue_texte[nr] = "\n".join(zeilen).strip()

    if not neue_texte:
        return 0

    for row in rows:
        nr = str(row.get("Nr.")).strip() if row.get("Nr.") is not None else None
        if nr in neue_texte:
            row["SpeerText"] = neue_texte[nr]

    ziele = sorted(z for stellen in schnitte.values() for _, z in stellen)
    print(f"  {len(ziele)} zusammengefallene Katalogeintraege getrennt "
          f"(Nr. {', '.join(ziele)})")
    return len(ziele)


def quellentext_vererben(rows):
    """Teilbetriebe erben den Quellentext ihres Hauptbetriebs.

    363a und 448.1 sind keine Katalognummern, sondern Bildungen der
    Datenerfassung: Speer behandelt beide Standorte in EINEM Eintrag --
    Nr. 363 nennt den "Zweigbetrieb Friedrich-Engels-Allee 357"
    ausdruecklich, Nr. 448 enthaelt den Abschnitt "Vorwerk & Sohn, hier nur
    Gummiwerk". Ohne diese Vererbung haetten die Teilbetriebe gar keinen
    Quellenknopf, obwohl der Eintrag sie mitbehandelt.

    Der Text wird nicht in korrekturen.json verdoppelt -- er bleibt einmal
    im Bestand und wird beim Bauen weitergereicht, mit vorangestelltem
    Hinweis auf den gemeinsamen Eintrag.
    """
    texte = {}
    for row in rows:
        nr = nr_key(row.get("Nr."))
        t = safe_str(row.get("SpeerText"))
        if nr and t and nr not in texte:
            texte[nr] = t

    vererbt = []
    for row in rows:
        nr = nr_key(row.get("Nr."))
        if not nr or safe_str(row.get("SpeerText")):
            continue
        m = re.match(r"^(\d+)[.a-z]", nr)
        if not m:
            continue
        stamm = m.group(1)
        if stamm == nr or stamm not in texte:
            continue
        row["SpeerText"] = (
            f"[Gemeinsamer Katalogeintrag mit Nr. {stamm}; der Teilbetrieb wird "
            f"dort mitbehandelt. Nachstehend der vollständige Eintrag.]\n\n"
            + texte[stamm]
        )
        if nr not in vererbt:
            vererbt.append(nr)

    if vererbt:
        print(f"  Quellentext an {len(vererbt)} Teilbetrieb(e) vererbt "
              f"(Nr. {', '.join(vererbt)})")
    return len(vererbt)


def build_merged_geojson(xlsx_rows, geo_data, korrekturen, speer_seiten, ruestung=None):
    # --- 1. XLSX nach Nr. gruppieren ---
    companies = {}  # nr_str -> { company-level props, records: [...] }

    for row in xlsx_rows:
        nr = nr_key(row.get("Nr."))
        if nr is None:
            continue

        if nr not in companies:
            companies[nr] = {
                "name": safe_str(row.get("Unternehmen")),
                "industriezweig": safe_str(row.get("Industriezweig")),
                "industriezweigSpeer": safe_str(row.get("IndustriezweigSPEER")),
                "existiertHeute": safe_str(row.get("ExistiertHeute")),
                "ort": safe_str(row.get("Ort")),
                "adresse": safe_str(row.get("Adresse")),
                "ort2": safe_str(row.get("Ort2")),
                "adresse2": safe_str(row.get("Adresse2")),
                "ort3": safe_str(row.get("Ort3")),
                "adresse3": safe_str(row.get("Adresse3")),
                "anmerkungen": safe_str(row.get("Anmerkungen")),
                "speerText": safe_str(row.get("SpeerText")),
                "records": [],
            }

        # Record hinzufügen (nur wenn Datum oder Art vorhanden)
        datum = safe_str(row.get("Datum"))
        datum_von = safe_str(row.get("DatumVon"))
        art = safe_str(row.get("Zwangsarbeiterart"))
        gesamt = safe_int(row.get("Gesamtzahl"))
        m = safe_int(row.get("Männlich"))
        w = safe_int(row.get("Weiblich"))

        if datum_von or art or gesamt is not None:
            rec = {
                "datum": datum,
                "datumVon": datum_von,
                "datumBis": safe_str(row.get("DatumBis")),
                "art": art,
                "gesamt": gesamt,
                "m": m,
                "w": w,
            }
            # Anmerkung pro Record (falls verschieden von Company-Level)
            anm = safe_str(row.get("Anmerkungen"))
            if anm:
                rec["anm"] = anm
            companies[nr]["records"].append(rec)

    # --- 1b. DatumBis neu berechnen: pro (Nr., ZA-Art).
    #     Jede ZA-Art gilt bis zur nächsten Zählung derselben Art
    #     oder Kriegsende (1945-05-08). ---
    KRIEGSENDE = "1945-05-08"
    for nr, comp in companies.items():
        recs = comp["records"]
        # Gruppiere nach ZA-Art
        by_art = {}
        for r in recs:
            art = r.get("art") or "_unknown"
            if art not in by_art:
                by_art[art] = []
            by_art[art].append(r)
        # Pro Art: sortiere nach DatumVon, setze DatumBis auf nächsten DatumVon derselben Art
        for art, art_recs in by_art.items():
            sorted_recs = sorted(art_recs, key=lambda x: x.get("datumVon") or "")
            for i, r in enumerate(sorted_recs):
                if not r.get("datumVon"):
                    continue
                # Finde nächsten Record derselben Art mit anderem DatumVon
                next_von = None
                for j in range(i + 1, len(sorted_recs)):
                    nv = sorted_recs[j].get("datumVon")
                    if nv and nv > r["datumVon"]:
                        next_von = nv
                        break
                r["datumBis"] = next_von if next_von else KRIEGSENDE

    # --- 1b. Doppelt erfasste Zaehlungen entfernen ---
    # Bei vier Betrieben steht dieselbe Meldung zweimal in den Daten -- aus
    # zwei verschiedenen Gruenden:
    #   Nr. 251 und 184: Der KATALOG fuehrt sie doppelt. Bei 251 steht die
    #   Zeile "31.8.1943, 26 Deutsche (22 M + 4 F), 1 Westarbeiter, 5
    #   Ostarbeiter" wortgleich zweimal; bei 184 wiederholt er den Meldeblock
    #   in anderer Schreibung, wobei die zweite Fassung die deutschen
    #   Beschaeftigten ergaenzt. Beide tragen deshalb eine Anmerkung im
    #   Quellentext (siehe quellentext_anmerkungen).
    #   Nr. 177 und 381: Der Katalogtext ist korrekt, die UEBERTRAGUNG in die
    #   XLSX hat eine Zeile doppelt angelegt. Bei 177 nennt der Text zwei
    #   verschiedene Meldungen mit zufaellig gleicher Zahl (27.4.1943 und
    #   11.3.1944, je 27 Ostarbeiter), die XLSX fuehrt die erste zweimal.
    #   Dort waere eine Anmerkung im Quellentext irrefuehrend.
    # Zusammengefasst wird nur, was in ALLEN Feldern uebereinstimmt (Datum,
    # Art, Gesamt, m, w). Zwei echte Meldungen desselben Tages unterscheiden
    # sich immer in mindestens einem davon; identische Wiederholung derselben
    # Zaehlung ist dagegen nie eine eigene Angabe.
    entfernt = []
    for nr, comp in companies.items():
        gesehen, eindeutig = set(), []
        for r in comp["records"]:
            schluessel = (r.get("datum"), r.get("datumVon"), r.get("art"),
                          r.get("gesamt"), r.get("m"), r.get("w"))
            if schluessel in gesehen:
                entfernt.append(nr)
                continue
            gesehen.add(schluessel)
            eindeutig.append(r)
        comp["records"] = eindeutig
    if entfernt:
        print(f"  {len(entfernt)} doppelt erfasste Zählung(en) entfernt "
              f"(Nr. {', '.join(sorted(set(entfernt), key=nr_sort))})")

    # --- 2. GeoJSON-Features indizieren ---
    geo_features = geo_data.get("features", [])
    # (nr_str, standortNr_str) -> Feature
    geo_index = {}
    # Nr -> Liste von StandortNr
    nr_standorte = {}

    for feat in geo_features:
        props = feat.get("properties", {})
        nr = safe_str(props.get("Nr."))
        snr = safe_str(props.get("StandortNr")) or "1"
        if nr is None:
            continue
        geo_index[(nr, snr)] = feat
        if nr not in nr_standorte:
            nr_standorte[nr] = []
        nr_standorte[nr].append(int(snr))

    # --- 3. Merged Features erzeugen ---
    out_features = []

    for (nr, snr), feat in geo_index.items():
        props = feat.get("properties", {})
        geom = feat.get("geometry")
        geo_korr = geometrie_korrektur(korrekturen, nr, snr)
        if geo_korr is not None:
            # Der alt-Wert ist auch bei Geometrien ein Wächter: eine Korrektur,
            # die stillschweigend eine inzwischen richtige Koordinate überschreibt
            # oder eine inzwischen vorhandene Geometrie löscht, wäre schlimmer
            # als gar keine.
            vorgefunden = geom.get("coordinates") if geom else None
            if not koordinaten_gleich(vorgefunden, geo_korr.get("alt")):
                print(f"  WARNUNG: Nr. {nr}, Standort {snr}, Geometrie: erwartet "
                      f"{geo_korr.get('alt')!r}, vorgefunden {vorgefunden!r} "
                      f"-- Korrektur übersprungen")
                geo_korr = None
            else:
                neu = geo_korr.get("neu")
                geom = None if neu is None else {"type": "Point", "coordinates": neu}
        company = companies.get(nr)

        if company is None:
            # Kein XLSX-Match -- nur Geo-Daten, leeres Feature
            continue

        # Stadtteil: city_district aus Nominatim, Fallback auf Ort
        stadtteil = safe_str(props.get("city_district")) or company.get("ort")

        # Adresse+Ort für diesen spezifischen Standort
        if snr == "1":
            adresse = company["adresse"]
            ort = company["ort"]
        elif snr == "2":
            adresse = company.get("adresse2")
            ort = company.get("ort2")
        elif snr == "3":
            adresse = company.get("adresse3")
            ort = company.get("ort3")
        else:
            adresse = safe_str(props.get("Adresse"))
            ort = safe_str(props.get("Ort"))

        standort_list = sorted(nr_standorte.get(nr, [1]))

        # Ein Hinweis, wie die korrigierte Koordinate zustande kam. Noetig, wo
        # die Stufe allein zu wenig sagt: ein Punkt, der ueber die Nachbar-
        # hausnummer gesetzt wurde, ist genauer als die Strassenmitte, aber
        # nicht hausgenau. Ohne den Hinweis waere nicht erkennbar, worauf er
        # beruht -- und wie duenn der Beleg im Einzelfall ist.
        verortung_hinweis = None
        if geo_korr is not None and geom is not None:
            # Nach einer Geometrie-Korrektur beschreiben die Nominatim-Angaben
            # den falschen Treffer -- bei Nr. 88 einen Laden in Istanbul. Die
            # Verortungsstufe kommt deshalb aus der Korrektur selbst.
            stufe = geo_korr.get("verortung", "ungefaehr")
            verortung_hinweis = safe_str(geo_korr.get("verortungHinweis"))
        else:
            stufe = verortungsstufe(props, geom is not None)

        # Heutige Adresse nur aus belegten Korrektureinträgen. Der Wächter greift
        # auch hier: abgeleitet wird nichts mehr, also muss alt null sein.
        adr_heute = None
        adr_korr = adresse_heute_korrektur(korrekturen, nr, snr)
        if adr_korr is not None:
            if safe_str(adr_korr.get("alt")) is not None:
                print(f"  WARNUNG: Nr. {nr}, Feld adresseHeute: erwartet "
                      f"{safe_str(adr_korr.get('alt'))!r}, vorgefunden None "
                      f"-- Korrektur übersprungen")
            else:
                adr_heute = safe_str(adr_korr.get("neu"))

        new_props = {
            "nr": nr,
            "name": company["name"],
            "industriezweig": company["industriezweig"],
            "industriezweigSpeer": company["industriezweigSpeer"],
            "existiertHeute": company["existiertHeute"],
            "adresse": adresse,
            "ort": ort,
            "stadtteil": stadtteil,
            "verortung": stufe,
            "verortungHinweis": verortung_hinweis,
            "adresseHeute": adr_heute,
            "speerSeite": speer_seiten.get(nr),
            "ruestungsgueter": ruestung_fuer(ruestung, company["name"]),
            "standortNr": int(snr),
            "standortNrList": standort_list,
            "speerText": company["speerText"],
            "records": company["records"],
        }

        out_features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": new_props,
        })

    # --- 4. Unternehmen ohne geokodiertes Feature nachtragen ---
    # Die Features entstehen oben aus dem geokodierten GeoJSON. Wer dort fehlt,
    # weil seine Adressspalte leer ist, fiel bisher ganz aus dem Datensatz --
    # 14 Betriebe mit 31 Zaehlungen, davon 19 mit Zahlenangabe und zusammen
    # 435 Menschen. Bei den meisten ist die Adresse nicht ueberliefert (Speer
    # notiert bei Nr. 184 ausdruecklich "0. Straßenangabe"); das macht sie
    # unverortbar, aber nicht unbelegt. Sie gehoeren deshalb in den Datensatz --
    # ohne Geometrie, wie die uebrigen Standorte der Stufe "ohne". Auf der
    # Karte erscheinen sie nicht, in Liste, Suche und Statistik schon.
    erfasst = {f["properties"]["nr"] for f in out_features}
    nachgetragen = []
    for nr, company in companies.items():
        if nr in erfasst:
            continue
        # Auch hier kann eine Korrektur eine Koordinate nachtragen: bei drei
        # Betrieben nennt der Katalogtext eine Adresse, die nur nie in die
        # Adressspalte gelangte (Nr. 312 "Hahnenfurth 5", 355 "Dornaper Str.
        # 16", 394 "Hauptstraße 23"). Der Waechter greift wie sonst -- 'alt'
        # muss null sein, denn eine Geometrie gibt es hier per Definition
        # nicht.
        geom = None
        stufe = "ohne"
        hinweis = None
        geo_korr = geometrie_korrektur(korrekturen, nr, "1")
        if geo_korr is not None:
            if not koordinaten_gleich(None, geo_korr.get("alt")):
                print(f"  WARNUNG: Nr. {nr}, Geometrie: erwartet "
                      f"{geo_korr.get('alt')!r}, vorgefunden None "
                      f"-- Korrektur übersprungen")
            else:
                koord = geo_korr.get("neu")
                if koord is not None:
                    geom = {"type": "Point", "coordinates": koord}
                    stufe = geo_korr.get("verortung", "ungefaehr")
                    hinweis = safe_str(geo_korr.get("verortungHinweis"))
        out_features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "nr": nr,
                "name": company["name"],
                "industriezweig": company["industriezweig"],
                "industriezweigSpeer": company["industriezweigSpeer"],
                "existiertHeute": company["existiertHeute"],
                "adresse": company["adresse"],
                "ort": company["ort"],
                "stadtteil": company.get("ort"),
                "verortung": stufe,
                "verortungHinweis": hinweis,
                "adresseHeute": None,
                "speerSeite": speer_seiten.get(nr),
                "ruestungsgueter": ruestung_fuer(ruestung, company["name"]),
                "standortNr": 1,
                "standortNrList": [1],
                "speerText": company["speerText"],
                "records": company["records"],
            },
        })
        nachgetragen.append(nr)
    if nachgetragen:
        zaehlungen = sum(len(companies[nr]["records"]) for nr in nachgetragen)
        print(f"  {len(nachgetragen)} Unternehmen ohne Geokodierung nachgetragen "
              f"({zaehlungen} Zählungen) — Nr. {', '.join(sorted(nachgetragen, key=nr_sort))}")

    # Sortieren nach Nr. (numerisch), dann StandortNr
    def sort_key(f):
        nr = f["properties"]["nr"]
        try:
            nr_num = float(nr)
        except ValueError:
            nr_num = 9999
        return (nr_num, f["properties"]["standortNr"])

    out_features.sort(key=sort_key)

    return {
        "type": "FeatureCollection",
        "features": out_features,
    }


def build_meta(merged_geojson):
    features = merged_geojson["features"]

    dates_set = set()
    industriezweige_set = set()
    za_arten_set = set()
    stadtteile_set = set()
    nrs_seen = set()
    nrs_mit_zahl = set()

    # Zahl der Unternehmen, die an einem Stichtag melden -- einmal alle,
    # einmal nur die mit Zahlenangabe. Speer verzeichnet mitunter die Art
    # der Zwangsarbeit ohne Ziffer; am 5.7.1944 melden 56 Betriebe, keiner
    # mit Zahl. Karte und Statistikseite brauchen beide Werte, deshalb hier
    # vorberechnet statt zweimal im Browser.
    # Gezaehlt werden Unternehmensnummern, nicht Standorte: an jedem
    # Standort eines Unternehmens haengt dieselbe records-Liste.
    meldungen = {}            # datumVon -> set(nr)
    meldungen_mit_zahl = {}   # datumVon -> set(nr)

    with_geom = 0
    verortung_zaehler = {"hausgenau": 0, "strassengenau": 0, "ungefaehr": 0, "ohne": 0}

    for feat in features:
        p = feat["properties"]
        nr = p["nr"]

        if feat["geometry"] is not None:
            with_geom += 1

        stufe = p.get("verortung")
        if stufe in verortung_zaehler:
            verortung_zaehler[stufe] += 1

        if nr not in nrs_seen:
            nrs_seen.add(nr)
            iz = p.get("industriezweig")
            if iz:
                industriezweige_set.add(iz)

        st = p.get("stadtteil")
        if st:
            stadtteile_set.add(st)

        for rec in p.get("records", []):
            dv = rec.get("datumVon")
            if dv:
                dates_set.add(dv)
                meldungen.setdefault(dv, set()).add(nr)
                if rec.get("gesamt") is not None:
                    meldungen_mit_zahl.setdefault(dv, set()).add(nr)
            art = rec.get("art")
            if art:
                za_arten_set.add(art)
            # Unternehmen mit mindestens einer ueberlieferten Zaehlung (gesamt
            # nicht None) -- fuer die Zusatzzeile bei der Kennzahl auf der
            # Startseite ("davon X mit mindestens einer ueberlieferten Zahl").
            if rec.get("gesamt") is not None:
                nrs_mit_zahl.add(nr)

    dates_sortiert = sorted(dates_set)

    return {
        "dates": dates_sortiert,
        "meldungenJeStichtag": [
            len(meldungen.get(d, ())) for d in dates_sortiert
        ],
        "meldungenMitZahlJeStichtag": [
            len(meldungen_mit_zahl.get(d, ())) for d in dates_sortiert
        ],
        "industriezweige": sorted(industriezweige_set),
        "zaArten": sorted(za_arten_set),
        "stadtteile": sorted(stadtteile_set),
        "stats": {
            "totalCompanies": len(nrs_seen),
            "companiesWithCount": len(nrs_mit_zahl),
            "totalLocations": len(features),
            "withGeometry": with_geom,
            "verortung": verortung_zaehler,
        },
    }


CSV_SPALTEN = [
    "nr", "unternehmen", "industriezweig", "industriezweigSpeer", "existiertHeute",
    "standortNr", "adresse", "ort", "stadtteil", "adresseHeute",
    "laenge", "breite", "verortung", "verortungHinweis", "speerSeite",
    "datum", "datumVon", "datumBis", "zwangsarbeiterart", "gesamt", "maennlich", "weiblich",
]


def build_csv(merged_geojson):
    """Flache Tabelle: eine Zeile je (Standort, Zaehlung).

    Die GeoJSON ist fuer die Karte gebaut -- verschachtelt und minifiziert. Wer die
    Daten auswerten will, braucht eine Tabelle. Unternehmen ohne ueberlieferte
    Zaehlung erscheinen mit einer Zeile und leeren Zaehlfeldern, damit sie nicht
    stillschweigend verschwinden.

    Die Zaehlungen gelten dem Unternehmen, nicht dem einzelnen Standort: Speer
    weist sie nicht nach Standorten getrennt aus. Bei den elf Unternehmen mit
    mehreren Adressen stehen sie deshalb nur an StandortNr 1; die weiteren
    Standorte erscheinen mit ihrer Adresse und leeren Zaehlfeldern. Wer die
    Spalte "gesamt" aufsummiert, zaehlt sie sonst mehrfach -- genau dieser
    Fehler steckte bis Juli 2026 in der Statistikseite.
    """
    zeilen = []
    for feat in merged_geojson["features"]:
        p = feat["properties"]
        geom = feat.get("geometry")
        basis = {
            "nr": p.get("nr"),
            "unternehmen": p.get("name"),
            "industriezweig": p.get("industriezweig"),
            "industriezweigSpeer": p.get("industriezweigSpeer"),
            "existiertHeute": p.get("existiertHeute"),
            "standortNr": p.get("standortNr"),
            "adresse": p.get("adresse"),
            "ort": p.get("ort"),
            "stadtteil": p.get("stadtteil"),
            "adresseHeute": p.get("adresseHeute"),
            "laenge": geom["coordinates"][0] if geom else None,
            "breite": geom["coordinates"][1] if geom else None,
            "verortung": p.get("verortung"),
            "verortungHinweis": p.get("verortungHinweis"),
            "speerSeite": p.get("speerSeite"),
        }
        records = p.get("records") or [{}]
        if p.get("standortNr") != 1:
            records = [{}]
        for r in records:
            zeilen.append({
                **basis,
                "datum": r.get("datum"),
                "datumVon": r.get("datumVon"),
                "datumBis": r.get("datumBis"),
                "zwangsarbeiterart": r.get("art"),
                "gesamt": r.get("gesamt"),
                "maennlich": r.get("m"),
                "weiblich": r.get("w"),
            })
    return zeilen


def main():
    print("Lese XLSX...")
    xlsx_rows = read_xlsx(XLSX_PATH)
    print(f"  {len(xlsx_rows)} Zeilen geladen")

    print("Lese geocodiertes GeoJSON...")
    geo_data = read_geojson(GEO_PATH)
    print(f"  {len(geo_data['features'])} Features geladen")

    print("Wende Korrekturen an...")
    korrekturen = lade_korrekturen()
    zusatzzeilen_anlegen(xlsx_rows, korrekturen)
    quellentext_anmerkungen(xlsx_rows, korrekturen)
    zeilen_entfernen(xlsx_rows, korrekturen)
    n = xlsx_korrekturen_anwenden(xlsx_rows, korrekturen)
    print(f"  {n} Zellen korrigiert, "
          f"{sum(1 for eintraege in korrekturen.values() for e in eintraege if e['feld'] == 'geometrie')} "
          f"Geometrie-Korrekturen vorgemerkt")

    print("Trenne zusammengefallene Katalogeintraege...")
    speertexte_auftrennen(xlsx_rows)
    quellentext_vererben(xlsx_rows)

    speer_seiten = lade_speer_seiten()
    ruestung = lade_ruestungsgueter()

    print("Merge...")
    merged = build_merged_geojson(xlsx_rows, geo_data, korrekturen, speer_seiten, ruestung)
    print(f"  {len(merged['features'])} Features erzeugt")

    # Eine Korrektur ohne standortNr greift auf allen Adressen einer Nummer.
    # Bei einem einzigen Standort ist das gemeint, bei mehreren fast nie.
    standorte = {}
    for feat in merged["features"]:
        p = feat["properties"]
        standorte[p["nr"]] = standorte.get(p["nr"], 0) + 1
    for nr, feld in sorted(_korrektur_fuer.ohne_standort):
        if standorte.get(nr, 1) > 1:
            print(f"  WARNUNG: Nr. {nr} hat {standorte[nr]} Standorte, die Korrektur "
                  f"{feld!r} nennt aber keinen -- sie greift auf allen")

    print("Erzeuge meta.json...")
    meta = build_meta(merged)
    print(f"  {meta['stats']['totalCompanies']} Unternehmen, "
          f"{len(meta['dates'])} Stichtage, "
          f"{len(meta['industriezweige'])} Industriezweige, "
          f"{len(meta['zaArten'])} ZA-Arten, "
          f"{len(meta['stadtteile'])} Stadtteile")

    os.makedirs(os.path.dirname(OUT_GEOJSON), exist_ok=True)

    print(f"Schreibe {OUT_GEOJSON}...")
    with open(OUT_GEOJSON, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=None, separators=(",", ":"))

    print(f"Schreibe {OUT_META}...")
    with open(OUT_META, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"Schreibe {OUT_CSV}...")
    csv_zeilen = build_csv(merged)
    # utf-8-sig, weil Tabellenprogramme die Datei sonst ohne Umlaute oeffnen;
    # Semikolon, weil die Textfelder Kommata enthalten
    with open(OUT_CSV, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, CSV_SPALTEN, delimiter=";")
        w.writeheader()
        w.writerows(csv_zeilen)
    print(f"  {len(csv_zeilen)} Zeilen")

    # Dateigröße
    geojson_size = os.path.getsize(OUT_GEOJSON) / 1024
    meta_size = os.path.getsize(OUT_META) / 1024
    csv_size = os.path.getsize(OUT_CSV) / 1024
    print(f"\nFertig!")
    print(f"  data/unternehmen.geojson: {geojson_size:.0f} KB")
    print(f"  data/meta.json: {meta_size:.1f} KB")
    print(f"  data/unternehmen.csv: {csv_size:.0f} KB")


if __name__ == "__main__":
    main()
