/* Backup-Erinnerung. Die App kann nicht von selbst benachrichtigen, deshalb zeigt der Trainingsplan einen Hinweis, wenn das letzte Backup
   länger her ist als eingestellt. Gespeichert wird nur auf diesem Gerät (eigener Schlüssel), nicht im Konto:
   { last: Zeit des letzten Backups, since: seit wann die App Daten kennt, snooze: bis wann nicht fragen, days: Abstand, 0 = aus }.
   Nur ein vollständiges Backup (Datei oder Kopie aus den Einstellungen) zählt. */
(function () {
  "use strict";
  var el = App.el, S = App.store;
  var KEY = "trainingswoche-app-backup";
  var DAY = 86400000;
  var DEFAULT_DAYS = 14, SNOOZE_DAYS = 3;
  var CHOICES = [[0, "Aus"], [7, "7 Tage"], [14, "14 Tage"], [30, "30 Tage"]];

  function load() {
    var o = null;
    try { o = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { o = null; }
    if (!o || typeof o !== "object") o = {};
    var days = CHOICES.some(function (c) { return c[0] === o.days; }) ? o.days : DEFAULT_DAYS;
    return { last: typeof o.last === "number" ? o.last : null, since: typeof o.since === "number" ? o.since : null, snooze: typeof o.snooze === "number" ? o.snooze : 0, days: days };
  }
  function save(o) {
    try { localStorage.setItem(KEY, JSON.stringify(o)); return true; } catch (e) { return false; }
  }

  function hasData() {
    var st = S.state();
    return st.reports.length > 0 || Object.keys(st.done).length > 0;
  }

  /* Liefert { due, days, last, ageDays } für die aktuelle Zeit. due: Hinweis jetzt zeigen. */
  function status(now) {
    now = now == null ? Date.now() : now;
    var o = load();
    if (o.since === null && hasData()) { o.since = now; save(o); }
    var base = o.last !== null ? o.last : o.since;
    var age = base === null ? 0 : Math.floor((now - base) / DAY);
    return {
      days: o.days, last: o.last, ageDays: age,
      due: o.days > 0 && base !== null && hasData() && now - base >= o.days * DAY && now >= o.snooze
    };
  }

  function markBackup(now) {
    var o = load();
    o.last = now == null ? Date.now() : now;
    o.snooze = 0;
    return save(o);
  }
  function snooze(now) { var o = load(); o.snooze = (now == null ? Date.now() : now) + SNOOZE_DAYS * DAY; return save(o); }
  function setDays(d) { var o = load(); o.days = d; o.snooze = 0; return save(o); }

  function ageText(s) {
    if (s.last === null) return "Noch nicht gesichert";
    if (s.ageDays <= 0) return "Zuletzt gesichert: heute";
    return "Zuletzt gesichert: vor " + (s.ageDays === 1 ? "1 Tag" : s.ageDays + " Tagen");
  }

  /* Hinweiskarte für den Trainingsplan, oder null wenn nichts zu zeigen ist */
  function banner() {
    var s = status();
    if (!s.due) return null;
    var box = el("section", { class: "card remind", id: "remind", role: "region", "aria-label": "Backup-Erinnerung" });
    box.append(
      el("p", { class: "remind-t", text: (App.persona.nick() ? App.persona.nick() + ", " : "") + (s.last === null ? (App.persona.nick() ? "du hast" : "Du hast") + " noch kein Backup gemacht." : (App.persona.nick() ? "dein" : "Dein") + " letztes Backup ist " + s.ageDays + " Tage alt.") }),
      el("p", { class: "hint", text: "Ein Backup schützt deine Übungen und Berichte, falls dieses Gerät oder der Browser mal zurückgesetzt wird." }),
      el("div", { class: "btns" },
        el("button", { type: "button", class: "btn primary", text: "Jetzt sichern", onclick: function () {
          App.fold.show("bak");
          location.hash = "#optionen";
        } }),
        el("button", { type: "button", class: "btn", text: "Später", onclick: function () { snooze(); box.remove(); } }),
        el("button", { type: "button", class: "btn", text: "Nicht mehr erinnern", onclick: function () { setDays(0); box.remove(); } })
      )
    );
    return box;
  }

  /* Einstellung für den Block „Backup“ in den Einstellungen */
  function settingsNode() {
    var s0 = status();
    var info = el("p", { class: "hint", id: "bak-last" });
    var seg = el("div", { class: "seg", role: "group", "aria-label": "Backup-Erinnerung" });
    function paint() {
      var s = status();
      info.textContent = ageText(s) + (s.days ? ". Erinnerung nach " + s.days + " Tagen ohne Backup." : ". Erinnerung ist aus.");
      seg.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-d") === s.days)); });
    }
    CHOICES.forEach(function (c) {
      seg.append(el("button", { type: "button", "data-d": String(c[0]), text: c[1], onclick: function () { setDays(c[0]); paint(); } }));
    });
    paint();
    var wrap = el("div", { class: "remind-set" }, el("h3", { text: "Erinnerung" }),
      el("p", { class: "hint", text: "Der Trainingsplan zeigt einen Hinweis, wenn dein letztes Backup so lange her ist." }), seg, info);
    wrap.refresh = paint;
    return wrap;
  }

  App.reminder = { status: status, markBackup: markBackup, snooze: snooze, setDays: setDays, banner: banner, settingsNode: settingsNode, CHOICES: CHOICES };
})();
