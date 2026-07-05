# Redesign-Referenz: Nido — Haushalt / Einkauf / Finanzen

## Was ist das hier
Design-Referenz für ein Redesign eurer bestehenden Play-Store-App. Die Dateien zeigen die gewünschte **Zielästhetik** (Farben, Typografie, Komponenten, Layout-Gefühl) — sie sind **kein Code zum 1:1-Kopieren** in eure App. Aufgabe für Claude Code: die bestehenden Screens (Struktur/Funktion bleibt) optisch in diese Sprache übersetzen, unter Verwendung des bestehenden Tech-Stacks/Theming-Systems der App.

## Dateien
- `reference/01-onboarding.png` — Onboarding
- `reference/02-home.png` — Home / Dashboard (Bereiche: Haushalt, Einkauf, Finanzen)
- `reference/03-zuweisungen.png` — Haushalt-Seite, Tab „Zuweisungen": feste Zuständigkeit pro Aufgabe + wer sie zuletzt gemacht hat (tabellenartig, gruppiert nach Person)
- `reference/06-essensplan.png` — Wochen Essensplan: 7-Tage-Liste mit Rezepten, KI-Rezeptvorschlag-Einstieg, Button zum Erstellen der Einkaufsliste aus dem Plan
- `reference/07-dashboard-bento.png` — Neues Dashboard im Bento-Grid: Essensplan heute + "Wer kocht?", Einkauf-Mini-Checkliste, Haushalt-Quick-Check, Finanzen-Budget
- `reference/08-essensplan-modal.png` — Rezept-Detail-Modal aus dem Essensplan: Nährwerte (nur wenn hinterlegt), Zutaten zum Abhaken, nummerierte Zubereitung
- `reference/09-rezept-wiki.png` — Rezept-Wiki: Suche, Kategorie-Filter-Badges, Karten-Grid mit Tags (Formular zum Anlegen ist im Live-Prototyp enthalten, hier nicht abgebildet)
- `reference/10-nav-dashboard.png`, `reference/11-nav-essen.png` — Neue Bottom-Navigation: schwebende Bubble je Bereich in dessen Akzentfarbe (Dashboard = Indigo, Haushalt = Terrakotta, Finanzen = Türkis, Essen/Einkauf = Amber). Beim Wechsel springt die Bubble mit Bounce zum neuen Punkt und lässt auf dem Weg Farbtropfen in der vorherigen Farbe fallen, die sich auflösen (im Screenshot nicht sichtbar — siehe Animationsbeschreibung im Prompt/Quellcode)
- `reference/04-finanzen.png` — Gemeinsame Kasse (Ausgaben, Split, Ausgleich)
- `reference/05-einkauf.png` — Einkaufsliste, gruppiert nach Kategorie
- `reference/Nido-source-code.dc.html` — der tatsächliche Design-Quellcode (HTML/CSS-Werte: exakte Farben, Radien, Schatten, Schriftgrößen). Nutzt das, um exakte Werte abzulesen — kein Rendering-Framework, nur Referenz für Zahlen.

## Designsprache
- **Fonts**: Fredoka (700, Headlines/Zahlen), Nunito (600–700, Fließtext/Labels)
- **Bereichsfarben** (je eigene Akzentfarbe, in OKLCH definiert im Quellcode):
  - Haushalt → Terrakotta/Koralle (`oklch(0.70 0.15 38)`)
  - Einkauf → Amber/Gelb (`oklch(0.78 0.13 80)`)
  - Finanzen → Türkis/Blau (`oklch(0.69 0.10 195)`)
- **Formen**: großzügige Radien (16–22px Karten, 13–15px Icon-Kacheln), weiche Schatten, viel Weißraum, Hintergrund off-white (`#fdfaf5`)
- **Muster**: farbige Icon-Kacheln pro Bereich, abhakbare Listenzeilen mit farbiger Checkbox + Avatar-Chip ("wer ist zuständig"), Fortschrittsbalken in Bereichsfarbe, große Bottom-Nav mit zentralem Plus-Button

## Aufgabe für Claude Code
1. Bestehende Screens (eigene App) beibehalten in Funktion/Flow/Datenmodell.
2. Farben, Typografie, Radien, Spacing, Komponenten gemäß obiger Sprache neu gestalten — Werte exakt aus `Nido-source-code.dc.html` übernehmen (nicht neu erfinden).
3. Bestehendes Theming-/Component-System der App nutzen, keine Inline-Styles falls das Projekt schon ein Theme hat.
4. Bei Unklarheiten zu Screens/Flows nachfragen statt zu raten.
