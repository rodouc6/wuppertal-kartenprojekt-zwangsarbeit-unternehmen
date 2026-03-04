/* =========================================================
   map-app.js  –  Karten-Logik: Zwangsarbeit Wuppertal
   ========================================================= */

// ---- State ----
let companies = {};         // nr -> company object
let markerMap = {};          // "nr-standortNr" -> L.circleMarker
let markerGroupByNr = {};    // nr -> [L.circleMarker, ...]
let activeNr = null;
let map;
let meta = {};
let allDates = [];           // sorted ISO date strings
let currentDateIdx = 0;
let currentDate = null;      // ISO string
let playInterval = null;
let filters = {
  industriezweig: [],        // multi-select
  zaArt: [],                 // multi-select
  geschlecht: null,          // null | 'm' | 'w'
  stadtteil: [],             // multi-select
  mindestzahl: 0,            // numeric
};
let visibleNrs = new Set();  // currently visible company nrs after filtering

// ---- Constants ----
const MIN_RADIUS = 4;

// Farben je Industriezweig (thematisch gruppiert)
const INDUSTRY_COLORS = {
  // Metall & Maschinen
  "Metallindustrie":                    "#c0392b",
  "NE-Metallindustrie":                 "#e8562a",
  "Maschinenbau":                       "#e67e22",
  "Kraftfahrzeugindustrie":             "#d35400",
  "Elektrotechnik":                     "#c9a800",
  "Luftfahrtindustrie":                 "#8e44ad",
  // Textil
  "Textilindustrie":                    "#6c3483",
  // Chemie & Kunststoff
  "Chemie":                             "#1a5276",
  "Kunststoffindustrie":                "#2e86c1",
  "Pyrotechnik":                        "#ff4757",
  // Bau & Steine
  "Bauunternehmen":                     "#7d6608",
  "Baustoffe":                          "#9a7d0a",
  "Industrie der Steine und Erden":     "#a04000",
  "Ziegelei":                           "#cb4335",
  // Lebensmittel & Genuss
  "Lebensmittelindustrie":              "#1e8449",
  "Genussmittelindustrie":              "#27ae60",
  "Gastgewerbe":                        "#45b39d",
  "Gärtnerei":                          "#117a65",
  // Papier & Druck
  "Papierindustrie":                    "#0e6655",
  "Druckwesen":                         "#148f77",
  // Handel & Logistik
  "Handel":                             "#2471a3",
  "Handel / Dienstleistungen":          "#5499c7",
  "Logistik":                           "#5d6d7e",
  "Handwerk":                           "#7f8c8d",
  // Holz, Möbel & Sonstiges
  "Möbelindustrie":                     "#b7950b",
  "Fahrradindustrie":                   "#d4ac0d",
  "Herstellung von Musikinstrumenten":  "#8d6e0a",
  // Öffentlich & unbekannt
  "öffentliche Behörde":               "#566573",
  "unbekannt":                          "#aab7b8",
  "xxx":                                "#333333",
};

function colorForIndustrie(iz) {
  if (!iz) return "#aab7b8";
  return INDUSTRY_COLORS[iz] || "#888888";
}

const RADIUS_STEPS = [
  { max: 0,   r: 4  },
  { max: 10,  r: 5  },
  { max: 50,  r: 8  },
  { max: 100, r: 11 },
  { max: 250, r: 15 },
  { max: 500, r: 19 },
];
const RADIUS_MAX = 24;  // > 500

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

// ---- Init ----
document.addEventListener("DOMContentLoaded", async () => {
  // Kartenbereich auf die Region Wuppertal begrenzen
  const WUP_BOUNDS = L.latLngBounds(
    [51.10, 6.85],  // Südwest
    [51.40, 7.50]   // Nordost
  );
  map = L.map("map", {
    zoomControl: true,
    maxBounds: WUP_BOUNDS,
    maxBoundsViscosity: 1.0,
    minZoom: 11,
  }).setView([51.258, 7.175], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende',
    maxZoom: 19,
  }).addTo(map);

  try {
    const [geoRes, metaRes] = await Promise.all([
      fetch("data/unternehmen.geojson"),
      fetch("data/meta.json"),
    ]);
    const geoData = await geoRes.json();
    meta = await metaRes.json();

    allDates = meta.dates || [];

    buildCompanies(geoData.features);
    buildMarkers();
    buildList();
    updateCounter();
    initTimeline();
    initFilters();
    buildLegend();
    buildIndustryLegend();
    initSidebarToggle();
    handleDeepLink();
  } catch (err) {
    console.error("Fehler beim Laden:", err);
    document.getElementById("entries-container").innerHTML =
      '<p style="padding:1em;color:#900">Fehler beim Laden der Daten.</p>';
  }
});

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

// ---- Map: Create markers ----
function buildMarkers() {
  Object.values(companies).forEach((c) => {
    markerGroupByNr[c.nr] = [];

    c.locations.forEach((loc) => {
      if (!loc.geometry) return;

      const coords = loc.geometry.coordinates;
      const latlng = [coords[1], coords[0]];
      const izColor = colorForIndustrie(c.industriezweig);
      const marker = L.circleMarker(latlng, {
        radius: MIN_RADIUS,
        fillColor: izColor,
        color: "#fff",
        weight: 1.5,
        fillOpacity: 0.85,
      }).addTo(map);

      marker._companyNr = c.nr;
      marker._standortNr = loc.standortNr;
      marker._baseRadius = MIN_RADIUS;
      marker._izColor = izColor;

      marker.bindPopup(() => makePopup(c, loc));

      marker.on("click", () => {
        setActive(c.nr);
        scrollToEntry(c.nr);
      });

      const key = `${c.nr}-${loc.standortNr}`;
      markerMap[key] = marker;
      markerGroupByNr[c.nr].push(marker);
    });
  });
}

// ---- Update marker radii for current date ----
function updateMarkerRadii() {
  Object.values(companies).forEach((c) => {
    const count = getCompanyCount(c, currentDate);
    const r = radiusForCount(count);
    const markers = markerGroupByNr[c.nr];
    if (!markers) return;

    markers.forEach((m) => {
      m._baseRadius = r;
      m._count = count;
      // Don't override active marker style
      if (c.nr === activeNr) {
        m.setRadius(r + 3);
      } else {
        m.setRadius(r);
      }
    });
  });
}

// ---- Update current ZA count in each sidebar card ----
function updateSidebarCounts() {
  if (!currentDate) return;
  Object.values(companies).forEach((c) => {
    const el = document.getElementById(`count-${c.nr}`);
    if (!el) return;
    const count = getCompanyCount(c, currentDate);
    if (count > 0) {
      el.textContent = `${count} Zwangsarbeiter am ${formatDateDE(currentDate)}`;
    } else {
      el.textContent = "";
    }
  });
}

// ---- Timeline ----
function initTimeline() {
  const slider = document.getElementById("timeline-slider");
  const dateLabel = document.getElementById("timeline-date");
  const playBtn = document.getElementById("timeline-play");

  if (allDates.length === 0) return;

  slider.max = allDates.length - 1;

  // Find first date with active data
  let startIdx = 0;
  for (let i = 0; i < allDates.length; i++) {
    const d = allDates[i];
    const hasData = Object.values(companies).some((c) =>
      c.records.some((r) =>
        r.datumVon && r.datumBis && r.datumVon <= d && d < r.datumBis && (r.gesamt || 0) > 0
      )
    );
    if (hasData) {
      startIdx = i;
      break;
    }
  }

  slider.value = startIdx;
  currentDateIdx = startIdx;
  currentDate = allDates[startIdx];
  dateLabel.textContent = formatDateDE(currentDate);

  // Update markers and sidebar counts for initial date
  updateMarkerRadii();
  updateSidebarCounts();

  slider.addEventListener("input", () => {
    currentDateIdx = parseInt(slider.value, 10);
    currentDate = allDates[currentDateIdx];
    dateLabel.textContent = formatDateDE(currentDate);
    applyFilters();
  });

  playBtn.addEventListener("click", () => {
    if (playInterval) {
      // Pause
      clearInterval(playInterval);
      playInterval = null;
      playBtn.innerHTML = "&#9654;";  // ▶
    } else {
      // Play
      playBtn.innerHTML = "&#9646;&#9646;";  // ⏸
      playInterval = setInterval(() => {
        currentDateIdx++;
        if (currentDateIdx >= allDates.length) {
          currentDateIdx = 0;
        }
        slider.value = currentDateIdx;
        currentDate = allDates[currentDateIdx];
        dateLabel.textContent = formatDateDE(currentDate);
        applyFilters();
      }, 1500);
    }
  });
}

// ---- Legend ----
function buildLegend() {
  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend-control");
    div.innerHTML = `<h4>Zwangsarbeiter</h4>`;

    const steps = [
      { label: "1 – 10", r: 5 },
      { label: "11 – 50", r: 8 },
      { label: "51 – 100", r: 11 },
      { label: "101 – 250", r: 15 },
      { label: "251 – 500", r: 19 },
      { label: "> 500", r: 24 },
    ];

    steps.forEach((s) => {
      const size = s.r * 2;
      div.innerHTML += `
        <div class="legend-row">
          <span class="legend-circle" style="width:${size}px;height:${size}px;"></span>
          <span>${s.label}</span>
        </div>`;
    });

    return div;
  };

  legend.addTo(map);
}

// ---- Industry colour legend ----
function buildIndustryLegend() {
  const legend = L.control({ position: "bottomleft" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend-control legend-industry");
    L.DomEvent.disableScrollPropagation(div);

    // Header mit Toggle
    div.innerHTML = `<h4 class="legend-industry-toggle" title="Ein-/ausklappen" style="cursor:pointer;user-select:none;">Industriezweige &#9660;</h4>`;
    const listDiv = L.DomUtil.create("div", "legend-industry-list", div);

    Object.entries(INDUSTRY_COLORS).forEach(([name, color]) => {
      listDiv.innerHTML += `
        <div class="legend-row">
          <span class="legend-circle" style="width:12px;height:12px;background:${color};"></span>
          <span>${name}</span>
        </div>`;
    });

    // Toggle-Klick
    div.querySelector(".legend-industry-toggle").addEventListener("click", () => {
      const open = listDiv.style.display !== "none";
      listDiv.style.display = open ? "none" : "";
      div.querySelector(".legend-industry-toggle").innerHTML =
        `Industriezweige ${open ? "&#9654;" : "&#9660;"}`;
    });

    return div;
  };

  legend.addTo(map);
}

// ---- Popup content ----
function makePopup(company, location) {
  const c = company;
  let html = `<div class="popup-content">`;
  html += `<div class="popup-nr">Nr. ${c.nr}</div>`;
  html += `<div class="popup-name">${c.name}</div>`;

  html += `<div class="popup-meta">${location.adresse || ""}, ${location.ort || ""}`;
  if (c.industriezweig) html += ` · ${c.industriezweig}`;
  html += `</div>`;

  if (c.existiertHeute) {
    const cls =
      c.existiertHeute === "ja"
        ? "badge-ja"
        : c.existiertHeute === "nein"
          ? "badge-nein"
          : "badge-sonst";
    const label =
      c.existiertHeute === "ja"
        ? "existiert heute"
        : c.existiertHeute === "nein"
          ? "existiert nicht mehr"
          : "unbekannt";
    html += `<span class="badge ${cls}">${label}</span>`;
  }

  // Current date count
  const count = getCompanyCount(c, currentDate);
  if (currentDate && count > 0) {
    html += `<div class="popup-current-count">`;
    html += `<strong>${count}</strong> Zwangsarbeiter am ${formatDateDE(currentDate)}`;
    html += `</div>`;
  }

  if (c.records.length > 0) {
    html += `<div class="popup-records">`;
    c.records.forEach((r) => {
      const parts = [];
      if (r.gesamt != null) parts.push(`${r.gesamt} ges.`);
      if (r.m != null) parts.push(`${r.m} M`);
      if (r.w != null) parts.push(`${r.w} F`);
      html += `<div class="popup-record">`;
      html += `<span class="rec-date">${r.datum || "o.D."}</span>`;
      if (r.art) html += ` · ${r.art}`;
      if (parts.length) html += `: ${parts.join(" + ")}`;
      html += `</div>`;
    });
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

// ---- Sidebar: Build entry list ----
function buildList() {
  const container = document.getElementById("entries-container");
  container.innerHTML = "";

  const sorted = Object.values(companies).sort((a, b) => {
    const na = parseFloat(a.nr) || 0;
    const nb = parseFloat(b.nr) || 0;
    return na - nb || a.nr.localeCompare(b.nr);
  });

  sorted.forEach((c) => {
    const card = document.createElement("div");
    card.className = "entry-card";
    card.id = `entry-${c.nr}`;

    const hasGeo = c.locations.some((l) => l.geometry !== null);
    if (!hasGeo) card.classList.add("no-geo");

    let headerHtml = `<div class="card-head">`;
    headerHtml += `<span class="card-nr">Nr. ${c.nr}</span>`;
    if (c.existiertHeute) {
      const cls =
        c.existiertHeute === "ja"
          ? "badge-ja"
          : c.existiertHeute === "nein"
            ? "badge-nein"
            : "badge-sonst";
      const label =
        c.existiertHeute === "ja"
          ? "existiert"
          : c.existiertHeute === "nein"
            ? "nicht mehr"
            : "unbekannt";
      headerHtml += `<span class="badge ${cls}">${label}</span>`;
    }
    headerHtml += `</div>`;

    headerHtml += `<div class="card-name">${c.name}</div>`;

    let metaHtml = `<div class="card-meta">`;
    c.locations.forEach((loc, i) => {
      if (loc.adresse) {
        if (i > 0) metaHtml += `<br>`;
        metaHtml += `${loc.adresse}, ${loc.ort || ""}`;
        if (loc.standortNr > 1) metaHtml += ` <small>(Standort ${loc.standortNr})</small>`;
      }
    });
    if (c.industriezweig) {
      const izColor = colorForIndustrie(c.industriezweig);
      metaHtml += `<br><span style="color:${izColor};font-weight:600;">${c.industriezweig}</span>`;
    }
    metaHtml += `</div>`;

    let noGeoHtml = "";
    if (!hasGeo) {
      noGeoHtml = `<div class="no-geo-note">Kein Standort bekannt</div>`;
    }

    let recordsHtml = "";
    if (c.records.length > 0) {
      recordsHtml = `<div class="card-records">`;
      c.records.forEach((r) => {
        const parts = [];
        if (r.gesamt != null) parts.push(`${r.gesamt} ges.`);
        if (r.m != null) parts.push(`${r.m} M`);
        if (r.w != null) parts.push(`${r.w} F`);
        recordsHtml += `<div class="record-row">`;
        recordsHtml += `<span class="rec-date">${r.datum || "o.D."}</span>`;
        if (r.art) recordsHtml += ` · ${r.art}`;
        if (parts.length) recordsHtml += `: ${parts.join(" + ")}`;
        recordsHtml += `</div>`;
      });
      recordsHtml += `</div>`;
    }

    // Current ZA count (updated by updateSidebarCounts)
    const countHtml = `<div class="card-current-count" id="count-${c.nr}"></div>`;

    // SpeerText section
    let speerHtml = "";
    if (c.speerText) {
      speerHtml = `<div class="card-speer">
        <button class="speer-toggle" data-nr="${c.nr}">
          <span class="speer-arrow">&#9660;</span> Quellentext
        </button>
        <div class="speer-content" id="speer-${c.nr}"></div>
      </div>`;
    }

    card.innerHTML = headerHtml + metaHtml + noGeoHtml + countHtml + recordsHtml + speerHtml;

    // Fill SpeerText via textContent (safe, no HTML injection)
    if (c.speerText) {
      const speerEl = card.querySelector(`#speer-${c.nr}`);
      if (speerEl) speerEl.textContent = c.speerText;

      const toggleBtn = card.querySelector(".speer-toggle");
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const content = card.querySelector(".speer-content");
        const isOpen = content.classList.toggle("open");
        toggleBtn.classList.toggle("open", isOpen);
      });
    }

    if (hasGeo) {
      card.addEventListener("click", () => {
        setActive(c.nr);
        flyToCompany(c.nr);
      });
      card.addEventListener("mouseenter", () => highlightMarkers(c.nr, true));
      card.addEventListener("mouseleave", () => highlightMarkers(c.nr, false));
    }

    container.appendChild(card);
  });

  // Empty state element (shown by applyFilters when 0 results)
  const emptyEl = document.createElement("p");
  emptyEl.id = "entries-empty";
  emptyEl.className = "empty-state-msg";
  emptyEl.style.display = "none";
  emptyEl.textContent = "Keine Einträge für diese Filterauswahl.";
  container.appendChild(emptyEl);
}

// ---- Counter ----
function updateCounter() {
  const total = Object.keys(companies).length;
  const locatable = Object.values(companies).filter((c) =>
    c.locations.some((l) => l.geometry !== null)
  ).length;
  const el = document.getElementById("entry-count");
  if (el) el.textContent = `${total} Unternehmen · ${locatable} verortbar`;
}

// ---- Interaction: setActive ----
function setActive(nr) {
  // Reset previous
  if (activeNr && activeNr !== nr) {
    const prevCard = document.getElementById(`entry-${activeNr}`);
    if (prevCard) prevCard.classList.remove("active");
    if (markerGroupByNr[activeNr]) {
      markerGroupByNr[activeNr].forEach((m) =>
        m.setStyle({ fillColor: m._izColor, radius: m._baseRadius, weight: 1.5, fillOpacity: 0.85 })
      );
    }
  }

  activeNr = nr;

  const card = document.getElementById(`entry-${nr}`);
  if (card) card.classList.add("active");

  if (markerGroupByNr[nr]) {
    markerGroupByNr[nr].forEach((m) => {
      m.setStyle({ fillColor: m._izColor, radius: m._baseRadius + 3, weight: 3, fillOpacity: 1.0 });
      m.bringToFront();
    });
  }
}

// ---- Interaction: flyTo ----
function flyToCompany(nr) {
  const markers = markerGroupByNr[nr];
  if (!markers || markers.length === 0) return;

  if (markers.length === 1) {
    map.flyTo(markers[0].getLatLng(), 16, { duration: 0.8 });
    markers[0].openPopup();
  } else {
    const bounds = L.latLngBounds(markers.map((m) => m.getLatLng()));
    map.flyToBounds(bounds.pad(0.3), { duration: 0.8 });
    const primary = markers.find((m) => m._standortNr === 1) || markers[0];
    setTimeout(() => primary.openPopup(), 900);
  }
}

// ---- Interaction: scroll sidebar ----
function scrollToEntry(nr) {
  const el = document.getElementById(`entry-${nr}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ---- Interaction: hover highlight ----
function highlightMarkers(nr, on) {
  if (nr === activeNr) return;
  if (!markerGroupByNr[nr]) return;

  markerGroupByNr[nr].forEach((m) => {
    if (on) {
      m.setStyle({ radius: m._baseRadius + 2, weight: 2.5, fillOpacity: 1.0 });
      m.bringToFront();
    } else {
      m.setStyle({ fillColor: m._izColor, radius: m._baseRadius, weight: 1.5, fillOpacity: 0.85 });
    }
  });
}

// ---- Deep link: ?nr= ----
function handleDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const nr = params.get("nr");
  if (nr && companies[nr]) {
    setActive(nr);
    flyToCompany(nr);
    scrollToEntry(nr);
  }
}

// ---- Sidebar Toggle ----
function initSidebarToggle() {
  const btn = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");

  btn.addEventListener("click", () => {
    const collapsed = sidebar.classList.toggle("collapsed");
    btn.innerHTML = collapsed ? "&#9664;" : "&#9654;";
    btn.title = collapsed ? "Sidebar anzeigen" : "Sidebar ausblenden";
    setTimeout(() => {
      map.invalidateSize();
      if (!collapsed && activeNr) scrollToEntry(activeNr);
    }, 260);
  });
}


// ---- Filters ----
function initFilters() {
  const toggleBtn = document.getElementById("filter-toggle");
  const panel = document.getElementById("filter-panel");
  const resetBtn = document.getElementById("filter-reset");

  // Toggle filter panel
  toggleBtn.addEventListener("click", () => {
    panel.classList.toggle("hidden");
    toggleBtn.classList.toggle("active");
  });

  // Populate dropdown filters from meta.json
  populateDropdown("dd-industriezweig", meta.industriezweige || [], "industriezweig");
  populateDropdown("dd-zaart", meta.zaArten || [], "zaArt");
  populateDropdown("dd-stadtteil", meta.stadtteile || [], "stadtteil");

  // Dropdown toggle buttons
  document.querySelectorAll(".dropdown-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const targetId = btn.dataset.target;
      const list = document.getElementById(targetId);
      // Close all other dropdowns
      document.querySelectorAll(".dropdown-list.open").forEach((el) => {
        if (el.id !== targetId) el.classList.remove("open");
      });
      list.classList.toggle("open");
    });
  });

  // Close dropdowns on outside click
  document.addEventListener("click", () => {
    document.querySelectorAll(".dropdown-list.open").forEach((el) => {
      el.classList.remove("open");
    });
  });

  // Gender toggle buttons
  document.querySelectorAll(".filter-btn[data-gender]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const gender = btn.dataset.gender;
      if (filters.geschlecht === gender) {
        // Deselect
        filters.geschlecht = null;
        btn.classList.remove("active");
      } else {
        // Select this, deselect other
        filters.geschlecht = gender;
        document.querySelectorAll(".filter-btn[data-gender]").forEach((b) =>
          b.classList.remove("active")
        );
        btn.classList.add("active");
      }
      applyFilters();
    });
  });

  // Mindestzahl input
  const minInput = document.getElementById("filter-mindestzahl");
  function onMindestzahlChange() {
    filters.mindestzahl = parseInt(minInput.value, 10) || 0;
    applyFilters();
  }
  minInput.addEventListener("input", onMindestzahlChange);
  minInput.addEventListener("change", onMindestzahlChange);

  // Reset
  resetBtn.addEventListener("click", () => {
    filters.industriezweig = [];
    filters.zaArt = [];
    filters.geschlecht = null;
    filters.stadtteil = [];
    filters.mindestzahl = 0;

    // Reset UI
    document.querySelectorAll(".dropdown-list input[type='checkbox']").forEach((cb) => {
      cb.checked = false;
    });
    document.querySelectorAll(".dropdown-btn").forEach((btn) => {
      const span = btn.querySelector(".dd-arrow");
      btn.textContent = "Alle ";
      btn.appendChild(span);
    });
    document.querySelectorAll(".filter-btn[data-gender]").forEach((b) =>
      b.classList.remove("active")
    );
    minInput.value = "";

    applyFilters();
  });

  // Initial state: all visible
  visibleNrs = new Set(Object.keys(companies));
}

function populateDropdown(listId, values, filterKey) {
  const list = document.getElementById(listId);
  list.innerHTML = "";

  values.forEach((val) => {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = val;
    cb.addEventListener("change", () => {
      if (cb.checked) {
        filters[filterKey].push(val);
      } else {
        filters[filterKey] = filters[filterKey].filter((v) => v !== val);
      }
      updateDropdownLabel(listId, filterKey);
      applyFilters();
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(val));
    list.appendChild(label);
  });
}

function updateDropdownLabel(listId, filterKey) {
  const list = document.getElementById(listId);
  const btn = list.parentElement.querySelector(".dropdown-btn");
  const arrow = btn.querySelector(".dd-arrow");
  const selected = filters[filterKey];

  if (selected.length === 0) {
    btn.textContent = "Alle ";
  } else if (selected.length === 1) {
    btn.textContent = selected[0] + " ";
  } else {
    btn.textContent = `${selected.length} ausgewählt `;
  }
  btn.appendChild(arrow);
}

function companyMatchesFilters(company) {
  // Industriezweig
  if (filters.industriezweig.length > 0) {
    if (!company.industriezweig || !filters.industriezweig.includes(company.industriezweig)) {
      return false;
    }
  }

  // ZA-Art: company must have at least one record with matching art
  if (filters.zaArt.length > 0) {
    const hasMatchingArt = company.records.some(
      (r) => r.art && filters.zaArt.includes(r.art)
    );
    if (!hasMatchingArt) return false;
  }

  // Geschlecht: company must have at least one record with the gender count > 0
  if (filters.geschlecht === "m") {
    const hasMale = company.records.some((r) => r.m && r.m > 0);
    if (!hasMale) return false;
  } else if (filters.geschlecht === "w") {
    const hasFemale = company.records.some((r) => r.w && r.w > 0);
    if (!hasFemale) return false;
  }

  // Stadtteil: any location must match
  if (filters.stadtteil.length > 0) {
    const hasMatchingStadtteil = company.locations.some(
      (loc) => loc.stadtteil && filters.stadtteil.includes(loc.stadtteil)
    );
    if (!hasMatchingStadtteil) return false;
  }

  // Mindestzahl: count at current date must reach minimum
  if (filters.mindestzahl > 0) {
    const count = getCompanyCount(company, currentDate);
    if (count < filters.mindestzahl) return false;
  }

  return true;
}

function applyFilters() {
  visibleNrs = new Set();
  const statusEl = document.getElementById("filter-status");
  let visibleCount = 0;
  const totalCount = Object.keys(companies).length;

  Object.values(companies).forEach((c) => {
    const visible = companyMatchesFilters(c);

    if (visible) {
      visibleNrs.add(c.nr);
      visibleCount++;
    }

    // Update markers
    const markers = markerGroupByNr[c.nr];
    if (markers) {
      markers.forEach((m) => {
        if (visible) {
          m.addTo(map);
        } else {
          m.removeFrom(map);
        }
      });
    }

    // Update sidebar cards
    const card = document.getElementById(`entry-${c.nr}`);
    if (card) {
      card.style.display = visible ? "" : "none";
    }
  });

  // Update radii and sidebar counts
  updateMarkerRadii();
  updateSidebarCounts();

  // Empty state
  const emptyEl = document.getElementById("entries-empty");
  if (emptyEl) emptyEl.style.display = visibleCount === 0 ? "" : "none";

  // Update status text
  const hasActiveFilter =
    filters.industriezweig.length > 0 ||
    filters.zaArt.length > 0 ||
    filters.geschlecht !== null ||
    filters.stadtteil.length > 0 ||
    filters.mindestzahl > 0;

  if (hasActiveFilter) {
    statusEl.textContent = `${visibleCount} von ${totalCount}`;
  } else {
    statusEl.textContent = "";
  }

  // Update counter
  const el = document.getElementById("entry-count");
  if (el) {
    if (hasActiveFilter) {
      el.textContent = `${visibleCount} von ${totalCount} Unternehmen (gefiltert)`;
    } else {
      updateCounter();
    }
  }
}
