/* Together — Redesign · gemeinsame Bausteine (Phone, Nav, Sheets, Belegung-Screen)
   global React, TG */
(function () {
  const { useState, useEffect } = React;
  const {
    COUPLE, VIEWER, WEEKDAYS, WEEKDAYS_LONG, MONTHS, TODAY,
    person, resMapOf, dateLabel, rangeLabel, iso, weekdayIdx, weekDates,
    expandWeek, onDate, conflictsOn, nextLabel, uid, addDays
  } = TG;

  // ── Kleinteile ────────────────────────────────────────────────────
  function Avatar({ id, size }) {
    const p = person(id);
    return <span style={{ width: size, height: size, borderRadius: "50%", background: p.color, color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: Math.round(size * 0.42), flexShrink: 0 }}>{p.initial}</span>;
  }
  function ResIcon({ emoji, size, bg }) {
    size = size || 34;
    return <span style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), flexShrink: 0, background: bg || "var(--surface-deep)", display: "grid", placeItems: "center", fontSize: Math.round(size * 0.5) }}>{emoji}</span>;
  }

  function StatusBar() {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 24px 2px", fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 13, color: "var(--text)", flexShrink: 0 }}>
        <span>9:41</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 11 }}>
            {[4, 6, 8, 11].map((h, i) => <i key={i} style={{ width: 3, height: h, background: "var(--text)", borderRadius: 1 }}></i>)}
          </span>
          <span style={{ width: 22, height: 11, border: "1.5px solid var(--text)", borderRadius: 3, position: "relative" }}>
            <span style={{ position: "absolute", inset: 1.5, right: "35%", background: "var(--text)", borderRadius: 1 }}></span>
          </span>
        </span>
      </div>
    );
  }

  // Header: Begrüßung + Datum + Avatar-Stapel (einziger Zugang zu Einstellungen)
  function Header({ title, sub, onSettings, children }) {
    return (
      <div style={{ padding: "8px 20px 6px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 24, lineHeight: 1.08, color: "var(--text)" }}>{title}</div>
            {sub && <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginTop: 2 }}>{sub}</div>}
          </div>
          <button onClick={onSettings} aria-label="Einstellungen" style={{ display: "flex", border: "none", background: "none", padding: 0, cursor: "pointer", marginLeft: 10 }}>
            <span style={{ border: "2px solid var(--bg)", borderRadius: "50%", lineHeight: 0 }}><Avatar id="a" size={34} /></span>
            <span style={{ border: "2px solid var(--bg)", borderRadius: "50%", lineHeight: 0, marginLeft: -12 }}><Avatar id="b" size={34} /></span>
          </button>
        </div>
        {children}
      </div>
    );
  }

  // Bottom-Nav mit überstehender Bubble
  function BottomNav({ active }) {
    active = active || "start";
    const tabs = [
      { id: "start", e: "🏠", l: "Start" },
      { id: "haushalt", e: "🧽", l: "Haushalt" },
      { id: "finanzen", e: "💶", l: "Finanzen" },
      { id: "essen", e: "🍽️", l: "Essen" }
    ];
    const idx = Math.max(0, tabs.findIndex(t => t.id === active));
    const slotPct = (100 / 4) * (idx + 0.5);
    return (
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 88, pointerEvents: "none", zIndex: 30 }}>
        <div style={{ position: "absolute", left: 12, right: 12, bottom: 12, height: 58, display: "flex", background: "var(--surface)", borderRadius: 24, boxShadow: "var(--shadow-float)", pointerEvents: "auto" }}>
          {tabs.map((t, i) => (
            <div key={t.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
              <span style={{ fontSize: 17, visibility: i === idx ? "hidden" : "visible" }}>{t.e}</span>
              <span style={{ fontSize: 9, fontWeight: 800, color: i === idx ? "var(--accent)" : "var(--text-faint)" }}>{t.l}</span>
            </div>
          ))}
          <span style={{ position: "absolute", top: 9, left: slotPct + "%", width: 54, height: 54, borderRadius: "50%", background: "var(--surface)", transform: "translate(-50%,-50%)" }}></span>
          <span style={{ position: "absolute", top: 9, left: slotPct + "%", width: 48, height: 48, display: "grid", placeItems: "center", borderRadius: "50%", background: "var(--accent)", color: "#fff", fontSize: 21, transform: "translate(-50%,-50%)", boxShadow: "0 8px 16px rgba(30,20,10,0.24)" }}>{tabs[idx].e}</span>
        </div>
      </div>
    );
  }

  // Bottom-Sheet
  function Sheet({ onClose, children, title, sub }) {
    return (
      <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(44,40,35,0.34)", display: "flex", alignItems: "flex-end", animation: "tgfade .2s ease" }}>
        <div onClick={e => e.stopPropagation()} className="tgsheet"
          style={{ width: "100%", background: "var(--surface)", borderRadius: "var(--radius-sheet) var(--radius-sheet) 0 0", padding: "10px 20px calc(22px + var(--safe-bottom))", maxHeight: "90%", overflowY: "auto", boxShadow: "0 -8px 30px rgba(60,45,30,0.20)" }}>
          <div style={{ width: 40, height: 4, borderRadius: 999, background: "var(--border)", margin: "0 auto 14px" }}></div>
          {title &&
            <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 21 }}>{title}</div>
                {sub && <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 1 }}>{sub}</div>}
              </div>
              <button onClick={onClose} style={{ marginLeft: "auto", width: 32, height: 32, borderRadius: "50%", border: "none", background: "var(--surface-deep)", color: "var(--text-secondary)", fontSize: 17, cursor: "pointer" }}>✕</button>
            </div>}
          {children}
        </div>
      </div>
    );
  }

  function Toast({ msg }) {
    if (!msg) return null;
    return <div style={{ position: "absolute", left: "50%", bottom: 150, transform: "translateX(-50%)", background: "var(--text)", color: "#fff", padding: "10px 18px", borderRadius: 999, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", zIndex: 60, boxShadow: "var(--shadow-float)", animation: "tgpop .25s var(--ease-overshoot)" }}>{msg}</div>;
  }

  function Segmented({ options, value, onChange, colorMap }) {
    return (
      <div style={{ display: "flex", gap: 4, background: "var(--surface-deep)", padding: 4, borderRadius: 12 }}>
        {options.map(o => {
          const active = o.value === value;
          const c = colorMap && colorMap[o.value];
          return (
            <button key={o.value} onClick={() => onChange(o.value)}
              style={{ flex: 1, cursor: "pointer", border: "none", borderRadius: 9, padding: "9px 6px", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 13, background: active ? (c || "var(--accent)") : "transparent", color: active ? "var(--on-accent)" : "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background .15s" }}>
              {o.icon && <span>{o.icon}</span>}{o.label}
            </button>
          );
        })}
      </div>
    );
  }

  // ── Belegungs-Zeile (aufgelöster, konkreter Termin) ────────────────
  function BookingRow({ bk, resource, conflict, onClick, compact }) {
    const p = person(bk.owner);
    return (
      <button onClick={() => onClick && onClick(bk)}
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", cursor: "pointer",
          padding: compact ? "8px 11px" : "10px 13px", borderRadius: "var(--radius-tile)", marginBottom: 6,
          background: "var(--surface)", border: conflict ? "1.5px solid var(--danger)" : "1px solid var(--border-softer)",
          borderLeft: "3px solid " + (conflict ? "var(--danger)" : p.color) }}>
        <ResIcon emoji={resource ? resource.emoji : "•"} size={compact ? 30 : 34} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="mono" style={{ fontSize: compact ? 12.5 : 13.5, color: "var(--text)" }}>{rangeLabel(bk)}</span>
            {bk.repeat === "weekly" && <span style={{ fontSize: 11, color: "var(--text-meta)", fontWeight: 800 }}>↻</span>}
            {conflict && <span style={{ fontSize: 11.5, color: "var(--danger)", fontWeight: 800 }}>⚠</span>}
          </span>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
            {(resource ? resource.name : "") + (bk.note ? " · " + bk.note : "")}
          </span>
        </span>
        <Avatar id={bk.owner} size={24} />
      </button>
    );
  }

  function AddRow({ onClick, label }) {
    return (
      <button onClick={onClick} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", cursor: "pointer", padding: 12, borderRadius: "var(--radius-tile)", border: "1.5px dashed var(--border)", background: "transparent", color: "var(--text-meta)", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 13 }}>
        <span style={{ fontSize: 15, lineHeight: 1 }}>＋</span>{label || "Belegung anlegen"}
      </button>
    );
  }

  // ── Neue-Belegung-Sheet (ohne Anfrage-Flow: wer einträgt, hat eingetragen) ──
  function NewBookingSheet({ resources, bookings, onSubmit, onClose, presetDay }) {
    const [draft, setDraft] = useState(() => ({
      resourceId: (resources[0] || { id: "auto" }).id, owner: VIEWER,
      weekday: presetDay != null ? presetDay : weekdayIdx(TODAY),
      allDay: false, start: "09:00", end: "11:00", repeat: "none", note: ""
    }));
    function set(k, v) { setDraft(d => Object.assign({}, d, { [k]: v })); }
    const res = resMapOf(resources)[draft.resourceId] || resources[0];
    // Datum dieser Woche für den gewählten Wochentag (nur für Einmalig relevant)
    const thisWeek = weekDates(0);
    const probeDate = thisWeek[draft.weekday];
    const probe = { id: "__new", resourceId: draft.resourceId, allDay: draft.allDay, start: draft.start, end: draft.end,
      repeat: draft.repeat, weekday: draft.weekday, date: iso(probeDate) };
    const conflicts = conflictsOn(probe, bookings, probeDate);
    const hasConflict = conflicts.length > 0;

    function submit() {
      const base = { id: uid(), resourceId: draft.resourceId, owner: draft.owner, allDay: draft.allDay,
        start: draft.start, end: draft.end, repeat: draft.repeat, note: draft.note.trim() || (res ? res.name : "") };
      if (draft.repeat === "weekly") base.weekday = draft.weekday;
      else base.date = iso(probeDate);
      onSubmit(base, hasConflict);
    }

    const field = { marginBottom: 14 };
    const lbl = { marginBottom: 7 };
    return (
      <Sheet onClose={onClose} title="Neue Belegung" sub="Was, wann und wer">
        <div style={field}>
          <div className="section-label" style={lbl}>Ressource</div>
          <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2 }}>
            {resources.map(r => {
              const on = r.id === draft.resourceId;
              return <button key={r.id} onClick={() => set("resourceId", r.id)}
                style={{ flexShrink: 0, cursor: "pointer", borderRadius: 11, padding: "8px 12px", fontWeight: 700, fontSize: 13, border: "1px solid " + (on ? "var(--accent)" : "var(--border-soft)"), background: on ? "var(--accent-tint)" : "var(--surface)", color: on ? "var(--accent)" : "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                <span>{r.emoji}</span>{r.name}</button>;
            })}
          </div>
        </div>

        <div style={field}>
          <div className="section-label" style={lbl}>Wer</div>
          <Segmented value={draft.owner} onChange={v => set("owner", v)}
            colorMap={{ a: COUPLE.a.color, b: COUPLE.b.color }}
            options={[{ value: "a", label: COUPLE.a.name, icon: "🟠" }, { value: "b", label: COUPLE.b.name, icon: "🔵" }]} />
        </div>

        <div style={field}>
          <div className="section-label" style={lbl}>{draft.repeat === "weekly" ? "Jeden …" : "Tag (diese Woche)"}</div>
          <div style={{ display: "flex", gap: 5 }}>
            {WEEKDAYS.map((wd, i) => {
              const on = i === draft.weekday;
              return <button key={i} onClick={() => set("weekday", i)}
                style={{ flex: 1, cursor: "pointer", borderRadius: 10, padding: "9px 0", fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 12.5, border: "1px solid " + (on ? "var(--accent)" : "var(--border-soft)"), background: on ? "var(--accent)" : "var(--surface)", color: on ? "var(--on-accent)" : "var(--text-secondary)" }}>{wd}</button>;
            })}
          </div>
        </div>

        <div style={field}>
          <div className="section-label" style={lbl}>Zeit</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: draft.allDay ? 0 : 10 }}>
            <span style={{ fontSize: 13.5, color: "var(--text-secondary)", fontWeight: 700 }}>Ganztägig</span>
            <button onClick={() => set("allDay", !draft.allDay)} style={{ width: 46, height: 27, borderRadius: 999, border: "none", cursor: "pointer", position: "relative", background: draft.allDay ? "var(--accent)" : "var(--border)", transition: "background .18s" }}>
              <span style={{ position: "absolute", top: 3, left: draft.allDay ? 22 : 3, width: 21, height: 21, borderRadius: "50%", background: "#fff", transition: "left .18s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }}></span>
            </button>
          </div>
          {!draft.allDay &&
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="time" className="app-field" value={draft.start} onChange={e => set("start", e.target.value)} style={{ flex: 1, fontFamily: "var(--font-headline)" }} />
              <span style={{ color: "var(--text-meta)", fontWeight: 700 }}>–</span>
              <input type="time" className="app-field" value={draft.end} onChange={e => set("end", e.target.value)} style={{ flex: 1, fontFamily: "var(--font-headline)" }} />
            </div>}
        </div>

        <div style={field}>
          <div className="section-label" style={lbl}>Wiederholung</div>
          <Segmented value={draft.repeat} onChange={v => set("repeat", v)}
            options={[{ value: "none", label: "Einmalig" }, { value: "weekly", label: "Wöchentlich ↻" }]} />
        </div>

        <div style={field}>
          <div className="section-label" style={lbl}>Notiz — wofür?</div>
          <input className="app-field" placeholder="z. B. Zur Arbeit, Einkauf …" value={draft.note} onChange={e => set("note", e.target.value)} />
        </div>

        {hasConflict &&
          <div style={{ display: "flex", gap: 9, alignItems: "flex-start", background: "var(--danger-tint)", border: "1px solid var(--danger-border)", borderRadius: 12, padding: "11px 13px", marginBottom: 14 }}>
            <span style={{ fontSize: 15 }}>⚠</span>
            <span style={{ fontSize: 12.5, color: "var(--danger)", fontWeight: 700, lineHeight: 1.45 }}>
              Überschneidet sich mit {conflicts.map(c => person(c.owner).name + " (" + rangeLabel(c) + ")").join(", ")}. Wird trotzdem eingetragen.
            </span>
          </div>}

        <button className="btn-primary" onClick={submit}>{hasConflict ? "Trotzdem eintragen" : "Eintragen"}</button>
        <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--text-faint)", fontWeight: 700, marginTop: 10 }}>Wer einträgt, hat eingetragen — kein Bestätigen nötig.</div>
      </Sheet>
    );
  }

  // ── Detail-Sheet einer Belegung ────────────────────────────────────
  function BookingDetailSheet({ bk, resource, onDelete, onClose }) {
    const p = person(bk.owner);
    return (
      <Sheet onClose={onClose}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <span style={{ marginRight: 12 }}><ResIcon emoji={resource.emoji} size={44} bg={p.tint} /></span>
          <div>
            <div style={{ fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 20 }}>{resource.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
              {bk.repeat === "weekly" ? "↻ jeden " + WEEKDAYS_LONG[bk.weekday] : "einmalig"} · {rangeLabel(bk)}
            </div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", width: 32, height: 32, borderRadius: "50%", border: "none", background: "var(--surface-deep)", color: "var(--text-secondary)", fontSize: 17, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: p.tint, borderRadius: 14, marginBottom: 8 }}>
          <Avatar id={bk.owner} size={30} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text)" }}>{p.name}{bk.note ? " · " + bk.note : ""}</div>
            {bk.repeat === "weekly" && <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-meta)" }}>Nächster Termin: {nextLabel(bk, TODAY)}</div>}
          </div>
        </div>
        <button onClick={onDelete} style={{ width: "100%", marginTop: 8, cursor: "pointer", padding: 13, borderRadius: 14, border: "1px solid var(--danger-border)", background: "var(--surface)", color: "var(--danger)", fontWeight: 800, fontSize: 14 }}>Belegung löschen</button>
        {bk.repeat === "weekly" && <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--text-faint)", fontWeight: 700, marginTop: 10 }}>Löscht die ganze Serie.</div>}
      </Sheet>
    );
  }

  // ── Einstellungen (nur über Avatar-Stapel erreichbar) ──────────────
  function SettingsSheet({ resources, bookings, onClose, onAddResource }) {
    const EMOJI = ["🚗", "🚲", "🅿️", "🐕", "🏠", "🛴", "🎸", "🎮", "🧺", "🛥️"];
    const [name, setName] = useState("");
    const [emoji, setEmoji] = useState("🛴");
    const counts = {};
    bookings.forEach(b => { counts[b.resourceId] = (counts[b.resourceId] || 0) + 1; });
    return (
      <Sheet onClose={onClose} title="Einstellungen" sub="Ressourcen & Paar">
        <div className="section-label" style={{ marginBottom: 8 }}>Ressourcen · {resources.length}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          {resources.length === 0 && <div style={{ fontSize: 13, color: "var(--text-meta)", fontWeight: 700, padding: "6px 2px" }}>Noch keine Ressourcen — legt euer erstes geteiltes Ding an.</div>}
          {resources.map(r => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "var(--surface-deep)", borderRadius: 12 }}>
              <ResIcon emoji={r.emoji} size={30} bg="var(--surface)" />
              <span style={{ flex: 1, fontWeight: 800, fontSize: 14 }}>{r.name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-meta)" }}>{counts[r.id] || 0} Belegungen</span>
            </div>
          ))}
        </div>
        <div className="section-label" style={{ marginBottom: 8 }}>Neue Ressource</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {EMOJI.map(e => (
            <button key={e} onClick={() => setEmoji(e)} style={{ width: 40, height: 40, borderRadius: 11, cursor: "pointer", fontSize: 19, border: "2px solid " + (e === emoji ? "var(--accent)" : "var(--border-soft)"), background: e === emoji ? "var(--accent-tint)" : "var(--surface)" }}>{e}</button>
          ))}
        </div>
        <input className="app-field" placeholder="Name — z. B. Anhänger" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 12 }} />
        <button className="btn-primary" disabled={!name.trim()} onClick={() => { onAddResource({ id: "r" + Date.now(), name: name.trim(), emoji: emoji }); setName(""); }}>Ressource anlegen</button>
        <div className="section-label" style={{ margin: "18px 0 8px" }}>Paar</div>
        <div style={{ display: "flex", gap: 8 }}>
          {["a", "b"].map(k => (
            <div key={k} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: person(k).tint, borderRadius: 12 }}>
              <Avatar id={k} size={28} /><span style={{ fontWeight: 800, fontSize: 14 }}>{person(k).name}</span>
            </div>
          ))}
        </div>
      </Sheet>
    );
  }

  // ══ Dedizierter Belegung-Screen (Vollbild-Overlay im Telefon) ══════
  // Zeigt eine Woche als Grid + Tages-Detail + Serien-Liste (jede Serie EINMAL,
  // mit berechnetem nächsten Termin). Zeithorizont = 1 Woche → immer begrenzt.
  function BelegungScreen({ resources, bookings, onClose, onSubmit, onDelete, accent }) {
    const [offset, setOffset] = useState(0);
    const [selDay, setSelDay] = useState(weekdayIdx(TODAY));
    const [sheet, setSheet] = useState(null); // {type:'new',day} | {type:'view',id}
    const week = weekDates(offset);
    const rm = resMapOf(resources);
    const byDay = expandWeek(bookings, week);
    const isCurrentWeek = offset === 0;
    const todayIdx = isCurrentWeek ? weekdayIdx(TODAY) : -1;
    const series = bookings.filter(b => b.repeat === "weekly");
    // Serien pro Ressource+Wochentag+Zeit einmalig (Duplikate im Seed zusammenfassen)
    const seenSeries = {};
    const uniqueSeries = series.filter(b => { const k = b.resourceId + b.weekday + b.start + b.owner; if (seenSeries[k]) return false; seenSeries[k] = 1; return true; });

    const selList = byDay[selDay] || [];
    const active = sheet && sheet.type === "view" ? bookings.find(b => b.id === sheet.id) : null;
    const kw = (() => { const t = new Date(week[0]); t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7)); const w1 = new Date(t.getFullYear(), 0, 4); return 1 + Math.round(((t - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7); })();

    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 45, background: "var(--bg)", display: "flex", flexDirection: "column", animation: "tgpush .28s var(--ease-standard)" }}>
        <StatusBar />
        <div style={{ padding: "6px 20px 8px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid var(--border-soft)", background: "var(--surface)", cursor: "pointer", fontSize: 18, display: "grid", placeItems: "center", color: "var(--text-secondary)" }}>‹</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 22, lineHeight: 1.05 }}>Belegung</div>
              <div style={{ fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 600 }}>Geteilte Ressourcen · ganze Woche</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
            <button onClick={() => setOffset(o => o - 1)} style={navBtn}>‹</button>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 14 }}>KW {kw}</div>
              <div style={{ fontSize: 11, color: "var(--text-meta)", fontWeight: 700 }}>{week[0].getDate()}. – {week[6].getDate()}. {MONTHS[week[6].getMonth()]}</div>
            </div>
            <button onClick={() => setOffset(o => o + 1)} style={navBtn}>›</button>
          </div>
          {!isCurrentWeek &&
            <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
              <button onClick={() => { setOffset(0); setSelDay(weekdayIdx(TODAY)); }} style={{ cursor: "pointer", border: "none", background: "var(--accent-tint)", color: "var(--accent)", fontWeight: 800, fontSize: 12, padding: "6px 14px", borderRadius: 999 }}>↩ Heute · aktuelle KW</button>
            </div>}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 110px" }}>
          {/* Wochen-Grid */}
          <div className="card" style={{ padding: 10, marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
              {week.map((date, day) => {
                const list = byDay[day];
                const sel = day === selDay, isToday = day === todayIdx;
                return (
                  <button key={day} onClick={() => setSelDay(day)} style={{ cursor: "pointer", borderRadius: 11, padding: "6px 1px 7px", border: "1.5px solid " + (sel ? "var(--accent)" : "transparent"), background: sel ? "var(--accent-tint)" : "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--text-meta)" }}>{WEEKDAYS[day]}</span>
                    <span style={{ width: 26, height: 26, display: "grid", placeItems: "center", borderRadius: "50%", background: isToday ? "var(--accent)" : "transparent", fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 14.5, color: isToday ? "var(--on-accent)" : sel ? "var(--accent)" : "var(--text)" }}>{date.getDate()}</span>
                    <span style={{ display: "flex", gap: 2, height: 6, alignItems: "center" }}>
                      {list.slice(0, 3).map(bk => <span key={bk.id} style={{ width: 5, height: 5, borderRadius: "50%", background: person(bk.owner).color }}></span>)}
                      {list.length > 3 && <span style={{ fontSize: 8, color: "var(--text-faint)", fontWeight: 800 }}>+{list.length - 3}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tages-Detail */}
          <div className="card" style={{ padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 17 }}>{WEEKDAYS_LONG[selDay]}</span>
              <span style={{ fontSize: 12, color: "var(--text-meta)", fontWeight: 700 }}>{week[selDay].getDate()}. {MONTHS[week[selDay].getMonth()]}</span>
            </div>
            {selList.length === 0
              ? <AddRow onClick={() => setSheet({ type: "new", day: selDay })} label="frei — Belegung anlegen" />
              : <div>
                  {selList.map(bk => <BookingRow key={bk.id} bk={bk} resource={rm[bk.resourceId]} conflict={conflictsOn(bk, bookings, week[selDay]).length > 0} onClick={b => setSheet({ type: "view", id: b.id })} />)}
                  <AddRow onClick={() => setSheet({ type: "new", day: selDay })} label="hinzufügen" />
                </div>}
          </div>

          {/* Serien — jede Regel EINMAL, mit nächstem Termin */}
          {uniqueSeries.length > 0 &&
            <div className="card" style={{ padding: 14 }}>
              <div className="section-label" style={{ marginBottom: 10 }}>↻ Serien · {uniqueSeries.length}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {uniqueSeries.map(bk => {
                  const p = person(bk.owner), r = rm[bk.resourceId];
                  return (
                    <button key={bk.id} onClick={() => setSheet({ type: "view", id: bk.id })} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", cursor: "pointer", padding: "9px 11px", borderRadius: "var(--radius-tile)", background: "var(--surface-deep)", border: "none", borderLeft: "3px solid " + p.color }}>
                      <ResIcon emoji={r ? r.emoji : "•"} size={30} bg="var(--surface)" />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontWeight: 800, fontSize: 13.5 }}>{r ? r.name : ""} · jeden {WEEKDAYS_LONG[bk.weekday]}</span>
                        <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", fontWeight: 700 }}>Nächster: {nextLabel(bk, TODAY)}</span>
                      </span>
                      <Avatar id={bk.owner} size={22} />
                    </button>
                  );
                })}
              </div>
            </div>}
        </div>

        <button onClick={() => setSheet({ type: "new", day: selDay })} style={{ position: "absolute", right: 18, bottom: 26, width: 56, height: 56, borderRadius: "50%", border: "none", cursor: "pointer", background: "var(--accent)", color: "#fff", fontSize: 28, boxShadow: "var(--shadow-float)", display: "grid", placeItems: "center", zIndex: 20 }}>＋</button>

        {sheet && sheet.type === "new" &&
          <NewBookingSheet resources={resources} bookings={bookings} presetDay={sheet.day}
            onSubmit={(bk, c) => { onSubmit(bk, c); setSheet(null); }} onClose={() => setSheet(null)} />}
        {active &&
          <BookingDetailSheet bk={active} resource={rm[active.resourceId]}
            onDelete={() => { onDelete(active.id); setSheet(null); }} onClose={() => setSheet(null)} />}
      </div>
    );
  }

  const navBtn = { width: 34, height: 34, borderRadius: 10, border: "1px solid var(--border-soft)", background: "var(--surface)", color: "var(--text-secondary)", fontSize: 18, cursor: "pointer", flexShrink: 0, fontFamily: "var(--font-headline)" };

  // ── Szenario-Umschalter + Telefon-Rahmen ───────────────────────────
  function StateSwitcher({ value, onChange }) {
    const opts = [{ v: "full", l: "Normalfall" }, { v: "empty", l: "Leer" }, { v: "many", l: "Volle Belegung" }];
    return (
      <div style={{ display: "flex", gap: 4, background: "#e5ddcf", padding: 4, borderRadius: 12, marginBottom: 14, width: 340 }}>
        {opts.map(o => (
          <button key={o.v} onClick={() => onChange(o.v)} style={{ flex: 1, cursor: "pointer", border: "none", borderRadius: 9, padding: "8px 4px", fontFamily: "var(--font-body)", fontWeight: 800, fontSize: 12, background: value === o.v ? "var(--surface)" : "transparent", color: value === o.v ? "var(--text)" : "#8c857b", boxShadow: value === o.v ? "0 1px 4px rgba(60,45,30,.12)" : "none", transition: "background .15s" }}>{o.l}</button>
        ))}
      </div>
    );
  }

  function Phone({ children }) {
    return (
      <div style={{ width: 364, height: 744, background: "#1c1a17", borderRadius: 54, padding: 12, boxShadow: "0 30px 70px rgba(60,45,30,0.30)", flexShrink: 0 }}>
        <div className="area-dashboard" style={{ position: "relative", width: "100%", height: "100%", background: "var(--bg)", borderRadius: 42, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </div>
    );
  }

  Object.assign(window, {
    TG_UI: {
      Avatar, ResIcon, StatusBar, Header, BottomNav, Sheet, Toast, Segmented,
      BookingRow, AddRow, NewBookingSheet, BookingDetailSheet, SettingsSheet,
      BelegungScreen, StateSwitcher, Phone
    }
  });
})();
