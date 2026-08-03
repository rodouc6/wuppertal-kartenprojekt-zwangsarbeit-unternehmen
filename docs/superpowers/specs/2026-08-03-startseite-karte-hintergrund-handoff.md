# Handoff: Startseite — Kartenvorschau als Hintergrund-Ebene im Auftakt (Variante 1a)

Ziel-Repository: `rodouc6/wuppertal-kartenprojekt-zwangsarbeit-unternehmen` (statisches HTML/CSS/JS, GitHub Pages)

## Überblick
Die Übersichtskarte der Startseite (Stadtgrenze, Wupper, 426 Standorte) verlässt ihren grauen Kasten und läuft als gedämpfte Hintergrund-Ebene hinter dem Titelbereich. Der Text bleibt vorn; ein weicher Verlauf (CSS-Mask) hält die Textseite frei. Die Kennzahlen rücken vom rechten Rand des Intros in eine dreispaltige Zeile unter den Auftakt. Mobil legt sich die Karte hinter den Titel und läuft nach unten aus; die Kennzahlen bleiben dort die gewohnte vertikale Liste.

## Zu den Design-Dateien
Die beigelegte Datei `Startseite Kartenvarianten.dc.html` ist eine **Design-Referenz in HTML** (Prototyp, Option 1a — Desktop 1280px und Mobil 390px), kein Produktionscode. Aufgabe ist, das Design **im bestehenden Code des Repos umzusetzen** — mit den vorhandenen Dateien `index.html`, `style.css` und `js/startseite.js` und deren Konventionen (kein Framework, inline dokumentierter Stil, deutsche Bezeichner). Die Zeichenlogik `baueUebersichtskarte()` wird weiterverwendet, nicht ersetzt.

## Fidelity
**High-fidelity.** Farben, Typografie und Abstände entsprechen dem bestehenden System der Seite und sind exakt zu übernehmen.

## Konkrete Umsetzung in diesem Repo

### 1. `index.html`
Heute: `.intro` ist ein Grid aus `.intro-text` und `#kennzahlen`; `#kartenvorschau` steht als eigener Block darunter (mit `tabindex="0" role="link" aria-label`).

Neu:
```html
<section class="intro">
  <div id="kartenvorschau" aria-hidden="true"></div>
  <div class="intro-text">
    <!-- h1, zwei Absätze, .intro-actions: UNVERÄNDERT -->
  </div>
</section>

<dl id="kennzahlen">
  <div class="kennzahl"><dt></dt><dd></dd></div>
  <div class="kennzahl"><dt></dt><dd></dd></div>
  <div class="kennzahl"><dt></dt><dd></dd></div>
</dl>
```
- `#kartenvorschau` wandert IN die `.intro` (erstes Kind) und verliert `tabindex`, `role` und `aria-label` — die Ebene ist dekorativ (`aria-hidden="true"`, `pointer-events: none`); den Weg zur Karte trägt weiterhin der Knopf „Zur Karte →“. Damit entfällt kein Zugang, es gab ihn doppelt.
- `#kennzahlen` verlässt die `.intro` und steht direkt danach.

### 2. `js/startseite.js` — `baueUebersichtskarte()`
- Gedämpfte Farbwerte für die Hintergrund-Ebene:
  - Stadtgrenze: `fill="#f8f8f6" stroke="#e3e3de"` (statt `#f2f2ef` / `#c9c9c4`), `stroke-width` bleibt 1.5
  - Wupper: `stroke="#ccd8e0"` (statt `#a8bac6`), Stärke/Linecaps unverändert
  - Standorte: `fill="#26272a" fill-opacity="0.3"` (statt 0.72), `stroke="rgba(255,255,255,0.6)" stroke-width="0.9"`, `r=4` unverändert
- Die `click`/`keydown`-Zuhörer am Container ersatzlos entfernen (Fläche ist nicht mehr klickbar).
- Projektion, viewBox-Rechnung, Pfadaufbau: unverändert.

### 3. `style.css`
Bestehende `#kartenvorschau`-Regeln (Breitendeckel, Rahmen, Cursor, focus-visible, die `circle`-Regel bei 600px) ersetzen durch:

```css
.startseite .intro {
  position: relative;
  overflow: hidden;
  grid-template-columns: 1fr;   /* Kennzahlen sind ausgezogen */
  padding: 88px 48px 64px;
}

.startseite .intro-text {
  position: relative;            /* liegt über der Karten-Ebene */
  max-width: 760px;
}

#kartenvorschau {
  position: absolute;
  top: -56px;
  right: -48px;
  width: 56%;
  border: none;
  margin: 0;
  cursor: default;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(100deg, rgba(0,0,0,0) 8%, #000 50%);
  mask-image: linear-gradient(100deg, rgba(0,0,0,0) 8%, #000 50%);
}

#kartenvorschau svg { display: block; width: 100%; height: auto; }

/* Kennzahlen: dreispaltige Zeile unter dem Auftakt */
#kennzahlen {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 32px;
  padding: 8px 48px 48px;
  border-top: none;              /* die Kopflinie trägt jetzt jede Zelle */
  margin: 0;
}

#kennzahlen .kennzahl {
  display: block;
  border-top: 2px solid #17181a;
  border-bottom: none;
  padding: 14px 0 0;
}

#kennzahlen dt { font-size: 14px; color: #6b6c6e; font-weight: 400; }
#kennzahlen dd { margin: 4px 0 0; font-size: 30px; font-weight: 600; color: #17181a; }
#kennzahlen .kennzahl-zusatz { display: block; margin-top: 4px; font-size: 12px; color: #6b6c6e; }
```

Mobil (in den bestehenden `@media (max-width: 900px)`-Block):
```css
.startseite .intro { padding: 44px 24px 36px; }

#kartenvorschau {
  top: -24px;
  right: -120px;
  width: 150%;
  -webkit-mask-image: linear-gradient(185deg, #000 12%, rgba(0,0,0,0) 80%);
  mask-image: linear-gradient(185deg, #000 12%, rgba(0,0,0,0) 80%);
}

/* Kennzahlen mobil: wieder die vertikale Liste des Bestands */
#kennzahlen { grid-template-columns: 1fr; gap: 0; padding: 0 24px 40px; border-top: 2px solid #17181a; }
#kennzahlen .kennzahl { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 12px; border-top: none; border-bottom: 1px solid #e8e8e8; padding: 14px 0; }
#kennzahlen dd { font-size: 24px; margin: 0; }
```
Die bestehende Punktvergrößerung bei schmalen Schirmen bleibt sinnvoll: `@media (max-width: 600px) { #kartenvorschau circle { r: 5.5; } }` — beibehalten, aber wegen der größeren Darstellungsbreite (150 %) auf `r: 6` anheben.

## Screens / Ansichten

### Desktop (≥ 901px)
- **Nav**: unverändert (48px, sticky, border-bottom `#e8e8e8`).
- **Auftakt**: relative Fläche, Padding `88px 48px 64px`. Karten-SVG absolut `top:-56px; right:-48px; width:56%`, Maske `linear-gradient(100deg, transparent 8%, #000 50%)` (blendet zur Textseite hin aus). Textblock max. 760px: H1 44px/600/1.2/-0.01em `#17181a`, Absätze 17px/1.75 `#4a4b4e` (max. 56ch), Knöpfe unverändert (14px/600, 12px 20px, primär `#17181a`, sekundär Rahmen `#d4d4d2`).
- **Kennzahlen-Zeile**: 3 Spalten, gap 32px; je Zelle `border-top: 2px solid #17181a`, Label 14px `#6b6c6e`, Wert 30px/600 `#17181a`, Zusatzzeile 12px `#6b6c6e` (nur erste Zelle).
- Alles Weitere (Karussell, Statistiken, Footer) unverändert.

### Mobil (≤ 900px)
- Karte hinter dem Titelbereich: `top:-24px; right:-120px; width:150%`, vertikale Maske `linear-gradient(185deg, #000 12%, transparent 80%)` — läuft nach unten aus.
- H1 30px (Bestand), Knöpfe mit `min-height: 44px` (Trefffläche).
- Kennzahlen als vertikale Liste (Bestandsoptik), Wert 24px.

## Interaktionen & Verhalten
- Die Karten-Ebene ist **nicht klickbar** (`pointer-events:none`, dekorativ); Zugang zur Karte ausschließlich über „Zur Karte →“.
- Keine Animationen. Hover-Zustände der Knöpfe unverändert (primär `#33343a`, sekundär Rahmen `#17181a`).
- Punkte bleiben alle gleich groß (r=4; mobil 6) — die Vorschau zeigt Verteilung, nicht Umfang.

## Design-Tokens (Ergänzungen zur Hintergrund-Ebene)
- Stadtgrenze-Fläche `#f8f8f6`, -Linie `#e3e3de`
- Wupper `#ccd8e0`
- Punkte `#26272a` bei `fill-opacity: 0.3`, Rand `rgba(255,255,255,0.6)` 0.9
- Alle übrigen Werte: bestehendes System (`#17181a`, `#4a4b4e`, `#6b6c6e`, `#e8e8e8`, `#d4d4d2`, Inter)

## Barrierefreiheit
- `role="link"`/`tabindex` am `#kartenvorschau` entfernen (sonst ein leeres, nicht bedienbares Tastaturziel).
- `aria-hidden="true"` an den Container (SVG war es schon).
- Kontrast des Texts bleibt gewahrt: Die Punkte liegen bei 30 % Deckung auf fast weißem Grund; unter dem Textblock blendet die Maske die Karte zusätzlich aus. Nach der Umsetzung mit realem Umbruch prüfen (besonders 900–1100px).

## Dateien in diesem Paket
- `README.md` — diese Anleitung
- `Startseite Kartenvarianten.dc.html` — Design-Referenz; maßgeblich ist Option **1a** (Frames „1a Desktop“ / „1a Mobil“). Die Varianten 1b/1c/2a darin sind verworfene Alternativen.

---

## Abweichungen bei der Umsetzung (3.8.2026)

Der Handoff verlangt, den Kontrast „nach der Umsetzung mit realem Umbruch"
zu prüfen. Das ergab zwei Befunde:

**1. `width: 150%` wurde zu `width: min(150%, 620px)`.** Die 150 % sind auf
390px gerechnet (→ 585px Kartenbreite). Bei 900px, wo die mobile Anordnung
noch gilt, wären es 1350px Breite und 1125px Höhe: Der Auftakt zeigt davon
die obere linke Ecke — eine blasse Linie mit ein paar verstreuten Punkten,
in der das Stadtgebiet nicht mehr zu erkennen ist. Mit dem Deckel bleibt die
Karte ab rund 413px Schirmbreite stehen und rückt stattdessen nach rechts;
bei 390px ändert sich nichts.

**2. Der Kontrast trägt.** Punkte mit `fill-opacity: 0.3` ergeben auf Weiß
rund `#bfbfc0`. Gegen den Fließtext `#4a4b4e` sind das 4,7 : 1 — über der
WCAG-AA-Schwelle von 4,5 : 1 für Fließtext, und der Titel liegt als
30px-Fettschrift ohnehin weit darüber. Die gedämpften Werte des Handoffs
sind damit nicht bloß Geschmack, sondern die Bedingung dafür, dass Text
über der Ebene stehen darf. **Wer sie erhöht, muss neu rechnen.**

Geprüft bei 1280, 1000, 901, 900, 640 und 390px Fensterbreite.
