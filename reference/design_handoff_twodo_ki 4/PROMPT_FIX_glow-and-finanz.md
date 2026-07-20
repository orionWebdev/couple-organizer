# Fix-Prompt — Sheet-Glow (Modal-Hintergrund) + 6·A Auslöser-Halo für den Finanz-KI-Vorgang

> Paste in denselben Claude-Code-Chat. Behebt (1) den nicht funktionierenden Gradient-Glow hinter dem
> Aktions-Sheet und (2) ergänzt den Denk-Zustand für den **Finanz-Coach** (Direkt-Auslöser ohne Sheet)
> mit dem **6·A Auslöser-Halo**. Referenz: `twodo-ki-states-and-motion.html`, Sektion 7 bzw. 6.

---

## Teil 1 — Sheet-Glow reparieren (der Gradient-Hintergrund am Modal fehlt)

Ziel: Wenn das Aktions-Sheet in den Denk-Zustand (`sheetthink`) geht, soll ein weicher, atmender
**Gradient-Schein rund um das Sheet** liegen — nicht im Sheet, sondern als Aura dahinter, die nur an
den Kanten herausragt.

Das ist ein **eigenes Element hinter dem Sheet**, kein `box-shadow`:

```html
<div class="ai-sheet">           <!-- das Bottom-Sheet, opaker Hintergrund -->
  <div class="ai-sheet__glow"></div>   <!-- Aura, liegt HINTER dem Sheet -->
  <!-- Grip, Denk-Zeile, Fortschrittsleiste … -->
</div>
```

```css
.ai-sheet { position: absolute; left:0; right:0; bottom:0; z-index:6;
  background: var(--surface);          /* OPAK — verdeckt die Aura, nur der Rand-Bleed zeigt */
  border-radius: 28px 28px 0 0;
  /* WICHTIG: kein overflow:hidden hier, sonst wird die Aura abgeschnitten */
}
.ai-sheet__glow { display:none; position:absolute;
  left:-3px; right:-3px; top:-5px; bottom:0;   /* ragt oben/seitlich heraus */
  z-index:-1;                                  /* HINTER die opake Sheet-Fläche */
  border-radius: 32px 32px 0 0;
  background: var(--ai-gradient); background-size:300% 300%;
  filter: blur(22px); opacity:.78;
  animation: aiShift 4s ease-in-out infinite, edgeBreath 2.8s ease-in-out infinite;
}
.ai-sheet[data-step="sheetthink"] .ai-sheet__glow { display:block; }
```

**Die drei häufigsten Fehlerursachen (bitte prüfen):**
1. **`overflow:hidden`** am Sheet oder an einem Eltern-Container (Modal-Wrapper, Teleport-Target) schneidet
   die Aura weg. → Auf der Kette Sheet → Wrapper → Portal darf nichts clippen; der unblurrte Bereich muss
   über den Sheet-Rand hinausragen dürfen.
2. **`z-index:-1` ohne Stacking-Context / falsche Reihenfolge:** Die Aura muss hinter dem *Hintergrund* des
   Sheets liegen. Das klappt nur, wenn der Sheet-Hintergrund auf dem Sheet-Element selbst liegt (nicht auf
   einem inneren Wrapper) und die Aura ein direktes, `position:absolute`-Kind mit `z-index:-1` ist.
   Alternativ die Aura als **Sibling direkt vor dem Sheet** rendern (niedrigerer z-index als das Sheet).
3. **`edgeBreath` fehlt** (Keyframe war nur beim alten Rand-Glow definiert): sicherstellen, dass es global
   existiert: `@keyframes edgeBreath { 0%,100%{opacity:.55} 50%{opacity:1} }`.

Kein Gradient-Strich/Hairline an der Sheet-Oberkante (bewusst entfernt) — nur die weiche Aura.

Der Rest des `sheetthink`-States bleibt wie im README §4·PRIMÄR: Zeilen+Titel aus, Denk-Zeile
(Gradient-Icon · Status · Mini-Loader in Akzent-Lila `#9b72cb`/dark `#c3a9e6`) + dünne Fortschrittsleiste.

---

## Teil 2 — Finanz-KI-Vorgang: 6·A Auslöser-Halo

Der **Finanz-Coach** ist ein **Direkt-Auslöser ohne Sheet** (`pill`-Button im Kartenkopf „Diesen Monat").
Er hat also keinen Sheet-Glow — der Denk-Zustand verankert **am Button selbst** (6·A Auslöser-Halo).

Verhalten beim Tap auf „KI-Coach" / „Ausgaben analysieren":
1. Der KI-Button bekommt einen weichen, atmenden **Gradient-Schein nur um sich herum** (Aura dahinter),
   und **atmet** leicht mit.
2. Der Button-Inhalt (Icon, Label) faded aus; stattdessen **Mini-Loader (weiß, auf dem Gradient)** +
   Status „Analysiert eure Ausgaben …".
3. Ende → Bloom (~480 ms) → Ergebnis (Finanz-Auswertung erscheint in der Karte).

```css
/* Halo hinter dem Auslöser-Button */
.ai-btn { position: relative; }
.ai-btn__halo { display:none; position:absolute; inset:-7px; z-index:-1;
  border-radius: 26px;                 /* etwas größer als der Button-Radius */
  background: var(--ai-gradient); background-size:300% 300%;
  filter: blur(16px); opacity:.72;
  animation: aiShift 4s ease-in-out infinite, edgeBreath 2.6s ease-in-out infinite;
}
.ai-btn[data-thinking] { animation: aiShift 6s ease-in-out infinite, aiBreath 2.6s ease-in-out infinite; }
.ai-btn[data-thinking] .ai-btn__halo { display:block; }
.ai-btn[data-thinking] .ai-btn__content { opacity:0; }   /* Icon+Label ausblenden */
.ai-btn[data-thinking] .ai-btn__thinking { display:flex; align-items:center; gap:12px; } /* Loader+Status */
```

- Für die `pill`-Variante (Finanz-Coach-Kartenkopf) den Halo-Radius an die Pill anpassen
  (`inset:-6px; border-radius:999px`).
- Mini-Loader hier **weiß** (der Halo/Button ist Gradient), nicht Akzent-Lila — das Lila gilt nur beim
  Sheet-Glow auf hellem Sheet-BG.
- Gleiche Fehlerursachen wie oben beachten: **kein `overflow:hidden`** am Button/Kartenkopf, sonst wird
  die Aura abgeschnitten.
- Status-Text `role="status"` / `aria-live="polite"`.

**Weiche-Regel (Zusammenfassung):** Aktion aus einem **Sheet** → Sheet-Glow (`sheetthink`). Direkt-Auslöser
**ohne Sheet** (Finanz-Coach, Rezept-Wiki) → 6·A Auslöser-Halo. Kein Vollbild außer dem finalen Bloom;
kein Viewport-Rand-Glow, keine Denk-Leiste.

Referenz-Implementierung: **Sektion 6 (Vorschlag A)** und **Sektion 7** in `twodo-ki-states-and-motion.html`.
