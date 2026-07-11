# Handoff: Together — Branding (Logo, App-Icon, Ladebildschirm)

## Overview
Marken-Paket für die Paar-Organizer-App **„Together"** (intern: Paarplaner). Enthält die
Logo-Marke (Symbol + Wortmarke), das App-Icon und den animierten Ladebildschirm (Splash),
der beim ersten Öffnen der App erscheint. Die gewählte Symbol-Richtung ist **A · Overlap**:
zwei überschneidende Kreise in den beiden „Personenfarben" der App.

## About the Design Files
Die Dateien in diesem Paket sind **Design-Referenzen in HTML/CSS** — Prototypen, die
Aussehen und Verhalten zeigen, **kein** direkt zu übernehmender Produktionscode.
Aufgabe ist, diese Designs in der Umgebung des Ziel-Repos nachzubauen. Das echte Repo ist
eine **Vue-3-App** (`src/app.css` ist die Quelle des Design-Fundaments) — die Marke dort mit
den bestehenden Patterns umsetzen. Falls in React o. ä. gearbeitet wird: die mitgelieferte
`TogetherLogo`-Komponente ist bereits framework-nah (liest `window.React`) und kann als Vorlage dienen.

## Fidelity
**High-fidelity.** Finale Farben, Typografie, Maße, Geometrie und Animations-Timing sind
verbindlich. Marke pixelgenau nachbauen; für Flächen/Text die vorhandenen Design-Tokens nutzen.

---

## Design Tokens (verbindlich)

Alle Werte stammen aus dem Design-Fundament (`tokens/tokens.css`). Farben teils OKLCH.

**Personen-/Markenfarben**
- Terrakotta (linker Kreis, `--haushalt` / `--chris`): `oklch(0.70 0.15 38)`
- Türkis (rechter Kreis, `--finanzen` / `--sarah`): `oklch(0.69 0.10 195)`

**Flächen & Text**
- `--bg` App-Hintergrund: `#fdfaf5` (warmes Off-White)
- `--surface` Karten: `#ffffff`
- `--surface-deep` Felder/Stage: `#f7f1e6`
- `--text`: `#2c2823` · `--text-secondary`: `#8c857b` · `--text-meta`: `#9a9286` · `--text-faint`: `#b8b0a4`
- Ränder: `--border-soft` `#e9e0d0` · `--border-softer` `#f0e8db`
- Tints: `--haushalt-tint` `oklch(0.955 0.03 40)` · `--finanzen-tint` `oklch(0.95 0.03 195)`

**Typografie**
- Wortmarke & Überschriften: **Fredoka**, Gewicht **600**, `letter-spacing: -0.5px`
- Fließtext/UI: **Nunito**, Gewicht 600
- (beide lokal gebündelt, siehe `fonts/`)

**Radien**: Karte 16px · groß 20px · Kachel 13px · Chip 11px
**Schatten**: `--shadow-card` `0 4px 12px rgba(60,45,30,.05)` · `--shadow-float` `0 10px 22px rgba(60,45,30,.14)`
**Motion**: `--ease-standard` `cubic-bezier(0.4,0,0.2,1)` · `--ease-overshoot` `cubic-bezier(0.34,1.56,0.64,1)`

---

## Die Marke — Geometrie (verbindlich)

Symbol = ein SVG, `viewBox="0 0 120 90"`, zwei Kreise:
- Kreis A: `cx=46 cy=45 r=33`, Fill = Terrakotta
- Kreis B: `cx=74 cy=45 r=33`, Fill = Türkis
- Gruppe: `mix-blend-mode: multiply` auf hellem Grund (Überschneidung dunkelt ein → „geteilter Raum").
  Auf **dunklem** Grund stattdessen `mix-blend-mode: screen`, damit das Symbol hell leuchtet.
- Seitenverhältnis: Breite = Höhe × 120/90 (= 1.333).

Wortmarke: Text „Together", Fredoka 600, `letter-spacing:-0.5px`, Farbe `--text` (bzw. `#fdfaf5` auf dunkel).
Claim (optional): „Euer Zuhause, gemeinsam." — Nunito 600, `--text-secondary`.

Lockup-Abstände (relativ zur Symbolhöhe h):
- horizontal: Gap Symbol↔Text ≈ `0.30 × h`
- vertical: Gap ≈ `0.28 × h`, zentriert
- Wortmarke-Größe ≈ `0.62 × h`, Claim ≈ `max(11, 0.20 × h)`

---

## Screens / Views

### 1. Logo-Übersicht (`brand/together-logo.html`)
Referenz-Sheet. Zeigt Hero-Lockup, die gewählte Richtung A (+ dokumentierte Alternativen
B „Rings" = zwei verhakte Ringe, C „Whole" = geteilter Kreis), Wortmarken-Treatments,
Skalierbarkeit (88→20px) und Kontrast (Off-White / Tint / Dunkel).
**Für die Implementierung zählt nur Richtung A.**

### 2. App-Icon (`brand/together-app-icon.html`)
- **Kachel**: gerundetes Quadrat, iOS-Rundung ≈ 22 % der Kantenlänge
  (120px→27px, 80→18, 60→14, 170→38 Radius).
- **Hintergrund (empfohlen, „Hell")**: `#ffffff` mit zwei weichen Radial-Tints:
  `radial-gradient(120% 120% at 30% 20%, var(--haushalt-tint) 0%, transparent 55%)`,
  `radial-gradient(120% 120% at 75% 90%, var(--finanzen-tint) 0%, transparent 55%)`.
- **Symbol**: zentriert, Multiply-Blend, Höhe ≈ 42 % der Kachel.
- **Varianten**: Terrakotta-Vollfläche (linker Kreis → weiß, 92 % Deckkraft) und Türkis-Vollfläche (rechter Kreis → weiß).
- Schatten schwebend: `--shadow-float`.

### 3. Ladebildschirm / Splash (`brand/together-loading.html`)
Vollflächiger Startbildschirm, Symbol **baut sich animiert auf**.
- **Hintergrund**: `radial-gradient(130% 80% at 50% 12%, #ffffff 0%, var(--bg) 60%)`.
- **Aufbau**: Symbol mittig, darunter Wortmarke „Together", darunter Claim; Loader-Dots unten.
- (Der Prototyp zeigt es in einem Telefon-Rahmen — der Rahmen ist nur Präsentation, nicht Teil des Splash.)

---

## Interactions & Behavior — Splash-Animation (verbindlich)

Eine 5 s-Endlosschleife (`animation-iteration-count: infinite`), Timing-Funktion `--ease-standard`.
Prozentwerte = Keyframe-Positionen im 5 s-Zyklus.

**Linker Kreis** (`slideL`) — startet links außerhalb, kommt mit Overshoot herein:
- 0 %: `translateX(-170px) scale(.5)`, opacity 0
- 8 %: `translateX(16px) scale(1.05)`, opacity 1  *(Overshoot über die Mitte hinaus)*
- 14 %: `translateX(0) scale(1)`
- 80 %: gehalten, opacity 1
- 92 %: `translateX(-10px) scale(.85)`, opacity 0
- 100 %: zurück zum Start

**Rechter Kreis** (`slideR`): spiegelbildlich (Start `+170px`, Overshoot `-16px`).

**Wortmarke** (`wordIn`): 0–15 % versteckt (`translateY(16px) scale(.95)`, opacity 0) → 28 % `translateY(0) scale(1)` opacity 1 → gehalten bis 80 % → 92 % aus (`translateY(-8px)`).

**Claim** (`tagIn`): 0–24 % versteckt → 38 % eingeblendet → ~90 % aus.

**Atmen** (`breathe`, separat auf dem Symbol-Wrapper): `scale(1) ↔ scale(1.03)`, 2.8 s, ease `--ease-standard`, infinite.

**Loader-Dots** (`blink`): 3 Punkte je 8×8px, `--text-faint`, opacity/scale-Puls 1.4 s, Delays 0 / .2 s / .4 s.

**Reduced motion**: bei `prefers-reduced-motion: reduce` alle Animationen aus, Endzustand statisch anzeigen (Symbol + Wortmarke + Claim sichtbar).

**Echtes Verhalten in der App**: Der Splash läuft bei App-Start, bis Init/Auth/erste Daten geladen sind, dann Übergang zum ersten Screen. Der Loop dient nur der Vorschau; in der App genügt ein Durchlauf des Aufbaus + Halten, bis fertig geladen.

---

## Component — TogetherLogo

Fertige, framework-nahe Komponente (liegt bei: `components/TogetherLogo.jsx` + `.d.ts` + Vorschau `.html`).
Rendert Symbol + optionale Wortmarke. Props:

- `height?: number` (Standard 64) — Symbolhöhe in px; Wort & Claim skalieren mit
- `variant?: "mark" | "horizontal" | "vertical"` (Standard "horizontal")
- `word?: string` (Standard „Together"; leer = nur Symbol)
- `tagline?: string` (leer = kein Claim)
- `colorA?: string` (Standard `var(--haushalt)`) · `colorB?: string` (Standard `var(--finanzen)`)
- `wordColor?: string` (Standard `var(--text)`)
- `blendMode?: "multiply" | "screen" | "normal"` (Standard "multiply"; auf dunklem Grund `"screen"`)

Im Design-System liegt sie unter dem Namespace `CoupleOrganizerDesign` (Bundle `_ds_bundle.js`).

## Assets
Keine Bitmaps. Symbol/Icon sind vollständig aus SVG-Kreisen + CSS aufgebaut (siehe Geometrie oben).
Schriften Fredoka + Nunito liegen lokal in `fonts/` (woff2). Keine externen Bild-Assets.

## Files
- `brand/together-logo.html` — Logo-Übersicht / Richtungen
- `brand/together-app-icon.html` — App-Icon in Größen + Homescreen-Mock
- `brand/together-loading.html` — animierter Ladebildschirm
- `components/TogetherLogo.reference.txt` — Marken-Komponente (Quelle + Prop-Typen als Snapshot; aktive Version im DS unter `components/TogetherLogo.jsx`)
- `styles.css`, `tokens/tokens.css`, `fonts/fonts.css` — Design-Fundament (Referenz; im Ziel-Repo bereits vorhanden als `src/app.css`)
