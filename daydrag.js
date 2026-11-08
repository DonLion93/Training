/* Ein Element aus einer festen Reihe (die Wochentage) per langem Drücken auf einen freien Platz ziehen.
   Die Reihenfolge der Plätze bleibt, es wandert nur der Inhalt: Loslassen über einem gültigen Platz ruft onDrop(von, nach) auf.
   Wer ein Element (itemSel) 3 Sekunden hält, ohne den Finger zu bewegen, hebt es an. Vorher bewegen oder loslassen ist ein normales Tippen.
   Gültige Plätze (canDrop) leuchten auf, der Platz unter dem Finger wird hervorgehoben. Touch und Maus über Pointer-Events,
   die Tastatur-Bedienung liegt bei der Ansicht. Nutzt von js/reorder.js die Scroll-Sperre. */
(function () {
  "use strict";
  var HOLD_MS = 3000, SLOP = 8, REACH = 90;

  /* o: { strip, itemSel, canStart(i), canDrop(von, nach), onDrop(von, nach), say(text), holdMs } */
  function attach(o) {
    var strip = o.strip, holdMs = o.holdMs || HOLD_MS;
    var hold = null, suppress = false, suppressTimer = null;
    function say(t) { if (o.say) o.say(t); }
    function items() { return [].slice.call(strip.querySelectorAll(o.itemSel)); }

    strip.addEventListener("pointerdown", function (ev) {
      if (hold || !ev.isPrimary || (ev.pointerType === "mouse" && ev.button !== 0)) return;
      var item = ev.target.closest(o.itemSel);
      if (!item || !strip.contains(item)) return;
      var idx = items().indexOf(item);
      if (idx < 0 || !o.canStart(idx)) return;
      suppress = false;
      clearTimeout(suppressTimer);
      begin(item, idx, ev);
    });
    /* Nach dem Loslassen eines gehaltenen Tages soll kein Klick mehr ankommen (sonst wird er gewählt) */
    strip.addEventListener("click", function (ev) {
      if (!suppress) return;
      suppress = false;
      ev.preventDefault();
      ev.stopPropagation();
    }, true);
    strip.addEventListener("contextmenu", function (ev) { if (hold) ev.preventDefault(); });
    strip.addEventListener("dragstart", function (ev) { if (hold) ev.preventDefault(); });

    function begin(item, idx, ev) {
      hold = { item: item, idx: idx, id: ev.pointerId, touch: ev.pointerType === "touch", x0: ev.clientX, y0: ev.clientY, cx: ev.clientX, cy: ev.clientY, armed: false, to: -1 };
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
      items().forEach(function (it) { it.classList.remove("drop-ok", "drop-hot", "drop-no"); });
      strip.classList.remove("dragging");
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onCancel);
      document.removeEventListener("keydown", onKey, true);
      App.reorder.lock(false);
    }

    function arm() {
      if (!hold) return;
      var list = items();
      if (list.indexOf(hold.item) !== hold.idx) { stop(); return; }
      hold.rects = list.map(function (it) { var r = it.getBoundingClientRect(); return { l: r.left + window.scrollX, t: r.top + window.scrollY, w: r.width, h: r.height }; });
      hold.start = { x: hold.cx + window.scrollX, y: hold.cy + window.scrollY };
      hold.armed = true;
      App.reorder.lock(true, {
        move: function (x, y) { if (hold && hold.armed) { hold.cx = x; hold.cy = y; update(); } },
        end: function (abort) { if (hold && hold.armed) finish(abort); }
      });
      suppress = true;
      hold.item.classList.remove("holding");
      hold.item.classList.add("lifted");
      strip.classList.add("dragging");
      list.forEach(function (it, k) {
        if (k === hold.idx) return;
        it.classList.add(o.canDrop(hold.idx, k) ? "drop-ok" : "drop-no");
      });
      try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) { /* egal */ }
      say("Tag angehoben. Ziehe ihn auf einen freien Tag, der aufleuchtet.");
      update();
    }

    /* Welcher gültige Platz liegt unter dem Finger? Nächster nach Breite, Höhe großzügig */
    function target() {
      var h = hold, px = h.cx + window.scrollX, py = h.cy + window.scrollY, best = -1, bestD = 1e9;
      var top = h.rects[0].t - REACH, bottom = h.rects[0].t + h.rects[0].h + REACH;
      if (py < top || py > bottom) return -1;
      h.rects.forEach(function (r, k) {
        if (k === h.idx || !o.canDrop(h.idx, k)) return;
        var d = Math.abs(px - (r.l + r.w / 2));
        if (d < r.w * 0.75 && d < bestD) { best = k; bestD = d; }
      });
      return best;
    }

    function update() {
      var h = hold;
      if (!h || !h.armed) return;
      h.item.style.transform = "translate(" + (h.cx + window.scrollX - h.start.x) + "px," + (h.cy + window.scrollY - h.start.y) + "px) scale(0.9)";
      var to = target();
      if (to !== h.to) {
        items().forEach(function (it, k) { it.classList.toggle("drop-hot", k === to); });
        h.to = to;
      }
    }

    function onMove(ev) {
      var h = hold;
      if (!h || ev.pointerId !== h.id) return;
      h.cx = ev.clientX;
      h.cy = ev.clientY;
      if (!h.armed) {
        /* Vor Ablauf der Zeit bewegt: kein Halten, normales Tippen oder Scrollen */
        if (Math.abs(h.cx - h.x0) > SLOP || Math.abs(h.cy - h.y0) > SLOP) stop();
        return;
      }
      update();
    }

    function onUp(ev) {
      var h = hold;
      if (!h || ev.pointerId !== h.id) return;
      if (!h.armed) { stop(); return; }
      finish(false);
    }

    function finish(abort) {
      var h = hold, from = h.idx, to = h.to;
      stop();
      suppressTimer = setTimeout(function () { suppress = false; }, 500);
      if (abort) { say("Abgebrochen."); return; }
      if (to < 0) { say("Abgebrochen. Zum Verschieben auf einen freien Tag ziehen."); return; }
      o.onDrop(from, to);
    }

    function onCancel(ev) {
      if (!hold || ev.pointerId !== hold.id) return;
      /* Bei Touch weiterziehen: die Touch-Ereignisse beenden die Geste */
      if (hold.armed && hold.touch) return;
      var was = hold.armed;
      stop();
      if (was) { suppressTimer = setTimeout(function () { suppress = false; }, 500); say("Abgebrochen."); }
    }

    function onKey(ev) {
      if (ev.key !== "Escape" || !hold) return;
      ev.preventDefault();
      var was = hold.armed;
      stop();
      if (was) { suppressTimer = setTimeout(function () { suppress = false; }, 500); say("Abgebrochen."); }
    }
  }

  App.daydrag = { attach: attach };
})();
