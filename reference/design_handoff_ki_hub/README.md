# KI-Hub — Handoff

Zentraler KI-Einstieg für TwoDo: ein dauerhafter KI-Button rechts neben der schmalen 3er-Nav,
der ein Bottom-Sheet-Modal mit **allen** KI-Funktionen öffnet. Ersetzt alle verstreuten
KI-Buttons/-Karten der App.

## Dateien
- **`PROMPT.md`** — der Prompt für Claude Code (alles ab „Baue in dieser Vue-3-App …" kopieren).
- **`nav-links-ki-hub.html`** — bedienbarer Prototyp. Im Browser öffnen; KI-Button rechts tippen,
  Aktionen durchklicken, Tabs wechseln. Lädt `../styles.css` (Tokens) und `./shared.css` (Gerüst +
  KI-Tokens).
- **`shared.css`** — gemeinsames Gerüst inkl. der KI-Tokens (`--ai-gradient` …) und Keyframes
  (`aiShift`, `edgeBreath`, `aiBloom`), die nach `src/app.css` übernommen werden.

## Kernentscheidungen
1. **Schmale Nav links + KI-Button rechts** — nutzt den frei gewordenen Platz (nur noch 3 Tabs) und
   löst die FAB/Bubble-Kollision.
2. **Ein Hub statt vieler Auslöser** — alle KI-Aktionen an einem Ort; die alten Einzel-Buttons
   werden entfernt und hier eingesammelt.
3. **Mehrstufig** — Wochenplan/Rezept fragen Tag + Prompt, Einkaufsliste fragt die Ziel-Liste,
   Direkt-Aktionen starten sofort.
4. **Denk-Zustand** — das Modal glüht während der Verarbeitung (bereits in
   `../design_handoff_twodo_ki/` designt).

## Verweise
- 3er-Navigation & FAB-Kollision: `../explorations/nav-3er/README.md`
- Denk-/Glow-Zustand im Detail: `../design_handoff_twodo_ki/`
