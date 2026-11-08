/* Persönliche Angaben (Geschlecht, Größe, Gewicht, Spitzname) und ihre Nutzung. Die Werte liegen in state.settings.profile.
   Der Spitzname macht Hinweise der App persönlicher: App.persona.nick() liefert ihn oder einen leeren Text,
   App.persona.addr(text) hängt ihn mit Komma an, wenn er gesetzt ist ("Heute ist Pause" -> "Heute ist Pause, Liri"). */
(function () {
  "use strict";
  var S = App.store;

  function get() {
    var st = S.state();
    if (!st.settings.profile) st.settings.profile = S.cleanProfile(null);
    return st.settings.profile;
  }

  function C_today() { return App.calc.ymd(new Date()); }

  function nick() { return get().nick || ""; }

  /* Neue Werte prüfen und speichern, liefert das gespeicherte Profil */
  function set(patch) {
    var st = S.state();
    var merged = Object.assign({}, get(), patch);
    st.settings.profile = S.cleanProfile(merged);
    /* Ein geändertes Gewicht zählt als Eintrag für heute im Gewichtsverlauf */
    if (patch && typeof patch.weight === "number" && st.settings.profile.weight !== null && App.weight) {
      App.weight.add(C_today(), st.settings.profile.weight);
    }
    S.touch();
    return st.settings.profile;
  }

  function addr(text) { var n = nick(); return n ? text + ", " + n : text; }

  App.persona = { get: get, set: set, nick: nick, addr: addr };
})();
