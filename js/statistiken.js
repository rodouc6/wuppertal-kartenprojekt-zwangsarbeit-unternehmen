/* =============================================
   statistiken.js  –  Statistikseite: Zwangsarbeit Wuppertal
============================================= */

// Farben je Industriezweig (identisch mit map-app.js)
const INDUSTRY_COLORS = {
  "Metallindustrie":                    "#c0392b",
  "NE-Metallindustrie":                 "#e8562a",
  "Maschinenbau":                       "#e67e22",
  "Kraftfahrzeugindustrie":             "#d35400",
  "Elektrotechnik":                     "#c9a800",
  "Luftfahrtindustrie":                 "#8e44ad",
  "Textilindustrie":                    "#6c3483",
  "Chemie":                             "#1a5276",
  "Kunststoffindustrie":                "#2e86c1",
  "Pyrotechnik":                        "#ff4757",
  "Bauunternehmen":                     "#7d6608",
  "Baustoffe":                          "#9a7d0a",
  "Industrie der Steine und Erden":     "#a04000",
  "Ziegelei":                           "#cb4335",
  "Lebensmittelindustrie":              "#1e8449",
  "Genussmittelindustrie":              "#27ae60",
  "Gastgewerbe":                        "#45b39d",
  "Gärtnerei":                          "#117a65",
  "Papierindustrie":                    "#0e6655",
  "Druckwesen":                         "#148f77",
  "Handel":                             "#2471a3",
  "Handel / Dienstleistungen":          "#5499c7",
  "Logistik":                           "#5d6d7e",
  "Handwerk":                           "#7f8c8d",
  "Möbelindustrie":                     "#b7950b",
  "Fahrradindustrie":                   "#d4ac0d",
  "Herstellung von Musikinstrumenten":  "#8d6e0a",
  "öffentliche Behörde":               "#566573",
  "unbekannt":                          "#aab7b8",
  "xxx":                                "#333333",
};

function colorForIndustrie(iz) {
  return INDUSTRY_COLORS[iz] || "#888888";
}

// Farben für die Verlaufslinien (ZA-Art)
const LINE_COLORS = [
  '#c0392b', '#e67e22', '#8e44ad', '#27ae60',
  '#1a5276', '#d35400', '#117a65', '#6c3483',
  '#2e86c1', '#f39c12',
];

const MONTH_NAMES_SHORT = [
  'Jan','Feb','Mär','Apr','Mai','Jun',
  'Jul','Aug','Sep','Okt','Nov','Dez',
];

function shortDateDE(iso) {
  const [y, m] = iso.split('-').map(Number);
  return `${MONTH_NAMES_SHORT[m - 1]} ${y}`;
}

// ---- Datenladen ----

async function loadData() {
  const [geoRes, metaRes] = await Promise.all([
    fetch('../data/unternehmen.geojson'),
    fetch('../data/meta.json'),
  ]);
  const gj = await geoRes.json();
  const meta = await metaRes.json();
  const features = gj.features.map(f => f.properties);
  buildCharts(features, meta.dates || []);
}

function buildCharts(features, dates) {
  // Unternehmens-Statistiken: nur standortNr === 1 (ein Eintrag je Unternehmen)
  const companies = features.filter(f => f.standortNr === 1);

  // Zeitreihendaten für ZA-Art und Geschlecht berechnen
  const { zaArtSeries, mSeries, wSeries } = computeTimeSeries(features, dates);

  buildIndustrieChart(companies);
  buildZaArtVerlaufChart(zaArtSeries, dates);
  buildGeschlechtVerlaufChart(mSeries, wSeries, dates);
  buildGeschlechtChart(mSeries, wSeries);
  buildExistiertChart(companies);
  buildStadtteilChart(companies);
}

// ---- Zeitreihen-Berechnung ----
// Für jeden Stichtag: welche Records sind aktiv? (datumVon <= date < datumBis)
// Dies entspricht der gleichen Logik wie getCompanyCount() in map-app.js.

function computeTimeSeries(features, dates) {
  const zaArtSeries = {};       // art -> [Anzahl Personen je Stichtag]
  const mSeries = new Array(dates.length).fill(0);
  const wSeries = new Array(dates.length).fill(0);

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const artTotals = {};
    let mTotal = 0, wTotal = 0;

    for (const f of features) {
      for (const r of (f.records || [])) {
        // Record ist aktiv wenn: datumVon <= Stichtag < datumBis
        if (r.datumVon <= date && (!r.datumBis || date < r.datumBis)) {
          if (r.art) {
            artTotals[r.art] = (artTotals[r.art] || 0) + (r.gesamt || 0);
          }
          mTotal += r.m || 0;
          wTotal += r.w || 0;
        }
      }
    }

    for (const [art, count] of Object.entries(artTotals)) {
      if (!zaArtSeries[art]) zaArtSeries[art] = new Array(dates.length).fill(0);
      zaArtSeries[art][i] = count;
    }
    mSeries[i] = mTotal;
    wSeries[i] = wTotal;
  }

  return { zaArtSeries, mSeries, wSeries };
}

// ---- Charts ----

function buildIndustrieChart(companies) {
  const map = {};
  for (const c of companies) {
    const iz = c.industriezweig || "unbekannt";
    map[iz] = (map[iz] || 0) + 1;
  }
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 15);
  const labels = sorted.map(e => e[0]);
  const data = sorted.map(e => e[1]);
  const colors = labels.map(colorForIndustrie);

  new Chart(document.getElementById('chart-industrie'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: colors.map(c => c + 'cc'),
        borderWidth: 1,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.x} Unternehmen`,
          },
        },
      },
      scales: {
        x: { title: { display: true, text: 'Anzahl Unternehmen' } },
        y: { ticks: { font: { size: 11 } } },
      },
    },
  });
}

function buildZaArtVerlaufChart(zaArtSeries, dates) {
  // Top 8 ZA-Arten nach Höchstwert
  const sorted = Object.entries(zaArtSeries)
    .map(([art, values]) => [art, Math.max(...values)])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const dateLabels = dates.map(shortDateDE);

  const datasets = sorted.map(([art], idx) => ({
    label: art,
    data: zaArtSeries[art],
    borderColor: LINE_COLORS[idx % LINE_COLORS.length],
    backgroundColor: 'transparent',
    tension: 0.2,
    pointRadius: 2,
    borderWidth: 2,
  }));

  new Chart(document.getElementById('chart-zaart'), {
    type: 'line',
    data: { labels: dateLabels, datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 14 } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('de-DE')}`,
          },
        },
      },
      scales: {
        x: { ticks: { maxTicksLimit: 12, font: { size: 10 }, maxRotation: 45 } },
        y: { title: { display: true, text: 'Anzahl Personen' }, min: 0 },
      },
    },
  });
}

function buildGeschlechtVerlaufChart(mSeries, wSeries, dates) {
  const dateLabels = dates.map(shortDateDE);

  new Chart(document.getElementById('chart-geschlecht-verlauf'), {
    type: 'line',
    data: {
      labels: dateLabels,
      datasets: [
        {
          label: 'Männlich',
          data: mSeries,
          borderColor: '#2471a3',
          backgroundColor: 'rgba(36, 113, 163, 0.08)',
          tension: 0.2,
          pointRadius: 2,
          fill: true,
          borderWidth: 2,
        },
        {
          label: 'Weiblich',
          data: wSeries,
          borderColor: '#8b0000',
          backgroundColor: 'rgba(139, 0, 0, 0.08)',
          tension: 0.2,
          pointRadius: 2,
          fill: true,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('de-DE')}`,
          },
        },
      },
      scales: {
        x: { ticks: { maxTicksLimit: 12, font: { size: 10 }, maxRotation: 45 } },
        y: { title: { display: true, text: 'Anzahl Personen' }, min: 0 },
      },
    },
  });
}

function buildGeschlechtChart(mSeries, wSeries) {
  // Höchstwert aus der Zeitreihe (statt kumulativer Summe)
  const peakM = Math.max(...mSeries);
  const peakW = Math.max(...wSeries);

  new Chart(document.getElementById('chart-geschlecht'), {
    type: 'doughnut',
    data: {
      labels: ['Männlich', 'Weiblich'],
      datasets: [{
        data: [peakM, peakW],
        backgroundColor: ['#2471a3', '#8b0000'],
        borderColor: '#fff',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return ` ${ctx.label}: ${ctx.parsed.toLocaleString('de-DE')} (${pct} %)`;
            },
          },
        },
      },
    },
  });
}

function buildExistiertChart(companies) {
  const counts = { ja: 0, nein: 0, unbekannt: 0 };
  for (const c of companies) {
    const val = (c.existiertHeute || 'unbekannt').toLowerCase().trim();
    if (val in counts) counts[val]++;
    else counts.unbekannt++;
  }

  new Chart(document.getElementById('chart-existiert'), {
    type: 'doughnut',
    data: {
      labels: ['Ja', 'Nein', 'Unbekannt'],
      datasets: [{
        data: [counts.ja, counts.nein, counts.unbekannt],
        backgroundColor: ['#1e8449', '#8b0000', '#aab7b8'],
        borderColor: '#fff',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed}`,
          },
        },
      },
    },
  });
}

function buildStadtteilChart(companies) {
  const map = {};
  for (const c of companies) {
    if (!c.stadtteil) continue;
    map[c.stadtteil] = (map[c.stadtteil] || 0) + 1;
  }
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
  const labels = sorted.map(e => e[0]);
  const data = sorted.map(e => e[1]);

  new Chart(document.getElementById('chart-stadtteil'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: '#8b0000',
        borderColor: '#6b0000',
        borderWidth: 1,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.x} Unternehmen`,
          },
        },
      },
      scales: {
        x: { title: { display: true, text: 'Anzahl Unternehmen' } },
        y: { ticks: { font: { size: 11 } } },
      },
    },
  });
}

loadData();
