# Delta-Prompt — Denk-Zustand aus dem Modal (Sheet-Glow)

> Nutze dies, wenn Claude Code den Denk-Zustand bereits (falsch, z. B. als Vollbild oder Viewport-Rand-Glow)
> umgesetzt hat. Es korrigiert **nur** den Denk-Zustand; alles andere (AiButton, Sheet, Bloom, Ergebnis) bleibt.

---

**Korrektur zum Denk-Zustand — er läuft AUS dem Aktions-Sheet heraus (Modal-Glow). Verworfen sind:
Vollbild-Denkmodal, Viewport-Rand-Glow und die gedockte Denk-Leiste.**

Die KI-Aktionen „Ganze Woche planen" und „Rezept vorschlagen" werden aus dem **Aktions-Sheet** ausgelöst.
Statt in ein Vollbild zu wechseln, wird **das Sheet selbst zum Denk-Zustand** — es bleibt offen und glüht.
Neuer State `sheetthink` **zwischen `sheet` und `done`** (der alte Vollbild-`thinking` entfällt für Sheet-Aktionen).

Verhalten beim Tap einer Sheet-Zeile:
1. **Sheet bleibt offen** (`transform: translateY(0)`), Scrim bleibt sichtbar. Zeilen (`.aiRow`) + Titel
   `display:none`; eine **Denk-Zeile** faded ein: Aktions-Icon als Gradient-Kachel (46×46, `--ai-gradient`,
   `background-size:200% 200%`, `box-shadow: var(--ai-glow)`, `aiShift 4s`) · Status-Text
   (Fredoka 600/15.5px + Nunito 700/12.5px Untertitel) · **Mini-Loader**.
2. **Glow um das Sheet:** Aura-Element **hinter** dem Sheet — `position:absolute; left:-3px; right:-3px;
   top:-5px; bottom:0; border-radius:32px 32px 0 0; z-index:-1; background:var(--ai-gradient);
   background-size:300% 300%; filter:blur(22px); opacity:.78; animation: aiShift 4s ease-in-out infinite,
   edgeBreath 2.8s ease-in-out infinite;` (ragt nur als weicher Schein über die Kanten). Zusätzlich eine
   **Gradient-Hairline** (3px) an der Sheet-Oberkante via `::before` (gleicher Gradient, `aiShift 3s`),
   im Denk-State `opacity 0→1`.
3. **Fortschritt:** dünne Gradient-Leiste im Sheet (`height:3px; background: color-mix(in srgb,#9b72cb 16%,transparent)`;
   Füllung `::after { width:42%; background:var(--ai-gradient); background-size:300% 300%; animation: barSlide 1.6s + aiShift 3s }`).
4. **Status je Aktion:** Woche → „Plant eure Woche …" / „7 Abendessen werden zusammengestellt" (Icon 🪄);
   Rezept → „Sucht ein Rezept …" / „Passend zu euren Vorräten" (Icon ✨).
5. **Mini-Loader** = die zwei TwoDo-Kreise, auf hellem Sheet-BG in **Akzent-Lila** statt Weiß:
   22×16 Container `aiSpin 2.2s`; Kreise 12×12, links `#9b72cb` (dark `#c3a9e6`), rechts
   `color-mix(in srgb,#9b72cb 32%,transparent)` + `inset 0 0 0 2px #9b72cb`, beide `aiPulse 1.6s` (rechter +.8s).
6. **Ende:** kurzer **Bloom** (bestehende Fertig-Animation, ~480 ms), Sheet schließt, Ergebnis erscheint im Screen.

Regeln:
- Alle Werte/Tokens wie gehabt (`--ai-gradient`, `--ai-scrim`, `--ai-glow`, `aiShift`, `edgeBreath`).
- **Nav-sicher:** das Sheet liegt ohnehin über der Navigation, der Glow bleibt in seinem Rahmen — **kein
  Viewport-Rand-Effekt, kein Vollbild** (außer dem finalen Bloom).
- **Direkt-Auslöser OHNE Sheet** (Rezept-Wiki, Finanz-Coach) bekommen keinen Sheet-Glow, sondern den
  verankerten Glow am Auslöser: **§6·A Auslöser-Halo** (Standard) bzw. **§6·C Ziel-Karte**.
- `prefers-reduced-motion`: Glow/Leiste statisch, direkt aufs Ergebnis.

Referenz: **Sektion 7** (Sheet-Glow) und **Sektion 6** (Halo / Ziel-Karte) in
`design_handoff_twodo_ki/twodo-ki-states-and-motion.html`; Details in README §4.
