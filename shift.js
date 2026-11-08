/* Trainingstag verschieben: nur für die laufende Woche, der feste Plan (Reiter Übungen) bleibt unberührt.
   Ein Verschieben macht den Quelltag zum Ruhetag und den Zieltag (ein Ruhetag) zum Trainingstag. Schon eingetragene Werte wandern mit.
   Im Stand steht state.shift = { base: der feste Plan (7 Wahrheitswerte), moves: [{ from, to }] }. state.days ist der Plan dieser Woche.
   Beim Wochenwechsel stellt der Speicher state.days aus base wieder her (store.js). Die Berichte bekommen die verschobenen Tage so, wie sie waren. */
(function () {
  "use strict";
  var S = App.store;
  var MAX_MOVES = 7;

  function info() {
    var sh = S.state().shift;
    return sh && sh.moves.length ? sh : null;
  }

  /* Freie Tage dieser Woche: alle Ruhetage */
  function targets(from) {
    var st = S.state();
    var out = [];
    for (var i = 0; i < 7; i++) if (i !== from && !st.days[i]) out.push(i);
    return out;
  }

  function canMove(from, to) {
    var st = S.state();
    if (from === to || from < 0 || from > 6 || to < 0 || to > 6) return false;
    if (!st.days[from] || st.days[to]) return false;
    var sh = st.shift;
    return !(sh && sh.moves.length >= MAX_MOVES);
  }

  function hasValues(d) { return !!d && Object.keys(d).length > 0; }

  function move(from, to) {
    if (!canMove(from, to)) return false;
    var st = S.state();
    if (!st.shift) st.shift = { base: st.days.slice(), moves: [] };
    st.days[from] = false;
    st.days[to] = true;
    /* Werte des Quelltags gehören zum Training und ziehen mit um. Alte Reste auf dem Ruhetag werden ersetzt. */
    if (hasValues(st.done[from])) { st.done[to] = st.done[from]; delete st.done[from]; }
    else if (st.done[to]) delete st.done[to];
    st.shift.moves.push({ from: from, to: to });
    S.touch();
    return true;
  }

  /* Alle Verschiebungen dieser Woche zurücknehmen, in umgekehrter Reihenfolge, Werte wandern zurück */
  function revert() {
    var st = S.state(), sh = st.shift;
    if (!sh) return false;
    for (var k = sh.moves.length - 1; k >= 0; k--) {
      var m = sh.moves[k];
      if (hasValues(st.done[m.to]) && !hasValues(st.done[m.from])) { st.done[m.from] = st.done[m.to]; delete st.done[m.to]; }
    }
    st.days = sh.base.slice();
    st.shift = null;
    S.touch();
    return true;
  }

  /* Letzte Verschiebung, die diesen Tag betrifft: { kind: "to" | "from", other } oder null */
  function note(day) {
    var sh = info();
    if (!sh) return null;
    var st = S.state();
    for (var k = sh.moves.length - 1; k >= 0; k--) {
      var m = sh.moves[k];
      if (m.to === day && st.days[day]) return { kind: "to", other: m.from };
      if (m.from === day && !st.days[day]) return { kind: "from", other: m.to };
    }
    return null;
  }

  App.shift = { info: info, targets: targets, canMove: canMove, move: move, revert: revert, note: note, MAX_MOVES: MAX_MOVES };
})();
