/* Regale-Konzepte für Richtung B — ausdrucksstarke, animierte Karten.
   Frage dahinter: Wenn ein Tab-Tap eh auf die Seite führt, muss die Karte
   einen Blick liefern, den der Tap NICHT gibt. Sonst → schlanker Launcher.
   global React, TG, TG_UI */
(function () {
  const { useState, useEffect, useRef } = React;
  const { COUPLE, person } = TG;
  const { Phone, StatusBar, BottomNav, ResIcon, Avatar, Toast } = TG_UI;

  const F = TG.scenario("full").finance; // {spent:612, budget:800, month, debtFrom:'b', debtTo:'a', debt:34.5}
  const REMAIN = F.budget - F.spent;               // 188
  const SPENT_PCT = F.spent / F.budget;            // 0.765
  const MONTH_DAYS = 31, DAY = 16;
  const DAYS_LEFT = MONTH_DAYS - DAY;              // 15
  const MONTH_PCT = DAY / MONTH_DAYS;             // 0.516  → Tempo-Vergleich
  const OVER_PACE = Math.round((SPENT_PCT - MONTH_PCT) * 100); // ~+25
  const WEEKS = [180, 210, 95, 127];              // Wochenausgaben (Σ=612)
  const WEEK_BUDGET = F.budget / 4;               // 200
  // Paar-Split: Mara zahlte 69 € mehr → Ben schuldet 34,50 €
  const PAID = { a: 340.5, b: 271.5 };

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const eur = n => n.toLocaleString("de-DE", { minimumFractionDigits: (n % 1 ? 2 : 0), maximumFractionDigits: 2 });

  // ── Animations-Helfer ──────────────────────────────────────────────
  function useMount(run, delay) {
    const [on, setOn] = useState(false);
    useEffect(() => { if (!run) { setOn(false); return; } const id = setTimeout(() => setOn(true), reduce ? 0 : (delay || 40)); return () => clearTimeout(id); }, [run, delay]);
    return on;
  }
  function useCountUp(target, run, dur) {
    const [v, setV] = useState(reduce ? target : 0);
    useEffect(() => {
      if (!run) { setV(0); return; }
      if (reduce) { setV(target); return; }
      let raf, t0; const d = dur || 900;
      const step = t => { if (!t0) t0 = t; const p = Math.min(1, (t - t0) / d); const e = 1 - Math.pow(1 - p, 3); setV(target * e); if (p < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    }, [target, run, dur]);
    return v;
  }
  // Replay: Karte per key neu mounten
  function Replayable({ children }) {
    const [k, setK] = useState(0);
    return (
      <div style={{ position: "relative" }}>
        <div key={k}>{children}</div>
        <button onClick={() => setK(x => x + 1)} title="Animation abspielen"
          style={{ position: "absolute", top: -34, right: 0, cursor: "pointer", border: "1px solid var(--border-soft)", background: "var(--surface)", color: "var(--text-secondary)", borderRadius: 999, fontSize: 11, fontWeight: 800, padding: "4px 11px", boxShadow: "var(--shadow-card)" }}>↻ Abspielen</button>
      </div>
    );
  }

  // ══ FINANZEN — Behandlung 1 · Budget-Ring ══════════════════════════
  function FinRing({ compact, onTap, flash }) {
    const run = useMount(true);
    const remain = useCountUp(REMAIN, run, 1000);
    const R = 52, C = 2 * Math.PI * R;
    const danger = SPENT_PCT > 0.9;
    const arc = run ? SPENT_PCT : 0;
    const size = compact ? 108 : 128;
    return (
      <div onClick={() => onTap ? onTap() : flash && flash("Finanzen öffnen sich …")} style={{ cursor: "pointer", background: "var(--finanzen-tint)", border: "1px solid var(--border-softer)", borderRadius: "var(--radius-card)", padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
          <svg viewBox="0 0 128 128" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
            <circle cx="64" cy="64" r={R} fill="none" stroke="var(--surface)" strokeWidth="12" />
            <circle cx="64" cy="64" r={R} fill="none" stroke={danger ? "var(--danger)" : "var(--finanzen)"} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - arc)} style={{ transition: reduce ? "none" : "stroke-dashoffset 1.1s var(--ease-standard)" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: "var(--text-meta)", textTransform: "uppercase", letterSpacing: 0.4 }}>noch</span>
            <span className="mono" style={{ fontSize: 23, color: danger ? "var(--danger)" : "var(--text)", lineHeight: 1 }}>{Math.round(remain)} €</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)" }}>von {F.budget} €</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 15 }}>Finanzen · {F.month}</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-meta)", marginTop: 2 }}>{Math.round(SPENT_PCT * 100)} % ausgegeben · {DAYS_LEFT} Tage übrig</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, background: "var(--surface)", borderRadius: 999, padding: "5px 10px" }}>
            <Avatar id={F.debtTo} size={18} />
            <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--text-secondary)" }}>+{eur(F.debt)} € offen</span>
          </div>
        </div>
      </div>
    );
  }

  // ══ FINANZEN — Behandlung 2 · Verlauf & Tempo ══════════════════════
  function FinTrend({ flash }) {
    const run = useMount(true);
    const spent = useCountUp(F.spent, run, 900);
    const max = Math.max.apply(null, WEEKS.concat([WEEK_BUDGET])) * 1.1;
    const over = OVER_PACE > 5;
    return (
      <div onClick={() => flash && flash("Finanzen öffnen sich …")} style={{ cursor: "pointer", background: "var(--finanzen-tint)", border: "1px solid var(--border-softer)", borderRadius: "var(--radius-card)", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" }}>Finanzen · {F.month}</span>
          <span className="mono" style={{ fontSize: 16, whiteSpace: "nowrap" }}>{Math.round(spent)} €</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 7, marginTop: 4 }}>
          <span style={{ fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap", color: over ? "var(--danger)" : "var(--success)", background: over ? "var(--danger-tint)" : "var(--success-tint)", padding: "3px 9px", borderRadius: 999 }}>{over ? "▲ " + OVER_PACE + " % über Tempo" : "im Plan"}</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap", color: "var(--text-meta)" }}>noch {REMAIN} € · {DAYS_LEFT} Tage</span>
        </div>
        <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 10, height: 96, marginTop: 16, paddingBottom: 18 }}>
          {/* Budget-Linie */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 18 + (WEEK_BUDGET / max) * 78, borderTop: "2px dashed var(--border)", zIndex: 1 }}>
            <span style={{ position: "absolute", left: 0, top: -14, fontSize: 9.5, fontWeight: 800, color: "var(--text-faint)", background: "var(--finanzen-tint)", padding: "0 4px" }}>Ø {WEEK_BUDGET} €</span>
          </div>
          {WEEKS.map((w, i) => {
            const h = run ? (w / max) * 78 : 0;
            const hot = w > WEEK_BUDGET;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: hot ? "var(--danger)" : "var(--text-faint)", marginBottom: 3, opacity: run ? 1 : 0, transition: "opacity .5s ease .5s" }}>{w}</span>
                <div style={{ width: "78%", height: h, borderRadius: "7px 7px 0 0", background: hot ? "var(--danger)" : "var(--finanzen)", transition: reduce ? "none" : "height .8s var(--ease-overshoot) " + (i * 90) + "ms" }}></div>
                <span style={{ position: "absolute", bottom: 0, fontSize: 10, fontWeight: 800, color: "var(--text-meta)" }}>KW {29 + i - 3}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ══ FINANZEN — Behandlung 3 · Paar-Split ═══════════════════════════
  function FinSplit({ flash }) {
    const run = useMount(true);
    const [settled, setSettled] = useState(false);
    const debt = useCountUp(settled ? 0 : F.debt, run || settled, 700);
    const tilt = settled ? 0 : (run ? -7 : 0); // Balken kippt zu Mara (Gläubiger)
    const owe = person(F.debtFrom), get = person(F.debtTo);
    return (
      <div style={{ background: "var(--finanzen-tint)", border: "1px solid var(--border-softer)", borderRadius: "var(--radius-card)", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 15 }}>Wer hat was gezahlt · {F.month}</span>
        </div>
        {/* Waage */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 6 }}>
          {["a", "b"].map(k => {
            const val = useCountUp(PAID[k], run, 900);
            const share = PAID[k] / (PAID.a + PAID.b);
            return (
              <div key={k} style={{ flex: 1, textAlign: "center" }}>
                <span className="mono" style={{ fontSize: 15, color: person(k).color }}>{eur(Math.round(val))} €</span>
                <div style={{ height: 8, borderRadius: 999, background: "var(--surface)", overflow: "hidden", marginTop: 6 }}>
                  <div style={{ height: "100%", width: (run ? share * 100 : 0) + "%", background: person(k).color, borderRadius: 999, transition: reduce ? "none" : "width .9s var(--ease-standard)", marginLeft: k === "b" ? "auto" : 0 }}></div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 7 }}>
                  <Avatar id={k} size={20} /><span style={{ fontSize: 12, fontWeight: 800 }}>{person(k).name}</span>
                </div>
              </div>
            );
          })}
        </div>
        {/* Ergebnis */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, padding: "11px 13px", background: "var(--surface)", borderRadius: 13 }}>
          <span style={{ fontSize: 18, transition: "transform .6s var(--ease-overshoot)", transform: "rotate(" + tilt + "deg)", display: "inline-block" }}>⚖️</span>
          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 800, color: "var(--text-secondary)" }}>
            {settled ? "Ausgeglichen 🎉" : <>{owe.name} schuldet {get.name} <span className="mono" style={{ color: get.color, whiteSpace: "nowrap" }}>{eur(debt)} €</span></>}
          </span>
          {!settled && <button onClick={() => { setSettled(true); flash && flash("Ausgeglichen 🎉"); }} style={{ cursor: "pointer", border: "none", borderRadius: 10, background: "var(--finanzen)", color: "#fff", fontWeight: 800, fontSize: 12, padding: "8px 13px" }}>Ausgleichen</button>}
        </div>
      </div>
    );
  }

  // ══ HAUSHALT — Fairness-Waage (Blick, den der Tap nicht gibt) ══════
  function HaushaltWaage({ flash }) {
    const run = useMount(true);
    const [done, setDone] = useState({ a: 3, b: 5 });
    const total = done.a + done.b;
    const shareA = total ? done.a / total : 0.5;
    return (
      <div style={{ background: "var(--haushalt-tint)", border: "1px solid var(--border-softer)", borderRadius: "var(--radius-card)", padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 15 }}>🧽</span>
          <span style={{ flex: 1, fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 14 }}>Haushalt · diese Woche</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-meta)" }}>2 offen ›</span>
        </div>
        {/* Balken: Anteil erledigter Aufgaben je Person */}
        <div style={{ display: "flex", height: 30, borderRadius: 10, overflow: "hidden", background: "var(--surface)" }}>
          <div style={{ width: (run ? shareA * 100 : 50) + "%", background: COUPLE.a.color, display: "flex", alignItems: "center", justifyContent: "flex-start", paddingLeft: 9, color: "#fff", fontWeight: 800, fontSize: 12, transition: reduce ? "none" : "width .9s var(--ease-overshoot)" }}>{done.a}</div>
          <div style={{ flex: 1, background: COUPLE.b.color, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 9, color: "#fff", fontWeight: 800, fontSize: 12 }}>{done.b}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 9 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-secondary)" }}>{done.b > done.a ? person("b").name + " trägt gerade mehr" : done.a > done.b ? person("a").name + " trägt gerade mehr" : "genau fair ✨"}</span>
          <button onClick={() => { setDone(d => ({ a: d.a + 1, b: d.b })); flash && flash("Für " + person("a").name + " abgehakt ✓"); }} style={{ cursor: "pointer", border: "none", borderRadius: 9, background: "var(--surface)", color: "var(--haushalt)", fontWeight: 800, fontSize: 11.5, padding: "6px 11px" }}>✓ erledigt</button>
        </div>
      </div>
    );
  }

  // ══ EINKAUF — Fortschritt (animiert) ═══════════════════════════════
  function EinkaufProgress({ flash }) {
    const [items, setItems] = useState(() => TG.scenario("full").shopping);
    const done = items.filter(s => s.done).length, total = items.length;
    const run = useMount(true);
    const pct = total ? done / total : 0;
    function tick(id) { setItems(list => list.map(s => s.id === id ? Object.assign({}, s, { done: !s.done }) : s)); }
    const open = items.filter(s => !s.done);
    return (
      <div style={{ background: "var(--einkauf-tint)", border: "1px solid var(--border-softer)", borderRadius: "var(--radius-card)", padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 15 }}>🛒</span>
          <span style={{ flex: 1, fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 14 }}>Einkauf</span>
          <span className="mono" style={{ fontSize: 12.5, color: "var(--text-meta)" }}>{done}/{total}</span>
        </div>
        <div style={{ height: 7, borderRadius: 999, background: "var(--surface)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: (run ? pct * 100 : 0) + "%", background: "var(--einkauf-hover)", borderRadius: 999, transition: "width .5s var(--ease-standard)" }}></div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 11 }}>
          {open.slice(0, 4).map(s => (
            <button key={s.id} onClick={() => { tick(s.id); flash && flash(s.name + " abgehakt ✓"); }} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--border-soft)", background: "var(--surface)", borderRadius: 999, padding: "5px 11px", fontSize: 12, fontWeight: 700 }}>
              <span style={{ width: 13, height: 13, borderRadius: 4, border: "2px solid var(--border)" }}></span>{s.name}
            </button>
          ))}
          {open.length === 0 && <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-meta)" }}>Alles erledigt 🎉</span>}
        </div>
      </div>
    );
  }

  // ── merged „Offene Dinge" (Konzept 2): Einkauf + Haushalt in einer Zeile ──
  function OffeneDinge({ flash }) {
    const [shop, setShop] = useState(() => TG.scenario("full").shopping.filter(s => !s.done));
    const [chores, setChores] = useState(() => TG.scenario("full").chores.filter(c => !c.done && c.today));
    const list = chores.map(c => ({ id: c.id, kind: "chore", label: c.task, meta: c.room, owner: c.owner }))
      .concat(shop.map(s => ({ id: s.id, kind: "shop", label: s.name, meta: "Einkauf" })));
    function tick(it) {
      if (it.kind === "shop") setShop(l => l.filter(s => s.id !== it.id));
      else setChores(l => l.filter(c => c.id !== it.id));
      flash && flash(it.label + " erledigt ✓");
    }
    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--border-softer)", borderRadius: "var(--radius-card)", padding: 14, boxShadow: "var(--shadow-card)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 14 }}>Offene Dinge</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--accent)", background: "var(--accent-tint)", padding: "2px 8px", borderRadius: 999 }}>{list.length}</span>
          <span style={{ flex: 1 }}></span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-meta)" }}>Haushalt · Einkauf ›</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {list.map(it => (
            <div key={it.kind + it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px" }}>
              <button onClick={() => tick(it)} style={{ cursor: "pointer", width: 22, height: 22, borderRadius: 7, border: "2px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}></button>
              <span style={{ fontSize: 15 }}>{it.kind === "shop" ? "🛒" : "🧽"}</span>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{it.label} <span style={{ color: "var(--text-faint)", fontWeight: 700, fontSize: 12 }}>· {it.meta}</span></span>
              {it.owner && <Avatar id={it.owner} size={20} />}
            </div>
          ))}
          {list.length === 0 && <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-meta)", padding: "6px 4px" }}>Alles erledigt für heute 🎉</div>}
        </div>
      </div>
    );
  }

  // ── Launcher-Pill (Konzept 3): Icon + Zähler, springt auf die Seite ──
  function LauncherPill({ icon, label, count, tint, dotColors, flash }) {
    const run = useMount(true);
    return (
      <button onClick={() => flash && flash(label + " öffnet sich …")} style={{ flex: 1, cursor: "pointer", background: tint, border: "1px solid var(--border-softer)", borderRadius: "var(--radius-card)", padding: "13px 14px", textAlign: "left", position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{ flex: 1, fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 14 }}>{label}</span>
          <span style={{ color: "var(--text-faint)", fontWeight: 800, fontSize: 15 }}>›</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
          <span className="mono" style={{ fontSize: 26, color: "var(--text)", transform: run ? "translateY(0)" : "translateY(8px)", opacity: run ? 1 : 0, transition: "all .5s var(--ease-overshoot)" }}>{count}</span>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--text-meta)" }}>offen</span>
        </div>
        {dotColors &&
          <div style={{ display: "flex", gap: 3, marginTop: 7 }}>
            {dotColors.map((c, i) => <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: c, transform: run ? "scale(1)" : "scale(0)", transition: "transform .4s var(--ease-overshoot) " + (i * 60 + 200) + "ms" }}></span>)}
          </div>}
      </button>
    );
  }

  // ── Mini-Kontext oben (Hero verkürzt, damit die Regale im Fokus sind) ──
  function MiniHead() {
    return (
      <>
        <StatusBar />
        <div style={{ padding: "6px 20px 4px", display: "flex", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 22, lineHeight: 1.05 }}>Moin, ihr zwei 👋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginTop: 1 }}>{TG.dateLabel()}</div>
          </div>
          <span style={{ display: "flex" }}>
            <span style={{ border: "2px solid var(--bg)", borderRadius: "50%", lineHeight: 0 }}><Avatar id="a" size={32} /></span>
            <span style={{ border: "2px solid var(--bg)", borderRadius: "50%", lineHeight: 0, marginLeft: -11 }}><Avatar id="b" size={32} /></span>
          </span>
        </div>
      </>
    );
  }
  function MiniHero() {
    return (
      <div style={{ margin: "8px 20px 4px", background: "linear-gradient(180deg, var(--food-tint), var(--surface))", border: "1px solid color-mix(in srgb, var(--food) 20%, transparent)", borderRadius: "var(--radius-card)", padding: "11px 14px", display: "flex", alignItems: "center", gap: 11, opacity: 0.96 }}>
        <ResIcon emoji="🍝" size={40} bg="var(--food)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--food)", textTransform: "uppercase", letterSpacing: 0.4 }}>Heute Abend im Fokus</div>
          <div style={{ fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 17 }}>Pasta al Limone</div>
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--text-meta)" }}>Beide</span>
      </div>
    );
  }

  function ConceptPhone({ children }) {
    const [toast, setToast] = useState(null);
    useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 1800); return () => clearTimeout(id); }, [toast]);
    const flash = m => setToast(m);
    return (
      <Phone>
        <MiniHead />
        <MiniHero />
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px 110px" }}>
          <div className="section-label" style={{ margin: "6px 0 10px" }}>Regale</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {typeof children === "function" ? children(flash) : children}
          </div>
        </div>
        <BottomNav active="start" />
        <Toast msg={toast} />
      </Phone>
    );
  }

  // ── Die 3 Anordnungen ──────────────────────────────────────────────
  function Concept1() { // Lebendige Glances — jede Karte rechtfertigt sich
    return <ConceptPhone>{flash => <>
      <FinRing flash={flash} />
      <HaushaltWaage flash={flash} />
      <EinkaufProgress flash={flash} />
    </>}</ConceptPhone>;
  }
  function Concept2() { // Finanzen groß · To-dos schlank
    return <ConceptPhone>{flash => <>
      <FinTrend flash={flash} />
      <OffeneDinge flash={flash} />
    </>}</ConceptPhone>;
  }
  function Concept3() { // Held + Launcher
    return <ConceptPhone>{flash => <>
      <FinRing flash={flash} />
      <div style={{ display: "flex", gap: 10 }}>
        <LauncherPill icon="🛒" label="Einkauf" count={3} tint="var(--einkauf-tint)" flash={flash} />
        <LauncherPill icon="🧽" label="Haushalt" count={2} tint="var(--haushalt-tint)" dotColors={[COUPLE.a.color, COUPLE.b.color]} flash={flash} />
      </div>
    </>}</ConceptPhone>;
  }

  // ── Finanzen-Fokus: Behandlung in eigenem Panel + Replay ───────────
  function FinPanel({ children }) {
    const [toast, setToast] = useState(null);
    useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 1600); return () => clearTimeout(id); }, [toast]);
    return (
      <div style={{ width: 340, position: "relative" }}>
        <Replayable>{typeof children === "function" ? children(m => setToast(m)) : children}</Replayable>
        {toast && <div style={{ marginTop: 10, textAlign: "center", fontSize: 11.5, fontWeight: 800, color: "var(--success)" }}>{toast}</div>}
      </div>
    );
  }

  window.RK = {
    Concept1, Concept2, Concept3,
    FinRingPanel: () => <FinPanel>{flash => <FinRing flash={flash} />}</FinPanel>,
    FinTrendPanel: () => <FinPanel>{flash => <FinTrend flash={flash} />}</FinPanel>,
    FinSplitPanel: () => <FinPanel>{flash => <FinSplit flash={flash} />}</FinPanel>
  };
})();
