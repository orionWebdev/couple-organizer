# Handoff: Couple Organizer — geteilte Finanzen, Haushalt & Einkäufe

## Overview
Couple Organizer ist eine mobile App für Paare, um **gemeinsame Finanzen, Haushaltsaufgaben und Einkäufe** an einem ruhigen Ort zu verwalten. Drei Bereiche (Bottom-Nav): **Finanzen**, **Haushalt**, **Einkaufen**. Gestaltungshaltung: minimalistisch, dunkel, „calm" — kein Gamification-Lärm, keine Wertung, ruhiges Feedback.

Beispiel-Paar in den Mocks: **Chris** (blau `#8aa2c2`) und **Sarah** (terracotta `#c69a86`).

## About the Design Files
Die Dateien in diesem Bundle sind **Design-Referenzen, erstellt als HTML-Prototypen** — sie zeigen das beabsichtigte Aussehen und Verhalten, sind **kein** produktionsfertiger Code zum 1:1-Kopieren. Aufgabe ist, diese Designs **in der bestehenden Umgebung des Ziel-Projekts neu zu bauen** (React Native, Flutter, SwiftUI, Web, …) mit dessen etablierten Patterns, Komponenten und Libraries. Falls noch keine Umgebung existiert: das für ein mobiles, dunkles, interaktionsarmes Paar-Tool am besten passende Framework wählen und die Designs dort umsetzen.

Die HTML-Prototypen sind als „Design Components" gebaut; die Logik darin (State, Handler) ist illustrativ und nutzt Beispiel-Daten — sie zeigt das beabsichtigte Verhalten, nicht die finale Daten-/Backend-Architektur.

## Fidelity
**High-fidelity (hifi).** Finale Farben, Typografie, Spacing und Interaktionen sind festgelegt. Die UI pixelnah mit den Libraries/Patterns des Ziel-Codebases nachbauen. Exakte Werte siehe **Design Tokens**.

---

## Screens / Views

### Bottom-Navigation (global)
- 3 reine **Text-Tabs**: Finanzen · Haushalt · Einkaufen. Bewusst **icon-frei**.
- Aktiver Tab: heller Text `#efe9e2` + kleiner Salbei-Punkt `#86a596` darüber/daneben. Inaktiv: `#6f665d`.
- Hintergrund mit Blur, Safe-Area-Padding unten. Fixiert am unteren Rand des Phone-Frames.

---

### 1. Finanzen — Dashboard
**Purpose:** Gemeinsamen Saldo sehen und begleichen, letzte Ausgaben überblicken, neue Ausgabe erfassen.

**Layout:** Vertikaler Scroll. Header-Zeile („Finanzen" + Monat rechts), darunter Saldo-Karte, dann „Letzte Ausgaben"-Liste. Schwebender **FAB (+)** unten rechts (nur auf diesem Screen sichtbar).

**Komponenten:**
- **BalanceHeader (Variante B · Karte) — FINAL.** Salbei-Gradient-Karte `linear-gradient(150deg,#2c3833 0%,#23201b 58%)`, Border `1px solid #38423d`, Radius 22px, Padding 22px. Innerer Glow oben links. Label „GEMEINSAMER SALDO" (uppercase, 12px, `#6f665d`, letter-spacing .14em) + Status-Punkt „aktiv". Betrag zentral, **Geist Mono**, 42px, `#efe9e2`. Darunter Zahler-Initial-Chip + Subjektzeile („Sarah schuldet dir"). Full-width Button „Begleichen": bg `#86a596`, Text `#14110d`, 13px Padding, Radius 13px, 14.5px/600.
  - *Hinweis:* Es gab Header-Varianten A (Ledger) und C (Balance-Bar). **Beide verworfen.** Nur B ist im Build.
- **ExpenseRow:** Avatar-Initial (Zahler-Farbe, 24px, Radius 7px) + Titel (15px/500 `#efe9e2`) / Sub (11.5px `#8c8379`) + Betrag rechts (Geist Mono) + Tag-Farbpunkt. Trennlinie `1px solid #251f1a`, vertikales Padding ~13px.
- **FAB:** „Ausgabe +", Kreis/Pill, Salbei-bg, dunkle Schrift. Öffnet das Add-Ausgabe-Sheet.

### 1b. Finanzen — Add-Ausgabe-Sheet (Bottom-Sheet)
**Purpose:** Neue Ausgabe vollständig interaktiv erfassen.
**Layout:** Bottom-Sheet, Radius 26px oben, Grab-Handle, abgedunkelter Backdrop. `max-height:90%`, scrollbar.
**Komponenten (von oben):**
- Großer Betrag (Geist Mono 40px) + „€"-Suffix (26px, `#8c8379`). Default „0,00".
- Titel-Input (Text), Placeholder „Titel · z. B. REWE Wocheneinkauf".
- **Bezahlt von:** Zwei-Button-Toggle Chris / Sarah. Aktiv: getönter bg (Chris `rgba(138,162,194,.18)`, Sarah `rgba(198,154,134,.18)`), heller Text; inaktiv `#15110d`/`#8c8379`. Initial-Chip im Button.
- **Tag:** horizontale Chip-Reihe (scrollbar): Lebensmittel `#86a596`, Abo `#8aa2c2`, Auto `#c69a86`, Haushalt `#a99ac2`, Essen `#c98a7e`. Aktiv: getönt + Border in Tag-Farbe.
- **Aufteilung:** Toggle „50 / 50" ∣ „Individuell". Bei „Individuell" erscheint ein Range-Slider (accent `#86a596`) mit %-Anzeige für Chris (blau) und Sarah (terracotta).
- **Keypad:** 3×4 Grid (1–9, „,", 0, „⌫"), Geist Mono 18px, Tasten bg `#1a1613` Border `#2f2823` Radius 11px.
- **„Hinzufügen"** Full-width Salbei-Button. Bestätigt mit Toast.

### 1c. Finanzen — Event-Detail
Horizontale **EventCards** (168px breit) auf dem Dashboard: Name, Topf-Summe, Fortschrittsbalken, Meta. Tap → Detail-Ansicht mit denselben Salbei-Tokens wie BalanceHeader B und einer Beitragsliste (EventItem-Rows).

---

### 2. Haushalt — drei Reiter: Pool · Statistik · Verlauf
Segmented Toggle oben rechts neben „Haushalt"-Titel. Container `#221d18` Border `#332c25` Radius 11px Padding 3px. Aktiv-Pill bg `#86a596`, Text `#15110d`.

#### 2a. Pool (Default)
**Schnell erledigt** (persönliche Routinen, editierbar):
- Sektion-Header „SCHNELL ERLEDIGT" + rechts Text-Button „Bearbeiten"/„Fertig" (`#86a596`).
- Personen-Toggle „Für dich" / „Für Sarah" (segmented, bg `#1a1613` Border `#2b251f`). Aktiv-Pill Salbei.
- **2×2 Grid QuickActions:** Kachel bg `#221d18` Border `#332c25` Radius 14px, Label 14px/500 + Kreis-„+" (26px, `rgba(134,165,150,.16)`, `#86a596`). One-Tap loggt sofort (Toast). Im Edit-Modus werden die vier Kacheln zu **Text-Inputs** (umbenennbar). **Jede Person pflegt vier eigene Routinen, getrennt gespeichert.**

**Aufgaben** (mit Zuweisungs-Filter):
- Filter-Chips: **„Mir zugewiesen" (Default)** · „Sarah" · „Alle", dann ein **Trenner** (1px `#2b251f`) und abgesetzt **„Offen N"**. Aktive Chips: bg `rgba(134,165,150,.16)`, Border `#86a596`. Der „Offen"-Chip ist visuell abgehoben: **gestrichelter** Terracotta-Rand (`#5a3d36` → aktiv `#c98a7e`), getönt `rgba(201,138,126,.18)`, mit Mono-Count-Badge.
- **ChoreRow:** große Tap-Checkbox (30px, Border `1.5px #4a4138`; erledigt → bg `#86a596` + „✓") + Name (15px/500) / Sub („Fällig · Tag · Frequenz"; bei offen „Offen · …") + rechts **Zahler-Initial-Chip** (24px). Nicht zugewiesene Aufgaben: Chip zeigt **gestricheltes „?"** (Border `1px dashed #5a5048`, Text `#86a596`). Mehrfach pro Tag erlaubt; erledigt → durchgestrichener Look (Name `#8c8379`).
- **Empty State:** zentriert, ruhig („Hier ist gerade nichts offen. Schön ruhig. ✓").

#### 2b. Statistik
- Karte „Diesen Monat gemeinsam": große Mono-Zahl (z. B. 84) + zweifarbiger Verhältnisbalken (Chris blau / Sarah terracotta) + Legende + ruhiger Kontext-Satz („Keine Wertung, nur Überblick").
- „Nach Aufgabe": Liste mit pro-Aufgabe-Verhältnisbalken (chrisW/sarahW als %-Breiten) + Total „N×".

#### 2c. Verlauf (vertikale Timeline)
**Purpose:** Erledigte Aufgaben chronologisch sehen, neu zuweisen oder löschen.
- **Kopf:** links „HEUTE" (uppercase 11px) + aktuelles Datum (18px/600, z. B. „30. Juni 2026"), rechts Mono-Eintragszahl.
- **Monatsfilter:** Chip-Reihe (scrollbar) „Juni 2026 / Mai 2026 / April 2026". Default = **laufender Monat**. Vergangene Monate auswählbar. Aktiv: getönt + Salbei-Border.
- **Timeline:** nach Tag gruppiert (Tages-Header „HEUTE", „GESTERN · 29.", „SA · 27." …). Vertikale Linie (1.5px `#2b251f`) links; pro Eintrag ein **Punkt** (12px, Border 2px `#15110d`) in Zahler-Farbe — **Salbei `#86a596` bei gemeinsamen Aufgaben**.
- **TimelineEntry-Karte:** bg `#1a1613` Border `#2b251f` Radius 14px. Name (14.5px/500) + **überlappende Initial-Chips** (20px, margin-left −4px) + „Wer · Uhrzeit" (z. B. „Chris & Sarah · 19:40"). Rechts „⋯"-Button.
- **Inline-Aktionsmenü** (auf „⋯"): Sektion „ZUWEISEN" mit drei Buttons **Chris / Sarah / Beide** (aktiver in Personenfarbe, dunkler Text) + Full-width **„Eintrag löschen"** (Border `1px solid #5a3d36`, Text `#c98a7e`). Beide Aktionen bestätigen mit Toast.
- **Gemeinsames Tracking:** Aufgaben können auf **„Beide"** stehen → zwei Initial-Chips + Salbei-Punkt (z. B. „Spülen · Chris & Sarah").

---

### 3. Einkaufen
#### 3a. Übersicht
- **ListCards:** Mono-Zähler-Badge + Listenname + Meta + Chevron, bg `#221d18` Border `#332c25` Radius 16px. Tap → Listen-Detail.
- **„+ Neue Liste"**: gestrichelte Karte (Border `1px dashed #3d362e`), öffnet ein Bottom-Sheet mit Namens-Input + „Liste anlegen". Neue Listen erscheinen sofort.
- Sektion „WIEDERKEHREND" mit Vorlagen-Karten.

#### 3b. Listen-Detail
- Artikel nach Kategorie gruppiert (Obst & Gemüse, Kühlregal, Vorrat). ItemRow mit Checkbox + Name.
- **„Artikel hinzufügen…"**-Inline-Eingabe am Ende: gestricheltes „+"-Quadrat + Text-Input + „Add"-Button (erscheint wenn Text vorhanden). Neue Artikel sammeln sich unter **„Neu hinzugefügt"** und sind sofort abhakbar.
- Full-width „Einkaufsmodus starten".

#### 3c. Einkaufsmodus (Vollbild)
- **ShoppingItem (big):** vollbreite Tap-Zeile, 46px Checkbox links, 22px Label, hoher Kontrast (bg ~`#0a0908`). Einhand-optimiert zum Abhaken unterwegs.
- „Beenden" → **Checkout-Modal**: Betrag per Keypad, Toggle **„In Finanzen übertragen"** legt beim Bestätigen eine getaggte Ausgabe (#Lebensmittel) im Finanzplaner an.

---

## Interactions & Behavior
- **Navigation:** Bottom-Nav wechselt Top-Level-Bereiche; innerhalb Bereichen Sub-Views (finView, choresView, shopView).
- **Begleichen:** ein Tap setzt Netto-Saldo auf 0, Header wechselt auf „Alles ausgeglichen". (Optional in Prod: Bestätigungs-Sheet bei großen Beträgen.)
- **Add-Ausgabe:** Keypad-Eingabe (max. 2 Nachkommastellen, „,"-Sperre nach Dezimal), Zahler/Tag/Aufteilung wählbar, Slider bei „Individuell". Bestätigen schließt Sheet + Toast.
- **QuickAction:** Tap loggt sofort + Toast. „Bearbeiten" toggelt Inline-Rename der vier Kacheln; pro Person separat.
- **Aufgaben-Filter:** wechselt sichtbare ChoreRows (me/sarah/all/open). Checkbox-Tap toggelt erledigt + Toast.
- **Verlauf:** Monatsfilter wechselt Datensatz; „⋯" öffnet genau ein Inline-Menü (andere schließen). Zuweisen überschreibt den Zahler des Eintrags; Löschen entfernt ihn. Beides mit Toast.
- **Einkaufsmodus → Checkout:** optionaler Transfer in Finanzen.
- **Toast:** kurz, zentriert über der Nav, Auto-Dismiss ~1,9 s.
- **Transitions:** sanft, kurz; keine auffälligen Animationen (Calm-Haltung).

## State Management
Pro Bereich ein aktiver View-State plus Interaktions-State:
- **Navigation:** `tab` (finanzen|haushalt|einkaufen), `finView` (dashboard|event), `choresView` (pool|stats|hist), `shopView` (overview|detail|mode).
- **Finanzen:** `net` (offener Saldo), `expenses[]`. Add-Form: `addAmount`, `addTitle`, `addPayer`, `addTag`, `addSplit` (50|custom), `addChrisPct`.
- **Haushalt:** `chores[]` (mit `who: chris|sarah|null`), `checked{}` (erledigt-Status pro id), `choreFilter` (me|sarah|all|open), `quickData{chris[],sarah[]}`, `quickPerson`, `quickEdit`.
- **Verlauf:** `histMonth`, `history{monat: entry[]}` (entry.who = chris|sarah|both), `histAssign{id:who}` (Overrides), `histDeleted{id}`, `histMenu` (offener Eintrag).
- **Einkaufen:** `lists[]` (+`extraLists`), `items[]` (+`extraItems`), `checked{}`, `newListText`, `newItemText`, Checkout: `checkoutVal`, `transfer`.
- **Global:** `toast` (Auto-Clear via Timeout).
- **Daten-Hinweis:** in den Mocks sind Aufgaben-Abhaken und Verlauf **nicht** verknüpft (Verlauf nutzt Beispiel-Datensatz). In Prod sollte ein erledigtes Chore einen Verlaufseintrag erzeugen.

## Design Tokens
**Farben**
- Hintergründe: App `#120f0c`, Karte `#221d18`, Karte-tief `#1a1613`, Salbei-Gradient `#2c3833`→`#23201b`.
- Border: `#332c25`, `#2b251f`, `#251f1a`, `#2f2823`, Salbei `#38423d`/`#86a596`.
- Text: primär `#efe9e2`, sekundär `#8c8379`, tertiär/Label `#6f665d`, auf-Salbei `#15110d`/`#14110d`.
- Akzent (Salbei): `#86a596`; getönt `rgba(134,165,150,.16)`.
- Personen: Chris `#8aa2c2`, Sarah `#c69a86`.
- Tags: Lebensmittel `#86a596`, Abo `#8aa2c2`, Auto `#c69a86`, Haushalt `#a99ac2`, Essen `#c98a7e`.
- „Offen"/Warn-terracotta: Rand `#5a3d36`/`#c98a7e`, Fläche `rgba(201,138,126,.18)`.

**Typografie**
- Sans: **Hanken Grotesk** (system-ui Fallback) — UI, Titel, Copy.
- Mono: **Geist Mono** — alle Beträge, Zähler, Uhrzeiten.
- Skala (px): Label 11–12 (uppercase, letter-spacing .1–.14em), Body 13.5–15, Titel 18–22, Betrag groß 34–42. Gewichte 500/600.

**Radius:** Chips/Buttons 8–14px, Karten 14–22px, Sheets 26px oben, Checkboxen 9px, Initial-Chips 6–7px.

**Spacing:** Screen-Padding 22px horizontal; Sektionsabstände ~16–24px; Row-Padding ~13px vertikal; Grid-/Flex-`gap` 6–11px.

## Assets
- **Keine Bild-Assets.** Avatare sind farbige Initial-Chips (C/S), keine Fotos. Keine Icon-Library nötig (Nav ist text-basiert; „+", „⋯", „✓", „?" als Glyphen). „×" zum Schließen von Sheets.
- Fonts: Hanken Grotesk + Geist Mono (z. B. via Google Fonts / Fontsource im Ziel-Stack einbinden).

## Files
Im Bundle:
- `Couple Organizer.dc.html` — vollständiger interaktiver Prototyp aller Screens.
- `Couple Organizer Handoff.dc.html` — visuelle Spec-Seite (Tokens, Komponenten-Inventar, Flows) als ergänzende Referenz.

> Beide sind **Design-Referenzen**, kein Liefercode. Im Ziel-Codebase mit dessen Komponenten/Patterns nachbauen.
