/* Speicher: der Plan-Stand (Übungen, Trainingstage, Haken der Woche).
   Wird sofort im Browser gesichert und, wenn verfügbar, gebündelt im Konto. Views lesen mit App.store.state()
   und rufen nach jeder Änderung App.store.touch() auf. Wer beim Wochenwechsel etwas archivieren will,
   meldet sich mit App.store.onRollover(fn); fn bekommt eine Kopie der abgelaufenen Woche. */
(function () {
  "use strict";

  var KEY = "trainingswoche-app-v1";
  var HAS_CLOUD = !!(window.claude && typeof window.claude.use === "function");
  var UNITS = ["Wdh.", "Sek.", "Min."];
  var DEFAULT_DAYS = [true, true, true, false, true, true, false];
  var ISO = /^\d{4}-\d{2}-\d{2}$/;

  function pad(n) { return String(n).padStart(2, "0"); }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function mondayStr() { var d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); }
  function num(x, d) { var n = Number(x); return isFinite(n) ? n : d; }
  function uid() { return "e" + Math.random().toString(36).slice(2, 8); }

  function defaults() {
    return {
      v: 1,
      weekStart: mondayStr(),
      exercises: [
        { id: "liegestuetze", name: "Liegestütze", target: 20, unit: "Wdh." },
        { id: "situps", name: "Sit-Ups", target: 30, unit: "Wdh." },
        { id: "plank", name: "Plank", target: 60, unit: "Sek." }
      ],
      days: DEFAULT_DAYS.slice(),
      shift: null,
      done: {},
      notes: {},
      reports: [],
      weights: [],
      settings: { theme: "system", accent: null, profile: { gender: null, height: null, weight: null, target: null, nick: "" } },
      updatedAt: 0
    };
  }

  /* Baut immer eine frische, veränderbare Kopie. Daten aus dem Konto sind schreibgeschützt. */
  function clean(raw) {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.exercises)) return null;
    var seen = {};
    var ex = [];
    raw.exercises.forEach(function (e) {
      if (!e || typeof e !== "object") return;
      var id = typeof e.id === "string" && /^[A-Za-z0-9_-]{1,24}$/.test(e.id) && !seen[e.id] ? e.id : uid();
      seen[id] = 1;
      var item = {
        id: id,
        name: (typeof e.name === "string" && e.name.trim() ? e.name.trim() : "Übung").slice(0, 40),
        target: Math.max(1, Math.floor(num(e.target, 1))),
        unit: UNITS.indexOf(e.unit) >= 0 ? e.unit : "Wdh."
      };
      var kc = cleanKcal(e.kcal);
      if (kc) item.kcal = kc;
      ex.push(item);
    });
    var done = {};
    if (raw.done && typeof raw.done === "object") {
      for (var i = 0; i < 7; i++) {
        var d = raw.done[i];
        if (!d || typeof d !== "object") continue;
        var o = {};
        Object.keys(d).forEach(function (id) {
          var n = Math.floor(num(d[id], 0));
          if (n > 0) o[id] = Math.min(n, 99999);
        });
        done[i] = o;
      }
    }
    var out = {
      v: 1,
      weekStart: typeof raw.weekStart === "string" && ISO.test(raw.weekStart) ? raw.weekStart : mondayStr(),
      exercises: ex,
      days: Array.isArray(raw.days) && raw.days.length === 7 ? raw.days.map(Boolean) : DEFAULT_DAYS.slice(),
      shift: null,
      done: done,
      notes: cleanNotes(raw.notes),
      reports: cleanReports(raw.reports),
      weights: cleanWeights(raw.weights),
      settings: cleanSettings(raw.settings),
      updatedAt: Math.max(0, num(raw.updatedAt, 0))
    };
    out.shift = cleanShift(raw.shift);
    return out;
  }

  /* Eigener Kalorienverbrauch je Einheit (je Wiederholung, Sekunde oder Minute): größer 0 bis 1000, drei Nachkommastellen, sonst null (= automatisch) */
  function cleanKcal(x) {
    var n = typeof x === "number" ? x : NaN;
    if (!isFinite(n) || n <= 0 || n > 1000) return null;
    n = Math.round(n * 1000) / 1000;
    return n > 0 ? n : null;
  }

  /* Gewichtsverlauf: [{ d: JJJJ-MM-TT, kg: 20 bis 300, eine Nachkommastelle }], aufsteigend, ein Eintrag je Tag, höchstens 3000 */
  function cleanWeights(arr) {
    var map = {};
    (Array.isArray(arr) ? arr : []).forEach(function (x) {
      if (!x || typeof x !== "object" || typeof x.d !== "string" || !ISO.test(x.d)) return;
      var kg = typeof x.kg === "number" && isFinite(x.kg) ? Math.round(x.kg * 10) / 10 : NaN;
      if (kg >= 20 && kg <= 300) map[x.d] = { d: x.d, kg: kg };
    });
    return Object.keys(map).sort().map(function (k) { return map[k]; }).slice(-3000);
  }

  /* Verschobene Trainingstage der laufenden Woche: { base: fester Plan, moves: [{ from, to }] }, sonst null */
  function cleanShift(raw) {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.base) || raw.base.length !== 7 || !Array.isArray(raw.moves)) return null;
    var moves = [];
    raw.moves.slice(0, 7).forEach(function (m) {
      if (!m || typeof m !== "object") return;
      var f = Math.floor(num(m.from, -1)), t = Math.floor(num(m.to, -1));
      if (f >= 0 && f <= 6 && t >= 0 && t <= 6 && f !== t) moves.push({ from: f, to: t });
    });
    return moves.length ? { base: raw.base.map(Boolean), moves: moves } : null;
  }

  /* Notizen je Wochentag (0 = Montag): Text bis 500 Zeichen, leere fallen weg */
  var NOTE_MAX = 500;
  function cleanNotes(raw) {
    var out = {};
    if (!raw || typeof raw !== "object") return out;
    for (var i = 0; i < 7; i++) {
      var t = raw[i];
      if (typeof t !== "string") continue;
      t = t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, NOTE_MAX);
      if (t) out[i] = t;
    }
    return out;
  }

  function cleanSettings(s) {
    s = s && typeof s === "object" ? s : {};
    return {
      theme: ["light", "dark", "black"].indexOf(s.theme) >= 0 ? s.theme : "system",
      accent: typeof s.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(s.accent) ? s.accent.toLowerCase() : null,
      profile: cleanProfile(s.profile)
    };
  }

  /* Körperwerte, die zu einem Bericht gehören: Gewicht (kg) und Größe (cm), jeweils optional */
  function cleanBody(h) {
    if (!h || typeof h !== "object") return null;
    var p = cleanProfile({ weight: h.kg, height: h.cm });
    return p.weight !== null || p.height !== null ? { kg: p.weight, cm: p.height } : null;
  }

  /* Persönliche Angaben: Geschlecht "m" oder "w" (oder nichts), Größe in cm (ganze Zahl 100 bis 250), Gewicht und Zielgewicht in kg (20 bis 300, eine Nachkommastelle), Spitzname bis 20 Zeichen */
  var NICK_MAX = 20;
  function cleanProfile(p) {
    p = p && typeof p === "object" ? p : {};
    var h = typeof p.height === "number" && isFinite(p.height) ? Math.round(p.height) : null;
    var w = typeof p.weight === "number" && isFinite(p.weight) ? Math.round(p.weight * 10) / 10 : null;
    var nick = typeof p.nick === "string" ? p.nick.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, NICK_MAX).trim() : "";
    var t = typeof p.target === "number" && isFinite(p.target) ? Math.round(p.target * 10) / 10 : null;
    return {
      gender: p.gender === "m" || p.gender === "w" ? p.gender : null,
      height: h !== null && h >= 100 && h <= 250 ? h : null,
      weight: w !== null && w >= 20 && w <= 300 ? w : null,
      target: t !== null && t >= 20 && t <= 300 ? t : null,
      nick: nick
    };
  }

  /* Abgeschlossene Wochen. Ein Bericht ist { w: Montag als JJJJ-MM-TT, d: 7 Tage, at: Zeitpunkt, n: Notizen je Tag (nur wenn vorhanden), h: { kg, cm } Körperwerte der Woche (nur wenn vorhanden) }.
     Ein Tag ist null (Ruhetag) oder eine Liste von Posten [Name, Einheit, Ziel, Erreicht] und, falls eingestellt, als fünftes der eigene Kalorienwert je Einheit. */
  function cleanReports(arr) {
    var map = {};
    (Array.isArray(arr) ? arr : []).forEach(function (r) {
      if (!r || typeof r !== "object" || typeof r.w !== "string" || !ISO.test(r.w) || !Array.isArray(r.d)) return;
      var d = [];
      for (var i = 0; i < 7; i++) {
        var day = r.d[i];
        if (!Array.isArray(day)) { d.push(null); continue; }
        var items = [];
        day.slice(0, 50).forEach(function (it) {
          if (!Array.isArray(it)) return;
          var own = cleanKcal(it[4]);
          var row = [
            String(it[0] || "Übung").slice(0, 40),
            UNITS.indexOf(it[1]) >= 0 ? it[1] : "Wdh.",
            Math.min(99999, Math.max(1, Math.floor(num(it[2], 1)))),
            Math.min(99999, Math.max(0, Math.floor(num(it[3], 0))))
          ];
          if (own) row.push(own);
          items.push(row);
        });
        d.push(items);
      }
      var rep = { w: r.w, d: d, at: Math.max(0, num(r.at, 0)) };
      var n = cleanNotes(r.n);
      if (Object.keys(n).length) rep.n = n;
      var h = cleanBody(r.h);
      if (h) rep.h = h;
      map[r.w] = rep;
    });
    return Object.keys(map).sort().map(function (k) { return map[k]; });
  }

  function loadLocal() {
    try {
      var s = localStorage.getItem(KEY);
      return s ? clean(JSON.parse(s)) : null;
    } catch (e) { return null; }
  }
  function saveLocal() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); localOk = true; }
    catch (e) {
      if (localOk) App.diag.log("Speichern im Browser fehlgeschlagen: " + (e && e.name));
      localOk = false;
    }
  }

  var localOk = true, lastSaved = 0, lastError = "";
  var local = loadLocal();
  var state = local || defaults();
  var hooks = [], adoptHooks = [];
  var dirty = false, timer = null, writing = false, again = false;
  var docRef = null;

  function status(kind) {
    var s = document.getElementById("status");
    if (!s) return;
    s.textContent = kind === "saved" ? "Gespeichert" : HAS_CLOUD ? "Nur auf diesem Gerät gespeichert" : "Auf diesem Gerät gespeichert";
  }

  /* Wochenwechsel: ab Montag beginnt eine neue Woche mit leeren Haken. Das ändert den Zeitstempel nicht,
     denn jedes Gerät kommt aus demselben alten Stand zum selben Ergebnis. */
  function rollover() {
    var cur = mondayStr();
    if (state.weekStart >= cur) return false;
    var old = JSON.parse(JSON.stringify(state));
    hooks.forEach(function (fn) { try { fn(old); } catch (e) { /* ein Modul darf den Wechsel nicht blockieren */ } });
    state.done = {};
    state.notes = {};
    if (state.shift) { state.days = state.shift.base.slice(); state.shift = null; }
    state.weekStart = cur;
    return true;
  }

  function schedule() {
    if (!docRef) { status(); return; }
    clearTimeout(timer);
    timer = setTimeout(flush, 300);
  }

  function flush() {
    timer = null;
    if (!docRef || !dirty) return;
    if (writing) { again = true; return; }
    dirty = false;
    writing = true;
    docRef.set(JSON.parse(JSON.stringify(state))).then(function () {
      lastSaved = Date.now();
      lastError = "";
      status("saved");
    }, function (e) {
      dirty = true;
      lastError = String(e && e.message ? e.message : e || "unbekannt").slice(0, 120);
      App.diag.log("Speichern im Konto fehlgeschlagen: " + lastError);
      status();
    }).then(function () {
      writing = false;
      if (again) { again = false; flush(); }
    });
  }

  function flushNow() {
    if (timer) { clearTimeout(timer); flush(); }
  }

  function touch() {
    state.updatedAt = Date.now();
    dirty = true;
    saveLocal();
    schedule();
  }

  function check() {
    if (!rollover()) return false;
    dirty = true;
    saveLocal();
    schedule();
    return true;
  }

  /* Konto-Speicher: der neuere Stand gewinnt, Browser oder Konto */
  function initDb() {
    if (!HAS_CLOUD) return;
    var ref = null;
    Promise.all([window.claude.use("db"), window.claude.use("user")]).then(function (r) {
      if (!r[0] || !r[1]) return null;
      return r[1].id().then(function (id) {
        if (!id) return null;
        ref = r[0].doc("data/users/" + id + "/plan");
        return ref.get();
      });
    }).then(function (snap) {
      if (!ref) return;
      var remote = snap && snap.exists ? clean(snap.data()) : null;
      var adopted = false;
      if (remote && remote.updatedAt >= state.updatedAt) {
        state = remote;
        saveLocal();
        adopted = true;
      } else if (remote || local || state.updatedAt > 0) {
        dirty = true;
      }
      docRef = ref;
      var rolled = check();
      if (adopted) adoptHooks.forEach(function (fn) { fn(); });
      if (adopted || rolled) App.rerender();
      if (dirty) flush(); else status("saved");
    }).catch(function (e) {
      docRef = null;
      lastError = String(e && e.message ? e.message : e || "unbekannt").slice(0, 120);
      App.diag.log("Konto nicht erreichbar: " + lastError);
      status();
    });
  }

  /* Ersetzt den ganzen Stand, zum Beispiel beim Einspielen eines Backups. st kommt aus clean(). */
  function replace(st) {
    state = st;
    state.updatedAt = Date.now();
    rollover();
    dirty = true;
    saveLocal();
    schedule();
    adoptHooks.forEach(function (fn) { fn(); });
  }

  App.store = {
    state: function () { return state; },
    touch: touch,
    clean: clean,
    cleanReports: cleanReports,
    cleanProfile: cleanProfile,
    cleanBody: cleanBody,
    cleanKcal: cleanKcal,
    cleanWeights: cleanWeights,
    NICK_MAX: NICK_MAX,
    NOTE_MAX: NOTE_MAX,
    replace: replace,
    cloud: HAS_CLOUD,
    info: function () { return { cloud: HAS_CLOUD, connected: !!docRef, dirty: dirty, lastSaved: lastSaved, lastError: lastError, localOk: localOk }; },
    onRollover: function (fn) { hooks.push(fn); },
    onAdopt: function (fn) { adoptHooks.push(fn); }
  };

  /* Start */
  var lastToday = App.todayIdx();
  /* Erst nach dem Laden aller Module, damit sich auch später geladene Module für den Wochenwechsel anmelden können */
  document.addEventListener("DOMContentLoaded", function () {
    if (!HAS_CLOUD) status();
    if (check()) App.rerender();
  });
  window.addEventListener("pagehide", flushNow);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { flushNow(); return; }
    var rolled = check();
    var t = App.todayIdx();
    if (rolled || t !== lastToday) { lastToday = t; App.rerender(); }
  });
  setInterval(function () {
    var rolled = check();
    var t = App.todayIdx();
    if (rolled || t !== lastToday) { lastToday = t; App.rerender(); }
  }, 60000);
  initDb();
})();
