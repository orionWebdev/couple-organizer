# Handoff: TwoDo KI — einheitliche KI-Identität (AiButton + AiThinkingModal)

## Overview
Eine einzige, wiederverwendbare KI-Komponente ersetzt die heute vier handgebauten
Gradient-Buttons. Der Gemini-artige Gradient bleibt die KI-Signatur. Neu:
- **ein KI-Einstieg pro Seite** (statt gedoppelter Buttons),
- ein **full-bleed Denk-Zustand**, bei dem der animierte Gradient das ganze Sheet/Modal bespielt,
- eine kurze **„Fertig"-Animation** (Bloom & Reveal) direkt vor dem Ergebnis.

Ziel-Set: **`AiButton`** (Varianten `card` + `pill`) und **`AiThinkingModal`** (Denk → Fertig → Ergebnis),
plus ein **KI-Aktions-Sheet** für Seiten mit mehreren KI-Aktionen.

## About the Design Files
Die Datei in diesem Bundle (`twodo-ki-states-and-motion.html`) ist eine **Design-Referenz in HTML** —
ein interaktiver Prototyp, der Aussehen und Verhalten zeigt, **kein** produktiv zu kopierender Code.
Aufgabe: diese Designs im **bestehenden Couple-Organizer-Codebase (Vue 3)** mit dessen Mustern
und Design-Tokens (`src/app.css`) nachbauen — als echte Vue-Komponenten. Der Prototyp nutzt bewusst
Klartext-CSS und ein bisschen Vanilla-JS, damit die Werte 1:1 ablesbar sind.

## Fidelity
**High-fidelity.** Farben, Timings, Radien, Schatten und Copy sind final und sollen pixelgenau
übernommen werden. Der Gradient und die Motion-Werte sind die eigentliche Spezifikation.

---

## Grundsatzentscheidung (Design-Brief §9 — umgesetzt)
- **Multi-Aktion-Seiten** (z. B. Küche: „Woche planen" + „Rezept vorschlagen"):
  **ein** `AiButton` (card) → öffnet ein **KI-Aktions-Sheet** zur Auswahl. Damit verschwinden die
  gedoppelten Buttons. **← empfohlen & ausgearbeitet.**
- **Single-Aktion-Seiten** (Rezept-Wiki, Finanz-Coach): der `AiButton` löst die Aktion **direkt** aus
  (kein Sheet).
- Alternative „mehrere Buttons, nur visuell vereinheitlicht" wurde bewusst **nicht** gebaut.

---

## Design Tokens

### KI-Tokens (neu — in `src/app.css` aufnehmen)
```css
--ai-gradient: linear-gradient(120deg,#4285f4 0%,#9b72cb 35%,#d96570 65%,#f6b73c 100%);
--ai-gradient-size: 220% 220%;                 /* erlaubt das Wandern */
--ai-glow: 0 0 0 1px rgba(255,255,255,.28) inset,
           0 6px 20px -4px rgba(155,114,203,.55),
           0 0 22px rgba(66,133,244,.35);
--ai-textshadow: 0 1px 3px rgba(35,20,60,.6), 0 0 1px rgba(35,20,60,.5);
/* Lesbarkeits-Layer über dem Gradient (Text bleibt in der hellen Amber-Phase lesbar) */
--ai-scrim: linear-gradient(105deg, rgba(28,16,52,.40) 0%, rgba(28,16,52,.12) 52%, rgba(28,16,52,.26) 100%);
```

> **Wichtig (Lesbarkeit):** Jede Fläche mit weißem Text auf dem Gradient rendert den Hintergrund als
> **zwei Layer**: `background: var(--ai-scrim), var(--ai-gradient);` mit
> `background-size: 100% 100%, var(--ai-gradient-size);`. Der Scrim liegt fix (100%), nur der Gradient
> wandert. Ohne den Scrim wird weißer Text auf der hellen Amber-Phase unlesbar.
> Der Gradient ist **theme-unabhängig** — in Light **und** Dark identisch.

### Bestehende Tokens aus dem Repo (unverändert genutzt)
- Flächen/Text light: `--bg #fdfaf5`, `--surface #ffffff`, `--surface-deep #f7f1e6`,
  `--text #2c2823`, `--text-secondary #8c857b`, `--text-faint #b8b0a4`, Rahmen `--border-softer #f0e8db`.
- Flächen/Text **dark** (warme Neutrals): `bg #17130f`, `surface #221c17`, `surface-deep #2b241d`,
  `line #322a22`, `text #f3ece2`, `meta #b0a494`, `faint #7d7365`.
- Küche-Akzent: `--food` (oklch(0.66 0.15 25)), Finanzen: `--finanzen` (oklch(0.69 0.10 195)).
- Fonts: `--font-headline: 'Fredoka'` (Titel/Zahlen, weight 600–700),
  `--font-body: 'Nunito'` (UI/Text, weight 600–800).
- Radien: card 20–22px, sheet 26–28px, tile 13–15px, chip/pill 999px.
- Easing: `--ease-overshoot: cubic-bezier(.34,1.56,.64,1)`, `--ease-standard: cubic-bezier(.4,0,.2,1)`.

---

## Components

### 1. `AiButton` — Variante `card` (voller Einstieg)
- Layout: `display:flex; align-items:center; gap:13px; width:100%; padding:15px; border-radius:20px`.
- Hintergrund: `--ai-scrim, --ai-gradient` (s. o.); `box-shadow: var(--ai-glow)`; `color:#fff`.
- Animation: `aiShift 6s ease-in-out infinite`. `:active { transform: scale(.98) }` (120ms ease).
- Aufbau:
  - **Icon-Chip** 34×34, `border-radius:11px`, `background:rgba(255,255,255,.25)`,
    `inset 0 0 0 1px rgba(255,255,255,.4)` + `0 2px 8px rgba(0,0,0,.14)`; Emoji 18px.
  - **Text** (Spalte, `text-shadow: var(--ai-textshadow)`): Titel Fredoka 600/16px („TwoDo KI"),
    Subtitle Nunito 700/12.5px, `rgba(255,255,255,.9)` („Wochenplan & Rezepte vorschlagen").
  - **Chevron** `›`, 26px, `rgba(255,255,255,.92)`, weight 300.
- **Plus-Badge-Slot** (Feature gesperrt): Pill rechts statt Chevron —
  `background:rgba(255,255,255,.28); color:#fff; font 10.5px/800; padding:4px 10px; border-radius:999px`,
  Text „PLUS".

### 2. `AiButton` — Variante `pill` (kompakt, z. B. Kartenkopf Finanz-Coach)
- `display:inline-flex; gap:8px; padding:9px 15px 9px 12px; border-radius:999px`, gleicher Grad/Scrim/Glow/Anim.
- Icon-Chip 24×24 (`border-radius:8px`, `rgba(255,255,255,.24)`, `inset 0 0 0 1px rgba(255,255,255,.4)`),
  Label Nunito 800/13.5px + `text-shadow`.

> **Spezifitäts-Hinweis (bug im Prototyp gefunden & gefixt):** Die App-`.card`-Klasse überschrieb den
> Gradient, wenn der Button gleichzeitig `.card` trug. In der Vue-Umsetzung ist das kein Thema, solange
> der Button seine eigene Klasse hat und **nicht** die generische `.card`-Kartenklasse. Falls doch:
> Gradient auf die kombinierte Selektor-Ebene (`.ai-btn--card`) legen.

### 3. KI-Aktions-Sheet (nur Multi-Aktion-Seiten)
- Bottom-Sheet: `background: var(--surface); border-radius:28px 28px 0 0; padding:8px 18px 26px;`
  Schatten `0 -14px 34px rgba(60,45,30,.2)` (dark: `…rgba(0,0,0,.5)`).
- Scrim dahinter: `rgba(30,22,14,.44)`, `opacity 0→1`, 280ms ease.
- Einfahren: `transform: translateY(112%) → 0`, `var(--dur-sheet-open) 420ms var(--ease-overshoot)`.
- Grip 40×5, `border-radius:3px`, `--border-softer`. Titel Fredoka 600/18px („Was soll die KI tun?").
- **Zeilen** (`aiRow`): `display:flex; gap:13px; padding:12px; background: var(--surface-deep); border-radius:17px`.
  - Icon 46×46, `border-radius:14px`, **Gradient nur als Akzent** (`--ai-gradient`, `background-size:200% 200%`,
    `box-shadow: var(--ai-glow)`, `aiShift 6s`) — **nicht flächig** aufs Sheet.
  - Titel Fredoka 600/15.5px, Subtitle Nunito 700/12.5px `--text-secondary`, Chevron rechts `--text-faint`.
  - Aktionen: 🪄 „Ganze Woche planen" / „7 Abendessen als kompletter Vorschlag" · ✨ „Rezept vorschlagen" / „Eine Idee für heute Abend".

### 4. Denk-Zustand — Modal-Glow ist der PRIMÄRE Weg (aktualisiert)
Der Screen bleibt beim „Denken" **sichtbar**. Es gibt **keinen Vollbild-Denkzustand mehr** — der
full-bleed Gradient wird **nur noch für den finalen Bloom** (§5, ~480 ms) kurz vor dem Ergebnis genutzt.
Welcher Denk-Baustein greift, hängt davon ab, **wie** die Aktion ausgelöst wurde:

**4·PRIMÄR — „Denken aus dem Modal" (Sheet-Glow) — für ALLE Sheet-Aktionen**
Die KI-Aktionen „Ganze Woche planen" und „Rezept vorschlagen" starten aus dem **Aktions-Sheet** (§3).
Statt irgendwohin zu wechseln, wird **das Sheet selbst zum Denk-Zustand** — es bleibt offen und glüht.
Neuer State `sheetthink` **zwischen `sheet` und `done`** (NICHT der alte Vollbild-`thinking`).
- Beim Tap einer `aiRow`: **Sheet bleibt offen** (`transform: translateY(0)`), Scrim bleibt sichtbar.
  Zeilen (`.aiRow`) + Titel `display:none`, eine **Denk-Zeile** wird sichtbar.
- **Denk-Zeile** (`display:flex; gap:13px; padding:13px 12px; background: var(--surface-deep); border-radius:17px`):
  Aktions-Icon 46×46 Gradient-Kachel (`--ai-gradient`, `background-size:200% 200%`, `box-shadow: var(--ai-glow)`,
  `aiShift 4s`) · Status-Text (Fredoka 600/15.5px + Nunito 700/12.5px Untertitel) · **Mini-Loader**.
- **Glow um das Sheet:** eigenes Aura-Element **hinter** dem Sheet (`position:absolute; left:-3px; right:-3px;
  top:-5px; bottom:0; border-radius:32px 32px 0 0; z-index:-1; background:var(--ai-gradient);
  background-size:300% 300%; filter:blur(22px); opacity:.78; animation: aiShift 4s + edgeBreath 2.8s`) —
  ragt nur als weicher Schein über die Sheet-Kanten hinaus. Zusätzlich **Gradient-Hairline** (3px) an der
  Sheet-Oberkante via `::before` (gleicher Gradient, `aiShift 3s`), im Denk-State `opacity 0→1`.
- **Fortschritt:** dünne Gradient-Leiste im Sheet (`height:3px; background: color-mix(#9b72cb 16%,transparent)`;
  Füllung `::after width:42%`, `barSlide 1.6s` + `aiShift 3s`).
- **Status je Aktion:** Woche → „Plant eure Woche …" / „7 Abendessen werden zusammengestellt" (Icon 🪄);
  Rezept → „Sucht ein Rezept …" / „Passend zu euren Vorräten" (Icon ✨).
- **Mini-Loader auf hellem Sheet-BG:** die zwei TwoDo-Kreise in **Akzent-Lila** statt Weiß —
  22×16 Container `aiSpin 2.2s`; Kreise 12×12, links `#9b72cb` (dark `#c3a9e6`), rechts
  `color-mix(#9b72cb 32%,transparent)` + `inset 0 0 0 2px #9b72cb`, beide `aiPulse 1.6s` (rechter +.8s).
- **Ende:** kurzer Bloom (§5), Sheet schließt, Ergebnis erscheint im Screen.
- **Nav-sicher:** Das Sheet liegt ohnehin über der Navigation; der Glow bleibt in seinem Rahmen.
  Referenz: **Sektion 7** in `twodo-ki-states-and-motion.html`.

**4·SEKUNDÄR — verankerter Glow für Direkt-Auslöser OHNE Sheet** (Rezept-Wiki, Finanz-Coach)
Single-Aktion-Seiten haben kein Sheet, also verankert der Denk-Effekt an einem Content-Element (nie am
Bildschirmrand, nie über der Nav). Referenz: **Sektion 6**.
- **6·A · Auslöser-Halo (Standard):** weicher, atmender Gradient-Schein **nur um den KI-Button**
  (Aura-Element `inset:-7px; border-radius:26px; filter:blur(16px); opacity:.72; aiShift 4s + edgeBreath 2.6s`);
  Button-Text wird zu Mini-Loader (weiß, auf Gradient) + „plant …".
- **6·C · Ziel-Karte glüht (wenn ein Ziel-Element existiert):** die Karte, in der das Ergebnis erscheint,
  bekommt einen animierten Gradient-Rahmen (Mask-Composite-Ring, `aiShift 3.5s`) + Inline-Loader.

> **Auswahl-Regel:** Aktion kommt aus einem **Sheet** → **Sheet-Glow (4·PRIMÄR)**. Aktion ist ein
> **Direkt-Auslöser ohne Sheet** → **Auslöser-Halo (6·A)**, optional Ziel-Karte (6·C). **Kein Vollbild**
> außer dem finalen Bloom (§5). Der Rand-Glow-am-Viewport (frühere §5·1) und die Denk-Leiste sind
> **verworfen** — Rand wirkt auf echten Geräten unnatürlich, Dock/Pille kollidieren mit der Navigation.

### 4-alt. `AiThinkingModal` — Vollbild (VERWORFEN als Denk-Zustand)
Die frühere full-bleed Variante (wandernder Gradient + Atem + Blobs) liegt in der Referenz-HTML noch als
Sektion 1–3, wird aber **nicht mehr als Denk-Zustand** verwendet. Übernimm daraus nur den
**Bloom-&-Reveal-Übergang** (§5) als Abschluss vor dem Ergebnis.

### 5. „Fertig" — Bloom & Reveal (D, einmalig ~480 ms)
- Beim Übergang `thinking → done`:
  - `tmGrad` wird heller: `aiBrighten .48s ease-out forwards` (brightness 1 → 1.55), Wandern läuft weiter.
  - **Bloom**: weißer radialer Kreis in der Mitte, `aiBloom .48s cubic-bezier(.22,1,.36,1) forwards`
    (`scale .2 → 4`, opacity-Peak bei 35%, endet transparent).
  - Status-Text faded aus (`opacity → 0`, 180ms).
- Danach `done → result`: Modal `opacity → 0` (320ms) und gibt das Ergebnis frei.

### 6. Ergebnis (E)
- Neutraler Sheet-/App-Hintergrund (light/dark) mit Ergebnis-Karten.
- Der Gradient **lebt nur noch im primären Aktions-Button** weiter (`btnGrad`, gleiche Grad/Scrim/Glow/Anim
  wie `AiButton`, `border-radius:15px`, Fredoka 600/15px, `text-shadow`). Sekundär daneben ein Ghost-Button
  (`border:1px solid line; background: surface`).
- Beispiel Küche-Ergebnis: Karte „✨ KI-Vorschlag", 4–7 Tageszeilen (Kürzel · Emoji · Gericht + Meta),
  primär „Einkaufsliste erstellen", sekundär „Anpassen".

---

## Motion-Spec (exakte Werte)
| Moment | Dauer | Easing |
|---|---|---|
| Gradient-Wandern (idle Button) | `aiShift` 6s loop | ease-in-out |
| Gradient-Wandern (Denk-Modal) | `aiShift` 4s loop | ease-in-out |
| „Atem" (Denk-Modal) | `aiBreath` 2.4s loop — scale 1→1.04, brightness 1→1.12 | ease-in-out |
| Marken-Loader Orbit | `aiSpin` 2.2s loop | linear |
| Marken-Loader Puls | `aiPulse` 1.6s loop (c2 +.8s) — scale .8→1 | ease-in-out |
| Blob-Drift | 7–9s loop | ease-in-out |
| Fertig (Bloom & Reveal) | ~480 ms einmalig — Bloom scale .2→4, brightness →1.55 | overshoot/ease-out |
| Ergebnis fade-in | 200 ms (+8px rise) | ease-out |
| Button :active | 120 ms — scale .98 | ease |

### Keyframes
```css
@keyframes aiShift    { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
@keyframes aiBreath   { 0%,100%{transform:scale(1);filter:brightness(1)} 50%{transform:scale(1.04);filter:brightness(1.12)} }
@keyframes aiBrighten { 0%{filter:brightness(1)} 100%{filter:brightness(1.55)} }
@keyframes aiBloom    { 0%{opacity:0;transform:scale(.2)} 35%{opacity:1} 100%{opacity:0;transform:scale(4)} }
@keyframes aiDrift1   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(42px,-30px)} }
@keyframes aiDrift2   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-42px,30px)} }
@keyframes aiSpin     { to{transform:rotate(360deg)} }
@keyframes aiPulse    { 0%,100%{transform:scale(.8)} 50%{transform:scale(1)} }
/* Inline-Denk-Zustände (4a/4b) */
@keyframes edgeBreath { 0%,100%{opacity:.55} 50%{opacity:1} }
@keyframes dockIn     { from{transform:translateY(16px);opacity:0} to{transform:none;opacity:1} }
@keyframes dockFill   { from{width:0} to{width:100%} }
```

---

## Interactions & Behavior (State-Maschine)
Der Flow: `idle → sheet → sheetthink → done → result` (Sheet-Aktionen) bzw.
`idle → thinking → done → result` (Direkt-Auslöser ohne Sheet, Denk-Effekt = 6·A/C).
- **idle**: Screen mit `AiButton` (card).
- Tap `AiButton` (Multi-Aktion) → **sheet** (Bottom-Sheet + Scrim). Tap Scrim → zurück zu **idle**.
- Tap Sheet-Zeile → **sheetthink**: **Sheet bleibt offen und wird zum Denk-Zustand** (Glow, Denk-Zeile,
  Fortschrittsleiste; §4·PRIMÄR). Status-Text je `aiAction` setzen.
- Single-Aktion-Seiten (kein Sheet) überspringen `sheet`/`sheetthink` und zeigen den verankerten
  Denk-Effekt am Auslöser (**6·A Halo**, optional **6·C Ziel-Karte**).
- Nach Antwort **und** min. Denk-Dauer → **done**: kurzer **Bloom** (§5, ~480 ms) → **result**.
- Ergebnis-Button „Anpassen" → **idle**; primärer Gradient-Button kann erneut denken starten.
- Timer beim Reset/Abbruch löschen.

## State Management (Vue)
- `aiStep: 'idle' | 'sheet' | 'sheetthink' | 'thinking' | 'done' | 'result'`
  (`thinking` nur für Direkt-Auslöser ohne Sheet; Sheet-Aktionen nutzen `sheetthink`).
- `thinkMode: 'sheet' | 'halo' | 'target'` — `'sheet'` sobald die Aktion aus einem Sheet kommt (Standard),
  sonst `'halo'` (6·A) bzw. `'target'` (6·C, wenn ein Ziel-Element existiert). **Kein `'edge'`/`'dock'` mehr.**
- `aiAction: 'week' | 'recipe'` (steuert Status-Text und Ergebnis-Inhalt).
- `statusText` abgeleitet aus `aiAction`.
- Ergebnis-Daten (Wochenplan/Rezept) via bestehenden KI-Endpoint laden, während `thinking`;
  erst nach Antwort **und** min. Denk-Dauer auf `done/result` wechseln (min-delay, damit die Animation
  nicht springt).

## Accessibility / Rahmen
- Mobile-first PWA, Touch-Targets **≥ 44px** (Icon-Buttons 46px, Sheet-Zeilen ≥ 68px).
- **Light & Dark**: Gradient bleibt gleich; nur Umfeld/Sheet-Grund/Text wechseln (Token-Werte oben).
- **`prefers-reduced-motion`**: kein Wandern/Atem/Bloom/Glow-Puls — Sheet-Glow &amp; Halo **statisch**
  (Gradient ruht), Fortschrittsleiste ohne Slide, „Fertig" springt direkt aufs Ergebnis.
  (Die App killt Loops bereits global über `prefers-reduced-motion` in `app.css`.)
- **PWA / Safe-Areas**: Sheet liegt über der Navigation, Glow bleibt im Sheet-Rahmen — keine
  Viewport-Rand-Effekte mehr, daher keine Safe-Area-Sonderfälle für den Denk-Zustand nötig.
- `AiThinkingModal` mit `role="status"` / `aria-live="polite"` für den Status-Text; Modal fokus-trappen.
- Rein CSS/HTML, keine externen Libs/Assets.

## Assets
Keine Bilddateien. Icons sind Emoji (🪄 Autopilot/Woche, ✨ Rezept, 📊 Finanz-Coach, 🔍 Suche).
Logo-Referenz für den Loader: die zwei überlappenden Marken-Kreise
(`components/TogetherLogo.jsx`, `brand/together-loading.html`).

## Files
- `twodo-ki-states-and-motion.html` — interaktiver Prototyp + Specimens A–E (Light & Dark) + Spec-Panel.
  **Sektion 7** = Denk-Zustand aus dem Sheet (Modal-Glow, der primäre Weg); **Sektion 6** = verankerte
  Glows für Direkt-Auslöser (6·A Halo, 6·C Ziel-Karte). Enthält alle CSS-Klassen/Keyframes und die
  JS-State-Maschine als Referenz-Implementierung.
