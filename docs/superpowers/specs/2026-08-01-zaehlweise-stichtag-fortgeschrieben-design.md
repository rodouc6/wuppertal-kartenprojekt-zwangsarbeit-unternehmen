# Zwei Zählweisen: Stichtag und Fortgeschrieben

**Stand:** 1.8.2026

## Ziel

Die Karte zeigt zu jedem Stichtag mehr Zwangsarbeiter, als für diesen Tag
überliefert ist. Künftig soll man zwischen beiden Lesarten wählen können und
sehen, welche man gerade vor sich hat.

## Der Befund

Jede Zählung gilt heute weiter, bis derselbe Betrieb dieselbe ZA-Art neu meldet
(`datumVon <= D < datumBis`, gebildet in `build_data.py`). Betriebe, die nur
einmal melden, tragen ihren Wert bis zum Kriegsende. Summiert man über alle
Betriebe, entsteht eine monoton wachsende Kurve:

Personen, je Unternehmen einmal gezählt (die elf Betriebe mit mehreren
Standorten tragen an jedem dieselbe `records`-Liste):

| Stichtag | am Tag gemeldet | fortgeschrieben |
|---|---:|---:|
| 27.4.1943 | 5.681 | 7.950 |
| 31.1.1944 | 20.979 | 28.945 |
| 30.6.1944 | 20.207 | 32.789 |
| 31.12.1944 | 19.777 | 36.435 |
| 28.2.1945 | 1.290 | **36.606** |

Am 28.2.1945 trägt genau **ein** Betrieb eine für diesen Tag überlieferte Zahl;
die Karte zeigt 197 Betriebe mit einer Zahl. Der Wert 36.606 addiert Stände von
1942 zu Ständen von Ende 1944.

Die Überlieferung kommt in Schüben. An 30 der 47 Stichtage melden weniger als
15 Betriebe, an sieben genau einer. Acht Tage tragen die Erhebung:

| Tag | Meldungen | davon mit Zahl |
|---|---:|---:|
| 13.8.1942 | 84 | 84 |
| 28.10.1942 | 97 | 97 |
| 27.4.1943 | 247 | 131 |
| 31.1.1944 | 58 | 58 |
| 11.3.1944 | 109 | 107 |
| 30.6.1944 | 68 | 68 |
| 5.7.1944 | 56 | **0** |
| 31.12.1944 | 54 | 54 |

Nicht jede Meldung trägt eine Zahl: Speer verzeichnet mitunter die Art der
Zwangsarbeit ohne Ziffer. Am 5.7.1944 melden 56 Betriebe, keiner mit Zahl — im
Stichtag-Modus bleibt die Karte an diesem Tag leer, obwohl an ihm erhoben wurde.
Diese Lücke wird benannt, nicht überspielt.

`map.html` enthält bereits ein statisches `<span id="timeline-mode">Stichtag</span>`,
das kein Skript anfasst. Der Zeitregler behauptet heute also „Stichtag" und
liefert Fortschreibung.

## Begriffe

**Stichtag** — gezählt wird, was für genau diesen Tag überliefert ist:
`r.datumVon === D`.

**Fortgeschrieben** — die heutige Zählweise: `r.datumVon <= D < r.datumBis`.

Nicht „kumulativ": Es werden keine Personen aufaddiert, sondern zuletzt
gemeldete Stände fortgeschrieben. Wer „kumulativ" liest, denkt an eine
Gesamtzahl der Betroffenen — die ist aus dieser Quelle nicht zu gewinnen.

## Der Umschalter

An die Stelle von `#timeline-mode` treten zwei Knöpfe, links neben dem Datum.
Einer ist immer aktiv, erkennbar wie die übrigen aktiven Schalter der Seite
(dunkler Grund, keine Farbe).

Erklärung beim Überfahren, als `title`:

- **Stichtag** — „Nur die Zahlen, die für diesen Tag überliefert sind."
- **Fortgeschrieben** — „Visualisiert wird hier unter der Annahme, dass die
  Mitteilungen zum Stichtag in der Folgezeit stabil waren."

Beim Laden ist **Fortgeschrieben** aktiv; der Start-Stichtag bleibt, wie er
heute bestimmt wird. Die Umschaltung ändert nichts an Filtern, Auswahl oder
Kartenausschnitt — nur die Zahlen und damit die Punktgrößen.

## Wirkung

### Zählung

`getCompanyCount()` in `js/daten.js` bekommt die Fallunterscheidung. Sie liest
dafür ein globales `zaehlmodus`, wie sie heute schon das globale `filters`
liest — mit derselben Folge: von der Startseite aus nicht aufrufbar. Der
Startwert steht in `map-app.js`.

`hoechststand()` und `hoechststandMitZeitpunkt()` bleiben unberührt. Sie
beantworten eine andere Frage (Maximum über alle Zeitpunkte) und laufen auf der
Startseite ohne beide globalen Zustände.

### Marker

Die Radien folgen der gewählten Zählung; `radiusForCount()` und die Stufen
bleiben unverändert. Im Stichtag-Modus werden Betriebe ohne Meldung an diesem
Tag zusätzlich blasser gezeichnet, damit „an diesem Tag nichts überliefert"
von „hier waren wenige" unterscheidbar bleibt.

### Zeitregler

Im Stichtag-Modus steht neben dem Datum, was an ihm überliefert ist:

> 27.4.1943 · 247 Meldungen, davon 131 mit Zahl

Auf schmalen Schirmen verkürzt zu „247 Meldungen". Im Fortgeschrieben-Modus
entfällt die Angabe — dort erklärt sie nichts.

Die Zahlen kommen aus `data/meta.json`, neu erzeugt von `build_data.py`:
zwei Felder parallel zu `dates` mit der Zahl der an diesem Tag meldenden
Unternehmen (nicht Standorte) — einmal alle, einmal nur die mit Zahlenangabe.
Vorberechnet, weil Karte und Statistikseite dieselben Werte brauchen und
`js/daten.js` auf der Statistikseite nicht eingebunden ist.

### Seitenleiste

Der Zähler je Eintrag lautet heute „50 Zwangsarbeiter am 28.2.1945", auch wenn
der Wert vom 13.8.1942 stammt. Das ist im Fortgeschrieben-Modus falsch und wird
mit korrigiert:

- Stichtag-Modus: „50 Zwangsarbeiter am 13.8.1942"
- Fortgeschrieben: „50 Zwangsarbeiter — Stand 13.8.1942"

Das Datum ist in beiden Fällen das der zugrundeliegenden Meldung, nicht das des
Reglers. Setzt sich die Zahl aus mehreren Meldungen verschiedener Arten mit
verschiedenen Daten zusammen, nennt der Zusatz das jüngste davon.

## Statistikseite

Ein neuer Abschnitt **vor** den beiden Verlaufskurven: gestapelte Balken je
Stichtag, unten die Meldungen mit Zahl, oben die ohne. Er zeigt, dass die
Überlieferung in acht Schüben kommt und dass ein erheblicher Teil der Meldungen
keine Ziffer trägt.

Darunter der Hinweis, dass die folgenden Kurven fortgeschriebene Werte zeigen
und deshalb monoton steigen — mit Verweis auf den Umschalter der Karte.

Die Verlaufskurven selbst bleiben, wie sie sind. Ein zweiter Umschalter dort
würde die Chart-Logik verdoppeln; der Balken und ein ehrlicher Hinweis leisten
dasselbe.

## Was nicht dazugehört

- Keine Änderung an Daten, Filterlogik, Farben oder Radiusstufen
- Keine Umschaltbarkeit der Statistik-Verlaufskurven
- Keine Änderung an den Kennzahlen der Startseite — sie hängen an `meta.json`
  und sind von der Zählweise unberührt
- Kein Merken des Modus über Sitzungen hinweg, kein Parameter in der Adresse

## Prüfung

Gegenprobe an drei Betrieben, für die die Zahlen von Hand nachrechenbar sind
(Nr. 54 mit drei aufeinanderfolgenden Ostarbeiter-Meldungen, ein Betrieb mit
nur einer Meldung, ein Betrieb mit mehreren Arten am selben Tag).

Am 28.2.1945 muss die Karte im Stichtag-Modus genau einen Betrieb mit Zahl
zeigen (fortgeschrieben: 197); am 5.7.1944 keinen, bei 56 gemeldeten. Bei 1280px und bei 390px prüfen,
dass der Umschalter den Zeitregler nicht sprengt.
