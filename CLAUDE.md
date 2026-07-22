# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"TwoDo" (user-facing brand + PWA manifest name — a pun on "to do" + "two"; the repo/internal name is still "Couple Organizer"/"Paarplaner") — a mobile-first PWA for couples to manage shared finances, household chores, shopping lists, and weekly meal planning (with Gemini-assisted recipe suggestions). Vue 3 + TypeScript + Vite on Firebase (Auth + Firestore), plus a thin Cloud Functions layer (`functions/`) that exists for exactly two reasons: it holds the Gemini API key server-side, and it is the only writer of the premium entitlement.

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

Every piece of app data hangs off a `coupleId`. A `couples/{coupleId}` doc holds exactly the two partners (`memberIds`, `memberNames`, `inviteCode` used to join). All other top-level Firestore collections (`chores`, `choreHistory`, `shoppingItems`, `shoppingLists`, `expenses`, `financeEvents`, `recipes`, `mealPlans`, `resources`, `bookings`, `bucketListItems`, `trips`, `notes`, `coachReports`) carry a `coupleId` field and are secured in `firestore.rules` via an `isCoupleMember(coupleId)` check — a document is only ever readable/writable by the two members of that couple. `src/types/index.ts` is the source of truth for all of these document shapes.

**The one deliberate exception: `checkinEntries` is author-only** (`allow read, delete: if isSelf(authorId)`, no update) — a check-in entry belongs to the person, not the couple, and the partner can never read it. Its couple-visible counterpart `checkinDigests/{coupleId}_{uid}` holds only enums/counters (never free text), is writable only by its author (the doc id is part of the rules contract), and exists solely so a client-built coach snapshot can include both partners' topics anonymously. See "Check-in" below before touching either.

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

`src/router/index.ts` has a single `beforeEach` guard that awaits `authReady` and redirects based on two route meta flags: `requiresAuth` (must be signed in) and `requiresCouple` (must have a `coupleId`, otherwise sent to `/couple-setup`). The five main tabs — **`/dashboard` (Start, default landing) · `/haushalt` · `/planung` (labelled "Wir") · `/finanzen` · `/einkaufen` (labelled "Küche")** — are children of `TabsView.vue`, which renders the bottom tab bar and hosts cross-tab UI (`Toast`, the invite-partner `BottomSheet`, `PaywallSheet`). The "Wir" tab deliberately keeps `id: 'planung'` and `/planung` (no route churn; `SLOT_ALIASES` untouched); only label + nav icon (the brand's Overlap mark in `NavIcon.vue`) changed.

Two routes are children of `TabsView` but have **no nav slot of their own**:
- `/belegung` (`KalenderView.vue`) — the Belegung month calendar, opened from the Dashboard card and from the Wir tab's "Planung" segment. `SLOT_ALIASES` in `TabsView.vue` maps it onto the "Planung" slot, so the bubble stays there instead of falling back to "Start".
- `/settings` — reached only through `components/ui/ProfileButton.vue`, the couple's overlapping avatar stack sitting top-right in every tab's `.page-header`. It has no area, so the bubble stays on "Start".
- `/settings/kategorien/:type` (`KategorienView.vue`) — one editable list per `type` (`ausgaben` · `rezepte` · `ideen` · `belegung`), reached from the "Kategorien" section in `SettingsView.vue`. Also no nav slot.

### Bottom navigation (bubble + collar + droplets)

`TabsView.vue`'s nav bar is not a plain tab strip: a floating circular "bubble" (colored per active area — indigo `--dashboard`, terracotta `--haushalt`, blau `--planung`, türkis `--finanzen`, rot-orange `--food`) sits centered on the nav bar's *top edge* (both the bubble and the white "collar" halo behind it use `left: X%; transform: translate(-50%, -50%)`, so they're always exactly half above/half overlapping the bar regardless of screen width — `X` comes from `slotCenterPercent(index)`, purely index-based math, no DOM measurement). Switching tabs: `left` transitions with the existing `--ease-overshoot` bounce curve, a `bubbleJump1`/`bubbleJump2` class alternates every switch to force the CSS arrival-hop keyframe animation to restart (same name reapplied wouldn't replay), and 5 small droplets in the *previous* area's color are spawned along an arc between the old/new slot and removed via `setTimeout` once their `dropletFall` animation finishes. All of this is index/percentage-based by design — do not reintroduce fixed pixel positions here, the original design reference (`reference/Nido-source-code.dc.html`) used a fixed-width canvas that doesn't apply to a responsive layout.

### Dashboard ("Start")

Since the Wir-Umbau (2026-07) the Dashboard is deliberately **short — today's logistics only**; everything relationship-flavoured lives on the Wir tab. Card order in `DashboardView.vue`: `MealHero` → compact `CheckinCard` (one tap → `CheckinSheet`; full card is on the Wir tab) → `OpenChoresCard` (open pool chores to claim — only shown to whoever currently carries less) → `QuickTasksCard` → `BelegungTodayCard` → `FinanceCard`. It instantiates `useChores`, `useFavoriteChores`, `useMealPlan`, `useExpenses`, `useBelegung`, `useCheckin` — deliberately **not** `useBucketList`/`usePlanung`/`useShopping` any more; those listeners moved to the Wir tab with the cards that needed them.

- `MealHero.vue` — today's meal from `useMealPlan().week` (matched by `dateKey(new Date())`), with the "Wer kocht?" pills writing `MealPlanEntry.cookAssignee` via `setCookAssignee()`.
- `FinanceCard.vue` — budget + month spend + Paar-Split. The open balance ("X schuldet Y") and the settle-up button deliberately **do not** live here — both are the Finanzen tab's job. See "Finance domain specifics" for *which* numbers go where; getting that wrong is the easiest mistake in this card.
- `DashboardOnboarding.vue` — shown only when there is genuinely nothing (no meal, chores, bookings, resources *or* expenses — ideas/trips deliberately don't count since their listeners left the page). A missing budget alone does **not** make the dashboard empty.
- The Dashboard answers `?coach=budget` by opening its budget sheet (coach action `setBudget` from the Wir tab — same watch-then-strip-query pattern as `?coach=fair`).

Mount animations (ring fill, count-up, growing bars/dots) come from `src/composables/useMountAnim.ts` (`useMountFlag` + `useCountUp`); both short-circuit to the end state under `prefers-reduced-motion: reduce`.

`Couple.monthlyBudget` (cents, optional) is still edited from *within* the finance card (`updateBudget()` in `useCouple.ts`). Its input is `type="text"` + `inputmode="decimal"` **on purpose**: a `type="number"` field silently discards "800,00" and hands back an empty string, which used to be saved as "no budget" while toasting success.

### Wir tab (formerly "Planung")

`PlanungView.vue` (`.area-planung`, route unchanged `/planung`) has two segments since the Wir-Umbau:
- **"Wir" (landing)** — the relationship surfaces in one place: `CoachCard` (Wochen-Check-in, generation via `useCoachRun`), `CheckinCard` (full form, private entries), `MentalLoadCard` ("Wer denkt mit?" — appreciation first, scale second), `IdeenBlock` (the Bucket-List as shared quality time — `useBucketList.ts`, collection `bucketListItems`, categories via `src/utils/ideen.ts`; legacy `ort`/`restaurant` documents are *mapped on read*, not migrated) and `TogetherStatsCard` (cumulative couple stats, the one number with no per-person split).
- **"Planung"** — the logistics: `BelegungKalender`, **Reisen** and **Notizen** (`usePlanung.ts`, collections `trips` and `notes` — one composable for both).

`usePersistedRef('planung.tab')` migrates old stored values (`kalender` → `planung`, everything else → `wir`); the `?tab=kalender`/`?tab=listen` deeplinks are still understood. `useCoachRun.ts` is the extracted generation side of the weekly report: it instantiates its own domain composables (house pattern) and also exposes `mentalLoad` + `togetherStats`, computed from those same listeners. Coach actions from here: `planIdea` opens the idea sheet directly, `setBudget` routes to `/dashboard?coach=budget`.

### Check-in ("Wie geht's dir gerade?")

Each partner can privately tell the app what is weighing on them: `area` (haushalt · finanzen · zeit · anerkennung), `level` 1–3, optional free text (max 500). **Privacy is rules-enforced, not UI-enforced** (see the data-model section): the partner can never read an entry, and the couple-visible digest carries only enums. Tests: `npm run test:rules` (`tests/rules/checkin.test.mjs`, runs in the Firestore emulator — the repo's first and only test suite; a rules mistake here is a privacy breach, not a bug).

- Writing is free (no paywall) — the quota only bites when the weekly report is generated (`coachAi` bucket; "schreiben ist frei, die wöchentliche Einordnung ist Plus").
- First entry requires an explicit consent step in `CheckinSheet.vue` (Art.-9-GDPR-adjacent data; `Couple.checkinOptIn[uid] = { at, version }` via `setCheckinConsent()` — bump `CHECKIN_CONSENT_VERSION` in `useCouple.ts` if the scope of processing ever changes). The sheet carries a static crisis footer (Telefonseelsorge) — the AI deliberately never reacts to crises (`CHECKIN_RULES` rule 5).
- Retention 56 days (`expiresAt`; a Firestore **TTL policy on `expiresAt` must be created in the console** — until then only the client filters). No archive. Settings has export (JSON) / delete-all / opt-out, all deliberately **not** premium-gated (GDPR); `deleteAccount()` removes own entries + digest.
- The coach snapshot gets a `checkin` block only via `mergeDigestsToTopics()` (both partners mixed, no names, no per-person counts — anti-attribution starts in the snapshot, not the prompt). **Free text must never reach Gemini while the free tier is live** (Google trains on free-tier data); it only joins server-side via the `coachInsight` function once Blaze + paid tier are confirmed (roadmap "Phase 2b" — not built yet; when it is, gate it behind a default-off `CHECKIN_FREETEXT_ENABLED` flag in `functions/src/lib/config.ts`).

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
- `monthlyExpenses` (active expenses whose event is absent or of `kind: 'monthly'`) is what the shared balance is built from; `activeExpenses` (which includes event expenses) is only for "zuletzt bezahlt".
- The "gemeinsamer Saldo" (`balanceInfo`) covers **only the monthly expenses** — every open one, including older months (scoping it to the current month would make last month's unsettled debt disappear), but **never an event's**. Events are settled inside the event ("Abschließen & Ausgleichen" in `EventDetail.vue`, which marks them paid *and* archives the event); the two settlements must not touch each other, so `FinanzenView`'s "Begleichen" batches `openMonthlyExpenseIds` and not every unpaid expense.
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
- **Kalender** (`/belegung`, `KalenderView.vue`) — one month grid (`monthGrid()`: full Mon–Sun weeks covering the month, so 28/35/42 cells), navigable with `‹ Monat ›`. Every day cell is a button; the selected day's bookings open in the card **directly below** the grid (`selectedKey`, a `YYYY-MM-DD` string — not an index, because the grid spills into the neighbouring months and picking such a day scrolls the grid to *its* month). Because a month grid can never show a series that falls outside it, the screen additionally lists every weekly series **once** with its computed next date (`nextLabel()`), so "when does this recur next" is never lost.

`KalenderView` composes the three reusable pieces: `BookingRow.vue` (day detail), `NewBookingSheet.vue` (FAB → conflict warning inline → "Trotzdem eintragen") and `BookingDetailSheet.vue` (who entered it and when, via `createdBy` + `bookedAtLabel()`; deletes the whole series).

Resources (`name` + emoji from `RESOURCE_ICONS`, 7-column `IconGridPicker`) are managed on **`/settings/kategorien/belegung`** (see "Settings & Kategorien"): deleting a resource batch-deletes its bookings, which is why its confirm names the count. With no resources, creating a booking is refused with a toast pointing at the settings.

- Two Firestore collections, both `coupleId`-scoped like everything else: `resources` (`{ name, emoji }`) and `bookings`. `useBelegung.ts` loads **both collections whole** and derives the shown days client-side — a weekly series shows up in every later week, so a date-range query can't express it.
- A `Booking` is stored per *series*, not per occurrence: `date` (`YYYY-MM-DD`) is the single day for `repeat: 'none'` and the **first** day for `repeat: 'weekly'`; `weekday` (0 = Monday) is derived from `date` at write time. `occursOn()` in `src/utils/belegung.ts` maps a booking onto a concrete day (weekly = same weekday and `date <= key`; the string compare works because both are `YYYY-MM-DD`). There is no series end date, and confirming/deleting always acts on the whole series.
- `owner` (whom the booking is for — can be the partner) and `createdBy` (who entered it) are separate; the detail sheet shows both.
- A conflict is two bookings of the *same resource on the same day* with overlapping times (`allDay` overlaps everything); `conflictsFor()` also runs on the not-yet-saved draft in `NewBookingSheet.vue`, which is what turns the CTA into "Trotzdem eintragen". Conflicts never block saving.
- `src/utils/belegung.ts` holds the whole resolution layer as pure functions: `occursOn` (does this rule fall on that day), `bookingsOnDay`, `expandWeek` (7 days → bookings per day), `nextOccurrence` / `nextLabel` (the next concrete date of a rule), `conflictsFor`, plus the week/ISO-KW helpers. `nextOccurrence` searches from `max(from, series start)` — our weekly series carry a start `date`, unlike the prototype's, so a series starting next week must not appear retroactively in this one.

### Settings & Kategorien

`SettingsView.vue` deliberately holds no editable lists any more — it kept growing into one endless scroll. The four lists the couple can edit (**Ausgaben-Kategorien · Rezept-Kategorien · Ideen-Kategorien · geteilte Ressourcen**) each live on their own subpage, `/settings/kategorien/:type`, and Settings only carries a "Kategorien" section with four rows pointing at them. What stays in Settings is the stuff with nowhere else to go: Profil/Avatar, Abo, Export, Einladung, Benachrichtigungen, the `monthlyBudget` field, Sprache, Konto, Gefahrenzone.

`KategorienView.vue` is **one** view for all four, because they differ only in data source, icon set and wording — the mechanics (tap a row to edit, "✕" deletes after a confirm that names how many things hang off it, form below the list) are identical. A `META` record holds the per-type copy; `entries`/`save()`/`confirmDelete()` switch on the route param. Two things to keep in mind when touching it:
- Each type's composable is instantiated with `idFor(kind)` — a `computed` that hands over the `coupleId` **only** when that type is the one being shown, `null` otherwise. Since every composable's `watch(coupleId)` treats `null` as "tear down / don't listen", opening one list doesn't spin up the listeners of the other three.
- Ausgaben and Ideen refuse to delete their **last** category (an expense/idea needs one), Rezepte and Ressourcen don't — hence the two different failure toasts.

The three category lists on the couple doc follow the same shape (`add*`/`update*`/`remove*` in `useCouple.ts`, `resolve*(couple)` in the matching `src/utils/*.ts`, absent field = the DEFAULT set). Adding a fourth kind means: type in `src/types/index.ts`, defaults + resolver in a util, CRUD in `useCouple.ts`, one entry in `META` — nothing in Settings itself.

### Branding ("TwoDo")

The brand (source: `reference/design_handoff_together_branding/` — the folder name predates the rename) is the "Overlap" mark: two circles (`cx=46`/`cx=74`, `cy=45`, `r=33` in a `0 0 120 90` viewBox) in the two person colors — terracotta `--haushalt`/`--chris` and turquoise `--finanzen`/`--sarah`. `mix-blend-mode: multiply` sits on **each circle** (inside an `isolation: isolate` group), not on the group as the handoff's HTML prototype has it — only that way does the intersection darken into the "shared space" the design intends. The wordmark is "TwoDo" split by colour — first syllable "Two" in `colorA`, "Do" in `colorB` (`splitAt`, default 3); the symbol itself is unchanged from the former "Together" mark.

`src/components/brand/TwoDoLogo.vue` is the reusable mark (props `height`, `variant: mark|horizontal|vertical`, `word`, `tagline`, `colorA`/`colorB`, `blendMode`, `splitAt`); all sizes derive from `height`. It's used in `LoginView.vue` and `CoupleSetupView.vue`.

The splash screen lives in `index.html` (inline markup + `<style>`, values written out literally rather than as tokens), **not** in a Vue component: `main.ts` only mounts the app after `authReady`, so the wait it covers happens before the first Vue render. `hideSplash()` in `main.ts` holds it for at least 2 s (so the build-up animation reaches the claim), then fades and removes it; if auth takes longer, the mark keeps breathing and the dots keep blinking. `App.vue` therefore has no loading state of its own.

The app icons are rendered from an HTML source with headless Chrome (the usual SVG rasterizers don't do `oklch` + `mix-blend-mode`) and come in two flavors, kept apart on purpose: `public/pwa-{192,512}.png` are the `purpose: "any"` icons (rounded tile, transparent corners — they get shown unmasked on desktop and in task switchers), `public/maskable-{192,512}.png` are `purpose: "maskable"` (full-bleed opaque square, the OS applies its own mask; the mark sits inside the 80 % safe zone). `apple-touch-icon.png` must stay full-bleed and opaque — iOS masks it itself and turns transparency black. `public/favicon.svg` spells the mark out with plain hex fills plus an explicit lens shape for the intersection, because blend modes aren't reliable in the favicon context.

Android's install splash is generated by Chrome from the 512 icon + `background_color` + name, which lines up with the HTML splash that follows. iOS has no startup image (`apple-touch-startup-image`) — it shows a blank near-white screen for a moment before the HTML splash takes over.

### Design tokens & styling

Tailwind v4 is loaded via `@import "tailwindcss"` in `src/app.css`, but most visual styling is done with CSS custom properties defined there (`--bg`, `--accent`, `--chris`/`--sarah` person colors, radii, motion/easing durations) and scoped `<style>` blocks per component, not Tailwind utility classes. When touching styles, check `src/app.css` for the existing token before inventing a new color/spacing value.

**Never name a scoped class after a bare Tailwind utility.** This bites silently and is hard to spot. Tailwind scans the templates for class names and *generates* any utility it finds, so `class="ring"` pulls in Tailwind's focus-ring utility — `box-shadow: … var(--tw-ring-color, currentcolor)`, i.e. a black frame around the element. A scoped `.ring { … }` block does **not** override it unless it happens to declare the same property, and a component that never sets `box-shadow` has nothing to override with. This cost real debugging time on the Dashboard's budget ring (now `.budget-ring`) and the Ideen filter chips (now `.cat-filter`). Off-limits as class names: `ring`, `filter`, `shadow`, `border`, `blur`, `table`, `grid`, `flex`, `block`, `container`, `truncate`, `transform`, `transition`, `invert`, `grayscale`, `isolate`, `contents`, `sticky`, `fixed`, `absolute`, `relative`, `static`, `hidden`, `underline`, `uppercase`, `italic`. When in doubt, prefix the class with its component (`.budget-ring`, `.cat-filter`) and check the built CSS: `grep -oE '\.ring\{[^}]*\}' dist/assets/index-*.css` must come back empty.

Area colors: one accent per tab (`--dashboard`, `--haushalt`, `--planung`, `--finanzen`, `--food`), each with `-hover` and `-tint`, switched by an `.area-*` class on the view root, which remaps `--accent`/`--accent-hover`/`--accent-tint`. "Küche" runs on `.area-food`; the older `--einkauf` (amber) tokens survive only as the colour of the *expense category* "Einkauf" (`src/utils/expenseCategories.ts`). **Bottom sheets teleport to `<body>`** and therefore land outside the view's `.area-*` class — a sheet that wants its area's accent must carry the class itself (see `NewBookingSheet.vue`, `AddIdeaSheet.vue`, `QuickAddSheet.vue`, all `.area-planung`), otherwise `--accent` falls back to the default terracotta.

Note: `README (3).md` and the `.dc (*).html` files in the repo root are **design handoff references** (originally HTML prototypes, in German) describing an earlier dark-theme visual direction and interaction spec. The actual implemented theme in `src/app.css` (light, warm, Mali/Lobster fonts) has since diverged from that doc — treat the doc as historical/behavioral reference for interactions and data model intent, not as the current source of truth for colors/fonts.

### Firebase config

Firebase project config is inlined directly in `src/services/firebase.ts` (also duplicated in `firebase_config.md` as a plain reference note — update both if the project config ever changes). `db` is initialized with `persistentLocalCache`; the tab manager is picked by platform (single-tab natively, multi-tab on the web — a WebView has exactly one tab, and the cross-tab lock only costs there). `useAuth.ts` explicitly handles the case where a Firestore read/write fails with an "offline" error and falls back to a locally-constructed user object instead of surfacing an error.

**App Check** guards the callables (`enforceAppCheck: true`): reCAPTCHA Enterprise on the web (`VITE_APPCHECK_SITE_KEY`), Play Integrity natively. It is deliberately *not* enforced on Firestore — turn that on only after a release cycle in monitor mode, or every stale client breaks at once. In dev, `main.ts`'s `import.meta.env.DEV` branch sets `FIREBASE_APPCHECK_DEBUG_TOKEN`, which logs a token to the browser console that has to be registered once in the Firebase Console.

### Cloud Functions (`functions/`) — the only trusted writer

TypeScript, Node 22, all in `europe-west1`. Five entry points (`functions/src/index.ts`):

- `suggestRecipes` / `planWeek` / `coachInsight` — callables that proxy Gemini. The prompts and `responseSchema`s live in `functions/src/lib/gemini.ts`; the API key is a Secret Manager secret, never in the bundle. Untrusted client input is clamped in `functions/src/lib/sanitize.ts` *before* it reaches a prompt.
- `syncEntitlement` — callable; reads the couple's subscriber record straight from the RevenueCat API and writes the result onto the couple doc. This is the escape hatch for webhook latency (called right after a purchase and on app resume) — without it the user would briefly face the paywall they just paid for.
- `revenueCatWebhook` — HTTP; the durable path. Secret-header auth, idempotent via `webhookEvents/{event.id}`.

Three things bite here and are easy to miss:
- **CORS**: the Android WebView's origin is `https://localhost`, which is *not* in the callables' default allowlist. It (and `capacitor://localhost`) must stay in `CORS_ORIGINS` (`functions/src/lib/config.ts`) or every call from the app fails at the preflight.
- **Quotas** (`functions/src/lib/rateLimit.ts`) are counted per *couple* in `usage/{coupleId}`, incremented inside a transaction *before* the Gemini call (a failed call still costs a unit — the right trade when real money is on the other end). `functions/src/lib/limits.ts` and `src/utils/premium.ts` hold the same numbers and must stay in sync; only the server one is enforced. **They are enforced nowhere at all while the direct path is live** — `useDirect` bypasses the callables, so every free limit is currently decoration.
- **Google's own quota is the real ceiling, not ours**: the Gemini key is on the free tier with **20 requests per day for the whole project** (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`), shared by both partners across every AI feature, and `gemini-2.5-pro` is unavailable there entirely (`limit: 0`). The API's `retryDelay` in that 429 is a generic backoff hint, *not* a per-minute window — `src/services/ai.ts` tells the two 429 kinds apart by the `PerDay` marker and words them differently. Check the quota before debugging any "the AI returned nothing" report. Details in `docs/play-store-roadmap.md`.

### Paar-Coach (die KI-Schicht über allen Bereichen)

Das Leitprinzip, an dem sich hier alles entlanghangelt: **Zahlen aus dem Code, Worte aus der KI, Aktion mit einem Tap.** Jede KI-Ausgabe endet in einem Button, der echte Daten ändert; reiner Text ist genau das, was sich nutzlos anfühlt. Der frühere `suggestFinanceInsight` (ein Satz über Kategorie-Deltas) ist ersatzlos gelöscht.

- `src/utils/coachSnapshot.ts` ist der Kern: reine Funktionen (wie `choreBalance.ts`/`belegung.ts`), die aus den ohnehin berechneten Computeds einen kompakten, faktischen Digest bauen — `buildFairnessSnapshot` (nutzt `recentPoints()` unverändert weiter, inkl. der `'both'`-Regel), `buildMoneySnapshot`, `buildTogetherSnapshot`, plus `buildCoachSnapshot` als Klammer. **Was nicht im Snapshot steht, darf die KI nicht behaupten** — der Prompt sagt das explizit, und die UI rendert ihre Kennzahlen weiterhin selbst aus dem Snapshot statt aus dem KI-Text.
- Ein Callable, drei Blickwinkel: `coachInsight(coupleId, lens, snapshot)` mit `lens: 'week' | 'fairness' | 'money'`. Das Response-Schema erzwingt `headline` / `sections[]` / `suggestion{text,action}` / `talkingPoint`.
- **`suggestion.action` ist der Punkt der Übung**: `rebalanceChores` · `settleUp` · `planIdea` · `setBudget` · `none`. Alle vier Ziele existierten schon (`FairDistributeSheet`, das „Begleichen"-Batch in `FinanzenView`, das Ideen-Sheet im Wir-Tab, das Budget-Sheet im Dashboard) — der Coach schreibt selbst nichts, er routet nur. Quer durch die Tabs läuft das über `?coach=fair` / `?coach=settle` / `?coach=budget`, die der Zielview per Watcher aufgreift und danach aus der Query entfernt.
- Drei Prompt-Blöcke tragen die Qualität und dürfen nicht verwässert werden: `PRIORITY_RULE` (was *zwischen* den beiden steht, schlägt reine Ausgabenhöhe — sonst greift das Modell zur naheliegendsten Zahl und sagt, was jede Haushaltsapp auch sagt), `GLOSSARY` (ohne das wurde aus „78 % der Punkte" ein „78 % der Aufgaben") und `COACH_RULES` — dort ist Regel 2 („nie einen der beiden ins Unrecht setzen") der eigentliche Wert: ein Coach, der in einer Beziehungs-App Schuld zuweist, richtet Schaden an. Regel 5 (`talkingPoint` in der Ich-Form) ist die einzige bewusste Ausnahme davon.
- **Der Bericht gehört dem Paar, nicht der Person.** `useCoach.ts` legt pro Woche und Blickwinkel genau einen Bericht in `coachReports` ab (`weekKey` = ISO-Jahr+KW); wer ihn auslöst, erzeugt ihn für beide. Zwei unterschiedliche KI-Texte über die Fairness desselben Haushalts wären Gift. Es gibt bewusst **kein Archiv** — angezeigt wird immer nur die laufende Woche.
- Flächen: `CoachCard.vue` (Wir-Tab, Wochen-Check-in — Erzeugung über `useCoachRun.ts`) und `FairnessCard.vue` (Haushalt-Übersicht). Letztere zeigt die Lastverteilung **immer** — die Zahlen sind gratis gerechnet —, und die KI kommt erst auf Tap für die Formulierungshilfe. `CoachReportCard.vue` rendert das Ergebnis in beiden Fällen. Seit dem Check-in gibt es eine vierte Section-Id `checkin` („Zwischen euch") und einen eigenen Prompt-Block `CHECKIN_RULES` (nie zitieren, nie attribuieren, kein Diagnose-Vokabular, max. ein Thema, Krisen auslassen) — der ist genauso unantastbar wie Regel 2.

### Premium ("TwoDo Plus")

**The subscription belongs to the couple, not the person.** `plan`/`premiumUntil`/`premiumStore`/`rcAppUserId` live on the `couples/{coupleId}` doc, and the RevenueCat App User ID is `couple_<coupleId>` — so whichever partner buys, both are premium instantly through the existing `onSnapshot`, and either can restore on a new device. `firestore.rules` makes those fields immutable from any client (`entitlementUntouched()`); the Admin SDK bypasses rules, so the webhook is the only writer.

`useCouple().isPremium` is the single source of truth in the UI. It ORs in an `optimisticPremium` ref that `usePremium().purchase()` flips right after a successful purchase, so the unlock feels instant; the next Firestore snapshot clears it and takes over. **Lifetime semantics: `plan === 'premium'` with `premiumUntil == null` means "never expires"** (what `syncEntitlement`/the webhook write for a one-time purchase) — both `isPremium` and `isPremiumActive()` (`functions/src/lib/entitlements.ts`) treat it that way and must stay in sync. There is deliberately no `plan: 'lifetime'` value; a UI label derives from `isPremium && premiumUntil == null`. Planned prices (2026-07): 2,99 €/Monat · 24,99 €/Jahr · Lifetime 34,99 € with the fair-use quota shown via `PREMIUM_AI_LIMITS` (`src/utils/premium.ts`, display twin of `functions/src/lib/limits.ts`).

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

`src/services/ai.ts` is the client's only door to the AI (it replaced the former `gemini.ts` + `geminiFinance.ts`, which called Gemini directly with a bundled key). It wraps the callables and returns an `AiResult<T>` discriminated union — **nothing throws to the caller any more**: `{ kind: 'quota' }` / `{ kind: 'premium' }` open the paywall, and `{ kind: 'error', message, retryable }` is a real failure that has to be *said*. That fourth branch exists because failures used to be flattened into `{ kind: 'ok', data: [] }`, which turned "Gemini is rate-limited" into the week planner reporting "Kein Tag mehr übrig" — **a failure must never look like an empty result**, and it must never open the paywall either.

Both recipe calls share one context builder (`buildRecipeContext()` in `useMealPlan.ts`): liked recipes as `favorTitles`, the last 14 days as `avoidTitles`, plus `Couple.foodProfile` (`src/utils/foodProfile.ts` — servings, diet, no-gos, likes, weekday cooking time; absent = defaults). The single-recipe path used to get *none* of this, which is why typed wishes felt ignored. `avoidExtra` additionally excludes whatever already sits in the week preview, so re-rolling one day can't return a dish that's already planned. In the prompts the user's wish goes **first** and the format rules last; diet and no-gos always win, everything else yields to the current wish.

`useMealPlan.ts` follows the standard composable shape (`recipes`/`mealPlans` Firestore collections, realtime listeners per `coupleId`) and derives `week` — the current Monday–Sunday (`src/utils/mealplan.ts`) — by joining each day's `MealPlanEntry` (one per `dateKey`, `YYYY-MM-DD`) to its `Recipe`. `Recipe` always has `ingredients` + `steps`; `nutrition` is optional/nullable and its section in `RecipeDetailModal.vue` only renders when present — Gemini is asked to estimate it but told to omit it if unsure, and manually-created recipes (via the Rezept-Wiki form) never have it. `EinkaufenView.vue` **is** the "Küche" tab (`.area-food`) and hosts three segments — **Wochenplan (the landing segment) · Einkaufsliste · Rezepte**. `EssensplanView.vue` is that first segment, not a separate route. It hosts the weekly list plus two sheets that are easy to confuse: **`RecipeSuggestSheet.vue` has no AI at all** (tap an empty day → free-text title or pick from the existing collection), while **`KitchenAiSheet.vue` is the one AI entry point** — one sheet, two actions (whole week / single recipe), which becomes its own glowing thinking state and, in the week preview, lets each day be expanded or re-rolled individually (🔄, one `suggestRecipes` call, so it doesn't burn a week-autopilot unit). Picking a suggestion always creates a **new** `Recipe` doc via `assignRecipe()` — recipes aren't deduped/reused across weeks yet. `SuggestionCard.vue` is shared by every suggestion surface: tap expands (ingredients, steps, nutrition — Gemini returns them anyway), and only the button inside commits. Tap-to-commit without a preview was the original sin here. "Einkaufsliste aus Plan erstellen" aggregates all of the week's recipe ingredients client-side (merging same name+unit) and pushes them through `useShopping().addItem()` into whatever list is currently `activeListId` — `EssensplanView` instantiates its own `useShopping()` call rather than receiving one as a prop, consistent with the "new composable instance per call site" pattern used elsewhere.

Clicking a filled day in `EssensplanView.vue`, or any card in `RezeptWikiView.vue` (also reached from `EinkaufenView.vue`'s header), opens the same shared `RecipeDetailModal.vue` — ingredient checkboxes there are local-only UI state (reset every time the modal opens), not persisted to Firestore. `RezeptWikiView.vue` is a separate recipe *library*, unrelated to any specific week: it uses `useMealPlan().recipes`/`createRecipe()`/`updateRecipe()`/`deleteRecipe()`, and hosts the same gradient "Rezept vorschlagen lassen" card as the Wochenplan — but in `AiRecipeSheet`'s **library mode**.

`AiRecipeSheet.vue` has two modes, because the KI optics (gradient button, loading orb) and the suggestion state are identical in both and only the *target* differs: `mode="day"` (default, Wochenplan) plans the picked suggestion straight onto a weekday, `mode="library"` (Rezept-Wiki) drops the day picker and instead inserts a second step where the user picks the recipe's categories before it is saved. Gemini can only ever return the **default** category ids (`TAG_IDS` in `src/services/aiDirect.ts` / `functions/src/lib/gemini.ts` is a fixed enum) — in library mode those are a *pre-selection*, and self-made categories have to be ticked by hand.

Recipe categories are **not a fixed set** any more: like the expense and idea categories they live on the couple doc (`Couple.recipeCategories`, absent = `DEFAULT_RECIPE_CATEGORIES` in `src/utils/recipeTags.ts` — the original 8 ids/colors/emojis from the design reference, so old `Recipe.tags` values stay valid without migration). Unlike the other two they carry their own `color` (assigned from a palette at creation; the form only picks name + icon), and they may be deleted down to **zero** — `Recipe.tags` is optional, a recipe without a category is a valid recipe. Anything that renders a recipe's icon/color therefore has to resolve the list first: `primaryTagMeta(tags, categories)` / `recipeCategoryDef(id, categories)` take it as a parameter (`resolveRecipeCategories(couple)`), they no longer look it up themselves. In the wiki, the filter row is a single horizontally scrollable chip row led by "Alle" (same shape as the Aufgaben-Pool's room chips, `data-hswipe-skip` and all); it lists only categories that actually have recipes, while the recipe form's badge picker shows all of them. The chips are still multi-select, OR'd together — "Alle" is just the state of having none selected.

All composite indexes (`mealPlans`, `resources`, `bookings`, `bucketListItems`, `trips`, `notes`, …) are in `firestore.indexes.json` **and deployed**. Adding a new `where(coupleId) + orderBy(...)` query means adding an index there and running `firebase deploy --only firestore` — until that lands, the query fails with "index is building"/"requires an index".
