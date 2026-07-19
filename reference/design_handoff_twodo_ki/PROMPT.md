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
4. **Denk-Zustand — Inline statt Vollbild** (siehe README §4a/4b). Der Screen bleibt beim „Denken"
   **sichtbar**; Vollbild nur noch für den finalen **Bloom** kurz vors Ergebnis. Baue **beide** Bausteine
   und eine Kontext-Weiche:
   - **Rand-Glow (4a, kurze Tasks):** animierter Gradient-Ring an der **App-Shell** (nicht am Viewport!),
     weicher Innen-Bleed + kleine Status-Pille unten. Ring per Padding+Mask-Composite, `aiShift 4s` + `edgeBreath`.
     **PWA:** per `inset: env(safe-area-inset-*)` einrücken und **nur bei `display-mode: standalone`** aktivieren.
   - **Denk-Leiste (4b, lange Tasks / Browser-Tab):** gedockter Gradient-Toast unten mit Marken-Loader,
     Titel/Untertitel, **Abbrechen**, **determiniertem Fortschritt** (`dockFill` 0→100%) **und Rest-Zeit**
     („noch ~x Sek.", runterzählen, bei `done` auf 0 klemmen).
   - **Weiche** `thinkMode`: `isStandalone && taskIsShort ? 'edge' : 'dock'` mit
     `isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone`.
   - **Marken-Loader (Mini)** aus den zwei TwoDo-Kreisen (`aiSpin` + versetztem `aiPulse`) in beiden.
   - Den früheren **Vollbild-`AiThinkingModal`** nur noch für den **Bloom-&-Reveal-Übergang** (~480 ms)
     nutzen — nicht mehr für die Dauer-Denkphase.
5. **Verdrahtung pro Seite** (siehe §9 im README):
   - **Küche** (mehrere KI-Aktionen): ein `AiButton` → Sheet („Ganze Woche planen" / „Rezept vorschlagen").
   - **Rezept-Wiki** und **Finanz-Coach** (eine Aktion): `AiButton` löst direkt aus, kein Sheet.
     Finanz-Coach nutzt die `pill`-Variante im Kartenkopf. Damit entfallen die gedoppelten Buttons.
6. Ergebnis-Zustand: neutraler Sheet-Grund, Gradient lebt nur noch im primären Aktions-Button weiter.

**Rahmenbedingungen**
- Mobile-first, Touch-Targets ≥ 44px, Light **und** Dark sauber.
- **PWA-Kontext beachten** (App ist bis zum Play-Store eine PWA): Rand-Glow hängt an der App-Shell,
  respektiert `env(safe-area-inset-*)` und läuft nur im `standalone`-Modus; sonst Denk-Leiste.
- `prefers-reduced-motion`: kein Wandern/Atem/Orbit/Bloom/Ring-Puls — statischer Ring bzw. Leiste ohne
  Puls (Fortschritt/ETA als Text), „Fertig" springt direkt aufs Ergebnis (App killt Loops bereits global).
- `AiThinkingModal` mit `role="status"` / `aria-live="polite"`, Fokus-Trap.
- Echte KI-Antwort im `thinking`-State laden; erst nach Antwort **und** minimaler Denk-Dauer auf
  `done/result` wechseln, damit die Animation nicht springt.
- Rein CSS, keine neuen Libs.

**Vorgehen**: Schlage zuerst die Komponenten-Struktur, Datei-Pfade und Prop-/Emit-Signaturen vor
(`AiButton`, `AiActionSheet`, `AiThinkingIndicator` — mit `mode: 'edge' | 'dock'`), warte auf mein OK,
dann implementiere. Halte dich bei Farben, Radien und Timings strikt an das README.
