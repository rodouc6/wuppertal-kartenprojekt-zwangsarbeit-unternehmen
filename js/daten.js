/* =========================================================
   daten.js  –  geteilte Rechenlogik: Zwangsarbeit Wuppertal
   Beantwortet Fragen über die Daten, nicht über ihre Darstellung.
   Wird vor map-app.js und startseite.js eingebunden.
   ========================================================= */

// ---- Constants ----
const MIN_RADIUS = 4;

// Farben kommen aus js/branchen.js: farbeFuerZweig() und BRANCHEN_GRUPPEN

const RADIUS_STEPS = [
  { max: 0,   r: 4  },
  { max: 10,  r: 5  },
  { max: 50,  r: 8  },
  { max: 100, r: 11 },
  { max: 250, r: 15 },
  { max: 500, r: 19 },
];
const RADIUS_MAX = 24;  // > 500

// "xxx" und "unbekannt" sind beides Leerstellen der Quelle und stehen im
// Filter als ein Eintrag "ohne Angabe". Der Sentinel taucht nur in der
// Filterauswahl auf, nie in den Daten -- companyMatchesFilters() löst ihn auf.
const OHNE_ANGABE_ZWEIGE = ["xxx", "unbekannt"];

function radiusForCount(count) {
  if (count == null || count <= 0) return MIN_RADIUS;
  for (const step of RADIUS_STEPS) {
    if (count <= step.max) return step.r;
  }
  return RADIUS_MAX;
}

// ---- German date formatting ----
const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function formatDateDE(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}. ${MONTH_NAMES[m - 1]} ${y}`;
}

// ---- Data: Group features into companies ----
function buildCompanies(features) {
  const byNr = {};

  features.forEach((f) => {
    const p = f.properties;
    const nr = p.nr;

    if (!byNr[nr]) {
      byNr[nr] = {
        nr,
        name: p.name,
        industriezweig: p.industriezweig,
        industriezweigSpeer: p.industriezweigSpeer,
        existiertHeute: p.existiertHeute,
        speerText: p.speerText,
        speerSeite: p.speerSeite,
        ruestungsgueter: p.ruestungsgueter || [],
        records: p.records || [],
        locations: [],
      };
    }

    byNr[nr].locations.push({
      standortNr: p.standortNr,
      geometry: f.geometry,
      adresse: p.adresse,
      ort: p.ort,
      stadtteil: p.stadtteil,
      verortung: p.verortung,
      adresseHeute: p.adresseHeute,
    });
  });

  companies = byNr;
}

// ---- Compute count for a company at a date (respects filters) ----
function getCompanyCount(company, dateISO) {
  if (!dateISO) return 0;
  let total = 0;
  company.records.forEach((r) => {
    if (r.datumVon && r.datumBis && r.datumVon <= dateISO && dateISO < r.datumBis) {
      // Respect ZA-Art filter
      if (filters.zaArt.length > 0 && r.art && !filters.zaArt.includes(r.art)) return;
      // Respect gender filter for count
      if (filters.geschlecht === "m") {
        total += r.m || 0;
      } else if (filters.geschlecht === "w") {
        total += r.w || 0;
      } else {
        total += r.gesamt || 0;
      }
    }
  });
  return total;
}

/* Groesster ueberlieferter Wert ueber alle Zaehlungen eines Unternehmens.
   Die Vorschau auf der Startseite hat keinen Zeitregler und zeigt deshalb
   nicht einen Stichtag, sondern den Hoechststand -- dieselbe Aggregation,
   die das Eintragsbeispiel mit "Bis zu N Zwangsarbeiter" benennt. */
function hoechststand(company) {
  let max = 0;
  company.records.forEach((r) => {
    if (r.gesamt && r.gesamt > max) max = r.gesamt;
  });
  return max;
}
