# Design-Brief: Dashboard „Together" — Redesign

**Richtung:** Export *aus* der App *für* das Design (umgekehrt zu den `design_handoff_*`-Ordnern).
Hier steht der **Ist-Stand**, nicht das Ziel. Die Zielrichtung soll aus dem Redesign kommen.

## Dateien

- `dashboard.html` — statischer Prototyp des Dashboards **wie es heute aussieht**, mit den echten
  Tokens und realistischen Daten. Zwei Screens: Belegung-Card eingeklappt und ausgeklappt.
  Einfach im Browser öffnen, kein Build nötig.
- `tokens.css` — Design-Tokens und Utility-Klassen, 1:1 aus `src/app.css`. **Verbindlich.**
  Neue Farben/Radien/Abstände bitte nur, wenn ein bestehendes Token wirklich nicht passt.

## Produkt in drei Sätzen

„Together" ist eine mobile-first PWA für **genau zwei Personen** (ein Paar), die sich Haushalt,
Finanzen, Einkauf, Essensplanung und geteilte Dinge (Auto, E-Bike, Hund) teilen. Es gibt keine
Rollen, keine Teams, keine Gäste — immer nur „ich" und „die andere Person", durchgängig an zwei
festen Personenfarben erkennbar (Terrakotta `--chris`, Türkis `--sarah`).
Warm, verspielt, handgemacht — nicht nach Produktivitäts-Tool aussehend.

## Navigation (Rahmen, den das Redesign kennen muss)

- Vier Tabs unten: **Start** (= dieses Dashboard) · Haushalt · Finanzen · Essen.
  Die Leiste ist keine gewöhnliche Tab-Bar: eine farbige Bubble sitzt halb über der Leiste und
  springt beim Wechsel mit einer Bounce-Kurve zum aktiven Slot. Bereichsfarbe wechselt mit dem Tab.
- **Einstellungen haben keinen Tab** — einziger Zugang ist der Avatar-Stapel oben rechts im Header.
- Das Dashboard ist die Landing-Page. Es ist Übersicht **und** Aktionsfläche: Von hier wird abgehakt,
  eingetragen, weitergesprungen.

## Was heute auf dem Dashboard liegt (Bento-Grid, 2 Spalten)

| Karte | Breite | Inhalt | Interaktion in der Karte |
|---|---|---|---|
| Essensplan heute | voll | Gericht von heute, Dauer | „Wer kocht?" — Chips C / S / Beide |
| Einkauf | halb | nächste 3 offenen Artikel | Artikel abhaken; Link zum Zettel |
| Haushalt | halb | nächste offene Aufgabe | „✓ Erledigt" |
| **Belegung** | voll | Timeline geteilter Ressourcen | ＋ eintragen, Zeile antippen, aus-/einklappen |
| Finanzen | voll | Monatsausgaben vs. Budget, Schuldenstand | Budget antippen |

Alle Karten liegen **gleichwertig** nebeneinander. Es gibt keine Hierarchie zwischen „das ist jetzt
gerade dran" und „das schlage ich nach". Das ist der Hauptgrund für das Redesign.

## Die Belegung-Karte — hier klemmt es konkret

Fachlich: Ressourcen (Auto, E-Bike, Parkplatz, Hund …) werden von einer der beiden Personen
zeitlich belegt. Eine Belegung ist entweder **einmalig** (konkretes Datum) oder **wöchentlich
wiederkehrend** (jeden Dienstag, **ohne Enddatum**). Überschneidungen derselben Ressource am selben
Tag werden angezeigt (⚠, roter Rahmen), aber nie verhindert. Kein Freigabe-/Anfrage-Flow — wer
einträgt, hat eingetragen.

Datenmodell (ein Dokument pro Serie, nicht pro Termin):

```
Resource { id, name, emoji }                       // frei anlegbar, in den Einstellungen
Booking  { id, resourceId,
           owner,        // für wen die Belegung ist (eine der zwei Personen)
           createdBy,    // wer sie eingetragen hat — kann die andere Person sein
           date,         // YYYY-MM-DD; bei 'weekly' der ERSTE Termin der Serie
           weekday,      // 0 = Montag … 6 = Sonntag
           allDay, start, end,          // 'HH:MM'
           repeat,       // 'none' | 'weekly'  — 'weekly' hat KEIN Enddatum
           note,         // „wofür?" — z. B. „Zur Arbeit"
           createdAt }
```

**Das ungelöste Problem:** Eine wiederkehrende Serie ist *eine* Zeile im Datenmodell, aber *unendlich
viele* Termine im Kalender. Jede Ansicht mit Zeithorizont multipliziert sie (12 Wochen × 3 Serien =
36 Zeilen), und die Karte wird beliebig lang — genau der Bug, der das Redesign ausgelöst hat.
Der aktuelle Zwischenstand (siehe Screen 2 in `dashboard.html`): Serien stehen **einmal** unter
„Wöchentlich", einmalige Termine nach Tag gruppiert. Das begrenzt die Länge, ist aber ein Kompromiss:
Man sieht die Serie, aber nicht mehr, *wann sie das nächste Mal fällt*, und die ausgeklappte Karte
sprengt trotzdem das Bento-Raster.

## Aufgabe fürs Redesign

1. **Hierarchie herstellen.** Was gehört heute nach oben, was ist Nachschlagewerk? Darf das Dashboard
   nach Tageszeit/Kontext umsortieren, statt fünf gleich laute Karten zu zeigen?
2. **Zeitliche Information unterbringen.** Belegung und Essensplan sind beide „was ist wann" —
   heute stehen sie unverbunden untereinander. Wäre ein gemeinsamer Tagesstrang sinnvoller als
   zwei getrennte Karten?
3. **Die Belegung-Karte lösen.** Wie zeigt man eine Liste unbekannter Länge (inkl. endloser Serien)
   in einer Bento-Kachel? Denkbare Richtungen, bewusst nicht vorentschieden:
   Karte zeigt nur „heute + nächster Termin" und alles Weitere lebt in einem Sheet/eigenen Screen;
   oder Wochenstreifen statt Liste; oder Serien komplett getrennt von Einzelterminen.
   *Falls die Antwort ein eigener Screen ist: das ist ausdrücklich erlaubt — die Karte wurde nur
   deshalb aufs Dashboard gezogen, weil ein voller Wochenkalender-Screen zu schwer wirkte.*
4. **Leerzustände.** Ein frisch angemeldetes Paar hat keine Ressourcen, keine Aufgaben, kein Budget —
   heute zeigt das Dashboard dann fünf halbleere Karten.

## Rahmenbedingungen

- Umsetzung ist **Vue 3 + CSS Custom Properties**, keine UI-Library. Alles in `tokens.css` ist da,
  alles andere kostet.
- Fonts: **Fredoka** (Titel, Zahlen, Uhrzeiten — Utility-Klasse `.mono`), **Nunito** (Fließtext/UI).
- Nur **Light Theme**. Kein Dark Mode geplant.
- Bottom-Sheets (`--radius-sheet`, Grabber, Swipe-to-close) sind das etablierte Muster für alles
  Eingebende — neue Formulare bitte dort, nicht als eigene Seiten.
- Emojis sind als Icon-Sprache gesetzt (Ressourcen, Kategorien, Avatare) — bewusst, passt zum Ton.
