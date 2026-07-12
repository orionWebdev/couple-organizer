# Handoff: Belegung — geteilte Ressourcen (Wochenkalender)

## Overview
Neue Funktion der Paar-App „Together" (Paarplaner): **Belegung** — ein Wochenkalender,
mit dem ein Paar geteilte Dinge (Auto, E-Bike, Parkplatz, Hund/„Gassi", Wohnung …) einteilt:
wer nimmt welche Ressource, wann, wie lange. Überschneidungen laufen über einen
**Anfrage-/Bestätigen-Flow**. Ressourcen sind **frei anlegbar** (Name + Icon) in den Einstellungen.

## About the Design Files
Die Dateien sind **Design-Referenzen** (HTML + React/Babel-Prototyp), **kein** Produktionscode.
Ziel-Repo ist eine **Vue-3-App** (`src/app.css` = Design-Fundament). Die Funktion dort mit den
bestehenden Patterns und Tokens nachbauen — nicht die HTML kopieren.

## Fidelity
**High-fidelity.** Layout, Farben, Typo, Interaktionen und Datenmodell sind verbindlich.
Für Flächen/Text die vorhandenen Tokens nutzen (siehe „Design Tokens").

---

## Datenmodell

```
Person   { id: 'lena'|'jonas', name, initial, color, tint }
           lena = Terrakotta (--chris), jonas = Türkis (--sarah)
Resource { id, name, emoji }                       // emoji = frei gewähltes Icon
Booking  { id, resourceId, owner: 'lena'|'jonas',
           day: 0..6,                               // 0 = Montag
           allDay: bool, start: 'HH:MM', end: 'HH:MM',
           repeat: 'none'|'weekly',
           status: 'confirmed'|'pending'|'declined',
           requestedBy: 'lena'|'jonas',             // wer die Anfrage stellte
           note: string }                           // „wofür?"
```
Woche = Montag–Sonntag. `weekOffset` (0 = aktuelle Woche) verschiebt die Woche.
Konflikt = zwei nicht-`declined`-Bookings **derselben Ressource am selben Tag** mit
Zeitüberlappung (`allDay` überlappt alles).

---

## Screens / Views

### 1. Kalender (Hauptscreen)
Aufbau von oben nach unten:
- **Statusleiste** (9:41, Signal, Akku).
- **Header**: Titel „Belegung" (Fredoka 600, 26px), Untertitel „Gemeinsam nutzen · alle Ressourcen".
  Rechts: zwei überlappende Personen-Avatare (Lena, Jonas) + **⚙️-Button** → Einstellungen.
- **Wochen-Navigation**: `‹`  ·  Mitte „**KW {n}**  ▾" + „{startdatum} – {enddatum}"  ·  `›`.
  **Klick auf die Mitte öffnet den nativen Datepicker des Systems** (`<input type="date">`,
  transparent über dem Label). Auswahl eines Datums springt zur zugehörigen KW.
- **„↩ Heute · aktuelle KW"**-Pill — erscheint nur, wenn `weekOffset ≠ 0`; springt auf offset 0.
- **Anfrage-Banner** (nur wenn eingehende offene Anfragen an den aktuellen Nutzer existieren):
  „{Name} fragt {Icon} {Ressource} an · {Tag} · {Zeit}" + „Prüfen" → öffnet Detail.
- **Wochen-Grid** (7 Spalten Mo–So), pro Tag: Wochentagskürzel, Datumszahl (heutiger Tag = gefüllter
  Akzent-Kreis, ausgewählter Tag = Akzent-Ring/Tint), darunter bis zu 3 **Punkte** (Personenfarbe;
  `pending` = 40 % Deckkraft), „+N" bei mehr. **Zeigt alle Ressourcen gemeinsam.** Tag antippen wählt ihn.
- **Tages-Detail** (unter dem Grid): Wochentag lang + Datum; Liste der Belegungen des gewählten Tages
  als Zeilen, sortiert (ganztägig zuerst, dann nach Startzeit). Leer → „frei — Belegung anlegen".
- **FAB** unten rechts (Akzentfarbe, „＋") → Sheet „Neue Belegung".
- **Bottom-Nav** (Kontext): Start · Haushalt · **Belegung** (aktiv) · Finanzen.

**Belegungs-Zeile:** links Ressourcen-Icon in gerundetem Quadrat (`--surface-deep`), dann Zeit
(`.mono`) + optional „↻" (wöchentlich) + „⚠" (Konflikt), darunter „{Ressource} · {Notiz}",
rechts Personen-Avatar (bestätigt) **oder** „angefragt"-Pill (pending). Linke Kante 3px Personenfarbe
(Konflikt = `--danger`), `pending` = gestrichelter Rahmen, `declined` = durchgestrichen/blass.

### 2. Neue Belegung (Bottom-Sheet)
Von unten (Radius `--radius-sheet`, Grabber). Felder:
- **Ressource**: horizontale Icon+Name-Chips (aus den angelegten Ressourcen), eine aktiv.
- **Wer**: Segmented Lena / Jonas (aktive Hälfte in Personenfarbe).
- **Tag**: 7 Wochentag-Buttons (Mo–So), einer aktiv (Akzent).
- **Zeit**: Toggle „Ganztägig"; wenn aus → zwei `<input type="time">` (Von / Bis).
- **Wiederholung**: Segmented Einmalig / Wöchentlich ↻.
- **Notiz**: Textfeld „wofür?".
- **Konflikt-Hinweis** (inline, wenn Überlappung): rote Box „Überschneidet sich mit {Name} ({Zeit})".
- **Primär-Button**: Text abhängig vom Konflikt-Modus (siehe unten).

### 3. Einstellungen — Ressourcen (Vollbild-Overlay)
- Header mit `‹` zurück, Titel „Einstellungen".
- Liste „Ressourcen · {n}": pro Ressource Icon + Name + „{n} Belegungen" + „Bearbeiten".
- **„＋ Neue Ressource"** → Formular:
  - Große Icon-Vorschau.
  - **Name** (Freitext).
  - **Icon**: Raster (7 Spalten) aus einem **Icon-Set** (~40 Emojis: Fahrzeuge, Tiere/Haus, Werkzeug,
    Freizeit, Technik, Haushalt). Ausgewähltes Icon = Akzent-Ring.
  - „Ressource anlegen" / im Bearbeiten-Modus „Speichern" + „Ressource löschen".
- Personen-Übersicht (Lena, Jonas) darunter (read-only im Prototyp).
- **Ressource löschen** entfernt auch deren Belegungen.

---

## Interactions & Behavior

- **Wochenwechsel**: `‹`/`›` = ±1 Woche; **KW-Label = nativer Datepicker** (Sprung auf beliebige KW);
  „Heute" = zurück auf aktuelle Woche (nur sichtbar bei offset ≠ 0).
- **Anlegen**: FAB oder „＋"/„hinzufügen" im Tages-Detail (Tag vorbelegt). Absenden erzeugt Booking.
- **Konflikt-Modus** (einstellbar, Prototyp-Tweak — im echten Produkt als App-Einstellung sinnvoll):
  - `request` (Standard): neue Belegung wird `pending`, geht als **Anfrage** an den Partner
    (Button „Anfragen" / bei Überlappung „Trotzdem anfragen").
  - `warn`: sofort `confirmed`, Überlappung nur als Warnung („Speichern"/„Trotzdem speichern").
  - `block`: bei Überlappung deaktivierter Button („Überschneidung").
- **Bestätigen-Flow**: eingehende Anfrage (pending, `requestedBy` ≠ Nutzer) → Banner + Detail-Sheet
  mit **Bestätigen** (→ `confirmed`, grün) / **Ablehnen** (→ `declined`). Eigene offene Anfrage zeigt
  „wartet auf Bestätigung von {Partner}".
- **Detail-Sheet** einer bestätigten Belegung: „Belegung löschen".
- **Toasts** bestätigen Aktionen (Anfrage gesendet / Bestätigt / Gelöscht …).
- **Animationen**: Sheets sliden hoch (`cubic-bezier(0.34,1.3,0.64,1)`, ~280ms), Overlays faden.
  `prefers-reduced-motion` respektieren.
- Aktueller Nutzer der Demo = **Lena** (`VIEWER`).

## State
`bookings[]`, `resources[]`, `weekOffset`, `selectedDay`, `screen` (calendar|settings),
`sheet` (null | new | view{id}), `draft` (Formular), `toast`.
Einstellungen (Konflikt-Modus, Dichte, Akzentfarbe, Wiederholungen anzeigen) als Nutzer-Präferenzen.

---

## Design Tokens (aus `src/app.css` / `tokens/tokens.css`)
- Personen: Terrakotta `oklch(0.70 0.15 38)` (Lena/`--chris`), Türkis `oklch(0.69 0.10 195)` (Jonas/`--sarah`).
- Flächen `--bg #fdfaf5`, `--surface #fff`, `--surface-deep #f7f1e6`; Text `--text #2c2823`, `--text-secondary`, `--text-meta`, `--text-faint`.
- Akzent der Funktion: Bereichsklasse `.area-bucket` (Violett) empfohlen; per Wrapper umschaltbar.
- `--danger #b34a32` (+ `-border`, `-tint`) für Konflikte; `--success` für „bestätigt".
- Radien Karte 16 / Sheet 26 / Chip 11; Schatten `--shadow-card`, `--shadow-float`.
- Fonts: Fredoka (Titel/Zahlen/`.mono`), Nunito (UI/Text). Utility-Klassen `.card .btn-primary .app-field .chip .section-label .mono`.

## Assets
Keine Bitmaps. Ressourcen-Icons sind **Emojis** aus einem kuratierten Icon-Set (frei erweiterbar).
Für native Apps ggf. durch ein echtes Icon-Set (SF Symbols / Material) ersetzen — Auswahl-UX bleibt gleich.

## Files (Prototyp im Projekt unter `feature/`)
- `belegung.html` — Shell (lädt React/Babel, styles.css, Skripte, mountet App)
- `belegung-data.js` — Datenmodell, Seed, Helfer (Zeit-/Wochen-/Konflikt-Logik)
- `belegung-views.jsx` — Wochen-Grid + Tages-Detail + Belegungs-Zeile
- `belegung-sheet.jsx` — „Neue Belegung"-Sheet, Detail/Bestätigen-Sheet, Anfrage-Banner
- `belegung-settings.jsx` — Einstellungen: Ressourcen verwalten + Icon-Set
- `belegung-app.jsx` — App-Shell: State, Header, Wochen-Nav (nativer Datepicker), Heute, FAB, Nav
- `tweaks-panel.jsx` — Präferenz-Panel (nur Prototyp-Harness)
