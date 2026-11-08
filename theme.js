/* Aussehen: Modus (System, Hell, Dunkel, Schwarz) und Akzentfarbe. Die Werte liegen in state.settings.
   Eine gewählte Akzentfarbe wird bei Bedarf etwas aufgehellt oder abgedunkelt, damit sie in jedem Modus lesbar bleibt. */
(function () {
  "use strict";
  var S = App.store;
  var themeSet = false;

  var PRESETS = [["Blau", "#2f7de1"], ["Türkis", "#12a39a"], ["Grün", "#2e9b57"], ["Violett", "#8a63e0"], ["Orange", "#d9731a"], ["Rosa", "#d6457a"]];

  function lin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function lum(h) {
    return 0.2126 * lin(parseInt(h.substr(1, 2), 16)) + 0.7152 * lin(parseInt(h.substr(3, 2), 16)) + 0.0722 * lin(parseInt(h.substr(5, 2), 16));
  }
  function mix(h, target, a) {
    var out = "#";
    for (var i = 1; i < 7; i += 2) {
      var c = parseInt(h.substr(i, 2), 16);
      out += ("0" + Math.round(c + (target - c) * a).toString(16)).slice(-2);
    }
    return out;
  }
  /* Helligkeit zwischen 0,10 und 0,30: auf Weiß und auf Schwarz mindestens 3:1 */
  function fit(h) {
    for (var n = 0; n < 24; n++) {
      var L = lum(h);
      if (L < 0.10) h = mix(h, 255, 0.08);
      else if (L > 0.30) h = mix(h, 0, 0.08);
      else break;
    }
    return h;
  }
  function ink(h) {
    var L = lum(h);
    return 1.05 / (L + 0.05) >= (L + 0.05) / 0.057 ? "#ffffff" : "#0b1620";
  }

  function meta() {
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement("meta"); m.name = "theme-color"; document.head.append(m); }
    requestAnimationFrame(function () { m.content = getComputedStyle(document.body).backgroundColor; });
  }

  function apply() {
    var s = S.state().settings, root = document.documentElement, st = root.style;
    if (s.theme !== "system") { root.setAttribute("data-theme", s.theme); themeSet = true; }
    else if (themeSet) { root.removeAttribute("data-theme"); themeSet = false; }
    if (s.accent) {
      var a = fit(s.accent);
      st.setProperty("--accent", a);
      st.setProperty("--accent-ink", ink(a));
    } else {
      st.removeProperty("--accent");
      st.removeProperty("--accent-ink");
    }
    meta();
  }

  function setTheme(v) {
    S.state().settings.theme = ["light", "dark", "black"].indexOf(v) >= 0 ? v : "system";
    S.touch();
    apply();
  }

  function setAccent(hex) {
    S.state().settings.accent = hex ? fit(hex.toLowerCase()) : null;
    S.touch();
    apply();
  }

  S.onAdopt(apply);
  if (window.matchMedia) {
    try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", meta); } catch (e) { /* ältere Browser */ }
  }
  apply();

  App.theme = { apply: apply, setTheme: setTheme, setAccent: setAccent, fit: fit, PRESETS: PRESETS };
})();
