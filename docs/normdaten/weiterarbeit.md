# Normdaten: Stand und was noch offen ist

**Stand: 23.9.2026.** Der Normdaten-Strang ist an einem Punkt, an dem er
ruhen kann: Die Zuordnungen sind geprüft, sie stehen in der Karte, und der
Weg dorthin ist dokumentiert. Dieses Papier hält fest, wo was liegt und was
offen blieb — damit eine spätere Bearbeitung nicht bei null anfängt.

Ergänzt `machbarkeit-befund.md`. Jener Bericht sagt, **was gemessen wurde**;
hier steht, **was daraus folgt**. Beide sind von Hand geschrieben und werden
von keinem Skript überschrieben — anders als die `machbarkeit-*.md`-Listen
daneben.

## Was erreicht ist

| | |
|---|---:|
| beurteilte Vorschläge | 303 |
| davon bestätigt | 108 (97 × `ist`, 11 × `gehoertZu`) |
| verworfen | 181 |
| ungeklärt | 14 |
| **Unternehmen mit Nachweis** | **70 von 431 (16,2 %)** |
| davon mit Wikipedia-Artikel | 22 |

Veröffentlicht am 22.9.2026 mit Commit `871ae87`.

## Wo was liegt

**Versioniert und bleibend:**

| Datei | |
|---|---|
| `docs/normdaten/machbarkeit-befund.md` | der Bericht, Abschnitte 1–4; 1f und 1g sind die beiden Durchgänge |
| `docs/normdaten/urteile.json` | die 303 Urteile. **Einzige Wahrheitsquelle.** Wird von allen Skripten nur gelesen |
| `docs/normdaten/weiterarbeit.md` | dieses Papier |
| `data/normdaten.json` | das Destillat für die Karte, erzeugt — nicht von Hand ändern |
| `scripts/normdaten_*.py` | die sieben Skripte, `normdaten_pruefbogen.html` als Vorlage |

**Git-ignoriert, jederzeit neu holbar** (zusammen rund 1,6 MB): die vier
Zwischenspeicher (`gnd-`, `wikidata-`, `wikipedia-`, `pm20-wuppertal.json`),
`zweigwerke-kandidaten.json`, der erzeugte `pruefbogen.html` und die sieben
`machbarkeit-*.md`-Kandidatenlisten.

**Öffentlich sichtbar:** der Abschnitt „Normdaten" auf `about.html`
(Fußnote 4 verweist hierher), die Herkunftsangaben im Impressum, der Block
„Normdaten" in der Seitenleiste von `map.html`.

## Wie man wieder einsteigt

```bash
python3 scripts/normdaten_bestand.py --neu     # dauert, ~4 min je Abgleich
python3 scripts/normdaten_wikidata.py --neu
python3 scripts/normdaten_pm20.py
python3 scripts/normdaten_wikipedia.py --neu
python3 scripts/normdaten_zweigwerke.py
python3 scripts/normdaten_pruefbogen.py        # setzt die 303 Urteile vor
python3 -m http.server 8081                    # 8080 ist von Apache belegt
# → http://localhost:8081/docs/normdaten/pruefbogen.html
```

Der Bogen zeigt dann nur, was **neu** ist: Der Filter „offen" enthält genau
die Differenz. Nach dem Urteilen „Exportieren", die Datei nach
`docs/normdaten/urteile.json` legen, dann
`python3 scripts/normdaten_uebernehmen.py`.

**Sechs Fallstricke, die beim ersten Mal Zeit gekostet haben:**

1. **Der `localStorage` hängt am Ursprung, also an Rechnername *und Port*.**
   Ein Bogen, der von `localhost:8099` geladen wurde, findet die Urteile von
   `localhost:8081` nicht. Immer denselben Port nehmen.
2. **Port 8080 ist auf dem Arbeitsrechner von einem Apache belegt**, der dort
   als Dienst läuft. Die CLAUDE.md nennt 8080 für die Website; für diesen
   Rechner gilt 8081.
3. **Der Export landet im Download-Ordner des Browsers**, nicht im Projekt.
   Läuft eine Browser-Automatisierung mit, kann sie diesen Ordner umgebogen
   haben — einmal lag die Datei in `.playwright-mcp/`.
4. **Wer den Bogen nach einem Export erneut öffnet, muss „Einlesen"
   drücken**, sonst überstimmt der alte Browserspeicher beim nächsten Export
   die Datei auf der Platte.
5. **`urteile.json` wird nie geschrieben.** Berichtigungen dort von Hand
   eintragen (oder im Bogen klicken und neu exportieren), danach
   `normdaten_uebernehmen.py`.
6. **Ein GND-Lauf braucht rund vier Minuten** — 431 Namen gegen 2.476
   Körperschaften samt Varianten. Nicht optimiert, weil eine zweite
   Ähnlichkeitsfunktion im Bogen von den Geschwisterskripten abweichen
   könnte.

## Was offen ist

### 1. Die 14 ungeklärten Urteile

Bei sieben Betrieben ist „unklar" das einzige Ergebnis:

| Nr. | Betrieb |
|---|---|
| 92 | Carl Bocklenberg & Söhne (Cebor) |
| 222 | Kabel- und Drahtwerk AG |
| 260 | Kuntze & Söhne |
| 269 | Limbach & Bonert KG |
| 307 | Neuhaus & Sohn |
| 382 | Schmidt & Co. |
| 452 | Wagner & Co. |

Am aussichtsreichsten ist **Nr. 92**: GND `1037080513` „Bocklenberg Söhne"
passt dem Namen nach, ist aber nicht geprüft. Die Nachbarnummer 91
Bocklenberg & Motte trägt bereits `16021893-7`. Die übrigen sechs sind
Namensvettern ohne unterscheidendes Merkmal — dafür bräuchte es eine Quelle
außerhalb der Normdateien, etwa ein Adressbuch.

### 2. Die PM20-Lizenz ist nicht geklärt

Das Impressum nennt die ZBW als Quelle, **ohne eine Lizenz zu behaupten**.
Die Seiten unter `pm20.zbw.eu` sind mit einem Proof-of-Work (Anubis) gegen
Scraper geschützt; abgefragt wurde ausschließlich der SPARQL-Endpunkt, der
dafür vorgesehen ist. Wer die Lizenzangabe nachtragen will, ruft die
Über-Seite im Browser auf oder fragt bei der ZBW an.

### 3. Drei bekannte Grenzen der Verfahren

- **Der Wikipedia-Kategorienbaum findet nur, was nach Wuppertal einsortiert
  ist.** Ein Artikel, der allein unter „Ehemaliges Unternehmen
  (Nordrhein-Westfalen)" steht, fehlt. Wie viele das sind, ist ungeprüft.
- **Die Zweigwerkliste in `normdaten_zweigwerke.py` ist handgeschrieben**
  und unvollständig: Ein Zweigwerk, dessen Datensatzname das Mutterhaus
  nicht nennt, ist über den Namen nicht zu finden. Zwei der 14 gelisteten
  (Nr. 75 Bemetall-Werk, Nr. 184 Heson Werk) ergaben gar keinen Kandidaten.
- **Der GND-Bestand ist über `placeOfBusiness` gezogen.** Körperschaften
  ohne Ortsangabe fehlen darin vollständig.

### 4. Der nächste große Schritt wäre ein anderer

**Die Rüstungsbegriffe**, nicht mehr Unternehmen. Das steht als Empfehlung
in Abschnitt 3 des Befunds und ist unangetastet: Ein Begriff wird einmal
zugeordnet und erscheint bei vielen Betrieben, die erwartete Quote liegt bei
etwa 70 % gegen die 35 %, die der Unternehmensabgleich erreicht hat.

Vorgelagert braucht es ein **kontrolliertes Vokabular**. Die Freitexte
enthalten 25 Schreibweisen für etwa 18 Programme, dazu OCR-Fehler
(„FührerNotprogramm", „Generator-Law" für Lkw). Rohmaterial:
`data/ruestungsgueter.csv`, 157 Zeilen.

## Was man nicht noch einmal machen muss

- **Begründungen für jede Zuordnung nachtragen.** Wurde erwogen und
  verworfen: Ein Normdatensatz steht hinter einem Link, Name, Ort und Typ
  sind dort nachzulesen. Nötig ist eine Begründung nur, wo beide Namen kein
  Wort teilen; ein Durchlauf fand drei solche Fälle, alle drei sind
  aufgelöst (Befund, Abschnitt 1g).
- **Die Ähnlichkeitsschwelle senken.** Bei 0,72 liegt die Trefferquote des
  GND-Abgleichs schon bei 28 %; tiefer wächst nur der Ausschuss.
