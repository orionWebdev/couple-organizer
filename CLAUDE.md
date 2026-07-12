# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Together" (user-facing brand + PWA manifest name; the repo/internal name is still "Couple Organizer"/"Paarplaner") — a mobile-first PWA for couples to manage shared finances, household chores, shopping lists, and weekly meal planning (with Gemini-assisted recipe suggestions). Vue 3 + TypeScript + Vite on Firebase (Auth + Firestore), plus a thin Cloud Functions layer (`functions/`) that exists for exactly two reasons: it holds the Gemini API key server-side, and it is the only writer of the premium entitlement.

The same codebase ships as a **web PWA** and as an **Android app via Capacitor** (Google Play, subscription via RevenueCat → Play Billing). The only platform forks are `src/services/platform.ts`, the `native` Vite mode, and the dynamically imported `src/native/bootstrap.ts`.

> **Play Store / Premium work is in progress — read `docs/play-store-roadmap.md` first** if the task touches the store release, billing, Cloud Functions, or the paywall. It tracks what is done, what is still open (including steps only the user can do), and the traps.
>
> **The app is live on Vercel** (plain `npm run build`, no Firebase Hosting, no `vercel.json` — Vercel auto-detects Vite) and that is how the two actual users run it day to day. On the Firebase side, **`firestore.rules` and `firestore.indexes.json` are deployed** (first push on 2026-07-12, `firebase deploy --only firestore` via `npx firebase-tools` — the CLI is not installed globally). The **Cloud Functions are still not live**: the project is on the Spark plan and Blaze is the blocker (`firebase functions:secrets:*` and `deploy --only functions` both refuse without it).
>
> One index exists in the live project that is *not* in `firestore.indexes.json` — the deploy reports it every time and leaves it alone (deleting would need `--force`). Nobody has checked yet which one it is.
>
> Consequently the AI features run through a **direct-to-Gemini fallback** (`src/services/aiDirect.ts`, switched on by `useDirect` in `ai.ts`) — and, unlike before, **this fallback is deliberately live in production too**. The switch is nothing but the presence of `VITE_GEMINI_API_KEY` at build time (set in `.env.local` locally, in the Vercel env vars for the deployment), so the API key ships inside the public JS bundle. That is a conscious, temporary trade — it is exactly how the app worked before the Cloud-Functions rewrite, and the alternative would be an app with no AI at all until Blaze is sorted out. Verify with `npm run build && grep -rl generativelanguage dist/` (must find `dist/assets/aiDirect-*.js`).
>
> **Once the functions are deployed:** remove `VITE_GEMINI_API_KEY` from Vercel *and* `.env.local`, then delete `aiDirect.ts` — the switch falls through to the callables on its own. Rotate the key at the same time; the current one is in the git history.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — typecheck (`vue-tsc -b`) then production build (web, **with** service worker)
- `npm run build:native` — same, but `--mode native`: **no service worker** (see `vite.config.ts`)
- `npm run cap:sync` — `build:native` + `cap sync android`
- `npm run cap:android` — open the Android project in Android Studio
- `npm run typecheck:watch` — `vue-tsc -b --watch` for incremental type checking
- `npm run preview` — preview a production build

There is no test suite and no lint script configured in this repo.

`firebase.json` wires up `firestore.rules`, `firestore.indexes.json` and `functions/`. Both `firebase deploy --only firestore` and `--only functions` are real deployments against the live project (`couple-organizer-8b245`) — confirm before running either. Functions require the Blaze plan and three secrets (`GEMINI_API_KEY`, `REVENUECAT_SECRET_KEY`, `REVENUECAT_WEBHOOK_SECRET`, set via `firebase functions:secrets:set`).

## Architecture

### Data model: single shared "couple" scope

Every piece of app data hangs off a `coupleId`. A `couples/{coupleId}` doc holds exactly the two partners (`memberIds`, `memberNames`, `inviteCode` used to join). All other top-level Firestore collections (`chores`, `choreHistory`, `shoppingItems`, `shoppingLists`, `expenses`, `financeEvents`, `recipes`, `mealPlans`, `resources`, `bookings`, `bucketListItems`, `trips`, `notes`) carry a `coupleId` field and are secured in `firestore.rules` via an `isCoupleMember(coupleId)` check — a document is only ever readable/writable by the two members of that couple. `src/types/index.ts` is the source of truth for all of these document shapes.

There is no global store (no Pinia/Vuex). Instead, each top-level view (`src/views/FinanzenView.vue`, `HaushaltView.vue`, `EinkaufenView.vue`) independently derives `coupleId` from `useAuth().user.value.coupleId` and passes it into the relevant domain composable.

`useCouple()` is the exception: like `useAuth()`, it is a **module singleton** — one `onSnapshot` on `couples/{coupleId}` for the whole app, started by a module-level `watch` on `user.coupleId`, with no `onScopeDispose`. It has to be, because the premium entitlement lives on that doc and needs a listener that survives any single component unmounting. It also exports a `coupleReady` promise (mirroring `authReady`) that the router guard awaits before judging `requiresPremium`.

### Composable pattern (`src/composables/use*.ts`)

Domain composables (`useChores`, `useExpenses`, `useShopping`) share one shape — follow it when adding a new domain:
- Take `coupleId: Ref<string | null>` as input.
- `watch(coupleId, ..., { immediate: true })` tears down any previous `onSnapshot` listener and starts new realtime listeners scoped to that couple.
- Expose raw collections as `readonly()` refs, plus `computed()` derived views (filters, summaries, balances) rather than recomputing in components.
- Clean up listeners in `onScopeDispose`.
- Mutating functions (`addX`, `updateX`, `deleteX`, ...) never throw to the caller — they catch, log via `console.error`, set a local `error` ref, and return a boolean/`null` success signal.
- `useAuth()` is the one exception to the "new state per call" rule: its `user`/`loading` refs are module-level singletons updated by a single `onAuthStateChanged` listener, so every call site sees the same auth state.

`src/utils/chores.ts` and `src/utils/rooms.ts` hold pure display-formatting helpers (due-date bucketing, assignee avatar/label logic, room metadata) that read `Chore`/`Couple` data — keep formatting logic here rather than duplicating it in components.

### Routing & auth gating

`src/router/index.ts` has a single `beforeEach` guard that awaits `authReady` and redirects based on two route meta flags: `requiresAuth` (must be signed in) and `requiresCouple` (must have a `coupleId`, otherwise sent to `/couple-setup`). The five main tabs — **`/dashboard` (Start, default landing) · `/haushalt` · `/planung` · `/finanzen` · `/einkaufen` (labelled "Essen")** — are children of `TabsView.vue`, which renders the bottom tab bar and hosts cross-tab UI (`Toast`, the invite-partner `BottomSheet`, `PaywallSheet`).

Two routes are children of `TabsView` but have **no nav slot of their own**:
- `/belegung` (`WochenkalenderView.vue`) — the Belegung week calendar, opened from the Dashboard card and from the Planung tab. `SLOT_ALIASES` in `TabsView.vue` maps it onto the "Planung" slot, so the bubble stays there instead of falling back to "Start".
- `/settings` — reached only through `components/ui/ProfileButton.vue`, the couple's overlapping avatar stack sitting top-right in every tab's `.page-header`. It has no area, so the bubble stays on "Start".

### Bottom navigation (bubble + collar + droplets)

`TabsView.vue`'s nav bar is not a plain tab strip: a floating circular "bubble" (colored per active area — indigo `--dashboard`, terracotta `--haushalt`, blau `--planung`, türkis `--finanzen`, rot-orange `--food`) sits centered on the nav bar's *top edge* (both the bubble and the white "collar" halo behind it use `left: X%; transform: translate(-50%, -50%)`, so they're always exactly half above/half overlapping the bar regardless of screen width — `X` comes from `slotCenterPercent(index)`, purely index-based math, no DOM measurement). Switching tabs: `left` transitions with the existing `--ease-overshoot` bounce curve, a `bubbleJump1`/`bubbleJump2` class alternates every switch to force the CSS arrival-hop keyframe animation to restart (same name reapplied wouldn't replay), and 5 small droplets in the *previous* area's color are spawned along an arc between the old/new slot and removed via `setTimeout` once their `dropletFall` animation finishes. All of this is index/percentage-based by design — do not reintroduce fixed pixel positions here, the original design reference (`reference/Nido-source-code.dc.html`) used a fixed-width canvas that doesn't apply to a responsive layout.

### Dashboard ("Fokus & Regale")

Source: `reference/design_handoff_dashboard_b_v2/` (README + React prototypes). The old equal-weight bento grid is gone; `DashboardView.vue` now has **two zones**: "Jetzt im Fokus" (one meal hero) and "Auf einen Blick" (three glance cards). **Shopping is deliberately no longer on the Dashboard** — a tab tap leads straight to the list anyway. It instantiates `useChores`, `useMealPlan`, `useExpenses` and `useBelegung` (each with its own listeners — the usual "new instance per call site").

- `MealHero.vue` — today's meal from `useMealPlan().week` (matched by `dateKey(new Date())`), with the "Wer kocht?" pills writing `MealPlanEntry.cookAssignee` via `setCookAssignee()`.
- `FinanceGlanceCard.vue` — budget ring + pace pill + "zuletzt bezahlt" + Paar-Split + settle-up button. See "Finance domain specifics" for *which* numbers go where; getting that wrong is the easiest mistake in this card.
- `BelegungShelfCard.vue` — mini week strip, resolved from the booking series via `expandWeek()`; opens `/belegung`.
- `HaushaltBalanceCard.vue` — fairness scale over this week's `choreHistory`. A `completedBy: 'both'` entry counts **for both partners**, otherwise a couple that does everything together would permanently look "unfair".
- `DashboardOnboarding.vue` — shown only when there is genuinely nothing (no meal, chores, bookings, resources *or* expenses). A missing budget alone does **not** make the dashboard empty.

Mount animations (ring fill, count-up, growing bars/dots) come from `src/composables/useMountAnim.ts` (`useMountFlag` + `useCountUp`); both short-circuit to the end state under `prefers-reduced-motion: reduce`.

`Couple.monthlyBudget` (cents, optional) is still edited from *within* the finance card (`updateBudget()` in `useCouple.ts`). Its input is `type="text"` + `inputmode="decimal"` **on purpose**: a `type="number"` field silently discards "800,00" and hands back an empty string, which used to be saved as "no budget" while toasting success.

### Planung tab

`PlanungView.vue` (`.area-planung`) collects the things that are neither chores, money nor food: the **Belegung** block (week strip + "Kalender ›"), **Ideen** (the reactivated Bucket-List — `useBucketList.ts`, collection `bucketListItems`, categories via `src/utils/ideen.ts`; legacy `ort`/`restaurant` documents are *mapped on read*, not migrated), **Reisen** and **Notizen** (`usePlanung.ts`, collections `trips` and `notes` — one composable for both, like `useBelegung` with resources + bookings).

### Chores domain specifics

- A chore is `recurring` or `once` — there is no interval (täglich/wöchentlich/monatlich) or fixed due date field on `Chore`; recurring just means it resets rather than being permanently completed. Completing a recurring chore just stamps `completedAt`/`completedBy` for "today" — it is never deleted. Completing a `once` chore sets `done: true` and permanently removes it from the active pool (it still appears in `choreHistory`).
- `assignee` is `uid | 'both' | null` (`null` = unassigned/"offen").
- Completing/undoing a chore writes/removes a matching `choreHistory` entry; `undoChore` restores the previous history entry's completion state rather than just clearing it.
- `room: ChoreRoom` (see `src/utils/rooms.ts`) is used for pool filtering; older documents without a `room` field are treated as `allgemein` via `roomOf()`.
- The Haushalt view's "Zuweisungen" tab (default landing tab, `HaushaltZuweisungen.vue`/`AssignmentRow.vue`) lists every assigned (non-`null`-assignee) chore with a "last completed" column derived from `choreHistory`; it flags "Vertretung" when the most recent completion was by someone other than the chore's assignee. It defaults to filtering by the current user (tap their summary card again to clear the filter, tap the partner's card to switch); rows expand in place on tap to reveal the same complete/undo controls as the "Alle" tab.

### Finance domain specifics

**The one rule everything else follows: `isPaid` is about the settlement *between the partners*, not about whether money was spent.** A settled expense is still spent money. Mixing the two axes is the bug this domain keeps producing, so keep them apart:

| Axis | Question | Source |
| --- | --- | --- |
| ausgegeben | what did the month/event cost? | **all** expenses, `isPaid` irrelevant |
| ausgeglichen | who still owes whom? | **only** `!isPaid` expenses |

Consequences that are easy to get wrong:
- `MonthlyExpenseSummary` carries both: `total` (all expenses of the month → the Dashboard ring), `paidBy` (per uid, all expenses → the Paar-Split), `open` (unpaid only) and `balances` (unpaid only). The Dashboard's Paar-Split must come from `paidBy`, **not** from `balanceInfo.totals` — that one is unpaid-only *and* across all months.
- The settle-up balance (`balanceInfo`) deliberately spans **all** open expenses, including older months. Scoping it to the current month would make last month's unsettled debt disappear.
- The expense list in `FinanzenView` shows settled expenses too (muted, "✓ ausgeglichen" badge). Settling must not make entries vanish — it only marks them.
- `FinanceEventSummary.spent` (all expenses) vs `.total` (open only): the optional **event budget** (`FinanceEvent.budget`, cents, nullable) is measured against `spent`, otherwise the bar would drop back to zero after "Abschließen & Ausgleichen".

Everything else:
- Amounts are stored as integer cents (`Expense.amount`).
- An expense optionally belongs to a `FinanceEvent` (`kind: 'event' | 'monthly'`); expenses with no event are grouped by `monthKey` (`YYYY-MM`). Archived events (and their expenses) are excluded from active balance calculations (`isExpenseActive`).
- Balances are derived, not stored: `buildBalanceSummary()` in `useExpenses.ts` computes per-user `totals` (paid) vs `owedTotals` (from each expense's `owedBy` split) to get net `balances`.
- Settling up (`markAllPaid`) sets `isPaid: true` on a batch of expenses rather than deleting them.
- Budgets exist at exactly two levels: `Couple.monthlyBudget` (the Dashboard ring) and the optional `FinanceEvent.budget` (a bar in `EventDetail.vue`). There are deliberately **no** per-category budgets.

### Belegung domain specifics (geteilte Ressourcen)

Sources: `reference/design_handoff_belegung/` (data model) and `reference/design_handoff_dashboard_b_v2/` (the current surfaces). There is **no request/confirm flow** — a booking is simply entered; the handoff's `pending`/`declined` statuses and `requestedBy` do not exist on `Booking`. Conflicts are shown, never blocked.

**The structural rule: a series is ONE document (a rule), and every surface resolves it into concrete dates inside a bounded window** — never roll a series out across an open horizon. The earlier `BelegungCard.vue` (a flat 84-day timeline) was deleted for exactly that reason. The windows are:
- **Dashboard** (`BelegungShelfCard.vue`) — the current week, plus today's next booking.
- **Wochenkalender** (`/belegung`, `WochenkalenderView.vue`) — exactly one week (7 days), navigable with `‹ KW n ›`. Because a week grid can never show a series that falls outside it, the screen additionally lists every weekly series **once** with its computed next date (`nextLabel()`), so "when does this recur next" is never lost.

`WochenkalenderView` composes the three reusable pieces: `BookingRow.vue` (day detail), `NewBookingSheet.vue` (FAB → conflict warning inline → "Trotzdem eintragen") and `BookingDetailSheet.vue` (who entered it and when, via `createdBy` + `bookedAtLabel()`; deletes the whole series).

Resources (`name` + emoji from `RESOURCE_ICONS`, 7-column `IconGridPicker`) are managed in **`SettingsView.vue`** ("Belegung" section, mirroring the expense-categories section): tap a row to edit it, "✕" deletes it after a confirm that names how many bookings go with it (deleting a resource batch-deletes its bookings). With no resources, creating a booking is refused with a toast pointing at the settings.

- Two Firestore collections, both `coupleId`-scoped like everything else: `resources` (`{ name, emoji }`) and `bookings`. `useBelegung.ts` loads **both collections whole** and derives the shown days client-side — a weekly series shows up in every later week, so a date-range query can't express it.
- A `Booking` is stored per *series*, not per occurrence: `date` (`YYYY-MM-DD`) is the single day for `repeat: 'none'` and the **first** day for `repeat: 'weekly'`; `weekday` (0 = Monday) is derived from `date` at write time. `occursOn()` in `src/utils/belegung.ts` maps a booking onto a concrete day (weekly = same weekday and `date <= key`; the string compare works because both are `YYYY-MM-DD`). There is no series end date, and confirming/deleting always acts on the whole series.
- `owner` (whom the booking is for — can be the partner) and `createdBy` (who entered it) are separate; the detail sheet shows both.
- A conflict is two bookings of the *same resource on the same day* with overlapping times (`allDay` overlaps everything); `conflictsFor()` also runs on the not-yet-saved draft in `NewBookingSheet.vue`, which is what turns the CTA into "Trotzdem eintragen". Conflicts never block saving.
- `src/utils/belegung.ts` holds the whole resolution layer as pure functions: `occursOn` (does this rule fall on that day), `bookingsOnDay`, `expandWeek` (7 days → bookings per day), `nextOccurrence` / `nextLabel` (the next concrete date of a rule), `conflictsFor`, plus the week/ISO-KW helpers. `nextOccurrence` searches from `max(from, series start)` — our weekly series carry a start `date`, unlike the prototype's, so a series starting next week must not appear retroactively in this one.

### Branding ("Together")

The brand (source: `reference/design_handoff_together_branding/`) is the "Overlap" mark: two circles (`cx=46`/`cx=74`, `cy=45`, `r=33` in a `0 0 120 90` viewBox) in the two person colors — terracotta `--haushalt`/`--chris` and turquoise `--finanzen`/`--sarah`. `mix-blend-mode: multiply` sits on **each circle** (inside an `isolation: isolate` group), not on the group as the handoff's HTML prototype has it — only that way does the intersection darken into the "shared space" the design intends.

`src/components/brand/TogetherLogo.vue` is the reusable mark (props `height`, `variant: mark|horizontal|vertical`, `word`, `tagline`, `colorA`/`colorB`, `wordColor`, `blendMode`); all sizes derive from `height`. It's used in `LoginView.vue` and `CoupleSetupView.vue`.

The splash screen lives in `index.html` (inline markup + `<style>`, values written out literally rather than as tokens), **not** in a Vue component: `main.ts` only mounts the app after `authReady`, so the wait it covers happens before the first Vue render. `hideSplash()` in `main.ts` holds it for at least 2 s (so the build-up animation reaches the claim), then fades and removes it; if auth takes longer, the mark keeps breathing and the dots keep blinking. `App.vue` therefore has no loading state of its own.

The app icons are rendered from an HTML source with headless Chrome (the usual SVG rasterizers don't do `oklch` + `mix-blend-mode`) and come in two flavors, kept apart on purpose: `public/pwa-{192,512}.png` are the `purpose: "any"` icons (rounded tile, transparent corners — they get shown unmasked on desktop and in task switchers), `public/maskable-{192,512}.png` are `purpose: "maskable"` (full-bleed opaque square, the OS applies its own mask; the mark sits inside the 80 % safe zone). `apple-touch-icon.png` must stay full-bleed and opaque — iOS masks it itself and turns transparency black. `public/favicon.svg` spells the mark out with plain hex fills plus an explicit lens shape for the intersection, because blend modes aren't reliable in the favicon context.

Android's install splash is generated by Chrome from the 512 icon + `background_color` + name, which lines up with the HTML splash that follows. iOS has no startup image (`apple-touch-startup-image`) — it shows a blank near-white screen for a moment before the HTML splash takes over.

### Design tokens & styling

Tailwind v4 is loaded via `@import "tailwindcss"` in `src/app.css`, but most visual styling is done with CSS custom properties defined there (`--bg`, `--accent`, `--chris`/`--sarah` person colors, radii, motion/easing durations) and scoped `<style>` blocks per component, not Tailwind utility classes. When touching styles, check `src/app.css` for the existing token before inventing a new color/spacing value.

**Never name a scoped class after a bare Tailwind utility.** This bites silently and is hard to spot. Tailwind scans the templates for class names and *generates* any utility it finds, so `class="ring"` pulls in Tailwind's focus-ring utility — `box-shadow: … var(--tw-ring-color, currentcolor)`, i.e. a black frame around the element. A scoped `.ring { … }` block does **not** override it unless it happens to declare the same property, and a component that never sets `box-shadow` has nothing to override with. This cost real debugging time on the Dashboard's budget ring (now `.budget-ring`) and the Ideen filter chips (now `.cat-filter`). Off-limits as class names: `ring`, `filter`, `shadow`, `border`, `blur`, `table`, `grid`, `flex`, `block`, `container`, `truncate`, `transform`, `transition`, `invert`, `grayscale`, `isolate`, `contents`, `sticky`, `fixed`, `absolute`, `relative`, `static`, `hidden`, `underline`, `uppercase`, `italic`. When in doubt, prefix the class with its component (`.budget-ring`, `.cat-filter`) and check the built CSS: `grep -oE '\.ring\{[^}]*\}' dist/assets/index-*.css` must come back empty.

Area colors: one accent per tab (`--dashboard`, `--haushalt`, `--planung`, `--finanzen`, `--food`), each with `-hover` and `-tint`, switched by an `.area-*` class on the view root, which remaps `--accent`/`--accent-hover`/`--accent-tint`. "Essen" runs on `.area-food`; the older `--einkauf` (amber) tokens survive only as the colour of the *expense category* "Einkauf" (`src/utils/expenseCategories.ts`). **Bottom sheets teleport to `<body>`** and therefore land outside the view's `.area-*` class — a sheet that wants its area's accent must carry the class itself (see `NewBookingSheet.vue`, `AddIdeaSheet.vue`, `QuickAddSheet.vue`, all `.area-planung`), otherwise `--accent` falls back to the default terracotta.

Note: `README (3).md` and the `.dc (*).html` files in the repo root are **design handoff references** (originally HTML prototypes, in German) describing an earlier dark-theme visual direction and interaction spec. The actual implemented theme in `src/app.css` (light, warm, Mali/Lobster fonts) has since diverged from that doc — treat the doc as historical/behavioral reference for interactions and data model intent, not as the current source of truth for colors/fonts.

### Firebase config

Firebase project config is inlined directly in `src/services/firebase.ts` (also duplicated in `firebase_config.md` as a plain reference note — update both if the project config ever changes). `db` is initialized with `persistentLocalCache`; the tab manager is picked by platform (single-tab natively, multi-tab on the web — a WebView has exactly one tab, and the cross-tab lock only costs there). `useAuth.ts` explicitly handles the case where a Firestore read/write fails with an "offline" error and falls back to a locally-constructed user object instead of surfacing an error.

**App Check** guards the callables (`enforceAppCheck: true`): reCAPTCHA Enterprise on the web (`VITE_APPCHECK_SITE_KEY`), Play Integrity natively. It is deliberately *not* enforced on Firestore — turn that on only after a release cycle in monitor mode, or every stale client breaks at once. In dev, `main.ts`'s `import.meta.env.DEV` branch sets `FIREBASE_APPCHECK_DEBUG_TOKEN`, which logs a token to the browser console that has to be registered once in the Firebase Console.

### Cloud Functions (`functions/`) — the only trusted writer

TypeScript, Node 22, all in `europe-west1`. Four entry points (`functions/src/index.ts`):

- `suggestRecipes` / `suggestFinanceInsight` — callables that proxy Gemini. The prompts and `responseSchema`s live in `functions/src/lib/gemini.ts`; the API key is a Secret Manager secret, never in the bundle.
- `syncEntitlement` — callable; reads the couple's subscriber record straight from the RevenueCat API and writes the result onto the couple doc. This is the escape hatch for webhook latency (called right after a purchase and on app resume) — without it the user would briefly face the paywall they just paid for.
- `revenueCatWebhook` — HTTP; the durable path. Secret-header auth, idempotent via `webhookEvents/{event.id}`.

Two things bite here and are easy to miss:
- **CORS**: the Android WebView's origin is `https://localhost`, which is *not* in the callables' default allowlist. It (and `capacitor://localhost`) must stay in `CORS_ORIGINS` (`functions/src/lib/config.ts`) or every call from the app fails at the preflight.
- **Quotas** (`functions/src/lib/rateLimit.ts`) are counted per *couple* in `usage/{coupleId}`, incremented inside a transaction *before* the Gemini call (a failed call still costs a unit — the right trade when real money is on the other end). `functions/src/lib/limits.ts` and `src/utils/premium.ts` hold the same numbers and must stay in sync; only the server one is enforced.

### Premium ("Together Plus")

**The subscription belongs to the couple, not the person.** `plan`/`premiumUntil`/`premiumStore`/`rcAppUserId` live on the `couples/{coupleId}` doc, and the RevenueCat App User ID is `couple_<coupleId>` — so whichever partner buys, both are premium instantly through the existing `onSnapshot`, and either can restore on a new device. `firestore.rules` makes those fields immutable from any client (`entitlementUntouched()`); the Admin SDK bypasses rules, so the webhook is the only writer.

`useCouple().isPremium` is the single source of truth in the UI. It ORs in an `optimisticPremium` ref that `usePremium().purchase()` flips right after a successful purchase, so the unlock feels instant; the next Firestore snapshot clears it and takes over.

Gating follows one pattern: **the composable enforces** (returns `false`/`null`, never throws — the house convention) and **the view opens the paywall** via `showPaywall(feature)` (`src/composables/usePaywall.ts`, a `useToast`-style singleton; `PaywallSheet.vue` is mounted once in `TabsView.vue`). Every gate has a `canX` computed the view checks *before* acting, so the user never hits a silent no-op. Free limits live in `src/utils/premium.ts`.

Two gates deserve their own note:
- `assignRecipe()` silently creates a `Recipe` doc as a side effect, so it falls under the recipe limit too — `EssensplanView` wraps it in `assignWithPaywall()` rather than passing it to the sheets directly.
- The chore-history window is filtered **in `HaushaltVerlauf.vue` only**, never in the `choreHistory` listener: `HaushaltView` computes the points leaderboard from that same full history, and a windowed query would corrupt the score.

Purchases only work natively (`usePremium().canPurchase`); on the web the paywall says so. `isPremium` still works there, because it is just a Firestore read.

### Capacitor / Android

`capacitor.config.ts`: `androidScheme: 'https'` (→ origin `https://localhost`, a secure context — Firebase Auth and IndexedDB persistence need that), edge-to-edge, and **`CapacitorHttp.enabled: false`** — enabling it would patch `fetch()` and break the Firestore SDK's streaming.

- **No service worker natively** (`VitePWA({ disable: mode === 'native' })`). Assets are already local in the WebView, and `autoUpdate` would pin stale JS in the SW cache after an app update with no way to bust it. `main.ts` registers the SW manually on web only.
- **Splash**: native splash (`#fdfaf5`) → the inline HTML splash in `index.html` (same background, seamless) → hidden in a double `requestAnimationFrame` after first paint. `SPLASH_MIN_MS` drops to 800 ms natively; keeping 2 s *on top of* the native splash made the launch feel broken.
- **Back button**: `src/composables/useBackButton.ts` keeps a handler stack. `BottomSheet.vue` registers itself once — that single line gives *every* sheet in the app back-to-dismiss. In-page sub-views without their own route (`FinanzenView`'s event detail, `EinkaufenView`'s list detail / shopping mode) register explicitly. On `/dashboard`, back twice within 2 s exits.
- **Safe areas**: use `env(safe-area-inset-*)` as usual. `@capacitor-community/safe-area` (configured in `capacitor.config.ts`, no runtime call) is what makes `env()` correct inside the Android WebView; without it Android reports 0 in edge-to-edge mode and the bubble nav sits under the gesture bar.
- **Fonts are self-hosted** (`public/fonts/*.woff2`, `@font-face` inline in `index.html`'s `<head>`). They must be declared there and not in `app.css`, which only arrives with the JS bundle — the splash screen itself uses Fredoka/Nunito. Both are *variable* fonts: one file per family covers every weight (Google's CSS serves the same file per weight, which would have shipped 8 identical copies).
- `InviteCodeBox.vue` uses `@capacitor/share` + `@capacitor/clipboard` (both have web fallbacks, so it stays one code path) — `navigator.share` doesn't exist in the Android WebView and `navigator.clipboard` is flaky there.

Play Store: `targetSdk 36` (mandatory for new apps from 2026-08-31), `applicationId de.keyperformance.together`. The upload keystore is gitignored and must be backed up outside the repo — lose it and the app can never be updated again.

### Essensplan & Rezepte

`src/services/ai.ts` is the client's only door to the AI (it replaced the former `gemini.ts` + `geminiFinance.ts`, which called Gemini directly with a bundled key). It wraps the callables and returns an `AiResult<T>` discriminated union: a quota or premium rejection is **not** an exception — it comes back as `{ kind: 'quota' }` / `{ kind: 'premium' }` so callers open the paywall instead of showing an error toast. Everything else still throws.

`useMealPlan.ts` follows the standard composable shape (`recipes`/`mealPlans` Firestore collections, realtime listeners per `coupleId`) and derives `week` — the current Monday–Sunday (`src/utils/mealplan.ts`) — by joining each day's `MealPlanEntry` (one per `dateKey`, `YYYY-MM-DD`) to its `Recipe`. `Recipe` always has `ingredients` + `steps`; `nutrition` is optional/nullable and its section in `RecipeDetailModal.vue` only renders when present — Gemini is asked to estimate it but told to omit it if unsure, and manually-created recipes (via the Rezept-Wiki form) never have it. `EinkaufenView.vue` **is** the "Essen" tab (`.area-food`) and hosts three segments — **Wochenplan (the landing segment) · Einkaufsliste · Rezepte**. `EssensplanView.vue` is that first segment, not a separate route; it hosts the weekly list plus `RecipeSuggestSheet.vue`, which calls `suggestRecipes()` and, on picking a suggestion (or a manual fallback title with no AI call), always creates a **new** `Recipe` doc via `assignRecipe()` — recipes aren't deduped/reused across weeks yet. "Einkaufsliste aus Plan erstellen" aggregates all of the week's recipe ingredients client-side (merging same name+unit) and pushes them through `useShopping().addItem()` into whatever list is currently `activeListId` — `EssensplanView` instantiates its own `useShopping()` call rather than receiving one as a prop, consistent with the "new composable instance per call site" pattern used elsewhere.

Clicking a filled day in `EssensplanView.vue`, or any card in `RezeptWikiView.vue` (also reached from `EinkaufenView.vue`'s header), opens the same shared `RecipeDetailModal.vue` — ingredient checkboxes there are local-only UI state (reset every time the modal opens), not persisted to Firestore. `RezeptWikiView.vue` is a separate recipe *library*: it uses `useMealPlan().recipes`/`createRecipe()` (create-only, no edit/delete yet) and is unrelated to any specific week; its 8 fixed categories (`src/utils/recipeTags.ts` — `RECIPE_TAGS`, exact ids/colors/emojis from the design reference) double as both filter badges (multi-select, OR'd together) and the tag picker in its "new recipe" form.

All composite indexes (`mealPlans`, `resources`, `bookings`, `bucketListItems`, `trips`, `notes`, …) are in `firestore.indexes.json` **and deployed**. Adding a new `where(coupleId) + orderBy(...)` query means adding an index there and running `firebase deploy --only firestore` — until that lands, the query fails with "index is building"/"requires an index".
