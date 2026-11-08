/* Diagnose: hält unerwartete Fehler fest (die letzten 20, im Browser) und baut einen kurzen Bericht zum Kopieren.
   Der Bericht enthält Zahlen und Zustände, aber keine Namen oder Werte deiner Übungen.
   Andere Module melden Probleme mit App.diag.log("Text"). Die Ansicht dazu steht in views/einstellungen.js. */
(function () {
  "use strict";

  var KEY = "trainingswoche-app-log";
  var MAX = 20;
  var list = [];

  try {
    var raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (Array.isArray(raw)) {
      list = raw.filter(function (e) { return e && typeof e.t === "number" && typeof e.m === "string"; }).slice(-MAX);
    }
  } catch (e) { /* ohne Speicher läuft das Protokoll nur bis zum Schließen */ }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* ignorieren */ }
  }

  function log(msg) {
    var m = String(msg == null ? "" : msg).replace(/\s+/g, " ").slice(0, 300);
    if (!m) return;
    var last = list[list.length - 1];
    if (last && last.m === m) { last.n = (last.n || 1) + 1; last.t = Date.now(); }
    else list.push({ t: Date.now(), m: m });
    if (list.length > MAX) list.splice(0, list.length - MAX);
    persist();
  }

  function where(file, line, col) {
    if (!file) return "";
    var f = String(file).split("?")[0].split("/").slice(-2).join("/");
    return " (" + f + (line ? ":" + line + (col ? ":" + col : "") : "") + ")";
  }

  window.addEventListener("error", function (ev) {
    if (/ResizeObserver/.test(ev.message || "")) return;
    log((ev.message || "Fehler") + where(ev.filename, ev.lineno, ev.colno));
  });
  window.addEventListener("unhandledrejection", function (ev) {
    var r = ev.reason;
    log("Abgelehntes Versprechen: " + (r && r.message ? r.message : r));
  });

  function fmt(t) {
    return new Date(t).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  /* Zustand der App als Liste [Bezeichnung, Wert], für die Anzeige und für den Bericht */
  function facts() {
    var S = App.store, st = S.state(), i = S.info(), rows = [];
    var standalone = false;
    try { standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; } catch (e) { /* egal */ }
    var size = 0;
    try { size = (localStorage.getItem("trainingswoche-app-v1") || "").length; } catch (e) { /* egal */ }
    var trainDays = st.days.filter(Boolean).length;
    var ticks = 0;
    Object.keys(st.done).forEach(function (d) { ticks += Object.keys(st.done[d]).length; });

    rows.push(["Version", App.version]);
    rows.push(["Start", standalone ? "als installierte App" : "im Browser"]);
    rows.push(["Speicher im Browser", i.localOk ? "ok, " + Math.max(1, Math.round(size / 1024)) + " KB" : "FEHLER beim Schreiben"]);
    rows.push(["Konto", !i.cloud ? "nicht verfügbar" : i.connected ? "verbunden" : "nicht verbunden"]);
    if (i.cloud) {
      rows.push(["Zuletzt im Konto gespeichert", i.lastSaved ? fmt(i.lastSaved) : "noch nicht in dieser Sitzung"]);
      rows.push(["Ungespeicherte Änderungen", i.dirty ? "ja" : "nein"]);
      if (i.lastError) rows.push(["Letzter Speicherfehler", i.lastError]);
    }
    rows.push(["Stand", st.exercises.length + " Übungen, " + trainDays + " Trainingstage, " + ticks + " Einträge in der Woche, " + st.reports.length + " Berichte"]);
    rows.push(["Woche ab", st.weekStart]);
    rows.push(["Letzte Änderung", st.updatedAt ? fmt(st.updatedAt) : "–"]);
    rows.push(["Darstellung", ({ system: "System", light: "Hell", dark: "Dunkel", black: "Schwarz" })[st.settings.theme] + (st.settings.accent ? ", eigener Akzent" : ", Standard-Akzent")]);
    var u = App.backup && App.backup.undoInfo();
    rows.push(["Sicherheitskopie", u ? "vorhanden, " + fmt(u.at) : "keine"]);
    rows.push(["Offline-Speicher der App", "serviceWorker" in navigator ? (navigator.serviceWorker.controller ? "aktiv" : "nicht aktiv") : "nicht unterstützt"]);
    rows.push(["Netz", navigator.onLine === false ? "offline" : "online"]);
    rows.push(["Fenster", innerWidth + "×" + innerHeight]);
    return rows;
  }

  function report() {
    var lines = ["Trainingswoche – Diagnose", "Erstellt: " + fmt(Date.now())];
    facts().forEach(function (r) { lines.push(r[0] + ": " + r[1]); });
    lines.push("Gerät: " + String(navigator.userAgent).slice(0, 140));
    lines.push("");
    lines.push(list.length ? "Fehlerprotokoll (" + list.length + "):" : "Fehlerprotokoll: leer");
    list.forEach(function (e) { lines.push("- " + fmt(e.t) + (e.n > 1 ? " (" + e.n + "×)" : "") + ": " + e.m); });
    return lines.join("\n") + "\n";
  }

  App.diag = {
    log: log,
    errors: function () { return list.slice(); },
    clear: function () { list = []; persist(); },
    facts: facts,
    report: report,
    fmt: fmt
  };
})();
