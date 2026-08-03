/* =========================================================
   startseite.js  –  Kennzahlen und Uebersichtskarte der Startseite
   ========================================================= */

// Von daten.js benutzte globale Ablage der Unternehmen, siehe buildCompanies()
// in js/daten.js -- dort wird ohne eigene Deklaration auf "companies"
// zugegriffen, deshalb legt die Seite sie hier an (wie map-app.js es fuer
// die Hauptkarte tut).
let companies = {};

/* Die drei Zahlen kommen aus meta.json, damit sie nicht veralten koennen.
   Genau das war beim Entwurf passiert: er nannte 30 Industriezweige, weil
   die Zahl aus einer aelteren Fassung stammte. */
async function ladeKennzahlen() {
  const meta = await (await fetch("data/meta.json")).json();
  // Die vierte Spalte ist eine optionale Zusatzzeile unter dem Wert -- bislang
  // nur bei "Dokumentierte Unternehmen" genutzt, um zu zeigen, bei wie vielen
  // davon ueberhaupt eine Zahl ueberliefert ist (stats.companiesWithCount aus
  // build_data.py, nicht fest eingetragen).
  const zeilen = [
    [
      "Dokumentierte Unternehmen",
      meta.stats.totalCompanies,
      `davon ${meta.stats.companiesWithCount} mit mindestens einer überlieferten Zahl`,
    ],
    ["Erfasste Standorte", meta.stats.totalLocations],
    ["Stichtage 1940–1945", meta.dates.filter(Boolean).length],
  ];
  document.getElementById("kennzahlen").innerHTML = zeilen
    .map(([label, wert, zusatz]) =>
      `<div class="kennzahl"><dt>${label}</dt><dd>${wert}</dd>${
        zusatz ? `<span class="kennzahl-zusatz">${zusatz}</span>` : ""
      }</div>`)
    .join("");
}

/* Laedt data/unternehmen.geojson einmal fuer die ganze Seite und fuellt
   die globale Ablage "companies" (js/daten.js). Uebersichtskarte und
   Beispielkarussell lesen beide von dort -- ein zweiter fetch waere
   dieselbe Datei doppelt geladen. */
async function ladeDaten() {
  const geoData = await (await fetch("data/unternehmen.geojson")).json();
  buildCompanies(geoData.features);
}

/* ---------------------------------------------------------
   Uebersichtskarte: ein gezeichnetes SVG statt einer Leaflet-Karte
   --------------------------------------------------------- */

// Breite der viewBox. Die Hoehe wird daraus errechnet (siehe unten), damit
// das Seitenverhaeltnis dem projizierten Stadtgebiet folgt und nicht einer
// fest eingetragenen Zahl, die bei neuen Grenzdaten stillschweigend
// falsch wuerde.
const KARTE_BREITE = 1000;

// Rand um die Stadtgrenze in Grad. Ohne ihn beruehrt der Umriss den
// Bildrand und die Linienstaerke wird an den aeussersten Punkten
// halbiert weggeschnitten.
const KARTE_RAND = 0.004;

/* Web-Mercator, dieselbe Projektion wie Leaflet: der Umriss sieht damit
   aus wie auf der Hauptkarte und ist wiedererkennbar. Der Laengengrad
   geht unveraendert durch, nur der Breitengrad wird gestreckt. */
function merc(lon, lat) {
  return [lon, Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2)) * 180 / Math.PI];
}

/* Zeichnet Stadtgrenze, Wupper und alle Standorte als SVG in
   #kartenvorschau. Gezeichnet statt als fertige Datei im Repository:
   am 1.8.2026 kamen vierzehn Betriebe hinzu -- eine Vorschau, die das
   nicht mitbekommt, ist schlechter als eine, die eine Zehntelsekunde
   spaeter erscheint.

   ALLE PUNKTE GLEICH GROSS. Die frueheren Leaflet-Radien nach
   hoechststand() legten nahe, hier sei der Umfang der Zwangsarbeit
   abzulesen; das leistet erst die Hauptkarte mit Zeitregler und
   Legende. Die Vorschau zeigt die Verteilung der Betriebe im
   Stadtgebiet, sonst nichts. */
async function baueUebersichtskarte() {
  const container = document.getElementById("kartenvorschau");
  const umriss = await (await fetch("data/wuppertal-umriss.geojson")).json();
  const grenze = umriss.features.find((f) => f.properties.rolle === "stadtgrenze");
  const fluss = umriss.features.find((f) => f.properties.rolle === "fluss");
  if (!grenze) return;

  // Rahmen aus der Bounding Box der STADTGRENZE, nicht der Punkte: sonst
  // haenge der Ausschnitt an den Betrieben, und ein einzelner Standort am
  // Rand verschoebe die ganze Flaeche.
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  grenze.geometry.coordinates.forEach((ring) => {
    ring.forEach(([lon, lat]) => {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
  });
  minLon -= KARTE_RAND; maxLon += KARTE_RAND;
  minLat -= KARTE_RAND; maxLat += KARTE_RAND;

  const [linksX, obenY] = merc(minLon, maxLat);
  const [rechtsX, untenY] = merc(maxLon, minLat);
  const hoehe = KARTE_BREITE * (obenY - untenY) / (rechtsX - linksX);

  // Eine Nachkommastelle genuegt: bei 1000 Einheiten Breite liegt sie weit
  // unter einem Bildschirmpunkt, spart aber rund ein Drittel der Zeichen
  // in den beiden langen Pfaden.
  function punkt(lon, lat) {
    const [x, y] = merc(lon, lat);
    return [
      ((x - linksX) / (rechtsX - linksX) * KARTE_BREITE).toFixed(1),
      ((obenY - y) / (obenY - untenY) * hoehe).toFixed(1),
    ];
  }

  function pfad(linien, geschlossen) {
    return linien
      .map((linie) =>
        linie.map((koord, i) => `${i ? "L" : "M"}${punkt(koord[0], koord[1]).join(" ")}`).join("") +
        (geschlossen ? "Z" : ""))
      .join("");
  }

  // Ein Kreis je Standort MIT Geometrie (426), nicht je Unternehmen (431):
  // die Vorschau zeigt Orte, und elf Unternehmen haben mehrere davon.
  const kreise = [];
  Object.values(companies).forEach((c) => {
    c.locations.forEach((loc) => {
      if (!loc.geometry) return;
      const [cx, cy] = punkt(loc.geometry.coordinates[0], loc.geometry.coordinates[1]);
      kreise.push(`<circle cx="${cx}" cy="${cy}" r="4"/>`);
    });
  });

  // aria-hidden: Rolle und Beschriftung traegt der Container (index.html).
  // Ein zweites Mal vorgelesen zu werden hilft niemandem.
  container.innerHTML = `
    <svg viewBox="0 0 ${KARTE_BREITE} ${hoehe.toFixed(1)}" aria-hidden="true">
      <path d="${pfad(grenze.geometry.coordinates, true)}"
            fill="#f2f2ef" stroke="#c9c9c4" stroke-width="1.5"/>
      ${fluss ? `<path d="${pfad(fluss.geometry.coordinates, false)}"
            fill="none" stroke="#a8bac6" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round"/>` : ""}
      <g fill="#26272a" fill-opacity="0.72" stroke="#fff" stroke-width="0.9">${kreise.join("")}</g>
    </svg>`;

  // Die Flaeche fuehrt zur echten Karte -- per Maus und per Tastatur
  // (tabindex/role/aria-label stehen in index.html). Das SVG enthaelt
  // keine eigenen Klickziele, deshalb genuegt hier ein Zuhoerer ohne
  // Ausnahmen: die frueher noetige Ruecksicht auf die Leaflet-Attribution
  // (ein echter Link mitten im Bild) ist mit Leaflet entfallen.
  container.addEventListener("click", () => {
    window.location.href = "map.html";
  });

  container.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      window.location.href = "map.html";
    }
  });
}

/* Zufallseintrag "AUS DEN EINTRAEGEN" -- Auswahlregeln unveraendert aus dem
   frueheren js/landing.js uebernommen: ein Kandidat je Unternehmensnummer
   (der erste Standort in Datenreihenfolge entscheidet ueber Geometrie und
   Adresse), nur Unternehmen mit mindestens einer Zaehlung ueber null,
   Hoechstwert samt Datum, Link nach map.html?nr=... . Neu ist die Herkunft
   der Daten (companies aus daten.js statt eigenem fetch), das Markup, das
   der neuen Struktur folgt, und der Hoechstwert selbst: er kommt jetzt aus
   hoechststandMitZeitpunkt() in js/daten.js und summiert alle zum jeweiligen
   Zeitpunkt gleichzeitig laufenden Zaehlungen -- deshalb gehoert keine
   einzelne Art mehr zu diesem Wert. */
function baueEintragsbeispiel() {
  const container = document.getElementById("eintragsbeispiel");

  const kandidaten = Object.values(companies).filter((c) => {
    const ersterStandort = c.locations[0];
    if (!ersterStandort || !ersterStandort.geometry) return false;
    return c.records.some((r) => r.gesamt && r.gesamt > 0);
  });

  if (kandidaten.length === 0) return;

  const pick = kandidaten[Math.floor(Math.random() * kandidaten.length)];
  const standort = pick.locations[0];

  // Hoechststand (Summe aller zum Zeitpunkt laufenden Zaehlungen) samt dem
  // Zeitpunkt, an dem er erreicht wird -- siehe hoechststandMitZeitpunkt()
  // in js/daten.js. Der Zeitpunkt kommt als ISO-Datum (datumVon) zurueck,
  // deshalb hier durch formatDateDE() statt wie sonst ueber r.datum.
  const { max: maxCount, zeitpunkt: maxZeitpunkt } = hoechststandMitZeitpunkt(pick);
  const maxDatum = maxZeitpunkt ? formatDateDE(maxZeitpunkt) : "";

  // "xxx" und "unbekannt" sind Leerstellen der Quelle, siehe OHNE_ANGABE_ZWEIGE
  // in js/daten.js -- frueher eine lokale Kopie in landing.js.
  const zweigText = OHNE_ANGABE_ZWEIGE.includes(pick.industriezweig)
    ? "Branche nicht überliefert"
    : pick.industriezweig;

  let metaHtml = "";
  if (standort.adresse) metaHtml += `${standort.adresse}, ${standort.ort || ""}<br>`;
  if (zweigText) metaHtml += `${zweigText}<br>`;
  /* "Bis zu N Zwangsarbeiter -- Datum" liess offen, was das Datum mit der
     Zahl zu tun hat, und "bis zu" klang nach Schaetzung. Der Wert ist der
     hoechste Stand, den die Quelle fuer diesen Betrieb ueberliefert, und das
     Datum ist der Tag, an dem er erreicht wird. */
  if (maxCount > 0) {
    metaHtml += `Höchste überlieferte Zahl: <strong>${maxCount}</strong> Zwangsarbeiter`;
    if (maxDatum) metaHtml += ` (${maxDatum})`;
  }

  container.innerHTML = `
    <div class="eintrag-titel">Nr. ${pick.nr} &middot; ${pick.name}</div>
    <div class="eintrag-meta">${metaHtml}</div>
    <p><a class="spalte-link" href="map.html?nr=${pick.nr}">Auf der Karte anzeigen &rarr;</a></p>
  `;
}

document.addEventListener("DOMContentLoaded", async () => {
  ladeKennzahlen().catch((err) => console.error("Kennzahlen-Fehler:", err));
  try {
    await ladeDaten();
    await baueUebersichtskarte();
    baueEintragsbeispiel();
  } catch (err) {
    console.error("Daten-Fehler:", err);
  }
});
