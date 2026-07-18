# Kickoff-Prompt für Claude Code — Dashboard neu + Rezepte/Einkauf

> Kopiere den Block in Claude Code im Wurzelverzeichnis eures Vue-Repos.
> Lege vorher den Ordner `design_handoff_dashboard_rethink/` ins Repo (oder kopiere seinen Inhalt hinein).

---

Wir überarbeiten in unserer Paar-App TwoDo (Vue 3 + CSS Custom Properties in `src/app.css`, keine UI-Library) **drei Screens**: das Dashboard (Start), die Rezepte-Seite und die Einkaufsliste. Im Ordner `design_handoff_dashboard_rethink/` liegt der interaktive Referenz-Prototyp (`reference/index.html`, Light + Dark, alles anklickbar). Werte darin — Farben, Radien, Abstände, Motion — sind verbindlich; nutzt unsere bestehenden Tokens (`--dashboard/--haushalt/--planung/--finanzen/--food`, `--chris/--sarah`, `--ease-*`) und Utility-Klassen. Baut die Designs mit unseren bestehenden Vue-Patterns nach (Composition API, `<script setup>`), kopiert kein Prototyp-Markup 1:1.

Bitte in dieser Reihenfolge, jeweils zur Bestätigung anhalten:

1. **Dashboard neu** — Budget-Ring und Fairness-Waage entfernen. Neue Zonen von oben:
   - **Fokus heute** (Essens-Hero mit „Wer kocht?", zwei Aktionen).
   - **Meine Schnell-Aufgaben** — als **Fortschritts-Ring-Kacheln** (4 Spalten, `grid-template-columns: repeat(4, minmax(0,1fr))`). Jede Kachel: Emoji in einem SVG-Ring, darunter kurzes Label. **Kein Abhaken/Checkbox, sondern ein Zähler** — jeder Tap zählt hoch, der Ring füllt sich (`stroke-dashoffset` animiert, `--ease-overshoot`), eine kleine Badge unten rechts zeigt die Anzahl, Emoji macht kurz „bump". Mehrfach pro Tag möglich; Kopf zeigt Tagessumme + Streak (🔥). Letzte Kachel „Neu" (gestrichelt) zum Festlegen eigener Routinen, plus „Bearbeiten" oben. Optionales `data-goal` je Aufgabe steuert, ab wie vielen Taps der Ring voll ist (Default 1). Referenz: die Ring-Kacheln im Dashboard bzw. `variants/schnell-aufgaben.html` Variante B.
   - **Belegung heute** (aufgelöste Termine, Konflikt-Badge).
   - **Finanzen** — budget-bewusst (siehe Punkt 2).
   - **Gemeinsam bald** (nächstes Date/Reise als emotionaler Anker).

2. **Finanz-Widget, budget-abhängig** (zwei Zustände, `reference/index.html` rechte Spalte):
   - **Budget gesetzt**: Karte zeigt Verbrauch/Rest + Fortschrittsbalken, der Paar-Ausgleich läuft als Nebenzeile mit.
   - **Kein Budget (Fallback)**: schlanke Karte nur mit dem Paar-Ausgleich („Ben schuldet dir 34,50 €"),  erscheint nur bei offener Summe.
   - Beide Zustände teilen **eine** Aktion **„＋ Ausgabe erfassen"**. **Kein** „Ausgleichen"- und **kein** „Erinnern"-Button.

3. **Rezepte modernisiert**: Foto-Hero mit CTA „In Wochenplan" + „🛒 Zutaten", **horizontal scrollbare Filter-Row** (Alle/Favoriten/Schnell/Veggie/Suppen/Süßes — `flex-nowrap`, `overflow-x:auto`, volle Chip-Höhe reservieren) und ein Karten-Grid mit Bild/Zeit/Herz je Person. Foto-Feld als Platzhalter zum späteren Upload.

4. **Einkaufsliste modernisiert**: nach Bereich gruppiert (Obst & Gemüse, Kühlregal, Vorrat), Fortschrittsbalken oben, große Häkchen, „Rezept"-Tags an Zutaten, wer den Artikel eintrug, Schnell-Add-Leiste unten + „Oft gekauft"-Chips.

Randbedingungen: nur diese drei Screens, keine Navigations-/Routenlogik ändern; Light **und** Dark unterstützen; Emojis als Icon-Sprache in Inhalten behalten; `prefers-reduced-motion` respektieren. **Personen-Namen/Initialen sind Paar-Daten** (nicht fest verdrahten) — konstant sind nur `--chris`/`--sarah`. Nach jedem Schritt Build/Lint + Sichtvergleich mit `reference/index.html`. Wo etwas unklar ist, fragen statt raten.

---

**Tipp:** Gib Claude Code Zugriff auf `design_handoff_dashboard_rethink/`. Mit eurer GitHub-Repo-URL schneide ich Pfade und Komponentennamen auf eure echte Struktur zu.
