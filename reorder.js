/* Liste per langem Drücken umsortieren und löschen.
   Wer eine Zeile (handleSel) 3 Sekunden lang gedrückt hält, ohne den Finger zu bewegen, hebt sie an.
   Danach folgt sie dem Finger nach oben oder unten. Unten erscheint ein Mülleimer: Loslassen darauf ruft onDelete auf,
   Loslassen woanders ruft onMove(von, nach) auf. Bewegt man sich vorher oder lässt los, ist es ein normales Tippen oder Scrollen.
   Touch und Maus laufen über Pointer-Events. Die Tastatur-Bedienung liegt bei der Ansicht (views/uebungen.js). */
(function () {
  "use strict";
  var el = App.el;
  var HOLD_MS = 3000, SLOP = 8, EDGE = 64, MAX_SCROLL = 16;
  var trash = null;
  /* Ist eine Zeile angehoben, darf der Finger die Seite nicht mehr scrollen. Der Zuhörer steht dauerhaft und nicht-passiv am Dokument,
     weil manche mobilen Browser ein erst während der Berührung angemeldetes touchmove nicht mehr abbrechen lassen. */
  var lifting = false;
  /* Fällt der Browser mitten im Ziehen mit pointercancel aus (kommt bei langem Drücken auf manchen Geräten vor), laufen die Touch-Ereignisse weiter.
     Darüber wird dann zu Ende gezogen. touchDrive: { move(x, y), end(abbruch) } der gerade angehobenen Zeile. */
  var touchDrive = null;
  document.addEventListener("touchmove", function (ev) {
    if (!lifting) return;
    if (ev.cancelable) ev.preventDefault();
    var t = ev.touches[0];
    if (t && touchDrive) touchDrive.move(t.clientX, t.clientY);
  }, { passive: false });
  function touchEnd(abort) { return function () { if (touchDrive) touchDrive.end(abort); }; }
  document.addEventListener("touchend", touchEnd(false));
  document.addEventListener("touchcancel", touchEnd(true));

  function trashEl() {
    if (trash) return trash;
    trash = el("div", { class: "trash", "aria-hidden": "true" });
    /* festes Symbol, keine Nutzerdaten */
    trash.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg><span>Zum Löschen hierher ziehen</span>';
    document.body.append(trash);
    return trash;
  }

  /* o: { list, itemSel, handleSel, onMove(from, to), onDelete(index), say(text), holdMs } */
  function attach(o) {
    var list = o.list, holdMs = o.holdMs || HOLD_MS;
    var hold = null, suppress = false, suppressTimer = null;
    function say(t) { if (o.say) o.say(t); }

    list.addEventListener("pointerdown", function (ev) {
      if (hold || !ev.isPrimary || (ev.pointerType === "mouse" && ev.button !== 0)) return;
      var handle = ev.target.closest(o.handleSel);
      if (!handle || !list.contains(handle)) return;
      var item = handle.closest(o.itemSel);
      if (!item) return;
      suppress = false;
      clearTimeout(suppressTimer);
      begin(item, ev);
    });
    /* Nach dem Loslassen einer gehaltenen Zeile soll kein Klick mehr ankommen (sonst klappt sie auf) */
    list.addEventListener("click", function (ev) {
      if (!suppress) return;
      suppress = false;
      ev.preventDefault();
      ev.stopPropagation();
    }, true);
    list.addEventListener("contextmenu", function (ev) { if (hold) ev.preventDefault(); });
    list.addEventListener("dragstart", function (ev) { if (hold) ev.preventDefault(); });

    function begin(item, ev) {
      hold = { item: item, id: ev.pointerId, touch: ev.pointerType === "touch", x0: ev.clientX, y0: ev.clientY, cx: ev.clientX, cy: ev.clientY, armed: false, over: false };
      item.style.setProperty("--hold-ms", holdMs + "ms");
      item.classList.add("holding");
      hold.timer = setTimeout(arm, holdMs);
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onCancel);
      document.addEventListener("keydown", onKey, true);
    }

    function stop() {
      if (!hold) return;
      var h = hold;
      hold = null;
      clearTimeout(h.timer);
      h.item.classList.remove("holding", "lifted");
      h.item.style.transform = "";
      (h.items || []).forEach(function (it) { it.style.transform = ""; });
      list.classList.remove("sorting");
      if (trash) trash.classList.remove("show", "hot");
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onCancel);
      document.removeEventListener("keydown", onKey, true);
      lifting = false;
      touchDrive = null;
    }

    function arm() {
      if (!hold) return;
      var items = [].slice.call(list.querySelectorAll(o.itemSel)), idx = items.indexOf(hold.item);
      if (idx < 0) { stop(); return; }
      /* Erst messen, dann anheben: Positionen in Seitenkoordinaten, damit Scrollen mitzählt */
      hold.items = items;
      hold.idx = idx;
      hold.to = idx;
      hold.rects = items.map(function (it) { var r = it.getBoundingClientRect(); return { top: r.top + window.scrollY, h: r.height }; });
      hold.slot = idx < items.length - 1 ? hold.rects[idx + 1].top - hold.rects[idx].top : hold.rects[idx].h;
      hold.startPageY = hold.cy + window.scrollY;
      hold.armed = true;
      lifting = true;
      touchDrive = {
        move: function (x, y) { if (hold && hold.armed) { hold.cx = x; hold.cy = y; update(); } },
        end: function (abort) { if (hold && hold.armed) finish(abort); }
      };
      suppress = true;
      hold.item.classList.remove("holding");
      hold.item.classList.add("lifted");
      list.classList.add("sorting");
      hold.trash = trashEl();
      hold.trash.classList.add("show");
      try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) { /* egal */ }
      say("Zeile angehoben. Ziehe sie nach oben oder unten, oder auf den Mülleimer zum Löschen.");
      update();
      requestAnimationFrame(loop);
    }

    function update() {
      var h = hold;
      if (!h || !h.armed) return;
      var dy = h.cy + window.scrollY - h.startPageY;
      h.item.style.transform = "translateY(" + dy + "px) scale(1.02)";
      h.over = h.cy >= window.innerHeight - h.trash.offsetHeight;
      h.trash.classList.toggle("hot", h.over);
      var center = h.rects[h.idx].top + h.rects[h.idx].h / 2 + dy, to = h.idx;
      if (!h.over) {
        h.rects.forEach(function (r, k) {
          var mid = r.top + r.h / 2;
          if (k < h.idx && center < mid) to = Math.min(to, k);
          else if (k > h.idx && center > mid) to = Math.max(to, k);
        });
      }
      h.to = to;
      h.items.forEach(function (it, k) {
        if (k === h.idx) return;
        var s = 0;
        if (h.idx < to && k > h.idx && k <= to) s = -h.slot;
        else if (h.idx > to && k >= to && k < h.idx) s = h.slot;
        it.style.transform = s ? "translateY(" + s + "px)" : "";
      });
    }

    /* Am oberen und unteren Rand der Ansicht scrollt die Seite von selbst, damit lange Listen erreichbar bleiben */
    function loop() {
      var h = hold;
      if (!h || !h.armed) return;
      var vh = window.innerHeight, zone = h.trash.offsetHeight, sp = 0;
      if (h.cy < EDGE) sp = -MAX_SCROLL * (1 - Math.max(0, h.cy) / EDGE);
      else if (h.cy > vh - zone - EDGE && h.cy < vh - zone) sp = MAX_SCROLL * (1 - (vh - zone - h.cy) / EDGE);
      if (sp) {
        var before = window.scrollY;
        window.scrollBy(0, sp);
        if (window.scrollY !== before) update();
      }
      requestAnimationFrame(loop);
    }

    function onMove(ev) {
      if (!hold || ev.pointerId !== hold.id) return;
      hold.cx = ev.clientX;
      hold.cy = ev.clientY;
      if (!hold.armed) { if (Math.hypot(ev.clientX - hold.x0, ev.clientY - hold.y0) > SLOP) stop(); }
      else update();
    }

    function onUp(ev) {
      var h = hold;
      if (!h || ev.pointerId !== h.id) return;
      if (!h.armed) { stop(); return; }
      finish(false);
    }

    /* Loslassen (oder Abbruch) einer angehobenen Zeile */
    function finish(abort) {
      var h = hold;
      var idx = h.idx, to = h.to, over = h.over, intact = document.contains(list) && list.contains(h.item);
      stop();
      suppressTimer = setTimeout(function () { suppress = false; }, 500);
      if (abort) { say("Abgebrochen."); return; }
      if (!intact) return; /* die Liste wurde währenddessen neu aufgebaut */
      if (over) o.onDelete(idx);
      else if (to !== idx) o.onMove(idx, to);
      else say("Nichts verändert.");
    }

    function onCancel(ev) {
      if (!hold || ev.pointerId !== hold.id) return;
      /* Bei Touch weiterziehen: die Touch-Ereignisse (touchDrive) beenden die Geste */
      if (hold.armed && hold.touch) return;
      var was = hold.armed;
      stop();
      if (was) { suppressTimer = setTimeout(function () { suppress = false; }, 500); say("Abgebrochen."); }
    }

    function onKey(ev) {
      if (!hold || ev.key !== "Escape") return;
      var was = hold.armed;
      stop();
      if (was) { ev.preventDefault(); suppressTimer = setTimeout(function () { suppress = false; }, 500); say("Abgebrochen."); }
    }

  }

  /* Für andere Zieh-Module (js/daydrag.js): Scrollen sperren und bei pointercancel über Touch-Ereignisse weiterziehen */
  function lock(on, drive) { lifting = !!on; touchDrive = on ? drive : null; }

  App.reorder = { attach: attach, lock: lock };
})();
