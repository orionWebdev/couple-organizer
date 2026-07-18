# TwoDo — Dashboard neu + Rezepte/Einkauf · Handoff

Überarbeitung von **drei Screens**: Dashboard (Start), Rezepte, Einkaufsliste. Reiner Screen-Refresh auf Basis der bestehenden Tokens/Utilities — keine Navigations- oder Datenmodell-Änderung.

## Referenz
- `reference/index.html` — interaktiver Prototyp (Light + Dark, alles anklickbar). Enthält Dashboard neu (2×), Rezepte, Einkaufsliste und rechts das Finanz-Widget in **zwei Zuständen** (mit/ohne Budget). Werte darin sind verbindlich.

## Kernentscheidungen
- **Raus:** Budget-Ring, Fairness-Waage, „Ausgleichen"- und „Erinnern"-Buttons.
- **Rein:** persönliche **Schnell-Aufgaben mit Zähler** (mehrfach pro Tag, kein Abhaken), **budget-bewusstes Finanz-Widget** mit schönem Fallback, **Fokus heute** + **Gemeinsam bald**.
- **Rezepte/Einkauf** modernisiert: Foto-Hero, scrollbare Filter, Bereichs-Gruppierung, Fortschritt, Schnell-Add.

## Prinzipien
- Bestehende Tokens (`--dashboard/--haushalt/--planung/--finanzen/--food`, `--chris/--sarah`, `--ease-*`) und Utilities nutzen.
- Light **und** Dark; Emojis als Icon-Sprache in Inhalten; `prefers-reduced-motion` respektieren.
- Personen-Daten nicht fest verdrahten — nur `--chris`/`--sarah` sind konstant.

Reihenfolge & Details: siehe `PROMPT.md`.
