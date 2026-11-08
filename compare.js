/* Vergleich: mehrere Wochen oder Monate auswählen und als Diagramm nebeneinander sehen.
   Gesamtleistung als Balken, dazu je Übung ein kleines Diagramm und eine Tabelle mit den Werten.
   App.compare.view(build) liefert die Ansicht. build("weeks" | "months") gibt die Zeilen wie in views/berichte.js zurück
   ({ key, label, title, live, agg }), aufsteigend nach Zeit. */
(function () {
  "use strict";
  var el = App.el, C = App.calc;
  var MAX = 12, DEFAULT = 4;
  var base = "weeks";
  var picked = { weeks: null, months: null }; /* Schlüssel der gewählten Zeilen, null = noch nichts gewählt (Standard) */

  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  function colClass(p, live) { return "col" + (live ? " live" : "") + (p === 100 ? " full" : "") + (p > 100 ? " over" : ""); }

  /* Eine Balkenreihe. items: [{ p: Prozent | null, label, title, live }] */
  function bars(items, max, mini) {
    var plot = el("div", { class: "plot" + (mini ? " mini" : "") });
    var goal = el("div", { class: "goal" });
    goal.style.bottom = (100 / max * 100) + "%";
    plot.append(goal);
    var xl = el("div", { class: "xl", "aria-hidden": "true" });
    items.forEach(function (it) {
      var col = el("div", { class: it.p === null ? "col" : colClass(it.p, it.live), role: "img", title: it.title + ": " + (it.p === null ? "keine Daten" : it.p + " %"),
        "aria-label": it.title + ": " + (it.p === null ? "keine Daten" : it.p + " Prozent") + (it.live ? ", läuft noch" : "") });
      if (it.p !== null) {
        var b = el("div", { class: "b" }, el("span", { class: "v", text: String(it.p) }));
        b.style.height = (it.p / max * 100) + "%";
        col.append(b);
      }
      plot.append(col);
      xl.append(el("span", { text: it.label }));
    });
    return [plot, xl];
  }

  function scale(values) {
    var hi = Math.max.apply(null, values.concat([0]));
    return Math.max(120, Math.ceil(hi * 1.15 / 20) * 20);
  }

  function view(build) {
    var holder = el("div", { class: "cmp" });
    var seg = el("div", { class: "seg", role: "group", "aria-label": "Vergleich von" });
    var msg = el("p", { class: "msg", role: "status", id: "cmp-msg" });

    function paint() {
      var rows = build(base);
      var keys = rows.map(function (r) { return r.key; });
      var sel = (picked[base] || keys.slice(-DEFAULT)).filter(function (k) { return keys.indexOf(k) >= 0; });
      picked[base] = sel;
      seg.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-base") === base)); });
      holder.replaceChildren();

      function set(list) { picked[base] = list.slice(-MAX); paint(); }

      /* Auswahl */
      var pick = el("div", { class: "pick", role: "group", "aria-label": base === "weeks" ? "Wochen auswählen" : "Monate auswählen" });
      rows.slice().reverse().forEach(function (r) {
        pick.append(el("button", {
          type: "button", class: "chip", "aria-pressed": String(sel.indexOf(r.key) >= 0), "data-key": r.key, text: r.title + (r.live ? " ·" : ""),
          onclick: function () {
            var i = sel.indexOf(r.key);
            if (i >= 0) { set(sel.filter(function (k) { return k !== r.key; })); return; }
            if (sel.length >= MAX) { paint(); msg.textContent = "Es passen höchstens " + MAX + " gleichzeitig ins Diagramm."; return; }
            set(sel.concat([r.key]));
          }
        }));
      });
      function quick(label, n) {
        return el("button", { type: "button", class: "btn", text: label, onclick: function () { set(keys.slice(-n)); } });
      }
      var chosen = rows.filter(function (r) { return sel.indexOf(r.key) >= 0; });

      holder.append(el("section", { class: "card" },
        el("h2", { text: "Vergleich" }),
        el("p", { class: "hint", text: "Wähle " + (base === "weeks" ? "Wochen" : "Monate") + " aus, die du nebeneinander sehen möchtest (höchstens " + MAX + ")." }),
        seg,
        el("div", { class: "quick" }, quick("Letzte 4", 4), quick("Letzte 8", 8), quick("Letzte " + MAX, MAX),
          el("button", { type: "button", class: "btn", text: "Auswahl leeren", onclick: function () { set([]); } })),
        pick,
        el("p", { class: "hint", text: plural(chosen.length, base === "weeks" ? "Woche" : "Monat", base === "weeks" ? "Wochen" : "Monate") + " ausgewählt. Das Zeichen · markiert einen laufenden Zeitraum." }),
        msg
      ));

      if (chosen.length < 2) {
        holder.append(el("section", { class: "card" }, el("div", { class: "empty" },
          el("strong", { text: chosen.length ? "Wähle noch mindestens einen weiteren Zeitraum" : "Noch nichts ausgewählt" }),
          el("p", { text: "Für den Vergleich brauchst du mindestens zwei " + (base === "weeks" ? "Wochen" : "Monate") + "." })
        )));
        return;
      }

      /* Gesamtleistung */
      var items = chosen.map(function (r) { return { p: C.pct(r.agg.perfAll), label: r.label, title: r.title, live: r.live }; });
      var first = items[0].p, last = items[items.length - 1].p, diff = last - first;
      var best = items.reduce(function (b, it) { return !b || it.p > b.p ? it : b; }, null);
      var avg = chosen.reduce(function (s, r) { return s + r.agg.perfAll; }, 0) / chosen.length;
      var trend = diff === 0 ? "unverändert" : (diff > 0 ? "+" : "−") + Math.abs(diff) + " Punkte";
      var main = bars(items, scale(items.map(function (i) { return i.p; })), false);
      var overall = el("section", { class: "card", id: "cmp-overall" },
        el("h2", { text: "Gesamtleistung" }),
        el("p", { class: "hint", text: "Leistung in Prozent vom Ziel, ältester Zeitraum links." }),
        el("div", { class: "legend" },
          el("span", null, el("i"), "unter dem Ziel"), el("span", null, el("i", { class: "g" }), "Ziel erreicht"),
          el("span", null, el("i", { class: "o" }), "über dem Ziel"), el("span", null, el("i", { class: "d" }), "100 %")),
        main[0], main[1],
        el("p", { class: "sum", id: "cmp-sum", text: "Ø " + C.pct(avg) + " % · Bestwert " + best.p + " % (" + best.title + ") · Verlauf von " + chosen[0].title + " zu " + chosen[chosen.length - 1].title + ": " + trend })
      );
      holder.append(overall);

      /* Je Übung: gleiche Namen und Einheiten werden zusammengefasst, wie in den Berichten */
      var exKeys = [], seen = {};
      chosen.forEach(function (r) { r.agg.order.forEach(function (k) { if (!seen[k]) { seen[k] = 1; exKeys.push(k); } }); });
      if (exKeys.length) {
        var per = {}, all = [];
        exKeys.forEach(function (k) {
          per[k] = chosen.map(function (r) {
            var t = r.agg.byEx[k];
            var p = t && t.g > 0 ? C.pct(t.v / t.g) : null;
            if (p !== null) all.push(p);
            return { p: p, label: r.label, title: r.title, live: r.live };
          });
        });
        var mx = scale(all);
        var box = el("div", { class: "cmp-ex" });
        exKeys.forEach(function (k) {
          var name = k.split("|")[0], unit = k.split("|")[1];
          var b = bars(per[k], mx, true);
          box.append(el("div", { class: "cmp-one", "data-ex": name }, el("h3", { text: name + (unit ? " (" + unit + ")" : "") }), b[0], b[1]));
        });
        holder.append(el("section", { class: "card", id: "cmp-ex" },
          el("h2", { text: "Je Übung" }),
          el("p", { class: "hint", text: "Gleiche Skala für alle Übungen. Eine Lücke heißt: in diesem Zeitraum gab es die Übung nicht." }),
          box));
      }

      /* Tabelle: dieselben Zahlen zum Nachlesen und für Screenreader */
      var tbl = el("table", { class: "tbl" },
        el("thead", null, el("tr", null, el("th", { scope: "col", text: "Zeitraum" }), el("th", { scope: "col", text: "Leistung" }), el("th", { scope: "col", text: "Erreicht" }), el("th", { scope: "col", text: "Tage komplett" }))),
        el("tbody"));
      chosen.forEach(function (r, i) {
        tbl.lastChild.append(el("tr", null,
          el("th", { scope: "row", text: r.title + (r.live ? " (läuft)" : "") }),
          el("td", { text: items[i].p + " %" }),
          el("td", { text: r.agg.reached + " von " + r.agg.slots }),
          el("td", { text: r.agg.fullDays + " von " + r.agg.trainDays })));
      });
      holder.append(el("details", { class: "card rep", id: "cmp-table" }, el("summary", null, el("span", { class: "rep-t", text: "Werte als Tabelle" })), el("div", { class: "tblwrap" }, tbl)));
    }

    [["weeks", "Wochen"], ["months", "Monate"]].forEach(function (m) {
      seg.append(el("button", { type: "button", "data-base": m[0], text: m[1], onclick: function () { base = m[0]; paint(); } }));
    });
    paint();
    return holder;
  }

  App.compare = { view: view };
})();
