/* Version und Änderungsprotokoll. Bei jeder Änderung hier einen neuen Eintrag OBEN einfügen und App.version anpassen.
   Aufbau: v = Version, date = Datum (optional), items = Stichpunkte. Neu = Funktion, Fix = Fehlerbehebung. */
(function () {
  "use strict";

  App.version = "1.21.0";

  App.changelog = [
    { v: "1.21.0", date: "2026-11-08", items: [
      "Neu: Zielgewicht. Unter Einstellungen > Persönliche Angaben gibt es das Feld „Zielgewicht“ direkt über dem Kästchen für die Sonntags-Erinnerung. Der Hinweistext darunter entfällt.",
      "Im Reiter Berichte zeigen die Gesundheitswerte beim Gewicht jetzt „Abstand zum Zielgewicht“: wie viele Kilo noch fehlen und einen Farbverlauf vom Start (rot) über Orange, Gelb und Hellgrün bis zum Ziel (dunkelgrün). Wer das Ziel erreicht oder übertrifft, steht am dunkelgrünen Ende. Der Start ist dein erster Eintrag im Gewichtsverlauf, das Ziel gilt auch beim Zunehmen.",
      "Im Gewichtsdiagramm erscheint das Ziel als gestrichelte Linie."
    ] },
    { v: "1.20.0", date: "2026-11-08", items: [
      "Neu: Wiege-Erinnerung. Öffnest du die App an einem Sonntag und hast für heute noch kein Gewicht eingetragen, erscheint ein Pop-up, in dem du das Gewicht gleich eintragen kannst. „Später“ blendet es bis zum nächsten Öffnen aus, „Nicht mehr erinnern“ schaltet es aus.",
      "Ein- und ausschalten kannst du die Erinnerung unter Einstellungen > Persönliche Angaben („Sonntags ans Wiegen erinnern“). Die App kann nichts melden, solange sie geschlossen ist. Neue Datei js/weightremind.js."
    ] },
    { v: "1.19.0", date: "2026-11-08", items: [
      "Behoben: Tippst du in ein Eingabefeld und die Bildschirmtastatur öffnet sich, scrollt die Seite jetzt automatisch so, dass das Feld oberhalb der Tastatur steht und du siehst, was du eingibst. Das gilt für alle Felder der App, auch die Notiz und ganz unten stehende Felder.",
      "Während der Eingabe hat die Seite unten zusätzlichen Platz, damit auch das letzte Feld nach oben scrollen kann. Neue Datei js/keyboard.js."
    ] },
    { v: "1.18.0", date: "2026-11-08", items: [
      "Neu: Im Reiter Berichte gibt es unter „Rekorde“ den Aufklapper „Abzeichen“ mit Stufen für Serie (3 bis 100 Tage), Wochen am Stück (2 bis 52 Wochen, jeweils Wochenziel erreicht), Trainingstage insgesamt und Tage über dem Ziel.",
      "Dazu kommt je Übung eine Gesamtmenge mit Stufen, zum Beispiel 100, 500, 1.000 bis 10.000 Wiederholungen oder bei Sekunden und Minuten von 10 Minuten bis 20 Stunden. Jede Familie zeigt, was bis zur nächsten Stufe fehlt.",
      "Erreichte Stufen bleiben bestehen, auch wenn eine Serie später reißt. Neue Datei js/badges.js."
    ] },
    { v: "1.17.0", date: "2026-11-08", items: [
      "Neu: Gewichtsverlauf in den Gesundheitswerten (Reiter Berichte). Du trägst Gewicht und Datum ein und siehst den Verlauf als Diagramm, mit aktuellem Gewicht, Veränderung seit dem ersten Eintrag und der Liste aller Einträge zum Löschen.",
      "Das jüngste Gewicht gilt als aktuelles Gewicht: Es steht auch in den Persönlichen Angaben, und ein dort geänderter Wert wird als Eintrag für heute gespeichert. BMI und Kalorien nutzen für jede Woche das Gewicht, das dann galt (der letzte Eintrag bis zum Wochenende).",
      "Der Gewichtsverlauf ist im Backup enthalten. Neue Datei js/weight.js."
    ] },
    { v: "1.16.0", date: "2026-11-08", items: [
      "Neu: Im Reiter Übungen gibt es in jeder aufgeklappten Übung die Zeile „Kalorien pro Wiederholung“ (oder pro Sekunde, pro Minute, je nach Einheit). Dort trägst du deinen eigenen Wert ein. Bleibt das Feld leer, schätzt die App automatisch, der Schätzwert steht als Platzhalter im Feld.",
      "Der eigene Wert zählt in den Gesundheitswerten und in den Berichten und wird mit jeder abgeschlossenen Woche gespeichert. Er braucht kein Gewicht. Beim Wechsel zwischen Sekunden und Minuten wird er umgerechnet, bei Wiederholungen entfällt er."
    ] },
    { v: "1.15.0", date: "2026-11-08", items: [
      "Neu: Im Reiter Berichte gibt es über „Rekorde“ den Aufklapper „Gesundheitswerte“. Der BMI wird aus Körpergröße und Gewicht der persönlichen Angaben berechnet (mit Bereich nach WHO, als grobe Orientierung ohne Diagnose).",
      "Darunter steht der geschätzte Kalorienverbrauch für heute und für die laufende Woche, berechnet aus deinen eingetragenen Übungen und deinem Gewicht. Es ist ein Richtwert.",
      "Wochen- und Monatsberichte zeigen jetzt „Kalorien (geschätzt)“ und „BMI“. Abgeschlossene Wochen merken sich dein Gewicht von damals, ältere Berichte rechnen mit deinen heutigen Angaben. Der CSV-Export hat eine Spalte „Kalorien (geschätzt)“. Neue Datei js/health.js."
    ] },
    { v: "1.14.0", date: "2026-11-08", items: [
      "Neu: Ganz oben in den Einstellungen gibt es den Aufklapper „Persönliche Angaben“: Spitzname, Geschlecht (männlich oder weiblich, ein Kästchen), Körpergröße in cm und Gewicht in kg. Alles ist freiwillig.",
      "Mit Spitznamen sprechen Hinweise dich persönlicher an, zum Beispiel am Ruhetag („Heute ist Pause, Liri.“) und in der Backup-Erinnerung. Die Angaben sind im Backup enthalten. Neue Datei js/persona.js."
    ] },
    { v: "1.13.2", date: "2026-11-08", items: [
      "Geändert: Der Hinweistext zum Verschieben unter den Übungen entfällt, der Trainingsplan wirkt aufgeräumter. Für Screenreader bleibt die Beschreibung an den Tagen erhalten."
    ] },
    { v: "1.13.1", date: "2026-11-08", items: [
      "Geändert: Ein Trainingstag wird jetzt verschoben, indem du ihn oben in der Wochenleiste 3 Sekunden gedrückt hältst und auf einen freien Tag ziehst. Der Knopf „Tag verschieben“ entfällt. Die Reihenfolge der Wochentage bleibt, nur das Training wandert.",
      "Beim Ziehen leuchten die freien Tage auf, die übrigen werden abgeblendet. Tastatur: Alt plus Pfeil links oder rechts verschiebt auf den nächsten freien Tag.",
      "Neue Datei js/daydrag.js."
    ] },
    { v: "1.13.0", date: "2026-11-07", items: [
      "Neu: Trainingstag verschieben. Im Trainingsplan gibt es unter den Übungen eines Trainingstags „Tag verschieben“. Du wählst einen freien Tag (Ruhetag), das Training wandert dorthin.",
      "Gilt nur für die laufende Woche. Eingetragene Werte ziehen mit um, der feste Plan unter „Übungen“ bleibt unverändert und kommt mit dem Wochenwechsel zurück. „Verschiebungen zurücknehmen“ stellt die Woche wieder her.",
      "Der Wochenbericht zeigt die Tage so, wie du sie trainiert hast. Neue Datei js/shift.js."
    ] },
    { v: "1.12.0", date: "2026-11-07", items: [
      "Neu: Notiz pro Tag. Im Trainingsplan gibt es unter den Übungen (auch an Ruhetagen) den Aufklapper „Notiz“. Der Text wird beim Tippen gespeichert, bis zu 500 Zeichen.",
      "Die Notizen kommen mit der Woche in den Bericht und stehen dort unter „Notizen“. Sie sind in Backup und JSON-Export enthalten, die CSV-Datei hat dafür die Spalte „Notiz zum Tag“.",
      "Eine Woche ohne eingetragene Übungen wird nicht als Bericht gespeichert, ihre Notizen gehen deshalb mit dem Wochenwechsel verloren."
    ] },
    { v: "1.11.0", date: "2026-11-07", items: [
      "Neu: Backup-Erinnerung. Ist dein letztes Backup länger her als eingestellt (Standard 14 Tage), zeigt der Trainingsplan einen Hinweis mit „Jetzt sichern“, „Später“ (3 Tage Ruhe) und „Nicht mehr erinnern“.",
      "Einstellbar unter Einstellungen > Backup: Aus, 7, 14 oder 30 Tage. Es zählt nur ein vollständiges Backup (Datei oder Kopie). Der Zeitpunkt wird nur auf diesem Gerät gemerkt.",
      "Neue Datei js/reminder.js."
    ] },
    { v: "1.10.0", date: "2026-11-07", items: [
      "Neu: Im Reiter Berichte gibt es über der Datensicherung den Aufklapper „Rekorde“: bester Tag (mit allen Übungen dieses Tages), beste Woche, längste Serie erreichter Tagesziele in Folge samt aktueller Serie und der Bestwert je Übung an einem Tag.",
      "Neue Datei js/records.js. Ruhetage unterbrechen die Serie nicht, ein verpasster Trainingstag oder eine fehlende Woche schon.",
      "Behoben: Das Verschieben und Löschen von Übungen per Touch ist robuster. Ist eine Zeile angehoben, scrollt die Seite zuverlässig nicht mehr mit."
    ] },
    { v: "1.9.0", date: "2026-11-07", items: [
      "Neu: Im Reiter Berichte gibt es neben „Wochen“ und „Monate“ den Punkt „Vergleich“. Du wählst mehrere Wochen oder Monate aus (bis zu 12) und siehst sie als Diagramm nebeneinander.",
      "Der Vergleich zeigt die Gesamtleistung, je Übung ein kleines Diagramm mit gleicher Skala, den Verlauf vom ersten zum letzten Zeitraum und alle Zahlen als Tabelle.",
      "Geändert: Die Datensicherung im Reiter Berichte ist jetzt aufklappbar. Neue Datei js/fold.js, die auch die Einstellungen nutzen."
    ] },
    { v: "1.8.2", date: "2026-11-07", items: [
      "Geändert: Die große Überschrift oben in jedem Reiter und die Überschriften der Karten (z. B. Darstellung, Tagesziel) haben jetzt die gewählte Akzentfarbe statt Weiß oder Schwarz."
    ] },
    { v: "1.8.1", date: "2026-11-07", items: [
      "Geändert: Die Themen im Reiter Einstellungen (Darstellung, Backup, Sicherheitskopie, Speicherung, Info und Diagnose) sind jetzt aufklappbar und anfangs zugeklappt.",
      "Die App merkt sich bis zum Neuladen, welche offen sind. Meldungen (z. B. nach dem Einspielen) klappen ihren Block von selbst auf."
    ] },
    { v: "1.8.0", date: "2026-11-07", items: [
      "Geändert: Im Reiter Übungen gibt es keine Pfeil- und Entfernen-Knöpfe mehr. Tippen klappt eine Übung zum Bearbeiten auf.",
      "Neu: Eine Übung 3 Sekunden gedrückt halten, dann nach oben oder unten ziehen, um sie zu verschieben. Beim Halten erscheint unten ein Mülleimer zum Löschen.",
      "Neu: Gelöscht wird immer erst nach Rückfrage. Mit der Tastatur: Alt + Pfeil hoch oder runter zum Verschieben, Entf zum Löschen."
    ] },
    { v: "1.7.1", date: "2026-11-07", items: [
      "Geändert: Der Timer-Knopf ist jetzt ein Stoppuhr-Symbol links neben dem Zahlenfeld. Alle Übungszeilen bleiben gleich hoch."
    ] },
    { v: "1.7.0", date: "2026-11-07", items: [
      "Neu: Karte „Serie und Bestwerte“ im Reiter Berichte mit aktueller und längster Serie, den letzten 12 Wochen als Punkte und Rekorden pro Übung (bester Tag, beste Woche)."
    ] },
    { v: "1.6.0", date: "2026-11-07", items: [
      "Neu: Timer für Übungen mit Sekunden oder Minuten (zum Beispiel Plank). Die Zeit zählt nach der Uhr, signalisiert das Ziel mit Ton und Vibration und wird mit „Eintragen“ zum Wert addiert.",
      "Neu: Der Bildschirm bleibt während des Timers an, wenn das Gerät es erlaubt."
    ] },
    { v: "1.5.0", date: "2026-11-07", items: [
      "Neu: Automatische Sicherheitskopie vor dem Einspielen eines Backups, dem Hinzufügen von Berichten und dem Zurücksetzen der Woche.",
      "Neu: Karte „Sicherheitskopie“ in den Einstellungen mit „Wiederherstellen“. Der Stand davor wird dabei selbst zur Kopie, man kann also hin und her wechseln."
    ] },
    { v: "1.4.0", date: "2026-11-07", items: [
      "Neu: Bereich „Info und Diagnose“ mit Version, Änderungsprotokoll und Diagnose zum Kopieren.",
      "Neu: Fehlerprotokoll, das unerwartete Fehler der App festhält."
    ] },
    { v: "1.3.0", date: "2026-11-07", items: [
      "Neu: Einstellungen mit Modus System, Hell, Dunkel und Schwarz.",
      "Neu: Akzentfarbe (Vorgaben oder eigene Farbe).",
      "Neu: Backup speichern, kopieren und einspielen; Woche zurücksetzen."
    ] },
    { v: "1.2.0", items: [
      "Neu: Berichte pro Woche und Monat mit Verlaufsdiagramm.",
      "Neu: Berichte als JSON oder CSV sichern und wieder importieren."
    ] },
    { v: "1.1.0", items: [
      "Neu: Reiter Übungen: Trainingstage, Übungen, Ziele und Einheiten ändern."
    ] },
    { v: "1.0.0", items: [
      "Neu: Trainingsplan mit Haken, Zahleneingabe, Tages- und Wochenziel und Überleistung über 100 %.",
      "Neu: Aufbau in vier Reitern, jeder Reiter als eigenes Modul."
    ] }
  ];
})();
