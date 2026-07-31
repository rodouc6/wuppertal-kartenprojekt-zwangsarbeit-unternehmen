#!/usr/bin/env python3
"""
Erzeugt about/bibliographie.html aus der Textdatei mit der Auswahlbibliographie.

Die Bibliographie ist ausdruecklich vorlaeufig und waechst weiter. Gepflegt wird
deshalb nur die Textdatei -- ein Titel je Absatz, alphabetisch. Dieses Skript
setzt daraus die Seite, macht URLs anklickbar und maskiert HTML-Sonderzeichen.

    python3 scripts/build_bibliographie.py

Eintraege, in denen noch ein Platzhalter "xxx" steht, werden uebernommen, aber
der unfertige Teil wird entfernt: eine veroeffentlichte Seite soll keine
Platzhalter zeigen. Das Skript meldet, welche das betrifft.
"""

import html
import os
import re
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUELLE = os.path.join(BASE, "vorläufige Auswahlbibliographie-v1")
ZIEL = os.path.join(BASE, "about", "bibliographie.html")

URL = re.compile(r"https?://[^\s,;\]]+")
# "URL: xxx, zuletzt abgerufen am: 5.8.2025." -- unfertige Fundstellenangabe
PLATZHALTER = re.compile(r",?\s*URL:\s*x{2,}[^.]*\.?", re.IGNORECASE)

KOPF = """<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Auswahlbibliographie – Zwangsarbeit Wuppertal</title>
  <link rel="stylesheet" href="../style.css" />
</head>
<body>

<nav>
  <a href="../index.html">Startseite</a>
  <a href="../map.html">Karte</a>
  <span class="nav-dropdown">
    <a href="../about.html" class="active">Projekt &#9662;</a>
    <span class="nav-dropdown-menu">
      <a href="../about.html">Über das Projekt</a>
      <a href="bibliographie.html">Bibliographie</a>
      <a href="statistiken.html">Statistiken</a>
    </span>
  </span>
  <a href="../impressum.html">Impressum</a>
</nav>

<main>
  <h1>Auswahlbibliographie</h1>

  <p>
    Die folgende Auswahl entstand im Rahmen einer Hausarbeit zur Bestandsaufnahme der
    „Aufarbeitung“ der nationalsozialistischen Vergangenheit Wuppertaler Unternehmen.
    Sie versammelt Titel zur Zwangsarbeit im Bergischen Land, zur Rüstungswirtschaft
    der Region und zum Umgang deutscher Unternehmen mit ihrer Geschichte nach 1945.
  </p>

  <p class="bib-hinweis">
    <strong>Diese Liste ist vorläufig und unvollständig.</strong> Sie bildet den
    Arbeitsstand ab und wird fortgesetzt.
  </p>

  <h2>Titel</h2>
"""

FUSS = """
  <h2>Weitere Angebote zur Zwangsarbeit</h2>

  <p>
    Über diese Auswahl hinaus sei zunächst auf zwei Angebote verwiesen, die weit über
    Wuppertal hinausreichen:
  </p>

  <ul class="page-links">
    <li>
      <a href="https://www.zwangsarbeit-archiv.de/" target="_blank" rel="noopener">Zwangsarbeit 1939–1945. Erinnerungen und Geschichte</a><br>
      <span class="link-note">Digitales Archiv der Stiftung „Erinnerung, Verantwortung und Zukunft“ mit
      lebensgeschichtlichen Interviews ehemaliger Zwangsarbeiterinnen und Zwangsarbeiter.</span>
    </li>
    <li>
      <a href="https://www.ns-zwangsarbeit.de/recherche/digitale-erinnerung" target="_blank" rel="noopener">NS-Zwangsarbeit – Digitale Erinnerung</a><br>
      <span class="link-note">Rechercheangebot des Dokumentationszentrums NS-Zwangsarbeit Berlin-Schöneweide.</span>
    </li>
  </ul>
</main>

</body>
</html>
"""


def eintraege_lesen(pfad):
    """Ein Titel je nichtleerem Absatz; Ueberschriftszeilen werden uebersprungen."""
    with open(pfad, encoding="utf-8") as f:
        roh = f.read()
    aus = []
    for absatz in roh.split("\n"):
        z = absatz.strip()
        if not z or z.startswith("#"):
            continue
        aus.append(z)
    return aus


UMLAUTE = {"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"}


def sortierschluessel(eintrag):
    """Alphabetische Ordnung nach Verfasser, dann Titel.

    Zwei Fallstricke einer naiven Sortierung: Typographische Anfuehrungszeichen
    stehen im Zeichensatz hinter den Buchstaben, wodurch ein Titel wie
    „Es war so schwierig…" ans Ende einer Verfassergruppe rutscht. Und Umlaute
    gehoeren in einer deutschen Bibliographie nach DIN 5007-2 wie ae, oe, ue
    einsortiert, nicht hinter z.
    """
    s = eintrag.lower()
    for zeichen, ersatz in UMLAUTE.items():
        s = s.replace(zeichen, ersatz)
    return re.sub(r"[^a-z0-9 ]", "", s)


def aufbereiten(text):
    """Maskiert HTML, macht URLs anklickbar, entfernt unfertige Fundstellen."""
    gekuerzt = PLATZHALTER.sub(".", text)
    war_platzhalter = gekuerzt != text
    stuecke, letzte = [], 0
    for m in URL.finditer(gekuerzt):
        stuecke.append(html.escape(gekuerzt[letzte:m.start()]))
        u = m.group(0).rstrip(".,;")
        stuecke.append(f'<a href="{html.escape(u)}" target="_blank" rel="noopener">{html.escape(u)}</a>')
        stuecke.append(html.escape(gekuerzt[m.start() + len(u):m.end()]))
        letzte = m.end()
    stuecke.append(html.escape(gekuerzt[letzte:]))
    return "".join(stuecke), war_platzhalter


def main():
    if not os.path.exists(QUELLE):
        sys.exit(f"FEHLER: Quelldatei nicht gefunden: {QUELLE}")
    eintraege = eintraege_lesen(QUELLE)
    if not eintraege:
        sys.exit("FEHLER: keine Eintraege in der Quelldatei gefunden.")

    zeilen, gekuerzte = [], []
    for e in sorted(eintraege, key=sortierschluessel):
        markup, war = aufbereiten(e)
        if war:
            gekuerzte.append(e[:60])
        zeilen.append(f'  <p class="bib-entry">{markup}</p>')

    with open(ZIEL, "w", encoding="utf-8") as f:
        f.write(KOPF + "\n" + "\n".join(zeilen) + "\n" + FUSS)

    print(f"{len(eintraege)} Titel geschrieben nach {os.path.relpath(ZIEL, BASE)}")
    if gekuerzte:
        print(f"  {len(gekuerzte)} Eintrag/Eintraege mit unfertiger Fundstelle gekuerzt:")
        for g in gekuerzte:
            print(f"    {g}…")


if __name__ == "__main__":
    main()
