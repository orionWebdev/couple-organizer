/* Belegung — Bottom-Sheet (anlegen), Detail (bestätigen/ablehnen), Anfrage-Banner */
/* global React, BELEG */
(function () {
  const { PEOPLE, WEEKDAYS, conflictsFor, rangeLabel } = BELEG;
  const VIEWER = "lena"; // aktueller Nutzer der Demo

  function Field({ label, children }) {
    return (
      <div style={{ marginBottom: 14 }}>
        <div className="section-label" style={{ marginBottom: 7 }}>{label}</div>
        {children}
      </div>
    );
  }

  function Segmented({ options, value, onChange, colorMap }) {
    return (
      <div style={{ display: "flex", gap: 4, background: "var(--surface-deep)", padding: 4, borderRadius: 12 }}>
        {options.map(o => {
          const active = o.value === value;
          const c = colorMap && colorMap[o.value];
          return (
            <button key={o.value} onClick={() => onChange(o.value)}
              style={{ flex: 1, cursor: "pointer", border: "none", borderRadius: 9, padding: "9px 6px",
                fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 13,
                background: active ? (c || "var(--accent)") : "transparent",
                color: active ? "var(--on-accent)" : "var(--text-secondary)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background .15s" }}>
              {o.icon && <span>{o.icon}</span>}{o.label}
            </button>
          );
        })}
      </div>
    );
  }

  function Backdrop({ onClose, children }) {
    return (
      <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 40, background: "rgba(44,40,35,0.32)", display: "flex", alignItems: "flex-end", animation: "bfade .2s ease" }}>
        <div onClick={e => e.stopPropagation()} className="bsheet"
          style={{ width: "100%", background: "var(--surface)", borderRadius: "var(--radius-sheet) var(--radius-sheet) 0 0", padding: "10px 20px calc(20px + var(--safe-bottom))", maxHeight: "88%", overflowY: "auto", boxShadow: "0 -8px 30px rgba(60,45,30,0.18)" }}>
          <div style={{ width: 38, height: 4, borderRadius: 999, background: "var(--border)", margin: "0 auto 14px" }}></div>
          {children}
        </div>
      </div>
    );
  }

  // ── Neue Belegung ─────────────────────────────────────────
  function NewBookingSheet({ draft, setField, resource, resources, allBookings, conflictMode, onSubmit, onClose, onChangeResource }) {
    const probe = Object.assign({ id: "__new", resourceId: resource.id }, draft);
    const conflicts = conflictsFor(probe, allBookings.filter(b => b.resourceId === resource.id));
    const hasConflict = conflicts.length > 0;
    const blocked = conflictMode === "block" && hasConflict;

    let cta = "Anfragen";
    if (conflictMode === "warn") cta = hasConflict ? "Trotzdem speichern" : "Speichern";
    else if (conflictMode === "block") cta = blocked ? "Überschneidung" : "Speichern";
    else cta = hasConflict ? "Trotzdem anfragen" : "Anfragen"; // request

    return (
      <Backdrop onClose={onClose}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 21 }}>Neue Belegung</div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 1 }}>Was, wann und wer</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", width: 32, height: 32, borderRadius: "50%", border: "none", background: "var(--surface-deep)", color: "var(--text-secondary)", fontSize: 17, cursor: "pointer" }}>✕</button>
        </div>

        <Field label="Ressource">
          <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2 }}>
            {resources.map(r => {
              const on = r.id === resource.id;
              return (
                <button key={r.id} onClick={() => onChangeResource(r.id)}
                  style={{ flexShrink: 0, cursor: "pointer", borderRadius: 11, padding: "8px 12px", fontWeight: 700, fontSize: 13,
                    border: "1px solid " + (on ? "var(--accent)" : "var(--border-soft)"),
                    background: on ? "var(--accent-tint)" : "var(--surface)", color: on ? "var(--accent)" : "var(--text-secondary)",
                    display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{r.emoji}</span>{r.name}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Wer">
          <Segmented value={draft.owner} onChange={v => setField("owner", v)}
            colorMap={{ lena: PEOPLE.lena.color, jonas: PEOPLE.jonas.color }}
            options={[{ value: "lena", label: "Lena", icon: "🟠" }, { value: "jonas", label: "Jonas", icon: "🔵" }]} />
        </Field>

        <Field label="Tag">
          <div style={{ display: "flex", gap: 5 }}>
            {WEEKDAYS.map((wd, i) => {
              const on = i === draft.day;
              return (
                <button key={i} onClick={() => setField("day", i)}
                  style={{ flex: 1, cursor: "pointer", borderRadius: 10, padding: "9px 0", fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 12.5,
                    border: "1px solid " + (on ? "var(--accent)" : "var(--border-soft)"),
                    background: on ? "var(--accent)" : "var(--surface)", color: on ? "var(--on-accent)" : "var(--text-secondary)" }}>{wd}</button>
              );
            })}
          </div>
        </Field>

        <Field label="Zeit">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: draft.allDay ? 0 : 10 }}>
            <span style={{ fontSize: 13.5, color: "var(--text-secondary)", fontWeight: 700 }}>Ganztägig</span>
            <button onClick={() => setField("allDay", !draft.allDay)}
              style={{ width: 46, height: 27, borderRadius: 999, border: "none", cursor: "pointer", position: "relative", background: draft.allDay ? "var(--accent)" : "var(--border)", transition: "background .18s" }}>
              <span style={{ position: "absolute", top: 3, left: draft.allDay ? 22 : 3, width: 21, height: 21, borderRadius: "50%", background: "#fff", transition: "left .18s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }}></span>
            </button>
          </div>
          {!draft.allDay &&
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="time" className="app-field" value={draft.start} onChange={e => setField("start", e.target.value)} style={{ flex: 1 }} />
              <span style={{ color: "var(--text-meta)", fontWeight: 700 }}>–</span>
              <input type="time" className="app-field" value={draft.end} onChange={e => setField("end", e.target.value)} style={{ flex: 1 }} />
            </div>}
        </Field>

        <Field label="Wiederholung">
          <Segmented value={draft.repeat} onChange={v => setField("repeat", v)}
            options={[{ value: "none", label: "Einmalig" }, { value: "weekly", label: "Wöchentlich ↻" }]} />
        </Field>

        <Field label="Notiz — wofür?">
          <input className="app-field" placeholder="z. B. Zur Arbeit, Einkauf …" value={draft.note} onChange={e => setField("note", e.target.value)} />
        </Field>

        {hasConflict &&
          <div style={{ display: "flex", gap: 9, alignItems: "flex-start", background: "var(--danger-tint)", border: "1px solid var(--danger-border)", borderRadius: 12, padding: "11px 13px", marginBottom: 14 }}>
            <span style={{ fontSize: 15 }}>⚠</span>
            <span style={{ fontSize: 12.5, color: "var(--danger)", fontWeight: 700, lineHeight: 1.45 }}>
              Überschneidet sich mit {conflicts.map(c => PEOPLE[c.owner].name + " (" + rangeLabel(c) + ")").join(", ")}.
              {conflictMode === "block" ? " Bitte andere Zeit wählen." : conflictMode === "request" ? " Deine Anfrage geht trotzdem an den anderen." : ""}
            </span>
          </div>}

        <button className="btn-primary" disabled={blocked} onClick={() => onSubmit(hasConflict)}
          style={{ background: blocked ? "var(--border)" : undefined }}>
          {conflictMode === "request" && !blocked ? "🔔 " : ""}{cta}
        </button>
        <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--text-faint)", fontWeight: 700, marginTop: 10 }}>
          {conflictMode === "request" ? "Der andere bestätigt die Anfrage." : conflictMode === "warn" ? "Wird sofort eingetragen." : "Überschneidungen werden verhindert."}
        </div>
      </Backdrop>
    );
  }

  // ── Detail / Bestätigen ───────────────────────────────────
  function BookingDetailSheet({ bk, resource, onConfirm, onDecline, onDelete, onClose }) {
    const p = PEOPLE[bk.owner];
    const pending = bk.status === "pending";
    const forViewer = pending && bk.requestedBy && bk.requestedBy !== VIEWER;
    const waiting = pending && bk.requestedBy === VIEWER;
    return (
      <Backdrop onClose={onClose}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: p.tint, display: "grid", placeItems: "center", fontSize: 20, marginRight: 12 }}>{resource.emoji}</span>
          <div>
            <div style={{ fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 20 }}>{resource.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{WEEKDAYS[bk.day]} · {rangeLabel(bk)}{bk.repeat === "weekly" ? " · ↻ wöchentlich" : ""}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", width: 32, height: 32, borderRadius: "50%", border: "none", background: "var(--surface-deep)", color: "var(--text-secondary)", fontSize: 17, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: p.tint, borderRadius: 14, marginBottom: 14 }}>
          <span style={{ width: 30, height: 30, borderRadius: "50%", background: p.color, color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 14 }}>{p.initial}</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text)" }}>{p.name}{bk.note ? " · " + bk.note : ""}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: pending ? p.color : "var(--success)" }}>
              {pending ? (waiting ? "wartet auf Bestätigung von Jonas" : "möchte diese Belegung") : "✓ bestätigt"}
            </div>
          </div>
        </div>

        {forViewer &&
          <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
            <button onClick={onDecline} style={{ flex: 1, cursor: "pointer", padding: "13px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", fontWeight: 800, fontSize: 14 }}>Ablehnen</button>
            <button onClick={onConfirm} className="btn-primary" style={{ flex: 1.4, background: "var(--success)", boxShadow: "none" }}>✓ Bestätigen</button>
          </div>}
        {!forViewer &&
          <button onClick={onDelete} style={{ width: "100%", cursor: "pointer", padding: "13px", borderRadius: 14, border: "1px solid var(--danger-border)", background: "var(--surface)", color: "var(--danger)", fontWeight: 800, fontSize: 14 }}>Belegung löschen</button>}
      </Backdrop>
    );
  }

  // ── Anfrage-Banner (offene Anfragen an den Nutzer) ────────
  function RequestBanner({ requests, resources, onOpen }) {
    const incoming = requests.filter(b => b.status === "pending" && b.requestedBy && b.requestedBy !== VIEWER);
    if (!incoming.length) return null;
    const first = incoming[0];
    const p = PEOPLE[first.owner];
    const res = (resources || []).find(r => r.id === first.resourceId) || { emoji: "", name: "" };
    return (
      <button onClick={() => onOpen(first)} style={{ width: "100%", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 11,
        background: "var(--surface)", border: "1px solid " + p.color, borderLeft: "3px solid " + p.color, borderRadius: 14, padding: "12px 14px", boxShadow: "var(--shadow-card)" }}>
        <span style={{ width: 30, height: 30, borderRadius: "50%", background: p.color, color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>{p.initial}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 800, fontSize: 13.5, color: "var(--text)" }}>{p.name} fragt {res.emoji} {res.name} an</span>
          <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", fontWeight: 700 }}>{WEEKDAYS[first.day]} · {rangeLabel(first)}{incoming.length > 1 ? "  ·  +" + (incoming.length - 1) + " weitere" : ""}</span>
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: p.color, background: p.tint, padding: "5px 10px", borderRadius: 999, flexShrink: 0 }}>Prüfen</span>
      </button>
    );
  }

  Object.assign(window, { NewBookingSheet, BookingDetailSheet, RequestBanner, BELEG_VIEWER: VIEWER });
})();
