/* =========================================================
   branchen.js  –  Branchengruppen, Farben und Zuordnung
   Einzige Quelle für die Farbgebung von Karte und Statistik.
   Die 30 Einzelzweige der Quelle bleiben im Filter erhalten;
   gruppiert wird ausschließlich für die farbliche Darstellung.
   ========================================================= */

const BRANCHEN_GRUPPEN = [
  {
    id: "metall",
    name: "Metall & Metallwaren",
    farbe: "#b02418",
    zweige: ["Metallindustrie", "NE-Metallindustrie"],
  },
  {
    id: "maschinenbau",
    name: "Maschinen- & Fahrzeugbau",
    farbe: "#e07b1f",
    zweige: ["Maschinenbau", "Kraftfahrzeugindustrie", "Fahrradindustrie", "Luftfahrtindustrie"],
  },
  {
    id: "textil",
    name: "Textil",
    farbe: "#7d3c98",
    zweige: ["Textilindustrie"],
  },
  {
    id: "handel",
    name: "Handel, Verkehr & Dienste",
    farbe: "#5d6d7e",
    zweige: ["Handel / Dienstleistungen", "Handwerk", "Logistik", "öffentliche Behörde"],
  },
  {
    id: "bau",
    name: "Bau, Steine & Erden",
    farbe: "#8a5a2b",
    zweige: ["Bauunternehmen", "Baustoffe", "Industrie der Steine und Erden", "Ziegelei"],
  },
  {
    id: "nahrung",
    name: "Nahrung, Genuss & Landwirtschaft",
    farbe: "#2f7d3a",
    zweige: ["Lebensmittelindustrie", "Genussmittelindustrie", "Gärtnerei", "Gastgewerbe"],
  },
  {
    id: "chemie",
    name: "Chemie & Kunststoff",
    farbe: "#1a6faf",
    zweige: ["Chemie", "Kunststoffindustrie", "Pyrotechnik"],
  },
  {
    id: "elektro",
    name: "Elektrotechnik",
    farbe: "#b8960c",
    zweige: ["Elektrotechnik"],
  },
  {
    id: "papier",
    name: "Papier, Druck & Holz",
    farbe: "#0e8a86",
    zweige: ["Papierindustrie", "Druckwesen", "Möbelindustrie", "Herstellung von Musikinstrumenten"],
  },
  {
    id: "ohne-angabe",
    name: "ohne Angabe",
    farbe: "#b9bfc4",
    zweige: ["unbekannt", "xxx"],
  },
];

const GRUPPE_OHNE_ANGABE = BRANCHEN_GRUPPEN[BRANCHEN_GRUPPEN.length - 1];

// Nachschlagetabelle Einzelzweig -> Gruppe, einmalig aufgebaut
const _ZWEIG_ZU_GRUPPE = {};
BRANCHEN_GRUPPEN.forEach((g) => {
  g.zweige.forEach((z) => {
    _ZWEIG_ZU_GRUPPE[z] = g;
  });
});

function gruppeFuerZweig(zweig) {
  if (!zweig) return GRUPPE_OHNE_ANGABE;
  return _ZWEIG_ZU_GRUPPE[zweig] || GRUPPE_OHNE_ANGABE;
}

function farbeFuerZweig(zweig) {
  return gruppeFuerZweig(zweig).farbe;
}

// Für Node-Prüfskripte; im Browser wirkungslos.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BRANCHEN_GRUPPEN, gruppeFuerZweig, farbeFuerZweig };
}
