# Mobile Darstellung

**Stand:** 1.8.2026

## Ziel

Die Website ist auf Telefonen bislang unbrauchbar, wo es darauf ankommt: Auf
`map.html` liegen Seitenleiste, Zeitregler und Legende übereinander, weil alle drei
absolut positioniert sind und feste Breiten haben. Wer den Link auf dem Telefon
öffnet, sieht nichts Bedienbares.

Ziel ist eine gleichwertige Darstellung auf schmalen Schirmen — dieselben Daten,
dieselben Funktionen, andere Anordnung.

## Grundsatz: eine Codebasis

Kein zweiter Seitenbaum, keine Weiche auf dem Server, keine Erkennung des Geräts.
Dieselben Dateien, dieselbe Adresse; unterhalb einer Breitenschwelle greifen andere
Regeln. Eine parallel gepflegte Mobilfassung würde jede künftige Änderung verdoppeln
und mit der Zeit auseinanderlaufen.

**Schwelle: 760px.** Diese Breite ist im Stylesheet bereits in Gebrauch (Balken der
Branchenübersicht) und passt zur Sache: Die Seitenleiste ist 360px breit, darunter
bliebe für die Karte weniger als die Hälfte des Schirms.

## `map.html` — das eigentliche Stück Arbeit

Fünf Elemente konkurrieren um den Platz: Karte, Seitenleiste mit 417 Einträgen,
Zeitregler, Filterpanel und Legende. Nebeneinander geht das auf 390px nicht.

### Die Karte bekommt die Fläche

`#map-panel` füllt den Schirm. Ziehen, Zoomen und Doppeltippen bleiben aktiv —
anders als in der Vorschau auf der Startseite ist die Karte hier zum Arbeiten da.
`touchZoom` muss eingeschaltet sein.

### Die Seitenleiste wird ein Bodenblatt

Statt rechts einzuschweben, fährt sie von unten ein. Die vorhandene Mechanik trägt
das: `#sidebar.collapsed` verschiebt heute mit `translateX`; auf schmalen Schirmen
wird daraus `translateY`. Zwei Zustände genügen:

- **geschlossen** — eine Griffleiste am unteren Rand, etwa 56px hoch, mit der Zahl
  der sichtbaren Einträge („126 Unternehmen") und einem Anfasser. Die Karte ist
  vollständig sichtbar.
- **offen** — das Blatt nimmt etwa 75% der Höhe ein, darüber bleibt ein Streifen
  Karte stehen, damit der räumliche Bezug nicht verlorengeht. Innen scrollt die
  Liste wie bisher.

Umgeschaltet wird durch Tippen auf die Griffleiste **und durch Ziehen** an ihr. Der
erste Entwurf verzichtete aufs Ziehen, weil es Gestenerkennung braucht; die Prüfung
am Gerät hat gezeigt, dass die Erwartung zu stark ist — ein Blatt, das aussieht wie
ziehbar, muss ziehbar sein. Gezogen wird allein an der Griffleiste, nicht am
Listeninhalt, sonst gerät die Geste mit dem Scrollen der Liste in Streit.

Der bestehende `#sidebar-toggle` (der schmale Knopf an der Seite) wird auf schmalen
Schirmen ausgeblendet — die Griffleiste ersetzt ihn.

**Beim Antippen eines Markers** öffnet sich das Blatt nicht automatisch: Der Eintrag
wird aktiv, das Popup erscheint auf der Karte. **Ein Tipp auf dieses Popup** öffnet
dann das Blatt und rückt den zugehörigen Eintrag ins Bild. So bleibt der Zugang
zweistufig — erst die Kurzauskunft auf der Karte, auf Wunsch der volle Eintrag.

### Die Filter bleiben, wo sie sind

Im geöffneten Blatt, wie heute in der Seitenleiste. Ein eigenes Vollbild-Overlay
wäre der reinere Weg, verdoppelt aber die Filterlogik. Zu prüfen ist nur, ob die
Auswahllisten (`.dropdown-list`) innerhalb des Blattes noch aufklappen, ohne
abgeschnitten zu werden.

### Der Zeitregler

`#timeline-panel` rechnet heute mit der Seitenleiste: `width: min(580px, calc(100%
- 400px))`, dazu ein Versatz von 180px nach links. Beides entfällt auf schmalen
Schirmen — der Regler nimmt die Breite abzüglich eines Randes und sitzt über der
Griffleiste des Bodenblatts.

Datum und Beschriftung stehen heute rechts neben dem Regler. Dafür fehlt der Platz;
sie rücken darüber. Der Abspielknopf bleibt links.

### Legende und Info-Knopf

Bleiben, wie sie sind — der Knopf ist bereits vorhanden und die Legende
standardmäßig zuklappbar. Zu prüfen ist allein, ob sie unten links mit dem
Zeitregler oder der Griffleiste kollidiert; notfalls wandert sie nach oben links
unter die Zoom-Knöpfe.

### Das Quellenfenster

`.quellen-overlay` ist `position: fixed` mit `width: min(620px, 100%)`. Auf schmalen
Schirmen soll es die volle Fläche einnehmen, mit einem gut treffbaren Schließknopf
oben rechts. Die Fokusfalle bleibt unverändert.

### Treffbarkeit

Die Kreismarker sind zwischen 4 und 24px groß. Die kleinsten sind mit dem Finger
kaum zu treffen. Leaflet bietet keine einfache Vergrößerung der Trefferfläche;
`circleMarker` reagiert genau auf seiner Fläche.

Das wird **nicht** durch größere Radien gelöst — die Größe kodiert Daten. Stattdessen
bleibt es bei der Liste als zweitem Zugang: Wer einen kleinen Standort sucht, findet
ihn über das Bodenblatt. Der Punkt wird in der Umsetzung nur geprüft und
dokumentiert, nicht umgangen.

Bedienelemente dagegen — Griffleiste, Abspielknopf, Filterknopf, Schließknopf des
Quellenfensters — sollen mindestens 44px in der kleineren Richtung messen.

## Die übrigen Seiten

Weniger Aufwand, aber nicht nichts:

| Seite | zu tun |
|---|---|
| `index.html` | Umbruch besteht bereits (900px). Prüfen: Kartenvorschau und Hinweiskasten bei 390px |
| `about.html` | Die beiden Codeblöcke scrollen bereits seitlich. Prüfen |
| `about/statistiken.html` | Diagramme bei 390px — Chart.js skaliert, aber Beschriftungen können überlappen |
| `about/bibliographie.html` | Lange Titel mit Einzug; prüfen, ob URLs überlaufen |
| `impressum.html` | Fließtext, vermutlich unauffällig |

Alle nutzen `main` mit `max-width: 720px` und `padding: 0 24px` — das trägt
grundsätzlich. Erwartet werden Kleinigkeiten, keine Umbauten.

## Was nicht dazugehört

- Kein Wischen auf der Karte selbst; das Bodenblatt laesst sich ziehen (siehe oben)
- Keine Geräteerkennung, keine gesonderte Adresse
- Keine Änderung an Datenmodell, Filterlogik oder Farbgebung
- Keine App, kein Servicearbeiter, keine Offlinefähigkeit

## Prüfung

Im Browser bei 390px (kleines Telefon), 430px (großes Telefon) und 768px (knapp
über der Schwelle, muss noch das Schreibtischlayout zeigen). Zusätzlich bei 1280px
gegenprüfen, dass sich am bestehenden Layout nichts verschoben hat — das ist die
eigentliche Gefahr dieser Arbeit.

Geprüft wird mit echten Fingerbreiten im Blick: Wer einen Knopf nur mit der
Mauszeigerspitze trifft, hat ihn auf dem Telefon nicht.
