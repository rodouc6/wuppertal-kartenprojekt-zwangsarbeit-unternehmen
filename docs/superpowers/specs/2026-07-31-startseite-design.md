# Startseite: Ausbau mit Kartenvorschau und Eintragsbeispiel

**Stand:** 31.7.2026 · **Grundlage:** Design-Handoff „Startseite 1a" (Aufbau),
Handoff „Startseite 1b" (Schrift und Farben), Textbausteine der Website-v1.odt,
Punkte 1–4 der Liste vom 30.7.2026

## Ziel

Die Startseite trägt derzeit zwei Absätze, einen Zufallseintrag und einen Link. Sie
soll zwei Zugänge nebeneinanderstellen: die Karte räumlich, ein einzelner Eintrag
textuell — und dazwischen die belegten Zahlen.

## Herkunft: zwei Entwürfe, geteilt

Der **Aufbau** stammt aus Variante 1a: Intro links, Kennzahlen als Liste rechts
daneben, Kartenvorschau quer darunter, zweispaltiger Abschnitt am Fuß.

**Die Farben** stammen aus Variante 1b: weißer Grund
statt Papierton, Grauwerte statt Rot.

Damit entfällt aus 1a alles, was seinen editorialen Charakter ausmachte — Serifen,
warmes Off-White, das dunkle Rot. Auch der sparsame Datenakzent `#8b1a1a`, den 1b
noch vorhielt, entfällt: die Seite bleibt vollständig auf Grauwerten. Das bisherige
`#8b0000` der Website verschwindet damit ebenfalls.

Kantig bleibt es: keine abgerundeten Ecken, keine Schatten außer an Karten-Popups,
Trennlinien statt Kästen, `border-top 2px` als Tabellenkopf-Motiv über der
Kennzahlenliste. Das ist eine Form-, keine Farbeigenschaft und gehört zum 1a-Aufbau.

## Farben

| Rolle | Wert | im 1a-Entwurf |
|---|---|---|
| Grund | `#ffffff` | `#faf9f6` |
| Überschriften, Wortmarke | `#17181a` | `#1c1a17` |
| Fließtext | `#4a4b4e` | `#3d3a34` |
| Sekundärtext, Labels | `#77787a` | `#6b6459` |
| Rubriken, Tertiär | `#8a8a88` | `#8a8272` |
| Trennlinien | `#e8e8e8` | `#e3ddd2` |
| Rahmen, gedämpfte Kanten | `#d4d4d2` | `#d9cfc0` |
| Flächen (aktive Navigation) | `#f0f0f0` | — |
| Kartenpunkte | `#26272a`, Deckkraft 0,55 | `#8b0000` |

Wo der Entwurf `#8b0000` einsetzte, tritt an die Stelle:

- **Overline** → `#77787a`
- **Primärbutton** → Grund `#17181a`, Schrift weiß, Hover `#33343a`
- **Sekundärbutton** → Schrift `#17181a`, Rahmen `#d4d4d2`, Hover-Rahmen `#17181a`
- **Aktiver Navigationslink** → Fläche `#f0f0f0`, Schrift `#17181a` (Lösung aus 1b
  statt der roten Unterstreichung aus 1a)
- **Rubriktitel im Eintragsbeispiel** → `#17181a`
- **Linke Spaltenkante** → `#17181a`, rechte `#d4d4d2`

## Schriften — keine fremden

Die bestehende Angabe bleibt unverändert:

```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

Damit werden **keine** Schriftdateien geladen — weder von Google noch aus dem
Repository. Wer Inter installiert hat, sieht Inter; alle anderen sehen die
Systemschrift ihres Geräts. Genau so verhält sich die Website schon heute: Es gibt
kein `@font-face` in `style.css`, die Angabe war immer nur ein Wunsch mit Rückfall.

Inter selbst steht unter der SIL Open Font License und wäre frei einbettbar. Solange
sie nicht mitgeliefert wird, kostet die Seite keinen einzigen Fremdaufruf und braucht
keine Datenschutzseite.

Die Folge fürs Erscheinungsbild: Die breiten Versalien, die den Entwürfen ihren
Charakter geben (Archivo Expanded), gibt es nicht. Überschriften und Kennzahlen
stehen in der Systemschrift. Die Größenskala des Entwurfs bleibt und trägt die
Wirkung: 44 / 30 / 19 / 17 / 14 / 13 / 12 / 11 px, dazu Sperrung bei Overline und
Rubriken.

Sollte das zu nüchtern wirken, ist Inter nachträglich mit einer einzigen Datei
einbindbar, ohne dass sich sonst etwas ändert.

## Aufbau

**1. Navigation** — Struktur unverändert aus `index.html`, Höhe 60px, Trennlinie
unten `#e8e8e8`, Innenabstand `0 48px`. Wortmarke links: „Zwangsarbeit in Wuppertal
1939–1945", 600, 14px, Sperrung 0.02em — die Jahreszahl ohne Farbauszeichnung.

**2. Intro** (`padding 72px 48px 56px`, Raster `1fr 380px`, Abstand 64px)

Links:
- Overline, 12px, Versalien, Sperrung 0.14em, `#77787a`:
  **„EIN DIGITALES KARTENPROJEKT · NACH FLORIAN SPEER (2003)"**
- H1, 600, 44px/1.2, Sperrung -0.01em: „Zwangsarbeit in Wuppertaler Unternehmen
  1939–1945"
- Zwei Absätze, 17px/1.75, `#4a4b4e`, max. 56 Zeichen Breite (Texte unten)
- Zwei Schaltflächen: „Zur Karte →" (primär, → `map.html`), „Über das Projekt"
  (sekundär, → `about.html`)

Rechts — Kennzahlenliste, `border-top 2px #17181a`, Zeilen mit `border-bottom 1px
#e8e8e8`, Label links (14px `#77787a`), Wert rechts (600, 30px):

| Label | Wert | Herkunft |
|---|---|---|
| Dokumentierte Unternehmen | 417 | `stats.totalCompanies` |
| Standorte auf der Karte | 431 | `stats.totalLocations` |
| Stichtage 1940–1945 | 47 | `dates.length` |

Zur Laufzeit aus `data/meta.json` gelesen, nicht fest eingetragen. Der Entwurf nannte
vier Werte; „Stadtteile 13" entfällt — eine Verwaltungsgliederung sagt über den
Gegenstand wenig.

Eine Gesamtzahl der Zwangsarbeiter erscheint nicht. Die Summe aller Zählungen
(124.172) ist keine Personenzahl, sondern zählt dieselben Menschen an jedem Stichtag
erneut. Der höchste Stichtagswert wiederum lebt davon, dass jede letzte Zählung einer
Art bis Kriegsende fortgeschrieben wird — am 28.2.1945 stehen darin auch Meldungen
aus 1942. Beide Zahlen wären Scheingenauigkeit.

**3. Kartenvorschau** (`margin 0 48px`, Höhe 300px, Rahmen 1px `#e8e8e8`)

Eine Leaflet-Karte, nicht zum Arbeiten: Ziehen, Zoom und Mausrad aus, keine Filter,
keine Seitenleiste. Ein Klick auf die Fläche führt nach `map.html`.

Basemap wie auf der Karte (OSM), Punkte als `circleMarker` in `#26272a`,
Deckkraft 0,55, Kontur `#17181a`.

Ohne Zeitregler zeigt die Vorschau **einen** Zustand: den **Höchststand je Standort**
über alle Stichtage. Das ist dieselbe Aggregation, die der Zufallseintrag heute schon
benutzt („Bis zu N Zwangsarbeiter"). Die Radien folgen den gestuften Werten der
Hauptkarte, im Vorschaumaßstab gleichmäßig verkleinert — 420 Punkte auf 300px Höhe
laufen sonst ineinander. Der Faktor wird beim Bauen visuell bestimmt.

Hinweis oben rechts (weißer Kasten, Rahmen `#e8e8e8`, 12px):
**„Punktgröße = höchste überlieferte Zahl je Standort"**

**4. Zwei Spalten** (`padding 40px 48px 56px`, Raster `1fr 1fr`, Abstand 32px, je
`border-left 3px` und `padding-left 20px`)

Links — **„AUS DEN EINTRÄGEN"** (Kante `#17181a`): der Zufallseintrag aus
`js/landing.js`, unverändert in der Logik. Titelzeile 600, 19px,
`#17181a` („Nr. 112 · Textilwerk, Barmen"), Metazeile 14px/1.7 `#4a4b4e`, Link →
`map.html?nr=…`.

Rechts — **„STATISTIKEN"** (Kante `#d4d4d2`): gleicher Rubrikstil. Text:
„Auswertungen zu Branchen, Beschäftigtenzahlen und zur zeitlichen Entwicklung der
Zwangsarbeit." Darunter Link „Zu den Statistiken →" nach `about/statistiken.html`.

Der Entwurf hatte hier einen Quellen-Kasten. Er entfällt — seine Zuschreibung an das
Stadtarchiv Wuppertal trifft nicht zu, und die Quellenlage gehört auf die Seite „Über
das Projekt", nicht in eine Randspalte.

**5. Fußzeile** (Trennlinie oben, `padding 20px 48px`, 12px `#8a8a88`): Projekttitel
links, „Impressum" rechts. Der Entwurf nannte daneben „Datenschutz"; ohne
eingebundene Fremdinhalte wird die Seite nicht gebraucht.

## Gemeinsame Datei: `js/daten.js`

Kartenvorschau und Hauptkarte rechnen sonst zweimal dasselbe, und zwar verschieden.
Die geteilte Logik zieht in eine neue Datei, die vor `map-app.js` bzw. `landing.js`
eingebunden wird — so, wie `branchen.js` es für Farben und Gruppen schon tut.

Hinein kommt aus `map-app.js`, unverändert im Verhalten:

- `RADIUS_STEPS`, `MIN_RADIUS`, `RADIUS_MAX`, `radiusForCount(count)`
- `getCompanyCount(company, dateISO)` — Summe der zum Stichtag laufenden Zählungen,
  **halboffen** (`datumVon <= Datum < datumBis`)
- `buildCompanies(features)`
- `formatDateDE(iso)`
- `OHNE_ANGABE_ZWEIGE` — die Leerstellen `"xxx"` und `"unbekannt"`, heute doppelt
  gepflegt in `map-app.js` und `landing.js`

Neu hinzu, weil die Vorschau es braucht:

- `hoechststand(company)` — größter überlieferter Wert über alle Zählungen

Nicht hinein kommt, was mit Darstellung zu tun hat: Markerstile, Legende,
Seitenleiste, Popups. Die Datei beantwortet Fragen über die Daten, nicht über ihr
Aussehen.

**Warum das zählt:** Der 1a-Entwurf schrieb der Vorschau einen kontinuierlichen
Radius `min(4+√n·1,1; 30)` und den Stichtag 31.3.1943 vor, der 1b-Entwurf ein
geschlossenes Zeitintervall. Zum 31.3.1943 ergäbe letzteres 6.472 statt 6.429
Personen: An jedem Stichtag, an dem eine Zählung endet und die nächste beginnt, zählt
die Firma doppelt. Zwei Karten auf derselben Website mit verschiedenen Zahlen sind
kein Schönheitsfehler.

## Texte

Aus `Textbausteine der Website-v1.odt`, ausformuliert.

**Absatz 1:**

> Dieses Projekt kartiert den Einsatz von Zwangsarbeiterinnen und Zwangsarbeitern in
> Wuppertaler Unternehmen während des Zweiten Weltkriegs. Grundlage ist die
> Lokalstudie von Florian Speer aus dem Jahr 2003, die mehr als 400 Betriebe
> nachweist.

**Absatz 2:**

> Die interaktive Karte erschließt die Unternehmensstandorte räumlich — mit Angaben
> zur Branche, zum Umfang der Zwangsarbeit an den überlieferten Stichtagen und zu den
> nachgewiesenen Rüstungsgütern.

Beide Entwürfe schrieben die Grundlage dem Stadtarchiv Wuppertal zu. Das trifft nicht
zu: Der Großteil der Zahlen stammt aus den Mitteilungen der Unternehmen an die
Industrie- und Handelskammer Wuppertal, die heute im Rheinisch-Westfälischen
Wirtschaftsarchiv in Köln liegen. Deshalb nennt die Overline Speer statt eines
Archivs.

## Zur Kategorie „Deutsche"

Die Punktgröße rechnet alle Arten ein, `Deutsche` eingeschlossen. Die Kategorie meint
bei Speer nicht die freie Stammbelegschaft, sondern mehr oder weniger
zwangsverpflichtete Deutsche — sie gehört damit in die Darstellung von Zwangsarbeit,
mit ihrer eigenen Zwangsintensität. Sie trägt 285 Zählungen und 62.011 Personen bei
112 Unternehmen.

Was die Karte zeigt, ist eine Summe über sehr verschiedene Grade von Zwang — von
KZ-Häftlingen über Kriegsgefangene und Ostarbeiter bis zu dienstverpflichteten
Deutschen. Die Differenzierung leistet der vorhandene Filter nach Art der
Zwangsarbeit.

Zwei Randfälle, die keine Behandlung brauchen: `Deutsche und Ausländer` (2 Zählungen,
1.328 Personen, in der Quelle nicht aufgeschlüsselt) und `keine Kriegsgefangene`
(eine Negativmeldung, Nr. 468 zum 31.12.1944, ohne Zahlenwert — sie fließt in keine
Summe ein).

## Was nicht übernommen wird

| Aus den Entwürfen | Warum nicht |
|---|---|
| Spectral, Public Sans (1a), Archivo (1b) | Bestehende Schriftangabe, keine Fremddateien |
| IBM Plex Mono | Keine Schriftdateien |
| Papierton `#faf9f6`, Rot `#8b0000` (1a) | Weiß und Grauwerte |
| Datenakzent `#8b1a1a` (1b) | Vollständig auf Grauwerte |
| CARTO-Basemap | Bestehende OSM-Kacheln |
| Kennzahl „Stadtteile 13" | Sagt über den Gegenstand wenig |
| Quellen-Kasten unten rechts | Falsche Zuschreibung; gehört auf „Über das Projekt" |
| Fußzeilen-Link „Datenschutz" | Keine Fremdinhalte mehr, sobald Schriften lokal liegen |
| Kontinuierlicher Radius `min(4+√n·1,1; 30)` | Gestufte Radien der Hauptkarte |
| Geschlossenes Zeitintervall | Zählt an Stichtagen doppelt |
| Fester Stichtag 31.3.1943 in der Vorschau | Höchststand je Standort, ohne Regler |

## Abgrenzung

Diese Spezifikation beschreibt allein die Startseite. Die Seite „Über das Projekt" —
Hintergrund, Weg von der Druckseite zum Datensatz, Ausblick — folgt getrennt, ebenso
die historischen Fotos. Die rote Farbgebung verschwindet in diesem Schritt von der
Startseite; ob und wann die übrigen Seiten nachziehen, ist eine eigene Entscheidung.
