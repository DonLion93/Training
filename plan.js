/* Reiter 1: Trainingsplan. Tag wählen, Übungen abhaken oder Zahl eintragen, Tages- und Wochenprozent mit Überleistung. */
(function () {
  "use strict";
  var el = App.el, C = App.calc, S = App.store, T = App.timer;
  var sel = null, selToday = null;

  function perf(v) { return v === null ? "–" : C.pct(v) + " %"; }

  function Meter(label) {
    var lab = el("p", { class: "m-label", text: label || "" });
    var val = el("div", { class: "m-val" });
    var fill = el("i");
    var bar = el("div", { class: "bar", role: "img" }, fill);
    var stats = el("dl", { class: "stats" });
    var box = el("div", { class: "card" }, lab, val, bar, stats);
    return {
      box: box,
      set: function (o) {
        if (o.label) lab.textContent = o.label;
        val.replaceChildren();
        val.classList.toggle("rest", !!o.rest);
        box.classList.remove("is-full", "is-over");
        if (o.rest) {
          val.append("Ruhetag");
          fill.style.width = "0%";
          bar.style.visibility = "hidden";
        } else {
          bar.style.visibility = "";
          val.append(String(o.p), el("small", { text: "%" }));
          if (o.p > 100) val.append(el("span", { class: "over-chip", text: "+" + (o.p - 100) + " % über Ziel" }));
          fill.style.width = Math.min(100, o.p) + "%";
          if (o.p === 100) box.classList.add("is-full");
          if (o.p > 100) box.classList.add("is-over");
          bar.setAttribute("aria-label", lab.textContent + " " + o.p + " Prozent");
        }
        stats.replaceChildren();
        o.rows.forEach(function (r) {
          stats.append(el("div", null, el("dt", { text: r[0] }), el("dd", { text: r[1] })));
        });
      }
    };
  }

  function setDone(day, id, n) {
    var st = S.state();
    if (!st.done[day]) st.done[day] = {};
    st.done[day][id] = n;
    S.touch();
  }

  App.register({
    id: "plan",
    label: "Trainingsplan",
    title: "Trainingsplan",
    icon: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18M9 15l2 2 4-4"/>',
    render: function (root) {
      var today = App.todayIdx();
      if (sel === null || selToday !== today) { sel = today; selToday = today; }

      var mDay = Meter(), mWeek = Meter("Wochenziel");
      var strip = el("nav", { class: "strip", "aria-label": "Wochentage" });
      var panel = el("section", { class: "card", "aria-live": "polite" });
      var cells = [];
      var rows = [];
      var rb = App.reminder.banner();
      if (rb) root.append(rb);
      var live = el("p", { class: "sr", id: "day-live", "aria-live": "polite" });
      var help = el("p", { class: "sr", id: "day-help", text: "Trainingstag verschieben: Alt plus Pfeil links oder rechts verschiebt das Training auf den nächsten freien Tag. Mit Maus oder Finger 3 Sekunden halten und auf einen freien Tag ziehen." });
      function say(t) { live.textContent = ""; setTimeout(function () { live.textContent = t; }, 30); }
      root.append(el("div", { class: "meters" }, mDay.box, mWeek.box), strip, live, help, panel);

      App.DAYS.forEach(function (d, i) {
        var dn = el("span", { class: "dn", text: d.s });
        if (i === today) dn.append(el("span", { class: "dot" }));
        var fill = el("i");
        var dp = el("span", { class: "dp" });
        var btn = el("button", {
          type: "button", class: "day",
          "aria-describedby": "day-help",
          onclick: function () { sel = i; buildPanel(); paintAll(); },
          onkeydown: function (ev) {
            if (!ev.altKey || (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight")) return;
            ev.preventDefault();
            var dir = ev.key === "ArrowRight" ? 1 : -1, k = i + dir;
            while (k >= 0 && k <= 6 && !App.shift.canMove(i, k)) k += dir;
            if (k < 0 || k > 6) say(S.state().days[i] ? "Kein freier Tag in dieser Richtung." : "Nur ein Trainingstag lässt sich verschieben.");
            else moveSession(i, k, true);
          }
        }, dn, el("span", { class: "pb" }, fill), dp);
        cells.push({ btn: btn, fill: fill, dp: dp });
        strip.append(btn);
      });

      /* Training eines Tages auf einen freien Tag verschieben (js/shift.js). Die Ansicht folgt dem Training. */
      function moveSession(from, to, byKey) {
        if (!App.shift.move(from, to)) return false;
        sel = to;
        buildPanel();
        paintAll();
        say("Training von " + App.DAYS[from].n + " auf " + App.DAYS[to].n + " verschoben.");
        if (byKey) cells[to].btn.focus();
        return true;
      }

      App.daydrag.attach({
        strip: strip, itemSel: ".day",
        canStart: function (i) { return !!S.state().days[i] && App.shift.targets(i).some(function (t) { return App.shift.canMove(i, t); }); },
        canDrop: function (from, to) { return App.shift.canMove(from, to); },
        onDrop: function (from, to) { moveSession(from, to, false); },
        say: say
      });

      function paintMeters() {
        var st = S.state();
        var items = C.dayItems(st, sel);
        var label = "Tagesziel · " + (sel === today ? "heute" : App.DAYS[sel].n);
        if (!items) {
          mDay.set({ label: label, rest: true, rows: [] });
        } else {
          var a = C.aggregate([items]);
          mDay.set({
            label: label, p: C.pct(a.perfAll),
            rows: a.slots
              ? [["Übungen erreicht", a.reached + " von " + a.slots], ["Leistung der gemachten Übungen", perf(a.perfStarted)]]
              : [["Noch keine Übungen angelegt", "–"]]
          });
        }
        var w = C.aggregate(C.allDays(st));
        mWeek.set({
          p: C.pct(w.perfAll),
          rows: [
            ["Übungen erreicht", w.reached + " von " + w.slots],
            ["Trainingstage komplett", w.fullDays + " von " + w.trainDays],
            ["Leistung der gemachten Übungen", perf(w.perfStarted)]
          ]
        });
      }

      function paintStrip() {
        var st = S.state();
        cells.forEach(function (c, i) {
          var items = C.dayItems(st, i);
          var p = items ? C.pct(C.aggregate([items]).perfAll) : null;
          c.btn.classList.toggle("rest", p === null);
          c.btn.classList.toggle("full", p === 100);
          c.btn.classList.toggle("over", p !== null && p > 100);
          c.fill.style.width = p === null ? "0%" : Math.min(100, p) + "%";
          c.dp.textContent = p === null ? "Ruhe" : p + "%";
          c.btn.setAttribute("aria-pressed", String(i === sel));
          c.btn.setAttribute("aria-label", App.DAYS[i].n + (i === today ? ", heute" : "") + (p === null ? ", Ruhetag" : ", " + p + " Prozent"));
        });
      }

      function paintRow(r) {
        var v = C.doneOf(S.state(), sel, r.e.id), e = r.e;
        var full = v >= e.target;
        r.li.setAttribute("data-done", String(full));
        r.li.setAttribute("data-over", String(v > e.target));
        r.chk.checked = full;
        r.goal.replaceChildren("Ziel: " + e.target + " " + e.unit);
        if (v > e.target) r.goal.append(" · ", el("b", { text: "+" + Math.round((v / e.target - 1) * 100) + " % über Ziel" }));
        r.fill.style.width = Math.min(100, Math.round(v / e.target * 100)) + "%";
      }

      function paintAll() {
        paintMeters();
        paintStrip();
        rows.forEach(paintRow);
      }

      /* Timer: Zeile zeigt Knopf und, wenn offen, das Timer-Feld. Es gibt nur einen Timer gleichzeitig. */
      function paintTimer(r) {
        if (!r.tg) return;
        var open = T.isOpen(r.day, r.e.id);
        r.slot.replaceChildren();
        r.slot.hidden = !open;
        if (open) {
          r.slot.append(T.panel({
            e: r.e,
            done: function () { return C.doneOf(S.state(), r.day, r.e.id); },
            add: function (n) {
              var v = Math.min(99999, C.doneOf(S.state(), r.day, r.e.id) + n);
              setDone(r.day, r.e.id, v);
              r.num.value = String(v);
              paintAll();
            },
            close: function () { rows.forEach(paintTimer); }
          }));
        }
        paintToggle(r);
      }

      function paintToggle(r) {
        if (!r.tg) return;
        var open = T.isOpen(r.day, r.e.id);
        r.tg.setAttribute("aria-expanded", String(open));
        r.tg.classList.toggle("on", open);
        var blocked = open ? T.isActive() : !!T.current();
        r.tg.disabled = blocked;
        var label = (open ? "Timer schließen: " : "Timer starten: ") + r.e.name;
        r.tg.setAttribute("aria-label", label);
        r.tg.title = blocked ? (open ? "Verwirf oder trage die Zeit zuerst ein" : "Beende zuerst den offenen Timer") : label;
      }

      function toggleTimer(r) {
        if (T.isOpen(r.day, r.e.id)) T.closeIdle();
        else T.open(r.day, r.e);
        rows.forEach(paintTimer);
      }

      function buildRow(e) {
        var cid = "chk-" + sel + "-" + e.id;
        var chk = el("input", { type: "checkbox", id: cid });
        var num = el("input", { type: "number", id: "num-" + sel + "-" + e.id, min: "0", inputmode: "numeric", placeholder: "0", "aria-label": e.name + " erreicht (" + e.unit + ")" });
        var v = C.doneOf(S.state(), sel, e.id);
        if (v > 0) num.value = String(v);
        var goal = el("span", { class: "ex-goal" });
        var fill = el("i");
        var li = el("li", { class: "xrow" },
          el("label", { class: "chk" }, chk, el("span", { class: "box", "aria-hidden": "true" })),
          el("div", { class: "ex" }, el("label", { class: "ex-name", for: cid, text: e.name }), goal),
          el("div", { class: "cnt" }, num, el("span", { class: "of", text: "/ " + e.target })),
          el("span", { class: "rb" }, fill)
        );
        var r = { e: e, li: li, chk: chk, num: num, goal: goal, fill: fill, day: sel };
        if (T.supports(e.unit)) {
          r.tg = el("button", { type: "button", class: "tm-toggle", onclick: function () { toggleTimer(r); } });
          r.tg.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M9.5 2.5h5M12 2.5v3.5M19 6l1.5-1.5"/></svg>'; /* festes Symbol, keine Nutzerdaten */
          r.slot = el("div", { class: "tm-slot", hidden: true });
          li.querySelector(".cnt").prepend(r.tg);
          li.insertBefore(r.slot, li.querySelector(".rb"));
        }
        chk.addEventListener("change", function () {
          setDone(sel, e.id, chk.checked ? e.target : 0);
          num.value = chk.checked ? String(e.target) : "";
          paintAll();
        });
        num.addEventListener("input", function () {
          setDone(sel, e.id, Math.min(99999, Math.max(0, Math.floor(Number(num.value) || 0))));
          paintAll();
        });
        rows.push(r);
        return li;
      }

      /* Notiz zum gewählten Tag: ein Aufklapper, offen, wenn schon etwas drinsteht. Speichert beim Tippen. */
      function noteBox() {
        var day = sel, st = S.state(), max = S.NOTE_MAX;
        if (!st.notes) st.notes = {};
        var text = st.notes[day] || "";
        var ta = el("textarea", { class: "in note", id: "note-" + day, rows: "3", maxlength: String(max),
          placeholder: "Wie lief es? Zum Beispiel: Schulter zwickt, nächstes Mal mehr Pause.", "aria-label": "Notiz zu " + App.DAYS[day].n });
        ta.value = text;
        var count = el("span", { class: "note-count", "aria-hidden": "true" });
        var mark = el("span", { class: "note-dot", "aria-hidden": "true" });
        var d = el("details", { class: "note-box", id: "note-box" },
          el("summary", null, el("span", { class: "note-t", text: "Notiz" }), mark, el("span", { class: "sr", id: "note-state" })),
          el("div", { class: "note-body" }, ta, count));
        function paint() {
          var has = ta.value.trim().length > 0;
          mark.hidden = !has;
          d.querySelector("#note-state").textContent = has ? "(vorhanden)" : "";
          count.textContent = ta.value.length > max - 100 ? ta.value.length + " / " + max : "";
        }
        d.open = !!text;
        ta.addEventListener("input", function () {
          var t = ta.value.slice(0, max).trim();
          if (t) st.notes[day] = t; else delete st.notes[day];
          S.touch();
          paint();
        });
        paint();
        return d;
      }

      /* Trainingstag nur für diese Woche verschieben (js/shift.js) und Verschiebungen zurücknehmen */
      function shiftBox() {
        var SH = App.shift, day = sel, st = S.state();
        var box = el("div", { class: "shift", id: "shift-box" });
        var sh = SH.info();
        if (sh) {
          var list = sh.moves.map(function (m) { return App.DAYS[m.from].s + " → " + App.DAYS[m.to].s; }).join(", ");
          box.append(el("p", { class: "hint", id: "shift-info", text: "Diese Woche verschoben: " + list + "." }),
            App.confirmButton("Verschiebungen zurücknehmen", "Wirklich zurücknehmen", function () { SH.revert(); buildPanel(); paintAll(); }, { id: "shift-revert" }));
        }
        return box.childNodes.length ? box : document.createDocumentFragment();
      }

      function buildPanel() {
        var st = S.state();
        var d = App.DAYS[sel], train = !!st.days[sel];
        rows = [];
        /* Ein offener Timer, dessen Übung oder Tag es nicht mehr gibt oder keine Zeiteinheit mehr hat, wird verworfen */
        var cur = T.current();
        if (cur) {
          var ex = st.exercises.filter(function (x) { return x.id === cur.id; })[0];
          if (!ex || !st.days[cur.day] || !T.supports(ex.unit)) { T.discard(); cur = null; }
        }
        panel.replaceChildren(el("div", { class: "card-head" },
          el("h2", { text: (sel === today ? "Heute · " : "") + d.n }),
          el("span", { class: "pill" + (train ? "" : " rest"), text: train ? (App.shift.note(sel) ? "Verschoben von " + App.DAYS[App.shift.note(sel).other].s : "Training") : "Ruhetag" })
        ));
        if (cur && cur.day !== sel) {
          panel.append(el("p", { class: "tm-banner" },
            "Timer offen: " + cur.name + " (" + App.DAYS[cur.day].n + ") ",
            el("button", { type: "button", class: "btn", text: "Anzeigen", onclick: function () { sel = cur.day; buildPanel(); paintAll(); } })));
        }
        if (!train) {
          var mv = App.shift.note(sel);
          panel.append(el("p", { class: "hint", text: mv ? "Das Training dieses Tages wurde auf " + App.DAYS[mv.other].n + " verschoben." : sel === today ? App.persona.addr("Heute ist Pause") + ". Die Erholung gehört zum Plan, hier gibt es nichts abzuhaken." : "An diesem Tag ist Pause." }), shiftBox(), noteBox());
          return;
        }
        if (!st.exercises.length) {
          panel.append(el("p", { class: "hint", text: "Noch keine Übungen angelegt." }), shiftBox(), noteBox());
          return;
        }
        var ul = el("ul", { class: "xrows" });
        st.exercises.forEach(function (e) { ul.append(buildRow(e)); });
        panel.append(ul, shiftBox(), noteBox());
        rows.forEach(paintTimer);
        T.onChange(function () { rows.forEach(paintToggle); });
      }

      buildPanel();
      paintAll();
    }
  });
})();
