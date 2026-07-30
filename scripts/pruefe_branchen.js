/* Prüft: jeder in meta.json vorkommende Industriezweig ist genau einer
   Gruppe zugeordnet, und keine Gruppe nennt einen Zweig, den es nicht gibt.
   Aufruf: node scripts/pruefe_branchen.js */
const fs = require("fs");
const path = require("path");
const { BRANCHEN_GRUPPEN, gruppeFuerZweig } = require(path.join(__dirname, "..", "js", "branchen.js"));

const meta = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "meta.json"), "utf8"));
const ausDaten = meta.industriezweige;

let fehler = 0;

// 1. Jeder Zweig aus den Daten landet in einer echten Gruppe
const unzugeordnet = ausDaten.filter((z) => gruppeFuerZweig(z).id === "ohne-angabe" && !["unbekannt", "xxx"].includes(z));
if (unzugeordnet.length) {
  console.error("FEHLER: nicht zugeordnete Zweige:", unzugeordnet);
  fehler++;
}

// 2. Kein Zweig steht in zwei Gruppen
const gesehen = new Map();
BRANCHEN_GRUPPEN.forEach((g) => {
  g.zweige.forEach((z) => {
    if (gesehen.has(z)) {
      console.error(`FEHLER: "${z}" steht in "${gesehen.get(z)}" und "${g.id}"`);
      fehler++;
    }
    gesehen.set(z, g.id);
  });
});

// 3. Keine Gruppe nennt einen Zweig, den die Daten nicht kennen
const unbekannt = [...gesehen.keys()].filter((z) => !ausDaten.includes(z));
if (unbekannt.length) {
  console.error("FEHLER: Zweige ohne Entsprechung in den Daten:", unbekannt);
  fehler++;
}

// 4. Farben sind eindeutig
const farben = BRANCHEN_GRUPPEN.map((g) => g.farbe);
if (new Set(farben).size !== farben.length) {
  console.error("FEHLER: doppelte Farbwerte");
  fehler++;
}

console.log(`${ausDaten.length} Zweige, ${BRANCHEN_GRUPPEN.length} Gruppen, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
