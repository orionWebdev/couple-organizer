import type { Chore, ChoreAssignee, Couple } from '@/types'

function toDate(timestamp: unknown): Date | null {
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
    return (timestamp as { toDate: () => Date }).toDate()
  }
  return null
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

export function isDoneToday(chore: Chore): boolean {
  if (chore.type === 'once') return chore.done
  const completed = toDate(chore.completedAt)
  if (!completed) return false
  return isSameDay(completed, new Date())
}

export function recurLabel(chore: Chore): string {
  return chore.type === 'once' ? 'Einmalig' : 'Wiederkehrend'
}

const shortDateFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })

// "zuletzt erledigt"-Label für die Zuweisungen-Tabelle: heute/gestern/vor N
// Tagen für die letzten zwei Wochen, danach Wochen- bzw. Datumsangabe.
export function relativeCompletionLabel(timestamp: unknown): string {
  const date = toDate(timestamp)
  if (!date) return 'Noch nie erledigt'

  const now = new Date()
  if (isSameDay(date, now)) return 'Heute'

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const days = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86400000)

  if (days === 1) return 'Gestern'
  if (days < 14) return `vor ${days} Tagen`
  if (days < 60) return `vor ${Math.round(days / 7)} Wochen`
  return shortDateFormatter.format(date)
}

export function metaLine(chore: Chore, couple: Couple | null, todayCount = 0): string {
  if (isDoneToday(chore)) {
    if (chore.type === 'once') return `Erledigt · ${personName(chore.completedBy, couple)}`
    const times = todayCount > 1 ? `${todayCount}× heute` : 'Heute erledigt'
    return `${times} · zuletzt ${personName(chore.completedBy, couple)}`
  }

  if (chore.assignee === null) return 'Offen · wartet auf Zuweisung'
  return recurLabel(chore)
}

export function personName(assignee: ChoreAssignee, couple: Couple | null): string {
  if (assignee === 'both') return 'Beide'
  if (!assignee) return 'Niemand'
  return couple?.memberNames[assignee] ?? 'Partner'
}

interface PersonVisual {
  init: string
  color: string
  tint: string
}

export function personVisual(uid: string, couple: Couple | null): PersonVisual {
  const idx = couple?.memberIds.indexOf(uid) ?? -1
  const name = couple?.memberNames[uid]
  return {
    init: name ? name.charAt(0).toUpperCase() : '?',
    color: idx === 0 ? 'var(--chris)' : 'var(--sarah)',
    tint: idx === 0 ? 'var(--chris-tint)' : 'var(--sarah-tint)'
  }
}

export interface AssigneeChip {
  ch: string
  bg: string
}

export function assigneeChips(assignee: ChoreAssignee, couple: Couple | null): AssigneeChip[] {
  if (assignee === 'both') {
    const [a, b] = couple?.memberIds ?? []
    return [a, b].filter(Boolean).map((uid) => {
      const v = personVisual(uid as string, couple)
      return { ch: v.init, bg: v.color }
    })
  }
  if (!assignee) return []
  const v = personVisual(assignee, couple)
  return [{ ch: v.init, bg: v.color }]
}

export interface AssigneeAvatarVisual {
  init: string
  bg: string
  border: string
  color: string
}

export function assigneeAvatarVisual(assignee: ChoreAssignee, couple: Couple | null): AssigneeAvatarVisual {
  if (assignee === 'both') {
    return {
      init: 'CS',
      bg: 'linear-gradient(90deg, var(--chris) 50%, var(--sarah) 50%)',
      border: 'none',
      color: 'var(--on-accent)'
    }
  }
  if (!assignee) {
    return { init: '–', bg: 'transparent', border: '1px dashed var(--text-faint)', color: 'var(--accent)' }
  }
  const v = personVisual(assignee, couple)
  return { init: v.init, bg: v.color, border: 'none', color: 'var(--on-accent)' }
}
