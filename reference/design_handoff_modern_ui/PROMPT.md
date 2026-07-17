# Kickoff-Prompt für Claude Code — „Modern UI"-Skin für TwoDo

> Kopiere den folgenden Block in Claude Code im Wurzelverzeichnis eures Vue-Repos.
> Lege vorher den Ordner `design_handoff_modern_ui/` ins Repo (oder kopiere seinen Inhalt hinein).

---

Wir modernisieren **ausschließlich die visuelle Ebene** unserer Paar-App TwoDo (Vue 3 + CSS Custom Properties in `src/app.css`, keine UI-Library). **Die Seitenstruktur, das Markup der Screens, Routen, Komponenten-Hierarchie und Logik bleiben unverändert** — es ist ein reiner Skin-/Style-Refresh. Bau **keine** Screens um, verschiebe keine Inhalte, ändere keine Datenflüsse.

Im Ordner `design_handoff_modern_ui/` liegt das Design als Referenz-Prototyp (`reference/index.html`) plus fertige CSS/JS-Bausteine. Übernimm daraus **exakt** Farben, Typo-Skala, Radien, Schatten und Animationen — die Werte sind verbindlich.

Bitte in dieser Reihenfolge, jeweils zur Bestätigung anhalten:

1. **Dark-Theme-Tokens** (`tokens-dark.css`): Ergänze in `src/app.css` einen Dark-Token-Block. Er muss auf zwei Wegen greifen:
   - **Systemgesteuert** über `@media (prefers-color-scheme: dark)` (Default, wenn Nutzer nichts gewählt hat),
   - **manuell übersteuerbar** über `:root[data-theme="dark"]` bzw. `:root[data-theme="light"]`.
   Nutze die Logik aus `theme.js` (Werte: `"system" | "light" | "dark"`, Persistenz in `localStorage`, setzt `data-theme` am `<html>`; bei „system" wird das Attribut entfernt, damit die Media-Query zieht). Verdrahte den bestehenden Einstellungs-Screen mit diesen drei Optionen — **kein** eigener Toggle im Header nötig, außer ihr wollt es.

2. **Modern-Layer** (`modern-layer.css`): Überschreibt unsere vorhandenen Utility-Klassen (`.card`, `.btn-primary`, `.chip`, `.app-field`, `.section-label`) mit der neuen, größeren Ausprägung (Fließtext 16px, größere Überschriften, Tap-Targets ≥ 52px, Karten-Radius 26px, weichere Schatten). Da wir dieselben Klassennamen treffen, ändert sich **nur das Aussehen**, nicht das Markup. Prüfe jede Klasse einzeln gegen bestehende Screens auf Regressionen.

3. **Animationen** (`animations.css`): Feder-Kurven kommen aus unseren vorhandenen Motion-Tokens (`--ease-overshoot` etc.). Übernimm: Karten-Einzug mit Stagger (`.rise-stagger` auf Screen-Container legen), `pop` beim Abhaken, Balken-/Ring-Animation (CSS-Transition auf `width` bzw. `stroke-dashoffset`), FAB-Press. Respektiere `prefers-reduced-motion` (bereits in unserem Base-CSS).

4. **Navigation** (`navigation.css`): Restyle unsere bestehende Bottom-Nav zur schwebenden Pille mit überstehender Bubble im aktiven Bereichston. Das Markup-Contract steht oben in der Datei — passe unsere Nav-Komponente minimal daran an (gleiche Items/Routen, nur Klassen/Struktur der Buttons), ohne Navigationslogik zu ändern.

5. **Globaler Plus-Button** (`fab.css` + `Fab.vue`-Skizze): Führe **einen** globalen FAB unten rechts im App-Shell ein, der **alle bisherigen „Hinzufügen"-Buttons ersetzt**. Er ist kontextabhängig: öffnet je aktivem Tab das passende Add-Sheet (Haushalt → Aufgabe, Finanzen → Ausgabe, Planung → Belegung/Idee, Essen → Gericht/Einkaufsartikel). Entferne die alten Inline-Add-Buttons aus den Screens und route ihre Aktion auf den FAB. Nutzt den aktiven Bereichs-Akzent (`--accent`).

Randbedingungen: nur diese fünf Bausteine, keine weiteren Änderungen. Nach jedem Schritt Build/Lint laufen lassen und ein kurzes Diff-Summary geben. Wo etwas unklar ist, frag nach, statt zu raten.

---

**Tipp:** Gib Claude Code Zugriff auf `design_handoff_modern_ui/`. Wenn du mir die GitHub-Repo-URL gibst, passe ich Datei-Pfade und die Nav-/FAB-Komponentennamen an eure echte Struktur an.
