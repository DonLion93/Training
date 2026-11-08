/* Bestätigungsdialog im Seitendesign. Der Browser-Dialog confirm() steht in der Claude-Ansicht nicht zur Verfügung.
   App.dialog.confirm({ title, text, ok, cancel }) gibt ein Versprechen zurück: true bei Bestätigung, sonst false.
   Vorgewählt ist immer „Abbrechen“. Escape, Tippen neben den Dialog und Abbrechen verwerfen. */
(function () {
  "use strict";
  var el = App.el, n = 0;

  function confirm(o) {
    return new Promise(function (resolve) {
      var id = "dlg" + (++n);
      var prevFocus = document.activeElement, prevOverflow = document.body.style.overflow;
      var cancel = el("button", { type: "button", class: "btn", text: o.cancel || "Abbrechen" });
      var ok = el("button", { type: "button", class: "btn danger", text: o.ok || "OK" });
      var box = el("div", { class: "dlg", role: "alertdialog", "aria-modal": "true", "aria-labelledby": id + "-t", "aria-describedby": id + "-d" },
        el("h2", { id: id + "-t", text: o.title }),
        el("p", { id: id + "-d", text: o.text }),
        el("div", { class: "btns" }, cancel, ok)
      );
      var back = el("div", { class: "dlg-back" }, box);

      function done(v) {
        document.removeEventListener("keydown", key, true);
        back.remove();
        document.body.style.overflow = prevOverflow;
        try { if (prevFocus && document.contains(prevFocus)) prevFocus.focus(); } catch (e) { /* egal */ }
        resolve(v);
      }
      function key(ev) {
        if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); done(false); }
        else if (ev.key === "Tab") {
          ev.preventDefault();
          var f = [cancel, ok], i = f.indexOf(document.activeElement);
          f[i < 0 ? 0 : (i + (ev.shiftKey ? f.length - 1 : 1)) % f.length].focus();
        }
      }
      cancel.addEventListener("click", function () { done(false); });
      ok.addEventListener("click", function () { done(true); });
      back.addEventListener("click", function (ev) { if (ev.target === back) done(false); });
      document.addEventListener("keydown", key, true);
      document.body.style.overflow = "hidden";
      document.body.append(back);
      cancel.focus();
    });
  }

  App.dialog = { confirm: confirm };
})();
