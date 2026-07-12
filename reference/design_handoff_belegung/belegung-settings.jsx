/* Belegung — Profil-Einstellungen: Ressourcen verwalten (Name + Icon frei wählbar) */
/* global React, BELEG */
(function () {
  const { useState } = React;
  const { PEOPLE } = BELEG;

  const ICON_SET = [
    "🚗","🚙","🏍️","🛵","🚲","🛴","🅿️","⛽",
    "🐕","🐈","🪴","🌱","🏠","🛋️","🧺","🚿",
    "🧰","🔧","🪛","🔩","📷","🎥","🎮","🕹️",
    "🎸","🎹","🎿","⛺","🛶","🏓","🧗","🎣",
    "💻","🖨️","📺","🔌","🍳","☕","🧊","🧴"
  ];

  function ResourceSettings({ resources, bookings, onAdd, onUpdate, onDelete, onClose }) {
    const [form, setForm] = useState(null); // null | {id?, name, emoji}

    function startNew() { setForm({ name: "", emoji: "🚗" }); }
    function startEdit(r) { setForm({ id: r.id, name: r.name, emoji: r.emoji }); }
    function save() {
      if (!form.name.trim()) return;
      if (form.id) onUpdate(form.id, { name: form.name.trim(), emoji: form.emoji });
      else onAdd({ name: form.name.trim(), emoji: form.emoji });
      setForm(null);
    }

    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "var(--bg)", display: "flex", flexDirection: "column", animation: "bfade .18s ease" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px 10px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border-softer)" }}>
          <button onClick={form ? () => setForm(null) : onClose} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid var(--border-soft)", background: "var(--surface)", color: "var(--text-secondary)", fontSize: 18, cursor: "pointer", fontFamily: "var(--font-headline)" }}>‹</button>
          <div>
            <div style={{ fontFamily: "var(--font-headline)", fontWeight: 600, fontSize: 19 }}>{form ? (form.id ? "Ressource bearbeiten" : "Neue Ressource") : "Einstellungen"}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{form ? "Name & Icon frei wählen" : "Geteilte Ressourcen"}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 30px" }}>
          {!form && (
            <div>
              <div className="section-label" style={{ marginBottom: 10 }}>Ressourcen · {resources.length}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {resources.map(r => {
                  const cnt = bookings.filter(b => b.resourceId === r.id && b.status !== "declined").length;
                  return (
                    <div key={r.id} className="card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ width: 40, height: 40, borderRadius: 12, background: "var(--surface-deep)", display: "grid", placeItems: "center", fontSize: 21 }}>{r.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 14.5, color: "var(--text)" }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-meta)", fontWeight: 700 }}>{cnt} {cnt === 1 ? "Belegung" : "Belegungen"}</div>
                      </div>
                      <button onClick={() => startEdit(r)} style={{ cursor: "pointer", border: "none", background: "var(--surface-deep)", color: "var(--text-secondary)", fontWeight: 700, fontSize: 12.5, padding: "7px 12px", borderRadius: 9 }}>Bearbeiten</button>
                    </div>
                  );
                })}
              </div>
              <button onClick={startNew} className="btn-primary" style={{ marginTop: 16 }}>＋ Neue Ressource</button>

              <div className="section-label" style={{ margin: "26px 0 10px" }}>Personen</div>
              <div style={{ display: "flex", gap: 10 }}>
                {[PEOPLE.lena, PEOPLE.jonas].map(p => (
                  <div key={p.id} className="card" style={{ flex: 1, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 32, height: 32, borderRadius: "50%", background: p.color, color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-headline)", fontWeight: 600 }}>{p.initial}</span>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {form && (
            <div>
              {/* Vorschau */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <span style={{ width: 76, height: 76, borderRadius: 20, background: "var(--surface)", border: "1px solid var(--border-soft)", boxShadow: "var(--shadow-card)", display: "grid", placeItems: "center", fontSize: 38 }}>{form.emoji}</span>
              </div>
              <div className="section-label" style={{ marginBottom: 7 }}>Name</div>
              <input className="app-field" autoFocus placeholder="z. B. Wohnmobil, Bohrmaschine …" value={form.name}
                onChange={e => setForm(f => Object.assign({}, f, { name: e.target.value }))} style={{ marginBottom: 18 }} />

              <div className="section-label" style={{ marginBottom: 10 }}>Icon</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                {ICON_SET.map(ic => {
                  const on = ic === form.emoji;
                  return (
                    <button key={ic} onClick={() => setForm(f => Object.assign({}, f, { emoji: ic }))}
                      style={{ aspectRatio: "1", cursor: "pointer", borderRadius: 10, fontSize: 18, display: "grid", placeItems: "center",
                        border: "1.5px solid " + (on ? "var(--accent)" : "transparent"), background: on ? "var(--accent-tint)" : "var(--surface-deep)" }}>{ic}</button>
                  );
                })}
              </div>

              <button onClick={save} className="btn-primary" disabled={!form.name.trim()} style={{ marginTop: 20 }}>{form.id ? "Speichern" : "Ressource anlegen"}</button>
              {form.id &&
                <button onClick={() => { onDelete(form.id); setForm(null); }} style={{ width: "100%", marginTop: 10, cursor: "pointer", padding: "13px", borderRadius: 14, border: "1px solid var(--danger-border)", background: "var(--surface)", color: "var(--danger)", fontWeight: 800, fontSize: 14 }}>Ressource löschen</button>}
            </div>
          )}
        </div>
      </div>
    );
  }

  Object.assign(window, { ResourceSettings, ICON_SET });
})();
