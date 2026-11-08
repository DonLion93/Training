/* Serie und Bestwerte, berechnet aus den Wochenberichten (inklusive der laufenden Woche).
   Eine Woche zählt als geschafft, wenn ihr Wochenziel 100 % erreicht, also genau die Zahl, die der Trainingsplan anzeigt.
   Eine Woche ohne Eintrag unterbricht die Serie. Die laufende Woche unterbricht sie nicht, solange sie noch läuft.
   compute() ist reine Rechnung, card() baut die Karte für den Reiter Berichte. */
(function () {
  "use strict";
  var el = App.el, C = App.calc, R = App.reports;
  var STRIP = 12;

  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function mondayOf(d) { return C.ymd(C.addDays(d, -((d.getDay() + 6) % 7))); }
  function prev(w) { return C.ymd(C.addDays(C.parseYmd(w), -7)); }
  function next(w) { return C.ymd(C.addDays(C.parseYmd(w), 7)); }

  /* list: Wochen wie R.all() sie liefert ({ w, d, live }), nach Woche sortiert. cur: Montag der laufenden Woche. */
  function compute(list, cur) {
    var weeks = {}, order = [];
    list.forEach(function (r) {
      var a = C.aggregate(r.d);
      var p = a.slots ? C.pct(a.perfAll) : null;
      weeks[r.w] = { w: r.w, live: !!r.live, pct: p, ok: p !== null && p >= 100, agg: a };
      order.push(r.w);
    });
    order.sort();

    /* Aktuelle Serie: ab der laufenden Woche, falls sie schon geschafft ist, sonst ab der Woche davor */
    var w = weeks[cur] && weeks[cur].ok ? cur : prev(cur), now = 0;
    while (weeks[w] && weeks[w].ok) { now++; w = prev(w); }

    var best = 0, run = 0, last = null;
    order.forEach(function (k) {
      if (!weeks[k].ok) { run = 0; last = null; return; }
      run = last && next(last) === k ? run + 1 : 1;
      last = k;
      if (run > best) best = run;
    });

    var reached = 0, total = 0;
    order.forEach(function (k) {
      var x = weeks[k];
      if (x.live && !x.ok) return;
      total++;
      if (x.ok) reached++;
    });

    var strip = [], k = cur, i;
    for (i = 0; i < STRIP; i++) { strip.unshift(k); k = prev(k); }
    strip = strip.map(function (wk) {
      var x = weeks[wk];
      return { w: wk, kw: C.isoWeek(C.parseYmd(wk)), live: wk === cur, pct: x ? x.pct : null, state: !x || x.pct === null ? "none" : x.ok ? "ok" : "miss" };
    });

    return { current: now, best: best, reached: reached, total: total, strip: strip, records: records(list, cur) };
  }

  /* Bestwerte je Übung (gleicher Name und gleiche Einheit): bester Tag und beste Woche.
     fresh: In der laufenden Woche wurde ein früherer Bestwert übertroffen. */
  function records(list, cur) {
    var map = {}, order = [];
    function slot(name, unit) {
      var key = name + "|" + unit;
      if (!map[key]) { map[key] = { name: name, unit: unit, day: { v: 0 }, week: { v: 0 }, base: { day: 0, week: 0 } }; order.push(key); }
      return map[key];
    }
    function pass(live) {
      list.forEach(function (r) {
        if (!!r.live !== live) return;
        var mon = C.parseYmd(r.w), sums = {};
        r.d.forEach(function (items, i) {
          if (!items) return;
          items.forEach(function (it) {
            var s = slot(it[0], it[1]), v = it[3];
            sums[it[0] + "|" + it[1]] = (sums[it[0] + "|" + it[1]] || 0) + v;
            if (v > s.day.v) { s.day = { v: v, date: C.ymd(C.addDays(mon, i)), w: r.w }; }
          });
        });
        Object.keys(sums).forEach(function (key) {
          var s = map[key];
          if (sums[key] > s.week.v) s.week = { v: sums[key], w: r.w, kw: C.isoWeek(mon) };
        });
      });
    }
    pass(false);
    order.forEach(function (key) { map[key].base = { day: map[key].day.v, week: map[key].week.v }; });
    pass(true);
    return order.map(function (key) {
      var s = map[key];
      return {
        name: s.name, unit: s.unit, day: s.day, week: s.week,
        freshDay: s.day.w === cur && s.base.day > 0 && s.day.v > s.base.day,
        freshWeek: s.week.w === cur && s.base.week > 0 && s.week.v > s.base.week
      };
    }).filter(function (r) { return r.day.v > 0; });
  }

  function dateText(ymd) { return C.parseYmd(ymd).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }); }

  function card() {
    var d = compute(R.all(), mondayOf(new Date()));
    var dots = el("div", { class: "wk-strip" });
    var n = { ok: 0, miss: 0, none: 0 };
    d.strip.forEach(function (x) {
      n[x.state]++;
      var label = "KW " + x.kw + (x.live ? " (läuft)" : "") + ": " + (x.pct === null ? "kein Eintrag" : x.pct + " %");
      dots.append(el("span", { class: "wk " + x.state + (x.live ? " live" : ""), title: label }));
    });
    dots.setAttribute("role", "img");
    dots.setAttribute("aria-label", "Letzte " + STRIP + " Wochen: " + n.ok + " geschafft, " + n.miss + " nicht geschafft, " + n.none + " ohne Eintrag");

    var recs = el("ul", { class: "recs" });
    d.records.forEach(function (r) {
      var li = el("li", null, el("strong", { text: r.name }));
      li.append(el("span", null, "Bester Tag: " + r.day.v + " " + r.unit + " am " + dateText(r.day.date), r.freshDay ? el("span", { class: "pill", text: "neu" }) : null));
      if (r.week.v > 0) li.append(el("span", null, "Beste Woche: " + r.week.v + " " + r.unit + " (KW " + r.week.kw + ")", r.freshWeek ? el("span", { class: "pill", text: "neu" }) : null));
      recs.append(li);
    });

    var dl = el("dl", { class: "stats" });
    [["Aktuelle Serie", plural(d.current, "Woche", "Wochen")],
     ["Längste Serie", plural(d.best, "Woche", "Wochen")],
     ["Wochen mit erreichtem Ziel", d.reached + " von " + d.total]].forEach(function (r) {
      dl.append(el("div", null, el("dt", { text: r[0] }), el("dd", { text: r[1] })));
    });

    return el("section", { class: "card", id: "stats-card" },
      el("h2", { text: "Serie und Bestwerte" }),
      dl, dots,
      el("div", { class: "legend" },
        el("span", null, el("i", { class: "wk ok" }), "geschafft"),
        el("span", null, el("i", { class: "wk miss" }), "nicht geschafft"),
        el("span", null, el("i", { class: "wk none" }), "kein Eintrag")
      ),
      el("p", { class: "hint", text: "Eine Woche zählt, wenn das Wochenziel 100 % erreicht. Eine Woche ohne Eintrag unterbricht die Serie, die laufende Woche nicht, solange sie noch läuft. Gezeigt werden die letzten " + STRIP + " Wochen." }),
      d.records.length ? el("h3", { text: "Bestwerte pro Übung" }) : null,
      d.records.length ? recs : null
    );
  }

  App.stats = { compute: compute, card: card };
})();
