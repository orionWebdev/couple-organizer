/* Belegung — App-Shell (Grid, alle Ressourcen, nativer Kalender, Heute, Einstellungen) */
/* global React, BELEG, WeekGrid, NewBookingSheet, BookingDetailSheet, RequestBanner, ResourceSettings, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle, BELEG_VIEWER */
(function () {
  const { useState, useEffect } = React;
  const { PEOPLE, RESOURCES, SEED, uid, weekDates, isoWeek, fmtDay } = BELEG;

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "accentArea": "bucket",
    "conflictMode": "request",
    "density": "luftig",
    "showRepeats": true
  }/*EDITMODE-END*/;

  const BASE_MONDAY = weekDates(0)[0];
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function mondayOf(d) { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); x.setHours(0, 0, 0, 0); return x; }
  function offsetFromDate(d) { return Math.round((mondayOf(d) - BASE_MONDAY) / (7 * 86400000)); }

  function StatusBar() {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px 4px", fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 13, color: "var(--text)" }}>
        <span>9:41</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 11 }}>
            <i style={{ width: 3, height: 4, background: "var(--text)", borderRadius: 1 }}></i>
            <i style={{ width: 3, height: 6, background: "var(--text)", borderRadius: 1 }}></i>
            <i style={{ width: 3, height: 8, background: "var(--text)", borderRadius: 1 }}></i>
            <i style={{ width: 3, height: 11, background: "var(--text)", borderRadius: 1 }}></i>
          </span>
          <span style={{ width: 22, height: 11, border: "1.5px solid var(--text)", borderRadius: 3, position: "relative" }}>
            <span style={{ position: "absolute", inset: 1.5, right: "35%", background: "var(--text)", borderRadius: 1 }}></span>
          </span>
        </span>
      </div>
    );
  }
  function Avatar({ p, size }) {
    return <span style={{ width: size, height: size, borderRadius: "50%", background: p.color, color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: size * 0.42 }}>{p.initial}</span>;
  }

  function App() {
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const [bookings, setBookings] = useState(() => SEED.map(b => Object.assign({}, b)));
    const [resources, setResources] = useState(() => RESOURCES.slice());
    const [offset, setOffset] = useState(0);
    const [selDay, setSelDay] = useState(0);
    const [screen, setScreen] = useState("calendar"); // calendar | settings
    const [sheet, setSheet] = useState(null);
    const [draft, setDraft] = useState(null);
    const [toast, setToast] = useState(null);

    useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 2200); return () => clearTimeout(id); }, [toast]);

    const week = weekDates(offset);
    const resMap = {}; resources.forEach(r => { resMap[r.id] = r; });
    const visible = offset === 0 ? bookings : [];
    const todayDay = offset === 0 ? 0 : -1;

    function setField(k, v) { setDraft(d => Object.assign({}, d, { [k]: v })); }
    function openNew(day) {
      setDraft({ owner: BELEG_VIEWER, resourceId: resources[0].id, day: day != null ? day : selDay, allDay: false, start: "09:00", end: "11:00", repeat: "none", note: "" });
      setSheet({ type: "new" });
    }
    function openView(bk) { setSheet({ type: "view", id: bk.id }); }
    function submit() {
      const status = t.conflictMode === "request" ? "pending" : "confirmed";
      const bk = Object.assign({ id: uid(), status: status, requestedBy: BELEG_VIEWER }, draft);
      setBookings(list => list.concat([bk]));
      setSheet(null);
      setToast(status === "pending" ? "Anfrage an Jonas gesendet 🔔" : "Belegung eingetragen ✓");
    }
    function setStatus(id, s) { setBookings(list => list.map(b => b.id === id ? Object.assign({}, b, { status: s }) : b)); }
    function confirmReq(id) { setStatus(id, "confirmed"); setSheet(null); setToast("Bestätigt ✓"); }
    function declineReq(id) { setStatus(id, "declined"); setSheet(null); setToast("Abgelehnt"); }
    function del(id) { setBookings(list => list.filter(b => b.id !== id)); setSheet(null); setToast("Gelöscht"); }

    function addResource(r) { const nid = "res" + Date.now(); setResources(rs => rs.concat([{ id: nid, name: r.name, emoji: r.emoji }])); setToast(r.emoji + " " + r.name + " angelegt"); }
    function updateResource(id, patch) { setResources(rs => rs.map(r => r.id === id ? Object.assign({}, r, patch) : r)); setToast("Gespeichert"); }
    function deleteResource(id) { setResources(rs => rs.filter(r => r.id !== id)); setBookings(bs => bs.filter(b => b.resourceId !== id)); setToast("Ressource gelöscht"); }

    function pickDate(e) { const v = e.target.value; if (!v) return; const d = new Date(v + "T00:00:00"); setOffset(offsetFromDate(d)); }

    const first = week[0], last = week[6];
    const activeBooking = sheet && sheet.type === "view" ? bookings.find(b => b.id === sheet.id) : null;
    const activeRes = sheet && sheet.type === "new" ? resMap[draft.resourceId] : null;

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: 340, height: 720, background: "#1c1a17", borderRadius: 54, padding: 12, boxShadow: "0 30px 70px rgba(60,45,30,0.30)" }}>
          <div className={"area-" + t.accentArea} style={{ position: "relative", width: "100%", height: "100%", background: "var(--bg)", borderRadius: 42, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <StatusBar />

            {/* Header */}
            <div style={{ padding: "6px 20px 10px" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 26, color: "var(--text)", lineHeight: 1.05 }}>Belegung</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>Gemeinsam nutzen · alle Ressourcen</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ display: "flex" }}><Avatar p={PEOPLE.lena} size={30} /><span style={{ marginLeft: -8 }}><Avatar p={PEOPLE.jonas} size={30} /></span></span>
                  <button onClick={() => setScreen("settings")} title="Einstellungen" style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid var(--border-soft)", background: "var(--surface)", cursor: "pointer", fontSize: 16, display: "grid", placeItems: "center" }}>⚙️</button>
                </div>
              </div>

              {/* Week nav — KW öffnet nativen Kalender */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                <button onClick={() => setOffset(o => o - 1)} style={navBtn}>‹</button>
                <label style={{ flex: 1, textAlign: "center", position: "relative", cursor: "pointer", padding: "3px 0", borderRadius: 10 }}>
                  <div style={{ fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 14, color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>KW {isoWeek(first)} <span style={{ fontSize: 11, color: "var(--accent)" }}>▾</span></div>
                  <div style={{ fontSize: 11, color: "var(--text-meta)", fontWeight: 700 }}>{fmtDay(first)} – {fmtDay(last)}</div>
                  <input type="date" value={iso(first)} onChange={pickDate}
                    style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", border: "none" }} />
                </label>
                <button onClick={() => setOffset(o => o + 1)} style={navBtn}>›</button>
              </div>
              {offset !== 0 &&
                <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                  <button onClick={() => { setOffset(0); setSelDay(0); }} style={{ cursor: "pointer", border: "none", background: "var(--accent-tint)", color: "var(--accent)", fontWeight: 800, fontSize: 12, padding: "6px 14px", borderRadius: 999 }}>↩ Heute · aktuelle KW</button>
                </div>}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 120px" }}>
              {offset === 0 && <div style={{ marginBottom: 12 }}><RequestBanner requests={bookings} resources={resources} onOpen={openView} /></div>}
              {offset !== 0 &&
                <div style={{ textAlign: "center", color: "var(--text-faint)", fontWeight: 700, fontSize: 12.5, padding: "6px 0 14px" }}>Andere Woche — tippe ＋ zum Anlegen.</div>}
              <WeekGrid week={week} bookings={visible} allBookings={bookings} resMap={resMap}
                density={t.density} showRepeats={t.showRepeats} selectedDay={selDay} setSelectedDay={setSelDay}
                onAddDay={openNew} onOpenBooking={openView} todayDay={todayDay} />
            </div>

            {/* FAB */}
            <button onClick={() => openNew()} style={{ position: "absolute", right: 18, bottom: 84, width: 56, height: 56, borderRadius: "50%", border: "none", cursor: "pointer", background: "var(--accent)", color: "#fff", fontSize: 28, lineHeight: 1, boxShadow: "var(--shadow-float)", display: "grid", placeItems: "center", zIndex: 20 }}>＋</button>

            {/* Bottom nav */}
            <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", padding: "8px 12px calc(14px + var(--safe-bottom))", background: "var(--surface)", borderTop: "1px solid var(--border-softer)", flexShrink: 0 }}>
              {[{ e: "🏠", l: "Start" }, { e: "🧽", l: "Haushalt" }, { e: "🗓️", l: "Belegung", on: true }, { e: "💶", l: "Finanzen" }].map(n => (
                <div key={n.l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, opacity: n.on ? 1 : 0.55 }}>
                  <span style={{ fontSize: 19 }}>{n.e}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: n.on ? "var(--accent)" : "var(--text-meta)" }}>{n.l}</span>
                </div>
              ))}
            </div>

            {/* Toast */}
            {toast &&
              <div style={{ position: "absolute", left: "50%", bottom: 150, transform: "translateX(-50%)", background: "var(--text)", color: "#fff", padding: "10px 18px", borderRadius: 999, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", zIndex: 60, boxShadow: "var(--shadow-float)", animation: "bfade .2s ease" }}>{toast}</div>}

            {/* Sheets */}
            {sheet && sheet.type === "new" && draft &&
              <NewBookingSheet draft={draft} setField={setField} resource={activeRes} resources={resources} allBookings={bookings}
                conflictMode={t.conflictMode} onSubmit={submit} onClose={() => setSheet(null)} onChangeResource={(id) => setField("resourceId", id)} />}
            {activeBooking &&
              <BookingDetailSheet bk={activeBooking} resource={resMap[activeBooking.resourceId]}
                onConfirm={() => confirmReq(activeBooking.id)} onDecline={() => declineReq(activeBooking.id)}
                onDelete={() => del(activeBooking.id)} onClose={() => setSheet(null)} />}

            {/* Settings screen */}
            {screen === "settings" &&
              <ResourceSettings resources={resources} bookings={bookings} onAdd={addResource} onUpdate={updateResource} onDelete={deleteResource} onClose={() => setScreen("calendar")} />}
          </div>
        </div>

        {/* Tweaks */}
        <TweaksPanel>
          <TweakSection label="Darstellung" />
          <TweakRadio label="Dichte" value={t.density} options={["luftig", "kompakt"]} onChange={v => setTweak("density", v)} />
          <TweakToggle label="Wiederholungen zeigen" value={t.showRepeats} onChange={v => setTweak("showRepeats", v)} />
          <TweakSection label="Verhalten & Farbe" />
          <TweakRadio label="Bei Konflikt" value={t.conflictMode} options={["request", "warn", "block"]} onChange={v => setTweak("conflictMode", v)} />
          <TweakRadio label="Akzent" value={t.accentArea} options={["bucket", "dashboard", "einkauf"]} onChange={v => setTweak("accentArea", v)} />
        </TweaksPanel>
      </div>
    );
  }

  const navBtn = { width: 34, height: 34, borderRadius: 10, border: "1px solid var(--border-soft)", background: "var(--surface)", color: "var(--text-secondary)", fontSize: 18, cursor: "pointer", flexShrink: 0, fontFamily: "var(--font-headline)" };

  window.BelegungApp = App;
})();
