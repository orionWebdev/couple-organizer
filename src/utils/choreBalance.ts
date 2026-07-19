// Faire Aufgabenverteilung (TwoDo Plus). Reine Logik, keine KI: verteilt die
// wiederkehrenden Aufgaben so auf beide Partner, dass die Last ausgeglichen ist
// — gemessen an den zuletzt erledigten Punkten (aus choreHistory) plus der neu
// zugewiesenen Aufgabenpunkte. Wer zuletzt mehr gemacht hat, bekommt jetzt
// weniger; wer diese Woche unterwegs ist, bekommt ein Handicap.
import type { Chore, ChoreAssignee, ChoreHistoryEntry } from '@/types'

const WINDOW_DAYS = 14
// Anteil der gesamten Aufgabenpunkte, um den die abwesende Person "vorbelastet"
// wird, damit die gierige Verteilung Aufgaben zur anwesenden Person schiebt.
const AWAY_HANDICAP = 0.5

function toMillis(timestamp: unknown): number {
  if (timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp) {
    return (timestamp as { toMillis: () => number }).toMillis()
  }
  return 0
}

// Zuletzt erledigte Punkte je Partner. `both` zählt für BEIDE — sonst sähe ein
// Paar, das alles zusammen macht, dauerhaft "unfair" aus (gleiche Regel wie in
// der Dashboard-Waage).
export function recentPoints(
  history: readonly ChoreHistoryEntry[],
  memberIds: readonly string[],
  windowDays = WINDOW_DAYS
): Record<string, number> {
  const [a, b] = memberIds
  const totals: Record<string, number> = { [a]: 0, [b]: 0 }
  const cutoff = Date.now() - windowDays * 86400000
  for (const h of history) {
    if (toMillis(h.completedAt) < cutoff) continue
    if (h.completedBy === 'both') {
      totals[a] += h.points
      totals[b] += h.points
    } else if (h.completedBy && h.completedBy in totals) {
      totals[h.completedBy] += h.points
    }
  }
  return totals
}

export interface BalanceProposal {
  chore: Chore
  from: ChoreAssignee
  to: string // uid — klare Zuständigkeit (nie 'both'/null nach der Verteilung)
  changed: boolean // to weicht vom aktuellen assignee ab
}

export interface BalanceResult {
  proposals: BalanceProposal[] // eine je verteilbarer Aufgabe, in Anzeige-Reihenfolge
  before: Record<string, number> // zuletzt erledigte Punkte je uid
  after: Record<string, number> // projizierte Last je uid (before + zugewiesene Punkte)
}

export function balanceChores(opts: {
  chores: readonly Chore[]
  history: readonly ChoreHistoryEntry[]
  memberIds: readonly string[]
  awayUid?: string | null
  windowDays?: number
}): BalanceResult {
  const [a, b] = opts.memberIds
  const before = recentPoints(opts.history, [a, b], opts.windowDays)

  // Nur wiederkehrende, nicht erledigte Aufgaben sind der laufende Fairness-Pool.
  // Schwerste zuerst (stabiler Tie-Break über den Namen) → gierige Verteilung.
  const pool = opts.chores
    .filter((c) => c.type === 'recurring' && !c.done)
    .slice()
    .sort((x, y) => y.points - x.points || x.name.localeCompare(y.name))

  const running: Record<string, number> = { [a]: before[a], [b]: before[b] }
  if (opts.awayUid && opts.awayUid in running) {
    const totalPoints = pool.reduce((s, c) => s + c.points, 0)
    running[opts.awayUid] += Math.round(totalPoints * AWAY_HANDICAP)
  }

  const proposals: BalanceProposal[] = []
  for (const chore of pool) {
    const to = running[a] <= running[b] ? a : b
    running[to] += chore.points
    proposals.push({ chore, from: chore.assignee, to, changed: chore.assignee !== to })
  }

  // Projizierte Last OHNE das Away-Handicap — das ist nur ein Verteil-Bias,
  // keine echte Last.
  const after: Record<string, number> = { [a]: before[a], [b]: before[b] }
  for (const p of proposals) after[p.to] += p.chore.points

  return { proposals, before, after }
}
