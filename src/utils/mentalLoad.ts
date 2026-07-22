// Mental Load — wer DENKT MIT, nicht wer macht.
//
// Der Unterschied ist der Kern der App: `choreHistory.completedBy` misst
// Ausführung. Mental Load ist die unsichtbare Arbeit davor — merken, dass etwas
// ansteht, es aufschreiben, planen, den Kalender des anderen im Kopf behalten.
// Genau diese Daten liegen längst in Firestore (`createdBy` auf zwölf
// Dokumenttypen, `addedBy`, `suggestedBy`) und wurden bisher nur geschrieben,
// nie gelesen.
//
// Reine Funktionen wie choreBalance.ts / weekFill.ts — kein Firestore, keine KI.
//
// Zwei Richtungen, dieselben Zahlen:
//   die EIGENE Last → um sie auszugleichen
//   die des PARTNERS → um sie zu würdigen
// Dieselbe Zahl wirkt als Vorwurf oder als Wertschätzung, je nachdem, wem man
// sie zeigt. Deshalb liefert dieses Modul beide Sichten getrennt.
import type {
  Booking,
  BucketListItem,
  Chore,
  Couple,
  Expense,
  MealPlanEntry,
  ShoppingItem
} from '@/types'
import { dateKey } from '@/utils/mealplan'

const WINDOW_DAYS = 30

export interface MentalLoadContribution {
  key: 'chores' | 'shopping' | 'calendar' | 'ideas' | 'meals' | 'money'
  /** Rohzahl — was in der Wertschätzungs-Ansicht genannt wird. */
  count: number
  /**
   * Gewicht für die Waage. Bei Einkaufsliste und Essensplan zählen TAGE statt
   * Einträgen: ein Wocheneinkauf mit 25 Artikeln ist ein Akt des Mitdenkens,
   * nicht 25 — sonst überdeckt eine einzige Einkaufsliste alles andere.
   */
  weight: number
}

export interface MentalLoadPerson {
  uid: string
  name: string
  contributions: MentalLoadContribution[]
  weight: number
  sharePct: number
}

export interface MentalLoadSummary {
  windowDays: number
  people: MentalLoadPerson[]
  hasData: boolean
}

function toMillis(timestamp: unknown): number {
  if (timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp) {
    return (timestamp as { toMillis: () => number }).toMillis()
  }
  return 0
}

// Lokaler Tag, nicht UTC — sonst rutscht ein Eintrag um 0:30 MESZ beim
// Tage-Dedup auf den Vortag.
function dayOf(timestamp: unknown): string {
  const ms = toMillis(timestamp)
  return ms ? dateKey(new Date(ms)) : ''
}

export interface MentalLoadInput {
  couple: Couple | null
  /** Aus wessen Blickwinkel — bestimmt, was „Termine für dich" heißt. */
  viewerUid: string
  chores: readonly Chore[]
  shoppingItems: readonly ShoppingItem[]
  bookings: readonly Booking[]
  ideas: readonly BucketListItem[]
  mealEntries: readonly MealPlanEntry[]
  expenses: readonly Expense[]
  windowDays?: number
  now?: Date
}

export function buildMentalLoad(input: MentalLoadInput): MentalLoadSummary {
  const windowDays = input.windowDays ?? WINDOW_DAYS
  const now = input.now ?? new Date()
  const cutoff = now.getTime() - windowDays * 86400000
  const inWindow = (t: unknown) => toMillis(t) >= cutoff

  const members = input.couple?.memberIds ?? []

  const people = members.map((uid) => {
    const byMe = <T extends { createdAt?: unknown }>(items: readonly T[], author: (i: T) => string) =>
      items.filter((i) => inWindow(i.createdAt) && author(i) === uid)

    const chores = byMe(input.chores, (c) => c.createdBy)
    const shopping = byMe(input.shoppingItems, (s) => s.addedBy)
    const ideas = byMe(input.ideas, (i) => i.suggestedBy || i.createdBy)
    const meals = byMe(input.mealEntries, (m) => m.createdBy)
    const expenses = byMe(input.expenses, (e) => e.createdBy)

    // Der reinste Mental-Load-Marker der ganzen App: einen Termin eintragen,
    // der jemand ANDEREM gehört — den Kalender des Partners mitdenken.
    const calendar = byMe(input.bookings, (b) => b.createdBy).filter((b) => b.owner !== uid)

    // Tage statt Einträge, wo eine einzelne Handlung viele Dokumente erzeugt.
    const days = (items: readonly { createdAt?: unknown }[]) =>
      new Set(items.map((i) => dayOf(i.createdAt)).filter(Boolean)).size

    const contributions: MentalLoadContribution[] = [
      { key: 'chores', count: chores.length, weight: chores.length },
      { key: 'shopping', count: shopping.length, weight: days(shopping) },
      { key: 'calendar', count: calendar.length, weight: calendar.length },
      { key: 'ideas', count: ideas.length, weight: ideas.length },
      { key: 'meals', count: meals.length, weight: days(meals) },
      { key: 'money', count: expenses.length, weight: expenses.length }
    ]

    return {
      uid,
      name: input.couple?.memberNames[uid] ?? 'Partner',
      contributions,
      weight: contributions.reduce((s, c) => s + c.weight, 0),
      sharePct: 0
    }
  })

  const total = people.reduce((s, p) => s + p.weight, 0)
  for (const p of people) p.sharePct = total > 0 ? Math.round((p.weight / total) * 100) : 0

  return { windowDays, people, hasData: total > 0 }
}

// ── Wertschätzungs-Ansicht ───────────────────────────────────────
// Was der PARTNER getragen hat, in Sätzen, die man jemandem zeigen kann.
// Bewusst rein beschreibend: keine Wertung, kein „endlich mal", kein Vergleich.
const PARTNER_TEXT: Record<MentalLoadContribution['key'], (n: number, forYou: boolean) => string> = {
  chores: (n) => `${n} ${n === 1 ? 'Aufgabe' : 'Aufgaben'} eingetragen, bevor sie liegen blieben`,
  shopping: (n) => `${n}× etwas auf die Einkaufsliste gesetzt, bevor es ausging`,
  calendar: (n, forYou) =>
    forYou
      ? `${n} ${n === 1 ? 'Termin' : 'Termine'} für dich im Kalender behalten`
      : `${n} ${n === 1 ? 'Termin' : 'Termine'} für uns eingetragen`,
  ideas: (n) => `${n} ${n === 1 ? 'Idee' : 'Ideen'} für euch beide notiert`,
  meals: (n) => `an ${n} ${n === 1 ? 'Tag' : 'Tagen'} überlegt, was es zu essen gibt`,
  money: (n) => `${n} ${n === 1 ? 'Ausgabe' : 'Ausgaben'} im Blick behalten`
}

export interface PartnerHighlight {
  key: MentalLoadContribution['key']
  text: string
  count: number
}

/**
 * Die stärksten Beiträge des Partners, als würdigende Sätze. `forYouCalendar`
 * unterscheidet, ob die eingetragenen Termine dem Betrachter gehören — das ist
 * der Unterschied zwischen „hat Termine eingetragen" und „hat deine Termine
 * im Kopf behalten".
 */
export function partnerHighlights(
  summary: MentalLoadSummary,
  partnerUid: string,
  opts: { max?: number; forYouCalendar?: boolean } = {}
): PartnerHighlight[] {
  const person = summary.people.find((p) => p.uid === partnerUid)
  if (!person) return []
  return person.contributions
    .filter((c) => c.count > 0)
    .sort((a, b) => b.weight - a.weight || b.count - a.count)
    .slice(0, opts.max ?? 3)
    .map((c) => ({
      key: c.key,
      count: c.count,
      text: PARTNER_TEXT[c.key](c.count, opts.forYouCalendar ?? true)
    }))
}
