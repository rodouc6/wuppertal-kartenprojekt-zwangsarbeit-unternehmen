/* =========================================================
   startseite.js  –  Kennzahlen, Uebersichtskarte und Beispielkarussell
                     der Startseite
   ========================================================= */

// Von daten.js benutzte globale Ablage der Unternehmen, siehe buildCompanies()
// in js/daten.js -- dort wird ohne eigene Deklaration auf "companies"
// zugegriffen, deshalb legt die Seite sie hier an (wie map-app.js es fuer
// die Hauptkarte tut).
let companies = {};

/* Die drei Zahlen kommen aus meta.json, damit sie nicht veralten koennen.
   Genau das war beim Entwurf passiert: er nannte 30 Industriezweige, weil
   die Zahl aus einer aelteren Fassung stammte. */
async function ladeKennzahlen() {
  const meta = await (await fetch("data/meta.json")).json();
  // Die vierte Spalte ist eine optionale Zusatzzeile unter dem Wert -- bislang
  // nur bei "Dokumentierte Unternehmen" genutzt, um zu zeigen, bei wie vielen
  // davon ueberhaupt eine Zahl ueberliefert ist (stats.companiesWithCount aus
  // build_data.py, nicht fest eingetragen).
  const zeilen = [
    [
      "Dokumentierte Unternehmen",
      meta.stats.totalCompanies,
      `davon ${meta.stats.companiesWithCount} mit mindestens einer überlieferten Zahl`,
    ],
    ["Erfasste Standorte", meta.stats.totalLocations],
    ["Stichtage 1940–1945", meta.dates.filter(Boolean).length],
  ];
  document.getElementById("kennzahlen").innerHTML = zeilen
    .map(([label, wert, zusatz]) =>
      `<div class="kennzahl"><dt>${label}</dt><dd>${wert}</dd>${
        zusatz ? `<span class="kennzahl-zusatz">${zusatz}</span>` : ""
      }</div>`)
    .join("");
}

/* Laedt data/unternehmen.geojson einmal fuer die ganze Seite und fuellt
   die globale Ablage "companies" (js/daten.js). Uebersichtskarte und
   Beispielkarussell lesen beide von dort -- ein zweiter fetch waere
   dieselbe Datei doppelt geladen. */
async function ladeDaten() {
  const geoData = await (await fetch("data/unternehmen.geojson")).json();
  buildCompanies(geoData.features);
}

/* ---------------------------------------------------------
   Uebersichtskarte: ein gezeichnetes SVG statt einer Leaflet-Karte
   --------------------------------------------------------- */

// Breite der viewBox. Die Hoehe wird daraus errechnet (siehe unten), damit
// das Seitenverhaeltnis dem projizierten Stadtgebiet folgt und nicht einer
// fest eingetragenen Zahl, die bei neuen Grenzdaten stillschweigend
// falsch wuerde.
const KARTE_BREITE = 1000;

// Rand um die Stadtgrenze in Grad. Ohne ihn beruehrt der Umriss den
// Bildrand und die Linienstaerke wird an den aeussersten Punkten
// halbiert weggeschnitten.
const KARTE_RAND = 0.004;

/* Web-Mercator, dieselbe Projektion wie Leaflet: der Umriss sieht damit
   aus wie auf der Hauptkarte und ist wiedererkennbar. Der Laengengrad
   geht unveraendert durch, nur der Breitengrad wird gestreckt. */
function merc(lon, lat) {
  return [lon, Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2)) * 180 / Math.PI];
}

/* Zeichnet Stadtgrenze, Wupper und alle Standorte als SVG in
   #kartenvorschau. Gezeichnet statt als fertige Datei im Repository:
   am 1.8.2026 kamen vierzehn Betriebe hinzu -- eine Vorschau, die das
   nicht mitbekommt, ist schlechter als eine, die eine Zehntelsekunde
   spaeter erscheint.

   ALLE PUNKTE GLEICH GROSS. Die frueheren Leaflet-Radien nach
   hoechststand() legten nahe, hier sei der Umfang der Zwangsarbeit
   abzulesen; das leistet erst die Hauptkarte mit Zeitregler und
   Legende. Die Vorschau zeigt die Verteilung der Betriebe im
   Stadtgebiet, sonst nichts. */
async function baueUebersichtskarte() {
  const container = document.getElementById("kartenvorschau");
  const umriss = await (await fetch("data/wuppertal-umriss.geojson")).json();
  const grenze = umriss.features.find((f) => f.properties.rolle === "stadtgrenze");
  const fluss = umriss.features.find((f) => f.properties.rolle === "fluss");
  if (!grenze) return;

  // Rahmen aus der Bounding Box der STADTGRENZE, nicht der Punkte: sonst
  // haenge der Ausschnitt an den Betrieben, und ein einzelner Standort am
  // Rand verschoebe die ganze Flaeche.
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  grenze.geometry.coordinates.forEach((ring) => {
    ring.forEach(([lon, lat]) => {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
  });
  minLon -= KARTE_RAND; maxLon += KARTE_RAND;
  minLat -= KARTE_RAND; maxLat += KARTE_RAND;

  const [linksX, obenY] = merc(minLon, maxLat);
  const [rechtsX, untenY] = merc(maxLon, minLat);
  const hoehe = KARTE_BREITE * (obenY - untenY) / (rechtsX - linksX);

  // Eine Nachkommastelle genuegt: bei 1000 Einheiten Breite liegt sie weit
  // unter einem Bildschirmpunkt, spart aber rund ein Drittel der Zeichen
  // in den beiden langen Pfaden.
  function punkt(lon, lat) {
    const [x, y] = merc(lon, lat);
    return [
      ((x - linksX) / (rechtsX - linksX) * KARTE_BREITE).toFixed(1),
      ((obenY - y) / (obenY - untenY) * hoehe).toFixed(1),
    ];
  }

  function pfad(linien, geschlossen) {
    return linien
      .map((linie) =>
        linie.map((koord, i) => `${i ? "L" : "M"}${punkt(koord[0], koord[1]).join(" ")}`).join("") +
        (geschlossen ? "Z" : ""))
      .join("");
  }

  // Ein Kreis je Standort MIT Geometrie (426), nicht je Unternehmen (431):
  // die Vorschau zeigt Orte, und elf Unternehmen haben mehrere davon.
  const kreise = [];
  Object.values(companies).forEach((c) => {
    c.locations.forEach((loc) => {
      if (!loc.geometry) return;
      const [cx, cy] = punkt(loc.geometry.coordinates[0], loc.geometry.coordinates[1]);
      kreise.push(`<circle cx="${cx}" cy="${cy}" r="4"/>`);
    });
  });

  // aria-hidden: Rolle und Beschriftung traegt der Container (index.html).
  // Ein zweites Mal vorgelesen zu werden hilft niemandem.
  container.innerHTML = `
    <svg viewBox="0 0 ${KARTE_BREITE} ${hoehe.toFixed(1)}" aria-hidden="true">
      <path d="${pfad(grenze.geometry.coordinates, true)}"
            fill="#f2f2ef" stroke="#c9c9c4" stroke-width="1.5"/>
      ${fluss ? `<path d="${pfad(fluss.geometry.coordinates, false)}"
            fill="none" stroke="#a8bac6" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round"/>` : ""}
      <g fill="#26272a" fill-opacity="0.72" stroke="#fff" stroke-width="0.9">${kreise.join("")}</g>
    </svg>`;

  // Die Flaeche fuehrt zur echten Karte -- per Maus und per Tastatur
  // (tabindex/role/aria-label stehen in index.html). Das SVG enthaelt
  // keine eigenen Klickziele, deshalb genuegt hier ein Zuhoerer ohne
  // Ausnahmen: die frueher noetige Ruecksicht auf die Leaflet-Attribution
  // (ein echter Link mitten im Bild) ist mit Leaflet entfallen.
  container.addEventListener("click", () => {
    window.location.href = "map.html";
  });

  container.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      window.location.href = "map.html";
    }
  });
}

/* ---------------------------------------------------------
   "AUS DEN EINTRAEGEN": Karussell aus fuenf ausgewaehlten Beispielen
   --------------------------------------------------------- */

// Weiterlauf alle acht Sekunden. Er endet beim ersten Eingriff und laeuft
// nicht wieder an -- wer eingegriffen hat, liest gerade.
const KARUSSELL_TAKT = 8000;

// Firmennamen enthalten kaufmaennische Und ("Vorwerk & Co.", "Schmahl &
// Schulz"). Ohne Maskierung stuende dort im ungluecklichen Fall der Anfang
// einer Entitaet; die Daten sind zwar aus einer Quelle, aber sie werden
// hier zu HTML zusammengesetzt und nicht als Text gesetzt.
function alsText(wert) {
  return String(wert == null ? "" : wert)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Tausenderpunkt: 1362 -> "1.362".
function zahlDE(n) {
  return Number(n).toLocaleString("de-DE");
}

/* Kurzes Datum "31.12.1944". formatDateDE() aus js/daten.js schreibt den
   Monat aus ("31. Dezember 1944") -- das ist richtig fuer die Seitenleiste
   der Karte, wo das Datum eine eigene Zeile hat. Auf der Karussellkarte
   steht es unmittelbar hinter der Zahl, und dort traegt die lange Form
   mehr Laenge als Klarheit. */
function datumKurz(iso) {
  const [jahr, monat, tag] = iso.split("-").map(Number);
  return `${tag}.${monat}.${jahr}`;
}

/* Die Meldungen, aus denen sich der Hoechststand zusammensetzt: alle, die
   zu seinem Zeitpunkt laufen -- dieselbe halboffene Pruefung wie in
   hoechststandMitZeitpunkt() (js/daten.js), damit Summe und Aufschluesselung
   nicht auseinanderlaufen koennen. recordGiltAm() ist dafuer nicht zu
   gebrauchen: es liest das globale zaehlmodus, das nur map.html setzt.
   Absteigend nach Zahl, weil sonst die Reihenfolge der Quelle durchschlaegt
   und etwa "2 Kriegsgefangene" zwischen zwei dreistelligen Posten staende. */
function aufschluesselung(company, zeitpunkt) {
  if (!zeitpunkt) return [];
  return company.records
    .filter((r) => r.datumVon && r.datumBis &&
      r.datumVon <= zeitpunkt && zeitpunkt < r.datumBis && (r.gesamt || 0) > 0)
    .map((r) => ({ art: r.art, zahl: r.gesamt }))
    .sort((a, b) => b.zahl - a.zahl);
}

/* Zaehlungen ohne datumVon. Sie gelten in keiner der beiden Lesarten und
   fehlen deshalb im Hoechststand (siehe CLAUDE.md, "Zaehlungen ohne Datum").
   Bei Nr. 463 ist es die einzige ueberlieferte Zahl -- ohne diese Zeile
   stuende auf der Karte "keine Zaehlung ueberliefert", obwohl 26 Menschen
   bezeugt sind. undatierteSumme() aus js/map-app.js wird bewusst nicht
   mitbenutzt: sie liest das globale filters, das es nur auf map.html gibt;
   die Startseite kennt keine Filter und summiert ungefiltert. */
function undatierteZaehlungen(company) {
  return company.records.filter((r) => !r.datumVon && (r.gesamt || 0) > 0);
}

/* Die Zahlenzeilen einer Karte. Vier Faelle, in dieser Reihenfolge:
   ein einziger Posten (dann wandert die Art in die erste Zeile), mehrere
   Posten (Summe oben, Aufschluesselung darunter), gar kein datierter Stand,
   aber undatierte Zaehlungen, und schliesslich die Luecke selbst.

   Die Aufschluesselung ist der Grund fuer die ganze Umstellung: bei den
   grossen Betrieben stellen dienstverpflichtete Deutsche die Mehrheit
   (Vorwerk 821 von 1.362). Auf der Karte faengt der ZA-Art-Filter das auf,
   auf einer Beispielkarte gibt es keinen Filter -- dort stuende sonst
   "1.362 Zwangsarbeiter". */
function zahlenzeilen(company) {
  const { max, zeitpunkt } = hoechststandMitZeitpunkt(company);
  const posten = aufschluesselung(company, zeitpunkt);

  if (max > 0 && posten.length === 1) {
    return `<p class="beispiel-zahl">Höchststand ${zahlDE(max)} ${alsText(posten[0].art)}
            am ${datumKurz(zeitpunkt)}</p>`;
  }

  if (max > 0) {
    return `<p class="beispiel-zahl">Höchststand ${zahlDE(max)} am ${datumKurz(zeitpunkt)}</p>
      <p class="beispiel-posten">${posten
        .map((p) => `${zahlDE(p.zahl)} ${alsText(p.art)}`)
        .join(" &middot; ")}</p>`;
  }

  const ohneDatum = undatierteZaehlungen(company);
  if (ohneDatum.length > 0) {
    const zeile = ohneDatum.map((r) => {
      // Geschlechterangabe nur, wenn die Quelle sie hergibt.
      const geschlecht = [r.m ? `${r.m} M` : null, r.w ? `${r.w} F` : null]
        .filter(Boolean).join(" / ");
      return `${zahlDE(r.gesamt)} ${alsText(r.art)}${geschlecht ? ` (${geschlecht})` : ""}`;
    }).join(" &middot; ");
    return `<p class="beispiel-zahl">${zeile} &mdash; ohne Datum überliefert</p>`;
  }

  // Derselbe Wortlaut wie in der Seitenleiste der Karte: die Luecke wird
  // benannt, nicht durch das Fehlen der Zeile ausgedrueckt.
  return `<p class="beispiel-zahl">keine Zählung überliefert</p>`;
}

/* Eine Karte. OHNE Unternehmensnummer -- die Nummer aus der Speer-Studie
   ist ein Arbeitsmittel und in der Seitenleiste der Karte bereits
   entfernt. Im Link steht sie weiter, nur nicht mehr im Text. */
function beispielKarte(company, index, anzahl) {
  const standort = company.locations[0] || {};
  // "xxx" und "unbekannt" sind Leerstellen der Quelle, siehe
  // OHNE_ANGABE_ZWEIGE in js/daten.js.
  const zweig = OHNE_ANGABE_ZWEIGE.includes(company.industriezweig)
    ? "Branche nicht überliefert"
    : company.industriezweig;
  const meta = [
    [standort.ort, standort.adresse].filter(Boolean).join(", "),
    zweig,
  ].filter(Boolean).map(alsText).join(" &middot; ");

  // "Beispiel 1 von 1" waere im Rueckfall (eine einzelne Karte) eine
  // Auskunft ueber nichts.
  const stelle = anzahl > 1 ? ` aria-label="Beispiel ${index + 1} von ${anzahl}"` : "";

  return `
    <article class="karussell-karte" aria-roledescription="Beispiel"${stelle}>
      <h3 class="eintrag-titel">${alsText(company.name)}</h3>
      <p class="eintrag-meta">${meta}</p>
      ${zahlenzeilen(company)}
      <p class="karussell-karte-link">
        <a class="spalte-link" href="map.html?nr=${encodeURIComponent(company.nr)}">Auf der Karte anzeigen &rarr;</a>
      </p>
    </article>`;
}

/* Wischen, Punkte, Pfeile, Weiterlauf. Erst hier, nachdem das Markup
   steht: die Steuerung haengt an fertigen Knoten, nicht am Aufbau. */
function karussellSteuerung(wurzel) {
  const streifen = wurzel.querySelector(".karussell-streifen");
  const punkte = Array.from(wurzel.querySelectorAll(".karussell-punkt"));
  if (punkte.length < 2) return;

  // Bei "Bewegung reduzieren" faellt beides weg: der Weiterlauf und das
  // weiche Scrollen.
  const bewegungOk = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Jede Karte ist genau so breit wie der Streifen (flex: 0 0 100% in
     style.css), deshalb liegt die i-te Karte bei i * clientWidth.
     scrollIntoView() waere naheliegender, scrollt aber die ganze Seite
     senkrecht mit, wenn der Streifen nicht vollstaendig im Blick ist --
     ein Weiterlauf, der die Seite verschiebt, waere unbrauchbar. */
  function zeige(i) {
    streifen.scrollTo({
      left: i * streifen.clientWidth,
      behavior: bewegungOk ? "smooth" : "auto",
    });
  }

  function aktuell() {
    return Math.round(streifen.scrollLeft / streifen.clientWidth);
  }

  // Der aktive Punkt folgt dem Scrollen, nicht umgekehrt: gewischt wird
  // frei, und mitgezaehlte Zustaende laufen dabei auseinander.
  streifen.addEventListener("scroll", () => {
    const i = aktuell();
    punkte.forEach((p, j) => {
      if (j === i) p.setAttribute("aria-current", "true");
      else p.removeAttribute("aria-current");
    });
  });

  let uhr = null;
  function anhalten() {
    if (uhr === null) return;
    clearInterval(uhr);
    uhr = null;
  }

  // Wischen, Punkt druecken, Maus ueber dem Streifen, Fokus hinein: jedes
  // davon haelt den Weiterlauf an, und er laeuft nicht wieder an.
  ["pointerdown", "mouseenter", "focusin"].forEach((ereignis) => {
    wurzel.addEventListener(ereignis, anhalten);
  });

  punkte.forEach((punkt, i) => punkt.addEventListener("click", () => zeige(i)));

  wurzel.querySelectorAll(".karussell-pfeil").forEach((knopf) => {
    knopf.addEventListener("click", () => {
      const schritt = Number(knopf.dataset.schritt);
      zeige((aktuell() + schritt + punkte.length) % punkte.length);
    });
  });

  if (bewegungOk) {
    uhr = setInterval(() => zeige((aktuell() + 1) % punkte.length), KARUSSELL_TAKT);
  }
}

/* Die Auswahl steht in data/beispiele.json, damit sie ohne Codeaenderung
   zu aendern ist. Fehlt eine Nummer in den Daten, wird sie uebersprungen
   und einmal gemeldet; fehlt die Datei ganz, greift der Zufallseintrag als
   einzelne Karte. Die Startseite darf an einer Beispielliste nicht
   scheitern. */
async function ladeBeispielNummern() {
  try {
    const antwort = await fetch("data/beispiele.json");
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
    const daten = await antwort.json();
    return Array.isArray(daten.nummern) ? daten.nummern : [];
  } catch (err) {
    console.warn("Beispielliste nicht lesbar, Zufallseintrag stattdessen:", err.message);
    return [];
  }
}

/* Rueckfall: ein zufaelliger Eintrag. Auswahlregeln unveraendert aus dem
   frueheren js/landing.js -- ein Kandidat je Unternehmensnummer (der erste
   Standort entscheidet ueber Geometrie und Adresse), nur Unternehmen mit
   mindestens einer Zaehlung ueber null. */
function zufallsBeispiel() {
  const kandidaten = Object.values(companies).filter((c) => {
    const ersterStandort = c.locations[0];
    if (!ersterStandort || !ersterStandort.geometry) return false;
    return c.records.some((r) => r.gesamt && r.gesamt > 0);
  });
  if (kandidaten.length === 0) return null;
  return kandidaten[Math.floor(Math.random() * kandidaten.length)];
}

async function baueBeispielkarussell() {
  const container = document.getElementById("eintragsbeispiel");
  const nummern = await ladeBeispielNummern();

  const gewaehlt = [];
  nummern.forEach((nr) => {
    if (companies[nr]) gewaehlt.push(companies[nr]);
    else console.warn(`Beispiel Nr. ${nr} steht nicht in den Daten und entfaellt.`);
  });

  if (gewaehlt.length === 0) {
    const eines = zufallsBeispiel();
    if (eines) container.innerHTML = beispielKarte(eines, 0, 1);
    return;
  }

  const anzahl = gewaehlt.length;
  container.innerHTML = `
    <div class="karussell">
      <button class="karussell-pfeil karussell-pfeil-links" data-schritt="-1"
              aria-label="Vorheriges Beispiel">&lsaquo;</button>
      <div class="karussell-streifen" role="group" aria-roledescription="Karussell"
           aria-label="Ausgewählte Beispiele aus den Einträgen" tabindex="0">
        ${gewaehlt.map((c, i) => beispielKarte(c, i, anzahl)).join("")}
      </div>
      <button class="karussell-pfeil karussell-pfeil-rechts" data-schritt="1"
              aria-label="Nächstes Beispiel">&rsaquo;</button>
      <div class="karussell-punkte">
        ${gewaehlt.map((c, i) =>
          `<button class="karussell-punkt" data-index="${i}"
                   aria-label="Beispiel ${i + 1} von ${anzahl}"${i === 0 ? ' aria-current="true"' : ""}></button>`)
          .join("")}
      </div>
    </div>`;

  karussellSteuerung(container.querySelector(".karussell"));
}

document.addEventListener("DOMContentLoaded", async () => {
  ladeKennzahlen().catch((err) => console.error("Kennzahlen-Fehler:", err));
  try {
    await ladeDaten();
    await baueUebersichtskarte();
    await baueBeispielkarussell();
  } catch (err) {
    console.error("Daten-Fehler:", err);
  }
});
