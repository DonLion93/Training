/* Wiege-Erinnerung: Öffnest du die App an einem Sonntag und hast für heute noch kein Gewicht eingetragen, erscheint ein Pop-up.
   Die App kann nichts melden, solange sie geschlossen ist; die Erinnerung kommt also beim Öffnen.
   Gespeichert wird nur auf diesem Gerät: { on: Erinnerung an/aus (Standard an) }. Pro Seitenaufruf und Tag erscheint das Pop-up höchstens einmal.
   „Später“ blendet es bis zum nächsten Öffnen aus, „Nicht mehr erinnern“ schaltet es aus (wieder an unter Einstellungen > Persönliche Angaben). */
(function () {
  "use strict";
  var el = App.el, C = App.calc;
  var KEY = "trainingswoche-app-weightremind";
  var handled = "";
  var open = null;

  function isOn() {
    try { var o = JSON.parse(localStorage.getItem(KEY) || "null"); return !(o && o.on === false); } catch (e) { return true; }
  }
  function setOn(v) {
    try { localStorage.setItem(KEY, JSON.stringify({ on: !!v })); return true; } catch (e) { return false; }
  }

  function todayStr() { return C.ymd(new Date()); }
  function isSunday() { return new Date().getDay() === 0; }
  function hasToday() { return App.weight.list().some(function (x) { return x.d === todayStr(); }); }
  function due() { return !window.__noWR && isOn() && isSunday() && !hasToday(); }

  function kgText(n) { return n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " kg"; }

  function close() {
    if (!open) return;
    open.done();
  }

  function show() {
    if (open || !due()) return;
    handled = todayStr();
    var list = App.weight.list(), last = list[list.length - 1];
    var prevFocus = document.activeElement, prevOverflow = document.body.style.overflow;
    var msg = el("p", { class: "msg err", role: "alert", id: "wr-msg" });
    var inp = el("input", { type: "text", class: "in num", id: "wr-kg", inputmode: "decimal", autocomplete: "off", maxlength: "6", placeholder: last ? String(last.kg).replace(".", ",") : "70,5", "aria-label": "Gewicht in Kilogramm" });
    var title = el("h2", { id: "wr-t", tabindex: "-1", text: App.persona.addr("Sonntag: Zeit zum Wiegen") });
    var save = el("button", { type: "button", class: "btn primary", id: "wr-save", text: "Eintragen" });
    var later = el("button", { type: "button", class: "btn", id: "wr-later", text: "Später" });
    var off = el("button", { type: "button", class: "btn", id: "wr-off", text: "Nicht mehr erinnern" });
    var box = el("div", { class: "dlg", role: "dialog", "aria-modal": "true", "aria-labelledby": "wr-t", "aria-describedby": "wr-d" },
      title,
      el("p", { id: "wr-d", text: "Trage dein Gewicht von heute ein, damit Verlauf, BMI und Kalorien stimmen." + (last ? " Zuletzt: " + kgText(last.kg) + "." : "") }),
      el("div", { class: "hv-form" }, inp, el("span", { class: "kc-u", text: "kg" })),
      msg,
      el("div", { class: "btns" }, later, save),
      off);
    var back = el("div", { class: "dlg-back top", id: "wr-back" }, box);

    function done() {
      document.removeEventListener("keydown", key, true);
      back.remove();
      document.body.style.overflow = prevOverflow;
      open = null;
      try { if (prevFocus && document.contains(prevFocus)) prevFocus.focus(); } catch (e) { /* egal */ }
    }
    function key(ev) {
      if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); done(); }
      else if (ev.key === "Enter" && ev.target === inp) { ev.preventDefault(); doSave(); }
      else if (ev.key === "Tab") {
        ev.preventDefault();
        var f = [inp, later, save, off], i = f.indexOf(document.activeElement);
        f[i < 0 ? 0 : (i + (ev.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    }
    function doSave() {
      var v = Math.round(Number(inp.value.trim().replace(",", ".")) * 10) / 10;
      if (!(v >= 20 && v <= 300)) { msg.textContent = "Bitte gib ein Gewicht zwischen 20 und 300 kg ein."; inp.focus(); return; }
      if (!App.weight.add(todayStr(), v)) { msg.textContent = "Das konnte nicht gespeichert werden."; return; }
      done();
      App.rerender();
    }
    save.addEventListener("click", doSave);
    later.addEventListener("click", done);
    off.addEventListener("click", function () { setOn(false); done(); });
    back.addEventListener("click", function (ev) { if (ev.target === back) done(); });
    document.addEventListener("keydown", key, true);
    document.body.style.overflow = "hidden";
    document.body.append(back);
    title.focus();
    open = { done: done };
  }

  /* Prüfen, ob das Pop-up jetzt erscheinen soll: einmal pro Tag und Seitenaufruf */
  function check() {
    if (handled === todayStr() || open) return;
    if (due()) show();
  }

  /* Schalter für Einstellungen > Persönliche Angaben */
  function settingsNode() {
    var c = el("input", { type: "checkbox", id: "pf-wr" });
    c.checked = isOn();
    c.addEventListener("change", function () { setOn(c.checked); });
    return el("label", { class: "pf-check", for: "pf-wr" }, c, el("span", { text: "Sonntags ans Wiegen erinnern" }));
  }

  /* Die App braucht einen Moment, bis auch Daten aus dem Konto da sind, erst dann prüfen */
  document.addEventListener("DOMContentLoaded", function () { setTimeout(check, 1500); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) setTimeout(check, 400); });
  App.store.onAdopt(function () { if (open && !due()) close(); });

  App.weightRemind = { due: due, show: show, check: check, isOn: isOn, setOn: setOn, settingsNode: settingsNode };
})();
