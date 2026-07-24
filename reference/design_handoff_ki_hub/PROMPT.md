# Claude-Code-Prompt — KI-Hub (dauerhafter KI-Button + zentrales Aktions-Modal)

Kopiere den Block unten als ersten Prompt in Claude Code (im Root des Couple-Organizer-/TwoDo-Repos).
Referenzen liegen neben dieser Datei:
- `nav-links-ki-hub.html` — bedienbarer Prototyp (öffne ihn im Browser, alles ist klickbar)
- `shared.css` — enthält die KI-Tokens + `@keyframes aiShift`, die in `src/app.css` gehören

**Screenshots zieh dir selbst** aus dem Prototyp (Headless-Browser), und verlass dich auf das
gerenderte Verhalten + den Code, nicht auf meine Prosa.

```bash
npx playwright screenshot --viewport-size=470,940 nav-links-ki-hub.html shot-hub.png
```

---

Baue in dieser Vue-3-App einen **zentralen KI-Hub** und **entferne dafür alle verstreuten
KI-Einstiege** aus den übrigen Screens. Referenz und Zielverhalten: `nav-links-ki-hub.html`
(bedienbarer Prototyp) — sieh ihn dir gerendert an und bau ihn als echte Vue-Komponenten mit den
bestehenden Tokens (`src/app.css`) nach. Die Datei ist Referenz, **kein zu kopierender Code**.

## 1) Struktur: schmale Nav links, KI-Button rechts
- Die (nach dem 3er-Umbau) dreispaltige Bubble-Nav wird **schmal und linksbündig** (im Prototyp
  244 px, `left: 14px`) statt über die volle Breite zentriert.
- Rechts daneben sitzt ein **dauerhaft sichtbarer KI-Button** (`ki-fab`, Gradient-Quadrat mit
  „✨ KI"), auf gleicher Fußzeilenhöhe wie die Nav. Er ist **global** — auf jedem Tab sichtbar.
- Damit löst sich zugleich die alte **FAB-Kollision** (siehe `../explorations/nav-3er/README.md`):
  Nav und KI-Button teilen sich die Fußzeile nebeneinander, nichts überlappt mehr. Ob der
  reguläre „＋"-FAB bleibt und wo, mit mir klären (siehe offene Frage unten).

## 2) Der KI-Button öffnet ein Bottom-Sheet-Modal mit ALLEN KI-Funktionen
Ein Tap öffnet den **KI-Hub** (`kimodal`). Erste Ebene „Womit soll ich helfen?":
- Ein Raster aller KI-Aktionen. Im Prototyp: **Wochenplan, Rezept finden, Einkaufsliste,
  Wochenrückblick, Aufgaben (fair verteilen), Budget-Blick.**
- Darunter, getrennt durch „und dich selbst", der **private Stimmungs-Check** (Emoji-Skala):
  wird still für den Wochenrückblick protokolliert, landet **nie** beim Partner. Genau der
  Datenschutz-Ton aus dem Wir-Redesign.

**Mehrstufig, je nach Aktion:**
- **Wochenplan / Rezept** → zweiter Schritt (`compose`): **Tag wählen** (Mo–Fr oder ganze Woche)
  + **Freitext-Prompt** „Was schwebt dir vor?" mit Vorschlags-Chips (Vegetarisch, Unter 30 Min …).
- **Einkaufsliste** → zweiter Schritt (`listpick`): **auf welche Liste** (bestehende Listen +
  „neue Liste anlegen").
- **Direkt-Aktionen** (Rückblick, Aufgaben, Budget) starten ohne Zwischenschritt.
- Jeder Unterschritt hat einen **Zurück-Pfeil** zur Hub-Ebene.

## 3) Denk-Zustand — das Modal selbst glüht (bereits designt)
Jeder KI-Aufruf löst den **Denk-Zustand** aus, wie im KI-Handoff bereits spezifiziert
(`../design_handoff_twodo_ki/`, State `sheetthink`):
- Atmender **Gradient-Schein hinter dem Modal** (`kimodal__glow`, `aiShift` + `edgeBreath`).
- **Denk-Zeile** mit Gradient-Icon-Kachel, Statustext („Plant eure Woche …") und Mini-Loader.
- Dünne **Fortschrittslinie**, kurzer **Bloom** zum Ergebnis, dann Ergebnis-Toast.
- Während des Denkens ist der Scrim-Klick gesperrt (kein versehentliches Schließen).
Der Gradient bleibt **theme-unabhängig** (Light = Dark). Übernimm die KI-Tokens und Keyframes aus
`shared.css` (`--ai-gradient`, `--ai-gradient-size`, `--ai-glow`, `--ai-textshadow`, `--ai-scrim`,
`@keyframes aiShift`/`edgeBreath`/`aiBloom`) nach `src/app.css`, falls noch nicht vorhanden.

## 4) WICHTIG — alle bisherigen KI-Einstiege einsammeln
Der Hub ist ab jetzt der **einzige** KI-Einstieg. Geh die ganze App durch und:
- **Entferne** jeden separaten KI-Button, jede große Gradient-„KI-Karte", jeden Inline-Auslöser und
  jedes `.ai-trigger`/`.ai-badge`-Overlay aus den einzelnen Screens (Küche/Wochenplan, Finanzen,
  Wir/Bericht, Rezepte usw.). Suche breit, u. a. nach: `ai-`, `KI`, `gradient`, `coach`, `✨`,
  `AiButton`, `AiTrigger`, `ai-card`, `ai-badge`.
- **Jede gefundene KI-Funktion muss als Aktion im Hub landen.** Prüfe dabei ausdrücklich, ob es
  KI-Funktionen gibt, die in diesem Prototyp **noch nicht** als Kachel auftauchen (z. B. etwas aus
  Finanzen-Analyse, Terminvorschläge im Kalender, Notiz-Zusammenfassung). **Liste sie mir zuerst
  auf** und schlage vor, unter welchem Namen sie als Hub-Kachel erscheinen — bevor du sie einbaust.
- Achte darauf, dass kein Screen dadurch eine tote Stelle bekommt: wo vorher ein KI-Button die
  einzige Handlung war, braucht es entweder einen normalen (Nicht-KI-)Weg oder einen kurzen
  Verweis auf den KI-Button.

## Offene Fragen — vor dem Bau mit mir klären
1. **KI-Button-Form:** reines Icon-Quadrat „✨ KI" (wie im Prototyp) oder bei Erstnutzung eine
   breitere Pille, die einlädt?
2. **Regulärer „＋"-FAB:** bleibt er zusätzlich (dann Position final festlegen, damit er weder mit
   der Nav-Bubble noch mit dem KI-Button kollidiert), oder übernimmt der Kontext-„＋" je Screen?
3. **Ergebnis-Ausgabe:** Landet jedes Ergebnis nur als Toast + Eintrag auf dem jeweiligen Screen
   (Prototyp), oder soll es eine KI-Ergebnisansicht (Vorschau/Bestätigen) im Modal geben?

## Rahmenbedingungen
- Mobil-first, Zielbreite 390 px, **keine Breakpoints** (alles fluid). Touch-Targets ≥ 44 px.
- **Nur bestehende Tokens** — keine neuen Farb-, Radien-, Schatten- oder Schriftwerte. Kein Tailwind.
- Vue-3-Komponenten mit **scoped CSS**. **Dark Mode** sauber mitziehen (Gradient bleibt gleich).
- Das Modal muss sich per **Android-Zurück** schließen (`useBackDismiss`); im Denk-Zustand blockt der
  Zurück-/Scrim-Weg, bis die Aktion fertig ist.

## Vorgehen
Schlage zuerst die Komponentenstruktur vor — `AiHubButton`, `AiHubModal` (mit Steps `hub` /
`compose` / `listpick` / `thinking`), die Aktions-Registry (id, Label, Icon, Flow-Typ,
Ergebnis-Text) und die **vollständige Liste der zu entfernenden KI-Einstiege** aus dem Bestand.
**Warte auf mein OK**, dann implementiere: erst Button + Modal-Gerüst, dann die Flows, dann das
Einsammeln/Entfernen der alten Einstiege Screen für Screen.
