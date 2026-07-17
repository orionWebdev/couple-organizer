# TwoDo — Modern UI Skin · Handoff

Ein reiner **visueller Refresh** für die bestehende TwoDo-App. **Keine Seitenumbauten**, keine neuen Screens, keine Logikänderung — nur Farben, Typo-Skala, Animationen, Navigation, ein globaler Plus-Button und Dark/Light (inkl. Systemsteuerung).

## Referenz
- `reference/index.html` — interaktiver Prototyp des Ziel-Looks (Light + Dark, alle 5 Tabs). Werte darin sind verbindlich.

## Dateien & Einbau (Reihenfolge = Reihenfolge in PROMPT.md)

| Datei | Zweck | Einbau |
|---|---|---|
| `tokens-dark.css` | Dark-Theme-Tokens, system- **und** manuell gesteuert | in `src/app.css` nach dem `:root`-Block einfügen |
| `modern-layer.css` | Restyle bestehender Utilities (`.card`, `.btn-primary`, `.chip`, `.app-field`, `.section-label`) — größer, klarer | nach `app.css` laden |
| `animations.css` | Feder-Animationen (Karten-Stagger, Abhaken-Pop, Balken/Ring, Press) | nach `app.css` laden |
| `navigation.css` | Schwebende Bottom-Nav mit überstehender Bubble | nach `app.css` laden; Nav-Markup an Contract angleichen |
| `fab.css` + `Fab.vue` | **Ein** globaler Plus-Button, ersetzt alle Add-Buttons, kontextabhängig | FAB einmal im App-Shell mounten; alte Inline-Add-Buttons entfernen |
| `theme.js` | Theme-Controller `system \| light \| dark` (localStorage + `data-theme`) | `initTheme()` beim App-Start; Einstellungs-Screen verdrahten |

## Prinzipien
- **Gleiche Klassennamen** wie im Bestand ⇒ der Modern-Layer ändert nur das Aussehen, nicht das Markup.
- **Akzentfarben unverändert**: eure Bereichs- (`--haushalt`, `--finanzen`, `--planung`, `--dashboard`, `--food`) und Personenfarben (`--chris`, `--sarah`) bleiben. Im Dark-Mode kippen nur Flächen, Text, Ränder und Tints.
- **Motion** nutzt eure vorhandenen `--ease-*`-Tokens und respektiert `prefers-reduced-motion`.
- **Dark/Light**: Default = System (`prefers-color-scheme`); Nutzerwahl setzt `data-theme` am `<html>` und übersteuert das System.

## Was NICHT Teil davon ist
Screens/Inhalte umstellen, Navigationsziele ändern, Datenmodell anfassen. Bewusst ausgelassen — Struktur bleibt 1:1.

## Reihenfolge im Team
Schritt für Schritt nach `PROMPT.md`, nach jedem Baustein Build/Lint + Sichtprüfung gegen `reference/index.html`.
