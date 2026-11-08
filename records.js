/* Rekorde: bester Tag, beste Woche, beste Übungswerte und längste Serie geschaffter Tagesziele.
   compute() ist reine Rechnung auf den Wochenberichten (inklusive der laufenden Woche), card() baut den Aufklapper für den Reiter Berichte.
   Ein Tagesziel ist geschafft, wenn der Tag 100 % erreicht. Ruhetage unterbrechen die Serie nicht, ein verpasster Trainingstag schon.
   Eine Woche ohne Bericht unterbricht sie ebenfalls. Tage nach heute und der heutige Tag, solange er noch nicht geschafft ist, zählen nicht. */
(function () {
  "use strict";
  var el = App.el, C = App.calc, R = App.reports, S = App.store;
  var DONE = 0.9999;

  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  /* list: Wochen wie R.all() sie liefert, nach Woche sortiert. today: "JJJJ-MM-TT". planDays: Trainingstage des aktuellen Plans (7 Wahrheitswerte), optional. */
  function compute(list, today, planDays) {
    var bestDay = null, bestWeek = null, byEx = {}, exOrder = [];
    var run = 0, runStart = null, runEnd = null, best = null, prevW = null;

    list.forEach(function (r) {
      var mon = C.parseYmd(r.w);
      var wa = C.aggregate(r.d);
      if (wa.slots > 0 && wa.started > 0 && (!bestWeek || wa.perfAll >= bestWeek.ratio)) {
        bestWeek = { w: r.w, ratio: wa.perfAll, live: !!r.live, reached: wa.reached, slots: wa.slots, fullDays: wa.fullDays, trainDays: wa.trainDays };
      }
      if (prevW !== null && C.ymd(C.addDays(C.parseYmd(prevW), 7)) !== r.w) { run = 0; runStart = null; }
      prevW = r.w;

      for (var i = 0; i < 7; i++) {
        var items = r.d[i];
        if (!items) continue;
        var date = C.ymd(C.addDays(mon, i));
        if (date > today) continue;
        var a = C.aggregate([items]);
        if (!a.slots) continue;
        var ok = a.perfAll >= DONE;

        if (a.started > 0 && (!bestDay || a.perfAll >= bestDay.ratio)) {
          bestDay = { date: date, ratio: a.perfAll, items: items.map(function (it) { return { name: it[0], unit: it[1], g: it[2], v: it[3] }; }) };
        }
        items.forEach(function (it) {
          if (!(it[3] > 0)) return;
          var k = it[0] + "|" + it[1], t = byEx[k];
          if (!t) { t = byEx[k] = { name: it[0], unit: it[1], v: 0, g: it[2], date: date }; exOrder.push(k); }
          if (it[3] >= t.v) { t.v = it[3]; t.g = it[2]; t.date = date; }
        });

        if (ok) {
          if (!run) runStart = date;
          run++; runEnd = date;
          if (!best || run >= best.n) best = { n: run, from: runStart, to: runEnd };
        } else if (date === today) {
          /* heute noch offen: bricht die Serie nicht ab */
        } else { run = 0; runStart = null; }
      }
    });

    /* Aktuelle Serie: nur, wenn seit dem letzten geschafften Tag kein Trainingstag (laut aktuellem Plan) ausgefallen ist */
    var current = null;
    if (run > 0 && runEnd) {
      var alive = true;
      for (var d = C.addDays(C.parseYmd(runEnd), 1); C.ymd(d) < today; d = C.addDays(d, 1)) {
        var idx = (d.getDay() + 6) % 7;
        if (!planDays || planDays[idx]) { alive = false; break; }
      }
      if (alive) current = { n: run, from: runStart, to: runEnd };
    }
    return { bestDay: bestDay, bestWeek: bestWeek, exercises: exOrder.map(function (k) { return byEx[k]; }), streak: best, current: current };
  }

  function fmtDate(ymd) {
    return C.parseYmd(ymd).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }
  function fmtShort(ymd) { return C.parseYmd(ymd).toLocaleDateString("de-DE", { day: "numeric", month: "short" }); }
  function weekText(w) {
    var mon = C.parseYmd(w), sun = C.addDays(mon, 6);
    return "KW " + C.isoWeek(mon) + " · " + C.fmtDay(mon) + " – " + C.fmtDay(sun) + " " + sun.getFullYear();
  }
  function weekOf(ymd) {
    var d = C.parseYmd(ymd);
    return "KW " + C.isoWeek(d);
  }

  function block(id, title, big, sub, extra) {
    return el("section", { class: "rec", id: id },
      el("p", { class: "rec-h", text: title }),
      el("p", { class: "rec-big", text: big }),
      sub ? el("p", { class: "rec-sub", text: sub }) : null,
      extra || null);
  }

  function card() {
    var st = S.state();
    var today = C.ymd(new Date());
    var rec = compute(R.all(), today, st.days);
    var kids = [];

    if (!rec.bestDay && !rec.bestWeek && !rec.streak) {
      kids.push(el("p", { class: "hint", id: "rec-empty", text: "Noch keine Rekorde. Sobald du Übungen einträgst, erscheinen hier dein bester Tag, deine beste Woche und deine längste Serie." }));
    } else {
      if (rec.bestDay) {
        var bd = rec.bestDay, ul = el("ul", { class: "rec-list" });
        bd.items.forEach(function (it) {
          var p = C.pct(it.v / it.g);
          ul.append(el("li", null, el("span", { class: "tn", text: it.name }), el("span", { class: "tv", text: it.v + " von " + it.g + " " + it.unit }), el("span", { class: "tp" + (p > 100 ? " over" : ""), text: p + " %" })));
        });
        kids.push(block("rec-day", "Bester Tag", C.pct(bd.ratio) + " %", fmtDate(bd.date) + " · " + weekOf(bd.date), ul));
      }
      if (rec.bestWeek) {
        var bw = rec.bestWeek;
        kids.push(block("rec-week", "Beste Woche", C.pct(bw.ratio) + " %",
          weekText(bw.w) + (bw.live ? " (läuft)" : ""),
          el("p", { class: "rec-sub", text: bw.reached + " von " + bw.slots + " Übungen erreicht · " + bw.fullDays + " von " + bw.trainDays + " Trainingstagen komplett" })));
      }
      if (rec.streak) {
        var s = rec.streak;
        kids.push(block("rec-streak", "Längste Serie", plural(s.n, "Tag", "Tage") + " in Folge",
          "Tagesziel jeweils erreicht, " + fmtShort(s.from) + " bis " + fmtShort(s.to) + " " + C.parseYmd(s.to).getFullYear() + ". Ruhetage unterbrechen die Serie nicht.",
          el("p", { class: "rec-sub", id: "rec-current", text: rec.current ? "Aktuelle Serie: " + plural(rec.current.n, "Tag", "Tage") + (rec.current.n >= s.n ? " (gleich Rekord)" : "") : "Aktuelle Serie: 0 Tage" })));
      }
      if (rec.exercises.length) {
        var ex = el("ul", { class: "rec-list", id: "rec-ex" });
        rec.exercises.forEach(function (t) {
          ex.append(el("li", null, el("span", { class: "tn", text: t.name }), el("span", { class: "tv", text: t.v + " " + t.unit }), el("span", { class: "tp", text: fmtShort(t.date) })));
        });
        kids.push(el("section", { class: "rec" }, el("p", { class: "rec-h", text: "Bestwert je Übung an einem Tag" }), ex));
      }
    }
    return App.fold("rek", "Rekorde", "rep-records", kids);
  }

  App.records = { compute: compute, card: card };
})();
