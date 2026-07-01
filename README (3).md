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
- 3 reine **Text-Tabs**: Finanzen · Haushalt · Einkaufen (Label bewusst „Haushalt", nicht „Chores"). Bewusst **icon-frei**.
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

### 1c. Finanzen — Event-Detail & Finanzevent anlegen
Horizontale **EventCards** (168px breit) auf dem Dashboard: Name, Topf-Summe, Fortschrittsbalken, Meta. Tap → Detail-Ansicht mit denselben Salbei-Tokens wie BalanceHeader B und einer Beitragsliste (EventItem-Rows). Ganz rechts in der Schiene eine gestrichelte **„+ Neues Event"**-Karte.

**Neues Event anlegen:** öffnet **dasselbe Bottom-Sheet** wie „Ausgabe hinzufügen" — direkt unter dem Titel sitzt ein Segment-Toggle **„Ausgabe" ↔ „Neues Event"**. Im Event-Modus zeigt das Sheet nur Name + optionalen Zeitraum; der Bestätigen-Button wechselt zu „Event anlegen". Ein neues Event landet leer in der Detail-Ansicht (Empty State „Noch keine Ausgaben…" mit CTA). Ausgaben werden von dort aus über denselben Sheet-Typ hinzugefügt (Kontext = dieses Event). Der Ausgleichsbetrag beim Abschließen wird **dynamisch** aus den erfassten Ausgaben berechnet (nicht hartkodiert).

---

### 2. Haushalt — vier Reiter: Heute · Alle · Übersicht · Verlauf
Segmented Toggle unter dem „Haushalt"-Titel, 4 gleich breite Segmente. Container `#221d18` Border `#332c25` Radius 12px Padding 4px. Aktiv-Pill bg `#86a596`, Text `#15110d`. **„Heute" ist der Default-Tab** beim Öffnen von Haushalt.

**Datenmodell pro Aufgabe:** `name`, `type` (`recurring` | `once`), `interval` (`täglich`|`wöchentlich`|`monatlich`, nur bei `recurring`), `due` (`today`|`none`|Zahl-Tage-bis-fällig), `assignee` (`chris`|`sarah`|`both`|`open`). **Wiederkehrende Aufgaben werden nie gelöscht** beim Abhaken — sie werden nur für den aktuellen Tag als erledigt markiert und würden in Produktion beim nächsten Intervall zurückgesetzt. **Einmalige Aufgaben** verschwinden nach Erledigung dauerhaft aus dem aktiven Pool (bleiben nur im Verlauf).

**Abhak-Kontrolle (überall gleich):** statt einer einzelnen Checkbox hat jede offene Aufgabe **drei kleine Buttons „C" / „S" / „B"** (Chris/Sarah/Beide) — ein Tap erledigt sie direkt der gewählten Person(en) zugeordnet (kein zweiter Schritt). Erledigt → die Buttons werden zu (ggf. zwei überlappenden) Initial-Chip(s) in Personenfarbe; Tap auf den Chip macht die Erledigung rückgängig.

#### 2a. Heute (Default)
**Purpose:** Zeigt, was die eingeloggte Person (Chris) heute zu tun hat.
- Fortschritts-Header „HEUTE" + Mono-Zähler „X / Y" + dünner Fortschrittsbalken (Salbei).
- **Sektion „Heute":** alle mir zugewiesenen (oder „Beide"-)Aufgaben ohne festen Tag **und** die für heute fälligen — bewusst zusammen oben, wie gewünscht.
- **Sektion „Demnächst"** (nur wenn vorhanden): terminierte, noch nicht fällige Aufgaben, sortiert nach Fälligkeit.
- Empty State: „Nichts für heute geplant. ✓".

#### 2b. Alle (voller Aufgaben-Pool)
- Filter-Chips: **Alle** (Default) · Chris · Sarah · Beide · abgesetzt **Offen** (gestrichelter Terracotta-Rand `#5a3d36`→`#c98a7e`, getönt `rgba(201,138,126,.18)`, wie zuvor).
- **TaskRow:** Abhak-Cluster links + Name + kleines Recurrence-Badge (getönt, `#86a596`) + Meta-Zeile (Termin bzw. „Heute erledigt · Person") + Zuweisungs-Avatar rechts (bei „Beide": Chip zweifarbig gesplittet; bei „Offen": gestricheltes „–") + „⋯"-Button.
- **„⋯"-Menü (inline):** „Zuweisen an" (Chris/Sarah/Beide/Offen — **Aufgabe übertragen**), „Bearbeiten" (öffnet Aufgabe-Sheet vorbefüllt, inkl. Termin/Intervall ändern), „**Aus Pool löschen**" (terracotta, entfernt die Aufgabe dauerhaft aus Heute/Alle/Übersicht).
- **FAB (+)** unten rechts, nur auf diesem Tab: öffnet das Aufgabe-Sheet leer (Neuanlage).

**Aufgabe-Sheet (anlegen/bearbeiten):** Name-Input · Segment-Toggle **Wiederkehrend / Einmalig** · bei Wiederkehrend: Intervall-Pills Täglich/Wöchentlich/Monatlich · Termin-Pills Kein fester Tag/Heute/Bald · Zuweisen-Pills Chris/Sarah/Beide/Offen · Bestätigen-Button „Aufgabe anlegen" bzw. „Änderungen speichern" im Edit-Modus.

#### 2c. Übersicht (Bonus)
**Purpose:** Wer hat heute was, auf einen Blick — plus die gemeinsame Monats-Statistik.
- Zwei **PersonSummaryCards** (Chris, Sarah): Avatar, „X von Y heute erledigt" + Fortschrittsbalken in Personenfarbe, Vorschau der nächsten 3 offenen Aufgaben (+N weitere) bzw. „Alles für heute erledigt ✓".
- Darunter dieselbe Statistik-Karte wie zuvor: „Diesen Monat gemeinsam" (große Mono-Zahl + zweifarbiger Verhältnisbalken) + „Nach Aufgabe"-Liste (pro-Aufgabe-Verhältnisbalken).

#### 2d. Verlauf (vertikale Timeline)
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
- **Neues Finanzevent:** Sheet-Toggle „Ausgabe" ↔ „Neues Event" (im selben Bottom-Sheet wie Ausgabe-Erfassung). Anlegen springt direkt in die leere Event-Detailseite.
- **Aufgabe erledigen:** Tap auf C/S/Beide erledigt sofort (kein zweiter Bestätigungsschritt) + Toast + Verlauf-Eintrag. Tap auf den erledigt-Chip macht es rückgängig. Einmalige Aufgaben verschwinden dabei aus dem Pool, wiederkehrende bleiben (nur optisch „erledigt" markiert).
- **Aufgaben-Filter (Alle):** wechselt sichtbare TaskRows (alle/chris/sarah/beide/offen).
- **Aufgabe anlegen/bearbeiten:** FAB bzw. „⋯" → Bearbeiten öffnen dasselbe Sheet (leer bzw. vorbefüllt). Speichern schließt das Sheet + Toast.
- **Aufgabe zuweisen/löschen:** „⋯" → Zuweisen überschreibt den Assignee sofort; „Aus Pool löschen" entfernt die Aufgabe dauerhaft. Beides mit Toast.
- **Verlauf:** Monatsfilter wechselt Datensatz; „⋯" öffnet genau ein Inline-Menü (andere schließen). Zuweisen überschreibt den Zahler des Eintrags; Löschen entfernt ihn (z. B. bei Fehleingabe). Beides mit Toast.
- **Einkaufsmodus → Checkout:** optionaler Transfer in Finanzen.
- **Toast:** kurz, zentriert über der Nav, Auto-Dismiss ~1,9 s.
- **Transitions:** sanft, kurz; keine auffälligen Animationen (Calm-Haltung).

## State Management
Pro Bereich ein aktiver View-State plus Interaktions-State:
- **Navigation:** `tab` (finanzen|chores|einkaufen), `finView` (dashboard|event), `choresTab` (heute|alle|uebersicht|verlauf), `shopView` (overview|detail|mode).
- **Finanzen:** `net` (offener Saldo), `expenses[]`, `extraEvents[]`, `eventItemsExtra{eventId:item[]}`, `eventSettled{eventId:true}`, `currentEventId`. Sheet: `sheet` (add|newlist|checkout|task), `addMode` (expense|event), `addContext` (dashboard|event) + Ausgabe-Formfelder; `newEventText`/`newEventDate` für die Event-Erstellung.
- **Haushalt:** `_tasks[]` (Basisdaten: id/name/type/interval/due/assignee) + `extraTasks[]` (neu angelegte). Overrides statt Mutation: `taskEdits{id:{...}}` (Bearbeiten/Zuweisen), `poolDeleted{id:true}` (Löschen), `onceDone{id:true}` (einmalige Aufgabe abgeschlossen), `doneToday{id:who}` (heutiger Erledigt-Status). `poolFilter` (alle|chris|sarah|both|offen), `menuOpenId`. Aufgabe-Sheet: `taskEditingId`, `formName`, `formType`, `formInterval`, `formDue`, `formAssignee`.
- **Verlauf (beide Bereiche teilen das Muster):** `histMonth`, `history{monat: entry[]}` (entry.who = chris|sarah|both) + `historyExtra[]` (frisch erledigte Aufgaben, oben angehängt), `histAssign{id:who}` (Overrides), `histDeleted{id}`, `histMenu` (offener Eintrag).
- **Einkaufen:** `lists[]` (+`extraLists`), `items[]` (+`extraItems`), `checked{}`, `newListText`, `newItemText`, Checkout: `checkoutVal`, `transfer`.
- **Global:** `toast` (Auto-Clear via Timeout).
- **Daten-Hinweis:** Erledigen einer Haushaltsaufgabe erzeugt in den Mocks direkt einen `historyExtra`-Eintrag (Verlauf und Abhaken sind hier bereits verknüpft, anders als im ursprünglichen Chores-Entwurf).

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
