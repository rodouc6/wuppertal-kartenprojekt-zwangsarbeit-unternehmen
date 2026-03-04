/* =========================================================
   landing.js  –  Zufalls-Spotlight auf der Startseite
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("data/unternehmen.geojson");
    const data = await res.json();

    // Filter: nur Features mit Geometrie und mindestens einem Record mit Gesamt > 0
    const candidates = [];
    const seen = new Set();

    data.features.forEach((f) => {
      const p = f.properties;
      if (seen.has(p.nr)) return;
      seen.add(p.nr);

      if (!f.geometry) return;
      const hasData = p.records && p.records.some((r) => r.gesamt && r.gesamt > 0);
      if (!hasData) return;

      candidates.push(p);
    });

    if (candidates.length === 0) return;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];

    // Höchste Gesamtzahl aus den Records
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

    let metaHtml = "";
    if (pick.adresse) metaHtml += `${pick.adresse}, ${pick.ort || ""}<br>`;
    if (pick.industriezweig) metaHtml += `${pick.industriezweig}<br>`;
    if (maxCount > 0) {
      metaHtml += `Bis zu <strong>${maxCount}</strong> Zwangsarbeiter`;
      if (maxArt) metaHtml += ` (${maxArt})`;
      if (maxDatum) metaHtml += ` — ${maxDatum}`;
    }

    const container = document.getElementById("spotlight");
    container.innerHTML = `
      <div class="spotlight-card">
        <div class="spotlight-label">Nr. ${pick.nr} — Zufallseintrag</div>
        <div class="spotlight-name">${pick.name}</div>
        <div class="spotlight-meta">${metaHtml}</div>
        <a class="spotlight-link" href="map.html?nr=${pick.nr}">&rarr; Auf der Karte anzeigen</a>
      </div>
    `;
  } catch (err) {
    console.error("Spotlight-Fehler:", err);
  }
});
