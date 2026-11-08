/* Abzeichen: Stufen für Serien, Wochen am Stück, Trainingstage, Übungen über dem Ziel und Gesamtmengen je Übung.
   compute() ist reine Rechnung auf den Wochenberichten (inklusive der laufenden Woche), card() baut den Aufklapper für den Reiter Berichte.
   Eine Stufe bleibt erreicht, auch wenn die Serie später reißt: gezählt wird der Bestwert (Serien) oder die Summe (Mengen).
   Regeln: ein Tag ist geschafft bei 100 %, eine Woche ist geschafft, wenn ihre Gesamtleistung 100 % erreicht.
   Die laufende Woche zählt erst, wenn sie geschafft ist, und unterbricht eine Serie nicht, solange sie offen ist. */
(function () {
  "use strict";
  var el = App.el, C = App.calc, R = App.reports;
  var DONE = 0.9999;

  var TIERS = {
    streak: [3, 7, 14, 30, 60, 100],
    weeks: [2, 4, 10, 26, 52],
    days: [10, 25, 50, 100, 200, 365],
    over: [1, 5, 10, 25, 50],
    reps: [100, 500, 1000, 2500, 5000, 10000],
    mins: [10, 30, 60, 180, 600, 1200]
  };

  function nf(n) { return Math.round(n).toLocaleString("de-DE"); }
  function plural(n, one, many) { return nf(n) + " " + (n === 1 ? one : many); }
  function fmtDays(n) { return plural(n, "Tag", "Tage"); }
  function fmtWeeks(n) { return plural(n, "Woche", "Wochen"); }
  function fmtMins(n) { return n >= 60 && n % 60 === 0 ? nf(n / 60) + " Std." : nf(n) + " Min."; }
  function fmtReps(n) { return nf(n) + " Wdh."; }

  /* Wie viele Stufen sind erreicht und was ist die nächste? */
  function level(value, tiers) {
    var n = 0;
    while (n < tiers.length && value >= tiers[n]) n++;
    return { n: n, total: tiers.length, next: n < tiers.length ? tiers[n] : null };
  }

  /* list: Wochen wie R.all() sie liefert, nach Woche sortiert. today: "JJJJ-MM-TT". planDays: Trainingstage des aktuellen Plans. */
  function compute(list, today, planDays) {
    var rec = App.records.compute(list, today, planDays);
    var days = 0, over = 0, ex = {}, order = [];
    var run = 0, bestRun = 0, lastW = null;

    list.forEach(function (r) {
      var mon = C.parseYmd(r.w), wa = C.aggregate(r.d);
      var good = wa.slots > 0 && wa.perfAll >= DONE;
      if (!(r.live && !good)) {
        if (lastW !== null && C.ymd(C.addDays(C.parseYmd(lastW), 7)) !== r.w) run = 0;
        if (good) { run++; lastW = r.w; if (run > bestRun) bestRun = run; }
        else { run = 0; lastW = r.w; }
      }
      for (var i = 0; i < 7; i++) {
        var items = r.d[i];
        if (!items) continue;
        if (C.ymd(C.addDays(mon, i)) > today) continue;
        var a = C.aggregate([items]);
        if (a.started > 0) days++;
        if (a.slots && a.perfAll > 1.0001) over++;
        items.forEach(function (it) {
          if (!(it[3] > 0)) return;
          var k = it[0] + "|" + it[1], t = ex[k];
          if (!t) { t = ex[k] = { name: it[0], unit: it[1], v: 0 }; order.push(k); }
          t.v += it[3];
        });
      }
    });

    /* Aktuelle Wochenserie: nur, wenn keine Woche seit der letzten geschafften ausgefallen ist */
    var curWeeks = 0;
    if (run > 0 && lastW !== null) {
      var thisMon = C.ymd(C.addDays(C.parseYmd(today), -((C.parseYmd(today).getDay() + 6) % 7)));
      var prevMon = C.ymd(C.addDays(C.parseYmd(thisMon), -7));
      if (lastW >= prevMon) curWeeks = run;
    }

    var exercises = order.map(function (k) {
      var t = ex[k], time = t.unit !== "Wdh.";
      var value = t.unit === "Sek." ? t.v / 60 : t.v;
      return { name: t.name, unit: t.unit, total: t.v, value: value, time: time, level: level(value, time ? TIERS.mins : TIERS.reps) };
    });
    var longest = rec.streak ? rec.streak.n : 0;
    var curStreak = rec.current ? rec.current.n : 0;
    var families = [
      { id: "streak", title: "Serie", text: "Tagesziele in Folge", value: longest, cur: curStreak, tiers: TIERS.streak, fmt: fmtDays, level: level(longest, TIERS.streak), curLabel: "Aktuelle Serie" },
      { id: "weeks", title: "Wochen am Stück", text: "Wochenziel (100 %) in aufeinanderfolgenden Wochen", value: bestRun, cur: curWeeks, tiers: TIERS.weeks, fmt: fmtWeeks, level: level(bestRun, TIERS.weeks), curLabel: "Aktuell" },
      { id: "days", title: "Trainingstage", text: "Tage mit mindestens einer eingetragenen Übung", value: days, tiers: TIERS.days, fmt: fmtDays, level: level(days, TIERS.days) },
      { id: "over", title: "Über dem Ziel", text: "Tage mit mehr als 100 %", value: over, tiers: TIERS.over, fmt: fmtDays, level: level(over, TIERS.over) }
    ];
    var earned = 0, total = 0;
    families.forEach(function (f) { earned += f.level.n; total += f.level.total; });
    exercises.forEach(function (e) { earned += e.level.n; total += e.level.total; });
    return { families: families, exercises: exercises, earned: earned, total: total };
  }

  function medals(tiers, value, fmt) {
    var ul = el("ul", { class: "bd-row" });
    tiers.forEach(function (t, i) {
      var got = value >= t;
      ul.append(el("li", { class: "bd" + (got ? " got" : "") },
        el("span", { class: "bd-ring", "aria-hidden": "true", text: got ? "✓" : String(i + 1) }),
        el("span", { class: "bd-l", text: fmt(t) }),
        el("span", { class: "sr", text: got ? "erreicht" : "noch nicht erreicht" })));
    });
    return ul;
  }

  function nextText(lv, value, fmt) {
    if (lv.next === null) return "Alle Stufen erreicht.";
    return "Noch " + fmt(Math.ceil(lv.next - value)) + " bis zur nächsten Stufe (" + fmt(lv.next) + ").";
  }

  function bar(value, lv, tiers) {
    var prev = lv.n ? tiers[lv.n - 1] : 0;
    var p = lv.next === null ? 100 : Math.max(0, Math.min(100, (value - prev) / (lv.next - prev) * 100));
    var i = el("i");
    i.style.width = p + "%";
    return el("div", { class: "bar bd-bar", "aria-hidden": "true" }, i);
  }

  function card() {
    var st = App.store.state();
    var b = compute(R.all(), C.ymd(new Date()), st.days);
    var kids = [el("p", { class: "hint", id: "bd-sum", text: nf(b.earned) + " von " + nf(b.total) + " Abzeichen erreicht. Eine erreichte Stufe bleibt dir, auch wenn eine Serie später reißt." })];

    b.families.forEach(function (f) {
      var sec = el("section", { class: "rec bd-fam", id: "bd-" + f.id },
        el("p", { class: "rec-h", text: f.title + " · Stufe " + f.level.n + " von " + f.level.total }),
        el("p", { class: "rec-sub", text: f.text }),
        medals(f.tiers, f.value, f.fmt),
        bar(f.value, f.level, f.tiers),
        el("p", { class: "rec-sub bd-next", text: (f.cur !== undefined ? f.curLabel + ": " + f.fmt(f.cur) + " · Bestwert: " + f.fmt(f.value) + ". " : "Bisher: " + f.fmt(f.value) + ". ") + nextText(f.level, f.value, f.fmt) }));
      kids.push(sec);
    });

    kids.push(el("h3", { text: "Gesamtmenge je Übung" }));
    if (!b.exercises.length) {
      kids.push(el("p", { class: "hint", id: "bd-ex-empty", text: "Sobald du Übungen einträgst, sammelst du hier Stufen für die Gesamtmenge, zum Beispiel 1.000 Liegestütze." }));
    } else {
      b.exercises.forEach(function (e) {
        var tiers = e.time ? TIERS.mins : TIERS.reps, fmt = e.time ? fmtMins : fmtReps;
        kids.push(el("section", { class: "rec bd-fam bd-ex" },
          el("p", { class: "rec-h", text: e.name + " · Stufe " + e.level.n + " von " + e.level.total }),
          el("p", { class: "rec-sub", text: "Insgesamt " + (e.time ? fmtMins(e.value) : fmtReps(e.value)) + ". " + nextText(e.level, e.value, fmt) }),
          medals(tiers, e.value, fmt),
          bar(e.value, e.level, tiers)));
      });
    }
    return App.fold("abz", "Abzeichen", "rep-badges", kids);
  }

  App.badges = { compute: compute, card: card, TIERS: TIERS };
})();
