/* =============================================
   statistiken.js  –  Statistikseite: Zwangsarbeit Wuppertal
============================================= */

// Branchenfarben kommen aus js/branchen.js

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
  // Nur ein Eintrag je Unternehmen: bei Mehrfach-Standorten hängt an jedem
  // Standort dieselbe records-Liste, sonst zählen 11 Unternehmen doppelt.
  const { zaArtSeries, mSeries, wSeries } = computeTimeSeries(companies, dates);

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
// Erwartet wird ein Eintrag JE UNTERNEHMEN, nicht je Standort: an jedem
// Standort hängt dieselbe records-Liste, sonst zählen 11 Unternehmen doppelt.
// Genau diese Verwechslung war der Doppelzählungs-Bug.

function computeTimeSeries(companies, dates) {
  const zaArtSeries = {};       // art -> [Anzahl Personen je Stichtag]
  const mSeries = new Array(dates.length).fill(0);
  const wSeries = new Array(dates.length).fill(0);

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const artTotals = {};
    let mTotal = 0, wTotal = 0;

    for (const c of companies) {
      for (const r of (c.records || [])) {
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
  // Betriebe je Gruppe zählen
  const proGruppe = {};
  BRANCHEN_GRUPPEN.forEach((g) => (proGruppe[g.id] = 0));
  companies.forEach((c) => {
    proGruppe[gruppeFuerZweig(c.industriezweig).id]++;
  });

  const sortiert = BRANCHEN_GRUPPEN
    .map((g) => ({ gruppe: g, anzahl: proGruppe[g.id] }))
    .sort((a, b) => b.anzahl - a.anzahl);
  const max = Math.max(...sortiert.map((e) => e.anzahl), 1);

  const container = document.getElementById("branchen-balken");
  container.innerHTML = "";

  sortiert.forEach(({ gruppe, anzahl }) => {
    // Die Zweige dieser Gruppe sind Platzhalter der Quelltabelle, keine Branchen.
    // Sie auszuschreiben würde dem widersprechen, was die Karte bereits tut.
    const zweigeText =
      gruppe.id === "ohne-angabe"
        ? "keine Branchenangabe in der Quelle"
        : gruppe.zweige.join(", ");

    const zeile = document.createElement("div");
    zeile.className = "bb-zeile";
    zeile.innerHTML = `
      <span class="bb-punkt" style="background:${gruppe.farbe}"></span>
      <span class="bb-name">${gruppe.name}</span>
      <span class="bb-zweige">${zweigeText}</span>
      <span class="bb-balken-spur">
        <span class="bb-balken" style="width:${(anzahl / max) * 100}%;background:${gruppe.farbe}"></span>
      </span>
      <span class="bb-zahl">${anzahl}</span>`;
    container.appendChild(zeile);
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
          borderColor: '#4a4b4e',
          backgroundColor: 'rgba(74, 75, 78, 0.08)',
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
        backgroundColor: ['#2471a3', '#4a4b4e'],
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
        backgroundColor: ['#1e8449', '#77787a', '#aab7b8'],
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
        backgroundColor: '#4a4b4e',
        borderColor: '#33343a',
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
