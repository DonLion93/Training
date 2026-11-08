/* Reiter 2: Übungen. Trainingstage festlegen, Übungen mit Ziel und Einheit anlegen und ändern.
   Tippen klappt eine Übung zum Bearbeiten auf. 3 Sekunden Halten hebt sie an: dann verschieben oder auf den Mülleimer ziehen
   (js/reorder.js). Gelöscht wird erst nach Rückfrage (js/dialog.js). Mit der Tastatur: Alt + Pfeil hoch oder runter, Entf. */
(function () {
  "use strict";
  var el = App.el, S = App.store;
  var UNITS = ["Wdh.", "Sek.", "Min."];
  var expanded = null; /* id der aufgeklappten Übung */

  function uid() { return "e" + Math.random().toString(36).slice(2, 8); }
  function goalText(e) { return "Ziel: " + e.target + " " + e.unit; }

  App.register({
    id: "uebungen",
    label: "Übungen",
    title: "Übungen",
    icon: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
    render: function (root) {
      var daysBox = el("nav", { class: "strip", "aria-label": "Trainingstage" });
      var list = el("div", { class: "exlist" });
      var live = el("p", { class: "vh", "aria-live": "polite", id: "ex-live" });
      var addBtn = el("button", { type: "button", class: "btn primary", text: "Übung hinzufügen", onclick: addExercise });

      root.append(
        el("section", { class: "card" },
          el("h2", { text: "Trainingstage" }),
          el("p", { class: "hint", text: "Tippe auf einen Tag, um ihn zwischen Training und Ruhetag zu wechseln." }),
          daysBox
        ),
        el("section", { class: "card" },
          el("h2", { text: "Übungen" }),
          el("p", { class: "hint", text: "Tippe auf eine Übung, um Name, Ziel und Einheit zu ändern. Halte sie 3 Sekunden gedrückt, um sie zu verschieben oder zu löschen. Das Ziel gilt für jeden Trainingstag, schon eingetragene Werte bleiben erhalten." }),
          el("p", { class: "vh", id: "ex-help", text: "Alt plus Pfeil nach oben oder unten verschiebt die Übung, Entf löscht sie." }),
          list, live,
          el("div", null, addBtn)
        )
      );

      function say(t) { live.textContent = ""; setTimeout(function () { live.textContent = t; }, 30); }

      function paintDays() {
        var st = S.state();
        daysBox.replaceChildren();
        App.DAYS.forEach(function (d, i) {
          var on = !!st.days[i];
          daysBox.append(el("button", {
            type: "button",
            class: "day" + (on ? "" : " rest"),
            "aria-pressed": String(on),
            "aria-label": d.n + ": " + (on ? "Training" : "Ruhetag"),
            onclick: function () { st.days[i] = !st.days[i]; if (st.shift) st.shift.base[i] = st.days[i]; S.touch(); paintDays(); }
          },
            el("span", { class: "dn", text: d.s }),
            el("span", { class: "pb" + (on ? " on" : "") }),
            el("span", { class: "dp", text: on ? "" : "Ruhe" })
          ));
        });
      }

      function moveTo(from, to) {
        var st = S.state();
        if (from === to || to < 0 || to >= st.exercises.length) return;
        var e = st.exercises.splice(from, 1)[0];
        st.exercises.splice(to, 0, e);
        S.touch();
        paintList({ sum: e.id });
        say(e.name + " ist jetzt Übung " + (to + 1) + " von " + st.exercises.length + ".");
      }

      function remove(e) {
        var st = S.state(), idx = st.exercises.indexOf(e);
        st.exercises = st.exercises.filter(function (x) { return x.id !== e.id; });
        Object.keys(st.done).forEach(function (k) { if (st.done[k]) delete st.done[k][e.id]; });
        if (expanded === e.id) expanded = null;
        S.touch();
        var next = st.exercises[Math.min(idx, st.exercises.length - 1)];
        paintList(next ? { sum: next.id } : { add: true });
        say(e.name + " wurde gelöscht.");
      }

      /* Immer erst fragen, egal ob per Mülleimer oder Tastatur */
      function askRemove(e) {
        App.dialog.confirm({
          title: "„" + e.name + "“ löschen?",
          text: "Die Übung und ihre eingetragenen Werte der laufenden Woche werden entfernt. Gespeicherte Berichte bleiben unverändert.",
          ok: "Löschen",
          cancel: "Abbrechen"
        }).then(function (yes) {
          if (!yes) return;
          if (S.state().exercises.indexOf(e) < 0) return;
          remove(e);
        });
      }

      function addExercise() {
        var st = S.state();
        var e = { id: uid(), name: "Neue Übung", target: 10, unit: "Wdh." };
        st.exercises.push(e);
        expanded = e.id;
        S.touch();
        paintList({ name: e.id });
      }

      function setOpen(id) {
        expanded = expanded === id ? null : id;
        list.querySelectorAll(".exitem").forEach(function (it) {
          var open = it.getAttribute("data-id") === expanded;
          it.classList.toggle("open", open);
          it.querySelector(".ex-sum").setAttribute("aria-expanded", String(open));
          it.querySelector(".ex-panel").hidden = !open;
        });
      }

      function item(e, idx) {
        var open = expanded === e.id;
        var nameId = "ex-name-" + e.id, tgtId = "ex-tgt-" + e.id;
        var nameOut = el("span", { class: "ex-n", text: e.name });
        var goalOut = el("span", { class: "ex-g", text: goalText(e) });

        var name = el("input", { type: "text", class: "in name", id: nameId, maxlength: "40", placeholder: "Name der Übung", "aria-label": "Name der Übung" });
        name.value = e.name;
        name.addEventListener("input", function () { e.name = name.value.slice(0, 40); nameOut.textContent = e.name || "Übung"; S.touch(); });
        name.addEventListener("blur", function () {
          e.name = name.value.trim() || "Übung";
          name.value = e.name;
          nameOut.textContent = e.name;
          S.touch();
        });

        var tgt = el("input", { type: "number", class: "in num", id: tgtId, min: "1", max: "99999", inputmode: "numeric", "aria-label": "Ziel für " + e.name });
        tgt.value = String(e.target);
        tgt.addEventListener("input", function () {
          var n = Math.floor(Number(tgt.value));
          if (n >= 1) { e.target = Math.min(n, 99999); goalOut.textContent = goalText(e); S.touch(); }
        });
        tgt.addEventListener("blur", function () { tgt.value = String(e.target); });

        var unit = el("select", { class: "in", id: "ex-unit-" + e.id, "aria-label": "Einheit für " + e.name });
        UNITS.forEach(function (u) {
          var o = el("option", { value: u, text: u });
          if (u === e.unit) o.selected = true;
          unit.append(o);
        });
        /* Eigener Kalorienverbrauch je Einheit. Leer = automatische Schätzung. */
        var PER = { "Wdh.": "Wiederholung", "Sek.": "Sekunde", "Min.": "Minute" };
        var kcId = "ex-kcal-" + e.id;
        var kcLab = el("label", { class: "lab", for: kcId });
        var kc = el("input", { type: "text", class: "in num", id: kcId, inputmode: "decimal", maxlength: "9" });
        function fmtK(n) { return n.toLocaleString("de-DE", { maximumFractionDigits: 3 }); }
        function paintKcal() {
          kcLab.textContent = "kcal pro " + PER[e.unit];
          kc.setAttribute("aria-label", "Kalorienverbrauch pro " + PER[e.unit] + " für " + e.name + ", leer für automatisch");
          kc.value = e.kcal ? fmtK(e.kcal) : "";
          var w = App.persona.get().weight;
          var auto = w > 0 ? App.health.autoPer(e.name, e.unit, w) : 0;
          kc.placeholder = auto > 0 ? "auto " + fmtK(Math.round(auto * 1000) / 1000) : "auto";
        }
        paintKcal();
        kc.addEventListener("input", function () {
          var t = kc.value.trim().replace(",", ".");
          if (t === "") { delete e.kcal; S.touch(); return; }
          var n = S.cleanKcal(Number(t));
          if (n) { e.kcal = n; S.touch(); }
        });
        kc.addEventListener("blur", paintKcal);

        unit.addEventListener("change", function () {
          var old = e.unit;
          e.unit = unit.value;
          /* Sekunden und Minuten lassen sich umrechnen, bei Wiederholungen gilt der Wert nicht mehr */
          if (e.kcal) {
            var f = old === "Min." && e.unit === "Sek." ? 1 / 60 : old === "Sek." && e.unit === "Min." ? 60 : 0;
            var n = f ? S.cleanKcal(e.kcal * f) : null;
            if (n) e.kcal = n; else delete e.kcal;
          }
          goalOut.textContent = goalText(e);
          paintKcal();
          S.touch();
        });

        var sum = el("button", {
          type: "button", class: "ex-sum", id: "ex-sum-" + e.id,
          "aria-expanded": String(open), "aria-controls": "ex-panel-" + e.id, "aria-describedby": "ex-help",
          onclick: function () { setOpen(e.id); }
        }, el("span", { class: "ex-t" }, nameOut, goalOut), el("span", { class: "ex-bar" }));
        var chev = el("span", { class: "ex-chev", "aria-hidden": "true" });
        chev.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>'; /* festes Symbol */
        sum.insertBefore(chev, sum.querySelector(".ex-bar"));

        sum.addEventListener("keydown", function (ev) {
          var i = S.state().exercises.indexOf(e);
          if (ev.altKey && (ev.key === "ArrowUp" || ev.key === "ArrowDown")) { ev.preventDefault(); moveTo(i, i + (ev.key === "ArrowUp" ? -1 : 1)); }
          else if (ev.key === "Delete") { ev.preventDefault(); askRemove(e); }
        });

        var panel = el("div", { class: "ex-panel", id: "ex-panel-" + e.id, hidden: !open },
          name,
          el("div", { class: "line" }, el("label", { class: "lab", for: tgtId, text: "Ziel" }), tgt, unit),
          el("div", { class: "line" }, kcLab, kc)
        );

        return el("div", { class: "exitem" + (open ? " open" : ""), "data-id": e.id }, sum, panel);
      }

      function paintList(opts) {
        var st = S.state();
        list.replaceChildren();
        if (!st.exercises.length) {
          list.append(el("p", { class: "hint", text: "Noch keine Übungen. Lege deine erste Übung an." }));
        } else {
          st.exercises.forEach(function (e, i) { list.append(item(e, i)); });
        }
        if (!opts) return;
        var t = null;
        if (opts.name) { t = document.getElementById("ex-name-" + opts.name); if (t) { t.focus(); t.select(); } }
        else if (opts.sum) { t = document.getElementById("ex-sum-" + opts.sum); if (t) t.focus(); }
        else if (opts.add) addBtn.focus();
      }

      App.reorder.attach({
        list: list, itemSel: ".exitem", handleSel: ".ex-sum", say: say,
        onMove: moveTo,
        onDelete: function (idx) { var e = S.state().exercises[idx]; if (e) askRemove(e); }
      });

      paintDays();
      paintList();
    }
  });
})();
