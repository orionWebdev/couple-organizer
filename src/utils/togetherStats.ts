// „Was ihr zusammen geschafft habt" — der Rückblick über die gesamte Zeit.
//
// Bewusst KUMULATIV und ohne Rücksetzung: Das ist der Gegenpol zu allem anderen
// in der App. Waagen, Wochenpläne und Check-ins schauen auf das Jetzt und auf
// Verteilung; das hier schaut auf das, was zu zweit entstanden ist. Deshalb
// gibt es hier auch keine Aufschlüsselung nach Person — es ist die einzige
// Zahl in der App, die absichtlich nicht zwischen euch unterscheidet.
//
// Reine Funktion, keine Datenbank, keine KI.
import type {
  Booking,
  BucketListItem,
  ChoreHistoryEntry,
  Couple,
  MealPlanEntry,
  Trip
} from '@/types'

export interface TogetherStat {
  key: 'days' | 'chores' | 'meals' | 'ideas' | 'trips' | 'bookings'
  value: number
  label: string
}

export interface TogetherStats {
  stats: TogetherStat[]
  /** Zu früh für einen Rückblick? Dann zeigt die UI gar nichts. */
  hasEnough: boolean
}

const MIN_TOTAL = 5

function toMillis(timestamp: unknown): number {
  if (timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp) {
    return (timestamp as { toMillis: () => number }).toMillis()
  }
  return 0
}

export function buildTogetherStats(input: {
  couple: Couple | null
  history: readonly ChoreHistoryEntry[]
  mealEntries: readonly MealPlanEntry[]
  ideas: readonly BucketListItem[]
  trips: readonly Trip[]
  bookings: readonly Booking[]
  now?: Date
}): TogetherStats {
  const now = input.now ?? new Date()
  const started = toMillis(input.couple?.createdAt)
  const days = started ? Math.max(0, Math.floor((now.getTime() - started) / 86400000)) : 0

  const ideasDone = input.ideas.filter((i) => i.done).length

  const stats: TogetherStat[] = [
    { key: 'days', value: days, label: days === 1 ? 'Tag gemeinsam organisiert' : 'Tage gemeinsam organisiert' },
    { key: 'chores', value: input.history.length, label: input.history.length === 1 ? 'Aufgabe erledigt' : 'Aufgaben erledigt' },
    { key: 'meals', value: input.mealEntries.length, label: input.mealEntries.length === 1 ? 'Essen geplant' : 'Essen geplant' },
    { key: 'ideas', value: ideasDone, label: ideasDone === 1 ? 'Idee umgesetzt' : 'Ideen umgesetzt' },
    { key: 'trips', value: input.trips.length, label: input.trips.length === 1 ? 'Reise' : 'Reisen' },
    { key: 'bookings', value: input.bookings.length, label: input.bookings.length === 1 ? 'Termin abgestimmt' : 'Termine abgestimmt' }
  ]

  // Nullwerte weglassen — „0 Reisen" ist keine Erinnerung, sondern ein Vorwurf.
  const shown = stats.filter((s) => s.value > 0)
  const total = shown.filter((s) => s.key !== 'days').reduce((sum, s) => sum + s.value, 0)

  return { stats: shown, hasEnough: total >= MIN_TOTAL }
}
