# Claude-Code-Prompt — TwoDo KI (AiButton + AiThinkingModal)

Kopiere den folgenden Block als ersten Prompt in Claude Code (im Root des Couple-Organizer-Repos).

---

Implementiere die einheitliche **„TwoDo KI"-Identität** in dieser Vue-3-App. Die vollständige
Design-Spezifikation liegt in `design_handoff_twodo_ki/README.md`, die interaktive Referenz in
`design_handoff_twodo_ki/twodo-ki-states-and-motion.html`. **Lies zuerst beide Dateien komplett**,
bevor du Code schreibst.

**Kontext**
- Die HTML-Datei ist eine **Design-Referenz** (final, hi-fi), kein zu kopierender Code. Baue die
  Designs als echte Vue-Komponenten mit den bestehenden Mustern und Tokens der App (`src/app.css`) nach.
- Ziel: **eine** wiederverwendbare KI-Komponente ersetzt die heute vier handgebauten Gradient-Buttons.

**Aufgaben**
1. **Tokens**: Ergänze die KI-Tokens aus dem README-Abschnitt „KI-Tokens" in `src/app.css`
   (`--ai-gradient`, `--ai-gradient-size`, `--ai-glow`, `--ai-textshadow`, `--ai-scrim`) samt der
   Keyframes (`aiShift`, `aiBreath`, `aiBrighten`, `aiBloom`, `aiDrift1/2`, `aiSpin`, `aiPulse`).
   Der Gradient ist theme-unabhängig (Light = Dark).
2. **`AiButton`** mit Varianten `card` und `pill`, Icon-Chip, Titel/Subtitle, Chevron und optionalem
   **Plus-Badge**-Slot. Hintergrund immer zweilagig: `var(--ai-scrim), var(--ai-gradient)` mit
   `background-size: 100% 100%, var(--ai-gradient-size)` (sonst wird weißer Text in der Amber-Phase
   unlesbar). `aiShift 6s`, `:active scale(.98)`.
3. **KI-Aktions-Sheet** (Bottom-Sheet) für Multi-Aktion-Seiten — Gradient nur als Icon-Akzent, nicht flächig.
4. **Denk-Zustand — Modal-Glow ist der PRIMÄRE Weg** (siehe README §4). **Kein Vollbild-Denkzustand**;
   Vollbild nur noch für den finalen **Bloom** kurz vors Ergebnis. Baue:
   - **Sheet-Glow (§4·PRIMÄR, für ALLE Sheet-Aktionen):** Tap auf eine Sheet-Zeile → **das Sheet bleibt
     offen und wird selbst zum Denk-Zustand**. Neuer State `sheetthink` zwischen `sheet` und `done`.
     Zeilen+Titel `display:none`, Denk-Zeile (Gradient-Icon-Kachel · Status · Mini-Loader) faded ein; das
     Sheet bekommt einen atmenden **Gradient-Glow** (Aura-Element hinter dem Sheet, `blur 22px`,
     `aiShift 4s + edgeBreath 2.8s`) + Gradient-Hairline an der Oberkante (`::before`) + dünne
     Fortschrittsleiste (`barSlide 1.6s`). Status je Aktion: „Plant eure Woche …" / „Sucht ein Rezept …".
     Mini-Loader auf hellem Sheet-BG in **Akzent-Lila** (`#9b72cb`, dark `#c3a9e6`), nicht weiß.
   - **Verankerter Glow (§6, nur für Direkt-Auslöser OHNE Sheet):** **6·A Auslöser-Halo** (weicher
     Gradient-Schein nur um den KI-Button, Text → Mini-Loader + „plant …") als Standard; **6·C Ziel-Karte**
     (animierter Gradient-Rahmen an der Karte, in der das Ergebnis erscheint), wenn ein Ziel-Element existiert.
   - **Weiche** `thinkMode`: Aktion kommt aus einem **Sheet** → `'sheet'` (Standard). Direkt-Auslöser →
     `'halo'`, optional `'target'`. **Kein `'edge'`/`'dock'`, kein Viewport-Rand-Glow, keine Denk-Leiste**
     (verworfen: Rand wirkt auf Geräten unnatürlich, Dock/Pille kollidieren mit der Navigation).
   - **Marken-Loader (Mini)** aus den zwei TwoDo-Kreisen (`aiSpin` + versetztem `aiPulse`).
   - Den früheren **Vollbild-`AiThinkingModal`** nur noch für den **Bloom-&-Reveal-Übergang** (~480 ms) nutzen.
5. **Verdrahtung pro Seite** (siehe §9 im README):
   - **Küche** (mehrere KI-Aktionen): ein `AiButton` → Sheet („Ganze Woche planen" / „Rezept vorschlagen").
   - **Rezept-Wiki** und **Finanz-Coach** (eine Aktion): `AiButton` löst direkt aus, kein Sheet.
     Finanz-Coach nutzt die `pill`-Variante im Kartenkopf. Damit entfallen die gedoppelten Buttons.
6. Ergebnis-Zustand: neutraler Sheet-Grund, Gradient lebt nur noch im primären Aktions-Button weiter.

**Rahmenbedingungen**
- Mobile-first, Touch-Targets ≥ 44px, Light **und** Dark sauber.
- **Kein Viewport-Rand-Glow** (wirkt in der PWA/nativ unnatürlich) und **keine Denk-Leiste über der Nav**.
  Denken passiert im Sheet (Sheet-Glow) bzw. am Auslöser (Halo/Ziel-Karte) — immer im Content, nie am Rand.
- `prefers-reduced-motion`: kein Wandern/Atem/Bloom/Glow-Puls — Sheet-Glow &amp; Halo statisch,
  Fortschrittsleiste ohne Slide, „Fertig" springt direkt aufs Ergebnis (App killt Loops bereits global).
- `AiThinkingModal` mit `role="status"` / `aria-live="polite"`, Fokus-Trap.
- Echte KI-Antwort im `thinking`-State laden; erst nach Antwort **und** minimaler Denk-Dauer auf
  `done/result` wechseln, damit die Animation nicht springt.
- Rein CSS, keine neuen Libs.

**Vorgehen**: Schlage zuerst die Komponenten-Struktur, Datei-Pfade und Prop-/Emit-Signaturen vor
(`AiButton`, `AiActionSheet` — mit eingebautem `sheetthink`-Denk-Zustand — und `AiThinkingAnchor` mit
`mode: 'halo' | 'target'` für Direkt-Auslöser), warte auf mein OK, dann implementiere. Halte dich bei
Farben, Radien und Timings strikt an das README (Referenz-Implementierung: Sektion 6 &amp; 7 der HTML).
