# 3er-Navigation — Heute · Wir · Alltag

Entwurf für den Umbau von fünf Tabs auf drei, Juli 2026. Der Auslöser: die Struktur fühlte
sich nach dem Wir-Umbau nicht mehr richtig an.

## Der Befund, aus dem der Entwurf folgt

Die Tab-Zahl ist nur das Symptom. Drei Strukturfehler stecken darunter:

1. **Zwei Hubs.** Start spiegelt jeden anderen Tab (Essen → Küche, Aufgaben → Haushalt,
   Belegung → Kalender, Finanzen → Geld, Check-in → Wir). Jedes Ziel ist zweimal erreichbar,
   keiner der Wege ist kanonisch.
2. **„Wir" ist selbst ein Beutel.** Segment „Wir" (Gefühle) und Segment „Planung" (Kalender,
   Reisen, Notizen) haben inhaltlich nichts miteinander zu tun.
3. **Der Coach ist dreimal da.** `coachInsight` kennt drei Linsen (`week` · `fairness` · `money`),
   aber sie hängen an drei Orten: `CoachCard` (Wir), `FairnessCard` (Haushalt → Übersicht),
   `FinanzCoachView` (Finanzen → Tab).

Fehler 3 ist der Hebel: zieht die reflektierende Schicht — Coach, Fairness-Bewertung,
Punktestand — vollständig nach „Wir", bleibt von jedem Bereich genau ein operatives Segment
übrig. Erst dann passen vier davon in einen Tab.

**Ist:** 5 Tabs, 10 Segmente, 3 Coach-Flächen → **Soll:** 3 Tabs, 4 Segmente, 1 Coach mit 3 Linsen.

## Die Dateien

| Datei | Zeigt |
| --- | --- |
| `00-ia-map.html` | Struktur-Karte Ist → Soll plus vollständige Umzugsliste |
| `01-nav-a.html` | Leiste A — Alltag mit eigenem Ton (Terrakotta), drei feste Farben |
| `01-nav-b.html` | Leiste B — Bubble übernimmt die Farbe des offenen Segments |
| `02-heute.html` | Start entdoppelt: alles hier hat ein Datum von heute |
| `03-wir.html` | Coach mit Linsen-Umschalter, Check-in, Mental Load + Punktestand, Ideen & Reisen |
| `04-alltag-aufgaben.html` | Drei Segmente werden eine Liste mit Chips — Variante einreihig / zweireihig |
| `05-alltag-kueche.html` | Wochenplan über Einkaufsliste, Rezept-Wiki als Unteransicht |
| `06-alltag-geld.html` | Saldo, Events, Ausgaben; Analyse als Unteransicht |
| `07-alltag-kalender.html` | Monatsraster, Tagesdetail, Serien, Notizen |

Alle Screens sind in **Variante B** gezeichnet (Segmentfarbe an der Bubble), damit die
Bereichstöne sichtbar bleiben. In Variante A wären alle vier Segmente terrakotta.

## Zwei Entscheidungen, die offen sind

1. **Akzentfarbe von „Alltag"** — A (eigener fester Ton) oder B (Bubble folgt dem Segment).
   Bei B ist zusätzlich zu klären, welche Farbe „Kalender" bekommt: das frühere Blau gehört
   jetzt „Wir". Vorschlag im Entwurf: Amber (`--einkauf`), das seit der Küchen-Umbenennung nur
   noch die Ausgaben-Kategorie „Einkauf" einfärbt.
2. **Chip-Reihe bei den Aufgaben** — alles in einer Reihe, oder Sicht (exklusiv) und Räume
   (multiselect) getrennt. Vorschlag: getrennt, mit deutlich flacherer zweiter Reihe.

## Zwei Funde aus dem Bau dieser Entwürfe

**Der FAB kollidiert bei drei Slots mit der Nav-Bubble.** Bei drei Spalten liegt die Mitte des
dritten Slots bei rund 83 % der Leistenbreite — praktisch genau unter dem FAB. Vertikal lässt der
App-Wert `bottom: calc(120px + safe)` gegenüber der überstehenden Bubble ohnehin nur ~2 px Luft;
horizontal wird es mit drei Slots deutlich enger als mit fünf. In diesen Entwürfen steht der FAB
deshalb auf 126 px. Beim Umbau mitentscheiden: FAB höher, oder bei aktivem letzten Slot nach links
ausweichen.

**`--shadow-accent` ist in der App farbblind.** Das Token wird in `:root` als
`color-mix(in srgb, var(--accent) 35%, transparent)` deklariert. Custom Properties lösen ihr
`var()` schon bei der Deklaration auf und vererben den fertigen Wert — ein späteres Überschreiben
von `--accent` in `.area-finanzen` & Co. erreicht das Token nicht mehr. Gemessen in einem
`.area-finanzen`-Kontext: `color(srgb 0.923 0.475 0.335 / 0.35)` — Terrakotta statt Türkis.
Betroffen sind `.btn-primary` (`src/app.css:365`) und fünf Komponenten, darunter
`BalanceCard.vue:125` (müsste türkis sein) und `ShoppingModeView.vue:223` (müsste rot-orange sein).
Jeder Primärbutton der App glüht also terrakotta, egal in welchem Bereich.
Fix: die `color-mix`-Zeile an die Nutzungsstelle holen, oder `--shadow-accent` in jedem
`.area-*`-Block erneut deklarieren. Unabhängig vom Navigations-Umbau.

## Öffnen

HTML-Datei doppelklicken. Kein Build, kein Dev-Server. Das lokale `styles.css` zieht
`src/app.css` direkt herein, die Entwürfe laufen also immer auf den **echten, aktuellen** Tokens
der App und können nicht von ihr wegdriften. Die Schriften kommen aus `public/fonts/`.

## Verhältnis zur Kopie in Claude Design

Dieselben Dateien liegen im Design-Projekt „Couple Organizer Design" unter
`explorations/nav-3er/` (Gruppe „3er-Navigation"), wo das Panel sie live als Karten rendert.
Der **einzige** Unterschied ist eine Zeile pro HTML-Datei: dort `../../styles.css` (das
Stylesheet des Design-Projekts), hier `./styles.css` (die Brücke zu `src/app.css`).
Wer eine Datei ändert, sollte beide Seiten nachziehen.

## Konventionen

Wie in `explorations/wir-redesign/` des Design-Projekts: eigenständige HTML-Dateien mit
`@dsCard`-Marker in Zeile 1, `shared.css` für das gemeinsame Gerüst (Telefonrahmen, Leiste,
Karten). Keine neuen Farb- oder Radienwerte — alles kommt aus den Tokens.
