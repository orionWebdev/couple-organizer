# design-sync — Notizen

## Warum „foundation-only"
Dieses Repo ist eine **Vue 3**-App, kein React-Komponenten-Library-Repo. Claude Design
rendert React-Komponenten — Vue-SFCs können dort nicht laufen. Deshalb wird **nur das
Design-Fundament** synchronisiert (Tokens, Schriften, Styling), damit der Design-Agent
markengetreue Designs im Paarplaner-Look baut. Der übliche Konverter (`package-build.mjs`,
Storybook-Shape) ist hier **nicht** anwendbar; das Bundle wird von Hand gebaut.

## Bundle-Quelle
- Einzige Quelle der Tokens/Utilities: `src/app.css`. Bei Änderungen dort das Bundle neu erzeugen.
- Schriften: **Nunito** (Body) + **Fredoka** (Headline) — NICHT Mali/Lobster (so steht es
  veraltet in `CLAUDE.md`). Im Repo selbst liegen keine Font-Dateien; sie werden per
  Google-Fonts-CDN geladen und für das Bundle als lokale `.woff2` (latin + latin-ext)
  heruntergeladen.

## Bundle bauen (manuell)
Skript liegt im Scratchpad (`dl_fonts.py` lädt die Fonts). Bundle-Layout:
`styles.css` (Einstieg) → `@import` von `fonts/fonts.css` + `tokens/tokens.css`;
Vorschau-Karten unter `guidelines/*.html` mit `@dsCard`-Markern.

## Ziel-Projekt
Claude Design: „Couple Organizer Design" (ID in config.json). Erststand: Fundament ohne
Komponenten. Karten in der Design-System-Ansicht: „Farbpalette", „Typografie" (Gruppe „Fundament").
