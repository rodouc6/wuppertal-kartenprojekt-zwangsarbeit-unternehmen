# Karte und Navigation: drei Korrekturen

**Stand:** 3.8.2026 · betrifft `map.html`, alle Seiten mit `<nav>`, `js/map-app.js`,
neu `js/nav.js`, `style.css`

Drei voneinander unabhängige Punkte aus der Liste vom 3.8.2026. Sie stehen in
einem Auftrag, weil sie dieselben zwei Dateien anfassen (`map-app.js`,
`style.css`) und sonst kollidieren würden.

---

## 1 · Der Zeitregler läuft über

### Befund

`#timeline-panel` ist auf `min(580px, calc(100% - 400px))` festgelegt. Von seinen
Kindern haben Datum, Meldungszeile und Umschalter alle `flex-shrink: 0`;
nachgeben kann allein `#timeline-slider`, und der nicht unter seine
Eigenbreite (`min-width: auto` bei `<input type="range">`). Sobald im
Stichtag-Modus `#timeline-meldungen` erscheint — im schlimmsten Fall
„247 Meldungen, davon 131 mit Zahl" am 27.4.1943 —, schiebt sich
`#timeline-mode` rechts aus der weißen Pille heraus über die Karte.

### Entscheidung

Die Meldungszeile verlässt das Panel und wird ein eigenes kleines Schild, das
darüber schwebt. Die Pille behält Höhe (48px), Form und Inhalt: Abspielknopf,
Regler, Datum, Umschalter. Das Schild erscheint nur im Stichtag-Modus.

Verglichen wurden vier Varianten; der Vergleich ist unter
<https://claude.ai/code/artifact/bfa03205-7713-4b0d-a3b2-cd7f09022579> nachvollziehbar.
Gegen ein zweizeiliges Panel entschied die Auftraggeberseite.

### Umsetzung

**`map.html`** — `#timeline-meldungen` wandert aus `#timeline-panel` heraus.
Beide bekommen eine gemeinsame Hülle, die die Positionierung übernimmt:

```html
<div id="timeline-wrap">
  <span id="timeline-meldungen" hidden></span>
  <div id="timeline-panel">
    <button id="timeline-play" …>…</button>
    <input type="range" id="timeline-slider" …>
    <span id="timeline-date">—</span>
    <div id="timeline-mode" …>…</div>
  </div>
</div>
```

Die Reihenfolge im Quelltext ist Schild vor Panel — so steht es auch optisch
und in der Vorlesereihenfolge.

**`style.css`, breite Schirme.** `#timeline-wrap` erbt die gesamte
Positionierung, die heute `#timeline-panel` trägt:

```css
#timeline-wrap {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(calc(-50% - 180px));
  width: min(580px, calc(100% - 400px));
  z-index: 400;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  /* Die Huelle ist breiter als ihre sichtbaren Teile. Ohne dies faengt sie
     Klicks auf die Karte links und rechts neben dem Schild ab. */
  pointer-events: none;
}

#timeline-panel,
#timeline-meldungen {
  pointer-events: auto;
}
```

`#timeline-panel` verliert `position`, `bottom`, `left`, `transform`, `width`
und `z-index` und bekommt `width: 100%`. Alles andere bleibt.

`#timeline-meldungen` wird vom Textstück zum Schild:

```css
#timeline-meldungen {
  background: rgba(255,255,255,0.94);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 11px;
  color: #6b6c6e;
  white-space: nowrap;
  box-shadow: 0 2px 10px rgba(0,0,0,0.12);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

`#timeline-meldungen[hidden] { display: none; }` bleibt.

**Die Sonderregel für 761–860px bleibt bestehen**, sie zielt jetzt aber auf die
Hülle: Auch ohne Meldungszeile bleiben in diesem Bereich vom Panel unter 450px,
und der Regler schrumpfte dort auf rund 50px. Der Umschalter rückt weiter in
eine zweite Zeile. `#timeline-panel` behält dafür in dieser Abfrage
`height: auto; border-radius: 16px; flex-wrap: wrap; row-gap: 6px;` — nur der
Selektor für die äußere Positionierung muss auf `#timeline-wrap` umgestellt
werden, falls einer nötig ist.

**`style.css`, schmale Schirme (≤760px).** Der ganze Block, der heute
`#timeline-panel` positioniert, gilt künftig für `#timeline-wrap`:

```css
#timeline-wrap {
  left: 12px;
  right: 12px;
  bottom: calc(var(--blatt-griff) + 12px);
  transform: none;
  width: auto;
  align-items: flex-start;   /* Schild bündig mit dem Datum darunter */
}

#layout.blatt-offen #timeline-wrap {
  bottom: calc(var(--blatt-hoehe) + 12px);
}
```

`#timeline-panel` behält dort `height: auto; border-radius: 12px; padding: 10px
14px; display: grid; grid-template-columns: auto 1fr; row-gap: 6px; column-gap:
12px; align-items: center;` — aber **ohne** `left/right/bottom/transform/width`.

Die Gitterzuweisung `#timeline-meldungen { grid-column: 1 / -1; grid-row: 2; }`
im Mobilblock **entfällt ersatzlos** — das Element ist kein Kind des Panels
mehr. Damit rücken Abspielknopf und Regler von Zeile 3 auf Zeile 2; die
zugehörigen `grid-row`-Angaben sind entsprechend zu korrigieren. Der lange
Kommentar über der alten Regel wird durch einen kurzen ersetzt, der den neuen
Aufbau erklärt — er beschreibt sonst einen Zustand, den es nicht mehr gibt.

**`js/map-app.js`** — `aktualisiereMeldezahl()` bleibt unverändert; das Element
behält seine `id`. Prüfen, ob im Skript sonst irgendwo über
`#timeline-panel` auf die Meldezahl zugegriffen wird.

### Prüfung

- 1280px, Stichtag, 27.4.1943: Schild über der Pille, nichts läuft über
- Umschalten auf Fortgeschrieben: Schild verschwindet, Pille bleibt an Ort und Größe
- 800px: Umschalter in zweiter Zeile, kein Überlauf
- 390px: Schild über dem Panel, linksbündig mit dem Datum; bei geöffnetem
  Bodenblatt fährt es mit nach oben
- Ein Klick links und rechts neben dem Schild muss auf der Karte landen (Marker
  treffen, Karte verschieben) — nicht ins Leere

---

## 2 · „Projekt" öffnet auf dem Smartphone nicht

### Befund

Das Untermenü hängt allein an `.nav-dropdown:hover`. Auf Touch gibt es kein
Hover; das Gerät folgt stattdessen dem `href` und landet auf `about.html`. Die
Unterseiten sind so nur über einen Umweg erreichbar.

### Entscheidung

Ein gemeinsames `js/nav.js` auf allen Seiten macht aus dem Reiter einen
Schalter. Ohne JavaScript bleibt der Link, was er ist — die Navigation
funktioniert also weiterhin, nur ohne Klappmenü.

### Umsetzung

**Neu: `js/nav.js`** — rund 30 Zeilen, ohne Abhängigkeiten:

- setzt beim Laden `aria-expanded="false"` und `aria-haspopup="true"` auf
  `.nav-dropdown > a`
- Klick darauf: `preventDefault()`, `aria-expanded` umschalten, Klasse `offen`
  auf `.nav-dropdown` setzen
- Klick außerhalb schließt; `Escape` schließt und gibt den Fokus an den Reiter
  zurück
- kommt mit mehreren Dropdowns auf einer Seite zurecht, auch wenn es derzeit
  nur eines gibt

Kommentare auf Deutsch, Umlaute darin umschrieben (`ue`, `ae`, `oe`) — so
halten es die übrigen Skripte.

**`style.css`:**

```css
.nav-dropdown:hover .nav-dropdown-menu,
.nav-dropdown:focus-within .nav-dropdown-menu,
.nav-dropdown.offen .nav-dropdown-menu {
  display: block;
}
```

`:focus-within` ist der Rückfall für Tastaturbedienung ohne JavaScript.

**Alle Seiten mit `<nav>`** binden `js/nav.js` ein, unmittelbar vor `</body>`:
`index.html`, `map.html`, `about.html`, `about/bibliographie.html`,
`about/statistiken.html`, `impressum.html`. Im Unterverzeichnis `about/` mit
`../js/nav.js`. Falls weitere HTML-Dateien mit `<nav>` existieren, gehören sie
dazu — vor dem Ändern einmal `grep -l "nav-dropdown" *.html about/*.html`.

### Prüfung

- 390px: Tipp auf „Projekt" öffnet das Menü, es bleibt offen, ein Tipp auf
  einen Eintrag navigiert, ein Tipp daneben schließt
- 1280px: Hover öffnet weiterhin; ein Klick auf „Projekt" öffnet und schließt,
  statt zu navigieren
- Tastatur: Tab auf den Reiter, Enter öffnet, Escape schließt
- Auf `about/statistiken.html` prüfen, dass der Pfad `../js/nav.js` stimmt

---

## 3 · Auf dem Handy ist nicht erkennbar, dass das Popup ein Ziel hat

### Befund

Unter 760px öffnet ein Tipp auf den Popup-Inhalt das Bodenblatt beim passenden
Eintrag (`oeffneBlattFuerEintrag`). Nichts am Popup deutet darauf hin. Oberhalb
der Schwelle bleibt derselbe Tipp wirkungslos.

### Entscheidung

Eine Fußzeile im Popup, nur auf schmalen Schirmen, dazu eine sichtbare
Rückmeldung beim Antippen.

### Umsetzung

**`js/map-app.js`, `makePopup()`** — als letztes Kind von `.popup-content`:

```js
html += `<div class="popup-mehr">Zum Eintrag <span aria-hidden="true">›</span></div>`;
```

Die Zeile wird immer erzeugt und per CSS nur unterhalb von 761px gezeigt — die
Schwelle steht damit an einer Stelle, nicht in zwei Sprachen. `personenWort()`
und die übrigen Zeilen bleiben unberührt.

**`style.css`:**

```css
.popup-mehr { display: none; }

@media (max-width: 760px) {
  .popup-content { cursor: pointer; }

  .popup-content:active {
    background: #f5f5f3;
  }

  .popup-mehr {
    display: block;
    margin-top: 8px;
    padding-top: 7px;
    border-top: 1px solid #ececea;
    font-size: 11px;
    font-weight: 500;
    color: #17181a;
  }
}
```

Der Hintergrund bei `:active` braucht etwas Luft: falls `.popup-content` keine
eigene Polsterung hat, sitzt die Fläche bündig an der Schrift. Dann `padding`
und `border-radius` so wählen, dass die Rückmeldung als Fläche lesbar ist, ohne
das Popup zu vergrößern (Leaflets `.leaflet-popup-content` bringt eigene
Ränder mit — dort prüfen, nicht doppelt polstern).

### Prüfung

- 390px: Marker antippen, Fußzeile sichtbar, Tipp öffnet das Blatt beim
  richtigen Eintrag
- Der Knopf `.quellen-btn` im Popup behält seine eigene Wirkung (die
  `closest()`-Prüfung im `popupopen`-Listener deckt das ab)
- 1280px: keine Fußzeile, kein Zeigefinger-Cursor

---

## Was nicht dazugehört

- Keine Änderung an Daten, Filtern, Zählweise oder Markerdarstellung
- Keine Änderung an der Startseite — die läuft in einem eigenen Auftrag
  (`2026-08-03-startseite-uebersicht-design.md`) und fasst `index.html` und
  `style.css` ebenfalls an. **Nicht parallel bearbeiten.**
- Kein Umbau der Navigation zu einem Hamburger-Menü
