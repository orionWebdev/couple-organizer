/* TwoDo — Redesign-Exploration · Datenmodell, Szenarien & Helfer
   Plain JS, hängt an window.TG. Kein Produktionscode — nur die Prototypen-Daten.

   Kern-Idee zur Belegung: Eine Serie ist EIN Datensatz (eine Regel).
   Angezeigt werden immer aufgelöste, konkrete Termine in einem begrenzten Fenster
   (heute / diese Woche) — nie eine Serie über einen Zeithorizont ausgerollt. */
(function () {

  /* ── Paar = Konfiguration, keine festen Namen ──────────────────────
     Zwei feste Personenfarben sind das Identitätssystem; Namen/Initialen
     kommen pro Paar aus dieser Config. Viewer = wer eingeloggt ist. */
  var COUPLE = {
    a: { id: "a", name: "Mara", initial: "M", color: "var(--chris)", tint: "var(--chris-tint)" }, // Terrakotta
    b: { id: "b", name: "Ben",  initial: "B", color: "var(--sarah)", tint: "var(--sarah-tint)" }  // Türkis
  };
  var VIEWER = "a"; // eingeloggt = Mara

  var RESOURCES = [
    { id: "auto",      name: "Auto",      emoji: "🚗" },
    { id: "ebike",     name: "E-Bike",    emoji: "🚲" },
    { id: "parkplatz", name: "Parkplatz", emoji: "🅿️" },
    { id: "gassi",     name: "Hund",      emoji: "🐕" },
    { id: "wohnung",   name: "Wohnung",   emoji: "🏠" }
  ];

  var WEEKDAYS      = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  var WEEKDAYS_LONG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  var MONTHS = ["Jan", "Feb", "März", "Apr", "Mai", "Juni", "Juli", "Aug", "Sep", "Okt", "Nov", "Dez"];

  // Demo-„Heute" = Mittwoch, 16. Juli 2025. Wochenbasis Mo 14.–So 20. Juli.
  var TODAY = new Date(2025, 6, 16);
  var BASE_MONDAY = new Date(2025, 6, 14);

  var _seq = 100;
  function uid() { return "b" + (++_seq); }

  // Planung-Seed: Belegung liegt in bookings; hier Ideen (Bucketlist), Reisen, Notizen.
  function planungSeed() {
    return {
      ideen: [
        { id: "i1", cat: "film",  title: "Dune: Teil 2",             by: "a", done: false },
        { id: "i2", cat: "film",  title: "Poor Things",              by: "b", done: false },
        { id: "i3", cat: "essen", title: "Ramen-Laden im Nordend",    by: "b", done: false },
        { id: "i4", cat: "essen", title: "Trattoria an der Ecke",     by: "a", done: true  },
        { id: "i5", cat: "date",  title: "Sternschnuppen im August",  by: "a", done: false },
        { id: "i6", cat: "date",  title: "Töpferkurs ausprobieren",    by: "b", done: false }
      ],
      reisen: [
        { id: "r1", title: "Wochenende Amsterdam", when: "noch offen", emoji: "🚲",
          todos: [
            { id: "t1", text: "Hotel buchen", done: false },
            { id: "t2", text: "Zugtickets buchen", done: true },
            { id: "t3", text: "Fahrräder leihen", done: false }
          ],
          programm: [
            { id: "p1", text: "Van-Gogh-Museum" },
            { id: "p2", text: "Grachtenfahrt bei Sonnenuntergang" },
            { id: "p3", text: "Foodhallen — Snacks testen" }
          ],
          notiz: "Freitag früh los, um dem Berufsverkehr zu entgehen." },
        { id: "r2", title: "Wandern Zugspitze", when: "Sept.", emoji: "⛰️",
          todos: [
            { id: "t4", text: "Hütte reservieren", done: false },
            { id: "t5", text: "Wanderschuhe checken", done: false }
          ],
          programm: [
            { id: "p4", text: "Sonnenaufgang am Gipfel" }
          ],
          notiz: "" }
      ],
      notizen: [
        { id: "n1", text: "WLAN-Passwort Ferienwohnung: sonne2025" },
        { id: "n2", text: "Geschenk Mama → Kochkurs schenken" }
      ]
    };
  }

  // ── Zeit-Helfer ───────────────────────────────────────────────────
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function toMin(t) { var p = t.split(":"); return (+p[0]) * 60 + (+p[1]); }
  function fromMin(m) { m = Math.max(0, Math.min(1439, m)); return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function weekdayIdx(d) { return (d.getDay() + 6) % 7; } // Mo = 0
  function fmtDay(d) { return d.getDate() + ". " + MONTHS[d.getMonth()]; }
  function sameDate(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

  function weekDates(offset) {
    var out = [];
    for (var i = 0; i < 7; i++) out.push(addDays(BASE_MONDAY, (offset || 0) * 7 + i));
    return out;
  }

  function rangeLabel(bk) { return bk.allDay ? "ganztägig" : bk.start + "–" + bk.end; }
  function startMin(bk) { return bk.allDay ? -1 : toMin(bk.start); }

  // ── Serien-Auflösung — der Kern ────────────────────────────────────
  // Konkrete Termine einer Regel für EINEN Tag (weekly: Wochentag trifft; none: Datum trifft).
  function occursOn(bk, date) {
    if (bk.repeat === "weekly") return weekdayIdx(date) === bk.weekday;
    return sameDate(new Date(bk.date + "T00:00:00"), date);
  }

  // Alle konkreten Termine einer Woche (7 Tage → beschränkt, egal wie viele Serien).
  function expandWeek(bookings, weekArr) {
    var byDay = weekArr.map(function () { return []; });
    weekArr.forEach(function (date, i) {
      bookings.forEach(function (bk) { if (occursOn(bk, date)) byDay[i].push(bk); });
      byDay[i].sort(function (a, b) { return startMin(a) - startMin(b); });
    });
    return byDay;
  }

  // Termine an einem konkreten Datum (z. B. heute).
  function onDate(bookings, date) {
    return bookings.filter(function (bk) { return occursOn(bk, date); })
      .sort(function (a, b) { return startMin(a) - startMin(b); });
  }

  // Nächster konkreter Termin einer Regel ab (inkl.) fromDate — nie „unendlich".
  function nextOccurrence(bk, fromDate) {
    var from = startOfDay(fromDate);
    if (bk.repeat === "weekly") {
      for (var i = 0; i < 7; i++) { var d = addDays(from, i); if (weekdayIdx(d) === bk.weekday) return d; }
      return from;
    }
    var od = startOfDay(new Date(bk.date + "T00:00:00"));
    return od >= from ? od : null; // einmalig & vorbei
  }

  // Menschliche Beschreibung des nächsten Termins — behält die Info „wann fällt die Serie".
  function nextLabel(bk, fromDate) {
    var d = nextOccurrence(bk, fromDate || TODAY);
    if (!d) return "vorbei";
    var base = startOfDay(fromDate || TODAY);
    var diff = Math.round((d - base) / 86400000);
    var when = diff === 0 ? "heute" : diff === 1 ? "morgen" : WEEKDAYS_LONG[weekdayIdx(d)] + " " + d.getDate() + "." + (d.getMonth() + 1) + ".";
    return when + " · " + rangeLabel(bk);
  }

  // ── Konflikt = zwei Termine derselben Ressource am selben Tag, überlappend ──
  function overlaps(a, b) {
    if (a.allDay || b.allDay) return true;
    return toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end);
  }
  // Konflikt-Partner für bk an einem konkreten Datum
  function conflictsOn(bk, bookings, date) {
    return bookings.filter(function (o) {
      return o.id !== bk.id && o.resourceId === bk.resourceId && occursOn(o, date) && overlaps(bk, o);
    });
  }

  // ══ Szenarien ══════════════════════════════════════════════════════
  // Bookings: weekly → { weekday }; einmalig → { date: 'YYYY-MM-DD' }.

  // 1) NORMALFALL — volles Paar-Leben, Mittwochabend.
  function fullData() {
    return {
      meal: { emoji: "🍝", title: "Pasta al Limone", min: 25, cook: null }, // Koch offen = Aktion
      shopping: [
        { id: "s1", name: "Zitronen",   done: false },
        { id: "s2", name: "Parmesan",   done: false },
        { id: "s3", name: "Spülmittel", done: false },
        { id: "s4", name: "Hafermilch", done: true }
      ],
      chores: [
        { id: "c1", task: "Bad putzen",      room: "Bad",    owner: "b", today: true,  done: false },
        { id: "c2", task: "Müll rausbringen", room: "Küche",  owner: "a", today: true,  done: false },
        { id: "c3", task: "Staubsaugen",     room: "Flur",   owner: "b", today: false, done: false }
      ],
      finance: { spent: 612, budget: 800, month: "Juli", debtFrom: "b", debtTo: "a", debt: 34.5, paid: { a: 340.5, b: 271.5 }, lastPayment: { by: "b", what: "Wocheneinkauf", amount: 42.8, when: "gestern" } },
      resources: RESOURCES.slice(),
      bookings: [
        { id: uid(), resourceId: "auto",      owner: "a", allDay: false, start: "08:00", end: "12:00", repeat: "none",   date: "2025-07-16", note: "Zur Arbeit" },
        { id: uid(), resourceId: "auto",      owner: "b", allDay: false, start: "10:00", end: "13:00", repeat: "none",   date: "2025-07-16", note: "Werkstatt" },   // Konflikt heute
        { id: uid(), resourceId: "auto",      owner: "b", allDay: false, start: "18:00", end: "22:00", repeat: "weekly", weekday: 2,          note: "Fußball" },     // Serie, heute
        { id: uid(), resourceId: "gassi",     owner: "a", allDay: false, start: "07:00", end: "07:30", repeat: "weekly", weekday: 2,          note: "Morgenrunde" }, // Serie, heute
        { id: uid(), resourceId: "ebike",     owner: "a", allDay: false, start: "07:30", end: "08:15", repeat: "weekly", weekday: 0,          note: "Pendeln" },
        { id: uid(), resourceId: "wohnung",   owner: "a", allDay: false, start: "19:00", end: "23:00", repeat: "none",   date: "2025-07-17", note: "Mädelsabend" },
        { id: uid(), resourceId: "auto",      owner: "b", allDay: false, start: "10:00", end: "13:00", repeat: "none",   date: "2025-07-19", note: "Wocheneinkauf" },
        { id: uid(), resourceId: "parkplatz", owner: "b", allDay: true,  start: "00:00", end: "23:59", repeat: "weekly", weekday: 0,          note: "Homeoffice" }
      ],
      planung: planungSeed()
    };
  }

  // 2) LEERZUSTAND — frisch angemeldetes Paar.
  function emptyData() {
    return {
      meal: null,
      shopping: [],
      chores: [],
      finance: { spent: 0, budget: null, month: "Juli", debtFrom: null, debtTo: null, debt: 0, paid: { a: 0, b: 0 }, lastPayment: null },
      resources: [],
      bookings: [],
      planung: { ideen: [], reisen: [], notizen: [] }
    };
  }

  // 3) VOLLE BELEGUNG — viele Termine inkl. mehrerer Serien.
  function manyData() {
    var d = fullData();
    d.bookings = [
      // Serien (Regeln) — vervielfachen sich NICHT, werden pro Woche aufgelöst
      { id: uid(), resourceId: "ebike",     owner: "a", allDay: false, start: "07:30", end: "08:15", repeat: "weekly", weekday: 0, note: "Pendeln" },
      { id: uid(), resourceId: "ebike",     owner: "a", allDay: false, start: "07:30", end: "08:15", repeat: "weekly", weekday: 1, note: "Pendeln" },
      { id: uid(), resourceId: "ebike",     owner: "a", allDay: false, start: "07:30", end: "08:15", repeat: "weekly", weekday: 3, note: "Pendeln" },
      { id: uid(), resourceId: "ebike",     owner: "a", allDay: false, start: "07:30", end: "08:15", repeat: "weekly", weekday: 4, note: "Pendeln" },
      { id: uid(), resourceId: "auto",      owner: "b", allDay: false, start: "18:00", end: "22:00", repeat: "weekly", weekday: 2, note: "Fußball" },
      { id: uid(), resourceId: "gassi",     owner: "a", allDay: false, start: "07:00", end: "07:30", repeat: "weekly", weekday: 0, note: "Morgenrunde" },
      { id: uid(), resourceId: "gassi",     owner: "b", allDay: false, start: "18:30", end: "19:15", repeat: "weekly", weekday: 0, note: "Abendrunde" },
      { id: uid(), resourceId: "gassi",     owner: "a", allDay: false, start: "07:00", end: "07:30", repeat: "weekly", weekday: 2, note: "Morgenrunde" },
      { id: uid(), resourceId: "gassi",     owner: "b", allDay: false, start: "07:00", end: "07:30", repeat: "weekly", weekday: 4, note: "Morgenrunde" },
      { id: uid(), resourceId: "parkplatz", owner: "b", allDay: true,  start: "00:00", end: "23:59", repeat: "weekly", weekday: 0, note: "Homeoffice" },
      { id: uid(), resourceId: "parkplatz", owner: "b", allDay: true,  start: "00:00", end: "23:59", repeat: "weekly", weekday: 4, note: "Homeoffice" },
      // Einmalige Termine dieser Woche
      { id: uid(), resourceId: "auto",      owner: "a", allDay: false, start: "08:00", end: "12:00", repeat: "none", date: "2025-07-16", note: "Zur Arbeit" },
      { id: uid(), resourceId: "auto",      owner: "b", allDay: false, start: "10:00", end: "13:00", repeat: "none", date: "2025-07-16", note: "Werkstatt" }, // Konflikt heute
      { id: uid(), resourceId: "wohnung",   owner: "a", allDay: false, start: "19:00", end: "23:00", repeat: "none", date: "2025-07-17", note: "Mädelsabend" },
      { id: uid(), resourceId: "auto",      owner: "b", allDay: false, start: "10:00", end: "13:00", repeat: "none", date: "2025-07-19", note: "Wocheneinkauf" },
      { id: uid(), resourceId: "wohnung",   owner: "b", allDay: false, start: "14:00", end: "18:00", repeat: "none", date: "2025-07-20", note: "Zocken mit Tim" },
      { id: uid(), resourceId: "ebike",     owner: "b", allDay: false, start: "17:00", end: "19:00", repeat: "none", date: "2025-07-17", note: "Tour am See" }
    ];
    return d;
  }

  function scenario(name) {
    return name === "empty" ? emptyData() : name === "many" ? manyData() : fullData();
  }

  function person(id) { return COUPLE[id]; }
  function resMapOf(resources) { var m = {}; (resources || []).forEach(function (r) { m[r.id] = r; }); return m; }

  function dateLabel() { return WEEKDAYS_LONG[weekdayIdx(TODAY)] + ", " + TODAY.getDate() + ". " + MONTHS[TODAY.getMonth()]; }

  window.TG = {
    COUPLE: COUPLE, VIEWER: VIEWER, RESOURCES: RESOURCES,
    WEEKDAYS: WEEKDAYS, WEEKDAYS_LONG: WEEKDAYS_LONG, MONTHS: MONTHS,
    TODAY: TODAY, uid: uid, person: person, resMapOf: resMapOf, dateLabel: dateLabel,
    toMin: toMin, fromMin: fromMin, iso: iso, weekdayIdx: weekdayIdx, fmtDay: fmtDay,
    sameDate: sameDate, addDays: addDays, weekDates: weekDates,
    rangeLabel: rangeLabel, startMin: startMin,
    occursOn: occursOn, expandWeek: expandWeek, onDate: onDate,
    nextOccurrence: nextOccurrence, nextLabel: nextLabel,
    overlaps: overlaps, conflictsOn: conflictsOn, scenario: scenario
  };
})();
