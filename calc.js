/* Berechnung: Prozent und Statistik. Reine Funktionen, werden vom Trainingsplan und später von den Berichten genutzt.
   Ein Tag ist eine Liste von Posten [Name, Einheit, Ziel, Erreicht] oder null (Ruhetag). */
(function () {
  "use strict";

  /* Ab 100 % nicht mehr gedeckelt, darunter zeigt die Zahl nie 100 an */
  function pct(x) {
    return x >= 0.9999 ? Math.round(x * 100) : Math.min(99, Math.round(x * 100));
  }

  function doneOf(st, day, id) {
    var d = st.done[day];
    var v = d && d[id];
    return typeof v === "number" && v > 0 ? v : 0;
  }

  function dayItems(st, i) {
    if (!st.days[i]) return null;
    return st.exercises.map(function (e) {
      var row = [e.name, e.unit, e.target, doneOf(st, i, e.id)];
      if (e.kcal) row.push(e.kcal);
      return row;
    });
  }

  function allDays(st) {
    var out = [];
    for (var i = 0; i < 7; i++) out.push(dayItems(st, i));
    return out;
  }

  function aggregate(days) {
    var r = { slots: 0, reached: 0, started: 0, sumAll: 0, sumStarted: 0, fullDays: 0, trainDays: 0, byEx: {}, order: [] };
    days.forEach(function (items) {
      if (!items) return;
      r.trainDays++;
      var all = items.length > 0;
      items.forEach(function (it) {
        var g = it[2], v = it[3], ratio = v / g;
        r.slots++;
        r.sumAll += ratio;
        if (v >= g) r.reached++; else all = false;
        if (v > 0) { r.started++; r.sumStarted += ratio; }
        var key = it[0] + "|" + it[1];
        var t = r.byEx[key];
        if (!t) { t = r.byEx[key] = { name: it[0], unit: it[1], g: 0, v: 0 }; r.order.push(key); }
        t.g += g;
        t.v += v;
      });
      if (all) r.fullDays++;
    });
    r.perfAll = r.slots ? r.sumAll / r.slots : 0;
    r.perfStarted = r.started ? r.sumStarted / r.started : null;
    return r;
  }

  /* Datumshilfen. Wochen beginnen am Montag und stehen als JJJJ-MM-TT in den Daten. */
  function pad(n) { return String(n).padStart(2, "0"); }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseYmd(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
    return Math.ceil(((t - new Date(Date.UTC(t.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7);
  }
  function fmtDay(d) { return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" }); }

  App.calc = {
    pct: pct, doneOf: doneOf, dayItems: dayItems, allDays: allDays, aggregate: aggregate,
    ymd: ymd, parseYmd: parseYmd, addDays: addDays, isoWeek: isoWeek, fmtDay: fmtDay
  };
})();
