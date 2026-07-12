/* Belegung — Datenmodell, Seed & Helfer (plain JS, hängt an window.BELEG) */
(function () {
  var PEOPLE = {
    lena:  { id: "lena",  name: "Lena",  initial: "L", color: "var(--chris)", tint: "var(--chris-tint)" },
    jonas: { id: "jonas", name: "Jonas", initial: "J", color: "var(--sarah)", tint: "var(--sarah-tint)" }
  };

  var RESOURCES = [
    { id: "auto",      name: "Auto",      emoji: "🚗" },
    { id: "ebike",     name: "E-Bike",    emoji: "🚲" },
    { id: "parkplatz", name: "Parkplatz", emoji: "🅿️" },
    { id: "gassi",     name: "Gassi",     emoji: "🐕" },
    { id: "wohnung",   name: "Wohnung",   emoji: "🏠" }
  ];

  var WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  var WEEKDAYS_LONG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

  // Kalenderwoche startet Montag; Basiswoche 14.–20. Juli 2025.
  var BASE_MONDAY = new Date(2025, 6, 14);

  var _seq = 100;
  function uid() { return "b" + (++_seq); }

  // Seed-Belegungen (day = 0..6 ab Montag)
  var SEED = [
    // Auto
    { id: uid(), resourceId: "auto", owner: "lena",  day: 0, allDay: false, start: "08:00", end: "12:00", repeat: "none",   status: "confirmed", note: "Zur Arbeit" },
    { id: uid(), resourceId: "auto", owner: "jonas", day: 2, allDay: false, start: "18:00", end: "22:00", repeat: "weekly", status: "confirmed", note: "Fußball" },
    { id: uid(), resourceId: "auto", owner: "jonas", day: 4, allDay: true,  start: "00:00", end: "23:59", repeat: "none",   status: "pending",   note: "Wochenendtrip", requestedBy: "jonas" },
    { id: uid(), resourceId: "auto", owner: "lena",  day: 5, allDay: false, start: "10:00", end: "13:00", repeat: "none",   status: "confirmed", note: "Wocheneinkauf" },

    // E-Bike
    { id: uid(), resourceId: "ebike", owner: "lena",  day: 1, allDay: false, start: "07:30", end: "08:15", repeat: "weekly", status: "confirmed", note: "Pendeln" },
    { id: uid(), resourceId: "ebike", owner: "jonas", day: 3, allDay: false, start: "17:00", end: "19:00", repeat: "none",   status: "confirmed", note: "Tour am See" },

    // Parkplatz
    { id: uid(), resourceId: "parkplatz", owner: "jonas", day: 0, allDay: true, start: "00:00", end: "23:59", repeat: "weekly", status: "confirmed", note: "Homeoffice-Woche" },
    { id: uid(), resourceId: "parkplatz", owner: "lena",  day: 5, allDay: true, start: "00:00", end: "23:59", repeat: "none",   status: "confirmed", note: "Besuch" },

    // Gassi (Hund) — geteilte Runden
    { id: uid(), resourceId: "gassi", owner: "lena",  day: 0, allDay: false, start: "07:00", end: "07:30", repeat: "weekly", status: "confirmed", note: "Morgenrunde" },
    { id: uid(), resourceId: "gassi", owner: "jonas", day: 0, allDay: false, start: "18:30", end: "19:15", repeat: "weekly", status: "confirmed", note: "Abendrunde" },
    { id: uid(), resourceId: "gassi", owner: "jonas", day: 1, allDay: false, start: "07:00", end: "07:30", repeat: "none",   status: "confirmed", note: "Morgenrunde" },
    { id: uid(), resourceId: "gassi", owner: "lena",  day: 1, allDay: false, start: "18:30", end: "19:15", repeat: "none",   status: "pending",   note: "Abendrunde", requestedBy: "lena" },
    { id: uid(), resourceId: "gassi", owner: "lena",  day: 2, allDay: false, start: "07:00", end: "07:30", repeat: "none",   status: "confirmed", note: "Morgenrunde" },

    // Wohnung — Zeit für sich
    { id: uid(), resourceId: "wohnung", owner: "lena",  day: 3, allDay: false, start: "19:00", end: "23:00", repeat: "none", status: "confirmed", note: "Mädelsabend" },
    { id: uid(), resourceId: "wohnung", owner: "jonas", day: 6, allDay: false, start: "14:00", end: "18:00", repeat: "none", status: "confirmed", note: "Zocken mit Tim" }
  ];

  // ── Helfer ────────────────────────────────────────────────
  function toMin(t) { var p = t.split(":"); return (+p[0]) * 60 + (+p[1]); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fromMin(m) { m = Math.max(0, Math.min(1439, m)); return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }

  function overlaps(a, b) {
    if (a.allDay || b.allDay) return true;
    return toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end);
  }

  // Konflikt-Partner für eine (evtl. neue) Belegung im selben Resource+Tag
  function conflictsFor(bk, all) {
    return all.filter(function (o) {
      return o.id !== bk.id &&
        o.resourceId === bk.resourceId &&
        o.day === bk.day &&
        o.status !== "declined" &&
        overlaps(bk, o);
    });
  }

  function weekDates(offset) {
    var out = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(BASE_MONDAY);
      d.setDate(BASE_MONDAY.getDate() + offset * 7 + i);
      out.push(d);
    }
    return out;
  }

  var MONTHS = ["Jan", "Feb", "März", "Apr", "Mai", "Juni", "Juli", "Aug", "Sep", "Okt", "Nov", "Dez"];
  function fmtDay(d) { return d.getDate() + ". " + MONTHS[d.getMonth()]; }
  function isoWeek(d) {
    var t = new Date(d); t.setHours(0, 0, 0, 0);
    t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
    var week1 = new Date(t.getFullYear(), 0, 4);
    return 1 + Math.round(((t - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  }

  function rangeLabel(bk) {
    if (bk.allDay) return "ganztägig";
    return bk.start + "–" + bk.end;
  }
  function durationMin(bk) { return bk.allDay ? 24 * 60 : toMin(bk.end) - toMin(bk.start); }

  window.BELEG = {
    PEOPLE: PEOPLE, RESOURCES: RESOURCES, WEEKDAYS: WEEKDAYS, WEEKDAYS_LONG: WEEKDAYS_LONG,
    SEED: SEED, uid: uid,
    toMin: toMin, fromMin: fromMin, overlaps: overlaps, conflictsFor: conflictsFor,
    weekDates: weekDates, fmtDay: fmtDay, isoWeek: isoWeek, rangeLabel: rangeLabel, durationMin: durationMin
  };
})();
