/* Gewichtsverlauf: Einträge { d: Datum, kg } in state.weights, aufsteigend nach Datum, höchstens ein Eintrag je Tag.
   Das jüngste Gewicht gilt als aktuelles Gewicht und steht auch in den Persönlichen Angaben (profile.weight).
   Wer sein Gewicht in den Einstellungen ändert, trägt damit für heute einen Eintrag ein (siehe persona.js).
   App.weight.at(datum) liefert das Gewicht, das an einem Tag galt: der letzte Eintrag an oder vor dem Tag, sonst null. */
(function () {
  "use strict";
  var S = App.store, C = App.calc;
  var MAX = 3000;

  function list() {
    var st = S.state();
    if (!Array.isArray(st.weights)) st.weights = [];
    return st.weights;
  }

  function today() { return C.ymd(new Date()); }

  /* Das jüngste Gewicht in die Persönlichen Angaben übernehmen */
  function sync() {
    var l = list();
    if (!l.length) return;
    var st = S.state();
    if (!st.settings.profile) st.settings.profile = S.cleanProfile(null);
    st.settings.profile.weight = l[l.length - 1].kg;
  }

  /* Liefert true, wenn gespeichert wurde. Ungültige Werte und Zukunftsdaten werden abgelehnt. */
  function add(date, kg) {
    var c = S.cleanWeights([{ d: date, kg: kg }])[0];
    if (!c || c.d > today()) return false;
    var l = list().filter(function (x) { return x.d !== c.d; });
    l.push(c);
    l.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
    S.state().weights = l.slice(-MAX);
    sync();
    S.touch();
    return true;
  }

  function remove(date) {
    var st = S.state();
    st.weights = list().filter(function (x) { return x.d !== date; });
    sync();
    S.touch();
  }

  function at(date) {
    var l = list(), r = null;
    for (var i = 0; i < l.length; i++) { if (l[i].d <= date) r = l[i].kg; else break; }
    return r;
  }

  App.weight = { list: list, add: add, remove: remove, at: at, sync: sync };
})();
