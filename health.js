/* Gesundheitswerte: BMI und geschätzter Kalorienverbrauch aus den persönlichen Angaben und den eingetragenen Übungen.
   Alles sind Richtwerte, keine Messung und keine Diagnose.
   Kalorien = MET x Gewicht (kg) x Dauer (Stunden). MET ist der Energieaufwand einer Tätigkeit im Vergleich zum Ruhezustand (Compendium of Physical Activities).
   Bei Zeit-Übungen (Sek., Min.) zählt die eingetragene Zeit, bei Wiederholungen eine feste Dauer je Wiederholung.
   Ein Bericht trägt den Stand von Gewicht und Größe der Woche (r.h = { kg, cm }), damit alte Berichte sich nicht ändern, wenn sich dein Gewicht ändert. */
(function () {
  "use strict";
  var el = App.el, C = App.calc, S = App.store;

  /* [Muster im Namen, MET, Sekunden je Wiederholung]. Der erste Treffer gilt. */
  var REPS = [
    [/liegest|push/, 8, 3], [/klimm|pull|chin/, 8, 4], [/burpee/, 10, 4], [/dip/, 8, 3],
    [/seil|spring|jump/, 11, 1], [/sit|crunch|bauch/, 5, 3], [/kniebeug|squat/, 5, 3], [/ausfall|lunge/, 5, 3]
  ];
  var REPS_DEFAULT = [5, 3];
  /* Zeit-Übungen: [Muster, MET] */
  var TIMED = [
    [/seil|rope|spring|jump/, 11.8], [/lauf|jogg|run|renn/, 9.8], [/rad|bike|cycl/, 7.5], [/schwimm|swim/, 7],
    [/dehn|stretch|yoga/, 2.5], [/plank|stütz|stuetz|unterarm/, 3.8]
  ];
  var TIMED_DEFAULT = 4.5;

  function secondsOf(unit, v) { return unit === "Min." ? v * 60 : v; }

  /* Geschätzte kcal für einen Posten: name, Einheit, Menge, Gewicht in kg */
  function kcalItem(name, unit, v, kg, own) {
    if (!(v > 0)) return 0;
    if (own > 0) return own * v;
    if (!(kg > 0)) return 0;
    var n = String(name).toLowerCase(), met, sec;
    if (unit === "Wdh.") {
      var m = REPS_DEFAULT;
      for (var i = 0; i < REPS.length; i++) if (REPS[i][0].test(n)) { m = [REPS[i][1], REPS[i][2]]; break; }
      met = m[0];
      sec = v * m[1];
    } else {
      met = TIMED_DEFAULT;
      for (var j = 0; j < TIMED.length; j++) if (TIMED[j][0].test(n)) { met = TIMED[j][1]; break; }
      sec = secondsOf(unit, v);
    }
    return met * kg * sec / 3600;
  }

  /* Ein Tag ist null (Ruhetag) oder eine Liste [Name, Einheit, Ziel, Erreicht] */
  function kcalDay(items, kg) {
    if (!items) return 0;
    return items.reduce(function (s, it) { return s + kcalItem(it[0], it[1], it[3], kg, it[4]); }, 0);
  }
  function kcalDays(days, kg) {
    return days.reduce(function (s, items) { return s + kcalDay(items, kg); }, 0);
  }

  /* Automatischer Wert je Einheit (eine Wiederholung, eine Sekunde oder eine Minute), nur mit Gewicht */
  function autoPer(name, unit, kg) { return kcalItem(name, unit, 1, kg); }

  function bmi(cm, kg) {
    if (!(cm > 0) || !(kg > 0)) return null;
    var m = cm / 100;
    return kg / (m * m);
  }
  /* Bereiche für Erwachsene nach WHO */
  function bmiCat(b) {
    return b < 18.5 ? "Untergewicht" : b < 25 ? "Normalgewicht" : b < 30 ? "Übergewicht" : "Adipositas";
  }

  function fmt1(n) { return n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
  function fmtKcal(n) { return "≈ " + Math.round(n).toLocaleString("de-DE") + " kcal"; }

  /* Gewicht und Größe, die für einen Bericht gelten. Laufende Woche und alte Berichte ohne Stand nutzen die heutigen Angaben (now = true bei alten). */
  function basis(r) {
    var cur = App.persona.get();
    /* Gewicht aus dem Gewichtsverlauf: das letzte an oder vor dem Ende der Woche (bei der laufenden Woche: heute) */
    var end = C.ymd(C.addDays(C.parseYmd(r.w), 6)), now = C.ymd(new Date());
    if (end > now) end = now;
    var logged = App.weight.at(end);
    if (r.live) return { kg: logged !== null ? logged : cur.weight, cm: cur.height, now: false };
    if (r.h) return { kg: logged !== null ? logged : r.h.kg == null ? null : r.h.kg, cm: r.h.cm == null ? null : r.h.cm, now: false };
    return { kg: logged !== null ? logged : cur.weight, cm: cur.height, now: logged === null };
  }

  function goSettings() { App.fold.show("pers"); location.hash = "#optionen"; }

  var flash = "";
  var NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function fmtDate(d) { return C.parseYmd(d).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" }); }
  function fmtShort(d) { return C.parseYmd(d).toLocaleDateString("de-DE", { day: "numeric", month: "numeric" }); }
  function kgText(n) { return n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " kg"; }
  function signed(n) { return (n > 0 ? "+" : n < 0 ? "−" : "±") + Math.abs(n).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " kg"; }

  /* Linie über die letzten 60 Einträge, Zeitachse nach Datum */
  function weightChart(list, target) {
    var pts = list.slice(-60);
    var W = 320, H = 170, L = 38, R = 14, T = 12, B = 26;
    var vals = pts.map(function (x) { return x.kg; });
    if (target > 0) vals.push(target);
    var lo = Math.floor(Math.min.apply(null, vals) - 0.5), hi = Math.ceil(Math.max.apply(null, vals) + 0.5);
    if (hi - lo < 2) { hi += 1; lo -= 1; }
    var t0 = C.parseYmd(pts[0].d).getTime(), t1 = C.parseYmd(pts[pts.length - 1].d).getTime(), span = Math.max(1, t1 - t0);
    function X(d) { return L + (C.parseYmd(d).getTime() - t0) / span * (W - L - R); }
    function Y(v) { return T + (hi - v) / (hi - lo) * (H - T - B); }
    var first = pts[0], last = pts[pts.length - 1];
    var g = svg("svg", { viewBox: "0 0 " + W + " " + H, class: "wl", role: "img",
      "aria-label": "Gewichtsverlauf von " + fmtDate(first.d) + " bis " + fmtDate(last.d) + ", von " + kgText(first.kg) + " auf " + kgText(last.kg) });
    [lo, (lo + hi) / 2, hi].forEach(function (v) {
      g.appendChild(svg("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), class: "wl-grid" }));
      g.appendChild(svg("text", { x: L - 6, y: Y(v) + 4, class: "wl-t", "text-anchor": "end" }, String(Math.round(v * 10) / 10).replace(".", ",")));
    });
    g.appendChild(svg("text", { x: L, y: H - 6, class: "wl-t", "text-anchor": "start" }, fmtShort(first.d)));
    if (pts.length > 1) g.appendChild(svg("text", { x: W - R, y: H - 6, class: "wl-t", "text-anchor": "end" }, fmtShort(last.d)));
    if (target > 0) {
      g.appendChild(svg("line", { x1: L, x2: W - R, y1: Y(target), y2: Y(target), class: "wl-target" }));
      g.appendChild(svg("text", { x: W - R, y: Y(target) - 4, class: "wl-t", "text-anchor": "end" }, "Ziel " + String(target).replace(".", ",")));
    }
    g.appendChild(svg("polyline", { points: pts.map(function (x) { return X(x.d).toFixed(1) + "," + Y(x.kg).toFixed(1); }).join(" "), class: "wl-line", fill: "none" }));
    pts.forEach(function (x, i) {
      var c = svg("circle", { cx: X(x.d).toFixed(1), cy: Y(x.kg).toFixed(1), r: i === pts.length - 1 ? 4.5 : 3, class: "wl-dot" });
      c.appendChild(svg("title", {}, fmtDate(x.d) + ": " + kgText(x.kg)));
      g.appendChild(c);
    });
    return g;
  }

  /* Farbverlauf vom Start (rot) über Orange, Gelb und Hellgrün bis zum Ziel (dunkelgrün) */
  var STOPS = [[0, [2, 78, 48]], [0.3, [28, 90, 50]], [0.55, [48, 95, 48]], [0.8, [95, 60, 48]], [1, [140, 65, 30]]];
  function hsl(c) { return "hsl(" + c[0] + " " + c[1] + "% " + c[2] + "%)"; }
  function colorAt(p) {
    p = Math.max(0, Math.min(1, p));
    for (var i = 1; i < STOPS.length; i++) {
      if (p <= STOPS[i][0]) {
        var a = STOPS[i - 1], b = STOPS[i], t = (p - a[0]) / (b[0] - a[0]);
        return hsl(a[1].map(function (v, k) { return Math.round(v + (b[1][k] - v) * t); }));
      }
    }
    return hsl(STOPS[STOPS.length - 1][1]);
  }

  /* Wie weit das aktuelle Gewicht vom Zielgewicht entfernt ist. Start ist der erste Eintrag im Gewichtsverlauf. */
  function goalState(list, P) {
    if (!(P.target > 0) || !(P.weight > 0)) return null;
    var cur = P.weight, tg = P.target, start = list.length ? list[0].kg : null;
    var left = Math.round(Math.abs(cur - tg) * 10) / 10;
    var p = null;
    if (start !== null) {
      var denom = start - tg;
      p = Math.abs(denom) < 0.05 ? (left < 0.05 ? 1 : 0) : (start - cur) / denom;
    }
    var reached = p !== null ? p >= 1 - 1e-9 : false;
    if (p === null) reached = left < 0.05;
    return { cur: cur, target: tg, start: start, p: p, left: left, reached: reached, beyond: reached && left >= 0.05 && p !== null && p > 1 };
  }

  function goalBlock(list, P) {
    var g = goalState(list, P);
    if (!g) {
      return el("p", { class: "hint", id: "hv-goal-none", text: P.target > 0 ? "Für den Abstand zum Ziel fehlt dein aktuelles Gewicht." : "Dein Zielgewicht legst du unter Einstellungen > Persönliche Angaben fest, dann siehst du hier, wie weit du noch davon entfernt bist." });
    }
    var text = g.reached
      ? (g.beyond ? "Ziel erreicht und " + kgText(g.left) + " darüber hinaus." : "Ziel erreicht.")
      : "Noch " + kgText(g.left) + " bis zum Ziel von " + kgText(g.target) + ".";
    var kids = [el("p", { class: "goal-t", id: "hv-goal-text", text: text })];
    if (g.p !== null) {
      var pos = Math.max(0, Math.min(1, g.p));
      var pin = el("span", { class: "goal-pin", id: "hv-goal-pin" });
      pin.style.left = (pos * 100) + "%";
      pin.style.background = colorAt(g.p);
      var track = el("div", { class: "goal-track", "aria-hidden": "true" }, pin);
      var pct = Math.round(pos * 100);
      var wrap = el("div", { class: "goal-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pct), "aria-valuetext": pct + " Prozent des Wegs zum Zielgewicht geschafft" }, track,
        el("div", { class: "goal-ends", "aria-hidden": "true" }, el("span", { text: "Start " + kgText(g.start) }), el("span", { text: "Ziel " + kgText(g.target) })));
      kids.push(wrap);
      kids.push(el("p", { class: "hint", id: "hv-goal-pct", text: pct + " % des Wegs geschafft." }));
    }
    var sec = el("section", { class: "rec goalbox" }, el("p", { class: "rec-h", text: "Abstand zum Zielgewicht" }));
    kids.forEach(function (k) { sec.append(k); });
    return sec;
  }

  function weightSection() {
    var list = App.weight.list();
    var todayStr = C.ymd(new Date());
    var msg = el("p", { class: "msg", role: "status", id: "hv-w-msg", text: flash });
    flash = "";
    function say(t) { msg.textContent = t; msg.classList.add("err"); }

    var inp = el("input", { type: "text", class: "in num", id: "hv-w", inputmode: "decimal", autocomplete: "off", maxlength: "6", placeholder: "70,5", "aria-label": "Gewicht in Kilogramm" });
    var date = el("input", { type: "date", class: "in", id: "hv-wd", max: todayStr, "aria-label": "Datum" });
    date.value = todayStr;
    function save() {
      var v = Math.round(Number(inp.value.trim().replace(",", ".")) * 10) / 10;
      if (!(v >= 20 && v <= 300)) { say("Bitte gib ein Gewicht zwischen 20 und 300 kg ein."); return; }
      var d = date.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > todayStr) { say("Bitte wähle ein Datum bis heute."); return; }
      if (!App.weight.add(d, v)) { say("Das konnte nicht gespeichert werden."); return; }
      flash = kgText(v) + " für " + fmtDate(d) + " gespeichert.";
      App.fold.show("ges");
      App.rerender();
    }
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); save(); } });

    var kids = [
      el("h3", { text: "Gewichtsverlauf" }),
      el("div", { class: "hv-form" },
        el("label", { class: "lab", for: "hv-w", text: "Gewicht" }), inp, el("span", { class: "kc-u", text: "kg" }),
        el("label", { class: "sr", for: "hv-wd", text: "Datum" }), date,
        el("button", { type: "button", class: "btn primary", id: "hv-wadd", text: "Eintragen", onclick: save })),
      msg
    ];
    if (!list.length) {
      kids.push(el("p", { class: "hint", id: "hv-w-empty", text: "Trage dein Gewicht ein, zum Beispiel einmal pro Woche. Der BMI und die Kalorien rechnen dann mit dem Gewicht, das zu dem Zeitraum passt." }));
      kids.push(goalBlock(list, App.persona.get()));
      return kids;
    }
    var first = list[0], last = list[list.length - 1];
    var P = App.persona.get();
    if (list.length > 1) kids.push(weightChart(list, P.target));
    kids.push(el("p", { class: "sum", id: "hv-w-sum", text: "Aktuell " + kgText(last.kg) + " (" + fmtDate(last.d) + ")" +
      (list.length > 1 ? " · seit " + fmtDate(first.d) + ": " + signed(Math.round((last.kg - first.kg) * 10) / 10) : "") }));
    kids.push(goalBlock(list, P));
    var ul = el("ul", { class: "wl-list" });
    list.slice().reverse().slice(0, 60).forEach(function (x) {
      ul.append(el("li", null,
        el("span", { class: "wl-d", text: fmtDate(x.d) }), el("strong", { text: kgText(x.kg) }),
        App.confirmButton("Löschen", "Wirklich löschen", function () { App.weight.remove(x.d); App.fold.show("ges"); App.rerender(); }, { "aria-label": "Eintrag vom " + fmtDate(x.d) + " löschen" })));
    });
    kids.push(el("details", { class: "wl-all" }, el("summary", { text: "Alle Einträge (" + list.length + ")" }), ul));
    return kids;
  }

  /* Aufklapper für den Reiter Berichte */
  function card() {
    var P = App.persona.get(), st = S.state();
    var kids = weightSection();

    var b = bmi(P.height, P.weight);
    kids.push(el("h3", { text: "BMI" }));
    if (b === null) {
      kids.push(el("p", { class: "hint", id: "hv-bmi-missing", text: "Für den BMI fehlen Körpergröße und Gewicht." }));
    } else {
      kids.push(el("section", { class: "rec", id: "hv-bmi" },
        el("p", { class: "rec-big", text: fmt1(b) }),
        el("p", { class: "rec-sub", id: "hv-bmi-cat", text: "Bereich: " + bmiCat(b) }),
        el("p", { class: "rec-sub", text: "Bei " + P.height + " cm und " + String(P.weight).replace(".", ",") + " kg." })));
      kids.push(el("p", { class: "hint", text: "Der BMI ist nur eine grobe Orientierung für Erwachsene (Bereiche der WHO) und keine Diagnose. Muskelmasse und Körperbau rechnet er nicht ein." }));
    }

    kids.push(el("h3", { text: "Kalorienverbrauch (geschätzt)" }));
    var day = kcalDay(C.dayItems(st, App.todayIdx()), P.weight);
    var week = kcalDays(C.allDays(st), P.weight);
    var anyOwn = st.exercises.some(function (e) { return e.kcal > 0; });
    if (!(P.weight > 0) && !anyOwn) {
      kids.push(el("p", { class: "hint", id: "hv-kcal-missing", text: "Für die Schätzung fehlt dein Gewicht." }));
    } else {
      kids.push(el("div", { class: "hv-two" },
        el("section", { class: "rec", id: "hv-day" }, el("p", { class: "rec-h", text: "Heute" }), el("p", { class: "rec-big", id: "hv-kcal-day", text: fmtKcal(day) })),
        el("section", { class: "rec", id: "hv-week" }, el("p", { class: "rec-h", text: "Diese Woche" }), el("p", { class: "rec-big", id: "hv-kcal-week", text: fmtKcal(week) }))));
      kids.push(el("p", { class: "hint", text: "Berechnet aus deinen eingetragenen Übungen und deinem Gewicht. Wiederholungen zählen mit etwa 3 Sekunden, bei Zeit-Übungen zählt die eingetragene Zeit. Einen eigenen Wert je Übung stellst du im Reiter Übungen ein. Ein grober Richtwert, der echte Verbrauch weicht ab." }));
    }
    if (b === null || (!(P.weight > 0) && !anyOwn)) {
      kids.push(el("div", null, el("button", { type: "button", class: "btn", id: "hv-go", text: "Persönliche Angaben eintragen", onclick: goSettings })));
    }
    return App.fold("ges", "Gesundheitswerte", "rep-health", kids);
  }

  App.health = { kcalItem: kcalItem, kcalDay: kcalDay, kcalDays: kcalDays, autoPer: autoPer, goalState: goalState, colorAt: colorAt, bmi: bmi, bmiCat: bmiCat, basis: basis, fmt1: fmt1, fmtKcal: fmtKcal, card: card };
})();
