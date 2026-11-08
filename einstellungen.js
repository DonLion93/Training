/* Reiter 4: Einstellungen. Modus und Akzentfarbe, Speicherung, Backup und Zurücksetzen der Woche. */
(function () {
  "use strict";
  var el = App.el, S = App.store, T = App.theme, B = App.backup, R = App.reports, F = App.files, C = App.calc;
  var flash = null; /* { to: "imp" | "set" | "undo" | "info", t: Text }, wird nach dem Neuzeichnen angezeigt */
  var MODES = [["system", "System"], ["light", "Hell"], ["dark", "Dunkel"], ["black", "Schwarz"]];

  var fold = App.fold;

  function persoenlich() {
    var P = App.persona, S2 = App.store;
    var msg = el("p", { class: "msg", role: "status", id: "pf-msg" });
    var cur = P.get();
    function say(t) { msg.textContent = t || ""; msg.classList.toggle("err", !!t); }

    var nick = el("input", { type: "text", class: "in", id: "pf-nick", maxlength: String(S2.NICK_MAX), autocomplete: "nickname", placeholder: "z. B. Liri" });
    nick.value = cur.nick;
    nick.addEventListener("input", function () { P.set({ nick: nick.value }); });
    nick.addEventListener("change", function () { nick.value = P.get().nick; });

    var cm = el("input", { type: "number", class: "in num", id: "pf-h", min: "100", max: "250", step: "1", inputmode: "numeric", placeholder: "175" });
    var kg = el("input", { type: "text", class: "in num", id: "pf-w", inputmode: "decimal", autocomplete: "off", maxlength: "6", placeholder: "70,5" });
    function showKg(v) { return v === null ? "" : String(v).replace(".", ","); }
    if (cur.height !== null) cm.value = String(cur.height);
    kg.value = showKg(cur.weight);
    /* Zahlen erst beim Verlassen des Felds prüfen, damit man beim Tippen nicht unterbrochen wird */
    cm.addEventListener("change", function () {
      var t = cm.value.trim();
      if (!t) { P.set({ height: null }); say(""); return; }
      var v = Math.round(Number(t.replace(",", ".")));
      if (!(v >= 100 && v <= 250)) { say("Bitte gib eine Körpergröße zwischen 100 und 250 cm ein."); cm.value = P.get().height === null ? "" : String(P.get().height); return; }
      P.set({ height: v }); cm.value = String(v); say("");
    });
    kg.addEventListener("change", function () {
      var t = kg.value.trim();
      if (!t) { P.set({ weight: null }); say(""); return; }
      var v = Math.round(Number(t.replace(",", ".")) * 10) / 10;
      if (!isFinite(v)) v = NaN;
      if (!(v >= 20 && v <= 300)) { say("Bitte gib ein Gewicht zwischen 20 und 300 kg ein."); kg.value = showKg(P.get().weight); return; }
      P.set({ weight: v }); kg.value = showKg(v); say("");
    });

    var tg = el("input", { type: "text", class: "in num", id: "pf-t", inputmode: "decimal", autocomplete: "off", maxlength: "6", placeholder: "68,0" });
    tg.value = showKg(cur.target);
    tg.addEventListener("change", function () {
      var t = tg.value.trim();
      if (!t) { P.set({ target: null }); say(""); return; }
      var v = Math.round(Number(t.replace(",", ".")) * 10) / 10;
      if (!(v >= 20 && v <= 300)) { say("Bitte gib ein Zielgewicht zwischen 20 und 300 kg ein."); tg.value = showKg(P.get().target); return; }
      P.set({ target: v }); tg.value = showKg(v); say("");
    });

    /* Zwei Kästchen, es kann höchstens eines angekreuzt sein */
    var boxes = {};
    function box(key, label) {
      var c = el("input", { type: "checkbox", id: "pf-g-" + key });
      c.checked = cur.gender === key;
      c.addEventListener("change", function () {
        P.set({ gender: c.checked ? key : null });
        Object.keys(boxes).forEach(function (k) { boxes[k].checked = P.get().gender === k; });
      });
      boxes[key] = c;
      return el("label", { class: "pf-check", for: "pf-g-" + key }, c, el("span", { text: label }));
    }
    var gender = el("fieldset", { class: "pf-gender" }, el("legend", { text: "Geschlecht" }), box("m", "männlich"), box("w", "weiblich"));

    function field(id, label, input, unit) {
      return el("div", { class: "pf-field" }, el("label", { for: id, text: label }), el("div", { class: "pf-in" }, input, unit ? el("span", { class: "pf-unit", text: unit }) : null));
    }

    return fold("pers", "Persönliche Angaben", "persona", [
      el("p", { class: "hint", text: "Alles ist freiwillig. Die Angaben bleiben in deiner App und sind im Backup enthalten. Mit dem Spitznamen sprechen dich Hinweise der App persönlicher an." }),
      field("pf-nick", "Spitzname", nick, null),
      gender,
      el("div", { class: "pf-row" }, field("pf-h", "Körpergröße", cm, "cm"), field("pf-w", "Gewicht", kg, "kg")),
      el("div", { class: "pf-row" }, field("pf-t", "Zielgewicht", tg, "kg")),
      App.weightRemind.settingsNode(),
      msg
    ]);
  }

  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function hintUndo(saved) { return saved ? " Rückgängig machen kannst du es unter „Sicherheitskopie“." : " Eine Sicherheitskopie war nicht möglich."; }

  function darstellung() {
    var seg = el("div", { class: "seg", role: "group", "aria-label": "Modus" });
    var std = el("button", { type: "button", class: "btn", text: "Standard", onclick: function () { T.setAccent(null); paintAccent(); } });
    var custom = el("input", { type: "color", class: "clr", id: "acc-custom", "aria-label": "Eigene Akzentfarbe" });
    var customLabel = el("label", { class: "custom", for: "acc-custom" }, custom, "Eigene");
    var sw = el("div", { class: "swatches", role: "group", "aria-label": "Akzentfarbe" }, std);
    var presets = T.PRESETS.map(function (p) {
      var b = el("button", { type: "button", class: "sw", "aria-label": p[0], title: p[0], onclick: function () { T.setAccent(p[1]); paintAccent(); } });
      b.style.background = p[1];
      sw.append(b);
      return b;
    });
    sw.append(customLabel);

    MODES.forEach(function (m) {
      seg.append(el("button", { type: "button", "data-v": m[0], text: m[1], onclick: function () { T.setTheme(m[0]); paintMode(); } }));
    });

    function paintMode() {
      var cur = S.state().settings.theme;
      seg.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-v") === cur)); });
    }
    function paintPressed() {
      var cur = S.state().settings.accent, isPreset = false;
      std.setAttribute("aria-pressed", String(!cur));
      T.PRESETS.forEach(function (p, i) {
        var on = cur === p[1];
        if (on) isPreset = true;
        presets[i].setAttribute("aria-pressed", String(on));
      });
      customLabel.classList.toggle("on", !!cur && !isPreset);
    }
    function paintAccent() {
      paintPressed();
      custom.value = S.state().settings.accent || T.PRESETS[0][1];
    }
    /* Beim Ziehen im Farbwähler sofort anzeigen, erst beim Schließen auf den lesbaren Wert einrasten */
    custom.addEventListener("input", function () { T.setAccent(custom.value); paintPressed(); });
    custom.addEventListener("change", function () { T.setAccent(custom.value); paintAccent(); });

    var fill = el("i");
    fill.style.width = "62%";
    paintMode();
    paintAccent();

    return fold("dar", "Darstellung", null, [
      el("p", { class: "hint", text: "System folgt der Einstellung deines Geräts. Schwarz ist ein echter Schwarz-Modus, der auf OLED-Bildschirmen Strom spart." }),
      seg,
      el("h3", { text: "Akzentfarbe" }),
      el("p", { class: "hint", text: "Die Farbe wird bei Bedarf leicht aufgehellt oder abgedunkelt, damit sie in jedem Modus gut lesbar bleibt." }),
      sw,
      el("div", { class: "preview", "aria-hidden": "true" },
        el("span", { class: "pill", text: "Vorschau" }),
        el("div", { class: "bar" }, fill),
        el("span", { class: "btn primary", text: "Knopf" })
      )
    ]);
  }

  function daten(imp) {
    var msg = el("p", { class: "msg", role: "status", id: "set-msg" });
    function say(t, err) { msg.textContent = t || ""; msg.classList.toggle("err", !!err); }
    var day = C.ymd(new Date());
    var rem = App.reminder.settingsNode();

    return fold("bak", "Backup", null, [
      el("p", { class: "hint", text: "Sichert alles: Übungen, Trainingstage, Haken der Woche, Berichte und Einstellungen." }),
      el("div", { class: "btns" },
        el("button", { type: "button", class: "btn", text: "Backup speichern", onclick: function () {
          var name = "trainingswoche-backup-" + day + ".json";
          F.save(name, B.toJson(), "application/json").then(function (r) {
            if (r === "ok") { App.reminder.markBackup(); rem.refresh(); say("Datei erstellt: " + name); }
            else if (r === "unsupported") say("Speichern ist hier nicht möglich. Nutze „Backup kopieren“.", true);
            else if (r === "error") say("Das Speichern hat nicht geklappt. Nutze „Backup kopieren“.", true);
          });
        } }),
        el("button", { type: "button", class: "btn", text: "Backup kopieren", onclick: function () {
          F.copy(B.toJson()).then(function (ok) { if (ok) { App.reminder.markBackup(); rem.refresh(); } say(ok ? "In die Zwischenablage kopiert." : "Kopieren ist hier nicht möglich.", !ok); });
        } })
      ),
      msg,
      rem,
      el("h3", { text: "Backup einspielen" }),
      imp.node,
      el("h3", { text: "Woche zurücksetzen" }),
      el("p", { class: "hint", text: "Löscht nur die Haken und Zahlen der laufenden Woche. Gespeicherte Berichte, Übungen und Einstellungen bleiben." }),
      el("div", null, App.confirmButton("Woche zurücksetzen", "Wirklich zurücksetzen", function () {
        var has = Object.keys(S.state().done).length > 0;
        var saved = has ? B.snapshot("reset") : null;
        S.state().done = {};
        S.touch();
        flash = { to: "set", t: "Die laufende Woche ist zurückgesetzt." + (has ? hintUndo(saved) : "") };
        App.rerender();
      }))
    ]);
  }

  function sicherheit() {
    var u = B.undoInfo();
    var msg = el("p", { class: "msg", role: "status", id: "undo-msg" });
    var body = u
      ? [el("p", { class: "hint", id: "undo-info", text: "Letzte Kopie: " + App.diag.fmt(u.at) + ", " + u.label + ". Sie enthält " + plural(u.exercises, "Übung", "Übungen") + " und " + plural(u.reports, "Bericht", "Berichte") + "." }),
         el("div", { class: "btns" }, App.confirmButton("Wiederherstellen", "Wirklich wiederherstellen", function () {
           if (B.undoRestore()) flash = { to: "undo", t: "Wiederhergestellt. Der Stand davor liegt jetzt als Sicherheitskopie bereit." };
           App.rerender();
         }))]
      : [el("p", { class: "hint", id: "undo-info", text: "Noch keine Kopie vorhanden." })];
    return fold("undo", "Sicherheitskopie", "undo-card", [
      el("p", { class: "hint", text: "Vor dem Einspielen eines Backups und dem Zurücksetzen der Woche legt die App automatisch eine Kopie an. Es gibt immer nur die letzte, und sie liegt nur auf diesem Gerät." }),
      body[0], body[1] || null, msg
    ]);
  }

  function speicher() {
    return fold("spe", "Speicherung", null, [
      el("p", { class: "hint", text: S.cloud
        ? "Dein Stand wird auf diesem Gerät und in deinem Konto gespeichert und zwischen deinen Geräten abgeglichen. Der Status steht oben neben dem Titel."
        : "Dein Stand liegt nur auf diesem Gerät. Sichere ihn regelmäßig mit dem Backup." })
    ]);
  }

  function info() {
    var D = App.diag;
    var msg = el("p", { class: "msg", role: "status", id: "info-msg" });
    function say(t, err) { msg.textContent = t || ""; msg.classList.toggle("err", !!err); }
    var box = el("div", { class: "report-box" });

    var facts = el("dl", { class: "stats facts" });
    D.facts().forEach(function (r) { facts.append(el("div", null, el("dt", { text: r[0] }), el("dd", { text: r[1] }))); });

    var errs = D.errors();
    var errList = el("ul", { class: "errlog", id: "errlog" });
    errs.slice().reverse().forEach(function (e) {
      errList.append(el("li", null, el("time", { text: D.fmt(e.t) + (e.n > 1 ? " (" + e.n + "×)" : "") }), el("span", { text: e.m })));
    });

    var log = el("div", { class: "changelog" });
    App.changelog.forEach(function (c, i) {
      var ul = el("ul");
      c.items.forEach(function (t) { ul.append(el("li", { text: t })); });
      log.append(el("details", { class: "ver", open: i === 0 },
        el("summary", null, el("strong", { text: "Version " + c.v }), c.date ? el("span", { class: "d", text: new Date(c.date + "T12:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) }) : null),
        ul));
    });

    return fold("info", "Info und Diagnose", "info", [
      el("p", { class: "ver-line" }, "Trainingswoche App ", el("strong", { id: "ver", text: "Version " + App.version })),
      el("h3", { text: "Zustand" }),
      facts,
      el("h3", { text: "Fehlerprotokoll" }),
      errs.length ? errList : el("p", { class: "hint", id: "errlog", text: "Keine Fehler aufgezeichnet." }),
      el("div", { class: "btns" },
        el("button", { type: "button", class: "btn", text: "Diagnose kopieren", onclick: function () {
          var text = D.report();
          F.copy(text).then(function (ok) {
            box.replaceChildren();
            if (ok) { say("Diagnose kopiert. Du kannst sie jetzt einfügen und mir schicken."); return; }
            say("Kopieren ist hier nicht möglich. Markiere den Text unten und kopiere ihn.", true);
            var ta = el("textarea", { class: "in paste", id: "diag-text", rows: "8", readonly: true, "aria-label": "Diagnose" });
            ta.value = text;
            box.append(ta);
            ta.focus(); ta.select();
          });
        } }),
        errs.length ? el("button", { type: "button", class: "btn", text: "Fehlerprotokoll leeren", onclick: function () { D.clear(); flash = { to: "info", t: "Fehlerprotokoll geleert." }; App.rerender(); } }) : null
      ),
      msg, box,
      el("p", { class: "hint", text: "Die Diagnose enthält Zahlen und Zustände der App, aber keine Namen oder Werte deiner Übungen." }),
      el("h3", { text: "Änderungsprotokoll" }),
      log
    ]);
  }

  App.register({
    id: "optionen",
    label: "Einstellungen",
    title: "Einstellungen",
    icon: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    render: function (root) {
      var imp = F.importBox({
        id: "bak",
        parse: function (text) {
          var r = B.parse(text);
          if (!r.ok) return r;
          var info = plural(r.exercises, "Übung", "Übungen") + ", " + plural(r.reports, "Bericht", "Berichte");
          var actions = [{
            label: "Alles ersetzen", confirm: "Wirklich ersetzen",
            run: function () { var saved = B.restore(r.state); flash = { to: "imp", t: "Backup eingespielt: " + info + "." + hintUndo(saved) }; App.rerender(); }
          }];
          if (r.reports) {
            actions.push({
              label: "Nur Berichte hinzufügen",
              run: function () { var saved = B.snapshot("merge"); flash = { to: "imp", t: plural(R.merge(r.state.reports), "Bericht", "Berichte") + " hinzugefügt." + hintUndo(saved) }; App.rerender(); }
            });
          }
          return { ok: true, text: "Backup gefunden: " + info + ". „Alles ersetzen“ überschreibt deine jetzigen Daten.", actions: actions };
        }
      });
      var inf = info();
      root.append(persoenlich(), darstellung(), daten(imp), sicherheit(), speicher(), inf);
      if (flash) {
        var target = { imp: "#bak-msg", set: "#set-msg", undo: "#undo-msg", info: "#info-msg" }[flash.to];
        var node = root.querySelector(target);
        if (node) { node.textContent = flash.t; var f = node.closest("details.fold"); if (f) App.fold.show(f.getAttribute("data-fold"), root); }
        flash = null;
      }
    }
  });
})();
