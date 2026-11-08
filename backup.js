/* Backup (Daten): der ganze Stand als JSON, mit Prüfung beim Einspielen. Die Ansicht dazu steht in views/einstellungen.js. */
(function () {
  "use strict";
  var S = App.store;

  function toJson() {
    return JSON.stringify({ app: "trainingswoche", kind: "backup", v: 1, exportedAt: new Date().toISOString(), state: S.state() }) + "\n";
  }

  function parse(text) {
    if (typeof text !== "string" || !text.trim()) return { ok: false, error: "Es wurde kein Inhalt gefunden." };
    if (text.length > 3000000) return { ok: false, error: "Die Datei ist zu groß." };
    var obj;
    try { obj = JSON.parse(text.replace(/^﻿/, "")); } catch (e) { return { ok: false, error: "Das ist keine gültige JSON-Datei." }; }
    if (!obj || obj.app !== "trainingswoche") return { ok: false, error: "Diese Datei stammt nicht aus der Trainingswoche." };
    if (obj.kind === "reports") return { ok: false, error: "Das sind nur Berichte. Importiere sie im Reiter „Berichte“." };
    if (obj.kind !== "backup") return { ok: false, error: "Diese Datei ist kein Backup." };
    var st = S.clean(obj.state);
    if (!st) return { ok: false, error: "Das Backup ist beschädigt." };
    return { ok: true, state: st, exercises: st.exercises.length, reports: st.reports.length };
  }

  /* Sicherheitskopie: genau ein Platz im Browser. Vor jeder riskanten Aktion wird der aktuelle Stand abgelegt,
     damit man sie zurücknehmen kann. Die Kopie liegt nur auf diesem Gerät, nicht im Konto. */
  var UNDO_KEY = "trainingswoche-app-undo";
  var KINDS = {
    restore: "vor dem Einspielen eines Backups",
    merge: "vor dem Hinzufügen von Berichten",
    reset: "vor dem Zurücksetzen der Woche",
    undo: "vor dem Wiederherstellen einer Sicherheitskopie"
  };

  function snapshot(kind) {
    try {
      localStorage.setItem(UNDO_KEY, JSON.stringify({ v: 1, at: Date.now(), kind: KINDS[kind] ? kind : "restore", state: S.state() }));
      return true;
    } catch (e) {
      App.diag.log("Sicherheitskopie nicht möglich: " + (e && e.name));
      return false;
    }
  }

  function loadUndo() {
    try {
      var o = JSON.parse(localStorage.getItem(UNDO_KEY) || "null");
      if (!o || typeof o.at !== "number" || !KINDS[o.kind]) return null;
      var st = S.clean(o.state);
      return st ? { at: o.at, kind: o.kind, state: st } : null;
    } catch (e) { return null; }
  }

  function undoInfo() {
    var o = loadUndo();
    return o ? { at: o.at, label: KINDS[o.kind], exercises: o.state.exercises.length, reports: o.state.reports.length } : null;
  }

  /* Stellt die Sicherheitskopie wieder her. Der jetzige Stand wird dabei selbst zur Sicherheitskopie, man kann also hin und her wechseln. */
  function undoRestore() {
    var o = loadUndo();
    if (!o) return false;
    snapshot("undo");
    S.replace(o.state);
    return true;
  }

  /* Alles ersetzen, mit vorheriger Sicherheitskopie. Gibt zurück, ob die Kopie angelegt werden konnte. */
  function restore(st) {
    var saved = snapshot("restore");
    S.replace(st);
    return saved;
  }

  App.backup = { toJson: toJson, parse: parse, restore: restore, snapshot: snapshot, undoInfo: undoInfo, undoRestore: undoRestore };
})();
