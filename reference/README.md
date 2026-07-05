# Handoff: Nido — Neue Features (Stimmungs-Barometer, Bucket-List, Resteverwertung, Finanz-Coach, Settings, Charm-Push, erweiterte Navigation)

## Overview
Nido ist eine Haushalts-Organisations-App für Paare/WGs (Haushalt, Einkauf, Finanzen). Dieses Handoff deckt sechs neue Feature-Bereiche plus eine überarbeitete Navigation ab, die zusätzlich zum bestehenden Kern-Flow (Onboarding, Dashboard, Haushalt, Finanzen, Einkauf, Essensplan, Rezept-Wiki) entstanden sind.

## About the Design Files
Die Datei `Nido.dc.html` in diesem Ordner ist ein **Design-Referenz-Prototyp in HTML** (interaktives Klick-Mockup), kein produktionsreifer Code zum 1:1-Kopieren. Aufgabe ist es, dieses Design in der Ziel-Codebase mit deren bestehender Umgebung (z. B. React Native, Flutter, SwiftUI/Kotlin nativ — je nachdem, was die App tatsächlich nutzt) und deren etablierten Patterns nachzubauen. Falls noch keine Umgebung existiert, das für ein Android/iOS-Prototyping am besten geeignete Framework wählen.

## Fidelity
**High-fidelity (hifi).** Farben, Typografie, Abstände und die meisten Interaktionen sind final gemeint. Die im Prototyp genutzten `oklch()`-Farbwerte und Schriftgrößen sollten möglichst exakt übernommen werden.

Wichtige Einschränkung: **Alle "KI"-Funktionen (Gemini) sind im Prototyp reine Mock-Daten** — es gibt keine echte Modellanbindung. Die Backend-Integration (Gemini API, Ausgaben-Analyse, Rezeptgenerierung) muss vom Entwicklerteam neu aufgebaut werden; der Prototyp zeigt nur das gewünschte UI-Verhalten und Beispieltexte.

Der gesamte Prototyp ist eine reine **Canvas-Sammlung einzelner Bildschirme** (kein echtes Multi-Screen-Routing) — Übergänge zwischen Screens sind in der Ziel-App mit echter Navigation zu implementieren.

---

## Screens / Views

### 1. Dashboard-Erweiterung (Stimmungs-Barometer, Bucket-List- & Resteverwertungs-Kacheln)
**Purpose:** Zentrale Startseite; neue Kacheln geben Zugriff/Einblick in die neuen Features, ohne den bestehenden Kern-Flow (Heute-Abend-Karte, Einkauf, Haushalt, Finanzen) zu verdrängen.

**Layout:** Bestehendes 2-spaltiges CSS-Grid (`grid-template-columns:1fr 1fr; gap:10px`) im scrollbaren Dashboard-Body. Neue Karten wurden zwischen der Haushalt-Karte und der Finanzen-Karte eingefügt:
- Bucket-List-Karte (1 Spalte, Hintergrund `oklch(0.97 0.035 312)`)
- Reste-da?-Karte (1 Spalte, Hintergrund `oklch(0.955 0.045 150)`)
- Stimmungs-Barometer-Karte (2 Spalten/volle Breite, Hintergrund `oklch(0.97 0.03 300)`), unterhalb der Finanzen-Karte

**Components:**
- *Bucket-List-Karte*: 30×30px Icon-Badge (`border-radius:11px`, Hintergrund `oklch(0.64 0.14 312)`, Emoji 🧳), Titel "Bucket-List" (700 13px Nunito), nächster offener Eintrag (700 13px Fredoka) + Statuszeile "📍 Reiseziel · N offen" (600 10.5px, Farbe `#9a8a82`), Link-Text "Zur Liste ›" (700 11px, Farbe `oklch(0.5 0.14 312)`).
- *Reste-da?-Karte*: gleiche Struktur, Icon ♻️, Button "✨ Loslegen" (Hintergrund `oklch(0.70 0.13 150)`, weißer Text, `border-radius:10px`, `padding:7px`).
- *Stimmungs-Barometer-Karte*: Icon-Badge 💭 (Hintergrund `oklch(0.64 0.14 312)`), Partner-Vorschau (26px Avatar-Kreis + Name + aktuelles Emoji + Freitext, in weißer Sub-Card mit `border-radius:14px`), 5 Emoji-Buttons (😊 😐 😩 😍 😴, je 34×34px Kreis, aktiver Zustand: Hintergrund `oklch(0.955 0.05 80)` + 2px Border `oklch(0.78 0.13 80)`), darunter ein Freitext-Input (Platzhalter "Kurzer Satz dazu … (optional)").

**Content/copy (Beispiel):** Partnertext "Gestresst von der Arbeit, brauche Ruhe heute".

---

### 2. Bucket-List (eigener Screen)
**Purpose:** Gemeinsame Liste schöner Dinge (Reiseziele, Restaurants) getrennt von Haushalts-Aufgaben.

**Layout:** Standard-Phone-Frame (340×724, `border-radius:38px`), Header mit Zurück-Pfeil + Titel "Bucket-List" + Subtitle "Schöne Dinge · Lena & Jonas". Darunter 3 Tabs ("Alle" / "Orte" / "Restaurants", aktive Farbe `oklch(0.64 0.14 312)`). Scrollbare Liste von Karten, am unteren Rand ein volles Breiten-CTA "+ Eintrag hinzufügen" (öffnet Inline-Formular).

**Components:**
- Karte je Eintrag: Checkbox (24×24px, `border-radius:8px`, erledigt = gefüllt `oklch(0.70 0.13 150)` mit Häkchen), Icon (📍 Ort / 🍽️ Restaurant) + Name (700 14px Fredoka, durchgestrichen wenn erledigt), Notiz-Zeile darunter (600 11px, `#9a9286`).
- Formular (erscheint als Card unterhalb der Liste): Kategorie-Chips (Ort/Restaurant, aktiv = `oklch(0.64 0.14 312)`), Name-Input, Notiz-Input, Speichern-Button.

**Beispieldaten:** "Lissabon" (Ort, offen), "Wanderung Allgäu" (Ort, offen), "Sushi-Laden am Kanal" (Restaurant, offen), "Vegan-Brunch sonntags" (Restaurant, erledigt).

---

### 3. Kühlschrank-Resteverwertung ("Was haben wir noch da?")
**Purpose:** Nutzer wählen vorhandene Zutaten aus, eine KI (Gemini) generiert ein Rezept daraus, das direkt in den Essensplan übernommen werden kann.

**Layout:** Phone-Frame, Header "Was haben wir noch da?" / "Reste verwerten mit Gemini ✨". Body: Zutaten-Chip-Wolke (Toggle-Auswahl, aktiv = `oklch(0.70 0.13 150)` gefüllt), Freitext-Input + "+"-Button für eigene Zutaten, primärer Button "✨ Rezept vorschlagen lassen" (deaktiviert/50% Opacity, solange nichts ausgewählt ist).

**Behavior:**
1. Nutzer togglet Zutaten-Chips oder tippt eigene Zutat ein → wird zur Chip-Liste hinzugefügt.
2. Klick auf "Rezept vorschlagen lassen" generiert (im Prototyp: clientseitig zusammengesetzt aus Auswahl) ein Rezept-Objekt mit Name, Zeit, Zutatenliste, 4 generischen Zubereitungsschritten.
3. Ergebnis-Karte zeigt Rezept + Button "In den Essensplan übernehmen" → schreibt das Rezept in den nächsten freien Tag des Wochenplans und zeigt eine Bestätigung ("Landet im Essensplan am Do, 16. Jul 🎉").

**Production note:** Schritt 2 muss durch einen echten Call an die Gemini-API ersetzt werden (Prompt: ausgewählte Zutaten → Rezeptvorschlag inkl. Zubereitungsschritten).

---

### 4. KI-Finanz-Coach (Monatsbericht)
**Purpose:** Am Monatsende ein von der KI generierter, neutraler Ausgabenbericht mit einem konkreten, umsetzbaren Vorschlag — nimmt emotionalen Stress aus dem Thema Geld.

**Layout:** Phone-Frame, Header "Finanz-Coach" / "Juli-Bericht · von Gemini". Insight-Card oben (Sparkle-Icon + Fließtext mit fett hervorgehobener Kernzahl). Darunter Kategorien-Vergleich als horizontale Balken (Lieferdienste, Restaurants, Lebensmittel, Sonstiges) mit Delta-Prozentzahl (rot bei Anstieg, grün bei Rückgang). Vorschlags-Karte unten mit CTA-Button "Fakeaway in Essensplan einplanen".

**Behavior:** Klick auf den CTA trägt automatisch das bestehende Fakeaway-Rezept ("Sushi-Abend") in den nächsten freien Tag des Essensplans ein und zeigt eine Bestätigung.

**Content/copy (Beispiel):** "Ihr habt diesen Monat 15% mehr für Lieferdienste ausgegeben als sonst. Wie wäre es nächsten Monat mit 2 Fakeaway-Abenden mehr?"

**Production note:** Balkenwerte/Deltas und der Insight-Text sind im Prototyp statisch. In Produktion: monatliche, anonymisierte Ausgabenanalyse serverseitig, Text von der KI generiert.

---

### 5. Settings-Seite
**Purpose:** Zentrale Stelle für Konto-, Benachrichtigungs-, Finanz- und App-Einstellungen.

**Layout:** Scrollbarer Phone-Frame mit Sektionen (jeweils Uppercase-Sektionstitel 700 11px, Farbe `#9a9286`, dann eine oder mehrere weiße Cards):
1. **Profil** — Avatar-Icon (48×48px, tippen öffnet ein 8-spaltiges Emoji-Grid zur Auswahl aus 16 Icons: 🦊🦉🐻🐨🐢🦄🐸🐙🌵🍩🌟🔥🎧🎨⚡🌈).
2. **Einladung** — Anzeige des Einladungscodes (z. B. "NIDO-7F3K9") + Button "Neu erstellen" (generiert neuen Zufallscode).
3. **Benachrichtigungen** — zwei Toggle-Zeilen: "Push-Benachrichtigungen" und "Charm-Nachrichten 🥖" (Custom-Switch, 44×26px Pille mit 20px-Knopf).
4. **Finanzen** — Budget-Eingabefeld (Zahl, € / Monat), darunter Kategorien-Liste (Icon + Name + Entfernen-Button) und ein Formular zum Anlegen neuer Kategorien mit Namensfeld + 8-spaltigem Icon-Grid (16 Icons: 🛒🍽️🏠⚡🚗🎉💊👕🎮📱🐾✈️🎬📚☕🎁).
5. **Sprache** — Toggle "App auf Englisch" mit Hinweis "Automatische Übersetzung · Beta" (im Prototyp rein visuell, keine echte Übersetzung).
6. **Konto** — "Abmelden" und "Konto löschen" (rot, `oklch(0.55 0.18 25)`).
7. **Gefahrenzone** — "App komplett zurücksetzen"-Button mit Bestätigungsdialog (zwei Buttons: Abbrechen / Ja, zurücksetzen).

**Default-Werte im Prototyp:** Budget 800 €, Standardkategorien Lebensmittel/Restaurants/Miete & Wohnen/Energie, beide Notification-Toggles an, Sprache Deutsch.

---

### 6. Charm-Push-Benachrichtigungen
**Purpose:** Ein-Klick-Versand liebevoller, anpassbarer Push-Nachrichten zwischen Partnern (nicht nur nüchterne System-Notifications).

**Layout:** Phone-Frame, Liste vorformulierter Nachrichten als antippbare Cards (aktive Auswahl: Hintergrund `oklch(0.955 0.05 80)`, Border `oklch(0.78 0.13 80)`), darunter Freitext-Input für eigene Nachricht, unten CTA "📨 Senden".

**Beispiel-Presets:** "Der Kühlschrank ist voll! 🥖🧀", "Wäsche ist fertig, alles duftet 🧺✨", "Hab an dich gedacht ❤️", "Die Spülmaschine wartet auf dich 🍽️😉".

**Behavior:** Klick auf "Senden" lässt eine Notification-Vorschau von oben ins Phone-Frame einfahren (Slide-in-Animation, `transition: top .4s cubic-bezier(.34,1.56,.64,1)`, Icon 💌 + Absendername "Nido · jetzt" + Nachrichtentext), verschwindet automatisch nach 3.5s oder per Klick.

**Production note:** In Produktion muss das echte Push senden (z. B. via FCM/APNs) an den Partner-Account, inkl. Berechtigungsprüfung.

---

### 7. Navigation (erweitert)
**Purpose:** Zusätzliche Bereiche zugänglich machen, ohne die Haupt-Navigation zu überladen.

**Entscheidung nach Iteration:** Die Bottom-Navigation bleibt bei **5 kompakten Slots** (Start, Haushalt, Einkauf, Finanzen, **Mehr**) statt einen Slot pro neuem Feature zu ergänzen — ein sechster/siebter Icon-Slot wirkte zu überladen und die Tap-Targets wurden zu klein.

**"Mehr"-Verhalten:** Tippen auf "Mehr" (⋯) öffnet ein Popover-Sheet direkt über der Nav-Leiste (`border-radius:18px`, Schatten `0 14px 30px rgba(60,45,30,.18)`) mit 4 Zeilen: 🧳 Bucket-List, 🧠 Finanz-Coach, 💌 Charm-Push senden, ⚙️ Einstellungen. Jede Zeile: Icon + Label + Chevron `›`.

**Floating-Action-Button:** Das zentrale "+"-Icon (schneller Eintrag hinzufügen) ist **absolut positioniert und schwebt über der Nav-Leiste** (nicht mehr Teil des Flex-Icon-Rows), damit die 5 Nav-Icons gleichmäßig verteilt bleiben.

**Konzept-Demo "Bubble-Navigation" (separater Explorations-Screen):** Zeigt eine alternative Idee mit 5 gleich großen, gleichmäßig verteilten Slots und einer animierten "Bubble", die beim Tab-Wechsel mit Farb-Tropfen-Animation zur neuen Position springt. Dient nur als Stil-Exploration, nicht als zu übernehmende Produktionsnavigation — kann als Inspiration für Mikro-Interaktionen dienen.

---

## Design Tokens

**Farben (oklch, aus dem bestehenden System übernommen):**
- Primär/Haushalt (Koralle): `oklch(0.70 0.15 38)`
- Einkauf (Amber): `oklch(0.78 0.13 80)`
- Finanzen (Petrol): `oklch(0.69 0.10 195)`
- Bucket-List (Violett): `oklch(0.64 0.14 312)`
- Reste/Erfolg (Grün): `oklch(0.70 0.13 150)`
- Warnung/Löschen (Rot): `oklch(0.55 0.18 25)`
- Hintergrund App: `#fdfaf5`
- Kartenbackgrounds: helle Pastell-oklch-Töne (z. B. `oklch(0.955 0.05 80)`, `oklch(0.97 0.035 312)`)
- Sekundärtext: `#8c857b` / `#9a9286`

**Typografie:**
- Headlines/Zahlen: **Fredoka**, 700
- UI-Text/Body: **Nunito**, 600/700
- Screen-Titel: 19px Fredoka 700
- Card-Titel: 13–13.5px Nunito 700
- Meta-/Sekundärtext: 10.5–11.5px Nunito 600

**Radien:** Phone-Frame 38px, große Cards 16–22px, kleine Chips/Badges 9–20px (meist pillenförmig für Tags/Chips).

**Schatten:** Cards `0 4px 12px rgba(60,45,30,.05)`, Modals/Popover `0 14px 30px rgba(60,45,30,.18)`, FAB `0 8px 18px <farbe>/.45`.

**Switch-Komponente (Custom Toggle):** Track 44×26px, `border-radius:20px`, Knopf 20×20px weiß, Transition `left .2s`. An = Markenfarbe, Aus = `#e4dccb`.

## Assets
Keine externen Bild-Assets — alle Icons sind Unicode-Emoji (bewusst, passend zum verspielten Markenton "Nido"). Schriften via Google Fonts (Fredoka, Nunito).

## Files
- `Nido.dc.html` — vollständiger interaktiver Prototyp (alle Screens inkl. der hier beschriebenen neuen Features), im selben Ordner beigelegt.
