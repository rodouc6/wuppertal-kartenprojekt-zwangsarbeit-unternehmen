/* Klappmenue "Projekt" in der Navigation.
   Das Untermenue hing allein an .nav-dropdown:hover. Auf Touch gibt es kein
   Hover -- das Geraet folgte stattdessen dem href und landete auf about.html,
   die Unterseiten waren nur ueber diesen Umweg erreichbar. Dieses Skript macht
   aus dem Reiter einen Schalter.
   Ohne JavaScript bleibt der Link, was er ist: die Navigation funktioniert
   weiter, nur ohne Klappmenue (:hover und :focus-within tragen sie dann,
   siehe style.css).
   Bewusst auf mehrere Klappmenues je Seite ausgelegt, auch wenn es derzeit
   nur eines gibt. */
(function () {
  const dropdowns = Array.from(document.querySelectorAll(".nav-dropdown"));
  if (!dropdowns.length) return;

  // Schaltet den :focus-within-Rueckfall in style.css ab -- ab hier verwaltet
  // dieses Skript den Zustand allein.
  document.documentElement.classList.add("nav-js");

  function schliesse(dd) {
    dd.classList.remove("offen");
    const a = dd.querySelector(":scope > a");
    if (a) a.setAttribute("aria-expanded", "false");
  }

  function schliesseAlle(ausser) {
    dropdowns.forEach((dd) => {
      if (dd !== ausser) schliesse(dd);
    });
  }

  dropdowns.forEach((dd) => {
    const a = dd.querySelector(":scope > a");
    if (!a) return;

    // Erst hier gesetzt, nicht im HTML: ohne dieses Skript gibt es nichts
    // aufzuklappen, und ein leeres Versprechen an die Vorlesesoftware waere
    // schlechter als gar keines.
    a.setAttribute("aria-haspopup", "true");
    a.setAttribute("aria-expanded", "false");

    a.addEventListener("click", (e) => {
      e.preventDefault();
      const offen = dd.classList.toggle("offen");
      a.setAttribute("aria-expanded", String(offen));
      schliesseAlle(dd);
    });
  });

  // Ein Tipp daneben schliesst. Alles innerhalb des Klappmenues ist
  // ausgenommen: der Reiter hat oben seinen eigenen Zuhoerer, und ein Eintrag
  // des Untermenues wechselt ohnehin gerade die Seite.
  document.addEventListener("click", (e) => {
    if (e.target.closest(".nav-dropdown")) return;
    schliesseAlle(null);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const offene = dropdowns.filter((dd) => dd.classList.contains("offen"));
    if (!offene.length) return;
    // Der Fokus koennte im Untermenue stehen, das gleich verschwindet -- er
    // geht deshalb an den Reiter zurueck, statt an den Seitenanfang zu fallen.
    const a = offene[0].querySelector(":scope > a");
    schliesseAlle(null);
    if (a) a.focus();
  });
})();
