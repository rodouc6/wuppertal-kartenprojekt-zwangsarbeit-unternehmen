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
// MIN_RADIUS, RADIUS_STEPS, RADIUS_MAX, radiusForCount, MONTH_NAMES,
// formatDateDE, OHNE_ANGABE_ZWEIGE: siehe js/daten.js

const OHNE_ANGABE_WERT = "__ohne_angabe__";
const OHNE_ANGABE_TEXT = "ohne Angabe";

// Beschriftungen je Filter, damit der Dropdown-Knopf bei einer Einzelauswahl
// den Anzeigetext zeigt und nicht den Sentinel.
const dropdownBeschriftungen = {};

// ---- Griffleiste des Bodenblatts ----
/* Die Griffleiste ist so hoch wie der Header -- fest verdrahtete Werte
   gehen schief, sobald die Trefferzahl umbricht. */
function setzeGriffhoehe() {
  const h = document.getElementById("sidebar-header").offsetHeight;
  document.documentElement.style.setProperty("--blatt-griff", h + "px");
}

// Entprellt, damit resize-Events (z. B. beim Drehen des Geraets) nicht in
// jedem Frame das Layout neu ausmessen.
let griffhoeheResizeTimer = null;
function setzeGriffhoeheEntprellt() {
  clearTimeout(griffhoeheResizeTimer);
  griffhoeheResizeTimer = setTimeout(setzeGriffhoehe, 100);
}

// ---- Bodenblatt: einheitlicher Zustandswechsel ----
// Schreibtisch-Knopf (#sidebar-toggle), Tipp auf die Griffleiste (schmale
// Schirme, ueber toggleBlatt in initSidebarToggle), der Filterknopf (siehe
// initFilters) und der automatische Wechsel beim Ueber-/Unterschreiten der
// 760px-Schwelle aendern den Blatt-Zustand alle ueber diese eine Stelle --
// sonst laeuft #sidebar-toggle aus dem Tritt, wenn der Zustand anderswo
// geaendert wird (Fund aus der Abschlusspruefung: Knopf zeigte "Sidebar
// anzeigen", obwohl das Blatt laengst offen war).
function setzeSidebarCollapsed(collapsed) {
  const sidebar = document.getElementById("sidebar");
  const btn = document.getElementById("sidebar-toggle");
  const griff = document.getElementById("griff-anfasser");
  const layout = document.getElementById("layout");

  sidebar.classList.toggle("collapsed", collapsed);
  btn.innerHTML = collapsed ? "&#9664;" : "&#9654;";
  btn.title = collapsed ? "Sidebar anzeigen" : "Sidebar ausblenden";
  if (griff) griff.setAttribute("aria-expanded", String(!collapsed));
  // Traegt auf schmalen Schirmen den Zeitregler ueber die Oberkante des
  // geoeffneten Blatts, siehe style.css (#layout.blatt-offen #timeline-panel).
  layout.classList.toggle("blatt-offen", !collapsed);

  setTimeout(() => {
    map.invalidateSize();
    if (!collapsed && activeNr) {
      const c = document.getElementById("entries-container");
      const card = document.getElementById(`entry-${activeNr}`);
      if (c && card) c.scrollTop = card.offsetTop - c.offsetTop;
    }
  }, 260);
}

// Schliesst die Legende beim Wechsel auf schmale Schirme (siehe
// schmalSchirmQuery-Listener unten). Wird von buildLegend() gesetzt, weil
// nur dort die dafuer noetigen Closure-Variablen (offen, setzeZustand)
// liegen.
let legendeAufSchmalSchliessen = null;

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

    // Auf schmalen Schirmen faehrt die Liste als Bodenblatt ein und startet
    // geschlossen -- sonst verdeckt sie beim Laden die ganze Karte.
    if (window.matchMedia("(max-width: 760px)").matches) {
      setzeSidebarCollapsed(true);
    }

    updateCounter();
    initTimeline();
    initFilters();
    buildLegend();
    initSidebarToggle();
    initQuellenfenster();
    handleDeepLink();

    // Griffleiste erstmalig auf die tatsaechliche Header-Hoehe setzen und bei
    // Groessenaenderung des Fensters nachziehen (z. B. Drehen des Geraets).
    setzeGriffhoehe();
    window.addEventListener("resize", setzeGriffhoeheEntprellt);

    // Der Schwellenwechsel wird in beide Richtungen behandelt (Fund aus der
    // Abschlusspruefung: bisher nur schmal -> breit).
    // Schmal -> breit: eine "collapsed"-Klasse aus dem schmalen Zustand wird
    // sonst per CSS zu einem translateX (Schreibtisch-Regel), das die ganze
    // Seitenleiste aus dem Bild schiebt. Ein geschlossenes Bodenblatt ergibt
    // auf dem Schreibtisch keinen Sinn -- beim Wechsel auf breit wird sie
    // deshalb wieder geoeffnet.
    // Breit -> schmal: ohne Behandlung stuende das Blatt sofort mit 75vh
    // offen, anders als beim Laden -- ein Tablet, das ins Hochformat gedreht
    // wird, verdeckt damit unvermittelt drei Viertel der Karte. Es startet
    // deshalb wie beim Laden geschlossen; die Legende (falls offen) schliesst
    // mit, weil aus ihr sonst schlagartig ein bildschirmfuellendes Panel wird.
    const schmalSchirmQuery = window.matchMedia("(max-width: 760px)");
    schmalSchirmQuery.addEventListener("change", (e) => {
      const sidebar = document.getElementById("sidebar");
      if (e.matches) {
        setzeSidebarCollapsed(true);
        if (legendeAufSchmalSchliessen) legendeAufSchmalSchliessen();
      } else if (sidebar.classList.contains("collapsed")) {
        setzeSidebarCollapsed(false);
      }
    });

    // Klick auf leere Kartenfläche → Auswahl aufheben
    map.on("click", () => setActive(null));
  } catch (err) {
    console.error("Fehler beim Laden:", err);
    document.getElementById("entries-container").innerHTML =
      '<p style="padding:1em;color:#900">Fehler beim Laden der Daten.</p>';
  }
});

// ---- Data: Group features into companies ----
// buildCompanies, getCompanyCount: siehe js/daten.js

// ---- Markerstil je nach Verortungsgenauigkeit ----
// Straßen- und ortsteilgenaue Standorte bekommen einen gestrichelten Rand
// und blassere Füllung: die Karte soll nicht mehr Genauigkeit behaupten,
// als die Quelle hergibt.
function istUnsicher(verortung) {
  return verortung === "strassengenau" || verortung === "ungefaehr";
}

function markerGrundstil(m) {
  if (istUnsicher(m._verortung)) {
    return {
      fillColor: m._izColor,
      color: m._izColor,
      weight: 2,
      dashArray: "5 4",
      fillOpacity: 0.45,
    };
  }
  return {
    fillColor: m._izColor,
    color: "#fff",
    weight: 1.5,
    dashArray: null,
    fillOpacity: 0.85,
  };
}

// ---- Map: Create markers ----
function buildMarkers() {
  Object.values(companies).forEach((c) => {
    markerGroupByNr[c.nr] = [];

    c.locations.forEach((loc) => {
      if (!loc.geometry) return;

      const coords = loc.geometry.coordinates;
      const latlng = [coords[1], coords[0]];
      const izColor = farbeFuerZweig(c.industriezweig);
      const marker = L.circleMarker(latlng, { radius: MIN_RADIUS }).addTo(map);

      marker._companyNr = c.nr;
      marker._standortNr = loc.standortNr;
      marker._baseRadius = MIN_RADIUS;
      marker._izColor = izColor;
      marker._verortung = loc.verortung;
      marker.setStyle(markerGrundstil(marker));

      marker.bindPopup(() => makePopup(c, loc));

      marker.on("click", () => {
        setActive(c.nr);
      });

      marker.on("popupclose", () => {
        if (activeNr === c.nr) setActive(null);
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

// ---- Legende ----
// Ein Marker kodiert drei Dinge: Farbe die Branche, Größe die Zahl der
// Zwangsarbeiter, Rand die Verortungsgenauigkeit. Diese drei Erklärungen
// standen früher in zwei Kästen an gegenüberliegenden Ecken -- wer einen
// Punkt lesen wollte, schaute an zwei Stellen. Jetzt sind sie eine Legende
// unten links, aufklappbar über einen Knopf darunter.

const LEGENDE_ZUSTAND = "zwangsarbeit-wuppertal.legende-offen";

// Geschachtelte Kreise statt gestapelter: die kartographische Konvention für
// proportionale Symbole. Gezeigt werden drei Klassen, nicht alle sechs --
// mehr Beschriftungen passen nicht nebeneinander, weil die Radien der
// kleinen Stufen nur wenige Pixel auseinanderliegen. Die Zwischenstufen
// ergeben sich fürs Auge aus den drei gezeigten.
const GROESSEN_STUFEN = [
  { label: "> 500", r: 24 },
  { label: "51 – 100", r: 11 },
  { label: "1 – 10", r: 5 },
];

const SKALA_MIN_ABSTAND = 17;  // etwas mehr als die Zeilenhoehe der Beschriftung

function groessenSkala() {
  const max = GROESSEN_STUFEN[0].r;
  const hoehe = max * 2 + 6;
  let kreise = "";
  let beschriftung = "";
  let letzte = null;

  GROESSEN_STUFEN.forEach((s) => {
    const d = s.r * 2;
    kreise += `<span class="skala-kreis" style="width:${d}px;height:${d}px;left:${max - s.r}px;"></span>`;
    // Die Beschriftung sitzt auf Höhe des Kreisscheitels, rückt aber nach
    // unten aus, wenn sie sonst der vorigen zu nahe käme.
    let y = d - 5;
    if (letzte !== null && letzte - y < SKALA_MIN_ABSTAND) {
      y = letzte - SKALA_MIN_ABSTAND;
    }
    letzte = y;
    const strich = max - s.r + d + 5;
    beschriftung +=
      `<span class="skala-label" style="bottom:${Math.max(y, 0)}px;">` +
      `<span class="skala-strich" style="width:${strich}px;"></span>${s.label}</span>`;
  });

  return `<div class="skala" style="height:${hoehe}px;">${kreise}${beschriftung}</div>`;
}

function buildLegend() {
  const legend = L.control({ position: "bottomleft" });

  legend.onAdd = function () {
    const wrap = L.DomUtil.create("div", "legende-wrap");
    L.DomEvent.disableScrollPropagation(wrap);
    L.DomEvent.disableClickPropagation(wrap);

    const div = L.DomUtil.create("div", "legend-control legende-panel", wrap);
    div.innerHTML =
      `<h4>Zwangsarbeiter</h4>` +
      groessenSkala() +
      `<h4 class="legend-sub">Verortung</h4>` +
      `<div class="legend-row">` +
      `<span class="legend-circle legend-verortung-genau"></span><span>hausgenau</span></div>` +
      `<div class="legend-row">` +
      `<span class="legend-circle legend-verortung-unsicher"></span>` +
      `<span>nur straßen- oder ortsteilgenau</span></div>` +
      `<h4 class="legend-sub legend-industry-toggle" title="Ein-/ausklappen">` +
      `Branchen &#9662;</h4>`;

    const listDiv = L.DomUtil.create("div", "legend-industry-list", div);
    BRANCHEN_GRUPPEN.forEach((g) => {
      const row = document.createElement("div");
      row.className = "legend-row";
      row.title = g.zweige.join(", ");
      row.innerHTML =
        `<span class="legend-circle" style="width:12px;height:12px;background:${g.farbe};"></span>` +
        `<span>${g.name}</span>`;
      listDiv.appendChild(row);
    });

    const zweigToggle = div.querySelector(".legend-industry-toggle");
    zweigToggle.addEventListener("click", () => {
      const offen = listDiv.style.display !== "none";
      listDiv.style.display = offen ? "none" : "";
      zweigToggle.innerHTML = `Branchen ${offen ? "&#9656;" : "&#9662;"}`;
    });

    // Der Knopf sitzt unter der Legende, also dort, wo sie aufgeht -- ein
    // Umschalter gehört an die Stelle des Umgeschalteten. Er bleibt im
    // geöffneten Zustand sichtbar, damit der Weg zurück offensichtlich ist.
    const knopf = L.DomUtil.create("button", "legende-knopf", wrap);
    knopf.type = "button";
    knopf.textContent = "i";
    knopf.title = "Legende ein- oder ausblenden";
    knopf.setAttribute("aria-label", "Legende ein- oder ausblenden");
    knopf.setAttribute("aria-expanded", "true");

    function setzeZustand(offen) {
      div.style.display = offen ? "" : "none";
      knopf.setAttribute("aria-expanded", String(offen));
      knopf.classList.toggle("zu", !offen);
    }

    // Beim ersten Aufruf offen: wer die Karte zum ersten Mal sieht, hat
    // farbige Kreise verschiedener Größe vor sich, ein Drittel davon
    // gestrichelt -- ohne Legende ist das nicht lesbar. Wer sie wegklickt,
    // bekommt sie beim naechsten Besuch nicht wieder. Das gilt nur fuer breite
    // Schirme -- dort bleibt der Erstbesuch bewusst "offen" (siehe
    // style.css). Auf schmalen Schirmen wird die Legende zu einem Panel, das
    // die Karte beim Aufklappen ueberdeckt (wie das Quellenfenster); ein
    // ueberdeckendes Panel gleich beim Laden waere kein guter erster
    // Eindruck, deshalb startet es dort unabhaengig vom gespeicherten
    // Zustand geschlossen -- nur der kleine Info-Knopf ist zu sehen.
    let offen = true;
    try {
      offen = localStorage.getItem(LEGENDE_ZUSTAND) !== "zu";
    } catch (e) {
      // Privater Modus oder gesperrter Speicher: dann eben immer offen
    }
    if (window.matchMedia("(max-width: 760px)").matches) {
      offen = false;
    }
    setzeZustand(offen);

    knopf.addEventListener("click", () => {
      offen = !offen;
      setzeZustand(offen);
      // Auf schmalen Schirmen wird nichts gespeichert. Dort ist das Panel
      // ein Nachschlagewerk, das man aufklappt und gleich wieder schliesst
      // -- wuerde dieses Zuklappen in denselben Schluessel schreiben, faende
      // derselbe Mensch die Legende am Schreibtisch spaeter zugeklappt vor,
      // ohne sie dort je weggeklickt zu haben.
      if (window.matchMedia("(max-width: 760px)").matches) return;
      try {
        localStorage.setItem(LEGENDE_ZUSTAND, offen ? "offen" : "zu");
      } catch (e) {
        // ohne Speicher gilt die Entscheidung nur für diesen Besuch
      }
    });

    // Notausgang auf schmalen Schirmen: das Panel ueberdeckt dort ab y=110
    // alles, der Info-Knopf oben rechts war bisher der einzige Weg zurueck
    // (Fund aus der Abschlusspruefung). Escape und Klick auf den Hintergrund
    // schliessen zusaetzlich, wie beim Quellenfenster. disableClickPropagation
    // (oben) haelt Klicks innerhalb von wrap vom Dokument fern -- der
    // Dokument-Listener sieht deshalb nur Klicks ausserhalb.
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!window.matchMedia("(max-width: 760px)").matches) return;
      if (!offen) return;
      offen = false;
      setzeZustand(false);
    });

    document.addEventListener("click", (e) => {
      if (!window.matchMedia("(max-width: 760px)").matches) return;
      if (!offen) return;
      if (wrap.contains(e.target)) return;
      offen = false;
      setzeZustand(false);
    });

    // Fuer den Schwellenwechsel breit -> schmal (siehe DOMContentLoaded):
    // die Legende soll dabei nicht als bildschirmfuellendes Panel
    // stehenbleiben, sondern schliessen.
    legendeAufSchmalSchliessen = () => {
      offen = false;
      setzeZustand(false);
    };

    return wrap;
  };

  legend.addTo(map);
}

// ---- Klartext zur Verortungsgenauigkeit ----
const VERORTUNG_TEXT = {
  hausgenau: "Hausgenau verortet",
  strassengenau: "Nur straßengenau verortet — die Hausnummer ließ sich nicht auflösen",
  ungefaehr: "Nur ungefähr verortet",
};

function verortungsHinweis(loc, hatAdresse) {
  if (!loc || loc.verortung === "ohne" || !loc.geometry) {
    // Zwei verschiedene Gründe, kein Standort zu haben: gar keine Adresse
    // überliefert, oder eine, die sich heute nicht auflösen lässt.
    return hatAdresse
      ? "Adresse überliefert, heute nicht eindeutig zuzuordnen"
      : "Kein Standort bekannt";
  }
  // Wo ein Punkt über eine Nachbarhausnummer gesetzt wurde, sagt der pauschale
  // Text zu wenig: er verschweigt, worauf die Lage beruht und wie dünn der
  // Beleg ist. Ein Punkt aus fünf von fünf belegten Nummern eines Bereichs ist
  // etwas anderes als einer aus zwei von elf.
  return loc.verortungHinweis || VERORTUNG_TEXT[loc.verortung] || "";
}

// ---- Nachweis am Ende einer Aufzählung ----
// Jede aufgeklappte Liste endet mit ihrer Fundstelle: die Zählungen mit der
// Seite des Katalogeintrags, die Rüstungsproduktion mit der Seite aus
// Abschnitt 18.2. Beide stammen aus demselben Band, aber nicht von derselben
// Seite -- deshalb trägt jede Liste ihren eigenen Nachweis.
function beleg(seite) {
  if (!seite) return `<div class="block-beleg">Speer (2003)</div>`;
  return `<div class="block-beleg">Speer (2003), S.&nbsp;${seite}</div>`;
}

// ---- Eine Zählung als Text ----
// Das frühere "50 ges. + 49 M + 1 F" las sich wie eine Summe aus drei
// Zahlen. Die Gesamtzahl führt jetzt, die Aufteilung folgt als Nebensatz.
function formatRecord(r) {
  const kopf = `${r.datum || "ohne Datum"}${r.art ? " · " + r.art : ""}`;
  // Nur wenn gar keine Zahl überliefert ist, bleibt es beim Kopf. Fehlt allein
  // die Gesamtzahl, führt die Teilangabe -- sonst verschwänden überlieferte
  // Menschen aus der Anzeige (Nr. 363a: zwei Italiener ohne Gesamtzahl).
  if (r.gesamt == null && r.m == null && r.w == null) {
    return `<div class="record-row"><span class="rec-date">${kopf}</span></div>`;
  }
  let zahlen;
  if (r.gesamt == null) {
    const teile = [];
    if (r.m != null) teile.push(`${r.m} männlich`);
    if (r.w != null) teile.push(`${r.w} weiblich`);
    zahlen = `<strong>${teile.join(", ")}</strong> · Gesamtzahl nicht überliefert`;
  } else {
    let auf;
    if (r.m != null && r.w != null) {
      auf = `davon ${r.m} männlich, ${r.w} weiblich`;
    } else if (r.m != null) {
      auf = `davon ${r.m} männlich`;
    } else if (r.w != null) {
      auf = `davon ${r.w} weiblich`;
    } else {
      auf = "Aufteilung nicht überliefert";
    }
    zahlen = `<strong>${r.gesamt}</strong> · ${auf}`;
  }
  return `<div class="record-row">
      <span class="rec-date">${kopf}</span>
      <span class="rec-zahlen">${zahlen}</span>
    </div>`;
}

// ---- Popup content ----
function makePopup(company, location) {
  const c = company;
  let html = `<div class="popup-content">`;
  html += `<div class="popup-name">${c.name}</div>`;

  html += `<div class="popup-meta">${location.adresse || ""}, ${location.ort || ""}`;
  if (c.industriezweig) html += ` · ${gruppeFuerZweig(c.industriezweig).name}`;
  html += `</div>`;

  // Aktuelle ZA-Zahl zum gewählten Stichtag
  const count = getCompanyCount(c, currentDate);
  if (currentDate && count > 0) {
    html += `<div class="popup-current-count">`;
    html += `<strong>${count}</strong> Zwangsarbeiter am ${formatDateDE(currentDate)}`;
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
    headerHtml += `<span class="card-name">${c.name}</span>`;
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
            ? "existiert nicht mehr"
            : "unbekannt";
      headerHtml += `<span class="badge ${cls}">${label}</span>`;
    }
    headerHtml += `</div>`;

    // Der Verortungshinweis gehört unter die Adresse, auf die er sich bezieht.
    // Die Genauigkeit ist eine Eigenschaft des einzelnen Standorts: fünf der elf
    // Unternehmen mit mehreren Adressen haben je Standort eine andere Stufe.
    let metaHtml = `<div class="card-meta">`;
    let ersteZeile = true;
    c.locations.forEach((loc) => {
      const zeilen = [];
      if (loc.adresse) {
        let adressZeile = `${loc.adresse}, ${loc.ort || ""}`;
        if (loc.standortNr > 1) adressZeile += ` <small>(Standort ${loc.standortNr})</small>`;
        zeilen.push(adressZeile);
        if (loc.adresseHeute) {
          zeilen.push(`<span class="adresse-heute">Heute: ${loc.adresseHeute}</span>`);
        }
      }
      const hinweis = verortungsHinweis(loc, !!loc.adresse);
      if (hinweis) {
        const unsicher = loc.verortung !== "hausgenau";
        zeilen.push(
          `<span class="verortung-hinweis${unsicher ? " unsicher" : ""}">${hinweis}</span>`
        );
      }
      if (zeilen.length === 0) return;
      if (!ersteZeile) metaHtml += `<br>`;
      metaHtml += zeilen.join(`<br>`);
      ersteZeile = false;
    });
    // Gruppe immer nennen, Einzelzweig nur wenn er etwas hinzufügt:
    // "xxx" und "unbekannt" sind Leerstellen und werden nicht ausgeschrieben.
    const g = gruppeFuerZweig(c.industriezweig);
    const zweigZeigen =
      c.industriezweig &&
      c.industriezweig !== g.name &&
      !OHNE_ANGABE_ZWEIGE.includes(c.industriezweig);
    metaHtml += `<br><span class="branche">
      <span class="branche-punkt" style="background:${g.farbe}"></span>
      ${g.name}${zweigZeigen ? `<span class="branche-zweig"> · ${c.industriezweig}</span>` : ""}
    </span>`;
    metaHtml += `</div>`;

    // Die Zählungen klappen auf: bei bis zu 24 Stichtagen je Unternehmen
    // wäre die Liste sonst länger als alles andere auf der Karte zusammen.
    // Die Zahl zum gewählten Stichtag bleibt darüber immer sichtbar.
    let recordsHtml = "";
    if (c.records.length > 0) {
      const n = c.records.length;
      recordsHtml =
        `<div class="card-block">` +
        `<button class="block-toggle" aria-expanded="false">` +
        `<span class="block-pfeil">&#9656;</span> Zwangsarbeiter ` +
        `<span class="block-anzahl">${n} ${n === 1 ? "Zählung" : "Zählungen"}</span>` +
        `</button>` +
        `<div class="block-inhalt card-records">` +
        c.records.map(formatRecord).join("") +
        beleg(c.speerSeite) +
        `</div></div>`;
    }

    // Nachgewiesene Rüstungsproduktion aus Speers Abschnitt 18.2
    let ruestungHtml = "";
    const rg = c.ruestungsgueter || [];
    if (rg.length > 0) {
      ruestungHtml =
        `<div class="card-block">` +
        `<button class="block-toggle" aria-expanded="false">` +
        `<span class="block-pfeil">&#9656;</span> Nachgewiesene Rüstungsproduktion` +
        `</button>` +
        `<div class="block-inhalt">` +
        rg.map((e) => `<div class="ruestung-zeile">${e.produkt || ""}${
          e.quelle ? `<span class="ruestung-quelle">${e.quelle}</span>` : ""
        }</div>`).join("") +
        beleg(rg[0].seite) +
        `</div></div>`;
    }

    // Current ZA count (updated by updateSidebarCounts)
    const countHtml = `<div class="card-current-count" id="count-${c.nr}"></div>`;

    // Auslöser für das Quellenfenster — der Quellentext bekommt Platz
    // über der Karte statt in der 35 %-Spalte
    let speerHtml = "";
    if (c.speerText) {
      speerHtml = `<div class="card-speer">
        <button class="quellen-btn" data-nr="${c.nr}">&rarr; Quellen nach Speer (2003)</button>
      </div>`;
    }

    card.innerHTML = headerHtml + metaHtml + countHtml + recordsHtml + ruestungHtml + speerHtml;

    // Aufklappen, ohne das Unternehmen auszuwählen oder die Karte springen zu lassen
    card.querySelectorAll(".block-toggle").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const offen = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!offen));
        btn.nextElementSibling.classList.toggle("offen", !offen);
        btn.querySelector(".block-pfeil").innerHTML = offen ? "&#9656;" : "&#9662;";
      });
    });

    const quellenBtn = card.querySelector(".quellen-btn");
    if (quellenBtn) {
      quellenBtn.addEventListener("click", (e) => {
        e.stopPropagation();          // Kartenklick soll nicht mitfeuern
        oeffneQuellenfenster(c.nr, quellenBtn);
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
  // Text kann umbrechen -- Griffleiste an neue Header-Hoehe anpassen.
  setzeGriffhoehe();
}

// ---- Interaction: setActive ----
function setActive(nr) {
  // Vorherige Karte deaktivieren
  if (activeNr) {
    const prevCard = document.getElementById(`entry-${activeNr}`);
    if (prevCard) prevCard.classList.remove("active");
  }

  activeNr = nr;

  // Sidebar-Container bekommt Klasse für CSS-Ausgrauen aller anderen Karten
  const container = document.getElementById("entries-container");
  if (nr) {
    container.classList.add("has-active");
    const card = document.getElementById(`entry-${nr}`);
    if (card) {
      card.classList.add("active");
      container.scrollTop = card.offsetTop - container.offsetTop;
    }
  } else {
    container.classList.remove("has-active");
  }

  // Marker: aktive hervorheben, alle anderen ausgrauen
  dimInactiveMarkers();
}

// ---- Marker ausgrauen wenn ein Unternehmen aktiv ist ----
function dimInactiveMarkers() {
  Object.values(companies).forEach((c) => {
    const markers = markerGroupByNr[c.nr];
    if (!markers) return;

    if (!activeNr) {
      // Kein aktives Unternehmen: alle Marker im Grundstil
      markers.forEach((m) => m.setStyle(markerGrundstil(m)));
    } else if (c.nr === activeNr) {
      // Aktives Unternehmen (auch Mehrfach-Standorte): hervorheben
      markers.forEach((m) => {
        m.setStyle(Object.assign(markerGrundstil(m), {
          radius: m._baseRadius + 3,
          weight: 3,
          fillOpacity: istUnsicher(m._verortung) ? 0.6 : 1.0,
        }));
        m.bringToFront();
      });
    } else {
      // Alle anderen: stark ausgrauen
      markers.forEach((m) => {
        m.setStyle(Object.assign(markerGrundstil(m), {
          fillOpacity: 0.12,
          weight: 0.5,
          color: "#ccc",
        }));
      });
    }
  });
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

/// ---- Interaction: hover highlight ----
function highlightMarkers(nr, on) {
  if (nr === activeNr) return;
  if (!markerGroupByNr[nr]) return;

  markerGroupByNr[nr].forEach((m) => {
    if (on) {
      m.setStyle(Object.assign(markerGrundstil(m), {
        radius: m._baseRadius + 2,
        weight: 2.5,
      }));
      m.bringToFront();
    } else if (activeNr) {
      // Zustand wiederherstellen: ausgegraut (wenn anderes aktiv) oder normal
      m.setStyle(Object.assign(markerGrundstil(m), {
        fillOpacity: 0.12,
        weight: 0.5,
        color: "#ccc",
      }));
    } else {
      m.setStyle(Object.assign(markerGrundstil(m), { radius: m._baseRadius }));
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
  }
}

// ---- Sidebar Toggle ----
function initSidebarToggle() {
  const btn = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");
  const header = document.getElementById("sidebar-header");
  const griff = document.getElementById("griff-anfasser");
  const schmalSchirm = window.matchMedia("(max-width: 760px)");

  btn.addEventListener("click", () => {
    setzeSidebarCollapsed(!sidebar.classList.contains("collapsed"));
  });

  // Auf schmalen Schirmen klappt die Griffleiste das Bodenblatt; von Maus-,
  // Tastatur- und Screenreader-Bedienung gemeinsam genutzt.
  function toggleBlatt() {
    setzeSidebarCollapsed(!sidebar.classList.contains("collapsed"));
  }

  // Der Header ist auf schmalen Schirmen die Griffleiste. Klicks auf den
  // Filterknopf oder den Anfasser darin gehoeren nicht diesem Handler --
  // der Anfasser hat seinen eigenen (naechster Block), der Filterknopf
  // seine eigene Aufgabe (siehe initFilters).
  header.addEventListener("click", (e) => {
    if (e.target.closest("#filter-toggle") || e.target.closest("#griff-anfasser")) return;
    if (!schmalSchirm.matches) return;
    toggleBlatt();
  });

  // Anfasser: echter <button> statt role="button" auf dem ganzen Header --
  // der Header enthaelt bereits den echten #filter-toggle-Button, ein
  // role="button" auf dem Header selbst waere button > button im
  // Barrierebaum (Fund aus der Abschlusspruefung). Der Tipp auf die Flaeche
  // des Headers schaltet weiterhin um (Handler oben), braucht dafuer aber
  // keine eigene Rolle. Als echter Button ist der Anfasser ohne weiteres
  // Zutun per Tastatur bedienbar (Enter/Leertaste, Tab-Reihenfolge) und wird
  // von Screenreadern als Knopf mit aria-label angesagt; aria-expanded
  // pflegt setzeSidebarCollapsed() bei jedem Zustandswechsel mit.
  if (griff) {
    griff.addEventListener("click", (e) => {
      e.stopPropagation(); // sonst toggelt zusaetzlich der Header-Handler zurueck
      toggleBlatt();
    });
  }

  // Der Anfasser ist nur auf schmalen Schirmen sichtbar -- oberhalb der
  // Schwelle ist der Header ein gewoehnlicher, nicht interaktiver Bereich
  // um den echten Filter-Knopf herum, und #sidebar-toggle ist dort der
  // Umschalter.
  function aktualisiereGriffAnfasser() {
    if (griff) griff.hidden = !schmalSchirm.matches;
  }
  aktualisiereGriffAnfasser();
  schmalSchirm.addEventListener("change", aktualisiereGriffAnfasser);
}


// ---- Filters ----
function initFilters() {
  const toggleBtn = document.getElementById("filter-toggle");
  const panel = document.getElementById("filter-panel");
  const resetBtn = document.getElementById("filter-reset");

  // Toggle filter panel
  toggleBtn.addEventListener("click", () => {
    // Auf schmalen Schirmen liegt #filter-panel bei geschlossenem Blatt
    // ausserhalb der sichtbaren Griffleiste -- ein Verlust von "hidden"
    // aendert dann sichtbar nichts (Fund aus der Abschlusspruefung). Der
    // Klick-Handler des Headers nimmt den Filterknopf bewusst vom
    // Blatt-Umschalten aus (siehe initSidebarToggle); das Oeffnen hier ist
    // deshalb der einzige Weg von "Blatt zu" zu "Filter sichtbar". Nur
    // oeffnen, nie schliessen -- ein zweiter Tipp soll weiterhin nur das
    // Filterpanel selbst zuklappen, nicht auch das Blatt.
    if (
      window.matchMedia("(max-width: 760px)").matches &&
      document.getElementById("sidebar").classList.contains("collapsed")
    ) {
      setzeSidebarCollapsed(false);
    }
    panel.classList.toggle("hidden");
    toggleBtn.classList.toggle("active");
  });

  // Populate dropdown filters from meta.json
  populateDropdown("dd-industriezweig", industriezweigOptionen(meta.industriezweige || []),
    "industriezweig");
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

// Die beiden Leerstellen der Quelle werden zu einem Eintrag "ohne Angabe"
// zusammengezogen; die übrigen 27 Zweige bleiben einzeln wählbar.
function industriezweigOptionen(werte) {
  const optionen = werte
    .filter((v) => !OHNE_ANGABE_ZWEIGE.includes(v))
    .map((v) => ({ wert: v, text: v }));
  if (werte.some((v) => OHNE_ANGABE_ZWEIGE.includes(v))) {
    optionen.push({ wert: OHNE_ANGABE_WERT, text: OHNE_ANGABE_TEXT });
  }
  return optionen;
}

function populateDropdown(listId, values, filterKey) {
  const list = document.getElementById(listId);
  list.innerHTML = "";

  // Strings und {wert, text}-Paare sind gleichermaßen erlaubt
  const optionen = values.map((v) => (typeof v === "string" ? { wert: v, text: v } : v));
  dropdownBeschriftungen[filterKey] = {};

  optionen.forEach((opt) => {
    dropdownBeschriftungen[filterKey][opt.wert] = opt.text;
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = opt.wert;
    cb.addEventListener("change", () => {
      if (cb.checked) {
        filters[filterKey].push(opt.wert);
      } else {
        filters[filterKey] = filters[filterKey].filter((v) => v !== opt.wert);
      }
      updateDropdownLabel(listId, filterKey);
      applyFilters();
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(opt.text));
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
    const beschriftung = dropdownBeschriftungen[filterKey] || {};
    btn.textContent = (beschriftung[selected[0]] || selected[0]) + " ";
  } else {
    btn.textContent = `${selected.length} ausgewählt `;
  }
  btn.appendChild(arrow);
}

function companyMatchesFilters(company) {
  // Industriezweig — "ohne Angabe" deckt "xxx", "unbekannt" und fehlende Werte ab
  if (filters.industriezweig.length > 0) {
    const zweig = company.industriezweig;
    const ohneAngabe = !zweig || OHNE_ANGABE_ZWEIGE.includes(zweig);
    const trifft = ohneAngabe
      ? filters.industriezweig.includes(OHNE_ANGABE_WERT)
      : filters.industriezweig.includes(zweig);
    if (!trifft) return false;
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
  // Ausgrauen-Zustand aufrechterhalten
  dimInactiveMarkers();

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
      // Text kann umbrechen -- Griffleiste an neue Header-Hoehe anpassen.
      setzeGriffhoehe();
    } else {
      updateCounter();
    }
  }
}

/* =========================================================
   Quellenfenster
   Der Quellentext ist zu umfangreich für die Seitenleiste --
   er bekommt ein eigenes Fenster über der Karte.
   ========================================================= */

let quellenAusloeser = null;

function oeffneQuellenfenster(nr, ausloeser) {
  const c = companies[nr];
  if (!c || !c.speerText) return;

  document.getElementById("quellen-titel").textContent = c.name;

  const beleg = c.speerSeite
    ? `Speer 2003, Nr. ${nr}, S. ${c.speerSeite}`
    : `Speer 2003, Nr. ${nr}`;
  document.getElementById("quellen-beleg").textContent = beleg;

  // textContent statt innerHTML: der Quellentext ist unbereinigt
  const textEl = document.getElementById("quellen-text");
  textEl.textContent = c.speerText;
  textEl.scrollTop = 0;

  const overlay = document.getElementById("quellen-overlay");
  overlay.hidden = false;

  quellenAusloeser = ausloeser || null;
  document.getElementById("quellen-schliessen").focus();
}

function schliesseQuellenfenster() {
  const overlay = document.getElementById("quellen-overlay");
  if (overlay.hidden) return;
  overlay.hidden = true;
  if (quellenAusloeser) {
    quellenAusloeser.focus();
    quellenAusloeser = null;
  }
}

function initQuellenfenster() {
  const overlay = document.getElementById("quellen-overlay");
  const dialog = overlay.querySelector(".quellen-dialog");

  document
    .getElementById("quellen-schliessen")
    .addEventListener("click", schliesseQuellenfenster);

  // Klick auf den abgedunkelten Hintergrund, nicht auf den Dialog selbst
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) schliesseQuellenfenster();
  });

  document.addEventListener("keydown", (e) => {
    if (overlay.hidden) return;

    if (e.key === "Escape") {
      schliesseQuellenfenster();
      return;
    }

    // Fokus im Fenster halten. aria-modal verspricht Modalität, die der
    // Browser von sich aus nicht herstellt: ohne diese Umlenkung springt
    // Tab hinter das Fenster auf verdeckte Schaltflächen der Sidebar.
    if (e.key !== "Tab") return;
    const fokussierbar = dialog.querySelectorAll(
      'button, [href], [tabindex]:not([tabindex="-1"])'
    );
    if (fokussierbar.length === 0) return;
    const erstes = fokussierbar[0];
    const letztes = fokussierbar[fokussierbar.length - 1];

    if (e.shiftKey && document.activeElement === erstes) {
      e.preventDefault();
      letztes.focus();
    } else if (!e.shiftKey && document.activeElement === letztes) {
      e.preventDefault();
      erstes.focus();
    }
  });
}
