# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Couple Organizer" (PWA manifest name "Paarplaner") — a mobile-first PWA for couples to manage shared finances, household chores, and shopping lists. Vue 3 + TypeScript + Vite, backed directly by Firebase (Auth + Firestore), no custom backend server.

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

`src/router/index.ts` has a single `beforeEach` guard that awaits `authReady` and redirects based on two route meta flags: `requiresAuth` (must be signed in) and `requiresCouple` (must have a `coupleId`, otherwise sent to `/couple-setup`). The three main tabs (`/finanzen`, `/haushalt`, `/einkaufen`) are children of `TabsView.vue`, which renders the bottom tab bar and hosts cross-tab UI (`Toast`, the invite-partner `BottomSheet`).

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

### Design tokens & styling

Tailwind v4 is loaded via `@import "tailwindcss"` in `src/app.css`, but most visual styling is done with CSS custom properties defined there (`--bg`, `--accent`, `--chris`/`--sarah` person colors, radii, motion/easing durations) and scoped `<style>` blocks per component, not Tailwind utility classes. When touching styles, check `src/app.css` for the existing token before inventing a new color/spacing value.

Note: `README (3).md` and the `.dc (*).html` files in the repo root are **design handoff references** (originally HTML prototypes, in German) describing an earlier dark-theme visual direction and interaction spec. The actual implemented theme in `src/app.css` (light, warm, Mali/Lobster fonts) has since diverged from that doc — treat the doc as historical/behavioral reference for interactions and data model intent, not as the current source of truth for colors/fonts.

### Firebase config

Firebase project config is inlined directly in `src/services/firebase.ts` (also duplicated in `firebase_config.md` as a plain reference note — update both if the project config ever changes). `db` is initialized with `persistentLocalCache` + `persistentMultipleTabManager` for offline support across tabs; `useAuth.ts` explicitly handles the case where a Firestore read/write fails with an "offline" error and falls back to a locally-constructed user object instead of surfacing an error.

### Gemini (Rezeptvorschläge) & Essensplan

`src/services/gemini.ts` (`suggestRecipes()`) calls the Gemini REST API (`gemini-2.5-flash`, `generateContent` with `responseSchema` for structured JSON) directly from the client via `VITE_GEMINI_API_KEY` (see `.env.example`) — no proxy/Cloud Function. This is safe only because the key must be restricted to specific HTTP referrers in Google Cloud Console (dev + prod origins) and to the Generative Language API; it is **not** a secret in the traditional sense. If the app is later wrapped for the Play Store as something other than a TWA (e.g. Capacitor, which doesn't preserve the real HTTPS origin's `Referer` header), the referrer restriction stops applying — at that point, move the `fetch()` in `gemini.ts` behind a small Firebase Cloud Function that holds the key server-side. Callers only ever import `suggestRecipes()`, so that swap is isolated to this one file.

`useMealPlan.ts` follows the standard composable shape (`recipes`/`mealPlans` Firestore collections, realtime listeners per `coupleId`) and derives `week` — the current Monday–Sunday (`src/utils/mealplan.ts`) — by joining each day's `MealPlanEntry` (one per `dateKey`, `YYYY-MM-DD`) to its `Recipe`. `EssensplanView.vue` (reached from a header button on `EinkaufenView.vue`, not a separate bottom tab) hosts the weekly list plus `RecipeSuggestSheet.vue`, which calls `suggestRecipes()` and, on picking a suggestion (or a manual fallback title with no AI call), always creates a **new** `Recipe` doc via `assignRecipe()` — recipes aren't deduped/reused across weeks yet. "Einkaufsliste aus Plan erstellen" aggregates all of the week's recipe ingredients client-side (merging same name+unit) and pushes them through `useShopping().addItem()` into whatever list is currently `activeListId` — `EssensplanView` instantiates its own `useShopping()` call rather than receiving one as a prop, consistent with the "new composable instance per call site" pattern used elsewhere.

The `mealPlans` composite index (`coupleId` asc + `dateKey` asc) was added to `firestore.indexes.json` for this feature — it still needs `firebase deploy --only firestore:indexes` (or `--only firestore`) run against the live project before the Essensplan view will work in production.
