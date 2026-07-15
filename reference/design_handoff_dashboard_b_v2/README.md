# Handoff: Dashboard-Redesign „TwoDo" — Richtung B v2

## Überblick
Redesign des **Dashboards (Start-Tab)** der Paar-App „TwoDo"/„Paarplaner" plus ein **neuer 5. Navigations-Tab „Planung"**. Ziel des Redesigns:
1. **Hierarchie** herstellen (nicht mehr fünf gleich laute Bento-Karten).
2. **Zeit-/Kontext-Infos** aussagekräftig zeigen (Karten, die einen Blick liefern, den ein Tab-Tap nicht gibt).
3. Die **Belegung** strukturell tragfähig lösen (endlose Serien in einer Kachel).
4. **Leerzustände** freundlich lösen.

Diese Richtung („Fokus & Regale", v2) ist die vom Auftraggeber gewählte und finalisierte Variante.

## Über die Design-Dateien
Die Dateien in diesem Bundle sind **Design-Referenzen in HTML + React/Babel** — Prototypen, die Aussehen und Verhalten zeigen, **kein Produktionscode zum 1:1-Kopieren**. 

**Zielumgebung: Vue 3 + CSS Custom Properties, ohne UI-Library** (das bestehende Repo, Design-Fundament in `src/app.css`). Aufgabe: die gezeigten Designs mit den **bestehenden Patterns, Tokens und Komponenten** des Vue-Repos nachbauen. Alles aus `app.css`/`tokens.css` ist „gratis", alles andere kostet — also bestehende Bausteine wiederverwenden. Die React-Struktur der Prototypen ist nur Referenz; State/Props in Vue-Idiomatik (Composition API, `ref`/`computed`) umsetzen.

## Fidelity
**High-fidelity.** Farben, Typografie, Abstände, Radien, Motion und Datenmodell sind verbindlich. Exakte Werte siehe „Design Tokens" und die JSX-Referenzdateien (dort steht jeder Style inline).

---

## Was ist NEU gegenüber dem Ist-Stand (die „Anpassungen")

### 1. Neue Bereichsfarbe `--planung` (in `src/app.css` ergänzen)
Der 5. Tab braucht — wie jede Sparte — eine eigene Akzentfarbe. In den `:root`-Block einfügen:
```css
--planung:        oklch(0.64 0.13 235);  /* Blau — Planung: Belegung, Bucketlist, Reisen, Notizen */
--planung-hover:  oklch(0.57 0.13 235);
--planung-tint:   oklch(0.955 0.03 235);
```
Und die Bereichs-Override-Klasse (wie `.area-finanzen` etc.):
```css
.area-planung { --accent: var(--planung); --accent-hover: var(--planung-hover); --accent-tint: var(--planung-tint); }
```
Blau (Hue 235) sitzt bewusst in der Lücke zwischen Finanzen-Türkis (195) und Start-Indigo (280) und teilt Lightness/Chroma-Familie mit den übrigen Bereichsfarben.

### 2. Bottom-Nav: von 4 auf 5 Tabs
Reihenfolge: **Start · Haushalt · Planung · Finanzen · Essen** — „Planung" liegt **mittig** (prominenter Hub). Die überstehende Bubble springt weiter mit Bounce zum aktiven Slot; ihre **Farbe wechselt zur Bereichsfarbe des aktiven Tabs** (Start=`--dashboard`, Haushalt=`--haushalt`, Planung=`--planung`, Finanzen=`--finanzen`, Essen=`--food`). Der Tab-Root bekommt die passende `.area-*`-Klasse, sodass `--accent` mitschaltet.

### 3. Dashboard (Start) neu aufgebaut
Zwei Zonen statt gleichwertigem Bento:
- **„Jetzt im Fokus"**: großer Essens-Hero (Gericht heute + „Wer kocht?"-Chips).
- **„Auf einen Blick"**: drei ausdrucksstarke Glance-Karten:
  1. **Finanzen** (kombiniert, siehe unten) — prominent.
  2. **Belegung** (Regal mit Mini-Wochenstreifen) → öffnet den Wochenkalender.
  3. **Haushalt** (Fairness-Waage).
- **Einkauf ist vom Dashboard entfernt** (ein Tab-Tap führt eh direkt zur Liste; die gekürzte Karte lieferte keinen Mehrwert). Einkauf bleibt als eigener Bereich bestehen, nur nicht auf dem Dashboard.

### 4. Neuer „Planung"-Tab
Sammelt: **Belegung** von Ressourcen · **Ideen** (Bucketlist als Ideen-Sammlung: Filme, Restaurants, Date-Ideen) · **Reisen/Ausflüge** · **Notizen**. Bereichsfarbe `--planung`.

### 5. Belegung — strukturelle Lösung (Kern von Problem 3)
**Eine Serie ist EIN Datensatz (eine Regel), keine ausgerollten Termine.** Jede Oberfläche zeigt **aufgelöste, konkrete Termine in einem begrenzten Fenster**:
- **Dashboard**: nur die **heutigen** aufgelösten Termine + „als Nächstes" + Wochen-Zähler.
- **Wochenkalender-Screen**: genau **eine Woche** (7 Tage) → immer begrenzt, egal wie viele Serien. Serien erscheinen zusätzlich **einmal** in einer „Serien"-Liste mit **berechnetem nächsten Termin** (`nextLabel`) — so geht die Info „wann fällt die Serie das nächste Mal" nie verloren.
- Nie eine Ansicht mit offenem Zeithorizont rendern (kein „12 Wochen × 3 Serien = 36 Zeilen").

---

## Screens / Views

### A) Dashboard (Start-Tab)  ·  `.area-dashboard`
- **Zweck**: Landing-Page + Aktionsfläche.
- **Layout**: vertikale Spalte, `padding: 8px 20px 108px`. Header (Begrüßung „Moin, ihr zwei 👋" Fredoka 700/24px + Datum 15px `--text-secondary` + Avatar-Stapel rechts). Danach Label „Jetzt im Fokus" → Essens-Hero → Label „Auf einen Blick" → 3 Karten (`flex column`, `gap: 10px`).
- **Header/Avatar-Stapel** ist der **einzige Zugang zu den Einstellungen** (kein eigener Tab).

**Essens-Hero**: Verlauf `linear-gradient(180deg, var(--food-tint), var(--surface))`, Border `1px solid color-mix(in srgb, var(--food) 22%, transparent)`, `border-radius: var(--radius-card-lg)`, `padding: 17px`. Links Emoji-Icon 52px (`bg: var(--food)`, Radius 30%). Kicker „HEUTE ABEND" 11px 800 `--food` uppercase. Titel Fredoka 700/21px. Meta „🕒 25 Min · 4 Zutaten" 12px `--text-meta`. Darunter „Wer kocht?" + drei Pills (Person A / Person B / Beide); aktiv = gefüllt in Personenfarbe bzw. `--food` für „Beide".

**Finanz-Karte (kombiniert)** — `bg: var(--finanzen-tint)`, Border `--border-softer`, Radius `--radius-card`, `padding: 15px`:
- **Ring** (SVG, 100×100): zwei Kreise r=46, `stroke-width: 11`. Track `--surface`, Fortschritt `--finanzen` (bzw. `--danger` bei >90 %), `stroke-linecap: round`, animiert per `stroke-dashoffset` (Transition `1.1s var(--ease-standard)`). Zentrum: „noch" 9.5px 800 + Restbetrag Fredoka/20px (zählt hoch).
- **Rechts**: „Finanzen · {Monat}", `{ausgegeben} € / {budget} €` (`.mono`), Tempo-Pill (`im Plan` grün / `▲ {n} % über Tempo` rot — Vergleich Ausgabe-% vs. Monats-%), „zuletzt · {Notiz} {Betrag} €" mit Avatar.
- **Paar-Split** (unter Trennlinie): zwei Personen-Zeilen mit Name, gezahltem Betrag (`.mono`, Personenfarbe) und Anteils-Balken (animiert). Darunter „⚖️ {A} schuldet {B} {Betrag} €" + Button **„Ausgleichen"** (setzt Schuld auf 0, Toast).
- Tap auf Karte (nicht auf Buttons) → Finanzen-Tab.

**Belegung-Regal** — `bg: var(--surface)`, `--shadow-card`, `padding: 14px`:
- Kopf: Icon 🗓️ (`bg: var(--planung-tint)`), „Belegung", optional „⚠ heute"-Badge (`--danger`), rechts „{n} diese Woche ›" in `--planung`.
- **Mini-Wochenstreifen**: 7 Spalten (Mo–So), heutiger Tag `bg: var(--planung-tint)`; pro Tag bis zu 3 Punkte in Personenfarbe (Punkte animieren beim Mount per `scale`), „+N" bei mehr.
- Fuß: „Als Nächstes" + Emoji + Uhrzeit (`.mono`) + „↻" bei Serie + Avatar.
- Tap → Wochenkalender-Screen.

**Haushalt-Karte (Fairness-Waage)** — `bg: var(--haushalt-tint)`, `padding: 14px`:
- Kopf: 🧽 „Haushalt · diese Woche" + „2 offen ›".
- **Waage**: horizontaler Balken (Höhe 30px), links Personenfarbe A mit Anzahl, rechts Personenfarbe B mit Anzahl; Breite = Anteil erledigter Aufgaben (animiert). Text „{Name} trägt gerade mehr" / „genau fair ✨". Rechts Quick-Button „✓ {nächste Aufgabe}".

### B) Planung-Tab  ·  `.area-planung`
- **Layout**: Spalte, `gap: 12px`. Header „Planung" / „Belegung · Ideen · Reisen".
- **Belegung-Block**: SectionCard mit Mini-Wochenstreifen + „Als Nächstes" + Button „Kalender ›" → Wochenkalender-Screen.
- **Ideen (Bucketlist)**: SectionCard „Ideen für uns", Kategorie-Filter-Chips (Alle / 🎬 Filme & Serien / 🍜 Essen gehen / ✨ Date-Ideen), Liste mit Checkbox (erledigt → `--success`, durchgestrichen), Kategorie-Emoji, Titel, Avatar des Vorschlagenden. „＋" öffnet Add-Idee-Sheet (Kategorie-Segmented + Titel + Von wem).
- **Reisen & Ausflüge**: SectionCard „🧳", Liste (Emoji, Titel, offene-To-dos-Zeile, „when"-Pill in `--accent`, „›"). Jeder Eintrag ist **anklickbar → eigenes Reise-Detail-Fenster** (Screen C.2). „＋" → Quick-Add-Sheet (legt Reise mit leeren `todos`/`programm`/`notiz` an).
- **Notizen**: SectionCard „📝", einfache Textzeilen. „＋" → Quick-Add-Sheet.
- **Leerzustand**: freundliche Karte „Was habt ihr vor?" + „＋ Erste Idee".

### C) Wochenkalender-Screen (Belegung, Vollbild-Overlay)  ·  `.area-planung`
- Header: „‹" zurück, „Belegung" / „Geteilte Ressourcen · ganze Woche".
- Wochen-Navigation: „‹ KW {n} ›" + Datumsbereich; „↩ Heute · aktuelle KW"-Pill wenn nicht aktuelle Woche.
- **Wochen-Grid** (7 Spalten): Wochentag, Datum (heute = gefüllter Akzent-Kreis, gewählt = Akzent-Ring/Tint), bis zu 3 Punkte je Person, „+N".
- **Tages-Detail**: Liste der aufgelösten Belegungen des gewählten Tages (Belegungs-Zeile, s. u.); leer → „frei — Belegung anlegen".
- **Serien-Liste**: jede wöchentliche Regel **einmal**, mit „jeden {Wochentag}" + „Nächster: {nextLabel}".
- **FAB „＋"** → Neue-Belegung-Sheet.
- **Belegungs-Zeile**: Icon (Ressourcen-Emoji, `bg --surface-deep`), Zeit `.mono`, „↻" bei Serie, „⚠" bei Konflikt, „{Ressource} · {Notiz}", rechts Personen-Avatar. Linke Kante 3px Personenfarbe (Konflikt → `--danger`).

### C.2) Reise-Detail-Fenster (Vollbild-Overlay)  ·  `.area-planung`
Öffnet sich beim Antippen einer Reise. Kopf: „‹" zurück, Emoji, Titel (Fredoka), „📅 {when}". Karten:
- **Packen & Buchen**: Checkliste (`todos[]`, Toggle → `--success`, durchgestrichen), „{n} offen"-Badge, Inline-Add-Zeile (Textfeld + ＋).
- **Programm & Ideen**: Bullet-Liste (`programm[]`), Inline-Add.
- **Notizen**: `<textarea class="app-field">` gebunden an `reise.notiz`.
- „Reise löschen" (Danger).
State-Ergänzung im Modell: `Reise { …, todos:[{id,text,done}], programm:[{id,text}], notiz }`.

### D) Bottom-Sheets (Muster für alle Eingaben — Radius `--radius-sheet`, Grabber)
- **Neue Belegung**: Ressourcen-Chips · „Wer" (Segmented, Personenfarben) · Tag (Mo–So; bei „Einmalig" = Datum dieser Woche, bei „Wöchentlich" = jeden Wochentag) · Zeit (Ganztägig-Toggle + zwei `<input type=time>`) · Wiederholung (Einmalig / Wöchentlich ↻) · Notiz · Inline-Konflikt-Warnung. **Kein Anfrage-/Bestätigen-Flow** — „wer einträgt, hat eingetragen"; bei Überschneidung nur Warnung, Button „Trotzdem eintragen".
- **Neue Idee**, **Quick-Add** (Reise/Notiz), **Einstellungen** (Ressourcen verwalten + Icon-Set aus Emojis, Paar-Übersicht).

---

## Interactions & Behavior
- **Tab-Wechsel**: Bubble springt animiert (`left .42s var(--ease-overshoot)`), Bubble-Farbe faded zur Bereichsfarbe (`background .3s`). Tab-Root wechselt `.area-*`.
- **Wer kocht?** / **Ausgleichen** / **✓ erledigt** / **Idee abhaken** / **Einkaufsartikel abhaken**: lokaler State + kurzer Toast (~1.9 s, `--ease-overshoot` Einblendung).
- **Belegung anlegen**: FAB oder „hinzufügen" im Tages-Detail; Serie (weekly) speichert `{ weekday }`, Einmalig speichert `{ date }`.
- **Mount-Animationen** (nur `@media (prefers-reduced-motion: no-preference)`): Ring füllt sich, Zahlen zählen hoch (Count-up, cubic ease-out), Balken/Punkte wachsen. Bei `reduce` sofort Endzustand.
- **Wochenkalender**: `‹`/`›` = ±1 Woche; „Heute" springt zurück. Konflikt = zwei nicht-gelöschte Belegungen derselben Ressource am selben Tag mit Zeitüberlappung (`allDay` überlappt alles) → `⚠`, roter Rahmen; nie verhindert.

## State Management
Pro Screen lokaler State; in Vue als `ref`/`reactive` + `computed`. Wichtige Felder:
- `scenario` (nur Prototyp-Harness: `full | empty | many`).
- `tab` (`start | haushalt | planung | finanzen | essen`), `overlay` (`null | belegung | settings`).
- `bookings[]`, `resources[]`, `meal`, `chores[]`, `shopping[]` (nicht auf Dashboard), `finance`, `planung { ideen[], reisen[], notizen[] }`, `toast`.
- Serien-Auflösung als reine Funktionen (siehe `redesign-data.js`): `occursOn`, `expandWeek`, `onDate`, `nextOccurrence`, `nextLabel`, `conflictsOn` — **diese Logik 1:1 übernehmen**, sie ist der Kern der Belegung-Lösung.

## Datenmodell
```
Person   { id:'a'|'b', name, initial, color, tint }   // Namen/Initialen = Paar-Daten, nicht fest; zwei feste Farben = Identität
Resource { id, name, emoji }
Booking  { id, resourceId, owner:'a'|'b', allDay, start:'HH:MM', end:'HH:MM',
           repeat:'none'|'weekly',
           weekday: 0..6,      // NUR bei weekly (0 = Montag)
           date: 'YYYY-MM-DD', // NUR bei none (konkreter Termin)
           note }
Idee     { id, cat:'film'|'essen'|'date', title, by:'a'|'b', done }
Reise    { id, title, when, emoji }
Notiz    { id, text }
Finance  { spent, budget|null, month, debtFrom, debtTo, debt, paid:{a,b}, lastPayment:{by,what,amount,when}|null }
```
**Wichtig zu den Namen:** Die App wird ausgerollt — Personen sind **pro Paar konfigurierbar** (Name + Initiale kommen aus Paar-Daten). Konstant sind nur die **zwei Personenfarben** (Terrakotta `--chris`, Türkis `--sarah`) als Identitätssystem. In den Prototypen sind Beispielnamen „Mara" (a) und „Ben" (b) hinterlegt.

## Design Tokens
Alle aus `src/app.css` / `tokens.css` — **keine neuen Farben außer `--planung`** (s. o.). Verwendete Werte:
- Flächen: `--bg #fdfaf5`, `--surface #fff`, `--surface-deep #f7f1e6`; Ränder `--border`/`--border-soft`/`--border-softer`.
- Text: `--text #2c2823`, `--text-secondary`, `--text-meta`, `--text-faint`.
- Bereiche: `--dashboard` (Indigo 280), `--haushalt` (Terrakotta 38), `--finanzen` (Türkis 195), `--food` (25), `--planung` (Blau 235, NEU). Konflikt `--danger #b34a32` (+ `-border`, `-tint`), Erfolg `--success`.
- Personen: `--chris` (Terrakotta) = Person A, `--sarah` (Türkis) = Person B (+ `-tint`).
- Radien: card 16 / card-lg 20 / tile 13 / sheet 26 / chip 11. Schatten `--shadow-card`, `--shadow-float`.
- Motion: `--ease-overshoot`, `--ease-standard`, `--ease-in`; Dauern `--dur-*`.
- Fonts: **Fredoka** (Titel, Zahlen, Uhrzeiten — `.mono` = Fredoka 700 tabular-nums), **Nunito** (UI/Text, Standardgewicht 600).

## Assets
Keine Bitmaps. Icons sind **Emojis** (Ressourcen, Kategorien, Avatare-Fallback) — bewusst als Icon-Sprache gesetzt. Für native Ziele ggf. durch ein Icon-Set ersetzen, Auswahl-UX bleibt gleich.

## Files (Referenz-Prototypen in diesem Bundle)
- `richtung-b-v2.html` — Shell (lädt React/Babel, styles.css, Skripte, mountet App). **Hauptreferenz.**
- `richtung-b-v2.jsx` — App-Shell: 5-Tab-Nav, Dashboard, Finanz-Karte (Ring+Split), Haushalt-Waage, Belegung-Regal, Leerzustand.
- `planung-tab.jsx` — Planung-Tab: Belegung-Block, Ideen/Bucketlist, Reisen, Notizen, Add-Sheets.
- `shared.jsx` — Bausteine: Header, Sheet, Belegungs-Zeile, Neue-Belegung-Sheet, **Wochenkalender-Screen**, Einstellungen.
- `redesign-data.js` — Datenmodell, Seed-Szenarien (full/empty/many), **Serien-Auflösungs-Logik** (unbedingt übernehmen).
- `regale-konzepte.jsx` / `.html` — optionale Referenz für alternative Finanz-Behandlungen (F2 Verlauf/Tempo, F3 Paar-Split solo).
- `tokens-planung-snippet.css` — der exakte CSS-Zusatz für `--planung` + `.area-planung`.

> Hinweis: Die `.jsx`-Dateien nutzen inline-Styles mit `var(--token)`-Werten — das ist die genaue Style-Quelle. Beim Vue-Nachbau die Werte übernehmen, aber in die bestehende Komponenten-/Klassenstruktur des Repos überführen.
