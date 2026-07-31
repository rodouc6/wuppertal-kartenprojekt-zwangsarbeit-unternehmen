/* =========================================================
   startseite.js  –  Kennzahlen und Kartenvorschau der Startseite
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
  const zeilen = [
    ["Dokumentierte Unternehmen", meta.stats.totalCompanies],
    ["Standorte auf der Karte", meta.stats.totalLocations],
    ["Stichtage 1940–1945", meta.dates.filter(Boolean).length],
  ];
  document.getElementById("kennzahlen").innerHTML = zeilen
    .map(([label, wert]) =>
      `<div class="kennzahl"><dt>${label}</dt><dd>${wert}</dd></div>`)
    .join("");
}

// Verkleinerungsfaktor fuer die Punktradien in der Vorschau. Bei voller
// Groesse (wie auf der Hauptkarte) laufen 420 Punkte auf 300px Hoehe
// ineinander; der Faktor wurde im Browser gegen die echten Daten
// abgestimmt, bis die groessten Punkte die kleinen nicht mehr verdecken.
const VORSCHAU_RADIUS_FAKTOR = 0.4;

/* Laedt data/unternehmen.geojson einmal fuer die ganze Seite und fuellt
   die globale Ablage "companies" (js/daten.js). Kartenvorschau und
   Eintragsbeispiel lesen beide von dort -- ein zweiter fetch waere
   dieselbe Datei doppelt geladen. */
async function ladeDaten() {
  const geoData = await (await fetch("data/unternehmen.geojson")).json();
  buildCompanies(geoData.features);
}

/* Baut die nicht interaktive Kartenvorschau: ein Zustand (Hoechststand je
   Standort ueber alle Stichtage), keine eigenen Klickziele -- ein Klick auf
   die Flaeche fuehrt zur Hauptkarte. */
function ladeKartenvorschau() {
  const karte = L.map("kartenvorschau", {
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    touchZoom: false,
    attributionControl: true,
  }).setView([51.258, 7.175], 12);

  // Kacheln und Attribution wie auf der Hauptkarte (js/map-app.js).
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende',
    maxZoom: 19,
  }).addTo(karte);

  Object.values(companies).forEach((c) => {
    const radius = radiusForCount(hoechststand(c)) * VORSCHAU_RADIUS_FAKTOR;
    c.locations.forEach((loc) => {
      if (!loc.geometry) return;
      const coords = loc.geometry.coordinates;
      L.circleMarker([coords[1], coords[0]], {
        radius,
        fillColor: "#26272a",
        fillOpacity: 0.55,
        color: "#17181a",
        weight: 1,
        interactive: false,
      }).addTo(karte);
    });
  });

  // Die Flaeche fuehrt zur echten Karte -- per Maus und per Tastatur
  // (tabindex/role/aria-label stehen in index.html). Ein Klick auf einen
  // echten Link darin (die OSM-Attribution) darf nicht abgefangen werden,
  // sonst waere die Lizenzangabe sichtbar, aber wirkungslos.
  const container = document.getElementById("kartenvorschau");

  function gehtZurKarte(event) {
    if (event.target.closest("a")) return;
    window.location.href = "map.html";
  }

  container.addEventListener("click", gehtZurKarte);

  container.addEventListener("keydown", (event) => {
    if (event.target !== container) return; // Links regeln ihre eigene Tastaturbedienung
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
   Hoechstwert samt Art und Datum, Link nach map.html?nr=... . Neu ist nur
   die Herkunft der Daten (companies aus daten.js statt eigenem fetch) und
   das Markup, das der neuen Struktur folgt. */
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

  // Hoechste Gesamtzahl aus den Records, samt Art und Datum der Zaehlung.
  let maxCount = 0;
  let maxArt = "";
  let maxDatum = "";
  pick.records.forEach((r) => {
    if (r.gesamt && r.gesamt > maxCount) {
      maxCount = r.gesamt;
      maxArt = r.art || "";
      maxDatum = r.datum || "";
    }
  });

  // "xxx" und "unbekannt" sind Leerstellen der Quelle, siehe OHNE_ANGABE_ZWEIGE
  // in js/daten.js -- frueher eine lokale Kopie in landing.js.
  const zweigText = OHNE_ANGABE_ZWEIGE.includes(pick.industriezweig)
    ? "Branche nicht überliefert"
    : pick.industriezweig;

  let metaHtml = "";
  if (standort.adresse) metaHtml += `${standort.adresse}, ${standort.ort || ""}<br>`;
  if (zweigText) metaHtml += `${zweigText}<br>`;
  if (maxCount > 0) {
    // r.datum liegt in den Rohdaten schon deutsch formatiert vor
    // (z. B. "13.8.1942"), anders als datumVon/datumBis -- deshalb hier
    // unveraendert uebernommen und nicht durch formatDateDE() geschickt.
    metaHtml += `Bis zu <strong>${maxCount}</strong> Zwangsarbeiter`;
    if (maxArt) metaHtml += ` (${maxArt})`;
    if (maxDatum) metaHtml += ` — ${maxDatum}`;
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
    ladeKartenvorschau();
    baueEintragsbeispiel();
  } catch (err) {
    console.error("Daten-Fehler:", err);
  }
});
