/* Dateien: Speichern, Kopieren und Lesen. Im Artifact über die Fähigkeit "downloads", in der installierten Web-App
   über das Teilen-Menü, sonst als normaler Download. Wird von Berichten und später von den Einstellungen genutzt. */
(function () {
  "use strict";
  var IN_VIEWER = !!(window.claude && typeof window.claude.use === "function");

  function standalone() {
    try { return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; }
    catch (e) { return false; }
  }

  function viaBrowser(name, text, mime) {
    function download() {
      try {
        var url = URL.createObjectURL(new Blob([text], { type: mime + ";charset=utf-8" }));
        var a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        return "ok";
      } catch (e) { return "error"; }
    }
    try {
      if (standalone() && navigator.canShare && window.File) {
        var f = new File([text], name, { type: mime });
        if (navigator.canShare({ files: [f] })) {
          return navigator.share({ files: [f] }).then(function () { return "ok"; }, function (e) {
            return e && e.name === "AbortError" ? "cancel" : download();
          });
        }
      }
    } catch (e) { /* weiter mit normalem Download */ }
    return Promise.resolve(download());
  }

  /* Ergebnis: "ok", "cancel", "unsupported" oder "error" */
  function save(name, text, mime) {
    if (!IN_VIEWER) return viaBrowser(name, text, mime);
    return window.claude.use("downloads").then(function (dl) {
      if (!dl) return "unsupported";
      return dl.save({ filename: name, data: text }).then(function () { return "ok"; }, function (e) {
        var c = e && e.code;
        if (c === "declined") return "cancel";
        if (c === "unavailable" || c === "not_granted" || c === "capability_disabled" || c === "capability_removed") return "unsupported";
        return "error";
      });
    }, function () { return "unsupported"; });
  }

  function copy(text) {
    function fallback() {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.append(ta);
        ta.select();
        var ok = document.execCommand("copy");
        ta.remove();
        return ok;
      } catch (e) { return false; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, fallback);
    }
    return Promise.resolve(fallback());
  }

  function read(file) {
    if (file.size > 3000000) return Promise.reject(new Error("zu groß"));
    if (file.text) return file.text();
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result)); };
      r.onerror = function () { reject(r.error); };
      r.readAsText(file);
    });
  }

  /* Einlesen mit Vorschau: Datei wählen oder Text einfügen, o.parse(text) prüft, dann bestätigt der Nutzer eine Aktion.
     parse liefert { ok: false, error } oder { ok: true, text, actions: [{ label, primary, confirm, run }] }.
     confirm ist der Text für den zweiten Klick bei riskanten Aktionen. Gibt { node, say } zurück. */
  function importBox(o) {
    var el = App.el;
    var msg = el("p", { class: "msg", role: "status", id: o.id + "-msg" });
    var prev = el("div", { class: "imp-preview" });
    function say(t, err) { msg.textContent = t || ""; msg.classList.toggle("err", !!err); }

    function check(text) {
      var r = o.parse(text);
      prev.replaceChildren();
      if (!r.ok) { say(r.error, true); return; }
      say("");
      var btns = el("div", { class: "btns" });
      r.actions.forEach(function (a) {
        var run = function () { prev.replaceChildren(); a.run(); };
        btns.append(a.confirm
          ? App.confirmButton(a.label, a.confirm, run)
          : el("button", { type: "button", class: "btn" + (a.primary ? " primary" : ""), text: a.label, onclick: run }));
      });
      btns.append(el("button", { type: "button", class: "btn", text: "Abbrechen", onclick: function () { prev.replaceChildren(); } }));
      prev.append(el("p", { text: r.text }), btns);
    }

    var file = el("input", { type: "file", id: o.id + "-file", class: "vh", accept: ".json,application/json,text/plain" });
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      read(f).then(check, function () { say("Die Datei konnte nicht gelesen werden.", true); });
      file.value = "";
    });
    var ta = el("textarea", { class: "in paste", id: o.id + "-text", rows: "4", placeholder: "Inhalt der JSON-Datei hier einfügen", "aria-label": "Inhalt der JSON-Datei" });

    var node = el("div", { class: "imp" },
      el("div", { class: "btns" }, file, el("label", { class: "btn", for: o.id + "-file", text: "Datei wählen" })),
      el("details", { class: "paste-box" },
        el("summary", { text: "Stattdessen Text einfügen" }),
        el("div", { class: "paste-in" }, ta, el("div", null, el("button", { type: "button", class: "btn", text: "Prüfen", onclick: function () { check(ta.value); } })))
      ),
      prev, msg
    );
    return { node: node, say: say };
  }

  App.files = { save: save, copy: copy, read: read, importBox: importBox };
})();
