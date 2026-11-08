/* Berichte (Daten): archiviert beim Wochenwechsel die abgelaufene Woche und bietet Liste, Löschen, Import und Export.
   Die Ansicht dazu steht in views/berichte.js. */
(function () {
  "use strict";
  var S = App.store, C = App.calc;
  var FORMAT = "trainingswoche";

  function hasProgress(st) {
    for (var i = 0; i < 7; i++) {
      if (!st.days[i] || !st.done[i]) continue;
      for (var k = 0; k < st.exercises.length; k++) {
        if (C.doneOf(st, i, st.exercises[k].id) > 0) return true;
      }
    }
    return false;
  }

  function sortByWeek(list) {
    return list.sort(function (a, b) { return a.w < b.w ? -1 : a.w > b.w ? 1 : 0; });
  }

  function upsert(list, rep) {
    var out = list.filter(function (r) { return r.w !== rep.w; });
    out.push(rep);
    return sortByWeek(out);
  }

  /* Eine Woche ohne Eintrag wird nicht archiviert */
  S.onRollover(function (old) {
    if (!hasProgress(old)) return;
    var st = S.state();
    var rep = { w: old.weekStart, d: C.allDays(old), at: Date.now() };
    var notes = S.cleanReports([{ w: old.weekStart, d: [], n: old.notes }])[0].n;
    if (notes) rep.n = notes;
    var pr = old.settings && old.settings.profile;
    var body = pr ? S.cleanBody({ kg: pr.weight, cm: pr.height }) : null;
    if (body) rep.h = body;
    st.reports = upsert(st.reports, rep);
  });

  function all() {
    var st = S.state();
    var live = hasProgress(st) ? { w: st.weekStart, d: C.allDays(st), live: true, n: st.notes } : null;
    var list = st.reports.filter(function (r) { return !live || r.w !== live.w; });
    if (live) list.push(live);
    return sortByWeek(list);
  }

  function remove(w) {
    var st = S.state();
    st.reports = st.reports.filter(function (r) { return r.w !== w; });
    S.touch();
  }

  function merge(list) {
    var st = S.state();
    var out = st.reports.slice();
    list.forEach(function (r) { out = upsert(out, r); });
    st.reports = out;
    S.touch();
    return list.length;
  }

  function toJson() {
    var head = '{"app":"' + FORMAT + '","kind":"reports","v":1,"exportedAt":' + JSON.stringify(new Date().toISOString()) + ',"reports":[\n';
    return head + S.state().reports.map(function (r) { return JSON.stringify(r); }).join(",\n") + "\n]}\n";
  }

  /* Für Excel: Semikolon, Zeilenumbruch mit \r\n, UTF-8 mit Kennzeichen. Zellen, die wie Formeln beginnen, werden entschärft. */
  function cell(v) {
    var s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCsv() {
    var rows = [["Woche (Montag)", "KW", "Datum", "Wochentag", "Übung", "Einheit", "Ziel", "Erreicht", "Prozent", "Kalorien (geschätzt)", "Notiz zum Tag"]];
    S.state().reports.forEach(function (r) {
      var mon = C.parseYmd(r.w), kg = App.health.basis(r).kg;
      r.d.forEach(function (items, i) {
        if (!items) return;
        items.forEach(function (it, k) {
          var kcal = App.health.kcalItem(it[0], it[1], it[3], kg, it[4]);
          rows.push([r.w, C.isoWeek(mon), C.ymd(C.addDays(mon, i)), App.DAYS[i].n, it[0], it[1], it[2], it[3], Math.round(it[3] / it[2] * 100), kcal > 0 ? Math.round(kcal) : "", k === 0 && r.n && r.n[i] ? r.n[i] : ""]);
        });
      });
    });
    return "﻿" + rows.map(function (r) { return r.map(cell).join(";"); }).join("\r\n") + "\r\n";
  }

  function parse(text) {
    if (typeof text !== "string" || !text.trim()) return { ok: false, error: "Es wurde kein Inhalt gefunden." };
    if (text.length > 2000000) return { ok: false, error: "Die Datei ist zu groß." };
    var obj;
    try { obj = JSON.parse(text.replace(/^﻿/, "")); } catch (e) { return { ok: false, error: "Das ist keine gültige JSON-Datei." }; }
    if (!obj || obj.app !== FORMAT) return { ok: false, error: "Diese Datei stammt nicht aus der Trainingswoche." };
    if (obj.kind === "backup") return { ok: false, error: "Das ist ein Gesamt-Backup. Importiere es unter „Einstellungen“." };
    if (obj.kind !== "reports" || !Array.isArray(obj.reports)) return { ok: false, error: "Diese Datei enthält keine Berichte." };
    var list = S.cleanReports(obj.reports.slice(0, 1000));
    if (!list.length) return { ok: false, error: "In der Datei sind keine Berichte enthalten." };
    var f = function (w) { return C.parseYmd(w).toLocaleDateString("de-DE"); };
    return { ok: true, reports: list, range: f(list[0].w) + " bis " + f(list[list.length - 1].w) };
  }

  App.reports = {
    all: all,
    archivedCount: function () { return S.state().reports.length; },
    remove: remove,
    merge: merge,
    toJson: toJson,
    toCsv: toCsv,
    parse: parse
  };
})();
