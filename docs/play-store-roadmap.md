# TwoDo → Google Play Store & Premium: Fahrplan

Lebendes Dokument. Stand: **12.07.2026**.
Wenn du mit Claude Code an diesem Thema weiterarbeitest: **diese Datei zuerst lesen** — sie sagt, was steht, was fehlt und wo die Fallstricke liegen. Die technischen Details der fertigen Teile stehen in `CLAUDE.md`.

---

## Entscheidungen (stehen fest)

| Thema | Entscheidung |
|---|---|
| Native-Brücke | **Capacitor** (nicht TWA). Android-Projekt liegt in `android/`. |
| Bezahlung | **RevenueCat** → Google Play Billing. Kein Stripe, keine eigene Kasse. |
| Free-Tier | **Großzügig**: alle Kernbereiche frei. Bezahlt wird für KI, Auswertungen, unbegrenzte Listen, Export. |
| Abo-Modell | **Ein Abo pro Paar.** Kauft einer, haben beide Premium. |
| Play-Account | **Organisation** (Gewerbe + D-U-N-S) — umgeht die 12-Tester-Regel. |
| Plattform | **Erst Android.** iOS bewusst vertagt (Capacitor + RevenueCat machen den Nachzug klein). |
| Preis (beschlossen 2026-07-22) | **2,99 €/Monat · 24,99 €/Jahr · Lifetime 34,99 €** (verwaltetes Produkt `twodo_lifetime`, non-consumable; Fair-Use-KI-Limits = `PREMIUM_AI_LIMITS`). Lifetime nicht billiger — 29,99 € läge zu nah am Jahrespreis und würde das Abo kannibalisieren; alternativ ~29 € als kommunizierter Einführungspreis. Google behält 15 %. |

---

## ✅ Erledigt (Code steht, typecheckt, baut)

### Cloud Functions (`functions/`)
TypeScript, Node 22, `europe-west1`. Fünf Endpunkte:
- `suggestRecipes` / `planWeek` / `coachInsight` — Gemini-Proxys. Key liegt im Secret Manager, nicht mehr im Bundle.
- `syncEntitlement` — fragt RevenueCat direkt, gegen Webhook-Latenz nach dem Kauf.
- `revenueCatWebhook` — der belastbare Pfad. Secret-Header, idempotent über `webhookEvents/{event.id}`.

Quoten pro Paar in `usage/{coupleId}` (`functions/src/lib/limits.ts`): KI-Rezepte free 3/Monat, Wochen-Autopilot premium-only, Paar-Coach free 1/Monat.

### Gemini-Key aus dem Bundle
`src/services/gemini.ts` + `geminiFinance.ts` gelöscht → `src/services/ai.ts` (Callables).
Gegenprobe: `npm run build && grep -rl generativelanguage dist/` → leer.

### Entitlement + Paywall
- `Couple.plan` / `premiumUntil` auf dem Couple-Doc, in `firestore.rules` für Clients **unschreibbar**.
- `useCouple()` ist jetzt **Modul-Singleton** (vorher 9 parallele Listener aufs selbe Doc, und `onScopeDispose` riss den Listener ab, sobald irgendeine Komponente unmountete).
- `usePremium.ts` (RevenueCat), `usePaywall.ts` + `PaywallSheet.vue`, `/premium`-Route.

### Gating (7 Stellen)
Einkaufslisten (2) · Ressourcen (1) · Rezepte (10) · Haushalts-Verlauf (2 Monate) · Paar-Coach (1/Monat) · KI-Rezepte (3/Monat) · Wochen-Autopilot · Export.
Muster: Composable erzwingt (`canX`-Computed), View öffnet die Paywall. Nie ein stiller No-Op.

### Capacitor / Android
`capacitor.config.ts`, `android/` (targetSdk 36 ✓), Back-Button-Stack, Splash-Kette, Safe-Areas, Fonts selbst gehostet, `InviteCodeBox` auf Capacitor-Plugins.

---

## ⏳ Offen — DU (externe Konten, wartet auf Dritte)

**Kritischer Pfad, so früh wie möglich starten:**

1. **Gewerbe anmelden** (20–60 €, Gewerbeamt).
   → Danach kommt automatisch der Fragebogen zur steuerlichen Erfassung (ELSTER).
   → **Steuerberater fragen**: Google (Irland) ist Verkäufer gegenüber dem Endkunden; deine Leistung geht B2B nach Irland → Reverse Charge → vermutlich USt-IdNr. + Zusammenfassende Meldung nötig, **auch als Kleinunternehmer**.
2. **D-U-N-S-Nummer** beantragen (kostenlos, **1–2 Wochen** — der längste Vorlauf im ganzen Projekt).
3. **⚠️ DSA-Händlerstatus**: Wer monetarisiert, ist Händler. Google zeigt **Name, Anschrift, Telefon, E-Mail öffentlich** auf der Store-Seite. → **Keine Privatadresse verwenden.** Geschäfts-/Impressumsadresse besorgen.

**Firebase / RevenueCat (ohne das läuft keine KI und kein Kauf):**

4. Firebase auf **Blaze** hochstufen (Functions gehen sonst nicht; real ~0–5 €/Monat).
5. Firebase CLI: `npm i -g firebase-tools && firebase login` — **ist aktuell gar nicht installiert**, es wurde noch nie etwas deployt.
6. **Neuen** Gemini-Key erzeugen (ohne Referrer-Sperre, Server-Key) und den alten **löschen** — der steckt in der Git-History.
   `firebase functions:secrets:set GEMINI_API_KEY`
7. **App Check** aktivieren (reCAPTCHA Enterprise fürs Web) → `VITE_APPCHECK_SITE_KEY` in `.env.local`.
8. **RevenueCat**-Projekt: Entitlement `premium`, Offering `default`, Play-Service-Account verknüpfen, Webhook auf die deployte `revenueCatWebhook`-URL zeigen.
   `firebase functions:secrets:set REVENUECAT_SECRET_KEY` + `REVENUECAT_WEBHOOK_SECRET`
   → `VITE_RC_ANDROID_KEY` in `.env.local`.
9. **Play Console** (25 $): App anlegen, Abo-Produkt `together_premium` mit Base Plans `monthly`/`annual`.

---

## ⏳ Offen — CLAUDE (Code, wenn du wieder Zeit hast)

- **Deploy**: `firebase deploy --only firestore` (Rules + die noch nie deployten Indizes für `mealPlans`, `resources`, `bookings`) und `--only functions`.
- **Rechtstexte + Firebase Hosting** — Play verlangt eine öffentliche Datenschutz-URL und einen **Web**-Pfad zur Kontolöschung (der In-App-Weg allein reicht nicht):
  `/impressum`, `/datenschutz` (Gemini-Nutzung offenlegen!), `/agb`, `/konto-loeschen`.
  `firebase.json` hat noch **keinen** `hosting`-Block.
- **Push/Erinnerungen** (FCM + `@capacitor/push-notifications` + Scheduled Function) — als Premium-Feature vorgesehen.
  ⚠️ Bis dahin: der `notifyPush`-Schalter in `SettingsView` schreibt ins Nichts. Vor dem Store-Listing **ausblenden**, sonst verspricht die App etwas, das sie nicht tut.
- **Bucket-List**: `useBucketList.ts` + `BucketListItem` + Firestore-Rules sind komplett gebaut, werden aber **nirgends importiert**. Entweder als Premium-Feature ausspielen (billigster Gewinn im Repo) oder vor dem Listing entfernen. Nicht schlafend ausliefern.
- **Play-Store-Assets**: Feature-Graphic 1024×500, Screenshots, Store-Beschreibung, Data-Safety-Formular, Content-Rating, KI-Kennzeichnung.
- **Signierung**: Upload-Keystore erzeugen (`android/keystore.properties` ist gitignored).
  ⚠️ **Backup außerhalb des Projekts!** Keystore verloren = App nie wieder aktualisierbar.
- **Erste APK**: braucht Android Studio + JDK — auf diesem Rechner ist **beides nicht installiert**.

---

## ⚠️ Zwischenstand: Gemini läuft direkt aus dem Browser — auch produktiv

Die App läuft für euch beide **auf Vercel** (`npm run build`, kein Firebase Hosting). Weil die Functions nicht deployt sind (Blaze fehlt), würden dort alle KI-Aufrufe ins Leere laufen. Deshalb geht der Aufruf **direkt an Gemini**, mit `VITE_GEMINI_API_KEY` — wie vor dem Umbau, und bewusst **nicht nur im Dev-Server, sondern auch im Vercel-Build**.

- Weiche: `useDirect` in `src/services/ai.ts` (= "Key gesetzt?"), Implementierung in `src/services/aiDirect.ts`.
- **Der Key liegt damit im öffentlichen JS-Bundle** (`dist/assets/aiDirect-*.js`) und ist auslesbar. Bewusste, temporäre Entscheidung — der Preis dafür, die App ohne Blaze benutzbar zu halten. Zusätzlich steckt er in der Git-History.
  → Wenn dir das zu heiß wird: neuen Key in AI Studio, in der Cloud Console per **HTTP-Referrer auf die Vercel-Domain** einschränken, alten löschen.
- Nötig auf Vercel: `VITE_GEMINI_API_KEY` als **Env-Variable im Projekt** setzen (Build-Time!), sonst fällt die Weiche auf die Callables zurück und die KI ist tot.
- **Nach dem Functions-Deploy**: `VITE_GEMINI_API_KEY` in Vercel **und** `.env.local` + `env.d.ts` entfernen, `src/services/aiDirect.ts` löschen. Die Weiche greift dann nicht mehr, alles läuft über die Callables.

### 🚧 Der echte Engpass: 20 Gemini-Anfragen pro TAG

Gemessen am 2026-07-21 gegen den Live-Key:

```
quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier
metric : generate_content_free_tier_requests   value: 20   model: gemini-2.5-flash
```

**20 Anfragen pro Tag fürs ganze Google-Projekt** — geteilt von beiden Partnern, über alle KI-Funktionen hinweg. Ein Wochenplan = 1, ein Rezeptvorschlag = 1, ein Neu-Denken = 1, ein Check-in = 1. Damit ist eine normale Woche Nutzung an einem Nachmittag aufgebraucht.

Fallstricke dabei:
- Die API antwortet mit `retryDelay: 17s` — **irreführend**. Das ist ein generischer Backoff-Hinweis, kein Minutenlimit. Zurückgesetzt wird täglich.
- Es gibt **zwei** verschiedene 429er (Minuten- und Tageslimit). `src/services/ai.ts` unterscheidet sie am `quotaId`/`PerDay`-Marker und formuliert entsprechend — sonst schickt die App den Nutzer in eine Minute Wartezeit, die nichts ändert.
- `gemini-2.5-pro` ist im Free-Tier **gar nicht** nutzbar (`limit: 0`). Deshalb läuft auch der Coach auf Flash; die Konstante `COACH_MODEL` liegt getrennt, damit es nach Billing eine Zeile ist.

**Auflösung: Billing auf dem Google-Projekt aktivieren.** Damit fällt das Projekt in den bezahlten Tier mit deutlich höheren Tageslimits; bei zwei Nutzern reden wir über Cent-Beträge. Es ist dieselbe Kreditkarte, die auch Blaze braucht — löst also beides auf einmal. **Bis dahin bleiben die KI-Funktionen praktisch unbenutzbar**, egal wie gut der Code ist.

**Premium/Paywall auf Vercel**: Kaufen geht im Web nicht (`usePremium().canPurchase` ist nur nativ true). Damit euch die sieben Gates nicht aussperren, in der Firestore-Konsole auf eurem `couples/{id}`-Doc von Hand `plan: "premium"` + `premiumUntil` (Timestamp weit in der Zukunft) setzen — siehe unten. Der Finanz-Coach hängt an genau diesem Flag.

---

## Premium testen, ohne irgendwas einzurichten

`plan: "premium"` von Hand ins Couple-Doc in der Firestore-Konsole schreiben. Die ganze UI schaltet live um — bei **beiden** Partnern gleichzeitig, weil der Flag am Couple-Doc hängt. Zurück auf `"free"` schalten und alle sieben Gating-Punkte einmal gegen die Wand fahren: es muss immer die Paywall aufgehen, nie nichts passieren.

---

## Kosten

| Posten | |
|---|---|
| Gewerbeanmeldung | 20–60 € einmalig |
| Play Console | 25 $ einmalig |
| D-U-N-S | kostenlos (1–2 Wochen) |
| Firebase Blaze | ~0–5 €/Monat bei dieser Nutzerzahl |
| RevenueCat | kostenlos bis ~2.500 $ Monatsumsatz, danach 1 % |
| Gemini | Cent-Beträge, durch Quoten gedeckelt |
| Domain + Impressumsadresse | ~15 €/Jahr + ggf. ~15 €/Monat |
