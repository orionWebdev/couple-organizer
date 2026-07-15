# Kickoff-Prompt für Claude Code

> Kopiere den folgenden Block in Claude Code (im Wurzelverzeichnis des Vue-Repos). Er verweist auf dieses Handoff-Paket.

---

Ich implementiere ein Redesign des Dashboards unserer Paar-App „TwoDo" (Vue 3 + CSS Custom Properties, keine UI-Library; Design-Fundament in `src/app.css`). Im Ordner `design_handoff_dashboard_b_v2/` liegt ein vollständiges Handoff.

**Lies zuerst `design_handoff_dashboard_b_v2/README.md` komplett.** Die dortigen HTML/JSX-Dateien sind **Design-Referenzen**, kein Code zum Kopieren — bau die Designs mit den **bestehenden Vue-Patterns, Komponenten und Tokens** unseres Repos nach (Composition API, `<script setup>`, `ref`/`computed`). Fidelity ist **high** — Farben, Maße, Radien, Motion und Verhalten sind verbindlich; die exakten Werte stehen im README und inline in den `.jsx`-Dateien.

Bitte in dieser Reihenfolge, jeweils zur Bestätigung anhalten:

1. **Tokens**: Ergänze die neue Bereichsfarbe `--planung` in `src/app.css` (Snippet: `design_handoff_dashboard_b_v2/tokens-planung-snippet.css`) inkl. `.area-planung`. Prüfe, dass sie sich in Lightness/Chroma in die bestehenden Bereichsfarben einreiht.

2. **Belegung-Kernlogik**: Übernimm die Serien-Auflösung (`occursOn`, `expandWeek`, `onDate`, `nextOccurrence`, `nextLabel`, `conflictsOn` aus `redesign-data.js`) als reine Helfer/Composable. Grundregel: **eine Serie = eine Regel; Oberflächen zeigen nur aufgelöste, konkrete Termine in einem begrenzten Fenster** (Dashboard = heute; Screen = eine Woche). Nie über einen offenen Zeithorizont ausrollen.

3. **Bottom-Nav auf 5 Tabs** erweitern (Start · Haushalt · **Planung** (mittig) · Finanzen · Essen). Bubble springt mit Bounce zum aktiven Slot und nimmt dessen Bereichsfarbe an; Tab-Root schaltet `.area-*`.

4. **Dashboard (Start) neu**: Zone „Jetzt im Fokus" (Essens-Hero mit „Wer kocht?") + Zone „Auf einen Blick" mit drei Glance-Karten: **Finanzen** (Budget-Ring + Paar-Split + „zuletzt bezahlt", inkl. Count-up/Ring-Animation), **Belegung** (Mini-Wochenstreifen → Wochenkalender), **Haushalt** (Fairness-Waage). **Einkauf nicht mehr aufs Dashboard.**

5. **Neuer Planung-Tab**: Belegung · Ideen (Bucketlist: Filme/Restaurants/Date-Ideen, mit Kategorie-Filter + Add-Sheet) · Reisen · Notizen. Bereichsfarbe `--planung`.

6. **Wochenkalender-Screen** (aus `shared.jsx`): Wochen-Grid + Tages-Detail + Serien-Liste mit nächstem Termin; FAB → Neue-Belegung-Sheet. **Kein Anfrage-/Bestätigen-Flow** (wer einträgt, hat eingetragen; Überschneidung nur als Warnung).

Randbedingungen: nur Light Theme; Bottom-Sheets als Eingabemuster; Emojis als Icon-Sprache; Motion respektiert `prefers-reduced-motion`. **Personen-Namen/Initialen sind Paar-Daten** (nicht fest verdrahten) — konstant sind nur die zwei Personenfarben (`--chris`/`--sarah`).

Beachte unsere bestehenden Utility-Klassen (`.card`, `.btn-primary`, `.app-field`, `.chip`, `.section-label`, `.mono`) und ersetze inline-Styles der Prototypen durch die Repo-Konventionen. Wo etwas unklar ist, frag nach, statt zu raten.
