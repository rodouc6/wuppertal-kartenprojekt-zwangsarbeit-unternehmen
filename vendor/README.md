# Vendor-Bibliotheken

Lokal abgelegte Kopien externer JS-Bibliotheken, damit die Seite beim Laden keine
Anfragen mehr an fremde CDNs (unpkg.com, cdn.jsdelivr.net) auslöst.

## Leaflet 1.9.4

- Quelle: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js`,
  `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css`,
  Bilder aus `https://unpkg.com/leaflet@1.9.4/dist/images/`
  (nur die drei Dateien, die `leaflet.css` referenziert: `layers.png`,
  `layers-2x.png`, `marker-icon.png`)
- Geholt am: 31.7.2026
- Lizenz: BSD-2-Clause (siehe https://github.com/Leaflet/Leaflet/blob/main/LICENSE)

## Chart.js 4.4.0

- Quelle: `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js`
- Geholt am: 31.7.2026
- Lizenz: MIT (siehe https://github.com/chartjs/Chart.js/blob/master/LICENSE.md)

## Aktualisieren

Ein Update auf eine neuere Version bedeutet: Dateien von der jeweiligen
Versions-URL neu herunterladen, in einen neuen Ordner mit der neuen
Versionsnummer im Namen legen (z. B. `leaflet-1.9.5/`) und die Einbindungen
in den HTML-Dateien auf den neuen Pfad umstellen. Alte Ordner nicht einfach
überschreiben, damit der Ordnername stets zum Inhalt passt.
