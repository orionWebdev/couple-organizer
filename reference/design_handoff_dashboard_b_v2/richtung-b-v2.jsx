/* Richtung B · v2 — konsolidiert nach Feedback.
   · Finanz-Karte = Budget-Ring + Paar-Split + „zuletzt bezahlt" in EINER Karte
   · Haushalt = Fairness-Waage · Belegung = Regal → Wochenkalender
   · Einkauf entfällt auf dem Dashboard
   · 5. Nav-Tab „Planung" mit eigener Bereichsfarbe --planung (Blau)
   global React, TG, TG_UI, PlanungTab */
(function () {
  const { useState, useEffect } = React;
  const { COUPLE, TODAY, dateLabel, onDate, resMapOf, person, expandWeek, weekDates, weekdayIdx, WEEKDAYS, conflictsOn } = TG;
  const { StatusBar, Header, ResIcon, Avatar, Toast, StateSwitcher, BelegungScreen, SettingsSheet } = TG_UI;

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const eur = n => n.toLocaleString("de-DE", { minimumFractionDigits: (n % 1 ? 2 : 0), maximumFractionDigits: 2 });

  function useMount(delay) {
    const [on, setOn] = useState(false);
    useEffect(() => { const id = setTimeout(() => setOn(true), reduce ? 0 : (delay || 60)); return () => clearTimeout(id); }, []);
    return on;
  }
  function useCountUp(target, run, dur) {
    const [v, setV] = useState(reduce ? target : 0);
    useEffect(() => {
      if (!run) return; if (reduce) { setV(target); return; }
      let raf, t0; const d = dur || 900;
      const step = t => { if (!t0) t0 = t; const p = Math.min(1, (t - t0) / d); const e = 1 - Math.pow(1 - p, 3); setV(target * e); if (p < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
    }, [target, run]);
    return v;
  }

  // ── Telefon mit umschaltbarer Bereichsfarbe ────────────────────────
  const AREA = {
    start:    { cls: "area-dashboard", color: "var(--dashboard)" },
    haushalt: { cls: "area-haushalt",  color: "var(--haushalt)" },
    planung:  { cls: "area-planung",   color: "var(--planung)" },
    finanzen: { cls: "area-finanzen",  color: "var(--finanzen)" },
    essen:    { cls: "",               color: "var(--food)", style: { "--accent": "var(--food)", "--accent-hover": "var(--food)", "--accent-tint": "var(--food-tint)" } }
  };
  function PhoneV2({ tab, children }) {
    const a = AREA[tab] || AREA.start;
    return (
      <div style={{ width: 364, height: 744, background: "#1c1a17", borderRadius: 54, padding: 12, boxShadow: "0 30px 70px rgba(60,45,30,0.30)", flexShrink: 0 }}>
        <div className={a.cls} style={Object.assign({ position: "relative", width: "100%", height: "100%", background: "var(--bg)", borderRadius: 42, overflow: "hidden", display: "flex", flexDirection: "column" }, a.style || {})}>
          {children}
        </div>
      </div>
    );
  }

  // ── 5-Tab-Nav mit Bubble (Bereichsfarbe je Tab) ────────────────────
  const TABS = [
    { id: "start", e: "🏠", l: "Start", color: "var(--dashboard)" },
    { id: "haushalt", e: "🧽", l: "Haushalt", color: "var(--haushalt)" },
    { id: "planung", e: "🗓️", l: "Planung", color: "var(--planung)" },
    { id: "finanzen", e: "💶", l: "Finanzen", color: "var(--finanzen)" },
    { id: "essen", e: "🍽️", l: "Essen", color: "var(--food)" }
  ];
  function Nav5({ active, onNav }) {
    const idx = Math.max(0, TABS.findIndex(t => t.id === active));
    const slotPct = (100 / 5) * (idx + 0.5);
    return (
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 88, zIndex: 30 }}>
        <div style={{ position: "absolute", left: 10, right: 10, bottom: 12, height: 58, display: "flex", background: "var(--surface)", borderRadius: 24, boxShadow: "var(--shadow-float)" }}>
          {TABS.map((t, i) => (
            <button key={t.id} onClick={() => onNav(t.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, border: "none", background: "none", cursor: "pointer" }}>
              <span style={{ fontSize: 16, visibility: i === idx ? "hidden" : "visible" }}>{t.e}</span>
              <span style={{ fontSize: 8.5, fontWeight: 800, color: i === idx ? t.color : "var(--text-faint)" }}>{t.l}</span>
            </button>
          ))}
          <span style={{ position: "absolute", top: 9, left: slotPct + "%", width: 52, height: 52, borderRadius: "50%", background: "var(--surface)", transform: "translate(-50%,-50%)", transition: reduce ? "none" : "left .42s var(--ease-overshoot)" }}></span>
          <span style={{ position: "absolute", top: 9, left: slotPct + "%", width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: "50%", background: TABS[idx].color, color: "#fff", fontSize: 20, transform: "translate(-50%,-50%)", boxShadow: "0 8px 16px rgba(30,20,10,0.24)", transition: reduce ? "none" : "left .42s var(--ease-overshoot), background .3s ease" }}>{TABS[idx].e}</span>
        </div>
      </div>
    );
  }

  // ── Essen-Hero (Fokus) ─────────────────────────────────────────────
  function MealHero({ meal, setCook }) {
    if (!meal) return <div style={{ background: "var(--surface)", border: "1.5px dashed var(--border)", borderRadius: "var(--radius-card-lg)", padding: 18, textAlign: "center", color: "var(--text-meta)", fontWeight: 700 }}>Heute noch nichts geplant 🍽️</div>;
    return (
      <div style={{ background: "linear-gradient(180deg, var(--food-tint), var(--surface))", border: "1px solid color-mix(in srgb, var(--food) 22%, transparent)", borderRadius: "var(--radius-card-lg)", padding: 17, boxShadow: "var(--shadow-card)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <ResIcon emoji={meal.emoji} size={52} bg="var(--food)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--food)", textTransform: "uppercase", letterSpacing: 0.5 }}>Heute Abend</div>
            <div style={{ fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 21, lineHeight: 1.1 }}>{meal.title}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-meta)", marginTop: 1 }}>🕒 {meal.min} Min · 4 Zutaten</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 14 }}>
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 800 }}>Wer kocht?</span>
          {["a", "b", "both"].map(v => {
            const on = meal.cook === v, c = v === "both" ? "var(--food)" : COUPLE[v].color;
            return <button key={v} onClick={() => setCook(v)} style={{ cursor: "pointer", padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 800, border: "1.5px solid " + (on ? c : "var(--border-soft)"), background: on ? c : "var(--surface)", color: on ? "#fff" : "var(--text-secondary)" }}>{v === "both" ? "Beide" : COUPLE[v].name}</button>;
          })}
        </div>
      </div>
    );
  }

  // ── Finanz-Karte: Ring + Paar-Split + zuletzt bezahlt ──────────────
  function FinanceCard({ f, onOpen, flash }) {
    const run = useMount(120);
    const [settled, setSettled] = useState(false);
    const remain = f.budget != null ? f.budget - f.spent : 0;
    const remainAnim = useCountUp(remain, run && f.budget != null, 1000);
    const debtAnim = useCountUp(settled ? 0 : f.debt, run || settled, 700);
    const R = 46, C = 2 * Math.PI * R;
    const spentPct = f.budget ? f.spent / f.budget : 0;
    const monthPct = 16 / 31, over = Math.round((spentPct - monthPct) * 100);
    const danger = spentPct > 0.9;

    if (f.budget == null)
      return <button onClick={onOpen} style={{ width: "100%", cursor: "pointer", background: "var(--surface)", border: "1.5px dashed var(--border)", borderRadius: "var(--radius-card)", padding: 16, display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 20 }}>💶</span><span style={{ fontWeight: 800, fontSize: 14, color: "var(--text-secondary)" }}>Monatsbudget festlegen</span><span style={{ marginLeft: "auto", color: "var(--text-meta)", fontWeight: 800, fontSize: 18 }}>＋</span></button>;

    const paidA = useCountUp(f.paid.a, run, 900), paidB = useCountUp(f.paid.b, run, 900);
    const shareA = f.paid.a / (f.paid.a + f.paid.b);
    return (
      <div onClick={onOpen} style={{ cursor: "pointer", background: "var(--finanzen-tint)", border: "1px solid var(--border-softer)", borderRadius: "var(--radius-card)", padding: 15 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
            <svg viewBox="0 0 108 108" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
              <circle cx="54" cy="54" r={R} fill="none" stroke="var(--surface)" strokeWidth="11" />
              <circle cx="54" cy="54" r={R} fill="none" stroke={danger ? "var(--danger)" : "var(--finanzen)"} strokeWidth="11" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - (run ? spentPct : 0))} style={{ transition: reduce ? "none" : "stroke-dashoffset 1.1s var(--ease-standard)" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--text-meta)", textTransform: "uppercase" }}>noch</span>
              <span className="mono" style={{ fontSize: 20, color: danger ? "var(--danger)" : "var(--text)", lineHeight: 1 }}>{Math.round(remainAnim)} €</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 15 }}>Finanzen</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-meta)" }}>· {f.month}</span>
            </div>
            <span className="mono" style={{ fontSize: 13, color: "var(--text-secondary)" }}>{f.spent} € / {f.budget} €</span>
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", color: over > 5 ? "var(--danger)" : "var(--success)", background: over > 5 ? "var(--danger-tint)" : "var(--success-tint)", padding: "3px 8px", borderRadius: 999 }}>{over > 5 ? "▲ " + over + " % über Tempo" : "im Plan"}</span>
            </div>
            {f.lastPayment &&
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9 }}>
                <Avatar id={f.lastPayment.by} size={18} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>zuletzt · {f.lastPayment.what} <b className="mono">{eur(f.lastPayment.amount)} €</b></span>
              </div>}
          </div>
        </div>

        {/* Paar-Split */}
        <div style={{ marginTop: 13, paddingTop: 13, borderTop: "1px solid var(--border-softer)" }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 9 }}>
            {["a", "b"].map(k => (
              <div key={k} style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                  <Avatar id={k} size={17} /><span style={{ fontSize: 11.5, fontWeight: 800 }}>{person(k).name}</span>
                  <span className="mono" style={{ marginLeft: "auto", fontSize: 12, color: person(k).color }}>{eur(Math.round(k === "a" ? paidA : paidB))} €</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "var(--surface)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: (run ? (k === "a" ? shareA : 1 - shareA) * 100 : 0) + "%", background: person(k).color, borderRadius: 999, marginLeft: k === "b" ? "auto" : 0, transition: reduce ? "none" : "width .9s var(--ease-standard)" }}></div>
                </div>
              </div>
            ))}
          </div>
          {f.debt > 0 &&
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", background: "var(--surface)", borderRadius: 12 }}>
              <span style={{ fontSize: 15 }}>⚖️</span>
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 800, color: "var(--text-secondary)" }}>
                {settled ? "Ausgeglichen 🎉" : <>{person(f.debtFrom).name} schuldet {person(f.debtTo).name} <span className="mono" style={{ color: person(f.debtTo).color, whiteSpace: "nowrap" }}>{eur(debtAnim)} €</span></>}
              </span>
              {!settled && <button onClick={e => { e.stopPropagation(); setSettled(true); flash && flash("Ausgeglichen 🎉"); }} style={{ cursor: "pointer", border: "none", borderRadius: 10, background: "var(--finanzen)", color: "#fff", fontWeight: 800, fontSize: 11.5, padding: "7px 12px" }}>Ausgleichen</button>}
            </div>}
        </div>
      </div>
    );
  }

  // ── Haushalt-Fairness-Waage ────────────────────────────────────────
  function HaushaltCard({ onDone, flash }) {
    const run = useMount(160);
    const [done, setDone] = useState({ a: 3, b: 5 });
    const total = done.a + done.b, shareA = total ? done.a / total : 0.5;
    return (
      <div style={{ background: "var(--haushalt-tint)", border: "1px solid var(--border-softer)", borderRadius: "var(--radius-card)", padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
          <span style={{ fontSize: 15 }}>🧽</span>
          <span style={{ flex: 1, fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 14 }}>Haushalt · diese Woche</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-meta)" }}>2 offen ›</span>
        </div>
        <div style={{ display: "flex", height: 30, borderRadius: 10, overflow: "hidden", background: "var(--surface)" }}>
          <div style={{ width: (run ? shareA * 100 : 50) + "%", background: COUPLE.a.color, display: "flex", alignItems: "center", paddingLeft: 9, color: "#fff", fontWeight: 800, fontSize: 12, transition: reduce ? "none" : "width .9s var(--ease-overshoot)" }}>{done.a}</div>
          <div style={{ flex: 1, background: COUPLE.b.color, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 9, color: "#fff", fontWeight: 800, fontSize: 12 }}>{done.b}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 9 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-secondary)" }}>{done.b > done.a ? person("b").name + " trägt gerade mehr" : done.a > done.b ? person("a").name + " trägt gerade mehr" : "genau fair ✨"}</span>
          <button onClick={() => { setDone(d => ({ a: d.a + 1, b: d.b })); flash && flash("Für " + person("a").name + " abgehakt ✓"); }} style={{ cursor: "pointer", border: "none", borderRadius: 9, background: "var(--surface)", color: "var(--haushalt)", fontWeight: 800, fontSize: 11.5, padding: "7px 12px" }}>✓ Bad putzen</button>
        </div>
      </div>
    );
  }

  // ── Belegung-Regal (öffnet Wochenkalender) ─────────────────────────
  function BelegungShelf({ data, onOpen }) {
    const run = useMount(80);
    const week = weekDates(0), byDay = expandWeek(data.bookings, week);
    const total = byDay.reduce((n, l) => n + l.length, 0);
    const todayIdx = weekdayIdx(TODAY), rm = resMapOf(data.resources.length ? data.resources : TG.RESOURCES);
    const todayList = onDate(data.bookings, TODAY);
    const conflict = todayList.some(bk => conflictsOn(bk, data.bookings, TODAY).length > 0);
    const next = todayList[0];
    return (
      <button onClick={onOpen} style={{ width: "100%", textAlign: "left", cursor: "pointer", background: "var(--surface)", border: "1px solid var(--border-softer)", borderRadius: "var(--radius-card)", padding: 14, boxShadow: "var(--shadow-card)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <ResIcon emoji="🗓️" size={26} bg="var(--planung-tint)" />
          <span style={{ flex: 1, fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 14 }}>Belegung</span>
          {conflict && <span style={{ fontSize: 11, fontWeight: 800, color: "var(--danger)", background: "var(--danger-tint)", padding: "3px 8px", borderRadius: 999 }}>⚠ heute</span>}
          <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--planung)" }}>{total} diese Woche ›</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {week.map((date, day) => {
            const list = byDay[day], isToday = day === todayIdx;
            return (
              <div key={day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "5px 0", borderRadius: 9, background: isToday ? "var(--planung-tint)" : "transparent" }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: isToday ? "var(--planung)" : "var(--text-faint)" }}>{WEEKDAYS[day]}</span>
                <span style={{ display: "flex", flexDirection: "column", gap: 2, height: 22, alignItems: "center" }}>
                  {list.slice(0, 3).map((bk, i) => <span key={bk.id} style={{ width: 6, height: 6, borderRadius: "50%", background: person(bk.owner).color, transform: run ? "scale(1)" : "scale(0)", transition: "transform .3s var(--ease-overshoot) " + (day * 25 + i * 40) + "ms" }}></span>)}
                  {list.length > 3 && <span style={{ fontSize: 7.5, color: "var(--text-faint)", fontWeight: 800 }}>+{list.length - 3}</span>}
                </span>
              </div>
            );
          })}
        </div>
        {next
          ? <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, paddingTop: 11, borderTop: "1px solid var(--border-softer)" }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: "var(--text-meta)", textTransform: "uppercase", letterSpacing: 0.4 }}>Als Nächstes</span>
              <span style={{ flex: 1 }}></span>
              <span style={{ fontSize: 15 }}>{(rm[next.resourceId] || {}).emoji}</span>
              <span className="mono" style={{ fontSize: 13 }}>{next.allDay ? "ganztägig" : next.start}</span>
              {next.repeat === "weekly" && <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-meta)" }}>↻</span>}
              <Avatar id={next.owner} size={22} />
            </div>
          : <div style={{ marginTop: 11, paddingTop: 11, borderTop: "1px solid var(--border-softer)", fontSize: 12.5, fontWeight: 700, color: "var(--text-meta)" }}>Heute nichts belegt.</div>}
      </button>
    );
  }

  function Stub({ label, emoji }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "0 30px", gap: 8 }}>
        <div style={{ width: 68, height: 68, borderRadius: 20, background: "var(--accent-tint)", display: "grid", placeItems: "center", fontSize: 32 }}>{emoji}</div>
        <div style={{ fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 20, color: "var(--accent)" }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", lineHeight: 1.45 }}>Im Prototyp nicht ausgebaut — hier läge die {label}-Seite. Der Tab zeigt die eigene Bereichsfarbe.</div>
      </div>
    );
  }

  // ── App-Shell ──────────────────────────────────────────────────────
  function Inner({ scenarioName, toast, setToast }) {
    const [data, setData] = useState(() => TG.scenario(scenarioName));
    const [tab, setTab] = useState("start");
    const [screen, setScreen] = useState(null); // 'belegung' | 'settings' | 'reise'
    const [reiseId, setReiseId] = useState(null);
    const flash = m => setToast(m);
    const isEmpty = scenarioName === "empty";

    function setCook(v) { setData(d => Object.assign({}, d, { meal: Object.assign({}, d.meal, { cook: v }) })); }
    function addBooking(bk, c) { setData(d => Object.assign({}, d, { bookings: d.bookings.concat([bk]) })); flash(c ? "Eingetragen — mit Überschneidung ⚠" : "Belegung eingetragen ✓"); }
    function delBooking(id) { setData(d => Object.assign({}, d, { bookings: d.bookings.filter(b => b.id !== id) })); flash("Gelöscht"); }
    function addResource(r) { setData(d => Object.assign({}, d, { resources: d.resources.concat([r]) })); flash(r.emoji + " " + r.name + " angelegt"); }
    function mutPlan(fn) { setData(d => Object.assign({}, d, { planung: fn(d.planung || { ideen: [], reisen: [], notizen: [] }) })); }
    const addIdea = i => mutPlan(p => Object.assign({}, p, { ideen: p.ideen.concat([i]) }));
    const toggleIdea = id => mutPlan(p => Object.assign({}, p, { ideen: p.ideen.map(x => x.id === id ? Object.assign({}, x, { done: !x.done }) : x) }));
    const addReise = t => mutPlan(p => Object.assign({}, p, { reisen: p.reisen.concat([{ id: "r" + Date.now(), title: t, when: "offen", emoji: "🧳", todos: [], programm: [], notiz: "" }]) }));
    const mutReise = (id, fn) => mutPlan(p => Object.assign({}, p, { reisen: p.reisen.map(r => r.id === id ? fn(r) : r) }));
    const toggleTodo = (id, tid) => mutReise(id, r => Object.assign({}, r, { todos: (r.todos || []).map(t => t.id === tid ? Object.assign({}, t, { done: !t.done }) : t) }));
    const addTodo = (id, text) => mutReise(id, r => Object.assign({}, r, { todos: (r.todos || []).concat([{ id: "t" + Date.now(), text: text, done: false }]) }));
    const addProgramm = (id, text) => mutReise(id, r => Object.assign({}, r, { programm: (r.programm || []).concat([{ id: "p" + Date.now(), text: text }]) }));
    const setNotiz = (id, text) => mutReise(id, r => Object.assign({}, r, { notiz: text }));
    const delReise = id => { mutPlan(p => Object.assign({}, p, { reisen: p.reisen.filter(r => r.id !== id) })); setScreen(null); flash("Reise gelöscht"); };
    const addNotiz = t => mutPlan(p => Object.assign({}, p, { notizen: p.notizen.concat([{ id: "n" + Date.now(), text: t }]) }));

    const headerFor = {
      start: { title: "Moin, ihr zwei 👋", sub: dateLabel() },
      planung: { title: "Planung", sub: "Belegung · Ideen · Reisen" },
      haushalt: { title: "Haushalt", sub: "Aufgaben teilen" },
      finanzen: { title: "Finanzen", sub: "Gemeinsam im Blick" },
      essen: { title: "Essen", sub: "Was kommt auf den Tisch?" }
    }[tab];

    return (
      <PhoneV2 tab={tab}>
        <StatusBar />
        <Header title={headerFor.title} sub={headerFor.sub} onSettings={() => setScreen("settings")} />

        <div style={{ flex: 1, overflowY: "auto", padding: tab === "start" || tab === "planung" ? "8px 20px 108px" : "0 0 88px" }}>
          {tab === "start" &&
            (isEmpty
              ? <EmptyStart onEssen={() => flash("Essensplan öffnet sich …")} onPlanung={() => setTab("planung")} onBudget={() => flash("Budget-Sheet öffnet sich …")} />
              : <>
                  <div className="section-label" style={{ margin: "0 0 9px" }}>Jetzt im Fokus</div>
                  <MealHero meal={data.meal} setCook={setCook} />
                  <div className="section-label" style={{ margin: "20px 0 9px" }}>Auf einen Blick</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <FinanceCard f={data.finance} onOpen={() => setTab("finanzen")} flash={flash} />
                    <BelegungShelf data={data} onOpen={() => setScreen("belegung")} />
                    <HaushaltCard flash={flash} />
                  </div>
                </>)}

          {tab === "planung" &&
            <PlanungTab data={data} flash={flash} onOpenBelegung={() => setScreen("belegung")}
              onOpenReise={r => { setReiseId(r.id); setScreen("reise"); }}
              onAddIdea={addIdea} onToggleIdea={toggleIdea} onAddReise={addReise} onAddNotiz={addNotiz} />}

          {tab === "haushalt" && <Stub label="Haushalt" emoji="🧽" />}
          {tab === "finanzen" && <Stub label="Finanzen" emoji="💶" />}
          {tab === "essen" && <Stub label="Essen" emoji="🍽️" />}
        </div>

        <Nav5 active={tab} onNav={setTab} />
        <Toast msg={toast} />

        {screen === "belegung" &&
          <BelegungScreen resources={data.resources.length ? data.resources : TG.RESOURCES} bookings={data.bookings}
            onClose={() => setScreen(null)} onSubmit={addBooking} onDelete={delBooking} />}
        {screen === "settings" &&
          <SettingsSheet resources={data.resources} bookings={data.bookings} onAddResource={addResource} onClose={() => setScreen(null)} />}
        {screen === "reise" && window.ReiseDetail &&
          React.createElement(window.ReiseDetail, {
            reise: (data.planung && data.planung.reisen || []).find(r => r.id === reiseId),
            onClose: () => setScreen(null),
            onToggleTodo: toggleTodo, onAddTodo: addTodo, onAddProgramm: addProgramm,
            onSetNotiz: setNotiz, onDelete: delReise
          })}
      </PhoneV2>
    );
  }

  function EmptyStart({ onEssen, onPlanung, onBudget }) {
    const steps = [
      { e: "🍽️", t: "Essen für heute planen", on: onEssen },
      { e: "🗓️", t: "Ressource & Belegung anlegen", on: onPlanung },
      { e: "💶", t: "Monatsbudget setzen", on: onBudget }
    ];
    return (
      <div style={{ paddingTop: 4 }}>
        <div style={{ background: "linear-gradient(180deg, var(--dashboard-tint), var(--surface))", border: "1px solid var(--border-softer)", borderRadius: "var(--radius-card-lg)", padding: "22px 20px", boxShadow: "var(--shadow-card)" }}>
          <div style={{ fontSize: 40 }}>👋</div>
          <div style={{ fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 21, marginTop: 4 }}>Willkommen bei TwoDo</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.45 }}>Drei kleine Schritte, dann füllt sich euer Zuhause.</div>
        </div>
        <div className="section-label" style={{ margin: "22px 0 10px" }}>Einrichten · 0 / 3</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {steps.map((s, i) => (
            <button key={i} onClick={s.on} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", cursor: "pointer", textAlign: "left", padding: "13px 15px", borderRadius: "var(--radius-card)", border: "1px solid var(--border-softer)", background: "var(--surface)", boxShadow: "var(--shadow-card)" }}>
              <span style={{ width: 34, height: 34, borderRadius: "50%", border: "2px solid var(--border)", display: "grid", placeItems: "center", fontSize: 17 }}>{s.e}</span>
              <span style={{ flex: 1, fontWeight: 800, fontSize: 14.5 }}>{s.t}</span>
              <span style={{ color: "var(--accent)", fontWeight: 800, fontSize: 18 }}>›</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function App() {
    const [scenarioName, setScenario] = useState("full");
    const [toast, setToast] = useState(null);
    useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 1900); return () => clearTimeout(id); }, [toast]);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <StateSwitcher value={scenarioName} onChange={v => { setToast(null); setScenario(v); }} />
        <Inner key={scenarioName} scenarioName={scenarioName} toast={toast} setToast={setToast} />
      </div>
    );
  }

  window.RichtungBv2 = App;
})();
