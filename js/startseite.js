/* =========================================================
   startseite.js  –  Kennzahlen der Startseite
   ========================================================= */

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

document.addEventListener("DOMContentLoaded", () => {
  ladeKennzahlen().catch((err) => console.error("Kennzahlen-Fehler:", err));
});
