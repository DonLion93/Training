/* Eingabefelder über der Bildschirmtastatur: Tippt man in ein Textfeld, wird die Seite so gescrollt, dass das Feld im oberen Teil
   des sichtbaren Bereichs steht und die Tastatur es nicht verdeckt. Das gilt für jedes Feld der App, ohne dass ein Modul etwas tun muss.
   Damit auch Felder ganz unten hochkommen, bekommt die Seite während der Eingabe unten Platz (Klasse kb-open auf <html>, siehe CSS).
   Die Tastatur lässt sich nicht direkt messen (eingebettete Seiten melden sie oft nicht), deshalb zielt die Rechnung auf das obere Drittel. */
(function () {
  "use strict";
  var TYPES = /^(text|search|number|tel|email|url|password)$/;
  var root = document.documentElement;
  var timers = [], hideTimer = null;

  function isField(t) {
    if (!t || !t.tagName) return false;
    if (t.tagName === "TEXTAREA") return !t.readOnly && !t.disabled;
    return t.tagName === "INPUT" && TYPES.test(t.type || "text") && !t.readOnly && !t.disabled;
  }

  function visibleHeight() {
    var h = window.innerHeight, vv = window.visualViewport;
    return vv && vv.height ? Math.min(h, vv.height) : h;
  }

  /* Liegt das Feld nicht im oberen Teil des sichtbaren Bereichs, scrolle es dorthin */
  function reveal() {
    var t = document.activeElement;
    if (!isField(t)) return;
    var vh = visibleHeight();
    var r = t.getBoundingClientRect();
    var tall = r.height > vh * 0.4;
    var wantTop = tall ? vh * 0.1 : vh * 0.2;
    var fits = r.top >= vh * 0.05 && (tall ? r.top <= vh * 0.3 : r.bottom <= vh * 0.45);
    if (fits) return;
    var top = Math.max(0, r.top + window.pageYOffset - wantTop);
    try { window.scrollTo({ top: top, behavior: "smooth" }); } catch (e) { window.scrollTo(0, top); }
  }

  function later() {
    timers.forEach(clearTimeout);
    /* die Tastatur braucht einen Moment zum Einblenden und ändert dabei den sichtbaren Bereich */
    timers = [60, 350, 800].map(function (ms) { return setTimeout(reveal, ms); });
  }

  document.addEventListener("focusin", function (e) {
    if (!isField(e.target)) return;
    clearTimeout(hideTimer);
    root.classList.add("kb-open");
    later();
  });
  document.addEventListener("focusout", function () {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      if (!isField(document.activeElement)) root.classList.remove("kb-open");
    }, 250);
  });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", function () {
    if (isField(document.activeElement)) later();
  });
  window.addEventListener("orientationchange", function () { if (isField(document.activeElement)) later(); });
  /* Wächst ein mehrzeiliges Feld beim Tippen, bleibt die Schreibstelle im Blick */
  document.addEventListener("input", function (e) {
    if (e.target && e.target.tagName === "TEXTAREA" && isField(e.target)) {
      clearTimeout(timers[0]);
      timers[0] = setTimeout(reveal, 80);
    }
  });

  App.keyboard = { reveal: reveal };
})();
