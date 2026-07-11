# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Together" (user-facing brand + PWA manifest name; the repo/internal name is still "Couple Organizer"/"Paarplaner") — a mobile-first PWA for couples to manage shared finances, household chores, shopping lists, and weekly meal planning (with Gemini-assisted recipe suggestions). Vue 3 + TypeScript + Vite, backed directly by Firebase (Auth + Firestore), no custom backend server.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — typecheck (`vue-tsc -b`) then production build
- `npm run typecheck:watch` — `vue-tsc -b --watch` for incremental type checking
- `npm run preview` — preview a production build

There is no test suite and no lint script configured in this repo.

Firebase deploy is config-only here: `firebase.json` wires up `firestore.rules` and `firestore.indexes.json` (Firestore, not Hosting). Deploying rules/indexes is a `firebase deploy --only firestore` action against a live project — treat it as a real deployment and confirm before running it.

## Architecture

### Data model: single shared "couple" scope

Every piece of app data hangs off a `coupleId`. A `couples/{coupleId}` doc holds exactly the two partners (`memberIds`, `memberNames`, `inviteCode` used to join). All other top-level Firestore collections (`chores`, `choreHistory`, `shoppingItems`, `shoppingLists`, `expenses`, `financeEvents`, `recipes`, `mealPlans`) carry a `coupleId` field and are secured in `firestore.rules` via an `isCoupleMember(coupleId)` check — a document is only ever readable/writable by the two members of that couple. `src/types/index.ts` is the source of truth for all of these document shapes.

There is no global store (no Pinia/Vuex). Instead, each top-level view (`src/views/FinanzenView.vue`, `HaushaltView.vue`, `EinkaufenView.vue`) independently derives `coupleId` from `useAuth().user.value.coupleId` and passes it into the relevant domain composable. `useCouple()` is likewise called wherever the couple doc (partner names, invite code) is needed — it sets up its own `onSnapshot` listener per call site rather than being a shared singleton.

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

`src/router/index.ts` has a single `beforeEach` guard that awaits `authReady` and redirects based on two route meta flags: `requiresAuth` (must be signed in) and `requiresCouple` (must have a `coupleId`, otherwise sent to `/couple-setup`). The four main tabs (`/dashboard` — default landing, `/haushalt`, `/finanzen`, `/einkaufen`) are children of `TabsView.vue`, which renders the bottom tab bar and hosts cross-tab UI (`Toast`, the invite-partner `BottomSheet`).

### Bottom navigation (bubble + collar + droplets)

`TabsView.vue`'s nav bar is not a plain tab strip: a floating circular "bubble" (colored per active area — indigo `--dashboard`, terracotta `--haushalt`, türkis `--finanzen`, amber `--einkauf`) sits centered on the nav bar's *top edge* (both the bubble and the white "collar" halo behind it use `left: X%; transform: translate(-50%, -50%)`, so they're always exactly half above/half overlapping the bar regardless of screen width — `X` comes from `slotCenterPercent(index)`, purely index-based math, no DOM measurement). Switching tabs: `left` transitions with the existing `--ease-overshoot` bounce curve, a `bubbleJump1`/`bubbleJump2` class alternates every switch to force the CSS arrival-hop keyframe animation to restart (same name reapplied wouldn't replay), and 5 small droplets in the *previous* area's color are spawned along an arc between the old/new slot and removed via `setTimeout` once their `dropletFall` animation finishes. All of this is index/percentage-based by design — do not reintroduce fixed pixel positions here, the original design reference (`reference/Nido-source-code.dc.html`) used a fixed-width canvas that doesn't apply to a responsive layout.

### Dashboard (bento grid)

`DashboardView.vue` is the default landing tab and separately instantiates `useChores`, `useShopping`, `useMealPlan`, and `useExpenses` (each sets up its own listeners — same "new instance per call site" pattern as everywhere else). It shows: today's planned meal (`useMealPlan().week`, matched by `dateKey(new Date())`) with a "Wer kocht?" picker that writes `MealPlanEntry.cookAssignee` via `setCookAssignee()`; the next 3 unchecked shopping items; the next incomplete chore with a quick-complete button; and a Finanzen card combining `useExpenses().monthlySummaries` (current month spent) with an optional budget bar. `Couple.monthlyBudget` (cents, optional) is the only piece of couple-level settings state in the app and is edited from *within* this card (`updateBudget()` in `useCouple.ts`) — there is no separate settings screen.

### Chores domain specifics

- A chore is `recurring` or `once` — there is no interval (täglich/wöchentlich/monatlich) or fixed due date field on `Chore`; recurring just means it resets rather than being permanently completed. Completing a recurring chore just stamps `completedAt`/`completedBy` for "today" — it is never deleted. Completing a `once` chore sets `done: true` and permanently removes it from the active pool (it still appears in `choreHistory`).
- `assignee` is `uid | 'both' | null` (`null` = unassigned/"offen").
- Completing/undoing a chore writes/removes a matching `choreHistory` entry; `undoChore` restores the previous history entry's completion state rather than just clearing it.
- `room: ChoreRoom` (see `src/utils/rooms.ts`) is used for pool filtering; older documents without a `room` field are treated as `allgemein` via `roomOf()`.
- The Haushalt view's "Zuweisungen" tab (default landing tab, `HaushaltZuweisungen.vue`/`AssignmentRow.vue`) lists every assigned (non-`null`-assignee) chore with a "last completed" column derived from `choreHistory`; it flags "Vertretung" when the most recent completion was by someone other than the chore's assignee. It defaults to filtering by the current user (tap their summary card again to clear the filter, tap the partner's card to switch); rows expand in place on tap to reveal the same complete/undo controls as the "Alle" tab.

### Finance domain specifics

- Amounts are stored as integer cents (`Expense.amount`).
- An expense optionally belongs to a `FinanceEvent` (`kind: 'event' | 'monthly'`); expenses with no event are grouped by `monthKey` (`YYYY-MM`). Archived events (and their expenses) are excluded from active balance calculations (`isExpenseActive`).
- Balances are derived, not stored: `buildBalanceSummary()` in `useExpenses.ts` computes per-user `totals` (paid) vs `owedTotals` (from each expense's `owedBy` split) to get net `balances`.
- Settling up (`markAllPaid`) sets `isPaid: true` on a batch of expenses rather than deleting them.

### Branding ("Together")

The brand (source: `reference/design_handoff_together_branding/`) is the "Overlap" mark: two circles (`cx=46`/`cx=74`, `cy=45`, `r=33` in a `0 0 120 90` viewBox) in the two person colors — terracotta `--haushalt`/`--chris` and turquoise `--finanzen`/`--sarah`. `mix-blend-mode: multiply` sits on **each circle** (inside an `isolation: isolate` group), not on the group as the handoff's HTML prototype has it — only that way does the intersection darken into the "shared space" the design intends.

`src/components/brand/TogetherLogo.vue` is the reusable mark (props `height`, `variant: mark|horizontal|vertical`, `word`, `tagline`, `colorA`/`colorB`, `wordColor`, `blendMode`); all sizes derive from `height`. It's used in `LoginView.vue` and `CoupleSetupView.vue`.

The splash screen lives in `index.html` (inline markup + `<style>`, values written out literally rather than as tokens), **not** in a Vue component: `main.ts` only mounts the app after `authReady`, so the wait it covers happens before the first Vue render. `hideSplash()` in `main.ts` holds it for at least 2 s (so the build-up animation reaches the claim), then fades and removes it; if auth takes longer, the mark keeps breathing and the dots keep blinking. `App.vue` therefore has no loading state of its own.

The app icons are rendered from an HTML source with headless Chrome (the usual SVG rasterizers don't do `oklch` + `mix-blend-mode`) and come in two flavors, kept apart on purpose: `public/pwa-{192,512}.png` are the `purpose: "any"` icons (rounded tile, transparent corners — they get shown unmasked on desktop and in task switchers), `public/maskable-{192,512}.png` are `purpose: "maskable"` (full-bleed opaque square, the OS applies its own mask; the mark sits inside the 80 % safe zone). `apple-touch-icon.png` must stay full-bleed and opaque — iOS masks it itself and turns transparency black. `public/favicon.svg` spells the mark out with plain hex fills plus an explicit lens shape for the intersection, because blend modes aren't reliable in the favicon context.

Android's install splash is generated by Chrome from the 512 icon + `background_color` + name, which lines up with the HTML splash that follows. iOS has no startup image (`apple-touch-startup-image`) — it shows a blank near-white screen for a moment before the HTML splash takes over.

### Design tokens & styling

Tailwind v4 is loaded via `@import "tailwindcss"` in `src/app.css`, but most visual styling is done with CSS custom properties defined there (`--bg`, `--accent`, `--chris`/`--sarah` person colors, radii, motion/easing durations) and scoped `<style>` blocks per component, not Tailwind utility classes. When touching styles, check `src/app.css` for the existing token before inventing a new color/spacing value.

Note: `README (3).md` and the `.dc (*).html` files in the repo root are **design handoff references** (originally HTML prototypes, in German) describing an earlier dark-theme visual direction and interaction spec. The actual implemented theme in `src/app.css` (light, warm, Mali/Lobster fonts) has since diverged from that doc — treat the doc as historical/behavioral reference for interactions and data model intent, not as the current source of truth for colors/fonts.

### Firebase config

Firebase project config is inlined directly in `src/services/firebase.ts` (also duplicated in `firebase_config.md` as a plain reference note — update both if the project config ever changes). `db` is initialized with `persistentLocalCache` + `persistentMultipleTabManager` for offline support across tabs; `useAuth.ts` explicitly handles the case where a Firestore read/write fails with an "offline" error and falls back to a locally-constructed user object instead of surfacing an error.

### Gemini (Rezeptvorschläge) & Essensplan

`src/services/gemini.ts` (`suggestRecipes()`) calls the Gemini REST API (`gemini-2.5-flash`, `generateContent` with `responseSchema` for structured JSON) directly from the client via `VITE_GEMINI_API_KEY` (see `.env.example`) — no proxy/Cloud Function. This is safe only because the key must be restricted to specific HTTP referrers in Google Cloud Console (dev + prod origins) and to the Generative Language API; it is **not** a secret in the traditional sense. If the app is later wrapped for the Play Store as something other than a TWA (e.g. Capacitor, which doesn't preserve the real HTTPS origin's `Referer` header), the referrer restriction stops applying — at that point, move the `fetch()` in `gemini.ts` behind a small Firebase Cloud Function that holds the key server-side. Callers only ever import `suggestRecipes()`, so that swap is isolated to this one file.

`useMealPlan.ts` follows the standard composable shape (`recipes`/`mealPlans` Firestore collections, realtime listeners per `coupleId`) and derives `week` — the current Monday–Sunday (`src/utils/mealplan.ts`) — by joining each day's `MealPlanEntry` (one per `dateKey`, `YYYY-MM-DD`) to its `Recipe`. `Recipe` always has `ingredients` + `steps`; `nutrition` is optional/nullable and its section in `RecipeDetailModal.vue` only renders when present — Gemini is asked to estimate it but told to omit it if unsure, and manually-created recipes (via the Rezept-Wiki form) never have it. `EssensplanView.vue` (reached from a header button on `EinkaufenView.vue`, not a separate bottom tab) hosts the weekly list plus `RecipeSuggestSheet.vue`, which calls `suggestRecipes()` and, on picking a suggestion (or a manual fallback title with no AI call), always creates a **new** `Recipe` doc via `assignRecipe()` — recipes aren't deduped/reused across weeks yet. "Einkaufsliste aus Plan erstellen" aggregates all of the week's recipe ingredients client-side (merging same name+unit) and pushes them through `useShopping().addItem()` into whatever list is currently `activeListId` — `EssensplanView` instantiates its own `useShopping()` call rather than receiving one as a prop, consistent with the "new composable instance per call site" pattern used elsewhere.

Clicking a filled day in `EssensplanView.vue`, or any card in `RezeptWikiView.vue` (also reached from `EinkaufenView.vue`'s header), opens the same shared `RecipeDetailModal.vue` — ingredient checkboxes there are local-only UI state (reset every time the modal opens), not persisted to Firestore. `RezeptWikiView.vue` is a separate recipe *library*: it uses `useMealPlan().recipes`/`createRecipe()` (create-only, no edit/delete yet) and is unrelated to any specific week; its 8 fixed categories (`src/utils/recipeTags.ts` — `RECIPE_TAGS`, exact ids/colors/emojis from the design reference) double as both filter badges (multi-select, OR'd together) and the tag picker in its "new recipe" form.

The `mealPlans` composite index (`coupleId` asc + `dateKey` asc) was added to `firestore.indexes.json` for this feature — it still needs `firebase deploy --only firestore:indexes` (or `--only firestore`) run against the live project before the Essensplan view will work in production.
