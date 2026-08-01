# Suchfunktion auf der Kartenseite

**Stand:** 1.8.2026

## Ziel

Wer einen bestimmten Betrieb oder eine bestimmte Adresse sucht, findet ihn
heute nur durch Scrollen in einer Liste von 417 Einträgen. Ein Suchfeld soll
Namen, historische Adressen, Orte, Stadtteile und Unternehmensnummern
erschließen.

## Bauform: kein zweites Anzeigekonzept

Ein Feld, das während des Tippens die vorhandene Liste einengt. Kein Overlay,
keine eigene Trefferliste, kein Autocomplete: **Die Seitenleiste ist die
Trefferliste**, und die Karte zeigt die Treffer als die verbliebenen Punkte.
Die Suche fügt der Seite nichts Neues hinzu, sie engt das Vorhandene ein.

Das ist zugleich die einfachste Umsetzung — die Mechanik aus `applyFilters()`
trägt sie vollständig.

## Was die Daten hergeben

| Feld | vorhanden bei |
|---|---|
| `name` | 431 Standorten |
| `adresse` (historisch) | 431 |
| `ort` | 430 |
| `stadtteil` | 431 |
| `adresseHeute` | **1** (Nr. 156) |

**Moderne Adressen gibt es faktisch nicht.** `adresseHeute` wird ausschließlich
aus `data/korrekturen.json` gefüllt und ist derzeit ein einziger Eintrag. Das
Feld wird mitdurchsucht, weil es nichts kostet und mit dem Bestand mitwächst —
aber die Suche kann nicht leisten, wonach die ursprüngliche Frage verlangte.
Tragend sind Name, historische Adresse, Ort und Stadtteil.

## Normalisierung: die eigentliche Arbeit

Ein roher Textvergleich scheitert an diesem Bestand:

- **227 Adressen schreiben „Str.", 97 schreiben „straße" aus.** Wer
  *Wasserstraße* tippt, fände die 227 nicht; wer *Wasserstr.* tippt, die 97
  nicht.
- **102 Einträge enthalten ß, 141 Umlaute.** *Wasserstrasse* und *Muller*
  müssen treffen.
- **148 von 431 Namen beginnen mit einem Vornamen** („Gustav Rafflenbeul").
  Der Suchtext muss an beliebiger Stelle treffen, nicht nur am Anfang.
- Namen enthalten `&`, `.`, Klammern und typografische Anführungszeichen
  (`„Lago“`). Wer *Lago* tippt, darf nicht am Anführungszeichen scheitern.

Suchtext und Sucheingabe durchlaufen deshalb dieselbe Normalisierung:
Kleinschreibung, Umlaute aufgelöst (ä→ae, ö→oe, ü→ue, ß→ss), `str.` zu
`strasse` erweitert, alles Übrige außer Buchstaben und Ziffern zu
Leerzeichen. Verglichen wird mit „enthält".

**Keine Fehlertoleranz darüber hinaus** — keine Levenshtein-Distanz, kein
Fuzzy-Abgleich. Bei 417 Einträgen bringt sie wenig und erzeugt Falschtreffer
zwischen ähnlichen Firmennamen, die im Bestand tatsächlich vorkommen.

Der Suchtext je Unternehmen wird **einmal beim Aufbau** gebildet, nicht bei
jedem Tastendruck. Er umfasst alle Standorte des Unternehmens: ein Betrieb mit
zwei Adressen ist über beide auffindbar.

## Die Nummer ist mitsuchbar

`54` oder `363a` führt zum Eintrag — nützlich für alle, die neben der Karte den
gedruckten Katalog aufgeschlagen haben. Dass `54` auch „Wasserstraße 54"
trifft, wird hingenommen: mehr Treffer, keine falschen.

## Verhältnis zu den Filtern

Die Suche ist ein weiterer Filter und wird mit den übrigen **UND-verknüpft**.
Alles andere wäre inkonsistent, und der vorhandene Zähler („126 von 417
Unternehmen (gefiltert)") erklärt das Ergebnis bereits.

Für den ärgerlichen Fall, dass ein gesetzter Filter den gesuchten Betrieb
verbirgt, tritt an die Stelle der bisherigen Leermeldung ein Hinweis:

> Keine Treffer. Ohne die gesetzten Filter wären es 3. **[Filter zurücksetzen]**

Der Knopf leert die Filter, **nicht** die Suche. Der Hinweis erscheint nur,
wenn Filter gesetzt sind und die Suche allein Treffer hätte.

## Ort des Feldes

Als eigene Zeile **unter** dem Kopf der Seitenleiste, über dem Filterpanel und
der Liste. Derselbe Ort in beiden Layouts:

- **Am Schreibtisch** sitzt es dauerhaft sichtbar unter „Unternehmen".
- **Auf dem Telefon** ist der Kopf die Griffleiste; das Feld liegt darunter im
  Blatt und ist damit sichtbar, sobald das Blatt offen ist. Wer sucht, hat es
  ohnehin geöffnet.

Es gehört nicht in den Kopf selbst: Der trägt bereits Titel, Trefferzahl und
Filterknopf, und auf schmalen Schirmen bestimmt seine Höhe die Griffleiste
(`setzeGriffhoehe()`).

## Bedienung

- `<input type="search">` mit einer Beschriftung, die Screenreader lesen
  (optisch verborgenes `<label>` oder `aria-label`)
- Ein Löschknopf im Feld, sichtbar nur bei eingegebenem Text — `type="search"`
  bringt ihn nicht in allen Browsern mit
- **Escape** leert das Feld, solange der Fokus darin steht
- Der vorhandene Knopf „Zurücksetzen" im Filterpanel leert die Suche mit
- Mindestens 44px hoch auf schmalen Schirmen

Kein Absenden, kein Knopf „Suchen" — gefiltert wird beim Tippen. Ob die
Eingabe entprellt werden muss, entscheidet eine Messung: `applyFilters()`
berührt 417 Karten und 423 Marker. Bleibt ein Durchlauf unter etwa 50ms, ist
Entprellen unnötige Mechanik.

## Was nicht dazugehört

- **Kein Hervorheben der Fundstelle** im Text. Es verlangt HTML-Manipulation an
  jeder Karte und macht das Neuzeichnen deutlich teurer.
- **Keine Suche im Speer-Quellentext.** Er ist lang und unstrukturiert; die
  Treffermenge würde unkontrollierbar.
- Keine Relevanzsortierung — die Liste bleibt nach Nummer sortiert.
- Kein Suchbegriff in der Adresszeile (`?suche=`), kein Merken über Sitzungen.
- Keine Änderung an Daten, Filterlogik im Übrigen, Farben oder Radiusstufen.

Hervorheben und Quellentextsuche ließen sich später nachrüsten, ohne das hier
Beschriebene umzubauen.

## Prüfung

Gegenproben, die beide Schreibweisen abdecken müssen:

Der tragende Fall ist die Kaiserstraße: vier Betriebe stehen dort als
„Kaiserstr.", zwei als „Kaiserstraße". **Alle vier Schreibweisen der Eingabe
müssen dieselben sechs liefern** — 120, 246, 281, 327, 454, 476:

| Eingabe | muss finden |
|---|---|
| `kaiserstraße` | jene sechs |
| `kaiserstrasse` | jene sechs |
| `kaiserstr.` | jene sechs |
| `kaiserstr` | jene sechs |
| `lago` | Nr. 262, „Lago" – Landeslieferungsgenossenschaft (trotz Anführungszeichen) |
| `rafflenbeul` | Nr. 342, Gustav Rafflenbeul (Nachname in der Mitte) |
| `363a` | genau Nr. 363a |
| `heckinghausen` | 29 Betriebe des Stadtteils (an 30 Standorten — Nr. 351 hat dort zwei) |

Dazu: Suche zusammen mit gesetzten Filtern; der Hinweis bei null Treffern;
Escape und Löschknopf; das Feld bei 1280px und 390px; Konsole fehlerfrei.
Die Marker auf der Karte müssen der Auswahl folgen — die Suche ist kein
reiner Listenfilter.
