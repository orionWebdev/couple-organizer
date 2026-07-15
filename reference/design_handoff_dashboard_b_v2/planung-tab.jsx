/* Planung-Tab (neuer 5. Nav-Punkt) — Bereichsfarbe --planung (Blau).
   Bündelt: Belegung von Ressourcen · Bucketlist als Ideen-Sammlung
   (Filme, Restaurants, Date-Ideen) · Reisen/Ausflüge · Notizen.
   global React, TG, TG_UI */
(function () {
  const { useState } = React;
  const { person, WEEKDAYS, weekDates, expandWeek, onDate, weekdayIdx, TODAY, resMapOf, conflictsOn, COUPLE } = TG;
  const { ResIcon, Avatar, Sheet, StatusBar } = TG_UI;

  const CATS = {
    film:  { e: "🎬", l: "Filme & Serien" },
    essen: { e: "🍜", l: "Essen gehen" },
    date:  { e: "✨", l: "Date-Ideen" }
  };

  function SectionCard({ icon, title, count, action, children }) {
    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--border-softer)", borderRadius: "var(--radius-card)", padding: 15, boxShadow: "var(--shadow-card)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
          <ResIcon emoji={icon} size={28} bg="var(--accent-tint)" />
          <span style={{ flex: 1, fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 16 }}>{title}</span>
          {count != null && <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--accent)", background: "var(--accent-tint)", padding: "2px 9px", borderRadius: 999 }}>{count}</span>}
          {action}
        </div>
        {children}
      </div>
    );
  }

  // ── Belegung-Zusammenfassung (öffnet Wochenkalender) ───────────────
  function BelegungBlock({ data, onOpen }) {
    const week = weekDates(0);
    const byDay = expandWeek(data.bookings, week);
    const total = byDay.reduce((n, l) => n + l.length, 0);
    const todayIdx = weekdayIdx(TODAY);
    const rm = resMapOf(data.resources.length ? data.resources : TG.RESOURCES);
    const next = onDate(data.bookings, TODAY)[0];
    return (
      <SectionCard icon="🗓️" title="Belegung" count={total + " diese Woche"}
        action={<button onClick={onOpen} style={{ cursor: "pointer", border: "none", background: "var(--accent)", color: "#fff", borderRadius: 999, fontWeight: 800, fontSize: 11.5, padding: "6px 12px" }}>Kalender ›</button>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {week.map((date, day) => {
            const list = byDay[day], isToday = day === todayIdx;
            return (
              <button key={day} onClick={onOpen} style={{ cursor: "pointer", border: "none", background: isToday ? "var(--accent-tint)" : "transparent", borderRadius: 9, padding: "6px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: isToday ? "var(--accent)" : "var(--text-faint)" }}>{WEEKDAYS[day]}</span>
                <span style={{ fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 13, color: isToday ? "var(--accent)" : "var(--text)" }}>{date.getDate()}</span>
                <span style={{ display: "flex", flexDirection: "column", gap: 2, height: 20, alignItems: "center" }}>
                  {list.slice(0, 3).map(bk => <span key={bk.id} style={{ width: 6, height: 6, borderRadius: "50%", background: person(bk.owner).color }}></span>)}
                  {list.length > 3 && <span style={{ fontSize: 7.5, fontWeight: 800, color: "var(--text-faint)" }}>+{list.length - 3}</span>}
                </span>
              </button>
            );
          })}
        </div>
        {next &&
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11, paddingTop: 11, borderTop: "1px solid var(--border-softer)" }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: "var(--text-meta)", textTransform: "uppercase", letterSpacing: 0.4 }}>Als Nächstes</span>
            <span style={{ flex: 1 }}></span>
            <span style={{ fontSize: 15 }}>{(rm[next.resourceId] || {}).emoji}</span>
            <span className="mono" style={{ fontSize: 13 }}>{next.allDay ? "ganztägig" : next.start}</span>
            <Avatar id={next.owner} size={22} />
          </div>}
      </SectionCard>
    );
  }

  // ── Ideen (Bucketlist) ─────────────────────────────────────────────
  function IdeenBlock({ ideen, onToggle, onDelete, onAdd, flash }) {
    const [filter, setFilter] = useState("all");
    const list = ideen.filter(i => filter === "all" || i.cat === filter);
    const open = ideen.filter(i => !i.done).length;
    return (
      <SectionCard icon="💡" title="Ideen für uns" count={open + " offen"}
        action={<button onClick={onAdd} style={{ cursor: "pointer", border: "none", background: "var(--accent)", color: "#fff", borderRadius: "50%", width: 28, height: 28, fontSize: 16, lineHeight: 1 }}>＋</button>}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {[["all", "Alle"]].concat(Object.keys(CATS).map(k => [k, CATS[k].e + " " + CATS[k].l])).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ cursor: "pointer", borderRadius: 999, padding: "5px 11px", fontSize: 11.5, fontWeight: 800, border: "1px solid " + (filter === k ? "var(--accent)" : "var(--border-soft)"), background: filter === k ? "var(--accent-tint)" : "var(--surface)", color: filter === k ? "var(--accent)" : "var(--text-secondary)" }}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {list.map(i => (
            <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: i.done ? "var(--surface-deep)" : "var(--surface)", border: "1px solid var(--border-softer)", borderRadius: "var(--radius-tile)", opacity: i.done ? 0.6 : 1 }}>
              <button onClick={() => onToggle(i.id)} style={{ cursor: "pointer", width: 22, height: 22, borderRadius: 7, flexShrink: 0, border: i.done ? "none" : "2px solid var(--border)", background: i.done ? "var(--success)" : "var(--surface)", color: "#fff", fontWeight: 900, fontSize: 13, display: "grid", placeItems: "center" }}>{i.done ? "✓" : ""}</button>
              <span style={{ fontSize: 15 }}>{CATS[i.cat].e}</span>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, textDecoration: i.done ? "line-through" : "none" }}>{i.title}</span>
              <Avatar id={i.by} size={20} />
            </div>
          ))}
          {list.length === 0 && <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-meta)", padding: "4px 2px" }}>Noch keine Idee hier — tippt ＋.</div>}
        </div>
      </SectionCard>
    );
  }

  // ── Reisen & Notizen ────────────────────────────────────────────────
  function ReisenBlock({ reisen, onAdd, onOpen }) {
    return (
      <SectionCard icon="🧳" title="Reisen & Ausflüge" count={reisen.length}
        action={<button onClick={onAdd} style={{ cursor: "pointer", border: "none", background: "var(--accent)", color: "#fff", borderRadius: "50%", width: 28, height: 28, fontSize: 16, lineHeight: 1 }}>＋</button>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {reisen.map(r => {
            const todos = r.todos || [], open = todos.filter(t => !t.done).length;
            return (
              <button key={r.id} onClick={() => onOpen && onOpen(r)} style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left", cursor: "pointer", border: "1px solid var(--border-softer)", padding: "9px 11px", background: "var(--surface-deep)", borderRadius: "var(--radius-tile)" }}>
                <span style={{ fontSize: 20 }}>{r.emoji}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 800, fontSize: 14 }}>{r.title}</span>
                  {todos.length > 0 && <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--text-meta)" }}>{open > 0 ? open + " To-dos offen" : "alles erledigt ✓"}</span>}
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--accent)", background: "var(--accent-tint)", padding: "3px 9px", borderRadius: 999 }}>{r.when}</span>
                <span style={{ color: "var(--text-faint)", fontWeight: 800, fontSize: 15 }}>›</span>
              </button>
            );
          })}
          {reisen.length === 0 && <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-meta)", padding: "4px 2px" }}>Wohin als Nächstes? Tippt ＋.</div>}
        </div>
      </SectionCard>
    );
  }

  function NotizenBlock({ notizen, onAdd }) {
    return (
      <SectionCard icon="📝" title="Notizen" count={notizen.length}
        action={<button onClick={onAdd} style={{ cursor: "pointer", border: "none", background: "var(--accent)", color: "#fff", borderRadius: "50%", width: 28, height: 28, fontSize: 16, lineHeight: 1 }}>＋</button>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {notizen.map(n => (
            <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "9px 11px", background: "var(--surface-deep)", borderRadius: "var(--radius-tile)" }}>
              <span style={{ color: "var(--accent)", fontWeight: 900, marginTop: 1 }}>·</span>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, lineHeight: 1.4 }}>{n.text}</span>
            </div>
          ))}
          {notizen.length === 0 && <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-meta)", padding: "4px 2px" }}>Nichts notiert.</div>}
        </div>
      </SectionCard>
    );
  }

  // ── Add-Sheets ──────────────────────────────────────────────────────
  function AddIdeaSheet({ onSubmit, onClose }) {
    const [cat, setCat] = useState("film");
    const [title, setTitle] = useState("");
    const [by, setBy] = useState(TG.VIEWER);
    return (
      <Sheet onClose={onClose} title="Neue Idee" sub="Was wollt ihr mal machen?">
        <div className="section-label" style={{ marginBottom: 7 }}>Kategorie</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {Object.keys(CATS).map(k => (
            <button key={k} onClick={() => setCat(k)} style={{ flex: 1, cursor: "pointer", borderRadius: 11, padding: "10px 4px", fontSize: 12, fontWeight: 800, border: "1px solid " + (cat === k ? "var(--accent)" : "var(--border-soft)"), background: cat === k ? "var(--accent-tint)" : "var(--surface)", color: cat === k ? "var(--accent)" : "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 18 }}>{CATS[k].e}</span>{CATS[k].l}
            </button>
          ))}
        </div>
        <div className="section-label" style={{ marginBottom: 7 }}>Was?</div>
        <input className="app-field" placeholder="z. B. neuer Tarantino-Film" value={title} onChange={e => setTitle(e.target.value)} style={{ marginBottom: 14 }} />
        <div className="section-label" style={{ marginBottom: 7 }}>Von wem?</div>
        <div style={{ display: "flex", gap: 4, background: "var(--surface-deep)", padding: 4, borderRadius: 12, marginBottom: 16 }}>
          {["a", "b"].map(k => (
            <button key={k} onClick={() => setBy(k)} style={{ flex: 1, cursor: "pointer", border: "none", borderRadius: 9, padding: "9px 6px", fontWeight: 700, fontSize: 13, background: by === k ? person(k).color : "transparent", color: by === k ? "#fff" : "var(--text-secondary)" }}>{person(k).name}</button>
          ))}
        </div>
        <button className="btn-primary" disabled={!title.trim()} onClick={() => onSubmit({ id: "i" + Date.now(), cat, title: title.trim(), by, done: false })}>Idee merken</button>
      </Sheet>
    );
  }

  function QuickAddSheet({ title, placeholder, onSubmit, onClose }) {
    const [text, setText] = useState("");
    return (
      <Sheet onClose={onClose} title={title}>
        <input className="app-field" placeholder={placeholder} value={text} onChange={e => setText(e.target.value)} style={{ marginBottom: 16 }} />
        <button className="btn-primary" disabled={!text.trim()} onClick={() => onSubmit(text.trim())}>Hinzufügen</button>
      </Sheet>
    );
  }

  // ── Planung-Tab (Inhalt) ────────────────────────────────────────────
  function PlanungTab({ data, onOpenBelegung, onOpenReise, onAddIdea, onToggleIdea, onAddReise, onAddNotiz, flash }) {
    const [sheet, setSheet] = useState(null); // 'idea' | 'reise' | 'notiz'
    const p = data.planung || { ideen: [], reisen: [], notizen: [] };
    const empty = p.ideen.length === 0 && p.reisen.length === 0 && p.notizen.length === 0 && data.bookings.length === 0;
    return (
      <>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <BelegungBlock data={data} onOpen={onOpenBelegung} />
          {empty
            ? <div style={{ textAlign: "center", padding: "22px 16px", background: "var(--surface)", border: "1px solid var(--border-softer)", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)" }}>
                <div style={{ fontSize: 38 }}>🗺️</div>
                <div style={{ fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 18, marginTop: 4 }}>Was habt ihr vor?</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginTop: 3, lineHeight: 1.45 }}>Belegungen, Ideen, Reisen und Notizen sammeln sich hier.</div>
                <button onClick={() => setSheet("idea")} style={{ marginTop: 14, cursor: "pointer", border: "none", background: "var(--accent)", color: "#fff", borderRadius: 12, fontWeight: 800, fontSize: 13.5, padding: "11px 20px" }}>＋ Erste Idee</button>
              </div>
            : <>
                <IdeenBlock ideen={p.ideen} onToggle={onToggleIdea} onAdd={() => setSheet("idea")} flash={flash} />
                <ReisenBlock reisen={p.reisen} onAdd={() => setSheet("reise")} onOpen={onOpenReise} />
                <NotizenBlock notizen={p.notizen} onAdd={() => setSheet("notiz")} />
              </>}
        </div>

        {sheet === "idea" && <AddIdeaSheet onClose={() => setSheet(null)} onSubmit={i => { onAddIdea(i); setSheet(null); flash && flash("Idee gemerkt 💡"); }} />}
        {sheet === "reise" && <QuickAddSheet title="Neue Reise / Ausflug" placeholder="z. B. Städtetrip Kopenhagen" onClose={() => setSheet(null)} onSubmit={t => { onAddReise(t); setSheet(null); flash && flash("Reise gemerkt 🧳"); }} />}
        {sheet === "notiz" && <QuickAddSheet title="Neue Notiz" placeholder="Kurz festhalten …" onClose={() => setSheet(null)} onSubmit={t => { onAddNotiz(t); setSheet(null); flash && flash("Notiz gespeichert 📝"); }} />}
      </>
    );
  }

  // ── Inline-Hinzufügen (Textfeld + ＋) ───────────────────────────────
  function InlineAdd({ placeholder, onAdd }) {
    const [t, setT] = useState("");
    function go() { const v = t.trim(); if (!v) return; onAdd(v); setT(""); }
    return (
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input className="app-field" placeholder={placeholder} value={t} onChange={e => setT(e.target.value)} onKeyDown={e => { if (e.key === "Enter") go(); }} style={{ flex: 1, padding: "10px 13px", fontSize: 13.5 }} />
        <button onClick={go} disabled={!t.trim()} style={{ flexShrink: 0, cursor: t.trim() ? "pointer" : "default", border: "none", borderRadius: 11, width: 44, background: t.trim() ? "var(--accent)" : "var(--border-soft)", color: "#fff", fontSize: 20, lineHeight: 1 }}>＋</button>
      </div>
    );
  }

  // ══ Reise-Detail (eigenes Fenster) ═════════════════════════════════
  function ReiseDetail({ reise, onClose, onToggleTodo, onAddTodo, onAddProgramm, onSetNotiz, onDelete }) {
    if (!reise) return null;
    const todos = reise.todos || [], programm = reise.programm || [];
    const openTodos = todos.filter(t => !t.done).length;
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 46, background: "var(--bg)", display: "flex", flexDirection: "column", animation: "tgpush .28s var(--ease-standard)" }}>
        <StatusBar />
        <div style={{ padding: "6px 20px 10px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid var(--border-soft)", background: "var(--surface)", cursor: "pointer", fontSize: 18, display: "grid", placeItems: "center", color: "var(--text-secondary)" }}>‹</button>
            <span style={{ fontSize: 26 }}>{reise.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 20, lineHeight: 1.05 }}>{reise.title}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>📅 {reise.when}</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* To-dos / Buchen */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-softer)", borderRadius: "var(--radius-card)", padding: 15, boxShadow: "var(--shadow-card)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 15 }}>🧳</span>
              <span style={{ flex: 1, fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 15 }}>Packen &amp; Buchen</span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--accent)", background: "var(--accent-tint)", padding: "2px 9px", borderRadius: 999 }}>{openTodos} offen</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {todos.map(t => (
                <button key={t.id} onClick={() => onToggleTodo(reise.id, t.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", cursor: "pointer", border: "none", background: "none", padding: "5px 2px" }}>
                  <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 7, border: t.done ? "none" : "2px solid var(--border)", background: t.done ? "var(--success)" : "var(--surface)", color: "#fff", fontWeight: 900, fontSize: 13, display: "grid", placeItems: "center" }}>{t.done ? "✓" : ""}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--text-meta)" : "var(--text)" }}>{t.text}</span>
                </button>
              ))}
            </div>
            <InlineAdd placeholder="z. B. Reiseapotheke einpacken" onAdd={v => onAddTodo(reise.id, v)} />
          </div>

          {/* Programm & Ideen */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-softer)", borderRadius: "var(--radius-card)", padding: 15, boxShadow: "var(--shadow-card)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 15 }}>✨</span>
              <span style={{ flex: 1, fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 15 }}>Programm &amp; Ideen</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {programm.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "7px 11px", background: "var(--surface-deep)", borderRadius: "var(--radius-tile)" }}>
                  <span style={{ color: "var(--accent)", fontWeight: 900, marginTop: 1 }}>›</span>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{p.text}</span>
                </div>
              ))}
              {programm.length === 0 && <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-meta)", padding: "2px" }}>Noch keine Idee — was wollt ihr vor Ort machen?</div>}
            </div>
            <InlineAdd placeholder="z. B. Käse-Markt besuchen" onAdd={v => onAddProgramm(reise.id, v)} />
          </div>

          {/* Notizen */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-softer)", borderRadius: "var(--radius-card)", padding: 15, boxShadow: "var(--shadow-card)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 15 }}>📝</span>
              <span style={{ flex: 1, fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 15 }}>Notizen</span>
            </div>
            <textarea className="app-field" rows={3} placeholder="Gemeinsam festhalten …" value={reise.notiz || ""} onChange={e => onSetNotiz(reise.id, e.target.value)} style={{ resize: "none", lineHeight: 1.5 }} />
          </div>

          <button onClick={() => onDelete(reise.id)} style={{ cursor: "pointer", padding: 13, borderRadius: 14, border: "1px solid var(--danger-border)", background: "var(--surface)", color: "var(--danger)", fontWeight: 800, fontSize: 14 }}>Reise löschen</button>
        </div>
      </div>
    );
  }

  window.PlanungTab = PlanungTab;
  window.ReiseDetail = ReiseDetail;
})();
