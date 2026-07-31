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

/* Baut die nicht interaktive Kartenvorschau: ein Zustand (Hoechststand je
   Standort ueber alle Stichtage), keine eigenen Klickziele -- ein Klick auf
   die Flaeche fuehrt zur Hauptkarte. */
async function ladeKartenvorschau() {
  const geoData = await (await fetch("data/unternehmen.geojson")).json();
  buildCompanies(geoData.features);

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

document.addEventListener("DOMContentLoaded", () => {
  ladeKennzahlen().catch((err) => console.error("Kennzahlen-Fehler:", err));
  ladeKartenvorschau().catch((err) => console.error("Kartenvorschau-Fehler:", err));
});
