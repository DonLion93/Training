/* Kern: Reiter anmelden, Reiterleiste bauen, per Adresse (#plan, #uebungen, #berichte, #optionen) umschalten. */
(function () {
  "use strict";

  var views = [];
  var byId = {};

  function el(tag, attrs) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = v;
        else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? "" : v);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c != null && c !== false) n.append(c);
    }
    return n;
  }

  var DAYS = [
    { s: "Mo", n: "Montag", t: true },
    { s: "Di", n: "Dienstag", t: true },
    { s: "Mi", n: "Mittwoch", t: true },
    { s: "Do", n: "Donnerstag", t: false },
    { s: "Fr", n: "Freitag", t: true },
    { s: "Sa", n: "Samstag", t: true },
    { s: "So", n: "Sonntag", t: false }
  ];

  function todayIdx() { return (new Date().getDay() + 6) % 7; }

  function weekLabel() {
    var now = new Date();
    var mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - todayIdx());
    var sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
    var t = new Date(Date.UTC(mon.getFullYear(), mon.getMonth(), mon.getDate()));
    var dn = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dn);
    var kw = Math.ceil(((t - new Date(Date.UTC(t.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7);
    var f = function (d) { return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" }); };
    return "KW " + kw + " · " + f(mon) + " – " + f(sun) + " " + sun.getFullYear();
  }

  /* Knopf mit zweitem Klick zur Bestätigung (4 Sekunden, oder bis der Fokus wechselt). Für alles, was Daten löscht. */
  function confirmButton(label, armedLabel, onConfirm, attrs) {
    var a = { type: "button", class: "btn", text: label };
    Object.keys(attrs || {}).forEach(function (k) { a[k] = attrs[k]; });
    var b = el("button", a);
    var t = null;
    function reset() {
      clearTimeout(t);
      b.removeAttribute("data-armed");
      b.classList.remove("armed");
      b.textContent = label;
    }
    b.addEventListener("click", function () {
      if (b.hasAttribute("data-armed")) { reset(); onConfirm(); return; }
      b.setAttribute("data-armed", "1");
      b.classList.add("armed");
      b.textContent = armedLabel;
      t = setTimeout(reset, 4000);
    });
    b.addEventListener("blur", reset);
    return b;
  }

  function register(view) {
    views.push(view);
    byId[view.id] = view;
  }

  function buildTabs() {
    var box = document.getElementById("tabs");
    views.forEach(function (v) {
      var a = el("a", { class: "tab", href: "#" + v.id, "data-id": v.id });
      var ic = el("span", { class: "ic", "aria-hidden": "true" });
      ic.innerHTML = '<svg viewBox="0 0 24 24">' + v.icon + "</svg>"; /* eigene feste Symbole, keine Nutzerdaten */
      a.append(ic, el("span", { class: "lb", text: v.label }));
      box.append(a);
    });
  }

  function route(keep) {
    var id = (location.hash || "").replace("#", "");
    var v = byId[id] || views[0];
    if (!v) return;
    document.querySelectorAll(".tab").forEach(function (a) {
      if (a.getAttribute("data-id") === v.id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    document.getElementById("title").textContent = v.title;
    document.getElementById("eyebrow").textContent = weekLabel();
    var root = document.getElementById("view");
    root.replaceChildren();
    v.render(root);
    if (!keep) window.scrollTo(0, 0);
  }

  function start() {
    buildTabs();
    window.addEventListener("hashchange", function () { route(false); });
    route(false);
  }

  /* rerender zeichnet den aktuellen Reiter neu, ohne nach oben zu springen */
  window.App = { register: register, el: el, DAYS: DAYS, todayIdx: todayIdx, confirmButton: confirmButton, rerender: function () { route(true); } };
  document.addEventListener("DOMContentLoaded", start);
})();
