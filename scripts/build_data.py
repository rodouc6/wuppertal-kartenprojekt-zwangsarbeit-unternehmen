#!/usr/bin/env python3
"""
Merge-Skript: Erzeugt data/unternehmen.geojson und data/meta.json
aus mainZwangsarbeit.xlsx + unternehmenGeocodiert.geojson.

Option B: Ein Feature pro (Nr., StandortNr) mit verschachteltem records-Array.
"""

import json
import math
import os
import sys

import openpyxl

# ---------- Pfade ----------
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX_PATH = os.path.join(BASE, "mainZwangsarbeit.xlsx")
GEO_PATH = os.path.join(BASE, "unternehmenGeocodiert.geojson")
OUT_GEOJSON = os.path.join(BASE, "data", "unternehmen.geojson")
OUT_META = os.path.join(BASE, "data", "meta.json")


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


def read_geojson(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_merged_geojson(xlsx_rows, geo_data):
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

        new_props = {
            "nr": nr,
            "name": company["name"],
            "industriezweig": company["industriezweig"],
            "industriezweigSpeer": company["industriezweigSpeer"],
            "existiertHeute": company["existiertHeute"],
            "adresse": adresse,
            "ort": ort,
            "stadtteil": stadtteil,
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
    with_geom = 0

    for feat in features:
        p = feat["properties"]
        nr = p["nr"]

        if feat["geometry"] is not None:
            with_geom += 1

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
            art = rec.get("art")
            if art:
                za_arten_set.add(art)

    return {
        "dates": sorted(dates_set),
        "industriezweige": sorted(industriezweige_set),
        "zaArten": sorted(za_arten_set),
        "stadtteile": sorted(stadtteile_set),
        "stats": {
            "totalCompanies": len(nrs_seen),
            "totalLocations": len(features),
            "withGeometry": with_geom,
        },
    }


def main():
    print("Lese XLSX...")
    xlsx_rows = read_xlsx(XLSX_PATH)
    print(f"  {len(xlsx_rows)} Zeilen geladen")

    print("Lese geocodiertes GeoJSON...")
    geo_data = read_geojson(GEO_PATH)
    print(f"  {len(geo_data['features'])} Features geladen")

    print("Merge...")
    merged = build_merged_geojson(xlsx_rows, geo_data)
    print(f"  {len(merged['features'])} Features erzeugt")

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

    # Dateigröße
    geojson_size = os.path.getsize(OUT_GEOJSON) / 1024
    meta_size = os.path.getsize(OUT_META) / 1024
    print(f"\nFertig!")
    print(f"  data/unternehmen.geojson: {geojson_size:.0f} KB")
    print(f"  data/meta.json: {meta_size:.1f} KB")


if __name__ == "__main__":
    main()
