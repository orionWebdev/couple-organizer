import type { Timestamp } from 'firebase/firestore'

export interface User {
  uid: string
  email: string
  displayName: string
  coupleId: string | null
  notifyPush?: boolean // optional — absent on older user docs, defaults to true (see useAuth)
  languageEnglish?: boolean // rein visuell/Beta, kein echtes i18n dahinter
  createdAt: Timestamp
}

export interface ExpenseCategoryDef {
  id: string
  name: string
  icon: string
}

// Kategorien des Rezept-Wikis. Anders als bei Ausgaben/Ideen trägt eine
// Rezept-Kategorie ihre Farbe mit (die Badges/Karten färben sich danach); sie
// wird beim Anlegen aus einer Palette vergeben, nicht frei gewählt.
export interface RecipeCategoryDef {
  id: string
  label: string
  emoji: string
  color: string
}

// Dauerhafte Ess-Vorlieben des Paares. Liegen auf dem Couple-Doc, weil sie in
// JEDEN Rezept-Aufruf einfließen sollen (Einzelvorschlag wie Wochenplan) —
// vorher musste "kein Fisch" bei jedem Aufruf neu getippt werden.
// Freitext statt Enums: die KI liest es ohnehin als Prompt, und jede feste
// Liste wäre in dem Moment falsch, in dem jemand "keine Pilze" braucht.
export interface FoodProfile {
  servings: number // Standard-Portionen
  likes: string // "viel Gemüse, asiatisch"
  dislikes: string // "kein Fisch, keine Oliven"
  diet: string // "vegetarisch" o. ä.
  weekdayMaxMinutes: number | null // werktags verfügbare Kochzeit; null = egal
}

// Das Abo gehört dem Paar, nicht der Person: kauft einer, haben beide Premium.
// Deshalb liegen die Felder auf dem Couple-Doc und nicht auf dem User.
export type CouplePlan = 'free' | 'premium'

export interface Couple {
  id: string
  memberIds: string[]
  memberNames: Record<string, string> // { uid: displayName }
  memberIcons?: Record<string, string> // { uid: emoji } — optional, absent = Initialen-Fallback
  inviteCode: string
  monthlyBudget?: number | null // cents; optional — absent on older couple docs
  expenseCategories?: ExpenseCategoryDef[] // optional — absent = DEFAULT_EXPENSE_CATEGORIES (src/utils/expenseCategories.ts)
  ideaCategories?: IdeaCategoryDef[] // optional — absent = DEFAULT_IDEA_CATEGORIES (src/utils/ideen.ts)
  recipeCategories?: RecipeCategoryDef[] // optional — absent = DEFAULT_RECIPE_CATEGORIES (src/utils/recipeTags.ts)
  foodProfile?: FoodProfile // optional — absent = DEFAULT_FOOD_PROFILE (src/utils/foodProfile.ts)
  // „Danke" je Partner, Schlüssel = wer es gegeben hat. Bewusst nur der letzte
  // Zeitpunkt statt einer eigenen Collection: ein Danke soll frisch wirken, ein
  // Archiv davon wäre eine Bilanz — und Bilanzen sind hier das Gegenteil des Ziels.
  thanks?: Record<string, Timestamp>
  // Check-in-Einwilligung je Partner (Schlüssel = uid). Explizites Opt-in, weil
  // Gefühlsdaten in DSGVO-Art.-9-Nähe liegen; `version` erlaubt eine spätere
  // Re-Konsens-Abfrage, wenn sich der Umfang der Verarbeitung ändert.
  checkinOptIn?: Record<string, { at: Timestamp; version: number }>
  createdAt: Timestamp

  // Entitlement — ausschließlich vom Backend geschrieben (Admin SDK), für
  // Clients in firestore.rules unveränderlich. absent = 'free'.
  plan?: CouplePlan
  premiumUntil?: Timestamp | null
  premiumStore?: 'play' | 'appstore' | 'promo'
  premiumUpdatedAt?: Timestamp
  rcAppUserId?: string
}

export type ChoreType = 'recurring' | 'once'
export type ChoreAssignee = string | 'both' | null // uid | Beide | Offen

// Punkte je Aufgabengröße: 5 = winzig, 10 = klein, 20 = mittel, 30 = groß.
export type ChorePoints = 5 | 10 | 20 | 30

// Feste Aufgabenbereiche/Räume für Pool-Filter und Zuordnung.
export type ChoreRoom =
  | 'allgemein'
  | 'kueche'
  | 'wohnzimmer'
  | 'schlafzimmer'
  | 'badezimmer'
  | 'waesche'
  | 'muell'
  | 'einkaufen'
  | 'pflanzen'
  | 'haustiere'
  | 'auto'

export interface Chore {
  id: string
  coupleId: string
  name: string
  room: ChoreRoom // Raum/Bereich für Filter (Altbestand ohne Feld = 'allgemein')
  type: ChoreType
  assignee: ChoreAssignee
  points: ChorePoints // Belohnungspunkte je nach Aufgabengröße (Altbestand: via pointsForChore abgeleitet)
  done: boolean // once-tasks only: permanently done, hides from pool
  completedAt: Timestamp | null // last completion instant (recurring: today's occurrence)
  completedBy: ChoreAssignee
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ChoreHistoryEntry {
  id: string
  coupleId: string
  choreId: string
  choreName: string
  completedBy: ChoreAssignee
  points: ChorePoints // beim Erledigen gutgeschriebene Punkte (Altbestand: via pointsForName abgeleitet)
  completedAt: Timestamp
  createdAt: Timestamp
}

// Persönliche Schnell-Aufgaben fürs Dashboard: KEIN eigener Aufgaben-Datensatz,
// sondern eine Verknüpfung auf einen bestehenden Chore (`choreId`). Jeder Partner
// pflegt über die Settings seine eigene Auswahl (`owner`). Ein Tap auf dem
// Dashboard erledigt exakt diesen Chore (landet im choreHistory-Verlauf und in
// den Punkten) — die Kachel zeigt Name/Emoji/Zähler 1:1 aus dem Chore + Verlauf.
export interface FavoriteChore {
  id: string
  coupleId: string
  owner: string // uid — wessen Favorit
  choreId: string // verweist auf chores/{choreId}
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ShoppingItem {
  id: string
  coupleId: string
  listId: string
  name: string
  amount?: number
  unit?: string
  category: string
  checked: boolean
  checkedBy: string | null
  addedBy: string
  source: 'manual' | 'mealPlan'
  sourceWeekKey: string | null
  expenseId: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ShoppingList {
  id: string
  coupleId: string
  title: string
  archived: boolean
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface RecipeIngredient {
  name: string
  amount?: number
  unit?: string
}

export interface RecipeNutrition {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface Recipe {
  id: string
  coupleId: string
  title: string
  description: string
  minutes: number | null
  servings: number | null
  tags: readonly string[]
  likes: readonly string[] // uids, die das Rezept mit Herz markiert haben (absent = [])
  ingredients: readonly RecipeIngredient[]
  steps: readonly string[]
  nutrition: RecipeNutrition | null
  source: 'manual' | 'ai'
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface MealPlanEntry {
  id: string
  coupleId: string
  dateKey: string // YYYY-MM-DD, der geplante Kalendertag
  recipeId: string
  cookAssignee?: string | 'both' | null // wer kocht — optional, absent auf älteren Einträgen
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// String statt festem Union: Kategorien sind jetzt pro Couple frei editierbar
// (Couple.expenseCategories) — die bisherigen 5 Werte bleiben als IDs gültig.
export type ExpenseCategory = string
export type FinanceEventKind = 'event' | 'monthly'

export interface FinanceEvent {
  id: string
  coupleId: string
  title: string
  kind: FinanceEventKind
  category: ExpenseCategory | null
  archived: boolean
  budget?: number | null // cents; optional — absent/null = kein Budget für dieses Event
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
  archivedAt: Timestamp | null
}

export interface Expense {
  id: string
  coupleId: string
  title: string
  amount: number // stored in cents
  owedBy: Readonly<Record<string, number>>
  category: ExpenseCategory
  paidBy: string
  eventId: string | null
  monthKey: string // YYYY-MM
  source: 'manual' | 'shopping'
  shoppingListId: string | null
  shoppingItemIds: readonly string[]
  isPaid: boolean
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ExpenseBalanceSummary {
  totals: Record<string, number>
  owedTotals: Record<string, number>
  balances: Record<string, number>
  totalSpent: number
}

// Zwei getrennte Achsen, die vorher vermischt waren:
//   "ausgegeben"   = alle Ausgaben des Monats, egal ob untereinander ausgeglichen
//   "ausgeglichen" = isPaid, also der Ausgleich ZWISCHEN den Partnern
// Ein beglichener Einkauf ist trotzdem ausgegebenes Geld.
export interface MonthlyExpenseSummary {
  monthKey: string
  total: number // cents — alles, was der Monat gekostet hat (auch Beglichenes)
  open: number // cents — davon noch nicht ausgeglichen
  paidBy: Record<string, number> // cents je uid — wer hat den Monat ausgelegt (alle Ausgaben)
  balances: Record<string, number> // Ausgleichs-Saldo (nur noch offene Ausgaben)
  expenses: Expense[]
}

export interface FinanceEventSummary {
  event: FinanceEvent
  total: number // cents — noch offen (nicht ausgeglichen)
  spent: number // cents — alles, was das Event gekostet hat (auch Ausgeglichenes);
                // nur das ist die richtige Bezugsgröße für ein Event-Budget
  balances: Record<string, number>
  expenses: Expense[]
}

export interface CategoryMonthlyComparison {
  categoryId: string
  current: number // cents, aktueller Monat
  previous: number // cents, Vormonat
  deltaPct: number | null // null wenn Vormonat 0 war (Prozent nicht sinnvoll berechenbar)
}

// Ein Monat im Finanz-Coach: alle Kategorie-Ausgaben dieses Monats plus
// Vergleich zum jeweils vorigen Kalendermonat. Es gibt einen Eintrag pro
// Monat, in dem überhaupt (Monats-)Ausgaben erfasst wurden.
export interface FinanceMonthComparison {
  monthKey: string // "YYYY-MM"
  label: string // z. B. "März 2026"
  total: number // cents, Summe aller Kategorien dieses Monats
  categories: CategoryMonthlyComparison[]
}

// ── Belegung: geteilte Ressourcen (Auto, E-Bike, Hund …) ─────────
export interface Resource {
  id: string
  coupleId: string
  name: string
  emoji: string
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type BookingRepeat = 'none' | 'weekly'

// Eine Belegung wird direkt eingetragen — es gibt keinen Anfrage-/Bestätigen-
// Flow (bewusst entfernt). Überschneidungen werden nur angezeigt, nie verhindert.
export interface Booking {
  id: string
  coupleId: string
  resourceId: string
  owner: string // uid — für wen die Belegung ist (kann der Partner sein)
  date: string // YYYY-MM-DD; bei repeat 'weekly' der erste Termin der Serie
  weekday: number // 0 = Montag … 6 = Sonntag, aus `date` abgeleitet
  allDay: boolean
  start: string // HH:MM
  end: string // HH:MM
  repeat: BookingRepeat
  note: string
  createdBy: string // uid — wer sie eingetragen hat (für die Übersicht)
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Eine Belegung an einem konkreten Tag. Wöchentliche Serien haben pro Woche
// eine Occurrence, liegen in Firestore aber nur als ein Booking-Dokument.
export interface BookingOccurrence {
  booking: Booking
  dateKey: string
}

// "Ideen für uns" im Planung-Tab. Die Collection heißt weiter bucketListItems.
// Die Kategorien sind wie die Ausgaben-Kategorien frei definierbar und liegen auf
// dem Couple-Doc (Couple.ideaCategories) — die Default-IDs ('film' | 'essen' |
// 'date') und die noch älteren Bucket-List-Werte ('ort' | 'restaurant') bleiben
// als gespeicherte Werte gültig, siehe ideaCategory() in src/utils/ideen.ts.
export type IdeaCategory = string

export interface IdeaCategoryDef {
  id: string
  label: string
  emoji: string
}

export interface BucketListItem {
  id: string
  coupleId: string
  category: IdeaCategory
  name: string
  note: string
  done: boolean
  date?: string | null // YYYY-MM-DD; optional — im Kalender angezeigt, wenn gesetzt
  suggestedBy: string // uid — von wem die Idee stammt (kann der Partner sein)
  createdBy: string // uid — wer sie eingetragen hat
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Reisen & Ausflüge — `when` ist bewusst Freitext ("Sept.", "noch offen"),
// weil die wenigsten Ideen schon ein Datum haben.
// Ein Punkt auf der Packliste/To-do-Liste einer Reise (klein & eingebettet,
// deshalb als Array auf dem Trip-Dokument statt eigener Collection).
export interface TripChecklistItem {
  text: string
  done: boolean
}

export interface Trip {
  id: string
  coupleId: string
  title: string
  when: string // grober Zeit-Freitext ("Sept.", "noch offen") — Fallback ohne Datum
  startDate?: string | null // YYYY-MM-DD; Beginn (auch Einzeltag) — im Kalender angezeigt
  endDate?: string | null // YYYY-MM-DD; Ende der Range (optional; leer = ein Tag)
  location?: string // Ziel/Ort
  notes?: string // Freitext-Notizen
  links?: readonly string[] // URLs (Buchungen, Ideen …)
  checklist?: readonly TripChecklistItem[] // Packliste / To-dos
  emoji: string
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Note {
  id: string
  coupleId: string
  text: string
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ── Check-in („Wie geht's dir gerade?") ─────────────────────────
// Der erste bewusste Bruch mit „alles ist paar-lesbar": ein Eintrag gehört dem
// Autor, NICHT dem Paar. Der Partner sieht ihn nie — weder in der UI noch über
// die Rules. In den Coach-Bericht fließen Einträge nur anonymisiert ein.
export type CheckinArea = 'haushalt' | 'finanzen' | 'zeit' | 'anerkennung'
export type CheckinLevel = 1 | 2 | 3

export interface CheckinEntry {
  id: string
  coupleId: string
  authorId: string
  area: CheckinArea
  level: CheckinLevel // Intensität, keine Häufigkeit
  // Freitext (max. 500). Wird gespeichert, geht aber erst an die KI, wenn die
  // Cloud Functions live sind UND der Gemini-Paid-Tier bestätigt ist — Free-
  // Tier-Daten nutzt Google fürs Training, Gefühlstexte sind dafür tabu.
  text: string | null
  createdAt: Timestamp
  // createdAt + 56 Tage. Datenminimierung: kein Archiv; serverseitig räumt eine
  // Firestore-TTL-Policy auf diesem Feld auf, der Client filtert zusätzlich.
  expiresAt: Timestamp
}

// Paar-lesbarer Digest je Autor (Doc-Id `${coupleId}_${uid}`): NUR Enums und
// Zähler, NIE Freitext. Existiert ausschließlich, damit der clientseitig
// gebaute Coach-Snapshot die Themen BEIDER Partner kennen kann, ohne dass einer
// die Einträge des anderen lesen können muss. Wird in keiner UI angezeigt.
export interface CheckinDigest {
  coupleId: string
  authorId: string
  areas: Partial<Record<CheckinArea, { count: number; maxLevel: CheckinLevel }>>
  lastEntryAt: Timestamp | null
  updatedAt: Timestamp
}
