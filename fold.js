/* Aufklapper für Themenblöcke. App.fold(key, titel, id, kinder) liefert eine Karte, die anfangs zu ist.
   Welche offen sind, merkt sich die App bis zum Neuladen (nach key). */
(function () {
  "use strict";
  var el = App.el;
  var openSet = {};

  function fold(key, title, domId, children) {
    var d = el("details", { class: "card fold", "data-fold": key });
    if (domId) d.id = domId;
    d.open = !!openSet[key];
    d.addEventListener("toggle", function () { openSet[key] = d.open; });
    /* Der Klick kommt vor dem Umschalten und vor dem (verzögerten) toggle-Ereignis, so geht nichts verloren, wenn gleich neu gezeichnet wird */
    var sum = el("summary", null, el("h2", { text: title }));
    sum.addEventListener("click", function () { openSet[key] = !d.open; });
    d.append(sum, el.apply(null, ["div", { class: "fold-body" }].concat(children.filter(Boolean))));
    return d;
  }

  /* Einen Block von außen öffnen (z. B. damit eine Meldung sichtbar ist). Wirkt auch auf einen schon gebauten Block. */
  fold.show = function (key, root) {
    openSet[key] = true;
    var d = root && root.querySelector('details.fold[data-fold="' + key + '"]');
    if (d) d.open = true;
  };

  App.fold = fold;
})();
