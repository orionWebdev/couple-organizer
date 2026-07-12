/* Belegung — vereinte Wochen-Grid-Ansicht (alle Ressourcen) + Bausteine */
/* global React, BELEG */
(function () {
  const { PEOPLE, WEEKDAYS, WEEKDAYS_LONG, rangeLabel, toMin, conflictsFor } = BELEG;
  const MONTHS = ["Jan", "Feb", "März", "Apr", "Mai", "Juni", "Juli", "Aug", "Sep", "Okt", "Nov", "Dez"];

  function person(id) { return PEOPLE[id]; }
  function scale(density) {
    return density === "kompakt"
      ? { pad: 10, gap: 6, font: 12.5, sub: 10.5 }
      : { pad: 13, gap: 8, font: 13.5, sub: 11.5 };
  }

  // ── Belegung als Zeile (mit Ressourcen-Icon) ──────────────
  function BookingRow({ bk, resource, showRepeats, conflict, onClick, s }) {
    const p = person(bk.owner);
    const pending = bk.status === "pending";
    const declined = bk.status === "declined";
    return (
      <button onClick={() => onClick && onClick(bk)}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", cursor: "pointer",
          padding: (s.pad - 3) + "px " + s.pad + "px", borderRadius: 12, marginBottom: 6,
          background: pending ? "transparent" : "var(--surface)",
          border: pending ? "1.5px dashed " + p.color : conflict ? "1.5px solid var(--danger)" : "1px solid var(--border-softer)",
          borderLeft: "3px solid " + (conflict ? "var(--danger)" : p.color),
          opacity: declined ? 0.4 : 1, textDecoration: declined ? "line-through" : "none"
        }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: "var(--surface-deep)", display: "grid", placeItems: "center", fontSize: 17 }}>{resource ? resource.emoji : "•"}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="mono" style={{ fontSize: s.font, color: "var(--text)" }}>{rangeLabel(bk)}</span>
            {showRepeats && bk.repeat === "weekly" && <span style={{ fontSize: s.sub, color: "var(--text-meta)", fontWeight: 700 }}>↻</span>}
            {conflict && <span style={{ fontSize: s.sub, color: "var(--danger)", fontWeight: 800 }}>⚠</span>}
          </span>
          <span style={{ display: "block", fontSize: s.sub + 1, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
            {(resource ? resource.name : "") + (bk.note ? " · " + bk.note : "")}
          </span>
        </span>
        {pending
          ? <span style={{ fontSize: s.sub, fontWeight: 800, color: p.color, background: p.tint, padding: "3px 8px", borderRadius: 999, flexShrink: 0 }}>angefragt</span>
          : <span style={{ width: 24, height: 24, borderRadius: "50%", background: p.color, color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 11, flexShrink: 0 }}>{p.initial}</span>}
      </button>
    );
  }

  function AddRow({ onClick, s, label }) {
    return (
      <button onClick={onClick} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", cursor: "pointer",
        padding: "12px", borderRadius: 12, border: "1.5px dashed var(--border)", background: "transparent",
        color: "var(--text-meta)", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: s.sub + 2
      }}>
        <span style={{ fontSize: 15, lineHeight: 1 }}>＋</span>{label || "Belegung anlegen"}
      </button>
    );
  }

  function dayBookings(bookings, day) {
    return bookings.filter(b => b.day === day && b.status !== "declined")
      .sort((a, b) => (a.allDay ? -1 : b.allDay ? 1 : toMin(a.start) - toMin(b.start)));
  }

  // ══ Wochen-Grid + Tages-Detail (alle Ressourcen) ══════════
  function WeekGrid({ week, bookings, allBookings, resMap, density, showRepeats, selectedDay, setSelectedDay, onAddDay, onOpenBooking, todayDay }) {
    const s = scale(density);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Grid */}
        <div className="card" style={{ padding: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
            {week.map((date, day) => {
              const list = dayBookings(bookings, day);
              const sel = day === selectedDay;
              const isToday = day === todayDay;
              return (
                <button key={day} onClick={() => setSelectedDay(day)}
                  style={{ cursor: "pointer", borderRadius: 11, padding: "6px 1px 7px", border: "1.5px solid " + (sel ? "var(--accent)" : "transparent"),
                    background: sel ? "var(--accent-tint)" : "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--text-meta)", letterSpacing: "0.2px" }}>{WEEKDAYS[day]}</span>
                  <span style={{ width: 26, height: 26, display: "grid", placeItems: "center", borderRadius: "50%", background: isToday ? "var(--accent)" : "transparent",
                    fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 14.5, color: isToday ? "var(--on-accent)" : sel ? "var(--accent)" : "var(--text)" }}>{date.getDate()}</span>
                  <span style={{ display: "flex", gap: 2, height: 6, alignItems: "center" }}>
                    {list.slice(0, 3).map(bk => (
                      <span key={bk.id} style={{ width: 5, height: 5, borderRadius: "50%", background: person(bk.owner).color, opacity: bk.status === "pending" ? 0.4 : 1 }}></span>
                    ))}
                    {list.length > 3 && <span style={{ fontSize: 8, color: "var(--text-faint)", fontWeight: 800 }}>+{list.length - 3}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tages-Detail */}
        <div className="card" style={{ padding: s.pad }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
            <span style={{ fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 17 }}>{WEEKDAYS_LONG[selectedDay]}</span>
            <span style={{ fontSize: 12, color: "var(--text-meta)", fontWeight: 700 }}>{week[selectedDay].getDate()}. {MONTHS[week[selectedDay].getMonth()]}</span>
          </div>
          {(() => {
            const list = dayBookings(bookings, selectedDay);
            return list.length === 0
              ? <AddRow onClick={() => onAddDay(selectedDay)} s={s} label="frei — Belegung anlegen" />
              : (<div>
                  {list.map(bk => (
                    <BookingRow key={bk.id} bk={bk} resource={resMap[bk.resourceId]} s={s} showRepeats={showRepeats}
                      conflict={conflictsFor(bk, allBookings).length > 0} onClick={onOpenBooking} />
                  ))}
                  <AddRow onClick={() => onAddDay(selectedDay)} s={s} label="hinzufügen" />
                </div>);
          })()}
        </div>
      </div>
    );
  }

  Object.assign(window, { WeekGrid, BookingRow });
})();
