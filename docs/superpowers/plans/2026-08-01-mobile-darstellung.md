# Mobile Darstellung: Umsetzungsplan

> **Für agentische Bearbeiter:** Abarbeitung mit
> `superpowers:subagent-driven-development` — eine frische Instanz je Aufgabe,
> Prüfung nach jeder.

**Ziel:** Die Website wird auf Telefonen bedienbar, ohne dass sich am
Schreibtischlayout etwas ändert.

**Spezifikation:** `docs/superpowers/specs/2026-08-01-mobile-darstellung-design.md` —
sie gilt für alle Entscheidungen. Bei Abweichung zwischen Plan und Spec gilt die Spec.

## Verbindliche Vorgaben

- **Schwelle 760px.** Alle neuen Regeln stehen in `@media (max-width: 760px)`.
  Oberhalb davon darf sich **nichts** ändern — das ist die eigentliche Gefahr dieser
  Arbeit und bei jedem Schritt gegen 1280px zu prüfen.
- **Keine Änderung** an Datenmodell, Filterlogik, Farbgebung oder Markergrößen.
- **Kein Wischen**, keine Gestenerkennung, keine Geräteerkennung.
- **Bedienelemente mindestens 44px** in der kleineren Richtung.
- Neue Regeln ans Ende von `style.css` in einen kommentierten Abschnitt
  „SCHMALE SCHIRME"; bestehende Regeln nicht umschreiben, nur überschreiben.
- **Kommentare auf Deutsch**, Umlaute als ae/oe/ue.
- **Prüfung im Browser** — es gibt keinen Testrunner. Server:
  `python3 -m http.server 8099` (8080 ist belegt).
- Nach jeder Aufgabe committen, deutsche Nachricht, Betreff unter 72 Zeichen.

## Ausgangszustand

| Element | heute |
|---|---|
| `#sidebar` | `position: absolute`, `right/top/bottom: 12px`, `width: 360px`, `transition: transform 0.25s` |
| `#sidebar.collapsed` | `transform: translateX(calc(100% + 12px))` |
| `#sidebar-header` | `padding: 14px 16px`, enthält Titel, `#entry-count`, `#filter-toggle` |
| `#entry-count` | zeigt „417 Unternehmen · 407 verortbar" bzw. „126 von 417 Unternehmen (gefiltert)" |
| `#sidebar-toggle` | Knopf links neben der Leiste, `right: calc(360px + 12px + 4px)` |
| `#timeline-panel` | `bottom: 20px`, `left: 50%`, `transform: translateX(calc(-50% - 180px))`, `width: min(580px, calc(100% - 400px))` |
| `.quellen-overlay` | `position: fixed`, `width: min(620px, 100%)` |

---

### Aufgabe 1: Die Seitenleiste wird ein Bodenblatt

**Dateien:** `style.css`, `js/map-app.js`

- [ ] **Schritt 1: Custom Property anlegen.** In `:root` oder am Anfang des neuen
      Abschnitts:

```css
/* Hoehe der Griffleiste, die bei geschlossenem Blatt sichtbar bleibt.
   Steht als Variable, weil der Zeitregler in Aufgabe 2 darauf aufsetzt. */
:root { --blatt-griff: 56px; }
```

- [ ] **Schritt 2: Das Blatt.** Im Abschnitt für schmale Schirme:

```css
@media (max-width: 760px) {
  #sidebar {
    left: 0;
    right: 0;
    top: auto;
    bottom: 0;
    width: auto;
    height: 75vh;
    border-radius: 12px 12px 0 0;
  }

  /* Geschlossen bleibt die Griffleiste stehen -- sie traegt die Trefferzahl
     und ist zugleich der Umschalter. */
  #sidebar.collapsed {
    transform: translateY(calc(100% - var(--blatt-griff)));
  }

  #sidebar-header {
    min-height: var(--blatt-griff);
    cursor: pointer;
  }

  #sidebar-toggle { display: none; }
}
```

- [ ] **Schritt 3: Anfasser.** Ein waagerechter Strich oben mittig im Header, damit
      erkennbar ist, dass sich etwas ziehen lässt — als `::before` auf
      `#sidebar-header`, etwa 36×4px, `#d4d4d2`, `border-radius: 2px`, mittig.
      Nur innerhalb der Media Query.

- [ ] **Schritt 4: Startzustand.** Auf schmalen Schirmen soll das Blatt geschlossen
      starten, damit die Karte sichtbar ist. In `js/map-app.js`, in der
      Initialisierung nach `buildList()`:

```javascript
/* Auf schmalen Schirmen faehrt die Liste als Bodenblatt ein und startet
   geschlossen -- sonst verdeckt sie beim Laden die ganze Karte. */
if (window.matchMedia("(max-width: 760px)").matches) {
  document.getElementById("sidebar").classList.add("collapsed");
}
```

- [ ] **Schritt 5: Umschalten durch Tippen auf die Griffleiste.** In
      `initSidebarToggle()` ergänzen. Der Klick auf den Filterknopf darf das Blatt
      **nicht** umschalten:

```javascript
/* Der Header ist auf schmalen Schirmen die Griffleiste. Klicks auf den
   Filterknopf darin gehoeren nicht dem Blatt. */
document.getElementById("sidebar-header").addEventListener("click", (e) => {
  if (e.target.closest("#filter-toggle")) return;
  if (!window.matchMedia("(max-width: 760px)").matches) return;
  sidebar.classList.toggle("collapsed");
  setTimeout(() => map.invalidateSize(), 260);
});
```

- [ ] **Schritt 6: Prüfen bei 390px.** Karte füllt den Schirm, Griffleiste unten mit
      Trefferzahl, Tippen öffnet und schließt, Liste scrollt im geöffneten Blatt,
      Filterknopf öffnet das Filterpanel ohne das Blatt zu schließen. Prüfen, dass
      die Auswahllisten der Filter nicht abgeschnitten werden.

- [ ] **Schritt 7: Prüfen bei 1280px.** Seitenleiste rechts wie bisher, Knopf zum
      Ein- und Ausklappen funktioniert, nichts verschoben.

- [ ] **Schritt 8: Committen.**

---

### Aufgabe 2: Zeitregler, Legende, Quellenfenster

**Dateien:** `style.css`

- [ ] **Schritt 1: Zeitregler.** Er rechnet heute mit der Seitenleiste; beides
      entfällt:

```css
@media (max-width: 760px) {
  #timeline-panel {
    left: 12px;
    right: 12px;
    bottom: calc(var(--blatt-griff) + 12px);
    transform: none;
    width: auto;
    height: auto;
    border-radius: 12px;
    padding: 10px 14px;
    flex-wrap: wrap;
  }
}
```

- [ ] **Schritt 2: Datum über den Regler.** Rechts daneben fehlt der Platz. Mit
      `flex-wrap: wrap` und `order` so anordnen, dass Datum und Beschriftung eine
      eigene Zeile über Abspielknopf und Regler bilden. Der Abspielknopf bleibt
      links und bekommt mindestens 44×44px.

- [ ] **Schritt 3: Legende prüfen.** Sie sitzt unten links und könnte mit dem
      Zeitregler kollidieren. Ansehen; falls sie überlappt, in der Media Query nach
      oben links unter die Zoom-Knöpfe verschieben. Der Info-Knopf bleibt ihr
      Umschalter und bekommt mindestens 44×44px.

- [ ] **Schritt 4: Quellenfenster über die volle Fläche.**

```css
@media (max-width: 760px) {
  .quellen-overlay {
    inset: 0;
    width: 100%;
    max-width: none;
    height: 100%;
    max-height: none;
    border-radius: 0;
  }
}
```

      Der Schließknopf bekommt mindestens 44×44px. Die Fokusfalle bleibt unverändert
      — prüfen, dass sie noch greift.

- [ ] **Schritt 5: Prüfen bei 390px und 430px.** Zeitregler bedienbar und nicht vom
      Blatt verdeckt, Legende sichtbar ohne Überlappung, Quellenfenster füllt den
      Schirm und lässt sich schließen.

- [ ] **Schritt 6: Prüfen bei 1280px** — nichts verschoben.

- [ ] **Schritt 7: Committen.**

---

### Aufgabe 3: Die übrigen Seiten

**Dateien:** `style.css`, gegebenenfalls einzelne HTML-Dateien

- [ ] **Schritt 1: Alle fünf Seiten bei 390px öffnen** — `index.html`,
      `about.html`, `about/bibliographie.html`, `about/statistiken.html`,
      `impressum.html`. Notieren, was überläuft, überlappt oder unlesbar ist.

- [ ] **Schritt 2: Beheben, was klein und eindeutig ist.** Erwartet werden:
      überlaufende URLs in der Bibliographie (`overflow-wrap`), Beschriftungen an
      den Diagrammen, Innenabstände. Keine Umbauten — findest du etwas Größeres,
      beschreibe es im Bericht, statt es zu lösen.

- [ ] **Schritt 3: Waagerechtes Scrollen ausschließen.** Auf keiner Seite darf der
      Seitenkörper seitlich scrollen. Prüfen mit
      `document.documentElement.scrollWidth > document.documentElement.clientWidth`
      in der Konsole — muss überall `false` liefern.

- [ ] **Schritt 4: Prüfen bei 1280px** — nichts verschoben.

- [ ] **Schritt 5: Committen.**

---

### Aufgabe 4: Abschlussdurchsicht

- [ ] **Schritt 1: Alle sechs Seiten bei 390px, 430px und 768px.** Bei 768px muss
      noch das Schreibtischlayout erscheinen — die Schwelle liegt bei 760px.

- [ ] **Schritt 2: Treffbarkeit der Bedienelemente** messen: Griffleiste,
      Abspielknopf, Filterknopf, Info-Knopf, Schließknopf des Quellenfensters,
      Zurücksetzen-Knopf der Filter. Alle mindestens 44px in der kleineren Richtung.
      Was darunter liegt, im Bericht nennen.

- [ ] **Schritt 3: Die Marker.** Prüfen und **dokumentieren**, wie gut die kleinsten
      Kreismarker (4px) mit dem Finger zu treffen sind. Nicht beheben — die Größe
      kodiert Daten, und die Liste ist der zweite Zugang. In den Bericht, damit die
      Einschränkung bekannt ist.

- [ ] **Schritt 4: Konsole** auf allen Seiten fehlerfrei.

- [ ] **Schritt 5: Committen.**

## Nicht in diesem Plan

Historische Fotos, die offenen Bibliographie-Titel, die Datenfragen (ungültiges
Datum bei Nr. 218, Zählungen ohne Datum, nie geokodierte Unternehmen).
