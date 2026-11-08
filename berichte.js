/* Reiter 3: Berichte. Wochen oder Monate, Verlaufsdiagramm, aufklappbare Details, Daten sichern und importieren. */
(function () {
  "use strict";
  var el = App.el, C = App.calc, R = App.reports, F = App.files;
  var mode = "weeks";
  var flash = null;

  function perf(v) { return v === null ? "–" : C.pct(v) + " %"; }
  function monthKey(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
  function monthDate(k) { return new Date(+k.slice(0, 4), +k.slice(5) - 1, 1); }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  /* Gesundheitswerte einer Woche: geschätzte kcal und BMI nach den Körperwerten, die für den Bericht gelten */
  function weekHealth(r) {
    var H = App.health, b = H.basis(r);
    var total = H.kcalDays(r.d, b.kg);
    var kcal = b.kg > 0 || total > 0 ? total : null;
    var bmi = H.bmi(b.cm, b.kg);
    return { kcal: kcal, bmi: bmi, now: b.now };
  }

  /* Zeilen aufsteigend nach Zeit: je Woche oder je Kalendermonat (nach dem Datum jedes Tages) */
  function buildRows(m) {
    var list = R.all();
    if (m === "weeks") {
      return list.map(function (r) {
        var mon = C.parseYmd(r.w), sun = C.addDays(mon, 6), kw = C.isoWeek(mon);
        return {
          kind: "week", key: r.w, w: r.w, d: r.d, n: r.n || null, live: !!r.live, label: String(kw), title: "KW " + kw,
          sub: C.fmtDay(mon) + " – " + C.fmtDay(sun) + " " + sun.getFullYear(), agg: C.aggregate(r.d), health: weekHealth(r)
        };
      });
    }
    var months = {}, keys = [];
    list.forEach(function (r) {
      var mon = C.parseYmd(r.w), wh = weekHealth(r), H = App.health, kgw = H.basis(r).kg;
      for (var i = 0; i < 7; i++) {
        var k = monthKey(C.addDays(mon, i));
        var o = months[k];
        if (!o) { o = months[k] = { days: [], weeks: {}, live: false, kcal: null, bmi: null, now: false }; keys.push(k); }
        o.days.push(r.d[i]);
        if (wh.kcal !== null) o.kcal = (o.kcal || 0) + H.kcalDay(r.d[i], kgw);
        if (wh.bmi !== null) o.bmi = wh.bmi;
        if (wh.now) o.now = true;
        o.weeks[r.w] = 1;
        if (r.live) o.live = true;
      }
    });
    keys.sort();
    return keys.map(function (k) {
      var o = months[k], a = C.aggregate(o.days), dt = monthDate(k);
      return {
        kind: "month", key: k, live: o.live, d: null,
        label: dt.toLocaleDateString("de-DE", { month: "short" }).replace(".", ""),
        title: dt.toLocaleDateString("de-DE", { month: "long", year: "numeric" }),
        sub: plural(a.trainDays, "Trainingstag", "Trainingstage") + " · " + plural(Object.keys(o.weeks).length, "Woche", "Wochen"),
        agg: a, health: { kcal: o.kcal, bmi: o.bmi, now: o.now }
      };
    });
  }

  /* Zeilen für Wochen- und Monatsberichte, leer wenn weder Gewicht noch Größe bekannt sind */
  function healthRows(h) {
    var H = App.health, out = [], suffix = h.now ? " · mit deinen heutigen Angaben" : "";
    if (h.kcal !== null) out.push(["Kalorien (geschätzt)", H.fmtKcal(h.kcal) + suffix]);
    if (h.bmi !== null) out.push(["BMI", H.fmt1(h.bmi) + " · " + H.bmiCat(h.bmi) + suffix]);
    return out;
  }

  function statsDl(rows) {
    var dl = el("dl", { class: "stats" });
    rows.forEach(function (r) { dl.append(el("div", null, el("dt", { text: r[0] }), el("dd", { text: r[1] }))); });
    return dl;
  }

  function dayStrip(days) {
    var strip = el("div", { class: "strip" });
    days.forEach(function (items, i) {
      var a = items ? C.aggregate([items]) : null;
      var p = a && a.slots ? C.pct(a.perfAll) : null;
      var fill = el("i");
      fill.style.width = p === null ? "0%" : Math.min(100, p) + "%";
      strip.append(el("div", { class: "day" + (items ? "" : " rest") + (p === 100 ? " full" : "") + (p !== null && p > 100 ? " over" : "") },
        el("span", { class: "dn", text: App.DAYS[i].s }),
        el("span", { class: "pb" }, fill),
        el("span", { class: "dp", text: !items ? "Ruhe" : p === null ? "–" : p + "%" })
      ));
    });
    return strip;
  }

  /* Notizen der Woche, nur Wochenberichte haben welche */
  function notesList(n) {
    var days = n ? Object.keys(n).sort() : [];
    if (!days.length) return null;
    var ul = el("ul", { class: "notes-list" });
    days.forEach(function (i) { ul.append(el("li", null, el("strong", { text: App.DAYS[i].s }), el("span", { text: n[i] }))); });
    return el("div", { class: "totals notes" }, el("p", { class: "sub-h", text: "Notizen" }), ul);
  }

  function totals(a) {
    var box = el("div", { class: "totals" }, el("p", { class: "sub-h", text: "Pro Übung" }));
    a.order.forEach(function (k) {
      var t = a.byEx[k], p = C.pct(t.v / t.g);
      box.append(el("div", { class: "trow" },
        el("span", { class: "tn", text: t.name }),
        el("span", { class: "tv", text: t.v + " von " + t.g + " " + t.unit }),
        el("span", { class: "tp" + (p > 100 ? " over" : ""), text: p + " %" })
      ));
    });
    return box;
  }

  function item(r) {
    var a = r.agg, p = C.pct(a.perfAll);
    var state = p > 100 ? "over" : p === 100 ? "full" : "";
    var fill = el("i");
    fill.style.width = Math.min(100, p) + "%";
    var title = el("span", { class: "rep-t", text: r.title });
    if (r.live) title.append(" ", el("span", { class: "pill", text: "läuft" }));
    var body = el("div", { class: "rep-body" },
      statsDl([
        ["Übungen erreicht", a.reached + " von " + a.slots],
        ["Trainingstage komplett", a.fullDays + " von " + a.trainDays],
        ["Leistung der gemachten Übungen", perf(a.perfStarted)]
      ].concat(healthRows(r.health))),
      r.kind === "week" ? dayStrip(r.d) : null,
      r.kind === "week" ? notesList(r.n) : null,
      totals(a),
      r.kind === "week" && !r.live
        ? App.confirmButton("Bericht löschen", "Wirklich löschen", function () { R.remove(r.w); App.rerender(); })
        : null
    );
    return el("details", { class: "rep" + (state ? " is-" + state : "") },
      el("summary", null,
        title,
        el("span", { class: "rep-p" + (state ? " " + state : ""), text: p + " %" }),
        el("span", { class: "rep-s", text: r.sub }),
        el("div", { class: "bar" }, fill)
      ),
      body
    );
  }

  /* Diagramm: die letzten 12 Zeilen, eine Skala für Balken und Ziellinie, Werte über den Balken */
  function chartCard(rs) {
    var shown = rs.slice(-12);
    var vals = shown.map(function (r) { return C.pct(r.agg.perfAll); });
    var max = Math.max(120, Math.ceil(Math.max.apply(null, vals) * 1.15 / 20) * 20);
    var plot = el("div", { class: "plot" });
    var goal = el("div", { class: "goal" });
    goal.style.bottom = (100 / max * 100) + "%";
    plot.append(goal);
    var xl = el("div", { class: "xl", "aria-hidden": "true" });
    shown.forEach(function (r, i) {
      var p = vals[i];
      var bar = el("div", { class: "b" }, el("span", { class: "v", text: String(p) }));
      bar.style.height = (p / max * 100) + "%";
      plot.append(el("div", {
        class: "col" + (r.live ? " live" : "") + (p === 100 ? " full" : "") + (p > 100 ? " over" : ""),
        role: "img", title: r.title + ": " + p + " %", "aria-label": r.title + ": " + p + " Prozent" + (r.live ? ", läuft noch" : "")
      }, bar));
      xl.append(el("span", { text: r.label }));
    });

    var rated = rs.filter(function (r) { return r.agg.slots > 0; });
    var best = rated.reduce(function (b, r) { return !b || r.agg.perfAll > b.agg.perfAll ? r : b; }, null);
    var avg = rated.reduce(function (s, r) { return s + r.agg.perfAll; }, 0) / (rated.length || 1);
    var unit = mode === "weeks" ? plural(rs.length, "Woche", "Wochen") : plural(rs.length, "Monat", "Monate");

    return el("section", { class: "card" },
      el("h2", { text: "Verlauf" }),
      el("p", { class: "hint", text: "Leistung in Prozent vom Ziel, " + (mode === "weeks" ? "pro Kalenderwoche" : "pro Monat") + "." }),
      el("div", { class: "legend" },
        el("span", null, el("i"), "unter dem Ziel"),
        el("span", null, el("i", { class: "g" }), "Ziel erreicht"),
        el("span", null, el("i", { class: "o" }), "über dem Ziel"),
        el("span", null, el("i", { class: "d" }), "100 %")
      ),
      plot, xl,
      el("p", { class: "sum", text: unit + " · Ø " + C.pct(avg) + " % · Bestwert " + (best ? C.pct(best.agg.perfAll) + " % (" + best.title + ")" : "–") })
    );
  }

  function dataCard() {
    var msg = el("p", { class: "msg", role: "status", id: "rep-export-msg" });
    function say(t, err) { msg.textContent = t || ""; msg.classList.toggle("err", !!err); }
    var day = C.ymd(new Date());

    function exportBtn(label, name, make, mime) {
      return el("button", {
        type: "button", class: "btn", text: label,
        onclick: function () {
          if (!R.archivedCount()) { say("Noch keine abgeschlossene Woche zum Sichern.", true); return; }
          F.save(name, make(), mime).then(function (r) {
            if (r === "ok") say("Datei erstellt: " + name);
            else if (r === "unsupported") say("Speichern ist hier nicht möglich. Nutze „JSON kopieren“.", true);
            else if (r === "error") say("Das Speichern hat nicht geklappt. Nutze „JSON kopieren“.", true);
          });
        }
      });
    }

    var imp = F.importBox({
      id: "rep",
      parse: function (text) {
        var r = R.parse(text);
        if (!r.ok) return r;
        return {
          ok: true,
          text: plural(r.reports.length, "Wochenbericht", "Wochenberichte") + " gefunden, " + r.range + ". Gleiche Wochen werden ersetzt, alles andere bleibt.",
          actions: [{ label: "Hinzufügen", primary: true, run: function () {
            var saved = App.backup.snapshot("merge");
            flash = plural(R.merge(r.reports), "Bericht", "Berichte") + " importiert." + (saved ? " Rückgängig machen kannst du es in den Einstellungen unter „Sicherheitskopie“." : "");
            App.rerender();
          } }]
        };
      }
    });

    if (flash) App.fold.show("rsi");
    var card = App.fold("rsi", "Datensicherung", "rep-data", [
      el("h3", { text: "Berichte sichern" }),
      el("p", { class: "hint", text: "Gespeichert werden alle abgeschlossenen Wochen. Die laufende Woche kommt am Montag dazu. Die CSV-Datei öffnest du in Excel." }),
      el("div", { class: "btns" },
        exportBtn("JSON speichern", "trainingswoche-berichte-" + day + ".json", R.toJson, "application/json"),
        exportBtn("CSV speichern", "trainingswoche-berichte-" + day + ".csv", R.toCsv, "text/csv"),
        el("button", { type: "button", class: "btn", text: "JSON kopieren", onclick: function () {
          if (!R.archivedCount()) { say("Noch keine abgeschlossene Woche zum Sichern.", true); return; }
          F.copy(R.toJson()).then(function (ok) { say(ok ? "In die Zwischenablage kopiert." : "Kopieren ist hier nicht möglich.", !ok); });
        } })
      ),
      msg,
      el("h3", { text: "Berichte importieren" }),
      el("p", { class: "hint", text: "Wähle eine JSON-Datei, die du hier gesichert hast." }),
      imp.node
    ]);
    if (flash) { imp.say(flash); flash = null; }
    return card;
  }

  App.register({
    id: "berichte",
    label: "Berichte",
    title: "Berichte",
    icon: '<path d="M5 20V11M12 20V5M19 20v-7M3 20h18"/>',
    render: function (root) {
      var holder = el("div", { class: "rep-holder" });
      var seg = el("div", { class: "seg", role: "group", "aria-label": "Zeitraum" });

      function paint() {
        seg.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-mode") === mode)); });
        holder.replaceChildren();
        var rs = buildRows(mode === "compare" ? "weeks" : mode);
        if (!rs.length) {
          holder.append(el("section", { class: "card" }, el("div", { class: "empty" },
            el("strong", { text: "Noch keine Berichte" }),
            el("p", { text: "Sobald du etwas im Trainingsplan einträgst, erscheint die laufende Woche hier als Zwischenstand. Am Montag wird sie als Bericht gespeichert." })
          )));
          return;
        }
        if (mode === "compare") { holder.append(App.compare.view(buildRows)); return; }
        var ul = el("ul", { class: "reports" });
        rs.slice().reverse().forEach(function (r) { ul.append(el("li", null, item(r))); });
        holder.append(chartCard(rs), App.stats.card(), ul);
      }

      [["weeks", "Wochen"], ["months", "Monate"], ["compare", "Vergleich"]].forEach(function (m) {
        seg.append(el("button", { type: "button", "data-mode": m[0], text: m[1], onclick: function () { mode = m[0]; paint(); } }));
      });
      root.append(seg, holder, App.health.card(), App.records.card(), App.badges.card(), dataCard());
      paint();
    }
  });
})();
