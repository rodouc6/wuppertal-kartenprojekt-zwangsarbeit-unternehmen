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
  suche: "",                 // normalisierter Suchtext, siehe normalisiere()
};
let visibleNrs = new Set();  // currently visible company nrs after filtering

/* Zaehlweise des Zeitreglers: "fortgeschrieben" (Voreinstellung, bisheriges
   Verhalten) oder "stichtag". Ausgewertet in getCompanyCount() in
   js/daten.js, das diese Variable wie `filters` global liest. */
let zaehlmodus = "fortgeschrieben";

// ---- Constants ----
// MIN_RADIUS, RADIUS_STEPS, RADIUS_MAX, radiusForCount, MONTH_NAMES,
// formatDateDE, OHNE_ANGABE_ZWEIGE: siehe js/daten.js

/* Dieselbe Schwelle wie im Abschnitt "SCHMALE SCHIRME" von style.css.
   Gilt fuer neu hinzugekommenen Code; die uebrigen matchMedia-Aufrufe in
   dieser Datei bleiben, wie sie sind. */
const SCHMALE_SCHIRM_ABFRAGE = window.matchMedia("(max-width: 760px)");

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
    baueSuchindex();
    buildMarkers();
    buildList();

    // Auf schmalen Schirmen faehrt die Liste als Bodenblatt ein und startet
    // geschlossen -- sonst verdeckt sie beim Laden die ganze Karte.
    if (window.matchMedia("(max-width: 760px)").matches) {
      setzeSidebarCollapsed(true);
    }

    updateCounter();
    initTimeline();
    initZaehlmodus();
    initFilters();
    initSuche();
    buildLegend();
    initSidebarToggle();
    initBlattZiehen();
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
  /* Im Stichtag-Modus hat die Mehrzahl der Betriebe an einem beliebigen Tag
     keine Meldung. Sie bleiben als Mindestpunkt stehen -- der Standort ist
     ja bekannt --, werden aber blasser gezeichnet, damit "an diesem Tag
     nichts ueberliefert" nicht wie "hier waren wenige" aussieht. */
  const ohneMeldung = zaehlmodus === "stichtag" && !m._count;

  if (istUnsicher(m._verortung)) {
    return {
      fillColor: m._izColor,
      color: m._izColor,
      weight: 2,
      dashArray: "5 4",
      fillOpacity: ohneMeldung ? 0.15 : 0.45,
      // Der gestrichelte Rand traegt hier die Branchenfarbe. Bliebe er voll
      // deckend, fielen die unsicher verorteten Standorte ohne Meldung mehr
      // auf als die sicher verorteten mit -- deshalb auch er zurueckgenommen.
      opacity: ohneMeldung ? 0.35 : 1,
    };
  }
  return {
    fillColor: m._izColor,
    color: ohneMeldung ? "#d4d4d2" : "#fff",
    weight: 1.5,
    dashArray: null,
    fillOpacity: ohneMeldung ? 0.3 : 0.85,
    opacity: 1,
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

      // Ein Tipp auf den Popup-Inhalt oeffnet auf schmalen Schirmen das
      // Bodenblatt (siehe oeffneBlattFuerEintrag). Der Inhalt wird bei
      // jedem Oeffnen neu erzeugt (makePopup ist eine Funktion, siehe
      // bindPopup oben), der Listener deshalb bei jedem "popupopen" neu
      // gesetzt statt einmalig.
      marker.on("popupopen", (e) => {
        const el = e.popup.getElement();
        const inhalt = el && el.querySelector(".popup-content");
        if (!inhalt) return;
        inhalt.addEventListener("click", (ev) => {
          // Dieselbe closest()-Pruefung wie beim Filterknopf: eigene Ziele
          // im Popup (z. B. ein Quellen-Knopf) behalten ihre eigene
          // Aufgabe, statt stattdessen das Blatt zu oeffnen.
          if (ev.target.closest(".quellen-btn")) return;
          oeffneBlattFuerEintrag(c.nr);
        });
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

/* Bei gesetztem Geschlechterfilter zaehlt die Zahl nur Frauen oder nur
   Maenner -- "20 Zwangsarbeiter" waere dann schlicht falsch. Ohne Filter
   bleibt es beim bisherigen Wort. */
function personenWort() {
  if (filters.geschlecht === "w") return "Zwangsarbeiterinnen";
  return "Zwangsarbeiter";
}

/* Die Zeile "N Zwangsarbeiter am/Stand <Datum>", wie sie in der Seitenleiste
   und im Kartenpopup steht. Das genannte Datum ist das der zugrundeliegenden
   Meldung, nicht das des Reglers: im fortgeschriebenen Modus liegt es fast
   immer davor, und genau das soll sichtbar sein. Frueher stand an beiden
   Stellen das Reglerdatum -- "50 Zwangsarbeiter am 28.2.1945", obwohl der
   Wert vom 13.8.1942 stammte. */
function zaehlzeile(company) {
  const { count, stand } = getCompanyCountMitStand(company, currentDate);
  if (count === 0) return null;
  const datum = formatDateDE(stand || currentDate);
  return {
    count,
    text: zaehlmodus === "stichtag"
      ? `${personenWort()} am ${datum}`
      : `${personenWort()} — Stand ${datum}`,
  };
}

// ---- Zahl je Eintrag in der Seitenleiste ----
function updateSidebarCounts() {
  if (!currentDate) return;
  Object.values(companies).forEach((c) => {
    const el = document.getElementById(`count-${c.nr}`);
    if (!el) return;
    const zeile = zaehlzeile(c);
    el.textContent = zeile ? `${zeile.count} ${zeile.text}` : "";
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
  aktualisiereMeldezahl();

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

/* Der Umschalter aendert nur die Zaehlung -- Filter, Auswahl und
   Kartenausschnitt bleiben, wie sie sind. applyFilters() setzt Radien,
   Seitenleiste und Ausgrauen in einem Zug neu. */
function initZaehlmodus() {
  const gruppe = document.getElementById("timeline-mode");
  if (!gruppe) return;

  gruppe.querySelectorAll("button[data-modus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const gewaehlt = btn.dataset.modus;
      if (gewaehlt === zaehlmodus) return;
      zaehlmodus = gewaehlt;
      gruppe.querySelectorAll("button[data-modus]").forEach((b) => {
        b.setAttribute("aria-pressed", String(b.dataset.modus === zaehlmodus));
      });
      applyFilters();
    });
  });
}

/* Im Stichtag-Modus steht neben dem Datum, was an ihm ueberliefert ist.
   Ohne die zweite Zahl saehe der 5.7.1944 -- 56 Meldungen, keine mit Ziffer
   -- nach einem Anzeigefehler aus. Im fortgeschriebenen Modus erklaert die
   Angabe nichts und entfaellt.
   Die Zahlen stammen aus meta.json und sind ungefiltert: sie beschreiben die
   Quellenlage, nicht die getroffene Auswahl. */
function aktualisiereMeldezahl() {
  const el = document.getElementById("timeline-meldungen");
  if (!el) return;

  const alle = (meta.meldungenJeStichtag || [])[currentDateIdx];
  const mitZahl = (meta.meldungenMitZahlJeStichtag || [])[currentDateIdx];

  if (zaehlmodus !== "stichtag" || alle === undefined) {
    el.textContent = "";
    el.hidden = true;
    return;
  }

  const wort = alle === 1 ? "Meldung" : "Meldungen";
  el.hidden = false;
  el.textContent = SCHMALE_SCHIRM_ABFRAGE.matches
    ? `${alle} ${wort}`
    : `${alle} ${wort}, davon ${mitZahl} mit Zahl`;
}

/* Beim Drehen des Geraets wechselt der Text zwischen Kurz- und Langfassung.
   Eigener Zuhoerer, damit der bestehende (er verwaltet den Blatt-Zustand)
   unangetastet bleibt. */
SCHMALE_SCHIRM_ABFRAGE.addEventListener("change", aktualisiereMeldezahl);

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

  // Zahl zum gewählten Stichtag -- dieselbe Zeile wie in der Seitenleiste
  const zeile = currentDate ? zaehlzeile(c) : null;
  if (zeile) {
    html += `<div class="popup-current-count">`;
    html += `<strong>${zeile.count}</strong> ${zeile.text}`;
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

// ---- Tipp auf das Popup: Blatt oeffnen, Eintrag zeigen ----
// Der Marker-Tipp allein oeffnet nur das Popup -- der Zugang bleibt
// zweistufig, siehe Fachauftrag ("Beim Antippen eines Markers"). Ein Tipp
// auf das Popup selbst ist der zweite Schritt. setzeSidebarCollapsed(false)
// kennt das Scrollen zur aktiven Karte bereits (siehe dort) -- es wird hier
// wiederverwendet statt nachgebaut, activeNr muss davor per setActive
// gesetzt sein, damit dieser Scroll den richtigen Eintrag trifft. Oberhalb
// der Schwelle gibt es kein Blatt; dort bleibt ein Tipp auf das Popup ohne
// Wirkung.
function oeffneBlattFuerEintrag(nr) {
  if (!window.matchMedia("(max-width: 760px)").matches) return;
  setActive(nr);
  setzeSidebarCollapsed(false);
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

// ---- Bodenblatt: Ziehen an der Griffleiste ----
// Ein Blatt, das aussieht wie ziehbar, muss ziehbar sein -- die Pruefung am
// Geraet hat gezeigt, dass Tippen allein nicht reicht (siehe Fachauftrag,
// "Die Seitenleiste wird ein Bodenblatt"). Pointer-Events statt getrennter
// Maus-/Touch-Pfade: ein Satz Ereignisse deckt Finger, Stift und Maus
// gleichermassen ab. Gezogen wird ausschliesslich an der Griffleiste
// (#sidebar-header), niemals am Listeninhalt -- sonst geraet die Geste mit
// dem Scrollen der Liste in Streit. Tippen bleibt unangetastet: unterhalb
// der Bewegungsschwelle greift dieser Code gar nicht erst ein, der
// bestehende click-Handler (initSidebarToggle) schaltet wie bisher um.
const ZIEHEN_TIPP_SCHWELLE_PX = 6;           // darunter zaehlt es als Tipp, nicht als Zug
const ZIEHEN_ANTEIL_SCHWELLE = 0.25;         // Anteil der Blatthoehe, ab dem umgeschaltet wird
const ZIEHEN_GESCHWINDIGKEIT_SCHWELLE = 0.5; // px/ms -- ein schneller Wisch schaltet auch bei kurzer Strecke um

function initBlattZiehen() {
  const header = document.getElementById("sidebar-header");
  const sidebar = document.getElementById("sidebar");
  const schmalSchirm = window.matchMedia("(max-width: 760px)");

  let ziehtGerade = false;  // Pointer ist unten, wartet auf Bewegung oder Loslassen
  let bewegt = false;       // Bewegungsschwelle ueberschritten -- echter Zug statt Tipp
  let startY = 0;
  let startCollapsed = false;
  let startOffset = 0;      // Versatz (px) beim Start des Zugs
  let letzterOffset = 0;
  let verlauf = [];         // {t, y} der juengsten Bewegungen, fuer die Geschwindigkeit
  let aktiverPointerId = null; // welcher Zeiger zieht gerade -- andere werden ignoriert
  let ghostKlickErwartet = false; // von echtem Zug gesetzter Merker, vom Klick-Handler konsumiert

  // Blatthoehe und Griffhoehe frisch messen statt zu cachen -- beide koennen
  // sich aendern (Drehen des Geraets, umbrechende Trefferzahl im Header).
  function grenzen() {
    const blattHoehe = sidebar.getBoundingClientRect().height;
    const griffHoehe = header.offsetHeight;
    return { offen: 0, zu: Math.max(blattHoehe - griffHoehe, 0), blattHoehe };
  }

  // Nach einem echten Zug (mit spuerbarer Bewegung) feuert Chromium auf
  // Touch-Geraeten in aller Regel gar kein "click" mehr -- die Bewegung
  // allein reicht dem Browser schon, um die Geste als Wisch statt Tipp
  // einzuordnen. Verlassen kann man sich darauf aber nicht (andere Engines,
  // Grenzfaelle): bleibt es doch ein Nachzuegler, darf er den gerade
  // getroffenen Entschluss nicht nochmal umschalten.
  //
  // Kein Zeitfenster dafuer: ein fruehrer Entwurf haengte nach jedem Zug
  // einen Klick-Abfaenger mit 400ms-Rueckfall an. Das machte die Griffleiste
  // fuer den vollen Zeitraum taub -- auch nach einem kurzen Zug unter der
  // Umschalt-Schwelle, der zurueckspringt, ohne dass ueberhaupt ein
  // Nachzuegler-Klick zu erwarten waere. Stattdessen ein Merker, den dieser
  // (einmalig registrierte, dauerhafte) Klick-Handler selbst konsumiert:
  // beim naechsten Pointerdown zurueckgesetzt, bei jedem echten Zug gesetzt,
  // hier abgefragt und sofort geloescht. So verschluckt er genau einen
  // Klick, wenn nach einem Zug tatsaechlich einer kommt, und blockiert
  // nichts, wenn keiner kommt.
  header.addEventListener(
    "click",
    (e) => {
      if (!ghostKlickErwartet) return;
      ghostKlickErwartet = false;
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );

  header.addEventListener("pointerdown", (e) => {
    if (!schmalSchirm.matches || ziehtGerade) return;
    if (e.target.closest("#filter-toggle")) return; // eigene Aufgabe, kein Ziehen

    ziehtGerade = true;
    bewegt = false;
    aktiverPointerId = e.pointerId;
    ghostKlickErwartet = false;
    startY = e.clientY;
    startCollapsed = sidebar.classList.contains("collapsed");
    const g = grenzen();
    startOffset = startCollapsed ? g.zu : g.offen;
    letzterOffset = startOffset;
    verlauf = [{ t: e.timeStamp, y: e.clientY }];

    header.setPointerCapture(e.pointerId);
  });

  header.addEventListener("pointermove", (e) => {
    if (!ziehtGerade || e.pointerId !== aktiverPointerId) return;
    const deltaY = e.clientY - startY;

    if (!bewegt) {
      if (Math.abs(deltaY) < ZIEHEN_TIPP_SCHWELLE_PX) return;
      bewegt = true;
      ghostKlickErwartet = true;
      // Waehrend des Zugs darf die transition nicht mitlaufen, sonst hinkt
      // das Blatt dem Finger hinterher (siehe #sidebar.ziehend in style.css).
      sidebar.classList.add("ziehend");
    }

    const g = grenzen();
    letzterOffset = Math.min(g.zu, Math.max(g.offen, startOffset + deltaY));
    sidebar.style.transform = `translateY(${letzterOffset}px)`;

    verlauf.push({ t: e.timeStamp, y: e.clientY });
    if (verlauf.length > 6) verlauf.shift();

    e.preventDefault();
  });

  function ziehenBeenden(e) {
    if (!ziehtGerade || e.pointerId !== aktiverPointerId) return;
    ziehtGerade = false;
    aktiverPointerId = null;
    try {
      header.releasePointerCapture(e.pointerId);
    } catch (err) {
      // Capture kann bei pointercancel schon weg sein -- unerheblich
    }

    if (!bewegt) return; // Tipp: der bestehende click-Handler uebernimmt

    const g = grenzen();
    const strecke = letzterOffset - startOffset;
    const anteil = g.blattHoehe > 0 ? Math.abs(strecke) / g.blattHoehe : 0;

    // Geschwindigkeit ueber die letzten paar Bewegungen, nicht ueber den
    // ganzen Zug -- ein Zug, der langsam beginnt und am Ende zum Wisch wird,
    // soll als Wisch zaehlen.
    let geschwindigkeit = 0;
    if (verlauf.length >= 2) {
      const erst = verlauf[0];
      const letzt = verlauf[verlauf.length - 1];
      const dt = letzt.t - erst.t;
      if (dt > 0) geschwindigkeit = (letzt.y - erst.y) / dt;
    }

    // Richtung entscheidet, ob auf- oder zugeklappt wird: nach unten
    // schliesst, nach oben oeffnet. Strecke oder Geschwindigkeit entscheiden
    // nur, OB ueberhaupt umgeschaltet wird -- bleiben beide unter ihrer
    // Schwelle, springt das Blatt in den Ausgangszustand zurueck.
    let neuCollapsed = startCollapsed;
    if (Math.abs(geschwindigkeit) >= ZIEHEN_GESCHWINDIGKEIT_SCHWELLE) {
      neuCollapsed = geschwindigkeit > 0;
    } else if (anteil >= ZIEHEN_ANTEIL_SCHWELLE) {
      neuCollapsed = strecke > 0;
    }

    sidebar.classList.remove("ziehend");
    sidebar.style.transform = "";
    setzeSidebarCollapsed(neuCollapsed);
  }

  header.addEventListener("pointerup", ziehenBeenden);
  header.addEventListener("pointercancel", ziehenBeenden);
}

// ---- Filters ----
/* auchSuche=false leert nur die Filter und laesst den Suchbegriff stehen --
   so kann die Leermeldung "Ohne die gesetzten Filter waeren es 6" anbieten,
   ohne die Eingabe wegzunehmen, die dorthin gefuehrt hat.
   Steht ausserhalb von initFilters(), weil die Leermeldung sie braucht;
   deshalb hier document.getElementById statt der dortigen lokalen Variablen. */
function setzeFilterZurueck(auchSuche = true) {
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
  document.getElementById("filter-mindestzahl").value = "";

  if (auchSuche) {
    filters.suche = "";
    const feld = document.getElementById("suche");
    if (feld) {
      feld.value = "";
      document.getElementById("suche-loeschen").hidden = true;
    }
  }

  applyFilters();
}

/* Gefiltert wird beim Tippen -- kein Absenden, kein Knopf "Suchen".
   Entprellen ist bewusst nicht eingebaut: applyFilters() laeuft in 23ms
   (Median, gemessen am 1.8.2026 bei 418 Karten und 423 Markern). */
function initSuche() {
  const feld = document.getElementById("suche");
  const loeschen = document.getElementById("suche-loeschen");
  if (!feld) return;

  function uebernehmen() {
    filters.suche = normalisiere(feld.value);
    loeschen.hidden = feld.value === "";
    applyFilters();
  }

  feld.addEventListener("input", uebernehmen);

  feld.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || feld.value === "") return;
    // Nur leeren, nicht weiterreichen: Escape schliesst sonst zugleich
    // die Legende auf schmalen Schirmen (siehe buildLegend).
    e.stopPropagation();
    feld.value = "";
    uebernehmen();
  });

  loeschen.addEventListener("click", () => {
    feld.value = "";
    uebernehmen();
    feld.focus();
  });
}

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
  resetBtn.addEventListener("click", () => setzeFilterZurueck(true));

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

/* Suchtext und Sucheingabe durchlaufen dieselbe Normalisierung. Ohne sie
   scheitert die Suche an diesem Bestand: 227 Adressen schreiben "Str.", 97
   schreiben "straße" aus -- 21 Strassen kommen in BEIDEN Schreibweisen vor
   (Kaiser-, Berliner-, Koelner-, Kuellenhahner- und weitere). Wer
   "Kaiserstraße" tippt, faende sonst nur zwei der sechs Betriebe dort, ohne
   dass die Karte das anzeigt.
   Ebenso: 102 Eintraege enthalten ss-Laute, 141 Umlaute, und Namen tragen
   "&", Punkte, Klammern und typografische Anfuehrungszeichen ("Lago"). */
function normalisiere(text) {
  return (text || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    // "Kaiserstr. 8" und "Kaiserstraße 29" muessen dasselbe ergeben.
    // Bewusst ohne Wortgrenze davor: "Kaiserstr." ist ein Wort.
    .replace(/str\./g, "strasse")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/* Ein normalisierter Suchtext je Unternehmen, ueber ALLE seine Standorte:
   ein Betrieb mit zwei Adressen ist ueber beide auffindbar. Enthaelt auch
   die Nummer, damit "363a" direkt zum Eintrag fuehrt -- nuetzlich fuer alle,
   die daneben den gedruckten Katalog aufgeschlagen haben.
   Einmal beim Aufbau gebildet, nicht bei jedem Tastendruck. */
function baueSuchindex() {
  Object.values(companies).forEach((c) => {
    const teile = [c.nr, c.name];
    c.locations.forEach((loc) => {
      teile.push(loc.adresse, loc.ort, loc.stadtteil, loc.adresseHeute);
    });
    c._suchtext = normalisiere(teile.filter(Boolean).join(" "));
  });
}

function companyMatchesFilters(company) {
  // Suche: normalisierter Teilstring ueber Name, alle Adressen, Ort,
  // Stadtteil und Nummer (siehe baueSuchindex). Zuerst geprueft, weil sie
  // am meisten ausschliesst und am billigsten ist.
  if (filters.suche && !company._suchtext.includes(filters.suche)) return false;

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
  aktualisiereMeldezahl();
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
    filters.mindestzahl > 0 ||
    filters.suche !== "";

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
