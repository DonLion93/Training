/* Timer für Übungen mit Zeiteinheit (Sek. oder Min.), zum Beispiel Plank.
   Es läuft immer nur ein Timer. Er zählt nach der Uhrzeit und bleibt deshalb auch bei gesperrtem Bildschirm genau.
   Die Zeit wird erst bei „Eintragen“ zum Wert der Übung addiert. Der Timer-Zustand liegt im Speicher und überlebt
   Reiterwechsel, aber kein Neuladen der Seite. Die Anzeige im Trainingsplan steht in views/plan.js. */
(function () {
  "use strict";
  var el = App.el;

  var t = null;     /* { day, id, name, unit, target, acc, since, fired, done } */
  var ui = null;    /* Elemente des gerade sichtbaren Timers */
  var iv = null, lock = null, audio = null, onChange = null;

  function supports(unit) { return unit === "Sek." || unit === "Min."; }
  function per(unit) { return unit === "Min." ? 60 : 1; }
  function elapsedMs() { return t ? t.acc + (t.since ? Date.now() - t.since : 0) : 0; }
  function active() { return !!t && (!!t.since || t.acc > 0); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function fmt(sec) { sec = Math.max(0, Math.floor(sec)); return pad(Math.floor(sec / 60)) + ":" + pad(sec % 60); }

  /* Wie viel zum Wert der Übung dazukommt, in ihrer eigenen Einheit */
  function amount() {
    var s = elapsedMs() / 1000;
    return t.unit === "Min." ? Math.round(s / 60) : Math.round(s);
  }

  function baseSec() { return (t.done ? t.done() : 0) * per(t.unit); }
  function goalSec() { return t.target * per(t.unit); }

  function beep() {
    try {
      if (!audio) return;
      if (audio.state === "suspended") audio.resume();
      for (var i = 0; i < 3; i++) {
        var o = audio.createOscillator(), g = audio.createGain(), at = audio.currentTime + i * 0.3;
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
        o.connect(g); g.connect(audio.destination);
        o.start(at); o.stop(at + 0.22);
      }
    } catch (e) { /* Ton ist nur eine Zugabe */ }
  }

  function alertGoal() {
    t.fired = true;
    try { if (navigator.vibrate) navigator.vibrate([250, 120, 250]); } catch (e) { /* egal */ }
    beep();
    if (ui) ui.ann.textContent = "Ziel erreicht";
  }

  function requestLock() {
    try {
      if (!navigator.wakeLock || lock) return;
      navigator.wakeLock.request("screen").then(function (l) {
        if (!t || !t.since) { l.release(); return; }
        lock = l;
        l.addEventListener("release", function () { if (lock === l) lock = null; });
      }, function () { /* nicht erlaubt: der Bildschirm darf ausgehen */ });
    } catch (e) { /* egal */ }
  }
  function releaseLock() {
    try { if (lock) { lock.release(); lock = null; } } catch (e) { lock = null; }
  }

  function paint() {
    if (!ui || !t) return;
    /* Alles in ganzen Sekunden, damit Zeit und Rest zusammenpassen */
    var sec = Math.floor(elapsedMs() / 1000), total = baseSec() + sec, goal = goalSec(), n = amount();
    ui.time.textContent = fmt(sec);
    var rest;
    if (total >= goal) {
      var over = total - goal;
      rest = over > 0 ? "Ziel erreicht, " + fmt(over) + " darüber" : "Ziel erreicht";
    } else {
      rest = "Noch " + fmt(goal - total) + " bis zum Ziel";
    }
    ui.rest.textContent = rest;
    ui.box.setAttribute("data-goal", String(total >= goal));
    ui.box.setAttribute("data-running", String(!!t.since));
    ui.main.textContent = t.since ? "Pause" : t.acc > 0 ? "Weiter" : "Start";
    ui.main.classList.toggle("primary", !t.since);
    ui.add.textContent = "+" + n + " " + t.unit + " eintragen";
    ui.add.disabled = n < 1;
    ui.discard.textContent = active() ? "Verwerfen" : "Schließen";
  }

  function tick() {
    if (!t) return;
    if (!t.fired && t.since && baseSec() + elapsedMs() / 1000 >= goalSec()) alertGoal();
    paint();
  }

  function stopAll() {
    clearInterval(iv); iv = null;
    releaseLock();
  }

  function start() {
    if (!t || t.since) return;
    try {
      if (!audio) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) audio = new AC(); }
      if (audio && audio.state === "suspended") audio.resume();
    } catch (e) { audio = null; }
    t.since = Date.now();
    if (baseSec() >= goalSec() && t.acc === 0) t.fired = true; /* Ziel schon vor dem Start erreicht: kein Signal */
    clearInterval(iv);
    iv = setInterval(tick, 250);
    requestLock();
    paint();
    if (onChange) onChange();
  }

  function pause() {
    if (!t || !t.since) return;
    t.acc += Date.now() - t.since;
    t.since = null;
    stopAll();
    paint();
    if (onChange) onChange();
  }

  function discard() {
    stopAll();
    t = null; ui = null;
  }

  function commit() {
    var n = t ? amount() : 0;
    discard();
    return n;
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) return;
    if (t && t.since) requestLock();
    tick();
  });

  /* ctx: { e: Übung, done(): aktueller Wert, add(n): Zeit eintragen, close(): Anzeige schließen } */
  function panel(ctx) {
    if (!t) return null;
    t.done = ctx.done;
    t.target = ctx.e.target;
    t.unit = ctx.e.unit;
    t.name = ctx.e.name;
    var time = el("div", { class: "tm-time", role: "timer", "aria-label": "Zeit" });
    var rest = el("p", { class: "tm-rest" });
    var ann = el("span", { class: "vh", "aria-live": "polite" });
    var main = el("button", { type: "button", class: "btn primary", onclick: function () { if (t.since) pause(); else start(); } });
    var add = el("button", { type: "button", class: "btn", onclick: function () {
      var n = commit();
      if (n > 0) ctx.add(n);
      ctx.close();
    } });
    var discardBtn = el("button", { type: "button", class: "btn", onclick: function () { discard(); ctx.close(); } });
    var box = el("div", { class: "tm" },
      el("div", { class: "tm-top" }, time, rest),
      el("div", { class: "btns" }, main, add, discardBtn),
      ann
    );
    ui = { box: box, time: time, rest: rest, main: main, add: add, discard: discardBtn, ann: ann };
    paint();
    return box;
  }

  App.timer = {
    supports: supports,
    current: function () { return t ? { day: t.day, id: t.id, name: t.name } : null; },
    isOpen: function (day, id) { return !!t && t.day === day && t.id === id; },
    isActive: active,
    /* Wird nach Start und Pause aufgerufen, damit der Trainingsplan seine Timer-Knöpfe nachziehen kann */
    onChange: function (fn) { onChange = fn; },
    /* Öffnet den Timer für diese Übung, falls kein anderer offen ist */
    open: function (day, e) {
      if (!supports(e.unit)) return false;
      if (t) return t.day === day && t.id === e.id;
      t = { day: day, id: e.id, name: e.name, unit: e.unit, target: e.target, acc: 0, since: null, fired: false, done: null };
      return true;
    },
    closeIdle: function () { if (t && !active()) discard(); },
    discard: discard,
    panel: panel
  };
})();
